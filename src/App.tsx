import { useState } from 'react';
import { catalogue } from './catalogue/catalogue';
import { useLooks, type DealFrom, type ThemeChoice } from './line-up/looks';
import { usePeople } from './people/people';
import { drawShow, newSeed, pickUnlucky } from './pick/pick';
import type { ChosenLook, Scenario } from './scenario-kit/contract';
import { Header } from './screens/Header';
import layout from './screens/layout.module.css';
import { LineUp } from './screens/LineUp';
import { PickAShow, SURPRISE } from './screens/PickAShow';
import { Result } from './screens/Result';
import { ShowScreen, type Run } from './screens/ShowScreen';
import { WhosIn } from './screens/WhosIn';
import { musicLevel, useSettings } from './settings/settings';

type Looks = ReadonlyMap<string, ChosenLook>;

type Screen =
  | { name: 'whos-in' }
  | { name: 'shows' }
  | {
      name: 'line-up';
      scenario: Scenario;
      looks: Looks;
      theme: ThemeChoice | null;
      pinned: ReadonlySet<string>;
      dealFrom: DealFrom;
    }
  | { name: 'show'; run: Run }
  | { name: 'result'; run: Run };

export interface AppProps {
  scenarios?: readonly Scenario[];
}

export default function App({ scenarios = catalogue }: AppProps) {
  const people = usePeople();
  const [settings, changeSettings] = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'whos-in' });
  // The show clicked on Pick a show, by id, kept while the app is open.
  const [picked, setPicked] = useState<string | null>(null);
  // Surprise me is chosen: as it was last started, until a show is clicked.
  const [surprise, setSurprise] = useState(settings.surprise);
  const looks = useLooks();

  const ticked = people.list.filter((person) => person.ticked).map((person) => person.name);
  // The show clicked, else the one played last time, else the first: of those that take today's count.
  const runnable = scenarios.filter(
    ({ people }) => ticked.length >= people.min && ticked.length <= people.max,
  );
  const chosen =
    screen.name === 'line-up'
      ? screen.scenario
      : (runnable.find(({ id }) => id === picked) ??
        runnable.find(({ id }) => id === settings.lastScenario) ??
        runnable[0]);
  // A surprise needs two shows to draw from; with fewer, the chosen show stands.
  const surprising = surprise && screen.name !== 'line-up' && runnable.length >= 2;

  /** Picks the unlucky person, then hands the show the window (decision 0005). */
  function start(scenario: Scenario, names: readonly string[], looks?: Looks, theme?: string) {
    changeSettings({ lastScenario: scenario.id });
    setScreen({
      name: 'show',
      run: {
        scenario,
        names,
        unlucky: pickUnlucky(names),
        looks,
        theme,
        seed: newSeed(),
        muted: settings.muted,
        music: musicLevel(settings),
      },
    });
  }

  /** A show with a line-up opens it first; any other starts at once. */
  function next(scenario: Scenario) {
    setPicked(scenario.id);
    changeSettings({ surprise: false });
    if (scenario.lineUp) {
      setScreen({
        name: 'line-up',
        scenario,
        looks: looks.open(scenario, ticked),
        theme: looks.openTheme(scenario),
        pinned: looks.openPins(scenario, ticked),
        dealFrom: looks.openDealFrom(scenario),
      });
    } else {
      start(scenario, ticked);
    }
  }

  /** Skips a show's Line-up: everyone in their kept look, on the kept theme or one drawn afresh. */
  function startWithLastLineUp(scenario: Scenario) {
    start(scenario, ticked, looks.open(scenario, ticked), looks.openTheme(scenario)?.name);
  }

  /**
   * Surprise me: draws a show that can run, not last time's, and starts it.
   * A show with a line-up skips it, so nobody sees the show before it starts.
   * The person is picked as for any show, in its own draw (decision 0025).
   */
  function startSurprise() {
    const scenario = drawShow(runnable, settings.lastScenario);
    changeSettings({ surprise: true });
    if (scenario.lineUp) startWithLastLineUp(scenario);
    else start(scenario, ticked);
  }

  if (screen.name === 'show') {
    const { run } = screen;
    return (
      <ShowScreen
        run={run}
        onFinish={() => setScreen({ name: 'result', run })}
        onCancel={() => setScreen({ name: 'shows' })}
        music={settings}
        onMusicChange={changeSettings}
      />
    );
  }

  if (screen.name === 'result') {
    const { run } = screen;
    return (
      <Result
        run={run}
        onRunAgain={() => start(run.scenario, run.names, run.looks, run.theme)}
        onRunWithout={() => {
          people.untick(run.unlucky);
          const names = run.names.filter((name) => name !== run.unlucky);
          const left = run.looks && withoutLooks(run.looks, run.unlucky);
          start(run.scenario, names, left, run.theme);
        }}
        onChangeWhosIn={() => setScreen({ name: 'whos-in' })}
      />
    );
  }

  return (
    <div className={layout.page}>
      <Header
        steps={[
          { label: "Who's in", chosen: String(ticked.length) },
          { label: 'Show', chosen: surprising ? SURPRISE : chosen?.name },
          ...(!surprising && chosen?.lineUp ? [{ label: 'Line-up' }] : []),
        ]}
        current={STEP[screen.name]}
        muted={settings.muted}
        onMutedChange={(muted) => changeSettings({ muted })}
        music={settings.music}
        musicVolume={settings.musicVolume}
        onMusicChange={changeSettings}
      />
      {screen.name === 'whos-in' ? (
        <WhosIn people={people} onNext={() => setScreen({ name: 'shows' })} />
      ) : screen.name === 'line-up' ? (
        <LineUp
          lineUp={screen.scenario.lineUp!}
          names={ticked}
          looks={screen.looks}
          theme={screen.theme}
          pinned={screen.pinned}
          dealFrom={screen.dealFrom}
          onThemeChange={(theme) => {
            looks.changeTheme(screen.scenario, theme);
            setScreen({ ...screen, theme });
          }}
          onDealFromChange={(dealFrom) => {
            looks.changeDealFrom(screen.scenario, dealFrom);
            setScreen({ ...screen, dealFrom });
          }}
          onLooksChange={(next, pinned) => {
            looks.change(screen.scenario, next);
            if (pinned !== screen.pinned) looks.changePins(screen.scenario, ticked, pinned);
            setScreen({ ...screen, looks: next, pinned });
          }}
          onBack={() => setScreen({ name: 'shows' })}
          onStart={() => start(screen.scenario, ticked, screen.looks, screen.theme?.name)}
        />
      ) : (
        <PickAShow
          names={ticked}
          scenarios={scenarios}
          lastScenario={settings.lastScenario}
          chosen={chosen}
          surprise={surprising}
          onChoose={(scenario) => {
            setPicked(scenario.id);
            setSurprise(false);
          }}
          onSurprise={() => setSurprise(true)}
          onBack={() => setScreen({ name: 'whos-in' })}
          onNext={next}
          onStartSurprise={startSurprise}
          onStartWithLastLineUp={(scenario) => {
            changeSettings({ surprise: false });
            startWithLastLineUp(scenario);
          }}
        />
      )}
    </div>
  );
}

/** Each step's index in the header's steps. */
const STEP = { 'whos-in': 0, shows: 1, 'line-up': 2 } as const;

function withoutLooks(looks: Looks, name: string): Looks {
  const left = new Map(looks);
  left.delete(name);
  return left;
}
