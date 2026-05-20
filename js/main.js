// Boucle principale : initialisation et liaison de tous les modules

import { ALL_NOTES_TREBLE, ALL_NOTES_BASS } from './config.js';
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
    fb.textContent = `Non — c'était ${baseLabel(current)}`;
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

  document.querySelectorAll('.clef-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.clef === clef);
  });

  activeClef = clef === 'bass' ? 'bass' : 'treble';

  const displayClef = clef === 'both' ? activeClef : clef;
  drawStaffLines(staffSVG, displayClef);

  rebuildPiano(keysEl, activeClef, answer);
  updateProgressBar(activeClef, clefState);
}

document.querySelectorAll('.clef-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    applyClefSetting(btn.dataset.clef);
    next();
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

applyClefSetting(currentClefSetting);

drawStaffLines(document.getElementById('simon-staff'), activeClef);

updateProgressBar(activeClef, clefState);
next();
