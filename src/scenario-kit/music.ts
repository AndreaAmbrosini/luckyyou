// A show's music, as notes on a beat grid played with Web Audio (decision
// 0014). The show moves the song along from its own time each frame, so a
// show that slows down slows its music with it.

export type Voice = 'lead' | 'bass' | 'stab' | 'kick' | 'snare' | 'hat' | 'bells';

export interface Note {
  /** Where it starts, in beats from the song's first bar; negative before it. */
  readonly at: number;
  readonly beats: number;
  readonly voice: Voice;
  /** A MIDI note number; drums have none. */
  readonly pitch?: number;
  /** 0 to 1; 1 unless given. */
  readonly level?: number;
}

export interface Music {
  /** The song is at `beat`, moving `speed` beats a second: play what comes next. */
  to(beat: number, speed: number): void;
}

/** A note to start `delay` seconds from now, lasting `seconds`. */
export interface Due {
  readonly note: Note;
  readonly delay: number;
  readonly seconds: number;
}

/** How far ahead notes are handed to the audio clock, in seconds. */
const LOOKAHEAD = 0.1;
/** A note the show is further past than this, in seconds, is skipped. */
const LATE = 0.05;

/**
 * Which of `notes` are due as the song reaches each beat. Every note is due
 * once at most, and one the show has gone past is never due.
 */
export function follow(notes: readonly Note[]): { to(beat: number, speed: number): Due[] } {
  const song = [...notes].sort((a, b) => a.at - b.at);
  let next = 0;
  return {
    to(beat, speed) {
      if (!(speed > 0)) return [];
      const due: Due[] = [];
      const ahead = beat + speed * LOOKAHEAD;
      while (next < song.length && song[next]!.at <= ahead) {
        const note = song[next++]!;
        if (note.at < beat - speed * LATE) continue;
        due.push({
          note,
          delay: Math.max(0, (note.at - beat) / speed),
          seconds: note.beats / speed,
        });
      }
      return due;
    },
  };
}

const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "G4" or "F#5" as a MIDI note number. */
export function pitchOf(name: string): number {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!match) throw new Error(`Not a note: ${name}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (Number(octave) + 1) + STEPS[letter!]! + shift;
}

/**
 * Notes from text: "G4" lasts a beat, "G4:.5" half a beat, "r" rests and
 * "|" is a bar line, there only to read by.
 */
export function melody(text: string, from: number, voice: Voice = 'lead'): Note[] {
  const notes: Note[] = [];
  let at = from;
  for (const token of text.split(/\s+/)) {
    if (token === '' || token === '|') continue;
    const [name, length] = token.split(':');
    const beats = length ? Number(length) : 1;
    if (name !== 'r') notes.push({ at, beats, voice, pitch: pitchOf(name!) });
    at += beats;
  }
  return notes;
}

/** Each chord's bass root, bass fifth, and the notes of its stab. */
const CHORDS: Record<string, { root: string; fifth: string; stab: string[] }> = {
  C: { root: 'C3', fifth: 'G2', stab: ['C4', 'E4', 'G4'] },
  G7: { root: 'G2', fifth: 'D3', stab: ['B3', 'D4', 'F4'] },
  Am: { root: 'A2', fifth: 'E3', stab: ['A3', 'C4', 'E4'] },
  F: { root: 'F2', fifth: 'C3', stab: ['A3', 'C4', 'F4'] },
  D7: { root: 'D3', fifth: 'A2', stab: ['C4', 'D4', 'F#4'] },
};

/** A galop's oom-pah, one chord a bar of four beats: bass, stab, bass, stab. */
export function oomPah(chords: readonly string[], from: number): Note[] {
  return chords.flatMap((name, bar) => {
    const chord = CHORDS[name];
    if (!chord) throw new Error(`No chord ${name}`);
    const at = from + bar * 4;
    const stab = (beat: number) =>
      chord.stab.map((note) => ({
        at: at + beat,
        beats: 0.5,
        voice: 'stab' as const,
        pitch: pitchOf(note),
      }));
    return [
      { at, beats: 1, voice: 'bass' as const, pitch: pitchOf(chord.root) },
      ...stab(1),
      { at: at + 2, beats: 1, voice: 'bass' as const, pitch: pitchOf(chord.fifth) },
      ...stab(3),
    ];
  });
}

/** Drums for `bars` bars: kicks on 1 and 3 unless left out, snares on 2 and 4, hats between. */
export function drums(bars: number, from: number, { kick = true } = {}): Note[] {
  const notes: Note[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const at = from + bar * 4;
    for (const beat of [0, 2]) if (kick) notes.push({ at: at + beat, beats: 0.5, voice: 'kick' });
    for (const beat of [1, 3]) notes.push({ at: at + beat, beats: 0.5, voice: 'snare' });
    for (const beat of [0.5, 1.5, 2.5, 3.5])
      notes.push({ at: at + beat, beats: 0.25, voice: 'hat' });
  }
  return notes;
}

/**
 * The music bus's gain at full volume. At 70%, the volume music starts at,
 * it is 0.5, which keeps the music under the show's other sounds.
 */
export const FULL_LEVEL = 0.5 / 0.7;

/** A bus all of a song's notes go through, at `volume` (0 to 1) of full level. */
export function musicBus(context: BaseAudioContext, volume: number): GainNode {
  const bus = context.createGain();
  bus.gain.setValueAtTime(volume * FULL_LEVEL, context.currentTime);
  bus.connect(context.destination);
  return bus;
}

/** Two bars of oom-pah and a short tune of the kit's own, to hear a volume by. */
export const SAMPLE: readonly Note[] = [
  ...melody('G4:.5 C5:.5 E5 G5 E5 | F5:.5 D5:.5 B4 G4 r | C5', 0),
  ...oomPah(['C', 'G7'], 0),
  ...drums(2, 0),
  { at: 8, beats: 1, voice: 'bass', pitch: pitchOf('C3') },
];
const SAMPLE_SPEED = 4.4;

/**
 * Plays the sample at a volume. Asked again while it plays, it changes the
 * volume and plays on; asked after it has ended, it plays it again.
 */
export function createSample(): { play(volume: number): void; stop(): void } {
  let context: AudioContext | null = null;
  let bus: GainNode | null = null;
  let endsAt = 0;
  const stop = () => {
    void context?.close();
    context = null;
    bus = null;
  };
  return {
    play(volume) {
      if (typeof AudioContext === 'undefined') return;
      try {
        if (context && bus && context.currentTime < endsAt) {
          bus.gain.setValueAtTime(volume * FULL_LEVEL, context.currentTime);
          return;
        }
        stop();
        context = new AudioContext();
        // Safari can hand one back suspended, and it plays nothing until resumed.
        if (context.state === 'suspended') context.resume().catch(() => undefined);
        bus = musicBus(context, volume);
        const start = context.currentTime;
        for (const note of SAMPLE) {
          const seconds = note.beats / SAMPLE_SPEED;
          playNote(context, bus, note, start + note.at / SAMPLE_SPEED, seconds);
        }
        endsAt = start + Math.max(...SAMPLE.map((note) => note.at + note.beats)) / SAMPLE_SPEED;
      } catch {
        // A sample that can't play leaves the volume set all the same.
      }
    },
    stop,
  };
}

/** Starts `note` at `when`, lasting `seconds`, and returns its sources. */
export function playNote(
  context: BaseAudioContext,
  out: AudioNode,
  note: Note,
  when: number,
  seconds: number,
): AudioScheduledSourceNode[] {
  const level = note.level ?? 1;
  const hz = note.pitch === undefined ? 0 : 440 * 2 ** ((note.pitch - 69) / 12);
  switch (note.voice) {
    case 'lead': {
      // Two square waves a hair apart, short and punchy, so repeats stay apart.
      const gate = Math.max(0.05, seconds * 0.7);
      const shape = gain(context, when, 0.09 * level, 0.005, gate, 0.05);
      shape.connect(out);
      const tone = lowpass(context, 2800);
      tone.connect(shape);
      return [0, 7].map((cents) => {
        const wave = oscillator(context, 'square', hz);
        wave.detune.setValueAtTime(cents, context.currentTime);
        wave.connect(tone);
        return timed(wave, when, gate + 0.06);
      });
    }
    case 'bass': {
      const gate = Math.max(0.08, seconds * 0.85);
      const shape = gain(context, when, 0.3 * level, 0.005, gate, 0.05);
      shape.connect(out);
      const body = oscillator(context, 'triangle', hz);
      body.connect(shape);
      // An octave up, quieter, so laptop speakers still carry the bass line.
      const edge = gain(context, when, 0.3, 0, gate, 0.05);
      edge.connect(lowpass(context, 1200)).connect(shape);
      const octave = oscillator(context, 'square', hz * 2);
      octave.connect(edge);
      return [timed(body, when, gate + 0.06), timed(octave, when, gate + 0.06)];
    }
    case 'stab': {
      const gate = Math.min(seconds * 0.5, 0.1);
      const shape = gain(context, when, 0.035 * level, 0.003, gate, 0.04);
      shape.connect(out);
      const wave = oscillator(context, 'square', hz);
      wave.connect(lowpass(context, 1800)).connect(shape);
      return [timed(wave, when, gate + 0.05)];
    }
    case 'kick': {
      const thump = oscillator(context, 'sine', 150);
      thump.frequency.setValueAtTime(150, when);
      thump.frequency.exponentialRampToValueAtTime(45, when + 0.12);
      thump.connect(gain(context, when, 0.35 * level, 0.003, 0.02, 0.12)).connect(out);
      return [timed(thump, when, 0.16)];
    }
    case 'snare': {
      const hiss = noise(context);
      const band = context.createBiquadFilter();
      band.type = 'highpass';
      band.frequency.setValueAtTime(1500, context.currentTime);
      hiss
        .connect(band)
        .connect(gain(context, when, 0.18 * level, 0.002, 0.01, 0.1))
        .connect(out);
      return [timed(hiss, when, 0.13)];
    }
    case 'hat': {
      const hiss = noise(context);
      const band = context.createBiquadFilter();
      band.type = 'highpass';
      band.frequency.setValueAtTime(7000, context.currentTime);
      hiss
        .connect(band)
        .connect(gain(context, when, 0.05 * level, 0.001, 0.005, 0.03))
        .connect(out);
      return [timed(hiss, when, 0.05)];
    }
    case 'bells': {
      // Sleigh bells: a bright shake of noise, with a ring that dies away.
      const hiss = noise(context);
      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(8000, context.currentTime);
      band.Q.setValueAtTime(1.5, context.currentTime);
      hiss
        .connect(band)
        .connect(gain(context, when, 0.12 * level, 0.004, 0.02, 0.14))
        .connect(out);
      return [timed(hiss, when, 0.17)];
    }
  }
}

/** Rises to `peak` in `attack`, holds until `hold` from `when`, then fades over `release`. */
function gain(
  context: BaseAudioContext,
  when: number,
  peak: number,
  attack: number,
  hold: number,
  release: number,
) {
  const node = context.createGain();
  node.gain.setValueAtTime(0, when);
  node.gain.linearRampToValueAtTime(peak, when + attack);
  node.gain.setValueAtTime(peak, when + Math.max(attack, hold));
  node.gain.linearRampToValueAtTime(0, when + Math.max(attack, hold) + release);
  return node;
}

function oscillator(context: BaseAudioContext, type: OscillatorType, hz: number) {
  const node = context.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(hz, context.currentTime);
  return node;
}

function lowpass(context: BaseAudioContext, hz: number) {
  const node = context.createBiquadFilter();
  node.type = 'lowpass';
  node.frequency.setValueAtTime(hz, context.currentTime);
  return node;
}

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(context: BaseAudioContext) {
  let buffer = noises.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.2), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    noises.set(context, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function timed<T extends AudioScheduledSourceNode>(source: T, when: number, seconds: number): T {
  source.start(when);
  source.stop(when + seconds);
  return source;
}
