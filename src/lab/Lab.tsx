import { useEffect, useId, useRef, useState } from 'react';
import { head, type Accessory, type Mood } from '../scenario-kit/characters';
import type { Scenario } from '../scenario-kit/contract';
import { ShowScreen, type Run } from '../screens/ShowScreen';
import { Button } from '../ui/Button';
import styles from './Lab.module.css';

/** Names to run a show with: everyday ones, the longest, and other scripts. */
const NAME_SETS = {
  Short: [
    'Anna',
    'Ben',
    'Carla',
    'Dario',
    'Elena',
    'Fabio',
    'Giulia',
    'Hana',
    'Ivo',
    'Jonas',
    'Kofi',
    'Luca',
  ],
  Long: [
    'Maria Giulia Bianchi-Rossi Jr.',
    'Wolfeschlegelsteinhausenberger',
    'Bartholomew-Montgomery-Smit',
    'Anna',
    'Alexandra Konstantinopoulou',
    'Ben',
    'Jean-Baptiste de La Fontaine',
    'Siobhán Ní Mhaolagáin',
    'Hana',
    'Christopher Alexanderson',
    'Ivo',
    'Oluwaseun Adebayo-Okafor',
  ],
  'Other scripts': [
    '🦄🦄🦄',
    'ليلى',
    '李小龍',
    'Zoë',
    'Ольга',
    'Søren',
    'आर्या',
    'José',
    'Ömer',
    'Łucja',
    'Ngozi',
    'Ana',
  ],
} as const;

type NameSet = keyof typeof NAME_SETS;

const MOODS: Mood[] = ['calm', 'worried', 'scared', 'happy', 'party'];
const ACCESSORIES: Accessory[] = ['cap', 'goggles', 'snorkel'];

/** Most picks have 7 or 8 people (PRODUCT.md). */
const USUAL_HEAD_COUNT = 8;

/**
 * A development-only page that runs any scenario at any head count, with
 * the unlucky person first or last and a fixed seed, so a show can be
 * watched again exactly as it ran.
 */
export function Lab({ scenarios }: { scenarios: readonly Scenario[] }) {
  const id = useId();
  const [chosen, setChosen] = useState(scenarios[0]?.id ?? '');
  const scenario = scenarios.find((each) => each.id === chosen) ?? scenarios[0];
  const [count, setCount] = useState(USUAL_HEAD_COUNT);
  const [position, setPosition] = useState<'first' | 'last'>('last');
  const [nameSet, setNameSet] = useState<NameSet>('Short');
  const [seed, setSeed] = useState('1');
  const [sound, setSound] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [said, setSaid] = useState('');

  if (!scenario) return <p className={styles.page}>There are no scenarios yet.</p>;

  const { min, max } = scenario.people;
  const people = Math.min(max, Math.max(min, count));

  if (run) {
    return (
      <ShowScreen
        run={run}
        onFinish={() => {
          setRun(null);
          setSaid(`${run.scenario.name} finished.`);
        }}
        onCancel={() => {
          setRun(null);
          setSaid(`${run.scenario.name} was cancelled.`);
        }}
      />
    );
  }

  function start() {
    const names = NAME_SETS[nameSet].slice(0, people);
    setRun({
      scenario: scenario!,
      names,
      unlucky: position === 'first' ? names[0]! : names.at(-1)!,
      seed: Number.parseInt(seed, 10) || 0,
      muted: !sound,
      // The level music starts at in the app.
      music: sound ? 0.7 : 0,
    });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Lab</h1>
      <form
        className={styles.sheet}
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <div className={styles.field}>
          <label htmlFor={`${id}-show`}>Show</label>
          <select
            id={`${id}-show`}
            value={scenario.id}
            onChange={(event) => setChosen(event.target.value)}
          >
            {scenarios.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-people`}>People</label>
          <select
            id={`${id}-people`}
            value={people}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-unlucky`}>Unlucky person</label>
          <select
            id={`${id}-unlucky`}
            value={position}
            onChange={(event) => setPosition(event.target.value as 'first' | 'last')}
          >
            <option value="first">First</option>
            <option value="last">Last</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-names`}>Names</label>
          <select
            id={`${id}-names`}
            value={nameSet}
            onChange={(event) => setNameSet(event.target.value as NameSet)}
          >
            {Object.keys(NAME_SETS).map((set) => (
              <option key={set}>{set}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-seed`}>Seed</label>
          <input
            id={`${id}-seed`}
            type="number"
            min={0}
            step={1}
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          />
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={sound}
            onChange={(event) => setSound(event.target.checked)}
          />
          Sound
        </label>
        <Button type="submit" variant="primary">
          Run
        </Button>
      </form>
      <p className={styles.said} role="status">
        {said}
      </p>
      <Heads />
    </main>
  );
}

/** Every mood with every accessory, to look the drawings over. */
function Heads() {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const heads = ACCESSORIES.flatMap((accessory, row) =>
      MOODS.map((mood, column) => {
        const drawn = head(
          {
            skin: (((row * MOODS.length + column) % 6) + 1) as 1,
            accessory,
            colour: 'tomato',
            ring: 'mint',
          },
          { mood },
        ).el;
        drawn.classList.add(styles.head!);
        return drawn;
      }),
    );
    grid.current?.replaceChildren(...heads);
    return () => heads.forEach((drawn) => drawn.remove());
  }, []);
  return (
    <section className={styles.heads} aria-label="Heads">
      <h2 className={styles.subheading}>Heads</h2>
      <div ref={grid} className={styles.grid} />
    </section>
  );
}
