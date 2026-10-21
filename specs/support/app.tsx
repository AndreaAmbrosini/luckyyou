import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../src/App';

const PEOPLE_KEY = 'luckyyou:v1:people';

let user: UserEvent = userEvent.setup();

/** Starts the app fresh, on whatever this browser has stored. */
export function renderApp() {
  user = userEvent.setup();
  return render(<App />);
}

/** Unmounts the app and starts it again on the same storage. */
export function reload() {
  cleanup();
  return renderApp();
}

/** The user-event instance driving the app that renderApp started. */
export function currentUser(): UserEvent {
  return user;
}

/** Writes the people list as a stored entry, before the app starts. */
export function storePeople(entries: unknown[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(entries));
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
