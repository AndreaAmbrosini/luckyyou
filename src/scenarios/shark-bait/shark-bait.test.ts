import { loadFeature } from '@amiceli/vitest-cucumber';
import { gsap } from 'gsap';
import { describe, expect, it } from 'vitest';
import { stagePx, type Scenario } from '../../scenario-kit';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import sharkBait from './index';
import { fitTags, places, tagBottom, type Place } from './layout';
import { planShow } from './plan';
import { createRandom } from '../../scenario-kit/random';

const TEAM = [
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
  'Marco',
];

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  /** The scene's beat. */
  readonly beat: string;
  /** Who is still in the water. */
  readonly inWater: readonly string[];
  /** Who the rope is heading for, if anyone. */
  readonly aim: string | null;
  /** Where the helicopter is on the stage. */
  readonly helicopter: { readonly x: number; readonly y: number };
}

/** One person, or a group, leaving the water at the same moment. */
interface Lift {
  readonly time: number;
  readonly beat: string;
  readonly names: readonly string[];
}

/** A whole show, frame by frame. */
class Watched {
  readonly record: ShowRecord;
  readonly frames: readonly Frame[];

  constructor(record: ShowRecord, frames: readonly Frame[]) {
    this.record = record;
    this.frames = frames;
  }

  /** Every moment someone left the water, in order. */
  get lifts(): Lift[] {
    return this.frames.flatMap((frame, index) => {
      const before = this.frames[index - 1]?.inWater ?? frame.inWater;
      const names = before.filter((name) => !frame.inWater.includes(name));
      return names.length > 0 ? [{ time: frame.time, beat: frame.beat, names }] : [];
    });
  }

  /** How long each beat lasted, in show seconds. */
  get beats(): Map<string, number> {
    const starts = this.frames.filter(
      (frame, index) => frame.beat !== this.frames[index - 1]?.beat,
    );
    return new Map(
      starts.map((start, index) => [
        start.beat,
        (starts[index + 1]?.time ?? this.record.duration) - start.time,
      ]),
    );
  }

  /** Who the rope headed for during `beat`, each change once. */
  aimsDuring(beat: string): string[] {
    const aims: string[] = [];
    for (const frame of this.frames) {
      if (frame.beat === beat && frame.aim && frame.aim !== aims.at(-1)) aims.push(frame.aim);
    }
    return aims;
  }

  /**
   * For each time the rope headed for someone in a one-at-a-time rescue, the
   * show seconds the helicopter spent still while it did: each frame it
   * didn't move counts one frame's time.
   */
  get rests(): { aim: string; seconds: number }[] {
    return this.restsUntil(Infinity, ['four-left', 'fake-out', 'duel']);
  }

  /** The same as `rests` for the duel, counted only until someone leaves the water. */
  get duelHolds(): { aim: string; seconds: number }[] {
    const lift = this.lifts.find((each) => each.beat === 'duel');
    return this.restsUntil(lift?.time ?? Infinity, ['duel']);
  }

  /**
   * The duel's moves, from when the helicopter first holds still over one of
   * the two until someone leaves the water: each run in one direction, and
   * whether it ended where the helicopter had held still before or turned
   * back on the way.
   */
  get duelMoves(): { from: number; to: number; halfway: boolean }[] {
    const lift = this.lifts.find((each) => each.beat === 'duel')?.time ?? Infinity;
    const xs = this.frames
      .filter((frame) => frame.beat === 'duel' && frame.time < lift)
      .map((frame) => frame.helicopter.x);
    const stops: number[] = [];
    const moves: { from: number; to: number }[] = [];
    let direction = 0;
    xs.forEach((x, index) => {
      if (index === 0) return;
      const dx = x - xs[index - 1]!;
      if (Math.abs(dx) < 0.5) {
        if (!stops.some((stop) => Math.abs(stop - x) < 5)) stops.push(x);
        direction = 0;
        return;
      }
      if (stops.length === 0) return;
      const sign = Math.sign(dx);
      if (sign !== direction) moves.push({ from: xs[index - 1]!, to: x });
      else moves.at(-1)!.to = x;
      direction = sign;
    });
    return moves.map((move) => ({
      ...move,
      halfway: !stops.some((stop) => Math.abs(stop - move.to) < 5),
    }));
  }

  private restsUntil(until: number, beats: readonly string[]): { aim: string; seconds: number }[] {
    const rests: { aim: string; frames: number }[] = [];
    this.frames.forEach((frame, index) => {
      const before = this.frames[index - 1];
      if (!frame.aim || !beats.includes(frame.beat) || frame.time >= until) return;
      if (frame.aim !== before?.aim) rests.push({ aim: frame.aim, frames: 0 });
      const still = before && Math.abs(frame.helicopter.x - before.helicopter.x) < 0.5;
      if (still) rests.at(-1)!.frames++;
    });
    const step = this.frames[1]!.time - this.frames[0]!.time;
    return rests.map(({ aim, frames }) => ({ aim, seconds: frames * step }));
  }

  /** Who was in the water when `beat` began. */
  inWaterAt(beat: string): readonly string[] {
    return this.frames.find((frame) => frame.beat === beat)?.inWater ?? [];
  }
}

/** Runs Shark Bait and notes what the stage showed every frame. */
async function watch(
  names: readonly string[],
  unlucky: string,
  { seed = 1, step, until }: { seed?: number; step?: number; until?: number } = {},
): Promise<Watched> {
  const frames: Frame[] = [];
  /** What each frame reads, found once: looking it up every frame is slow in jsdom. */
  let parts: {
    scene: HTMLElement;
    swimmers: HTMLElement[];
    rope: HTMLElement;
    helicopter: Element;
  };
  const record = await runShow(sharkBait, {
    names,
    unlucky,
    seed,
    step,
    cancelAt: until,
    onFrame(time, stage) {
      parts ??= {
        scene: stage.querySelector<HTMLElement>('[data-beat]')!,
        swimmers: [...stage.querySelectorAll<HTMLElement>('[data-person]')],
        rope: stage.querySelector<HTMLElement>('[data-part="rope"]')!,
        helicopter: stage.querySelector('[data-part="helicopter"]')!,
      };
      const { scene, swimmers, rope, helicopter } = parts;
      // Once the show is over, the run empties the stage.
      if (!scene.isConnected) return;
      frames.push({
        time,
        beat: scene.dataset.beat!,
        inWater: swimmers
          .filter((swimmer) => swimmer.dataset.inWater === 'true')
          .map((swimmer) => swimmer.dataset.person!),
        aim: rope.dataset.aim || null,
        helicopter: position(helicopter),
      });
    },
  });
  expect(record.outcome).toBe(until === undefined ? 'finished' : 'cancelled');
  return new Watched(record, frames);
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
function placement(element: HTMLElement, stage: HTMLElement): string {
  const styles: string[] = [];
  for (let at: HTMLElement | null = element; at && at !== stage; at = at.parentElement) {
    const { transform, left, top, opacity, visibility } = at.style;
    styles.push([transform, left, top, opacity, visibility].join(' '));
  }
  return styles.join(' / ');
}

const position = (element: Element | null) => ({
  x: Number(gsap.getProperty(element, 'x')),
  y: Number(gsap.getProperty(element, 'y')),
});

/** What the ending showed in one frame. */
interface EndFrame {
  readonly time: number;
  readonly inWater: readonly string[];
  readonly helicopter: { readonly phase: string; readonly x: number };
  readonly shark: { readonly phase: string; readonly shown: boolean };
  /** How far the shark's fin is from the last one in the water. */
  readonly gap: number;
  readonly lastShown: boolean;
  readonly rider: { readonly name: string; readonly parts: readonly string[] } | null;
  readonly finName: {
    readonly text: string;
    readonly size: string;
    readonly lines: string;
    readonly at: string;
  } | null;
}

/** Runs Shark Bait and notes, every frame, what its ending is made of. */
async function watchEnding(names: readonly string[], unlucky: string) {
  const frames: EndFrame[] = [];
  const record = await runShow(sharkBait, {
    names,
    unlucky,
    onFrame(time, stage) {
      const shark = stage.querySelector<HTMLElement>('[data-part="shark"]');
      if (!shark) return;
      const helicopter = stage.querySelector<HTMLElement>('[data-part="helicopter"]')!;
      const fin = shark.querySelector<HTMLElement>('[data-part="fin"]')!;
      const last = stage.querySelector<HTMLElement>(`[data-person="${unlucky}"]`)!;
      const rider = shark.querySelector<HTMLElement>('[data-part="rider"]');
      const finName = shark.querySelector<HTMLElement>('[data-part="fin-name"]');
      const from = position(fin);
      const to = position(last);
      frames.push({
        time,
        inWater: [...stage.querySelectorAll<HTMLElement>('[data-in-water="true"]')].map(
          (swimmer) => swimmer.dataset.person!,
        ),
        helicopter: { phase: helicopter.dataset.phase!, x: position(helicopter).x },
        shark: {
          phase: shark.dataset.phase!,
          shown: shown(fin, stage) || shown(shark.querySelector('[data-part="ride"]'), stage),
        },
        gap: Math.hypot(to.x - from.x, to.y - from.y),
        lastShown: shown(last, stage),
        rider:
          rider && shown(rider, stage)
            ? {
                name: rider.dataset.rider!,
                parts: [...rider.querySelectorAll<SVGElement>('g[data-part]')]
                  .filter((part) => part.getAttribute('display') !== 'none')
                  .map((part) => part.dataset.part!),
              }
            : null,
        finName:
          finName && shown(finName, stage)
            ? {
                text: finName.textContent ?? '',
                size: finName.style.getPropertyValue('--tag-size'),
                lines: finName.dataset.lines ?? '',
                at: placement(finName, stage),
              }
            : null,
      });
    },
  });
  expect(record.outcome).toBe('finished');
  return { record, frames };
}

/** The frames from the first one where the shark is in `phase`, up to its next phase. */
function sharkPhase(frames: readonly EndFrame[], phase: string): EndFrame[] {
  const start = frames.findIndex((frame) => frame.shark.phase === phase);
  if (start < 0) return [];
  const end = frames.findIndex((frame, index) => index > start && frame.shark.phase !== phase);
  return frames.slice(start, end < 0 ? undefined : end);
}

/** The beats up to the end of the duel. */
const BEATS_BEFORE_RUN = ['splash-in', 'group-rescues', 'four-left', 'fake-out', 'duel'] as const;

/** The beats as the feature's table names them. */
const BEATS: Record<string, string> = {
  'splash-in': 'splash-in',
  'group rescues': 'group-rescues',
  '4 left, one lifted out': 'four-left',
  '3 left, a fake-out': 'fake-out',
  'the duel': 'duel',
  "the shark's run": 'sharks-run',
  'the victory lap': 'victory-lap',
};

describeSpec(await loadFeature('./shark-bait.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Shark Bait', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(sharkBait.name).toBe(name);
      });
      And('its description is {string}', (_, description: string) => {
        expect(sharkBait.description).toBe(description);
      });
      And('its picture is 🦈', () => {
        expect(sharkBait.card).toEqual({ emoji: '🦈' });
      });
      And('it takes 2 to 12 people', () => {
        expect(sharkBait.people).toEqual({ min: 2, max: 12 });
      });
    });
  });

  Rule(
    'The unlucky person is the last one left in the water',
    ({ RuleScenario, RuleScenarioOutline }) => {
      RuleScenarioOutline(
        '<count> people, the unlucky person <position> in the list',
        ({ Given, When, Then, And }, { count, position }) => {
          const names = TEAM.slice(0, Number(count));
          let unlucky: string;
          let show: Watched;
          Given('<count> people, with the unlucky person <position> in the list', () => {
            unlucky = position === 'first' ? names[0]! : names.at(-1)!;
          });
          When('the show runs', async () => {
            show = await watch(names, unlucky);
          });
          Then('everyone else is lifted out of the water', () => {
            const lifted = show.lifts.flatMap((lift) => lift.names);
            expect(lifted.sort()).toEqual(names.filter((name) => name !== unlucky).sort());
          });
          And('the unlucky person is never lifted out', () => {
            for (const frame of show.frames) expect(frame.inWater).toContain(unlucky);
          });
        },
      );

      RuleScenario('Where people start gives nothing away', ({ Given, When, Then }) => {
        const names = TEAM;
        let unlucky: string;
        const places = new Set<string>();
        Given('12 people, with the same unlucky person every time', () => {
          unlucky = 'Elena';
        });
        When('the show runs with 20 different random seeds', async () => {
          for (let seed = 1; seed <= 20; seed++) {
            let place: string | null = null;
            await runShow(sharkBait, {
              names,
              unlucky,
              seed,
              // Only where people start matters here.
              cancelAt: 0.5,
              onFrame(_, stage) {
                const swimmer = stage.querySelector(`[data-person="${unlucky}"]`);
                place ??= `${gsap.getProperty(swimmer, 'x')},${gsap.getProperty(swimmer, 'y')}`;
              },
            });
            places.add(place!);
          }
        });
        Then('the unlucky person starts in at least 5 different places', () => {
          expect(places.size).toBeGreaterThanOrEqual(5);
        });
      });
    },
  );

  Rule('Rescues start fast and slow down from 4 left', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline('<count> people', ({ Given, When, Then, And }, { count, fast, slow }) => {
      let names: string[];
      let show: Watched;
      Given('<count> people', () => {
        names = TEAM.slice(0, Number(count));
      });
      When('the show runs', async () => {
        show = await watch(names, names[0]!);
      });
      Then('<fast> leave in quick group rescues', () => {
        const groups = show.lifts.filter((lift) => lift.beat === 'group-rescues');
        expect(groups.flatMap((lift) => lift.names)).toHaveLength(Number(fast));
      });
      And('<slow> leave one at a time, each rescue taking longer than the one before', () => {
        const singles = show.lifts.filter((lift) => lift.beat !== 'group-rescues');
        expect(singles).toHaveLength(Number(slow));
        for (const lift of singles) expect(lift.names).toHaveLength(1);
        const lengths = singles.map((lift) => show.beats.get(lift.beat)!);
        // Each one-at-a-time rescue has a beat of its own.
        expect(new Set(singles.map((lift) => lift.beat)).size).toBe(singles.length);
        lengths.slice(1).forEach((length, index) => {
          expect(length).toBeGreaterThan(lengths[index]!);
        });
      });
    });

    RuleScenario('Group rescues stay few and small', ({ Given, When, Then, And }) => {
      let show: Watched;
      Given('12 people', () => {});
      When('the show runs', async () => {
        show = await watch(TEAM, 'Marco');
      });
      Then('there are at most 2 group rescues', () => {
        const groups = show.lifts.filter((lift) => lift.beat === 'group-rescues');
        expect(groups.length).toBeGreaterThan(0);
        expect(groups.length).toBeLessThanOrEqual(2);
      });
      And('none lifts more than 4 people', () => {
        for (const lift of show.lifts) expect(lift.names.length).toBeLessThanOrEqual(4);
      });
    });

    RuleScenario('A group rescue flies off slowly enough to follow', ({ Given, When, Then }) => {
      let show: Watched;
      Given('12 people', () => {});
      When('the show runs', async () => {
        show = await watch(TEAM, 'Marco');
      });
      Then(
        'after each group rescue, the helicopter flies off for at least {number} seconds',
        (_, seconds: number) => {
          const groups = show.lifts.filter((lift) => lift.beat === 'group-rescues');
          expect(groups.length).toBeGreaterThan(0);
          const step = show.frames[1]!.time - show.frames[0]!.time;
          for (const lift of groups) {
            // It flies off upwards, and comes down again for whatever comes next.
            const after = show.frames.filter((frame) => frame.time >= lift.time);
            const firstUp = after.findIndex(
              (frame, index) => index > 0 && frame.helicopter.y < after[index - 1]!.helicopter.y,
            );
            let up = 0;
            for (let index = firstUp; index < after.length; index++) {
              if (after[index]!.helicopter.y >= after[index - 1]!.helicopter.y) break;
              up++;
            }
            expect(up * step, `the swoop at ${lift.time}`).toBeGreaterThanOrEqual(seconds - 1e-9);
          }
        },
      );
    });

    RuleScenario('The last two get a duel', ({ Given, When, Then, And }) => {
      let show: Watched | undefined;
      Given(
        'the last two in the water are {string}, the unlucky person, and {string}',
        async (_, unlucky: string, other: string) => {
          // With three people, a few seeds give a duel between these two.
          for (let seed = 1; seed <= 10 && !show; seed++) {
            const run = await watch(['Anna', other, unlucky], unlucky, { seed });
            if (run.inWaterAt('duel').includes(other)) show = run;
          }
          expect(show).toBeDefined();
        },
      );
      When('the rope comes down for them', () => {
        expect(show!.inWaterAt('duel').toSorted()).toEqual(['Giulia', 'Marco']);
      });
      Then('it goes towards {string} first', (_, name: string) => {
        expect(show!.aimsDuring('duel')[0]).toBe(name);
      });
      And('it swings to {string}, who is lifted out', (_, name: string) => {
        expect(show!.aimsDuring('duel').at(-1)).toBe(name);
        const lift = show!.lifts.find((each) => each.beat === 'duel');
        expect(lift?.names).toEqual([name]);
      });
    });

    RuleScenarioOutline(
      'The duel swings back and forth, and hangs over the one it lifts',
      ({ Given, When, Then, And }, variables) => {
        let show: Watched;
        Given('<count> people', () => {});
        When('the show runs', async () => {
          const names = TEAM.slice(-Number(variables.count));
          show = await watch(names, 'Marco');
        });
        Then('the helicopter swings back and forth at least 3 times before it lifts one', () => {
          expect(show.duelMoves.length).toBeGreaterThanOrEqual(3);
          const lift = show.lifts.find((each) => each.beat === 'duel')!;
          expect(show.aimsDuring('duel').at(-1)).toBe(lift.names[0]);
        });
        And('it holds still longest over the one it lifts, before the hook comes down', () => {
          const holds = show.duelHolds;
          const last = holds.at(-1)!;
          for (const hold of holds.slice(0, -1)) {
            expect(last.seconds, `over ${hold.aim}`).toBeGreaterThan(hold.seconds);
          }
        });
      },
    );

    RuleScenarioOutline(
      'Sometimes the helicopter changes its mind, with <count> people',
      ({ Given, When, Then, And }, { count }) => {
        /** For each run, whether the helicopter turned back halfway in the duel. */
        const turned: boolean[] = [];
        Given('<count> people', () => {});
        When('the show runs with 20 different random seeds', async () => {
          const names = TEAM.slice(-Number(count));
          for (let seed = 1; seed <= 20; seed++) {
            // Each show stops once the duel is over.
            const { beats } = planShow(names, 'Marco', createRandom(seed));
            const until = BEATS_BEFORE_RUN.reduce((total, beat) => total + beats[beat], 0);
            const show = await watch(names, 'Marco', { seed, step: 0.05, until });
            turned.push(show.duelMoves.some((move) => move.halfway));
          }
        });
        Then(
          'in some runs, during the duel, it sets off towards one of the two and turns back halfway',
          () => {
            expect(turned).toContain(true);
          },
        );
        And('in some runs it never turns back halfway', () => {
          expect(turned).toContain(false);
        });
      },
    );

    RuleScenario('Fake-outs go both ways', ({ Given, When, Then, And }) => {
      /** For each run, the rope's aims in the rescue at 3 left, and who it lifted. */
      const rescues: { aims: string[]; lifted: string }[] = [];
      Given('12 people', () => {});
      When('the show runs with 20 different random seeds', async () => {
        // Each show stops once the rescue at 3 left is over.
        const { beats } = planShow(TEAM, 'Marco', Math.random);
        const until =
          beats['splash-in'] + beats['group-rescues'] + beats['four-left'] + beats['fake-out'];
        for (let seed = 1; seed <= 20; seed++) {
          // Five frames a second still sees every aim: each lasts 0.4 seconds or more.
          const show = await watch(TEAM, 'Marco', { seed, step: 0.2, until });
          const lift = show.lifts.find((each) => each.beat === 'fake-out')!;
          rescues.push({ aims: show.aimsDuring('fake-out'), lifted: lift.names[0]! });
        }
      });
      Then('in some runs a one-at-a-time rescue swings away and back to the same person', () => {
        const awayAndBack = rescues.filter(
          ({ aims, lifted }) => aims.length >= 3 && aims[0] === lifted && aims.at(-1) === lifted,
        );
        expect(awayAndBack.length).toBeGreaterThan(0);
      });
      And('in some runs it swings to someone else', () => {
        const elsewhere = rescues.filter(
          ({ aims, lifted }) => aims.length >= 2 && aims[0] !== lifted && aims.at(-1) === lifted,
        );
        expect(elsewhere.length).toBeGreaterThan(0);
      });
    });

    RuleScenario('The rope stops over each person it heads for', ({ When, Then }) => {
      const shows: { label: string; show: Watched }[] = [];
      When(
        'the show runs at every head count from 3 to 12, with both kinds of fake-out',
        async () => {
          for (let count = 3; count <= 12; count++) {
            const names = TEAM.slice(0, count);
            const unlucky = names[0]!;
            for (const awayAndBack of [false, true]) {
              // The first seed whose fake-out is of this kind.
              let seed = 1;
              let plan = planShow(names, unlucky, createRandom(seed));
              const isKind = () =>
                plan.rescues.some(
                  (rescue) => rescue.kind === 'fake-out' && !!rescue.via === awayAndBack,
                );
              while (!isKind()) plan = planShow(names, unlucky, createRandom(++seed));
              const { beats } = plan;
              const until =
                beats['splash-in'] +
                beats['group-rescues'] +
                beats['four-left'] +
                beats['fake-out'] +
                beats.duel;
              const label = `${count} people, ${awayAndBack ? 'away and back' : 'to someone else'}`;
              shows.push({ label, show: await watch(names, unlucky, { seed, until }) });
            }
          }
        },
      );
      Then(
        'the helicopter holds still over each person the rope heads for, for at least {number} seconds',
        (_, seconds: number) => {
          for (const { label, show } of shows) {
            expect(show.rests.length, label).toBeGreaterThan(0);
            for (const rest of show.rests) {
              expect(rest.seconds, `${label}: ${rest.aim}`).toBeGreaterThanOrEqual(seconds - 1e-9);
            }
          }
        },
      );
    });
  });

  Rule('The beats keep the show between 11 and 14.5 seconds', ({ RuleScenario }) => {
    RuleScenario('Each beat takes about this long', ({ When, Then }) => {
      const shows = new Map<number, Watched>();
      When('the show runs at 12, 4 and 2 people', async () => {
        for (const count of [12, 4, 2]) {
          const names = TEAM.slice(0, count);
          shows.set(count, await watch(names, names[0]!));
        }
      });
      Then(
        'its beats take these seconds, give or take 0.3:',
        (_, table: Record<string, string>[]) => {
          for (const row of table) {
            for (const count of [12, 4, 2]) {
              const seconds = shows.get(count)!.beats.get(BEATS[row.beat!]!) ?? 0;
              const expected = Number(row[`${count} people`]);
              expect(Math.abs(seconds - expected), `${row.beat} at ${count}`).toBeLessThanOrEqual(
                0.3,
              );
            }
          }
        },
      );
    });

    RuleScenario('Every head count lands in the middle of the time limit', ({ When, Then }) => {
      const records: ShowRecord[] = [];
      When('the show runs at every head count from 2 to 12', async () => {
        for (let count = 2; count <= 12; count++) {
          const names = TEAM.slice(0, count);
          // Ten frames a second times a show to a tenth of a second.
          records.push((await watch(names, names.at(-1)!, { step: 0.1 })).record);
        }
      });
      Then('each run lasts between 11 and 14.5 seconds', () => {
        for (const record of records) {
          expect(record.duration).toBeGreaterThanOrEqual(11);
          expect(record.duration).toBeLessThanOrEqual(14.5);
        }
      });
    });
  });

  Rule('The ending is a victory lap', ({ RuleScenario }) => {
    RuleScenario(
      'The shark goes for the last one, who rides off on it',
      ({ Given, When, Then, And }) => {
        let unlucky: string;
        /** The frames from the moment only the unlucky person is left in the water. */
        let ending: EndFrame[];
        Given('the unlucky person is {string}', (_, name: string) => {
          unlucky = name;
        });
        When('everyone else has been lifted out', async () => {
          const { frames } = await watchEnding(['Anna', 'Ben', 'Giulia', unlucky], unlucky);
          ending = frames.filter((frame) => frame.inWater.length === 1);
          expect(ending[0]?.inWater).toEqual([unlucky]);
        });
        Then('the helicopter leaves', () => {
          expect(ending.map((frame) => frame.helicopter.phase)).toContain('leaving');
          const gone = ending.find((frame) => frame.helicopter.phase === 'gone');
          expect(gone).toBeDefined();
          expect(gone!.helicopter.x < -100 || gone!.helicopter.x > 1380).toBe(true);
        });
        And('the shark heads straight for {string} and dives', () => {
          const run = sharkPhase(ending, 'run');
          expect(run.length).toBeGreaterThan(2);
          run.slice(1).forEach((frame, index) => {
            expect(frame.gap, `at ${frame.time}`).toBeLessThan(run[index]!.gap);
          });
          expect(ending[ending.indexOf(run.at(-1)!) + 1]?.shark.phase).toBe('dive');
        });
        And('the water stays still for half a second', () => {
          const still = sharkPhase(ending, 'still');
          expect(still.length).toBeGreaterThan(0);
          const after = ending[ending.indexOf(still.at(-1)!) + 1]!;
          expect(after.time - still[0]!.time).toBeCloseTo(0.5, 1);
          for (const frame of still) {
            expect(frame.shark.shown).toBe(false);
            expect(frame.lastShown).toBe(false);
          }
        });
        And('{string} comes up riding the shark, celebrating', (_, name: string) => {
          const ride = sharkPhase(ending, 'ride');
          expect(ride.length).toBeGreaterThan(0);
          for (const frame of ride) {
            expect(frame.shark.shown).toBe(true);
            expect(frame.rider?.name).toBe(name);
            expect(frame.rider?.parts).toEqual(expect.arrayContaining(['sunglasses', 'arms']));
          }
        });
      },
    );

    RuleScenario("A long name on the fin stays as big as the duel's", ({ Given, When, Then }) => {
      let unlucky: string;
      let show: Awaited<ReturnType<typeof watchEnding>>;
      Given('the unlucky person is {string}', (_, name: string) => {
        unlucky = name;
      });
      When('the show runs', async () => {
        show = await watchEnding(['Anna', unlucky], unlucky);
      });
      Then(
        "the name on the shark's fin is set at {int} pixels or more, on at most two lines",
        (_, pixels: number) => {
          const shown = show.frames.filter((frame) => frame.finName);
          expect(shown.length).toBeGreaterThan(0);
          for (const { finName } of shown) {
            expect(finName!.text).toBe(unlucky);
            expect(parseFloat(finName!.size)).toBeGreaterThanOrEqual(pixels);
            expect(Number(finName!.lines)).toBeLessThanOrEqual(2);
          }
        },
      );
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      let unlucky: string;
      let show: Awaited<ReturnType<typeof watchEnding>>;
      Given('the unlucky person is {string}', (_, name: string) => {
        unlucky = name;
      });
      When('the show runs', async () => {
        show = await watchEnding(['Anna', 'Ben', 'Giulia', unlucky], unlucky);
      });
      Then(
        "{string} is on the shark's fin, not moving, for the last 1.5 seconds",
        (_, name: string) => {
          const end = show.record.duration;
          const last = show.frames.filter((frame) => frame.time >= end - 1.5);
          expect(last.length).toBeGreaterThan(0);
          for (const frame of last) {
            expect(frame.finName?.text).toBe(name);
            expect(frame.finName?.size).toBe(`${stagePx('--size-stage-fin-name')}px`);
            expect(frame.finName?.at).toBe(last[0]!.finName!.at);
          }
        },
      );
    });
  });

  Rule('It reads without sound', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Captions tell the story', ({ Given, When, Then, And }) => {
      let unlucky: string;
      let show: Watched;
      Given('12 people, and the unlucky person is {string}', (_, name: string) => {
        unlucky = name;
      });
      When('the show runs', async () => {
        show = await watch(TEAM, unlucky);
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const captions = show.record.captions.map(({ text }) => text);
        let from = 0;
        for (const { caption } of table) {
          const at = captions.indexOf(caption, from);
          expect(at, caption).toBeGreaterThanOrEqual(0);
          from = at + 1;
        }
      });
      And('every fake-out is captioned {string}', (_, pattern: string) => {
        expect(pattern).toBe("It's going for <name>… nope, <other name>!");
        const captions = show.record.captions.map(({ text }) => text);
        const [first, second] = show.aimsDuring('fake-out');
        expect(captions).toContain(`It's going for ${first}… nope, ${second}!`);
        for (const caption of captions.filter((text) => text.startsWith("It's going"))) {
          const [, first, second] = /^It's going for (.+)… nope, (.+)!$/.exec(caption) ?? [];
          expect(TEAM, caption).toContain(first);
          expect(TEAM, caption).toContain(second);
          expect(first, caption).not.toBe(second);
        }
      });
    });

    RuleScenarioOutline(
      "The duel's caption, with <count> people",
      ({ Given, When, Then }, { count, captions: expected }) => {
        let show: Watched | undefined;
        Given(
          '<count> people, the last two in the water {string}, the unlucky person, and {string}',
          async (_, unlucky: string, other: string) => {
            const names = Number(count) === 2 ? [other, unlucky] : ['Anna', other, unlucky];
            // With three people, a few seeds give a duel between these two.
            for (let seed = 1; seed <= 10 && !show; seed++) {
              const run = await watch(names, unlucky, { seed });
              if (run.inWaterAt('duel').includes(other)) show = run;
            }
            expect(show).toBeDefined();
          },
        );
        When('the rope comes down for them', () => {
          expect(show!.inWaterAt('duel').toSorted()).toEqual(['Giulia', 'Marco']);
        });
        Then('the duel is captioned <captions>', () => {
          const duel = show!.frames.find((frame) => frame.beat === 'duel')!.time;
          const run = show!.frames.find((frame) => frame.beat === 'sharks-run')!.time;
          const captions = show!.record.captions
            .filter(({ from }) => from >= duel - 1e-9 && from < run)
            .map(({ text }) => `"${text}"`);
          expect(captions.join(', ')).toBe(expected);
        });
      },
    );

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      const records: ShowRecord[] = [];
      When('the show runs', async () => {
        for (const count of [12, 3, 2]) {
          for (const seed of [1, 2]) {
            records.push((await watch(TEAM.slice(-count), 'Marco', { seed })).record);
          }
        }
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const record of records) {
          expect(record.captions.length).toBeGreaterThan(0);
          for (const { text, from, to } of record.captions) {
            expect(to - from, text).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });

    RuleScenario('Names grow as people leave', ({ When, Then, And }) => {
      /** The tag sizes of everyone in the water, frame by frame. */
      const sizes: number[][] = [];
      When('the show runs at 12 people', async () => {
        await runShow(sharkBait, {
          names: TEAM,
          unlucky: 'Marco',
          onFrame(_, stage) {
            const tags = stage.querySelectorAll<HTMLElement>(
              '[data-in-water="true"] [style*="--tag-size"]',
            );
            if (tags.length === 0) return;
            sizes.push(
              [...tags].map((tag) => parseFloat(tag.style.getPropertyValue('--tag-size'))),
            );
          },
        });
      });
      Then('every name tag is set at 22 pixels or more on the 1280 by 720 stage', () => {
        expect(Math.min(...sizes.flat())).toBeGreaterThanOrEqual(22);
      });
      And('the last two name tags are set at 48 pixels or more', () => {
        const lastTwo = sizes.filter((frame) => frame.length === 2);
        expect(lastTwo.length).toBeGreaterThan(0);
        expect(Math.min(...lastTwo.flat())).toBeGreaterThanOrEqual(48);
      });
    });
  });
});

describe('Shark Bait, beyond its feature', () => {
  /** Long names on the back row at 12, as their tags are drawn in a browser. */
  const WIDE = [70, 230, 50, 180, 190, 215].map((width) => ({ width, height: 58 }));
  /** Where a tag is drawn on the stage, for `place`. */
  const box = (place: Place, { width, height }: { width: number; height: number }) => {
    const bottom = place.y + tagBottom(place.size) - (place.lift ?? 0);
    return { left: place.x - width / 2, right: place.x + width / 2, top: bottom - height, bottom };
  };
  /** Checks that no two tags in `fitted` touch, no two heads touch, and every tag is on stage. */
  const expectClear = (fitted: Place[], tags: { width: number; height: number }[]) => {
    const boxes = fitted.map((place, index) => box(place, tags[index]!));
    boxes.forEach((a, index) => {
      expect(a.left).toBeGreaterThanOrEqual(10);
      expect(a.right).toBeLessThanOrEqual(1270);
      expect(a.top).toBeGreaterThan(120);
      boxes.slice(index + 1).forEach((b, other) => {
        const apart =
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `tags ${index} and ${index + other + 1}`).toBe(true);
        const [p, q] = [fitted[index]!, fitted[index + other + 1]!];
        if (p.y === q.y) {
          expect(Math.abs(p.x - q.x), `heads ${index} and ${index + other + 1}`).toBeGreaterThan(
            (p.size + q.size) / 2,
          );
        }
      });
    });
  };

  it('spaces a row by its name tags, so no tag covers another', () => {
    const row = places(12).slice(0, 6);
    const fitted = fitTags(row, WIDE);
    expectClear(fitted, WIDE);
    expect(fitted.every((place) => !place.lift)).toBe(true);
    expect(fitted.map(({ y, size }) => ({ y, size }))).toEqual(
      row.map(({ y, size }) => ({ y, size })),
    );
  });

  it("lifts every other tag a tier when a row's tags can't sit side by side", () => {
    const widest = { width: 475, height: 58 };
    const long = { width: 230, height: 58 };
    for (const at of [0, 2, 5]) {
      for (const row of [places(12).slice(0, 6), places(12).slice(6), places(6)]) {
        const tags = row.map((_, index) => (index === at ? widest : long));
        expectClear(fitTags(row, tags), tags);
      }
    }
  });

  it('leaves rows as the storyboard draws them when their tags already fit', () => {
    const all = places(12);
    const short = all.map(() => ({ width: 60, height: 30 }));
    const fitted = fitTags(all, [...WIDE, ...short.slice(6)]);
    expect(fitted.slice(6)).toEqual(all.slice(6));
    expect(fitTags(all, short)).toEqual(all);
  });

  it('plays a splash, the rotor while the helicopter is up, whooshes, a heartbeat and a fanfare', async () => {
    const cues: string[] = [];
    let rotorStopped = false;
    const listened: Scenario = {
      ...sharkBait,
      play: (show) =>
        sharkBait.play({
          ...show,
          sound: {
            play(cue) {
              cues.push(cue);
              return () => void (cue === 'rotor' && (rotorStopped = true));
            },
            stopAll() {},
          },
        }),
    };
    await runShow(listened, { names: TEAM, unlucky: 'Marco' });
    expect(new Set(cues)).toEqual(new Set(['splash', 'rotor', 'whoosh', 'heartbeat', 'fanfare']));
    expect(rotorStopped).toBe(true);
  });

  it('draws speed lines only without reduced motion', async () => {
    for (const reducedMotion of [false, true]) {
      let seen = false;
      await runShow(sharkBait, {
        names: ['Anna', 'Marco'],
        unlucky: 'Marco',
        reducedMotion,
        onFrame(_, stage) {
          const lines = stage.querySelectorAll('[data-part="speed-lines"]');
          seen ||= [...lines].some((line) => shown(line, stage));
        },
      });
      expect(seen, `reduced motion: ${reducedMotion}`).toBe(!reducedMotion);
    }
  });
});
