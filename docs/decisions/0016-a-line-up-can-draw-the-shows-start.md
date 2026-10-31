# 0016 A line-up can draw the show's start

Accepted 2026-10-31

The Line-up read as a form: tiles and grids of options, nothing like the race
about to start. The host also wants to keep some looks and leave the rest to
chance.

- A line-up may draw its start: the show draws its opening scene in the
  chosen theme ([0015](0015-a-line-up-can-offer-themes.md)), with everyone in
  their look, and says where each person stands. The app lays its own
  controls there (choosing someone, a die, a pin) and keeps the panel with the
  chosen person's options, the themes and the buttons, so every line-up works
  alike. A line-up without a start keeps the row of tiles.
- A look can be pinned. Choosing anything by hand pins it; "Shuffle everyone"
  deals only the looks that aren't pinned; a die deals one look and unpins
  it. Pins are kept with the looks ([0011](0011-a-show-can-have-a-line-up.md)).

The show draws the scene with its own code, so the Line-up shows the race's
real track, and a show still needs no edits outside its folder
([0006](0006-scenarios-are-self-contained-folders.md)).

Enforced by `specs/line-up.feature`.
