import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import wobblyTower from './index';

describeSpec(await loadFeature('./wobbly-tower.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Wobbly Tower', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(wobblyTower.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(wobblyTower.description).toBe(description);
      });
      And('its picture is 🧱', () => {
        expect(wobblyTower.card).toEqual({ emoji: '🧱' });
      });
      And('it takes 2 to 12 people', () => {
        expect(wobblyTower.people).toEqual({ min: 2, max: 12 });
      });
    });
  });
});
