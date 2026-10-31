import { loadFeature } from '@amiceli/vitest-cucumber';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { Show } from '../src/scenario-kit/contract';
import { FULL_LEVEL, melody, type Music } from '../src/scenario-kit/music';
import { loadSettings } from '../src/settings/settings';
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
import { fakeAudio, type FakeAudio } from './support/audio';
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

/** A bar of tune. */
const TUNE = melody('C4 D4 E4 F4', 0);

/**
 * A show that plays the tune and keeps playing until it is cancelled. The
 * test moves the song on, as the show's frames would.
 */
async function startMusicShow() {
  let music: Music | null = null;
  const scenario = fakeScenario({
    play: (show) => {
      music = show.sound.music(TUNE);
      return new Promise<void>(() => undefined);
    },
  });
  await startShow(PEOPLE, scenario);
  await waitFor(() => expect(music).not.toBeNull());
  let beat = 0;
  const song = {
    /** Moves the song on a beat. */
    next: () => music!.to(beat++, 4),
  };
  song.next();
  return song;
}

/** The music's level now, as a share of its full level. */
const musicLevel = (audio: FakeAudio) => audio.outputLevels[0]! / FULL_LEVEL;

const press = (key: string) => fireEvent.keyDown(window, { key });

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

  Rule('Music follows the music switch and volume', ({ RuleScenario }) => {
    RuleScenario(
      'With the music off, the show plays its sounds without music',
      ({ Given, When, Then, And }) => {
        let audio: FakeAudio;
        const heard = { music: 0, sound: 0 };
        Given('the sound is on and the music is off', () => {
          storeSettings({ muted: false, music: false, musicVolume: 70, lastScenario: null });
          audio = fakeAudio();
        });
        When('the show plays music and a sound', async () => {
          const scenario = fakeScenario({
            play: (show) => {
              const music = show.sound.music(TUNE);
              for (let beat = 0; beat <= 4; beat += 0.25) music.to(beat, 4);
              heard.music = audio.started;
              show.sound.play('splash');
              heard.sound = audio.started - heard.music;
            },
          });
          await startShow(PEOPLE, scenario);
          await resultHeading();
        });
        Then('the sound is heard', () => {
          expect(heard.sound).toBeGreaterThan(0);
        });
        And("the music isn't", () => {
          expect(heard.music).toBe(0);
        });
      },
    );

    RuleScenario('Music plays at the chosen volume', ({ Given, When, Then }) => {
      let audio: FakeAudio;
      Given('the music volume is {int}%', (_, volume: number) => {
        storeSettings({ muted: false, music: true, musicVolume: volume, lastScenario: null });
        audio = fakeAudio();
      });
      When('the show plays music', async () => {
        const scenario = fakeScenario({ play: (show) => show.sound.music(TUNE).to(0, 4) });
        await startShow(PEOPLE, scenario);
        await resultHeading();
      });
      Then('the music plays at {int}% of its full level', (_, volume: number) => {
        expect(audio.started).toBeGreaterThan(0);
        expect(audio.outputLevels).toHaveLength(1);
        expect(audio.outputLevels[0]).toBeCloseTo((volume / 100) * FULL_LEVEL, 6);
      });
    });

    RuleScenario(
      "The arrow keys change the music's volume during the show",
      ({ Given, When, Then, And }) => {
        let audio: FakeAudio;
        let song: Awaited<ReturnType<typeof startMusicShow>>;
        Given('the music is on, at {int}%', (_, volume: number) => {
          storeSettings({ muted: false, music: true, musicVolume: volume, lastScenario: null });
          audio = fakeAudio();
        });
        When('I press the up arrow during the show', async () => {
          song = await startMusicShow();
          vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
          press('ArrowUp');
        });
        Then('the music plays at {int}% from then on', (_, volume: number) => {
          song.next();
          expect(musicLevel(audio)).toBeCloseTo(volume / 100, 6);
        });
        And('"♪ 75%" shows for a second, then goes', async () => {
          expect(screen.getByText('♪ 75%')).toBeVisible();
          await act(async () => vi.advanceTimersByTime(999));
          expect(screen.getByText('♪ 75%')).toBeVisible();
          await act(async () => vi.advanceTimersByTime(1));
          expect(screen.queryByText('♪ 75%')).not.toBeInTheDocument();
        });
        And('the music is still at {int}% after the show', async (_, volume: number) => {
          vi.useRealTimers();
          press('Escape');
          await waitFor(onShowsStep);
          expect(loadSettings()).toMatchObject({ music: true, musicVolume: volume });
        });
      },
    );

    RuleScenario('M turns the music off and on during the show', ({ Given, When, Then }) => {
      let audio: FakeAudio;
      let song: Awaited<ReturnType<typeof startMusicShow>>;
      Given('the music is on, at {int}%', (_, volume: number) => {
        storeSettings({ muted: false, music: true, musicVolume: volume, lastScenario: null });
        audio = fakeAudio();
      });
      When('I press M during the show', async () => {
        song = await startMusicShow();
        press('m');
      });
      Then('the music goes quiet, and "♪ off" shows', () => {
        song.next();
        expect(musicLevel(audio)).toBe(0);
        expect(screen.getByText('♪ off')).toBeVisible();
      });
      When('I press M again', () => {
        press('M');
      });
      Then('the music plays at {int}% again', (_, volume: number) => {
        song.next();
        expect(musicLevel(audio)).toBeCloseTo(volume / 100, 6);
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
