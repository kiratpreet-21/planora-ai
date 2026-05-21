/* ============================================================
   PLANORA – CALENDAR.JS | Monthly Calendar View
   ============================================================ */
'use strict';

let calendarDate = new Date();
let selectedDay = null;

/* ─── Main Calendar Render ─── */
function renderCalendar() {
  const year  = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  // Header
  const title = document.getElementById('calendarMonthTitle');
  if (title) {
    title.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Build grid
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const today = new Date();
  today.setHours(0,0,0,0);

  // Build exam date lookup from tasks
  const tasks = getTasks();
  const examDates = {};
  tasks.forEach(t => {
    if (t.examDate) {
      const key = t.examDate; // YYYY-MM-DD
      if (!examDates[key]) examDates[key] = [];
      examDates[key].push(t);
    }
  });

  let html = '';
  // Show 6 rows usually covers all months (42 cells)
  let totalCells = 42; 

  for (let i = 0; i < totalCells; i++) {
    let dayNum, dateObj, isCurrentMonth = true;

    if (i < firstDay) {
      dayNum = daysInPrev - firstDay + i + 1;
      dateObj = new Date(year, month - 1, dayNum);
      isCurrentMonth = false;
    } else if (i >= firstDay + daysInMonth) {
      dayNum = i - (firstDay + daysInMonth) + 1;
      dateObj = new Date(year, month + 1, dayNum);
      isCurrentMonth = false;
    } else {
      dayNum = i - firstDay + 1;
      dateObj = new Date(year, month, dayNum);
    }

    const dateKey = formatDateKey(dateObj);
    const isToday = dateKey === formatDateKey(today);
    const examsOnDay = examDates[dateKey] || [];
    const isSelected = selectedDay === dateKey;

    let examLevel = '';
    if (examsOnDay.length > 0) {
      const examDateObj = new Date(dateKey + 'T00:00:00');
      const diffTime = examDateObj - today;
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        examLevel = 'exam-past';
      } else {
        // Use the highest priority level among exams on this day
        let highestLevel = 'low';
        examsOnDay.forEach(t => {
          const priority = calculatePriority(t.difficulty, t.examDate, t.workAmount);
          const level = getPriorityLevel(priority);
          if (level === 'high') highestLevel = 'high';
          else if (level === 'medium' && highestLevel !== 'high') highestLevel = 'medium';
        });

        if (highestLevel === 'high') {
          examLevel = 'exam-urgent';
        } else if (highestLevel === 'medium') {
          examLevel = 'exam-soon';
        } else {
          examLevel = 'exam-far';
        }
      }
    }

    let classes = 'cal-day';
    if (!isCurrentMonth) classes += ' other-month';
    if (isToday)         classes += ' today';
    if (examsOnDay.length > 0) classes += ' has-exam';
    if (examLevel)       classes += ' ' + examLevel;
    if (isSelected)      classes += ' selected';

    const dots = examsOnDay.map(s => 
      `<span class="cal-dot" style="background:${s.color}"></span>`
    ).join('');

    html += `
      <div class="${classes}" onclick="selectCalendarDay('${dateKey}')">
        <span class="cal-num">${dayNum}</span>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }

  grid.innerHTML = html;
}

function selectCalendarDay(dateKey) {
  selectedDay = dateKey;
  renderCalendar(); 

  const infoEl = document.getElementById('selectedDayInfo');
  if (!infoEl) return;

  const date = new Date(dateKey + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  // Find exams on this day
  const tasks = getTasks();
  const examsOnDay = tasks.filter(t => t.examDate === dateKey);

  let html = `<div class="cal-info-header">${dateStr}</div>`;

  if (examsOnDay.length > 0) {
    html += examsOnDay.map(t => `
      <div class="cal-info-item">
        <span class="cal-info-dot" style="background:${t.color}"></span>
        <span class="cal-info-text"><strong>${escHtml(t.subject)}</strong> Exam <i data-lucide="graduation-cap" class="icon-inline"></i></span>
      </div>`).join('');
  } else {
    html += `<div class="cal-info-empty">No exams scheduled.</div>`;
  }

  infoEl.innerHTML = html;
  if (typeof refreshIcons === 'function') refreshIcons();
}

function changeMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  selectedDay = null;
  renderCalendar();
  
  const infoEl = document.getElementById('selectedDayInfo');
  if (infoEl) infoEl.innerHTML = `<div class="cal-info-empty">Select a date</div>`;
}

/* ─── Helpers ─── */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
