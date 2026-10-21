/** The sounds a show can ask for. Every show must also read with the sound off. */
export type Cue = 'splash' | 'rotor' | 'whoosh' | 'heartbeat' | 'fanfare';

export interface SoundPlayer {
  play(cue: Cue): void;
}

/**
 * A show's sound. While muted it never opens an audio output; otherwise it
 * opens one on the first cue and closes it when the show is over.
 */
export function createSound({ muted }: { muted: boolean }): { player: SoundPlayer; stop(): void } {
  let context: AudioContext | null = null;
  return {
    player: {
      play() {
        if (muted || typeof AudioContext === 'undefined') return;
        context ??= new AudioContext();
      },
    },
    stop() {
      void context?.close();
      context = null;
    },
  };
}
