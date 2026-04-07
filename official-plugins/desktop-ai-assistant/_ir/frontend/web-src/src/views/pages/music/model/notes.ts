export const MUSIC_NOTE_RANGE = {
  min: "C3",
  max: "B6",
} as const;

const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  DB: "C#",
  EB: "D#",
  GB: "F#",
  AB: "G#",
  BB: "A#",
};

export function parseNoteToMidi(rawNote: string): number | null {
  const trimmed = rawNote.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^([A-Ga-g])([#bB]?)(-?\d{1,2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const pitchBase = match[1].toUpperCase();
  const accidental = match[2] || "";
  const octave = Number(match[3]);
  if (!Number.isInteger(octave)) {
    return null;
  }

  const key = `${pitchBase}${accidental.toUpperCase()}`;
  const normalizedPitch = FLAT_TO_SHARP[key] || `${pitchBase}${accidental === "#" ? "#" : ""}`;
  const pitchIndex = CHROMATIC_NOTES.indexOf(normalizedPitch as (typeof CHROMATIC_NOTES)[number]);
  if (pitchIndex < 0) {
    return null;
  }

  return (octave + 1) * 12 + pitchIndex;
}

export function midiToNote(midi: number): string {
  const clamped = Math.max(0, Math.trunc(midi));
  const pitch = CHROMATIC_NOTES[clamped % 12];
  const octave = Math.floor(clamped / 12) - 1;
  return `${pitch}${octave}`;
}

export function noteToFrequency(note: string): number | null {
  const midi = parseNoteToMidi(note);
  if (midi === null) {
    return null;
  }
  return 440 * (2 ** ((midi - 69) / 12));
}

export function listNotesInRange(minNote: string, maxNote: string): string[] {
  const minMidi = parseNoteToMidi(minNote);
  const maxMidi = parseNoteToMidi(maxNote);
  if (minMidi === null || maxMidi === null || minMidi > maxMidi) {
    return [];
  }
  const notes: string[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    notes.push(midiToNote(midi));
  }
  return notes;
}

export const MUSIC_SUPPORTED_NOTES = listNotesInRange(MUSIC_NOTE_RANGE.min, MUSIC_NOTE_RANGE.max);

export function isSupportedMusicNote(note: string): boolean {
  const normalized = normalizeMusicNote(note);
  return normalized !== null;
}

export function normalizeMusicNote(rawNote: string): string | null {
  const midi = parseNoteToMidi(rawNote);
  if (midi === null) {
    return null;
  }
  const normalized = midiToNote(midi);
  return MUSIC_SUPPORTED_NOTES.includes(normalized) ? normalized : null;
}

