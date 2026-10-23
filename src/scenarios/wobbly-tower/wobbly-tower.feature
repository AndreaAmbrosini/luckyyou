Feature: Wobbly Tower
  People stand around a tower of blocks. A pointer picks whose turn it is,
  and they toss a block on top. If the tower holds, they are safe and hop up
  to the Safe bench, so fewer and fewer are at risk while the tower grows
  shakier. With three left the stage dims to a spotlight. The tower falls with
  three or two left, on the unlucky person's turn, toward them, and they get a
  hard hat. With 2 or 3 people it is the final from the start. The contract in
  specs/scenarios.feature applies as well.

  # Scenarios marked "Old design" describe the show before the Safe! rules. The
  # build deletes each one, with its steps, when the scenarios that replace it
  # pass.

  Rule: Its card

    Scenario: The picker shows Wobbly Tower
      Then its name is "Wobbly Tower"
      And its description is "Whoever topples it gets the job."
      And its picture is 🧱
      And it takes 2 to 12 people

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

    # Old design: replaced by "Who goes first gives nothing away, and nobody goes twice".
    Scenario: Who goes first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first turn goes to at least 5 different people
      And in some runs the unlucky person has a turn before the last, and in some runs not

    # Old design: replaced by "Nobody goes twice".
    Scenario: A turn makes nobody safe
      Given 8 people
      When the show runs with 20 different random seeds
      Then in some runs someone has two turns or more
      And with 3 people or more, nobody has two turns in a row, except when the pointer stays for "Again?!"

    Scenario: With 2 people, turns don't just alternate
      Given 2 people
      When the show runs with 20 different random seeds
      Then in some runs the same person has two turns in a row before the last turn

    # Old design: replaced by "Nobody goes twice".
    Scenario: At 12, some never get a turn
      Given 12 people
      When the show runs
      Then at least 3 people never get a turn

  @pending
  Rule: Hold the tower and you're safe

    Scenario: A block that holds makes its thrower safe
      Given 8 people
      When a turn's block lands and the tower settles, before the last turn
      Then the thrower says "Safe!" and hops up to the Safe bench along the top of the stage
      And they stay on the bench, smaller, until the end
      And the number on the "At risk" plinth under the tower goes down by one
      And the people still at risk move round the tower to close the gap

    Scenario Outline: Nobody goes twice, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then nobody has more than one turn
      And the unlucky person's only turn is the last
      And in some runs it falls with 3 people at risk, and in others with 2
      And it never comes down to one person alone

      Examples:
        | count |
        | 4     |
        | 8     |
        | 12    |

    Scenario: Who goes first gives nothing away, and nobody goes twice
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first turn goes to at least 5 different people
      And the two who share the final three with the unlucky person are at least 4 different people across the runs

    Scenario: The tower gets shakier
      Given 8 people
      When the show runs
      Then each sway before "Nearly!" leans further than the one before
      And each turn before the final three takes between 2 and 2.6 seconds

    Scenario: Up to 8 people, one thrower a turn
      Given 8 people
      When the show runs
      Then every turn has one pointer and one thrower

    Scenario Outline: With <count> people, the turns before the final three go in pairs
      Given <count> people
      When the show runs with 20 different random seeds
      Then before the final three, two pointers stop on two people at once, both toss a block, and both go safe together
      And the caption names both, as "Ivo & Jonas!"
      And the last turn before the final three has one thrower, and so does every turn from the final three on

      Examples:
        | count |
        | 9     |
        | 12    |

  @pending
  Rule: The final three

    Scenario: The spotlight
      Given 8 people
      When 3 people are left at risk
      Then the caption is "Final three!"
      And the stage dims, except for a spotlight on the tower and the three
      And the Safe bench stays in view, dimmed
      And the three look worried and sweat
      And the heartbeat starts, and comes quicker and quicker until the fall

    Scenario: Final two
      Given 8 people, and the tower falls with 2 left
      When the first turn after "Final three!" ends in "Safe!"
      Then the caption is "Final two!"

    Scenario: The pointer goes round the last ones
      Given 8 people
      When a turn starts with 3 or 2 people at risk
      Then the pointer stops on 2 to 4 of them before the thrower, each stop longer than the one before, never on the same person twice running
      And the caption names each stop, as "Dario…", "Carla…", then "…Fabio!" for the thrower
      And whoever it leaves just before the thrower says "Phew!"
      And whoever it stops on looks scared while it stays

    Scenario: The pointer gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then on the last turn the pointer stops on the unlucky person before the end of its round in some runs, and not in others
      And on a turn in the final that ends in "Safe!", it stops on the unlucky person in some runs

  @pending
  Rule: With 2 or 3 people it is the final from the start

    Scenario Outline: <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then there is no Safe bench, and nobody goes safe
      And the caption after the opening is "<caption>", and the spotlight and the heartbeat start before the first turn
      And there are 4 or 5 turns, the last one the unlucky person's, and nobody has three in a row
      And before each turn the pointer stops on 2 or 3 people

      Examples:
        | count | caption                |
        | 2     | Just the two of you…   |
        | 3     | Just the three of you… |

  Rule: The pointer picks each turn

    Scenario: Nobody knows who's next until it stops
      Given 8 people
      When the show runs
      Then before each turn the "Your turn!" pointer hops from where it was to the next person
      And it stops over their head before they lift a block
      And it stays there a tenth of a second or more before it's gone, even on the quickest turns
      And it never covers a name tag

    # Old design: replaced by "The spotlight" and "The pointer goes round the last ones".
    Scenario: Careful now, the pointer wavers
      Given 8 people
      When the careful turns start
      Then before each careful turn the pointer stops on someone, then hops to someone else
      And the caption names whose turn it is
      And each careful turn takes longer than the one before
      And the heartbeat comes quicker and quicker until the last turn

    # Old design: replaced by "The tower gets shakier".
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

  Rule: The tower sways and holds

    Scenario: Each block lands and the tower sways
      When the show runs
      Then each block lands on top of the tower with a thunk
      And each block is its thrower's shirt colour, after two plain paper blocks
      And after each block the tower sways and settles before the next turn, except on the last turn
      And it never sways more than 3 times a second

    # Old design: no big wobble, no pigeon, and the height follows the head count.
    Scenario: The big wobble holds
      Given 8 people
      When the big wobble turn's block lands
      Then the tower sways wide, three times, each smaller than the one before
      And everyone looks scared until it settles
      And the caption is "Wobble… wobble…", then "…it holds!"

    # Old design.
    Scenario: The big wobble gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the big wobble is on the unlucky person's turn in some runs, and not in others

    # Old design.
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

    # Old design.
    Scenario: Its height doesn't count down to the end
      When the show runs with 20 different random seeds
      Then the tower ends at 9 to 11 blocks
      And it ends at more than one height

  Rule: Nearly! The biggest wobble is a false alarm

    Scenario: Nearly
      Given 8 people
      When the turn before the last one's block lands
      Then the tower leans further than at any other time and holds still there for at least half a second
      And it swings back upright
      And the thrower says "Phew!"
      And the caption is "Nearly!"

    @pending
    Scenario: After Nearly, the thrower is safe
      Given 8 people
      When "Nearly!" swings back upright
      Then the thrower says "Phew!", then "Safe!", and hops up to the Safe bench

    @pending
    Scenario: Nearly is never the unlucky person's, with 4 or more
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then "Nearly!" happens to at least 3 different people, and never to the unlucky person

    # Old design: replaced by "Nearly is never the unlucky person's, with 4 or more".
    Scenario: Who nearly topples it gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then "Nearly!" happens to at least 3 different people
      And in some runs it happens to the unlucky person

  Rule: The last turn could go three ways

    # Old design: replaced by "The pointer goes round the last ones".
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

  Rule: The beats keep every show a second or more inside the limit

    # Old design: replaced by "About 25 seconds at 6 people".
    Scenario: Each beat takes about this long now
      When the show runs at 12, 8 and 2 people, with the pigeon
      Then its beats take these seconds, give or take 0.3:
        | beat           | 12 people | 8 people | 2 people |
        | thunk          | 1.6       | 1.6      | 1.6      |
        | stack it up    | 3.6       | 3.5      | 3.35     |
        | the big wobble | 2.0       | 2.0      | 2.0      |
        | a pigeon       | 1.4       | 1.4      | 1.4      |
        | careful now    | 3.0       | 3.1      | 3.25     |
        | nearly         | 1.7       | 1.7      | 1.7      |
        | the last turn  | 2.4       | 2.4      | 2.4      |
        | timber         | 2.6       | 2.6      | 2.6      |

    # Old design: replaced by "Every head count lands between 15 and 29 seconds".
    Scenario: Every head count lands inside the limits
      When the show runs at every head count from 2 to 12, with and without the pigeon
      Then each run with the pigeon lasts between 17.9 and 18.5 seconds
      And each run without it lasts between 16.5 and 17.1 seconds

    @pending
    Scenario: About 25 seconds at 6 people
      Given 6 people
      When the show runs with 20 different random seeds
      Then each run lasts between 21 and 28 seconds
      And runs where it falls with 2 left last longer than runs where it falls with 3 left

    @pending
    Scenario: Every head count lands between 15 and 29 seconds
      When the show runs at every head count from 2 to 12, with each ending, falling with 3 left and with 2 left
      Then each run lasts between 15 and 29 seconds

  Rule: It reads without sound

    # Old design: replaced by "Captions tell the Safe! story to the end".
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

    @pending
    Scenario: Captions tell the Safe! story to the end
      Given 6 people, the unlucky person is "Fabio", the turns before the final three go to "Elena", "Ben" and "Anna", Anna has "Nearly!", the pointer stops on "Dario" and "Carla" before "Fabio", and the tower goes dead still at the end
      When the show runs
      Then the captions include, in this order:
        | caption                          |
        | Whoever topples it gets the job! |
        | Hold the tower, and you're safe! |
        | Elena's turn                     |
        | Ben's turn                       |
        | Anna's turn                      |
        | Whoa…                            |
        | Nearly!                          |
        | Final three!                     |
        | Dario…                           |
        | Carla…                           |
        | …Fabio!                          |
        | Uh-oh…                           |
        | Fabio toppled it!                |

    # Old design: replaced by "The pointer goes round the last ones".
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
    Scenario: Whoever is at risk is drawn big
      When the show runs at 6 and at 12 people
      Then with 6 or fewer at risk, their heads are 120 pixels tall and their name tags 36 pixels or more, on the 1280 by 720 stage
      And with 7 or more at risk, their heads are 100 pixels tall and their name tags 30 pixels or more
      And on the Safe bench, name tags are 22 pixels or more
      And the "At risk" number is 48 pixels or more
      And no name tag is ever over another, under a block or under the pointer

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, the tower leans instead of shaking
      Given reduced motion is on
      When the show runs
      Then the tower leans and settles in one slow move instead of swaying
      And there are no speed lines
      And every caption still appears, in the same order
