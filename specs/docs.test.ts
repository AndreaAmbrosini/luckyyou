import { loadFeature } from '@amiceli/vitest-cucumber';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import { bannedPhrasesIn, countWords, listDocs, relativeLinks } from './support/markdown';
import { describeSpec } from './support/spec';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const docs = listDocs(root);

describeSpec(await loadFeature('./docs.feature'), ({ Rule }) => {
  Rule('Each doc stays within its word budget', ({ RuleScenarioOutline, RuleScenario }) => {
    RuleScenarioOutline('<doc> stays within <budget> words', ({ Then }, { doc, budget }) => {
      Then('<doc> has at most <budget> words', () => {
        expect(countWords(read(doc)), doc).toBeLessThanOrEqual(Number(budget));
      });
    });

    RuleScenario('Each decision record stays within 200 words', ({ Then }) => {
      Then('every file in docs/decisions has at most 200 words', () => {
        const over = docs
          .filter((path) => path.startsWith('docs/decisions/'))
          .filter((path) => countWords(read(path)) > 200);
        expect(over).toEqual([]);
      });
    });
  });

  Rule('Docs avoid stock phrases', ({ RuleScenario }) => {
    RuleScenario('No doc uses a banned phrase', ({ Then }) => {
      Then('no doc contains any of these phrases:', (_, table: { phrase: string }[]) => {
        const phrases = table.map((row) => row.phrase);
        const found = docs
          // This feature lists the phrases, so it's the one doc allowed to contain them.
          .filter((path) => path !== 'specs/docs.feature')
          .flatMap((path) => bannedPhrasesIn(read(path), phrases).map((p) => `${path}: "${p}"`));
        expect(found).toEqual([]);
      });
    });
  });

  Rule('Links point somewhere', ({ RuleScenario }) => {
    RuleScenario('Every relative link resolves', ({ Then }) => {
      Then('every relative link in the docs points to a file that exists', () => {
        const broken = docs
          .filter((path) => path.endsWith('.md'))
          .flatMap((path) =>
            relativeLinks(read(path))
              .filter((link) => !existsSync(join(root, posix.dirname(path), link)))
              .map((link) => `${path} → ${link}`),
          );
        expect(broken).toEqual([]);
      });
    });
  });
});
