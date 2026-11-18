// Where everything is, in stage pixels (1280 × 720), from the Design canvas:
// the pile's seats and the shelf's, the claw at any moment, and everyone in
// the pile, in the claw, in the air, on the shelf, on the chute's rim or out
// of its door as the prize, with their name tags. Everything follows from
// the plan and the show's time, so every frame can be worked out alone.

import {
  leanRoom,
  nameTag,
  speechAt,
  speechBox,
  STAGE,
  stagePx,
  type Box,
} from '../../scenario-kit';
import { atRiskAt, EARLY, END, TWITCH, type Flight, type Grab, type Hold, type Plan } from './plan';

/** The claw's x at the stop, over the prize chute: the rail ends here. */
export const STOP_X = 730;
/** The hub's top, wound up to the rail. */
export const HUB_UP = 158;
/** The claw swings about this height under its trolley. */
export const PIVOT_Y = 134;
/** The floor of the machine, where the pile's front row and the shelf's lowest tier stand. */
export const FLOOR = 664;
/** A plush stands this many heads from the top of its box to its feet. */
export const STANDS = 1.16;
/** The chute's rim, where someone teeters: they stand on it at RIM.stand, tilting about RIM. */
export const RIM = { x: 798, y: 506, stand: 808 } as const;
/** The prize, out of the chute's door; and the door, where it comes from. */
export const PRIZE = { x: 730, top: 539, size: 170, tag: 38, maxWidth: 380 } as const;
const DOOR = { x: 730, top: 600, size: 60 } as const;
/** Where whoever falls into the chute is when they are out of sight. */
const IN_CHUTE = { x: 730, top: 540 } as const;

/** One place to sit: in the pile or on the shelf. */
export interface Seat {
  readonly x: number;
  readonly feet: number;
  /** The head's size there, before anyone grows. */
  readonly size: number;
  /** How wide its name tag may be. */
  readonly maxWidth: number;
}

/** Whether `people` sit in the pile in one row (up to 4), two (5 to 8) or three (9 to 12). */
export const rows = (people: number) => (people <= 4 ? 1 : people <= 8 ? 2 : 3);

/**
 * The pile's seats for `people`. Up to 8, along one line: one row up to 4,
 * then even seats on the riser and odd ones on the floor. From 9, four
 * columns of three, seat `3k + r` in column k and row r: A at the column's
 * x on the riser's top step, B 75 to its right on the step below, C at its
 * x on the floor. A column of two uses B and C.
 */
export function pileSeats(people: number): Seat[] {
  if (people <= 4) {
    const size = people <= 3 ? 136 : 120;
    const apart = people === 2 ? 200 : people === 3 ? 190 : 150;
    return Array.from({ length: people }, (_, i) => ({
      x: 335 + (i - (people - 1) / 2) * apart,
      feet: FLOOR,
      size,
      maxWidth: apart - 8,
    }));
  }
  if (people <= 8) {
    const apart = ({ 5: 115, 6: 100, 7: 85, 8: 75 } as Record<number, number>)[people]!;
    const middle = people === 8 ? 325 : 335;
    return Array.from({ length: people }, (_, i) => ({
      x: middle + (i - (people - 1) / 2) * apart,
      feet: i % 2 === 0 ? 554 : FLOOR,
      size: people <= 6 ? 120 : 100,
      maxWidth: 2 * apart - 8,
    }));
  }
  return Array.from({ length: 4 }, (_, k) => [
    { x: 60 + 150 * k, feet: 472, size: 88, maxWidth: 142 },
    { x: 135 + 150 * k, feet: 568, size: 88, maxWidth: 142 },
    { x: 60 + 150 * k, feet: FLOOR, size: 88, maxWidth: 142 },
  ]).flat();
}

/** The head of anyone seated in the pile, with `atRisk` not yet on the shelf. */
export function pileSize(people: number, atRisk: number): number {
  if (people <= 3) return 136;
  if (people <= 6) return 120;
  if (people <= 8) return atRisk <= 6 ? 120 : 100;
  return atRisk <= 6 ? 100 : 88;
}

/** The head of whoever is in the claw: 136 with 2 or 3, 100 before the final three from 9, else 120. */
export const heldSize = (people: number, last: boolean) =>
  people <= 3 ? 136 : people >= 9 && !last ? 100 : 120;

/** The shelf's three columns: the one by the chute first. */
const SHELF_COLUMNS = [945, 1075, 1205] as const;
/** Every seat the shelf can have, as (tier, column), in the order a head count takes them. */
const SHELF_ORDER = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 1],
  [1, 0],
  [2, 2],
  [2, 1],
  [3, 2],
  [3, 1],
] as const;

/** One seat on the shelf: its tier counts up from the floor. */
export interface ShelfSeat extends Seat {
  readonly tier: number;
}

/** Tiers are this far apart, up to 8 people and from 9. */
export const shelfPitch = (people: number) => (people <= 8 ? 142 : 121);

/**
 * The shelf's seats for `people`, in the order people land on them: the
 * highest tier first and, in a tier, the furthest from the chute first; the
 * floor seat next to the chute last. As many as land there, and never none.
 */
export function shelfSeats(people: number): ShelfSeat[] {
  const size = people <= 8 ? 100 : 84;
  const pitch = shelfPitch(people);
  return SHELF_ORDER.slice(0, Math.max(1, people - 2))
    .map(([tier, column]) => ({
      tier,
      x: SHELF_COLUMNS[column],
      feet: FLOOR - tier * pitch,
      size,
      maxWidth: 122,
    }))
    .sort((a, b) => b.tier - a.tier || b.x - a.x);
}

/** A name tag is this much of its head, and never under the kit's smallest. */
export const TAG_SHARE = 0.28;
export const tagSize = (size: number) =>
  Math.max(stagePx('--size-stage-tag-min'), Math.round(TAG_SHARE * size));

// The claw.

/** How far each finger swings out from hanging straight, in degrees, in each pose. */
export const POSE = {
  shut: -9,
  grip: 0,
  gripBig: 7,
  open: 28,
  pair: 40,
  wide: 55,
  wider: 70,
} as const;

export type Marks = 'none' | 'strain' | 'twitch';

/** The claw at a moment. */
export interface ClawState {
  /** Its x along the rail, with the trolley over it. */
  readonly x: number;
  /** The hub's top, before it swings. */
  readonly hub: number;
  /** How far it swings, in degrees: what hangs below goes right when positive. */
  readonly th: number;
  /** How far each finger swings out, in degrees. */
  readonly out: number;
  /** How much further the right finger swings out, as it twitches. */
  readonly twitch: number;
  readonly marks: Marks;
}

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const progress = (t: number, from: number, to: number) =>
  to <= from ? 1 : clamp01((t - from) / (to - from));
export const sine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;

/** A swing after a slip: back through the middle, a smaller swing past it, and still by `still`. */
const SETTLE = { half: 0.9, still: 1.8 } as const;
/** The claw leans this far, at most, as it moves along the rail, at full speed over `over` px. */
const LEAN = { degrees: 6, over: 300 } as const;
/** It trembles this far, this many times a second, while it strains. */
const TREMBLE = { px: 1.5, hz: 12 } as const;
/** A finger twitches open this far. */
const TWITCH_DEGREES = 12;
/** The claw shuts on nothing this fast after they slip. */
const EMPTY = 0.2;

/** Where someone hangs in the claw, from the hub's top centre, hanging straight. */
export function holdOffset(hold: Hold, wide: boolean): { dx: number; dy: number } {
  if (hold === 'one') return { dx: 0, dy: 32 };
  if (hold === 'mid') return { dx: 0, dy: 34 };
  const tip = wide ? { dx: 105, dy: 78 } : { dx: 90, dy: 98 };
  return { dx: hold === 'left' ? -tip.dx : tip.dx, dy: tip.dy };
}

/** A grab of three spreads its fingers wide. */
const isWide = (grab: Grab) => grab.by.length === 3;

/** The fingers as the claw comes down on a grab, and as it holds them. */
function poses(plan: Plan, grab: Grab) {
  const count = grab.by.length;
  const big = heldSize(plan.people, grab.last) > 120;
  return {
    open: count === 1 ? POSE.open : count === 2 ? POSE.wide : POSE.wider,
    hold: count === 1 ? (big ? POSE.gripBig : POSE.grip) : count === 2 ? POSE.pair : POSE.wide,
    grip: big ? POSE.gripBig : POSE.grip,
  };
}

/** Where `name` sits in the pile at `t`, their head grown as the count at risk says. */
function pileSpotOf(plan: Plan, name: string, t: number): Spot {
  const seat = pileSeats(plan.people)[plan.seats.get(name)!]!;
  const size = pileSizeAt(plan, t);
  return { x: seat.x, top: seat.feet - STANDS * size, size, rot: 0, squash: 1 };
}

/** Seconds a seated head takes to grow. */
export const GROW = 0.4;

/** The pile's heads at `t`: they grow over GROW after the landing that brings the count at risk down to 6. */
export function pileSizeAt(plan: Plan, t: number): number {
  const now = pileSize(plan.people, atRiskAt(plan, t));
  const landing = plan.flights.findLast((flight) => flight.to <= t + 1e-9);
  if (!landing) return now;
  const before = pileSize(plan.people, atRiskAt(plan, landing.to - 1e-6));
  return mix(before, now, sine((t - landing.to) / GROW));
}

const depths = new WeakMap<Grab, number>();

/** How deep the claw goes for `grab`: so whoever it takes are, on average, where they sit. */
export function depthOf(plan: Plan, grab: Grab): number {
  let depth = depths.get(grab);
  if (depth !== undefined) return depth;
  const size = heldSize(plan.people, grab.last);
  const wide = isWide(grab);
  const each = grab.by.map((name, k) => {
    const spot = pileSpotOf(plan, name, grab.down);
    return spot.top + spot.size / 2 - holdOffset(grab.holds[k]!, wide).dy - size / 2;
  });
  depth = each.reduce((sum, hub) => sum + hub, 0) / each.length;
  depths.set(grab, depth);
  return depth;
}

/** How far the claw swings at `t` from `grab`'s kicks, and the swing after them. */
function kickAt(plan: Plan, grab: Grab, t: number, calm: boolean): number {
  if (t < grab.stop - 1e-9) return 0;
  const last = grab.kicks.at(-1)!;
  for (const kick of grab.kicks) {
    if (kick === last || t < kick.from || t > kick.to) continue;
    return kick.degrees * Math.sin(Math.PI * progress(t, kick.from, kick.to));
  }
  const degrees = last.degrees;
  if (t < last.from) return 0;
  if (t < last.peak) {
    const u = progress(t, last.from, last.peak);
    return degrees * (calm ? sine(u) : Math.sin((Math.PI / 2) * u));
  }
  const s = t - last.peak;
  const back = grab.last ? last.to - last.peak : EARLY.kick;
  // It swings back and settles; it only swings back, smoothly, without motion, or where it holds still at once.
  if (calm || (grab.last && plan.ending === 'hold'))
    return s < back ? degrees * (1 - sine(s / back)) : 0;
  if (s >= SETTLE.still) return 0;
  return degrees * Math.cos((Math.PI * s) / SETTLE.half) * (1 - s / SETTLE.still) ** 2;
}

/** The claw at `t`. With `calm` (reduced motion) it doesn't lean, tremble or twitch, and its kicks don't swing. */
export function clawAt(plan: Plan, t: number, calm = false): ClawState {
  const grab = plan.grabs.findLast((each) => each.from <= t + 1e-9);
  if (!grab) return { x: STOP_X, hub: HUB_UP, th: 0, out: POSE.shut, twitch: 0, marks: 'none' };
  const carried = grab.notch?.to ?? grab.up;
  let x = STOP_X;
  let lean = 0;
  const leanOf = (from: number, to: number, dx: number) =>
    calm
      ? 0
      : -Math.sign(dx) *
        LEAN.degrees *
        Math.min(1, Math.abs(dx) / LEAN.over) *
        Math.sin(Math.PI * progress(t, from, to));
  if (t < grab.over) {
    x = mix(STOP_X, grab.x, sine(progress(t, grab.from, grab.over)));
    lean = leanOf(grab.from, grab.over, grab.x - STOP_X);
  } else if (t < carried) x = grab.x;
  else if (t < grab.stop) {
    x = mix(grab.x, STOP_X, sine(progress(t, carried, grab.stop)));
    lean = leanOf(carried, grab.stop, STOP_X - grab.x);
  }

  const depth = depthOf(plan, grab);
  let hub = HUB_UP;
  if (t >= grab.over && t < grab.down)
    hub = mix(HUB_UP, depth, sine(progress(t, grab.over, grab.down)));
  else if (t >= grab.down && t < grab.shut) hub = depth;
  else if (t >= grab.shut && t < grab.up)
    hub = mix(depth, HUB_UP, sine(progress(t, grab.shut, grab.up)));

  const pose = poses(plan, grab);
  let out: number;
  if (t < grab.over) out = POSE.shut;
  else if (t < grab.down) out = mix(POSE.shut, pose.open, sine(progress(t, grab.over, grab.down)));
  else if (t < grab.shut) out = mix(pose.open, pose.hold, sine(progress(t, grab.down, grab.shut)));
  else if (t < grab.slip) out = pose.hold;
  else if (!grab.last || !plan.grip) out = mix(pose.hold, POSE.shut, sine((t - grab.slip) / EMPTY));
  else if (t < plan.grip.from) out = pose.hold;
  else if (t < plan.grip.to)
    out = mix(pose.hold, pose.grip, sine(progress(t, plan.grip.from, plan.grip.to)));
  else if (!plan.opens || t < plan.opens.from) out = pose.grip;
  else out = mix(pose.grip, POSE.open, sine(progress(t, plan.opens.from, plan.opens.to)));

  let twitch = 0;
  let marks: Marks = 'none';
  const notch = grab.notch;
  if (notch && t >= notch.from && t < notch.to) {
    marks = 'strain';
    if (!calm) x += TREMBLE.px * Math.sin(2 * Math.PI * TREMBLE.hz * (t - notch.from));
  }
  if (grab.twitch && t >= grab.twitch.from && t < grab.twitch.to) {
    marks = 'twitch';
    const s = t - grab.twitch.from;
    if (!calm && s < TWITCH.open) twitch = TWITCH_DEGREES * sine(s / TWITCH.open);
    else if (!calm && s < TWITCH.snap)
      twitch = TWITCH_DEGREES * (1 - (s - TWITCH.open) / (TWITCH.snap - TWITCH.open));
  }

  const th = plan.grabs.reduce((sum, each) => sum + kickAt(plan, each, t, calm), 0) + lean;
  return { x, hub, th, out, twitch, marks };
}

/** A point swung `th` degrees about `pivot`: positive swings what hangs below it to the right. */
export function swing(x: number, y: number, pivot: { x: number; y: number }, th: number) {
  const a = (th * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return {
    x: pivot.x + dx * Math.cos(a) + dy * Math.sin(a),
    y: pivot.y - dx * Math.sin(a) + dy * Math.cos(a),
  };
}

// People.

/**
 * Where a plush is: its box `size` square centred on `x` with its top at
 * `top`, turned `rot` degrees clockwise about its middle, squashed to
 * `squash` of its height about its feet as it lands.
 */
export interface Spot {
  readonly x: number;
  readonly top: number;
  readonly size: number;
  readonly rot: number;
  readonly squash: number;
}

/** Which layer someone is drawn in: behind the chute's front (the pile, the shelf, into the chute), in the claw, or over everything. */
export type Layer = 'pile' | 'chute' | 'held' | 'top';

/** In the air, a plush tumbles one turn in this many seconds, its tag hidden; it lands squashed for `squash`. */
export const TUMBLE = 0.48;
const SQUASH = { seconds: 0.16, most: 0.14 } as const;
/** A notch drops whoever slips 24 px, tilted 9°, in `drop` seconds. */
const NOTCH = { dy: 24, tilt: 9, drop: 0.12 } as const;
/** A flight arcs this high; one that would pass someone on the shelf drops down beside it first, at `gate`, and slides in. */
const FLIGHT = { arc: 70, gate: 816, slide: 0.45 } as const;
/** On the rim, a plush teeters this far either way, twice a `wobble`; reduced motion tilts it once, `tilt`. */
const TEETER = { degrees: 14, wobble: 0.6, tilt: 12 } as const;

/** Where `name` hangs in `grab` at `t`, with the claw as it is then. */
function heldSpot(
  plan: Plan,
  grab: Grab,
  name: string,
  claw: ClawState,
  hold: Hold,
  t: number,
): Spot {
  const size = heldSize(plan.people, grab.last);
  const offset = holdOffset(hold, isWide(grab));
  const notched = grab.notch?.by === name && t >= grab.notch.from - 1e-9;
  const n = notched ? sine((t - grab.notch!.from) / NOTCH.drop) : 0;
  const centre = swing(
    claw.x + offset.dx,
    claw.hub + offset.dy + NOTCH.dy * n + size / 2,
    { x: claw.x, y: PIVOT_Y },
    claw.th,
  );
  return {
    x: centre.x,
    top: centre.y - size / 2,
    size,
    rot: -(claw.th + NOTCH.tilt * n),
    squash: 1,
  };
}

const spotOn = (seat: Seat): Spot => ({
  x: seat.x,
  top: seat.feet - STANDS * seat.size,
  size: seat.size,
  rot: 0,
  squash: 1,
});

/** A plush's box at `spot`, unturned. */
export function boxOf(spot: Spot): Box {
  return {
    left: spot.x - spot.size / 2,
    right: spot.x + spot.size / 2,
    top: spot.top,
    bottom: spot.top + STANDS * spot.size,
  };
}

/** Its face: the head's circle, on the kit's 100 grid at (50, 44), radius 29, turned with it. */
export function faceBox(spot: Spot): Box {
  const centre = turn(spot, spot.x, spot.top + 0.44 * spot.size);
  const r = 0.29 * spot.size;
  return { left: centre.x - r, right: centre.x + r, top: centre.y - r, bottom: centre.y + r };
}

/** A point of a plush at `spot` as it is turned about its middle. */
function turn(spot: Spot, x: number, y: number) {
  return swing(x, y, { x: spot.x, y: spot.top + spot.size / 2 }, -spot.rot);
}

export const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/** A path in the air from `a` to `b`, `u` of the way along. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }, u: number, height: number) {
  return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u) - 4 * height * u * (1 - u) };
}

/** How a name tag is set: the kit's options. */
export interface TagFit {
  readonly size: number;
  readonly maxWidth: number;
}

/** How the kit sets a name tag: its size, the width it allows, its lines, and how wide and high it is drawn. */
export interface TagSet extends TagFit {
  readonly lines: 1 | 2;
  readonly width: number;
  readonly height: number;
}

/** How a show sets `name`'s tag for `fit`. */
export type SetTag = (name: string, fit: TagFit) => TagSet;

/** The kit's name tag for `name`, on the chest of a box the size of a head. */
export const nameTagFor = (name: string, fit: TagFit): HTMLElement =>
  nameTag(name, { ...fit, chest: true });

/** What the kit set `el`, `name`'s tag, at, and its size estimated from its letters and lines. */
export function tagSetOf(name: string, el: HTMLElement): TagSet {
  const size = Number.parseFloat(el.style.getPropertyValue('--tag-size'));
  const maxWidth = Number.parseFloat(el.style.maxWidth);
  const lines = el.dataset.lines === '2' ? 2 : 1;
  return {
    size,
    maxWidth,
    lines,
    width: tagContentWidth(name, size, maxWidth, lines),
    height: (1.1 * lines + 0.15) * size + 2 * stagePx('--line'),
  };
}

const estimates = new Map<string, TagSet>();
/** How the kit sets `name`'s tag for `fit`, its size estimated, where nothing is drawn. */
export const estimateTag: SetTag = (name, fit) => {
  const key = `${name}|${fit.size}|${fit.maxWidth}`;
  let set = estimates.get(key);
  if (!set) estimates.set(key, (set = tagSetOf(name, nameTagFor(name, fit))));
  return set;
};

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * A name tag's width as the kit sets it, estimated where nothing can
 * measure it: as wide as its longest line (0.6 em a character, as the kit
 * counts without a canvas), the padding and the borders, and never wider
 * than `set`.
 */
export function tagContentWidth(name: string, size: number, set: number, lines: 1 | 2): number {
  const extra = 0.6 * size + 2 * stagePx('--line') + 2;
  const across = (text: string) => [...graphemes.segment(text)].length * 0.6 * size;
  if (lines === 1) return Math.min(set, Math.ceil(across(name) + extra));
  const room = set - extra;
  const words = name.split(/(?<=[\s-])/);
  let first = '';
  while (words.length > 1 && across((first + words[0]!).trimEnd()) <= room) first += words.shift()!;
  const second = words.join('');
  if (!first || across(second) > room) return set;
  return Math.min(set, Math.ceil(Math.max(across(first.trimEnd()), across(second)) + extra));
}

/** Space kept between neighbouring name tags. */
const TAG_GAP = 8;
/** Two or three in the claw sharing their room keep tags this big, where both names can. */
const SHARED_LEAST = 24;
/** A tag for one in the claw, by the hub, on the prong or on a fingertip spread wide or not. */
const HELD_TAG = { one: 260, mid: 144, tip: 172, wide: 190 } as const;

/**
 * Tags in a row, centred `apart` px from one another left to right, each at
 * most as wide as its fit: each takes what its neighbour's name leaves of
 * the room between them; when both don't fit, the shorter keeps its width
 * if the longer can still be set in the rest, and else they share it in
 * proportion, neither under what the kit can set.
 */
function share(
  names: readonly string[],
  fits: readonly TagFit[],
  apart: number,
  setTag: SetTag,
): TagFit[] {
  const out = [...fits];
  const least = names.map((name) => setTag(name, { size: tagSize(0), maxWidth: 1 }).width);
  const natural = names.map((name, k) => setTag(name, fits[k]!).width);
  const readable = names.map(
    (name) => setTag(name, { size: SHARED_LEAST, maxWidth: HELD_TAG.one }).width,
  );
  for (let k = 0; k + 1 < names.length; k++) {
    const budget = 2 * (apart - TAG_GAP);
    const [a, b] = [natural[k]!, natural[k + 1]!];
    // In proportion, each keeping a tag of SHARED_LEAST where both can.
    const lo = Math.max(least[k]!, readable[k]!);
    const hi = budget - Math.max(least[k + 1]!, readable[k + 1]!);
    const even = (budget * a) / (a + b);
    const left =
      a + b <= budget
        ? budget - b
        : lo <= hi
          ? Math.min(hi, Math.max(lo, even))
          : Math.min(budget - least[k + 1]!, Math.max(least[k]!, even));
    const right = a + b <= budget ? budget - a : budget - left;
    out[k] = { ...out[k]!, maxWidth: Math.floor(Math.min(out[k]!.maxWidth, left)) };
    out[k + 1] = { ...out[k + 1]!, maxWidth: Math.floor(Math.min(out[k + 1]!.maxWidth, right)) };
    natural[k + 1] = Math.min(natural[k + 1]!, out[k + 1]!.maxWidth);
  }
  return out;
}

/** A name tag as drawn at a moment: its fit, lines, the box it takes and whether it is hidden. */
export interface DrawnTag extends TagFit {
  readonly lines: 1 | 2;
  readonly hidden: boolean;
  readonly box: Box;
  /** Where its holder, a box the size of the head, goes: the tag sits at 76% down it. */
  readonly holder: { readonly left: number; readonly top: number; readonly size: number };
}

/** A move between two of `name`'s tags: from `from` to `to`, `u` (0…1) of the way. */
interface Tags {
  readonly from: TagFit;
  readonly to: TagFit;
  readonly u: number;
}

/** Where someone is at a moment, what layer they are in, their tag's fits, and whether it is away. */
interface Placed {
  readonly spot: Spot;
  readonly layer: Layer;
  readonly tags: Tags;
  /** Hidden for the moment: tumbling, in the chute, or out of sight. */
  readonly away: boolean;
  /** Out of sight altogether, in the chute. */
  readonly gone: boolean;
  /** Being lifted out of the pile: their tag hides while it would cover a face or tag there. */
  readonly lifted: boolean;
}

/**
 * Where everyone is over the show, from `plan`: in the pile, in the claw,
 * in the air, on the shelf, on the rim, in the chute and out as the prize.
 * `setTag` says how the show sets each tag; `calm` (reduced motion) drops
 * the tumble, the teeter and the squash.
 */
export function placings(plan: Plan, setTag: SetTag = estimateTag, calm = false) {
  const people = plan.people;
  const shelf = shelfSeats(people);
  const pile = pileSeats(people);
  const names = [...plan.seats.keys()];
  const grabOf = new Map(
    plan.grabs.flatMap((grab) => grab.by.map((name) => [name, grab] as const)),
  );
  const flightOf = new Map(plan.flights.map((flight) => [flight.by, flight]));
  // The claw at a moment, worked out once for everyone in it.
  const claws = new Map<number, ClawState>();
  const clawThen = (t: number, quiet: boolean) => {
    let claw = claws.get(t);
    if (!claw) {
      if (claws.size > 64) claws.clear();
      claws.set(t, (claw = clawAt(plan, t, quiet)));
    }
    return claw;
  };

  // Each grab's tags, shared out between those it holds.
  const heldFits = new Map<string, TagFit>();
  for (const grab of plan.grabs) {
    const size = tagSize(heldSize(people, grab.last));
    const wide = isWide(grab);
    const fits = grab.holds.map((hold): TagFit => ({
      size,
      maxWidth:
        hold === 'one'
          ? HELD_TAG.one
          : hold === 'mid'
            ? HELD_TAG.mid
            : wide
              ? HELD_TAG.wide
              : HELD_TAG.tip,
    }));
    const apart = holdOffset('right', wide).dx * (grab.by.length === 2 ? 2 : 1);
    const shared = grab.by.length === 1 ? fits : share(grab.by, fits, apart, setTag);
    grab.by.forEach((name, k) => heldFits.set(name, shared[k]!));
  }
  const pileFit = (name: string, size: number): TagFit => ({
    size: tagSize(size),
    maxWidth: pile[plan.seats.get(name)!]!.maxWidth,
  });
  const shelfFit: TagFit = { size: tagSize(shelf[0]!.size), maxWidth: shelf[0]!.maxWidth };
  const gripFit = (name: string): TagFit => ({ ...heldFits.get(name)!, maxWidth: HELD_TAG.one });
  /**
   * The prize's tag: as wide as the canvas lets it be, or as the room
   * between the tags it would meet on the base leaves it, so it meets none.
   */
  let prizeRoom: number | null = null;
  const prizeFit = (): TagFit => {
    if (prizeRoom === null) {
      const top = PRIZE.top + 0.76 * PRIZE.size;
      let half = PRIZE.maxWidth / 2;
      for (const other of names) {
        if (other === plan.unlucky) continue;
        const box = tagOf(other, plan.end, placed(other, plan.end)).box;
        if (box.bottom <= top - TAG_GAP) continue;
        if (box.right <= PRIZE.x) half = Math.min(half, PRIZE.x - box.right - TAG_GAP);
        else if (box.left >= PRIZE.x) half = Math.min(half, box.left - PRIZE.x - TAG_GAP);
      }
      prizeRoom = Math.floor(2 * half);
    }
    return { size: PRIZE.tag, maxWidth: prizeRoom };
  };
  const still = (fit: TagFit): Tags => ({ from: fit, to: fit, u: 1 });

  /** The spot on the shelf a flight lands on. */
  const seatSpot = (seat: number) => spotOn(shelf[seat]!);
  /** Everyone sitting on the shelf by the time `flight` lands. */
  const sitting = (flight: Flight) =>
    plan.flights
      .filter((other) => other.to < flight.to - 1e-9)
      .map((other) => boxOf(seatSpot(other.seat)));
  /** How each flight goes: straight over in an arc, or down beside the shelf and in along its tier, whichever passes nobody. */
  const routes = new Map(
    plan.flights.map((flight) => {
      const seated = sitting(flight);
      const direct = (u: number, start: Spot) => {
        const end = seatSpot(flight.seat);
        const centre = arc(
          { x: start.x, y: start.top + start.size / 2 },
          { x: end.x, y: end.top + end.size / 2 },
          u,
          FLIGHT.arc,
        );
        const size = mix(start.size, end.size, u);
        return { x: centre.x, top: centre.y - size / 2, size };
      };
      const gated = (u: number, start: Spot) => {
        const end = seatSpot(flight.seat);
        const gate = { x: Math.min(end.x, FLIGHT.gate), y: end.top + end.size / 2 };
        const turn = 1 - FLIGHT.slide;
        const size = mix(start.size, end.size, u);
        if (u < turn) {
          // Out to the side first, then down past the shelf's edge.
          const v = u / turn;
          const x = mix(start.x, gate.x, 1 - (1 - v) ** 3);
          const y = mix(start.top + start.size / 2, gate.y, v ** 3);
          return { x, top: y - size / 2, size };
        }
        const x = mix(gate.x, end.x, sine((u - turn) / FLIGHT.slide));
        return { x, top: gate.y - size / 2, size };
      };
      const start = flightStart(flight.by, flight.from);
      const clear = (route: typeof direct) =>
        Array.from({ length: 101 }, (_, k) => k / 100).every((u) => {
          const p = route(u, start);
          const box = {
            left: p.x - p.size / 2,
            right: p.x + p.size / 2,
            top: p.top,
            bottom: p.top + STANDS * p.size,
          };
          return !seated.some((other) => overlap(box, other));
        });
      return [flight.by, clear(direct) ? direct : gated] as const;
    }),
  );

  /** Where a flight starts: in the claw at the slip, or on the rim as they tip. */
  function flightStart(name: string, t: number): Spot {
    const flight = flightOf.get(name)!;
    if (flight.off === 'rim') return rimSpot(heldSize(people, true), calm ? TEETER.tilt : 0);
    const grab = grabOf.get(name)!;
    return heldSpot(plan, grab, name, clawThen(t, calm), grab.holds[grab.by.indexOf(name)]!, t);
  }

  /** On the rim, turned `rot` degrees clockwise about the rim. */
  function rimSpot(size: number, rot: number): Spot {
    const centre = swing(RIM.stand, RIM.y - (STANDS - 0.5) * size, RIM, -rot);
    return { x: centre.x, top: centre.y - size / 2, size, rot, squash: 1 };
  }

  // Everyone's place at the moment last asked for, worked out once.
  let placedAt = NaN;
  const placedThen = new Map<string, Placed>();
  const placed = (name: string, t: number): Placed => {
    if (t !== placedAt) {
      placedThen.clear();
      placedAt = t;
    }
    let at = placedThen.get(name);
    if (!at) placedThen.set(name, (at = place(name, t)));
    return at;
  };
  const place = (name: string, t: number): Placed => {
    const now = t + 1e-9;
    const grab = grabOf.get(name);
    const flight = flightOf.get(name);
    const rim = plan.rim?.by === name ? plan.rim : null;
    const unlucky = name === plan.unlucky;
    const seated = (): Placed => {
      const spot = pileSpotOf(plan, name, t);
      return {
        spot,
        layer: 'pile',
        tags: still(pileFit(name, spot.size)),
        away: false,
        gone: false,
        lifted: false,
      };
    };
    if (!grab || now < grab.down) return seated();
    const hold = grab.holds[grab.by.indexOf(name)]!;
    const claw = clawThen(t, calm);
    const inClaw = heldSpot(plan, grab, name, claw, hold, t);
    const held = heldFits.get(name)!;
    if (now < grab.shut) {
      const from = pileSpotOf(plan, name, grab.down);
      const u = sine(progress(t, grab.down, grab.shut));
      return {
        spot: {
          x: mix(from.x, inClaw.x, u),
          top: mix(from.top, inClaw.top, u),
          size: mix(from.size, inClaw.size, u),
          rot: inClaw.rot * u,
          squash: 1,
        },
        layer: 'held',
        tags: { from: pileFit(name, from.size), to: held, u },
        away: false,
        gone: false,
        lifted: true,
      };
    }
    const leaves = flight?.off === 'claw' ? flight.from : rim ? rim.from : Infinity;
    if (now < Math.min(leaves, unlucky && plan.grip ? plan.grip.from : Infinity)) {
      return {
        spot: inClaw,
        layer: 'held',
        tags: still(held),
        away: false,
        gone: false,
        lifted: now < grab.up,
      };
    }

    // The unlucky person, held round the head and dropped into the chute.
    if (unlucky && plan.grip) {
      const grip = heldSpot(plan, grab, name, claw, 'one', t);
      if (now < plan.grip.to) {
        const u = sine(progress(t, plan.grip.from, plan.grip.to));
        return {
          spot: {
            ...grip,
            x: mix(inClaw.x, grip.x, u),
            top: mix(inClaw.top, grip.top, u),
            rot: mix(inClaw.rot, grip.rot, u),
          },
          layer: 'held',
          tags: { from: held, to: gripFit(name), u },
          away: false,
          gone: false,
          lifted: false,
        };
      }
      if (now < plan.fall.from)
        return {
          spot: grip,
          layer: 'held',
          tags: still(gripFit(name)),
          away: false,
          gone: false,
          lifted: false,
        };
      return intoTheChute(
        name,
        t,
        heldSpot(plan, grab, name, clawThen(plan.fall.from, calm), 'one', plan.fall.from),
      );
    }

    // On the rim: drop, teeter, and tip out onto the shelf or into the chute.
    if (rim && (now < rim.tips || !rim.out)) {
      const size = heldSize(people, true);
      if (now < rim.lands) {
        const from = heldSpot(plan, grab, name, clawThen(rim.from, calm), hold, rim.from);
        const to = rimSpot(size, 0);
        const u = progress(t, rim.from, rim.lands);
        const fall = u * u;
        return {
          spot: {
            x: mix(from.x, to.x, sine(u)),
            top: mix(from.top, to.top, fall),
            size,
            rot: mix(from.rot, 0, sine(u)),
            squash: 1,
          },
          layer: 'top',
          tags: still(held),
          away: false,
          gone: false,
          lifted: false,
        };
      }
      if (now < rim.tips) {
        const s = t - rim.lands;
        const rot = calm
          ? (rim.out ? TEETER.tilt : -TEETER.tilt) * sine(s / END.teeter)
          : TEETER.degrees * Math.sin((2 * Math.PI * s) / TEETER.wobble);
        return {
          spot: rimSpot(size, rot),
          layer: 'top',
          tags: still(held),
          away: false,
          gone: false,
          lifted: false,
        };
      }
      return intoTheChute(name, t, rimSpot(size, calm ? -TEETER.tilt : 0));
    }

    // In the air, then on the shelf.
    if (flight) {
      const start = flightStart(name, flight.from);
      const end = seatSpot(flight.seat);
      if (now < flight.to) {
        const u = progress(t, flight.from, flight.to);
        const along = calm ? sine(u) : u;
        const p = routes.get(name)!(along, start);
        const s = t - flight.from;
        const tumbling = flight.off === 'claw' && s < TUMBLE;
        const rot = calm
          ? 0
          : flight.off === 'claw'
            ? start.rot + (360 - start.rot) * sine(Math.min(1, s / TUMBLE))
            : 20 * Math.sin(Math.PI * u);
        return {
          spot: { x: p.x, top: p.top, size: p.size, rot: rot % 360, squash: 1 },
          layer: 'top',
          tags: { from: held, to: shelfFit, u },
          away: tumbling,
          gone: false,
          lifted: false,
        };
      }
      const s = t - flight.to;
      // The last grab's lands without a squash: the stage is still before the claw opens.
      const squash =
        calm || grab.last || s >= SQUASH.seconds
          ? 1
          : 1 - SQUASH.most * Math.sin((Math.PI * s) / SQUASH.seconds);
      return {
        spot: { ...end, squash },
        layer: 'pile',
        tags: still(shelfFit),
        away: false,
        gone: false,
        lifted: false,
      };
    }
    return seated();
  };

  /** Into the chute from `from`, out of sight, and out of its door as the prize. */
  function intoTheChute(name: string, t: number, from: Spot): Placed {
    const now = t + 1e-9;
    const fit = gripFit(name);
    if (now < plan.fall.to) {
      const u = progress(t, plan.fall.from, plan.fall.to);
      const tipping = plan.rim?.by === name;
      return {
        spot: {
          x: mix(from.x, IN_CHUTE.x, sine(u)),
          top: mix(from.top, IN_CHUTE.top, u * u),
          size: from.size,
          rot: tipping && !calm ? mix(from.rot, -70, sine(u)) : from.rot * (1 - u),
          squash: 1,
        },
        layer: 'chute',
        tags: still(fit),
        away: true,
        gone: false,
        lifted: false,
      };
    }
    if (now < plan.doorOpens) {
      return {
        spot: { x: IN_CHUTE.x, top: IN_CHUTE.top, size: from.size, rot: 0, squash: 1 },
        layer: 'chute',
        tags: still(fit),
        away: true,
        gone: true,
        lifted: false,
      };
    }
    const u = progress(t, plan.doorOpens, plan.prize);
    const grow = calm ? sine(u) : backOut(u);
    return {
      spot: {
        x: PRIZE.x,
        top: mix(DOOR.top, PRIZE.top, grow),
        size: mix(DOOR.size, PRIZE.size, grow),
        rot: 0,
        squash: 1,
      },
      layer: 'top',
      tags: still(prizeFit()),
      away: now < plan.prize,
      gone: false,
      lifted: false,
    };
  }

  /** The tag a move's end settles on. */
  const settled = (tags: Tags) => (tags.u < 0.5 ? tags.from : tags.to);

  /** Faces and tags of everyone sitting in the pile at `t`, but those `name`'s grab takes. */
  const pileMarks = (name: string, t: number): Box[] => {
    const grab = grabOf.get(name);
    return names.flatMap((other) => {
      if (other === name) return [];
      // Those coming out with them: their tags, while they are on the way too.
      if (grab?.by.includes(other)) {
        return t + 1e-9 < grab.shut ? [tagOf(other, t, placed(other, t)).box] : [];
      }
      const theirs = grabOf.get(other);
      if (theirs && t + 1e-9 >= theirs.down) return [];
      const at = placed(other, t);
      return [faceBox(at.spot), tagOf(other, t, at).box];
    });
  };

  /** `name`'s tag as drawn at `t`, as the kit sets it at each end of a move. */
  const tagOf = (name: string, t: number, at = placed(name, t)): DrawnTag => {
    const one = setTag(name, settled({ ...at.tags, u: 0 }));
    const two = setTag(name, settled({ ...at.tags, u: 1 }));
    const lines = one.lines === 2 || two.lines === 2 ? 2 : 1;
    const wide = (set: TagSet) => (lines === 2 && set.lines === 1 ? set.maxWidth : set.width);
    const size = mix(one.size, two.size, at.tags.u);
    const width = mix(wide(one), wide(two), at.tags.u);
    const height = (1.1 * lines + 0.15) * size + 2 * stagePx('--line');
    const { spot } = at;
    const centre = turn(spot, spot.x, spot.top + 0.76 * spot.size + height / 2);
    const top = centre.y - height / 2;
    // Moved sideways to stay on the stage.
    const shift =
      Math.max(0, width / 2 - centre.x) + Math.min(0, STAGE.width - centre.x - width / 2);
    const x = centre.x + shift;
    const box = { left: x - width / 2, right: x + width / 2, top, bottom: top + height };
    return {
      size,
      maxWidth: mix(one.maxWidth, two.maxWidth, at.tags.u),
      lines,
      hidden: at.away,
      box,
      holder: { left: x - spot.size / 2, top: top - 0.76 * spot.size, size: spot.size },
    };
  };

  const tag = (name: string, t: number): DrawnTag => {
    const at = placed(name, t);
    const drawn = tagOf(name, t, at);
    if (drawn.hidden || !at.lifted) return drawn;
    // Its tag, drawn over every plush, hides where it would cover a face or a tag there.
    const passing = pileMarks(name, t).some((mark) => overlap(mark, drawn.box));
    return passing ? { ...drawn, hidden: true } : drawn;
  };

  // Every tag set before the show.
  for (const name of names) {
    for (const size of new Set([
      pileSeats(people)[plan.seats.get(name)!]!.size,
      pileSize(people, 6),
    ])) {
      setTag(name, pileFit(name, size));
    }
    if (heldFits.has(name)) setTag(name, heldFits.get(name)!);
  }

  // The prize's room, worked out once everyone's place can be.
  setTag(plan.unlucky, prizeFit());
  placedAt = NaN;
  placedThen.clear();

  return {
    /** Where `name` is at `t`, and the layer they are drawn in. */
    at: (name: string, t: number) => {
      const { spot, layer, gone } = placed(name, t);
      return { spot, layer, gone };
    },
    tag,
    /** Where `name` sits on the shelf, if they land there. */
    shelfSpot: (name: string) => {
      const flight = flightOf.get(name);
      return flight ? seatSpot(flight.seat) : null;
    },
  };
}

/** Where everyone is over a show: `placings`. */
export type Places = ReturnType<typeof placings>;

/** GSAP's back.out(1.7): past its end and back, as popIn grows. */
function backOut(u: number): number {
  const s = 1.7;
  const v = u - 1;
  return v * v * ((s + 1) * v + s) + 1;
}

// Bubbles.

/** The caption sticker at the top: bubbles stay below it. */
export const CAPTION_BOTTOM = 116;
/** Space kept between a bubble and the stage's edge. */
const EDGE = 8;

/**
 * The caption sticker's box while it says `text`, as the kit sets it: one
 * line centred at the top, padded 28 px inside its line, a tenth wider for
 * its tilt.
 */
export function captionBox(text: string): Box {
  const font = stagePx('--size-stage-caption');
  const width = 1.1 * (0.62 * font * [...text].length + 2 * (28 + stagePx('--line-bold')));
  const half = width > 1160 ? STAGE.width / 2 : width / 2;
  return {
    left: STAGE.width / 2 - half,
    right: STAGE.width / 2 + half,
    top: 0,
    bottom: CAPTION_BOTTOM,
  };
}

/**
 * Where to anchor a bubble saying `text`: the nearest place to `prefer`
 * whose box is on the stage, below the caption and clear of everything in
 * `avoid`; beside `prefer` as the kit places it when nowhere is.
 */
export function bubbleAt(text: string, prefer: { x: number; y: number }, avoid: readonly Box[]) {
  const candidates: { x: number; y: number; d: number }[] = [];
  for (let x = 0; x <= STAGE.width; x += 8) {
    for (let y = 0; y <= STAGE.height; y += 8) {
      candidates.push({ x, y, d: Math.hypot(x - prefer.x, 1.5 * (y - prefer.y)) });
    }
  }
  candidates.sort((one, two) => one.d - two.d);
  for (const { x, y } of candidates) {
    const box = speechBox(text, { x, y });
    if (box.left < EDGE || box.right > STAGE.width - EDGE) continue;
    if (box.top < CAPTION_BOTTOM || box.bottom > STAGE.height - EDGE) continue;
    if (avoid.some((other) => overlap(box, other))) continue;
    return { x, y };
  }
  const beside = {
    left: prefer.x - 1,
    right: prefer.x + 1,
    top: prefer.y - 1,
    bottom: prefer.y + 1,
  };
  return speechAt(text, beside, avoid);
}

/** How far a bubble may sit from the face or name tag of whoever says it. */
const BY_SPEAKER = 16;
/** How far above the top of a head a bubble's tail may end over it. */
const RISE = 24;

/** A plush's head: the top `size` of its box. */
export const headBox = (spot: Spot): Box => ({
  left: spot.x - spot.size / 2,
  right: spot.x + spot.size / 2,
  top: spot.top,
  bottom: spot.top + spot.size,
});

/** Where a bubble's tail ends: `offset` from the middle of the top of `head`. */
export const anchorBy = (head: Box, offset: { dx: number; dy: number }) => ({
  x: (head.left + head.right) / 2 + offset.dx,
  y: head.top + offset.dy,
});

/** How far apart two boxes are: 0 when they touch or overlap. */
const apart = (one: Box, two: Box) =>
  Math.hypot(
    Math.max(0, one.left - two.right, two.left - one.right),
    Math.max(0, one.top - two.bottom, two.top - one.bottom),
  );

/** From -`most` to `most`, about 4 px apart, both ends and 0 among them. */
function across(most: number): number[] {
  const steps = Math.ceil(most / 4);
  return Array.from({ length: 2 * steps + 1 }, (_, k) => steps && ((k - steps) / steps) * most);
}

/**
 * Where a bubble saying `text` sits from whoever says it, as an offset from
 * their head and a lean for the kit's bubble, given their head, face and
 * name tag (null while hidden) and what to keep clear of at each moment it
 * is up, as Don't Wake the Dog places its bubbles. Over them, its tail ends
 * up to RISE above their head, within the middle half of it. Beside them,
 * it is within BY_SPEAKER of their face or tag, its tail no lower than the
 * tag, leaning as near their head as it may. Null when nowhere is.
 */
export function bubbleBy(
  text: string,
  speaker: readonly { head: Box; face: Box; tag: Box | null; avoid: readonly Box[] }[],
  where: 'over' | 'beside',
): { dx: number; dy: number; lean: number } | null {
  const { head, face, tag } = speaker[0]!;
  const shape = speechBox(text, { x: 0, y: 0 });
  const room = leanRoom(text);
  const middle = (head.left + head.right) / 2;
  const candidates: { dx: number; dy: number; lean: number; d: number }[] = [];
  if (where === 'over') {
    const quarter = (head.right - head.left) / 4;
    for (const lean of across(room)) {
      for (const dx of across(quarter)) {
        for (let y = face.top; y >= head.top - RISE - 1e-9; y -= 4) {
          const dy = y - head.top;
          candidates.push({ dx, dy, lean, d: Math.abs(dx) + Math.abs(dy) + Math.abs(lean) / 4 });
        }
      }
    }
  } else {
    const near = tag
      ? {
          left: Math.min(face.left, tag.left),
          right: Math.max(face.right, tag.right),
          top: Math.min(face.top, tag.top),
          bottom: Math.max(face.bottom, tag.bottom),
        }
      : face;
    for (
      let x = near.left - BY_SPEAKER - shape.right;
      x <= near.right + BY_SPEAKER - shape.left;
      x += 4
    ) {
      for (let y = face.top - BY_SPEAKER; y <= near.bottom; y += 4) {
        const lean = Math.max(-room, Math.min(room, x - middle));
        const d = Math.hypot(x - middle, y - face.top);
        candidates.push({ dx: x - lean - middle, dy: y - head.top, lean, d });
      }
    }
  }
  candidates.sort((one, two) => one.d - two.d);
  const fits = (offset: { dx: number; dy: number; lean: number }) =>
    speaker.every((at) => {
      const anchor = anchorBy(at.head, offset);
      const box = speechBox(text, anchor, offset.lean);
      const own = [at.face, ...(at.tag ? [at.tag] : [])];
      const beside =
        own.some((each) => apart(box, each) <= BY_SPEAKER) &&
        anchor.y <= Math.max(...own.map((each) => each.bottom));
      return (
        box.left >= EDGE &&
        box.right <= STAGE.width - EDGE &&
        box.top >= CAPTION_BOTTOM &&
        box.bottom <= STAGE.height - EDGE &&
        (where === 'over' || beside) &&
        !at.avoid.some((other) => overlap(box, other))
      );
    });
  const found = candidates.find(fits);
  return found ? { dx: found.dx, dy: found.dy, lean: found.lean } : null;
}
