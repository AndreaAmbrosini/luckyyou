Feature: Don't Wake the Dog
  A dog sleeps across the gateway of a garden fence. Turns go along the line
  of people at risk: each tiptoes up behind the dog, onto its back and out
  through the gate, where they are safe. The dog sleeps lighter after every
  crossing, and safe turns get the same scares as the last one, so nobody can
  tell which scare is real. It wakes with three or two left, on the unlucky
  person's turn, and is thrilled to take them for a walk. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Don't Wake the Dog
      Then its name is "Don't Wake the Dog"
      And its description is "Whoever wakes the dog gets the job."
      And its picture is 🐶
      And it takes 2 to 12 people

  Rule: It wakes on the unlucky person's turn

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then the last turn is the unlucky person's
      And the dog wakes on that turn
      And it never wakes on anyone else's turn

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

  Rule: Get past the dog and you're safe

    Scenario: A crossing that doesn't wake it makes the crosser safe
      Given 8 people
      When someone gets through the gate, before the last turn
      Then they say "Phew!" and stand behind the fence along the top of the stage, on the side they came from
      And they stay there, smaller, until the end
      And the number on the "At risk" sign over the gate goes down by one
      And everyone still at risk stays where they stand

    Scenario Outline: Nobody goes twice, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then nobody crosses more than once
      And the unlucky person's only turn is the last
      And in some runs it wakes with 3 people at risk, and in others with 2
      And it never comes down to one person alone

      Examples:
        | count |
        | 4     |
        | 8     |
        | 12    |

    Scenario: Who goes first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first turn goes to at least 5 different people
      And the unlucky person stands in at least 5 different places along the line
      And the two who share the final three with the unlucky person are at least 4 different people across the runs

  Rule: Turns go along the line

    Scenario: Each turn goes to the next one along
      Given 8 people
      When the show runs with 20 different random seeds
      Then each turn goes to the next person at risk along the line, from left to right across the stage, and from the rightmost back to the leftmost
      And the caption names whose turn it is, as "Elena's turn", as they step out
      And whoever goes next after them looks scared until their own turn

    Scenario: With 2 people, they take turns
      Given 2 people
      When the show runs with 20 different random seeds
      Then the two take turns, one after the other
      And the first turn goes to the unlucky person in some runs, and to the other person in others

    Scenario Outline: With <count> people, two neighbours go together before the final three
      Given <count> people
      When the show runs with 20 different random seeds
      Then before the final three, the next two along cross one right behind the other, and both go safe together
      And the caption names both, as "Ivo & Jonas!"
      And every turn from the final three on has one crosser

      Examples:
        | count |
        | 9     |
        | 12    |

  Rule: The way past the dog

    Scenario: A crossing
      Given 6 people
      When someone's turn comes
      Then they step back into a lane behind the line and tiptoe along it to the dog
      And they go up over its head or its tail, whichever end is on their side, and onto its back, behind it
      And the gate swings open, they go through, and it closes behind them
      And while they are on its back, the dog's face stays in full view

    Scenario: Unhurried before the final three
      Given 6 people
      When the show runs with 20 different random seeds
      Then each turn before the final three lasts 2.7 seconds or more
      And with 7 or 8 people, 2.3 seconds or more

  Rule: The dog is the clock

    Scenario: It sleeps lighter after every crossing
      Given 8 people
      When the show runs
      Then the dog starts deep asleep, with three Zs over its head and its tail flat
      And after the first crossing there are two Zs
      And from about two thirds of the way to the final three there is one Z, and its tail thumps
      And the Zs never come back once gone
      And it breathes slowly throughout, until it wakes

    Scenario: Half awake for the final three
      Given 8 people
      When 3 people are left at risk
      Then the dog has no Zs, one eye half open, its ears up and its tail raised

  Rule: Safe turns get the same scares as the last one

    Scenario: The scares
      Given 8 people
      When the show runs with 30 different random seeds
      Then in some safe turns, as they reach it, the dog lifts its head and sniffs, "Sniff…", and they freeze
      And in some, while they are on its back, an ear twitches, it mumbles "Wuf…", and everyone at risk freezes
      And in some, the gate creaks as it opens, "Creak!", the dog's ear twitches, and they freeze
      And in some, nothing stirs
      And each freeze lasts 0.7 seconds or more, then the dog settles and the crossing goes on

    Scenario: The first crossing is quiet
      Given 6 people
      When the show runs with 20 different random seeds
      Then the first crossing has no scare

  Rule: The final three

    Scenario: Final three
      Given 8 people
      When 3 people are left at risk
      Then the caption is "Final three!"
      And the three grow to 1.2 times their size where they stand, name tags and all
      And they look scared and sweat
      And the heartbeat starts, and comes quicker and quicker until the dog wakes

    Scenario: Final two
      Given 8 people, and the dog wakes with 2 left
      When the first crossing after "Final three!" gets through the gate
      Then the caption is "Nearly!", then "Final two!"

  Rule: Nearly! A careful crossing gets the biggest scare

    Scenario: Nearly
      Given 8 people, and the dog wakes with 2 left
      When the first of the final three crosses
      Then they tiptoe slower than anyone before them
      And they get one of the scares, during which the dog opens both eyes halfway
      And the dog closes them again, and they get through the gate with "Phew!!"

    Scenario: Nearly is never the unlucky person's, with 4 or more
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then "Nearly!" happens to at least 3 different people, and never to the unlucky person

  Rule: With 2 or 3 people it is the final from the start

    Scenario Outline: <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then the caption after the opening is "<caption>", the dog is half awake, and the heartbeat starts before the first turn
      And in some runs, before the real crossings, someone tiptoes up, gets a scare, says "Nope!" and goes back to their place
      And everyone still has their turn along the line, the last one the unlucky person's

      Examples:
        | count | caption                |
        | 2     | Just the two of you…   |
        | 3     | Just the three of you… |

  Rule: The last turn could go three ways

    Scenario Outline: The ending, with <count> people
      Given <count> people
      When the show runs with 30 different random seeds
      Then in some runs they are on its back when its eyes open, both looking up at them
      And in some runs they get over it, and the gate creaks
      And in some runs it lifts its head and sniffs as they reach it, they freeze, it sniffs again, and its eyes open
      And every time it wakes, its ears go up, a "!" appears over its head, and the caption is "Uh-oh…"

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    Scenario: A moment of stillness, then the woof
      When the show runs with each ending
      Then for at least half a second after its eyes open, nothing moves
      And then it says "Woof!"

  Rule: The ending is a walk

    Scenario: Walkies
      Given the unlucky person is "Marco"
      When the dog wakes
      Then Marco hops down in front of the dog, drawn at 130 pixels or more, in front of everyone
      And the dog jumps up, wagging, with hearts over its head
      And its lead goes from its collar to Marco's raised hand, and Marco celebrates
      And the sign over the gate says "Walkies!"
      And the caption is "Marco woke the dog!"

    Scenario: Whoever hasn't crossed slips out
      Given 8 people, and the dog wakes with 3 left
      When the dog wakes
      Then the two who haven't crossed tiptoe out of the gate behind its back, happy, to stand behind the fence

    Scenario: The name holds still at the end
      Given the unlucky person is "Marco"
      When the show runs
      Then "Marco" is on stage, not moving, for the last 1.5 seconds

  Rule: The beats keep every show a second or more inside the limit

    Scenario: About 21 to 25 seconds at 6 people
      Given 6 people
      When the show runs with 20 different random seeds
      Then each run lasts between 19 and 26 seconds
      And runs where it wakes with 2 left last longer than runs where it wakes with 3 left

    Scenario: Every head count lands between 12 and 29 seconds
      When the show runs at every head count from 2 to 12, with each ending, waking with 3 left and with 2 left
      Then each run lasts between 12 and 29 seconds

  @pending
  Rule: It reads without sound

    Scenario: Captions tell the story, a turn at a time
      Given 6 people, the unlucky person is "Anna", the turns go to "Ben", "Marco", "Giulia", "Priya", then "Anna", and Priya has "Nearly!"
      When the show runs
      Then the captions include, in this order:
        | caption                       |
        | Don't wake the dog!           |
        | Whoever wakes it gets the job |
        | Ben's turn                    |
        | Marco's turn                  |
        | Giulia's turn                 |
        | Final three!                  |
        | Priya's turn                  |
        | Nearly!                       |
        | Final two!                    |
        | Anna's turn                   |
        | Uh-oh…                        |
        | Anna woke the dog!            |

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Whoever is at risk is drawn big
      When the show runs at 6 and at 12 people, a 15-character name among the 12
      Then with 6 or fewer at risk, their heads are 120 pixels tall and the name tags other than the 15-character one 34 pixels or more, on the 1280 by 720 stage
      And with 7 or more at risk, their heads are 100 pixels tall and those other name tags 28 pixels or more
      And the 15-character name's tag is 22 pixels or more, at risk or not
      And behind the fence, name tags are 22 pixels or more
      And the "At risk" number is 34 pixels or more

    Scenario: Nothing covers a name or the dog's face
      When the show runs at 12, at 8 and at 2 people
      Then no name tag is ever over another
      And no speech bubble covers a name tag or a face
      And no one ever covers the dog's face

  @pending
  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, nobody bobs
      Given reduced motion is on
      When the show runs
      Then crossers glide without bobbing on their toes
      And the dog doesn't breathe or jump, and lifts its head without a bounce
      And every caption still appears, in the same order
