Feature: Local photo faces
  A person can wear a face from a picture, kept in this browser only.

  Rule: A photo belongs to the person

    Scenario: A saved photo survives a reload
      Given Anna has a saved photo
      When I reload the people list
      Then Anna still has that photo

    Scenario: A photo can be removed without removing the person
      Given Anna has a saved photo
      When I remove Anna's photo
      Then Anna has no photo and is still ticked

    Scenario: Unsafe stored pictures do not remove names
      Given Anna has a remote picture in storage
      When I reload the people list
      Then Anna has no photo and is still ticked

  Rule: A photo replaces the drawn face, not the character

    Scenario: A photo face keeps its accessories and reactions
      Given a person has a photo face
      When their mood changes through every mood
      Then the photo replaces their drawn facial features
      And their accessory and sweat remain

    Scenario: Photos do not change the random choices
      When looks are handed out with and without photos
      Then the random choices are the same

    Scenario: Every show uses the person's photo
      Given Anna has a photo for today's pick
      When each available show plays
      Then every show draws Anna's photo and finishes

    Scenario: Every Race creature can wear the person's photo
      Given Anna has a photo for today's pick
      When every Race creature is drawn
      Then each creature wears the photo instead of its drawn expression

    Scenario: Shows cannot alter the team's photos
      Given Anna has a photo for today's pick
      When a show tries to change its photo snapshot
      Then the photo snapshot stays unchanged and contains only today's people

  Rule: The host frames pictures before saving them

    Scenario: Each person has a separate photo control
      Given Anna is on the team
      When I open Anna's photo control
      Then I can choose a picture without changing who is ticked

    Scenario: Cancelling leaves the saved photo alone
      Given Anna has a saved photo
      When I cancel Anna's photo editor
      Then Anna still has that photo

    Scenario: Storage refusal is visible
      Given this browser cannot save the people list
      When I add Anna to the team
      Then I am warned that changes last only for this visit
