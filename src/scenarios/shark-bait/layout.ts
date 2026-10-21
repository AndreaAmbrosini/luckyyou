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

/**
 * `places` again, with any row whose name tags would touch spread out by its
 * tags' `widths` (in the same order): neighbours' tags keep 10 pixels apart,
 * heads 20, and the first and last tags stay on stage. A row whose tags
 * already fit stays as the storyboard draws it.
 */
export function fitTags(places: readonly Place[], widths: readonly number[]): Place[] {
  const fitted = [...places];
  const rows = new Map<number, number[]>();
  places.forEach(({ y }, index) => rows.set(y, [...(rows.get(y) ?? []), index]));
  for (const row of rows.values()) {
    row.sort((a, b) => places[a]!.x - places[b]!.x);
    const first = row[0]!;
    const last = row.at(-1)!;
    const need = (a: number, b: number) =>
      Math.max((widths[a]! + widths[b]!) / 2 + 10, (places[a]!.size + places[b]!.size) / 2 + 20);
    const gaps = row.slice(1).map((index, k) => need(row[k]!, index));
    const from = EDGE + widths[first]! / 2;
    const to = STAGE.width - EDGE - widths[last]! / 2;
    const fits =
      gaps.every((gap, k) => places[row[k + 1]!]!.x - places[row[k]!]!.x >= gap) &&
      places[first]!.x >= from &&
      places[last]!.x <= to;
    if (fits) continue;
    // Spare room goes evenly between people and at both ends; too little, and the gaps shrink alike.
    const needed = gaps.reduce((sum, gap) => sum + gap, 0);
    const spare = Math.max(0, to - from - needed) / (row.length + 1);
    const squeeze = needed > to - from ? (to - from) / needed : 1;
    let x = from + spare;
    row.forEach((index, k) => {
      if (k > 0) x += gaps[k - 1]! * squeeze + spare;
      fitted[index] = { ...places[index]!, x };
    });
  }
  return fitted;
}

/** A head's size while it hangs from the rope. */
export const HANGING_SIZE = 52;

/** Where the bottom of a person's name tag sits, above their head. */
export const tagBottom = (size: number) => -0.65 * size - 6;
