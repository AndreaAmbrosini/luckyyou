import { loadFeature } from '@amiceli/vitest-cucumber';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { expect, vi } from 'vitest';
import { discoverScenarios, validateScenario } from '../src/catalogue/discover';
import { Lab } from '../src/lab/Lab';
import type { ChosenLook, LineUp, LineUpOption, LineUpTheme } from '../src/scenario-kit/contract';
import { runShow } from '../src/scenario-kit/testing';
import { looksKey, pinsKey, themeKey } from '../src/line-up/looks';
import {
  addName,
  blockStorage,
  choose,
  currentUser,
  fillStorage,
  moveOnToShows,
  pickerNames,
  quoted,
  reload,
  renderApp,
  resultHeading,
  showCard,
  storeTicked,
  TEAM,
} from './support/app';
import {
  fakeLineUp,
  fakeScenario,
  groupedLineUp,
  pictureLineUp,
  startLineUp,
  themedLineUp,
  type FakeScenario,
} from './support/fake-scenarios';
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

/** Two themes that suit Hat Show's hats. */
const THEMES_FOR_HATS: LineUpTheme[] = [
  { name: 'beach', label: 'Beach', suits: ['cap'], picture: () => document.createElement('i') },
  { name: 'snow', label: 'Snow', suits: ['beanie'], picture: () => document.createElement('i') },
];

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
/** The chosen one's look, under the tiles. */
const panel = (name: string) => screen.getByRole('region', { name });
const group = (name: string, label: string) =>
  within(panel(name)).getByRole('group', { name: label });
/** The text of the element an element's aria-labelledby names. */
const accessibleLabel = (element: Element) =>
  document.getElementById(element.getAttribute('aria-labelledby')!)!.textContent;
/** Hat Show with each hat drawn as the person in it. */
const drawnHats = () => {
  const [hat, colour] = fakeLineUp().options as [LineUpOption, LineUpOption];
  return fakeLineUp({ options: [{ ...hat, drawn: true }, colour] });
};
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

/** Hat Show, drawing its start. */
const startShow = () => fakeScenario({ name: 'Hat Show', lineUp: startLineUp() });
const startRegion = () => screen.getByRole('region', { name: 'The start' });
/** The scene the show drew. */
const drawnStart = () => startRegion().querySelector<HTMLElement>('[data-part="fake-start"]')!;
const places = () => screen.getByRole('list', { name: "Today's people" });
/** Where `name` stands, which chooses them. */
const standingAt = (name: string) => within(places()).getByRole('button', { name });
const die = (name: string) => screen.getByRole('button', { name: `A new look for ${name}` });
const pin = (name: string) => screen.getByRole('button', { name: `Pin ${name}` });
/** `name` as the show drew them at its start. */
const drawingOf = (name: string) =>
  drawnStart().querySelector<HTMLElement>(`[data-person$=" ${name}"]`)!;
/** Each look drawn at the start, by name. */
const startLooks = () =>
  new Map(
    [...drawnStart().querySelectorAll<HTMLElement>('[data-person]')].map((drawn) => [
      drawn.dataset.person!.split(' ').slice(1).join(' '),
      readLook(drawn),
    ]),
  );
const readLook = (drawn: HTMLElement): ChosenLook =>
  Object.fromEntries(drawn.dataset.look!.split(' ').map((pair) => pair.split('=')));
const sameLook = (one: ChosenLook, two: ChosenLook) =>
  Object.keys(one).every((option) => one[option] === two[option]);
const pinBen = () => localStorage.setItem(pinsKey('hat-show'), JSON.stringify(['Ben']));

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
  'a choice in a group without a label': {
    lineUp: {
      options: [{ ...HATS, choices: HATS.choices.map((choice) => ({ ...choice, group: ' ' })) }],
    },
    why: 'its line-up option "hat" has a group without a label',
  },
  'a picture for only some choices': {
    lineUp: {
      options: [
        {
          ...HATS,
          choices: HATS.choices.map((choice, index) =>
            index === 0 ? { ...choice, picture: () => document.createElement('i') } : choice,
          ),
        },
      ],
    },
    why: 'its line-up option "hat" has a picture for only some choices',
  },
  'fewer than 2 themes': {
    lineUp: { themes: THEMES_FOR_HATS.slice(0, 1) },
    why: 'its line-up has fewer than 2 themes',
  },
  'two themes with the same name': {
    lineUp: { themes: [THEMES_FOR_HATS[0]!, { ...THEMES_FOR_HATS[1]!, name: 'beach' }] },
    why: 'its line-up has two themes named "beach"',
  },
  'a theme without a picture': {
    lineUp: {
      themes: [{ ...THEMES_FOR_HATS[0]!, picture: undefined as never }, THEMES_FOR_HATS[1]!],
    },
    why: 'its line-up theme "beach" has no picture',
  },
  "a theme suiting a choice its option doesn't offer": {
    lineUp: { themes: [{ ...THEMES_FOR_HATS[0]!, suits: ['cap', 'helmet'] }, THEMES_FOR_HATS[1]!] },
    why: `its line-up theme "beach" suits a choice its first option doesn't offer`,
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
    RuleScenario(
      "Today's people in a row, the chosen one under it",
      ({ Given, When, Then, And }) => {
        const team = TEAM.slice(0, 8);
        Given("a show's Line-up is open with {int} people", (_, count: number) =>
          openLineUp(team.slice(0, count), fakeScenario({ name: 'Hat Show', lineUp: drawnHats() })),
        );
        When("I click Ben's tile", () => currentUser().click(tile('Ben')));
        Then(
          "today's people sit in one row of tiles, in today's order, Ben's marked as chosen, in sun, and pressed",
          () => {
            expect(team).toContain('Ben');
            expect(tiles().map((each) => each.textContent)).toEqual(team);
            expect(getComputedStyle(tileList()).gridAutoFlow).toBe('column');
            for (const each of tiles()) {
              const ben = each === tile('Ben');
              expect(each).toHaveAttribute('aria-pressed', String(ben));
              expect(getComputedStyle(each).backgroundColor).toBe(
                ben ? 'var(--color-sun)' : 'var(--color-paper)',
              );
            }
          },
        );
        And(
          "under the row, Ben is drawn bigger with his name, {string} and the show's options",
          () => {
            const look = panel('Ben');
            expect(tileList().compareDocumentPosition(look)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            expect(within(look).getByRole('heading', { level: 2 })).toHaveTextContent('Ben');
            const box = (element: Element) => getComputedStyle(element.parentElement!);
            const big = within(look)
              .getByRole('heading', { level: 2 })
              .closest('div')!.parentElement!;
            expect(lookOf(big)).toEqual(lookOf(tile('Ben')));
            expect(parseFloat(box(big.querySelector('[data-look]')!).width)).toBeGreaterThan(
              parseFloat(box(tile('Ben').querySelector('[data-look]')!).maxWidth),
            );
            expect(within(look).getByRole('button', { name: 'Surprise me' })).toBeInTheDocument();
            expect(
              within(look)
                .getAllByRole('group')
                .map((each) => accessibleLabel(each)),
            ).toEqual(fakeLineUp().options.map((option) => option.label));
          },
        );
        And('an option that shows him in each choice has a sheet of its own beside him', () => {
          const card = within(panel('Ben')).getByRole('heading', { level: 2 }).closest('div')!
            .parentElement!.parentElement!;
          expect(card).toContainElement(group('Ben', 'Colour'));
          expect(card).not.toContainElement(group('Ben', 'Hat'));
          expect(getComputedStyle(group('Ben', 'Hat')).borderRadius).toBe('var(--radius-card)');
        });
      },
    );

    RuleScenario('The chosen one of each option is marked and named', ({ When, Then, And }) => {
      const lineUp = drawnHats();
      let look: ChosenLook;
      When("Ben's look is shown", async () => {
        await openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp }));
        await currentUser().click(tile('Ben'));
        look = lookOf(tile('Ben'));
      });
      Then(
        'in each option, the choice he has is marked by a check mark as well as by colour',
        () => {
          for (const option of lineUp.options) {
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
      And("each option's heading names his choice, as in {string}", () => {
        for (const option of lineUp.options) {
          const mine = option.choices.find((choice) => choice.name === look[option.name])!;
          expect(
            within(group('Ben', option.label)).getByRole('heading', { level: 3 }),
          ).toHaveTextContent(`${option.label}: ${mine.label}`);
        }
      });
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
      Given("Ben's look is shown", async () => {
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
      Then('Ben is drawn with it, bigger and on his tile', () => {
        expect(lookOf(panel('Ben'))).toEqual(chosen);
        expect(lookOf(tile('Ben'))).toEqual(chosen);
      });
    });

    RuleScenario('Surprise me', ({ Given, When, Then }) => {
      let before: ChosenLook;
      Given("Ben's look is shown", async () => {
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

    RuleScenario("An option's groups are tabs", ({ Given, When, Then, And }) => {
      const hat = groupedLineUp().options[0]!;
      const tabs = () => within(group('Ben', 'Hat')).getAllByRole('tab');
      const shownChoices = () =>
        within(within(group('Ben', 'Hat')).getByRole('tabpanel'))
          .getAllByRole('button')
          .map((button) => button.textContent);
      const labelsIn = (label: string) =>
        hat.choices.filter((choice) => choice.group === label).map((choice) => choice.label);
      let mine: (typeof hat.choices)[number];
      Given('a show whose first option has choices in two groups', () =>
        openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp: groupedLineUp() })),
      );
      When("Ben's look is shown", async () => {
        await currentUser().click(tile('Ben'));
        mine = hat.choices.find((choice) => choice.name === lookOf(tile('Ben')).hat)!;
      });
      Then(
        'that option has one tab per group, named for the group, in the order their first choices come',
        () => {
          expect(within(group('Ben', 'Hat')).getByRole('tablist')).toBeInTheDocument();
          expect(tabs().map((tab) => tab.textContent)).toEqual(['Hats', 'Helmets']);
        },
      );
      And("it opens on the tab holding Ben's choice, showing only that group's choices", () => {
        const open = tabs().filter((tab) => tab.getAttribute('aria-selected') === 'true');
        expect(open.map((tab) => tab.textContent)).toEqual([mine.group]);
        expect(getComputedStyle(open[0]!).backgroundColor).toBe('var(--color-sun)');
        expect(shownChoices()).toEqual(
          labelsIn(mine.group!).map((label) => expect.stringContaining(label)),
        );
      });
      And("choosing the other tab shows its choices and leaves Ben's look as it was", async () => {
        const before = lookOf(tile('Ben'));
        const other = tabs().find((tab) => tab.textContent !== mine.group)!;
        await currentUser().click(other);
        expect(other).toHaveAttribute('aria-selected', 'true');
        expect(shownChoices()).toEqual(labelsIn(other.textContent!));
        expect(lookOf(tile('Ben'))).toEqual(before);
        // The arrow keys move along the tabs, too.
        await currentUser().keyboard('{ArrowLeft}');
        expect(tabs().find((tab) => tab.textContent === mine.group)).toHaveFocus();
        expect(shownChoices()).toEqual(
          labelsIn(mine.group!).map((label) => expect.stringContaining(label)),
        );
      });
      And(
        "it is still one option: one choice marked, and the choices read out under the option's label",
        () => {
          const option = group('Ben', 'Hat');
          expect(within(option).queryAllByRole('group')).toHaveLength(0);
          expect(pressed('Ben', 'Hat')).toHaveLength(1);
          expect(pressed('Ben', 'Hat')[0]).toHaveAccessibleName(mine.label);
        },
      );
    });

    RuleScenario('Choices can be pictures', ({ Given, When, Then, And }) => {
      const [hat, colour] = pictureLineUp().options as [LineUpOption, LineUpOption];
      const buttons = (label: string) => within(group('Ben', label)).getAllByRole('button');
      Given(
        'a show whose first option shows its choices as Ben in each, and whose second gives each choice a picture',
        () =>
          openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp: pictureLineUp() })),
      );
      When("Ben's look is shown", () => currentUser().click(tile('Ben')));
      Then(
        'each choice of the first option is Ben drawn with that choice and the rest of his look, its label under it',
        () => {
          const look = lookOf(tile('Ben'));
          expect(buttons('Hat')).toHaveLength(hat.choices.length);
          buttons('Hat').forEach((button, index) => {
            const choice = hat.choices[index]!;
            expect(lookOf(button)).toEqual({ ...look, hat: choice.name });
            expect(button.querySelector<HTMLElement>('[data-person]')!.dataset.person).toBe(
              '2 Ben',
            );
            expect(button).toHaveTextContent(choice.label);
          });
        },
      );
      And(
        'each choice of the second shows its picture, its label read out for screen readers and shown when hovered',
        () => {
          buttons('Colour').forEach((button, index) => {
            const choice = colour.choices[index]!;
            expect(button.querySelector<HTMLElement>('[data-picture]')!.dataset.picture).toBe(
              choice.name,
            );
            expect(button).toHaveAccessibleName(choice.label);
            expect(button).toHaveAttribute('title', choice.label);
          });
        },
      );
      And("choosing a choice redraws the first option's pictures in Ben's new look", async () => {
        const before = lookOf(tile('Ben'));
        const other = colour.choices.find((choice) => choice.name !== before.colour)!;
        await currentUser().click(
          within(group('Ben', 'Colour')).getByRole('button', { name: other.label }),
        );
        for (const button of buttons('Hat')) expect(lookOf(button).colour).toBe(other.name);
      });
    });

    RuleScenario('Surprise me draws from every group', ({ Given, When, Then }) => {
      const hat = groupedLineUp().options[0]!;
      const groups = new Set<string | undefined>();
      Given('a show whose first option has choices in two groups', () =>
        openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp: groupedLineUp() })),
      );
      When('I choose {string} for Ben, again and again', async (_, label: string) => {
        await currentUser().click(tile('Ben'));
        for (let time = 0; time < 30; time++) {
          await choose(label);
          const chosen = lookOf(tile('Ben')).hat;
          groups.add(hat.choices.find((choice) => choice.name === chosen)!.group);
        }
      });
      Then('choices from both groups come up', () => {
        expect(groups).toEqual(new Set(['Hats', 'Helmets']));
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

  Rule('A show can offer themes', ({ RuleScenario }) => {
    const themedShow = () => fakeScenario({ name: 'Hat Show', lineUp: themedLineUp() });
    const THEMES = themedLineUp().themes!;
    const postcardRow = () => screen.getByRole('group', { name: 'Theme' });
    const postcards = () => within(postcardRow()).getAllByRole('button');
    const postcard = (label: string) => within(postcardRow()).getByRole('button', { name: label });
    const chosenCards = () =>
      postcards().filter((card) => card.getAttribute('aria-pressed') === 'true');
    /** The theme a postcard's picture shows, or null for Surprise's own. */
    const pictured = (card: HTMLElement) =>
      card.querySelector<HTMLElement>('[data-picture]')?.dataset.picture ?? null;
    const markOn = (card: HTMLElement) =>
      card.querySelector<HTMLElement>('[data-mark]')?.dataset.mark ?? null;
    const tabNames = () =>
      within(group('Ben', 'Hat'))
        .getAllByRole('tab')
        .map((tab) => tab.textContent);
    const shownChoices = () =>
      within(within(group('Ben', 'Hat')).getByRole('tabpanel'))
        .getAllByRole('button')
        .map((button) => button.textContent);
    const labelsOf = (names: readonly string[]) =>
      names.map(
        (name) => themedLineUp().options[0]!.choices.find((choice) => choice.name === name)!.label,
      );

    /** Opens Hat Show's Line-up again after going back to the shows. */
    async function goBackAndReopen() {
      await choose('Pick a show');
      await currentUser().click(showCard('Hat Show'));
    }

    RuleScenario('Themes as postcards, "Surprise" first', ({ Given, When, Then, And }) => {
      Given('a show whose line-up offers themes', () => {
        localStorage.setItem(themeKey('hat-show'), JSON.stringify('snow'));
      });
      When('its Line-up opens', () => openLineUp(['Anna', 'Ben'], themedShow()));
      Then(
        `a row of postcards sits above today's people: "Surprise", then each theme as a picture over its name`,
        () => {
          expect(postcards().map((card) => card.textContent)).toEqual([
            'Surprise',
            ...THEMES.map((theme) => theme.label),
          ]);
          expect(
            postcardRow().compareDocumentPosition(tileList()) & Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
          postcards()
            .slice(1)
            .forEach((card, index) => {
              expect(pictured(card)).toBe(THEMES[index]!.name);
              const [picture, name] = [...card.children];
              expect(picture).toContainElement(card.querySelector('[data-picture]'));
              expect(name).toHaveTextContent(THEMES[index]!.label);
            });
        },
      );
      And('the chosen one is marked by a check mark as well as by colour', () => {
        expect(chosenCards()).toEqual([postcard('Snow')]);
        expect(markOn(postcard('Snow'))).toBe('check');
        expect(getComputedStyle(postcard('Snow')).backgroundColor).toBe('var(--color-sun)');
        for (const card of postcards().filter((each) => each !== postcard('Snow'))) {
          expect(markOn(card)).toBeNull();
          expect(getComputedStyle(card).backgroundColor).toBe('var(--color-paper)');
        }
      });
    });

    RuleScenario('Surprise draws a theme at once', ({ Given, When, Then, And }) => {
      Given("a show's Line-up with themes is open", async () => {
        localStorage.setItem(themeKey('hat-show'), JSON.stringify('snow'));
        await openLineUp(['Anna', 'Ben'], themedShow());
      });
      When('I choose {string}', (_, label: string) => currentUser().click(postcard(label)));
      Then(
        'a theme other than the one showing is drawn at random, and the Line-up shows it at once',
        () => {
          const drawn = pictured(postcard('Surprise'));
          expect(THEMES.map((theme) => theme.name)).toContain(drawn);
          expect(drawn).not.toBe('snow');
        },
      );
      And(`"Surprise" is marked as chosen with a die, showing the drawn theme's picture`, () => {
        expect(chosenCards()).toEqual([postcard('Surprise')]);
        expect(markOn(postcard('Surprise'))).toBe('die');
        expect(getComputedStyle(postcard('Surprise')).backgroundColor).toBe('var(--color-sun)');
      });
      And('choosing "Surprise" again draws another', async () => {
        for (let turn = 0; turn < 5; turn++) {
          const before = pictured(postcard('Surprise'));
          await currentUser().click(postcard('Surprise'));
          expect(pictured(postcard('Surprise'))).not.toBe(before);
          expect(chosenCards()).toEqual([postcard('Surprise')]);
        }
      });
    });

    RuleScenario('Choosing a theme', ({ Given, When, Then }) => {
      Given("a show's Line-up with themes is open", () =>
        openLineUp(['Anna', 'Ben'], themedShow()),
      );
      When("I choose a theme's postcard", () => currentUser().click(postcard('Beach')));
      Then('that theme is chosen, and "Surprise" isn\'t', () => {
        expect(chosenCards()).toEqual([postcard('Beach')]);
        expect(markOn(postcard('Surprise'))).toBeNull();
        expect(pictured(postcard('Surprise'))).toBeNull();
      });
    });

    RuleScenario('The theme is kept', ({ Given, When, Then }) => {
      Given("I chose a theme on a show's Line-up", async () => {
        await openLineUp(['Anna', 'Ben'], themedShow());
        await currentUser().click(postcard('Party'));
      });
      When("I reload the page and open that show's Line-up again", async () => {
        reload();
        await moveOnToShows();
        await currentUser().click(showCard('Hat Show'));
      });
      Then('the same theme is chosen', () => {
        expect(chosenCards()).toEqual([postcard('Party')]);
      });
    });

    RuleScenario('A kept Surprise draws afresh', ({ Given, When, Then }) => {
      const drawn = new Set<string | null>();
      Given(`I left a show's Line-up on "Surprise"`, async () => {
        await openLineUp(['Anna', 'Ben'], themedShow());
        await currentUser().click(postcard('Beach'));
        await currentUser().click(postcard('Surprise'));
      });
      When("I open that show's Line-up again", async () => {
        for (let turn = 0; turn < 12; turn++) {
          await goBackAndReopen();
          expect(chosenCards()).toEqual([postcard('Surprise')]);
          drawn.add(pictured(postcard('Surprise')));
        }
      });
      Then('"Surprise" is chosen, with a theme drawn afresh', () => {
        expect(markOn(postcard('Surprise'))).toBe('die');
        for (const theme of drawn) expect(THEMES.map((each) => each.name)).toContain(theme);
        expect(drawn.size).toBeGreaterThan(1);
      });
    });

    RuleScenario("The first time, it's Surprise", ({ Given, When, Then }) => {
      /** Opens the Line-up with `stored` kept as its theme, or nothing kept. */
      async function openWith(stored?: string) {
        cleanup();
        localStorage.clear();
        if (stored) localStorage.setItem(themeKey('hat-show'), JSON.stringify(stored));
        await openLineUp(['Anna', 'Ben'], themedShow());
        return {
          chosen: chosenCards(),
          mark: markOn(postcard('Surprise')),
          drawn: pictured(postcard('Surprise')),
        };
      }
      let first: Awaited<ReturnType<typeof openWith>>;
      let gone: Awaited<ReturnType<typeof openWith>>;
      Given(
        'no theme was ever chosen for a show in this browser, or the one kept is no longer offered',
        () => undefined,
      );
      When('its Line-up opens', async () => {
        first = await openWith();
        gone = await openWith('volcano');
      });
      Then('"Surprise" is chosen, with a theme drawn', () => {
        for (const opened of [first, gone]) {
          expect(opened.chosen.map((card) => card.textContent)).toEqual(['Surprise']);
          expect(opened.mark).toBe('die');
          expect(THEMES.map((theme) => theme.name)).toContain(opened.drawn);
        }
      });
    });

    RuleScenario('Each look is drawn in the theme', ({ Given, When, Then }) => {
      Given('a show whose line-up offers themes', () => openLineUp(['Anna', 'Ben'], themedShow()));
      When('a theme is chosen', () => currentUser().click(postcard('Beach')));
      Then('the show draws every look in it, so it can dress everyone for it', () => {
        const drawn = [...document.querySelectorAll<HTMLElement>('[data-look]')];
        expect(drawn.length).toBeGreaterThan(2);
        for (const each of drawn) expect(each.dataset.theme).toBe('beach');
      });
    });

    RuleScenario("A theme's own tab", ({ Given, When, Then, And }) => {
      Given("a show whose themes each suit some of its first option's choices", () =>
        openLineUp(['Anna', 'Ben'], themedShow()),
      );
      When("a theme is chosen and Ben's look is shown", async () => {
        await currentUser().click(postcard('Beach'));
        await currentUser().click(tile('Ben'));
      });
      Then(
        "the option's first tab is named for the theme, marked with a star, and holds the choices that suit it",
        async () => {
          const [first] = within(group('Ben', 'Hat')).getAllByRole('tab');
          expect(tabNames()).toEqual(['Beach', 'Hats', 'Helmets']);
          expect(first!.querySelector('svg')).not.toBeNull();
          expect(first).toHaveAccessibleName('Beach');
          await currentUser().click(first!);
          expect(shownChoices()).toEqual(labelsOf(['crown', 'bike']));
        },
      );
      And("each of those choices is still in its own group's tab", async () => {
        const tab = (name: string) => within(group('Ben', 'Hat')).getByRole('tab', { name });
        await currentUser().click(tab('Hats'));
        expect(shownChoices()).toContain('Crown');
        await currentUser().click(tab('Helmets'));
        expect(shownChoices()).toContain('Bike helmet');
      });
      And('with a theme that no choice suits, there is no such tab', async () => {
        await currentUser().click(postcard('Party'));
        expect(tabNames()).toEqual(['Hats', 'Helmets']);
      });
    });

    RuleScenario('The show is handed the theme', ({ Given, When, Then, And }) => {
      const scenario = themedShow();
      const shown: string[] = [];
      Given('a theme is chosen, by hand or by "Surprise"', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], scenario);
        await currentUser().click(postcard('Snow'));
        shown.push('snow');
      });
      When('I start the show', async () => {
        await currentUser().click(startButton());
        await resultHeading();
        // And once more, on what "Surprise" drew.
        await choose("Change who's in");
        await moveOnToShows();
        await currentUser().click(showCard('Hat Show'));
        await currentUser().click(postcard('Surprise'));
        shown.push(pictured(postcard('Surprise'))!);
        await currentUser().click(startButton());
        await resultHeading();
      });
      Then("the show is handed that theme, and can't change it", () => {
        expect(scenario.runs.map((run) => run.theme)).toEqual(shown);
        const { show } = scenario.runs[1]!;
        expect(() => {
          (show as { theme: string | null }).theme = 'party';
        }).toThrow(TypeError);
        expect(show.theme).toBe(shown[1]);
      });
      And('"Run again" runs it with the same theme', async () => {
        await choose('Run again');
        await waitFor(() => expect(scenario.runs).toHaveLength(3));
        expect(scenario.runs[2]!.theme).toBe(shown[1]);
      });
    });

    RuleScenario(
      'In the lab, the theme is drawn from the seed, unless I choose one',
      ({ When, Then, And }) => {
        const scenario = themedShow();

        /** Runs the show in the lab with `seed`, on `theme` if given, and gives the theme it was handed. */
        async function runInLab(seed: number, theme?: string) {
          const user = userEvent.setup();
          const { unmount } = render(createElement(Lab, { scenarios: [scenario] }));
          await user.clear(screen.getByRole('spinbutton', { name: 'Seed' }));
          await user.type(screen.getByRole('spinbutton', { name: 'Seed' }), String(seed));
          if (theme) {
            await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), theme);
          }
          await user.click(screen.getByRole('button', { name: 'Run' }));
          await screen.findByText('Hat Show finished.');
          unmount();
          return scenario.runs.at(-1)!.theme;
        }

        let first: string | null;
        When('I run a show with themes in the lab', async () => {
          first = await runInLab(7);
        });
        Then("its theme is drawn from the run's seed", async () => {
          expect(THEMES.map((theme) => theme.name)).toContain(first);
          expect(await runInLab(7)).toBe(first);
          const others = [];
          for (let seed = 8; seed < 14; seed++) others.push(await runInLab(seed));
          expect(others.some((theme) => theme !== first)).toBe(true);
        });
        And('when I choose a theme in the lab, it runs on that one', async () => {
          const other = THEMES.find((theme) => theme.name !== first)!;
          expect(await runInLab(7, other.label)).toBe(other.name);
        });
      },
    );
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

  Rule('A show can draw its start', ({ RuleScenario }) => {
    RuleScenario("The Line-up shows the show's start", ({ Given, When, Then, And }) => {
      const team = TEAM.slice(0, 8);
      Given('a show whose line-up draws its start, with {int} people', () => {
        localStorage.setItem(themeKey('hat-show'), JSON.stringify('snow'));
      });
      When('its Line-up opens', () => openLineUp(team, startShow()));
      Then(
        "the show's start, drawn in the chosen theme, takes the place of the row of tiles, with everyone in their look, in today's order",
        () => {
          expect(drawnStart().dataset.theme).toBe('snow');
          const standing = [...drawnStart().querySelectorAll<HTMLElement>('[data-person]')];
          expect(standing.map((each) => each.dataset.person)).toEqual(
            team.map((name, index) => `${index + 1} ${name}`),
          );
          for (const look of startLooks().values()) expect(fits(startLineUp(), look)).toBe(true);
          // Nobody is drawn anywhere else: there are no tiles.
          expect(document.querySelectorAll('[data-person]')).toHaveLength(team.length);
          for (const name of team) expect(startRegion()).toContainElement(standingAt(name));
        },
      );
      And('beside each person are a die and a pin', () => {
        for (const name of team) {
          const left = (button: HTMLElement) => parseFloat(button.style.left);
          expect(left(die(name))).toBeLessThan(left(pin(name)));
          expect(left(pin(name))).toBeLessThan(left(standingAt(name)));
          expect(pin(name)).toHaveAttribute('aria-pressed', 'false');
        }
      });
      And(
        `the chosen person's look is in a panel over the start, with their name, their pin, "Surprise me" and the show's options`,
        () => {
          const look = panel('Anna');
          expect(startRegion()).toContainElement(look);
          expect(within(look).getByRole('heading', { level: 2 })).toHaveTextContent('Anna');
          expect(within(look).getByRole('button', { name: 'Pin' })).toHaveAttribute(
            'aria-pressed',
            'false',
          );
          expect(within(look).getByRole('button', { name: 'Surprise me' })).toBeInTheDocument();
          expect(group('Anna', 'Hat')).toBeInTheDocument();
          expect(group('Anna', 'Colour')).toBeInTheDocument();
        },
      );
    });

    RuleScenario('Choosing someone where they stand', ({ When, Then }) => {
      When('I click Ben where he stands', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        await currentUser().click(standingAt('Ben'));
      });
      Then('Ben is marked as chosen, in sun, and pressed, and his look is in the panel', () => {
        expect(standingAt('Ben')).toHaveAttribute('aria-pressed', 'true');
        for (const other of ['Anna', 'Carla']) {
          expect(standingAt(other)).toHaveAttribute('aria-pressed', 'false');
        }
        // The show draws who is chosen, in sun: the-race.feature.
        const chosen = drawnStart().querySelectorAll<HTMLElement>('[data-chosen]');
        expect([...chosen].map((each) => each.dataset.person)).toEqual(['2 Ben']);
        expect(within(panel('Ben')).getByRole('heading', { level: 2 })).toHaveTextContent('Ben');
      });
    });

    RuleScenario('Another theme redraws the start', ({ When, Then }) => {
      let before: Map<string, ChosenLook>;
      When('I choose another theme', async () => {
        localStorage.setItem(themeKey('hat-show'), JSON.stringify('snow'));
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        before = startLooks();
        await currentUser().click(
          within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', {
            name: 'Beach',
          }),
        );
      });
      Then('the start is drawn in it at once, everyone in their look', () => {
        expect(drawnStart().dataset.theme).toBe('beach');
        expect(startLooks()).toEqual(before);
      });
    });
  });

  Rule('Pinned looks stay', ({ RuleScenario }) => {
    /** The pin's look: pressed, its fill and its outline. */
    const pinLook = (button: HTMLElement) => ({
      pressed: button.getAttribute('aria-pressed'),
      fill: getComputedStyle(button).backgroundColor,
      outline: getComputedStyle(button).borderStyle,
    });
    const panelPin = (name: string) => within(panel(name)).getByRole('button', { name: /^Pin/ });

    RuleScenario('Choosing by hand pins a look', ({ Given, When, Then }) => {
      Given("Ben's look is shown and isn't pinned", async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        await currentUser().click(standingAt('Ben'));
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'false');
      });
      When('I choose any of his choices', async () => {
        const colours = within(group('Ben', 'Colour')).getAllByRole('button');
        await currentUser().click(
          colours.find((button) => button.getAttribute('aria-pressed') === 'false')!,
        );
      });
      Then('Ben is pinned: his pin is pressed, in sun with a solid outline', () => {
        for (const button of [pin('Ben'), panelPin('Ben')]) {
          expect(pinLook(button)).toEqual({
            pressed: 'true',
            fill: 'var(--color-sun)',
            outline: 'solid',
          });
        }
        expect(panelPin('Ben')).toHaveTextContent('Pinned');
        expect(pin('Anna')).toHaveAttribute('aria-pressed', 'false');
      });
    });

    RuleScenario('A pin can be taken off', ({ Given, When, Then }) => {
      Given('Ben is pinned', () => pinBen());
      When('I press his pin', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'true');
        await currentUser().click(pin('Ben'));
      });
      Then("he isn't pinned: his pin is white with a dashed outline", () => {
        expect(pinLook(pin('Ben'))).toEqual({
          pressed: 'false',
          fill: 'var(--color-paper)',
          outline: 'dashed',
        });
      });
    });

    RuleScenario('Shuffle everyone leaves pinned looks alone', ({ Given, When, Then, And }) => {
      const team = TEAM.slice(0, 8);
      let before: Map<string, ChosenLook>;
      Given('Anna and Ben are pinned', async () => {
        localStorage.setItem(pinsKey('hat-show'), JSON.stringify(['Anna', 'Ben']));
        await openLineUp(team, startShow());
        before = startLooks();
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then('everyone else gets a look drawn at random, and Anna and Ben keep theirs', () => {
        const after = startLooks();
        expect(after.get('Anna')).toEqual(before.get('Anna'));
        expect(after.get('Ben')).toEqual(before.get('Ben'));
        const others = team.slice(2);
        for (const name of others) expect(fits(startLineUp(), after.get(name))).toBe(true);
        expect(others.some((name) => !sameLook(after.get(name)!, before.get(name)!))).toBe(true);
        expect(pin('Anna')).toHaveAttribute('aria-pressed', 'true');
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'true');
      });
      And('beside the button, a note says how many pinned looks stay', () => {
        const shuffle = screen.getByRole('button', { name: 'Shuffle everyone' });
        expect(shuffle.nextElementSibling).toHaveTextContent('Pinned looks stay as they are (2).');
      });
    });

    RuleScenario('A die deals one look', ({ Given, When, Then }) => {
      const dealt: { before: ChosenLook; after: ChosenLook; pinned: string | null }[] = [];
      Given('Ben is pinned', () => pinBen());
      When(`I press the die beside Ben, or "Surprise me" in his panel`, async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        for (const press of [
          () => die('Ben'),
          () => within(panel('Ben')).getByRole('button', { name: 'Surprise me' }),
        ]) {
          await currentUser().click(standingAt('Ben'));
          if (pin('Ben').getAttribute('aria-pressed') === 'false') {
            await currentUser().click(pin('Ben'));
          }
          for (let turn = 0; turn < 5; turn++) {
            const before = startLooks().get('Ben')!;
            await currentUser().click(press());
            dealt.push({
              before,
              after: startLooks().get('Ben')!,
              pinned: pin('Ben').getAttribute('aria-pressed'),
            });
            await currentUser().click(pin('Ben'));
          }
        }
      });
      Then("Ben gets a look drawn at random, unlike the one he had, and isn't pinned", () => {
        expect(dealt).toHaveLength(10);
        for (const { before, after, pinned } of dealt) {
          expect(fits(startLineUp(), after)).toBe(true);
          expect(sameLook(after, before)).toBe(false);
          expect(pinned).toBe('false');
        }
      });
    });

    RuleScenario('Pins are kept', ({ Given, When, Then }) => {
      Given('Ben is pinned', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], startShow());
        await currentUser().click(pin('Ben'));
      });
      When("I reload the page and open that show's Line-up again", async () => {
        reload();
        await moveOnToShows();
        await currentUser().click(showCard('Hat Show'));
      });
      Then('Ben is still pinned', () => {
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'true');
        expect(pin('Anna')).toHaveAttribute('aria-pressed', 'false');
      });
    });

    RuleScenario('New looks flip in', ({ When, Then, And }) => {
      const team = TEAM.slice(0, 8);
      When('"Shuffle everyone" deals new looks', async () => {
        localStorage.setItem(pinsKey('hat-show'), JSON.stringify(['Ben']));
        await openLineUp(team, startShow());
        await choose('Shuffle everyone');
      });
      Then(
        'each one flips in like a turned sticker, in 0.4 seconds or more, one after another from the first person down',
        () => {
          const flipping = team.filter((name) => name !== 'Ben').map(drawingOf);
          for (const drawn of flipping) {
            expect(parseFloat(getComputedStyle(drawn).animationDuration)).toBeGreaterThanOrEqual(
              0.4,
            );
            expect(getComputedStyle(drawn).transformOrigin).toBe('50% 100%');
          }
          const delays = flipping.map((drawn) => parseFloat(drawn.style.animationDelay));
          expect(delays[0]).toBe(0);
          delays.slice(1).forEach((delay, index) => expect(delay).toBeGreaterThan(delays[index]!));
          // Ben's look is pinned: it wasn't dealt, so it doesn't flip.
          expect(drawingOf('Ben').getAttribute('class')).toBeNull();
        },
      );
      And('with reduced motion, the looks change without flipping', async () => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }));
        const before = startLooks();
        await choose('Shuffle everyone');
        expect(startLooks()).not.toEqual(before);
        for (const name of team) expect(drawingOf(name).getAttribute('class')).toBeNull();
      });
    });
  });

  Rule('Everyone keeps their look', ({ RuleScenario, RuleScenarioOutline }) => {
    /** Changes Anna's hat on the open Line-up, and gives her new look. */
    async function changeAnnasHat() {
      await currentUser().click(tile('Anna'));
      const before = lookOf(tile('Anna'));
      const hat = otherChoice('hat', before);
      await currentUser().click(
        within(group('Anna', 'Hat')).getByRole('button', { name: hat.label }),
      );
      return { ...before, hat: hat.name };
    }

    /** Opens the Line-up of the show named `name` again, from the start. */
    async function reopen(name = 'Hat Show') {
      reload();
      await moveOnToShows();
      await currentUser().click(showCard(name));
    }

    RuleScenario('A look survives a reload', ({ Given, When, Then }) => {
      let look: ChosenLook;
      Given("Anna has a look on a show's Line-up", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        look = lookOf(tile('Anna'));
      });
      When("I reload the page and open that show's Line-up again", () => reopen());
      Then('Anna has the same look', () => {
        expect(lookOf(tile('Anna'))).toEqual(look);
      });
    });

    RuleScenario('A newcomer gets a look at random', ({ Given, When, Then, And }) => {
      let dario: ChosenLook;
      Given("Dario has never been on a show's Line-up", () => {
        localStorage.setItem(
          looksKey('hat-show'),
          JSON.stringify({ Anna: { hat: 'crown', colour: 'sun' } }),
        );
      });
      When('it opens with Dario ticked', () => openLineUp(['Anna', 'Dario'], hatShow()));
      Then('Dario has a look drawn at random', () => {
        dario = lookOf(tile('Dario'));
        expect(fits(fakeLineUp(), dario)).toBe(true);
        expect(lookOf(tile('Anna'))).toEqual({ hat: 'crown', colour: 'sun' });
      });
      And('he keeps it from then on, unless it is changed', async () => {
        await reopen();
        expect(lookOf(tile('Dario'))).toEqual(dario);
      });
    });

    RuleScenario('Each show keeps its own looks', ({ Given, When, Then }) => {
      const other = fakeScenario({ name: 'Other Show', lineUp: fakeLineUp() });
      let before: ChosenLook;
      Given('two shows with a line-up', async () => {
        storeTicked(['Anna', 'Ben']);
        renderApp({ scenarios: [hatShow(), other] });
        await moveOnToShows();
        await currentUser().click(showCard('Other Show'));
        before = lookOf(tile('Anna'));
        await choose('Pick a show');
      });
      When("I change Anna's look in one of them", async () => {
        await currentUser().click(showCard('Hat Show'));
        await changeAnnasHat();
      });
      Then("her look in the other doesn't change", async () => {
        await reopen('Other Show');
        expect(lookOf(tile('Anna'))).toEqual(before);
      });
    });

    RuleScenario(
      'A stored look that no longer fits keeps what still does',
      ({ Given, When, Then }) => {
        Given("Anna's stored look has a choice the show no longer offers", () => {
          localStorage.setItem(
            looksKey('hat-show'),
            JSON.stringify({ Anna: { hat: 'tiara', colour: 'mint' } }),
          );
        });
        When("the show's Line-up opens", () => openLineUp(['Anna', 'Ben'], hatShow()));
        Then('that option gets a choice at random, and her other choices are kept', () => {
          const look = lookOf(tile('Anna'));
          expect(fits(fakeLineUp(), look)).toBe(true);
          expect(look.colour).toBe('mint');
          const stored = JSON.parse(localStorage.getItem(looksKey('hat-show'))!);
          expect(stored.Anna).toEqual(look);
        });
      },
    );

    RuleScenarioOutline(
      "Storage that is <problem> doesn't stop the Line-up",
      ({ Given, When, Then, And }, { problem }) => {
        const scenario = hatShow();
        let chosen: ChosenLook;
        Given("this browser's storage is <problem>", () => {
          storeTicked(['Anna', 'Ben']);
          if (problem === 'blocked') blockStorage();
          else fillStorage();
        });
        When("a show's Line-up opens and I change Anna's look", async () => {
          renderApp({ scenarios: [scenario] });
          // Blocked storage reads no team, so it is typed in for the visit.
          if (problem === 'blocked') for (const name of ['Anna', 'Ben']) await addName(name);
          await moveOnToShows();
          await currentUser().click(showCard('Hat Show'));
          chosen = await changeAnnasHat();
        });
        Then('Anna is drawn with the new look', () => {
          expect(lookOf(tile('Anna'))).toEqual(chosen);
        });
        And('the show starts with it', async () => {
          await currentUser().click(startButton());
          await waitFor(() => expect(scenario.runs).toHaveLength(1));
          expect(scenario.runs[0]!.looks.get('Anna')).toEqual(chosen);
        });
      },
    );
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
