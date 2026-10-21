import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../src/App';
import type { Scenario } from '../../src/scenario-kit/contract';
import { onReset } from '../../src/test/reset';

const PEOPLE_KEY = 'luckyyou:v1:people';
const SETTINGS_KEY = 'luckyyou:v1:settings';

/** Names for a team of any size up to 14, in alphabetical order. */
export const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Hana',
  'Ivo',
  'Jonas',
  'Kofi',
  'Luca',
  'Marco',
  'Noor',
];

let user: UserEvent = userEvent.setup();
let scenarios: readonly Scenario[] = [];

/** Starts the app fresh, on whatever this browser has stored. */
export function renderApp(options: { scenarios?: readonly Scenario[] } = {}) {
  user = userEvent.setup();
  scenarios = options.scenarios ?? [];
  return render(<App scenarios={scenarios} />);
}

/** Unmounts the app and starts it again on the same storage and scenarios. */
export function reload() {
  cleanup();
  return renderApp({ scenarios });
}

/** The user-event instance driving the app that renderApp started. */
export function currentUser(): UserEvent {
  return user;
}

/** Writes the people list as a stored entry, before the app starts. */
export function storePeople(entries: unknown[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(entries));
}

/** Stores these names, all ticked, plus anyone in `unticked`. */
export function storeTicked(names: readonly string[], unticked: readonly string[] = []): void {
  storePeople([
    ...names.map((name) => ({ name, ticked: true })),
    ...unticked.map((name) => ({ name, ticked: false })),
  ]);
}

export function storeSettings(settings: unknown): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Names in quotes, in order: `"Anna", "Ben" and "Carla"` → Anna, Ben, Carla. */
export function quoted(text: string): string[] {
  return [...text.matchAll(/"([^"]*)"/g)].map(([, name]) => name!);
}

/** Types a name into the add field, exactly as given, and adds it. */
export async function addName(text: string): Promise<void> {
  const field = screen.getByRole('textbox', { name: 'Add a name' });
  await user.clear(field);
  if (text !== '') {
    await user.click(field);
    await user.paste(text);
  }
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

export async function choose(button: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: button }));
}

export async function moveOnToShows(): Promise<void> {
  await choose('Next: pick a show');
}

function team() {
  return screen.getByRole('region', { name: 'Team' });
}

/** The names on the list, top to bottom. */
export function listNames(): string[] {
  return within(team())
    .queryAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

export function tickBox(name: string): HTMLInputElement {
  return within(team()).getByRole('checkbox', { name }) as HTMLInputElement;
}

export function tickedNames(): string[] {
  return within(team())
    .queryAllByRole('checkbox', { checked: true })
    .map((box) => box.closest('li')?.textContent ?? '');
}

export async function toggle(name: string): Promise<void> {
  await user.click(tickBox(name));
}

/** The message the app shows about the name just typed. */
export function refusal(): string {
  return screen.getByRole('alert').textContent ?? '';
}

/** The card for a show on the "Pick a show" step. */
export function showCard(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** localStorage as a browser shows it when site data is blocked. */
export function blockStorage(): void {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Access is denied for this document.', 'SecurityError');
  });
}

/** localStorage that reads but has no room left to write. */
export function fillStorage(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
}

/**
 * The Fullscreen API as a browser offers it, or doesn't. jsdom has none, so
 * this stands in: entering and leaving update `fullscreenElement` and fire
 * `fullscreenchange`, as browsers do.
 */
export function fakeFullscreen(supported: boolean): void {
  const root = document.documentElement;
  let element: Element | null = null;
  const change = (next: Element | null) => {
    element = next;
    document.dispatchEvent(new Event('fullscreenchange'));
  };
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: supported });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  });
  Object.defineProperty(root, 'requestFullscreen', {
    configurable: true,
    value: async () => change(root),
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: async () => change(null),
  });
  onReset(() => {
    for (const key of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen'] as const) {
      Reflect.deleteProperty(document, key);
    }
    Reflect.deleteProperty(root, 'requestFullscreen');
  });
}
