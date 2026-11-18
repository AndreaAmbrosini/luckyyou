// What the tests watch a show through: plans for many seeds, and the stage
// as a show draws it. Statistical scenarios read the plan alone; only stage
// scenarios run shows.

import type { Cue, Note, Scenario } from '../../scenario-kit';
import { createRandom } from '../../scenario-kit/random';
import { runShow, type ShowRecord } from '../../scenario-kit/testing';
import theClaw from './index';
import { planShow, type Plan } from './plan';

export const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Hana',
  'Ivo',
  'Jonas',
  'Kofi',
  'Luca',
];

/** A 15-character name, the longest the layouts are drawn for. */
export const LONG = 'Priya Natarajan';

/** The first `count` of the team. */
export const names = (count: number) => TEAM.slice(0, count);

/** A plan, with whom it was made for. */
export interface Run {
  readonly plan: Plan;
  readonly team: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
}

/** The unlucky person for `seed` when the scenario doesn't say: a different one most seeds. */
const someone = (team: readonly string[], seed: number) => team[(seed * 5) % team.length]!;

/** Plans for `team` (or the first `count` of the team) with seeds 1 to `seeds`, for `unlucky`, or someone else each seed. */
export function plansFor(
  count: number | readonly string[],
  seeds: number,
  unlucky?: string,
): Run[] {
  const team = typeof count === 'number' ? names(count) : count;
  return Array.from({ length: seeds }, (_, k) => {
    const seed = k + 1;
    const who = unlucky ?? someone(team, seed);
    return { plan: planShow(team, who, createRandom(seed)), team, unlucky: who, seed };
  });
}

/** The first plan for `team` (or the first `count`), from seed 1 up, that `wanted` accepts. */
export function find(
  count: number | readonly string[],
  wanted: (plan: Plan) => boolean,
  unlucky?: string,
): Run {
  const team = typeof count === 'number' ? names(count) : count;
  for (let seed = 1; seed <= 3000; seed++) {
    const who = unlucky ?? someone(team, seed);
    const plan = planShow(team, who, createRandom(seed));
    if (wanted(plan)) return { plan, team, unlucky: who, seed };
  }
  throw new Error(`No seed gives that plan for ${team.length} people.`);
}

/** One person as the stage drew them in a frame. */
export interface Drawn {
  /** The middle of their box, its top, and its size. */
  readonly x: number;
  readonly top: number;
  readonly size: number;
  readonly rot: number;
  readonly layer: string;
  readonly visible: boolean;
  readonly mood: string;
  readonly raised: boolean;
  readonly sweat: boolean;
  readonly bow: boolean;
  /** Their name tag's size, and whether it shows. */
  readonly tag: number;
  readonly tagShown: boolean;
}

/** What the stage showed at one moment. */
export interface Frame {
  readonly time: number;
  readonly people: ReadonlyMap<string, Drawn>;
  readonly claw: {
    readonly x: number;
    readonly hub: number;
    readonly th: number;
    readonly pose: string;
    readonly marks: string;
    /** How far the right finger twitches open. */
    readonly twitch: number;
  };
  readonly plaque: string;
  readonly door: string;
  /** How far the chute is moved sideways as it rumbles. */
  readonly rumble: number;
  readonly sparkles: number;
  readonly lines: boolean;
  readonly bubbles: readonly {
    readonly text: string;
    readonly by: string;
    /** Where its tail ends, and how far the speech leans from it. */
    readonly x: number;
    readonly y: number;
    readonly lean: number;
  }[];
}

/** A show as the stage drew it: its plan, its frames, its captions and the sounds it asked for. */
export interface Watched {
  readonly plan: Plan;
  readonly frames: readonly Frame[];
  readonly record: ShowRecord;
  readonly cues: readonly { readonly time: number; readonly cue: Cue }[];
  /** The song it handed the kit, and each move of it, at the show second of the frame it came in. */
  readonly notes: readonly Note[];
  readonly moves: readonly {
    readonly time: number;
    readonly beat: number;
    readonly speed: number;
  }[];
}

/** Show seconds per frame when watching: coarse, so a show takes a moment. */
export const STEP = 0.05;

const watched = new Map<string, Promise<Watched>>();

/**
 * Runs The Claw once for `team`, `unlucky` and `seed` and keeps every frame;
 * the same show asked for again comes from the first run.
 */
export function watch(
  team: readonly string[],
  unlucky: string,
  seed = 1,
  { reducedMotion = false }: { reducedMotion?: boolean } = {},
): Promise<Watched> {
  const key = `${team.join()}|${unlucky}|${seed}|${reducedMotion}`;
  let run = watched.get(key);
  if (!run) watched.set(key, (run = record(team, unlucky, seed, reducedMotion)));
  return run;
}

async function record(
  team: readonly string[],
  unlucky: string,
  seed: number,
  reducedMotion: boolean,
): Promise<Watched> {
  const plan = planShow(team, unlucky, createRandom(seed));
  const frames: Frame[] = [];
  const cues: { time: number; cue: Cue }[] = [];
  let notes: readonly Note[] = [];
  const songMoves: { time: number | null; beat: number; speed: number }[] = [];
  let now = 0;
  const listened: Scenario = {
    ...theClaw,
    play: (show) =>
      theClaw.play({
        ...show,
        sound: {
          ...show.sound,
          play(cue) {
            cues.push({ time: now, cue });
            return show.sound.play(cue);
          },
          music(song) {
            notes = song;
            const music = show.sound.music(song);
            return {
              to(beat, speed) {
                songMoves.push({ time: null, beat, speed });
                music.to(beat, speed);
              },
            };
          },
        },
      }),
  };
  let parts:
    | {
        people: { name: string; el: HTMLElement; tag: HTMLElement }[];
        claw: SVGElement;
        plaque: HTMLElement;
        chute: HTMLElement;
        sparkles: SVGElement[];
        lines: SVGPathElement;
        bubbles: HTMLElement[];
      }
    | undefined;
  const result = await runShow(listened, {
    names: team,
    unlucky,
    seed,
    step: STEP,
    reducedMotion,
    onFrame(time, stage) {
      // Sounds asked for in a frame belong to the time it moves to.
      now = time + STEP;
      for (const move of songMoves) move.time ??= time;
      parts ??= {
        people: [...stage.querySelectorAll<HTMLElement>('[data-person]')].map((el) => ({
          name: el.dataset.person!,
          el,
          tag: stage.querySelector<HTMLElement>(
            `[data-tag-of="${CSS.escape(el.dataset.person!)}"] > *`,
          )!,
        })),
        claw: stage.querySelector<SVGElement>('[data-part="claw"]')!,
        plaque: stage.querySelector<HTMLElement>('[data-part="at-risk"]')!,
        chute: stage.querySelector<HTMLElement>('[data-part="chute"]')!,
        sparkles: [...stage.querySelectorAll<SVGElement>('[data-part="sparkle"]')],
        lines: stage.querySelector<SVGPathElement>('[data-part="lines"] path')!,
        bubbles: [...stage.querySelectorAll<HTMLElement>('[data-part="bubble"]')],
      };
      const people = new Map<string, Drawn>();
      for (const { name, el, tag } of parts.people) {
        const size = Number.parseFloat(el.style.width);
        people.set(name, {
          x: Number.parseFloat(el.style.left) + size / 2,
          top: Number.parseFloat(el.style.top),
          size,
          rot: Number.parseFloat(el.style.rotate) || 0,
          layer: el.dataset.layer!,
          visible: el.style.visibility !== 'hidden',
          mood: el.dataset.mood!,
          raised: el.dataset.raised === 'true',
          sweat: el.dataset.sweat === 'true',
          bow: el.dataset.bow === 'true',
          tag: Number.parseFloat(tag.style.getPropertyValue('--tag-size')),
          tagShown: tag.style.visibility !== 'hidden',
        });
      }
      const { dataset } = parts.claw;
      frames.push({
        time,
        people,
        claw: {
          x: Number(dataset.x),
          hub: Number(dataset.hub),
          th: Number(dataset.th),
          pose: dataset.pose!,
          marks: dataset.marks!,
          twitch: Number(dataset.twitch),
        },
        plaque: parts.plaque.textContent ?? '',
        door: parts.chute.dataset.door ?? 'shut',
        rumble: Number.parseFloat(parts.chute.style.translate) || 0,
        sparkles: parts.sparkles.filter((el) => el.style.visibility !== 'hidden').length,
        lines: !parts.lines.hasAttribute('display'),
        bubbles: parts.bubbles
          .filter((el) => el.style.visibility !== 'hidden')
          .map((el) => ({
            text: el.textContent ?? '',
            by: el.dataset.by!,
            x: Number.parseFloat(el.style.left),
            y: Number.parseFloat(el.style.top),
            lean: Number.parseFloat(el.style.getPropertyValue('--lean')) || 0,
          })),
      });
    },
  });
  return {
    plan,
    frames,
    record: result,
    cues,
    notes,
    moves: songMoves.map(({ time, ...move }) => ({ time: time!, ...move })),
  };
}

/** The frames of `run` from `from` up to, not including, `to`. */
export const between = (run: Watched, from: number, to = Infinity) =>
  run.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);

/** The frame of `run` at or just after `t`. */
export const frameAt = (run: Watched, t: number) =>
  run.frames.find((frame) => frame.time >= t - 1e-9) ?? run.frames.at(-1)!;

/** The moments from `from` to `to`, `step` apart. */
export function times(from: number, to: number, step = 0.02): number[] {
  const all: number[] = [];
  for (let t = from; t <= to + 1e-9; t += step) all.push(t);
  return all;
}
