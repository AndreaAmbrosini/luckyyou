import { describeFeature, type loadFeature } from '@amiceli/vitest-cucumber';
import { describe, it } from 'vitest';

type Feature = Awaited<ReturnType<typeof loadFeature>>;
type Implementation = Parameters<typeof describeFeature>[1];

const PENDING = 'pending';

/**
 * Runs a feature's scenarios and lists its `@pending` ones as todos.
 *
 * vitest-cucumber skips excluded scenarios without a trace, and fails a
 * feature that has nothing left to run. This keeps every pending scenario
 * visible in the test report, and still fails on any scenario that isn't
 * pending and has no steps.
 */
export function describeSpec(feature: Feature, implementation: Implementation = () => {}): void {
  const pendingRule = (rule: Feature['rules'][number]) => rule.tags.has(PENDING);
  const runnable = [
    ...feature.scenarii,
    ...feature.rules.filter((rule) => !pendingRule(rule)).flatMap((rule) => rule.scenarii),
  ].some((scenario) => !scenario.tags.has(PENDING));
  if (runnable) describeFeature(feature, implementation);

  const todos = [
    ...feature.scenarii
      .filter((scenario) => scenario.tags.has(PENDING))
      .map((scenario) => ({ rule: null, scenario })),
    ...feature.rules.flatMap((rule) =>
      rule.scenarii
        .filter((scenario) => pendingRule(rule) || scenario.tags.has(PENDING))
        .map((scenario) => ({ rule: rule.name, scenario })),
    ),
  ];
  if (todos.length === 0) return;

  describe(`Feature: ${feature.name}`, () => {
    for (const { rule, scenario } of todos) {
      const todo = () => it.todo(`Scenario: ${scenario.description}`);
      if (rule) describe(`Rule: ${rule}`, todo);
      else todo();
    }
  });
}
