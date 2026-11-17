// Where everything stands in Hide and Seek, in stage pixels: the furniture
// the hiders stand behind, the balcony the found go up to, the seeker and the
// winner's spot. A person's x and y are their face's centre.

import { nameTag, spread, stagePx } from '../../scenario-kit';

export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** How a name tag is set: its size and widest, and its top, in stage pixels. */
export interface TagSpec {
  readonly size: number;
  readonly maxWidth: number;
  readonly top: number;
}

/** A hiding place: a square of furniture with a head-sized hider behind it. */
export interface Place extends Spot {
  readonly index: number;
  /** The furniture's width, height, top edge and bottom edge. */
  readonly box: number;
  readonly height: number;
  readonly furniture: number;
  readonly top: number;
  readonly base: number;
  readonly tag: TagSpec;
}

export interface Layout {
  readonly places: readonly Place[];
  /** Where a speech bubble's tail is anchored over the furniture. */
  readonly lane: number;
}

export const BALCONY = { y: 195, left: 100, right: 1180, maxSize: 78 } as const;
export const BOARD = { top: 234, bottom: 270 } as const;
/** The height a tag over a balcony head starts at. */
export const BALCONY_TAG_TOP = 102;
export const WINNER = { x: 640, y: 480, size: 170, tag: { size: 48, maxWidth: 380 } } as const;
export const SEEKER = { x: 640, top: 636, width: 190 } as const;
/** Where the lens waits while the seeker looks away. */
export const PARK = { x: 905, y: 692 } as const;
export const HORIZON = 300;

const AREA = { left: 50, right: 1230 } as const;
const FLOOR = { top: 300, bottom: 674 } as const;
const GAP = 16;
const MOST_ONE_ROW = 3;
/** The face centre sits this far down the furniture. */
const FACE_AT = 0.55;
/** A head is this much narrower than the furniture hiding it. */
export const HEAD_OF_BOX = 1 / 1.5;
/** A found hider's face rises this much of the furniture's side. */
export const LIFT = 0.3;

/** Where a hider's face is once they pop out over their furniture. */
export const emerged = (place: Place): Spot => ({
  x: place.x,
  y: place.y - LIFT * place.height,
  size: place.size,
});

/** The tag's width as the kit sets it and the test measures it, with jsdom drawing no text. */
export function tagWidth(el: HTMLElement, name: string): number {
  const size = Number.parseFloat(el.style.getPropertyValue('--tag-size'));
  const set = Number.parseFloat(el.style.maxWidth);
  if (el.dataset.lines === '2') return set;
  return Math.min(set, Math.ceil([...name].length * 0.6 * size + 0.6 * size + 8));
}

export const winnerTag = (): TagSpec => ({
  ...WINNER.tag,
  top: WINNER.y + 0.32 * WINNER.size,
});

/** Where the found stand, `count` of them, along the balcony. */
export function balconySpots(count: number): Spot[] {
  return spread(
    count,
    { left: BALCONY.left, right: BALCONY.right },
    { maxSize: BALCONY.maxSize, fill: 0.85 },
  ).map(({ x, size }) => ({ x, y: BALCONY.y, size }));
}

function tagsOf(names: readonly string[], size: number, maxWidth: number) {
  const els = names.map((name) => nameTag(name, { size, maxWidth, wrapBelow: 0.8 * size }));
  const borders = 2 * stagePx('--line');
  const height = Math.max(
    ...els.map((el) => {
      const chosen = Number.parseFloat(el.style.getPropertyValue('--tag-size'));
      return (1.1 * (el.dataset.lines === '2' ? 2 : 1) + 0.15) * chosen + borders;
    }),
  );
  return { els, height };
}

/**
 * A rear wall of furniture and a staggered foreground of hiding places,
 * with tags below each piece and a clear lane between the two depths.
 */
export function layoutFor(names: readonly string[], count: number): Layout {
  const attempt = (rows: 1 | 2) => {
    const perRow = Math.ceil(count / rows);
    const pitch = (AREA.right - AREA.left) / perRow;
    const size = rows === 1 ? 34 : 26;
    const { els, height } = tagsOf(names, size, pitch - 12);
    const fits = els.every((el, index) => tagWidth(el, names[index]!) <= pitch - 8);
    return { rows, perRow, pitch, size, height, fits };
  };
  const one = count <= MOST_ONE_ROW ? attempt(1) : null;
  const chosen = one?.fits ? one : attempt(2);
  const { rows, perRow, pitch, size, height: tagHeight } = chosen;

  const floorTop = count > 9 ? 340 : FLOOR.top;
  const room = FLOOR.bottom - floorTop;
  const height = Math.floor(
    Math.min(230, pitch - 14, (room - (rows - 1) * GAP) / rows - 4 - tagHeight),
  );
  const rowHeight = height + 4 + chosen.height;
  const used = rows * rowHeight + (rows - 1) * GAP;
  const start = floorTop + (room - used) / 2;

  const places: Place[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const left = (AREA.left + AREA.right - inRow * pitch) / 2;
    const x =
      left +
      ((index % perRow) + 0.5) * pitch +
      (rows === 1 ? 0 : (row === 0 ? -1 : 1) * Math.min(22, pitch * 0.06));
    const top = start + row * (rowHeight + GAP);
    const rear = [0, ...[3, 1, 5, 6].slice(0, Math.max(0, perRow - 2)), 2];
    if (perRow >= 3 && !rear.includes(3)) rear[1] = 3;
    const front = [11, ...[8, 7, 10, 9].slice(0, Math.max(0, inRow - 2)), 4];
    const furniture = (row === 0 ? rear : front)[index % perRow]!;
    const ratio = furniture === 0 ? 2.3 : furniture === 3 ? 2 : 1;
    const box = Math.min(pitch - 24, height * ratio);
    const base = top + height;
    places.push({
      index,
      x,
      y: top + FACE_AT * height,
      size: height * HEAD_OF_BOX,
      box,
      height,
      furniture,
      top,
      base,
      tag: { size, maxWidth: pitch - 12, top: base + 4 },
    });
  }
  const lane = Math.min(...places.map((place) => place.top)) - 8;
  return { places, lane };
}
