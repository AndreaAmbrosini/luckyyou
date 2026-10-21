// Where people float, from the storyboard: two rows when the water is busy,
// one row from 6 left, and bigger as fewer are left. In stage pixels.

import { spread } from '../../scenario-kit';

/** A person's place: their swim ring's centre, on the water, and their head's size. */
export interface Place {
  readonly x: number;
  readonly y: number;
  readonly size: number;
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
const ALONE: Place = { x: 820, y: 630, size: 270 };

const row = (count: number, { y, left, right, fill, maxSize }: Row): Place[] =>
  spread(count, { left, right }, { fill, maxSize }).map(({ x, size }) => ({
    x,
    y,
    size: Math.round(size),
  }));

/** The places for `count` people, back row first, each row left to right. */
export function places(count: number): Place[] {
  if (count === 1) return [ALONE];
  if (count > 6) {
    const back = Math.floor(count / 2);
    return [...row(back, BACK), ...row(count - back, FRONT)];
  }
  return row(count, SINGLE[count] ?? ROW);
}

/** A head's size while it hangs from the rope. */
export const HANGING_SIZE = 52;

/** Where the bottom of a person's name tag sits, above their head. */
export const tagBottom = (size: number) => -0.65 * size - 6;

/** How big a person's name tag is set, and how wide it may grow. */
export const tagFor = ({ size }: Pick<Place, 'size'>) => ({
  size: Math.max(22, Math.round(0.22 * size)),
  maxWidth: Math.round(2.2 * size),
});
