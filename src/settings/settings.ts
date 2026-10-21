import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '../storage';

export const SETTINGS_KEY = 'luckyyou:v1:settings';

export interface Settings {
  readonly muted: boolean;
  /** The id of the show played last, ready to play again. */
  readonly lastScenario: string | null;
}

/** The stored settings, with a default for anything missing or damaged. */
export function loadSettings(): Settings {
  const stored = readJson(SETTINGS_KEY);
  const { muted, lastScenario } = (typeof stored === 'object' && stored !== null ? stored : {}) as {
    muted?: unknown;
    lastScenario?: unknown;
  };
  return {
    muted: muted === true,
    lastScenario: typeof lastScenario === 'string' ? lastScenario : null,
  };
}

/** The settings, kept in this browser as they change. */
export function useSettings(): [Settings, (change: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);

  const change = useCallback(
    (change: Partial<Settings>) => setSettings((current) => ({ ...current, ...change })),
    [],
  );
  return [settings, change];
}
