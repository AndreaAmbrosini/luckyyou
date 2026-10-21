import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import {
  choose,
  quoted,
  resultHeading,
  startShow,
  stubDraws,
  tickBox,
  tickedNames,
} from './support/app';
import { fakeScenario, type FakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const ANNA_BEN_CARLA = ['Anna', 'Ben', 'Carla'];

/** Plays a show for `names` in which the app picks `unlucky`, and waits for the result. */
async function resultFor(names: readonly string[], unlucky: string, scenario: FakeScenario) {
  stubDraws(names.indexOf(unlucky));
  await startShow(names, scenario);
  await resultHeading();
}

describeSpec(await loadFeature('./result.feature'), ({ Rule }) => {
  Rule('The result names the unlucky person', ({ RuleScenario }) => {
    RuleScenario('The unlucky person is congratulated', ({ Given, When, Then, And }) => {
      Given('the app picked {string}', (_, name: string) => {
        stubDraws(ANNA_BEN_CARLA.indexOf(name));
      });
      When('the show ends', () => startShow(ANNA_BEN_CARLA, fakeScenario()));
      Then('the heading says {string}', async (_, text: string) => {
        expect(await resultHeading()).toHaveAccessibleName(text);
      });
      And('below it says {string}', (_, text: string) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
      And('the heading has the keyboard focus', async () => {
        expect(await resultHeading()).toHaveFocus();
      });
    });
  });

  Rule('What happens next', ({ RuleScenario }) => {
    RuleScenario('Run again plays the same show for the same people', ({ Given, When, Then }) => {
      const scenario = fakeScenario({ name: 'Shark Bait' });
      Given('the result says {string}', () => resultFor(ANNA_BEN_CARLA, 'Ben', scenario));
      When('I choose {string}', (_, button: string) => choose(button));
      Then('a new show starts with the same people and scenario', async () => {
        await waitFor(() => expect(scenario.runs).toHaveLength(2));
        expect(scenario.runs[1]!.names).toEqual(ANNA_BEN_CARLA);
      });
    });

    RuleScenario('Run again without the unlucky person', ({ Given, And, When, Then }) => {
      const scenario = fakeScenario();
      let names: string[] = [];
      Given('{any} are ticked', (_, ticked: string) => {
        names = quoted(ticked);
      });
      And('the result says "Lucky you, {any} 🎉"', (_, name: string) =>
        resultFor(names, name, scenario),
      );
      When('I choose {string}', (_, button: string) => choose(button));
      Then('{string} is unticked in the people list', async (_, name: string) => {
        await waitFor(() => expect(scenario.runs).toHaveLength(2));
        await resultHeading();
        await choose("Change who's in");
        expect(tickBox(name)).not.toBeChecked();
      });
      And('a new show starts with {any}', (_, ticked: string) => {
        expect(scenario.runs[1]!.names).toEqual(quoted(ticked));
        expect(tickedNames()).toEqual(quoted(ticked));
      });
    });

    RuleScenario(
      'Run again without Ben is disabled when the scenario needs more people',
      ({ Given, And, Then }) => {
        const scenario = fakeScenario({ name: 'Hot Potato', people: { min: 3, max: 6 } });
        Given('a scenario that needs at least {int} people', () => undefined);
        And('the result for {any} says "Lucky you, {any} 🎉"', (_, ticked: string, name: string) =>
          resultFor(quoted(ticked), name, scenario),
        );
        Then('{string} is disabled', async (_, button: string) => {
          const control = screen.getByRole('button', { name: button });
          expect(control).toHaveAttribute('aria-disabled', 'true');
          await choose(button);
          expect(scenario.runs).toHaveLength(1);
        });
        And("I'm told the scenario needs at least {int} people", (_, count: number) => {
          expect(
            screen.getByRole('button', { name: 'Run again without Ben' }),
          ).toHaveAccessibleDescription(`Hot Potato needs at least ${count} people.`);
        });
      },
    );

    RuleScenario("Change who's in", ({ Given, When, Then }) => {
      Given('the result is showing', () => resultFor(ANNA_BEN_CARLA, 'Carla', fakeScenario()));
      When('I choose {string}', (_, button: string) => choose(button));
      Then("I'm on the who's-in step with the same people ticked", () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Who's in today?");
        expect(tickedNames()).toEqual(ANNA_BEN_CARLA);
      });
    });
  });
});
