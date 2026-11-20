// Pigeon Drop's music: an eight-bar park tune written for the show, over an
// oom-pah and drums. It loses its bass and kick for the finale, and
// stops for good at the splat.

import { drums, melody, oomPah, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

/** Beats a second. */
export const SPEED = 2.5;
const TUNE = [
  'E5 G5 E5 C5 | D5 G4 G4:2 | E5 G5 E5 C5 | D5:2 r:2',
  'F5 A5 F5 D5 | E5 G5 E5 C5 | D5 E5 D5 B4 | C5:2 r:2',
].join(' | ');
const CHORDS = ['C', 'G7', 'C', 'G7', 'F', 'C', 'G7', 'C'] as const;
const LENGTH = CHORDS.length * 4;

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

export function pigeonDropMusic(plan: Plan): Score {
  const ends = plan.hit * SPEED;
  const thin = plan.finale * SPEED;
  const bars = Math.ceil(ends / 4);
  const song = [
    ...Array.from({ length: Math.ceil(bars / CHORDS.length) }, (_, k) =>
      melody(TUNE, k * LENGTH),
    ).flat(),
    ...oomPah(
      Array.from({ length: bars }, (_, bar) => CHORDS[bar % CHORDS.length]!),
      0,
    ),
    ...drums(bars, 0),
  ];
  const notes = song
    .filter((note) => note.at < ends - 1e-9)
    .filter((note) => (note.voice !== 'bass' && note.voice !== 'kick') || note.at < thin - 1e-9)
    // Nothing rings past the splat.
    .map((note) => ({ ...note, beats: Math.min(note.beats, ends - note.at) }));

  return {
    notes,
    at(t) {
      if (t >= plan.hit) return { beat: ends, speed: 0 };
      return { beat: t * SPEED, speed: SPEED };
    },
  };
}
