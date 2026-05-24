# crono-web — Claude Guide

Static HTML/CSS/JS documentation site for crono-lang, deployed to crono.rac.so via Poof (Docker + nginx).

For crono-lang language and VM documentation, see:
- `vm.md` / https://crono.rac.so/vm.md — crono-vm reference
- `sharp.md` / https://crono.rac.so/sharp.md — crono-sharp reference
- `llms.txt` / https://crono.rac.so/llms.txt — short index for agents

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page — links to /vm and /sharp |
| `vm.html` | crono-vm interactive canvas (6 cols × 4 rows) |
| `sharp.html` | crono-sharp interactive canvas (8 cols × 6 rows) |
| `crono-canvas.css` | Shared design system — all CSS variables, layout, content atoms |
| `crono-canvas.js` | Shared grid engine + `<crono-quad>` Web Component + minimap builder |
| `vm.md` | crono-vm reference documentation (human + agent readable) |
| `sharp.md` | crono-sharp reference documentation (human + agent readable) |
| `llms.txt` | Short index for AI agents |
| `nginx.conf` | Custom nginx config (`try_files` — serves /vm, /sharp without .html extension) |
| `Dockerfile` | nginx:alpine image; copies nginx.conf and site files |

---

## Architecture

### Canvas pages (vm.html, sharp.html)

2D pannable blueprint canvas. Each page is a grid of `.quad` cells, positioned absolutely by JS.

- `vm.html` uses **inline** CSS + JS (legacy; not yet migrated to shared files)
- `sharp.html` uses `<link href="crono-canvas.css">` + `<script src="crono-canvas.js">`

Both use the `<crono-quad col="C" row="R" fig="fig. C.R — title" sec="§N">` Web Component defined in `crono-canvas.js`. The component injects `.quad-fig` / `.quad-sec` / `.qi` wrappers from attributes.

### Grid engine (`crono-canvas.js`)

- Reads `data-cols` / `data-rows` from `#canvas` to know grid dimensions
- On desktop: square quads clamped 80–720px, snapped to 40px, pitch fixed at 40×40px
- On mobile: quads fill the viewport; grid pitch computed dynamically for near-square cells
- Injects `--qw`, `--qh`, `--pw`, `--ph` CSS variables on each `.quad` for responsive sizing
- `_buildMinimap()` populates `.mm-grid` elements in quad [0,0] with a clickable index of all quads

### Nav (approach D)

`position: sticky; left: 0` — the nav follows the user horizontally (sticks to the left of the viewport) but scrolls away vertically. No JS overhead.

### Content atoms (crono-canvas.css)

Reusable classes for quad content: `.tag`, `.cell-title`, `.cell-sub`, `.cell-body`, `.stats` / `.stat`, `.op-table`, `.type-table`, `.kv-list`, `.arch`, `.code`, `.note`, `.badge`, `.btn`, `.minimap` / `.mm-grid` / `.mm-cell`.

All font sizes use `clamp(MIN, calc(var(--qh) * COEFF), MAX)` — scaling with height, not width.

---

## URL routing

nginx `try_files $uri $uri.html =404` — `/vm` serves `vm.html`, `/sharp` serves `sharp.html`, `/vm.md` serves `vm.md`, etc.

---

## Deployment

```bash
git push   # triggers Poof → builds Docker image → deploys to crono.rac.so
```
