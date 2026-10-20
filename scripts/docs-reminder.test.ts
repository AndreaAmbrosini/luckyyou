import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { changedPaths, reminderFor } from './docs-reminder.mjs';

describe('reminderFor', () => {
  it('reminds when code changed and no doc did', () => {
    expect(reminderFor(['src/App.tsx'], null)).not.toBeNull();
  });

  it('stays quiet when a spec changed too', () => {
    expect(reminderFor(['src/App.tsx', 'specs/people.feature'], null)).toBeNull();
  });

  it('stays quiet when only docs changed', () => {
    expect(reminderFor(['README.md'], null)).toBeNull();
  });

  it('treats config files as code', () => {
    expect(reminderFor(['vite.config.ts'], null)).not.toBeNull();
  });

  it('reminds once per set of changes', () => {
    const first = reminderFor(['src/a.ts'], null)!;
    expect(reminderFor(['src/a.ts'], first.fingerprint)).toBeNull();
    expect(reminderFor(['src/a.ts', 'src/b.ts'], first.fingerprint)).not.toBeNull();
  });
});

describe('changedPaths', () => {
  it('counts both sides of a rename', () => {
    expect(changedPaths('R  src/new.ts\0src/old.ts\0?? docs/x.md\0')).toEqual([
      'src/new.ts',
      'src/old.ts',
      'docs/x.md',
    ]);
  });
});

const script = join(dirname(fileURLToPath(import.meta.url)), 'docs-reminder.mjs');

// Each test runs git and node several times; process start-up on Windows is slow.
describe('the hooks', { timeout: 30_000 }, () => {
  let repo = '';
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  /** A git repository with one commit, standing in for the project. */
  function makeRepo() {
    repo = mkdtempSync(join(tmpdir(), 'luckyyou-hook-'));
    git('init', '-q');
    write('README.md');
    commit();
  }
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  const commit = () => {
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'change');
  };
  function write(path: string, text = path + String(Date.now())) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  }
  const run = (session: string, ...args: string[]) =>
    execFileSync(process.execPath, [script, ...args], {
      input: JSON.stringify({ session_id: session }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
    });
  const blocked = (output: string) => output.includes('"decision":"block"');

  it('never blocks a stop it already blocked', () => {
    const output = execFileSync(process.execPath, [script], {
      input: '{"stop_hook_active":true}',
      encoding: 'utf8',
    });
    expect(output).toBe('');
  });

  it('reminds about code the session committed', () => {
    makeRepo();
    run('s1', 'start');
    write('src/a.ts');
    commit();
    expect(blocked(run('s1'))).toBe(true);
    expect(run('s1')).toBe('');
  });

  it('reminds again in a new session', () => {
    makeRepo();
    run('s1', 'start');
    write('src/a.ts');
    expect(blocked(run('s1'))).toBe(true);
    run('s2', 'start');
    expect(blocked(run('s2'))).toBe(true);
  });

  it('stays quiet when the session also changed a spec', () => {
    makeRepo();
    run('s1', 'start');
    write('src/a.ts');
    commit();
    write('specs/a.feature');
    expect(run('s1')).toBe('');
  });
});
