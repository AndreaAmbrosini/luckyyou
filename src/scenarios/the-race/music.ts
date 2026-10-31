// The Race's music, the galop from Rossini's William Tell Overture
// (public domain), arranged from the Nottingham Music Database's version in
// C. A drum roll under "On your marks…", the galop from "Go!", fitted to whole
// bars so the final stretch starts on one; its minor strain, faster, in the
// final stretch; a run down, an octave low, through the slow last moment; and
// silence from the line until the fanfare. At Christmas, Jingle Bells (James
// Lord Pierpont, 1857, public domain) takes the galop's place, on its beats,
// with sleigh bells.

import { drums, melody, oomPah, type Note, type Voice } from '../../scenario-kit';
import type { Course, Plan } from './plan';

/** The galop's beats a second, before it is fitted to whole bars. */
const GALOP = 4.4;

/** A tune for the race, in C so the fanfare resolves its slow moment. */
interface Tune {
  /** What rolls and swells under "On your marks…". */
  readonly roll: Voice;
  /** The pickup into the first bar, after the roll. */
  readonly pickup: string;
  /** The bass under the pickup, if any. */
  readonly pickupBass?: string;
  /** Played from "Go!", again and again, cut at the stretch. */
  readonly strain: string;
  /** The strain's chords, one a bar. */
  readonly chords: readonly string[];
  /** Four bars for the final stretch. */
  readonly stretch: string;
  readonly stretchChords: readonly string[];
  /** Two beats for the slow last moment, over a low G. */
  readonly slow: string;
  /** Sleigh bells on every beat from "Go!", slowing and fading through the slow moment. */
  readonly bells?: boolean;
}

const WILLIAM_TELL: Tune = {
  roll: 'snare',
  pickup: 'G4:.5 G4:.5',
  // The galop's first strain, eight bars, ending on the pickup into itself.
  strain: [
    'G4 G4:.5 G4:.5 G4 G4 | C5 D5 E5 G4:.5 G4:.5 | G4 G4:.5 G4:.5 C5 E5 | D5 B4 G4 G4:.5 G4:.5',
    'G4 G4:.5 G4:.5 G4 G4 | C5 D5 E5 C5:.5 E5:.5 | G5:2.5 F5:.5 E5:.5 D5:.5 | C5 E5 C5 G4:.5 G4:.5',
  ].join(' | '),
  chords: ['C', 'C', 'C', 'G7', 'C', 'C', 'G7', 'C'],
  // The minor strain's first four bars.
  stretch: 'E5 E5:.5 E5:.5 E5 E5 | E5 A5 E5 A5 | E5 A5 E5 D5 | C5 B4 A4 r',
  stretchChords: ['Am', 'Am', 'Am', 'Am'],
  // The strain's run down, an octave low.
  slow: 'G4:.5 F4:.5 E4:.5 D4:.5',
};

const JINGLE_BELLS: Tune = {
  // The bells shake, then a run up over a low G lands on the chorus.
  roll: 'bells',
  pickup: 'G4:.5 A4:.5 B4:.5 D5:.5',
  pickupBass: 'G2:2',
  // The chorus, sixteen bars.
  strain: [
    'E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:.5 | E5:4',
    'F5 F5 F5:1.5 F5:.5 | F5 E5 E5 E5:.5 E5:.5 | E5 D5 D5 E5 | D5:2 G5:2',
    'E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:.5 | E5:4',
    'F5 F5 F5 F5 | F5 E5 E5 E5:.5 E5:.5 | G5 G5 F5 D5 | C5:4',
  ].join(' | '),
  chords: ['C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G7', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C'],
  // The verse's first four bars, "Dashing through the snow…", turning down at
  // the end into the slow moment's run.
  stretch: 'G4 E5 D5 C5 | G4:3 G4:.5 G4:.5 | G4 E5 D5 C5 | A4:2 C5 B4',
  stretchChords: ['C', 'C', 'C', 'F'],
  // On down, to just above the fanfare's C.
  slow: 'A4:.5 G4:.5 F4:.5 D4:.5',
  bells: true,
};

const TUNES: Partial<Record<Course, Tune>> = { christmas: JINGLE_BELLS };

/** Sleigh bells on each beat of `bars` bars, then four shakes fading over the slow moment's two. */
function bells(bars: number, from: number): Note[] {
  const slowAt = from + bars * 4;
  return [
    ...Array.from({ length: bars * 4 }, (_, beat) => ({ at: from + beat, beats: 0.5 })),
    ...[1, 0.75, 0.5, 0.3].map((level, i) => ({ at: slowAt + i / 2, beats: 0.5, level })),
  ].map((note) => ({ ...note, voice: 'bells' as const }));
}

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

export function raceMusic({ times, course }: Plan): Score {
  const tune = TUNES[course] ?? WILLIAM_TELL;
  const racing = times.stretch - times.go;
  const bars = Math.max(1, Math.round((racing * GALOP) / 4));
  const galop = (bars * 4) / racing;
  const stretchAt = bars * 4;
  const stretch = 16 / (times.slow - times.stretch);
  const slowAt = stretchAt + 16;
  const slow = 2 / (times.finish - times.slow);

  // The strain, as many times as the race has bars, cut at the last one.
  const strain = melody(tune.strain, 0);
  const length = tune.chords.length;
  const galopNotes = Array.from({ length: Math.ceil(bars / length) }, (_, i) =>
    strain.map((note) => ({ ...note, at: note.at + i * length * 4 })),
  )
    .flat()
    .filter((note) => note.at < stretchAt);
  const chords = Array.from({ length: bars }, (_, bar) => tune.chords[bar % length]!);

  // A roll that swells, then the pickup into the first bar.
  const pickup = melody(tune.pickup, 0);
  const pickupAt = -Math.max(...pickup.map((note) => note.at + note.beats));
  const roll: Note[] = [];
  for (let at = -4.5; at < pickupAt; at += 0.25) {
    const swell = (at + 4.5) / (pickupAt + 4.5);
    roll.push({ at, beats: 0.25, voice: tune.roll, level: 0.15 + 0.6 * swell });
  }

  const notes: Note[] = [
    ...roll,
    ...pickup.map((note) => ({ ...note, at: note.at + pickupAt })),
    ...(tune.pickupBass ? melody(tune.pickupBass, pickupAt, 'bass') : []),
    ...galopNotes,
    ...oomPah(chords, 0),
    ...drums(bars, 0),
    ...melody(tune.stretch, stretchAt),
    ...oomPah(tune.stretchChords, stretchAt),
    // No kick in the stretch: the heartbeat has the low end.
    ...drums(4, stretchAt, { kick: false }),
    ...(tune.bells ? bells(bars + 4, 0) : []),
    ...melody(tune.slow, slowAt),
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
