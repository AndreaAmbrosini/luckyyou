// Musical Stools' music: a Viennese waltz in D, composed by ear for this show
// in the manner of the Strauss family's waltzes, not taken from a score. A
// beat is a quarter note, three to a 3/4 bar, over a bass on one and chords
// on two and three. It speeds up a little each round. When the gramophone
// stutters or the music stops it stays silent for a beat on starting again,
// and from the spotlight on it loses its bass and kick.

import { melody, type Note } from '../../scenario-kit';
import { pitchOf } from '../../scenario-kit/music';
import type { Plan } from './plan';

/** The song's beat as the first window starts: a bar's beat before its first note. */
const BEAT0 = -1;
/** Seconds the gramophone takes to wind up to speed. */
const WIND_UP = 0.2;
/** Table resolution, seconds. */
const STEP = 0.005;

/** Sixteen bars: two strains of eight, ending where they began. */
const TUNE = [
  'A4 D5 F#5 | A5:2 F#5 | G5 E5 C#5 | E5:3',
  'D5 F#5 A5 | B5:2 G5 | F#5 E5 C#5 | D5:3',
  'B4 D5 F#5 | B5:2 A5 | G5 E5 C#5 | E5 G5 E5',
  'F#5 A5 D6 | D6:2 A5 | G5 F#5 E5 | D5:2 r',
].join(' | ');

const CHORDS = {
  D: { root: 'D3', stab: ['D4', 'F#4', 'A4'] },
  G: { root: 'G2', stab: ['B3', 'D4', 'G4'] },
  A7: { root: 'A2', stab: ['G3', 'C#4', 'E4'] },
  Bm: { root: 'B2', stab: ['B3', 'D4', 'F#4'] },
} as const;

const BARS = [
  ...['D', 'D', 'A7', 'A7', 'D', 'G', 'A7', 'D'],
  ...['Bm', 'Bm', 'A7', 'A7', 'D', 'D', 'A7', 'D'],
] as const;

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
}

const smooth = (x: number) => x * x * (3 - 2 * x);

function waltz(bars: number): Note[] {
  const notes: Note[] = [];
  const strains = Math.ceil(bars / BARS.length);
  for (let s = 0; s < strains; s++) notes.push(...melody(TUNE, s * BARS.length * 3));
  for (let bar = 0; bar < bars; bar++) {
    const chord = CHORDS[BARS[bar % BARS.length]!];
    const at = bar * 3;
    notes.push(
      { at, beats: 1, voice: 'bass', pitch: pitchOf(chord.root) },
      { at, beats: 0.5, voice: 'kick', level: 0.7 },
    );
    for (const beat of [1, 2]) {
      for (const stab of chord.stab) {
        notes.push({ at: at + beat, beats: 0.5, voice: 'stab', pitch: pitchOf(stab), level: 0.6 });
      }
    }
    for (const beat of [0.5, 1.5, 2.5]) notes.push({ at: at + beat, beats: 0.25, voice: 'hat' });
  }
  return notes;
}

export function waltzMusic(plan: Plan): Score {
  const length = plan.end + 1;
  const count = Math.ceil(length / STEP) + 1;
  const beats = new Float64Array(count);
  const speeds = new Float64Array(count);
  const windows = plan.rounds.flatMap((round) => round.windows);
  let window = 0;
  beats[0] = BEAT0;
  for (let i = 0; i < count; i++) {
    const t = i * STEP;
    while (window < windows.length && windows[window]!.to <= t) window++;
    const current = windows[window];
    const speed =
      current && current.from <= t
        ? current.speed * smooth(Math.min(1, (t - current.from) / WIND_UP))
        : 0;
    speeds[i] = speed;
    if (i > 0) beats[i] = beats[i - 1]! + (speeds[i - 1]! + speed) * 0.5 * STEP;
  }
  const at = (t: number) => {
    const x = Math.min(count - 1, Math.max(0, t / STEP));
    const i = Math.min(count - 2, Math.floor(x));
    const f = x - i;
    return {
      beat: beats[i]! + (beats[i + 1]! - beats[i]!) * f,
      speed: speeds[i]! + (speeds[i + 1]! - speeds[i]!) * f,
    };
  };

  // Where each stop and stutter falls in the song, and when the bass goes.
  const stops = [
    ...plan.rounds.flatMap((round) => [...round.stutters.map((s) => s.at), round.stop]),
  ].map((time) => at(time).beat);
  const last = at(plan.rounds.at(-1)!.stop).beat;
  const thin = at(plan.spotlight).beat;
  const bars = Math.ceil((last - BEAT0) / 3) + 2;

  const notes = waltz(bars)
    .filter((note) => note.at < last - 1e-9)
    .filter((note) => !stops.some((stop) => note.at >= stop - 1e-9 && note.at < stop + 1))
    .filter((note) => (note.voice !== 'bass' && note.voice !== 'kick') || note.at < thin - 1e-9)
    .map((note) => ({ ...note, beats: Math.min(note.beats, last - note.at) }));

  return {
    notes,
    at(t) {
      return t < windows[0]!.from ? { beat: BEAT0, speed: 0 } : at(t);
    },
  };
}
