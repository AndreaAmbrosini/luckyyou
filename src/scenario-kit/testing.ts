// Runs a show in a test. GSAP's clock is driven by hand, frame by frame, so a
// 13-second show takes a moment and every frame can be checked (decision 0010).

import { gsap } from 'gsap';
import type { ChosenLook, Scenario, Show } from './contract';
import { runScenario, type RunOutcome } from './run';

export { describeSpec } from '../../specs/support/spec';

export interface ShowRecord {
  readonly outcome: RunOutcome;
  /** What the scenario threw, if it threw. */
  readonly error: unknown;
  /** Show seconds from the start until the show was over. */
  readonly duration: number;
  /** The stage the show drew on. */
  readonly stage: HTMLElement | null;
  /** Each caption the stage showed, and the show seconds it was up from and to. */
  readonly captions: readonly { text: string; from: number; to: number }[];
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
  /** Everyone's look from the Line-up; dealt from the seed unless given. */
  readonly looks?: ReadonlyMap<string, ChosenLook>;
  readonly seed?: number;
  /** Cancels the show at this many show seconds, as Esc would. */
  readonly cancelAt?: number;
  /** Show seconds per frame: 1/30 unless given. */
  readonly step?: number;
  /** A show still running after this many show seconds is cancelled: 35 unless given. */
  readonly limit?: number;
  /** Runs the show as the dev server would, with its warnings. */
  readonly development?: boolean;
  /** Less motion; the browser's prefers-reduced-motion unless given. */
  readonly reducedMotion?: boolean;
  /** Called after every frame with the show seconds so far and the stage. */
  onFrame?(time: number, stage: HTMLElement): void;
}

/** Plays `scenario` to its end, or until it is cancelled, and says what it did. */
export async function runShow(scenario: Scenario, options: RunShowOptions): Promise<ShowRecord> {
  const { step = 1 / 30, limit = 35, cancelAt } = options;
  const elementsBefore = document.body.querySelectorAll('*').length;
  const animationsBefore = new Set(allAnimations());
  const clock = driveClockByHand();
  const counters = countTimersAndListeners();
  const host = document.body.appendChild(document.createElement('div'));
  const controller = new AbortController();
  const seen: { error: unknown } = { error: undefined };
  const captions: { text: string; from: number; to: number }[] = [];
  let caption: { text: string; from: number } | null = null;
  let sticker: HTMLElement | null = null;

  /** Notes when the caption on screen changes. */
  const readCaption = (time: number) => {
    // Found once: looking it up every frame took a quarter of a show's time.
    sticker ??= host.querySelector<HTMLElement>('[data-kit="caption"]');
    const text = sticker?.isConnected && !sticker.hidden ? sticker.textContent : null;
    if (caption?.text === text) return;
    if (caption) captions.push({ ...caption, to: time });
    caption = text ? { text, from: time } : null;
  };

  const watched: Scenario = {
    ...scenario,
    async play(show: Show) {
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
      looks: options.looks,
      seed: options.seed ?? 1,
      muted: true,
      signal: controller.signal,
      development: options.development,
      reducedMotion: options.reducedMotion,
    }).then((result) => {
      outcome = result;
    });
    const stage = host.querySelector<HTMLElement>('[data-kit="stage"]');
    await settle();
    readCaption(time);

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
      readCaption(time);
      if (stage) options.onFrame?.(time, stage);
    }
    await running;

    return {
      outcome: outcome as RunOutcome,
      error: seen.error,
      duration: time,
      stage,
      captions,
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
 * Takes GSAP's clock off the browser's frames, so only `moveTo` moves it, as
 * https://gsap.com/docs/v3/GSAP/gsap.updateRoot()/ shows.
 */
function driveClockByHand() {
  const { ticker, globalTimeline } = gsap;
  const wake = ticker.wake;
  ticker.remove(gsap.updateRoot);
  ticker.sleep();
  // Making an animation wakes the ticker, which would ask for frames again.
  ticker.wake = () => undefined;
  // updateRoot takes the time before the root's start time is taken off. A
  // seek that gives an animation a negative start moves that start time, so
  // the root's own time can't stand in for it.
  const start = globalTimeline.startTime() + globalTimeline.time() / globalTimeline.timeScale();
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
