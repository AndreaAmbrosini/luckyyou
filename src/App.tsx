import { useState } from 'react';
import { usePeople } from './people/people';
import { newSeed, pickUnlucky } from './pick/pick';
import type { Scenario } from './scenario-kit/contract';
import { Header } from './screens/Header';
import layout from './screens/layout.module.css';
import { PickAShow } from './screens/PickAShow';
import { Result } from './screens/Result';
import { ShowScreen, type Run } from './screens/ShowScreen';
import { WhosIn } from './screens/WhosIn';
import { useSettings } from './settings/settings';

type Screen =
  | { name: 'whos-in' }
  | { name: 'shows' }
  | { name: 'show'; run: Run }
  | { name: 'result'; run: Run };

export interface AppProps {
  scenarios?: readonly Scenario[];
}

export default function App({ scenarios = [] }: AppProps) {
  const people = usePeople();
  const [settings, changeSettings] = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'whos-in' });

  const ticked = people.list.filter((person) => person.ticked).map((person) => person.name);

  /** Picks the unlucky person, then hands the show the window (decision 0005). */
  function start(scenario: Scenario, names: readonly string[]) {
    changeSettings({ lastScenario: scenario.id });
    setScreen({
      name: 'show',
      run: { scenario, names, unlucky: pickUnlucky(names), seed: newSeed(), muted: settings.muted },
    });
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
        onRunAgain={() => start(run.scenario, run.names)}
        onRunWithout={() => {
          people.untick(run.unlucky);
          start(
            run.scenario,
            run.names.filter((name) => name !== run.unlucky),
          );
        }}
        onChangeWhosIn={() => setScreen({ name: 'whos-in' })}
      />
    );
  }

  return (
    <div className={layout.page}>
      <Header
        step={screen.name === 'whos-in' ? 1 : 2}
        muted={settings.muted}
        onMutedChange={(muted) => changeSettings({ muted })}
      />
      {screen.name === 'whos-in' ? (
        <WhosIn people={people} onNext={() => setScreen({ name: 'shows' })} />
      ) : (
        <PickAShow
          names={ticked}
          scenarios={scenarios}
          lastScenario={settings.lastScenario}
          onBack={() => setScreen({ name: 'whos-in' })}
          onStart={(scenario) => start(scenario, ticked)}
        />
      )}
    </div>
  );
}
