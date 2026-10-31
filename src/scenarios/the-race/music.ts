// The Race's music, the galop from Rossini's William Tell Overture
// (public domain), arranged from the Nottingham Music Database's version in
// C. A drum roll under "On your marks…", the galop from "Go!", fitted to whole
// bars so the final stretch starts on one; its minor strain, faster, in the
// final stretch; a run down, an octave low, through the slow last moment; and
// silence from the line until the fanfare.

import { drums, melody, oomPah, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

/** The galop's beats a second, before it is fitted to whole bars. */
const GALOP = 4.4;

/** The galop's first strain, eight bars, ending on the pickup into itself. */
const STRAIN = [
  'G4 G4:.5 G4:.5 G4 G4 | C5 D5 E5 G4:.5 G4:.5 | G4 G4:.5 G4:.5 C5 E5 | D5 B4 G4 G4:.5 G4:.5',
  'G4 G4:.5 G4:.5 G4 G4 | C5 D5 E5 C5:.5 E5:.5 | G5:2.5 F5:.5 E5:.5 D5:.5 | C5 E5 C5 G4:.5 G4:.5',
].join(' | ');
const STRAIN_CHORDS = ['C', 'C', 'C', 'G7', 'C', 'C', 'G7', 'C'];

/** The minor strain's first four bars, for the final stretch. */
const STRETCH = 'E5 E5:.5 E5:.5 E5 E5 | E5 A5 E5 A5 | E5 A5 E5 D5 | C5 B4 A4 r';

/** The slow last moment: the strain's run down, an octave low, over G. */
const SLOW = 'G4:.5 F4:.5 E4:.5 D4:.5';

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

export function raceMusic({ times }: Plan): Score {
  const racing = times.stretch - times.go;
  const bars = Math.max(1, Math.round((racing * GALOP) / 4));
  const galop = (bars * 4) / racing;
  const stretchAt = bars * 4;
  const stretch = 16 / (times.slow - times.stretch);
  const slowAt = stretchAt + 16;
  const slow = 2 / (times.finish - times.slow);

  // The strain, as many times as the race has bars, cut at the last one.
  const strain = melody(STRAIN, 0);
  const galopNotes = Array.from({ length: Math.ceil(bars / 8) }, (_, i) =>
    strain.map((note) => ({ ...note, at: note.at + i * 32 })),
  )
    .flat()
    .filter((note) => note.at < stretchAt);
  const chords = Array.from({ length: bars }, (_, bar) => STRAIN_CHORDS[bar % 8]!);

  // A snare roll that swells, then the pickup into the first bar.
  const roll: Note[] = [];
  for (let at = -4.5; at < -1; at += 0.25) {
    roll.push({ at, beats: 0.25, voice: 'snare', level: 0.15 + 0.6 * ((at + 4.5) / 3.5) });
  }

  const notes: Note[] = [
    ...roll,
    ...melody('G4:.5 G4:.5', -1),
    ...galopNotes,
    ...oomPah(chords, 0),
    ...drums(bars, 0),
    ...melody(STRETCH, stretchAt),
    ...oomPah(['Am', 'Am', 'Am', 'Am'], stretchAt),
    // No kick in the stretch: the heartbeat has the low end.
    ...drums(4, stretchAt, { kick: false }),
    ...melody(SLOW, slowAt),
    ...melody('G2:2', slowAt, 'bass'),
  ];

  return {
    notes,
    at(t) {
      if (t < times.stretch) return { beat: (t - times.go) * galop, speed: galop };
      if (t < times.slow)
        return { beat: stretchAt + (t - times.stretch) * stretch, speed: stretch };
      if (t < times.finish) return { beat: slowAt + (t - times.slow) * slow, speed: slow };
      return { beat: slowAt + 2, speed: 0 };
    },
  };
}
