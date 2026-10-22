import { gsap } from 'gsap';
import { describe, expect, it, vi } from 'vitest';
import { fakeScenario } from '../../specs/support/fake-scenarios';
import type { Show } from './contract';
import { runShow } from './testing';

const PICK = { names: ['Anna', 'Ben'], unlucky: 'Anna' };
const ignore = () => undefined;

/** A show that does `leak`, then lasts a second. */
const leaking = (leak: (show: Show) => void) =>
  fakeScenario({
    play: async (show) => {
      leak(show);
      await show.wait(1);
    },
  });

describe('runShow', () => {
  it('counts what a show leaves behind', async () => {
    const controller = new AbortController();
    const { signal } = controller;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const record = await runShow(
      leaking(() => {
        timers.push(
          setTimeout(() => undefined, 60_000),
          setInterval(() => undefined, 60_000),
        );
        // A frame loop keeps one frame pending, however fast the test runs.
        const loop = () => void (signal.aborted || requestAnimationFrame(loop));
        loop();
        window.addEventListener('resize', ignore);
        document.addEventListener('keydown', ignore);
        document.body.append(document.createElement('div'));
      }),
      PICK,
    );
    expect(record.leftovers).toEqual({ elements: 1, animations: 0, timers: 3, listeners: 2 });
    controller.abort();
    timers.forEach(clearTimeout);
    window.removeEventListener('resize', ignore);
    document.removeEventListener('keydown', ignore);
    document.body.lastElementChild?.remove();
  });

  it("doesn't count what a show tidied up", async () => {
    const record = await runShow(
      leaking(() => {
        const listener = () => undefined;
        clearTimeout(setTimeout(() => undefined, 60_000));
        clearInterval(setInterval(() => undefined, 60_000));
        cancelAnimationFrame(requestAnimationFrame(() => undefined));
        window.addEventListener('resize', listener);
        window.removeEventListener('resize', listener);
        const controller = new AbortController();
        document.addEventListener('keydown', listener, { signal: controller.signal });
        controller.abort();
      }),
      PICK,
    );
    expect(record.leftovers).toEqual({ elements: 0, animations: 0, timers: 0, listeners: 0 });
  });

  it('steps the clock a frame at a time and reports each frame', async () => {
    const times: number[] = [];
    const record = await runShow(fakeScenario({ play: (show) => show.wait(0.1) }), {
      ...PICK,
      step: 0.025,
      onFrame: (time) => times.push(time),
    });
    expect(times.map((time) => Number(time.toFixed(9)))).toEqual([0.025, 0.05, 0.075, 0.1]);
    expect(record.duration).toBeCloseTo(0.1, 9);
  });

  it('looks for the caption once, not every frame', async () => {
    const lookUp = vi.spyOn(Element.prototype, 'querySelector');
    await runShow(fakeScenario({ play: (show) => show.wait(1) }), PICK);
    const lookups = lookUp.mock.calls.filter(([selector]) => selector.includes('caption'));
    expect(lookups.length).toBeLessThanOrEqual(1);
  });

  it('notes when the last caption leaves with the stage', async () => {
    const record = await runShow(
      fakeScenario({
        play: async (show) => {
          show.caption('Hi');
          await show.wait(1.5);
        },
      }),
      PICK,
    );
    expect(record.captions).toEqual([{ text: 'Hi', from: 0, to: record.duration }]);
  });

  it('stops a show that runs past its limit', async () => {
    const record = await runShow(fakeScenario({ play: (show) => show.wait(60) }), {
      ...PICK,
      limit: 2,
    });
    expect(record.outcome).toBe('cancelled');
    expect(record.duration).toBeCloseTo(2, 5);
  });

  it('hands the clock back to the browser afterwards', async () => {
    await runShow(fakeScenario(), PICK);
    const { _listeners } = gsap.ticker as unknown as { _listeners: unknown[] };
    expect(_listeners).toContain(gsap.updateRoot);
  });

  it('keeps what the scenario threw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Oops');
    const record = await runShow(
      fakeScenario({
        play: () => {
          throw error;
        },
      }),
      PICK,
    );
    expect(record.outcome).toBe('failed');
    expect(record.error).toBe(error);
  });
});
