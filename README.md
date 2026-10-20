# LuckyYou

Pick one unlucky person for a job nobody wants, with a silly 10–15 second show.

In a video call, one person opens LuckyYou and shares their screen. They tick
who's here, optionally type what's at stake (_"Who writes the release
notes?"_), pick a show and start it. When it's over:

> **Lucky you, Marco 🎉**
>
> _Sorry for your win_

Winning is losing.

## Why

We used to pick with the race timers at online-stopwatch.com. They're fun,
but freemium, and every one of them is the same left-to-right race with
different pictures. In LuckyYou every show is code, so it can be anything,
not only a race.

## Status

The behaviour is written down; the app isn't built yet. Its specs are all
pending, and the screens come next.

## How it's built

Spec first, with Claude Code: behaviour in [`specs/`](specs/), the reasons
behind each choice in [`docs/decisions/`](docs/decisions/), and the rules
every coding session follows in [AGENTS.md](AGENTS.md).

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
