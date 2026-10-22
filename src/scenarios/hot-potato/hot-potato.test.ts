import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import hotPotato from './index';
import { held, outOfPlay, ring, type Spot } from './layout';
import { BEATS, planShow, type Beat, type Catch, type Plan, type Twist } from './plan';

const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Luca',
  'Marco',
  'Priya',
  'Tom',
  'Maria Giulia Bianchi-Rossi Jr.',
];

/** The first `count` of the team. */
const names = (count: number) => TEAM.slice(0, count);

/** Plans for seeds 1 to `seeds`. */
function plans(count: number, unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(names(count), unlucky, createRandom(index + 1)),
  );
}

/** How long a throw is in the air. */
const flight = (each: Catch) => each.at - each.thrown;

const before = (plan: Plan) =>
  plan.catches.filter((each) => each.beat === 'plop' || each.beat === 'hot-hands');
const during = (plan: Plan, beat: Beat) => plan.catches.filter((each) => each.beat === beat);
const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);

/** A name tag's box on the stage: as wide as it may grow, two lines high. */
const tagBox = (spot: Spot) => ({
  left: spot.x - spot.tag.maxWidth / 2,
  right: spot.x + spot.tag.maxWidth / 2,
  top: spot.y - 0.04 * spot.size,
  bottom: spot.y - 0.04 * spot.size + 2.4 * spot.tag.size + 8,
});

const overlap = (a: Spot, b: Spot) => {
  const one = tagBox(a);
  const two = tagBox(b);
  return (
    one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom
  );
};

const overlapping = (spots: Spot[]) =>
  spots.some((spot, index) => spots.slice(index + 1).some((other) => overlap(spot, other)));

/** Everyone in play, then the same with each of them out of play. */
const mixes = (count: number): Spot[][] => {
  const spots = ring(count);
  return [spots, ...spots.map((_, out) => spots.map((s, i) => (i === out ? outOfPlay(s) : s)))];
};

/** Every head count, with seeds 1–40. */
function everyPlan(): { label: string; plan: Plan; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 12; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const unlucky = names(count).at(-1)!;
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(names(count), unlucky, createRandom(seed)),
        unlucky,
      });
    }
  }
  return all;
}

describeSpec(await loadFeature('./hot-potato.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Hot Potato', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(hotPotato.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(hotPotato.description).toBe(description);
      });
      And('its picture is 🥔', () => {
        expect(hotPotato.card).toEqual({ emoji: '🥔' });
      });
      And('it takes 2 to 12 people', () => {
        expect(hotPotato.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule("It pops in the unlucky person's hands", ({ RuleScenario }) => {
    RuleScenario('Who catches it first gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 'Luca');
      });
      Then("the potato drops into at least 5 different people's hands first", () => {
        expect(new Set(runs.map((plan) => plan.catches[0]!.by)).size).toBeGreaterThanOrEqual(5);
      });
      And(
        'in some runs the unlucky person catches it before the showdown, and in some runs not',
        () => {
          const early = runs.map((plan) => before(plan).some((each) => each.by === 'Luca'));
          expect(early).toContain(true);
          expect(early).toContain(false);
        },
      );
    });
  });

  Rule(
    'Throws speed up, then slow down for a showdown',
    ({ RuleScenario, RuleScenarioOutline }) => {
      RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, variables) => {
        let plan: Plan;
        let unlucky: string;
        Given('<count> people', () => {});
        When('the show runs', () => {
          const team = names(Number(variables.count));
          unlucky = team[0]!;
          plan = planShow(team, unlucky, createRandom(1));
        });
        Then('each throw before the showdown is quicker than the one before', () => {
          const throws = during(plan, 'hot-hands').map(flight);
          expect(throws.length).toBeGreaterThan(1);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeLessThan(throws[index]!);
          });
        });
        And(
          '<in play> people are left in play for the showdown, the unlucky person among them',
          () => {
            expect(plan.showdown).toHaveLength(Number(variables['in play']));
            expect(plan.showdown).toContain(unlucky);
          },
        );
        And('each throw in the showdown takes longer than the one before', () => {
          const throws = during(plan, 'showdown').map(flight);
          expect(throws).toHaveLength(3);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeGreaterThan(throws[index]!);
          });
        });
      });

      RuleScenario('Who is in the showdown gives nothing away', ({ Given, When, Then }) => {
        let runs: Plan[];
        Given('8 people, with the same unlucky person every time', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plans(8, 'Luca');
        });
        Then(
          'the unlucky person is the first to catch it in the showdown in some runs, and not in others',
          () => {
            const first = runs.map((plan) => during(plan, 'showdown')[0]!.by === 'Luca');
            expect(first).toContain(true);
            expect(first).toContain(false);
          },
        );
      });
    },
  );

  Rule('The last throw can twist', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'The last throw, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let unlucky: string;
        let runs: Plan[];
        const twisted = (twist: Twist) => runs.filter((plan) => plan.twist === twist);
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', () => {
          const count = Number(variables.count);
          unlucky = names(count)[0]!;
          runs = plans(count, unlucky);
        });
        Then(
          'in some runs the last throw goes to someone else, who throws it straight back to the unlucky person',
          () => {
            expect(twisted('back').length).toBeGreaterThan(0);
            for (const plan of twisted('back')) {
              const [away, back] = plan.catches.slice(-2);
              expect(away!.from).toBe(unlucky);
              expect(away!.by).not.toBe(unlucky);
              expect(back!.from).toBe(away!.by);
              expect(back!.by).toBe(unlucky);
            }
          },
        );
        And('in some runs the unlucky person throws it away and it curves back to them', () => {
          expect(twisted('boomerang').length).toBeGreaterThan(0);
          for (const plan of twisted('boomerang')) {
            const last = plan.catches.at(-1)!;
            expect([last.from, last.by]).toEqual([unlucky, unlucky]);
          }
        });
        And('in some runs it simply lands with the unlucky person', () => {
          expect(twisted('straight').length).toBeGreaterThan(0);
          for (const plan of twisted('straight')) {
            const last = plan.catches.at(-1)!;
            expect(last.by).toBe(unlucky);
            expect(last.from).not.toBe(unlucky);
          }
        });
      },
    );
  });

  Rule('The beats keep the show between 14 and 18 seconds', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long', ({ When, Then }) => {
      const runs = new Map<number, Plan>();
      When('the show runs at 12, 8 and 2 people, with the sparkler going out', () => {
        for (const count of [12, 8, 2]) {
          let seed = 1;
          let plan = planShow(names(count), names(count)[0]!, createRandom(seed));
          while (!plan.dud) plan = planShow(names(count), names(count)[0]!, createRandom(++seed));
          runs.set(count, plan);
        }
      });
      Then(
        'its beats take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          const beat: Record<string, Beat> = {
            plop: 'plop',
            'hot hands': 'hot-hands',
            'a dud': 'dud',
            'it relights': 'relight',
            'the showdown': 'showdown',
            'the last throw': 'last-throw',
            'the freeze': 'freeze',
            'the pop': 'pop',
          };
          for (const row of table) {
            for (const count of [12, 8, 2]) {
              const seconds = runs.get(count)!.beats[beat[row.beat!]!];
              const expected = Number(row[`${count} people`]);
              expect(Math.abs(seconds - expected), `${row.beat} at ${count}`).toBeLessThanOrEqual(
                0.3,
              );
            }
          }
        },
      );
    });

    RuleScenario('Every head count lands inside the time limit', ({ When, Then }) => {
      let runs: ReturnType<typeof everyPlan>;
      When(
        'the show runs at every head count from 2 to 12, with and without the sparkler going out',
        () => {
          runs = everyPlan();
          for (let count = 2; count <= 12; count++) {
            const duds = runs
              .filter(({ plan }) => plan.ring.length === count)
              .map(({ plan }) => plan.dud !== null);
            expect(duds, `${count} people`).toContain(true);
            expect(duds, `${count} people`).toContain(false);
          }
        },
      );
      Then('each run lasts between 14 and 18 seconds', () => {
        for (const { label, plan } of runs) {
          expect(total(plan), label).toBeGreaterThanOrEqual(14);
          expect(total(plan), label).toBeLessThanOrEqual(18);
        }
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Names stay readable', ({ When, Then, And }) => {
      let shown: Spot[][];
      When('the show runs at 12 and at 2 people', () => {
        shown = [...mixes(12), ...mixes(2)];
      });
      Then('every name tag is set at 22 pixels or more on the 1280 by 720 stage', () => {
        for (const spots of shown) {
          spots.forEach((spot) => expect(spot.tag.size).toBeGreaterThanOrEqual(22));
        }
      });
      And('with 2 people, both name tags are set at 44 pixels or more', () => {
        ring(2).forEach((spot) => expect(spot.tag.size).toBeGreaterThanOrEqual(44));
      });
      And('no name tag is ever over another', () => {
        for (const spots of shown) expect(overlapping(spots)).toBe(false);
      });
    });
  });
});

describe('The ring', () => {
  it('no tag overlaps at any count', () => {
    for (let count = 2; count <= 12; count++) {
      const spots = ring(count);
      expect(spots, `${count} people`).toHaveLength(count);
      for (const mix of mixes(count)) expect(overlapping(mix), `${count} people`).toBe(false);
      for (let mask = 0; mask < 2 ** count; mask++) {
        const mixed = spots.map((spot, i) => (mask & (1 << i) ? outOfPlay(spot) : spot));
        expect(overlapping(mixed), `${count} people, mask ${mask}`).toBe(false);
      }
    }
  });

  it('8 people match the storyboard', () => {
    const spots = ring(8);
    expect(spots[0]).toMatchObject({ x: 640, y: 260, size: 78 });
    expect(spots[4]).toMatchObject({ x: 640, y: 640, size: 104 });
  });

  it('held is 35 px over the head', () => {
    const spot = ring(8)[0]!;
    expect(held(spot)).toEqual({ x: spot.x, y: spot.y - 0.8 * spot.size - 35 });
  });
});

describe('The plan', () => {
  const all = everyPlan();

  it('hot-hands throws never drop under 0.4 s', () => {
    for (const { label, plan } of all) {
      for (const each of during(plan, 'hot-hands')) {
        expect(flight(each), label).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('nobody throws to themselves', () => {
    for (const { label, plan, unlucky } of all) {
      const { catches } = plan;
      catches.slice(0, -1).forEach((each) => expect(each.from, label).not.toBe(each.by));
      const last = catches.at(-1)!;
      if (plan.twist !== 'boomerang') expect(last.from, label).not.toBe(last.by);
      expect(last.by, label).toBe(unlucky);
      expect(last.sparkler, label).toBe(0);
      catches.slice(0, -1).forEach((each, index) => {
        expect(each.sparkler, label).toBeGreaterThan(0);
        if (index > 0) expect(each.sparkler, label).toBeLessThan(catches[index - 1]!.sparkler);
      });
    }
  });

  it('the catches add up', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.at, label).toBeCloseTo(previous + each.seconds, 9);
      });
      const { beats } = plan;
      const lastThrowEnd =
        beats.plop +
        beats['hot-hands'] +
        beats.dud +
        beats.relight +
        beats.showdown +
        beats['last-throw'];
      expect(plan.catches.at(-1)!.at, label).toBeCloseTo(lastThrowEnd, 9);
    }
  });

  it('each throw leaves after the previous catch and lands later', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.thrown, label).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(each.thrown, label).toBeLessThan(each.at);
      });
    }
  });
});
