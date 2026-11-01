Feature: The Line-up
  A show can have a line-up: a step between picking the show and starting it,
  where the person sharing their screen chooses how each of today's people
  looks. The show says what can be chosen and draws each look; the app shows
  the step and keeps everyone's looks in this browser. Looks and themes never
  change who is picked: specs/pick.feature.

  # The new setup's build steps are listed in specs/setup.feature. Each
  # pending scenario here says its step; "Old design" marks what a step
  # replaces.

  Rule: A show with a line-up opens it first

    Scenario: Next opens the chosen show's Line-up
      Given "Anna", "Ben" and "Carla" are ticked, and a show with a line-up is chosen
      When I press its "Next" button
      Then its Line-up shows "Anna", "Ben" and "Carla", in today's order, each drawn in their look
      And the show hasn't started

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

    Scenario: Going back keeps the looks, there and back
      Given I changed Anna's look on a show's Line-up
      When I go back to the shows, then press "Next" to its Line-up again
      Then Anna has the look I chose

  # Step 2. Decision 0019.
  @pending
  Rule: Everyone stands in one row, on the theme's ground

    Scenario: Everyone stands in one row
      Given a show's Line-up is open with 8 people
      Then everyone stands in one row, in today's order, drawn in their look
      And under each is a card with their name, their look in words, a die and a pin

    Scenario: The row stands on the theme's ground
      Given a show whose themes each name a ground
      When a theme is chosen
      Then the row stands on its ground, in the sky and floor colours it names
      And choosing another theme changes the ground at once

    Scenario: Clicking someone opens their look in a sheet
      Given a show's Line-up is open with 8 people
      When I click Ben, or his card
      Then a sheet opens over the Line-up with Ben drawn bigger, his name, "2 of 8", "Surprise me", his pin and the show's options
      And its arrows show the previous and the next person
      And "Done" or Esc closes it, and the focus goes back to Ben's card

    Scenario: A choice shows at once, in the sheet and in the row
      Given Ben's look is open in the sheet
      When I choose another choice of an option
      Then Ben is drawn with it at once, in the sheet and in the row

    Scenario: Readable over a screen share, in a row
      When a show's Line-up is open with 8 people, a 15-character name among them
      Then every name is at least --size-body, wrapping inside its card
      And every control is at least --target-min across, and shows the keyboard focus

    Scenario: Everything in view at 1280 by 800
      Given 8 people, a 15-character name among them, in a 1280 by 800 window
      When the Line-up opens
      Then the themes, everyone and their cards, and the bottom bar are in view without scrolling
      And with Ben's sheet open, his first option's first eight choices are in view, and any more scroll inside the sheet

  Rule: Changing a look

    # Old design: replaced by "Everyone stands in one row" and "Clicking
    # someone opens their look in a sheet" (step 2).
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

    # Old design: replaced by "A choice shows at once, in the sheet and in the
    # row" (step 2).
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

    # Old design: replaced by "Readable over a screen share, in a row" (step 2).
    Scenario: Readable over a screen share
      When a show's Line-up is open with 8 people, a 15-character name among them
      Then every name is at least --size-body, wrapping inside its tile
      And every control is at least --target-min across, and shows the keyboard focus

  # Decision 0017.
  Rule: A show can offer themes

    Scenario: Themes as postcards, "Surprise" first
      Given a show whose line-up offers themes
      When its Line-up opens
      Then a row of postcards sits above today's people: "Surprise", then each theme as a picture over its name
      And the chosen one is marked by a check mark as well as by colour

    # Step 2. Decision 0019.
    @pending
    Scenario: The themes come first, in the show's words
      Given a show whose line-up offers themes, and calls them tracks and its first option's choices racers
      When its Line-up opens with Autumn chosen, 9 racers suiting it
      Then above the postcards, the heading reads "1 · Track: Autumn · 9 racers suit it"
      And above today's people, "2 · Racers"

    # Step 2. Decision 0019.
    @pending
    Scenario: Choices that suit the theme are starred
      Given a theme is chosen, and 3 of today's 8 people have a first-option choice that suits it
      Then each of those 3 has a star in the row, read out as "Suits Autumn"
      And beside "2 · Racers", a star reads "3 of 8 suit Autumn"

    # Step 2. Decision 0019.
    @pending
    Scenario: The sheet shows the theme's choices first
      Given a theme that some of the first option's choices suit is chosen
      When Ben's look opens in the sheet
      Then the first option offers "Autumn racers" and "All racers", the first chosen, holding the choices that suit Autumn in its order
      And with "All racers", its groups are tabs, and each choice that suits Autumn has a star
      And with a theme that no choice suits, the option shows only its groups' tabs

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

    Scenario: Each look is drawn in the theme
      Given a show whose line-up offers themes
      When a theme is chosen
      Then the show draws every look in it, so it can dress everyone for it

    # Old design: replaced by "The sheet shows the theme's choices first"
    # (step 2).
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

  # Old design, the whole rule: replaced by the rule "Everyone stands in one
  # row, on the theme's ground" (step 2, decision 0019).
  # Decision 0016.
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

  # Decision 0016.
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

  # Step 3. Decision 0019.
  @pending
  Rule: Dealing from the theme's choices

    Scenario: The theme's choices, by default
      Given a show whose line-up offers themes, on Autumn, with Anna and Ben pinned
      Then beside "Shuffle everyone", a switch "Deal from" offers "Autumn racers" and "Any racer", the first on
      When I choose "Shuffle everyone"
      Then everyone but Anna and Ben gets a first-option choice that suits Autumn, as different from each other as those choices allow
      And their other options are drawn from all their choices

    Scenario: A die and Surprise me follow the switch
      Given the switch is on "Autumn racers"
      When I press the die beside Ben, or "Surprise me" in his sheet
      Then Ben gets a choice that suits Autumn, unlike the one he had

    Scenario: Any racer deals from every choice
      Given the switch is on "Any racer"
      When I choose "Shuffle everyone"
      Then the looks are dealt from all of the show's choices

    Scenario: A Surprise theme deals from the theme it drew
      Given "Surprise" drew "Moon"
      Then the switch offers "Moon racers", and deals from the choices that suit Moon

    Scenario: A theme that no choice suits has no switch
      Given a theme that names no choices is chosen
      Then there is no switch, and every deal draws from all the choices

    Scenario: The switch is kept per show
      Given I set the switch to "Any racer" on a show's Line-up
      When I reload the page and open that show's Line-up again
      Then the switch is still on "Any racer"
      And another show's switch is as I left it there

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
