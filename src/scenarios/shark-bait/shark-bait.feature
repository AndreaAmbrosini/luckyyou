Feature: Shark Bait
  Everyone is in the water and a shark circles. A helicopter lifts people out,
  fast in groups at first, then one at a time. The last one left in the water
  gets the job, and rides off on the shark. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Shark Bait
      Then its name is "Shark Bait"
      And its description is "The last one left in the water gets the job."
      And its picture is 🦈
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

  Rule: Rescues start fast and slow down from 4 left

    Scenario Outline: <count> people
      Given <count> people
      When the show runs
      Then <fast> leave in quick group rescues
      And <slow> leave one at a time, each rescue taking longer than the one before

      Examples:
        | count | fast | slow |
        | 12    | 8    | 3    |
        | 5     | 1    | 3    |
        | 4     | 0    | 3    |
        | 3     | 0    | 2    |
        | 2     | 0    | 1    |

    Scenario: Group rescues stay few and small
      Given 12 people
      When the show runs
      Then there are at most 2 group rescues
      And none lifts more than 4 people

    Scenario: The last two get a duel
      Given the last two in the water are "Marco", the unlucky person, and "Giulia"
      When the rope comes down for them
      Then it goes towards "Marco" first
      And it swings to "Giulia", who is lifted out

    Scenario: With 2 people, the duel swings longer
      Given 2 people
      When the show runs
      Then the rope swings between them at least 3 times before it lifts one

    Scenario: Fake-outs go both ways
      Given 12 people
      When the show runs with 20 different random seeds
      Then in some runs a one-at-a-time rescue swings away and back to the same person
      And in some runs it swings to someone else

  Rule: The beats keep the show between 11 and 14 seconds

    Scenario: Each beat takes about this long
      When the show runs at 12, 4 and 2 people
      Then its beats take these seconds, give or take 0.3:
        | beat                     | 12 people | 4 people | 2 people |
        | splash-in                | 1.8       | 1.8      | 2.0      |
        | group rescues            | 2.0       | 0        | 0        |
        | 4 left, one lifted out   | 1.6       | 1.8      | 0        |
        | 3 left, a fake-out       | 2.0       | 2.2      | 0        |
        | the duel                 | 2.6       | 2.8      | 5.5      |
        | the shark's run          | 1.4       | 1.4      | 1.5      |
        | the victory lap          | 2.0       | 2.0      | 2.5      |

    Scenario: Every head count lands in the middle of the time limit
      When the show runs at every head count from 2 to 12
      Then each run lasts between 11 and 14 seconds

  Rule: The ending is a victory lap

    Scenario: The shark goes for the last one, who rides off on it
      Given the unlucky person is "Marco"
      When everyone else has been lifted out
      Then the helicopter leaves
      And the shark heads straight for "Marco" and dives
      And the water stays still for half a second
      And "Marco" comes up riding the shark, celebrating

    Scenario: The name holds still at the end
      Given the unlucky person is "Marco"
      When the show runs
      Then "Marco" is on the shark's fin, not moving, for the last 1.5 seconds

  Rule: It reads without sound

    Scenario: Captions tell the story
      Given 12 people, and the unlucky person is "Marco"
      When the show runs
      Then the captions include, in this order:
        | caption                            |
        | Last one in the water gets the job |
        | Whoosh! 8 left                     |
        | 4 left…                            |
        | Uh-oh…                             |
        | Last one in the water!             |
      And every fake-out is captioned "It's going for <name>… nope, <other name>!"

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Names grow as people leave
      When the show runs at 12 people
      Then every name tag is set at 22 pixels or more on the 1280 by 720 stage
      And the last two name tags are set at 48 pixels or more
