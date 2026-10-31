# 0015 A line-up can offer themes

Accepted 2026-10-31

The host wants to choose where The Race runs, Christmas in December say, or
leave it to chance, and to find the racers that suit it. Until now the show
drew its track at random.

- A line-up may offer themes: one choice for the whole show, not per person,
  each with a name and a picture. The Line-up shows them as postcards with
  "Surprise" first, which draws a theme at once and shows it. The choice is
  kept per show with the looks ([0011](0011-a-show-can-have-a-line-up.md)); a
  kept "Surprise" draws afresh each time the Line-up opens.
- A choice of a person's option may name the themes it suits. While one of
  them is chosen, the option's first tab is named for it and holds those
  choices, which stay in their own groups' tabs too
  ([0013](0013-line-up-groups-are-tabs-and-choices-can-be-pictures.md)).
- The show is handed the theme, frozen, as it is the looks. In the lab it is
  drawn from the run's seed, unless one is chosen there.

A theme only changes how the show looks: the app still picks as the show
starts ([0005](0005-the-app-picks-before-the-show.md)).

Enforced by `specs/line-up.feature`.
