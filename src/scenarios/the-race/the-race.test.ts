import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec } from '../../scenario-kit/testing';
import theRace from './index';
import {
  crossingOf,
  eventCount,
  leaderAt,
  orderAt,
  planShow,
  spacing,
  STOP,
  type Ending,
  type Plan,
} from './plan';

const ENDINGS: readonly Ending[] = ['photo', 'brake', 'surge'];

/** Names up to 15 characters: the last is as long as the layout plans for. */
const TEAM = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Fabio', 'Giulia', 'Annamaria Rossi'];

const names = (count: number) => TEAM.slice(0, count);

/** Plans for seeds 1 to `seeds`. */
function plans(team: readonly string[], unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(team, unlucky, createRandom(index + 1)),
  );
}

/** Show seconds from `from` to `to`, every frame. */
function* frames(from: number, to: number, step = 1 / 30) {
  for (let t = from; t <= to + 1e-9; t += step) yield t;
}

/** Every head count with seeds 1–40, the last of the team unlucky. */
function everyPlan(): { label: string; plan: Plan; team: string[]; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 8; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const team = names(count);
      const unlucky = team.at(-1)!;
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(team, unlucky, createRandom(seed)),
        team,
        unlucky,
      });
    }
  }
  return all;
}

describeSpec(await loadFeature('./the-race.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows The Race', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => expect(theRace.name).toBe(name));
      And('its description is {string}', (_, text: string) =>
        expect(theRace.description).toBe(text),
      );
      And('its picture is 🏁', () => expect(theRace.card).toEqual({ emoji: '🏁' }));
      And('it takes {int} to {int} people', (_, min: number, max: number) =>
        expect(theRace.people).toEqual({ min, max }),
      );
      And('it has a line-up', () => expect(theRace.lineUp).toBeDefined());
    });
  });

  Rule('The unlucky person crosses first', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        const team = names(Number(count));
        let unlucky: string;
        let runs: Plan[];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          unlucky = position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plans(team, unlucky, seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
          }
        });
        And("nobody else's nose reaches the line before theirs", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky)!;
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing);
            }
          }
        });
      },
    );

    RuleScenario('Nobody wins out of nowhere', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('from "Final stretch!" on, the unlucky person is always among the front three', () => {
        for (const plan of runs) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(3);
          }
        }
      });
      And('in the photo finish and the late brake, among the front two', () => {
        for (const plan of runs.filter((each) => each.ending !== 'surge')) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(2);
          }
        }
      });
    });

    RuleScenario('Who leads gives nothing away', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people, with the same unlucky person every time', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('the first to take the lead is at least {int} different people', (_, least: number) => {
        const first = new Set(runs.map((plan) => leaderAt(plan, plan.times.go + 0.3)));
        expect(first.size).toBeGreaterThanOrEqual(least);
      });
      And(
        'the unlucky person leads before the final stretch in some runs and not in others',
        () => {
          const leads = runs.map((plan) =>
            [...frames(plan.times.go + 0.1, plan.times.stretch)].some(
              (t) => leaderAt(plan, t) === unlucky,
            ),
          );
          expect(leads).toContain(true);
          expect(leads).toContain(false);
        },
      );
      And(
        'the others in the front group of the final stretch are at least {int} different people across the runs',
        (_, least: number) => {
          const others = new Set(
            runs.flatMap((plan) =>
              orderAt(plan, plan.times.stretch + 1.5)
                .slice(0, 3)
                .filter((name) => name !== unlucky),
            ),
          );
          expect(others.size).toBeGreaterThanOrEqual(least);
        },
      );
    });
  });

  Rule('The last moment could go three ways', ({ RuleScenario }) => {
    RuleScenario('The ending, over many runs', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(names(8), names(8).at(-1)!, seeds);
      });
      Then('about half end in a photo finish, and the rest in a late brake or a surge', () => {
        const share = (ending: Ending) => runs.filter((plan) => plan.ending === ending).length;
        expect(share('photo') / runs.length).toBeGreaterThanOrEqual(0.35);
        expect(share('photo') / runs.length).toBeLessThanOrEqual(0.65);
        expect(share('brake')).toBeGreaterThan(0);
        expect(share('surge')).toBeGreaterThan(0);
      });
    });
  });

  Rule('The beats keep every show inside the limit', ({ RuleScenario }) => {
    /** For each ending, the first of seeds 1–40 whose plan ends that way. */
    const byEnding = (count: number) =>
      ENDINGS.map((ending) => {
        const team = names(count);
        const plan = plans(team, team.at(-1)!, 40).find((each) => each.ending === ending);
        if (!plan) throw new Error(`No ${ending} with ${count} people.`);
        return plan;
      });

    RuleScenario('About 20 to 22 seconds at 8 people', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with each ending', () => {
        runs = byEnding(8);
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end, plan.ending).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, plan.ending).toBeLessThanOrEqual(most);
        }
      });
    });

    RuleScenario('Every head count lands between 14 and 25 seconds', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at every head count from 2 to 8, with each ending', () => {
        runs = Array.from({ length: 7 }, (_, i) => byEnding(i + 2)).flat();
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end).toBeGreaterThanOrEqual(least);
          expect(plan.times.end).toBeLessThanOrEqual(most);
        }
      });
    });
  });
});

describe('the plan', () => {
  const all = everyPlan();

  it('lasts 14 to 25 seconds at every head count, with every ending, seeds 1–40', () => {
    for (const { label, plan } of all) {
      expect(plan.times.end, label).toBeGreaterThanOrEqual(14);
      expect(plan.times.end, label).toBeLessThanOrEqual(25);
    }
  });

  it('has the rival and the third from the others, the third only from 3 people', () => {
    for (const { label, plan, team, unlucky } of all) {
      expect(team, label).toContain(plan.rival);
      expect(plan.rival, label).not.toBe(unlucky);
      if (team.length === 2) expect(plan.third, label).toBeNull();
      else expect([unlucky, plan.rival], label).not.toContain(plan.third);
    }
  });

  it('puts the rival beside the unlucky person at the line, or just ahead for a brake or a surge', () => {
    for (const { label, plan, unlucky } of all) {
      const front = orderAt(plan, plan.times.slow);
      if (plan.ending === 'brake') expect(front.slice(0, 2), label).toEqual([plan.rival, unlucky]);
      if (plan.ending === 'surge' && plan.third) {
        expect(front.slice(0, 3), label).toEqual([plan.rival, plan.third, unlucky]);
      }
      if (plan.ending === 'photo') {
        expect([...front.slice(0, 2)].sort(), label).toEqual([plan.rival, unlucky].sort());
      }
    }
  });

  it('has its events one at a time, bursts and then the leader stopping', () => {
    for (const { label, plan, team, unlucky } of all) {
      const count = team.length;
      expect(plan.events, label).toHaveLength(eventCount(count));
      const bursts = plan.events.filter((event) => event.kind === 'burst');
      expect(plan.events.slice(0, bursts.length).every((event) => event.kind === 'burst')).toBe(
        true,
      );
      plan.events.forEach((event, i) => {
        if (i > 0) expect(event.at - plan.events[i - 1]!.at, label).toBeCloseTo(spacing(count));
        expect(event.at - (plan.events[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(2.5);
        if (event.kind === 'stop') {
          expect(event.subject, label).not.toBe(unlucky);
          expect(leaderAt(plan, event.at), label).toBe(event.subject);
          expect(orderAt(plan, event.at + STOP.off)[0], label).not.toBe(event.subject);
        } else {
          expect(leaderAt(plan, event.at + 0.01), label).not.toBe(event.subject);
          expect(leaderAt(plan, event.at + 0.9), label).toBe(event.subject);
        }
      });
      expect(plan.events.at(-1)!.at + spacing(count), label).toBeCloseTo(plan.times.stretch);
    }
  });

  it('starts everyone with their noses on the line, and springs them off together at "Go!"', () => {
    for (const { label, plan, team } of all.slice(0, 80)) {
      const ranks = orderAt(plan, plan.times.go + 0.3);
      expect(ranks, label).toEqual(plan.setOff);
      expect(new Set(team.map((name) => orderAt(plan, 0).indexOf(name))).size).toBe(team.length);
    }
  });

  it('crosses with the unlucky nose first in every run', () => {
    for (const { label, plan, team, unlucky } of all) {
      const crossing = crossingOf(plan, unlucky);
      expect(crossing, label).not.toBeNull();
      for (const name of team.filter((each) => each !== unlucky)) {
        const theirs = crossingOf(plan, name);
        if (theirs !== null) expect(theirs, label).toBeGreaterThan(crossing!);
      }
    }
  });
});
