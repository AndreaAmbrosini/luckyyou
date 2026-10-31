# 0017 A theme names the choices that suit it

Accepted 2026-10-31

What [0015](0015-a-line-up-can-offer-themes.md) decided still holds: a
line-up may offer themes, one for the whole show, as postcards with
"Surprise" first; the choice is kept per show; the show is handed it, frozen,
or draws it from the seed in the lab; and it never changes the pick
([0005](0005-the-app-picks-before-the-show.md)).

What changes is which side names the match. 0015 had each choice name the
themes it suits. Instead, a theme names the choices of the first option that
suit it, in the order its tab shows them. A tab needs an order the show sets,
and a new theme then lands in one list: Christmas's tab holds three racers
older than Christmas, and Autumn's four.

- While a theme is chosen, the first option's first tab is named for it and
  holds its choices, which stay in their own groups' tabs too.
- A theme that names none has no tab.

Enforced by `specs/line-up.feature`.
