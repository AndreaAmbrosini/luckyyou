import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { ThemeChoice } from '../line-up/looks';
import type {
  ChosenLook,
  LineUpChoice,
  LineUpOption,
  LineUp as LineUpOf,
  LineUpTheme,
} from '../scenario-kit/contract';
import { dealLooks, drawTheme, randomLook, themeNamed } from '../scenario-kit/line-up';
import { Button } from '../ui/Button';
import { ArrowLeftIcon, CheckIcon, DieIcon } from '../ui/icons';
import layout from './layout.module.css';
import styles from './LineUp.module.css';

export interface LineUpProps {
  lineUp: LineUpOf;
  /** Today's people, in the list's order. */
  names: readonly string[];
  /** Each of today's people's look. */
  looks: ReadonlyMap<string, ChosenLook>;
  /** The theme it shows; null for a line-up without themes. */
  theme: ThemeChoice | null;
  onThemeChange(theme: ThemeChoice): void;
  onLooksChange(looks: ReadonlyMap<string, ChosenLook>): void;
  onBack(): void;
  onStart(): void;
}

/** Step 3, for a show with a line-up: its theme, and how each of today's people looks. */
export function LineUp({
  lineUp,
  names,
  looks,
  theme,
  onThemeChange,
  onLooksChange,
  onBack,
  onStart,
}: LineUpProps) {
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

  // While a theme is chosen, the first option's choices that suit it are its first tab.
  const themed = theme ? themeNamed(lineUp, theme.name) : undefined;
  const first = lineUp.options[0];
  const suiting = (themed?.suits ?? []).flatMap((each) =>
    first!.choices.filter((choice) => choice.name === each),
  );
  const themeTab = themed && suiting.length > 0 ? { label: themed.label, choices: suiting } : null;

  function surprise() {
    // A surprise that changes nothing would look like a broken button.
    let next = randomLook(lineUp, Math.random);
    for (let tries = 0; tries < 10 && sameLook(next, look); tries++) {
      next = randomLook(lineUp, Math.random);
    }
    change(next);
    setOpen({});
  }

  /** The options drawn as the chosen person, or the others. */
  const optionsWhere = (drawn: boolean) =>
    lineUp.options
      .filter((option) => Boolean(option.drawn) === drawn)
      .map((option) => (
        <Option
          key={option.name}
          id={`${id}-${option.name}`}
          option={option}
          lineUp={lineUp}
          look={look}
          name={name}
          place={chosen + 1}
          themeTab={option === first ? themeTab : null}
          open={open[option.name]}
          onOpen={(key) => setOpen({ ...open, [option.name]: key })}
          onChange={change}
        />
      ));

  return (
    <main className={`${layout.main} ${styles.main}`}>
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
        {lineUp.themes && theme && (
          <Postcards
            themes={lineUp.themes}
            theme={theme}
            surprise={() => drawTheme(lineUp, Math.random, theme.name)}
            onChange={(next) => {
              onThemeChange(next);
              setOpen({});
            }}
          />
        )}
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

        {/* Under the row: the options drawn as them, each in a sheet of its own, then their card. */}
        <section className={styles.look} aria-labelledby={`${id}-name`}>
          {optionsWhere(true)}
          <div className={styles.card}>
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
            {optionsWhere(false)}
          </div>
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
  /** The chosen theme's own tab, ahead of the groups' (decision 0015). */
  themeTab: { label: string; choices: readonly LineUpChoice[] } | null;
  /** The open tab's key, when one was clicked. */
  open: string | undefined;
  onOpen(key: string): void;
  onChange(look: ChosenLook): void;
}

/**
 * One option of the chosen person's look: its choices as chips, swatches or
 * pictures, under a tab per group when they come in groups (decision 0013).
 */
function Option(props: OptionProps) {
  const { id, option, lineUp, look, name, place, themeTab, open, onOpen, onChange } = props;
  const groups = groupsOf(option.choices);
  const tabbed = groups.some((group) => group.label !== undefined);
  const mine = option.choices.find((choice) => choice.name === look[option.name]);
  const tabs = tabbed
    ? [
        ...(themeTab ? [{ key: THEME_TAB, star: true, ...themeTab }] : []),
        ...groups.map((group) => ({ key: `group:${group.label}`, star: false, ...group })),
      ]
    : [];
  // It opens on the theme's tab when that holds their choice, or else on their choice's group.
  const theirs =
    themeTab && mine && themeTab.choices.includes(mine) ? THEME_TAB : `group:${mine?.group}`;
  const shown = tabbed ? (tabs.find((tab) => tab.key === (open ?? theirs)) ?? tabs[0]!) : undefined;

  /** Arrow keys move along the tabs, opening each. */
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    onOpen(tabs[next]!.key);
    const buttons =
      event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons[next]?.focus();
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
          <Picture of={choice} />
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
    <div className={option.drawn ? styles.sheet : styles.option} role="group" aria-labelledby={id}>
      <div className={styles.optionHead}>
        <h3 className={styles.optionName}>
          <span id={id}>{option.label}</span>: <span className={styles.mine}>{mine?.label}</span>
        </h3>
        {shown && (
          <div className={styles.tabs} role="tablist" aria-labelledby={id}>
            {tabs.map(({ key, label, star }, index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`${id}-tab-${index}`}
                className={styles.tab}
                aria-selected={key === shown.key}
                aria-controls={`${id}-panel`}
                tabIndex={key === shown.key ? 0 : -1}
                onClick={() => onOpen(key)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                {star && <Star />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {shown ? (
        <div
          id={`${id}-panel`}
          className={option.drawn ? styles.drawnChoices : styles.choices}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tabs.indexOf(shown)}`}
        >
          {choices}
        </div>
      ) : (
        <div className={option.drawn ? styles.drawnChoices : styles.choices}>{choices}</div>
      )}
    </div>
  );
}

/** The key of the chosen theme's tab; a group's starts with "group:". */
const THEME_TAB = 'theme';

/** The star on the chosen theme's tab. */
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2l2.6 6.6 6.9.6-5.3 4.5 1.7 6.8-5.9-3.7-5.9 3.7 1.7-6.8-5.3-4.5 6.9-.6z" />
    </svg>
  );
}

interface PostcardsProps {
  themes: readonly LineUpTheme[];
  theme: ThemeChoice;
  /** Draws a theme for "Surprise", other than the one showing. */
  surprise(): string;
  onChange(theme: ThemeChoice): void;
}

/**
 * The themes as postcards, "Surprise" first: the chosen one in sun, with a
 * check, or with a die on "Surprise", which shows the theme it drew.
 */
function Postcards({ themes, theme, surprise, onChange }: PostcardsProps) {
  const drawn = themes.find((each) => each.name === theme.name)!;
  const mark = (kind: string, icon: ReactNode) => (
    <span className={styles.mark} data-mark={kind}>
      {icon}
    </span>
  );
  return (
    <div className={styles.postcards} role="group" aria-label="Theme">
      <button
        type="button"
        className={styles.postcard}
        aria-pressed={theme.surprise}
        onClick={() => onChange({ name: surprise(), surprise: true })}
      >
        {theme.surprise ? <Picture of={drawn} postcard /> : <SurprisePicture />}
        <span className={styles.postcardName}>Surprise</span>
        {theme.surprise && mark('die', <DieIcon size={20} />)}
      </button>
      {themes.map((each) => {
        const on = !theme.surprise && each.name === theme.name;
        return (
          <button
            key={each.name}
            type="button"
            className={styles.postcard}
            aria-pressed={on}
            onClick={() => onChange({ name: each.name, surprise: false })}
          >
            <Picture of={each} postcard />
            <span className={styles.postcardName}>{each.label}</span>
            {on && mark('check', <CheckIcon size={18} />)}
          </button>
        );
      })}
    </div>
  );
}

/** "Surprise" before it has drawn a theme: a die on sun. */
function SurprisePicture() {
  const dots = [
    [51, 14],
    [69, 14],
    [60, 23],
    [51, 32],
    [69, 32],
  ];
  return (
    <span className={`${styles.postcardPicture} ${styles.surprisePicture}`} aria-hidden="true">
      <svg viewBox="0 0 120 46" preserveAspectRatio="xMidYMid slice" focusable="false">
        <rect className={styles.dieFace} x="41" y="5" width="38" height="36" rx="5" />
        {dots.map(([cx, cy]) => (
          <circle key={`${cx} ${cy}`} className={styles.dieDot} cx={cx} cy={cy} r="2.6" />
        ))}
      </svg>
    </span>
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

/** A choice's own picture, or a theme's on its postcard. */
function Picture({ of, postcard = false }: { of: LineUpChoice | LineUpTheme; postcard?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drawn = of.picture!();
    box.current?.replaceChildren(drawn);
    return () => drawn.remove();
  }, [of]);
  return (
    <span
      ref={box}
      className={postcard ? styles.postcardPicture : styles.pictureBox}
      aria-hidden="true"
    />
  );
}
