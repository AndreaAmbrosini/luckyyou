import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type {
  ChosenLook,
  LineUpChoice,
  LineUpOption,
  LineUp as LineUpOf,
} from '../scenario-kit/contract';
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
  // The tab open in each grouped option; until one is clicked, the chosen person's choice's.
  const [open, setOpen] = useState<Readonly<Record<string, string | undefined>>>({});
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
    setOpen({});
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
                onClick={() => {
                  setChosen(index);
                  setOpen({});
                }}
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
            <Option
              key={option.name}
              id={`${id}-${option.name}`}
              option={option}
              lineUp={lineUp}
              look={look}
              name={name}
              place={chosen + 1}
              open={open[option.name]}
              onOpen={(group) => setOpen({ ...open, [option.name]: group })}
              onChange={change}
            />
          ))}
        </section>
      </div>

      <footer className={layout.footer}>
        <Button
          onClick={() => {
            onLooksChange(dealLooks(lineUp, names, Math.random));
            setOpen({});
          }}
        >
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

interface OptionProps {
  id: string;
  option: LineUpOption;
  lineUp: LineUpOf;
  look: ChosenLook;
  name: string;
  place: number;
  /** The open tab's group, when one was clicked. */
  open: string | undefined;
  onOpen(group: string): void;
  onChange(look: ChosenLook): void;
}

/**
 * One option of the chosen person's look: its choices as chips, swatches or
 * pictures, under a tab per group when they come in groups (decision 0013).
 */
function Option({ id, option, lineUp, look, name, place, open, onOpen, onChange }: OptionProps) {
  const groups = groupsOf(option.choices);
  const tabbed = groups.some((group) => group.label !== undefined);
  const mine = option.choices.find((choice) => choice.name === look[option.name]);
  const shown = tabbed
    ? (groups.find((group) => group.label === (open ?? mine?.group)) ?? groups[0]!)
    : undefined;

  /** Arrow keys move along the tabs, opening each. */
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + groups.length) % groups.length;
    onOpen(groups[next]!.label!);
    const tabs = event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  const choices = (shown?.choices ?? option.choices).map((choice) => {
    const on = look[option.name] === choice.name;
    const pick = () => onChange({ ...look, [option.name]: choice.name });
    const mark = on && (
      <span className={styles.mark}>
        <CheckIcon size={18} />
      </span>
    );
    if (choice.swatch) {
      return (
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
      );
    }
    if (choice.picture) {
      return (
        <button
          key={choice.name}
          type="button"
          className={styles.picture}
          aria-label={choice.label}
          title={choice.label}
          aria-pressed={on}
          onClick={pick}
        >
          <Picture choice={choice} />
          {mark}
        </button>
      );
    }
    if (option.drawn) {
      return (
        <button
          key={choice.name}
          type="button"
          className={styles.drawnChoice}
          aria-pressed={on}
          onClick={pick}
        >
          <Drawing
            className={styles.inChoice}
            lineUp={lineUp}
            look={{ ...look, [option.name]: choice.name }}
            name={name}
            place={place}
          />
          <span className={styles.choiceName}>{choice.label}</span>
          {mark}
        </button>
      );
    }
    return (
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
  });

  return (
    <div className={styles.option} role="group" aria-labelledby={id}>
      <h3 id={id} className={styles.optionName}>
        {option.label}
      </h3>
      {shown ? (
        <>
          <div className={styles.tabs} role="tablist" aria-labelledby={id}>
            {groups.map(({ label }, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                id={`${id}-tab-${index}`}
                className={styles.tab}
                aria-selected={label === shown.label}
                aria-controls={`${id}-panel`}
                tabIndex={label === shown.label ? 0 : -1}
                onClick={() => onOpen(label!)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            id={`${id}-panel`}
            className={option.drawn ? styles.drawnChoices : styles.choices}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${groups.indexOf(shown)}`}
          >
            {choices}
          </div>
        </>
      ) : (
        <div className={option.drawn ? styles.drawnChoices : styles.choices}>{choices}</div>
      )}
    </div>
  );
}

/**
 * An option's choices by group, the groups in the order their first choices
 * come (decision 0013). Choices without a group make one group with no label.
 */
function groupsOf(choices: readonly LineUpChoice[]) {
  const groups = new Map<string | undefined, LineUpChoice[]>();
  for (const choice of choices) {
    const group = groups.get(choice.group) ?? [];
    groups.set(choice.group, [...group, choice]);
  }
  return [...groups].map(([label, inGroup]) => ({ label, choices: inGroup }));
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

/** A choice's own picture. */
function Picture({ choice }: { choice: LineUpChoice }) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drawn = choice.picture!();
    box.current?.replaceChildren(drawn);
    return () => drawn.remove();
  }, [choice]);
  return <span ref={box} className={styles.pictureBox} aria-hidden="true" />;
}
