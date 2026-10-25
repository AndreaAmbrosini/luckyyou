// Who has the potato when, and how long each part lasts. The show only acts
// out the app's pick: the plan is built backwards from the pop, which is
// always on the unlucky person. First the ending, then the order round the
// ring from the first of the last three, then where the plop lands.

import { pickOne, shuffle } from '../../scenario-kit';

/** The show's parts, in the order they play. */
export const BEATS = ['plop', 'laps', 'last-lap', 'crawl', 'last-second', 'pop'] as const;

export type Beat = (typeof BEATS)[number];

/**
 * How the last second goes, all from the second of the last three:
 * `holding-on`, the second is the unlucky person, holds it out towards the
 * third and it pops before they let go; `too-hot`, it reaches its last spark
 * in the second's hands and they fling it to the third, the unlucky person;
 * `hangs`, the second's pass floats up high and drops onto the unlucky one of
 * the second and the third; `strays`, it reaches its last spark in the
 * second's hands and they fling it across the ring onto the unlucky person,
 * already sitting.
 */
export type Ending = 'holding-on' | 'too-hot' | 'hangs' | 'strays';

export interface Catch {
  readonly by: string;
  /**
   * Who passed it; null for the plop, which drops from above. Equal to `by`
   * when the second's pass hangs and drops back onto them.
   */
  readonly from: string | null;
  readonly beat: Beat;
  /**
   * Show seconds when the pass leaves the passer's hands; for the plop, when
   * the potato starts dropping (0). The flight lasts `at − thrown`.
   */
  readonly thrown: number;
  /** Show seconds from the start of the show to the catch. */
  readonly at: number;
  /**
   * Seconds from the previous catch; for the plop, from the show's start.
   * Longer than the flight when the passer holds it a moment first.
   */
  readonly seconds: number;
}

export interface Plan {
  /** Everyone, by their spot round the ring: the first at the back, then clockwise. */
  readonly ring: readonly string[];
  /** Every pass goes to the next spot clockwise (1) or the other way (−1). */
  readonly direction: 1 | -1;
  /**
   * The last three standing, in passing order: the potato is with the first
   * when the last lap ends. With 2 people the third is the first again.
   */
  readonly three: readonly [string, string, string];
  readonly ending: Ending;
  /** The crawl goes back once: second to first to second. */
  readonly back: boolean;
  /** Who says "Phew!" and sits down, and when, in order. */
  readonly sits: readonly { readonly name: string; readonly at: number }[];
  readonly catches: readonly Catch[];
  /** Show seconds per part. */
  readonly beats: Readonly<Record<Beat, number>>;
  /** Show seconds when the fuse and the sparkler reach their last spark: inside the last second. */
  readonly lastSpark: number;
  /** Show seconds while the potato barely moves before the final move. */
  readonly still: { readonly from: number; readonly to: number };
  /** Show seconds of each heartbeat, from the last lap's start to before the pop, closer and closer. */
  readonly heartbeats: readonly number[];
}

const PLOP = 1.6;
/** When the plop's catcher has it. */
const PLOP_CATCH = 0.8;
/** Seconds per pass in the laps, all of it a flight. */
const LAP_PASS = 0.45;
/**
 * The last lap's passes grow from `first` to `last` seconds, squeezed to
 * `most` in all; a single pass takes `one`. A pass is a hesitation, then a
 * flight of `least` to `longest` seconds (DESIGN.md: movement that matters ≥ 0.4 s).
 */
const LAST_LAP = { first: 0.8, last: 1.8, most: 7, one: 1.2 };
const FLIGHT = { least: 0.4, longest: 0.6 };
/** The crawl, first to second, and each pass of going back: seconds in all, and held before the flight. */
const CRAWL = { seconds: 2, hold: 0.5 };
const BACK = { seconds: 1.5, hold: 0.5, chance: 0.4 };
/** How often it strays, from 3 people. */
const STRAY = 1 / 8;
const LAST_SECOND = 2.5;
const POP = 2.6;
/**
 * Per ending, in seconds from the start of the last second: when the fuse
 * reaches its last spark, while the potato barely moves, and when the last
 * pass leaves the second's hands (null: it never does).
 */
const ENDINGS: Readonly<
  Record<Ending, { lastSpark: number; still: [number, number]; thrown: number | null }>
> = {
  'holding-on': { lastSpark: 1.2, still: [1.2, 1.9], thrown: null },
  'too-hot': { lastSpark: 0.9, still: [0.9, 1.8], thrown: 1.8 },
  hangs: { lastSpark: 1.1, still: [1.1, 1.8], thrown: 0.5 },
  strays: { lastSpark: 0.9, still: [0.9, 1.7], thrown: 1.7 },
};
/** The first heartbeat gap, how much shorter each next one is, and the shortest. */
const HEARTBEAT = { first: 0.9, quicker: 0.9, shortest: 0.4 };

const mod = (value: number, count: number) => ((value % count) + count) % count;

/** The last lap's pass lengths for `count` passes. */
function lastLap(count: number): number[] {
  if (count === 1) return [LAST_LAP.one];
  const ratio = (LAST_LAP.last / LAST_LAP.first) ** (1 / (count - 1));
  const passes = Array.from({ length: count }, (_, k) => LAST_LAP.first * ratio ** k);
  const sum = passes.reduce((a, b) => a + b, 0);
  return sum > LAST_LAP.most ? passes.map((pass) => (pass * LAST_LAP.most) / sum) : passes;
}

/** The flight of a pass that takes `seconds`, the rest a hesitation. */
const flightOf = (seconds: number) =>
  Math.min(seconds, Math.max(FLIGHT.least, Math.min(FLIGHT.longest, seconds / 2)));

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const pair = count === 2;
  const ending: Ending =
    !pair && random() < STRAY
      ? 'strays'
      : pickOne<Ending>(['holding-on', 'too-hot', 'hangs'], random);

  // The passing order from the first of the last three, and where the
  // unlucky person is in it: the second or the third, or for a stray the
  // first or anyone after the third.
  const third = 2 % count;
  const place =
    ending === 'holding-on'
      ? 1
      : ending === 'too-hot'
        ? third
        : ending === 'hangs'
          ? pickOne([1, third], random)
          : random() < 1 / (count - 2)
            ? 0
            : 3 + Math.floor(random() * (count - 3));
  const order = shuffle(
    names.filter((name) => name !== unlucky),
    random,
  );
  order.splice(place, 0, unlucky);
  const three = [order[0]!, order[1]!, order[third]!] as const;

  // Laid round the ring the way it's passed, turned by a random offset.
  const direction = random() < 0.5 ? 1 : -1;
  const offset = Math.floor(random() * count);
  const ring: string[] = [];
  order.forEach((name, k) => (ring[mod(offset + direction * k, count)] = name));

  // At least 8 passes in the laps and once round, and a few more at random.
  const laps = Math.max(
    8 + Math.floor(random() * 3),
    count + Math.floor(random() * (Math.ceil(count / 2) + 1)),
  );
  const last = lastLap(pair ? 1 : count - 2);
  const back = !pair && random() < BACK.chance;

  const catches: Catch[] = [];
  const sits: { name: string; at: number }[] = [];
  const add = (by: string, from: string | null, beat: Beat, thrown: number, at: number) => {
    const previous = catches.at(-1)?.at ?? 0;
    catches.push({ by, from, beat, thrown, at, seconds: at - previous });
  };

  // Counted back from the first of the three, so the last lap ends with them.
  let k = mod(-(laps + last.length), count);
  add(order[k]!, null, 'plop', 0, PLOP_CATCH);
  let time = PLOP;
  const pass = (beat: Beat, seconds: number, flight: number) => {
    const from = order[k]!;
    k = mod(k + 1, count);
    add(order[k]!, from, beat, time + seconds - flight, time + seconds);
    time += seconds;
    return from;
  };
  for (let n = 0; n < laps; n++) pass('laps', LAP_PASS, LAP_PASS);
  const lastLapStart = time;
  // Whoever passes it on in the last lap sits as it lands, but the first:
  // it'll come back to them as the third of the three.
  last.forEach((seconds, n) => {
    const from = pass('last-lap', seconds, flightOf(seconds));
    if (n > 0) sits.push({ name: from, at: time });
  });

  // The crawl: first to second, and maybe back and on again.
  const crawlStart = time;
  const [first, second] = three;
  add(second, first, 'crawl', time + CRAWL.hold, time + CRAWL.seconds);
  time += CRAWL.seconds;
  if (back) {
    add(first, second, 'crawl', time + BACK.hold, time + BACK.seconds);
    time += BACK.seconds;
    add(second, first, 'crawl', time + BACK.hold, time + BACK.seconds);
    time += BACK.seconds;
  }
  if (!pair) sits.push({ name: first, at: time });

  const lastSecond = time;
  const pop = lastSecond + LAST_SECOND;
  const { lastSpark, still, thrown } = ENDINGS[ending];
  if (thrown !== null) add(unlucky, second, 'last-second', lastSecond + thrown, pop);

  const heartbeats: number[] = [];
  for (let at = lastLapStart, n = 0; at < pop; n++) {
    heartbeats.push(at);
    at += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** n);
  }

  return {
    ring,
    direction,
    three,
    ending,
    back,
    sits,
    catches,
    beats: {
      plop: PLOP,
      laps: lastLapStart - PLOP,
      'last-lap': crawlStart - lastLapStart,
      crawl: lastSecond - crawlStart,
      'last-second': LAST_SECOND,
      pop: POP,
    },
    lastSpark: lastSecond + lastSpark,
    still: { from: lastSecond + still[0], to: lastSecond + still[1] },
    heartbeats,
  };
}
