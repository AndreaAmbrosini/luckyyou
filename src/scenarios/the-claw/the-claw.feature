Feature: The Claw
  A toy grabber at a fair. Everyone is a plush toy in the pile. The claw goes
  straight to whoever it takes, lifts them, and carries them along its rail to
  the stop over the prize chute. The stop kicks the claw out, and whoever it
  holds slips out and flies onto the shelf beyond the end of the rail, out of
  reach and safe. With three left, the last grab takes two at once and hangs
  them over the chute until one slips. The other goes down the chute and comes
  out of its door as the prize. With 2 or 3 people it is the final from the
  start. The contract in specs/scenarios.feature applies as well.

  Rule: Its card

    Scenario: The picker shows The Claw
      Then its name is "The Claw"
      And its description is "Whoever the claw keeps hold of gets the job."
      And it takes 2 to 12 people

  Rule: The unlucky person is the prize

    Scenario Outline: <count> people, the unlucky person <position> in the list
      Given <count> people, with the unlucky person <position> in the list
      When the show runs
      Then the unlucky person is in the last grab, and in no other
      And the unlucky person goes down the chute and comes out of the prize door
      And nobody else goes down the chute

      Examples:
        | count | position |
        | 2     | first    |
        | 2     | last     |
        | 8     | first    |
        | 8     | last     |
        | 12    | first    |
        | 12    | last     |

  Rule: Every grab really grabs

    Scenario: The claw goes straight to whoever it takes
      Given 8 people
      When the show runs with 20 different random seeds
      Then the claw only ever stops over the pile above whoever it is about to take
      And each time it comes down, it comes up with someone
      And it never comes down anywhere but over the pile

    Scenario: A grab
      Given 6 people
      When the claw takes someone, before the last grab
      Then it comes down open, shuts round their head and lifts them to the rail
      And it carries them along the rail to the stop over the prize chute
      And the caption names them, as "It's got Elena!", as it shuts
      And whoever it is coming down on, or holds, looks scared and sweats
      And everyone else stays where they sit

    Scenario: Unhurried before the final three
      Given 6 people
      When the show runs with 20 different random seeds
      Then from the claw setting off for one grab to its setting off for the next, 2.9 seconds or more go by
      And each of the claw's moves lasts 0.4 seconds or more, but for its fingers opening and shutting

  Rule: Slip out and you're safe

    Scenario: The stop shakes them loose
      Given 6 people
      When a grab before the last reaches the stop
      Then the claw kicks out past the end of the rail, towards the shelf
      And at the top of the kick whoever it holds slips out, and flies onto the shelf
      And they say "Phew!" as they land, and sit there, smaller and happy, until the end
      And the number on the "At risk" plaque goes down by one for each who lands
      And the claw shuts on nothing and sets off for the next

    Scenario: The shelf is out of reach
      When the show runs at every head count from 2 to 12
      Then the rail ends at the stop over the chute
      And every seat on the shelf is past the stop, under the sign "Out of reach"
      And the claw's trolley is never further along the rail than the stop

    Scenario: The shelf fills towards the chute
      Given 8 people
      When the show runs
      Then the first to land sits on the shelf's highest tier, furthest from the chute
      And everyone after lands on that tier nearer the chute, or on a lower one
      And the last to land sits on the floor, in the seat next to the chute
      And nobody flies past anyone already sitting on the shelf

    Scenario Outline: Nobody is grabbed twice, with <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then nobody is in more than one grab
      And nobody who has landed on the shelf leaves it
      And one of the final three is never grabbed

      Examples:
        | count |
        | 4     |
        | 8     |
        | 12    |

    Scenario: Who goes first gives nothing away
      Given 8 people, with the same unlucky person every time
      When the show runs with 20 different random seeds
      Then the first grab takes at least 5 different people across the runs
      And the unlucky person sits in at least 5 different seats
      And the two who share the final three with the unlucky person are at least 4 different people
      And whoever shares the last grab with the unlucky person is at least 3 different people

  Rule: Never more than three grabs before the final three

    Scenario Outline: <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then the grabs before the final three take <sizes> people, in some order

      Examples:
        | count | sizes       |
        | 4     | 1           |
        | 5     | 1 and 1     |
        | 6     | 1, 1 and 1  |
        | 7     | 2, 1 and 1  |
        | 8     | 2, 2 and 1  |
        | 9     | 2, 2 and 2  |
        | 10    | 3, 2 and 2  |
        | 11    | 3, 3 and 2  |
        | 12    | 3, 3 and 3  |

    Scenario: Two or three at once
      Given 12 people
      When a grab takes more than one person
      Then they sat next to one another in the pile
      And two hang by their loops, one from each of the claw's fingertips
      And of three, one hangs from the prong under the hub and one from each fingertip
      And the caption names two, as "It's got Ivo & Jonas!", and says "It's got three!" for three
      And they all slip out at the same kick, and land 0.12 seconds apart
      And the last of them to land says "Phew!"

    Scenario: From 9 people the claw takes a column at a time
      Given 12 people
      When the show runs with 20 different random seeds
      Then the pile is four columns
      And each grab before the last takes one whole column

  Rule: A grab can slip a notch

    Scenario: Eek
      Given 6 people
      When the show runs with 30 different random seeds
      Then in some runs, on one grab before the final three, whoever the claw holds slips a notch on the way up
      And they say "Eek!", the claw strains, and it holds still for 0.8 seconds before it lifts on
      And in some runs no grab before the final three slips a notch
      And the first grab never does, and no grab of two or three does

  Rule: The final three

    Scenario: Final three
      Given 8 people
      When 3 people are left in the pile
      Then the caption is "Final three!"
      And the three look scared and sweat
      And everyone on the shelf looks worried
      And the heartbeat starts, and comes quicker and quicker until the claw shuts round the unlucky person, or they tip into the chute

  Rule: The last grab takes two

    Scenario: Two of the final three
      Given 8 people
      When the show runs with 30 different random seeds
      Then the last grab takes two of the final three: the unlucky person, and one of the others who sat next to them
      And one hangs from each fingertip, both drawn the same size
      And the unlucky person hangs from the left fingertip in some runs, and from the right in others
      And the third of the final three stays in the pile, scared, until the prize is out

    Scenario: Slower than any grab before
      Given 8 people
      When the last grab sets off
      Then the claw travels, lifts and carries slower than on any grab before it

    Scenario: The last grab can slip a notch too
      Given 8 people, with the same unlucky person every time
      When the show runs with 30 different random seeds
      Then in some runs one of the two slips a notch on the way up, "Eek!"
      And it is the unlucky person in some of those runs, and the other in others

  Rule: Over the chute, nobody knows who slips

    Scenario: Three ways it goes
      Given 8 people
      When the show runs with 30 different random seeds
      Then in some runs one of the two slips at the first kick, the one the stop gives the claw
      And in some runs both hold on through it, and one slips at the second kick
      And in some runs both hold on, the claw hangs still, a finger twitches open and shuts, "Click!", and one slips at the kick that jolt gives it
      And a twitch lasts 0.9 seconds, and never comes before a kick both held through

    Scenario: A slip flies clear or lands on the rim
      Given 8 people
      When the show runs with 30 different random seeds
      Then in some runs whoever slips flies clear, onto the shelf
      And in some runs they land short, on the rim of the chute, and teeter over it: "Whoa…"
      And whoever teeters does so for 1 second or more

  Rule: The last second could go three ways

    Scenario Outline: The ending, with <count> people
      Given <count> people
      When the show runs with 30 different random seeds
      Then in some runs one flies clear, "Phew!", and the claw shuts round the other: "Uh-oh…"
      And in some runs one teeters on the rim and tips out, "Nearly!", "Phew!!", and then the claw shuts round the other: "Uh-oh…"
      And in some runs one flies clear, "Phew!", while the other lands on the rim, teeters, and tips in

      Examples:
        | count |
        | 2     |
        | 8     |
        | 12    |

    Scenario: The rim gives nothing away
      Given 8 people
      When the show runs with 30 different random seeds
      Then whoever teeters on the rim tips out in some runs, and in in others
      And until they tip, a teeter that tips out and one that tips in look the same

    Scenario: A moment of stillness, then it opens
      When the show runs with an ending where the claw shuts round the unlucky person
      Then for at least half a second after it shuts, nothing moves
      And then the claw opens, and the unlucky person drops into the chute

  Rule: With 2 or 3 people it is the final from the start

    Scenario Outline: <count> people
      Given <count> people
      When the show runs with 20 different random seeds
      Then the caption after the opening is "<caption>", everyone looks scared, and the heartbeat starts before the claw moves
      And there is one grab, of two people, the unlucky person one of them
      And with 3 people, the third is never grabbed

      Examples:
        | count | caption                |
        | 2     | Just the two of you…   |
        | 3     | Just the three of you… |

  Rule: The ending is a prize

    Scenario: Out of the prize door
      Given the unlucky person is "Marco"
      When Marco has gone down the chute
      Then for 0.6 seconds the chute rumbles and nothing else moves
      And the prize door opens, and Marco comes out in front of the chute, drawn 170 pixels tall, in front of everyone
      And Marco wears a bow where the loop was, and celebrates
      And the chute says "Ta-da!"
      And the plaque says "Winner!"
      And the caption is "Marco is the prize!"
      And everyone else looks happy

    Scenario: The name holds still at the end
      Given the unlucky person is "Marco"
      When the show runs
      Then "Marco" is on stage, not moving, for the last 1.5 seconds

  Rule: The beats keep every show a second or more inside the limit

    Scenario: About 25 seconds at 6 people
      Given 6 people
      When the show runs with 40 different random seeds
      Then each run lasts between 22 and 28 seconds
      And the runs last between 24.5 and 26.5 seconds on average

    Scenario: Every head count lands between 12 and 29 seconds
      When the show runs at every head count from 2 to 12, with each ending and each way it goes over the chute
      Then each run lasts between 12 and 29 seconds

    Scenario: From 6 to 12 people a show lasts about the same
      When the show runs at 6, 8 and 12 people with 40 different random seeds each
      Then the average lengths at the three head counts are within 1.5 seconds of one another

  Rule: What it sounds like

    Scenario: The machine is heard
      Given 8 people
      When the show runs with each ending, an "Eek!" and a "Click!" among its scares
      Then the latch clicks each time the claw shuts on someone, and at each "Click!"
      And there is a thunk each time the trolley reaches the stop, and each time someone lands
      And a whoosh each time someone flies
      And a creak with each "Eek!", and while someone teeters on the rim
      And the tumble as the unlucky person goes down the chute
      And a pop as they come out of the prize door, and the fanfare with "… is the prize!"

  # Pop Goes the Weasel is traditional and in the public domain; the builder
  # arranges it from a public-domain print and names it in music.ts. The owner
  # has not heard it: this rule passes once they have, in the Lab.
  Rule: Its music winds up, and never says "Pop!"

    Scenario: The jack-in-the-box tune from the claw's first move
      Given 8 people
      When the show runs with music on
      Then Pop Goes the Weasel starts as the claw first sets off
      And it is played on the steel voice, over a bass and chords

    Scenario Outline: It gets quicker all the way, with <count> people
      When the show runs with <count> people, with each ending and each way it goes over the chute
      Then the tune gets quicker with every beat, from its first to its last, 1.7 times as quick at the end as at the start
      And it never slows, holds or pauses: it plays on through each "Eek!", each "Click!" and each teeter

      Examples:
        | count |
        | 2     |
        | 6     |
        | 12    |

    Scenario: From the heartbeat on, the low end is the heartbeat's
      When the heartbeat starts
      Then the tune plays on without its bass until it stops

    Scenario: It stops on the breath before "Pop!"
      Given the unlucky person is "Marco"
      When the claw shuts round Marco, or Marco tips into the chute
      Then the music stops, and doesn't come back
      And the last note it played is the one before the tune's "Pop!"
      And the pop of the prize door and the fanfare play as before

  Rule: It reads without sound

    Scenario: Captions tell the story, a grab at a time
      Given 6 people, the unlucky person is "Anna", the claw takes "Dario", "Elena", then "Ben", the last grab takes "Anna" and "Priya", and Priya teeters on the rim and tips out
      When the show runs
      Then the captions include, in this order:
        | caption                     |
        | One of you is today's prize |
        | Slip out and you're safe    |
        | It's got Dario!             |
        | It's got Elena!             |
        | It's got Ben!               |
        | Final three!                |
        | It's got Anna & Priya!      |
        | Whoa…                       |
        | Nearly!                     |
        | Uh-oh…                      |
        | Anna is the prize!          |

    Scenario: Each caption stays up long enough to read
      When the show runs
      Then every caption stays on screen for at least 1 second

    Scenario: Whoever is at risk is drawn big
      When the show runs at 2, 6, 8 and 12 people, a 15-character name among the 12
      Then in the pile, heads are 136 pixels tall with 2 or 3 people, 120 with 4 to 6, 100 with 7 or 8, and 88 from 9, on the 1280 by 720 stage
      And the pile's heads grow to 120 once 6 or fewer are at risk, or to 100 where the pile has three rows
      And whoever is in the claw is drawn 120 pixels tall or more, or 100 before the final three from 9 people
      And name tags other than the 15-character one are 0.28 of their head, 24 pixels or more
      And the 15-character name's tag is 22 pixels or more, wherever it is
      And on the shelf, heads are 100 pixels tall up to 8 people and 84 from 9, and name tags 22 pixels or more
      And the number on the "At risk" plaque is 34 pixels or more

    Scenario: Nothing covers a name
      When the show runs at 12, at 8 and at 2 people
      Then no name tag is ever over another
      And no speech bubble covers a name tag or a face
      And the claw never hangs in front of anyone on the shelf
      And the prize's name tag is under every other name tag on the stage, on the machine's base

    Scenario: A name tag hides only while its plush tumbles or passes someone
      Given 8 people
      When the show runs
      Then a name tag is hidden only while its plush flies to the shelf, while it is in the chute, or while it is lifted past a face or a name tag in the pile
      And no name tag is hidden for more than 0.6 seconds, but the unlucky person's in the chute

  Rule: Reduced motion keeps the story

    Scenario: With reduced motion, nothing swings or tumbles
      Given reduced motion is on
      When the show runs
      Then the claw leans out once at the stop instead of kicking, and whoever it holds doesn't sway
      And whoever slips glides to the shelf upright, with no speed lines
      And whoever lands on the rim tilts once, out or in, instead of teetering
      And the claw doesn't tremble at "Eek!" or snap at "Click!"
      And every caption still appears, in the same order
