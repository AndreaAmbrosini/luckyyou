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
  'duel',
  'last-second',
  'pop',
] as const;

export type Beat = (typeof BEATS)[number];

/**
 * How the last second goes: `too-hot`, the other one in the duel holds it at
 * its last spark and flings it onto the unlucky person; `hang-time`, the
 * duel's last throw floats up high and drops onto the unlucky person; and
 * `holding-on`, the unlucky person winds up to throw and it pops before they
 * let go.
 */
export type Ending = 'too-hot' | 'hang-time' | 'holding-on';

export interface Catch {
  readonly by: string;
  /**
   * Who threw it; null for the plop, which drops from above. Equal to `by`
   * when the unlucky person throws it up and it hangs, then drops back on them.
   */
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
  /** In play for the showdown: 3, the unlucky person among them; both with 2 people. */
  readonly showdown: readonly string[];
  /** The two in the duel, the unlucky person among them. */
  readonly duel: readonly [string, string];
  /** Who says "Phew!" and steps back after the showdown's two catches; null with 2 people. */
  readonly phew: string | null;
  readonly ending: Ending;
  /** Where the sparkler goes out, and how long it is when it relights; null when it doesn't go out. */
  readonly dud: { readonly out: number; readonly relit: number } | null;
  readonly catches: readonly Catch[];
  /** Show seconds per beat; dud and relight are 0 without the dud, the showdown 0 with 2 people. */
  readonly beats: Readonly<Record<Beat, number>>;
  /** Show seconds when the sparkler reaches its last spark: inside the last second. */
  readonly lastSpark: number;
  /** Show seconds while the potato barely moves before the final move. */
  readonly still: { readonly from: number; readonly to: number };
  /** Show seconds of each heartbeat, from the duel's start to before the pop, closer and closer. */
  readonly heartbeats: readonly number[];
}

/** Every show is stretched to at least this many seconds. */
const SHORTEST = 16;
/** When the plop's catcher has it. */
const PLOP_CATCH = 0.8;
/** Hot hands starts with one throw per this many seconds of the beat. */
const HOT_HANDS_PACE = 0.6;
/** Each hot-hands throw is this much of the one before. */
const QUICKER = 0.88;
/** The shortest a throw may be (DESIGN.md: movement that matters ≥ 0.4 s). */
const SHORTEST_THROW = 0.4;
const DUD = { out: 0.55, relit: 0.4 };
/** The showdown's two catches, in seconds from its start, and the sparkler left at each. */
const SHOWDOWN = [
  { thrown: 0, at: 0.8, sparkler: 0.35 },
  { thrown: 0.8, at: 1.7, sparkler: 0.25 },
];
/** Seconds the two take to step into the middle before the duel's first throw. */
const STEP_IN = 0.5;
/** The duel's three throws with 3 or more people, in proportion. */
const DUEL_FLIGHTS = [0.95, 1.2, 1.45];
/** With 2 people the duel has 5 throws, each this much longer than the one before. */
const PAIR_DUEL = { throws: 5, slower: 1.14 };
/** The sparkler at the duel's first catch and at its last. */
const DUEL_SPARKLER = { first: 0.15, last: 0.05 };
/**
 * Per ending, in seconds from the start of the last second: when the sparkler
 * reaches its last spark, and while the potato barely moves.
 */
const ENDINGS: Readonly<Record<Ending, { lastSpark: number; still: [number, number] }>> = {
  'too-hot': { lastSpark: 0.4, still: [0.4, 1.3] },
  'hang-time': { lastSpark: 0.6, still: [0.6, 1.3] },
  'holding-on': { lastSpark: 0.8, still: [0.8, 1.5] },
};
/** The first heartbeat gap, how much shorter each next one is, and the shortest. */
const HEARTBEAT = { first: 0.9, quicker: 0.88, shortest: 0.4 };

/**
 * Throw lengths that change by `ratio` each time and add up to `total`
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
  const pair = count === 2;
  const ring = shuffle(names, random);
  const rest = names.filter((name) => name !== unlucky);
  const showdown = shuffle([unlucky, ...shuffle(rest, random).slice(0, 2)], random);
  const partner = other(showdown, unlucky, random);
  const duel = showdown.filter((name) => name === unlucky || name === partner) as [string, string];
  const phew = showdown.find((name) => !duel.includes(name)) ?? null;
  const ending = pickOne<Ending>(['too-hot', 'hang-time', 'holding-on'], random);
  const dud = random() < 0.5 ? DUD : null;
  const thrower = ending === 'hang-time' ? pickOne(duel, random) : null;

  // Without the dud, hot hands and the duel stretch to 16 s; with it, the
  // show is already longer and nothing stretches.
  const beats = fitBeats<Beat>(
    {
      plop: { seconds: 1.6 },
      'hot-hands': { seconds: 3.0 + 0.04 * (count - 2), flexible: true },
      dud: { seconds: dud ? 1.8 : 0 },
      relight: { seconds: dud ? 1.0 : 0 },
      showdown: { seconds: pair ? 0 : 2.6 },
      duel: { seconds: pair ? 6.7 : 4.1, flexible: true },
      'last-second': { seconds: 2.0 },
      pop: { seconds: 2.6 },
    },
    SHORTEST,
  );
  const hotHandsStart = beats.plop;
  const hotHandsEnd = hotHandsStart + beats['hot-hands'];
  const showdownStart = hotHandsEnd + beats.dud + beats.relight;
  const duelStart = showdownStart + beats.showdown;
  const lastSecond = duelStart + beats.duel;
  const pop = lastSecond + beats['last-second'];

  // Backwards from the pop: who holds it when the duel ends, then who holds
  // it first in the duel (the count of duel throws is odd, so the other one),
  // then the showdown, then the hot-hands chain back to the plop's catcher.
  const end = ending === 'too-hot' ? partner : ending === 'holding-on' ? unlucky : thrower!;
  const opener = duel.find((name) => name !== end)!;
  const c1 = pair ? null : other(showdown, opener, random);
  // One throw per 0.6 s to start with, then one fewer while the last, and
  // quickest, would be under 0.4 s.
  let throws = Math.floor(beats['hot-hands'] / HOT_HANDS_PACE);
  while (throws > 1 && lengths(beats['hot-hands'], throws, QUICKER).at(-1)! < SHORTEST_THROW) {
    throws--;
  }
  // With 2 people the chain alternates, so the plop's catcher follows from
  // the number of throws.
  const chain = [c1 === null ? opener : other(names, c1, random)];
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

  // The showdown: two catches, then nobody throws until the duel.
  let holder = chain.at(-1)!;
  if (c1 !== null) {
    [c1, opener].forEach((by, index) => {
      const step = SHOWDOWN[index]!;
      add(
        by,
        holder,
        'showdown',
        showdownStart + step.thrown,
        showdownStart + step.at,
        step.sparkler,
      );
      holder = by;
    });
  }

  // The duel: back and forth, each throw slower, from the step-in (with 3 or
  // more people) to the last second.
  const flights = pair
    ? lengths(beats.duel, PAIR_DUEL.throws, PAIR_DUEL.slower)
    : DUEL_FLIGHTS.map(
        (flight) => (flight * (beats.duel - STEP_IN)) / DUEL_FLIGHTS.reduce((a, b) => a + b),
      );
  thrown = pair ? duelStart : duelStart + STEP_IN;
  flights.forEach((flight, index) => {
    const by = holder === duel[0] ? duel[1] : duel[0];
    const at = index === flights.length - 1 ? lastSecond : thrown + flight;
    const burnt = index / (flights.length - 1);
    const sparkler = DUEL_SPARKLER.first - (DUEL_SPARKLER.first - DUEL_SPARKLER.last) * burnt;
    add(by, holder, 'duel', thrown, at, sparkler);
    holder = by;
    thrown = at;
  });

  // The last second: too hot, it's flung as the stillness ends; hanging,
  // the duel's last catcher throws it up at once.
  const { lastSpark, still } = ENDINGS[ending];
  if (ending === 'too-hot') add(unlucky, partner, 'last-second', lastSecond + still[1], pop, 0);
  if (ending === 'hang-time') add(unlucky, thrower, 'last-second', lastSecond, pop, 0);

  const heartbeats: number[] = [];
  for (let time = duelStart, k = 0; time < pop; k++) {
    heartbeats.push(time);
    time += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** k);
  }

  return {
    ring,
    showdown,
    duel,
    phew,
    ending,
    dud,
    catches,
    beats,
    lastSpark: lastSecond + lastSpark,
    still: { from: lastSecond + still[0], to: lastSecond + still[1] },
    heartbeats,
  };
}
