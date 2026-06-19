(() => {
  const url = window.location.href;
  if (!url.match(/\.md(\?[^#]*)?(#.*)?$/i)) return;

  const rawText = document.body.innerText || document.body.textContent;
  if (!rawText || rawText.trim().length === 0) return;

  const htmlTags = document.querySelectorAll('h1, h2, h3, article, section, .markdown-body');
  if (htmlTags.length > 3) return;

  let currentZoom = 100;
  const ZOOM_STEP = 10;
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;

  const html = MarkdownParser.parse(rawText);
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]);

  // Build theme options
  const themeOptions = MdThemes.list().map(t =>
    `<option value="${t.id}">${t.name}</option>`
  ).join('');

  document.head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
  `;

  document.body.innerHTML = `
    <div id="md-toolbar">
      <div class="md-toolbar-left">
        <span class="md-file-icon">&#9776;</span>
        <span class="md-filename">${filename}</span>
      </div>
      <div class="md-toolbar-center">
        <button id="md-zoom-out" title="Zoom Out (Ctrl+-)">&#8722;</button>
        <span id="md-zoom-level">${currentZoom}%</span>
        <button id="md-zoom-in" title="Zoom In (Ctrl++)">&#43;</button>
        <button id="md-zoom-reset" title="Reset Zoom (Ctrl+0)">Reset</button>
      </div>
      <div class="md-toolbar-right">
        <select id="md-theme-select" title="Color Theme">${themeOptions}</select>
        <button id="md-toggle-tables" title="Wide Tables: let tables use the full window width">Wide Tables</button>
        <button id="md-toggle-toc" title="Table of Contents">TOC</button>
        <button id="md-toggle-raw" title="View Raw">Raw</button>
      </div>
    </div>
    <div id="md-layout">
      <nav id="md-toc" class="md-toc-hidden"></nav>
      <main id="md-content">
        <article id="md-article" class="md-rendered">
          ${html}
        </article>
        <pre id="md-raw" class="md-hidden">${rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </main>
    </div>
  `;

  const article = document.getElementById('md-article');
  const rawPre = document.getElementById('md-raw');
  const zoomLabel = document.getElementById('md-zoom-level');
  const tocNav = document.getElementById('md-toc');
  const themeSelect = document.getElementById('md-theme-select');

  // Apply saved theme
  const savedTheme = MdThemes.getSaved();
  themeSelect.value = savedTheme;
  MdThemes.apply(savedTheme);

  // Theme change
  themeSelect.addEventListener('change', () => {
    MdThemes.apply(themeSelect.value);
    const darkThemes = ['dark', 'github-dark', 'solarized-dark', 'nord'];
    const newMermaidTheme = darkThemes.includes(themeSelect.value) ? 'dark' : 'default';
    document.documentElement.setAttribute('data-mermaid-theme', newMermaidTheme);
  });

  // Wide-tables setting — let tables break out to use the full window width.
  // Persisted in localStorage (per-origin); defaults to enabled.
  const WIDE_TABLES_KEY = 'md-viewer-wide-tables';
  const wideTablesBtn = document.getElementById('md-toggle-tables');
  function applyWideTables(enabled) {
    document.documentElement.classList.toggle('md-wide-tables', enabled);
    wideTablesBtn.classList.toggle('md-active', enabled);
  }
  applyWideTables(localStorage.getItem(WIDE_TABLES_KEY) !== 'false');
  wideTablesBtn.addEventListener('click', () => {
    const enabled = localStorage.getItem(WIDE_TABLES_KEY) === 'false';
    localStorage.setItem(WIDE_TABLES_KEY, enabled ? 'true' : 'false');
    applyWideTables(enabled);
  });

  function applyZoom() {
    const target = article.classList.contains('md-hidden') ? rawPre : article;
    target.style.fontSize = `${currentZoom}%`;
    zoomLabel.textContent = `${currentZoom}%`;
  }

  function zoomIn() {
    if (currentZoom < ZOOM_MAX) { currentZoom += ZOOM_STEP; applyZoom(); }
  }
  function zoomOut() {
    if (currentZoom > ZOOM_MIN) { currentZoom -= ZOOM_STEP; applyZoom(); }
  }
  function zoomReset() {
    currentZoom = 100; applyZoom();
  }

  document.getElementById('md-zoom-in').addEventListener('click', zoomIn);
  document.getElementById('md-zoom-out').addEventListener('click', zoomOut);
  document.getElementById('md-zoom-reset').addEventListener('click', zoomReset);

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
      else if (e.key === '-') { e.preventDefault(); zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); zoomReset(); }
    }
  });

  // Toggle raw/rendered
  document.getElementById('md-toggle-raw').addEventListener('click', () => {
    const btn = document.getElementById('md-toggle-raw');
    if (article.classList.contains('md-hidden')) {
      article.classList.remove('md-hidden');
      rawPre.classList.add('md-hidden');
      btn.textContent = 'Raw';
    } else {
      article.classList.add('md-hidden');
      rawPre.classList.remove('md-hidden');
      rawPre.style.fontSize = `${currentZoom}%`;
      btn.textContent = 'Rendered';
    }
  });

  // Build TOC
  const headings = article.querySelectorAll('h1, h2, h3, h4');
  if (headings.length > 0) {
    let tocHtml = '<div class="md-toc-title">Contents</div><ul>';
    headings.forEach(h => {
      const level = parseInt(h.tagName[1]);
      const indent = (level - 1) * 16;
      tocHtml += `<li style="padding-left:${indent}px"><span class="md-anchor-link" data-target="${h.id}">${h.textContent}</span></li>`;
    });
    tocHtml += '</ul>';
    tocNav.innerHTML = tocHtml;
  }

  document.getElementById('md-toggle-toc').addEventListener('click', () => {
    tocNav.classList.toggle('md-toc-hidden');
  });

  // Image lightbox — click to enlarge
  article.addEventListener('click', (e) => {
    const img = e.target.closest('.md-image');
    if (!img) return;
    const overlay = document.createElement('div');
    overlay.className = 'md-image-overlay';
    overlay.innerHTML = `<button class="md-image-overlay-close">&times;</button><img src="${img.src}" alt="${img.alt}" class="md-image-full"/>`;
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay || ev.target.classList.contains('md-image-overlay-close')) overlay.remove();
    });
    document.addEventListener('keydown', function handler(ev) {
      if (ev.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handler); }
    });
    document.body.appendChild(overlay);
  });

  // Render mermaid diagrams
  const mermaidElements = article.querySelectorAll('.mermaid');
  if (mermaidElements.length > 0) {
    const darkThemes = ['dark', 'github-dark', 'solarized-dark', 'nord'];
    const mermaidTheme = darkThemes.includes(savedTheme) ? 'dark' : 'default';
    document.documentElement.setAttribute('data-mermaid-theme', mermaidTheme);

    const mermaidScript = document.createElement('script');
    mermaidScript.src = chrome.runtime.getURL('mermaid.min.js');
    mermaidScript.onload = function() {
      const initScript = document.createElement('script');
      initScript.src = chrome.runtime.getURL('mermaid-init.js');
      document.body.appendChild(initScript);
    };
    document.head.appendChild(mermaidScript);
  }

  // Intercept anchor link clicks to scroll without changing the URL
  // Use capture phase to intercept before Chrome's file:// security blocks it
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-target]') || e.target.closest('a[href^="#"]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const targetId = el.dataset.target || el.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }, true);
})();
