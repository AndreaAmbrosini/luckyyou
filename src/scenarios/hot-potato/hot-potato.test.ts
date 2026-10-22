import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { describe, expect, it } from 'vitest';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import { createRandom } from '../../scenario-kit/random';
import hotPotato from './index';
import { held, outOfPlay, ring, type Spot } from './layout';
import { BEATS, planShow, type Beat, type Catch, type Plan, type Twist } from './plan';

const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Luca',
  'Marco',
  'Priya',
  'Tom',
  'Maria Giulia Bianchi-Rossi Jr.',
];

/** The first `count` of the team. */
const names = (count: number) => TEAM.slice(0, count);

/** Plans for seeds 1 to `seeds`. */
function plans(count: number, unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(names(count), unlucky, createRandom(index + 1)),
  );
}

/** How long a throw is in the air. */
const flight = (each: Catch) => each.at - each.thrown;

const before = (plan: Plan) =>
  plan.catches.filter((each) => each.beat === 'plop' || each.beat === 'hot-hands');
const during = (plan: Plan, beat: Beat) => plan.catches.filter((each) => each.beat === beat);
const total = (plan: Plan) => BEATS.reduce((seconds, beat) => seconds + plan.beats[beat], 0);

/** A name tag's box on the stage: as wide as it may grow, two lines high. */
const tagBox = (spot: Spot) => ({
  left: spot.x - spot.tag.maxWidth / 2,
  right: spot.x + spot.tag.maxWidth / 2,
  top: spot.y - 0.04 * spot.size,
  bottom: spot.y - 0.04 * spot.size + 2.4 * spot.tag.size + 8,
});

const overlap = (a: Spot, b: Spot) => {
  const one = tagBox(a);
  const two = tagBox(b);
  return (
    one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom
  );
};

const overlapping = (spots: Spot[]) =>
  spots.some((spot, index) => spots.slice(index + 1).some((other) => overlap(spot, other)));

/** Everyone in play, then the same with each of them out of play. */
const mixes = (count: number): Spot[][] => {
  const spots = ring(count);
  return [spots, ...spots.map((_, out) => spots.map((s, i) => (i === out ? outOfPlay(s) : s)))];
};

/** Every head count, with seeds 1–40. */
function everyPlan(): { label: string; plan: Plan; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 12; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const unlucky = names(count).at(-1)!;
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(names(count), unlucky, createRandom(seed)),
        unlucky,
      });
    }
  }
  return all;
}

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  readonly beat: string;
  /** Who holds the potato; '' while it flies. */
  readonly holder: string;
  readonly sparkler: number;
  readonly lit: boolean;
  readonly inPlay: readonly string[];
  readonly moods: Readonly<Record<string, string>>;
  /** How big each person is drawn, 1 their spot's size. */
  readonly scales: Readonly<Record<string, number>>;
}

/** Someone catching the potato: who, and what the stage showed in that frame. */
interface Caught {
  readonly holder: string;
  readonly sparkler: number;
  readonly beat: string;
}

/**
 * Runs Hot Potato and notes what the stage showed every frame, and every
 * catch. In hot hands a catch is thrown on at once, so frames alone can miss
 * it: the catches are read from each change of the potato's holder.
 */
async function watch(
  team: readonly string[],
  unlucky: string,
  seed = 1,
  /** Called after every frame as well, for what the frames don't hold. */
  extra?: (time: number, stage: HTMLElement) => void,
): Promise<{ frames: Frame[]; catches: Caught[]; record: ShowRecord }> {
  const frames: Frame[] = [];
  const catches: Caught[] = [];
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts: { scene: HTMLElement; people: HTMLElement[]; potato: SVGElement } | undefined;
  let holder = '';
  const note = (changes: MutationRecord[]) => {
    if (!parts) return;
    const { scene, potato } = parts;
    changes.forEach((_, index) => {
      // Each change names the holder before it; the last one's is the holder now.
      const next = changes[index + 1]?.oldValue ?? potato.dataset.holder ?? '';
      if (next === holder) return;
      holder = next;
      if (next) {
        catches.push({
          holder: next,
          sparkler: Number(potato.dataset.sparkler),
          beat: scene.dataset.beat!,
        });
      }
    });
  };
  const holders = new MutationObserver(note);
  let record: ShowRecord;
  try {
    record = await runShow(hotPotato, {
      names: team,
      unlucky,
      seed,
      onFrame(time, stage) {
        if (!parts) {
          parts = {
            scene: stage.querySelector<HTMLElement>('[data-part="scene"]')!,
            people: [...stage.querySelectorAll<HTMLElement>('[data-person]')],
            potato: stage.querySelector<SVGElement>('[data-part="potato"]')!,
          };
          holders.observe(parts.potato, {
            attributeFilter: ['data-holder'],
            attributeOldValue: true,
          });
        }
        const { scene, people, potato } = parts;
        // Once the show is over, the run empties the stage.
        if (!scene.isConnected) return;
        frames.push({
          time,
          beat: scene.dataset.beat!,
          holder: potato.dataset.holder!,
          sparkler: Number(potato.dataset.sparkler),
          lit: potato.dataset.lit === 'true',
          inPlay: people
            .filter((person) => person.dataset.inPlay === 'true')
            .map((person) => person.dataset.person!),
          moods: Object.fromEntries(
            people.map((person) => [person.dataset.person!, person.dataset.mood!]),
          ),
          scales: Object.fromEntries(
            people.map((person) => [
              person.dataset.person!,
              Number(gsap.getProperty(person, 'scale')),
            ]),
          ),
        });
        extra?.(time, stage);
      },
    });
  } finally {
    // The last catch can still be waiting to be reported.
    note(holders.takeRecords());
    holders.disconnect();
  }
  expect(record.outcome).toBe('finished');
  return { frames, catches, record };
}

/** Whether `element` is drawn: neither it nor anything around it on `stage` is hidden. */
function shown(element: Element | null, stage: HTMLElement): boolean {
  for (let at = element; at && at !== stage; at = at.parentElement) {
    const { visibility, display } = (at as HTMLElement).style;
    if (visibility === 'hidden' || display === 'none' || at.getAttribute('display') === 'none') {
      return false;
    }
  }
  return element !== null;
}

/** Where `element` is drawn on `stage`: the styles that place it and everything around it. */
function placement(element: Element, stage: HTMLElement): string {
  const styles: string[] = [];
  for (let at: Element | null = element; at && at !== stage; at = at.parentElement) {
    const { transform, left, top, opacity, visibility } = (at as HTMLElement).style;
    styles.push([transform, left, top, opacity, visibility].join(' '));
  }
  return styles.join(' / ');
}

/** The captions of one run, in order. */
const said = (record: ShowRecord) => record.captions.map((caption) => caption.text);

/** Whether `lines` appear in `texts` in this order, not necessarily next to each other. */
function inOrder(texts: readonly string[], lines: readonly string[]): boolean {
  let next = 0;
  for (const text of texts) if (text === lines[next]) next++;
  return next === lines.length;
}

/** The first seed whose plan has the sparkler going out. */
const dudSeed = (count: number, unlucky: string) =>
  plans(count, unlucky).findIndex((plan) => plan.dud) + 1;

describeSpec(await loadFeature('./hot-potato.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Hot Potato', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(hotPotato.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(hotPotato.description).toBe(description);
      });
      And('its picture is 🥔', () => {
        expect(hotPotato.card).toEqual({ emoji: '🥔' });
      });
      And('it takes 2 to 12 people', () => {
        expect(hotPotato.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule("It pops in the unlucky person's hands", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, variables) => {
        let team: string[];
        let unlucky: string;
        let frames: Frame[];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          team = names(Number(variables.count));
          unlucky = variables.position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs', async () => {
          ({ frames } = await watch(team, unlucky));
        });
        Then("the potato pops in the unlucky person's hands", () => {
          expect(frames.some((frame) => frame.beat === 'pop')).toBe(true);
          expect(frames.filter((frame) => frame.beat !== 'pop').at(-1)!.holder).toBe(unlucky);
        });
        And('nobody else is holding it when it pops', () => {
          const freeze = frames.filter((frame) => frame.beat === 'freeze');
          expect(freeze.length).toBeGreaterThan(0);
          for (const frame of freeze) expect(frame.holder).toBe(unlucky);
        });
      },
    );

    RuleScenario('Who catches it first gives nothing away', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, with the same unlucky person every time', () => {});
      When('the show runs with 20 different random seeds', () => {
        runs = plans(8, 'Luca');
      });
      Then("the potato drops into at least 5 different people's hands first", () => {
        expect(new Set(runs.map((plan) => plan.catches[0]!.by)).size).toBeGreaterThanOrEqual(5);
      });
      And(
        'in some runs the unlucky person catches it before the showdown, and in some runs not',
        () => {
          const early = runs.map((plan) => before(plan).some((each) => each.by === 'Luca'));
          expect(early).toContain(true);
          expect(early).toContain(false);
        },
      );
    });
  });

  Rule(
    'Throws speed up, then slow down for a showdown',
    ({ RuleScenario, RuleScenarioOutline }) => {
      RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, variables) => {
        let plan: Plan;
        let unlucky: string;
        Given('<count> people', () => {});
        When('the show runs', () => {
          const team = names(Number(variables.count));
          unlucky = team[0]!;
          plan = planShow(team, unlucky, createRandom(1));
        });
        Then('each throw before the showdown is quicker than the one before', () => {
          const throws = during(plan, 'hot-hands').map(flight);
          expect(throws.length).toBeGreaterThan(1);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeLessThan(throws[index]!);
          });
        });
        And(
          '<in play> people are left in play for the showdown, the unlucky person among them',
          () => {
            expect(plan.showdown).toHaveLength(Number(variables['in play']));
            expect(plan.showdown).toContain(unlucky);
          },
        );
        And('each throw in the showdown takes longer than the one before', () => {
          const throws = during(plan, 'showdown').map(flight);
          expect(throws).toHaveLength(3);
          throws.slice(1).forEach((length, index) => {
            expect(length).toBeGreaterThan(throws[index]!);
          });
        });
      });

      RuleScenario('Everyone else steps back', ({ Given, When, Then, And }) => {
        const team = names(8);
        let plan: Plan;
        let showdown: Frame[];
        Given('8 people', () => {
          plan = planShow(team, 'Luca', createRandom(1));
        });
        When('the showdown starts', async () => {
          const { frames } = await watch(team, 'Luca');
          showdown = frames.slice(frames.findIndex((frame) => frame.beat === 'showdown'));
        });
        Then('the 5 people out of play step back, smaller and relieved', () => {
          const outside = team.filter((name) => !plan.showdown.includes(name));
          expect(outside).toHaveLength(5);
          const start = showdown[0]!.time;
          for (const frame of showdown) {
            expect([...frame.inPlay].sort()).toEqual([...plan.showdown].sort());
            for (const name of outside) {
              expect(frame.moods[name], name).toBe('happy');
              if (frame.time >= start + 0.4) expect(frame.scales[name], name).toBeCloseTo(0.88, 3);
            }
          }
        });
        And('the potato only goes to the 3 in play until it pops', () => {
          const holders = showdown.map((frame) => frame.holder).filter(Boolean);
          expect(holders.length).toBeGreaterThan(0);
          for (const holder of holders) expect(plan.showdown).toContain(holder);
        });
      });

      RuleScenario('Who is in the showdown gives nothing away', ({ Given, When, Then }) => {
        let runs: Plan[];
        Given('8 people, with the same unlucky person every time', () => {});
        When('the show runs with 20 different random seeds', () => {
          runs = plans(8, 'Luca');
        });
        Then(
          'the unlucky person is the first to catch it in the showdown in some runs, and not in others',
          () => {
            const first = runs.map((plan) => during(plan, 'showdown')[0]!.by === 'Luca');
            expect(first).toContain(true);
            expect(first).toContain(false);
          },
        );
      });
    },
  );

  Rule('The sparkler is the clock everyone watches', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('It burns down to the pop', ({ When, Then, And }) => {
      const team = names(8);
      let frames: Frame[];
      let catches: Caught[];
      When('the show runs', async () => {
        ({ frames, catches } = await watch(team, 'Luca', dudSeed(8, 'Luca')));
      });
      Then(
        'the sparkler is shorter at each throw than at the one before, except when it relights',
        () => {
          expect(catches.length).toBeGreaterThan(5);
          expect(frames.some((frame) => frame.beat === 'relight')).toBe(true);
          const relight = BEATS.indexOf('relight');
          const order = (each: Caught) => BEATS.indexOf(each.beat as Beat);
          catches.slice(1).forEach((each, k) => {
            const previous = catches[k]!;
            const relit = order(previous) < relight && order(each) >= relight;
            if (!relit) {
              expect(each.sparkler, `catch ${k + 1}, ${each.holder}`).toBeLessThan(
                previous.sparkler,
              );
            }
          });
        },
      );
      And(
        'it is at its last spark only while the unlucky person holds the potato, just before the pop',
        () => {
          const last = frames.filter((frame) => frame.sparkler === 0);
          expect(last.length).toBeGreaterThan(0);
          for (const frame of last) {
            expect(frame.holder, `at ${frame.time}`).toBe('Luca');
            expect(['last-throw', 'freeze', 'pop']).toContain(frame.beat);
          }
          for (const frame of frames.filter((each) => each.beat === 'freeze')) {
            expect(frame.sparkler).toBe(0);
          }
        },
      );
    });

    RuleScenarioOutline(
      'Sometimes it seems to go out, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let runs: Plan[];
        let frames: Frame[];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', async () => {
          const team = names(Number(variables.count));
          runs = plans(team.length, team[0]!);
          ({ frames } = await watch(team, team[0]!, dudSeed(team.length, team[0]!)));
        });
        Then(
          'in some runs the sparkler goes out before the showdown, everyone relaxes, and it relights shorter',
          () => {
            expect(runs.some((plan) => plan.dud)).toBe(true);
            const dud = frames.filter((frame) => frame.beat === 'dud');
            expect(dud.length).toBeGreaterThan(0);
            for (const frame of dud) {
              expect(frame.lit).toBe(false);
              expect(Object.values(frame.moods)).toHaveLength(Number(variables.count));
              for (const mood of Object.values(frame.moods)) expect(mood).toBe('happy');
            }
            const relight = frames.find((frame) => frame.beat === 'relight')!;
            expect(relight.lit).toBe(true);
            expect(relight.sparkler).toBeLessThan(dud[0]!.sparkler);
          },
        );
        And('in some runs it never goes out', () => {
          expect(runs.some((plan) => plan.dud === null)).toBe(true);
        });
      },
    );
  });

  Rule('The last throw can twist', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'The last throw, with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let unlucky: string;
        let runs: Plan[];
        const twisted = (twist: Twist) => runs.filter((plan) => plan.twist === twist);
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', () => {
          const count = Number(variables.count);
          unlucky = names(count)[0]!;
          runs = plans(count, unlucky);
        });
        Then(
          'in some runs the last throw goes to someone else, who throws it straight back to the unlucky person',
          () => {
            expect(twisted('back').length).toBeGreaterThan(0);
            for (const plan of twisted('back')) {
              const [away, back] = plan.catches.slice(-2);
              expect(away!.from).toBe(unlucky);
              expect(away!.by).not.toBe(unlucky);
              expect(back!.from).toBe(away!.by);
              expect(back!.by).toBe(unlucky);
            }
          },
        );
        And('in some runs the unlucky person throws it away and it curves back to them', () => {
          expect(twisted('boomerang').length).toBeGreaterThan(0);
          for (const plan of twisted('boomerang')) {
            const last = plan.catches.at(-1)!;
            expect([last.from, last.by]).toEqual([unlucky, unlucky]);
          }
        });
        And('in some runs it simply lands with the unlucky person', () => {
          expect(twisted('straight').length).toBeGreaterThan(0);
          for (const plan of twisted('straight')) {
            const last = plan.catches.at(-1)!;
            expect(last.by).toBe(unlucky);
            expect(last.from).not.toBe(unlucky);
          }
        });
      },
    );
  });

  Rule('The ending is a pop and a paper crown', ({ RuleScenario }) => {
    RuleScenario('A freeze, then the pop', ({ Given, When, Then, And }) => {
      const team = names(8);
      let frames: Frame[];
      const freeze: { potato: string; people: string }[] = [];
      const pop: { potato: boolean; confetti: number; crown: boolean }[] = [];
      Given('the unlucky person is "Luca"', () => {});
      When('the potato reaches "Luca" for the last time', async () => {
        ({ frames } = await watch(team, 'Luca', 1, (_, stage) => {
          const beat = stage.querySelector<HTMLElement>('[data-part="scene"]')?.dataset.beat;
          if (beat === 'freeze') {
            freeze.push({
              potato: placement(stage.querySelector('[data-part="potato"]')!, stage),
              people: [...stage.querySelectorAll('[data-person]')]
                .map((person) => placement(person, stage))
                .join(' | '),
            });
          }
          if (beat === 'pop') {
            pop.push({
              potato: shown(stage.querySelector('[data-part="potato"]'), stage),
              confetti: [...stage.querySelectorAll('[data-part="confetti"]')].filter((bit) =>
                shown(bit, stage),
              ).length,
              crown: shown(stage.querySelector('[data-person="Luca"] [data-part="crown"]'), stage),
            });
          }
        }));
      });
      Then(
        'everything holds still for at least half a second, the sparkler at its last spark',
        () => {
          const still = frames.filter((frame) => frame.beat === 'freeze');
          expect(still.at(-1)!.time - still[0]!.time).toBeGreaterThanOrEqual(0.5);
          for (const frame of still) expect(frame.sparkler).toBe(0);
          expect(freeze).toHaveLength(still.length);
          for (const each of freeze) expect(each).toEqual(freeze[0]);
        },
      );
      And('the potato pops into confetti', () => {
        expect(pop.some((each) => each.confetti > 10)).toBe(true);
        expect(pop.some((each) => each.potato)).toBe(false);
      });
      And('"Luca" gets a paper crown and celebrates', () => {
        expect(pop.some((each) => each.crown)).toBe(true);
        expect(frames.at(-1)!.moods.Luca).toBe('party');
      });
      And('everyone else cheers', () => {
        for (const name of team.filter((each) => each !== 'Luca')) {
          expect(frames.at(-1)!.moods[name], name).toBe('happy');
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      const placed: { time: number; luca: string }[] = [];
      let duration = 0;
      Given('the unlucky person is "Luca"', () => {});
      When('the show runs', async () => {
        const { record } = await watch(names(8), 'Luca', 1, (time, stage) => {
          const luca = stage.querySelector('[data-person="Luca"]')!;
          placed.push({ time, luca: placement(luca, stage) });
        });
        duration = record.duration;
      });
      Then('"Luca" is on stage, not moving, for the last 1.5 seconds', () => {
        const last = placed.filter((each) => each.time >= duration - 1.5);
        expect(last.length).toBeGreaterThan(30);
        for (const each of last) expect(each.luca).toBe(last[0]!.luca);
      });
    });
  });

  Rule('The beats keep the show between 14 and 18 seconds', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long', ({ When, Then }) => {
      const runs = new Map<number, Plan>();
      When('the show runs at 12, 8 and 2 people, with the sparkler going out', () => {
        for (const count of [12, 8, 2]) {
          let seed = 1;
          let plan = planShow(names(count), names(count)[0]!, createRandom(seed));
          while (!plan.dud) plan = planShow(names(count), names(count)[0]!, createRandom(++seed));
          runs.set(count, plan);
        }
      });
      Then(
        'its beats take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          const beat: Record<string, Beat> = {
            plop: 'plop',
            'hot hands': 'hot-hands',
            'a dud': 'dud',
            'it relights': 'relight',
            'the showdown': 'showdown',
            'the last throw': 'last-throw',
            'the freeze': 'freeze',
            'the pop': 'pop',
          };
          for (const row of table) {
            for (const count of [12, 8, 2]) {
              const seconds = runs.get(count)!.beats[beat[row.beat!]!];
              const expected = Number(row[`${count} people`]);
              expect(Math.abs(seconds - expected), `${row.beat} at ${count}`).toBeLessThanOrEqual(
                0.3,
              );
            }
          }
        },
      );
    });

    RuleScenario('Every head count lands inside the time limit', ({ When, Then }) => {
      let runs: ReturnType<typeof everyPlan>;
      When(
        'the show runs at every head count from 2 to 12, with and without the sparkler going out',
        () => {
          runs = everyPlan();
          for (let count = 2; count <= 12; count++) {
            const duds = runs
              .filter(({ plan }) => plan.ring.length === count)
              .map(({ plan }) => plan.dud !== null);
            expect(duds, `${count} people`).toContain(true);
            expect(duds, `${count} people`).toContain(false);
          }
        },
      );
      Then('each run lasts between 14 and 18 seconds', () => {
        for (const { label, plan } of runs) {
          expect(total(plan), label).toBeGreaterThanOrEqual(14);
          expect(total(plan), label).toBeLessThanOrEqual(18);
        }
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the story', ({ Given, When, Then }) => {
      let seed: number;
      let record: ShowRecord;
      Given('8 people, the unlucky person is "Luca", and the sparkler goes out once', () => {
        seed = dudSeed(8, 'Luca');
        expect(seed, 'a seed with a dud').toBeGreaterThan(0);
      });
      When('the show runs', async () => {
        ({ record } = await watch(names(8), 'Luca', seed));
      });
      Then('the captions include, in this order:', (_, table: Record<string, string>[]) => {
        const lines = table.map((row) => row.caption!);
        expect(lines).toHaveLength(6);
        expect(inOrder(said(record), lines), said(record).join(' / ')).toBe(true);
      });
    });

    RuleScenario('The showdown names each catch', ({ Given, When, Then }) => {
      const team = names(12);
      const wanted = ['Luca', 'Tom', 'Priya'];
      let found: { seed: number; unlucky: string } | undefined;
      let record: ShowRecord;
      Given('the showdown\'s catches go to "Luca", "Tom" and "Priya"', () => {
        search: for (let seed = 1; seed <= 3000; seed++) {
          for (const unlucky of wanted) {
            const plan = planShow(team, unlucky, createRandom(seed));
            if (
              during(plan, 'showdown')
                .map((each) => each.by)
                .join() === wanted.join()
            ) {
              found = { seed, unlucky };
              break search;
            }
          }
        }
        expect(found, 'no seed up to 3000 sends the showdown to Luca, Tom, Priya').toBeDefined();
      });
      When('the show runs', async () => {
        ({ record } = await watch(team, found!.unlucky, found!.seed));
      });
      Then('the showdown is captioned "Luca…", "Luca… Tom…", "Luca… Tom… Priya…"', () => {
        const lines = ['Luca…', 'Luca… Tom…', 'Luca… Tom… Priya…'];
        expect(inOrder(said(record), lines), said(record).join(' / ')).toBe(true);
      });
    });

    RuleScenario("The last throw's twists are captioned", ({ Given, When, Then, And }) => {
      const ran = new Map<Twist, { plan: Plan; record: ShowRecord }>();
      Given('the unlucky person is "Luca"', () => {});
      When('the show runs with 20 different random seeds', async () => {
        const all = plans(8, 'Luca');
        for (const twist of ['back', 'boomerang'] as const) {
          const seed = all.findIndex((plan) => plan.twist === twist) + 1;
          expect(seed, twist).toBeGreaterThan(0);
          const { record } = await watch(names(8), 'Luca', seed);
          ran.set(twist, { plan: all[seed - 1]!, record });
        }
      });
      Then('every thrown-back last throw is captioned "<name>… nope, back to Luca!"', () => {
        const { plan, record } = ran.get('back')!;
        expect(said(record)).toContain(`${plan.catches.at(-2)!.by}… nope, back to Luca!`);
      });
      And('every last throw that curves back is captioned "It\'s coming back!"', () => {
        expect(said(ran.get('boomerang')!.record)).toContain("It's coming back!");
        expect(said(ran.get('back')!.record)).not.toContain("It's coming back!");
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let record: ShowRecord;
      When('the show runs', async () => {
        ({ record } = await watch(names(8), 'Luca', dudSeed(8, 'Luca')));
      });
      Then('every caption stays on screen for at least 1 second', () => {
        expect(record.captions.length).toBeGreaterThan(5);
        for (const caption of record.captions) {
          expect(caption.to - caption.from, caption.text).toBeGreaterThanOrEqual(1 - 1e-9);
        }
      });
    });

    RuleScenario('Names stay readable', ({ When, Then, And }) => {
      let shown: Spot[][];
      When('the show runs at 12 and at 2 people', () => {
        shown = [...mixes(12), ...mixes(2)];
      });
      Then('every name tag is set at 22 pixels or more on the 1280 by 720 stage', () => {
        for (const spots of shown) {
          spots.forEach((spot) => expect(spot.tag.size).toBeGreaterThanOrEqual(22));
        }
      });
      And('with 2 people, both name tags are set at 44 pixels or more', () => {
        ring(2).forEach((spot) => expect(spot.tag.size).toBeGreaterThanOrEqual(44));
      });
      And('no name tag is ever over another', () => {
        for (const spots of shown) expect(overlapping(spots)).toBe(false);
      });
    });
  });
});

describe('The ring', () => {
  it('no tag overlaps at any count', () => {
    for (let count = 2; count <= 12; count++) {
      const spots = ring(count);
      expect(spots, `${count} people`).toHaveLength(count);
      for (const mix of mixes(count)) expect(overlapping(mix), `${count} people`).toBe(false);
      for (let mask = 0; mask < 2 ** count; mask++) {
        const mixed = spots.map((spot, i) => (mask & (1 << i) ? outOfPlay(spot) : spot));
        expect(overlapping(mixed), `${count} people, mask ${mask}`).toBe(false);
      }
    }
  });

  it('8 people match the storyboard', () => {
    const spots = ring(8);
    expect(spots[0]).toMatchObject({ x: 640, y: 260, size: 78 });
    expect(spots[4]).toMatchObject({ x: 640, y: 640, size: 104 });
  });

  it('held is 35 px over the head', () => {
    const spot = ring(8)[0]!;
    expect(held(spot)).toEqual({ x: spot.x, y: spot.y - 0.8 * spot.size - 35 });
  });
});

describe('The stage', () => {
  it('plays the plan for its seed', async () => {
    const team = names(8);
    for (const twist of ['straight', 'back', 'boomerang'] as const) {
      const seed = plans(8, 'Luca').findIndex((plan) => plan.twist === twist) + 1;
      const plan = planShow(team, 'Luca', createRandom(seed));
      const { catches } = await watch(team, 'Luca', seed);
      const holders = catches.map((each) => each.holder);
      expect(holders, `${twist}, seed ${seed}`).toEqual(plan.catches.map((each) => each.by));
    }
  });
});

describe('The plan', () => {
  const all = everyPlan();

  it('hot-hands throws never drop under 0.4 s', () => {
    for (const { label, plan } of all) {
      for (const each of during(plan, 'hot-hands')) {
        expect(flight(each), label).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('nobody throws to themselves', () => {
    for (const { label, plan, unlucky } of all) {
      const { catches } = plan;
      catches.slice(0, -1).forEach((each) => expect(each.from, label).not.toBe(each.by));
      const last = catches.at(-1)!;
      if (plan.twist !== 'boomerang') expect(last.from, label).not.toBe(last.by);
      expect(last.by, label).toBe(unlucky);
      expect(last.sparkler, label).toBe(0);
      catches.slice(0, -1).forEach((each, index) => {
        expect(each.sparkler, label).toBeGreaterThan(0);
        if (index > 0) expect(each.sparkler, label).toBeLessThan(catches[index - 1]!.sparkler);
      });
    }
  });

  it('the catches add up', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.at, label).toBeCloseTo(previous + each.seconds, 9);
      });
      const { beats } = plan;
      const lastThrowEnd =
        beats.plop +
        beats['hot-hands'] +
        beats.dud +
        beats.relight +
        beats.showdown +
        beats['last-throw'];
      expect(plan.catches.at(-1)!.at, label).toBeCloseTo(lastThrowEnd, 9);
    }
  });

  it('each throw leaves after the previous catch and lands later', () => {
    for (const { label, plan } of all) {
      plan.catches.forEach((each, index) => {
        const previous = index === 0 ? 0 : plan.catches[index - 1]!.at;
        expect(each.thrown, label).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(each.thrown, label).toBeLessThan(each.at);
      });
    }
  });
});
