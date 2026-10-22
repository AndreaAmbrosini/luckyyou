# AGENTS.md

LuckyYou picks one unlucky person for a job nobody wants, with a short show
played over a screen share. [PRODUCT.md](PRODUCT.md) says who it's for and
how it should feel.

## How work flows

1. Behaviour starts in `specs/*.feature`: change the scenario, watch it fail,
   make it pass. Spec, steps and code go in one commit; building a `@pending`
   scenario removes its tag there.
2. A new technical choice gets the next record in `docs/decisions/`, ending
   with `Enforced by …`. Records are never rewritten: when a newer one
   replaces a record, only its status line changes, to `Superseded by NNNN`.
3. Plans and design notes go in the pull request, not the repo.
4. Run `npm run check` before every commit.

## Rules

- The app picks the unlucky person; a scenario only acts it out:
  [pick.feature](specs/pick.feature).
- A show lasts 10–20 s at every head count it accepts:
  [scenarios.feature](specs/scenarios.feature).
- 2 to 12 people per pick: [setup.feature](specs/setup.feature),
  [scenarios.feature](specs/scenarios.feature).
- Readable over a screen share; CSS colours, fonts and font sizes only as
  `var(--…)`: [styles.feature](specs/styles.feature).
- A scenario touches only its own folder: [eslint.config.js](eslint.config.js),
  [scenarios.feature](specs/scenarios.feature).

## Where to look

- The people list: [people.feature](specs/people.feature),
  [0004](docs/decisions/0004-no-backend.md).
- Setup: [setup.feature](specs/setup.feature).
- The pick: [pick.feature](specs/pick.feature),
  [0005](docs/decisions/0005-the-app-picks-before-the-show.md).
- The show: [show.feature](specs/show.feature).
- The result: [result.feature](specs/result.feature).
- A scenario or the kit: [scenarios.feature](specs/scenarios.feature),
  [kit.feature](specs/kit.feature),
  [0006](docs/decisions/0006-scenarios-are-self-contained-folders.md),
  [0010](docs/decisions/0010-shows-are-tested-on-a-hand-driven-clock.md).
- UI, copy, look: [DESIGN.md](DESIGN.md), [PRODUCT.md](PRODUCT.md),
  [styles.feature](specs/styles.feature).
- Docs: [docs.feature](specs/docs.feature),
  [0008](docs/decisions/0008-one-place-per-fact.md).
- Tooling, CI, deploy: [0001](docs/decisions/0001-toolchain-versions.md),
  [0002](docs/decisions/0002-static-site-on-github-pages.md),
  [0003](docs/decisions/0003-executable-specs.md).

## Writing docs

- Each fact lives in one place. Don't restate what the code, a spec or
  `package.json` already says.
- Give a reason only when you can point to its evidence.
- No sales adjectives. `specs/docs.feature` checks word budgets, stock
  phrases and links.

## Git

- Conventional Commits; specs use `docs(specs):`.
- Commits end with the agent's `Co-Authored-By` trailer.
- Ask before pushing or changing anything on GitHub.
