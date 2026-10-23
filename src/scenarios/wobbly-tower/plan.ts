// Whose turn it is when, who goes safe, and how long each moment lasts. The
// show only acts out the app's pick: the plan is built backwards from the
// fall, which always comes on the unlucky person's turn, then fitted to a
// length and timed forwards.

import { pickOne, shuffle } from '../../scenario-kit';

/** The show's beats, in the order they play. */
export const BEATS = ['opening', 'safe', 'final', 'last-turn', 'timber'] as const;

export type Beat = (typeof BEATS)[number];

/**
 * How the last turn ends before the fall: `dead-still`, the block lands and
 * the tower freezes; `it-holds`, it sways, settles, and the top block slides
 * off; `slow-lean`, the block is set down gently and the tower leans slowly
 * toward the unlucky person, then holds at the tipping point.
 */
export type Ending = 'dead-still' | 'it-holds' | 'slow-lean';

/**
 * Which way the tower leans: -1 to the left of the stage, +1 to the right, or
 * a name: toward the side of the stage that person stands on, which the
 * layout knows.
 */
export type Side = -1 | 1 | string;

export interface Lean {
  /** The peak lean, in degrees, 0 or more. */
  readonly degrees: number;
  readonly toward: Side;
}

/** A stop of the pointer: over whom, at what show seconds. */
export interface Stop {
  readonly name: string;
  readonly at: number;
}

export interface Turn {
  /** Who tosses the block on top. */
  readonly by: string;
  /** Turns that share a round go together: a pair at 9 or more. */
  readonly round: number;
  readonly beat: Exclude<Beat, 'opening' | 'timber'>;
  /** Where the pointer stops before `by` this round, in order; empty in a safe round. */
  readonly decoys: readonly Stop[];
  /** Show seconds the round starts: the pointer leaves. */
  readonly from: number;
  /** Show seconds the pointer stops over `by`, before they lift the block. */
  readonly stops: number;
  /** Show seconds the block lands on top. */
  readonly lands: number;
  /** The round's length, from `from` to the next round's start. */
  readonly seconds: number;
  /** How far the tower leans after the block lands. */
  readonly lean: Lean;
  /** Show seconds `by` says "Safe!" and starts the hop to the bench; null if they stay at risk. */
  readonly safe: number | null;
  readonly nearly: boolean;
}

export interface Plan {
  /** Everyone, in their standing order; the layout gives each place in it a spot. */
  readonly order: readonly string[];
  readonly ending: Ending;
  /** How many are at risk when it falls: 3 or 2 at 4+; everyone with 2 or 3. */
  readonly fallsWith: number;
  /** Who is left for the final, the unlucky person among them. */
  readonly final: readonly string[];
  /** Show seconds per beat. */
  readonly beats: Readonly<Record<Beat, number>>;
  /** Show seconds when each beat starts. */
  readonly starts: Readonly<Record<Beat, number>>;
  /** Every turn, in order; the tower ends at 2 paper blocks + `turns.length`. */
  readonly turns: readonly Turn[];
  /** Show seconds of "Final three!" or "Just the … of you…": the spotlight and the heartbeat start. */
  readonly spotlight: number;
  /** Show seconds of "Final two!"; null unless it falls with 2 at 4+. */
  readonly finalTwo: number | null;
  /**
   * Show seconds while Nearly's lean holds still at its peak: it leans out
   * from its landing to `hold.from` and swings back after `hold.to`.
   */
  readonly hold: { readonly from: number; readonly to: number };
  /** Show seconds of each heartbeat, from the spotlight to the last block, closer and closer. */
  readonly heartbeats: readonly number[];
  /**
   * Show seconds while the tower barely moves before it falls; it falls at
   * `still.to`: timber's start, or later on `it-holds`, so "…or not!" as it
   * falls comes a READ after "It holds!" as it settles, at `still.from`.
   */
  readonly still: { readonly from: number; readonly to: number };
  /** The tower falls toward the side of the stage this person stands on: the unlucky person. */
  readonly falls: string;
  /** Show seconds the show ends. */
  readonly end: number;
}

/**
 * Seconds from one caption to the next that must not wait: the kit keeps
 * each up for a second, and a frame more covers the frame they're asked in.
 */
export const READ = 1.04;
/** Peak leans, in degrees. */
export const LEANS = { nearly: 11, itHolds: 4, slowLean: 10 } as const;
/** The pointer's hop into a final round's stop i, and its stay there. */
export const hopInto = (i: number) => 0.35 + 0.05 * i;
export const stayOn = (i: number) => 0.65 + 0.1 * i;

const ENDINGS: readonly Ending[] = ['dead-still', 'it-holds', 'slow-lean'];

/** The first round starts here, after the paper blocks; with 2 or 3 the spotlight comes at `just`. */
const OPENING = { first: 2.4, just: 1.2 };
/**
 * A safe round, from its start: the pointer stops, the block lands (a pair's
 * second a little later, on top), and "Safe!" comes after the last landing.
 * The round lasts r, 2.0 to 2.6 s, and a pair's at least 2.1 s.
 */
const SAFE = { stops: 0.35, lands: 1.15, second: 0.1, safe: 0.45 };
const ROUND = { most: 2.6, least: 2.0, pair: 2.1 };
/** A final round's block lands this long after the thrower's stop; on the last turn, `last`. */
const TOSS = { final: 0.8, last: 1.05 };
/** How many stops a final round makes before the thrower: 2 to 4, or 1 to 2 with 2 or 3 people. */
const STOPS = { least: 2, most: 4, smallLeast: 1, smallMost: 2 };
/**
 * Nearly, from its landing: out to its lean by `out`, held to `back`, and
 * "Safe!" at `safe` (4+). "Final three!" or "Final two!" follows at `next`.
 */
const NEARLY = { out: 0.6, back: 1.4, safe: 1.9, next: 2.35 };
/**
 * "Final three!" after a safe round's landing, and the round after it,
 * sooner when it falls with 2; the last round after "Final two!".
 */
const FINAL_THREE = { afterSafe: 1.05, fallsWith3: 1.8, fallsWith2: 1.0 };
const FINAL_TWO = { last: 0.7 };
/** With 2 or 3 people the next round starts this long after a landing; after Nearly, `nearly`. */
const SMALL = { next: 0.85, nearly: 2.0 };
/** Timber comes this long after the last landing, and the show ends `end` after timber. */
const TIMBER = { after: 1.3, end: 2.6 };
/** Every show is fitted between these lengths where the head count allows. */
const SHORTEST = 21.5;
const LONGEST = 28.0;
/** Seconds the tower barely moves before it falls, unless it froze earlier. */
const STILL = 0.6;
/** `it-holds`: the tower sways out to its lean and back upright, in seconds, then holds. */
const HOLDS = { out: 0.34, back: 0.34 };
/** A sway leans out this far, plus `perBlock` for each block on the tower. */
const SWAY = { base: 1.5, perBlock: 0.45 };
/** The first heartbeat gap, and how much shorter the last one is, by the last landing. */
const HEARTBEAT = { first: 0.85, quicker: 0.4 };

/** A random side of the stage. */
const side = (random: () => number): -1 | 1 => (random() < 0.5 ? -1 : 1);

/** Seconds from a final round's start to the thrower's stop, after `k` stops. */
function stopTimes(k: number): number[] {
  const times = [hopInto(0)];
  for (let i = 1; i <= k; i++) times.push(times[i - 1]! + stayOn(i - 1) + hopInto(i));
  return times;
}

/** A round as drawn: who throws, and what kind of round it is. */
interface Round {
  readonly by: readonly string[];
  readonly final: boolean;
  readonly nearly: boolean;
}

/** A round as timed. */
interface Timed {
  readonly from: number;
  /** The pointer's stops, the thrower's last, in show seconds. */
  readonly stops: readonly number[];
  readonly lands: readonly number[];
  readonly seconds: number;
  readonly safe: number | null;
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const small = count <= 3;
  const order = shuffle(names, random);
  const ending = pickOne(ENDINGS, random);
  const fallsWith = small ? count : pickOne([3, 2], random);
  const others = names.filter((name) => name !== unlucky);
  const final = small
    ? [...names]
    : shuffle([unlucky, ...shuffle(others, random).slice(0, 2)], random);
  const safeOrder = small
    ? []
    : shuffle(
        names.filter((name) => !final.includes(name)),
        random,
      );

  // Backwards from the fall: who throws in each round.
  const rounds: Round[] = [];
  if (small) {
    const throwers = [unlucky];
    const turns = pickOne([4, 5], random);
    while (throwers.length < turns) {
      let by = pickOne(names, random);
      while (by === throwers[0] && by === throwers[1]) by = pickOne(names, random);
      throwers.unshift(by);
    }
    throwers.forEach((by, index) =>
      rounds.push({ by: [by], final: true, nearly: index === turns - 2 }),
    );
  } else {
    const nearlyBy =
      fallsWith === 2
        ? pickOne(
            final.filter((name) => name !== unlucky),
            random,
          )
        : null;
    // At 9 or more, the safe rounds but the last go in pairs from the front,
    // with one single round at a random place among them when the count is odd.
    const rest = safeOrder.slice(0, -1);
    const single =
      count >= 9 && rest.length % 2 === 1
        ? pickOne(
            Array.from({ length: (rest.length + 1) / 2 }, (_, index) => index),
            random,
          )
        : -1;
    for (let at = 0; at < rest.length;) {
      const size = count >= 9 && rounds.length !== single ? 2 : 1;
      rounds.push({ by: rest.slice(at, at + size), final: false, nearly: false });
      at += size;
    }
    rounds.push({ by: [safeOrder.at(-1)!], final: false, nearly: fallsWith === 3 });
    if (nearlyBy) rounds.push({ by: [nearlyBy], final: true, nearly: true });
    rounds.push({ by: [unlucky], final: true, nearly: false });
  }

  // The fit: each final round's stops and the safe rounds' length r.
  const finals = rounds.filter((round) => round.final);
  const [least, most] = small ? [STOPS.smallLeast, STOPS.smallMost] : [STOPS.least, STOPS.most];
  const ks = finals.map(() =>
    pickOne(
      Array.from({ length: most - least + 1 }, (_, i) => least + i),
      random,
    ),
  );
  let r = ROUND.most;
  const lengthNow = () => time(rounds, ks, r, small).end;
  while (lengthNow() > LONGEST && ks.some((k) => k > least)) {
    const top = Math.max(...ks);
    ks[ks.lastIndexOf(top)] = top - 1;
  }
  // The safe rounds that take r: all but the one into "Final three!".
  const paced = rounds.filter((round, index) => !round.final && !rounds[index + 1]!.final).length;
  if (lengthNow() > LONGEST && paced > 0) {
    r = Math.max(ROUND.least, r - (lengthNow() - LONGEST) / paced);
  }
  while (lengthNow() < SHORTEST && ks.some((k) => k < most)) {
    const bottom = Math.min(...ks);
    ks[ks.indexOf(bottom)] = bottom + 1;
  }
  const timed = time(rounds, ks, r, small);

  // Each final round's stops, backwards from the thrower: never the same
  // person twice running, and only those still at risk.
  const benched = new Set<string>();
  const stopNames: string[][] = rounds.map((round, index) => {
    const atRisk = final.filter((name) => !benched.has(name));
    if (timed.rounds[index]!.safe !== null) for (const by of round.by) benched.add(by);
    if (!round.final) return [];
    const k = ks[finals.indexOf(round)]!;
    const chain = [round.by[0]!];
    while (chain.length <= k) {
      chain.unshift(
        pickOne(
          atRisk.filter((name) => name !== chain[0]),
          random,
        ),
      );
    }
    return chain.slice(0, -1);
  });

  // The turns, with their leans.
  const turns: Turn[] = [];
  const last = rounds.length - 1;
  rounds.forEach((round, index) => {
    const times = timed.rounds[index]!;
    round.by.forEach((by, k) => {
      const blocks = 3 + turns.length;
      const lean: Lean =
        index === last
          ? lastLean(ending, unlucky, random)
          : round.nearly
            ? { degrees: LEANS.nearly, toward: by }
            : { degrees: SWAY.base + SWAY.perBlock * blocks, toward: side(random) };
      turns.push({
        by,
        round: index,
        beat: index === last ? 'last-turn' : round.final ? 'final' : 'safe',
        decoys: stopNames[index]!.map((name, i) => ({ name, at: times.stops[i]! })),
        from: times.from,
        stops: times.stops.at(-1)!,
        lands: times.lands[k]!,
        seconds: times.seconds,
        lean,
        safe: times.safe,
        nearly: round.nearly,
      });
    });
  });

  const lastTurn = turns.at(-1)!;
  const timber = lastTurn.lands + TIMBER.after;
  const { spotlight } = timed;
  const beats: Record<Beat, number> = {
    opening: small ? spotlight : OPENING.first,
    safe: small ? 0 : spotlight - OPENING.first,
    final: lastTurn.from - spotlight,
    'last-turn': timber - lastTurn.from,
    timber: TIMBER.end,
  };
  const starts = Object.fromEntries(
    BEATS.map((beat, index) => [
      beat,
      BEATS.slice(0, index).reduce((seconds, each) => seconds + beats[each], 0),
    ]),
  ) as Record<Beat, number>;

  const heartbeats: number[] = [];
  for (let t = spotlight; t < lastTurn.lands;) {
    heartbeats.push(t);
    t += HEARTBEAT.first - (HEARTBEAT.quicker * (t - spotlight)) / (lastTurn.lands - spotlight);
  }

  return {
    order,
    ending,
    fallsWith,
    final,
    beats,
    starts,
    turns,
    spotlight,
    finalTwo: timed.finalTwo,
    hold: timed.hold,
    heartbeats,
    still: stillness(ending, lastTurn.lands, timber),
    falls: unlucky,
    end: timber + TIMBER.end,
  };
}

/** The last turn's lean, for its ending. */
function lastLean(ending: Ending, unlucky: string, random: () => number): Lean {
  if (ending === 'slow-lean') return { degrees: LEANS.slowLean, toward: unlucky };
  if (ending === 'it-holds') return { degrees: LEANS.itHolds, toward: side(random) };
  return { degrees: 0, toward: unlucky };
}

/**
 * The rounds timed forwards from the opening, with `ks[i]` stops before the
 * thrower in final round i and safe rounds r long: when each round starts,
 * its stops and landings, its length and its "Safe!", the spotlight, "Final
 * two!", Nearly's hold, and when the show ends.
 */
function time(rounds: readonly Round[], ks: readonly number[], r: number, small: boolean) {
  const timed: Timed[] = [];
  let spotlight = OPENING.just;
  let finalTwo: number | null = null;
  let hold = { from: 0, to: 0 };
  let s = OPENING.first;
  let finalIndex = 0;
  rounds.forEach((round, index) => {
    const next = rounds[index + 1];
    let stops: number[];
    let lands: number[];
    if (round.final) {
      const k = ks[finalIndex++]!;
      stops = stopTimes(k).map((at) => s + at);
      lands = [stops.at(-1)! + (next ? TOSS.final : TOSS.last)];
    } else {
      stops = [s + SAFE.stops];
      lands = round.by.map((_, k) => s + SAFE.lands + SAFE.second * k);
    }
    const L = lands.at(-1)!;
    if (round.nearly) hold = { from: L + NEARLY.out, to: L + NEARLY.back };
    let seconds: number;
    let safe: number | null = null;
    if (!next) {
      seconds = L + TIMBER.after - s;
    } else if (small) {
      seconds = L + (round.nearly ? SMALL.nearly : SMALL.next) - s;
    } else if (round.nearly) {
      // Nearly, then "Final three!" (falls with 3) or "Final two!" (falls with 2).
      safe = L + NEARLY.safe;
      const after = L + NEARLY.next;
      if (round.final) {
        finalTwo = after;
        seconds = after + FINAL_TWO.last - s;
      } else {
        spotlight = after;
        seconds = after + FINAL_THREE.fallsWith3 - s;
      }
    } else if (next.final) {
      // The last safe round before "Final three!", when it falls with 2.
      safe = L + SAFE.safe;
      spotlight = L + FINAL_THREE.afterSafe;
      seconds = spotlight + FINAL_THREE.fallsWith2 - s;
    } else {
      safe = L + SAFE.safe;
      seconds = round.by.length === 2 ? Math.max(r, ROUND.pair) : r;
    }
    timed.push({ from: s, stops, lands, seconds, safe });
    s += seconds;
  });
  const lastLands = timed.at(-1)!.lands.at(-1)!;
  return {
    rounds: timed,
    spotlight,
    finalTwo,
    hold,
    end: lastLands + TIMBER.after + TIMBER.end,
  };
}

/**
 * When the tower is still before the fall, for the last block landing at
 * `lands` and timber at `timber`. Dead still freezes as the block lands; slow
 * lean holds at the tipping point; it holds settles, and falls once "It
 * holds!" has had its second.
 */
function stillness(ending: Ending, lands: number, timber: number) {
  if (ending === 'dead-still') return { from: lands, to: timber };
  if (ending === 'slow-lean') return { from: timber - STILL, to: timber };
  const settles = lands + HOLDS.out + HOLDS.back;
  return { from: settles, to: Math.max(timber, settles + READ) };
}
