Feature: Hide and Seek
  Everyone hides behind big living-room furniture, with only a small giveaway
  showing, hoping to be found first and excused from the job. A seeker sweeps
  the room with a giant magnifying glass: found hiders cheer and hop up to the
  Found Balcony. When the seeker looks away a hider sneaks to a free spot, and
  sometimes the seeker turns in time to catch them mid-crossing. The last
  hider still hidden is crowned Hiding Champion and gets the job. The contract
  in specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows Hide and Seek
      Then its name is "Hide and Seek"
      And its description is "Best hider gets the job."
      And it takes 2 to 12 people

  Rule: Everyone hides, and getting found sets you free

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then at least <count> pieces of furniture, a seeker and a lens appear on stage
      And every person except the unlucky one is found with a pop, turns happy and goes safe on the balcony
      And the unlucky person is never found before the reveal

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

  Rule: Furniture really hides people and names stay readable

    Scenario: A furnished room rather than a row of props
      Then hiding places occupy two staggered depths for 4 to 12 people
      And the sofa and dining table are wider than they are tall

    Scenario: Hiders sit inside furniture that covers them
      Given 8 people
      When the show runs
      Then every hidden person shelters behind furniture at least 1.5 times as wide as their face
      And each piece of furniture shows a small giveaway
      And hiders occasionally peek above their hiding place while remaining behind it
      And no visible name tag overlaps visible furniture

  Rule: Big groups find pairs early so the show stays brisk

    Scenario Outline: Early sweeps find two at once with <count> people
      Given <count> people
      When the show runs
      Then at least one sweep before the final three finds two hiders together
      And the show lasts between 20 and 30 seconds

      Examples:
        | count |
        | 10    |
        | 12    |

  Rule: A near-miss pass-over teases a hider before moving on

    Scenario: The lens hovers over someone and skips past
      Given 8 people
      When the show runs with 15 different random seeds
      Then before the final three, the lens hovers with a sniff and creaks past without finding anyone

  Rule: When the seeker looks away a hider sneaks to another spot

    Scenario: Hiders keep changing hiding places
      Then at least two hiders cross between hiding places in every show with 4 to 12 people
      And later finding sweeps hold for less time than the first

    Scenario: A hider crosses the room while the seeker looks away
      Given 8 people
      When the show runs with 20 different random seeds
      Then the seeker looks away, a hider leaves cover and crosses the open floor to a free piece of furniture
      And some runs end the crossing hidden at the new spot and some runs have the seeker turn back and catch the hider mid-crossing
      And a caught hider turns happy and goes safe on the balcony
      And nobody is found while the seeker looks away

  Rule: The final stretch spotlights the last hiders

    Scenario: Final three spotlight
      Given 8 people
      When 3 people are left at risk
      Then the caption is "Final three!" and the spotlight turns on
      And the remaining hiders stay behind their furniture with scared, sweating faces while it trembles
      And the heartbeat starts and comes quicker until the reveal
      And the music plays on without its bass until the reveal

  Rule: Three endings decide the last two

    Scenario: All three endings appear across runs
      Given 6 people
      When the show runs with 30 different random seeds
      Then some runs end with "double-take", some with "decoy-wave" and some with "walk-on-by"

    Scenario: Each ending pauses, cuts the music and crowns the champion
      Given 6 people, and the unlucky person is "Marco"
      When the show runs with each ending
      Then the final two hold a freeze of at least 0.5 seconds before the last safe hider is cleared
      And each ending shows its own clue before the last safe hider is found
      And the music stops before the fanfare and does not come back
      And Marco is crowned in the party mood with the caption "Marco wins Hide and Seek!"
      And Marco holds still on stage for the last 1.5 seconds

  Rule: Small groups go straight to the showdown

    Scenario Outline: <count> people open in spotlight mode
      Given <count> people
      When the show runs
      Then the spotlight turns on right after the opening with "<caption>"
      And the lens makes at least one fake-out pass before anyone is found
      And a hider sneaks to the spare piece of furniture while the seeker looks away
      And the show lasts between 20 and 30 seconds

      Examples:
        | count | caption                |
        | 2     | Just the two of you…   |
        | 3     | Just the three of you… |

  Rule: No two visible name tags or speech bubbles overlap

    Scenario: Twelve long names and speech bubbles stay clear
      Given 12 people with long names
      When the show runs
      Then every visible name tag is at least 22 pixels and no two visible name tags overlap
      And no visible speech bubble covers a visible name tag or a face that shows

    Scenario: Reduced motion keeps the story without idle bobbing
      Given 6 people and reduced motion is on
      When the show runs
      Then waiting hiders hold still between sweeps
      And the captions, the finds and the times the seeker looks away are the same as with full motion
