// A show's still: the picture its card opens with in the picker (decision
// 0021). scripts/still.mjs loads this in Chromium from the dev server:
// `holdShowAt` plays the show on a hand-driven clock to a moment and holds it
// there, the script takes a picture of the stage, and `encodeStill` cuts it
// and saves it as WebP. The app itself never loads it.

import type { Scenario } from './contract';
import { runScenario } from './run';
import { driveClockByHand } from './time';

/** The stage, in stage pixels. */
const STAGE = { width: 1280, height: 720 } as const;

/** A still's size in pixels: 16 : 9, sharp on a card on a screen at twice the pixels. */
export const STILL = { width: 640, height: 360 } as const;

/** Show seconds per frame, as the tests play shows. */
const FRAME = 1 / 30;

/** WebP quality: each still stays well under 100 KB. */
const QUALITY = 0.85;

/** How a still is cut from the stage, as the design's `scale` and `transform-origin`. */
export interface StillCut {
  /** How many times closer than the whole stage; 1 or more. */
  readonly zoom: number;
  /** The point that stays where it is, 0 to 1 across and down. */
  readonly focus: { readonly x: number; readonly y: number };
}

/** The part of the 1280 by 720 stage a still shows, in stage pixels. */
export function stillCrop({ zoom, focus }: StillCut) {
  const width = STAGE.width / zoom;
  const height = STAGE.height / zoom;
  return {
    x: focus.x * (STAGE.width - width),
    y: focus.y * (STAGE.height - height),
    width,
    height,
  };
}

export interface HoldOptions {
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
  /** The theme for a show with themes; drawn from the seed unless given. */
  readonly theme?: string;
  /** The moment to hold, in show seconds. */
  readonly at: number;
}

/**
 * Plays `scenario` over the whole page, frame by frame, up to `at` show
 * seconds, and holds it there: the clock stays where it stopped.
 */
export async function holdShowAt(scenario: Scenario, options: HoldOptions) {
  const host = document.body.appendChild(document.createElement('div'));
  host.style.cssText = 'position: fixed; inset: 0; z-index: 1';
  let started!: () => void;
  const playing = new Promise<void>((resolve) => (started = resolve));
  const watched: Scenario = {
    ...scenario,
    play(show) {
      started();
      return scenario.play(show);
    },
  };
  const clock = driveClockByHand();
  void runScenario(watched, {
    ...options,
    host,
    muted: true,
    music: 0,
    signal: new AbortController().signal,
    development: false,
    reducedMotion: false,
  });
  await playing;
  for (let frame = 1; frame * FRAME < options.at; frame++) {
    clock.moveTo(frame * FRAME);
    await new Promise((resolve) => setTimeout(resolve));
  }
  clock.moveTo(options.at);
  await new Promise((resolve) => setTimeout(resolve));
}

/** Cuts a still from `picture`, the stage's picture as a URL, and returns it as a WebP data URL. */
export async function encodeStill(picture: string, cut: StillCut): Promise<string> {
  const image = new Image();
  image.src = picture;
  await image.decode();
  const scale = image.naturalWidth / STAGE.width;
  const { x, y, width, height } = stillCrop(cut);
  const canvas = document.createElement('canvas');
  canvas.width = STILL.width;
  canvas.height = STILL.height;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  const [left, top, across, down] = [x, y, width, height].map((length) => length * scale);
  context.drawImage(image, left!, top!, across!, down!, 0, 0, STILL.width, STILL.height);
  return canvas.toDataURL('image/webp', QUALITY);
}
