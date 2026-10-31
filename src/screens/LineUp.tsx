import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { ThemeChoice } from '../line-up/looks';
import {
  START,
  type ChosenLook,
  type LineUpChoice,
  type LineUpOption,
  type LineUp as LineUpOf,
  type LineUpStart,
  type LineUpTheme,
} from '../scenario-kit/contract';
import { dealLooks, drawTheme, randomLook, themeNamed } from '../scenario-kit/line-up';
import { Button } from '../ui/Button';
import { ArrowLeftIcon, CheckIcon, DieIcon, PinIcon } from '../ui/icons';
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
  /** Today's people whose look is pinned, on a line-up that draws its start (decision 0016). */
  pinned: ReadonlySet<string>;
  onThemeChange(theme: ThemeChoice): void;
  onLooksChange(looks: ReadonlyMap<string, ChosenLook>, pinned: ReadonlySet<string>): void;
  onBack(): void;
  onStart(): void;
}

/** How long apart, in ms, dealt looks start to flip in, from the first person down. */
const FLIP_GAP = 70;

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Step 3, for a show with a line-up: its theme, and how each of today's people looks. */
export function LineUp({
  lineUp,
  names,
  looks,
  theme,
  pinned,
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

  // A line-up that draws its start has pins and dice; choosing by hand pins a look.
  const starts = lineUp.drawStart !== undefined;
  /** Whose looks were just dealt, to flip in when the start is next drawn. */
  const flippingRef = useRef<readonly string[]>([]);

  const change = (next: ChosenLook) =>
    onLooksChange(new Map(looks).set(name, next), starts ? new Set(pinned).add(name) : pinned);

  /** Deals `who` a new look, unlike the one they had, and unpins it. */
  function deal(who: string) {
    const was = looks.get(who)!;
    let next = randomLook(lineUp, Math.random);
    for (let tries = 0; tries < 10 && sameLook(next, was); tries++) {
      next = randomLook(lineUp, Math.random);
    }
    const unpinned = new Set(pinned);
    unpinned.delete(who);
    flippingRef.current = [who];
    onLooksChange(new Map(looks).set(who, next), unpinned);
    setOpen({});
  }

  function togglePin(who: string) {
    const next = new Set(pinned);
    if (!next.delete(who)) next.add(who);
    onLooksChange(looks, next);
  }

  /** Deals everyone a look, but for the pinned ones. */
  function shuffleEveryone() {
    const dealt = starts ? names.filter((each) => !pinned.has(each)) : names;
    flippingRef.current = dealt;
    onLooksChange(new Map([...looks, ...dealLooks(lineUp, dealt, Math.random)]), pinned);
    setOpen({});
  }

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
  const optionsWhere = (drawn: boolean, inPanel = false) =>
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
          theme={theme?.name ?? null}
          themeTab={option === first ? themeTab : null}
          open={open[option.name]}
          inPanel={inPanel}
          onOpen={(key) => setOpen({ ...open, [option.name]: key })}
          onChange={change}
        />
      ));

  const choose = (index: number) => {
    setChosen(index);
    setOpen({});
  };

  // The show's start, redrawn on every change, the chosen person in it.
  const scene = useMemo(
    () =>
      lineUp.drawStart?.({
        people: names.map((each, index) => ({
          name: each,
          place: index + 1,
          look: looks.get(each)!,
          chosen: index === chosen,
        })),
        theme: theme?.name ?? null,
      }),
    [lineUp, names, looks, theme, chosen],
  );
  const pinCount = names.filter((each) => pinned.has(each)).length;

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

      <div className={`${styles.body} ${scene ? styles.startBody : ''}`}>
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
        {scene ? (
          <Start
            scene={scene}
            names={names}
            chosen={chosen}
            pinned={pinned}
            flippingRef={flippingRef}
            onChoose={choose}
            onDeal={deal}
            onPin={togglePin}
          >
            <section className={styles.panel} aria-labelledby={`${id}-name`}>
              <div className={styles.panelHead}>
                <h2 id={`${id}-name`} className={styles.panelName} dir="auto">
                  {name}
                </h2>
                <p className={styles.panelChoice}>
                  {first?.choices.find((choice) => choice.name === look[first.name])?.label}
                </p>
                <PinButton on={pinned.has(name)} onClick={() => togglePin(name)}>
                  {pinned.has(name) ? 'Pinned' : 'Pin'}
                </PinButton>
                <Button className={styles.panelButton} onClick={() => deal(name)}>
                  <DieIcon size={20} />
                  Surprise me
                </Button>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.panelDrawn}>{optionsWhere(true, true)}</div>
                <div className={styles.panelSide}>{optionsWhere(false, true)}</div>
              </div>
            </section>
          </Start>
        ) : (
          <>
            <ul className={styles.tiles} aria-label="Today's people">
              {names.map((each, index) => (
                <li key={each} className={styles.slot}>
                  <button
                    type="button"
                    className={styles.tile}
                    aria-pressed={index === chosen}
                    onClick={() => choose(index)}
                  >
                    <Drawing
                      className={styles.small}
                      lineUp={lineUp}
                      look={looks.get(each)!}
                      name={each}
                      place={index + 1}
                      theme={theme?.name ?? null}
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
                    theme={theme?.name ?? null}
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
          </>
        )}
      </div>

      <footer className={layout.footer}>
        <Button onClick={shuffleEveryone}>
          {starts && <DieIcon five size={24} />}
          Shuffle everyone
        </Button>
        {starts && (
          <p className={styles.pinNote}>
            {pinCount > 0
              ? `Pinned looks stay as they are (${pinCount}).`
              : 'Pin a look to keep it when you shuffle.'}
          </p>
        )}
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
  theme: string | null;
  /** The chosen theme's own tab, ahead of the groups' (decision 0015). */
  themeTab: { label: string; choices: readonly LineUpChoice[] } | null;
  /** The open tab's key, when one was clicked. */
  open: string | undefined;
  /** In the panel over a show's start: a drawn option's heading is read out only, and its choices scroll. */
  inPanel: boolean;
  onOpen(key: string): void;
  onChange(look: ChosenLook): void;
}

/**
 * One option of the chosen person's look: its choices as chips, swatches or
 * pictures, under a tab per group when they come in groups (decision 0013).
 */
function Option(props: OptionProps) {
  const { id, option, lineUp, look, name, place, theme, themeTab, open, inPanel } = props;
  const { onOpen, onChange } = props;
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
            theme={theme}
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

  const root = inPanel ? styles.option : option.drawn ? styles.sheet : styles.option;
  const listed = option.drawn
    ? `${styles.drawnChoices} ${inPanel ? styles.panelChoices : ''}`
    : styles.choices;
  return (
    <div className={root} role="group" aria-labelledby={id}>
      <div className={styles.optionHead}>
        <h3 className={`${styles.optionName} ${inPanel && option.drawn ? 'visually-hidden' : ''}`}>
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
          className={listed}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tabs.indexOf(shown)}`}
        >
          {choices}
        </div>
      ) : (
        <div className={listed}>{choices}</div>
      )}
    </div>
  );
}

interface StartProps {
  scene: LineUpStart;
  names: readonly string[];
  chosen: number;
  pinned: ReadonlySet<string>;
  flippingRef: { current: readonly string[] };
  onChoose(index: number): void;
  onDeal(name: string): void;
  onPin(name: string): void;
  /** The panel, laid over the track on the right. */
  children: ReactNode;
}

/**
 * The show's start, scaled to fit the room it has, with a die and a pin by
 * each person, who is chosen where they stand (decision 0016). Looks just
 * dealt flip in, one after another, unless motion is reduced.
 */
function Start({
  scene,
  names,
  chosen,
  pinned,
  flippingRef,
  onChoose,
  onDeal,
  onPin,
  children,
}: StartProps) {
  const room = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const drawn = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    drawn.current?.replaceChildren(scene.el);
    if (!reducedMotion()) {
      flippingRef.current.forEach((who, order) => {
        const drawing = scene.places[names.indexOf(who)]?.drawing as HTMLElement | undefined;
        drawing?.classList.add(styles.flip!);
        drawing?.style.setProperty('animation-delay', `${order * FLIP_GAP}ms`);
      });
    }
    flippingRef.current = [];
    return () => scene.el.remove();
  }, [scene, names, flippingRef]);

  useLayoutEffect(() => {
    const fit = () => {
      const { clientWidth: width, clientHeight: height } = room.current!;
      const border = parseFloat(getComputedStyle(card.current!).borderTopWidth) || 0;
      // A room with no size yet (or in a test) shows the start at its own size.
      setScale(
        width && height
          ? Math.min((width - 2 * border) / START.width, (height - 2 * border) / START.height)
          : 1,
      );
    };
    fit();
    // The room changes size with the window, and as the fonts above it load.
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    resized?.observe(room.current!);
    window.addEventListener('resize', fit);
    return () => {
      resized?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  const at = (left: number, top: number) => ({ left: `${left}px`, top: `${top}px` });
  return (
    <div ref={room} className={styles.room}>
      <section
        ref={card}
        className={styles.start}
        aria-label="The start"
        style={{ '--start-scale': scale } as CSSProperties}
      >
        <div className={styles.startGrid}>
          <div ref={drawn} className={styles.scene} aria-hidden="true" />
          <ul className={styles.places} aria-label="Today's people">
            {scene.places.map(({ box }, index) => {
              const who = names[index]!;
              // The die and the pin stand left of where they do, in the lane's middle.
              const middle = box.top + box.height / 2;
              return (
                <li key={who}>
                  <button
                    type="button"
                    className={styles.place}
                    style={{ ...at(box.left, box.top), width: box.width, height: box.height }}
                    aria-label={who}
                    aria-pressed={index === chosen}
                    onClick={() => onChoose(index)}
                  />
                  <button
                    type="button"
                    className={styles.die}
                    style={at(box.left - DIE_AT, middle)}
                    aria-label={`A new look for ${who}`}
                    onClick={() => onDeal(who)}
                  >
                    <DieIcon size={22} />
                  </button>
                  <PinButton
                    on={pinned.has(who)}
                    style={at(box.left - PIN_AT, middle)}
                    aria-label={`Pin ${who}`}
                    onClick={() => onPin(who)}
                  />
                </li>
              );
            })}
          </ul>
          {children}
        </div>
      </section>
    </div>
  );
}

/** How far left of where a person stands their die and their pin are, to their left edges. */
const DIE_AT = 96;
const PIN_AT = 48;

/** A pin: pressed in sun with a solid outline, or white with a dashed one. */
function PinButton({
  on,
  children,
  ...props
}: { on: boolean; children?: ReactNode } & Omit<ComponentProps<'button'>, 'type'>) {
  return (
    <button
      type="button"
      className={children ? styles.pinWide : styles.pin}
      aria-pressed={on}
      {...props}
    >
      <PinIcon on={on} size={children ? 20 : 22} />
      {children}
    </button>
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
  /** The chosen theme, which the show may dress everyone for. */
  theme: string | null;
}

/** The show's own drawing of one person's look, redrawn when the look or the theme changes. */
function Drawing({ className, lineUp, look, name, place, theme }: DrawingProps) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drawn = lineUp.draw(look, { name, place, theme });
    box.current?.replaceChildren(drawn);
    return () => drawn.remove();
  }, [lineUp, look, name, place, theme]);
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
