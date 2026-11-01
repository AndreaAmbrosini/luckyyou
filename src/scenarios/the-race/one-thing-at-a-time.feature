Feature: The Race, one thing at a time
  One thing happens at a time: a racer bursting ahead or stopping. The rest of
  The Race is in the-race.feature, and the contract in specs/scenarios.feature
  applies as well.

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

    Scenario Outline: A <thing> bursts ahead
      When someone's <thing> bursts ahead
      Then the caption is "<name>'s <thing> <burst>!"
      And <what>, and it shoots into the lead, shouting "Nooo!"

      Examples:
        | thing       | name   | burst                   | what                                              |
        | coffee mug  | Ben    | has a caffeine rush     | jets of steam puff out of its top                 |
        | printer     | Carla  | prints at full speed    | a stream of paper flies out behind it             |
        | sticky note | Dario  | catches a draft         | it flutters along, wind lines behind it           |
        | banana      | Elena  | slips on its own peel   | it skids along on a banana peel                   |
        | ice cream   | Femi   | gets a sugar rush       | sprinkles fly off its scoop                       |
        | sushi       | Giulia | rides the conveyor belt | a conveyor belt slides in under it and carries it |

    Scenario Outline: A <thing> stops
      When someone's <thing> stops
      Then the caption is "<name>'s <thing> <stop>!"
      And <what>, and it drops back while the camera goes on
      And it waves, says "Phew!", and sets off again further back

      Examples:
        | thing       | name   | stop                 | what                                                         |
        | coffee mug  | Ben    | needs a refill       | it tips forward to peer inside, and it's empty               |
        | printer     | Carla  | has a paper jam      | a crumpled sheet sticks out of it and its red light blinks   |
        | sticky note | Dario  | sticks to the floor  | one foot sticks and it tugs it free                          |
        | banana      | Elena  | does the splits      | it slides down into the splits, then springs back up         |
        | ice cream   | Femi   | starts to melt       | its scoop droops into a puddle, then firms up again          |
        | sushi       | Giulia | gets too much wasabi | a green dab lands on it, its eyes water and steam puffs out of its top |

    Scenario Outline: A new <creature> bursts ahead
      When someone's <creature> bursts ahead
      Then the caption is "<name>'s <creature> <burst>!"
      And <what>, and it shoots into the lead, shouting "Nooo!"

      Examples:
        | creature | name  | burst               | what                                                |
        | cat      | Hana  | chases a laser dot  | a red dot zips along the ground ahead of it         |
        | octopus  | Ivo   | uses all eight legs | all its tentacles run at once                       |
        | penguin  | Jonas | belly-slides        | it drops onto its belly and slides                  |
        | pigeon   | Marco | spots a chip        | a chip lies ahead and it dashes for it, head bobbing |
        | ghost    | Priya | gets spooked        | it jumps, its sheet flaps, and it bolts             |
        | gnome    | Anna  | sneaks ahead        | it tiptoes along in long, quiet steps               |
        | mummy    | Ben   | unrolls downhill    | it spins along, a bandage unrolling behind it       |
        | yeti     | Carla | skis ahead          | skis appear under its feet and it glides            |

    Scenario Outline: A new <creature> stops
      When someone's <creature> stops
      Then the caption is "<name>'s <creature> <stop>!"
      And <what>, and it drops back while the camera goes on
      And it waves, says "Phew!", and sets off again further back

      Examples:
        | creature | name  | stop                    | what                                                      |
        | cat      | Hana  | sits in a box           | a cardboard box appears and it sits in it                 |
        | octopus  | Ivo   | ties its legs in a knot | its tentacles twist into a knot and it untangles them     |
        | penguin  | Jonas | drops its fish          | a fish falls out and it stops to pick it up               |
        | pigeon   | Marco | puffs up its chest      | it puffs up and struts on the spot                        |
        | ghost    | Priya | trips on its sheet      | it stumbles on its hem and gets up                        |
        | gnome    | Anna  | freezes like a statue   | it stops dead mid-step and stands perfectly still         |
        | mummy    | Ben   | comes unwrapped         | a bandage unrolls and it winds it back on                 |
        | yeti     | Carla | makes a snow angel      | it lies in a patch of snow and sweeps its arms and legs   |
