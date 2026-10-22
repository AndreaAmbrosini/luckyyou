Feature: Wobbly Tower
  People stand around a tower of blocks. A pointer picks whose turn it is,
  anyone at any time, and they toss a block on top. The tower sways and
  holds, a pigeon may land on it, and the turns slow down. The biggest wobble
  is a false alarm, and the last turn could end three ways. The tower falls
  on the unlucky person's turn, toward them, and they get a hard hat. The
  contract in specs/scenarios.feature applies as well.

  @pending
  Rule: Its card

    Scenario: The picker shows Wobbly Tower
      Then its name is "Wobbly Tower"
      And its description is "Whoever topples it gets the job."
      And its picture is 🧱
      And it takes 2 to 12 people

  @pending
  Rule: It falls on the unlucky person's turn

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then the last turn is the unlucky person's
      And the tower falls on that turn, toward them
      And it never falls on anyone else's turn

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

    Scenario: Who goes first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first turn goes to at least 5 different people
      And in some runs the unlucky person has a turn before the last, and in some runs not

    Scenario: A turn makes nobody safe
      Given 8 people
      When the show runs with 20 different random seeds
      Then in some runs someone has two turns or more
      And with 3 people or more, nobody has two turns in a row, except when the pointer stays for "Again?!"

    Scenario: With 2 people, turns don't just alternate
      Given 2 people
      When the show runs with 20 different random seeds
      Then in some runs the same person has two turns in a row before the last turn

    Scenario: At 12, some never get a turn
      Given 12 people
      When the show runs
      Then at least 3 people never get a turn

  @pending
  Rule: The pointer picks each turn

    Scenario: Nobody knows who's next until it stops
      Given 8 people
      When the show runs
      Then before each turn the "Your turn!" pointer hops from where it was to the next person
      And it stops over their head before they lift a block
      And it never covers a name tag

    Scenario: Careful now, the pointer wavers
      Given 8 people
      When the careful turns start
      Then before each careful turn the pointer stops on someone, then hops to someone else
      And the caption names whose turn it is
      And each careful turn takes longer than the one before
      And the heartbeat comes quicker and quicker until the last turn

    Scenario Outline: Stack it up, each turn quicker, with <count> people
      Given <count> people
      When the show runs
      Then there are 2 to 4 quick turns before the big wobble
      And each quick turn is quicker than the one before

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

  @pending
  Rule: The tower sways and holds

    Scenario: Each block lands and the tower sways
      When the show runs
      Then each block lands on top of the tower with a thunk
      And each block is its thrower's shirt colour, after two plain paper blocks
      And after each block the tower sways and settles before the next turn, except on the last turn
      And it never sways more than 3 times a second

    Scenario: The big wobble holds
      Given 8 people
      When the big wobble turn's block lands
      Then the tower sways wide, three times, each smaller than the one before
      And everyone looks scared until it settles
      And the caption is "Wobble… wobble…", then "…it holds!"

    Scenario: The big wobble gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the big wobble is on the unlucky person's turn in some runs, and not in others

    Scenario Outline: Sometimes a pigeon lands on top, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then in some runs a pigeon lands on top after the big wobble, the tower dips, everyone gasps, and it flies off
      And in some runs no pigeon comes

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    Scenario: Its height doesn't count down to the end
      When the show runs with 20 different random seeds
      Then the tower ends at 9 to 11 blocks
      And it ends at more than one height

  @pending
  Rule: Nearly! The biggest wobble is a false alarm

    Scenario: Nearly
      Given 8 people
      When the turn before the last one's block lands
      Then the tower leans further than at any other time and holds still there for at least half a second
      And it swings back upright
      And the thrower says "Phew!"
      And the caption is "Nearly!"

    Scenario: Who nearly topples it gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then "Nearly!" happens to at least 3 different people
      And in some runs it happens to the unlucky person

  @pending
  Rule: The last turn could go three ways

    Scenario Outline: The pointer on the last turn, with <count> people
      Given <count> people
      When the show runs with 30 different random seeds
      Then in some runs the pointer goes straight to the unlucky person
      And in some runs it stops on someone else first, who says "Phew!", then hops to the unlucky person
      And in some runs the unlucky person had "Nearly!", the pointer stays on them, and they say "Me again?!"

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    Scenario Outline: The ending, with <count> people
      Given <count> people
      When the show runs with 30 different random seeds
      Then in some runs the block lands, the tower goes dead still, "creak…", and it falls
      And in some runs it sways, settles, the unlucky person cheers "Phew!", and then the top block slides off and it falls
      And in some runs the block is set down gently, the tower leans slowly toward the unlucky person, holds at the tipping point, and falls

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    Scenario: A moment of stillness, then the fall
      When the show runs with each ending
      Then the tower barely moves for at least half a second before it falls
      And it falls toward the unlucky person

  @pending
  Rule: The ending is a tumble and a hard hat

    Scenario: Timber
      Given the unlucky person is "Marco"
      When the tower falls
      Then the blocks tumble toward "Marco" and land around Marco, never on anyone's head
      And a hard hat drops onto Marco's head, and Marco celebrates
      And everyone else cheers

    Scenario: The name holds still at the end
      Given the unlucky person is "Marco"
      When the show runs
      Then "Marco" is on stage, not moving, for the last 1.5 seconds

    Scenario: The unlucky person stands out at the end
      Given the unlucky person is "Marco"
      When the tower has fallen
      Then "Marco" grows to 1.3 times their size, in front of everyone and every block
      And "Timber!" covers neither Marco's head nor the hard hat
      And "Marco toppled it!" is up within 0.2 seconds of the last block landing

  @pending
  Rule: The beats keep every show a second or more inside the limit

    Scenario: Each beat takes about this long now
      When the show runs at 12, 8 and 2 people, with the pigeon
      Then its beats take these seconds, give or take 0.3:
        | beat           | 12 people | 8 people | 2 people |
        | thunk          | 1.6       | 1.6      | 1.6      |
        | stack it up    | 3.6       | 3.4      | 3.0      |
        | the big wobble | 2.0       | 2.0      | 2.0      |
        | a pigeon       | 1.4       | 1.4      | 1.4      |
        | careful now    | 3.0       | 3.2      | 3.6      |
        | nearly         | 1.6       | 1.6      | 1.6      |
        | the last turn  | 2.4       | 2.4      | 2.4      |
        | timber         | 2.6       | 2.6      | 2.6      |

    Scenario: Every head count lands inside the limits
      When the show runs at every head count from 2 to 12, with and without the pigeon
      Then each run with the pigeon lasts between 17.9 and 18.5 seconds
      And each run without it lasts between 16.5 and 17.1 seconds

  @pending
  Rule: It reads without sound

    Scenario: Captions tell the story to the end
      Given 8 people, the unlucky person is "Marco", a pigeon comes, the careful turns go to "Luca" and "Priya", the pointer goes straight to "Marco", and the tower goes dead still at the end
      When the show runs
      Then the captions include, in this order:
        | caption                          |
        | Whoever topples it gets the job! |
        | Stack it up!                     |
        | Wobble… wobble…                  |
        | …it holds!                       |
        | A pigeon?!                       |
        | Luca…                            |
        | Priya…                           |
        | Nearly!                          |
        | Marco…                           |
        | Uh-oh…                           |
        | Marco toppled it!                |

    Scenario: Each pointer twist has its caption
      Given the unlucky person is "Marco"
      When the pointer stops on "Ben" before hopping to "Marco"
      Then the caption is "Ben… nope, Marco!"
      And when the pointer stays on "Marco", the caption is "Marco… again?!"

    Scenario: Each ending has its caption
      When the show runs with each ending
      Then before the fall the caption is "Uh-oh…", "It holds!" then "…or not!", or "It's leaning…", for each ending in turn

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names stay readable
      When the show runs at 12 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another, under a block or under the pointer

  @pending
  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, the tower leans instead of shaking
      Given reduced motion is on
      When the show runs
      Then the tower leans and settles in one slow move instead of swaying
      And there are no speed lines
      And every caption still appears, in the same order
