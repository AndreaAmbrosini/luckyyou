Feature: The result screen
  Winning is losing: the person picked gets the job, and a sarcastic
  congratulation.

  @pending
  Rule: The result names the unlucky person

    Scenario: The unlucky person is congratulated
      Given the app picked "Ben"
      When the show ends
      Then the heading says "Lucky you, Ben 🎉"
      And below it says "Sorry for your win"
      And the heading has the keyboard focus

    Scenario: The stake line is repeated
      Given the stake line is "Who writes the release notes?"
      When the show ends
      Then the result shows "Who writes the release notes?"

  @pending
  Rule: What happens next

    Scenario: Run again plays the same show for the same people
      Given the result says "Lucky you, Ben 🎉"
      When I choose "Run again"
      Then a new show starts with the same people, scenario and stake line

    Scenario: Run again without the unlucky person
      Given "Anna", "Ben" and "Carla" are ticked
      And the result says "Lucky you, Ben 🎉"
      When I choose "Run again without Ben"
      Then "Ben" is unticked in the people list
      And a new show starts with "Anna" and "Carla"

    Scenario: Run again without Ben is disabled when the scenario needs more people
      Given a scenario that needs at least 3 people
      And the result for "Anna", "Ben" and "Carla" says "Lucky you, Ben 🎉"
      Then "Run again without Ben" is disabled
      And I'm told the scenario needs at least 3 people

    Scenario: Back to setup
      Given the result is showing
      When I choose "Back to setup"
      Then I'm on the setup screen with the same people ticked
