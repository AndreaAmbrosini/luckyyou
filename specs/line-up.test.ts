import { loadFeature } from '@amiceli/vitest-cucumber';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { expect, vi } from 'vitest';
import { discoverScenarios, validateScenario } from '../src/catalogue/discover';
import { Lab } from '../src/lab/Lab';
import type { ChosenLook, LineUp } from '../src/scenario-kit/contract';
import { runShow } from '../src/scenario-kit/testing';
import { moveOnToShows, pickerNames, quoted, renderApp, storeTicked } from './support/app';
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
