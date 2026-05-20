// Mode Simon Says : overlay, séquence et logique de jeu

import { drawStaffLines, renderNote } from './staff.js';
import { playNote, ensureAudioCtx } from './audio.js';
import { clefState } from './deck.js';
import { basePianoNotes, baseLabel, getKeyInContainer } from './piano.js';
import { pianoGroupsTreble } from './config.js';

// ── Utility ───────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// DOM refs (populated on first open)
const simonOverlay     = document.getElementById('simon-overlay');
const simonStaffSVG    = document.getElementById('simon-staff');
const simonStatus      = document.getElementById('simon-status');
const simonProgressTxt = document.getElementById('simon-progress-text');
const simonGameover    = document.getElementById('simon-gameover-panel');
const simonScoreDisp   = document.getElementById('simon-score-display');
const simonKeysEl      = document.getElementById('simon-keys');

let simonSeq       = [];
let simonInput     = [];
let simonPlaying   = false;
let simonActive    = false;

// Note display state on the simon staff
let simonNoteGroup  = null;
let simonNoteLedger = null;

function simonShowNote(noteName, noteDef) {
  simonNoteGroup?.remove();
  simonNoteLedger?.remove();
  simonNoteGroup  = null;
  simonNoteLedger = null;

  if (!noteDef) return;
  const { group, ledgerEl } = renderNote(simonStaffSVG, noteDef, true);
  simonNoteGroup  = group;
  simonNoteLedger = ledgerEl;
}

function simonClearNote() {
  simonNoteGroup?.remove();
  simonNoteLedger?.remove();
  simonNoteGroup  = null;
  simonNoteLedger = null;
}

function getSimonKey(name) {
  return getKeyInContainer(simonKeysEl, name);
}

function setSimonKeysDisabled(disabled) {
  for (const k of simonKeysEl.querySelectorAll('.key')) {
    k.classList.toggle('disabled', disabled);
  }
}

function simonRandNote(activeClef) {
  const pool = clefState[activeClef].activeNoteNames;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Build simon piano keys (mirrors main piano, rebuilt when overlay opens)
export function buildSimonKeys(activeClef, buildDef) {
  simonKeysEl.innerHTML = '';
  const base = basePianoNotes(activeClef);
  for (const name of base) {
    const btn = document.createElement('div');
    btn.className    = 'key';
    btn.textContent  = baseLabel(name);
    btn.dataset.note = name;
    btn.addEventListener('click', () => {
      ensureAudioCtx();
      simonAnswer(name, buildDef);
    });
    simonKeysEl.appendChild(btn);
  }
  // Also add any unlocked extended groups
  const s = clefState[activeClef];
  const unlocked = new Set(s.activeNoteNames);
  if (activeClef === 'treble') {
    for (const group of pianoGroupsTreble) {
      if (group.notes.some(n => unlocked.has(n))) {
        for (const name of group.notes) {
          const btn = document.createElement('div');
          btn.className    = 'key';
          btn.textContent  = name;
          btn.dataset.note = name;
          btn.addEventListener('click', () => {
            ensureAudioCtx();
            simonAnswer(name, buildDef);
          });
          simonKeysEl.appendChild(btn);
        }
      }
    }
  }
}

async function simonPlaySequence(activeClef, buildDef) {
  simonPlaying = true;
  setSimonKeysDisabled(true);
  simonStatus.textContent = 'Écoute...';
  simonStatus.className   = 'listening';
  simonProgressTxt.textContent = '';

  const SHOW_MS = 600;
  const GAP_MS  = 800;

  for (let i = 0; i < simonSeq.length; i++) {
    const note = simonSeq[i];
    simonShowNote(note, buildDef(note));
    playNote(note);
    await delay(SHOW_MS);
    simonClearNote();
    if (i < simonSeq.length - 1) await delay(GAP_MS - SHOW_MS);
  }

  simonPlaying = false;
  simonInput   = [];
  setSimonKeysDisabled(false);
  simonStatus.textContent = 'À toi !';
  simonStatus.className   = 'your-turn';
  simonProgressTxt.textContent = `0 / ${simonSeq.length}`;
}

function simonAnswer(name, buildDef) {
  if (simonPlaying || !simonActive) return;
  if (simonGameover.classList.contains('active')) return;

  ensureAudioCtx();
  playNote(name);

  const keyEl = getSimonKey(name);
  if (keyEl) {
    keyEl.classList.add('correct');
    setTimeout(() => keyEl.classList.remove('correct'), 200);
  }

  const expectedFull = simonSeq[simonInput.length];
  const expectedKey  = getSimonKey(expectedFull);
  const givenKey     = simonKeysEl.querySelector(`[data-note="${name}"]`);

  if (!expectedKey || expectedKey !== givenKey) {
    simonStatus.textContent = 'Perdu !';
    simonStatus.className   = 'gameover';
    simonProgressTxt.textContent = '';
    simonGameover.classList.add('active');
    simonScoreDisp.textContent = String(simonSeq.length - 1);
    return;
  }

  simonInput.push(name);
  simonProgressTxt.textContent = `${simonInput.length} / ${simonSeq.length}`;

  if (simonInput.length === simonSeq.length) {
    simonProgressTxt.textContent = '';
    // Capture activeClef for the closure
    const clef = simonKeysEl.dataset.clef;
    setTimeout(() => {
      simonSeq.push(simonRandNote(clef));
      simonPlaySequence(clef, buildDef);
    }, 600);
  }
}

export function startSimon(activeClef, buildDef) {
  // Store activeClef on the keys container so async callbacks can read it
  simonKeysEl.dataset.clef = activeClef;
  simonActive = true;
  simonSeq    = [simonRandNote(activeClef)];
  simonInput  = [];
  simonGameover.classList.remove('active');
  simonProgressTxt.textContent = '';
  simonPlaySequence(activeClef, buildDef);
}

export function openSimonOverlay(activeClef, buildDef) {
  drawStaffLines(simonStaffSVG, activeClef);
  buildSimonKeys(activeClef, buildDef);
  simonOverlay.classList.add('active');
  startSimon(activeClef, buildDef);
}

export function closeSimonOverlay() {
  simonActive  = false;
  simonPlaying = false;
  simonGameover.classList.remove('active');
  simonClearNote();
  simonOverlay.classList.remove('active');
}

// Wire up static buttons (back and replay) — called once from main.js
export function initSimonButtons(getActiveClef, getBuildDef) {
  document.getElementById('simon-back').addEventListener('click', closeSimonOverlay);
  document.getElementById('simon-replay-btn').addEventListener('click', () => {
    startSimon(getActiveClef(), getBuildDef());
  });
}
