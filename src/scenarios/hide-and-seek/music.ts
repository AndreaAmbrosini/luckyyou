// Hide and Seek's music: Edvard Grieg's In the Hall of the Mountain King
// (1875, public domain), the theme in A minor, sixteen beats. It starts on
// a lone bassoon, gains a plucked bass and off-beat hats and then a bright
// lead, and speeds up all the way. Once the last three are lit the bass
// drops out, and it stops dead just before the fanfare.

import { melody, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

const THEME = [
  'A3:.5 B3:.5 C4:.5 D4:.5 | E4:.5 C4:.5 E4:1',
  'D#4:.5 B3:.5 D#4:1 | D4:.5 B3:.5 D4:1',
  'A3:.5 B3:.5 C4:.5 D4:.5 | E4:.5 C4:.5 E4:.5 A4:.5',
  'G4:.5 E4:.5 C4:.5 E4:.5 | G4:2',
].join(' | ');
const LENGTH = 16;
/** The plucked bass, a root and a fifth a bar: A minor, E, A minor, E. */
const ROOTS = [45, 40, 45, 40] as const;
const SLOW = 2;
const QUICKER = 1.1;
/** The music stops this long before the fanfare. */
const STOP = 0.2;

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

export function scoreFor(plan: Plan): Score {
  const stop = plan.reveal - STOP;
  const speed = (t: number) => SLOW + (QUICKER * t) / plan.reveal;
  const beatAt = (t: number) => {
    const u = Math.min(t, stop);
    return SLOW * u + (QUICKER * u * u) / (2 * plan.reveal);
  };
  const stopBeat = beatAt(stop);
  const lit = beatAt(plan.spotlight);

  const notes: Note[] = [];
  for (let pass = 0; pass * LENGTH < stopBeat; pass++) {
    const from = pass * LENGTH;
    notes.push(...melody(THEME, from, 'bassoon'));
    if (pass >= 1) {
      for (let bar = 0; bar < 4; bar++) {
        const root = ROOTS[bar]!;
        notes.push(
          { at: from + bar * 4, beats: 1, voice: 'bass', pitch: root, level: 0.9 },
          { at: from + bar * 4 + 2, beats: 1, voice: 'bass', pitch: root + 7, level: 0.7 },
        );
      }
      for (let beat = 0.5; beat < LENGTH; beat += 1) {
        notes.push({ at: from + beat, beats: 0.25, voice: 'hat', level: 0.5 });
      }
    }
    if (pass >= 2) {
      for (const note of melody(THEME, from, 'lead')) {
        notes.push({ ...note, pitch: note.pitch! + 12, level: 0.6 });
      }
    }
  }
  return {
    notes: notes.filter((note) => note.at < stopBeat && (note.voice !== 'bass' || note.at < lit)),
    at: (t) => ({ beat: beatAt(t), speed: t >= stop ? 0 : speed(t) }),
  };
}
