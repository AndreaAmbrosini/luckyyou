import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
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
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CrossIcon, DieIcon, PinIcon } from '../ui/icons';
import { Bar } from './Bar';
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
  /** Today's people whose look is pinned (decision 0016). */
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

/** The chosen theme, and the first option's choices that suit it, in its order. */
interface Suiting {
  readonly theme: LineUpTheme;
  readonly choices: readonly LineUpChoice[];
}

/**
 * Step 3, for a show with a line-up (decision 0019): its themes first, then
 * everyone in one row on the theme's ground, each over a card with a die and
 * a pin. Clicking someone opens their look in a sheet.
 */
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
  const cards = useRef(new Map<string, HTMLButtonElement>());
  /** Whose look is open in the sheet, by their place in today's list. */
  const [open, setOpen] = useState<number | null>(null);
  /** Whose looks were dealt last, to flip in, and a count that restarts the flip. */
  const [dealt, setDealt] = useState<{ round: number; who: readonly string[] }>({
    round: 0,
    who: [],
  });

  // Enter starts the show with everyone's looks as they are.
  useEffect(() => start.current?.focus(), []);

  const first = lineUp.options[0]!;
  const words = lineUp.words;
  const themed = theme ? themeNamed(lineUp, theme.name) : undefined;
  const suiting: Suiting | null = themed
    ? {
        theme: themed,
        choices: (themed.suits ?? []).flatMap((each) =>
          first.choices.filter((choice) => choice.name === each),
        ),
      }
    : null;
  const suits = (look: ChosenLook) =>
    suiting?.choices.some((choice) => choice.name === look[first.name]) ?? false;

  /** Gives `who` a look chosen by hand, which pins it. */
  const change = (who: string, next: ChosenLook) =>
    onLooksChange(new Map(looks).set(who, next), new Set(pinned).add(who));

  /** Deals `who` a new look, unlike the one they had, and unpins it. */
  function deal(who: string) {
    const was = looks.get(who)!;
    let next = randomLook(lineUp, Math.random);
    // A die that changes nothing would look like a broken button.
    for (let tries = 0; tries < 10 && sameLook(next, was); tries++) {
      next = randomLook(lineUp, Math.random);
    }
    const unpinned = new Set(pinned);
    unpinned.delete(who);
    setDealt({ round: dealt.round + 1, who: [who] });
    onLooksChange(new Map(looks).set(who, next), unpinned);
  }

  function togglePin(who: string) {
    const next = new Set(pinned);
    if (!next.delete(who)) next.add(who);
    onLooksChange(looks, next);
  }

  /** Deals everyone a look, but for the pinned ones. */
  function shuffleEveryone() {
    const who = names.filter((each) => !pinned.has(each));
    setDealt({ round: dealt.round + 1, who });
    onLooksChange(new Map([...looks, ...dealLooks(lineUp, who, Math.random)]), pinned);
  }

  /** Whose card gets the focus back once the sheet has closed. */
  const returnTo = useRef<string | null>(null);
  function close() {
    returnTo.current = names[open!]!;
    setOpen(null);
  }
  useEffect(() => {
    if (open !== null || returnTo.current === null) return;
    cards.current.get(returnTo.current)?.focus();
    returnTo.current = null;
  }, [open]);

  const pinCount = names.filter((each) => pinned.has(each)).length;
  const pinNote =
    pinCount > 0
      ? `${pinCount} pinned, kept when you shuffle`
      : 'Pin a look to keep it when you shuffle';
  const flips = reducedMotion() ? [] : dealt.who;
  const ground = groundOf(themed);

  return (
    <>
      <main className={`${layout.main} ${styles.main}`} inert={open !== null}>
        <div className={layout.titleRow}>
          <div className={layout.group}>
            <h1 className={layout.heading}>{lineUp.heading}</h1>
            <p className={layout.say}>
              {words && themed
                ? `Pick a ${words.theme.toLowerCase()}, then dress the ${words.choices}. Or just start.`
                : 'Click someone to change their look. Or just start.'}
            </p>
          </div>
        </div>

        {lineUp.themes && theme && themed && words && (
          <section className={styles.step} aria-labelledby={`${id}-themes`}>
            <h2 id={`${id}-themes`} className={styles.stepName}>
              1 · {words.theme}: {themed.label}
              {suiting!.choices.length > 0 && ' '}
              {suiting!.choices.length > 0 && (
                <span className={styles.soft}>
                  · {suiting!.choices.length}{' '}
                  {suiting!.choices.length === 1 ? 'suits' : `${words.choices} suit`} it
                </span>
              )}
            </h2>
            <Postcards
              themes={lineUp.themes}
              theme={theme}
              surprise={() => drawTheme(lineUp, Math.random, theme.name)}
              onChange={onThemeChange}
            />
          </section>
        )}

        <section
          className={`${styles.step} ${styles.people}`}
          aria-labelledby={words && themed ? `${id}-people` : undefined}
          aria-label={words && themed ? undefined : "Today's people"}
        >
          <div className={styles.peopleHead}>
            {words && themed && (
              <h2 id={`${id}-people`} className={styles.stepName}>
                2 · {upperFirst(words.choices)}
              </h2>
            )}
            {suiting && suiting.choices.length > 0 && (
              <p className={styles.suitNote}>
                <Badge />
                {names.filter((each) => suits(looks.get(each)!)).length} of {names.length} suit{' '}
                {suiting.theme.label}
              </p>
            )}
            <span className={layout.spacer} />
            <Button onClick={shuffleEveryone}>
              <DieIcon five size={24} />
              Shuffle everyone
            </Button>
          </div>

          <div
            className={styles.row}
            style={{ '--places': Math.max(8, names.length), ...ground } as CSSProperties}
          >
            <div className={styles.ground} aria-hidden="true">
              <div className={styles.floor} />
            </div>
            <ul className={styles.places} aria-label="Today's people">
              {names.map((each, index) => {
                const look = looks.get(each)!;
                const flip = flips.indexOf(each);
                return (
                  <li
                    key={each}
                    className={styles.place}
                    data-pinned={pinned.has(each) ? 'true' : undefined}
                  >
                    <button
                      ref={(button) => {
                        if (button) cards.current.set(each, button);
                        else cards.current.delete(each);
                      }}
                      type="button"
                      className={styles.person}
                      aria-labelledby={`${id}-${index}-name`}
                      aria-describedby={`${id}-${index}-look`}
                      onClick={() => setOpen(index)}
                    >
                      <span className={styles.stand}>
                        <Drawing
                          key={flip >= 0 ? `${each} ${dealt.round}` : each}
                          className={`${styles.small} ${flip >= 0 ? styles.flip : ''}`}
                          style={flip >= 0 ? { animationDelay: `${flip * FLIP_GAP}ms` } : undefined}
                          lineUp={lineUp}
                          look={look}
                          name={each}
                          place={index + 1}
                          theme={theme?.name ?? null}
                        />
                      </span>
                      <span className={styles.card}>
                        <span id={`${id}-${index}-name`} className={styles.name} dir="auto">
                          {each}
                        </span>
                        <span id={`${id}-${index}-look`} className={styles.lookWords}>
                          {inWords(lineUp, look).slice(0, 2).join(' · ')}
                        </span>
                      </span>
                    </button>
                    {suits(look) && (
                      <span
                        className={`${styles.badge} ${styles.suitsBadge}`}
                        role="img"
                        aria-label={`Suits ${suiting!.theme.label}`}
                      >
                        <Star />
                      </span>
                    )}
                    <span className={styles.tools}>
                      <button
                        type="button"
                        className={styles.die}
                        aria-label={`A new look for ${each}`}
                        onClick={() => deal(each)}
                      >
                        <DieIcon size={22} />
                      </button>
                      <PinButton
                        on={pinned.has(each)}
                        aria-label={`Pin ${each}`}
                        onClick={() => togglePin(each)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <Bar back={{ label: 'Pick a show', onClick: onBack }} inert={open !== null}>
        <p className={styles.status} role="status">
          {words && themed ? `${words.theme}: ${themed.label} · ${pinNote}` : pinNote}
        </p>
        <Button ref={start} variant="primary" onClick={onStart}>
          {lineUp.start}
        </Button>
      </Bar>

      {open !== null && (
        <Sheet
          lineUp={lineUp}
          names={names}
          index={open}
          look={looks.get(names[open]!)!}
          theme={theme?.name ?? null}
          suiting={suiting}
          pinned={pinned.has(names[open]!)}
          ground={ground}
          onMove={setOpen}
          onChange={(next) => change(names[open]!, next)}
          onDeal={() => deal(names[open]!)}
          onPin={() => togglePin(names[open]!)}
          onClose={close}
        />
      )}
    </>
  );
}

/** The CSS custom properties that colour a theme's ground; sky over mint without one. */
function groundOf(theme: LineUpTheme | undefined) {
  const { sky, floor } = theme?.ground ?? { sky: 'sky', floor: 'mint' };
  return { '--sky': `var(--color-${sky})`, '--floor': `var(--color-${floor})` };
}

/** Each option's choice in `look`, in the options' order, as their labels. */
const inWords = (lineUp: LineUpOf, look: ChosenLook) =>
  lineUp.options.map(
    (option) => option.choices.find((choice) => choice.name === look[option.name])?.label ?? '',
  );

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface SheetProps {
  lineUp: LineUpOf;
  names: readonly string[];
  /** Whose look it shows, by their place in today's list. */
  index: number;
  look: ChosenLook;
  theme: string | null;
  suiting: Suiting | null;
  pinned: boolean;
  ground: ReturnType<typeof groundOf>;
  onMove(index: number): void;
  onChange(look: ChosenLook): void;
  onDeal(): void;
  onPin(): void;
  onClose(): void;
}

/**
 * One person's look, in paper from the right over the dimmed Line-up: their
 * portrait on the theme's ground, "Surprise me", their pin, then the show's
 * options, the first one's choices that suit the theme first.
 */
function Sheet(props: SheetProps) {
  const { lineUp, names, index, look, theme, suiting, pinned, ground } = props;
  const { onMove, onChange, onDeal, onPin, onClose } = props;
  const id = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const name = names[index]!;
  const count = names.length;
  const before = names[(index - 1 + count) % count]!;
  const after = names[(index + 1) % count]!;
  const [first, ...rest] = lineUp.options as [LineUpOption, ...LineUpOption[]];
  const suits = suiting?.choices.some((choice) => choice.name === look[first.name]) ?? false;
  // The first option opens on the theme's choices, while any suit it.
  const [themeView, setThemeView] = useState(true);
  // The tab open in each grouped option; until one is clicked, their choice's.
  const [tabs, setTabs] = useState<Readonly<Record<string, string | undefined>>>({});

  useEffect(() => sheet.current?.focus(), []);

  /** Esc closes it; Tab goes round inside it. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [
      ...sheet.current!.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])'),
    ];
    const [head, tail] = [focusable[0], focusable.at(-1)];
    if (
      event.shiftKey &&
      (document.activeElement === head || document.activeElement === sheet.current)
    ) {
      event.preventDefault();
      tail?.focus();
    } else if (!event.shiftKey && document.activeElement === tail) {
      event.preventDefault();
      head?.focus();
    }
  }

  const option = (each: LineUpOption) => (
    <Option
      key={each.name}
      id={`${id}-${each.name}`}
      option={each}
      lineUp={lineUp}
      look={look}
      name={name}
      place={index + 1}
      theme={theme}
      suiting={each === first ? suiting : null}
      themeView={themeView}
      tab={tabs[each.name]}
      onThemeView={setThemeView}
      onTab={(key) => setTabs({ ...tabs, [each.name]: key })}
      onChange={onChange}
    />
  );

  return (
    <div className={styles.dim}>
      <div className={styles.shade} aria-hidden="true" onClick={onClose} />
      <div
        ref={sheet}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-name`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className={styles.sheetHead}>
          <button
            type="button"
            className={styles.round}
            aria-label={`Previous: ${before}`}
            onClick={() => onMove((index - 1 + count) % count)}
          >
            <ArrowLeftIcon size={22} />
          </button>
          <h2 id={`${id}-name`} className={styles.sheetName} dir="auto">
            {name}
          </h2>
          <span className={styles.ofCount}>
            {index + 1} of {count}
          </span>
          <button
            type="button"
            className={styles.round}
            aria-label={`Next: ${after}`}
            onClick={() => onMove((index + 1) % count)}
          >
            <ArrowRightIcon size={22} />
          </button>
          <span className={layout.spacer} />
          <button type="button" className={styles.round} aria-label="Close" onClick={onClose}>
            <CrossIcon size={22} />
          </button>
        </div>

        <div className={styles.sheetBody}>
          <div className={styles.portrait}>
            <div className={styles.portraitGround} style={ground as CSSProperties}>
              <Drawing
                className={styles.big}
                lineUp={lineUp}
                look={look}
                name={name}
                place={index + 1}
                theme={theme}
              />
              <div className={styles.floor} />
            </div>
            <div className={styles.portraitText}>
              <p className={styles.summary}>
                {[
                  ...inWords(lineUp, look),
                  ...(suits ? [`suits ${suiting!.theme.label}`] : []),
                ].join(' · ')}
              </p>
              <div className={styles.portraitButtons}>
                <Button onClick={onDeal}>
                  <DieIcon size={22} />
                  Surprise me
                </Button>
                <PinButton on={pinned} onClick={onPin}>
                  {pinned ? 'Pinned' : 'Pin'}
                </PinButton>
              </div>
              <p className={styles.pinNote}>
                {pinned
                  ? 'Pinned: Shuffle everyone leaves this look as it is.'
                  : 'Not pinned: Shuffle everyone may change it.'}
              </p>
            </div>
          </div>
          {option(first)}
          {rest.length > 0 && <div className={styles.others}>{rest.map(option)}</div>}
        </div>

        <div className={styles.sheetFoot}>
          <p className={styles.pinNote}>Changes show on the line-up at once.</p>
          <Button variant="done" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
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
  /** For the first option: the theme's choices, shown first while any suit it (decision 0019). */
  suiting: Suiting | null;
  /** Whether the first option shows only the theme's choices. */
  themeView: boolean;
  /** The open group tab's key, when one was clicked. */
  tab: string | undefined;
  onThemeView(on: boolean): void;
  onTab(key: string): void;
  onChange(look: ChosenLook): void;
}

/**
 * One option of a person's look: its choices as chips, swatches or
 * pictures, under a tab per group when they come in groups (decision 0013).
 * The first option offers the theme's choices first, and all of them as a
 * second tab, where each choice that suits the theme has a star.
 */
function Option(props: OptionProps) {
  const { id, option, lineUp, look, name, place, theme, suiting, themeView, tab } = props;
  const { onThemeView, onTab, onChange } = props;
  const mine = option.choices.find((choice) => choice.name === look[option.name]);
  const themed = suiting && suiting.choices.length > 0 ? suiting : null;
  const showsTheme = themed !== null && themeView;
  const groups = groupsOf(option.choices);
  const tabbed = !showsTheme && groups.some((group) => group.label !== undefined);
  const groupTabs = groups.map((group) => ({ key: `group:${group.label}`, ...group }));
  const shown = tabbed
    ? (groupTabs.find((each) => each.key === (tab ?? `group:${mine?.group}`)) ?? groupTabs[0]!)
    : undefined;
  const choices = showsTheme ? themed.choices : (shown?.choices ?? option.choices);
  const words = lineUp.words;

  const buttons = choices.map((choice) => {
    const on = look[option.name] === choice.name;
    const pick = () => onChange({ ...look, [option.name]: choice.name });
    const star = themed && !showsTheme && themed.choices.includes(choice) && (
      <span className={styles.choiceStar} role="img" aria-label={`Suits ${themed.theme.label}`}>
        <Star />
      </span>
    );
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
          {star}
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
        {star}
      </button>
    );
  });

  const listed = option.drawn ? styles.drawnChoices : styles.choices;
  const groupPanel = shown ? (
    <>
      <Tabs
        id={`${id}-group`}
        label={option.label}
        tabs={groupTabs.map((each) => ({ key: each.key, label: each.label! }))}
        open={shown.key}
        onOpen={onTab}
        small={themed !== null}
      />
      <div
        id={`${id}-group-panel`}
        className={listed}
        role="tabpanel"
        aria-labelledby={`${id}-group-tab-${groupTabs.indexOf(shown)}`}
      >
        {buttons}
      </div>
    </>
  ) : (
    <div className={listed}>{buttons}</div>
  );

  return (
    <div className={styles.option} role="group" aria-labelledby={id}>
      <h3 className={styles.optionName}>
        <span id={id}>{option.label}</span>: <span className={styles.mine}>{mine?.label}</span>
      </h3>
      {themed ? (
        <>
          <Tabs
            id={`${id}-view`}
            label={`Which ${words?.choices ?? 'choices'}`}
            tabs={[
              {
                key: 'theme',
                label: `${themed.theme.label} ${words?.choices ?? ''}`.trim(),
                count: themed.choices.length,
                star: true,
              },
              {
                key: 'all',
                label: `All ${words?.choices ?? ''}`.trim(),
                count: option.choices.length,
              },
            ]}
            open={themeView ? 'theme' : 'all'}
            onOpen={(key) => onThemeView(key === 'theme')}
          />
          <div
            id={`${id}-view-panel`}
            className={styles.viewPanel}
            role="tabpanel"
            aria-labelledby={`${id}-view-tab-${themeView ? 0 : 1}`}
          >
            {groupPanel}
          </div>
        </>
      ) : (
        groupPanel
      )}
    </div>
  );
}

interface TabsProps {
  id: string;
  label: string;
  tabs: readonly { key: string; label: string; count?: number; star?: boolean }[];
  open: string;
  onOpen(key: string): void;
  /** Chips under the theme's tabs, a step down. */
  small?: boolean;
}

/** A row of tabs, the open one in sun; the arrow keys move along them, opening each. */
function Tabs({ id, label, tabs, open, onOpen, small = false }: TabsProps) {
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    onOpen(tabs[next]!.key);
    const buttons =
      event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons[next]?.focus();
  }
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {tabs.map((each, index) => (
        <button
          key={each.key}
          type="button"
          role="tab"
          id={`${id}-tab-${index}`}
          className={`${styles.tab} ${small ? styles.smallTab : ''}`}
          aria-selected={each.key === open}
          aria-controls={`${id}-panel`}
          tabIndex={each.key === open ? 0 : -1}
          onClick={() => onOpen(each.key)}
          onKeyDown={(event) => onKey(event, index)}
        >
          {each.star && <Badge />}
          {each.label}
          {each.count !== undefined && <span className={styles.count}>{each.count}</span>}
        </button>
      ))}
    </div>
  );
}

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

/** A star, for what suits the chosen theme. */
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2l2.6 6.6 6.9.6-5.3 4.5 1.7 6.8-5.9-3.7-5.9 3.7 1.7-6.8-5.3-4.5 6.9-.6z" />
    </svg>
  );
}

/** A star on a sun badge. */
function Badge() {
  return (
    <span className={styles.badge} aria-hidden="true">
      <Star />
    </span>
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
  style?: CSSProperties;
  lineUp: LineUpOf;
  look: ChosenLook;
  name: string;
  place: number;
  /** The chosen theme, which the show may dress everyone for. */
  theme: string | null;
}

/** The show's own drawing of one person's look, redrawn when the look or the theme changes. */
function Drawing({ className, style, lineUp, look, name, place, theme }: DrawingProps) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drawn = lineUp.draw(look, { name, place, theme });
    box.current?.replaceChildren(drawn);
    return () => drawn.remove();
  }, [lineUp, look, name, place, theme]);
  return (
    <span ref={box} className={`${styles.drawing} ${className}`} style={style} aria-hidden="true" />
  );
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
