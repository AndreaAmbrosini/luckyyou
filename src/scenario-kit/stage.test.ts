import { describe, expect, it, vi } from 'vitest';
import { fakeScenario } from '../../specs/support/fake-scenarios';
import { onReset } from '../test/reset';
import type { Show } from './contract';
import { runScenario } from './run';

/** A host the size of a window, which jsdom doesn't lay out. */
function hostOfSize(size: { width: number; height: number }) {
  const host = document.body.appendChild(document.createElement('div'));
  Object.defineProperties(host, {
    clientWidth: { get: () => size.width },
    clientHeight: { get: () => size.height },
  });
  onReset(() => host.remove());
  return host;
}

const scaleOf = (show: Show) => show.stage.parentElement!.style.getPropertyValue('--stage-scale');

/** Runs one show in `host` that does `during`, and waits for it to end. */
function runIn(host: HTMLElement, during: (show: Show) => void) {
  return runScenario(fakeScenario({ play: during }), {
    host,
    names: ['Anna', 'Ben'],
    unlucky: 'Ben',
    seed: 1,
    muted: true,
    music: 0,
    signal: new AbortController().signal,
  });
}

describe('the stage', () => {
  it('scales 1280 by 720 to fit the window, letterboxed', async () => {
    const scales: string[] = [];
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 800, height: 900 },
    ]) {
      await runIn(hostOfSize(size), (show) => void scales.push(scaleOf(show)));
    }
    expect(scales).toEqual(['1.5', '0.8', '0.625']);
  });

  it('rescales when the window is resized, and stops listening when the show ends', async () => {
    const size = { width: 1920, height: 1080 };
    const host = hostOfSize(size);
    const scales: string[] = [];
    const listen = vi.spyOn(window, 'addEventListener');
    const stopListening = vi.spyOn(window, 'removeEventListener');

    await runIn(host, (show) => {
      scales.push(scaleOf(show));
      Object.assign(size, { width: 1000, height: 1000 });
      window.dispatchEvent(new Event('resize'));
      scales.push(scaleOf(show));
    });

    expect(scales).toEqual(['1.5', '0.78125']);
    const onResize = listen.mock.calls.find(([type]) => type === 'resize')?.[1];
    expect(onResize).toBeDefined();
    expect(stopListening).toHaveBeenCalledWith('resize', onResize);
    expect(host).toBeEmptyDOMElement();
  });
});
