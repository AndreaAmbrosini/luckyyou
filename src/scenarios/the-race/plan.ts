// Who is where when, and what happens. The show only acts out the app's
// pick: the plan is built backwards from the finish, which the unlucky person
// always crosses first. First the ending and who is beside them at the line,
// then the front group of the final stretch and its one swap, then the events
// that lead there and the order everyone set off in. Last, on any track but
// the sports field, which event is the track's own. Every nose's place
// on screen follows from the plan alone, at any moment: `noseAt`.
//
// Places are stage pixels on screen; the camera follows the leaders at a
// steady speed, so a racer that keeps its place on screen is racing at the
// camera's speed, and one that stops drops back.

import { shuffle } from '../../scenario-kit';

/**
 * How the last moment goes: `photo`, the unlucky person and the rival side by
 * side, the unlucky nose over first; `brake`, the rival just ahead slams on
 * the brakes and the unlucky person sails past; `surge`, the unlucky person,
 * third behind two others, bursts past both.
 */
export type Ending = 'photo' | 'brake' | 'surge';

/** The tracks a race runs on, one per theme. */
export type Course = 'field' | 'office' | 'sea' | 'moon' | 'christmas';

export const COURSES: readonly Course[] = ['field', 'office', 'sea', 'moon', 'christmas'];

/**
 * A racer bursting ahead into the lead, or the leader stopping: by the
 * racer's own doing, or the track's (a wet floor, the coffee machine).
 */
export interface RaceEvent {
  readonly kind: 'burst' | 'stop';
  readonly subject: string;
  readonly cause: 'racer' | 'track';
  /** Show seconds when it starts. */
  readonly at: number;
}

/** A nose's place on screen, reached at `at` from the key before, with `ease`. */
export interface Key {
  readonly at: number;
  readonly x: number;
  readonly ease: Ease;
}

type Ease = 'none' | 'sine.inOut' | 'power2.out' | 'power2.in';

/** The show's parts, in the order they play. */
export const BEATS = ['marks', 'go', 'events', 'stretch', 'slow', 'finish', 'win'] as const;

export type Beat = (typeof BEATS)[number];

export interface Plan {
  readonly course: Course;
  readonly ending: Ending;
  /** Beside the unlucky person at the line, or just ahead: brakes, or is passed in the surge. */
  readonly rival: string;
  /** The third of the front group; null with 2 people. */
  readonly third: string | null;
  /** Front to back as they set off at "Go!". */
  readonly setOff: readonly string[];
  /** Front to back as the final stretch starts. */
  readonly stretchOrder: readonly string[];
  readonly events: readonly RaceEvent[];
  /** Every nose's keys, from the start line to the end. */
  readonly tracks: ReadonlyMap<string, readonly Key[]>;
  /** Show seconds per part. */
  readonly beats: Readonly<Record<Beat, number>>;
  /** Show seconds when each part starts, and when the show ends. */
  readonly times: Readonly<Record<Beat | 'end', number>>;
  /** Show seconds when the unlucky nose reaches the finish line. */
  readonly crossing: number;
  /** Show seconds of each heartbeat, from the stretch to the line, closer and closer. */
  readonly heartbeats: readonly number[];
  /** Who waves while happy, behind the leaders. */
  readonly wavers: ReadonlySet<string>;
}

/** Where the noses wait at "On your marks…", and the start line's left edge. */
export const START = { nose: 420, line: 426 };
/** The finish line's left edge on screen as the last moment ends. */
export const FINISH = 960;
/** Stage pixels a second, and how much slower everything is in the last moment. */
export const CAMERA = { speed: 320, slow: 0.25 };
/** A mount's length, in stage pixels: whoever is within it behind the leader is worried. */
export const LENGTH = 70;

const MARKS = 1.3;
/** "Go!" to the pack spread out, while the camera speeds up. */
const SPRING = 1.3;
const FIRST_EVENT = 2.9;
const STRETCH = 2.8;
const SLOW = 1.4;
/** After the photo-finish freeze: the photo pops up, and stays. */
const PHOTO = { after: 0.3, seconds: 1.8 };
/** After a crossing that isn't a photo, before "{name} wins!". */
const RUN_OUT = 0.6;
const WIN = 2.6;
/** The pack after "Go!": the front nose, and the gap between noses at most. */
const PACK = { front: 940, gap: 70, spread: 440 };
export const BURST = { ahead: 80, most: 1060, seconds: 0.9 };
/** A stop: back so far over `seconds`, never behind `least`; "Phew!" at `phew`; off again at `off`. */
export const STOP = { back: 360, least: 400, seconds: 1.3, phew: 1.6, off: 1.9 };
/** The front group's noses in the stretch, front to back, closed up after `closeUp` s. */
const FORMATION = [990, 970, 950];
const CLOSE_UP = 1;
/** The front group's one swap in the stretch: when, and how long it takes. */
const SWAP = { at: 1.2, seconds: 0.9 };
/** Endings drawn this often, in this order. */
const ENDINGS: readonly [Ending, number][] = [
  ['photo', 0.5],
  ['brake', 0.25],
  ['surge', 0.25],
];
const HEARTBEAT = { from: 0.2, first: 0.9, quicker: 0.92, shortest: 0.42 };
/** Each nose as the last moment ends, by ending, and how it gets there. */
const AT_THE_LINE: Record<Ending, { unlucky: number; rival: number; third: number; ease: Ease }> = {
  photo: { unlucky: FINISH + 16, rival: FINISH - 2, third: 930, ease: 'sine.inOut' },
  brake: { unlucky: FINISH + 4, rival: 900, third: 935, ease: 'power2.out' },
  surge: { unlucky: FINISH + 4, rival: 940, third: 925, ease: 'power2.out' },
};
/** After a brake or a surge, the unlucky nose sails on this much further. */
const SAIL_ON = 36;

/**
 * How far a racer's drawing reaches past its nose, in stage px: `least` as
 * it leads, leaning back and flailing; `most` in any pose it races in. Hands
 * out in front reach past it; a body leaning back falls short of it.
 */
export interface Reach {
  readonly least: number;
  readonly most: number;
}

const NOSE: Reach = { least: 0, most: 0 };

/** How many things happen before the final stretch. */
export const eventCount = (count: number) => Math.min(4, Math.max(2, count - 3));

/** Seconds from one event to the next. */
export const spacing = (count: number) => (count >= 7 ? 2.6 : 2.8);

const EASES: Record<Ease, (u: number) => number> = {
  none: (u) => u,
  'sine.inOut': (u) => (1 - Math.cos(Math.PI * u)) / 2,
  'power2.out': (u) => 1 - (1 - u) ** 3,
  'power2.in': (u) => u ** 3,
};

/** Where `track` puts a nose at show second `t`. */
export function trackAt(track: readonly Key[], t: number): number {
  let previous = track[0]!;
  for (const key of track) {
    if (t <= key.at) {
      if (key.at <= previous.at) return key.x;
      const u = (t - previous.at) / (key.at - previous.at);
      return previous.x + (key.x - previous.x) * EASES[key.ease](u);
    }
    previous = key;
  }
  return previous.x;
}

export const noseAt = (plan: Plan, name: string, t: number) => trackAt(plan.tracks.get(name)!, t);

/**
 * How far the camera has moved by show second `t`: still until "Go!", then
 * speeding up to its speed, a quarter of it in the last moment, and after
 * the line it stops: at once for a photo, or slowing for the run-out.
 */
export function cameraAt(plan: Plan, t: number): number {
  const { go, slow, finish } = plan.times;
  const v = CAMERA.speed;
  const slowV = v * CAMERA.slow;
  if (t <= go) return 0;
  const sprung = (v * SPRING) / 2;
  if (t <= go + SPRING) return (v / SPRING) * ((t - go) ** 2 / 2);
  const atSlow = sprung + v * (slow - go - SPRING);
  if (t <= slow) return sprung + v * (t - go - SPRING);
  const atFinish = atSlow + slowV * (finish - slow);
  if (t <= finish) return atSlow + slowV * (t - slow);
  if (plan.ending === 'photo') return atFinish;
  const run = Math.min(t - finish, RUN_OUT);
  return atFinish + slowV * run - (slowV / RUN_OUT) * (run ** 2 / 2);
}

/** The finish line's left edge on screen at show second `t`. */
export const lineAt = (plan: Plan, t: number) =>
  FINISH + cameraAt(plan, plan.times.finish) - cameraAt(plan, t);

/** The start line's left edge on screen at show second `t`. */
export const startLineAt = (plan: Plan, t: number) => START.line - cameraAt(plan, t);

/** Everyone, front to back, at show second `t`. */
export function orderAt(plan: Plan, t: number): string[] {
  return [...plan.tracks.keys()].sort((a, b) => noseAt(plan, b, t) - noseAt(plan, a, t));
}

/** Whoever's nose is furthest on at show second `t`; null while they wait at the line. */
export function leaderAt(plan: Plan, t: number): string | null {
  return t <= plan.times.go ? null : orderAt(plan, t)[0]!;
}

/** Show seconds when `name`'s nose first reaches the finish line, or null. */
export function crossingOf(plan: Plan, name: string, step = 1 / 60): number | null {
  for (let t = plan.times.stretch; t <= plan.times.end; t += step) {
    if (noseAt(plan, name, t) >= lineAt(plan, t)) return t;
  }
  return null;
}

/** The stop `name` is in at show second `t`, if any. */
export function stopping(plan: Plan, name: string, t: number): RaceEvent | null {
  return (
    plan.events.find(
      (event) =>
        event.kind === 'stop' && event.subject === name && t >= event.at && t < event.at + STOP.off,
    ) ?? null
  );
}

export function planShow(
  names: readonly string[],
  unlucky: string,
  random: () => number,
  course: Course = 'field',
  reachOf: (name: string) => Reach = () => NOSE,
): Plan {
  const count = names.length;
  const others = shuffle(
    names.filter((name) => name !== unlucky),
    random,
  );

  // The ending, and who is beside the unlucky person at the line.
  let draw = random();
  const ending = ENDINGS.find(([, chance]) => (draw -= chance) < 0)?.[0] ?? 'photo';
  const rival = others[0]!;
  const third = others[1] ?? null;

  // The front group as the last moment starts, front to back.
  const front =
    ending === 'surge'
      ? [rival, third, unlucky]
      : ending === 'photo' && count > 2 && random() < 0.5
        ? [unlucky, rival, third]
        : [rival, unlucky, third];
  const atSlow = [...front.filter((name): name is string => name !== null), ...others.slice(2)];

  // One swap in the stretch: the order as it starts has two of the front
  // group the other way round. The unlucky person stays in the front two
  // unless it's a surge, and isn't last, who is the first to stop.
  const group = Math.min(3, count);
  const swaps = Array.from({ length: group - 1 }, (_, i) => {
    const order = [...atSlow];
    [order[i], order[i + 1]] = [order[i + 1]!, order[i]!];
    return order;
  }).filter(
    (order) => (ending === 'surge' || order.indexOf(unlucky) <= 1) && order.at(-1) !== unlucky,
  );
  const stretchOrder = swaps[Math.floor(random() * swaps.length)]!;

  // The events, worked back from the stretch: bursts, then the leader's
  // mount stops. A burster who stops ends at the back.
  const k = eventCount(count);
  const last = stretchOrder.length - 1;
  const bursters =
    k === 2
      ? [stretchOrder[last]!]
      : k === 3
        ? [stretchOrder[0]!, stretchOrder[last]!]
        : [stretchOrder[last]!, stretchOrder[last - 1]!];
  const stoppers =
    k === 2 ? [bursters[0]!] : k === 3 ? [bursters[1]!] : [bursters[1]!, bursters[0]!];
  const setOff = stretchOrder.filter((name) => !bursters.includes(name));
  // The first burster sets off behind someone, so it has someone to pass;
  // the second leads off half the time, so the first leader gives nothing away.
  setOff.splice(1 + Math.floor(random() * setOff.length), 0, bursters[0]!);
  if (bursters[1]) {
    const at = random() < 0.5 ? 0 : Math.floor(random() * (setOff.length + 1));
    setOff.splice(at, 0, bursters[1]);
  }

  const gap = Math.min(PACK.gap, PACK.spread / count);
  const slot = (rank: number) => PACK.front - gap * rank;
  const stepBy = spacing(count);
  const go = MARKS;
  const eventTimes = Array.from({ length: k }, (_, i) => FIRST_EVENT + stepBy * i);
  const stretch = FIRST_EVENT + stepBy * k;
  const slow = stretch + STRETCH;
  const finish = slow + SLOW;
  const win = finish + (ending === 'photo' ? PHOTO.after + PHOTO.seconds : RUN_OUT);
  const end = win + WIN;

  const tracks = new Map<string, Key[]>(
    names.map((name) => [name, [{ at: 0, x: START.nose, ease: 'none' }]]),
  );
  const key = (name: string, at: number, x: number, ease: Ease = 'sine.inOut') =>
    void tracks.get(name)!.push({ at, x, ease });
  const xOf = (name: string, t: number) => trackAt(tracks.get(name)!, t);

  // On the line, then off together at "Go!".
  for (const name of names) key(name, go, START.nose, 'none');
  setOff.forEach((name, rank) => key(name, go + SPRING, slot(rank), 'power2.out'));

  let order = [...setOff];
  const events: RaceEvent[] = [];
  eventTimes.forEach((at, i) => {
    const next = eventTimes[i + 1] ?? stretch;
    const burst = i < bursters.length;
    const subject = burst ? bursters[i]! : stoppers[i - bursters.length]!;
    events.push({ kind: burst ? 'burst' : 'stop', subject, cause: 'racer', at });
    for (const name of names) key(name, at, xOf(name, at), 'none');
    const leader = xOf(order[0]!, at);
    order = order.filter((name) => name !== subject);
    order = burst ? [subject, ...order] : [...order, subject];
    if (burst) {
      key(subject, at + BURST.seconds, Math.min(BURST.most, leader + BURST.ahead), 'power2.out');
    } else {
      const back = Math.max(STOP.least, xOf(subject, at) - STOP.back);
      key(subject, at + STOP.seconds, back, 'none');
      key(subject, at + STOP.off, back, 'none');
    }
    order.forEach((name, rank) => key(name, next, slot(rank)));
  });

  // The final stretch: the front group closes up, then swaps once.
  const formation = (rank: number) =>
    rank < group ? FORMATION[rank]! : FORMATION[group - 1]! - gap * (rank - group + 1);
  stretchOrder.forEach((name, rank) => {
    key(name, stretch + CLOSE_UP, formation(rank));
    key(name, stretch + SWAP.at, formation(rank), 'none');
  });
  atSlow.forEach((name, rank) => {
    key(name, stretch + SWAP.at + SWAP.seconds, formation(rank));
    key(name, slow, formation(rank), 'none');
  });

  // The last moment, and after it, placed by what reaches furthest: all of
  // the unlucky racer over the line, and nobody's hands before it.
  const line = AT_THE_LINE[ending];
  for (const name of names) {
    const role =
      name === unlucky ? 'unlucky' : name === rival ? 'rival' : name === third ? 'third' : null;
    const reach = reachOf(name);
    const x =
      role === 'unlucky'
        ? line.unlucky - reach.least
        : role
          ? line[role] - reach.most
          : xOf(name, slow);
    key(name, finish, x, role === 'unlucky' || role === 'rival' ? line.ease : 'sine.inOut');
    if (ending !== 'photo') {
      const after =
        name === unlucky ? x + SAIL_ON : ending === 'brake' && name === rival ? x - 24 : x;
      key(name, finish + RUN_OUT, after, 'power2.out');
    }
  }

  const heartbeats: number[] = [];
  for (let at = stretch + HEARTBEAT.from, n = 0; at < finish; n++) {
    heartbeats.push(at);
    at += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** n);
  }

  const wavers = new Set(others.filter(() => random() < 0.5));

  // Off the sports field, one event is the track's own, where and when it
  // was: drawn last, so the race itself is the same on any track.
  if (course !== 'field') {
    const own = Math.floor(random() * events.length);
    events[own] = { ...events[own]!, cause: 'track' };
  }

  const plan: Plan = {
    course,
    ending,
    rival,
    third,
    setOff,
    stretchOrder,
    events,
    tracks,
    beats: {
      marks: MARKS,
      go: FIRST_EVENT - go,
      events: stretch - FIRST_EVENT,
      stretch: STRETCH,
      slow: SLOW,
      finish: win - finish,
      win: WIN,
    },
    times: { marks: 0, go, events: FIRST_EVENT, stretch, slow, finish, win, end },
    crossing: finish,
    heartbeats,
    wavers,
  };
  return { ...plan, crossing: crossingOf(plan, unlucky) ?? finish };
}
