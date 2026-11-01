Feature: Setting up a pick
  Two steps before the show: the person sharing their screen ticks who is in
  today, then chooses the show to play and starts it. A show with a line-up
  adds a third: specs/line-up.feature.

  Rule: Every step before the show has the same frame

    Scenario: The way back on the left, the one main button on the right
      When I am on Who's in, Pick a show or a Line-up
      Then a bar along the bottom holds the way back, where there is one, on the left, and the step's main button on the right
      And a main button that can't be pressed has its reason beside it

    Scenario: A done step shows what was chosen there
      Given 8 people are ticked and "The Race" is chosen
      When its Line-up is open
      Then the steps read "Who's in · 8", "Show · The Race" and "Line-up", the last one current
      And each done step has a check mark

    Scenario: The Line-up step shows once a show with a line-up is chosen
      When I am on Pick a show
      Then the steps read "Who's in" and "Show" while the chosen show has no line-up
      And "Line-up" joins them as soon as a show with a line-up is chosen

  Rule: Moving on needs 2 to 12 ticked people

    Scenario Outline: Moving on with <ticked> ticked
      Given <ticked> people are ticked
      Then moving on to the shows is <state>

      Examples:
        | ticked | state   |
        | 1      | blocked |
        | 2      | allowed |
        | 12     | allowed |
        | 13     | blocked |

    Scenario: Too few ticked says why
      Given 1 person is ticked
      Then I'm told "At least 2 people are needed. 1 is ticked."

    Scenario: Too many ticked says why
      Given 13 people are ticked
      Then I'm told "At most 12 people can take part. 13 are ticked."

  Rule: Pick a show follows Who's in

    Scenario: The shows step names who is in
      Given "Anna", "Ben" and "Carla" are ticked
      When I move on to the shows
      Then I see that 3 are in: "Anna", "Ben" and "Carla"

    Scenario: Each name in the list keeps its own reading direction
      Given "ليلى", "Anna" and "Ben" are ticked
      When I move on to the shows
      Then "ليلى", "Anna" and "Ben" each read in their own direction

    Scenario: Going back keeps the ticks
      Given "Anna" and "Ben" are ticked
      And I moved on to the shows
      When I go back to who's in
      Then "Anna" and "Ben" are still ticked

  Rule: Choosing a show, then starting it

    Scenario: Clicking a show chooses it, and nothing starts
      Given "Anna", "Ben" and "Carla" are ticked
      And I moved on to the shows
      When I click "Shark Bait"
      Then "Shark Bait" is chosen, marked by a check mark as well as by colour
      And under the shows, a panel names it, says how many people it takes, and that Start plays it at once
      And the show hasn't started

    Scenario: Start plays the chosen show
      Given "Anna", "Ben" and "Carla" are ticked, and "Shark Bait" is chosen
      When I press "Start Shark Bait"
      Then Shark Bait starts with "Anna", "Ben" and "Carla"

    Scenario: A show with a line-up leads to it
      When I choose "The Race"
      Then the panel says its Line-up comes next
      And the main button reads "Next: line up the racers", from the line-up's heading

    Scenario: Start with last line-up
      Given "The Race" is chosen, and its Line-up was last left on "Autumn"
      When I press "Start with last line-up"
      Then The Race starts at once, everyone in the look kept for them, on "Autumn"
      And a Line-up last left on "Surprise" draws its theme afresh

  Rule: Scenario cards show whether they can run

    Scenario: A card shows the scenario's name, description and picture
      Given a scenario named "Hot Potato", described as "A bomb goes round the circle.", pictured as 💣
      Then its card shows the name, the description and the picture

    Scenario: A card that can't run with today's count is disabled, with the reason
      Given a scenario that takes 3 to 6 people
      And 8 people are ticked
      Then its card is disabled
      And it says "Takes at most 6 people"

  Rule: The show played last time is ready to play again

    Scenario: The show played last time is chosen, and Enter goes on with it
      Given I played "Hot Potato" on my last visit
      When I move on to the shows
      Then "Hot Potato" is chosen and marked "Last time"
      And the main button has the keyboard focus, so Enter starts it again

    Scenario: If the last show can't run today, the first one that can is chosen
      Given I played "Hot Potato" on my last visit, and it takes at most 6 people
      And 8 people are ticked
      When I move on to the shows
      Then the first scenario that takes 8 people is chosen
      And the main button has the keyboard focus

    Scenario: If no show can run, the step says why
      Given no scenario takes 11 people
      And 11 people are ticked
      When I move on to the shows
      Then every card is disabled
      And I'm told no show can run with 11 people

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

  Rule: Music has its own switch and volume

    Scenario: The music button opens the music panel
      When I click the music button in the header
      Then a panel opens under it with a "Music" switch and a "Volume" slider showing its value
      And Esc or a click outside closes the panel, and the focus goes back to the button

    Scenario: Music starts on, at 70%
      Given a first visit
      Then the music is on, at 70%

    Scenario: Music and its volume are remembered in this browser
      Given I turned the music off and set its volume to 40%
      When I reload the page
      Then the music is still off, at 40%

    Scenario: Sound off silences the music too
      Given the sound is off
      Then the music button shows the music as off
      And the panel's switch and slider are disabled, with the reason "Sound is off."
      When I turn the sound back on
      Then the music is on or off, at the volume, as I left it

    Scenario: Moving the volume plays a sample
      When I move the volume slider
      Then a short sample of music plays at the new volume
      And moving it again while the sample plays changes its volume without starting it over
      And the sample stops when the panel closes
