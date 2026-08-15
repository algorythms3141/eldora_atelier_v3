/* ================================================================
   ELDORA ATELIER — collection.js  (v3)
   - Mobile nav drawer
   - Dynamic category and product loading from API
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
  const toggle  = $('.menu-btn');
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
    console.log('Opening collections drawer');
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
    console.log('Closing collections drawer');
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
    console.log('Collections count:', collections.length);
    if (collectionsCount) {
      collectionsCount.textContent = collections.length;
    }
  }

  function renderCollections() {
    const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');
    console.log('Rendering collections:', collections);

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

      // Add remove button listeners
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
    showToast('Removed from collections');
  }

  console.log('Collections button found:', collectionsBtn);
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

      // Create WhatsApp message with all collections
      const message = collections.map(item => {
        return `${item.name} (Size: ${item.selectedSize || 'Not specified'}) - Starting from ₹${item.price}`;
      }).join('\n');

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Hi Eldora Atelier, I'm interested in enquiring about these designs from my collections:\n\n${message}\n\nPlease provide more details.`
      )}`;

      window.open(whatsappUrl, '_blank');
    });
  }

  // Update collections count on page load
  updateCollectionsCount();

  // Fetch settings on page load
  fetchSettings();

  /* ══════════════════════════════════════════
     2. DYNAMIC DATA LOADING
  ══════════════════════════════════════════ */
  let categories = [];
  let products = [];
  const tabsContainer = $('#cat-tabs');
  const grid = $('#collection-grid');
  const emptyEl = $('#empty-state');
  const lmWrap = $('#load-more-wrap');

  // Load categories from API
  async function loadCategories() {
    try {
      const response = await fetch('api/products_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_categories' })
      });
      const data = await response.json();
      if (data.success) {
        categories = data.categories;
        renderCategoryTabs();
        loadProducts();
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  // Load products from API
  async function loadProducts(categoryId = null) {
    try {
      const body = { action: 'get_products' };
      if (categoryId) body.category_id = categoryId;
      
      const response = await fetch('api/products_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        products = data.products;
        renderProducts();
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }

  // Render category tabs dynamically
  function renderCategoryTabs() {
    if (!tabsContainer) return;
    
    // Keep "All Designs" tab
    let html = `
      <button class="cat-tab active" role="tab" aria-selected="true" data-filter="all" id="tab-all">
        All Designs
      </button>
    `;
    
    // Add dynamic category tabs
    categories.forEach((cat, index) => {
      const filterValue = cat.name.toLowerCase().replace(/\s+/g, '-');
      html += `
        <button class="cat-tab" role="tab" aria-selected="false" data-filter="${filterValue}" data-category-id="${cat.id}" id="tab-${filterValue}">
          ${cat.name}
        </button>
      `;
    });
    
    tabsContainer.innerHTML = html;
    
    // Re-attach event listeners
    attachTabListeners();
  }

  // Render products dynamically
  function renderProducts() {
    if (!grid) return;
    
    if (products.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.removeAttribute('hidden');
      if (lmWrap) lmWrap.style.display = 'none';
      return;
    }
    
    let html = '';
    products.forEach((product, index) => {
      const images = product.images_urls ? product.images_urls.split('|') : [];
      const thumbnail = '.'+images[0] || 'card-latest.png';
      const categoryName = product.category_name || 'Designs';
      const filterValue = categoryName.toLowerCase().replace(/\s+/g, '-');
      const sizes = product.available_sizes ? product.available_sizes.split('|').join(', ') : '';
      
      html += `
        <article class="col-card" data-category="${filterValue}" data-category-id="${product.category_id}" data-index="${index}" aria-label="${product.name}">
          <a href="product_details.html?id=${product.id}" class="card-link" aria-label="View ${product.name}">
            <figure class="card-figure">
              <img src="${thumbnail}" alt="${product.name}" loading="lazy" />
            </figure>
            <div class="card-overlay" aria-hidden="true"></div>
            <div class="card-body">
              <h2 class="card-title">${product.name}</h2>
              <p class="card-price">Starting from ₹${parseFloat(product.price_from).toFixed(2)}</p>
              ${sizes ? `<p class="card-sizes">${sizes}</p>` : ''}
              <span class="card-cta">View Design <span class="cta-arrow">&#8594;</span></span>
            </div>
          </a>
        </article>
      `;
    });
    
    grid.innerHTML = html;
    
    if (emptyEl) emptyEl.setAttribute('hidden', '');
    if (lmWrap) lmWrap.style.display = '';
  }

  /* ══════════════════════════════════════════
     3. CATEGORY FILTER
  ══════════════════════════════════════════ */
  function attachTabListeners() {
    const tabs = $$('.cat-tab');
    
    function activateTab(tab) {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    }

    function filterCards(filter, categoryId = null) {
      let visible = 0;
      const cards = $$('.col-card');
      
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
      const categoryId = tab.dataset.categoryId;
      if (categoryId) {
        loadProducts(categoryId);
      } else {
        loadProducts(); // Load all products
        filterCards(tab.dataset.filter);
      }
    }));
  }

  /* ══════════════════════════════════════════
     4. SORT
  ══════════════════════════════════════════ */
  const sortSel = $('#sort-select');

  function sortCards(method) {
    const active = $$('.col-card:not(.hidden)');
    let ordered;
    switch (method) {
      case 'price-low-high':
        ordered = [...active].sort((a,b) => {
          const priceA = parseFloat(a.querySelector('.card-price').textContent.replace('₹', '').replace('Starting from', ''));
          const priceB = parseFloat(b.querySelector('.card-price').textContent.replace('₹', '').replace('Starting from', ''));
          return priceA - priceB;
        });
        break;
      case 'price-high-low':
        ordered = [...active].sort((a,b) => {
          const priceA = parseFloat(a.querySelector('.card-price').textContent.replace('₹', '').replace('Starting from', ''));
          const priceB = parseFloat(b.querySelector('.card-price').textContent.replace('₹', '').replace('Starting from', ''));
          return priceB - priceA;
        });
        break;
      case 'az':
        ordered = [...active].sort((a,b) =>
          a.querySelector('.card-title').textContent
           .localeCompare(b.querySelector('.card-title').textContent));
        break;
      case 'za':
        ordered = [...active].sort((a,b) =>
          b.querySelector('.card-title').textContent
           .localeCompare(a.querySelector('.card-title').textContent));
        break;
      default:
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
  const header = $('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(44,18,8,.12)'
        : '0 1px 12px rgba(44,18,8,.06)';
    }, { passive: true });
  }

  /* ── Initial render ── */
  loadCategories();

})();
