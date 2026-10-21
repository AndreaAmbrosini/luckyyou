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
