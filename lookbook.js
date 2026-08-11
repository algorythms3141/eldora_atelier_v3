/* ================================================================
   ELDORA ATELIER — lookbook.js
   - Mobile nav drawer
   - Scroll reveal (IntersectionObserver)
   - Filter tab system (All / Trends / Style Guides / Articles)
   - Featured article category sync
   - Articles load more
   - Newsletter form
   - Header scroll shadow
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
     2. HEADER SCROLL SHADOW
  ================================================================ */
  const hdr = $('#site-header');
  if (hdr) window.addEventListener('scroll', () => {
    hdr.style.boxShadow = window.scrollY > 8 ? '0 2px 20px rgba(44,18,8,.12)' : '0 1px 12px rgba(44,18,8,.06)';
  }, { passive: true });

  /* ================================================================
     3. SCROLL REVEAL
  ================================================================ */
  const revealEls = $$('.reveal-up, .reveal-left');
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        ro.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  revealEls.forEach(el => ro.observe(el));

  /* ================================================================
     4. FILTER TABS
  ================================================================ */
  const tabs    = $$('.lb-tab');
  const cards   = $$('.lb-card');
  const featured = $('#lb-featured');
  const styleGuides = $$('.style-guide');
  const articleCards = $$('.article-card');
  const emptyEl  = $('#lb-empty');
  const countEl  = $('#lb-count');

  function setCount(n) {
    if (countEl) countEl.textContent = `${n} piece${n !== 1 ? 's' : ''}`;
  }

  function filterAll(filter) {
    // Grid cards
    let visible = 0;
    cards.forEach((card, i) => {
      const match = filter === 'all' || card.dataset.category === filter;
      if (match) {
        card.classList.remove('hidden', 'fade-in');
        void card.offsetWidth;
        card.style.animationDelay = (visible * 50) + 'ms';
        card.classList.add('fade-in');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });

    // Featured article
    if (featured) {
      const featCat = featured.dataset.category;
      const featMatch = filter === 'all' || featCat === filter;
      featured.style.display = featMatch ? '' : 'none';
      if (featMatch) visible++;
    }

    // Style Guides section
    styleGuides.forEach(sg => {
      const match = filter === 'all' || filter === 'style';
      sg.style.display = match ? '' : 'none';
    });
    const styleSection = $('#style-section');
    if (styleSection) styleSection.style.display = (filter === 'all' || filter === 'style') ? '' : 'none';

    // Articles section
    const articlesSection = $('#articles-section');
    articleCards.forEach(ac => {
      const match = filter === 'all' || ac.dataset.category === filter || ac.dataset.category === 'article';
      ac.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    if (articlesSection) articlesSection.style.display = (filter === 'all' || filter === 'article' || filter === 'trends') ? '' : 'none';

    // Empty state
    if (emptyEl) {
      visible === 0 ? emptyEl.removeAttribute('hidden') : emptyEl.setAttribute('hidden', '');
    }

    setCount(visible + styleGuides.length);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      filterAll(tab.dataset.filter);
    });
  });

  // Initial count
  setCount(cards.length + 1 + styleGuides.length + articleCards.length);

  /* ================================================================
     5. LOAD MORE ARTICLES
  ================================================================ */
  const lmBtn = $('#articles-load-more');
  let lmClicks = 0;

  if (lmBtn) {
    lmBtn.addEventListener('click', () => {
      lmClicks++;
      lmBtn.textContent = 'Loading\u2026';
      lmBtn.disabled = true;
      setTimeout(() => {
        if (lmClicks >= 2) {
          lmBtn.textContent = 'All Articles Loaded';
          lmBtn.style.opacity = '.45';
          lmBtn.style.cursor = 'default';
          showToast('You\'ve reached the end — new articles coming every month.');
        } else {
          lmBtn.textContent = 'Load More Articles';
          lmBtn.disabled = false;
          showToast('New articles coming soon. Subscribe to be notified first!');
        }
      }, 900);
    });
  }

  /* ================================================================
     6. NEWSLETTER FORM
  ================================================================ */
  const nlForm = $('#lb-nl-form');
  const nlBtn  = $('#lb-nl-submit');

  if (nlForm) {
    nlForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#lb-nl-email')?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address.');
        return;
      }
      if (nlBtn) { nlBtn.textContent = 'Subscribing\u2026'; nlBtn.disabled = true; }
      setTimeout(() => {
        showToast('You\'re on the list! The Eldora Edit arrives in your inbox monthly.');
        if (nlBtn) { nlBtn.textContent = 'Subscribed ✓'; nlBtn.style.background = '#4a7c59'; }
        const input = $('#lb-nl-email');
        if (input) { input.value = ''; input.disabled = true; }
      }, 900);
    });
  }

  /* ================================================================
     7. HERO STRIP — hover scale (CSS handles it, JS for accessibility)
  ================================================================ */
  $$('.lb-strip-item').forEach(item => {
    item.setAttribute('role','img');
    item.setAttribute('aria-hidden','true');
  });

  /* ================================================================
     8. TOAST
  ================================================================ */
  function showToast(msg) {
    const old = document.getElementById('ea-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'ea-toast';
    t.role = 'status';
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'28px', left:'50%',
      transform:'translateX(-50%) translateY(10px)',
      background:'#1e0d07', color:'#f0ddc7',
      font:'400 11px Montserrat,sans-serif', letterSpacing:'.05em',
      padding:'13px 26px', border:'1px solid rgba(180,138,82,.4)',
      zIndex:'9999', opacity:'0',
      transition:'opacity .3s ease, transform .3s ease',
      maxWidth:'88vw', textAlign:'center', borderRadius:'3px',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    }));
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => t.remove(), 350);
    }, 3500);
  }

  /* ================================================================
     9. SMOOTH SCROLL FOR ANCHOR LINKS
  ================================================================ */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = link.getAttribute('href');
      if (target === '#') return;
      const el = document.querySelector(target);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
