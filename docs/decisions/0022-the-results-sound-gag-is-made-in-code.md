# 0022 The result's sound gag is made in code

Accepted 2026-11-08

As the name lands, the result plays a brass ta-da that deflates into a sad
trombone. Like the shows' sounds and music
([0014](0014-show-music-is-made-in-code-and-follows-show-time.md)), it is
made with Web Audio from tones: no audio files and no licences to track.

- It lives with the result, in `src/screens/taDa.ts`, not in the scenario
  kit: no show uses it, and the kit stays the shows'
  ([0006](0006-scenarios-are-self-contained-folders.md)).
- It follows the run's sound switch: a muted run opens no audio output. The
  music switch leaves it alone, as it isn't music.
- It is timed on the audio clock from the result's reveal: the chord lands
  with the name, and the trombone's last note with the ribbon. Leaving the
  result closes its output.
- The result reads the same with the sound off.

Enforced by `specs/result.feature`.
