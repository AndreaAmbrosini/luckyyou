# 0006 Scenarios are self-contained folders

Accepted 2026-10-21

Scenarios will keep coming, mostly written by asking an agent, so adding one
must not mean editing the app. A scenario is one folder,
`src/scenarios/<id>/`, found at build time with `import.meta.glob`. There is
no list to update. Folders starting with `_`, like the template, are skipped.

A scenario gets a plain DOM element to draw in, not React, and imports only
from its own folder, the scenario kit and GSAP. Its styles are CSS modules,
so class names never clash between folders. Nothing in the app depends on a
scenario and no scenario depends on the app's internals, so each one can be
read, tested and deleted on its own.

Enforced by `eslint.config.js` and `specs/scenarios.feature`.
