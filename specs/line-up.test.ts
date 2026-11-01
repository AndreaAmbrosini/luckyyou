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
  bar,
  blockStorage,
  choose,
  currentUser,
  fillStorage,
  moveOnToShows,
  pickShow,
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
  {
    name: 'beach',
    label: 'Beach',
    ground: { sky: 'sky', floor: 'sun' },
    suits: ['cap'],
    picture: () => document.createElement('i'),
  },
  {
    name: 'snow',
    label: 'Snow',
    ground: { sky: 'glass', floor: 'paper' },
    suits: ['beanie'],
    picture: () => document.createElement('i'),
  },
];

const hatShow = () => fakeScenario({ name: 'Hat Show', lineUp: fakeLineUp() });
const themedShow = () => fakeScenario({ name: 'Hat Show', lineUp: themedLineUp() });

/** Racers for a line-up whose themes are tracks, and the nine that suit Autumn, in its order. */
const RACERS = [
  ['leaf', 'Giant leaf', 'Rides'],
  ['squirrel', 'Squirrel', 'Animals'],
  ['hedgehog', 'Hedgehog', 'Animals'],
  ['mushroom', 'Mushroom', 'Things'],
  ['acorn', 'Acorn', 'Things'],
  ['snail', 'Snail', 'Rides'],
  ['caterpillar', 'Caterpillar', 'Rides'],
  ['pigeon', 'Pigeon', 'Animals'],
  ['gnome', 'Garden gnome', 'Things'],
  ['duck', 'Duck', 'Rides'],
  ['rocket', 'Rocket', 'Rides'],
  ['robot', 'Robot', 'Things'],
] as const;
const AUTUMN = [
  'squirrel',
  'leaf',
  'hedgehog',
  'mushroom',
  'acorn',
  'snail',
  'caterpillar',
  'pigeon',
  'gnome',
];

/**
 * Track Show: its themes are tracks and its first option's choices racers,
 * in three groups. Autumn suits nine of them, in its own order; Moon none.
 */
function trackLineUp(): LineUp {
  const [, colour] = fakeLineUp().options as [LineUpOption, LineUpOption];
  const track = (name: string, label: string, suits?: string[]) => ({
    name,
    label,
    ground: { sky: 'sky', floor: 'bark' },
    suits,
    picture: () => document.createElement('i'),
  });
  return fakeLineUp({
    options: [
      {
        name: 'racer',
        label: 'Racer',
        choices: RACERS.map(([name, label, group]) => ({ name, label, group })),
      },
      colour,
    ],
    themes: [track('autumn', 'Autumn', AUTUMN), track('moon', 'Moon')],
    words: { theme: 'Track', choices: 'racers' },
  });
}
const trackShow = () => fakeScenario({ name: 'Track Show', lineUp: trackLineUp() });
const labelOf = (name: string) => RACERS.find((racer) => racer[0] === name)![1];

/** Ticks `names`, moves on to the shows and clicks `scenario`, which has a line-up. */
async function openLineUp(names: readonly string[], scenario: FakeScenario) {
  storeTicked(names, ['Zoe']);
  renderApp({ scenarios: [scenario] });
  await moveOnToShows();
  await pickShow(scenario.name);
}

/** Today's people, a place each: their drawing and card, a die and a pin. */
const row = () => screen.getByRole('list', { name: "Today's people" });
const places = () => within(row()).getAllByRole('listitem');
/** `name`'s drawing and card, which open their look. */
const card = (name: string) => within(row()).getByRole('button', { name });
/** The text of the element an element's aria-labelledby names. */
const accessibleLabel = (element: Element) =>
  document.getElementById(element.getAttribute('aria-labelledby')!)!.textContent;
const nameOf = (place: HTMLElement) => accessibleLabel(place.querySelector('button')!);
/** `name`'s look, in the sheet over the Line-up. */
const sheet = (name: string) => screen.getByRole('dialog', { name });
const openSheet = (name: string) => currentUser().click(card(name));
const group = (name: string, label: string) =>
  within(sheet(name)).getByRole('group', { name: label });
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

/** Each look in the row, by name. */
const rowLooks = () => new Map(places().map((each) => [nameOf(each)!, lookOf(each)]));

/** The pressed choices in one of the sheet's options. */
const pressed = (name: string, label: string) =>
  within(group(name, label))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true');

/** A choice of `option` other than the one `look` has. */
const otherChoice = (option: string, look: ChosenLook) =>
  fakeLineUp()
    .options.find((each) => each.name === option)!
    .choices.find((choice) => choice.name !== look[option])!;

const die = (name: string) => screen.getByRole('button', { name: `A new look for ${name}` });
const pin = (name: string) => screen.getByRole('button', { name: `Pin ${name}` });
/** `name`'s drawing in the row, which flips in when dealt. */
const drawingOf = (name: string) => card(name).querySelector('[data-look]')!.parentElement!;
const sameLook = (one: ChosenLook, two: ChosenLook) =>
  Object.keys(one).every((option) => one[option] === two[option]);
const pinBen = () => localStorage.setItem(pinsKey('hat-show'), JSON.stringify(['Ben']));

const postcardRow = () => screen.getByRole('group', { name: 'Theme' });
const postcard = (label: string) => within(postcardRow()).getByRole('button', { name: label });
/** The tab lists in an option of the sheet: the theme's view first, when it has one. */
const tabsIn = (option: HTMLElement) =>
  within(option)
    .getAllByRole('tablist')
    .map((list) => within(list).getAllByRole('tab'));
/** The choices an option of the sheet shows. */
const shownIn = (option: HTMLElement) =>
  within(within(option).getAllByRole('tabpanel').at(-1)!).getAllByRole('button');

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
  "themes without the show's words for them": {
    lineUp: { themes: THEMES_FOR_HATS, words: undefined },
    why: 'its line-up has themes but no words for them',
  },
  'a theme without a ground': {
    lineUp: {
      themes: [{ ...THEMES_FOR_HATS[0]!, ground: undefined as never }, THEMES_FOR_HATS[1]!],
    },
    why: 'its line-up theme "beach" has no ground',
  },
  'no way to draw a look': {
    lineUp: { draw: undefined as unknown as LineUp['draw'] },
    why: 'its line-up has no draw function',
  },
};

describeSpec(await loadFeature('./line-up.feature'), ({ Rule }) => {
  Rule('A show with a line-up opens it first', ({ RuleScenario }) => {
    RuleScenario("Next opens the chosen show's Line-up", ({ Given, When, Then, And }) => {
      const scenario = hatShow();
      let names: string[] = [];
      Given('{any} are ticked, and a show with a line-up is chosen', async (_, ticked: string) => {
        names = quoted(ticked);
        storeTicked(names, ['Zoe']);
        renderApp({ scenarios: [fakeScenario({ name: 'Plain Show' }), scenario] });
        await moveOnToShows();
        await currentUser().click(showCard('Hat Show'));
      });
      When('I press its "Next" button', () => choose('Next: line up the hats'));
      Then("its Line-up shows {any}, in today's order, each drawn in their look", () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Line up the hats');
        expect(places().map(nameOf)).toEqual(names);
        places().forEach((each, index) => {
          expect(fits(fakeLineUp(), lookOf(each))).toBe(true);
          const drawn = each.querySelector<HTMLElement>('[data-person]')!;
          expect(drawn.dataset.person).toBe(`${index + 1} ${names[index]}`);
        });
      });
      And("the show hasn't started", () => {
        expect(scenario.runs).toHaveLength(0);
      });
    });

    RuleScenario('Start has the focus', ({ When, Then }) => {
      const scenario = hatShow();
      When("a show's Line-up opens", () => openLineUp(['Anna', 'Ben', 'Carla'], scenario));
      Then(
        "its start button has the keyboard focus, so Enter starts the show with everyone's looks as they are",
        async () => {
          expect(startButton()).toHaveFocus();
          const shown = rowLooks();
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

    RuleScenario('Going back keeps the looks, there and back', ({ Given, When, Then }) => {
      const scenario = hatShow();
      let chosen: ChosenLook;
      Given("I changed Anna's look on a show's Line-up", async () => {
        await openLineUp(['Anna', 'Ben'], scenario);
        await openSheet('Anna');
        const before = lookOf(card('Anna'));
        const hat = otherChoice('hat', before);
        await currentUser().click(
          within(group('Anna', 'Hat')).getByRole('button', { name: hat.label }),
        );
        chosen = { ...before, hat: hat.name };
        await choose('Done');
      });
      When('I go back to the shows, then press "Next" to its Line-up again', async () => {
        await choose('Pick a show');
        expect(showCard('Hat Show')).toHaveAttribute('aria-pressed', 'true');
        await choose('Next: line up the hats');
      });
      Then('Anna has the look I chose', () => {
        expect(lookOf(card('Anna'))).toEqual(chosen);
      });
    });
  });

  Rule("Everyone stands in one row, on the theme's ground", ({ RuleScenario }) => {
    const team = TEAM.slice(0, 8);

    RuleScenario('Everyone stands in one row', ({ Given, Then, And }) => {
      Given("a show's Line-up is open with {int} people", (_, count: number) =>
        openLineUp(team.slice(0, count), hatShow()),
      );
      Then("everyone stands in one row, in today's order, drawn in their look", () => {
        expect(places().map(nameOf)).toEqual(team);
        expect(getComputedStyle(row()).gridAutoFlow).toBe('column');
        places().forEach((each, index) => {
          const drawn = each.querySelector<HTMLElement>('[data-person]')!;
          expect(drawn.dataset.person).toBe(`${index + 1} ${team[index]}`);
          expect(fits(fakeLineUp(), lookOf(each))).toBe(true);
        });
      });
      And('under each is a card with their name, their look in words, a die and a pin', () => {
        const options = fakeLineUp().options;
        for (const name of team) {
          const look = lookOf(card(name));
          const words = options
            .map((option) => option.choices.find((choice) => choice.name === look[option.name]))
            .map((choice) => choice!.label)
            .join(' · ');
          expect(card(name)).toHaveAccessibleName(name);
          expect(card(name)).toHaveAccessibleDescription(words);
          const [stand, paper] = [...card(name).children];
          expect(stand).toContainElement(card(name).querySelector('[data-look]'));
          expect(paper).toHaveTextContent(`${name}${words}`);
          expect(getComputedStyle(paper!).backgroundColor).toBe('var(--color-paper)');
          const place = card(name).closest('li')!;
          expect(within(place).getByRole('button', { name: `A new look for ${name}` })).toBe(
            die(name),
          );
          expect(within(place).getByRole('button', { name: `Pin ${name}` })).toHaveAttribute(
            'aria-pressed',
            'false',
          );
        }
      });
    });

    RuleScenario("The row stands on the theme's ground", ({ Given, When, Then, And }) => {
      /** The ground the row stands on, and its floor. */
      const ground = () => row().parentElement!;
      const sky = () => ground().firstElementChild!;
      Given('a show whose themes each name a ground', () => {
        for (const theme of themedLineUp().themes!) expect(theme.ground).toBeDefined();
      });
      When('a theme is chosen', async () => {
        localStorage.setItem(themeKey('hat-show'), JSON.stringify('snow'));
        await openLineUp(['Anna', 'Ben'], themedShow());
      });
      Then('the row stands on its ground, in the sky and floor colours it names', () => {
        expect(ground().style.getPropertyValue('--sky')).toBe('var(--color-glass)');
        expect(ground().style.getPropertyValue('--floor')).toBe('var(--color-paper)');
        expect(sky()).toHaveAttribute('aria-hidden', 'true');
        expect(getComputedStyle(sky()).backgroundColor).toBe('var(--sky)');
        const floor = sky().firstElementChild!;
        expect(getComputedStyle(floor).backgroundColor).toBe('var(--floor)');
        // Everyone stands in it: the row is drawn over the ground, the height it is.
        expect(sky().nextElementSibling).toBe(row());
        expect(getComputedStyle(sky()).height).toBe('var(--stand)');
        expect(getComputedStyle(card('Ben').firstElementChild!).height).toBe('var(--stand)');
      });
      And('choosing another theme changes the ground at once', async () => {
        await currentUser().click(postcard('Beach'));
        expect(ground().style.getPropertyValue('--sky')).toBe('var(--color-sky)');
        expect(ground().style.getPropertyValue('--floor')).toBe('var(--color-sun)');
      });
    });

    RuleScenario('Clicking someone opens their look in a sheet', ({ Given, When, Then, And }) => {
      Given("a show's Line-up is open with {int} people", (_, count: number) =>
        openLineUp(team.slice(0, count), hatShow()),
      );
      When('I click Ben, or his card', async () => {
        await currentUser().click(drawingOf('Ben'));
        expect(sheet('Ben')).toBeInTheDocument();
        await choose('Done');
        await currentUser().click(within(card('Ben')).getByText('Ben'));
      });
      Then(
        `a sheet opens over the Line-up with Ben drawn bigger, his name, "2 of 8", "Surprise me", his pin and the show's options`,
        () => {
          const look = sheet('Ben');
          expect(look).toHaveAttribute('aria-modal', 'true');
          expect(look).toHaveFocus();
          // Nothing under it takes a click or the focus until it closes.
          expect(screen.getByRole('main')).toHaveAttribute('inert');
          expect(bar()).toHaveAttribute('inert');
          expect(within(look).getByRole('heading', { level: 2 })).toHaveTextContent('Ben');
          expect(look).toHaveTextContent('2 of 8');
          const portrait = look.querySelector<HTMLElement>('[data-person]')!;
          expect(portrait.dataset.person).toBe('2 Ben');
          expect(lookOf(look)).toEqual(lookOf(card('Ben')));
          // Bigger than the widest place in the row: e2e/line-up.spec.ts measures it.
          expect(getComputedStyle(portrait.parentElement!).width).toBe('10.5rem');
          expect(within(look).getByRole('button', { name: 'Surprise me' })).toBeInTheDocument();
          expect(within(look).getByRole('button', { name: 'Pin' })).toHaveAttribute(
            'aria-pressed',
            'false',
          );
          expect(
            within(look)
              .getAllByRole('group')
              .map((each) => accessibleLabel(each)),
          ).toEqual(fakeLineUp().options.map((option) => option.label));
        },
      );
      And('its arrows show the previous and the next person', async () => {
        const arrow = (name: string, label: string) =>
          within(sheet(name)).getByRole('button', { name: label });
        await currentUser().click(arrow('Ben', 'Next: Carla'));
        expect(sheet('Carla')).toHaveTextContent('3 of 8');
        await currentUser().click(arrow('Carla', 'Previous: Ben'));
        await currentUser().click(arrow('Ben', 'Previous: Anna'));
        // They go round.
        await currentUser().click(arrow('Anna', `Previous: ${team[7]}`));
        expect(sheet(team[7]!)).toHaveTextContent('8 of 8');
        await currentUser().click(arrow(team[7]!, 'Next: Anna'));
        await currentUser().click(arrow('Anna', 'Next: Ben'));
        expect(lookOf(sheet('Ben'))).toEqual(lookOf(card('Ben')));
      });
      And(`"Done" or Esc closes it, and the focus goes back to Ben's card`, async () => {
        await choose('Done');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(card('Ben')).toHaveFocus();
        expect(screen.getByRole('main')).not.toHaveAttribute('inert');
        await openSheet('Ben');
        await currentUser().keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(card('Ben')).toHaveFocus();
        // Tab stays inside it while it is open.
        await openSheet('Ben');
        for (let press = 0; press < 40; press++) {
          await currentUser().tab();
          expect(sheet('Ben')).toContainElement(document.activeElement as HTMLElement);
        }
      });
    });

    RuleScenario('A choice shows at once, in the sheet and in the row', ({ Given, When, Then }) => {
      let chosen: ChosenLook;
      Given("Ben's look is open in the sheet", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        await openSheet('Ben');
      });
      When('I choose another choice of an option', async () => {
        const before = lookOf(card('Ben'));
        const colour = otherChoice('colour', before);
        await currentUser().click(
          within(group('Ben', 'Colour')).getByRole('button', { name: colour.label }),
        );
        chosen = { ...before, colour: colour.name };
      });
      Then('Ben is drawn with it at once, in the sheet and in the row', () => {
        expect(lookOf(sheet('Ben'))).toEqual(chosen);
        expect(lookOf(card('Ben'))).toEqual(chosen);
        const colour = fakeLineUp().options[1]!.choices.find((each) => each.name === chosen.colour);
        expect(card('Ben')).toHaveAccessibleDescription(expect.stringContaining(colour!.label));
      });
    });

    RuleScenario('Readable over a screen share, in a row', ({ When, Then, And }) => {
      const long = 'Maria-Elena Ros';
      When(
        "a show's Line-up is open with {int} people, a 15-character name among them",
        (_, count: number) => openLineUp([...TEAM.slice(0, count - 1), long], hatShow()),
      );
      Then('every name is at least --size-body, wrapping inside its card', () => {
        expect(long).toHaveLength(15);
        expect(places()).toHaveLength(8);
        for (const each of places()) {
          const name = document.getElementById(
            each.querySelector('button')!.getAttribute('aria-labelledby')!,
          )!;
          expect(getComputedStyle(name).fontSize).toBe('var(--size-body)');
          expect(getComputedStyle(name).overflowWrap).toBe('anywhere');
          expect(getComputedStyle(each).minWidth).toBe('0px');
        }
      });
      And(
        'every control is at least --target-min across, and shows the keyboard focus',
        async () => {
          const controls = () => [
            ...within(screen.getByRole('main')).getAllByRole('button'),
            ...within(bar()).getAllByRole('button'),
            ...(screen.queryByRole('dialog')
              ? within(screen.getByRole('dialog')).getAllByRole('button')
              : []),
          ];
          const check = () => {
            for (const button of controls()) {
              const style = getComputedStyle(button);
              const label = button.getAttribute('aria-label') ?? button.textContent!;
              expect(bigEnough(style.minHeight) || bigEnough(style.height), label).toBe(true);
              if (!button.textContent) {
                expect(bigEnough(style.minWidth) || bigEnough(style.width), label).toBe(true);
              }
            }
          };
          check();
          await openSheet('Ben');
          check();
          // The app's focus ring, which nothing on the Line-up takes away.
          expect(css('../src/styles/global.css')).toMatch(
            /:focus-visible \{\s*outline: var\(--focus\);/,
          );
          expect(css('../src/screens/LineUp.module.css')).not.toMatch(/outline/);
        },
      );
    });

    RuleScenario('Everything in view at 1280 by 800', ({ Given, When, Then, And }) => {
      // jsdom has no layout: e2e/line-up.spec.ts measures The Race's Line-up
      // in a real 1280 by 800 window. Here: what that measuring leans on.
      const long = 'Maria-Elena Ros';
      Given('8 people, a 15-character name among them, in a 1280 by 800 window', () => {
        expect(long).toHaveLength(15);
      });
      When('the Line-up opens', () => openLineUp([...TEAM.slice(0, 7), long], themedShow()));
      Then(
        'the themes, everyone and their cards, and the bottom bar are in view without scrolling',
        () => {
          expect(places()).toHaveLength(8);
          // The ground takes the height the window leaves it.
          expect(css('../src/screens/LineUp.module.css')).toMatch(
            /--stand: clamp\([\d.]+rem, 100dvh - [\d.]+rem, [\d.]+rem\);/,
          );
        },
      );
      And(
        "with Ben's sheet open, his first option's first eight choices are in view, and any more scroll inside the sheet",
        async () => {
          await openSheet('Ben');
          const body = group('Ben', 'Hat').parentElement!;
          expect(getComputedStyle(body).overflowY).toBe('auto');
          expect(getComputedStyle(sheet('Ben')).bottom).toBe('0px');
        },
      );
    });
  });

  Rule('Changing a look', ({ RuleScenario }) => {
    RuleScenario('The chosen one of each option is marked and named', ({ When, Then, And }) => {
      const lineUp = drawnHats();
      let look: ChosenLook;
      When("Ben's look is shown", async () => {
        await openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp }));
        await openSheet('Ben');
        look = lookOf(card('Ben'));
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
            'var(--color-marigold)',
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

    RuleScenario('Surprise me', ({ Given, When, Then }) => {
      let before: ChosenLook;
      Given("Ben's look is shown", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        await openSheet('Ben');
        before = lookOf(card('Ben'));
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then("Ben gets a look drawn at random from the show's choices", () => {
        const after = lookOf(card('Ben'));
        expect(fits(fakeLineUp(), after)).toBe(true);
        expect(after).not.toEqual(before);
        expect(lookOf(sheet('Ben'))).toEqual(after);
      });
    });

    RuleScenario("An option's groups are tabs", ({ Given, When, Then, And }) => {
      const hat = groupedLineUp().options[0]!;
      const tabs = () => within(group('Ben', 'Hat')).getAllByRole('tab');
      const shownChoices = () => shownIn(group('Ben', 'Hat')).map((button) => button.textContent);
      const labelsIn = (label: string) =>
        hat.choices.filter((choice) => choice.group === label).map((choice) => choice.label);
      let mine: (typeof hat.choices)[number];
      Given('a show whose first option has choices in two groups', () =>
        openLineUp(['Anna', 'Ben'], fakeScenario({ name: 'Hat Show', lineUp: groupedLineUp() })),
      );
      When("Ben's look is shown", async () => {
        await openSheet('Ben');
        mine = hat.choices.find((choice) => choice.name === lookOf(card('Ben')).hat)!;
      });
      Then(
        'that option has one tab per group, named for the group, in the order their first choices come',
        () => {
          expect(within(group('Ben', 'Hat')).getByRole('tablist')).toHaveAccessibleName('Hat');
          expect(tabs().map((tab) => tab.textContent)).toEqual(['Hats', 'Helmets']);
        },
      );
      And("it opens on the tab holding Ben's choice, showing only that group's choices", () => {
        const open = tabs().filter((tab) => tab.getAttribute('aria-selected') === 'true');
        expect(open.map((tab) => tab.textContent)).toEqual([mine.group]);
        expect(getComputedStyle(open[0]!).backgroundColor).toBe('var(--color-ground)');
        expect(shownChoices()).toEqual(
          labelsIn(mine.group!).map((label) => expect.stringContaining(label)),
        );
      });
      And("choosing the other tab shows its choices and leaves Ben's look as it was", async () => {
        const before = lookOf(card('Ben'));
        const other = tabs().find((tab) => tab.textContent !== mine.group)!;
        await currentUser().click(other);
        expect(other).toHaveAttribute('aria-selected', 'true');
        expect(shownChoices()).toEqual(labelsIn(other.textContent!));
        expect(lookOf(card('Ben'))).toEqual(before);
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
      When("Ben's look is shown", () => openSheet('Ben'));
      Then(
        'each choice of the first option is Ben drawn with that choice and the rest of his look, its label under it',
        () => {
          const look = lookOf(card('Ben'));
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
        const before = lookOf(card('Ben'));
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
        await openSheet('Ben');
        for (let time = 0; time < 30; time++) {
          await choose(label);
          const chosen = lookOf(card('Ben')).hat;
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
        before = rowLooks();
        await choose(label);
      });
      Then("each of today's people gets a look drawn at random", () => {
        const after = rowLooks();
        expect([...after.keys()]).toEqual(TEAM.slice(0, 8));
        for (const look of after.values()) expect(fits(fakeLineUp(), look)).toBe(true);
        expect(after).not.toEqual(before);
      });
      And('the looks vary as much as the choices allow', () => {
        const looks = [...rowLooks().values()];
        for (const option of fakeLineUp().options) {
          const counts = option.choices.map(
            (choice) => looks.filter((look) => look[option.name] === choice.name).length,
          );
          expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  Rule('A show can offer themes', ({ RuleScenario }) => {
    const THEMES = themedLineUp().themes!;
    const postcards = () => within(postcardRow()).getAllByRole('button');
    const chosenCards = () =>
      postcards().filter((card) => card.getAttribute('aria-pressed') === 'true');
    /** The theme a postcard's picture shows, or null for Surprise's own. */
    const pictured = (card: HTMLElement) =>
      card.querySelector<HTMLElement>('[data-picture]')?.dataset.picture ?? null;
    const markOn = (card: HTMLElement) =>
      card.querySelector<HTMLElement>('[data-mark]')?.dataset.mark ?? null;

    /** Opens Hat Show's Line-up again after going back to the shows. */
    async function goBackAndReopen() {
      await choose('Pick a show');
      await pickShow('Hat Show');
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
            postcardRow().compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING,
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
        expect(getComputedStyle(postcard('Snow')).boxShadow).toContain('var(--color-marigold)');
        for (const card of postcards().filter((each) => each !== postcard('Snow'))) {
          expect(markOn(card)).toBeNull();
          expect(getComputedStyle(card).boxShadow).not.toContain('marigold');
        }
      });
    });

    RuleScenario("The themes come first, in the show's words", ({ Given, When, Then, And }) => {
      const lineUp = trackLineUp();
      const following = (one: Element, two: Element) =>
        (one.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      Given(
        "a show whose line-up offers themes, and calls them tracks and its first option's choices racers",
        () => {
          expect(lineUp.words).toEqual({ theme: 'Track', choices: 'racers' });
        },
      );
      When(
        'its Line-up opens with Autumn chosen, {int} racers suiting it',
        async (_, count: number) => {
          expect(lineUp.themes![0]!.suits).toHaveLength(count);
          localStorage.setItem(themeKey('track-show'), JSON.stringify('autumn'));
          await openLineUp(['Anna', 'Ben'], trackShow());
        },
      );
      Then('above the postcards, the heading reads {string}', (_, text: string) => {
        const heading = screen.getByRole('heading', { level: 2, name: text });
        expect(following(heading, postcardRow())).toBe(true);
      });
      And("above today's people, {string}", (_, text: string) => {
        const heading = screen.getByRole('heading', { level: 2, name: text });
        expect(following(postcardRow(), heading)).toBe(true);
        expect(following(heading, row())).toBe(true);
        expect(heading.closest('section')).toHaveAccessibleName(text);
      });
    });

    RuleScenario('Choices that suit the theme are starred', ({ Given, Then, And }) => {
      const team = TEAM.slice(0, 8);
      const racers = ['duck', 'leaf', 'rocket', 'squirrel', 'robot', 'duck', 'pigeon', 'rocket'];
      const suiting = team.filter((_, index) => AUTUMN.includes(racers[index]!));
      Given(
        "a theme is chosen, and {int} of today's {int} people have a first-option choice that suits it",
        async (_, count: number, everyone: number) => {
          expect(suiting).toHaveLength(count);
          expect(team).toHaveLength(everyone);
          localStorage.setItem(themeKey('track-show'), JSON.stringify('autumn'));
          localStorage.setItem(
            looksKey('track-show'),
            JSON.stringify(
              Object.fromEntries(
                team.map((name, index) => [name, { racer: racers[index], colour: 'sun' }]),
              ),
            ),
          );
          await openLineUp(team, trackShow());
        },
      );
      Then(
        'each of those {int} has a star in the row, read out as {string}',
        (_, count: number, label: string) => {
          const starred = places().filter(
            (each) => within(each).queryAllByRole('img', { name: label }).length > 0,
          );
          expect(starred).toHaveLength(count);
          expect(starred.map(nameOf)).toEqual(suiting);
          for (const each of starred) {
            const star = within(each).getByRole('img', { name: label });
            expect(getComputedStyle(star).backgroundColor).toBe('var(--color-marigold)');
          }
        },
      );
      And('beside {string}, a star reads {string}', (_, heading: string, text: string) => {
        const note = screen.getByRole('heading', { level: 2, name: heading }).nextElementSibling!;
        expect(note).toHaveTextContent(text);
        expect(note.querySelector('svg')).not.toBeNull();
      });
    });

    RuleScenario("The sheet shows the theme's choices first", ({ Given, When, Then, And }) => {
      const racer = () => group('Ben', 'Racer');
      Given("a theme that some of the first option's choices suit is chosen", () => {
        localStorage.setItem(themeKey('track-show'), JSON.stringify('autumn'));
        localStorage.setItem(
          looksKey('track-show'),
          JSON.stringify({ Ben: { racer: 'duck', colour: 'mint' } }),
        );
      });
      When("Ben's look opens in the sheet", async () => {
        await openLineUp(['Anna', 'Ben'], trackShow());
        await openSheet('Ben');
      });
      Then(
        'the first option offers {string} and {string}, the first chosen, holding the choices that suit Autumn in its order',
        (_, theirs: string, all: string) => {
          const [views] = tabsIn(racer());
          expect(views!.map((tab) => tab.textContent!.replace(/\d+$/, ''))).toEqual([theirs, all]);
          expect(views!.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
          expect(views![0]).toHaveTextContent(`${theirs}${AUTUMN.length}`);
          expect(views![1]).toHaveTextContent(`${all}${RACERS.length}`);
          expect(tabsIn(racer())).toHaveLength(1);
          expect(shownIn(racer()).map((button) => button.textContent)).toEqual(AUTUMN.map(labelOf));
          // Ben's racer isn't among them, and his look is as it was.
          expect(pressed('Ben', 'Racer')).toHaveLength(0);
          expect(lookOf(card('Ben')).racer).toBe('duck');
        },
      );
      And(
        'with {string}, its groups are tabs, and each choice that suits Autumn has a star',
        async (_, all: string) => {
          await currentUser().click(within(racer()).getByRole('tab', { name: new RegExp(all) }));
          const [, groups] = tabsIn(racer());
          expect(groups!.map((tab) => tab.textContent)).toEqual(['Rides', 'Animals', 'Things']);
          // It opens on Ben's choice's group.
          expect(groups![0]).toHaveAttribute('aria-selected', 'true');
          for (const tab of groups!) {
            await currentUser().click(tab);
            const shown = RACERS.filter(([, , kind]) => kind === tab.textContent);
            expect(shownIn(racer())).toHaveLength(shown.length);
            shown.forEach(([name, label], index) => {
              const button = shownIn(racer())[index]!;
              expect(button).toHaveTextContent(label);
              const star = within(button).queryByRole('img', { name: 'Suits Autumn' });
              expect(star !== null, name).toBe(AUTUMN.includes(name));
            });
          }
        },
      );
      And("with a theme that no choice suits, the option shows only its groups' tabs", async () => {
        await choose('Done');
        await currentUser().click(postcard('Moon'));
        await openSheet('Ben');
        const lists = tabsIn(racer());
        expect(lists).toHaveLength(1);
        expect(lists[0]!.map((tab) => tab.textContent)).toEqual(['Rides', 'Animals', 'Things']);
        expect(within(racer()).queryAllByRole('img')).toHaveLength(0);
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
        expect(getComputedStyle(postcard('Surprise')).boxShadow).toContain('var(--color-marigold)');
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
        await pickShow('Hat Show');
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
      When('a theme is chosen', async () => {
        await currentUser().click(postcard('Beach'));
        await openSheet('Ben');
      });
      Then('the show draws every look in it, so it can dress everyone for it', () => {
        const drawn = [...document.querySelectorAll<HTMLElement>('[data-look]')];
        // Everyone in the row, and Ben in the sheet.
        expect(drawn).toHaveLength(3);
        for (const each of drawn) expect(each.dataset.theme).toBe('beach');
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
        await pickShow('Hat Show');
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

  Rule('Pinned looks stay', ({ RuleScenario }) => {
    /** The pin's look: pressed, its fill and its outline. */
    const pinLook = (button: HTMLElement) => ({
      pressed: button.getAttribute('aria-pressed'),
      fill: getComputedStyle(button).backgroundColor,
      outline: getComputedStyle(button).borderStyle,
    });
    const sheetPin = (name: string) => within(sheet(name)).getByRole('button', { name: /^Pin/ });

    RuleScenario('Choosing by hand pins a look', ({ Given, When, Then }) => {
      Given("Ben's look is shown and isn't pinned", async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], hatShow());
        await openSheet('Ben');
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'false');
      });
      When('I choose any of his choices', async () => {
        const colours = within(group('Ben', 'Colour')).getAllByRole('button');
        await currentUser().click(
          colours.find((button) => button.getAttribute('aria-pressed') === 'false')!,
        );
      });
      Then('Ben is pinned: his pin is pressed, in marigold with a solid outline', () => {
        for (const button of [pin('Ben'), sheetPin('Ben')]) {
          expect(pinLook(button)).toEqual({
            pressed: 'true',
            fill: 'var(--color-marigold)',
            outline: 'solid',
          });
        }
        expect(sheetPin('Ben')).toHaveTextContent('Pinned');
        expect(pin('Anna')).toHaveAttribute('aria-pressed', 'false');
        // And his card keeps a marigold ring.
        const paper = card('Ben').lastElementChild!;
        expect(getComputedStyle(paper).boxShadow).toContain('var(--color-marigold)');
        expect(getComputedStyle(card('Anna').lastElementChild!).boxShadow).not.toContain(
          'marigold',
        );
      });
    });

    RuleScenario('A pin can be taken off', ({ Given, When, Then }) => {
      Given('Ben is pinned', () => pinBen());
      When('I press his pin', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], hatShow());
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
        await openLineUp(team, hatShow());
        before = rowLooks();
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then('everyone else gets a look drawn at random, and Anna and Ben keep theirs', () => {
        const after = rowLooks();
        expect(after.get('Anna')).toEqual(before.get('Anna'));
        expect(after.get('Ben')).toEqual(before.get('Ben'));
        const others = team.slice(2);
        for (const name of others) expect(fits(fakeLineUp(), after.get(name))).toBe(true);
        expect(others.some((name) => !sameLook(after.get(name)!, before.get(name)!))).toBe(true);
        expect(pin('Anna')).toHaveAttribute('aria-pressed', 'true');
        expect(pin('Ben')).toHaveAttribute('aria-pressed', 'true');
      });
      And('the bottom bar says how many pinned looks stay', () => {
        expect(within(bar()).getByRole('status')).toHaveTextContent(
          '2 pinned, kept when you shuffle',
        );
      });
    });

    RuleScenario('A die deals one look', ({ Given, When, Then }) => {
      const dealt: { before: ChosenLook; after: ChosenLook; pinned: string | null }[] = [];
      Given('Ben is pinned', () => pinBen());
      When(`I press the die beside Ben, or "Surprise me" in his sheet`, async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], hatShow());
        const surprise = () => within(sheet('Ben')).getByRole('button', { name: 'Surprise me' });
        for (const [press, pinIt] of [
          [() => die('Ben'), () => pin('Ben')],
          [surprise, () => sheetPin('Ben')],
        ] as const) {
          if (press === surprise) await openSheet('Ben');
          for (let turn = 0; turn < 5; turn++) {
            if (pinIt().getAttribute('aria-pressed') === 'false') {
              await currentUser().click(pinIt());
            }
            const before = lookOf(card('Ben'));
            await currentUser().click(press());
            dealt.push({
              before,
              after: lookOf(card('Ben')),
              pinned: pin('Ben').getAttribute('aria-pressed'),
            });
          }
        }
      });
      Then("Ben gets a look drawn at random, unlike the one he had, and isn't pinned", () => {
        expect(dealt).toHaveLength(10);
        for (const { before, after, pinned } of dealt) {
          expect(fits(fakeLineUp(), after)).toBe(true);
          expect(sameLook(after, before)).toBe(false);
          expect(pinned).toBe('false');
        }
      });
    });

    RuleScenario('Pins are kept', ({ Given, When, Then }) => {
      Given('Ben is pinned', async () => {
        await openLineUp(['Anna', 'Ben', 'Carla'], hatShow());
        await currentUser().click(pin('Ben'));
      });
      When("I reload the page and open that show's Line-up again", async () => {
        reload();
        await moveOnToShows();
        await pickShow('Hat Show');
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
        await openLineUp(team, hatShow());
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
          expect(drawingOf('Ben').style.animationDelay).toBe('');
          expect(parseFloat(getComputedStyle(drawingOf('Ben')).animationDuration) || 0).toBe(0);
        },
      );
      And('with reduced motion, the looks change without flipping', async () => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }));
        const before = rowLooks();
        await choose('Shuffle everyone');
        expect(rowLooks()).not.toEqual(before);
        for (const name of team) {
          expect(drawingOf(name).style.animationDelay).toBe('');
          expect(parseFloat(getComputedStyle(drawingOf(name)).animationDuration) || 0).toBe(0);
        }
      });
    });
  });

  Rule("Dealing from the theme's choices", ({ RuleScenario }) => {
    const team = TEAM.slice(0, 8);
    const racersOf = (names: readonly string[]) =>
      names.map((name) => rowLooks().get(name)!.racer!);
    const dealFrom = () => screen.getByRole('group', { name: 'Deal from' });
    const sides = () => within(dealFrom()).getAllByRole('button');
    const onSide = () =>
      sides()
        .filter((side) => side.getAttribute('aria-pressed') === 'true')
        .map((side) => side.textContent);
    /** How many times each of `choices` comes up in `dealt`, at most one apart when they vary as much as they can. */
    const spread = (dealt: readonly string[], choices: readonly string[]) => {
      const counts = choices.map((choice) => dealt.filter((each) => each === choice).length);
      return Math.max(...counts) - Math.min(...counts);
    };
    /** Opens Track Show's Line-up on `theme`, with Anna in a duck and Ben in a rocket, neither suiting Autumn. */
    async function openOn(theme: string, names: readonly string[], lineUp = trackLineUp()) {
      localStorage.setItem(themeKey('track-show'), JSON.stringify(theme));
      localStorage.setItem(
        looksKey('track-show'),
        JSON.stringify({
          Anna: { racer: 'duck', colour: 'sun' },
          Ben: { racer: 'rocket', colour: 'mint' },
        }),
      );
      await openLineUp(names, fakeScenario({ name: 'Track Show', lineUp }));
    }

    RuleScenario("The theme's choices, by default", ({ Given, Then, When, And }) => {
      Given('a show whose line-up offers themes, on Autumn, with Anna and Ben pinned', async () => {
        localStorage.setItem(pinsKey('track-show'), JSON.stringify(['Anna', 'Ben']));
        await openOn('autumn', team);
      });
      Then(
        'beside {string}, a switch {string} offers {string} and {string}, the first on',
        (_, shuffle: string, label: string, theirs: string, any: string) => {
          expect(dealFrom()).toHaveAccessibleName(label);
          expect(sides().map((side) => side.textContent)).toEqual([theirs, any]);
          expect(onSide()).toEqual([theirs]);
          expect(dealFrom().nextElementSibling).toBe(screen.getByRole('button', { name: shuffle }));
          expect(getComputedStyle(sides()[0]!).backgroundColor).toBe('var(--color-marigold)');
          expect(getComputedStyle(sides()[1]!).backgroundColor).not.toContain('marigold');
        },
      );
      When('I choose {string}', (_, label: string) => choose(label));
      Then(
        'everyone but Anna and Ben gets a first-option choice that suits Autumn, as different from each other as those choices allow',
        () => {
          expect(racersOf(['Anna', 'Ben'])).toEqual(['duck', 'rocket']);
          const dealt = racersOf(team.slice(2));
          for (const racer of dealt) expect(AUTUMN).toContain(racer);
          expect(new Set(dealt).size).toBe(dealt.length);
        },
      );
      And('their other options are drawn from all their choices', () => {
        const colours = trackLineUp().options[1]!.choices.map((choice) => choice.name);
        const dealt = team.slice(2).map((name) => rowLooks().get(name)!);
        for (const look of dealt) expect(fits(trackLineUp(), look)).toBe(true);
        expect(
          spread(
            dealt.map((look) => look.colour!),
            colours,
          ),
        ).toBeLessThanOrEqual(1);
      });
    });

    RuleScenario('A die and Surprise me follow the switch', ({ Given, When, Then }) => {
      const dealt: { before: string; after: string }[] = [];
      Given('the switch is on {string}', async (_, side: string) => {
        await openOn('autumn', ['Anna', 'Ben', 'Carla']);
        expect(onSide()).toEqual([side]);
      });
      When(`I press the die beside Ben, or "Surprise me" in his sheet`, async () => {
        const surprise = () => within(sheet('Ben')).getByRole('button', { name: 'Surprise me' });
        for (const press of [() => die('Ben'), surprise]) {
          if (press === surprise) await openSheet('Ben');
          for (let turn = 0; turn < 5; turn++) {
            const before = lookOf(card('Ben')).racer!;
            await currentUser().click(press());
            dealt.push({ before, after: lookOf(card('Ben')).racer! });
          }
        }
        expect(
          within(sheet('Ben')).getByText(/Surprise me deals from Autumn racers\.$/),
        ).toBeVisible();
      });
      Then('Ben gets a choice that suits Autumn, unlike the one he had', () => {
        expect(dealt).toHaveLength(10);
        for (const { before, after } of dealt) {
          expect(AUTUMN).toContain(after);
          expect(after).not.toBe(before);
        }
      });
    });

    RuleScenario('Any racer deals from every choice', ({ Given, When, Then }) => {
      const everyone = TEAM.slice(0, RACERS.length);
      Given('the switch is on {string}', async (_, side: string) => {
        await openOn('autumn', everyone);
        await currentUser().click(within(dealFrom()).getByRole('button', { name: side }));
        expect(onSide()).toEqual([side]);
      });
      When('I choose {string}', (_, label: string) => choose(label));
      Then("the looks are dealt from all of the show's choices", () => {
        // As many people as racers: each racer comes up once.
        expect(new Set(racersOf(everyone))).toEqual(new Set(RACERS.map(([name]) => name)));
      });
    });

    RuleScenario('A Surprise theme deals from the theme it drew', ({ Given, Then }) => {
      const MOON = ['rocket', 'robot', 'duck'];
      const lineUp = trackLineUp();
      const withMoon: LineUp = {
        ...lineUp,
        themes: lineUp.themes!.map((theme) =>
          theme.name === 'moon' ? { ...theme, suits: MOON } : theme,
        ),
      };
      Given('"Surprise" drew {string}', async (_, drawn: string) => {
        await openOn('autumn', team, withMoon);
        // Surprise draws a track other than the one showing: Moon.
        await currentUser().click(postcard('Surprise'));
        expect(
          screen.getByRole('heading', { level: 2, name: /^1 · Track: (\w+)/ }),
        ).toHaveTextContent(`Track: ${drawn}`);
      });
      Then(
        'the switch offers {string}, and deals from the choices that suit Moon',
        async (_, label: string) => {
          expect(onSide()).toEqual([label]);
          await choose('Shuffle everyone');
          const dealt = racersOf(team);
          for (const racer of dealt) expect(MOON).toContain(racer);
          expect(spread(dealt, MOON)).toBeLessThanOrEqual(1);
        },
      );
    });

    RuleScenario('A theme that no choice suits has no switch', ({ Given, Then }) => {
      const everyone = TEAM.slice(0, RACERS.length);
      Given('a theme that names no choices is chosen', () => openOn('moon', everyone));
      Then('there is no switch, and every deal draws from all the choices', async () => {
        expect(screen.queryByRole('group', { name: 'Deal from' })).toBeNull();
        await choose('Shuffle everyone');
        expect(new Set(racersOf(everyone))).toEqual(new Set(RACERS.map(([name]) => name)));
        await openSheet('Ben');
        expect(within(sheet('Ben')).queryByText(/deals from/)).toBeNull();
      });
    });

    RuleScenario('The switch is kept per show', ({ Given, When, Then, And }) => {
      const shows = [trackShow(), fakeScenario({ name: 'Other Show', lineUp: trackLineUp() })];
      const side = (label: string) => within(dealFrom()).getByRole('button', { name: label });
      Given("I set the switch to {string} on a show's Line-up", async (_, label: string) => {
        for (const show of shows) {
          localStorage.setItem(themeKey(show.id), JSON.stringify('autumn'));
        }
        storeTicked(['Anna', 'Ben'], ['Zoe']);
        renderApp({ scenarios: shows });
        await moveOnToShows();
        // Other Show's switch is left on Autumn racers.
        await pickShow('Other Show');
        await currentUser().click(side('Any racer'));
        await currentUser().click(side('Autumn racers'));
        await choose('Pick a show');
        await pickShow('Track Show');
        await currentUser().click(side(label));
      });
      When("I reload the page and open that show's Line-up again", async () => {
        reload();
        await moveOnToShows();
        await pickShow('Track Show');
      });
      Then('the switch is still on {string}', (_, label: string) => {
        expect(onSide()).toEqual([label]);
      });
      And("another show's switch is as I left it there", async () => {
        await choose('Pick a show');
        await pickShow('Other Show');
        expect(onSide()).toEqual(['Autumn racers']);
      });
    });
  });

  Rule('Everyone keeps their look', ({ RuleScenario, RuleScenarioOutline }) => {
    /** Changes Anna's hat on the open Line-up, and gives her new look. */
    async function changeAnnasHat() {
      await openSheet('Anna');
      const before = lookOf(card('Anna'));
      const hat = otherChoice('hat', before);
      await currentUser().click(
        within(group('Anna', 'Hat')).getByRole('button', { name: hat.label }),
      );
      await choose('Done');
      return { ...before, hat: hat.name };
    }

    /** Opens the Line-up of the show named `name` again, from the start. */
    async function reopen(name = 'Hat Show') {
      reload();
      await moveOnToShows();
      await pickShow(name);
    }

    RuleScenario('A look survives a reload', ({ Given, When, Then }) => {
      let look: ChosenLook;
      Given("Anna has a look on a show's Line-up", async () => {
        await openLineUp(['Anna', 'Ben'], hatShow());
        look = lookOf(card('Anna'));
      });
      When("I reload the page and open that show's Line-up again", () => reopen());
      Then('Anna has the same look', () => {
        expect(lookOf(card('Anna'))).toEqual(look);
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
        dario = lookOf(card('Dario'));
        expect(fits(fakeLineUp(), dario)).toBe(true);
        expect(lookOf(card('Anna'))).toEqual({ hat: 'crown', colour: 'sun' });
      });
      And('he keeps it from then on, unless it is changed', async () => {
        await reopen();
        expect(lookOf(card('Dario'))).toEqual(dario);
      });
    });

    RuleScenario('Each show keeps its own looks', ({ Given, When, Then }) => {
      const other = fakeScenario({ name: 'Other Show', lineUp: fakeLineUp() });
      let before: ChosenLook;
      Given('two shows with a line-up', async () => {
        storeTicked(['Anna', 'Ben']);
        renderApp({ scenarios: [hatShow(), other] });
        await moveOnToShows();
        await pickShow('Other Show');
        before = lookOf(card('Anna'));
        await choose('Pick a show');
      });
      When("I change Anna's look in one of them", async () => {
        await pickShow('Hat Show');
        await changeAnnasHat();
      });
      Then("her look in the other doesn't change", async () => {
        await reopen('Other Show');
        expect(lookOf(card('Anna'))).toEqual(before);
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
          const look = lookOf(card('Anna'));
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
          await pickShow('Hat Show');
          chosen = await changeAnnasHat();
        });
        Then('Anna is drawn with the new look', () => {
          expect(lookOf(card('Anna'))).toEqual(chosen);
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
