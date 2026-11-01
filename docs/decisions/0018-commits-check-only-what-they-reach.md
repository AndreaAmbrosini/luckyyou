# 0018 Commits check only what they reach

Accepted 2026-11-01

A full `npm run check` took 2.5 to 9 minutes on the same code, depending on
what else the machine was running, and each slow run failed with timeouts.
Every step of a feature ran it on each commit.

- `npm run check-quick` runs before each commit: the typecheck, lint and
  format side by side, and only the tests the uncommitted changes can reach,
  through `vitest related`. A feature maps to its test file of the same name;
  a config or a deleted file runs every test. It skips the build.
- `npm run check` runs every check before a merge into `main` or a commit on
  it, and CI runs every check on each push.
- A test's timeout only has to catch a show that never ends, so it is two
  minutes. Vitest runs one worker per core.
- A test file runs in one worker, so the slowest file is the suite's floor.
  The Race's feature is split by rule into files of its own.

Enforced by `scripts/check.mjs` and `scripts/check.test.ts`.
