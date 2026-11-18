// Updraft's music: the Ride of the Valkyries' opening (Wagner, 1856, public
// domain) played as a jaunty oom-pah, a beat a quarter note, four to a bar.
// It quickens a little with each rescue, thins to the tune once the ground
// rises and stops for good when the last two hang over the mat.

import { drums, melody, oomPah, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

const PACE = 4;
const QUICKEN = 0.05;
const THIN = 0.6;
const STRAIN = [
  'B3:.5 E4:1.5 B3:.5 E4:1.5',
  'G4:2 E4:2',
  'G4:.5 B4:1.5 G4:.5 B4:1.5',
  'D5:2 B4:2',
  'E4:.5 A4:1.5 E4:.5 A4:1.5',
  'C5:2 A4:2',
  'C5:.5 E5:1.5 C5:1 G4:1',
  'B4:3 r:1',
].join(' | ');
const CHORDS = ['E7', 'C', 'G7', 'G7', 'Dm', 'F', 'C', 'E7'] as const;
const STRAINS = 3;
const LENGTH = 8 * 4;
const BASS = new Set(['bass', 'kick', 'snare', 'hat']);

export interface Score {
  readonly notes: readonly Note[];
  at(t: number): { beat: number; speed: number };
}

export function updraftMusic(plan: Plan): Score {
  // Speed is constant between rescues, so the beat is a few straight lines.
  const stops = [0, ...plan.rescues.filter((t) => t < plan.hover), plan.hover];
  const beatAt = stops.map((_, k) => {
    let beat = 0;
    for (let i = 0; i < k; i++) beat += (stops[i + 1]! - stops[i]!) * PACE * (1 + QUICKEN * i);
    return beat;
  });
  const total = beatAt.at(-1)!;
  const spotBeat = (() => {
    const k = stops.findLastIndex((t) => t <= plan.spot);
    return beatAt[k]! + (plan.spot - stops[k]!) * PACE * (1 + QUICKEN * k);
  })();

  const lead: Note[] = [];
  const bassoon: Note[] = [];
  const band: Note[] = [];
  for (let k = 0; k < STRAINS; k++) {
    const from = k * LENGTH;
    lead.push(...melody(STRAIN, from, 'lead'));
    bassoon.push(
      ...melody(
        STRAIN.replace(/(\d)/g, (_, o: string) => String(Number(o) - 1)),
        from,
        'bassoon',
      ),
    );
    band.push(...oomPah([...CHORDS], from), ...drums(8, from));
  }
  const notes = [...lead, ...bassoon, ...band]
    .filter((note) => note.at < total)
    .map((note) => {
      const thin = note.at >= spotBeat;
      return thin
        ? BASS.has(note.voice)
          ? null
          : { ...note, level: (note.level ?? 1) * THIN }
        : note;
    })
    .filter((note): note is Note => note !== null)
    .map((note) => ({ ...note, beats: Math.min(note.beats, total - note.at) }));

  return {
    notes,
    at(t) {
      if (t >= plan.hover) return { beat: total, speed: 0 };
      const k = Math.max(
        0,
        stops.findLastIndex((stop) => stop <= t),
      );
      const speed = PACE * (1 + QUICKEN * k);
      return { beat: beatAt[k]! + (t - stops[k]!) * speed, speed };
    },
  };
}
