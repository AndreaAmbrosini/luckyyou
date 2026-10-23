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
   * Show seconds when the turn starts. Each turn starts where the one before
   * ends, except the first careful turn, which starts after the pigeon's beat.
   * The pointer leaves for this turn at max(the previous block's landing,
   * or stack's start for the first turn, its first stop − pointer.ts's
   * LONGEST_HOP).
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
  /** Show seconds when each beat starts; the show ends at timber's start plus its seconds. */
  readonly starts: Readonly<Record<Beat, number>>;
  /**
   * Every turn, in order: the quick turns, the big wobble, two careful turns,
   * Nearly and the last turn. The thunk's two paper blocks are nobody's turn,
   * so the tower ends at 2 + `turns.length` blocks.
   */
  readonly turns: readonly Turn[];
  /** Who says "Phew!" when the pointer moves on from them: the fake-out's decoy; null otherwise. */
  readonly phew: string | null;
  /**
   * Show seconds while Nearly's lean holds still at its peak, inside the
   * Nearly beat; it leans out from its landing to `hold.from` and swings back
   * after `hold.to`.
   */
  readonly hold: { readonly from: number; readonly to: number };
  /** Show seconds of each heartbeat, from the careful turns' start to the last block, closer and closer. */
  readonly heartbeats: readonly number[];
  /**
   * Show seconds while the tower barely moves before it falls; it falls at
   * `still.to`. That is timber's start, or later for `it-holds`, so "…or
   * not!" as it falls comes a second after "It holds!" as it settles, at
   * `still.from`.
   */
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
 * The pointer hops while the tower settles, leaving at max(the previous
 * block's landing, its first stop − pointer.ts's LONGEST_HOP). Every hop and
 * toss lasts 0.4 s or more (DESIGN.md: movement that matters), except a
 * quick turn's hop, which gets what its toss leaves, 0.2 s or more. Before
 * each toss the pointer stays over the taker for `POINTED`, so it's seen to
 * stop before it fades.
 */
const TOSS = 0.4;
const POINTED = 0.1;
/** A quick turn lands as it ends, and its toss takes this much of it, at least `TOSS` + `POINTED`. */
const QUICK_TOSS = 0.55;
/** The big wobble, in seconds from its start: the pointer stops, then the block lands. */
const WOBBLE = { stops: 0.4, lands: 0.9 };
/**
 * Each careful turn, as parts of it from its start: the decoy, the taker, the
 * landing. A decoy stop is a hop of 0.4 s or more to them, a rest of 0.25 s
 * or more, and a hop on of 0.4 s or more, so the decoy and the taker are 0.65 s
 * or more apart. The first turn's decoy comes early, as its hop starts in the
 * beat before; the second's leaves room for the hop from the first landing,
 * and its landing for Nearly's hop. Laid out for the shortest careful beat,
 * 3.0 s.
 */
const CAREFUL_PACE = [
  { decoy: 0.08, stops: 0.57, lands: 0.965 },
  { decoy: 0.215, stops: 0.61, lands: 0.92 },
] as const;
/**
 * Nearly, in seconds from its start: the pointer stops, the block lands, the
 * tower leans out for `leanOut` and holds still until the beat ends. It
 * swings back while the pointer hops for the last turn.
 */
const NEARLY = { stops: 0.27, lands: 0.77, leanOut: 0.4 };
/**
 * The last turn, in seconds from its start: where the pointer stops (the
 * fake-out stops on the decoy first, rests and hops on, as a careful turn
 * does), and how long the toss takes. "Again?!" doesn't hop: the pointer
 * bounces on the spot, once Nearly's thrower has said "Phew!". The fake-out
 * and "Again?!" land 1.2 s in: on `it-holds` the tower settles 0.68 s later
 * and falls READ after that, 0.52 s into timber, so the unlucky person has
 * grown (0.5 s) before the show's last 1.5 s.
 */
const LAST = { decoy: 0.05, straight: 0.3, fakeOut: 0.7, again: 0.7, toss: 0.5 };
/** Seconds the tower barely moves before it falls, unless it froze earlier. */
const STILL = 0.6;
/** `it-holds`: the tower sways out to its lean and back upright, in seconds, then holds. */
const HOLDS = { out: 0.34, back: 0.34 };
/**
 * Seconds from one caption to the next that must not wait: the kit keeps
 * each up for a second, and a frame more covers the frame they're asked in.
 */
export const READ = 1.04;
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

  // With the pigeon the show is 18.3 s and nothing stretches; without it,
  // 16.9 s, so stack and careful only stretch if the total ever drops.
  const stack = 3.35 + 0.025 * (count - 2);
  const beats = fitBeats<Beat>(
    {
      thunk: { seconds: 1.6 },
      stack: { seconds: stack, flexible: true },
      wobble: { seconds: 2.0 },
      pigeon: { seconds: pigeon ? 1.4 : 0 },
      careful: { seconds: 6.6 - stack, flexible: true },
      nearly: { seconds: 1.7 },
      'last-turn': { seconds: 2.4 },
      timber: { seconds: 2.6 },
    },
    SHORTEST,
  );
  const starts = Object.fromEntries(
    BEATS.map((beat, index) => [
      beat,
      BEATS.slice(0, index).reduce((seconds, each) => seconds + beats[each], 0),
    ]),
  ) as Record<Beat, number>;
  const start = (beat: Beat) => starts[beat];

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

  // Forwards, the times. Each turn: when the pointer stops on the decoy and
  // on the taker, and when the block lands, all in show seconds.
  const turns: Turn[] = [];
  const add = (
    by: string,
    beat: Beat,
    from: number,
    seconds: number,
    times: { readonly decoyStops?: number; readonly stops: number; readonly lands: number },
    decoy: string | null,
    lean: Lean,
  ) => {
    turns.push({
      by,
      beat,
      decoy,
      from,
      decoyStops: decoy === null ? null : times.decoyStops!,
      stops: times.stops,
      lands: times.lands,
      seconds,
      lean,
    });
  };

  let from = start('stack');
  lengths(beats.stack, quick, QUICKER).forEach((seconds, index) => {
    const { by, lean } = quickTurns[index]!;
    const lands = from + seconds;
    const stops = lands - Math.max(TOSS + POINTED, QUICK_TOSS * seconds);
    add(by, 'stack', from, seconds, { stops, lands }, null, lean);
    from = lands;
  });
  add(
    wobble,
    'wobble',
    from,
    beats.wobble,
    { stops: from + WOBBLE.stops, lands: from + WOBBLE.lands },
    null,
    { degrees: LEANS.wobble, toward: wobbleSide },
  );
  from = start('careful');
  const careful = CAREFUL.map((part) => (part * beats.careful) / (CAREFUL[0]! + CAREFUL[1]!));
  [careful1, careful2].forEach(({ by, decoy, lean }, index) => {
    const seconds = careful[index]!;
    const at = (part: number) => from + part * seconds;
    const pace = CAREFUL_PACE[index]!;
    const times = {
      decoyStops: at(pace.decoy),
      stops: at(pace.stops),
      lands: at(pace.lands),
    };
    add(by, 'careful', from, seconds, times, decoy, lean);
    from += seconds;
  });
  add(
    nearly,
    'nearly',
    from,
    beats.nearly,
    { stops: from + NEARLY.stops, lands: from + NEARLY.lands },
    null,
    { degrees: LEANS.nearly, toward: nearly },
  );
  const hold = { from: from + NEARLY.lands + NEARLY.leanOut, to: from + beats.nearly };

  // The last turn, from its start: the pointer's move, then the toss.
  from = start('last-turn');
  const stops =
    from +
    (pointer === 'fake-out' ? LAST.fakeOut : pointer === 'again' ? LAST.again : LAST.straight);
  const lands = stops + LAST.toss;
  const fall = start('timber');
  add(
    unlucky,
    'last-turn',
    from,
    beats['last-turn'],
    { decoyStops: from + LAST.decoy, stops, lands },
    fakeOut,
    lastLean,
  );

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
    starts,
    turns,
    phew: fakeOut,
    hold,
    heartbeats,
    still: stillness(ending, lands, fall),
    falls: unlucky,
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
