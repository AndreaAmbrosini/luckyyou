// Where each lane is on the stage and how big its racer is drawn. Lanes go
// back to front in today's order, side-on, with a mild perspective: fewer
// people get bigger lanes.

import { RACER, RIDER, SPEC, type Mount } from './parts';

/** The track's top and bottom on the stage, and the tallest a lane gets. */
export const TRACK = { top: 216, bottom: 712, pitch: 160 } as const;

export interface Lane {
  readonly index: number;
  /** Where the mount's feet are. */
  readonly ground: number;
  /** The racer's drawing scale. */
  readonly k: number;
  readonly pitch: number;
  /** The lane's top on the stage. */
  readonly top: number;
}

/** The lane pitch for `count` people. */
export const pitchOf = (count: number) => Math.min(TRACK.pitch, (TRACK.bottom - TRACK.top) / count);

/** Lane `index` of `count`, from the back. */
export function lane(index: number, count: number): Lane {
  const pitch = pitchOf(count);
  const top = TRACK.top + (TRACK.bottom - TRACK.top - pitch * count) / 2 + pitch * index;
  const depth = count === 1 ? 1 : 0.92 + (0.16 * index) / (count - 1);
  return {
    index,
    pitch,
    top,
    ground: top + 0.74 * pitch,
    k: Math.min(1.3, (0.72 * pitch) / 62) * depth,
  };
}

/** The racer drawing's top left when its nose is at `nose`. */
export const boxAt = (mount: Mount, at: Lane, nose: number) => ({
  left: nose - SPEC[mount].nose * at.k,
  top: at.ground - RACER.feet * at.k,
});

/** The rider's face on the stage, its box's left, right, top and bottom. */
export function faceAt(mount: Mount, at: Lane, nose: number) {
  const box = boxAt(mount, at, nose);
  const [sx, sy] = SPEC[mount].saddle;
  const size = RIDER.size * at.k;
  const left = box.left + (sx - RIDER.size / 2) * at.k;
  const top = box.top + (sy - RIDER.foot) * at.k;
  return { left, right: left + size, top, bottom: top + size };
}

/** A name tag's size and widest, in a lane drawn at scale `k`. */
export const tagSize = (k: number) => ({ size: Math.min(30, (24 * k) / 0.72), maxWidth: 240 });

/** Where a name tag's right edge and middle go: beside the face, behind it. */
export function tagAt(mount: Mount, at: Lane, nose: number) {
  const box = boxAt(mount, at, nose);
  return {
    right: box.left + (SPEC[mount].saddle[0] - 28) * at.k,
    middle: at.ground - 129 * at.k,
  };
}
