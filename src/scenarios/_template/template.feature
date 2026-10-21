Feature: Template
  The starting point for a new scenario. Everyone is on stage, and people
  leave one at a time until only the unlucky person is left. The contract in
  specs/scenarios.feature applies as well.

  Rule: The unlucky person is the last one on stage

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then everyone else leaves, one at a time
      And the unlucky person never leaves

      Examples:
        | count | position |
        | 2     | first    |
        | 12    | last     |

  Rule: It lasts 13 seconds

    Scenario: Every head count lasts 13 seconds
      When the show runs at every head count from 2 to 12
      Then each run lasts 13 seconds, give or take 0.1
