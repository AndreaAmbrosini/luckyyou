import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { checkNewName, sameName } from '../people/names';
import type { People } from '../people/people';
import { HEAD_COUNT } from '../scenario-kit/contract';
import { Button } from '../ui/Button';
import { ArrowRightIcon, CheckIcon, CrossIcon, PlusIcon, TrashIcon } from '../ui/icons';
import layout from './layout.module.css';
import styles from './WhosIn.module.css';

/** Step 1: who is on the team, and who is in today's pick. */
export function WhosIn({ people, onNext }: { people: People; onNext(): void }) {
  const { list } = people;
  const [draft, setDraft] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const fieldId = useId();
  const reasonId = useId();
  const sheet = useRef<HTMLElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const removePeople = useRef<HTMLButtonElement>(null);
  // Where the keyboard focus goes once the next render is on screen.
  const focusNext = useRef<(() => HTMLElement | null | undefined) | null>(null);

  const ticked = list.filter((person) => person.ticked).length;
  const inRemoveMode = removing && list.length > 0;

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    target?.()?.focus();
  });

  useEffect(() => {
    sheet.current?.querySelector('[data-highlighted]')?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);

  const removeButton = (name: string) =>
    [...(sheet.current?.querySelectorAll<HTMLButtonElement>('[data-remove]') ?? [])].find(
      (button) => button.dataset.remove === name,
    );

  function add(event: FormEvent) {
    event.preventDefault();
    const check = checkNewName(
      draft,
      list.map((person) => person.name),
    );
    if (!check.ok) {
      setRefusal(check.message);
      setHighlight(check.existing ?? null);
      return;
    }
    people.add(check.name);
    setDraft('');
    setRefusal(null);
    setHighlight(check.name);
  }

  function startRemoving() {
    setRemoving(true);
    setRefusal(null);
    setHighlight(null);
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

  const heading = list.length === 0 ? "Who's on the team?" : "Who's in today?";
  const blocked = blockedReason(ticked);

  return (
    <main className={layout.main}>
      <div className={layout.titleRow}>
        <div className={layout.group}>
          <h1 className={layout.heading}>{heading}</h1>
          {list.length > 0 && (
            <p className={layout.pill} data-blocked={blocked !== null} aria-live="polite">
              {ticked} of {list.length} in
            </p>
          )}
        </div>
        {list.length > 0 && !inRemoveMode && (
          <div className={layout.group}>
            <Button onClick={() => people.tickAll(true)}>Everyone</Button>
            <Button onClick={() => people.tickAll(false)}>No one</Button>
          </div>
        )}
      </div>

      <section ref={sheet} className={styles.sheet} data-removing={inRemoveMode} aria-label="Team">
        {list.length === 0 ? (
          <p className={styles.welcome}>
            Add each teammate once, below. They stay in this browser, ready for the next call.
          </p>
        ) : (
          <ul className={styles.grid}>
            {list.map((person) => (
              <li
                key={person.name}
                className={styles.item}
                data-highlighted={
                  highlight !== null && sameName(highlight, person.name) ? 'true' : undefined
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
                      <CrossIcon size={18} />
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
                        setHighlight(null);
                      }}
                    />
                    <span className={styles.box} aria-hidden="true">
                      {person.ticked && <CheckIcon size={20} />}
                    </span>
                    <span className={styles.name} dir="auto">
                      {person.name}
                    </span>
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className={layout.footer}>
        {inRemoveMode ? (
          <>
            <p className={layout.say}>Click × to take someone off the team.</p>
            <span className={layout.spacer} />
            <Button variant="done" onClick={stopRemoving}>
              Done
            </Button>
          </>
        ) : (
          <>
            <div className={layout.group}>
              <form className={styles.add} onSubmit={add}>
                <PlusIcon size={20} />
                <label htmlFor={fieldId} className="visually-hidden">
                  Add a name
                </label>
                <input
                  ref={field}
                  id={fieldId}
                  className={styles.field}
                  value={draft}
                  placeholder="Add a name"
                  autoComplete="off"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setRefusal(null);
                    setHighlight(null);
                  }}
                />
                <Button type="submit" className={styles.addButton}>
                  Add
                </Button>
              </form>
              {refusal && (
                <p className={`${layout.note} ${layout.warning}`} role="alert">
                  {refusal}
                </p>
              )}
              {list.length > 0 && (
                <Button ref={removePeople} onClick={startRemoving}>
                  <TrashIcon size={18} />
                  Remove people
                </Button>
              )}
            </div>
            <div className={layout.end}>
              {blocked && (
                <p id={reasonId} className={layout.note} role="status">
                  {blocked}
                </p>
              )}
              <Button
                variant="primary"
                aria-disabled={blocked ? true : undefined}
                aria-describedby={blocked ? reasonId : undefined}
                onClick={() => {
                  if (!blocked) onNext();
                }}
              >
                Next: pick a show
                <ArrowRightIcon size={26} />
              </Button>
            </div>
          </>
        )}
      </footer>
    </main>
  );
}

/** Why moving on is blocked with this many ticked, or null when it isn't. */
function blockedReason(ticked: number): string | null {
  if (ticked < HEAD_COUNT.min) {
    const count = ticked === 0 ? 'Nobody is ticked.' : `${ticked} is ticked.`;
    return `At least ${HEAD_COUNT.min} people are needed. ${count}`;
  }
  if (ticked > HEAD_COUNT.max) {
    return `At most ${HEAD_COUNT.max} people can take part. ${ticked} are ticked.`;
  }
  return null;
}
