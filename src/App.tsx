import { useState } from 'react';
import { usePeople } from './people/people';
import { newSeed, pickUnlucky } from './pick/pick';
import type { Scenario } from './scenario-kit/contract';
import { Header } from './screens/Header';
import layout from './screens/layout.module.css';
import { PickAShow } from './screens/PickAShow';
import { ShowScreen, type Run } from './screens/ShowScreen';
import { WhosIn } from './screens/WhosIn';
import { useSettings } from './settings/settings';

type Screen = { name: 'whos-in' } | { name: 'shows' } | { name: 'show'; run: Run };

export interface AppProps {
  scenarios?: readonly Scenario[];
}

export default function App({ scenarios = [] }: AppProps) {
  const people = usePeople();
  const [settings, changeSettings] = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'whos-in' });

  const names = people.list.filter((person) => person.ticked).map((person) => person.name);

  function start(scenario: Scenario) {
    changeSettings({ lastScenario: scenario.id });
    setScreen({
      name: 'show',
      run: { scenario, names, unlucky: pickUnlucky(names), seed: newSeed() },
    });
  }

  if (screen.name === 'show') {
    return <ShowScreen run={screen.run} onEnd={() => setScreen({ name: 'shows' })} />;
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
          names={names}
          scenarios={scenarios}
          lastScenario={settings.lastScenario}
          onBack={() => setScreen({ name: 'whos-in' })}
          onStart={start}
        />
      )}
    </div>
  );
}
