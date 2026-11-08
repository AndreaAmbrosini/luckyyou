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

    Scenario: The job is the prize
      Given the prize is "Writing the release notes"
      And the app picked "Ben"
      When the show ends
      Then under the heading it says "Your prize: Writing the release notes"

    Scenario: Without a prize, the result only congratulates
      Given no prize is named
      When the show ends
      Then the result names no prize
      And under the heading it says "Sorry for your win"

  Rule: The news arrives one piece at a time

    Scenario: The card comes in, then the name, the prize and the ribbon, then the buttons
      Given the prize is "Running the retro"
      When the show ends
      Then the card, the name, the prize and the ribbon come in, in that order
      And the buttons come in after the ribbon
      And confetti falls behind the card

    Scenario: With reduced motion, everything is simply there
      Given the browser asks for reduced motion
      When the show ends
      Then every part is there from the start
      And no confetti falls

  Rule: A ta-da that deflates

    Scenario: A ta-da turns into a sad trombone
      Given the sound is on
      When the show ends
      Then a ta-da plays and deflates into a sad trombone
      And it stops when I leave the result

    Scenario: A muted run's result is silent
      Given the sound is off
      When the show ends
      Then nothing is heard

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
