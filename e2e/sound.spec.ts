import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { transformWithOxc } from 'vite';

/** The kit's sound and music, as plain JavaScript a page can import. */
async function kitSource() {
  const compile = async (file: string) =>
    (await transformWithOxc(await readFile(file, 'utf8'), file)).code;
  return {
    music: await compile('src/scenario-kit/music.ts'),
    sound: await compile('src/scenario-kit/sound.ts'),
  };
}

/** Imports the kit's sound in the page; it finds its music where `music` is. */
async function importSound(source: { music: string; sound: string }) {
  const blob = (code: string) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  const music = blob(source.music);
  const sound = blob(
    source.sound
      .replaceAll("'./music'", JSON.stringify(music))
      .replaceAll('"./music"', JSON.stringify(music)),
  );
  return {
    ...((await import(music)) as typeof import('../src/scenario-kit/music')),
    ...((await import(sound)) as typeof import('../src/scenario-kit/sound')),
  };
}

// "Every sound can be heard" (specs/kit.feature), measured where there is
// audio to measure: each sound is rendered offline and its peak read.
test('every sound can be heard', async ({ page }) => {
  await page.goto('./');
  await page.addScriptTag({ content: `window.importSound = ${importSound.toString()}` });
  const peaks = await page.evaluate(
    async (source) => {
      const { createSound } = await (window as unknown as Kit).importSound(source);
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
    },
    await kitSource(),
  );

  for (const [cue, peak] of Object.entries(peaks)) {
    const loops = cue === 'rotor' || cue === 'sizzle';
    expect(peak, cue).toBeGreaterThanOrEqual(loops ? 0.05 : 0.15);
  }
});

// "Music sits under the sounds" (specs/kit.feature): the kit's sample at 70%, moved
// along frame by frame as a show would, rendered offline and its peak read.
test('music sits under the sounds', async ({ page }) => {
  await page.goto('./');
  await page.addScriptTag({ content: `window.importSound = ${importSound.toString()}` });
  const peak = await page.evaluate(
    async (source) => {
      const { createSound, SAMPLE } = await (window as unknown as Kit).importSound(source);
      // The kit's own sample, at the galop's speed.
      const song = SAMPLE;
      const speed = 4.4;
      const seconds = 9 / speed + 0.5;
      const opened: OfflineAudioContext[] = [];
      window.AudioContext = class extends OfflineAudioContext {
        constructor() {
          super(1, Math.ceil(44_100 * seconds), 44_100);
          opened.push(this);
        }
      } as unknown as typeof AudioContext;
      const music = createSound({ muted: false, music: 0.7 }).player.music(song);
      music.to(0, speed);
      const context = opened[0]!;
      for (let frame = 1; frame / 30 < seconds - 0.1; frame++) {
        const time = frame / 30;
        void context.suspend(time).then(() => {
          music.to(time * speed, speed);
          void context.resume();
        });
      }
      const rendered = await context.startRendering();
      return Math.max(...rendered.getChannelData(0).map(Math.abs));
    },
    await kitSource(),
  );

  expect(peak).toBeGreaterThanOrEqual(0.2);
  expect(peak).toBeLessThanOrEqual(0.5);
});

interface Kit {
  importSound: typeof importSound;
}
