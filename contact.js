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
  const toggle  = $('#menu-toggle');
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

  form.addEventListener('submit', e => {
    e.preventDefault();

    let valid = true;
    Object.values(fields).forEach(field => {
      if (!field.el) return;
      const ok = field.validate(field.el.value);
      showError(field, !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      // Scroll to first error
      const firstErr = form.querySelector('.error');
      firstErr && firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Simulate successful submission (no real back-end)
    const submitBtn = $('#form-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.querySelector('.ct-btn-text').textContent = 'Sending…';
    }

    setTimeout(() => {
      form.hidden = true;
      if (success) success.removeAttribute('hidden');
      if (submitBtn) submitBtn.disabled = false;
    }, 800);
  });

})();
