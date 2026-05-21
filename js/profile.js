/* ============================================================
   PLANORA – PROFILE.JS | Profile & Stats Page Logic
   ============================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTheme();
  renderNavbar('profile');
  refreshProfile();
});

function refreshProfile() {
  const user = getUser();
  const stats = getStats();
  const name = getCurrentUser() || 'Scholar';

  // Profile Hero
  setText('profileAv', getInitials(name));
  setText('profileName', name);
  const streakEl = document.getElementById('psStreak');
  if (streakEl) {
    streakEl.innerHTML = `<i data-lucide="flame" class="icon-inline"></i> ${stats.streak}`;
  }
  if (typeof refreshIcons === 'function') refreshIcons();
  setText('psTotalTime', `${Math.round(stats.totalMinutes / 60)}h`);
  setText('psLevel', `Lvl ${user.level || 1}`);

  const level = user.level || 1;
  const xp = user.xp || 0;
  const xpStart = Math.pow(level - 1, 2) * 500;
  const xpEnd = Math.pow(level, 2) * 500;
  const pct = Math.min(100, Math.max(0, ((xp - xpStart) / (xpEnd - xpStart)) * 100));

  const xpBar = document.getElementById('psXPBar');
  if (xpBar) xpBar.style.width = `${pct}%`;
  setText('psXPText', `${xp} / ${xpEnd} XP`);

  // Progress Circle
  const circle = document.getElementById('profileProgressCircle');
  if (circle) {
    circle.style.setProperty('--p', `${stats.completionPercent}%`);
    circle.setAttribute('data-pct', `${stats.completionPercent}%`);
  }

  // Task Stats
  setText('completionValue', `${stats.completed}/${stats.total}`);
  const completionBar = document.getElementById('completionBar');
  if (completionBar) completionBar.style.width = `${stats.completionPercent}%`;

  setText('totalSubCount', stats.total);
  setText('doneTodayCount', stats.completed); // Simplified for now

  renderPriorityAnalysis();
  renderProfileAchievements();
  renderWeeklyGraph();
  renderStrongestWeakest();
  renderProfileHeatmap();
}

function renderPriorityAnalysis() {
  const tasks = getTasks();
  const container = document.getElementById('priorityBars');
  if (!container) return;

  const priorities = ['high', 'medium', 'low'];
  const colors = { high: 'var(--c-high)', medium: 'var(--c-medium)', low: 'var(--c-low)' };
  const labels = { 
    high: '<i data-lucide="alert-circle" class="icon-inline" style="color:var(--c-high)"></i> High Priority', 
    medium: '<i data-lucide="alert-triangle" class="icon-inline" style="color:var(--c-medium)"></i> Medium', 
    low: '<i data-lucide="check-circle" class="icon-inline" style="color:var(--c-low)"></i> Low' 
  };

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state-rich" style="padding:1.5rem;border:1px dashed var(--glass-b);">
        <div class="empty-illustration" style="font-size:2.5rem;margin-bottom:.5rem"><i data-lucide="bar-chart-2" style="width:1.5em;height:1.5em;"></i></div>
        <div class="empty-title" style="font-size:1rem">No subjects yet</div>
        <div class="empty-sub" style="font-size:.85rem;margin-bottom:1rem">Add subjects to see your priority breakdown — high, medium, and low urgency at a glance.</div>
        <a href="add.html" class="btn btn-primary btn-sm">Add First Subject</a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  container.innerHTML = priorities.map(p => {
    const count = tasks.filter(t => t.priorityLevel === p).length;
    const pct = Math.round((count / tasks.length) * 100);
    return `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.3rem; color: var(--text2); align-items: center;">
          <span style="display: inline-flex; align-items: center; gap: 0.25rem;">${labels[p]}</span>
          <span>${count} (${pct}%)</span>
        </div>
        <div style="height: 6px; background: var(--glass-b); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; background: ${colors[p]}; width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ─── Reset Logic ─── */
function showResetModal() {
  const modal = document.getElementById('resetModal');
  if (modal) modal.style.display = 'flex';
}

function closeResetModal() {
  const modal = document.getElementById('resetModal');
  if (modal) modal.style.display = 'none';
}

function performReset() {
  resetAllData();
  closeResetModal();
  showToast('🗑️ All data has been reset.', 'info');
  setTimeout(() => window.location.href = 'index.html', 1000);
}

/* ─── Helpers ─── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ═══════════════════════════════════════════════
   PROFILE ACHIEVEMENTS SECTION
   ═══════════════════════════════════════════════ */
function renderProfileAchievements() {
  const container = document.getElementById('profileAchievements');
  if (!container) return;

  // Get achievements from features.js
  const ACHIEVEMENTS = [
    { id: 'first_subject',  icon: 'book-open', title: 'First Step',       desc: 'Added your first subject' },
    { id: 'first_complete', icon: 'check-circle', title: 'Getting Started',  desc: 'Completed your first task' },
    { id: 'streak_3',       icon: 'flame', title: '3-Day Streak',     desc: 'Studied 3 days in a row' },
    { id: 'streak_7',       icon: 'trophy', title: 'Week Warrior',     desc: 'Studied 7 days in a row' },
    { id: 'streak_30',      icon: 'gem', title: '30-Day Legend',    desc: 'Studied 30 days in a row' },
    { id: 'hours_10',       icon: 'clock', title: '10 Hours Studied', desc: 'Logged 10 total study hours' },
    { id: 'hours_50',       icon: 'graduation-cap', title: 'Study Marathon',   desc: 'Logged 50 total study hours' },
    { id: 'level_5',        icon: 'star', title: 'Rising Scholar',   desc: 'Reached Level 5' },
    { id: 'level_10',       icon: 'sparkles', title: 'Master Scholar',   desc: 'Reached Level 10' },
    { id: 'tasks_10',       icon: 'target', title: 'Goal Crusher',     desc: 'Completed 10 tasks' },
    { id: 'tasks_50',       icon: 'rocket', title: 'Unstoppable',      desc: 'Completed 50 tasks' },
    { id: 'subjects_5',     icon: 'library', title: 'Multitasker',      desc: 'Added 5 subjects at once' },
    { id: 'night_owl',      icon: 'moon', title: 'Night Owl',        desc: 'Studied after 10 PM' },
    { id: 'early_bird',     icon: 'sunrise', title: 'Early Bird',       desc: 'Studied before 7 AM' },
  ];

  const unlocked = JSON.parse(localStorage.getItem('planora_achievements') || '[]');
  const total = ACHIEVEMENTS.length;
  const count = unlocked.length;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <span style="font-size: 1.5rem; font-weight: 900; color: var(--accent-p)">${count}</span>
        <span style="color: var(--muted); font-size: 0.9rem;"> / ${total} unlocked</span>
      </div>
      <div style="flex: 1; max-width: 300px; margin-left: 2rem;">
        <div style="height: 8px; background: var(--glass-b); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; background: var(--g-main); width: ${Math.round(count/total*100)}%; transition: width 0.5s ease;"></div>
        </div>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem;">
      ${ACHIEVEMENTS.map(a => {
        const done = unlocked.includes(a.id);
        return `
          <div class="profile-ach-badge ${done ? 'unlocked' : 'locked'}" title="${escHtml(a.desc)}">
            <div class="profile-ach-icon">${done ? `<i data-lucide="${a.icon}" class="icon-inline-xl"></i>` : '<i data-lucide="lock" class="icon-inline-xl"></i>'}</div>
            <div class="profile-ach-name">${escHtml(a.title)}</div>
            ${done ? '<div class="profile-ach-check">✓</div>' : ''}
          </div>`;
      }).join('')}
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ═══════════════════════════════════════════════
   WEEKLY STUDY GRAPH
   ═══════════════════════════════════════════════ */
function renderWeeklyGraph() {
  const container = document.getElementById('profileWeeklyGraph');
  if (!container) return;

  const weeklyData = getWeeklyProgress();
  const maxMin = Math.max(...weeklyData.map(d => d.minutes), 60);

  container.innerHTML = `
    <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 100%; gap: 0.5rem; padding: 1rem 0;">
      ${weeklyData.map((d, i) => {
        const heightPct = Math.round((d.minutes / maxMin) * 100);
        const hours = (d.minutes / 60).toFixed(1);
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-c); min-height: 20px;">
              ${d.minutes > 0 ? hours + 'h' : ''}
            </div>
            <div style="width: 100%; background: var(--glass-b); border-radius: 8px 8px 0 0; position: relative; flex: 1; display: flex; align-items: flex-end;">
              <div class="weekly-bar" style="width: 100%; background: var(--g-main); border-radius: 8px 8px 0 0; height: ${Math.max(4, heightPct)}%; animation: slideUp 0.6s ease ${i * 0.1}s backwards;" title="${d.minutes} mins on ${d.label}"></div>
            </div>
            <div style="font-size: 0.7rem; color: var(--muted); font-weight: 600;">${d.label}</div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════════
   STRONGEST & WEAKEST SUBJECTS
   ═══════════════════════════════════════════════ */
function renderStrongestWeakest() {
  const strongestContainer = document.getElementById('strongestSubject');
  const weakestContainer = document.getElementById('weakestSubject');
  if (!strongestContainer || !weakestContainer) return;

  const tasks = getTasks();
  const progress = getAllProgress();

  if (tasks.length === 0) {
    const emptyHtml = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i data-lucide="book-open" style="width:1.5em;height:1.5em;"></i></div>
        <div style="font-size: 0.85rem;">No subjects yet</div>
        <a href="add.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Add Subject</a>
      </div>`;
    strongestContainer.innerHTML = emptyHtml;
    weakestContainer.innerHTML = emptyHtml;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  // Calculate study time per subject
  const subjectTime = {};
  progress.forEach(day => {
    Object.entries(day.blocks || {}).forEach(([subId, minutes]) => {
      subjectTime[subId] = (subjectTime[subId] || 0) + minutes;
    });
  });

  // Find strongest (most time) and weakest (least time, but has some time)
  const sorted = tasks
    .map(t => ({ ...t, minutes: subjectTime[t.id] || 0 }))
    .filter(t => t.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // Render strongest
  if (strongest) {
    const hours = (strongest.minutes / 60).toFixed(1);
    const daysLeft = getDaysLeft(strongest.examDate);
    strongestContainer.innerHTML = `
      <div style="text-align: center; padding: 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.75rem;"><i data-lucide="award" style="width:3rem;height:3rem;stroke-width:1.5"></i></div>
        <div style="font-size: 1.1rem; font-weight: 800; margin-bottom: 0.5rem;">${escHtml(strongest.subject)}</div>
        <div style="font-size: 2rem; font-weight: 900; color: var(--accent-c); margin-bottom: 0.25rem;">${hours}h</div>
        <div style="font-size: 0.8rem; color: var(--muted);">Total study time</div>
        <div style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--glass-b); border-radius: 8px; font-size: 0.8rem;">
          <i data-lucide="calendar" class="icon-inline-sm"></i> ${daysLeft > 0 ? `${daysLeft} days until exam` : 'Exam passed'}
        </div>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
  } else {
    strongestContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i data-lucide="clock" class="icon-inline-xl"></i></div>
        <div style="font-size: 0.85rem;">Start studying to see your strongest subject</div>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
  }

  // Render weakest
  if (weakest && sorted.length > 1) {
    const hours = (weakest.minutes / 60).toFixed(1);
    const daysLeft = getDaysLeft(weakest.examDate);
    const isUrgent = daysLeft <= 7;
    weakestContainer.innerHTML = `
      <div style="text-align: center; padding: 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.75rem;"><i data-lucide="book-open" style="width:3rem;height:3rem;stroke-width:1.5"></i></div>
        <div style="font-size: 1.1rem; font-weight: 800; margin-bottom: 0.5rem;">${escHtml(weakest.subject)}</div>
        <div style="font-size: 2rem; font-weight: 900; color: var(--accent-pk); margin-bottom: 0.25rem;">${hours}h</div>
        <div style="font-size: 0.8rem; color: var(--muted);">Needs more attention</div>
        <div style="margin-top: 1rem; padding: 0.5rem 1rem; background: ${isUrgent ? 'rgba(244,63,94,0.1)' : 'var(--glass-b)'}; border-radius: 8px; font-size: 0.8rem; color: ${isUrgent ? '#f43f5e' : 'var(--text2)'};">
          <i data-lucide="${isUrgent ? 'alert-triangle' : 'calendar'}" class="icon-inline-sm"></i> ${daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
        </div>
        <a href="index.html" class="btn btn-primary btn-sm" style="margin-top: 1rem; width: 100%;">Start Studying</a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
  } else if (sorted.length === 1) {
    weakestContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i data-lucide="plus-circle" class="icon-inline-xl"></i></div>
        <div style="font-size: 0.85rem;">Add more subjects to compare</div>
        <a href="add.html" class="btn btn-outline btn-sm" style="margin-top: 1rem;">Add Subject</a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
  } else {
    weakestContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"><i data-lucide="clock" class="icon-inline-xl"></i></div>
        <div style="font-size: 0.85rem;">Start studying to see which subjects need focus</div>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
  }
}

/* ═══════════════════════════════════════════════
   30-DAY STUDY HEATMAP
   ═══════════════════════════════════════════════ */
function renderProfileHeatmap() {
  const container = document.getElementById('profileHeatmap');
  if (!container) return;

  const progress = getAllProgress();
  const last30Days = [];
  const today = new Date();

  // Collect last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = progress.find(p => p.date === dateStr);

    let totalMinutes = 0;
    if (record) Object.values(record.blocks || {}).forEach(m => totalMinutes += m);

    last30Days.push({ date: dateStr, minutes: totalMinutes });
  }

  // Create heatmap grid
  const grid = last30Days.map((item, idx) => {
    let level = 0;
    if (item.minutes > 0) level = 1;
    if (item.minutes >= 60) level = 2;
    if (item.minutes >= 120) level = 3;
    if (item.minutes >= 180) level = 4;

    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hours = (item.minutes / 60).toFixed(1);

    return `
      <div class="profile-heatmap-cell level-${level}" title="${dateStr}: ${hours}h" style="animation-delay:${idx * 15}ms"></div>`;
  }).join('');

  const totalHours = last30Days.reduce((sum, d) => sum + d.minutes, 0) / 60;
  const activeDays = last30Days.filter(d => d.minutes > 0).length;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div style="display: flex; gap: 2rem;">
        <div>
          <div style="font-size: 0.7rem; color: var(--muted); margin-bottom: 0.25rem;">Total Hours</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: var(--accent-c)">${totalHours.toFixed(1)}h</div>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--muted); margin-bottom: 0.25rem;">Active Days</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: var(--accent-pk)">${activeDays}/30</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: var(--muted);">
        <span>Less</span>
        <div style="width: 12px; height: 12px; background: rgba(99,102,241,0.1); border-radius: 2px;"></div>
        <div style="width: 12px; height: 12px; background: rgba(99,102,241,0.3); border-radius: 2px;"></div>
        <div style="width: 12px; height: 12px; background: rgba(99,102,241,0.5); border-radius: 2px;"></div>
        <div style="width: 12px; height: 12px; background: rgba(99,102,241,0.7); border-radius: 2px;"></div>
        <div style="width: 12px; height: 12px; background: rgba(99,102,241,1); border-radius: 2px;"></div>
        <span>More</span>
      </div>
    </div>
    <div class="profile-heatmap-grid">
      ${grid}
    </div>`;
}
