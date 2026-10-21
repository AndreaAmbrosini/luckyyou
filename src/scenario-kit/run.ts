import { gsap } from 'gsap';
import { SHOW_LENGTH, type Scenario, type Show } from './contract';
import { createRandom } from './random';
import { createSound } from './sound';
import { play, wait } from './time';

export type RunOutcome = 'finished' | 'failed' | 'cancelled';

export interface RunOptions {
  /** The element the show draws in; the run adds its stage here and takes it away after. */
  readonly host: HTMLElement;
  readonly names: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
  readonly muted: boolean;
  /** Aborting it stops the show at once. */
  readonly signal: AbortSignal;
  /** Warns on the console when a show leaves 10–15 s. On in the dev server. */
  readonly development?: boolean;
}

/** Plays one show of `scenario` in `host`, for a pick the app already made. */
export async function runScenario(scenario: Scenario, options: RunOptions): Promise<RunOutcome> {
  const { signal, development = import.meta.env.MODE === 'development' } = options;
  const animations = claimAnimations();
  const startedAt = gsap.globalTimeline.time();
  const stage = document.createElement('div');
  stage.dataset.kit = 'stage';
  options.host.append(stage);
  const sound = createSound({ muted: options.muted });

  const show: Show = {
    stage,
    names: Object.freeze([...options.names]),
    unlucky: options.unlucky,
    random: createRandom(options.seed),
    signal,
    sound: sound.player,
    wait: (seconds) => wait(seconds, signal),
    play: (animation) => play(animation, signal),
  };

  // A scenario may ignore the signal; the run doesn't wait for it once aborted.
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
  const playing = new Promise<void>((resolve) => resolve(scenario.play(show)));
  // Once cancelled, whatever the show does next is no longer anyone's concern.
  playing.catch(() => undefined);

  try {
    await Promise.race([playing, aborted]);
    if (signal.aborted) return 'cancelled';
    if (development) warnIfOffTime(scenario, gsap.globalTimeline.time() - startedAt);
    return 'finished';
  } catch (error) {
    if (signal.aborted) return 'cancelled';
    console.error(`${scenario.name} failed:`, error);
    return 'failed';
  } finally {
    animations.release();
    sound.stop();
    stage.replaceChildren();
    stage.remove();
  }
}

function warnIfOffTime(scenario: Scenario, seconds: number) {
  if (seconds >= SHOW_LENGTH.min && seconds <= SHOW_LENGTH.max) return;
  console.warn(
    `${scenario.name} lasted ${seconds.toFixed(1)} s. ` +
      `A show must last ${SHOW_LENGTH.min} to ${SHOW_LENGTH.max} s.`,
  );
}

interface Claim {
  /** What was on GSAP's root timeline when the run started. */
  readonly before: ReadonlySet<gsap.core.Animation>;
  /** The run's animations, once another run has started. */
  made: gsap.core.Animation[] | null;
}

const claims = new Set<Claim>();

const rootAnimations = () => gsap.globalTimeline.getChildren(false, true, true);
const madeSince = (before: ReadonlySet<gsap.core.Animation>) =>
  rootAnimations().filter((animation) => !before.has(animation));

/**
 * Counts every animation added to GSAP's root from now on as this run's, so
 * the run can kill them all when it ends, however the scenario made them.
 * A run that starts while another is still ending (React's StrictMode does
 * this) closes the other's count, so neither kills the other's animations.
 */
function claimAnimations() {
  for (const other of claims) other.made ??= madeSince(other.before);
  const claim: Claim = { before: new Set(rootAnimations()), made: null };
  claims.add(claim);
  return {
    release() {
      claims.delete(claim);
      for (const animation of claim.made ?? madeSince(claim.before)) animation.kill();
    },
  };
}
