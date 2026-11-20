Feature: Pigeon Drop
  Everyone stands in the park while a pigeon flies over. Each dropping misses
  someone, who steps aside, cheers and goes home, while the pigeon gives the
  others a fright on its way. When the unlucky person is the only one left,
  the pigeon circles them and the last dropping lands on their head. Now and
  then the pigeon lets everything go at once on the unlucky person while
  others are still standing, and they are all safe. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Pigeon Drop
      Then its name is "Pigeon Drop"
      And its description is "Whoever the pigeon hits gets the job."
      And it takes 2 to 12 people

  Rule: Every dropping misses but the last

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      And a show without a poo storm
      When the show runs
      Then a pigeon flies over the park
      And every person except the unlucky one is missed, turns happy and leaves, one at a time
      And the unlucky person is never missed
      And the last dropping lands on the unlucky person, who stays on stage, scared

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 7     | first    |
        | 12    | last     |

  Rule: Now and then a poo storm ends it early

    Scenario: About one show in five with 3 or more people has a poo storm
      When the show is planned with 500 different random seeds at each head count from 2 to 12
      Then between 15% and 25% of the shows with 3 or more people have a poo storm
      And no show with 2 people has one

    Scenario Outline: A poo storm with <count> people
      Given <count> people, and a show with a poo storm
      When the show runs
      Then some droppings miss others, one at a time, before the storm
      And at least one other person is still standing when the storm comes
      And a burst of droppings lands on the unlucky person, who stays on stage, scared
      And everyone still standing is safe at the same moment, happy, and leaves
      And the show lasts between 15 and 27 seconds

      Examples:
        | count |
        | 3     |
        | 12    |

  Rule: It lasts 15 to 27 seconds

    Scenario: Every head count lasts 15 to 27 seconds
      When the show runs at every head count from 2 to 12
      Then each run lasts between 15 and 27 seconds

  Rule: Name tags stay clear

    Scenario: Name tags don't cover each other or a head
      When everyone stands in the park, at every head count from 2 to 12
      Then no name tag, two lines high, covers another name tag or another person's head

  Rule: The music stops at the splat

    Scenario: No note plays once a dropping hits the unlucky person
      Given 8 people
      When the show's music is written
      Then no note plays or rings after the first dropping hits the unlucky person
      And the bass is gone for the finale

  Rule: Reduced motion keeps the story

    Scenario: The wings hold still and the droppings fall the same
      Given 6 people, a show without a poo storm, and reduced motion is on
      When the show runs
      Then the pigeon's wings don't flap
      And the same people are missed, in the same order, as with full motion
