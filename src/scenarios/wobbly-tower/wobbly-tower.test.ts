import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { gsap } from 'gsap';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import { handOutLooks, nameTag, type Cue, type Scenario } from '../../scenario-kit';
import wobblyTower from './index';
import {
  BEATS,
  planShow,
  READ,
  type Beat,
  type Ending,
  type Plan,
  type PointerMove,
  type Turn,
} from './plan';
import {
  HEAP_BAND,
  blockOverlaps,
  blockBox,
  headBox,
  heap,
  heldBlock,
  overlap,
  pointerTip,
  sideOf,
  signedLean,
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
import { grownBoxes, speechBox } from './play';

const POINTER_MOVES: readonly PointerMove[] = ['straight', 'fake-out', 'again'];
const ENDINGS: readonly Ending[] = ['dead-still', 'it-holds', 'slow-lean'];

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
/** The unlucky person in plan-level runs: the last of the first `count`. */
const unluckyOf = (count: number) => names(count).at(-1)!;

/** Plans for seeds 1 to `seeds`. */
function plans(count: number, seeds = 20, unlucky = unluckyOf(count)): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(names(count), unlucky, createRandom(index + 1)),
  );
}

const during = (plan: Plan, beat: Beat) => plan.turns.filter((turn) => turn.beat === beat);
const only = (plan: Plan, beat: Beat): Turn => {
  const turns = during(plan, beat);
  expect(turns).toHaveLength(1);
  return turns[0]!;
};
const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);
/** When `beat` starts, in show seconds. */
const startOf = (plan: Plan, beat: Beat) => plan.starts[beat];
/** Whether anyone takes two turns in a row, the last turn left out. */
const repeatsBeforeLast = (plan: Plan) =>
  plan.turns.slice(0, -1).some((turn, index) => index > 0 && turn.by === plan.turns[index - 1]!.by);

/** Every head count, with seeds 1–40. */
function everyPlan(): { label: string; plan: Plan; unlucky: string }[] {
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
const inside = (box: Box, point: { x: number; y: number }) =>
  point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
/** Whether any two boxes overlap. */
const anyOverlap = (boxes: Box[]) =>
  boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlap(box, other)));
/** The tag boxes as the kit sets them, placed as placeTags says: `called[i]` stands at spot i. */
function tagsFor(all: Spot[], called: readonly string[]): Box[] {
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
const NORMAL = [...TEAM.slice(0, -1), 'Zoe'];
/**
 * The spots and the tag boxes of the normal names at `count` people, every
 * name at every spot in turn (the names shifted round one place each time).
 */
const casts = (count: number) => {
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
const shownAt = (count: number) => {
  const team = count === 12 ? TEAM : [TEAM[0]!, TEAM.at(-1)!];
  const { order } = planShow(team, team.at(-1)!, createRandom(1));
  const all = spots(count);
  return { all, boxes: tagsFor(all, order) };
};

/** Leans from -22 to 22 degrees. */
const LEANS = Array.from({ length: 45 }, (_, index) => index - 22);
/** How tall the tower may end: 2 paper blocks and 7 to 9 turns. */
const HEIGHTS = [9, 10, 11];

/** Show seconds per recorded frame. */
const STEP = 1 / 30;

/** What the stage showed in one frame. */
interface Frame {
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
interface End {
  /** The unlucky person comes after every other person and every block on the stage. */
  readonly inFront: boolean;
  /** How many times their size they are drawn. */
  readonly scale: number;
  /** Where each block lies, bottom of the tower first. */
  readonly rests: readonly (Point & { readonly turn: number })[];
}

/** A cue the show asked for, and the time of the frame it was asked for in. */
interface Heard {
  readonly cue: Cue;
  readonly time: number;
}

/** Someone doing something, and the time of the frame it shows in. */
interface Moment {
  readonly name: string;
  readonly time: number;
}

/** A tower block as the stage built it: who throws it ('' for paper) and its colour. */
interface Built {
  readonly by: string;
  readonly fill: string;
}

/** Whether `element` is drawn: not hidden, and not fully transparent. */
const opacityOf = (element: HTMLElement | SVGElement) =>
  element.style.visibility === 'hidden' ? 0 : Number(element.style.opacity || 1);

/** A block's centre and turn from the transform play.ts draws it with. */
function placed(block: HTMLElement): (Point & { turn: number }) | null {
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
async function watch(
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
            under: parts!.tags
              .filter(
                (tag) =>
                  (block.compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
              )
              .map((tag) => tag.textContent!),
          })),
      });
      const follows = (element: Element) =>
        (them.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
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
    plan: planShow(team, unlucky, createRandom(seed)),
    sign,
    built,
    shirts,
    lifts,
    cues,
    end,
  };
}

/** Where `person` is drawn and how big, with their name tag: the same string while they hold still. */
function placementOf(person: HTMLElement, tag: HTMLElement): string {
  const { left, top, transform } = person.style;
  return [left, top, transform, tag.style.left, tag.style.transform].join(' | ');
}

/** Each time a block lands: the frame's time and how many have landed. */
const landings = (frames: readonly Frame[]) =>
  frames.filter((frame, index) => index > 0 && frame.blocks > frames[index - 1]!.blocks);

/** The stretches the pointer stays over someone: who, and the frames' times. */
function stops(frames: readonly Frame[]): { name: string; from: number; to: number }[] {
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
function turnsBack(frames: readonly Frame[]): number[] {
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
function swings(frames: readonly Frame[]): number[] {
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
const swaysPerSecond = (frames: readonly Frame[]) => {
  const times = turnsBack(frames);
  return Math.max(0, ...times.map((from) => times.filter((t) => t >= from && t < from + 1).length));
};

/** The tag boxes at `count` people standing in `order`, as the kit sets them. */
const tagsOf = (order: readonly string[]) => tagsFor(spots(order.length), order);

/** The pointer's whole box with its tip at `tip`. */
const pointerBox = (tip: Point): Box => ({
  left: tip.x - POINTER.tip.x,
  right: tip.x - POINTER.tip.x + POINTER.width,
  top: tip.y - POINTER.tip.y,
  bottom: tip.y - POINTER.tip.y + POINTER.height,
});

/** Where `name` stands in a run of `plan`. */
const spotOf = (plan: Plan, name: string) => spots(plan.order.length)[plan.order.indexOf(name)]!;

/** The top centre of the top block of `count` blocks leaning `lean`. */
function topOf(count: number, lean: number): Point {
  const block = tower(count, lean).at(-1)!;
  const a = (block.turn * Math.PI) / 180;
  return {
    x: block.x + (block.height / 2) * Math.sin(a),
    y: block.y - (block.height / 2) * Math.cos(a),
  };
}

/** 8 people, Luca unlucky, seed 1: run once and shared by the scenarios that watch it. */
let eightShow: ReturnType<typeof watch> | undefined;
const eightRun = () => (eightShow ??= watch(names(8), 'Luca'));

/**
 * After each block but the last turn's, the tower sways a degree or more and
 * is back upright (under half a degree) in the frame before the next block
 * lands: the next turn's weight comes on a settled tower.
 */
function expectSwaysAndSettles(frames: readonly Frame[], label: string) {
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
const MARCO_TEAM = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Luca', 'Marco', 'Priya'];

/** The first seed from 1 whose plan for `team` and `unlucky` passes `test`. */
function seedOf(team: readonly string[], unlucky: string, test: (plan: Plan) => boolean): number {
  for (let seed = 1; seed < 50_000; seed++) {
    if (test(planShow(team, unlucky, createRandom(seed)))) return seed;
  }
  throw new Error('no seed has it');
}

/** 8 with Marco unlucky, seed 1: run once and shared by the scenarios that watch it. */
let marcoShow: ReturnType<typeof watch> | undefined;
const marcoRun = () => (marcoShow ??= watch(MARCO_TEAM, 'Marco'));

/** 8 people, Luca unlucky, once with each ending: run once and shared. */
let endingShows: Promise<{ ending: Ending; run: Awaited<ReturnType<typeof watch>> }[]> | undefined;
const endingRuns = () =>
  (endingShows ??= (async () => {
    const all = [];
    for (const ending of ENDINGS) {
      const seed = seedOf(names(8), 'Luca', (plan) => plan.ending === ending);
      all.push({ ending, run: await watch(names(8), 'Luca', { seed }) });
    }
    return all;
  })());

/** The captions' words, in the order they showed. */
const texts = (record: ShowRecord) => record.captions.map((caption) => caption.text);

/** The caption the last turn starts with. */
function pointerCaptionOf(plan: Plan, unlucky: string): string {
  if (plan.pointer === 'fake-out') return `${plan.phew}… nope, ${unlucky}!`;
  if (plan.pointer === 'again') return `${unlucky}… again?!`;
  return `${unlucky}…`;
}

/** The captions each ending shows before the fall. */
const ENDING_CAPTIONS: Record<Ending, readonly string[]> = {
  'dead-still': ['Uh-oh…'],
  'it-holds': ['It holds!', '…or not!'],
  'slow-lean': ["It's leaning…"],
};

/** The frame the last block comes to rest in the heap. */
const heaped = (frames: readonly Frame[], plan: Plan) =>
  frames.find((frame) => frame.fallen === 2 + plan.turns.length)!;

/** Each bubble's stay on stage: what it says, where its tail is, and its first and last frames. */
function said(frames: readonly Frame[]): (Point & { text: string; from: number; to: number })[] {
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
function hatBox(spot: Spot): Box {
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
function expectEndingPlayed(
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
    const phew = saying('Phew!', plan.still.from, plan.still.from + STEP);
    const them = spotOf(plan, unlucky);
    expect(Math.abs(phew.y - them.y), label).toBeLessThan(them.size + 120);
  }
  const timber = saying('Timber!', falls, falls + STEP);
  const box = speechBox('Timber!', timber);
  const spot = spotOf(plan, unlucky);
  expect(overlap(box, grownBoxes(spot).head), label).toBe(false);
  expect(overlap(box, hatBox(spot)), label).toBe(false);
}

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

describe('The layout', () => {
  it('no tag overlaps at any count', () => {
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const label = `${count} people`;
      expect(all, label).toHaveLength(count);
      for (const [round, { boxes }] of casts(count).entries()) {
        const at_ = `${label}, names shifted ${round}`;
        expect(anyOverlap(boxes), at_).toBe(false);
        for (const box of boxes) {
          expect(box.left, at_).toBeGreaterThanOrEqual(0);
          expect(box.right, at_).toBeLessThanOrEqual(1280);
          // Own head excepted: a chest tag starts on its bottom edge.
          all.forEach((spot, own) => {
            if (boxes[own] !== box) expect(overlap(box, headBox(spot)), at_).toBe(false);
          });
        }
      }
      for (const spot of all) {
        expect(spot.tag.size, label).toBe(Math.max(22, Math.round(0.22 * spot.size)));
        expect(spot.tag.maxWidth, label).toBeGreaterThanOrEqual(120);
        expect(spot.tag.maxWidth, label).toBeLessThanOrEqual(
          Math.max(198, Math.round(2.2 * spot.size)),
        );
      }
    }
  });

  it('no tag is under the tower or the heap at any count', () => {
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const everyCast = casts(count);
      for (const blocks of HEIGHTS) {
        for (const lean of LEANS) {
          tower(blocks, lean).forEach((block, k) => {
            for (const [round, { boxes }] of everyCast.entries()) {
              const label = `${count} people, names shifted ${round}, ${blocks} blocks, lean ${lean}, block ${k}`;
              for (const box of boxes) expect(blockOverlaps(block, box), label).toBe(false);
            }
          });
        }
        for (const unlucky of all) {
          for (const cast of everyCast) {
            for (const block of heap(unlucky, blocks)) {
              const box = blockBox(block);
              const label = `${count} people, heap of ${blocks}`;
              expect(box.top, label).toBeGreaterThanOrEqual(HEAP_BAND.top);
              expect(box.bottom, label).toBeLessThanOrEqual(HEAP_BAND.bottom);
              expect(Math.sign(block.x - 640), label).toBe(sideOf(unlucky));
              for (const tag of cast.boxes) expect(overlap(box, tag), label).toBe(false);
              for (const spot of all) expect(overlap(box, headBox(spot)), label).toBe(false);
            }
          }
        }
      }
    }
  });

  it("the pointer's tip never covers a tag", () => {
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const everyCast = casts(count);
      for (const spot of all) {
        for (const holding of [false, true]) {
          const tip = pointerTip(spot, holding);
          for (const { boxes } of everyCast) {
            for (const box of boxes) expect(inside(box, tip), `${count} people`).toBe(false);
          }
          expect(tip.y, `${count} people`).toBeGreaterThanOrEqual(120);
        }
        // The held block is 0.96 heads wide over the head; the tip is 10 px over head or block.
        const block = heldBlock(spot);
        expect(block.width).toBeCloseTo(0.96 * spot.size, 9);
        expect(blockBox(block).bottom).toBeLessThan(headBox(spot).top);
        expect(pointerTip(spot).y).toBeCloseTo(headBox(spot).top - 10, 9);
        expect(pointerTip(spot, true).y).toBeCloseTo(blockBox(block).top - 10, 9);
      }
    }
  });

  it('normal names need no shift at 8 and 12', () => {
    for (const count of [8, 12]) {
      const all = spots(count);
      for (const { boxes } of casts(count)) {
        boxes.forEach((box, index) => {
          expect((box.left + box.right) / 2, `${count} people`).toBeCloseTo(all[index]!.x, 9);
        });
      }
    }
  });

  it('8 people match the storyboard', () => {
    const all = spots(8);
    expect(all.map((s) => [s.x, s.y, s.size, s.row])).toEqual([
      ...[130, 340, 940, 1150].map((x) => [x, 430, 80, 'back']),
      ...[150, 400, 880, 1130].map((x) => [x, 650, 104, 'front']),
    ]);
  });

  it('12 and 2 people match the storyboard', () => {
    expect(spots(12).map((s) => [s.x, s.y, s.size])).toEqual([
      ...[90, 260, 430, 850, 1020, 1190].map((x) => [x, 430, 66]),
      ...[115, 300, 480, 800, 990, 1170].map((x) => [x, 650, 92]),
    ]);
    expect(spots(2).map((s) => [s.x, s.y, s.size])).toEqual([
      [260, 640, 200],
      [1020, 640, 200],
    ]);
  });

  it('other counts split each row either side of the tower', () => {
    for (let count = 3; count <= 11; count++) {
      const all = spots(count);
      expect(
        all.filter((s) => s.row === 'back'),
        `${count} people`,
      ).toHaveLength(Math.floor(count / 2));
      for (const spot of all)
        expect(Math.abs(spot.x - 640), `${count} people`).toBeGreaterThanOrEqual(150);
    }
  });

  it('the tower bends: the top leans most and each block rests on the one below', () => {
    const blocks = tower(11, 22);
    expect(blocks.map((b) => b.width)).toEqual([
      200, 184, 150, 170, 124, 164, 140, 112, 156, 132, 150,
    ]);
    blocks.forEach((block, k) => {
      expect(block.turn).toBeCloseTo(22 * (0.4 + (0.6 * (k + 1)) / 11), 9);
      if (k > 0) expect(block.turn).toBeGreaterThan(blocks[k - 1]!.turn);
    });
    expect(blocks.at(-1)!.x).toBeGreaterThan(blocks[0]!.x);
    expect(tower(11, -22).at(-1)!.x).toBeLessThan(640);
    // Upright, a stack of 40 high blocks on y 610 (each a few pixels off centre).
    tower(11, 0).forEach((block, k) => {
      expect(block.y).toBeCloseTo(590 - 40 * k, 9);
      expect(Math.abs(block.x - 640)).toBeLessThanOrEqual(6);
    });
  });

  it("a lean's side is a number or the side a person stands on", () => {
    const order = names(8);
    const all = spots(8);
    expect(signedLean({ degrees: 7, toward: -1 }, order)).toBe(-7);
    expect(signedLean({ degrees: 7, toward: 1 }, order)).toBe(7);
    order.forEach((name, index) => {
      expect(signedLean({ degrees: 22, toward: name }, order)).toBe(22 * sideOf(all[index]!));
    });
  });
});

describe('The plan', () => {
  const all = everyPlan();

  it('quick turns never drop under 0.6 s', () => {
    for (const { label, plan } of all) {
      for (const turn of during(plan, 'stack')) {
        expect(turn.seconds, label).toBeGreaterThanOrEqual(0.6);
        // The toss, from the pointer's stop to the landing, stays readable.
        expect(turn.lands - turn.stops, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
      }
    }
  });

  it('every turn follows the turn rules', () => {
    for (let count = 2; count <= 12; count++) {
      const unlucky = unluckyOf(count);
      const seeds = Array.from({ length: 50 }, (_, index) => index + 1);
      // Every pointer move with every ending, the first seed past 50 that
      // has it when seeds 1–50 don't.
      for (const pointer of POINTER_MOVES) {
        for (const ending of ENDINGS) {
          const has = (seed: number) => {
            const plan = planShow(names(count), unlucky, createRandom(seed));
            return plan.pointer === pointer && plan.ending === ending;
          };
          if (!seeds.some(has)) {
            let seed = 51;
            while (!has(seed)) seed++;
            seeds.push(seed);
          }
        }
      }
      for (const seed of seeds) {
        const label = `${count} people, seed ${seed}`;
        const plan = planShow(names(count), unlucky, createRandom(seed));
        const { turns } = plan;
        expect(turns.at(-1)!.by, label).toBe(unlucky);
        expect(turns.at(-1)!.beat, label).toBe('last-turn');
        expect(
          turns.filter((turn) => turn.beat === 'last-turn'),
          label,
        ).toHaveLength(1);
        turns.forEach((turn, index) => {
          expect(names(count), label).toContain(turn.by);
          if (turn.decoy !== null) {
            expect(names(count), label).toContain(turn.decoy);
            expect(turn.decoy, label).not.toBe(turn.by);
          }
          const again = plan.pointer === 'again' && turn.beat === 'last-turn';
          if (count >= 3 && index > 0 && !again) {
            expect(turn.by, label).not.toBe(turns[index - 1]!.by);
          }
        });
        for (const turn of during(plan, 'careful')) expect(turn.decoy, label).not.toBeNull();
        for (const beat of ['stack', 'wobble', 'nearly'] as const) {
          for (const turn of during(plan, beat)) expect(turn.decoy, label).toBeNull();
        }
        const last = turns.at(-1)!;
        expect(last.decoy !== null, label).toBe(plan.pointer === 'fake-out');
        expect(plan.phew, label).toBe(last.decoy);
        expect(only(plan, 'nearly').by === unlucky, label).toBe(plan.pointer === 'again');
        expect(plan.falls, label).toBe(unlucky);
      }
    }
  });

  it('the turns add up', () => {
    for (const { label, plan } of all) {
      const { turns } = plan;
      expect(
        turns.map((turn) => turn.beat),
        label,
      ).toEqual([
        ...during(plan, 'stack').map(() => 'stack'),
        'wobble',
        'careful',
        'careful',
        'nearly',
        'last-turn',
      ]);
      // Each turn starts where the one before ends; the careful turns start
      // after the pigeon's beat.
      turns.forEach((turn, index) => {
        const previous = turns[index - 1];
        const from =
          index === 0
            ? startOf(plan, 'stack')
            : turn.beat === 'careful' && previous!.beat === 'wobble'
              ? startOf(plan, 'careful')
              : previous!.from + previous!.seconds;
        expect(turn.from, label).toBeCloseTo(from, 9);
        expect(turn.from, label).toBeGreaterThanOrEqual(startOf(plan, turn.beat) - 1e-9);
        if (turn.decoyStops !== null) {
          expect(turn.decoyStops, label).toBeGreaterThan(turn.from);
          expect(turn.decoyStops, label).toBeLessThan(turn.stops);
        }
        expect(turn.stops, label).toBeGreaterThan(turn.from);
        expect(turn.lands, label).toBeGreaterThan(turn.stops);
        expect(turn.lands, label).toBeLessThanOrEqual(turn.from + turn.seconds + 1e-9);
      });
      // The beats start one after another.
      BEATS.forEach((beat, index) => {
        const before = BEATS.slice(0, index).reduce((sum, each) => sum + plan.beats[each], 0);
        expect(plan.starts[beat], `${label}, ${beat}`).toBeCloseTo(before, 9);
      });
      // Each beat's turns fill it, and the last ends where timber starts.
      const wobble = only(plan, 'wobble');
      expect(wobble.from + wobble.seconds, label).toBeCloseTo(startOf(plan, 'pigeon'), 9);
      const last = turns.at(-1)!;
      expect(last.from + last.seconds, label).toBeCloseTo(startOf(plan, 'timber'), 9);
    }
  });

  it('every pointer hop and toss lasts long enough to follow', () => {
    for (const { label, plan } of all) {
      plan.turns.forEach((turn, index) => {
        const at = `${label}, turn ${index + 1} (${turn.beat})`;
        // The hop leaves as the previous block lands; the first, at its start.
        const leaves = index === 0 ? startOf(plan, 'stack') : plan.turns[index - 1]!.lands;
        expect(turn.lands - turn.stops, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (turn.beat === 'stack') {
          expect(turn.stops - leaves, at).toBeGreaterThanOrEqual(0.2 - 1e-9);
        } else if (turn.beat === 'last-turn' && plan.pointer === 'again') {
          // The pointer stays on them: no hop.
        } else if (turn.decoyStops !== null) {
          // A hop to the decoy, a rest of 0.25 s on them and a hop on, each hop 0.4 s or more.
          expect(turn.decoyStops - leaves, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
          expect(turn.stops - turn.decoyStops, at).toBeGreaterThanOrEqual(0.65 - 1e-9);
        } else {
          expect(turn.stops - leaves, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
        }
      });
    }
  });

  it("Nearly's lean holds still for half a second inside its beat", () => {
    for (const { label, plan } of all) {
      const nearly = only(plan, 'nearly');
      expect(plan.hold.from - nearly.lands, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(plan.hold.to - plan.hold.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.hold.from, label).toBeGreaterThan(startOf(plan, 'nearly'));
      expect(plan.hold.to, label).toBeLessThanOrEqual(startOf(plan, 'last-turn') + 1e-9);
    }
  });

  it('Nearly is the biggest lean before the fall', () => {
    for (const { label, plan } of all) {
      const nearly = only(plan, 'nearly');
      expect(nearly.lean).toEqual({ degrees: 22, toward: nearly.by });
      for (const turn of plan.turns) {
        if (turn !== nearly) expect(turn.lean.degrees, label).toBeLessThan(nearly.lean.degrees);
      }
      for (const turn of during(plan, 'stack')) {
        expect(turn.lean.degrees, label).toBeGreaterThanOrEqual(2);
        expect(turn.lean.degrees, label).toBeLessThanOrEqual(3);
        expect([-1, 1], label).toContain(turn.lean.toward);
      }
      const wobble = only(plan, 'wobble');
      expect(wobble.lean.degrees, label).toBe(7);
      expect([-1, 1], label).toContain(wobble.lean.toward);
    }
    const sides = all.map(({ plan }) => only(plan, 'wobble').lean.toward);
    expect(sides).toContain(-1);
    expect(sides).toContain(1);
  });

  it('the heartbeat quickens until the last block, and the tower is still before the fall', () => {
    for (const { label, plan } of all) {
      const last = plan.turns.at(-1)!;
      const T = startOf(plan, 'timber');
      const { heartbeats } = plan;
      expect(heartbeats[0], label).toBeCloseTo(startOf(plan, 'careful'), 9);
      expect(heartbeats.at(-1)!, label).toBeLessThan(last.lands);
      const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
      expect(gaps[0], label).toBeCloseTo(0.9, 9);
      gaps.forEach((gap, index) => {
        expect(gap, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (index > 0) expect(gap, label).toBeLessThanOrEqual(gaps[index - 1]! + 1e-9);
      });
      // It falls as timber starts; on it-holds, once "It holds!" has had its
      // second, and early enough that the unlucky person has grown (in 0.5 s)
      // by the show's last 1.5 s.
      if (plan.ending === 'it-holds') {
        expect(plan.still.to, label).toBeCloseTo(Math.max(T, plan.still.from + READ), 9);
        expect(plan.still.to + 0.5, label).toBeLessThanOrEqual(total(plan) - 1.5);
      } else {
        expect(plan.still.to, label).toBeCloseTo(T, 9);
      }
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(last.lands - 1e-9);
    }
  });

  it('the standing order is everyone, shuffled', () => {
    const orders = plans(8).map((plan) => plan.order.join());
    for (const order of orders) expect(order.split(',').sort()).toEqual([...names(8)].sort());
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe('The stage', () => {
  /** The first seed from 1 whose plan at `count` passes `test`. */
  const seedWhere = (count: number, test: (plan: Plan) => boolean) => {
    let seed = 1;
    while (!test(planShow(names(count), unluckyOf(count), createRandom(seed)))) seed++;
    return seed;
  };

  it('the stage plays the plan for its seed', async () => {
    for (const count of [2, 8, 12]) {
      for (const seed of [1, 2]) {
        const label = `${count} people, seed ${seed}`;
        const team = names(count);
        const { plan, built, shirts, lifts } = await watch(team, unluckyOf(count), { seed });
        // The looks are drawn after the plan's draws.
        const random = createRandom(seed);
        planShow(team, unluckyOf(count), random);
        const looks = handOutLooks(team, random);
        expect(
          lifts.map((lift) => lift.name),
          label,
        ).toEqual(plan.turns.map((turn) => turn.by));
        expect(
          built.map((block) => block.by),
          label,
        ).toEqual(['', '', ...plan.turns.map((turn) => turn.by)]);
        expect(
          built.map((block) => block.fill),
          label,
        ).toEqual([
          'var(--color-paper)',
          'var(--color-paper)',
          ...plan.turns.map((turn) => `var(--color-${looks.get(turn.by)!.ring})`),
        ]);
        for (const name of team) {
          expect(shirts[name], label).toBe(`var(--color-${looks.get(name)!.ring})`);
        }
      }
    }
  });

  it("the pointer's whole box never covers a name tag at 8 and 12", async () => {
    for (const count of [8, 12]) {
      const team = NORMAL.slice(0, count);
      for (const seed of [1, 2, 3]) {
        const { frames, plan } = await watch(team, team.at(-1)!, { seed });
        const tags = tagsOf(plan.order);
        for (const frame of frames.filter((each) => each.pointer.shown > 0)) {
          for (const tag of tags) {
            expect(
              overlap(pointerBox(frame.pointer), tag),
              `${count} people, seed ${seed}, at ${frame.time}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('the pointer has faded out by the lift, so it never sits over a held block', async () => {
    for (const count of [2, 8, 12]) {
      const { frames } = await (count === 8 ? eightRun() : watch(names(count), unluckyOf(count)));
      for (const frame of frames) {
        if (frame.holding.includes(frame.over)) {
          expect(frame.pointer.shown, `${count} people, ${frame.over} at ${frame.time}`).toBe(0);
        }
      }
    }
  });

  it('the tower never sways more than 3 times a second, and settles after each block', async () => {
    // The quickest quick turns: four of them, at 2 and at 5 people.
    const runs = [
      { count: 2, seed: seedWhere(2, (plan) => during(plan, 'stack').length === 4) },
      { count: 5, seed: seedWhere(5, (plan) => during(plan, 'stack').length === 4) },
      { count: 12, seed: seedWhere(12, (plan) => during(plan, 'stack').length === 4) },
      { count: 8, seed: 3 },
    ];
    for (const { count, seed } of runs) {
      for (const reducedMotion of [false, true]) {
        const label = `${count} people, seed ${seed}${reducedMotion ? ', reduced motion' : ''}`;
        const { frames, plan } = await watch(names(count), unluckyOf(count), {
          seed,
          reducedMotion,
        });
        const before = frames.filter((frame) => frame.time < plan.still.to);
        expect(swaysPerSecond(before), label).toBeLessThanOrEqual(3);
        for (const swing of swings(before))
          expect(swing, label).toBeGreaterThanOrEqual(0.34 - STEP);
        expectSwaysAndSettles(frames, label);
      }
    }
  });

  it('with reduced motion the big wobble is one slow lean and settle', async () => {
    const { frames, plan } = await watch(names(8), 'Luca', { reducedMotion: true });
    const wobble = only(plan, 'wobble');
    const wobbling = frames.filter(
      (frame) => frame.time >= wobble.lands && frame.time < wobble.from + wobble.seconds,
    );
    expect(turnsBack(wobbling)).toHaveLength(1);
    expect(Math.max(...wobbling.map((frame) => Math.abs(frame.lean)))).toBeCloseTo(7, 1);
  });
});

describe('Hops and tosses', () => {
  /** Show seconds per frame in these runs: fine enough to time a hop to the frame. */
  const FINE = 1 / 120;
  /** The first seed from 1 whose plan at `count` with the usual unlucky person passes `test`. */
  const seedFor = (count: number, test: (plan: Plan) => boolean) => {
    let seed = 1;
    while (!test(planShow(names(count), unluckyOf(count), createRandom(seed)))) seed++;
    return seed;
  };
  /** A run at 2, at 8 with the fake-out, and at 12 with 4 quick turns, finely timed. */
  let shows: Promise<{ label: string; run: Awaited<ReturnType<typeof watch>> }[]> | undefined;
  const fineRuns = () =>
    (shows ??= (async () => {
      const all = [];
      // One at a time: every run drives the one GSAP clock.
      for (const { count, seed } of [
        { count: 2, seed: seedFor(2, (plan) => during(plan, 'stack').length === 4) },
        { count: 8, seed: seedFor(8, (plan) => plan.pointer === 'fake-out') },
        { count: 12, seed: seedFor(12, (plan) => during(plan, 'stack').length === 4) },
      ]) {
        const run = await watch(names(count), unluckyOf(count), { seed, step: FINE });
        all.push({ label: `${count} people, seed ${seed}`, run });
      }
      return all;
    })());

  it('every hop lasts 0.4 s or more (0.2 s in a quick turn), and the pointer rests 0.25 s or more on a decoy', async () => {
    for (const { label, run } of await fineRuns()) {
      const { frames, plan } = run;
      const stopped = stops(frames);
      // Each stop, with the turn it belongs to.
      const turnOf = plan.turns.flatMap((turn) => (turn.decoy ? [turn, turn] : [turn]));
      expect(
        stopped.map((stop) => stop.name),
        label,
      ).toEqual(plan.turns.flatMap((turn) => (turn.decoy ? [turn.decoy, turn.by] : [turn.by])));
      stopped.forEach((stop, index) => {
        const turn = turnOf[index]!;
        const at = `${label}, stop ${index + 1} on ${stop.name} (${turn.beat})`;
        const after = index === 0 ? -1 : stopped[index - 1]!.to;
        const leaves = frames.find(
          (frame) => frame.time > after && frame.over === '' && frame.pointer.shown > 0,
        )!;
        const least = turn.beat === 'stack' ? 0.2 : 0.4;
        expect(stop.from - leaves.time, at).toBeGreaterThanOrEqual(least - FINE);
        if (turn.decoy === stop.name && turn.by !== stop.name) {
          expect(stop.to + FINE - stop.from, at).toBeGreaterThanOrEqual(0.25 - FINE);
        }
      });
    }
  });

  it('each tossed block flies 0.4 s or more, from the whoosh to the thunk', async () => {
    for (const { label, run } of await fineRuns()) {
      const whooshes = run.cues.filter((each) => each.cue === 'whoosh');
      const thunks = run.cues.filter((each) => each.cue === 'thunk').slice(2);
      expect(whooshes, label).toHaveLength(run.plan.turns.length);
      expect(thunks, label).toHaveLength(run.plan.turns.length);
      whooshes.forEach((whoosh, index) => {
        expect(
          thunks[index]!.time - whoosh.time,
          `${label}, turn ${index + 1}`,
        ).toBeGreaterThanOrEqual(0.4 - FINE);
      });
    }
  });

  it('a bounce in place is a visible hop, clear of the name tags', async () => {
    // "Again?!" at 8 and 12 with the unlucky person in the front row, and a repeat turn at 2.
    const front = (count: number) => (plan: Plan) =>
      plan.pointer === 'again' && spotOf(plan, unluckyOf(count)).row === 'front';
    const runs = [
      { count: 8, seed: seedFor(8, front(8)) },
      { count: 12, seed: seedFor(12, front(12)) },
      { count: 2, seed: seedFor(2, repeatsBeforeLast) },
    ];
    for (const { count, seed } of runs) {
      const label = `${count} people, seed ${seed}`;
      const { frames, plan } = await watch(names(count), unluckyOf(count), { seed });
      const stopped = stops(frames);
      const tags = tagsOf(plan.order);
      const bounces = stopped.slice(1).filter((stop, index) => stop.name === stopped[index]!.name);
      expect(bounces.length, label).toBeGreaterThan(0);
      for (const stop of bounces) {
        const before = stopped[stopped.indexOf(stop) - 1]!;
        const hop = frames.filter((frame) => frame.time > before.to && frame.time < stop.from);
        const tip = pointerTip(spotOf(plan, stop.name));
        expect(
          tip.y - Math.min(...hop.map((frame) => frame.pointer.y)),
          label,
        ).toBeGreaterThanOrEqual(10);
        for (const frame of hop.filter((each) => each.pointer.shown > 0)) {
          for (const tag of tags)
            expect(overlap(pointerBox(frame.pointer), tag), label).toBe(false);
        }
      }
    }
  });
});

describe('The last turn and the fall', () => {
  // Every pointer move with every ending, at 2, 8 and 12, with and without
  // the pigeon: the seed for each found by search.
  for (const count of [2, 8, 12]) {
    for (const pigeon of [true, false]) {
      it(`plays every last turn in time at ${count} people, ${pigeon ? 'with' : 'without'} the pigeon`, async () => {
        const team = names(count);
        const unlucky = unluckyOf(count);
        for (const pointer of POINTER_MOVES) {
          for (const ending of ENDINGS) {
            const seed = seedOf(
              team,
              unlucky,
              (plan) =>
                plan.pointer === pointer && plan.ending === ending && plan.pigeon === pigeon,
            );
            const run = await watch(team, unlucky, { seed });
            expectEndingPlayed(
              run,
              unlucky,
              `${count} people, ${pointer}, ${ending}, seed ${seed}`,
            );
          }
        }
      });
    }
  }

  it('plays every last turn in time with reduced motion, its captions in the same order', async () => {
    const team = names(8);
    const unlucky = unluckyOf(8);
    for (const pointer of POINTER_MOVES) {
      for (const ending of ENDINGS) {
        const seed = seedOf(
          team,
          unlucky,
          (plan) => plan.pointer === pointer && plan.ending === ending,
        );
        const label = `8 people, ${pointer}, ${ending}, seed ${seed}, reduced motion`;
        const calm = await watch(team, unlucky, { seed, reducedMotion: true });
        expectEndingPlayed(calm, unlucky, label);
        expect(
          calm.frames.filter((frame) => frame.speedLines),
          label,
        ).toEqual([]);
      }
    }
  });

  it('the dust puffs up where blocks land in the heap', async () => {
    const { frames, plan } = await marcoRun();
    const down = heaped(frames, plan);
    const puffs = frames.filter((frame) => frame.dust > 0);
    expect(puffs.length).toBeGreaterThan(0);
    for (const frame of puffs) {
      expect(frame.time).toBeGreaterThanOrEqual(plan.still.to);
      expect(frame.time).toBeLessThan(down.time + 1);
    }
  });
});

describe('Blocks and name tags', () => {
  it('a name tag a block crosses, in the air, on the tower or in the heap, is drawn over it', async () => {
    // Blocks do cross tags at 8: a front-row toss, and the tumble.
    let crossed = 0;
    for (const { count, seed } of [
      { count: 2, seed: 1 },
      { count: 8, seed: 1 },
      { count: 8, seed: 2 },
      { count: 12, seed: 1 },
    ]) {
      const { frames, plan } = await watch(names(count), unluckyOf(count), { seed });
      const tags = tagsOf(plan.order);
      for (const frame of frames) {
        for (const block of frame.drawn) {
          plan.order.forEach((name, index) => {
            if (!blockOverlaps(block, tags[index]!)) return;
            crossed++;
            expect(
              block.under,
              `${count} people, seed ${seed}, ${name}'s tag at ${frame.time}`,
            ).toContain(name);
          });
        }
      }
    }
    expect(crossed).toBeGreaterThan(0);
  });
});
