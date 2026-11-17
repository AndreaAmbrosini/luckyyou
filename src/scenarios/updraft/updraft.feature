Feature: Updraft!
  Everyone skydives in vertical lanes under homemade parachutes chosen on the
  Line-up (specs/line-up.feature) toward the ON DUTY landing mat. Falling
  lowest is bad: upward wind gusts rescue lucky jumpers into the clouds until
  the ground rises and the unlucky person's boots touch the mat first. The
  contract in specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Updraft!
      Then its name is "Updraft!"
      And its description is "First feet on the mat get the job."
      And it takes 2 to 8 people
      And it has a line-up

  Rule: A line-up packs everyone's chute for the drop zone

    Scenario: Jumpers, drop zones, colours and extras
      When the Line-up opens for Updraft!
      Then its heading is "Line up the jumpers" and its start button is "Take the plunge"
      And its themes are called "Drop zone", and the first option's choices "jumpers"
      And its themes are "Sunny meadow", "Office roof", "Windy pier" and "Moon crater", each with sky and floor colours and suiting jumpers
      And its options are "Jumper", "Colour" and "Extra"
      And "Jumper" is drawn in groups "Classics", "Cupboard" and "Wildcards", and every "Extra" has a picture

    Scenario: Chosen chutes and drop zone appear on stage
      Given Anna chose "umbrella" in "sun" with "scarf" and Ben chose "pizza" in "grape" with "mug" on "crater"
      When the show runs
      Then the stage uses the "crater" drop zone
      And Anna falls under the "umbrella" canopy in "sun" wearing "scarf"
      And Ben falls under the "pizza" canopy in "grape" wearing "mug"

  Rule: Updrafts blow lucky jumpers clear until one lands on the mat

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then every person except the unlucky one catches a whoosh updraft, turns happy and goes safe into the clouds
      And the unlucky person touches the landing mat with a thunk

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 5     | first    |
        | 5     | last     |
        | 8     | first    |
        | 8     | last     |

  Rule: Falling lowest is scary, and the lead changes hands in the sky

    Scenario: Whoever is lowest panics, and thermals swap the lowest jumper
      Given 6 people
      When the show runs with 15 different random seeds
      Then before the spotlight, whoever is lowest among at-risk jumpers looks scared and sweats
      And at least 2 different jumpers fall lowest before the spotlight

  Rule: Wind checks are quick and frequent, but usually miss

    Scenario Outline: <count> people get frequent checks and occasional updrafts
      Given <count> people
      When the show runs
      Then wind checks start at 2.2 seconds and accelerate after rescues, with <checks> checks before the spotlight
      And most checks miss without a caption, bubble or whoosh
      And a missed check briefly lifts one jumper without saving them
      And the <wins> successful checks lift a group together with one whoosh each, at least 2 seconds apart
      And the spotlight waits at least 2.5 seconds after the last successful check

      Examples:
        | count | checks | wins |
        | 6     | 7      | 2    |
        | 8     | 10     | 3    |

    Scenario: The spotlight, the side gust and the ending each get their own moment
      Given 8 people
      When the show runs
      Then before touchdown no two gusts, caption changes or thunks are less than 1.5 seconds apart
      And the spotlight comes on at least 2.5 seconds after the last early updraft
      And the side gust comes at least 2.5 seconds after the spotlight
      And the fanfare comes between 24 and 27 seconds

  Rule: The ground rises for the final stretch

    Scenario: Spotlight and rising mat
      Given 6 people
      When 3 jumpers are left at risk
      Then the spotlight turns on and the landing mat rises onto the stage
      And the remaining jumpers widen and grow larger
      And the heartbeat starts and speeds up until touchdown
      And the music plays on without its bass until touchdown

  Rule: Three endings decide touchdown

    Scenario: All three endings appear across runs
      Given 6 people
      When the show runs with 30 different random seeds
      Then some runs end with "ankle-gust", some with "canopy-fold" and some with "boot-boop"

    Scenario: Each ending stalls over the mat, cuts the music and lands the winner
      Given 6 people, and the unlucky person is "Marco"
      When the show runs with each ending
      Then the final two stall over the mat for at least 0.5 seconds before touchdown
      And the music stops before the fanfare and does not come back
      And Marco stands on the mat in the party mood with the caption "Marco lands first!"
      And Marco holds still on stage for the last 1.5 seconds

    Scenario: Every head count from 2 to 8 lasts between 20 and 28 seconds
      When the show runs at every head count from 2 to 8
      Then each run lasts between 20 and 28 seconds

  Rule: Every lane keeps name tags and bubbles apart

    Scenario: A name tag stays beside its owner and off the landing mat
      Given 8 people
      When the show runs
      Then every visible name tag is within 60 pixels of its owner's body
      And no visible name tag overlaps the landing mat
    Scenario: Eight long names and bubbles stay clear across drop zones
      Given 8 people with long names
      When the show runs on each drop zone
      Then every visible name tag is at least 22 pixels and no two visible name tags overlap
      And no visible speech bubble covers a visible name tag or face

    Scenario: Reduced motion stops cloud drift and canopy sway while keeping captions
      Given 5 people and reduced motion is on
      When the show runs
      Then the captions tell the same story as with full motion
      And the show lasts between 20 and 28 seconds
