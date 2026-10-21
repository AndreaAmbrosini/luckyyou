import type { Scenario, Show } from './contract';
import { createRandom } from './random';

export type RunOutcome = 'finished' | 'failed' | 'cancelled';

export interface RunOptions {
  /** The element the show draws in; the run adds its stage here and takes it away after. */
  readonly host: HTMLElement;
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
  readonly signal: AbortSignal;
}

/** Plays one show of `scenario` in `host`, for a pick the app already made. */
export async function runScenario(scenario: Scenario, options: RunOptions): Promise<RunOutcome> {
  const stage = document.createElement('div');
  stage.dataset.kit = 'stage';
  options.host.append(stage);

  const show: Show = {
    stage,
    names: Object.freeze([...options.names]),
    unlucky: options.unlucky,
    random: createRandom(options.seed),
    signal: options.signal,
  };

  try {
    await scenario.play(show);
  } finally {
    stage.remove();
  }
  return 'finished';
}
