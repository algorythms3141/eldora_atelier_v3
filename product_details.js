/* ================================================================
   ELDORA ATELIER — product_details.js
   Dynamic product loading and interactivity
   ================================================================ */

(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ══════════════════════════════════════════
     1. MOBILE DRAWER
  ══════════════════════════════════════════ */
  const toggle = $('.menu-btn');
  const drawer = $('#mobile-drawer');
  const close = $('#drawer-close');
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

  toggle && toggle.addEventListener('click', openDrawer);
  close && close.addEventListener('click', closeDrawer);
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
    showToast('Removed from collections');
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

  /* ══════════════════════════════════════════
     2. PRODUCT DATA LOADING
  ══════════════════════════════════════════ */
  let currentProduct = null;
  let selectedSize = null;

  // Get product ID from URL
  function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  // Load product details from API
  async function loadProductDetails() {
    const productId = getProductIdFromUrl();
    
    if (!productId) {
      showError('Product ID not found in URL');
      return;
    }

    try {
      const response = await fetch('api/products_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_product',
          product_id: productId 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        currentProduct = data.product;
        renderProductDetails(currentProduct);
      } else {
        showError(data.message || 'Failed to load product');
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      showError('An error occurred while loading the product');
    }
  }

  // Render product details
  function renderProductDetails(product) {
    // Set basic info
    $('#product-title').textContent = product.name;
    $('#product-price').textContent = `Starting from ₹${parseFloat(product.price_from).toFixed(2)}`;
    $('#product-description').textContent = product.description || 'No description available.';
    $('#product-category-name').textContent = product.category_name || 'Designs';
    $('#meta-category').textContent = product.category_name || '-';
    
    // Render images
    renderProductImages(product.images_urls);
    
    // Render sizes
    renderSizes(product.available_sizes);
    
    // Update meta sizes
    const sizes = product.available_sizes ? product.available_sizes.split('|').join(', ') : '-';
    $('#meta-sizes').textContent = sizes;
  }

  // Render product images gallery
  function renderProductImages(imagesUrls) {
    const images = imagesUrls ? imagesUrls.split('|') : [];
    const mainImage = $('#main-product-image');
    const thumbnailGallery = $('#thumbnail-gallery');

    if (images.length === 0) {
      mainImage.src = 'card-latest.png';
      thumbnailGallery.innerHTML = '';
      return;
    }

    // Set main image
    mainImage.src = '.' + images[0];

    // Render thumbnails
    thumbnailGallery.innerHTML = images.map((img, index) => `
      <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
        <img src=".${img}" alt="Product image ${index + 1}">
      </div>
    `).join('');

    // Add click handlers for thumbnails
    $$('.thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        mainImage.src = '.' + images[index];
        
        // Update active state
        $$('.thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  // Render size options
  function renderSizes(sizesString) {
    const sizes = sizesString ? sizesString.split('|') : [];
    const sizeOptions = $('#size-options');

    if (sizes.length === 0) {
      $('#size-selection-container').style.display = 'none';
      return;
    }

    sizeOptions.innerHTML = sizes.map(size => `
      <button class="size-chip" data-size="${size}">${size}</button>
    `).join('');

    // Add click handlers for size selection
    $$('.size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedSize = chip.dataset.size;
        
        // Update active state
        $$('.size-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });
  }

  /* ══════════════════════════════════════════
     3. ENQUIRE MODAL
  ══════════════════════════════════════════ */
  const enquireModal = $('#enquire-modal');
  const btnEnquire = $('#btn-enquire');
  const modalClose = $('#modal-close');
  const enquireForm = $('#enquire-form');
  const sizeSelectionContainer = $('#size-selection-container');

  btnEnquire && btnEnquire.addEventListener('click', () => {
    // Check if size selection is required and not selected
    if (sizeSelectionContainer && sizeSelectionContainer.style.display !== 'none' && !selectedSize) {
      showToast('Please select a size before enquiring');
      return;
    }

    // Open WhatsApp with current product details
    if (currentProduct) {
      const message = `Hi Eldora Atelier, I'm interested in enquiring about this design:\n\n${currentProduct.name}\nSize: ${selectedSize || 'Not specified'}\nStarting from ₹${currentProduct.price_from}\n\nPlease provide more details.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  });

  modalClose && modalClose.addEventListener('click', closeEnquireModal);
  enquireModal && enquireModal.addEventListener('click', (e) => {
    if (e.target === enquireModal) {
      closeEnquireModal();
    }
  });

  function closeEnquireModal() {
    enquireModal.classList.remove('active');
    enquireModal.setAttribute('aria-hidden', 'true');
  }

  enquireForm && enquireForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(enquireForm);
    formData.append('product_id', currentProduct?.id || '');
    formData.append('product_name', currentProduct?.name || '');
    formData.append('selected_size', selectedSize || '');

    try {
      // For now, just show success message
      // In production, this would send to a backend endpoint
      showToast('Thank you for your enquiry! We will get back to you soon.');
      closeEnquireModal();
      enquireForm.reset();
    } catch (error) {
      console.error('Failed to submit enquiry:', error);
      showToast('Failed to submit enquiry. Please try again.');
    }
  });

  /* ══════════════════════════════════════════
     4. ADD TO COLLECTIONS
  ══════════════════════════════════════════ */
  const btnAddCollection = $('#btn-add-collection');

  btnAddCollection && btnAddCollection.addEventListener('click', () => {
    // Check if size selection is required and not selected
    if (sizeSelectionContainer && sizeSelectionContainer.style.display !== 'none' && !selectedSize) {
      showToast('Please select a size before adding to collections');
      return;
    }

    // Check if user is logged in (for now, just show message)
    // In production, this would check authentication and add to user's collections
    const collections = JSON.parse(localStorage.getItem('my_collections') || '[]');
    
    if (currentProduct) {
      const exists = collections.some(item => item.id === currentProduct.id);
      
      if (exists) {
        showToast('This design is already in your collections');
      } else {
        collections.push({
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price_from,
          image: currentProduct.images_urls?.split('|')[0] || '',
          selectedSize: selectedSize,
          addedAt: new Date().toISOString()
        });
        
        localStorage.setItem('my_collections', JSON.stringify(collections));
        showToast('Added to your collections!');

        // Update collections count if the button exists
        const collectionsCount = document.querySelector('.collections-count');
        if (collectionsCount) {
          collectionsCount.textContent = collections.length;
        }
      }
    }
  });

  /* ══════════════════════════════════════════
     5. SHARE FUNCTIONALITY
  ══════════════════════════════════════════ */
  const btnShare = $('#btn-share');

  btnShare && btnShare.addEventListener('click', async () => {
    const shareUrl = window.location.href;
    const shareTitle = currentProduct?.name || 'Eldora Atelier Design';
    const shareText = `Check out this beautiful design from Eldora Atelier: ${shareTitle}`;

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share failed:', err);
        // Fallback to clipboard copy
        copyToClipboard(shareUrl);
      }
    } else {
      // Fallback to clipboard copy
      copyToClipboard(shareUrl);
    }
  });

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy link');
    });
  }

  /* ══════════════════════════════════════════
     5. UTILITY FUNCTIONS
  ══════════════════════════════════════════ */
  function showError(message) {
    showToast(message);
  }

  function showToast(message) {
    const old = document.getElementById('ea-toast');
    if (old) old.remove();
    
    const toast = document.createElement('div');
    toast.id = 'ea-toast';
    toast.role = 'status';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '28px',
      left: '50%',
      transform: 'translateX(-50%) translateY(10px)',
      background: '#1e0d07',
      color: '#f0ddc7',
      font: '400 11px Montserrat,sans-serif',
      letterSpacing: '.06em',
      padding: '13px 26px',
      border: '1px solid rgba(180,138,82,.4)',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity .3s ease, transform .3s ease',
      maxWidth: '88vw',
      textAlign: 'center',
    });
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }));
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  /* ══════════════════════════════════════════
     6. HEADER SCROLL SHADOW
  ══════════════════════════════════════════ */
  const header = $('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 8
        ? '0 2px 20px rgba(44,18,8,.12)'
        : '0 1px 12px rgba(44,18,8,.06)';
    }, { passive: true });
  }

  /* ── Initial load ── */
  loadProductDetails();

})();
