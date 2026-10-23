import { describe, expect, it } from 'vitest';
import {
  ENDINGS,
  names,
  unluckyOf,
  watch,
  seedOf,
  marcoRun,
  heaped,
  expectEndingPlayed,
  STEP,
} from './watching';

/** How many can be left at risk when it falls: 3 or 2, or everyone with 2 or 3 people. */
const leftAt = (count: number) => (count <= 3 ? [count] : [3, 2]);

/** Each run, once: the same show is watched by more than one test. */
const runs = new Map<string, ReturnType<typeof watch>>();
const runOf = (team: readonly string[], unlucky: string, seed: number) => {
  const key = `${team.join()}|${unlucky}|${seed}`;
  let run = runs.get(key);
  if (!run) runs.set(key, (run = watch(team, unlucky, { seed })));
  return run;
};

describe('The last turn and the fall', () => {
  // Every ending, falling with 3 left and with 2 left, at 2, 8 and 12: the
  // seed for each found by search.
  for (const count of [2, 8, 12]) {
    for (const left of leftAt(count)) {
      it(`plays every ending in time at ${count} people, falling with ${left} left`, async () => {
        const team = names(count);
        const unlucky = unluckyOf(count);
        for (const ending of ENDINGS) {
          const seed = seedOf(
            team,
            unlucky,
            (plan) => plan.ending === ending && plan.fallsWith === left,
          );
          const run = await runOf(team, unlucky, seed);
          expectEndingPlayed(
            run,
            unlucky,
            `${count} people, ${left} left, ${ending}, seed ${seed}`,
          );
        }
      });
    }
  }

  it('plays every ending in time with reduced motion, its captions in the same order', async () => {
    const team = names(8);
    const unlucky = unluckyOf(8);
    for (const left of leftAt(8)) {
      for (const ending of ENDINGS) {
        const seed = seedOf(
          team,
          unlucky,
          (plan) => plan.ending === ending && plan.fallsWith === left,
        );
        const label = `8 people, ${left} left, ${ending}, seed ${seed}, reduced motion`;
        const calm = await watch(team, unlucky, { seed, reducedMotion: true });
        expectEndingPlayed(calm, unlucky, label);
        expect(
          calm.frames.filter((frame) => frame.speedLines),
          label,
        ).toEqual([]);
      }
    }
  });

  it("the run ends on the plan's time", async () => {
    for (const count of [2, 6, 12]) {
      const team = names(count);
      const unlucky = unluckyOf(count);
      for (const left of leftAt(count)) {
        // The first ending's seed, as above where it has run already.
        const seed = seedOf(
          team,
          unlucky,
          (plan) => plan.ending === ENDINGS[0] && plan.fallsWith === left,
        );
        const { record, plan } = await runOf(team, unlucky, seed);
        const label = `${count} people, ${left} left, seed ${seed}`;
        expect(Math.abs(record.duration - plan.end), label).toBeLessThanOrEqual(STEP + 1e-9);
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
