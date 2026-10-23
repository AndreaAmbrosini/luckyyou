import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { speechBox } from '../../scenario-kit';
import wobblyTower from './index';
import { LEANS as PEAKS, planShow, type Ending, type Plan, type Turn } from './plan';
import {
  blockHeight,
  blockOverlaps,
  headBox,
  heap,
  overlap,
  pointerTip,
  sideOf,
  spots,
  tower,
} from './layout';
import { grownBoxes } from './play';
import {
  ENDINGS,
  names,
  unluckyOf,
  plans,
  only,
  nearlyOf,
  firstTurns,
  stopsOf,
  startOf,
  repeatsBeforeLast,
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
  reversals,
  swaysPerSecond,
  tagsOf,
  pointerBox,
  spotOf,
  eightRun,
  expectSwaysAndSettles,
  MARCO_TEAM,
  marcoRun,
  endingRuns,
  texts,
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
  });

  Rule("Hold the tower and you're safe", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'Nobody goes twice, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let runs: Plan[];
        Given('<count> people', () => {
          count = Number(variables.count);
        });
        When('the show runs with 20 different random seeds', () => {
          runs = plans(count);
        });
        Then('nobody has more than one turn', () => {
          for (const plan of runs) {
            const throwers = plan.turns.map((turn) => turn.by);
            expect(new Set(throwers).size).toBe(throwers.length);
          }
        });
        And("the unlucky person's only turn is the last", () => {
          for (const plan of runs) {
            expect(plan.turns.at(-1)!.by).toBe(unluckyOf(count));
            expect(plan.turns.filter((turn) => turn.by === unluckyOf(count))).toHaveLength(1);
          }
        });
        And('in some runs it falls with 3 people at risk, and in others with 2', () => {
          const ways = runs.map((plan) => plan.fallsWith);
          expect(ways).toContain(3);
          expect(ways).toContain(2);
        });
        And('it never comes down to one person alone', () => {
          for (const plan of runs) {
            // At the last turn, everyone who hasn't gone safe is at risk.
            const safe = plan.turns.filter((turn) => turn.safe !== null).length;
            expect(count - safe).toBe(plan.fallsWith);
            expect(plan.fallsWith).toBeGreaterThanOrEqual(2);
          }
        });
      },
    );

    RuleScenario(
      'Who goes first gives nothing away, and nobody goes twice',
      ({ Given, When, Then, And }) => {
        let runs: Plan[];
        Given('8 people, with the same unlucky person every time', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plans(8, 20, 'Luca');
        });
        Then('the first turn goes to at least 5 different people', () => {
          expect(new Set(runs.map((plan) => plan.turns[0]!.by)).size).toBeGreaterThanOrEqual(5);
        });
        And(
          'the two who share the final three with the unlucky person are at least 4 different people across the runs',
          () => {
            for (const plan of runs) {
              expect(plan.final).toHaveLength(3);
              expect(plan.final).toContain('Luca');
            }
            const others = runs.flatMap((plan) => plan.final.filter((name) => name !== 'Luca'));
            expect(new Set(others).size).toBeGreaterThanOrEqual(4);
          },
        );
      },
    );
  });

  Rule('The pointer picks each turn', ({ RuleScenario }) => {
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
          expect(stopped.map((each) => each.name)).toEqual(firstTurns(plan).flatMap(stopsOf));
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
          for (const turn of firstTurns(plan)) {
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
                  0.5,
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
  });

  Rule('The tower sways and holds', ({ RuleScenario }) => {
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
        const height = blockHeight(2 + plan.turns.length);
        for (const frame of landed) {
          const top = tower(frame.blocks, frame.lean, height).at(-1)!;
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
          expectSwaysAndSettles(frames, plan, '8 people');
        },
      );
      And('it never sways more than 3 times a second', () => {
        expect(swaysPerSecond(frames)).toBeLessThanOrEqual(3);
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
        nearly = nearlyOf(plan);
        const before = frames.filter((frame) => frame.time < plan.still.to);
        const most = Math.max(...before.map((frame) => Math.abs(frame.lean)));
        furthest = before.filter((frame) => Math.abs(frame.lean) > most - 1e-6);
      });
      Then(
        'the tower leans further than at any other time and holds still there for at least half a second',
        () => {
          expect(Math.abs(furthest[0]!.lean)).toBeCloseTo(PEAKS.nearly, 6);
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
        expect(caption.from).toBeLessThanOrEqual(plan.hold.to);
      });
    });

    RuleScenario(
      "Nearly is never the unlucky person's, with 4 or more",
      ({ Given, When, Then }) => {
        let runs: Plan[];
        Given('8 people, with the same unlucky person every time', () => {});
        When('the show runs with 30 different random seeds', () => {
          runs = plans(8, 30, 'Luca');
        });
        Then(
          '{string} happens to at least 3 different people, and never to the unlucky person',
          () => {
            const throwers = runs.map((plan) => nearlyOf(plan).by);
            expect(new Set(throwers).size).toBeGreaterThanOrEqual(3);
            expect(throwers).not.toContain('Luca');
          },
        );
      },
    );
  });

  Rule('The last turn could go three ways', ({ RuleScenario, RuleScenarioOutline }) => {
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
              expect(last.lean).toEqual({ degrees: PEAKS.slowLean, toward: unlucky });
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
            // After the pointer's last stop, on Luca.
            const pointer = shown.indexOf('…Luca!');
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
    RuleScenario('About 25 seconds at 6 people', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('6 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(6);
      });
      Then('each run lasts between 21 and 28 seconds', () => {
        for (const plan of runs) {
          expect(plan.end).toBeGreaterThanOrEqual(21);
          expect(plan.end).toBeLessThanOrEqual(28);
        }
      });
      And(
        'runs where it falls with 2 left last longer than runs where it falls with 3 left',
        () => {
          const ends = (left: number) =>
            runs.filter((plan) => plan.fallsWith === left).map((plan) => plan.end);
          expect(ends(2).length).toBeGreaterThan(0);
          expect(ends(3).length).toBeGreaterThan(0);
          expect(Math.min(...ends(2))).toBeGreaterThan(Math.max(...ends(3)));
        },
      );
    });

    RuleScenario('Every head count lands between 15 and 29 seconds', ({ When, Then }) => {
      let runs: { label: string; plan: Plan }[];
      When(
        'the show runs at every head count from 2 to 12, with each ending, falling with 3 left and with 2 left',
        () => {
          runs = [];
          for (let count = 2; count <= 12; count++) {
            // With 2 or 3 people everyone is at risk to the end.
            for (const left of count <= 3 ? [count] : [3, 2]) {
              for (const ending of ENDINGS) {
                let found = 0;
                for (let seed = 1; found < 5; seed++) {
                  const plan = planShow(names(count), unluckyOf(count), createRandom(seed));
                  if (plan.fallsWith !== left || plan.ending !== ending) continue;
                  runs.push({
                    label: `${count} people, ${left} left, ${ending}, seed ${seed}`,
                    plan,
                  });
                  found++;
                }
              }
            }
          }
        },
      );
      Then('each run lasts between 15 and 29 seconds', () => {
        expect(runs).toHaveLength(5 * 3 * (2 + 2 * 9));
        for (const { label, plan } of runs) {
          expect(plan.end, label).toBeGreaterThanOrEqual(15);
          expect(plan.end, label).toBeLessThanOrEqual(29);
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
          // Nearly leans out and swings back; without reduced motion it
          // overshoots on the way back, so it turns back twice.
          const nearlyLeans = (run: Awaited<ReturnType<typeof watch>>) => {
            const nearly = nearlyOf(run.plan);
            const next = run.plan.turns[run.plan.turns.indexOf(nearly) + 1]!;
            return run.frames.filter(
              (frame) => frame.time >= nearly.lands && frame.time < next.lands,
            );
          };
          expect(reversals(nearlyLeans(calm))).toBe(1);
          expect(reversals(nearlyLeans(lively))).toBe(2);
          // Without reduced motion the blocks tumble.
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
