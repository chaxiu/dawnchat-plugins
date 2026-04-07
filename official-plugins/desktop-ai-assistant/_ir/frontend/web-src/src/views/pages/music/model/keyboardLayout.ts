const BLACK_NOTE_SUFFIX = "#";

export interface PianoWhiteKey {
  note: string;
  white_index: number;
}

export interface PianoBlackKey {
  note: string;
  anchor_white_index: number;
  left_percent: number;
}

export interface PianoKeyboardLayout {
  white_keys: PianoWhiteKey[];
  black_keys: PianoBlackKey[];
  white_key_count: number;
}

function isBlackNote(note: string): boolean {
  return note.includes(BLACK_NOTE_SUFFIX);
}

export function buildPianoKeyboardLayout(notes: string[]): PianoKeyboardLayout {
  const whiteKeys: PianoWhiteKey[] = [];
  const blackKeys: Array<{ note: string; anchor_white_index: number }> = [];
  let whiteIndex = -1;

  notes.forEach((note) => {
    if (!isBlackNote(note)) {
      whiteIndex += 1;
      whiteKeys.push({
        note,
        white_index: whiteIndex,
      });
      return;
    }
    if (whiteIndex >= 0) {
      blackKeys.push({
        note,
        anchor_white_index: whiteIndex,
      });
    }
  });

  const whiteKeyCount = whiteKeys.length;
  const normalizedBlackKeys: PianoBlackKey[] = blackKeys.map((key) => {
    const leftPercent = whiteKeyCount > 0
      ? ((key.anchor_white_index + 1) / whiteKeyCount) * 100
      : 0;
    return {
      note: key.note,
      anchor_white_index: key.anchor_white_index,
      left_percent: leftPercent,
    };
  });

  return {
    white_keys: whiteKeys,
    black_keys: normalizedBlackKeys,
    white_key_count: whiteKeyCount,
  };
}

