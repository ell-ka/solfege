// Clavier piano UI : construction, expansion et feedback visuel

import { pianoGroupsTreble, pianoGroupsBass } from './config.js';
import { clefState } from './deck.js';
import { ensureAudioCtx } from './audio.js';
import { displayName } from './notation.js';

// Track which extra groups have been added to the piano
let addedGroupsTreble = new Set();
let addedGroupsBass   = new Set();

// Returns the base name (no octave number) for display labels on base keys
export function baseLabel(noteName) {
  return noteName.replace(/\d+$/, '');
}

// Returns the keys that should be in the base piano for a given clef
export function basePianoNotes(clef) {
  if (clef === 'bass') {
    return ['Sol2', 'La2', 'Si2', 'Do3', 'Ré3', 'Mi3', 'Fa3'];
  }
  // Treble: Do through Si (base C4 octave)
  return ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
}

// Build a key element for the piano
// onAnswer callback receives the note name when the key is clicked
export function makeKeyEl(noteName, onAnswer) {
  const btn = document.createElement('div');
  btn.className    = 'key';
  btn.dataset.note = noteName;
  btn.addEventListener('click', () => {
    ensureAudioCtx();
    onAnswer(noteName);
  });
  return btn;
}

export function flash(el, cls, ms) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// Look up a key element by note name in a given container.
// Tries exact match first, then base label.
export function getKeyInContainer(container, noteName) {
  let el = container.querySelector(`[data-note="${noteName}"]`);
  if (el) return el;
  return container.querySelector(`[data-note="${baseLabel(noteName)}"]`);
}

export function rebuildPiano(keysEl, activeClef, onAnswer) {
  keysEl.innerHTML = '';
  addedGroupsTreble = new Set();
  addedGroupsBass   = new Set();

  const base = basePianoNotes(activeClef);
  for (const name of base) {
    const btn = makeKeyEl(name, onAnswer);
    btn.textContent = displayName(name);
    keysEl.appendChild(btn);
  }

  // Re-add any groups that are already unlocked (silent = no animation)
  expandPiano(keysEl, activeClef, onAnswer, true);
}

// Expand piano: add new key groups that are now unlocked.
// silent = true skips the fadeIn animation (used on init)
export function expandPiano(keysEl, activeClef, onAnswer, silent = false) {
  const s = clefState[activeClef];
  const unlocked = new Set(s.activeNoteNames);

  if (activeClef === 'treble') {
    for (const group of pianoGroupsTreble) {
      const id = group.notes[0];
      if (addedGroupsTreble.has(id)) continue;
      if (group.notes.some(n => unlocked.has(n))) {
        addedGroupsTreble.add(id);
        for (const name of group.notes) {
          const btn = makeKeyEl(name, onAnswer);
          btn.textContent = displayName(name);
          if (!silent) btn.classList.add('key-new');
          keysEl.appendChild(btn);
        }
      }
    }
  } else {
    // Bass: potential left-side extension
    for (const group of pianoGroupsBass) {
      const id = group.notes[0];
      if (addedGroupsBass.has(id)) continue;
      if (group.notes.some(n => unlocked.has(n))) {
        addedGroupsBass.add(id);
        const firstKey = keysEl.firstChild;
        for (let i = group.notes.length - 1; i >= 0; i--) {
          const name = group.notes[i];
          const btn  = makeKeyEl(name, onAnswer);
          btn.textContent = displayName(name);
          if (!silent) btn.classList.add('key-new');
          keysEl.insertBefore(btn, firstKey);
        }
      }
    }
  }
}
