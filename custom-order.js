/* ================================================================
   ELDORA ATELIER — custom-order.js
   Multi-step form logic:
     - Step navigation (next / back)
     - Category card selection
     - File upload with drag-and-drop + previews
     - Size toggle (standard / custom)
     - Form validation
     - Review summary generation
     - WhatsApp message builder
     - Form submission
     - Mobile drawer
   ================================================================ */

(function () {
  'use strict';

  let whatsappNumber = '919876543210'; // Default fallback

  // co_categories loaded from API: [{ id, name, description, measurements: [{id, name}] }]
  let coCategories = [];

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

  // Fetch custom-order categories + measurements from API
  async function fetchCoCategories() {
    try {
      const response = await fetch('api/admin_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'co_public_get_categories' })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.categories)) {
        coCategories = data.categories;
      }
    } catch (e) {
      console.error('Failed to fetch co_categories:', e);
    }
    renderCategoryCards();
  }

  // SVG icons cycled by index (one per card slot)
  const CAT_ICONS = [
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17l4 4 4-4v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z"/></svg>`,
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  ];

  function renderCategoryCards() {
    const grid    = document.getElementById('cat-grid');
    const loading = document.getElementById('cat-loading');
    if (!grid) return;

    if (!coCategories.length) {
      if (loading) loading.textContent = 'No categories available yet.';
      return;
    }

    if (loading) loading.remove();

    grid.innerHTML = coCategories.map((cat, idx) => {
      // Use category's description if present, otherwise a generic subtitle
      const sub = cat.description ? cat.description : 'Custom bespoke garments';
      const icon = CAT_ICONS[idx % CAT_ICONS.length];
      const safeId = 'cat-' + cat.id;
      return `
        <label class="cat-card" id="${safeId}">
          <input type="radio" name="category" value="${cat.id}" aria-label="${escHtml(cat.name)}" />
          <div class="cat-card-inner">
            <div class="cat-icon" aria-hidden="true">${icon}</div>
            <span class="cat-name">${escHtml(cat.name)}</span>
            <span class="cat-sub">${escHtml(sub)}</span>
          </div>
          <span class="cat-check" aria-hidden="true">&#10003;</span>
        </label>`;
    }).join('');

    // Re-attach the category error-clear listener for the new inputs
    $$('input[name="category"]').forEach(radio => {
      radio.addEventListener('change', () => {
        hide($('#err-category'));
        onCategoryChange(radio.value);
      });
    });
  }

  // Called whenever a category radio changes — rebuild the custom-panel fields
  function onCategoryChange(categoryId) {
    const cat = coCategories.find(c => String(c.id) === String(categoryId));
    renderMeasureGrid(cat ? cat.measurements : []);
  }

  // Render dynamic measurement inputs inside #measure-grid
  function renderMeasureGrid(measurements) {
    const grid = document.getElementById('measure-grid');
    if (!grid) return;

    if (!measurements || measurements.length === 0) {
      // No measurements configured for this category — show a generic note
      grid.innerHTML = `
        <div class="co-field-group" style="grid-column:span 2">
          <p style="font:300 12px var(--sans,sans-serif);color:var(--muted,#888);padding:10px 0;">
            No specific measurements required for this category. Our team will contact you to take measurements.
          </p>
        </div>`;
      return;
    }

    const isOdd = measurements.length % 2 !== 0;

    grid.innerHTML = measurements.map((m, i) => {
      const fieldId  = 'cm-' + m.id;
      const fieldName = 'custom_measurement_' + m.id;
      // Last field gets full width if total count is odd
      const spanStyle = (isOdd && i === measurements.length - 1) ? ' style="grid-column:span 2"' : '';
      return `
        <div class="co-field-group"${spanStyle}>
          <label class="co-label" for="${fieldId}">
            ${escHtml(m.name)} <span class="unit">(inches)</span>
          </label>
          <input class="co-input" type="number" id="${fieldId}" name="${fieldName}"
                 min="0" max="120" step="0.5" placeholder="e.g. 36" />
        </div>`;
    }).join('') + `
      <div class="co-field-group" style="grid-column:span 2">
        <label class="co-label" for="m-fit-notes">Additional Fit Notes <span class="optional">(optional)</span></label>
        <input class="co-input" type="text" id="m-fit-notes" name="fit_notes"
               placeholder="e.g. slightly relaxed at waist, longer blouse length…" />
      </div>`;
  }

  // Simple HTML escaper used by renderCategoryCards / renderMeasureGrid
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Helpers ── */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const show = el => el && el.removeAttribute('hidden');
  const hide = el => el && el.setAttribute('hidden', '');
  const val  = id => { const el = $(id); return el ? el.value.trim() : ''; };

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
  fetchCoCategories();

  /* ================================================================
     2. STEP MANAGEMENT
  ================================================================ */
  const TOTAL_STEPS = 5;
  let currentStep = 1;

  const progressFill = $('#co-progress-fill');
  const progressBar  = $('#co-progress');

  function goToStep(n) {
    const prevFieldset = $(`#step-${currentStep}`);
    const nextFieldset = $(`#step-${n}`);

    if (!nextFieldset) return;

    if (prevFieldset) {
      prevFieldset.classList.remove('active');
    }
    // Force animation restart so upload zone (and all step content) renders
    // correctly on every visit — not just the first time forward.
    nextFieldset.style.animation = 'none';
    nextFieldset.offsetHeight; // trigger reflow
    nextFieldset.style.animation = '';
    nextFieldset.classList.add('active');
    currentStep = n;

    // Update progress
    const pct = Math.round((n / TOTAL_STEPS) * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressBar)  progressBar.setAttribute('aria-valuenow', pct);

    // Build review on step 5
    if (n === 5) buildReview();

    // Scroll to form top smoothly
    const wrap = $('.co-form-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Next buttons ── */
  $$('.co-btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const validates = btn.dataset.validates;
      const target    = parseInt(btn.dataset.target || currentStep + 1);

      // Validate before proceeding
      if (validates === 'category' && !validateCategory()) return;
      if (validates === 'contact' && !validateContact()) return;

      goToStep(target || currentStep + 1);
    });
  });

  /* ── Back buttons ── */
  $$('.co-btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.target);
      if (target) goToStep(target);
    });
  });

  /* ================================================================
     3. VALIDATION
  ================================================================ */
  function validateCategory() {
    const selected = $('input[name="category"]:checked');
    const errEl    = $('#err-category');
    if (!selected) {
      show(errEl);
      // Shake the grid
      const grid = $('.cat-grid');
      if (grid) { grid.classList.add('shake'); setTimeout(() => grid.classList.remove('shake'), 500); }
      return false;
    }
    hide(errEl);
    return true;
  }

  function validateContact() {
    let valid = true;

    const name  = val('#f-name');
    const phone = val('#f-phone');
    const errN  = $('#err-name');
    const errP  = $('#err-phone');

    if (!name) { show(errN); $('#f-name').classList.add('error'); valid = false; }
    else        { hide(errN); $('#f-name').classList.remove('error'); }

    if (!phone || phone.replace(/\D/g,'').length < 7) {
      show(errP); $('#f-phone').classList.add('error'); valid = false;
    } else {
      hide(errP); $('#f-phone').classList.remove('error');
    }

    return valid;
  }

  function validateTerms() {
    const chk  = $('#chk-terms');
    const errT = $('#err-terms');
    if (!chk || !chk.checked) { show(errT); return false; }
    hide(errT);
    return true;
  }

  /* ── Clear errors on input ── */
  ['#f-name','#f-phone'].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('input', () => {
      el.classList.remove('error');
      const errId = sel === '#f-name' ? '#err-name' : '#err-phone';
      hide($(errId));
    });
  });

  /* ── Clear category error on selection ── */
  $$('input[name="category"]').forEach(radio => {
    radio.addEventListener('change', () => hide($('#err-category')));
  });

  /* ================================================================
     4. FILE UPLOAD — drag & drop + previews
  ================================================================ */
  const uploadZone    = $('#upload-zone');
  const fileInput     = $('#file-input');
  const previewWrap   = $('#upload-preview');
  let uploadedFiles   = [];

  if (uploadZone && fileInput) {
    // Click to browse — handled by the native input (position:absolute overlay)

    // Drag events
    ['dragenter','dragover'].forEach(evt => {
      uploadZone.addEventListener(evt, e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    });
    ['dragleave','dragend','drop'].forEach(evt => {
      uploadZone.addEventListener(evt, e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); });
    });
    uploadZone.addEventListener('drop', e => {
      const files = [...(e.dataTransfer?.files || [])];
      processFiles(files);
    });

    // Input change
    fileInput.addEventListener('change', () => {
      processFiles([...fileInput.files]);
      fileInput.value = ''; // reset so same file can be re-added
    });

    // Keyboard access
    uploadZone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
  }

  const MAX_UPLOAD_FILES = 5;

  function processFiles(files) {
    const MAX_SIZE = 10 * 1024 * 1024;
    const allowed  = ['image/jpeg','image/png','image/webp'];

    files.forEach(file => {
      if (uploadedFiles.length >= MAX_UPLOAD_FILES) {
        showToast(`Maximum ${MAX_UPLOAD_FILES} images allowed.`);
        return;
      }
      if (!allowed.includes(file.type)) { showToast(`"${file.name}" is not a supported type — use JPG, PNG or WebP.`); return; }
      if (file.size > MAX_SIZE)         { showToast(`"${file.name}" exceeds the 10 MB limit.`); return; }
      if (uploadedFiles.find(f => f.name === file.name && f.size === file.size)) return; // dedupe
      uploadedFiles.push(file);
      addThumb(file);
    });
  }

  function addThumb(file) {
    if (!previewWrap) return;
    const thumb = document.createElement('div');
    thumb.className = 'upload-thumb';
    thumb.dataset.name = file.name;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        thumb.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF icon placeholder
      const icon = document.createElement('div');
      icon.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;font:600 10px Montserrat,sans-serif;color:#c9a870;';
      icon.textContent = 'PDF';
      thumb.appendChild(icon);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'upload-thumb-name';
    nameEl.textContent = file.name;
    thumb.appendChild(nameEl);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'upload-thumb-remove';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '&#10005;';
    removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      uploadedFiles = uploadedFiles.filter(f => !(f.name === file.name && f.size === file.size));
      thumb.remove();
    });
    thumb.appendChild(removeBtn);

    previewWrap.appendChild(thumb);
  }

  /* ================================================================
     5. SIZE TOGGLE
  ================================================================ */
  const toggleBtns = $$('.size-toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.panel;
      $$('.size-panel').forEach(p => p.classList.toggle('hidden', p.id !== target));
    });
  });

  /* ================================================================
     6. REVIEW SUMMARY
  ================================================================ */
  const BUDGET_LABELS = {
    'below-25k':   'Below ₹25,000',
    '25k-50k':     '₹25,000 – ₹50,000',
    '50k-1L':      '₹50,000 – ₹1 Lakh',
    'above-1L':    'Above ₹1 Lakh',
  };

  // Collect all filled custom measurement values from the dynamic fields
  function collectCustomMeasurements() {
    const cat = coCategories.find(
      c => String(c.id) === String($('input[name="category"]:checked')?.value)
    );
    if (!cat || !cat.measurements.length) return [];

    return cat.measurements
      .map(m => {
        const v = val('#cm-' + m.id);
        return v ? { label: m.name, value: v } : null;
      })
      .filter(Boolean);
  }

  function buildReview() {
    const card = $('#review-card');
    if (!card) return;

    const categoryId  = $('input[name="category"]:checked')?.value || '';
    const catObj      = coCategories.find(c => String(c.id) === String(categoryId));
    const catLabel    = catObj ? catObj.name : (categoryId || '—');
    const designDesc  = val('#design-desc') || '—';
    const sizeMethod  = $('#toggle-custom')?.classList.contains('active') ? 'custom' : 'standard';
    const stdSize     = $('input[name="std_size"]:checked')?.value || '';
    const name        = val('#f-name') || '—';
    const phone       = val('#f-phone') || '—';
    const email       = val('#f-email') || '—';
    const eventDate   = val('#f-event') || '—';
    const notes       = val('#f-notes') || '—';
    const budget      = $('input[name="budget"]:checked')?.value || '—';
    const fitNotes    = val('#m-fit-notes');

    let sizeVal = '';
    if (sizeMethod === 'standard') {
      sizeVal = stdSize ? `Standard — ${stdSize}` : '—';
    } else {
      const customFields = collectCustomMeasurements();
      if (customFields.length) {
        sizeVal = 'Custom — ' + customFields.map(f => `${f.label}: ${f.value}"`).join(' / ');
        if (fitNotes) sizeVal += ` (${fitNotes})`;
      } else {
        sizeVal = 'Custom measurements (contact for details)';
      }
    }

    const filesVal = uploadedFiles.length
      ? uploadedFiles.map(f => f.name).join(', ')
      : 'None uploaded';

    const rows = [
      ['Category',    catLabel],
      ['Design Desc', designDesc.length > 80 ? designDesc.slice(0,80) + '…' : designDesc],
      ['Files',       filesVal],
      ['Size',        sizeVal],
      ['Name',        name],
      ['Phone',       phone],
      ['Email',       email],
      ['Event Date',  eventDate],
      ['Budget',      BUDGET_LABELS[budget] || budget],
      ['Notes',       notes.length > 100 ? notes.slice(0,100) + '…' : notes],
    ];

    card.innerHTML = rows.map(([k, v]) => `
      <div class="review-row">
        <span class="review-key">${k}</span>
        <span class="review-val">${v}</span>
      </div>
    `).join('');

    // Build WhatsApp link
    buildWaLink({ category: catLabel, name, phone, size: sizeVal, notes });
  }

  function buildWaLink({ category, name, phone, size, notes }) {
    const msg = [
      `*ELDORA ATELIER — Custom Order Request*`,
      ``,
      `*Name:* ${name}`,
      `*Phone:* ${phone}`,
      `*Category:* ${category}`,
      `*Size:* ${size}`,
      notes !== '—' ? `*Notes:* ${notes}` : null,
      ``,
      `Sent via eldoraatelier.com`,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    const waBtn = $('#whatsapp-btn');
    if (waBtn) waBtn.href = url;
    const successWa = $('#success-wa');
    if (successWa) successWa.href = url;
  }

  /* ================================================================
     7. FORM SUBMISSION
  ================================================================ */
  const form      = $('#custom-order-form');
  const submitBtn = $('#submit-form');
  const successEl = $('#co-success');

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateTerms()) return;

      if (!submitBtn) return;

      // Disable button + show loading state
      submitBtn.disabled = true;
      const origHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-4.22-7.65"/></svg>
        Submitting…
      </span>`;

      try {
        /* ── Build FormData ── */
        const fd = new FormData();
        fd.append('action',        'submit_order');

        // Category
        const categoryId  = $('input[name="category"]:checked')?.value || '';
        const catObj      = coCategories.find(c => String(c.id) === String(categoryId));
        fd.append('category_id',   categoryId);
        fd.append('category_name', catObj ? catObj.name : '');

        // Customer
        fd.append('name',       val('#f-name'));
        fd.append('phone',      val('#f-phone'));
        fd.append('email',      val('#f-email'));
        fd.append('event_date', val('#f-event'));

        // Design
        fd.append('design_desc', val('#design-desc'));

        // Size
        const sizeMethod = $('#toggle-custom')?.classList.contains('active') ? 'custom' : 'standard';
        fd.append('size_method', sizeMethod);
        fd.append('std_size',    $('input[name="std_size"]:checked')?.value || '');
        fd.append('fit_notes',   val('#m-fit-notes') || '');

        // Custom measurements as JSON array
        const measurements = collectCustomMeasurements();
        fd.append('measurements', JSON.stringify(measurements));

        // Budget + notes
        fd.append('budget', $('input[name="budget"]:checked')?.value || '');
        fd.append('notes',  val('#f-notes'));

        // Images (up to MAX_UPLOAD_FILES)
        const imagesToSend = uploadedFiles.slice(0, MAX_UPLOAD_FILES);
        fd.append('image_count', imagesToSend.length);
        imagesToSend.forEach((file, i) => fd.append(`image_${i}`, file));

        /* ── POST to API ── */
        const response = await fetch('api/custom_orders_api.php', {
          method: 'POST',
          body:   fd
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Submission failed. Please try again.');
        }

        // Non-fatal image warnings (some files may have been rejected server-side)
        if (data.warnings && data.warnings.length) {
          data.warnings.forEach(w => console.warn('Upload warning:', w));
        }

        /* ── Show success ── */
        $$('.co-fieldset').forEach(fs => fs.classList.remove('active'));
        if (successEl) {
          successEl.removeAttribute('hidden');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        spawnConfetti();

      } catch (err) {
        // Re-enable button so user can retry
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
        showToast(err.message || 'Something went wrong. Please try again.');
      }
    });
  }

  /* ── Spin keyframe ── */
  const spinStyle = document.createElement('style');
  spinStyle.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} .shake{animation:shake .4s ease;}';
  document.head.appendChild(spinStyle);

  /* ================================================================
     8. CONFETTI (subtle gold dots on success)
  ================================================================ */
  function spawnConfetti() {
    const colors = ['#e0c080','#c9a870','#b48a52','#f5ede2','#6b1a2a'];
    for (let i = 0; i < 50; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 7 + 4;
      Object.assign(dot.style, {
        position:     'fixed',
        left:         Math.random() * 100 + 'vw',
        top:          '-10px',
        width:        size + 'px',
        height:       size + 'px',
        borderRadius: Math.random() > .5 ? '50%' : '2px',
        background:   colors[Math.floor(Math.random() * colors.length)],
        opacity:      Math.random() * .8 + .2,
        pointerEvents:'none',
        zIndex:       9999,
        transition:   `top ${1.2 + Math.random() * 1.2}s ease ${Math.random() * .6}s, opacity .5s ease ${1.6 + Math.random()}s`,
      });
      document.body.appendChild(dot);
      requestAnimationFrame(() => {
        dot.style.top = (90 + Math.random() * 20) + 'vh';
        dot.style.opacity = '0';
        setTimeout(() => dot.remove(), 3000);
      });
    }
  }

  /* ================================================================
     9. SCROLL HEADER SHADOW
  ================================================================ */
  const hdr = $('#site-header');
  if (hdr) {
    window.addEventListener('scroll', () => {
      hdr.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(44,18,8,.12)'
        : '0 1px 12px rgba(44,18,8,.06)';
    }, { passive: true });
  }

  /* ================================================================
     10. TOAST
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
      padding:'12px 24px', border:'1px solid rgba(180,138,82,.4)',
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

})();
