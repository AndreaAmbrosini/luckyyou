Feature: The show
  A scenario acts out the pick. The app hands it the window and stays out of
  its way.

  Rule: The show has the whole window

    Scenario: Nothing but the scenario is on screen
      When the show starts
      Then the scenario fills the whole window
      And the app draws nothing on top of it
      And the mouse pointer is hidden

  Rule: Sound follows the mute switch

    Scenario: A muted show makes no sound
      Given the sound is off
      When the show plays a sound
      Then nothing is heard

  Rule: Music follows the music switch and volume

    Scenario: With the music off, the show plays its sounds without music
      Given the sound is on and the music is off
      When the show plays music and a sound
      Then the sound is heard
      And the music isn't

    Scenario: Music plays at the chosen volume
      Given the music volume is 40%
      When the show plays music
      Then the music plays at 40% of its full level

  Rule: Esc or leaving fullscreen cancels

    Scenario: Esc cancels the show
      Given the show is playing
      When I press Esc
      Then I'm back to picking a show
      And no result is shown

    Scenario: Leaving fullscreen cancels the show
      Given the show is playing in fullscreen
      When the page leaves fullscreen
      Then I'm back to picking a show
      And no result is shown

  Rule: A broken show still gives a result

    Scenario: A scenario that fails still leads to the result
      Given a scenario that throws an error mid-show
      When the show starts
      Then the result names the app's pick

    Scenario: A scenario that never ends is stopped after 35 seconds
      Given a scenario that never finishes
      When the show has run for 35 seconds
      Then the scenario is stopped
      And the result names the app's pick
