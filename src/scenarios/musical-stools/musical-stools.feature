Feature: Musical Stools
  Everyone waltzes around 1 to 3 party stools to a brass gramophone. When the
  needle lifts, whoever grabs a stool retires happily to the Safe Lounge,
  shrinking the circle until two marchers circle one lone stool and the last
  one left standing gets the giant Boss Throne. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Musical Stools
      Then its name is "Musical Stools"
      And its description is "Last one standing gets the job."
      And it takes 2 to 12 people

  Rule: Marchers circle the stools and grabbing one makes you safe

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then a gramophone and between 1 and 3 stools appear inside the ring each round
      And every person except the unlucky one grabs a stool with a thunk and retires happy to the lounge
      And the unlucky person never sits on a party stool

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

  Rule: Each stop is staged on its own, with room before the next

    Scenario Outline: <count> people get their saves one stop at a time
      Given <count> people
      When the show runs
      Then the music stops at least 3.5 seconds after the stop before
      And people who grab stools at the same stop thunk at least 0.25 seconds apart
      And no two sounds come within 0.2 seconds of each other
      And no two captions are up less than 3 seconds apart
      And only the stops before the spotlight save more than one person
      And the show lasts at most 30 seconds

      Examples:
        | count |
        | 8     |
        | 12    |

  Rule: The stops start late and come faster as the show goes on

    Scenario: Every restart plays an audible part of the song
      Then every marching window lasts at least 1 second at every supported head count

    The first stop comes at least twice as late as it used to at that head
    count (3.9 s). The early groups get the most room, and every gap between
    stops is shorter than the one before. Movement speed does not change.

    Scenario Outline: <count> people wait <first> seconds for the first stop, then it speeds up
      Given <count> people
      When the show runs
      Then the first music stop comes at least <first> seconds in
      And every gap between stops is shorter than the one before
      And checks accelerate to a fastest cadence between 1 and 2 seconds with no check less than 1 second apart
      And the last stop comes within 26 seconds
      And the show lasts at most 30 seconds

      Examples:
        | count | first |
        | 8     | 10    |
        | 12    | 7.8   |

  Rule: The gramophone fakes everyone out at least once

    Scenario: A needle screech pauses the waltz without anyone sitting
      Given 8 people
      When the show runs
      Then before the final three, the gramophone creaks and pauses the music while nobody goes safe, then resumes

  Rule: The final stretch spotlights the last marchers

    Scenario: Final three spotlight
      Given 8 people
      When 3 marchers are left at risk
      Then the spotlight turns on over 1 stool
      And the remaining marchers grow larger and sweat
      And the heartbeat starts and speeds up until the final stool is taken
      And the waltz plays on without its bass until the final stop

  Rule: Three endings settle the last stool between the final two

    Scenario: All three endings appear across runs
      Given 6 people
      When the show is planned with 30 different random seeds
      Then some runs end with "clean-beat", some with "encore-fakeout" and some with "hip-bump"

    Scenario: Each ending freezes, cuts the waltz and drops the Boss Throne
      Given 6 people, and the unlucky person is "Marco"
      When the show runs with each ending
      Then the final duel holds a freeze of at least 0.5 seconds before the reveal
      And the music stops before the fanfare and does not come back
      And a Boss Throne appears for Marco in the party mood with the caption "Marco gets the big chair!"
      And Marco holds still on stage for the last 1.5 seconds

  Rule: Two or three people start straight in the spotlight

    Scenario Outline: <count> marchers circle one stool from the start
      Given <count> people
      When the show runs
      Then the spotlight turns on right after the opening with "<caption>" and 1 stool
      And the gramophone fakes the marchers out before the decisive stop
      And the show lasts between 20 and 28 seconds

      Examples:
        | count | caption                    |
        | 2     | Two marchers, one stool!   |
        | 3     | Three marchers, one stool! |

  Rule: Orbiting name tags and speech bubbles never overlap

    Scenario: Twelve long names orbit without overlapping
      Given 12 people with long names
      When the show runs
      Then every visible name tag is at least 22 pixels and no two visible name tags overlap
      And no visible speech bubble covers a visible name tag or face

    Scenario: Reduced motion glides around the oval without waltz bounce
      Given 6 people and reduced motion is on
      When the show runs
      Then the captions tell the same story as with full motion
      And the show lasts between 20 and 28 seconds
