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
  const DEFAULT_API_ORIGIN = 'http://localhost:8090';
  const API_ORIGIN = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? DEFAULT_API_ORIGIN
    : '';
  const API_ENDPOINT = `${API_ORIGIN}/api/posts`;
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
      const res = await fetch(`${API_ENDPOINT}?limit=50`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('bad status');
      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        mount.innerHTML = '<p class="muted">No stories yet. Be the first to share.</p>';
        return;
      }
      mount.innerHTML = posts.map((p) => {
        const date = new Date(p.createdAt).toLocaleString();
        return `<div class="story"><p>${escapeHtml(p.story)}</p><div class="meta">Feeling: ${escapeHtml(p.feeling || 'Unknown')} • ${date}</div></div>`;
      }).join('');
    } catch (e) {
      // Fallback to local storage if API not reachable
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
      // Collect anonymous client metadata
      const clientTz = (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      const clientLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
      const screenStr = (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}` : '';
      const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story: text, feeling, clientTz, clientLang, screen: screenStr, platform })
        });
        if (!res.ok) throw new Error('Failed to submit');
        // Clear and re-render from server
        textarea.value = '';
        await renderStories();
      } catch (err) {
        // Offline/local fallback
        const stories = loadStories();
        stories.unshift({ text, feelings: feeling, date: new Date().toISOString() });
        saveStories(stories);
        textarea.value = '';
        await renderStories();
      }
    });
  };
})();


