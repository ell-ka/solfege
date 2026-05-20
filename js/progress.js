// Barre de progression et logique de déblocage des notes

import { allNotesForClef } from './deck.js';
import { baseLabel } from './piano.js';

export function updateProgressBar(activeClef, clefState) {
  const fill  = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  const s     = clefState[activeClef];
  const allNotes = allNotesForClef(activeClef);
  const total    = allNotes.length;
  const unlocked = s.activeNoteNames.length;

  label.classList.remove('ready-unlock');

  if (unlocked >= total) {
    fill.style.width  = '100%';
    label.textContent = 'Toutes les notes maîtrisées ✓';
    return;
  }

  const nextNote = allNotes[unlocked];
  const h        = s.history;

  // pct = success rate on last 10 answers, 0 if fewer than 5
  let successes = 0;
  let count     = 0;
  if (h.length >= 5) {
    count     = h.length;
    successes = h.filter(Boolean).length;
  }

  const pct = count > 0 ? Math.min(100, Math.round(successes / count * 100)) : 0;
  fill.style.width = pct + '%';

  // Label
  if (pct >= 80) {
    label.textContent = `Prête à débloquer : ${baseLabel(nextNote.name)} !`;
    label.classList.add('ready-unlock');
  } else {
    const displayCount = count > 0 ? count : 0;
    const displaySuc   = count > 0 ? successes : 0;
    label.textContent  = `Taux de réussite : ${displaySuc} / ${displayCount === 0 ? 10 : displayCount}`;
  }
}

export function showUnlockToast(noteName) {
  const toast = document.getElementById('unlock-toast');
  toast.textContent = `Nouvelle note : ${baseLabel(noteName)} !`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

export function flashProgressBar() {
  const fill = document.getElementById('progress-fill');
  fill.classList.remove('flash-unlock');
  void fill.offsetWidth;
  fill.classList.add('flash-unlock');
  setTimeout(() => fill.classList.remove('flash-unlock'), 700);
}
