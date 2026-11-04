// Don't Wake the Dog's music: the march from Gounod's Funeral March of a
// Marionette (1872, public domain), arranged from his 1879 orchestral score
// (Lemoine, Bibliothèque nationale de France), in D minor as written. The
// clarinet solo's first eight bars, on a bassoon, over his bassoons' bass on
// the first beat and chords on the fourth, again and again from the first
// tiptoe. A beat is an eighth note, six to a bar.

import { melody, type Note } from '../../scenario-kit';
import { WAY, type Plan, type Span } from './plan';

/** Eighths a second at the first tiptoe, and how much quicker after each crossing through the gate. */
const PACE = { first: 4.0, quicker: 1.04 } as const;
/**
 * Beats left empty in the song at each freeze, so a note the player has
 * already queued never plays into it: more than the player's lookahead
 * at the quickest pace.
 */
const GAP = 1;

const BAR = 6;
/** The theme's bars start two beats before its first note, on the third eighth. */
const FIRST = -2;

/** The clarinet's tune, the upper of its two voices, with the grace note before the second D. */
const THEME = [
  'r:2 D4 E4:.2 D4:.8 C#4 B3 | C#4 r D4 E4 r r',
  'r:2 D4 E4:.2 D4:.8 C#4 B3 | C#4 r D4 E4 r r',
  'r:2 E4 G4:2 F4 | E4 r G4 Bb4:2 A4',
  'A4 r C5 E5:2 D5 | C#5 Bb4 A4 G4 F4 E4',
].join(' | ');
/** The clarinet's lower voice, where it has one. */
const UNDER = [
  'r:6 | r:6',
  'r:6 | r:6',
  'r:2 C4 B3:3 | C4 r E4 D4:3',
  'F4 r A4 G#4:3 | A4 r:5',
].join(' | ');
/** The bassoons' bass, and their chords, one a bar or two. */
const BASS =
  'D3 r:5 | r:5 A2 | D3 r:5 | r:5 A2 | G2 r:5 | C3 r:2 D3 r:2 | F2 r:2 E2 r:2 | A2 r:4 A2';
const DM = ['F3', 'A3', 'D4'];
const A7 = ['E3', 'G3', 'C#4'];
const CHORDS: readonly (readonly [number, readonly string[]])[] = [
  [3, DM],
  [6, A7],
  [9, A7],
  [15, DM],
  [18, A7],
  [21, A7],
  [27, ['F3', 'G3', 'B3']],
  [33, ['G3', 'Bb3', 'D4']],
  [39, ['G#3', 'B3', 'D4']],
  [45, A7],
];
const LENGTH = 8 * BAR;

/** The eight bars, starting at song beat `from`. */
function strain(from: number): Note[] {
  const at = from + FIRST;
  return [
    ...melody(THEME, at, 'bassoon'),
    ...melody(UNDER, at, 'bassoon').map((note) => ({ ...note, level: 0.6 })),
    ...melody(BASS, at, 'bass'),
    ...CHORDS.flatMap(([beat, chord]) =>
      chord.flatMap((name) => melody(`${name}:.5`, at + beat, 'stab')),
    ),
  ];
}

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

/**
 * The march from the first tiptoe, a little quicker after each crossing
 * through the gate. Every freeze holds it, the last for good; from the
 * heartbeat it plays on without its bass.
 */
export function dogMusic(plan: Plan): Score {
  const start = plan.turns[0]!.from + WAY.wait;
  const throughs = plan.turns
    .flatMap((turn) => turn.crossings.flatMap((crossing) => crossing.through ?? []))
    .sort((a, b) => a - b);
  const last = plan.turns.at(-1)!;
  // The last turn's scare holds the music as every other does, and it never goes on.
  const stop = Math.min(last.hold?.from ?? plan.wakes, plan.wakes);
  const holds: Span[] = plan.turns
    .flatMap((turn) => (turn.hold && turn !== last ? [turn.hold] : []))
    .sort((a, b) => a.from - b.from);

  const paceAt = (t: number) =>
    PACE.first * PACE.quicker ** throughs.filter((at) => at <= t + 1e-9).length;
  /** How far the tune has gone, in its own beats, by show time `t`. */
  const songAt = (t: number) => {
    const end = Math.min(t, stop);
    if (end <= start) return 0;
    const marks = [start, end, ...throughs, ...holds.flatMap((hold) => [hold.from, hold.to])]
      .filter((at) => at >= start && at <= end)
      .sort((a, b) => a - b);
    let beats = 0;
    for (let k = 1; k < marks.length; k++) {
      const [from, to] = [marks[k - 1]!, marks[k]!];
      const middle = (from + to) / 2;
      const held = holds.some((hold) => middle >= hold.from && middle < hold.to);
      if (!held) beats += (to - from) * paceAt(middle);
    }
    return beats;
  };

  const frozen = holds.map((hold) => songAt(hold.from));
  const ends = songAt(stop);
  const thinFrom = songAt(plan.spotlight);
  /** Where a tune's beat sits in the song: after a gap at each freeze it comes after. */
  const placed = (beat: number) => beat + GAP * frozen.filter((at) => at <= beat + 1e-9).length;

  const tune = Array.from({ length: Math.ceil(ends / LENGTH) + 1 }, (_, k) =>
    strain(k * LENGTH),
  ).flat();
  const notes = tune
    .filter((note) => note.at >= 0 && note.at < ends - 1e-9)
    .filter((note) => note.voice !== 'bass' || note.at < thinFrom - 1e-9)
    .map((note) => ({
      ...note,
      // Nothing rings past the stop.
      beats: Math.min(note.beats, ends - note.at),
      at: placed(note.at),
    }));

  return {
    notes,
    at(t) {
      if (t < start) return { beat: 0, speed: 0 };
      const k = holds.findIndex((hold) => t >= hold.from - 1e-9 && t < hold.to);
      if (k >= 0) return { beat: frozen[k]! + GAP * k, speed: 0 };
      if (t >= stop) return { beat: placed(ends), speed: 0 };
      const passed = holds.filter((hold) => hold.to <= t + 1e-9).length;
      return { beat: songAt(t) + GAP * passed, speed: paceAt(t) };
    },
  };
}
