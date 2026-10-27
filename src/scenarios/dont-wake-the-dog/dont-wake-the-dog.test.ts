import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import dontWakeTheDog from './index';
import {
  atRisk,
  captionAt,
  DOG,
  dogAt,
  type Ending,
  type Plan,
  type Scare,
  type Span,
  type Turn,
} from './plan';
import { ENDINGS, find, moves, names, placeAt, plansFor, turnLength, type Run } from './watching';

describeSpec(await loadFeature('./dont-wake-the-dog.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario("The picker shows Don't Wake the Dog", ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(dontWakeTheDog.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(dontWakeTheDog.description).toBe(description);
      });
      And('its picture is 🐶', () => {
        expect(dontWakeTheDog.card).toEqual({ emoji: '🐶' });
      });
      And('it takes 2 to 12 people', () => {
        expect(dontWakeTheDog.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule("It wakes on the unlucky person's turn", ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, variables) => {
        let runs: Run[];
        let unlucky: string;
        Given('<count> people, with the unlucky person <position> in the list', () => {
          const team = names(Number(variables.count));
          unlucky = variables.position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs', () => {
          runs = plansFor(Number(variables.count), 20, unlucky);
        });
        Then("the last turn is the unlucky person's", () => {
          for (const { plan } of runs) {
            expect(plan.turns.at(-1)!.kind).toBe('last');
            expect(plan.turns.at(-1)!.by).toEqual([unlucky]);
          }
        });
        And('the dog wakes on that turn', () => {
          for (const { plan } of runs) {
            const last = plan.turns.at(-1)!;
            expect(dogAt(plan, plan.wakes).state).toBe('awake');
            expect(plan.wakes).toBeGreaterThan(last.from);
            expect(plan.wakes).toBe(last.next);
          }
        });
        And("it never wakes on anyone else's turn", () => {
          for (const { plan } of runs) {
            for (let t = 0; t < plan.turns.at(-1)!.from; t += 0.05) {
              expect(['awake', 'stand']).not.toContain(dogAt(plan, t).state);
            }
          }
        });
      },
    );
  });

  Rule("Get past the dog and you're safe", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'Nobody goes twice, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let runs: Run[];
        Given('<count> people', () => {
          count = Number(variables.count);
        });
        When('the show runs with 20 different random seeds', () => {
          runs = plansFor(count, 20);
        });
        Then('nobody crosses more than once', () => {
          for (const { plan } of runs) {
            const crossers = plan.turns.flatMap((turn) => turn.by);
            expect(new Set(crossers).size).toBe(crossers.length);
          }
        });
        And("the unlucky person's only turn is the last", () => {
          for (const { plan, unlucky } of runs) {
            const theirs = plan.turns.filter((turn) => turn.by.includes(unlucky));
            expect(theirs).toEqual([plan.turns.at(-1)]);
          }
        });
        And('in some runs it wakes with 3 people at risk, and in others with 2', () => {
          const left = runs.map(({ plan }) => atRisk(plan, plan.wakes).length);
          expect(new Set(left)).toEqual(new Set([3, 2]));
        });
        And('it never comes down to one person alone', () => {
          for (const { plan } of runs) {
            for (let t = 0; t <= plan.end; t += 0.05)
              expect(atRisk(plan, t).length).toBeGreaterThan(1);
          }
        });
      },
    );

    RuleScenario('Who goes first gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Run[];
      let unlucky: string;
      Given('8 people, with the same unlucky person every time', () => {
        unlucky = names(8)[3]!;
      });
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(8, 20, unlucky);
      });
      Then('the first turn goes to at least 5 different people', () => {
        const firsts = new Set(runs.map(({ plan }) => plan.turns[0]!.by[0]));
        expect(firsts.size).toBeGreaterThanOrEqual(5);
      });
      And('the unlucky person stands in at least 5 different places along the line', () => {
        const places = new Set(runs.map(({ plan }) => plan.order.indexOf(unlucky)));
        expect(places.size).toBeGreaterThanOrEqual(5);
      });
      And(
        'the two who share the final three with the unlucky person are at least 4 different people across the runs',
        () => {
          const others = new Set(
            runs.flatMap(({ plan }) => plan.final.filter((name) => name !== unlucky)),
          );
          for (const { plan } of runs) expect(plan.final).toContain(unlucky);
          expect(others.size).toBeGreaterThanOrEqual(4);
        },
      );
    });
  });

  Rule('Turns go along the line', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('With 2 people, they take turns', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('2 people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(2, 20);
      });
      Then('the two take turns, one after the other', () => {
        for (const { plan } of runs) {
          expect(plan.turns.length).toBeGreaterThanOrEqual(2);
          plan.turns.slice(1).forEach((turn, k) => {
            expect(turn.by).not.toEqual(plan.turns[k]!.by);
          });
        }
      });
      And(
        'the first turn goes to the unlucky person in some runs, and to the other person in others',
        () => {
          const theirs = runs.map(({ plan, unlucky }) => plan.turns[0]!.by[0] === unlucky);
          expect(new Set(theirs)).toEqual(new Set([true, false]));
        },
      );
    });

    RuleScenarioOutline(
      'With <count> people, two neighbours go together before the final three',
      ({ Given, When, Then, And }, variables) => {
        let runs: Run[];
        Given('<count> people', () => undefined);
        When('the show runs with 20 different random seeds', () => {
          runs = plansFor(Number(variables.count), 20);
        });
        Then(
          'before the final three, the next two along cross one right behind the other, and both go safe together',
          () => {
            for (const { plan } of runs) {
              const pairs = plan.turns.filter((turn) => turn.by.length === 2);
              expect(pairs.length).toBeGreaterThan(0);
              for (const pair of pairs) {
                expect(pair.through!).toBeLessThanOrEqual(plan.spotlight);
                const [one, two] = pair.crossings as [Turn['crossings'][0], Turn['crossings'][0]];
                // Neighbours along the line, among those still at risk.
                const line = atRisk(plan, pair.from);
                const at = line.indexOf(one.by);
                expect(line[(at + 1) % line.length]).toBe(two.by);
                // Right behind: the second steps out under half a second after the first.
                expect(two.lane - one.lane).toBeGreaterThan(0);
                expect(two.lane - one.lane).toBeLessThanOrEqual(0.5);
                // Safe at the same moment: the count drops by two at once.
                const before = atRisk(plan, pair.through! - 1e-3);
                const after = atRisk(plan, pair.through!);
                expect(before.length - after.length).toBe(2);
              }
            }
          },
        );
        And('the caption names both, as "Ivo & Jonas!"', () => {
          for (const { plan } of runs) {
            for (const pair of plan.turns.filter((turn) => turn.by.length === 2)) {
              expect(captionAt(plan, pair.named)).toBe(`${pair.by[0]} & ${pair.by[1]}!`);
            }
          }
        });
        And('every turn from the final three on has one crosser', () => {
          for (const { plan } of runs) {
            for (const turn of plan.turns.filter((each) => each.from >= plan.spotlight)) {
              expect(turn.by).toHaveLength(1);
            }
          }
        });
      },
    );
  });

  Rule('The way past the dog', ({ RuleScenario }) => {
    RuleScenario('Unhurried before the final three', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('6 people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(6, 20);
      });
      Then('each turn before the final three lasts 2.7 seconds or more', () => {
        for (const { plan } of runs) {
          for (const turn of plan.turns.filter((each) => each.kind === 'safe')) {
            expect(turnLength(plan, turn)).toBeGreaterThanOrEqual(2.7 - 1e-9);
          }
        }
      });
      And('with 7 or 8 people, 2.3 seconds or more', () => {
        for (const { plan } of [...plansFor(7, 20), ...plansFor(8, 20)]) {
          for (const turn of plan.turns.filter((each) => each.kind === 'safe')) {
            expect(turnLength(plan, turn)).toBeGreaterThanOrEqual(2.3 - 1e-9);
          }
        }
      });
    });
  });

  Rule('The dog is the clock', ({ RuleScenario }) => {
    RuleScenario('It sleeps lighter after every crossing', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => undefined);
      When('the show runs', () => {
        runs = plansFor(8, 10);
      });
      Then('the dog starts deep asleep, with three Zs over its head and its tail flat', () => {
        for (const { plan } of runs) {
          const { state } = dogAt(plan, 0);
          expect(state).toBe('deep');
          expect(DOG[state].zs).toBe(3);
          expect(DOG[state].tail).toBe('flat');
        }
      });
      And('after the first crossing there are two Zs', () => {
        for (const { plan } of runs) {
          const first = plan.turns[0]!.through!;
          expect(DOG[dogAt(plan, first - 0.01).state].zs).toBe(3);
          expect(DOG[dogAt(plan, first).state].zs).toBe(2);
        }
      });
      And(
        'from about two thirds of the way to the final three there is one Z, and its tail thumps',
        () => {
          for (const { plan } of runs) {
            const safe = plan.turns.filter((turn) => turn.kind === 'safe');
            const k = safe.findIndex((turn) => DOG[dogAt(plan, turn.through!).state].zs === 1);
            expect((k + 1) / safe.length).toBeGreaterThanOrEqual(0.5);
            expect((k + 1) / safe.length).toBeLessThanOrEqual(0.85);
            const restless = plan.sleep.restless;
            const thumps = Array.from({ length: 20 }, (_, i) => restless + i * 0.05).some(
              (t) => dogAt(plan, t).marks === 'thump',
            );
            expect(thumps).toBe(true);
          }
        },
      );
      And('the Zs never come back once gone', () => {
        for (const { plan } of runs) {
          let zs = 3;
          for (let t = 0; t <= plan.end; t += 0.05) {
            const now = DOG[dogAt(plan, t).state].zs;
            expect(now).toBeLessThanOrEqual(zs);
            zs = now;
          }
        }
      });
      And('it breathes slowly throughout, until it wakes', () => {
        for (const { plan } of runs) {
          for (let t = 0; t <= plan.end; t += 0.05) {
            expect(DOG[dogAt(plan, t).state].breathes).toBe(t < plan.wakes - 1e-9);
          }
        }
      });
    });

    RuleScenario('Half awake for the final three', ({ Given, When, Then }) => {
      let runs: Run[];
      Given('8 people', () => {
        runs = plansFor(8, 10);
      });
      When('3 people are left at risk', () => undefined);
      Then('the dog has no Zs, one eye half open, its ears up and its tail raised', () => {
        for (const { plan } of runs) {
          const t = plan.turns.find(
            (turn) => turn.kind === 'safe' && atRisk(plan, turn.through!).length === 3,
          )!.through!;
          const look = DOG[dogAt(plan, plan.spotlight).state];
          expect(plan.spotlight).toBeGreaterThanOrEqual(t);
          expect(look).toMatchObject({ zs: 0, eyes: 'one-half', ears: 'up', tail: 'raised' });
        }
      });
    });
  });

  Rule('Safe turns get the same scares as the last one', ({ RuleScenario }) => {
    RuleScenario('The scares', ({ Given, When, Then, And }) => {
      let runs: Run[];
      /** Every safe turn in the runs, with its plan. */
      let safe: { plan: Plan; turn: Turn }[];
      const of = (scare: Scare | null) => safe.filter(({ turn }) => turn.scare === scare);
      const said = (plan: Plan, at: number, text: string, by: string) =>
        plan.says.some((say) => Math.abs(say.at - at) < 1e-9 && say.text === text && say.by === by);
      Given('8 people', () => undefined);
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30);
        safe = runs.flatMap(({ plan }) =>
          plan.turns.filter((turn) => turn.kind === 'safe').map((turn) => ({ plan, turn })),
        );
      });
      Then(
        'in some safe turns, as they reach it, the dog lifts its head and sniffs, "Sniff…", and they freeze',
        () => {
          expect(of('sniff').length).toBeGreaterThan(0);
          for (const { plan, turn } of of('sniff')) {
            const hold = turn.hold!;
            const crosser = turn.crossings[0]!;
            expect(hold.from).toBe(crosser.reaches);
            expect(dogAt(plan, hold.from)).toMatchObject({ lift: true, marks: 'sniff' });
            expect(said(plan, hold.from, 'Sniff…', 'dog')).toBe(true);
            expect(moves(plan, crosser.by, hold)).toBe(false);
          }
        },
      );
      And(
        'in some, while they are on its back, an ear twitches, it mumbles "Wuf…", and everyone at risk freezes',
        () => {
          expect(of('wuf').length).toBeGreaterThan(0);
          for (const { plan, turn } of of('wuf')) {
            const hold = turn.hold!;
            expect(placeAt(plan, turn.by[0]!, hold.from)).toBe('back');
            expect(dogAt(plan, hold.from).marks).toBe('twitch');
            expect(said(plan, hold.from, 'Wuf…', 'dog')).toBe(true);
            for (const name of atRisk(plan, hold.from)) expect(moves(plan, name, hold)).toBe(false);
          }
        },
      );
      And(
        'in some, the gate creaks as it opens, "Creak!", the dog\'s ear twitches, and they freeze',
        () => {
          expect(of('creak').length).toBeGreaterThan(0);
          for (const { plan, turn } of of('creak')) {
            const hold = turn.hold!;
            expect(placeAt(plan, turn.by[0]!, hold.from)).toBe('gateway');
            expect(said(plan, turn.gate!.from, 'Creak!', 'gate')).toBe(true);
            expect(dogAt(plan, hold.from).marks).toBe('twitch');
            expect(moves(plan, turn.by[0]!, hold)).toBe(false);
          }
        },
      );
      And('in some, nothing stirs', () => {
        expect(of(null).length).toBeGreaterThan(0);
        for (const { plan, turn } of of(null)) {
          expect(turn.hold).toBeNull();
          for (let t = turn.from; t < turn.next; t += 0.05) {
            expect(dogAt(plan, t)).toMatchObject({ lift: false });
            expect(dogAt(plan, t).marks).not.toMatch(/sniff|twitch/);
          }
        }
      });
      And(
        'each freeze lasts 0.7 seconds or more, then the dog settles and the crossing goes on',
        () => {
          for (const { plan, turn } of safe.filter(({ turn }) => turn.hold)) {
            const hold = turn.hold!;
            expect(hold.to - hold.from).toBeGreaterThanOrEqual(0.7 - 1e-9);
            expect(dogAt(plan, hold.to)).toMatchObject({ lift: false });
            expect(dogAt(plan, hold.to).marks).not.toMatch(/sniff|twitch/);
            expect(moves(plan, turn.by[0]!, { from: hold.to, to: hold.to + 0.3 })).toBe(true);
          }
        },
      );
    });

    RuleScenario('The first crossing is quiet', ({ Given, When, Then }) => {
      let runs: Run[];
      Given('6 people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(6, 20);
      });
      Then('the first crossing has no scare', () => {
        for (const { plan } of runs) {
          expect(plan.turns[0]!.scare).toBeNull();
          expect(plan.turns[0]!.hold).toBeNull();
        }
      });
    });
  });

  Rule('The final three', ({ RuleScenario }) => {
    RuleScenario('Final two', ({ Given, When, Then }) => {
      let plan: Plan;
      let through: number;
      Given('8 people, and the dog wakes with 2 left', () => {
        ({ plan } = find(8, (each) => each.wakesWith === 2));
      });
      When('the first crossing after "Final three!" gets through the gate', () => {
        const first = plan.turns.find((turn) => turn.from > plan.spotlight)!;
        expect(first.kind).toBe('nearly');
        through = first.through!;
      });
      Then('the caption is "Nearly!", then "Final two!"', () => {
        expect(captionAt(plan, through)).toBe('Nearly!');
        const next = plan.captions.findIndex((caption) => caption.text === 'Nearly!') + 1;
        expect(plan.captions[next]!.text).toBe('Final two!');
      });
    });
  });

  Rule('Nearly! A careful crossing gets the biggest scare', ({ RuleScenario }) => {
    RuleScenario('Nearly', ({ Given, When, Then, And }) => {
      let runs: Run[];
      const nearlyOf = (plan: Plan) => plan.turns.find((turn) => turn.kind === 'nearly')!;
      Given('8 people, and the dog wakes with 2 left', () => {
        runs = plansFor(8, 40).filter(({ plan }) => plan.wakesWith === 2);
        expect(runs.length).toBeGreaterThan(5);
      });
      When('the first of the final three crosses', () => undefined);
      Then('they tiptoe slower than anyone before them', () => {
        for (const { plan } of runs) {
          const nearly = nearlyOf(plan);
          const before = plan.turns.filter((turn) => turn.from < nearly.from);
          const slowest = Math.min(...before.flatMap((turn) => turn.crossings.map((c) => c.speed)));
          expect(nearly.crossings[0]!.speed).toBeLessThan(slowest);
        }
      });
      And('they get one of the scares, during which the dog opens both eyes halfway', () => {
        for (const { plan } of runs) {
          const { scare, hold } = nearlyOf(plan);
          expect(['sniff', 'wuf', 'creak']).toContain(scare);
          const peek = plan.peek!;
          expect(peek.from).toBeGreaterThanOrEqual(hold!.from);
          expect(peek.to).toBeLessThanOrEqual(hold!.to);
          expect(DOG[dogAt(plan, (peek.from + peek.to) / 2).state].eyes).toBe('both-half');
        }
      });
      And('the dog closes them again, and they get through the gate with "Phew!!"', () => {
        for (const { plan } of runs) {
          const nearly = nearlyOf(plan);
          expect(DOG[dogAt(plan, plan.peek!.to).state].eyes).toBe('one-half');
          expect(nearly.through).not.toBeNull();
          const phew = plan.says.find((say) => say.text === 'Phew!!')!;
          expect(phew.by).toBe(nearly.by[0]);
          expect(phew.at).toBeGreaterThan(nearly.through!);
        }
      });
    });

    RuleScenario(
      "Nearly is never the unlucky person's, with 4 or more",
      ({ Given, When, Then }) => {
        let runs: Run[];
        let unlucky: string;
        Given('8 people, with the same unlucky person every time', () => {
          unlucky = names(8)[5]!;
        });
        When('the show runs with 30 different random seeds', () => {
          runs = plansFor(8, 30, unlucky);
        });
        Then(
          '"Nearly!" happens to at least 3 different people, and never to the unlucky person',
          () => {
            const nearly = runs.flatMap(({ plan }) =>
              plan.turns.filter((turn) => turn.kind === 'nearly').flatMap((turn) => turn.by),
            );
            expect(new Set(nearly).size).toBeGreaterThanOrEqual(3);
            expect(nearly).not.toContain(unlucky);
          },
        );
      },
    );
  });

  Rule('With 2 or 3 people it is the final from the start', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, variables) => {
      let runs: Run[];
      Given('<count> people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(Number(variables.count), 20);
      });
      Then(
        'the caption after the opening is "<caption>", the dog is half awake, and the heartbeat starts before the first turn',
        () => {
          for (const { plan } of runs) {
            const after = plan.captions[2]!;
            expect(after.text).toBe(variables.caption);
            expect(dogAt(plan, after.at).state).toBe('half');
            expect(plan.heartbeats[0]).toBe(after.at);
            expect(plan.heartbeats[0]!).toBeLessThan(plan.turns[0]!.from);
          }
        },
      );
      And(
        'in some runs, before the real crossings, someone tiptoes up, gets a scare, says "Nope!" and goes back to their place',
        () => {
          const nopes = runs.flatMap(({ plan }) =>
            plan.turns.filter((turn) => turn.kind === 'nope').map((turn) => ({ plan, turn })),
          );
          expect(nopes.length).toBeGreaterThan(0);
          for (const { plan, turn } of nopes) {
            const real = plan.turns.findIndex((each) => each.kind !== 'nope');
            expect(plan.turns.indexOf(turn)).toBeLessThan(real);
            const [by] = turn.by as [string];
            expect(placeAt(plan, by, turn.hold!.from)).toBe('lane-end');
            expect(dogAt(plan, turn.hold!.from).marks).toBe('sniff');
            expect(plan.says.some((say) => say.text === 'Nope!' && say.by === by)).toBe(true);
            expect(placeAt(plan, by, turn.next)).toBe('seat');
          }
        },
      );
      And("everyone still has their turn along the line, the last one the unlucky person's", () => {
        for (const { plan, unlucky, team } of runs) {
          const order = plan.order;
          plan.turns.slice(1).forEach((turn, k) => {
            const before = order.indexOf(plan.turns[k]!.by[0]!);
            expect(turn.by[0]).toBe(order[(before + 1) % order.length]);
          });
          expect(new Set(plan.turns.flatMap((turn) => turn.by))).toEqual(new Set(team));
          expect(plan.turns.at(-1)!.by).toEqual([unlucky]);
        }
      });
    });
  });

  Rule('The last turn could go three ways', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'The ending, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let runs: Run[];
        const ending = (which: Ending) => runs.filter(({ plan }) => plan.ending === which);
        Given('<count> people', () => undefined);
        When('the show runs with 30 different random seeds', () => {
          runs = plansFor(Number(variables.count), 30);
        });
        Then(
          'in some runs they are on its back when its eyes open, both looking up at them',
          () => {
            expect(ending('on-back').length).toBeGreaterThan(0);
            for (const { plan, unlucky } of ending('on-back')) {
              expect(placeAt(plan, unlucky, plan.wakes)).toBe('back');
              expect(DOG[dogAt(plan, plan.wakes).state].eyes).toBe('open');
            }
          },
        );
        And('in some runs they get over it, and the gate creaks', () => {
          expect(ending('creak').length).toBeGreaterThan(0);
          for (const { plan, unlucky } of ending('creak')) {
            expect(placeAt(plan, unlucky, plan.wakes)).toBe('gateway');
            const creak = plan.says.findLast((say) => say.text === 'Creak!')!;
            expect(creak.at).toBeGreaterThan(plan.turns.at(-1)!.from);
            expect(creak.at).toBeLessThan(plan.wakes);
          }
        });
        And(
          'in some runs it lifts its head and sniffs as they reach it, they freeze, it sniffs again, and its eyes open',
          () => {
            expect(ending('sniff').length).toBeGreaterThan(0);
            for (const { plan, unlucky } of ending('sniff')) {
              const last = plan.turns.at(-1)!;
              const reaches = last.crossings[0]!.reaches;
              const sniffs = plan.says.filter(
                (say) => say.at >= reaches && /^Sniff/.test(say.text),
              );
              expect(sniffs).toHaveLength(2);
              expect(sniffs[0]!.at).toBe(reaches);
              expect(dogAt(plan, reaches)).toMatchObject({ lift: true, marks: 'sniff' });
              expect(moves(plan, unlucky, { from: reaches, to: plan.wakes })).toBe(false);
              expect(sniffs[1]!.at).toBeLessThan(plan.wakes);
              expect(DOG[dogAt(plan, plan.wakes).state].eyes).toBe('open');
            }
          },
        );
        And(
          'every time it wakes, its ears go up, a "!" appears over its head, and the caption is "Uh-oh…"',
          () => {
            for (const { plan } of runs) {
              const look = DOG[dogAt(plan, plan.wakes).state];
              expect(look).toMatchObject({ ears: 'up', bang: true });
              expect(DOG[dogAt(plan, plan.wakes - 0.01).state].bang).toBe(false);
              expect(captionAt(plan, plan.wakes)).toBe('Uh-oh…');
            }
          },
        );
      },
    );

    RuleScenario('A moment of stillness, then the woof', ({ When, Then, And }) => {
      let runs: Run[];
      When('the show runs with each ending', () => {
        runs = ENDINGS.map((ending) => find(6, (plan) => plan.ending === ending));
      });
      Then('for at least half a second after its eyes open, nothing moves', () => {
        for (const { plan } of runs) {
          const still: Span = { from: plan.wakes, to: plan.wakes + 0.5 };
          for (const name of plan.order) expect(moves(plan, name, still)).toBe(false);
          for (let t = still.from; t <= still.to; t += 0.05) {
            expect(dogAt(plan, t)).toEqual(dogAt(plan, plan.wakes));
          }
        }
      });
      And('then it says "Woof!"', () => {
        for (const { plan } of runs) {
          const woof = plan.says.find((say) => say.text === 'Woof!')!;
          expect(woof.by).toBe('dog');
          expect(woof.at).toBeGreaterThanOrEqual(plan.wakes + 0.5);
          expect(woof.at).toBe(plan.woof);
        }
      });
    });
  });

  Rule('The beats keep every show a second or more inside the limit', ({ RuleScenario }) => {
    RuleScenario('About 21 to 25 seconds at 6 people', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('6 people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(6, 20);
      });
      Then('each run lasts between 19 and 26 seconds', () => {
        for (const { plan } of runs) {
          expect(plan.end).toBeGreaterThanOrEqual(19);
          expect(plan.end).toBeLessThanOrEqual(26);
        }
      });
      And(
        'runs where it wakes with 2 left last longer than runs where it wakes with 3 left',
        () => {
          const lengths = (left: number) =>
            runs.filter(({ plan }) => plan.wakesWith === left).map(({ plan }) => plan.end);
          expect(lengths(2).length).toBeGreaterThan(0);
          expect(lengths(3).length).toBeGreaterThan(0);
          expect(Math.min(...lengths(2))).toBeGreaterThan(Math.max(...lengths(3)));
        },
      );
    });

    RuleScenario('Every head count lands between 12 and 29 seconds', ({ When, Then }) => {
      let runs: Run[];
      When(
        'the show runs at every head count from 2 to 12, with each ending, waking with 3 left and with 2 left',
        () => {
          runs = [];
          for (let count = 2; count <= 12; count++) {
            for (const ending of ENDINGS) {
              for (const left of count === 2 ? [2] : [3, 2]) {
                for (const position of ['first', 'last'] as const) {
                  const team = names(count);
                  const unlucky = position === 'first' ? team[0]! : team.at(-1)!;
                  runs.push(
                    find(
                      count,
                      (plan) => plan.ending === ending && plan.wakesWith === left,
                      unlucky,
                    ),
                  );
                }
              }
            }
          }
        },
      );
      Then('each run lasts between 12 and 29 seconds', () => {
        for (const { plan } of runs) {
          expect(plan.end).toBeGreaterThanOrEqual(12);
          expect(plan.end).toBeLessThanOrEqual(29);
        }
      });
    });
  });
});
