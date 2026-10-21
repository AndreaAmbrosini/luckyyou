import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { catalogue, scenarioModules } from '../src/catalogue/catalogue';
import { discoverScenarios, validateScenario } from '../src/catalogue/discover';
import { nameLength } from '../src/people/names';
import type { Scenario } from '../src/scenario-kit/contract';
import { runShow, type ShowRecord } from '../src/scenario-kit/testing';
import template from '../src/scenarios/_template';
import {
  currentUser,
  moveOnToShows,
  pickerNames,
  renderApp,
  resultHeading,
  showCard,
  storeTicked,
  TEAM,
} from './support/app';
import { fakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

/** Every scenario folder in the repository, as the app's catalogue finds them. */
const folders = import.meta.glob('../src/scenarios/*/index.ts', { eager: true, import: 'default' });
const folderOf = (path: string) => path.split('/').at(-2)!;

/** Each scenario the contract holds, with the folder it is checked against. */
const contract: { folder: string; scenario: Scenario }[] = [
  ...discoverScenarios(folders, { production: false }).map((scenario) => ({
    folder: scenario.id,
    scenario,
  })),
  // The template is skipped by the app, but every scenario starts as a copy of it.
  { folder: 'template', scenario: template },
];

/** Runs `run` for each scenario in the contract, and keeps what each show did. */
async function forEachShow(run: (scenario: Scenario) => Promise<ShowRecord>) {
  const records = new Map<Scenario, ShowRecord>();
  for (const { scenario } of contract) records.set(scenario, await run(scenario));
  return records;
}

/** A pick of `count` people from the team, with the unlucky person first or last. */
function pickOf(count: number, position: 'first' | 'last') {
  const names = TEAM.slice(0, count);
  return { names, unlucky: position === 'first' ? names[0]! : names.at(-1)! };
}

const expectNothingLeft = (record: ShowRecord, name: string) => {
  expect(record.stage?.childElementCount, name).toBe(0);
  expect(record.stage?.isConnected, name).toBe(false);
  expect(record.leftovers, name).toEqual({ elements: 0, animations: 0, timers: 0, listeners: 0 });
};

const expectOnTime = (record: ShowRecord, name: string) => {
  expect(record.outcome, name).toBe('finished');
  expect(record.duration, name).toBeGreaterThanOrEqual(10);
  expect(record.duration, name).toBeLessThanOrEqual(15);
};

/** A module map as import.meta.glob gives it, for scenarios in made-up folders. */
const modulesFor = (entries: [folder: string, value: unknown][]) =>
  Object.fromEntries(entries.map(([folder, value]) => [`../scenarios/${folder}/index.ts`, value]));

/** Opens the "Pick a show" step with two people ticked and these scenarios. */
async function startApp(scenarios: readonly Scenario[]) {
  storeTicked(['Anna', 'Ben']);
  renderApp({ scenarios });
  await moveOnToShows();
}

/** For each problem in the feature: a broken scenario, its folder, and what the console says. */
const PROBLEMS: Record<string, { folder: string; scenario: object; why: string }> = {
  'an id that differs from its folder name': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', id: 'hot-tomato' }),
    why: 'its id "hot-tomato" differs from its folder name',
  },
  "an id that isn't kebab-case": {
    folder: 'Hot_Potato',
    scenario: fakeScenario({ name: 'Hot Potato', id: 'Hot_Potato' }),
    why: `its id "Hot_Potato" isn't kebab-case`,
  },
  'a name over 30 characters': {
    folder: 'hot-potato',
    scenario: fakeScenario({ id: 'hot-potato', name: 'The Hottest Potato in the Whole' }),
    why: 'its name has 31 characters; the most is 30',
  },
  'a description over 90 characters': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', description: 'x'.repeat(91) }),
    why: 'its description has 91 characters; the most is 90',
  },
  'a description on two lines': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', description: 'Pass it on.\nQuickly.' }),
    why: 'its description is on more than one line',
  },
  'no card emoji or image': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', card: {} as { emoji: string } }),
    why: 'its card has no emoji or image',
  },
  'a minimum below 2 people': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', people: { min: 1, max: 12 } }),
    why: 'its minimum of 1 is below 2 people',
  },
  'a maximum above 12 people': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', people: { min: 2, max: 13 } }),
    why: 'its maximum of 13 is above 12 people',
  },
  'a minimum above its maximum': {
    folder: 'hot-potato',
    scenario: fakeScenario({ name: 'Hot Potato', people: { min: 6, max: 4 } }),
    why: 'its minimum of 6 is above its maximum of 4',
  },
  "a development-only flag that isn't yes/no": {
    folder: 'hot-potato',
    scenario: {
      ...fakeScenario({ name: 'Hot Potato' }),
      developmentOnly: 'yes',
    },
    why: `its development-only flag isn't true or false`,
  },
};

const XSS = '<img src=x onerror=alert(1)>';
const LONGEST = 'Maria Giulia Bianchi-Rossi Jr.';

describeSpec(await loadFeature('./scenarios.feature'), ({ Rule }) => {
  Rule('Scenarios are found by folder', ({ RuleScenario }) => {
    RuleScenario('A new folder shows up as a scenario', ({ Given, When, Then }) => {
      let modules: Record<string, unknown>;
      Given('a valid scenario named "Hot Potato" in src/scenarios/hot-potato/', () => {
        modules = modulesFor([['hot-potato', fakeScenario({ name: 'Hot Potato' })]]);
      });
      When('the app starts', () => startApp(discoverScenarios(modules, { production: false })));
      Then('"Hot Potato" is in the scenario picker', () => {
        expect(pickerNames()).toEqual(['Hot Potato']);
      });
    });

    RuleScenario('Folders starting with an underscore are skipped', ({ Given, Then, And }) => {
      Given('a scenario in src/scenarios/_template/', () => {
        expect(Object.keys(folders)).toContain('../src/scenarios/_template/index.ts');
      });
      Then('it is not in the scenario picker', async () => {
        await startApp(catalogue);
        expect(pickerNames()).not.toContain(template.name);
        expect(catalogue).not.toContain(template);
      });
      And("the app doesn't load it, so the production build leaves it out", () => {
        expect(Object.keys(scenarioModules).map(folderOf)).not.toContain('_template');
        expect(Object.keys(scenarioModules).map(folderOf)).toContain('shark-bait');
      });
    });

    RuleScenario('Scenarios are listed by name', ({ Given, Then }) => {
      let modules: Record<string, unknown>;
      Given('scenarios named "Snail Race", "Hot Potato" and "Shark Bait"', () => {
        modules = modulesFor(
          ['Snail Race', 'Hot Potato', 'Shark Bait'].map((name) => {
            const scenario = fakeScenario({ name });
            return [scenario.id, scenario];
          }),
        );
      });
      Then('the picker lists "Hot Potato", "Shark Bait", "Snail Race"', async () => {
        await startApp(discoverScenarios(modules, { production: false }));
        expect(pickerNames()).toEqual(['Hot Potato', 'Shark Bait', 'Snail Race']);
      });
    });

    RuleScenario('Development-only scenarios stay out of production', ({ Given, Then, And }) => {
      const labRat = fakeScenario({ name: 'Lab Rat', developmentOnly: true });
      const potato = fakeScenario({ name: 'Hot Potato' });
      let modules: Record<string, unknown>;
      Given('a scenario marked development-only', () => {
        modules = modulesFor([
          ['lab-rat', labRat],
          ['hot-potato', potato],
        ]);
      });
      Then('it is listed in development and test builds', () => {
        expect(discoverScenarios(modules, { production: false })).toEqual([potato, labRat]);
      });
      And('it is not listed in the production build', () => {
        expect(discoverScenarios(modules, { production: true })).toEqual([potato]);
      });
    });
  });

  Rule('Metadata is checked', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'A scenario with <problem> is skipped',
      ({ Given, When, Then, And }, { problem }) => {
        const broken = PROBLEMS[problem]!;
        const fine = fakeScenario({ name: 'Fine' });
        let warn: ReturnType<typeof vi.spyOn>;
        Given('a scenario folder whose metadata has <problem>', () => {
          expect(validateScenario(broken.scenario, broken.folder)).toEqual([broken.why]);
        });
        When('the app starts', async () => {
          warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
          const modules = modulesFor([
            [broken.folder, broken.scenario],
            ['fine', fine],
          ]);
          await startApp(discoverScenarios(modules, { production: false }));
        });
        Then('that scenario is not listed', () => {
          expect(pickerNames()).toEqual(['Fine']);
        });
        And('the console says why', () => {
          expect(warn).toHaveBeenCalledExactlyOnceWith(
            `Skipped src/scenarios/${broken.folder}/: ${broken.why}`,
          );
        });
        And('the other scenarios still work', async () => {
          await currentUser().click(showCard('Fine'));
          await resultHeading();
          expect(fine.runs).toHaveLength(1);
        });
      },
    );
  });

  Rule('Every show keeps the contract', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Its metadata is valid', ({ Then }) => {
      Then("the scenario's metadata has none of the problems above", () => {
        for (const [path, value] of Object.entries(folders)) {
          if (folderOf(path).startsWith('_')) continue;
          expect(validateScenario(value, folderOf(path)), path).toEqual([]);
        }
        expect(validateScenario(template, 'template')).toEqual([]);
      });
    });

    RuleScenarioOutline(
      'At its <size> head count, unlucky person <position>, the show keeps time and cleans up',
      ({ Given, When, Then, And }, { size, position }) => {
        let records: Map<Scenario, ShowRecord>;
        const headCount = (scenario: Scenario) =>
          size === 'smallest' ? scenario.people.min : scenario.people.max;
        Given(
          "the scenario's <size> head count, with the unlucky person <position> in the list",
          () => {
            expect(contract.length).toBeGreaterThan(0);
          },
        );
        When('the show runs', async () => {
          records = await forEachShow((scenario) =>
            runShow(scenario, {
              ...pickOf(headCount(scenario), position as 'first' | 'last'),
              seed: 2026,
            }),
          );
        });
        Then('it ends between 10 and 15 seconds after it started', () => {
          for (const [scenario, record] of records) expectOnTime(record, scenario.name);
        });
        And('the stage is empty', () => {
          for (const [scenario, record] of records) {
            expect(record.stage?.childElementCount, scenario.name).toBe(0);
          }
        });
        And('no element, animation, timer or listener it added is left', () => {
          for (const [scenario, record] of records) expectNothingLeft(record, scenario.name);
        });
      },
    );

    RuleScenario(
      'Everyone is shown, and the show ends on the unlucky person',
      ({ When, Then, And }) => {
        const shown = new Map<Scenario, { names: string[]; unlucky: string }>();
        const frames = new Map<Scenario, { time: number; text: string }[]>();
        let records: Map<Scenario, ShowRecord>;
        When("the show runs at the scenario's largest head count", async () => {
          records = await forEachShow((scenario) => {
            const pick = pickOf(scenario.people.max, 'last');
            const seen: { time: number; text: string }[] = [];
            shown.set(scenario, pick);
            frames.set(scenario, seen);
            return runShow(scenario, {
              ...pick,
              onFrame: (time, stage) => seen.push({ time, text: stage.textContent ?? '' }),
            });
          });
        });
        Then('every name appears on stage at some point', () => {
          for (const [scenario, { names }] of shown) {
            for (const name of names) {
              const seen = frames.get(scenario)!.some(({ text }) => text.includes(name));
              expect(seen, `${scenario.name}: ${name}`).toBe(true);
            }
          }
        });
        And('the unlucky name is on stage in the last 3 seconds', () => {
          for (const [scenario, { unlucky }] of shown) {
            const end = records.get(scenario)!.duration;
            const last = frames.get(scenario)!.filter(({ time }) => time >= end - 3);
            expect(last.length, scenario.name).toBeGreaterThan(0);
            expect(
              last.some(({ text }) => text.includes(unlucky)),
              scenario.name,
            ).toBe(true);
          }
        });
      },
    );

    RuleScenario('Names are shown as text', ({ Given, When, Then, And }) => {
      const texts = new Map<Scenario, string[]>();
      const made = new Map<Scenario, boolean>();
      Given('a person named "<img src=x onerror=alert(1)>"', () => {
        expect(XSS).toBe('<img src=x onerror=alert(1)>');
      });
      When('the show runs', async () => {
        await forEachShow((scenario) => {
          const seen: string[] = [];
          texts.set(scenario, seen);
          made.set(scenario, false);
          return runShow(scenario, {
            names: [XSS, ...TEAM.slice(0, scenario.people.min - 1)],
            unlucky: XSS,
            onFrame: (_, stage) => {
              seen.push(stage.textContent ?? '');
              if (stage.querySelector('[onerror], [src="x"]')) made.set(scenario, true);
            },
          });
        });
      });
      Then('that name appears on stage exactly as typed', () => {
        for (const [scenario, seen] of texts) {
          expect(
            seen.some((text) => text.includes(XSS)),
            scenario.name,
          ).toBe(true);
        }
      });
      And('no element is created from it', () => {
        for (const [scenario, created] of made) expect(created, scenario.name).toBe(false);
      });
    });

    RuleScenario("The longest allowed name doesn't break the show", ({ Given, When, Then }) => {
      let records: Map<Scenario, ShowRecord>;
      Given('a person named "Maria Giulia Bianchi-Rossi Jr.", 30 characters long', () => {
        expect(nameLength(LONGEST)).toBe(30);
      });
      When('the show runs', async () => {
        records = await forEachShow((scenario) =>
          runShow(scenario, {
            names: [LONGEST, ...TEAM.slice(0, scenario.people.max - 1)],
            unlucky: LONGEST,
          }),
        );
      });
      Then('it ends on time, with no errors', () => {
        for (const [scenario, record] of records) {
          expectOnTime(record, scenario.name);
          expect(record.error, scenario.name).toBeUndefined();
        }
      });
    });

    RuleScenarioOutline(
      'Cancelling at <seconds> seconds stops the show cleanly',
      ({ When, Then, And }, { seconds }) => {
        let records: Map<Scenario, ShowRecord>;
        When('the show is cancelled at <seconds> seconds', async () => {
          records = await forEachShow((scenario) =>
            runShow(scenario, {
              ...pickOf(scenario.people.max, 'last'),
              cancelAt: Number(seconds),
            }),
          );
        });
        Then('it stops within half a second', () => {
          for (const [scenario, record] of records) {
            expect(record.outcome, scenario.name).toBe('cancelled');
            expect(record.duration - Number(seconds), scenario.name).toBeLessThanOrEqual(0.5);
          }
        });
        And('it leaves nothing behind', () => {
          for (const [scenario, record] of records) expectNothingLeft(record, scenario.name);
        });
      },
    );
  });
});
