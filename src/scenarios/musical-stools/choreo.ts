// Where everyone is, and how they feel, at any moment of the show. This is a
// pure function of time: the director only asks and draws. Nothing here
// touches the stage.

import type { Mood } from '../../scenario-kit';
import {
  CENTRE,
  loungeSlot,
  LOUNGE,
  orbit,
  ringOf,
  seatOf,
  seatTag,
  STOOLS,
  tagTop,
  THRONE,
  type Point,
} from './layout';
import type { Score } from './music';
import type { Plan, Round } from './plan';

export type State = 'at-risk' | 'safe' | 'unlucky';

export interface TagSpot {
  /** Which of the person's name tags: the oval they march on, or the throne. */
  readonly key: string;
  readonly x: number;
  readonly top: number;
  readonly opacity: number;
}

export interface Pose {
  /** The face's centre. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Up (negative) or down, in px, on top of the position: bounces and leaps. */
  readonly lift: number;
  /** Degrees. */
  readonly tilt: number;
  readonly state: State;
  readonly mood: Mood;
  readonly raised: boolean;
  readonly sweat: boolean;
  readonly tag: TagSpot | null;
}

/** Beats in one turn of the oval. */
const LAP = 24;
const TURN = (2 * Math.PI) / LAP;
/** The first person drops in at this time; each next one a little later, and they land this fast. */
const DROP = { first: 0.05, gap: 0.07, length: 0.6, height: 520 };
/** The rush for the stools: how far toward them the losers get, and how long they take. */
const DASH = { reach: 0.55, crowd: 0.25, length: 0.45, shake: 0.4 };
const BUMP = { before: 0.25, length: 0.55, push: 70 };
const LEAP = { stool: 60, lounge: 110 };
/** The glide to the throne, after the fanfare. */
const GLIDE = { from: 0.35, length: 0.75 };
const THRONE_SIZE = THRONE.size;
const THRONE_FACE: Point = { x: THRONE.x, y: THRONE.y + 10 };
/** Seconds the throne's name tag takes to appear once the glide is done. */
const TAG_IN = 0.25;

const clamp = (x: number, low = 0, high = 1) => Math.min(high, Math.max(low, x));
const smooth = (x: number) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
const easeOut = (x: number) => 1 - (1 - clamp(x)) ** 2;
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const along = (a: Point, b: Point, u: number): Point => ({
  x: mix(a.x, b.x, u),
  y: mix(a.y, b.y, u),
});

/** A ball that drops and settles in three bounces: 0 at the start, 1 at the end. */
function bounce(x: number): number {
  const u = clamp(x);
  if (u < 1 / 2.75) return 7.5625 * u * u;
  if (u < 2 / 2.75) return 7.5625 * (u - 1.5 / 2.75) ** 2 + 0.75;
  if (u < 2.5 / 2.75) return 7.5625 * (u - 2.25 / 2.75) ** 2 + 0.9375;
  return 7.5625 * (u - 2.625 / 2.75) ** 2 + 0.984375;
}

interface Seat {
  readonly round: number;
  readonly stool: Point;
  readonly arrival: number;
  /** When this sitter starts hopping to the lounge. */
  readonly leave: number;
  /** The name tag worn on the stool, so everyone can tell who just got safe. */
  readonly tag: string;
  readonly lounge: Point;
}

export interface Choreography {
  pose(name: string, t: number): Pose;
  /** 0 to 1: how much of stool `k` of the `count` stools shows. */
  stool(count: number, k: number, t: number): number;
  gramophone(t: number): 'playing' | 'stutter' | 'stopped';
  /** 0 to 1: how dark the room is around the oval. */
  spotlight(t: number): number;
  /** 0 to 1: how much of the throne there is. */
  throne(t: number): number;
  /** The beat the music is at, for the gramophone's record and the drifting notes. */
  beat(t: number): number;
  /** When each person lands on a stool. */
  readonly arrivals: ReadonlyMap<string, number>;
  /** When the tag keys of `name` are used. */
  tagKeys(name: string): readonly string[];
}

export function choreograph(
  plan: Plan,
  unlucky: string,
  score: Score,
  reducedMotion: boolean,
): Choreography {
  const { rounds } = plan;
  const last = rounds.at(-1)!;
  const stopBeat = (round: Round) => score.at(round.stop).beat;

  /** The turn that puts the unlucky person at the oval's right at the last stop. */
  const duelTurn = (() => {
    const at = last.marchers.indexOf(unlucky);
    return -stopBeat(last) * TURN - Math.PI * at;
  })();
  const turnOf = (index: number) => (index === rounds.length - 1 ? duelTurn : 0);

  const ringPoint = (index: number, name: string, t: number) => {
    const round = rounds[index]!;
    const at = round.marchers.indexOf(name);
    const ring = ringOf(round.marchers.length);
    const angle =
      score.at(t).beat * TURN + turnOf(index) + (2 * Math.PI * at) / round.marchers.length;
    return { ...orbit(ring, angle), size: ring.size, ring };
  };

  // Who sits where and who is next to the throne.
  const seats = new Map<string, Seat>();
  const arrivals = new Map<string, number>();
  const exit = new Map<string, number>();
  const sitters: string[] = [];
  rounds.forEach((round, index) => {
    const stools = STOOLS[round.stools]!;
    const here = round.sitters
      .map((name) => ({ name, from: ringPoint(index, name, round.stop) }))
      .sort((a, b) => a.from.x - b.from.x);
    // Left to right, to the stools left to right; the nearest land first.
    const placed = here.map((each, k) => ({
      ...each,
      stool: seatOf(stools[k]!, each.from.size),
      distance: Math.hypot(each.from.x - stools[k]!.x, each.from.y - stools[k]!.y),
    }));
    placed
      .sort((a, b) => a.distance - b.distance)
      .forEach((each, k) => {
        sitters.push(each.name);
        exit.set(each.name, index);
        arrivals.set(each.name, round.arrivals[k]!);
        seats.set(each.name, {
          round: index,
          stool: each.stool,
          arrival: round.arrivals[k]!,
          leave: round.leaves[k]!,
          tag: seatTag(round.stools).name,
          lounge: { x: 0, y: 0 },
        });
      });
  });
  sitters.forEach((name, order) => {
    const seat = seats.get(name)!;
    seats.set(name, { ...seat, lounge: loungeSlot(order, sitters.length) });
  });

  const tagKeys = new Map<string, string[]>();
  plan.ring.forEach((name) => {
    const keys = new Set<string>();
    rounds.forEach((round) => {
      if (round.marchers.includes(name)) keys.add(ringOf(round.marchers.length).name);
    });
    if (name === unlucky) keys.add('throne');
    const seated = seats.get(name);
    if (seated) keys.add(seated.tag);
    tagKeys.set(name, [...keys]);
  });

  const dashTarget = (index: number, from: Point & { size: number }): Point => {
    if (index === rounds.length - 1)
      return along(from, seatOf(STOOLS[1]![0]!, from.size), DASH.reach);
    return along(from, CENTRE, DASH.crowd);
  };

  /** Standing or marching in round `index`: the beat's bounce on top of the oval. */
  function marching(index: number, name: string, t: number) {
    const spot = ringPoint(index, name, t);
    const { beat, speed } = score.at(t);
    const slot = rounds[index]!.marchers.indexOf(name);
    const env = reducedMotion ? 0 : clamp(speed / 1.6);
    const lift = -0.06 * spot.size * Math.abs(Math.sin(Math.PI * (beat + 0.37 * slot))) * env;
    const tilt = 4 * Math.sin(Math.PI * (beat + 0.37 * slot)) * env;
    return { spot, lift, tilt };
  }

  function pose(name: string, t: number): Pose {
    const home = exit.get(name);
    const bound = home ?? rounds.length - 1;
    let index = rounds.findIndex((round) => t < round.next);
    if (index < 0) index = rounds.length - 1;
    index = Math.min(index, bound);
    const round = rounds[index]!;
    const spotlit = t >= plan.spotlight && t < plan.fanfare;
    const seat = seats.get(name);

    // Safe: from the stool onwards.
    if (seat && seat.round === index && t >= seat.arrival) {
      const sat = { x: seat.stool.x, y: seat.stool.y };
      const size = ringOf(round.marchers.length).size;
      if (t < seat.leave) {
        const hop = reducedMotion ? 0 : -0.04 * size * Math.abs(Math.sin(12 * (t - seat.arrival)));
        const sitting = happy(sat, size, hop, true);
        const fade =
          smooth((t - seat.arrival) / 0.15) * (1 - smooth((t - seat.leave + 0.15) / 0.15));
        // The middle of three stools wears its tag lower, so wide names never touch the others.
        const drop = rounds[index]!.stools === 3 && seat.stool.x === STOOLS[3]![1]!.x ? 62 : 0;
        return {
          ...sitting,
          tag: { key: seat.tag, x: sat.x, top: tagTop(sat.y, size) + drop, opacity: fade },
        };
      }
      const u = clamp((t - seat.leave) / round.hopLength);
      const e = smooth(u);
      const at = along(sat, seat.lounge, e);
      const leap = -LEAP.lounge * Math.sin(Math.PI * u);
      const cheer =
        u < 1 || reducedMotion
          ? 0
          : -0.05 * LOUNGE.size * Math.abs(Math.sin(4 * (t - seat.leave) + seat.lounge.x));
      return happy(at, mix(size, LOUNGE.size, e), leap + cheer, true);
    }

    const done = name === unlucky && t >= plan.fanfare;
    const state: State = done ? 'unlucky' : 'at-risk';

    // On the way to a stool.
    if (seat && seat.round === index && t >= round.scramble) {
      const from = ringPoint(index, name, round.scramble);
      const flight = seat.arrival - round.scramble;
      const u = smooth((t - round.scramble) / flight);
      const at = along(from, seat.stool, u);
      return {
        x: at.x,
        y: at.y,
        size: mix(from.size, ringOf(round.marchers.length).size, u),
        lift: -LEAP.stool * Math.sin(Math.PI * u),
        tilt: 0,
        state: 'at-risk',
        mood: 'scared',
        raised: false,
        sweat: spotlit,
        tag: null,
      };
    }

    // Left standing in the last round: the throne, and what leads to it.
    if (index === rounds.length - 1 && t >= round.scramble) return unluckyAfter(name, t, state);

    // Left standing in an earlier round: a dash, a stand and a flow into the smaller oval.
    if (t >= round.scramble) {
      const from = ringPoint(index, name, round.scramble);
      const to = dashTarget(index, from);
      const u = easeOut((t - round.scramble) / DASH.length);
      const dash = along(from, to, u);
      const since = t - round.scramble - DASH.length;
      const shake =
        reducedMotion || since < 0 || since > DASH.shake
          ? 0
          : 9 * Math.sin(since * 60) * (1 - since / DASH.shake);
      const flow = smooth((t - (round.hop + 0.1)) / (round.next - round.hop - 0.1));
      const target = ringPoint(index + 1, name, t);
      const at =
        flow > 0
          ? along({ ...dash, x: dash.x + shake }, target, flow)
          : { ...dash, x: dash.x + shake };
      const settled = t >= round.next;
      return {
        x: at.x,
        y: at.y,
        size: flow > 0 ? mix(from.size, target.size, flow) : from.size,
        lift: 0,
        tilt: 0,
        state: 'at-risk',
        mood: settled ? 'worried' : 'scared',
        raised: false,
        sweat: spotlit,
        tag: null,
      };
    }

    // Marching, standing and waiting for the music to start.
    const { spot, lift, tilt } = marching(index, name, t);
    const slot = plan.ring.indexOf(name);
    const dropped = DROP.first + DROP.gap * slot;
    const falling = index === 0 && t < dropped + DROP.length;
    const drop = falling ? (1 - bounce((t - dropped) / DROP.length)) * -DROP.height : 0;
    const frozen = t >= round.stop;
    const stutter = round.stutters.some((s) => t >= s.at && t < s.end);
    const mood: Mood = frozen ? 'scared' : stutter || spotlit ? 'worried' : 'calm';
    const landed = dropped + DROP.length;
    return {
      x: spot.x,
      y: spot.y,
      size: spot.size,
      lift: lift + drop,
      tilt,
      state,
      mood,
      raised: false,
      sweat: spotlit && !stutter,
      tag:
        index === 0 && t < landed
          ? null
          : {
              key: spot.ring.name,
              x: spot.x,
              top: tagTop(spot.y, spot.size),
              opacity: index === 0 ? smooth((t - landed) / 0.2) : 1,
            },
    };
  }

  function happy(at: Point, size: number, lift: number, raised: boolean): Pose {
    return {
      x: at.x,
      y: at.y,
      size,
      lift,
      tilt: 0,
      state: 'safe',
      mood: 'happy',
      raised,
      sweat: false,
      tag: null,
    };
  }

  /** The person left standing in the duel: the rush, the loss and the throne. */
  function unluckyAfter(name: string, t: number, state: State): Pose {
    const round = last;
    const from = ringPoint(rounds.length - 1, name, round.scramble);
    const to = dashTarget(rounds.length - 1, from);
    const u = easeOut((t - round.scramble) / DASH.length);
    const dash = along(from, to, u);
    const arrival = round.arrivals[0]!;
    const bump = plan.ending === 'hip-bump';
    const side = from.x >= CENTRE.x ? 1 : -1;
    const push = bump ? side * BUMP.push * smooth((t - (arrival - BUMP.before)) / BUMP.length) : 0;
    const spin =
      bump && !reducedMotion ? 360 * easeOut((t - (arrival - BUMP.before)) / BUMP.length) : 0;
    const rest = { x: dash.x + push, y: dash.y };
    const glide = smooth((t - plan.fanfare - GLIDE.from) / GLIDE.length);
    const at = along(rest, THRONE_FACE, glide);
    const size = mix(from.size, THRONE_SIZE, glide);
    const done = t >= plan.fanfare;
    const shown = t >= plan.fanfare + GLIDE.from + GLIDE.length;
    return {
      x: at.x,
      y: at.y,
      size,
      lift: 0,
      tilt: done ? 0 : spin % 360,
      state,
      mood: done ? 'party' : t >= round.stop ? 'scared' : 'worried',
      raised: done,
      sweat: !done && t >= plan.spotlight,
      tag: shown
        ? {
            key: 'throne',
            x: at.x,
            top: tagTop(at.y, size),
            opacity: smooth((t - plan.fanfare - GLIDE.from - GLIDE.length) / TAG_IN),
          }
        : null,
    };
  }

  const stoolRounds = rounds.map((round) => ({
    count: round.stools,
    from: round.stoolsFrom,
    to: round.stoolsTo,
  }));

  return {
    pose,
    arrivals,
    tagKeys: (name) => tagKeys.get(name) ?? [],
    beat: (t) => score.at(t).beat,
    stool(count, k, t) {
      if (k >= count) return 0;
      let shown = 0;
      for (const round of stoolRounds) {
        if (round.count !== count) continue;
        const rise = smooth((t - round.from) / 0.3);
        const fall = 1 - smooth((t - (round.to - 0.15)) / 0.15);
        shown = Math.max(shown, t >= round.from && t <= round.to ? Math.min(rise, fall) : 0);
      }
      return shown;
    },
    gramophone(t) {
      for (const round of rounds) {
        if (round.stutters.some((s) => t >= s.at && t < s.end)) return 'stutter';
        if (round.windows.some((w) => t >= w.from && t < w.to)) return 'playing';
      }
      return 'stopped';
    },
    spotlight: (t) => smooth((t - plan.spotlight) / 0.4) * (1 - smooth((t - plan.fanfare) / 0.4)),
    throne: (t) => smooth((t - plan.fanfare - 0.15) / 0.5),
  };
}
