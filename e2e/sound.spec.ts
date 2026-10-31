import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { transformWithOxc } from 'vite';

// "Every sound can be heard" (specs/kit.feature), measured where there is
// audio to measure: each sound is rendered offline and its peak read.
test('every sound can be heard', async ({ page }) => {
  const file = 'src/scenario-kit/sound.ts';
  const { code } = await transformWithOxc(await readFile(file, 'utf8'), file);
  await page.goto('./');
  const peaks = await page.evaluate(async (source) => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const { createSound } = (await import(url)) as typeof import('../src/scenario-kit/sound');
    const cues = [
      'splash',
      'rotor',
      'whoosh',
      'heartbeat',
      'fanfare',
      'sizzle',
      'pop',
      'thunk',
      'creak',
      'tumble',
      'sniff',
      'grumble',
      'bark',
      'latch',
    ] as const;
    const peaks: Record<string, number> = {};
    for (const cue of cues) {
      const opened: OfflineAudioContext[] = [];
      // The sound opens its own context: hand it one that renders to memory.
      window.AudioContext = class extends OfflineAudioContext {
        constructor() {
          super(1, 44_100 * 1.5, 44_100);
          opened.push(this);
        }
      } as unknown as typeof AudioContext;
      createSound({ muted: false }).player.play(cue);
      const rendered = await opened[0]!.startRendering();
      peaks[cue] = Math.max(...rendered.getChannelData(0).map(Math.abs));
    }
    return peaks;
  }, code);

  for (const [cue, peak] of Object.entries(peaks)) {
    const loops = cue === 'rotor' || cue === 'sizzle';
    expect(peak, cue).toBeGreaterThanOrEqual(loops ? 0.05 : 0.15);
  }
});
