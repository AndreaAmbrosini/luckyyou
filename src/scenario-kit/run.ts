import { gsap } from 'gsap';
import { SHOW_LENGTH, type ChosenLook, type Scenario, type Show } from './contract';
import { dealLooks, drawTheme, freezeLooks, themeNamed } from './line-up';
import { createRandom } from './random';
import { createSound } from './sound';
import { buildStage } from './stage';
import { createCaptions } from './text';
import { play, wait } from './time';
import { token } from './tokens';

export type RunOutcome = 'finished' | 'failed' | 'cancelled';

export interface RunOptions {
  /** The element the show fills; the run adds its stage here and takes it away after. */
  readonly host: HTMLElement;
  readonly names: readonly string[];
  readonly unlucky: string;
  /**
   * Each person's look from the Line-up. For a show with a line-up that is
   * given none, as in the lab, looks are dealt from the seed.
   */
  readonly looks?: ReadonlyMap<string, ChosenLook>;
  /**
   * The theme from the Line-up. For a show with themes that is given none,
   * or one it doesn't offer, as in the lab, one is drawn from the seed.
   */
  readonly theme?: string;
  readonly seed: number;
  readonly muted: boolean;
  /**
   * The music's volume, 0 to 1; 0 when the music is off. Given as a function,
   * it is read as the music plays, so the volume can change during the show.
   */
  readonly music: number | (() => number);
  /** Aborting it stops the show at once. */
  readonly signal: AbortSignal;
  /** Warns on the console when a show leaves 10–30 s. On in the dev server. */
  readonly development?: boolean;
  /** Less motion; the browser's prefers-reduced-motion unless given. */
  readonly reducedMotion?: boolean;
}

/** Plays one show of `scenario` in `host`, for a pick the app already made. */
export async function runScenario(scenario: Scenario, options: RunOptions): Promise<RunOutcome> {
  const {
    signal,
    development = import.meta.env.MODE === 'development',
    reducedMotion = prefersReducedMotion(),
  } = options;
  const animations = claimAnimations();
  const frame = buildStage(options.host);
  const sound = createSound({ muted: options.muted, music: options.music });

  // Frozen, so the show can't change what it was handed.
  const show: Show = Object.freeze<Show>({
    stage: frame.stage,
    names: Object.freeze([...options.names]),
    unlucky: options.unlucky,
    looks: freezeLooks(lookFor(scenario, options)),
    theme: themeFor(scenario, options),
    random: createRandom(options.seed),
    signal,
    reducedMotion,
    sound: sound.player,
    wait: (seconds) => wait(seconds, signal),
    play: (animation) => play(animation, signal),
    caption: createCaptions(frame.overlay, frame.live, signal),
  });

  // A scenario may ignore the signal; the run doesn't wait for it once aborted.
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });

  try {
    // Shows measure their text, so the page's fonts must be in first.
    await Promise.race([stageFonts(options.names), aborted]);
    if (signal.aborted) return 'cancelled';
    const startedAt = gsap.globalTimeline.time();
    const playing = new Promise<void>((resolve) => resolve(scenario.play(show)));
    // Once cancelled, whatever the show does next is no longer anyone's concern.
    playing.catch(() => undefined);

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
    frame.remove();
  }
}

/**
 * Loads the fonts a stage sets names and captions in, for the characters in
 * `names`, then waits for any other font still loading. A face the page
 * hasn't used yet isn't loading, so waiting for `ready` alone would let a
 * show measure its names in a fallback font.
 */
async function stageFonts(names: readonly string[]): Promise<void> {
  const fonts = document.fonts;
  if (!fonts) return;
  const text = names.join(' ');
  try {
    await Promise.all([
      fonts.load?.(`900 1em ${token('--font-body')}`, text),
      fonts.load?.(`1em ${token('--font-display')}`, text),
    ]);
  } catch {
    // A font that can't load leaves the fallback; the show still runs.
  }
  await fonts.ready;
}

/** A seed's draws for looks, apart from the show's own, so one doesn't shift the other. */
const LOOKS_SEED = 0x6c6f6f6b;

function lookFor(scenario: Scenario, { looks, names, seed }: RunOptions) {
  if (looks) return looks;
  if (!scenario.lineUp) return new Map<string, ChosenLook>();
  return dealLooks(scenario.lineUp, names, createRandom(seed ^ LOOKS_SEED));
}

/** And for the theme, apart from both. */
const THEME_SEED = 0x7468656d;

function themeFor(scenario: Scenario, { theme, seed }: RunOptions) {
  const lineUp = scenario.lineUp;
  if (!lineUp?.themes) return null;
  return themeNamed(lineUp, theme)?.name ?? drawTheme(lineUp, createRandom(seed ^ THEME_SEED));
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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
