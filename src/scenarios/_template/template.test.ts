import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import template from './index';

const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Hana',
  'Ivo',
  'Jonas',
  'Kofi',
  'Luca',
];

describeSpec(await loadFeature('./template.feature'), ({ Rule }) => {
  Rule('The unlucky person is the last one on stage', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        const names = TEAM.slice(0, Number(count));
        let unlucky: string;
        /** Who had left, frame by frame. */
        const gone: string[][] = [];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          unlucky = position === 'first' ? names[0]! : names.at(-1)!;
        });
        When('the show runs', async () => {
          await runShow(template, {
            names,
            unlucky,
            onFrame: (_, stage) => {
              const left = stage.querySelectorAll<HTMLElement>('[data-left]');
              gone.push([...left].map((tag) => tag.dataset.person!));
            },
          });
        });
        Then('everyone else leaves, one at a time', () => {
          const others = names.filter((name) => name !== unlucky);
          expect([...gone.findLast((left) => left.length > 0)!].sort()).toEqual(others.sort());
          gone.forEach((left, frame) => {
            expect(left.length - (gone[frame - 1]?.length ?? 0)).toBeLessThanOrEqual(1);
          });
        });
        And('the unlucky person never leaves', () => {
          expect(gone.flat()).not.toContain(unlucky);
        });
      },
    );
  });

  Rule('It lasts 13 seconds', ({ RuleScenario }) => {
    RuleScenario('Every head count lasts 13 seconds', ({ When, Then }) => {
      const records: ShowRecord[] = [];
      When('the show runs at every head count from 2 to 12', async () => {
        for (let count = 2; count <= 12; count++) {
          const names = TEAM.slice(0, count);
          records.push(await runShow(template, { names, unlucky: names[0]! }));
        }
      });
      Then('each run lasts 13 seconds, give or take 0.1', () => {
        for (const record of records) {
          expect(record.outcome).toBe('finished');
          expect(record.duration).toBeCloseTo(13, 1);
        }
      });
    });
  });
});
