// Hide and Seek's script, worked out before the show from the app's pick and
// the show's random: who hides where, when the seeker looks away, who sneaks
// and who is found when, so the stage only has to draw it. Nothing here
// depends on reduced motion.

import { eliminationOrder, pickOne, shuffle, speechBox, type Cue } from '../../scenario-kit';
import { PARK, balconySpots, emerged, type Layout, type Place, type Spot } from './layout';

export const ENDINGS = ['double-take', 'decoy-wave', 'walk-on-by'] as const;
export type Ending = (typeof ENDINGS)[number];

/** Where the seeker's lens is held, from `arrive` to `leave`. */
export interface Stop {
  readonly arrive: number;
  readonly leave: number;
  readonly x: number;
  readonly y: number;
}

/** A person found: the lens clicks on them at `at` and they go up to the balcony from `hop`. */
export interface Pop {
  readonly name: string;
  readonly at: number;
  readonly hop: number;
  readonly from: Spot;
  readonly slot: Spot;
}

/** A hider crossing the open floor from one piece of furniture to another. */
export interface Move {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly depart: number;
  /** When they get there, or where `end` is if the seeker catches them first. */
  readonly arrive: number;
  readonly end: Spot | null;
}

export interface Speech {
  readonly by: string;
  readonly text: string;
  readonly from: number;
  readonly to: number;
  readonly x: number;
  readonly y: number;
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

export interface Named extends Span {
  readonly name: string;
}

/** A stretch in which `name` shows `mood`. */
export interface Feeling extends Named {
  readonly mood: 'worried' | 'happy';
}

export interface Plan {
  readonly ending: Ending;
  readonly unlucky: string;
  readonly finalists: readonly string[];
  /** Which hiding place each person starts in, and the one left empty, if any. */
  readonly homes: ReadonlyMap<string, number>;
  readonly spare: number | null;
  readonly pops: readonly Pop[];
  readonly moves: readonly Move[];
  readonly stops: readonly Stop[];
  /** Spans in which the seeker faces away. */
  readonly away: readonly Span[];
  readonly feelings: readonly Feeling[];
  /** Spans in which a person has their arms up. */
  readonly raised: readonly Named[];
  /** Spans in which a hider is out in front of their furniture. */
  readonly exposed: readonly Named[];
  /** Spans in which a hider's furniture shakes. */
  readonly trembles: readonly Named[];
  readonly speeches: readonly Speech[];
  readonly captions: readonly (readonly [number, string])[];
  readonly cues: readonly (readonly [number, Cue])[];
  readonly hearts: readonly number[];
  readonly lensIn: number;
  readonly lensOut: number;
  /** The last three are lit from here. */
  readonly spotlight: number;
  readonly reveal: number;
  readonly end: number;
}

interface Out {
  pops: Omit<Pop, 'slot'>[];
  moves: Move[];
  stops: Stop[];
  away: Span[];
  feelings: Feeling[];
  raised: Named[];
  exposed: Named[];
  trembles: Named[];
  speeches: Speech[];
  captions: (readonly [number, string])[];
  cues: (readonly [number, Cue])[];
}

interface Floor {
  readonly loc: Map<string, number>;
  readonly free: Set<number>;
}

const newOut = (): Out => ({
  pops: [],
  moves: [],
  stops: [],
  away: [],
  feelings: [],
  raised: [],
  exposed: [],
  trembles: [],
  speeches: [],
  captions: [],
  cues: [],
});

const WORDS = ['Phew!', 'Aw!', 'Oops!', 'Yay!', 'Ha!', 'Drat!'];
const FIRST_ARRIVE = 2.6;
const ROUND = 2.1;
const TEASE = 2.2;
/** A show should not end before this; its longest is under 30 s. */
const LONGEST_SHORT = 21.5;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const dist = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Spot, b: Spot) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function planShow(
  names: readonly string[],
  unlucky: string,
  random: () => number,
  layout: Layout,
): Plan {
  const { places, lane } = layout;
  const order = eliminationOrder(names, unlucky, random);
  const count = order.length;
  const finalists = order.slice(-3);
  const L = order[count - 2]!;
  const X = count >= 3 ? order[count - 3]! : null;

  // Everything chosen at random, drawn before anything is laid out.
  const ending = pickOne(ENDINGS, random);
  const slots = shuffle(finalists, random);
  const words = shuffle(WORDS, random);
  let word = 0;
  const say = () => words[word++ % words.length]!;
  const rounds = count >= 4 ? (count >= 9 ? 5 : count - 3) : 0;
  const teaseBefore = rounds > 0 ? Math.floor(random() * rounds) : -1;
  const teasePick = random();
  const spare = places.length > count ? Math.floor(random() * places.length) : null;
  const sneakKind = random();
  const sneakSlot = random();
  const sneakPick = random();

  const homes = new Map<string, number>();
  let next = 0;
  for (const name of names) {
    if (next === spare) next++;
    homes.set(name, next++);
  }
  const floor: Floor = {
    loc: new Map(homes),
    free: new Set(spare === null ? [] : [spare]),
  };
  const at = (state: Floor, name: string): Place => places[state.loc.get(name)!]!;

  const main = newOut();
  main.stops.push({ arrive: 0, leave: 1.1, x: -100, y: 300 });
  main.away.push({ from: 0, to: 1.05 });
  main.captions.push([0, 'Hide! Best hider gets the job.'], [1.15, 'Ready or not…']);
  main.cues.push([1.0, 'whoosh']);

  /** A bubble's anchor over `by`, kept on the stage. */
  const speak = (out: Out, by: string, from: number, to: number, x: number, text = say()) => {
    const half = speechBox(text, { x: 0, y: lane }).right;
    const clamped = Math.min(1272 - half, Math.max(8 + half, x));
    out.speeches.push({ by, text, from, to, x: clamped, y: lane });
  };
  const found = (out: Out, state: Floor, name: string, time: number, hop: number, from?: Spot) => {
    const place = at(state, name);
    out.pops.push({ name, at: time, hop, from: from ?? emerged(place) });
    out.cues.push([time, 'pop']);
    state.free.add(place.index);
  };

  /**
   * The seeker looks away at `start` and `name` creeps to a free piece of
   * furniture. Caught, they freeze mid-crossing when the seeker turns back
   * and are found there; otherwise the seeker turns back too late. Returns
   * when the next thing may begin.
   */
  const sneak = (out: Out, state: Floor, start: number, name: string, caught: boolean): number => {
    const origin = at(state, name);
    const options = [...state.free].map((index) => places[index]!);
    const far = options.filter((place) => dist(origin, place) >= 120);
    const target = far.length
      ? far.reduce((best, place) => (dist(origin, place) < dist(origin, best) ? place : best))
      : options.reduce((best, place) => (dist(origin, place) > dist(origin, best) ? place : best));
    const depart = start + 1;
    const duration = clamp(dist(origin, target) / 240, 1, 1.8);
    out.captions.push([start, 'Seeker looks away…']);
    out.cues.push([start, 'whoosh'], [depart, 'creak']);
    out.feelings.push({ name, from: depart, to: depart + duration, mood: 'worried' });
    const park = { x: PARK.x, y: PARK.y };

    const buddy = (destination: Place, arrive: number) => {
      if (count < 4) return;
      const foundNames = new Set([...main.pops, ...out.pops].map((pop) => pop.name));
      const others = names.filter((other) => other !== name && !foundNames.has(other));
      const other = others.reduce((best, candidate) =>
        dist(at(state, candidate), destination) < dist(at(state, best), destination)
          ? candidate
          : best,
      );
      const from = at(state, other);
      out.moves.push({
        name: other,
        from: from.index,
        to: destination.index,
        depart,
        arrive,
        end: null,
      });
      out.feelings.push({ name: other, from: depart, to: arrive, mood: 'worried' });
      state.loc.set(other, destination.index);
      state.free.delete(destination.index);
      state.free.add(from.index);
    };

    if (!caught) {
      const arrive = depart + duration;
      const back = arrive + 0.5;
      out.moves.push({ name, from: origin.index, to: target.index, depart, arrive, end: null });
      out.away.push({ from: start, to: back });
      out.captions.push([arrive + 0.6, `${name} made it!`]);
      out.stops.push({ arrive: start + 0.5, leave: back + 0.3, ...park });
      state.loc.set(name, target.index);
      state.free.delete(target.index);
      state.free.add(origin.index);
      buddy(origin, arrive);
      return back + 1.3;
    }

    const freeze = depart + 0.55 * duration;
    const turn = freeze + 0.15;
    const pop = turn + 0.9;
    const end = {
      x: origin.x + 0.55 * (target.x - origin.x),
      y: origin.y + 0.55 * (target.y - origin.y),
      size: origin.size,
    };
    out.moves.push({ name, from: origin.index, to: target.index, depart, arrive: freeze, end });
    out.away.push({ from: start, to: turn });
    out.stops.push(
      { arrive: start + 0.5, leave: turn + 0.2, ...park },
      { arrive: turn + 0.75, leave: pop + 0.7, x: end.x, y: end.y },
    );
    out.cues.push([turn, 'whoosh']);
    out.captions.push([pop, `Caught sneaking, ${name}!`]);
    found(out, state, name, pop, pop + 0.9, end);
    buddy(target, depart + duration * 0.5);
    speak(out, name, pop, pop + 0.6, end.x);
    return pop + 2;
  };

  // The found rounds: the lens visits whoever is found first, and two
  // together when it can.
  const spottable = order.slice(0, Math.max(0, count - 3));
  const pairs = rounds > 0 ? spottable.length - rounds : 0;
  const sizes = Array.from({ length: rounds }, (_, round) => (round < pairs ? 2 : 1));
  const catchable = sizes.flatMap((size, round) => (size === 1 && round >= 1 ? [round] : []));
  const caughtRound =
    sneakKind < 0.5 && catchable.length > 0
      ? catchable[Math.floor(sneakSlot * catchable.length)]!
      : -1;
  const sneakAfter = caughtRound < 0 && rounds > 0 ? Math.floor(sneakSlot * rounds) : -1;
  const pending = [...spottable];
  let arrive = FIRST_ARRIVE;
  for (let round = 0; round < rounds; round++) {
    if (round === teaseBefore) {
      const pool = pending.length > 0 ? pending : finalists;
      const peeked = pool[Math.floor(teasePick * pool.length)]!;
      const place = at(floor, peeked);
      main.stops.push({ arrive, leave: arrive + 0.9, x: place.x, y: place.y });
      main.feelings.push({ name: peeked, from: arrive, to: arrive + 0.9, mood: 'worried' });
      main.trembles.push({ name: peeked, from: arrive + 0.3, to: arrive + 0.9 });
      main.cues.push([arrive + 0.05, 'sniff'], [arrive + 0.45, 'creak']);
      arrive += TEASE;
    }
    if (round === caughtRound) {
      arrive = sneak(main, floor, arrive - 0.4, pending.shift()!, true);
      continue;
    }
    const first = pending.shift()!;
    let second: string | null = null;
    if (round < pairs) {
      const from = at(floor, first);
      second = pending.reduce((best, name) =>
        dist(from, at(floor, name)) < dist(from, at(floor, best)) ? name : best,
      );
      pending.splice(pending.indexOf(second), 1);
    }
    const where = second ? middle(at(floor, first), at(floor, second)) : at(floor, first);
    const hold = Math.max(0.5, 0.9 - 0.08 * round);
    main.stops.push({ arrive, leave: arrive + hold, x: where.x, y: where.y });
    main.captions.push([arrive + 0.12, second ? 'Two at once!' : `Found ${first}!`]);
    const group = [first, ...(second ? [second] : [])];
    let previous: number | null = null;
    group.forEach((name, index) => {
      const time = arrive + 0.12 * (index + 1);
      let x = at(floor, name).x;
      if (previous !== null && Math.abs(x - previous) < 240) {
        x = previous + (x >= previous ? 240 : -240);
        if (x > 1100) x = previous - 240;
      }
      previous = x;
      found(main, floor, name, time, arrive + 1);
      speak(main, name, time, time + 0.6, x);
    });
    arrive += Math.max(1.4, ROUND - 0.14 * round);
    if (round === sneakAfter) {
      const risky = [...pending, ...finalists.filter((name) => name !== unlucky)];
      arrive = sneak(
        main,
        floor,
        arrive - 0.5,
        risky[Math.floor(sneakPick * risky.length)]!,
        false,
      );
    }
  }

  const spotlight = rounds > 0 ? arrive - 0.6 : 2.25;
  main.captions.push([
    spotlight,
    count >= 4 ? 'Final three!' : count === 3 ? 'Just the three of you…' : 'Just the two of you…',
  ]);

  const finale = (visits: number) => {
    const out = newOut();
    const state: Floor = { loc: new Map(floor.loc), free: new Set(floor.free) };
    const targets = [unlucky, L];
    let last = spotlight;
    for (let visit = 0; visit < visits; visit++) {
      const name = targets[visit % 2]!;
      const time = spotlight + 0.9 + 1.5 * visit;
      const place = at(state, name);
      out.stops.push({ arrive: time, leave: time + 0.6, x: place.x, y: place.y });
      out.feelings.push({ name, from: time, to: time + 0.6, mood: 'worried' });
      out.trembles.push({ name, from: time + 0.2, to: time + 0.6 });
      out.cues.push([time + 0.05, 'sniff'], [time + 0.4, 'creak']);
      last = time + 0.6;
    }
    let arrival = last + 1;
    if (spare !== null) {
      const runners = finalists;
      const runner = runners[Math.floor(sneakPick * runners.length)]!;
      arrival = sneak(out, state, last + 0.3, runner, false);
    }
    const uPlace = at(state, unlucky);
    const lPlace = at(state, L);
    const start = X ? at(state, X) : middle(uPlace, lPlace);
    const first = arrival + 0.12;
    out.stops.push({ arrive: arrival, leave: first + 0.9, x: start.x, y: start.y });
    const to = (offset: number) => first + offset;
    let beat: number;
    if (ending === 'double-take') {
      const way = Math.sign(uPlace.x - start.x) || 1;
      const past = { x: Math.min(1220, Math.max(60, uPlace.x + way * 130)), y: uPlace.y };
      out.stops.push(
        { arrive: to(1.75), leave: to(1.85), x: uPlace.x, y: uPlace.y },
        { arrive: to(2.3), leave: to(3), x: past.x, y: past.y },
        { arrive: to(3.5), leave: to(3.62) + 0.4, x: lPlace.x, y: lPlace.y },
      );
      out.captions.push([to(2.3), 'Wait…']);
      out.cues.push([to(2.3), 'creak']);
      out.trembles.push({ name: L, from: to(2.3), to: to(3.4) });
      beat = to(3.62);
    } else if (ending === 'decoy-wave') {
      out.stops.push(
        { arrive: to(1.8), leave: to(2.6), x: uPlace.x, y: uPlace.y },
        { arrive: to(3.15), leave: to(3.27) + 0.4, x: lPlace.x, y: lPlace.y },
      );
      out.captions.push([to(1.8), 'Is it you?']);
      out.feelings.push({ name: unlucky, from: to(1.8), to: to(2.6), mood: 'happy' });
      out.raised.push({ name: L, from: to(1.9), to: to(2.75) });
      out.exposed.push({ name: L, from: to(1.9), to: to(2.75) });
      out.speeches.push({
        by: L,
        text: 'Pick me!',
        from: to(1.9),
        to: to(2.75),
        x: Math.min(1272 - 154, Math.max(8 + 154, lPlace.x)),
        y: lane,
      });
      out.cues.push([to(1.9), 'whoosh']);
      beat = to(3.27);
    } else {
      const mid = middle(uPlace, lPlace);
      out.stops.push(
        { arrive: to(1.7), leave: to(2.5), x: mid.x, y: mid.y },
        { arrive: to(3.05), leave: to(3.17) + 0.4, x: lPlace.x, y: lPlace.y },
      );
      out.captions.push([to(1.8), 'Nobody else here?']);
      out.cues.push([to(1.75), 'sniff']);
      out.feelings.push({ name: L, from: to(1.7), to: to(2.5), mood: 'worried' });
      out.trembles.push({ name: L, from: to(1.7), to: to(2.5) });
      beat = to(3.17);
    }
    return { out, state, first, beat, end: beat + 1.35 + 2.8, uPlace, lPlace };
  };

  let visits = 1;
  while (visits < 10 && finale(visits).end < LONGEST_SHORT) visits++;
  const tail = finale(visits);
  const merge = (to: Out, from: Out) => {
    for (const key of Object.keys(from) as (keyof Out)[]) {
      (to[key] as unknown[]).push(...(from[key] as unknown[]));
    }
  };
  merge(main, tail.out);
  if (X) {
    main.captions.push([tail.first, `Found ${X}!`]);
    found(main, tail.state, X, tail.first, tail.first + 1);
    speak(main, X, tail.first, tail.first + 0.6, at(tail.state, X).x);
  }
  const reveal = tail.beat + 1.35;
  main.captions.push([tail.beat, `Found ${L}!`]);
  found(main, tail.state, L, tail.beat, tail.beat + 1);
  speak(main, L, tail.beat, tail.beat + 0.6, tail.lPlace.x);
  main.stops.push({ arrive: tail.beat + 1.4, leave: tail.beat + 1.4, x: 1380, y: -120 });
  main.away.push({ from: reveal - 0.2, to: reveal + 20 });
  main.captions.push([reveal, `${unlucky} wins Hide and Seek!`]);
  main.cues.push([reveal, 'fanfare']);

  const hearts: number[] = [];
  const beatsFrom = spotlight + 0.3;
  const beatsTo = reveal - 0.4;
  for (let time = beatsFrom; time < beatsTo;) {
    hearts.push(time);
    time += 0.75 - 0.33 * ((time - beatsFrom) / (beatsTo - beatsFrom));
  }
  main.cues.push(...hearts.map((time) => [time, 'heartbeat'] as const));

  main.pops.sort((a, b) => a.at - b.at);
  const balcony = balconySpots(count - 1);
  return {
    ending,
    unlucky,
    finalists: slots,
    homes,
    spare,
    pops: main.pops.map((pop, index) => ({ ...pop, slot: balcony[index]! })),
    moves: main.moves.sort((a, b) => a.depart - b.depart),
    stops: main.stops.sort((a, b) => a.arrive - b.arrive),
    away: main.away,
    feelings: main.feelings,
    raised: main.raised,
    exposed: main.exposed,
    trembles: main.trembles,
    speeches: main.speeches,
    captions: main.captions.sort((a, b) => a[0] - b[0]),
    cues: main.cues.sort((a, b) => a[0] - b[0]),
    hearts,
    lensIn: 1,
    lensOut: tail.beat + 1.4,
    spotlight,
    reveal,
    end: reveal + 2.8,
  };
}
