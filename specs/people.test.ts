import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';
import {
  addName,
  blockStorage,
  choose,
  fillStorage,
  listNames,
  quoted,
  refusal,
  reload,
  renderApp,
  storePeople,
  tickBox,
  tickedNames,
  toggle,
} from './support/app';
import { describeSpec } from './support/spec';

const FLAGS = ['🇮🇹', '🇫🇷', '🇯🇵', '🇧🇷', '🇳🇬', '🇨🇦'];

/** `"Anna", ticked, and "Ben", unticked` → Anna ticked, Ben unticked. */
function storedPeople(text: string) {
  return [...text.matchAll(/"([^"]*)"(?:, (ticked|unticked))?/g)].map(([, name, state]) => ({
    name,
    ticked: state !== 'unticked',
  }));
}

function givenList(text: string) {
  storePeople(storedPeople(text));
  renderApp();
}

describeSpec(await loadFeature('./people.feature'), ({ Rule }) => {
  Rule('Names are tidied and must be unique', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Extra spaces are removed', ({ When, Then }) => {
      When('I add {string}', async (_, text: string) => {
        renderApp();
        await addName(text);
      });
      Then('the list shows {string}', (_, name: string) => {
        expect(listNames()).toEqual([name]);
      });
    });

    RuleScenario(
      'A name already on the list is refused, whatever its case',
      ({ Given, When, Then, And }) => {
        Given('the list has {string}', (_, name: string) => givenList(`"${name}"`));
        When('I add {string}', async (_, text: string) => addName(text));
        Then("I'm told {string}", (_, message: string) => {
          expect(refusal()).toBe(message);
          expect(listNames()).toEqual(['Marco']);
        });
        And('{string} is highlighted on the list', (_, name: string) => {
          expect(tickBox(name).closest('li')).toHaveAttribute('data-highlighted', 'true');
        });
      },
    );

    RuleScenarioOutline('A name has 1 to 30 characters', ({ When, Then }, { length, outcome }) => {
      const name = 'n'.repeat(Number(length));
      When('I add a name of <length> characters', async () => {
        renderApp();
        await addName(name);
      });
      Then('it is <outcome>', () => {
        if (outcome === 'added') {
          expect(listNames()).toEqual([name]);
        } else {
          expect(listNames()).toEqual([]);
          expect(screen.getByRole('alert')).toBeInTheDocument();
        }
      });
    });

    RuleScenario('An empty name says what to do', ({ When, Then }) => {
      When('I add {string}', async (_, text: string) => {
        renderApp();
        await addName(text);
      });
      Then("I'm told {string}", (_, message: string) => {
        expect(refusal()).toBe(message);
      });
    });

    RuleScenario('A name that is too long says how long it is', ({ When, Then }) => {
      When('I add a name of {int} characters', async (_, length: number) => {
        renderApp();
        await addName('n'.repeat(length));
      });
      Then("I'm told {string}", (_, message: string) => {
        expect(refusal()).toBe(message);
      });
    });

    RuleScenario('Characters are counted as people see them', ({ When, Then }) => {
      const name = Array.from({ length: 30 }, (_, i) => FLAGS[i % FLAGS.length]).join('');
      When('I add a name made of 30 flag emoji', async () => {
        renderApp();
        await addName(name);
      });
      Then('it is added, as 30 characters', () => {
        expect(listNames()).toEqual([name]);
      });
    });
  });

  Rule('The list is in alphabetical order', ({ RuleScenario }) => {
    RuleScenario("Case doesn't change the order", ({ Given, Then }) => {
      Given('the list has {any}', (_, names: string) => givenList(names));
      Then('the list is {any}', (_, names: string) => {
        expect(listNames()).toEqual(quoted(names));
      });
    });

    RuleScenario('A new person is added ticked, in their place', ({ Given, When, Then, And }) => {
      Given('the list is {any}', (_, names: string) => givenList(names));
      When('I add {string}', async (_, text: string) => addName(text));
      Then('the list is {any}', (_, names: string) => {
        expect(listNames()).toEqual(quoted(names));
      });
      And('{string} is ticked', (_, name: string) => {
        expect(tickBox(name)).toBeChecked();
      });
    });
  });

  Rule("Ticking chooses who is in today's pick", ({ RuleScenario }) => {
    RuleScenario('Unticking keeps the person on the list', ({ Given, When, Then }) => {
      Given('the list has {any}', (_, people: string) => givenList(people));
      When('I untick {string}', async (_, name: string) => toggle(name));
      Then('{string} is still on the list, unticked', (_, name: string) => {
        expect(listNames()).toEqual([name]);
        expect(tickBox(name)).not.toBeChecked();
      });
    });

    RuleScenario('Everyone can be ticked or unticked at once', ({ Given, When, Then }) => {
      Given('the list has {any}', (_, people: string) => givenList(people));
      When('I tick everyone', async () => choose('Everyone'));
      Then('{string} and {string} are ticked', (_, first: string, second: string) => {
        expect(tickedNames()).toEqual([first, second]);
      });
      When('I untick everyone', async () => choose('No one'));
      Then('nobody is ticked', () => {
        expect(tickedNames()).toEqual([]);
        expect(listNames()).toEqual(['Anna', 'Ben']);
      });
    });
  });

  Rule('Removing someone is a separate step', ({ RuleScenario }) => {
    const removeButton = (name: string) => screen.queryByRole('button', { name: `Remove ${name}` });

    RuleScenario('Ticking never removes anyone', ({ Given, Then, When }) => {
      Given('the list has {string}', (_, name: string) => givenList(`"${name}"`));
      Then('there is no remove button for {string}', (_, name: string) => {
        expect(removeButton(name)).not.toBeInTheDocument();
      });
      When('I choose {string}', async (_, button: string) => choose(button));
      Then('there is a remove button for {string}', (_, name: string) => {
        expect(removeButton(name)).toBeInTheDocument();
      });
    });

    RuleScenario('Removing takes the person off at once', ({ Given, And, When, Then }) => {
      Given('the list has {string}', (_, name: string) => givenList(`"${name}"`));
      And('I chose {string}', async (_, button: string) => choose(button));
      When('I remove {string}', async (_, name: string) => choose(`Remove ${name}`));
      Then('the list is empty', () => {
        expect(listNames()).toEqual([]);
        reload();
        expect(listNames()).toEqual([]);
      });
    });

    RuleScenario('While removing, nobody can be ticked or added', ({ Given, Then, And, When }) => {
      Given('I chose {string}', async (_, button: string) => {
        givenList('"Anna", "Ben"');
        await choose(button);
      });
      Then("names can't be ticked or unticked", () => {
        expect(
          within(screen.getByRole('region', { name: 'Team' })).queryAllByRole('checkbox'),
        ).toEqual([]);
        expect(screen.queryByRole('button', { name: 'Everyone' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'No one' })).not.toBeInTheDocument();
      });
      And('no name can be added', () => {
        expect(screen.queryByRole('textbox', { name: 'Add a name' })).not.toBeInTheDocument();
      });
      When('I choose {string}', async (_, button: string) => choose(button));
      Then('names can be ticked and added again', async () => {
        await toggle('Anna');
        expect(tickedNames()).toEqual(['Ben']);
        await addName('Carla');
        expect(listNames()).toEqual(['Anna', 'Ben', 'Carla']);
      });
    });
  });

  Rule('The list is kept in this browser only', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('The list survives a reload', ({ Given, When, Then }) => {
      Given('the list has {string}', async (_, name: string) => {
        renderApp();
        await addName(name);
      });
      When('I reload the page', () => {
        reload();
      });
      Then('the list shows {string}', (_, name: string) => {
        expect(listNames()).toEqual([name]);
      });
    });

    RuleScenario('A damaged stored list keeps what still makes sense', ({ Given, When, Then }) => {
      Given('the stored list holds "Anna", an entry with no name and "anna"', () => {
        storePeople([
          { name: 'Anna', ticked: true },
          { ticked: true },
          { name: 'anna', ticked: false },
        ]);
      });
      When('the app starts', () => {
        renderApp();
      });
      Then('the list is {string}', (_, name: string) => {
        expect(listNames()).toEqual([name]);
        expect(tickBox(name)).toBeChecked();
      });
    });

    RuleScenario(
      'A list stored by an older version keeps what still makes sense',
      ({ Given, When, Then }) => {
        Given('the stored list holds "Anna" without a ticked state', () => {
          storePeople([{ name: 'Anna' }]);
        });
        When('the app starts', () => {
          renderApp();
        });
        Then('{string} is on the list, ticked', (_, name: string) => {
          expect(listNames()).toEqual([name]);
          expect(tickBox(name)).toBeChecked();
        });
      },
    );

    RuleScenarioOutline(
      "Storage that is <problem> doesn't stop the app",
      ({ Given, When, Then }, { problem }) => {
        Given("this browser's storage is <problem>", () => {
          if (problem === 'blocked') blockStorage();
          else fillStorage();
          renderApp();
        });
        When('I add {string}', async (_, name: string) => addName(name));
        Then('the list shows {string}', (_, name: string) => {
          expect(listNames()).toEqual([name]);
        });
      },
    );
  });
});
