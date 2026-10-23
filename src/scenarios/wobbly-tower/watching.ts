// Runs Wobbly Tower frame by frame and reads what the stage showed, for the
// tests in this folder.

import { expect } from 'vitest';
import { gsap } from 'gsap';
import { runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { nameTag, speechBox, type Cue, type Scenario } from '../../scenario-kit';
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
import {
  overlap,
  sideOf,
  spots,
  tagBox,
  placeTags,
  tagContentWidth,
  tower,
  type Block,
  type Box,
  type Point,
  type Spot,
} from './layout';
import { PIGEON_FEET, POINTER } from './parts';
import { grownBoxes } from './play';

export const POINTER_MOVES: readonly PointerMove[] = ['straight', 'fake-out', 'again'];
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
  'Maria Giulia Bianchi-Rossi Jr.',
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
export const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);
/** When `beat` starts, in show seconds. */
export const startOf = (plan: Plan, beat: Beat) => plan.starts[beat];
/** Whether anyone takes two turns in a row, the last turn left out. */
export const repeatsBeforeLast = (plan: Plan) =>
  plan.turns.slice(0, -1).some((turn, index) => index > 0 && turn.by === plan.turns[index - 1]!.by);

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

/** Whether a point is inside a box. */
export const inside = (box: Box, point: { x: number; y: number }) =>
  point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
/** Whether any two boxes overlap. */
export const anyOverlap = (boxes: Box[]) =>
  boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlap(box, other)));
/** The tag boxes as the kit sets them, placed as placeTags says: `called[i]` stands at spot i. */
export function tagsFor(all: Spot[], called: readonly string[]): Box[] {
  const widths = all.map((spot, index) => {
    const name = called[index]!;
    const tag = nameTag(name, { size: spot.tag.size, maxWidth: spot.tag.maxWidth, chest: true });
    const lines = tag.dataset.lines === '2' ? (2 as const) : (1 as const);
    return tagContentWidth(name, spot.tag.size, Number.parseFloat(tag.style.maxWidth), lines);
  });
  const shifts = placeTags(all, widths);
  return all.map((spot, index) => tagBox(spot, widths[index], shifts[index]));
}
/** The test team's names without the 30-character one, and one more to make twelve. */
export const NORMAL = [...TEAM.slice(0, -1), 'Zoe'];
/**
 * The spots and the tag boxes of the normal names at `count` people, every
 * name at every spot in turn (the names shifted round one place each time).
 */
export const casts = (count: number) => {
  const all = spots(count);
  const pool = NORMAL.slice(0, count);
  return pool.map((_, round) => ({
    all,
    boxes: tagsFor(
      all,
      pool.map((__, index) => pool[(index + round) % count]!),
    ),
  }));
};
/** The full test team at 12 (and its first and last at 2), standing as the plan with seed 1 has it. */
export const shownAt = (count: number) => {
  const team = count === 12 ? TEAM : [TEAM[0]!, TEAM.at(-1)!];
  const { order } = planShow(team, team.at(-1)!, createRandom(1));
  const all = spots(count);
  return { all, boxes: tagsFor(all, order) };
};

/** Leans from -22 to 22 degrees. */
export const LEANS = Array.from({ length: 45 }, (_, index) => index - 22);
/** How tall the tower may end: 2 paper blocks and 7 to 9 turns. */
export const HEIGHTS = [9, 10, 11];

/** Show seconds per recorded frame. */
export const STEP = 1 / 30;

/** What the stage showed in one frame. */
export interface Frame {
  readonly time: number;
  readonly beat: string;
  /** Whom the pointer has stopped over; '' while it hops, and before the first turn. */
  readonly over: string;
  /** Where the pointer's tip is, and how opaque it's drawn: 0 hidden, 1 fully. */
  readonly pointer: Point & { readonly shown: number };
  /** The tower's lean in degrees, positive to the right of the stage. */
  readonly lean: number;
  /** How many blocks have landed on the tower. */
  readonly blocks: number;
  /** The top landed block's centre and turn, as drawn; null before the first lands. */
  readonly top: (Point & { readonly turn: number }) | null;
  readonly moods: Readonly<Record<string, string>>;
  /** Who holds a block overhead. */
  readonly holding: readonly string[];
  /** Where the pigeon's feet are, and its pose, while it's on stage. */
  readonly pigeon: (Point & { readonly pose: string }) | null;
  /** The speech bubbles showing, and where their tails point. */
  readonly bubbles: readonly (Point & { readonly text: string })[];
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

/**
 * Runs Wobbly Tower and notes what the stage showed every frame. With
 * `until`, the show is cancelled at that many show seconds.
 */
export async function watch(
  team: readonly string[],
  unlucky: string,
  {
    seed = 1,
    step = STEP,
    until,
    reducedMotion = false,
  }: { seed?: number; step?: number; until?: number; reducedMotion?: boolean } = {},
): Promise<{
  frames: Frame[];
  record: ShowRecord;
  plan: Plan;
  sign: string;
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
  let sign = '';
  let built: Built[] = [];
  let shirts: Record<string, string> = {};
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts:
    | {
        scene: HTMLElement;
        tower: HTMLElement;
        blocks: HTMLElement[];
        people: HTMLElement[];
        pointer: HTMLElement;
        /** Only in a run with the pigeon. */
        pigeon: SVGElement | null;
        bubbles: HTMLElement[];
        them: HTMLElement;
        hat: SVGElement | null;
        speedLines: HTMLElement | null;
        dust: HTMLElement[];
        tags: HTMLElement[];
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
        pointer: stage.querySelector<HTMLElement>('[data-part="pointer"]')!,
        pigeon: stage.querySelector<SVGElement>('[data-part="pigeon"]'),
        bubbles: [...stage.querySelectorAll<HTMLElement>('[data-part="bubble"]')],
        them: [...stage.querySelectorAll<HTMLElement>('[data-person]')].find(
          (person) => person.dataset.person === unlucky,
        )!,
        hat: stage.querySelector<SVGElement>('[data-part="hard-hat"]'),
        speedLines: stage.querySelector<HTMLElement>('[data-part="speed-lines"]'),
        dust: [...stage.querySelectorAll<HTMLElement>('[data-part="dust"]')],
        tags: [...stage.querySelectorAll<HTMLElement>('[data-on="chest"]')],
      };
      const { scene, tower: drawn, blocks, people, pointer, pigeon, bubbles, them, hat } = parts;
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
      if (!sign) {
        for (const person of people) {
          holding.observe(person, { attributeFilter: ['data-holding'], attributeOldValue: true });
        }
        sign = pointer.textContent ?? '';
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
      const pigeonShown = pigeon !== null && opacityOf(pigeon) > 0;
      frames.push({
        time,
        beat: scene.dataset.beat!,
        over: pointer.dataset.over!,
        pointer: {
          x: Number(gsap.getProperty(pointer, 'x')) + POINTER.tip.x,
          y: Number(gsap.getProperty(pointer, 'y')) + POINTER.tip.y,
          shown: opacityOf(pointer),
        },
        lean: Number(drawn.dataset.lean),
        blocks: landed,
        top: landed > 0 ? placed(blocks[landed - 1]!) : null,
        moods: Object.fromEntries(
          people.map((person) => [person.dataset.person!, person.dataset.mood!]),
        ),
        holding: people
          .filter((person) => person.dataset.holding === 'true')
          .map((person) => person.dataset.person!),
        pigeon: pigeonShown
          ? {
              x: Number(gsap.getProperty(pigeon, 'x')) + PIGEON_FEET.x,
              y: Number(gsap.getProperty(pigeon, 'y')) + PIGEON_FEET.y,
              pose: pigeon.dataset.pose!,
            }
          : null,
        bubbles: bubbles
          .filter((bubble) => opacityOf(bubble) > 0)
          .map((bubble) => ({
            text: bubble.textContent ?? '',
            x: Number.parseFloat(bubble.style.left),
            y: Number.parseFloat(bubble.style.top),
          })),
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
      if (time < plan.starts.timber + plan.beats.timber - 0.5) return;
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
  expect(record.error).toBeUndefined();
  if (until === undefined) expect(record.outcome).toBe('finished');
  return {
    frames,
    record,
    plan,
    sign,
    built,
    shirts,
    lifts,
    cues,
    end,
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

/** The stretches the pointer stays over someone: who, and the frames' times. */
export function stops(frames: readonly Frame[]): { name: string; from: number; to: number }[] {
  const all: { name: string; from: number; to: number }[] = [];
  frames.forEach((frame, index) => {
    if (!frame.over) return;
    const previous = frames[index - 1];
    if (previous?.over === frame.over) all.at(-1)!.to = frame.time;
    else all.push({ name: frame.over, from: frame.time, to: frame.time });
  });
  return all;
}

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

/** The tag boxes at `count` people standing in `order`, as the kit sets them. */
export const tagsOf = (order: readonly string[]) => tagsFor(spots(order.length), order);

/** The pointer's whole box with its tip at `tip`. */
export const pointerBox = (tip: Point): Box => ({
  left: tip.x - POINTER.tip.x,
  right: tip.x - POINTER.tip.x + POINTER.width,
  top: tip.y - POINTER.tip.y,
  bottom: tip.y - POINTER.tip.y + POINTER.height,
});

/** Where `name` stands in a run of `plan`. */
export const spotOf = (plan: Plan, name: string) =>
  spots(plan.order.length)[plan.order.indexOf(name)]!;

/** The top centre of the top block of `count` blocks leaning `lean`. */
export function topOf(count: number, lean: number): Point {
  const block = tower(count, lean).at(-1)!;
  const a = (block.turn * Math.PI) / 180;
  return {
    x: block.x + (block.height / 2) * Math.sin(a),
    y: block.y - (block.height / 2) * Math.cos(a),
  };
}

/** 8 people, Luca unlucky, seed 1: run once and shared by the scenarios that watch it. */
let eightShow: ReturnType<typeof watch> | undefined;
export const eightRun = () => (eightShow ??= watch(names(8), 'Luca'));

/**
 * After each block but the last turn's, the tower sways a degree or more and
 * is back upright (under half a degree) in the frame before the next block
 * lands: the next turn's weight comes on a settled tower.
 */
export function expectSwaysAndSettles(frames: readonly Frame[], label: string) {
  const landed = landings(frames);
  landed.slice(0, -1).forEach((landing, index) => {
    const next = landed[index + 1]!;
    const between = frames.filter((frame) => frame.time >= landing.time && frame.time < next.time);
    const at = `${label}, block ${landing.blocks}`;
    expect(Math.max(...between.map((frame) => Math.abs(frame.lean))), at).toBeGreaterThanOrEqual(1);
    expect(Math.abs(between.at(-1)!.lean), at).toBeLessThan(0.5);
  });
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

/** The caption the last turn starts with. */
export function pointerCaptionOf(plan: Plan, unlucky: string): string {
  if (plan.pointer === 'fake-out') return `${plan.phew}… nope, ${unlucky}!`;
  if (plan.pointer === 'again') return `${unlucky}… again?!`;
  return `${unlucky}…`;
}

/** The captions each ending shows before the fall. */
export const ENDING_CAPTIONS: Record<Ending, readonly string[]> = {
  'dead-still': ['Uh-oh…'],
  'it-holds': ['It holds!', '…or not!'],
  'slow-lean': ["It's leaning…"],
};

/** The frame the last block comes to rest in the heap. */
export const heaped = (frames: readonly Frame[], plan: Plan) =>
  frames.find((frame) => frame.fallen === 2 + plan.turns.length)!;

/** Each bubble's stay on stage: what it says, where its tail is, and its first and last frames. */
export function said(
  frames: readonly Frame[],
): (Point & { text: string; from: number; to: number })[] {
  const all: (Point & { text: string; from: number; to: number })[] = [];
  const open = new Map<string, (typeof all)[number]>();
  frames.forEach((frame, index) => {
    const now = new Set<string>();
    for (const bubble of frame.bubbles) {
      const key = `${bubble.text}@${bubble.x},${bubble.y}`;
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
  const nearly = only(plan, 'nearly');
  const falls = plan.still.to;
  const captions = record.captions;
  for (const caption of captions) {
    expect(caption.to - caption.from, `${label}: ${caption.text}`).toBeGreaterThanOrEqual(1 - 1e-9);
  }
  // From "Nearly!" on, in order.
  const fromNearly = captions.slice(captions.findIndex((caption) => caption.text === 'Nearly!'));
  expect(
    fromNearly.map((caption) => caption.text),
    label,
  ).toEqual([
    'Nearly!',
    pointerCaptionOf(plan, unlucky),
    ...ENDING_CAPTIONS[plan.ending],
    `${unlucky} toppled it!`,
  ]);
  const [shown, pointerCaption, ...rest] = fromNearly;
  expect(shown!.from, label).toBeLessThanOrEqual(nearly.lands + STEP + 1e-9);
  // It names them once the pointer is on its way to them: as it hops on
  // from the decoy, as it stops over them, or as the turn starts when it
  // stays on them.
  const named = pointerCaption!.from;
  const lastStops = stops(frames.filter((frame) => frame.time >= startOf(plan, 'last-turn')));
  if (plan.pointer === 'fake-out') {
    const decoy = lastStops.find((stop) => stop.name === plan.phew)!;
    expect(named, label).toBeGreaterThan(decoy.to);
    expect(named, label).toBeLessThanOrEqual(decoy.to + STEP + 1e-9);
  } else if (plan.pointer === 'straight') {
    expect(named, label).toBeGreaterThanOrEqual(last.stops - 1e-9);
    expect(named, label).toBeLessThanOrEqual(last.stops + STEP + 1e-9);
    expect(frames.find((frame) => frame.time >= named - 1e-9)!.over, label).toBe(unlucky);
  } else {
    expect(named, label).toBeLessThanOrEqual(startOf(plan, 'last-turn') + 0.15);
  }
  const toppled = rest.at(-1)!;
  const onTime = (caption: { from: number }, time: number, text: string) => {
    expect(caption.from, `${label}: ${text}`).toBeGreaterThanOrEqual(time - 1e-9);
    expect(caption.from, `${label}: ${text}`).toBeLessThanOrEqual(time + STEP + 1e-9);
  };
  if (plan.ending === 'it-holds') {
    onTime(rest[0]!, plan.still.from, 'It holds!');
    onTime(rest[1]!, falls, '…or not!');
  } else {
    // At the freeze or the lean, or as soon after as the pointer caption's
    // second allows, before the fall.
    expect(rest[0]!.from, label).toBeGreaterThanOrEqual(last.lands - 1e-9);
    expect(rest[0]!.from, label).toBeLessThanOrEqual(Math.max(last.lands, named + 1) + STEP + 1e-9);
    expect(rest[0]!.from, label).toBeLessThan(falls);
  }
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
  const side = sideOf(spotOf(plan, unlucky));
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
  if (plan.pointer === 'fake-out') saying('Phew!', startOf(plan, 'nearly'), last.stops);
  if (plan.pointer === 'again') saying('Me again?!', last.stops, last.lands);
  if (plan.ending === 'dead-still') {
    const creak = saying('creak…', last.lands, falls);
    const heard = cues.filter((each) => each.cue === 'creak');
    expect(heard, label).toHaveLength(1);
    expect(Math.abs(heard[0]!.time - creak.from), label).toBeLessThanOrEqual(STEP + 1e-9);
  }
  if (plan.ending === 'it-holds') {
    // Level with them: beside them where there's room, else pushed along their row.
    const phew = saying('Phew!', plan.still.from, plan.still.from + STEP + 1e-9);
    const them = spotOf(plan, unlucky);
    expect(Math.abs(phew.y - them.y), label).toBeLessThan(them.size + 120);
  }
  const timber = saying('Timber!', falls, falls + STEP + 1e-9);
  const box = speechBox('Timber!', timber);
  const spot = spotOf(plan, unlucky);
  expect(overlap(box, grownBoxes(spot).head), label).toBe(false);
  expect(overlap(box, hatBox(spot)), label).toBe(false);
}
