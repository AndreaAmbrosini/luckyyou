Feature: The result screen
  Winning is losing: the person picked gets the job, and a sarcastic
  congratulation.

  Rule: The result names the unlucky person

    Scenario: The unlucky person is congratulated
      Given the app picked "Ben"
      When the show ends
      Then the heading says "Lucky you, Ben 🎉"
      And below it says "Sorry for your win"
      And the heading has the keyboard focus

  Rule: What happens next

    Scenario: Run again plays the same show for the same people
      Given the result says "Lucky you, Ben 🎉"
      When I choose "Run again"
      Then a new show starts with the same people and scenario

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

    Scenario: Change who's in
      Given the result is showing
      When I choose "Change who's in"
      Then I'm on the who's-in step with the same people ticked
