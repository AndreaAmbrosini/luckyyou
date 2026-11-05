// Wobbly Tower's music: Julius Fučík's Entry of the Gladiators (1897, public
// domain), arranged from his piano score (Johanssen's edition, Wikimedia
// Commons), in C as written: the first strain's chromatic tune, eight bars
// that run back into themselves, over an oom-pah on his chords and the
// march's drums. A beat is a quarter note, four to a bar of ¢.

import { drums, melody, oomPah, type Note } from '../../scenario-kit';
import { hoverAt, type Plan, type Turn } from './plan';

/** Quarter notes a second, before each stretch is fitted to whole half notes. */
export const PACE = 4;
/** How many times quicker it is when the tower goes still than at the heartbeat. */
export const TOP = 1.6;
/** How loud the march plays from the heartbeat on. */
export const THIN = 0.6;
/**
 * A hovering block's trill: notes a second, and how many semitones it
 * slides down at the bottom of a dip, and as the block is set down.
 */
export const TRILL = { rate: 12, dip: 4, setDown: 7 } as const;

/** The pickup, the last half of the strain's last bar, played as the first block flies. */
const PICKUP = 'Bb5:.5 Cb6:.5 Bb5:.5 A5:.5';
const PICKUP_BEATS = 2;
/** The first strain, eight bars, ending on the pickup into itself. */
const STRAIN = [
  'Ab5 G5 F#5 G5 | A5 Ab5 G5:.5 Ab5:.5 G5:.5 F#5:.5 | F5 E5 D#5 E5',
  'G5:.5 r:.5 F5:.5 F5:.5 C#5 D5 | G5:.5 r:.5 F5:.5 F5:.5 C#5 D5',
  'B4:.5 C5:.5 C#5:.5 D5:.5 D#5:.5 E5:.5 F5:.5 F#5:.5 | G5:.5 G#5:.5 A5:.5 B5:.5 A5 G5',
  'C6 B5 Bb5:.5 Cb6:.5 Bb5:.5 A5:.5',
].join(' | ');
/** Fučík's chords under it, one a bar. */
const CHORDS = ['C', 'C', 'C', 'G7', 'G7', 'G7', 'G7', 'C'] as const;
const LENGTH = 8 * 4;

const DRUMS = new Set(['kick', 'snare', 'hat']);
/** The block's ease in and out of each move, as the stage draws it. */
const sway = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

/** A stretch of show time at one speed, or growing `growth` a second. */
interface Piece {
  readonly from: number;
  readonly beat: number;
  readonly speed: number;
  readonly growth: number;
}

/**
 * The march from the first toss. Until the heartbeat each block lands on a
 * half note, each turn's whole half notes as near the march's pace as fit.
 * From the heartbeat it plays quieter, without bass or drums, and quicker
 * and quicker until the tower goes still; there it stops for good. A
 * hovering block holds the tune on a trill until it is set down, and each
 * dip slides the trill down and back up with it.
 */
export function wobblyTowerMusic(plan: Plan): Score {
  const first = plan.turns[0]!;
  const arrives = first.hover?.from ?? first.lands;
  const start = Math.max(first.lifts, arrives - PICKUP_BEATS / PACE);
  const stop = plan.still.from;
  const thinFrom = Math.max(start, plan.spotlight);

  // Before the heartbeat: from one landing to the next in whole half notes.
  const landings = plan.turns
    .filter((turn, k) => turn.beat === 'safe' && plan.turns[k - 1]?.round !== turn.round)
    .map((turn) => turn.lands);
  const pieces: Piece[] = [];
  let beat = -PICKUP_BEATS;
  let at = start;
  let speed = PACE;
  for (const lands of landings) {
    const beats =
      at === start ? PICKUP_BEATS : 2 * Math.max(1, Math.round(((lands - at) * PACE) / 2));
    speed = beats / (lands - at);
    pieces.push({ from: at, beat, speed, growth: 0 });
    beat += beats;
    at = lands;
  }
  if (thinFrom > at) {
    pieces.push({ from: at, beat, speed, growth: 0 });
    beat += speed * (thinFrom - at);
  }
  // From the heartbeat, quicker and quicker, TOP times as quick by the stop.
  pieces.push({ from: thinFrom, beat, speed, growth: Math.log(TOP) / (stop - thinFrom) });

  const pieceAt = (t: number) => pieces.findLast((piece) => piece.from <= t + 1e-12) ?? pieces[0]!;
  const speedAt = (t: number) => {
    const piece = pieceAt(t);
    return piece.speed * Math.exp(piece.growth * (t - piece.from));
  };
  const beatAt = (t: number) => {
    const piece = pieceAt(t);
    const s = t - piece.from;
    return piece.growth === 0
      ? piece.beat + piece.speed * s
      : piece.beat + (piece.speed / piece.growth) * (Math.exp(piece.growth * s) - 1);
  };
  const ends = beatAt(stop);
  const thin = beatAt(thinFrom);

  // Each hover holds the tune: the song moves on, the tune waits.
  const hovers = plan.turns
    .filter((turn): turn is Turn & { hover: NonNullable<Turn['hover']> } => turn.hover !== null)
    .filter((turn) => turn.hover.from < stop)
    .map((turn) => {
      const until = Math.min(turn.lands, stop);
      return { turn, from: turn.hover.from, until, beats: beatAt(until) - beatAt(turn.hover.from) };
    });
  /** Song beats spent holding before show time `t`. */
  const heldBy = (t: number) =>
    hovers.reduce(
      (sum, hover) =>
        sum +
        (t >= hover.until ? hover.beats : t > hover.from ? beatAt(t) - beatAt(hover.from) : 0),
      0,
    );
  /** Where the tune is, in its own beats, at show time `t`. */
  const tuneAt = (t: number) => beatAt(t) - heldBy(t);
  const holds = hovers.map((hover) => ({ ...hover, tune: tuneAt(hover.from) }));
  /** Where a tune's beat sits in the song: after each hold it comes at. */
  const placed = (x: number) =>
    x + holds.filter((hold) => hold.tune <= x + 1e-9).reduce((sum, hold) => sum + hold.beats, 0);
  /** A tune note's length, cut where a hold comes in. */
  const cut = (note: Note) => {
    const next = holds.find((hold) => hold.tune > note.at + 1e-9);
    return next ? Math.min(note.beats, next.tune - note.at) : note.beats;
  };

  const tuneEnds = tuneAt(stop);
  const bars = Math.max(0, Math.ceil(tuneEnds / 4)) + 1;
  const strains = Math.ceil(bars / 8);
  const lead = [
    ...melody(PICKUP, -PICKUP_BEATS),
    ...Array.from({ length: strains }, (_, k) => melody(STRAIN, k * LENGTH)).flat(),
  ];
  const tune = [
    ...lead,
    ...oomPah(
      Array.from({ length: bars }, (_, bar) => CHORDS[bar % CHORDS.length]!),
      0,
    ),
    ...drums(bars, 0),
  ]
    .filter((note) => note.at < tuneEnds - 1e-9)
    .map((note) => ({ ...note, beats: cut(note), at: placed(note.at) }));

  // The trill: the tune's note where it holds and the semitone above, sliding with the block.
  const trills = holds.flatMap((hold) => {
    const held = lead.findLast((note) => note.at <= hold.tune + 1e-9)!.pitch!;
    const notes: Note[] = [];
    for (let k = 0; hold.from + k / TRILL.rate < hold.until - 1e-9; k++) {
      const t = hold.from + k / TRILL.rate;
      const next = Math.min(hold.until, t + 1 / TRILL.rate);
      const { dip, set } = hoverAt(hold.turn.hover, hold.turn.lands, t, sway);
      const slide = Math.round(TRILL.dip * dip + TRILL.setDown * set);
      notes.push({
        at: beatAt(t),
        beats: beatAt(next) - beatAt(t),
        voice: 'lead',
        pitch: held + (k % 2) - slide,
      });
    }
    return notes;
  });

  const notes = [...tune, ...trills]
    // From the heartbeat, no bass or drums, and quieter.
    .filter((note) => note.at < thin - 1e-9 || (note.voice !== 'bass' && !DRUMS.has(note.voice)))
    .map((note) => (note.at < thin - 1e-9 ? note : { ...note, level: (note.level ?? 1) * THIN }))
    // Nothing after the stop, so nothing the player has queued plays into it,
    .filter((note) => note.at < ends - 1e-9)
    // and nothing rings past it.
    .map((note) => ({ ...note, beats: Math.min(note.beats, ends - note.at) }))
    .sort((a, b) => a.at - b.at);

  return {
    notes,
    at(t) {
      if (t < start) return { beat: -PICKUP_BEATS, speed: 0 };
      if (t >= stop) return { beat: ends, speed: 0 };
      return { beat: beatAt(t), speed: speedAt(t) };
    },
  };
}
