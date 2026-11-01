import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  choose,
  currentUser,
  mainButton,
  moveOnToShows,
  pickShow,
  renderApp,
  resultHeading,
  showCard,
  storeTicked,
} from '../specs/support/app';
import { fakeScenario } from '../specs/support/fake-scenarios';

const PEOPLE = ['Anna', 'Ben', 'Carla'];

describe('starting a show', () => {
  it('starts one show with one pick when Start is double-clicked', async () => {
    const scenario = fakeScenario({ name: 'Shark Bait' });
    storeTicked(PEOPLE);
    renderApp({ scenarios: [scenario] });
    await moveOnToShows();

    await currentUser().dblClick(mainButton());
    await resultHeading();

    expect(scenario.runs).toHaveLength(1);
  });
});

describe('the keyboard focus', () => {
  it('is back on Start, with the played show chosen, after Esc cancels the show', async () => {
    const endless = fakeScenario({ name: 'Snail Race', play: () => new Promise(() => undefined) });
    storeTicked(PEOPLE);
    renderApp({ scenarios: [fakeScenario({ name: 'Hot Potato' }), endless] });
    await moveOnToShows();
    await pickShow('Snail Race');
    await waitFor(() => expect(endless.runs).toHaveLength(1));

    await currentUser().keyboard('{Escape}');

    expect(showCard('Snail Race')).toHaveAttribute('aria-pressed', 'true');
    expect(mainButton()).toHaveAccessibleName('Start Snail Race');
    expect(mainButton()).toHaveFocus();
  });

  it('is on the new heading after Run again', async () => {
    storeTicked(PEOPLE);
    renderApp({ scenarios: [fakeScenario()] });
    await moveOnToShows();
    await pickShow('Fake Show');
    await resultHeading();

    await choose('Run again');

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  });
});
