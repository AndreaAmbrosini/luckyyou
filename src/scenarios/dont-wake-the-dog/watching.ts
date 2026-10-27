// What the tests watch a show through: plans for many seeds, and where
// everyone is on their way past the dog. Statistical scenarios read the plan
// alone; only stage scenarios run shows.

import { gsap } from 'gsap';
import type { Cue, Scenario } from '../../scenario-kit';
import { createRandom } from '../../scenario-kit/random';
import { runShow, type ShowRecord } from '../../scenario-kit/testing';
import dontWakeTheDog from './index';
import { planShow, type Ending, type Place, type Plan, type Span, type Turn } from './plan';

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

export const ENDINGS: readonly Ending[] = ['on-back', 'creak', 'sniff'];

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

/** Plans for `count` people with seeds 1 to `seeds`, for `unlucky`, or someone else each seed. */
export function plansFor(count: number, seeds: number, unlucky?: string): Run[] {
  const team = names(count);
  return Array.from({ length: seeds }, (_, k) => {
    const seed = k + 1;
    const who = unlucky ?? someone(team, seed);
    return { plan: planShow(team, who, createRandom(seed)), team, unlucky: who, seed };
  });
}

/** The first plan for `count` people, from seed 1 up, that `wanted` accepts. */
export function find(count: number, wanted: (plan: Plan) => boolean, unlucky?: string): Run {
  const team = names(count);
  for (let seed = 1; seed <= 2000; seed++) {
    const who = unlucky ?? someone(team, seed);
    const plan = planShow(team, who, createRandom(seed));
    if (wanted(plan)) return { plan, team, unlucky: who, seed };
  }
  throw new Error(`No seed gives that plan for ${count} people.`);
}

/** The place `name` is at, or last left, at `t`. */
export function placeAt(plan: Plan, name: string, t: number): Place {
  const keys = plan.paths.get(name) ?? [];
  return keys.findLast((key) => key.at <= t + 1e-9)?.place ?? 'seat';
}

/** Whether `name` moves at any moment inside `span`. */
export function moves(plan: Plan, name: string, span: Span): boolean {
  const keys = plan.paths.get(name) ?? [];
  return keys.some((key, k) => {
    const before = keys[k - 1];
    if (!before || before.place === key.place) return false;
    return before.at < span.to - 1e-9 && key.at > span.from + 1e-9;
  });
}

/** How long a safe turn lasts: until the next turn, or "Final three!" after the last. */
export function turnLength(plan: Plan, turn: Turn): number {
  const next = plan.turns[plan.turns.indexOf(turn) + 1]!;
  return (next.kind === 'safe' ? next.from : plan.spotlight) - turn.from;
}

/** One person as the stage drew them in a frame. */
export interface Drawn {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly layer: string;
  readonly mood: string;
  readonly raised: boolean;
  readonly sweat: boolean;
  /** Their name tag's size, as drawn. */
  readonly tag: number;
}

/** What the stage showed at one moment. */
export interface Frame {
  readonly time: number;
  readonly people: ReadonlyMap<string, Drawn>;
  readonly dog: {
    readonly state: string;
    readonly marks: string;
    readonly lift: number;
    readonly x: number;
    readonly y: number;
    /** How far its body is scaled up as it breathes. */
    readonly breath: number;
  };
  /** The lead's path while it shows, or null. */
  readonly lead: string | null;
  /** How many hearts show. */
  readonly hearts: number;
  readonly gate: number;
  readonly sign: string;
  readonly bubbles: readonly {
    readonly text: string;
    readonly by: string;
    readonly x: number;
    readonly y: number;
  }[];
  /** Whether everyone behind the dog is drawn before it, so it covers them. */
  readonly behindTheDog: boolean;
}

/** A show as the stage drew it: its plan, its frames, its captions and the sounds it asked for. */
export interface Watched {
  readonly plan: Plan;
  readonly frames: readonly Frame[];
  readonly record: ShowRecord;
  readonly cues: readonly { readonly time: number; readonly cue: Cue }[];
}

/** Show seconds per frame when watching: coarse, so a show takes a moment. */
export const STEP = 0.05;

const watched = new Map<string, Promise<Watched>>();

/**
 * Runs Don't Wake the Dog once for `team`, `unlucky` and `seed` and keeps
 * every frame; the same show asked for again comes from the first run.
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
  let now = 0;
  const listened: Scenario = {
    ...dontWakeTheDog,
    play: (show) =>
      dontWakeTheDog.play({
        ...show,
        sound: {
          ...show.sound,
          play(cue) {
            cues.push({ time: now, cue });
            return show.sound.play(cue);
          },
        },
      }),
  };
  let parts:
    | {
        people: { name: string; el: HTMLElement; tag: HTMLElement }[];
        dog: SVGElement;
        gate: SVGElement;
        sign: HTMLElement;
        bubbles: HTMLElement[];
        lead: SVGElement;
        hearts: SVGElement[];
      }
    | undefined;
  const record = await runShow(listened, {
    names: team,
    unlucky,
    seed,
    step: STEP,
    reducedMotion,
    onFrame(time, stage) {
      now = time;
      parts ??= {
        people: [...stage.querySelectorAll<HTMLElement>('[data-person]')].map((el) => ({
          name: el.dataset.person!,
          el,
          tag: stage.querySelector<HTMLElement>(
            `[data-tag-of="${CSS.escape(el.dataset.person!)}"] > *`,
          )!,
        })),
        dog: stage.querySelector<SVGElement>('[data-part="dog"]')!,
        gate: stage.querySelector<SVGElement>('[data-part="gate"]')!,
        sign: stage.querySelector<HTMLElement>('[data-part="sign"]')!,
        bubbles: [...stage.querySelectorAll<HTMLElement>('[data-part="bubble"]')],
        lead: stage.querySelector<SVGElement>('[data-part="lead"]')!,
        hearts: [...stage.querySelectorAll<SVGElement>('[data-part="heart"]')],
      };
      const people = new Map<string, Drawn>();
      let behindTheDog = true;
      for (const { name, el, tag } of parts.people) {
        const size = Number.parseFloat(el.style.width);
        const layer = el.dataset.layer!;
        if (layer === 'dog') {
          behindTheDog &&= !!(
            el.compareDocumentPosition(parts.dog) & Node.DOCUMENT_POSITION_FOLLOWING
          );
        }
        people.set(name, {
          x: Number.parseFloat(el.style.left) + size / 2,
          y: Number.parseFloat(el.style.top) + 0.8 * size,
          size,
          layer,
          mood: el.dataset.mood!,
          raised: el.dataset.raised === 'true',
          sweat: el.dataset.sweat === 'true',
          tag: Number.parseFloat(tag.style.getPropertyValue('--tag-size')),
        });
      }
      frames.push({
        time,
        people,
        dog: {
          state: parts.dog.dataset.state!,
          marks: parts.dog.dataset.marks!,
          lift: Number(parts.dog.dataset.lift),
          x: Number.parseFloat(parts.dog.style.left),
          y: Number.parseFloat(parts.dog.style.top),
          breath: Number(
            gsap.getProperty(parts.dog.querySelector('[data-part="body"]')!, 'scaleY'),
          ),
        },
        lead:
          parts.lead.style.visibility === 'hidden'
            ? null
            : parts.lead.querySelector('path')!.getAttribute('d'),
        hearts: parts.hearts.filter((el) => el.style.visibility !== 'hidden').length,
        gate: Number(parts.gate.dataset.open),
        sign: parts.sign.textContent ?? '',
        bubbles: parts.bubbles
          .filter((el) => el.style.visibility !== 'hidden')
          .map((el) => ({
            text: el.textContent ?? '',
            by: el.dataset.by!,
            x: Number.parseFloat(el.style.left),
            y: Number.parseFloat(el.style.top),
          })),
        behindTheDog,
      });
    },
  });
  return { plan, frames, record, cues };
}

/** The frames of `run` from `from` up to, not including, `to`. */
export const between = (run: Watched, from: number, to = Infinity) =>
  run.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);

/** The frame of `run` at or just after `t`. */
export const frameAt = (run: Watched, t: number) =>
  run.frames.find((frame) => frame.time >= t - 1e-9) ?? run.frames.at(-1)!;
