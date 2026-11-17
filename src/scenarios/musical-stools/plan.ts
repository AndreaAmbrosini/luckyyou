// The plan of a show: who sits when, when the gramophone fakes everyone out,
// and how long each stretch lasts. Times are show seconds. Nothing here
// touches the stage and nothing depends on reduced motion, so the story is
// the same for everyone.

import { pickOne, shuffle } from '../../scenario-kit';

export type Ending = 'clean-beat' | 'encore-fakeout' | 'hip-bump';
export type Kind = 'pre' | 'spot' | 'duel';

export const ENDINGS: readonly Ending[] = ['clean-beat', 'encore-fakeout', 'hip-bump'];

/** The needle drops and the marching starts. */
export const START = 0.7;
/** Seconds the marchers stand frozen after the music stops, by kind of round. */
export const FREEZE: Readonly<Record<Kind, number>> = { pre: 0.45, spot: 0.6, duel: 0.7 };
/** Seconds from the scramble's start to the first sitter landing, and between sitters. */
export const ARRIVE = 0.4;
export const ARRIVE_GAP = 0.28;
/** Seconds the last sitter stays on the stool, cheering, before the first one hops away. */
export const HOLD = 0.45;
export const HOP = 0.7;
/** Sitters leave one after another, in the order they landed. */
export const HOP_GAP = 0.15;
/** The last hop is quicker. */
export const HOP_LAST = 0.6;
/** Seconds from the last sitter's hop to the music starting again: the first stop breathes most. */
const AFTER = { slow: 1.0, quick: 0.59 };
/** Each round's staging (landings, holds, hops, the wait) is this much tighter than the one before. */
const TIGHTEN = 0.22;
const TIGHTEST = 0.45;
export const SIT_TO_FANFARE = 0.45;
/** Seconds the hip-bump's tumble sounds before the sitter lands. */
export const TUMBLE_LEAD = 0.25;
/** No sound comes closer than this to a heartbeat. */
const QUIET = 0.25;
/** Seconds from the fanfare to the end. */
export const REVEAL = 2.7;
/** The show lasts at least this long; a bigger group grows it to the aim at 8 people. */
const FLOOR = 21;
const AIM = 29.0;
const AIM_MORE = 0.6;
const FIRST_STOP = { few: 3.9, eight: 10.05, twelve: 7.85 } as const;
const GAP_STEP = 0.15;
const FADE = 1.8;

/** The least marching a round needs, by kind. */
const MARCH_MIN: Readonly<Record<Kind, number>> = {
  pre: 1.5,
  spot: 1.3,
  duel: 2.4,
};

const STUTTER = 0.75;
/** Beats a second in the first round; each round is a little quicker. */
const PACE = 3.3;
const QUICKER = 1.08;

export interface Stutter {
  readonly at: number;
  readonly end: number;
}

export interface Round {
  readonly kind: Kind;
  /** Who marches, in ring order. */
  readonly marchers: readonly string[];
  readonly sitters: readonly string[];
  readonly stools: number;
  readonly begin: number;
  /** The real stop. */
  readonly stop: number;
  readonly stutters: readonly Stutter[];
  readonly windows: readonly {
    readonly from: number;
    readonly to: number;
    readonly speed: number;
  }[];
  /** The scramble starts. */
  readonly scramble: number;
  /** When each sitter lands, earliest first. */
  readonly arrivals: readonly number[];
  /** When each sitter starts hopping to the lounge, in the order they landed. */
  readonly leaves: readonly number[];
  /** The first sitter starts hopping to the lounge. */
  readonly hop: number;
  readonly hopLength: number;
  /** The next round begins; for the duel, never. */
  readonly next: number;
  readonly stoolsFrom: number;
  readonly stoolsTo: number;
}

export interface Plan {
  readonly ending: Ending;
  /** All the people, in ring order. */
  readonly ring: readonly string[];
  readonly rounds: readonly Round[];
  readonly spotlight: number;
  readonly fanfare: number;
  readonly end: number;
  readonly heartbeats: readonly number[];
  readonly captions: readonly { readonly at: number; readonly text: string }[];
  /** The stutter that comes right before the last stop, for the encore. */
  readonly encoreAt: number | null;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** How the `index`th round stages its saves: the first is slowest, later ones get tighter. */
function staging(index: number) {
  const c = Math.max(TIGHTEST, 1 - TIGHTEN * index);
  const after = AFTER.quick + (AFTER.slow - AFTER.quick) * ((c - TIGHTEST) / (1 - TIGHTEST));
  return { gap: ARRIVE_GAP, hopGap: HOP_GAP * c, hold: HOLD * c, after };
}

/** From a stop to the next round's music, for a round that saves `stools` people. */
const tailOf = (kind: Kind, stools: number, index: number) => {
  const s = staging(index);
  return FREEZE[kind] + ARRIVE + (s.gap + s.hopGap) * (stools - 1) + s.hold + s.after;
};

function stutterCount(kind: Kind, index: number, count: number): number {
  if (count <= 3) {
    return 1;
  }
  if (index === 0) return 0;
  if (index === 1 && kind === 'pre' && count <= 8) return 1;
  if (kind === 'duel') return 1;
  return 0;
}

/** Marching windows and the stutters between them. */
function march(begin: number, length: number, count: number, speed: number, isDuel: boolean) {
  const stutters: Stutter[] = [];
  const windows: Round['windows'][number][] = [];

  if (count === 0) {
    windows.push({ from: begin, to: begin + length, speed });
    return { stutters, windows };
  }

  if (isDuel) {
    const duelStutter = 0.4;
    const duelGap = 1;
    const stutterAt = begin + length - (duelStutter + duelGap);
    windows.push({ from: begin, to: stutterAt, speed });
    stutters.push({ at: stutterAt, end: stutterAt + duelStutter });
    windows.push({ from: stutterAt + duelStutter, to: begin + length, speed });
    return { stutters, windows };
  }

  const stutterLen = STUTTER;
  const mid = (length - stutterLen) / 2;
  const stutterAt = begin + mid;
  windows.push({ from: begin, to: stutterAt, speed });
  stutters.push({ at: stutterAt, end: stutterAt + stutterLen });
  windows.push({ from: stutterAt + stutterLen, to: begin + length, speed });
  return { stutters, windows };
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const ending = pickOne(ENDINGS, random);
  const ring = shuffle(names, random);

  const specs: { kind: Kind; marchers: string[]; sitters: string[]; stools: number }[] = [];
  let left = [...ring];
  const sit = (stools: number) =>
    shuffle(
      left.filter((name) => name !== unlucky),
      random,
    ).slice(0, stools);
  while (left.length > 3) {
    const stools = Math.min(3, left.length - 3);
    const sitters = sit(stools);
    specs.push({ kind: 'pre', marchers: left, sitters, stools });
    left = left.filter((name) => !sitters.includes(name));
  }
  if (left.length === 3) {
    const sitters = sit(1);
    specs.push({ kind: 'spot', marchers: left, sitters, stools: 1 });
    left = left.filter((name) => !sitters.includes(name));
  }
  specs.push({ kind: 'duel', marchers: left, sitters: sit(1), stools: 1 });

  // The stops get closer as the show goes on: the first stop is late, and each gap after it is
  // shorter than the one before (spare time goes mostly to the earliest gaps).
  const count = names.length;
  const stopLast =
    FLOOR +
    (AIM - FLOOR) * clamp((count - 3) / 5) +
    AIM_MORE * clamp((count - 8) / 4) -
    (FREEZE.duel + ARRIVE + SIT_TO_FANFARE + REVEAL);
  const firstStop =
    specs.length >= 5
      ? FIRST_STOP.twelve
      : count <= 8
        ? FIRST_STOP.few + (FIRST_STOP.eight - FIRST_STOP.few) * clamp((count - 3) / 5)
        : FIRST_STOP.eight + (FIRST_STOP.twelve - FIRST_STOP.eight) * clamp((count - 8) / 4);
  const lengths = specs.map((spec, i) =>
    Math.max(
      MARCH_MIN[spec.kind],
      stutterCount(spec.kind, i, count) > 0 && spec.kind !== 'duel' ? 2 + STUTTER : 0,
    ),
  );
  const firstSpec = specs[0]!;
  lengths[0] =
    specs.length === 1
      ? Math.max(lengths[0]!, stopLast - START)
      : Math.max(firstSpec.kind === 'pre' ? 3.2 : lengths[0]!, firstStop - START);
  if (specs.length > 1) {
    // Each gap is at least a little shorter than the one before it, whatever the spare time does.
    const tail = (j: number) => tailOf(specs[j]!.kind, specs[j]!.stools, j);
    for (let j = specs.length - 2; j >= 1; j--) {
      const next = tail(j) + lengths[j + 1]!;
      lengths[j] = Math.max(lengths[j]!, next + GAP_STEP - tail(j - 1));
    }
    const gaps = specs.slice(1).map((_, j) => tail(j) + lengths[j + 1]!);
    const spare = Math.max(0, stopLast - (START + lengths[0]!) - gaps.reduce((a, b) => a + b, 0));
    const n = specs.length;
    const weights = specs.map((_, j) => (j === 0 && count >= 8 ? 0 : (n - j) ** FADE));
    const sum = weights.reduce((a, b) => a + b, 0);
    weights.forEach((w, j) => (lengths[j]! += (spare * w) / sum));
  }

  const rounds: Round[] = [];
  let begin = START;
  specs.forEach((spec, i) => {
    const length = lengths[i]!;
    const duel = spec.kind === 'duel';
    const { stutters, windows } = march(
      begin,
      length,
      stutterCount(spec.kind, i, count),
      PACE * QUICKER ** i,
      duel,
    );
    const stop = begin + length;
    const scramble = stop + FREEZE[spec.kind];
    const s = staging(i);
    const arrivals = spec.sitters.map((_, k) => scramble + ARRIVE + s.gap * k);
    const hop = duel ? arrivals[0]! + SIT_TO_FANFARE : arrivals.at(-1)! + s.hold;
    const leaves = spec.sitters.map((_, k) => hop + s.hopGap * k);
    const next = duel ? Infinity : leaves.at(-1)! + s.after;
    rounds.push({
      ...spec,
      begin,
      stop,
      stutters,
      windows,
      scramble,
      arrivals,
      leaves,
      hop,
      hopLength: duel ? HOP_LAST : HOP,
      next,
      stoolsFrom: i === 0 ? 1.0 : begin - 0.1,
      stoolsTo: leaves.at(-1)! + (duel ? 0.1 : 0.15),
    });
    begin = next;
  });

  const duel = rounds.at(-1)!;
  const fanfare = duel.hop;
  const first = rounds[0]!;
  const spotlight = first.kind === 'pre' ? rounds.find((r) => r.kind === 'spot')!.begin : 2.0;

  // The heartbeat keeps out of the way of every other sound.
  const sounds = [
    START,
    fanfare,
    ...rounds.flatMap((r) => [...r.stutters.map((s) => s.at), r.stop, ...r.arrivals]),
    ...(ending === 'hip-bump' ? [duel.arrivals[0]! - TUMBLE_LEAD] : []),
  ];
  const heartbeats: number[] = [];
  const clear = (t: number) =>
    sounds.every((s) => Math.abs(s - t) >= QUIET) &&
    heartbeats.every((b) => Math.abs(b - t) >= QUIET);
  for (let t = spotlight + 0.4, k = 0; t < duel.arrivals[0]! - 0.3; k++) {
    // A beat that lands on another sound slides to the nearest quiet moment instead of vanishing.
    const slid = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]
      .map((step) => t + 0.05 * step)
      .find((at) => clear(at) && at > spotlight);
    if (slid !== undefined && slid < duel.arrivals[0]! - 0.3) heartbeats.push(slid);
    t += Math.max(0.32, 0.9 * 0.94 ** k);
  }

  const captions: { at: number; text: string }[] = [];
  if (count >= 4) captions.push({ at: 0.2, text: 'Musical Stools!' });
  if (count >= 4) captions.push({ at: spotlight, text: 'Final three!' });
  if (count === 3) captions.push({ at: spotlight, text: 'Three marchers, one stool!' });
  if (count === 2) captions.push({ at: spotlight, text: 'Two marchers, one stool!' });
  if (count >= 3) captions.push({ at: duel.begin, text: 'Last stool!' });
  captions.push({ at: fanfare + 0.2, text: `${unlucky} gets the big chair!` });

  return {
    ending,
    ring,
    rounds,
    spotlight,
    fanfare,
    end: fanfare + REVEAL,
    heartbeats,
    captions,
    encoreAt: ending === 'encore-fakeout' ? (duel.stutters.at(-1)?.at ?? null) : null,
  };
}
