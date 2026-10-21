import { discoverScenarios } from './discover';

/**
 * Every scenario folder's index.ts, loaded. Folders starting with `_` aren't,
 * so the production build leaves them out.
 */
export const scenarioModules = import.meta.glob(
  ['../scenarios/*/index.ts', '!../scenarios/_*/index.ts'],
  { eager: true, import: 'default' },
);

/** Every scenario in src/scenarios/, found by its folder (decision 0006). */
export const catalogue = discoverScenarios(scenarioModules, { production: import.meta.env.PROD });
