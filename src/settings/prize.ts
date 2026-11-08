// The prize: the job nobody wants, named before the show and "won" on the
// result. It is a setting, like the show played last; who won it is never kept.

/** The longest prize, in characters: one line on the result at most widths. */
export const PRIZE_MAX = 40;

/** Jobs the die suggests: real chores, and the joke is on the job. */
export const PRIZES: readonly string[] = [
  'Taking the meeting notes',
  'Running the retro',
  'Writing the release notes',
  "Next week's on-call",
  'Reviewing the 2,000-line PR',
  'Fixing the flaky test',
  'Cleaning the office fridge',
  'Demoing to the whole company',
];

/** A suggestion other than `current`, drawn with `random` (0 to 1). */
export function suggestPrize(current: string, random: () => number = Math.random): string {
  const others = PRIZES.filter((prize) => prize !== current.trim());
  return others[Math.floor(random() * others.length)] ?? others[0]!;
}

/** The prize a run is played for: the text as typed, trimmed; none when empty. */
export function prizeFor(text: string): string | undefined {
  return text.trim().slice(0, PRIZE_MAX) || undefined;
}
