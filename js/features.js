/* ============================================================
   PLANORA – FEATURES.JS
   Achievements · Daily Quests · Command Palette · Sound ·
   Focus Mode · Burnout Detection · Exam Predictor · Quick Actions
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   SOUND ENGINE
   ═══════════════════════════════════════════════════════════ */
let _audioCtx = null;
let _soundEnabled = true;

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playSound(type) {
  if (!_soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const sounds = {
      complete:    [[523.25, 0], [659.25, 0.1], [783.99, 0.2]],
      xp:          [[880, 0], [1046.5, 0.08]],
      achievement: [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.35]],
      error:       [[220, 0], [196, 0.15]],
      click:       [[600, 0]],
      timer_done:  [[523.25, 0], [392, 0.15], [523.25, 0.3], [659.25, 0.45]],
      wheel_tick:  [[800, 0]],
      level_up:    [[523.25,0],[659.25,.08],[783.99,.16],[1046.5,.24],[1318.5,.36]]
    };
    const notes = sounds[type] || sounds.click;
    notes.forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type === 'error' ? 'sawtooth' : 'sine';
      gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch(e) {}
}

function toggleSound() {
  _soundEnabled = !_soundEnabled;
  const btn = document.getElementById('soundToggleBtn');
  if (btn) {
    const icon = btn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', _soundEnabled ? 'volume-2' : 'volume-x');
      refreshIcons();
    }
  }
  showToast(_soundEnabled ? 'Sound enabled' : 'Sound muted', 'info');
  localStorage.setItem('planora_sound', _soundEnabled ? '1' : '0');
}

function initSound() {
  _soundEnabled = localStorage.getItem('planora_sound') !== '0';
  const btn = document.getElementById('soundToggleBtn');
  if (btn) {
    const icon = btn.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', _soundEnabled ? 'volume-2' : 'volume-x');
      if (typeof refreshIcons === 'function') refreshIcons();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENTS SYSTEM
   ═══════════════════════════════════════════════════════════ */
const ACHIEVEMENTS = [
  { id: 'first_subject',  icon: 'book-open', title: 'First Step',       desc: 'Added your first subject',          check: (s,u) => s.total >= 1 },
  { id: 'first_complete', icon: 'check-circle', title: 'Getting Started',  desc: 'Completed your first task',         check: (s,u) => s.completed >= 1 },
  { id: 'streak_3',       icon: 'flame', title: '3-Day Streak',     desc: 'Studied 3 days in a row',           check: (s,u) => u.streak >= 3 },
  { id: 'streak_7',       icon: 'trophy', title: 'Week Warrior',     desc: 'Studied 7 days in a row',           check: (s,u) => u.streak >= 7 },
  { id: 'streak_30',      icon: 'gem', title: '30-Day Legend',    desc: 'Studied 30 days in a row',          check: (s,u) => u.streak >= 30 },
  { id: 'hours_10',       icon: 'clock', title: '10 Hours Studied', desc: 'Logged 10 total study hours',       check: (s,u) => s.totalMinutes >= 600 },
  { id: 'hours_50',       icon: 'graduation-cap', title: 'Study Marathon',   desc: 'Logged 50 total study hours',       check: (s,u) => s.totalMinutes >= 3000 },
  { id: 'level_5',        icon: 'star', title: 'Rising Scholar',   desc: 'Reached Level 5',                   check: (s,u) => (u.level||1) >= 5 },
  { id: 'level_10',       icon: 'sparkles', title: 'Master Scholar',   desc: 'Reached Level 10',                  check: (s,u) => (u.level||1) >= 10 },
  { id: 'tasks_10',       icon: 'target', title: 'Goal Crusher',     desc: 'Completed 10 tasks',                check: (s,u) => s.completed >= 10 },
  { id: 'tasks_50',       icon: 'rocket', title: 'Unstoppable',      desc: 'Completed 50 tasks',                check: (s,u) => s.completed >= 50 },
  { id: 'subjects_5',     icon: 'library', title: 'Multitasker',      desc: 'Added 5 subjects at once',          check: (s,u) => s.total >= 5 },
  { id: 'night_owl',      icon: 'moon', title: 'Night Owl',        desc: 'Studied after 10 PM',               check: (s,u) => u.nightOwl === true },
  { id: 'early_bird',     icon: 'sunrise', title: 'Early Bird',       desc: 'Studied before 7 AM',               check: (s,u) => u.earlyBird === true },
];

function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem('planora_achievements') || '[]');
}

function saveUnlockedAchievements(ids) {
  localStorage.setItem('planora_achievements', JSON.stringify(ids));
}

function checkAchievements() {
  const stats    = getStats();
  const user     = getUser();
  const unlocked = getUnlockedAchievements();
  const newOnes  = [];

  // Track time-of-day study
  const h = new Date().getHours();
  if (h >= 22 || h < 1) { user.nightOwl = true; saveUser(user); }
  if (h >= 5 && h < 7)  { user.earlyBird = true; saveUser(user); }

  ACHIEVEMENTS.forEach(a => {
    if (!unlocked.includes(a.id) && a.check(stats, user)) {
      unlocked.push(a.id);
      newOnes.push(a);
    }
  });

  if (newOnes.length > 0) {
    saveUnlockedAchievements(unlocked);
    newOnes.forEach((a, i) => {
      setTimeout(() => showAchievementUnlock(a), i * 1200);
    });
  }
  return unlocked;
}

function showAchievementUnlock(achievement) {
  playSound('achievement');
  const el = document.createElement('div');
  el.className = 'achievement-popup bounce-in';
  el.innerHTML = `
    <div class="ach-pop-icon"><i data-lucide="${achievement.icon}" style="width:2.5rem;height:2.5rem;stroke-width:2"></i></div>
    <div class="ach-pop-body">
      <div class="ach-pop-label">Achievement Unlocked!</div>
      <div class="ach-pop-title">${escHtml(achievement.title)}</div>
      <div class="ach-pop-desc">${escHtml(achievement.desc)}</div>
    </div>`;
  document.body.appendChild(el);
  if (typeof refreshIcons === 'function') refreshIcons();
  setTimeout(() => { el.classList.add('ach-pop-out'); setTimeout(() => el.remove(), 500); }, 3500);
}

function renderAchievementsPanel() {
  const container = document.getElementById('achievementsPanel');
  if (!container) return;

  const unlocked = getUnlockedAchievements();
  const total    = ACHIEVEMENTS.length;
  const count    = unlocked.length;

  container.innerHTML = `
    <div class="ach-header">
      <span class="ach-count">${count}/${total} Unlocked</span>
      <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${Math.round(count/total*100)}%"></div></div>
    </div>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => {
        const done = unlocked.includes(a.id);
        return `<div class="ach-badge ${done ? 'unlocked' : 'locked'}" title="${escHtml(a.desc)}">
          <div class="ach-badge-icon">${done ? `<i data-lucide="${a.icon}" class="icon-inline-xl"></i>` : '<i data-lucide="lock" class="icon-inline-xl"></i>'}</div>
          <div class="ach-badge-name">${escHtml(a.title)}</div>
        </div>`;
      }).join('')}
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════════════════
   DAILY QUESTS
   ═══════════════════════════════════════════════════════════ */
const QUEST_TEMPLATES = [
  { id: 'q_session',   icon: 'clock', title: 'Focus Block',      desc: 'Complete 1 study session',    xp: 100, check: () => getDailySessionCount() >= 1 },
  { id: 'q_sessions3', icon: 'flame', title: 'Triple Session',   desc: 'Complete 3 study sessions',   xp: 250, check: () => getDailySessionCount() >= 3 },
  { id: 'q_task',      icon: 'check-circle', title: 'Task Done',        desc: 'Mark 1 task as complete',     xp: 150, check: () => getDailyCompletedTasks() >= 1 },
  { id: 'q_tasks2',    icon: 'target', title: 'Double Down',      desc: 'Complete 2 tasks today',      xp: 300, check: () => getDailyCompletedTasks() >= 2 },
  { id: 'q_hour',      icon: 'book-open', title: 'Study Hour',       desc: 'Study for 60 minutes today',  xp: 200, check: () => getDailyStudyMinutes() >= 60 },
  { id: 'q_2hours',    icon: 'trophy', title: 'Deep Work',        desc: 'Study for 2 hours today',     xp: 400, check: () => getDailyStudyMinutes() >= 120 },
  { id: 'q_subjects2', icon: 'library', title: 'Variety',          desc: 'Study 2 different subjects',  xp: 200, check: () => getDailySubjectCount() >= 2 },
];

function getDailySessionCount() {
  return parseInt(localStorage.getItem('planora_daily_sessions') || '0');
}
function incrementDailySession() {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem('planora_daily_session_data') || '{"date":"","count":0}');
  if (stored.date !== today) { stored.date = today; stored.count = 0; }
  stored.count++;
  localStorage.setItem('planora_daily_session_data', JSON.stringify(stored));
  localStorage.setItem('planora_daily_sessions', stored.count);
}

function getDailyCompletedTasks() {
  const today = new Date().toISOString().split('T')[0];
  return getTasks().filter(t => t.completed && t.completedAt && t.completedAt.startsWith(today)).length;
}

function getDailyStudyMinutes() {
  const today = new Date().toISOString().split('T')[0];
  const progress = getAllProgress();
  const record = progress.find(p => p.date === today);
  if (!record) return 0;
  return Object.values(record.blocks || {}).reduce((s, m) => s + m, 0);
}

function getDailySubjectCount() {
  const today = new Date().toISOString().split('T')[0];
  const progress = getAllProgress();
  const record = progress.find(p => p.date === today);
  if (!record) return 0;
  return Object.keys(record.blocks || {}).length;
}

function getTodayQuests() {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem('planora_quests') || '{"date":"","ids":[]}');
  if (stored.date !== today) {
    // Pick 3 random quests for today
    const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
    const ids = shuffled.slice(0, 3).map(q => q.id);
    localStorage.setItem('planora_quests', JSON.stringify({ date: today, ids }));
    return ids.map(id => QUEST_TEMPLATES.find(q => q.id === id));
  }
  return stored.ids.map(id => QUEST_TEMPLATES.find(q => q.id === id)).filter(Boolean);
}

function getCompletedQuests() {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem('planora_quests_done') || '{"date":"","ids":[]}');
  if (stored.date !== today) return [];
  return stored.ids;
}

function markQuestDone(questId) {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem('planora_quests_done') || '{"date":"","ids":[]}');
  if (stored.date !== today) { stored.date = today; stored.ids = []; }
  if (!stored.ids.includes(questId)) {
    stored.ids.push(questId);
    localStorage.setItem('planora_quests_done', JSON.stringify(stored));
    const quest = QUEST_TEMPLATES.find(q => q.id === questId);
    if (quest) {
      awardXP(quest.xp);
      playSound('xp');
      showToast(`🎯 Quest complete: ${quest.title} +${quest.xp} XP!`, 'success');
    }
  }
}

function checkAndUpdateQuests() {
  const quests = getTodayQuests();
  const done   = getCompletedQuests();
  quests.forEach(q => {
    if (!done.includes(q.id) && q.check()) markQuestDone(q.id);
  });
  renderQuestsWidget();
}

function renderQuestsWidget() {
  const container = document.getElementById('dailyQuestsWidget');
  if (!container) return;

  const quests = getTodayQuests();
  const done   = getCompletedQuests();
  const count  = done.filter(id => quests.find(q => q.id === id)).length;

  container.innerHTML = `
    <div class="quests-header">
      <span class="quests-title"><i data-lucide="swords" class="icon-inline"></i> Daily Quests</span>
      <span class="quests-count">${count}/${quests.length}</span>
    </div>
    <div class="quests-list">
      ${quests.map(q => {
        const isDone = done.includes(q.id);
        const progress = q.check();
        return `<div class="quest-item ${isDone ? 'quest-done' : ''}">
          <span class="quest-icon"><i data-lucide="${q.icon}" class="icon-inline-lg"></i></span>
          <div class="quest-body">
            <div class="quest-name">${escHtml(q.title)}</div>
            <div class="quest-desc">${escHtml(q.desc)}</div>
          </div>
          <div class="quest-reward">
            ${isDone ? '<span class="quest-check"><i data-lucide="check" class="icon-inline"></i></span>' : `<span class="quest-xp">+${q.xp} XP</span>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════════════════
   COMMAND PALETTE  (Cmd/Ctrl + K)
   ═══════════════════════════════════════════════════════════ */
let _paletteOpen = false;

function initCommandPalette() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
    if (e.key === 'Escape' && _paletteOpen) closeCommandPalette();
  });
}

function toggleCommandPalette() {
  _paletteOpen ? closeCommandPalette() : openCommandPalette();
}

function openCommandPalette() {
  _paletteOpen = true;
  let overlay = document.getElementById('cmdPalette');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cmdPalette';
    overlay.className = 'cmd-overlay';
    overlay.innerHTML = `
      <div class="cmd-box scale-in">
        <div class="cmd-search-wrap">
          <svg class="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input id="cmdInput" class="cmd-input" placeholder="Search subjects, actions…" autocomplete="off" />
          <kbd class="cmd-esc">ESC</kbd>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeCommandPalette(); });
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('cmd-visible'));

  const input = document.getElementById('cmdInput');
  if (input) {
    input.value = '';
    input.focus();
    input.addEventListener('input', () => renderCmdResults(input.value));
    input.addEventListener('keydown', handleCmdKeyNav);
  }
  renderCmdResults('');
}

function closeCommandPalette() {
  _paletteOpen = false;
  const overlay = document.getElementById('cmdPalette');
  if (overlay) {
    overlay.classList.remove('cmd-visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  }
}

function getCmdItems(query) {
  const q = query.toLowerCase().trim();
  const tasks = getTasks().filter(t => !t.completed);

  const actions = [
    { icon: 'plus-circle', label: 'Add Subject',        sub: 'Navigate to add page',       action: () => window.location.href = 'add.html' },
    { icon: 'layout-dashboard', label: 'Dashboard',           sub: 'Go to dashboard',            action: () => window.location.href = 'index.html' },
    { icon: 'user', label: 'Profile & Stats',     sub: 'View your progress',         action: () => window.location.href = 'profile.html' },
    { icon: 'bot', label: 'AI Study Planner',    sub: 'Generate a study plan',      action: () => { closeCommandPalette(); if(typeof openAIPlanner==='function') openAIPlanner(); } },
    { icon: 'clock', label: 'Start Focus Timer',   sub: 'Begin a Pomodoro session',   action: () => { closeCommandPalette(); document.querySelector('.tw-btn-primary')?.click(); } },
    { icon: 'disc', label: 'Spin the Wheel',      sub: 'Random subject picker',      action: () => { closeCommandPalette(); document.getElementById('spinBtn')?.click(); } },
    { icon: 'moon', label: 'Toggle Theme',        sub: 'Switch dark/light mode',     action: () => { closeCommandPalette(); if(typeof toggleThemePage==='function') toggleThemePage(); } },
    { icon: 'volume-2', label: 'Toggle Sound',        sub: 'Mute or unmute sounds',      action: () => { closeCommandPalette(); toggleSound(); } },
    { icon: 'message-circle', label: 'Open AI Chat',        sub: 'Chat with Planora AI',       action: () => { closeCommandPalette(); const w=document.getElementById('aiChatWidget'); if(w) { w.classList.remove('minimized'); w.style.display='flex'; } } },
    { icon: 'sparkles', label: 'Load Demo Data',      sub: 'Try with sample subjects',   action: () => { closeCommandPalette(); if(typeof loadDemoData==='function') loadDemoData(); } },
  ];

  const subjectItems = tasks.map(t => ({
    icon: 'book-open',
    label: t.subject,
    sub: `${t.difficulty} · ${getDaysLeft(t.examDate)}d left`,
    action: () => { closeCommandPalette(); if(typeof startStudyTimer==='function') startStudyTimer(t.id, t.subject, t.recommendedMinutes || 25); }
  }));

  const all = [...actions, ...subjectItems];
  if (!q) return all.slice(0, 8);
  return all.filter(item => item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q)).slice(0, 8);
}

let _cmdSelectedIdx = 0;

function renderCmdResults(query) {
  const container = document.getElementById('cmdResults');
  if (!container) return;
  const items = getCmdItems(query);
  _cmdSelectedIdx = 0;

  if (items.length === 0) {
    container.innerHTML = `<div class="cmd-empty">No results for "${escHtml(query)}"</div>`;
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="cmd-item ${i === 0 ? 'cmd-selected' : ''}" data-idx="${i}" onclick="executeCmdItem(${i})">
      <span class="cmd-item-icon"><i data-lucide="${item.icon}" class="icon-inline"></i></span>
      <div class="cmd-item-body">
        <div class="cmd-item-label">${escHtml(item.label)}</div>
        <div class="cmd-item-sub">${escHtml(item.sub)}</div>
      </div>
    </div>`).join('');

  container._items = items;
  if (typeof refreshIcons === 'function') refreshIcons();
}

function executeCmdItem(idx) {
  const container = document.getElementById('cmdResults');
  if (!container || !container._items) return;
  const item = container._items[idx];
  if (item) { playSound('click'); item.action(); }
}

function handleCmdKeyNav(e) {
  const container = document.getElementById('cmdResults');
  if (!container || !container._items) return;
  const items = container.querySelectorAll('.cmd-item');
  const total = items.length;
  if (total === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _cmdSelectedIdx = (_cmdSelectedIdx + 1) % total;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _cmdSelectedIdx = (_cmdSelectedIdx - 1 + total) % total;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    executeCmdItem(_cmdSelectedIdx);
    return;
  }
  items.forEach((el, i) => el.classList.toggle('cmd-selected', i === _cmdSelectedIdx));
  items[_cmdSelectedIdx]?.scrollIntoView({ block: 'nearest' });
}

/* ═══════════════════════════════════════════════════════════
   AI EXAM PREDICTOR
   ═══════════════════════════════════════════════════════════ */
function calculatePreparedness(task) {
  const daysLeft   = getDaysLeft(task.examDate);
  const totalDays  = Math.max(1, getDaysLeft(task.examDate) + (task.daysStudied || 0));
  const progress   = getAllProgress();
  const today      = new Date().toISOString().split('T')[0];

  // Minutes studied for this subject
  let minutesStudied = 0;
  progress.forEach(day => {
    minutesStudied += (day.blocks?.[task.id] || 0);
  });

  const hoursStudied = minutesStudied / 60;
  const diffScore    = { easy: 1, medium: 2, hard: 3 }[task.difficulty] || 2;
  const targetHours  = (task.workAmount || diffScore * 10);

  // Base preparedness from hours studied vs target
  let base = Math.min(95, Math.round((hoursStudied / targetHours) * 100));

  // Urgency penalty: if exam is very close and base is low
  if (daysLeft <= 3 && base < 60) base = Math.max(base - 10, 5);

  // Streak bonus
  const user = getUser();
  if (user.streak >= 7) base = Math.min(95, base + 5);

  return Math.max(5, base);
}

function renderExamPredictor() {
  const container = document.getElementById('examPredictorWidget');
  if (!container) return;

  const tasks = getTasks().filter(t => !t.completed)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .slice(0, 4);

  if (tasks.length === 0) {
    container.innerHTML = `<div class="chart-empty-state"><div class="chart-empty-icon"><i data-lucide="sparkles" style="width:1.5em;height:1.5em;"></i></div><div class="chart-empty-title">No exams to predict</div><div class="chart-empty-sub">Add subjects with exam dates to see your preparedness score.</div></div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  container.innerHTML = tasks.map(t => {
    const pct = calculatePreparedness(t);
    const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#fbbf24' : '#f43f5e';
    const label = pct >= 70 ? 'Well Prepared' : pct >= 40 ? 'Needs Work' : 'At Risk';
    const days  = getDaysLeft(t.examDate);
    return `
      <div class="predictor-item">
        <div class="predictor-info">
          <div class="predictor-subject">${escHtml(t.subject)}</div>
          <div class="predictor-days">${days > 0 ? `${days}d left` : 'Overdue'}</div>
        </div>
        <div class="predictor-bar-wrap">
          <div class="predictor-bar">
            <div class="predictor-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="predictor-pct" style="color:${color}">${pct}%</span>
        </div>
        <span class="predictor-label" style="color:${color}">${label}</span>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   BURNOUT DETECTION
   ═══════════════════════════════════════════════════════════ */
function detectBurnout() {
  const progress = getAllProgress();
  if (progress.length < 7) return null;

  const today = new Date();
  const last7  = [];
  const prev7  = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const rec = progress.find(p => p.date === dateStr);
    last7.push(rec ? Object.values(rec.blocks || {}).reduce((s,m) => s+m, 0) : 0);
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const rec = progress.find(p => p.date === dateStr);
    prev7.push(rec ? Object.values(rec.blocks || {}).reduce((s,m) => s+m, 0) : 0);
  }

  const avgLast = last7.reduce((s,m) => s+m, 0) / 7;
  const avgPrev = prev7.reduce((s,m) => s+m, 0) / 7;
  const zeroDays = last7.filter(m => m === 0).length;

  if (avgPrev > 30 && avgLast < avgPrev * 0.4) {
    return { type: 'drop', msg: `<i data-lucide="trending-down" class="icon-inline"></i> Study activity dropped ${Math.round((1 - avgLast/avgPrev)*100)}% this week. Consider a lighter session to rebuild momentum.` };
  }
  if (zeroDays >= 4) {
    return { type: 'inactive', msg: `<i data-lucide="frown" class="icon-inline"></i> You've missed ${zeroDays} days this week. Even 15 minutes counts — start small!` };
  }
  if (avgLast > 240) {
    return { type: 'overwork', msg: `<i data-lucide="alert-triangle" class="icon-inline"></i> You're averaging ${Math.round(avgLast/60)}h/day. Make sure to rest — sleep is when memory consolidates!` };
  }
  return null;
}

function renderBurnoutAlert() {
  const container = document.getElementById('burnoutAlert');
  if (!container) return;

  const result = detectBurnout();
  if (!result) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="burnout-alert burnout-${result.type}">
      <span class="burnout-msg">${result.msg}</span>
      <button class="burnout-dismiss" onclick="this.closest('.burnout-alert').parentElement.style.display='none'">✕</button>
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════════════════
   QUICK ACTIONS ROW
   ═══════════════════════════════════════════════════════════ */
function renderQuickActions() {
  const container = document.getElementById('quickActionsRow');
  if (!container) return;

  const tasks = getTasks().filter(t => !t.completed);
  const topTask = tasks.sort((a,b) => (b.priority||0)-(a.priority||0))[0];

  container.innerHTML = `
    <div class="quick-actions-row stagger">
      <button class="quick-action-btn" onclick="document.querySelector('.tw-btn-primary')?.click(); playSound('click')">
        <span class="qa-icon"><i data-lucide="clock" class="icon-inline"></i></span>
        <span class="qa-label">Start Timer</span>
      </button>
      <a href="add.html" class="quick-action-btn">
        <span class="qa-icon"><i data-lucide="plus-circle" class="icon-inline"></i></span>
        <span class="qa-label">Add Subject</span>
      </a>
      <button class="quick-action-btn" onclick="openAIPlanner(); playSound('click')">
        <span class="qa-icon"><i data-lucide="bot" class="icon-inline"></i></span>
        <span class="qa-label">AI Planner</span>
      </button>
      <button class="quick-action-btn" onclick="toggleCommandPalette(); playSound('click')">
        <span class="qa-icon"><i data-lucide="command" class="icon-inline"></i></span>
        <span class="qa-label">Commands</span>
      </button>
      ${topTask ? `
      <button class="quick-action-btn qa-priority" onclick="startStudyTimer('${topTask.id}','${escHtml(topTask.subject)}',${topTask.recommendedMinutes||25}); playSound('click')">
        <span class="qa-icon"><i data-lucide="target" class="icon-inline"></i></span>
        <span class="qa-label">Study ${escHtml(topTask.subject.split(' ')[0])}</span>
      </button>` : ''}
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════════════════
   PERSONALIZED INSIGHTS
   ═══════════════════════════════════════════════════════════ */
function renderPersonalizedInsights() {
  const container = document.getElementById('insightsRow');
  if (!container) return;

  const stats   = getStats();
  const user    = getUser();
  const weekly  = getWeeklyProgress();
  const tasks   = getTasks().filter(t => !t.completed);

  const insights = [];

  // Upcoming exam insight
  const urgent = tasks.filter(t => getDaysLeft(t.examDate) <= 14 && getDaysLeft(t.examDate) > 0)
    .sort((a,b) => getDaysLeft(a.examDate) - getDaysLeft(b.examDate))[0];
  if (urgent) {
    insights.push({ icon: 'calendar', text: `You're <strong>${getDaysLeft(urgent.examDate)} days</strong> away from your <strong>${escHtml(urgent.subject)}</strong> exam.` });
  }

  // Weekly comparison
  const thisWeek = weekly.slice(0, 7).reduce((s,d) => s+d.minutes, 0);
  const lastWeek = weekly.slice(0, 7).reduce((s,d) => s+d.minutes, 0); // simplified
  if (thisWeek > 0) {
    insights.push({ icon: 'trending-up', text: `You've studied <strong>${Math.round(thisWeek/60*10)/10} hours</strong> this week.` });
  }

  // Streak insight
  if (user.streak >= 3) {
    insights.push({ icon: 'flame', text: `<strong>${user.streak}-day streak!</strong> Keep it going — consistency beats intensity.` });
  }

  // Level insight
  const level = user.level || 1;
  const xp = user.xp || 0;
  const nextLevelXP = Math.pow(level, 2) * 500;
  const xpNeeded = nextLevelXP - xp;
  if (xpNeeded < 500) {
    insights.push({ icon: 'star', text: `Only <strong>${xpNeeded} XP</strong> until Level ${level+1}!` });
  }

  if (insights.length === 0) {
    insights.push({ icon: 'lightbulb', text: 'Add subjects and start studying to see personalized insights here.' });
  }

  container.innerHTML = `
    <div class="insights-row">
      ${insights.slice(0,3).map(ins => `
        <div class="insight-chip">
          <span class="insight-icon"><i data-lucide="${ins.icon}" class="icon-inline"></i></span>
          <span class="insight-text">${ins.text}</span>
        </div>`).join('')}
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════════════════
   INIT — called from dashboard DOMContentLoaded
   ═══════════════════════════════════════════════════════════ */
function initFeatures() {
  initSound();
  initCommandPalette();
  renderQuickActions();
  renderQuestsWidget();
  renderAchievementsPanel();
  renderExamPredictor();
  renderBurnoutAlert();
  renderPersonalizedInsights();
  checkAchievements();
  checkAndUpdateQuests();
}

function refreshFeatures() {
  renderQuickActions();
  renderQuestsWidget();
  renderAchievementsPanel();
  renderExamPredictor();
  renderBurnoutAlert();
  renderPersonalizedInsights();
  checkAchievements();
  checkAndUpdateQuests();
}
