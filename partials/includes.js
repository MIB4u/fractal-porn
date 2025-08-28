async function injectPartial(el, url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    el.innerHTML = await res.text();
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div style="color:#f55">Could not load ${url}</div>`;
  }
}

function setActiveNav(container) {
  const path = location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'home',
    'gallery.html': 'gallery',
    'contact.html': 'contact'
  };
  const key = map[path];
  if (!key) return;
  container.querySelectorAll(`[data-active="${key}"]`).forEach(a => {
    a.classList.add('active');
    a.setAttribute('aria-current', 'page');
  });
}

(async function () {
  const headerEl = document.querySelector('header[data-include]');
  const footerEl = document.querySelector('footer[data-include]');
  if (headerEl) {
    await injectPartial(headerEl, headerEl.getAttribute('data-include'));
    setActiveNav(headerEl);
  }
  if (footerEl) {
    await injectPartial(footerEl, footerEl.getAttribute('data-include'));
  }
})();

// ——————————————————————————————————————————————
// Pausable animated images (GIF/APNG/WebP) via canvas snapshot overlay
// ——————————————————————————————————————————————
(function(){
  function computeCoverParams(img, container){
    const cw = container.clientWidth || img.clientWidth;
    const ch = container.clientHeight || img.clientHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!cw || !ch || !iw || !ih) {
      return { sx: 0, sy: 0, sw: iw, sh: ih, dw: cw, dh: ch };
    }
    const scale = Math.max(cw / iw, ch / ih);
    const sw = Math.min(iw, Math.round(cw / scale));
    const sh = Math.min(ih, Math.round(ch / scale));
    const sx = Math.max(0, Math.floor((iw - sw) / 2));
    const sy = Math.max(0, Math.floor((ih - sh) / 2));
    return { sx, sy, sw, sh, dw: cw, dh: ch };
  }

  function renderPauseCanvas(img){
    // Determine container to match object-fit: cover behavior
    const container = img.closest('.image-container') || img.closest('.placeholder-image') || img.parentElement || img;
    const { sx, sy, sw, sh, dw, dh } = computeCoverParams(img, container);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, dw);
    canvas.height = Math.max(1, dh);
    canvas.className = 'paused-canvas';
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    } catch (e) {
      // If drawImage fails for any reason, just size the canvas and proceed
      console.error('Could not snapshot image frame:', e);
    }
    return canvas;
  }

  function setPressed(img, pressed){
    img.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    img.setAttribute('aria-label', pressed ? 'Resume animation' : 'Pause animation');
  }

  function pauseImage(img){
    if (img.dataset.paused === 'true') return;
    const canvas = renderPauseCanvas(img);
    // Hide the image but preserve layout; insert canvas after it
    img.style.visibility = 'hidden';
    img.insertAdjacentElement('afterend', canvas);
    img.dataset.paused = 'true';
    setPressed(img, true);
  }

  function resumeImage(img){
    if (img.dataset.paused !== 'true') return;
    const next = img.nextElementSibling;
    if (next && next.classList && next.classList.contains('paused-canvas')) {
      next.remove();
    }
    img.style.visibility = '';
    delete img.dataset.paused;
    setPressed(img, false);
  }

  function toggleImagePause(img){
    if (img.dataset.paused === 'true') {
      resumeImage(img);
    } else {
      pauseImage(img);
    }
  }

  function enhancePausable(img){
    if (img.dataset.pausableEnhanced) return;
    img.dataset.pausableEnhanced = 'true';
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    setPressed(img, false);
    img.title = 'Click or press Space/Enter to pause/resume';

    const inGridImageContainer = !!img.closest('.image-container');
    const inPlaceholder = !!img.closest('.placeholder-image');
    const isModalImg = img.classList.contains('modal-img');

    // Click-to-toggle everywhere except gallery grid images (to avoid clashing with the modal opener)
    if (!inGridImageContainer || inPlaceholder || isModalImg) {
      img.addEventListener('click', (e) => {
        e.preventDefault();
        toggleImagePause(img);
      });
    }

    // Always support keyboard toggle
    img.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleImagePause(img);
      }
    });
  }

  function setupAll(){
    const selector = '.image-container img, .placeholder-image img, img.modal-img';
    document.querySelectorAll(selector).forEach(enhancePausable);
  }

  // Initial setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAll);
  } else {
    setupAll();
  }

  // Expose simple API for other scripts (e.g., after modal image src changes)
  window.PausableImages = {
    pause: pauseImage,
    resume: resumeImage,
    toggle: toggleImagePause,
    enhance: enhancePausable
  };
})();

// ——————————————————————————————————————————————
// Home page rotating background
// ——————————————————————————————————————————————
(function(){
  const path = (location.pathname.split('/').pop() || 'index.html');
  if (path !== 'index.html' && path !== '') return; // only on home page

  const images = [
    'media/Another Box.webp',
    'media/Another Box WiP.webp',
    'media/describing a Cube FINAL.webp',
    'media/describing a Cube WiP.webp',
    'media/FlowerFNL.webp',
    'media/Nowhere Near.webp',
    'media/Nowhere Near 2025.webp',
    'media/Quantum-mechanical Pinocchio.webp',
    'media/sekundius minutius hora.webp',
    'media/Going Under.webp',
    'media/How Do I Clean My Shit Up.webp',
    'media/look further.webp',
    'media/printers harlequin.webp',
    'media/This is my Mandelbox.webp'
  ];

  if (!images.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const container = document.createElement('div');
  container.className = 'bg-rotator';
  container.setAttribute('aria-hidden', 'true');
  container.setAttribute('role', 'presentation');

  const a = document.createElement('div');
  a.className = 'bg bg-a';
  const b = document.createElement('div');
  b.className = 'bg bg-b';
  container.appendChild(a);
  container.appendChild(b);

  // Insert as first element of <body> so it paints behind all content
  document.body.insertBefore(container, document.body.firstChild);

  const overlay = 'linear-gradient(0deg, rgba(0,0,0,0.60), rgba(0,0,0,0.40))';
  const setBg = (el, url) => { el.style.backgroundImage = `${overlay}, url("${url}")`; };

  const preload = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });

  let current = 0;
  const next = (i) => (i + 1) % images.length;
  let showingA = true;

  // Randomized transition effects
  const effects = [
    'fade',
    'zoom-in', 'zoom-out',
    'slide-left', 'slide-right', 'slide-up', 'slide-down',
    'blur',
    'rotate',
'carousell',
    'carousell-vertical'
  ];

  function pickEffect() {
    const idx = Math.floor(Math.random() * effects.length);
    return effects[idx];
  }

  function clearFx(el) {
    if (!el) return;
    const toRemove = [];
    el.classList.forEach(cls => {
      if (cls.startsWith('fx-') || cls === 'before-enter' || cls === 'leaving') toRemove.push(cls);
    });
    toRemove.forEach(cls => el.classList.remove(cls));
  }

  (async function init(){
    // Initialize first background with a successful image
    for (let tries = 0; tries < images.length; tries++) {
      try {
        const okUrl = await preload(images[current]);
        setBg(a, okUrl);
        a.classList.add('is-active');
        break;
      } catch (e) {
        console.warn('Background preload failed:', images[current], e);
        current = next(current);
      }
    }

    if (prefersReduced) return; // honor reduced-motion

    let idx = next(current);
    const intervalMs = 13000; // 13 seconds per image

    setInterval(async () => {
      const url = images[idx];
      try {
        const okUrl = await preload(url);
        const showEl = showingA ? b : a;
        const hideEl = showingA ? a : b;
        setBg(showEl, okUrl);

        // Choose and apply a random effect
        const effect = pickEffect();
        clearFx(showEl);
        clearFx(hideEl);
        if (effect && effect !== 'fade') {
          showEl.classList.add(`fx-${effect}`, 'before-enter');
          hideEl.classList.add(`fx-${effect}`, 'leaving');
        } else {
          // Explicit class for potential future styling
          showEl.classList.add('fx-fade');
          hideEl.classList.add('fx-fade');
        }

        // Force style application before toggling active state
        void showEl.offsetWidth;

        // Activate new, deactivate old
        showEl.classList.add('is-active');
        hideEl.classList.remove('is-active');

        // Next frame: remove the before-enter marker to transition to base
        requestAnimationFrame(() => {
          showEl.classList.remove('before-enter');
        });

        // Cleanup after the transition duration (+buffer)
        const cleanupAfter = 1100; // ms
        setTimeout(() => {
          clearFx(showEl);
          clearFx(hideEl);
        }, cleanupAfter);

        showingA = !showingA;
        current = idx;
        idx = next(idx);
      } catch (e) {
        console.warn('Background preload failed:', url, e);
        idx = next(idx);
      }
    }, intervalMs);
  })();
})();
