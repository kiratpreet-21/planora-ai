/* ============================================================
   PLANORA – DEPTH.JS | Scroll Reveal & Visual Depth Interactions
   ============================================================ */
'use strict';

(function () {
  /* ─── Intersection Observer for scroll reveals ─── */
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        // Unobserve after revealing (one-time animation)
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  function initScrollReveal() {
    // Observe chart cards for animate-into-view
    document.querySelectorAll('.chart-card').forEach(el => {
      revealObserver.observe(el);
    });

    // Observe any element with .reveal class
    document.querySelectorAll('.reveal').forEach(el => {
      revealObserver.observe(el);
    });
  }

  /* ─── Subtle parallax on gradient blobs ─── */
  let ticking = false;
  function onMouseMove(e) {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      // Move the body::after blob via CSS custom properties
      document.documentElement.style.setProperty('--mouse-x', `${x * 15}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y * 15}px`);

      ticking = false;
    });
  }

  /* ─── Animate stat numbers on load ─── */
  function animateCounters() {
    document.querySelectorAll('.stat-val').forEach(el => {
      const target = parseInt(el.textContent, 10);
      if (isNaN(target) || target === 0) return;

      const duration = 800;
      const start = performance.now();

      el.textContent = '0';

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = target;
        }
      }

      requestAnimationFrame(tick);
    });
  }

  /* ─── Tilt effect on hover for cards ─── */
  function initTiltCards() {
    document.querySelectorAll('.stat-card, .highlight-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const isHighlight = card.classList.contains('highlight-card');
        const maxRotateX = isHighlight ? -0.5 : -3;
        const maxRotateY = isHighlight ? 0.5 : 3;
        const transY = isHighlight ? -1 : -4;

        const rotateX = ((y - centerY) / centerY) * maxRotateX;
        const rotateY = ((x - centerX) / centerX) * maxRotateY;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${transY}px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ─── Initialize everything ─── */
  function init() {
    // Wait a tick so DOM is ready after dashboard renders
    requestAnimationFrame(() => {
      initScrollReveal();
      animateCounters();
      initTiltCards();
    });

    // Parallax on mouse (desktop only, light effect)
    if (window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', onMouseMove, { passive: true });
    }
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init on dashboard refresh (if called from dashboard.js)
  const origRefresh = window.refreshDashboard;
  if (typeof origRefresh === 'function') {
    window.refreshDashboard = function () {
      origRefresh();
      requestAnimationFrame(() => {
        initScrollReveal();
        animateCounters();
        initTiltCards();
      });
    };
  }
})();
