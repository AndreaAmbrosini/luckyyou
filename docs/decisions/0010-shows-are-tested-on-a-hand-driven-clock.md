# 0010 Shows are tested on a hand-driven clock

Accepted 2026-10-21

What [0007](0007-scenario-timing-runs-on-gsaps-clock.md) decided still holds:
a show's timing runs on GSAP's clock. The kit's `wait` and `play` wait on it
and reject the moment the show is cancelled, and a scenario sets no timers or
animation-frame loops of its own.

What changes is how tests drive that clock. Instead of a fake clock installed
before GSAP loads, `runShow` takes GSAP's root timeline off the browser's
frames, as GSAP's own docs show, and moves it with `gsap.updateRoot` one frame
at a time. Nothing has to load first, Testing Library's timers are left alone,
and a test can check every frame of a 13-second show in a fraction of a
second.

The harness also counts the elements, animations, timers and listeners a show
leaves behind, so the contract can hold every scenario to cleaning up.

Enforced by `specs/scenarios.feature` and `src/scenario-kit/testing.ts`.
