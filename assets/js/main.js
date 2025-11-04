(function() {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Mobile nav
  const navToggle = $('#nav-toggle');
  const nav = $('#primary-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('show');
    });
  }

  // Namespace
  window.MSN = window.MSN || {};

  // Modal helpers
  window.MSN.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-hidden', 'false');
  };
  window.MSN.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-hidden', 'true');
  };

  // Booking form
  window.MSN.initBooking = function() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Your request has been received. We will contact you within 24 hours.');
      window.MSN.closeModal('booking-modal');
      form.reset();
    });
  };

  // Stories page functionality
  const STORAGE_KEY = 'msn_anonymous_stories_v1';
  
  function loadStories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  
  function saveStories(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // noop
    }
  }
  
  async function renderStories() {
    const mount = document.getElementById('stories-list');
    if (!mount) return;
    
    try {
      // Check if Firestore is available
      if (!window.db) {
        throw new Error('Firestore not initialized');
      }
      
      // Import Firestore functions
      const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      // Query Firestore for posts
      const postsRef = collection(window.db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      
      if (posts.length === 0) {
        mount.innerHTML = '<p class="muted">No stories yet. Be the first to share.</p>';
        return;
      }
      
      mount.innerHTML = posts.map((p) => {
        const date = new Date(p.createdAt).toLocaleString();
        return `<div class="story"><p>${escapeHtml(p.story)}</p><div class="meta">Feeling: ${escapeHtml(p.feeling || 'Unknown')} • ${date}</div></div>`;
      }).join('');
    } catch (e) {
      console.error('Error loading stories from Firestore:', e);
      // Fallback to local storage if Firestore not available
      const stories = loadStories();
      if (stories.length === 0) {
        mount.innerHTML = '<p class="muted">No stories yet (offline). Be the first to share.</p>';
        return;
      }
      mount.innerHTML = stories.map((s) => {
        const date = new Date(s.date).toLocaleString();
        return `<div class="story"><p>${escapeHtml(s.text)}</p><div class="meta">Feeling: ${escapeHtml(s.feelings)} • ${date}</div></div>`;
      }).join('');
    }
  }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Home page: render latest stories (top 5)
  async function renderLatestStoriesHome() {
    const mount = document.getElementById('latest-stories-home');
    if (!mount) return;
    
    try {
      // Check if Firestore is available
      if (!window.db) {
        throw new Error('Firestore not initialized');
      }
      
      // Import Firestore functions
      const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      // Query Firestore for posts
      const postsRef = collection(window.db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      
      if (posts.length === 0) {
        mount.innerHTML = '<p class="muted">No stories yet.</p>';
        return;
      }
      
      mount.innerHTML = posts.map((p) => {
        const snippet = String(p.story || '').slice(0, 160);
        const date = new Date(p.createdAt).toLocaleDateString();
        return `<div class="story-item"><p>${escapeHtml(snippet)}${p.story && p.story.length > 160 ? '…' : ''}</p><div class="meta">Feeling: ${escapeHtml(p.feeling || 'Unknown')} • ${date}</div></div>`;
      }).join('');
    } catch (e) {
      console.error('Error loading stories from Firestore:', e);
      // Fallback to local storage if Firestore not available
      const stories = loadStories().slice(0, 5);
      if (stories.length === 0) {
        mount.innerHTML = '<p class="muted">No stories yet (offline).</p>';
        return;
      }
      mount.innerHTML = stories.map((s) => {
        const snippet = String(s.text || '').slice(0, 160);
        const date = new Date(s.date).toLocaleDateString();
        return `<div class="story-item"><p>${escapeHtml(snippet)}${s.text && s.text.length > 160 ? '…' : ''}</p><div class="meta">Feeling: ${escapeHtml(s.feelings || 'Unknown')} • ${date}</div></div>`;
      }).join('');
    }
  }
  window.MSN.initStories = function() {
    const form = document.getElementById('story-form');
    const textarea = document.getElementById('story-text');
    const feelings = document.getElementById('story-feelings');
    if (!form || !textarea || !feelings) return;
    renderStories();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      const feeling = feelings.value || 'Unknown';
      if (!text) return;
      
      // Client-side validation to match Firestore rules
      if (text.length === 0) {
        alert('Please enter your story.');
        return;
      }
      if (text.length > 4000) {
        alert('Story is too long. Maximum 4000 characters.');
        return;
      }
      if (feeling.length > 100) {
        alert('Feeling field is too long.');
        return;
      }
      
      // Collect anonymous client metadata
      let clientTz = (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      let clientLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
      let screenStr = (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}` : '';
      let platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
      
      // Validate metadata sizes to match Firestore rules
      if (clientTz.length > 100) {
        clientTz = clientTz.substring(0, 100);
      }
      if (clientLang.length > 20) {
        clientLang = clientLang.substring(0, 20);
      }
      if (screenStr.length > 100) {
        screenStr = screenStr.substring(0, 100);
      }
      if (platform.length > 200) {
        platform = platform.substring(0, 200);
      }
      
      try {
        // Check if Firestore is available
        if (!window.db) {
          throw new Error('Firestore not initialized');
        }
        
        // Import Firestore functions
        const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Add post to Firestore
        const postsRef = collection(window.db, 'posts');
        await addDoc(postsRef, {
          story: text,
          feeling: feeling,
          clientTz: clientTz,
          clientLang: clientLang,
          screen: screenStr,
          platform: platform,
          createdAt: Timestamp.now()
        });
        
        // Clear form and re-render
        textarea.value = '';
        await renderStories();
      } catch (err) {
        console.error('Error submitting to Firestore:', err);
        // Offline/local fallback
        const stories = loadStories();
        stories.unshift({ text, feelings: feeling, date: new Date().toISOString() });
        saveStories(stories);
        textarea.value = '';
        await renderStories();
      }
    });
  };

  // Auto-render latest stories on home if mount exists
  if (document.getElementById('latest-stories-home')) {
    // Wait for Firebase to initialize before rendering
    async function waitForFirebaseAndRender() {
      let attempts = 0;
      while (!window.firebaseReady && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (window.firebaseReady && window.db) {
        renderLatestStoriesHome();
      } else {
        console.warn('Firebase not initialized, skipping latest stories');
      }
    }
    
    waitForFirebaseAndRender();
  }
})();


