import type { Scenario, ScenarioMeta, Show } from '../../src/scenario-kit/contract';

export interface Run {
  readonly names: readonly string[];
  readonly unlucky: string;
}

export interface FakeScenario extends Scenario {
  /** Each show it was asked to play, in order. */
  readonly runs: Run[];
}

type FakeOptions = Partial<ScenarioMeta> & { play?: (show: Show) => Promise<void> | void };

/**
 * A scenario that records who it was told about and otherwise does nothing,
 * unless `play` says what else to do.
 */
export function fakeScenario(options: FakeOptions = {}): FakeScenario {
  const name = options.name ?? 'Fake Show';
  const runs: Run[] = [];
  return {
    id: options.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: options.description ?? `${name}, for tests.`,
    card: options.card ?? { emoji: '🎲' },
    people: options.people ?? { min: 2, max: 12 },
    developmentOnly: options.developmentOnly,
    runs,
    async play(show) {
      runs.push({ names: show.names, unlucky: show.unlucky });
      await options.play?.(show);
    },
  };
}
