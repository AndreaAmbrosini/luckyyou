# 0025 Surprise me draws the show apart from the pick

Accepted 2026-11-08

Pick a show preselects the show played last, so a team can replay one show
for weeks, the "same race every time" [PRODUCT.md](../../PRODUCT.md) rules
out. Surprise me lets the app choose the show.

- The show is drawn as Start is pressed, from the shows that take today's
  count, leaving out the one played last. It uses `randomIndex`, the pick's
  cryptographic source ([0005](0005-the-app-picks-before-the-show.md)), in a
  draw of its own made before the person's: neither result reads the other,
  so the pick's chances are unchanged.
- A drawn show with a Line-up starts on its last line-up, as "Start with
  last line-up" does, so nobody sees the show until it plays.
- The show played and that Surprise me was used are kept as settings, so
  Surprise me is chosen again until a show is started by hand. Run again
  replays the show that was drawn, as for any show.

Enforced by `specs/setup.feature` and `specs/pick.feature`.
