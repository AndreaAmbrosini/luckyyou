import {
  getVitestCucumberConfiguration,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pending scenarios are listed as todos by describeSpec, not run.
setVitestCucumberConfiguration({ ...getVitestCucumberConfiguration(), excludeTags: ['pending'] });

afterEach(() => {
  cleanup();
  localStorage.clear();
});
