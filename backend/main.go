package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"crypto/sha256"
	"encoding/hex"
	"net"

	_ "modernc.org/sqlite"
)

type Post struct {
	ID        int64     `json:"id"`
	Story     string    `json:"story"`
	Feeling   string    `json:"feeling"`
	CreatedAt time.Time `json:"createdAt"`
	// Anonymous metadata (may be empty if unavailable)
	RawIP      string `json:"-"`
	IPHash     string `json:"-"`
	UserAgent  string `json:"-"`
	AcceptLang string `json:"-"`
	Referer    string `json:"-"`
	ClientTZ   string `json:"-"`
	ClientLang string `json:"-"`
	Screen     string `json:"-"`
	Platform   string `json:"-"`
}

type Server struct {
	db *sql.DB
}

func main() {
	dbPath := filepath.Join("data", "app.db")
	if err := ensureDir(filepath.Dir(dbPath)); err != nil {
		log.Fatalf("failed to ensure data dir: %v", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := migrate(db); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	srv := &Server{db: db}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", srv.handleHealth)
	mux.HandleFunc("/api/posts", srv.withCORS(srv.handlePosts))

	addr := ":8090"
	if v := os.Getenv("PORT"); strings.TrimSpace(v) != "" {
		addr = ":" + v
	}
	log.Printf("API listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func ensureDir(dir string) error {
	if dir == "" || dir == "." {
		return nil
	}
	return os.MkdirAll(dir, 0o755)
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            story TEXT NOT NULL,
            feeling TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    `)
	if err != nil {
		return err
	}
	// Best-effort add columns; ignore errors if columns already exist
	addCols := []string{
		"ALTER TABLE posts ADD COLUMN raw_ip TEXT",
		"ALTER TABLE posts ADD COLUMN ip_hash TEXT",
		"ALTER TABLE posts ADD COLUMN ua TEXT",
		"ALTER TABLE posts ADD COLUMN accept_lang TEXT",
		"ALTER TABLE posts ADD COLUMN referer TEXT",
		"ALTER TABLE posts ADD COLUMN client_tz TEXT",
		"ALTER TABLE posts ADD COLUMN client_lang TEXT",
		"ALTER TABLE posts ADD COLUMN screen TEXT",
		"ALTER TABLE posts ADD COLUMN platform TEXT",
	}
	for _, q := range addCols {
		if _, e := db.Exec(q); e != nil {
			// ignore duplicate column errors
			continue
		}
	}
	return nil
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handlePosts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.createPost(w, r)
	case http.MethodGet:
		s.listPosts(w, r)
	case http.MethodOptions:
		// CORS preflight handled by withCORS wrapper
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) createPost(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Story      string `json:"story"`
		Feeling    string `json:"feeling"`
		ClientTZ   string `json:"clientTz"`
		ClientLang string `json:"clientLang"`
		Screen     string `json:"screen"`
		Platform   string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	in.Story = strings.TrimSpace(in.Story)
	in.Feeling = strings.TrimSpace(in.Feeling)

	if err := validatePost(in.Story, in.Feeling); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Server-side anonymous metadata
	ip := clientIP(r)
	ipHash := hashIP(ip, os.Getenv("IP_HASH_PEPPER"))
	ua := strings.TrimSpace(r.Header.Get("User-Agent"))
	acceptLang := strings.TrimSpace(r.Header.Get("Accept-Language"))
	referer := strings.TrimSpace(r.Header.Get("Referer"))

	res, err := s.db.Exec(
		`INSERT INTO posts (story, feeling, raw_ip, ip_hash, ua, accept_lang, referer, client_tz, client_lang, screen, platform) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		in.Story, in.Feeling, strings.TrimSpace(ip), ipHash, ua, acceptLang, referer, strings.TrimSpace(in.ClientTZ), strings.TrimSpace(in.ClientLang), strings.TrimSpace(in.Screen), strings.TrimSpace(in.Platform),
	)
	if err != nil {
		log.Printf("insert error: %v", err)
		http.Error(w, "failed to save post", http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()

	var createdAt time.Time
	if err := s.db.QueryRow(`SELECT created_at FROM posts WHERE id = ?`, id).Scan(&createdAt); err != nil {
		// Fallback to now if retrieval fails
		createdAt = time.Now().UTC()
	}

	out := Post{
		ID:        id,
		Story:     in.Story,
		Feeling:   in.Feeling,
		CreatedAt: createdAt,
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) listPosts(w http.ResponseWriter, r *http.Request) {
	// Optional limit parameter
	limit := 50
	if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	rows, err := s.db.Query(
		`SELECT id, story, feeling, created_at 
         FROM posts 
         ORDER BY datetime(created_at) DESC 
         LIMIT ?`, limit,
	)
	if err != nil {
		log.Printf("query error: %v", err)
		http.Error(w, "failed to query posts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.Story, &p.Feeling, &p.CreatedAt); err != nil {
			log.Printf("scan error: %v", err)
			http.Error(w, "failed to read posts", http.StatusInternalServerError)
			return
		}
		posts = append(posts, p)
	}

	writeJSON(w, http.StatusOK, posts)
}

func validatePost(story, feeling string) error {
	if story == "" {
		return errors.New("story is required")
	}
	if len(story) > 4000 {
		return errors.New("story is too long (max 4000 chars)")
	}
	if feeling == "" {
		return errors.New("feeling is required")
	}
	if len(feeling) > 100 {
		return errors.New("feeling is too long (max 100 chars)")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(v)
}

func (s *Server) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Accept,Accept-Language")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func optionsMethod() string { return http.MethodOptions }

// clientIP extracts the best-effort client IP, considering X-Forwarded-For.
func clientIP(r *http.Request) string {
	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff != "" {
		// take first IP
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}

// hashIP hashes the IP with a secret pepper and returns a short hex prefix.
func hashIP(ip, pepper string) string {
	if strings.TrimSpace(ip) == "" {
		return ""
	}
	if strings.TrimSpace(pepper) == "" {
		pepper = "dev-pepper"
	}
	h := sha256.Sum256([]byte(ip + "|" + pepper))
	// return first 12 hex chars (~48 bits) to reduce reidentification risk
	return hex.EncodeToString(h[:])[:12]
}
