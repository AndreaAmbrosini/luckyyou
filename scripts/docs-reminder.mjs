// Claude Code hooks, registered in .claude/settings.json. `start` (SessionStart)
// records the commit a session began on. With no argument (Stop), it asks the
// session once to check whether a spec or doc should change, when code changed
// since then, committed or not, and no spec or doc did.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CODE =
  /^(src|e2e|scripts|\.github)\/|^package\.json$|^[^/]+\.config\.[cm]?[jt]s$|^tsconfig[^/]*\.json$|^\.stylelintrc\.json$/;
const DOCS = /^(specs|docs)\/|^(AGENTS|PRODUCT|README)\.md$/;
const STATE_DIR = 'luckyyou-docs-reminder';
const STATE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const REASON =
  'Code changed but no spec or doc did. Check whether a .feature file, a decision record, ' +
  'AGENTS.md, PRODUCT.md or README.md should change with it. If none should, carry on.';

/**
 * The paths in `git status --porcelain=v1 -z` output. A rename or copy lists
 * both its new and its original path.
 * @param {string} porcelainZ
 * @returns {string[]}
 */
export function changedPaths(porcelainZ) {
  const fields = porcelainZ.split('\0').filter((field) => field !== '');
  /** @type {string[]} */
  const paths = [];
  for (let i = 0; i < fields.length; i++) {
    const status = fields[i].slice(0, 2);
    paths.push(fields[i].slice(3));
    if (/[RC]/.test(status)) paths.push(fields[++i]);
  }
  return paths;
}

/**
 * The reminder for these changed paths, or null when none is due: no code
 * changed, a doc changed with it, or this same set was already reminded of.
 * @param {string[]} paths
 * @param {string | null} previous the fingerprint of the last reminder
 * @returns {{ fingerprint: string, reason: string } | null}
 */
export function reminderFor(paths, previous) {
  const code = paths.filter((path) => CODE.test(path)).sort();
  if (code.length === 0 || paths.some((path) => DOCS.test(path))) return null;
  const fingerprint = code.join('\n');
  return fingerprint === previous ? null : { fingerprint, reason: REASON };
}

/**
 * @typedef {{ start: string | null, reminded: string | null }} SessionState
 */

/** @param {'start' | 'stop'} hook */
function main(hook) {
  /** @type {{ stop_hook_active?: boolean, session_id?: string, cwd?: string }} */
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // No or bad input: carry on with the defaults.
  }
  if (input.stop_hook_active) return;

  const cwd = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const git = (/** @type {string[]} */ ...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const head = () => {
    try {
      return git('rev-parse', 'HEAD').trim();
    } catch {
      return null; // No commits yet.
    }
  };

  const stateDir = join(git('rev-parse', '--absolute-git-dir').trim(), STATE_DIR);
  const stateFile = join(
    stateDir,
    `${(input.session_id ?? 'default').replace(/[^\w-]/g, '_')}.json`,
  );
  /** @type {SessionState} */
  const state = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, 'utf8'))
    : { start: null, reminded: null };
  const save = (/** @type {SessionState} */ next) => {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(stateFile, JSON.stringify(next));
  };

  if (hook === 'start') {
    // A resumed or compacted session keeps the commit it first started on.
    if (!existsSync(stateFile)) save({ start: head(), reminded: null });
    for (const name of readdirSync(stateDir)) {
      const file = join(stateDir, name);
      if (Date.now() - statSync(file).mtimeMs > STATE_MAX_AGE_MS) rmSync(file);
    }
    return;
  }

  const now = head();
  const committed =
    state.start && now && state.start !== now
      ? git('diff', '--name-only', '-z', state.start, now).split('\0').filter(Boolean)
      : [];
  const pending = changedPaths(git('status', '--porcelain=v1', '-z', '--untracked-files=all'));
  const reminder = reminderFor([...committed, ...pending], state.reminded);
  if (!reminder) return;
  save({ ...state, reminded: reminder.fingerprint });
  process.stdout.write(JSON.stringify({ decision: 'block', reason: reminder.reason }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv[2] === 'start' ? 'start' : 'stop');
  } catch {
    // A reminder is never worth breaking a session over.
  }
}
