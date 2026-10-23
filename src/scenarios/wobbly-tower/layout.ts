// Where everyone stands, where the tower is and how it bends, where the
// fallen blocks lie, and where the pointer stops: two rows seen from a little
// above, the back row drawn behind the tower and the front row in front of it.
// In stage pixels (1280 × 720), from the handover's storyboard.

import { STAGE, stagePx } from '../../scenario-kit';
import type { Lean, Side } from './plan';

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
  /** The back row is drawn behind the tower, the front row in front of it. */
  readonly row: 'back' | 'front';
}

/** The tower stands on this y, centred on this x. */
export const TOWER = { x: STAGE.width / 2, base: 610 } as const;

/** Every block is this high. */
export const BLOCK_HEIGHT = 40;

/** Block widths from the bottom up. */
export const BLOCK_WIDTHS = [200, 184, 150, 170, 124, 164, 140, 112, 156, 132, 150, 128] as const;

/** How far each block sits off the tower's middle line, in pixels: fixed, not random. */
const NUDGE = [3, -4, 5, -6, 4, -3, 6, -5, 3, -4, 5, -3] as const;

/** Space kept between a name tag and its nearest neighbour in the row. */
const TAG_GAP = 12;

/**
 * A name tag is set at 0.22 of the head's size, never under 22. It is at most
 * max(198, 2.2 heads) wide, and narrower where `room` (the width it may take,
 * centred on the person) is less: the handover's twelve people stand closer
 * together than two such tags are wide. `spots` gives it the gap to the
 * nearest person in the row less TAG_GAP, and the room the stage's edges leave.
 */
export function tagFor(size: number, room = Infinity): Spot['tag'] {
  return {
    size: Math.max(22, Math.round(0.22 * size)),
    maxWidth: Math.floor(Math.min(Math.max(198, Math.round(2.2 * size)), room)),
  };
}

interface Stand {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly row: Spot['row'];
}

/** The handover's spots at 2, 8 and 12, as written. */
const EXACT: Readonly<Record<number, readonly Stand[]>> = {
  2: [
    { x: 260, y: 640, size: 200, row: 'front' },
    { x: 1020, y: 640, size: 200, row: 'front' },
  ],
  8: [
    ...[130, 340, 940, 1150].map((x) => ({ x, y: 430, size: 80, row: 'back' as const })),
    ...[150, 400, 880, 1130].map((x) => ({ x, y: 650, size: 104, row: 'front' as const })),
  ],
  12: [
    ...[90, 260, 430, 850, 1020, 1190].map((x) => ({
      x,
      y: 430,
      size: 66,
      row: 'back' as const,
    })),
    ...[115, 300, 480, 800, 990, 1170].map((x) => ({
      x,
      y: 650,
      size: 92,
      row: 'front' as const,
    })),
  ],
};

type Range = readonly [number, number];

/** The x range each side of each row uses at 8 and at 12: outermost to innermost person. */
const RANGES: Record<Spot['row'], Record<'left' | 'right', readonly [Range, Range]>> = {
  back: {
    left: [
      [130, 340],
      [90, 430],
    ],
    right: [
      [1150, 940],
      [1190, 850],
    ],
  },
  front: {
    left: [
      [150, 400],
      [115, 480],
    ],
    right: [
      [1130, 880],
      [1170, 800],
    ],
  },
};

/** A row of `count` people split either side of the tower, evenly spread over their ranges. */
function row(kind: Spot['row'], count: number, t: number, y: number, size: number): Stand[] {
  const side = (people: number, [at8, at12]: readonly [Range, Range]) => {
    const from = at8[0] + t * (at12[0] - at8[0]);
    const to = at8[1] + t * (at12[1] - at8[1]);
    return Array.from({ length: people }, (_, k) =>
      Math.round(people === 1 ? (from + to) / 2 : from + ((to - from) * k) / (people - 1)),
    ).sort((a, b) => a - b);
  };
  const left = Math.ceil(count / 2);
  const xs = [...side(left, RANGES[kind].left), ...side(count - left, RANGES[kind].right)];
  return xs.map((x) => ({ x, y, size, row: kind }));
}

function stands(count: number): readonly Stand[] {
  const exact = EXACT[count];
  if (exact) return exact;
  // 3–7 use the sizes and ranges of 8; 9–11 go from 8 towards 12.
  const t = Math.max(0, Math.min(1, (count - 8) / 4));
  const mix = (at8: number, at12: number) => Math.round(at8 + t * (at12 - at8));
  const back = Math.floor(count / 2);
  return [
    ...row('back', back, t, 430, mix(80, 66)),
    ...row('front', count - back, t, 650, mix(104, 92)),
  ];
}

/**
 * The spots for `count` people: the back row left to right, then the front
 * row left to right. Tags are capped by the gap to the nearest person in the
 * same row (less TAG_GAP) and by the stage's edges.
 */
export function spots(count: number): Spot[] {
  const all = stands(count);
  return all.map((stand, index) => {
    const gaps = all
      .filter((other, at) => at !== index && other.y === stand.y)
      .map((other) => Math.abs(other.x - stand.x) - TAG_GAP);
    const edge = 2 * Math.min(stand.x, STAGE.width - stand.x);
    return { ...stand, tag: tagFor(stand.size, Math.min(edge, ...gaps)) };
  });
}

/** Which side of the stage a spot is on: -1 left, 1 right. */
export function sideOf(spot: Pick<Spot, 'x'>): -1 | 1 {
  return spot.x < STAGE.width / 2 ? -1 : 1;
}

/**
 * -1 or 1 for a side, or for the side the named person stands on; `order` is
 * the plan's standing order, whose places `spots` gives their spots.
 */
export function towards(toward: Side, order: readonly string[]): -1 | 1 {
  if (typeof toward === 'number') return toward === -1 ? -1 : 1;
  const index = order.indexOf(toward);
  if (index < 0) throw new Error(`${toward} is not in the order`);
  return sideOf(spots(order.length)[index]!);
}

/** A lean's signed angle in degrees: positive leans to the right of the stage. */
export function signedLean(lean: Lean, order: readonly string[]): number {
  return lean.degrees * towards(lean.toward, order);
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
 * `shift` what `placeTags` gives, moving the whole tag sideways.
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
 * The tower's blocks, bottom to top, for `count` blocks leaning `lean`
 * degrees (positive to the right). Block k turns lean × (0.4 + 0.6 × (k + 1) /
 * count) and rests on the top edge of the one below; the bottom one turns
 * about the middle of its foot on the ground. So the top leans most.
 */
export function tower(count: number, lean: number): Block[] {
  const blocks: Block[] = [];
  let foot: Point = { x: TOWER.x, y: TOWER.base };
  for (let k = 0; k < count; k++) {
    const turn = lean * (0.4 + (0.6 * (k + 1)) / count);
    const a = rad(turn);
    const nudge = NUDGE[k % NUDGE.length]!;
    const x = foot.x + nudge * Math.cos(a) + (BLOCK_HEIGHT / 2) * Math.sin(a);
    const y = foot.y + nudge * Math.sin(a) - (BLOCK_HEIGHT / 2) * Math.cos(a);
    blocks.push({
      x,
      y,
      width: BLOCK_WIDTHS[k % BLOCK_WIDTHS.length]!,
      height: BLOCK_HEIGHT,
      turn,
    });
    foot = { x: x + (BLOCK_HEIGHT / 2) * Math.sin(a), y: y - (BLOCK_HEIGHT / 2) * Math.cos(a) };
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
 * The heap's band: from below the back row's tags (at 8 they end at 488) to
 * above the front row's heads (at 8 they start at 567), which holds at every
 * head count; and how far from the tower's middle the blocks lie. A block
 * turned by at most 6° on one of the two rows stays inside the band.
 */
export const HEAP_BAND = { top: 492, bottom: 564 } as const;
const HEAP = { near: 100, far: 330, apart: 10, rows: [524, 532], turns: [3, 5, 6, 4] } as const;

/**
 * Where `count` fallen blocks come to rest on the unlucky person's side,
 * between the tower and them, on the grass behind the front row and in front
 * of the back row: in HEAP_BAND, so clear of every head and tag. Block k of
 * the tower lies at place k; the higher blocks fly further out.
 */
export function heap(unlucky: Spot, count: number): Block[] {
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
      height: BLOCK_HEIGHT,
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
 * style.maxWidth; two lines take all of `set`. In a browser, pass
 * `placeTags` the tag's measured width instead.
 */
export function tagContentWidth(name: string, size: number, set: number, lines: 1 | 2): number {
  if (lines === 2) return set;
  const letters = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(name)].length;
  const own = letters * 0.6 * size + 0.6 * size + 2 * stagePx('--line') + 2;
  return Math.min(set, Math.ceil(own));
}

/** Every position the tower's blocks can take: 9 to 11 blocks, leans -22…22. */
let envelope: Block[] | undefined;
const sway = (): Block[] =>
  (envelope ??= [9, 10, 11].flatMap((count) =>
    Array.from({ length: 45 }, (_, index) => tower(count, index - 22)).flat(),
  ));

/**
 * How far to move each name tag sideways, in pixels (positive to the right; 0
 * when not needed), for `tagBox`: first inward, to stay on the stage, then
 * outward, away from the tower, where the tag would sit under a block at any
 * lean. `all` and `widths` (each tag's width as the kit sets it, see
 * `tagContentWidth`) are in the same order. A very long name can still touch
 * a neighbour or the pointer's tip: the kit never sets more than two lines.
 */
export function placeTags(all: readonly Spot[], widths: readonly number[]): number[] {
  return all.map((spot, index) => {
    const width = widths[index]!;
    const onStage = tagShift(spot, width);
    const under = (shift: number) =>
      sway().some((block) => blockOverlaps(block, tagBox(spot, width, shift)));
    const away = sideOf(spot);
    let shift = onStage;
    for (let more = 2; under(shift); more += 2) {
      const moved = onStage + away * more;
      const box = tagBox(spot, width, moved);
      if (box.left < 0 || box.right > STAGE.width) break;
      shift = moved;
    }
    return shift;
  });
}

/** The middle of a block's top edge. */
export function topOf(block: Block): Point {
  const a = (block.turn * Math.PI) / 180;
  return {
    x: block.x + (block.height / 2) * Math.sin(a),
    y: block.y - (block.height / 2) * Math.cos(a),
  };
}
