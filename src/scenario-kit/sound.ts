// A show's sounds, made with Web Audio from noise and tones, so there are no
// audio files and no licences to track. Every show must also read with the
// sound off (DESIGN.md).

/** The sounds a show can ask for. */
export type Cue = 'splash' | 'rotor' | 'whoosh' | 'heartbeat' | 'fanfare';

export interface SoundPlayer {
  /**
   * Plays `cue` unless the app is muted, and returns what stops it early.
   * The rotor loops until it is stopped or the show ends.
   */
  play(cue: Cue): () => void;
  /** Stops every sound still playing. */
  stopAll(): void;
}

/**
 * A show's sound. While muted it never opens an audio output; otherwise it
 * opens one on the first cue and closes it when the show is over.
 */
export function createSound({ muted }: { muted: boolean }): { player: SoundPlayer; stop(): void } {
  let context: AudioContext | null = null;
  const playing = new Set<AudioScheduledSourceNode>();
  const end = (source: AudioScheduledSourceNode) => {
    playing.delete(source);
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  };

  const player: SoundPlayer = {
    play(cue) {
      if (muted || typeof AudioContext === 'undefined') return () => undefined;
      try {
        context ??= new AudioContext();
        // Safari can hand one back suspended, and it plays nothing until resumed.
        if (context.state === 'suspended') context.resume().catch(() => undefined);
        const sources = CUES[cue](context);
        for (const source of sources) {
          playing.add(source);
          source.onended = () => playing.delete(source);
        }
        return () => sources.forEach(end);
      } catch {
        // A sound that can't play never stops the show.
        return () => undefined;
      }
    },
    stopAll() {
      playing.forEach(end);
    },
  };

  return {
    player,
    stop() {
      player.stopAll();
      void context?.close();
      context = null;
    },
  };
}

/** Each cue starts its sources on `context` and returns them. */
const CUES: Record<Cue, (context: AudioContext) => AudioScheduledSourceNode[]> = {
  splash(context) {
    const water = noise(context, 0.6);
    water
      .connect(filter(context, 'lowpass', 1200))
      .connect(envelope(context, 0.5, 0.01, 0.5))
      .connect(context.destination);
    const plop = tone(context, 'sine', 320);
    plop.frequency.exponentialRampToValueAtTime(90, context.currentTime + 0.2);
    plop.connect(envelope(context, 0.3, 0.01, 0.2)).connect(context.destination);
    return start(context, [water, plop], 0.6);
  },

  rotor(context) {
    const blades = noise(context, 1, { loop: true });
    const level = context.createGain();
    level.gain.setValueAtTime(0.12, context.currentTime);
    blades
      .connect(filter(context, 'lowpass', 500))
      .connect(level)
      .connect(context.destination);
    // The blades chop the noise about 14 times a second.
    const chop = tone(context, 'square', 14);
    const depth = context.createGain();
    depth.gain.setValueAtTime(0.1, context.currentTime);
    chop.connect(depth).connect(level.gain);
    return start(context, [blades, chop]);
  },

  whoosh(context) {
    const air = noise(context, 0.7);
    const sweep = filter(context, 'bandpass', 300);
    const now = context.currentTime;
    sweep.frequency.exponentialRampToValueAtTime(2500, now + 0.3);
    sweep.frequency.exponentialRampToValueAtTime(400, now + 0.7);
    air
      .connect(sweep)
      .connect(envelope(context, 0.35, 0.25, 0.45))
      .connect(context.destination);
    return start(context, [air], 0.7);
  },

  heartbeat(context) {
    // Lub, then dub.
    return [0, 0.22].flatMap((delay) => {
      const thump = tone(context, 'sine', 58);
      thump.connect(envelope(context, 0.6, 0.01, 0.16, delay)).connect(context.destination);
      return start(context, [thump], 0.2, delay);
    });
  },

  fanfare(context) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    return notes.flatMap((pitch, index) => {
      const delay = index * 0.12;
      const held = index === notes.length - 1 ? 0.5 : 0.12;
      const note = tone(context, 'triangle', pitch);
      note.connect(envelope(context, 0.25, 0.02, held, delay)).connect(context.destination);
      return start(context, [note], held + 0.05, delay);
    });
  },
};

function noise(context: AudioContext, seconds: number, { loop = false } = {}) {
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * seconds),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  return source;
}

function tone(context: AudioContext, type: OscillatorType, pitch: number) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(pitch, context.currentTime);
  return oscillator;
}

function filter(context: AudioContext, type: BiquadFilterType, pitch: number) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.setValueAtTime(pitch, context.currentTime);
  return node;
}

/** Rises to `peak` in `attack` seconds, then fades out over `decay`. */
function envelope(context: AudioContext, peak: number, attack: number, decay: number, delay = 0) {
  const gain = context.createGain();
  const at = context.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return gain;
}

/** Starts `sources` after `delay`, and stops them `seconds` later unless they loop. */
function start(
  context: AudioContext,
  sources: AudioScheduledSourceNode[],
  seconds?: number,
  delay = 0,
) {
  const at = context.currentTime + delay;
  for (const source of sources) {
    source.start(at);
    if (seconds !== undefined) source.stop(at + seconds);
  }
  return sources;
}
