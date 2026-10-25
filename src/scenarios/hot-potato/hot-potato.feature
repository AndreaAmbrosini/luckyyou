Feature: Hot Potato
  People stand in a ring and pass a potato with a lit sparkler hand to hand,
  fast laps first, then slower and slower while a fuse burns down. Once it
  won't come back to someone, they say "Phew!" and sit down, so the danger
  closes in on the last three standing. It crawls from the first of the three
  to the second, and pops there or on its way to the third. Once in a while
  it is flung across the ring onto someone already sitting. The unlucky person
  gets a paper crown. The contract in specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Hot Potato
      Then its name is "Hot Potato"
      And its description is "Whoever's holding it when it pops gets the job."
      And its picture is 🥔
      And it takes 2 to 12 people

  Rule: It pops in the unlucky person's hands

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then the potato pops in the unlucky person's hands
      And nobody else is holding it when it pops

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

  Rule: It goes round the ring

    Scenario: Hand to hand, one way round
      Given 8 people
      When the show runs with 20 different random seeds
      Then each pass goes to the next person round the ring, the same way all show
      And it goes clockwise in some runs, and the other way in others
      And only "Back!" in the crawl, the stray fling and a hang that drops back onto the thrower break the rule

    Scenario: Fast laps, then slower and slower
      Given 6 people
      When the show runs
      Then after the plop it goes round at least once, a pass every 0.45 seconds
      And from "Last lap!" each pass takes longer than the one before, from 0.8 to 1.8 seconds
      And from "Last lap!" whoever catches it holds it a moment before passing it on
      And whoever is next in line looks scared until it reaches them

    Scenario: Where it starts gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the potato drops into at least 5 different people's hands first
      And the number of passes before the pop differs between runs

    Scenario Outline: Nobody can count it out, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then the number of passes before the pop differs between runs

      Examples:
        | count |
        | 3     |
        | 4     |
        | 6     |

  Rule: Phew! The danger closes in

    Scenario: Safe once it won't come back
      Given 6 people
      When the last lap starts
      Then the caption is "Last lap!"
      And nobody has sat down before it
      And from then on, whoever passes it on says "Phew!" and sits down as it lands, except whoever passes first
      And sitting down, their head shrinks and drops towards their name tag, which keeps its size
      And they look happy and stay sitting until the pop

    Scenario: The last three standing
      Given 6 people
      When the last lap ends
      Then 3 people are standing, next to each other round the ring, the potato with the first of them
      And the three grow to 1.2 times their size, name tags and all
      And everyone else is sitting down

    Scenario: Who's in the last three gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds, and it doesn't stray
      Then the unlucky person is one of the last three, and never says "Phew!"
      And the two who share the last three with them are at least 5 different people across the runs
      And the unlucky person is the second of the three in some runs, and the third in others

  Rule: The crawl

    Scenario: From the first of the three to the second
      Given 6 people
      When the crawl starts
      Then the potato takes 2 seconds to go from the first of the three to the second
      And the first says "Phew!" and sits down when it reaches the second for the last time

    Scenario: Sometimes it goes back
      Given 6 people
      When the show runs with 20 different random seeds
      Then in some runs the second passes it back to the first, and the first passes it to the second again, each pass 1.5 seconds
      And in some runs it doesn't go back

    Scenario: The heartbeat
      Given 6 people
      When the show runs
      Then the heartbeat starts with "Last lap!" and comes quicker and quicker until the pop

  Rule: The last second, from the second of the three

    Scenario Outline: The last second in the ring, with <count> people
      Given <count> people
      When the show runs with 40 different random seeds
      Then in some runs they're holding on: the second of the three is the unlucky person, holds it out towards the third, hesitates, leans in, and it pops before they let go
      And in some runs it's too hot: it reaches its last spark in the second's hands, everyone gasps, they shake and fling it to the third, the unlucky person, and it pops as it lands
      And in some runs it hangs: the second's pass floats up high between the two, hangs, and drops onto the unlucky person, the third in some runs and back onto the second in others

      Examples:
        | count |
        | 3     |
        | 6     |
        | 12    |

    Scenario: A moment of stillness in the ring, then the pop
      When the show runs with each ending
      Then in the last second the potato barely moves for at least half a second: in the second's hands, held out, or at the top of its flight
      And it pops at the end of the last second, on the unlucky person

    Scenario: Held out, the potato covers no name
      Given 6 people, and the second of the three stands at the back of the ring
      When they're holding on
      Then they hold it out beside their face, on the side of the third
      And it covers neither their face nor anyone's name tag

  Rule: Once in a while it strays

    Scenario: It strays
      Given 6 people, and it strays
      When the last second comes
      Then neither of the last two standing is the unlucky person
      And it reaches its last spark in the second's hands, everyone gasps, and they shake
      And they fling it across the ring with a "Whoa!" beside them
      And it lands on the unlucky person, sitting down, and pops
      And the unlucky person stands up again, full size, for the crown

    Scenario: "Whoa!" beside them, wherever they stand
      When it strays at 6 and at 12 people, and at 4 people with seed 7
      Then the "Whoa!" is within 60 pixels of their head
      And it is on the stage, below the caption, and off the potato

    Scenario: About 1 in 8
      Given 6 people
      When the show runs with 400 different random seeds
      Then it strays in between 1 in 12 and 1 in 6 runs
      And the unlucky person is the first of the last three in some of those runs, and sat down in the last lap in others

    Scenario: With 2 people it never strays
      Given 2 people
      When the show runs with 40 different random seeds
      Then it never strays

  Rule: With 2 people they pass it back and forth

    Scenario: Two people
      Given 2 people
      When the show runs
      Then they pass it back and forth, fast and then slower
      And nobody says "Phew!", sits down or grows
      And the last second is holding on, too hot or hangs

  Rule: The sparkler is the clock everyone watches

    Scenario: The fuse burns down to the last second
      When the show runs
      Then a fuse across the top of the stage, behind everyone, burns down evenly from the plop
      And the sparkler on the potato burns down with it
      And both reach their last spark only in the last second, and the fuse is gone at the pop
      And the fuse's spark pulses, never more than 3 times a second

  Rule: The ending is a pop and a paper crown

    Scenario: The pop
      Given the unlucky person is "Luca"
      When the potato pops on "Luca"
      Then it pops into confetti
      And "Luca" gets a paper crown and celebrates
      And everyone else cheers

    Scenario: The name holds still at the end
      Given the unlucky person is "Luca"
      When the show runs
      Then "Luca" is on stage, not moving, for the last 1.5 seconds

    Scenario: The unlucky person stands out at the pop
      Given the unlucky person is "Luca"
      When the potato pops
      Then "Luca" grows to 1.3 times their size, in front of everyone
      And the burst is behind everyone, and "Pop!" covers neither Luca's head nor the crown
      And "It popped on Luca!" is up within 0.2 seconds of the pop

  Rule: About 20 seconds at 6 people

    Scenario: Each part takes about this long at 6 people
      Given 6 people
      When the show runs, with and without going back
      Then its parts take these seconds, give or take 0.3:
        | part            | without going back | going back |
        | plop            | 1.6                | 1.6        |
        | laps            | 3.6 to 4.5         | 3.6 to 4.5 |
        | last lap        | 5.0                | 5.0        |
        | crawl           | 2.0                | 5.0        |
        | the last second | 2.5                | 2.5        |
        | the pop         | 2.6                | 2.6        |

    Scenario: Every head count lands inside its bounds
      When the show runs at every head count from 2 to 12, with and without going back
      Then each run lasts between 13 and 28 seconds
      And at 4 to 7 people, each run lasts between 14.5 and 23.5 seconds

  Rule: It reads without sound

    Scenario: Captions tell the story in the ring
      Given 6 people, the unlucky person is "Fabio", the last three are "Carla", "Fabio" and "Ben", it goes back once, and Fabio holds on
      When the show runs
      Then the captions include, in this order:
        | caption                           |
        | Don't be holding it when it pops! |
        | Pass it on!                       |
        | Last lap!                         |
        | Carla…                            |
        | Fabio…                            |
        | Back!                             |
        | Fabio…                            |
        | Pass it!                          |
        | It popped on Fabio!               |

    Scenario: The crawl names each catch
      Given 6 people, and the last three are "Carla", "Fabio" and "Ben"
      When the crawl starts
      Then the caption is "Carla…", and "Fabio…" when it reaches Fabio

    Scenario: Each ending has its caption, in the ring
      When the show runs with each ending
      Then a second before the pop the caption is "Pass it!" when holding on, "Too hot!" when too hot or it strays, and "Which way…?" when it hangs

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names stay readable
      When the show runs at 12 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another

    Scenario: Bigger at 4 to 7
      When the show runs at 6 people
      Then every head standing in the ring is 100 pixels or more, and every name tag 22 pixels or more
      And no "Phew!" bubble, and no potato held by anyone, covers a name tag
