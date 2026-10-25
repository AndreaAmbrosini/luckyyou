Feature: Wobbly Tower
  People stand around a tower of blocks and take turns along the line, each
  tossing a block on top. If the tower holds, they are safe and hop up to the
  Safe bench, so fewer and fewer are at risk while the tower grows shakier.
  With three left the stage dims to a spotlight, and each block hovers over
  the top before it is set down. The tower falls with three or two left, on
  the unlucky person's turn, toward them, and they get a hard hat. With 2 or 3
  people it is the final from the start. The contract in
  specs/scenarios.feature applies as well.

  # Scenarios marked "Old design" describe the show with a "Your turn!"
  # pointer that hopped from head to head to pick each turn. The build
  # deletes each one, with its steps, when the scenarios that replace it pass.

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

    Scenario: The tower gets shakier, a turn at a time
      Given 8 people
      When the show runs
      Then each sway before "Nearly!" leans further than the one before
      And each turn before the final three takes between 2 and 3 seconds

    Scenario: Up to 8 people, one thrower a turn, and nothing points
      Given 8 people
      When the show runs
      Then every turn has one thrower
      And nothing on stage points at anyone, and nothing says "Your turn!"

    Scenario Outline: With <count> people, two neighbours go together before the final three
      Given <count> people
      When the show runs with 20 different random seeds
      Then before the final three, the next two along both toss a block at once, and both go safe together
      And the caption names both, as "Ivo & Jonas!"
      And the last turn before the final three has one thrower, and so does every turn from the final three on

      Examples:
        | count |
        | 9     |
        | 12    |

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

  Rule: The careful toss

    Scenario: The careful toss
      Given 8 people
      When a turn starts with 3 or 2 people at risk
      Then the caption names the thrower, as "Fabio's turn"
      And the thrower lifts a block, and it hovers over the top of the tower
      And it dips toward the top and pulls back up 1 to 3 times
      And it hovers for 1 to 3 seconds before it is set down
      And everyone at risk watches it, worried, while it hovers

    Scenario: The careful toss gives nothing away
      Given 8 people, and the tower falls with 2 left
      When the show runs with 30 different random seeds
      Then in some runs the last turn's block hovers longer than the block of the turn before, and in others not
      And in some runs it dips more times on the last turn than on the turn before, and in others not

    Scenario: Before the final three, the block is tossed straight on
      Given 8 people
      When a turn starts with 4 or more people at risk
      Then the block flies from the thrower's hands onto the tower without hovering

  Rule: With 2 or 3 people it is the final from the start

    Scenario Outline: <count> people, taking turns
      Given <count> people
      When the show runs with 20 different random seeds
      Then there is no Safe bench, and nobody goes safe
      And the "At risk" plinth under the tower shows <count> throughout
      And the caption after the opening is "<caption>", and the spotlight and the heartbeat start before the first turn
      And there are 4 or 5 turns, going round in order, the last one the unlucky person's
      And every turn is a careful toss

      Examples:
        | count | caption                |
        | 2     | Just the two of you…   |
        | 3     | Just the three of you… |

  Rule: Turns go along the line

    Scenario: Each turn goes to the next one along
      Given 8 people
      When the show runs with 20 different random seeds
      Then each turn goes to the next person at risk along the line, from left to right across the stage, and from the rightmost back to the leftmost
      And the caption names the thrower, as "Elena's turn", as they lift the block

    Scenario: With 2 people, they take turns
      Given 2 people
      When the show runs with 20 different random seeds
      Then the two take turns, one after the other
      And the first turn goes to the unlucky person in some runs, and to the other person in others

    Scenario: Where the turns start gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the unlucky person stands in at least 5 different places along the line
      And the unlucky person is the first of the final three to throw in some runs, and the second in others

  Rule: The tower sways and holds

    Scenario: Each block lands and the tower sways
      When the show runs
      Then each block lands on top of the tower with a thunk
      And each block is its thrower's shirt colour, after two plain paper blocks
      And after each block the tower sways and settles before the next turn, except on the last turn
      And it never sways more than 3 times a second

  Rule: Nearly! The biggest wobble is a false alarm

    Scenario: Nearly
      Given 8 people
      When the turn before the last one's block lands
      Then the tower leans further than at any other time and holds still there for at least half a second
      And it swings back upright
      And the thrower says "Phew!"
      And the caption is "Nearly!"

    Scenario: After Nearly, the thrower is safe
      Given 8 people
      When "Nearly!" swings back upright
      Then the thrower says "Phew!", then "Safe!", and hops up to the Safe bench

    Scenario: Nearly is never the unlucky person's, with 4 or more
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then "Nearly!" happens to at least 3 different people, and never to the unlucky person

  Rule: The last turn could go three ways

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

    Scenario: About 25 seconds at 6 people
      Given 6 people
      When the show runs with 20 different random seeds
      Then each run lasts between 21 and 28 seconds
      And runs where it falls with 2 left last longer than runs where it falls with 3 left

    Scenario: Every head count lands between 15 and 29 seconds
      When the show runs at every head count from 2 to 12, with each ending, falling with 3 left and with 2 left
      Then each run lasts between 15 and 29 seconds

  Rule: It reads without sound

    Scenario: Captions tell the story, a turn at a time
      Given 6 people, the unlucky person is "Fabio", the turns go to "Elena", "Ben", "Anna" and then "Fabio", Anna has "Nearly!", and the tower goes dead still at the end
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
        | Fabio's turn                     |
        | Uh-oh…                           |
        | Fabio toppled it!                |

    Scenario: Each ending has its caption
      When the show runs with each ending
      Then before the fall the caption is "Uh-oh…", "It holds!" then "…or not!", or "It's leaning…", for each ending in turn

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    # Old design: replaced by "Names stay readable, with no pointer".
    Scenario: Names stay readable
      When the show runs at 12, at 8 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another, under a block or under the pointer

    @pending
    Scenario: Names stay readable, with no pointer
      When the show runs at 12, at 8 and at 2 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And with 2 people, both name tags are set at 44 pixels or more
      And no name tag is ever over another or under a block, a hovering one included

    # Old design: replaced by "Whoever is at risk is drawn big, with no pointer".
    Scenario: Whoever is at risk is drawn big
      When the show runs at 6 and at 12 people, a 15-character name among the 12
      Then with 6 or fewer at risk, their heads are 120 pixels tall and the name tags other than the 15-character one 36 pixels or more, on the 1280 by 720 stage
      And with 7 or more at risk, their heads are 100 pixels tall and those other name tags 30 pixels or more
      And the 15-character name's tag is 22 pixels or more, at risk or not
      And on the Safe bench, name tags are 22 pixels or more
      And the "At risk" number is 48 pixels or more
      And no name tag is ever over another, under a block or under the pointer

    @pending
    Scenario: Whoever is at risk is drawn big, with no pointer
      When the show runs at 6 and at 12 people, a 15-character name among the 12
      Then with 6 or fewer at risk, their heads are 120 pixels tall and the name tags other than the 15-character one 36 pixels or more, on the 1280 by 720 stage
      And with 7 or more at risk, their heads are 100 pixels tall and those other name tags 30 pixels or more
      And the 15-character name's tag is 22 pixels or more, at risk or not
      And on the Safe bench, name tags are 22 pixels or more
      And the "At risk" number is 48 pixels or more
      And no name tag is ever over another or under a block, a hovering one included

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, the tower leans instead of shaking
      Given reduced motion is on
      When the show runs
      Then the tower leans and settles in one slow move instead of swaying
      And there are no speed lines
      And every caption still appears, in the same order
