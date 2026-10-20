import { loadFeature } from '@amiceli/vitest-cucumber';
import stylelint from 'stylelint';
import { expect } from 'vitest';
import { describeSpec } from './support/spec';

describeSpec(await loadFeature('./styles.feature'), ({ Rule }) => {
  Rule(
    'CSS sets colours, fonts and font sizes only through var(--…)',
    ({ RuleScenarioOutline }) => {
      RuleScenarioOutline(
        '"<declaration>" is <verdict>',
        ({ When, Then }, { declaration, verdict }) => {
          let warnings = 0;
          When('a stylesheet declares "<declaration>"', async () => {
            const { results } = await stylelint.lint({
              code: `.a {\n  ${declaration};\n}\n`,
              configFile: '.stylelintrc.json',
            });
            warnings = results[0]!.warnings.length;
          });
          Then('Stylelint finds it <verdict>', () => {
            expect(warnings > 0 ? 'wrong' : 'fine').toBe(verdict);
          });
        },
      );
    },
  );
});
