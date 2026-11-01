// `npm run check` runs every check. `npm run check-quick` skips the build and
// runs only the tests that the uncommitted changes can reach (decision 0018).
// Typecheck, lint and format run side by side, then the tests, then the build.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { changedPaths } from './docs-reminder.mjs';

// Changes Vitest's module graph follows from the tests that import them.
const GRAPHED = /^(src|specs|scripts)\/.*\.(ts|tsx|mjs|css)$/;
// Changes no unit test reads: Playwright's tests, and the deploy.
const UNTESTED = /^(e2e\/|\.github\/|playwright\.config\.ts$)/;
// Read by specs/docs.feature.
const DOCS = /^(docs\/.*\.md|specs\/[^/]+\.feature|[^/]+\.md)$/;
const SPEC = /^(specs|src\/scenarios\/[^/]+)\/([^/]+)\.feature$/;
const SETUP = /^src\/test\//;

/**
 * Which tests the changed paths can reach: `'all'`, or the files to hand to
 * `vitest related`. A feature is read from disk, not imported, so it maps to
 * the test file of the same name. Anything else, a config or a deleted file,
 * can reach every test.
 * @param {string[]} paths
 * @param {(path: string) => boolean} [exists]
 * @returns {'all' | string[]}
 */
export function testsFor(paths, exists = existsSync) {
  /** @type {Set<string>} */
  const files = new Set();
  for (const path of paths) {
    if (UNTESTED.test(path)) continue;
    if (!exists(path) || SETUP.test(path)) return 'all';
    const spec = SPEC.exec(path);
    if (DOCS.test(path)) files.add('specs/docs.test.ts');
    if (spec) files.add(`${spec[1]}/${spec[2]}.test.ts`);
    else if (GRAPHED.test(path)) files.add(path);
    else if (!DOCS.test(path)) return 'all';
  }
  return [...files].sort();
}

/**
 * Runs `npx <args>`, keeping its output to show if it fails.
 * @param {string} name
 * @param {string[]} args
 * @returns {Promise<{ name: string, ok: boolean, output: string, seconds: number }>}
 */
function run(name, args) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn('npx', args, { shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    child.on('close', (code) =>
      resolve({ name, ok: code === 0, output, seconds: (Date.now() - started) / 1000 }),
    );
  });
}

/**
 * Runs each stage's steps side by side, and stops after a stage that fails.
 * @param {[string, string[]][][]} stages
 */
async function check(stages) {
  for (const stage of stages) {
    const results = await Promise.all(stage.map(([name, args]) => run(name, args)));
    for (const { name, ok, output, seconds } of results) {
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${seconds.toFixed(0)} s)`);
      if (!ok) console.log(output);
    }
    if (results.some(({ ok }) => !ok)) process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const quick = process.argv.includes('--quick');
  /** @type {[string, string[]][]} */
  const fast = [
    ['typecheck', ['tsc', '-b']],
    ['eslint', ['eslint', '.']],
    ['stylelint', ['stylelint', '"src/**/*.css"', '--allow-empty-input']],
    ['format', ['prettier', '--check', '.']],
  ];
  if (!quick) {
    // The typecheck above is the build's own `tsc -b`.
    await check([fast, [['test', ['vitest', 'run']]], [['build', ['vite', 'build']]]]);
  } else {
    const status = execFileSync('git', ['status', '--porcelain=v1', '-z'], { encoding: 'utf8' });
    const tests = testsFor(changedPaths(status));
    console.log(
      tests === 'all' ? 'tests: all' : `tests reached from: ${tests.join(' ') || 'nothing'}`,
    );
    /** @type {[string, string[]][]} */
    const test =
      tests === 'all'
        ? [['test', ['vitest', 'run']]]
        : tests.length > 0
          ? [['test', ['vitest', 'related', '--run', ...tests]]]
          : [];
    await check([fast, test]);
  }
}
