/* ============================================================
   PLANORA – UI.JS | Shared UI: Navbar, Theme, Toast
   ============================================================ */
'use strict';

/* ─── Navbar ─── */
function renderNavbar(activePage) {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const user = getCurrentUser() || 'User';
  const initials = getInitials(user);

  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: 'index.html' },
    { id: 'add',       label: 'Add Task',  icon: 'plus-circle', href: 'add.html'   },
    { id: 'profile',   label: 'Profile',   icon: 'user', href: 'profile.html'},
  ];

  nav.innerHTML = `
    <div class="nav-container">
      <a href="index.html" class="nav-logo">
        <div class="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="nav-logo-text">Planora</span>
      </a>

      <ul class="nav-links" id="navLinks">
        ${links.map(l => `
          <li><a href="${l.href}" class="nav-link ${activePage === l.id ? 'active' : ''}">
            <span class="nav-icon"><i data-lucide="${l.icon}" class="icon-inline"></i></span>${l.label}
          </a></li>`).join('')}
      </ul>

      <div class="nav-right">
        <button class="nav-cmd-btn" onclick="if(typeof toggleCommandPalette==='function')toggleCommandPalette()" title="Command Palette (Ctrl+K)" aria-label="Command palette">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <kbd class="nav-kbd">⌘K</kbd>
        </button>
        <button class="nav-icon-btn" id="soundToggleBtn" onclick="if(typeof toggleSound==='function')toggleSound()" title="Toggle Sound" aria-label="Toggle sound">
          <i data-lucide="volume-2" class="icon-inline"></i>
        </button>
        <button class="theme-toggle-btn" id="themeToggle" onclick="toggleThemePage()" aria-label="Toggle theme"></button>

        <div class="nav-avatar-wrap" id="avatarWrap">
          <button class="nav-avatar-btn" onclick="toggleNavDropdown()" aria-label="User menu">
            <span class="nav-avatar-initials">${initials}</span>
          </button>
          <div class="nav-dropdown" id="navDropdown">
            <div class="nav-dropdown-head">
              <div class="nav-avatar-large">${initials}</div>
              <div>
                <div class="nd-name">${escHtml(user)}</div>
                <div class="nd-sub">study@planora.ai</div>
              </div>
            </div>
            <div class="nav-dropdown-divider"></div>
            <a href="profile.html" class="nd-item"><i data-lucide="user" class="icon-inline"></i> Profile &amp; Stats</a>
            <button class="nd-item nd-logout" onclick="logout()"><i data-lucide="log-out" class="icon-inline"></i> Logout</button>
          </div>
        </div>

        <button class="hamburger" id="hamburger" onclick="toggleMobileMenu()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>`;

  applyThemeIcon();
  refreshIcons();
}

function toggleNavDropdown() {
  const dd = document.getElementById('navDropdown');
  const wrap = document.getElementById('avatarWrap');
  if (!dd) return;
  dd.classList.toggle('open');
  const handler = e => {
    if (!wrap.contains(e.target)) {
      dd.classList.remove('open');
      document.removeEventListener('click', handler);
    }
  };
  if (dd.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', handler), 50);
  }
}

function toggleMobileMenu() {
  document.getElementById('navLinks')?.classList.toggle('mobile-open');
  document.getElementById('hamburger')?.classList.toggle('open');
}

/* ─── Theme ─── */
function initTheme() {
  applyTheme(getTheme());
  applyThemeIcon();
}

function toggleThemePage() {
  const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  applyThemeIcon();
}

function applyThemeIcon() {
  const btn = document.getElementById('themeToggle') || document.getElementById('themeBtn');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark 
    ? '<i data-lucide="sun" class="icon-inline"></i>' 
    : '<i data-lucide="moon" class="icon-inline"></i>';
  btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  refreshIcons();
}

/* ─── Toast ─── */
function showToast(message, type = 'info') {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  const icons = { 
    success: '<i data-lucide="check-circle" class="icon-inline"></i>', 
    error: '<i data-lucide="x-circle" class="icon-inline"></i>', 
    info: '<i data-lucide="info" class="icon-inline"></i>', 
    warning: '<i data-lucide="alert-triangle" class="icon-inline"></i>' 
  };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '<i data-lucide="message-square" class="icon-inline"></i>'}</span><span>${message}</span>`;
  c.appendChild(t);
  refreshIcons();
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ─── Utilities ─── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unescHtml(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Great things never come from comfort zones.", author: "Anonymous" },
  { text: "Dream it. Wish it. Do it.", author: "Anonymous" },
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}


/* ═══════════════════════════════════════════════════════════
   LUCIDE ICON REFRESH UTILITY
   ═══════════════════════════════════════════════════════════ */
function refreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// Auto-refresh icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshIcons);
} else {
  refreshIcons();
}
