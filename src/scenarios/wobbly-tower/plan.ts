// Whose turn it is when, and how long each beat lasts. The show only acts out
// the app's pick: the plan is built backwards from the fall, which always
// comes on the unlucky person's turn.

import { fitBeats, pickOne, shuffle } from '../../scenario-kit';

/** The show's beats, in the order they play. */
export const BEATS = [
  'thunk',
  'stack',
  'wobble',
  'pigeon',
  'careful',
  'nearly',
  'last-turn',
  'timber',
] as const;

export type Beat = (typeof BEATS)[number];

/**
 * How the pointer picks the last turn: `straight` to the unlucky person;
 * `fake-out`, it stops on someone else first, who says "Phew!", then hops to
 * the unlucky person; `again`, the unlucky person had Nearly and it stays on
 * them.
 */
export type PointerMove = 'straight' | 'fake-out' | 'again';

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

export interface Turn {
  /** Who tosses the block on top. */
  readonly by: string;
  readonly beat: Beat;
  /** Whom the pointer stops on first, before it hops to `by`; null when it goes straight there. */
  readonly decoy: string | null;
  /**
   * Show seconds when the turn starts: the pointer leaves where it was. Each
   * turn starts where the one before ends, except the first careful turn,
   * which starts after the pigeon's beat.
   */
  readonly from: number;
  /** Show seconds when the pointer stops on the decoy; null without one. */
  readonly decoyStops: number | null;
  /** Show seconds when the pointer stops over `by`, before they lift the block. */
  readonly stops: number;
  /** Show seconds when the block lands on top. */
  readonly lands: number;
  /** How long the turn takes, from `from` until the tower has settled for the next. */
  readonly seconds: number;
  /** How far the tower leans after the block lands. */
  readonly lean: Lean;
}

export interface Plan {
  /** Everyone, in their standing order; the layout gives each place in it a spot. */
  readonly order: readonly string[];
  /** Whether a pigeon lands on top after the big wobble. */
  readonly pigeon: boolean;
  readonly pointer: PointerMove;
  readonly ending: Ending;
  /** Show seconds per beat; the pigeon's is 0 without the pigeon. */
  readonly beats: Readonly<Record<Beat, number>>;
  /**
   * Every turn, in order: the quick turns, the big wobble, two careful turns,
   * Nearly and the last turn. The thunk's two paper blocks are nobody's turn,
   * so the tower ends at 2 + `turns.length` blocks.
   */
  readonly turns: readonly Turn[];
  /** Who says "Phew!" when the pointer moves on from them: the fake-out's decoy; null otherwise. */
  readonly phew: string | null;
  /** Show seconds of each heartbeat, from the careful turns' start to the last block, closer and closer. */
  readonly heartbeats: readonly number[];
  /** Show seconds while the tower barely moves before it falls; it falls at `still.to`. */
  readonly still: { readonly from: number; readonly to: number };
  /** The tower falls toward the side of the stage this person stands on: the unlucky person. */
  readonly falls: string;
}

/** Every show is stretched to at least this many seconds. */
const SHORTEST = 16.8;
/** Each quick turn is this much of the one before. */
const QUICKER = 0.9;
/** The careful turns, in proportion. */
const CAREFUL = [1, 1.25];
/**
 * Where the pointer stops and the block lands, as parts of a turn from its
 * start; the decoy's stop too, where the turn has one. The rest of the turn
 * is the tower swaying and settling.
 */
const PACE = {
  quick: { stops: 0.1, lands: 0.8 },
  wobble: { stops: 0.1, lands: 0.35 },
  careful: { decoy: 0.15, stops: 0.45, lands: 0.75 },
  nearly: { stops: 0.12, lands: 0.38 },
} as const;
/**
 * The last turn, in seconds from its start: where the pointer stops (the
 * fake-out stops on the decoy first), and how long the toss takes.
 */
const LAST = { decoy: 0.2, straight: 0.3, fakeOut: 0.6, toss: 0.4 };
/** Seconds the tower barely moves before it falls, unless it froze earlier. */
const STILL = 0.6;
/** Peak leans, in degrees. */
const LEANS = {
  quick: { least: 2, most: 3 },
  careful: { least: 3, most: 4 },
  wobble: 7,
  nearly: 22,
  itHolds: 4,
  slowLean: 20,
};
/** The first heartbeat gap, how much shorter each next one is, and the shortest. */
const HEARTBEAT = { first: 0.9, quicker: 0.88, shortest: 0.4 };

/** Lengths that change by `ratio` each time and add up to `total` exactly. */
function lengths(total: number, count: number, ratio: number): number[] {
  const first = (total * (1 - ratio)) / (1 - ratio ** count);
  return Array.from({ length: count }, (_, index) => first * ratio ** index);
}

/** A random side of the stage. */
const side = (random: () => number): -1 | 1 => (random() < 0.5 ? -1 : 1);

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const count = names.length;
  const order = shuffle(names, random);
  const pigeon = random() < 0.5;
  const pointer = pickOne<PointerMove>(['straight', 'fake-out', 'again'], random);
  const ending = pickOne<Ending>(['dead-still', 'it-holds', 'slow-lean'], random);
  const quick = pickOne([2, 3, 4], random);

  // With the pigeon the show is 18.2 s and nothing stretches; without it,
  // 16.8 s, so stack and careful only stretch if the total ever drops.
  const stack = 3.0 + 0.06 * (count - 2);
  const beats = fitBeats<Beat>(
    {
      thunk: { seconds: 1.6 },
      stack: { seconds: stack, flexible: true },
      wobble: { seconds: 2.0 },
      pigeon: { seconds: pigeon ? 1.4 : 0 },
      careful: { seconds: 6.6 - stack, flexible: true },
      nearly: { seconds: 1.6 },
      'last-turn': { seconds: 2.4 },
      timber: { seconds: 2.6 },
    },
    SHORTEST,
  );
  const start = (beat: Beat) =>
    BEATS.slice(0, BEATS.indexOf(beat)).reduce((seconds, each) => seconds + beats[each], 0);

  // Backwards from the fall: who takes each turn, its decoy and its lean,
  // from the last turn to the first. At 3 or more nobody takes the turn
  // right after their own, except the unlucky person after "Again?!"; at 2
  // anyone may.
  const other = (not: string) =>
    pickOne(
      names.filter((name) => name !== not),
      random,
    );
  const next = (after: string) => (count === 2 ? pickOne(names, random) : other(after));
  const sway = (range: { least: number; most: number }): Lean => ({
    degrees: range.least + (range.most - range.least) * random(),
    toward: side(random),
  });

  const fakeOut = pointer === 'fake-out' ? other(unlucky) : null;
  const lastLean: Lean =
    ending === 'slow-lean'
      ? { degrees: LEANS.slowLean, toward: unlucky }
      : ending === 'it-holds'
        ? { degrees: LEANS.itHolds, toward: side(random) }
        : { degrees: 0, toward: unlucky };
  const nearly = pointer === 'again' ? unlucky : other(unlucky);
  const carefully = (after: string) => {
    const by = next(after);
    return { by, decoy: other(by), lean: sway(LEANS.careful) };
  };
  const careful2 = carefully(nearly);
  const careful1 = carefully(careful2.by);
  const wobble = next(careful1.by);
  const wobbleSide = side(random);
  const quickTurns: { by: string; lean: Lean }[] = [];
  let after = wobble;
  while (quickTurns.length < quick) {
    after = next(after);
    quickTurns.unshift({ by: after, lean: sway(LEANS.quick) });
  }

  // Forwards, the times.
  const turns: Turn[] = [];
  const add = (
    by: string,
    beat: Beat,
    from: number,
    seconds: number,
    pace: { readonly decoy?: number; readonly stops: number; readonly lands: number },
    decoy: string | null,
    lean: Lean,
  ) => {
    turns.push({
      by,
      beat,
      decoy,
      from,
      decoyStops: decoy === null ? null : from + pace.decoy! * seconds,
      stops: from + pace.stops * seconds,
      lands: from + pace.lands * seconds,
      seconds,
      lean,
    });
  };

  let from = start('stack');
  lengths(beats.stack, quick, QUICKER).forEach((seconds, index) => {
    const { by, lean } = quickTurns[index]!;
    add(by, 'stack', from, seconds, PACE.quick, null, lean);
    from += seconds;
  });
  add(wobble, 'wobble', from, beats.wobble, PACE.wobble, null, {
    degrees: LEANS.wobble,
    toward: wobbleSide,
  });
  from = start('careful');
  const careful = CAREFUL.map((part) => (part * beats.careful) / (CAREFUL[0]! + CAREFUL[1]!));
  [careful1, careful2].forEach(({ by, decoy, lean }, index) => {
    add(by, 'careful', from, careful[index]!, PACE.careful, decoy, lean);
    from += careful[index]!;
  });
  add(nearly, 'nearly', from, beats.nearly, PACE.nearly, null, {
    degrees: LEANS.nearly,
    toward: nearly,
  });

  // The last turn, from its start: the pointer's move, then the toss.
  from = start('last-turn');
  const stops = from + (fakeOut ? LAST.fakeOut : LAST.straight);
  const lands = stops + LAST.toss;
  const fall = start('timber');
  turns.push({
    by: unlucky,
    beat: 'last-turn',
    decoy: fakeOut,
    from,
    decoyStops: fakeOut ? from + LAST.decoy : null,
    stops,
    lands,
    seconds: beats['last-turn'],
    lean: lastLean,
  });

  const heartbeats: number[] = [];
  for (let time = start('careful'), k = 0; time < lands; k++) {
    heartbeats.push(time);
    time += Math.max(HEARTBEAT.shortest, HEARTBEAT.first * HEARTBEAT.quicker ** k);
  }

  return {
    order,
    pigeon,
    pointer,
    ending,
    beats,
    turns,
    phew: fakeOut,
    heartbeats,
    // Dead still freezes as the block lands; the others settle or lean first.
    still: { from: ending === 'dead-still' ? lands : fall - STILL, to: fall },
    falls: unlucky,
  };
}
