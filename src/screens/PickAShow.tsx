import { Fragment, useEffect, useId, useRef } from 'react';
import type { Scenario } from '../scenario-kit/contract';
import { Button } from '../ui/Button';
import { ArrowRightIcon, CheckIcon, PlayIcon } from '../ui/icons';
import { Bar } from './Bar';
import layout from './layout.module.css';
import styles from './PickAShow.module.css';

export interface PickAShowProps {
  /** Today's people, in the list's order. */
  names: readonly string[];
  scenarios: readonly Scenario[];
  /** The id of the show played last time, if any. */
  lastScenario: string | null;
  /** The chosen show; none when no show can run with today's people. */
  chosen: Scenario | undefined;
  onChoose(scenario: Scenario): void;
  onBack(): void;
  /** Starts a show without a line-up, or opens a show's Line-up. */
  onNext(scenario: Scenario): void;
  /** Starts a show with a line-up on the looks and theme it was last left on. */
  onStartWithLastLineUp(scenario: Scenario): void;
}

const ART = [styles.art0, styles.art1, styles.art2];

/** Step 2: clicking a show chooses it; the bar's main button starts it, or opens its Line-up. */
export function PickAShow(props: PickAShowProps) {
  const { names, scenarios, lastScenario, chosen, onChoose, onBack } = props;
  const { onNext, onStartWithLastLineUp } = props;
  const id = useId();
  const main = useRef<HTMLButtonElement>(null);
  const noShow = useRef<HTMLParagraphElement>(null);

  const count = names.length;
  const canRun = (scenario: Scenario) =>
    count >= scenario.people.min && count <= scenario.people.max;

  // The chosen show is one key press away.
  useEffect(() => {
    (chosen ? main.current : noShow.current)?.focus();
    // Only on arrival: later clicks move the focus as the user wants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <main className={layout.main}>
        <div className={layout.titleRow}>
          <div className={layout.group}>
            <h1 className={layout.heading}>Pick a show</h1>
            <p className={styles.whoIsIn}>
              <span className={layout.pill}>{count} in</span>{' '}
              {names.map((name, index) => (
                <Fragment key={index}>
                  {index > 0 && ', '}
                  <span dir="auto">{name}</span>
                </Fragment>
              ))}
            </p>
          </div>
        </div>

        <ul className={styles.cards} aria-label="Shows">
          {scenarios.map((scenario, index) => {
            const runs = canRun(scenario);
            const nameId = `${id}-${scenario.id}-name`;
            const aboutId = `${id}-${scenario.id}-about`;
            const badgeId = `${id}-${scenario.id}-badge`;
            const last = runs && scenario.id === lastScenario;
            const on = scenario === chosen;
            const { min, max } = scenario.people;
            return (
              <li key={scenario.id} className={styles.slot}>
                <button
                  type="button"
                  className={styles.card}
                  aria-pressed={runs ? on : undefined}
                  aria-disabled={runs ? undefined : true}
                  aria-labelledby={nameId}
                  aria-describedby={last || !runs ? `${aboutId} ${badgeId}` : aboutId}
                  onClick={() => {
                    if (runs) onChoose(scenario);
                  }}
                >
                  {on && (
                    <span className={styles.check} data-check>
                      <CheckIcon size={24} />
                    </span>
                  )}
                  <span className={styles.top}>
                    <span className={`${styles.art} ${ART[index % ART.length]}`} aria-hidden="true">
                      {'emoji' in scenario.card ? (
                        scenario.card.emoji
                      ) : (
                        <img src={scenario.card.image} alt="" />
                      )}
                    </span>
                    {last && (
                      <span id={badgeId} className={`${styles.badge} ${styles.last}`}>
                        Last time
                      </span>
                    )}
                  </span>
                  <span id={nameId} className={styles.name}>
                    {scenario.name}
                  </span>
                  <span id={aboutId} className={styles.about}>
                    {scenario.description}
                  </span>
                  <span className={styles.tags}>
                    {!runs && (
                      <span id={badgeId} className={`${styles.badge} ${styles.cannot}`}>
                        {count > max
                          ? `Takes at most ${max} people`
                          : `Takes at least ${min} people`}
                      </span>
                    )}
                    <span className={styles.badge}>{min === max ? min : `${min}–${max}`}</span>
                    {scenario.lineUp && <span className={styles.badge}>+ Line-up</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {chosen && <Chosen id={`${id}-chosen`} scenario={chosen} count={count} />}
      </main>

      <Bar back={{ label: "Who's in", onClick: onBack }}>
        <div className={layout.end}>
          {!chosen && (
            <p ref={noShow} id={`${id}-reason`} className={layout.note} role="status" tabIndex={-1}>
              No show can run with {count} people.
            </p>
          )}
          {chosen?.lineUp && (
            <Button onClick={() => onStartWithLastLineUp(chosen)}>Start with last line-up</Button>
          )}
          <Button
            ref={main}
            variant="primary"
            aria-disabled={chosen ? undefined : true}
            aria-describedby={chosen ? undefined : `${id}-reason`}
            onClick={() => {
              if (chosen) onNext(chosen);
            }}
          >
            {chosen?.lineUp ? (
              <>
                Next: {lowerFirst(chosen.lineUp.heading)}
                <ArrowRightIcon size={26} />
              </>
            ) : (
              <>
                {chosen ? `Start ${chosen.name}` : 'Start'}
                <PlayIcon size={24} />
              </>
            )}
          </Button>
        </div>
      </Bar>
    </>
  );
}

/** The panel under the shows: what the chosen show is, what it takes, and what comes next. */
function Chosen({ id, scenario, count }: { id: string; scenario: Scenario; count: number }) {
  const { min, max } = scenario.people;
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <div className={styles.panelText}>
        <h2 id={id} className={styles.panelName}>
          {scenario.name}
        </h2>
        <p className={styles.panelAbout}>{scenario.description}</p>
      </div>
      <ul className={styles.facts}>
        <li className={styles.fact}>
          <span className={`${styles.factMark} ${styles.fine}`} aria-hidden="true">
            <CheckIcon size={22} />
          </span>
          Takes {min === max ? min : `${min} to ${max}`} people. You have {count}.
        </li>
        <li className={styles.fact}>
          <span className={styles.factMark} aria-hidden="true">
            <ArrowRightIcon size={22} />
          </span>
          {scenario.lineUp ? (
            <span>
              Next you choose how everyone looks on its <span className={styles.word}>Line-up</span>
              , or start with the last <span className={styles.word}>line-up</span>.
            </span>
          ) : (
            'No line-up: it starts as soon as you press Start.'
          )}
        </li>
      </ul>
    </section>
  );
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
