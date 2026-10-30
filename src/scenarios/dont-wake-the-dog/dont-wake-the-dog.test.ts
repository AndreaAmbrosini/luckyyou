import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { speechBox, stagePx } from '../../scenario-kit';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec } from '../../scenario-kit/testing';
import dontWakeTheDog from './index';
import {
  atRisk,
  captionAt,
  DOG,
  dogAt,
  moodAt,
  planShow,
  WAY,
  type Ending,
  type Plan,
  type Scare,
  type Span,
  type Turn,
} from './plan';
import {
  between,
  ENDINGS,
  find,
  frameAt,
  moves,
  names,
  placeAt,
  plansFor,
  STEP,
  turnLength,
  watch,
  type Frame,
  type Run,
  type Watched,
} from './watching';
import {
  BACK,
  BEHIND,
  BOB,
  bodyBox,
  dogFace,
  faceBox,
  GROW,
  GROWN,
  headBox,
  lane,
  OVER,
  overlap,
  placings,
  seat,
  type Places,
} from './layout';
import { AT_RISK, DOG_AT, sign } from './parts';

/** Twelve names, one of them 15 characters long. */
const LONG = 'Priya Natarajan';
const LONG_TEAM = [...names(11), LONG];

/** The first seed from 1 up whose plan for `team` and `unlucky` `wanted` accepts. */
function seedWhere(team: readonly string[], unlucky: string, wanted: (plan: Plan) => boolean) {
  for (let seed = 1; seed <= 5000; seed++) {
    if (wanted(planShow(team, unlucky, createRandom(seed)))) return seed;
  }
  throw new Error('No seed gives that plan.');
}

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
    RuleScenario(
      "A crossing that doesn't wake it makes the crosser safe",
      ({ Given, When, Then, And }) => {
        let run: Watched;
        let safe: Turn[];
        Given('8 people', async () => {
          run = await watch(names(8), names(8)[7]!, 1);
        });
        When('someone gets through the gate, before the last turn', () => {
          safe = run.plan.turns.filter((turn) => turn.kind === 'safe');
          expect(safe.length).toBeGreaterThan(2);
        });
        Then(
          'they say "Phew!" and stand behind the fence along the top of the stage, on the side they came from',
          () => {
            const last = run.frames.at(-1)!;
            for (const turn of safe) {
              const [by] = turn.by as [string];
              const phew = run.frames.find((frame) =>
                frame.bubbles.some((said) => said.text === 'Phew!' && said.by === by),
              );
              expect(phew, by).toBeDefined();
              expect(phew!.time).toBeGreaterThan(turn.through!);
              const end = last.people.get(by)!;
              expect(end.layer).toBe('fence');
              expect(end.y).toBe(BEHIND.y);
              const side = run.plan.order.indexOf(by) < Math.ceil(8 / 2) ? -1 : 1;
              expect(Math.sign(end.x - 640)).toBe(side);
            }
          },
        );
        And('they stay there, smaller, until the end', () => {
          for (const turn of safe) {
            const [by] = turn.by as [string];
            const there = turn.crossings[0]!.fence!;
            const end = run.frames.at(-1)!.people.get(by)!;
            for (const frame of between(run, there + STEP)) {
              const now = frame.people.get(by)!;
              expect([now.x, now.y, now.size].map(Math.round)).toEqual(
                [end.x, end.y, end.size].map(Math.round),
              );
            }
            expect(end.size).toBeLessThan(frameAt(run, 0).people.get(by)!.size);
          }
        });
        And('the number on the "At risk" sign over the gate goes down by one', () => {
          for (const turn of safe) {
            const count = (frame: Frame) => Number(frame.sign.replace(AT_RISK, ''));
            const before = run.frames.findLast((frame) => frame.time < turn.through! - 1e-9)!;
            expect(count(frameAt(run, turn.through!))).toBe(count(before) - 1);
          }
        });
        And('everyone still at risk stays where they stand', () => {
          for (const turn of safe) {
            const staying = atRisk(run.plan, turn.from).filter((name) => !turn.by.includes(name));
            const frames = between(run, turn.from, turn.next);
            for (const name of staying) {
              const first = frames[0]!.people.get(name)!;
              for (const frame of frames) {
                const now = frame.people.get(name)!;
                expect(now.x).toBeCloseTo(first.x, 6);
                expect(now.y).toBeCloseTo(first.y, 6);
              }
            }
          }
        });
      },
    );

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
    RuleScenario('Each turn goes to the next one along', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => undefined);
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(8, 20);
      });
      Then(
        'each turn goes to the next person at risk along the line, from left to right across the stage, and from the rightmost back to the leftmost',
        () => {
          for (const { plan } of runs) {
            const crossers = plan.turns.flatMap((turn) => turn.by);
            crossers.slice(1).forEach((name, k) => {
              const line = plan.order.filter((each) => !crossers.slice(0, k).includes(each));
              const before = line.indexOf(crossers[k]!);
              expect(name).toBe(line[(before + 1) % line.length]);
            });
            // The line runs left to right across the stage.
            const xs = plan.order.map((_, k) => seat(k, 8).x);
            xs.slice(1).forEach((x, k) => expect(x).toBeGreaterThan(xs[k]!));
          }
        },
      );
      And('the caption names whose turn it is, as "Elena\'s turn", as they step out', async () => {
        for (const { plan } of runs) {
          for (const turn of plan.turns) {
            expect(captionAt(plan, turn.named)).toBe(`${turn.by[0]}'s turn`);
            const steps = turn.crossings[0]!;
            expect(turn.named).toBeGreaterThanOrEqual(turn.from - 1e-9);
            expect(turn.named).toBeLessThanOrEqual(steps.lane + 1e-9);
          }
        }
        // On the stage, as the plan has it.
        const run = await watch(names(8), names(8)[0]!, 1);
        const shown = run.record.captions.map((caption) => caption.text);
        for (const turn of run.plan.turns) expect(shown).toContain(`${turn.by[0]}'s turn`);
      });
      And('whoever goes next after them looks scared until their own turn', async () => {
        for (const { plan } of runs) {
          plan.turns.slice(0, -1).forEach((turn, k) => {
            const next = plan.turns[k + 1]!;
            if (next.from > plan.spotlight) return;
            for (let t = turn.from; t < next.from - 1e-9; t += 0.1) {
              expect(moodAt(plan, next.by[0]!, t).mood, `${next.by[0]} at ${t}`).toBe('scared');
            }
          });
        }
        // The stage shows everyone's mood as the plan has it.
        const run = await watch(names(8), names(8)[0]!, 1);
        for (const frame of run.frames) {
          for (const [name, drawn] of frame.people) {
            expect(drawn.mood, `${name} at ${frame.time}`).toBe(
              moodAt(run.plan, name, frame.time).mood,
            );
          }
        }
      });
    });

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
                const at = line.indexOf(pair.by[0]!);
                expect(line[(at + 1) % line.length]).toBe(pair.by[1]);
                expect(new Set([one.by, two.by])).toEqual(new Set(pair.by));
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
    RuleScenario('A crossing', ({ Given, When, Then, And }) => {
      let run: Watched;
      let turns: Turn[];
      Given('6 people', async () => {
        run = await watch(names(6), names(6)[2]!, 1);
      });
      When("someone's turn comes", () => {
        turns = run.plan.turns.filter((turn) => turn.kind === 'safe');
      });
      Then('they step back into a lane behind the line and tiptoe along it to the dog', () => {
        const way = lane(6);
        for (const turn of turns) {
          const { by, lane: inLane, reaches, side } = turn.crossings[0]!;
          const seated = frameAt(run, turn.from).people.get(by)!;
          const walking = between(run, inLane + STEP, reaches - STEP).map((f) => f.people.get(by)!);
          expect(walking.length).toBeGreaterThan(3);
          for (const drawn of walking) {
            expect(drawn.y).toBeLessThan(seated.y);
            expect(drawn.y).toBeGreaterThanOrEqual(way.y - BOB.height - 1e-6);
          }
          // On tiptoe: bobbing up and down, on towards the dog's end.
          expect(new Set(walking.map((drawn) => Math.round(drawn.y))).size).toBeGreaterThan(1);
          const xs = walking.map((drawn) => drawn.x * side);
          xs.slice(1).forEach((x, k) => expect(x).toBeLessThanOrEqual(xs[k]! + 1e-6));
          expect(frameAt(run, reaches).people.get(by)!.x).toBeCloseTo(way.end(side), 0);
        }
      });
      And(
        'they go up over its head or its tail, whichever end is on their side, and onto its back, behind it',
        () => {
          for (const turn of turns) {
            const { by, side, over, back } = turn.crossings[0]!;
            const up = frameAt(run, over!).people.get(by)!;
            expect(Math.hypot(up.x - OVER[side].x, up.y - OVER[side].y)).toBeLessThan(25);
            // The head is at the left end, the tail at the right.
            expect(Math.sign(OVER[side].x - (DOG_AT.x + DOG_AT.width / 2))).toBe(side);
            const on = run.frames.reduce((best, frame) =>
              Math.abs(frame.time - back!) < Math.abs(best.time - back!) ? frame : best,
            );
            const drawn = on.people.get(by)!;
            expect(Math.hypot(drawn.x - BACK.x, drawn.y - BACK.y)).toBeLessThan(5);
            expect(drawn.layer).toBe('dog');
            expect(on.behindTheDog).toBe(true);
          }
        },
      );
      And('the gate swings open, they go through, and it closes behind them', () => {
        for (const turn of turns) {
          const { by, reaches, gateway, through } = turn.crossings[0]!;
          expect(frameAt(run, reaches).gate).toBe(0);
          expect(frameAt(run, gateway!).gate).toBeGreaterThan(0.9);
          const out = frameAt(run, through! + 0.2).people.get(by)!;
          expect(out.layer).toBe('fence');
          expect(frameAt(run, turn.gate!.to + 0.35).gate).toBe(0);
        }
      });
      And("while they are on its back, the dog's face stays in full view", () => {
        const places = placings(run.plan);
        for (const turn of turns) {
          const { by, back, gateway } = turn.crossings[0]!;
          for (const frame of between(run, back!, gateway! - WAY.gateway)) {
            expect(frame.people.get(by)!.layer).toBe('dog');
            expect(frame.behindTheDog).toBe(true);
            expect(overlap(places.tag(by, frame.time).box, dogFace())).toBe(false);
          }
        }
      });
    });

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
    RuleScenario('Final three', ({ Given, When, Then, And }) => {
      let run: Watched;
      let three: string[];
      let spotlight: number;
      Given('8 people', async () => {
        run = await watch(names(8), names(8)[7]!, 8);
      });
      When('3 people are left at risk', () => {
        spotlight = run.plan.spotlight;
        three = atRisk(run.plan, spotlight);
        expect(three).toHaveLength(3);
      });
      Then('the caption is "Final three!"', () => {
        const shown = run.record.captions.find((caption) => caption.text === 'Final three!')!;
        expect(shown.from).toBeCloseTo(spotlight, 1);
      });
      And('the three grow to 1.2 times their size where they stand, name tags and all', () => {
        const before = frameAt(run, spotlight - STEP);
        const after = frameAt(run, spotlight + GROW + STEP);
        for (const name of three) {
          const [was, now] = [before.people.get(name)!, after.people.get(name)!];
          expect(now.size / was.size).toBeCloseTo(GROWN, 2);
          expect([now.x, now.y]).toEqual([was.x, was.y]);
          expect(now.tag / was.tag).toBeGreaterThan(GROWN - 0.05);
          expect(now.tag / was.tag).toBeLessThan(GROWN + 0.05);
        }
      });
      And('they look scared and sweat', () => {
        for (const frame of between(run, spotlight, run.plan.turns.at(-1)!.from)) {
          for (const name of atRisk(run.plan, frame.time)) {
            expect(frame.people.get(name)).toMatchObject({ mood: 'scared', sweat: true });
          }
        }
      });
      And('the heartbeat starts, and comes quicker and quicker until the dog wakes', () => {
        const beats = run.cues
          .filter((heard) => heard.cue === 'heartbeat')
          .map((heard) => heard.time);
        expect(beats[0]).toBeCloseTo(spotlight, 1);
        const gaps = beats.slice(1).map((time, k) => time - beats[k]!);
        gaps.slice(1).forEach((gap, k) => expect(gap).toBeLessThanOrEqual(gaps[k]! + STEP + 1e-9));
        expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
        expect(beats.at(-1)!).toBeLessThan(run.plan.wakes);
        expect(run.plan.wakes - beats.at(-1)!).toBeLessThan(1);
      });
    });

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

  Rule('The ending is a walk', ({ RuleScenario }) => {
    /** Six people, Marco among them. */
    const MARCO_TEAM = ['Anna', 'Ben', 'Carla', 'Giulia', 'Marco', 'Priya'];

    RuleScenario('Walkies', ({ Given, When, Then, And }) => {
      let run: Watched;
      let after: Frame[];
      Given('the unlucky person is "Marco"', async () => {
        run = await watch(MARCO_TEAM, 'Marco', 1);
      });
      When('the dog wakes', () => {
        after = between(run, run.plan.wakes);
      });
      Then(
        'Marco hops down in front of the dog, drawn at 130 pixels or more, in front of everyone',
        () => {
          const end = run.frames.at(-1)!.people.get('Marco')!;
          expect(end.size).toBeGreaterThanOrEqual(130);
          expect(end.layer).toBe('top');
          expect(end.y).toBeGreaterThan(run.frames.at(-1)!.dog.y + DOG_AT.height);
          const hop = after.map((frame) => frame.people.get('Marco')!);
          expect(hop.some((drawn) => drawn.y < hop[0]!.y - 20)).toBe(true);
        },
      );
      And('the dog jumps up, wagging, with hearts over its head', () => {
        const up = between(run, run.plan.woof);
        for (const frame of up) expect(frame.dog).toMatchObject({ state: 'stand', marks: 'wag' });
        expect(Math.min(...up.map((frame) => frame.dog.y))).toBeLessThan(DOG_AT.stand.y - 20);
        const walk = between(run, run.plan.walkies);
        for (const frame of walk) {
          expect(frame.hearts).toBe(2);
          expect(frame.dog.y).toBeLessThanOrEqual(DOG_AT.stand.y);
        }
      });
      And("its lead goes from its collar to Marco's raised hand, and Marco celebrates", () => {
        expect(frameAt(run, run.plan.walkies - STEP).lead).toBeNull();
        for (const frame of between(run, run.plan.walkies)) {
          const marco = frame.people.get('Marco')!;
          expect(marco).toMatchObject({ mood: 'party', raised: true });
          const hand = {
            x: marco.x + 0.48 * marco.size,
            y: marco.y - 0.8 * marco.size + 0.06 * marco.size,
          };
          const [, x1, y1, x2, y2] = /^M(\S+) (\S+) Q\S+ \S+ (\S+) (\S+)$/
            .exec(frame.lead!)!
            .map(Number);
          expect(Math.hypot(x1! - hand.x, y1! - hand.y)).toBeLessThan(3);
          // The collar, round the standing dog's neck.
          expect(x2! - frame.dog.x).toBeGreaterThan(100);
          expect(x2! - frame.dog.x).toBeLessThan(130);
          expect(y2! - frame.dog.y).toBeGreaterThan(55);
          expect(y2! - frame.dog.y).toBeLessThan(85);
        }
      });
      And('the sign over the gate says "Walkies!"', () => {
        expect(run.frames.at(-1)!.sign).toBe('Walkies!');
      });
      And('the caption is "Marco woke the dog!"', () => {
        expect(run.record.captions.at(-1)!.text).toBe('Marco woke the dog!');
      });
    });

    RuleScenario("Whoever hasn't crossed slips out", ({ Given, When, Then }) => {
      let run: Watched;
      let staying: string[];
      Given('8 people, and the dog wakes with 3 left', async () => {
        const { seed, unlucky, team } = find(8, (plan) => plan.wakesWith === 3);
        run = await watch(team, unlucky, seed);
      });
      When('the dog wakes', () => {
        const crossed = new Set(run.plan.turns.flatMap((turn) => turn.by));
        staying = run.plan.order.filter((name) => !crossed.has(name));
        expect(staying).toHaveLength(2);
      });
      Then(
        "the two who haven't crossed tiptoe out of the gate behind its back, happy, to stand behind the fence",
        () => {
          for (const name of staying) {
            const out = between(run, run.plan.woof).map((frame) => ({
              frame,
              drawn: frame.people.get(name)!,
            }));
            for (const { drawn } of out) expect(drawn.mood).toBe('happy');
            // To the gateway behind the dog, bobbing on tiptoe.
            const behind = out.filter(({ drawn }) => drawn.layer === 'dog');
            expect(behind.some(({ drawn }) => Math.hypot(drawn.x - 640, drawn.y - 330) < 80)).toBe(
              true,
            );
            for (const { frame } of behind) expect(frame.behindTheDog).toBe(true);
            const way = run.plan.paths.get(name)!.filter((key) => key.at > run.plan.woof);
            expect(way.find((key) => key.place === 'gateway')!.tiptoe).toBe(true);
            const end = out.at(-1)!.drawn;
            expect(end).toMatchObject({ layer: 'fence', y: BEHIND.y });
          }
        },
      );
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      let run: Watched;
      Given('the unlucky person is "Marco"', async () => {
        run = await watch(MARCO_TEAM, 'Marco', 1);
      });
      When('the show runs', () => {
        expect(run.record.outcome).toBe('finished');
      });
      Then('"Marco" is on stage, not moving, for the last 1.5 seconds', () => {
        const last = between(run, run.record.duration - 1.5);
        const end = last.at(-1)!.people.get('Marco')!;
        for (const frame of last) {
          const marco = frame.people.get('Marco')!;
          expect([marco.x, marco.y, marco.size]).toEqual([end.x, end.y, end.size]);
          expect(marco.tag).toBeGreaterThanOrEqual(22);
        }
        expect(run.record.stage).not.toBeNull();
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

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the story, a turn at a time', ({ Given, When, Then }) => {
      let run: Watched;
      Given(
        '6 people, the unlucky person is "Anna", the turns go to "Ben", "Marco", "Giulia", "Priya", then "Anna", and Priya has "Nearly!"',
        async () => {
          const team = ['Anna', 'Ben', 'Carla', 'Giulia', 'Marco', 'Priya'];
          const turns = ['Ben', 'Marco', 'Giulia', 'Priya', 'Anna'];
          const seed = seedWhere(team, 'Anna', (plan) => {
            const by = plan.turns.map((turn) => turn.by.join());
            return by.join() === turns.join() && plan.turns[3]!.kind === 'nearly';
          });
          run = await watch(team, 'Anna', seed);
        },
      );
      When('the show runs', () => {
        expect(run.record.outcome).toBe('finished');
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const shown = run.record.captions.map((caption) => caption.text);
        let at = 0;
        for (const { caption } of table) {
          const found = shown.indexOf(caption, at);
          expect(found, caption).toBeGreaterThanOrEqual(at);
          at = found + 1;
        }
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let runs: Watched[];
      When('the show runs', async () => {
        runs = [await watch(names(6), names(6)[0]!, 1), await watch(names(2), names(2)[1]!, 5)];
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const run of runs) {
          for (const caption of run.record.captions) {
            expect(caption.to - caption.from, caption.text).toBeGreaterThanOrEqual(1 - STEP);
          }
        }
      });
    });

    RuleScenario('Whoever is at risk is drawn big', ({ When, Then, And }) => {
      let runs: Watched[];
      /** Every frame's people standing at risk in their places, still and done growing. */
      function* standing() {
        for (const run of runs) {
          const { plan } = run;
          const changes = plan.turns.flatMap((turn) =>
            turn.through === null ? [] : [turn.through],
          );
          changes.push(plan.spotlight);
          for (const frame of run.frames) {
            if (frame.time >= plan.wakes) break;
            if (changes.some((at) => frame.time >= at - 1e-9 && frame.time < at + GROW)) continue;
            const risky = atRisk(plan, frame.time);
            for (const name of risky) {
              const still = { from: frame.time - 0.01, to: frame.time + 0.01 };
              if (placeAt(plan, name, frame.time) !== 'seat' || moves(plan, name, still)) continue;
              const grown = frame.time >= plan.spotlight ? GROWN : 1;
              yield { name, frame, drawn: frame.people.get(name)!, risky: risky.length, grown };
            }
          }
        }
      }
      When('the show runs at 6 and at 12 people, a 15-character name among the 12', async () => {
        runs = [await watch(names(6), names(6)[0]!, 1), await watch(LONG_TEAM, LONG_TEAM[0]!, 1)];
      });
      Then(
        'with 6 or fewer at risk, their heads are 120 pixels tall and the name tags other than the 15-character one 34 pixels or more, on the 1280 by 720 stage',
        () => {
          let seen = 0;
          for (const { name, frame, drawn, risky, grown } of standing()) {
            if (risky > 6) continue;
            seen++;
            expect(drawn.size / grown, `${name} at ${frame.time}`).toBeCloseTo(120, 6);
            if (name !== LONG)
              expect(drawn.tag, `${name} at ${frame.time}`).toBeGreaterThanOrEqual(34);
          }
          expect(seen).toBeGreaterThan(0);
        },
      );
      And(
        'with 7 or more at risk, their heads are 100 pixels tall and those other name tags 28 pixels or more',
        () => {
          let seen = 0;
          for (const { name, frame, drawn, risky } of standing()) {
            if (risky < 7) continue;
            seen++;
            expect(drawn.size, `${name} at ${frame.time}`).toBe(100);
            if (name !== LONG)
              expect(drawn.tag, `${name} at ${frame.time}`).toBeGreaterThanOrEqual(28);
          }
          expect(seen).toBeGreaterThan(0);
        },
      );
      And("the 15-character name's tag is 22 pixels or more, at risk or not", () => {
        for (const frame of runs[1]!.frames) {
          expect(frame.people.get(LONG)!.tag, `at ${frame.time}`).toBeGreaterThanOrEqual(22);
        }
      });
      And('behind the fence, name tags are 22 pixels or more', () => {
        let seen = 0;
        for (const run of runs) {
          for (const frame of run.frames) {
            for (const [name, drawn] of frame.people) {
              if (placeAt(run.plan, name, frame.time) !== 'fence') continue;
              seen++;
              expect(drawn.tag, `${name} at ${frame.time}`).toBeGreaterThanOrEqual(22);
            }
          }
        }
        expect(seen).toBeGreaterThan(0);
      });
      And('the "At risk" number is 34 pixels or more', () => {
        const { el } = sign();
        document.body.append(el);
        const number = el.querySelector<HTMLElement>('[data-part="at-risk"]')!;
        // As the stylesheet sets it: the size from tokens.css.
        expect(getComputedStyle(number).fontSize).toBe('var(--size-stage-caption)');
        expect(stagePx('--size-stage-caption')).toBeGreaterThanOrEqual(34);
        el.remove();
      });
    });

    RuleScenario("Nothing covers a name or the dog's face", ({ When, Then, And }) => {
      let runs: { label: string; run: Watched; places: Places }[];
      When('the show runs at 12, at 8 and at 2 people', async () => {
        runs = [];
        for (const [label, team] of [
          ['12 people', LONG_TEAM],
          ['8 people', names(8)],
          ['2 people', names(2)],
        ] as const) {
          for (const seed of [1, 5, 8]) {
            const run = await watch(team, team.at(-1)!, seed);
            runs.push({ label: `${label}, seed ${seed}`, run, places: placings(run.plan) });
          }
        }
      });
      Then('no name tag is ever over another', () => {
        for (const { label, run, places } of runs) {
          for (const { time } of run.frames) {
            const tags = run.plan.order
              .map((name) => ({ name, tag: places.tag(name, time) }))
              .filter(({ tag }) => !tag.hidden);
            tags.forEach(({ name, tag }, k) => {
              for (const other of tags.slice(k + 1)) {
                const at = `${label}: ${name} and ${other.name} at ${time}`;
                expect(overlap(tag.box, other.tag.box), at).toBe(false);
              }
            });
          }
        }
      });
      And('no speech bubble covers a name tag or a face', () => {
        let seen = 0;
        for (const { label, run, places } of runs) {
          for (const frame of run.frames) {
            if (frame.bubbles.length === 0) continue;
            const standing = frame.dog.state === 'stand';
            const covered = [
              { what: "the dog's face", box: dogFace(standing) },
              ...run.plan.order.flatMap((name) => {
                const tag = places.tag(name, frame.time);
                const face = {
                  what: `${name}'s face`,
                  box: faceBox(places.at(name, frame.time).spot),
                };
                return tag.hidden ? [face] : [face, { what: `${name}'s tag`, box: tag.box }];
              }),
            ];
            for (const said of frame.bubbles) {
              seen++;
              const box = speechBox(said.text, said, said.lean);
              for (const { what, box: other } of covered) {
                const at = `${label}: "${said.text}" over ${what} at ${frame.time}`;
                expect(overlap(box, other), at).toBe(false);
              }
            }
          }
        }
        expect(seen).toBeGreaterThan(0);
      });
      And(
        "each person's speech bubble moves with them, its tail just over their head, within the middle half of it",
        () => {
          let seen = 0;
          for (const { label, run, places } of runs) {
            for (const frame of run.frames) {
              for (const said of frame.bubbles) {
                if (said.by === 'dog' || said.by === 'gate') continue;
                seen++;
                const at = `${label}: ${said.by}'s "${said.text}" at ${frame.time}`;
                const head = headBox(places.at(said.by, frame.time).spot);
                const middle = (head.left + head.right) / 2;
                expect(Math.abs(said.x - middle), at).toBeLessThanOrEqual(
                  (head.right - head.left) / 4 + 0.1,
                );
                expect(said.y, at).toBeGreaterThanOrEqual(head.top - 24 - 0.1);
                expect(said.y, at).toBeLessThanOrEqual(
                  faceBox(places.at(said.by, frame.time).spot).top + 0.1,
                );
              }
            }
          }
          expect(seen).toBeGreaterThan(0);
        },
      );
      And("no one ever covers the dog's face", () => {
        for (const { label, run, places } of runs) {
          for (const frame of run.frames) {
            const face = dogFace(frame.dog.state === 'stand');
            for (const [name, drawn] of frame.people) {
              const at = `${label}: ${name} at ${frame.time}`;
              if (drawn.layer === 'front' || drawn.layer === 'top') {
                expect(overlap(bodyBox(drawn), face), at).toBe(false);
              }
              const tag = places.tag(name, frame.time);
              if (!tag.hidden) expect(overlap(tag.box, face), `${at}, tag`).toBe(false);
            }
          }
        }
      });
    });
  });

  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario('With reduced motion, nobody bobs', ({ Given, When, Then, And }) => {
      let calm: Watched;
      let moving: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        const seed = seedWhere(names(6), names(6)[5]!, (plan) => plan.ending === 'sniff');
        calm = await watch(names(6), names(6)[5]!, seed, { reducedMotion: true });
        moving = await watch(names(6), names(6)[5]!, seed);
      });
      Then('crossers glide without bobbing on their toes', () => {
        const way = lane(6);
        for (const turn of calm.plan.turns) {
          for (const { by, lane: inLane, reaches } of turn.crossings) {
            for (const frame of between(calm, inLane, reaches)) {
              expect(frame.people.get(by)!.y, `${by} at ${frame.time}`).toBeCloseTo(way.y, 6);
            }
            const bobbing = between(moving, inLane, reaches).map(
              (frame) => frame.people.get(by)!.y,
            );
            expect(Math.min(...bobbing)).toBeLessThan(way.y - 1);
          }
        }
      });
      And("the dog doesn't breathe or jump, and lifts its head without a bounce", () => {
        for (const frame of calm.frames) {
          expect(frame.dog.breath).toBe(1);
          expect(frame.dog.lift).toBeLessThanOrEqual(1);
          if (frame.dog.state === 'stand') expect(frame.dog.y).toBe(DOG_AT.stand.y);
        }
        // Without it, it does all three.
        expect(new Set(moving.frames.map((frame) => frame.dog.breath)).size).toBeGreaterThan(2);
        expect(Math.max(...moving.frames.map((frame) => frame.dog.lift))).toBeGreaterThan(1);
        expect(Math.min(...moving.frames.map((frame) => frame.dog.y))).toBeLessThan(DOG_AT.stand.y);
      });
      And('every caption still appears, in the same order', () => {
        const texts = (run: Watched) => run.record.captions.map((caption) => caption.text);
        expect(texts(calm)).toEqual(texts(moving));
        expect(texts(calm)).toEqual(calm.plan.captions.map((caption) => caption.text));
      });
    });
  });
});
