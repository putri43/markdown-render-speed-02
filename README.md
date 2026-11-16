# markdown-render-speed-02

[![make.fun](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/competition/markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/putri43/markdown-render-speed-02/rank.svg)](https://make.fun/competition/markdown-render-speed-02/putri43/markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/putri43/markdown-render-speed-02/reward.svg)](https://make.fun/competition/markdown-render-speed-02/putri43/markdown-render-speed-02)

A fast, dependency-free CommonMark 0.31.2 + GFM 0.29 Markdown renderer written
from scratch in a single ES module (`parse.js`). It returns byte-for-byte the
HTML that marked 18.1.3 returns with its defaults (gfm on, breaks off,
pedantic off, async off), for the 720 cases of the make.fun competition
"Make Markdown rendering faster" — 680 spec examples plus 40 generated README
documents.

## Layout

- `parse.js` — the renderer. `parse(markdown)` returns the HTML string.
  Single-pass block parser (ATX/setext headings, paragraphs, thematic
  breaks, fenced/indented code, blockquotes, lists incl. task lists,
  tables, HTML blocks) plus an inline scanner (emphasis/strong,
  strikethrough, code spans, inline/reference/image links, autolinks and
  extended autolinks, entities, escapes, inline HTML, hard breaks, link
  reference definitions). No dependencies, no network, no WASM, no native
  addons; no caching or memoisation across `parse()` calls.
- `main.ts` — the driver. Reads `/input/cases.json` (or
  `$MAKEFUN_INPUT_DIR`), renders each case with `parse()`, writes
  `/output/html.json` (or `$MAKEFUN_OUTPUT_DIR`).

## Usage

```js
import { parse } from './parse.js';
parse('# Hello\n\n**world**');
// '<h1>Hello</h1>\n<p><strong>world</strong></p>\n'
```

## License

MIT — see `LICENSE`.
