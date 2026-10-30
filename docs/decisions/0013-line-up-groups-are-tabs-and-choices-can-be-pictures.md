# 0013 Line-up groups are tabs, and choices can be pictures

Accepted 2026-10-30

The Race offers 30 racers. Under group labels
([0012](0012-line-up-choices-can-come-in-groups.md)) they no longer fit a
1280×800 window, and a word chip doesn't show what a racer looks like.

- A choice still names its group (`group`), and a look still holds one choice
  per option. An option whose choices come in groups shows a tab per group,
  opening on the tab that holds the chosen person's choice.
- An option can show its choices as pictures: the person drawn with each
  choice in the rest of their look (the show's `draw`), or a picture the show
  gives each choice. The label stays the choice's name for screen readers.

Stored looks, "Surprise me" and "Shuffle everyone" work as before, and nothing
chosen reaches the pick ([0005](0005-the-app-picks-before-the-show.md)).

Enforced by `specs/line-up.feature`.
