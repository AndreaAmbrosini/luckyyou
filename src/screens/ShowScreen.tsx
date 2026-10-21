import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Scenario } from '../scenario-kit/contract';
import { runScenario, type RunOutcome } from '../scenario-kit/run';
import styles from './ShowScreen.module.css';

/** One show: who is in it, and the pick the app made before it started. */
export interface Run {
  readonly scenario: Scenario;
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
}

export interface ShowScreenProps {
  run: Run;
  onEnd(outcome: RunOutcome): void;
}

/** Hands the scenario the whole window for one run. */
export function ShowScreen({ run, onEnd }: ShowScreenProps) {
  const host = useRef<HTMLDivElement>(null);
  const end = useRef(onEnd);

  useLayoutEffect(() => {
    end.current = onEnd;
  });

  useEffect(() => {
    const controller = new AbortController();
    void runScenario(run.scenario, {
      host: host.current!,
      names: run.names,
      unlucky: run.unlucky,
      seed: run.seed,
      signal: controller.signal,
    }).then((outcome) => {
      if (!controller.signal.aborted) end.current(outcome);
    });
    return () => controller.abort();
  }, [run]);

  return <div ref={host} className={styles.host} />;
}
