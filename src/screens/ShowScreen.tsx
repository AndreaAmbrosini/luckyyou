import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChosenLook, Scenario } from '../scenario-kit/contract';
import { runScenario } from '../scenario-kit/run';
import { isFullscreen } from '../ui/fullscreen';
import styles from './ShowScreen.module.css';

/** A show that hasn't ended by then is stopped, and the result comes anyway. */
export const SHOW_TIME_LIMIT_MS = 35_000;

/** How long the music badge stays up after a key changes the music. */
const BADGE_MS = 1000;
/** How far one press of an arrow key moves the music's volume, in percent. */
const VOLUME_STEP = 5;

/** One show: who is in it, and the pick the app made before it started. */
export interface Run {
  readonly scenario: Scenario;
  readonly names: readonly string[];
  readonly unlucky: string;
  /** Everyone's look from the Line-up; the lab leaves it out, and looks come from the seed. */
  readonly looks?: ReadonlyMap<string, ChosenLook>;
  readonly seed: number;
  readonly muted: boolean;
  /** The music's volume, 0 to 1; 0 when the music is off. */
  readonly music: number;
}

/** The music's settings, as the header's music panel sets them. */
export interface MusicSettings {
  readonly music: boolean;
  /** In percent, 0 to 100, a whole number. */
  readonly musicVolume: number;
}

export interface ShowScreenProps {
  run: Run;
  /** The show is over, finished or not: time for the result. */
  onFinish(): void;
  /** Esc, or leaving fullscreen: back to picking a show, with no result. */
  onCancel(): void;
  /**
   * The music's settings, which ↑, ↓ and M change during the show unless the
   * sound is off. Without them, those keys do nothing.
   */
  music?: MusicSettings;
  onMusicChange?(settings: MusicSettings): void;
}

/** Hands the scenario the whole window for one run. */
export function ShowScreen({ run, onFinish, onCancel, music, onMusicChange }: ShowScreenProps) {
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onFinish, onCancel, onMusicChange });
  /** The music as the keys have left it; the show reads its level as it plays. */
  const tuned = useRef({ settings: music, level: run.music });
  const [badge, setBadge] = useState<string | null>(null);

  useLayoutEffect(() => {
    handlers.current = { onFinish, onCancel, onMusicChange };
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let gone = false;
    let badgeTimer: number | undefined;
    const cancel = () => {
      cancelled = true;
      controller.abort();
    };

    /** ↑ and ↓ move the music's volume, and turn it on; M turns it off and on. */
    const tune = (key: string) => {
      const current = tuned.current.settings;
      if (!current || run.muted) return false;
      const step = { ArrowUp: VOLUME_STEP, ArrowDown: -VOLUME_STEP }[key];
      const next =
        step !== undefined
          ? { music: true, musicVolume: Math.min(100, Math.max(0, current.musicVolume + step)) }
          : key.toLowerCase() === 'm'
            ? { ...current, music: !current.music }
            : null;
      if (!next) return false;
      tuned.current = { settings: next, level: next.music ? next.musicVolume / 100 : 0 };
      handlers.current.onMusicChange?.(next);
      setBadge(next.music ? `♪ ${next.musicVolume}%` : '♪ off');
      window.clearTimeout(badgeTimer);
      badgeTimer = window.setTimeout(() => setBadge(null), BADGE_MS);
      return true;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
      else if (tune(event.key)) event.preventDefault();
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
      looks: run.looks,
      seed: run.seed,
      muted: run.muted,
      music: () => tuned.current.level,
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
      window.clearTimeout(badgeTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [run]);

  return (
    <div ref={host} className={styles.host}>
      {badge && (
        <p className={styles.badge} role="status">
          {badge}
        </p>
      )}
    </div>
  );
}
