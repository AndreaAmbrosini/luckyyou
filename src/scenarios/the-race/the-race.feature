Feature: The Race
  Everyone races as the host chose on the Line-up (specs/line-up.feature):
  riding a mount, or as a creature on its own feet. They race a lane each, on
  a track drawn at random, the camera following the leaders. Winning is
  losing: whoever is in front looks scared, and the mount or the creature's
  legs don't listen. One thing happens at a time, a racer bursting ahead or
  stopping. The final stretch runs at full speed, only the last moment before
  the line is slow, and the unlucky person crosses first: by a nose in a photo
  finish, past a rival who brakes, or in a surge from behind. The contract in
  specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows The Race
      Then its name is "The Race"
      And its description is "Whoever crosses the line first gets the job."
      And its picture is 🏁
      And it takes 2 to 8 people
      And it has a line-up

  Rule: Its line-up

    Scenario: Rides and creatures, in one Racer option
      When the Line-up opens for The Race
      Then its first option is "Racer", its choices in two groups
      And the group "Rides" holds "Snail", "Duck", "Office chair", "Caterpillar", "Space hopper", "Ostrich", "Rocket" and "Sandwich"
      And the group "Creatures" holds "Zombie", "Robot", "Shark with feet", "Astronaut", "Monster", "Villain", "Alien" and "Dinosaur"
      And "Colour" and "Extra" offer the same choices as in step 1, for riders and creatures alike
      And each tile and the preview draw a creature as the show does, calm

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

    Scenario: Each new ride looks as chosen
      Given Anna chose the space hopper, Ben the ostrich, Carla the rocket and Dario the sandwich
      When the show runs
      Then Anna sits on the hopper and holds its horns
      And Ben holds reins tied to the ostrich's neck
      And Carla sits astride the rocket and holds its handlebar
      And Dario sits on the top slice and holds reins tied to its cocktail stick
      And each mount and shirt is in the colour chosen, and every rider's head sits at the same height in its lane

    Scenario: A cape and a bow tie
      Given Anna chose the cape and Ben the bow tie
      When the show runs
      Then Anna's cape flies out behind the rider's shoulders
      And Ben wears a bow tie at the collar
      And each is in sun, or in tomato on a sun shirt, as the scarf is

    Scenario: Each creature looks as chosen
      Given Femi chose the zombie in pink with "Number", and Giulia the shark with feet in sea with the top hat
      When the show runs
      Then Femi races as a zombie in a pink shirt, arms out in front, with a paper roundel on its chest
      And Giulia races as a sea-coloured shark on two legs in sneakers, wearing a top hat
      And neither has a rider or a mount

    Scenario Outline: Where a <creature> wears its colour
      When someone races as a <creature> in tomato
      Then <where> is tomato

      Examples:
        | creature  | where                                |
        | zombie    | its shirt                            |
        | robot     | its body and the ball on its antenna |
        | shark     | its body                             |
        | astronaut | its backpack and its chest panel     |
        | monster   | its fur                              |
        | villain   | its cape and its collar              |
        | alien     | its head, arms and legs              |
        | dinosaur  | its body                             |

    Scenario: The astronaut and the villain have the kit's faces
      When someone races as the astronaut or the villain
      Then its face has the skin tone the kit hands out for the run

  Rule: A track drawn at random

    Scenario: Each race draws its track
      Given 8 people
      When the show runs with 40 different random seeds
      Then each run is on the sports field, the office, under the sea or the Moon
      And each of the four comes up in at least 5 runs

    Scenario Outline: What <track> looks like
      When the show runs on <track>
      Then the ground is <ground>, and paper name tags read clearly on it
      And behind the track is <backdrop>
      And the lanes are split by <lines>, and the distances are <signs>

      Examples:
        | track            | ground                 | backdrop                                                  | lines              | signs                          |
        | the sports field | grass                  | sky, clouds, bunting and a rail with posts                | paper lines        | signs on posts                 |
        | the office       | grey carpet            | a wall with windows, a clock, low partitions and a plant  | sun tape           | sticky notes on the partitions |
        | under the sea    | sand                   | the sea, with fish, bubbles, seaweed and a rope of floats | orange stripes     | signs on posts                 |
        | the Moon         | grey dust with craters | a dark sky with stars, the Earth and a ringed planet      | dashed paper lines | signs on posts                 |

    Scenario Outline: <track> has a stop and a burst of its own
      Given 8 people, on <track>
      When the show runs with 20 different random seeds
      Then in every run, one event before "Final stretch!" is the track's own stop or burst
      And both come up across the runs

      Examples:
        | track         |
        | the office    |
        | under the sea |
        | the Moon      |

    Scenario: The sports field keeps the events it has
      When the show runs on the sports field
      Then every event is a racer's own burst or stop

    Scenario Outline: On <track>, <caption>
      When someone's event is <track>'s own <event>
      Then the caption is "<caption>"
      And <what>

      Examples:
        | track         | event | caption                          | what                                                                                                             |
        | the office    | stop  | Ben stops at the coffee machine! | a coffee machine stands by the wall, Ben's racer holds a paper cup, says "Phew!" and sets off again further back |
        | the office    | burst | Ben slides on a wet floor!       | a yellow wet-floor sign stands in the lane and Ben's racer skids into the lead, shouting "Nooo!"                 |
        | under the sea | stop  | Marco gets tangled in seaweed!   | seaweed wraps round Marco's racer until it shakes free, says "Phew!" and sets off again further back             |
        | under the sea | burst | Marco catches a current!         | swirls carry Marco's racer into the lead, shouting "Nooo!"                                                       |
        | the Moon      | stop  | Anna floats off the ground!      | Anna's racer drifts up over its shadow, says "Phew!", lands and sets off again further back                      |
        | the Moon      | burst | Anna does a moon bounce!         | Anna's racer bounds into the lead in one long, slow hop, shouting "Nooo!"                                        |

    Scenario Outline: On <track>, the unlucky person still crosses first
      Given 8 people, on <track>
      When the show runs with 20 different random seeds
      Then the first nose over the finish line is always the unlucky person's

      Examples:
        | track            |
        | the sports field |
        | the office       |
        | under the sea    |
        | the Moon         |

    Scenario: The photo shows the track
      Given a photo finish on the Moon
      When the photo pops up
      Then it shows the Moon's ground and its finish line behind the two racers

    Scenario: Every track keeps the show inside the limit
      When the show runs at 2, 5 and 8 people on each track, with each ending
      Then each run lasts between 14 and 25 seconds

    Scenario: Every track reads over a screen share
      When the show runs on each track at 8 people
      Then every caption, sign and name tag is ink text on a paper or sun sticker with an ink outline
      And on the Moon's dark sky, nothing but those stickers carries text

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

    Scenario: The leader is scared, rider or creature
      Given 8 people, four riders and four creatures
      When the show runs
      Then whoever is in front looks scared and sweats
      And a rider in front leans back and pulls on the reins, or holds on tight on the chair
      And a creature in front leans back and flails its arms, while its legs keep running
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

    Scenario Outline: A new <ride> bursts ahead
      When someone's <ride> bursts ahead
      Then the caption is "<name>'s <ride> <burst>!"
      And <what>, and it shoots into the lead, its rider shouting "Nooo!"

      Examples:
        | ride     | name  | burst              | what                           |
        | hopper   | Anna  | finds its bounce   | it bounds ahead in big bounces |
        | ostrich  | Ben   | stretches its legs | it takes giant strides         |
        | rocket   | Carla | fires its boosters | its flame grows twice as long  |
        | sandwich | Dario | gets extra spicy   | puffs of steam shoot out of it |

    Scenario Outline: A new <ride> stops
      When someone's <ride> stops
      Then the caption is "<name>'s <ride> <stop>!"
      And <what>, and it drops back while the camera goes on
      And its rider waves, says "Phew!", and the mount sets off again further back

      Examples:
        | ride     | name  | stop                | what                                          |
        | hopper   | Anna  | bounces on the spot | it bounces up and down without going forward  |
        | ostrich  | Ben   | lays an egg         | an egg drops behind it and it turns to look   |
        | rocket   | Carla | runs out of fuel    | its flame goes out in a puff of smoke         |
        | sandwich | Dario | drops its pickle    | a pickle falls out and it stops to pick it up |

    Scenario Outline: A <creature> bursts ahead
      When someone's <creature> bursts ahead
      Then the caption is "<name>'s <creature> <burst>!"
      And it shoots into the lead, shouting "Nooo!"

      Examples:
        | creature  | name   | burst              |
        | zombie    | Femi   | gets a second wind |
        | robot     | Anna   | switches to turbo  |
        | shark     | Giulia | finds its sea legs |
        | astronaut | Jonas  | fires the jetpack  |
        | monster   | Marco  | gets the zoomies   |
        | villain   | Hana   | takes a shortcut   |
        | alien     | Elena  | gets beamed ahead  |
        | dinosaur  | Dario  | stomps ahead       |

    Scenario Outline: A <creature> stops
      When someone's <creature> stops
      Then the caption is "<name>'s <creature> <stop>!"
      And <what>, and it drops back while the camera goes on
      And it waves, says "Phew!", and sets off again further back

      Examples:
        | creature  | name   | stop                     | what                                                    |
        | zombie    | Femi   | loses a shoe             | a shoe flies off and it hops back for it                |
        | robot     | Anna   | needs a reboot           | its screen goes blank, then its face comes back         |
        | shark     | Giulia | stops to tie its laces   | it bends over a sneaker                                 |
        | astronaut | Jonas  | plants a flag            | it plants a little flag beside its lane                 |
        | monster   | Marco  | gets the hiccups         | it hops a little with each "Hic!"                       |
        | villain   | Hana   | gets tangled in its cape | the cape wraps round it and it turns free               |
        | alien     | Elena  | stops to ask the way     | a question mark pops up over its head                   |
        | dinosaur  | Dario  | can't reach its snack    | it stretches its tiny arms for a leaf just out of reach |

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

    Scenario: A creature wins
      Given the unlucky person is "Dario", racing as the dinosaur
      When Dario has crossed the line
      Then the caption is "Dario wins!", with a fanfare and confetti
      And the dinosaur balances the trophy on its head, waving its tiny arms, in the party mood
      And a shark balances it on its fin, and every other creature holds it over its head

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
        | caption                      |
        | On your marks…               |
        | Go!                          |
        | Ben's snail finds a turbo!   |
        | Carla's duck rolls downhill! |
        | Carla's duck hits a pebble!  |
        | Final stretch!               |
        | Photo finish!                |
        | Anna wins!                   |

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

    Scenario: Riders and creatures side by side
      When the show runs at 8 and at 2 people, riders and creatures mixed, a 15-character name among them
      Then every face, a rider's or a creature's, sits at the same height in its lane
      And at 8 people, every creature's face is 46 pixels or more across
      And each name tag sits beside its racer's face, behind it, level with it, and moves with it
      And no name tag is ever over another, or over a face

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, nothing shakes
      Given reduced motion is on
      When the show runs
      Then there are no speed lines, the duck doesn't tip and the chair doesn't spin
      And the slow last moment, the photo and every caption still come, in the same order

    Scenario: With reduced motion, the new rides keep still too
      Given reduced motion is on
      When the show runs
      Then the rocket's flame doesn't flicker, and a hopper that stops doesn't bounce on the spot

    Scenario: With reduced motion, the creatures keep still too
      Given reduced motion is on
      When the show runs
      Then the monster doesn't hop with its hiccups, and the villain doesn't turn in its cape
