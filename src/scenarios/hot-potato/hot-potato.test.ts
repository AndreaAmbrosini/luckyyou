import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { beforeAll, describe, expect, it } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { speechBox } from '../../scenario-kit';
import hotPotato from './index';
import {
  bezier,
  crowned,
  duelLayout,
  duelMove,
  face,
  hang,
  headBox,
  held,
  outOfPlay,
  overlap,
  POTATO,
  potatoBox,
  raised,
  ring,
  SKY,
  tagBox,
  throwPath,
  windUp,
  type Box,
  type Point,
  type Spot,
} from './layout';
import { BEATS, planShow, type Beat, type Catch, type Ending, type Plan } from './plan';

const ENDINGS: readonly Ending[] = ['holding-on', 'too-hot', 'hangs', 'strays'];

/** Names up to 15 characters: the last is as long as the layout plans for. */
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
  'Annamaria Rossi',
];

/** The first `count` of the team. */
const names = (count: number) => TEAM.slice(0, count);

/** `count` of the team, Luca last. */
const labTeam = (count: number) => [
  ...TEAM.filter((name) => name !== 'Luca').slice(0, count - 1),
  'Luca',
];

/** Plans for seeds 1 to `seeds`. */
function plans(count: number, unlucky: string, seeds = 20, team = names(count)): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(team, unlucky, createRandom(index + 1)),
  );
}

const during = (plan: Plan, beat: Beat) => plan.catches.filter((each) => each.beat === beat);
const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);
/** When `beat` starts, in show seconds. */
const startOf = (plan: Plan, beat: Beat) =>
  BEATS.slice(0, BEATS.indexOf(beat)).reduce((seconds, each) => seconds + plan.beats[each], 0);
/** How long a pass is in the air. */
const flight = (each: Catch) => each.at - each.thrown;
/** Passes from the plop to the pop. */
const passes = (plan: Plan) => plan.catches.length - 1;

const mod = (value: number, count: number) => ((value % count) + count) % count;
/** Who stands `steps` on from `name`, the way the potato goes round. */
const next = (plan: Plan, name: string, steps = 1) =>
  plan.ring[mod(plan.ring.indexOf(name) + plan.direction * steps, plan.ring.length)]!;

/** Every head count, with seeds 1–40, the last of the team unlucky. */
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

/** A pass that doesn't go to the next person round the ring, and why it may not. */
function offRing(plan: Plan, each: Catch): 'back' | 'stray' | 'hang back' | null {
  if (each.from === null || each.by === next(plan, each.from)) return null;
  if (each.beat === 'crawl' && each.from === plan.three[1] && each.by === plan.three[0]) {
    return 'back';
  }
  if (each.beat === 'last-second' && plan.ending === 'strays') return 'stray';
  if (each.beat === 'last-second' && plan.ending === 'hangs' && each.from === each.by) {
    return 'hang back';
  }
  throw new Error(`${each.from} to ${each.by} at ${each.at} isn't round the ring`);
}

const overlapping = (spots: Spot[]) =>
  spots.some((spot, index) =>
    spots.slice(index + 1).some((other) => overlap(tagBox(spot), tagBox(other))),
  );

/** Everyone in play, then the same with each of them out of play. */
const mixes = (count: number): Spot[][] => {
  const spots = ring(count);
  return [spots, ...spots.map((_, out) => spots.map((s, i) => (i === out ? outOfPlay(s) : s)))];
};

const distance = (one: Point, two: Point) => Math.hypot(one.x - two.x, one.y - two.y);

/** Show seconds per frame of the shared runs: coarse, so they stay quick. */
const STEP = 1 / 20;

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  readonly beat: string;
  /** Who holds the potato; '' while it flies. */
  readonly holder: string;
  readonly sparkler: number;
  readonly moods: Readonly<Record<string, string>>;
  /** How big each head is drawn, 1 their spot's size. */
  readonly scales: Readonly<Record<string, number>>;
  /** Where the potato's centre is drawn. */
  readonly potato: Point;
  readonly potatoShown: boolean;
  /** Whose arms are up. */
  readonly raised: readonly string[];
  readonly confetti: number;
  /** The unlucky person's crown is drawn. */
  readonly crown: boolean;
}

/** Someone catching the potato: who, and when. */
interface Caught {
  readonly holder: string;
  readonly beat: string;
  /** The show seconds of the frame it was caught in. */
  readonly time: number;
}

/** A bubble as it appeared: what it said, its box, and the potato's box then (null while hidden). */
interface Said {
  readonly text: string;
  readonly time: number;
  readonly box: Box;
  readonly potato: Box | null;
}

/** One run of the show, and what it showed. */
interface Run {
  readonly label: string;
  readonly seed: number;
  readonly plan: Plan;
  readonly unlucky: string;
  readonly record: ShowRecord;
  readonly frames: Frame[];
  readonly catches: Caught[];
  readonly bubbles: Said[];
  /** The burst comes before every person on the stage. */
  readonly burstBehind: boolean;
  /** Where the burst's centre is drawn. */
  readonly burstAt: Point;
  /** In the last frame: the unlucky person comes after everyone else, and how many times bigger than just before the pop. */
  readonly inFront: boolean;
  readonly grownScale: number;
  /** Where the unlucky person was drawn, each frame. */
  readonly placed: { time: number; at: string }[];
  /** The smallest any name tag was drawn, in stage pixels, over every frame. */
  readonly smallestTag: number;
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

/**
 * Runs Hot Potato and notes what the stage showed every frame, and every
 * catch. In the laps a catch is passed on at once, so frames alone can miss
 * it: the catches are read from each change of the potato's holder.
 */
async function watch(team: readonly string[], unlucky: string, seed: number, step = STEP) {
  const plan = planShow(team, unlucky, createRandom(seed));
  const frames: Frame[] = [];
  const catches: Caught[] = [];
  const bubbles: Said[] = [];
  const seen = new Set<Element>();
  const placed: { time: number; at: string }[] = [];
  let smallestTag = Infinity;
  let beforePop = 1;
  let end = {
    burstBehind: false,
    burstAt: { x: NaN, y: NaN } as Point,
    inFront: false,
    grownScale: 0,
  };
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts:
    | {
        scene: HTMLElement;
        potato: SVGElement;
        speech: HTMLElement[];
        people: HTMLElement[];
        heads: SVGElement[];
        arms: (Element | null)[];
        them: HTMLElement;
        crown: Element;
        burst: SVGElement;
        tags: HTMLElement[];
        confetti: HTMLElement[];
      }
    | undefined;
  let holder = '';
  /** The last frame's show seconds: a catch is noted while the next frame is drawn. */
  let last = 0;
  const note = (changes: MutationRecord[]) => {
    if (!parts) return;
    const { scene, potato } = parts;
    changes.forEach((_, index) => {
      // Each change names the holder before it; the last one's is the holder now.
      const now = changes[index + 1]?.oldValue ?? potato.dataset.holder ?? '';
      if (now === holder) return;
      holder = now;
      if (now) catches.push({ holder: now, beat: scene.dataset.beat!, time: last + step });
    });
  };
  const holders = new MutationObserver(note);
  let record: ShowRecord;
  try {
    record = await runShow(hotPotato, {
      names: team,
      unlucky,
      seed,
      step,
      onFrame(time, stage) {
        if (!parts) {
          const scene = stage.querySelector<HTMLElement>('[data-part="scene"]')!;
          const people = [...scene.querySelectorAll<HTMLElement>('[data-person]')];
          const them = people.find((person) => person.dataset.person === unlucky)!;
          parts = {
            scene,
            potato: scene.querySelector<SVGElement>('[data-part="potato"]')!,
            speech: [...scene.querySelectorAll<HTMLElement>('[data-part="bubble"]')],
            people,
            heads: people.map((person) => person.querySelector('svg')!),
            arms: people.map((person) => person.querySelector('[data-part="land-arms"]')),
            them,
            crown: them.querySelector('[data-part="crown"]')!,
            burst: scene.querySelector<SVGElement>('[data-part="burst"]')!,
            tags: [...scene.querySelectorAll<HTMLElement>('[data-on="chest"]')],
            confetti: [...scene.querySelectorAll<HTMLElement>('[data-part="confetti"]')],
          };
          holders.observe(parts.potato, {
            attributeFilter: ['data-holder'],
            attributeOldValue: true,
          });
        }
        const { scene, potato, speech, people, heads, arms, them, burst, tags } = parts;
        // Once the show is over, the run empties the stage.
        if (!scene.isConnected) return;
        const centre = {
          x: Number(gsap.getProperty(potato, 'x')) + POTATO.width / 2,
          y: Number(gsap.getProperty(potato, 'y')) + POTATO.height / 2,
        };
        const potatoShown = shown(potato, stage);
        frames.push({
          time,
          beat: scene.dataset.beat!,
          holder: potato.dataset.holder!,
          sparkler: Number(potato.dataset.sparkler),
          moods: Object.fromEntries(
            people.map((person) => [person.dataset.person!, person.dataset.mood!]),
          ),
          scales: Object.fromEntries(
            people.map((person, index) => [
              person.dataset.person!,
              Number(gsap.getProperty(person, 'scale')) *
                Number(gsap.getProperty(heads[index]!, 'scale')),
            ]),
          ),
          potato: centre,
          potatoShown,
          raised: people
            .filter((_, index) => arms[index] && shown(arms[index], stage))
            .map((person) => person.dataset.person!),
          confetti: parts.confetti.filter((bit) => shown(bit, stage)).length,
          crown: shown(parts.crown, stage),
        });
        for (const bubble of speech) {
          if (seen.has(bubble) || bubble.style.visibility === 'hidden') continue;
          if (Number(bubble.style.opacity || 1) === 0) continue;
          seen.add(bubble);
          const scale = Number(gsap.getProperty(potato, 'scale'));
          const anchor = { x: parseFloat(bubble.style.left), y: parseFloat(bubble.style.top) };
          bubbles.push({
            text: bubble.textContent!,
            time,
            box: speechBox(bubble.textContent!, anchor),
            potato: potatoShown ? potatoBox(centre, scale) : null,
          });
        }
        placed.push({ time, at: placement(them, stage) });
        if (scene.dataset.beat !== 'pop') beforePop = Number(gsap.getProperty(them, 'scale'));
        for (const tag of tags) smallestTag = Math.min(smallestTag, drawnTag(tag, stage));
        end = {
          // The burst is 300 px square, placed by its top left corner.
          burstAt: {
            x: parseFloat(burst.style.left) + 150,
            y: parseFloat(burst.style.top) + 150,
          },
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
        };
        last = time;
      },
    });
  } finally {
    // The last catch can still be waiting to be reported.
    note(holders.takeRecords());
    holders.disconnect();
  }
  expect(record.outcome).toBe('finished');
  return {
    label: `${team.length} people, ${plan.ending}, seed ${seed}`,
    seed,
    plan,
    unlucky,
    record,
    frames,
    catches,
    bubbles,
    placed,
    smallestTag,
    ...end,
  } satisfies Run;
}

/** The captions of one run, in order. */
const said = (record: ShowRecord) => record.captions.map((caption) => caption.text);

/** The first seed from 1 whose plan for `team` passes `test`. */
function seedWhere(team: readonly string[], unlucky: string, test: (plan: Plan) => boolean) {
  for (let seed = 1; seed <= 500; seed++) {
    if (test(planShow(team, unlucky, createRandom(seed)))) return seed;
  }
  throw new Error('no seed up to 500');
}

/**
 * The shared runs: Hot Potato at 2, 6 and 12 people, Luca unlucky and last,
 * once with each ending it can have. Run once and read by every scenario
 * that watches the stage.
 */
let lab: Run[];
beforeAll(async () => {
  lab = [];
  for (const count of [2, 6, 12]) {
    for (const ending of ENDINGS) {
      if (count === 2 && ending === 'strays') continue;
      const team = labTeam(count);
      const seed = seedWhere(team, 'Luca', (plan) => plan.ending === ending);
      lab.push(await watch(team, 'Luca', seed));
    }
  }
}, 60_000);

/** The shared run at `count` people with `ending`. */
function labRun(count: number, ending: Ending): Run {
  const run = lab.find((each) => each.plan.ring.length === count && each.plan.ending === ending);
  expect(run, `${count} people, ${ending}`).toBeDefined();
  return run!;
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

  Rule("It pops in the unlucky person's hands", ({ RuleScenarioOutline }) => {
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
          ({ frames } = await watch(team, unlucky, 1, 1 / 10));
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
  });

  Rule('It goes round the ring', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Hand to hand, one way round', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 'Luca');
      });
      Then('each pass goes to the next person round the ring, the same way all show', () => {
        for (const plan of runs) {
          const round = plan.catches.filter((each) => each.from && !offRing(plan, each));
          expect(round.length).toBeGreaterThan(10);
          for (const each of round) expect(each.by).toBe(next(plan, each.from!));
        }
      });
      And('it goes clockwise in some runs, and the other way in others', () => {
        const ways = runs.map((plan) => plan.direction);
        expect(ways).toContain(1);
        expect(ways).toContain(-1);
      });
      And(
        'only "Back!" in the crawl, the stray fling and a hang that drops back onto the thrower break the rule',
        () => {
          // offRing throws on any other pass that breaks it.
          const breaks = runs.flatMap((plan) => plan.catches.map((each) => offRing(plan, each)));
          expect(breaks).toContain('back');
          for (const plan of runs) {
            expect(plan.catches.filter((each) => offRing(plan, each)).length).toBeLessThanOrEqual(
              2,
            );
          }
        },
      );
    });

    RuleScenario('Where it starts gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 'Luca');
      });
      Then("the potato drops into at least 5 different people's hands first", () => {
        expect(new Set(runs.map((plan) => plan.catches[0]!.by)).size).toBeGreaterThanOrEqual(5);
      });
      And('the number of passes before the pop differs between runs', () => {
        expect(new Set(runs.map(passes)).size).toBeGreaterThan(1);
      });
    });

    RuleScenarioOutline(
      'Nobody can count it out, with <count> people',
      ({ Given, When, Then }, variables) => {
        let runs: Plan[];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', () => {
          const count = Number(variables.count);
          runs = plans(count, names(count)[0]!);
        });
        Then('the number of passes before the pop differs between runs', () => {
          expect(new Set(runs.map(passes)).size).toBeGreaterThan(1);
          // Not only the crawl going back: the laps vary too.
          expect(new Set(runs.map((plan) => during(plan, 'laps').length)).size).toBeGreaterThan(1);
        });
      },
    );
  });

  Rule('Phew! The danger closes in', ({ RuleScenario }) => {
    RuleScenario("Who's in the last three gives nothing away", ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When("the show runs with 30 different random seeds, and it doesn't stray", () => {
        runs = plans(8, 'Luca', 30).filter((plan) => plan.ending !== 'strays');
        expect(runs.length).toBeGreaterThan(20);
      });
      Then('the unlucky person is one of the last three, and never says "Phew!"', () => {
        for (const plan of runs) {
          expect(plan.three).toContain('Luca');
          expect(plan.sits.map((each) => each.name)).not.toContain('Luca');
        }
      });
      And(
        'the two who share the last three with them are at least 5 different people across the runs',
        () => {
          const others = runs.flatMap((plan) => plan.three.filter((name) => name !== 'Luca'));
          expect(new Set(others).size).toBeGreaterThanOrEqual(5);
        },
      );
      And(
        'the unlucky person is the second of the three in some runs, and the third in others',
        () => {
          const where = runs.map((plan) => plan.three.indexOf('Luca'));
          expect(where).toContain(1);
          expect(where).toContain(2);
          expect(where).not.toContain(0);
        },
      );
    });
  });

  Rule('The crawl', ({ RuleScenario }) => {
    RuleScenario('Sometimes it goes back', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('6 people', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(6, 'Fabio');
      });
      Then(
        'in some runs the second passes it back to the first, and the first passes it to the second again, each pass 1.5 seconds',
        () => {
          const back = runs.filter((plan) => plan.back);
          expect(back.length).toBeGreaterThan(0);
          for (const plan of back) {
            const [first, second] = plan.three;
            const crawl = during(plan, 'crawl');
            expect(crawl.map((each) => [each.from, each.by])).toEqual([
              [first, second],
              [second, first],
              [first, second],
            ]);
            expect(crawl[1]!.seconds).toBeCloseTo(1.5, 9);
            expect(crawl[2]!.seconds).toBeCloseTo(1.5, 9);
          }
        },
      );
      And("in some runs it doesn't go back", () => {
        const straight = runs.filter((plan) => !plan.back);
        expect(straight.length).toBeGreaterThan(0);
        for (const plan of straight) expect(during(plan, 'crawl')).toHaveLength(1);
      });
    });

    RuleScenario('The heartbeat', ({ Given, When, Then }) => {
      let plan: Plan;
      Given('6 people', () => {});
      When('the show runs', () => {
        plan = planShow(names(6), 'Fabio', createRandom(1));
      });
      Then(
        'the heartbeat starts with "Last lap!" and comes quicker and quicker until the pop',
        () => {
          // Sound isn't recorded: play.ts cues a heartbeat at each of these.
          const { heartbeats } = plan;
          expect(heartbeats.length).toBeGreaterThan(5);
          expect(heartbeats[0]).toBeCloseTo(startOf(plan, 'last-lap'), 9);
          expect(heartbeats.at(-1)!).toBeLessThan(startOf(plan, 'pop'));
          const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
          expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
          gaps.slice(1).forEach((gap, index) => {
            expect(gap).toBeLessThanOrEqual(gaps[index]! + 1e-9);
            expect(gap).toBeGreaterThanOrEqual(0.4 - 1e-9);
          });
        },
      );
    });
  });

  Rule('Once in a while it strays', ({ RuleScenario }) => {
    RuleScenario('About 1 in 8', ({ Given, When, Then, And }) => {
      let strays: Plan[];
      Given('6 people', () => {});
      When('the show runs with 400 different random seeds', () => {
        strays = plans(6, 'Fabio', 400).filter((plan) => plan.ending === 'strays');
      });
      Then('it strays in between 1 in 12 and 1 in 6 runs', () => {
        expect(strays.length).toBeGreaterThanOrEqual(400 / 12);
        expect(strays.length).toBeLessThanOrEqual(400 / 6);
      });
      And(
        'the unlucky person is the first of the last three in some of those runs, and sat down in the last lap in others',
        () => {
          const where = strays.map((plan) => {
            const sat = plan.sits.find((each) => each.name === 'Fabio');
            expect(sat).toBeDefined();
            expect(plan.three.slice(1)).not.toContain('Fabio');
            if (plan.three[0] === 'Fabio') return 'first';
            expect(sat!.at).toBeLessThanOrEqual(startOf(plan, 'crawl') + 1e-9);
            return 'last lap';
          });
          expect(where).toContain('first');
          expect(where).toContain('last lap');
        },
      );
    });

    RuleScenario('With 2 people it never strays', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('2 people', () => {});
      When('the show runs with 40 different random seeds', () => {
        runs = plans(2, 'Anna', 40);
      });
      Then('it never strays', () => {
        for (const plan of runs) expect(plan.ending).not.toBe('strays');
      });
    });
  });

  Rule('The ending is a pop and a paper crown', ({ RuleScenario }) => {
    RuleScenario('The pop', ({ Given, When, Then, And }) => {
      let run: Run;
      let pop: Frame[];
      Given('the unlucky person is "Luca"', () => {});
      When('the potato pops on "Luca"', () => {
        run = labRun(6, 'too-hot');
        pop = run.frames.filter((frame) => frame.beat === 'pop');
      });
      Then('it pops into confetti', () => {
        expect(pop.some((frame) => frame.confetti > 10)).toBe(true);
        expect(pop.some((frame) => frame.potatoShown)).toBe(false);
      });
      And('"Luca" gets a paper crown and celebrates', () => {
        expect(pop.some((frame) => frame.crown)).toBe(true);
        expect(run.frames.at(-1)!.moods.Luca).toBe('party');
      });
      And('everyone else cheers', () => {
        for (const name of run.plan.ring.filter((each) => each !== 'Luca')) {
          expect(run.frames.at(-1)!.moods[name], name).toBe('happy');
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      Given('the unlucky person is "Luca"', () => {});
      When('the show runs', () => {});
      Then('"Luca" is on stage, not moving, for the last 1.5 seconds', () => {
        for (const { label, record, placed } of lab) {
          const last = placed.filter((each) => each.time >= record.duration - 1.5);
          expect(last.length, label).toBeGreaterThan(1.5 / STEP - 2);
          for (const each of last) expect(each.at, label).toBe(last[0]!.at);
        }
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
            const spot = ring(plan.ring.length)[plan.ring.indexOf(unlucky)]!;
            const pop = bubbles.find((each) => each.text === 'Pop!')!;
            expect(pop, label).toBeDefined();
            expect(overlap(pop.box, headBox(spot)), label).toBe(false);
            expect(overlap(pop.box, crowned(spot).head), label).toBe(false);
          }
        },
      );
      And('"It popped on Luca!" is up within 0.2 seconds of the pop', () => {
        for (const { label, plan, record } of lab) {
          const popped = record.captions.find((each) => each.text === 'It popped on Luca!');
          expect(popped, label).toBeDefined();
          expect(popped!.from - startOf(plan, 'pop'), label).toBeLessThanOrEqual(0.2 + STEP + 1e-9);
        }
      });
    });
  });

  Rule('About 20 seconds at 6 people', ({ RuleScenario }) => {
    RuleScenario('Each part takes about this long at 6 people', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('6 people', () => {});
      When('the show runs, with and without going back', () => {
        runs = plans(6, 'Fabio', 40);
        expect(runs.some((plan) => plan.back)).toBe(true);
        expect(runs.some((plan) => !plan.back)).toBe(true);
      });
      Then(
        'its parts take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          const part: Record<string, Beat> = {
            plop: 'plop',
            laps: 'laps',
            'last lap': 'last-lap',
            crawl: 'crawl',
            'the last second': 'last-second',
            'the pop': 'pop',
          };
          for (const row of table) {
            for (const plan of runs) {
              const cell = row[plan.back ? 'going back' : 'without going back']!;
              const [low, high = low] = cell.split(' to ').map(Number) as [number, number?];
              const seconds = plan.beats[part[row.part!]!];
              expect(seconds, `${row.part}`).toBeGreaterThanOrEqual(low - 0.3 - 1e-9);
              expect(seconds, `${row.part}`).toBeLessThanOrEqual(high + 0.3 + 1e-9);
            }
          }
        },
      );
    });

    RuleScenario('Every head count lands inside its bounds', ({ When, Then, And }) => {
      let runs: ReturnType<typeof everyPlan>;
      When('the show runs at every head count from 2 to 12, with and without going back', () => {
        runs = everyPlan();
        for (let count = 3; count <= 12; count++) {
          const back = runs
            .filter(({ plan }) => plan.ring.length === count)
            .map(({ plan }) => plan.back);
          expect(back, `${count} people`).toContain(true);
          expect(back, `${count} people`).toContain(false);
        }
      });
      Then('each run lasts between 13 and 28 seconds', () => {
        for (const { label, plan } of runs) {
          expect(total(plan), label).toBeGreaterThanOrEqual(13);
          expect(total(plan), label).toBeLessThanOrEqual(28);
        }
      });
      And('at 4 to 7 people, each run lasts between 14.5 and 23.5 seconds', () => {
        for (const { label, plan } of runs) {
          if (plan.ring.length < 4 || plan.ring.length > 7) continue;
          expect(total(plan), label).toBeGreaterThanOrEqual(14.5);
          expect(total(plan), label).toBeLessThanOrEqual(23.5);
        }
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      When('the show runs', () => {});
      Then('every caption stays on screen for at least 1 second', () => {
        for (const { label, record } of lab) {
          expect(record.captions.length, label).toBeGreaterThan(5);
          for (const caption of record.captions) {
            expect(caption.to - caption.from, `${label}: ${caption.text}`).toBeGreaterThanOrEqual(
              1 - 1e-9,
            );
          }
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
        for (const { label, smallestTag } of lab) {
          expect(smallestTag, label).toBeGreaterThanOrEqual(22);
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

describe('The plan', () => {
  const all = everyPlan();

  it('the catches add up, and nobody passes to themselves but a hang dropping back', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.at, label).toBeCloseTo(previous + each.seconds, 9);
        expect(each.thrown, label).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(each.thrown, label).toBeLessThan(each.at);
        if (each.from === each.by) expect(offRing(plan, each), label).toBe('hang back');
      });
    }
  });

  it('the potato is on the unlucky person at the pop', () => {
    for (const { label, plan, unlucky } of all) {
      const last = plan.catches.at(-1)!;
      expect(last.by, label).toBe(unlucky);
      if (plan.ending === 'holding-on') expect(last.beat, label).toBe('crawl');
      else expect(last.at, label).toBeCloseTo(startOf(plan, 'pop'), 9);
    }
  });

  it('the laps go round at least once, a pass every 0.45 s, and vary at every head count', () => {
    for (let count = 2; count <= 12; count++) {
      const runs = all.filter(({ plan }) => plan.ring.length === count);
      const laps = runs.map(({ plan }) => during(plan, 'laps'));
      expect(new Set(laps.map((each) => each.length)).size, `${count} people`).toBeGreaterThan(1);
      for (const [index, passes] of laps.entries()) {
        const { label } = runs[index]!;
        expect(passes.length, label).toBeGreaterThanOrEqual(Math.max(8, count));
        for (const each of passes) {
          // The first comes from the plop's catch, which waits for the laps.
          if (each !== passes[0]) expect(each.seconds, label).toBeCloseTo(0.45, 9);
          expect(flight(each), label).toBeCloseTo(0.45, 9);
        }
      }
    }
  });

  it('the last lap slows from 0.8 to 1.8 s, squeezed to 7 s, each catcher holding it a moment', () => {
    for (const { label, plan } of all) {
      const count = plan.ring.length;
      const lap = during(plan, 'last-lap');
      expect(lap.length, label).toBe(count === 2 ? 1 : count - 2);
      const seconds = lap.map((each) => each.seconds);
      if (lap.length === 1) expect(seconds[0], label).toBeCloseTo(1.2, 9);
      else if (count <= 7) {
        expect(seconds[0], label).toBeCloseTo(0.8, 9);
        expect(seconds.at(-1), label).toBeCloseTo(1.8, 9);
      } else {
        expect(plan.beats['last-lap'], label).toBeCloseTo(7, 9);
      }
      seconds.slice(1).forEach((each, index) => {
        expect(each, label).toBeGreaterThan(seconds[index]!);
      });
      for (const each of lap) {
        expect(flight(each), label).toBeGreaterThanOrEqual(0.4 - 1e-9);
        expect(flight(each), label).toBeLessThanOrEqual(0.6 + 1e-9);
        if (each.seconds > 0.45) expect(each.seconds - flight(each), label).toBeGreaterThan(0);
      }
      // It ends with the first of the three.
      expect(lap.at(-1)!.by, label).toBe(plan.three[0]);
    }
  });

  it('the last three stand next to each other round the ring', () => {
    for (const { label, plan } of all) {
      const [first, second, third] = plan.three;
      expect(next(plan, first), label).toBe(second);
      expect(next(plan, second), label).toBe(third);
      expect(plan.catches[0]!.by, label).toBe(
        next(plan, first, -(during(plan, 'laps').length + during(plan, 'last-lap').length)),
      );
    }
  });

  it('whoever passes it on in the last lap sits as it lands, but the first, and the first of the three last', () => {
    for (const { label, plan } of all) {
      const count = plan.ring.length;
      if (count === 2) {
        expect(plan.sits, label).toEqual([]);
        continue;
      }
      const lap = during(plan, 'last-lap');
      const wanted = [
        ...lap.slice(1).map((each) => ({ name: each.from!, at: each.at })),
        { name: plan.three[0], at: startOf(plan, 'last-second') },
      ];
      expect(plan.sits.length, label).toBe(count - 2);
      plan.sits.forEach((each, index) => {
        expect(each.name, label).toBe(wanted[index]!.name);
        expect(each.at, label).toBeCloseTo(wanted[index]!.at, 9);
      });
      // Everyone but the last two standing.
      expect(new Set(plan.sits.map((each) => each.name)).size, label).toBe(count - 2);
      expect(
        plan.sits.map((each) => each.name),
        label,
      ).not.toContain(plan.three[1]);
      expect(
        plan.sits.map((each) => each.name),
        label,
      ).not.toContain(plan.three[2]);
    }
  });

  it('the crawl takes 2 s, or 5 s going back, and never goes back with 2 people', () => {
    for (const { label, plan } of all) {
      expect(plan.beats.crawl, label).toBeCloseTo(plan.back ? 5 : 2, 9);
      expect(during(plan, 'crawl')[0]!.seconds, label).toBeCloseTo(2, 9);
      if (plan.ring.length === 2) expect(plan.back, label).toBe(false);
    }
  });

  it('each ending puts the unlucky person where it needs them', () => {
    for (const { label, plan, unlucky } of all) {
      const [first, second, third] = plan.three;
      const last = plan.catches.at(-1)!;
      if (plan.ending === 'holding-on') expect(second, label).toBe(unlucky);
      if (plan.ending === 'too-hot') {
        expect(third, label).toBe(unlucky);
        expect(last.from, label).toBe(second);
      }
      if (plan.ending === 'hangs') {
        expect([second, third], label).toContain(unlucky);
        expect(last.from, label).toBe(second);
      }
      if (plan.ending === 'strays') {
        expect([second, third], label).not.toContain(unlucky);
        expect(
          plan.sits.map((each) => each.name),
          label,
        ).toContain(unlucky);
        expect(last.from, label).toBe(second);
      }
      // With 2 people the third is the first.
      if (plan.ending !== 'strays' && plan.ring.length > 2) expect(first, label).not.toBe(unlucky);
    }
  });

  it('the last second fits', () => {
    for (const { label, plan } of all) {
      const L = startOf(plan, 'last-second');
      const P = startOf(plan, 'pop');
      expect(plan.lastSpark, label).toBeGreaterThan(L);
      expect(plan.lastSpark, label).toBeLessThan(P);
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(L);
      expect(plan.still.to, label).toBeLessThanOrEqual(P - 0.4 + 1e-9);
    }
  });
});

describe('The ring', () => {
  /** How far `box` stays from the face at `spot`: more than 0 when it's off the face. */
  const offFace = (box: Box, spot: Spot) => {
    const { x, y, r } = face(spot);
    const near = {
      x: Math.min(box.right, Math.max(box.left, x)),
      y: Math.min(box.bottom, Math.max(box.top, y)),
    };
    return Math.hypot(near.x - x, near.y - y) - r;
  };

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
        expect(offFace(box, spot), label).toBeGreaterThan(0);
        expect(box.top - scale * POTATO.above, label).toBeGreaterThanOrEqual(SKY);
        expect(box.left, label).toBeGreaterThanOrEqual(0);
        expect(box.right, label).toBeLessThanOrEqual(1280);
        expect(box.bottom, label).toBeLessThanOrEqual(720);
      }
    }
  });

  /** The top of the potato's drawing, a full sparkler included, centred at `point`. */
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
          // Nobody throws to themselves: a throw that comes back hangs (below).
          if (i === j) continue;
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

  it('the hang stays out of the sky', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = count === 2 ? POTATO.pairScale : 1;
      for (const pair of count === 2 ? [[0, 1] as [number, number]] : pairs(count)) {
        const spots = duelLayout(count, pair);
        const two = pair.map((index) => held(spots[index]!, scale)) as [Point, Point];
        const middle = (two[0].x + two[1].x) / 2;
        for (const [from, to] of [
          [two[0], two[1]],
          [two[1], two[0]],
          [two[0], two[0]],
          [two[1], two[1]],
        ] as const) {
          const label = `${count} people, pair ${pair.join(' and ')}, ${from.x} to ${to.x}`;
          const { rise, top, drop } = hang(from, to, two, scale);
          expect(Math.abs(top.x - middle), label).toBeLessThanOrEqual(100);
          expect(rise[0], label).toEqual(from);
          expect(rise[3], label).toEqual(top);
          expect(drop[0], label).toEqual(top);
          expect(drop[3], label).toEqual(to);
          // Level at the top.
          expect(rise[2].y, label).toBeCloseTo(top.y, 9);
          expect(drop[1].y, label).toBeCloseTo(top.y, 9);
          for (const path of [rise, drop]) {
            for (let step = 0; step <= 24; step++) {
              const point = bezier(step / 24, ...path);
              expect(drawingTop(point, scale), label).toBeGreaterThanOrEqual(SKY - 1e-6);
              expect(point.y, label).toBeGreaterThanOrEqual(top.y - 1e-6);
            }
          }
        }
      }
    }
  });

  it('raised stays out of the sky and off the face', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = count === 2 ? POTATO.pairScale : 1;
      for (const pair of count === 2 ? [[0, 1] as [number, number]] : pairs(count)) {
        const spots = duelLayout(count, pair);
        for (const index of pair) {
          const label = `${count} people, pair ${pair.join(' and ')}, ${index}`;
          const spot = spots[index]!;
          const point = raised(spot, scale);
          const box = potatoBox(point, scale);
          expect(offFace(box, spot), label).toBeGreaterThan(0);
          expect(drawingTop(point, scale), label).toBeGreaterThanOrEqual(SKY - 1e-6);
          expect(point.y, label).toBeLessThan(held(spot, scale).y);
          expect(box.left, label).toBeGreaterThanOrEqual(0);
          expect(box.right, label).toBeLessThanOrEqual(1280);
        }
      }
    }
  });

  it("the wind-up never covers the holder's face", () => {
    for (let count = 2; count <= 12; count++) {
      const scale = count === 2 ? POTATO.pairScale : 1;
      for (const pair of count === 2 ? [[0, 1] as [number, number]] : pairs(count)) {
        const spots = duelLayout(count, pair);
        for (const index of pair) {
          const label = `${count} people, pair ${pair.join(' and ')}, ${index}`;
          const spot = spots[index]!;
          const path = windUp(spot, scale);
          expect(path[0], label).toEqual(held(spot, scale));
          expect(path[3], label).toEqual(raised(spot, scale));
          for (let step = 0; step <= 20; step++) {
            const box = potatoBox(bezier(step / 20, ...path), scale);
            expect(offFace(box, spot), `${label}, t ${step / 20}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("the duel's pair is big", () => {
    expect(duelLayout(2, [0, 1])).toEqual(ring(2));
    expect(duelMove(2, [0, 1], 0.5).map((each) => each.spot)).toEqual(ring(2));
  });
});

describe('The stage', () => {
  it('plays the plan for its seed', () => {
    for (const { label, plan, catches } of lab) {
      expect(
        catches.map((each) => each.holder),
        label,
      ).toEqual(plan.catches.map((each) => each.by));
    }
  });

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

  it('everyone cheers at the end, arms up', () => {
    for (const { label, plan, unlucky, frames } of lab) {
      const last = frames.at(-1)!;
      for (const name of plan.ring) {
        expect(last.moods[name], `${label}: ${name}`).toBe(name === unlucky ? 'party' : 'happy');
      }
      expect([...last.raised].sort(), label).toEqual([...plan.ring].sort());
    }
  });

  it('the pop bursts where the potato is', () => {
    for (const { label, frames, burstAt } of lab) {
      const pop = frames.find((frame) => frame.beat === 'pop')!;
      expect(distance(pop.potato, burstAt), label).toBeLessThanOrEqual(10);
    }
  });

  it('the captions go up in the story’s order', () => {
    for (const { label, record } of lab) {
      const lines = said(record);
      expect(lines[0], label).toBe("Don't be holding it when it pops!");
      expect(lines.at(-1), label).toBe('It popped on Luca!');
    }
  });
});
