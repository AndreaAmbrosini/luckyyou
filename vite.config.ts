import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build works under any GitHub Pages path.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Apply the styles, so a spec can check what a stylesheet decides.
    css: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'specs/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Mocks are cleared and restored by src/test/setup.ts after each test, and
    // after each Gherkin scenario rather than each of its steps.
    clearMocks: false,
    // A step that plays whole shows on the hand-driven clock can take seconds
    // when every test file runs at once.
    testTimeout: 20_000,
  },
});
