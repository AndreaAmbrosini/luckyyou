// Everyone's look on each show's Line-up, its theme and who is pinned, kept
// in this browser per show (decisions 0011, 0015 and 0016) and read so that
// storage that is blocked, full or damaged never stops the Line-up (decision 0004).

import { useCallback, useState } from 'react';
import type { ChosenLook, Scenario } from '../scenario-kit/contract';
import { dealLooks, drawTheme, fitLook, themeNamed } from '../scenario-kit/line-up';
import { readJson, writeJson } from '../storage';

export const looksKey = (id: string) => `luckyyou:v1:line-up:${id}`;
/** The theme chosen by hand, by name; nothing, or null, for "Surprise". */
export const themeKey = (id: string) => `luckyyou:v1:line-up:${id}:theme`;
/** The names of everyone whose look is pinned, today's people or not. */
export const pinsKey = (id: string) => `luckyyou:v1:line-up:${id}:pins`;

/** The theme a Line-up shows, and whether "Surprise" drew it. */
export interface ThemeChoice {
  readonly name: string;
  readonly surprise: boolean;
}

type Looks = ReadonlyMap<string, ChosenLook>;

/**
 * A show's stored looks, by name: everyone who has been on its Line-up. A
 * look is only checked against the show when its person is in a pick.
 */
type Stored = Readonly<Record<string, unknown>>;

function load(id: string): Stored {
  const stored = readJson(looksKey(id));
  return typeof stored === 'object' && stored !== null && !Array.isArray(stored)
    ? (stored as Stored)
    : {};
}

/**
 * Today's looks on a show's Line-up, and a way to change them. Opening a
 * show's Line-up keeps each person's look, with any choice the show no
 * longer offers drawn again, deals newcomers one at random, and saves them
 * all, so a newcomer keeps the look they were first given.
 */
export function useLooks() {
  const [kept, setKept] = useState<ReadonlyMap<string, Stored>>(new Map());
  const [keptThemes, setKeptThemes] = useState<ReadonlyMap<string, unknown>>(new Map());
  const [keptPins, setKeptPins] = useState<ReadonlyMap<string, ReadonlySet<string>>>(new Map());

  const save = useCallback(
    (scenario: Scenario, today: Looks) => {
      const stored = {
        ...(kept.get(scenario.id) ?? load(scenario.id)),
        ...Object.fromEntries(today),
      };
      setKept(new Map(kept).set(scenario.id, stored));
      writeJson(looksKey(scenario.id), stored);
    },
    [kept],
  );

  const open = useCallback(
    (scenario: Scenario, names: readonly string[]): Looks => {
      const lineUp = scenario.lineUp!;
      const stored = kept.get(scenario.id) ?? load(scenario.id);
      const looks = new Map<string, ChosenLook>();
      for (const name of names) {
        const look = fitLook(lineUp, stored[name], Math.random);
        if (look) looks.set(name, look);
      }
      const newcomers = dealLooks(
        lineUp,
        names.filter((name) => !looks.has(name)),
        Math.random,
      );
      const today = new Map(names.map((name) => [name, looks.get(name) ?? newcomers.get(name)!]));
      save(scenario, today);
      return today;
    },
    [kept, save],
  );

  /**
   * The theme a show's Line-up opens on: the one kept, while the show still
   * offers it, or else "Surprise", which draws one afresh. Null without themes.
   */
  const openTheme = useCallback(
    (scenario: Scenario): ThemeChoice | null => {
      const lineUp = scenario.lineUp!;
      if (!lineUp.themes) return null;
      const stored = keptThemes.has(scenario.id)
        ? keptThemes.get(scenario.id)
        : readJson(themeKey(scenario.id));
      const theme = themeNamed(lineUp, stored);
      return theme
        ? { name: theme.name, surprise: false }
        : { name: drawTheme(lineUp, Math.random), surprise: true };
    },
    [keptThemes],
  );

  const changeTheme = useCallback(
    (scenario: Scenario, theme: ThemeChoice) => {
      const stored = theme.surprise ? null : theme.name;
      setKeptThemes(new Map(keptThemes).set(scenario.id, stored));
      writeJson(themeKey(scenario.id), stored);
    },
    [keptThemes],
  );

  const pinsOf = useCallback(
    (scenario: Scenario): ReadonlySet<string> => {
      const kept = keptPins.get(scenario.id);
      if (kept) return kept;
      const stored = readJson(pinsKey(scenario.id));
      return new Set(
        Array.isArray(stored) ? stored.filter((name) => typeof name === 'string') : [],
      );
    },
    [keptPins],
  );

  /** Who of `names` is pinned on a show's Line-up. */
  const openPins = useCallback(
    (scenario: Scenario, names: readonly string[]): ReadonlySet<string> => {
      const pinned = pinsOf(scenario);
      return new Set(names.filter((name) => pinned.has(name)));
    },
    [pinsOf],
  );

  /** Pins today's `pinned` of `names`, and keeps everyone else's pins as they were. */
  const changePins = useCallback(
    (scenario: Scenario, names: readonly string[], pinned: ReadonlySet<string>) => {
      const others = [...pinsOf(scenario)].filter((name) => !names.includes(name));
      const stored = new Set([...others, ...names.filter((name) => pinned.has(name))]);
      setKeptPins(new Map(keptPins).set(scenario.id, stored));
      writeJson(pinsKey(scenario.id), [...stored]);
    },
    [keptPins, pinsOf],
  );

  return { open, change: save, openTheme, changeTheme, openPins, changePins };
}
