/* ============================================================
   PLANORA – PLANNER.JS | AI Plan Generation & Priority Logic
   ============================================================ */

// The unified calculatePriority and getPriorityLevel functions are located in js/storage.js

/* ─── Daily Plan Generation ─── */
/**
 * Generates today's study plan sorted by priority.
 * Distributes subjects into time blocks.
 */
function generateDailyPlan() {
  const tasks = getTasks().filter(t => !t.completed);
  if (tasks.length === 0) return [];

  // Update priorities for all active tasks
  const activeTasks = tasks.map(t => {
    const priority = calculatePriority(t.difficulty, t.examDate, t.workAmount);
    return {
      ...t,
      priority,
      priorityLevel: getPriorityLevel(priority)
    };
  });

  let rawPlan = activeTasks.map(t => {
    let dailyMin = calculateDailyStudy(t) * 60; // Convert hours to minutes
    
    // Smart Boost: If exam is <= 3 days away, increase focus
    const daysLeft = getDaysLeft(t.examDate);
    if (daysLeft <= 3 && daysLeft >= 0) {
      dailyMin *= 1.35; // 35% boost for urgency
    }
    return { ...t, dailyMin };
  });

  const savedTime = localStorage.getItem('planora_availableTime');
  const availableTime = savedTime ? parseInt(savedTime) : NaN;

  if (!isNaN(availableTime) && availableTime > 0) {
    const totalNeeded = rawPlan.reduce((sum, t) => sum + t.dailyMin, 0);
    if (totalNeeded > 0) {
      const scale = availableTime / totalNeeded;
      rawPlan = rawPlan.map(t => ({ ...t, dailyMin: t.dailyMin * scale }));
    }
  }

  const plan = rawPlan.map(t => {
    let dailyMin = t.dailyMin;
    // Ensure at least 5 minutes if there's work
    if (dailyMin > 0 && dailyMin < 5) dailyMin = 5;
    
    // Round to nearest 5 mins for cleaner plan
    const roundedMin = Math.round(dailyMin / 5) * 5;

    return {
      ...t,
      recommendedMinutes: roundedMin,
      recommendedTimeStr: formatMinutes(roundedMin)
    };
  });

  // Sort by priority (difficulty/urgency) first, then by recommended time
  return plan.sort((a, b) => b.priority - a.priority || b.recommendedMinutes - a.recommendedMinutes);
}

function formatMinutes(mins) {
  if (mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

function makeTask(subject, hours) {
  return {
    id: `task_${subject.id}_${new Date().toDateString().replace(/\s/g, '_')}`,
    subjectId: subject.id,
    subject: subject.name,
    difficulty: capitalize(subject.difficulty),
    color: subject.color || '#a78bfa',
    hours: hours || subject.hours || 1,
    priority: subject.priority || 1,
    priorityLabel: getPriorityLevel(subject.priority || 1),
    examDate: subject.examDate,
  };
}

/* ─── AI Suggestions ─── */
const suggestionTemplates = [
  (s, d) => `Focus on ${s} for ${d} today — your exam is approaching fast! 📖`,
  (s, d) => `AI recommends ${d} of deep study on ${s}. Start with the hardest topics first! 🧠`,
  (s, d) => `Study ${s} for ${d} using active recall and spaced repetition for best results! ✨`,
  (s, d) => `Time to crush ${s}! ${d} of focused study will make a big difference today! 💪`,
  (s, d) => `${s} needs your attention — ${d} of practice problems recommended today! 🎯`,
];

function generateAISuggestion() {
  const tasks = getTasks().filter(t => !t.completed);
  if (tasks.length === 0) {
    return { text: "Add some subjects to get started! Planora will then guide your study journey.", type: 'neutral' };
  }

  const sorted = tasks
    .map(t => ({ ...t, priority: calculatePriority(t.difficulty, t.examDate) }))
    .sort((a, b) => b.priority - a.priority);

  const top = sorted[0];
  const daysLeft = getDaysLeft(top.examDate);

  if (daysLeft <= 2 && top.priorityLevel === 'high') {
    return {
      text: `You should focus more on ${top.subject} today. Only ${daysLeft === 0 ? 'today' : daysLeft + ' days'} left and high difficulty. ⚡`,
      type: 'urgent'
    };
  }

  if (top.priorityLevel === 'high') {
    return {
      text: `Priority alert: ${top.subject} is your biggest challenge right now. Dedicate some focused time to it! 🧠`,
      type: 'high'
    };
  }

  return {
    text: `Great progress! Keep the momentum going. Maybe start with ${top.subject} today? ✨`,
    type: 'positive'
  };
}

/* ─── Motivational Quotes ─── */
const quotes = [
  { q: '"The secret of getting ahead is getting started."', a: 'Mark Twain' },
  { q: '"It always seems impossible until it\'s done."', a: 'Nelson Mandela' },
  { q: '"The expert in anything was once a beginner."', a: 'Helen Hayes' },
  { q: '"Education is the most powerful weapon you can use."', a: 'Nelson Mandela' },
  { q: '"Success is the sum of small efforts, repeated day in and day out."', a: 'Robert Collier' },
  { q: '"Don\'t watch the clock; do what it does. Keep going."', a: 'Sam Levenson' },
  { q: '"Believe you can and you\'re halfway there."', a: 'Theodore Roosevelt' },
  { q: '"The only way to learn mathematics is to do mathematics."', a: 'Paul Halmos' },
  { q: '"Study hard what interests you the most."', a: 'Richard Feynman' },
  { q: '"Today a reader, tomorrow a leader."', a: 'Margaret Fuller' },
  { q: '"An investment in knowledge pays the best interest."', a: 'Benjamin Franklin' },
  { q: '"The beautiful thing about learning is that no one can take it away from you."', a: 'B.B. King' },
  { q: '"Push yourself because no one else is going to do it for you."', a: 'Unknown' },
  { q: '"Great things never come from comfort zones."', a: 'Unknown' },
  { q: '"Dream it. Wish it. Do it."', a: 'Unknown' },
];

let lastQuoteIdx = -1;

function newMotivation() {
  let idx;
  do { idx = Math.floor(Math.random() * quotes.length); } while (idx === lastQuoteIdx);
  lastQuoteIdx = idx;

  const quoteEl = document.getElementById('motivationQuote');
  const authorEl = document.getElementById('motivationAuthor');
  if (!quoteEl || !authorEl) return;

  quoteEl.style.opacity = '0';
  authorEl.style.opacity = '0';

  setTimeout(() => {
    quoteEl.textContent = quotes[idx].q;
    authorEl.textContent = `— ${quotes[idx].a}`;
    quoteEl.style.opacity = '1';
    authorEl.style.opacity = '1';
  }, 250);
}

// Initialize with random quote
document.addEventListener('DOMContentLoaded', () => {
  newMotivation();
  // Auto-rotate every 10 seconds
  setInterval(newMotivation, 10000);

});
function calculateDailyStudy(task) {
  const d = getDaysLeft(task.examDate);
  if (d <= 0) return 0;

  const diffMap = { 'easy': 1, 'medium': 3, 'hard': 5 };
  const dVal = diffMap[task.difficulty] || parseInt(task.difficulty) || 3;

  // Use the same estimation logic as storage.js
  const estimatedWork = (task.workAmount && task.workAmount > 0) ? task.workAmount : (dVal * 5);
  
  return estimatedWork / d;
}

