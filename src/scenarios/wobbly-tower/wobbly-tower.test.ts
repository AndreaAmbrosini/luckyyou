import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { speechBox } from '../../scenario-kit';
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
import { blockOverlaps, headBox, heap, overlap, pointerTip, sideOf, spots, tower } from './layout';
import { grownBoxes } from './play';
import {
  ENDINGS,
  names,
  unluckyOf,
  plans,
  during,
  only,
  total,
  startOf,
  repeatsBeforeLast,
  everyPlan,
  inside,
  anyOverlap,
  shownAt,
  LEANS,
  STEP,
  type Frame,
  type Heard,
  type Moment,
  type Built,
  watch,
  landings,
  stops,
  turnsBack,
  swaysPerSecond,
  tagsOf,
  pointerBox,
  spotOf,
  topOf,
  eightRun,
  expectSwaysAndSettles,
  MARCO_TEAM,
  seedOf,
  marcoRun,
  endingRuns,
  texts,
  pointerCaptionOf,
  heaped,
  said,
  hatBox,
} from './watching';

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

  Rule("It falls on the unlucky person's turn", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, variables) => {
        let team: string[];
        let unlucky: string;
        let frames: Frame[];
        let plan: Plan;
        let lifts: Moment[];
        /** The frame the last block lands in. */
        let last: Frame;
        Given('<count> people, with the unlucky person <position> in the list', () => {
          team = names(Number(variables.count));
          unlucky = variables.position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs', async () => {
          ({ frames, plan, lifts } = await watch(team, unlucky));
          last = landings(frames).at(-1)!;
        });
        Then("the last turn is the unlucky person's", () => {
          expect(last.blocks).toBe(2 + plan.turns.length);
          // Who lifted a block overhead, turn after turn: the last is the unlucky person.
          const holders = lifts.map((lift) => lift.name);
          expect(holders).toHaveLength(plan.turns.length);
          expect(holders.at(-1)).toBe(unlucky);
        });
        And('the tower falls on that turn, toward them', () => {
          const falling = frames.find((frame) => Math.abs(frame.lean) > 30);
          expect(falling).toBeDefined();
          expect(falling!.time).toBeGreaterThan(last.time);
          expect(Math.sign(falling!.lean)).toBe(sideOf(spotOf(plan, unlucky)));
        });
        And("it never falls on anyone else's turn", () => {
          for (const frame of frames.filter((each) => each.time <= last.time)) {
            expect(Math.abs(frame.lean), `at ${frame.time}`).toBeLessThanOrEqual(22 + 1e-6);
          }
        });
      },
    );

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

  Rule('The pointer picks each turn', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario("Nobody knows who's next until it stops", ({ Given, When, Then, And }) => {
      let frames: Frame[];
      let plan: Plan;
      let sign: string;
      let lifts: Moment[];
      Given('8 people', () => {});
      When('the show runs', async () => {
        ({ frames, plan, sign, lifts } = await eightRun());
      });
      Then(
        'before each turn the {string} pointer hops from where it was to the next person',
        (_, label: string) => {
          expect(sign).toBe(label);
          const stopped = stops(frames);
          expect(stopped.map((each) => each.name)).toEqual(
            plan.turns.flatMap((turn) => (turn.decoy ? [turn.decoy, turn.by] : [turn.by])),
          );
          stopped.forEach((stop, index) => {
            const spot = spotOf(plan, stop.name);
            const tip = pointerTip(spot);
            const during = frames.filter(
              (frame) => frame.time >= stop.from && frame.time <= stop.to,
            );
            for (const frame of during) {
              expect(frame.pointer.x).toBeCloseTo(tip.x, 6);
              expect(frame.pointer.y).toBeCloseTo(tip.y, 6);
            }
            if (index === 0) return;
            // In between it hops, over nobody, from where it stopped last.
            const previous = stopped[index - 1]!;
            const hop = frames.filter(
              (frame) =>
                frame.time > previous.to && frame.time < stop.from && frame.pointer.shown > 0,
            );
            expect(hop.length, `hop to ${stop.name}`).toBeGreaterThan(0);
            for (const frame of hop) expect(frame.over).toBe('');
            const from = pointerTip(spotOf(plan, previous.name));
            expect(
              Math.hypot(hop[0]!.pointer.x - from.x, hop[0]!.pointer.y - from.y),
              `hop to ${stop.name}`,
            ).toBeLessThan(80);
          });
        },
      );
      And('it stops over their head before they lift a block', () => {
        expect(lifts).toHaveLength(plan.turns.length);
        const stopped = stops(frames);
        for (const { name, time } of lifts) {
          const frame = frames.find((each) => each.time === time)!;
          expect(frame.over, `${name} at ${time}`).toBe(name);
          const tip = pointerTip(spotOf(plan, name));
          expect(frame.pointer.x).toBeCloseTo(tip.x, 6);
          expect(frame.pointer.y).toBeCloseTo(tip.y, 6);
          // It had stopped over them by then, and is faded out.
          const stop = stopped.find(
            (each) => each.name === name && each.from <= time && each.to >= time,
          );
          expect(stop, `${name} at ${time}`).toBeDefined();
          expect(frame.pointer.shown, `${name} at ${time}`).toBe(0);
        }
      });
      And(
        "it stays there a tenth of a second or more before it's gone, even on the quickest turns",
        () => {
          for (const turn of plan.turns) {
            const after = frames.filter(
              (frame) => frame.time >= turn.stops && frame.time < turn.stops + 0.1 - 1e-6,
            );
            for (const frame of after) {
              expect(frame.over, `${turn.by} at ${frame.time}`).toBe(turn.by);
              expect(frame.pointer.shown, `${turn.by} at ${frame.time}`).toBeGreaterThan(0);
            }
          }
          // Every turn of every plan leaves the pointer that long before the toss.
          for (const count of [2, 5, 8, 12]) {
            for (let seed = 1; seed <= 20; seed++) {
              const each = planShow(names(count), unluckyOf(count), createRandom(seed));
              for (const turn of each.turns) {
                expect(turn.lands - turn.stops, `${count} people, seed ${seed}`).toBeGreaterThan(
                  0.5 - 1e-9,
                );
              }
            }
          }
        },
      );
      And('it never covers a name tag', () => {
        const tags = tagsOf(plan.order);
        for (const frame of frames.filter((each) => each.pointer.shown > 0)) {
          for (const tag of tags) {
            expect(overlap(pointerBox(frame.pointer), tag), `at ${frame.time}`).toBe(false);
          }
        }
      });
    });

    RuleScenario('Careful now, the pointer wavers', ({ Given, When, Then, And }) => {
      let frames: Frame[];
      let plan: Plan;
      let record: ShowRecord;
      let cues: Heard[];
      let careful: Turn[];
      Given('8 people', () => {});
      When('the careful turns start', async () => {
        ({ frames, plan, record, cues } = await eightRun());
        careful = during(plan, 'careful');
      });
      Then(
        'before each careful turn the pointer stops on someone, then hops to someone else',
        () => {
          const from = startOf(plan, 'careful');
          const to = startOf(plan, 'nearly');
          const stopped = stops(frames.filter((frame) => frame.time >= from && frame.time < to));
          expect(stopped.map((each) => each.name)).toEqual(
            careful.flatMap((turn) => [turn.decoy!, turn.by]),
          );
          for (const turn of careful) expect(turn.decoy).not.toBe(turn.by);
          // Between the two stops of a turn, it hops over nobody.
          for (let index = 0; index < stopped.length; index += 2) {
            const [decoy, taker] = [stopped[index]!, stopped[index + 1]!];
            const hop = frames.filter((frame) => frame.time > decoy.to && frame.time < taker.from);
            expect(hop.length).toBeGreaterThan(0);
            for (const frame of hop) expect(frame.over).toBe('');
          }
        },
      );
      And('the caption names whose turn it is', () => {
        for (const turn of careful) {
          const caption = record.captions.find((each) => each.text === `${turn.by}…`);
          expect(caption, turn.by).toBeDefined();
          // The kit holds the caption before for a second, which can hold this one a moment.
          expect(caption!.from).toBeGreaterThanOrEqual(turn.stops - 1e-9);
          expect(caption!.from).toBeLessThanOrEqual(turn.stops + 0.15);
          const shown = frames.find((frame) => frame.time >= caption!.from - 1e-9)!;
          expect(shown.over).toBe(turn.by);
        }
      });
      And('each careful turn takes longer than the one before', () => {
        // On the stage, from the block before landing (the first careful turn
        // from its beat's start, after the pigeon) until this one lands.
        const landed = landings(frames);
        const landing = (turn: Turn) => landed.find((each) => each.time >= turn.lands - 1e-9)!.time;
        const lengths = [
          landing(careful[0]!) - startOf(plan, 'careful'),
          landing(careful[1]!) - landing(careful[0]!),
        ];
        expect(lengths[1]!).toBeGreaterThan(lengths[0]!);
        expect(careful[1]!.seconds).toBeGreaterThan(careful[0]!.seconds);
      });
      And('the heartbeat comes quicker and quicker until the last turn', () => {
        const { heartbeats } = plan;
        // A heartbeat sounds in the frame each of these falls in.
        const beats = cues.filter((each) => each.cue === 'heartbeat').map((each) => each.time);
        expect(beats).toHaveLength(heartbeats.length);
        heartbeats.forEach((time, index) => {
          expect(beats[index]!).toBeGreaterThanOrEqual(time - 1e-9);
          expect(beats[index]!).toBeLessThan(time + STEP + 1e-9);
        });
        expect(heartbeats[0]).toBeCloseTo(startOf(plan, 'careful'), 9);
        expect(heartbeats.at(-1)!).toBeGreaterThanOrEqual(startOf(plan, 'last-turn'));
        expect(heartbeats.at(-1)!).toBeLessThan(plan.turns.at(-1)!.lands);
        const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
        gaps.slice(1).forEach((gap, index) => expect(gap).toBeLessThanOrEqual(gaps[index]! + 1e-9));
        expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
      });
    });

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

  Rule('The tower sways and holds', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Each block lands and the tower sways', ({ When, Then, And }) => {
      let frames: Frame[];
      let plan: Plan;
      let built: Built[];
      let shirts: Record<string, string>;
      let cues: Heard[];
      When('the show runs', async () => {
        ({ frames, plan, built, shirts, cues } = await eightRun());
      });
      Then('each block lands on top of the tower with a thunk', () => {
        const landed = landings(frames);
        // A thunk sounds in the frame each block lands in, and only then.
        expect(cues.filter((each) => each.cue === 'thunk').map((each) => each.time)).toEqual(
          landed.map((frame) => frame.time),
        );
        expect(landed.map((frame) => frame.blocks)).toEqual(
          Array.from({ length: 2 + plan.turns.length }, (_, index) => index + 1),
        );
        plan.turns.forEach((turn, index) => {
          const time = landed[index + 2]!.time;
          expect(time).toBeGreaterThanOrEqual(turn.lands - 1e-9);
          expect(time).toBeLessThan(turn.lands + STEP + 1e-9);
        });
        for (const frame of landed) {
          const top = tower(frame.blocks, frame.lean).at(-1)!;
          expect(frame.top!.x).toBeCloseTo(top.x, 1);
          expect(frame.top!.y).toBeCloseTo(top.y, 1);
          expect(frame.top!.turn).toBeCloseTo(top.turn, 1);
        }
      });
      And("each block is its thrower's shirt colour, after two plain paper blocks", () => {
        const paper = 'var(--color-paper)';
        expect(built.slice(0, 2)).toEqual([
          { by: '', fill: paper },
          { by: '', fill: paper },
        ]);
        expect(built.slice(2).map((block) => block.by)).toEqual(plan.turns.map((turn) => turn.by));
        for (const block of built.slice(2)) expect(block.fill).toBe(shirts[block.by]);
      });
      And(
        'after each block the tower sways and settles before the next turn, except on the last turn',
        () => {
          expectSwaysAndSettles(frames, '8 people');
        },
      );
      And('it never sways more than 3 times a second', () => {
        expect(swaysPerSecond(frames)).toBeLessThanOrEqual(3);
      });
    });

    RuleScenario('The big wobble holds', ({ Given, When, Then, And }) => {
      let frames: Frame[];
      let plan: Plan;
      let record: ShowRecord;
      /** The frames from the big wobble's landing until the turn's end. */
      let wobbling: Frame[];
      /** When the tower is upright and still again. */
      let settled: number;
      Given('8 people', () => {});
      When("the big wobble turn's block lands", async () => {
        ({ frames, plan, record } = await eightRun());
        const wobble = only(plan, 'wobble');
        const lands = landings(frames).find((frame) => frame.time >= wobble.lands - 1e-9)!;
        wobbling = frames.filter(
          (frame) => frame.time >= lands.time && frame.time < wobble.from + wobble.seconds,
        );
        const last = turnsBack(wobbling).at(-1)!;
        settled = wobbling.find((frame) => frame.time > last && Math.abs(frame.lean) < 1e-6)!.time;
      });
      Then('the tower sways wide, three times, each smaller than the one before', () => {
        const swings = turnsBack(wobbling).map(
          (time) => wobbling.find((frame) => frame.time >= time - 1e-9)!.lean,
        );
        expect(swings).toHaveLength(3);
        expect(Math.abs(swings[0]!)).toBeGreaterThanOrEqual(6);
        swings.slice(1).forEach((lean, index) => {
          expect(Math.sign(lean)).toBe(-Math.sign(swings[index]!));
          expect(Math.abs(lean)).toBeLessThan(Math.abs(swings[index]!));
        });
      });
      And('everyone looks scared until it settles', () => {
        for (const frame of wobbling.filter((each) => each.time < settled)) {
          expect(new Set(Object.values(frame.moods)), `at ${frame.time}`).toEqual(
            new Set(['scared']),
          );
        }
        const after = frames.find((frame) => frame.time > settled + 2 * STEP)!;
        expect(Object.values(after.moods)).not.toContain('scared');
      });
      And('the caption is {string}, then {string}', (_, wobble: string, holds: string) => {
        const landed = wobbling[0]!.time;
        const first = record.captions.find((caption) => caption.text === wobble)!;
        const then = record.captions.find((caption) => caption.text === holds)!;
        expect(first.from).toBeGreaterThanOrEqual(landed - STEP);
        expect(first.from).toBeLessThanOrEqual(landed + 0.1);
        expect(then.from).toBeGreaterThanOrEqual(settled - STEP);
        expect(then.from - first.from).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(record.captions.indexOf(then)).toBe(record.captions.indexOf(first) + 1);
      });
    });

    RuleScenarioOutline(
      'Sometimes a pigeon lands on top, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let runs: Plan[];
        let team: string[];
        Given('<count> people', () => {
          team = names(Number(variables.count));
        });
        When('the show runs with 20 different random seeds', () => {
          runs = plans(team.length);
        });
        Then(
          'in some runs a pigeon lands on top after the big wobble, the tower dips, everyone gasps, and it flies off',
          async () => {
            const seed = runs.findIndex((plan) => plan.pigeon) + 1;
            expect(seed).toBeGreaterThan(0);
            const { frames, plan } = await watch(team, unluckyOf(team.length), { seed });
            const P = startOf(plan, 'pigeon');
            const shown = frames.filter((frame) => frame.pigeon);
            expect(shown.length).toBeGreaterThan(0);
            for (const frame of shown) {
              expect(frame.time).toBeGreaterThanOrEqual(P - 1e-9);
              expect(frame.time).toBeLessThanOrEqual(P + plan.beats.pigeon + 1e-9);
            }
            // The big wobble has settled when it comes.
            expect(frames.find((frame) => frame.time >= P - 1e-9)!.lean).toBeCloseTo(0, 6);
            const perched = shown.filter((frame) => frame.pigeon!.pose === 'perched');
            expect(perched.length).toBeGreaterThan(0);
            for (const frame of perched) {
              const top = topOf(frame.blocks, frame.lean);
              expect(frame.pigeon!.x).toBeCloseTo(top.x, 1);
              expect(frame.pigeon!.y).toBeCloseTo(top.y, 1);
            }
            expect(
              Math.max(...perched.map((frame) => Math.abs(frame.lean))),
            ).toBeGreaterThanOrEqual(1);
            expect(
              perched.some((frame) =>
                Object.values(frame.moods).every((mood) => mood === 'scared'),
              ),
            ).toBe(true);
            const gone = shown.at(-1)!;
            expect(gone.pigeon!.pose).toBe('flying');
            expect(gone.pigeon!.x).toBeGreaterThan(perched.at(-1)!.pigeon!.x + 100);
            expect(frames.at(-1)!.pigeon).toBeNull();
          },
        );
        And('in some runs no pigeon comes', async () => {
          const seed = runs.findIndex((plan) => !plan.pigeon) + 1;
          expect(seed).toBeGreaterThan(0);
          const { frames } = await watch(team, unluckyOf(team.length), { seed });
          expect(frames.filter((frame) => frame.pigeon)).toEqual([]);
        });
      },
    );

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
    RuleScenario('Nearly', ({ Given, When, Then, And }) => {
      let frames: Frame[];
      let plan: Plan;
      let record: ShowRecord;
      let nearly: Turn;
      /** The frames the tower leans furthest in, before the fall. */
      let furthest: Frame[];
      Given('8 people', () => {});
      When("the turn before the last one's block lands", async () => {
        ({ frames, plan, record } = await eightRun());
        nearly = only(plan, 'nearly');
        const before = frames.filter((frame) => frame.time < plan.still.to);
        const most = Math.max(...before.map((frame) => Math.abs(frame.lean)));
        furthest = before.filter((frame) => Math.abs(frame.lean) > most - 1e-6);
      });
      Then(
        'the tower leans further than at any other time and holds still there for at least half a second',
        () => {
          expect(Math.abs(furthest[0]!.lean)).toBeCloseTo(22, 6);
          expect(Math.sign(furthest[0]!.lean)).toBe(sideOf(spotOf(plan, nearly.by)));
          // One stretch, in the Nearly beat.
          furthest.slice(1).forEach((frame, index) => {
            expect(frame.time - furthest[index]!.time).toBeCloseTo(STEP, 6);
          });
          expect(furthest.at(-1)!.time - furthest[0]!.time).toBeGreaterThanOrEqual(0.5 - STEP);
          expect(furthest[0]!.time).toBeGreaterThan(nearly.lands);
          expect(furthest.at(-1)!.time).toBeLessThanOrEqual(startOf(plan, 'last-turn') + 1e-9);
        },
      );
      And('it swings back upright', () => {
        const lastLands = plan.turns.at(-1)!.lands;
        const back = frames.filter(
          (frame) => frame.time > furthest.at(-1)!.time && frame.time < lastLands,
        );
        expect(back.some((frame) => Math.abs(frame.lean) < 0.5)).toBe(true);
      });
      And('the thrower says {string}', (_, phew: string) => {
        const thrower = spotOf(plan, nearly.by);
        const said = frames
          .filter((frame) => frame.time > furthest.at(-1)!.time)
          .flatMap((frame) => frame.bubbles)
          .filter((bubble) => bubble.text === phew);
        expect(said.length).toBeGreaterThan(0);
        // Beside the thrower's head.
        for (const bubble of said) {
          expect(Math.abs(bubble.x - thrower.x)).toBeLessThan(thrower.size + 260);
          expect(Math.abs(bubble.y - thrower.y)).toBeLessThan(thrower.size + 120);
        }
      });
      And('the caption is {string}', (_, text: string) => {
        const caption = record.captions.find((each) => each.text === text)!;
        expect(caption).toBeDefined();
        expect(caption.from).toBeGreaterThanOrEqual(nearly.lands - 1e-9);
        expect(caption.from).toBeLessThanOrEqual(nearly.lands + 0.1);
      });
    });

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

  Rule('The last turn could go three ways', ({ RuleScenario, RuleScenarioOutline }) => {
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
    RuleScenario('A moment of stillness, then the fall', ({ When, Then, And }) => {
      let runs: Awaited<ReturnType<typeof endingRuns>>;
      When('the show runs with each ending', async () => {
        runs = await endingRuns();
        expect(runs.map((each) => each.run.plan.ending)).toEqual(ENDINGS);
      });
      Then('the tower barely moves for at least half a second before it falls', () => {
        for (const { ending, run } of runs) {
          const { frames, plan } = run;
          const falls = plan.still.to;
          const before = frames.filter(
            (frame) => frame.time >= falls - 0.5 - 1e-9 && frame.time <= falls,
          );
          expect(before[0]!.time, ending).toBeLessThanOrEqual(falls - 0.5 + STEP);
          const leans = before.map((frame) => frame.lean);
          expect(Math.max(...leans) - Math.min(...leans), ending).toBeLessThan(1);
          // And then it goes: a degree or more within half a second.
          const after = frames.filter((frame) => frame.time > falls && frame.time <= falls + 0.5);
          expect(
            Math.max(...after.map((frame) => Math.abs(frame.lean - leans.at(-1)!))),
            ending,
          ).toBeGreaterThanOrEqual(1);
        }
      });
      And('it falls toward the unlucky person', () => {
        for (const { ending, run } of runs) {
          const side = sideOf(spotOf(run.plan, 'Luca'));
          expect(Math.sign(run.frames.at(-1)!.lean), ending).toBe(side);
          expect(Math.abs(run.frames.at(-1)!.lean), ending).toBeGreaterThan(30);
          for (const rest of run.end.rests) expect(Math.sign(rest.x - 640), ending).toBe(side);
        }
      });
    });
  });

  Rule('The ending is a tumble and a hard hat', ({ RuleScenario }) => {
    RuleScenario('Timber', ({ Given, When, Then, And }) => {
      let run: Awaited<ReturnType<typeof watch>>;
      /** The frames from the fall on. */
      let falling: Frame[];
      Given('the unlucky person is {string}', (_, name: string) => {
        expect(name).toBe('Marco');
      });
      When('the tower falls', async () => {
        run = await marcoRun();
        falling = run.frames.filter((frame) => frame.time >= run.plan.still.to);
      });
      Then(
        "the blocks tumble toward {string} and land around Marco, never on anyone's head",
        (_, name: string) => {
          const { plan, end } = run;
          const spot = spotOf(plan, name);
          const rests = heap(spot, 2 + plan.turns.length);
          expect(end.rests).toHaveLength(rests.length);
          end.rests.forEach((rest, k) => {
            expect(rest.x, `block ${k}`).toBeCloseTo(rests[k]!.x, 6);
            expect(rest.y, `block ${k}`).toBeCloseTo(rests[k]!.y, 6);
            expect(rest.turn, `block ${k}`).toBeCloseTo(rests[k]!.turn, 6);
            expect(Math.sign(rest.x - 640)).toBe(sideOf(spot));
            for (const other of spots(plan.order.length)) {
              expect(blockOverlaps(rests[k]!, headBox(other)), `block ${k}`).toBe(false);
            }
          });
          // They tumble: the top block turns over on its way.
          expect(Math.max(...falling.map((frame) => Math.abs(frame.top!.turn)))).toBeGreaterThan(
            90,
          );
        },
      );
      And("a hard hat drops onto Marco's head, and Marco celebrates", () => {
        const { plan, frames } = run;
        const down = heaped(frames, plan);
        const size = spotOf(plan, 'Marco').size;
        // Hidden until the last block is down, then from above onto the head.
        for (const frame of frames.filter((each) => each.time < down.time)) {
          expect(frame.hat, `at ${frame.time}`).toBeNull();
        }
        const hat = frames.filter((frame) => frame.hat);
        expect(hat[0]!.hat!.y).toBeLessThan(-size);
        hat.slice(1).forEach((frame, index) => {
          expect(frame.hat!.y).toBeGreaterThanOrEqual(hat[index]!.hat!.y);
        });
        expect(frames.at(-1)!.hat!.y).toBeCloseTo(0, 6);
        const fanfare = run.cues.find((each) => each.cue === 'fanfare')!;
        expect(fanfare.time).toBeGreaterThanOrEqual(
          hat.find((frame) => frame.hat!.y === 0)!.time - STEP,
        );
        expect(frames.at(-1)!.moods.Marco).toBe('party');
      });
      And('everyone else cheers', () => {
        for (const name of MARCO_TEAM.filter((each) => each !== 'Marco')) {
          expect(run.frames.at(-1)!.moods[name], name).toBe('happy');
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      let run: Awaited<ReturnType<typeof watch>>;
      Given('the unlucky person is {string}', () => {});
      When('the show runs', async () => {
        run = await marcoRun();
      });
      Then('{string} is on stage, not moving, for the last 1.5 seconds', () => {
        const last = run.frames.filter((frame) => frame.time >= run.record.duration - 1.5 - 1e-9);
        expect(last.length).toBeGreaterThan(40);
        for (const frame of last) expect(frame.them, `at ${frame.time}`).toBe(last[0]!.them);
        expect(last[0]!.them).toContain('scale(1.3');
      });
    });

    RuleScenario('The unlucky person stands out at the end', ({ Given, When, Then, And }) => {
      let run: Awaited<ReturnType<typeof watch>>;
      Given('the unlucky person is {string}', () => {});
      When('the tower has fallen', async () => {
        run = await marcoRun();
      });
      Then('{string} grows to 1.3 times their size, in front of everyone and every block', () => {
        expect(run.end.inFront).toBe(true);
        expect(run.end.scale).toBeCloseTo(1.3, 6);
      });
      And("{string} covers neither Marco's head nor the hard hat", (_, text: string) => {
        const spot = spotOf(run.plan, 'Marco');
        const timber = said(run.frames).filter((each) => each.text === text);
        expect(timber).toHaveLength(1);
        const box = speechBox(text, timber[0]!);
        expect(overlap(box, grownBoxes(spot).head)).toBe(false);
        expect(overlap(box, hatBox(spot))).toBe(false);
      });
      And('{string} is up within 0.2 seconds of the last block landing', (_, text: string) => {
        const caption = run.record.captions.find((each) => each.text === text)!;
        expect(caption).toBeDefined();
        const down = heaped(run.frames, run.plan);
        expect(caption.from - down.time).toBeGreaterThanOrEqual(-1e-9);
        expect(caption.from - down.time).toBeLessThanOrEqual(0.2);
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the story to the end', ({ Given, When, Then }) => {
      let record: ShowRecord;
      Given(
        '8 people, the unlucky person is {string}, a pigeon comes, the careful turns go to {string} and {string}, the pointer goes straight to {string}, and the tower goes dead still at the end',
        async (_, unlucky: string, first: string, second: string, straightTo: string) => {
          expect(straightTo).toBe(unlucky);
          const seed = seedOf(
            MARCO_TEAM,
            unlucky,
            (plan) =>
              plan.pigeon &&
              plan.pointer === 'straight' &&
              plan.ending === 'dead-still' &&
              during(plan, 'careful')
                .map((turn) => turn.by)
                .join() === [first, second].join(),
          );
          ({ record } = await watch(MARCO_TEAM, unlucky, { seed }));
        },
      );
      When('the show runs', () => {});
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const shown = texts(record);
        let from = 0;
        for (const { caption } of table) {
          const at = shown.indexOf(caption, from);
          expect(at, `${caption} after ${shown.slice(0, from).join(' / ')}`).toBeGreaterThanOrEqual(
            0,
          );
          from = at + 1;
        }
      });
    });

    RuleScenario('Each pointer twist has its caption', ({ Given, When, Then, And }) => {
      let unlucky: string;
      let run: Awaited<ReturnType<typeof watch>>;
      /** The caption the last turn starts with, and the frames while it's up. */
      const lastTurnCaption = (seen: Awaited<ReturnType<typeof watch>>, text: string) => {
        const caption = seen.record.captions.find((each) => each.text === text);
        expect(caption, text).toBeDefined();
        const up = seen.frames.filter(
          (frame) => frame.time >= caption!.from - 1e-9 && frame.time < caption!.to,
        );
        expect(up[0]!.beat).toBe('last-turn');
        return up;
      };
      Given('the unlucky person is {string}', (_, name: string) => {
        unlucky = name;
      });
      When(
        'the pointer stops on {string} before hopping to {string}',
        async (_, decoy: string, to: string) => {
          expect(to).toBe(unlucky);
          const seed = seedOf(MARCO_TEAM, unlucky, (plan) => plan.phew === decoy);
          run = await watch(MARCO_TEAM, unlucky, { seed });
        },
      );
      Then('the caption is {string}', (_, text: string) => {
        const up = lastTurnCaption(run, text);
        // Up as the pointer hops on from the decoy, and still up as it stops over them.
        const before = run.frames.filter((frame) => frame.time < up[0]!.time).at(-1)!;
        expect(before.over).toBe(run.plan.phew);
        expect(up[0]!.over).toBe('');
        expect(up.some((frame) => frame.over === unlucky)).toBe(true);
      });
      And(
        'when the pointer stays on {string}, the caption is {string}',
        async (_, name: string, text: string) => {
          const seed = seedOf(MARCO_TEAM, name, (plan) => plan.pointer === 'again');
          const again = await watch(MARCO_TEAM, name, { seed });
          const up = lastTurnCaption(again, text);
          for (const frame of up) expect(['', name]).toContain(frame.over);
          expect(up.some((frame) => frame.over === name)).toBe(true);
        },
      );
    });

    RuleScenario('Each ending has its caption', ({ When, Then }) => {
      let runs: Awaited<ReturnType<typeof endingRuns>>;
      When('the show runs with each ending', async () => {
        runs = await endingRuns();
      });
      Then(
        'before the fall the caption is {string}, {string} then {string}, or {string}, for each ending in turn',
        (_, uhOh: string, holds: string, orNot: string, leaning: string) => {
          const expected: Record<Ending, string[]> = {
            'dead-still': [uhOh],
            'it-holds': [holds, orNot],
            'slow-lean': [leaning],
          };
          for (const { ending, run } of runs) {
            const shown = texts(run.record);
            const pointer = shown.indexOf(
              pointerCaptionOf(run.plan, 'Luca'),
              shown.indexOf('Nearly!'),
            );
            const toppled = shown.indexOf('Luca toppled it!');
            expect(shown.slice(pointer + 1, toppled), ending).toEqual(expected[ending]);
            // Up before the fall; "…or not!" as it goes.
            const captions = run.record.captions.slice(pointer + 1, toppled);
            for (const caption of captions) {
              expect(caption.from, ending).toBeGreaterThanOrEqual(
                run.plan.turns.at(-1)!.lands - 1e-9,
              );
              expect(caption.from, ending).toBeLessThanOrEqual(run.plan.still.to + STEP + 1e-9);
            }
          }
        },
      );
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let records: ShowRecord[];
      When('the show runs', async () => {
        records = [
          (await eightRun()).record,
          ...(await endingRuns()).map((each) => each.run.record),
        ];
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const record of records) {
          expect(record.captions.length).toBeGreaterThanOrEqual(10);
          for (const caption of record.captions) {
            expect(caption.to - caption.from, caption.text).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });
    RuleScenario('Names stay readable', ({ When, Then, And }) => {
      let shown: ReturnType<typeof shownAt>[];
      When('the show runs at 12 and at 2 people', () => {
        shown = [shownAt(12), shownAt(2)];
      });
      Then('every name tag is set at 22 pixels or more on the 1280 by 720 stage', () => {
        for (const { all, boxes } of shown) {
          for (const [index, spot] of all.entries()) {
            expect(spot.tag.size).toBeGreaterThanOrEqual(22);
            expect(boxes[index]!.left).toBeGreaterThanOrEqual(0);
            expect(boxes[index]!.right).toBeLessThanOrEqual(1280);
          }
        }
      });
      And('with 2 people, both name tags are set at 44 pixels or more', () => {
        spots(2).forEach((spot) => expect(spot.tag.size).toBeGreaterThanOrEqual(44));
      });
      And('no name tag is ever over another, under a block or under the pointer', () => {
        for (const { all, boxes } of shown) {
          expect(anyOverlap(boxes)).toBe(false);
          for (const lean of LEANS) {
            for (const block of tower(11, lean)) {
              for (const box of boxes) expect(blockOverlaps(block, box)).toBe(false);
            }
          }
          for (const spot of all) {
            for (const holding of [false, true]) {
              const tip = pointerTip(spot, holding);
              for (const box of boxes) expect(inside(box, tip)).toBe(false);
            }
          }
        }
      });
    });
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
  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario(
      'With reduced motion, the tower leans instead of shaking',
      ({ Given, When, Then, And }) => {
        let calm: Awaited<ReturnType<typeof watch>>;
        let lively: Awaited<ReturnType<typeof watch>>;
        Given('reduced motion is on', () => {});
        When('the show runs', async () => {
          // The shared run at 8, and the same show with reduced motion.
          lively = await eightRun();
          calm = await watch(names(8), 'Luca', { reducedMotion: true });
        });
        Then('the tower leans and settles in one slow move instead of swaying', () => {
          const { frames, plan } = calm;
          // Between one block landing and the next, and on to the fall, it
          // turns back once at most; then it tips over in one go.
          const marks = [...landings(frames).map((frame) => frame.time), plan.still.to];
          marks.slice(1).forEach((to, index) => {
            const between = frames.filter(
              (frame) => frame.time >= marks[index]! && frame.time < to,
            );
            expect(turnsBack(between).length, `after block ${index + 1}`).toBeLessThanOrEqual(1);
          });
          const falling = frames.filter((frame) => frame.time >= plan.still.to);
          expect(turnsBack(falling)).toEqual([]);
          // The blocks drop without turning over.
          for (const frame of falling) expect(Math.abs(frame.top!.turn)).toBeLessThan(45);
          // Without reduced motion the big wobble swings three times, and the blocks tumble.
          const wobble = only(lively.plan, 'wobble');
          const wobbling = lively.frames.filter(
            (frame) => frame.time >= wobble.lands && frame.time < wobble.from + wobble.seconds,
          );
          expect(turnsBack(wobbling)).toHaveLength(3);
          expect(
            Math.max(
              ...lively.frames
                .filter((frame) => frame.time >= lively.plan.still.to)
                .map((frame) => Math.abs(frame.top!.turn)),
            ),
          ).toBeGreaterThan(90);
        });
        And('there are no speed lines', () => {
          expect(calm.frames.filter((frame) => frame.speedLines)).toEqual([]);
          expect(lively.frames.some((frame) => frame.speedLines)).toBe(true);
        });
        And('every caption still appears, in the same order', () => {
          expect(texts(calm.record)).toEqual(texts(lively.record));
          expect(texts(calm.record).at(-1)).toBe('Luca toppled it!');
        });
      },
    );
  });
});
