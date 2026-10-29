import { useState } from 'react';
import { catalogue } from './catalogue/catalogue';
import { useLooks } from './line-up/looks';
import { usePeople } from './people/people';
import { newSeed, pickUnlucky } from './pick/pick';
import type { ChosenLook, Scenario } from './scenario-kit/contract';
import { Header } from './screens/Header';
import layout from './screens/layout.module.css';
import { LineUp } from './screens/LineUp';
import { PickAShow } from './screens/PickAShow';
import { Result } from './screens/Result';
import { ShowScreen, type Run } from './screens/ShowScreen';
import { WhosIn } from './screens/WhosIn';
import { useSettings } from './settings/settings';

type Looks = ReadonlyMap<string, ChosenLook>;

type Screen =
  | { name: 'whos-in' }
  | { name: 'shows' }
  | { name: 'line-up'; scenario: Scenario; looks: Looks }
  | { name: 'show'; run: Run }
  | { name: 'result'; run: Run };

export interface AppProps {
  scenarios?: readonly Scenario[];
}

export default function App({ scenarios = catalogue }: AppProps) {
  const people = usePeople();
  const [settings, changeSettings] = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'whos-in' });
  const looks = useLooks();

  const ticked = people.list.filter((person) => person.ticked).map((person) => person.name);

  /** Picks the unlucky person, then hands the show the window (decision 0005). */
  function start(scenario: Scenario, names: readonly string[], looks?: Looks) {
    changeSettings({ lastScenario: scenario.id });
    setScreen({
      name: 'show',
      run: {
        scenario,
        names,
        unlucky: pickUnlucky(names),
        looks,
        seed: newSeed(),
        muted: settings.muted,
      },
    });
  }

  /** A show with a line-up opens it first; any other starts at once. */
  function choose(scenario: Scenario) {
    if (scenario.lineUp) {
      setScreen({ name: 'line-up', scenario, looks: looks.open(scenario, ticked) });
    } else {
      start(scenario, ticked);
    }
  }

  if (screen.name === 'show') {
    const { run } = screen;
    return (
      <ShowScreen
        run={run}
        onFinish={() => setScreen({ name: 'result', run })}
        onCancel={() => setScreen({ name: 'shows' })}
      />
    );
  }

  if (screen.name === 'result') {
    const { run } = screen;
    return (
      <Result
        run={run}
        onRunAgain={() => start(run.scenario, run.names, run.looks)}
        onRunWithout={() => {
          people.untick(run.unlucky);
          const names = run.names.filter((name) => name !== run.unlucky);
          start(run.scenario, names, run.looks && withoutLooks(run.looks, run.unlucky));
        }}
        onChangeWhosIn={() => setScreen({ name: 'whos-in' })}
      />
    );
  }

  return (
    <div className={layout.page}>
      <Header
        step={STEP[screen.name]}
        muted={settings.muted}
        onMutedChange={(muted) => changeSettings({ muted })}
      />
      {screen.name === 'whos-in' ? (
        <WhosIn people={people} onNext={() => setScreen({ name: 'shows' })} />
      ) : screen.name === 'line-up' ? (
        <LineUp
          lineUp={screen.scenario.lineUp!}
          names={ticked}
          looks={screen.looks}
          onLooksChange={(next) => {
            looks.change(screen.scenario, next);
            setScreen({ ...screen, looks: next });
          }}
          onBack={() => setScreen({ name: 'shows' })}
          onStart={() => start(screen.scenario, ticked, screen.looks)}
        />
      ) : (
        <PickAShow
          names={ticked}
          scenarios={scenarios}
          lastScenario={settings.lastScenario}
          onBack={() => setScreen({ name: 'whos-in' })}
          onStart={choose}
        />
      )}
    </div>
  );
}

const STEP = { 'whos-in': 1, shows: 2, 'line-up': 3 } as const;

function withoutLooks(looks: Looks, name: string): Looks {
  const left = new Map(looks);
  left.delete(name);
  return left;
}
