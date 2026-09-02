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
  const toggle  = $('.menu-btn');
  const drawer  = $('#mobile-drawer');
  const dclose  = $('#drawer-close');
  const overlay = $('#drawer-overlay');
  const openDrawer  = () => { drawer.classList.add('open'); drawer.removeAttribute('aria-hidden'); overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; toggle && toggle.setAttribute('aria-expanded','true'); };
  const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); overlay.classList.remove('visible'); document.body.style.overflow = ''; toggle && toggle.setAttribute('aria-expanded','false'); };
  toggle  && toggle.addEventListener('click', openDrawer);
  dclose  && dclose.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());

  /* ══════════════════════════════════════════
     1.5 COLLECTIONS DRAWER
  ══════════════════════════════════════════ */
  let whatsappNumber = '919876543210'; // Default fallback

  // Fetch settings from API
  async function fetchSettings() {
    try {
      const response = await fetch('api/settings_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_public_settings' })
      });
      const data = await response.json();
      if (data.success && data.settings.contact_number1) {
        whatsappNumber = data.settings.contact_number1.replace(/\+/g, '');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  const collectionsBtn = document.querySelector('.collections-btn');
  const collectionsDrawer = document.getElementById('collections-drawer');
  const collectionsClose = document.querySelector('.collections-close');
  const collectionsOverlay = document.getElementById('collections-overlay');
  const collectionsItems = document.getElementById('collections-items');
  const collectionsEmpty = document.getElementById('collections-empty');
  const collectionsCount = document.querySelector('.collections-count');
  const btnEnquireCollections = document.getElementById('btn-enquire-collections');

  function openCollectionsDrawer() {
    renderCollections();
    if (collectionsDrawer) {
      collectionsDrawer.classList.add('open');
      collectionsDrawer.removeAttribute('aria-hidden');
    }
    if (collectionsOverlay) {
      collectionsOverlay.classList.add('visible');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeCollectionsDrawer() {
    if (collectionsDrawer) {
      collectionsDrawer.classList.remove('open');
      collectionsDrawer.setAttribute('aria-hidden', 'true');
    }
    if (collectionsOverlay) {
      collectionsOverlay.classList.remove('visible');
    }
    document.body.style.overflow = '';
  }

  function updateCollectionsCount() {
    const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');
    if (collectionsCount) {
      collectionsCount.textContent = collections.length;
    }
  }

  function renderCollections() {
    const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');

    if (collections.length === 0) {
      if (collectionsItems) collectionsItems.style.display = 'none';
      if (collectionsEmpty) collectionsEmpty.style.display = 'flex';
      if (btnEnquireCollections) btnEnquireCollections.style.display = 'none';
      return;
    }

    if (collectionsItems) collectionsItems.style.display = 'block';
    if (collectionsEmpty) collectionsEmpty.style.display = 'none';
    if (btnEnquireCollections) btnEnquireCollections.style.display = 'block';

    if (collectionsItems) {
      collectionsItems.innerHTML = collections.map((item, index) => `
        <div class="collections-item" data-index="${index}">
          <div class="collections-item-image">
            <img src=".${item.image}" alt="${item.name}">
          </div>
          <div class="collections-item-details">
            <div class="collections-item-name">${item.name}</div>
            <div class="collections-item-price">Starting from ₹${item.price}</div>
            ${item.selectedSize ? `<div class="collections-item-size">Size: ${item.selectedSize}</div>` : ''}
            <button class="collections-item-remove" data-index="${index}">Remove</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.collections-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          removeFromCollections(index);
        });
      });
    }
  }

  function removeFromCollections(index) {
    const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');
    collections.splice(index, 1);
    localStorage.setItem('my_collections', JSON.stringify(collections));
    updateCollectionsCount();
    renderCollections();
  }

  if (collectionsBtn) {
    collectionsBtn.addEventListener('click', openCollectionsDrawer);
  }
  if (collectionsClose) {
    collectionsClose.addEventListener('click', closeCollectionsDrawer);
  }
  if (collectionsOverlay) {
    collectionsOverlay.addEventListener('click', closeCollectionsDrawer);
  }
  document.addEventListener('keydown', e => e.key === 'Escape' && closeCollectionsDrawer());

  if (btnEnquireCollections) {
    btnEnquireCollections.addEventListener('click', () => {
      const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');
      if (collections.length === 0) return;

      const message = collections.map(item => {
        return `${item.name} (Size: ${item.selectedSize || 'Not specified'}) - Starting from ₹${item.price}`;
      }).join('\n');

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Hi Eldora Atelier, I'm interested in enquiring about these designs from my collections:\n\n${message}\n\nPlease provide more details.`
      )}`;

      window.open(whatsappUrl, '_blank');
    });
  }

  updateCollectionsCount();
  fetchSettings();

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
  let carouselInitialized = false;
  let autoTimer = null;

  // Load testimonials from API
  async function loadTestimonials() {
    if (!track) return;

    console.log('Loading testimonials from API...');

    // Clear any existing carousel state
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    carouselInitialized = false;

    try {
      const response = await fetch('api/aboutus_api.php?action=get_testimonials');
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);

      if (data.success && data.testimonials.length > 0) {
        renderTestimonials(data.testimonials);
      } else {
        // Fallback to static content if API fails or no testimonials
        console.log('No testimonials found');
        track.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No testimonials available yet.</p>';
      }
    } catch (error) {
      console.error('Failed to load testimonials:', error);
      track.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">Failed to load testimonials.</p>';
    }
  }

  function renderTestimonials(testimonials) {
    if (!track) return;

    // Generate star rating HTML
    function generateStars(count) {
      let stars = '';
      for (let i = 0; i < 5; i++) {
        stars += i < count ? '&#9733;' : '&#9734;';
      }
      return stars;
    }

    // Generate review cards
    track.innerHTML = testimonials.map(testimonial => {
      const initials = testimonial.customer_name.charAt(0).toUpperCase();
      const location = testimonial.customer_location || '';
      const stars = generateStars(testimonial.star_count);

      return `
        <article class="review-card" aria-label="Review by ${testimonial.customer_name}">
          <div class="review-stars" aria-label="${testimonial.star_count} out of 5 stars" aria-hidden="true">${stars}</div>
          <blockquote class="review-text">"${testimonial.review_desc}"</blockquote>
          <div class="review-author">
            <div class="review-avatar" aria-hidden="true">${initials}</div>
            <div>
              <strong class="review-name">${testimonial.customer_name}</strong>
              ${location ? `<span class="review-meta">${location}</span>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Initialize carousel after DOM update
    requestAnimationFrame(() => initCarousel());
  }

  function initCarousel() {
    if (!track || carouselInitialized) return;

    const cards   = $$('.review-card', track);
    if (cards.length === 0) return;

    // Wait for cards to be rendered in DOM
    if (!cards[0] || !cards[0].getBoundingClientRect) {
      setTimeout(() => initCarousel(), 100);
      return;
    }

    const visible = window.innerWidth >= 900 ? 3 : window.innerWidth >= 600 ? 2 : 1;
    let index = 0;
    const maxIndex = Math.max(0, cards.length - visible);

    // Don't initialize carousel if only 1 or fewer cards than visible
    if (cards.length <= visible) {
      prevBtn && (prevBtn.style.display = 'none');
      nextBtn && (nextBtn.style.display = 'none');
      carouselInitialized = true;
      return;
    }

    // Show navigation buttons
    prevBtn && (prevBtn.style.display = '');
    nextBtn && (nextBtn.style.display = '');

    // Clear existing dots
    if (dotsWrap) dotsWrap.innerHTML = '';

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
      if (!cards || cards.length === 0 || !cards[0]) return;
      const cardRect = cards[0].getBoundingClientRect();
      if (!cardRect) return;
      const cardW = cardRect.width + 24; // gap
      index = Math.max(0, Math.min(n, maxIndex));
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
    autoTimer = setInterval(() => goTo(index < maxIndex ? index + 1 : 0), 5000);
    track.addEventListener('mouseenter', () => clearInterval(autoTimer));
    track.addEventListener('mouseleave', () => { 
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(index < maxIndex ? index + 1 : 0), 5000); 
    });

    // Resize
    window.addEventListener('resize', () => goTo(index), { passive: true });

    carouselInitialized = true;
    goTo(0);
  }

  // Load testimonials on page load
  loadTestimonials();

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
