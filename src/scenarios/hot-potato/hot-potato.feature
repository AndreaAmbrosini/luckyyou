Feature: Hot Potato
  People stand in a ring and throw a potato with a lit sparkler, faster and
  faster. The sparkler burns down, seems to go out, relights, and the throws
  slow to a showdown between three. The potato pops in the unlucky person's
  hands, and they get a paper crown. The contract in specs/scenarios.feature
  applies as well.

  @pending
  Rule: Its card

    Scenario: The picker shows Hot Potato
      Then its name is "Hot Potato"
      And its description is "Whoever's holding it when it pops gets the job."
      And its picture is 🥔
      And it takes 2 to 12 people

  @pending
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

  @pending
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
  Rule: The sparkler is the clock everyone watches

    Scenario: It burns down to the pop
      When the show runs
      Then the sparkler is shorter at each throw than at the one before, except when it relights
      And it is at its last spark only while the unlucky person holds the potato, just before the pop

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
  Rule: The ending is a pop and a paper crown

    Scenario: A freeze, then the pop
      Given the unlucky person is "Luca"
      When the potato reaches "Luca" for the last time
      Then everything holds still for at least half a second, the sparkler at its last spark
      And the potato pops into confetti
      And "Luca" gets a paper crown and celebrates
      And everyone else cheers

    Scenario: The name holds still at the end
      Given the unlucky person is "Luca"
      When the show runs
      Then "Luca" is on stage, not moving, for the last 1.5 seconds

  @pending
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
  Rule: It reads without sound

    Scenario: Captions tell the story
      Given 8 people, the unlucky person is "Luca", and the sparkler goes out once
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

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names stay readable
      When the show runs at 12 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another
