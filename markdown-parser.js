const MarkdownParser = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  function parseInline(text) {
    // Protect URLs from inline formatting by replacing them with placeholders
    const urls = [];
    // Inline code (protect first so nothing inside backticks is touched)
    text = text.replace(/`([^`]+)`/g, (m, code) => {
      urls.push(`<code>${code}</code>`);
      return `\x00URL${urls.length - 1}\x00`;
    });
    // Images (before links so ![...](...) isn't caught by link regex)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
      const tag = `<img src="${src}" alt="${alt}" class="md-image"/>`;
      urls.push(tag);
      return `\x00URL${urls.length - 1}\x00`;
    });
    // Links
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, href) => {
      const isAnchor = href.startsWith('#');
      const tag = isAnchor
        ? `<a class="md-anchor-link" data-target="${href.slice(1)}">${label}</a>`
        : `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
      urls.push(tag);
      return `\x00URL${urls.length - 1}\x00`;
    });
    // Bare URLs
    text = text.replace(/(^|[^"=])(https?:\/\/[^\s<]+)/g, (m, pre, url) => {
      const tag = `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
      urls.push(tag);
      return `\x00URL${urls.length - 1}\x00`;
    });
    // Bold+italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Restore placeholders
    text = text.replace(/\x00URL(\d+)\x00/g, (m, idx) => urls[parseInt(idx)]);
    return text;
  }

  function parseTable(lines) {
    if (lines.length < 2) return null;
    const splitRow = row => row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = splitRow(lines[0]);
    const sepLine = lines[1].trim();
    if (!/^[\s|:-]+$/.test(sepLine)) return null;

    const aligns = splitRow(lines[1]).map(cell => {
      const left = cell.startsWith(':');
      const right = cell.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      return 'left';
    });

    let html = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
    headers.forEach((h, i) => {
      html += `<th style="text-align:${aligns[i] || 'left'}">${parseInline(escapeHtml(h))}</th>`;
    });
    html += '</tr></thead><tbody>';
    for (let r = 2; r < lines.length; r++) {
      const cells = splitRow(lines[r]);
      html += '<tr>';
      cells.forEach((c, i) => {
        html += `<td style="text-align:${aligns[i] || 'left'}">${parseInline(escapeHtml(c))}</td>`;
      });
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function parse(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      const fenceMatch = line.match(/^```(\w*)/);
      if (fenceMatch) {
        const lang = fenceMatch[1] || '';
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        if (lang === 'mermaid') {
          result.push(`<div class="md-mermaid-container"><pre class="mermaid">${escapeHtml(codeLines.join('\n'))}</pre></div>`);
          continue;
        }
        const langLabel = lang ? `<span class="md-code-lang">${escapeHtml(lang)}</span>` : '';
        const highlighted = SyntaxHighlighter.highlight(codeLines.join('\n'), lang);
        result.push(`<div class="md-code-block">${langLabel}<pre><code>${highlighted}</code></pre></div>`);
        continue;
      }

      // Table
      if (line.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1])) {
        const tableLines = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        const table = parseTable(tableLines);
        if (table) {
          result.push(table);
          continue;
        }
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/\s+#+\s*$/, '');
        const id = text.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-').replace(/(^-|-$)/g, '');
        result.push(`<h${level} id="${id}" class="md-heading">${parseInline(escapeHtml(text))}</h${level}>`);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
        result.push('<hr class="md-hr"/>');
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].startsWith('#')))) {
          if (lines[i].startsWith('>')) {
            quoteLines.push(lines[i].replace(/^>\s?/, ''));
          } else {
            quoteLines.push(lines[i]);
          }
          i++;
        }
        result.push(`<blockquote class="md-blockquote">${parse(quoteLines.join('\n'))}</blockquote>`);
        continue;
      }

      // Unordered list
      if (/^(\s*)([-*+])\s+/.test(line)) {
        const listItems = [];
        const baseIndent = line.match(/^(\s*)/)[1].length;
        while (i < lines.length) {
          const itemMatch = lines[i].match(/^(\s*)([-*+])\s+(.*)/);
          if (itemMatch && itemMatch[1].length === baseIndent) {
            const subLines = [itemMatch[3]];
            i++;
            while (i < lines.length) {
              const subItem = lines[i].match(/^(\s*)([-*+])\s+(.*)/);
              if (subItem && subItem[1].length > baseIndent) {
                subLines.push(lines[i]);
                i++;
              } else if (lines[i].trim() === '') {
                i++;
                break;
              } else {
                break;
              }
            }
            if (subLines.length > 1) {
              listItems.push(`<li>${parseInline(escapeHtml(subLines[0]))}${parse(subLines.slice(1).join('\n'))}</li>`);
            } else {
              listItems.push(`<li>${parseInline(escapeHtml(subLines[0]))}</li>`);
            }
          } else if (lines[i] && lines[i].trim() === '') {
            i++;
            continue;
          } else {
            break;
          }
        }
        result.push(`<ul class="md-list">${listItems.join('')}</ul>`);
        continue;
      }

      // Ordered list
      if (/^(\s*)\d+\.\s+/.test(line)) {
        const listItems = [];
        const baseIndent = line.match(/^(\s*)/)[1].length;
        while (i < lines.length) {
          const itemMatch = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
          if (itemMatch && itemMatch[1].length === baseIndent) {
            const contentLines = [itemMatch[2]];
            i++;
            while (i < lines.length) {
              if (lines[i].trim() === '') {
                let j = i + 1;
                while (j < lines.length && lines[j].trim() === '') j++;
                if (j >= lines.length) { i = j; break; }
                const nextMatch = lines[j].match(/^(\s*)\d+\.\s/);
                if (nextMatch && nextMatch[1].length === baseIndent) { i = j; break; }
                if (lines[j].match(/^(\s{2,})/) && !lines[j].match(/^#{1,6}\s|^```|^>/)) {
                  i = j;
                  continue;
                }
                i = j;
                break;
              }
              const sameLevel = lines[i].match(/^(\s*)\d+\.\s/);
              if (sameLevel && sameLevel[1].length <= baseIndent) break;
              if (/^#{1,6}\s|^```|^>/.test(lines[i])) break;
              contentLines.push(lines[i].trim());
              i++;
            }
            listItems.push(`<li>${parseInline(escapeHtml(contentLines.join(' ')))}</li>`);
          } else if (lines[i] !== undefined && lines[i].trim() === '') {
            i++;
            continue;
          } else {
            break;
          }
        }
        result.push(`<ol class="md-list">${listItems.join('')}</ol>`);
        continue;
      }

      // Checkbox / task list
      const checkMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)/);
      if (checkMatch) {
        const taskItems = [];
        while (i < lines.length) {
          const cm = lines[i].match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)/);
          if (cm) {
            const checked = cm[3] !== ' ' ? 'checked disabled' : 'disabled';
            taskItems.push(`<li class="md-task"><input type="checkbox" ${checked}/> ${parseInline(escapeHtml(cm[4]))}</li>`);
            i++;
          } else {
            break;
          }
        }
        result.push(`<ul class="md-task-list">${taskItems.join('')}</ul>`);
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph — collect contiguous non-empty lines
      const paraLines = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+\.\s|(\*{3,}|-{3,}|_{3,})\s*$)/)) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        result.push(`<p>${parseInline(escapeHtml(paraLines.join('\n')))}</p>`);
      }
    }

    return result.join('\n');
  }

  return { parse };
})();
