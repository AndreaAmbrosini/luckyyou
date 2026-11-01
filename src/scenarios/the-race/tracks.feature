Feature: The Race's tracks
  Each theme is a track of its own, with its ground, backdrop and events. The
  rest of The Race is in the-race.feature, and the contract in
  specs/scenarios.feature applies as well.

  Rule: The track is the theme's

    Scenario: The race runs on the theme chosen
      Given "Under the sea" is chosen on the Line-up
      When the show runs with 10 different random seeds
      Then every run is under the sea

    Scenario: In the lab, every theme comes up
      Given 8 people
      When the show runs in the lab with 40 different random seeds
      Then each run is on one of the themes, and each theme comes up in at least 5 runs

    Scenario Outline: What <track> looks like
      When the show runs on <track>
      Then the ground is <ground>, and paper name tags read clearly on it
      And behind the track is <backdrop>
      And the lanes are split by <lines>, and the distances are <signs>

      Examples:
        | track            | ground                 | backdrop                                                  | lines              | signs                          |
        | the sports field | grass                  | sky, clouds, bunting and a rail with posts                | paper lines        | signs on posts                 |
        | the office       | grey carpet            | a wall with windows, a clock, low partitions and a plant  | sun tape           | sticky notes on the partitions |
        | under the sea    | sand                   | the sea, with fish, bubbles, seaweed and a rope of floats | orange stripes     | signs on posts                 |
        | the Moon         | grey dust with craters | a dark sky with stars, the Earth and a ringed planet      | dashed paper lines | signs on posts                 |

    Scenario Outline: <track> has a stop and a burst of its own
      Given 8 people, on <track>
      When the show runs with 20 different random seeds
      Then in every run, one event before "Final stretch!" is the track's own stop or burst
      And both come up across the runs

      Examples:
        | track         |
        | the office    |
        | under the sea |
        | the Moon      |

    Scenario: The sports field keeps the events it has
      When the show runs on the sports field
      Then every event is a racer's own burst or stop

    Scenario Outline: On <track>, <caption>
      When someone's event is <track>'s own <event>
      Then the caption is "<caption>"
      And <what>

      Examples:
        | track         | event | caption                          | what                                                                                                             |
        | the office    | stop  | Ben stops at the coffee machine! | a coffee machine stands by the wall, Ben's racer holds a paper cup, says "Phew!" and sets off again further back |
        | the office    | burst | Ben slides on a wet floor!       | a yellow wet-floor sign stands in the lane and Ben's racer skids into the lead, shouting "Nooo!"                 |
        | under the sea | stop  | Marco gets tangled in seaweed!   | seaweed wraps round Marco's racer until it shakes free, says "Phew!" and sets off again further back             |
        | under the sea | burst | Marco catches a current!         | swirls carry Marco's racer into the lead, shouting "Nooo!"                                                       |
        | the Moon      | stop  | Anna floats off the ground!      | Anna's racer drifts up over its shadow, says "Phew!", lands and sets off again further back                      |
        | the Moon      | burst | Anna does a moon bounce!         | Anna's racer bounds into the lead in one long, slow hop, shouting "Nooo!"                                        |

    Scenario Outline: On <track>, the unlucky person still crosses first
      Given 8 people, on <track>
      When the show runs with 20 different random seeds
      Then the first nose over the finish line is always the unlucky person's

      Examples:
        | track            |
        | the sports field |
        | the office       |
        | under the sea    |
        | the Moon         |

    Scenario: The photo shows the track
      Given a photo finish on the Moon
      When the photo pops up
      Then it shows the Moon's ground and its finish line behind the two racers

    Scenario: Every track keeps the show inside the limit
      When the show runs at 2, 5 and 8 people on each track, with each ending
      Then each run lasts between 14 and 25 seconds

    Scenario: Every track reads over a screen share
      When the show runs on each track at 8 people
      Then every caption, sign and name tag is ink text on a paper or sun sticker with an ink outline
      And on the Moon's dark sky, nothing but those stickers carries text
