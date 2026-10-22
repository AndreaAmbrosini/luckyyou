import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { beforeAll, describe, expect, it } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import hotPotato from './index';
import {
  bezier,
  crowned,
  duelLayout,
  duelMove,
  face,
  headBox,
  held,
  outOfPlay,
  overlap,
  POTATO,
  potatoBox,
  ring,
  SKY,
  speechBox,
  tagBox,
  throwPath,
  type Box,
  type Point,
  type Spot,
} from './layout';
import { BEATS, planShow, type Beat, type Catch, type Ending, type Plan } from './plan';

const ENDINGS: readonly Ending[] = ['too-hot', 'hang-time', 'holding-on'];

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
/** When `beat` starts, in show seconds. */
const startOf = (plan: Plan, beat: Beat) =>
  BEATS.slice(0, BEATS.indexOf(beat)).reduce((seconds, each) => seconds + plan.beats[each], 0);

const overlapping = (spots: Spot[]) =>
  spots.some((spot, index) =>
    spots.slice(index + 1).some((other) => overlap(tagBox(spot), tagBox(other))),
  );

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

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  readonly beat: string;
  /** Who holds the potato; '' while it flies. */
  readonly holder: string;
  readonly sparkler: number;
  readonly lit: boolean;
  readonly inPlay: readonly string[];
  readonly moods: Readonly<Record<string, string>>;
  /** How big each head is drawn, 1 their spot's size. */
  readonly scales: Readonly<Record<string, number>>;
  /** Where the potato's centre is drawn. */
  readonly potato: Point;
  /** How opaque the sparkler's spark is drawn, 1 fully. */
  readonly spark: number;
}

/** Someone catching the potato: who, and what the stage showed in that frame. */
interface Caught {
  readonly holder: string;
  readonly sparkler: number;
  readonly beat: string;
  /** The show seconds of the frame it was caught in. */
  readonly time: number;
}

/**
 * Runs Hot Potato and notes what the stage showed every frame, and every
 * catch. In hot hands a catch is thrown on at once, so frames alone can miss
 * it: the catches are read from each change of the potato's holder.
 */
async function watch(
  team: readonly string[],
  unlucky: string,
  seed = 1,
  /** Called after every frame as well, for what the frames don't hold. */
  extra?: (time: number, stage: HTMLElement) => void,
): Promise<{ frames: Frame[]; catches: Caught[]; record: ShowRecord }> {
  const frames: Frame[] = [];
  const catches: Caught[] = [];
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts:
    | { scene: HTMLElement; people: HTMLElement[]; potato: SVGElement; spark: SVGElement }
    | undefined;
  let holder = '';
  /** The last frame's show seconds: a catch is noted while the next frame is drawn. */
  let last = 0;
  const note = (changes: MutationRecord[]) => {
    if (!parts) return;
    const { scene, potato } = parts;
    changes.forEach((_, index) => {
      // Each change names the holder before it; the last one's is the holder now.
      const next = changes[index + 1]?.oldValue ?? potato.dataset.holder ?? '';
      if (next === holder) return;
      holder = next;
      if (next) {
        catches.push({
          holder: next,
          sparkler: Number(potato.dataset.sparkler),
          beat: scene.dataset.beat!,
          time: last + 1 / 30,
        });
      }
    });
  };
  const holders = new MutationObserver(note);
  let record: ShowRecord;
  try {
    record = await runShow(hotPotato, {
      names: team,
      unlucky,
      seed,
      onFrame(time, stage) {
        if (!parts) {
          parts = {
            scene: stage.querySelector<HTMLElement>('[data-part="scene"]')!,
            people: [...stage.querySelectorAll<HTMLElement>('[data-person]')],
            potato: stage.querySelector<SVGElement>('[data-part="potato"]')!,
            spark: stage.querySelector<SVGElement>('[data-part="potato"] [data-part="spark"]')!,
          };
          holders.observe(parts.potato, {
            attributeFilter: ['data-holder'],
            attributeOldValue: true,
          });
        }
        const { scene, people, potato, spark } = parts;
        // Once the show is over, the run empties the stage.
        if (!scene.isConnected) return;
        frames.push({
          time,
          beat: scene.dataset.beat!,
          holder: potato.dataset.holder!,
          sparkler: Number(potato.dataset.sparkler),
          lit: potato.dataset.lit === 'true',
          inPlay: people
            .filter((person) => person.dataset.inPlay === 'true')
            .map((person) => person.dataset.person!),
          moods: Object.fromEntries(
            people.map((person) => [person.dataset.person!, person.dataset.mood!]),
          ),
          scales: Object.fromEntries(
            people.map((person) => [
              person.dataset.person!,
              Number(gsap.getProperty(person, 'scale')) *
                Number(gsap.getProperty(person.querySelector('svg')!, 'scale')),
            ]),
          ),
          potato: {
            x: Number(gsap.getProperty(potato, 'x')) + POTATO.width / 2,
            y: Number(gsap.getProperty(potato, 'y')) + POTATO.height / 2,
          },
          spark: Number(spark.style.opacity || 1),
        });
        extra?.(time, stage);
        last = time;
      },
    });
  } finally {
    // The last catch can still be waiting to be reported.
    note(holders.takeRecords());
    holders.disconnect();
  }
  expect(record.outcome).toBe('finished');
  return { frames, catches, record };
}

/** Whether `element` is drawn: neither it nor anything around it on `stage` is hidden. */
function shown(element: Element | null, stage: HTMLElement): boolean {
  for (let at = element; at && at !== stage; at = at.parentElement) {
    const { visibility, display } = (at as HTMLElement).style;
    if (visibility === 'hidden' || display === 'none' || at.getAttribute('display') === 'none') {
      return false;
    }
  }
  return element !== null;
}

/** Where `element` is drawn on `stage`: the styles that place it and everything around it. */
function placement(element: Element, stage: HTMLElement): string {
  const styles: string[] = [];
  for (let at: Element | null = element; at && at !== stage; at = at.parentElement) {
    const { transform, left, top, opacity, visibility } = (at as HTMLElement).style;
    styles.push([transform, left, top, opacity, visibility].join(' '));
  }
  return styles.join(' / ');
}

/** The captions of one run, in order. */
const said = (record: ShowRecord) => record.captions.map((caption) => caption.text);

/** Whether `lines` appear in `texts` in this order, not necessarily next to each other. */
function inOrder(texts: readonly string[], lines: readonly string[]): boolean {
  let next = 0;
  for (const text of texts) if (text === lines[next]) next++;
  return next === lines.length;
}

/** The first seed whose plan has the sparkler going out. */
const dudSeed = (count: number, unlucky: string) =>
  plans(count, unlucky).findIndex((plan) => plan.dud) + 1;

/** The lab runs, shared by the scenarios at the pop and the lab check below. */
let lab: LabRun[];
beforeAll(async () => {
  lab = await labRuns();
}, 60_000);

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

  Rule("It pops in the unlucky person's hands", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, variables) => {
        let team: string[];
        let unlucky: string;
        let frames: Frame[];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          team = names(Number(variables.count));
          unlucky = variables.position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs', async () => {
          ({ frames } = await watch(team, unlucky));
        });
        Then("the potato pops in the unlucky person's hands", () => {
          const pop = frames.filter((frame) => frame.beat === 'pop');
          expect(pop.length).toBeGreaterThan(0);
          for (const frame of pop) expect(frame.holder).toBe(unlucky);
        });
        And('nobody else is holding it when it pops', () => {
          // Just before the pop it is in their hands, or flying to them.
          const last = frames.filter((frame) => frame.beat !== 'pop').at(-1)!;
          expect(['', unlucky]).toContain(last.holder);
        });
      },
    );

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
      RuleScenario('Everyone else steps back', ({ Given, When, Then, And }) => {
        const team = names(8);
        let plan: Plan;
        let showdown: Frame[];
        Given('8 people', () => {
          plan = planShow(team, 'Luca', createRandom(1));
        });
        When('the showdown starts', async () => {
          const { frames } = await watch(team, 'Luca');
          showdown = frames.slice(frames.findIndex((frame) => frame.beat === 'showdown'));
        });
        Then('the 5 people out of play step back, smaller and relieved', () => {
          const outside = team.filter((name) => !plan.showdown.includes(name));
          expect(outside).toHaveLength(5);
          const start = showdown[0]!.time;
          // Until the second catch, when one of the three says "Phew!" and steps back too.
          const phew = during(plan, 'showdown')[1]!.at;
          for (const frame of showdown) {
            if (frame.time < phew)
              expect([...frame.inPlay].sort()).toEqual([...plan.showdown].sort());
            if (frame.holder) expect(plan.showdown).toContain(frame.holder);
            for (const name of outside) {
              if (frame.beat === 'showdown') expect(frame.moods[name], name).toBe('happy');
              if (frame.time >= start + 0.4) expect(frame.scales[name], name).toBeCloseTo(0.88, 3);
            }
          }
        });
        And('the potato only goes to the 3 in play until it pops', () => {
          const holders = showdown.map((frame) => frame.holder).filter(Boolean);
          expect(holders.length).toBeGreaterThan(0);
          for (const holder of holders) expect(plan.showdown).toContain(holder);
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

      RuleScenarioOutline(
        'Three become two, with <count> people',
        ({ Given, When, Then, And }, variables) => {
          let team: string[];
          let unlucky: string;
          let plan: Plan;
          let frames: Frame[];
          let catches: Caught[];
          const bubbles: { text: string; time: number; box: Box }[] = [];
          Given('<count> people', () => {
            team = names(Number(variables.count));
            unlucky = team.at(-1)!;
            plan = planShow(team, unlucky, createRandom(1));
          });
          When('the show runs', async () => {
            ({ frames, catches } = await watch(team, unlucky, 1, (time, stage) => {
              for (const bubble of stage.querySelectorAll<HTMLElement>('[data-part="bubble"]')) {
                const text = bubble.textContent!;
                if (bubbles.some((each) => each.text === text)) continue;
                if (bubble.style.visibility === 'hidden') continue;
                if (Number(bubble.style.opacity || 1) === 0) continue;
                const anchor = {
                  x: parseFloat(bubble.style.left),
                  y: parseFloat(bubble.style.top),
                };
                bubbles.push({ text, time, box: speechBox(text, anchor) });
              }
            }));
          });
          Then('each throw before the showdown is quicker than the one before', () => {
            const throws = during(plan, 'hot-hands').map(flight);
            expect(throws.length).toBeGreaterThan(1);
            throws.slice(1).forEach((length, index) => {
              expect(length).toBeLessThan(throws[index]!);
            });
          });
          And('3 people are left in play for the showdown, the unlucky person among them', () => {
            const S = startOf(plan, 'showdown');
            const showdown = frames.filter((frame) => frame.time >= S - 1e-9);
            expect(showdown[0]!.beat).toBe('showdown');
            expect(showdown[0]!.inPlay).toHaveLength(3);
            expect([...showdown[0]!.inPlay].sort()).toEqual([...plan.showdown].sort());
            expect(showdown[0]!.inPlay).toContain(unlucky);
          });
          And(
            'after two catches, one of the three who isn\'t holding it says "Phew!" and steps back',
            () => {
              const at = startOf(plan, 'showdown') + 1.7;
              const phew = plan.phew!;
              expect(plan.showdown).toContain(phew);
              const said = bubbles.find((each) => each.text === 'Phew!');
              expect(said).toBeDefined();
              // Frames are 1/30 s apart, and the bubble grows in from nothing.
              expect(said!.time).toBeGreaterThanOrEqual(at - 1e-9);
              expect(said!.time).toBeLessThanOrEqual(at + 2 / 30 + 1e-9);
              // Beside the head, or just over it where the potato is in the way: close, not on it.
              const head = headBox(ring(team.length)[plan.ring.indexOf(phew)]!);
              const { box } = said!;
              expect(overlap(box, head)).toBe(false);
              const across = Math.max(box.left - head.right, head.left - box.right);
              const down = Math.max(box.top - head.bottom, head.top - box.bottom);
              expect(Math.max(across, down)).toBeLessThanOrEqual(60);
              for (const frame of frames.filter((each) => each.time > at + 1e-9)) {
                expect(frame.inPlay, `at ${frame.time}`).not.toContain(phew);
                expect(frame.holder, `at ${frame.time}`).not.toBe(phew);
                if (frame.time >= at + 0.4) {
                  expect(frame.scales[phew], `at ${frame.time}`).toBeCloseTo(0.88, 3);
                }
                if (frame.beat === 'showdown') expect(frame.moods[phew]).toBe('happy');
              }
            },
          );
          And('the other two face each other in the duel, the unlucky person among them', () => {
            expect(plan.duel).toContain(unlucky);
            const D = startOf(plan, 'duel');
            const duel = frames.filter((frame) => frame.time >= D - 1e-9);
            expect(duel.length).toBeGreaterThan(0);
            for (const frame of duel) {
              expect([...frame.inPlay].sort(), `at ${frame.time}`).toEqual([...plan.duel].sort());
              if (frame.holder) expect(plan.duel).toContain(frame.holder);
            }
          });
          And(
            'each throw from the start of the showdown to the end of the duel takes longer than the one before',
            () => {
              // From the run: each throw lasts from the first frame with the potato in
              // the air after the catch before it, to its own catch.
              const first = before(plan).length;
              const throws = catches.slice(first - 1, first + 5);
              expect(throws.slice(1).map((each) => each.holder)).toEqual(
                [...during(plan, 'showdown'), ...during(plan, 'duel')].map((each) => each.by),
              );
              const flights = throws.slice(1).map((each, index) => {
                const caught = throws[index]!.time;
                const thrown = frames.find((frame) => frame.time >= caught && frame.holder === '')!;
                return each.time - thrown.time;
              });
              expect(flights).toHaveLength(5);
              flights.slice(1).forEach((length, index) => {
                expect(length).toBeGreaterThan(flights[index]!);
              });
            },
          );
        },
      );

      RuleScenario('The duel', ({ Given, When, Then, And }) => {
        const team = names(8);
        const unlucky = 'Luca';
        let plan: Plan;
        let frames: Frame[];
        /** The pair's name tags as drawn, where they stand, and whether they're in front of everyone else. */
        const pair: { time: number; tags: number[]; x: number[]; inFront: boolean }[] = [];
        Given('8 people', () => {
          plan = planShow(team, unlucky, createRandom(1));
        });
        When('the duel starts', async () => {
          ({ frames } = await watch(team, unlucky, 1, (time, stage) => {
            const people = [...stage.querySelectorAll<HTMLElement>('[data-person]')];
            const two = plan.duel.map((name) =>
              people.find((each) => each.dataset.person === name)!,
            );
            const spots = ring(8);
            pair.push({
              time,
              tags: two.map((el) =>
                drawnTag(el.querySelector<HTMLElement>('[data-on="chest"]')!, stage),
              ),
              x: two.map(
                (el) =>
                  spots[plan.ring.indexOf(el.dataset.person!)]!.x +
                  Number(gsap.getProperty(el, 'x')),
              ),
              inFront: people.every(
                (el) =>
                  two.includes(el) ||
                  two.every(
                    (one) =>
                      (el.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
                  ),
              ),
            });
          }));
        });
        Then(
          'the last two step into the middle and face each other, drawn big, their name tags at 40 pixels or more',
          () => {
            const D = startOf(plan, 'duel');
            const P = startOf(plan, 'pop');
            const big = pair.filter((each) => each.time >= D + 0.5 - 1e-9 && each.time < P);
            expect(big.length).toBeGreaterThan(30);
            for (const each of big) {
              for (const tag of each.tags)
                expect(tag, `at ${each.time}`).toBeGreaterThanOrEqual(40);
              expect(each.inFront, `at ${each.time}`).toBe(true);
              // One on each side of the middle, facing each other.
              const [left, right] = [...each.x].sort((a, b) => a - b);
              expect(left, `at ${each.time}`).toBeCloseTo(320, 3);
              expect(right, `at ${each.time}`).toBeCloseTo(960, 3);
            }
            const spots = ring(8);
            for (const frame of frames.filter((each) => each.time >= D + 0.5 && each.time < P)) {
              for (const name of plan.duel) {
                const size = spots[plan.ring.indexOf(name)]!.size;
                expect(frame.scales[name]! * size, `${name} at ${frame.time}`).toBeCloseTo(180, 1);
              }
            }
          },
        );
        And('the other 6 shrink back behind them and watch, worried', () => {
          const D = startOf(plan, 'duel');
          const P = startOf(plan, 'pop');
          const others = team.filter((name) => !plan.duel.includes(name));
          expect(others).toHaveLength(6);
          const watching = frames.filter((frame) => frame.time >= D - 1e-9 && frame.time < P);
          expect(watching.length).toBeGreaterThan(30);
          for (const frame of watching) {
            for (const name of others) {
              expect(frame.moods[name], `${name} at ${frame.time}`).toBe('worried');
              expect(frame.scales[name], `${name} at ${frame.time}`).toBeLessThan(1);
            }
          }
        });
        And('the potato only goes between the two until it pops', () => {
          const D = startOf(plan, 'duel');
          const holders = frames
            .filter((frame) => frame.time >= D - 1e-9)
            .map((frame) => frame.holder)
            .filter(Boolean);
          expect(holders.length).toBeGreaterThan(0);
          for (const holder of holders) expect(plan.duel).toContain(holder);
        });
        And('the sparkler is a short stub that flickers, never more than 3 times a second', () => {
          const D = startOf(plan, 'duel');
          const P = startOf(plan, 'pop');
          for (const frame of frames.filter((each) => each.time < D - 1e-9)) {
            expect(frame.spark, `at ${frame.time}`).toBe(1);
          }
          const duel = frames.filter((each) => each.time >= D - 1e-9 && each.time < P);
          for (const frame of duel) {
            expect(frame.sparkler, `at ${frame.time}`).toBeLessThanOrEqual(0.25);
          }
          // A dip: the spark goes from over halfway to under halfway between 1 and 0.45.
          const dips: number[] = [];
          duel.forEach((frame, index) => {
            const before = duel[index - 1];
            if (before && before.spark >= 0.725 && frame.spark < 0.725) dips.push(frame.time);
          });
          expect(dips.length).toBeGreaterThan(3);
          for (const dip of dips) {
            expect(dips.filter((each) => each >= dip && each < dip + 1).length).toBeLessThanOrEqual(
              3,
            );
          }
        });
        And('the heartbeat comes quicker and quicker until the pop', () => {
          // Sound isn't recorded: play.ts cues a heartbeat at each of these.
          const { heartbeats } = plan;
          expect(heartbeats.length).toBeGreaterThan(3);
          expect(heartbeats[0]).toBeCloseTo(startOf(plan, 'duel'), 9);
          expect(heartbeats.at(-1)!).toBeLessThan(startOf(plan, 'pop'));
          const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
          expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
          gaps.slice(1).forEach((gap, index) => {
            expect(gap).toBeLessThanOrEqual(gaps[index]! + 1e-9);
          });
        });
      });

      RuleScenario('With 2 people it is a duel from the start', ({ Given, When, Then, And }) => {
        let plan: Plan;
        Given('2 people', () => {});
        When('the show runs', () => {
          plan = planShow(names(2), names(2)[0]!, createRandom(1));
        });
        Then('each throw before the duel is quicker than the one before', () => {
          const throws = during(plan, 'hot-hands').map(flight);
          expect(throws.length).toBeGreaterThan(1);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeLessThan(throws[index]!);
          });
        });
        And('there is no showdown, and nobody says "Phew!"', () => {
          expect(plan.beats.showdown).toBe(0);
          expect(during(plan, 'showdown')).toHaveLength(0);
          expect(plan.phew).toBeNull();
        });
        And('the duel has 5 throws, each longer than the one before', () => {
          const throws = during(plan, 'duel').map(flight);
          expect(throws).toHaveLength(5);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeGreaterThan(throws[index]!);
          });
        });
      });

      RuleScenario('Who says "Phew!" gives nothing away', ({ Given, When, Then, And }) => {
        let runs: Plan[];
        Given('8 people, with the same unlucky person every time', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plans(8, 'Luca');
        });
        Then('at least 2 different people say "Phew!", and never the unlucky person', () => {
          expect(new Set(runs.map((plan) => plan.phew)).size).toBeGreaterThanOrEqual(2);
          for (const plan of runs) {
            expect(plan.phew).not.toBeNull();
            expect(plan.phew).not.toBe('Luca');
          }
        });
        And(
          'the unlucky person is holding it when the duel ends in some runs, and not in others',
          () => {
            const holding = runs.map((plan) => during(plan, 'duel').at(-1)!.by === 'Luca');
            expect(holding).toContain(true);
            expect(holding).toContain(false);
          },
        );
      });
    },
  );

  Rule('The sparkler is the clock everyone watches', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('It burns down to the last second', ({ When, Then, And }) => {
      const team = names(8);
      let plan: Plan;
      let frames: Frame[];
      let catches: Caught[];
      When('the show runs', async () => {
        const seed = dudSeed(8, 'Luca');
        plan = planShow(team, 'Luca', createRandom(seed));
        ({ frames, catches } = await watch(team, 'Luca', seed));
      });
      Then(
        'the sparkler is shorter at each throw than at the one before, except when it relights',
        () => {
          expect(catches.length).toBeGreaterThan(5);
          expect(frames.some((frame) => frame.beat === 'relight')).toBe(true);
          const relight = BEATS.indexOf('relight');
          const order = (each: Caught) => BEATS.indexOf(each.beat as Beat);
          catches.slice(1).forEach((each, k) => {
            const previous = catches[k]!;
            const relit = order(previous) < relight && order(each) >= relight;
            if (!relit) {
              expect(each.sparkler, `catch ${k + 1}, ${each.holder}`).toBeLessThan(
                previous.sparkler,
              );
            }
          });
        },
      );
      And('it reaches its last spark only in the last second, and burns until the pop', () => {
        const L = startOf(plan, 'last-second');
        const P = startOf(plan, 'pop');
        const last = frames.filter((frame) => frame.sparkler === 0);
        expect(last.filter((frame) => frame.time < P).length).toBeGreaterThan(0);
        for (const frame of last) expect(frame.time, `at ${frame.time}`).toBeGreaterThanOrEqual(L);
        for (const frame of frames.filter((each) => each.time >= L && each.time < P)) {
          expect(frame.lit, `at ${frame.time}`).toBe(true);
        }
      });
    });

    RuleScenarioOutline(
      'Sometimes it seems to go out, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let runs: Plan[];
        let frames: Frame[];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', async () => {
          const team = names(Number(variables.count));
          runs = plans(team.length, team[0]!);
          ({ frames } = await watch(team, team[0]!, dudSeed(team.length, team[0]!)));
        });
        Then(
          'in some runs the sparkler goes out before the showdown, everyone relaxes, and it relights shorter',
          () => {
            expect(runs.some((plan) => plan.dud)).toBe(true);
            const dud = frames.filter((frame) => frame.beat === 'dud');
            expect(dud.length).toBeGreaterThan(0);
            for (const frame of dud) {
              expect(frame.lit).toBe(false);
              expect(Object.values(frame.moods)).toHaveLength(Number(variables.count));
              for (const mood of Object.values(frame.moods)) expect(mood).toBe('happy');
            }
            const relight = frames.find((frame) => frame.beat === 'relight')!;
            expect(relight.lit).toBe(true);
            expect(relight.sparkler).toBeLessThan(dud[0]!.sparkler);
          },
        );
        And('in some runs it never goes out', () => {
          expect(runs.some((plan) => plan.dud === null)).toBe(true);
        });
      },
    );
  });

  Rule('The ending is a pop and a paper crown', ({ RuleScenario }) => {
    RuleScenario('The pop', ({ Given, When, Then, And }) => {
      const team = names(8);
      let frames: Frame[];
      const pop: { potato: boolean; confetti: number; crown: boolean }[] = [];
      Given('the unlucky person is "Luca"', () => {});
      When('the potato pops on "Luca"', async () => {
        ({ frames } = await watch(team, 'Luca', 1, (_, stage) => {
          const beat = stage.querySelector<HTMLElement>('[data-part="scene"]')?.dataset.beat;
          if (beat !== 'pop') return;
          pop.push({
            potato: shown(stage.querySelector('[data-part="potato"]'), stage),
            confetti: [...stage.querySelectorAll('[data-part="confetti"]')].filter((bit) =>
              shown(bit, stage),
            ).length,
            crown: shown(stage.querySelector('[data-person="Luca"] [data-part="crown"]'), stage),
          });
        }));
      });
      Then('it pops into confetti', () => {
        expect(pop.some((each) => each.confetti > 10)).toBe(true);
        expect(pop.some((each) => each.potato)).toBe(false);
      });
      And('"Luca" gets a paper crown and celebrates', () => {
        expect(pop.some((each) => each.crown)).toBe(true);
        expect(frames.at(-1)!.moods.Luca).toBe('party');
      });
      And('everyone else cheers', () => {
        for (const name of team.filter((each) => each !== 'Luca')) {
          expect(frames.at(-1)!.moods[name], name).toBe('happy');
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      const placed: { time: number; luca: string }[] = [];
      let duration = 0;
      Given('the unlucky person is "Luca"', () => {});
      When('the show runs', async () => {
        const { record } = await watch(names(8), 'Luca', 1, (time, stage) => {
          const luca = stage.querySelector('[data-person="Luca"]')!;
          placed.push({ time, luca: placement(luca, stage) });
        });
        duration = record.duration;
      });
      Then('"Luca" is on stage, not moving, for the last 1.5 seconds', () => {
        const last = placed.filter((each) => each.time >= duration - 1.5);
        expect(last.length).toBeGreaterThan(30);
        for (const each of last) expect(each.luca).toBe(last[0]!.luca);
      });
    });

    RuleScenario('The unlucky person stands out at the pop', ({ Given, When, Then, And }) => {
      Given('the unlucky person is "Luca"', () => {
        for (const { label, unlucky } of lab) expect(unlucky, label).toBe('Luca');
      });
      When('the potato pops', () => {});
      Then('"Luca" grows to 1.3 times their size, in front of everyone', () => {
        for (const { label, inFront, grownScale } of lab) {
          expect(inFront, label).toBe(true);
          expect(grownScale, label).toBeCloseTo(1.3, 3);
        }
      });
      And(
        'the burst is behind everyone, and "Pop!" covers neither Luca\'s head nor the crown',
        () => {
          for (const { label, burstBehind, bubbles, unlucky, plan } of lab) {
            expect(burstBehind, label).toBe(true);
            // Where they stand at the pop: in the duel.
            const pair = plan.duel.map((name) => plan.ring.indexOf(name)) as [number, number];
            const spot = duelLayout(plan.ring.length, pair)[plan.ring.indexOf(unlucky)]!;
            const pop = bubbles.find((each) => each.text === 'Pop!')!;
            expect(pop, label).toBeDefined();
            expect(overlap(pop.box, headBox(spot)), label).toBe(false);
            expect(overlap(pop.box, crowned(spot).head), label).toBe(false);
          }
        },
      );
      And('"It popped on Luca!" is up within 0.2 seconds of the pop', () => {
        for (const { label, plan, record } of lab) {
          const pop = total(plan) - plan.beats.pop;
          const popped = record.captions.find((each) => each.text === 'It popped on Luca!');
          expect(popped, label).toBeDefined();
          // Frames are 1/30 s apart.
          expect(popped!.from - pop, label).toBeLessThanOrEqual(0.2 + 1 / 30 + 1e-9);
        }
      });
    });
  });

  Rule('The beats keep every show a second or more inside the limit', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long now', ({ When, Then }) => {
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
            'the duel': 'duel',
            'the last second': 'last-second',
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

    RuleScenario('Every head count lands inside the new limits', ({ When, Then, And }) => {
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
      Then('each run with the sparkler going out lasts between 18.5 and 19.5 seconds', () => {
        for (const { label, plan } of runs.filter((run) => run.plan.dud)) {
          expect(total(plan), label).toBeGreaterThanOrEqual(18.5);
          expect(total(plan), label).toBeLessThanOrEqual(19.5);
        }
      });
      And('each run without it lasts between 15.8 and 16.5 seconds', () => {
        for (const { label, plan } of runs.filter((run) => !run.plan.dud)) {
          expect(total(plan), label).toBeGreaterThanOrEqual(15.8);
          expect(total(plan), label).toBeLessThanOrEqual(16.5);
        }
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('The duel names each catch', ({ Given, When, Then }) => {
      // The duel is between the unlucky person and one other, so one of the
      // two named has to be the unlucky person.
      const team = [...TEAM.slice(0, 6), 'Priya', 'Tom'];
      const wanted = ['Priya', 'Tom', 'Priya'];
      let found: { seed: number; unlucky: string } | undefined;
      let record: ShowRecord;
      Given('8 people, and the duel\'s catches go to "Priya", "Tom" and "Priya"', () => {
        search: for (let seed = 1; seed <= 500; seed++) {
          for (const unlucky of ['Priya', 'Tom']) {
            const plan = planShow(team, unlucky, createRandom(seed));
            if (
              during(plan, 'duel')
                .map((each) => each.by)
                .join() === wanted.join()
            ) {
              found = { seed, unlucky };
              break search;
            }
          }
        }
        expect(found, 'no seed up to 500 sends the duel to Priya, Tom, Priya').toBeDefined();
      });
      When('the show runs', async () => {
        ({ record } = await watch(team, found!.unlucky, found!.seed));
      });
      Then('the duel is captioned "Priya…", "Tom…" and "Priya…"', () => {
        expect(inOrder(said(record), ['Priya…', 'Tom…', 'Priya…']), said(record).join(' / ')).toBe(
          true,
        );
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let record: ShowRecord;
      When('the show runs', async () => {
        ({ record } = await watch(names(8), 'Luca', dudSeed(8, 'Luca')));
      });
      Then('every caption stays on screen for at least 1 second', () => {
        expect(record.captions.length).toBeGreaterThan(5);
        for (const caption of record.captions) {
          expect(caption.to - caption.from, caption.text).toBeGreaterThanOrEqual(1 - 1e-9);
        }
      });
    });

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

  it('held is over the face where that stays out of the sky, beside it where not', () => {
    const front = ring(8)[4]!;
    expect(held(front).x).toBe(front.x);
    expect(held(front).y).toBeLessThan(face(front).y);
    const back = ring(8)[0]!;
    expect(held(back).x).toBeGreaterThan(back.x);
    expect(held(back).y).toBeGreaterThanOrEqual(face(back).y);
  });

  it("a held potato never covers the holder's face or reaches the caption", () => {
    for (let count = 2; count <= 12; count++) {
      const scale = count === 2 ? POTATO.pairScale : 1;
      for (const [index, spot] of ring(count).entries()) {
        const label = `${count} people, spot ${index}`;
        const box = potatoBox(held(spot, scale), scale);
        const { x, y, r } = face(spot);
        const near = {
          x: Math.min(box.right, Math.max(box.left, x)),
          y: Math.min(box.bottom, Math.max(box.top, y)),
        };
        expect(Math.hypot(near.x - x, near.y - y), label).toBeGreaterThan(r);
        expect(box.top - scale * POTATO.above, label).toBeGreaterThanOrEqual(SKY);
        expect(box.left, label).toBeGreaterThanOrEqual(0);
        expect(box.right, label).toBeLessThanOrEqual(1280);
        expect(box.bottom, label).toBeLessThanOrEqual(720);
      }
    }
  });

  /** The top of the potato's drawing, a full sparkler or the smoke included, centred at `point`. */
  const drawingTop = (point: Point, scale: number) =>
    point.y - scale * (POTATO.height / 2 + POTATO.above);

  it('the potato stays below the caption, held at any spot and at the top of every throw', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = count === 2 ? POTATO.pairScale : 1;
      const points = ring(count).map((spot) => held(spot, scale));
      for (const [index, point] of points.entries()) {
        expect(drawingTop(point, scale), `${count} people, spot ${index}`).toBeGreaterThanOrEqual(
          SKY,
        );
        const box = potatoBox(point, scale);
        expect(box.left, `${count} people, spot ${index}`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${count} people, spot ${index}`).toBeLessThanOrEqual(1280);
      }
      for (const [i, from] of points.entries()) {
        for (const [j, to] of points.entries()) {
          const path = throwPath(from, to, scale);
          for (let step = 0; step <= 200; step++) {
            const point = bezier(step / 200, ...path);
            expect(
              drawingTop(point, scale),
              `${count} people, ${i} to ${j}`,
            ).toBeGreaterThanOrEqual(SKY - 1e-6);
          }
        }
      }
    }
  });

  it('a grown unlucky person keeps their tag on stage and off every other tag', () => {
    for (let count = 2; count <= 12; count++) {
      const spots = ring(count);
      for (const [index, spot] of spots.entries()) {
        const { tag } = crowned(spot);
        const label = `${count} people, spot ${index}`;
        expect(tag.left, label).toBeGreaterThanOrEqual(0);
        expect(tag.right, label).toBeLessThanOrEqual(1280);
        expect(tag.bottom, label).toBeLessThanOrEqual(720);
        for (const other of spots.filter((each) => each !== spot)) {
          expect(overlap(tag, tagBox(other)), label).toBe(false);
          expect(overlap(tag, tagBox(outOfPlay(other))), label).toBe(false);
        }
      }
    }
  });

  /** Every pair of ring indices at `count`. */
  const pairs = (count: number): [number, number][] =>
    Array.from({ length: count }, (_, i) =>
      Array.from({ length: count - i - 1 }, (_, k): [number, number] => [i, i + k + 1]),
    ).flat();

  it("nobody's tag crosses another on the way into the duel", () => {
    for (let count = 3; count <= 12; count++) {
      for (const pair of pairs(count)) {
        for (let step = 0; step <= 20; step++) {
          const t = step / 20;
          const label = `${count} people, pair ${pair.join(' and ')}, t ${t}`;
          const moved = duelMove(count, pair, t);
          expect(moved, label).toHaveLength(count);
          for (const index of pair) expect(moved[index]!.shown, label).toBe(1);
          const seen = moved.filter((each) => each.shown > 0).map((each) => each.spot);
          expect(overlapping(seen), label).toBe(false);
          for (const spot of seen) {
            const tag = tagBox(spot);
            expect(tag.left, label).toBeGreaterThanOrEqual(0);
            expect(tag.right, label).toBeLessThanOrEqual(1280);
            expect(tag.top, label).toBeGreaterThanOrEqual(0);
            expect(tag.bottom, label).toBeLessThanOrEqual(720);
            expect(headBox(spot).top, label).toBeGreaterThanOrEqual(SKY);
          }
        }
      }
    }
  });

  it('the watchers fade out at their ring spot and back in watching, quickly', () => {
    // t is a share of the 0.5 s step-in.
    const seconds = (t: number) => 0.5 * t;
    for (let count = 3; count <= 12; count++) {
      for (const pair of pairs(count)) {
        const spots = ring(count);
        const end = duelLayout(count, pair);
        const steps = Array.from({ length: 201 }, (_, step) => step / 200);
        const moves = steps.map((t) => duelMove(count, pair, t));
        expect(moves[0]!.map((each) => each.spot)).toEqual(
          spots.map((spot, index) => (pair.includes(index) ? spot : outOfPlay(spot))),
        );
        expect(moves.at(-1)!.map((each) => each.spot)).toEqual(end);
        for (let index = 0; index < count; index++) {
          if (pair.includes(index)) continue;
          const label = `${count} people, pair ${pair.join(' and ')}, watcher ${index}`;
          const shown = moves.map((move) => move[index]!.shown);
          const fading = steps.filter((_, k) => shown[k]! > 0 && shown[k]! < 1);
          const hidden = steps.filter((_, k) => shown[k] === 0);
          expect(hidden.length, label).toBeGreaterThan(0);
          const [gone, back] = [hidden[0]!, hidden.at(-1)!];
          expect(seconds(back - gone), label).toBeLessThanOrEqual(0.3 + 1e-9);
          const out = fading.filter((t) => t < gone);
          const into = fading.filter((t) => t > back);
          expect(seconds(gone - (out[0] ?? gone)), label).toBeLessThanOrEqual(0.2 + 1e-9);
          expect(seconds((into.at(-1) ?? back) - back), label).toBeLessThanOrEqual(0.2 + 1e-9);
          moves.forEach((move, k) => {
            if (shown[k] === 0) return;
            const want = steps[k]! < gone ? outOfPlay(spots[index]!) : end[index]!;
            expect(move[index]!.spot, `${label}, t ${steps[k]}`).toEqual(want);
          });
        }
      }
    }
  });

  it("the duel's pair is big", () => {
    expect(duelLayout(2, [0, 1])).toEqual(ring(2));
    expect(duelMove(2, [0, 1], 0.5).map((each) => each.spot)).toEqual(ring(2));
    for (let count = 3; count <= 12; count++) {
      const spots = ring(count);
      for (const [i, j] of pairs(count)) {
        const label = `${count} people, pair ${i} and ${j}`;
        const end = duelLayout(count, [i, j]);
        for (const index of [i, j]) {
          expect(end[index]!.size, label).toBe(180);
          expect(end[index]!.tag.size, label).toBeGreaterThanOrEqual(40);
        }
        const [left, right] = spots[i]!.x <= spots[j]!.x ? [i, j] : [j, i];
        expect(end[left]!.x, label).toBeLessThan(end[right]!.x);
        // At the pop either one may grow: their tag stays on stage and off the watchers'.
        for (const index of [i, j]) {
          const { tag } = crowned(end[index]!);
          expect(tag.left, label).toBeGreaterThanOrEqual(0);
          expect(tag.right, label).toBeLessThanOrEqual(1280);
          expect(tag.bottom, label).toBeLessThanOrEqual(720);
          end.forEach((other, k) => {
            if (k !== index) expect(overlap(tag, tagBox(other)), `${label}, ${k}`).toBe(false);
          });
        }
      }
    }
  });
});

describe('The stage', () => {
  it('plays the plan for its seed', async () => {
    const team = names(8);
    for (const ending of ENDINGS) {
      const seed = plans(8, 'Luca').findIndex((plan) => plan.ending === ending) + 1;
      expect(seed, ending).toBeGreaterThan(0);
      const plan = planShow(team, 'Luca', createRandom(seed));
      const { frames, catches } = await watch(team, 'Luca', seed);
      const holders = catches.map((each) => each.holder);
      expect(holders, `${ending}, seed ${seed}`).toEqual(plan.catches.map((each) => each.by));
      for (const beat of ['duel', 'last-second'] as const) {
        expect(
          frames.some((frame) => frame.beat === beat),
          `${ending}: ${beat}`,
        ).toBe(true);
      }
    }
  });

  it("with reduced motion the spark doesn't flicker", async () => {
    const opacity = new Set<string>();
    const record = await runShow(hotPotato, {
      names: names(8),
      unlucky: 'Luca',
      reducedMotion: true,
      onFrame(_, stage) {
        const spark = stage.querySelector<SVGElement>('[data-part="potato"] [data-part="spark"]');
        if (spark) opacity.add(spark.style.opacity);
      },
    });
    expect(record.outcome).toBe('finished');
    expect([...opacity].filter((each) => each !== '' && Number(each) !== 1)).toEqual([]);
  });
});

/** A bubble as it appeared: what it said, its box, and the potato's box then (null while hidden). */
interface Said {
  readonly text: string;
  readonly box: Box;
  readonly potato: Box | null;
}

/** One run of the lab check: its plan, captions, bubbles, and the stage near the end. */
interface LabRun {
  readonly label: string;
  readonly plan: Plan;
  readonly unlucky: string;
  readonly record: ShowRecord;
  readonly frames: Frame[];
  readonly bubbles: Said[];
  /** The burst comes before every person on the stage. */
  readonly burstBehind: boolean;
  /** In the last frame: the unlucky person comes after everyone else, and how many times bigger than just before the pop. */
  readonly inFront: boolean;
  readonly grownScale: number;
  /** In the last frame: whose arms are up. */
  readonly raised: string[];
  /** Where the unlucky person was drawn, each frame. */
  readonly placed: { time: number; at: string }[];
  /** The smallest any name tag was drawn, in stage pixels, over every frame. */
  readonly smallestTag: number;
}

/**
 * How big `tag` is drawn on `stage`: its size times the scale GSAP gives it and
 * everything around it. (GSAP can't read the tag's own CSS transform in jsdom.)
 */
function drawnTag(tag: HTMLElement, stage: HTMLElement): number {
  let size = parseFloat(tag.style.getPropertyValue('--tag-size'));
  for (let at: Element | null = tag; at && at !== stage; at = at.parentElement) {
    const scale = /scale\(([^,)]+)/.exec((at as HTMLElement).style.transform);
    if (scale) size *= Number(scale[1]);
  }
  return size;
}

/** Hot Potato at 2, 8 and 12 people, Luca unlucky and last, once with each ending. */
async function labRuns(): Promise<LabRun[]> {
  const runs: LabRun[] = [];
  for (const count of [2, 8, 12]) {
    const unlucky = 'Luca';
    const team = [...TEAM.filter((name) => name !== unlucky).slice(0, count - 1), unlucky];
    const all = Array.from({ length: 40 }, (_, index) =>
      planShow(team, unlucky, createRandom(index + 1)),
    );
    for (const ending of ENDINGS) {
      const seed = all.findIndex((plan) => plan.ending === ending) + 1;
      expect(seed, `${count} people, ${ending}`).toBeGreaterThan(0);
      const bubbles: Said[] = [];
      const seen = new Set<Element>();
      const placed: { time: number; at: string }[] = [];
      let smallestTag = Infinity;
      let beforePop = 1;
      let end = { burstBehind: false, inFront: false, grownScale: 0, raised: [] as string[] };
      const { frames, record } = await watch(team, unlucky, seed, (time, stage) => {
        const scene = stage.querySelector<HTMLElement>('[data-part="scene"]')!;
        const potato = scene.querySelector<SVGElement>('[data-part="potato"]')!;
        for (const bubble of scene.querySelectorAll<HTMLElement>('[data-part="bubble"]')) {
          if (seen.has(bubble) || bubble.style.visibility === 'hidden') continue;
          if (Number(bubble.style.opacity || 1) === 0) continue;
          seen.add(bubble);
          const scale = Number(gsap.getProperty(potato, 'scale'));
          const centre = {
            x: Number(gsap.getProperty(potato, 'x')) + POTATO.width / 2,
            y: Number(gsap.getProperty(potato, 'y')) + POTATO.height / 2,
          };
          const anchor = { x: parseFloat(bubble.style.left), y: parseFloat(bubble.style.top) };
          bubbles.push({
            text: bubble.textContent!,
            box: speechBox(bubble.textContent!, anchor),
            potato: shown(potato, stage) ? potatoBox(centre, scale) : null,
          });
        }
        const people = [...scene.querySelectorAll<HTMLElement>('[data-person]')];
        const them = people.find((person) => person.dataset.person === unlucky)!;
        const burst = scene.querySelector('[data-part="burst"]')!;
        placed.push({ time, at: placement(them, stage) });
        if (scene.dataset.beat !== 'pop') beforePop = Number(gsap.getProperty(them, 'scale'));
        for (const tag of scene.querySelectorAll<HTMLElement>('[data-on="chest"]')) {
          smallestTag = Math.min(smallestTag, drawnTag(tag, stage));
        }
        end = {
          burstBehind: people.every(
            (person) =>
              (burst.compareDocumentPosition(person) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
          ),
          inFront: people.every(
            (person) =>
              person === them ||
              (them.compareDocumentPosition(person) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
          ),
          grownScale: Number(gsap.getProperty(them, 'scale')) / beforePop,
          raised: people
            .filter((person) => shown(person.querySelector('[data-part="land-arms"]'), stage))
            .map((person) => person.dataset.person!),
        };
      });
      runs.push({
        label: `${count} people, ${ending}, seed ${seed}`,
        plan: all[seed - 1]!,
        unlucky,
        record,
        frames,
        bubbles,
        placed,
        smallestTag,
        ...end,
      });
    }
  }
  return runs;
}

describe('The lab check', () => {
  it('bubbles appear inside the stage and off the potato', () => {
    for (const { label, bubbles } of lab) {
      expect(bubbles.length, label).toBeGreaterThan(2);
      for (const { text, box, potato } of bubbles) {
        expect(box.left, `${label}: ${text}`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${label}: ${text}`).toBeLessThanOrEqual(1280);
        expect(box.top, `${label}: ${text}`).toBeGreaterThanOrEqual(0);
        expect(box.bottom, `${label}: ${text}`).toBeLessThanOrEqual(720);
        if (potato) expect(overlap(box, potato), `${label}: ${text}`).toBe(false);
      }
    }
  });

  it('every name tag is drawn at 22 px or more on every frame', () => {
    for (const { label, smallestTag } of lab) {
      expect(smallestTag, label).toBeGreaterThanOrEqual(22);
    }
  });

  it('everyone cheers at the end, arms up', () => {
    for (const { label, plan, unlucky, frames, raised } of lab) {
      for (const name of plan.ring) {
        expect(frames.at(-1)!.moods[name], `${label}: ${name}`).toBe(
          name === unlucky ? 'party' : 'happy',
        );
      }
      expect([...raised].sort(), label).toEqual([...plan.ring].sort());
    }
  });

  it('every caption is up 1 s or more', () => {
    for (const { label, record } of lab) {
      for (const caption of record.captions) {
        expect(caption.to - caption.from, `${label}: ${caption.text}`).toBeGreaterThanOrEqual(
          1 - 1e-9,
        );
      }
    }
  });

  it('the unlucky person holds still for the last 1.5 s', () => {
    for (const { label, record, placed } of lab) {
      const last = placed.filter((each) => each.time >= record.duration - 1.5);
      expect(last.length, label).toBeGreaterThan(30);
      for (const each of last) expect(each.at, label).toBe(last[0]!.at);
    }
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
      for (const each of catches) {
        const hangsFromThem =
          plan.ending === 'hang-time' && each.beat === 'last-second' && each.from === unlucky;
        if (!hangsFromThem) expect(each.from, label).not.toBe(each.by);
      }
      expect(catches.at(-1)!.by, label).toBe(unlucky);
      catches.forEach((each, index) => {
        if (each.beat === 'last-second') expect(each.sparkler, label).toBe(0);
        else expect(each.sparkler, label).toBeGreaterThan(0);
        if (index > 0) expect(each.sparkler, label).toBeLessThan(catches[index - 1]!.sparkler);
      });
    }
  });

  it('the catches add up', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.at, label).toBeCloseTo(previous + each.seconds, 9);
        expect(each.thrown, label).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(each.thrown, label).toBeLessThan(each.at);
      });
    }
  });

  it('throws stay in order when stretched', () => {
    for (const { label, plan } of all) {
      const throws = [...during(plan, 'showdown'), ...during(plan, 'duel')].map(flight);
      // Two in the showdown and three in the duel, or five in the duel with 2 people.
      expect(throws.length, label).toBe(5);
      throws.slice(1).forEach((length, index) => {
        expect(length, label).toBeGreaterThan(throws[index]!);
      });
    }
  });

  it('the last second fits', () => {
    for (const { label, plan } of all) {
      const L = startOf(plan, 'last-second');
      const P = startOf(plan, 'pop');
      expect(during(plan, 'duel').at(-1)!.at, label).toBeCloseTo(L, 9);
      expect(plan.lastSpark, label).toBeGreaterThan(L);
      expect(plan.lastSpark, label).toBeLessThan(P);
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(L);
      expect(plan.still.to, label).toBeLessThanOrEqual(P - 0.4 + 1e-9);
      const { heartbeats } = plan;
      expect(heartbeats[0], label).toBeCloseTo(startOf(plan, 'duel'), 9);
      expect(heartbeats.at(-1)!, label).toBeLessThan(P);
      const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
      gaps.forEach((gap, index) => {
        expect(gap, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (index > 0 && gaps[index - 1]! > 0.4 + 1e-9) {
          expect(gap, label).toBeLessThan(gaps[index - 1]!);
        } else if (index > 0) {
          expect(gap, label).toBeCloseTo(0.4, 9);
        }
      });
    }
  });

  it('a hanging last throw comes from either of the two', () => {
    const hanging = plans(8, 'Luca', 30).filter((plan) => plan.ending === 'hang-time');
    const from = hanging.map((plan) => {
      const partner = plan.duel.find((name) => name !== 'Luca')!;
      const last = plan.catches.at(-1)!;
      expect(last.beat).toBe('last-second');
      expect([partner, 'Luca']).toContain(last.from);
      return last.from === 'Luca';
    });
    expect(from).toContain(true);
    expect(from).toContain(false);
  });
});
