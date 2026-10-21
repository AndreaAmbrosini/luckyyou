import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { expect } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import sharkBait from './index';

const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Hana',
  'Ivo',
  'Jonas',
  'Kofi',
  'Marco',
];

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  /** The scene's beat. */
  readonly beat: string;
  /** Who is still in the water. */
  readonly inWater: readonly string[];
  /** Who the rope is heading for, if anyone. */
  readonly aim: string | null;
}

/** One person, or a group, leaving the water at the same moment. */
interface Lift {
  readonly time: number;
  readonly beat: string;
  readonly names: readonly string[];
}

/** A whole show, frame by frame. */
class Watched {
  readonly record: ShowRecord;
  readonly frames: readonly Frame[];

  constructor(record: ShowRecord, frames: readonly Frame[]) {
    this.record = record;
    this.frames = frames;
  }

  /** Every moment someone left the water, in order. */
  get lifts(): Lift[] {
    return this.frames.flatMap((frame, index) => {
      const before = this.frames[index - 1]?.inWater ?? frame.inWater;
      const names = before.filter((name) => !frame.inWater.includes(name));
      return names.length > 0 ? [{ time: frame.time, beat: frame.beat, names }] : [];
    });
  }

  /** How long each beat lasted, in show seconds. */
  get beats(): Map<string, number> {
    const starts = this.frames.filter(
      (frame, index) => frame.beat !== this.frames[index - 1]?.beat,
    );
    return new Map(
      starts.map((start, index) => [
        start.beat,
        (starts[index + 1]?.time ?? this.record.duration) - start.time,
      ]),
    );
  }

  /** Who the rope headed for during `beat`, each change once. */
  aimsDuring(beat: string): string[] {
    const aims: string[] = [];
    for (const frame of this.frames) {
      if (frame.beat === beat && frame.aim && frame.aim !== aims.at(-1)) aims.push(frame.aim);
    }
    return aims;
  }

  /** Who was in the water when `beat` began. */
  inWaterAt(beat: string): readonly string[] {
    return this.frames.find((frame) => frame.beat === beat)?.inWater ?? [];
  }
}

/** Runs Shark Bait and notes what the stage showed every frame. */
async function watch(
  names: readonly string[],
  unlucky: string,
  { seed = 1, step }: { seed?: number; step?: number } = {},
): Promise<Watched> {
  const frames: Frame[] = [];
  const record = await runShow(sharkBait, {
    names,
    unlucky,
    seed,
    step,
    onFrame(time, stage) {
      const scene = stage.querySelector<HTMLElement>('[data-beat]');
      // Once the show is over, the run empties the stage.
      if (!scene) return;
      const swimmers = [...stage.querySelectorAll<HTMLElement>('[data-person]')];
      frames.push({
        time,
        beat: scene.dataset.beat!,
        inWater: swimmers
          .filter((swimmer) => swimmer.dataset.inWater === 'true')
          .map((swimmer) => swimmer.dataset.person!),
        aim: stage.querySelector<HTMLElement>('[data-part="rope"]')?.dataset.aim || null,
      });
    },
  });
  expect(record.outcome).toBe('finished');
  return new Watched(record, frames);
}

/** The beats as the feature's table names them. */
const BEATS: Record<string, string> = {
  'splash-in': 'splash-in',
  'group rescues': 'group-rescues',
  '4 left, one lifted out': 'four-left',
  '3 left, a fake-out': 'fake-out',
  'the duel': 'duel',
  "the shark's run": 'sharks-run',
  'the victory lap': 'victory-lap',
};

describeSpec(await loadFeature('./shark-bait.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Shark Bait', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(sharkBait.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(sharkBait.description).toBe(description);
      });
      And('its picture is 🦈', () => {
        expect(sharkBait.card).toEqual({ emoji: '🦈' });
      });
      And('it takes 2 to 12 people', () => {
        expect(sharkBait.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule(
    'The unlucky person is the last one left in the water',
    ({ RuleScenario, RuleScenarioOutline }) => {
      RuleScenarioOutline(
        '<count> people, the unlucky person <position> in the list',
        ({ Given, When, Then, And }, { count, position }) => {
          const names = TEAM.slice(0, Number(count));
          let unlucky: string;
          let show: Watched;
          Given('<count> people, with the unlucky person <position> in the list', () => {
            unlucky = position === 'first' ? names[0]! : names.at(-1)!;
          });
          When('the show runs', async () => {
            show = await watch(names, unlucky);
          });
          Then('everyone else is lifted out of the water', () => {
            const lifted = show.lifts.flatMap((lift) => lift.names);
            expect(lifted.sort()).toEqual(names.filter((name) => name !== unlucky).sort());
          });
          And('the unlucky person is never lifted out', () => {
            for (const frame of show.frames) expect(frame.inWater).toContain(unlucky);
          });
        },
      );

      RuleScenario('Where people start gives nothing away', ({ Given, When, Then }) => {
        const names = TEAM;
        let unlucky: string;
        const places = new Set<string>();
        Given('12 people, with the same unlucky person every time', () => {
          unlucky = 'Elena';
        });
        When('the show runs with 20 different random seeds', async () => {
          for (let seed = 1; seed <= 20; seed++) {
            let place: string | null = null;
            await runShow(sharkBait, {
              names,
              unlucky,
              seed,
              // Only where people start matters here.
              cancelAt: 0.5,
              onFrame(_, stage) {
                const swimmer = stage.querySelector(`[data-person="${unlucky}"]`);
                place ??= `${gsap.getProperty(swimmer, 'x')},${gsap.getProperty(swimmer, 'y')}`;
              },
            });
            places.add(place!);
          }
        });
        Then('the unlucky person starts in at least 5 different places', () => {
          expect(places.size).toBeGreaterThanOrEqual(5);
        });
      });
    },
  );

  Rule('Rescues start fast and slow down from 4 left', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, { count, fast, slow }) => {
      let names: string[];
      let show: Watched;
      Given('<count> people', () => {
        names = TEAM.slice(0, Number(count));
      });
      When('the show runs', async () => {
        show = await watch(names, names[0]!);
      });
      Then('<fast> leave in quick group rescues', () => {
        const groups = show.lifts.filter((lift) => lift.beat === 'group-rescues');
        expect(groups.flatMap((lift) => lift.names)).toHaveLength(Number(fast));
      });
      And('<slow> leave one at a time, each rescue taking longer than the one before', () => {
        const singles = show.lifts.filter((lift) => lift.beat !== 'group-rescues');
        expect(singles).toHaveLength(Number(slow));
        for (const lift of singles) expect(lift.names).toHaveLength(1);
        const lengths = singles.map((lift) => show.beats.get(lift.beat)!);
        // Each one-at-a-time rescue has a beat of its own.
        expect(new Set(singles.map((lift) => lift.beat)).size).toBe(singles.length);
        lengths.slice(1).forEach((length, index) => {
          expect(length).toBeGreaterThan(lengths[index]!);
        });
      });
    });

    RuleScenario('Group rescues stay few and small', ({ Given, When, Then, And }) => {
      let show: Watched;
      Given('12 people', () => {});
      When('the show runs', async () => {
        show = await watch(TEAM, 'Marco');
      });
      Then('there are at most 2 group rescues', () => {
        const groups = show.lifts.filter((lift) => lift.beat === 'group-rescues');
        expect(groups.length).toBeGreaterThan(0);
        expect(groups.length).toBeLessThanOrEqual(2);
      });
      And('none lifts more than 4 people', () => {
        for (const lift of show.lifts) expect(lift.names.length).toBeLessThanOrEqual(4);
      });
    });

    RuleScenario('The last two get a duel', ({ Given, When, Then, And }) => {
      let show: Watched | undefined;
      Given(
        'the last two in the water are {string}, the unlucky person, and {string}',
        async (_, unlucky: string, other: string) => {
          // With three people, a few seeds give a duel between these two.
          for (let seed = 1; seed <= 10 && !show; seed++) {
            const run = await watch(['Anna', other, unlucky], unlucky, { seed });
            if (run.inWaterAt('duel').includes(other)) show = run;
          }
          expect(show).toBeDefined();
        },
      );
      When('the rope comes down for them', () => {
        expect(show!.inWaterAt('duel').toSorted()).toEqual(['Giulia', 'Marco']);
      });
      Then('it goes towards {string} first', (_, name: string) => {
        expect(show!.aimsDuring('duel')[0]).toBe(name);
      });
      And('it swings to {string}, who is lifted out', (_, name: string) => {
        expect(show!.aimsDuring('duel').at(-1)).toBe(name);
        const lift = show!.lifts.find((each) => each.beat === 'duel');
        expect(lift?.names).toEqual([name]);
      });
    });

    RuleScenario('With 2 people, the duel swings longer', ({ Given, When, Then }) => {
      let show: Watched;
      Given('2 people', () => {});
      When('the show runs', async () => {
        show = await watch(['Marco', 'Giulia'], 'Marco');
      });
      Then('the rope swings between them at least 3 times before it lifts one', () => {
        const aims = show.aimsDuring('duel');
        expect(aims.length - 1).toBeGreaterThanOrEqual(3);
        expect(aims.at(-1)).toBe('Giulia');
      });
    });

    RuleScenario('Fake-outs go both ways', ({ Given, When, Then, And }) => {
      /** For each run, the rope's aims in the rescue at 3 left, and who it lifted. */
      const rescues: { aims: string[]; lifted: string }[] = [];
      Given('12 people', () => {});
      When('the show runs with 20 different random seeds', async () => {
        for (let seed = 1; seed <= 20; seed++) {
          // Five frames a second still sees every aim: each lasts 0.4 seconds or more.
          const show = await watch(TEAM, 'Marco', { seed, step: 0.2 });
          const lift = show.lifts.find((each) => each.beat === 'fake-out')!;
          rescues.push({ aims: show.aimsDuring('fake-out'), lifted: lift.names[0]! });
        }
      });
      Then('in some runs a one-at-a-time rescue swings away and back to the same person', () => {
        const awayAndBack = rescues.filter(
          ({ aims, lifted }) => aims.length >= 3 && aims[0] === lifted && aims.at(-1) === lifted,
        );
        expect(awayAndBack.length).toBeGreaterThan(0);
      });
      And('in some runs it swings to someone else', () => {
        const elsewhere = rescues.filter(
          ({ aims, lifted }) => aims.length >= 2 && aims[0] !== lifted && aims.at(-1) === lifted,
        );
        expect(elsewhere.length).toBeGreaterThan(0);
      });
    });
  });

  Rule('The beats keep the show between 11 and 14 seconds', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long', ({ When, Then }) => {
      const shows = new Map<number, Watched>();
      When('the show runs at 12, 4 and 2 people', async () => {
        for (const count of [12, 4, 2]) {
          const names = TEAM.slice(0, count);
          shows.set(count, await watch(names, names[0]!));
        }
      });
      Then(
        'its beats take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          for (const row of table) {
            for (const count of [12, 4, 2]) {
              const seconds = shows.get(count)!.beats.get(BEATS[row.beat!]!) ?? 0;
              const expected = Number(row[`${count} people`]);
              expect(Math.abs(seconds - expected), `${row.beat} at ${count}`).toBeLessThanOrEqual(
                0.3,
              );
            }
          }
        },
      );
    });

    RuleScenario('Every head count lands in the middle of the time limit', ({ When, Then }) => {
      const records: ShowRecord[] = [];
      When('the show runs at every head count from 2 to 12', async () => {
        for (let count = 2; count <= 12; count++) {
          const names = TEAM.slice(0, count);
          records.push((await watch(names, names.at(-1)!)).record);
        }
      });
      Then('each run lasts between 11 and 14 seconds', () => {
        for (const record of records) {
          expect(record.duration).toBeGreaterThanOrEqual(11);
          expect(record.duration).toBeLessThanOrEqual(14);
        }
      });
    });
  });
});
