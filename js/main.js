// Boucle principale : initialisation et liaison de tous les modules

import { ALL_NOTES_TREBLE, ALL_NOTES_BASS, STAFF_TOP, LINE_GAP, HALF_STEP, NOTE_CX } from './config.js';
import { displayName, setNotation, getNotation } from './notation.js';
import { playNote, ensureAudioCtx } from './audio.js';
import { drawStaffLines, renderNote } from './staff.js';
import {
  clefState, loadProgress, saveProgress,
  initCards, nextCard, tickDueIn, successRate, allNotesForClef,
} from './deck.js';
import {
  rebuildPiano, expandPiano, getKeyInContainer, flash, baseLabel, basePianoNotes,
} from './piano.js';
import { updateProgressBar, showUnlockToast, flashProgressBar } from './progress.js';
import { openSimonOverlay, initSimonButtons } from './simon.js';

// ── Clef state ────────────────────────────────────────────────────────────────
let currentClefSetting = localStorage.getItem('solfege-clef') || 'treble';
let activeClef = 'treble'; // 'treble' | 'bass'

// ── Staff note display state ──────────────────────────────────────────────────
const staffSVG   = document.getElementById('staff');
const keysEl     = document.getElementById('keys');

let activeGroup  = null;
let activeLedger = null;

// ── Hint state ────────────────────────────────────────────────────────────────
let hintLabel           = null;  // SVG <text> element showing the note name
let hintHighlightedLine = null;  // SVG <line> element recolored by hint
let hintKeyEl           = null;  // piano key highlighted by hint

// ── Note lookup helpers ───────────────────────────────────────────────────────
function buildDef(name) {
  const all = [...ALL_NOTES_TREBLE, ...ALL_NOTES_BASS];
  return all.find(n => n.name === name);
}

function getKey(noteName) {
  return getKeyInContainer(keysEl, noteName);
}

// ── Note rendering ────────────────────────────────────────────────────────────
function showNote(noteDef) {
  activeGroup?.remove();
  activeLedger?.remove();

  const { group, ledgerEl } = renderNote(staffSVG, noteDef, true);
  activeGroup  = group;
  activeLedger = ledgerEl;
}

function pulseAndRemoveNote(cb) {
  if (!activeGroup) { cb && cb(); return; }
  activeGroup.classList.remove('note-appear');
  activeGroup.querySelector('ellipse')?.setAttribute('fill', '#4ade80');
  activeGroup.querySelector('line')?.setAttribute('stroke', '#4ade80');
  activeGroup.classList.add('note-pulse');
  const g = activeGroup;
  const l = activeLedger;
  setTimeout(() => {
    g?.remove();
    l?.remove();
    cb && cb();
  }, 300);
  activeGroup  = null;
  activeLedger = null;
}

// ── Hint ──────────────────────────────────────────────────────────────────────
const hintBtn = document.getElementById('hint-btn');

function clearHint() {
  if (hintLabel) {
    hintLabel.remove();
    hintLabel = null;
  }
  if (hintHighlightedLine) {
    hintHighlightedLine.setAttribute('stroke', '#4a4a88');
    hintHighlightedLine = null;
  }
  if (hintKeyEl) {
    hintKeyEl.classList.remove('hint');
    hintKeyEl = null;
  }
  hintBtn.disabled = false;
}

function hint() {
  if (!current || hintBtn.disabled) return;

  hintBtn.disabled = true;

  // 1. Push a false into history (visual progress setback, no deck penalty)
  clefState[activeClef].history.push(false);
  if (clefState[activeClef].history.length > 10) clefState[activeClef].history.shift();
  updateProgressBar(activeClef, clefState);

  const def = buildDef(current);

  // 2. Highlight the staff line if the note sits on one (step even, 0-8)
  const onLine = def.step % 2 === 0 && def.step >= 0 && def.step <= 8;
  if (onLine) {
    const lineIdx = def.step / 2;
    const lines = staffSVG.querySelectorAll('line');
    if (lines[lineIdx]) {
      lines[lineIdx].setAttribute('stroke', '#818cf8');
      hintHighlightedLine = lines[lineIdx];
    }
  }

  // 3. Show note name label below the staff (always fixed position)
  const labelY = STAFF_TOP + 4 * LINE_GAP + 20;
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', String(NOTE_CX));
  label.setAttribute('y', String(labelY));
  label.setAttribute('fill', '#818cf8');
  label.setAttribute('font-size', '14');
  label.setAttribute('font-weight', '600');
  label.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif');
  label.setAttribute('text-anchor', 'middle');
  label.textContent = displayName(current);
  staffSVG.appendChild(label);
  hintLabel = label;

  // 4. Highlight the corresponding piano key
  const hintKey = getKey(current);
  if (hintKey) {
    hintKey.classList.add('hint');
    hintHighlightedLine = hintHighlightedLine; // keep line ref
    hintKeyEl = hintKey;
  }
}

hintBtn.addEventListener('click', hint);

// ── Progressive unlock ────────────────────────────────────────────────────────
function checkUnlock() {
  const s        = clefState[activeClef];
  const allNotes = allNotesForClef(activeClef);
  if (s.activeNoteNames.length >= allNotes.length) return;
  if (s.history.length < 5) return;
  if (successRate(activeClef) > 0.80) {
    const nextIndex = s.activeNoteNames.length;
    const newNote   = allNotes[nextIndex];
    s.activeNoteNames.push(newNote.name);
    s.history = [];
    initCards(activeClef, s.activeNoteNames);
    saveProgress(activeClef);
    showUnlockToast(newNote.name);
    flashProgressBar();
    expandPiano(keysEl, activeClef, answer);
  }
}

// ── Deck record result ────────────────────────────────────────────────────────
function recordResult(cardName, correct) {
  const s = clefState[activeClef];
  const card = s.cards.find(c => c.name === cardName);
  if (!card) return;

  s.history.push(correct);
  if (s.history.length > 10) s.history.shift();

  if (correct) {
    card.dueIn = 4 + card.failCount;
  } else {
    card.failCount++;
    card.dueIn = 2;
  }

  tickDueIn(activeClef, cardName);
  saveProgress(activeClef);
  checkUnlock();
  updateProgressBar(activeClef, clefState);
}

// ── Game logic ────────────────────────────────────────────────────────────────
let current = null;
let busy    = false;
let right   = 0;
let total   = 0;

function chooseClefForRound() {
  if (currentClefSetting === 'both') {
    activeClef = Math.random() < 0.5 ? 'treble' : 'bass';
    drawStaffLines(staffSVG, activeClef);
    rebuildPiano(keysEl, activeClef, answer);
    updateProgressBar(activeClef, clefState);
  }
}

function next() {
  clearHint();
  busy = false;
  chooseClefForRound();
  const card = nextCard(activeClef);
  current = card.name;
  showNote(buildDef(current));
}

function answer(noteName) {
  if (busy || !current) return;
  busy = true;
  total++;

  const fb = document.getElementById('feedback');
  const sc = document.getElementById('score');

  const currentKey = getKey(current);
  const clickedKey = keysEl.querySelector(`[data-note="${noteName}"]`);
  const correct    = currentKey !== null && currentKey === clickedKey;

  if (correct) {
    right++;
    fb.textContent = 'Correct !';
    fb.className   = 'correct';
    flash(currentKey, 'correct', 550);
    recordResult(current, true);
    playNote(current);
    pulseAndRemoveNote();
    setTimeout(() => { fb.textContent = ''; fb.className = ''; next(); }, 680);
  } else {
    fb.textContent = `Non — c'était ${displayName(current)}`;
    fb.className   = 'wrong';
    if (clickedKey) flash(clickedKey, 'wrong', 1100);
    if (currentKey) flash(currentKey, 'hint',  1100);
    recordResult(current, false);
    setTimeout(() => { fb.textContent = ''; fb.className = ''; next(); }, 1350);
  }

  sc.textContent = `${right} / ${total}`;
}

// ── Clef toggle UI ────────────────────────────────────────────────────────────
function applyClefSetting(clef) {
  currentClefSetting = clef;
  localStorage.setItem('solfege-clef', clef);

  document.querySelectorAll('[data-clef]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.clef === clef);
  });

  activeClef = clef === 'bass' ? 'bass' : 'treble';

  const displayClef = clef === 'both' ? activeClef : clef;
  drawStaffLines(staffSVG, displayClef);

  rebuildPiano(keysEl, activeClef, answer);
  updateProgressBar(activeClef, clefState);
}

document.querySelectorAll('[data-clef]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    applyClefSetting(btn.dataset.clef);
    next();
  });
});

// ── Notation toggle UI ────────────────────────────────────────────────────────
const CLEF_LABELS = {
  french: { treble: 'Clé de Sol', bass: 'Clé de Fa', both: 'Les deux' },
  anglo:  { treble: 'Treble',     bass: 'Bass',       both: 'Both'     },
};

function applyNotationSetting(value) {
  setNotation(value);
  document.querySelectorAll('.notation-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.notation === value);
  });
  // Update clef toggle labels to match notation
  const labels = CLEF_LABELS[value] || CLEF_LABELS.french;
  document.querySelectorAll('[data-clef]').forEach(btn => {
    btn.textContent = labels[btn.dataset.clef] ?? btn.textContent;
  });
  // Rebuild piano labels in place
  rebuildPiano(keysEl, activeClef, answer);
}

document.querySelectorAll('.notation-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    applyNotationSetting(btn.dataset.notation);
  });
});

// ── Simon Says wiring ─────────────────────────────────────────────────────────
document.getElementById('simon-btn').addEventListener('click', () => {
  ensureAudioCtx();
  openSimonOverlay(activeClef, buildDef);
});

initSimonButtons(
  () => activeClef,
  () => buildDef,
);

// ── Init ──────────────────────────────────────────────────────────────────────
loadProgress('treble');
loadProgress('bass');

// Apply saved notation (button state only — piano is built by applyClefSetting below)
applyNotationSetting(getNotation());

applyClefSetting(currentClefSetting);

drawStaffLines(document.getElementById('simon-staff'), activeClef);

updateProgressBar(activeClef, clefState);
next();
