// Hot Potato's music: the Can-can, the Galop infernal from Offenbach's
// Orpheus in the Underworld (1858, public domain), arranged from Heugel's
// 1874 vocal score (University of North Carolina copy, Internet Archive):
// the chorus's "la la" strain, sixteen bars, down a tone from D to C so it
// fits the kit's chords. A beat is an eighth note, four to a 2/4 bar, over
// an oom-pah and the galop's drums. In the party game, whoever holds the
// potato when the music stops is caught.

import { drums, melody, oomPah, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

/** Beats each pass moves the song on in the laps: a quarter note, so every catch lands on one. */
export const PASS = 2;
/** How many times quicker it is when it stops than in the laps. */
export const TOP = 1.7;

/** The pickup, played as the first pass flies. */
const PICKUP = 'G4:2';
/** The chorus, sixteen bars, ending on the pickup into itself. */
const STRAIN = [
  'C5:4 | D5 F5 E5 D5 | G5:2 G5:2 | G5 A5 E5 F5',
  'D5:2 D5:2 | D5 F5 E5 D5 | C5 C6 B5 A5 | G5 F5 E5 D5',
  'C5:4 | D5 F5 E5 D5 | G5:2 G5:2 | G5 A5 E5 F5',
  'D5:2 D5:2 | D5 F5 E5 D5 | C5 G5 D5 E5 | C5:2 G4:2',
].join(' | ');
/** Offenbach's chords under it, one a bar. */
const CHORDS = [
  ...['C', 'G7', 'C', 'C', 'G7', 'G7', 'C', 'G7'],
  ...['C', 'G7', 'C', 'C', 'G7', 'G7', 'C', 'C'],
] as const;
const LENGTH = 16 * 4;

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

/**
 * The Can-can from the first pass after the plop, a catch on every quarter
 * note through the laps. From "Last lap!" it speeds up evenly, as the danger
 * grows, without its bass and kick, until it stops for good as the potato
 * goes still in the last second.
 */
export function hotPotatoMusic(plan: Plan): Score {
  const first = plan.catches[1]!;
  const start = first.thrown;
  const pace = PASS / (first.at - first.thrown);
  const lastLap = plan.heartbeats[0]!;
  const stop = plan.still.from;
  const rampFrom = PASS * ((lastLap - start) / (first.at - first.thrown) - 1);
  const growth = Math.log(TOP) / (stop - lastLap);

  const speedAt = (t: number) => (t < lastLap ? pace : pace * Math.exp(growth * (t - lastLap)));
  const beatAt = (t: number) =>
    t < lastLap
      ? -PASS + (t - start) * pace
      : rampFrom + (pace / growth) * (Math.exp(growth * (t - lastLap)) - 1);
  const ends = beatAt(stop);
  const thin = beatAt(lastLap);

  const bars = Math.ceil(ends / 4) + 1;
  const strains = Math.ceil(bars / 16);
  const song = [
    ...melody(PICKUP, -PASS),
    ...Array.from({ length: strains }, (_, k) => melody(STRAIN, k * LENGTH)).flat(),
    ...oomPah(
      Array.from({ length: bars }, (_, bar) => CHORDS[bar % CHORDS.length]!),
      0,
    ),
    ...drums(bars, 0),
  ];
  const notes = song
    // Nothing after the stop, so nothing the player has queued plays into it.
    .filter((note) => note.at < ends - 1e-9)
    .filter((note) => (note.voice !== 'bass' && note.voice !== 'kick') || note.at < thin - 1e-9)
    // Nothing rings past the stop.
    .map((note) => ({ ...note, beats: Math.min(note.beats, ends - note.at) }));

  return {
    notes,
    at(t) {
      if (t < start) return { beat: -PASS, speed: 0 };
      if (t >= stop) return { beat: ends, speed: 0 };
      return { beat: beatAt(t), speed: speedAt(t) };
    },
  };
}
