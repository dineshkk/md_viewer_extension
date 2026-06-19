// Lightweight Excalidraw -> SVG renderer (no external deps, no build step).
//
// Implemented against the standard .excalidraw file schema:
//   { type:"excalidraw", version, source, elements:[...], appState:{...}, files:{...} }
// Element types: rectangle, diamond, ellipse, line, arrow, freedraw, text,
// image, frame/magicframe, embeddable/iframe (selection elements are ignored).
//
// It intentionally does NOT reproduce the hand-drawn "rough.js" look — shapes
// are drawn with crisp geometry — but is faithful to geometry, colors, fill
// styles, stroke styles, text, arrowheads, rotation, opacity, images & frames.
(function() {
  'use strict';

  // ---- Constants from the Excalidraw spec -------------------------------

  // fontFamily numeric ids -> CSS font stacks. The real Excalidraw fonts
  // (Virgil/Excalifont) aren't bundled here, so the hand-drawn family maps to a
  // clean, narrow sans. Narrower-than-Virgil metrics keep lines inside the
  // box widths Excalidraw computed; single-line text is additionally fitted to
  // its authored width via textLength (see renderText). 1/2/3 are the core
  // fonts; 5-8 are the newer registry; unknown ids fall back to sans.
  var FONT_FAMILIES = {
    1: '"Helvetica Neue", Helvetica, Arial, sans-serif',             // hand-drawn -> sans
    2: '"Helvetica Neue", Helvetica, Arial, sans-serif',             // normal
    3: '"Cascadia Code", Menlo, Consolas, monospace',                // code
    5: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    6: 'Nunito, "Helvetica Neue", Arial, sans-serif',
    7: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    8: 'Menlo, Consolas, monospace'
  };

  // roundness.type values (see Excalidraw constants).
  var ROUNDNESS = { LEGACY: 1, PROPORTIONAL_RADIUS: 2, ADAPTIVE_RADIUS: 3 };
  var DEFAULT_ADAPTIVE_RADIUS = 32;
  var DEFAULT_PROPORTIONAL_RADIUS = 0.25;

  // ---- Small helpers -----------------------------------------------------

  function fontStack(ff) { return FONT_FAMILIES[ff] || FONT_FAMILIES[2]; }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isTransparent(c) { return !c || c === 'transparent'; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  function dashArray(style, w) {
    if (style === 'dashed') return (8 + w) + ' ' + (8 + w);
    if (style === 'dotted') return (1.5) + ' ' + (6 + w);
    return '';
  }

  // Stroke-only presentation attributes (no fill).
  function strokeAttrs(el) {
    var w = num(el.strokeWidth, 1);
    if (isTransparent(el.strokeColor)) return 'stroke="none"';
    var da = dashArray(el.strokeStyle, w);
    return 'stroke="' + esc(el.strokeColor || '#1e1e1e') + '" stroke-width="' + w +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      (da ? ' stroke-dasharray="' + da + '"' : '');
  }

  // Fill value (color or pattern url), registering hachure/cross-hatch patterns.
  function fillFor(el, defs, cache) {
    var bg = el.backgroundColor;
    if (isTransparent(bg)) return 'none';
    var style = el.fillStyle || 'solid';
    if (style === 'solid' || style === 'zigzag') return bg; // zigzag approximated as solid

    var key = style + '|' + bg;
    if (cache[key]) return 'url(#' + cache[key] + ')';
    var id = 'exfill' + (Object.keys(cache).length + 1);
    cache[key] = id;
    var lines = '<line x1="0" y1="0" x2="0" y2="6" stroke="' + esc(bg) + '" stroke-width="0.8"/>';
    if (style === 'cross-hatch') {
      lines += '<line x1="0" y1="0" x2="6" y2="0" stroke="' + esc(bg) + '" stroke-width="0.8"/>';
    }
    defs.push('<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" ' +
      'patternTransform="rotate(-45)">' + lines + '</pattern>');
    return 'url(#' + id + ')';
  }

  function cornerRadius(el) {
    var r = el.roundness;
    if (!r) return 0;
    var x = Math.min(el.width, el.height);
    if (r.type === ROUNDNESS.PROPORTIONAL_RADIUS) return x * DEFAULT_PROPORTIONAL_RADIUS;
    if (r.type === ROUNDNESS.ADAPTIVE_RADIUS) {
      var fixed = num(r.value, DEFAULT_ADAPTIVE_RADIUS);
      var cutoff = fixed / DEFAULT_PROPORTIONAL_RADIUS;
      return x <= cutoff ? x * DEFAULT_PROPORTIONAL_RADIUS : fixed;
    }
    // LEGACY
    return num(r.value, x * DEFAULT_PROPORTIONAL_RADIUS);
  }

  function opacityWrap(el, inner) {
    var o = num(el.opacity, 100) / 100;
    return o < 1 ? '<g opacity="' + o + '">' + inner + '</g>' : inner;
  }

  function rotationWrap(el, inner) {
    var a = num(el.angle, 0);
    if (Math.abs(a) < 0.0001) return inner;
    var cx = el.x + num(el.width, 0) / 2;
    var cy = el.y + num(el.height, 0) / 2;
    return '<g transform="rotate(' + (a * 180 / Math.PI).toFixed(4) + ' ' + cx + ' ' + cy + ')">' + inner + '</g>';
  }

  // ---- Shape renderers ---------------------------------------------------

  function renderRect(el, defs, cache) {
    var rx = cornerRadius(el);
    return '<rect x="' + el.x + '" y="' + el.y + '" width="' + el.width + '" height="' + el.height + '"' +
      (rx ? ' rx="' + rx.toFixed(2) + '" ry="' + rx.toFixed(2) + '"' : '') +
      ' fill="' + esc(fillFor(el, defs, cache)) + '" ' + strokeAttrs(el) + '/>';
  }

  function renderEllipse(el, defs, cache) {
    return '<ellipse cx="' + (el.x + el.width / 2) + '" cy="' + (el.y + el.height / 2) +
      '" rx="' + (el.width / 2) + '" ry="' + (el.height / 2) + '" fill="' + esc(fillFor(el, defs, cache)) +
      '" ' + strokeAttrs(el) + '/>';
  }

  function renderDiamond(el, defs, cache) {
    var x = el.x, y = el.y, w = el.width, h = el.height;
    var pts = [(x + w / 2) + ',' + y, (x + w) + ',' + (y + h / 2),
               (x + w / 2) + ',' + (y + h), x + ',' + (y + h / 2)].join(' ');
    return '<polygon points="' + pts + '" fill="' + esc(fillFor(el, defs, cache)) + '" ' + strokeAttrs(el) + '/>';
  }

  // Estimated advance width of a string at a given font size.
  function estLineWidth(s, fs, mono) {
    return s.length * fs * (mono ? 0.62 : 0.55); // biased slightly high to avoid under-wrapping
  }

  // Word-wrap a single logical line to fit maxW (estimated). Words longer than
  // maxW are hard-split so nothing exceeds the box width.
  function wrapLine(line, maxW, fs, mono) {
    if (!maxW || estLineWidth(line, fs, mono) <= maxW) return [line];
    var words = line.split(' ');
    var out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      // Hard-split a single word that alone exceeds maxW.
      while (estLineWidth(w, fs, mono) > maxW && w.length > 1) {
        var keep = Math.max(1, Math.floor(maxW / (fs * (mono ? 0.62 : 0.55))));
        if (cur) { out.push(cur); cur = ''; }
        out.push(w.slice(0, keep));
        w = w.slice(keep);
      }
      var trial = cur ? cur + ' ' + w : w;
      if (cur && estLineWidth(trial, fs, mono) > maxW) { out.push(cur); cur = w; }
      else { cur = trial; }
    }
    if (cur) out.push(cur);
    return out;
  }

  function renderText(el) {
    var raw = String(el.text != null ? el.text : '').split('\n');
    var maxW = el.width || 0;
    var maxH = el.height || 0;
    var mono = el.fontFamily === 3 || el.fontFamily === 8;
    var lhRatio = num(el.lineHeight, 1.25);
    var fs0 = num(el.fontSize, 20);

    // Wrap to the box width, then shrink the font (if needed) so the wrapped
    // block also fits the box height. Iterate because wrapping depends on fs.
    // This guarantees the text stays inside its element box regardless of how
    // over-stuffed the source box is.
    var MIN_FS = 6;
    var fs = fs0, wrapped = raw;
    for (var iter = 0; iter < 6; iter++) {
      wrapped = [];
      for (var r = 0; r < raw.length; r++) {
        wrapped = wrapped.concat(maxW ? wrapLine(raw[r], maxW, fs, mono) : [raw[r]]);
      }
      var lineH = lhRatio * fs;
      var totalH = wrapped.length * lineH;
      var widest = 0;
      for (var k = 0; k < wrapped.length; k++) widest = Math.max(widest, estLineWidth(wrapped[k], fs, mono));
      var sW = (maxW && widest > maxW) ? maxW / widest : 1;
      var sH = (maxH && totalH > maxH) ? maxH / totalH : 1;
      var s = Math.min(sW, sH);
      if (s >= 0.999 || fs <= MIN_FS) break;
      fs = Math.max(fs * s, MIN_FS);
    }

    var lh = lhRatio * fs;
    var align = el.textAlign || 'left';
    var anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
    var tx = align === 'center' ? el.x + el.width / 2 : (align === 'right' ? el.x + el.width : el.x);
    var vAlign = el.verticalAlign || 'top';
    var block = wrapped.length * lh;
    var topY = el.y + (vAlign === 'middle' ? (maxH - block) / 2 : vAlign === 'bottom' ? (maxH - block) : 0);
    var color = esc(isTransparent(el.strokeColor) ? '#1e1e1e' : el.strokeColor);
    var family = esc(fontStack(el.fontFamily));

    var out = '';
    for (var i = 0; i < wrapped.length; i++) {
      var baseline = topY + i * lh + fs * 0.8;
      out += '<text x="' + tx + '" y="' + baseline.toFixed(2) + '" fill="' + color +
        '" font-family="' + family + '" font-size="' + fs.toFixed(2) + '" text-anchor="' + anchor +
        '" style="white-space:pre">' + esc(wrapped[i]) + '</text>';
    }
    return out;
  }

  function absPoints(el) {
    var pts = el.points || [];
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push([el.x + pts[i][0], el.y + pts[i][1]]);
    return out;
  }

  // Smooth path through points (Excalidraw draws curved linear elements by
  // default). Quadratic segments via midpoints; endpoints stay exact.
  function smoothPath(pts) {
    if (pts.length < 3) return 'M ' + pts.map(function(p) { return p[0] + ' ' + p[1]; }).join(' L ');
    var d = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2;
      var my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q ' + pts[i][0] + ' ' + pts[i][1] + ' ' + mx + ' ' + my;
    }
    var last = pts[pts.length - 1];
    d += ' L ' + last[0] + ' ' + last[1];
    return d;
  }

  function arrowHead(tip, from, color, w, type) {
    var dx = tip[0] - from[0], dy = tip[1] - from[1];
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var size = 9 + w * 2;
    var ang = Math.PI / 7;
    function rot(a, s) {
      var c = Math.cos(a), si = Math.sin(a);
      return [tip[0] - s * (ux * c - uy * si), tip[1] - s * (ux * si + uy * c)];
    }
    var sc = esc(color);
    switch (type) {
      case 'triangle':
        return '<polygon points="' + tip[0] + ',' + tip[1] + ' ' + rot(ang, size) + ' ' + rot(-ang, size) +
          '" fill="' + sc + '" stroke="none"/>';
      case 'triangle_outline':
        return '<polygon points="' + tip[0] + ',' + tip[1] + ' ' + rot(ang, size) + ' ' + rot(-ang, size) +
          '" fill="none" stroke="' + sc + '" stroke-width="' + w + '" stroke-linejoin="round"/>';
      case 'diamond':
      case 'diamond_outline': {
        var back = [tip[0] - ux * size * 1.6, tip[1] - uy * size * 1.6];
        var pts = tip[0] + ',' + tip[1] + ' ' + rot(Math.PI / 2, size * 0.8) + ' ' +
          back[0].toFixed(2) + ',' + back[1].toFixed(2) + ' ' + rot(-Math.PI / 2, size * 0.8);
        return '<polygon points="' + pts + '" fill="' + (type === 'diamond' ? sc : 'none') +
          '" stroke="' + sc + '" stroke-width="' + w + '" stroke-linejoin="round"/>';
      }
      case 'dot':
      case 'circle':
        return '<circle cx="' + tip[0] + '" cy="' + tip[1] + '" r="' + (w + 2.5) + '" fill="' + sc + '"/>';
      case 'circle_outline':
        return '<circle cx="' + tip[0] + '" cy="' + tip[1] + '" r="' + (w + 2.5) +
          '" fill="none" stroke="' + sc + '" stroke-width="' + w + '"/>';
      case 'bar': {
        var b1 = rot(Math.PI / 2, size * 0.9), b2 = rot(-Math.PI / 2, size * 0.9);
        return '<line x1="' + b1[0] + '" y1="' + b1[1] + '" x2="' + b2[0] +
          '" y2="' + b2[1] + '" stroke="' + sc + '" stroke-width="' + w + '" stroke-linecap="round"/>';
      }
      default: // 'arrow' (open) and crowfoot_* fall back to open arrowhead
        return '<polyline points="' + rot(ang, size) + ' ' + tip[0] + ',' + tip[1] + ' ' + rot(-ang, size) +
          '" fill="none" stroke="' + sc + '" stroke-width="' + w +
          '" stroke-linecap="round" stroke-linejoin="round"/>';
    }
  }

  function renderLinear(el) {
    var pts = absPoints(el);
    if (pts.length < 2) return '';
    var color = isTransparent(el.strokeColor) ? '#1e1e1e' : el.strokeColor;
    var w = num(el.strokeWidth, 1);
    var sharp = el.roundness == null || el.elbowed;
    var d = sharp ? ('M ' + pts.map(function(p) { return p[0] + ' ' + p[1]; }).join(' L ')) : smoothPath(pts);
    var path = '<path d="' + d + '" fill="none" ' + strokeAttrs(el) + '/>';
    var heads = '';
    if (el.type === 'arrow') {
      var end = el.endArrowhead === undefined ? 'arrow' : el.endArrowhead;
      if (end && end !== 'none') heads += arrowHead(pts[pts.length - 1], pts[pts.length - 2], color, w, end);
      if (el.startArrowhead && el.startArrowhead !== 'none') heads += arrowHead(pts[0], pts[1], color, w, el.startArrowhead);
    }
    return path + heads;
  }

  function renderFreedraw(el) {
    var pts = absPoints(el);
    if (!pts.length) return '';
    var d = 'M ' + pts.map(function(p) { return p[0] + ' ' + p[1]; }).join(' L ');
    return '<path d="' + d + '" fill="none" ' + strokeAttrs(el) + '/>';
  }

  function renderImage(el, files) {
    var f = files && el.fileId && files[el.fileId];
    var href = f && f.dataURL;
    if (!href) {
      return '<rect x="' + el.x + '" y="' + el.y + '" width="' + el.width + '" height="' + el.height +
        '" fill="#f1f3f5" stroke="#ced4da" stroke-dasharray="4 4"/>' +
        '<text x="' + (el.x + el.width / 2) + '" y="' + (el.y + el.height / 2) +
        '" fill="#868e96" font-family="sans-serif" font-size="14" text-anchor="middle">image</text>';
    }
    return '<image x="' + el.x + '" y="' + el.y + '" width="' + el.width + '" height="' + el.height +
      '" href="' + esc(href) + '" preserveAspectRatio="none"/>';
  }

  function renderFrame(el) {
    var name = el.name || 'Frame';
    return '<rect x="' + el.x + '" y="' + el.y + '" width="' + el.width + '" height="' + el.height +
      '" rx="8" ry="8" fill="none" stroke="#bbb" stroke-width="2"/>' +
      '<text x="' + el.x + '" y="' + (el.y - 8) + '" fill="#888" font-family="sans-serif" font-size="14">' +
      esc(name) + '</text>';
  }

  function renderPlaceholder(el, label) {
    return '<rect x="' + el.x + '" y="' + el.y + '" width="' + el.width + '" height="' + el.height +
      '" rx="6" ry="6" fill="#f8f9fa" stroke="#adb5bd" stroke-dasharray="6 4"/>' +
      '<text x="' + (el.x + el.width / 2) + '" y="' + (el.y + el.height / 2) +
      '" fill="#868e96" font-family="sans-serif" font-size="14" text-anchor="middle">' + esc(label) + '</text>';
  }

  function renderElement(el, defs, cache, files) {
    var inner;
    switch (el.type) {
      case 'rectangle': inner = renderRect(el, defs, cache); break;
      case 'ellipse': inner = renderEllipse(el, defs, cache); break;
      case 'diamond': inner = renderDiamond(el, defs, cache); break;
      case 'text': inner = renderText(el); break;
      case 'line':
      case 'arrow': inner = renderLinear(el); break;
      case 'freedraw':
      case 'draw': inner = renderFreedraw(el); break;
      case 'image': inner = renderImage(el, files); break;
      case 'frame':
      case 'magicframe': inner = renderFrame(el); break;
      case 'embeddable':
      case 'iframe': inner = renderPlaceholder(el, 'embed'); break;
      default: return ''; // selection and unknown types are not drawn
    }
    return rotationWrap(el, opacityWrap(el, inner));
  }

  function elementExtent(el) {
    if ((el.type === 'arrow' || el.type === 'line' || el.type === 'freedraw' || el.type === 'draw') && el.points) {
      var pts = absPoints(el);
      var xs = pts.map(function(p) { return p[0]; });
      var ys = pts.map(function(p) { return p[1]; });
      return { minX: Math.min.apply(null, xs), minY: Math.min.apply(null, ys),
               maxX: Math.max.apply(null, xs), maxY: Math.max.apply(null, ys) };
    }
    var x = num(el.x, 0), y = num(el.y, 0), w = num(el.width, 0), h = num(el.height, 0);
    return { minX: x, minY: y, maxX: x + w, maxY: y + h };
  }

  // data: parsed Excalidraw JSON object. Returns SVG markup as a string.
  function render(data) {
    var all = (data && data.elements) || [];
    var els = all.filter(function(e) { return e && !e.isDeleted && e.type !== 'selection'; });
    if (!els.length) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60" width="220" height="60">' +
        '<text x="12" y="36" font-family="sans-serif" font-size="16" fill="#888">Empty drawing</text></svg>';
    }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    els.forEach(function(el) {
      var b = elementExtent(el);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    });

    var pad = 24;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var w = Math.max(maxX - minX, 1);
    var h = Math.max(maxY - minY, 1);

    var bg = (data.appState && data.appState.viewBackgroundColor) || '#ffffff';
    var files = data.files || {};

    var defs = [], cache = {}, body = '';
    els.forEach(function(el) { body += renderElement(el, defs, cache, files); });

    return '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="' + minX + ' ' + minY + ' ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
      (isTransparent(bg) ? '' : '<rect x="' + minX + '" y="' + minY + '" width="' + w + '" height="' + h +
        '" fill="' + esc(bg) + '"/>') +
      (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') +
      body + '</svg>';
  }

  function renderFromText(text) {
    return render(typeof text === 'string' ? JSON.parse(text) : text);
  }

  window.ExcalidrawRenderer = { render: render, renderFromText: renderFromText };
})();
