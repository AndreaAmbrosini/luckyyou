Feature: Scenarios
  A scenario is one folder in src/scenarios/. The app finds it by itself, and
  every scenario passes the same contract.

  Rule: Scenarios are found by folder

    Scenario: A new folder shows up as a scenario
      Given a valid scenario named "Hot Potato" in src/scenarios/hot-potato/
      When the app starts
      Then "Hot Potato" is in the scenario picker

    Scenario: Folders starting with an underscore are skipped
      Given a scenario in src/scenarios/_template/
      Then it is not in the scenario picker
      And the app doesn't load it, so the production build leaves it out

    Scenario: Scenarios are listed by name
      Given scenarios named "Snail Race", "Hot Potato" and "Shark Bait"
      Then the picker lists "Hot Potato", "Shark Bait", "Snail Race"

    Scenario: Development-only scenarios stay out of production
      Given a scenario marked development-only
      Then it is listed in development and test builds
      And it is not listed in the production build

  Rule: Metadata is checked

    Scenario Outline: A scenario with <problem> is skipped
      Given a scenario folder whose metadata has <problem>
      When the app starts
      Then that scenario is not listed
      And the console says why
      And the other scenarios still work

      Examples:
        | problem                                   |
        | an id that differs from its folder name   |
        | an id that isn't kebab-case               |
        | a name over 30 characters                 |
        | a description over 90 characters          |
        | a description on two lines                |
        | no card emoji or image                    |
        | a minimum below 2 people                  |
        | a maximum above 12 people                 |
        | a minimum above its maximum               |
        | a development-only flag that isn't yes/no |

  Rule: Every show keeps the contract

    Scenario: Its metadata is valid
      Then the scenario's metadata has none of the problems above

    Scenario Outline: At its <size> head count, unlucky person <position>, the show keeps time and cleans up
      Given the scenario's <size> head count, with the unlucky person <position> in the list
      When the show runs
      Then it ends between 10 and 20 seconds after it started
      And the stage is empty
      And no element, animation, timer or listener it added is left

      Examples:
        | size     | position |
        | smallest | first    |
        | smallest | last     |
        | largest  | first    |
        | largest  | last     |

    # Shows may now last up to 30 seconds. The build deletes the outline above,
    # with its steps, when this one passes.
    @pending
    Scenario Outline: At its <size> head count, unlucky person <position>, the show ends within 30 seconds and cleans up
      Given the scenario's <size> head count, with the unlucky person <position> in the list
      When the show runs
      Then it ends between 10 and 30 seconds after it started
      And the stage is empty
      And no element, animation, timer or listener it added is left

      Examples:
        | size     | position |
        | smallest | first    |
        | smallest | last     |
        | largest  | first    |
        | largest  | last     |

    Scenario: Everyone is shown, and the show ends on the unlucky person
      When the show runs at the scenario's largest head count
      Then every name appears on stage at some point
      And the unlucky name is on stage in the last 3 seconds

    Scenario: Names are shown as text
      Given a person named "<img src=x onerror=alert(1)>"
      When the show runs
      Then that name appears on stage exactly as typed
      And no element is created from it

    Scenario: The longest allowed name doesn't break the show
      Given a person named "Maria Giulia Bianchi-Rossi Jr.", 30 characters long
      When the show runs
      Then it ends on time, with no errors

    Scenario Outline: Cancelling at <seconds> seconds stops the show cleanly
      When the show is cancelled at <seconds> seconds
      Then it stops within half a second
      And it leaves nothing behind

      Examples:
        | seconds |
        | 2       |
        | 8       |
