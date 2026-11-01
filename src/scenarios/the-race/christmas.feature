Feature: The Race at Christmas
  Christmas is a theme, with racers of its own. The rest of The Race is in
  the-race.feature, and the contract in specs/scenarios.feature applies as
  well.

  Rule: Christmas

    Scenario: Christmas is a theme, after Autumn
      When the Line-up opens for The Race
      Then "Christmas" is a theme, after "Autumn", its postcard a tree on snow at dusk
      And with Christmas chosen, the racer option's first tab is "Christmas racers"

    Scenario: What Christmas looks like
      When the show runs on Christmas
      Then the ground is snow, the lanes split by light blue lines, and paper name tags read clearly on it
      And behind the track is a snowy village at dusk: white hills, two houses with lit windows, pines, a big tree with a star, and a crescent moon
      And fairy lights run along the edge of the track, and each distance is a paper sign by a candy cane

    Scenario: Christmas has a stop and a burst of its own
      Given 8 people, on Christmas
      When the show runs with 20 different random seeds
      Then in every run, one event before "Final stretch!" is Christmas's own stop or burst
      And both come up across the runs

    Scenario Outline: On Christmas, <caption>
      When someone's event is Christmas's own <event>
      Then the caption is "<caption>"
      And <what>

      Examples:
        | event | caption                        | what                                                                                                 |
        | stop  | Ben gets stuck in a snowdrift! | snow piles up round Ben's racer until it wriggles free, says "Phew!" and sets off again further back |
        | burst | Carla jumps on a sledge!       | a red sledge slides in under Carla's racer and whooshes it into the lead, shouting "Nooo!"           |

    Scenario: Everyone wears a Santa hat
      When the show runs on Christmas
      Then every rider wears a Santa hat instead of the cap, goggles or snorkel the kit hands out, and a top hat stays on the mount
      And every creature wears one where its top hat goes, instead of the top hat
      And the garden gnome's own hat gets a white brim and a bobble instead
      And on any other theme, nobody wears one

    Scenario: The winner gets a present
      Given the unlucky person is "Anna", on Christmas
      When she has crossed the line
      Then the caption is "Anna wins!", with a fanfare and confetti with snowflakes in it
      And Anna holds up a present, red with a gold ribbon and bow, where the trophy would be
      And whoever balances the trophy balances the present, the dinosaur and the pigeon on top of their Santa hat

    Scenario: On Christmas, the unlucky person still crosses first
      Given 8 people, on Christmas
      When the show runs with 20 different random seeds
      Then the first nose over the finish line is always the unlucky person's

  Rule: Christmas's own racers

    Scenario: Four racers for Christmas
      When the Line-up opens for The Race
      Then the group "Rides" also holds "Reindeer", after "Sandwich"
      And the group "Things on legs" also holds "Snowman", "Gingerbread" and "Christmas tree", after "Sushi"
      And with Christmas chosen, its tab holds "Reindeer", "Snowman", "Gingerbread" and "Christmas tree", then "Penguin", "Yeti" and "Garden gnome"

    Scenario: The reindeer, reins up its neck
      Given Ivo chose the reindeer in grape
      When the show runs
      Then Ivo rides a brown reindeer with cream antlers, a red nose, a gold collar with a bell, and a grape blanket under him
      And he holds reins tied on up its neck, above the collar, in a grape shirt, his head at the same height as every rider's

    Scenario: Three things on legs for Christmas
      When someone races as a snowman, a gingerbread or a Christmas tree
      Then the snowman is two snowballs with a carrot nose, on dark legs in white sneakers
      And the gingerbread is a cookie with white icing, on cookie legs and feet, its hands cookie too
      And the Christmas tree is two green tiers with a gold garland and a star on top, on dark legs in white sneakers
      And at Christmas, the tree wears its Santa hat instead of its star

    Scenario Outline: Where a <racer> wears its colour
      When someone races as a <racer> in tomato
      Then <where> is tomato

      Examples:
        | racer          | where                                |
        | reindeer       | its blanket                          |
        | snowman        | its buttons and its mittens          |
        | gingerbread    | its gumdrop buttons                  |
        | Christmas tree | its baubles                          |

    Scenario Outline: A <racer> bursts ahead
      When someone's <racer> bursts ahead
      Then the caption is "<name>'s <racer> <burst>!"
      And <what>, and it shoots into the lead, shouting "Nooo!", or its rider does

      Examples:
        | racer          | name   | burst                  | what                                       |
        | reindeer       | Ivo    | takes off              | it leaps up and glides ahead over the snow |
        | snowman        | Giulia | rides a blizzard       | a swirl of snow whirls it ahead            |
        | gingerbread    | Marco  | runs as fast as it can | it sprints in a blur of crumbs             |
        | Christmas tree | Jonas  | lights up              | its lights come on and it zooms ahead      |

    Scenario Outline: A <racer> stops
      When someone's <racer> stops
      Then the caption is "<name>'s <racer> <stop>!"
      And <what>, and it drops back while the camera goes on
      And it waves, says "Phew!", and sets off again further back, or its rider does

      Examples:
        | racer          | name   | stop                         | what                                                    |
        | reindeer       | Ivo    | gets tangled in fairy lights | a string of lights wraps round its antlers and it shakes them off |
        | snowman        | Giulia | loses its nose               | its carrot nose pops off and it bends to pick it up     |
        | gingerbread    | Marco  | loses a button               | a gumdrop pops off and it stops to stick it back on     |
        | Christmas tree | Jonas  | drops a bauble               | a bauble falls off and it stops to hang it back         |

    # PRODUCT.md rules out flashing lights.
    Scenario: The Christmas tree's lights stay on
      When someone's Christmas tree lights up
      Then all its lights come on at once and stay on until its burst ends, none of them blinking

    Scenario: With reduced motion, the blizzard keeps still
      Given reduced motion is on
      When the show runs
      Then the blizzard's swirl doesn't spin
