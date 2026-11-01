# 0021 A show supplies a still for its card

Accepted 2026-11-01

Pick a show's cards open with a picture from each show, as the design does.
A show's metadata names its still: the URL of an image in its own folder,
imported in its `index.ts` so the build bundles it
([0006](0006-scenarios-are-self-contained-folders.md)). It replaces the
card's emoji. A show without one is skipped, like any other metadata problem.

- WebP at 640 × 360: 16 : 9, sharp on a card on a screen with twice the
  pixels, and well under 100 KB, so the static site stays light
  ([0002](0002-static-site-on-github-pages.md)).
- Made from the show itself: `npm run still` plays it in Chromium on a
  hand-driven clock to a moment, as the tests do
  ([0010](0010-shows-are-tested-on-a-hand-driven-clock.md)), and cuts it as
  the design does, a zoom and a point that stays put. The same arguments
  make the same still, and each `index.ts` says its own, so a show that
  changes how it looks can make its still again.

Enforced by `specs/scenarios.feature` and `specs/kit.feature`.
