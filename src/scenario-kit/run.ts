import type { Scenario, Show } from './contract';
import { createRandom } from './random';
import { createSound } from './sound';

export type RunOutcome = 'finished' | 'failed' | 'cancelled';

export interface RunOptions {
  /** The element the show draws in; the run adds its stage here and takes it away after. */
  readonly host: HTMLElement;
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
  readonly muted: boolean;
  /** Aborting it stops the show at once. */
  readonly signal: AbortSignal;
}

/** Plays one show of `scenario` in `host`, for a pick the app already made. */
export async function runScenario(scenario: Scenario, options: RunOptions): Promise<RunOutcome> {
  const { signal } = options;
  const stage = document.createElement('div');
  stage.dataset.kit = 'stage';
  options.host.append(stage);
  const sound = createSound({ muted: options.muted });

  const show: Show = {
    stage,
    names: Object.freeze([...options.names]),
    unlucky: options.unlucky,
    random: createRandom(options.seed),
    signal,
    sound: sound.player,
  };

  // A scenario may ignore the signal; the run doesn't wait for it once aborted.
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
  const playing = new Promise<void>((resolve) => resolve(scenario.play(show)));
  // Once cancelled, whatever the show does next is no longer anyone's concern.
  playing.catch(() => undefined);

  try {
    await Promise.race([playing, aborted]);
    return signal.aborted ? 'cancelled' : 'finished';
  } catch (error) {
    if (signal.aborted) return 'cancelled';
    console.error(`${scenario.name} failed:`, error);
    return 'failed';
  } finally {
    sound.stop();
    stage.remove();
  }
}
