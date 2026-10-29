// Where each lane is on the stage and how big its racer is drawn. Lanes go
// back to front in today's order, side-on, with a mild perspective: fewer
// people get bigger lanes.

import { speechBox, STAGE, stagePx, type Box } from '../../scenario-kit';
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
 * A name tag's box, estimated from its name as the kit sizes it where it
 * can't measure: a character is 0.6 em wide, plus 0.6 em of padding and the
 * borders. A name too long for one line shrinks first, down to
 * `--size-stage-tag-min`, and only then takes two lines.
 */
export function tagBox(name: string, mount: Mount, at: Lane, nose: number): Box {
  const { size, maxWidth } = tagSize(at.k);
  const { right, middle } = tagAt(mount, at, nose);
  // Read once: looking a token up parses tokens.css.
  tokens ??= { line: stagePx('--line'), least: stagePx('--size-stage-tag-min') };
  const ems = [...name].length * 0.6 + 0.6;
  const room = maxWidth - 2 * tokens.line - 2;
  const fitted = Math.max(tokens.least, Math.min(size, Math.floor(room / ems)));
  const lines = ems * fitted > room ? 2 : 1;
  const width = Math.min(maxWidth, (ems * fitted) / lines + 2 * tokens.line + 2);
  const half = (lines * 1.1 * fitted + 0.15 * fitted + 2 * tokens.line) / 2;
  return { left: right - width, right, top: middle - half, bottom: middle + half };
}

let tokens: { line: number; least: number } | undefined;

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
  // The bubble's box is the same shape wherever it goes: measured once.
  const shape = speechBox(text, { x: 0, y: 0 });
  const clear = ({ dx, dy }: { dx: number; dy: number }) =>
    samples.every(({ face, avoid }) => {
      const x = (face.left + face.right) / 2 + dx;
      const y = face.top + dy;
      const box = {
        left: shape.left + x,
        right: shape.right + x,
        top: shape.top + y,
        bottom: shape.bottom + y,
      };
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

/** Stage pixels between a name tag and its rider's face. */
export const TAG_GAP = 2;

/**
 * Where a name tag's right edge and middle go: beside the face, behind it,
 * level with it, ending just short of it so it never covers the face.
 */
export function tagAt(mount: Mount, at: Lane, nose: number) {
  return {
    right: faceAt(mount, at, nose).left - TAG_GAP,
    middle: at.ground - 129 * at.k,
  };
}
