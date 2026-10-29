import { loadFeature } from '@amiceli/vitest-cucumber';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { expect, vi } from 'vitest';
import { discoverScenarios, validateScenario } from '../src/catalogue/discover';
import { Lab } from '../src/lab/Lab';
import type { ChosenLook, LineUp } from '../src/scenario-kit/contract';
import { runShow } from '../src/scenario-kit/testing';
import {
  choose,
  currentUser,
  moveOnToShows,
  pickerNames,
  quoted,
  renderApp,
  resultHeading,
  showCard,
  storeTicked,
  TEAM,
} from './support/app';
import { fakeLineUp, fakeScenario, type FakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

/** True when `look` has one of each option's choices, and nothing else. */
function fits(lineUp: LineUp, look: ChosenLook | undefined): boolean {
  if (!look) return false;
  return (
    Object.keys(look).length === lineUp.options.length &&
    lineUp.options.every((option) =>
      option.choices.some((choice) => choice.name === look[option.name]),
    )
  );
}

const HATS = fakeLineUp().options[0]!;

const hatShow = () => fakeScenario({ name: 'Hat Show', lineUp: fakeLineUp() });

/** Ticks `names`, moves on to the shows and clicks `scenario`, which has a line-up. */
async function openLineUp(names: readonly string[], scenario: FakeScenario) {
  storeTicked(names, ['Zoe']);
  renderApp({ scenarios: [scenario] });
  await moveOnToShows();
  await currentUser().click(showCard(scenario.name));
}

const tileList = () => screen.getByRole('list', { name: "Today's people" });
const tiles = () => within(tileList()).getAllByRole('button');
const tile = (name: string) => within(tileList()).getByRole('button', { name });
/** The panel beside the tiles, for whoever is chosen. */
const panel = (name: string) => screen.getByRole('region', { name });
const group = (name: string, label: string) =>
  within(panel(name)).getByRole('group', { name: label });
const startButton = () => screen.getByRole('button', { name: 'Start the hats' });

/** The look a drawing in `element` shows, read back from its `lookText`. */
const lookOf = (element: HTMLElement): ChosenLook =>
  Object.fromEntries(
    element
      .querySelector<HTMLElement>('[data-look]')!
      .dataset.look!.split(' ')
      .map((pair) => pair.split('=')),
  );

/** Each tile's look, by name. */
const tileLooks = () => new Map(tiles().map((each) => [each.textContent!, lookOf(each)]));

/** The pressed choices in one of the panel's options. */
const pressed = (name: string, label: string) =>
  within(group(name, label))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true');

/** A choice of `option` other than the one `look` has. */
const otherChoice = (option: string, look: ChosenLook) =>
  fakeLineUp()
    .options.find((each) => each.name === option)!
    .choices.find((choice) => choice.name !== look[option])!;

/** A size that is --target-min, or a size in rem that is at least as big. */
const bigEnough = (value: string) =>
  value === 'var(--target-min)' || (value.endsWith('rem') && parseFloat(value) * 16 >= 44);

const css = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/** For each problem in the feature: a broken line-up, and what the console says. */
const PROBLEMS: Record<string, { lineUp: Partial<LineUp>; why: string }> = {
  'no options': { lineUp: { options: [] }, why: 'its line-up has no options' },
  'an option with fewer than 2 choices': {
    lineUp: { options: [{ ...HATS, choices: HATS.choices.slice(0, 1) }] },
    why: 'its line-up option "hat" has fewer than 2 choices',
  },
  'two options with the same name': {
    lineUp: { options: [HATS, { ...HATS, label: 'Another hat' }] },
    why: 'its line-up has two options named "hat"',
  },
  'no way to draw a look': {
    lineUp: { draw: undefined as unknown as LineUp['draw'] },
    why: 'its line-up has no draw function',
  },
};

describeSpec(await loadFeature('./line-up.feature'), ({ Rule }) => {
  Rule('A show with a line-up opens it first', ({ RuleScenario }) => {
    RuleScenario(
      'Clicking a show with a line-up opens its Line-up',
      ({ Given, And, When, Then }) => {
        const scenario = hatShow();
        let names: string[] = [];
        Given('{any} are ticked', (_, ticked: string) => {
          names = quoted(ticked);
          storeTicked(names, ['Zoe']);
          renderApp({ scenarios: [scenario] });
        });
        And('I moved on to the shows', moveOnToShows);
        When('I click a show with a line-up', () => currentUser().click(showCard('Hat Show')));
        Then(
          "its Line-up shows a tile for each of {any}, in today's order, each drawn in their look",
          () => {
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Line up the hats');
            expect(tiles().map((each) => each.textContent)).toEqual(names);
            tiles().forEach((each, index) => {
              expect(fits(fakeLineUp(), lookOf(each))).toBe(true);
              const drawn = each.querySelector<HTMLElement>('[data-person]')!;
              expect(drawn.dataset.person).toBe(`${index + 1} ${names[index]}`);
            });
          },
        );
        And("the show hasn't started", () => {
          expect(scenario.runs).toHaveLength(0);
        });
      },
    );

    RuleScenario('A show without a line-up still starts at once', ({ Given, When, Then }) => {
      const plain = fakeScenario({ name: 'Plain Show' });
      Given('I moved on to the shows', async () => {
        storeTicked(['Anna', 'Ben']);
        renderApp({ scenarios: [hatShow(), plain] });
        await moveOnToShows();
      });
      When('I click a show without a line-up', () => currentUser().click(showCard('Plain Show')));
      Then('it starts', async () => {
        await waitFor(() => expect(plain.runs).toHaveLength(1));
      });
    });

    RuleScenario('The steps show the third step', ({ When, Then, And }) => {
      const steps = () =>
        within(screen.getByRole('list', { name: 'Steps' }))
          .getAllByRole('listitem')
          .map((step) => step.textContent);
      When("a show's Line-up is open", () => openLineUp(['Anna', 'Ben'], hatShow()));
      Then('the steps read {any}, the last one current', (_, labels: string) => {
        expect(steps()).toEqual(quoted(labels));
        expect(screen.getByText('3 · Line-up')).toHaveAttribute('aria-current', 'step');
      });
      And('on the other screens there are only the first two', async () => {
        await choose('Pick a show');
        expect(steps()).toEqual(["1 · Who's in", '2 · Pick a show']);
        await choose("Who's in");
        expect(steps()).toEqual(["1 · Who's in", '2 · Pick a show']);
      });
    });

    RuleScenario('Start has the focus', ({ When, Then }) => {
      const scenario = hatShow();
      When("a show's Line-up opens", () => openLineUp(['Anna', 'Ben', 'Carla'], scenario));
      Then(
        "its start button has the keyboard focus, so Enter starts the show with everyone's looks as they are",
        async () => {
          expect(startButton()).toHaveFocus();
          const shown = tileLooks();
          await currentUser().keyboard('{Enter}');
          await waitFor(() => expect(scenario.runs).toHaveLength(1));
          expect(new Map(scenario.runs[0]!.looks)).toEqual(shown);
        },
      );
    });

    RuleScenario("Starting plays the show with today's people", ({ Given, When, Then }) => {
      const scenario = hatShow();
      Given("{any} are ticked, on a show's Line-up", (_, ticked: string) =>
        openLineUp(quoted(ticked), scenario),
      );
      When('I press its start button', () => currentUser().click(startButton()));
      Then('the show starts with {any}', async (_, names: string) => {
        await waitFor(() => expect(scenario.runs).toHaveLength(1));
        expect(scenario.runs[0]!.names).toEqual(quoted(names));
      });
    });

    RuleScenario('Run again skips the Line-up', ({ Given, When, Then }) => {
      const scenario = hatShow();
      Given('the result of a show with a line-up is showing', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], scenario);
        await currentUser().click(startButton());
        await resultHeading();
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then("the show starts at once, with everyone's looks as they were", async () => {
        await waitFor(() => expect(scenario.runs).toHaveLength(2));
        expect(new Map(scenario.runs[1]!.looks)).toEqual(new Map(scenario.runs[0]!.looks));
      });
    });

    RuleScenario('Going back keeps the looks', ({ Given, When, Then }) => {
      const scenario = hatShow();
      let chosen: ChosenLook;
      Given("I changed Anna's look on a show's Line-up", async () => {
        await openLineUp(['Anna', 'Ben'], scenario);
        const before = lookOf(tile('Anna'));
        const hat = otherChoice('hat', before);
        await currentUser().click(
          within(group('Anna', 'Hat')).getByRole('button', { name: hat.label }),
        );
        chosen = { ...before, hat: hat.name };
      });
      When('I go back to the shows, then click that show again', async () => {
        await choose('Pick a show');
        await currentUser().click(showCard('Hat Show'));
      });
      Then('Anna has the look I chose', () => {
        expect(lookOf(tile('Anna'))).toEqual(chosen);
      });
    });
  });

  Rule('Changing a look', ({ RuleScenario }) => {
    RuleScenario('Choosing whose look to change', ({ Given, When, Then, And }) => {
      Given("a show's Line-up is open", () => openLineUp(['Anna', 'Ben', 'Carla'], hatShow()));
      When("I click Ben's tile", () => currentUser().click(tile('Ben')));
      Then("Ben's tile is marked as chosen, in sun, and pressed", () => {
        expect(tile('Ben')).toHaveAttribute('aria-pressed', 'true');
        expect(getComputedStyle(tile('Ben')).backgroundColor).toBe('var(--color-sun)');
        expect(tile('Anna')).toHaveAttribute('aria-pressed', 'false');
        expect(getComputedStyle(tile('Anna')).backgroundColor).toBe('var(--color-paper)');
      });
      And(
        "beside the tiles, Ben is drawn bigger, with his name and each of the show's options",
        () => {
          const beside = panel('Ben');
          expect(within(beside).getByRole('heading', { level: 2 })).toHaveTextContent('Ben');
          expect(lookOf(beside)).toEqual(lookOf(tile('Ben')));
          const box = (element: HTMLElement) =>
            getComputedStyle(element.querySelector('[data-look]')!.parentElement!);
          expect(parseFloat(box(beside).width)).toBeGreaterThan(
            parseFloat(box(tile('Ben')).maxWidth),
          );
          const options = within(beside)
            .getAllByRole('group')
            .map((each) => within(each).getByRole('heading').textContent);
          expect(options).toEqual(fakeLineUp().options.map((option) => option.label));
        },
      );
    });

    RuleScenario('The chosen one of each option is marked', ({ When, Then, And }) => {
      let look: ChosenLook;
      When("Ben's look is shown beside the tiles", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        await currentUser().click(tile('Ben'));
        look = lookOf(tile('Ben'));
      });
      Then(
        'each option is a row of choices, with the one he has marked by a check mark as well as by colour',
        () => {
          for (const option of fakeLineUp().options) {
            const mine = option.choices.find((choice) => choice.name === look[option.name])!;
            const on = pressed('Ben', option.label);
            expect(on).toHaveLength(1);
            expect(on[0]).toHaveAccessibleName(mine.label);
            for (const button of within(group('Ben', option.label)).getAllByRole('button')) {
              expect(button.querySelector('svg') !== null).toBe(button === on[0]);
            }
          }
          expect(getComputedStyle(pressed('Ben', 'Hat')[0]!).backgroundColor).toBe(
            'var(--color-sun)',
          );
        },
      );
      And(
        'a colour option shows its choices as round swatches, each named for screen readers',
        () => {
          const swatches = within(group('Ben', 'Colour')).getAllByRole('button');
          expect(swatches.map((swatch) => swatch.getAttribute('aria-label'))).toEqual([
            'Tomato',
            'Sun',
            'Mint',
            'Grape',
          ]);
          for (const swatch of swatches) {
            expect(swatch.textContent).toBe('');
            expect(getComputedStyle(swatch).borderRadius).toBe('var(--radius-pill)');
          }
          expect(swatches[1]!.style.getPropertyValue('--swatch')).toBe('var(--color-sun)');
        },
      );
    });

    RuleScenario('A choice changes the look at once', ({ Given, When, Then }) => {
      let chosen: ChosenLook;
      Given("Ben's look is shown beside the tiles", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        await currentUser().click(tile('Ben'));
      });
      When('I choose another choice of an option', async () => {
        const before = lookOf(tile('Ben'));
        const colour = otherChoice('colour', before);
        await currentUser().click(
          within(group('Ben', 'Colour')).getByRole('button', { name: colour.label }),
        );
        chosen = { ...before, colour: colour.name };
      });
      Then('Ben is drawn with it beside the tiles and on his tile', () => {
        expect(lookOf(panel('Ben'))).toEqual(chosen);
        expect(lookOf(tile('Ben'))).toEqual(chosen);
      });
    });

    RuleScenario('Surprise me', ({ Given, When, Then }) => {
      let before: ChosenLook;
      Given("Ben's look is shown beside the tiles", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        await currentUser().click(tile('Ben'));
        before = lookOf(tile('Ben'));
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then("Ben gets a look drawn at random from the show's choices", () => {
        const after = lookOf(tile('Ben'));
        expect(fits(fakeLineUp(), after)).toBe(true);
        expect(after).not.toEqual(before);
        expect(lookOf(panel('Ben'))).toEqual(after);
      });
    });

    RuleScenario('Shuffle everyone', ({ When, Then, And }) => {
      let before: Map<string, ChosenLook>;
      When('I choose {string}', async (_, label: string) => {
        await openLineUp(TEAM.slice(0, 8), hatShow());
        before = tileLooks();
        await choose(label);
      });
      Then("each of today's people gets a look drawn at random", () => {
        const after = tileLooks();
        expect([...after.keys()]).toEqual(TEAM.slice(0, 8));
        for (const look of after.values()) expect(fits(fakeLineUp(), look)).toBe(true);
        expect(after).not.toEqual(before);
      });
      And('the looks vary as much as the choices allow', () => {
        const looks = [...tileLooks().values()];
        for (const option of fakeLineUp().options) {
          const counts = option.choices.map(
            (choice) => looks.filter((look) => look[option.name] === choice.name).length,
          );
          expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        }
      });
    });

    RuleScenario('Readable over a screen share', ({ When, Then, And }) => {
      const long = 'Maria-Elena Ros';
      When(
        "a show's Line-up is open with {int} people, a 15-character name among them",
        (_, count: number) => openLineUp([...TEAM.slice(0, count - 1), long], hatShow()),
      );
      Then('every name is at least --size-body, wrapping inside its tile', () => {
        expect(long).toHaveLength(15);
        expect(tiles()).toHaveLength(8);
        for (const each of tiles()) {
          const name = within(each).getByText(each.textContent!);
          expect(getComputedStyle(name).fontSize).toBe('var(--size-body)');
          expect(getComputedStyle(name).overflowWrap).toBe('anywhere');
          expect(getComputedStyle(name).maxWidth).toBe('100%');
        }
      });
      And('every control is at least --target-min across, and shows the keyboard focus', () => {
        for (const button of within(screen.getByRole('main')).getAllByRole('button')) {
          const style = getComputedStyle(button);
          const label = button.getAttribute('aria-label') ?? button.textContent!;
          expect(bigEnough(style.minHeight) || bigEnough(style.height), label).toBe(true);
          if (!button.textContent) {
            expect(bigEnough(style.minWidth) || bigEnough(style.width), label).toBe(true);
          }
        }
        // The app's focus ring, which nothing on the Line-up takes away.
        expect(css('../src/styles/global.css')).toMatch(
          /:focus-visible \{\s*outline: var\(--focus\);/,
        );
        expect(css('../src/screens/LineUp.module.css')).not.toMatch(/outline/);
      });
    });
  });

  Rule('The show gets the looks', ({ RuleScenario }) => {
    RuleScenario("The show is handed everyone's look", ({ Given, When, Then, And }) => {
      const scenario = fakeScenario({ name: 'Hat Show', lineUp: fakeLineUp() });
      let looks: Map<string, ChosenLook>;
      Given("{any} are on a show's Line-up", (_, names: string) => {
        looks = new Map(
          quoted(names).map((name, index) => [
            name,
            { hat: index === 0 ? 'crown' : 'beanie', colour: index === 0 ? 'sun' : 'grape' },
          ]),
        );
      });
      When('I start the show', async () => {
        await runShow(scenario, { names: [...looks.keys()], unlucky: 'Ben', looks });
      });
      Then("the show is handed Anna's look and Ben's look, by name", () => {
        const handed = scenario.runs[0]!.looks;
        expect(handed.get('Anna')).toEqual({ hat: 'crown', colour: 'sun' });
        expect(handed.get('Ben')).toEqual({ hat: 'beanie', colour: 'grape' });
      });
      And("it can't change them", () => {
        const handed = scenario.runs[0]!.looks as Map<string, ChosenLook>;
        expect(handed).not.toBe(looks);
        expect(() => handed.set('Anna', { hat: 'cap', colour: 'mint' })).toThrow(TypeError);
        expect(() => handed.delete('Ben')).toThrow(TypeError);
        expect(() => {
          (handed.get('Anna') as Record<string, string>).hat = 'cap';
        }).toThrow(TypeError);
        expect(handed.get('Anna')).toEqual({ hat: 'crown', colour: 'sun' });
      });
    });

    RuleScenario('In the lab, looks are drawn at random', ({ When, Then }) => {
      const lineUp = fakeLineUp();
      const scenario = fakeScenario({ name: 'Hat Show', lineUp });

      /** Runs the show in the lab with `seed`, and gives the looks it was handed. */
      async function runInLab(seed: number) {
        const user = userEvent.setup();
        const { unmount } = render(createElement(Lab, { scenarios: [scenario] }));
        await user.clear(screen.getByRole('spinbutton', { name: 'Seed' }));
        await user.type(screen.getByRole('spinbutton', { name: 'Seed' }), String(seed));
        await user.click(screen.getByRole('button', { name: 'Run' }));
        await screen.findByText('Hat Show finished.');
        unmount();
        return scenario.runs.at(-1)!.looks;
      }

      let first: ReadonlyMap<string, ChosenLook>;
      When('I run a show with a line-up in the lab', async () => {
        first = await runInLab(7);
      });
      Then("each person gets a look drawn at random from the run's seed", async () => {
        expect([...first.keys()]).toEqual(scenario.runs[0]!.names);
        for (const look of first.values()) expect(fits(lineUp, look)).toBe(true);
        expect(await runInLab(7)).toEqual(first);
        const others = [await runInLab(8), await runInLab(9)];
        expect(
          others.some((looks) => JSON.stringify([...looks]) !== JSON.stringify([...first])),
        ).toBe(true);
      });
    });
  });

  Rule('A line-up is checked', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'A show whose line-up has <problem> is skipped',
      ({ Given, When, Then, And }, { problem }) => {
        const broken = PROBLEMS[problem]!;
        const scenario: FakeScenario = fakeScenario({
          name: 'Hat Show',
          lineUp: fakeLineUp(broken.lineUp),
        });
        let warn: ReturnType<typeof vi.spyOn>;
        Given('a scenario folder whose line-up has <problem>', () => {
          expect(validateScenario(scenario, 'hat-show')).toEqual([broken.why]);
        });
        When('the app starts', async () => {
          warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
          const scenarios = discoverScenarios(
            {
              '../scenarios/hat-show/index.ts': scenario,
              '../scenarios/fine/index.ts': fakeScenario({ name: 'Fine', lineUp: fakeLineUp() }),
            },
            { production: false },
          );
          storeTicked(['Anna', 'Ben']);
          renderApp({ scenarios });
          await moveOnToShows();
        });
        Then('that scenario is not listed', () => {
          expect(pickerNames()).toEqual(['Fine']);
        });
        And('the console says why', () => {
          expect(warn).toHaveBeenCalledExactlyOnceWith(
            `Skipped src/scenarios/hat-show/: ${broken.why}`,
          );
        });
      },
    );
  });
});
