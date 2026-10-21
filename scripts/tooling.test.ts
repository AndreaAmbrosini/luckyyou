import { ESLint } from 'eslint';
import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';

// Agents keep git worktrees, each a full checkout, under .claude/worktrees.
// Checks run in the main checkout must not walk into them.
describe('the checks skip .claude', () => {
  const file = '.claude/worktrees/some-branch/src/App.tsx';

  it('ESLint ignores it', async () => {
    expect(await new ESLint().isPathIgnored(file)).toBe(true);
  });

  it('Prettier ignores it', async () => {
    const { ignored } = await prettier.getFileInfo(file, {
      ignorePath: ['.gitignore', '.prettierignore'],
    });
    expect(ignored).toBe(true);
  });
});
