// Synthèse audio via Web Audio API

import { NOTE_FREQ } from './config.js';

let audioCtx = null;

export function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playNote(noteName, when = 0) {
  const ctx  = ensureAudioCtx();
  const freq = NOTE_FREQ[noteName];
  if (!freq) return;

  const t0 = ctx.currentTime + when;

  // Compressor to avoid saturation
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value      = 10;
  compressor.ratio.value     = 4;
  compressor.attack.value    = 0.003;
  compressor.release.value   = 0.25;
  compressor.connect(ctx.destination);

  // Master gain envelope
  const masterGain = ctx.createGain();
  masterGain.connect(compressor);

  // ADSR
  const attack  = 0.002;
  const decay   = 0.08;
  const sustain = 0.5;
  const release = 0.3;
  const total   = 0.9;

  masterGain.gain.setValueAtTime(0, t0);
  masterGain.gain.linearRampToValueAtTime(0.7, t0 + attack);
  masterGain.gain.linearRampToValueAtTime(0.7 * sustain, t0 + attack + decay);
  masterGain.gain.setValueAtTime(0.7 * sustain, t0 + total - release);
  masterGain.gain.linearRampToValueAtTime(0, t0 + total);

  // Helper to add an oscillator partial
  function addPartial(type, multiplier, gain) {
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(masterGain);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * multiplier;
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + total);
  }

  // 4 partials: fundamental + 2nd + 3rd + 4th harmonic
  addPartial('sine',     1, 1.0);
  addPartial('sine',     2, 0.4);
  addPartial('triangle', 3, 0.2);
  addPartial('sine',     4, 0.1);
}
