# Markdown Viewer - Chrome Extension

## Why this exists

Markdown (`.md`) has become the default output format for LLMs — Claude, ChatGPT, Gemini, and others all generate reports, documentation, and analysis as `.md` files. Engineers increasingly save and share these outputs, and markdown is already the standard for READMEs, design docs, runbooks, and technical notes. VS Code can preview markdown but only one file at a time in a split pane, making it clunky for reading longer documents. Chrome has no built-in markdown rendering, and existing extensions don't work satisfactorily. This extension fills that gap: a zero-permission, Manifest V3 extension that turns any `.md` file into a clean, readable document in one click.

## What it does

A lightweight Chrome extension that renders `.md` markdown files directly in the browser with full formatting, syntax highlighting, and a table of contents.

## Features

- **Auto-renders** any `.md` file opened in Chrome (local `file://` or remote URLs)
- **Syntax highlighting** for code blocks (Scala, Python, Java, SQL, JSON, and more)
- **Table of Contents** sidebar — auto-generated from headings, click to navigate
- **Multiple themes** — Light, Dark, Solarized, GitHub, Dracula, Nord
- **Zoom controls** — Ctrl+/- or toolbar buttons
- **Raw/Rendered toggle** — switch between formatted and raw markdown
- **Tables, task lists, blockquotes** — full markdown support
- **Anchor links** — in-page navigation works without reloading

## Installation (< 1 minute)

### Option 1: Load from source (always latest)

1. Pull latest: `sl pull` in your fbsource repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the folder `fbsource/users/di/dineshk/md_viewer_extension/`
6. (For local files) Click **Details** on the extension card and enable **Allow access to file URLs**

### Option 2: Download zip

1. Download and unzip `md-viewer-extension.zip` from https://www.internalfb.com/code/fbsource/users/di/dineshk/md_viewer_extension/md-viewer-extension.zip
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the unzipped `md-viewer-extension` folder
6. (For local files) Click **Details** on the extension card and enable **Allow access to file URLs**

That's it! Open any `.md` file and it renders automatically.

### Tip: Set Chrome as the default app for .md files on Mac

Right-click any `.md` file → **Get Info** → under **Open with**, select **Google Chrome** → click **Change All**. Now double-clicking any `.md` file will open it directly in Chrome with the extension rendering it. See [Apple's guide](https://support.apple.com/guide/mac-help/choose-an-app-to-open-a-file-on-mac-mh35597/mac) for details.

## Usage

| Action | How |
|--------|-----|
| Open a markdown file | Navigate to any `.md` URL or drag a local `.md` file into Chrome |
| Zoom in/out | `Ctrl +` / `Ctrl -` (or toolbar buttons) |
| Reset zoom | `Ctrl 0` |
| Toggle TOC | Click **TOC** button in toolbar |
| Switch theme | Use the theme dropdown in toolbar |
| View raw markdown | Click **Raw** button in toolbar |

## Requirements

- Chrome (Manifest V3 compatible)
- For local `.md` files: enable "Allow access to file URLs" in extension settings

## Source

Extension folder: `md-viewer-extension/`
Files: `manifest.json`, `content.js`, `markdown-parser.js`, `syntax-highlighter.js`, `themes.js`, `styles.css`
