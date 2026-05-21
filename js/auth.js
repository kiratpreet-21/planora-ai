/* ============================================================
   PLANORA – AUTH.JS | Authentication Utilities
   ============================================================ */
'use strict';

const ACCOUNTS_KEY = 'planora_accounts';
const SESSION_KEY  = 'planora_session';

/* ─── Hash (djb2, non-cryptographic, safe for local demo) ─── */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/* ─── Accounts Management ─── */
function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; }
  catch { return {}; }
}

function registerUser(name, password) {
  const accounts = getAccounts();
  const cleanName = name.trim();
  accounts[cleanName.toLowerCase()] = {
    name: cleanName,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/* ─── Session Management ─── */
function getAuth() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function setAuth(name) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    name: name.trim(),
    loginTime: new Date().toISOString(),
  }));
}

function clearAuth() {
  localStorage.removeItem(SESSION_KEY);
}

/* ─── Guards ─── */
function isLoggedIn() { return !!getAuth(); }

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requireGuest() {
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ─── Current user ─── */
function getCurrentUser() {
  const auth = getAuth();
  return auth ? auth.name : null;
}

function verifyCredentials(name, password) {
  const accounts = getAccounts();
  const user = accounts[name.trim().toLowerCase()];
  if (!user) return false;
  return user.passwordHash === simpleHash(password);
}

/* ─── Logout ─── */
function logout() {
  clearAuth();
  window.location.href = 'login.html';
}

/* ─── Migration ─── */
function runAuthMigration() {
  const oldAuth = localStorage.getItem('planora_auth');
  if (oldAuth) {
    try {
      const data = JSON.parse(oldAuth);
      if (data && data.name && data.passwordHash) {
        const accounts = getAccounts();
        const key = data.name.trim().toLowerCase();
        if (!accounts[key]) {
          accounts[key] = data;
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        }
        // If they were "logged in" in the old system, set the new session
        setAuth(data.name);
      }
      // Cleanup old key
      localStorage.removeItem('planora_auth');
    } catch(e) {}
  }
}

// Run migration immediately
runAuthMigration();
