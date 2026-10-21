import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';

const undos: (() => void)[] = [];

/** Runs `undo` when the test, or the scenario, ends. */
export function onReset(undo: () => void): void {
  undos.push(undo);
}

/** Puts the page back as a test found it: no app, no spies, real timers, empty storage. */
export function resetTestState(): void {
  cleanup();
  while (undos.length > 0) undos.pop()!();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
}

interface Named {
  name: string;
  suite?: Named;
}

/**
 * vitest-cucumber runs each step of a scenario as a test of its own, so state
 * built in a Given has to outlive that test. A scenario resets when it ends
 * instead (see specs/support/spec.ts).
 */
export function isScenarioStep(test: { suite?: Named }): boolean {
  for (let suite = test.suite; suite; suite = suite.suite) {
    if (/^Scenario( Outline)?: /.test(suite.name)) return true;
  }
  return false;
}
