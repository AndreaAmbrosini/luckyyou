import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChosenLook, LineUp as LineUpOf } from '../scenario-kit/contract';
import { dealLooks, randomLook } from '../scenario-kit/line-up';
import { Button } from '../ui/Button';
import { ArrowLeftIcon, CheckIcon } from '../ui/icons';
import layout from './layout.module.css';
import styles from './LineUp.module.css';

export interface LineUpProps {
  lineUp: LineUpOf;
  /** Today's people, in the list's order. */
  names: readonly string[];
  /** Each of today's people's look. */
  looks: ReadonlyMap<string, ChosenLook>;
  onLooksChange(looks: ReadonlyMap<string, ChosenLook>): void;
  onBack(): void;
  onStart(): void;
}

/** Step 3, for a show with a line-up: how each of today's people looks. */
export function LineUp({ lineUp, names, looks, onLooksChange, onBack, onStart }: LineUpProps) {
  const id = useId();
  const start = useRef<HTMLButtonElement>(null);
  const [chosen, setChosen] = useState(0);
  const name = names[chosen]!;
  const look = looks.get(name)!;

  // Enter starts the show with everyone's looks as they are.
  useEffect(() => start.current?.focus(), []);

  const change = (next: ChosenLook) => onLooksChange(new Map(looks).set(name, next));

  function surprise() {
    // A surprise that changes nothing would look like a broken button.
    let next = randomLook(lineUp, Math.random);
    for (let tries = 0; tries < 10 && sameLook(next, look); tries++) {
      next = randomLook(lineUp, Math.random);
    }
    change(next);
  }

  return (
    <main className={layout.main}>
      <div className={layout.titleRow}>
        <div className={layout.group}>
          <Button onClick={onBack}>
            <ArrowLeftIcon size={20} />
            Pick a show
          </Button>
          <h1 className={layout.heading}>{lineUp.heading}</h1>
          <p className={layout.say}>Click someone to change their look.</p>
        </div>
      </div>

      <div className={styles.body}>
        <ul className={styles.tiles} aria-label="Today's people">
          {names.map((each, index) => (
            <li key={each} className={styles.slot}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={index === chosen}
                onClick={() => setChosen(index)}
              >
                <Drawing
                  className={styles.small}
                  lineUp={lineUp}
                  look={looks.get(each)!}
                  name={each}
                  place={index + 1}
                />
                <span className={styles.name} dir="auto">
                  {each}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className={styles.panel} aria-labelledby={`${id}-name`}>
          <div className={styles.who}>
            <Drawing
              className={styles.big}
              lineUp={lineUp}
              look={look}
              name={name}
              place={chosen + 1}
            />
            <div className={styles.whoText}>
              <h2 id={`${id}-name`} className={styles.chosenName} dir="auto">
                {name}
              </h2>
              <Button variant="quiet" className={styles.surprise} onClick={surprise}>
                Surprise me
              </Button>
            </div>
          </div>
          {lineUp.options.map((option) => (
            <div
              key={option.name}
              className={styles.option}
              role="group"
              aria-labelledby={`${id}-${option.name}`}
            >
              <h3 id={`${id}-${option.name}`} className={styles.optionName}>
                {option.label}
              </h3>
              <div className={styles.choices}>
                {option.choices.map((choice) => {
                  const on = look[option.name] === choice.name;
                  const pick = () => change({ ...look, [option.name]: choice.name });
                  return choice.swatch ? (
                    <button
                      key={choice.name}
                      type="button"
                      className={styles.swatch}
                      style={{ '--swatch': `var(--color-${choice.swatch})` } as CSSProperties}
                      aria-label={choice.label}
                      aria-pressed={on}
                      onClick={pick}
                    >
                      {on && <CheckIcon size={22} />}
                    </button>
                  ) : (
                    <button
                      key={choice.name}
                      type="button"
                      className={styles.chip}
                      aria-pressed={on}
                      onClick={pick}
                    >
                      {on && <CheckIcon size={18} />}
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      <footer className={layout.footer}>
        <Button onClick={() => onLooksChange(dealLooks(lineUp, names, Math.random))}>
          Shuffle everyone
        </Button>
        <span className={layout.spacer} />
        <Button ref={start} variant="primary" onClick={onStart}>
          {lineUp.start}
        </Button>
      </footer>
    </main>
  );
}

const sameLook = (one: ChosenLook, two: ChosenLook) =>
  Object.keys(one).every((option) => one[option] === two[option]);

interface DrawingProps {
  className: string;
  lineUp: LineUpOf;
  look: ChosenLook;
  name: string;
  place: number;
}

/** The show's own drawing of one person's look, redrawn when the look changes. */
function Drawing({ className, lineUp, look, name, place }: DrawingProps) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drawn = lineUp.draw(look, { name, place });
    box.current?.replaceChildren(drawn);
    return () => drawn.remove();
  }, [lineUp, look, name, place]);
  return <span ref={box} className={`${styles.drawing} ${className}`} aria-hidden="true" />;
}
