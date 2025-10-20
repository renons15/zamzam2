// Minimal enhancements: mobile nav toggle, header on-scroll state, basic form honeypot handling
(function () {
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  const header = document.querySelector('.site-header');

  // Mobile nav toggle
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close nav when clicking a link (useful on mobile)
    nav.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.closest('a')) {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Header scrolled state
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 4) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Simple honeypot: prevent submission if hidden field is filled
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const honeypot = form.querySelector('#company');
    if (honeypot && honeypot instanceof HTMLInputElement && honeypot.value.trim() !== '') {
      e.preventDefault();
      // Optionally inform user silently; bots will be blocked anyway
    }
  });

  // Keep paired pricing tables vertically aligned on desktop
  const pricingLayout = document.querySelector('.pricing-layout');
  if (pricingLayout) {
    const desktopMq = window.matchMedia('(min-width: 768px)');

    const resetHeights = (cards) => {
      cards.forEach((card) => {
        const headerEl = card.querySelector('header');
        if (headerEl) headerEl.style.minHeight = '';
        card.querySelectorAll('.price-category').forEach((category) => {
          category.style.minHeight = '';
        });
      });
    };

    const alignPricingColumns = () => {
      const cards = Array.from(pricingLayout.querySelectorAll('.pricing-card'));
      if (cards.length < 2) {
        resetHeights(cards);
        return;
      }

      resetHeights(cards);
      if (!desktopMq.matches) return;

      const headers = cards.map((card) => card.querySelector('header')).filter(Boolean);
      if (headers.length) {
        const tallestHeader = Math.max(...headers.map((header) => header.offsetHeight));
        headers.forEach((header) => {
          header.style.minHeight = `${tallestHeader}px`;
        });
      }

      const groupedCategories = [];
      cards.forEach((card, cardIdx) => {
        const categories = Array.from(card.querySelectorAll('.price-category'));
        categories.forEach((category, catIdx) => {
          if (!groupedCategories[catIdx]) groupedCategories[catIdx] = [];
          groupedCategories[catIdx][cardIdx] = category;
        });
      });

      groupedCategories.forEach((group) => {
        if (!group || !group.length) return;
        const tallestCategory = Math.max(...group.map((category) => category.offsetHeight));
        group.forEach((category) => {
          if (category) category.style.minHeight = `${tallestCategory}px`;
        });
      });
    };

    let alignRaf = 0;
    const scheduleAlign = () => {
      if (alignRaf) cancelAnimationFrame(alignRaf);
      alignRaf = requestAnimationFrame(() => {
        alignRaf = 0;
        alignPricingColumns();
      });
    };

    scheduleAlign();
    window.addEventListener('load', scheduleAlign);
    window.addEventListener('resize', scheduleAlign);
    if (typeof desktopMq.addEventListener === 'function') desktopMq.addEventListener('change', scheduleAlign);
    else if (typeof desktopMq.addListener === 'function') desktopMq.addListener(scheduleAlign);
  }

  // Expand/collapse toggles for long content
  const onToggleClick = (btn) => {
    const targetSel = btn.getAttribute('data-expand-target');
    if (!targetSel) return;
    const panel = document.querySelector(targetSel);
    if (!panel) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    btn.setAttribute('aria-expanded', String(next));
    const collapsedText = btn.getAttribute('data-collapsed-text') || 'Подробнее';
    const expandedText = btn.getAttribute('data-expanded-text') || 'Свернуть';
    btn.textContent = next ? expandedText : collapsedText;
    if (next) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  };

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    const btn = target.closest && target.closest('[data-expand-target]');
    if (!btn) return;
    e.preventDefault();
    onToggleClick(btn);
  });

  // Reviews carousel (vanilla)
  const carousel = document.querySelector('.reviews-carousel');
  if (carousel) {
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.review-slide'));
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    const dotsWrap = carousel.querySelector('#reviewsDots');

    let index = 0;
    let autoTimer = null;
    const AUTO_MS = 5000;
    const setIndex = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      updateDots();
      slides.forEach((s, idx) => s.querySelector('.review-card')?.setAttribute('tabindex', idx === index ? '0' : '-1'));
    };

    const makeDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Перейти к отзыву ${i + 1}`);
        b.addEventListener('click', () => setIndex(i));
        dotsWrap.appendChild(b);
      });
    };

    const updateDots = () => {
      if (!dotsWrap) return;
      const bs = Array.from(dotsWrap.querySelectorAll('button'));
      bs.forEach((b, i) => b.setAttribute('aria-current', i === index ? 'true' : 'false'));
    };

    const startAuto = () => {
      stopAuto();
      autoTimer = window.setInterval(() => setIndex(index + 1), AUTO_MS);
    };
    const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };

    // Buttons
    prevBtn && prevBtn.addEventListener('click', () => { setIndex(index - 1); startAuto(); });
    nextBtn && nextBtn.addEventListener('click', () => { setIndex(index + 1); startAuto(); });

    // Pause on hover/focus
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);

    // Touch & pointer swipe
    let startX = 0; let touching = false;
    const threshold = 40;
    const start = (x) => { touching = true; startX = x; };
    const end = (x) => {
      if (!touching) return;
      const dx = x - startX;
      if (Math.abs(dx) > threshold) {
        if (dx < 0) setIndex(index + 1); else setIndex(index - 1);
        startAuto();
      }
      touching = false;
    };
    carousel.addEventListener('touchstart', (e) => start(e.touches[0].clientX), { passive: true });
    carousel.addEventListener('touchend', (e) => end(e.changedTouches[0].clientX));
    carousel.addEventListener('pointerdown', (e) => start(e.clientX));
    window.addEventListener('pointerup', (e) => end(e.clientX));

    makeDots();
    setIndex(0);
    startAuto();
  }

  // Rooms: hover-to-play media handling
  const mediaWrappers = Array.from(document.querySelectorAll('.media-hover'));
  if (mediaWrappers.length) {
    const hoverQuery = window.matchMedia('(hover: hover)');
    const finePointerQuery = window.matchMedia('(pointer: fine)');
    const supportsHover = hoverQuery.matches && finePointerQuery.matches;

    mediaWrappers.forEach((wrapper) => {
      const video = wrapper.querySelector('video');
      if (!video) return;

      const showVideo = () => {
        if (wrapper.classList.contains('is-active')) return;
        wrapper.classList.add('is-active');
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Autoplay might be blocked on some devices; rollback visual state.
            video.pause();
            try {
              video.currentTime = 0;
            } catch (_) {/* noop */}
            wrapper.classList.remove('is-active');
          });
        }
      };

      const resetVideo = () => {
        if (!wrapper.classList.contains('is-active')) return;
        video.pause();
        try {
          video.currentTime = 0;
        } catch (_) {
          /* Some browsers throw if media isn't seekable yet; ignore. */
        }
        wrapper.classList.remove('is-active');
      };

      if (supportsHover) {
        wrapper.addEventListener('mouseenter', showVideo);
        wrapper.addEventListener('mouseleave', resetVideo);
      } else {
        wrapper.addEventListener('click', (event) => {
          event.preventDefault();
          if (wrapper.classList.contains('is-active')) resetVideo();
          else showVideo();
        });
      }

      video.addEventListener('ended', resetVideo);
    });
  }
})();
