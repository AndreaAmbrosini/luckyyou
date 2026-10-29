// Everyone's look on each show's Line-up (decision 0011), held for the visit.

import { useCallback, useState } from 'react';
import type { ChosenLook, Scenario } from '../scenario-kit/contract';
import { dealLooks, fitLook } from '../scenario-kit/line-up';

type Looks = ReadonlyMap<string, ChosenLook>;

/** Each show's looks by name, everyone's who has been on its Line-up. */
type Kept = ReadonlyMap<string, Readonly<Record<string, ChosenLook>>>;

/**
 * Today's looks on a show's Line-up, and a way to change them. Opening a
 * show's Line-up keeps each person's look, with any choice the show no
 * longer offers drawn again, and deals newcomers one at random.
 */
export function useLooks() {
  const [kept, setKept] = useState<Kept>(new Map());

  const open = useCallback(
    (scenario: Scenario, names: readonly string[]): Looks => {
      const lineUp = scenario.lineUp!;
      const before = kept.get(scenario.id) ?? {};
      const looks = new Map<string, ChosenLook>();
      for (const name of names) {
        const look = fitLook(lineUp, before[name], Math.random);
        if (look) looks.set(name, look);
      }
      const newcomers = names.filter((name) => !looks.has(name));
      const dealt = dealLooks(lineUp, newcomers, Math.random);
      const today = new Map(names.map((name) => [name, looks.get(name) ?? dealt.get(name)!]));
      setKept((current) => withLooks(current, scenario.id, today));
      return today;
    },
    [kept],
  );

  const change = useCallback((scenario: Scenario, today: Looks) => {
    setKept((current) => withLooks(current, scenario.id, today));
  }, []);

  return { open, change };
}

function withLooks(kept: Kept, id: string, today: Looks): Kept {
  const next = new Map(kept);
  next.set(id, { ...kept.get(id), ...Object.fromEntries(today) });
  return next;
}
