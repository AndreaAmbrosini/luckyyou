import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { checkNewNames, sameName } from '../people/names';
import type { People } from '../people/people';
import { HEAD_COUNT } from '../scenario-kit/contract';
import { Button } from '../ui/Button';
import { ArrowRightIcon, CheckIcon, CrossIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { Bar } from './Bar';
import layout from './layout.module.css';
import styles from './WhosIn.module.css';

// One empty list, so clearing what's already clear changes nothing.
const NONE: readonly string[] = [];

/** Step 1: who is on the team, and who is in today's pick. */
export function WhosIn({ people, onNext }: { people: People; onNext(): void }) {
  const { list } = people;
  const [draft, setDraft] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  // Names the last add found already on the list.
  const [highlight, setHighlight] = useState(NONE);
  // Names the last add put on the list: their tiles pop in.
  const [fresh, setFresh] = useState(NONE);
  const [removing, setRemoving] = useState(false);
  const fieldId = useId();
  const reasonId = useId();
  const sheet = useRef<HTMLElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const removePeople = useRef<HTMLButtonElement>(null);
  // Where the keyboard focus goes once the next render is on screen.
  const focusNext = useRef<(() => HTMLElement | null | undefined) | null>(null);

  const names = list.map((person) => person.name);
  const ticked = list.filter((person) => person.ticked).length;
  const inRemoveMode = removing && list.length > 0;
  const firstVisit = list.length === 0;
  const pending = checkNewNames(draft, names).add.length;

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    target?.()?.focus();
  });

  useEffect(() => {
    // After an add: the one name added, or the one already there; after several, the field.
    let target: Element | null | undefined = field.current?.closest('form');
    if (fresh.length === 1) target = sheet.current?.querySelector('[data-fresh]');
    else if (fresh.length === 0) target = sheet.current?.querySelector('[data-highlighted]');
    target?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight, fresh]);

  const isIn = (group: readonly string[], name: string) =>
    group.some((other) => sameName(other, name));

  const removeButton = (name: string) =>
    [...(sheet.current?.querySelectorAll<HTMLButtonElement>('[data-remove]') ?? [])].find(
      (button) => button.dataset.remove === name,
    );

  function add(event: FormEvent) {
    event.preventDefault();
    const check = checkNewNames(draft, names);
    setRefusal(check.message);
    setHighlight(check.existing);
    if (check.add.length === 0) return;
    for (const name of check.add) people.add(name);
    setFresh(check.add);
    // What's left is what can still join once shortened.
    setDraft(check.tooLong.join(', '));
    // The first visit's field gives way to the list's: the focus follows it.
    focusNext.current = () => field.current;
  }

  /** A pasted column or row of names arrives comma-separated, so it shows as several. */
  function paste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text');
    if (!/[\t\r\n]/.test(text)) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const pasted = text
      .split(/[\t\r\n]+/)
      .map((piece) => piece.trim())
      .filter((piece) => piece !== '')
      .join(', ');
    const caret = start + pasted.length;
    setDraft(draft.slice(0, start) + pasted + draft.slice(end));
    setRefusal(null);
    setHighlight(NONE);
    focusNext.current = () => {
      field.current?.setSelectionRange(caret, caret);
      return field.current;
    };
  }

  function startRemoving() {
    setRemoving(true);
    setRefusal(null);
    setHighlight(NONE);
    setFresh(NONE);
    focusNext.current = () => sheet.current?.querySelector<HTMLButtonElement>('[data-remove]');
  }

  function stopRemoving() {
    setRemoving(false);
    focusNext.current = () => removePeople.current;
  }

  function remove(name: string) {
    const index = list.findIndex((person) => person.name === name);
    const neighbour = list[index + 1] ?? list[index - 1];
    if (neighbour) {
      focusNext.current = () => removeButton(neighbour.name);
    } else {
      setRemoving(false);
      focusNext.current = () => field.current;
    }
    people.remove(name);
  }

  // Enough people to pick from; until then, the team is still being added.
  const enough = list.length >= HEAD_COUNT.min;
  const heading = enough ? "Who's in today?" : "Who's on the team?";
  const reason = barReason(names, ticked);
  // The fresh tiles pop one after another, in the order they appear.
  const freshOrder = names.filter((name) => isIn(fresh, name));

  const addForm = (
    <form className={firstVisit ? styles.firstAdd : styles.add} onSubmit={add}>
      <PlusIcon size={firstVisit ? 32 : 24} />
      <label htmlFor={fieldId} className="visually-hidden">
        Add a name
      </label>
      <input
        ref={field}
        id={fieldId}
        className={styles.field}
        value={draft}
        placeholder={firstVisit ? 'Anna, Ben, Carla…' : 'Add a name'}
        autoComplete="off"
        // The one thing to do on a first visit.
        autoFocus={firstVisit}
        onPaste={paste}
        onChange={(event) => {
          setDraft(event.target.value);
          setRefusal(null);
          setHighlight(NONE);
        }}
      />
      <Button type="submit" className={styles.addButton}>
        {pending > 1 ? `Add ${pending}` : 'Add'}
      </Button>
    </form>
  );

  return (
    <>
      <main className={layout.main}>
        <div className={layout.titleRow}>
          <div className={layout.intro}>
            <div className={layout.group}>
              <h1 className={`${layout.heading} ${styles.heading}`}>{heading}</h1>
              {enough && (
                <p
                  className={layout.pill}
                  data-blocked={reason?.tone === 'block'}
                  aria-live="polite"
                >
                  {ticked} of {list.length} in
                </p>
              )}
            </div>
            {enough && (
              <p className={`${layout.say} ${styles.line}`}>Tick everyone on today's call.</p>
            )}
          </div>
          {list.length > 0 && !inRemoveMode && (
            <div className={layout.group}>
              {enough && <Button onClick={() => tickAll(true)}>Everyone</Button>}
              {enough && <Button onClick={() => tickAll(false)}>No one</Button>}
              <Button ref={removePeople} onClick={startRemoving}>
                <TrashIcon size={22} />
                Remove people
              </Button>
            </div>
          )}
        </div>

        <section
          ref={sheet}
          className={styles.sheet}
          data-removing={inRemoveMode}
          aria-label="Team"
        >
          {firstVisit ? (
            <div className={styles.welcome}>
              {addForm}
              <p className={styles.keep}>
                Paste the whole team in one go. It stays in this browser.
              </p>
            </div>
          ) : (
            <ul className={styles.grid}>
              {list.map((person) => (
                <li
                  key={person.name}
                  className={styles.item}
                  data-highlighted={isIn(highlight, person.name) ? 'true' : undefined}
                  data-fresh={isIn(fresh, person.name) ? 'true' : undefined}
                  style={
                    isIn(fresh, person.name)
                      ? ({ '--pop-order': freshOrder.indexOf(person.name) } as CSSProperties)
                      : undefined
                  }
                >
                  {inRemoveMode ? (
                    <div className={`${styles.tile} ${styles.removable}`}>
                      <span className={styles.name} dir="auto">
                        {person.name}
                      </span>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Remove ${person.name}`}
                        data-remove={person.name}
                        onClick={() => remove(person.name)}
                      >
                        <CrossIcon size={22} />
                      </button>
                    </div>
                  ) : (
                    <label className={`${styles.tile} ${person.ticked ? styles.ticked : ''}`}>
                      <input
                        type="checkbox"
                        className="visually-hidden"
                        checked={person.ticked}
                        onChange={() => {
                          people.toggle(person.name);
                          setHighlight(NONE);
                          setFresh(NONE);
                        }}
                      />
                      <span className={styles.box} aria-hidden="true">
                        {person.ticked && <CheckIcon size={24} />}
                      </span>
                      <span className={styles.name} dir="auto">
                        {person.name}
                      </span>
                    </label>
                  )}
                </li>
              ))}
              {!inRemoveMode && <li className={`${styles.item} ${styles.addItem}`}>{addForm}</li>}
            </ul>
          )}
        </section>
      </main>

      <Bar>
        {inRemoveMode ? (
          <>
            <p className={`${layout.say} ${styles.hint}`}>Click × to take someone off the team.</p>
            <span className={layout.spacer} />
            <Button variant="done" onClick={stopRemoving}>
              Done
            </Button>
          </>
        ) : (
          <>
            {/* Not live: the count pill already says each change. */}
            {!reason && !refusal && <p className={layout.say}>{ticked} in, 1 lucky winner.</p>}
            {refusal && (
              <p className={layout.note} role="alert">
                {refusal}
              </p>
            )}
            <div className={layout.end}>
              {reason && (
                <p
                  id={reasonId}
                  className={reason.tone === 'hint' ? `${layout.say} ${styles.hint}` : layout.note}
                  data-tone={reason.tone}
                  role="status"
                >
                  {reason.text}
                </p>
              )}
              <Button
                variant="primary"
                aria-disabled={reason ? true : undefined}
                aria-describedby={reason ? reasonId : undefined}
                onClick={() => {
                  if (!reason) onNext();
                }}
              >
                Next: pick a show
                <ArrowRightIcon size={26} />
              </Button>
            </div>
          </>
        )}
      </Bar>
    </>
  );

  function tickAll(ticked: boolean) {
    people.tickAll(ticked);
    setFresh(NONE);
  }
}

/**
 * Why moving on can't happen yet, or null when it can. While the team is
 * still being added, a hint; once it's there, the count that blocks.
 */
function barReason(
  names: readonly string[],
  ticked: number,
): { tone: 'hint' | 'block'; text: string } | null {
  if (names.length === 0) {
    return { tone: 'hint', text: `Add ${HEAD_COUNT.min} or more. One gets lucky.` };
  }
  if (names.length === 1) {
    return { tone: 'hint', text: `${names[0]} can't win alone. Add one more.` };
  }
  if (ticked < HEAD_COUNT.min) {
    const count = ticked === 0 ? 'Nobody is ticked.' : `${ticked} is ticked.`;
    return { tone: 'block', text: `At least ${HEAD_COUNT.min} people are needed. ${count}` };
  }
  if (ticked > HEAD_COUNT.max) {
    return {
      tone: 'block',
      text: `At most ${HEAD_COUNT.max} people can take part. ${ticked} are ticked.`,
    };
  }
  return null;
}
