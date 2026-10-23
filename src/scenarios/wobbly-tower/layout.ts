// Where everyone stands, where the tower is and how it bends, where the
// fallen blocks lie, and where the pointer stops. Those at risk stand either
// side of the tower, drawn big; whoever goes safe hops up to the Safe bench
// along the top of the stage. In stage pixels (1280 × 720), from the
// handover's storyboard.

import { STAGE, stagePx } from '../../scenario-kit';
import type { Lean, Plan, Side } from './plan';

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
  /** With 7 or more at risk, the back row stands further up the grass; otherwise everyone is in the front row. */
  readonly row: 'back' | 'front';
}

/** The tower stands on this y, the top of its plinth, centred on this x. */
export const TOWER = { x: STAGE.width / 2, base: 650 } as const;

/** Every block is this high, unless the tower would grow too tall. */
export const BLOCK_HEIGHT = 40;

/** How high each block is in a show that builds `total` blocks: the tower stays 360 px or lower. */
export function blockHeight(total: number): number {
  return Math.min(BLOCK_HEIGHT, 360 / total);
}

/** Block widths from the bottom up. */
export const BLOCK_WIDTHS = [200, 184, 150, 170, 124, 164, 140, 112, 156, 132, 150, 128] as const;

/** How far each block sits off the tower's middle line, in pixels: fixed, not random. */
const NUDGE = [3, -4, 5, -6, 4, -3, 6, -5, 3, -4, 5, -3] as const;

/** Space kept between a name tag and its nearest neighbour in the row. */
const TAG_GAP = 12;
/** Space kept between a name tag and the furthest the tower reaches beside it. */
const TOWER_GAP = 4;
/** The most the tower leans before it falls: Nearly's lean. */
const LEAN_BEFORE_FALL = 11;

/** The plinth under the tower, with the count of who is still at risk. */
export const PLINTH: Box = { left: 470, top: 650, right: 810, bottom: 706 };
/** The caption sticker's bottom edge: the bench's heads and tags stay below it. */
export const CAPTION_BOTTOM = 112;

interface Stand {
  readonly x: number;
  readonly y: number;
  readonly row: Spot['row'];
}

type Range = readonly [outer: number, inner: number];

/**
 * Where people at risk stand, by how many are at risk: up to 6 in one row,
 * from 7 in two, alternating along each side from the inner end, which is in
 * the back row (so the front row's tags stay clear of the plinth). The front
 * row stands far enough below the back row that the pointer over a front head
 * clears the back row's tags, and the back row far enough below the bench that
 * the pointer over a back head clears the bench's tags.
 */
const AT_RISK = {
  few: { head: 120, y: 450, left: [260, 420] as Range, right: [1020, 860] as Range },
  some: { head: 120, y: 450, left: [90, 420] as Range, right: [1190, 860] as Range },
  many: {
    head: 100,
    back: 390,
    front: 615,
    left: [60, 440] as Range,
    right: [1220, 840] as Range,
    frontInner: { left: 360, right: 920 },
  },
};

/** `people` x positions spread evenly from `outer` to `inner`; one stands in the middle. */
function spread([outer, inner]: Range, people: number): number[] {
  return Array.from({ length: people }, (_, k) =>
    Math.round(people === 1 ? (outer + inner) / 2 : outer + ((inner - outer) * k) / (people - 1)),
  );
}

/** Every pose the tower can take before it falls: any height, any lean up to Nearly's. */
let poses: Box[] | undefined;
const towerPoses = (): Box[] =>
  (poses ??= Array.from({ length: 12 }, (_, index) => index + 4).flatMap((total) =>
    Array.from({ length: total }, (_, index) => index + 1).flatMap((count) =>
      Array.from({ length: 2 * LEAN_BEFORE_FALL + 1 }, (_, index) =>
        tower(count, index - LEAN_BEFORE_FALL, blockHeight(total)).map(blockBox),
      ).flat(),
    ),
  ));

/** How far the tower, in any pose before the fall, or its plinth reaches to each side between `top` and `bottom`. */
function reach(top: number, bottom: number): { left: number; right: number } {
  let left = TOWER.x;
  let right = TOWER.x;
  for (const box of towerPoses()) {
    if (box.top >= bottom || box.bottom <= top) continue;
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
  }
  if (PLINTH.top < bottom && PLINTH.bottom > top) {
    left = Math.min(left, PLINTH.left);
    right = Math.max(right, PLINTH.right);
  }
  return { left, right };
}

/** A name tag's height on someone `size` tall with a tag set at `tag`, and its top. */
const tagBand = (y: number, size: number, tag: number) => {
  const top = y - 0.04 * size;
  return { top, bottom: top + 2.4 * tag + 8 };
};

/** With 2 people, each stands at the outer end of their side, their tag up to this wide. */
const TWO_WIDE = 500;

/** riskSpots, worked out once for each count and rows: the show asks for them every frame. */
const placed = new Map<string, Spot[]>();

/** The rows `count` people at risk start in: alternating along each side from the inner end, in the back row. */
export function startingRows(count: number): Spot['row'][] {
  const left = Math.ceil(count / 2);
  const side = (people: number) =>
    Array.from({ length: people }, (_, k): Spot['row'] =>
      count >= 7 && (people - 1 - k) % 2 !== 0 ? 'front' : 'back',
    );
  // Left to right: the left side from its outer end, the right from its inner end.
  return count >= 7 ? [...side(left), ...side(count - left).reverse()] : Array(count).fill('front');
}

/**
 * Where `count` people at risk stand, left to right around the tower, in a
 * show of `people`: `ceil(count / 2)` on the left, spread evenly from the
 * outer end of their side to the inner. Heads are 120 with 6 or fewer at risk
 * and 100 from 7; tags 0.3 of the head, 44 with 2 people, who stand at the
 * outer ends with tags up to TWO_WIDE wide. From 7, `rows`
 * says who stands in which row (`startingRows` unless given: people keep
 * their row while it lasts, so nobody crosses a neighbour's path); a side
 * whose innermost person is in the front row ends further out, clear of the
 * plinth. A tag is at most max(198, 2.2 heads) wide, and narrower where the
 * nearest person in its row (in either row with 8 or fewer, who may next
 * stand in one; less TAG_GAP), the stage's edge, or the tower in
 * any pose before the fall and the plinth leave less room.
 */
export function riskSpots(
  count: number,
  people: number,
  rows: readonly Spot['row'][] = startingRows(count),
): Spot[] {
  const key = `${count}/${people}/${count >= 7 ? rows.join() : ''}`;
  const known = placed.get(key);
  if (known) return known;
  const left = Math.ceil(count / 2);
  const few = count <= 3 ? AT_RISK.few : AT_RISK.some;
  const layout = count >= 7 ? AT_RISK.many : few;
  const head = layout.head;
  const tag = people === 2 ? 44 : Math.max(22, Math.round(0.3 * head));
  const side = (from: number, to: number, range: Range, frontInner: number): Stand[] => {
    const own = rows.slice(from, to);
    // The innermost is the last on the left and the first on the right.
    const inner = range[0] < range[1] ? own.at(-1) : own[0];
    const reach: Range =
      people === 2
        ? [range[0], range[0]]
        : count >= 7 && inner === 'front'
          ? [range[0], frontInner]
          : range;
    const xs = spread(reach, own.length).sort((a, b) => a - b);
    return xs.map((x, k) => {
      if (count < 7) return { x, y: AT_RISK.some.y, row: 'front' as const };
      const row = own[k]!;
      return { x, y: row === 'back' ? AT_RISK.many.back : AT_RISK.many.front, row };
    });
  };
  const stands = [
    ...side(0, left, layout.left, AT_RISK.many.frontInner.left),
    ...side(left, count, layout.right, AT_RISK.many.frontInner.right),
  ];
  const all = stands.map((stand, index) => {
    const band = tagBand(stand.y, head, tag);
    const tower = reach(band.top, band.bottom);
    const toTower =
      stand.x < TOWER.x ? tower.left - TOWER_GAP - stand.x : stand.x - tower.right - TOWER_GAP;
    // With 8 or fewer, the two rows may next become one: neighbours in both rows count.
    const gaps = stands
      .filter((other, at) => at !== index && (other.y === stand.y || count <= 8))
      .map((other) => Math.abs(other.x - stand.x) - TAG_GAP);
    const edge = Math.min(stand.x, STAGE.width - stand.x);
    const room = Math.min(2 * edge, 2 * toTower, ...gaps);
    return {
      ...stand,
      size: head,
      tag: {
        size: tag,
        maxWidth: Math.floor(
          Math.min(people === 2 ? TWO_WIDE : Math.max(198, Math.round(2.2 * head)), room),
        ),
      },
    };
  });
  placed.set(key, all);
  return all;
}

/** The Safe bench: its plank's top and left end, and where the heads sit. */
export const BENCH = {
  plank: 250,
  from: 230,
  head: 76,
  headTop: 122,
  first: 250,
  apart: 125,
  span: 870,
  tagGap: 8,
  edge: 16,
} as const;

/** Space between the plank's ends and the first and last person on it. */
const PLANK_END = { left: 20, right: 60 };

/** The name tag of everyone on a bench of `benched`: 0.3 of the head, and the slot gap less 8 wide. */
export function benchTag(benched: number): Spot['tag'] {
  const apart = benched <= 1 ? BENCH.apart : Math.min(BENCH.apart, BENCH.span / (benched - 1));
  return {
    size: Math.max(22, Math.round(0.3 * BENCH.head)),
    maxWidth: Math.floor(apart - BENCH.tagGap),
  };
}

/** Where everyone on a bench sits, left to right, for tags `widths` wide as drawn (benchTag's). */
function benchXs(widths: readonly number[]): number[] {
  const benched = widths.length;
  const apart = benched <= 1 ? BENCH.apart : Math.min(BENCH.apart, BENCH.span / (benched - 1));
  const xs: number[] = [BENCH.first];
  for (let slot = 1; slot < benched; slot++) {
    const touching = (widths[slot - 1]! + widths[slot]!) / 2 + BENCH.tagGap;
    xs.push(xs[slot - 1]! + Math.max(apart, touching));
  }
  // A bench too long for the stage moves left as a whole.
  const over = xs.at(-1)! + widths.at(-1)! / 2 - (STAGE.width - BENCH.edge);
  return over > 0 ? xs.map((x) => x - over) : xs;
}

/**
 * Slot `slot` of the Safe bench, whose tags are `widths` wide as drawn (one
 * for each person it benches, in the order they go safe): slots fill left to
 * right from x 250, at least min(125, 870 / (benched − 1)) apart and further
 * where two tags would come closer than 8; a bench that would run off the
 * stage moves left.
 */
export function benchSpot(slot: number, widths: readonly number[]): Spot {
  const size = BENCH.head;
  return {
    x: benchXs(widths)[slot]!,
    y: BENCH.headTop + 0.8 * size,
    size,
    tag: benchTag(widths.length),
    row: 'back',
  };
}

/** The bench's plank, from its left end to 60 past the last person on it. */
export function plank(widths: readonly number[]): { left: number; right: number; top: number } {
  const xs = widths.length > 0 ? benchXs(widths) : [BENCH.first];
  return {
    left: Math.min(BENCH.from, xs[0]! - PLANK_END.left),
    right: xs.at(-1)! + PLANK_END.right,
    top: BENCH.plank,
  };
}

/** A spot `t` (0…1) of the way from `a` to `b`: place and sizes move together. */
export function between(a: Spot, b: Spot, t: number): Spot {
  const mix = (from: number, to: number) => from + (to - from) * t;
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    size: mix(a.size, b.size),
    tag: { size: mix(a.tag.size, b.tag.size), maxWidth: mix(a.tag.maxWidth, b.tag.maxWidth) },
    row: t < 0.5 ? a.row : b.row,
  };
}

/** Seconds the hop to the bench takes, and the gap closing with it. */
export const HOP = 0.6;
/** How far the hop to the bench arcs above the higher of its two ends. */
const HOP_ARC = 80;
const inOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

/**
 * Where everyone is over the show, from `plan`: at risk around the tower,
 * then, from their `Safe!`, hopping up to their slot on the bench (in an arc,
 * or a straight slide with `calm`) while those still at risk close the gap,
 * keeping their order. `widths` are the bench tags' widths as drawn, in the
 * order people go safe.
 */
export function placings(plan: Plan, widths: readonly number[] = [], calm = false) {
  const people = plan.order.length;
  const safeAt = new Map(
    plan.turns.filter((turn) => turn.safe !== null).map((turn) => [turn.by, turn.safe!]),
  );
  const benching = [...safeAt.keys()];
  const benchSpots = benching.map((_, slot) => benchSpot(slot, widths));
  const moves = [...new Set(safeAt.values())].sort((a, b) => a - b);
  // A moment comes in the frame it falls in, however its time is rounded.
  const safeBy = (name: string, t: number) => (safeAt.get(name) ?? Infinity) <= t + 1e-9;
  /** Who is at risk at `t`, in standing order: everyone who hasn't said Safe! yet. */
  const atRisk = (t: number) => plan.order.filter((name) => !safeBy(name, t));
  // Everyone keeps the row they start in.
  const rowOf = new Map(plan.order.map((name, index) => [name, startingRows(people)[index]!]));
  const riskSpotOf = (name: string, t: number) => {
    const now = atRisk(t);
    const rows = now.map((each) => rowOf.get(each)!);
    return riskSpots(now.length, people, rows)[now.indexOf(name)]!;
  };
  return {
    atRisk,
    /** Whether `name` sits on the bench at `t`, the hop done. */
    benched: (name: string, t: number) => (safeAt.get(name) ?? Infinity) + HOP <= t + 1e-9,
    /** Whether `name` is on their way up to the bench at `t`. */
    hopping: (name: string, t: number) => {
      const safe = safeAt.get(name) ?? Infinity;
      return safe <= t + 1e-9 && t + 1e-9 < safe + HOP;
    },
    /** Where `name` is at `t`. */
    at(name: string, t: number): Spot {
      const move = moves.findLast((at) => at <= t + 1e-9 && t + 1e-9 < at + HOP);
      const safe = safeAt.get(name) ?? Infinity;
      if (safe + HOP <= t + 1e-9) return benchSpots[benching.indexOf(name)]!;
      if (move === undefined) return riskSpotOf(name, t);
      const u = inOut(Math.max(0, (t - move) / HOP));
      const from = riskSpotOf(name, move - 1e-6);
      if (safe === move) {
        const to = benchSpots[benching.indexOf(name)]!;
        const spot = between(from, to, u);
        if (calm) return spot;
        // An arc over the higher end: a point on a curve through its top.
        const top = Math.min(from.y, to.y) - HOP_ARC;
        const v = 1 - u;
        return { ...spot, y: v * v * from.y + 2 * v * u * top + u * u * to.y };
      }
      return between(from, riskSpotOf(name, move), u);
    },
  };
}

/** Where everyone is over a show: `placings`. */
export type Places = ReturnType<typeof placings>;

/** Which side of the stage a spot is on: -1 left, 1 right. */
export function sideOf(spot: Pick<Spot, 'x'>): -1 | 1 {
  return spot.x < STAGE.width / 2 ? -1 : 1;
}

/** -1 or 1 for a side, or for the side the named person stands on, as `where` says. */
export function towards(toward: Side, where: (name: string) => Spot): -1 | 1 {
  if (typeof toward === 'number') return toward === -1 ? -1 : 1;
  return sideOf(where(toward));
}

/** A lean's signed angle in degrees: positive leans to the right of the stage. */
export function signedLean(lean: Lean, where: (name: string) => Spot): number {
  return lean.degrees * towards(lean.toward, where);
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

/**
 * A name tag's box on the chest, two lines high (the kit never sets three).
 * `width` is the width the kit sets (`nameTag`'s style.maxWidth, which is
 * more than `spot.tag.maxWidth` for a name that can't fit two lines), and
 * `shift` what `tagShift` gives, moving the whole tag sideways.
 */
export function tagBox(spot: Spot, width = spot.tag.maxWidth, shift = 0): Box {
  const top = spot.y - 0.04 * spot.size;
  return {
    left: spot.x + shift - width / 2,
    right: spot.x + shift + width / 2,
    top,
    bottom: top + 2.4 * spot.tag.size + 8,
  };
}

/** Space kept between a shifted name tag and the stage's edge. */
const TAG_EDGE = 0;

/**
 * How far to move a name tag sideways, in pixels (positive to the right; 0
 * when not needed), so a tag `width` wide (what the kit sets, not always
 * `spot.tag.maxWidth`) stays fully on the stage.
 */
export function tagShift(spot: Spot, width: number): number {
  const left = spot.x - width / 2;
  const right = spot.x + width / 2;
  return Math.max(0, TAG_EDGE - left) + Math.min(0, STAGE.width - TAG_EDGE - right);
}

export function overlap(one: Box, two: Box): boolean {
  return (
    one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom
  );
}

/** A block of the tower, or one lying in the heap. */
export interface Block {
  /** Its centre. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Degrees, positive turning clockwise on the stage (the top to the right). */
  readonly turn: number;
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The tower's blocks, bottom to top, for `count` blocks `height` high
 * leaning `lean` degrees (positive to the right). Block k turns lean × (0.4 + 0.6 × (k + 1) /
 * count) and rests on the top edge of the one below; the bottom one turns
 * about the middle of its foot on the ground. So the top leans most.
 */
export function tower(count: number, lean: number, height = BLOCK_HEIGHT): Block[] {
  const blocks: Block[] = [];
  let foot: Point = { x: TOWER.x, y: TOWER.base };
  for (let k = 0; k < count; k++) {
    const turn = lean * (0.4 + (0.6 * (k + 1)) / count);
    const a = rad(turn);
    const nudge = NUDGE[k % NUDGE.length]!;
    const x = foot.x + nudge * Math.cos(a) + (height / 2) * Math.sin(a);
    const y = foot.y + nudge * Math.sin(a) - (height / 2) * Math.cos(a);
    blocks.push({ x, y, width: BLOCK_WIDTHS[k % BLOCK_WIDTHS.length]!, height, turn });
    foot = { x: x + (height / 2) * Math.sin(a), y: y - (height / 2) * Math.cos(a) };
  }
  return blocks;
}

/** The smallest axis-aligned box around a block, turned. */
export function blockBox(block: Block): Box {
  const a = rad(block.turn);
  const w = (Math.abs(Math.cos(a)) * block.width + Math.abs(Math.sin(a)) * block.height) / 2;
  const h = (Math.abs(Math.sin(a)) * block.width + Math.abs(Math.cos(a)) * block.height) / 2;
  return { left: block.x - w, right: block.x + w, top: block.y - h, bottom: block.y + h };
}

/** Whether a turned block and an upright box overlap (separating axes, so a corner clipping the air doesn't count). */
export function blockOverlaps(block: Block, box: Box): boolean {
  const a = rad(block.turn);
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.cos(a), y: Math.sin(a) },
    { x: -Math.sin(a), y: Math.cos(a) },
  ];
  const corners = (points: Point[], axis: Point) => {
    const along = points.map((p) => p.x * axis.x + p.y * axis.y);
    return [Math.min(...along), Math.max(...along)] as const;
  };
  const hw = block.width / 2;
  const hh = block.height / 2;
  const turned = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => ({
    x: block.x + x! * Math.cos(a) - y! * Math.sin(a),
    y: block.y + x! * Math.sin(a) + y! * Math.cos(a),
  }));
  const upright = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
  return axes.every((axis) => {
    const [aLow, aHigh] = corners(turned, axis);
    const [bLow, bHigh] = corners(upright, axis);
    return aLow < bHigh && bLow < aHigh;
  });
}

/**
 * The heap's band: below the heads of the 2 or 3 still at risk when it falls
 * (they end at 474), and above the plinth; and how far from the tower's
 * middle the blocks lie. A block turned by at most 6° on one of the two rows
 * stays inside the band.
 */
export const HEAP_BAND = { top: 492, bottom: 564 } as const;
const HEAP = { near: 100, far: 330, apart: 10, rows: [524, 532], turns: [3, 5, 6, 4] } as const;

/**
 * Where `count` fallen blocks, `height` high, come to rest on the unlucky person's side,
 * between the tower and them: in HEAP_BAND, so clear of every head (the name
 * tags are drawn over it). Block k of
 * the tower lies at place k; the higher blocks fly further out.
 */
export function heap(unlucky: Spot, count: number, height = BLOCK_HEIGHT): Block[] {
  const side = sideOf(unlucky);
  const head = headBox(unlucky);
  // A head that reaches into the band (2 people's, 200 wide) stops the heap short of it.
  const reaches = head.bottom > HEAP_BAND.top && head.top < HEAP_BAND.bottom;
  const limit = Math.abs(unlucky.x - TOWER.x) - unlucky.size / 2 - HEAP.apart;
  return Array.from({ length: count }, (_, k) => {
    const share = count === 1 ? 0 : k / (count - 1);
    const block: Block = {
      x: 0,
      y: HEAP.rows[k % HEAP.rows.length]!,
      width: BLOCK_WIDTHS[k % BLOCK_WIDTHS.length]!,
      height,
      turn: HEAP.turns[k % HEAP.turns.length]! * (k % 2 === 0 ? 1 : -1),
    };
    const half = (blockBox(block).right - blockBox(block).left) / 2;
    const out = HEAP.near + share * (HEAP.far - HEAP.near);
    return { ...block, x: TOWER.x + side * (reaches ? Math.min(out, limit - half) : out) };
  });
}

/** The gap between a head and the block held over it, on the raised hands. */
const HANDS = 14;
/** The pointer's tip sits this far above the head or the held block. */
const TIP_GAP = 10;

/** The block held over `spot`'s head: 0.96 × the head wide, on the raised hands. */
export function heldBlock(spot: Spot): Block {
  const width = 0.96 * spot.size;
  const height = 0.4 * width;
  const bottom = spot.y - 0.8 * spot.size - HANDS;
  return { x: spot.x, y: bottom - height / 2, width, height, turn: 0 };
}

/** Where the pointer's tip stops over `spot`: 10 px above the head, or above the block held over it. */
export function pointerTip(spot: Spot, holding = false): Point {
  const top = holding ? blockBox(heldBlock(spot)).top : spot.y - 0.8 * spot.size;
  return { x: spot.x, y: top - TIP_GAP };
}

/**
 * A name tag's width in stage pixels as the kit sets it, estimated where
 * nothing can measure it: a single line is as wide as its name (0.6 em a
 * character, as the kit counts without a canvas), the padding and the
 * borders, and never wider than `set`, the width `nameTag` sets in
 * style.maxWidth; two lines take all of `set`. In a browser, the tag's
 * measured width replaces it.
 */
export function tagContentWidth(name: string, size: number, set: number, lines: 1 | 2): number {
  if (lines === 2) return set;
  const letters = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(name)].length;
  const own = letters * 0.6 * size + 0.6 * size + 2 * stagePx('--line') + 2;
  return Math.min(set, Math.ceil(own));
}

/** The middle of a block's top edge. */
export function topOf(block: Block): Point {
  const a = (block.turn * Math.PI) / 180;
  return {
    x: block.x + (block.height / 2) * Math.sin(a),
    y: block.y - (block.height / 2) * Math.cos(a),
  };
}
