import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', '.superpowers'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{js,ts}', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Specs drive the app in jsdom and read files from the repository.
    files: ['specs/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/**/*.tsx'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    // A scenario is one self-contained folder: it may import only from its own
    // folder, the scenario kit and GSAP. No React, no app code, no other
    // scenarios.
    files: ['src/scenarios/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Scenarios get a plain DOM element; they must not use React.',
            },
            {
              name: 'react-dom',
              message: 'Scenarios get a plain DOM element; they must not use React.',
            },
          ],
          patterns: [
            {
              regex: '^\\.\\./(?!\\.\\./scenario-kit(/|$))',
              message:
                'Scenarios may import only from their own folder, ../../scenario-kit and gsap.',
            },
          ],
        },
      ],
    },
  },
);
