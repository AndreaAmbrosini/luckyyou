// A show's sounds, made with Web Audio from noise and tones, so there are no
// audio files and no licences to track. Every show must also read with the
// sound off (DESIGN.md).

/** The sounds a show can ask for. */
export type Cue =
  | 'splash'
  | 'rotor'
  | 'whoosh'
  | 'heartbeat'
  | 'fanfare'
  | 'sizzle'
  | 'pop'
  | 'thunk'
  | 'creak'
  | 'tumble'
  | 'sniff'
  | 'grumble'
  | 'bark'
  | 'latch';

export interface SoundPlayer {
  /**
   * Plays `cue` unless the app is muted, and returns what stops it early.
   * The rotor and the sizzle loop until they are stopped or the show ends.
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

  sizzle(context) {
    const fat = noise(context, 1, { loop: true });
    const level = context.createGain();
    level.gain.setValueAtTime(0.06, context.currentTime);
    fat
      .connect(filter(context, 'highpass', 3000))
      .connect(level)
      .connect(context.destination);
    // A slow crackle: the level wobbles about 7 times a second.
    const crackle = tone(context, 'square', 7);
    const depth = context.createGain();
    depth.gain.setValueAtTime(0.04, context.currentTime);
    crackle.connect(depth).connect(level.gain);
    return start(context, [fat, crackle]);
  },

  pop(context) {
    const burst = noise(context, 0.12);
    burst
      .connect(filter(context, 'highpass', 800))
      .connect(envelope(context, 0.5, 0.002, 0.06))
      .connect(context.destination);
    const thump = tone(context, 'sine', 140);
    thump.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.12);
    thump.connect(envelope(context, 0.5, 0.003, 0.12)).connect(context.destination);
    return start(context, [burst, thump], 0.15);
  },

  thunk(context) {
    return knock(context, 0, 120, 0.6);
  },

  creak(context) {
    // A slow, rasping squeal that climbs, from noise, so it is no pulse.
    const rasp = noise(context, 0.6);
    const squeal = filter(context, 'bandpass', 380);
    squeal.Q.setValueAtTime(12, context.currentTime);
    squeal.frequency.exponentialRampToValueAtTime(900, context.currentTime + 0.55);
    // So narrow a band keeps little of the noise: boosted, it peaks with the rest.
    const boost = context.createGain();
    boost.gain.setValueAtTime(14, context.currentTime);
    rasp
      .connect(squeal)
      .connect(boost)
      .connect(envelope(context, 0.5, 0.2, 0.4))
      .connect(context.destination);
    return start(context, [rasp], 0.6);
  },

  tumble(context) {
    // Blocks landing one after another, each lower than the last, then a rumble.
    const knocks = [0, 0.13, 0.29, 0.5].flatMap((delay, index) =>
      knock(context, delay, 130 - index * 20, 0.5 - index * 0.08),
    );
    const rumble = noise(context, 1);
    rumble
      .connect(filter(context, 'lowpass', 300))
      .connect(envelope(context, 0.35, 0.3, 0.6, 0.3))
      .connect(context.destination);
    return [...knocks, ...start(context, [rumble], 1)];
  },

  sniff(context) {
    // Three quick breaths in through the nose, each a hiss that rises.
    return [0, 0.16, 0.32].flatMap((delay) => {
      const breath = noise(context, 0.14);
      const nose = filter(context, 'bandpass', 1800);
      nose.frequency.setValueAtTime(1800, context.currentTime + delay);
      nose.frequency.exponentialRampToValueAtTime(3200, context.currentTime + delay + 0.12);
      breath
        .connect(nose)
        .connect(envelope(context, 0.45, 0.08, 0.05, delay))
        .connect(context.destination);
      return start(context, [breath], 0.14, delay);
    });
  },

  grumble(context) {
    // A low, sleepy mumble that sags as it fades.
    const throat = tone(context, 'sawtooth', 120);
    throat.frequency.exponentialRampToValueAtTime(80, context.currentTime + 0.5);
    throat
      .connect(filter(context, 'lowpass', 500))
      .connect(envelope(context, 0.35, 0.08, 0.45))
      .connect(context.destination);
    return start(context, [throat], 0.55);
  },

  bark(context) {
    // One bark: a rough yelp that jumps up and drops, over a puff of breath.
    const now = context.currentTime;
    const voice = tone(context, 'sawtooth', 300);
    voice.frequency.exponentialRampToValueAtTime(520, now + 0.04);
    voice.frequency.exponentialRampToValueAtTime(220, now + 0.22);
    voice
      .connect(filter(context, 'lowpass', 1600))
      .connect(envelope(context, 0.6, 0.015, 0.22))
      .connect(context.destination);
    const breath = noise(context, 0.2);
    breath
      .connect(filter(context, 'bandpass', 900))
      .connect(envelope(context, 0.4, 0.01, 0.15))
      .connect(context.destination);
    return start(context, [voice, breath], 0.25);
  },

  latch(context) {
    // The gate meets its post, then the latch drops: two clicks.
    return [...click(context, 0, 1400, 0.45), ...click(context, 0.07, 2200, 0.3)];
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

/** A foam block landing: a low sine knock under a soft tap of noise. */
function knock(context: AudioContext, delay: number, pitch: number, level: number) {
  const body = tone(context, 'sine', pitch);
  body.frequency.setValueAtTime(pitch, context.currentTime + delay);
  body.frequency.exponentialRampToValueAtTime(pitch * 0.5, context.currentTime + delay + 0.12);
  body.connect(envelope(context, level, 0.004, 0.12, delay)).connect(context.destination);
  const tap = noise(context, 0.05);
  tap
    .connect(filter(context, 'lowpass', 600))
    .connect(envelope(context, level * 0.4, 0.002, 0.04, delay))
    .connect(context.destination);
  return start(context, [body, tap], 0.15, delay);
}

/** A short click: a high tick over a snap of noise. */
function click(context: AudioContext, delay: number, pitch: number, level: number) {
  const tick = tone(context, 'square', pitch);
  tick.connect(envelope(context, level * 0.3, 0.001, 0.03, delay)).connect(context.destination);
  const snap = noise(context, 0.04);
  snap
    .connect(filter(context, 'highpass', 1500))
    .connect(envelope(context, level, 0.001, 0.03, delay))
    .connect(context.destination);
  return start(context, [tick, snap], 0.04, delay);
}

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
