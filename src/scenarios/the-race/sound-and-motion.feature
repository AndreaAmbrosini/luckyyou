Feature: The Race's sound and motion
  The music follows the race, and the race reads without sound or with less
  motion. The rest of The Race is in the-race.feature, and the contract in
  specs/scenarios.feature applies as well.

  # The galop from Rossini's William Tell Overture, which is public domain,
  # arranged for the show as lead, oom-pah bass and drums.
  Rule: Its music follows the race

    Scenario: A drum roll, then the galop from "Go!"
      When the show runs with music on
      Then a snare roll swells under "On your marks…" and leads into the galop's first bar on "Go!"
      And the galop plays at 4.2 to 4.6 beats a second, 4 beats a bar, until "Final stretch!"

    Scenario: The final stretch starts on a bar
      When the show runs at every head count from 2 to 8, with each ending
      Then "Final stretch!" comes on the first beat of a bar

    Scenario: The final stretch is faster, and leaves the low end to the heartbeat
      When "Final stretch!" appears
      Then the galop's minor strain plays, four bars in the stretch's time
      And no kick drum plays until the line

    Scenario: The slow last moment slows the music too
      When the slow moment starts
      Then the music plays a run down, an octave lower, at a quarter of the stretch's speed, until the line

    Scenario: Silence from the line to the fanfare
      Given the unlucky person is "Anna"
      When the slow last moment ends at the line
      Then the music stops
      And the fanfare plays with "Anna wins!", as before

    # Jingle Bells (James Lord Pierpont, 1857) is public domain.
    Scenario: Jingle Bells at Christmas, the galop elsewhere
      When the show runs on Christmas with music on
      Then Jingle Bells plays instead of the galop, with sleigh bells, on the galop's beats: a roll under "On your marks…", the chorus from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare
      And the sports field, the office, under the sea and the Moon keep the galop

    # Vivaldi's The Four Seasons (1725) is public domain. The user heard it in
    # the Lab and approved it on 2026-11-01.
    Scenario: Vivaldi's Autumn on Autumn
      When the show runs on Autumn with music on
      Then the opening of Autumn from Vivaldi's The Four Seasons plays instead of the galop, on the galop's beats: a roll under "On your marks…", its first theme from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare

    # Scott Joplin's The Entertainer (1902) is public domain, arranged from his
    # score; the 1973 film's arrangement is not. Passes once the user has heard
    # it in the Lab.
    @pending
    Scenario: The Entertainer in the office
      When the show runs in the office with music on
      Then Scott Joplin's The Entertainer plays instead of the galop, on the galop's beats: a roll under "On your marks…", its first strain from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare

    # "Under the Sea" from The Little Mermaid is under copyright, so this
    # calypso is our own tune, not an echo of it. Passes once the user has
    # heard it in the Lab.
    @pending
    Scenario: A calypso of our own under the sea
      When the show runs under the sea with music on
      Then a calypso of our own plays instead of the galop, its tune on steel drums over an off-beat bass and a shaker, on the galop's beats: a shaker roll under "On your marks…", its tune from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare

    # Richard Strauss's Also sprach Zarathustra (1896) and Johann Strauss II's
    # The Blue Danube (1866) are public domain. Passes once the user has heard
    # it in the Lab.
    @pending
    Scenario: Zarathustra, then the Blue Danube, on the Moon
      When the show runs on the Moon with music on
      Then the sunrise from Zarathustra plays under "On your marks…": a low held C, the rising C, G and C, a major chord turning minor, and timpani
      And the Blue Danube's waltz plays from "Go!" instead of the galop, 3 beats a bar at the galop's beats a second, fitted to whole bars so "Final stretch!" comes on the first beat of one
      And a faster strain plays from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare

  Rule: It reads without sound

    Scenario: Captions tell the race, a thing at a time
      Given 6 people, the unlucky person is "Anna", Ben's snail and Carla's duck burst ahead, Carla's duck stops, and it ends in a photo finish
      When the show runs
      Then the captions include, in this order:
        | caption                      |
        | On your marks…               |
        | Go!                          |
        | Ben's snail finds a turbo!   |
        | Carla's duck rolls downhill! |
        | Carla's duck hits a pebble!  |
        | Final stretch!               |
        | Photo finish!                |
        | Anna wins!                   |

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Racers are drawn as big as the lanes allow
      When the show runs at 8 and at 4 people
      Then at 8 people, heads are 46 pixels or more and name tags 22 pixels or more, on the 1280 by 720 stage
      And at 4 people, heads are 84 pixels or more
      And every rider's head sits at the same height in its lane, whatever the mount

    Scenario: Name tags sit beside the face
      When the show runs at 8, at 4 and at 2 people, a 15-character name among them
      Then each name tag sits beside its rider's face, behind it, level with it, and moves with them
      And no name tag is ever over another, or over a face
      And no speech bubble covers a name tag or a face
      And each speech bubble sits by its speaker, touching their face or name tag

    Scenario: Everyone stays on stage
      When the show runs at 8 people
      Then every racer is on stage from "On your marks…" to the end

    Scenario: Riders and creatures side by side
      When the show runs at 8 and at 2 people, riders and creatures mixed, a 15-character name among them
      Then every face, a rider's or a creature's, sits at the same height in its lane
      And at 8 people, every creature's face is 46 pixels or more across
      And each name tag sits beside its racer's face, behind it, level with it, and moves with it
      And no name tag is ever over another, or over a face

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, nothing shakes
      Given reduced motion is on
      When the show runs
      Then there are no speed lines, the duck doesn't tip and the chair doesn't spin
      And the slow last moment, the photo and every caption still come, in the same order

    Scenario: With reduced motion, the new rides keep still too
      Given reduced motion is on
      When the show runs
      Then the rocket's flame doesn't flicker, and a hopper that stops doesn't bounce on the spot

    Scenario: With reduced motion, the creatures keep still too
      Given reduced motion is on
      When the show runs
      Then the monster doesn't hop with its hiccups, and the villain doesn't turn in its cape

    Scenario: With reduced motion, the things on legs keep still too
      Given reduced motion is on
      When the show runs
      Then the printer's light doesn't blink, the sticky note doesn't flutter and the ice cream doesn't drip

    Scenario: With reduced motion, the new animals and spooky creatures keep still too
      Given reduced motion is on
      When the show runs
      Then the octopus's legs don't whirl, the ghost doesn't jump and the yeti doesn't sweep its arms
