import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import {
  choose,
  quoted,
  resultHeading,
  startShow,
  storeSettings,
  stubDraws,
  tickBox,
  tickedNames,
} from './support/app';
import { fakeAudio, type FakeAudio } from './support/audio';
import { fakeScenario, type FakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const ANNA_BEN_CARLA = ['Anna', 'Ben', 'Carla'];

/** Plays a show for `names` in which the app picks `unlucky`, and waits for the result. */
async function resultFor(names: readonly string[], unlucky: string, scenario: FakeScenario) {
  stubDraws(names.indexOf(unlucky));
  await startShow(names, scenario);
  await resultHeading();
}

/** The paragraph that reads exactly `text`, or null. */
const paragraph = (text: string) =>
  screen.queryByText((_, element) => element?.tagName === 'P' && element.textContent === text);

/** The result's prize line, if it has one. */
const prizeLine = () =>
  screen.queryByText(
    (_, element) => element?.tagName === 'P' && /^Your prize:/.test(element.textContent ?? ''),
  );

/** Whether `later` comes after `earlier` on the page. */
const follows = (earlier: Node, later: Node) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

/** When a part of the result comes in, in seconds after it opens. */
const comesIn = (element: Element) =>
  parseFloat((element as HTMLElement).style.getPropertyValue('--at'));

/** The parts of the result in the order the eye should meet them; the prize when there is one. */
async function parts() {
  const heading = await resultHeading();
  return [
    heading.parentElement!,
    within(heading).getByText(/🎉/),
    ...(prizeLine() ? [prizeLine()!] : []),
    screen.getByText('Sorry for your win'),
    screen.getByRole('button', { name: 'Run again' }).parentElement!,
  ];
}

const confetti = () => document.querySelector('[data-confetti]');

/** The browser's prefers-reduced-motion, as `reduce` says. */
function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
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

    RuleScenario('The job is the prize', ({ Given, And, When, Then }) => {
      Given('the prize is {string}', (_, prize: string) => {
        storeSettings({ prize });
      });
      And('the app picked {string}', (_, name: string) => {
        stubDraws(ANNA_BEN_CARLA.indexOf(name));
      });
      When('the show ends', () => startShow(ANNA_BEN_CARLA, fakeScenario()));
      Then('under the heading it says {string}', async (_, text: string) => {
        const heading = await resultHeading();
        expect(heading).toHaveAccessibleName('Lucky you, Ben 🎉');
        const line = paragraph(text)!;
        expect(line).toBeInTheDocument();
        expect(follows(heading, line)).toBe(true);
      });
    });

    RuleScenario('Without a prize, the result only congratulates', ({ Given, When, Then, And }) => {
      Given('no prize is named', () => {
        storeSettings({ prize: '   ' });
      });
      When('the show ends', () => resultFor(ANNA_BEN_CARLA, 'Carla', fakeScenario()));
      Then('the result names no prize', () => {
        expect(prizeLine()).toBeNull();
      });
      And('under the heading it says {string}', async (_, text: string) => {
        expect(follows(await resultHeading(), paragraph(text)!)).toBe(true);
      });
    });
  });

  Rule('The news arrives one piece at a time', ({ RuleScenario }) => {
    RuleScenario(
      'The card comes in, then the name, the prize and the ribbon, then the buttons',
      ({ Given, When, Then, And }) => {
        Given('the prize is {string}', (_, prize: string) => {
          storeSettings({ prize });
        });
        When('the show ends', () => resultFor(ANNA_BEN_CARLA, 'Ben', fakeScenario()));
        Then('the card, the name, the prize and the ribbon come in, in that order', async () => {
          const [card, name, prize, ribbon] = await parts();
          expect(prize).toHaveTextContent('Your prize: Running the retro');
          const times = [card!, name!, prize!, ribbon!].map(comesIn);
          expect(times[0]).toBe(0);
          expect(times).toEqual(times.toSorted((a, b) => a - b));
          expect(new Set(times).size).toBe(times.length);
        });
        And('the buttons come in after the ribbon', async () => {
          const [, , , ribbon, buttons] = await parts();
          expect(comesIn(buttons!)).toBeGreaterThan(comesIn(ribbon!));
        });
        And('confetti falls behind the card', async () => {
          const [card] = await parts();
          expect(confetti()).toHaveAttribute('aria-hidden', 'true');
          expect(confetti()!.children.length).toBeGreaterThan(0);
          // Earlier on the page, so the card is drawn over it.
          expect(follows(confetti()!, card!)).toBe(true);
        });
      },
    );

    RuleScenario(
      'With reduced motion, everything is simply there',
      ({ Given, When, Then, And }) => {
        Given('the browser asks for reduced motion', () => {
          prefersReducedMotion(true);
          storeSettings({ prize: 'Running the retro' });
        });
        When('the show ends', () => resultFor(ANNA_BEN_CARLA, 'Ben', fakeScenario()));
        Then('every part is there from the start', async () => {
          const all = await parts();
          expect(all).toHaveLength(5);
          expect(all.map(comesIn)).toEqual([0, 0, 0, 0, 0]);
        });
        And('no confetti falls', () => {
          expect(confetti()).toBeNull();
        });
      },
    );
  });

  Rule('A ta-da that deflates', ({ RuleScenario }) => {
    RuleScenario('A ta-da turns into a sad trombone', ({ Given, When, Then, And }) => {
      let audio: FakeAudio;
      Given('the sound is on', () => {
        storeSettings({ muted: false });
        audio = fakeAudio();
      });
      When('the show ends', () => resultFor(ANNA_BEN_CARLA, 'Ben', fakeScenario()));
      Then('a ta-da plays and deflates into a sad trombone', () => {
        expect(audio.opened).toBe(1);
        expect(audio.started).toBeGreaterThan(0);
      });
      And('it stops when I leave the result', async () => {
        await choose("Change who's in");
        expect(audio.closed).toBe(1);
      });
    });

    RuleScenario("A muted run's result is silent", ({ Given, When, Then }) => {
      let audio: FakeAudio;
      Given('the sound is off', () => {
        storeSettings({ muted: true });
        audio = fakeAudio();
      });
      When('the show ends', () => resultFor(ANNA_BEN_CARLA, 'Ben', fakeScenario()));
      Then('nothing is heard', () => {
        expect(audio.opened).toBe(0);
        expect(audio.started).toBe(0);
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
