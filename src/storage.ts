// This browser's storage, read and written so that storage which is blocked or
// full never stops the app: it keeps working for the visit (decision 0004).

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // The browser blocks site data.
  }
}

/** The value stored under `key`, or null when there is none or it can't be read. */
export function readJson(key: string): unknown {
  try {
    const text = storage()?.getItem(key);
    return text == null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked or full: what the app holds in memory still counts for this visit.
  }
}
