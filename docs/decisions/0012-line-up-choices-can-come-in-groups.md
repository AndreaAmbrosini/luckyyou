# 0012 Line-up choices can come in groups

Superseded by 0013

The Race's racer option holds sixteen choices: eight rides and eight
creatures. Split into two options, a look could hold a ride and a creature at
once. So a choice may name a group (`group`, a label such as "Rides"), and the
Line-up shows an option's choices under their group labels, the groups in the
order their first choices come. An option whose choices name no group is one
row, as in [0011](0011-a-show-can-have-a-line-up.md).

A look still holds one choice per option, so stored looks, "Surprise me" and
"Shuffle everyone" work as before, and nothing chosen reaches the pick
([0005](0005-the-app-picks-before-the-show.md)).

Enforced by `specs/line-up.feature`.
