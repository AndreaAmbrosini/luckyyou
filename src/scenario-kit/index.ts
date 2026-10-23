// What a scenario may use. A scenario imports from here, its own folder and
// GSAP, and nothing else (decision 0006).

export {
  handOutLooks,
  head,
  type Accessory,
  type Colour,
  type Head,
  type Look,
  type Mood,
} from './characters';
export { defineScenario, type Scenario, type ScenarioMeta, type Show } from './contract';
export { bob, hoverWobble, popIn, scroller, shake } from './motion';
export { eliminationOrder } from './order';
export { pickOne, shuffle } from './random';
export type { Cue, SoundPlayer } from './sound';
export { spread, STAGE } from './stage';
export { bubble, nameTag, speechAt, speechBox, type Box } from './text';
export { fitBeats, type Beat } from './time';
export { stagePx } from './tokens';
