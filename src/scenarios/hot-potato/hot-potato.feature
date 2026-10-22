Feature: Hot Potato
  People stand in a ring and throw a potato with a lit sparkler, faster and
  faster. The sparkler burns down, seems to go out, relights, and the throws
  slow to a showdown between three, then a duel between two. In the last
  second it could still go either way. The potato pops in the unlucky
  person's hands, and they get a paper crown. The contract in specs/scenarios.feature
  applies as well.

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

    Scenario: Who catches it first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the potato drops into at least 5 different people's hands first
      And in some runs the unlucky person catches it before the showdown, and in some runs not

  Rule: Throws speed up, then slow down for a showdown

    Scenario Outline: <count> people
      Given <count> people
      When the show runs
      Then each throw before the showdown is quicker than the one before
      And <in play> people are left in play for the showdown, the unlucky person among them
      And each throw in the showdown takes longer than the one before

      Examples:
        | count | in play |
        | 12    | 3       |
        | 8     | 3       |
        | 3     | 3       |
        | 2     | 2       |

    Scenario: Everyone else steps back
      Given 8 people
      When the showdown starts
      Then the 5 people out of play step back, smaller and relieved
      And the potato only goes to the 3 in play until it pops

    Scenario: Who is in the showdown gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the unlucky person is the first to catch it in the showdown in some runs, and not in others

    @pending
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

    @pending
    Scenario: With 2 people it is a duel from the start
      Given 2 people
      When the show runs
      Then each throw before the duel is quicker than the one before
      And there is no showdown, and nobody says "Phew!"
      And the duel has 5 throws, each longer than the one before

    @pending
    Scenario: The duel
      Given 8 people
      When the duel starts
      Then the last two step into the middle and face each other, drawn big, their name tags at 40 pixels or more
      And the other 6 shrink back behind them and watch, worried
      And the potato only goes between the two until it pops
      And the sparkler is a short stub that flickers, never more than 3 times a second
      And the heartbeat comes quicker and quicker until the pop

    @pending
    Scenario: Who says "Phew!" gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then at least 2 different people say "Phew!", and never the unlucky person
      And the unlucky person is holding it when the duel ends in some runs, and not in others

  Rule: The sparkler is the clock everyone watches

    Scenario: It burns down to the pop
      When the show runs
      Then the sparkler is shorter at each throw than at the one before, except when it relights
      And it is at its last spark only while the unlucky person holds the potato, just before the pop

    @pending
    Scenario: It burns down to the last second
      When the show runs
      Then the sparkler is shorter at each throw than at the one before, except when it relights
      And it reaches its last spark only in the last second, and burns until the pop

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

  Rule: The last throw can twist

    Scenario Outline: The last throw, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then in some runs the last throw goes to someone else, who throws it straight back to the unlucky person
      And in some runs the unlucky person throws it away and it curves back to them
      And in some runs it simply lands with the unlucky person

      Examples:
        | count |
        | 2     |
        | 8     |

  @pending
  Rule: The last second could go either way

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

    Scenario: A moment of stillness, then the pop
      When the show runs with each ending
      Then in the last second the potato barely moves for at least half a second: in the other one's hands, at the top of its flight, or in the unlucky person's raised hands
      And it pops at the end of the last second, on the unlucky person

    Scenario: Hanging in the air gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds, and the potato hangs in the air
      Then the last throw comes from the unlucky person in some runs, and from the other one in others
      And at the top of its flight the potato is about halfway between the two

  Rule: The ending is a pop and a paper crown

    Scenario: A freeze, then the pop
      Given the unlucky person is "Luca"
      When the potato reaches "Luca" for the last time
      Then everything holds still for at least half a second, the sparkler at its last spark
      And the potato pops into confetti
      And "Luca" gets a paper crown and celebrates
      And everyone else cheers

    @pending
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

    Scenario: Everyone watches the freeze
      Given 8 people
      When the showdown reaches the freeze
      Then those out of play look worried, not relieved

  Rule: The beats keep the show between 14 and 18 seconds

    Scenario: Each beat takes about this long
      When the show runs at 12, 8 and 2 people, with the sparkler going out
      Then its beats take these seconds, give or take 0.3:
        | beat           | 12 people | 8 people | 2 people |
        | plop           | 1.6       | 1.6      | 1.6      |
        | hot hands      | 4.0       | 3.6      | 3.0      |
        | a dud          | 2.2       | 2.2      | 2.2      |
        | it relights    | 1.0       | 1.0      | 1.0      |
        | the showdown   | 3.6       | 3.6      | 4.4      |
        | the last throw | 1.4       | 1.4      | 1.4      |
        | the freeze     | 0.8       | 0.8      | 0.8      |
        | the pop        | 2.6       | 2.6      | 2.6      |

    Scenario: Every head count lands inside the time limit
      When the show runs at every head count from 2 to 12, with and without the sparkler going out
      Then each run lasts between 14 and 18 seconds

  @pending
  Rule: The beats keep every show a second or more inside the limit

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

    Scenario: Every head count lands inside the new limits
      When the show runs at every head count from 2 to 12, with and without the sparkler going out
      Then each run with the sparkler going out lasts between 18.5 and 19.5 seconds
      And each run without it lasts between 15.8 and 16.5 seconds

  Rule: It reads without sound

    Scenario: Captions tell the story
      Given 8 people, the unlucky person is "Luca", the sparkler goes out once, and the last throw lands straight
      When the show runs
      Then the captions include, in this order:
        | caption                           |
        | Don't be holding it when it pops! |
        | Faster… faster…                   |
        | …a dud?                           |
        | Nope! Still lit!                  |
        | Uh-oh…                            |
        | It popped on Luca!                |

    Scenario: The showdown names each catch
      Given the showdown's catches go to "Luca", "Tom" and "Priya"
      When the show runs
      Then the showdown is captioned "Luca…", "Luca… Tom…", "Luca… Tom… Priya…"

    Scenario: The last throw's twists are captioned
      Given the unlucky person is "Luca"
      When the show runs with 20 different random seeds
      Then every thrown-back last throw is captioned "<name>… nope, back to Luca!"
      And every last throw that curves back is captioned "It's coming back!"

    @pending
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

    @pending
    Scenario: The duel names each catch
      Given 8 people, and the duel's catches go to "Priya", "Tom" and "Priya"
      When the show runs
      Then the duel is captioned "Priya…", "Tom…" and "Priya…"

    @pending
    Scenario: Each ending has its caption
      When the show runs with each ending
      Then a second before the pop the caption is "Too hot!", "Which way…?" or "Throw it!", for each ending in turn

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names stay readable
      When the show runs at 12 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another
