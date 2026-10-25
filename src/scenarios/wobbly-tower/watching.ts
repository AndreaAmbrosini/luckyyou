// Runs Wobbly Tower frame by frame and reads what the stage showed, for the
// tests in this folder.

import { expect } from 'vitest';
import { gsap } from 'gsap';
import { runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { speechBox, type Cue, type Scenario } from '../../scenario-kit';
import wobblyTower from './index';
import { planShow, READ, type Beat, type Ending, type Plan, type Turn } from './plan';
import {
  blockOverlaps,
  overlap,
  placings,
  sideOf,
  startingRows,
  tagBox,
  tagContentWidth,
  type Block,
  type Box,
  type Point,
  type Places,
  type Spot,
} from './layout';
import { grownBoxes } from './play';

export const ENDINGS: readonly Ending[] = ['dead-still', 'it-holds', 'slow-lean'];

export const TEAM = [
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
  'Maria Giulia B.',
];

/** The first `count` of the team. */
export const names = (count: number) => TEAM.slice(0, count);
/** The unlucky person in plan-level runs: the last of the first `count`. */
export const unluckyOf = (count: number) => names(count).at(-1)!;

/** Plans for seeds 1 to `seeds`. */
export function plans(count: number, seeds = 20, unlucky = unluckyOf(count)): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(names(count), unlucky, createRandom(index + 1)),
  );
}

export const during = (plan: Plan, beat: Beat) => plan.turns.filter((turn) => turn.beat === beat);
export const only = (plan: Plan, beat: Beat): Turn => {
  const turns = during(plan, beat);
  expect(turns).toHaveLength(1);
  return turns[0]!;
};
/** The turn that has Nearly. */
export const nearlyOf = (plan: Plan): Turn => {
  const turns = plan.turns.filter((turn) => turn.nearly);
  expect(turns).toHaveLength(1);
  return turns[0]!;
};
/** The turns, round by round: one or two in each. */
export function roundsOf(plan: Plan): Turn[][] {
  const rounds: Turn[][] = [];
  plan.turns.forEach((turn, index) => {
    if (index > 0 && plan.turns[index - 1]!.round === turn.round) rounds.at(-1)!.push(turn);
    else rounds.push([turn]);
  });
  return rounds;
}
/** The first turn of each round. */
export const firstTurns = (plan: Plan) => roundsOf(plan).map((round) => round[0]!);
/** When `beat` starts, in show seconds. */
export const startOf = (plan: Plan, beat: Beat) => plan.starts[beat];
/** Who is at risk as `turn`'s round starts: everyone who hasn't said Safe! before it. */
export const atRiskFor = (plan: Plan, turn: Turn) =>
  plan.order.filter((name) =>
    plan.turns.every((each) => each.by !== name || each.safe === null || each.safe > turn.from),
  );
/**
 * Who is next along the line after `name`, among `atRisk`: the next to the
 * right in the standing order, from the rightmost back to the leftmost.
 */
export function nextAlong(plan: Plan, name: string, atRisk: readonly string[]): string {
  const seat = plan.order.indexOf(name);
  for (let k = 1; k <= plan.order.length; k++) {
    const next = plan.order[(seat + k) % plan.order.length]!;
    if (atRisk.includes(next)) return next;
  }
  throw new Error(`nobody at risk after ${name}`);
}

/** Every head count, with seeds 1–40. */
export function everyPlan(): { label: string; plan: Plan; unlucky: string }[] {
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

/** Whether any two boxes overlap. */
export const anyOverlap = (boxes: Box[]) =>
  boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlap(box, other)));
/** The size a name tag is set at, in stage pixels. */
export const sizeOf = (tag: HTMLElement) =>
  Number.parseFloat(tag.style.getPropertyValue('--tag-size'));
/** How wide the kit sets `tag`, for `name`. */
export const drawnWidth = (name: string, tag: HTMLElement) => {
  const size = sizeOf(tag);
  const maxWidth = Number.parseFloat(tag.style.maxWidth);
  const lines = tag.dataset.lines === '2' ? 2 : 1;
  // Worked out once for each way a tag is set: most frames set it as the last did.
  const key = `${name}|${size}|${maxWidth}|${lines}`;
  let width = widths.get(key);
  if (width === undefined) widths.set(key, (width = tagContentWidth(name, size, maxWidth, lines)));
  return width;
};
const widths = new Map<string, number>();
/** The test team's names without its 15-character one, and one more to make twelve. */
export const NORMAL = [...TEAM.slice(0, -1), 'Zoe'];

/** Show seconds per recorded frame. */
export const STEP = 1 / 30;

/** What the stage showed in one frame. */
export interface Frame {
  readonly time: number;
  readonly beat: string;
  /** Where each person is drawn, their name tag's box as the kit sets it, and whether they sit on the bench. */
  readonly people: Readonly<Record<string, { spot: Spot; tag: Box; benched: boolean }>>;
  /** Whether the "At risk" plinth is drawn, and the number on it (everyone, without it). */
  readonly plinth: boolean;
  readonly atRisk: number;
  /** The tower's lean in degrees, positive to the right of the stage. */
  readonly lean: number;
  /** How many blocks have landed on the tower. */
  readonly blocks: number;
  /** The top landed block's centre and turn, as drawn; null before the first lands. */
  readonly top: (Point & { readonly turn: number }) | null;
  readonly moods: Readonly<Record<string, string>>;
  /** Who sweats. */
  readonly sweat: readonly string[];
  /** How opaque the spotlight's dimming is drawn: 0 hidden, 1 fully. */
  readonly spotlight: number;
  /** Whose head comes before the spotlight in the document, so is dimmed by it. */
  readonly dimmed: readonly string[];
  /** Whose head and name tag come after the spotlight, so are drawn over it, undimmed. */
  readonly lit: readonly string[];
  /** Whether the Safe bench is drawn. */
  readonly bench: boolean;
  /** Who holds a block overhead. */
  readonly holding: readonly string[];
  /** Who reaches toward the tower, and how far their head tips its way, in degrees. */
  readonly reaching: Readonly<Record<string, number>>;
  /** The speech bubbles showing, where their tails point, which bubble each is, and whose `Safe!` it is. */
  readonly bubbles: readonly (Point & {
    readonly text: string;
    readonly id: number;
    readonly by?: string;
  })[];
  /** Everyone's head, in the order drawn: the last over the rest. */
  readonly stacked: readonly string[];
  /** How many blocks lie in the heap after the fall. */
  readonly fallen: number;
  /** Whether speed lines are drawn. */
  readonly speedLines: boolean;
  /** How many dust puffs are drawn. */
  readonly dust: number;
  /** Where and how big the unlucky person and their name tag are drawn. */
  readonly them: string;
  /** The unlucky person's hard hat, how far above its place on their head, while it shows. */
  readonly hat: { readonly y: number } | null;
  /** Every block drawn, standing, flying, tumbling or in the heap, and whose name tags are drawn over it. */
  readonly drawn: readonly (Block & { readonly under: readonly string[] })[];
}

/** In the last frame of a run: how the unlucky person and the blocks ended up. */
export interface End {
  /** The unlucky person comes after every other person and every block on the stage. */
  readonly inFront: boolean;
  /** How many times their size they are drawn. */
  readonly scale: number;
  /** Where each block lies, bottom of the tower first. */
  readonly rests: readonly (Point & { readonly turn: number })[];
}

/** A cue the show asked for, and the time of the frame it was asked for in. */
export interface Heard {
  readonly cue: Cue;
  readonly time: number;
}

/** Someone doing something, and the time of the frame it shows in. */
export interface Moment {
  readonly name: string;
  readonly time: number;
}

/** A tower block as the stage built it: who throws it ('' for paper) and its colour. */
export interface Built {
  readonly by: string;
  readonly fill: string;
}

/** Whether `element` is drawn: not hidden, and not fully transparent. */
export const opacityOf = (element: HTMLElement | SVGElement) =>
  element.style.visibility === 'hidden' ? 0 : Number(element.style.opacity || 1);

/** Whether `later` comes after `element` in the document, so is drawn over it. */
const after = (element: Element, later: Element) =>
  (element.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

/** A block's centre and turn from the transform play.ts draws it with. */
export function placed(block: HTMLElement): (Point & { turn: number }) | null {
  const match = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) rotate\(([-\d.e]+)deg\)/.exec(
    block.style.transform,
  );
  if (!match) return null;
  return {
    x: Number(match[1]) + Number.parseFloat(block.style.width) / 2,
    y: Number(match[2]) + Number.parseFloat(block.style.height) / 2,
    turn: Number(match[3]),
  };
}

/** How a show is watched: its seed, seconds per frame, when it's cancelled, and reduced motion. */
interface Watching {
  seed?: number;
  step?: number;
  until?: number;
  reducedMotion?: boolean;
}

/** Every show watched in this test file, by its team, unlucky person and how it's watched. */
const watched = new Map<string, ReturnType<typeof recordShow>>();

/**
 * Runs Wobbly Tower and notes what the stage showed every frame. With
 * `until`, the show is cancelled at that many show seconds. Each show is run
 * once per test file: the same show asked for again is the same recording,
 * so tests that watch it share it.
 */
export function watch(
  team: readonly string[],
  unlucky: string,
  watching: Watching = {},
): ReturnType<typeof recordShow> {
  const { seed = 1, step = STEP, until, reducedMotion = false } = watching;
  const key = JSON.stringify([team, unlucky, seed, step, until ?? null, reducedMotion]);
  let run = watched.get(key);
  if (!run)
    watched.set(key, (run = recordShow(team, unlucky, { seed, step, until, reducedMotion })));
  return run;
}

async function recordShow(
  team: readonly string[],
  unlucky: string,
  { seed = 1, step = STEP, until, reducedMotion = false }: Watching,
): Promise<{
  frames: Frame[];
  record: ShowRecord;
  plan: Plan;
  words: string;
  kinds: string[];
  built: Built[];
  shirts: Record<string, string>;
  lifts: Moment[];
  cues: Heard[];
  end: End;
}> {
  const frames: Frame[] = [];
  const lifts: Moment[] = [];
  const cues: Heard[] = [];
  /** Cues asked for since the last frame: they belong to the next frame's time. */
  let asked: Cue[] = [];
  // Lifts can be shorter than a frame: each change of data-holding is noted.
  let changed: MutationRecord[] = [];
  const holding = new MutationObserver((records) => changed.push(...records));
  let words = '';
  let kinds: string[] = [];
  let started = false;
  let built: Built[] = [];
  let shirts: Record<string, string> = {};
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts:
    | {
        scene: HTMLElement;
        tower: HTMLElement;
        blocks: HTMLElement[];
        people: HTMLElement[];
        atRisk: HTMLElement | null;
        bubbles: HTMLElement[];
        them: HTMLElement;
        hat: SVGElement | null;
        speedLines: HTMLElement | null;
        dust: HTMLElement[];
        tags: HTMLElement[];
        /** Each person's name tag and sweat drops. */
        own: Map<HTMLElement, { tag: HTMLElement; sweat: Element }>;
        spotlight: HTMLElement;
        bench: boolean;
      }
    | undefined;
  let end: End = { inFront: false, scale: 0, rests: [] };
  const plan = planShow(team, unlucky, createRandom(seed));
  // Every cue the show asks for, as the sound player gets it.
  const listened: Scenario = {
    ...wobblyTower,
    play: (show) =>
      wobblyTower.play({
        ...show,
        sound: {
          ...show.sound,
          play(cue) {
            asked.push(cue);
            return show.sound.play(cue);
          },
        },
      }),
  };
  const record = await runShow(listened, {
    names: team,
    unlucky,
    seed,
    step,
    cancelAt: until,
    reducedMotion,
    onFrame(time, stage) {
      parts ??= {
        scene: stage.querySelector<HTMLElement>('[data-part="scene"]')!,
        tower: stage.querySelector<HTMLElement>('[data-part="tower"]')!,
        blocks: [...stage.querySelectorAll<HTMLElement>('[data-part="tower"] [data-part="block"]')],
        people: [...stage.querySelectorAll<HTMLElement>('[data-person]')],
        atRisk: stage.querySelector<HTMLElement>('[data-part="at-risk"]'),
        bubbles: [...stage.querySelectorAll<HTMLElement>('[data-part="bubble"]')],
        them: [...stage.querySelectorAll<HTMLElement>('[data-person]')].find(
          (person) => person.dataset.person === unlucky,
        )!,
        hat: stage.querySelector<SVGElement>('[data-part="hard-hat"]'),
        speedLines: stage.querySelector<HTMLElement>('[data-part="speed-lines"]'),
        dust: [...stage.querySelectorAll<HTMLElement>('[data-part="dust"]')],
        tags: [...stage.querySelectorAll<HTMLElement>('[data-on="chest"]')],
        own: new Map(
          [...stage.querySelectorAll<HTMLElement>('[data-person]')].map((person) => [
            person,
            {
              tag: [...stage.querySelectorAll<HTMLElement>('[data-on="chest"]')].find(
                (tag) => tag.textContent === person.dataset.person,
              )!,
              sweat: person.querySelector('[data-part="sweat"]')!,
            },
          ]),
        ),
        spotlight: stage.querySelector<HTMLElement>('[data-part="spotlight"]')!,
        bench: stage.querySelector('[data-part="bench"]') !== null,
      };
      const { scene, tower: drawn, blocks, people, bubbles, them, hat } = parts;
      // The tags over every block, found at once, and the few in between.
      const overAll = parts.tags
        .filter((tag) => after(blocks.at(-1)!, tag))
        .map((tag) => tag.textContent!);
      const between = parts.tags.filter(
        (tag) => !after(blocks.at(-1)!, tag) && after(blocks[0]!, tag),
      );
      const theirTag = parts.tags.find((tag) => tag.textContent === unlucky)!;
      for (const cue of asked) cues.push({ cue, time });
      asked = [];
      if (!started) {
        started = true;
        for (const person of people) {
          holding.observe(person, { attributeFilter: ['data-holding'], attributeOldValue: true });
        }
        // Every word and every kind of part on the stage: all made before the show.
        words = stage.textContent ?? '';
        // A head's own parts are its features, drawn inside it.
        const drawn = [...stage.querySelectorAll<HTMLElement>('[data-part]')].filter(
          (el) => !el.closest('[data-person] svg g'),
        );
        kinds = [...new Set(drawn.map((el) => el.dataset.part!))].sort();
        built = blocks.map((block) => ({ by: block.dataset.by!, fill: block.dataset.fill! }));
        shirts = Object.fromEntries(
          people.map((person) => [
            person.dataset.person!,
            person.querySelector('svg')!.style.getPropertyValue('--shirt'),
          ]),
        );
      }
      changed.push(...holding.takeRecords());
      const seen = changed;
      changed = [];
      for (const change of seen) {
        if (change.oldValue !== 'true') {
          lifts.push({ name: (change.target as HTMLElement).dataset.person!, time });
        }
      }
      // Once the show is over, the run empties the stage.
      if (!scene.isConnected) return;
      const landed = Number(drawn.dataset.blocks);
      frames.push({
        time,
        beat: scene.dataset.beat!,
        people: Object.fromEntries(
          people.map((person) => {
            const name = person.dataset.person!;
            return [name, drawnAs(person, parts!.own.get(person)!.tag)];
          }),
        ),
        plinth: parts.atRisk !== null,
        atRisk: parts.atRisk ? Number(parts.atRisk.textContent) : people.length,
        lean: Number(drawn.dataset.lean),
        blocks: landed,
        top: landed > 0 ? placed(blocks[landed - 1]!) : null,
        moods: Object.fromEntries(
          people.map((person) => [person.dataset.person!, person.dataset.mood!]),
        ),
        sweat: people
          .filter((person) => parts!.own.get(person)!.sweat.getAttribute('display') !== 'none')
          .map((person) => person.dataset.person!),
        spotlight: opacityOf(parts.spotlight),
        dimmed: people
          .filter((person) => after(person, parts!.spotlight))
          .map((person) => person.dataset.person!),
        lit: people
          .filter(
            (person) =>
              after(parts!.spotlight, person) &&
              after(parts!.spotlight, parts!.own.get(person)!.tag),
          )
          .map((person) => person.dataset.person!),
        bench: parts.bench,
        holding: people
          .filter((person) => person.dataset.holding === 'true')
          .map((person) => person.dataset.person!),
        reaching: Object.fromEntries(
          people
            .filter((person) => person.dataset.reaching === 'true')
            .map((person) => [
              person.dataset.person!,
              Number(
                /rotate\((-?[\d.]+)deg\)/.exec(person.querySelector('svg')!.style.transform)?.[1] ??
                  0,
              ),
            ]),
        ),
        bubbles: bubbles.flatMap((bubble, id) =>
          opacityOf(bubble) > 0
            ? [
                {
                  text: bubble.textContent ?? '',
                  id,
                  by: bubble.dataset.by,
                  x: Number.parseFloat(bubble.style.left),
                  y: Number.parseFloat(bubble.style.top),
                },
              ]
            : [],
        ),
        stacked: [...people]
          .sort((one, two) => (after(one, two) ? -1 : 1))
          .map((person) => person.dataset.person!),
        fallen: Number(drawn.dataset.fallen ?? 0),
        speedLines: parts.speedLines !== null && opacityOf(parts.speedLines) > 0,
        dust: parts.dust.filter((puff) => opacityOf(puff) > 0).length,
        them: placementOf(them, theirTag),
        hat: hat && opacityOf(hat) > 0 ? { y: Number(gsap.getProperty(hat, 'y')) } : null,
        drawn: blocks
          .filter((block) => opacityOf(block) > 0)
          .map((block) => ({
            ...placed(block)!,
            width: Number.parseFloat(block.style.width),
            height: Number.parseFloat(block.style.height),
            under: [
              ...overAll,
              ...between.filter((tag) => after(block, tag)).map((tag) => tag.textContent!),
            ],
          })),
      });
      // How they ended up, once the show is all but over.
      if (time < plan.end - 0.5) return;
      const follows = (element: Element) => after(element, them);
      end = {
        inFront:
          people.every((person) => person === them || follows(person)) && blocks.every(follows),
        scale: Number(gsap.getProperty(them, 'scale')),
        rests: blocks.map((block) => placed(block)!),
      };
    },
  });
  holding.disconnect();
  // Cancelled at `until`, the show stops on the abort it's sent; otherwise it plays out cleanly.
  if (until === undefined) {
    expect(record.error).toBeUndefined();
    expect(record.outcome).toBe('finished');
  } else {
    expect(record.outcome).toBe('cancelled');
  }
  return {
    frames,
    record,
    plan,
    words,
    kinds,
    built,
    shirts,
    lifts,
    cues,
    end,
  };
}

/**
 * Where `person` is drawn, with the box of their name `tag` as the kit sets
 * it (empty while it hides), and whether they sit on the bench.
 */
export function drawnAs(person: HTMLElement, tag: HTMLElement) {
  const size = Number.parseFloat(person.style.width);
  const name = person.dataset.person!;
  const spot: Spot = {
    x: Number.parseFloat(person.style.left) + size / 2,
    y: Number.parseFloat(person.style.top) + 0.8 * size,
    size,
    tag: { size: sizeOf(tag), maxWidth: Number.parseFloat(tag.style.maxWidth) },
    row: 'front',
  };
  // calc(50% + 12px), or as the browser writes a move left, calc(50% - 7px).
  const shift = /calc\(50% ([+-]) (-?[\d.e]+)px\)/.exec(tag.style.left);
  const by = shift ? (shift[1] === '-' ? -1 : 1) * Number(shift[2]) : 0;
  const box = tagBox(spot, drawnWidth(name, tag), by);
  // A hidden tag takes no room: an empty box where it would be.
  const hidden = tag.style.visibility === 'hidden';
  return {
    spot,
    tag: hidden ? { ...box, right: box.left, bottom: box.top } : box,
    benched: person.dataset.benched === 'true',
  };
}

/** Where `person` is drawn and how big, with their name tag: the same string while they hold still. */
export function placementOf(person: HTMLElement, tag: HTMLElement): string {
  const { left, top, transform } = person.style;
  return [left, top, transform, tag.style.left, tag.style.transform].join(' | ');
}

/** Each time a block lands: the frame's time and how many have landed. */
export const landings = (frames: readonly Frame[]) =>
  frames.filter((frame, index) => index > 0 && frame.blocks > frames[index - 1]!.blocks);

/**
 * The times the lean turns back, frame to frame. Standing still for a tenth
 * of a second or more ends a sway, so moving off again from rest isn't one.
 */
export function turnsBack(frames: readonly Frame[]): number[] {
  const times: number[] = [];
  let direction = 0;
  let still = 0;
  frames.forEach((frame, index) => {
    if (index === 0) return;
    const previous = frames[index - 1]!;
    const delta = frame.lean - previous.lean;
    if (Math.abs(delta) < 1e-6) {
      still += frame.time - previous.time;
      if (still > 0.1 - 1e-9) direction = 0;
      return;
    }
    still = 0;
    if (direction !== 0 && Math.sign(delta) !== direction) times.push(previous.time);
    direction = Math.sign(delta);
  });
  return times;
}

/** How many times the lean changes direction, however long it holds still in between. */
export function reversals(frames: readonly Frame[]): number {
  let direction = 0;
  let count = 0;
  frames.forEach((frame, index) => {
    if (index === 0) return;
    const delta = frame.lean - frames[index - 1]!.lean;
    if (Math.abs(delta) < 1e-6) return;
    if (direction !== 0 && Math.sign(delta) !== direction) count++;
    direction = Math.sign(delta);
  });
  return count;
}

/** The seconds from each time the lean turns back to the next, within one sway. */
export function swings(frames: readonly Frame[]): number[] {
  const all: number[] = [];
  let direction = 0;
  let still = 0;
  let last: number | null = null;
  frames.forEach((frame, index) => {
    if (index === 0) return;
    const previous = frames[index - 1]!;
    const delta = frame.lean - previous.lean;
    if (Math.abs(delta) < 1e-6) {
      still += frame.time - previous.time;
      if (still > 0.1 - 1e-9) [direction, last] = [0, null];
      return;
    }
    still = 0;
    if (direction !== 0 && Math.sign(delta) !== direction) {
      if (last !== null) all.push(previous.time - last);
      last = previous.time;
    }
    direction = Math.sign(delta);
  });
  return all;
}

/** The most times the lean turns back within any one second. */
export const swaysPerSecond = (frames: readonly Frame[]) => {
  const times = turnsBack(frames);
  return Math.max(0, ...times.map((from) => times.filter((t) => t >= from && t < from + 1).length));
};

/** Where everyone is over a show of `plan`, worked out once for each plan. */
const placesByPlan = new WeakMap<Plan, Places>();
export const placesOf = (plan: Plan) => {
  let places = placesByPlan.get(plan);
  if (!places) placesByPlan.set(plan, (places = placings(plan)));
  return places;
};
/** Where `name` stands at `t` in a run of `plan`. */
export const spotOf = (plan: Plan, name: string, t = 0) => placesOf(plan).at(name, t);

/** 8 people, Luca unlucky, seed 1: run once and shared by the scenarios that watch it. */
let eightShow: ReturnType<typeof watch> | undefined;
export const eightRun = () => (eightShow ??= watch(names(8), 'Luca'));

/** 8 people, Luca unlucky, the first seed that falls with 2 left: run once and shared. */
let twoLeftShow: ReturnType<typeof watch> | undefined;
export const twoLeftRun = () =>
  (twoLeftShow ??= watch(names(8), 'Luca', {
    seed: seedOf(names(8), 'Luca', (plan) => plan.fallsWith === 2),
  }));

/**
 * Where `turn`'s block is drawn in each frame of `frames` from its lift until
 * it lands, and the top of the tower it lands on as drawn then.
 */
export function flightOf(frames: readonly Frame[], plan: Plan, turn: Turn) {
  const k = 2 + plan.turns.indexOf(turn);
  return frames
    .filter((frame) => frame.time >= turn.lifts - 1e-9 && frame.time < turn.lands - 1e-9)
    .map((frame) => ({ time: frame.time, block: frame.drawn[k]!, top: frame.drawn[k - 1]! }));
}

/** How many times a block dips in `ys`, its centre's y frame by frame: down, then back up. */
export function dipsIn(ys: readonly number[]): number {
  let dips = 0;
  let going = 0;
  ys.slice(1).forEach((y, index) => {
    const delta = y - ys[index]!;
    if (Math.abs(delta) < 1e-6) return;
    if (going > 0 && delta < 0) dips++;
    going = Math.sign(delta);
  });
  return dips;
}

/**
 * After each paper block and each round but the last, the tower sways a
 * degree or more and is back upright (under half a degree) in the frame
 * before the next round's first block lands: the next turn's weight comes on
 * a settled tower. A pair's two blocks land together, as one round.
 */
export function expectSwaysAndSettles(frames: readonly Frame[], plan: Plan, label: string) {
  const landed = landings(frames);
  // How many blocks are down as each paper block and each round but the last ends.
  const ends = [
    1,
    2,
    ...plan.turns.flatMap((turn, index) => {
      const next = plan.turns[index + 1];
      return next && next.round !== turn.round ? [3 + index] : [];
    }),
  ];
  for (const end of ends) {
    const landing = landed.find((frame) => frame.blocks >= end)!;
    const next = landed.find((frame) => frame.blocks > end)!;
    const between = frames.filter((frame) => frame.time >= landing.time && frame.time < next.time);
    const at = `${label}, block ${end}`;
    expect(Math.max(...between.map((frame) => Math.abs(frame.lean))), at).toBeGreaterThanOrEqual(1);
    expect(Math.abs(between.at(-1)!.lean), at).toBeLessThan(0.5);
  }
}

/** Eight of the team, Marco, Luca, Priya and Ben among them. */
export const MARCO_TEAM = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Luca', 'Marco', 'Priya'];

/** The first seed from 1 whose plan for `team` and `unlucky` passes `test`. */
export function seedOf(
  team: readonly string[],
  unlucky: string,
  test: (plan: Plan) => boolean,
): number {
  for (let seed = 1; seed < 50_000; seed++) {
    if (test(planShow(team, unlucky, createRandom(seed)))) return seed;
  }
  throw new Error('no seed has it');
}

/** 8 with Marco unlucky, seed 1: run once and shared by the scenarios that watch it. */
let marcoShow: ReturnType<typeof watch> | undefined;
export const marcoRun = () => (marcoShow ??= watch(MARCO_TEAM, 'Marco'));

/** 8 people, Luca unlucky, once with each ending: run once and shared. */
let endingShows: Promise<{ ending: Ending; run: Awaited<ReturnType<typeof watch>> }[]> | undefined;
export const endingRuns = () =>
  (endingShows ??= (async () => {
    const all = [];
    for (const ending of ENDINGS) {
      const seed = seedOf(names(8), 'Luca', (plan) => plan.ending === ending);
      all.push({ ending, run: await watch(names(8), 'Luca', { seed }) });
    }
    return all;
  })());

/** The captions' words, in the order they showed. */
export const texts = (record: ShowRecord) => record.captions.map((caption) => caption.text);

/** A caption and the show seconds it's planned for. */
export interface Planned {
  readonly text: string;
  readonly at: number;
}

/**
 * Every caption of a show of \`plan\`, in order, at the moment the timing
 * table gives it: the opening, each round's thrower or pair (the first along
 * first), Nearly, "Final three!" and "Final two!",
 * the ending, and "{unlucky} toppled it!" a READ after the fall.
 */
export function plannedCaptions(plan: Plan): Planned[] {
  const count = plan.order.length;
  const all: Planned[] = [
    { text: 'Whoever topples it gets the job!', at: 0 },
    {
      text:
        count === 2
          ? 'Just the two of you…'
          : count === 3
            ? 'Just the three of you…'
            : "Hold the tower, and you're safe!",
      at: 1.2,
    },
  ];
  for (const round of roundsOf(plan)) {
    const turn = round[0]!;
    const [a, b] = round.map((each) => each.by);
    all.push({ text: b ? `${a} & ${b}!` : `${a}'s turn`, at: turn.named });
    if (turn.nearly) {
      all.push({ text: 'Whoa…', at: turn.lands + 0.25 }, { text: 'Nearly!', at: turn.lands + 1.3 });
    }
  }
  if (count >= 4) all.push({ text: 'Final three!', at: plan.spotlight });
  if (plan.finalTwo !== null) all.push({ text: 'Final two!', at: plan.finalTwo });
  const last = plan.turns.at(-1)!;
  if (plan.ending === 'dead-still') all.push({ text: 'Uh-oh…', at: last.lands });
  if (plan.ending === 'slow-lean') all.push({ text: "It's leaning…", at: last.lands });
  if (plan.ending === 'it-holds') {
    all.push({ text: 'It holds!', at: plan.still.from }, { text: '…or not!', at: plan.still.to });
  }
  all.push({ text: `${plan.falls} toppled it!`, at: plan.still.to + READ });
  return all.sort((a, b) => a.at - b.at);
}

/** The frame the last block comes to rest in the heap. */
export const heaped = (frames: readonly Frame[], plan: Plan) =>
  frames.find((frame) => frame.fallen === 2 + plan.turns.length)!;

/** Each bubble's stay on stage: what it says, where its tail is first, and its first and last frames. */
export function said(
  frames: readonly Frame[],
): (Point & { text: string; from: number; to: number })[] {
  const all: (Point & { text: string; from: number; to: number })[] = [];
  const open = new Map<number, (typeof all)[number]>();
  frames.forEach((frame, index) => {
    const now = new Set<number>();
    for (const bubble of frame.bubbles) {
      const key = bubble.id;
      now.add(key);
      const stay = open.get(key);
      if (stay && frames[index - 1]?.time === stay.to) stay.to = frame.time;
      else {
        const fresh = { ...bubble, from: frame.time, to: frame.time };
        all.push(fresh);
        open.set(key, fresh);
      }
    }
    for (const key of open.keys()) if (!now.has(key)) open.delete(key);
  });
  return all;
}

/** The hard hat's box on someone at `spot` grown at the end: on the head's 100 grid, x 6–94, y 4–40. */
export function hatBox(spot: Spot): Box {
  const { head } = grownBoxes(spot);
  const size = head.right - head.left;
  return {
    left: head.left + 0.06 * size,
    right: head.left + 0.94 * size,
    top: head.top + 0.04 * size,
    bottom: head.top + 0.4 * size,
  };
}

/**
 * The last turn and the fall of `run`, as the rules have them: every caption
 * up for a second, in order, each at its moment; the tower barely moving for
 * half a second before it falls; "{unlucky} toppled it!" up as the last block
 * lands in the heap; the bubbles; and the unlucky person still at the end.
 */
export function expectEndingPlayed(
  run: Awaited<ReturnType<typeof watch>>,
  unlucky: string,
  label: string,
) {
  const { frames, plan, record, cues } = run;
  const last = plan.turns.at(-1)!;
  const falls = plan.still.to;
  const captions = record.captions;
  for (const caption of captions) {
    expect(caption.to - caption.from, `${label}: ${caption.text}`).toBeGreaterThanOrEqual(1 - 1e-9);
  }
  // Every caption, in order, each at its moment.
  const planned = plannedCaptions(plan);
  expect(
    captions.map((caption) => caption.text),
    label,
  ).toEqual(planned.map((caption) => caption.text));
  captions.forEach((caption, index) => {
    const { text, at } = planned[index]!;
    expect(caption.from, `${label}: ${text}`).toBeGreaterThanOrEqual(at - 1e-9);
    expect(caption.from, `${label}: ${text}`).toBeLessThanOrEqual(at + STEP + 1e-9);
  });
  const toppled = captions.at(-1)!;
  expect(toppled.text, label).toBe(`${unlucky} toppled it!`);
  const down = heaped(frames, plan);
  expect(down, label).toBeDefined();
  expect(toppled.from - down.time, label).toBeGreaterThanOrEqual(-1e-9);
  expect(toppled.from - down.time, label).toBeLessThanOrEqual(0.2);

  // Barely moving for half a second, then falling at once, toward them.
  const still = frames.filter((frame) => frame.time >= falls - 0.5 - 1e-9 && frame.time <= falls);
  expect(still[0]!.time, label).toBeLessThanOrEqual(falls - 0.5 + STEP);
  const leans = still.map((frame) => frame.lean);
  expect(Math.max(...leans) - Math.min(...leans), label).toBeLessThan(1);
  const soon = frames.find(
    (frame) =>
      frame.time > falls && frame.time <= falls + 0.5 && Math.abs(frame.lean - leans.at(-1)!) >= 1,
  );
  expect(soon, label).toBeDefined();
  const side = sideOf(spotOf(plan, unlucky, plan.end));
  expect(Math.sign(frames.at(-1)!.lean), label).toBe(side);
  for (const rest of run.end.rests) expect(Math.sign(rest.x - 640), label).toBe(side);

  // Their name holds still for the show's last 1.5 seconds.
  const end = frames.filter((frame) => frame.time >= record.duration - 1.5 - 1e-9);
  expect(end[0]!.time, label).toBeLessThanOrEqual(record.duration - 1.5 + STEP);
  for (const frame of end) expect(frame.them, `${label} at ${frame.time}`).toBe(end[0]!.them);

  // The bubbles, each up 0.8 s or more.
  const bubbles = said(frames);
  const saying = (text: string, from: number, to = Infinity) => {
    const found = bubbles.find(
      (each) => each.text === text && each.from >= from - 1e-9 && each.from <= to,
    );
    expect(found, `${label}: ${text}`).toBeDefined();
    expect(found!.to + STEP - found!.from, `${label}: ${text}`).toBeGreaterThanOrEqual(
      0.8 - STEP - 1e-6,
    );
    return found!;
  };
  if (plan.ending === 'dead-still') {
    const creak = saying('creak…', last.lands, falls);
    // Nearly creaks too, before the last turn.
    const heard = cues.filter((each) => each.cue === 'creak' && each.time >= last.lands);
    expect(heard, label).toHaveLength(1);
    expect(Math.abs(heard[0]!.time - creak.from), label).toBeLessThanOrEqual(STEP + 1e-9);
  }
  if (plan.ending === 'it-holds') {
    // Level with them: beside them where there's room, else pushed along their row.
    const phew = saying('Phew!', plan.still.from, plan.still.from + STEP + 1e-9);
    const them = spotOf(plan, unlucky, plan.end);
    expect(Math.abs(phew.y - them.y), label).toBeLessThan(them.size + 120);
  }
  const timber = saying('Timber!', falls, falls + STEP + 1e-9);
  const box = speechBox('Timber!', timber);
  const spot = spotOf(plan, unlucky, plan.end);
  expect(overlap(box, grownBoxes(spot).head), label).toBe(false);
  expect(overlap(box, hatBox(spot)), label).toBe(false);
}

/** `count` of the normal names, the last unlucky, seed 1: run once and shared by the scenarios that watch it. */
const normalShows = new Map<number, ReturnType<typeof watch>>();
export const normalRun = (count: number) => {
  let run = normalShows.get(count);
  if (!run) {
    const team = NORMAL.slice(0, count);
    run = watch(team, team.at(-1)!);
    normalShows.set(count, run);
  }
  return run;
};

/** Whether a name tag's box is drawn: a hidden one's is empty. */
export const shows = (tag: Box) => tag.right > tag.left;

/**
 * In every frame: no name tag over another, or under a block without being
 * drawn over it; and every tag on the 1280 × 720 stage.
 */
export function expectTagsClear(frames: readonly Frame[], label: string) {
  for (const frame of frames) {
    const at = `${label} at ${frame.time.toFixed(3)}`;
    const tags = Object.entries(frame.people)
      .map(([name, { tag }]) => ({ name, tag }))
      .filter(({ tag }) => shows(tag));
    tags.forEach(({ name, tag }, index) => {
      for (const other of tags.slice(index + 1)) {
        expect(overlap(tag, other.tag), `${at}: ${name} and ${other.name}`).toBe(false);
      }
      expect(tag.left, `${at}: ${name}`).toBeGreaterThanOrEqual(0);
      expect(tag.right, `${at}: ${name}`).toBeLessThanOrEqual(1280);
      expect(tag.bottom, `${at}: ${name}`).toBeLessThanOrEqual(720);
      for (const block of frame.drawn) {
        if (blockOverlaps(block, tag)) expect(block.under, `${at}: ${name}`).toContain(name);
      }
    });
  }
}

/** The rows `names` (at risk, in standing order) stand in: each keeps the one they start in. */
export const startingRowsOf = (plan: Plan, names: readonly string[]) =>
  names.map((name) => startingRows(plan.order.length)[plan.order.indexOf(name)]!);

/**
 * A bubble saying `text` that pops up at `at` beside the head of someone at
 * `spot`, up 0.8 s or more: level with them, beside them where there's room,
 * else pushed along their row.
 */
export function expectBeside(
  bubbles: ReturnType<typeof said>,
  text: string,
  at: number,
  spot: Spot,
  label: string,
) {
  const found = bubbles.find(
    (bubble) =>
      bubble.text === text &&
      bubble.from >= at - 1e-9 &&
      bubble.from <= at + STEP + 1e-6 &&
      Math.abs(bubble.y - spot.y) < spot.size + 120,
  );
  expect(found, `${label}: ${text} at ${at}`).toBeDefined();
  expect(found!.to + STEP - found!.from, label).toBeGreaterThanOrEqual(0.8 - STEP - 1e-6);
}

/** In every frame, no two bubbles showing overlap. */
export function expectBubblesApart(frames: readonly Frame[], label: string) {
  for (const frame of frames) {
    const boxes = frame.bubbles.map((bubble) => ({
      text: bubble.text,
      box: speechBox(bubble.text, bubble),
    }));
    boxes.forEach(({ text, box }, index) => {
      for (const other of boxes.slice(index + 1)) {
        expect(
          overlap(box, other.box),
          `${label} at ${frame.time.toFixed(3)}: ${text} and ${other.text}`,
        ).toBe(false);
      }
    });
  }
}
