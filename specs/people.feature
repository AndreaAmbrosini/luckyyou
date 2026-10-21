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
      Then I'm told "Marco is already on the list."
      And "Marco" is highlighted on the list

    Scenario Outline: A name has 1 to 30 characters
      When I add a name of <length> characters
      Then it is <outcome>

      Examples:
        | length | outcome |
        | 0      | refused |
        | 30     | added   |
        | 31     | refused |

    Scenario: An empty name says what to do
      When I add "   "
      Then I'm told "Type a name first."

    Scenario: A name that is too long says how long it is
      When I add a name of 31 characters
      Then I'm told "A name can have up to 30 characters. This one has 31."

    Scenario: Characters are counted as people see them
      When I add a name made of 30 flag emoji
      Then it is added, as 30 characters

  @pending
  Rule: The list is in alphabetical order

    Scenario: Case doesn't change the order
      Given the list has "ben", "Carla" and "Anna"
      Then the list is "Anna", "ben", "Carla"

    Scenario: A new person is added ticked, in their place
      Given the list is "Anna", "Carla"
      When I add "Ben"
      Then the list is "Anna", "Ben", "Carla"
      And "Ben" is ticked

  @pending
  Rule: Ticking chooses who is in today's pick

    Scenario: Unticking keeps the person on the list
      Given the list has "Anna", ticked
      When I untick "Anna"
      Then "Anna" is still on the list, unticked

    Scenario: Everyone can be ticked or unticked at once
      Given the list has "Anna", ticked, and "Ben", unticked
      When I tick everyone
      Then "Anna" and "Ben" are ticked
      When I untick everyone
      Then nobody is ticked

  @pending
  Rule: Removing someone is a separate step

    Scenario: Ticking never removes anyone
      Given the list has "Anna"
      Then there is no remove button for "Anna"
      When I choose "Remove people"
      Then there is a remove button for "Anna"

    Scenario: Removing takes the person off at once
      Given the list has "Anna"
      And I chose "Remove people"
      When I remove "Anna"
      Then the list is empty

    Scenario: While removing, nobody can be ticked or added
      Given I chose "Remove people"
      Then names can't be ticked or unticked
      And no name can be added
      When I choose "Done"
      Then names can be ticked and added again

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
