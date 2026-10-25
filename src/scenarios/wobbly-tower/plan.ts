// Who stands where, whose turn it is when, who goes safe, and how long each
// moment lasts. The show only acts out the app's pick: the turns are drawn
// backwards from the fall, which always comes on the unlucky person's turn,
// the line is seated so they go along it, and the plan is fitted to a length
// and timed forwards.

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

/**
 * A careful toss: the block hovers over the top of the tower from `from`,
 * dips toward it and pulls back up `dips` times, and is set down, landing at
 * the turn's `lands`.
 */
export interface Hover {
  readonly from: number;
  readonly dips: number;
}

export interface Turn {
  /** Who tosses the block on top. */
  readonly by: string;
  /** Turns that share a round go together: a pair at 9 or more. */
  readonly round: number;
  readonly beat: Exclude<Beat, 'opening' | 'timber'>;
  /** Show seconds the round starts. */
  readonly from: number;
  /** Show seconds the caption names the thrower: the round's start, unless a caption before needs its second. */
  readonly named: number;
  /** Show seconds `by` lifts the block. */
  readonly lifts: number;
  /** How the block hovers before it is set down, on a turn with 3 or 2 at risk; null when it is tossed straight on. */
  readonly hover: Hover | null;
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
  /**
   * Everyone, in their standing order, left to right: the turn order seated
   * from a random place along the line, so each turn goes to the next one
   * along, wrapping round. The layout gives each place in it a spot.
   */
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
/** "Whoa…" and "Nearly!" come this long after Nearly's landing. */
export const NEARLY_SAYS = { whoa: 0.25, caption: 1.3 } as const;
/**
 * A careful toss's dips: each move down or back up takes `least` to `most`
 * seconds, so the block never turns back more than three times a second,
 * like the tower; the last `setDown` seconds of the hover lower it onto the
 * top. A hover too short for the dips drawn makes fewer.
 */
export const DIP = { least: 0.34, most: 0.6, setDown: 0.3 } as const;

const ENDINGS: readonly Ending[] = ['dead-still', 'it-holds', 'slow-lean'];

/** The first round starts here, after the paper blocks; with 2 or 3 the spotlight comes at `just`. */
const OPENING = { first: 2.4, just: 1.2 };
/**
 * A safe round, from its start: the thrower lifts the block, it lands (a
 * pair's second a little later, on top), and "Safe!" comes after the last
 * landing. The round lasts r, 2.0 to 3.0 s, from 2.6 before the fit; a
 * pair's at least 2.1 s.
 */
const SAFE = { lifts: 0.5, lands: 1.15, second: 0.1, safe: 0.45 };
const ROUND = { least: 2.0, start: 2.6, most: 3.0, pair: 2.1 };
/**
 * A careful toss, from the round's start: the thrower lifts the block, it
 * reaches the hover point at `hover`, and hovers h, 1 to 3 s, before it lands.
 */
const CAREFUL = { lifts: 0.5, hover: 0.9, least: 1, most: 3 };
/** How many times a careful toss dips, drawn before the fit. */
const DIPS = [1, 2, 3] as const;
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

/** A round as drawn: who throws, and what kind of round it is. */
interface Round {
  readonly by: readonly string[];
  readonly final: boolean;
  readonly nearly: boolean;
}

/** A round as timed. */
interface Timed {
  readonly from: number;
  readonly named: number;
  readonly lifts: number;
  /** When the block reaches the hover point; null when it is tossed straight on. */
  readonly hovers: number | null;
  readonly lands: readonly number[];
  readonly seconds: number;
  readonly safe: number | null;
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const small = count <= 3;
  const ending = pickOne(ENDINGS, random);
  const fallsWith = small ? count : pickOne([3, 2], random);

  // Backwards from the fall: who throws in each round, and the turn order,
  // which seats the line.
  const rounds: Round[] = [];
  let order: string[];
  let final: string[];
  if (small) {
    // Round the line from wherever it starts, so the last turn is theirs.
    order = shuffle(names, random);
    final = [...names];
    const turns = pickOne([4, 5], random);
    const first = order.indexOf(unlucky) - (turns - 1);
    for (let k = 0; k < turns; k++) {
      const by = order[(((first + k) % count) + count) % count]!;
      rounds.push({ by: [by], final: true, nearly: k === turns - 2 });
    }
  } else {
    const [a, b, ...safeOrder] = shuffle(
      names.filter((name) => name !== unlucky),
      random,
    ) as [string, string, ...string[]];
    final = [unlucky, a, b];
    const nearlyBy = fallsWith === 2 ? pickOne([a, b], random) : null;
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
    // Those who never throw stand next along after the unlucky person.
    const turnOrder = [
      ...rounds.flatMap((round) => round.by),
      ...final.filter((name) => name !== unlucky && name !== nearlyBy),
    ];
    const seat = Math.floor(random() * count);
    order = [...turnOrder.slice(seat), ...turnOrder.slice(0, seat)];
  }

  // The fit: how long each careful toss hovers, h, and the safe rounds' length r.
  const finals = rounds.filter((round) => round.final);
  const hs = finals.map(() => CAREFUL.least + (CAREFUL.most - CAREFUL.least) * random());
  const drawn = finals.map(() => pickOne(DIPS, random));
  let r = ROUND.start;
  const lengthNow = () => time(rounds, hs, r, small).end;
  // The safe rounds that take r: all but the one into "Final three!".
  const paced = rounds.filter((round, index) => !round.final && !rounds[index + 1]!.final).length;
  // Too long: the longest hover first, down to the next longest, then r.
  for (let over = lengthNow() - LONGEST; over > 1e-9; over = lengthNow() - LONGEST) {
    const top = Math.max(...hs);
    if (top <= CAREFUL.least + 1e-9) break;
    const next = Math.max(CAREFUL.least, ...hs.filter((h) => h < top - 1e-9));
    hs[hs.indexOf(top)] = Math.max(next, top - over);
  }
  if (lengthNow() > LONGEST && paced > 0) {
    r = Math.max(ROUND.least, r - (lengthNow() - LONGEST) / paced);
  }
  // Too short: the shortest hover first, up to 3 s, then r.
  for (let under = SHORTEST - lengthNow(); under > 1e-9; under = SHORTEST - lengthNow()) {
    const bottom = Math.min(...hs);
    if (bottom >= CAREFUL.most - 1e-9) break;
    hs[hs.indexOf(bottom)] = Math.min(CAREFUL.most, bottom + under);
  }
  if (lengthNow() < SHORTEST && paced > 0) {
    r = Math.min(ROUND.most, r + (SHORTEST - lengthNow()) / paced);
  }
  const timed = time(rounds, hs, r, small);
  // As many dips as were drawn, or as the hover has time for.
  const dips = hs.map((h, i) =>
    Math.max(1, Math.min(drawn[i]!, Math.floor((h - DIP.setDown + 1e-9) / (2 * DIP.least)))),
  );

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
        from: times.from,
        named: times.named,
        lifts: times.lifts,
        hover:
          times.hovers === null ? null : { from: times.hovers, dips: dips[finals.indexOf(round)]! },
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
 * The rounds timed forwards from the opening, final round i's block
 * hovering `hs[i]` and safe rounds r long: when each round starts, its
 * caption, lift and landings, its length and its "Safe!", the spotlight,
 * "Final two!", Nearly's hold, and when the show ends. A round's caption
 * waits until the caption before has had its READ.
 */
function time(rounds: readonly Round[], hs: readonly number[], r: number, small: boolean) {
  const timed: Timed[] = [];
  let spotlight = OPENING.just;
  let finalTwo: number | null = null;
  let hold = { from: 0, to: 0 };
  let s = OPENING.first;
  /** The last caption so far: the one after the opening's. */
  let said = OPENING.just;
  let finalIndex = 0;
  rounds.forEach((round, index) => {
    const next = rounds[index + 1];
    const named = Math.max(s, said + READ);
    let lifts: number;
    let hovers: number | null = null;
    let lands: number[];
    if (round.final) {
      lifts = s + CAREFUL.lifts;
      hovers = s + CAREFUL.hover;
      lands = [hovers + hs[finalIndex++]!];
    } else {
      lifts = s + SAFE.lifts;
      lands = round.by.map((_, k) => s + SAFE.lands + SAFE.second * k);
    }
    said = named;
    const L = lands.at(-1)!;
    if (round.nearly) {
      hold = { from: L + NEARLY.out, to: L + NEARLY.back };
      said = L + NEARLY_SAYS.caption;
    }
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
      said = after;
    } else if (next.final) {
      // The last safe round before "Final three!", when it falls with 2.
      safe = L + SAFE.safe;
      spotlight = L + FINAL_THREE.afterSafe;
      seconds = spotlight + FINAL_THREE.fallsWith2 - s;
      said = spotlight;
    } else {
      safe = L + SAFE.safe;
      seconds = round.by.length === 2 ? Math.max(r, ROUND.pair) : r;
    }
    timed.push({ from: s, named, lifts, hovers, lands, seconds, safe });
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
