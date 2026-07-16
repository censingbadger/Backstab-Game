/* ============================================================
   BACK STAB — Player Profiles (local login)
   A lightweight per-browser account system so each player keeps
   their own character across sessions.

   IMPORTANT: this is a LOCAL lock for sharing one device — the
   accounts and saves live only in this browser's storage and it is
   NOT server-backed security. Passwords and secret answers are
   stored only as salted hashes (never in plain text).
   ============================================================ */
const Auth = (function () {
  const ACCOUNTS_KEY = 'backstab_accounts_v1';
  const CURRENT_KEY = 'backstab_current_user';
  const LEGACY_SAVE = 'backstab_save_v1';           // pre-accounts / guest save

  const SECRET_QUESTIONS = [
    'What is your favorite animal?',
    'What is your favorite color?',
    'What is your favorite food?',
    "What is your pet's name?",
    'Who is your best friend?',
    'What is your favorite game?',
  ];

  function read(key, fb) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function accounts() { return read(ACCOUNTS_KEY, {}); }
  function saveAccounts(a) { write(ACCOUNTS_KEY, a); }
  function norm(name) { return (name || '').trim().toLowerCase(); }
  function normAns(a) { return (a || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  function currentUser() { try { return localStorage.getItem(CURRENT_KEY) || null; } catch (e) { return null; } }
  function setCurrent(u) { try { u ? localStorage.setItem(CURRENT_KEY, u) : localStorage.removeItem(CURRENT_KEY); } catch (e) {} }

  // per-user save key (falls back to the legacy key when nobody is logged in)
  function saveKey() { const u = currentUser(); return u ? LEGACY_SAVE + '__' + u : LEGACY_SAVE; }

  function randSalt() {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint8Array(8); crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(''); }
    return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6);
  }
  // SHA-256 where available (https), with a simple non-crypto fallback for
  // insecure contexts (e.g. file://). Consistent within a given environment.
  async function hash(str) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall through */ }
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv' + ('0000000' + h.toString(16)).slice(-8);
  }

  function exists(name) { return !!accounts()[norm(name)]; }
  function list() { return Object.values(accounts()).map(a => a.name); }
  function currentName() { const a = accounts()[currentUser()]; return a ? a.name : null; }
  function secretQuestion(name) { const a = accounts()[norm(name)]; return a ? a.secretQ : null; }

  async function register(name, password, secretQ, answer) {
    name = (name || '').trim();
    const key = norm(name);
    if (!key) return { ok: false, error: 'Please enter a player name.' };
    if (key.length < 2) return { ok: false, error: 'Name is too short (2+ letters).' };
    if (name.length > 16) return { ok: false, error: 'Name is too long (16 max).' };
    if (exists(key)) return { ok: false, error: 'That name is already taken.' };
    if ((password || '').length < 3) return { ok: false, error: 'Password must be at least 3 characters.' };
    if (!secretQ) return { ok: false, error: 'Please pick a secret question.' };
    if (!normAns(answer)) return { ok: false, error: 'Please answer the secret question.' };
    const salt = randSalt();
    const wasFirst = Object.keys(accounts()).length === 0;
    const acct = { name, salt, passHash: await hash(salt + '::' + password), secretQ, ansHash: await hash(salt + '::' + normAns(answer)) };
    const all = accounts(); all[key] = acct; saveAccounts(all);
    // carry any existing guest character into the very first account created
    if (wasFirst) { try { const g = localStorage.getItem(LEGACY_SAVE); if (g) localStorage.setItem(LEGACY_SAVE + '__' + key, g); } catch (e) {} }
    setCurrent(key);
    return { ok: true };
  }

  async function login(name, password) {
    const a = accounts()[norm(name)];
    if (!a) return { ok: false, error: 'No player with that name.' };
    if (await hash(a.salt + '::' + password) !== a.passHash) return { ok: false, error: 'Wrong password.' };
    setCurrent(norm(name));
    return { ok: true };
  }

  async function resetPassword(name, answer, newPassword) {
    const key = norm(name), a = accounts()[key];
    if (!a) return { ok: false, error: 'No player with that name.' };
    if (await hash(a.salt + '::' + normAns(answer)) !== a.ansHash) return { ok: false, error: 'That answer is not correct.' };
    if ((newPassword || '').length < 3) return { ok: false, error: 'Password must be at least 3 characters.' };
    a.passHash = await hash(a.salt + '::' + newPassword);
    const all = accounts(); all[key] = a; saveAccounts(all);
    setCurrent(key);
    return { ok: true };
  }

  function logout() { setCurrent(null); }

  return { SECRET_QUESTIONS, accounts, list, exists, currentUser, currentName, secretQuestion, saveKey, register, login, resetPassword, logout };
})();
