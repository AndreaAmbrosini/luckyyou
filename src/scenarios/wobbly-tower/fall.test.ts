import { describe, expect, it } from 'vitest';
import {
  POINTER_MOVES,
  ENDINGS,
  names,
  unluckyOf,
  watch,
  seedOf,
  marcoRun,
  heaped,
  expectEndingPlayed,
} from './watching';

describe('The last turn and the fall', () => {
  // Every pointer move with every ending, at 2, 8 and 12, with and without
  // the pigeon: the seed for each found by search.
  for (const count of [2, 8, 12]) {
    for (const pigeon of [true, false]) {
      it(`plays every last turn in time at ${count} people, ${pigeon ? 'with' : 'without'} the pigeon`, async () => {
        const team = names(count);
        const unlucky = unluckyOf(count);
        for (const pointer of POINTER_MOVES) {
          for (const ending of ENDINGS) {
            const seed = seedOf(
              team,
              unlucky,
              (plan) =>
                plan.pointer === pointer && plan.ending === ending && plan.pigeon === pigeon,
            );
            const run = await watch(team, unlucky, { seed });
            expectEndingPlayed(
              run,
              unlucky,
              `${count} people, ${pointer}, ${ending}, seed ${seed}`,
            );
          }
        }
      });
    }
  }

  it('plays every last turn in time with reduced motion, its captions in the same order', async () => {
    const team = names(8);
    const unlucky = unluckyOf(8);
    for (const pointer of POINTER_MOVES) {
      for (const ending of ENDINGS) {
        const seed = seedOf(
          team,
          unlucky,
          (plan) => plan.pointer === pointer && plan.ending === ending,
        );
        const label = `8 people, ${pointer}, ${ending}, seed ${seed}, reduced motion`;
        const calm = await watch(team, unlucky, { seed, reducedMotion: true });
        expectEndingPlayed(calm, unlucky, label);
        expect(
          calm.frames.filter((frame) => frame.speedLines),
          label,
        ).toEqual([]);
      }
    }
  });

  it('the dust puffs up where blocks land in the heap', async () => {
    const { frames, plan } = await marcoRun();
    const down = heaped(frames, plan);
    const puffs = frames.filter((frame) => frame.dust > 0);
    expect(puffs.length).toBeGreaterThan(0);
    for (const frame of puffs) {
      expect(frame.time).toBeGreaterThanOrEqual(plan.still.to);
      expect(frame.time).toBeLessThan(down.time + 1);
    }
  });
});
