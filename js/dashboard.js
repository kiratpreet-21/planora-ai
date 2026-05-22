/* ============================================================
   PLANORA – DASHBOARD.JS | Dashboard Page Logic
   ============================================================ */
'use strict';

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTheme();
  renderNavbar('dashboard');
  updateGreeting();
  refreshDashboard();
  if (typeof initFeatures === 'function') setTimeout(initFeatures, 300);
});

function refreshDashboard() {
  updateGreeting();
  renderStats();
  renderTodayPlan();
  renderCharts();
  renderAISuggestion();
  renderTasks();
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof initInlineTimer === 'function') initInlineTimer();
  renderAnalyticsCharts();
  if (typeof refreshFeatures === 'function') refreshFeatures();
}

/* ─── Dashboard Tabs ─── */
function switchDashboardTab(tabId) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().replace(' ', '-') === tabId) {
      btn.classList.add('active');
    }
  });

  // Hide all panes, show target
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.style.display = 'none';
    pane.classList.remove('active');
  });

  const target = document.getElementById('tab-' + tabId);
  if (target) {
    target.style.display = 'block';
    // Small timeout to allow display:block to apply before adding active class for animations
    setTimeout(() => target.classList.add('active'), 10);
  }
}

/* ─── Greeting ─── */
function updateGreeting() {
  const user = getUser();
  const h = new Date().getHours();
  let t = 'Morning';
  if (h >= 12 && h < 17) t = 'Afternoon';
  else if (h >= 17 && h < 21) t = 'Evening';
  else if (h >= 21) t = 'Night';

  setText('greetTime', t);
  setText('greetName', user.name || 'Scholar');
  setText('todayDate', new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }));

  // Level & XP
  const level = user.level || 1;
  const xp = user.xp || 0;
  setText('userLevelBadge', `Lvl ${level}`);

  const xpStart = Math.pow(level - 1, 2) * 500;
  const xpEnd = Math.pow(level, 2) * 500;
  const xpInLevel = xp - xpStart;
  const xpRequired = xpEnd - xpStart;
  const pct = Math.min(100, Math.max(0, (xpInLevel / xpRequired) * 100));

  const bar = document.getElementById('xpBarInner');
  if (bar) bar.style.width = `${pct}%`;
  setText('xpText', `${xp} / ${xpEnd} XP`);
}

/* ─── Stats ─── */
function renderStats() {
  const s = getStats();
  setText('statTotal',   s.total);
  setText('statDone',    s.completed);
  setText('statPending', s.pending);
  setText('statStreak',  s.streak);
}

/* ─── Today's Plan ─── */
function renderTodayPlan() {
  const planList = document.getElementById('todayPlanList');
  const totalTimeEl = document.getElementById('totalStudyTime');
  const availableTimeInput = document.getElementById('availableTimeInput');
  if (!planList) return;

  if (availableTimeInput) {
    const savedTime = localStorage.getItem('planora_availableTime');
    if (savedTime) {
      availableTimeInput.value = savedTime;
    }
  }

  const plan = generateDailyPlan();
  if (plan.length === 0) {
    planList.innerHTML = `
      <div class="empty-plan">
        <div class="empty-plan-steps">
          <div class="empty-plan-step">
            <span class="empty-plan-num">1</span>
            <span><a href="add.html" class="empty-plan-link">Add a subject</a> with its exam date</span>
          </div>
          <div class="empty-plan-step">
            <span class="empty-plan-num">2</span>
            <span>Set difficulty &amp; syllabus size</span>
          </div>
          <div class="empty-plan-step">
            <span class="empty-plan-num">3</span>
            <span>AI builds your daily schedule <i data-lucide="sparkles" class="icon-inline"></i></span>
          </div>
        </div>
        <a href="add.html" class="btn btn-primary btn-sm" style="margin-top:.75rem;width:100%;justify-content:center">
          + Add First Subject
        </a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    if (totalTimeEl) totalTimeEl.textContent = '0 hr 0 min';
    return;
  }

  const totalMin = plan.reduce((sum, t) => sum + t.recommendedMinutes, 0);
  if (totalTimeEl) totalTimeEl.textContent = formatMinutes(totalMin);

  planList.innerHTML = plan.map(t => `
    <div class="hl-item">
      <span>${escHtml(t.subject)}</span>
      <span>${t.recommendedTimeStr}</span>
    </div>
  `).join('');
}

/* ─── Charts ─── */
function renderCharts() {
  const stats = getStats();
  const circle = document.getElementById('overallProgressCircle');
  if (circle) {
    const pct = stats.completionPercent || 0;
    circle.style.setProperty('--p', `${pct}%`);
    circle.setAttribute('data-pct', `${pct}%`);
  }

  const barChart = document.getElementById('weeklyBarChart');
  if (barChart) {
    const weeklyData = getWeeklyProgress();
    const maxMin = Math.max(...weeklyData.map(d => d.minutes), 60); // min 60 for scale
    
    barChart.innerHTML = weeklyData.map(d => {
      const h = Math.round((d.minutes / maxMin) * 100);
      return `
        <div class="bar-wrap" title="${d.minutes} mins on ${d.label}">
          <div class="bar" style="height: ${Math.max(4, h)}%"></div>
          <span class="bar-label">${d.label}</span>
        </div>
      `;
    }).join('');
  }
}

/* ─── AI Suggestion ─── */
function renderAISuggestion() {
  const box  = document.getElementById('aiSuggestionBox');
  const text = document.getElementById('aiSuggestionText');
  if (!box || !text) return;

  const suggestions = generateSmartSuggestions();
  const top = suggestions[0];
  if (!top) return;

  text.innerHTML = `<i data-lucide="${top.icon}" class="icon-inline"></i> ${escHtml(top.message)}`;
  box.className = `ai-box fade-in ${top.type || 'info'}`;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ─── Tasks Grid ─── */
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === f);
  });
  renderTasks();
}

function renderTasks() {
  const grid = document.getElementById('tasksGrid');
  if (!grid) return;

  const sort = document.getElementById('sortSelect')?.value || 'priority';
  
  // Get enriched tasks with daily plan recommendations
  let tasks = generateDailyPlan(); 

  // Sort
  if (sort === 'priority') tasks = tasks.sort((a, b) => b.priority - a.priority || b.recommendedMinutes - a.recommendedMinutes);
  else if (sort === 'date') tasks = tasks.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  else if (sort === 'name') tasks = tasks.sort((a, b) => a.subject.localeCompare(b.subject));

  // Filter
  if (currentFilter !== 'all') tasks = tasks.filter(t => t.priorityLevel === currentFilter && !t.completed);

  if (tasks.length === 0) {
    grid.innerHTML = buildEmpty();
    refreshIcons();
    return;
  }

  grid.innerHTML = tasks.map((t, i) => buildCard(t, i)).join('');
  refreshIcons();
}

function buildCard(t, idx) {
  const pl = t.priorityLevel || 'low';
  const days = getDaysLeft(t.examDate);
  const daysLabel = days < 0 ? 'Overdue!' : days === 0 ? 'Today!' : `${days}d left`;
  const urgentClass = days <= 2 ? 'urgent' : '';
  const doneClass  = t.completed ? 'completed' : '';

  return `
    <div class="card task-card priority-${pl} ${doneClass}" style="animation-delay:${idx * .05}s">
      <div class="tc-header">
        <div class="tc-subject ${t.completed ? 'done' : ''}">${escHtml(t.subject)}</div>
        <span class="priority-badge pb-${pl}">${pl}</span>
      </div>
      <div class="tc-meta">
        <span class="tc-chip"><i data-lucide="zap" class="icon-inline"></i> Diff: ${t.difficulty}</span>
        <span class="tc-chip ${urgentClass}"><i data-lucide="calendar" class="icon-inline"></i> ${daysLabel}</span>
      </div>
      <div class="tc-priority-num" style="margin-top:0.25rem">Recommended: <strong>${t.recommendedTimeStr || 'N/A'}</strong></div>
      <div class="tc-actions">
        ${!t.completed ? `
          <button class="btn btn-primary btn-sm" onclick="startStudyTimer('${t.id}', '${escHtml(t.subject)}', ${t.recommendedMinutes || 25})">
            <i data-lucide="play" class="icon-inline"></i> Start Study
          </button>
          <button class="btn btn-outline btn-sm" onclick="toggleDone('${t.id}')">Done</button>
        ` : `
          <div style="color:var(--teal); font-size:0.85rem; font-weight:700;"><i data-lucide="check-circle" class="icon-inline"></i> Completed Today</div>
          <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="removeTask('${t.id}')">Delete</button>
        `}
      </div>
    </div>`;
}

function buildEmpty() {
  const isFiltered = currentFilter !== 'all';

  if (isFiltered) {
    return `
      <div class="empty-state-rich">
        <div class="empty-illustration"><i data-lucide="search" style="width:3rem;height:3rem;"></i></div>
        <div class="empty-title">No ${currentFilter}-priority subjects</div>
        <div class="empty-sub">None of your subjects fall into this priority level right now. Try a different filter or add more subjects.</div>
        <div class="empty-actions">
          <button class="btn btn-outline" onclick="setFilter('all')">Show All</button>
          <a href="add.html" class="btn btn-primary">Add Subject</a>
        </div>
      </div>`;
  }

  return `
    <div class="empty-state-rich empty-state-onboarding">
      <div class="empty-illustration"><i data-lucide="graduation-cap" style="width:3rem;height:3rem;"></i></div>
      <div class="empty-title">Welcome to Planora!</div>
      <div class="empty-sub">Your AI-powered study planner is ready. Add your first subject and Planora will build a smart daily schedule around your exam dates.</div>

      <div class="onboarding-steps">
        <div class="onboarding-step">
          <div class="onboarding-step-icon"><i data-lucide="book-open"></i></div>
          <div class="onboarding-step-text">
            <strong>Add a Subject</strong>
            <span>Name, exam date &amp; difficulty</span>
          </div>
        </div>
        <div class="onboarding-step-arrow">→</div>
        <div class="onboarding-step">
          <div class="onboarding-step-icon"><i data-lucide="bot"></i></div>
          <div class="onboarding-step-text">
            <strong>AI Prioritizes</strong>
            <span>Smart schedule generated</span>
          </div>
        </div>
        <div class="onboarding-step-arrow">→</div>
        <div class="onboarding-step">
          <div class="onboarding-step-icon"><i data-lucide="trophy"></i></div>
          <div class="onboarding-step-text">
            <strong>Study &amp; Level Up</strong>
            <span>Earn XP, build streaks</span>
          </div>
        </div>
      </div>

      <div class="empty-actions">
        <a href="add.html" class="btn btn-primary">
          <i data-lucide="plus" class="icon-inline"></i>
          Add First Subject
        </a>
        <button class="btn btn-outline" onclick="loadDemoData()"><i data-lucide="sparkles" class="icon-inline"></i> Try Demo Data</button>
      </div>

      <p class="empty-tip"><i data-lucide="lightbulb" class="icon-inline"></i> <em>Tip: Use "Try Demo Data" to see how Planora works before adding your own subjects.</em></p>
    </div>`;
}

/* ─── Actions ─── */
function updateAvailableTime(val) {
  if (val && !isNaN(val)) {
    localStorage.setItem('planora_availableTime', val);
  } else {
    localStorage.removeItem('planora_availableTime');
  }
  refreshDashboard();
}

function toggleDone(id) {
  const task = toggleTaskComplete(id);
  if (task?.completed) {
    // Award a "Task Completion Bonus": 30 mins of volume + 300 XP
    const leveledUp = saveStudySession(id, 30);
    updateStreak();
    
    if (leveledUp) {
      showToast('🎊 LEVEL UP! Master scholar status achieved.', 'success');
    } else {
      showToast('🎉 Task complete! +300 XP Awarded 🏆', 'success');
    }
  }
  refreshDashboard();
}

function removeTask(id) {
  deleteTask(id);
  refreshDashboard();
  showToast('🗑️ Subject removed.', 'info');
}

function updateStreak() {
  const user  = getUser();
  const today = new Date().toDateString();
  const prev  = user.lastStudy;

  if (prev === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = user.streak || 0;
  if (prev === yesterday.toDateString()) streak++;
  else streak = 1;

  saveUser({ streak, lastStudy: today });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ═══════════════════════════════════════════════
   ENHANCED ANALYTICS - APEXCHARTS VISUALIZATIONS
   ═══════════════════════════════════════════════ */

function renderAnalyticsCharts() {
  renderWeeklyHoursChart();
  renderSubjectPieChart();
  renderProductivityHeatmap();
  renderStreakGrowthChart();
  renderExamTimeline();
}

/* ─── Weekly Study Hours Chart ─── */
function renderWeeklyHoursChart() {
  const container = document.getElementById('weeklyHoursChart');
  if (!container || typeof ApexCharts === 'undefined') return;

  const weeklyData = getWeeklyProgress();
  
  const options = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      sparkline: { enabled: false },
    },
    colors: ['#22d3ee'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5, colors: ['#22d3ee'] },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1, colorStops: [{ offset: 0, color: '#22d3ee', opacity: 0.4 }, { offset: 100, color: '#22d3ee', opacity: 0 }] } },
    series: [{
      name: 'Study Hours',
      data: weeklyData.map(d => Math.round(d.minutes / 60 * 10) / 10)
    }],
    xaxis: {
      categories: weeklyData.map(d => d.label),
      labels: { style: { colors: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--font)' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { style: { colors: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--font)' } } },
    grid: { borderColor: 'var(--glass-b)', strokeDashArray: 3 },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      y: { formatter: (val) => `${val.toFixed(1)} hrs` }
    }
  };

  container.innerHTML = '';
  const chart = new ApexCharts(container, options);
  chart.render();
}

/* ─── Subject Distribution Pie Chart ─── */
function renderSubjectPieChart() {
  const container = document.getElementById('subjectPieChart');
  if (!container || typeof ApexCharts === 'undefined') return;

  const subjectStats = getSubjectStudyTime();
  
  if (subjectStats.labels.length === 0) {
    container.innerHTML = `
      <div class="chart-empty-state">
        <div class="chart-empty-icon"><i data-lucide="pie-chart" style="width:1.5em;height:1.5em;"></i></div>
        <div class="chart-empty-title">No study time logged yet</div>
        <div class="chart-empty-sub">Start a timer session on any subject to see how your time is distributed.</div>
        <a href="add.html" class="btn btn-primary btn-sm" style="margin-top:.75rem">Add a Subject</a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  const colors = ['#a78bfa', '#22d3ee', '#f472b6', '#818cf8', '#fb7185', '#fbbf24', '#10b981', '#06b6d4'];
  
  const options = {
    chart: { type: 'pie', toolbar: { show: false }, background: 'transparent' },
    colors: colors.slice(0, subjectStats.labels.length),
    labels: subjectStats.labels,
    series: subjectStats.data,
    dataLabels: { enabled: true, style: { fontSize: '12px' } },
    legend: {
      position: 'bottom',
      labels: { colors: 'var(--text2)', useSeriesColors: true }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      y: { formatter: (val) => `${val.toFixed(1)} hrs` }
    },
    responsive: [{ breakpoint: 500, options: { chart: { height: 250 } } }]
  };

  container.innerHTML = '';
  const chart = new ApexCharts(container, options);
  chart.render();
}

/* ─── Productivity Heatmap (30-day) ─── */
function renderProductivityHeatmap() {
  const container = document.getElementById('productivityHeatmap');
  if (!container) return;

  const progress = getAllProgress();
  const last30Days = [];
  const today = new Date();

  // Collect last 30 days of data
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = progress.find(p => p.date === dateStr);

    let totalMinutes = 0;
    if (record) Object.values(record.blocks || {}).forEach(m => totalMinutes += m);

    last30Days.push({ date: dateStr, minutes: totalMinutes, dayNum: i });
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

    return `
      <div class="heatmap-cell level-${level}" title="${dateStr}: ${Math.round(item.minutes / 60 * 10) / 10}h" style="animation-delay:${idx * 20}ms">
        ${level > 0 ? (item.minutes >= 60 ? Math.round(item.minutes / 60) : '<1') : ''}
      </div>
    `;
  }).join('');

  const legend = `
    <div class="heatmap-legend">
      <span>Less</span>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-box" style="background:rgba(99,102,241,0.1)"></div>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-box" style="background:rgba(99,102,241,0.3)"></div>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-box" style="background:rgba(99,102,241,0.5)"></div>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-box" style="background:rgba(99,102,241,0.7)"></div>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-box" style="background:rgba(99,102,241,1)"></div>
      </div>
      <span>More</span>
    </div>
  `;

  container.innerHTML = `<div class="heatmap-grid">${grid}</div>${legend}`;
}

/* ─── Streak Growth Chart ─── */
function renderStreakGrowthChart() {
  const container = document.getElementById('streakGrowthChart');
  if (!container || typeof ApexCharts === 'undefined') return;

  const streakData = generateStreakData();

  const options = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: ['#f472b6'],
    dataLabels: { enabled: false },
    series: [{
      name: 'Streak',
      data: streakData.data
    }],
    xaxis: {
      categories: streakData.labels,
      labels: { style: { colors: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--font)' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { style: { colors: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--font)' } } },
    grid: { borderColor: 'var(--glass-b)', strokeDashArray: 3 },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val} day streak` }
    },
    states: {
      hover: { filter: { type: 'darken', value: 0.15 } }
    }
  };

  container.innerHTML = '';
  const chart = new ApexCharts(container, options);
  chart.render();
}

/* ─── Exam Countdown Timeline ─── */
function renderExamTimeline() {
  const container = document.getElementById('examTimelineContainer');
  if (!container) return;

  const tasks = getTasks().filter(t => !t.completed).sort((a, b) => new Date(a.examDate) - new Date(b.examDate)).slice(0, 5);

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="chart-empty-state">
        <div class="chart-empty-icon"><i data-lucide="calendar" style="width:1.5em;height:1.5em;"></i></div>
        <div class="chart-empty-title">No upcoming exams</div>
        <div class="chart-empty-sub">Add subjects with exam dates and they'll appear here as a countdown timeline.</div>
        <a href="add.html" class="btn btn-primary btn-sm" style="margin-top:.75rem">Add Exam Date</a>
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  const timeline = tasks.map(task => {
    const daysLeft = getDaysLeft(task.examDate);
    const isUrgent = daysLeft <= 7;
    const urgentClass = isUrgent ? 'urgent' : '';
    const countdownText = daysLeft <= 0 
      ? `<i data-lucide="alert-circle" class="icon-inline" style="color:var(--danger)"></i> Overdue` 
      : daysLeft <= 3 
        ? `<i data-lucide="alert-triangle" class="icon-inline" style="color:var(--warning)"></i> ${daysLeft}d left` 
        : `<i data-lucide="calendar" class="icon-inline"></i> ${daysLeft}d`;

    return `
      <div class="timeline-item">
        <div class="timeline-marker" style="border-color:${isUrgent ? '#f43f5e' : '#22d3ee'}">
          ${isUrgent ? '<i data-lucide="clock" class="icon-inline" style="color:var(--danger)"></i>' : '<i data-lucide="book-open" class="icon-inline" style="color:var(--accent-c)"></i>'}
        </div>
        <div class="timeline-content">
          <div class="timeline-subject">${escHtml(task.subject)}</div>
          <div class="timeline-date">${new Date(task.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <span class="timeline-countdown ${urgentClass}">${countdownText}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = timeline;
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ─── Helper: Get Subject Study Time ─── */
function getSubjectStudyTime() {
  const tasks = getTasks();
  const progress = getAllProgress();
  const subjectMap = {};

  progress.forEach(day => {
    Object.entries(day.blocks || {}).forEach(([subId, minutes]) => {
      const task = tasks.find(t => t.id === subId);
      const subjectName = task?.subject || 'Unknown';
      subjectMap[subjectName] = (subjectMap[subjectName] || 0) + minutes / 60; // Convert to hours
    });
  });

  const labels = Object.keys(subjectMap);
  const data = Object.values(subjectMap);

  return { labels, data };
}

/* ─── Helper: Generate Streak Data ─── */
function generateStreakData() {
  const user = getUser();
  const currentStreak = user.streak || 0;
  
  // Generate last 7 weeks of data
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekLabel = `W${Math.ceil((weekStart.getDate()) / 7)}`;
    labels.push(weekLabel);

    // Simulate streak progression (in real app, would track historical streaks)
    const baseStreak = Math.max(0, currentStreak - (6 - i) * 2);
    const variance = Math.random() * 3 - 1;
    data.push(Math.max(0, Math.round(baseStreak + variance)));
  }

  return { labels, data };
}

/* ═══════════════════════════════════════════════
   AI FEATURES INTEGRATION
   ═══════════════════════════════════════════════ */

// Initialize AI Chat on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => initAIChat(), 500);
  populateAIPlannerSubjects();
});

/* ─── AI Study Planner Modal ─── */
function openAIPlanner(subjectId = null) {
  const modal = document.getElementById('aiPlannerModal');
  if (modal) {
    modal.style.display = 'flex';
    populateAIPlannerSubjects();
    if (subjectId) {
      const select = document.getElementById('aiSubjectId');
      if (select) select.value = subjectId;
    }
  }
}

function closeAIPlanner() {
  const m1 = document.getElementById('aiPlannerModal');
  const m2 = document.getElementById('aiPlanResultModal');
  if (m1) m1.style.display = 'none';
  if (m2) m2.style.display = 'none';
}

function populateAIPlannerSubjects() {
  const select = document.getElementById('aiSubjectId');
  if (!select) return;
  const tasks = getTasks().filter(t => !t.completed);
  select.innerHTML = '<option value="">-- Choose a subject --</option>' +
    tasks.map(t => `<option value="${t.id}">${escHtml(t.subject)}</option>`).join('');
}

function generateAIStudyPlan(event) {
  event.preventDefault();

  const subjectId = document.getElementById('aiSubjectId').value;
  const examDate  = document.getElementById('aiExamDate').value;
  const syllabusSize = parseInt(document.getElementById('aiSyllabusSize').value);
  const difficultyEl = document.querySelector('input[name="aiDifficulty"]:checked');
  const difficulty = difficultyEl ? difficultyEl.value : 'medium';

  if (!subjectId || !examDate || !syllabusSize) {
    showToast('⚠️ Please fill all fields', 'warning');
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  if (submitBtn) { submitBtn.textContent = '⏳ Generating...'; submitBtn.disabled = true; }

  setTimeout(() => {
    const plan = generateStudyPlan({ subjectId, examDate, syllabusSize, difficulty });

    if (submitBtn) { submitBtn.textContent = 'Generate My Study Plan'; submitBtn.disabled = false; }

    if (plan.error) {
      showToast(`❌ ${plan.error}`, 'error');
      return;
    }

    displayStudyPlan(plan);
    document.getElementById('aiPlannerModal').style.display = 'none';
    document.getElementById('aiPlanResultModal').style.display = 'flex';
  }, 600);
}

function displayStudyPlan(plan) {
  const content = document.getElementById('aiPlanResultContent');
  if (!content) return;

  const intensityColor = { high: '#f43f5e', medium: '#fbbf24', normal: '#22c55e' }[plan.stats.intensity] || '#a78bfa';

  const statsHtml = `
    <div class="plan-stats-grid">
      <div class="plan-stat-item">
        <div class="plan-stat-val">${plan.stats.totalDays}</div>
        <div class="plan-stat-label">Days Until Exam</div>
      </div>
      <div class="plan-stat-item">
        <div class="plan-stat-val">${plan.stats.totalHoursNeeded}h</div>
        <div class="plan-stat-label">Total Study Hours</div>
      </div>
      <div class="plan-stat-item">
        <div class="plan-stat-val">${plan.stats.avgHoursPerDay}h</div>
        <div class="plan-stat-label">Avg Hours/Day</div>
      </div>
      <div class="plan-stat-item">
        <div class="plan-stat-val" style="color:${intensityColor};text-transform:capitalize">${plan.stats.intensity}</div>
        <div class="plan-stat-label">Study Intensity</div>
      </div>
    </div>`;

  const scheduleHtml = `
    <div class="plan-section">
      <div class="plan-section-title"><i data-lucide="calendar" class="icon-inline"></i> First 7 Days Schedule</div>
      <div class="daily-schedule">
        ${plan.plan.slice(0, 7).map(day => `
          <div class="day-card">
            <div class="day-header">
              <span>${escHtml(day.dayOfWeek)} <span style="font-size:.75rem;color:var(--muted)">${day.date}</span></span>
              <span style="color:var(--accent-c);font-weight:800">${day.plannedHours}h</span>
            </div>
            <div class="day-sessions">
              ${day.sessions.map(s => `
                <div class="session-item">
                  <div class="session-time"><i data-lucide="clock" class="icon-inline"></i> ${escHtml(s.time)}</div>
                  <div class="session-type">${escHtml(s.type)} · ${s.duration}h</div>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  const revisionHtml = `
    <div class="plan-section">
      <div class="plan-section-title"><i data-lucide="refresh-cw" class="icon-inline"></i> Revision Strategy</div>
      <div class="plan-revision-grid">
        <div class="plan-revision-item">
          <div class="plan-revision-label">Approach</div>
          <div class="plan-revision-val">${plan.revision.strategy === 'intensive-quick-fire' ? '<i data-lucide="zap" class="icon-inline"></i> Intensive Quick-Fire' : '<i data-lucide="repeat" class="icon-inline"></i> Spaced Repetition'}</div>
        </div>
        <div class="plan-revision-item">
          <div class="plan-revision-label">Revision Starts</div>
          <div class="plan-revision-val">${new Date(plan.revision.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
        <div class="plan-revision-item">
          <div class="plan-revision-label">Revision Days</div>
          <div class="plan-revision-val">${plan.revision.days} days</div>
        </div>
      </div>
      <div class="plan-focus-areas">
        ${plan.revision.focusAreas.map(a => `<span class="plan-focus-tag">${escHtml(a)}</span>`).join('')}
      </div>
    </div>`;

  const breaksHtml = `
    <div class="plan-section">
      <div class="plan-section-title"><i data-lucide="coffee" class="icon-inline"></i> Break & Wellness Plan</div>
      <div class="plan-pomodoro-info">
        <span><i data-lucide="clock" class="icon-inline"></i> <strong>${plan.breaks.pomodoroStyle.focusMinutes} min</strong> focus</span>
        <span><i data-lucide="coffee" class="icon-inline"></i> <strong>${plan.breaks.pomodoroStyle.breakMinutes} min</strong> break</span>
        <span><i data-lucide="repeat" class="icon-inline"></i> <strong>${plan.breaks.pomodoroStyle.sessionsPerDay}</strong> sessions/day</span>
      </div>
      <ul class="plan-recommendations">
        ${plan.breaks.recommendations.map(r => `<li><i data-lucide="check" class="icon-inline"></i> ${escHtml(r)}</li>`).join('')}
      </ul>
    </div>`;

  content.innerHTML = statsHtml + scheduleHtml + revisionHtml + breaksHtml;
  if (typeof refreshIcons === 'function') refreshIcons();
}

function acceptAIPlan() {
  closeAIPlanner();
  showToast('🎯 Study plan saved! Start your first session now.', 'success');
  refreshDashboard();
}

/* ─── AI Chat Widget ─── */

// Track current quiz state
let _currentQuiz = null;

function initAIChat() {
  const widget = document.getElementById('aiChatWidget');
  const fab    = document.getElementById('aiChatFab');
  if (!widget || !fab) return;

  widget.style.display = 'flex';
  fab.style.display = 'none';
}

function toggleChatWidget(e) {
  if (e) e.stopPropagation();
  const widget = document.getElementById('aiChatWidget');
  const fab    = document.getElementById('aiChatFab');
  if (!widget) return;

  const isMinimized = widget.classList.contains('minimized');
  if (isMinimized) {
    widget.classList.remove('minimized');
    widget.style.display = 'flex';
    if (fab) fab.style.display = 'none';
  } else {
    widget.classList.add('minimized');
    if (fab) fab.style.display = 'flex';
  }
}

function clearAIChat() {
  clearChatHistory();
  _currentQuiz = null;
  const container = document.getElementById('aiChatMessages');
  if (!container) return;
  container.innerHTML = `
    <div class="ai-message">
      <div class="ai-message-content">
        <p><i data-lucide="trash-2" class="icon-inline"></i> Chat cleared! I'm ready to help again.</p>
        <p>What would you like to do?</p>
      </div>
      <div class="ai-message-time">Just now</div>
    </div>`;
  if (typeof refreshIcons === 'function') refreshIcons();
  resetChatSuggestions();
  showToast('Chat history cleared', 'info');
}

function resetChatSuggestions() {
  const container = document.getElementById('aiChatSuggestions');
  if (!container) return;
  const defaults = [
    { label: '<i data-lucide="calendar" class="icon-inline"></i> Create Plan',    msg: 'Create a study plan' },
    { label: '<i data-lucide="bar-chart-2" class="icon-inline"></i> My Progress',    msg: 'Analyze my progress' },
    { label: '<i data-lucide="help-circle" class="icon-inline"></i> Quiz Me',        msg: 'Give me a quiz' },
    { label: '<i data-lucide="clock" class="icon-inline"></i> Pomodoro',       msg: 'Start Pomodoro' },
    { label: '<i data-lucide="book-open" class="icon-inline"></i> Explain Topic',  msg: 'Explain spaced repetition' },
    { label: '<i data-lucide="file-text" class="icon-inline"></i> Summarize',      msg: 'Summarize my subjects' },
  ];
  container.innerHTML = defaults.map(d =>
    `<button class="ai-suggestion-btn" data-msg="${escHtml(d.msg)}" onclick="sendChatMessage(this.dataset.msg)">${d.label}</button>`
  ).join('');
  container.style.display = 'grid';
  if (typeof refreshIcons === 'function') refreshIcons();
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('aiChatInput');
  const message = input.value.trim();
  if (!message) return;
  sendChatMessage(message);
  input.value = '';
}

function sendChatMessage(userMessage) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  // If a quiz is active, treat this as an answer
  if (_currentQuiz) {
    const quiz = _currentQuiz;
    _currentQuiz = null;

    // Disable all quiz option buttons so user can't answer twice
    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.msg === userMessage) {
        btn.style.borderColor = 'var(--accent-p)';
        btn.style.background = 'rgba(167,139,250,0.15)';
      }
    });

    // Unescape HTML entities that may have been introduced by escHtml in data attributes
    const rawAnswer = unescHtml(userMessage);

    appendUserMessage(container, rawAnswer);
    showTypingIndicator(container);

    setTimeout(() => {
      removeTypingIndicator(container);
      const response = checkQuizAnswer(rawAnswer, quiz.a);
      appendAIMessage(container, response);
      if (response.suggestions) updateChatSuggestions(response.suggestions);
    }, 500);
    return;
  }

  saveChatMessage('user', userMessage);
  appendUserMessage(container, userMessage);

  // Hide suggestions while typing
  const suggestionsDiv = document.getElementById('aiChatSuggestions');
  if (suggestionsDiv) suggestionsDiv.style.display = 'none';

  showTypingIndicator(container);

  setTimeout(() => {
    removeTypingIndicator(container);
    const response = getChatResponse(userMessage);
    saveChatMessage('assistant', response.text);

    // Handle special actions
    if (response.action === 'openPlanner') {
      openAIPlanner();
    } else if (response.action === 'startTimer') {
      const tasks = (typeof getTasks === 'function') ? getTasks().filter(t => !t.completed) : [];
      if (tasks.length > 0 && typeof startStudyTimer === 'function') {
        startStudyTimer(tasks[0].id, tasks[0].subject, tasks[0].recommendedMinutes || 25);
      } else if (typeof startStudyTimer === 'function') {
        startStudyTimer('custom', 'Focus Session', 25);
      }
    }

    appendAIMessage(container, response);

    // If it's a quiz, store state and show options as suggestions
    if (response.isQuiz && response.quiz) {
      _currentQuiz = response.quiz;
      updateChatSuggestions(response.quiz.shuffledOptions);
    } else if (response.suggestions) {
      updateChatSuggestions(response.suggestions);
    }
  }, 600 + Math.random() * 400);
}

function appendUserMessage(container, text) {
  const el = document.createElement('div');
  el.className = 'ai-message user-message';
  el.innerHTML = `
    <div class="ai-message-content">${escHtml(text)}</div>
    <div class="ai-message-time">${getTimeLabel()}</div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function appendAIMessage(container, response) {
  const el = document.createElement('div');
  el.className = 'ai-message';
  el.innerHTML = `
    <div class="ai-message-content"></div>
    <div class="ai-message-time">${getTimeLabel()}</div>`;
  container.appendChild(el);
  
  const contentEl = el.querySelector('.ai-message-content');
  let i = 0;
  let htmlString = response.text;
  let currentHtml = "";

  function typeNext() {
    if (i >= htmlString.length) {
      if (typeof refreshIcons === 'function') refreshIcons();
      container.scrollTop = container.scrollHeight;
      return;
    }

    let char = htmlString.charAt(i);
    let delay = 10;

    if (char === '<') {
      let tagEnd = htmlString.indexOf('>', i);
      if (tagEnd !== -1) {
        currentHtml += htmlString.substring(i, tagEnd + 1);
        i = tagEnd + 1;
        contentEl.innerHTML = currentHtml;
        typeNext();
        return;
      }
    } else if (char === '&') {
      let entityEnd = htmlString.indexOf(';', i);
      if (entityEnd !== -1 && entityEnd - i < 10) {
        currentHtml += htmlString.substring(i, entityEnd + 1);
        i = entityEnd + 1;
        contentEl.innerHTML = currentHtml;
        setTimeout(typeNext, delay);
        return;
      }
    }

    currentHtml += char;
    i++;
    contentEl.innerHTML = currentHtml;
    container.scrollTop = container.scrollHeight;

    if (char === '.' || char === '?' || char === '!') delay = 150;
    else if (char === ',') delay = 50;

    setTimeout(typeNext, delay);
  }

  typeNext();
}

function showTypingIndicator(container) {
  const el = document.createElement('div');
  el.className = 'ai-message ai-typing-indicator';
  el.id = 'aiTypingIndicator';
  el.innerHTML = `
    <div class="ai-message-content typing-dots">
      <span></span><span></span><span></span>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(container) {
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
}

function getTimeLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateChatSuggestions(suggestions) {
  const container = document.getElementById('aiChatSuggestions');
  if (!container) return;
  if (Array.isArray(suggestions) && suggestions.length > 0) {
    // Store suggestions on the buttons as data attributes to avoid escaping issues
    container.innerHTML = suggestions.map((s, i) =>
      `<button class="ai-suggestion-btn" data-msg="${escHtml(s)}" onclick="sendChatMessage(this.dataset.msg)">${escHtml(s)}</button>`
    ).join('');
    container.style.display = 'grid';
  } else {
    container.style.display = 'none';
  }
}

/* ─── AI Suggestion Box (dashboard top) ─── */
// renderAISuggestion is defined earlier in this file
