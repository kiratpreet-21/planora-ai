/* ============================================================
   PLANORA – TIMER.JS | Pomodoro Study Timer Logic
   ============================================================ */
'use strict';

let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;
let currentTimerSubjectId = null;
let currentTimerDuration = 25;

function startStudyTimer(subjectId, subjectName, durationMinutes = 25) {
  currentTimerSubjectId = subjectId;
  currentTimerDuration = durationMinutes;
  timerSeconds = durationMinutes * 60;
  isTimerRunning = true;

  const timerOverlay = document.getElementById('timerOverlay');
  const subjectEl = document.getElementById('timerSubjectName');
  const displayEl = document.getElementById('timerDisplay');
  const toggleBtn = document.getElementById('timerToggleBtn');
  const doneBtn = document.getElementById('timerDoneBtn');

  if (timerOverlay) timerOverlay.style.display = 'flex';
  if (subjectEl) subjectEl.textContent = subjectName;
  if (doneBtn) doneBtn.style.display = 'none';
  if (toggleBtn) toggleBtn.textContent = 'Pause';

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (isTimerRunning) {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        onTimerComplete();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const displayEl = document.getElementById('timerDisplay');
  if (!displayEl) return;

  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  displayEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleTimer() {
  const btn = document.getElementById('timerToggleBtn');
  isTimerRunning = !isTimerRunning;
  if (btn) btn.textContent = isTimerRunning ? 'Pause' : 'Resume';
}

function closeTimer() {
  clearInterval(timerInterval);
  const timerOverlay = document.getElementById('timerOverlay');
  if (timerOverlay) {
    timerOverlay.style.display = 'none';
    timerOverlay.classList.remove('focus-active');
  }
  isTimerRunning = false;
}

function toggleFocusMode() {
  const overlay = document.getElementById('timerOverlay');
  if (overlay) overlay.classList.toggle('focus-active');
}

function onTimerComplete() {
  isTimerRunning = false;
  const toggleBtn = document.getElementById('timerToggleBtn');
  const doneBtn = document.getElementById('timerDoneBtn');
  if (toggleBtn) toggleBtn.style.display = 'none';
  if (doneBtn) doneBtn.style.display = 'block';

  showToast('Time is up! Great session.', 'success');
}

function finishTimer() {
  // Use the actual duration of the session for XP awards
  const leveledUp = saveStudySession(currentTimerSubjectId, currentTimerDuration);
  closeTimer();

  // Refresh dashboard if it's the dashboard page
  if (typeof refreshDashboard === 'function') refreshDashboard();

  if (leveledUp) {
    showToast('🎊 LEVEL UP! You are becoming a master scholar.', 'success');
  } else {
    showToast('Session saved to your progress!', 'success');
  }
}

/* ══════════════════════════════════════════════
   INLINE TIMER (DASHBOARD WIDGET)
   ══════════════════════════════════════════════ */
let twInterval = null;
let twSeconds = 25 * 60;
let isTwRunning = false;

function initInlineTimer() {
  const select = document.getElementById('twSubjectId');
  if (!select) return;
  
  const tasks = getTasks().filter(t => !t.completed);
  const currentVal = select.value;
  select.innerHTML = '<option value="">General Study</option>';
  tasks.forEach(t => {
    select.innerHTML += `<option value="${t.id}">${escHtml(t.subject)}</option>`;
  });
  select.value = currentVal;
  
  updateTwDisplay();
}

function onTwSubjectChange() {
  const select = document.getElementById('twSubjectId');
  const input = document.getElementById('twCustomMinutes');
  if (!select || !input) return;
  
  const subjectId = select.value;
  if (!subjectId) {
    // Reset to generic 25
    input.value = 25;
  } else {
    // Get recommended time from planner
    const tasks = getTasks();
    const task = tasks.find(t => t.id === subjectId);
    if (task) {
      if (typeof calculateDailyStudy === 'function') {
        let mins = Math.round(calculateDailyStudy(task) * 60);
        // Round to nearest 5
        mins = Math.max(5, Math.round(mins / 5) * 5);
        input.value = mins;
      }
    }
  }
  onTwCustomTimeChange();
}

function onTwCustomTimeChange() {
  const input = document.getElementById('twCustomMinutes');
  if (!input) return;
  
  let mins = parseInt(input.value) || 25;
  if (mins < 1) mins = 1;
  if (mins > 300) mins = 300;
  
  twSeconds = mins * 60;
  updateTwDisplay();
}

function updateTwDisplay() {
  const el = document.getElementById('twDisplay');
  if (!el) return;
  const m = Math.floor(twSeconds / 60);
  const s = twSeconds % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleInlineTimer() {
  const btn = document.getElementById('twStartBtn');
  const status = document.getElementById('twStatus');
  const distBtn = document.getElementById('twDistractionBtn');
  
  if (isTwRunning) {
    clearInterval(twInterval);
    isTwRunning = false;
    if (btn) btn.textContent = 'Resume';
    if (status) status.textContent = 'Paused';
  } else {
    isTwRunning = true;
    if (btn) btn.textContent = 'Pause';
    if (status) status.textContent = 'Studying...';
    if (distBtn) distBtn.style.display = 'inline-block';
    
    twInterval = setInterval(() => {
      twSeconds--;
      updateTwDisplay();
      if (twSeconds <= 0) {
        clearInterval(twInterval);
        onTwComplete();
      }
    }, 1000);
  }
}

function resetInlineTimer() {
  clearInterval(twInterval);
  isTwRunning = false;
  twSeconds = 25 * 60;
  
  const btn = document.getElementById('twStartBtn');
  const status = document.getElementById('twStatus');
  const doneBtn = document.getElementById('twDoneBtn');
  const distBtn = document.getElementById('twDistractionBtn');
  
  if (btn) btn.textContent = 'Start';
  if (status) status.textContent = 'Ready';
  if (doneBtn) doneBtn.style.display = 'none';
  if (distBtn) distBtn.style.display = 'none';
  
  updateTwDisplay();
}

function onTwComplete() {
  isTwRunning = false;
  const status = document.getElementById('twStatus');
  const doneBtn = document.getElementById('twDoneBtn');
  const startBtn = document.getElementById('twStartBtn');
  const distBtn = document.getElementById('twDistractionBtn');
  
  if (status) status.textContent = 'Session Complete!';
  if (doneBtn) doneBtn.style.display = 'block';
  if (startBtn) startBtn.style.display = 'none';
  if (distBtn) distBtn.style.display = 'none';
  
  showToast('Quick session complete! Claim your XP.', 'success');
}

function finishInlineTimer() {
  const subjectId = document.getElementById('twSubjectId')?.value || 'general';
  const input = document.getElementById('twCustomMinutes');
  const durationMins = parseInt(input?.value) || 25;

  const leveledUp = saveStudySession(subjectId, durationMins);
  
  resetInlineTimer();
  const startBtn = document.getElementById('twStartBtn');
  if (startBtn) startBtn.style.display = 'inline-block';

  if (typeof refreshDashboard === 'function') refreshDashboard();

  if (leveledUp) {
    showToast('🎊 LEVEL UP! Your focus is incredible.', 'success');
  } else {
    showToast('Quick session saved!', 'success');
  }
}

/* ══════════════════════════════════════════════
   DISTRACTION BUSTER & FOCUS REBOOT LOGIC
   ══════════════════════════════════════════════ */

const DISTRACTION_SOLUTIONS = {
  social: {
    title: `<i data-lucide="smartphone" class="icon-inline"></i> Focus Tip: Phone & Social Media`,
    text: "1. <strong>Out of Sight:</strong> Put your phone in another room or inside a drawer. If it is within arm's reach, your brain spends energy constantly resisting it.<br>2. <strong>Focus Blocker:</strong> Use browser extensions like <i>Forest</i> or <i>Cold Turkey</i> to temporarily block access to attention-grabbing websites.<br>3. <strong>Notification Blackout:</strong> Enable 'Do Not Disturb' or 'Focus Mode' immediately. No badges or alerts are allowed until your break!"
  },
  fatigue: {
    title: `<i data-lucide="battery" class="icon-inline"></i> Focus Tip: Mental Fatigue / Sleepy`,
    text: "1. <strong>Physical Reset:</strong> Stand up immediately and do 10 jumping jacks or roll your shoulders to push fresh oxygen to your brain.<br>2. <strong>Water Therapy:</strong> Drink a full glass of cold water and splash cold water on your face. This stimulates the vagus nerve and triggers alertness.<br>3. <strong>Circadian Reset:</strong> Step outside or look out a window into bright sunlight for 1 minute to tell your brain it is time to focus."
  },
  noise: {
    title: `<i data-lucide="volume-2" class="icon-inline"></i> Focus Tip: Loud Environment`,
    text: "1. <strong>Clinically Proven Noise:</strong> Play <i>Brown Noise</i> or rain sounds. Unlike music, brown noise contains steady low frequencies that quiet an overactive mind.<br>2. <strong>Instrumental Only:</strong> Listen to lo-fi beats, synthwave, or classical tracks. Lyrics activate the language processing centers in your brain, lowering comprehension.<br>3. <strong>Earplug Trick:</strong> Even basic earplugs under noise-canceling headphones can completely isolate distracting ambient chatter."
  },
  fog: {
    title: `<i data-lucide="brain" class="icon-inline"></i> Focus Tip: Stuck / Brain Fog`,
    text: "1. <strong>Micro-Stepping:</strong> Shrink your task! Instead of 'study chapter 4', make your immediate goal: 'write one definition' or 'read one paragraph'. The hardest part is starting.<br>2. <strong>The 5-Minute Rule:</strong> Agree to study for just 5 minutes. If you still want to quit after that, you can. (90% of the time, you will keep going!).<br>3. <strong>Feynman Explanation:</strong> Close your eyes and try to explain what you've studied so far to an empty room in 2 simple sentences."
  }
};

const FOCUS_AFFIRMATIONS = [
  "Focus is a muscle. Every minute you stay focused, you are strengthening your mind.",
  "You do not have to be perfect; you just need to make a tiny start.",
  "One step at a time, one page at a time. Consistent effort creates massive results.",
  "Your future self will thank you for the focus you choose to show today.",
  "Deep study is a form of self-respect. You are investing in your own growth.",
  "Mistakes and struggles are active proof that your brain is learning and growing.",
  "Take a deep breath, clear the mental clutter, and focus on this single moment."
];

let focusTabAwayTimer = null;
let tabAwayCount = 0;

// Listen for tab switching and auto-detect distractions
document.addEventListener('visibilitychange', () => {
  const isTimerActive = isTimerRunning || isTwRunning;
  
  if (document.visibilityState === 'hidden') {
    if (isTimerActive) {
      focusTabAwayTimer = Date.now();
      tabAwayCount++;
    }
  } else if (document.visibilityState === 'visible') {
    if (focusTabAwayTimer) {
      const secondsAway = Math.round((Date.now() - focusTabAwayTimer) / 1000);
      focusTabAwayTimer = null;
      
      // If student was away for 6+ seconds during active study timer
      if (secondsAway >= 6) {
        showToast(`⚠️ Stepped away for ${secondsAway}s? Planora AI is keeping you on track!`, 'warning');
        
        // Auto-pause the running timers to prevent losing real track of focus time
        pauseAllActiveTimers();
        
        // Auto open the distraction buster to help them refocus
        setTimeout(() => {
          openDistractionBuster('auto');
        }, 800);
      }
    }
  }
});

function pauseAllActiveTimers() {
  if (isTimerRunning) {
    isTimerRunning = false;
    const toggleBtn = document.getElementById('timerToggleBtn');
    if (toggleBtn) toggleBtn.textContent = 'Resume';
  }
  if (isTwRunning) {
    clearInterval(twInterval);
    isTwRunning = false;
    const btn = document.getElementById('twStartBtn');
    const status = document.getElementById('twStatus');
    if (btn) btn.textContent = 'Resume';
    if (status) status.textContent = 'Paused';
  }
}

// Opening the Distraction Buster
function openDistractionBuster(source) {
  const modal = document.getElementById('distractionBusterModal');
  if (modal) modal.style.display = 'flex';
  
  // Set random quote / affirmation
  const quoteEl = document.getElementById('distractionQuote');
  if (quoteEl) {
    const idx = Math.floor(Math.random() * FOCUS_AFFIRMATIONS.length);
    quoteEl.innerHTML = `"${FOCUS_AFFIRMATIONS[idx]}"`;
  }
  
  // Reset visibility of solution and stretching box
  const solBox = document.getElementById('distractionSolutionBox');
  if (solBox) solBox.style.display = 'none';
  const stretchBox = document.getElementById('stretchPromptBox');
  if (stretchBox) stretchBox.style.display = 'none';
}

function closeDistractionBuster() {
  const modal = document.getElementById('distractionBusterModal');
  if (modal) modal.style.display = 'none';
  
  // Automatically shut down breathing cycle if running
  if (isBreathingActive) {
    toggleBreathingExercise();
  }
}

function showDistractionSolution(type) {
  const solBox = document.getElementById('distractionSolutionBox');
  const titleEl = document.getElementById('distractionSolutionTitle');
  const textEl = document.getElementById('distractionSolutionText');
  
  if (!solBox || !titleEl || !textEl) return;
  
  const sol = DISTRACTION_SOLUTIONS[type];
  if (sol) {
    titleEl.innerHTML = sol.title;
    textEl.innerHTML = sol.text;
    solBox.style.display = 'block';
    if (typeof refreshIcons === 'function') refreshIcons();
    solBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showStretchPrompt() {
  const box = document.getElementById('stretchPromptBox');
  if (box) {
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Breathing Exercise Cycle Tracker
let breathingInterval = null;
let breathingState = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
let isBreathingActive = false;

function toggleBreathingExercise() {
  const btn = document.getElementById('startBreathingBtn');
  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  const instBox = document.getElementById('breathingInstructionBox');
  
  if (isBreathingActive) {
    // Terminate exercise
    clearInterval(breathingInterval);
    isBreathingActive = false;
    breathingState = 0;
    if (btn) btn.textContent = 'Start Breathing';
    if (text) text.textContent = 'Ready';
    if (circle) {
      circle.style.width = '90px';
      circle.style.height = '90px';
      circle.style.background = 'radial-gradient(circle, var(--accent-p) 0%, rgba(139, 92, 246, 0.4) 100%)';
    }
    if (instBox) instBox.style.display = 'none';
  } else {
    // Initiate exercise
    isBreathingActive = true;
    if (btn) btn.textContent = 'Stop';
    if (instBox) instBox.style.display = 'block';
    
    runBreathingCycle();
    breathingInterval = setInterval(runBreathingCycle, 4000);
  }
}

function runBreathingCycle() {
  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  if (!circle || !text) return;
  
  // 4-phase cycle: Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Hold (4s)
  if (breathingState === 0) {
    text.textContent = 'Inhale...';
    circle.style.width = '130px';
    circle.style.height = '130px';
    circle.style.background = 'radial-gradient(circle, #ec4899 0%, rgba(236, 72, 153, 0.4) 100%)'; // Pink Inhale
    breathingState = 1;
  } else if (breathingState === 1) {
    text.textContent = 'Hold...';
    circle.style.width = '130px';
    circle.style.height = '130px';
    circle.style.background = 'radial-gradient(circle, #8b5cf6 0%, rgba(139, 92, 246, 0.4) 100%)'; // Violet Hold
    breathingState = 2;
  } else if (breathingState === 2) {
    text.textContent = 'Exhale...';
    circle.style.width = '80px';
    circle.style.height = '80px';
    circle.style.background = 'radial-gradient(circle, #14b8a6 0%, rgba(20, 184, 166, 0.4) 100%)'; // Teal Exhale
    breathingState = 3;
  } else if (breathingState === 3) {
    text.textContent = 'Hold...';
    circle.style.width = '80px';
    circle.style.height = '80px';
    circle.style.background = 'radial-gradient(circle, #3b82f6 0%, rgba(59, 130, 246, 0.4) 100%)'; // Blue Hold
    breathingState = 0;
  }
}
