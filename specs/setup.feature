Feature: Setting up a pick
  Two steps before the show: the person sharing their screen ticks who is in
  today, then clicks the show to play. A show with a line-up adds a third:
  specs/line-up.feature.

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

  Rule: Clicking a show starts it

    Scenario: The shows step names who is in
      Given "Anna", "Ben" and "Carla" are ticked
      When I move on to the shows
      Then I see that 3 are in: "Anna", "Ben" and "Carla"

    Scenario: Each name in the list keeps its own reading direction
      Given "ليلى", "Anna" and "Ben" are ticked
      When I move on to the shows
      Then "ليلى", "Anna" and "Ben" each read in their own direction

    Scenario: Clicking a show starts it with today's people
      Given "Anna", "Ben" and "Carla" are ticked
      And I moved on to the shows
      When I click "Shark Bait"
      Then Shark Bait starts with "Anna", "Ben" and "Carla"

    Scenario: Going back keeps the ticks
      Given "Anna" and "Ben" are ticked
      And I moved on to the shows
      When I go back to who's in
      Then "Anna" and "Ben" are still ticked

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

    Scenario: The show played last time is marked and has the focus
      Given I played "Hot Potato" on my last visit
      When I move on to the shows
      Then "Hot Potato" is marked "Last time"
      And it has the keyboard focus, so Enter plays it again

    Scenario: If the last show can't run today, the first one that can has the focus
      Given I played "Hot Potato" on my last visit, and it takes at most 6 people
      And 8 people are ticked
      When I move on to the shows
      Then the first scenario that takes 8 people has the keyboard focus

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
