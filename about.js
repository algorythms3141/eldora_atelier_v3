/* ================================================================
   ELDORA ATELIER — about.js
   - Mobile nav drawer
   - Hero stat counter animation
   - Scroll reveal (IntersectionObserver)
   - In-page subnav active tracking
   - Review carousel (drag + arrows + dots)
   - Video lightbox
   - Social platform tab switcher
   ================================================================ */

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ================================================================
     1. MOBILE DRAWER
  ================================================================ */
  const toggle  = $('#menu-toggle');
  const drawer  = $('#mobile-drawer');
  const dclose  = $('#drawer-close');
  const overlay = $('#drawer-overlay');
  const openDrawer  = () => { drawer.classList.add('open'); drawer.removeAttribute('aria-hidden'); overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; toggle && toggle.setAttribute('aria-expanded','true'); };
  const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); overlay.classList.remove('visible'); document.body.style.overflow = ''; toggle && toggle.setAttribute('aria-expanded','false'); };
  toggle  && toggle.addEventListener('click', openDrawer);
  dclose  && dclose.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());

  /* ================================================================
     2. SCROLL HEADER SHADOW
  ================================================================ */
  const hdr = $('#site-header');
  if (hdr) window.addEventListener('scroll', () => {
    hdr.style.boxShadow = window.scrollY > 8 ? '0 2px 20px rgba(44,18,8,.12)' : '0 1px 12px rgba(44,18,8,.06)';
  }, { passive: true });

  /* ================================================================
     3. SCROLL REVEAL
  ================================================================ */
  const revealEls = $$('.reveal-up, .reveal-left, .reveal-right');
  const ro = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        ro.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => ro.observe(el));

  /* ================================================================
     4. HERO STAT COUNTERS
  ================================================================ */
  const statEls = $$('.stat-num');
  let countersStarted = false;

  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;
    statEls.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const step = 16;
      const increment = target / (duration / step);
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.round(current);
      }, step);
    });
  }

  const heroSection = $('.ab-hero');
  if (heroSection) {
    const heroObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { startCounters(); heroObs.disconnect(); }
    }, { threshold: 0.3 });
    heroObs.observe(heroSection);
  }

  /* ================================================================
     5. IN-PAGE SUBNAV — active on scroll
  ================================================================ */
  const subnav = $('.ab-subnav');
  const subLinks = $$('.ab-subnav-link');
  const sections = subLinks.map(a => document.getElementById(a.dataset.section)).filter(Boolean);

  if (subnav && subLinks.length) {
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          subLinks.forEach(a => a.classList.toggle('active', a.dataset.section === id));
        }
      });
    }, { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' });
    sections.forEach(s => sectionObs.observe(s));
  }

  /* ================================================================
     6. REVIEWS CAROUSEL
  ================================================================ */
  const track    = $('#reviews-track');
  const prevBtn  = $('#rev-prev');
  const nextBtn  = $('#rev-next');
  const dotsWrap = $('#reviews-dots');

  if (track) {
    const cards   = $$('.review-card', track);
    const visible = window.innerWidth >= 900 ? 3 : window.innerWidth >= 600 ? 2 : 1;
    let index = 0;
    const maxIndex = Math.max(0, cards.length - visible);

    // Build dots
    const numDots = maxIndex + 1;
    const dots = Array.from({ length: numDots }, (_, i) => {
      const d = document.createElement('button');
      d.className = 'rev-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', `Go to review group ${i + 1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap && dotsWrap.appendChild(d);
      return d;
    });

    function goTo(n) {
      index = Math.max(0, Math.min(n, maxIndex));
      const cardW = cards[0].getBoundingClientRect().width + 24; // gap
      track.style.transform = `translateX(-${index * cardW}px)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
      prevBtn && (prevBtn.disabled = index === 0);
      nextBtn && (nextBtn.disabled = index === maxIndex);
    }

    prevBtn && prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn && nextBtn.addEventListener('click', () => goTo(index + 1));

    // Drag support
    let startX = 0, isDragging = false;
    track.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX; track.style.cursor = 'grabbing'; });
    document.addEventListener('mouseup', e => {
      if (!isDragging) return;
      isDragging = false;
      track.style.cursor = '';
      const diff = e.clientX - startX;
      if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
    });

    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) goTo(diff < 0 ? index + 1 : index - 1);
    });

    // Auto-advance
    let autoTimer = setInterval(() => goTo(index < maxIndex ? index + 1 : 0), 5000);
    track.addEventListener('mouseenter', () => clearInterval(autoTimer));
    track.addEventListener('mouseleave', () => { autoTimer = setInterval(() => goTo(index < maxIndex ? index + 1 : 0), 5000); });

    // Resize
    window.addEventListener('resize', () => goTo(index), { passive: true });

    goTo(0);
  }

  /* ================================================================
     7. VIDEO LIGHTBOX
  ================================================================ */
  const lightbox  = $('#video-lightbox');
  const lbBackdrop = $('#lightbox-backdrop');
  const lbClose   = $('#lightbox-close');
  const lbIframe  = $('#lightbox-iframe');

  function openLightbox(videoId) {
    if (!lightbox || !lbIframe) return;
    lbIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    lightbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    lbClose && lbClose.focus();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute('hidden', '');
    if (lbIframe) lbIframe.src = '';
    document.body.style.overflow = '';
  }

  $$('.video-card').forEach(card => {
    const vid = card.dataset.videoId;
    const trigger = () => vid && openLightbox(vid);
    card.addEventListener('click', trigger);
    card.addEventListener('keydown', e => e.key === 'Enter' && trigger());
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
  });

  lbClose   && lbClose.addEventListener('click', closeLightbox);
  lbBackdrop && lbBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => e.key === 'Escape' && !lightbox?.hasAttribute('hidden') && closeLightbox());

  /* ================================================================
     8. SOCIAL PLATFORM TABS
  ================================================================ */
  const spTabs   = $$('.sp-tab');
  const socialGrid = $('#social-grid');

  // Pinterest-mode: add subtle warm tint overlay to images (demo)
  spTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      spTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const platform = tab.dataset.platform;
      if (socialGrid) {
        socialGrid.style.filter = platform === 'pinterest' ? 'saturate(1.15) sepia(0.08)' : '';
        // Swap icons inside hover overlays
        $$('.social-post-hover svg', socialGrid).forEach(svg => {
          // The SVG is already the platform icon from HTML — for Pinterest we'd swap
          // Here we animate in the new state
          svg.parentElement.style.background = platform === 'pinterest'
            ? 'rgba(230,0,35,.45)'
            : 'rgba(20,8,3,.45)';
        });
      }
    });
  });

  /* ================================================================
     9. HERO IMAGE PARALLAX (subtle)
  ================================================================ */
  const heroBg = $('.ab-hero-img');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      heroBg.style.transform = `translateY(${scrolled * 0.25}px)`;
    }, { passive: true });
  }

})();
