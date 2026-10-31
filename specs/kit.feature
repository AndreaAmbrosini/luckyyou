Feature: The scenario kit
  Scenarios are built from the kit in src/scenario-kit/. It hands a show what
  it needs, runs it on one clock and cleans up after it, so a new scenario
  keeps the contract in specs/scenarios.feature without extra work.

  Rule: A show is handed what it needs

    Scenario: The stage is 1280 by 720 stage pixels
      When a show starts
      Then its stage is 1280 by 720 stage pixels

    Scenario: The names are a frozen copy
      Given the names "Anna", "Ben" and "Carla"
      When a show starts
      Then it is handed "Anna", "Ben" and "Carla", in that order
      And it can't change them

    Scenario: The same seed gives the same draws
      When two shows start with the same seed
      Then they draw the same random numbers
      And a show with another seed draws different ones

    Scenario: A show waits for the page's fonts
      Given the page's fonts are still loading
      When a show is started
      Then it doesn't begin until the fonts are ready

    Scenario: A show loads the fonts its names are set in
      Given the page hasn't used the stage's fonts yet
      When a show is started
      Then it doesn't begin until the name tag and caption fonts are loaded for its names

  Rule: Time runs on GSAP's clock

    Scenario: A wait lasts its show time
      When a show waits 1.5 seconds
      Then it carries on after 1.5 seconds of show time, not before

    Scenario: Playing an animation lasts until it completes
      When a show plays a 2-second animation
      Then it carries on when the animation completes, not before

    Scenario Outline: A cancel stops a pending <step> at once
      Given a show is in a 5-second <step>
      When the show is cancelled at 1 second
      Then the <step> is rejected at once
      And nothing of it runs on

      Examples:
        | step |
        | wait |
        | play |

    Scenario: Flexible beats stretch to reach a total
      Given a fixed beat of 2 seconds and a flexible beat of 3 seconds
      When the beats are fitted to 10 seconds
      Then the fixed beat takes 2 seconds and the flexible beat 8

    Scenario: Beats that are long enough are left alone
      Given a fixed beat of 6 seconds and a flexible beat of 6 seconds
      When the beats are fitted to 10 seconds
      Then the fixed beat takes 6 seconds and the flexible beat 6

    Scenario Outline: In development, a <seconds>-second show <warns> about 10 to 30 s
      Given a show that lasts <seconds> seconds
      When it runs in development
      Then the console <warns>

      Examples:
        | seconds | warns                         |
        | 9       | warns that it left 10 to 30 s |
        | 25      | stays quiet                   |
        | 31      | warns that it left 10 to 30 s |

  Rule: Who leaves when

    Scenario: Everyone leaves once, the unlucky person last
      Given 12 names, with the unlucky person first in the list
      When the order they leave in is drawn
      Then it lists each name once
      And the unlucky person is last

    Scenario: The order changes with the seed
      When the order 12 people leave in is drawn with 20 different seeds
      Then the others don't always leave in the same order

  Rule: People are spread out

    Scenario: People are spread evenly and centred
      When 4 people are spread across 100 to 1180 stage pixels
      Then they are evenly spaced
      And they are centred on 640

    Scenario: Fewer people are bigger, up to a cap
      When 12, then 6, then 2 people are spread across the stage, at most 200 stage pixels each
      Then the 6 are bigger than the 12
      And the 2 are 200 stage pixels

  Rule: Text is safe and readable

    Scenario: A name tag shows a name as typed
      Given a person named "<b>Hi</b>"
      When their name tag is made
      Then it reads "<b>Hi</b>"
      And no element is created from it

    Scenario: A name tag is never too small
      When a name tag is asked for at 10 stage pixels
      Then it is set at 22 stage pixels

    Scenario: A name tag can sit on the chest
      When a name tag is made for the chest of a head
      Then it is centred under the head, its top at 76% of the head's height
      And it is set at the size asked for

    Scenario: A long name takes at most two lines, shrinking first
      Given a person named "Wolfeschlegelsteinhausenberger", 30 characters with no space
      When their name tag is made at 48 stage pixels, at most 240 stage pixels wide
      Then it takes at most two lines
      And it is set smaller than 48 stage pixels, and at 22 or more

    Scenario: A long name can take two lines before it shrinks past a size
      Given a person named "Wolfeschlegelsteinhausenberger", 30 characters with no space
      When their name tag is made at 72 stage pixels, at most 560 wide, wrapping below 48
      Then it takes two lines
      And it is set at 48 stage pixels or more

    Scenario: A caption stays up for at least a second
      When a show captions "One", and "Two" half a second later
      Then "One" is on screen for 1 second
      And "Two" comes after it

    Scenario: Captions are read out
      When a show captions "Whoosh! 8 left"
      Then a polite live region says "Whoosh! 8 left"

    Scenario: A bubble shows its text at its anchor
      When a bubble says "Woo-hoo!" at 640, 300
      Then it reads "Woo-hoo!"
      And it points at 640, 300

    Scenario: A bubble can lean to one side of its tail
      When a bubble says "Phew!" at 640, 300, leaning 40 to the right
      Then it still points at 640, 300
      And its box is 40 further right than with no lean
      And it may lean less than half its width either way, so its tail stays under its straight edge

    Scenario Outline: A bubble goes beside what it's about, <where>
      Given a head at 500 to 600 across and 300 to 400 down, with <blocked> in the way
      When a bubble saying "Phew!" is placed by it
      Then it goes <where>
      And it covers neither the head nor anything in the way, and stays on the stage

      Examples:
        | blocked                       | where                                 |
        | nothing                       | level with it, toward the middle      |
        | its right                     | level with it, on its other side      |
        | both sides                    | above it                              |
        | both sides and above          | level with it, past what's in the way |

  Rule: Characters

    Scenario: A head has five moods and one accessory
      When a head is drawn calm, worried, scared, happy and party
      Then each mood looks different
      And each head wears one accessory

    Scenario: A head keeps its look when its mood changes
      Given a head with skin tone 3 and a snorkel
      When its mood changes from calm to party
      Then it still has skin tone 3 and a snorkel

    Scenario: On land, a person has a shirt and no swim ring
      When a head is drawn on land
      Then it wears a shirt in its look's second colour
      And it has no swim ring

    Scenario: On land, a party head's arms start at the shoulders
      When a party head is drawn on land
      Then its arms rise from its shoulders, not from its cheeks

    Scenario: On land, a happy head keeps its arms down unless raised
      When a happy head is drawn on land
      Then its arms are down
      And it raises them when asked

    Scenario: A head can raise its arms in any mood
      Given a scared head on land
      When it raises its arms
      Then its arms are up
      And it still looks scared

    Scenario: A head can sweat in any mood
      When a worried head and a scared head start sweating
      Then each shows two sweat drops
      And each keeps its mood

    Scenario: Looks are varied
      When looks are handed out to 12 people
      Then they use at least 4 skin tones

  Rule: Motion

    Scenario: Motion runs on the show's clock and ends with it
      Given a show that makes a head bob
      When the show ends
      Then the head stops bobbing

    Scenario: With reduced motion, nothing shakes
      Given the viewer prefers reduced motion
      When a show shakes a head
      Then the head doesn't move

  Rule: Sounds

    Scenario: A show can ask for every sound
      Then a show can play splash, rotor, whoosh, heartbeat, fanfare, sizzle, pop, thunk, creak, tumble, sniff, grumble, bark and latch

    Scenario: Every sound can be heard
      When a show plays each sound
      Then the rotor and the sizzle, which loop under a show, peak at 0.05 or more
      And every other sound peaks at 0.15 or more

    Scenario: The sizzle loops until it is stopped
      When a show plays the sizzle
      Then it keeps playing until it is stopped

  # Music, built in one go with the music rule in specs/setup.feature.
  @pending
  Rule: Music

    Scenario: A show can play a song
      Then a show can hand the kit a song, as notes on a beat grid, and move it along as it plays

    Scenario: A song follows the show's time
      Given a show playing a song at 4 beats a second
      When the show moves the song on by a bar
      Then the bar's notes play in order, each at its place on the grid
      And at a quarter of that speed, they come 4 times further apart and last 4 times longer

    Scenario: Notes the show has passed stay unplayed
      Given a show playing a song
      When the show jumps a bar ahead
      Then the notes in the bar it jumped over don't play

    Scenario: Music sits under the sounds
      When a show plays a song at 70%
      Then the music peaks between 0.2 and 0.5

    Scenario Outline: A show that <ends> stops its music
      Given a show playing a song
      When the show <ends>
      Then no note plays after it

      Examples:
        | ends         |
        | ends         |
        | is cancelled |

  Rule: Nothing is left after a show

    Scenario Outline: A show that <ends> leaves nothing behind
      Given a show that starts an animation of its own after a wait
      When the show <ends>
      Then the stage is empty
      And no animation is left

      Examples:
        | ends         |
        | ends         |
        | is cancelled |

  Rule: The lab runs any show in development

    Scenario: The lab lists every scenario
      Given a scenario marked development-only
      When the lab opens
      Then it lists every scenario, the development-only one included

    Scenario: The lab starts at the usual head count
      When the lab opens
      Then it is set to 8 people

    Scenario: The lab runs a show as asked
      When I run "Shark Bait" in the lab with 5 people, the unlucky person last and seed 42
      Then the show plays with 5 people
      And the last of them is the unlucky person
      And its random draws come from seed 42
