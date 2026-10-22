import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Scenario } from '../scenario-kit/contract';
import { runScenario } from '../scenario-kit/run';
import { isFullscreen } from '../ui/fullscreen';
import styles from './ShowScreen.module.css';

/** A show that hasn't ended by then is stopped, and the result comes anyway. */
export const SHOW_TIME_LIMIT_MS = 25_000;

/** One show: who is in it, and the pick the app made before it started. */
export interface Run {
  readonly scenario: Scenario;
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
  readonly muted: boolean;
}

export interface ShowScreenProps {
  run: Run;
  /** The show is over, finished or not: time for the result. */
  onFinish(): void;
  /** Esc, or leaving fullscreen: back to picking a show, with no result. */
  onCancel(): void;
}

/** Hands the scenario the whole window for one run. */
export function ShowScreen({ run, onFinish, onCancel }: ShowScreenProps) {
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onFinish, onCancel });

  useLayoutEffect(() => {
    handlers.current = { onFinish, onCancel };
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let gone = false;
    const cancel = () => {
      cancelled = true;
      controller.abort();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    const startedInFullscreen = isFullscreen();
    const onFullscreenChange = () => {
      if (startedInFullscreen && !isFullscreen()) cancel();
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    const watchdog = window.setTimeout(() => controller.abort(), SHOW_TIME_LIMIT_MS);

    void runScenario(run.scenario, {
      host: host.current!,
      names: run.names,
      unlucky: run.unlucky,
      seed: run.seed,
      muted: run.muted,
      signal: controller.signal,
    }).then(() => {
      if (gone) return;
      if (cancelled) handlers.current.onCancel();
      else handlers.current.onFinish();
    });

    return () => {
      gone = true;
      controller.abort();
      window.clearTimeout(watchdog);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [run]);

  return <div ref={host} className={styles.host} />;
}
