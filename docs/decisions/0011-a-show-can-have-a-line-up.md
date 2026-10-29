# 0011 A show can have a line-up

Accepted 2026-10-29

The Race lets the person sharing their screen choose how each racer looks
before it starts, and later shows may want the same. A show declares its
line-up in its metadata: the options (for the race, a ride, a colour and an
extra), their choices, and a function that draws one person's look into a DOM
element. The app shows the Line-up step, so every line-up looks and works the
same, and keeps each person's looks per show in this browser
(`luckyyou:v1:line-up:<show id>`), read defensively as
[0004](0004-no-backend.md) says. The show is handed the looks with the names.

A show with a line-up still needs no edits outside its folder
([0006](0006-scenarios-are-self-contained-folders.md)). Looks only change how
people are drawn: the app still picks as the show starts
([0005](0005-the-app-picks-before-the-show.md)), and nothing chosen reaches
the pick.

Enforced by `specs/line-up.feature` and `specs/pick.feature`.
