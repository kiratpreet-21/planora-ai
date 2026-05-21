/* ============================================================
   PLANORA – STORAGE.JS | LocalStorage Data Layer
   ============================================================ */
'use strict';

const TASKS_KEY  = 'planora_tasks';
const USER_KEY   = 'planora_user';
const THEME_KEY  = 'planora_theme';
const PROGRESS_KEY = 'planora_daily_progress'; // Store { date: YYYY-MM-DD, blocks: { subjectId: minutes } }

/* ══════════════════════════════════════════════
   TASKS
══════════════════════════════════════════════ */
function getTasks() {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY)) || []; }
  catch { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function addTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
}

function deleteTask(id) {
  saveTasks(getTasks().filter(t => t.id !== id));
}

function toggleTaskComplete(id) {
  const tasks = getTasks();
  const task  = tasks.find(t => t.id === id);
  if (task) {
    task.completed   = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
  }
  saveTasks(tasks);
  return task;
}

/* ══════════════════════════════════════════════
   PRIORITY ENGINE
══════════════════════════════════════════════ */
function getDaysLeft(examDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam  = new Date(examDate); exam.setHours(0, 0, 0, 0);
  return Math.ceil((exam - today) / 86_400_000);
}

function calculatePriority(difficulty, examDate, workAmount = 0) {
  const diffMap = { 'easy': 1, 'medium': 3, 'hard': 5 };
  const dVal = diffMap[difficulty] || parseInt(difficulty) || 3;
  
  const d = getDaysLeft(examDate);
  if (d <= 0) return 999;          // overdue → max priority
  
  // AI Study Planner Logic:
  // 1. Estimate total workload if not provided
  const estimatedWork = workAmount > 0 ? workAmount : dVal * 5;
  
  // 2. Calculate required hours per day
  const hoursPerDay = estimatedWork / d;
  
  // 3. Map hours per day to Priority.
  // 3+ hours/day = 1.0 (High Priority)
  // ~1 hour/day = 0.33 (Medium Priority)
  let priority = hoursPerDay / 3.0;
  
  return parseFloat(priority.toFixed(4));
}

function getPriorityLevel(priority) {
  if (priority >= 0.7) return 'high';
  if (priority >= 0.3) return 'medium';
  return 'low';
}

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => b.priority - a.priority);
}

/* ══════════════════════════════════════════════
   USER PROFILE
══════════════════════════════════════════════ */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || { streak: 0, lastStudy: null };
  } catch { return { streak: 0, lastStudy: null }; }
}

function saveUser(data) {
  localStorage.setItem(USER_KEY, JSON.stringify({ ...getUser(), ...data }));
}

/* ══════════════════════════════════════════════
   THEME
══════════════════════════════════════════════ */
function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

/* ══════════════════════════════════════════════
   STATS HELPER
══════════════════════════════════════════════ */
function getStats() {
  const tasks    = getTasks();
  const total    = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending  = total - completed;
  const high     = tasks.filter(t => t.priorityLevel === 'high' && !t.completed).length;
  const user     = getUser();
  
  // Calculate total study time
  const progressList = getAllProgress();
  let totalMinutes = 0;
  progressList.forEach(day => {
    Object.values(day.blocks || {}).forEach(m => totalMinutes += m);
  });

  return { 
    total, 
    completed, 
    pending, 
    high, 
    streak: user.streak || 0,
    totalMinutes,
    completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/* ══════════════════════════════════════════════
   DAILY PROGRESS & TIME TRACKING
   ══════════════════════════════════════════════ */
function getAllProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || []; }
  catch { return []; }
}

function saveStudySession(subjectId, durationMinutes) {
  const today = new Date().toISOString().split('T')[0];
  const progress = getAllProgress();
  
  let dayRecord = progress.find(p => p.date === today);
  if (!dayRecord) {
    dayRecord = { date: today, blocks: {} };
    progress.push(dayRecord);
  }
  
  if (!dayRecord.blocks[subjectId]) dayRecord.blocks[subjectId] = 0;
  dayRecord.blocks[subjectId] += durationMinutes;
  
  // Keep last 30 days of data
  if (progress.length > 30) progress.shift();
  
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  
  // Also update user's total study time and XP
  const user = getUser();
  user.totalStudyTime = (user.totalStudyTime || 0) + durationMinutes;
  const leveledUp = awardXP(durationMinutes * 10);
  
  return leveledUp;
}

function awardXP(amount) {
  const user = getUser();
  const oldLevel = user.level || 1;
  user.xp = (user.xp || 0) + amount;
  
  const nextLevel = Math.floor(Math.sqrt(user.xp / 500)) + 1;
  let leveledUp = false;
  if (nextLevel > oldLevel) {
    user.level = nextLevel;
    leveledUp = true;
  }
  saveUser(user);
  return leveledUp;
}

function getWeeklyProgress() {
  const progress = getAllProgress();
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = progress.find(p => p.date === dateStr);
    
    let totalMinutes = 0;
    if (record) {
      Object.values(record.blocks).forEach(m => totalMinutes += m);
    }
    
    last7Days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: totalMinutes
    });
  }
  return last7Days;
}

function resetAllData() {
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  // Keep theme settings
}
