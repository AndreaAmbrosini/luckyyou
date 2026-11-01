import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec, runShow } from '../../scenario-kit/testing';
import theRace from './index';
import styles from './the-race.module.css';
import { COURSES, crossingOf, type Course, type Plan, type RaceEvent } from './plan';
import {
  ENDINGS,
  names,
  COURSE_NAMES,
  plansOn,
  type OnTrack,
  onTrack,
  actOutOwnEvent,
} from './watching';

describeSpec(await loadFeature('./tracks.feature'), ({ Rule }) => {
  Rule("The track is the theme's", ({ RuleScenario, RuleScenarioOutline }) => {
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');

    /** The track each run with seeds 1 to `seeds` is on, as its stage draws it. */
    async function tracksRun(seeds: number, theme?: string) {
      const courses: string[] = [];
      for (let seed = 1; seed <= seeds; seed++) {
        let course = '';
        await runShow(theRace, {
          names: team,
          unlucky,
          seed,
          theme,
          cancelAt: 0.1,
          onFrame: (_, stage) => {
            course ||= stage.querySelector<HTMLElement>('[data-part="track"]')!.dataset.course!;
          },
        });
        courses.push(course);
      }
      return courses;
    }

    RuleScenario('The race runs on the theme chosen', ({ Given, When, Then }) => {
      let theme: Course;
      let runs: string[];
      Given('{string} is chosen on the Line-up', (_, label: string) => {
        theme = theRace.lineUp!.themes!.find((each) => each.label === label)!.name as Course;
      });
      When('the show runs with {int} different random seeds', async (_, seeds: number) => {
        runs = await tracksRun(seeds, theme);
      });
      Then('every run is under the sea', () => {
        expect(runs).toEqual(runs.map(() => 'sea'));
        expect(theme).toBe('sea');
      });
    });

    RuleScenario('In the lab, every theme comes up', ({ Given, When, Then }) => {
      let runs: string[];
      Given('{int} people', (_, count: number) => expect(team).toHaveLength(count));
      When(
        'the show runs in the lab with {int} different random seeds',
        async (_, seeds: number) => {
          runs = await tracksRun(seeds);
        },
      );
      Then(
        'each run is on one of the themes, and each theme comes up in at least {int} runs',
        (_, least: number) => {
          const themes = theRace.lineUp!.themes!.map((each) => each.name);
          for (const course of runs) expect(themes).toContain(course);
          for (const theme of themes) {
            expect(runs.filter((course) => course === theme).length, theme).toBeGreaterThanOrEqual(
              least,
            );
          }
        },
      );
    });

    RuleScenarioOutline(
      '<track> has a stop and a burst of its own',
      ({ Given, When, Then, And }, { track }) => {
        let runs: Plan[];
        Given('8 people, on <track>', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, COURSE_NAMES[track]!, seeds);
        });
        Then(
          `in every run, one event before "Final stretch!" is the track's own stop or burst`,
          () => {
            for (const plan of runs) {
              expect(own(plan)).toHaveLength(1);
              expect(own(plan)[0]!.at).toBeLessThan(plan.times.stretch);
            }
          },
        );
        And('both come up across the runs', () => {
          const kinds = new Set(runs.flatMap((plan) => own(plan).map((event) => event.kind)));
          expect(kinds).toEqual(new Set(['burst', 'stop']));
        });
      },
    );

    RuleScenarioOutline('What <track> looks like', ({ When, Then, And }, { track: name }) => {
      const course = COURSE_NAMES[name]!;
      let run: OnTrack;
      When('the show runs on <track>', async () => {
        run = await onTrack(course);
      });
      Then('the ground is <ground>, and paper name tags read clearly on it', () => {
        const ground = run.track.querySelector('[data-part="ground"]')!;
        const fill = {
          field: styles.grass,
          office: styles.carpet,
          sea: styles.sun,
          moon: styles.dust,
          autumn: styles.bark,
          christmas: styles.snow,
        };
        expect(ground.querySelector(`.${fill[course]}`)).not.toBeNull();
        expect(!!ground.querySelector('[data-part="craters"]')).toBe(course === 'moon');
        const tags = run.stickers.filter((sticker) => sticker.what === 'tag');
        expect(tags.length).toBeGreaterThan(0);
        for (const tag of tags) {
          expect(tag.background).toBe('var(--color-paper)');
          expect(tag.border).toContain('var(--color-ink)');
        }
      });
      And('behind the track is <backdrop>', () => {
        const skies = {
          field: 'sky',
          office: 'paper',
          sea: 'sea',
          moon: 'ink',
          autumn: 'sky',
          christmas: 'sea',
        };
        expect(run.sky).toBe(`var(--color-${skies[course]})`);
        const parts = {
          field: ['flags', 'posts'],
          office: ['wall', 'panels', 'plant'],
          sea: ['surface', 'fish', 'seaweed', 'floats'],
          moon: ['space'],
          autumn: ['leaves', 'park', 'fence', 'piles', 'fallen'],
          christmas: ['night', 'hills', 'village', 'lights'],
        };
        for (const part of parts[course]) {
          expect(run.track.querySelector(`[data-part="${part}"]`), part).not.toBeNull();
        }
        expect(run.track.querySelectorAll(`.${styles.cloud}`)).toHaveLength(
          course === 'field' ? 2 : 0,
        );
      });
      And('the lanes are split by <lines>, and the distances are <signs>', () => {
        const fills = {
          field: styles.paperFill,
          office: styles.sunFill,
          sea: styles.orangeFill,
          moon: styles.paperFill,
          autumn: styles.paperFill,
          christmas: styles.glassFill,
        };
        const lines = [...run.track.querySelectorAll('[data-part="lines"] path')];
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.getAttribute('class')).toBe(fills[course]);
          // Dashes are short: 44 px each, with gaps between.
          expect(line.getAttribute('d')!.includes('h44 ')).toBe(course === 'moon');
        }
        const signs = [...run.track.querySelectorAll('[data-part="sign"]')];
        expect(signs).toHaveLength(5);
        for (const sign of signs) {
          expect(!!sign.querySelector(`.${styles.post}`)).toBe(
            ['field', 'sea', 'moon'].includes(course),
          );
          expect(sign.querySelector('p')!.classList.contains(styles.note!)).toBe(
            course === 'office',
          );
        }
      });
    });

    RuleScenario('The photo shows the track', ({ Given, When, Then }) => {
      let run: OnTrack;
      Given('a photo finish on the Moon', async () => {
        run = await onTrack('moon');
      });
      When('the photo pops up', () => {
        expect(run.photo).not.toBeNull();
      });
      Then("it shows the Moon's ground and its finish line behind the two racers", () => {
        const view = run.photo!.firstElementChild as HTMLElement;
        expect(view.dataset.course).toBe('moon');
        expect(view.classList).toContain(styles.moon);
        const picture = view.querySelector(':scope > svg')!;
        expect(picture.querySelector('rect')!.getAttribute('class')).toBe(styles.shark);
        expect(picture.querySelector(`.${styles.inkFill}`)).not.toBeNull();
        const racers = [...view.querySelectorAll('[data-person]')];
        expect(racers).toHaveLength(2);
        for (const racer of racers) {
          expect(picture.compareDocumentPosition(racer) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }
      });
    });

    RuleScenario('Every track reads over a screen share', ({ When, Then, And }) => {
      const runs: OnTrack[] = [];
      When('the show runs on each track at {int} people', async () => {
        for (const course of COURSES) runs.push(await onTrack(course));
      });
      Then(
        'every caption, sign and name tag is ink text on a paper or sun sticker with an ink outline',
        () => {
          for (const run of runs) {
            const what = new Set(run.stickers.map((sticker) => sticker.what));
            for (const each of ['caption', 'sign', 'tag', 'bubble']) expect(what).toContain(each);
            for (const sticker of run.stickers) {
              expect(['var(--color-paper)', 'var(--color-sun)'], sticker.text).toContain(
                sticker.background,
              );
              expect(sticker.colour, sticker.text).toBe('var(--color-ink)');
              expect(sticker.border, sticker.text).toContain('var(--color-ink)');
            }
          }
        },
      );
      And("on the Moon's dark sky, nothing but those stickers carries text", () => {
        const moon = runs.find((run) => run.watched.plan.course === 'moon')!;
        expect(moon.sky).toBe('var(--color-ink)');
        for (const run of runs) expect(run.loose, run.watched.plan.course).toEqual([]);
      });
    });

    RuleScenarioOutline('On <track>, <caption>', (steps, { track: where, event: kind, caption }) =>
      actOutOwnEvent(steps, {
        course: COURSE_NAMES[where]!,
        kind: kind as RaceEvent['kind'],
        caption,
        when: "someone's event is <track>'s own <event>",
      }),
    );

    RuleScenario('The sports field keeps the events it has', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs on the sports field', () => {
        runs = [2, 5, 8].flatMap((count) => plansOn(names(count), names(count).at(-1)!, 'field'));
      });
      Then("every event is a racer's own burst or stop", () => {
        for (const plan of runs) expect(own(plan)).toEqual([]);
      });
    });

    RuleScenarioOutline(
      'On <track>, the unlucky person still crosses first',
      ({ Given, When, Then }, { track }) => {
        let runs: Plan[];
        Given('8 people, on <track>', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, COURSE_NAMES[track]!, seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing!);
            }
          }
        });
      },
    );

    RuleScenario('Every track keeps the show inside the limit', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at 2, 5 and 8 people on each track, with each ending', () => {
        runs = [2, 5, 8].flatMap((count) =>
          COURSES.flatMap((course) =>
            ENDINGS.flatMap((ending) =>
              plansOn(names(count), names(count).at(-1)!, course, 1, (p) => p.ending === ending),
            ),
          ),
        );
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        expect(runs).toHaveLength(3 * COURSES.length * ENDINGS.length);
        for (const plan of runs) {
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeLessThanOrEqual(most);
        }
      });
    });
  });
});
