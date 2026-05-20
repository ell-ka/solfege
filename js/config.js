// Constantes de géométrie de la portée et définitions des notes

export const STAFF_X1  = 10;
export const STAFF_X2  = 390;
export const STAFF_TOP = 28;
export const LINE_GAP  = 12;
export const HALF_STEP = 6;

export const NOTE_CX = (STAFF_X1 + STAFF_X2) / 2 + 16;

export const ALL_NOTES_TREBLE = [
  { name: 'Do',   step: 10, ledger: true  },
  { name: 'Ré',   step:  9, ledger: false },
  { name: 'Mi',   step:  8, ledger: false },
  { name: 'Fa',   step:  7, ledger: false },
  { name: 'Sol',  step:  6, ledger: false },
  { name: 'La',   step:  5, ledger: false },
  { name: 'Si',   step:  4, ledger: false },
  { name: 'Do5',  step:  3, ledger: false },
  { name: 'Ré5',  step:  2, ledger: false },
  { name: 'Mi5',  step:  1, ledger: false },
  { name: 'Fa5',  step:  0, ledger: false },
  { name: 'Sol5', step: -1, ledger: true  },
];

export const ALL_NOTES_BASS = [
  { name: 'Sol2', step: 10, ledger: true  },
  { name: 'La2',  step:  9, ledger: false },
  { name: 'Si2',  step:  8, ledger: false },
  { name: 'Do3',  step:  7, ledger: false },
  { name: 'Ré3',  step:  6, ledger: false },
  { name: 'Mi3',  step:  5, ledger: false },
  { name: 'Fa3',  step:  4, ledger: false },
  { name: 'Sol3', step:  3, ledger: false },
  { name: 'La3',  step:  2, ledger: false },
  { name: 'Si3',  step:  1, ledger: false },
  { name: 'Do4',  step:  0, ledger: false },
  { name: 'Ré4',  step: -1, ledger: true  },
];

// Frequencies in Hz for each note
export const NOTE_FREQ = {
  // Treble
  'Do':   261.63,
  'Ré':   293.66,
  'Mi':   329.63,
  'Fa':   349.23,
  'Sol':  392.00,
  'La':   440.00,
  'Si':   493.88,
  'Do5':  523.25,
  'Ré5':  587.33,
  'Mi5':  659.25,
  'Fa5':  698.46,
  'Sol5': 783.99,
  // Bass
  'Sol2': 98.00,
  'La2':  110.00,
  'Si2':  123.47,
  'Do3':  130.81,
  'Ré3':  146.83,
  'Mi3':  164.81,
  'Fa3':  174.61,
  'Sol3': 196.00,
  'La3':  220.00,
  'Si3':  246.94,
  'Do4':  261.63,
  'Ré4':  293.66,
};

// Mapping French → Anglo note names
export const ANGLO_MAP = {
  'Do':   'C',  'Ré':   'D',  'Mi':   'E',  'Fa':   'F',  'Sol':  'G',  'La':   'A',  'Si':   'B',
  'Do3':  'C3', 'Ré3':  'D3', 'Mi3':  'E3', 'Fa3':  'F3', 'Sol3': 'G3', 'La3':  'A3', 'Si3':  'B3',
  'Do5':  'C5', 'Ré5':  'D5', 'Mi5':  'E5', 'Fa5':  'F5', 'Sol5': 'G5',
  'Sol2': 'G2', 'La2':  'A2', 'Si2':  'B2', 'Do4':  'C4', 'Ré4':  'D4',
};

// Piano extension groups (notes unlocked progressively)
export const pianoGroupsTreble = [
  { notes: ['Do5', 'Ré5', 'Mi5'] },
  { notes: ['Fa5', 'Sol5'] },
];

export const pianoGroupsBass = [
  // No extra groups defined for bass (Sol2 is the lowest, already in base)
];
