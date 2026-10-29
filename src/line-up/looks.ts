// Everyone's look on each show's Line-up, kept in this browser per show
// (decision 0011) and read so that storage that is blocked, full or damaged
// never stops the Line-up (decision 0004).

import { useCallback, useState } from 'react';
import type { ChosenLook, Scenario } from '../scenario-kit/contract';
import { dealLooks, fitLook } from '../scenario-kit/line-up';
import { readJson, writeJson } from '../storage';

export const looksKey = (id: string) => `luckyyou:v1:line-up:${id}`;

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

  return { open, change: save };
}
