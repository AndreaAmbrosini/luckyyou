// The result's sound gag: a brass ta-da that deflates into a sad trombone,
// made with Web Audio from tones like the shows' sounds (decision 0022).

/** "Ta", a short dominant chord, then "da", the chord home: G3 D4 G4 B4, C4 G4 C5 E5. */
const TA = [196, 293.66, 392, 493.88];
const DA = [261.63, 392, 523.25, 659.25];
const DA_HELD = 0.5;
/** Wah, wah, wah, waaah: B♭3, A3, A♭3, G3, a semitone down each time. */
const WAH = [233.08, 220, 207.65, 196];
/** How far apart the wahs start, in seconds; the last is held. */
const WAH_STEP = 0.3;
const WAH_HELD = 1.4;
/** Everything goes out at this level, so the loudest chord stays clear of clipping. */
const LEVEL = 0.8;

/** When the trombone's last, long note starts, in seconds after the first. */
export const LAST_WAH = WAH_STEP * (WAH.length - 1);

/**
 * Plays the gag unless `muted`: the ta-da's chord lands `landsAt` seconds
 * from now, and the trombone starts `deflatesAt`. Returns what stops it,
 * which also closes its audio output. While muted it opens none.
 */
export function playTaDa({
  muted,
  landsAt,
  deflatesAt,
}: {
  muted: boolean;
  landsAt: number;
  deflatesAt: number;
}): () => void {
  if (muted || typeof AudioContext === 'undefined') return () => undefined;
  let context: AudioContext | null = null;
  try {
    context = new AudioContext();
    // Safari can hand one back suspended, and it plays nothing until resumed.
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    const out = context.createGain();
    out.gain.setValueAtTime(LEVEL, context.currentTime);
    out.connect(context.destination);
    // The "ta" comes a beat before the landing, so it can't start in the past;
    // the trombone waits for the "da" to be held.
    const lands = context.currentTime + Math.max(landsAt, 0.3);
    const deflates = Math.max(context.currentTime + deflatesAt, lands + DA_HELD);
    for (const pitch of TA) brass(context, out, pitch, lands - 0.16, 0.1);
    for (const pitch of DA) brass(context, out, pitch, lands, DA_HELD);
    WAH.forEach((pitch, index) => {
      const last = index === WAH.length - 1;
      trombone(context!, out, pitch, deflates + index * WAH_STEP, last ? WAH_HELD : 0.24, last);
    });
  } catch {
    // A gag that can't play never stops the result.
  }
  return () => {
    void context?.close();
    context = null;
  };
}

/** One brass note: two sawtooths a hair apart, through a filter that opens with a bite. */
function brass(context: AudioContext, out: AudioNode, hz: number, when: number, held: number) {
  const tone = context.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(600, when);
  tone.frequency.exponentialRampToValueAtTime(3000, when + 0.04);
  tone.frequency.exponentialRampToValueAtTime(1600, when + held);
  tone.connect(shape(context, out, when, 0.08, 0.015, held, 0.12));
  for (const cents of [-6, 6]) {
    const wave = context.createOscillator();
    wave.type = 'sawtooth';
    wave.frequency.setValueAtTime(hz, when);
    wave.detune.setValueAtTime(cents, when);
    wave.connect(tone);
    wave.start(when);
    wave.stop(when + held + 0.15);
  }
}

/**
 * One trombone wah: it slides up into the note as a plunger mute opens and
 * closes. The last one is held, wobbles more and more, and sags as it fades.
 */
function trombone(
  context: AudioContext,
  out: AudioNode,
  hz: number,
  when: number,
  held: number,
  last: boolean,
) {
  const end = when + held;
  const mute = context.createBiquadFilter();
  mute.type = 'lowpass';
  mute.Q.setValueAtTime(4, when);
  mute.frequency.setValueAtTime(300, when);
  mute.frequency.exponentialRampToValueAtTime(1300, when + Math.min(0.12, held * 0.4));
  mute.frequency.exponentialRampToValueAtTime(last ? 900 : 450, when + held * 0.7);
  mute.frequency.exponentialRampToValueAtTime(250, end);
  mute.connect(shape(context, out, when, 0.2, 0.04, held, 0.1));

  const waves = [0, 5].map((cents) => {
    const wave = context.createOscillator();
    wave.type = 'sawtooth';
    wave.frequency.setValueAtTime(hz * 0.97, when);
    wave.frequency.exponentialRampToValueAtTime(hz, when + 0.06);
    if (last) {
      wave.frequency.setValueAtTime(hz, when + held * 0.55);
      wave.frequency.exponentialRampToValueAtTime(hz * 0.92, end);
    }
    wave.detune.setValueAtTime(cents, when);
    wave.connect(mute);
    wave.start(when);
    wave.stop(end + 0.12);
    return wave;
  });

  if (last) {
    // A slow wobble, five times a second, that grows as the note goes on.
    const wobble = context.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.setValueAtTime(5, when);
    const depth = context.createGain();
    depth.gain.setValueAtTime(0.0001, when);
    depth.gain.exponentialRampToValueAtTime(hz * 0.025, when + held * 0.6);
    wobble.connect(depth);
    for (const wave of waves) depth.connect(wave.frequency);
    wobble.start(when);
    wobble.stop(end + 0.12);
  }
}

/** A gain that rises to `peak` in `attack`, holds until `held`, then fades over `release`. */
function shape(
  context: AudioContext,
  out: AudioNode,
  when: number,
  peak: number,
  attack: number,
  held: number,
  release: number,
) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + attack);
  gain.gain.setValueAtTime(peak, when + Math.max(attack, held));
  gain.gain.linearRampToValueAtTime(0, when + Math.max(attack, held) + release);
  gain.connect(out);
  return gain;
}
