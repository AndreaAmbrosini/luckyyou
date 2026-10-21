import { useEffect, useId, useRef } from 'react';
import { Button } from '../ui/Button';
import { RunAgainIcon } from '../ui/icons';
import { useFitText } from '../ui/useFitText';
import styles from './Result.module.css';
import type { Run } from './ShowScreen';

export interface ResultProps {
  run: Run;
  onRunAgain(): void;
  onRunWithout(): void;
  onChangeWhosIn(): void;
}

const STAR = 'M12 1.5l2.6 7.1 7.4.3-5.8 4.6 2 7.2L12 16.6l-6.2 4.1 2-7.2L2 8.9l7.4-.3z';

/** Winning is losing: the person picked gets the job, and a congratulation. */
export function Result({ run, onRunAgain, onRunWithout, onChangeWhosIn }: ResultProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const name = useFitText<HTMLSpanElement>(run.unlucky);
  const reasonId = useId();

  useEffect(() => heading.current?.focus(), [run]);

  const { scenario, unlucky } = run;
  const tooFew =
    run.names.length - 1 < scenario.people.min
      ? `${scenario.name} needs at least ${scenario.people.min} people.`
      : null;

  return (
    <main className={styles.result}>
      <div className={styles.sky} aria-hidden="true">
        {['c1', 'c2', 'c3', 'c4', 'c5'].map((cloud) => (
          <span key={cloud} className={`${styles.cloud} ${styles[cloud]}`} />
        ))}
        {['s1', 's2', 's3'].map((star) => (
          <svg key={star} className={`${styles.star} ${styles[star]}`} viewBox="0 0 24 24">
            <path d={STAR} />
          </svg>
        ))}
      </div>

      <div className={styles.card}>
        <h1 ref={heading} className={styles.heading} tabIndex={-1}>
          <span className={styles.lucky}>Lucky you,</span>{' '}
          <span ref={name} className={styles.name} dir="auto">
            {unlucky} 🎉
          </span>
        </h1>
        <p className={styles.ribbon}>Sorry for your win</p>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onRunAgain}>
          <RunAgainIcon />
          Run again
        </Button>
        <Button
          aria-disabled={tooFew ? true : undefined}
          aria-describedby={tooFew ? reasonId : undefined}
          className={styles.big}
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
        <p id={reasonId} className={styles.reason}>
          {tooFew}
        </p>
      )}
    </main>
  );
}
