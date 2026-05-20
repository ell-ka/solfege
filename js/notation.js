// Gestion de la notation musicale : Français (Do, Ré…) vs Anglo (C, D…)

import { ANGLO_MAP } from './config.js';

// Persisted setting: 'french' | 'anglo'
let notation = localStorage.getItem('solfege-notation') || 'french';

export function getNotation() {
  return notation;
}

export function setNotation(value) {
  notation = value;
  localStorage.setItem('solfege-notation', value);
}

// Strip trailing octave digits (e.g. 'Do5' → 'Do', 'Sol2' → 'Sol')
function stripOctave(noteName) {
  return noteName.replace(/\d+$/, '');
}

// Return the display name for a note in the current notation
export function displayName(noteName) {
  if (notation === 'anglo') {
    const mapped = ANGLO_MAP[noteName];
    if (mapped !== undefined) return stripOctave(mapped);
    // Fallback: strip octave from french name
    return stripOctave(noteName);
  }
  return stripOctave(noteName);
}
