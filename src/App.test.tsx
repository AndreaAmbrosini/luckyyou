import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  choose,
  currentUser,
  moveOnToShows,
  renderApp,
  resultHeading,
  showCard,
  storeTicked,
} from '../specs/support/app';
import { fakeScenario } from '../specs/support/fake-scenarios';

const PEOPLE = ['Anna', 'Ben', 'Carla'];

describe('starting a show', () => {
  it('starts one show with one pick when a card is double-clicked', async () => {
    const scenario = fakeScenario({ name: 'Shark Bait' });
    storeTicked(PEOPLE);
    renderApp({ scenarios: [scenario] });
    await moveOnToShows();

    await currentUser().dblClick(showCard('Shark Bait'));
    await resultHeading();

    expect(scenario.runs).toHaveLength(1);
  });
});

describe('the keyboard focus', () => {
  it('is back on the played card after Esc cancels the show', async () => {
    const endless = fakeScenario({ name: 'Snail Race', play: () => new Promise(() => undefined) });
    storeTicked(PEOPLE);
    renderApp({ scenarios: [fakeScenario({ name: 'Hot Potato' }), endless] });
    await moveOnToShows();
    await currentUser().click(showCard('Snail Race'));
    await waitFor(() => expect(endless.runs).toHaveLength(1));

    await currentUser().keyboard('{Escape}');

    expect(showCard('Snail Race')).toHaveFocus();
  });

  it('is on the new heading after Run again', async () => {
    storeTicked(PEOPLE);
    renderApp({ scenarios: [fakeScenario()] });
    await moveOnToShows();
    await currentUser().click(showCard('Fake Show'));
    await resultHeading();

    await choose('Run again');

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  });
});
