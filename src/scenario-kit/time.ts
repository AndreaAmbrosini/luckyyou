// A show's timing runs on GSAP's clock (decision 0010): waits and animations
// both stop the moment the show is cancelled.

import { gsap } from 'gsap';

const cancelled = () => new DOMException('The show was stopped.', 'AbortError');

/** Resolves after `seconds` of show time; rejects at once if `signal` aborts. */
export function wait(seconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(cancelled());
    const stop = () => {
      call.kill();
      reject(cancelled());
    };
    const call = gsap.delayedCall(seconds, () => {
      signal.removeEventListener('abort', stop);
      resolve();
    });
    signal.addEventListener('abort', stop, { once: true });
  });
}

/**
 * Plays `animation` and resolves when it completes. If `signal` aborts, the
 * animation is killed and the promise rejects at once.
 */
export function play(animation: gsap.core.Animation, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const stop = () => {
      animation.kill();
      reject(cancelled());
    };
    if (signal.aborted) return stop();
    signal.addEventListener('abort', stop, { once: true });
    void animation.paused(false).then(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    });
  });
}

export interface Beat {
  readonly seconds: number;
  /** A flexible beat stretches when the show would otherwise be too short. */
  readonly flexible?: boolean;
}

/**
 * How long each beat lasts so the show reaches `total` seconds: flexible
 * beats stretch in proportion to their length, and fixed beats keep theirs.
 * Beats that already add up to `total` or more are left as they are.
 */
export function fitBeats<K extends string>(
  beats: Readonly<Record<K, Beat>>,
  total: number,
): Record<K, number> {
  const entries = Object.entries(beats) as [K, Beat][];
  const sum = entries.reduce((seconds, [, beat]) => seconds + beat.seconds, 0);
  const flexible = entries
    .filter(([, beat]) => beat.flexible)
    .reduce((seconds, [, beat]) => seconds + beat.seconds, 0);
  const stretch = sum < total && flexible > 0 ? (flexible + total - sum) / flexible : 1;
  return Object.fromEntries(
    entries.map(([key, beat]) => [key, beat.flexible ? beat.seconds * stretch : beat.seconds]),
  ) as Record<K, number>;
}
