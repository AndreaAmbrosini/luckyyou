import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '../storage';

export const SETTINGS_KEY = 'luckyyou:v1:settings';

export interface Settings {
  readonly muted: boolean;
  /** Music under the shows; the sound switch still silences it. */
  readonly music: boolean;
  /** The music's volume in percent, 0 to 100 in steps of 10. */
  readonly musicVolume: number;
  /** The id of the show played last, ready to play again. */
  readonly lastScenario: string | null;
}

/** The stored settings, with a default for anything missing or damaged. */
export function loadSettings(): Settings {
  const stored = readJson(SETTINGS_KEY);
  const { muted, music, musicVolume, lastScenario } = (
    typeof stored === 'object' && stored !== null ? stored : {}
  ) as {
    muted?: unknown;
    music?: unknown;
    musicVolume?: unknown;
    lastScenario?: unknown;
  };
  return {
    muted: muted === true,
    music: music !== false,
    musicVolume: isVolume(musicVolume) ? musicVolume : 70,
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

const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value / 10) && value >= 0 && value <= 100;

/** What a show plays its music at, 0 to 1: 0 when the music is off. */
export const musicLevel = ({ music, musicVolume }: Settings) => (music ? musicVolume / 100 : 0);
