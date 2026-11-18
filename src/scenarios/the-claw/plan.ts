// Who sits where, whom each grab takes, how the last grab goes and how long
// each moment lasts. The show only acts out the app's pick: the plan is drawn
// backwards from it, the unlucky person in the final three and the last grab,
// then timed forwards from the opening and fitted to a length.

import { pickOne, shuffle, type Cue, type Mood } from '../../scenario-kit';
import { pileSeats, shelfSeats, STOP_X } from './layout';

/** How the last grab goes over the chute: who slips at which kick. */
export type Way = 'first' | 'second' | 'twitch';
/**
 * The last second: `hold`, one slips and flies clear and the claw holds the
 * other; `nearly`, one teeters on the rim and tips out, then the claw holds
 * the other; `rim`, one flies clear and the other teeters and tips in.
 */
export type Ending = 'hold' | 'nearly' | 'rim';
/** Where someone hangs in the claw: round the head, from a fingertip, or on the prong. */
export type Hold = 'one' | 'left' | 'right' | 'mid';

/** A stretch of show seconds. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/** A kick of the claw out towards the shelf: out to `peak`, back by `to`. */
export interface Kick extends Span {
  readonly peak: number;
  readonly degrees: number;
}

export interface Grab {
  /** The last grab, of two of the final three. */
  readonly last: boolean;
  /** Who it takes, left to right in the pile. */
  readonly by: readonly string[];
  /** Where each of `by` hangs in the claw. */
  readonly holds: readonly Hold[];
  /** The claw's x over them. */
  readonly x: number;
  /** Show seconds it sets off along the rail. */
  readonly from: number;
  /** Over them: it starts down, opening. */
  readonly over: number;
  /** At the bottom: it shuts, and the caption names them. */
  readonly down: number;
  /** Shut on them: it lifts. */
  readonly shut: number;
  /** Lifted to the rail. */
  readonly up: number;
  /** One of them slips a notch at the top of the lift, "Eek!", and it holds still. */
  readonly notch: (Span & { readonly by: string }) | null;
  /** It reaches the stop: the kicks start. */
  readonly stop: number;
  readonly kicks: readonly Kick[];
  /** The twitch, "Click!", on the last grab over the chute; null when it doesn't twitch. */
  readonly twitch: Span | null;
  /** The peak of the kick at which they slip. */
  readonly slip: number;
  /** Its pace: travel and carry in stage pixels a second, down and lift in seconds. */
  readonly pace: {
    readonly travel: number;
    readonly down: number;
    readonly lift: number;
    readonly carry: number;
  };
}

/** Someone flying or tipping onto the shelf. */
export interface Flight {
  readonly by: string;
  /** Off the claw at a kick's peak, or off the chute's rim. */
  readonly off: 'claw' | 'rim';
  readonly from: number;
  /** Show seconds they land. */
  readonly to: number;
  /** Their seat: an index into shelfSeats(people), in landing order. */
  readonly seat: number;
}

/** Someone on the chute's rim: they drop to it, teeter, and tip out or in. */
export interface Rim {
  readonly by: string;
  /** Slips off the claw. */
  readonly from: number;
  /** On the rim: "Whoa…". */
  readonly lands: number;
  /** Tips out, or in. */
  readonly tips: number;
  readonly out: boolean;
}

/** Something said in a bubble, by a person, the claw or the chute, from `at` to `to`. */
export interface Saying {
  readonly at: number;
  readonly to: number;
  readonly text: string;
  readonly by: string;
}

export interface Plan {
  readonly people: number;
  readonly unlucky: string;
  /** Each person's seat in the pile: an index into pileSeats(people). */
  readonly seats: ReadonlyMap<string, number>;
  /** The final three, the unlucky person among them; with 2 people, both. */
  readonly final: readonly string[];
  /** Whoever of the final three is never grabbed; null with 2 people. */
  readonly third: string | null;
  /** Whoever shares the last grab with the unlucky person. */
  readonly other: string;
  /** Every grab, in order: the last one last. */
  readonly grabs: readonly Grab[];
  readonly way: Way;
  readonly ending: Ending;
  /** Everyone who lands on the shelf, in the order they land. */
  readonly flights: readonly Flight[];
  /** Whoever teeters on the chute's rim; null when it holds. */
  readonly rim: Rim | null;
  /** The claw shutting round the unlucky person, "Uh-oh…"; null when they tip in off the rim. */
  readonly grip: Span | null;
  /** The claw opening over the chute; null when they tip in. */
  readonly opens: Span | null;
  /** The heartbeat stops: the claw shuts round the unlucky person, or they tip in. */
  readonly wake: number;
  /** The unlucky person falling into the chute. */
  readonly fall: Span;
  /** The chute rumbles from the fall's end until the door opens. */
  readonly doorOpens: number;
  /** Out of the door, in front: "Ta-da!", "Winner!", the fanfare and the last caption. */
  readonly prize: number;
  /** "Final three!", or "Just the … of you…" with 2 or 3. */
  readonly spotlight: number;
  readonly heartbeats: readonly number[];
  /** Show seconds each caption comes, in order. */
  readonly captions: readonly { readonly at: number; readonly text: string }[];
  readonly says: readonly Saying[];
  /** Every sound and when. */
  readonly cues: readonly { readonly at: number; readonly cue: Cue }[];
  /** How the moves of the grabs before the final three, and of the last grab, were scaled. */
  readonly fit: { readonly early: number; readonly last: number };
  /** Show seconds the show ends. */
  readonly end: number;
}

/**
 * Seconds from one caption to the next that must not wait: the kit keeps
 * each up for a second, and a frame more covers the frame they're asked in.
 */
export const READ = 1.04;

/** The claw first sets off at `first`; with 2 or 3, after "Just the … of you…" at `small`. */
export const OPENING = { first: 2.3, small: 3 * READ, just: 2 * READ } as const;

/**
 * A grab's moves: travel along the rail at `travel` px/s, down in `down`
 * seconds, opening, shut in `shut`, lift in `lift`, a notch held `notch`,
 * along the rail to the stop at `carry` px/s; each move at least its `least`.
 * The moves marked to scale are scaled by the fit.
 */
export const EARLY = {
  travel: 900,
  travelLeast: 0.4,
  down: 0.45,
  downLeast: 0.4,
  shut: 0.3,
  lift: 0.55,
  liftLeast: 0.45,
  notch: 0.8,
  carry: 700,
  carryLeast: 0.45,
  /** To the kick's peak, where they slip. */
  kick: 0.4,
  degrees: 22,
  flight: 0.5,
  /** Two or three land this far apart. */
  apart: 0.12,
  /** The next grab's travel starts this long after the last landing. */
  next: 0.2,
} as const;
export const LAST = {
  travel: 600,
  travelLeast: 0.6,
  down: 0.6,
  downLeast: 0.5,
  shut: 0.4,
  lift: 0.7,
  liftLeast: 0.6,
  notch: 0.9,
  carry: 450,
  carryLeast: 0.7,
} as const;
/** The claw waits this long after "Final three!". */
export const FINAL_WAIT = 1.1;
/** Over the chute: a kick is `out` out and `out` back, `stop` degrees at the stop and `after` after it; a twitch lasts `twitch`. */
export const OVER = { out: 0.45, stop: 22, after: 18, twitch: 0.9 } as const;
/** The last second, and the prize, in seconds. */
export const END = {
  /** The claw shuts round the other this long after a slip it holds through. */
  grip: 0.25,
  flight: 0.5,
  rimDrop: 0.3,
  teeter: 1.2,
  tipOut: 0.6,
  tipIn: 0.35,
  still: 0.75,
  open: 0.25,
  fall: 0.45,
  rumble: 0.6,
  out: 0.4,
  /** The show ends this long after the prize is out. */
  last: 2.4,
} as const;
/** A fingertip comes down at least this far in from the stage's left edge, where the group allows. */
const EDGE_ROOM = 60;
/** In a twitch, a finger opens for `open` seconds and snaps shut by `snap`. */
export const TWITCH = { open: 0.12, snap: 0.2 } as const;
/** The first heartbeat gap, how much shorter each next one is, and the shortest. */
const HEARTBEAT = { first: 0.95, quicker: 0.93, shortest: 0.45 } as const;
/** A "Phew!" keeps its sayer happy, and is up, this long. */
export const BUBBLE = 0.8;
/** One of the grabs before the final three slips a notch in this share of shows; the last grab in `last`. */
const NOTCH = { early: 0.6, last: 0.4 } as const;
/** The endings, drawn 2 : 3 : 3. */
const ENDINGS: readonly Ending[] = [
  'hold',
  'hold',
  'nearly',
  'nearly',
  'nearly',
  'rim',
  'rim',
  'rim',
];
const WAYS: readonly Way[] = ['first', 'second', 'twitch'];
/**
 * The fit: the early grabs' scaled moves by `early` (0.85 to 1.15), then the
 * last grab's by `last` (0.85 to 1.2), so a show lands within `band` under
 * its aim where it can.
 */
const FIT = { early: [0.85, 1.15], last: [0.85, 1.2], band: 4 } as const;

/** The longest a show aims to be, with `early` grabs before the final three. */
export function aim(people: number, early: number): number {
  return people <= 3 ? 17 : Math.min(27.5, 18 + 3.2 * early);
}

/**
 * How many each grab before the final three takes: `people − 3` in at most
 * three grabs, as even as they go, bigger first.
 */
export function earlySizes(people: number): number[] {
  const early = Math.max(0, people - 3);
  const grabs = Math.min(3, early);
  const sizes: number[] = [];
  let left = early;
  for (let k = 0; k < grabs; k++) {
    const size = Math.ceil(left / (grabs - k));
    sizes.push(size);
    left -= size;
  }
  return sizes;
}

/** A grab as drawn, before it is timed. */
interface Drawn {
  readonly by: readonly string[];
  readonly holds: readonly Hold[];
  readonly x: number;
  readonly notch: string | null;
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const people = names.length;
  const seatsOf = pileSeats(people);

  // Backwards from the pick: the final three, the last grab, then the rest.
  const others = shuffle(
    names.filter((name) => name !== unlucky),
    random,
  );
  const final = people === 2 ? [unlucky, others[0]!] : [unlucky, others[0]!, others[1]!];
  const other = others[0]!;
  const third = people === 2 ? null : others[1]!;
  const rest = others.slice(final.length - 1);
  const sizes = earlySizes(people);
  const groups: string[][] = [];
  let taken = 0;
  for (const size of sizes) {
    groups.push(rest.slice(taken, taken + size));
    taken += size;
  }
  // The order of the grabs is random.
  const early = shuffle(groups, random);

  // How it ends says which of the last grab's two hangs from the right
  // fingertip, over the chute's rim: whoever drops onto it. When it holds,
  // either. So the unlucky person hangs on the left as often as the right.
  const ending = pickOne(ENDINGS, random);
  const pair =
    ending === 'nearly'
      ? [unlucky, other]
      : ending === 'rim'
        ? [other, unlucky]
        : shuffle([unlucky, other], random);
  // Seating: the last grab's two next to each other, left to right, the third
  // at one end; in a column, the right one on the middle step.
  let finalRun: string[] = pair;
  if (third !== null && people <= 8) {
    finalRun = random() < 0.5 ? [third, ...pair] : [...pair, third];
  } else if (third !== null) {
    finalRun = random() < 0.5 ? [third, pair[1]!, pair[0]!] : [pair[0]!, pair[1]!, third];
  }
  const seats = new Map<string, number>();
  if (people <= 8) {
    const runs = shuffle([...early.map((group) => shuffle(group, random)), finalRun], random);
    runs.flat().forEach((name, index) => seats.set(name, index));
  } else {
    // One group to a column: three in rows A, B and C, two in B and C.
    const columns = shuffle([...early, finalRun], random);
    columns.forEach((group, column) => {
      const ordered = group === finalRun ? group : shuffle(group, random);
      const rowsUsed = ordered.length === 3 ? [0, 1, 2] : [1, 2];
      ordered.forEach((name, k) => seats.set(name, 3 * column + rowsUsed[k]!));
    });
  }

  const drawGrab = (by: readonly string[], notch: string | null): Drawn => {
    const placed = by.map((name) => ({ name, seat: seatsOf[seats.get(name)!]! }));
    // Over the middle of them; at the stage's left edge, over the one
    // furthest in, so whoever hangs from the left fingertip stays in sight.
    const middle = placed.reduce((sum, each) => sum + each.seat.x, 0) / placed.length;
    const reach = { 1: 0, 2: 90, 3: 105 }[placed.length]! + EDGE_ROOM;
    const x = Math.min(Math.max(...placed.map((each) => each.seat.x)), Math.max(middle, reach));
    // Left to right; a column's top seat goes on the prong.
    placed.sort((a, b) => a.seat.x - b.seat.x || b.seat.feet - a.seat.feet);
    let holds: Hold[];
    if (placed.length === 1) holds = ['one'];
    else if (placed.length === 2) holds = ['left', 'right'];
    else {
      const top = placed.reduce((high, each) => (each.seat.feet < high.seat.feet ? each : high));
      const sides = placed.filter((each) => each !== top);
      placed.splice(0, 3, sides[0]!, top, sides[1]!);
      holds = ['left', 'mid', 'right'];
    }
    return { by: placed.map((each) => each.name), holds, x, notch };
  };

  // One grab before the final three may slip a notch: never the first, and
  // only one the claw holds by the head.
  const eligible = early.flatMap((group, k) => (k > 0 && group.length === 1 ? [k] : []));
  const notched = eligible.length > 0 && random() < NOTCH.early ? pickOne(eligible, random) : -1;
  const lastNotch = random() < NOTCH.last ? pickOne(pair, random) : null;
  const way = pickOne(WAYS, random);
  const drawn = [
    ...early.map((group, k) => drawGrab(group, k === notched ? group[0]! : null)),
    drawGrab(pair, lastNotch),
  ];

  const draw = { people, unlucky, other, drawn, way, ending, small: people <= 3 };
  const timeWith = (f: number, g: number) => time(draw, f, g);
  const length = (f: number, g: number) => timeWith(f, g).end;
  const hi = aim(people, early.length);
  const lo = hi - FIT.band;
  let f = 1;
  let g = 1;
  if (length(1, 1) > hi) {
    f = solve((value) => length(value, 1) - hi, FIT.early[0], 1);
    if (length(f, 1) > hi) g = solve((value) => length(f, value) - hi, FIT.last[0], 1);
  } else if (length(1, 1) < lo) {
    f = solve((value) => length(value, 1) - lo, 1, FIT.early[1]);
    if (length(f, 1) < lo) g = solve((value) => length(f, value) - lo, 1, FIT.last[1]);
  }
  return {
    ...timeWith(f, g),
    people,
    unlucky,
    seats,
    final,
    third,
    other,
    way,
    ending,
    fit: { early: f, last: g },
  };
}

/**
 * The value from `low` to `high` where the rising `excess` comes to 0, or
 * the end it is nearest: so a fit that can't reach its aim goes as far as it
 * may.
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

interface Draw {
  readonly people: number;
  readonly unlucky: string;
  readonly other: string;
  readonly drawn: readonly Drawn[];
  readonly way: Way;
  readonly ending: Ending;
  readonly small: boolean;
}

/** The grabs timed forwards from the opening, with `f` and `g` scaling their moves, and all that follows. */
function time({ people, unlucky, other, drawn, way, ending, small }: Draw, f: number, g: number) {
  const captions: { at: number; text: string }[] = [
    { at: 0, text: "One of you is today's prize" },
    { at: READ, text: "Slip out and you're safe" },
  ];
  const caption = (at: number, text: string) => {
    const due = Math.max(at, captions.at(-1)!.at + READ);
    captions.push({ at: due, text });
    return due;
  };
  const says: Saying[] = [];
  const cues: { at: number; cue: Cue }[] = [];
  const cue = (at: number, sound: Cue) => cues.push({ at, cue: sound });
  const grabs: Grab[] = [];
  const flights: Flight[] = [];
  const shelf = shelfSeats(people).length;
  const named = (by: readonly string[]) =>
    by.length === 3 ? "It's got three!" : `It's got ${by.join(' & ')}!`;

  let spotlight = Infinity;
  if (small) {
    spotlight = caption(
      OPENING.just,
      people === 2 ? 'Just the two of you…' : 'Just the three of you…',
    );
  }
  let t = small ? OPENING.small : OPENING.first;
  let x = STOP_X;

  for (const grab of drawn.slice(0, -1)) {
    const from = t;
    const travel = 900 / f;
    const over = from + Math.max(EARLY.travelLeast, Math.abs(x - grab.x) / travel);
    const downFor = Math.max(EARLY.downLeast, EARLY.down * f);
    const down = over + downFor;
    caption(down, named(grab.by));
    const shut = down + EARLY.shut;
    cue(shut, 'latch');
    const liftFor = Math.max(EARLY.liftLeast, EARLY.lift * f);
    const up = shut + liftFor;
    const notch = grab.notch ? { by: grab.notch, from: up, to: up + EARLY.notch } : null;
    if (notch) {
      says.push({ at: notch.from, to: notch.to, text: 'Eek!', by: notch.by });
      cue(notch.from, 'creak');
    }
    const carry = EARLY.carry / f;
    const stop = (notch?.to ?? up) + Math.max(EARLY.carryLeast, Math.abs(STOP_X - grab.x) / carry);
    cue(stop, 'thunk');
    const slip = stop + EARLY.kick;
    cue(slip, 'whoosh');
    // The one nearest the shelf lands first, on the furthest seat.
    const landing = grab.by
      .map((name, k) => ({ name, hold: grab.holds[k]! }))
      .sort((a, b) => order(a.hold) - order(b.hold));
    landing.forEach(({ name }, k) => {
      const to = slip + EARLY.flight + k * EARLY.apart;
      flights.push({ by: name, off: 'claw', from: slip, to, seat: flights.length });
      cue(to, 'thunk');
    });
    const landed = flights.at(-1)!;
    says.push({ at: landed.to, to: landed.to + BUBBLE, text: 'Phew!', by: landed.by });
    grabs.push({
      last: false,
      by: grab.by,
      holds: grab.holds,
      x: grab.x,
      from,
      over,
      down,
      shut,
      up,
      notch,
      stop,
      kicks: [{ from: stop, peak: slip, to: slip + EARLY.kick, degrees: EARLY.degrees }],
      twitch: null,
      slip,
      pace: { travel, down: downFor, lift: liftFor, carry },
    });
    x = STOP_X;
    t = landed.to + EARLY.next;
  }
  if (!small) {
    // As the last of them lands.
    spotlight = caption(flights.at(-1)!.to, 'Final three!');
    t = spotlight + FINAL_WAIT;
  }

  // The last grab.
  const grab = drawn.at(-1)!;
  const from = t;
  const travel = LAST.travel / g;
  const over = from + Math.max(LAST.travelLeast, Math.abs(x - grab.x) / travel);
  const downFor = Math.max(LAST.downLeast, LAST.down * g);
  const down = over + downFor;
  caption(down, named(grab.by));
  const shut = down + LAST.shut;
  cue(shut, 'latch');
  const liftFor = Math.max(LAST.liftLeast, LAST.lift * g);
  const up = shut + liftFor;
  const notch = grab.notch ? { by: grab.notch, from: up, to: up + LAST.notch } : null;
  if (notch) {
    says.push({ at: notch.from, to: notch.to, text: 'Eek!', by: notch.by });
    cue(notch.from, 'creak');
  }
  const carry = LAST.carry / g;
  const stop = (notch?.to ?? up) + Math.max(LAST.carryLeast, Math.abs(STOP_X - grab.x) / carry);
  cue(stop, 'thunk');
  const kick = (start: number, degrees: number): Kick => ({
    from: start,
    peak: start + OVER.out,
    to: start + 2 * OVER.out,
    degrees,
  });
  const kicks = [kick(stop, OVER.stop)];
  let twitch: Span | null = null;
  if (way === 'second') kicks.push(kick(kicks[0]!.to, OVER.after));
  if (way === 'twitch') {
    twitch = { from: kicks[0]!.to, to: kicks[0]!.to + OVER.twitch };
    says.push({ at: twitch.from, to: twitch.to, text: 'Click!', by: 'claw' });
    cue(twitch.from + TWITCH.snap, 'latch');
    kicks.push(kick(twitch.to, OVER.after));
  }
  const slip = kicks.at(-1)!.peak;
  cue(slip, 'whoosh');
  grabs.push({
    last: true,
    by: grab.by,
    holds: grab.holds,
    x: grab.x,
    from,
    over,
    down,
    shut,
    up,
    notch,
    stop,
    kicks,
    twitch,
    slip,
    pace: { travel, down: downFor, lift: liftFor, carry },
  });

  // The last second.
  const last = shelf - 1;
  let rim: Rim | null = null;
  let grip: Span | null = null;
  let wake: number;
  let fall: Span;
  const flyClear = () => {
    const to = slip + END.flight;
    flights.push({ by: other, off: 'claw', from: slip, to, seat: last });
    says.push({ at: to, to: to + BUBBLE, text: 'Phew!', by: other });
    cue(to, 'thunk');
  };
  const onTheRim = (by: string, out: boolean): Rim => {
    const lands = slip + END.rimDrop;
    caption(lands, 'Whoa…');
    cue(lands, 'thunk');
    cue(lands, 'creak');
    cue(lands + END.teeter / 2, 'creak');
    return { by, from: slip, lands, tips: lands + END.teeter, out };
  };
  if (ending === 'hold') {
    flyClear();
    grip = { from: slip, to: slip + END.grip };
    wake = grip.to;
  } else if (ending === 'nearly') {
    rim = onTheRim(other, true);
    const nearly = caption(rim.tips, 'Nearly!');
    const to = rim.tips + END.tipOut;
    flights.push({ by: other, off: 'rim', from: rim.tips, to, seat: last });
    says.push({ at: to, to: to + BUBBLE, text: 'Phew!!', by: other });
    cue(to, 'thunk');
    wake = nearly + READ;
    grip = { from: wake - END.grip, to: wake };
  } else {
    flyClear();
    rim = onTheRim(unlucky, false);
    wake = rim.tips;
  }
  let opens: Span | null = null;
  if (grip) {
    caption(wake, 'Uh-oh…');
    cue(wake, 'latch');
    opens = { from: wake + END.still, to: wake + END.still + END.open };
    fall = { from: opens.to, to: opens.to + END.fall };
  } else {
    fall = { from: wake, to: wake + END.tipIn };
  }
  cue(fall.from, 'tumble');
  const doorOpens = fall.to + END.rumble;
  cue(doorOpens, 'latch');
  cue(doorOpens, 'pop');
  const prize = doorOpens + END.out;
  const end = prize + END.last;
  caption(prize, `${unlucky} is the prize!`);
  cue(prize, 'fanfare');
  says.push({ at: prize, to: end, text: 'Ta-da!', by: 'chute' });

  const heartbeats: number[] = [];
  for (let at = spotlight, k = 0; at < wake - 1e-9; k++) {
    heartbeats.push(at);
    at += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** k);
  }
  for (const at of heartbeats) cue(at, 'heartbeat');

  return {
    grabs,
    flights,
    rim,
    grip,
    opens,
    wake,
    fall,
    doorOpens,
    prize,
    spotlight,
    heartbeats,
    captions,
    says: says.sort((a, b) => a.at - b.at),
    cues: cues.sort((a, b) => a.at - b.at),
    end,
  };
}

/** Who lands first of a grab: the one nearest the shelf. */
const order = (hold: Hold) => ({ right: 0, one: 0, mid: 1, left: 2 })[hold];

/** The grab that takes `name`; undefined for the third of the final three. */
export const grabOf = (plan: Plan, name: string) =>
  plan.grabs.find((grab) => grab.by.includes(name));

/** How many are at risk at `t`: everyone not yet on the shelf. */
export function atRiskAt(plan: Plan, t: number): number {
  return plan.people - plan.flights.filter((flight) => flight.to <= t + 1e-9).length;
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

/**
 * How `name` looks at `t`. In the pile, worried; whoever the claw is coming
 * for or holds, scared and sweating, as is anyone in the air or on the rim.
 * On the shelf, happy, then worried from the spotlight but for their own
 * "Phew!". From the spotlight the final three are scared and sweat, the
 * third until the prize is out. Everyone is scared while someone teeters,
 * from "Uh-oh…", and from the rim on when it ends there. Once the prize is
 * out, it celebrates and everyone else is happy.
 */
export function moodAt(plan: Plan, name: string, t: number): Look {
  const look = (mood: Mood, sweat = false, raised = false): Look => ({ mood, raised, sweat });
  const now = t + 1e-9;
  if (now >= plan.prize) return name === plan.unlucky ? look('party', false, true) : look('happy');
  const flight = plan.flights.find((each) => each.by === name);
  const landed = flight !== undefined && now >= flight.to;
  const grab = grabOf(plan, name);
  const atRisk = !landed;
  if (landed && now < flight.to + BUBBLE) return look('happy');
  const allScared =
    (plan.grip !== null && now >= plan.wake) ||
    (plan.rim !== null && now >= plan.rim.lands && (now < plan.rim.tips || plan.ending === 'rim'));
  if (allScared) return look('scared', atRisk);
  if (landed) return look(now < plan.spotlight ? 'happy' : 'worried');
  // On their way: from the claw setting off for them.
  if (grab && now >= grab.from) return look('scared', true);
  if (now >= plan.spotlight && plan.final.includes(name)) return look('scared', true);
  return look('worried');
}
