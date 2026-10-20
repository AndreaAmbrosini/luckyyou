# 0003 Executable specs

Accepted 2026-10-21

What the app does is written in Gherkin, in `specs/*.feature`, and each
feature runs as tests through vitest-cucumber. A feature's test file fails
when a scenario or step has no implementation, so a spec can't say one thing
while the tests check another.

Gherkin covers what a user or a scenario author can see. Internals, like how
a random number avoids bias, stay plain Vitest unit tests: Given/When/Then
adds nothing there.

A behaviour that is agreed but not built carries `@pending`. `describeSpec`
lists each pending scenario as a todo, so every test run shows what is left.
Building one means removing its tag in the same commit as its steps and code.

Enforced by vitest-cucumber in `npm test`, through `specs/support/spec.ts`.
