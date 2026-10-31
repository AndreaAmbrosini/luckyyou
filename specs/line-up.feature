Feature: The Line-up
  A show can have a line-up: a step between picking the show and starting it,
  where the person sharing their screen chooses how each of today's people
  looks. The show says what can be chosen and draws each look; the app shows
  the step and keeps everyone's looks in this browser. Looks and themes never
  change who is picked: specs/pick.feature.

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

    Scenario: Today's people in a row, the chosen one under it
      Given a show's Line-up is open with 8 people
      When I click Ben's tile
      Then today's people sit in one row of tiles, in today's order, Ben's marked as chosen, in sun, and pressed
      And under the row, Ben is drawn bigger with his name, "Surprise me" and the show's options
      And an option that shows him in each choice has a sheet of its own beside him

    Scenario: The chosen one of each option is marked and named
      When Ben's look is shown
      Then in each option, the choice he has is marked by a check mark as well as by colour
      And each option's heading names his choice, as in "Colour: Orange"
      And a colour option shows its choices as round swatches, each named for screen readers

    Scenario: A choice changes the look at once
      Given Ben's look is shown
      When I choose another choice of an option
      Then Ben is drawn with it, bigger and on his tile

    Scenario: Surprise me
      Given Ben's look is shown
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

  # Decision 0015.
  Rule: A show can offer themes

    Scenario: Themes as postcards, "Surprise" first
      Given a show whose line-up offers themes
      When its Line-up opens
      Then a row of postcards sits above today's people: "Surprise", then each theme as a picture over its name
      And the chosen one is marked by a check mark as well as by colour

    Scenario: Surprise draws a theme at once
      Given a show's Line-up with themes is open
      When I choose "Surprise"
      Then a theme other than the one showing is drawn at random, and the Line-up shows it at once
      And "Surprise" is marked as chosen with a die, showing the drawn theme's picture
      And choosing "Surprise" again draws another

    Scenario: Choosing a theme
      Given a show's Line-up with themes is open
      When I choose a theme's postcard
      Then that theme is chosen, and "Surprise" isn't

    Scenario: The theme is kept
      Given I chose a theme on a show's Line-up
      When I reload the page and open that show's Line-up again
      Then the same theme is chosen

    Scenario: A kept Surprise draws afresh
      Given I left a show's Line-up on "Surprise"
      When I open that show's Line-up again
      Then "Surprise" is chosen, with a theme drawn afresh

    Scenario: The first time, it's Surprise
      Given no theme was ever chosen for a show in this browser, or the one kept is no longer offered
      When its Line-up opens
      Then "Surprise" is chosen, with a theme drawn

    Scenario: A theme's own tab
      Given a show whose themes each suit some of its first option's choices
      When a theme is chosen and Ben's look is shown
      Then the option's first tab is named for the theme, marked with a star, and holds the choices that suit it
      And each of those choices is still in its own group's tab
      And with a theme that no choice suits, there is no such tab

    Scenario: The show is handed the theme
      Given a theme is chosen, by hand or by "Surprise"
      When I start the show
      Then the show is handed that theme, and can't change it
      And "Run again" runs it with the same theme

    Scenario: In the lab, the theme is drawn from the seed, unless I choose one
      When I run a show with themes in the lab
      Then its theme is drawn from the run's seed
      And when I choose a theme in the lab, it runs on that one

  # Decision 0016. Step 2 of The Race's themes.
  @pending
  Rule: A show can draw its start

    Scenario: The Line-up shows the show's start
      Given a show whose line-up draws its start, with 8 people
      When its Line-up opens
      Then the show's start, drawn in the chosen theme, takes the place of the row of tiles, with everyone in their look, in today's order
      And beside each person are a die and a pin
      And the chosen person's look is in a panel over the start, with their name, their pin, "Surprise me" and the show's options

    Scenario: Choosing someone where they stand
      When I click Ben where he stands
      Then Ben is marked as chosen, in sun, and pressed, and his look is in the panel

    Scenario: Another theme redraws the start
      When I choose another theme
      Then the start is drawn in it at once, everyone in their look

  # Decision 0016. Step 2 of The Race's themes.
  @pending
  Rule: Pinned looks stay

    Scenario: Choosing by hand pins a look
      Given Ben's look is shown and isn't pinned
      When I choose any of his choices
      Then Ben is pinned: his pin is pressed, in sun with a solid outline

    Scenario: A pin can be taken off
      Given Ben is pinned
      When I press his pin
      Then he isn't pinned: his pin is white with a dashed outline

    Scenario: Shuffle everyone leaves pinned looks alone
      Given Anna and Ben are pinned
      When I choose "Shuffle everyone"
      Then everyone else gets a look drawn at random, and Anna and Ben keep theirs
      And beside the button, a note says how many pinned looks stay

    Scenario: A die deals one look
      Given Ben is pinned
      When I press the die beside Ben, or "Surprise me" in his panel
      Then Ben gets a look drawn at random, unlike the one he had, and isn't pinned

    Scenario: Pins are kept
      Given Ben is pinned
      When I reload the page and open that show's Line-up again
      Then Ben is still pinned

    Scenario: New looks flip in
      When "Shuffle everyone" deals new looks
      Then each one flips in like a turned sticker, in 0.4 seconds or more, one after another from the first person down
      And with reduced motion, the looks change without flipping

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
        | problem                                           |
        | no options                                        |
        | an option with fewer than 2 choices               |
        | two options with the same name                    |
        | no way to draw a look                             |
        | a choice in a group without a label               |
        | a picture for only some choices                   |
        | fewer than 2 themes                               |
        | two themes with the same name                     |
        | a theme without a picture                         |
        | a theme suiting a choice its option doesn't offer |
