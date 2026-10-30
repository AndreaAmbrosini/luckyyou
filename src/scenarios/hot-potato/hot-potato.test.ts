import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { beforeAll, describe, expect, it } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { speechBox } from '../../scenario-kit';
import hotPotato from './index';
import {
  apart,
  besideHead,
  bezier,
  CAPTION,
  crowned,
  face,
  grown,
  hang,
  headBox,
  held,
  heldOut,
  nameBox,
  overlap,
  POTATO,
  potatoBox,
  ring,
  sittingHead,
  SKY,
  throwPath,
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
const next_ = (plan: Plan, name: string) => next(plan, name);
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
    spots.slice(index + 1).some((other) => overlap(nameBox(spot), nameBox(other))),
  );

/** Everyone standing, then the same with each three neighbours grown, as the last three. */
const mixes = (count: number): Spot[][] => {
  const spots = ring(count);
  if (count === 2) return [spots];
  const three = (k: number) => [k, k + 1, k + 2].map((index) => mod(index, count));
  return [
    spots,
    ...spots.map((_, k) => spots.map((spot, i) => (three(k).includes(i) ? grown(spot) : spot))),
  ];
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
  /** Who is sitting down. */
  readonly sitting: readonly string[];
  /** How big each person is drawn, name tag and all, and their head within that. */
  readonly bodies: Readonly<Record<string, number>>;
  readonly heads: Readonly<Record<string, { readonly scale: number; readonly y: number }>>;
  /** How far each person is moved sideways from their spot: a shake. */
  readonly xs: Readonly<Record<string, number>>;
  /** What's left of the fuse, whether it's drawn, and how big its spark is drawn. */
  readonly fuse: { readonly left: number; readonly shown: boolean; readonly spark: number };
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
  /** The fuse comes before every person on the stage. */
  readonly fuseBehind: boolean;
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
async function watch(
  team: readonly string[],
  unlucky: string,
  seed: number,
  step = STEP,
  reducedMotion = false,
) {
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
    fuseBehind: false,
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
        fuse: HTMLElement;
        fuseSpark: SVGElement;
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
      reducedMotion,
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
            fuse: scene.querySelector<HTMLElement>('[data-part="fuse"]')!,
            fuseSpark: scene.querySelector<SVGElement>('[data-part="fuse-spark"]')!,
          };
          holders.observe(parts.potato, {
            attributeFilter: ['data-holder'],
            attributeOldValue: true,
          });
        }
        const { scene, potato, speech, people, heads, arms, them, burst, tags, fuse } = parts;
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
          sitting: people
            .filter((person) => person.dataset.sitting === 'true')
            .map((person) => person.dataset.person!),
          bodies: Object.fromEntries(
            people.map((person) => [
              person.dataset.person!,
              Number(gsap.getProperty(person, 'scale')),
            ]),
          ),
          heads: Object.fromEntries(
            people.map((person, index) => [
              person.dataset.person!,
              {
                scale: Number(gsap.getProperty(heads[index]!, 'scale')),
                y: Number(gsap.getProperty(heads[index]!, 'y')),
              },
            ]),
          ),
          xs: Object.fromEntries(
            people.map((person) => [person.dataset.person!, Number(gsap.getProperty(person, 'x'))]),
          ),
          fuse: {
            left: Number(parts.fuse.dataset.left),
            shown: shown(parts.fuse, stage),
            spark: Number(gsap.getProperty(parts.fuseSpark, 'scale')),
          },
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
          fuseBehind: people.every(
            (person) =>
              (fuse.compareDocumentPosition(person) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
          ),
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

/** Whether `lines` appear in `texts` in this order, not necessarily next to each other. */
function inOrder(texts: readonly string[], lines: readonly string[]): boolean {
  let next = 0;
  for (const text of texts) if (text === lines[next]) next++;
  return next === lines.length;
}

/** The caption a second before the pop, for each ending. */
const ENDING_CAPTION: Readonly<Record<Ending, string>> = {
  'holding-on': 'Pass it!',
  'too-hot': 'Too hot!',
  hangs: 'Which way…?',
  strays: 'Too hot!',
};

/**
 * 6 people, Fabio unlucky, and Carla, Fabio and Ben the last three: run
 * once, holding on after going back, and shared by the scenarios that read
 * its captions.
 */
let fabioShow: Promise<Run> | undefined;
function fabioRun() {
  fabioShow ??= (async () => {
    const team = names(6);
    const seed = seedWhere(
      team,
      'Fabio',
      (plan) =>
        plan.three.join() === 'Carla,Fabio,Ben' && plan.back && plan.ending === 'holding-on',
      3000,
    );
    return watch(team, 'Fabio', seed, 1 / 10);
  })();
  return fabioShow;
}

/** The first seed from 1 whose plan for `team` passes `test`. */
function seedWhere(
  team: readonly string[],
  unlucky: string,
  test: (plan: Plan) => boolean,
  most = 500,
) {
  for (let seed = 1; seed <= most; seed++) {
    if (test(planShow(team, unlucky, createRandom(seed)))) return seed;
  }
  throw new Error(`no seed up to ${most}`);
}

/**
 * The shared runs: Hot Potato at 2, 3, 6 and 12 people, Luca unlucky and
 * last, once with each ending it can have (but the stray at 3). Run once and read by every scenario
 * that watches the stage.
 */
let lab: Run[];
beforeAll(async () => {
  lab = [];
  for (const count of [2, 3, 6, 12]) {
    for (const ending of ENDINGS) {
      if (count <= 3 && ending === 'strays') continue;
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

/** The frames of `run` from `from` up to, not including, `to` show seconds. */
const between = (run: Run, from: number, to = Infinity) =>
  run.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);

/** The first frame of `run` at or after `time`. */
const frameAt = (run: Run, time: number) => run.frames.find((frame) => frame.time >= time - 1e-9)!;

/** Where `name` stands in `run` at `time`, as big as they are then. */
function standing(run: Pick<Run, 'plan'>, name: string, time: number): Spot {
  const { plan } = run;
  const spot = ring(plan.ring.length)[plan.ring.indexOf(name)]!;
  const three = plan.ring.length > 2 && plan.three.includes(name);
  return three && time >= startOf(plan, 'crawl') ? grown(spot) : spot;
}

/**
 * The longest run of `frames` in which the potato stays inside a box `reach`
 * px across, corner to corner.
 */
function stillest(frames: readonly Frame[], reach = 20): Frame[] {
  let best: Frame[] = [];
  frames.forEach((_, start) => {
    const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (let end = start; end < frames.length; end++) {
      const { x, y } = frames[end]!.potato;
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
      if (Math.hypot(box.right - box.left, box.bottom - box.top) > reach) break;
      if (end + 1 - start > best.length) best = frames.slice(start, end + 1);
    }
  });
  return best;
}

/** A "Whoa!" bubble's box, and the flinger's head and the potato in their hands then. */
interface Whoa {
  readonly label: string;
  readonly box: Box;
  readonly head: Box;
  readonly potato: Box;
}

/** The "Whoa!" in `run`, as the stage showed it. */
function whoaIn(run: Run): Whoa {
  const fling = run.plan.catches.at(-1)!;
  const whoa = run.bubbles.find((each) => each.text === 'Whoa!');
  expect(whoa, run.label).toBeDefined();
  expect(whoa!.potato, run.label).not.toBeNull();
  return {
    label: run.label,
    box: whoa!.box,
    head: headBox(standing(run, run.plan.three[1], fling.thrown)),
    potato: whoa!.potato!,
  };
}

/** Where the "Whoa!" goes when `plan` strays, from the plan and the layout alone. */
function whoaFor(plan: Plan, label: string): Whoa {
  const thrown = plan.catches.at(-1)!.thrown;
  const flinger = standing({ plan }, plan.three[1], thrown);
  const names = plan.ring.map((name) => nameBox(standing({ plan }, name, thrown)));
  const potato = potatoBox(held(flinger, 1, names), 1);
  const head = headBox(flinger);
  const anchor = besideHead('Whoa!', head, nameBox(flinger), names, [potato]);
  expect(anchor, label).not.toBeNull();
  return { label, box: speechBox('Whoa!', anchor!), head, potato };
}

/** When a "Phew!" bubble went up for someone sitting down at `time`. */
const phewAt = (run: Run, time: number) =>
  run.bubbles.find((each) => each.text === 'Phew!' && Math.abs(each.time - time) <= 2 * STEP);

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

    RuleScenario('Fast laps, then slower and slower', ({ Given, When, Then, And }) => {
      let run: Run;
      Given('6 people', () => {});
      When('the show runs', () => {
        run = labRun(6, 'holding-on');
      });
      Then('after the plop it goes round at least once, a pass every 0.45 seconds', () => {
        const laps = during(run.plan, 'laps');
        expect(laps.length).toBeGreaterThanOrEqual(6);
        expect(laps[0]!.thrown).toBeCloseTo(startOf(run.plan, 'laps'), 9);
        for (const each of laps) expect(flight(each)).toBeCloseTo(0.45, 9);
      });
      And(
        'from "Last lap!" each pass takes longer than the one before, from 0.8 to 1.8 seconds',
        () => {
          const up = run.record.captions.find((each) => each.text === 'Last lap!')!;
          expect(up.from - startOf(run.plan, 'last-lap')).toBeLessThanOrEqual(STEP + 1e-9);
          const seconds = during(run.plan, 'last-lap').map((each) => each.seconds);
          expect(seconds).toHaveLength(4);
          expect(seconds[0]).toBeCloseTo(0.8, 9);
          expect(seconds.at(-1)).toBeCloseTo(1.8, 9);
          seconds.slice(1).forEach((each, index) => expect(each).toBeGreaterThan(seconds[index]!));
        },
      );
      And('from "Last lap!" whoever catches it holds it a moment before passing it on', () => {
        const catches = [...during(run.plan, 'last-lap'), ...during(run.plan, 'crawl')];
        catches.slice(0, -1).forEach((each, index) => {
          const passed = catches[index + 1]!.thrown;
          const holding = between(run, each.at + STEP, passed).filter(
            (frame) => frame.holder === each.by,
          );
          // Held from the catch until it's passed on: the frames in between.
          expect(holding.length, each.by).toBeGreaterThanOrEqual(
            Math.floor((passed - each.at) / STEP) - 2,
          );
        });
      });
      And('whoever is next in line looks scared until it reaches them', () => {
        const from = startOf(run.plan, 'last-lap');
        const to = startOf(run.plan, 'last-second');
        let flying = '';
        for (const frame of between(run, from, to)) {
          // In flight, it's on its way to whoever had it coming.
          const next = frame.holder ? next_(run.plan, frame.holder) : flying;
          if (frame.holder) flying = next;
          expect(frame.moods[next], `${next} at ${frame.time}`).toBe('scared');
        }
      });
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
    RuleScenario("Safe once it won't come back", ({ Given, When, Then, And }) => {
      let run: Run;
      let from: number;
      let lapSits: { name: string; at: number }[];
      Given('6 people', () => {});
      When('the last lap starts', () => {
        run = labRun(6, 'holding-on');
        from = startOf(run.plan, 'last-lap');
        lapSits = run.plan.sits.filter((each) => each.at <= startOf(run.plan, 'crawl') + 1e-9);
      });
      Then('the caption is "Last lap!"', () => {
        const up = run.record.captions.find((each) => each.text === 'Last lap!')!;
        expect(up.from - from).toBeLessThanOrEqual(STEP + 1e-9);
      });
      And('nobody has sat down before it', () => {
        for (const frame of between(run, 0, from)) expect(frame.sitting).toEqual([]);
      });
      And(
        'from then on, whoever passes it on says "Phew!" and sits down as it lands, except whoever passes first',
        () => {
          const lap = during(run.plan, 'last-lap');
          expect(lapSits.map((each) => each.name)).toEqual(lap.slice(1).map((each) => each.from));
          expect(lapSits).toHaveLength(3);
          for (const { name, at } of lapSits) {
            expect(between(run, from, at).some((frame) => frame.sitting.includes(name))).toBe(
              false,
            );
            expect(frameAt(run, at).sitting, name).toContain(name);
            expect(phewAt(run, at), name).toBeDefined();
          }
          const passer = lap[0]!.from!;
          for (const frame of run.frames) expect(frame.sitting).not.toContain(passer);
        },
      );
      And(
        'sitting down, their head shrinks and drops towards their name tag, which keeps its size',
        () => {
          for (const { name, at } of lapSits) {
            const size = ring(6)[run.plan.ring.indexOf(name)]!.size;
            for (const frame of between(run, at + 0.4 + STEP, startOf(run.plan, 'pop'))) {
              expect(frame.heads[name]!.scale, name).toBeCloseTo(0.72, 3);
              expect(frame.heads[name]!.y, name).toBeCloseTo(0.12 * size, 1);
              expect(frame.bodies[name], name).toBe(1);
            }
          }
        },
      );
      And('they look happy and stay sitting until the pop', () => {
        for (const { name, at } of lapSits) {
          for (const frame of between(run, at, startOf(run.plan, 'pop'))) {
            expect(frame.sitting, `${name} at ${frame.time}`).toContain(name);
            expect(frame.moods[name], `${name} at ${frame.time}`).toBe('happy');
          }
        }
      });
    });

    RuleScenario('The last three standing', ({ Given, When, Then, And }) => {
      let run: Run;
      let frame: Frame;
      Given('6 people', () => {});
      When('the last lap ends', () => {
        run = labRun(6, 'holding-on');
        frame = frameAt(run, startOf(run.plan, 'crawl'));
      });
      Then(
        '3 people are standing, next to each other round the ring, the potato with the first of them',
        () => {
          const standing = run.plan.ring.filter((name) => !frame.sitting.includes(name));
          expect([...standing].sort()).toEqual([...run.plan.three].sort());
          const [first, second, third] = run.plan.three;
          expect(next(run.plan, first)).toBe(second);
          expect(next(run.plan, second)).toBe(third);
          expect(frame.holder).toBe(first);
        },
      );
      And('the three grow to 1.2 times their size, name tags and all', () => {
        for (const later of between(run, frame.time + 0.4 + STEP, startOf(run.plan, 'pop'))) {
          for (const name of run.plan.three) {
            expect(later.bodies[name], `${name} at ${later.time}`).toBeCloseTo(1.2, 3);
          }
        }
      });
      And('everyone else is sitting down', () => {
        const others = run.plan.ring.filter((name) => !run.plan.three.includes(name));
        expect([...frame.sitting].sort()).toEqual([...others].sort());
      });
    });

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

    RuleScenario('"Phew!" beside them, wherever they sit', ({ When, Then }) => {
      let runs: Run[];
      When('the show runs at 3, at 6 and at 12 people', () => {
        runs = lab.filter((run) => run.plan.ring.length >= 3);
      });
      Then('each "Phew!" is within 60 pixels of the head of whoever says it', () => {
        let seen = 0;
        for (const run of runs) {
          for (const { name, at } of run.plan.sits) {
            const phew = phewAt(run, at);
            expect(phew, `${run.label}: ${name}`).toBeDefined();
            seen++;
            const head = sittingHead(standing(run, name, at));
            expect(apart(phew!.box, head), `${run.label}: ${name}`).toBeLessThanOrEqual(60);
          }
        }
        expect(seen).toBeGreaterThan(0);
      });
    });
  });

  Rule('The crawl', ({ RuleScenario }) => {
    RuleScenario('From the first of the three to the second', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('6 people', () => {});
      When('the crawl starts', () => {
        runs = lab.filter((run) => run.plan.ring.length === 6);
        expect(runs.some((run) => run.plan.back)).toBe(true);
        expect(runs.some((run) => !run.plan.back)).toBe(true);
      });
      Then('the potato takes 2 seconds to go from the first of the three to the second', () => {
        for (const { label, plan, catches } of runs) {
          const crawl = during(plan, 'crawl')[0]!;
          expect(crawl.seconds, label).toBeCloseTo(2, 9);
          const caught = catches.find(
            (each) => each.holder === plan.three[1] && each.time > startOf(plan, 'crawl'),
          )!;
          expect(caught.time - startOf(plan, 'crawl'), label).toBeCloseTo(2, 1);
        }
      });
      And(
        'the first says "Phew!" and sits down when it reaches the second for the last time',
        () => {
          for (const run of runs) {
            const { label, plan } = run;
            const reached = during(plan, 'crawl').at(-1)!.at;
            expect(reached, label).toBeCloseTo(startOf(plan, 'last-second'), 9);
            const first = plan.three[0];
            expect(between(run, 0, reached).some((frame) => frame.sitting.includes(first))).toBe(
              false,
            );
            expect(frameAt(run, reached).sitting, label).toContain(first);
            expect(phewAt(run, reached), label).toBeDefined();
          }
        },
      );
    });

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

  Rule('The last second, from the second of the three', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'The last second in the ring, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let runs: Plan[];
        Given('<count> people', () => {
          count = Number(variables.count);
        });
        When('the show runs with 40 different random seeds', () => {
          runs = plans(count, 'Luca', 40, labTeam(count));
          for (const ending of ['holding-on', 'too-hot', 'hangs'] as const) {
            expect(
              runs.some((plan) => plan.ending === ending),
              ending,
            ).toBe(true);
          }
        });
        Then(
          "in some runs they're holding on: the second of the three is the unlucky person, holds it out towards the third, hesitates, leans in, and it pops before they let go",
          () => {
            for (const plan of runs.filter((each) => each.ending === 'holding-on')) {
              expect(plan.three[1]).toBe('Luca');
            }
            const run = labRun(count, 'holding-on');
            const { label, plan, catches } = run;
            const L = startOf(plan, 'last-second');
            const P = startOf(plan, 'pop');
            const second = standing(run, plan.three[1], L);
            const third = standing(run, plan.three[2], L);
            for (const frame of between(run, L + STEP, P)) {
              expect(frame.holder, `${label} at ${frame.time}`).toBe('Luca');
              expect(frame.raised, `${label} at ${frame.time}`).toContain('Luca');
            }
            // Held out on the third's side, still while they hesitate.
            const still = between(run, plan.still.from + STEP, plan.still.to);
            expect(still.length, label).toBeGreaterThan(5);
            const out = still[0]!.potato;
            const side = Math.sign(third.x - second.x) || (second.x > 640 ? -1 : 1);
            expect(Math.sign(out.x - second.x), label).toBe(side);
            for (const frame of still) expect(distance(frame.potato, out), label).toBeLessThan(2);
            // Leaning in towards the third when it pops.
            const end = between(run, plan.still.to, P).at(-1)!.potato;
            expect(distance(end, out), label).toBeGreaterThan(20);
            expect(distance(end, out), label).toBeLessThanOrEqual(60);
            expect(Math.abs(end.x - third.x), label).toBeLessThan(Math.abs(out.x - third.x));
            // Nobody catches it in the last second.
            expect(catches.at(-1)!.time, label).toBeLessThanOrEqual(L + STEP + 1e-9);
          },
        );
        And(
          "in some runs it's too hot: it reaches its last spark in the second's hands, everyone gasps, they shake and fling it to the third, the unlucky person, and it pops as it lands",
          () => {
            for (const plan of runs.filter((each) => each.ending === 'too-hot')) {
              expect(plan.three[2]).toBe('Luca');
            }
            const run = labRun(count, 'too-hot');
            const { label, plan, catches } = run;
            const P = startOf(plan, 'pop');
            const second = plan.three[1];
            const gasp = between(run, plan.lastSpark + STEP, plan.still.to);
            expect(gasp.length, label).toBeGreaterThan(10);
            for (const frame of gasp) {
              expect(frame.holder, `${label} at ${frame.time}`).toBe(second);
              expect(frame.sparkler, `${label} at ${frame.time}`).toBe(0);
              for (const [name, mood] of Object.entries(frame.moods)) {
                expect(mood, `${label}: ${name} at ${frame.time}`).toBe('scared');
              }
            }
            expect(
              gasp.some((frame) => Math.abs(frame.xs[second]!) > 4),
              label,
            ).toBe(true);
            const flung = between(run, plan.still.to + STEP, P);
            expect(flung.length, label).toBeGreaterThan(5);
            for (const frame of flung) expect(frame.holder, `${label} at ${frame.time}`).toBe('');
            const last = catches.at(-1)!;
            expect(last.holder, label).toBe('Luca');
            expect(Math.abs(last.time - P), label).toBeLessThanOrEqual(STEP + 1e-9);
          },
        );
        And(
          "in some runs it hangs: the second's pass floats up high between the two, hangs, and drops onto the unlucky person, the third in some runs and back onto the second in others",
          () => {
            const where = runs
              .filter((plan) => plan.ending === 'hangs')
              .map((plan) => plan.three.indexOf('Luca'));
            // With 2 people the third is the first again.
            expect(where).toContain(1);
            expect(where).toContain(count === 2 ? 0 : 2);
            const run = labRun(count, 'hangs');
            const { label, plan, catches } = run;
            const L = startOf(plan, 'last-second');
            const P = startOf(plan, 'pop');
            const hands = frameAt(run, L).potato;
            const flying = between(run, L + 0.5 + STEP, P);
            for (const frame of flying) expect(frame.holder, `${label} at ${frame.time}`).toBe('');
            const top = flying.reduce((high, frame) =>
              frame.potato.y < high.potato.y ? frame : high,
            );
            expect(top.potato.y, label).toBeLessThanOrEqual(hands.y + 1e-6);
            // Between them, or at most half a potato past where one stands.
            const xs = [plan.three[1], plan.three[2]].map((name) => standing(run, name, L).x);
            const half = (count === 2 ? POTATO.pairScale : 1) * (POTATO.width / 2);
            expect(top.potato.x, label).toBeGreaterThanOrEqual(Math.min(...xs) - half - 1);
            expect(top.potato.x, label).toBeLessThanOrEqual(Math.max(...xs) + half + 1);
            const last = catches.at(-1)!;
            expect(last.holder, label).toBe('Luca');
            expect(Math.abs(last.time - P), label).toBeLessThanOrEqual(STEP + 1e-9);
          },
        );
      },
    );

    RuleScenario('A moment of stillness in the ring, then the pop', ({ When, Then, And }) => {
      When('the show runs with each ending', () => {
        for (const ending of ENDINGS) {
          expect(
            lab.some((run) => run.plan.ending === ending),
            ending,
          ).toBe(true);
        }
      });
      Then(
        "in the last second the potato barely moves for at least half a second: in the second's hands, held out, or at the top of its flight",
        () => {
          for (const run of lab) {
            const { label, plan } = run;
            const L = startOf(plan, 'last-second');
            const last = between(run, L + STEP, startOf(plan, 'pop'));
            const holder = plan.ending === 'hangs' ? '' : plan.three[1];
            const still = stillest(last.filter((frame) => frame.holder === holder));
            expect(still.at(-1)!.time - still[0]!.time, label).toBeGreaterThanOrEqual(0.5 - 1e-9);
            if (plan.ending === 'hangs') {
              const top = Math.min(...last.map((frame) => frame.potato.y));
              expect(
                still.some((frame) => frame.potato.y === top),
                label,
              ).toBe(true);
            }
          }
        },
      );
      And('it pops at the end of the last second, on the unlucky person', () => {
        for (const { label, plan, frames } of lab) {
          const pop = frames.filter((frame) => frame.beat === 'pop');
          expect(pop[0]!.time - startOf(plan, 'pop'), label).toBeLessThanOrEqual(STEP + 1e-9);
          for (const frame of pop) expect(frame.holder, label).toBe('Luca');
        }
      });
    });

    RuleScenario('Held out, the potato covers no name', ({ Given, When, Then, And }) => {
      let run: Run;
      Given('6 people, and the second of the three stands at the back of the ring', async () => {
        const team = labTeam(6);
        const back = Math.min(...ring(6).map((spot) => spot.y));
        const seed = seedWhere(
          team,
          'Luca',
          (plan) =>
            plan.ending === 'holding-on' && ring(6)[plan.ring.indexOf(plan.three[1])]!.y === back,
        );
        run = await watch(team, 'Luca', seed, 1 / 10);
      });
      When("they're holding on", () => {
        expect(run.plan.ending).toBe('holding-on');
      });
      Then('they hold it out beside their face, on the side of the third', () => {
        const { plan } = run;
        const L = startOf(plan, 'last-second');
        const second = standing(run, plan.three[1], L);
        const third = standing(run, plan.three[2], L);
        const head = headBox(second);
        for (const frame of between(run, plan.still.from + 0.1, plan.still.to)) {
          const { x, y } = frame.potato;
          expect(Math.sign(x - second.x)).toBe(Math.sign(third.x - second.x));
          // Beside: not over the head.
          expect(y + POTATO.height / 2).toBeGreaterThan(head.top);
        }
      });
      And("it covers neither their face nor anyone's name tag", () => {
        const { plan } = run;
        const L = startOf(plan, 'last-second');
        const second = standing(run, plan.three[1], L);
        const names = plan.ring.map((name) => nameBox(standing(run, name, L)));
        const { x, y, r } = face(second);
        for (const frame of between(run, plan.still.from + 0.1, startOf(plan, 'pop'))) {
          const box = potatoBox(frame.potato, 1);
          const near = {
            x: Math.min(box.right, Math.max(box.left, x)),
            y: Math.min(box.bottom, Math.max(box.top, y)),
          };
          expect(Math.hypot(near.x - x, near.y - y), `at ${frame.time}`).toBeGreaterThan(r);
          names.forEach((name, index) => {
            expect(overlap(box, name), `${plan.ring[index]} at ${frame.time}`).toBe(false);
          });
        }
      });
    });
  });

  Rule('Once in a while it strays', ({ RuleScenario }) => {
    RuleScenario('It strays', ({ Given, When, Then, And }) => {
      let run: Run;
      let fling: Catch;
      Given('6 people, and it strays', () => {
        run = labRun(6, 'strays');
        fling = run.plan.catches.at(-1)!;
      });
      When('the last second comes', () => {});
      Then('neither of the last two standing is the unlucky person', () => {
        expect(run.plan.three.slice(1)).not.toContain('Luca');
      });
      And("it reaches its last spark in the second's hands, everyone gasps, and they shake", () => {
        const { plan } = run;
        const second = plan.three[1];
        const gasp = between(run, plan.lastSpark + STEP, fling.thrown);
        expect(gasp.length).toBeGreaterThan(10);
        for (const frame of gasp) {
          expect(frame.holder, `at ${frame.time}`).toBe(second);
          expect(frame.sparkler, `at ${frame.time}`).toBe(0);
          for (const mood of Object.values(frame.moods)) expect(mood).toBe('scared');
        }
        expect(gasp.some((frame) => Math.abs(frame.xs[second]!) > 4)).toBe(true);
      });
      And('they fling it across the ring with a "Whoa!" beside them', () => {
        expect(fling.from).toBe(run.plan.three[1]);
        expect(fling.thrown).toBeCloseTo(run.plan.still.to, 9);
        const whoa = run.bubbles.find((each) => each.text === 'Whoa!');
        expect(whoa).toBeDefined();
        expect(Math.abs(whoa!.time - fling.thrown)).toBeLessThanOrEqual(2 * STEP);
        expect(apart(whoaIn(run).box, whoaIn(run).head)).toBeLessThanOrEqual(60);
        for (const frame of between(run, fling.thrown + STEP, fling.at)) {
          expect(frame.holder, `at ${frame.time}`).toBe('');
        }
      });
      And('it lands on the unlucky person, sitting down, and pops', () => {
        const P = startOf(run.plan, 'pop');
        const last = run.catches.at(-1)!;
        expect(last.holder).toBe('Luca');
        expect(Math.abs(last.time - P)).toBeLessThanOrEqual(STEP + 1e-9);
        const before = between(run, 0, P).at(-1)!;
        expect(before.sitting).toContain('Luca');
        // Landing on their head, sitting down: a little lower than standing.
        const pop = frameAt(run, P);
        const seated = headBox(standing(run, 'Luca', P));
        expect(pop.potato.y).toBeGreaterThan(seated.top - POTATO.height);
      });
      And('the unlucky person stands up again, full size, for the crown', () => {
        const end = run.frames.at(-1)!;
        expect(end.heads.Luca!.scale).toBeCloseTo(1, 3);
        expect(end.heads.Luca!.y).toBeCloseTo(0, 3);
        expect(end.crown).toBe(true);
        expect(end.moods.Luca).toBe('party');
      });
    });

    RuleScenario('"Whoa!" beside them, wherever they stand', ({ When, Then, And }) => {
      let whoas: Whoa[];
      When('it strays at 6 and at 12 people, and at 4 people with seed 7', () => {
        const plan = planShow(names(4), 'Dario', createRandom(7));
        expect(plan.ending).toBe('strays');
        whoas = [
          whoaIn(labRun(6, 'strays')),
          whoaIn(labRun(12, 'strays')),
          whoaFor(plan, '4 people, seed 7'),
        ];
      });
      Then('the "Whoa!" is within 60 pixels of their head', () => {
        for (const { label, box, head } of whoas) {
          expect(apart(box, head), label).toBeLessThanOrEqual(60);
        }
      });
      And('it is on the stage, below the caption, and off the potato', () => {
        for (const { label, box, potato } of whoas) {
          expect(box.left, label).toBeGreaterThanOrEqual(0);
          expect(box.right, label).toBeLessThanOrEqual(1280);
          expect(box.bottom, label).toBeLessThanOrEqual(720);
          expect(overlap(box, CAPTION), label).toBe(false);
          expect(overlap(box, potato), label).toBe(false);
        }
      });
    });

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

  Rule('With 2 people they pass it back and forth', ({ RuleScenario }) => {
    RuleScenario('Two people', ({ Given, When, Then, And }) => {
      let runs: Run[];
      Given('2 people', () => {});
      When('the show runs', () => {
        runs = lab.filter((run) => run.plan.ring.length === 2);
      });
      Then('they pass it back and forth, fast and then slower', () => {
        for (const { label, plan } of runs) {
          // Each pass to the other one, but a hang that drops back.
          for (const each of plan.catches.slice(1)) {
            if (offRing(plan, each) !== 'hang back') expect(each.by, label).not.toBe(each.from);
          }
          const laps = during(plan, 'laps');
          for (const each of laps) expect(flight(each), label).toBeCloseTo(0.45, 9);
          const lastLap = during(plan, 'last-lap')[0]!;
          expect(lastLap.seconds, label).toBeGreaterThan(0.45);
          expect(during(plan, 'crawl')[0]!.seconds, label).toBeGreaterThan(lastLap.seconds);
        }
      });
      And('nobody says "Phew!", sits down or grows', () => {
        for (const run of runs) {
          expect(
            run.bubbles.some((each) => each.text === 'Phew!'),
            run.label,
          ).toBe(false);
          for (const frame of between(run, 0, startOf(run.plan, 'pop'))) {
            expect(frame.sitting, run.label).toEqual([]);
            for (const body of Object.values(frame.bodies)) expect(body, run.label).toBe(1);
          }
        }
      });
      And('the last second is holding on, too hot or hangs', () => {
        const endings = new Set(plans(2, 'Anna', 40).map((plan) => plan.ending));
        expect([...endings].sort()).toEqual(['hangs', 'holding-on', 'too-hot']);
      });
    });
  });

  Rule('The sparkler is the clock everyone watches', ({ RuleScenario }) => {
    RuleScenario('The fuse burns down to the last second', ({ When, Then, And }) => {
      When('the show runs', () => {});
      Then(
        'a fuse across the top of the stage, behind everyone, burns down evenly from the plop',
        () => {
          for (const { label, plan, frames, fuseBehind } of lab) {
            expect(fuseBehind, label).toBe(true);
            for (const frame of frames.filter((each) => each.time < plan.lastSpark)) {
              expect(frame.fuse.left, `${label} at ${frame.time}`).toBeCloseTo(
                1 - frame.time / plan.lastSpark,
                2,
              );
            }
          }
        },
      );
      And('the sparkler on the potato burns down with it', () => {
        for (const { label, frames } of lab) {
          for (const frame of frames) {
            expect(frame.sparkler, `${label} at ${frame.time}`).toBeCloseTo(frame.fuse.left, 3);
          }
        }
      });
      And(
        'both reach their last spark only in the last second, and the fuse is gone at the pop',
        () => {
          for (const { label, plan, frames } of lab) {
            const L = startOf(plan, 'last-second');
            const P = startOf(plan, 'pop');
            const out = frames.filter((frame) => frame.fuse.left === 0);
            expect(out.length, label).toBeGreaterThan(0);
            for (const frame of out) expect(frame.time, label).toBeGreaterThan(L);
            for (const frame of frames) {
              expect(frame.fuse.shown, `${label} at ${frame.time}`).toBe(frame.time < P - 1e-9);
            }
          }
        },
      );
      And("the fuse's spark pulses, never more than 3 times a second", () => {
        for (const { label, frames } of lab) {
          // A pulse: the spark grows past halfway between 1 and 1.25.
          const pulses: number[] = [];
          frames.forEach((frame, index) => {
            const before = frames[index - 1];
            if (before && before.fuse.spark < 1.125 && frame.fuse.spark >= 1.125) {
              pulses.push(frame.time);
            }
          });
          expect(pulses.length, label).toBeGreaterThan(10);
          for (const pulse of pulses) {
            expect(
              pulses.filter((each) => each >= pulse && each < pulse + 1).length,
              label,
            ).toBeLessThanOrEqual(3);
          }
        }
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
          for (const run of lab) {
            const { label, burstBehind, bubbles, unlucky, plan } = run;
            expect(burstBehind, label).toBe(true);
            const spot = standing(run, unlucky, startOf(plan, 'pop'));
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
    RuleScenario('Captions tell the story in the ring', ({ Given, When, Then }) => {
      let run: Run;
      Given(
        '6 people, the unlucky person is "Fabio", the last three are "Carla", "Fabio" and "Ben", it goes back once, and Fabio holds on',
        () => {},
      );
      When('the show runs', async () => {
        run = await fabioRun();
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const lines = table.map((row) => row.caption);
        expect(inOrder(said(run.record), lines), said(run.record).join(' / ')).toBe(true);
      });
    });

    RuleScenario('The crawl names each catch', ({ Given, When, Then }) => {
      let run: Run;
      Given('6 people, and the last three are "Carla", "Fabio" and "Ben"', async () => {
        run = await fabioRun();
      });
      When('the crawl starts', () => {});
      Then('the caption is "Carla…", and "Fabio…" when it reaches Fabio', () => {
        const crawl = startOf(run.plan, 'crawl');
        const up = (text: string) => run.record.captions.find((each) => each.text === text)!;
        expect(Math.abs(up('Carla…').from - crawl)).toBeLessThanOrEqual(0.1 + 1e-9);
        const reached = run.catches.find((each) => each.holder === 'Fabio' && each.time > crawl)!;
        expect(Math.abs(up('Fabio…').from - reached.time)).toBeLessThanOrEqual(0.1 + 1e-9);
      });
    });

    RuleScenario('Each ending has its caption, in the ring', ({ When, Then }) => {
      When('the show runs with each ending', () => {
        for (const ending of ENDINGS) {
          expect(
            lab.some((run) => run.plan.ending === ending),
            ending,
          ).toBe(true);
        }
      });
      Then(
        'a second before the pop the caption is "Pass it!" when holding on, "Too hot!" when too hot or it strays, and "Which way…?" when it hangs',
        () => {
          for (const { label, plan, record } of lab) {
            const due = startOf(plan, 'pop') - 1;
            const up = record.captions.find(
              (caption) => caption.text === ENDING_CAPTION[plan.ending] && caption.from > due - 0.5,
            );
            expect(up, `${label}: ${said(record).join(' / ')}`).toBeDefined();
            // Frames are a step apart, and the caption before it may be up a frame late.
            expect(up!.from, label).toBeGreaterThanOrEqual(due - 1e-9);
            expect(up!.from, label).toBeLessThanOrEqual(due + 2 * STEP + 1e-9);
          }
        },
      );
    });

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

    RuleScenario('Bigger at 4 to 7', ({ When, Then, And }) => {
      let runs: Run[];
      When('the show runs at 6 people', () => {
        runs = lab.filter((run) => run.plan.ring.length === 6);
      });
      Then(
        'every head standing in the ring is 100 pixels or more, and every name tag 22 pixels or more',
        () => {
          const spots = ring(6);
          for (const run of runs) {
            const { label, plan, smallestTag } = run;
            expect(smallestTag, label).toBeGreaterThanOrEqual(22);
            for (const frame of between(run, 0, startOf(plan, 'pop'))) {
              for (const name of plan.ring.filter((each) => !frame.sitting.includes(each))) {
                const size = spots[plan.ring.indexOf(name)]!.size * frame.scales[name]!;
                expect(size, `${label}: ${name} at ${frame.time}`).toBeGreaterThanOrEqual(100);
              }
            }
          }
        },
      );
      And('no "Phew!" bubble, and no potato held by anyone, covers a name tag', () => {
        for (const run of runs) {
          const { label, plan } = run;
          const namesAt = (time: number) =>
            plan.ring.map((name) => ({ name, box: nameBox(standing(run, name, time)) }));
          for (const bubble of run.bubbles.filter((each) => each.text === 'Phew!')) {
            for (const { name, box } of namesAt(bubble.time)) {
              expect(overlap(bubble.box, box), `${label}: Phew! at ${bubble.time} on ${name}`).toBe(
                false,
              );
            }
          }
          // Held, not in flight, until the pop; a grown person's name is
          // only grown once they've finished growing.
          for (const frame of between(run, 0, startOf(plan, 'pop'))) {
            if (!frame.holder) continue;
            const growing =
              frame.time >= startOf(plan, 'crawl') - 1e-9 &&
              frame.time < startOf(plan, 'crawl') + 0.4;
            if (growing) continue;
            const potato = potatoBox(frame.potato, 1);
            for (const { name, box } of namesAt(frame.time)) {
              expect(
                overlap(potato, box),
                `${label}: ${frame.holder}'s potato on ${name} at ${frame.time}`,
              ).toBe(false);
            }
          }
        }
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

  /** The top of the potato's drawing, a full sparkler included, centred at `point`. */
  const drawingTop = (point: Point, scale: number) =>
    point.y - scale * (POTATO.height / 2 + POTATO.above);

  const potatoScale = (count: number) => (count === 2 ? POTATO.pairScale : 1);

  it('no tag overlaps at any count, with any three neighbours grown', () => {
    for (let count = 2; count <= 12; count++) {
      expect(ring(count), `${count} people`).toHaveLength(count);
      for (const [index, mix] of mixes(count).entries()) {
        expect(overlapping(mix), `${count} people, mix ${index}`).toBe(false);
      }
    }
  });

  it('heads are 100 px or more at 4 to 7, and every tag 22 px or more', () => {
    for (let count = 2; count <= 12; count++) {
      for (const spot of ring(count)) {
        if (count >= 4 && count <= 7) {
          expect(spot.size, `${count} people`).toBeGreaterThanOrEqual(100);
        }
        expect(spot.tag.size, `${count} people`).toBeGreaterThanOrEqual(22);
      }
    }
  });

  it('even counts have someone at each side of the ring', () => {
    for (const count of [4, 6, 8, 10, 12]) {
      const xs = ring(count).map((spot) => spot.x);
      expect(
        xs.filter((x) => x === Math.min(...xs)),
        `${count} people`,
      ).toHaveLength(1);
      expect(
        xs.filter((x) => x === Math.max(...xs)),
        `${count} people`,
      ).toHaveLength(1);
    }
  });

  it('held is over the face where that stays out of the sky, beside it where not', () => {
    const front = ring(7).reduce((a, b) => (b.y > a.y ? b : a));
    expect(held(front).x).toBe(front.x);
    expect(held(front).y).toBeLessThan(face(front).y);
    const back = ring(7)[0]!;
    expect(held(back).x).not.toBe(back.x);
    expect(held(back).y).toBeGreaterThanOrEqual(face(back).y);
  });

  // Names stay clear where the ring has room: up to 8 people. From 9 the
  // heads stand too close for a potato to sit clear of every name.
  it("a held potato covers neither the holder's face nor anyone's name, and stays below the caption", () => {
    for (let count = 2; count <= 12; count++) {
      const scale = potatoScale(count);
      for (const [index, mix] of mixes(count).entries()) {
        mix.forEach((spot, k) => {
          const label = `${count} people, mix ${index}, spot ${k}`;
          const names = mix.filter((other) => other !== spot).map(nameBox);
          const box = potatoBox(held(spot, scale, names), scale);
          expect(offFace(box, spot), label).toBeGreaterThan(0);
          expect(overlap(box, nameBox(spot)), label).toBe(false);
          expect(box.top - scale * POTATO.above, label).toBeGreaterThanOrEqual(SKY);
          expect(box.left, label).toBeGreaterThanOrEqual(0);
          expect(box.right, label).toBeLessThanOrEqual(1280);
          expect(box.bottom, label).toBeLessThanOrEqual(720);
          if (count > 8) return;
          mix.forEach((other, i) => {
            if (other !== spot) expect(overlap(box, nameBox(other)), `${label}, ${i}`).toBe(false);
          });
        });
      }
    }
  });

  it('held out, the potato is beside the face towards the third, off every name', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = potatoScale(count);
      const spots = ring(count);
      for (let k = 0; k < count; k++) {
        for (const way of [1, -1]) {
          const label = `${count} people, spot ${k}, ${way > 0 ? 'clockwise' : 'the other way'}`;
          const second = count === 2 ? spots[k]! : grown(spots[k]!);
          const third = spots[mod(k + way, count)]!;
          const near = count === 2 ? third : grown(third);
          const towards = held(near, scale);
          // The names around them then: the third's grown, the rest as they were.
          const names = spots.map((other, index) =>
            nameBox(index === mod(k + way, count) ? near : other),
          );
          const point = heldOut(
            second,
            towards,
            scale,
            names.filter((_, index) => index !== k),
          );
          const box = potatoBox(point, scale);
          expect(offFace(box, second), label).toBeGreaterThan(0);
          expect(drawingTop(point, scale), label).toBeGreaterThanOrEqual(SKY - 1e-6);
          expect(Math.sign(point.x - second.x), label).toBe(
            Math.sign(towards.x - second.x) || (second.x > 640 ? -1 : 1),
          );
          expect(box.left, label).toBeGreaterThanOrEqual(0);
          expect(box.right, label).toBeLessThanOrEqual(1280);
          expect(overlap(box, nameBox(second)), label).toBe(false);
          // Tuned for 4 to 7: from 8 the three stand too close for it to clear every name.
          if (count > 7) continue;
          names.forEach((name, index) => {
            if (index !== k) expect(overlap(box, name), `${label}, ${index}`).toBe(false);
          });
        }
      }
    }
  });

  it('every pass stays below the caption', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = potatoScale(count);
      const points = ring(count).map((spot) => held(spot, scale));
      for (const [i, from] of points.entries()) {
        for (const [j, to] of points.entries()) {
          // Nobody passes to themselves: a pass that comes back hangs (below).
          if (i === j) continue;
          const path = throwPath(from, to, scale);
          for (let step = 0; step <= 50; step++) {
            const point = bezier(step / 50, ...path);
            expect(
              drawingTop(point, scale),
              `${count} people, ${i} to ${j}`,
            ).toBeGreaterThanOrEqual(SKY - 1e-6);
          }
        }
      }
    }
  });

  it('the hang between two neighbours stays out of the sky, as high as either hand', () => {
    for (let count = 2; count <= 12; count++) {
      const scale = potatoScale(count);
      const spots = ring(count).map((spot) => (count === 2 ? spot : grown(spot)));
      for (let k = 0; k < count; k++) {
        const two = [k, mod(k + 1, count)].map((index) => held(spots[index]!, scale)) as [
          Point,
          Point,
        ];
        const middle = (two[0].x + two[1].x) / 2;
        for (const [from, to] of [
          [two[0], two[1]],
          [two[1], two[0]],
          [two[0], two[0]],
          [two[1], two[1]],
        ] as const) {
          const label = `${count} people, ${k} and the next, ${from.x} to ${to.x}`;
          const { rise, top, drop } = hang(from, to, two, scale);
          expect(top.x, label).toBeCloseTo(middle, 9);
          // As high as it may go, and never lower than either hand.
          expect(top.y, label).toBeLessThanOrEqual(Math.min(two[0].y, two[1].y));
          expect(rise[0], label).toEqual(from);
          expect(drop[3], label).toEqual(to);
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

  it("the hang's top clears both faces and every name, about between the two, up to 7 people", () => {
    for (let count = 2; count <= 7; count++) {
      const scale = potatoScale(count);
      for (let k = 0; k < count; k++) {
        // The second and the third, grown with the first before them.
        const three = [k - 1, k, k + 1].map((index) => mod(index, count));
        const spots = ring(count).map((spot, index) =>
          count > 2 && three.includes(index) ? grown(spot) : spot,
        );
        const names = spots.map(nameBox);
        const pair = [spots[k]!, spots[mod(k + 1, count)]!];
        const two = pair.map((spot) => held(spot, scale)) as [Point, Point];
        const avoid = [...pair.map(headBox), ...names];
        const { top } = hang(two[0], two[1], two, scale, avoid);
        const label = `${count} people, ${k} and the next`;
        const box = potatoBox(top, scale);
        for (const each of avoid) expect(overlap(box, each), label).toBe(false);
        // At most half a potato past either hand.
        const half = (scale * POTATO.width) / 2;
        expect(top.x, label).toBeGreaterThanOrEqual(Math.min(two[0].x, two[1].x) - half - 1e-9);
        expect(top.x, label).toBeLessThanOrEqual(Math.max(two[0].x, two[1].x) + half + 1e-9);
      }
    }
  });

  it('sitting, the head shrinks to 0.72 and drops towards the name tag', () => {
    for (let count = 3; count <= 12; count++) {
      for (const spot of ring(count)) {
        const head = sittingHead(spot);
        const standing = headBox(spot);
        expect(head.right - head.left).toBeCloseTo(0.72 * spot.size, 9);
        expect(head.top).toBeGreaterThan(standing.top);
        expect(head.bottom).toBeGreaterThan(standing.bottom);
      }
    }
  });

  it('a grown unlucky person keeps their tag on stage and off every other tag', () => {
    for (let count = 2; count <= 12; count++) {
      const spots = ring(count);
      for (const [index, spot] of spots.entries()) {
        for (const at of count === 2 ? [spot] : [spot, grown(spot)]) {
          const { tag } = crowned(at);
          const label = `${count} people, spot ${index}, ${at === spot ? 'standing' : 'grown'}`;
          expect(tag.left, label).toBeGreaterThanOrEqual(0);
          expect(tag.right, label).toBeLessThanOrEqual(1280);
          expect(tag.bottom, label).toBeLessThanOrEqual(720);
          // In front of everyone at the pop: from 10 it may touch a neighbour's name.
          if (count > 9) continue;
          for (const other of spots.filter((each) => each !== spot)) {
            expect(overlap(tag, nameBox(other)), `${label}, ${spots.indexOf(other)}`).toBe(false);
          }
        }
      }
    }
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

  it('bubbles appear inside the stage, below the caption and off the potato', () => {
    for (const { label, bubbles } of lab) {
      expect(bubbles.length, label).toBeGreaterThan(2);
      for (const { text, box, potato } of bubbles) {
        expect(box.left, `${label}: ${text}`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${label}: ${text}`).toBeLessThanOrEqual(1280);
        // Below the caption.
        expect(box.top, `${label}: ${text}`).toBeGreaterThanOrEqual(SKY);
        expect(box.bottom, `${label}: ${text}`).toBeLessThanOrEqual(720);
        if (potato) expect(overlap(box, potato), `${label}: ${text}`).toBe(false);
      }
    }
  });

  it('with reduced motion they sit and grow at once, and the fuse does not pulse', async () => {
    const team = labTeam(6);
    const run = await watch(team, 'Luca', labRun(6, 'too-hot').seed, 1 / 10, true);
    for (const frame of run.frames) expect(frame.fuse.spark, `at ${frame.time}`).toBe(1);
    for (const { name, at } of run.plan.sits) {
      const frame = frameAt(run, at);
      expect(frame.heads[name]!.scale, name).toBeCloseTo(0.72, 3);
    }
    const grown = frameAt(run, startOf(run.plan, 'crawl'));
    for (const name of run.plan.three) expect(grown.bodies[name], name).toBeCloseTo(1.2, 3);
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
