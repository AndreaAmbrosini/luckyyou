import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import hotPotato from './index';

describeSpec(await loadFeature('./hot-potato.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Hot Potato', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(hotPotato.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(hotPotato.description).toBe(description);
      });
      And('its picture is 🥔', () => {
        expect(hotPotato.card).toEqual({ emoji: '🥔' });
      });
      And('it takes 2 to 12 people', () => {
        expect(hotPotato.people).toEqual({ min: 2, max: 12 });
      });
    });
  });
});
