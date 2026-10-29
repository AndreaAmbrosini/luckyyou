import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { pickUnlucky } from '../src/pick/pick';
import {
  choose,
  currentUser,
  moveOnToShows,
  quoted,
  renderApp,
  resultHeading,
  showCard,
  startShow,
  storeTicked,
  stubDraws,
} from './support/app';
import { fakeLineUp, fakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const ANNA_BEN_CARLA = ['Anna', 'Ben', 'Carla'];

/** How often each name comes up in `count` picks among `names`. */
function shares(names: readonly string[], count: number): Record<string, number> {
  const tally = Object.fromEntries(names.map((name) => [name, 0]));
  for (let i = 0; i < count; i++) tally[pickUnlucky(names)]!++;
  return Object.fromEntries(names.map((name) => [name, tally[name]! / count]));
}

function expectAboutAThirdEach(names: readonly string[]) {
  for (const share of Object.values(shares(names, 30_000))) {
    expect(share).toBeGreaterThan(1 / 3 - 0.02);
    expect(share).toBeLessThan(1 / 3 + 0.02);
  }
}

describeSpec(await loadFeature('./pick.feature'), ({ Rule }) => {
  Rule('The app picks before the show', ({ RuleScenario }) => {
    RuleScenario(
      'The unlucky person is chosen as the show starts',
      ({ Given, When, Then, And }) => {
        const events: string[] = [];
        const scenario = fakeScenario({ play: () => void events.push('play') });
        let names: string[] = [];
        Given('{any} are ticked', (_, ticked: string) => {
          names = quoted(ticked);
          const draw = crypto.getRandomValues.bind(crypto);
          vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
            events.push('draw');
            return draw(array);
          });
        });
        When('I start the show', () => startShow(names, scenario));
        Then('the app picks one of them before the scenario begins', async () => {
          await waitFor(() => expect(events).toContain('play'));
          expect(events.indexOf('draw')).toBeGreaterThanOrEqual(0);
          expect(events.indexOf('draw')).toBeLessThan(events.indexOf('play'));
        });
        And('the scenario is told who it is', async () => {
          const { unlucky } = scenario.runs[0]!;
          expect(names).toContain(unlucky);
          expect(await resultHeading()).toHaveAccessibleName(`Lucky you, ${unlucky} 🎉`);
        });
      },
    );

    RuleScenario('Everyone has the same chance', ({ Given, When, Then }) => {
      let names: string[] = [];
      Given('{any} are ticked', (_, ticked: string) => {
        names = quoted(ticked);
      });
      When('the app picks {int} times', () => undefined);
      Then('each of them is picked about a third of the time', () => {
        expectAboutAThirdEach(names);
      });
    });
  });

  Rule('The show cannot change the pick', ({ RuleScenario }) => {
    RuleScenario(
      "The result names the app's pick, whatever the show did",
      ({ Given, And, When, Then }) => {
        let scenario = fakeScenario();
        Given('the app picks {string}', (_, name: string) =>
          stubDraws(ANNA_BEN_CARLA.indexOf(name)),
        );
        And('a scenario that ends its show on {string}', (_, name: string) => {
          scenario = fakeScenario({
            play: (show) => {
              show.stage.textContent = `Lucky you, ${name}`;
            },
          });
        });
        When('the show ends', () => startShow(ANNA_BEN_CARLA, scenario));
        Then('the result says {string}', async (_, text: string) => {
          expect(await resultHeading()).toHaveAccessibleName(text);
        });
      },
    );

    RuleScenario(
      'A scenario that edits its list of names changes nothing later',
      ({ Given, And, When, Then }) => {
        let names: string[] = [];
        const scenario = fakeScenario({
          play: (show) => {
            // Frozen, so in a module (strict mode) this throws; the show fails.
            (show.names as string[]).splice(show.names.indexOf('Anna'), 1);
          },
        });
        Given('{any} are ticked', (_, ticked: string) => {
          names = quoted(ticked);
          vi.spyOn(console, 'error').mockImplementation(() => undefined);
        });
        And('a scenario that removes {string} from the names it is given', () => undefined);
        When('the show ends and I run again', async () => {
          await startShow(names, scenario);
          await resultHeading();
          await choose('Run again');
          await waitFor(() => expect(scenario.runs).toHaveLength(2));
        });
        Then('{string} is still in the pick', (_, name: string) => {
          expect(scenario.runs[1]!.names).toEqual(names);
          expect(scenario.runs[1]!.names).toContain(name);
        });
      },
    );
    RuleScenario(
      "Looks chosen on the Line-up don't change the chances",
      ({ Given, And, When, Then }) => {
        const events: string[] = [];
        const scenario = fakeScenario({
          name: 'Hat Show',
          lineUp: fakeLineUp(),
          play: () => void events.push('play'),
        });
        Given("{any} are ticked, on a show's Line-up", async (_, ticked: string) => {
          const draw = crypto.getRandomValues.bind(crypto);
          vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
            events.push('draw');
            return draw(array);
          });
          storeTicked(quoted(ticked), ['Zoe']);
          renderApp({ scenarios: [scenario] });
          await moveOnToShows();
          await currentUser().click(showCard('Hat Show'));
        });
        And('each of them has a different look', async () => {
          const colours = ['Tomato', 'Sun', 'Mint'];
          for (const [index, name] of ANNA_BEN_CARLA.entries()) {
            await currentUser().click(screen.getByRole('button', { name }));
            const colour = within(screen.getByRole('group', { name: 'Colour' }));
            await currentUser().click(colour.getByRole('button', { name: colours[index] }));
          }
          events.push('line-up done');
        });
        When('the app picks {int} times as the show starts', async () => {
          await currentUser().click(screen.getByRole('button', { name: 'Start the hats' }));
          await waitFor(() => expect(events).toContain('play'));
        });
        Then('each of them is picked about a third of the time', () => {
          // The pick is handed today's names and nothing else.
          expect(pickUnlucky).toHaveLength(1);
          expectAboutAThirdEach(ANNA_BEN_CARLA);
        });
        And('the pick is made only once the show starts, after the Line-up', () => {
          const lineUpDone = events.indexOf('line-up done');
          expect(events.slice(0, lineUpDone)).not.toContain('draw');
          expect(events.indexOf('draw')).toBeGreaterThan(lineUpDone);
          expect(events.indexOf('draw')).toBeLessThan(events.indexOf('play'));
        });
      },
    );
  });

  Rule('Every run is a fresh pick', ({ RuleScenario }) => {
    RuleScenario('The person picked last time can be picked again', ({ Given, When, Then }) => {
      const scenario = fakeScenario();
      Given('{string} was picked in the last run', async (_, name: string) => {
        stubDraws(ANNA_BEN_CARLA.indexOf(name));
        await startShow(ANNA_BEN_CARLA, scenario);
        expect(await resultHeading()).toHaveAccessibleName(`Lucky you, ${name} 🎉`);
      });
      When('the next run starts', async () => {
        await choose('Run again');
        await waitFor(() => expect(scenario.runs).toHaveLength(2));
      });
      Then('{string} has the same chance as everyone else', (_, name: string) => {
        // The same draw picks Ben again: the app doesn't skip last time's pick.
        expect(scenario.runs[1]!.unlucky).toBe(name);
        vi.restoreAllMocks();
        expectAboutAThirdEach(ANNA_BEN_CARLA);
      });
    });
  });
});
