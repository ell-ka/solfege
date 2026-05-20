// Dessin SVG de la portée et rendu des notes

import {
  STAFF_X1, STAFF_X2, STAFF_TOP, LINE_GAP, HALF_STEP, NOTE_CX,
} from './config.js';

// ── SVG helpers ───────────────────────────────────────────────────────────────
export function mk(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function stepY(step) {
  return STAFF_TOP + step * HALF_STEP;
}

// ── Generic staff draw ────────────────────────────────────────────────────────
export function drawStaffLines(svgEl, clef = 'treble') {
  // Clear existing content
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  for (let i = 0; i < 5; i++) {
    const y = STAFF_TOP + i * LINE_GAP;
    svgEl.appendChild(mk('line', {
      x1: STAFF_X1, x2: STAFF_X2, y1: y, y2: y,
      stroke: '#4a4a88', 'stroke-width': '1.5', 'stroke-linecap': 'round',
    }));
  }

  if (clef === 'bass') {
    // Bass clef character 𝄢 positioned at 4th line from bottom (step 4 = Fa3)
    const bassClef = mk('text', {
      x: '36',
      y: String(STAFF_TOP + 4 * LINE_GAP - 7),
      'font-size': '38',
      'font-family': 'Georgia, "Times New Roman", serif',
      fill: '#6060a8',
      'text-anchor': 'middle',
    });
    bassClef.textContent = '𝄢';
    svgEl.appendChild(bassClef);
  } else {
    // Treble clef
    const clefEl = mk('text', {
      x: '36',
      y: String(STAFF_TOP + 4 * LINE_GAP + 4),
      'font-size': '76',
      'font-family': 'Georgia, "Times New Roman", serif',
      fill: '#6060a8',
      'text-anchor': 'middle',
    });
    clefEl.textContent = '𝄞';
    svgEl.appendChild(clefEl);
  }
}

// ── Note rendering ────────────────────────────────────────────────────────────
export function renderNote(svgEl, noteDef, animate = false) {
  const { step, ledger } = noteDef;
  const cy = stepY(step);
  let ledgerEl = null;

  if (ledger) {
    ledgerEl = mk('line', {
      x1: NOTE_CX - 16, x2: NOTE_CX + 16, y1: cy, y2: cy,
      stroke: '#9090c0', 'stroke-width': '1.5',
    });
    svgEl.appendChild(ledgerEl);
  }

  const group = mk('g', {});
  if (animate) group.classList.add('note-appear');

  group.appendChild(mk('line', {
    x1: NOTE_CX + 8, x2: NOTE_CX + 8,
    y1: cy,          y2: cy - 3 * LINE_GAP,
    stroke: '#e2e2f0', 'stroke-width': '1.5', 'stroke-linecap': 'round',
  }));
  group.appendChild(mk('ellipse', {
    cx: NOTE_CX, cy,
    rx: '8.5', ry: '6',
    fill: '#e2e2f0',
    transform: `rotate(-18, ${NOTE_CX}, ${cy})`,
  }));

  svgEl.appendChild(group);
  return { group, ledgerEl };
}
