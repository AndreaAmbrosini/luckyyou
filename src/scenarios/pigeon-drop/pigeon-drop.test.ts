import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { expect } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import pigeonDrop from './index';
import { pigeonDropMusic, SPEED } from './music';
import { lineUp, planShow, type Plan } from './plan';

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
  'Luca',
];

interface Frame {
  readonly safe: readonly string[];
  readonly pigeonX: number | null;
  readonly flap: string;
}

interface Last {
  readonly person: HTMLElement;
  readonly poos: readonly HTMLElement[];
}

/** The first seed whose show has a poo storm, or doesn't. */
function seedFor(names: readonly string[], unlucky: string, storm: boolean): number {
  let seed = 1;
  while (!!planShow(names, unlucky, createRandom(seed)).storm !== storm) seed++;
  return seed;
}

/** Runs the show and notes, frame by frame, who is safe and where the pigeon is. */
async function watch(
  names: readonly string[],
  unlucky: string,
  seed: number,
  reducedMotion = false,
) {
  const frames: Frame[] = [];
  let last: Last | null = null;
  const record = await runShow(pigeonDrop, {
    names,
    unlucky,
    seed,
    reducedMotion,
    onFrame: (_, stage) => {
      const safe = stage.querySelectorAll<HTMLElement>('[data-person][data-state="safe"]');
      const pigeon = stage.querySelector<HTMLElement>('[data-part="pigeon"]');
      const wing = pigeon?.querySelector<SVGGElement>('[data-part="wing"]');
      frames.push({
        safe: [...safe].map((el) => el.dataset.person!),
        pigeonX: pigeon ? Number(gsap.getProperty(pigeon, 'x')) : null,
        flap: wing?.style.getPropertyValue('--flap') ?? '',
      });
      const person = stage.querySelector<HTMLElement>(`[data-person="${CSS.escape(unlucky)}"]`);
      const poos = stage.querySelectorAll<HTMLElement>(
        `[data-part="poo"][data-on="${CSS.escape(unlucky)}"]`,
      );
      // The last frame on stage; the run removes the stage after it.
      if (person) last = { person, poos: [...poos] };
    },
  });
  return { record, frames, last: last! as Last };
}

/** The frames' safe lists as they change: who turned safe together. */
const waves = (frames: readonly Frame[]) => {
  const seen = new Set<string>();
  return frames.flatMap((frame) => {
    const wave = frame.safe.filter((name) => !seen.has(name));
    for (const name of wave) seen.add(name);
    return wave.length ? [wave] : [];
  });
};

/** The order people turned safe in. */
const missed = (frames: readonly Frame[]) => [...new Set(frames.flatMap((frame) => frame.safe))];

describeSpec(await loadFeature('./pigeon-drop.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Pigeon Drop', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(pigeonDrop.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(pigeonDrop.description).toBe(description);
      });
      And('it takes 2 to 12 people', () => {
        expect(pigeonDrop.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule('Every dropping misses but the last', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        const names = TEAM.slice(0, Number(count));
        let unlucky: string;
        let run: Awaited<ReturnType<typeof watch>>;
        let seed: number;
        Given('<count> people, with the unlucky person <position> in the list', () => {
          unlucky = position === 'first' ? names[0]! : names.at(-1)!;
        });
        And('a show without a poo storm', () => {
          seed = seedFor(names, unlucky, false);
        });
        When('the show runs', async () => {
          run = await watch(names, unlucky, seed);
          expect(run.record.outcome).toBe('finished');
        });
        Then('a pigeon flies over the park', () => {
          const xs = run.frames.flatMap((frame) => (frame.pigeonX === null ? [] : [frame.pigeonX]));
          expect(xs.length).toBeGreaterThan(0);
          expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(300);
        });
        And(
          'every person except the unlucky one is missed, turns happy and leaves, one at a time',
          () => {
            const others = names.filter((name) => name !== unlucky);
            expect([...missed(run.frames)].sort()).toEqual(others.sort());
            run.frames.forEach((frame, index) => {
              const before = run.frames[index - 1]?.safe.length ?? 0;
              expect(frame.safe.length - before).toBeLessThanOrEqual(1);
            });
          },
        );
        And('the unlucky person is never missed', () => {
          expect(run.frames.some((frame) => frame.safe.includes(unlucky))).toBe(false);
        });
        And('the last dropping lands on the unlucky person, who stays on stage, scared', () => {
          expect(run.last.poos.map((poo) => poo.dataset.landed)).toEqual(['hit']);
          expect(run.last.person.dataset.state).toBe('hit');
          expect(run.last.person.dataset.mood).toBe('scared');
          expect(gsap.getProperty(run.last.person, 'autoAlpha')).not.toBe(0);
        });
      },
    );
  });

  Rule('Now and then a poo storm ends it early', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario(
      'About one show in five with 3 or more people has a poo storm',
      ({ When, Then, And }) => {
        const storms = new Map<number, number>();
        When(
          'the show is planned with 500 different random seeds at each head count from 2 to 12',
          () => {
            for (let count = 2; count <= 12; count++) {
              const names = TEAM.slice(0, count);
              let stormy = 0;
              for (let seed = 1; seed <= 500; seed++) {
                if (planShow(names, names[0]!, createRandom(seed)).storm) stormy++;
              }
              storms.set(count, stormy);
            }
          },
        );
        Then('between 15% and 25% of the shows with 3 or more people have a poo storm', () => {
          let stormy = 0;
          for (let count = 3; count <= 12; count++) stormy += storms.get(count)!;
          expect(stormy / (10 * 500)).toBeGreaterThanOrEqual(0.15);
          expect(stormy / (10 * 500)).toBeLessThanOrEqual(0.25);
        });
        And('no show with 2 people has one', () => {
          expect(storms.get(2)).toBe(0);
        });
      },
    );

    RuleScenarioOutline(
      'A poo storm with <count> people',
      ({ Given, When, Then, And }, { count }) => {
        const names = TEAM.slice(0, Number(count));
        const unlucky = names.at(-1)!;
        let seed: number;
        let plan: Plan;
        let run: Awaited<ReturnType<typeof watch>>;
        Given('<count> people, and a show with a poo storm', () => {
          seed = seedFor(names, unlucky, true);
          plan = planShow(names, unlucky, createRandom(seed));
        });
        When('the show runs', async () => {
          run = await watch(names, unlucky, seed);
          expect(run.record.outcome).toBe('finished');
        });
        Then('some droppings miss others, one at a time, before the storm', () => {
          const before = waves(run.frames).slice(0, -1);
          expect(before.length).toBeGreaterThan(0);
          for (const wave of before) expect(wave).toHaveLength(1);
        });
        And('at least one other person is still standing when the storm comes', () => {
          expect(plan.storm!.spared.length).toBeGreaterThan(0);
          expect(plan.storm!.spared).not.toContain(unlucky);
        });
        And('a burst of droppings lands on the unlucky person, who stays on stage, scared', () => {
          expect(run.last.poos.length).toBeGreaterThan(3);
          for (const poo of run.last.poos) expect(poo.dataset.landed).toBe('hit');
          expect(run.last.person.dataset.state).toBe('hit');
          expect(run.last.person.dataset.mood).toBe('scared');
          expect(gsap.getProperty(run.last.person, 'autoAlpha')).not.toBe(0);
        });
        And('everyone still standing is safe at the same moment, happy, and leaves', () => {
          const last = waves(run.frames).at(-1)!;
          expect([...last].sort()).toEqual([...plan.storm!.spared].sort());
          const others = names.filter((name) => name !== unlucky);
          expect([...missed(run.frames)].sort()).toEqual(others.sort());
        });
        And('the show lasts between 15 and 27 seconds', () => {
          expect(run.record.duration).toBeGreaterThanOrEqual(14.95);
          expect(run.record.duration).toBeLessThanOrEqual(27);
        });
      },
    );
  });

  Rule('It lasts 15 to 27 seconds', ({ RuleScenario }) => {
    RuleScenario('Every head count lasts 15 to 27 seconds', ({ When, Then }) => {
      const records: ShowRecord[] = [];
      When('the show runs at every head count from 2 to 12', async () => {
        for (let count = 2; count <= 12; count++) {
          const names = TEAM.slice(0, count);
          records.push(await runShow(pigeonDrop, { names, unlucky: names[0]! }));
        }
      });
      Then('each run lasts between 15 and 27 seconds', () => {
        for (const record of records) {
          expect(record.outcome).toBe('finished');
          expect(record.duration).toBeGreaterThanOrEqual(14.95);
          expect(record.duration).toBeLessThanOrEqual(27);
        }
      });
    });
  });

  Rule('Name tags stay clear', ({ RuleScenario }) => {
    RuleScenario("Name tags don't cover each other or a head", ({ When, Then }) => {
      When('everyone stands in the park, at every head count from 2 to 12', () => {});
      Then("no name tag, two lines high, covers another name tag or another person's head", () => {
        type Box = { left: number; right: number; top: number; bottom: number };
        const apart = (a: Box, b: Box) =>
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        for (let count = 2; count <= 12; count++) {
          const spots = lineUp(count);
          // A chest tag's top is at 76% of the head; two lines at line-height 1.1, padding and borders.
          const tags = spots.map(({ x, feet, size, tag, font }) => ({
            left: x - tag / 2,
            right: x + tag / 2,
            top: feet - 0.24 * size,
            bottom: feet - 0.24 * size + 2.35 * font + 6,
          }));
          const heads = spots.map(({ x, feet, size }) => ({
            left: x - size / 2,
            right: x + size / 2,
            top: feet - size,
            bottom: feet,
          }));
          tags.forEach((tag, i) => {
            expect(tag.bottom, `${count} people`).toBeLessThanOrEqual(720);
            tags.forEach((other, j) => i === j || expect(apart(tag, other), `${count}`).toBe(true));
            heads.forEach(
              (other, j) => i === j || expect(apart(tag, other), `${count}`).toBe(true),
            );
          });
        }
      });
    });
  });

  Rule('The music stops at the splat', ({ RuleScenario }) => {
    RuleScenario(
      'No note plays once a dropping hits the unlucky person',
      ({ Given, When, Then, And }) => {
        let plan: Plan;
        let notes: ReturnType<typeof pigeonDropMusic>['notes'];
        Given('8 people', () => {
          plan = planShow(TEAM.slice(0, 8), 'Hana', createRandom(1));
        });
        When("the show's music is written", () => {
          notes = pigeonDropMusic(plan).notes;
          expect(notes.length).toBeGreaterThan(0);
        });
        Then('no note plays or rings after the first dropping hits the unlucky person', () => {
          for (const note of notes) {
            expect(note.at + note.beats).toBeLessThanOrEqual(plan.hit * SPEED + 1e-9);
          }
          expect(pigeonDropMusic(plan).at(plan.hit + 1).speed).toBe(0);
        });
        And('the bass is gone for the finale', () => {
          const late = notes.filter((note) => note.at >= plan.finale * SPEED);
          expect(late.length).toBeGreaterThan(0);
          expect(late.some((note) => note.voice === 'bass' || note.voice === 'kick')).toBe(false);
        });
      },
    );
  });

  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario(
      'The wings hold still and the droppings fall the same',
      ({ Given, When, Then, And }) => {
        const names = TEAM.slice(0, 6);
        let still: Awaited<ReturnType<typeof watch>>;
        let moving: Awaited<ReturnType<typeof watch>>;
        let seed: number;
        Given('6 people, a show without a poo storm, and reduced motion is on', () => {
          seed = seedFor(names, 'Carla', false);
        });
        When('the show runs', async () => {
          still = await watch(names, 'Carla', seed, true);
          moving = await watch(names, 'Carla', seed, false);
        });
        Then("the pigeon's wings don't flap", () => {
          expect(new Set(still.frames.map((frame) => frame.flap)).size).toBe(1);
          expect(new Set(moving.frames.map((frame) => frame.flap)).size).toBeGreaterThan(1);
        });
        And('the same people are missed, in the same order, as with full motion', () => {
          expect(missed(still.frames)).toEqual(missed(moving.frames));
          expect(missed(still.frames)).toHaveLength(5);
        });
      },
    );
  });
});
