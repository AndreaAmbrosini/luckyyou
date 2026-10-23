import { loadFeature } from '@amiceli/vitest-cucumber';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { Show } from '../src/scenario-kit/contract';
import {
  currentUser,
  fakeFullscreen,
  moveOnToShows,
  renderApp,
  resultHeading,
  showCard,
  startShow,
  storeSettings,
  storeTicked,
} from './support/app';
import { fakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

const PEOPLE = ['Anna', 'Ben', 'Carla'];

/** A show that keeps playing until it is cancelled, and remembers what it was handed. */
function endlessShow() {
  let handed: Show | null = null;
  const scenario = fakeScenario({
    play: (show) => {
      handed = show;
      return new Promise<void>(() => undefined);
    },
  });
  return { scenario, show: () => handed };
}

const onShowsStep = () =>
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pick a show');

describeSpec(await loadFeature('./show.feature'), ({ Rule }) => {
  Rule('The show has the whole window', ({ RuleScenario }) => {
    RuleScenario('Nothing but the scenario is on screen', ({ When, Then, And }) => {
      const { scenario, show } = endlessShow();
      let app: HTMLElement;
      When('the show starts', async () => {
        await startShow(PEOPLE, scenario);
        await waitFor(() => expect(show()).not.toBeNull());
        app = document.body.firstElementChild as HTMLElement;
      });
      Then('the scenario fills the whole window', () => {
        const host = app.firstElementChild as HTMLElement;
        const style = getComputedStyle(host);
        expect(style.position).toBe('fixed');
        expect([style.top, style.right, style.bottom, style.left]).toEqual([
          '0px',
          '0px',
          '0px',
          '0px',
        ]);
        expect(host).toContainElement(show()!.stage);
      });
      And('the app draws nothing on top of it', () => {
        expect(app.children).toHaveLength(1);
        expect(screen.queryByRole('banner')).not.toBeInTheDocument();
        expect(screen.queryByRole('main')).not.toBeInTheDocument();
      });
      And('the mouse pointer is hidden', () => {
        expect(getComputedStyle(app.firstElementChild!).cursor).toBe('none');
      });
    });
  });

  Rule('Sound follows the mute switch', ({ RuleScenario }) => {
    RuleScenario('A muted show makes no sound', ({ Given, When, Then }) => {
      const outputs = vi.fn();
      let played = false;
      Given('the sound is off', () => {
        storeSettings({ muted: true, lastScenario: null });
        vi.stubGlobal('AudioContext', outputs);
      });
      When('the show plays a sound', async () => {
        const scenario = fakeScenario({
          play: (show) => {
            show.sound.play('splash');
            played = true;
          },
        });
        await startShow(PEOPLE, scenario);
        await resultHeading();
      });
      Then('nothing is heard', () => {
        expect(played).toBe(true);
        expect(outputs).not.toHaveBeenCalled();
      });
    });
  });

  Rule('Esc or leaving fullscreen cancels', ({ RuleScenario }) => {
    RuleScenario('Esc cancels the show', ({ Given, When, Then, And }) => {
      const { scenario, show } = endlessShow();
      Given('the show is playing', async () => {
        await startShow(PEOPLE, scenario);
        await waitFor(() => expect(show()).not.toBeNull());
      });
      When('I press Esc', () => currentUser().keyboard('{Escape}'));
      Then("I'm back to picking a show", () => {
        onShowsStep();
        expect(show()!.signal.aborted).toBe(true);
      });
      And('no result is shown', () => {
        expect(screen.queryByText('Sorry for your win')).not.toBeInTheDocument();
      });
    });

    RuleScenario('Leaving fullscreen cancels the show', ({ Given, When, Then, And }) => {
      const { scenario, show } = endlessShow();
      Given('the show is playing in fullscreen', async () => {
        fakeFullscreen(true);
        storeTicked(PEOPLE);
        renderApp({ scenarios: [scenario] });
        await currentUser().click(screen.getByRole('button', { name: 'Fullscreen' }));
        await moveOnToShows();
        await currentUser().click(showCard(scenario.name));
        await waitFor(() => expect(show()).not.toBeNull());
      });
      When('the page leaves fullscreen', () => act(() => document.exitFullscreen()));
      Then("I'm back to picking a show", () => {
        onShowsStep();
        expect(show()!.signal.aborted).toBe(true);
      });
      And('no result is shown', () => {
        expect(screen.queryByText('Sorry for your win')).not.toBeInTheDocument();
      });
    });
  });

  Rule('A broken show still gives a result', ({ RuleScenario }) => {
    RuleScenario('A scenario that fails still leads to the result', ({ Given, When, Then }) => {
      const scenario = fakeScenario({
        play: async () => {
          await Promise.resolve();
          throw new Error('The shark ate the script.');
        },
      });
      const errors = vi.fn();
      Given('a scenario that throws an error mid-show', () => {
        vi.spyOn(console, 'error').mockImplementation(errors);
      });
      When('the show starts', () => startShow(PEOPLE, scenario));
      Then("the result names the app's pick", async () => {
        const { unlucky } = scenario.runs[0]!;
        expect(await resultHeading()).toHaveAccessibleName(`Lucky you, ${unlucky} 🎉`);
        expect(errors).toHaveBeenCalledWith(
          expect.stringContaining(scenario.name),
          expect.any(Error),
        );
      });
    });

    RuleScenario(
      'A scenario that never ends is stopped after 35 seconds',
      ({ Given, When, Then, And }) => {
        const { scenario, show } = endlessShow();
        Given('a scenario that never finishes', () => {
          storeTicked(PEOPLE);
          renderApp({ scenarios: [scenario] });
          fireEvent.click(screen.getByRole('button', { name: 'Next: pick a show' }));
          vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
          fireEvent.click(showCard(scenario.name));
        });
        When('the show has run for {int} seconds', async (_, seconds: number) => {
          await act(async () => vi.advanceTimersByTime(seconds * 1000 - 1));
          expect(show()!.signal.aborted).toBe(false);
          await act(async () => vi.advanceTimersByTime(1));
        });
        Then('the scenario is stopped', () => {
          expect(show()!.signal.aborted).toBe(true);
        });
        And("the result names the app's pick", () => {
          const { unlucky } = scenario.runs[0]!;
          expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(
            `Lucky you, ${unlucky} 🎉`,
          );
        });
      },
    );
  });
});
