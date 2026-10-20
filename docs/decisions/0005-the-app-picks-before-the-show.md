# 0005 The app picks before the show

Accepted 2026-10-21

Anyone can write a scenario, so who gets picked must not depend on scenario
code. The app picks as the show starts, before the scenario runs, and hands
the scenario the result together with a frozen copy of the names. A scenario
can act the pick out; it can't change it, for this run or a later one.

The draw uses the browser's cryptographic source, `crypto.getRandomValues`,
with rejection sampling: a 32-bit draw that lands in the uneven tail of the
range is thrown away and drawn again, so taking the remainder never favours
the first names in the list. Everyone has the same chance.

Enforced by `specs/pick.feature`.
