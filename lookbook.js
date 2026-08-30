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
     4. FILTER TABS (REMOVED - Page now shows only articles)
  ================================================================ */

  /* ================================================================
     5. LOAD MORE ARTICLES (Dynamic from/articles_api.php)
  ================================================================ */
  const articlesList = $('#articles-list');
  const lmBtn = $('#articles-load-more');
  let articleOffset = 0;
  const articleLimit = 7;
  let totalArticles = 0;
  let isLoading = false;

  async function loadArticles(offset = 0, append = false) {
    if (isLoading) return;
    isLoading = true;

    console.log(`loadArticles called: offset=${offset}, append=${append}`);

    if (lmBtn) {
      lmBtn.textContent = 'Loading\u2026';
      lmBtn.disabled = true;
    }

    const url = `api/articles_api.php?action=get_articles&offset=${offset}&limit=${articleLimit}`;
    console.log('Fetching from:', url);

    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        totalArticles = data.total;
        const articles = data.articles;
        console.log(`Loaded ${articles.length} articles, total: ${totalArticles}`);

        if (!append && articlesList) {
          articlesList.innerHTML = '';
        }

        if (articles.length > 0) {
          articles.forEach((article, index) => {
            const articleCard = createArticleCard(article, append ? index : index);
            if (articlesList) {
              articlesList.appendChild(articleCard);
            }
          });

          articleOffset += articles.length;

          // Update load more button
          if (lmBtn) {
            if (articleOffset >= totalArticles) {
              lmBtn.textContent = 'All Articles Loaded';
              lmBtn.style.opacity = '.45';
              lmBtn.style.cursor = 'default';
              lmBtn.disabled = true;
            } else {
              lmBtn.textContent = 'Load More Articles';
              lmBtn.disabled = false;
            }
          }

          // Trigger reveal for new articles
          const newCards = articlesList.querySelectorAll('.article-card:not(.revealed)');
          newCards.forEach(card => ro.observe(card));
        } else if (!append && articlesList) {
          articlesList.innerHTML = '<p class="lb-empty" style="text-align:center;padding:40px;color:#888;">No articles available yet.</p>';
          if (lmBtn) lmBtn.style.display = 'none';
        }
      } else {
        console.error('API returned error:', data.message);
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
      if (lmBtn) {
        lmBtn.textContent = 'Load More';
        lmBtn.disabled = false;
      }
    }

    isLoading = false;
  }

  function createArticleCard(article, index) {
    const card = document.createElement('article');
    card.className = 'article-card reveal-left';
    card.style.setProperty('--delay', `${(index % 7) * 0.06}s`);
    card.dataset.category = 'article';
    card.dataset.articleId = article.id;

    // Parse image URLs
    const imageUrls = article.image_urls ? article.image_urls.split('|').filter(u => u.trim()) : [];
    const firstImage = imageUrls.length > 0 ? '.' + imageUrls[0] : 'logo-font.png'; // Fallback to logo

    // Format date
    const date = new Date(article.modified || article.created);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Calculate read time (rough estimate: 200 words per minute)
    const wordCount = article.content ? article.content.split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Create image gallery if multiple images
    let imageHtml = '';
    if (imageUrls.length > 1) {
      imageHtml = `
        <div class="article-img-gallery">
          <img src="${firstImage}" alt="${article.title}" loading="lazy" />
          <div class="article-img-count">${imageUrls.length} photos</div>
        </div>
      `;
    } else {
      imageHtml = `<img src="${firstImage}" alt="${article.title}" loading="lazy" />`;
    }

    card.innerHTML = `
      <a href="#" class="article-link" data-article-id="${article.id}">
        <div class="article-img">
          ${imageHtml}
        </div>
        <div class="article-body">
          <div class="article-meta-top">
            <span class="lb-tag article">Article</span>
            <time class="article-date" datetime="${date.toISOString()}">${formattedDate}</time>
          </div>
          <h3 class="article-title">${article.title}</h3>
          <p class="article-excerpt">${article.content.substring(0, 150)}${article.content.length > 150 ? '...' : ''}</p>
          <div class="article-footer">
            <span class="article-read-time">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${readTime} min read
            </span>
            <span class="article-read-link">Read Article <span>&#8594;</span></span>
          </div>
        </div>
      </a>
    `;

    return card;
  }

  // Load initial articles
  console.log('Loading initial articles...');
  loadArticles(0, false);

  // Load more button handler
  if (lmBtn) {
    lmBtn.addEventListener('click', () => {
      loadArticles(articleOffset, true);
    });
  } else {
    console.log('Load more button not found');
  }

  /* ================================================================
     6. ARTICLE MODAL
  ================================================================ */
  const articleModal = $('#article-modal');
  const articleModalOverlay = $('#article-modal-overlay');
  const articleModalClose = $('#article-modal-close');
  const articleModalBody = $('#article-modal-body');
  let carouselInterval = null;
  let currentSlide = 0;
  let totalSlides = 0;

  function openArticleModal(articleId) {
    console.log('Opening article modal for ID:', articleId);
    
    // Show loading state
    if (articleModalBody) {
      articleModalBody.innerHTML = '<div style="padding: 60px; text-align: center; color: var(--muted);">Loading article...</div>';
    }
    
    // Show modal
    if (articleModal) {
      articleModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    // Fetch article details
    fetch(`api/articles_api.php?action=get_article&id=${articleId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.article) {
          renderArticleModal(data.article);
        } else {
          if (articleModalBody) {
            articleModalBody.innerHTML = '<div style="padding: 60px; text-align: center; color: var(--muted);">Failed to load article.</div>';
          }
        }
      })
      .catch(error => {
        console.error('Failed to fetch article:', error);
        if (articleModalBody) {
          articleModalBody.innerHTML = '<div style="padding: 60px; text-align: center; color: var(--muted);">Failed to load article.</div>';
        }
      });
  }

  function renderArticleModal(article) {
    if (!articleModalBody) return;

    // Parse image URLs and add . prefix
    const imageUrls = article.image_urls ? article.image_urls.split('|').filter(u => u.trim()) : [];
    const fallbackImage = 'logo-font.png';
    const images = imageUrls.length > 0 ? imageUrls.map(url => '.' + url) : [fallbackImage];

    // Format date
    const date = new Date(article.modified || article.created);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Create images HTML
    let imagesHtml = '';
    if (images.length === 1) {
      imagesHtml = `
        <div class="modal-article-single-img">
          <img src="${images[0]}" alt="${article.title}" />
        </div>
      `;
    } else {
      // Create carousel
      totalSlides = images.length;
      currentSlide = 0;
      
      const slides = images.map(url => `
        <div class="modal-carousel-slide">
          <img src="${url}" alt="${article.title}" />
        </div>
      `).join('');
      
      const dots = images.map((_, index) => `
        <button class="modal-carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>
      `).join('');
      
      imagesHtml = `
        <div class="modal-article-carousel" id="modalCarousel">
          <button class="modal-carousel-arrow prev" id="carouselPrev">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="modal-carousel-track" id="carouselTrack">
            ${slides}
          </div>
          <button class="modal-carousel-arrow next" id="carouselNext">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="modal-carousel-dots" id="carouselDots">
            ${dots}
          </div>
        </div>
      `;
    }

    articleModalBody.innerHTML = `
      <div class="modal-article-header">
        ${imagesHtml}
      </div>
      <div class="modal-article-content">
        <div class="modal-article-meta">
          <span class="lb-tag article">Article</span>
          <time class="modal-article-date" datetime="${date.toISOString()}">${formattedDate}</time>
        </div>
        <h2 class="modal-article-title">${article.title}</h2>
        <div class="modal-article-description">
          ${article.content}
        </div>
      </div>
    `;

    // Initialize carousel if multiple images
    if (images.length > 1) {
      initCarousel();
    }
  }

  function initCarousel() {
    const track = $('#carouselTrack');
    const prevBtn = $('#carouselPrev');
    const nextBtn = $('#carouselNext');
    const dots = $$('.modal-carousel-dot');

    if (!track) return;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      
      // Update dots
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
      });
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel();
    }

    function prevSlide() {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateCarousel();
    }

    // Button handlers
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        resetInterval();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        resetInterval();
      });
    }

    // Dot handlers
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        currentSlide = parseInt(dot.dataset.slide);
        updateCarousel();
        resetInterval();
      });
    });

    // Auto-advance every second
    function startInterval() {
      carouselInterval = setInterval(nextSlide, 1000);
    }

    function resetInterval() {
      if (carouselInterval) {
        clearInterval(carouselInterval);
      }
      startInterval();
    }

    startInterval();
  }

  function closeArticleModal() {
    if (articleModal) {
      articleModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (articleModalBody) {
      articleModalBody.innerHTML = '';
    }
    // Clear carousel interval
    if (carouselInterval) {
      clearInterval(carouselInterval);
      carouselInterval = null;
    }
    currentSlide = 0;
    totalSlides = 0;
  }

  // Event delegation for article links
  if (articlesList) {
    articlesList.addEventListener('click', (e) => {
      const link = e.target.closest('.article-link');
      if (link) {
        e.preventDefault();
        const articleId = link.dataset.articleId;
        if (articleId) {
          openArticleModal(articleId);
        }
      }
    });
  }

  // Close modal handlers
  if (articleModalClose) {
    articleModalClose.addEventListener('click', closeArticleModal);
  }
  if (articleModalOverlay) {
    articleModalOverlay.addEventListener('click', closeArticleModal);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && articleModal && articleModal.getAttribute('aria-hidden') === 'false') {
      closeArticleModal();
    }
  });

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
