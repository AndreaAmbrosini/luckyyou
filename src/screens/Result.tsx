import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Button } from '../ui/Button';
import { RunAgainIcon } from '../ui/icons';
import { useFitText } from '../ui/useFitText';
import styles from './Result.module.css';
import type { Run } from './ShowScreen';
import { LAST_WAH, playTaDa } from './taDa';

export interface ResultProps {
  run: Run;
  onRunAgain(): void;
  onRunWithout(): void;
  onChangeWhosIn(): void;
}

const STAR = 'M12 1.5l2.6 7.1 7.4.3-5.8 4.6 2 7.2L12 16.6l-6.2 4.1 2-7.2L2 8.9l7.4-.3z';
/** The logo's four-point sparkle. */
const SPARKLE = 'M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6-2.6 7.9-2.6-7.9-7.9-2.6 7.9-2.6z';

/**
 * When each part of the news comes in, in seconds after the result opens:
 * the card drops, the name lands with the ta-da, the trombone deflates, and
 * the ribbon's bad news lands with its last wah. The buttons come last.
 */
function reveal() {
  const landed = 0.95;
  const deflates = 1.5;
  const ribbon = deflates + LAST_WAH;
  return {
    card: 0,
    lucky: 0.35,
    // It hits the card 0.29 s into its 0.45 s stamp: as the ta-da's chord lands.
    name: landed - 0.29,
    landed,
    deflates,
    ribbon,
    buttons: ribbon + 0.45,
  };
}

type Reveal = ReturnType<typeof reveal>;

/** With reduced motion, everything is simply there. */
const AT_ONCE: Reveal = {
  card: 0,
  lucky: 0,
  name: 0,
  landed: 0,
  deflates: 0,
  ribbon: 0,
  buttons: 0,
};

/** A part that comes in `seconds` after the result opens. */
const at = (seconds: number) => ({ '--at': `${seconds}s` }) as CSSProperties;

/** Flat paper confetti, spread by fixed steps so every result's shower looks alike. */
const CONFETTI = Array.from({ length: 34 }, (_, index) => {
  const step = (by: number) => ((index + 1) * by) % 1;
  return {
    left: `${(step(0.618034) * 100).toFixed(1)}%`,
    delay: `${(step(0.414214) * 0.8).toFixed(2)}s`,
    fall: `${(2.6 + step(0.732051) * 1.4).toFixed(2)}s`,
    drift: `${((step(0.236068) - 0.5) * 14).toFixed(2)}rem`,
    spin: `${Math.round((step(0.302776) - 0.5) * 900)}deg`,
    colour: (['marigold', 'tomato', 'mint', 'soft'] as const)[index % 4]!,
    shape: index % 3 === 0 ? 'streamer' : 'chip',
  };
});

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Winning is losing: the person picked gets the job, and a congratulation. */
export function Result({ run, onRunAgain, onRunWithout, onChangeWhosIn }: ResultProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const name = useFitText<HTMLSpanElement>(run.unlucky);
  const reasonId = useId();
  const [still] = useState(prefersReducedMotion);

  const { scenario, unlucky } = run;
  const times = still ? AT_ONCE : reveal();

  useEffect(() => heading.current?.focus(), [run]);

  // The ta-da lands with the name; the trombone comes with the bad news.
  useEffect(() => {
    const { landed, deflates } = still ? { landed: 0.3, deflates: 1.1 } : reveal();
    return playTaDa({ muted: run.muted, landsAt: landed, deflatesAt: deflates });
  }, [run, still]);

  const tooFew =
    run.names.length - 1 < scenario.people.min
      ? `${scenario.name} needs at least ${scenario.people.min} people.`
      : null;

  return (
    <main className={styles.result}>
      {!still && (
        <div className={styles.confetti} data-confetti aria-hidden="true" style={at(times.landed)}>
          {CONFETTI.map((bit, index) => (
            <span
              key={index}
              className={`${styles.bit} ${styles[bit.shape]} ${styles[bit.colour]}`}
              style={
                {
                  '--x': bit.left,
                  '--delay': bit.delay,
                  '--fall': bit.fall,
                  '--drift': bit.drift,
                  '--spin': bit.spin,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className={styles.sky} aria-hidden="true" style={at(times.landed)}>
        {['s1', 's2', 's3'].map((star, index) => (
          <svg
            key={star}
            className={`${styles.star} ${styles[star]}`}
            style={{ '--n': index } as CSSProperties}
            viewBox="0 0 24 24"
          >
            <path d={STAR} />
          </svg>
        ))}
        {['k1', 'k2', 'k3', 'k4'].map((sparkle, index) => (
          <svg
            key={sparkle}
            className={`${styles.sparkle} ${styles[sparkle]}`}
            style={{ '--n': index + 3 } as CSSProperties}
            viewBox="0 0 24 24"
          >
            <path d={SPARKLE} />
          </svg>
        ))}
      </div>

      <div className={styles.card} style={at(times.card)}>
        <h1 ref={heading} className={styles.heading} tabIndex={-1}>
          <span className={styles.lucky} style={at(times.lucky)}>
            Lucky you,
          </span>{' '}
          <span ref={name} className={styles.name} dir="auto" style={at(times.name)}>
            {unlucky} 🎉
          </span>
        </h1>
        <p className={styles.ribbon} style={at(times.ribbon)}>
          Sorry for your win
        </p>
      </div>

      <div className={styles.actions} style={at(times.buttons)}>
        <Button variant="primary" onClick={onRunAgain}>
          <RunAgainIcon />
          Run again
        </Button>
        <Button
          variant="outline"
          aria-disabled={tooFew ? true : undefined}
          aria-describedby={tooFew ? reasonId : undefined}
          onClick={() => {
            if (!tooFew) onRunWithout();
          }}
        >
          Run again without {unlucky}
        </Button>
        <Button variant="quiet" onClick={onChangeWhosIn}>
          Change who's in
        </Button>
      </div>
      {tooFew && (
        <p id={reasonId} className={styles.reason} style={at(times.buttons)}>
          {tooFew}
        </p>
      )}
    </main>
  );
}
