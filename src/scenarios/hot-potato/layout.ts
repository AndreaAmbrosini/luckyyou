// Where everyone stands in the ring, from the storyboard: an ellipse seen
// from a little above, so the person at the back is smaller than the one in
// front. In stage pixels.

/** Where someone stands, and how big their head and name tag are. */
export interface Spot {
  /** Where the person stands: the head's box is x − size/2 … x + size/2, y − 0.8·size … y + 0.2·size. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly tag: { readonly size: number; readonly maxWidth: number };
}

/** The potato's size, and how much bigger it is when two people hold it. */
export const POTATO = { width: 120, height: 110, pairScale: 1.4 } as const;

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

/** Where a potato is held: 35 px over the head. */
export function held(spot: Spot): { x: number; y: number } {
  return { x: spot.x, y: spot.y - 0.8 * spot.size - 35 };
}
