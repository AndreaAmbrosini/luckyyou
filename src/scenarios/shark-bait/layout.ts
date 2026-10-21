// Where people float, from the storyboard: two rows when the water is busy,
// one row from 6 left, and bigger as fewer are left. In stage pixels.

import { spread, STAGE, stagePx } from '../../scenario-kit';

/** Where someone is: the middle of their swim ring, on the water, and their head's size. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** A place in the water, with the size its name tag is set at and how wide the tag may grow. */
export interface Place extends Spot {
  readonly tag: { readonly size: number; readonly maxWidth: number };
  /** How far above its usual height the name tag sits, clear of its neighbours' tags. */
  readonly lift?: number;
}

/** A name tag's size as it is drawn, in stage pixels. */
export interface TagBox {
  readonly width: number;
  readonly height: number;
}

interface Row {
  readonly y: number;
  readonly left: number;
  readonly right: number;
  /** How much of each person's slot their head takes. */
  readonly fill: number;
  readonly maxSize: number;
}

const BACK: Row = { y: 372, left: 70, right: 1210, fill: 0.4, maxSize: 96 };
const FRONT: Row = { y: 560, left: 15, right: 1275, fill: 0.46, maxSize: 120 };
/** One row, by how many are in it. */
const SINGLE: Record<number, Row> = {
  2: { y: 615, left: 160, right: 1120, fill: 0.55, maxSize: 240 },
  3: { y: 590, left: 70, right: 1210, fill: 0.55, maxSize: 185 },
};
const ROW: Row = { y: 575, left: 55, right: 1225, fill: 0.55, maxSize: 150 };
/** The last one left, out of the shark's way. */
const ALONE: Spot = { x: 820, y: 630, size: 270 };

const row = (count: number, { y, left, right, fill, maxSize }: Row): Spot[] =>
  spread(count, { left, right }, { fill, maxSize }).map(({ x, size }) => ({
    x,
    y,
    size: Math.round(size),
  }));

/** The places for `count` people, back row first, each row left to right. */
export function places(count: number): Place[] {
  const back = Math.floor(count / 2);
  const spots =
    count === 1
      ? [ALONE]
      : count > 6
        ? [...row(back, BACK), ...row(count - back, FRONT)]
        : row(count, SINGLE[count] ?? ROW);
  return spots.map((spot) => ({ ...spot, tag: tagAt(spot, spots) }));
}

/**
 * A name tag is set at 0.22 of the head's size, never under the stage's
 * smallest tag, and never under the duel's size for the last two. It is at
 * most 2.2 heads wide, and keeps 10 pixels clear of the next person's tag.
 */
function tagAt(spot: Spot, spots: readonly Spot[]): Place['tag'] {
  const neighbours = spots.filter((other) => other !== spot && other.y === spot.y);
  const room = Math.min(...neighbours.map((other) => Math.abs(other.x - spot.x)));
  const least = stagePx(spots.length <= 2 ? '--size-stage-tag-duel' : '--size-stage-tag-min');
  return {
    size: Math.max(least, Math.round(0.22 * spot.size)),
    maxWidth: Math.round(Math.min(2.2 * spot.size, room - 10)),
  };
}

/** How far from the stage's edges a name tag stays. */
const EDGE = 10;

/** Room between two tiers of tags beyond the lower tag's height; bobbing moves a tag up to 6 pixels. */
const TIER_GAP = 14;

/**
 * `places` again, with any row whose name `tags` (drawn sizes, in the same
 * order) would touch laid out again: neighbours' tags 10 pixels apart, heads
 * 20, and every tag on stage. If they can't sit side by side, every other tag
 * goes up a tier, so a tag only needs room from the next but one. A row whose
 * tags already fit stays as the storyboard draws it.
 */
export function fitTags(places: readonly Place[], tags: readonly TagBox[]): Place[] {
  const fitted = [...places];
  const rows = new Map<number, number[]>();
  places.forEach(({ y }, index) => rows.set(y, [...(rows.get(y) ?? []), index]));
  for (const row of rows.values()) {
    row.sort((a, b) => places[a]!.x - places[b]!.x);
    const width = (index: number) => tags[index]!.width;
    const heads = (a: number, b: number) => (places[a]!.size + places[b]!.size) / 2 + 20;
    const sideBySide = (a: number, b: number) => (width(a) + width(b)) / 2 + 10;
    const oneTier = (k: number) => [
      Math.max(heads(row[k - 1]!, row[k]!), sideBySide(row[k - 1]!, row[k]!)),
    ];
    const twoTiers = (k: number) => [
      heads(row[k - 1]!, row[k]!),
      k > 1 ? row[k - 2]! : -1,
      k > 1 ? sideBySide(row[k - 2]!, row[k]!) : 0,
    ];

    const asDrawn = row.map((index) => places[index]!.x);
    if (fits(asDrawn, row, width, oneTier)) continue;
    const single = layOut(row, width, oneTier);
    const xs = single ?? layOut(row, width, twoTiers) ?? squeeze(row, width, twoTiers);
    const lift = single
      ? 0
      : Math.max(...row.filter((_, k) => k % 2 === 0).map((index) => tags[index]!.height)) +
        TIER_GAP;
    row.forEach((index, k) => {
      fitted[index] = { ...places[index]!, x: xs[k]!, ...(k % 2 === 1 && lift ? { lift } : {}) };
    });
  }
  return fitted;
}

/**
 * The gaps person `k` of a row needs from those before: `[from the one
 * before]`, or `[from the one before, index of another, from that one]`.
 */
type Needs = (k: number) => number[];

/** The least `x` each person in `row` can have, from the left edge of the stage. */
function tightest(row: readonly number[], width: (index: number) => number, needs: Needs) {
  const xs: number[] = [];
  row.forEach((index, k) => {
    let x = EDGE + width(index) / 2;
    if (k > 0) {
      const [before, other, fromOther] = needs(k);
      x = Math.max(x, xs[k - 1]! + before!);
      if (other !== undefined && other >= 0) x = Math.max(x, xs[k - 2]! + fromOther!);
    }
    xs.push(x);
  });
  return xs;
}

/** How far the row's rightmost tag ends short of the stage's right edge, less `EDGE`. */
const spareRoom = (
  xs: readonly number[],
  row: readonly number[],
  width: (index: number) => number,
) => STAGE.width - EDGE - Math.max(...row.map((index, k) => xs[k]! + width(index) / 2));

/** Whether people at `xs` keep the gaps `needs` asks for, with every tag on stage. */
function fits(
  xs: readonly number[],
  row: readonly number[],
  width: (index: number) => number,
  needs: Needs,
) {
  return (
    xs.every(
      (x, k) => x - width(row[k]!) / 2 >= EDGE && (k === 0 || x - xs[k - 1]! >= needs(k)[0]!),
    ) && spareRoom(xs, row, width) >= 0
  );
}

/** The row laid out as `needs` asks, its spare room shared out evenly; null if it doesn't fit. */
function layOut(row: readonly number[], width: (index: number) => number, needs: Needs) {
  const xs = tightest(row, width, needs);
  const spare = spareRoom(xs, row, width);
  if (spare < 0) return null;
  return xs.map((x, k) => x + (spare * (k + 1)) / (row.length + 1));
}

/** Too little room even in two tiers: the gaps shrink alike, so the row stays on stage. */
function squeeze(row: readonly number[], width: (index: number) => number, needs: Needs) {
  const xs = tightest(row, width, needs);
  const span = xs.at(-1)! - xs[0]!;
  const room = span + spareRoom(xs, row, width);
  return xs.map((x) => xs[0]! + ((x - xs[0]!) * room) / span);
}

/** A head's size while it hangs from the rope. */
export const HANGING_SIZE = 52;

/** Where the bottom of a person's name tag sits, above their head. */
export const tagBottom = (size: number) => -0.65 * size - 6;
