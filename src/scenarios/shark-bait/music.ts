// Shark Bait's music, our own: a dun-dun, a low half step from B to C, two
// notes over and over in even pulses, quicker all the way, and nothing else.
// Each dun is a bass with a bassoon on the same note, for a growl. The user
// asked for John Williams's Jaws theme (1975), which is under copyright:
// nothing here comes from it but the bare idea of a low half step that
// speeds up.

import type { Note } from '../../scenario-kit';
import { pitchOf } from '../../scenario-kit/music';

/**
 * Duns a second: RATE.start at the splash-in, RATE.top as the shark dives,
 * and between them it speeds up along one smooth curve, slowly at first and
 * steeper and steeper, as the show's time to the dive raised to CURVE.
 */
export const RATE = { start: 2, top: 10 } as const;
const CURVE = 2;
/** The dun-dun's two notes, the lower first. */
export const DUN_DUN = [pitchOf('B1'), pitchOf('C2')] as const;
/** How loud the bassoon growls under each dun. */
const GROWL = 0.7;
/**
 * Under each heartbeat the dun-dun plays on, quieter: from `before` seconds
 * before it to `after` seconds after it, at `level`.
 */
export const HEARTBEAT = { before: 0.05, after: 0.4, level: 0.5 } as const;
/** Steps a second the song's beats are added up in. */
const STEPS = 1000;

/** When the music's moves come, in show seconds. */
export interface Moments {
  /** The shark dives: the music stops for good. */
  readonly dive: number;
  /** Every heartbeat. */
  readonly heartbeats: readonly number[];
}

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
  /** The show second the song reaches `beat`. */
  timeOf(beat: number): number;
}

/**
 * The dun-dun from the splash-in until the shark dives, a beat a dun,
 * quicker all the way; there it stops for good. Under each heartbeat it
 * plays on, quieter.
 */
export function sharkBaitMusic({ dive, heartbeats }: Moments): Score {
  const speedAt = (t: number) => RATE.start * (RATE.top / RATE.start) ** ((t / dive) ** CURVE);
  // The beat at each step, added up from the speed.
  const steps = Math.ceil(dive * STEPS);
  const step = dive / steps;
  const beats = [0];
  for (let k = 1; k <= steps; k++) {
    beats.push(beats[k - 1]! + ((speedAt((k - 1) * step) + speedAt(k * step)) / 2) * step);
  }
  const beatAt = (t: number) => {
    const k = Math.min(steps - 1, Math.floor(t / step));
    return beats[k]! + ((beats[k + 1]! - beats[k]!) * (t - k * step)) / step;
  };
  const timeOf = (x: number) => {
    let [low, high] = [0, steps];
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (beats[middle]! <= x) low = middle;
      else high = middle;
    }
    return (low + (x - beats[low]!) / (beats[high]! - beats[low]!)) * step;
  };
  const ends = beats[steps]!;

  const under = (t: number) =>
    heartbeats.some(
      (heartbeat) => t >= heartbeat - HEARTBEAT.before && t < heartbeat + HEARTBEAT.after,
    );
  const notes: Note[] = [];
  for (let at = 0; at < ends - 1e-9; at++) {
    const pitch = DUN_DUN[at % 2]!;
    const beats = Math.min(1, ends - at);
    const level = under(timeOf(at)) ? HEARTBEAT.level : 1;
    notes.push(
      { at, beats, voice: 'bass', pitch, level },
      { at, beats, voice: 'bassoon', pitch, level: level * GROWL },
    );
  }

  return {
    notes,
    at(t) {
      if (t < 0) return { beat: 0, speed: 0 };
      if (t >= dive) return { beat: ends, speed: 0 };
      return { beat: beatAt(t), speed: speedAt(t) };
    },
    timeOf,
  };
}
