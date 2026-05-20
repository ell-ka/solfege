// Répétition espacée et persistance localStorage

import { ALL_NOTES_TREBLE, ALL_NOTES_BASS } from './config.js';

export function allNotesForClef(clef) {
  return clef === 'bass' ? ALL_NOTES_BASS : ALL_NOTES_TREBLE;
}

export function storageKeyForClef(clef) {
  return clef === 'bass' ? 'solfege-progress-bass' : 'solfege-progress-treble';
}

// Per-clef state
export const clefState = {
  treble: { activeNoteNames: [], cards: [], history: [] },
  bass:   { activeNoteNames: [], cards: [], history: [] },
};

export function initCards(clef, noteNames) {
  const s = clefState[clef];
  const existing = Object.fromEntries(s.cards.map(c => [c.name, c]));
  s.cards = noteNames.map(name => ({
    name,
    dueIn:     existing[name]?.dueIn     ?? 0,
    failCount: existing[name]?.failCount ?? 0,
  }));
}

export function nextCard(clef) {
  const s = clefState[clef];
  const minDue = Math.min(...s.cards.map(c => c.dueIn));
  const ready  = s.cards.filter(c => c.dueIn === minDue);
  return ready[Math.floor(Math.random() * ready.length)];
}

export function tickDueIn(clef, excludeName) {
  for (const c of clefState[clef].cards) {
    if (c.name !== excludeName) {
      c.dueIn = Math.max(0, c.dueIn - 1);
    }
  }
}

export function successRate(clef) {
  const h = clefState[clef].history;
  if (h.length === 0) return 0;
  return h.filter(Boolean).length / h.length;
}

export function saveProgress(clef) {
  const s = clefState[clef];
  const data = {
    activeNoteNames: s.activeNoteNames,
    failCounts: Object.fromEntries(s.cards.map(c => [c.name, c.failCount])),
    history: s.history,
  };
  localStorage.setItem(storageKeyForClef(clef), JSON.stringify(data));
}

export function loadProgress(clef) {
  const raw = localStorage.getItem(storageKeyForClef(clef));
  const s   = clefState[clef];
  const defaultStart = allNotesForClef(clef).slice(0, 3).map(n => n.name);
  if (!raw) {
    s.activeNoteNames = defaultStart;
    s.history         = [];
    s.cards           = s.activeNoteNames.map(name => ({ name, dueIn: 0, failCount: 0 }));
    return false;
  }
  try {
    const data = JSON.parse(raw);
    s.activeNoteNames = Array.isArray(data.activeNoteNames) && data.activeNoteNames.length >= 3
      ? data.activeNoteNames
      : defaultStart;
    s.history = Array.isArray(data.history) ? data.history.slice(-10) : [];
    const fc = data.failCounts || {};
    s.cards = s.activeNoteNames.map(name => ({
      name,
      dueIn:     0,
      failCount: fc[name] ?? 0,
    }));
    return true;
  } catch {
    s.activeNoteNames = defaultStart;
    s.history         = [];
    s.cards           = s.activeNoteNames.map(name => ({ name, dueIn: 0, failCount: 0 }));
    return false;
  }
}
