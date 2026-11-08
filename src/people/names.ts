export const MAX_NAME_LENGTH = 30;

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** A name as the list keeps it: composed, trimmed, with single spaces. */
export function tidyName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Characters as people see them: a flag or an accented letter counts as one. */
export function nameLength(name: string): number {
  return Array.from(graphemes.segment(name)).length;
}

/** Two names are the same person when they differ only in case. */
export function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'en', { sensitivity: 'accent' }) === 0;
}

/** Alphabetical order, where case doesn't change the order. */
export const compareNames = new Intl.Collator('en').compare;

export type NameCheck =
  { ok: true; name: string } | { ok: false; message: string; existing?: string };

/** Whether `raw`, once tidied, can join a list that already holds `names`. */
export function checkNewName(raw: string, names: readonly string[]): NameCheck {
  const name = tidyName(raw);
  if (name === '') return { ok: false, message: 'Type a name first.' };

  const length = nameLength(name);
  if (length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      message: `A name can have up to ${MAX_NAME_LENGTH} characters. This one has ${length}.`,
    };
  }

  const existing = names.find((other) => sameName(other, name));
  if (existing) return { ok: false, message: `${existing} is already on the list.`, existing };

  return { ok: true, name };
}

/** The names in what was typed or pasted: split at commas, semicolons, tabs and new lines. */
export function splitNames(raw: string): string[] {
  return raw
    .split(/[,;\t\r\n]/)
    .map(tidyName)
    .filter((name) => name !== '');
}

export interface NamesCheck {
  /** The names that can join, in the order given. */
  readonly add: readonly string[];
  /** Names already on the list, as the list spells them. */
  readonly existing: readonly string[];
  /** The names that are too long, to type again shorter. */
  readonly tooLong: readonly string[];
  /** What was skipped and why, in one line; null when nothing was. */
  readonly message: string | null;
}

/**
 * Which of the names in `raw` can join a list that holds `names`. One name
 * keeps `checkNewName`'s message; several are summed up in one line.
 */
export function checkNewNames(raw: string, names: readonly string[]): NamesCheck {
  const pieces = splitNames(raw);
  if (pieces.length <= 1) {
    const check = checkNewName(pieces[0] ?? '', names);
    if (check.ok) return { add: [check.name], existing: [], tooLong: [], message: null };
    return {
      add: [],
      existing: check.existing ? [check.existing] : [],
      tooLong: check.existing ? [] : pieces,
      message: check.message,
    };
  }

  const add: string[] = [];
  const existing: string[] = [];
  const tooLong: string[] = [];
  for (const piece of pieces) {
    const check = checkNewName(piece, [...names, ...add]);
    if (check.ok) add.push(check.name);
    else if (!check.existing) tooLong.push(piece);
    else if (!existing.includes(check.existing)) existing.push(check.existing);
  }

  const parts: string[] = [];
  if (existing.length > 0) {
    parts.push(`${listed(existing)} ${existing.length === 1 ? 'is' : 'are'} already on the list.`);
  }
  if (tooLong.length > 0) {
    const count = tooLong.length === 1 ? '1 name is' : `${tooLong.length} names are`;
    parts.push(`${count} over ${MAX_NAME_LENGTH} characters.`);
  }
  if (parts.length > 0 && add.length > 0) parts.unshift(`Added ${add.length}.`);
  return { add, existing, tooLong, message: parts.length > 0 ? parts.join(' ') : null };
}

/** "Anna", "Anna and Ben", "Anna, Ben and Carla", "Anna, Ben and 3 more". */
function listed(names: readonly string[]): string {
  if (names.length <= 3) {
    return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
