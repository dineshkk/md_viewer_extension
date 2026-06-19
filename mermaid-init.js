(function() {
  // Cap how far we upscale a diagram on initial load so a tiny diagram (e.g. a
  // two-node flowchart) fills the available width without rendering comically
  // large. The explicit "fit" button is allowed to scale further.
  var DEFAULT_FIT_CAP = 2.5;
  var FIT_CAP = 6;
  var MIN_SCALE = 0.2;
  var MAX_SCALE = 8;

  function naturalWidth(svg) {
    var vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width) return vb.width;
    try {
      var box = svg.getBBox();
      if (box && box.width) return box.width;
    } catch (e) { /* getBBox can throw if not rendered */ }
    return svg.clientWidth || 100;
  }

  // Width available to the SVG = the .mermaid content box (clientWidth already
  // excludes padding, but only if box-sizing is content-box; subtract padding
  // defensively in case of border-box).
  function availableWidth(inner) {
    var cs = window.getComputedStyle(inner);
    var pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    var w = inner.clientWidth - (cs.boxSizing === 'border-box' ? pad : 0);
    return Math.max(w, 50);
  }

  // Open the diagram in a full-screen lightbox so it can be viewed at a much
  // larger width/height. Closes via the close button, a click on the backdrop,
  // or the Escape key.
  function openLightbox(svg) {
    var overlay = document.createElement('div');
    overlay.className = 'md-image-overlay';

    var close = document.createElement('button');
    close.className = 'md-image-overlay-close';
    close.setAttribute('title', 'Close');
    close.innerHTML = '&times;';

    // Keep the original id: Mermaid scopes its fill/stroke CSS inside the SVG's
    // own <style> tag using `#<id> ...` selectors, so stripping the id would
    // drop all colours and render solid black shapes.
    var big = svg.cloneNode(true);
    // Let the lightbox CSS drive sizing instead of the fit-to-width px value.
    big.style.width = '';
    big.style.height = '';
    big.style.maxWidth = 'none';
    big.classList.add('md-mermaid-full');

    overlay.appendChild(close);
    overlay.appendChild(big);

    function dismiss() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') dismiss();
    }

    overlay.addEventListener('click', function(ev) {
      // Close on backdrop click or the close button, but not on the diagram.
      if (ev.target === overlay || ev.target === close) dismiss();
    });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
  }

  function addZoomControls() {
    document.querySelectorAll('.md-mermaid-container').forEach(function(container) {
      var existing = container.querySelector('.md-mermaid-toolbar');
      if (existing) existing.remove();

      var svg = container.querySelector('svg');
      if (!svg) return;

      var inner = container.querySelector('.mermaid') || container;
      var natW = naturalWidth(svg);

      // Drop Mermaid's inline cap so the SVG can grow past its intrinsic size.
      svg.style.maxWidth = 'none';
      svg.style.height = 'auto';

      // userZoomed stays false while the diagram tracks the container width, so
      // a window resize keeps it fitted; manual zoom opts out of auto-refit.
      var userZoomed = false;
      var scale;

      function fitScale(cap) {
        return Math.min(availableWidth(inner) / natW, cap);
      }

      function apply() {
        svg.style.width = (natW * scale) + 'px';
        if (label) label.textContent = Math.round(scale * 100) + '%';
      }

      // Exposed so the single global resize handler can re-fit this diagram
      // without each addZoomControls() call leaking a new resize listener.
      container._mdMermaidRefit = function() {
        if (userZoomed) return;
        scale = fitScale(DEFAULT_FIT_CAP);
        apply();
      };

      var toolbar = document.createElement('div');
      toolbar.className = 'md-mermaid-toolbar';
      toolbar.innerHTML =
        '<button class="md-mermaid-btn" data-action="zoom-out" title="Zoom Out">-</button>' +
        '<span class="md-mermaid-zoom-level">100%</span>' +
        '<button class="md-mermaid-btn" data-action="zoom-in" title="Zoom In">+</button>' +
        '<button class="md-mermaid-btn" data-action="fit" title="Fit to Width">&#9634;</button>' +
        '<button class="md-mermaid-btn" data-action="expand" title="Open Full Screen">&#9974;</button>';
      container.appendChild(toolbar);

      var label = toolbar.querySelector('.md-mermaid-zoom-level');

      toolbar.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        if (action === 'zoom-in') { scale = Math.min(scale * 1.25, MAX_SCALE); userZoomed = true; apply(); }
        else if (action === 'zoom-out') { scale = Math.max(scale / 1.25, MIN_SCALE); userZoomed = true; apply(); }
        else if (action === 'fit') { scale = fitScale(FIT_CAP); userZoomed = false; apply(); }
        else if (action === 'expand') { openLightbox(svg); }
      });

      // Initial render: fit to width (upscaling small diagrams up to the cap).
      scale = fitScale(DEFAULT_FIT_CAP);
      apply();
    });
  }

  // A single resize listener re-fits every container; addZoomControls() can be
  // called repeatedly (e.g. on theme change) without accumulating listeners.
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      document.querySelectorAll('.md-mermaid-container').forEach(function(container) {
        if (typeof container._mdMermaidRefit === 'function') container._mdMermaidRefit();
      });
    }, 150);
  });

  document.querySelectorAll('.mermaid').forEach(function(el) {
    el.setAttribute('data-mermaid-source', el.textContent);
  });

  var theme = document.documentElement.getAttribute('data-mermaid-theme') || 'default';
  mermaid.initialize({
    startOnLoad: false,
    theme: theme,
    securityLevel: 'loose'
  });
  mermaid.run({ querySelector: '.mermaid' }).then(addZoomControls).catch(function(err) {
    console.error('Mermaid render error:', err);
    addZoomControls();
  });

  new MutationObserver(function() {
    var newTheme = document.documentElement.getAttribute('data-mermaid-theme') || 'default';
    document.querySelectorAll('[data-mermaid-source]').forEach(function(el) {
      el.removeAttribute('data-processed');
      el.innerHTML = '';
      el.textContent = el.getAttribute('data-mermaid-source');
    });
    mermaid.initialize({ startOnLoad: false, theme: newTheme, securityLevel: 'loose' });
    mermaid.run({ querySelector: '.mermaid' }).then(addZoomControls).catch(function(err) {
      console.error('Mermaid re-render error:', err);
      addZoomControls();
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mermaid-theme'] });
})();
