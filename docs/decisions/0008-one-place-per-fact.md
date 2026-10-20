# 0008 One place per fact

Accepted 2026-10-21

Agents load some docs in every session and people skim the rest, so a doc
that repeats the code, or another doc, costs tokens and drifts out of date.
Each fact has one home: behaviour in `specs/`, reasons in `docs/decisions/`,
the rules for working here in `AGENTS.md`, who the app is for and how it
should feel in `PRODUCT.md`, the front door in `README.md`, commands in
`package.json`. `CLAUDE.md` only imports `AGENTS.md`. Plans and design notes
go in pull requests, not the repo.

Two checks keep it that way. `specs/docs.feature` holds each doc to a word
budget, bans stock phrases and fails on broken links. A Claude Code `Stop`
hook asks a session, once, to look at the docs when it changed code but no
spec or doc.

Enforced by `specs/docs.feature` and `scripts/docs-reminder.mjs`.
