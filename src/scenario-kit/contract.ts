// What a scenario is, and what it is handed when its show runs. A scenario
// lives in src/scenarios/<id>/index.ts and default-exports defineScenario(…)
// (decision 0006). specs/scenarios.feature is the contract every one keeps.

import type { SoundPlayer } from './sound';

/** How many people a pick can have, and so any scenario's limits. */
export const HEAD_COUNT = { min: 2, max: 12 } as const;

/** How long a show lasts, in seconds, at every head count it accepts. */
export const SHOW_LENGTH = { min: 10, max: 30 } as const;

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
  /** A step before the show where each person's look is chosen (decision 0011). */
  readonly lineUp?: LineUp;
}

/** What a show's Line-up offers, and how it draws one person's look. */
export interface LineUp {
  /** The step's heading, such as "Line up the racers". */
  readonly heading: string;
  /** The label of the button that starts the show. */
  readonly start: string;
  /** What can be chosen for each person, in the order the Line-up shows it. */
  readonly options: readonly LineUpOption[];
  /**
   * Draws `person` in `look`, calm, filling the element the Line-up puts it
   * in. `place` is their place in today's list, from 1.
   */
  draw(look: ChosenLook, person: { readonly name: string; readonly place: number }): Element;
  /** Where the whole show takes place, one for everyone, shown as postcards (decision 0015). */
  readonly themes?: readonly LineUpTheme[];
  /**
   * Draws the show's start on the START grid, in `theme`, everyone in their
   * look, and says where each one stands (decision 0016). Without it, the
   * Line-up shows a row of tiles.
   */
  drawStart?(scene: {
    readonly people: readonly StartPerson[];
    readonly theme: string | null;
  }): LineUpStart;
}

/**
 * The grid a line-up's start is drawn on, in px, and how much of its right
 * the Line-up's panel covers.
 */
export const START = { width: 1194, height: 440, panel: 648 } as const;

/** One of today's people at a show's start. */
export interface StartPerson {
  readonly name: string;
  /** Their place in today's list, from 1. */
  readonly place: number;
  readonly look: ChosenLook;
  /** The one whose look is in the panel, drawn so it shows. */
  readonly chosen: boolean;
}

/** A show's start, as its line-up draws it. */
export interface LineUpStart {
  /** The scene, filling a START-sized box. */
  readonly el: Element;
  /**
   * Each person, in today's order: the box on the grid that chooses them,
   * left of the panel with room on its left for a die and a pin, and their
   * drawing, which flips in when their look is dealt.
   */
  readonly places: readonly {
    readonly box: { left: number; top: number; width: number; height: number };
    readonly drawing: Element;
  }[];
}

/** One of a line-up's themes. A line-up offers none, or at least two. */
export interface LineUpTheme {
  /** What the show is handed; unique in the line-up. */
  readonly name: string;
  /** Shown under its postcard. */
  readonly label: string;
  /** Draws its postcard's picture, 120 by 46, filling the box it shows in. */
  picture(): Element;
  /**
   * The first option's choices that suit it, by name, in the order its tab
   * shows them: while it is chosen, they are that option's first tab.
   */
  readonly suits?: readonly string[];
}

export interface LineUpOption {
  /** The key in a look; unique in the line-up. */
  readonly name: string;
  readonly label: string;
  /** At least two, with unique names; they may come in groups, shown as tabs (decision 0013). */
  readonly choices: readonly LineUpChoice[];
  /** Each choice shows as the person drawn with it in the rest of their look (`draw`). */
  readonly drawn?: boolean;
}

export interface LineUpChoice {
  /** The value in a look. */
  readonly name: string;
  /** Shown on its chip or under its drawing, or read out for a swatch or a picture. */
  readonly label: string;
  /** A colour from tokens.css, as in `--color-<swatch>`: the choice shows as a round swatch. */
  readonly swatch?: string;
  /**
   * Draws the choice's own picture, filling the button it shows on. All of
   * an option's choices have one, or none do (decision 0013).
   */
  picture?(): Element;
  /**
   * The label of the tab it shows under, such as "Rides" (decision 0013).
   * Tabs come in the order their first choices do.
   */
  readonly group?: string;
}

/** One person's look: a choice's name for each option's name. */
export type ChosenLook = Readonly<Record<string, string>>;

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
  /** Each person's look from the Line-up, by name; empty for a show without one. Frozen. */
  readonly looks: ReadonlyMap<string, ChosenLook>;
  /** The theme from the Line-up, by name; null for a show without themes. */
  readonly theme: string | null;
  /** Seeded, so a run can be replayed. Returns numbers in [0, 1). */
  readonly random: () => number;
  /** Aborted when the show is cancelled or runs out of time. */
  readonly signal: AbortSignal;
  /** The viewer asked for less motion: keep the story, drop shaking and speed lines. */
  readonly reducedMotion: boolean;
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
