# LuckyYou

Pick one unlucky person for a job nobody wants, with a silly 10–30 second show.

In a video call, one person opens LuckyYou and shares their screen. They tick
who's here and click a show to start it. When it's over:

> **Lucky you, Marco 🎉**
>
> _Sorry for your win_

Winning is losing.

## Why

Every show is code, so it can be anything, not only a left-to-right race.
There are no accounts and no server: the team list stays in the browser that
typed it ([0004](docs/decisions/0004-no-backend.md)).

## Status

Built: the team list, setup in two steps (three for a show with a Line-up),
the pick, five shows (Shark Bait, Hot Potato, Wobbly Tower, Don't Wake the
Dog and The Race) and the result. A new show
is a folder in [`src/scenarios/`](src/scenarios/), copied from
[`_template`](src/scenarios/_template/).

## How it's built

Spec first, with Claude Code: behaviour in [`specs/`](specs/), the look in
[DESIGN.md](DESIGN.md), the reasons behind each choice in
[`docs/decisions/`](docs/decisions/), and the rules every coding session
follows in [AGENTS.md](AGENTS.md).

## Run it locally

You need Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Then open http://localhost:5173.

## How it deploys

To GitHub Pages, from `main`
([0002](docs/decisions/0002-static-site-on-github-pages.md)).
