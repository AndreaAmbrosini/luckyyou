Feature: The Line-up
  A show can have a line-up: a step between picking the show and starting it,
  where the person sharing their screen chooses how each of today's people
  looks. The show says what can be chosen and draws each look; the app shows
  the step and keeps everyone's looks in this browser. Looks never change who
  is picked: specs/pick.feature.

  Rule: A show with a line-up opens it first

    Scenario: Clicking a show with a line-up opens its Line-up
      Given "Anna", "Ben" and "Carla" are ticked
      And I moved on to the shows
      When I click a show with a line-up
      Then its Line-up shows a tile for each of "Anna", "Ben" and "Carla", in today's order, each drawn in their look
      And the show hasn't started

    Scenario: A show without a line-up still starts at once
      Given I moved on to the shows
      When I click a show without a line-up
      Then it starts

    Scenario: The steps show the third step
      When a show's Line-up is open
      Then the steps read "1 · Who's in", "2 · Pick a show" and "3 · Line-up", the last one current
      And on the other screens there are only the first two

    Scenario: Start has the focus
      When a show's Line-up opens
      Then its start button has the keyboard focus, so Enter starts the show with everyone's looks as they are

    Scenario: Starting plays the show with today's people
      Given "Anna", "Ben" and "Carla" are ticked, on a show's Line-up
      When I press its start button
      Then the show starts with "Anna", "Ben" and "Carla"

    Scenario: Run again skips the Line-up
      Given the result of a show with a line-up is showing
      When I choose "Run again"
      Then the show starts at once, with everyone's looks as they were

    Scenario: Going back keeps the looks
      Given I changed Anna's look on a show's Line-up
      When I go back to the shows, then click that show again
      Then Anna has the look I chose

  Rule: Changing a look

    # Old design: replaced by "Today's people in a row, the chosen one under it"
    # (step 1 of The Race's creatures, src/scenarios/the-race/the-race.feature).
    Scenario: Choosing whose look to change
      Given a show's Line-up is open
      When I click Ben's tile
      Then Ben's tile is marked as chosen, in sun, and pressed
      And beside the tiles, Ben is drawn bigger, with his name and each of the show's options

    # Step 1 of The Race's creatures.
    @pending
    Scenario: Today's people in a row, the chosen one under it
      Given a show's Line-up is open with 8 people
      When I click Ben's tile
      Then today's people sit in one row of tiles, in today's order, Ben's marked as chosen, in sun, and pressed
      And under the row, Ben is drawn bigger with his name, "Surprise me" and the show's options
      And an option shown as pictures has a sheet of its own beside him

    # Old design: replaced by "The chosen one of each option is marked and named" (step 1).
    Scenario: The chosen one of each option is marked
      When Ben's look is shown beside the tiles
      Then each option is a row of choices, with the one he has marked by a check mark as well as by colour
      And a colour option shows its choices as round swatches, each named for screen readers

    # Step 1 of The Race's creatures.
    @pending
    Scenario: The chosen one of each option is marked and named
      When Ben's look is shown
      Then in each option, the choice he has is marked by a check mark as well as by colour
      And each option's heading names his choice, as in "Colour: Orange"
      And a colour option shows its choices as round swatches, each named for screen readers

    Scenario: A choice changes the look at once
      Given Ben's look is shown beside the tiles
      When I choose another choice of an option
      Then Ben is drawn with it beside the tiles and on his tile

    Scenario: Surprise me
      Given Ben's look is shown beside the tiles
      When I choose "Surprise me"
      Then Ben gets a look drawn at random from the show's choices

    # Decision 0013.
    Scenario: An option's groups are tabs
      Given a show whose first option has choices in two groups
      When Ben's look is shown
      Then that option has one tab per group, named for the group, in the order their first choices come
      And it opens on the tab holding Ben's choice, showing only that group's choices
      And choosing the other tab shows its choices and leaves Ben's look as it was
      And it is still one option: one choice marked, and the choices read out under the option's label

    # Decision 0013.
    Scenario: Choices can be pictures
      Given a show whose first option shows its choices as Ben in each, and whose second gives each choice a picture
      When Ben's look is shown
      Then each choice of the first option is Ben drawn with that choice and the rest of his look, its label under it
      And each choice of the second shows its picture, its label read out for screen readers and shown when hovered
      And choosing a choice redraws the first option's pictures in Ben's new look

    Scenario: Surprise me draws from every group
      Given a show whose first option has choices in two groups
      When I choose "Surprise me" for Ben, again and again
      Then choices from both groups come up

    Scenario: Shuffle everyone
      When I choose "Shuffle everyone"
      Then each of today's people gets a look drawn at random
      And the looks vary as much as the choices allow

    Scenario: Readable over a screen share
      When a show's Line-up is open with 8 people, a 15-character name among them
      Then every name is at least --size-body, wrapping inside its tile
      And every control is at least --target-min across, and shows the keyboard focus

  Rule: Everyone keeps their look

    Scenario: A look survives a reload
      Given Anna has a look on a show's Line-up
      When I reload the page and open that show's Line-up again
      Then Anna has the same look

    Scenario: A newcomer gets a look at random
      Given Dario has never been on a show's Line-up
      When it opens with Dario ticked
      Then Dario has a look drawn at random
      And he keeps it from then on, unless it is changed

    Scenario: Each show keeps its own looks
      Given two shows with a line-up
      When I change Anna's look in one of them
      Then her look in the other doesn't change

    Scenario: A stored look that no longer fits keeps what still does
      Given Anna's stored look has a choice the show no longer offers
      When the show's Line-up opens
      Then that option gets a choice at random, and her other choices are kept

    Scenario Outline: Storage that is <problem> doesn't stop the Line-up
      Given this browser's storage is <problem>
      When a show's Line-up opens and I change Anna's look
      Then Anna is drawn with the new look
      And the show starts with it

      Examples:
        | problem |
        | blocked |
        | full    |

  Rule: The show gets the looks

    Scenario: The show is handed everyone's look
      Given "Anna" and "Ben" are on a show's Line-up
      When I start the show
      Then the show is handed Anna's look and Ben's look, by name
      And it can't change them

    Scenario: In the lab, looks are drawn at random
      When I run a show with a line-up in the lab
      Then each person gets a look drawn at random from the run's seed

  Rule: A line-up is checked

    Scenario Outline: A show whose line-up has <problem> is skipped
      Given a scenario folder whose line-up has <problem>
      When the app starts
      Then that scenario is not listed
      And the console says why

      Examples:
        | problem                             |
        | no options                          |
        | an option with fewer than 2 choices |
        | two options with the same name      |
        | no way to draw a look               |
      | a choice in a group without a label |
      | a picture for only some choices     |
