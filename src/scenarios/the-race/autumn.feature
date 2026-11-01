Feature: The Race in Autumn
  Autumn is a theme, with racers of its own. The rest of The Race is in
  the-race.feature, and the contract in specs/scenarios.feature applies as
  well.

  # Autumn is a park by day; night, pumpkins, bats and graves are
  # Halloween's.
  Rule: Autumn

    Scenario: Autumn is a theme
      When the Line-up opens for The Race
      Then "Autumn" is a theme, after "Moon", its postcard trees in autumn colours over a path
      And with Autumn chosen, the racer option's first tab is "Autumn"

    Scenario: What Autumn looks like
      When the show runs on Autumn
      Then the ground is a bark path strewn with fallen leaves, the lanes split by paper lines, and paper name tags read clearly on it
      And behind the track is a park on a sunny afternoon: trees in orange, tomato and sun on a lawn, leaves falling, and a wooden fence with piles of leaves
      And each distance is a paper sign on a wooden post, a rake standing in a pile of leaves beside it
      And a photo finish's photo shows the path and its finish line

    Scenario: Autumn has a stop and a burst of its own
      Given 8 people, on Autumn
      When the show runs with 20 different random seeds
      Then in every run, one event before "Final stretch!" is Autumn's own stop or burst
      And both come up across the runs

    Scenario Outline: On Autumn, <caption>
      When someone's event is Autumn's own <event>
      Then the caption is "<caption>"
      And <what>

      Examples:
        | event | caption                        | what                                                                                                                                   |
        | stop  | Ben jumps in a pile of leaves! | Ben's racer lands in a pile of leaves that fly up round it, climbs out, says "Phew!" and sets off again further back                   |
        | burst | Carla catches the wind!        | an umbrella opens in Carla's racer's hand, and the wind lifts it off the ground and into the lead, shouting "Nooo!", or its rider does |

    Scenario: Everyone wears an acorn cap
      When the show runs on Autumn, or its Line-up shows Autumn
      Then every rider wears an acorn cap instead of the cap, goggles or snorkel the kit hands out, and a top hat stays on the mount
      And every creature wears one where its top hat goes, instead of the top hat
      And the garden gnome wears a small one on the tip of its own hat
      And on any other theme, nobody wears one

    Scenario: The winner gets a golden acorn
      Given the unlucky person is "Anna", on Autumn
      When she has crossed the line
      Then the caption is "Anna wins!", with a fanfare and confetti with leaves in it
      And Anna holds up a golden acorn with a bark cap, where the trophy would be
      And whoever balances the trophy balances the acorn, on top of their acorn cap

    Scenario: On Autumn, the unlucky person still crosses first
      Given 8 people, on Autumn
      When the show runs with 20 different random seeds
      Then the first nose over the finish line is always the unlucky person's

    Scenario: With reduced motion, Autumn keeps still too
      Given reduced motion is on
      When the show runs on Autumn
      Then no leaves fly up out of the pile, and the umbrella lifts its racer without swaying

  Rule: Autumn's own racers

    Scenario: Five racers for Autumn
      When the Line-up opens for The Race
      Then the group "Rides" also holds "Giant leaf", after "Reindeer"
      And the group "Animals" also holds "Squirrel" and "Hedgehog", after "Pigeon"
      And the group "Things on legs" also holds "Mushroom" and "Acorn", after "Christmas tree"
      And with Autumn chosen, its tab holds "Giant leaf", "Squirrel", "Hedgehog", "Mushroom" and "Acorn", then "Snail", "Caterpillar", "Pigeon" and "Garden gnome"

    Scenario: The giant leaf
      Given Ivo chose the giant leaf in sun
      When the show runs
      Then Ivo sits on a sun leaf with a face, floating on the breeze just off the ground, and holds its curled-up tip
      And his head is at the same height as every rider's

    Scenario: Four creatures for Autumn
      When someone races as a squirrel, a hedgehog, a mushroom or an acorn
      Then the squirrel has a bushy tail curling up behind it, a white belly and buck teeth, and runs on bare paws
      And the hedgehog has spines over its back and head, a pointed snout with a black nose, and runs on bare feet
      And the mushroom has a spotted cap and its face on a white stalk, on dark legs in white sneakers
      And the acorn has its face on the nut under a scaly bark cap with a stalk, on dark legs in white sneakers
      And on Autumn, the acorn's own cap is all it wears

    Scenario Outline: Where an autumn <racer> wears its colour
      When someone races as a <racer> in tomato
      Then <where> is tomato

      Examples:
        | racer      | where                          |
        | giant leaf | the leaf and its curled tip    |
        | squirrel   | its fur, its tail and its paws |
        | hedgehog   | its spines                     |
        | mushroom   | its cap                        |
        | acorn      | its nut                        |

    Scenario Outline: An autumn <racer> bursts ahead
      When someone's <racer> bursts ahead
      Then the caption is "<name>'s <racer> <burst>!"
      And <what>, and it shoots into the lead, shouting "Nooo!", or its rider does

      Examples:
        | racer      | name   | burst                   | what                                                  |
        | giant leaf | Ivo    | catches the breeze      | it lifts high and sails ahead                         |
        | squirrel   | Giulia | goes nuts               | it whizzes ahead in a blur, its tail whirling         |
        | hedgehog   | Marco  | rolls into a ball       | it curls into a spiky ball and rolls ahead            |
        | mushroom   | Jonas  | pops up ahead           | it sinks into the ground and pops up again further on |
        | acorn      | Femi   | is chased by a squirrel | a squirrel pops up behind it and it runs for it       |

    Scenario Outline: An autumn <racer> stops
      When someone's <racer> stops
      Then the caption is "<name>'s <racer> <stop>!"
      And <what>, and it drops back while the camera goes on
      And it waves, says "Phew!", and sets off again further back, or its rider does

      Examples:
        | racer      | name   | stop              | what                                                      |
        | giant leaf | Ivo    | lands in a puddle | it settles in a puddle and turns slowly round             |
        | squirrel   | Giulia | buries an acorn   | it digs a little hole, drops an acorn in and pats it down |
        | hedgehog   | Marco  | collects leaves   | leaves stick to its spines and it shakes them off         |
        | mushroom   | Jonas  | sneezes           | a puff of spores bursts from its cap with an "Achoo!"     |
        | acorn      | Femi   | loses its cap     | its cap pops off and it stops to put it back on           |

    Scenario: With reduced motion, the Autumn racers keep still too
      Given reduced motion is on
      When the show runs
      Then the squirrel's tail doesn't whirl, the hedgehog doesn't spin as it rolls, and the giant leaf doesn't turn in its puddle
