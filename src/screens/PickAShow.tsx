import { useEffect, useId, useRef } from 'react';
import type { Scenario } from '../scenario-kit/contract';
import { Button } from '../ui/Button';
import { ArrowLeftIcon } from '../ui/icons';
import layout from './layout.module.css';
import styles from './PickAShow.module.css';

export interface PickAShowProps {
  /** Today's people, in the list's order. */
  names: readonly string[];
  scenarios: readonly Scenario[];
  /** The id of the show played last time, if any. */
  lastScenario: string | null;
  onBack(): void;
  onStart(scenario: Scenario): void;
}

const ART = [styles.art0, styles.art1, styles.art2];

/** Step 2: one click on a show starts it. */
export function PickAShow({ names, scenarios, lastScenario, onBack, onStart }: PickAShowProps) {
  const id = useId();
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const noShow = useRef<HTMLParagraphElement>(null);

  const count = names.length;
  const canRun = (scenario: Scenario) =>
    count >= scenario.people.min && count <= scenario.people.max;
  const runnable = scenarios.filter(canRun);
  const ready = runnable.find((scenario) => scenario.id === lastScenario) ?? runnable[0];

  // The show to play is one key press away.
  useEffect(() => {
    (ready ? cards.current.get(ready.id) : noShow.current)?.focus();
    // Only on arrival: later clicks move the focus as the user wants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={layout.main}>
      <div className={layout.titleRow}>
        <div className={layout.group}>
          <Button onClick={onBack}>
            <ArrowLeftIcon size={20} />
            Who's in
          </Button>
          <h1 className={layout.heading}>Pick a show</h1>
        </div>
      </div>
      <p className={styles.whoIsIn}>
        <span className={layout.pill}>{count} in</span> <span dir="auto">{names.join(', ')}</span>
      </p>

      <ul className={styles.cards}>
        {scenarios.map((scenario, index) => {
          const runs = canRun(scenario);
          const nameId = `${id}-${scenario.id}-name`;
          const aboutId = `${id}-${scenario.id}-about`;
          const badgeId = `${id}-${scenario.id}-badge`;
          const last = runs && scenario.id === lastScenario;
          return (
            <li key={scenario.id} className={styles.slot}>
              <button
                ref={(card) => {
                  if (card) cards.current.set(scenario.id, card);
                  else cards.current.delete(scenario.id);
                }}
                type="button"
                className={styles.card}
                aria-disabled={runs ? undefined : true}
                aria-labelledby={nameId}
                aria-describedby={last || !runs ? `${aboutId} ${badgeId}` : aboutId}
                onClick={() => {
                  if (runs) onStart(scenario);
                }}
              >
                <span className={`${styles.art} ${ART[index % ART.length]}`} aria-hidden="true">
                  {'emoji' in scenario.card ? (
                    scenario.card.emoji
                  ) : (
                    <img src={scenario.card.image} alt="" />
                  )}
                </span>
                <span id={nameId} className={styles.name}>
                  {scenario.name}
                </span>
                <span id={aboutId} className={styles.about}>
                  {scenario.description}
                </span>
                {last && (
                  <span id={badgeId} className={`${styles.badge} ${styles.last}`}>
                    Last time
                  </span>
                )}
                {!runs && (
                  <span id={badgeId} className={`${styles.badge} ${styles.cannot}`}>
                    {count > scenario.people.max
                      ? `Takes at most ${scenario.people.max} people`
                      : `Takes at least ${scenario.people.min} people`}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <footer className={layout.footer}>
        {ready ? (
          <p className={layout.say}>Click a show to start it.</p>
        ) : (
          <p ref={noShow} className={layout.note} role="status" tabIndex={-1}>
            No show can run with {count} people.
          </p>
        )}
      </footer>
    </main>
  );
}
