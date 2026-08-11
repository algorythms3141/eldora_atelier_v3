/* ================================================================
   ELDORA ATELIER — collection.js  (v2)
   - Mobile nav drawer
   - Category filter with fade animation
   - Sort (DOM-level demo)
   - Load more
   ================================================================ */

(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ══════════════════════════════════════════
     1. MOBILE DRAWER
  ══════════════════════════════════════════ */
  const toggle  = $('#menu-toggle');
  const drawer  = $('#mobile-drawer');
  const close   = $('#drawer-close');
  const overlay = $('#drawer-overlay');

  function openDrawer() {
    drawer.classList.add('open');
    drawer.removeAttribute('aria-hidden');
    overlay.classList.add('visible');
    toggle && toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    toggle && toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle  && toggle.addEventListener('click', openDrawer);
  close   && close.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());

  /* ══════════════════════════════════════════
     2. CATEGORY FILTER
  ══════════════════════════════════════════ */
  const tabs       = $$('.cat-tab');
  const cards      = $$('.col-card');
  const emptyEl    = $('#empty-state');
  const lmWrap     = $('#load-more-wrap');

  function activateTab(tab) {
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  }

  function filterCards(filter) {
    let visible = 0;
    cards.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      if (match) {
        card.classList.remove('hidden');
        card.classList.remove('fade-in');
        void card.offsetWidth; // reflow
        card.style.animationDelay = (visible * 55) + 'ms';
        card.classList.add('fade-in');
        visible++;
      } else {
        card.classList.add('hidden');
        card.classList.remove('fade-in');
      }
    });

    if (emptyEl) {
      visible === 0
        ? emptyEl.removeAttribute('hidden')
        : emptyEl.setAttribute('hidden', '');
    }
    if (lmWrap) {
      lmWrap.style.display = visible === 0 ? 'none' : '';
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    activateTab(tab);
    filterCards(tab.dataset.filter);
  }));

  /* ══════════════════════════════════════════
     3. SORT
  ══════════════════════════════════════════ */
  const sortSel = $('#sort-select');
  const grid    = $('#collection-grid');

  function sortCards(method) {
    const active = $$('.col-card:not(.hidden)');
    let ordered;
    switch (method) {
      case 'az':
        ordered = [...active].sort((a,b) =>
          a.querySelector('.card-title').textContent
           .localeCompare(b.querySelector('.card-title').textContent));
        break;
      case 'latest':
        ordered = [...active].reverse();
        break;
      case 'popular':
        ordered = [...active].sort(() => Math.random() - .5);
        break;
      default: // featured
        ordered = [...active].sort((a,b) => +a.dataset.index - +b.dataset.index);
    }
    ordered.forEach(c => grid.appendChild(c));
  }

  sortSel && sortSel.addEventListener('change', () => sortCards(sortSel.value));

  /* ══════════════════════════════════════════
     4. LOAD MORE (demo)
  ══════════════════════════════════════════ */
  const lmBtn = $('#load-more-btn');
  let loadClicks = 0;

  if (lmBtn) {
    lmBtn.addEventListener('click', () => {
      loadClicks++;
      const lbl = lmBtn.querySelector('.lm-label');
      if (loadClicks >= 2) {
        lbl.textContent = 'All Designs Loaded';
        lmBtn.disabled = true;
        lmBtn.style.opacity = '.45';
        lmBtn.style.cursor = 'default';
        return;
      }
      lbl.textContent = 'Loading\u2026';
      lmBtn.disabled = true;
      setTimeout(() => {
        lbl.textContent = 'Load More';
        lmBtn.disabled = false;
        showToast('New designs coming soon. Reach us for custom orders.');
      }, 900);
    });
  }

  /* ── Toast ── */
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
      font:'400 11px Montserrat,sans-serif', letterSpacing:'.06em',
      padding:'13px 26px', border:'1px solid rgba(180,138,82,.4)',
      zIndex:'9999', opacity:'0',
      transition:'opacity .3s ease, transform .3s ease',
      maxWidth:'88vw', textAlign:'center',
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
    }, 3200);
  }

  /* ══════════════════════════════════════════
     5. HEADER SCROLL SHADOW
  ══════════════════════════════════════════ */
  const header = $('#site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(44,18,8,.12)'
        : '0 1px 12px rgba(44,18,8,.06)';
    }, { passive: true });
  }

  /* ── Initial render ── */
  filterCards('all');

})();
