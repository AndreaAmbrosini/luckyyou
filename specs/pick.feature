Feature: The pick
  The app chooses the unlucky person before the show starts. The show only
  acts it out.

  Rule: The app picks before the show

    Scenario: The unlucky person is chosen as the show starts
      Given "Anna", "Ben" and "Carla" are ticked
      When I start the show
      Then the app picks one of them before the scenario begins
      And the scenario is told who it is

    Scenario: Everyone has the same chance
      Given "Anna", "Ben" and "Carla" are ticked
      When the app picks 30000 times
      Then each of them is picked about a third of the time

  Rule: The show cannot change the pick

    Scenario: The result names the app's pick, whatever the show did
      Given the app picks "Ben"
      And a scenario that ends its show on "Carla"
      When the show ends
      Then the result says "Lucky you, Ben 🎉"

    Scenario: A scenario that edits its list of names changes nothing later
      Given "Anna", "Ben" and "Carla" are ticked
      And a scenario that removes "Anna" from the names it is given
      When the show ends and I run again
      Then "Anna" is still in the pick

  Rule: Every run is a fresh pick

    Scenario: The person picked last time can be picked again
      Given "Ben" was picked in the last run
      When the next run starts
      Then "Ben" has the same chance as everyone else
