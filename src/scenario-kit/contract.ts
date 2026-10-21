// What a scenario is, and what it is handed when its show runs. A scenario
// lives in src/scenarios/<id>/index.ts and default-exports defineScenario(…)
// (decision 0006). specs/scenarios.feature is the contract every one keeps.

import type { SoundPlayer } from './sound';

/** How many people a pick can have, and so any scenario's limits. */
export const HEAD_COUNT = { min: 2, max: 12 } as const;

/** How long a show lasts, in seconds, at every head count it accepts. */
export const SHOW_LENGTH = { min: 10, max: 15 } as const;

/** How a scenario shows up in the picker. */
export interface ScenarioMeta {
  /** Kebab-case, and the same as the scenario's folder name. */
  readonly id: string;
  /** Up to 30 characters. */
  readonly name: string;
  /** One line, up to 90 characters. */
  readonly description: string;
  /** The picture on its card: an emoji, or the URL of an image. */
  readonly card: { readonly emoji: string } | { readonly image: string };
  /** The head counts it can act out, within 2 to 12. */
  readonly people: { readonly min: number; readonly max: number };
  /** Listed in development and test builds only. */
  readonly developmentOnly?: boolean;
}

export interface Scenario extends ScenarioMeta {
  /** Acts out the pick the app already made; resolves when the show is over. */
  play(show: Show): Promise<void>;
}

/** Everything a show gets. The app has already picked; the show only acts it out. */
export interface Show {
  /** Where the show draws. */
  readonly stage: HTMLElement;
  /** Everyone in this pick, in the list's order. A frozen copy. */
  readonly names: readonly string[];
  /** The app's pick: the show must end on this person. */
  readonly unlucky: string;
  /** Seeded, so a run can be replayed. Returns numbers in [0, 1). */
  readonly random: () => number;
  /** Aborted when the show is cancelled or runs out of time. */
  readonly signal: AbortSignal;
  /** Plays a sound unless the app is muted. */
  readonly sound: SoundPlayer;
  /**
   * Resolves after `seconds` of show time. Rejects with an AbortError the
   * moment the show is cancelled. Use it instead of timers of your own.
   */
  wait(seconds: number): Promise<void>;
  /**
   * Plays `animation` and resolves when it completes. Cancelling the show
   * kills it and rejects at once.
   */
  play(animation: gsap.core.Animation): Promise<void>;
  /**
   * Shows `text` as the caption at the top of the stage, or clears it with
   * null, and has it read out. Each caption stays up at least a second; one
   * that comes sooner waits its turn.
   */
  caption(text: string | null): void;
}

/** Gives a scenario its types; it returns the scenario unchanged. */
export function defineScenario(scenario: Scenario): Scenario {
  return scenario;
}
