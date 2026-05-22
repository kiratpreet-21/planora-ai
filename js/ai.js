/* ============================================================
   PLANORA – AI.JS | Intelligent AI Engine
   AI Study Planner, Smart Suggestions, and Chat Assistant
   ============================================================ */
'use strict';

/* ═════════════════════════════════════════════
   AI STUDY PLANNER - Generate Smart Schedules
   ═════════════════════════════════════════════ */

/**
 * Generate a comprehensive study plan based on exam details
 */
function generateStudyPlan(params) {
  const { examDate, syllabusSize, difficulty, subjectId } = params;

  const daysLeft = getDaysLeft(examDate);
  if (daysLeft <= 0) return { error: 'Exam date must be in the future' };

  const difficultyScore = { easy: 1, medium: 2.5, hard: 4 }[difficulty] || 2;
  const totalHoursNeeded = Math.round(syllabusSize * difficultyScore);
  const hoursPerDay = Math.max(1, Math.ceil((totalHoursNeeded / daysLeft) * 1.2));

  const dailySchedule = [];
  let remainingHours = totalHoursNeeded;

  for (let i = 0; i < Math.min(daysLeft, 30); i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    let dailyHours = Math.min(hoursPerDay, remainingHours);
    if (i >= daysLeft - 7) dailyHours = Math.min(hoursPerDay * 1.3, remainingHours);
    dailyHours = Math.round(dailyHours * 10) / 10;

    const sessions = generateStudySessions(dailyHours);

    dailySchedule.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      plannedHours: dailyHours,
      sessions,
      breakEvery: 50,
      focusHours: getOptimalStudyHours(date)
    });

    remainingHours = Math.max(0, remainingHours - dailyHours);
  }

  return {
    plan: dailySchedule,
    revision: generateRevisionPlan(examDate, daysLeft),
    breaks: generateBreakRecommendations(daysLeft, difficulty),
    stats: {
      totalHoursNeeded,
      totalDays: daysLeft,
      avgHoursPerDay: Math.round(hoursPerDay * 10) / 10,
      difficulty,
      intensity: daysLeft <= 14 ? 'high' : daysLeft <= 30 ? 'medium' : 'normal'
    }
  };
}

/** Break daily hours into time-slotted sessions */
function generateStudySessions(hours) {
  const sessions = [];
  let remaining = hours;

  const slots = [
    { time: '07:00 – 10:00', max: 3, type: 'Deep Focus', intensity: 'high' },
    { time: '10:15 – 11:00', max: 0.75, type: 'Review & Recap', intensity: 'low' },
    { time: '11:00 – 12:30', max: 1.5, type: 'Problem Solving', intensity: 'high' },
    { time: '14:00 – 17:00', max: 3, type: 'Concept Building', intensity: 'medium' },
    { time: '19:00 – 21:00', max: 2, type: 'Revision & Practice', intensity: 'medium' }
  ];

  for (const slot of slots) {
    if (remaining <= 0) break;
    const dur = Math.min(slot.max, remaining);
    sessions.push({ time: slot.time, duration: Math.round(dur * 10) / 10, type: slot.type, intensity: slot.intensity });
    remaining -= dur;
  }

  return sessions;
}

/** Generate a spaced-repetition revision plan */
function generateRevisionPlan(examDate, daysLeft) {
  const revisionDays = Math.max(3, Math.ceil(daysLeft * 0.2));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + (daysLeft - revisionDays));

  return {
    startDate: startDate.toISOString().split('T')[0],
    days: revisionDays,
    strategy: daysLeft <= 7 ? 'intensive-quick-fire' : 'spaced-repetition',
    focusAreas: ['Previous Year Papers', 'Mock Tests', 'Weak Topics', 'Formulas & Definitions'],
    schedule: Array.from({ length: revisionDays }, (_, i) => ({
      day: i + 1,
      focus: ['Previous Papers (60%)', 'Mock Tests (20%)', 'Weak Topics (15%)', 'Summary & Formulas (5%)'][i % 4],
      timeNeeded: 4 + Math.floor(Math.random() * 2),
      priority: i < 2 ? 'high' : 'medium'
    }))
  };
}

/** Smart break recommendations */
function generateBreakRecommendations(daysLeft, difficulty) {
  const focusMinutes = { easy: 45, medium: 50, hard: 55 }[difficulty] || 50;
  const breakMinutes = Math.ceil(focusMinutes * 0.2);

  return {
    pomodoroStyle: { focusMinutes, breakMinutes, sessionsPerDay: 5 },
    activityBreaks: [
      { activity: 'Walk / Stretch', minutes: 5, timing: 'after 50 min' },
      { activity: 'Drink Water + Snack', minutes: 5, timing: 'after 100 min' },
      { activity: 'Light Exercise / Yoga', minutes: 10, timing: 'after lunch' },
      { activity: 'Meditation / Breathing', minutes: 5, timing: 'before bed' }
    ],
    recommendations: [
      `Study in ${focusMinutes}-minute focused blocks, then take a ${breakMinutes}-minute break`,
      'Hydrate every 30 minutes — dehydration reduces focus by up to 20%',
      'Change your study location every 2 hours to reset attention',
      'Get 7–8 hours of sleep — memory consolidation happens during sleep',
      `Your peak focus window: ${getOptimalStudyHours(new Date())}`,
      daysLeft <= 7 ? '⚠️ Exam is close — prioritize revision over new material' : 'Use active recall instead of passive re-reading'
    ]
  };
}

/** Get optimal study time label based on current hour */
function getOptimalStudyHours(date) {
  const h = date.getHours();
  if (h >= 6 && h < 10) return 'Morning (Peak Focus)';
  if (h >= 10 && h < 12) return 'Late Morning (Good Focus)';
  if (h >= 14 && h < 17) return 'Afternoon (Moderate)';
  if (h >= 19 && h < 21) return 'Evening (Good for Revision)';
  return 'Night (Use for Light Review)';
}

/* ═════════════════════════════════════════════
   AI SMART SUGGESTIONS - Context-Aware Insights
   ═════════════════════════════════════════════ */

function generateSmartSuggestions() {
  const suggestions = [];
  const tasks = getTasks();
  const stats = getStats();
  const user = getUser();
  const progress = getAllProgress();
  const subjectAnalysis = analyzeSubjectPerformance(tasks, progress);

  if (subjectAnalysis.behind.length > 0) {
    const behind = subjectAnalysis.behind[0];
    suggestions.push({
      type: 'warning', icon: 'alert-triangle', title: 'Behind Schedule',
      message: `You're behind in ${behind.subject}. Consider increasing daily study time.`,
      action: { label: 'Boost Study Plan', fn: () => openAIPlanner(behind.id) },
      priority: 'high'
    });
  }

  if (subjectAnalysis.imbalance > 0.4 && subjectAnalysis.needsMore[0]) {
    const rec = subjectAnalysis.needsMore[0];
    suggestions.push({
      type: 'info', icon: 'scale', title: 'Better Balance',
      message: `Study ${rec.subject} today for more balanced preparation.`,
      priority: 'medium'
    });
  }

  const optimalTime = detectOptimalStudyTime(progress);
  if (optimalTime) {
    suggestions.push({
      type: 'success', icon: 'star', title: 'Your Best Study Time',
      message: `You perform best at ${optimalTime}. Schedule important topics then.`,
      priority: 'low'
    });
  }

  if (user.streak >= 3 && user.streak < 7) {
    suggestions.push({
      type: 'success', icon: 'flame', title: 'Keep the Streak Going!',
      message: `You have a ${user.streak}-day streak! One more day to reach a week.`,
      priority: 'medium'
    });
  }

  if (stats.total > 0 && stats.completionPercent < 50) {
    suggestions.push({
      type: 'warning', icon: 'clipboard', title: 'Task Completion Low',
      message: `Complete ${Math.ceil(stats.total * 0.5) - stats.completed} more tasks to reach 50%.`,
      priority: 'high'
    });
  }

  const urgentExams = tasks
    .filter(t => !t.completed && getDaysLeft(t.examDate) <= 7 && getDaysLeft(t.examDate) > 0)
    .sort((a, b) => getDaysLeft(a.examDate) - getDaysLeft(b.examDate));

  if (urgentExams.length > 0) {
    suggestions.push({
      type: 'warning', icon: 'clock',
      title: `Exam in ${getDaysLeft(urgentExams[0].examDate)} Days`,
      message: `Focus on ${urgentExams[0].subject} — exam approaching!`,
      priority: 'high'
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'success', icon: 'sparkles', title: 'Looking Good!',
      message: 'You\'re on track. Keep up the great study habits!',
      priority: 'low'
    });
  }

  return suggestions.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
}

function analyzeSubjectPerformance(tasks, progress) {
  const subjectStats = {};
  tasks.forEach(task => {
    subjectStats[task.id] = {
      subject: task.subject, id: task.id, totalMinutes: 0,
      daysLeft: getDaysLeft(task.examDate), difficulty: task.difficulty || 'medium',
      priority: task.priority || 0, completed: task.completed
    };
  });
  progress.forEach(day => {
    Object.entries(day.blocks || {}).forEach(([subId, minutes]) => {
      if (subjectStats[subId]) subjectStats[subId].totalMinutes += minutes;
    });
  });
  const entries = Object.values(subjectStats);
  const behind = entries.filter(s => !s.completed && s.daysLeft <= 14 && s.totalMinutes < 120);
  const needsMore = entries.filter(s => !s.completed && s.totalMinutes < 60).sort((a, b) => a.totalMinutes - b.totalMinutes);
  const totalTime = entries.reduce((sum, s) => sum + s.totalMinutes, 0);
  const idealPerSubject = totalTime / Math.max(1, entries.length);
  const imbalance = entries.length > 0
    ? Math.max(...entries.map(s => Math.abs(s.totalMinutes - idealPerSubject) / Math.max(1, idealPerSubject)))
    : 0;
  return { behind, needsMore, imbalance, all: entries };
}

function detectOptimalStudyTime(progress) {
  const hours = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = progress.find(p => p.date === dateStr);
    if (record) {
      const totalMin = Object.values(record.blocks || {}).reduce((s, m) => s + m, 0);
      const h = d.getHours();
      hours[h] = (hours[h] || 0) + totalMin;
    }
  }
  if (Object.keys(hours).length === 0) return null;
  const maxHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0][0];
  return `${String(maxHour).padStart(2, '0')}:00 – ${String((parseInt(maxHour) + 3) % 24).padStart(2, '0')}:00`;
}

/* ═════════════════════════════════════════════
   AI CHAT ASSISTANT - Interactive Q&A Engine
   ═════════════════════════════════════════════ */

/** Topic knowledge base for explanations */
const TOPIC_KNOWLEDGE = {
  'spaced repetition': {
    title: 'Spaced Repetition',
    body: 'Spaced repetition is a learning technique where you review material at increasing intervals. Instead of cramming, you revisit topics just before you\'re about to forget them. Research shows it can improve long-term retention by up to 200%.',
    tips: ['Use flashcards (Anki is great)', 'Review after 1 day, then 3 days, then 1 week', 'Focus more time on harder material']
  },
  'active recall': {
    title: 'Active Recall',
    body: 'Active recall means testing yourself on material rather than passively re-reading. Close your notes and try to recall key points. This forces your brain to retrieve information, strengthening memory pathways.',
    tips: ['Use the Feynman Technique — explain it simply', 'Write summaries from memory', 'Use practice questions']
  },
  'pomodoro': {
    title: 'Pomodoro Technique',
    body: 'The Pomodoro Technique breaks work into 25–50 minute focused sessions separated by short breaks. It combats procrastination and mental fatigue by making tasks feel manageable.',
    tips: ['25 min study + 5 min break (classic)', '50 min study + 10 min break (deep work)', 'After 4 sessions, take a 30-min break']
  },
  'feynman': {
    title: 'Feynman Technique',
    body: 'Named after physicist Richard Feynman, this technique has 4 steps: (1) Choose a concept, (2) Explain it as if teaching a child, (3) Identify gaps in your explanation, (4) Simplify and review.',
    tips: ['Use simple language — no jargon', 'Draw diagrams when possible', 'If you can\'t explain it simply, you don\'t understand it yet']
  },
  'mind map': {
    title: 'Mind Mapping',
    body: 'Mind maps are visual diagrams that organize information around a central concept. They help you see connections between ideas and are great for brainstorming and revision.',
    tips: ['Start with the main topic in the center', 'Use colors and images', 'Keep branches short — keywords only']
  },
  'cornell notes': {
    title: 'Cornell Note-Taking',
    body: 'The Cornell method divides your page into 3 sections: a narrow left column for cues/questions, a wide right column for notes, and a bottom summary section. It encourages active engagement with material.',
    tips: ['Write questions in the left column after class', 'Summarize the page in 2–3 sentences at the bottom', 'Review by covering notes and answering cues']
  },
  'memory palace': {
    title: 'Memory Palace (Method of Loci)',
    body: 'The memory palace technique involves mentally placing information in specific locations along a familiar route or space. When you need to recall it, you mentally walk through the space.',
    tips: ['Use a familiar place (your home, school route)', 'Make images vivid and unusual', 'Practice the route regularly']
  }
};

/** Quiz bank organized by subject type */
const QUIZ_BANK = {
  general: [
    { q: 'What is the powerhouse of the cell?', a: 'Mitochondria', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'] },
    { q: 'What is the chemical symbol for Gold?', a: 'Au', options: ['Gd', 'Au', 'Ag', 'Go'] },
    { q: 'Solve: 15 + 8 × 2 = ?', a: '31', options: ['46', '31', '38', '23'] },
    { q: 'What is the speed of light (approx)?', a: '3 × 10⁸ m/s', options: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10⁴ m/s'] },
    { q: 'Who wrote "Romeo and Juliet"?', a: 'William Shakespeare', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'] },
    { q: 'What is the derivative of sin(x)?', a: 'cos(x)', options: ['-cos(x)', 'cos(x)', '-sin(x)', 'tan(x)'] },
    { q: 'What does CPU stand for?', a: 'Central Processing Unit', options: ['Central Processing Unit', 'Computer Power Unit', 'Core Processing Utility', 'Central Program Unit'] },
    { q: 'What is the boiling point of water at sea level?', a: '100°C', options: ['90°C', '95°C', '100°C', '110°C'] }
  ],
  study_science: [
    { q: 'Which study technique involves reviewing material at increasing intervals?', a: 'Spaced Repetition', options: ['Cramming', 'Spaced Repetition', 'Passive Reading', 'Highlighting'] },
    { q: 'The Pomodoro Technique uses how many minutes of focused study?', a: '25 minutes', options: ['15 minutes', '25 minutes', '45 minutes', '60 minutes'] },
    { q: 'What does "active recall" mean?', a: 'Testing yourself on material', options: ['Re-reading notes', 'Highlighting text', 'Testing yourself on material', 'Watching videos'] },
    { q: 'Which technique involves explaining a concept as if teaching a child?', a: 'Feynman Technique', options: ['Cornell Method', 'Feynman Technique', 'Mind Mapping', 'SQ3R'] }
  ]
};

/**
 * Main chat response engine — intent detection + handler dispatch
 */
function getChatResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();

  // Intent detection (order matters — more specific first)
  if (msg.match(/\b(start timer|start time|quick timer|start session)\b/i)) {
    return {
      text: `<p><i data-lucide="play" class="icon-inline"></i> <strong>Starting Quick Timer...</strong></p>`,
      type: 'action',
      action: 'startTimer',
      suggestions: ['Get study tips', 'Analyze my progress']
    };
  }
  if (msg.match(/\b(explain|what is|what's|tell me about|how does|how do|define|meaning of)\b/i)) {
    return handleExplainIntent(userMessage);
  }
  if (msg.match(/\b(summarize|summary|sum up|brief|overview|condense|recap)\b/i)) {
    return handleSummarizeIntent();
  }
  if (msg.match(/\b(quiz|test me|question|practice|solve|challenge|flashcard)\b/i)) {
    return handleQuizIntent(userMessage);
  }
  if (msg.match(/\b(pomodoro|timer|break|focus session|study session)\b/i)) {
    return handlePomodoroIntent();
  }
  if (msg.match(/\b(suggest|recommend|what should|help me|advice|tip|tips)\b/i)) {
    return handleSuggestIntent();
  }
  if (msg.match(/\b(progress|analytics|stats|how am i doing|performance|streak)\b/i)) {
    return handleProgressIntent();
  }
  if (msg.match(/\b(plan|schedule|study plan|create plan|generate plan|make a plan)\b/i)) {
    return handlePlanIntent();
  }
  if (msg.match(/\b(hi|hello|hey|good morning|good evening|how are you|bye|goodbye)\b/i)) {
    return handleGreetingIntent();
  }
  if (msg.match(/\b(note|notes|summarize notes|my notes)\b/i)) {
    return handleNotesIntent();
  }
  if (msg.match(/\b(motivat|inspire|quote|encourage)\b/i)) {
    return handleMotivationIntent();
  }

  return getSmartFallback(userMessage);
}

/** Explain a topic — checks knowledge base first, then gives generic guidance */
function handleExplainIntent(msg) {
  const lower = msg.toLowerCase();

  // Check knowledge base
  for (const [key, info] of Object.entries(TOPIC_KNOWLEDGE)) {
    if (lower.includes(key)) {
      return {
        text: buildExplanationHTML(info),
        type: 'explanation',
        suggestions: ['Give me a quiz on this', 'Explain another topic', 'Create a study plan', 'Start Pomodoro']
      };
    }
  }

  // Extract topic from message
  const topicMatch = msg.match(/(?:explain|what is|what's|tell me about|how does|define)\s+(.+?)[\?\.!]?$/i);
  const topic = topicMatch ? topicMatch[1].trim() : 'this topic';

  return {
    text: `<p><i data-lucide="book-open" class="icon-inline"></i> <strong>Explaining: ${escHtml(topic)}</strong></p>
<p>Here's a structured approach to understanding <em>${escHtml(topic)}</em>:</p>
<ul>
  <li><strong>Core Concept:</strong> Break it down to its simplest definition first</li>
  <li><strong>Why it matters:</strong> Connect it to real-world applications</li>
  <li><strong>Key components:</strong> Identify the main parts or steps</li>
  <li><strong>Common mistakes:</strong> Know what to avoid</li>
</ul>
<p><i data-lucide="lightbulb" class="icon-inline"></i> <em>Tip: Try the Feynman Technique — explain it in your own words as if teaching someone else. If you get stuck, that's exactly where to focus your study!</em></p>`,
    type: 'explanation',
    suggestions: ['Explain spaced repetition', 'Explain active recall', 'Explain Pomodoro technique', 'Give me a quiz']
  };
}

function buildExplanationHTML(info) {
  const tipsHtml = info.tips.map(t => `<li>${escHtml(t)}</li>`).join('');
  return `<p><i data-lucide="book-open" class="icon-inline"></i> <strong>${escHtml(info.title)}</strong></p>
<p>${escHtml(info.body)}</p>
<p><strong><i data-lucide="check-circle" class="icon-inline"></i> How to apply it:</strong></p>
<ul>${tipsHtml}</ul>`;
}

/** Summarize the user's current study situation */
function handleSummarizeIntent() {
  const tasks = getTasks().filter(t => !t.completed);
  const stats = getStats();
  const user = getUser();

  if (tasks.length === 0) {
    return {
      text: `<p><i data-lucide="file-text" class="icon-inline"></i> <strong>Your Study Summary</strong></p>
<p>You don't have any active subjects yet.</p>
<p><i data-lucide="arrow-right" class="icon-inline"></i> <a href="add.html" style="color:var(--accent-c)">Add your first subject</a> to get started with a personalized study plan!</p>`,
      type: 'summary',
      suggestions: ['Create a study plan', 'Get study tips', 'Start Pomodoro']
    };
  }

  const urgentTasks = tasks.filter(t => getDaysLeft(t.examDate) <= 7);
  const topTask = tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

  return {
    text: `<p><i data-lucide="file-text" class="icon-inline"></i> <strong>Your Study Summary</strong></p>
<ul>
  <li><i data-lucide="book-open" class="icon-inline"></i> <strong>${tasks.length}</strong> active subject${tasks.length !== 1 ? 's' : ''} to study</li>
  <li><i data-lucide="check-circle" class="icon-inline"></i> <strong>${stats.completed}/${stats.total}</strong> tasks completed (${stats.completionPercent}%)</li>
  <li><i data-lucide="flame" class="icon-inline"></i> <strong>${stats.streak}</strong> day study streak</li>
  <li><i data-lucide="clock" class="icon-inline"></i> Total study time: <strong>${Math.round(stats.totalMinutes / 60)} hours</strong></li>
  ${urgentTasks.length > 0 ? `<li><i data-lucide="alert-triangle" class="icon-inline"></i> <strong>${urgentTasks.length}</strong> exam${urgentTasks.length !== 1 ? 's' : ''} within 7 days!</li>` : ''}
</ul>
<p><i data-lucide="target" class="icon-inline"></i> <strong>Top priority right now:</strong> ${escHtml(topTask.subject)} (${getDaysLeft(topTask.examDate)}d left)</p>`,
    type: 'summary',
    suggestions: ['Create a study plan', 'View analytics', 'Give me a quiz', 'Start Pomodoro']
  };
}

/** Generate an interactive quiz */
function handleQuizIntent(msg) {
  const lower = msg.toLowerCase();
  const pool = lower.includes('study') || lower.includes('technique') || lower.includes('method')
    ? QUIZ_BANK.study_science
    : QUIZ_BANK.general;

  const quiz = pool[Math.floor(Math.random() * pool.length)];
  const shuffled = [...quiz.options].sort(() => Math.random() - 0.5);

  // Render answer options directly inside the message bubble
  const optionsHtml = shuffled.map((opt, i) => {
    const letter = ['A', 'B', 'C', 'D'][i];
    return `<button class="quiz-option-btn" data-msg="${escHtml(opt)}" onclick="sendChatMessage(this.dataset.msg)">
      <span class="quiz-option-letter">${letter}</span>
      <span class="quiz-option-text">${escHtml(opt)}</span>
    </button>`;
  }).join('');

  return {
    text: `<p><i data-lucide="help-circle" class="icon-inline"></i> <strong>Quick Quiz!</strong></p>
<p class="quiz-question">${escHtml(quiz.q)}</p>
<div class="quiz-options">${optionsHtml}</div>
<p class="quiz-hint">Tap an answer above or type it below</p>`,
    type: 'quiz',
    quiz: { ...quiz, shuffledOptions: shuffled },
    suggestions: shuffled,
    isQuiz: true
  };
}

/** Check a quiz answer */
function checkQuizAnswer(selectedAnswer, correctAnswer) {
  const isCorrect = selectedAnswer.trim() === correctAnswer.trim();
  if (isCorrect) {
    if (typeof awardXP === 'function') awardXP(50);
    return {
      text: `<div class="quiz-result correct">
  <p><i data-lucide="check-circle" class="icon-inline"></i> <strong>Correct!</strong> +50 XP <i data-lucide="sparkles" class="icon-inline"></i></p>
  <p>The answer is: <strong>${escHtml(correctAnswer)}</strong></p>
</div>`,
      type: 'quiz-result',
      suggestions: ['Another quiz', 'Give me a harder one', 'Create study plan', 'Start Pomodoro']
    };
  } else {
    return {
      text: `<div class="quiz-result wrong">
  <p><i data-lucide="x-circle" class="icon-inline"></i> <strong>Not quite!</strong> You answered: <em>${escHtml(selectedAnswer)}</em></p>
  <p><i data-lucide="check-circle" class="icon-inline"></i> Correct answer: <strong>${escHtml(correctAnswer)}</strong></p>
  <p><i data-lucide="lightbulb" class="icon-inline"></i> Review this topic and try again — mistakes are how we learn!</p>
</div>`,
      type: 'quiz-result',
      suggestions: ['Try again', 'Another quiz', 'Explain this topic', 'Create study plan']
    };
  }
}

/** Pomodoro session handler */
function handlePomodoroIntent() {
  const tasks = getTasks().filter(t => !t.completed);
  const subjectOptions = tasks.length > 0
    ? tasks.slice(0, 3).map(t => `Start ${t.subject} session`).join('|')
    : '';

  return {
    text: `<p><i data-lucide="clock" class="icon-inline"></i> <strong>Pomodoro Session</strong></p>
<p>The Pomodoro Technique keeps you focused and prevents burnout:</p>
<ul>
  <li><i data-lucide="clock" class="icon-inline"></i> <strong>Study:</strong> 50 minutes of deep focus</li>
  <li><i data-lucide="coffee" class="icon-inline"></i> <strong>Break:</strong> 10 minutes to recharge</li>
  <li><i data-lucide="repeat" class="icon-inline"></i> <strong>Repeat:</strong> 4 sessions, then a 30-min break</li>
</ul>
<p>Ready to start? Use the <strong>Quick Timer</strong> widget on your dashboard, or click below!</p>`,
    type: 'pomodoro',
    suggestions: tasks.length > 0
      ? [`Start ${tasks[0].subject} session`, 'Start 25min session', 'Start 50min session', 'Customize timer']
      : ['Start 25min session', 'Start 50min session', 'Customize timer', 'Get study tips']
  };
}

/** Progress analysis */
function handleProgressIntent() {
  const stats = getStats();
  const user = getUser();
  const weeklyData = getWeeklyProgress();
  const totalWeeklyMins = weeklyData.reduce((s, d) => s + d.minutes, 0);
  const avgDailyMins = Math.round(totalWeeklyMins / 7);

  let performanceMsg = '';
  if (avgDailyMins >= 120) performanceMsg = '<i data-lucide="star" class="icon-inline"></i> Excellent! You\'re studying 2+ hours daily.';
  else if (avgDailyMins >= 60) performanceMsg = '<i data-lucide="thumbs-up" class="icon-inline"></i> Good progress! Aim for 2 hours daily for best results.';
  else if (avgDailyMins > 0) performanceMsg = '<i data-lucide="trending-up" class="icon-inline"></i> You\'re getting started. Try to build up to 1–2 hours daily.';
  else performanceMsg = '<i data-lucide="activity" class="icon-inline"></i> No study sessions logged this week. Let\'s change that today!';

  return {
    text: `<p><i data-lucide="bar-chart-2" class="icon-inline"></i> <strong>Your Progress Report</strong></p>
<ul>
  <li><i data-lucide="check-circle" class="icon-inline"></i> Completion rate: <strong>${stats.completionPercent}%</strong></li>
  <li><i data-lucide="flame" class="icon-inline"></i> Current streak: <strong>${stats.streak} days</strong></li>
  <li><i data-lucide="star" class="icon-inline"></i> Level: <strong>${user.level || 1}</strong> (${user.xp || 0} XP)</li>
  <li><i data-lucide="clock" class="icon-inline"></i> This week: <strong>${Math.round(totalWeeklyMins / 60 * 10) / 10} hours</strong></li>
  <li><i data-lucide="calendar" class="icon-inline"></i> Daily average: <strong>${avgDailyMins} min/day</strong></li>
</ul>
<p>${performanceMsg}</p>`,
    type: 'progress',
    suggestions: ['Create study plan', 'Get suggestions', 'Give me a quiz', 'Start Pomodoro']
  };
}

/** Study plan creation prompt */
function handlePlanIntent() {
  const tasks = getTasks().filter(t => !t.completed);
  if (tasks.length === 0) {
    return {
      text: `<p><i data-lucide="calendar" class="icon-inline"></i> <strong>Create a Study Plan</strong></p>
<p>To generate a personalized plan, you first need to add some subjects!</p>
<p><i data-lucide="arrow-right" class="icon-inline"></i> <a href="add.html" style="color:var(--accent-c)">Add your subjects</a> with exam dates and difficulty, then come back to create your plan.</p>`,
      type: 'plan',
      suggestions: ['Add a subject', 'Get study tips', 'Start Pomodoro']
    };
  }
  return {
    text: `<p><i data-lucide="calendar" class="icon-inline"></i> <strong>AI Study Plan Generator</strong></p>
<p>I'll create a personalized daily schedule based on:</p>
<ul>
  <li><i data-lucide="calendar" class="icon-inline"></i> Your exam dates</li>
  <li><i data-lucide="book-open" class="icon-inline"></i> Syllabus size</li>
  <li><i data-lucide="zap" class="icon-inline"></i> Difficulty level</li>
  <li><i data-lucide="brain" class="icon-inline"></i> Optimal study patterns</li>
</ul>
<p>Click <strong>"Generate Plan"</strong> to open the planner!</p>`,
    type: 'plan',
    action: 'openPlanner',
    suggestions: ['Generate Plan', 'Analyze my progress', 'Give me a quiz', 'Start Pomodoro']
  };
}

/** Greeting handler */
function handleGreetingIntent() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const user = getUser();
  const name = user.name ? `, ${user.name.split(' ')[0]}` : '';

  const messages = [
    `<p>${greeting}${name}! <i data-lucide="smile" class="icon-inline"></i> Ready to crush your goals today?</p><p>I'm here to help you study smarter. What would you like to do?</p>`,
    `<p>Hey${name}! <i data-lucide="graduation-cap" class="icon-inline"></i> I'm Planora AI — your personal study coach.</p><p>Let's make today productive. What can I help you with?</p>`,
    `<p>${greeting}${name}! <i data-lucide="trending-up" class="icon-inline"></i> Let's make some progress today.</p><p>I can create study plans, quiz you, explain topics, or track your progress.</p>`
  ];

  return {
    text: messages[Math.floor(Math.random() * messages.length)],
    type: 'greeting',
    suggestions: ['Create study plan', 'Give me a quiz', 'Analyze my progress', 'Start Pomodoro']
  };
}

/** Notes summarization */
function handleNotesIntent() {
  return {
    text: `<p><i data-lucide="file-text" class="icon-inline"></i> <strong>Note Summarization</strong></p>
<p>To summarize your notes, paste them in the chat and I'll help you:</p>
<ul>
  <li><i data-lucide="key" class="icon-inline"></i> Extract key concepts</li>
  <li><i data-lucide="pin" class="icon-inline"></i> Identify important definitions</li>
  <li><i data-lucide="folder" class="icon-inline"></i> Organize information by topic</li>
  <li><i data-lucide="help-circle" class="icon-inline"></i> Generate review questions</li>
</ul>
<p>Or I can summarize your current study situation based on your subjects!</p>`,
    type: 'notes',
    suggestions: ['Summarize my subjects', 'Give me a quiz', 'Explain a topic', 'Create study plan']
  };
}

/** Motivation */
function handleMotivationIntent() {
  const motivations = [
    { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { quote: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
    { quote: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
    { quote: 'Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.', author: 'Richard Feynman' },
    { quote: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' }
  ];
  const m = motivations[Math.floor(Math.random() * motivations.length)];

  return {
    text: `<p><i data-lucide="sparkles" class="icon-inline"></i> <strong>Daily Motivation</strong></p>
<blockquote style="border-left:3px solid var(--accent-p);padding-left:1rem;margin:0.5rem 0;font-style:italic;">"${escHtml(m.quote)}"</blockquote>
<p style="color:var(--text2);font-size:0.85rem;">— ${escHtml(m.author)}</p>
<p>You've got this! <i data-lucide="activity" class="icon-inline"></i> Every study session brings you closer to your goal.</p>`,
    type: 'motivation',
    suggestions: ['Create study plan', 'Start Pomodoro', 'Give me a quiz', 'Analyze my progress']
  };
}

/** Smart fallback that tries to be helpful */
function getSmartFallback(userMessage) {
  const tasks = getTasks().filter(t => !t.completed);
  const topTask = tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

  const contextHint = topTask
    ? `<p><i data-lucide="lightbulb" class="icon-inline"></i> By the way, your top priority right now is <strong>${escHtml(topTask.subject)}</strong> (${getDaysLeft(topTask.examDate)}d until exam).</p>`
    : '';

  return {
    text: `<p><i data-lucide="help-circle" class="icon-inline"></i> I'm not sure I understood that, but I'm here to help!</p>
<p>Here's what I can do:</p>
<ul>
  <li><i data-lucide="calendar" class="icon-inline"></i> <strong>Create a study plan</strong> — personalized schedule</li>
  <li><i data-lucide="book-open" class="icon-inline"></i> <strong>Explain topics</strong> — "explain spaced repetition"</li>
  <li><i data-lucide="help-circle" class="icon-inline"></i> <strong>Quiz you</strong> — practice questions</li>
  <li><i data-lucide="clock" class="icon-inline"></i> <strong>Pomodoro timer</strong> — focused study sessions</li>
  <li><i data-lucide="bar-chart-2" class="icon-inline"></i> <strong>Analyze progress</strong> — your stats</li>
  <li><i data-lucide="file-text" class="icon-inline"></i> <strong>Summarize</strong> — your study situation</li>
</ul>
${contextHint}`,
    type: 'general',
    suggestions: ['Create study plan', 'Give me a quiz', 'Explain active recall', 'Start Pomodoro']
  };
}

/* ═════════════════════════════════════════════
   CHAT HISTORY PERSISTENCE
   ═════════════════════════════════════════════ */

function saveChatMessage(role, content) {
  const history = JSON.parse(localStorage.getItem('planora_chat_history') || '[]');
  history.push({ role, content, timestamp: new Date().toISOString() });
  if (history.length > 50) history.shift();
  localStorage.setItem('planora_chat_history', JSON.stringify(history));
  return history;
}

function getChatHistory() {
  return JSON.parse(localStorage.getItem('planora_chat_history') || '[]');
}

function clearChatHistory() {
  localStorage.removeItem('planora_chat_history');
}
