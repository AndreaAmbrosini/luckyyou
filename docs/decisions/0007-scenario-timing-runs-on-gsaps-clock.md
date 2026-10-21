# 0007 Scenario timing runs on GSAP's clock

Superseded by 0010

A show has a fixed time limit and must stop at once when it is cancelled. So
scenario timing runs on one clock, GSAP's. The kit's `wait` and `play`
helpers wait on it and reject when the run is aborted; scenarios use them
instead of `setTimeout`, `setInterval` or animation-frame loops of their own,
which keep running after a cancel unless someone stops them.

One clock also keeps the contract fast: tests fake it, and a full show runs
in milliseconds. GSAP keeps a reference to `Date.now` from the moment it
loads, so the fake clock has to be installed before anything that imports
GSAP.

Enforced by `specs/scenarios.feature`.
