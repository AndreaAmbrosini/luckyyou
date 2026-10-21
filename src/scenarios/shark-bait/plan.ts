// Who leaves the water when, and how long each beat lasts. The show only acts
// out the app's pick: the unlucky person is always the last one in the water.

import { eliminationOrder, fitBeats, pickOne, shuffle } from '../../scenario-kit';

/** The show's beats, in the order they play. */
export const BEATS = [
  'splash-in',
  'group-rescues',
  'four-left',
  'fake-out',
  'duel',
  'sharks-run',
  'victory-lap',
] as const;

export type Beat = (typeof BEATS)[number];

export type Rescue =
  /** A quick swoop that lifts several people at once. */
  | { readonly kind: 'group'; readonly lifted: readonly string[] }
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
  /** The last two: the rope swings between them, starting with the unlucky person. */
  | { readonly kind: 'duel'; readonly aims: readonly string[]; readonly lifted: string };

export interface Plan {
  /** Everyone, in the order of the places they start in. */
  readonly start: readonly string[];
  readonly rescues: readonly Rescue[];
  /** Show seconds per beat; a beat that doesn't happen at this head count lasts 0. */
  readonly beats: Readonly<Record<Beat, number>>;
}

/** How many people go in quick group swoops before the rescues slow down. */
const SLOW_FROM = 4;
/** The most a swoop lifts at once. */
const SWOOP_MAX = 4;
/** Every show is stretched to at least this many seconds. */
const SHORTEST = 11.5;

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const order = eliminationOrder(names, unlucky, random);
  const start = shuffle(names, random);
  const count = names.length;

  const fast = Math.max(0, count - SLOW_FROM);
  const swoops = fast === 0 ? 0 : fast < SWOOP_MAX ? 1 : 2;
  const firstSwoop = Math.ceil(fast / Math.max(swoops, 1));
  const rescues: Rescue[] = [];
  if (swoops > 0) rescues.push({ kind: 'group', lifted: order.slice(0, firstSwoop) });
  if (swoops > 1) rescues.push({ kind: 'group', lifted: order.slice(firstSwoop, fast) });

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
      const aims = count === 2 ? [unlucky, lifted, unlucky, lifted] : [unlucky, lifted];
      rescues.push({ kind: 'duel', aims, lifted });
    }
  }

  // With 4 or fewer, the slow rescues open the show and take a little longer.
  const slower = count <= SLOW_FROM ? 0.2 : 0;
  const beats = fitBeats<Beat>(
    {
      'splash-in': { seconds: count === 2 ? 2.0 : 1.8 },
      'group-rescues': { seconds: swoops * 1.0 },
      'four-left': { seconds: count >= 4 ? 1.6 + slower : 0, flexible: true },
      'fake-out': { seconds: count >= 3 ? 2.0 + slower : 0, flexible: true },
      duel: { seconds: count === 2 ? 5.5 : 2.6 + slower, flexible: true },
      'sharks-run': { seconds: count === 2 ? 1.5 : 1.4 },
      'victory-lap': { seconds: count === 2 ? 2.5 : 2.0 },
    },
    SHORTEST,
  );
  return { start, rescues, beats };
}
