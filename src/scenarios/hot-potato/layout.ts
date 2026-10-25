// Where everyone stands in the ring, from the storyboard: an ellipse seen
// from a little above, so the person at the back is smaller than the one in
// front. In stage pixels. Also where the potato goes, and where the grown
// unlucky person fits, so the potato and the names stay in view below the
// caption.

import { speechBox, STAGE } from '../../scenario-kit';

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
 * far its drawing reaches above that box: the spark's rays at full length
 * (parts.ts).
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

/**
 * The ring's shape: heads grow as fewer people stand in it, from 8 down,
 * and shrink from 8 up to 64 and 92 at 12.
 */
const shape = (count: number): Shape => {
  if (count <= 8) {
    const f = 1 + 0.05 * (8 - count);
    return { cx: 640, cy: 450, rx: 470, ry: 190, back: 96 * f, front: 128 * f };
  }
  const t = Math.min(1, (count - 8) / 4);
  const mix = (at8: number, at12: number) => at8 + t * (at12 - at8);
  return {
    cx: 640,
    cy: mix(450, 440),
    rx: mix(470, 540),
    ry: mix(190, 215),
    back: mix(96, 64),
    front: mix(128, 92),
  };
};

/**
 * Half a step round the ring at 6 and 10 people: with an even count, so
 * someone stands at each side of the ring and no two neighbours stand one
 * right above the other, where the potato held by the lower one would hide
 * the upper one's name.
 */
const turn = (count: number) => (count % 4 === 2 ? 0.5 : 0);

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
    const a = (2 * Math.PI * (k + turn(count))) / count;
    const x = Math.round(cx + rx * Math.sin(a));
    const y = Math.round(cy - ry * Math.cos(a));
    const size = Math.round(back + ((y - (cy - ry)) / (2 * ry)) * (front - back));
    return { x, y, size, tag: tagFor(size) };
  });
}

/** How much bigger the last three stand, name tags and all. */
export const GROWN = 1.2;

/** Someone of the last three: GROWN times their size, about where they stand. */
export function grown(spot: Spot): Spot {
  return {
    ...spot,
    size: GROWN * spot.size,
    tag: { size: GROWN * spot.tag.size, maxWidth: GROWN * spot.tag.maxWidth },
  };
}

/** Sitting down, the head shrinks to `scale` and drops `drop` of its size towards the name tag. */
export const SITTING = { scale: 0.72, drop: 0.12 } as const;

/**
 * Someone sitting down, as far as their head goes: SITTING.scale times their
 * size, dropped SITTING.drop of it. Their name tag stays where it was, as
 * big: take it from the spot they stand on.
 */
export function seated(spot: Spot): Spot {
  return { ...spot, size: SITTING.scale * spot.size, y: spot.y + SITTING.drop * spot.size };
}

/** Someone sitting down: their head's box. */
export function sittingHead(spot: Spot): Box {
  return headBox(seated(spot));
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
 * Beside the face on `side` (1 right, −1 left), at about its height, below
 * the sky and above the name tag; where the sky leaves no room above the
 * name, out past the name's end.
 */
function beside(spot: Spot, side: number, scale: number): Point {
  const { x, y, r } = face(spot);
  const name = nameBox(spot);
  const half = (scale * POTATO.width) / 2;
  const at = Math.max(
    highest(scale),
    Math.min(y, name.top - HOLD_GAP - (scale * POTATO.height) / 2),
  );
  const clear = at + (scale * POTATO.height) / 2 <= name.top;
  const out = clear ? r : Math.max(r, (name.right - name.left) / 2);
  return { x: x + side * (out + HOLD_GAP + half), y: at };
}

/**
 * Where a potato drawn at `scale` is held: just over the face; where that
 * would reach the sky or cover a name in `avoid`, beside the face, towards
 * the stage's middle first. Over the face if nowhere is clear and over it
 * stays out of the sky.
 */
export function held(spot: Spot, scale = 1, avoid: readonly Box[] = []): Point {
  const { x, y, r } = face(spot);
  const over = { x, y: y - r - HOLD_GAP - (scale * POTATO.height) / 2 };
  const inward = x > STAGE.width / 2 ? -1 : 1;
  const clear = (point: Point) => {
    const box = potatoBox(point, scale);
    return (
      point.y >= highest(scale) &&
      box.left >= 0 &&
      box.right <= STAGE.width &&
      !avoid.some((name) => overlap(box, name))
    );
  };
  const choices = [over, beside(spot, inward, scale), beside(spot, -inward, scale)];
  return choices.find(clear) ?? (over.y >= highest(scale) ? over : choices[1]!);
}

/** How far a held-out potato rises at a time to clear a name. */
const RISE_STEP = 5;

/**
 * Holding on: the potato held out beside the face, on the side of `towards`,
 * at about the face's height, raised up that side as far as it takes to
 * clear the names in `avoid`. Never over the head, where it would cover the
 * face and the name above.
 */
export function heldOut(spot: Spot, towards: Point, scale = 1, avoid: readonly Box[] = []): Point {
  const { x } = face(spot);
  const side = towards.x === x ? (x > STAGE.width / 2 ? -1 : 1) : Math.sign(towards.x - x);
  const level = beside(spot, side, scale);
  for (let y = level.y; y >= highest(scale); y -= RISE_STEP) {
    const box = potatoBox({ x: level.x, y }, scale);
    if (!avoid.some((name) => overlap(box, name))) return { x: level.x, y };
  }
  return level;
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

/** The longest name the layout is planned for. */
const LONGEST = 15;

/** The smallest a name tag is set (--size-stage-tag-min), and roughly how wide a character is, in ems. */
const TAG_MIN = 22;
const EM_PER_CHARACTER = 0.6;

/**
 * The part of a name tag a name of up to LONGEST characters covers. Like
 * nameTag, a name too long for one line shrinks first, down to TAG_MIN, and
 * only then takes two lines. tagBox reaches as far as the longest name
 * allowed could.
 */
export function nameBox(spot: Spot): Box {
  const top = spot.y - 0.04 * spot.size;
  const padding = 24;
  const width = (size: number) => EM_PER_CHARACTER * LONGEST * size + padding;
  const { maxWidth } = spot.tag;
  const fits = (maxWidth - padding) / (EM_PER_CHARACTER * LONGEST);
  const size = width(spot.tag.size) <= maxWidth ? spot.tag.size : Math.max(TAG_MIN, fits);
  const lines = width(size) <= maxWidth ? 1 : 2;
  const half = Math.min(width(size), maxWidth) / 2;
  return {
    left: spot.x - half,
    right: spot.x + half,
    top,
    bottom: top + 1.2 * lines * size + 8,
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

/** How far the hang's top moves along at a time to clear a face or a name. */
const HANG_STEP = 5;

/**
 * The hang-time throw: up to a top between the pair, high under the sky,
 * then down onto `to`. Level at the top, and never higher than it. The top
 * is halfway between them, or the nearest point to that, at most half a
 * potato past either and up to the sky, that keeps the potato off
 * everything in `avoid`, such as their faces and names.
 */
export function hang(
  from: Point,
  to: Point,
  pair: readonly [Point, Point],
  scale: number,
  avoid: readonly Box[] = [],
): { rise: Path; top: Point; drop: Path } {
  const level = Math.min(highest(scale) + HANG_BELOW, pair[0].y, pair[1].y);
  const middle = (pair[0].x + pair[1].x) / 2;
  const reach = Math.abs(pair[0].x - pair[1].x) / 2 + (scale * POTATO.width) / 2;
  const clear = (point: Point) => !avoid.some((box) => overlap(potatoBox(point, scale), box));
  let top = { x: middle, y: level };
  search: for (let y = level; y >= Math.min(level, highest(scale)); y -= HANG_STEP) {
    for (let away = 0; away <= reach; away += HANG_STEP) {
      const found = [middle + away, middle - away].map((x) => ({ x, y })).find(clear);
      if (found) {
        top = found;
        break search;
      }
    }
  }
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

/** The band at the top of the stage where the caption goes up. */
export const CAPTION: Box = { left: 0, right: STAGE.width, top: 0, bottom: SKY };

/**
 * How far from a head a bubble beside it may sit, the gap it keeps from the
 * head and the name tag, how close it may come to the stage's edge, and the
 * step to look for room in.
 */
const BESIDE = { reach: 48, gap: 6, edge: 8, step: 4 } as const;

/** How far apart two boxes are: 0 when they touch or overlap. */
export const apart = (one: Box, two: Box) =>
  Math.hypot(
    Math.max(0, one.left - two.right, two.left - one.right),
    Math.max(0, one.top - two.bottom, two.top - one.bottom),
  );

/**
 * Where to anchor a bubble saying `text` beside `head`, whose name tag is
 * `tag`: within BESIDE.reach of the head, on the stage, clear of the head,
 * everything in `keepOff` and the caption. Off everything in `avoid` where
 * there's room; then as near the head as it goes and as level with it as
 * the tag below allows. Null when there's no room within reach. The tag is
 * wider than the head, so a bubble level with the head runs into it.
 */
export function besideHead(
  text: string,
  head: Box,
  tag: Box,
  avoid: readonly Box[],
  keepOff: readonly Box[],
): Point | null {
  const { reach, gap, edge, step } = BESIDE;
  const size = speechBox(text, { x: 0, y: 0 });
  const level = Math.min((head.top + head.bottom - size.top) / 2, tag.top - gap);
  const firm = [
    {
      left: head.left - gap,
      right: head.right + gap,
      top: head.top - gap,
      bottom: head.bottom + gap,
    },
    ...keepOff,
    CAPTION,
  ];
  let best: Point | null = null;
  let least = Infinity;
  for (let x = head.left - reach - size.right; x <= head.right + reach + size.right; x += step) {
    for (let y = head.top - reach; y <= head.bottom + reach - size.top; y += step) {
      const box = shift(size, x, y);
      const onStage =
        box.left >= edge &&
        box.right <= STAGE.width - edge &&
        box.top >= edge &&
        box.bottom <= STAGE.height - edge;
      const away = apart(box, head);
      if (!onStage || away > reach || firm.some((each) => overlap(box, each))) continue;
      // Any spot off the names beats one on them.
      const score =
        away +
        Math.abs(y - level) / 2 +
        (avoid.some((each) => overlap(box, each)) ? STAGE.width : 0);
      if (score < least) {
        least = score;
        best = { x, y };
      }
    }
  }
  return best;
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
  const tag = grow(nameBox(spot));
  const x = Math.max(0, EDGE - tag.left) + Math.min(0, STAGE.width - EDGE - tag.right);
  const y = Math.min(0, STAGE.height - EDGE - tag.bottom);
  const head = grow(headBox(spot));
  const crown = 0.1 * (head.bottom - head.top);
  return { x, y, head: shift({ ...head, top: head.top - crown }, x, y), tag: shift(tag, x, y) };
}
