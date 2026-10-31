// Where each lane is on the stage and how big its racer is drawn. Lanes go
// back to front in today's order, side-on, with a mild perspective: fewer
// people get bigger lanes.

import { speechBox, STAGE, stagePx, type Box } from '../../scenario-kit';
import { CREATURE_SPEC } from './creature';
import { isCreature, RACER, RIDER, SPEC, type Kind } from './parts';

/** The track's top and bottom on the stage, and the tallest a lane gets. */
export const TRACK = { top: 216, bottom: 712, pitch: 160 } as const;

export interface Lane {
  readonly index: number;
  /** Where the racer's feet are. */
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
export const lane = (index: number, count: number) => laneOn(TRACK, index, count);

/**
 * The Line-up's start, on its 1194 by 440 grid: lanes under a backdrop band
 * 64 px tall, noses at x 432 and the start line from x 444, 12 px wide.
 */
export const START_TRACK = { top: 64, bottom: 440, pitch: 94, nose: 432, line: 444 } as const;

/** Lane `index` of `count` at the Line-up's start, from the back. */
export const startLane = (index: number, count: number) => laneOn(START_TRACK, index, count);

/** Lane `index` of `count` between `top` and `bottom`, none taller than `pitch`, centred. */
function laneOn(
  track: { readonly top: number; readonly bottom: number; readonly pitch: number },
  index: number,
  count: number,
): Lane {
  const pitch = Math.min(track.pitch, (track.bottom - track.top) / count);
  const top = track.top + (track.bottom - track.top - pitch * count) / 2 + pitch * index;
  const depth = count === 1 ? 1 : 0.92 + (0.16 * index) / (count - 1);
  return {
    index,
    pitch,
    top,
    ground: top + 0.74 * pitch,
    k: Math.min(1.3, (0.72 * pitch) / 62) * depth,
  };
}

/**
 * A racer's nose and the middle of its face on its grid: a rider's face is
 * over the saddle, a creature's where the canvas puts it.
 */
const geometry = (kind: Kind) =>
  isCreature(kind) ? CREATURE_SPEC[kind] : { nose: SPEC[kind].nose, face: SPEC[kind].saddle[0] };

/**
 * The top of every face's box on the grid: a rider's head, 72 px, stands on
 * a saddle at y 110 on every mount, and a creature's face gets the same box.
 */
const FACE_TOP = 110 - RIDER.foot;

/** The racer drawing's top left when its nose is at `nose`. */
export const boxAt = (kind: Kind, at: Lane, nose: number) => ({
  left: nose - geometry(kind).nose * at.k,
  top: at.ground - RACER.feet * at.k,
});

/** The racer's face on the stage, its box's left, right, top and bottom. */
export function faceAt(kind: Kind, at: Lane, nose: number) {
  const box = boxAt(kind, at, nose);
  const size = RIDER.size * at.k;
  const left = box.left + (geometry(kind).face - RIDER.size / 2) * at.k;
  const top = box.top + FACE_TOP * at.k;
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
export function tagBox(name: string, kind: Kind, at: Lane, nose: number): Box {
  const { size, maxWidth } = tagSize(at.k);
  const { right, middle } = tagAt(kind, at, nose);
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

/** Stage pixels between a bubble and the face or name tag it sits beside. */
const BESIDE = 10;

/**
 * Where a bubble saying `text` sits from its speaker's face at each of
 * `samples`, as an offset from the middle of the face's top. It hugs the
 * speaker: just over the head, else level with the face ahead of it, else
 * level with it past the speaker's own name tag; on the stage, under the
 * caption, and clear of every box in `avoid` from one sample to the next. It
 * stays put while that spot stays clear, so it moves only when it must.
 */
export function bubbleOffsets(
  text: string,
  samples: readonly { face: Box; tag: Box; avoid: readonly Box[] }[],
): { dx: number; dy: number }[] {
  // The bubble's box is the same shape wherever it goes: measured once.
  const shape = speechBox(text, { x: 0, y: 0 });
  const half = shape.right;
  const height = -shape.top;
  const spots = ({ face, tag }: { face: Box; tag: Box }) => {
    const middle = (face.left + face.right) / 2;
    const level = (face.bottom - face.top) / 2 + height / 2;
    const above = [0, 16, -16, 32, -32, 48, -48].flatMap((dx) => [
      { dx, dy: -4 },
      { dx, dy: -16 },
    ]);
    const ahead = face.right + BESIDE + half - middle;
    const behind = tag.left - BESIDE - half - middle;
    const sideways = [0, -16, 16, -32, 32].flatMap((dy) => [
      { dx: ahead, dy: level + dy },
      { dx: behind, dy: level + dy },
    ]);
    return [...above, ...sideways];
  };
  const clearAt = (at: (typeof samples)[number], { dx, dy }: { dx: number; dy: number }) => {
    const x = (at.face.left + at.face.right) / 2 + dx;
    const y = at.face.top + dy;
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
    return onStage && !at.avoid.some((other) => overlap(box, other));
  };
  const offsets: { dx: number; dy: number }[] = [];
  let was: { dx: number; dy: number } | undefined;
  samples.forEach((at, i) => {
    const next = samples[i + 1];
    const clear = (spot: { dx: number; dy: number }) =>
      clearAt(at, spot) && (!next || clearAt(next, spot));
    const here = spots(at);
    const kept = was && here.find((spot) => same(spot, was!));
    was = (kept && clear(kept) ? kept : here.find(clear)) ?? kept ?? here[0]!;
    offsets.push(was);
  });
  return offsets;
}

const same = (one: { dx: number; dy: number }, two: { dx: number; dy: number }) =>
  Math.abs(one.dx - two.dx) < 1 && Math.abs(one.dy - two.dy) < 1;

/** A name tag's size and widest, in a lane drawn at scale `k`. */
export const tagSize = (k: number) => ({ size: Math.min(30, (24 * k) / 0.72), maxWidth: 240 });

/** Stage pixels between a name tag and its rider's face. */
export const TAG_GAP = 2;

/**
 * Where a name tag's right edge and middle go: beside the face, behind it,
 * level with it, ending just short of it so it never covers the face.
 */
export function tagAt(kind: Kind, at: Lane, nose: number) {
  return {
    right: faceAt(kind, at, nose).left - TAG_GAP,
    middle: at.ground - 129 * at.k,
  };
}
