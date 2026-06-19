# Chrome Web Store Submission — Markdown Viewer v1.5.0

## Package
- **Upload file:** `md-viewer-v1.5.0-chrome-store.zip` (~918 KB)
- Built with `manifest.json` at the archive root (required by the store).
- Manifest V3, version `1.5.0`.

### Files included (12)
`manifest.json`, `content.js`, `markdown-parser.js`, `syntax-highlighter.js`, `themes.js`, `styles.css`, `excalidraw-renderer.js`, `excalidraw-viewer.js`, `mermaid.min.js`, `mermaid-init.js`, `icons/icon48.png`, `icons/icon128.png`

### Files deliberately excluded
`test.html`, `README.md`, `MERMAID_SIZING_FIX.md`, the old `md-viewer-extension.zip`, and `.DS_Store` — dev/test artifacts that should not ship.

## Upload steps
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time $5 developer registration if not already done).
2. **Add new item** → upload `md-viewer-v1.5.0-chrome-store.zip`.
3. Fill in store listing: description, category (Developer Tools / Productivity), language.
4. Upload screenshots (1280×800 or 640×400) and at least one. A 440×280 small promo tile is optional but recommended.
5. Complete the **Privacy practices** tab and **Permission justifications** (see below).
6. Submit for review.

## Likely review questions to prepare for
- **Broad host access (`<all_urls>` content scripts):** Justify that the extension must run on any page serving a `.md` or `.excalidraw` file (including `file://`) to render it. It declares **no** `permissions` — only host matches via content scripts, which is minimal.
- **`file://` access:** Users must manually enable "Allow access to file URLs" on the extension's details page; mention this in the listing so users aren't confused.
- **Bundled `mermaid.min.js`:** This is a third-party library shipped locally (no remote code), which complies with MV3. If review flags minified/obfuscated code, point to Mermaid's public source as the origin. Note Mermaid uses dynamic code evaluation internally — if CSP issues arise during review, that is the most likely culprit.
- **Single purpose:** "Render and view local/remote Markdown and Excalidraw files in the browser." Keep the listing description aligned with this.

## Notes
- No background service worker, no remote scripts, no analytics, empty `permissions` array — a clean, privacy-friendly profile that should ease review.
- Bump `version` in `manifest.json` for every subsequent upload (the store rejects re-uploads of the same version).
