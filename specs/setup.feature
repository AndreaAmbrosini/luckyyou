Feature: The setup screen
  Where the person sharing their screen chooses who is in, what is at stake
  and which show to play.

  @pending
  Rule: Starting needs 2 to 12 ticked people

    Scenario Outline: Starting with <ticked> ticked
      Given <ticked> people are ticked
      Then starting is <state>

      Examples:
        | ticked | state   |
        | 1      | blocked |
        | 2      | allowed |
        | 12     | allowed |
        | 13     | blocked |

    Scenario: A blocked start says why
      Given 1 person is ticked
      Then I'm told at least 2 people are needed, and that 1 is ticked

    Scenario: While the head count is wrong, that is the only problem shown
      Given 13 people are ticked
      Then I'm told at most 12 people can take part, and that 13 are ticked
      And no other problem is shown
      And every scenario card can still be selected

  @pending
  Rule: Scenario cards show whether they can run

    Scenario: A card shows the scenario's name, description and picture
      Given a scenario named "Hot Potato", described as "A bomb goes round the circle.", pictured as 💣
      Then its card shows the name, the description and the picture

    Scenario: A card that can't run with today's count is disabled, with the reason
      Given a scenario that takes 3 to 6 people
      And 8 people are ticked
      Then its card is disabled
      And it says it takes at most 6 people

  @pending
  Rule: The selected scenario follows the last choice

    Scenario: The scenario chosen last time is selected again
      Given I chose "Hot Potato" on my last visit
      When I open the app
      Then "Hot Potato" is selected

    Scenario: If the last choice can't run today, the first one that can is selected
      Given I chose "Hot Potato" on my last visit, and it takes at most 6 people
      And 8 people are ticked
      Then the first scenario that takes 8 people is selected

    Scenario: If no scenario can run, starting is blocked with the reason
      Given no scenario takes 11 people
      And 11 people are ticked
      Then starting is blocked
      And I'm told no scenario can run with 11 people

  @pending
  Rule: The stake line is optional and lasts the visit

    Scenario: The show can start without a stake line
      Given 3 people are ticked
      And the stake line is empty
      Then starting is allowed

    Scenario Outline: The stake line holds up to 80 characters
      When I type a stake line of <typed> characters
      Then it keeps <kept> characters

      Examples:
        | typed | kept |
        | 80    | 80   |
        | 81    | 80   |

    Scenario: The stake line outlives a show, not a reload
      Given the stake line is "Who writes the release notes?"
      When a show ends and I go back to setup
      Then the stake line is still "Who writes the release notes?"
      When I reload the page
      Then the stake line is empty

  @pending
  Rule: Mute and fullscreen

    Scenario: Mute is remembered in this browser
      Given I turned the sound off
      When I reload the page
      Then the sound is still off

    Scenario: Fullscreen is offered where the browser allows it
      Given the browser supports fullscreen
      Then I can switch the page to fullscreen and back

    Scenario: No fullscreen control where the browser can't do it
      Given the browser doesn't support fullscreen
      Then no fullscreen control is shown
