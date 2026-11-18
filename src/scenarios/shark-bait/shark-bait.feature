Feature: Shark Bait
  Everyone is in the water and a shark circles. A helicopter lifts people out
  one at a time, slower and slower, as the shark gets bolder. The last one
  left in the water gets the job, and rides off on the shark. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Shark Bait
      Then its name is "Shark Bait"
      And its description is "The last one left in the water gets the job."
      And it takes 2 to 12 people

  Rule: The unlucky person is the last one left in the water

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then everyone else is lifted out of the water
      And the unlucky person is never lifted out

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 12    | first    |
        | 12    | last     |

    Scenario: Where people start gives nothing away
      Given 12 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the unlucky person starts in at least 5 different places

  Rule: Up to 8 people, everyone is lifted out on their own, each rescue slower than the last

    Scenario Outline: <count> people
      Given <count> people
      When the show runs
      Then <pairs> rescues lift two people, and the others lift one
      And each rescue takes longer than the one before

      Examples:
        | count | pairs |
        | 12    | 4     |
        | 10    | 2     |
        | 9     | 1     |
        | 8     | 0     |
        | 6     | 0     |
        | 4     | 0     |
        | 3     | 0     |
        | 2     | 0     |

    Scenario Outline: Everyone lifted out is named until they leave the stage, with <count> people
      Given <count> people
      When the show runs
      Then everyone lifted out hangs from the rope with their name beside them, at 30 pixels or more
      And their name stays shown until they are off the stage

      Examples:
        | count |
        | 12    |
        | 7     |
        | 2     |

    Scenario: The helicopter flies them off slowly enough to follow
      Given 12 people
      When the show runs
      Then after each rescue, the helicopter flies off for at least 0.4 seconds

    Scenario: The last two get a duel
      Given the last two in the water are "Marco", the unlucky person, and "Giulia"
      When the rope comes down for them
      Then it goes towards "Marco" first
      And it swings to "Giulia", who is lifted out

    Scenario Outline: The duel swings back and forth, and hangs over the one it lifts
      Given <count> people
      When the show runs
      Then the helicopter swings back and forth at least 3 times before it lifts one
      And it holds still longest over the one it lifts, before the hook comes down, leaving out any slip

      Examples:
        | count |
        | 2     |
        | 3     |
        | 12    |

    Scenario Outline: Sometimes the unlucky person slips off the hook, with <count> people
      Given <count> people, and the unlucky person is "Marco"
      When the show runs with 20 different random seeds
      Then in some runs the hook catches "Marco" in the duel, and "Marco" slips off and falls back in
      And in those runs it is captioned "Whoops! Marco slipped!", and the rope then lifts the other one
      And in some runs nobody slips

      Examples:
        | count |
        | 2     |
        | 12    |

    Scenario Outline: Sometimes the helicopter changes its mind, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then in some runs, during the duel, it sets off towards one of the two and turns back halfway
      And in some runs it never turns back halfway

      Examples:
        | count |
        | 2     |
        | 12    |

    Scenario: Fake-outs go both ways
      Given 12 people
      When the show runs with 20 different random seeds
      Then in some runs a one-at-a-time rescue swings away and back to the same person
      And in some runs it swings to someone else

    Scenario: The rope stops over each person it heads for
      When the show runs at every head count from 3 to 12, with both kinds of fake-out
      Then the helicopter holds still over each person the rope heads for, for at least 0.15 seconds

  # The owner asked for about 25 seconds at 6 people on 2026-11-18, and no
  # more than 28.5 at 12.
  Rule: The show lasts about 25 seconds at 6 people

    Scenario: Each beat takes about this long
      When the show runs at 12, 6, 4 and 2 people
      Then its beats take these seconds, give or take 0.3:
        | beat                     | 12 people | 6 people | 4 people | 2 people |
        | splash-in                | 3.0       | 3.0      | 3.0      | 3.0      |
        | rescues before 4 left    | 10.0      | 4.6      | 0        | 0        |
        | 4 left, one lifted out   | 3.0       | 3.5      | 3.3      | 0        |
        | 3 left, a fake-out       | 3.7       | 4.4      | 4.0      | 0        |
        | the duel                 | 4.7       | 5.6      | 5.1      | 6.2      |
        | the shark's run          | 1.6       | 1.6      | 1.6      | 1.7      |
        | the victory lap          | 2.2       | 2.2      | 2.2      | 2.5      |

    Scenario: Each head count lasts this long, whoever is unlucky
      When the show runs at every head count from 2 to 12, with 4 different random seeds each
      Then every run lasts these seconds, give or take 0.1:
        | people | seconds |
        | 2      | 13.4    |
        | 3      | 16.2    |
        | 4      | 19.2    |
        | 5      | 22.2    |
        | 6      | 25.0    |
        | 7      | 26.4    |
        | 8      | 27.4    |
        | 9      | 27.6    |
        | 10     | 27.8    |
        | 11     | 28.0    |
        | 12     | 28.2    |

  Rule: The shark gets bolder as the water empties

    Scenario: A fin comes up once everyone is in the water
      Given 6 people
      When the show runs
      Then no fin shows until everyone has popped up in the water
      And then a fin comes up, captioned "Is that a fin?"

    Scenario Outline: The fin grows and crosses quicker as people leave, with <count> people
      Given <count> people
      When the show runs
      Then the fin never shrinks, and it is bigger in the duel than when it comes up
      And it crosses the water quicker in the duel than when it comes up

      Examples:
        | count |
        | 12    |
        | 6     |
        | 4     |

  Rule: The ending is a victory lap

    Scenario: The shark goes for the last one, who rides off on it
      Given the unlucky person is "Marco"
      When everyone else has been lifted out
      Then the helicopter leaves
      And the shark heads straight for "Marco" and dives
      And the water stays still for half a second
      And "Marco" comes up riding the shark, celebrating

    Scenario: A long name on the fin stays as big as the duel's
      Given the unlucky person is "Wolfeschlegelsteinhausenberger"
      When the show runs
      Then the name on the shark's fin is set at 48 pixels or more, on at most two lines

    Scenario: The name holds still at the end
      Given the unlucky person is "Marco"
      When the show runs
      Then "Marco" is on the shark's fin, not moving, for the last 1.5 seconds

  # Music of our own. The user asked for John Williams's Jaws theme (1975),
  # which is under copyright, and chose this instead: a low half step, two
  # notes over and over, with nothing else from his score. The user heard it
  # in the Lab and approved it on 2026-11-05.
  Rule: Its music is the shark's

    Scenario: A dun-dun from the splash-in, and nothing else
      When the show runs with music on
      Then a low half step, two notes over and over, starts with the splash-in
      And nothing else plays: no tune, no chords, no drums

    Scenario Outline: The dun-dun quickens all the way to the dive, with <count> people
      When the show runs with <count> people, with a slip, with a feint and with neither
      Then the dun-dun gets quicker with every note, from 2 a second at the splash-in to 10 as the shark dives
      And it plays on under each heartbeat, quieter, without a pause

      Examples:
        | count |
        | 2     |
        | 4     |
        | 12    |

    Scenario: The dive cuts it
      Given the unlucky person is "Marco"
      When the shark heads for "Marco"
      Then the music stops at the dive, and doesn't come back
      And the fanfare plays as "Marco" comes up riding the shark, as before

  Rule: It reads without sound

    Scenario: Captions tell the story
      Given 12 people, and the unlucky person is "Marco"
      When the show runs
      Then the captions include, in this order:
        | caption                            |
        | Last one in the water gets the job |
        | Is that a fin?                     |
        | Whoosh! 10 left                    |
        | Whoosh! 8 left                     |
        | Whoosh! 6 left                     |
        | 4 left…                            |
        | Uh-oh…                             |
        | Last one in the water!             |
      And every fake-out is captioned "It's going for <name>… nope, <other name>!"

    Scenario Outline: The duel's caption, with <count> people
      Given <count> people, the last two in the water "Marco", the unlucky person, and "Giulia"
      When the rope comes down for them
      Then the duel is captioned <captions>

      Examples:
        | count | captions                                                         |
        | 3     | "Marco or Giulia?"                                               |
        | 2     | "Marco…", "Marco… Giulia…", "Marco… Giulia… Marco…", "Marco… Giulia… Marco… Giulia!" |

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names grow as people leave
      When the show runs at 12 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And the last two name tags are set at 48 pixels or more
