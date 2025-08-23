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

