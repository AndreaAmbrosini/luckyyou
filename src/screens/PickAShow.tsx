import { Fragment, useEffect, useId, useRef } from 'react';
import type { LineUp, Scenario } from '../scenario-kit/contract';
import { Button } from '../ui/Button';
import { ArrowRightIcon, CheckIcon, PeopleIcon, PlayIcon } from '../ui/icons';
import { Bar } from './Bar';
import { SurpriseStill } from './SurpriseStill';
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
  /** Surprise me is chosen: the app draws the show as it starts. */
  surprise: boolean;
  onChoose(scenario: Scenario): void;
  onSurprise(): void;
  onBack(): void;
  /** Starts a show without a line-up, or opens a show's Line-up. */
  onNext(scenario: Scenario): void;
  /** Draws a show and starts it, skipping any line-up. */
  onStartSurprise(): void;
  /** Starts a show with a line-up on the looks and theme it was last left on. */
  onStartWithLastLineUp(scenario: Scenario): void;
}

/** Surprise me's name, as the card, the panel and the steps show it. */
export const SURPRISE = 'Surprise me';
const SURPRISE_ABOUT = 'Even you won’t know which show.';

/** Step 2: clicking a show chooses it; the bar's main button starts it, or opens its Line-up. */
export function PickAShow(props: PickAShowProps) {
  const { names, scenarios, lastScenario, chosen, surprise, onChoose, onBack } = props;
  const { onNext, onSurprise, onStartSurprise, onStartWithLastLineUp } = props;
  const id = useId();
  const main = useRef<HTMLButtonElement>(null);
  const noShow = useRef<HTMLParagraphElement>(null);

  const count = names.length;
  const canRun = (scenario: Scenario) =>
    count >= scenario.people.min && count <= scenario.people.max;
  // What Surprise me draws from: the shows that can run, but last time's.
  const runnable = scenarios.filter(canRun);
  const last = runnable.find(({ id }) => id === lastScenario);
  const pool = last && runnable.length > 1 ? runnable.length - 1 : runnable.length;

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
            <h1 className={`${layout.heading} ${styles.heading}`}>Pick a show</h1>
            <p className={styles.whoIsIn}>
              <span className={`${layout.pill} ${styles.count}`}>{count} in</span>{' '}
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
          {scenarios.map((scenario) => {
            const runs = canRun(scenario);
            const nameId = `${id}-${scenario.id}-name`;
            const aboutId = `${id}-${scenario.id}-about`;
            const badgeId = `${id}-${scenario.id}-badge`;
            const last = runs && scenario.id === lastScenario;
            const on = !surprise && scenario === chosen;
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
                      <CheckIcon size={26} />
                    </span>
                  )}
                  <span className={styles.still}>
                    <img src={scenario.still} alt="" />
                  </span>
                  {last && (
                    <span id={badgeId} className={`${styles.badge} ${styles.last}`}>
                      Last time
                    </span>
                  )}
                  <span className={styles.words}>
                    <span id={nameId} className={styles.name}>
                      {scenario.name}
                    </span>
                    <span id={aboutId} className={styles.about}>
                      {scenario.description}
                    </span>
                  </span>
                  <span className={styles.tags}>
                    {!runs && (
                      <span id={badgeId} className={`${styles.badge} ${styles.cannot}`}>
                        {count > max
                          ? `Takes at most ${max} people`
                          : `Takes at least ${min} people`}
                      </span>
                    )}
                    <span className={styles.badge}>
                      <PeopleIcon size={18} />
                      {peopleRange(scenario, '–')}
                    </span>
                    {scenario.lineUp && <span className={styles.badge}>+ Line-up</span>}
                  </span>
                </button>
              </li>
            );
          })}
          {scenarios.length > 1 && (
            <SurpriseCard
              id={`${id}-surprise`}
              runnable={runnable.length}
              pool={pool}
              on={surprise}
              onChoose={onSurprise}
            />
          )}
        </ul>

        {surprise ? (
          <Chosen
            id={`${id}-chosen`}
            name={SURPRISE}
            about={SURPRISE_ABOUT}
            fits={`One of ${pool} shows.${last ? ` Not ${last.name} again.` : ''}`}
            next="The show stays a secret until the curtain rises."
          />
        ) : (
          chosen && (
            <Chosen
              id={`${id}-chosen`}
              name={chosen.name}
              about={chosen.description}
              fits={`Takes ${peopleRange(chosen, ' to ')} people. You have ${count}.`}
              next={
                chosen.lineUp
                  ? `Next you pick ${nextPicks(chosen.lineUp)}, or start with last time's.`
                  : 'No line-up: it starts as soon as you press Start.'
              }
            />
          )
        )}
      </main>

      <Bar back={{ label: "Who's in", onClick: onBack }}>
        <div className={layout.end}>
          {!chosen && (
            <p ref={noShow} id={`${id}-reason`} className={layout.note} role="status" tabIndex={-1}>
              No show can run with {count} people.
            </p>
          )}
          {!surprise && chosen?.lineUp && (
            <Button variant="outline" onClick={() => onStartWithLastLineUp(chosen)}>
              Start with last line-up
            </Button>
          )}
          <Button
            ref={main}
            variant="primary"
            aria-disabled={chosen ? undefined : true}
            aria-describedby={chosen ? undefined : `${id}-reason`}
            onClick={() => {
              if (surprise) onStartSurprise();
              else if (chosen) onNext(chosen);
            }}
          >
            {surprise ? (
              <>
                Start a surprise
                <PlayIcon size={26} />
              </>
            ) : chosen?.lineUp ? (
              <>
                Next: {lowerFirst(chosen.lineUp.heading)}
                <ArrowRightIcon size={26} />
              </>
            ) : (
              <>
                {chosen ? `Start ${chosen.name}` : 'Start'}
                <PlayIcon size={26} />
              </>
            )}
          </Button>
        </div>
      </Bar>
    </>
  );
}

/**
 * The panel under the shows: the chosen show, or Surprise me, and its line;
 * why it can run, and what comes next. On a short screen, where the cards
 * leave their descriptions out, why it can run goes too: the chips say it.
 */
function Chosen({
  id,
  name,
  about,
  fits,
  next,
}: {
  id: string;
  name: string;
  about: string;
  /** Why it can run today. */
  fits: string;
  /** What pressing the main button does. */
  next: string;
}) {
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <h2 id={id} className={styles.panelName}>
        {name}
      </h2>
      <p className={styles.panelAbout}>{about}</p>
      <ul className={styles.facts}>
        <li className={`${styles.fact} ${styles.factFits}`}>
          <span className={`${styles.factMark} ${styles.fine}`} aria-hidden="true">
            <CheckIcon size={22} />
          </span>
          {fits}
        </li>
        <li className={styles.fact}>
          <span className={styles.factMark} aria-hidden="true">
            <ArrowRightIcon size={22} />
          </span>
          {next}
        </li>
      </ul>
    </section>
  );
}

/**
 * Surprise me, as a card after the shows': its own picture, and how many
 * shows it draws from. It needs two shows that can run.
 */
function SurpriseCard({
  id,
  runnable,
  pool,
  on,
  onChoose,
}: {
  id: string;
  /** How many shows can run today. */
  runnable: number;
  /** How many of them it draws from. */
  pool: number;
  on: boolean;
  onChoose(): void;
}) {
  const runs = runnable > 1;
  return (
    <li className={styles.slot} data-surprise>
      <button
        type="button"
        className={styles.card}
        aria-pressed={runs ? on : undefined}
        aria-disabled={runs ? undefined : true}
        aria-labelledby={`${id}-name`}
        aria-describedby={runs ? `${id}-about` : `${id}-about ${id}-badge`}
        onClick={() => {
          if (runs) onChoose();
        }}
      >
        {on && (
          <span className={styles.check} data-check>
            <CheckIcon size={26} />
          </span>
        )}
        <span className={styles.still}>
          <SurpriseStill chosen={on} />
        </span>
        <span className={styles.words}>
          <span id={`${id}-name`} className={styles.name}>
            {SURPRISE}
          </span>
          <span id={`${id}-about`} className={styles.about}>
            {SURPRISE_ABOUT}
          </span>
        </span>
        <span className={styles.tags}>
          {runs ? (
            <span className={styles.badge}>1 of {pool} shows</span>
          ) : (
            <span id={`${id}-badge`} className={`${styles.badge} ${styles.cannot}`}>
              {runnable === 0 ? 'No show can run' : 'Only 1 show can run'}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/** How many people a show takes: "2–12" on its card, "2 to 12" in the panel. */
const peopleRange = ({ people: { min, max } }: Scenario, to: string) =>
  min === max ? String(min) : `${min}${to}${max}`;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** What a show's Line-up has you pick, in its words: "the track and everyone's racer". */
function nextPicks({ themes, words, options }: LineUp) {
  const everyone = `everyone's ${lowerFirst(options[0]!.label)}`;
  return themes && words ? `the ${lowerFirst(words.theme)} and ${everyone}` : everyone;
}
