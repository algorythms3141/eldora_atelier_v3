/* ================================================================
   ELDORA ATELIER — contact.js
   - Mobile nav drawer
   - Scroll header shadow
   - Scroll reveal (IntersectionObserver)
   - Contact form validation & success state
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

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.removeAttribute('aria-hidden');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    toggle && toggle.setAttribute('aria-expanded', 'true');
  };
  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
    toggle && toggle.setAttribute('aria-expanded', 'false');
  };

  toggle  && toggle.addEventListener('click', openDrawer);
  dclose  && dclose.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => e.key === 'Escape' && closeDrawer());

  /* ══════════════════════════════════════════
     1.5 COLLECTIONS DRAWER
  ══════════════════════════════════════════ */
  let whatsappNumber = '919876543210'; // Default fallback

  // Fetch settings from API and populate all dynamic contact fields
  async function fetchSettings() {
    try {
      const response = await fetch('api/settings_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_public_settings' })
      });
      const data = await response.json();
      if (!data.success) return;

      const s = data.settings;

      /* ── WhatsApp number ── */
      const rawNum = s.contact_number1 || '';
      if (rawNum) {
        whatsappNumber = rawNum.replace(/\+/g, '');
        const waHref  = `https://wa.me/${whatsappNumber}`;
        const numDisplay = rawNum;

        // Cards
        setLink('ct-wa-link',   waHref,          numDisplay + ' →');
        setLink('ct-phone-link', 'tel:' + rawNum, numDisplay + ' →');
        // Detail column
        setLink('ct-detail-phone', 'tel:' + rawNum, numDisplay);
        // Social WhatsApp button
        setLink('ct-wa-social', waHref, null);
        // Footer
        setLink('ft-wa-link',    waHref,          'WhatsApp Us');
        setLink('ft-phone-link', 'tel:' + rawNum, numDisplay);
      }

      /* ── Second number (if set) ── */
      if (s.contact_number2) {
        const num2 = s.contact_number2;
        const detPhone = document.getElementById('ct-detail-phone');
        if (detPhone) {
          detPhone.insertAdjacentHTML('afterend',
            ` / <a href="tel:${num2}">${num2}</a>`);
        }
      }

      /* ── Email ── */
      if (s.email_address) {
        const email = s.email_address;
        setLink('ct-email-link',  'mailto:' + email, email + ' →');
        setLink('ct-detail-email','mailto:' + email, email);
        setLink('ft-email-link',  'mailto:' + email, email);
      }

      /* ── Address ── */
      if (s.address) {
        const addrEl = document.getElementById('ct-detail-address');
        if (addrEl) addrEl.innerHTML = s.address.replace(/\n/g, '<br>');
        const ftAddr = document.getElementById('ft-address-link');
        if (ftAddr) ftAddr.textContent = s.address.split('\n')[0]; // first line only in footer
        // Visit Us card text
        const visitLink = document.getElementById('ct-visit-link');
        if (visitLink) visitLink.textContent = s.address.split('\n')[0] + ' →';
        // Map label
        const mapLabel = document.getElementById('ct-map-label');
        if (mapLabel) mapLabel.textContent = 'Eldora Atelier — ' + s.address.split('\n')[0];
      }

      /* ── Google Maps URL ── */
      if (s.google_map_location_url) {
        setLink('ct-map-link',  s.google_map_location_url, null);
        setLink('ct-visit-link', '#map', null); // keep card pointing to anchor
        const ftAddr = document.getElementById('ft-address-link');
        if (ftAddr) ftAddr.href = s.google_map_location_url;
      }

      /* ── Instagram ── */
      if (s.instagram_link) {
        setLink('ct-ig-link', s.instagram_link, null);
      }

    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  /* Set href (and optionally text) on an element by id */
  function setLink(id, href, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = href;
    if (text !== null) el.textContent = text;
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
  if (hdr) {
    window.addEventListener('scroll', () => {
      hdr.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(44,18,8,.12)'
        : '0 1px 12px rgba(44,18,8,.06)';
    }, { passive: true });
  }

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
     4. CONTACT FORM VALIDATION
  ================================================================ */
  const form    = $('#contact-form');
  const success = $('#form-success');

  if (!form) return;

  const fields = {
    name:    { el: $('#cf-name'),    errEl: $('#cf-name-err'),    validate: v => v.trim().length >= 2, msg: 'Please enter your full name.' },
    email:   { el: $('#cf-email'),   errEl: $('#cf-email-err'),   validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), msg: 'Please enter a valid email address.' },
    type:    { el: $('#cf-type'),    errEl: $('#cf-type-err'),    validate: v => v !== '', msg: 'Please select an enquiry type.' },
    message: { el: $('#cf-message'), errEl: $('#cf-message-err'), validate: v => v.trim().length >= 10, msg: 'Please enter a message (at least 10 characters).' },
  };

  function showError(field, show) {
    if (!field.el || !field.errEl) return;
    if (show) {
      field.el.classList.add('error');
      field.errEl.textContent = field.msg;
    } else {
      field.el.classList.remove('error');
      field.errEl.textContent = '';
    }
  }

  // Live validation: clear error on valid input
  Object.values(fields).forEach(field => {
    if (!field.el) return;
    const evt = field.el.tagName === 'SELECT' ? 'change' : 'input';
    field.el.addEventListener(evt, () => {
      if (field.validate(field.el.value)) showError(field, false);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    let valid = true;
    Object.values(fields).forEach(field => {
      if (!field.el) return;
      const ok = field.validate(field.el.value);
      showError(field, !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      const firstErr = form.querySelector('.error');
      firstErr && firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitBtn = $('#form-submit');
    const btnText   = submitBtn && submitBtn.querySelector('.ct-btn-text');

    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending…';
    }

    try {
      const res  = await fetch('api/contactus_api.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:       'submit_inquiry',
          name:         $('#cf-name').value.trim(),
          email:        $('#cf-email').value.trim(),
          phone:        $('#cf-phone').value.trim(),
          enquiry_type: $('#cf-type').value,
          event:        $('#cf-event').value.trim(),
          message:      $('#cf-message').value.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message);

      form.hidden = true;
      if (success) success.removeAttribute('hidden');

    } catch (err) {
      // Show error inline below the button
      let errBox = $('#cf-submit-err');
      if (!errBox) {
        errBox = document.createElement('p');
        errBox.id = 'cf-submit-err';
        errBox.style.cssText = 'color:#b84040;font:300 12px var(--sans,sans-serif);margin-top:10px';
        submitBtn ? submitBtn.insertAdjacentElement('afterend', errBox) : form.appendChild(errBox);
      }
      errBox.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Send Enquiry';
      }
    }
  });

})();
