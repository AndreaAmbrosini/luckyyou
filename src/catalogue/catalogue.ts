import { discoverScenarios } from './discover';

/** Every scenario in src/scenarios/, found by its folder (decision 0006). */
export const catalogue = discoverScenarios(
  import.meta.glob('../scenarios/*/index.ts', { eager: true, import: 'default' }),
  { production: import.meta.env.PROD },
);
