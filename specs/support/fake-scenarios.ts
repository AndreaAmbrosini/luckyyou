import type {
  ChosenLook,
  LineUp,
  LineUpOption,
  Scenario,
  ScenarioMeta,
  Show,
} from '../../src/scenario-kit/contract';

export interface Run {
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly looks: ReadonlyMap<string, ChosenLook>;
}

export interface FakeScenario extends Scenario {
  /** Each show it was asked to play, in order. */
  readonly runs: Run[];
}

type FakeOptions = Partial<ScenarioMeta> & { play?: (show: Show) => Promise<void> | void };

/**
 * A scenario that records who it was told about and otherwise does nothing,
 * unless `play` says what else to do.
 */
export function fakeScenario(options: FakeOptions = {}): FakeScenario {
  const name = options.name ?? 'Fake Show';
  const runs: Run[] = [];
  return {
    id: options.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: options.description ?? `${name}, for tests.`,
    card: options.card ?? { emoji: '🎲' },
    people: options.people ?? { min: 2, max: 12 },
    developmentOnly: options.developmentOnly,
    lineUp: options.lineUp,
    runs,
    async play(show) {
      runs.push({ names: show.names, unlucky: show.unlucky, looks: show.looks });
      await options.play?.(show);
    },
  };
}

/** How a drawn look reads: `hat=crown colour=sun`, in the options' order. */
export function lookText(look: ChosenLook): string {
  return Object.entries(look)
    .map(([option, choice]) => `${option}=${choice}`)
    .join(' ');
}

/**
 * A line-up of hats and colours. It draws a look as its text, with the
 * person's name and place, so a test can read what is drawn.
 */
export function fakeLineUp(options: Partial<LineUp> = {}): LineUp {
  return {
    heading: 'Line up the hats',
    start: 'Start the hats',
    options: [
      {
        name: 'hat',
        label: 'Hat',
        choices: [
          { name: 'cap', label: 'Cap' },
          { name: 'crown', label: 'Crown' },
          { name: 'beanie', label: 'Beanie' },
        ],
      },
      {
        name: 'colour',
        label: 'Colour',
        choices: [
          { name: 'tomato', label: 'Tomato', swatch: 'tomato' },
          { name: 'sun', label: 'Sun', swatch: 'sun' },
          { name: 'mint', label: 'Mint', swatch: 'mint' },
          { name: 'grape', label: 'Grape', swatch: 'grape' },
        ],
      },
    ],
    draw(look, person) {
      const drawn = document.createElement('div');
      drawn.dataset.look = lookText(look);
      drawn.dataset.person = `${person.place} ${person.name}`;
      return drawn;
    },
    ...options,
  };
}

/**
 * A line-up whose first option, the hat, has its choices in two groups,
 * "Hats" and "Helmets", that take turns, so the groups follow first choices.
 */
export function groupedLineUp(): LineUp {
  const lineUp = fakeLineUp();
  const hat = {
    ...lineUp.options[0]!,
    choices: [
      { name: 'cap', label: 'Cap', group: 'Hats' },
      { name: 'bike', label: 'Bike helmet', group: 'Helmets' },
      { name: 'crown', label: 'Crown', group: 'Hats' },
      { name: 'hard-hat', label: 'Hard hat', group: 'Helmets' },
      { name: 'beanie', label: 'Beanie', group: 'Hats' },
    ],
  };
  return { ...lineUp, options: [hat, ...lineUp.options.slice(1)] };
}

/**
 * A line-up whose hat shows as the person drawn in each hat, and whose
 * colours each have a picture that reads back its colour.
 */
export function pictureLineUp(): LineUp {
  const [hat, colour] = fakeLineUp().options as [LineUpOption, LineUpOption];
  return fakeLineUp({
    options: [
      { ...hat, drawn: true },
      {
        ...colour,
        choices: colour.choices.map(({ name, label }) => ({
          name,
          label,
          picture() {
            const drawn = document.createElement('div');
            drawn.dataset.picture = name;
            return drawn;
          },
        })),
      },
    ],
  });
}
