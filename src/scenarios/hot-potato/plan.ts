// Who catches the potato when, and how long each beat lasts. The show only
// acts out the app's pick: the plan is built backwards from the pop, which is
// always in the unlucky person's hands.

import { fitBeats, pickOne, shuffle } from '../../scenario-kit';

/** The show's beats, in the order they play. */
export const BEATS = [
  'plop',
  'hot-hands',
  'dud',
  'relight',
  'showdown',
  'last-throw',
  'freeze',
  'pop',
] as const;

export type Beat = (typeof BEATS)[number];

/**
 * The last throw: `straight` lands with the unlucky person; `back` goes from
 * the unlucky person to someone else, who throws it straight back; and
 * `boomerang` leaves the unlucky person's hands and curves back to them.
 */
export type Twist = 'straight' | 'back' | 'boomerang';

export interface Catch {
  readonly by: string;
  /** Who threw it; null for the plop, which drops from above. Equal to `by` for the boomerang. */
  readonly from: string | null;
  readonly beat: Beat;
  /**
   * Show seconds when the throw leaves the thrower's hands; for the plop,
   * when the potato starts dropping (0). The throw lasts `at − thrown`.
   */
  readonly thrown: number;
  /** Show seconds from the start of the show to the catch. */
  readonly at: number;
  /**
   * Seconds from the previous catch; for the plop, from the show's start.
   * Longer than the throw when someone holds the potato before throwing it.
   */
  readonly seconds: number;
  /** Sparkler left at the catch: 1 full, 0 the last spark. */
  readonly sparkler: number;
}

export interface Plan {
  /** Everyone, in their order around the ring; the first stands at the back. */
  readonly ring: readonly string[];
  /** Who stays in play for the showdown: 3, or 2 with 2 people. Includes the unlucky person. */
  readonly showdown: readonly string[];
  readonly twist: Twist;
  /** Where the sparkler goes out, and how long it is when it relights; null when it doesn't go out. */
  readonly dud: { readonly out: number; readonly relit: number } | null;
  readonly catches: readonly Catch[];
  /** Show seconds per beat; dud and relight are 0 without the dud. */
  readonly beats: Readonly<Record<Beat, number>>;
}

/** Every show is stretched to at least this many seconds. */
const SHORTEST = 15;
/** When the plop's catcher has it. */
const PLOP_CATCH = 0.8;
/** Hot hands starts with one throw per this many seconds of the beat. */
const HOT_HANDS_PACE = 0.6;
/** Each hot-hands throw is this much of the one before. */
const QUICKER = 0.88;
/** The shortest a throw may be (DESIGN.md: movement that matters ≥ 0.4 s). */
const SHORTEST_THROW = 0.4;
/** Each showdown throw is this much longer than the one before. */
const SLOWER = 1.2;
const DUD = { out: 0.55, relit: 0.4 };

/**
 * Throw lengths that shrink by `ratio` each time and add up to `total`
 * exactly.
 */
function lengths(total: number, count: number, ratio: number): number[] {
  const first = (total * (1 - ratio)) / (1 - ratio ** count);
  return Array.from({ length: count }, (_, index) => first * ratio ** index);
}

/** Someone from `among` other than `not`. */
function other(among: readonly string[], not: string, random: () => number): string {
  return pickOne(
    among.filter((name) => name !== not),
    random,
  );
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const ring = shuffle(names, random);
  const rest = names.filter((name) => name !== unlucky);
  const showdown = shuffle([unlucky, ...shuffle(rest, random).slice(0, 2)], random);
  const twist = pickOne<Twist>(['straight', 'back', 'boomerang'], random);
  const dud = random() < 0.5 ? DUD : null;

  // Without the dud, hot hands and the showdown stretch to 15 s; with it,
  // the show is already longer and nothing stretches.
  const beats = fitBeats<Beat>(
    {
      plop: { seconds: 1.6 },
      'hot-hands': { seconds: 3.0 + 0.1 * (count - 2), flexible: true },
      dud: { seconds: dud ? 2.2 : 0 },
      relight: { seconds: dud ? 1.0 : 0 },
      showdown: { seconds: count === 2 ? 4.4 : 3.6, flexible: true },
      'last-throw': { seconds: 1.4 },
      freeze: { seconds: 0.8 },
      pop: { seconds: 2.6 },
    },
    SHORTEST,
  );
  const hotHandsStart = beats.plop;
  const hotHandsEnd = hotHandsStart + beats['hot-hands'];
  const showdownStart = hotHandsEnd + beats.dud + beats.relight;
  const showdownEnd = showdownStart + beats.showdown;
  const lastThrowEnd = showdownEnd + beats['last-throw'];

  // Backwards from the pop: who throws the last throw, then the showdown,
  // then the hot-hands chain back to whoever catches the plop.
  const c3 = twist === 'straight' ? other(showdown, unlucky, random) : unlucky;
  const thrownBack = twist === 'back' ? other(showdown, unlucky, random) : null;
  const c2 = other(showdown, c3, random);
  const c1 = other(showdown, c2, random);
  // One throw per 0.6 s to start with, then one fewer while the last, and
  // quickest, would be under 0.4 s (at 7 people without the dud it would be
  // 0.3995 s with 7 throws).
  let throws = Math.floor(beats['hot-hands'] / HOT_HANDS_PACE);
  while (throws > 1 && lengths(beats['hot-hands'], throws, QUICKER).at(-1)! < SHORTEST_THROW) {
    throws--;
  }
  // With 2 people the chain alternates, so the plop's catcher follows from
  // the number of throws.
  const chain = [other(names, c1, random)];
  while (chain.length < throws + 1) chain.unshift(other(names, chain[0]!, random));

  const catches: Catch[] = [];
  const add = (
    by: string,
    from: string | null,
    beat: Beat,
    thrown: number,
    at: number,
    sparkler: number,
  ) => {
    const previous = catches.at(-1)?.at ?? 0;
    catches.push({ by, from, beat, thrown, at, seconds: at - previous, sparkler });
  };

  add(chain[0]!, null, 'plop', 0, PLOP_CATCH, 1);
  const hotHandsLow = dud ? DUD.out : 0.45;
  let thrown = hotHandsStart;
  lengths(beats['hot-hands'], throws, QUICKER).forEach((length, index) => {
    const at = index === throws - 1 ? hotHandsEnd : thrown + length;
    const burnt = (at - hotHandsStart) / beats['hot-hands'];
    add(chain[index + 1]!, chain[index]!, 'hot-hands', thrown, at, 1 - (1 - hotHandsLow) * burnt);
    thrown = at;
  });

  const slower = lengths(beats.showdown, 3, SLOWER);
  let holder = chain.at(-1)!;
  thrown = showdownStart;
  [c1, c2, c3].forEach((by, index) => {
    const at = index === 2 ? showdownEnd : thrown + slower[index]!;
    add(by, holder, 'showdown', thrown, at, 0.4 - 0.25 * ((at - showdownStart) / beats.showdown));
    holder = by;
    thrown = at;
  });

  if (twist === 'straight') {
    add(unlucky, c3, 'last-throw', showdownEnd + 0.4, lastThrowEnd, 0);
  } else if (thrownBack) {
    add(thrownBack, unlucky, 'last-throw', showdownEnd, showdownEnd + 0.6, 0.1);
    add(unlucky, thrownBack, 'last-throw', showdownEnd + 0.6, lastThrowEnd, 0);
  } else {
    add(unlucky, unlucky, 'last-throw', showdownEnd, lastThrowEnd, 0);
  }

  return { ring, showdown, twist, dud, catches, beats };
}
