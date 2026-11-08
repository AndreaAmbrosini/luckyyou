# 0024 The setup steps fit the window

Accepted 2026-11-08

Hosts often share a window that isn't maximised. At 800 × 600 the header
took three rows and the bar two, and on Pick a show they covered the cards.
At 1920 × 1080 the steps sat small in empty ground.

- The header and the bar keep to one row. While a row spills out,
  `src/ui/useFold.ts` folds it a step at a time, adding a name to its
  `data-fold`; its stylesheet says what each fold puts away, and folded text
  is still read out. It measures rather than using media queries, as what
  fits depends on the names and the chosen show.
- The Line-up scrolls between the header and the bar when it can't fit.
- The steps are sized in rem, and the root font grows with a window over
  about 1460 × 920 (`--size-root`), up to half as big again.

Enforced by `specs/setup.feature` and `specs/line-up.feature`.
