// Text on the stage. Names are always set as text, never as HTML, and stay
// big enough to read over a screen share (DESIGN.md, "Shows").

import { gsap } from 'gsap';
import styles from './text.module.css';
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
 * How wide `text` is in the display font at `size`. Browsers measure it;
 * where there is no canvas (jsdom), a character counts as 0.6 em.
 */
function textWidth(text: string, size: number): number {
  canvas ??=
    typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1).getContext('2d') : null;
  if (!canvas) return [...graphemes.segment(text)].length * 0.6 * size;
  canvas.font = `${size}px ${token('--font-display')}`;
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
 * `--size-stage-tag-min`; past that it wraps onto two lines, and the tag
 * widens if two lines need it. Never smaller, never three lines.
 */
export function nameTag(
  name: string,
  { size, maxWidth }: { size: number; maxWidth: number },
): HTMLElement {
  const min = stagePx('--size-stage-tag-min');
  const borders = 2 * stagePx('--line-bold');
  const fits = (at: number, width: number, lines: number) =>
    lineCount(name, at, width - borders - TAG_PADDING_EM * at - SLACK) <= lines;

  let chosen = Math.max(min, Math.floor(size));
  let lines = 1;
  let width = maxWidth;
  if (!fits(chosen, width, 1)) {
    if (fits(min, width, 1)) {
      // The biggest size that keeps it on one line.
      let low = min;
      let high = chosen;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (fits(middle, width, 1)) low = middle;
        else high = middle;
      }
      chosen = low;
    } else {
      chosen = min;
      lines = 2;
      while (!fits(min, width, 2)) width += 4;
    }
  }

  const tag = document.createElement('div');
  tag.className = styles.tag;
  tag.dataset.lines = String(lines);
  tag.style.setProperty('--tag-size', `${chosen}px`);
  tag.style.maxWidth = `${width}px`;
  const text = tag.appendChild(document.createElement('span'));
  // On the text, not the tag: jsdom slows down badly when styles are read on
  // an element with a dir attribute, and GSAP reads the tag's.
  text.dir = 'auto';
  text.textContent = name;
  return tag;
}

/**
 * A speech bubble saying `text`, its tail at `anchor` in stage pixels. Paper
 * unless `colour` is "sun".
 */
export function bubble(
  text: string,
  anchor: { x: number; y: number },
  { colour = 'paper' }: { colour?: 'paper' | 'sun' } = {},
): HTMLElement {
  const element = document.createElement('div');
  element.className = styles.bubble;
  element.style.left = `${anchor.x}px`;
  element.style.top = `${anchor.y}px`;
  const speech = element.appendChild(document.createElement('div'));
  speech.className = colour === 'sun' ? `${styles.speech} ${styles.sun}` : styles.speech;
  const words = speech.appendChild(document.createElement('span'));
  words.dir = 'auto';
  words.textContent = text;
  return element;
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
