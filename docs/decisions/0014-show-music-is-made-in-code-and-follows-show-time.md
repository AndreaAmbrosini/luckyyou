# 0014 Show music is made in code and follows show time

Accepted 2026-10-31

The Race gets music under its show, and other shows may follow. Like the
sounds, music is made with Web Audio from tones and noise: no audio files and
no licences to track. A tune is our own, or a public-domain one we arrange.

- A show writes its tune in its own folder, as notes on a beat grid, and hands
  it to the kit's music player
  ([0006](0006-scenarios-are-self-contained-folders.md)).
- Each frame, the show tells the player where the song is and how fast it is
  moving, worked out from show time
  ([0010](0010-shows-are-tested-on-a-hand-driven-clock.md)). A show that slows
  down slows its music; one that ends or is cancelled stops it; notes the show
  has passed stay unplayed.
- Music has its own switch and volume, kept in this browser. The sound switch
  still silences everything.

Enforced by `specs/kit.feature`, `specs/show.feature` and `specs/setup.feature`.
