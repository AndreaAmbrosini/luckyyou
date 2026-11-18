// Where everything stands on the 1280 by 720 stage: the oval the marchers
// circle, the stools inside it, the lounge along the back wall and the throne.
// The ring sizes were checked by brute force: at every head count and every
// turn of the oval, no two name tags overlap and all stay on the stage.

import { speechAt, speechBox, stagePx, STAGE, type Box } from '../../scenario-kit';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An oval of marchers: how big heads and name tags are, and how wide it is. */
export interface Ring {
  readonly name: 'crowd' | 'party' | 'few' | 'duel';
  /** Head size in px. */
  readonly size: number;
  readonly tag: number;
  readonly tagWidth: number;
  readonly rx: number;
  readonly ry: number;
}

export const CENTRE: Point = { x: 640, y: 465 };

export const RINGS: readonly Ring[] = [
  { name: 'crowd', size: 84, tag: 22, tagWidth: 168, rx: 490, ry: 160 },
  { name: 'party', size: 104, tag: 28, tagWidth: 220, rx: 470, ry: 142 },
  { name: 'few', size: 122, tag: 34, tagWidth: 300, rx: 440, ry: 120 },
  { name: 'duel', size: 136, tag: 40, tagWidth: 320, rx: 340, ry: 80 },
];

/** The oval for `count` marchers: fewer people, bigger heads. */
export function ringOf(count: number): Ring {
  if (count >= 9) return RINGS[0]!;
  if (count >= 5) return RINGS[1]!;
  return count >= 3 ? RINGS[2]! : RINGS[3]!;
}

/** A spot on the oval, at `angle` radians, turning clockwise from the right. */
export function orbit(ring: Ring, angle: number): Point {
  return { x: CENTRE.x + ring.rx * Math.cos(angle), y: CENTRE.y + ring.ry * Math.sin(angle) };
}

/** Where the cushion of each stool is, for 1, 2 and 3 stools. */
export const STOOLS: Readonly<Record<number, readonly Point[]>> = {
  1: [{ x: 640, y: 480 }],
  2: [
    { x: 555, y: 480 },
    { x: 725, y: 480 },
  ],
  3: [
    { x: 485, y: 480 },
    { x: 640, y: 480 },
    { x: 795, y: 480 },
  ],
};

/** Where a head sits on a stool: the shirt ends at the cushion. */
export function seatOf(stool: Point, size: number): Point {
  return { x: stool.x, y: stool.y - 0.62 * size };
}

export const LOUNGE = { y: 190, size: 76, left: 300, right: 1180 } as const;

/** Where the `index`th person to arrive of `total` sits on the lounge sofa. */
export function loungeSlot(index: number, total: number): Point {
  const x =
    total <= 1
      ? (LOUNGE.left + LOUNGE.right) / 2
      : LOUNGE.left + (index * (LOUNGE.right - LOUNGE.left)) / (total - 1);
  return { x, y: LOUNGE.y };
}

export const THRONE = { x: 640, y: 420, size: 158 } as const;

/** The unlucky person's name tag on the throne. */
export const THRONE_TAG = { name: 'throne', tag: 40, tagWidth: 520 } as const;

/** A sitter's name tag on its stool; as wide as the gap between stools, so none overlap. */
export function seatTag(stools: number) {
  const gap = stools > 1 ? STOOLS[stools]![1]!.x - STOOLS[stools]![0]!.x : 320;
  return { name: `seat${stools}`, tag: [34, 26, 22][stools - 1]!, tagWidth: gap - 6 };
}

/** Top of a name tag for a head of `size` centred at `y`: below the chin. */
export const tagTop = (y: number, size: number) => y + 0.34 * size;

export const faceBox = (at: Point, size: number, pad = 0): Box => {
  const r = 0.42 * size + pad;
  return { left: at.x - r, right: at.x + r, top: at.y - r, bottom: at.y + r };
};

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** A name tag's box, estimated the way the specs measure it. */
export function tagBox(name: string, tag: HTMLElement, centre: number, top: number): Box {
  const size = Number.parseFloat(tag.style.getPropertyValue('--tag-size'));
  const maxWidth = Number.parseFloat(tag.style.maxWidth) || 320;
  const lines = tag.dataset.lines === '2' ? 2 : 1;
  const borders = 2 * stagePx('--line');
  const chars = [...graphemes.segment(name)].length;
  const one = Math.ceil(chars * 0.6 * size + 0.6 * size + borders + 2);
  const width = lines === 1 ? Math.min(maxWidth, one) : maxWidth;
  const height = (1.1 * lines + 0.15) * size + borders;
  return { left: centre - width / 2, right: centre + width / 2, top, bottom: top + height };
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** The caption's strip along the top, which bubbles keep out of. */
export const CAPTION_STRIP: Box = { left: 40, right: 1240, top: 16, bottom: 116 };

/**
 * Where a bubble saying `text` can be anchored: beside `beside` when that is
 * clear of `avoid`, otherwise the nearest clear spot on the stage. Null when
 * nothing is clear.
 */
export function bubbleSpot(text: string, beside: Box, avoid: readonly Box[]): Point | null {
  const clear = (anchor: Point) => {
    const box = speechBox(text, anchor);
    const margin = 8;
    return (
      box.left >= margin &&
      box.right <= STAGE.width - margin &&
      box.top >= margin &&
      box.bottom <= STAGE.height - margin &&
      ![CAPTION_STRIP, ...avoid].some((other) => overlaps(box, other))
    );
  };
  const first = speechAt(text, beside, [CAPTION_STRIP, ...avoid]);
  if (clear(first)) return first;
  const from = { x: (beside.left + beside.right) / 2, y: (beside.top + beside.bottom) / 2 };
  let best: Point | null = null;
  let nearest = Infinity;
  for (let y = 120; y <= STAGE.height; y += 8) {
    for (let x = 0; x <= STAGE.width; x += 8) {
      const anchor = { x, y };
      const distance = Math.hypot(x - from.x, y - from.y);
      if (distance < nearest && clear(anchor)) {
        best = anchor;
        nearest = distance;
      }
    }
  }
  return best;
}
