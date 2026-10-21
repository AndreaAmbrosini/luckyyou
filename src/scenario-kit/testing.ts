// Runs a show in a test. GSAP's clock is driven by hand, frame by frame, so a
// 13-second show takes a moment and every frame can be checked (decision 0010).

import { gsap } from 'gsap';
import type { Scenario, Show } from './contract';
import { runScenario, type RunOutcome } from './run';

export { describeSpec } from '../../specs/support/spec';

export interface ShowRecord {
  readonly outcome: RunOutcome;
  /** What the scenario threw, if it threw. */
  readonly error: unknown;
  /** Show seconds from the start until the show was over. */
  readonly duration: number;
  /** The stage the show drew on, or null if it never started. */
  readonly stage: HTMLElement | null;
  /** What the show left behind that wasn't there before it started. */
  readonly leftovers: {
    readonly elements: number;
    readonly animations: number;
    readonly timers: number;
    readonly listeners: number;
  };
}

export interface RunShowOptions {
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed?: number;
  /** Cancels the show at this many show seconds, as Esc would. */
  readonly cancelAt?: number;
  /** Show seconds per frame: 1/30 unless given. */
  readonly step?: number;
  /** A show still running after this many show seconds is cancelled: 30 unless given. */
  readonly limit?: number;
  /** Runs the show as the dev server would, with its warnings. */
  readonly development?: boolean;
  /** Called after every frame with the show seconds so far and the stage. */
  onFrame?(time: number, stage: HTMLElement): void;
}

/** Plays `scenario` to its end, or until it is cancelled, and says what it did. */
export async function runShow(scenario: Scenario, options: RunShowOptions): Promise<ShowRecord> {
  const { step = 1 / 30, limit = 30, cancelAt } = options;
  const elementsBefore = document.body.querySelectorAll('*').length;
  const animationsBefore = new Set(allAnimations());
  const clock = driveClockByHand();
  const counters = countTimersAndListeners();
  const host = document.body.appendChild(document.createElement('div'));
  const controller = new AbortController();
  const seen: { stage: HTMLElement | null; error: unknown } = { stage: null, error: undefined };

  const watched: Scenario = {
    ...scenario,
    async play(show: Show) {
      seen.stage = show.stage;
      try {
        await scenario.play(show);
      } catch (error) {
        seen.error = error;
        throw error;
      }
    },
  };

  try {
    let outcome: RunOutcome | null = null;
    let time = 0;
    const running = runScenario(watched, {
      host,
      names: options.names,
      unlucky: options.unlucky,
      seed: options.seed ?? 1,
      muted: true,
      signal: controller.signal,
      development: options.development,
    }).then((result) => {
      outcome = result;
    });
    await settle();

    for (let frame = 1; outcome === null; frame++) {
      const due = (seconds = Infinity) => time > seconds - 1e-9;
      if (!controller.signal.aborted && (due(limit) || due(cancelAt))) {
        controller.abort();
        await settle();
        continue;
      }
      time = frame * step;
      clock.moveTo(time);
      await settle();
      if (seen.stage) options.onFrame?.(time, seen.stage);
    }
    await running;

    return {
      outcome: outcome as RunOutcome,
      error: seen.error,
      duration: time,
      stage: seen.stage,
      leftovers: {
        elements: document.body.querySelectorAll('*').length - elementsBefore - 1,
        animations: allAnimations().filter((animation) => !animationsBefore.has(animation)).length,
        timers: counters.timers(),
        listeners: counters.listeners(),
      },
    };
  } finally {
    host.remove();
    counters.release();
    clock.release();
  }
}

const allAnimations = () => gsap.globalTimeline.getChildren(true, true, true);

/** Lets every promise the last frame set off run to its end. */
const settle = () =>
  new Promise<void>((resolve) =>
    (globalThis as unknown as { setImmediate(callback: () => void): void }).setImmediate(resolve),
  );

/**
 * Takes GSAP's clock off the browser's frames, so only `moveTo` moves it.
 * GSAP's own docs suggest this for driving it by hand.
 */
function driveClockByHand() {
  const { ticker } = gsap;
  const wake = ticker.wake;
  ticker.remove(gsap.updateRoot);
  ticker.sleep();
  // Making an animation wakes the ticker, which would ask for frames again.
  ticker.wake = () => undefined;
  const start = gsap.globalTimeline.time();
  return {
    moveTo(seconds: number) {
      gsap.updateRoot(start + seconds);
    },
    release() {
      ticker.wake = wake;
      gsap.updateRoot(ticker.time);
      ticker.add(gsap.updateRoot);
    },
  };
}

interface Listening {
  readonly target: EventTarget;
  readonly type: string;
  readonly listener: EventListenerOrEventListenerObject;
  readonly capture: boolean;
  readonly signal?: AbortSignal;
}

type Callback = (...args: unknown[]) => void;

/**
 * Counts the timers, animation frames and window or document listeners that
 * are set during a show and still pending or attached at the end.
 */
function countTimersAndListeners() {
  const timeouts = new Set<unknown>();
  const intervals = new Set<unknown>();
  const frames = new Set<number>();
  const listening: Listening[] = [];
  const undo: (() => void)[] = [];
  // jsdom runs animation frames on a timer of its own; that one isn't the show's.
  let insideFrameRequest = false;

  function swap<T>(target: object, key: string, wrap: (original: T) => T) {
    const own = Object.getOwnPropertyDescriptor(target, key);
    const original = (target as Record<string, T>)[key]!;
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value: wrap(original),
    });
    undo.push(() => {
      if (own) Object.defineProperty(target, key, own);
      else Reflect.deleteProperty(target, key);
    });
  }

  swap<(handler: Callback, ms?: number, ...args: unknown[]) => unknown>(
    globalThis,
    'setTimeout',
    (original) =>
      (handler, ms, ...args) => {
        if (insideFrameRequest) return original(handler, ms, ...args);
        const id = original(
          (...given: unknown[]) => {
            timeouts.delete(id);
            handler(...given);
          },
          ms,
          ...args,
        );
        timeouts.add(id);
        return id;
      },
  );
  swap<(handler: Callback, ms?: number, ...args: unknown[]) => unknown>(
    globalThis,
    'setInterval',
    (original) =>
      (handler, ms, ...args) => {
        const id = original(handler, ms, ...args);
        if (!insideFrameRequest) intervals.add(id);
        return id;
      },
  );
  for (const key of ['clearTimeout', 'clearInterval']) {
    swap<(id: unknown) => void>(globalThis, key, (original) => (id) => {
      timeouts.delete(id);
      intervals.delete(id);
      original(id);
    });
  }
  swap<(callback: FrameRequestCallback) => number>(
    globalThis,
    'requestAnimationFrame',
    (original) => (callback) => {
      insideFrameRequest = true;
      try {
        const id = original((time) => {
          frames.delete(id);
          callback(time);
        });
        frames.add(id);
        return id;
      } finally {
        insideFrameRequest = false;
      }
    },
  );
  swap<(id: number) => void>(globalThis, 'cancelAnimationFrame', (original) => (id) => {
    frames.delete(id);
    original(id);
  });

  const captures = (options?: boolean | EventListenerOptions) =>
    typeof options === 'boolean' ? options : Boolean(options?.capture);
  for (const target of new Set<EventTarget>([window, document])) {
    swap<EventTarget['addEventListener']>(
      target,
      'addEventListener',
      (original) =>
        function (this: EventTarget | undefined, type, listener, options) {
          const on = this ?? target;
          if (listener) {
            const signal = typeof options === 'object' ? options.signal : undefined;
            listening.push({ target: on, type, listener, capture: captures(options), signal });
          }
          original.call(on, type, listener, options);
        },
    );
    swap<EventTarget['removeEventListener']>(
      target,
      'removeEventListener',
      (original) =>
        function (this: EventTarget | undefined, type, listener, options) {
          const on = this ?? target;
          const index = listening.findIndex(
            (entry) =>
              entry.target === on &&
              entry.type === type &&
              entry.listener === listener &&
              entry.capture === captures(options),
          );
          if (index >= 0) listening.splice(index, 1);
          original.call(on, type, listener, options);
        },
    );
  }

  return {
    timers: () => timeouts.size + intervals.size + frames.size,
    listeners: () => listening.filter((entry) => !entry.signal?.aborted).length,
    release() {
      while (undo.length > 0) undo.pop()!();
    },
  };
}
