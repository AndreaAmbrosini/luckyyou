Feature: The Race
  Everyone rides a mount the host chose on the Line-up (specs/line-up.feature)
  down a sports-field track, a lane each, the camera following the leaders.
  Winning is losing: whoever is in front looks scared and pulls on the reins,
  and the mount doesn't listen. One thing happens at a time, a mount bursting
  ahead or stopping. The final stretch runs at full speed, only the last
  moment before the line is slow, and the unlucky person crosses first: by a
  nose in a photo finish, past a rival who brakes, or in a surge from behind.
  The contract in specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows The Race
      Then its name is "The Race"
      And its description is "Whoever crosses the line first gets the job."
      And its picture is 🏁
      And it takes 2 to 8 people
      And it has a line-up

  Rule: Its line-up

    Scenario: Ride, colour and extra
      When the Line-up opens for The Race
      Then its heading is "Line up the racers" and its button "Start the race"
      And "Rides" offers "Snail", "Duck", "Office chair" and "Caterpillar"
      And "Colour" offers tomato, sun, mint, grape, pink and orange, as swatches
      And "Extra" offers "Googly eyes", "Top hat", "Number" and "Scarf"
      And each tile and the preview draw the racer as the show does, calm

    Scenario: Each racer looks as chosen
      Given Anna chose the duck, sun and the scarf, and Ben the office chair, grape and googly eyes
      When the show runs
      Then Anna rides a sun duck on a skateboard, in a sun shirt, with a scarf
      And Ben rides a grape office chair backwards, holding its backrest, in a grape shirt, with googly eyes on the backrest
      And each rider's head keeps the skin tone and accessory the kit hands out for the run

    Scenario: A racing number is their place in today's list
      Given Carla is third in today's list and chose "Number"
      When the show runs
      Then her mount wears a paper roundel with "3"

  Rule: The unlucky person crosses first

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs with 20 different random seeds
      Then the first nose over the finish line is always the unlucky person's
      And nobody else's nose reaches the line before theirs

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |

    Scenario: Nobody wins out of nowhere
      Given 8 people
      When the show runs with 20 different random seeds
      Then from "Final stretch!" on, the unlucky person is always among the front three
      And in the photo finish and the late brake, among the front two

    Scenario: Who leads gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first to take the lead is at least 5 different people
      And the unlucky person leads before the final stretch in some runs and not in others
      And the others in the front group of the final stretch are at least 4 different people across the runs

  Rule: Winning is losing

    Scenario: The leader is scared, the rest relieved
      Given 8 people
      When the show runs
      Then whoever is in front looks scared, sweats, leans back and pulls on the reins, or holds on tight on the chair
      And whoever is within a mount's length behind them looks worried
      And everyone further back looks happy, some of them waving

  Rule: One thing at a time

    Scenario: The start
      When the show runs
      Then everyone waits at the start line, noses on it, with the caption "On your marks…"
      And at "Go!" they spring off together and the camera starts to follow the leaders

    Scenario Outline: With <count> people there are <events> events before the final stretch
      Given <count> people
      When the show runs
      Then <events> things happen before "Final stretch!", one at a time, each with a caption of its own
      And each starts 2.5 seconds or more after the one before

      Examples:
        | count | events |
        | 2     | 2      |
        | 5     | 2      |
        | 6     | 3      |
        | 8     | 4      |

    Scenario Outline: A <mount> bursts ahead
      When someone's <mount> bursts ahead
      Then the caption is "<name>'s <mount> <burst>!"
      And it shoots into the lead, its rider shouting "Nooo!"

      Examples:
        | mount       | name  | burst            |
        | snail       | Ben   | finds a turbo    |
        | duck        | Anna  | rolls downhill   |
        | chair       | Marco | catches a gust   |
        | caterpillar | Ivo   | goes full wiggle |

    Scenario Outline: A <mount> stops
      When someone's <mount> stops
      Then the caption is "<name>'s <mount> <stop>!"
      And <what>, and it drops back while the camera goes on
      And its rider waves, says "Phew!", and the mount sets off again further back

      Examples:
        | mount       | name  | stop              | what                             |
        | snail       | Ben   | stops for a snack | it nibbles a lettuce leaf        |
        | duck        | Anna  | hits a pebble     | it tips up and back              |
        | chair       | Marco | spins round       | it spins round twice             |
        | caterpillar | Ivo   | dozes off         | it says "Zzz…" and stops bobbing |

  Rule: The final stretch, and a slow last moment

    Scenario: Full speed to the line
      Given 8 people
      When "Final stretch!" appears
      Then the heartbeat starts, and comes quicker and quicker until the line
      And the front two or three close up and swap places once
      And the camera keeps its speed, and the finish line comes in from the right

    Scenario: Only the last moment is slow
      When the front reaches a mount's length from the finish line
      Then everything slows to a quarter of its speed, the camera, the racers and their gaits, for 1.2 to 1.6 seconds
      And nothing before that is slowed

  Rule: The last moment could go three ways

    Scenario: The ending, over many runs
      Given 8 people
      When the show runs with 40 different random seeds
      Then about half end in a photo finish, and the rest in a late brake or a surge

    Scenario: Photo finish
      Given the unlucky person is "Anna", side by side with "Priya" at the line
      When their noses cross
      Then everything freezes, the stage flashes once, and the caption is "Photo finish!"
      And a photo pops up showing the two side-on at the line, Anna's nose over it first
      And it says "Anna, by a nose!"

    Scenario: Late brake
      Given the unlucky person is "Anna", just behind "Ben" at the start of the slow moment
      When the slow moment starts
      Then the caption is "Ben slams on the brakes!" and Ben stops short of the line, saying "Phew!"
      And the caption is "Anna can't stop!" as Anna sails past him and over the line

    Scenario: Surge
      Given the unlucky person is "Anna", third behind two others at the start of the slow moment
      When the slow moment starts
      Then the caption is Anna's mount bursting ahead, as in an event, and she shouts "Nooo!"
      And she passes both and crosses first

  Rule: The winner gets the trophy

    Scenario: The win
      Given the unlucky person is "Anna"
      When she has crossed the line
      Then the caption is "Anna wins!", with a fanfare and confetti
      And Anna holds a trophy over her head, in the party mood
      And everyone else celebrates

    Scenario: The name holds still at the end
      Given the unlucky person is "Anna"
      When the show runs
      Then "Anna" is on stage, not moving, for the last 1.5 seconds

  Rule: The beats keep every show inside the limit

    Scenario: About 20 to 22 seconds at 8 people
      Given 8 people
      When the show runs with each ending
      Then each run lasts between 19 and 24 seconds

    Scenario: Every head count lands between 14 and 25 seconds
      When the show runs at every head count from 2 to 8, with each ending
      Then each run lasts between 14 and 25 seconds

  Rule: It reads without sound

    Scenario: Captions tell the race, a thing at a time
      Given 6 people, the unlucky person is "Anna", Ben's snail and Carla's duck burst ahead, Carla's duck stops, and it ends in a photo finish
      When the show runs
      Then the captions include, in this order:
        | caption                        |
        | On your marks…                 |
        | Go!                            |
        | Ben's snail finds a turbo!     |
        | Carla's duck rolls downhill!   |
        | Carla's duck hits a pebble!    |
        | Final stretch!                 |
        | Photo finish!                  |
        | Anna wins!                     |

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Racers are drawn as big as the lanes allow
      When the show runs at 8 and at 4 people
      Then at 8 people, heads are 46 pixels or more and name tags 22 pixels or more, on the 1280 by 720 stage
      And at 4 people, heads are 84 pixels or more
      And every rider's head sits at the same height in its lane, whatever the mount

    Scenario: Name tags sit beside the face
      When the show runs at 8, at 4 and at 2 people, a 15-character name among them
      Then each name tag sits beside its rider's face, behind it, level with it, and moves with them
      And no name tag is ever over another, or over a face
      And no speech bubble covers a name tag or a face
      And each speech bubble sits by its speaker, touching their face or name tag

    Scenario: Everyone stays on stage
      When the show runs at 8 people
      Then every racer is on stage from "On your marks…" to the end

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, nothing shakes
      Given reduced motion is on
      When the show runs
      Then there are no speed lines, the duck doesn't tip and the chair doesn't spin
      And the slow last moment, the photo and every caption still come, in the same order
