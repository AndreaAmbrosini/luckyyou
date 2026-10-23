// Where everyone stands in the ring, from the storyboard: an ellipse seen
// from a little above, so the person at the back is smaller than the one in
// front. In stage pixels. Also where the potato goes, and where the grown
// unlucky person fits, so the potato and the names stay in view below the
// caption.

import { STAGE } from '../../scenario-kit';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Where someone stands, and how big their head and name tag are. */
export interface Spot {
  /** Where the person stands: the head's box is x − size/2 … x + size/2, y − 0.8·size … y + 0.2·size. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly tag: { readonly size: number; readonly maxWidth: number };
}

/**
 * The potato's size, how much bigger it is when two people hold it, and how
 * far its drawing reaches above that box: the spark's rays at full length,
 * or the smoke while it's out (parts.ts).
 */
export const POTATO = { width: 120, height: 110, pairScale: 1.4, above: 80 } as const;

/** The caption sticker (kit, top centre) reaches down to about here; the potato stays below it. */
export const SKY = 120;

interface Shape {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly back: number;
  readonly front: number;
}

/** A name tag is set at 0.22 of the head's size, never under 22, and at most 2.2 heads wide (198 at least). */
export function tagFor(size: number): Spot['tag'] {
  return {
    size: Math.max(22, Math.round(0.22 * size)),
    maxWidth: Math.max(198, Math.round(2.2 * size)),
  };
}

const shape = (count: number): Shape => {
  if (count <= 8) {
    const f = 1 + 0.06 * (8 - count);
    return { cx: 640, cy: 450, rx: 470, ry: 190, back: 78 * f, front: 104 * f };
  }
  const t = Math.min(1, (count - 8) / 4);
  const mix = (at8: number, at12: number) => at8 + t * (at12 - at8);
  return {
    cx: 640,
    cy: mix(450, 440),
    rx: mix(470, 540),
    ry: mix(190, 215),
    back: mix(78, 64),
    front: mix(104, 92),
  };
};

/** The spots for `count` people: the first at the back, then clockwise. */
export function ring(count: number): Spot[] {
  if (count === 2) {
    return [
      { x: 300, y: 560, size: 200 },
      { x: 980, y: 560, size: 200 },
    ].map((spot) => ({ ...spot, tag: tagFor(spot.size) }));
  }
  const { cx, cy, rx, ry, back, front } = shape(count);
  return Array.from({ length: count }, (_, k) => {
    const a = (2 * Math.PI * k) / count;
    const x = Math.round(cx + rx * Math.sin(a));
    const y = Math.round(cy - ry * Math.cos(a));
    const size = Math.round(back + ((y - (cy - ry)) / (2 * ry)) * (front - back));
    return { x, y, size, tag: tagFor(size) };
  });
}

/** Someone who is out of play: a little smaller, in the same place; the name tag keeps its size. */
export function outOfPlay(spot: Spot): Spot {
  return { ...spot, size: spot.size * 0.88 };
}

/** The duel's two, big in front and facing each other: their head size, name tag size and spots. */
const DUEL = { size: 180, tag: 40, left: { x: 320, y: 580 }, right: { x: 960, y: 580 } };

/**
 * How many times bigger someone from `spot` is drawn in the duel, name tag
 * and all, so the tag comes to DUEL.tag: a hair over rather than under, for
 * the drawing's rounding. The head makes up the rest to DUEL.size.
 */
export function duelGrowth(spot: Spot): number {
  return Math.ceil((DUEL.tag / spot.tag.size) * 1e4) / 1e4;
}

/**
 * Shares of the step-in: the watchers fade out from its start to `out`,
 * are moved while hidden, and fade back in from `in` to its end.
 */
const FADE = { out: 0.25, in: 0.8 };

/** Eases in and out, `t` (0…1) to the `power`. */
const inOut = (power: number) => (t: number) =>
  t < 0.5 ? 2 ** (power - 1) * t ** power : 1 - 2 ** (power - 1) * (1 - t) ** power;

/**
 * The pair's walk eases in and out steeply, and they only start growing
 * once the watchers have faded out: so they're still small, near where they
 * stood, while the watchers fade out, and nearly there when they're back.
 */
const walking = inOut(4);
const GROW_FROM = 0.3;
const growing = (t: number) => inOut(3)(Math.max(0, (t - GROW_FROM) / (1 - GROW_FROM)));

/** How finely the watchers' arc is narrowed, in radians. */
const ARC_STEP = 0.005;

/** Who in the pair stands on the left, and where each watcher watches from. */
function duelPlan(count: number, pair: readonly [number, number]) {
  const spots = ring(count);
  const { cx, cy, rx, ry } = shape(count);
  const [one, two] = pair;
  const oneLeft = spots[one]!.x < spots[two]!.x || (spots[one]!.x === spots[two]!.x && one < two);
  const [left, right] = oneLeft ? [one, two] : [two, one];
  // In ring order from the front-left, round the back, to the front-right.
  const angle = (index: number) => {
    const a = (2 * Math.PI * index) / count;
    return a > Math.PI ? a - 2 * Math.PI : a;
  };
  const watchers = spots
    .map((_, index) => index)
    .filter((index) => index !== left && index !== right)
    .sort((a, b) => angle(a) - angle(b));
  /** The watchers evenly spaced over an arc `width` wide, centred on the back. */
  const spread = (width: number): Spot[] =>
    watchers.map((index, k) => {
      const a = watchers.length === 1 ? 0 : -width / 2 + (width * k) / (watchers.length - 1);
      return { ...outOfPlay(spots[index]!), x: cx + rx * Math.sin(a), y: cy - ry * Math.cos(a) };
    });
  const apart = (placed: Spot[]) =>
    placed.every((spot, k) =>
      placed.slice(k + 1).every((other) => !overlap(tagBox(spot), tagBox(other))),
    );
  let width = 0;
  while (!apart(spread(width))) width += ARC_STEP;
  const watching = new Map(spread(width).map((spot, k) => [watchers[k]!, spot]));
  return { spots, left, right, watching };
}

const duelPlans = new Map<string, ReturnType<typeof duelPlan>>();

/**
 * Everyone's spot a fraction `t` (0…1) of the way through the step-in, from
 * the showdown (the pair at their ring spots, everyone else out of play) to
 * the duel, and how visible they are (0…1). The pair walk in a straight line,
 * growing; the watchers fade out where they stand and back in on the upper
 * arc of the ring, in ring order.
 */
export function duelMove(
  count: number,
  pair: readonly [number, number],
  t: number,
): { spot: Spot; shown: number }[] {
  if (count === 2) return ring(2).map((spot) => ({ spot, shown: 1 }));
  const key = `${count} ${pair[0]} ${pair[1]}`;
  if (!duelPlans.has(key)) duelPlans.set(key, duelPlan(count, pair));
  const { spots, left, right, watching } = duelPlans.get(key)!;
  const walked = walking(t);
  const grown = growing(t);
  const shown = t <= FADE.out ? 1 - t / FADE.out : t >= FADE.in ? (t - FADE.in) / (1 - FADE.in) : 0;
  return spots.map((spot, index) => {
    const end = index === left ? DUEL.left : index === right ? DUEL.right : null;
    if (!end) {
      return { spot: t < FADE.out ? outOfPlay(spot) : watching.get(index)!, shown };
    }
    const growth = 1 + grown * (duelGrowth(spot) - 1);
    return {
      spot: {
        x: spot.x + walked * (end.x - spot.x),
        y: spot.y + walked * (end.y - spot.y),
        size: spot.size + grown * (DUEL.size - spot.size),
        tag: { size: spot.tag.size * growth, maxWidth: spot.tag.maxWidth * growth },
      },
      shown: 1,
    };
  });
}

/** Everyone's spot in the duel, by ring index: the pair big in front, facing each other, the rest watching. */
export function duelLayout(count: number, pair: readonly [number, number]): Spot[] {
  return duelMove(count, pair, 1).map((each) => each.spot);
}

/** The gap between a held potato's box and the holder's face. */
const HOLD_GAP = 6;

/** The highest the centre of a potato drawn at `scale` may go without reaching the sky. */
export function highest(scale: number): number {
  return SKY + scale * (POTATO.height / 2 + POTATO.above);
}

/** The face on a head at `spot`: the kit's circle at 50, 44, radius 29 on its 100 grid. */
export function face(spot: Spot): Point & { readonly r: number } {
  const top = spot.y - 0.8 * spot.size;
  return { x: spot.x, y: top + 0.44 * spot.size, r: 0.29 * spot.size };
}

/**
 * Where a potato drawn at `scale` is held: just over the face; where that
 * would reach the sky, beside the face at about its height, towards the
 * stage's middle.
 */
export function held(spot: Spot, scale = 1): Point {
  const { x, y, r } = face(spot);
  const over = y - r - HOLD_GAP - (scale * POTATO.height) / 2;
  if (over >= highest(scale)) return { x, y: over };
  const side = x > STAGE.width / 2 ? -1 : 1;
  return {
    x: x + side * (r + HOLD_GAP + (scale * POTATO.width) / 2),
    y: Math.max(highest(scale), y),
  };
}

/** The potato's box when its centre is at `point`. */
export function potatoBox(point: Point, scale: number): Box {
  const x = (scale * POTATO.width) / 2;
  const y = (scale * POTATO.height) / 2;
  return { left: point.x - x, top: point.y - y, right: point.x + x, bottom: point.y + y };
}

/** A head's box at `spot`. */
export function headBox(spot: Spot): Box {
  const top = spot.y - 0.8 * spot.size;
  return {
    left: spot.x - spot.size / 2,
    top,
    right: spot.x + spot.size / 2,
    bottom: top + spot.size,
  };
}

/** A name tag's box on the stage: as wide as it may grow, two lines high. */
export function tagBox(spot: Spot): Box {
  const top = spot.y - 0.04 * spot.size;
  return {
    left: spot.x - spot.tag.maxWidth / 2,
    right: spot.x + spot.tag.maxWidth / 2,
    top,
    bottom: top + 2.4 * spot.tag.size + 8,
  };
}

export function overlap(one: Box, two: Box): boolean {
  return (
    one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom
  );
}

/** A point `t` of the way along a cubic Bézier curve. */
export function bezier(t: number, ...[a, b, c, d]: readonly Point[]): Point {
  const u = 1 - t;
  const along = (key: 'x' | 'y') =>
    u * u * u * a![key] + 3 * u * u * t * b![key] + 3 * u * t * t * c![key] + t * t * t * d![key];
  return { x: along('x'), y: along('y') };
}

/** The top of a cubic Bézier curve: its smallest y, where its slope is 0 or at an end. */
export function apex(...path: readonly Point[]): number {
  const [a, b, c, d] = path.map((point) => point.y) as [number, number, number, number];
  // The slope is a multiple of p0 + 2t(p1 − p0) + t²(p0 − 2p1 + p2).
  const [p0, p1, p2] = [b - a, c - b, d - c];
  const square = p0 - 2 * p1 + p2;
  const linear = 2 * (p1 - p0);
  const flat: number[] = [];
  if (Math.abs(square) < 1e-12) {
    if (Math.abs(linear) > 1e-12) flat.push(-p0 / linear);
  } else {
    const discriminant = linear * linear - 4 * square * p0;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      flat.push((-linear - root) / (2 * square), (-linear + root) / (2 * square));
    }
  }
  const ts = [0, 1, ...flat.filter((t) => t > 0 && t < 1)];
  return Math.min(...ts.map((t) => bezier(t, ...path).y));
}

/** How high a throw rises over the higher of its two ends, plus a share of its length. */
const ARC = { rise: 120, share: 0.25 };

/** A cubic Bézier curve: its start, two control points, and its end. */
export type Path = [Point, Point, Point, Point];

/**
 * A throw from `from` to `to` as a cubic Bézier curve, an arc over the ring,
 * flattened just enough that a potato drawn at `scale` stays out of the sky.
 */
export function throwPath(from: Point, to: Point, scale: number): Path {
  const top =
    Math.min(from.y, to.y) - ARC.rise - ARC.share * Math.hypot(to.x - from.x, to.y - from.y);
  const c1 = { x: from.x, y: top };
  const c2 = { x: to.x, y: top };
  const lowered = (by: number): Path => [
    from,
    { x: c1.x, y: c1.y + by },
    { x: c2.x, y: c2.y + by },
    to,
  ];
  const limit = highest(scale);
  if (apex(...lowered(0)) >= limit) return lowered(0);
  // The least lowering that keeps it out of the sky, found by halving.
  let low = 0;
  let high = 2 * STAGE.height;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (apex(...lowered(middle)) >= limit) high = middle;
    else low = middle;
  }
  return lowered(high);
}

/** The hang's top is this far below the highest a potato may go. */
const HANG_BELOW = 20;

/**
 * The hang-time throw: up to a top halfway between the pair, high under the
 * sky, then down onto `to`. Level at the top, and never higher than it.
 */
export function hang(
  from: Point,
  to: Point,
  pair: readonly [Point, Point],
  scale: number,
): { rise: Path; top: Point; drop: Path } {
  const top = { x: (pair[0].x + pair[1].x) / 2, y: highest(scale) + HANG_BELOW };
  return {
    rise: [
      from,
      { x: from.x, y: (from.y + top.y) / 2 },
      { x: (from.x + top.x) / 2, y: top.y },
      top,
    ],
    top,
    drop: [top, { x: (top.x + to.x) / 2, y: top.y }, { x: to.x, y: (top.y + to.y) / 2 }, to],
  };
}

/** How much higher than just over the head a potato is held up for a throw. */
const RAISE = 40;

/** Where the potato is held up for a throw: above the head, below the sky. */
export function raised(spot: Spot, scale = 1): Point {
  const top = spot.y - 0.8 * spot.size;
  return {
    x: spot.x,
    y: Math.max(highest(scale), top - HOLD_GAP - (scale * POTATO.height) / 2 - RAISE),
  };
}

/** The wind-up: the potato from where `spot` holds it, straight to where they hold it up. */
export function windUp(spot: Spot, scale = 1): Path {
  const from = held(spot, scale);
  const to = raised(spot, scale);
  return [from, from, to, to];
}

/** How much bigger the unlucky person stands at the pop. */
export const CROWNED = 1.3;
/** How close to the stage's edge a grown name tag may come. */
const EDGE = 8;

const shift = (box: Box, x: number, y: number): Box => ({
  left: box.left + x,
  right: box.right + x,
  top: box.top + y,
  bottom: box.bottom + y,
});

/**
 * The unlucky person at the pop: CROWNED times their size about their feet
 * (the bottom of the head's box), then moved by `x`, `y` where their tag
 * would leave the stage. `head` takes in the paper crown, a tenth of a head
 * above it.
 */
export function crowned(spot: Spot): { x: number; y: number; head: Box; tag: Box } {
  const feet = { x: spot.x, y: spot.y + 0.2 * spot.size };
  const grow = (box: Box): Box => ({
    left: feet.x + CROWNED * (box.left - feet.x),
    right: feet.x + CROWNED * (box.right - feet.x),
    top: feet.y + CROWNED * (box.top - feet.y),
    bottom: feet.y + CROWNED * (box.bottom - feet.y),
  });
  const tag = grow(tagBox(spot));
  const x = Math.max(0, EDGE - tag.left) + Math.min(0, STAGE.width - EDGE - tag.right);
  const y = Math.min(0, STAGE.height - EDGE - tag.bottom);
  const head = grow(headBox(spot));
  const crown = 0.1 * (head.bottom - head.top);
  return { x, y, head: shift({ ...head, top: head.top - crown }, x, y), tag: shift(tag, x, y) };
}
