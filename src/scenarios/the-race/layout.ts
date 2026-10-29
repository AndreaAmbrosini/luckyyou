// Where each lane is on the stage and how big its racer is drawn. Lanes go
// back to front in today's order, side-on, with a mild perspective: fewer
// people get bigger lanes.

import { speechBox, STAGE, type Box } from '../../scenario-kit';
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

export type { Box };

/** Stage pixels kept clear: under the caption, and at the stage's edges. */
const CLEAR = { top: 120, edge: 8 };

const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/**
 * A name tag's box, estimated from its name: a character is 0.6 em wide in
 * the tag's font, as the kit counts where it can't measure, on at most two
 * lines.
 */
export function tagBox(name: string, mount: Mount, at: Lane, nose: number): Box {
  const { size, maxWidth } = tagSize(at.k);
  const { right, middle } = tagAt(mount, at, nose);
  const text = [...name].length * 0.6 * size + 0.6 * size + 6;
  const lines = text > maxWidth ? 2 : 1;
  const half = (lines * 1.1 * size + 0.15 * size + 6) / 2;
  return {
    left: right - Math.min(text, maxWidth),
    right,
    top: middle - half,
    bottom: middle + half,
  };
}

/**
 * Where a bubble saying `text` sits from its speaker's face, as an offset
 * from the middle of the face's top: the nearest to just over the head
 * whose box stays on the stage, under the caption and clear of every box in
 * `avoid`, in every one of `samples` taken while it is up.
 */
export function bubbleOffset(
  text: string,
  samples: readonly { face: Box; avoid: readonly Box[] }[],
): { dx: number; dy: number } {
  const prefer = { dx: 0, dy: -6 };
  const candidates: { dx: number; dy: number; d: number }[] = [];
  for (let dx = -320; dx <= 420; dx += 16) {
    for (let dy = -150; dy <= 150; dy += 12) {
      candidates.push({ dx, dy, d: Math.hypot(dx - prefer.dx, (dy - prefer.dy) * 1.5) });
    }
  }
  candidates.sort((one, two) => one.d - two.d);
  const clear = ({ dx, dy }: { dx: number; dy: number }) =>
    samples.every(({ face, avoid }) => {
      const box = speechBox(text, { x: (face.left + face.right) / 2 + dx, y: face.top + dy });
      const onStage =
        box.left >= CLEAR.edge &&
        box.right <= STAGE.width - CLEAR.edge &&
        box.top >= CLEAR.top &&
        box.bottom <= STAGE.height - CLEAR.edge;
      return onStage && !avoid.some((other) => overlap(box, other));
    });
  const found = candidates.find(clear);
  return found ? { dx: found.dx, dy: found.dy } : prefer;
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
