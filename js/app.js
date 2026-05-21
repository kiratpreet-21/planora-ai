/* ============================================================
   PLANORA – APP.JS | Core Application Logic
   ============================================================ */

/* ─── State ─── */
let state = {
  subjects: [],
  tasks: [],        // today's generated tasks
  completedTasks: new Set(),
  user: { name: 'Scholar', dailyGoal: 4, avatar: '?', streak: 0, lastStudy: null },
  theme: 'dark',
  todayPlan: [],
  studyHoursThisWeek: 0,
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

/* ─── Auth Gate ─── */
function checkAuth() {
  const auth = localStorage.getItem('planora_auth');
  if (auth) {
    // Already logged in — hide login screen and boot app
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.add('hidden');
    initApp();
  } else {
    // Show login screen (already visible by default)
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.remove('hidden');
  }
}

function initApp() {
  loadFromStorage();
  injectSVGGradients();
  updateGreeting();
  updateDateDisplay();
  updateDashboard();
  updateCalendar();
  setMinExamDate();
  checkStreak();
  renderProfilePage();
  document.querySelectorAll('.btn').forEach(addRipple);
}

/* ─── Simple hash (djb2) — not cryptographic, safe for local storage demo ─── */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function handleLogin(e) {
  e.preventDefault();
  const name = document.getElementById('loginName')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errEl = document.getElementById('loginError');

  if (!name || !password) {
    errEl.textContent = 'Please fill in all fields.';
    return;
  }

  const stored = JSON.parse(localStorage.getItem('planora_auth') || 'null');
  if (stored) {
    // Account exists — verify
    if (stored.name.toLowerCase() !== name.toLowerCase() || stored.passwordHash !== simpleHash(password)) {
      errEl.textContent = 'Incorrect name or password. Try again.';
      return;
    }
  } else {
    // No account yet — save directly (first-time login treated as register)
    localStorage.setItem('planora_auth', JSON.stringify({ name, passwordHash: simpleHash(password) }));
  }

  errEl.textContent = '';
  // Update displayed name
  state.user.name = stored ? stored.name : name;
  saveToStorage();

  const screen = document.getElementById('loginScreen');
  if (screen) screen.classList.add('hidden');
  initApp();
  showToast(`👋 Welcome back, ${state.user.name}!`, 'success');
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName')?.value?.trim();
  const password = document.getElementById('signupPassword')?.value;
  const confirm = document.getElementById('signupConfirm')?.value;
  const errEl = document.getElementById('signupError');

  if (!name || !password || !confirm) {
    errEl.textContent = 'Please fill in all fields.';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (password !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    return;
  }

  errEl.textContent = '';
  localStorage.setItem('planora_auth', JSON.stringify({ name, passwordHash: simpleHash(password) }));
  // Set user name in state and persist
  state.user.name = name;
  saveToStorage();

  const screen = document.getElementById('loginScreen');
  if (screen) screen.classList.add('hidden');
  initApp();
  showToast(`🎉 Welcome to Planora, ${name}! Let's start planning!`, 'success');
}

function switchLoginTab(tab) {
  // Update tabs
  document.getElementById('tabLogin')?.classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup')?.classList.toggle('active', tab === 'signup');
  // Update panels
  document.getElementById('panelLogin')?.classList.toggle('active', tab === 'login');
  document.getElementById('panelSignup')?.classList.toggle('active', tab === 'signup');
  // Clear errors
  const loginErr = document.getElementById('loginError');
  const signupErr = document.getElementById('signupError');
  if (loginErr) loginErr.textContent = '';
  if (signupErr) signupErr.textContent = '';
}

function toggleLoginPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.style.opacity = isText ? '0.5' : '1';
}

/* ─── Storage ─── */
function saveToStorage() {
  const data = {
    subjects: state.subjects,
    tasks: state.tasks,
    completedTasks: [...state.completedTasks],
    user: state.user,
    theme: state.theme,
    studyHoursThisWeek: state.studyHoursThisWeek,
  };
  localStorage.setItem('planora_data', JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('planora_data');
    if (!raw) return;
    const data = JSON.parse(raw);
    state.subjects = data.subjects || [];
    state.tasks = data.tasks || [];
    state.completedTasks = new Set(data.completedTasks || []);
    state.user = { ...state.user, ...(data.user || {}) };
    state.theme = data.theme || 'dark';
    state.studyHoursThisWeek = data.studyHoursThisWeek || 0;
    applyTheme(state.theme);
    // Update avatar
    updateAvatarUI();
  } catch (e) {
    console.warn('Storage load error:', e);
  }
}

/* ─── Page Navigation ─── */
function showPage(pageId) {
  // Deactivate all
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Activate target
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Update nav link
  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (link) link.classList.add('active');

  // Page-specific refresh
  if (pageId === 'dashboard') updateDashboard();
  if (pageId === 'calendar') renderCalendar();
  if (pageId === 'addtask') renderSubjectsList();
  if (pageId === 'profile') renderProfilePage();

  // Close mobile nav if open
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav && mobileNav.classList.contains('open')) toggleMobileNav();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Theme ─── */
function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  state.theme = theme;
  applyTheme(theme);
  saveToStorage();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/* ─── Mobile Nav ─── */
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileNavOverlay');
  const ham = document.getElementById('hamburger');
  nav.classList.toggle('open');
  overlay.classList.toggle('open');
  ham.classList.toggle('open');
}

/* ─── Avatar Dropdown ─── */
function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu');
  menu.classList.toggle('open');
  // Close on outside click
  const handler = (e) => {
    if (!document.getElementById('avatarWrapper').contains(e.target)) {
      menu.classList.remove('open');
      document.removeEventListener('click', handler);
    }
  };
  if (menu.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', handler), 50);
  }
}

/* ─── Greeting & Date ─── */
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Morning';
  if (hour >= 12 && hour < 17) greeting = 'Afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Evening';
  else if (hour >= 21) greeting = 'Night';
  safeSet('greetingTime', greeting);
  safeSet('greetingName', state.user.name || 'Scholar');
}

function updateDateDisplay() {
  const now = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  safeSet('currentDate', now.toLocaleDateString('en-US', opts));
}

/* ─── Streak ─── */
function checkStreak() {
  const today = new Date().toDateString();
  const last = state.user.lastStudy;
  if (!last) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (last === yesterday.toDateString()) {
    // Streak continues
  } else if (last !== today) {
    // Streak broken
    state.user.streak = 0;
    saveToStorage();
  }
  updateStreakUI();
}

function incrementStreak() {
  const today = new Date().toDateString();
  if (state.user.lastStudy !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (state.user.lastStudy === yesterday.toDateString()) {
      state.user.streak = (state.user.streak || 0) + 1;
    } else if (!state.user.lastStudy) {
      state.user.streak = 1;
    }
    state.user.lastStudy = today;
    saveToStorage();
    updateStreakUI();
  }
}

function updateStreakUI() {
  safeSet('streakCount', state.user.streak || 0);
  safeSet('accountStreak', `🔥 ${state.user.streak || 0}`);
  safeSet('profileStreak', state.user.streak || 0);
}

/* ─── Dashboard Update ─── */
function updateDashboard() {
  updateGreeting();
  renderTodayPlan();
  renderExamList();
  updateCompletionStatus();
  updatePriorityBars();
  updateAISuggestion();
  updateAccountCard();
  updateStreakUI();
}

/* ─── Today's Plan ─── */
function renderTodayPlan() {
  const list = document.getElementById('todayTaskList');
  if (!list) return;

  // Generate plan if no tasks or subjects changed
  if (state.todayPlan.length === 0 && state.subjects.length > 0) {
    state.todayPlan = generateDailyPlan();
    saveToStorage();
  }

  const plan = state.todayPlan;
  const total = plan.length;
  const done = plan.filter(t => state.completedTasks.has(t.id)).length;

  safeSet('todayTotal', total);
  safeSet('todayCompleted', done);

  const fillEl = document.getElementById('todayProgressFill');
  if (fillEl) fillEl.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';

  if (plan.length === 0) {
    list.innerHTML = `
      <div class="empty-plan">
        <div class="empty-plan-steps">
          <div class="empty-plan-step">
            <span class="empty-plan-num">1</span>
            <span><a href="#" onclick="showPage('addtask')" class="empty-plan-link">Add a subject</a> with its exam date</span>
          </div>
          <div class="empty-plan-step">
            <span class="empty-plan-num">2</span>
            <span>Set difficulty &amp; daily hours</span>
          </div>
          <div class="empty-plan-step">
            <span class="empty-plan-num">3</span>
            <span>AI builds your daily schedule ✨</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showPage('addtask')" style="margin-top:.75rem;width:100%">
          + Add First Subject
        </button>
      </div>`;
    return;
  }

  list.innerHTML = plan.map(task => {
    const checked = state.completedTasks.has(task.id);
    return `
      <div class="task-item ${checked ? 'completed' : ''}" id="task-${task.id}" onclick="toggleTask('${task.id}')">
        <div class="task-checkbox ${checked ? 'checked' : ''}"></div>
        <div class="task-color-bar" style="background:${task.color}"></div>
        <div class="task-info">
          <div class="task-name">${escHtml(task.subject)}</div>
          <div class="task-meta">${task.difficulty} • Priority ${task.priorityLabel}</div>
        </div>
        <div class="task-duration">${task.hours}h</div>
      </div>`;
  }).join('');
}

function toggleTask(taskId) {
  const wasCompleted = state.completedTasks.has(taskId);

  if (!wasCompleted) {
    state.completedTasks.add(taskId);
    playCompleteSound();
    fireConfetti();
    showToast('✅ Task completed! Keep it up! 🚀', 'success');
    incrementStreak();

    // Accumulate study hours
    const task = state.todayPlan.find(t => t.id === taskId);
    if (task) {
      state.studyHoursThisWeek = (state.studyHoursThisWeek || 0) + (task.hours || 1);
    }
  } else {
    state.completedTasks.delete(taskId);
  }

  saveToStorage();
  renderTodayPlan();
  updateCompletionStatus();
  updateAccountCard();
}

/* ─── Exam List ─── */
function renderExamList() {
  const list = document.getElementById('examList');
  if (!list) return;

  const subjects = state.subjects.filter(s => s.examDate);
  if (subjects.length === 0) {
    list.innerHTML = `
      <div class="empty-state-rich">
        <div class="empty-illustration">🎯</div>
        <div class="empty-title">No Upcoming Exams</div>
        <div class="empty-sub">Stay ahead of the curve! Add your first exam to track countdowns and generate a smart study schedule.</div>
        <div class="empty-actions">
          <button class="btn btn-primary" onclick="showPage('addtask')">Add Exam</button>
        </div>
      </div>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const sorted = [...subjects].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  list.innerHTML = sorted.map(s => {
    const exam = new Date(s.examDate); exam.setHours(0,0,0,0);
    const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'soon' : 'ok';
    const label = daysLeft < 0 ? 'Past!' : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`;
    return `
      <div class="exam-item ${urgency}">
        <div class="exam-color-dot" style="background:${s.color}"></div>
        <div class="exam-info">
          <div class="exam-name">${escHtml(s.name)}</div>
          <div class="exam-date-text">${formatDate(s.examDate)}</div>
        </div>
        <span class="exam-countdown">${label}</span>
      </div>`;
  }).join('');
}

/* ─── Completion Status ─── */
function updateCompletionStatus() {
  const total = state.todayPlan.length;
  const done = state.todayPlan.filter(t => state.completedTasks.has(t.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Circular progress
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;
  const circle = document.getElementById('completionCircle');
  if (circle) circle.style.strokeDashoffset = offset;
  safeSet('completionPct', `${pct}%`);

  safeSet('statTasksDone', `${done} / ${total}`);
  safeSet('statSubjects', state.subjects.length);
  safeSet('statHours', `${state.studyHoursThisWeek.toFixed(1)}h`);

  const badge = document.getElementById('aheadBadge');
  if (badge) {
    if (pct >= 80) badge.textContent = '🏆 Excellent work today!';
    else if (pct >= 50) badge.textContent = '🚀 You\'re ahead of 70% students!';
    else if (pct >= 25) badge.textContent = '📈 Great progress, keep going!';
    else badge.textContent = '💪 You\'ve got this, let\'s study!';
  }
}

/* ─── Priority Bars ─── */
function updatePriorityBars() {
  if (!state.subjects.length) {
    safeStyle('highBar', 'width', '0%'); safeSet('highPct', '0%');
    safeStyle('medBar',  'width', '0%'); safeSet('medPct', '0%');
    safeStyle('lowBar',  'width', '0%'); safeSet('lowPct', '0%');
    return;
  }

  const cats = { high: 0, medium: 0, low: 0 };
  state.subjects.forEach(s => {
    const cat = getPriorityCategory(s);
    cats[cat]++;
  });

  const total = state.subjects.length;
  const highPct  = Math.round((cats.high   / total) * 100);
  const medPct   = Math.round((cats.medium / total) * 100);
  const lowPct   = Math.round((cats.low    / total) * 100);

  setTimeout(() => {
    safeStyle('highBar', 'width', `${highPct}%`);
    safeStyle('medBar',  'width', `${medPct}%`);
    safeStyle('lowBar',  'width', `${lowPct}%`);
    safeSet('highPct', `${highPct}%`);
    safeSet('medPct',  `${medPct}%`);
    safeSet('lowPct',  `${lowPct}%`);
    safeSet('highTooltip', `${cats.high} subjects`);
    safeSet('medTooltip',  `${cats.medium} subjects`);
    safeSet('lowTooltip',  `${cats.low} subjects`);
  }, 300);
}

/* ─── Account Card ─── */
function updateAccountCard() {
  safeSet('accountName', state.user.name || 'Scholar');
  safeSet('accountHours', `${(state.studyHoursThisWeek || 0).toFixed(1)}h`);
  safeSet('accountSubjects', state.subjects.length);
  safeSet('accountStreak', `🔥 ${state.user.streak || 0}`);

  const initials = getInitials(state.user.name);
  safeSet('accountAvatarLarge', initials);
  safeSet('avatarInitials', initials);
}

/* ─── Profile ─── */
function renderProfilePage() {
  const name = state.user.name || 'Scholar';
  safeSet('profileNameDisplay', name);
  safeSet('profileAvatarXL', getInitials(name));
  safeSet('dropdownName', name);

  const usernameInput = document.getElementById('profileUsername');
  const goalInput = document.getElementById('dailyGoal');
  if (usernameInput) usernameInput.value = name;
  if (goalInput) goalInput.value = state.user.dailyGoal || 4;

  safeSet('profileStreak', state.user.streak || 0);
  safeSet('profileSubjects', state.subjects.length);
  safeSet('profileTasksDone', state.completedTasks.size);
  safeSet('profileHours', `${(state.studyHoursThisWeek || 0).toFixed(1)}h`);
}

function saveProfile() {
  const name = document.getElementById('profileUsername')?.value?.trim() || 'Scholar';
  const goal = parseInt(document.getElementById('dailyGoal')?.value) || 4;
  state.user.name = name;
  state.user.dailyGoal = goal;
  saveToStorage();
  renderProfilePage();
  updateAvatarUI();
  updateAccountCard();
  updateGreeting();
  showToast('✅ Profile saved successfully!', 'success');
}

function updateAvatarUI() {
  const initials = getInitials(state.user.name);
  safeSet('avatarInitials', initials);
  safeSet('dropdownName', state.user.name || 'Scholar');
}

/* ─── AI Suggestion ─── */
function updateAISuggestion() {
  const el = document.getElementById('aiSuggestionText');
  const tags = document.getElementById('aiTags');
  if (!el) return;

  if (state.subjects.length === 0) {
    el.innerHTML = 'Add subjects to get personalized AI study recommendations! <a href="#" onclick="showPage(\'addtask\')" style="color:var(--purple);font-weight:bold;margin-left:0.5rem">Add now →</a>';
    if (tags) tags.innerHTML = '';
    return;
  }

  const suggestion = generateAISuggestion();
  el.textContent = suggestion.text;
  if (tags && suggestion.tags.length) {
    tags.innerHTML = suggestion.tags.map(t => `<span class="ai-tag">${t}</span>`).join('');
  }
}

function regeneratePlan() {
  if (state.subjects.length === 0) {
    showToast('Add subjects first! 📚', 'info');
    return;
  }
  state.completedTasks.clear();
  state.todayPlan = generateDailyPlan();
  saveToStorage();
  updateDashboard();
  showToast('✨ Study plan regenerated!', 'info');
  // Spin the button icon
  const btn = event.currentTarget;
  if (btn) { btn.style.opacity = '0.6'; setTimeout(() => btn.style.opacity = '1', 600); }
}

function generatePlanAndGo() {
  if (state.subjects.length === 0) {
    showToast('Add at least one subject first! 📚', 'info');
    return;
  }
  state.todayPlan = generateDailyPlan();
  saveToStorage();
  showPage('dashboard');
  showToast('🚀 Study plan generated! Let\'s go!', 'success');
}

/* ─── Add Subject ─── */
function addSubject(e) {
  e.preventDefault();

  const name = document.getElementById('subjectName')?.value?.trim();
  const diff = document.getElementById('selectedDifficulty')?.value;
  const examDate = document.getElementById('examDate')?.value;
  const hours = parseFloat(document.getElementById('dailyHours')?.value) || 2;
  const color = document.getElementById('selectedColor')?.value || '#a78bfa';

  if (!name || !diff || !examDate) {
    showToast('Please fill all required fields! ⚠️', 'error');
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const exam = new Date(examDate); exam.setHours(0,0,0,0);
  if (exam < today) {
    showToast('Exam date must be in the future! 📅', 'error');
    return;
  }

  const subject = {
    id: Date.now().toString(),
    name,
    difficulty: diff,
    examDate,
    hours,
    color,
    priority: calculatePriority(diff, examDate),
    addedAt: new Date().toISOString(),
  };

  state.subjects.push(subject);
  state.todayPlan = generateDailyPlan(); // Regenerate plan
  saveToStorage();
  renderSubjectsList();
  updateDashboard();

  showToast(`✅ "${name}" added!`, 'success');

  // Reset form
  document.getElementById('addTaskForm')?.reset();
  selectDifficulty('hard');
  selectColor('#a78bfa');
  document.getElementById('hoursLabel').textContent = '2 hrs';
  setMinExamDate();
}

function renderSubjectsList() {
  const list = document.getElementById('subjectsList');
  const count = document.getElementById('subjectsCount');
  if (!list) return;

  if (count) count.textContent = `${state.subjects.length} subject${state.subjects.length !== 1 ? 's' : ''}`;

  if (state.subjects.length === 0) {
    list.innerHTML = `
      <div class="empty-state-rich empty-state-onboarding">
        <div class="empty-illustration">📚</div>
        <div class="empty-title">Your Study Journey Begins Here</div>
        <div class="empty-sub">Planora uses AI to prioritize your study time based on difficulty and exam dates. Add your first subject to get started!</div>

        <div class="onboarding-steps">
          <div class="onboarding-step">
            <div class="onboarding-step-icon">✏️</div>
            <div class="onboarding-step-text">
              <strong>Name it</strong>
              <span>e.g. "Calculus"</span>
            </div>
          </div>
          <div class="onboarding-step-arrow">→</div>
          <div class="onboarding-step">
            <div class="onboarding-step-icon">📅</div>
            <div class="onboarding-step-text">
              <strong>Set exam date</strong>
              <span>AI calculates urgency</span>
            </div>
          </div>
          <div class="onboarding-step-arrow">→</div>
          <div class="onboarding-step">
            <div class="onboarding-step-icon">🚀</div>
            <div class="onboarding-step-text">
              <strong>Get your plan</strong>
              <span>Daily schedule ready</span>
            </div>
          </div>
        </div>

        <div class="empty-actions">
          <button class="btn btn-primary" onclick="document.getElementById('subjectName')?.focus()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add First Subject
          </button>
          <button class="btn btn-outline" onclick="loadDemoData()">✨ Try Demo Data</button>
        </div>
        <p class="empty-tip">💡 <em>Demo data loads 3 sample subjects so you can explore Planora instantly.</em></p>
      </div>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const sorted = [...state.subjects].sort((a, b) => b.priority - a.priority);

  list.innerHTML = sorted.map(s => {
    const cat = getPriorityCategory(s);
    const daysLeft = Math.ceil((new Date(s.examDate) - today) / (1000 * 60 * 60 * 24));
    return `
      <div class="subject-item">
        <div class="subject-color-bar" style="background:${s.color}"></div>
        <div class="subject-info">
          <div class="subject-name">${escHtml(s.name)}</div>
          <div class="subject-meta">${capitalize(s.difficulty)} • ${daysLeft > 0 ? daysLeft + 'd left' : 'Exam passed'} • ${s.hours}h/day</div>
        </div>
        <span class="subject-priority-badge priority-${cat}">${cat}</span>
        <button class="subject-delete-btn" onclick="deleteSubject('${s.id}')" title="Remove subject">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`;
  }).join('');
}

function deleteSubject(id) {
  const subj = state.subjects.find(s => s.id === id);
  state.subjects = state.subjects.filter(s => s.id !== id);
  // Remove related tasks
  state.todayPlan = state.todayPlan.filter(t => t.subjectId !== id);
  saveToStorage();
  renderSubjectsList();
  updateDashboard();
  if (subj) showToast(`🗑️ "${subj.name}" removed`, 'info');
}

/* ─── Demo Data ─── */
function loadDemoData() {
  const today = new Date();
  
  const addDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const demoSubjects = [
    {
      id: Date.now().toString() + '-1',
      name: 'Advanced Calculus',
      difficulty: 'hard',
      examDate: addDays(14),
      hours: 2,
      color: '#f43f5e',
      priority: 0.95,
      addedAt: today.toISOString()
    },
    {
      id: Date.now().toString() + '-2',
      name: 'Organic Chemistry',
      difficulty: 'medium',
      examDate: addDays(5),
      hours: 1.5,
      color: '#fbbf24',
      priority: 0.85,
      addedAt: today.toISOString()
    },
    {
      id: Date.now().toString() + '-3',
      name: 'World History',
      difficulty: 'low',
      examDate: addDays(30),
      hours: 1,
      color: '#22c55e',
      priority: 0.3,
      addedAt: today.toISOString()
    }
  ];

  state.subjects = demoSubjects;
  state.completedTasks.clear();
  state.studyHoursThisWeek = 0;
  state.todayPlan = generateDailyPlan();
  
  saveToStorage();
  renderSubjectsList();
  updateDashboard();
  
  showToast('✨ Demo data loaded successfully!', 'success');
  
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    showPage('dashboard');
  }
}

/* ─── Form Helpers ─── */
function selectDifficulty(diff) {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.remove('active-diff');
  });
  document.querySelectorAll(`[data-diff="${diff}"]`).forEach(btn => {
    btn.classList.add('active-diff');
  });
  const hidden = document.getElementById('selectedDifficulty');
  if (hidden) hidden.value = diff;
}

function selectColor(color) {
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active-color', sw.dataset.color === color);
  });
  const hidden = document.getElementById('selectedColor');
  if (hidden) hidden.value = color;
}

function updateHoursLabel(val) {
  const el = document.getElementById('hoursLabel');
  if (el) el.textContent = `${val} hr${val != 1 ? 's' : ''}`;
}

function setMinExamDate() {
  const input = document.getElementById('examDate');
  if (input) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    input.min = tomorrow.toISOString().split('T')[0];
  }
}

/* ─── Modals ─── */
function confirmReset() {
  document.getElementById('resetModal')?.classList.add('open');
}
function closeResetModal() {
  document.getElementById('resetModal')?.classList.remove('open');
}
function resetProgress() {
  state.subjects = [];
  state.tasks = [];
  state.completedTasks.clear();
  state.todayPlan = [];
  state.studyHoursThisWeek = 0;
  state.user.streak = 0;
  state.user.lastStudy = null;
  saveToStorage();
  closeResetModal();
  updateDashboard();
  renderSubjectsList();
  showToast('Progress reset.', 'info');
}
function showSettingsModal() {
  document.getElementById('settingsModal')?.classList.add('open');
}
function closeSettingsModal() {
  document.getElementById('settingsModal')?.classList.remove('open');
}
function handleLogout() {
  toggleDropdown();
  // Clear auth session and show login screen
  localStorage.removeItem('planora_auth');
  const screen = document.getElementById('loginScreen');
  if (screen) {
    screen.classList.remove('hidden');
    // Reset login form fields
    const loginName = document.getElementById('loginName');
    const loginPw = document.getElementById('loginPassword');
    if (loginName) loginName.value = '';
    if (loginPw) loginPw.value = '';
    switchLoginTab('login');
  }
  showToast('👋 Logged out. See you soon!', 'info');
}

/* ─── Sound ─── */
function playCompleteSound() {
  const soundEnabled = document.getElementById('soundToggle')?.checked ?? true;
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [261.63, 329.63, 392, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.3);
    });
  } catch(e) {}
}

/* ─── Confetti ─── */
function fireConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({length: 60}, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    r: Math.random() * 6 + 3,
    d: Math.random() * 60 + 20,
    color: ['#a78bfa','#f472b6','#60a5fa','#34d399','#fbbf24','#f87171'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
  }));

  let angle = 0;
  let frame;
  let count = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    count++;
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncrement;
      p.y += (Math.cos(angle + p.d) + 2) * 1.5;
      p.x += Math.sin(angle) * 1.5;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 5);
      ctx.stroke();
    });
    if (count < 120) frame = requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); cancelAnimationFrame(frame); }
  }
  draw();
}

/* ─── Toast ─── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'💬'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ─── Ripple ─── */
function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

/* ─── SVG Gradients ─── */
function injectSVGGradients() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `
    <defs>
      <linearGradient id="completionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#f472b6"/>
      </linearGradient>
    </defs>`;
  document.body.prepend(svg);
}

/* ─── Utility ─── */
function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function safeStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0,2).toUpperCase();
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
