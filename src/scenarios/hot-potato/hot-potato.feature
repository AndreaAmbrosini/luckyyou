Feature: Hot Potato
  People stand in a ring and pass a potato with a lit sparkler hand to hand,
  fast laps first, then slower and slower while a fuse burns down. Once it
  won't come back to someone, they say "Phew!" and sit down, so the danger
  closes in on the last three standing. It crawls from the first of the three
  to the second, and pops there or on its way to the third. Once in a while
  it is flung across the ring onto someone already sitting. The unlucky person
  gets a paper crown. The contract in specs/scenarios.feature applies as well.

  # Scenarios marked "Old design" describe the show before the ring: throws
  # anywhere, a dud, a showdown and a duel. The build deletes each one, with
  # its steps, when the scenarios that replace it pass.

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

    # Old design: replaced by "Where it starts gives nothing away".
    Scenario: Who catches it first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the potato drops into at least 5 different people's hands first
      And in some runs the unlucky person catches it before the showdown, and in some runs not

  @pending
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

  @pending
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

  @pending
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

  @pending
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

  @pending
  Rule: Once in a while it strays

    Scenario: It strays
      Given 6 people, and it strays
      When the last second comes
      Then neither of the last two standing is the unlucky person
      And it reaches its last spark in the second's hands, everyone gasps, and they shake
      And they fling it across the ring with a "Whoa!"
      And it lands on the unlucky person, sitting down, and pops
      And the unlucky person stands up again, full size, for the crown

    Scenario: About 1 in 8
      Given 6 people
      When the show runs with 400 different random seeds
      Then it strays in between 1 in 12 and 1 in 6 runs
      And the unlucky person is the first of the last three in some of those runs, and sat down in the last lap in others

    Scenario: With 2 people it never strays
      Given 2 people
      When the show runs with 40 different random seeds
      Then it never strays

  @pending
  Rule: With 2 people they pass it back and forth

    Scenario: Two people
      Given 2 people
      When the show runs
      Then they pass it back and forth, fast and then slower
      And nobody says "Phew!", sits down or grows
      And the last second is holding on, too hot or hangs

  Rule: Throws speed up, then slow down for a showdown

    # Old design: replaced by "Phew! The danger closes in".
    Scenario: Everyone else steps back
      Given 8 people
      When the showdown starts
      Then the 5 people out of play step back, smaller and relieved
      And the potato only goes to the 3 in play until it pops

    # Old design: replaced by "Who's in the last three gives nothing away".
    Scenario: Who is in the showdown gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the unlucky person is the first to catch it in the showdown in some runs, and not in others

    # Old design: replaced by "Fast laps, then slower and slower" and "The last three standing".
    Scenario Outline: Three become two, with <count> people
      Given <count> people
      When the show runs
      Then each throw before the showdown is quicker than the one before
      And 3 people are left in play for the showdown, the unlucky person among them
      And after two catches, one of the three who isn't holding it says "Phew!" and steps back
      And the other two face each other in the duel, the unlucky person among them
      And each throw from the start of the showdown to the end of the duel takes longer than the one before

      Examples:
        | count |
        | 12    |
        | 8     |
        | 3     |

    # Old design: replaced by "Two people".
    Scenario: With 2 people it is a duel from the start
      Given 2 people
      When the show runs
      Then each throw before the duel is quicker than the one before
      And there is no showdown, and nobody says "Phew!"
      And the duel has 5 throws, each longer than the one before

    # Old design: replaced by "The last three standing" and "The heartbeat".
    Scenario: The duel
      Given 8 people
      When the duel starts
      Then the last two step into the middle and face each other, drawn big, their name tags at 40 pixels or more
      And the other 6 shrink back behind them and watch, worried
      And the potato only goes between the two until it pops
      And the sparkler is a short stub that flickers, never more than 3 times a second
      And the heartbeat comes quicker and quicker until the pop

    # Old design: replaced by "Who's in the last three gives nothing away".
    Scenario: Who says "Phew!" gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then at least 2 different people say "Phew!", and never the unlucky person
      And the unlucky person is holding it when the duel ends in some runs, and not in others

  Rule: The sparkler is the clock everyone watches

    # Old design: replaced by "The fuse burns down to the last second".
    Scenario: It burns down to the last second
      When the show runs
      Then the sparkler is shorter at each throw than at the one before, except when it relights
      And it reaches its last spark only in the last second, and burns until the pop

    # Old design: the dud is dropped; delete it with its steps.
    Scenario Outline: Sometimes it seems to go out, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then in some runs the sparkler goes out before the showdown, everyone relaxes, and it relights shorter
      And in some runs it never goes out

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    @pending
    Scenario: The fuse burns down to the last second
      When the show runs
      Then a fuse across the top of the stage, behind everyone, burns down evenly from the plop
      And the sparkler on the potato burns down with it
      And both reach their last spark only in the last second, and the fuse is gone at the pop
      And the fuse's spark pulses, never more than 3 times a second

  Rule: The last second could go either way

    # Old design: replaced by "The last second in the ring, with <count> people" and "It strays".
    Scenario Outline: The last second, with <count> people
      Given <count> people
      When the show runs with 30 different random seeds
      Then in some runs it gets too hot: the sparkler reaches its last spark in the other one's hands, everyone gasps, they fling it away, and it pops as it lands on the unlucky person
      And in some runs it hangs in the air: the last throw floats up slowly, high between the two, then drops onto the unlucky person and pops
      And in some runs the unlucky person holds on: they wind up to throw, hesitate, and it pops just before they let go

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    # Old design: replaced by "A moment of stillness in the ring, then the pop".
    Scenario: A moment of stillness, then the pop
      When the show runs with each ending
      Then in the last second the potato barely moves for at least half a second: in the other one's hands, at the top of its flight, or in the unlucky person's raised hands
      And it pops at the end of the last second, on the unlucky person

    # Old design: replaced by "The last second in the ring, with <count> people".
    Scenario: Hanging in the air gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds, and the potato hangs in the air
      Then the last throw comes from the unlucky person in some runs, and from the other one in others
      And at the top of its flight the potato is about halfway between the two

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

  Rule: The beats keep every show a second or more inside the limit

    # Old design: replaced by "Each part takes about this long at 6 people".
    Scenario: Each beat takes about this long now
      When the show runs at 12, 8 and 2 people, with the sparkler going out
      Then its beats take these seconds, give or take 0.3:
        | beat            | 12 people | 8 people | 2 people |
        | plop            | 1.6       | 1.6      | 1.6      |
        | hot hands       | 3.4       | 3.2      | 3.0      |
        | a dud           | 1.8       | 1.8      | 1.8      |
        | it relights     | 1.0       | 1.0      | 1.0      |
        | the showdown    | 2.6       | 2.6      | 0        |
        | the duel        | 4.1       | 4.1      | 6.7      |
        | the last second | 2.0       | 2.0      | 2.0      |
        | the pop         | 2.6       | 2.6      | 2.6      |

    # Old design: replaced by "Every head count lands inside its bounds".
    Scenario: Every head count lands inside the new limits
      When the show runs at every head count from 2 to 12, with and without the sparkler going out
      Then each run with the sparkler going out lasts between 18.5 and 19.5 seconds
      And each run without it lasts between 15.8 and 16.5 seconds

  @pending
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

    # Old design: replaced by "Captions tell the story in the ring".
    Scenario: Captions tell the story to the end
      Given 8 people, the unlucky person is "Luca", the sparkler goes out once, and it gets too hot at the end
      When the show runs
      Then the captions include, in this order:
        | caption                           |
        | Don't be holding it when it pops! |
        | Faster… faster…                   |
        | …a dud?                           |
        | Nope! Still lit!                  |
        | Uh-oh…                            |
        | Too hot!                          |
        | It popped on Luca!                |

    # Old design: replaced by "The crawl names each catch".
    Scenario: The duel names each catch
      Given 8 people, and the duel's catches go to "Priya", "Tom" and "Priya"
      When the show runs
      Then the duel is captioned "Priya…", "Tom…" and "Priya…"

    # Old design: replaced by "Each ending has its caption, in the ring".
    Scenario: Each ending has its caption
      When the show runs with each ending
      Then a second before the pop the caption is "Too hot!", "Which way…?" or "Throw it!", for each ending in turn

    @pending
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

    @pending
    Scenario: The crawl names each catch
      Given 6 people, and the last three are "Carla", "Fabio" and "Ben"
      When the crawl starts
      Then the caption is "Carla…", and "Fabio…" when it reaches Fabio

    @pending
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

    @pending
    Scenario: Bigger at 4 to 7
      When the show runs at 6 people
      Then every head standing in the ring is 100 pixels or more, and every name tag 22 pixels or more
      And no "Phew!" bubble, and no potato held by anyone, covers a name tag
