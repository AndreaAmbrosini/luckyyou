import { describe, expect, it } from 'vitest';
import { testsFor } from './check.mjs';

const exists = () => true;

describe('testsFor', () => {
  it('hands source and test files to vitest related', () => {
    expect(testsFor(['src/scenarios/the-race/play.ts', 'specs/pick.test.ts'], exists)).toEqual([
      'specs/pick.test.ts',
      'src/scenarios/the-race/play.ts',
    ]);
  });

  it("runs a feature's own test file, since a feature isn't imported", () => {
    expect(testsFor(['src/scenarios/the-race/autumn.feature'], exists)).toEqual([
      'src/scenarios/the-race/autumn.test.ts',
    ]);
  });

  it('checks the docs when a doc or a spec in specs/ changed', () => {
    expect(testsFor(['AGENTS.md', 'docs/decisions/0001-toolchain-versions.md'], exists)).toEqual([
      'specs/docs.test.ts',
    ]);
    expect(testsFor(['specs/pick.feature'], exists)).toEqual([
      'specs/docs.test.ts',
      'specs/pick.test.ts',
    ]);
  });

  it('runs nothing for Playwright tests or the deploy', () => {
    expect(testsFor(['e2e/line-up.spec.ts', '.github/workflows/ci.yml'], exists)).toEqual([]);
  });

  it('runs every test for a config, the test setup or a deleted file', () => {
    expect(testsFor(['vite.config.ts'], exists)).toBe('all');
    expect(testsFor(['package.json'], exists)).toBe('all');
    expect(testsFor(['src/test/setup.ts'], exists)).toBe('all');
    expect(testsFor(['src/scenarios/the-race/gone.ts'], () => false)).toBe('all');
  });
});
