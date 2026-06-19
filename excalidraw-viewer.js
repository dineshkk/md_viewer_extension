// Content script for .excalidraw files: parses the JSON, renders it to SVG via
// ExcalidrawRenderer, and shows it in a viewer with zoom / fit / full-screen.
(() => {
  const url = window.location.href;
  if (!url.match(/\.excalidraw(\?[^#]*)?(#.*)?$/i)) return;

  const rawText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
  if (!rawText || rawText.trim().length === 0) return;

  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]);

  let svgMarkup = '';
  let parseError = null;
  try {
    svgMarkup = ExcalidrawRenderer.renderFromText(rawText);
  } catch (err) {
    parseError = err && err.message ? err.message : String(err);
  }

  const themeOptions = MdThemes.list().map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  document.head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
  `;

  const contentHtml = parseError
    ? `<div class="md-excalidraw-error">Could not parse Excalidraw file:<br><code>${parseError
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></div>`
    : `<div class="md-excalidraw-container">${svgMarkup}</div>`;

  document.body.innerHTML = `
    <div id="md-toolbar">
      <div class="md-toolbar-left">
        <span class="md-file-icon">&#9998;</span>
        <span class="md-filename">${filename}</span>
      </div>
      <div class="md-toolbar-center">
        <button id="ex-zoom-out" title="Zoom Out">&#8722;</button>
        <span id="ex-zoom-level">100%</span>
        <button id="ex-zoom-in" title="Zoom In">&#43;</button>
        <button id="ex-fit" title="Fit to Width">Fit</button>
        <button id="ex-expand" title="Open Full Screen">&#9974;</button>
      </div>
      <div class="md-toolbar-right">
        <select id="md-theme-select" title="Color Theme">${themeOptions}</select>
        <button id="ex-toggle-raw" title="View Raw JSON">Raw</button>
      </div>
    </div>
    <div id="md-layout">
      <main id="md-content" class="md-content-full">
        <article id="ex-article" class="md-rendered">
          ${contentHtml}
        </article>
        <pre id="ex-raw" class="md-hidden"></pre>
      </main>
    </div>
  `;

  // Fill raw view as text (avoids re-parsing / HTML injection of file content).
  const rawPre = document.getElementById('ex-raw');
  rawPre.textContent = rawText;

  const themeSelect = document.getElementById('md-theme-select');
  const savedTheme = MdThemes.getSaved();
  themeSelect.value = savedTheme;
  MdThemes.apply(savedTheme);
  themeSelect.addEventListener('change', () => MdThemes.apply(themeSelect.value));

  // Raw / rendered toggle
  const article = document.getElementById('ex-article');
  document.getElementById('ex-toggle-raw').addEventListener('click', () => {
    const btn = document.getElementById('ex-toggle-raw');
    if (article.classList.contains('md-hidden')) {
      article.classList.remove('md-hidden');
      rawPre.classList.add('md-hidden');
      btn.textContent = 'Raw';
    } else {
      article.classList.add('md-hidden');
      rawPre.classList.remove('md-hidden');
      btn.textContent = 'Rendered';
    }
  });

  if (parseError) return;

  // ---- Zoom / fit / full-screen for the rendered SVG ----
  const container = article.querySelector('.md-excalidraw-container');
  const svg = container && container.querySelector('svg');
  if (!svg) return;

  const MIN_SCALE = 0.1, MAX_SCALE = 8, FIT_CAP = 4;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const natW = (vb && vb.width) ? vb.width : (svg.clientWidth || 800);

  svg.style.maxWidth = 'none';
  svg.style.height = 'auto';

  const label = document.getElementById('ex-zoom-level');
  let scale = 1;
  let userZoomed = false;

  function availableWidth() {
    const cs = getComputedStyle(container);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    return Math.max(container.clientWidth - pad, 50);
  }
  function fitScale(cap) { return Math.min(availableWidth() / natW, cap); }
  function apply() {
    svg.style.width = (natW * scale) + 'px';
    label.textContent = Math.round(scale * 100) + '%';
  }

  document.getElementById('ex-zoom-in').addEventListener('click', () => {
    scale = Math.min(scale * 1.25, MAX_SCALE); userZoomed = true; apply();
  });
  document.getElementById('ex-zoom-out').addEventListener('click', () => {
    scale = Math.max(scale / 1.25, MIN_SCALE); userZoomed = true; apply();
  });
  document.getElementById('ex-fit').addEventListener('click', () => {
    scale = fitScale(FIT_CAP); userZoomed = false; apply();
  });

  // Full-screen lightbox (reuses the image-overlay styling).
  document.getElementById('ex-expand').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'md-image-overlay';
    const close = document.createElement('button');
    close.className = 'md-image-overlay-close';
    close.title = 'Close';
    close.innerHTML = '&times;';
    const big = svg.cloneNode(true);
    big.style.width = '';
    big.style.height = '';
    big.style.maxWidth = 'none';
    big.classList.add('md-excalidraw-full');
    overlay.appendChild(close);
    overlay.appendChild(big);
    function dismiss() { overlay.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(ev) { if (ev.key === 'Escape') dismiss(); }
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay || ev.target === close) dismiss(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (userZoomed) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { scale = fitScale(FIT_CAP); apply(); }, 150);
  });

  // Initial: fit to width.
  scale = fitScale(FIT_CAP);
  apply();
})();
