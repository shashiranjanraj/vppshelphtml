# Vivahit Pidit Sangh (VPS) Website

A modern, responsive static website for VPS supporting men experiencing domestic and marital abuse.

Pages:
- Home (`index.html`)
- Stories (`stories.html`) – anonymous submission stored locally in the browser
- Contact (`contact.html`) – hotline, email, and session request modal
- About (`about.html`) – mission and approach
- Team (`team.html`) – 5-6 member profiles

## Run locally

Open any file directly in a browser, or serve the folder:

```bash
# macOS
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Customize
- Hotline: search for `+1 (800) 123-4567` and update.
- Email: search for `help@menssupport.org` and update.
- Team profiles: edit `team.html` with your members.
- Colors/fonts: edit `assets/css/styles.css` and Google Fonts link in `<head>`.

Images are referenced from Unsplash and load at runtime.

## Notes
- Anonymous stories are stored in `localStorage` on the same device/browser.
- A lightweight backend API is included under `backend/` for persisting stories.

## Backend API (Go + SQLite)

A small Go API is included under `backend/` to store posts (story + feeling) in SQLite and list them ordered by creation time.

### Endpoints

- `POST /api/posts`
  - Body: JSON `{ "story": string, "feeling": string }`
  - Response: Created post with fields `id`, `story`, `feeling`, `createdAt`

- `GET /api/posts?limit=50`
  - Query: optional `limit` (1..500)
  - Response: JSON array of posts ordered by `createdAt` desc

### Run locally

Requirements: Go 1.22+

```bash
cd backend
go mod tidy
PORT=8090 go run .
```

The API starts on `http://localhost:8090`.

### Curl examples

Create a post:

```bash
curl -X POST http://localhost:8090/api/posts \
  -H 'Content-Type: application/json' \
  -d '{"story":"Today I built an API","feeling":"productive"}'
```

List posts (newest first):

```bash
curl http://localhost:8090/api/posts?limit=20
```

### Implementation notes

- Database file is created at `backend/data/app.db`.
- Pure Go SQLite driver `modernc.org/sqlite` is used (no CGO required).
- CORS enabled for simple GET/POST requests.

### Privacy and anonymous metadata

- We do NOT store names, emails, phone numbers, or raw IPs.
- The server stores a short, peppered hash of the IP (`IP_HASH_PEPPER` env var), `User-Agent`, `Accept-Language`, referrer, and optional client-provided timezone, language, screen, and platform to understand usage patterns while preserving anonymity.
- Set a strong `IP_HASH_PEPPER` in production: `export IP_HASH_PEPPER="<random-long-secret>"`.

