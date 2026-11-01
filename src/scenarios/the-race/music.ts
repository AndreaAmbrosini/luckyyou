// The Race's music, the galop from Rossini's William Tell Overture
// (public domain), arranged from the Nottingham Music Database's version in
// C. A drum roll under "On your marks…", the galop from "Go!", fitted to whole
// bars so the final stretch starts on one; its minor strain, faster, in the
// final stretch; a run down, an octave low, through the slow last moment; and
// silence from the line until the fanfare. At Christmas, Jingle Bells (James
// Lord Pierpont, 1857, public domain) takes the galop's place, on its beats,
// with sleigh bells. On Autumn, the opening of Autumn from Vivaldi's The Four
// Seasons (1725, public domain) does, arranged from the Mutopia Project's
// edition, down a fourth from F to C. In the office, Scott Joplin's The
// Entertainer (1902, public domain) does, arranged from the Mutopia Project's
// edition of his score, a 2/4 bar to each bar of four beats. Under the sea,
// Mango Walk (traditional Jamaican, public domain) does, on steel drums over a
// calypso's off-beat bass and a shaker, arranged from the tune in the BBC's
// Singing Together (Spring 1970), up a fourth from G to C.

import { calypso, drums, melody, oomPah, type Note, type Voice } from '../../scenario-kit';
import type { Course, Plan } from './plan';

/** The galop's beats a second, before it is fitted to whole bars. */
const GALOP = 4.4;

/** A tune for the race, in C so the fanfare resolves its slow moment. */
interface Tune {
  /** What plays the tune: the lead, unless given. */
  readonly voice?: Voice;
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
  /** The bass and chords under the tune, one chord a bar: an oom-pah, unless given. */
  readonly backing?: (chords: readonly string[], from: number) => Note[];
  /** The drums for `bars` bars: the galop's, unless given. */
  readonly beat?: (bars: number, from: number, options?: { kick?: boolean }) => Note[];
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

const AUTUMN: Tune = {
  roll: 'snare',
  pickup: 'C5:.5 D5:.5',
  // The opening ritornello, thirteen bars, down a fourth from F: the dance,
  // its echo an octave lower, the climb, and the echo of its close.
  strain: [
    'E5:.5 E5:.5 E5:.5 F5:.5 E5 E5:.5 F5:.5 | E5:.5 E5:.5 E5:.5 E5:.5 F5 E5:.5 F5:.5',
    'E5:.5 D5:.25 E5:.25 F5:.5 E5:.5 D5 r',
    'E4:.5 E4:.5 E4:.5 F4:.5 E4 E4:.5 F4:.5 | E4:.5 E4:.5 E4:.5 F4:.5 E4 E4:.5 F4:.5',
    'E4:.5 D4:.25 E4:.25 F4:.5 E4:.5 D4 r',
    'E5:.5 E5:.5 E5:.5 G5:.5 A4 A4:.5 A4:.5 | D5:.5 D5:.5 D5:.5 F5:.5 G4 G4:.5 C5:.5',
    'E5:.5 E5:.5 E5:.5 F5:.5 E5:.5 E5:.5 E5:.5 F5:.5',
    'E5:.5 E5:.5 E5:.5 F5:.5 E5:.5 D5:.25 E5:.25 F5:.5 D5:.5',
    'E5 r E4:.5 E4:.5 E4:.5 F4:.5 | E4:.5 E4:.5 E4:.5 F4:.5 E4:.5 E4:.5 E4:.5 F4:.5',
    'E4:.5 D4:.25 E4:.25 F4:.5 D4:.5 C4 r',
  ].join(' | '),
  chords: ['C', 'C', 'C', 'C', 'C', 'C', 'Am', 'G7', 'C', 'C', 'C', 'C', 'C'],
  // The theme in the minor, as the ritornello comes back in G minor, here in
  // A minor: half close, then full close.
  stretch: [
    'E5:.5 E5:.5 E5:.5 F5:.5 E5 E5:.5 F5:.5 | E5:.5 E5:.5 E5:.5 F5:.5 D5:.5 D5:.5 D5:.5 E5:.5',
    'C5:.5 B4:.25 C5:.25 D5:.5 C5:.5 B4 r | C5:.5 B4:.25 C5:.25 D5:.5 B4:.5 A4 r',
  ].join(' | '),
  stretchChords: ['Am', 'Am', 'E7', 'Am'],
  // Down over the low G, its F falling into the fanfare's C chord.
  slow: 'B4:.5 A4:.5 G4:.5 F4:.5',
};

const ENTERTAINER: Tune = {
  roll: 'snare',
  pickup: 'D4:.5 D#4:.5',
  // The first strain, sixteen bars, the top of Joplin's octaves, ending on the
  // pickup into itself.
  strain: [
    'E4:.5 C5 E4:.5 C5 E4:.5 C5:3 C5:.5 D5:.5 D#5:.5',
    'E5:.5 C5:.5 D5:.5 E5 B4:.5 D5 | C5:3 D4:.5 D#4:.5',
    'E4:.5 C5 E4:.5 C5 E4:.5 C5:3.5 A4:.5 G4:.5',
    'F#4:.5 A4:.5 C5:.5 E5 D5:.5 C5:.5 A4:.5 | D5:3 D4:.5 D#4:.5',
    'E4:.5 C5 E4:.5 C5 E4:.5 C5:3 C5:.5 D5:.5 D#5:.5',
    'E5:.5 C5:.5 D5:.5 E5 B4:.5 D5 | C5:3 C5:.5 D5:.5',
    'E5:.5 C5:.5 D5:.5 E5 C5:.5 D5:.5 C5:.5 | E5:.5 C5:.5 D5:.5 E5 C5:.5 D5:.5 C5:.5',
    'E5:.5 C5:.5 D5:.5 E5 B4:.5 D5 | C5:3 D4:.5 D#4:.5',
  ].join(' | '),
  chords: ['C', 'F', 'G7', 'C', 'C', 'F', 'D7', 'G7', 'C', 'F', 'G7', 'C', 'C', 'F', 'G7', 'C'],
  // The second strain's bars 5 to 8, which open as it does and close on G.
  stretch: [
    'G5 A5:.5 G5 E5:.5 F5:.5 F#5:.5 | G5 A5:.5 G5 G5:.5 A5:.5 A#5:.5',
    'B5:.5 B5 B5 A5:.5 F#5:.5 D5:.5 | G5:2.5 E5:.5 F5:.5 F#5:.5',
  ].join(' | '),
  stretchChords: ['C', 'C', 'D7', 'G7'],
  // The close of Joplin's introduction, down to G.
  slow: 'B4:.5 A4:.5 Ab4:.5 G4:.5',
};

const MANGO_WALK: Tune = {
  voice: 'steel',
  roll: 'shaker',
  pickup: 'G5',
  // The song, sixteen bars: "My brother did-a tell me that you go mango walk"
  // twice, then "Now tell me, Joe", ending on the pickup into itself.
  strain: [
    'G5:.5 A5:.5 G5:.5 F5:.5 E5:.5 F5:.5 E5:.5 D5:.5 | C5:.5 E5 G4:.5 C5 E5',
    'D5:.5 F5 G4:.5 B4 D5 | C5:.5 E5 G4:.5 C5 G5',
    'G5:.5 A5:.5 G5:.5 F5:.5 E5:.5 F5:.5 E5:.5 D5:.5 | C5:.5 E5 G4:.5 C5 E5',
    'D5:.5 F5 G4:.5 B4 D5 | C5 C5 r G4',
    'G4 G4 A4 C5 | C5:.5 E5 G4:.5 C5 E5 | D5:.5 F5 G4:.5 B4 D5 | C5 E5:2 G4',
    'G4 G4 A4 B4 | C5:.5 E5 G4:.5 C5 E5 | D5:.5 F5 G4:.5 B4 D5 | C5 C5 r G5',
  ].join(' | '),
  chords: ['C', 'C', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C', 'C', 'G7', 'C', 'G7', 'C', 'G7', 'C'],
  // "Now tell me, Joe, do tell me for true".
  stretch: 'G4 G4 A4 C5 | C5:.5 E5 G4:.5 C5 E5 | D5:.5 F5 G4:.5 B4 D5 | C5 E5:2 r',
  stretchChords: ['C', 'C', 'G7', 'C'],
  // Down G7 to the low G.
  slow: 'F5:.5 D5:.5 B4:.5 G4:.5',
  backing: calypso,
  beat: shakers,
};

const TUNES: Partial<Record<Course, Tune>> = {
  christmas: JINGLE_BELLS,
  autumn: AUTUMN,
  office: ENTERTAINER,
  sea: MANGO_WALK,
};

/** A calypso's beat for `bars` bars: kicks on 1 and 3 unless left out, a shaker on every half beat, leaning on the off-beats. */
function shakers(bars: number, from: number, { kick = true } = {}): Note[] {
  const notes: Note[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const at = from + bar * 4;
    for (const beat of [0, 2]) if (kick) notes.push({ at: at + beat, beats: 0.5, voice: 'kick' });
    for (let half = 0; half < 8; half++)
      notes.push({ at: at + half / 2, beats: 0.5, voice: 'shaker', level: half % 2 ? 1 : 0.5 });
  }
  return notes;
}

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
  const { voice = 'lead', backing = oomPah, beat = drums } = tune;
  const racing = times.stretch - times.go;
  const bars = Math.max(1, Math.round((racing * GALOP) / 4));
  const galop = (bars * 4) / racing;
  const stretchAt = bars * 4;
  const stretch = 16 / (times.slow - times.stretch);
  const slowAt = stretchAt + 16;
  const slow = 2 / (times.finish - times.slow);

  // The strain, as many times as the race has bars, cut at the last one.
  const strain = melody(tune.strain, 0, voice);
  const length = tune.chords.length;
  const galopNotes = Array.from({ length: Math.ceil(bars / length) }, (_, i) =>
    strain.map((note) => ({ ...note, at: note.at + i * length * 4 })),
  )
    .flat()
    .filter((note) => note.at < stretchAt);
  const chords = Array.from({ length: bars }, (_, bar) => tune.chords[bar % length]!);

  // A roll that swells, then the pickup into the first bar.
  const pickup = melody(tune.pickup, 0, voice);
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
    ...backing(chords, 0),
    ...beat(bars, 0),
    ...melody(tune.stretch, stretchAt, voice),
    ...backing(tune.stretchChords, stretchAt),
    // No kick in the stretch: the heartbeat has the low end.
    ...beat(4, stretchAt, { kick: false }),
    ...(tune.bells ? bells(bars + 4, 0) : []),
    ...melody(tune.slow, slowAt, voice),
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
