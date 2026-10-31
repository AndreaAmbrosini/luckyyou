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
export {
  defineScenario,
  type ChosenLook,
  type LineUp,
  type LineUpChoice,
  type LineUpOption,
  type LineUpStart,
  type LineUpTheme,
  START,
  type StartPerson,
  type Scenario,
  type ScenarioMeta,
  type Show,
} from './contract';
export { bob, hoverWobble, popIn, scroller, shake } from './motion';
export { eliminationOrder } from './order';
export { drums, melody, oomPah, type Music, type Note } from './music';
export { pickOne, shuffle } from './random';
export type { Cue, SoundPlayer } from './sound';
export { spread, STAGE } from './stage';
export { bubble, leanRoom, nameTag, speechAt, speechBox, type Box } from './text';
export { fitBeats, type Beat } from './time';
export { stagePx } from './tokens';
