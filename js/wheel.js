/**
 * PLANORA – WHEEL.JS
 * Interactive "Spin the Wheel" logic
 */

class StudyWheel {
  constructor() {
    this.canvas = document.getElementById('wheelCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.spinBtn = document.getElementById('spinBtn');
    this.resultText = document.getElementById('wwResultText');
    this.addToListBtn = document.getElementById('wwAddToListBtn');
    this.soundToggle = document.getElementById('wwSoundToggle');
    
    // Subjects data
    this.defaultSubjects = ['Math', 'Science', 'English', 'Coding', 'History', 'Physics'];
    this.subjects = this.loadSubjects();
    
    // Wheel state
    this.isSpinning = false;
    this.angle = 0;
    this.spinVelocity = 0;
    this.friction = 0.985; // Deceleration
    this.minSpinVelocity = 15;
    this.maxSpinVelocity = 25;
    this.resultsShown = false;
    this.soundEnabled = true;
    
    // Colors (Planora Theme)
    this.colors = [
      '#a78bfa', // Purple
      '#f472b6', // Pink
      '#22d3ee', // Cyan
      '#fbbf24', // Yellow
      '#34d399', // Emerald
      '#fb7185'  // Rose
    ];

    this.init();
  }

  init() {
    // Setup listeners
    this.spinBtn.addEventListener('click', () => this.spin());
    this.soundToggle.addEventListener('click', () => this.toggleSound());
    
    // Manage Modal
    const manageBtn = document.getElementById('wwManageBtn');
    const modal = document.getElementById('wwModal');
    const closeModal = document.getElementById('wwCloseModal');
    const addSubjectBtn = document.getElementById('wwAddSubject');
    const newSubjectInput = document.getElementById('wwNewSubject');

    manageBtn.addEventListener('click', () => {
      this.renderSubjectList();
      modal.classList.add('open');
    });

    closeModal.addEventListener('click', () => modal.classList.remove('open'));
    
    addSubjectBtn.addEventListener('click', () => {
      const val = newSubjectInput.value.trim();
      if (val) {
        this.addSubject(val);
        newSubjectInput.value = '';
      }
    });

    this.addToListBtn.addEventListener('click', () => this.integrateWithPlanner());

    // Initial draw
    this.draw();
  }

  loadSubjects() {
    const saved = localStorage.getItem('planora_wheel_subjects');
    return saved ? JSON.parse(saved) : [...this.defaultSubjects];
  }

  saveSubjects() {
    localStorage.setItem('planora_wheel_subjects', JSON.stringify(this.subjects));
    this.draw();
  }

  addSubject(name) {
    if (this.subjects.length >= 12) {
      alert("Maximum 12 subjects allowed on the wheel!");
      return;
    }
    this.subjects.push(name);
    this.saveSubjects();
    this.renderSubjectList();
  }

  removeSubject(index) {
    if (this.subjects.length <= 2) {
      alert("At least 2 subjects are required!");
      return;
    }
    this.subjects.splice(index, 1);
    this.saveSubjects();
    this.renderSubjectList();
  }

  renderSubjectList() {
    const list = document.getElementById('wwSubjectList');
    list.innerHTML = '';
    this.subjects.forEach((sub, i) => {
      const li = document.createElement('li');
      li.className = 'ww-subject-item';
      li.innerHTML = `
        <span>${sub}</span>
        <button class="ww-remove-btn" onclick="window.studyWheel.removeSubject(${i})">Remove</button>
      `;
      list.appendChild(li);
    });
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.soundToggle.innerHTML = this.soundEnabled ? '<i data-lucide="volume-2" class="icon-inline"></i>' : '<i data-lucide="volume-x" class="icon-inline"></i>';
    if (typeof refreshIcons === 'function') refreshIcons();
  }

  draw() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2;
    const sliceAngle = (Math.PI * 2) / this.subjects.length;

    this.ctx.clearRect(0, 0, width, height);

    this.subjects.forEach((subject, i) => {
      const startAngle = this.angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw Slice
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.fillStyle = this.colors[i % this.colors.length];
      this.ctx.fill();
      
      // Draw Border
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw Text
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(startAngle + sliceAngle / 2);
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px Inter';
      this.ctx.fillText(subject, radius - 20, 5);
      this.ctx.restore();
    });

    // Outer Border
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  spin() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    this.spinVelocity = this.minSpinVelocity + Math.random() * (this.maxSpinVelocity - this.minSpinVelocity);
    this.spinBtn.disabled = true;
    this.resultText.textContent = "Spinning...";
    this.addToListBtn.style.display = 'none';
    this.resultsShown = false;
    
    this.animate();
  }

  animate() {
    if (this.spinVelocity > 0.1) {
      this.angle += this.spinVelocity * (Math.PI / 180);
      this.spinVelocity *= this.friction;
      
      // Sound effect (Web Audio API)
      if (this.soundEnabled && Math.floor(this.angle / ((Math.PI * 2) / this.subjects.length)) !== this.lastSlice) {
        this.playTick();
        this.lastSlice = Math.floor(this.angle / ((Math.PI * 2) / this.subjects.length));
      }

      this.draw();
      requestAnimationFrame(() => this.animate());
    } else {
      this.isSpinning = false;
      this.spinVelocity = 0;
      this.spinBtn.disabled = false;
      this.showResult();
    }
  }

  playTick() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Sound blocked by browser policy");
    }
  }

  showResult() {
    const sliceAngle = (Math.PI * 2) / this.subjects.length;
    // Normalized angle (pointer is at top = -PI/2)
    const normalizedAngle = (Math.PI * 1.5 - this.angle) % (Math.PI * 2);
    const finalAngle = normalizedAngle < 0 ? normalizedAngle + Math.PI * 2 : normalizedAngle;
    const index = Math.floor(finalAngle / sliceAngle) % this.subjects.length;
    
    const result = this.subjects[index];
    this.resultText.innerHTML = `You should study: <span style="color:var(--accent-p)">${result}</span>`;
    this.addToListBtn.style.display = 'block';
    this.addToListBtn.dataset.subject = result;
    
    this.spawnConfetti();
  }

  spawnConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#a78bfa', '#f472b6', '#22d3ee', '#fbbf24'];
    
    for (let i = 0; i < 50; i++) {
      const conf = document.createElement('div');
      conf.className = 'confetti';
      conf.style.left = Math.random() * 100 + 'vw';
      conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      conf.style.width = (Math.random() * 8 + 5) + 'px';
      conf.style.height = (Math.random() * 8 + 5) + 'px';
      conf.style.animationDelay = (Math.random() * 0.5) + 's';
      conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
      container.appendChild(conf);
      
      setTimeout(() => conf.remove(), 3000);
    }
  }

  integrateWithPlanner() {
    const subject = this.addToListBtn.dataset.subject;
    if (typeof showToast === 'function') showToast(`Great! Adding ${subject} to your study plan...`, 'info');
    
    // Logic to add to planner
    // In this app, planner data is managed by Storage.js (global functions)
    const newTask = {
      id: Date.now().toString(),
      subject: subject,
      hours: 1,
      priorityLevel: 'medium',
      difficulty: 'medium', // Pass 'medium' so calculatePriority uses weight 2
      examDate: new Date().toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    // Calculate priority value for sorting
    if (typeof calculatePriority === 'function') {
      newTask.priority = calculatePriority(newTask.difficulty, newTask.examDate);
    } else {
      newTask.priority = 2.0; // Default for medium urgency
    }

    if (typeof addTask === 'function') {
      addTask(newTask);
      if (typeof refreshDashboard === 'function') refreshDashboard();
    }
    
    this.addToListBtn.disabled = true;
    this.addToListBtn.textContent = 'Added to Today!';
  }
}

// Global instance for onclick handlers
window.addEventListener('DOMContentLoaded', () => {
  window.studyWheel = new StudyWheel();
});
