// Where everyone stands in the ring, from the storyboard: an ellipse seen
// from a little above, so the person at the back is smaller than the one in
// front. In stage pixels. Also where the potato goes, and where a speech
// bubble or the grown unlucky person fits, so the potato and the names stay
// in view below the caption.

import { STAGE, stagePx } from '../../scenario-kit';

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

/** Someone who is out of play: a little smaller, in the same place. */
export function outOfPlay(spot: Spot): Spot {
  const size = spot.size * 0.88;
  return { x: spot.x, y: spot.y, size, tag: tagFor(size) };
}

/** A held potato that would reach the sky goes beside the head instead: all the way once this much lower, this far past the head's side. */
const BESIDE = { lower: 55, gap: 45 };

/** The highest the centre of a potato drawn at `scale` may go without reaching the sky. */
export function highest(scale: number): number {
  return SKY + scale * (POTATO.height / 2 + POTATO.above);
}

/**
 * Where a potato drawn at `scale` is held: 35 px over the head; where that
 * would reach the sky, lower and beside the head, towards the stage's middle.
 */
export function held(spot: Spot, scale = 1): Point {
  const over = spot.y - 0.8 * spot.size - 35;
  const lower = Math.max(0, highest(scale) - over);
  const side = spot.x > STAGE.width / 2 ? -1 : 1;
  const aside = Math.min(1, lower / BESIDE.lower) * (spot.size / 2 + BESIDE.gap);
  return { x: spot.x + side * aside, y: over + lower };
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
/** How far the boomerang swings out towards the middle of the ring, and how high. */
const BOOMERANG = { reach: 420, rise: 300 };
/** The middle of the ring, for which way the boomerang swings. */
const MIDDLE = { x: 640, y: 450 };

type Path = [Point, Point, Point, Point];

/**
 * A throw from `from` to `to` as a cubic Bézier curve: an arc over the ring,
 * or, when they're the same, the boomerang's loop out towards the middle and
 * back. Flattened just enough that a potato drawn at `scale` stays out of the sky.
 */
export function throwPath(from: Point, to: Point, scale: number): Path {
  let c1: Point;
  let c2: Point;
  if (from.x === to.x && from.y === to.y) {
    const dx = MIDDLE.x - from.x;
    const dy = MIDDLE.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const reach = { x: (BOOMERANG.reach * dx) / length, y: (BOOMERANG.reach * dy) / length };
    c1 = { x: from.x + reach.x, y: from.y + reach.y - BOOMERANG.rise };
    c2 = { x: from.x + reach.x, y: from.y + reach.y + BOOMERANG.rise / 3 };
  } else {
    const top =
      Math.min(from.y, to.y) - ARC.rise - ARC.share * Math.hypot(to.x - from.x, to.y - from.y);
    c1 = { x: from.x, y: top };
    c2 = { x: to.x, y: top };
  }
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

/** How much bigger the unlucky person stands at the pop. */
export const CROWNED = 1.3;
/** How close to the stage's edge a grown name tag or a speech bubble may come. */
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

/**
 * A speech bubble's box when the kit anchors it at `anchor`, estimated from
 * its text: the speech sits 22 px over the anchor in the caption's font,
 * padded 22 by 6 inside a 4 px line, its tail down to the anchor. A tenth
 * more all round for its tilt and popIn's overshoot.
 */
export function speechBox(text: string, anchor: Point): Box {
  const font = stagePx('--size-stage-caption');
  const width = 1.1 * (0.62 * font * [...text].length + 2 * (22 + 4));
  const height = 1.1 * (22 + 1.1 * font + 2 * (6 + 4));
  return {
    left: anchor.x - width / 2,
    right: anchor.x + width / 2,
    top: anchor.y - height,
    bottom: anchor.y,
  };
}

/** The gap between a speech bubble and what it sits beside. */
const SPEECH_GAP = 12;

/**
 * Where to anchor a speech bubble saying `text`: level with `beside` and
 * next to it on the side towards the stage's middle, or the other side when
 * that has no room; clear of `beside` and everything in `avoid`, inside the stage.
 */
export function speechAt(text: string, beside: Box, avoid: readonly Box[] = []): Point {
  const size = speechBox(text, { x: 0, y: 0 });
  const half = size.right;
  const height = -size.top;
  const level = (beside.top + beside.bottom) / 2 + height / 2;
  const y = Math.min(STAGE.height - EDGE, Math.max(height + EDGE, level));
  const towards = (beside.left + beside.right) / 2 > STAGE.width / 2 ? -1 : 1;
  const inTheWay = [beside, ...avoid];
  for (const side of [towards, -towards]) {
    const past = (box: Box) =>
      side > 0 ? box.right + SPEECH_GAP + half : box.left - SPEECH_GAP - half;
    let x = past(beside);
    for (let moved = true; moved;) {
      const blocking = inTheWay.find((box) => overlap(speechBox(text, { x, y }), box));
      moved = blocking !== undefined;
      if (blocking) x = past(blocking);
    }
    if (x - half >= EDGE && x + half <= STAGE.width - EDGE) return { x, y };
  }
  // Neither side has room: over it instead.
  const x = (beside.left + beside.right) / 2;
  return { x: Math.min(STAGE.width - EDGE - half, Math.max(EDGE + half, x)), y: beside.top };
}
