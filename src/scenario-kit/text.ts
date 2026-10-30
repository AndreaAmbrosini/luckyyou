// Text on the stage. Names are always set as text, never as HTML, and stay
// big enough to read over a screen share (DESIGN.md, "Shows").

import { gsap } from 'gsap';
import styles from './text.module.css';
import { STAGE } from './stage';
import { stagePx, token } from './tokens';

/** A tag's padding on both sides together, in ems, as text.module.css sets it. */
const TAG_PADDING_EM = 0.6;
/** Stage pixels kept free, so a measured name never just touches its edge. */
const SLACK = 2;
/** Each caption stays up at least this many seconds. */
const CAPTION_SECONDS = 1;

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
let canvas: OffscreenCanvasRenderingContext2D | null | undefined;

/**
 * How wide `text` is in a name tag's font at `size`. Browsers measure it;
 * where there is no canvas (jsdom), a character counts as 0.6 em.
 */
function textWidth(text: string, size: number): number {
  canvas ??=
    typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1).getContext('2d') : null;
  if (!canvas) return [...graphemes.segment(text)].length * 0.6 * size;
  canvas.font = `900 ${size}px ${token('--font-body')}`;
  return canvas.measureText(text).width;
}

/**
 * How many lines `name` takes in `width` at `size`, broken as the browser
 * does: after spaces and hyphens, and anywhere in a word too long for a line.
 */
function lineCount(name: string, size: number, width: number): number {
  let lines = 1;
  let used = 0;
  for (const word of name.split(/(?<=[\s-])/)) {
    const visible = textWidth(word.trimEnd(), size);
    if (used + visible <= width) {
      used += textWidth(word, size);
      continue;
    }
    if (used > 0) lines++;
    used = 0;
    if (visible <= width) {
      used = textWidth(word, size);
      continue;
    }
    for (const { segment } of graphemes.segment(word)) {
      const glyph = textWidth(segment, size);
      if (used > 0 && used + glyph > width) {
        lines++;
        used = 0;
      }
      used += glyph;
    }
  }
  return lines;
}

/**
 * A paper name tag for `name`, set at `size` stage pixels and at most
 * `maxWidth` wide. A name too long for one line shrinks first, down to
 * `wrapBelow` (`--size-stage-tag-min` unless given); past that it wraps onto
 * two lines at that size, shrinking again only if two lines need it, and at
 * `--size-stage-tag-min` the tag widens instead. Never smaller, never three
 * lines. With `chest` the tag is placed for a box the size of a head, centred
 * with its top at 76% of the box, below the chin.
 */
export function nameTag(
  name: string,
  {
    size,
    maxWidth,
    wrapBelow = 0,
    chest = false,
  }: { size: number; maxWidth: number; wrapBelow?: number; chest?: boolean },
): HTMLElement {
  const min = stagePx('--size-stage-tag-min');
  const borders = 2 * stagePx('--line');
  const fits = (at: number, width: number, lines: number) =>
    lineCount(name, at, width - borders - TAG_PADDING_EM * at - SLACK) <= lines;
  /** The biggest size from `low` up to `high` that fits on `lines`, if `low` does. */
  const biggest = (low: number, high: number, lines: number) => {
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (fits(middle, maxWidth, lines)) low = middle;
      else high = middle;
    }
    return low;
  };

  let chosen = Math.max(min, Math.floor(size));
  const wrapAt = Math.min(chosen, Math.max(min, Math.floor(wrapBelow)));
  let lines = 1;
  let width = maxWidth;
  if (!fits(chosen, width, 1)) {
    if (fits(wrapAt, width, 1)) {
      chosen = biggest(wrapAt, chosen, 1);
    } else {
      lines = 2;
      if (fits(min, width, 2)) {
        chosen = fits(wrapAt, width, 2) ? wrapAt : biggest(min, wrapAt, 2);
      } else {
        chosen = min;
        while (!fits(min, width, 2)) width += 4;
      }
    }
  }

  const tag = document.createElement('div');
  tag.className = styles.tag;
  tag.dataset.lines = String(lines);
  tag.style.setProperty('--tag-size', `${chosen}px`);
  tag.style.maxWidth = `${width}px`;
  if (chest) {
    tag.classList.add(styles.chest);
    tag.dataset.on = 'chest';
    tag.style.left = '50%';
    tag.style.top = '76%';
  }
  const text = tag.appendChild(document.createElement('span'));
  // On the text, not the tag: jsdom slows down badly when styles are read on
  // an element with a dir attribute, and GSAP reads the tag's.
  text.dir = 'auto';
  text.textContent = name;
  return tag;
}

/**
 * A speech bubble saying `text`, its tail at `anchor` in stage pixels, the
 * speech `lean` px to the right of its tail (left when negative; at most
 * leanRoom). Paper unless `colour` is "sun".
 */
export function bubble(
  text: string,
  anchor: { x: number; y: number },
  { colour = 'paper', lean = 0 }: { colour?: 'paper' | 'sun'; lean?: number } = {},
): HTMLElement {
  const element = document.createElement('div');
  element.className = styles.bubble;
  element.style.left = `${anchor.x}px`;
  element.style.top = `${anchor.y}px`;
  if (lean !== 0) element.style.setProperty('--lean', `${lean}px`);
  const speech = element.appendChild(document.createElement('div'));
  speech.className = colour === 'sun' ? `${styles.speech} ${styles.sun}` : styles.speech;
  const words = speech.appendChild(document.createElement('span'));
  words.dir = 'auto';
  words.textContent = text;
  return element;
}

/** A box on the stage, in stage pixels. */
export interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/**
 * A bubble's box when it's anchored at `anchor`, estimated from its text: the
 * speech sits 22 px over the anchor in the caption's font, padded 22 by 6
 * inside a 4 px line, its tail down to the anchor. A tenth more all round for
 * its tilt and popIn's overshoot.
 */
export function speechBox(text: string, anchor: { x: number; y: number }, lean = 0): Box {
  const font = stagePx('--size-stage-caption');
  const half = (1.1 * (0.62 * font * [...text].length + 2 * (22 + 4))) / 2;
  const height = 1.1 * (22 + 1.1 * font + 2 * (6 + 4));
  return {
    left: anchor.x + lean - half,
    right: anchor.x + lean + half,
    top: anchor.y - height,
    bottom: anchor.y,
  };
}

/**
 * How far a bubble saying `text` may lean either way and keep its tail
 * under the speech's straight bottom edge: half the speech, as speechBox
 * estimates it before its tenth more, less its 24 px rounded corner, its
 * 4 px line and half the tail, 17 px corner to corner.
 */
export function leanRoom(text: string): number {
  const font = stagePx('--size-stage-caption');
  const half = (0.62 * font * [...text].length + 2 * (22 + 4)) / 2;
  return Math.max(0, half - 24 - 4 - 17);
}

/** Space kept between a bubble and what it sits beside, and the stage's edge. */
const SPEECH = { gap: 12, edge: 8 };

/**
 * Where to anchor a bubble saying `text`, on the stage and clear of `beside`
 * and everything in `avoid`: level with `beside`, on its side toward the
 * stage's middle, or its other side, or just above it, when that's clear;
 * otherwise level with it, pushed out past what's in the way toward the
 * middle, or the other way when that has no room; over `beside` when neither
 * has.
 */
export function speechAt(
  text: string,
  beside: Box,
  avoid: readonly Box[] = [],
): {
  x: number;
  y: number;
} {
  const { gap, edge } = SPEECH;
  const size = speechBox(text, { x: 0, y: 0 });
  const half = size.right;
  const height = -size.top;
  const inTheWay = [beside, ...avoid];
  const middle = (beside.left + beside.right) / 2;
  const level = (beside.top + beside.bottom) / 2 + height / 2;
  const y = Math.min(STAGE.height - edge, Math.max(height + edge, level));
  const centred = Math.min(STAGE.width - edge - half, Math.max(edge + half, middle));
  const inward = middle > STAGE.width / 2 ? -1 : 1;
  const past = (box: Box, side: number) =>
    side > 0 ? box.right + gap + half : box.left - gap - half;
  const blocking = (tail: { x: number; y: number }) =>
    inTheWay.find((box) => overlap(speechBox(text, tail), box));
  const clear = (tail: { x: number; y: number }) => {
    const box = speechBox(text, tail);
    const onStage =
      box.left >= edge &&
      box.right <= STAGE.width - edge &&
      box.top >= edge &&
      box.bottom <= STAGE.height - edge;
    return onStage && !blocking(tail);
  };

  const near = [
    { x: past(beside, inward), y },
    { x: past(beside, -inward), y },
    { x: centred, y: beside.top - gap },
  ].find(clear);
  if (near) return near;
  for (const side of [inward, -inward]) {
    let x = past(beside, side);
    for (let box = blocking({ x, y }); box; box = blocking({ x, y })) x = past(box, side);
    if (x - half >= edge && x + half <= STAGE.width - edge) return { x, y };
  }
  return { x: centred, y: Math.max(height + edge, beside.top) };
}

/**
 * The show's captions, one at a time at the top of `layer` and read out in
 * `live`. Each stays up at least a second on the show's clock; one that comes
 * sooner waits its turn.
 */
export function createCaptions(layer: HTMLElement, live: HTMLElement, signal: AbortSignal) {
  const sticker = layer.appendChild(document.createElement('p'));
  sticker.className = styles.caption;
  sticker.dataset.kit = 'caption';
  sticker.hidden = true;
  const words = sticker.appendChild(document.createElement('span'));
  words.dir = 'auto';

  const waiting: (string | null)[] = [];
  let shownAt = -Infinity;
  let next: gsap.core.Tween | null = null;

  const showNext = () => {
    const text = waiting.shift() ?? null;
    sticker.hidden = text === null;
    words.textContent = text;
    live.textContent = text;
    shownAt = gsap.globalTimeline.time();
    next = waiting.length > 0 ? gsap.delayedCall(CAPTION_SECONDS, showNext) : null;
  };

  return (text: string | null) => {
    if (signal.aborted) return;
    waiting.push(text);
    if (next) return;
    const due = shownAt + CAPTION_SECONDS - gsap.globalTimeline.time();
    if (due <= 0) showNext();
    else next = gsap.delayedCall(due, showNext);
  };
}
