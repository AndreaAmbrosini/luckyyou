import { loadFeature } from '@amiceli/vitest-cucumber';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import {
  bar,
  choose,
  currentUser,
  fakeFullscreen,
  mainButton,
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
import { looksKey, themeKey } from '../src/line-up/looks';
import type { LineUp } from '../src/scenario-kit/contract';
import { dealLooks } from '../src/scenario-kit/line-up';
import { FULL_LEVEL } from '../src/scenario-kit/music';
import { fakeAudio, type FakeAudio } from './support/audio';
import { fakeLineUp, fakeScenario, themedLineUp } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
const nextButton = () => screen.getByRole('button', { name: 'Next: pick a show' });
const soundSwitch = () => screen.getByRole('switch', { name: 'Sound' });
const musicButton = () => screen.getByRole('button', { name: /^Music/ });
const musicSwitch = () => screen.getByRole('switch', { name: 'Music' });
const volumeSlider = () => screen.getByRole('slider', { name: 'Volume' });
const openMusic = () => currentUser().click(musicButton());
/** Moves the volume slider to `percent`, as dragging it would. */
const moveVolume = (percent: number) =>
  fireEvent.change(volumeSlider(), { target: { value: String(percent) } });
const stepItems = () =>
  within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
/** Each step as the header reads it, its number or check left out. */
const steps = () =>
  stepItems().map((step) => {
    const read = step.cloneNode(true) as HTMLElement;
    for (const hidden of read.querySelectorAll('[aria-hidden]')) hidden.remove();
    return read.textContent!;
  });
/** The steps' names, without what was chosen there. */
const stepNames = () => steps().map((step) => step.split(' · ')[0]);
/** The bar's buttons, left to right, by name. */
const barButtons = () =>
  within(bar())
    .getAllByRole('button')
    .map((button) => button.textContent);
/** The panel under the shows, on the chosen one. */
const chosenPanel = (name: string) => screen.getByRole('region', { name });
/** Whether `later` comes after `earlier` on the page. */
const follows = (earlier: Node, later: Node) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
/** The Race, as a show with a themed line-up whose themes include Autumn. */
const theRace = () => {
  const lineUp = themedLineUp();
  const autumn = { ...lineUp.themes![2]!, name: 'autumn', label: 'Autumn' };
  return fakeScenario({
    name: 'The Race',
    lineUp: { ...lineUp, heading: 'Line up the racers', themes: [...lineUp.themes!, autumn] },
  });
};

/** The music's state as the open panel shows it. */
const musicShown = () => ({
  on: musicSwitch().getAttribute('aria-checked') === 'true',
  volume: Number((volumeSlider() as HTMLInputElement).value),
});

describeSpec(await loadFeature('./setup.feature'), ({ Rule }) => {
  Rule('Every step before the show has the same frame', ({ RuleScenario }) => {
    RuleScenario(
      'The way back on the left, the one main button on the right',
      ({ When, Then, And }) => {
        const seen: {
          step: string;
          status: string | null;
          buttons: (string | null)[];
          atTheBottom: boolean;
        }[] = [];
        const look = () =>
          seen.push({
            step: heading()!,
            // Before the buttons: a status, where the step has one.
            status: bar().querySelector('p')?.textContent ?? null,
            buttons: barButtons(),
            atTheBottom: follows(screen.getByRole('main'), bar()),
          });
        When("I am on Who's in, Pick a show or a Line-up", async () => {
          storeTicked(['Anna', 'Ben', 'Carla']);
          renderApp({ scenarios: [fakeScenario({ name: 'Hat Show', lineUp: fakeLineUp() })] });
          look();
          await moveOnToShows();
          look();
          await choose('Next: line up the hats');
          look();
        });
        Then(
          "a bar along the bottom holds the way back, where there is one, on the left, and the step's main button on the right",
          () => {
            expect(seen).toEqual([
              {
                step: "Who's in today?",
                status: 'Ready: 3 people. Next, pick a show.',
                buttons: ['Next: pick a show'],
                atTheBottom: true,
              },
              {
                step: 'Pick a show',
                status: null,
                buttons: ["Who's in", 'Start with last line-up', 'Next: line up the hats'],
                atTheBottom: true,
              },
              {
                step: 'Line up the hats',
                status: 'Pin a look to keep it when you shuffle',
                buttons: ['Pick a show', 'Start the hats'],
                atTheBottom: true,
              },
            ]);
          },
        );
        And("a main button that can't be pressed has its reason beside it", async () => {
          reload();
          await choose('No one');
          expect(mainButton()).toHaveAttribute('aria-disabled', 'true');
          const reason = document.getElementById(mainButton().getAttribute('aria-describedby')!);
          expect(bar()).toContainElement(reason);
          expect(mainButton()).toHaveAccessibleDescription(
            'At least 2 people are needed. Nobody is ticked.',
          );
        });
      },
    );

    RuleScenario('A done step shows what was chosen there', ({ Given, When, Then, And }) => {
      Given('{int} people are ticked and {string} is chosen', async (_, count: number) => {
        storeTicked(TEAM.slice(0, count), ['Zoe']);
        renderApp({ scenarios: [fakeScenario({ name: 'Plain Show' }), theRace()] });
        await moveOnToShows();
        await currentUser().click(showCard('The Race'));
      });
      When('its Line-up is open', () => choose('Next: line up the racers'));
      Then('the steps read {any}, the last one current', (_, labels: string) => {
        expect(steps()).toEqual(quoted(labels));
        const current = stepItems().map((step) => step.getAttribute('aria-current'));
        expect(current).toEqual([null, null, 'step']);
      });
      And('each done step has a check mark', () => {
        const checked = stepItems().map((step) => step.querySelector('svg') !== null);
        expect(checked).toEqual([true, true, false]);
      });
    });

    RuleScenario(
      'The Line-up step shows once a show with a line-up is chosen',
      ({ When, Then, And }) => {
        When('I am on Pick a show', async () => {
          storeTicked(['Anna', 'Ben', 'Carla']);
          renderApp({ scenarios: [fakeScenario({ name: 'Plain Show' }), theRace()] });
          await moveOnToShows();
        });
        Then(
          'the steps read {string} and {string} while the chosen show has no line-up',
          (_, first: string, second: string) => {
            expect(showCard('Plain Show')).toHaveAttribute('aria-pressed', 'true');
            expect(stepNames()).toEqual([first, second]);
          },
        );
        And(
          '{string} joins them as soon as a show with a line-up is chosen',
          async (_, third: string) => {
            await currentUser().click(showCard('The Race'));
            expect(stepNames()).toEqual(["Who's in", 'Show', third]);
          },
        );
      },
    );
  });

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

  Rule("Pick a show follows Who's in", ({ RuleScenario }) => {
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

  Rule('Choosing a show, then starting it', ({ RuleScenario }) => {
    RuleScenario('Clicking a show chooses it, and nothing starts', ({ Given, And, When, Then }) => {
      const hotPotato = fakeScenario({ name: 'Hot Potato' });
      const sharkBait = fakeScenario({ name: 'Shark Bait' });
      Given('{any} are ticked', (_, names: string) => {
        storeTicked(quoted(names), ['Dario']);
        renderApp({ scenarios: [hotPotato, sharkBait] });
      });
      And('I moved on to the shows', moveOnToShows);
      When('I click {string}', (_, name: string) => currentUser().click(showCard(name)));
      Then('{string} is chosen, marked by a check mark as well as by colour', (_, name: string) => {
        expect(showCard(name)).toHaveAttribute('aria-pressed', 'true');
        expect(showCard(name).querySelector('[data-check] svg')).not.toBeNull();
        expect(showCard('Hot Potato')).toHaveAttribute('aria-pressed', 'false');
        expect(showCard('Hot Potato').querySelector('[data-check]')).toBeNull();
      });
      And(
        'under the shows, a panel names it, says how many people it takes, and that Start plays it at once',
        () => {
          const panel = chosenPanel('Shark Bait');
          expect(follows(showCard('Shark Bait'), panel)).toBe(true);
          expect(panel).toHaveTextContent('Takes 2 to 12 people. You have 3.');
          expect(panel).toHaveTextContent('No line-up: it starts as soon as you press Start.');
        },
      );
      And("the show hasn't started", () => {
        expect(hotPotato.runs).toEqual([]);
        expect(sharkBait.runs).toEqual([]);
      });
    });

    RuleScenario('Start plays the chosen show', ({ Given, When, Then }) => {
      const sharkBait = fakeScenario({ name: 'Shark Bait' });
      Given('{any} are ticked, and {string} is chosen', async (_, names: string) => {
        storeTicked(quoted(names), ['Dario']);
        renderApp({ scenarios: [fakeScenario({ name: 'Hot Potato' }), sharkBait] });
        await moveOnToShows();
        await currentUser().click(showCard('Shark Bait'));
      });
      When('I press {string}', (_, label: string) => choose(label));
      Then('Shark Bait starts with {any}', async (_, names: string) => {
        await waitFor(() => expect(sharkBait.runs).toHaveLength(1));
        expect(sharkBait.runs[0]!.names).toEqual(quoted(names));
      });
    });

    RuleScenario('A show with a line-up leads to it', ({ When, Then, And }) => {
      When('I choose {string}', async (_, name: string) => {
        storeTicked(['Anna', 'Ben', 'Carla']);
        renderApp({ scenarios: [fakeScenario({ name: 'Plain Show' }), theRace()] });
        await moveOnToShows();
        await currentUser().click(showCard(name));
      });
      Then('the panel says its Line-up comes next', () => {
        expect(chosenPanel('The Race')).toHaveTextContent(
          "Next you pick the place and everyone's hat, or start with last time's.",
        );
      });
      And("the main button reads {string}, from the line-up's heading", (_, label: string) => {
        expect(mainButton()).toHaveAccessibleName(label);
      });
    });

    RuleScenario('Start with last line-up', ({ Given, When, Then, And }) => {
      const race = theRace();
      const names = ['Anna', 'Ben', 'Carla'];
      const kept = Object.fromEntries(dealLooks(race.lineUp as LineUp, names, Math.random));
      const openRace = async () => {
        await moveOnToShows();
        await currentUser().click(showCard('The Race'));
      };
      Given(
        '{string} is chosen, and its Line-up was last left on {string}',
        async (_, __: string, theme: string) => {
          localStorage.setItem(looksKey(race.id), JSON.stringify(kept));
          localStorage.setItem(themeKey(race.id), JSON.stringify(theme.toLowerCase()));
          storeTicked(names);
          renderApp({ scenarios: [fakeScenario({ name: 'Plain Show' }), race] });
          await openRace();
        },
      );
      When('I press {string}', (_, label: string) => choose(label));
      Then(
        'The Race starts at once, everyone in the look kept for them, on {string}',
        async (_, theme: string) => {
          await waitFor(() => expect(race.runs).toHaveLength(1));
          expect(Object.fromEntries(race.runs[0]!.looks)).toEqual(kept);
          expect(race.runs[0]!.theme).toBe(theme.toLowerCase());
        },
      );
      And('a Line-up last left on {string} draws its theme afresh', async () => {
        localStorage.setItem(themeKey(race.id), 'null');
        reload();
        await openRace();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        await choose('Start with last line-up');
        await waitFor(() => expect(race.runs).toHaveLength(2));
        expect(race.runs[1]!.theme).toBe('beach');
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
      'The show played last time is chosen, and Enter goes on with it',
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
        Then('{string} is chosen and marked "Last time"', (_, name: string) => {
          expect(showCard(name)).toHaveAttribute('aria-pressed', 'true');
          expect(within(showCard(name)).getByText('Last time')).toBeInTheDocument();
        });
        And('the main button has the keyboard focus, so Enter starts it again', async () => {
          expect(mainButton()).toHaveAccessibleName('Start Hot Potato');
          expect(mainButton()).toHaveFocus();
          await currentUser().keyboard('{Enter}');
          await waitFor(() => expect(hotPotato.runs).toHaveLength(1));
        });
      },
    );

    RuleScenario(
      "If the last show can't run today, the first one that can is chosen",
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
        Then('the first scenario that takes {int} people is chosen', () => {
          expect(showCard('Shark Bait')).toHaveAttribute('aria-pressed', 'true');
        });
        And('the main button has the keyboard focus', () => {
          expect(mainButton()).toHaveAccessibleName('Start Shark Bait');
          expect(mainButton()).toHaveFocus();
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
  Rule('Music has its own switch and volume', ({ RuleScenario }) => {
    RuleScenario('The music button opens the music panel', ({ When, Then, And }) => {
      When('I click the music button in the header', async () => {
        renderApp();
        expect(musicButton()).toHaveAttribute('aria-expanded', 'false');
        await openMusic();
      });
      Then(
        'a panel opens under it with a "Music" switch and a "Volume" slider showing its value',
        () => {
          expect(musicButton()).toHaveAttribute('aria-expanded', 'true');
          const panel = document.getElementById(musicButton().getAttribute('aria-controls')!)!;
          expect(panel).toBeVisible();
          expect(musicButton().parentElement).toContainElement(panel);
          expect(within(panel).getByRole('switch', { name: 'Music' })).toBeVisible();
          expect(within(panel).getByRole('slider', { name: 'Volume' })).toHaveValue('70');
          expect(within(panel).getByRole('status')).toHaveTextContent('70%');
        },
      );
      And(
        'Esc or a click outside closes the panel, and the focus goes back to the button',
        async () => {
          await currentUser().click(musicSwitch());
          await currentUser().keyboard('{Escape}');
          expect(musicButton()).toHaveAttribute('aria-expanded', 'false');
          expect(musicButton()).toHaveFocus();
          await openMusic();
          await currentUser().click(screen.getByRole('heading', { level: 1 }));
          expect(musicButton()).toHaveAttribute('aria-expanded', 'false');
          expect(musicButton()).toHaveFocus();
        },
      );
    });

    RuleScenario('Music starts on, at 70%', ({ Given, Then }) => {
      Given('a first visit', async () => {
        renderApp();
        await openMusic();
      });
      Then('the music is on, at {int}%', (_, volume: number) => {
        expect(musicShown()).toEqual({ on: true, volume });
        expect(musicButton()).toHaveAccessibleName('Music');
      });
    });

    RuleScenario('Music and its volume are remembered in this browser', ({ Given, When, Then }) => {
      Given('I turned the music off and set its volume to {int}%', async (_, volume: number) => {
        renderApp();
        await openMusic();
        await currentUser().click(musicSwitch());
        moveVolume(volume);
      });
      When('I reload the page', async () => {
        reload();
        await openMusic();
      });
      Then('the music is still off, at {int}%', (_, volume: number) => {
        expect(musicShown()).toEqual({ on: false, volume });
      });
    });

    RuleScenario('Sound off silences the music too', ({ Given, Then, And, When }) => {
      Given('the sound is off', async () => {
        storeSettings({ muted: false, music: false, musicVolume: 40, lastScenario: null });
        renderApp();
        await currentUser().click(soundSwitch());
        await openMusic();
      });
      Then('the music button shows the music as off', () => {
        expect(musicButton()).toHaveAccessibleName('Music, off');
      });
      And(
        "the panel's switch and slider are disabled, with the reason {string}",
        (_, reason: string) => {
          for (const control of [musicSwitch(), volumeSlider()]) {
            expect(control).toBeDisabled();
            expect(control).toHaveAccessibleDescription(reason);
          }
        },
      );
      When('I turn the sound back on', async () => {
        await currentUser().click(soundSwitch());
        await openMusic();
      });
      Then('the music is on or off, at the volume, as I left it', () => {
        expect(musicShown()).toEqual({ on: false, volume: 40 });
        expect(musicSwitch()).toBeEnabled();
        expect(volumeSlider()).not.toHaveAccessibleDescription();
      });
    });

    RuleScenario('Moving the volume plays a sample', ({ When, Then, And }) => {
      let audio: FakeAudio;
      const level = () => audio.outputLevels.at(-1)! / FULL_LEVEL;
      When('I move the volume slider', async () => {
        audio = fakeAudio();
        renderApp();
        await openMusic();
        moveVolume(40);
      });
      Then('a short sample of music plays at the new volume', () => {
        expect(audio.opened).toBe(1);
        expect(audio.started).toBeGreaterThan(0);
        expect(level()).toBeCloseTo(0.4, 6);
      });
      And(
        'moving it again while the sample plays changes its volume without starting it over',
        () => {
          const started = audio.started;
          moveVolume(60);
          expect(audio.opened).toBe(1);
          expect(audio.started).toBe(started);
          expect(level()).toBeCloseTo(0.6, 6);
        },
      );
      And('the sample stops when the panel closes', async () => {
        await currentUser().keyboard('{Escape}');
        expect(audio.closed).toBe(1);
      });
    });
  });
});
