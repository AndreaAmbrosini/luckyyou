Feature: The Race
  Everyone races as the host chose on the Line-up (specs/line-up.feature):
  riding a mount, or as a creature on its own feet. They race a lane each, on
  the theme the host chose, the camera following the leaders. Winning is
  losing: whoever is in front looks scared, and the mount or the creature's
  legs don't listen. One thing happens at a time, a racer bursting ahead or
  stopping. The final stretch runs at full speed, only the last moment before
  the line is slow, and the unlucky person crosses first: by a nose in a photo
  finish, past a rival who brakes, or in a surge from behind. The contract in
  specs/scenarios.feature applies as well. The tracks, Christmas, Autumn, one
  thing at a time, and the sound and motion each have a feature file of their
  own in this folder, so their tests run side by side.

  Rule: Its card

    Scenario: The picker shows The Race
      Then its name is "The Race"
      And its description is "Whoever crosses the line first gets the job."
      And its picture is 🏁
      And it takes 2 to 8 people
      And it has a line-up

  Rule: Its line-up

    Scenario: Racers as pictures, by kind
      When the Line-up opens for The Race
      Then its first option is "Racer", its choices in groups, as tabs
      And the group "Rides" holds "Snail", "Duck", "Office chair", "Caterpillar", "Space hopper", "Ostrich", "Rocket" and "Sandwich"
      And the group "Animals" holds "Shark with feet" and "Dinosaur"
      And the group "Spooky" holds "Zombie", "Monster" and "Villain"
      And the group "Space" holds "Robot", "Astronaut" and "Alien"
      And each racer is shown as the chosen person racing as it, in their colour and extra, calm, its name under it
      And "Colour" offers the same swatches as before, and "Extra" a picture of each extra, each named for screen readers

    Scenario: Its themes, and the racers that suit each
      When the Line-up opens for The Race
      Then its themes are "Sports field", "Office", "Under the sea" and "Moon", after "Surprise", each a postcard of its track
      And each theme's tab holds, in this order:
        | theme         | racers                                                                          |
        | Sports field  | Space hopper, Ostrich, Duck, Snail, Caterpillar, Cat, Pigeon, Dinosaur          |
        | Office        | Office chair, Coffee mug, Printer, Sticky note, Sandwich, Banana, Robot, Villain |
        | Under the sea | Shark with feet, Octopus, Sushi, Duck, Penguin                                  |
        | Moon          | Rocket, Astronaut, Alien, Robot, Space hopper                                   |

    # Decision 0019.
    Scenario: Its Line-up's words, and each track's ground
      When the Line-up opens for The Race
      Then its themes are called "Track", and the first option's choices "racers"
      And each track names a ground, a sky and a floor colour on which every racer's ink outline reads
      And on Autumn, everyone stands on bark under the sky

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

    Scenario: Creatures are modern cartoons
      When someone races as any creature
      Then each main part of its body has a flat shadow on its lower left, ink at 18%, and most have a white highlight on the upper right
      And each pupil has a white shine
      And its arms bend at the elbow and end in gloves, paws, tentacle tips or fins
      And it sprints: its front foot planted, its back foot kicked up behind
      And it fills the same box as before, its feet on the same line and its face at the same height

    Scenario Outline: A <creature>'s face when it is <mood>
      When a <creature> is <mood>
      Then <face>

      Examples:
        | creature | mood    | face                                                                    |
        | zombie   | calm    | its lids are half shut, one brow a little higher, and it smirks          |
        | zombie   | worried | its lids droop towards the outside, its brows rise inside, its mouth wobbles |
        | zombie   | scared  | its eyes open wide with tiny pupils and no lids, its mouth an open oval  |
        | zombie   | happy   | its mouth is open, with teeth and a tongue                               |
        | zombie   | party   | it wears dark shades and grins with its mouth open                       |
        | monster  | calm    | it grins with a row of pointy teeth                                      |
        | robot    | calm    | its eyes and mouth glow light blue on its dark screen, and it has no brows |

    Scenario Outline: A <creature> runs in <feet>
      When someone races as a <creature> in tomato
      Then it runs in <feet>

      Examples:
        | creature  | feet                                       |
        | zombie    | ink-soft sneakers with a tomato stripe     |
        | robot     | ink-soft boots                             |
        | shark     | tomato sneakers with a sun stripe          |
        | astronaut | grey boots                                 |
        | monster   | big bare feet, tomato                      |
        | villain   | ink boots                                  |
        | alien     | glass sneakers with a tomato stripe        |
        | dinosaur  | big bare feet, tomato                      |

    Scenario: Six things on legs
      When the Line-up opens for The Race
      Then the group "Things on legs" holds "Coffee mug", "Printer", "Sticky note", "Banana", "Ice cream" and "Sushi"
      And the tabs read "Rides", "Animals", "Things on legs", "Spooky" and "Space", in that order

    Scenario: A thing on legs runs like the others
      When someone races as a coffee mug, a printer, a sticky note, a banana, an ice cream or a sushi
      Then it runs on dark legs in white sneakers striped in its colour, and its arms end in white gloves
      And its face is on the thing itself

    Scenario Outline: Where a <thing> wears its colour
      When someone races as a <thing> in tomato
      Then <where> is tomato

      Examples:
        | thing       | where                  |
        | coffee mug  | the mug and its handle |
        | printer     | its lid and its tray   |
        | sticky note | the note               |
        | banana      | its peel               |
        | ice cream   | its scoop              |
        | sushi       | the fish on top        |

    Scenario: Four animals and four spooky creatures
      When the Line-up opens for The Race
      Then the group "Animals" also holds "Cat", "Octopus", "Penguin" and "Pigeon", after "Dinosaur"
      And the group "Spooky" also holds "Ghost", "Mummy", "Yeti" and "Garden gnome", after "Villain"

    Scenario Outline: Where a <creature> wears its colour, and its feet
      When someone races as a <creature> in tomato
      Then <where> is tomato
      And it runs on <feet>

      Examples:
        | creature | where                                | feet                                |
        | cat      | its fur                              | white sneakers with a tomato stripe |
        | octopus  | its body and tentacles               | two tentacles with curled tips      |
        | penguin  | its back and flippers                | orange flat feet                    |
        | pigeon   | its neck and wings                   | pink toes                           |
        | ghost    | the dots on its sheet and its sneakers | tomato sneakers with a sun stripe |
        | gnome    | its pointy hat                       | ink boots                           |
        | mummy    | its sweatband and its sneakers       | tomato sneakers with a sun stripe   |
        | yeti     | its earmuffs                         | big bare feet, light blue           |

    Scenario: The gnome has the kit's face
      When someone races as the garden gnome
      Then its face and hands have the skin tone the kit hands out for the run

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

    Scenario: Whatever reaches furthest, the unlucky person is over first
      Given 8 people, the unlucky person's racer leaning back 40 px short of its nose as it leads
      And everyone else's hands reaching 40 px past their noses
      When the show runs with 40 different random seeds
      Then all of the unlucky person's racer is over the line before anyone else's hands reach it

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

    Scenario: A pigeon or a gnome wins
      When a pigeon or a garden gnome has crossed the line first
      Then the pigeon balances the trophy on its head, and the gnome on the tip of its hat
      And the penguin holds it up in its flippers, and every other new creature over its head

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
