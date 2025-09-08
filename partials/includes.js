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

  // Build image list from the media folder dynamically when possible,
  // otherwise fall back to a hard-coded set.
  let images = [];
  const defaultImages = [
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

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function discoverMediaImages() {
    // Attempt to parse a directory listing for /media (works in local dev with python http.server)
    try {
      const res = await fetch('media/', { cache: 'no-cache' });
      if (!res.ok) return [];
      const html = await res.text();
      const anchors = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map(m => m[1]);
      const exts = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];
      const files = anchors
        .filter(href => exts.some(ext => href.toLowerCase().endsWith(ext)))
        .map(href => href.startsWith('media/') ? href : `media/${href}`);
      return Array.from(new Set(files));
    } catch (e) {
      console.warn('Media discovery failed; using defaults.', e);
      return [];
    }
  }

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

  // Use a fully transparent overlay on the home page to avoid darkening the background
  const overlay = 'linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0))';
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
    // Build list: try discovery first, then fall back; randomize order for variety
    try {
      const discovered = await discoverMediaImages();
      images = (discovered && discovered.length) ? discovered.slice() : defaultImages.slice();
    } catch (_) {
      images = defaultImages.slice();
    }
    if (!images.length) return;
    images = shuffle(images);

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

        // Ensure any previous per-effect CSS variables are cleared
        const clearFxVars = (el) => {
          ['--tiltY','--tiltY-leave','--shiftX','--shiftX-leave',
           '--tiltX','--tiltX-leave','--shiftY','--shiftY-leave',
           '--tiltZ','--tiltZ-leave','--scale','--persp']
            .forEach(v => el.style.removeProperty(v));
        };
        clearFxVars(showEl);
        clearFxVars(hideEl);

        if (effect && effect !== 'fade') {
          // Randomize tilt/shift for supported effects
          if (effect === 'carousell') {
            const tilt = (10 + Math.random() * 12).toFixed(1); // 10–22deg
            const shift = (28 + Math.random() * 24).toFixed(0); // 28–52%
            // Entering from right (negative Y tilt), leaving to left (positive Y tilt)
            showEl.style.setProperty('--tiltY', `${-tilt}deg`);
            showEl.style.setProperty('--shiftX', `${shift}%`);
            hideEl.style.setProperty('--tiltY-leave', `${tilt}deg`);
            hideEl.style.setProperty('--shiftX-leave', `-${shift}%`);
            // Optional slight scale/perspective tweaks
            const scale = (0.97 + Math.random() * 0.02).toFixed(3); // 0.970–0.990
            showEl.style.setProperty('--scale', scale);
            hideEl.style.setProperty('--scale', scale);
          } else if (effect === 'carousell-vertical') {
            const tilt = (8 + Math.random() * 12).toFixed(1); // 8–20deg
            const shift = (22 + Math.random() * 22).toFixed(0); // 22–44%
            showEl.style.setProperty('--tiltX', `${tilt}deg`);
            showEl.style.setProperty('--shiftY', `${shift}%`);
            hideEl.style.setProperty('--tiltX-leave', `${-tilt}deg`);
            hideEl.style.setProperty('--shiftY-leave', `-${shift}%`);
            const scale = (0.97 + Math.random() * 0.02).toFixed(3);
            showEl.style.setProperty('--scale', scale);
            hideEl.style.setProperty('--scale', scale);
          } else if (effect === 'rotate') {
            const tilt = (0.5 + Math.random() * 2.5).toFixed(2); // 0.5–3.0deg
            showEl.style.setProperty('--tiltZ', `${tilt}deg`);
            hideEl.style.setProperty('--tiltZ-leave', `${-tilt}deg`);
            const scale = (1.010 + Math.random() * 0.020).toFixed(3); // 1.010–1.030
            showEl.style.setProperty('--scale', scale);
            hideEl.style.setProperty('--scale', scale);
          }

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
        const cleanupAfter = 3300; // ms (matches 3s transition duration)
        setTimeout(() => {
          clearFx(showEl);
          clearFx(hideEl);
          // Also clear any per-effect CSS variables to avoid leakage
          ['--tiltY','--tiltY-leave','--shiftX','--shiftX-leave',
           '--tiltX','--tiltX-leave','--shiftY','--shiftY-leave',
           '--tiltZ','--tiltZ-leave','--scale','--persp']
            .forEach(v => { showEl.style.removeProperty(v); hideEl.style.removeProperty(v); });
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
