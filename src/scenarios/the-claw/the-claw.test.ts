import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { melody, speechBox, stagePx, type Note } from '../../scenario-kit';
import { pitchOf } from '../../scenario-kit/music';
import { describeSpec } from '../../scenario-kit/testing';
import theClaw from './index';
import {
  boxOf,
  clawAt,
  faceBox,
  heldSize,
  HUB_UP,
  overlap,
  pileSeats,
  placings,
  shelfSeats,
  STOP_X,
  swing,
  type Places,
} from './layout';
import { clawMusic } from './music';
import { machine, plaque, sign, SIGN } from './parts';
import {
  BUBBLE,
  earlySizes,
  grabOf,
  moodAt,
  type Ending,
  type Grab,
  type Plan,
  type Way,
} from './plan';
import {
  between,
  find,
  frameAt,
  LONG,
  names,
  plansFor,
  STEP,
  times,
  watch,
  type Frame,
  type Run,
  type Watched,
} from './watching';

const ENDINGS: readonly Ending[] = ['hold', 'nearly', 'rim'];
const WAYS: readonly Way[] = ['first', 'second', 'twitch'];

/** The grabs before the final three. */
const early = (plan: Plan) => plan.grabs.filter((grab) => !grab.last);
const lastGrab = (plan: Plan) => plan.grabs.at(-1)!;
/** When the claw sets off along the rail to the stop. */
const carried = (grab: Grab) => grab.notch?.to ?? grab.up;
const unique = <T>(items: readonly T[]) => new Set(items).size;
const mean = (list: readonly number[]) => list.reduce((sum, each) => sum + each, 0) / list.length;
/** Whether seats `a` and `b` of `people` are next to each other in the pile. */
const nextTo = (people: number, a: number, b: number) =>
  people <= 8
    ? Math.abs(a - b) === 1
    : Math.floor(a / 3) === Math.floor(b / 3) && Math.abs(a - b) === 1;

/** The show second `score` reaches song beat `beat`, found by halving. */
function timeAt(score: ReturnType<typeof clawMusic>, beat: number): number {
  let [low, high] = [score.from, score.to];
  for (let k = 0; k < 50; k++) {
    const middle = (low + high) / 2;
    if (score.at(middle).beat < beat) low = middle;
    else high = middle;
  }
  return low;
}

/** Whether nothing moves on the stage of `run` from `from` up to `to`: not the claw, nor anyone. */
function stillBetween(run: Watched, from: number, to: number): boolean {
  const frames = between(run, from, to);
  const key = (frame: Frame) =>
    JSON.stringify([
      frame.claw,
      [...frame.people.values()].map((drawn) => [
        drawn.x,
        drawn.top,
        drawn.size,
        drawn.rot,
        drawn.visible,
      ]),
    ]);
  return frames.length > 0 && frames.every((frame) => key(frame) === key(frames[0]!));
}

describeSpec(await loadFeature('./the-claw.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows The Claw', ({ Then, And }) => {
      Then('its name is "The Claw"', () => {
        expect(theClaw.name).toBe('The Claw');
      });
      And('its description is "Whoever the claw keeps hold of gets the job."', () => {
        expect(theClaw.description).toBe('Whoever the claw keeps hold of gets the job.');
      });
      And('it takes 2 to 12 people', () => {
        expect(theClaw.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule('The unlucky person is the prize', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        let team: string[];
        let unlucky: string;
        let run: Watched;
        Given('<count> people, with the unlucky person <position> in the list', () => {
          team = names(Number(count));
          unlucky = position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs', async () => {
          run = await watch(team, unlucky, 1);
        });
        Then('the unlucky person is in the last grab, and in no other', () => {
          expect(lastGrab(run.plan).by).toContain(unlucky);
          for (const grab of early(run.plan)) expect(grab.by).not.toContain(unlucky);
        });
        And('the unlucky person goes down the chute and comes out of the prize door', () => {
          const theirs = run.frames.map((frame) => frame.people.get(unlucky)!);
          expect(theirs.some((drawn) => drawn.layer === 'chute')).toBe(true);
          expect(theirs.some((drawn) => !drawn.visible)).toBe(true);
          const end = run.frames.at(-1)!;
          expect(end.door).toBe('open');
          expect([end.people.get(unlucky)!.x, end.people.get(unlucky)!.size]).toEqual([730, 170]);
        });
        And('nobody else goes down the chute', () => {
          for (const frame of run.frames) {
            for (const [name, drawn] of frame.people) {
              if (name !== unlucky) expect(drawn.layer).not.toBe('chute');
            }
          }
        });
      },
    );
  });

  Rule('Every grab really grabs', ({ RuleScenario }) => {
    RuleScenario('The claw goes straight to whoever it takes', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(8, 20);
      });
      Then('the claw only ever stops over the pile above whoever it is about to take', () => {
        for (const { plan, seed } of runs) {
          const seats = pileSeats(8);
          let was = clawAt(plan, 0);
          for (const t of times(0.02, plan.end)) {
            const now = clawAt(plan, t);
            const stopped = Math.abs(now.x - was.x) < 1e-6 && Math.abs(now.x - STOP_X) > 1e-6;
            was = now;
            if (!stopped) continue;
            const grab = plan.grabs.findLast((each) => each.from <= t)!;
            expect(t, `seed ${seed} at ${t}`).toBeGreaterThanOrEqual(grab.over - 1e-6);
            expect(t, `seed ${seed} at ${t}`).toBeLessThanOrEqual(carried(grab) + 0.03);
            // Over them, but for its tremble as it strains.
            const xs = grab.by.map((name) => seats[plan.seats.get(name)!]!.x);
            expect(now.x).toBeGreaterThanOrEqual(Math.min(...xs) - 2);
            expect(now.x).toBeLessThanOrEqual(Math.max(...xs) + 2);
          }
        }
      });
      And('each time it comes down, it comes up with someone', () => {
        for (const { plan, seed } of runs) {
          const places = placings(plan);
          let downs = 0;
          let down = false;
          for (const t of times(0, plan.end)) {
            const low = clawAt(plan, t).hub > HUB_UP + 0.5;
            if (low && !down) downs++;
            down = low;
          }
          expect(downs, `seed ${seed}`).toBe(plan.grabs.length);
          for (const grab of plan.grabs) {
            expect(grab.by.length).toBeGreaterThan(0);
            for (const name of grab.by) {
              expect(places.at(name, grab.up).layer, `seed ${seed}: ${name}`).toBe('held');
            }
          }
        }
      });
      And('it never comes down anywhere but over the pile', () => {
        const seats = pileSeats(8);
        const [left, right] = [
          Math.min(...seats.map((s) => s.x)),
          Math.max(...seats.map((s) => s.x)),
        ];
        for (const { plan, seed } of runs) {
          for (const t of times(0, plan.end)) {
            const claw = clawAt(plan, t);
            if (claw.hub <= HUB_UP + 1e-6) continue;
            expect(claw.x, `seed ${seed} at ${t}`).toBeGreaterThanOrEqual(left);
            expect(claw.x, `seed ${seed} at ${t}`).toBeLessThanOrEqual(right);
          }
        }
      });
    });

    RuleScenario('A grab', ({ Given, When, Then, And }) => {
      let run: Watched;
      let grab: Grab;
      let name: string;
      Given('6 people', async () => {
        run = await watch(names(6), 'Fabio', 3);
      });
      When('the claw takes someone, before the last grab', () => {
        grab = run.plan.grabs[1]!;
        name = grab.by[0]!;
        expect(grab.last).toBe(false);
      });
      Then('it comes down open, shuts round their head and lifts them to the rail', () => {
        const going = between(run, grab.over, grab.down);
        going.slice(1).forEach((frame, k) => {
          expect(frame.claw.hub).toBeGreaterThanOrEqual(going[k]!.claw.hub);
        });
        expect(frameAt(run, grab.down - 0.02).claw.pose).toBe('open');
        const shut = frameAt(run, grab.shut);
        expect(shut.claw.pose).toBe('grip');
        // Round their head: its top just under the hub.
        const held = shut.people.get(name)!;
        expect(held.layer).toBe('held');
        expect(held.top - shut.claw.hub).toBeCloseTo(32, 0);
        const up = frameAt(run, grab.up);
        expect(up.claw.hub).toBeCloseTo(HUB_UP, 6);
        expect(up.people.get(name)!.top - HUB_UP).toBeCloseTo(32, 0);
      });
      And('it carries them along the rail to the stop over the prize chute', () => {
        // The last frame before it gets there, and the first after.
        const near = between(run, grab.up, grab.stop).at(-1)!;
        expect(Math.abs(near.claw.x - STOP_X)).toBeLessThan(2);
        expect(Math.abs(near.people.get(name)!.x - STOP_X)).toBeLessThan(2);
        const stop = frameAt(run, grab.stop);
        expect(stop.claw.x).toBeCloseTo(STOP_X, 6);
        expect(stop.claw.hub).toBeCloseTo(HUB_UP, 6);
        expect(stop.people.get(name)!.layer).toBe('held');
      });
      And('the caption names them, as "It\'s got Elena!", as it shuts', () => {
        const caption = run.record.captions.find((each) => each.text === `It's got ${name}!`)!;
        expect(Math.abs(caption.from - grab.down)).toBeLessThanOrEqual(STEP + 1e-9);
      });
      And('whoever it is coming down on, or holds, looks scared and sweats', () => {
        for (const frame of between(run, grab.from + STEP, grab.slip)) {
          const drawn = frame.people.get(name)!;
          expect([drawn.mood, drawn.sweat], `at ${frame.time}`).toEqual(['scared', true]);
        }
      });
      And('everyone else stays where they sit', () => {
        const before = frameAt(run, grab.from);
        for (const frame of between(run, grab.from, grab.slip)) {
          for (const [other, drawn] of frame.people) {
            if (other === name) continue;
            const was = before.people.get(other)!;
            expect([drawn.x, drawn.top, drawn.size], `${other} at ${frame.time}`).toEqual([
              was.x,
              was.top,
              was.size,
            ]);
          }
        }
      });
    });

    RuleScenario('Unhurried before the final three', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('6 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(6, 20);
      });
      Then(
        'from the claw setting off for one grab to its setting off for the next, 2.9 seconds or more go by',
        () => {
          for (const { plan } of runs) {
            plan.grabs.slice(1).forEach((grab, k) => {
              expect(grab.from - plan.grabs[k]!.from).toBeGreaterThanOrEqual(2.9);
            });
          }
        },
      );
      And(
        "each of the claw's moves lasts 0.4 seconds or more, but for its fingers opening and shutting",
        () => {
          for (const { plan } of runs) {
            for (const grab of plan.grabs) {
              const moves = [
                grab.over - grab.from,
                grab.down - grab.over,
                grab.up - grab.shut,
                grab.stop - carried(grab),
                ...grab.kicks.map((kick) => kick.peak - kick.from),
              ];
              for (const seconds of moves) expect(seconds).toBeGreaterThanOrEqual(0.4 - 1e-9);
            }
          }
        },
      );
    });
  });

  Rule("Slip out and you're safe", ({ RuleScenarioOutline, RuleScenario }) => {
    RuleScenario('The stop shakes them loose', ({ Given, When, Then, And }) => {
      let run: Watched;
      let grab: Grab;
      let name: string;
      Given('6 people', async () => {
        run = await watch(names(6), 'Fabio', 3);
      });
      When('a grab before the last reaches the stop', () => {
        grab = run.plan.grabs[0]!;
        name = grab.by[0]!;
        expect(frameAt(run, grab.stop).claw.x).toBeCloseTo(STOP_X, 6);
      });
      Then('the claw kicks out past the end of the rail, towards the shelf', () => {
        const peak = frameAt(run, grab.slip - 0.02);
        expect(peak.claw.th).toBeGreaterThan(20);
        // The claw's lower corner, swung about the trolley, is past the rail's end at 814.
        const a = (peak.claw.th * Math.PI) / 180;
        const corner = STOP_X + 130 * Math.cos(a) + (peak.claw.hub + 140 - 134) * Math.sin(a);
        expect(corner).toBeGreaterThan(814);
        for (const frame of between(run, grab.stop, grab.slip)) {
          expect(frame.claw.th).toBeGreaterThanOrEqual(0);
        }
      });
      And('at the top of the kick whoever it holds slips out, and flies onto the shelf', () => {
        const flight = run.plan.flights.find((each) => each.by === name)!;
        expect(flight.from).toBe(grab.slip);
        expect(frameAt(run, grab.slip - 0.02).people.get(name)!.layer).toBe('held');
        expect(frameAt(run, grab.slip + 0.06).people.get(name)!.layer).toBe('top');
        const seat = shelfSeats(6)[flight.seat]!;
        const landed = frameAt(run, flight.to + 0.2).people.get(name)!;
        expect([landed.layer, landed.x, landed.size]).toEqual(['pile', seat.x, seat.size]);
      });
      And('they say "Phew!" as they land, and sit there, smaller and happy, until the end', () => {
        const flight = run.plan.flights.find((each) => each.by === name)!;
        const landing = frameAt(run, flight.to + 0.02);
        expect(landing.bubbles).toContainEqual(
          expect.objectContaining({ text: 'Phew!', by: name }),
        );
        expect(landing.people.get(name)!.mood).toBe('happy');
        const held = frameAt(run, grab.up).people.get(name)!.size;
        const seat = landing.people.get(name)!;
        for (const frame of between(run, flight.to + 0.2)) {
          const drawn = frame.people.get(name)!;
          expect([drawn.x, drawn.top, drawn.size]).toEqual([seat.x, seat.top, seat.size]);
          expect(drawn.size).toBeLessThan(held);
        }
      });
      And('the number on the "At risk" plaque goes down by one for each who lands', () => {
        let was = 6;
        for (const frame of between(run, 0, run.plan.prize)) {
          const count = Number(frame.plaque.replace('At risk: ', ''));
          const landed = run.plan.flights.filter((flight) => flight.to <= frame.time + 1e-9);
          expect(count, `at ${frame.time}`).toBe(6 - landed.length);
          expect(was - count).toBeLessThanOrEqual(1);
          was = count;
        }
      });
      And('the claw shuts on nothing and sets off for the next', () => {
        expect(frameAt(run, grab.slip + 0.25).claw.pose).toBe('shut');
        const next = run.plan.grabs[1]!;
        for (const frame of between(run, grab.slip, next.from)) {
          expect(frame.claw.x).toBeCloseTo(STOP_X, 6);
        }
        expect(frameAt(run, next.over).claw.x).toBeCloseTo(next.x, 6);
      });
    });

    RuleScenario('The shelf is out of reach', ({ When, Then, And }) => {
      let runs: Run[];
      When('the show runs at every head count from 2 to 12', () => {
        runs = Array.from({ length: 11 }, (_, k) => plansFor(k + 2, 3)).flat();
      });
      Then('the rail ends at the stop over the chute', () => {
        const stall = machine(8);
        const [rail, stop] = [...stall.querySelectorAll('rect')].filter((rect) =>
          ['127', '116'].includes(rect.getAttribute('y')!),
        );
        const end = Number(rail!.getAttribute('x')) + Number(rail!.getAttribute('width'));
        const from = Number(stop!.getAttribute('x'));
        expect(end).toBeGreaterThan(from);
        expect(end).toBeLessThan(from + Number(stop!.getAttribute('width')));
        // The claw's place at the stop is over the middle of the chute's rim.
        expect(STOP_X).toBe(730);
      });
      And('every seat on the shelf is past the stop, under the sign "Out of reach"', () => {
        expect(sign().textContent).toBe('Out of reach');
        for (let people = 2; people <= 12; people++) {
          for (const seat of shelfSeats(people)) {
            expect(seat.x - seat.size / 2).toBeGreaterThan(STOP_X + 46);
            expect(seat.x).toBeGreaterThanOrEqual(SIGN.left);
            expect(seat.x).toBeLessThanOrEqual(SIGN.left + SIGN.width);
            expect(seat.feet - 1.16 * seat.size).toBeGreaterThan(SIGN.top + SIGN.height);
          }
        }
      });
      And("the claw's trolley is never further along the rail than the stop", () => {
        for (const { plan } of runs) {
          for (const t of times(0, plan.end, 0.05)) {
            expect(clawAt(plan, t).x).toBeLessThanOrEqual(STOP_X + 1e-9);
          }
        }
      });
    });

    RuleScenario('The shelf fills towards the chute', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => {});
      When('the show runs', () => {
        runs = plansFor(8, 10).concat(plansFor(12, 10), plansFor(6, 10));
      });
      const seatOf = (plan: Plan, k: number) => shelfSeats(plan.people)[plan.flights[k]!.seat]!;
      Then("the first to land sits on the shelf's highest tier, furthest from the chute", () => {
        for (const { plan } of runs) {
          const seats = shelfSeats(plan.people);
          const first = seatOf(plan, 0);
          expect(first.tier).toBe(Math.max(...seats.map((seat) => seat.tier)));
          const tier = seats.filter((seat) => seat.tier === first.tier);
          expect(first.x).toBe(Math.max(...tier.map((seat) => seat.x)));
        }
      });
      And('everyone after lands on that tier nearer the chute, or on a lower one', () => {
        for (const { plan } of runs) {
          plan.flights.slice(1).forEach((_, k) => {
            const [was, now] = [seatOf(plan, k), seatOf(plan, k + 1)];
            if (now.tier === was.tier) expect(now.x).toBeLessThan(was.x);
            else expect(now.tier).toBeLessThan(was.tier);
          });
        }
      });
      And('the last to land sits on the floor, in the seat next to the chute', () => {
        for (const { plan } of runs) {
          const last = seatOf(plan, plan.flights.length - 1);
          expect([last.tier, last.x]).toEqual([0, 945]);
        }
      });
      And('nobody flies past anyone already sitting on the shelf', () => {
        for (const { plan, seed } of runs) {
          const places = placings(plan);
          for (const flight of plan.flights) {
            for (const t of times(flight.from, flight.to - 0.01, 0.01)) {
              const flying = boxOf(places.at(flight.by, t).spot);
              for (const other of plan.flights) {
                if (other.to > t - 1e-9) continue;
                const sitting = boxOf(places.at(other.by, t).spot);
                expect(
                  overlap(flying, sitting),
                  `seed ${seed}: ${flight.by} past ${other.by} at ${t}`,
                ).toBe(false);
              }
            }
          }
        }
      });
    });

    RuleScenarioOutline(
      'Nobody is grabbed twice, with <count> people',
      ({ Given, When, Then, And }, { count }) => {
        let runs: Run[];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plansFor(Number(count), 20);
        });
        Then('nobody is in more than one grab', () => {
          for (const { plan } of runs) {
            const grabbed = plan.grabs.flatMap((grab) => grab.by);
            expect(unique(grabbed)).toBe(grabbed.length);
          }
        });
        And('nobody who has landed on the shelf leaves it', () => {
          for (const { plan, seed } of runs) {
            const places = placings(plan);
            expect(unique(plan.flights.map((flight) => flight.by))).toBe(plan.flights.length);
            for (const flight of plan.flights) {
              const seat = places.shelfSpot(flight.by)!;
              for (const t of times(flight.to, plan.end, 0.25)) {
                const { spot, layer } = places.at(flight.by, t);
                expect(layer, `seed ${seed}: ${flight.by} at ${t}`).toBe('pile');
                expect([spot.x, spot.top]).toEqual([seat.x, seat.top]);
              }
            }
          }
        });
        And('one of the final three is never grabbed', () => {
          for (const { plan } of runs) {
            expect(plan.final).toContain(plan.third);
            expect(grabOf(plan, plan.third!)).toBeUndefined();
          }
        });
      },
    );

    RuleScenario('Who goes first gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(8, 20, 'Carla');
      });
      Then('the first grab takes at least 5 different people across the runs', () => {
        expect(unique(runs.flatMap(({ plan }) => plan.grabs[0]!.by))).toBeGreaterThanOrEqual(5);
      });
      And('the unlucky person sits in at least 5 different seats', () => {
        expect(unique(runs.map(({ plan }) => plan.seats.get('Carla')))).toBeGreaterThanOrEqual(5);
      });
      And(
        'the two who share the final three with the unlucky person are at least 4 different people',
        () => {
          const sharing = runs.flatMap(({ plan }) => plan.final.filter((name) => name !== 'Carla'));
          expect(unique(sharing)).toBeGreaterThanOrEqual(4);
        },
      );
      And(
        'whoever shares the last grab with the unlucky person is at least 3 different people',
        () => {
          expect(unique(runs.map(({ plan }) => plan.other))).toBeGreaterThanOrEqual(3);
        },
      );
    });
  });

  Rule(
    'Never more than three grabs before the final three',
    ({ RuleScenarioOutline, RuleScenario }) => {
      RuleScenarioOutline('<count> people', ({ Given, When, Then }, { count, sizes }) => {
        let runs: Run[];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plansFor(Number(count), 20);
        });
        Then('the grabs before the final three take <sizes> people, in some order', () => {
          const wanted = sizes.split(/, | and /).map(Number);
          expect(earlySizes(Number(count))).toEqual(wanted);
          for (const { plan } of runs) {
            const taken = early(plan).map((grab) => grab.by.length);
            expect([...taken].sort().reverse()).toEqual(wanted);
          }
          // Not always in the same order, where the sizes differ.
          if (unique(wanted) > 1) {
            expect(unique(runs.map(({ plan }) => early(plan)[0]!.by.length))).toBeGreaterThan(1);
          }
        });
      });

      RuleScenario('Two or three at once', ({ Given, When, Then, And }) => {
        let runs: Run[];
        let many: { plan: Plan; grab: Grab }[];
        Given('12 people', () => {
          runs = plansFor(12, 10).concat(plansFor(10, 10));
        });
        When('a grab takes more than one person', () => {
          many = runs.flatMap(({ plan }) =>
            early(plan)
              .filter((grab) => grab.by.length > 1)
              .map((grab) => ({ plan, grab })),
          );
          expect(many.some(({ grab }) => grab.by.length === 2)).toBe(true);
          expect(many.some(({ grab }) => grab.by.length === 3)).toBe(true);
        });
        Then('they sat next to one another in the pile', () => {
          for (const { plan, grab } of many) {
            const seats = grab.by.map((name) => plan.seats.get(name)!).sort((a, b) => a - b);
            seats
              .slice(1)
              .forEach((seat, k) => expect(nextTo(plan.people, seats[k]!, seat)).toBe(true));
          }
        });
        And("two hang by their loops, one from each of the claw's fingertips", () => {
          for (const { grab } of many.filter(({ grab }) => grab.by.length === 2)) {
            expect(grab.holds).toEqual(['left', 'right']);
          }
        });
        And('of three, one hangs from the prong under the hub and one from each fingertip', () => {
          for (const { grab } of many.filter(({ grab }) => grab.by.length === 3)) {
            expect(grab.holds).toEqual(['left', 'mid', 'right']);
          }
        });
        And(
          'the caption names two, as "It\'s got Ivo & Jonas!", and says "It\'s got three!" for three',
          () => {
            for (const { plan, grab } of many) {
              const caption = plan.captions.find((each) => Math.abs(each.at - grab.down) < 1e-9)!;
              expect(caption.text).toBe(
                grab.by.length === 2
                  ? `It's got ${grab.by[0]} & ${grab.by[1]}!`
                  : "It's got three!",
              );
            }
          },
        );
        And('they all slip out at the same kick, and land 0.12 seconds apart', () => {
          for (const { plan, grab } of many) {
            const flights = plan.flights.filter((flight) => grab.by.includes(flight.by));
            expect(flights).toHaveLength(grab.by.length);
            for (const flight of flights) expect(flight.from).toBe(grab.slip);
            flights.slice(1).forEach((flight, k) => {
              expect(flight.to - flights[k]!.to).toBeCloseTo(0.12, 9);
            });
          }
        });
        And('the last of them to land says "Phew!"', () => {
          for (const { plan, grab } of many) {
            const landed = plan.flights.filter((flight) => grab.by.includes(flight.by)).at(-1)!;
            const phews = plan.says.filter(
              (say) => say.text === 'Phew!' && grab.by.includes(say.by),
            );
            expect(phews).toEqual([expect.objectContaining({ by: landed.by, at: landed.to })]);
          }
        });
      });

      RuleScenario(
        'From 9 people the claw takes a column at a time',
        ({ Given, When, Then, And }) => {
          let runs: Run[];
          Given('12 people', () => {});
          When('the show runs with 20 different random seeds', () => {
            runs = plansFor(12, 20).concat(plansFor(9, 20));
          });
          Then('the pile is four columns', () => {
            for (const people of [9, 12]) {
              const columns = new Set(pileSeats(people).map((_, k) => Math.floor(k / 3)));
              expect(columns.size).toBe(4);
            }
          });
          And('each grab before the last takes one whole column', () => {
            for (const { plan } of runs) {
              for (const grab of early(plan)) {
                const columns = grab.by.map((name) => Math.floor(plan.seats.get(name)! / 3));
                expect(unique(columns)).toBe(1);
                const column = [...plan.seats].filter(
                  ([, seat]) => Math.floor(seat / 3) === columns[0],
                );
                expect(column.map(([name]) => name).sort()).toEqual([...grab.by].sort());
              }
            }
          });
        },
      );
    },
  );

  Rule('A grab can slip a notch', ({ RuleScenario }) => {
    RuleScenario('Eek', ({ Given, When, Then, And }) => {
      let runs: Run[];
      const notched = (plan: Plan) => early(plan).find((grab) => grab.notch);
      Given('6 people', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(6, 30);
      });
      Then(
        'in some runs, on one grab before the final three, whoever the claw holds slips a notch on the way up',
        () => {
          const some = runs.filter(({ plan }) => notched(plan));
          expect(some.length).toBeGreaterThan(0);
          for (const { plan } of some) {
            expect(early(plan).filter((grab) => grab.notch)).toHaveLength(1);
            const grab = notched(plan)!;
            expect(grab.by).toContain(grab.notch!.by);
            expect(grab.notch!.from).toBe(grab.up);
          }
        },
      );
      And(
        'they say "Eek!", the claw strains, and it holds still for 0.8 seconds before it lifts on',
        () => {
          for (const { plan } of runs.filter(({ plan }) => notched(plan))) {
            const { notch } = notched(plan)!;
            expect(plan.says).toContainEqual(
              expect.objectContaining({ text: 'Eek!', by: notch!.by, at: notch!.from }),
            );
            expect(notch!.to - notch!.from).toBeCloseTo(0.8, 9);
            const at = clawAt(plan, notch!.from);
            for (const t of times(notch!.from + 0.01, notch!.to - 0.01)) {
              const claw = clawAt(plan, t);
              expect(claw.marks).toBe('strain');
              expect(claw.hub).toBe(at.hub);
              expect(Math.abs(claw.x - at.x)).toBeLessThanOrEqual(2);
            }
          }
        },
      );
      And('in some runs no grab before the final three slips a notch', () => {
        expect(runs.some(({ plan }) => !notched(plan))).toBe(true);
      });
      And('the first grab never does, and no grab of two or three does', () => {
        for (const { plan } of [...runs, ...plansFor(8, 30), ...plansFor(12, 30)]) {
          const grabs = early(plan);
          expect(grabs[0]!.notch).toBeNull();
          for (const grab of grabs) if (grab.by.length > 1) expect(grab.notch).toBeNull();
        }
      });
    });
  });

  Rule('The final three', ({ RuleScenario }) => {
    RuleScenario('Final three', ({ Given, When, Then, And }) => {
      let run: Watched;
      Given('8 people', async () => {
        run = await watch(names(8), 'Hana', 1);
      });
      When('3 people are left in the pile', () => {
        const pile = [...frameAt(run, run.plan.spotlight).people.values()].filter(
          (drawn) => drawn.layer === 'pile' && drawn.x < STOP_X,
        );
        expect(pile).toHaveLength(3);
      });
      Then('the caption is "Final three!"', () => {
        const caption = run.record.captions.find((each) => each.text === 'Final three!')!;
        expect(Math.abs(caption.from - run.plan.spotlight)).toBeLessThanOrEqual(STEP + 1e-9);
      });
      And('the three look scared and sweat', () => {
        for (const frame of between(run, run.plan.spotlight + STEP, lastGrab(run.plan).from)) {
          for (const name of run.plan.final) {
            const drawn = frame.people.get(name)!;
            expect([drawn.mood, drawn.sweat], `${name} at ${frame.time}`).toEqual(['scared', true]);
          }
        }
      });
      And('everyone on the shelf looks worried', () => {
        const frame = frameAt(run, run.plan.spotlight + BUBBLE + STEP);
        const shelf = run.plan.flights.filter((flight) => flight.to <= run.plan.spotlight);
        expect(shelf.length).toBe(5);
        for (const { by } of shelf) expect(frame.people.get(by)!.mood, by).toBe('worried');
      });
      And(
        'the heartbeat starts, and comes quicker and quicker until the claw shuts round the unlucky person, or they tip into the chute',
        () => {
          const beats = run.cues.filter(({ cue }) => cue === 'heartbeat').map(({ time }) => time);
          expect(Math.abs(beats[0]! - run.plan.spotlight)).toBeLessThanOrEqual(STEP + 1e-9);
          const gaps = beats.slice(1).map((time, k) => time - beats[k]!);
          gaps
            .slice(1)
            .forEach((gap, k) => expect(gap).toBeLessThanOrEqual(gaps[k]! + STEP + 1e-9));
          expect(gaps.at(-1)!).toBeLessThan(gaps[0]! - 0.2);
          expect(beats.at(-1)!).toBeLessThan(run.plan.wake);
          expect(run.plan.wake - beats.at(-1)!).toBeLessThan(1);
        },
      );
    });
  });

  Rule('The last grab takes two', ({ RuleScenario }) => {
    RuleScenario('Two of the final three', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30);
      });
      Then(
        'the last grab takes two of the final three: the unlucky person, and one of the others who sat next to them',
        () => {
          for (const { plan, unlucky } of runs) {
            const last = lastGrab(plan);
            expect(last.by).toHaveLength(2);
            expect(last.by).toContain(unlucky);
            const other = last.by.find((name) => name !== unlucky)!;
            expect(plan.final).toContain(other);
            expect(nextTo(8, plan.seats.get(unlucky)!, plan.seats.get(other)!)).toBe(true);
          }
        },
      );
      And('one hangs from each fingertip, both drawn the same size', () => {
        for (const { plan } of runs) {
          const last = lastGrab(plan);
          expect(last.holds).toEqual(['left', 'right']);
          const places = placings(plan);
          for (const t of times(last.shut, last.slip, 0.1)) {
            const [a, b] = last.by.map((name) => places.at(name, t).spot.size);
            expect(a).toBe(b);
            expect(a).toBe(heldSize(8, true));
          }
        }
      });
      And(
        'the unlucky person hangs from the left fingertip in some runs, and from the right in others',
        () => {
          const sides = runs.map(({ plan, unlucky }) => {
            const last = lastGrab(plan);
            return last.holds[last.by.indexOf(unlucky)];
          });
          expect(new Set(sides)).toEqual(new Set(['left', 'right']));
        },
      );
      And('the third of the final three stays in the pile, scared, until the prize is out', () => {
        for (const { plan, seed } of runs) {
          const places = placings(plan);
          const third = plan.third!;
          const seat = places.at(third, 0).spot;
          for (const t of times(plan.spotlight, plan.prize - 0.01, 0.1)) {
            const { spot, layer } = places.at(third, t);
            expect(layer, `seed ${seed} at ${t}`).toBe('pile');
            expect(spot.x).toBe(seat.x);
            expect(moodAt(plan, third, t).mood, `seed ${seed} at ${t}`).toBe('scared');
          }
        }
      });
    });

    RuleScenario('Slower than any grab before', ({ Given, When, Then }) => {
      let runs: Run[];
      Given('8 people', () => {
        runs = plansFor(8, 20);
      });
      When('the last grab sets off', () => {});
      Then('the claw travels, lifts and carries slower than on any grab before it', () => {
        for (const { plan } of runs) {
          const last = lastGrab(plan).pace;
          for (const { pace } of early(plan)) {
            expect(last.travel).toBeLessThan(pace.travel);
            expect(last.down).toBeGreaterThan(pace.down);
            expect(last.lift).toBeGreaterThan(pace.lift);
            expect(last.carry).toBeLessThan(pace.carry);
          }
        }
      });
    });

    RuleScenario('The last grab can slip a notch too', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30, 'Hana');
      });
      Then('in some runs one of the two slips a notch on the way up, "Eek!"', () => {
        const notched = runs.filter(({ plan }) => lastGrab(plan).notch);
        expect(notched.length).toBeGreaterThan(0);
        expect(notched.length).toBeLessThan(runs.length);
        for (const { plan } of notched) {
          const { notch, by } = lastGrab(plan);
          expect(by).toContain(notch!.by);
          expect(plan.says).toContainEqual(
            expect.objectContaining({ text: 'Eek!', by: notch!.by, at: notch!.from }),
          );
        }
      });
      And('it is the unlucky person in some of those runs, and the other in others', () => {
        const who = runs.flatMap(({ plan }) => {
          const notch = lastGrab(plan).notch;
          return notch ? [notch.by === 'Hana'] : [];
        });
        expect(new Set(who)).toEqual(new Set([true, false]));
      });
    });
  });

  Rule('Over the chute, nobody knows who slips', ({ RuleScenario }) => {
    RuleScenario('Three ways it goes', ({ Given, When, Then, And }) => {
      let runs: Run[];
      const way = (wanted: Way) =>
        runs.filter(({ plan }) => plan.way === wanted).map(({ plan }) => plan);
      /** Nobody leaves the claw before `t`. */
      const heldUntil = (plan: Plan, t: number) => {
        const leaves = [
          ...plan.flights
            .filter((flight) => flight.off === 'claw' && lastGrab(plan).by.includes(flight.by))
            .map((flight) => flight.from),
          ...(plan.rim ? [plan.rim.from] : []),
        ];
        return leaves.every((at) => at >= t - 1e-9);
      };
      Given('8 people', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30);
      });
      Then(
        'in some runs one of the two slips at the first kick, the one the stop gives the claw',
        () => {
          const plans = way('first');
          expect(plans.length).toBeGreaterThan(0);
          for (const plan of plans) {
            const last = lastGrab(plan);
            expect(last.kicks[0]!.from).toBe(last.stop);
            expect(last.slip).toBe(last.kicks[0]!.peak);
          }
        },
      );
      And('in some runs both hold on through it, and one slips at the second kick', () => {
        const plans = way('second');
        expect(plans.length).toBeGreaterThan(0);
        for (const plan of plans) {
          const last = lastGrab(plan);
          expect(last.kicks).toHaveLength(2);
          expect(heldUntil(plan, last.kicks[0]!.to)).toBe(true);
          expect(last.slip).toBe(last.kicks[1]!.peak);
          expect(last.twitch).toBeNull();
        }
      });
      And(
        'in some runs both hold on, the claw hangs still, a finger twitches open and shuts, "Click!", and one slips at the kick that jolt gives it',
        () => {
          const plans = way('twitch');
          expect(plans.length).toBeGreaterThan(0);
          for (const plan of plans) {
            const last = lastGrab(plan);
            const twitch = last.twitch!;
            expect(heldUntil(plan, twitch.to)).toBe(true);
            expect(plan.says).toContainEqual(
              expect.objectContaining({ text: 'Click!', by: 'claw', at: twitch.from }),
            );
            const out = times(twitch.from, twitch.to - 0.01, 0.01).map((t) => clawAt(plan, t));
            expect(Math.max(...out.map((claw) => claw.twitch))).toBeGreaterThan(0);
            expect(out.at(-1)!.twitch).toBe(0);
            for (const claw of out) expect(claw.th).toBeCloseTo(0, 6);
            expect(last.kicks[1]!.from).toBe(twitch.to);
            expect(last.slip).toBe(last.kicks[1]!.peak);
          }
        },
      );
      And('a twitch lasts 0.9 seconds, and never comes before a kick both held through', () => {
        for (const plan of way('twitch')) {
          const last = lastGrab(plan);
          expect(last.twitch!.to - last.twitch!.from).toBeCloseTo(0.9, 9);
          expect(last.twitch!.from).toBeGreaterThanOrEqual(last.kicks[0]!.to - 1e-9);
        }
        for (const plan of [...way('first'), ...way('second')])
          expect(lastGrab(plan).twitch).toBeNull();
      });
    });

    RuleScenario('A slip flies clear or lands on the rim', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30);
      });
      Then('in some runs whoever slips flies clear, onto the shelf', () => {
        const clear = runs.filter(({ plan }) =>
          plan.flights.some(
            (flight) => flight.off === 'claw' && flight.from === lastGrab(plan).slip,
          ),
        );
        expect(clear.length).toBeGreaterThan(0);
      });
      And(
        'in some runs they land short, on the rim of the chute, and teeter over it: "Whoa…"',
        () => {
          const short = runs.filter(({ plan }) => plan.rim);
          expect(short.length).toBeGreaterThan(0);
          for (const { plan } of short) {
            expect(plan.rim!.from).toBe(lastGrab(plan).slip);
            expect(plan.captions).toContainEqual({ at: plan.rim!.lands, text: 'Whoa…' });
          }
        },
      );
      And('whoever teeters does so for 1 second or more', () => {
        for (const { plan } of runs.filter(({ plan }) => plan.rim)) {
          expect(plan.rim!.tips - plan.rim!.lands).toBeGreaterThanOrEqual(1);
        }
      });
    });
  });

  Rule('The last second could go three ways', ({ RuleScenarioOutline, RuleScenario }) => {
    RuleScenarioOutline(
      'The ending, with <count> people',
      ({ Given, When, Then, And }, { count }) => {
        let runs: Run[];
        const ending = (wanted: Ending) => runs.filter(({ plan }) => plan.ending === wanted);
        const says = (plan: Plan, text: string, by: string) =>
          plan.says.some((say) => say.text === text && say.by === by);
        const captions = (plan: Plan) => plan.captions.map((caption) => caption.text);
        Given('<count> people', () => {});
        When('the show runs with 30 different random seeds', () => {
          runs = plansFor(Number(count), 30);
        });
        Then(
          'in some runs one flies clear, "Phew!", and the claw shuts round the other: "Uh-oh…"',
          () => {
            expect(ending('hold').length).toBeGreaterThan(0);
            for (const { plan, unlucky } of ending('hold')) {
              const flight = plan.flights.at(-1)!;
              expect([flight.by, flight.off, flight.from]).toEqual([
                plan.other,
                'claw',
                lastGrab(plan).slip,
              ]);
              expect(says(plan, 'Phew!', plan.other)).toBe(true);
              expect(plan.grip).not.toBeNull();
              expect(plan.captions).toContainEqual({ at: plan.wake, text: 'Uh-oh…' });
              expect(plan.rim).toBeNull();
              expect(plan.unlucky).toBe(unlucky);
            }
          },
        );
        And(
          'in some runs one teeters on the rim and tips out, "Nearly!", "Phew!!", and then the claw shuts round the other: "Uh-oh…"',
          () => {
            expect(ending('nearly').length).toBeGreaterThan(0);
            for (const { plan } of ending('nearly')) {
              expect(plan.rim).toEqual(expect.objectContaining({ by: plan.other, out: true }));
              expect(plan.captions).toContainEqual({ at: plan.rim!.tips, text: 'Nearly!' });
              expect(says(plan, 'Phew!!', plan.other)).toBe(true);
              expect(plan.grip!.to).toBeGreaterThan(plan.rim!.tips);
              const text = captions(plan);
              expect(text.indexOf('Uh-oh…')).toBeGreaterThan(text.indexOf('Nearly!'));
            }
          },
        );
        And(
          'in some runs one flies clear, "Phew!", while the other lands on the rim, teeters, and tips in',
          () => {
            expect(ending('rim').length).toBeGreaterThan(0);
            for (const { plan, unlucky } of ending('rim')) {
              const flight = plan.flights.at(-1)!;
              expect([flight.by, flight.from]).toEqual([plan.other, lastGrab(plan).slip]);
              expect(says(plan, 'Phew!', plan.other)).toBe(true);
              expect(plan.rim).toEqual(
                expect.objectContaining({ by: unlucky, out: false, from: flight.from }),
              );
              expect(plan.grip).toBeNull();
              expect(captions(plan)).not.toContain('Uh-oh…');
            }
          },
        );
      },
    );

    RuleScenario('The rim gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('8 people', () => {});
      When('the show runs with 30 different random seeds', () => {
        runs = plansFor(8, 30);
      });
      Then('whoever teeters on the rim tips out in some runs, and in in others', () => {
        const out = runs.flatMap(({ plan }) => (plan.rim ? [plan.rim.out] : []));
        expect(new Set(out)).toEqual(new Set([true, false]));
      });
      And('until they tip, a teeter that tips out and one that tips in look the same', () => {
        const teeter = (plan: Plan, places: Places) =>
          times(plan.rim!.lands, plan.rim!.tips - 0.01, 0.05).map((t) => {
            const { spot, layer } = places.at(plan.rim!.by, t);
            return { ...spot, layer, mood: moodAt(plan, plan.rim!.by, t) };
          });
        const out = runs.find(({ plan }) => plan.rim?.out)!.plan;
        const into = runs.find(({ plan }) => plan.rim && !plan.rim.out)!.plan;
        const [a, b] = [teeter(out, placings(out)), teeter(into, placings(into))];
        expect(a).toHaveLength(b.length);
        a.forEach((spot, k) => {
          for (const key of ['x', 'top', 'size', 'rot'] as const)
            expect(spot[key]).toBeCloseTo(b[k]![key], 6);
          expect([spot.layer, spot.mood]).toEqual([b[k]!.layer, b[k]!.mood]);
        });
        expect(new Set(a.map((spot) => Math.round(spot.rot))).size).toBeGreaterThan(3);
      });
    });

    RuleScenario('A moment of stillness, then it opens', ({ When, Then, And }) => {
      let runs: Watched[];
      When(
        'the show runs with an ending where the claw shuts round the unlucky person',
        async () => {
          runs = [];
          for (const ending of ['hold', 'nearly'] as const) {
            const { team, unlucky, seed } = find(8, (plan) => plan.ending === ending, 'Hana');
            runs.push(await watch(team, unlucky, seed));
          }
        },
      );
      Then('for at least half a second after it shuts, nothing moves', () => {
        for (const run of runs) {
          const { grip, opens } = run.plan;
          expect(opens!.from - grip!.to).toBeGreaterThanOrEqual(0.5);
          expect(stillBetween(run, opens!.from - 0.5, opens!.from)).toBe(true);
        }
      });
      And('then the claw opens, and the unlucky person drops into the chute', () => {
        for (const run of runs) {
          const { opens, fall, unlucky } = run.plan;
          expect(frameAt(run, opens!.from - STEP).claw.pose).toBe('grip');
          expect(frameAt(run, opens!.to).claw.pose).toBe('open');
          const falling = between(run, fall.from + STEP, fall.to).map((frame) =>
            frame.people.get(unlucky)!,
          );
          expect(falling.length).toBeGreaterThan(0);
          falling
            .slice(1)
            .forEach((drawn, k) => expect(drawn.top).toBeGreaterThan(falling[k]!.top));
          for (const drawn of falling) expect(drawn.layer).toBe('chute');
          expect(frameAt(run, fall.to + STEP).people.get(unlucky)!.visible).toBe(false);
        }
      });
    });
  });

  Rule('The ending is a prize', ({ RuleScenario }) => {
    let run: Watched;
    const marco = () => ['Marco', ...names(5)];
    const watchMarco = async () => {
      const { team, seed } = find(marco(), (plan) => plan.ending === 'rim', 'Marco');
      run = await watch(team, 'Marco', seed);
    };

    RuleScenario('Out of the prize door', ({ Given, When, Then, And }) => {
      Given('the unlucky person is "Marco"', watchMarco);
      When('Marco has gone down the chute', () => {
        expect(frameAt(run, run.plan.fall.to + STEP).people.get('Marco')!.visible).toBe(false);
      });
      Then('for 0.6 seconds the chute rumbles and nothing else moves', () => {
        const { fall, doorOpens } = run.plan;
        expect(doorOpens - fall.to).toBeCloseTo(0.6, 9);
        const rumbling = between(run, fall.to + STEP, doorOpens).map((frame) => frame.rumble);
        expect(new Set(rumbling).size).toBeGreaterThan(3);
        expect(stillBetween(run, fall.to + STEP, doorOpens)).toBe(true);
      });
      And(
        'the prize door opens, and Marco comes out in front of the chute, drawn 170 pixels tall, in front of everyone',
        () => {
          const { doorOpens, prize } = run.plan;
          expect(frameAt(run, doorOpens - STEP).door).toBe('shut');
          const out = frameAt(run, prize + 0.1);
          expect(out.door).toBe('open');
          const drawn = out.people.get('Marco')!;
          expect([drawn.x, drawn.size, drawn.layer, drawn.visible]).toEqual([
            730,
            170,
            'top',
            true,
          ]);
          for (const [name, other] of out.people)
            if (name !== 'Marco') expect(other.layer).not.toBe('top');
        },
      );
      And('Marco wears a bow where the loop was, and celebrates', () => {
        const drawn = frameAt(run, run.plan.prize + 0.1).people.get('Marco')!;
        expect([drawn.bow, drawn.mood, drawn.raised]).toEqual([true, 'party', true]);
      });
      And('the chute says "Ta-da!"', () => {
        expect(frameAt(run, run.plan.prize + 0.1).bubbles).toContainEqual(
          expect.objectContaining({ text: 'Ta-da!', by: 'chute' }),
        );
      });
      And('the plaque says "Winner!"', () => {
        expect(frameAt(run, run.plan.prize + 0.1).plaque).toBe('Winner!');
        expect(frameAt(run, run.plan.prize - STEP).plaque).not.toBe('Winner!');
      });
      And('the caption is "Marco is the prize!"', () => {
        expect(run.record.captions.at(-1)!.text).toBe('Marco is the prize!');
      });
      And('everyone else looks happy', () => {
        for (const [name, drawn] of frameAt(run, run.plan.prize + 0.1).people) {
          if (name !== 'Marco') expect(drawn.mood, name).toBe('happy');
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      Given('the unlucky person is "Marco"', watchMarco);
      When('the show runs', () => {
        expect(run.record.outcome).toBe('finished');
      });
      Then('"Marco" is on stage, not moving, for the last 1.5 seconds', () => {
        const last = between(run, run.record.duration - 1.5).map((frame) =>
          frame.people.get('Marco')!,
        );
        expect(last.length).toBeGreaterThan(25);
        for (const drawn of last) {
          expect([drawn.x, drawn.top, drawn.size, drawn.visible, drawn.tagShown]).toEqual([
            last[0]!.x,
            last[0]!.top,
            last[0]!.size,
            true,
            true,
          ]);
        }
      });
    });
  });

  Rule('What it sounds like', ({ RuleScenario }) => {
    RuleScenario('The machine is heard', ({ Given, When, Then, And }) => {
      let runs: Watched[];
      /** Whether `run` asked for `cue` within a frame of `at`. */
      const heard = (run: Watched, cue: string, at: number) =>
        run.cues.some((each) => each.cue === cue && Math.abs(each.time - at) <= STEP + 1e-9);
      Given('8 people', () => {});
      When(
        'the show runs with each ending, an "Eek!" and a "Click!" among its scares',
        async () => {
          runs = [];
          for (const ending of ENDINGS) {
            const wanted = (plan: Plan) =>
              plan.ending === ending &&
              plan.way === 'twitch' &&
              plan.grabs.some((grab) => grab.notch);
            const { team, unlucky, seed } = find(8, wanted, 'Hana');
            runs.push(await watch(team, unlucky, seed));
          }
        },
      );
      Then('the latch clicks each time the claw shuts on someone, and at each "Click!"', () => {
        for (const run of runs) {
          for (const grab of run.plan.grabs) expect(heard(run, 'latch', grab.shut)).toBe(true);
          if (run.plan.grip) expect(heard(run, 'latch', run.plan.grip.to)).toBe(true);
          const twitch = lastGrab(run.plan).twitch!;
          expect(heard(run, 'latch', twitch.from + 0.2)).toBe(true);
        }
      });
      And(
        'there is a thunk each time the trolley reaches the stop, and each time someone lands',
        () => {
          for (const run of runs) {
            for (const grab of run.plan.grabs) expect(heard(run, 'thunk', grab.stop)).toBe(true);
            for (const flight of run.plan.flights)
              expect(heard(run, 'thunk', flight.to)).toBe(true);
            if (run.plan.rim) expect(heard(run, 'thunk', run.plan.rim.lands)).toBe(true);
          }
        },
      );
      And('a whoosh each time someone flies', () => {
        for (const run of runs) {
          for (const flight of run.plan.flights.filter((each) => each.off === 'claw')) {
            expect(heard(run, 'whoosh', flight.from)).toBe(true);
          }
        }
      });
      And('a creak with each "Eek!", and while someone teeters on the rim', () => {
        for (const run of runs) {
          for (const grab of run.plan.grabs) {
            if (grab.notch) expect(heard(run, 'creak', grab.notch.from)).toBe(true);
          }
          const rim = run.plan.rim;
          if (rim) {
            const creaks = run.cues.filter(
              ({ cue, time }) => cue === 'creak' && time >= rim.lands - STEP && time <= rim.tips,
            );
            expect(creaks.length).toBeGreaterThanOrEqual(2);
          }
        }
      });
      And('the tumble as the unlucky person goes down the chute', () => {
        for (const run of runs) expect(heard(run, 'tumble', run.plan.fall.from)).toBe(true);
      });
      And(
        'a pop as they come out of the prize door, and the fanfare with "… is the prize!"',
        () => {
          for (const run of runs) {
            expect(heard(run, 'pop', run.plan.doorOpens)).toBe(true);
            const caption = run.record.captions.at(-1)!;
            expect(heard(run, 'fanfare', caption.from)).toBe(true);
          }
        },
      );
    });
  });

  Rule('With 2 or 3 people it is the final from the start', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, { count, caption }) => {
      let runs: Run[];
      Given('<count> people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plansFor(Number(count), 20);
      });
      Then(
        'the caption after the opening is "<caption>", everyone looks scared, and the heartbeat starts before the claw moves',
        () => {
          for (const { plan, team } of runs) {
            expect(plan.captions[2]).toEqual({ at: plan.spotlight, text: caption });
            for (const name of team) expect(moodAt(plan, name, plan.spotlight).mood).toBe('scared');
            expect(plan.heartbeats[0]).toBe(plan.spotlight);
            expect(plan.heartbeats[0]).toBeLessThan(plan.grabs[0]!.from);
            expect(clawAt(plan, plan.grabs[0]!.from - 0.01).x).toBe(STOP_X);
          }
        },
      );
      And('there is one grab, of two people, the unlucky person one of them', () => {
        for (const { plan, unlucky } of runs) {
          expect(plan.grabs).toHaveLength(1);
          expect(plan.grabs[0]!.by).toHaveLength(2);
          expect(plan.grabs[0]!.by).toContain(unlucky);
        }
      });
      And('with 3 people, the third is never grabbed', () => {
        for (const { plan, team } of runs) {
          if (team.length === 2) expect(plan.third).toBeNull();
          else expect(plan.grabs[0]!.by).not.toContain(plan.third);
        }
      });
    });
  });

  Rule('The beats keep every show a second or more inside the limit', ({ RuleScenario }) => {
    RuleScenario('About 25 seconds at 6 people', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('6 people', () => {});
      When('the show runs with 40 different random seeds', () => {
        runs = plansFor(6, 40);
      });
      Then('each run lasts between 22 and 28 seconds', () => {
        for (const { plan } of runs) {
          expect(plan.end).toBeGreaterThanOrEqual(22);
          expect(plan.end).toBeLessThanOrEqual(28);
        }
      });
      And('the runs last between 24.5 and 26.5 seconds on average', () => {
        const average = mean(runs.map(({ plan }) => plan.end));
        expect(average).toBeGreaterThanOrEqual(24.5);
        expect(average).toBeLessThanOrEqual(26.5);
      });
    });

    RuleScenario('Every head count lands between 12 and 29 seconds', ({ When, Then }) => {
      let plans: Plan[];
      When(
        'the show runs at every head count from 2 to 12, with each ending and each way it goes over the chute',
        () => {
          plans = [];
          for (let count = 2; count <= 12; count++) {
            plans.push(...plansFor(count, 40).map(({ plan }) => plan));
            // Every ending, every way over the chute, with and without a notch.
            for (const ending of ENDINGS) {
              for (const way of WAYS) {
                for (const notch of [true, false]) {
                  const wanted = (plan: Plan) =>
                    plan.ending === ending &&
                    plan.way === way &&
                    plan.grabs.some((grab) => grab.notch) === notch;
                  plans.push(find(count, wanted).plan);
                }
              }
            }
          }
        },
      );
      Then('each run lasts between 12 and 29 seconds', () => {
        for (const plan of plans) {
          expect(plan.end, `${plan.people} people`).toBeGreaterThanOrEqual(12);
          expect(plan.end, `${plan.people} people`).toBeLessThanOrEqual(29);
        }
      });
    });

    RuleScenario('From 6 to 12 people a show lasts about the same', ({ When, Then }) => {
      let averages: number[];
      When('the show runs at 6, 8 and 12 people with 40 different random seeds each', () => {
        averages = [6, 8, 12].map((count) => mean(plansFor(count, 40).map(({ plan }) => plan.end)));
      });
      Then(
        'the average lengths at the three head counts are within 1.5 seconds of one another',
        () => {
          expect(Math.max(...averages) - Math.min(...averages)).toBeLessThanOrEqual(1.5);
        },
      );
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the story, a grab at a time', ({ Given, When, Then }) => {
      const team = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Priya'];
      let seed: number;
      let run: Watched;
      Given(
        '6 people, the unlucky person is "Anna", the claw takes "Dario", "Elena", then "Ben", the last grab takes "Anna" and "Priya", and Priya teeters on the rim and tips out',
        () => {
          const wanted = (plan: Plan) =>
            plan.grabs.map((grab) => grab.by.join()).join('|') === 'Dario|Elena|Ben|Anna,Priya' &&
            plan.rim?.by === 'Priya' &&
            plan.rim.out;
          seed = find(team, wanted, 'Anna').seed;
        },
      );
      When('the show runs', async () => {
        run = await watch(team, 'Anna', seed);
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const shown = run.record.captions.map((caption) => caption.text);
        let from = 0;
        for (const { caption } of table) {
          const at = shown.indexOf(caption, from);
          expect(at, caption).toBeGreaterThanOrEqual(from);
          from = at + 1;
        }
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let runs: Watched[];
      When('the show runs', async () => {
        runs = [
          await watch(names(6), 'Fabio', 3),
          await watch(names(8), 'Hana', 1),
          await watch(names(2), 'Ben', 1),
        ];
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const run of runs) {
          for (const caption of run.record.captions) {
            expect(caption.to - caption.from, caption.text).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });

    RuleScenario('Whoever is at risk is drawn big', ({ When, Then, And }) => {
      let runs: Watched[];
      const longTeam = names(12).map((name) => (name === 'Ivo' ? LONG : name));
      /** Everyone in the pile in a frame, with how many are at risk then. */
      const inThePile = function* () {
        for (const run of runs) {
          const places = placings(run.plan);
          for (const frame of run.frames) {
            for (const [name, drawn] of frame.people) {
              if (
                drawn.layer !== 'pile' ||
                (places.shelfSpot(name) &&
                  frame.time >= run.plan.flights.find((f) => f.by === name)!.to)
              )
                continue;
              yield { run, frame, name, drawn };
            }
          }
        }
      };
      When('the show runs at 2, 6, 8 and 12 people, a 15-character name among the 12', async () => {
        runs = [
          await watch(names(2), 'Ben', 1),
          await watch(names(6), 'Fabio', 3),
          await watch(names(8), 'Hana', 1),
          await watch(longTeam, 'Luca', 1),
        ];
      });
      Then(
        'in the pile, heads are 136 pixels tall with 2 or 3 people, 120 with 4 to 6, 100 with 7 or 8, and 88 from 9, on the 1280 by 720 stage',
        () => {
          for (const run of runs) {
            const people = run.plan.people;
            const first = [...run.frames[0]!.people.values()];
            const size = people <= 3 ? 136 : people <= 6 ? 120 : people <= 8 ? 100 : 88;
            for (const drawn of first) expect(drawn.size).toBe(size);
          }
        },
      );
      And(
        "the pile's heads grow to 120 once 6 or fewer are at risk, or to 100 where the pile has three rows",
        () => {
          for (const { run, frame, name, drawn } of inThePile()) {
            const people = run.plan.people;
            if (people <= 6) continue;
            const risky =
              run.plan.people -
              run.plan.flights.filter((f) => f.to <= frame.time - 0.4 - 1e-9).length;
            if (risky > 6) continue;
            expect(drawn.size, `${name} at ${frame.time}`).toBe(people <= 8 ? 120 : 100);
          }
        },
      );
      And(
        'whoever is in the claw is drawn 120 pixels tall or more, or 100 before the final three from 9 people',
        () => {
          for (const run of runs) {
            for (const grab of run.plan.grabs) {
              for (const frame of between(run, grab.shut, grab.slip)) {
                for (const name of grab.by) {
                  const least = run.plan.people >= 9 && !grab.last ? 100 : 120;
                  expect(frame.people.get(name)!.size).toBeGreaterThanOrEqual(least);
                }
              }
            }
          }
        },
      );
      And(
        'name tags other than the 15-character one are 0.28 of their head, 24 pixels or more',
        () => {
          for (const run of runs) {
            for (const frame of run.frames) {
              for (const [name, drawn] of frame.people) {
                if (name === LONG || !drawn.tagShown) continue;
                expect(drawn.tag, `${name} at ${frame.time}`).toBeGreaterThanOrEqual(24);
                // Settled in the pile, on the shelf or alone in the claw; two or
                // three in the claw share their room, and the prize's is the canvas's 38.
                if (frame.time >= run.plan.prize) continue;
                const sharing = drawn.layer === 'held' && grabOf(run.plan, name)!.by.length > 1;
                const settled = !sharing && [100, 120, 136, 88, 84].includes(drawn.size);
                // As the kit sets 0.28 of the head: a pixel smaller where the name needs it to fit.
                if (settled) {
                  expect(drawn.tag, `${name} at ${frame.time}`).toBeGreaterThanOrEqual(
                    Math.round(0.28 * drawn.size) - 1,
                  );
                }
              }
            }
          }
        },
      );
      And("the 15-character name's tag is 22 pixels or more, wherever it is", () => {
        const run = runs.at(-1)!;
        for (const frame of run.frames)
          expect(frame.people.get(LONG)!.tag).toBeGreaterThanOrEqual(22);
      });
      And(
        'on the shelf, heads are 100 pixels tall up to 8 people and 84 from 9, and name tags 22 pixels or more',
        () => {
          for (const run of runs) {
            for (const flight of run.plan.flights) {
              for (const frame of between(run, flight.to + 0.2)) {
                const drawn = frame.people.get(flight.by)!;
                expect(drawn.size).toBe(run.plan.people <= 8 ? 100 : 84);
                expect(drawn.tag).toBeGreaterThanOrEqual(22);
              }
            }
          }
        },
      );
      And('the number on the "At risk" plaque is 34 pixels or more', () => {
        const { el } = plaque();
        document.body.append(el);
        const words = el.querySelector<HTMLElement>('[data-part="at-risk"]')!;
        // As the stylesheet sets it, the size from tokens.css, scaled as drawn.
        expect(getComputedStyle(words).fontSize).toBe('var(--size-stage-caption)');
        expect(stagePx('--size-stage-caption') * Number(words.style.scale)).toBeGreaterThanOrEqual(
          34 - 1e-9,
        );
        el.remove();
      });
    });

    RuleScenario('Nothing covers a name', ({ When, Then, And }) => {
      let runs: { run: Watched; places: Places }[];
      When('the show runs at 12, at 8 and at 2 people', async () => {
        const longEight = names(8).map((name) => (name === 'Carla' ? LONG : name));
        runs = [];
        for (const [team, unlucky, seed] of [
          [names(12), 'Luca', 1],
          [names(12).map((name) => (name === 'Ivo' ? LONG : name)), 'Luca', 1],
          [names(8), 'Hana', 1],
          [longEight, 'Hana', 1],
          [longEight, LONG, 2],
          [names(2), 'Ben', 1],
        ] as const) {
          const run = await watch(team, unlucky, seed);
          runs.push({ run, places: placings(run.plan) });
        }
      });
      Then('no name tag is ever over another', () => {
        for (const { run, places } of runs) {
          for (const { time } of run.frames) {
            const tags = [...run.plan.seats.keys()]
              .map((name) => ({ name, tag: places.tag(name, time) }))
              .filter(({ tag }) => !tag.hidden);
            tags.forEach(({ name, tag }, k) => {
              for (const other of tags.slice(k + 1)) {
                const at = `${run.plan.people}: ${name} and ${other.name} at ${time}`;
                expect(overlap(tag.box, other.tag.box), at).toBe(false);
              }
            });
          }
        }
      });
      And('no speech bubble covers a name tag or a face', () => {
        for (const { run, places } of runs) {
          for (const frame of run.frames) {
            for (const said of frame.bubbles) {
              const box = speechBox(said.text, said, said.lean);
              for (const name of run.plan.seats.keys()) {
                const { spot, gone } = places.at(name, frame.time);
                if (gone) continue;
                const tag = places.tag(name, frame.time);
                const at = `${said.text} over ${name} at ${frame.time}`;
                expect(overlap(box, faceBox(spot)), at).toBe(false);
                if (!tag.hidden) expect(overlap(box, tag.box), at).toBe(false);
              }
            }
          }
        }
      });
      And('the claw never hangs in front of anyone on the shelf', () => {
        for (const { run, places } of runs) {
          for (const { time } of run.frames) {
            const claw = clawAt(run.plan, time);
            const corners = [
              [-130, 0],
              [130, 0],
              [-130, 140],
              [130, 140],
            ].map(([dx, dy]) =>
              swing(claw.x + dx!, claw.hub + dy!, { x: claw.x, y: 134 }, claw.th),
            );
            const reach = {
              left: Math.min(...corners.map((c) => c.x)),
              right: Math.max(...corners.map((c) => c.x)),
              top: Math.min(...corners.map((c) => c.y)),
              bottom: Math.max(...corners.map((c) => c.y)),
            };
            for (const flight of run.plan.flights.filter((f) => f.to <= time)) {
              const sitting = boxOf(places.at(flight.by, time).spot);
              expect(overlap(reach, sitting), `${flight.by} at ${time}`).toBe(false);
            }
          }
        }
      });
      And(
        "the prize's name tag is under every other name tag on the stage, on the machine's base",
        () => {
          for (const { run, places } of runs) {
            const end = run.record.duration - 0.01;
            const prize = places.tag(run.plan.unlucky, end);
            expect(prize.hidden).toBe(false);
            expect(prize.box.top).toBeGreaterThanOrEqual(664);
            // Lower than every other, and meeting none: a two-line tag on the
            // floor may reach the base beside it.
            for (const name of run.plan.seats.keys()) {
              if (name === run.plan.unlucky) continue;
              const other = places.tag(name, end).box;
              expect(other.top).toBeLessThan(prize.box.top);
              expect(overlap(other, prize.box), name).toBe(false);
            }
          }
        },
      );
    });

    RuleScenario(
      'A name tag hides only while its plush tumbles or passes someone',
      ({ Given, When, Then, And }) => {
        let runs: Watched[];
        Given('8 people', () => {});
        When('the show runs', async () => {
          runs = [await watch(names(8), 'Hana', 1)];
          for (const ending of ENDINGS) {
            const wanted = (plan: Plan) =>
              plan.ending === ending &&
              plan.way === 'twitch' &&
              plan.grabs.some((grab) => grab.notch);
            const { team, unlucky, seed } = find(8, wanted, 'Hana');
            runs.push(await watch(team, unlucky, seed));
          }
        });
        Then(
          'a name tag is hidden only while its plush flies to the shelf, while it is in the chute, or while it is lifted past a face or a name tag in the pile',
          () => {
            for (const run of runs) {
              for (const frame of run.frames) {
                for (const [name, drawn] of frame.people) {
                  if (drawn.tagShown) continue;
                  const t = frame.time;
                  const flight = run.plan.flights.find((f) => f.by === name);
                  const grab = grabOf(run.plan, name);
                  const flying = flight && t >= flight.from - 1e-9 && t <= flight.to + 1e-9;
                  const inChute = name === run.plan.unlucky && t >= run.plan.fall.from - 1e-9;
                  const lifted = grab && t >= grab.down - 1e-9 && t <= grab.up + 1e-9;
                  expect(flying || inChute || lifted, `${name} at ${t}`).toBe(true);
                }
              }
            }
          },
        );
        And(
          "no name tag is hidden for more than 0.6 seconds, but the unlucky person's in the chute",
          () => {
            for (const run of runs) {
              for (const name of run.plan.seats.keys()) {
                let hiddenFrom: number | null = null;
                for (const frame of run.frames) {
                  const shown = frame.people.get(name)!.tagShown;
                  const inChute =
                    name === run.plan.unlucky && frame.time >= run.plan.fall.from - 1e-9;
                  if (shown || inChute) {
                    if (hiddenFrom !== null)
                      expect(
                        frame.time - hiddenFrom,
                        `${name} at ${frame.time}`,
                      ).toBeLessThanOrEqual(0.6 + STEP + 1e-9);
                    hiddenFrom = null;
                  } else hiddenFrom ??= frame.time;
                }
              }
            }
          },
        );
      },
    );
  });

  Rule('Its music winds up, and never says "Pop!"', ({ RuleScenario, RuleScenarioOutline }) => {
    /** Pop Goes the Weasel's first strain in C, as music.ts arranges it: pitches and lengths in eighths. */
    const WEASEL = [
      'C5:2 E5 D5:2 F5 | E5 G5 E5 C5:2 G4 | C5:2 E5 D5 E5 F5 | E5:3 C5:2 G4',
      'C5:2 E5 D5:2 F5 | E5 G5 E5 C5:3 | A5:3 D5:2 F5 | E5:3 C5:3',
    ].join(' | ');
    const strain = melody(WEASEL, 0);
    /** The strain's note at beat `at`, counting round it. */
    const tuneAt = (at: number) => strain.find((note) => note.at === ((at % 48) + 48) % 48);
    const steel = (notes: readonly Note[]) => notes.filter((note) => note.voice === 'steel');

    RuleScenario(
      "The jack-in-the-box tune from the claw's first move",
      ({ Given, When, Then, And }) => {
        let run: Watched;
        Given('8 people', () => {});
        When('the show runs with music on', async () => {
          run = await watch(names(8), 'Hana', 1);
        });
        Then('Pop Goes the Weasel starts as the claw first sets off', () => {
          const from = run.plan.grabs[0]!.from;
          const first = run.moves.find((move) => move.speed > 0)!;
          expect(Math.abs(first.time - from)).toBeLessThanOrEqual(STEP + 1e-9);
          for (const move of run.moves.filter((each) => each.time < from - STEP)) {
            expect([move.beat, move.speed]).toEqual([0, 0]);
          }
          const { entry } = clawMusic(run.plan);
          const tune = steel(run.notes);
          expect(tune[0]!.at).toBe(0);
          for (const note of tune) {
            const written = tuneAt(note.at + entry)!;
            expect(written, `beat ${note.at}`).toBeDefined();
            expect(note.pitch).toBe(written.pitch);
          }
        });
        And('it is played on the steel voice, over a bass and chords', () => {
          const voices = new Set(run.notes.map((note) => note.voice));
          expect(voices).toEqual(new Set(['steel', 'bass', 'stab']));
          // The chords: three notes at once, on each bar's second half.
          const stabs = run.notes.filter((note) => note.voice === 'stab');
          expect(stabs.length % 3).toBe(0);
        });
      },
    );

    RuleScenarioOutline(
      'It gets quicker all the way, with <count> people',
      ({ When, Then, And }, { count }) => {
        let plans: Plan[];
        When(
          'the show runs with <count> people, with each ending and each way it goes over the chute',
          () => {
            plans = ENDINGS.flatMap((ending) =>
              WAYS.map(
                (way) =>
                  find(Number(count), (plan) => plan.ending === ending && plan.way === way).plan,
              ),
            );
          },
        );
        Then(
          'the tune gets quicker with every beat, from its first to its last, 1.7 times as quick at the end as at the start',
          () => {
            for (const plan of plans) {
              const score = clawMusic(plan);
              const moments = times(score.from, score.to - 0.005, 0.01);
              const speeds = moments.map((t) => score.at(t).speed);
              speeds.slice(1).forEach((speed, k) => expect(speed).toBeGreaterThan(speeds[k]!));
              const end = score.at(score.to - 1e-6).speed;
              expect(end / speeds[0]!).toBeCloseTo(1.7, 3);
              // Each note's beats go by quicker than the one before's.
              const tune = steel(score.notes);
              const pace = tune.map((note) => score.at(timeAt(score, note.at)).speed);
              pace.slice(1).forEach((speed, k) => expect(speed).toBeGreaterThan(pace[k]!));
            }
          },
        );
        And(
          'it never slows, holds or pauses: it plays on through each "Eek!", each "Click!" and each teeter',
          () => {
            for (const plan of plans) {
              const score = clawMusic(plan);
              const beats = times(score.from, score.to - 0.005, 0.01).map((t) => score.at(t).beat);
              beats.slice(1).forEach((beat, k) => expect(beat).toBeGreaterThan(beats[k]!));
              // The tune has no rests: each of its notes starts as the one before ends.
              const tune = steel(score.notes);
              tune
                .slice(1)
                .forEach((note, k) => expect(note.at).toBeCloseTo(tune[k]!.at + tune[k]!.beats, 9));
              const spans = [
                ...plan.grabs.flatMap((grab) =>
                  [grab.notch, grab.twitch].filter((span) => span !== null),
                ),
                ...(plan.rim ? [{ from: plan.rim.lands, to: plan.rim.tips }] : []),
              ];
              for (const span of spans) {
                if (span.from < score.from || span.to > score.to) continue;
                expect(score.at(span.to).beat).toBeGreaterThan(score.at(span.from).beat);
                expect(score.at((span.from + span.to) / 2).speed).toBeGreaterThan(0);
              }
            }
          },
        );
      },
    );

    RuleScenario("From the heartbeat on, the low end is the heartbeat's", ({ When, Then }) => {
      let plans: Plan[];
      When('the heartbeat starts', () => {
        plans = [...plansFor(8, 10), ...plansFor(2, 5), ...plansFor(12, 5)].map(({ plan }) => plan);
      });
      Then('the tune plays on without its bass until it stops', () => {
        for (const plan of plans) {
          const score = clawMusic(plan);
          const thin = plan.spotlight <= score.from ? 0 : score.at(plan.spotlight).beat;
          const bass = score.notes.filter((note) => note.voice === 'bass');
          for (const note of bass) expect(note.at).toBeLessThan(thin);
          if (plan.people <= 3) expect(bass).toHaveLength(0);
          else expect(bass.length).toBeGreaterThan(0);
          const after = steel(score.notes).filter((note) => note.at >= thin);
          expect(after.length).toBeGreaterThan(4);
          expect(after.at(-1)!.at + after.at(-1)!.beats).toBeCloseTo(score.at(score.to).beat, 9);
        }
      });
    });

    RuleScenario('It stops on the breath before "Pop!"', ({ Given, When, Then, And }) => {
      let runs: Watched[];
      Given('the unlucky person is "Marco"', () => {});
      When('the claw shuts round Marco, or Marco tips into the chute', async () => {
        const team = ['Marco', ...names(5)];
        runs = [];
        for (const ending of ['hold', 'rim'] as const) {
          const { seed } = find(team, (plan) => plan.ending === ending, 'Marco');
          runs.push(await watch(team, 'Marco', seed));
        }
      });
      Then("the music stops, and doesn't come back", () => {
        for (const run of runs) {
          const stop = run.plan.wake;
          const after = run.moves.filter((move) => move.time >= stop + STEP);
          expect(after.length).toBeGreaterThan(0);
          for (const move of after) expect([move.beat, move.speed]).toEqual([after[0]!.beat, 0]);
          for (const note of run.notes)
            expect(note.at + note.beats).toBeLessThanOrEqual(after[0]!.beat + 1e-9);
          const before = run.moves.filter((move) => move.time < stop - STEP);
          expect(before.at(-1)!.speed).toBeGreaterThan(0);
        }
      });
      And('the last note it played is the one before the tune\'s "Pop!"', () => {
        for (const run of runs) {
          const { entry } = clawMusic(run.plan);
          const last = steel(run.notes).at(-1)!;
          const written = tuneAt(last.at + entry)!;
          // The C before bar 7's A, the "Pop!", and the song stopped inside it.
          expect(written.pitch).toBe(pitchOf('C5'));
          expect(tuneAt(last.at + entry + written.beats)!.pitch).toBe(pitchOf('A5'));
          expect((last.at + entry) % 48).toBe(33);
          const stopped = run.moves.at(-1)!.beat;
          expect(stopped).toBeGreaterThan(last.at);
          expect(stopped).toBeLessThan(last.at + written.beats);
        }
      });
      And('the pop of the prize door and the fanfare play as before', () => {
        for (const run of runs) {
          const heard = (cue: string, at: number) =>
            run.cues.some((each) => each.cue === cue && Math.abs(each.time - at) <= STEP + 1e-9);
          expect(heard('pop', run.plan.doorOpens)).toBe(true);
          expect(heard('fanfare', run.plan.prize)).toBe(true);
        }
      });
    });
  });

  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario('With reduced motion, nothing swings or tumbles', ({ Given, When, Then, And }) => {
      let run: Watched;
      let moving: Watched;
      Given('reduced motion is on', () => {});
      When('the show runs', async () => {
        const wanted = (plan: Plan) =>
          plan.ending === 'nearly' &&
          plan.way === 'twitch' &&
          plan.grabs.some((grab) => grab.notch);
        const { team, unlucky, seed } = find(8, wanted, 'Hana');
        run = await watch(team, unlucky, seed, { reducedMotion: true });
        moving = await watch(team, unlucky, seed);
      });
      Then(
        "the claw leans out once at the stop instead of kicking, and whoever it holds doesn't sway",
        () => {
          for (const grab of run.plan.grabs) {
            // Still on the way, out to the kick's peak and back without swinging past.
            for (const frame of between(run, grab.from, grab.stop)) expect(frame.claw.th).toBe(0);
            const after = between(run, grab.slip, grab.slip + 2);
            after.slice(1).forEach((frame, k) => {
              expect(frame.claw.th).toBeLessThanOrEqual(after[k]!.claw.th + 1e-9);
              expect(frame.claw.th).toBeGreaterThanOrEqual(0);
            });
            for (const frame of between(run, grab.shut, grab.slip)) {
              for (const name of grab.by) {
                if (
                  grab.notch &&
                  frame.time >= grab.notch.from &&
                  frame.time < grab.notch.from + 0.15
                )
                  continue;
                const tilt = grab.notch?.by === name && frame.time >= grab.notch.from ? 9 : 0;
                expect(frame.people.get(name)!.rot).toBeCloseTo(-(frame.claw.th + tilt), 0);
              }
            }
          }
          expect(
            Math.max(
              ...between(moving, run.plan.grabs[0]!.slip, run.plan.grabs[1]!.from).map(
                (f) => -f.claw.th,
              ),
            ),
          ).toBeGreaterThan(1);
        },
      );
      And('whoever slips glides to the shelf upright, with no speed lines', () => {
        for (const flight of run.plan.flights) {
          for (const frame of between(run, flight.from + STEP, flight.to)) {
            expect(frame.people.get(flight.by)!.rot).toBe(0);
          }
        }
        expect(run.frames.some((frame) => frame.lines)).toBe(false);
        expect(moving.frames.some((frame) => frame.lines)).toBe(true);
      });
      And('whoever lands on the rim tilts once, out or in, instead of teetering', () => {
        const rim = run.plan.rim!;
        const tilts = between(run, rim.lands, rim.tips).map(
          (frame) => frame.people.get(rim.by)!.rot,
        );
        tilts.slice(1).forEach((rot, k) => expect(rot).toBeGreaterThanOrEqual(tilts[k]! - 1e-9));
        expect(tilts.at(-1)!).toBeGreaterThan(5);
      });
      And('the claw doesn\'t tremble at "Eek!" or snap at "Click!"', () => {
        for (const grab of run.plan.grabs) {
          if (grab.notch) {
            const xs = between(run, grab.notch.from, grab.notch.to).map((frame) => frame.claw.x);
            expect(new Set(xs).size).toBe(1);
          }
          if (grab.twitch) {
            const frames = between(run, grab.twitch.from, grab.twitch.to);
            for (const frame of frames)
              expect([frame.claw.twitch, frame.claw.marks]).toEqual([0, 'twitch']);
          }
        }
      });
      And('every caption still appears, in the same order', () => {
        const texts = (watched: Watched) => watched.record.captions.map((caption) => caption.text);
        expect(texts(run)).toEqual(texts(moving));
      });
    });
  });
});
