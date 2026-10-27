// Who stands where, whose turn it is when, what stirs the dog and how long
// each moment lasts. The show only acts out the app's pick: the turns are
// drawn backwards from the waking, which always comes on the unlucky
// person's turn with three or two left, the line is seated so the turns go
// along it, and the plan is fitted to a length and timed forwards.

import { pickOne, shuffle, type Mood } from '../../scenario-kit';
import { lane, seat, sideOfSeat, type Side } from './layout';

/**
 * How the dog wakes on the last turn: `on-back`, its eyes open while the
 * crosser is on its back; `creak`, they get over it and the gate creaks;
 * `sniff`, it sniffs as they reach it, and again, and opens its eyes.
 */
export type Ending = 'on-back' | 'creak' | 'sniff';

/**
 * What stirs the dog on a turn: `sniff`, it lifts its head and sniffs as the
 * crosser reaches it; `wuf`, an ear twitches and it mumbles while they are
 * on its back; `creak`, the gate creaks as it opens.
 */
export type Scare = 'sniff' | 'wuf' | 'creak';

/**
 * `safe`, a crossing that gets through; `nope`, with 2 or 3 people, a tiptoe
 * up to the dog and back; `nearly`, the careful crossing that gets the
 * biggest scare; `last`, the unlucky person's, which wakes it.
 */
export type Kind = 'safe' | 'nope' | 'nearly' | 'last';

/** Places along the way past the dog; the layout says where each is for each person. */
export type Place =
  'seat' | 'lane' | 'lane-end' | 'over' | 'back' | 'gateway' | 'behind' | 'fence' | 'front';

/**
 * Someone is at `place` at `at` show seconds, and moves there from the key
 * before: on tiptoe with `tiptoe`, in a hop with `hop`, otherwise walking.
 */
export interface Key {
  readonly at: number;
  readonly place: Place;
  readonly tiptoe?: boolean;
  readonly hop?: boolean;
}

/** A stretch of show seconds. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/** One person's way past the dog on a turn, in show seconds. */
export interface Crossing {
  readonly by: string;
  readonly side: Side;
  /** In the lane, and off on tiptoe. */
  readonly lane: number;
  /** At the lane's end, by the dog. */
  readonly reaches: number;
  /** Tiptoeing, in stage pixels a second. */
  readonly speed: number;
  /** Over its head or tail; null when they turn back or it wakes first. */
  readonly over: number | null;
  readonly back: number | null;
  readonly gateway: number | null;
  /** Through the gate; null unless it gets through. */
  readonly through: number | null;
  /** At their spot behind the fence: "Phew!". */
  readonly fence: number | null;
}

export interface Turn {
  readonly kind: Kind;
  /** Who crosses: two neighbours together before the final three at 9 or more. */
  readonly by: readonly string[];
  /** Show seconds the crossers step out. */
  readonly from: number;
  /** Show seconds the caption names them: `from`, unless the caption before needs its second. */
  readonly named: number;
  /** What stirs the dog; null when nothing does. On the last turn, how the ending starts. */
  readonly scare: Scare | null;
  /** While whoever the scare stops holds still. On the last turn, until the dog's eyes open. */
  readonly hold: Span | null;
  /** Show seconds its crossers count as safe; null unless they get through. */
  readonly through: number | null;
  readonly crossings: readonly Crossing[];
  /** While the gate swings open and back; null when nobody reaches it. */
  readonly gate: Span | null;
  /** Show seconds the next beat starts. */
  readonly next: number;
}

/** Something said in a bubble: by a person, the dog or the gate. */
export interface Saying {
  readonly at: number;
  readonly text: string;
  readonly by: string;
}

/** How deeply the dog sleeps, and how it wakes. */
export type DogState = 'deep' | 'light' | 'restless' | 'half' | 'peek' | 'awake' | 'stand';

export interface Plan {
  /**
   * Everyone in their place along the line, left to right: the turn order
   * seated from a random place along it, so each turn goes to the next one
   * along, wrapping round.
   */
  readonly order: readonly string[];
  /** How many are at risk when it wakes: 3 or 2; with 2 people, 2. */
  readonly wakesWith: number;
  /** The final three, the unlucky person among them; with 2 people, both. */
  readonly final: readonly string[];
  readonly ending: Ending;
  readonly turns: readonly Turn[];
  /** Show seconds the dog starts each state; Infinity for one it never reaches. */
  readonly sleep: Readonly<Record<DogState, number>>;
  /** While the dog peeks with both eyes, on Nearly's scare; null without Nearly. */
  readonly peek: Span | null;
  /** Show seconds of "Final three!", or of "Just the … of you…" with 2 or 3. */
  readonly spotlight: number;
  readonly finalTwo: number | null;
  /** Show seconds the dog's eyes open: "Uh-oh…". */
  readonly wakes: number;
  /** Show seconds of "Woof!": the unlucky person hops down and the dog jumps up. */
  readonly woof: number;
  /** Show seconds the lead, the hearts and the fanfare come. */
  readonly walkies: number;
  /** Show seconds of each heartbeat, from the spotlight until the dog wakes, quicker and quicker. */
  readonly heartbeats: readonly number[];
  /** Everyone's way, key by key; someone with none stays in their seat. */
  readonly paths: ReadonlyMap<string, readonly Key[]>;
  /** Who goes through the gate, in the order they do; the slip-outs at the end last. */
  readonly safe: readonly string[];
  /** Show seconds each caption comes, in order. */
  readonly captions: readonly { readonly at: number; readonly text: string }[];
  readonly says: readonly Saying[];
  /** Show seconds the show ends. */
  readonly end: number;
}

/**
 * Seconds from one caption to the next that must not wait: the kit keeps
 * each up for a second, and a frame more covers the frame they're asked in.
 */
export const READ = 1.04;

/**
 * The first turn starts at `first` (`many` from 9); with 2 or 3, "Just the
 * … of you…" comes between the opening and the first turn, at `small`.
 */
const OPENING = { first: 2.6, many: 2.3, small: 3 * READ };
/**
 * A turn, from its start: they step back into the lane from `wait` in
 * `back`; tiptoe at `speed` (Nearly and the last turns at `careful`), at
 * least `least` seconds; over the dog's end in `over`, onto its back in
 * `onto`, to the gateway in `gateway`, the gate swinging open in `gate`
 * before they reach it; behind the fence and up to their spot in `fence`.
 */
export const WAY = {
  wait: 0.25,
  back: 0.45,
  speed: 380,
  careful: 260,
  least: 0.45,
  over: 0.3,
  onto: 0.35,
  gateway: 0.4,
  gate: 0.3,
  fence: 0.8,
} as const;
/** How long each scare holds everyone it stops, at full length. */
export const HOLD: Readonly<Record<Scare, number>> = { sniff: 1.0, wuf: 1.1, creak: 0.9 };
/** No freeze is shorter than this. */
export const LEAST_HOLD = 0.7;
/**
 * The next turn starts this long after the first crosser is through (as a
 * pair's second goes through), and never sooner than `few` (`many` from 7)
 * after this one.
 */
const NEXT = { after: 0.45, few: 2.7, many: 2.3 };
/** A pair's second follows the first this many seconds behind. */
export const PAIR = 0.45;
/** From "Final three!" to the first final turn. */
const FINAL_THREE = 1.3;
/** The last turn starts this long after "Final two!"; its caption waits its second. */
const FINAL_TWO = 0.6;
/** A Nope: back from the lane's end to the lane, then to the seat in `seat`; the next turn `next` after. */
const NOPE = { seat: 0.45, next: 0.3 };
/** Nearly's peek starts and ends this far inside its scare. */
const PEEK = 0.2;
/** The endings, in seconds: sniffs; on its back, peeking from `peek`; from the gateway after the creak. */
const ENDINGS: readonly Ending[] = ['on-back', 'creak', 'sniff'];
export const WAKE = { sniffs: [1.0, 0.7], back: 1.1, peek: 0.4, creak: 0.6 } as const;
/** After the eyes open: still for `still`, then the woof; the hop takes `hop`, the walk comes `walkies` after the woof and the show ends `end` after it. */
export const WALK = { still: 0.75, hop: 0.5, walkies: 0.5, end: 2.9 } as const;
/** Whoever hasn't crossed slips out after the woof: from `from`, `apart` seconds apart, `seconds` each. */
export const SLIP = { from: 0.1, apart: 0.3, seconds: 1.2 } as const;
/** The first heartbeat gap, how much shorter each next one is, and the shortest. */
const HEARTBEAT = { first: 0.95, quicker: 0.93, shortest: 0.45 };
/**
 * The fit: safe turns' walks and holds scale by `safe` (0.8 to 1.2), then
 * the final turns' walks by `final` (0.8 to 1.3), so a show lands between
 * `target(…) − 2.5` and `target(…)` where it can.
 */
const FIT = { safe: [0.8, 1.2], final: [0.8, 1.3], band: 2.5 } as const;

/** The longest a show aims to be at `people`, waking with `wakesWith` left. */
export function target(people: number, wakesWith: number): number {
  return Math.min(28.5, 22 + (people - 6) + (wakesWith === 2 ? 3 : 0));
}

/** A turn as drawn: who goes, what kind, and what stirs the dog. */
interface Drawn {
  readonly kind: Kind;
  readonly by: readonly string[];
  readonly scare: Scare | null;
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const people = names.length;
  const small = people <= 3;
  const ending = pickOne(ENDINGS, random);
  const wakesWith = people === 2 ? 2 : pickOne([3, 2], random);
  const scareOf = () => pickOne<Scare>(['sniff', 'wuf', 'creak'], random);

  // Backwards from the waking: the turns, then the line seated so they go along it.
  const drawn: Drawn[] = [];
  let order: string[];
  let final: string[];
  if (small) {
    // Round the line from wherever it starts, so the last turn is theirs.
    order = shuffle(names, random);
    final = [...names];
    const at = order.indexOf(unlucky);
    const before = (k: number) => order[(((at - k) % people) + people) % people]!;
    // Everyone has a turn: with 2, one or two Nopes before theirs; with 3,
    // a Nope from each who goes before them, the one just before them
    // crossing carefully when it wakes with 2.
    const careful = wakesWith === 2 && people === 3 ? 1 : 0;
    const nopes = people === 2 ? pickOne([1, 2], random) : 2 - careful;
    for (let k = nopes + careful; k > careful; k--) {
      drawn.push({ kind: 'nope', by: [before(k)], scare: 'sniff' });
    }
    if (careful) drawn.push({ kind: 'nearly', by: [before(1)], scare: scareOf() });
    drawn.push({ kind: 'last', by: [unlucky], scare: null });
  } else {
    const [a, b, ...crossers] = shuffle(
      names.filter((name) => name !== unlucky),
      random,
    ) as [string, string, ...string[]];
    final = wakesWith === 3 ? [unlucky, a, b] : [a, unlucky, b];
    // At 9 or more, the safe turns but the last go in pairs, with one single
    // turn at a random place among them when the count is odd.
    const rest = crossers.slice(0, -1);
    const single =
      people >= 9 && rest.length % 2 === 1 ? Math.floor(random() * ((rest.length + 1) / 2)) : -1;
    const safe: string[][] = [];
    for (let at = 0; at < rest.length;) {
      const size = people >= 9 && safe.length !== single ? 2 : 1;
      safe.push(rest.slice(at, at + size));
      at += size;
    }
    safe.push([crossers.at(-1)!]);
    // The first is quiet; from 7, every other one, counting back from the
    // last, is quiet too; pairs are never stirred.
    const last = safe.length - 1;
    safe.forEach((by, index) => {
      const quiet = index === 0 || by.length === 2 || (people >= 7 && (last - index) % 2 === 1);
      drawn.push({ kind: 'safe', by, scare: quiet ? null : scareOf() });
    });
    if (wakesWith === 2) drawn.push({ kind: 'nearly', by: [a], scare: scareOf() });
    drawn.push({ kind: 'last', by: [unlucky], scare: null });
  }
  if (!small) {
    // Those who never cross stand next along after the unlucky person.
    const turnOrder = [
      ...drawn.flatMap((turn) => turn.by),
      ...final.filter((name) => !drawn.some((turn) => turn.by.includes(name))),
    ];
    const offset = Math.floor(random() * people);
    order = [...turnOrder.slice(offset), ...turnOrder.slice(0, offset)];
  }

  // The fit: the safe turns' pace, then the final turns'.
  const timeWith = (safe: number, careful: number) =>
    time({ order: order!, drawn, unlucky, ending, small, safe, careful });
  const [lo, hi] = [target(people, wakesWith) - FIT.band, target(people, wakesWith)];
  let pace = 1;
  let careful = 1;
  const length = () => timeWith(pace, careful).end;
  if (length() > hi) {
    pace = solve((f) => timeWith(f, 1).end - hi, FIT.safe[0], 1);
    if (timeWith(pace, 1).end > hi) {
      careful = solve((g) => timeWith(pace, g).end - hi, FIT.final[0], 1);
    }
  } else if (length() < lo) {
    pace = solve((f) => timeWith(f, 1).end - lo, 1, FIT.safe[1]);
    if (timeWith(pace, 1).end < lo) {
      careful = solve((g) => timeWith(pace, g).end - lo, 1, FIT.final[1]);
    }
  }
  const timed = timeWith(pace, careful);
  return { ...timed, order: order!, wakesWith, final, ending };
}

/**
 * The value from `low` to `high` where the rising `excess` comes to 0, or
 * the end it is nearest: so a fit that can't reach its target goes as far
 * as it may.
 */
function solve(excess: (value: number) => number, low: number, high: number): number {
  if (excess(low) >= 0) return low;
  if (excess(high) <= 0) return high;
  for (let k = 0; k < 30; k++) {
    const middle = (low + high) / 2;
    if (excess(middle) > 0) high = middle;
    else low = middle;
  }
  return low;
}

interface Timing {
  readonly order: readonly string[];
  readonly drawn: readonly Drawn[];
  readonly unlucky: string;
  readonly ending: Ending;
  readonly small: boolean;
  /** How much longer the safe turns' walks and holds take than at their pace. */
  readonly safe: number;
  /** How much longer the final turns' walks take. */
  readonly careful: number;
}

/** The turns timed forwards from the opening, and everything that follows from them. */
function time({ order, drawn, unlucky, ending, small, safe: f, careful: g }: Timing) {
  const people = order.length;
  const way = lane(people);
  const turns: Turn[] = [];
  const paths = new Map<string, Key[]>();
  const keys = (name: string) => {
    let path = paths.get(name);
    if (!path) paths.set(name, (path = []));
    return path;
  };
  const captions: { at: number; text: string }[] = [
    { at: 0, text: "Don't wake the dog!" },
    { at: READ, text: 'Whoever wakes it gets the job' },
  ];
  const caption = (at: number, text: string) => {
    const due = Math.max(at, captions.at(-1)!.at + READ);
    captions.push({ at: due, text });
    return due;
  };
  const says: Saying[] = [];
  const safe: string[] = [];
  const sleep: Record<DogState, number> = {
    deep: 0,
    light: Infinity,
    restless: Infinity,
    half: Infinity,
    peek: Infinity,
    awake: Infinity,
    stand: Infinity,
  };
  let spotlight = Infinity;
  if (small) {
    spotlight = caption(2 * READ, people === 2 ? 'Just the two of you…' : 'Just the three of you…');
    sleep.half = spotlight;
  }
  const safeTurns = drawn.filter((turn) => turn.kind === 'safe').length;
  const restlessAfter = Math.max(2, Math.ceil((2 / 3) * safeTurns));
  let finalTwo: number | null = null;
  let peek: Span | null = null;
  let wakes = 0;
  let s = small ? OPENING.small : people >= 9 ? OPENING.many : OPENING.first;
  let safeSoFar = 0;

  for (const turn of drawn) {
    const final = turn.kind !== 'safe';
    const speed = final ? WAY.careful / g : WAY.speed / f;
    const walk = (seconds: number) => seconds * (final ? g : f);
    const holdOf = (scare: Scare) =>
      Math.max(LEAST_HOLD, HOLD[scare] * (turn.kind === 'safe' ? f : 1));
    const named = caption(
      s,
      turn.by.length === 2 ? `${turn.by[0]} & ${turn.by[1]}!` : `${turn.by[0]}'s turn`,
    );
    const crossings: Crossing[] = [];
    let hold: Span | null = null;
    let through: number | null = null;
    let next = 0;
    for (const [k, by] of turn.by.entries()) {
      const index = order.indexOf(by);
      const side = sideOfSeat(index, people);
      const own = seat(index, people);
      const path = keys(by);
      const start = s + k * PAIR;
      const inLane = start + WAY.wait + walk(WAY.back);
      const distance = Math.abs(own.x - way.end(side));
      const reaches = inLane + Math.max(walk(WAY.least), distance / speed);
      path.push(
        { at: start + WAY.wait, place: 'seat' },
        { at: inLane, place: 'lane' },
        { at: reaches, place: 'lane-end', tiptoe: true },
      );
      const crossing = { by, side, lane: inLane, reaches, speed };
      const none = { over: null, back: null, gateway: null, through: null, fence: null };
      let t = reaches;
      /** Holds still at `place` from `t` if this turn's scare is `scare`, for its first crosser. */
      const freeze = (scare: Scare, place: Place): Span | null => {
        if (turn.scare !== scare || k > 0) return null;
        const span = { from: t, to: t + holdOf(scare) };
        path.push({ at: span.to, place });
        return span;
      };

      if (turn.kind === 'nope') {
        hold = freeze('sniff', 'lane-end')!;
        t = hold.to;
        says.push({ at: t, text: 'Nope!', by });
        const back = t + (reaches - inLane);
        path.push(
          { at: back, place: 'lane', tiptoe: true },
          { at: back + NOPE.seat, place: 'seat' },
        );
        crossings.push({ ...crossing, ...none });
        next = back + NOPE.seat + NOPE.next;
        continue;
      }
      if (turn.kind === 'last' && ending === 'sniff') {
        hold = { from: t, to: t + WAKE.sniffs[0] + WAKE.sniffs[1] };
        says.push(
          { at: t, text: 'Sniff…', by: 'dog' },
          { at: t + WAKE.sniffs[0], text: 'Sniff!', by: 'dog' },
        );
        wakes = hold.to;
        crossings.push({ ...crossing, ...none });
        continue;
      }
      const sniff = freeze('sniff', 'lane-end');
      if (sniff) [hold, t] = [sniff, sniff.to];
      const over = (t += walk(WAY.over));
      path.push({ at: t, place: 'over' });
      const onBack = (t += walk(WAY.onto));
      path.push({ at: t, place: 'back' });
      if (turn.kind === 'last' && ending === 'on-back') {
        hold = { from: t, to: t + WAKE.back };
        says.push({ at: t, text: 'Wuf…', by: 'dog' });
        wakes = hold.to;
        crossings.push({ ...crossing, ...none, over, back: onBack });
        continue;
      }
      const wuf = freeze('wuf', 'back');
      if (wuf) [hold, t] = [wuf, wuf.to];
      const gateway = (t += walk(WAY.gateway));
      path.push({ at: t, place: 'gateway' });
      if (turn.kind === 'last') {
        // The creak.
        hold = { from: t, to: t + WAKE.creak };
        says.push({ at: t - WAY.gate, text: 'Creak!', by: 'gate' });
        wakes = hold.to;
        crossings.push({ ...crossing, ...none, over, back: onBack, gateway });
        continue;
      }
      const creak = freeze('creak', 'gateway');
      if (creak) [hold, t] = [creak, creak.to];
      const fence = t + walk(WAY.fence);
      path.push({ at: t + walk(WAY.fence) / 2, place: 'behind' }, { at: fence, place: 'fence' });
      says.push({ at: fence, text: turn.kind === 'nearly' ? 'Phew!!' : 'Phew!', by });
      safe.push(by);
      through = t;
      crossings.push({ ...crossing, over, back: onBack, gateway, through: t, fence });
    }

    // What the scare says, as it stirs.
    if (
      hold &&
      turn.scare &&
      (turn.kind === 'safe' || turn.kind === 'nearly' || turn.kind === 'nope')
    ) {
      says.push(
        turn.scare === 'creak'
          ? { at: hold.from - WAY.gate, text: 'Creak!', by: 'gate' }
          : { at: hold.from, text: turn.scare === 'sniff' ? 'Sniff…' : 'Wuf…', by: 'dog' },
      );
    }
    if (turn.kind === 'nearly' && hold) peek = { from: hold.from + PEEK, to: hold.to - PEEK };

    const gateways = crossings.flatMap((crossing) =>
      crossing.gateway === null ? [] : [crossing.gateway],
    );
    const gate: Span | null =
      gateways.length === 0
        ? null
        : { from: gateways[0]! - WAY.gate, to: through !== null ? through + WAY.gate : Infinity };

    if (turn.kind === 'safe') {
      safeSoFar++;
      if (safeSoFar === 1) sleep.light = through!;
      if (safeSoFar === restlessAfter) sleep.restless = through!;
      const least = s + (people >= 7 ? NEXT.many : NEXT.few);
      next = Math.max(least, crossings[0]!.through! + NEXT.after, through!);
      if (safeSoFar === safeTurns) {
        // As the last of them goes through.
        spotlight = caption(Math.max(least, through!), 'Final three!');
        sleep.half = spotlight;
        next = spotlight + FINAL_THREE;
      }
    } else if (turn.kind === 'nearly') {
      // As the dog shuts its eyes again; still up as they get through.
      const nearly = caption(hold!.to, 'Nearly!');
      finalTwo = caption(nearly + READ, 'Final two!');
      next = finalTwo + FINAL_TWO;
    } else if (turn.kind === 'last') {
      next = wakes;
    }
    turns.push({
      kind: turn.kind,
      by: turn.by,
      from: s,
      named,
      scare: turn.kind === 'last' ? lastScare(ending) : turn.scare,
      hold,
      through,
      crossings,
      gate,
      next,
    });
    s = next;
  }
  if (peek) sleep.peek = peek.from;

  // The waking, the woof and the walk.
  sleep.awake = wakes;
  caption(wakes, 'Uh-oh…');
  const woof = wakes + WALK.still;
  sleep.stand = woof;
  says.push({ at: woof, text: 'Woof!', by: 'dog' });
  const walkies = woof + WALK.walkies;
  caption(walkies, `${unlucky} woke the dog!`);
  const theirs = keys(unlucky);
  theirs.push(
    { at: woof, place: theirs.at(-1)!.place },
    { at: woof + WALK.hop, place: 'front', hop: true },
  );
  const crossed = new Set(drawn.filter((turn) => turn.kind !== 'nope').flatMap((turn) => turn.by));
  const staying = order.filter((name) => !crossed.has(name));
  staying.forEach((name, k) => {
    const from = woof + SLIP.from + k * SLIP.apart;
    const quarter = SLIP.seconds / 4;
    keys(name).push(
      { at: from, place: 'seat' },
      { at: from + quarter, place: 'lane' },
      { at: from + 2 * quarter, place: 'gateway' },
      { at: from + 3 * quarter, place: 'behind' },
      { at: from + SLIP.seconds, place: 'fence' },
    );
    safe.push(name);
  });

  const heartbeats: number[] = [];
  for (let at = spotlight, k = 0; at < wakes - 1e-9; k++) {
    heartbeats.push(at);
    at += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** k);
  }

  return {
    turns,
    sleep,
    peek,
    spotlight,
    finalTwo,
    wakes,
    woof,
    walkies,
    heartbeats,
    paths,
    safe,
    captions,
    says: says.sort((one, two) => one.at - two.at),
    end: woof + WALK.end,
  };
}

/** The scare each ending starts from. */
const lastScare = (ending: Ending): Scare =>
  ending === 'sniff' ? 'sniff' : ending === 'on-back' ? 'wuf' : 'creak';

/** How the dog looks in each state, from the Design canvas. */
export const DOG: Readonly<
  Record<
    DogState,
    {
      readonly zs: number;
      readonly eyes: 'shut' | 'one-half' | 'both-half' | 'open';
      readonly ears: 'flat' | 'up';
      readonly tail: 'flat' | 'raised' | 'wag';
      /** The "!" over its head. */
      readonly bang: boolean;
      readonly breathes: boolean;
    }
  >
> = {
  deep: { zs: 3, eyes: 'shut', ears: 'flat', tail: 'flat', bang: false, breathes: true },
  light: { zs: 2, eyes: 'shut', ears: 'flat', tail: 'flat', bang: false, breathes: true },
  restless: { zs: 1, eyes: 'shut', ears: 'up', tail: 'flat', bang: false, breathes: true },
  half: { zs: 0, eyes: 'one-half', ears: 'up', tail: 'raised', bang: false, breathes: true },
  peek: { zs: 0, eyes: 'both-half', ears: 'up', tail: 'raised', bang: false, breathes: true },
  awake: { zs: 0, eyes: 'open', ears: 'up', tail: 'raised', bang: true, breathes: false },
  stand: { zs: 0, eyes: 'open', ears: 'up', tail: 'wag', bang: false, breathes: false },
};

/** Marks around the dog: sniffing at its nose, a twitch by its ear, thumps by its tail, wags. */
export type Marks = 'none' | 'sniff' | 'twitch' | 'thump' | 'wag';

/** While restless, its tail thumps for `on` seconds every `every`. */
export const THUMP = { every: 0.9, on: 0.3 } as const;

/** The dog at `t`: its state, whether its head is lifted, and its marks. */
export function dogAt(plan: Plan, t: number): { state: DogState; lift: boolean; marks: Marks } {
  const { sleep, peek } = plan;
  let state: DogState = 'deep';
  for (const each of ['light', 'restless', 'half', 'awake', 'stand'] as const) {
    if (sleep[each] <= t + 1e-9) state = each;
  }
  if (peek && t + 1e-9 >= peek.from && t < peek.to) state = 'peek';
  // On its back at the end, it peeks before its eyes open.
  const last = plan.turns.at(-1)!;
  if (plan.ending === 'on-back' && t + 1e-9 >= last.hold!.from + WAKE.peek && t < plan.wakes) {
    state = 'peek';
  }
  if (state === 'stand') return { state, lift: false, marks: 'wag' };
  const turn = plan.turns.find(
    (each) => each.hold && t + 1e-9 >= each.hold.from && t < each.hold.to,
  );
  const awake = state === 'awake';
  // Once its eyes are open its head stays up.
  const lift = awake || turn?.scare === 'sniff';
  let marks: Marks = 'none';
  if (turn?.scare === 'sniff') marks = 'sniff';
  else if (turn?.scare) marks = 'twitch';
  else if (state === 'restless' && (t - sleep.restless) % THUMP.every < THUMP.on) marks = 'thump';
  return { state, lift, marks };
}

/** Who is at risk at `t`, in their places along the line: everyone not yet through the gate. */
export function atRisk(plan: Plan, t: number): string[] {
  const through = new Set(
    plan.turns.flatMap((turn) =>
      turn.through !== null && turn.through <= t + 1e-9 ? turn.by : [],
    ),
  );
  return plan.order.filter((name) => !through.has(name));
}

/** The caption up at `t`. */
export function captionAt(plan: Plan, t: number): string | null {
  return plan.captions.findLast((caption) => caption.at <= t + 1e-9)?.text ?? null;
}

/** How someone looks at a moment: their mood, arms up, sweating. */
export interface Look {
  readonly mood: Mood;
  readonly raised: boolean;
  readonly sweat: boolean;
}

/** A "Phew!" keeps its sayer happy this long, as long as its bubble is up. */
export const BUBBLE = 0.8;

const REACHING: ReadonlySet<Place> = new Set(['lane-end', 'over', 'back', 'gateway']);

/**
 * How `name` looks at `t`. Whoever crosses is worried, arms up from the
 * lane to the gateway, and scared, sweating, while a scare holds them
 * or from the spotlight on; a "Wuf…"
 * scares everyone at risk. Whoever goes next is scared until their own
 * turn. From the spotlight, those at risk are scared and sweat. The safe
 * are happy behind the fence, and worried, watching, from the spotlight
 * but for their "Phew!". When the dog wakes everyone is scared; from the
 * woof the others are happy, and with the walk the unlucky person
 * celebrates.
 */
export function moodAt(plan: Plan, name: string, t: number): Look {
  const look = (mood: Mood, raised = false, sweat = false): Look => ({ mood, raised, sweat });
  const last = plan.turns.at(-1)!;
  const unlucky = last.by[0]!;
  const keys = plan.paths.get(name) ?? [];
  const risky = atRisk(plan, t).includes(name);
  if (t >= plan.walkies - 1e-9) return name === unlucky ? look('party', true) : look('happy');
  if (t >= plan.woof - 1e-9) return name === unlucky ? look('scared', true) : look('happy');
  if (t >= plan.wakes - 1e-9) return look('scared', name === unlucky, risky);

  // On their way past the dog.
  const turn = plan.turns.find((each) => {
    const crossing = each.crossings.find((one) => one.by === name);
    return crossing && each.from <= t + 1e-9 && t < (crossing.fence ?? each.next);
  });
  if (turn) {
    const crossing = turn.crossings.find((one) => one.by === name)!;
    if (crossing.through !== null && t >= crossing.through - 1e-9) return look('happy');
    let k = 0;
    while (k < keys.length && keys[k]!.at <= t + 1e-9) k++;
    const [from, to] = [keys[k - 1], keys[k]];
    const raised =
      !!from && (REACHING.has(from.place) || (from.place === 'lane' && to?.place === 'lane-end'));
    const held = turn.hold && t + 1e-9 >= turn.hold.from && t < turn.hold.to;
    const final = t >= plan.spotlight - 1e-9;
    return held || final ? look('scared', raised, true) : look('worried', raised);
  }
  const phew = plan.says.find((say) => say.by === name && /^Phew/.test(say.text));
  if (phew && t >= phew.at - 1e-9) {
    const cheering = t < phew.at + BUBBLE || t < plan.spotlight;
    return look(cheering ? 'happy' : 'worried');
  }
  if (!risky) return look('happy');

  // Standing at risk.
  if (t >= plan.spotlight - 1e-9) return look('scared', false, true);
  const now = plan.turns.findLast((each) => each.from <= t + 1e-9);
  const wuf = now?.scare === 'wuf' && now.hold && t + 1e-9 >= now.hold.from && t < now.hold.to;
  if (wuf) return look('scared');
  const next = now ? plan.turns[plan.turns.indexOf(now) + 1] : plan.turns[0];
  if (next?.by.includes(name)) return look('scared');
  return look('worried');
}
