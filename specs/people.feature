Feature: The people list
  The team's names, kept in this browser only. Ticking chooses who is in
  today's pick.

  @pending
  Rule: Names are tidied and must be unique

    Scenario: Extra spaces are removed
      When I add "  Anna   Maria  "
      Then the list shows "Anna Maria"

    Scenario: A name already on the list is refused, whatever its case
      Given the list has "Marco"
      When I add "marco"
      Then I'm told "Marco" is already on the list

    Scenario Outline: A name has 1 to 30 characters
      When I add a name of <length> characters
      Then it is <outcome>

      Examples:
        | length | outcome |
        | 0      | refused |
        | 30     | added   |
        | 31     | refused |

    Scenario: Characters are counted as people see them
      When I add a name made of 30 flag emoji
      Then it is added, as 30 characters

  @pending
  Rule: Ticking chooses who is in today's pick

    Scenario: A new person is added ticked, at the end
      Given the list is "Anna", "Ben"
      When I add "Carla"
      Then the list is "Anna", "Ben", "Carla"
      And "Carla" is ticked

    Scenario: Unticking keeps the person on the list
      Given the list has "Anna", ticked
      When I untick "Anna"
      Then "Anna" is still on the list, unticked

    Scenario: Removing takes the person off at once
      Given the list has "Anna"
      When I remove "Anna"
      Then the list is empty

    Scenario: Everyone can be ticked or unticked at once
      Given the list has "Anna", ticked, and "Ben", unticked
      When I tick everyone
      Then "Anna" and "Ben" are ticked
      When I untick everyone
      Then nobody is ticked

  @pending
  Rule: The list is kept in this browser only

    Scenario: The list survives a reload
      Given the list has "Anna"
      When I reload the page
      Then the list shows "Anna"

    Scenario: A damaged stored list keeps what still makes sense
      Given the stored list holds "Anna", an entry with no name and "anna"
      When the app starts
      Then the list is "Anna"

    Scenario: A list stored by an older version keeps what still makes sense
      Given the stored list holds "Anna" without a ticked state
      When the app starts
      Then "Anna" is on the list, ticked

    Scenario Outline: Storage that is <problem> doesn't stop the app
      Given this browser's storage is <problem>
      When I add "Anna"
      Then the list shows "Anna"

      Examples:
        | problem |
        | blocked |
        | full    |
