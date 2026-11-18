// Who leaves the water when, and how long each beat lasts. The show only acts
// out the app's pick: the unlucky person is always the last one in the water.

import { eliminationOrder, pickOne, shuffle } from '../../scenario-kit';
import { places } from './layout';

/** The show's beats, in the order they play. */
export const BEATS = [
  'splash-in',
  'rescues',
  'four-left',
  'fake-out',
  'duel',
  'sharks-run',
  'victory-lap',
] as const;

export type Beat = (typeof BEATS)[number];

export type Rescue =
  /**
   * Before 4 left: the rope picks up one person, or two who float side by
   * side, and the helicopter flies them off. It takes `seconds`.
   */
  | { readonly kind: 'quick'; readonly lifted: readonly string[]; readonly seconds: number }
  /** At 4 left: the rope hovers over one person, then lifts them. */
  | { readonly kind: 'hover'; readonly lifted: string }
  /**
   * At 3 left: the rope heads for `decoy`, then swings to the one it lifts;
   * or, when `via` is set, the decoy is the one it lifts, and it swings away
   * to `via` and back.
   */
  | {
      readonly kind: 'fake-out';
      readonly decoy: string;
      readonly via: string | null;
      readonly lifted: string;
    }
  /**
   * The last two: the rope swings back and forth between them, starting with
   * the unlucky person, and hangs over the one it lifts before the hook comes
   * down. While it holds over `aims[feint]`, the helicopter sets off towards
   * the other one and turns back halfway. While it holds over `aims[slip]`,
   * always the unlucky person, the hook catches them, and they slip off.
   */
  | {
      readonly kind: 'duel';
      readonly aims: readonly string[];
      readonly feint: number | null;
      readonly slip: number | null;
      readonly lifted: string;
    };

export interface Plan {
  /** Everyone, in the order of the places they start in. */
  readonly start: readonly string[];
  readonly rescues: readonly Rescue[];
  /** Show seconds per beat; a beat that doesn't happen at this head count lasts 0. */
  readonly beats: Readonly<Record<Beat, number>>;
}

/** From this many left, the rescues slow down: a hover, a fake-out, then the duel. */
const SLOW_FROM = 4;
/** Up to this many people, everyone leaves on their own; above it, the surplus leaves in pairs. */
const ALONE_UP_TO = 8;
/** Seconds for each quick rescue, the one just before 4 left first. */
const QUICK = [2.4, 2.25, 2.1, 2.0];
/** A quick rescue that lifts two takes this much longer. */
const PAIR = 0.3;
/** Each quick rescue takes at least this much longer than the one before. */
const SLOWER = 0.1;
/** How long the show lasts, in seconds, by head count; from 9 on, a little longer for each. */
const LENGTH: Readonly<Record<number, number>> = {
  2: 13.4,
  3: 16.2,
  4: 19.2,
  5: 22.2,
  6: 25,
  7: 26.4,
  8: 27.4,
};
const lengthFor = (count: number) => LENGTH[count] ?? LENGTH[ALONE_UP_TO]! + 0.2 * (count - 8);

/**
 * The duel takes one of a few shapes, at random. With two people: straight
 * back and forth, the same with a feint in the hang over the one it lifts,
 * or the same with a slip the second time over the unlucky person. With
 * more: straight back and forth, or across once, with a feint over either
 * of the two or a slip over the unlucky person.
 */
function duel(unlucky: string, lifted: string, pair: boolean, random: () => number): Rescue {
  const across = [unlucky, lifted, unlucky, lifted];
  const once = [unlucky, lifted];
  const shapes = pair
    ? [
        { aims: across, feint: null, slip: null },
        { aims: across, feint: 3, slip: null },
        { aims: across, feint: null, slip: 2 },
      ]
    : [
        { aims: across, feint: null, slip: null },
        { aims: once, feint: 0, slip: null },
        { aims: once, feint: 1, slip: null },
        { aims: once, feint: null, slip: 0 },
      ];
  return { kind: 'duel', lifted, ...pickOne(shapes, random) };
}

/**
 * Who leaves in each quick rescue: `pairs` of `leaving` go two at a time,
 * first, each pair the two who start closest together; the rest go one at a
 * time, in the order they leave.
 */
function quickLifts(
  leaving: readonly string[],
  start: readonly string[],
  pairs: number,
): string[][] {
  const spots = places(start.length);
  const spot = (name: string) => spots[start.indexOf(name)]!;
  const apart = (a: string, b: string) =>
    Math.hypot(spot(a).x - spot(b).x, 2 * (spot(a).y - spot(b).y));
  const alone = [...leaving];
  const together: string[][] = [];
  for (let pair = 0; pair < pairs; pair++) {
    let best: [number, number] = [0, 1];
    for (let a = 0; a < alone.length; a++) {
      for (let b = a + 1; b < alone.length; b++) {
        if (apart(alone[a]!, alone[b]!) < apart(alone[best[0]]!, alone[best[1]]!)) best = [a, b];
      }
    }
    const [second] = alone.splice(best[1], 1);
    const [first] = alone.splice(best[0], 1);
    together.push([first!, second!]);
  }
  return [...together, ...alone.map((name) => [name])];
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const order = eliminationOrder(names, unlucky, random);
  const start = shuffle(names, random);
  const count = names.length;

  const fast = Math.max(0, count - SLOW_FROM);
  const lifts = quickLifts(order.slice(0, fast), start, Math.max(0, count - ALONE_UP_TO));
  const rescues: Rescue[] = [];
  lifts.forEach((lifted, index) => {
    const before = rescues.at(-1);
    const seconds = Math.max(
      QUICK[lifts.length - 1 - index]! + (lifted.length > 1 ? PAIR : 0),
      before?.kind === 'quick' ? before.seconds + SLOWER : 0,
    );
    rescues.push({ kind: 'quick', lifted, seconds: Math.round(seconds * 100) / 100 });
  });

  for (let index = fast; index < order.length - 1; index++) {
    const lifted = order[index]!;
    const inWater = order.slice(index);
    const others = inWater.filter((name) => name !== lifted);
    if (inWater.length === 4) {
      rescues.push({ kind: 'hover', lifted });
    } else if (inWater.length === 3) {
      rescues.push(
        random() < 0.5
          ? { kind: 'fake-out', decoy: pickOne(others, random), via: null, lifted }
          : { kind: 'fake-out', decoy: lifted, via: pickOne(others, random), lifted },
      );
    } else {
      rescues.push(duel(unlucky, lifted, count === 2, random));
    }
  }

  // A slip in the duel takes longer.
  const slip = rescues.some((rescue) => rescue.kind === 'duel' && rescue.slip !== null);
  // A fake-out that swings away and back swings twice, so it takes longer too.
  const twice = rescues.some((rescue) => rescue.kind === 'fake-out' && rescue.via);
  const fixed = {
    'splash-in': 3.0,
    rescues: rescues.reduce(
      (total, rescue) => total + (rescue.kind === 'quick' ? rescue.seconds : 0),
      0,
    ),
    'sharks-run': count === 2 ? 1.7 : 1.6,
    'victory-lap': count === 2 ? 2.5 : 2.2,
  };
  // The slow rescues share out the rest of the show, each as long as its
  // share: the hover, then longer for the fake-out, and longest for the duel.
  const shares = {
    'four-left': count >= 4 ? 3.0 : 0,
    'fake-out': count >= 3 ? 3.6 + (twice ? 0.3 : 0) : 0,
    duel: (count === 2 ? 5.4 : 4.7) + (slip ? 0.3 : 0),
  };
  const rest = lengthFor(count) - Object.values(fixed).reduce((total, each) => total + each, 0);
  const shared = Object.values(shares).reduce((total, each) => total + each, 0);
  const beats = { ...fixed } as Record<Beat, number>;
  for (const [beat, share] of Object.entries(shares)) {
    beats[beat as Beat] = (rest * share) / shared;
  }
  return { start, rescues, beats };
}
