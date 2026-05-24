/* ── crono-canvas.js — shared blueprint canvas engine ────────────────────────
   Defines the <crono-quad> Web Component and the grid engine.

   Usage in HTML:
     <div id="canvas" class="canvas" data-cols="8" data-rows="6">
       <crono-quad col="0" row="0" fig="fig. 0.0 — overview" sec="§0">
         <div class="tag">language</div>
         ...content...
       </crono-quad>
     </div>
     <script src="crono-canvas.js" defer></script>

   The component injects .quad-fig / .quad-sec / .qi wrappers from attributes,
   so each quad in HTML is just the content — no boilerplate.
   ─────────────────────────────────────────────────────────────────────────── */

'use strict';

// ── Web Component ────────────────────────────────────────────────────────────

class CronoQuad extends HTMLElement {
  connectedCallback() {
    const col = this.getAttribute('col') || '0';
    const row = this.getAttribute('row') || '0';
    const fig = this.getAttribute('fig') || '';
    const sec = this.getAttribute('sec') || '';

    // Capture inner content before we replace it
    const inner = this.innerHTML;

    // Apply .quad class and data attributes so the grid engine can position it
    this.classList.add('quad');
    this.dataset.col = col;
    this.dataset.row = row;

    // Inject structural wrappers
    this.innerHTML = `
      <div class="quad-fig">${fig}</div>
      <div class="quad-sec">${sec}</div>
      <div class="qi">${inner}</div>
    `;
  }
}

customElements.define('crono-quad', CronoQuad);

// ── Grid engine ──────────────────────────────────────────────────────────────

const _PC_MAX       = 720;   // max quad size on desktop (multiple of 40)
const _MOBILE_BREAK = 768;
const _NAV_H        = 48;    // must match --nav-h CSS variable

const _canvas = document.getElementById('canvas');
const _wrap   = document.getElementById('wrap');
const _frame  = document.querySelector('.frame');

// Read grid dimensions from canvas data attributes
const COLS = parseInt(_canvas.dataset.cols || '6');
const ROWS = parseInt(_canvas.dataset.rows || '4');

// Find (pw, ph) grid pitches that produce the most-square cells possible.
function _computePitches(vw, qh) {
  let best = null, bestDiff = Infinity;
  for (let dw = 8; dw <= 12; dw++) {
    const pw = vw / dw;
    const dh = Math.max(1, Math.round(qh / pw));
    const ph = qh / dh;
    const diff = Math.abs(pw - ph);
    if (diff < bestDiff) { bestDiff = diff; best = { pw, ph }; }
  }
  return best;
}

function _quadDims() {
  const vw = window.innerWidth;
  const vh = window.innerHeight - _NAV_H;
  if (vw < _MOBILE_BREAK) {
    const { pw, ph } = _computePitches(vw, vh);
    return { qw: vw, qh: vh, pw, ph };
  }
  const qs = Math.max(80, Math.min(_PC_MAX, Math.round(vh / 40) * 40));
  return { qw: qs, qh: qs, pw: 40, ph: 40 };
}

function _setup() {
  const { qw, qh, pw, ph } = _quadDims();

  _canvas.style.width          = (qw * COLS + pw * 2) + 'px';
  _canvas.style.height         = (qh * ROWS + ph * 2) + 'px';
  _canvas.style.backgroundSize = `${pw}px ${ph}px`;

  if (_frame) {
    _frame.style.top    = ph + 'px';
    _frame.style.bottom = ph + 'px';
    _frame.style.left   = pw + 'px';
    _frame.style.right  = pw + 'px';
  }

  document.querySelectorAll('.quad').forEach(q => {
    const c = +q.dataset.col;
    const r = +q.dataset.row;
    q.style.width  = qw + 'px';
    q.style.height = qh + 'px';
    q.style.left   = (pw + c * qw) + 'px';
    q.style.top    = (ph + r * qh) + 'px';
    q.style.setProperty('--qw', qw + 'px');
    q.style.setProperty('--qh', qh + 'px');
    q.style.setProperty('--pw', pw + 'px');
    q.style.setProperty('--ph', ph + 'px');
    q.classList.toggle('last-col', c === COLS - 1);
    q.classList.toggle('last-row', r === ROWS - 1);
  });
}

// ── Navigation ───────────────────────────────────────────────────────────────

function _snapTo(col, row) {
  const { qw, qh, pw, ph } = _quadDims();
  _wrap.scrollTo({
    left:     col === 0 ? 0 : pw + col * qw,
    top:      row === 0 ? 0 : _NAV_H + ph + row * qh,
    behavior: 'smooth'
  });
}

function _updateActive() {
  const { qw, qh, pw, ph } = _quadDims();
  // (reserved for active-quad tracking — col/row available if needed)
  // const cc = Math.max(0, Math.min(COLS-1, Math.round((_wrap.scrollLeft - pw/2) / qw)));
  // const rr = Math.max(0, Math.min(ROWS-1, Math.round((_wrap.scrollTop - _NAV_H - ph/2) / qh)));
}

_wrap.addEventListener('scroll', _updateActive, { passive: true });

document.addEventListener('keydown', e => {
  const { qw, qh, pw, ph } = _quadDims();
  const cc = Math.max(0, Math.min(COLS-1, Math.round((_wrap.scrollLeft - pw/2) / qw)));
  const rr = Math.max(0, Math.min(ROWS-1, Math.round((_wrap.scrollTop - _NAV_H - ph/2) / qh)));
  const moves = {
    ArrowRight: [cc+1, rr], ArrowLeft:  [cc-1, rr],
    ArrowDown:  [cc, rr+1], ArrowUp:    [cc, rr-1]
  };
  if (moves[e.key]) {
    const [nc, nr] = moves[e.key];
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
      _snapTo(nc, nr);
      e.preventDefault();
    }
  }
});

// ── Panning (mouse drag) ──────────────────────────────────────────────────────

let _panning = false, _sx, _sy, _sl, _st;

_wrap.addEventListener('mousedown', e => {
  if (e.target.closest('a, button')) return;
  _panning = true;
  _sx = e.clientX; _sy = e.clientY;
  _sl = _wrap.scrollLeft; _st = _wrap.scrollTop;
  _wrap.classList.add('panning');
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!_panning) return;
  _wrap.scrollLeft = _sl - (e.clientX - _sx);
  _wrap.scrollTop  = _st - (e.clientY - _sy);
});

window.addEventListener('mouseup', () => {
  _panning = false;
  _wrap.classList.remove('panning');
});

// ── Minimap ───────────────────────────────────────────────────────────────────

function _buildMinimap() {
  const grids = document.querySelectorAll('.mm-grid');
  if (!grids.length) return;

  // Build lookup col,row → fig label
  const quadMap = {};
  document.querySelectorAll('.quad').forEach(q => {
    const c = +q.dataset.col;
    const r = +q.dataset.row;
    const figEl = q.querySelector('.quad-fig');
    const fig = figEl ? figEl.textContent.trim() : '';
    quadMap[`${c},${r}`] = fig;
  });

  grids.forEach(grid => {
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    grid.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const fig = quadMap[`${c},${r}`] || '';
        // Parse "fig. 0.0 — overview" → num="0.0", label="overview"
        const m = fig.match(/fig\.\s*([\d.]+)\s*[—\-]\s*(.*)/i);
        const num   = m ? m[1] : `${c}.${r}`;
        const label = m ? m[2] : fig;

        const cell = document.createElement('div');
        cell.className = 'mm-cell' + (c === 0 && r === 0 ? ' mm-self' : '');
        cell.title = fig || `${c},${r}`;
        cell.innerHTML =
          `<div class="mm-num">${num}</div>` +
          `<div class="mm-label">${label}</div>`;
        cell.addEventListener('click', () => _snapTo(c, r));
        grid.appendChild(cell);
      }
    }
  });
}

// Expose for external callers (e.g. inline scripts on non-shared pages)
window.snapTo = _snapTo;

// ── Init ─────────────────────────────────────────────────────────────────────

_setup();
_buildMinimap();
window.addEventListener('resize', () => { _setup(); _updateActive(); });
