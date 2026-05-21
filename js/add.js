/* ============================================================
   PLANORA – ADD.JS | Add Task Page Logic
   ============================================================ */
'use strict';

const COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#818cf8'];
let selectedColor = COLORS[0];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  initTheme();
  renderNavbar('add');
  buildColorPicker();
  buildDiffPips(3);
  setMinDate();
  livePreview();
});

/* ─── Color picker ─── */
function buildColorPicker() {
  const wrap = document.getElementById('colorPicker');
  if (!wrap) return;
  wrap.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.35rem';
  wrap.innerHTML = COLORS.map(c => `
    <button type="button"
      data-color="${c}"
      onclick="pickColor('${c}')"
      style="width:28px;height:28px;border-radius:50%;background:${c};border:3px solid transparent;
             transition:all .15s;flex-shrink:0;cursor:pointer;${c === selectedColor ? 'border-color:#fff;transform:scale(1.2)' : ''}"
      aria-label="Color ${c}">
    </button>`).join('');
}

function pickColor(c) {
  selectedColor = c;
  document.getElementById('selectedColor').value = c;
  buildColorPicker();
  livePreview();
}

/* ─── Difficulty pips ─── */
function buildDiffPips(val) {
  const wrap = document.getElementById('diffPips');
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<div class="diff-pip ${i < val ? 'active' : ''}"></div>`
  ).join('');
}

function updateDiff(val) {
  document.getElementById('diffVal').textContent = val;
  buildDiffPips(parseInt(val));
  livePreview();
}

/* ─── Min date ─── */
function setMinDate() {
  const inp = document.getElementById('examDate');
  if (inp) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    inp.min = d.toISOString().split('T')[0];
  }
}

/* ─── Live preview ─── */
function livePreview() {
  const name = document.getElementById('subjectName')?.value?.trim() || '';
  const diff = parseInt(document.getElementById('difficulty')?.value) || 3;
  const date = document.getElementById('examDate')?.value || '';
  const work = parseFloat(document.getElementById('workAmount')?.value) || 0;
  
  const prevSubj = document.getElementById('prevSubject');
  const prevPri = document.getElementById('prevPriority');
  const prevMeta = document.getElementById('prevMeta');
  const prevBadge = document.getElementById('prevBadge');
  
  if (prevSubj) prevSubj.textContent = name || '— enter a name —';
  prevSubj.style.color = selectedColor;

  if (!date) {
    if (prevPri) { prevPri.textContent = '—'; prevPri.className = 'preview-priority-big pl'; }
    if (prevMeta) prevMeta.innerHTML = '';
    if (prevBadge) prevBadge.innerHTML = '';
    return;
  }

  const days = getDaysLeft(date);
  const diffMap = { 'easy': 1, 'medium': 3, 'hard': 5 };
  const dVal = diffMap[diff] || diff || 3;
  
  const estWork = work > 0 ? work : dVal * 5;
  const hoursPerDay = days > 0 ? (estWork / days).toFixed(1) : estWork;
  
  let metaHTML = `
    <span class="tc-chip"><i data-lucide="zap" class="icon-inline"></i> Diff: ${diff}/5</span>
    <span class="tc-chip"><i data-lucide="calendar" class="icon-inline"></i> ${days > 0 ? days + 'd left' : days === 0 ? 'Today!' : 'Overdue!'}</span>
    <span class="tc-chip"><i data-lucide="calendar" class="icon-inline"></i> ${formatDate(date)}</span>`;

  if (work > 0) {
    metaHTML += `<span class="tc-chip"><i data-lucide="book-open" class="icon-inline"></i> ${work} hrs</span>`;
  } else {
    metaHTML += `<span class="tc-chip"><i data-lucide="bot" class="icon-inline"></i> Est. ${estWork} hrs</span>`;
  }
  
  metaHTML += `<span class="tc-chip" style="background:var(--c-primary-alpha); color:var(--c-primary); border: 1px solid var(--c-primary); font-weight: bold;"><i data-lucide="clock" class="icon-inline"></i> ~${hoursPerDay}h/d</span>`;

  const priority = calculatePriority(diff, date, work);
  const level = getPriorityLevel(priority);
  const cls = level === 'high' ? 'ph' : level === 'medium' ? 'pm' : 'pl';

  if (prevPri) {
    prevPri.textContent = priority >= 999 ? '∞' : priority.toFixed(3);
    prevPri.className = `preview-priority-big ${cls}`;
  }
  if (prevMeta) {
    prevMeta.innerHTML = metaHTML;
  }
  if (prevBadge) {
    prevBadge.innerHTML = `<span class="priority-badge pb-${level}" style="display:inline-block">${level.toUpperCase()}</span>`;
  }
  if (typeof refreshIcons === 'function') refreshIcons();
}

/* ─── Form submit ─── */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();

    const subject = document.getElementById('subjectName')?.value?.trim();
    const diff = parseInt(document.getElementById('difficulty')?.value) || 3;
    const examDate = document.getElementById('examDate')?.value;
    const workAmount = parseFloat(document.getElementById('workAmount')?.value) || 0;

    let valid = true;
    if (!subject || subject.length < 2) { showErr('subjectErr', 'Subject name must be at least 2 characters.'); valid = false; }
    if (!examDate) { showErr('dateErr', 'Please pick an exam date.'); valid = false; }
    if (!valid) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0);
    if (exam <= today) { showErr('dateErr', 'Exam date must be in the future.'); return; }

    const priority = calculatePriority(diff, examDate, workAmount);
    const level = getPriorityLevel(priority);

    const task = {
      id: Date.now().toString(),
      subject,
      difficulty: diff,
      examDate,
      workAmount,
      color: selectedColor,
      priority,
      priorityLevel: level,
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
    };

    addTask(task);
    showToast(`✅ "${subject}" added! Priority: ${level.toUpperCase()}`, 'success');
    setTimeout(() => window.location.href = 'index.html', 700);
  });
});

function clearErrors() {
  ['subjectErr', 'diffErr', 'dateErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
