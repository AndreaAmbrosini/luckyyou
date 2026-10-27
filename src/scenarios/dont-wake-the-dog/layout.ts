// Where everyone stands and walks. Those at risk stand on the grass either
// side of the gate, in one row up to 8 people and two from 9; a crosser steps
// back into the lane behind them, tiptoes to the dog, goes over its head or
// tail and along its back, and out through the gate to a spot behind the
// fence. In stage pixels (1280 × 720), from the handover's spike.

/** Where someone is, and how big their head is: the head's box is x − size/2 … x + size/2, y − 0.8·size … y + 0.2·size. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** -1 for the left side of the stage, 1 for the right. */
export type Side = -1 | 1;

/**
 * The line of people at risk: in one row up to 8 people, from the inner
 * end of each side (x 440 and 840) outwards, at most 175 apart and no
 * further out than x 90 and 1190. From 9, two rows, alternating from the
 * inner end, which is in the back row, from x 430 and 850 to 60 and 1220.
 */
export const LINE = {
  one: { y: 620, inner: 440, outer: 90, apart: 175 },
  two: { back: 545, front: 660, inner: 430, outer: 60 },
} as const;

/** How many stand on the left: the first half of the line, the bigger one. */
export const leftCount = (people: number) => Math.ceil(people / 2);

/** Which side of the gate seat `index` of `people` is on. */
export const sideOfSeat = (index: number, people: number): Side =>
  index < leftCount(people) ? -1 : 1;

/** Whether `people` stand in two rows. */
export const twoRows = (people: number) => people >= 9;

/** Heads of those standing at risk: 120 with 6 or fewer at risk, 100 from 7. */
export const riskHead = (atRisk: number) => (atRisk <= 6 ? 120 : 100);

/** Where seat `index` of `people` is, left to right along the line; its head is sized for `atRisk`. */
export function seat(index: number, people: number, atRisk = people): Spot {
  const left = leftCount(people);
  const side = sideOfSeat(index, people);
  const own = side === -1 ? left : people - left;
  // How far in from the inner end of its side: 0 for the innermost.
  const k = side === -1 ? left - 1 - index : index - left;
  const size = riskHead(atRisk);
  if (!twoRows(people)) {
    const { y, inner, outer, apart } = LINE.one;
    const step = own <= 1 ? 0 : Math.min(apart, (inner - outer) / (own - 1));
    return { x: centre(side, inner - k * step), y, size };
  }
  const { back, front, inner, outer } = LINE.two;
  const step = own <= 1 ? 0 : (inner - outer) / (own - 1);
  return { x: centre(side, inner - k * step), y: k % 2 === 0 ? back : front, size };
}

/** An x on the left side mirrored to `side`. */
const centre = (side: Side, x: number) => (side === -1 ? x : 1280 - x);

/**
 * The lane behind the line: crossers tiptoe along it at `y`, heads `size`,
 * to its end on their side, x 430 or 850. With two rows it runs higher,
 * clear of the back row.
 */
export function lane(people: number): { y: number; size: number; end: (side: Side) => number } {
  const two = twoRows(people);
  return {
    y: two ? 415 : 480,
    size: two ? 90 : 100,
    end: (side) => centre(side, 430),
  };
}
