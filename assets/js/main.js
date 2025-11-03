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
  function renderStories() {
    const mount = document.getElementById('stories-list');
    if (!mount) return;
    const stories = loadStories();
    if (stories.length === 0) {
      mount.innerHTML = '<p class="muted">No stories yet. Be the first to share.</p>';
      return;
    }
    mount.innerHTML = stories.map((s) => {
      const date = new Date(s.date).toLocaleString();
      return `<div class="story"><p>${escapeHtml(s.text)}</p><div class="meta">Feeling: ${escapeHtml(s.feelings)} • ${date}</div></div>`;
    }).join('');
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
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      const feeling = feelings.value || 'Unknown';
      if (!text) return;
      const stories = loadStories();
      stories.unshift({ text, feelings: feeling, date: new Date().toISOString() });
      saveStories(stories);
      textarea.value = '';
      renderStories();
    });
  };
})();


