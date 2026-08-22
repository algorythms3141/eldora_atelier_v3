/* ================================================================
   ELDORA ATELIER — service.js
   Services listing: fetch, render cards, detail modal, WhatsApp enquiry
   ================================================================ */

(function () {
  'use strict';

  let whatsappNumber = '919876543210';
  let services = [];
  let activeServiceId = null;
  let activeThumbIdx  = 0;

  /* ── Helpers ── */
  const $ = s => document.querySelector(s);
  const escHtml = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtPrice = v => v ? '₹' + Number(v).toLocaleString('en-IN') : null;

  /* ── Fetch settings for WhatsApp number ── */
  async function fetchSettings() {
    try {
      const res  = await fetch('api/settings_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_public_settings' })
      });
      const data = await res.json();
      if (data.success && data.settings.contact_number1) {
        whatsappNumber = data.settings.contact_number1.replace(/\+/g, '');
      }
    } catch (e) { /* use default */ }
  }

  /* ── Fetch services ── */
  async function fetchServices() {
    const grid = document.getElementById('svc-grid');
    grid.innerHTML = '<div class="svc-loading">Loading services…</div>';
    try {
      const res  = await fetch('api/services_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_services' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      services = data.services || [];
      renderGrid();
      document.getElementById('svc-count').textContent =
        services.length === 0 ? '' :
        services.length === 1 ? '1 Service' : services.length + ' Services';
    } catch (e) {
      grid.innerHTML = '<div class="svc-empty"><p>Could not load services. Please try again later.</p></div>';
    }
  }

  function renderGrid() {
    const grid = document.getElementById('svc-grid');
    if (!services.length) {
      grid.innerHTML = `
        <div class="svc-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7A9088" stroke-width="1.2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p>No services available yet.</p>
          <small>Check back soon.</small>
        </div>`;
      return;
    }

    grid.innerHTML = services.map(s => {
      const photos = s.photo_urls ? s.photo_urls.split('|').filter(Boolean).map(p => '.' + p) : [];
      const imgHtml = photos[0]
        ? `<img src="${photos[0]}" alt="${escHtml(s.title)}" loading="lazy">`
        : `<div class="svc-card-img-placeholder"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#b09280" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
      const priceHtml = fmtPrice(s.starting_price)
        ? `<div class="svc-card-price">${fmtPrice(s.starting_price)} <span>starting</span></div>`
        : '';

      return `
        <article class="svc-card" data-id="${s.id}">
          <div class="svc-card-img-wrap">${imgHtml}</div>
          <div class="svc-card-body">
            <h2 class="svc-card-title">${escHtml(s.title)}</h2>
            ${s.summary ? `<p class="svc-card-summary">${escHtml(s.summary)}</p>` : ''}
            <div class="svc-card-footer">
              ${priceHtml}
              <button class="svc-card-btn" onclick="openService(${s.id})">
                View Details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  /* ── Modal ── */
  window.openService = function (id) {
    const s = services.find(x => Number(x.id) === Number(id));
    if (!s) return;
    activeServiceId = id;
    activeThumbIdx  = 0;

    const photos = s.photo_urls ? s.photo_urls.split('|').filter(Boolean).map(p => '.' + p) : [];

    /* Gallery */
    const gallery = document.getElementById('modal-gallery');
    if (photos.length) {
      gallery.innerHTML = `<img id="modal-main-img" src="${photos[0]}" alt="${escHtml(s.title)}">
        <button class="svc-modal-close" id="modal-close-btn" aria-label="Close">&times;</button>`;
    } else {
      gallery.innerHTML = `<div class="svc-modal-gallery-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f0ddc7" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <button class="svc-modal-close" id="modal-close-btn" aria-label="Close">&times;</button>`;
    }

    /* Thumbnails */
    const thumbsWrap = document.getElementById('modal-thumbs');
    if (photos.length > 1) {
      thumbsWrap.style.display = 'flex';
      thumbsWrap.innerHTML = photos.map((url, i) =>
        `<div class="svc-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}">
           <img src="${url}" alt="photo ${i+1}">
         </div>`
      ).join('');
      thumbsWrap.querySelectorAll('.svc-thumb').forEach(t => {
        t.addEventListener('click', () => setThumb(Number(t.dataset.idx), photos));
      });
    } else {
      thumbsWrap.style.display = 'none';
      thumbsWrap.innerHTML = '';
    }

    /* Text */
    document.getElementById('modal-eyebrow').textContent = 'ELDORA ATELIER — SERVICE';
    document.getElementById('modal-title').textContent   = s.title || '';
    document.getElementById('modal-price').textContent   = fmtPrice(s.starting_price)
      ? 'Starting from ' + fmtPrice(s.starting_price)
      : '';
    document.getElementById('modal-summary').textContent  = s.summary || '';
    document.getElementById('modal-summary').style.display = s.summary ? 'block' : 'none';
    document.getElementById('modal-desc').textContent    = s.description || '';
    document.getElementById('modal-desc').style.display  = s.description ? 'block' : 'none';

    /* WhatsApp link */
    const msg = `Hi Eldora Atelier, I'm interested in your service: *${s.title}*. Could you please provide more details?`;
    document.getElementById('modal-wa-btn').href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;

    /* Open overlay */
    document.getElementById('svc-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';

    /* Attach close listeners */
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  };

  function setThumb(idx, photos) {
    activeThumbIdx = idx;
    const mainImg = document.getElementById('modal-main-img');
    if (mainImg) { mainImg.style.opacity = '0'; setTimeout(() => { mainImg.src = photos[idx]; mainImg.style.opacity = '1'; }, 200); }
    document.querySelectorAll('.svc-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
  }

  function closeModal() {
    document.getElementById('svc-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
    activeServiceId = null;
  }

  /* ── Header scroll shadow ── */
  const hdr = document.querySelector('header');
  if (hdr) {
    window.addEventListener('scroll', () => {
      hdr.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(15,81,71,.12)'
        : '0 2px 24px rgba(15,81,71,.05)';
    }, { passive: true });
  }

  /* ── Mobile drawer ── */
  const menuBtn = document.querySelector('.menu-btn');
  const drawer  = document.getElementById('mobile-drawer');
  const dClose  = document.getElementById('drawer-close');
  const dOverlay = document.getElementById('drawer-overlay');
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click',  () => { drawer.classList.add('open'); drawer.removeAttribute('aria-hidden'); dOverlay.classList.add('visible'); document.body.style.overflow = 'hidden'; });
    dClose  && dClose.addEventListener('click',   () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); dOverlay.classList.remove('visible'); document.body.style.overflow = ''; });
    dOverlay && dOverlay.addEventListener('click', () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); dOverlay.classList.remove('visible'); document.body.style.overflow = ''; });
  }

  /* ── Modal overlay click/escape ── */
  document.getElementById('svc-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('modal-close-modal-btn').addEventListener('click', closeModal);

  /* ── Init ── */
  fetchSettings();
  fetchServices();

})();
