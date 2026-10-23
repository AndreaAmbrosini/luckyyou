import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import wobblyTower from './index';
import {
  BEATS,
  planShow,
  type Beat,
  type Ending,
  type Plan,
  type PointerMove,
  type Turn,
} from './plan';

const POINTER_MOVES: readonly PointerMove[] = ['straight', 'fake-out', 'again'];
const ENDINGS: readonly Ending[] = ['dead-still', 'it-holds', 'slow-lean'];

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
/** The unlucky person in plan-level runs: the last of the first `count`. */
const unluckyOf = (count: number) => names(count).at(-1)!;

/** Plans for seeds 1 to `seeds`. */
function plans(count: number, seeds = 20, unlucky = unluckyOf(count)): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(names(count), unlucky, createRandom(index + 1)),
  );
}

const during = (plan: Plan, beat: Beat) => plan.turns.filter((turn) => turn.beat === beat);
const only = (plan: Plan, beat: Beat): Turn => {
  const turns = during(plan, beat);
  expect(turns).toHaveLength(1);
  return turns[0]!;
};
const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);
/** When `beat` starts, in show seconds. */
const startOf = (plan: Plan, beat: Beat) =>
  BEATS.slice(0, BEATS.indexOf(beat)).reduce((seconds, each) => seconds + plan.beats[each], 0);
/** Whether anyone takes two turns in a row, the last turn left out. */
const repeatsBeforeLast = (plan: Plan) =>
  plan.turns.slice(0, -1).some((turn, index) => index > 0 && turn.by === plan.turns[index - 1]!.by);

/** Every head count, with seeds 1–40. */
function everyPlan(): { label: string; plan: Plan; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 12; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const unlucky = unluckyOf(count);
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(names(count), unlucky, createRandom(seed)),
        unlucky,
      });
    }
  }
  return all;
}

describeSpec(await loadFeature('./wobbly-tower.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Wobbly Tower', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(wobblyTower.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(wobblyTower.description).toBe(description);
      });
      And('its picture is 🧱', () => {
        expect(wobblyTower.card).toEqual({ emoji: '🧱' });
      });
      And('it takes 2 to 12 people', () => {
        expect(wobblyTower.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule("It falls on the unlucky person's turn", ({ RuleScenario }) => {
    RuleScenario('Who goes first gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 20, 'Luca');
      });
      Then('the first turn goes to at least 5 different people', () => {
        expect(new Set(runs.map((plan) => plan.turns[0]!.by)).size).toBeGreaterThanOrEqual(5);
      });
      And(
        'in some runs the unlucky person has a turn before the last, and in some runs not',
        () => {
          const early = runs.map((plan) =>
            plan.turns.slice(0, -1).some((turn) => turn.by === 'Luca'),
          );
          expect(early).toContain(true);
          expect(early).toContain(false);
        },
      );
    });

    RuleScenario('A turn makes nobody safe', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8);
      });
      Then('in some runs someone has two turns or more', () => {
        const twice = runs.map((plan) => {
          const takers = plan.turns.map((turn) => turn.by);
          return new Set(takers).size < takers.length;
        });
        expect(twice).toContain(true);
      });
      And(
        'with 3 people or more, nobody has two turns in a row, except when the pointer stays for {string}',
        () => {
          for (let count = 3; count <= 12; count++) {
            plans(count).forEach((plan, index) => {
              plan.turns.slice(1).forEach((turn, at) => {
                const again = plan.pointer === 'again' && turn.beat === 'last-turn';
                if (!again) {
                  expect(turn.by, `${count} people, seed ${index + 1}`).not.toBe(
                    plan.turns[at]!.by,
                  );
                }
              });
            });
          }
        },
      );
    });

    RuleScenario("With 2 people, turns don't just alternate", ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('2 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(2);
      });
      Then('in some runs the same person has two turns in a row before the last turn', () => {
        expect(runs.map(repeatsBeforeLast)).toContain(true);
      });
    });

    RuleScenario('At 12, some never get a turn', ({ Given, When, Then }) => {
      let plan: Plan;
      Given('12 people', () => {});
      When('the show runs', () => {
        plan = planShow(names(12), unluckyOf(12), createRandom(1));
      });
      Then('at least 3 people never get a turn', () => {
        const takers = new Set(plan.turns.map((turn) => turn.by));
        expect(12 - takers.size).toBeGreaterThanOrEqual(3);
      });
    });
  });

  Rule('The pointer picks each turn', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'Stack it up, each turn quicker, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let runs: Plan[];
        Given('<count> people', () => {});
        When('the show runs', () => {
          runs = plans(Number(variables.count));
        });
        Then('there are 2 to 4 quick turns before the big wobble', () => {
          for (const plan of runs) {
            const wobble = plan.turns.findIndex((turn) => turn.beat === 'wobble');
            const before = plan.turns.slice(0, wobble);
            expect(before.length).toBeGreaterThanOrEqual(2);
            expect(before.length).toBeLessThanOrEqual(4);
            for (const turn of before) expect(turn.beat).toBe('stack');
          }
          expect(new Set(runs.map((plan) => during(plan, 'stack').length)).size).toBe(3);
        });
        And('each quick turn is quicker than the one before', () => {
          for (const plan of runs) {
            during(plan, 'stack')
              .slice(1)
              .forEach((turn, index) => {
                expect(turn.seconds).toBeLessThan(during(plan, 'stack')[index]!.seconds);
              });
          }
        });
      },
    );
  });

  Rule('The tower sways and holds', ({ RuleScenario }) => {
    RuleScenario('The big wobble gives nothing away', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 20, 'Luca');
      });
      Then("the big wobble is on the unlucky person's turn in some runs, and not in others", () => {
        const theirs = runs.map((plan) => only(plan, 'wobble').by === 'Luca');
        expect(theirs).toContain(true);
        expect(theirs).toContain(false);
      });
    });

    RuleScenario("Its height doesn't count down to the end", ({ When, Then, And }) => {
      let heights: number[];
      When('the show runs with 20 different random seeds', () => {
        // Two paper blocks, then one for each turn.
        heights = plans(8).map((plan) => 2 + plan.turns.length);
      });
      Then('the tower ends at 9 to 11 blocks', () => {
        for (const height of heights) {
          expect(height).toBeGreaterThanOrEqual(9);
          expect(height).toBeLessThanOrEqual(11);
        }
      });
      And('it ends at more than one height', () => {
        expect(new Set(heights).size).toBeGreaterThan(1);
      });
    });
  });

  Rule('Nearly! The biggest wobble is a false alarm', ({ RuleScenario }) => {
    RuleScenario('Who nearly topples it gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plans(8, 30, 'Luca');
      });
      Then('{string} happens to at least 3 different people', () => {
        expect(new Set(runs.map((plan) => only(plan, 'nearly').by)).size).toBeGreaterThanOrEqual(3);
      });
      And('in some runs it happens to the unlucky person', () => {
        expect(runs.map((plan) => only(plan, 'nearly').by)).toContain('Luca');
      });
    });
  });

  Rule('The last turn could go three ways', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'The pointer on the last turn, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let unlucky: string;
        let runs: Plan[];
        /** The runs whose pointer moves `move`, at least one. */
        const runsWith = (move: PointerMove) => {
          const found = runs.filter((plan) => plan.pointer === move);
          expect(found.length, `no ${move} in 30 seeds`).toBeGreaterThan(0);
          return found;
        };
        Given('<count> people', () => {
          unlucky = unluckyOf(Number(variables.count));
        });
        When('the show runs with 30 different random seeds', () => {
          runs = plans(Number(variables.count), 30, unlucky);
        });
        Then('in some runs the pointer goes straight to the unlucky person', () => {
          for (const plan of runsWith('straight')) {
            const last = only(plan, 'last-turn');
            expect(last.by).toBe(unlucky);
            expect(last.decoy).toBeNull();
            expect(plan.phew).toBeNull();
          }
        });
        And(
          'in some runs it stops on someone else first, who says {string}, then hops to the unlucky person',
          () => {
            for (const plan of runsWith('fake-out')) {
              const last = only(plan, 'last-turn');
              expect(last.by).toBe(unlucky);
              expect(last.decoy).not.toBeNull();
              expect(last.decoy).not.toBe(unlucky);
              expect(plan.phew).toBe(last.decoy);
              expect(last.decoyStops!).toBeLessThan(last.stops);
            }
          },
        );
        And(
          'in some runs the unlucky person had {string}, the pointer stays on them, and they say {string}',
          () => {
            for (const plan of runsWith('again')) {
              const last = only(plan, 'last-turn');
              expect(only(plan, 'nearly').by).toBe(unlucky);
              expect(last.by).toBe(unlucky);
              expect(last.decoy).toBeNull();
              expect(plan.phew).toBeNull();
            }
          },
        );
      },
    );

    RuleScenarioOutline(
      'The ending, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let unlucky: string;
        let runs: Plan[];
        const runsWith = (ending: Ending) => {
          const found = runs.filter((plan) => plan.ending === ending);
          expect(found.length, `no ${ending} in 30 seeds`).toBeGreaterThan(0);
          return found;
        };
        Given('<count> people', () => {
          unlucky = unluckyOf(Number(variables.count));
        });
        When('the show runs with 30 different random seeds', () => {
          runs = plans(Number(variables.count), 30, unlucky);
        });
        Then(
          'in some runs the block lands, the tower goes dead still, {string}, and it falls',
          () => {
            for (const plan of runsWith('dead-still')) {
              const last = only(plan, 'last-turn');
              expect(plan.still.from).toBeCloseTo(last.lands, 9);
              expect(last.lean.degrees).toBe(0);
              expect(plan.falls).toBe(unlucky);
            }
          },
        );
        And(
          'in some runs it sways, settles, the unlucky person cheers {string}, and then the top block slides off and it falls',
          () => {
            for (const plan of runsWith('it-holds')) {
              const last = only(plan, 'last-turn');
              expect(last.lean.degrees).toBeGreaterThan(0);
              expect(plan.still.from).toBeGreaterThan(last.lands);
              expect(plan.falls).toBe(unlucky);
            }
          },
        );
        And(
          'in some runs the block is set down gently, the tower leans slowly toward the unlucky person, holds at the tipping point, and falls',
          () => {
            for (const plan of runsWith('slow-lean')) {
              const last = only(plan, 'last-turn');
              expect(last.lean).toEqual({ degrees: 20, toward: unlucky });
              expect(plan.still.from).toBeGreaterThan(last.lands);
              expect(plan.falls).toBe(unlucky);
            }
          },
        );
      },
    );
  });

  Rule('The beats keep every show a second or more inside the limit', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long now', ({ When, Then }) => {
      const runs = new Map<number, Plan>();
      When('the show runs at 12, 8 and 2 people, with the pigeon', () => {
        for (const count of [12, 8, 2]) {
          let seed = 1;
          let plan = planShow(names(count), unluckyOf(count), createRandom(seed));
          while (!plan.pigeon)
            plan = planShow(names(count), unluckyOf(count), createRandom(++seed));
          runs.set(count, plan);
        }
      });
      Then(
        'its beats take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          const beat: Record<string, Beat> = {
            thunk: 'thunk',
            'stack it up': 'stack',
            'the big wobble': 'wobble',
            'a pigeon': 'pigeon',
            'careful now': 'careful',
            nearly: 'nearly',
            'the last turn': 'last-turn',
            timber: 'timber',
          };
          expect(table.map((row) => beat[row.beat!])).toEqual(BEATS);
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

    RuleScenario('Every head count lands inside the limits', ({ When, Then, And }) => {
      let runs: ReturnType<typeof everyPlan>;
      When('the show runs at every head count from 2 to 12, with and without the pigeon', () => {
        runs = everyPlan();
        for (let count = 2; count <= 12; count++) {
          const pigeons = runs
            .filter(({ plan }) => plan.order.length === count)
            .map(({ plan }) => plan.pigeon);
          expect(pigeons, `${count} people`).toContain(true);
          expect(pigeons, `${count} people`).toContain(false);
        }
      });
      Then('each run with the pigeon lasts between 17.9 and 18.5 seconds', () => {
        for (const { label, plan } of runs.filter((run) => run.plan.pigeon)) {
          expect(total(plan), label).toBeGreaterThanOrEqual(17.9);
          expect(total(plan), label).toBeLessThanOrEqual(18.5);
        }
      });
      And('each run without it lasts between 16.5 and 17.1 seconds', () => {
        for (const { label, plan } of runs.filter((run) => !run.plan.pigeon)) {
          expect(total(plan), label).toBeGreaterThanOrEqual(16.5);
          expect(total(plan), label).toBeLessThanOrEqual(17.1);
        }
      });
    });
  });
});

describe('The plan', () => {
  const all = everyPlan();

  it('quick turns never drop under 0.6 s', () => {
    for (const { label, plan } of all) {
      for (const turn of during(plan, 'stack')) {
        expect(turn.seconds, label).toBeGreaterThanOrEqual(0.6);
        // The toss, from the pointer's stop to the landing, stays readable.
        expect(turn.lands - turn.stops, label).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('every turn follows the turn rules', () => {
    for (let count = 2; count <= 12; count++) {
      const unlucky = unluckyOf(count);
      const seeds = Array.from({ length: 50 }, (_, index) => index + 1);
      // Every pointer move with every ending, the first seed past 50 that
      // has it when seeds 1–50 don't.
      for (const pointer of POINTER_MOVES) {
        for (const ending of ENDINGS) {
          const has = (seed: number) => {
            const plan = planShow(names(count), unlucky, createRandom(seed));
            return plan.pointer === pointer && plan.ending === ending;
          };
          if (!seeds.some(has)) {
            let seed = 51;
            while (!has(seed)) seed++;
            seeds.push(seed);
          }
        }
      }
      for (const seed of seeds) {
        const label = `${count} people, seed ${seed}`;
        const plan = planShow(names(count), unlucky, createRandom(seed));
        const { turns } = plan;
        expect(turns.at(-1)!.by, label).toBe(unlucky);
        expect(turns.at(-1)!.beat, label).toBe('last-turn');
        expect(
          turns.filter((turn) => turn.beat === 'last-turn'),
          label,
        ).toHaveLength(1);
        turns.forEach((turn, index) => {
          expect(names(count), label).toContain(turn.by);
          if (turn.decoy !== null) {
            expect(names(count), label).toContain(turn.decoy);
            expect(turn.decoy, label).not.toBe(turn.by);
          }
          const again = plan.pointer === 'again' && turn.beat === 'last-turn';
          if (count >= 3 && index > 0 && !again) {
            expect(turn.by, label).not.toBe(turns[index - 1]!.by);
          }
        });
        for (const turn of during(plan, 'careful')) expect(turn.decoy, label).not.toBeNull();
        for (const beat of ['stack', 'wobble', 'nearly'] as const) {
          for (const turn of during(plan, beat)) expect(turn.decoy, label).toBeNull();
        }
        const last = turns.at(-1)!;
        expect(last.decoy !== null, label).toBe(plan.pointer === 'fake-out');
        expect(plan.phew, label).toBe(last.decoy);
        expect(only(plan, 'nearly').by === unlucky, label).toBe(plan.pointer === 'again');
        expect(plan.falls, label).toBe(unlucky);
      }
    }
  });

  it('the turns add up', () => {
    for (const { label, plan } of all) {
      const { turns } = plan;
      expect(
        turns.map((turn) => turn.beat),
        label,
      ).toEqual([
        ...during(plan, 'stack').map(() => 'stack'),
        'wobble',
        'careful',
        'careful',
        'nearly',
        'last-turn',
      ]);
      // Each turn starts where the one before ends; the careful turns start
      // after the pigeon's beat.
      turns.forEach((turn, index) => {
        const previous = turns[index - 1];
        const from =
          index === 0
            ? startOf(plan, 'stack')
            : turn.beat === 'careful' && previous!.beat === 'wobble'
              ? startOf(plan, 'careful')
              : previous!.from + previous!.seconds;
        expect(turn.from, label).toBeCloseTo(from, 9);
        expect(turn.from, label).toBeGreaterThanOrEqual(startOf(plan, turn.beat) - 1e-9);
        if (turn.decoyStops !== null) {
          expect(turn.decoyStops, label).toBeGreaterThan(turn.from);
          expect(turn.decoyStops, label).toBeLessThan(turn.stops);
        }
        expect(turn.stops, label).toBeGreaterThan(turn.from);
        expect(turn.lands, label).toBeGreaterThan(turn.stops);
        expect(turn.lands, label).toBeLessThan(turn.from + turn.seconds);
      });
      // Each beat's turns fill it, and the last ends where timber starts.
      const wobble = only(plan, 'wobble');
      expect(wobble.from + wobble.seconds, label).toBeCloseTo(startOf(plan, 'pigeon'), 9);
      const last = turns.at(-1)!;
      expect(last.from + last.seconds, label).toBeCloseTo(startOf(plan, 'timber'), 9);
    }
  });

  it('Nearly is the biggest lean before the fall', () => {
    for (const { label, plan } of all) {
      const nearly = only(plan, 'nearly');
      expect(nearly.lean).toEqual({ degrees: 22, toward: nearly.by });
      for (const turn of plan.turns) {
        if (turn !== nearly) expect(turn.lean.degrees, label).toBeLessThan(nearly.lean.degrees);
      }
      for (const turn of during(plan, 'stack')) {
        expect(turn.lean.degrees, label).toBeGreaterThanOrEqual(2);
        expect(turn.lean.degrees, label).toBeLessThanOrEqual(3);
        expect([-1, 1], label).toContain(turn.lean.toward);
      }
      const wobble = only(plan, 'wobble');
      expect(wobble.lean.degrees, label).toBe(7);
      expect([-1, 1], label).toContain(wobble.lean.toward);
    }
    const sides = all.map(({ plan }) => only(plan, 'wobble').lean.toward);
    expect(sides).toContain(-1);
    expect(sides).toContain(1);
  });

  it('the heartbeat quickens until the last block, and the tower is still before the fall', () => {
    for (const { label, plan } of all) {
      const last = plan.turns.at(-1)!;
      const T = startOf(plan, 'timber');
      const { heartbeats } = plan;
      expect(heartbeats[0], label).toBeCloseTo(startOf(plan, 'careful'), 9);
      expect(heartbeats.at(-1)!, label).toBeLessThan(last.lands);
      const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
      expect(gaps[0], label).toBeCloseTo(0.9, 9);
      gaps.forEach((gap, index) => {
        expect(gap, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (index > 0) expect(gap, label).toBeLessThanOrEqual(gaps[index - 1]! + 1e-9);
      });
      expect(plan.still.to, label).toBeCloseTo(T, 9);
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(last.lands - 1e-9);
    }
  });

  it('the standing order is everyone, shuffled', () => {
    const orders = plans(8).map((plan) => plan.order.join());
    for (const order of orders) expect(order.split(',').sort()).toEqual([...names(8)].sort());
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});
