// What happens when, worked out before the show starts and never again: who
// drops where, who the updraft takes and when, how the last two hang over the
// mat and which of the three endings lands the unlucky one. Every path is a
// list of keys, so where anyone is at any moment follows from the plan alone.

import { eliminationOrder, pickOne, shuffle, spread, type Cue } from '../../scenario-kit';
import { BOOTS } from './parts';

export const ENDINGS = ['ankle-gust', 'canopy-fold', 'boot-boop'] as const;
export type Ending = (typeof ENDINGS)[number];

type Ease = 'lin' | 'in' | 'out' | 'inout' | 'back';
/** At `t` the path is at `v`, having come from the key before by `ease`. */
export type Key = readonly [t: number, v: number, ease?: Ease];

const EASES: Record<Ease, (u: number) => number> = {
  lin: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) ** 3,
  inout: (u) => (1 - Math.cos(Math.PI * u)) / 2,
  // Winds back first, then takes off.
  back: (u) => u * u * (2.1 * u - 1.1),
};

export function sample(keys: readonly Key[], t: number): number {
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [end, to, ease = 'inout'] = keys[i]!;
    if (t < end) {
      const [start, from] = keys[i - 1]!;
      return from + (to - from) * EASES[ease]((t - start) / (end - start));
    }
  }
  return keys.at(-1)![1];
}

export interface Jumper {
  readonly name: string;
  readonly arrive: number;
  readonly x: Key[];
  readonly y: Key[];
  readonly size: Key[];
  /** 1 for a canopy that hasn't opened or has folded. */
  readonly fold: Key[];
  /** When the updraft takes them clear, or null for the unlucky one. */
  rescueAt: number | null;
  /** The slot they hang in, and the lane they fall in, before the spotlight. */
  readonly slot: number;
  readonly lane: number;
}

export interface Bubble {
  readonly by: string;
  readonly text: string;
  readonly from: number;
  readonly to: number;
  /** Where the speaker is, if not now, as the bubble is placed. */
  readonly near: number;
}

export interface Plan {
  readonly ending: Ending;
  readonly unlucky: string;
  /** The one who hangs on beside the unlucky one until the end. */
  readonly foe: string;
  /** The finalist the side gust takes first, if there are three. */
  readonly third: string | null;
  /** The finalist on the left once only two are left. */
  readonly left: string;
  readonly jumpers: ReadonlyMap<string, Jumper>;
  readonly names: readonly string[];
  /** The spotlight, the side gust, the hover, touchdown and the reveal. */
  readonly spot: number;
  readonly gust: number | null;
  readonly hover: number;
  readonly touchdown: number;
  readonly reveal: number;
  readonly end: number;
  /** Each rescue, for the music to speed up on. */
  readonly rescues: readonly number[];
  readonly cues: readonly { t: number; cue: Cue }[];
  readonly captions: readonly { t: number; text: string }[];
  readonly bubbles: readonly Bubble[];
  /** When each jumper's updraft shows under their boots. */
  readonly lifts: readonly { name: string; from: number; to: number }[];
  /** The wind checks before the spotlight: a miss only teases, a win is the updraft that takes a group. */
  readonly checks: readonly { at: number; name: string; win: boolean }[];
  /** When the unlucky one kicks their feet. */
  readonly kick: { from: number; to: number } | null;
  readonly heartbeats: readonly number[];
}

/** Where the mat's surface is once it's up, and where a standing jumper's face is. */
export const FOOT = 592;
export const FINALIST = 125;
export const REVEALED = 154;
export const standY = (size: number) => FOOT - BOOTS * size;
const LAND = standY(FINALIST);

/**
 * The beats, in seconds. A save is staged as anticipation (the lowest jumper
 * sinks and cries out), the updraft and a reaction, and each save gets the
 * time to be read before the next one starts.
 */
const FIRST_CHECK = 2.2;
const CHECK_GAPS = [1.1, 0.9, 0.75, 0.65] as const;
const NUDGE = 0.55;
const SINK = 1.6;
const SPOT_AFTER = 1.6;
const SPOT_ALONE = 2.2;
const GUST_AFTER = 2.6;
const ROUND = 3;
/** From the last duel round to the end: the approach, the hover, touchdown, the reveal and the hold. */
const FINALE = 7;
const BASE = 336;
const THIRD = 340;
const FALL = 0.65;

/** How close each hangs over the mat for the ending's stall. */
const ENDING = {
  'ankle-gust': { foe: 18, unlucky: 60, caption: 'Last-second gust!' },
  'canopy-fold': { foe: 31, unlucky: 30, caption: 'Dead calm…' },
  'boot-boop': { foe: 70, unlucky: 14, caption: 'Hold it up…' },
} as const;

/** How many go together in each early save: a few staged groups, never a flurry. */
const GROUPS: readonly (readonly number[])[] = [[], [1], [1, 1], [1, 2], [2, 2], [2, 2, 1]];

/** How long the show lasts for each head count, in seconds. */
const LENGTH = (count: number) => (count === 2 ? 26 : count === 3 ? 26.5 : count === 4 ? 27 : 27.8);

export function buildPlan(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const order = eliminationOrder(names, unlucky, random);
  const ending = pickOne(ENDINGS, random);
  const { foe: foeGap, unlucky: unluckyGap } = ENDING[ending];

  const cut = Math.max(0, count - 3);
  const early = order.slice(0, cut);
  const finalists = order.slice(cut);
  const foe = order[count - 2]!;
  const third = count >= 3 ? order[count - 3]! : null;

  // Lanes: the last three hang side by side in the middle, so that they
  // spread out when the spotlight comes on, never in.
  const lanes = spread(count, count <= 3 ? { left: 200, right: 1080 } : { left: 75, right: 1205 }, {
    maxSize: 100,
    fill: 0.62,
  });
  const laneOf = new Map<string, number>();
  if (count >= 4) {
    const middle = Math.floor((count - 3) / 2);
    shuffle(finalists, random).forEach((name, k) => laneOf.set(name, middle + k));
    const free = lanes.map((_, k) => k).filter((k) => k < middle || k > middle + 2);
    shuffle(early, random).forEach((name, k) => laneOf.set(name, free[k]!));
  } else {
    shuffle(order, random).forEach((name, k) => laneOf.set(name, k));
  }

  // Heights: the lowest slot is a finalist's.
  const lowest = pickOne(finalists, random);
  const slotOf = new Map<string, number>([[lowest, count - 1]]);
  shuffle(
    order.filter((name) => name !== lowest),
    random,
  ).forEach((name, k) => slotOf.set(name, k));
  const slotY = (name: string) => 300 + 24 * slotOf.get(name)!;
  const dipY = 300 + 24 * count;

  const cues: { t: number; cue: Cue }[] = [];
  const bubbles: Bubble[] = [];
  const lifts: { name: string; from: number; to: number }[] = [];
  const rescues: number[] = [];
  const captions: { t: number; text: string }[] = [{ t: 0.1, text: "Don't touch the mat first!" }];

  const jumpers = new Map<string, Jumper>();
  names.forEach((name, i) => {
    const lane = lanes[laneOf.get(name)!]!;
    const arrive = 0.14 * i;
    jumpers.set(name, {
      name,
      arrive,
      x: [[0, lane.x]],
      y: [
        [0, -260],
        [arrive, -260, 'lin'],
        [arrive + FALL, slotY(name), 'out'],
      ],
      size: [[0, lane.size]],
      fold: [
        [0, 1],
        [arrive + 0.5, 1, 'lin'],
        [arrive + 0.8, 0, 'out'],
      ],
      rescueAt: null,
      slot: slotOf.get(name)!,
      lane: laneOf.get(name)!,
    });
    cues.push({ t: arrive + 0.5, cue: 'pop' });
  });
  const jumper = (name: string) => jumpers.get(name)!;

  /** The updraft takes `name` clear, from `at`. */
  const carry = (name: string, at: number, whoosh = true) => {
    const one = jumper(name);
    one.rescueAt = at;
    one.y.push([at, one.y.at(-1)![1], 'lin'], [at + FALL, -260, 'back']);
    if (whoosh) {
      cues.push({ t: at, cue: 'whoosh' });
      rescues.push(at);
    }
    lifts.push({ name, from: at, to: at + FALL });
  };

  // Before the spotlight the wind checks faster after each rescue. Most checks
  // miss: the breeze lifts one jumper a little and lets them down again. A
  // few, never back to back, are the real updraft that takes a group clear.
  // The head count fixes the number of checks, so the show never waits on
  // luck; the show's random only picks which checks are updrafts, and whom
  // the misses tease.
  const sizes = GROUPS[Math.min(early.length, GROUPS.length - 1)]!;
  let queue = 0;
  const groups: string[][] = sizes.map((size) => early.slice(queue, (queue += size)));
  const checkCount = groups.length > 0 ? 3 * groups.length + 1 : 0;
  const offset = Math.floor(random() * 2);
  const winSlots = groups.map((_, k) => 2 + 3 * k + offset);
  const times = [FIRST_CHECK];
  let savedGroups = 0;
  for (let slot = 0; slot < checkCount; slot++) {
    if (winSlots.includes(slot)) savedGroups++;
    times.push(times[slot]! + CHECK_GAPS[Math.min(savedGroups, CHECK_GAPS.length - 1)]!);
  }
  const checkAt = (slot: number) => times[slot]!;
  const checks: { at: number; name: string; win: boolean }[] = [];
  const dipAt = new Map<string, number>(
    groups.map(([first], k) => [first!, checkAt(winSlots[k]!) - SINK]),
  );
  const wonAt = new Map<string, number>();
  groups.forEach((group, k) => group.forEach((name) => wonAt.set(name, checkAt(winSlots[k]!))));
  const teased = new Map<string, number>();
  for (let slot = 0; slot < checkCount; slot++) {
    const at = checkAt(slot);
    const k = winSlots.indexOf(slot);
    if (k >= 0) {
      const [first, ...others] = groups[k]!;
      const one = jumper(first!);
      one.y.push(
        [at - SINK, slotY(first!), 'lin'],
        [at - SINK + 0.5, dipY, 'inout'],
        [at, dipY, 'lin'],
      );
      carry(first!, at);
      bubbles.push({
        by: first!,
        text: 'Eek!',
        from: at - SINK + 0.3,
        to: at - 0.5,
        near: at - 0.8,
      });
      bubbles.push({ by: first!, text: 'Bye!', from: at + 0.1, to: at + 0.7, near: at + 0.2 });
      others.forEach((name) => carry(name, at, false));
      checks.push({ at, name: first!, win: true });
      continue;
    }
    const open = names.filter(
      (name) =>
        (wonAt.get(name) ?? Infinity) > at + NUDGE + 0.1 &&
        (dipAt.get(name) ?? Infinity) > at + NUDGE + 0.05 &&
        at - (teased.get(name) ?? -Infinity) > 2,
    );
    if (open.length === 0) continue;
    const name = pickOne(open, random);
    teased.set(name, at);
    const one = jumper(name);
    const rest = slotY(name);
    one.y.push([at, rest, 'lin'], [at + 0.3, rest - 34, 'out'], [at + NUDGE, rest, 'inout']);
    lifts.push({ name, from: at, to: at + 0.4 });
    checks.push({ at, name, win: false });
  }
  const spot =
    groups.length > 0
      ? Math.max(checkAt(checkCount) + SPOT_AFTER, checkAt(winSlots.at(-1)!) + 2.6)
      : SPOT_ALONE;
  captions.push({
    t: spot,
    text:
      count === 2
        ? 'Just the two of you…'
        : count === 3
          ? 'Just the three of you…'
          : "Three left! Ground's rising!",
  });

  // The last few: they spread and grow as the ground comes up.
  const finalX =
    count >= 3 ? spread(3, { left: 200, right: 1080 }).map((lane) => lane.x) : [450, 830];
  [...finalists]
    .sort((a, b) => jumper(a).x[0]![1] - jumper(b).x[0]![1])
    .forEach((name, k) => {
      const one = jumper(name);
      one.x.push([spot, one.x[0]![1], 'lin'], [spot + 0.8, finalX[k]!, 'inout']);
      one.size.push([spot, one.size[0]![1], 'lin'], [spot + 0.8, FINALIST, 'inout']);
      one.y.push([spot, slotY(name), 'lin'], [spot + 0.75, name === third ? THIRD : BASE, 'inout']);
    });

  // The side gust takes the third one first, once the others have seen the
  // ground come up and the third has sunk and called out.
  let gust: number | null = null;
  if (third) {
    gust = spot + GUST_AFTER;
    const one = jumper(third);
    one.y.push([spot + 0.8, THIRD, 'lin'], [spot + 1.3, 430, 'inout']);
    carry(third, gust);
    bubbles.push({
      by: third,
      text: 'Too low!',
      from: spot + 1.5,
      to: gust - 0.3,
      near: gust - 0.8,
    });
    bubbles.push({ by: third, text: 'Bye!', from: gust + 0.1, to: gust + 0.6, near: gust + 0.2 });
    captions.push({ t: gust + 1.6, text: 'Saved by a breeze!' });
  }

  // The last two take turns sinking toward the mat, rising on a thermal.
  const unluckyOne = jumper(unlucky);
  const duel = [foe, unlucky].sort((a, b) => jumper(a).x.at(-1)![1] - jumper(b).x.at(-1)![1]);
  const duelX = [450, 830];
  const towards = gust === null ? spot : gust;
  const settle = gust === null ? 0.8 : 1;
  if (gust !== null) {
    duel.forEach((name, k) => {
      const one = jumper(name);
      one.x.push([gust, one.x.at(-1)![1], 'lin'], [gust + 0.7, duelX[k]!, 'inout']);
    });
  }
  const start = towards + settle;
  const budget = LENGTH(count) - start - FINALE;
  const rounds = Math.max(2, Math.min(9, Math.floor(budget / ROUND)));
  const length = budget / rounds;
  for (let j = 0; j < rounds; j++) {
    const from = start + j * length;
    const sinker = j % 2 === 0 ? foe : unlucky;
    const low = 388 + (36 * (j + 1)) / rounds;
    jumper(sinker).y.push(
      [from, BASE, 'lin'],
      [from + 0.4 * length, low, 'inout'],
      [from + 0.6 * length, low, 'lin'],
      [from + length, BASE, 'inout'],
    );
    cues.push({ t: from + 0.4 * length, cue: 'creak' });
    lifts.push({ name: sinker, from: from + 0.6 * length, to: from + length });
    bubbles.push({
      by: sinker,
      text: sinker === foe ? 'Eek!' : 'Nooo!',
      from: from + 0.45 * length,
      to: from + 0.8 * length,
      near: from + 0.6 * length,
    });
  }

  // The hover: the two hang over the mat, then the ending.
  const approach = start + rounds * length;
  const hover = approach + 0.9;
  const foeAt = LAND + 0 - foeGap;
  const unluckyAt = LAND - unluckyGap;
  for (const [name, y] of [
    [foe, foeAt],
    [unlucky, unluckyAt],
  ] as const) {
    jumper(name).y.push([approach, BASE, 'lin'], [hover, y, 'out']);
  }
  // Every ending runs on the same beats: the stall (with its caption), the
  // foe's updraft, the unlucky one's fate, touchdown.
  const touchdown = hover + 3.1;
  let kick: Plan['kick'] = null;
  carry(foe, hover + 1.55);
  bubbles.push({
    by: unlucky,
    text: 'Wait…',
    from: hover + 0.2,
    to: hover + 0.9,
    near: hover + 0.5,
  });
  bubbles.push({
    by: foe,
    text: 'Phew!',
    from: hover + 1.65,
    to: hover + 2.25,
    near: hover + 1.75,
  });
  if (ending === 'ankle-gust') {
    unluckyOne.y.push([hover + 2, unluckyAt, 'lin'], [touchdown, LAND, 'in']);
  } else if (ending === 'canopy-fold') {
    unluckyOne.fold.push([hover + 2, 0, 'lin'], [hover + 2.4, 1, 'inout']);
    unluckyOne.y.push([hover + 2.3, unluckyAt, 'lin'], [touchdown, LAND, 'in']);
    cues.push({ t: hover + 2, cue: 'tumble' });
    bubbles.push({
      by: unlucky,
      text: 'Oops!',
      from: hover + 2.05,
      to: hover + 2.55,
      near: hover + 2.3,
    });
  } else {
    kick = { from: hover + 0.1, to: hover + 0.8 };
    unluckyOne.y.push([hover + 2, unluckyAt, 'lin'], [touchdown, LAND, 'inout']);
    bubbles.push({
      by: unlucky,
      text: 'Boop.',
      from: touchdown + 0.05,
      to: touchdown + 0.7,
      near: touchdown,
    });
  }
  captions.push({ t: hover, text: ENDING[ending].caption });

  const reveal = touchdown + 0.8;
  const end = reveal + 2.2;
  unluckyOne.x.push([reveal, duelX[duel.indexOf(unlucky)]!, 'lin'], [reveal + 0.55, 640, 'inout']);
  unluckyOne.size.push([reveal, FINALIST, 'lin'], [reveal + 0.55, REVEALED, 'inout']);
  unluckyOne.y.push([reveal, LAND, 'lin'], [reveal + 0.55, standY(REVEALED), 'inout']);
  cues.push({ t: touchdown, cue: 'thunk' }, { t: reveal, cue: 'fanfare' });
  captions.push({ t: reveal, text: `${unlucky} lands first!` });

  // The heart beats from the spotlight until the hover, quicker and quicker.
  const heartbeats: number[] = [];
  for (let beat = spot + 0.05; beat < hover;) {
    heartbeats.push(beat);
    beat += 0.95 - (0.55 * (beat - spot)) / (hover - spot);
  }
  for (const t of heartbeats) cues.push({ t, cue: 'heartbeat' });

  return {
    ending,
    unlucky,
    foe,
    third,
    left: duel[0]!,
    names,
    jumpers,
    spot,
    gust,
    hover,
    touchdown,
    reveal,
    end,
    rescues: rescues.sort((a, b) => a - b),
    cues: cues.sort((a, b) => a.t - b.t),
    captions,
    bubbles,
    lifts,
    checks,
    kick,
    heartbeats,
  };
}
