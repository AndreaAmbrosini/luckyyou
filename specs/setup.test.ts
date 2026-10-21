import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import {
  choose,
  currentUser,
  fakeFullscreen,
  moveOnToShows,
  quoted,
  reload,
  renderApp,
  showCard,
  storeSettings,
  storeTicked,
  TEAM,
  tickedNames,
} from './support/app';
import { fakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
const nextButton = () => screen.getByRole('button', { name: 'Next: pick a show' });
const soundSwitch = () => screen.getByRole('switch', { name: 'Sound' });

describeSpec(await loadFeature('./setup.feature'), ({ Rule }) => {
  Rule('Moving on needs 2 to 12 ticked people', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline('Moving on with <ticked> ticked', ({ Given, Then }, { ticked, state }) => {
      Given('<ticked> people are ticked', () => {
        storeTicked(TEAM.slice(0, Number(ticked)), ['Zoe']);
        renderApp({ scenarios: [fakeScenario()] });
      });
      Then('moving on to the shows is <state>', async () => {
        await moveOnToShows();
        if (state === 'allowed') {
          expect(heading()).toBe('Pick a show');
        } else {
          expect(heading()).toBe("Who's in today?");
          expect(nextButton()).toHaveAttribute('aria-disabled', 'true');
        }
      });
    });

    RuleScenario('Too few ticked says why', ({ Given, Then }) => {
      Given('{int} person is ticked', (_, count: number) => {
        storeTicked(TEAM.slice(0, count), ['Zoe']);
        renderApp();
      });
      Then("I'm told {string}", (_, message: string) => {
        expect(nextButton()).toHaveAccessibleDescription(message);
      });
    });

    RuleScenario('Too many ticked says why', ({ Given, Then }) => {
      Given('{int} people are ticked', (_, count: number) => {
        storeTicked(TEAM.slice(0, count));
        renderApp();
      });
      Then("I'm told {string}", (_, message: string) => {
        expect(nextButton()).toHaveAccessibleDescription(message);
      });
    });
  });

  Rule('Clicking a show starts it', ({ RuleScenario }) => {
    RuleScenario('The shows step names who is in', ({ Given, When, Then }) => {
      Given('{any} are ticked', (_, names: string) => {
        storeTicked(quoted(names), ['Dario']);
        renderApp({ scenarios: [fakeScenario()] });
      });
      When('I move on to the shows', moveOnToShows);
      Then('I see that {int} are in: {any}', (_, count: number, names: string) => {
        const line = screen.getByText(`${count} in`).parentElement!;
        expect(line).toHaveTextContent(`${count} in ${quoted(names).join(', ')}`);
      });
    });

    RuleScenario(
      'Each name in the list keeps its own reading direction',
      ({ Given, When, Then }) => {
        Given('{any} are ticked', (_, names: string) => {
          storeTicked(quoted(names), ['Dario']);
          renderApp({ scenarios: [fakeScenario()] });
        });
        When('I move on to the shows', moveOnToShows);
        Then('{any} each read in their own direction', (_, names: string) => {
          const line = screen.getByText('3 in').parentElement!;
          // dir="auto" sets each name's direction from its own first letter.
          const isolated = [...line.querySelectorAll('[dir="auto"]')].map((el) => el.textContent);
          expect(isolated.toSorted()).toEqual(quoted(names).toSorted());
          expect(line.textContent).toBe(`3 in ${isolated.join(', ')}`);
        });
      },
    );

    RuleScenario("Clicking a show starts it with today's people", ({ Given, And, When, Then }) => {
      const sharkBait = fakeScenario({ name: 'Shark Bait' });
      Given('{any} are ticked', (_, names: string) => {
        storeTicked(quoted(names), ['Dario']);
        renderApp({ scenarios: [fakeScenario({ name: 'Hot Potato' }), sharkBait] });
      });
      And('I moved on to the shows', moveOnToShows);
      When('I click {string}', (_, name: string) => currentUser().click(showCard(name)));
      Then('Shark Bait starts with {any}', async (_, names: string) => {
        await waitFor(() => expect(sharkBait.runs).toHaveLength(1));
        expect(sharkBait.runs[0]!.names).toEqual(quoted(names));
      });
    });

    RuleScenario('Going back keeps the ticks', ({ Given, And, When, Then }) => {
      Given('{any} are ticked', (_, names: string) => {
        storeTicked(quoted(names), ['Carla']);
        renderApp({ scenarios: [fakeScenario()] });
      });
      And('I moved on to the shows', moveOnToShows);
      When("I go back to who's in", () => choose("Who's in"));
      Then('{any} are still ticked', (_, names: string) => {
        expect(heading()).toBe("Who's in today?");
        expect(tickedNames()).toEqual(quoted(names));
      });
    });
  });

  Rule('Scenario cards show whether they can run', ({ RuleScenario }) => {
    RuleScenario("A card shows the scenario's name, description and picture", ({ Given, Then }) => {
      Given(
        'a scenario named {string}, described as {string}, pictured as {any}',
        async (_, name: string, description: string, emoji: string) => {
          storeTicked(TEAM.slice(0, 3));
          renderApp({ scenarios: [fakeScenario({ name, description, card: { emoji } })] });
          await moveOnToShows();
        },
      );
      Then('its card shows the name, the description and the picture', () => {
        const card = within(showCard('Hot Potato'));
        expect(card.getByText('Hot Potato')).toBeInTheDocument();
        expect(card.getByText('A bomb goes round the circle.')).toBeInTheDocument();
        expect(card.getByText('💣')).toBeInTheDocument();
      });
    });

    RuleScenario(
      "A card that can't run with today's count is disabled, with the reason",
      ({ Given, And, Then }) => {
        const hotPotato = fakeScenario({ name: 'Hot Potato', people: { min: 3, max: 6 } });
        Given('a scenario that takes {int} to {int} people', () => undefined);
        And('{int} people are ticked', async (_, count: number) => {
          storeTicked(TEAM.slice(0, count));
          renderApp({ scenarios: [hotPotato] });
          await moveOnToShows();
        });
        Then('its card is disabled', async () => {
          expect(showCard('Hot Potato')).toHaveAttribute('aria-disabled', 'true');
          await currentUser().click(showCard('Hot Potato'));
          expect(hotPotato.runs).toEqual([]);
        });
        And('it says {string}', (_, reason: string) => {
          expect(showCard('Hot Potato')).toHaveAccessibleDescription(
            expect.stringContaining(reason),
          );
        });
      },
    );
  });

  Rule('The show played last time is ready to play again', ({ RuleScenario }) => {
    RuleScenario(
      'The show played last time is marked and has the focus',
      ({ Given, When, Then, And }) => {
        const hotPotato = fakeScenario({ name: 'Hot Potato' });
        Given('I played {string} on my last visit', () => {
          storeSettings({ muted: false, lastScenario: 'hot-potato' });
          storeTicked(TEAM.slice(0, 3));
          renderApp({
            scenarios: [
              fakeScenario({ name: 'Ant Hill' }),
              hotPotato,
              fakeScenario({ name: 'Shark Bait' }),
            ],
          });
        });
        When('I move on to the shows', moveOnToShows);
        Then('{string} is marked "Last time"', (_, name: string) => {
          expect(within(showCard(name)).getByText('Last time')).toBeInTheDocument();
        });
        And('it has the keyboard focus, so Enter plays it again', async () => {
          expect(showCard('Hot Potato')).toHaveFocus();
          await currentUser().keyboard('{Enter}');
          await waitFor(() => expect(hotPotato.runs).toHaveLength(1));
        });
      },
    );

    RuleScenario(
      "If the last show can't run today, the first one that can has the focus",
      ({ Given, And, When, Then }) => {
        Given('I played {string} on my last visit, and it takes at most {int} people', () => {
          storeSettings({ muted: false, lastScenario: 'hot-potato' });
        });
        And('{int} people are ticked', (_, count: number) => {
          storeTicked(TEAM.slice(0, count));
          renderApp({
            scenarios: [
              fakeScenario({ name: 'Ant Hill', people: { min: 2, max: 6 } }),
              fakeScenario({ name: 'Hot Potato', people: { min: 2, max: 6 } }),
              fakeScenario({ name: 'Shark Bait' }),
              fakeScenario({ name: 'Snail Race' }),
            ],
          });
        });
        When('I move on to the shows', moveOnToShows);
        Then('the first scenario that takes {int} people has the keyboard focus', () => {
          expect(showCard('Shark Bait')).toHaveFocus();
        });
      },
    );

    RuleScenario('If no show can run, the step says why', ({ Given, And, When, Then }) => {
      Given('no scenario takes {int} people', () => undefined);
      And('{int} people are ticked', (_, count: number) => {
        storeTicked(TEAM.slice(0, count));
        renderApp({
          scenarios: [
            fakeScenario({ name: 'Hot Potato', people: { min: 3, max: 6 } }),
            fakeScenario({ name: 'Shark Bait', people: { min: 2, max: 10 } }),
          ],
        });
      });
      When('I move on to the shows', moveOnToShows);
      Then('every card is disabled', () => {
        for (const name of ['Hot Potato', 'Shark Bait']) {
          expect(showCard(name)).toHaveAttribute('aria-disabled', 'true');
        }
      });
      And("I'm told no show can run with {int} people", (_, count: number) => {
        expect(screen.getByText(`No show can run with ${count} people.`)).toHaveFocus();
      });
    });
  });

  Rule('Mute and fullscreen', ({ RuleScenario }) => {
    RuleScenario('Mute is remembered in this browser', ({ Given, When, Then }) => {
      Given('I turned the sound off', async () => {
        renderApp();
        expect(soundSwitch()).toBeChecked();
        await currentUser().click(soundSwitch());
      });
      When('I reload the page', () => {
        reload();
      });
      Then('the sound is still off', () => {
        expect(soundSwitch()).not.toBeChecked();
      });
    });

    RuleScenario('Fullscreen is offered where the browser allows it', ({ Given, Then }) => {
      Given('the browser supports fullscreen', () => {
        fakeFullscreen(true);
        renderApp();
      });
      Then('I can switch the page to fullscreen and back', async () => {
        const control = screen.getByRole('button', { name: 'Fullscreen' });
        expect(control).toHaveAttribute('aria-pressed', 'false');
        await currentUser().click(control);
        expect(document.fullscreenElement).toBe(document.documentElement);
        expect(control).toHaveAttribute('aria-pressed', 'true');
        await currentUser().click(control);
        expect(document.fullscreenElement).toBeNull();
        expect(control).toHaveAttribute('aria-pressed', 'false');
      });
    });

    RuleScenario("No fullscreen control where the browser can't do it", ({ Given, Then }) => {
      Given("the browser doesn't support fullscreen", () => {
        fakeFullscreen(false);
        renderApp();
      });
      Then('no fullscreen control is shown', () => {
        expect(screen.queryByRole('button', { name: 'Fullscreen' })).not.toBeInTheDocument();
      });
    });
  });
});
