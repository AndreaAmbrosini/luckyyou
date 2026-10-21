import {
  getVitestCucumberConfiguration,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { isScenarioStep, resetTestState } from './reset';

// Pending scenarios are listed as todos by describeSpec, not run.
setVitestCucumberConfiguration({ ...getVitestCucumberConfiguration(), excludeTags: ['pending'] });

afterEach(({ task }) => {
  if (!isScenarioStep(task)) resetTestState();
});
