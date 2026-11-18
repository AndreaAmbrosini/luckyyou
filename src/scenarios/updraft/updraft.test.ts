import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  speechBox,
  STAGE,
  stagePx,
  type Box,
  type ChosenLook,
  type Cue,
  type Note,
  type Scenario,
} from '../../scenario-kit';
import { follow } from '../../scenario-kit/music';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import updraft from './index';
import { buildPlan } from './plan';

const SHORT_NAMES = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Fabio', 'Giulia', 'Hana'];

const LONG_NAMES = [
  'Maximilian-Alexander',
  'Bartholomew-James',
  'Francesca-Romana',
  'Jean-Christophe',
  'Anastasia-Maria',
  'Konstantinos-Paul',
  'al-Khwarizmi-Sato',
  'hubert-blaine-sr',
];

interface PersonSnap {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly state: string;
  readonly check: string;
  readonly mood: string;
  readonly sweat: boolean;
  readonly canopy: string;
  readonly colour: string;
  readonly extra: string;
}

interface TagSnap {
  readonly name: string;
  readonly size: number;
  readonly box: Box;
}

interface Frame {
  readonly time: number;
  readonly spotlight: boolean;
  readonly ending: string;
  readonly check: string;
  readonly theme: string;
  readonly matTop: number | null;
  readonly cloudTops: readonly number[];
  readonly people: ReadonlyMap<string, PersonSnap>;
  readonly tags: readonly TagSnap[];
  readonly bubbles: readonly { readonly by: string; readonly text: string; readonly box: Box }[];
}

interface Watched {
  readonly frames: readonly Frame[];
  readonly record: ShowRecord;
  readonly cues: readonly { readonly time: number; readonly cue: Cue }[];
  readonly played: readonly { readonly time: number; readonly note: Note }[];
  readonly moves: readonly {
    readonly time: number;
    readonly beat: number;
    readonly speed: number;
  }[];
}

const STEP = 0.05;
const cache = new Map<string, Promise<Watched>>();

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function visible(el: HTMLElement | null): el is HTMLElement {
  if (!el || el.hidden || el.style.display === 'none' || el.style.visibility === 'hidden') {
    return false;
  }
  const opacity = el.style.opacity === '' ? 1 : Number.parseFloat(el.style.opacity);
  return opacity > 0.05;
}

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

function estimateTagBox(name: string, wrapper: HTMLElement): TagSnap | null {
  if (!visible(wrapper)) return null;
  const tagNode = wrapper.style.getPropertyValue('--tag-size')
    ? wrapper
    : wrapper.querySelector<HTMLElement>('[style*="--tag-size"]');
  if (!tagNode || !visible(tagNode)) return null;
  const size = px(tagNode.style.getPropertyValue('--tag-size'));
  if (!Number.isFinite(size)) return null;
  const cx = px(wrapper.style.left);
  const top = px(wrapper.style.top);
  if (!Number.isFinite(cx) || !Number.isFinite(top)) return null;
  const setWidth = px(tagNode.style.maxWidth) || 320;
  const lines = tagNode.dataset.lines === '2' ? 2 : 1;
  const lineBorder = 2 * stagePx('--line');
  const chars = [...graphemes.segment(name)].length;
  const singleWidth = Math.ceil(chars * 0.6 * size + 0.6 * size + lineBorder + 2);
  const width = lines === 1 ? Math.min(setWidth, singleWidth) : setWidth;
  const height = (1.1 * lines + 0.15) * size + lineBorder;
  return {
    name,
    size,
    box: { left: cx - width / 2, right: cx + width / 2, top, bottom: top + height },
  };
}

function overlaps(a: Box, b: Box, inset = 1): boolean {
  return (
    a.left + inset < b.right - inset &&
    a.right - inset > b.left + inset &&
    a.top + inset < b.bottom - inset &&
    a.bottom - inset > b.top + inset
  );
}

function faceBox(p: PersonSnap): Box {
  const r = p.size * 0.42;
  return { left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r };
}

interface WatchOpts {
  readonly seed?: number;
  readonly reducedMotion?: boolean;
  readonly theme?: string;
  readonly looks?: ReadonlyMap<string, ChosenLook>;
}

function watch(team: readonly string[], unlucky: string, opts: WatchOpts = {}): Promise<Watched> {
  const { seed = 1, reducedMotion = false, theme, looks } = opts;
  const looksKey = looks
    ? [...looks.entries()].map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(',')
    : '';
  const key = `${team.join('|')}::${unlucky}::${seed}::${reducedMotion}::${theme ?? ''}::${looksKey}`;
  let existing = cache.get(key);
  if (!existing) {
    existing = recordRun(team, unlucky, { seed, reducedMotion, theme, looks });
    cache.set(key, existing);
  }
  return existing;
}

async function recordRun(
  team: readonly string[],
  unlucky: string,
  opts: Required<Pick<WatchOpts, 'seed' | 'reducedMotion'>> & Pick<WatchOpts, 'theme' | 'looks'>,
): Promise<Watched> {
  const frames: Frame[] = [];
  const rawCues: { time: number | null; cue: Cue }[] = [];
  const rawMoves: { time: number | null; beat: number; speed: number }[] = [];
  const rawPlayed: { frameTime: number | null; delay: number; note: Note }[] = [];

  const spied: Scenario = {
    ...updraft,
    play: (show) =>
      updraft.play({
        ...show,
        sound: {
          ...show.sound,
          play(cue) {
            rawCues.push({ time: null, cue });
            return show.sound.play(cue);
          },
          music(song) {
            const music = show.sound.music(song);
            const follower = follow(song);
            return {
              to(beat, speed) {
                rawMoves.push({ time: null, beat, speed });
                for (const due of follower.to(beat, speed)) {
                  rawPlayed.push({ frameTime: null, delay: due.delay, note: due.note });
                }
                music.to(beat, speed);
              },
            };
          },
        },
      }),
  };

  const record = await runShow(spied, {
    names: team,
    unlucky,
    seed: opts.seed,
    step: STEP,
    reducedMotion: opts.reducedMotion,
    theme: opts.theme,
    looks: opts.looks,
    onFrame(time, stage) {
      for (const c of rawCues) c.time ??= time;
      for (const m of rawMoves) m.time ??= time;
      for (const p of rawPlayed) p.frameTime ??= time;

      const people = new Map<string, PersonSnap>();
      for (const el of stage.querySelectorAll<HTMLElement>('[data-person]')) {
        const name = el.dataset.person!;
        people.set(name, {
          x: px(el.style.left),
          y: px(el.style.top),
          size: px(el.style.width) || px(el.dataset.size ?? ''),
          state: el.dataset.state ?? '',
          check: el.dataset.check ?? 'none',
          mood: el.dataset.mood ?? '',
          sweat: el.dataset.sweat === 'true',
          canopy: el.dataset.canopy ?? '',
          colour: el.dataset.colour ?? '',
          extra: el.dataset.extra ?? '',
        });
      }

      const tags: TagSnap[] = [];
      for (const el of stage.querySelectorAll<HTMLElement>('[data-tag-of]')) {
        const owner = stage.querySelector<HTMLElement>(
          `[data-person="${CSS.escape(el.dataset.tagOf!)}"]`,
        );
        if (owner && !visible(owner)) continue;
        const snap = estimateTagBox(el.dataset.tagOf!, el);
        if (snap) tags.push(snap);
      }

      const bubbles: { by: string; text: string; box: Box }[] = [];
      for (const el of stage.querySelectorAll<HTMLElement>('[data-part="bubble"], .ly-bubble')) {
        if (!visible(el)) continue;
        const x = px(el.style.left);
        const y = px(el.style.top);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const lean = px(el.style.getPropertyValue('--lean')) || 0;
        const text = el.textContent ?? '';
        bubbles.push({ by: el.dataset.by ?? '', text, box: speechBox(text, { x, y }, lean) });
      }

      const matEl = stage.querySelector<HTMLElement>('[data-part="mat"]');
      const matTop = matEl && visible(matEl) ? px(matEl.style.top) : null;
      const cloudTops = [...stage.querySelectorAll<HTMLElement>('[data-part="cloud"]')].map((c) =>
        px(c.style.top),
      );

      frames.push({
        time,
        spotlight: stage.dataset.spotlight === 'on',
        ending: stage.dataset.ending ?? '',
        check: stage.dataset.check ?? 'none',
        theme: stage.dataset.theme ?? '',
        matTop: matTop !== null && Number.isFinite(matTop) ? matTop : null,
        cloudTops,
        people,
        tags,
        bubbles,
      });
    },
  });

  // The frame the show ends on is read after the kit has cleared the stage.
  while (frames.length > 0 && frames.at(-1)!.people.size === 0) frames.pop();

  return {
    frames,
    record,
    cues: rawCues.map((c) => ({ time: c.time ?? record.duration, cue: c.cue })),
    moves: rawMoves.map((m) => ({
      time: m.time ?? record.duration,
      beat: m.beat,
      speed: m.speed,
    })),
    played: rawPlayed.map((p) => ({
      time: (p.frameTime ?? record.duration) + p.delay,
      note: p.note,
    })),
  };
}

function atRiskEntries(frame: Frame): [string, PersonSnap][] {
  return [...frame.people.entries()].filter(([, p]) => p.state === 'at-risk');
}

/** Check starts and outcomes shown on stage before the spotlight. */
function earlyChecks(run: Watched) {
  const spotAt = run.frames.find((f) => f.spotlight)?.time ?? Infinity;
  const checks: { at: number; kind: string }[] = [];
  let wasChecking = false;
  for (const frame of run.frames) {
    const active = frame.check !== 'none';
    if (active && !wasChecking && frame.time < spotAt) {
      checks.push({ at: frame.time, kind: frame.check });
    }
    wasChecking = active;
  }
  return { spotAt, checks, wins: checks.filter((check) => check.kind === 'win') };
}

/** Where a jumper's body hangs, from its canopy lines to its boots. */
function bodyBox(p: PersonSnap): Box {
  return {
    left: p.x - 0.4 * p.size,
    right: p.x + 0.4 * p.size,
    top: p.y - 0.5 * p.size,
    bottom: p.y + 1.03 * p.size,
  };
}

function gapBetween(a: Box, b: Box): number {
  const across = Math.max(0, a.left - b.right, b.left - a.right);
  const down = Math.max(0, a.top - b.bottom, b.top - a.bottom);
  return Math.hypot(across, down);
}

const MAT_LEFT = 340;
const MAT_RIGHT = 940;
const MAT_HEIGHT = 36;

describeSpec(await loadFeature('./updraft.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Updraft!', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(updraft.name).toBe(name);
        expect(updraft.developmentOnly).toBeFalsy();
      });
      And('its description is {string}', (_, description: string) => {
        expect(updraft.description).toBe(description);
      });
      And('it takes {int} to {int} people', (_, min: number, max: number) => {
        expect(updraft.people).toEqual({ min, max });
      });
      And('it has a line-up', () => {
        expect(updraft.lineUp).toBeDefined();
      });
    });
  });

  Rule("A line-up packs everyone's chute for the drop zone", ({ RuleScenario }) => {
    RuleScenario('Jumpers, drop zones, colours and extras', ({ When, Then, And }) => {
      When('the Line-up opens for Updraft!', () => {
        expect(updraft.lineUp).toBeDefined();
      });

      Then(
        'its heading is {string} and its start button is {string}',
        (_, heading: string, start: string) => {
          expect(updraft.lineUp!.heading).toBe(heading);
          expect(updraft.lineUp!.start).toBe(start);
        },
      );

      And(
        "its themes are called {string}, and the first option's choices {string}",
        (_, themeWord: string, choicesWord: string) => {
          expect(updraft.lineUp!.words).toEqual({ theme: themeWord, choices: choicesWord });
        },
      );

      And(
        'its themes are {string}, {string}, {string} and {string}, each with sky and floor colours and suiting jumpers',
        (_, t1: string, t2: string, t3: string, t4: string) => {
          const themes = updraft.lineUp!.themes ?? [];
          expect(themes.map((t) => t.label)).toEqual([t1, t2, t3, t4]);
          const jumperNames = new Set(updraft.lineUp!.options[0]!.choices.map((c) => c.name));
          for (const theme of themes) {
            expect(theme.ground.sky.length).toBeGreaterThan(0);
            expect(theme.ground.floor.length).toBeGreaterThan(0);
            expect(theme.picture()).toBeInstanceOf(Element);
            expect((theme.suits ?? []).length).toBeGreaterThanOrEqual(2);
            for (const suited of theme.suits ?? []) {
              expect(jumperNames.has(suited)).toBe(true);
            }
          }
        },
      );

      And(
        'its options are {string}, {string} and {string}',
        (_, first: string, second: string, third: string) => {
          expect(updraft.lineUp!.options.map((o) => o.label)).toEqual([first, second, third]);
        },
      );

      And(
        '{string} is drawn in groups {string}, {string} and {string}, and every {string} has a picture',
        (_, drawnLabel: string, g1: string, g2: string, g3: string, extraLabel: string) => {
          const jumper = updraft.lineUp!.options.find((o) => o.label === drawnLabel)!;
          expect(jumper.drawn).toBe(true);
          expect(jumper.choices.length).toBeGreaterThanOrEqual(9);
          const groups = [...new Set(jumper.choices.map((c) => c.group))];
          expect(groups).toEqual([g1, g2, g3]);

          const colours = updraft.lineUp!.options.find((o) => o.label === 'Colour')!;
          expect(colours.choices.every((c) => Boolean(c.swatch))).toBe(true);

          const extra = updraft.lineUp!.options.find((o) => o.label === extraLabel)!;
          expect(extra.choices.every((c) => typeof c.picture === 'function')).toBe(true);
          for (const c of extra.choices) {
            expect(c.picture!()).toBeInstanceOf(Element);
          }

          const preview = updraft.lineUp!.draw(
            {
              [jumper.name]: jumper.choices[0]!.name,
              [colours.name]: colours.choices[0]!.name,
              [extra.name]: extra.choices[0]!.name,
            },
            { name: 'Anna', place: 1, theme: updraft.lineUp!.themes![0]!.name },
          );
          expect(preview).toBeInstanceOf(Element);
        },
      );
    });

    RuleScenario('Chosen chutes and drop zone appear on stage', ({ Given, When, Then, And }) => {
      let chosenTheme = 'crater';
      let looks = new Map<string, ChosenLook>();
      let run: Watched;

      Given(
        'Anna chose {string} in {string} with {string} and Ben chose {string} in {string} with {string} on {string}',
        (
          _,
          annaCanopy: string,
          annaColour: string,
          annaExtra: string,
          benCanopy: string,
          benColour: string,
          benExtra: string,
          theme: string,
        ) => {
          chosenTheme = theme;
          const opts = updraft.lineUp?.options;
          const canopyKey = opts?.[0]?.name ?? 'canopy';
          const colourKey = opts?.[1]?.name ?? 'colour';
          const extraKey = opts?.[2]?.name ?? 'extra';
          looks = new Map<string, ChosenLook>([
            ['Anna', { [canopyKey]: annaCanopy, [colourKey]: annaColour, [extraKey]: annaExtra }],
            ['Ben', { [canopyKey]: benCanopy, [colourKey]: benColour, [extraKey]: benExtra }],
          ]);
        },
      );

      When('the show runs', async () => {
        run = await watch(['Anna', 'Ben'], 'Ben', { seed: 1, theme: chosenTheme, looks });
      });

      Then('the stage uses the {string} drop zone', (_, theme: string) => {
        expect(run.frames.some((f) => f.theme === theme)).toBe(true);
      });

      And(
        'Anna falls under the {string} canopy in {string} wearing {string}',
        (_, canopy: string, colour: string, extra: string) => {
          const snap = run.frames.find((f) => f.time >= 1.5)?.people.get('Anna');
          expect(snap).toBeDefined();
          expect(snap!.canopy).toBe(canopy);
          expect(snap!.colour).toBe(colour);
          expect(snap!.extra).toBe(extra);
        },
      );

      And(
        'Ben falls under the {string} canopy in {string} wearing {string}',
        (_, canopy: string, colour: string, extra: string) => {
          const snap = run.frames.find((f) => f.time >= 1.5)?.people.get('Ben');
          expect(snap).toBeDefined();
          expect(snap!.canopy).toBe(canopy);
          expect(snap!.colour).toBe(colour);
          expect(snap!.extra).toBe(extra);
        },
      );
    });
  });

  Rule(
    'Updrafts blow lucky jumpers clear until one lands on the mat',
    ({ RuleScenarioOutline }) => {
      RuleScenarioOutline(
        '<count> people, the unlucky person <position> in the list',
        ({ Given, When, Then, And }, variables) => {
          let count: number;
          let team: string[];
          let unlucky: string;
          let run: Watched;

          Given('<count> people, with the unlucky person <position> in the list', () => {
            count = Number(variables.count);
            team = SHORT_NAMES.slice(0, count);
            unlucky = variables.position === 'first' ? team[0]! : team.at(-1)!;
          });

          When('the show runs', async () => {
            run = await watch(team, unlucky, { seed: 2 });
            expect(run.record.outcome).toBe('finished');
          });

          Then(
            'every person except the unlucky one catches a whoosh updraft, turns happy and goes safe into the clouds',
            () => {
              const whooshes = run.cues.filter((c) => c.cue === 'whoosh');
              expect(whooshes.length).toBeGreaterThanOrEqual(1);
              const end = run.frames.at(-1)!;
              for (const person of team) {
                if (person === unlucky) continue;
                const blownClear = run.frames.some((f) => {
                  const p = f.people.get(person);
                  return p?.state === 'safe' && p.mood === 'happy' && p.y <= 150;
                });
                expect(blownClear, `${person} blown safely into upper clouds`).toBe(true);
                expect(end.people.get(person)?.state).toBe('safe');
              }
            },
          );

          And('the unlucky person touches the landing mat with a thunk', () => {
            expect(run.cues.some((c) => c.cue === 'thunk')).toBe(true);
            const end = run.frames.at(-1)!;
            expect(end.matTop).not.toBeNull();
            expect(end.people.get(unlucky)?.state).toBe('unlucky');
          });
        },
      );
    },
  );

  Rule('Falling lowest is scary, and the lead changes hands in the sky', ({ RuleScenario }) => {
    RuleScenario(
      'Whoever is lowest panics, and thermals swap the lowest jumper',
      ({ Given, When, Then, And }) => {
        let count = 6;
        let runs: Watched[] = [];

        Given('{int} people', (_, n: number) => {
          count = n;
        });

        When('the show runs with {int} different random seeds', async (_, seeds: number) => {
          const team = SHORT_NAMES.slice(0, count);
          runs = [];
          for (let i = 0; i < seeds; i++) {
            runs.push(await watch(team, team[i % count]!, { seed: i + 1 }));
          }
        });

        Then(
          'before the spotlight, whoever is lowest among at-risk jumpers looks scared and sweats',
          () => {
            for (const run of runs) {
              const spotAt = run.frames.find((f) => f.spotlight)?.time ?? Infinity;
              const midFall = run.frames.filter(
                (f) => f.time >= 2.2 && f.time < spotAt - 0.5 && atRiskEntries(f).length >= 4,
              );
              expect(midFall.length).toBeGreaterThan(5);
              const lowestScaredFrames = midFall.filter((f) => {
                const lowest = atRiskEntries(f).reduce((a, b) => (b[1].y > a[1].y ? b : a))[1];
                return lowest.mood === 'scared' && lowest.sweat;
              });
              expect(lowestScaredFrames.length).toBeGreaterThan(midFall.length * 0.5);
            }
          },
        );

        And('at least 2 different jumpers fall lowest before the spotlight', () => {
          for (const run of runs) {
            const spotAt = run.frames.find((f) => f.spotlight)?.time ?? Infinity;
            const lowestSet = new Set<string>();
            for (const f of run.frames) {
              if (f.time < 2.0 || f.time >= spotAt - 0.3) continue;
              const risk = atRiskEntries(f);
              if (risk.length < 4) continue;
              const [lowestName] = risk.reduce((a, b) => (b[1].y > a[1].y ? b : a));
              lowestSet.add(lowestName);
            }
            expect(lowestSet.size).toBeGreaterThanOrEqual(2);
          }
        });
      },
    );
  });

  Rule(
    'Wind checks are quick and frequent, but usually miss',
    ({ RuleScenarioOutline, RuleScenario }) => {
      RuleScenarioOutline(
        '<count> people get frequent checks and occasional updrafts',
        ({ Given, When, Then, And }, variables) => {
          let run: Watched;

          Given('<count> people', () => undefined);

          When('the show runs', async () => {
            const team = SHORT_NAMES.slice(0, Number(variables.count));
            run = await watch(team, team[1]!, { seed: 4 });
          });

          Then(
            'wind checks start at 2.2 seconds and accelerate after rescues, with <checks> checks before the spotlight',
            () => {
              const { checks } = earlyChecks(run);
              expect(checks).toHaveLength(Number(variables.checks));
              expect(checks[0]!.at).toBeCloseTo(2.2, 2);
              const gaps = checks.slice(1).map((check, i) => check.at - checks[i]!.at);
              expect(gaps.at(-1)!).toBeLessThan(gaps[0]! - 0.1);
              for (let i = 1; i < gaps.length; i++) {
                expect(gaps[i]!).toBeLessThanOrEqual(gaps[i - 1]! + STEP);
                expect(gaps[i]!).toBeGreaterThanOrEqual(0.6 - STEP);
                if (checks[i]!.kind === 'win') {
                  expect(gaps[i]!).toBeLessThan(gaps[i - 1]! - 0.05);
                }
              }
            },
          );

          And('most checks miss without a caption, bubble or whoosh', () => {
            const { checks } = earlyChecks(run);
            const misses = checks.filter((check) => check.kind === 'miss');
            const wins = checks.filter((check) => check.kind === 'win');
            expect(wins.length / checks.length).toBeLessThanOrEqual(0.4);
            expect(misses.length).toBeGreaterThan(wins.length);
            for (const { at } of misses) {
              expect(
                run.cues.some((cue) => cue.cue === 'whoosh' && Math.abs(cue.time - at) < 0.06),
              ).toBe(false);
              expect(
                run.record.captions.some(
                  (caption) => caption.from >= at && caption.from < at + 0.9,
                ),
              ).toBe(false);
              const target = [
                ...run.frames.find((frame) => Math.abs(frame.time - at) < 0.01)!.people,
              ].find(([, person]) => person.check === 'miss')?.[0];
              expect(target).toBeDefined();
              expect(
                run.frames.some(
                  (frame) =>
                    frame.time >= at &&
                    frame.time < at + 0.9 &&
                    frame.bubbles.some((bubble) => bubble.by === target),
                ),
              ).toBe(false);
            }
          });

          And('a missed check briefly lifts one jumper without saving them', () => {
            for (const { at } of earlyChecks(run).checks.filter((check) => check.kind === 'miss')) {
              const start = run.frames.find((frame) => Math.abs(frame.time - at) < 0.01)!;
              const high = run.frames.find((frame) => Math.abs(frame.time - (at + 0.3)) < 0.01)!;
              const returnFrame = run.frames.find(
                (frame) => Math.abs(frame.time - (at + 0.85)) < 0.01,
              )!;
              const target = [...start.people].find(([, person]) => person.check === 'miss')!;
              const [name, jumper] = target;
              expect(jumper.check).toBe('miss');
              expect(jumper.state).toBe('at-risk');
              expect(jumper.y - high.people.get(name)!.y).toBeGreaterThan(20);
              expect(Math.abs(jumper.y - returnFrame.people.get(name)!.y)).toBeLessThan(6);
              expect(returnFrame.people.get(name)!.state).toBe('at-risk');
            }
          });

          And(
            'the <wins> successful checks lift a group together with one whoosh each, at least 2 seconds apart',
            () => {
              const count = Number(variables.wins);
              const gap = 2;
              const { checks, wins, spotAt } = earlyChecks(run);
              expect(wins).toHaveLength(count);
              const whooshes = run.cues.filter(
                ({ cue, time }) => cue === 'whoosh' && time < spotAt,
              );
              expect(whooshes).toHaveLength(wins.length);
              for (let i = 0; i < wins.length; i++) {
                const win = wins[i]!;
                expect(Math.abs(whooshes[i]!.time - win.at)).toBeLessThan(0.06);
                if (i > 0) expect(win.at - wins[i - 1]!.at).toBeGreaterThanOrEqual(gap);
                const frame = run.frames.find((f) => Math.abs(f.time - win.at) < 0.01)!;
                const previous = run.frames.find((f) => Math.abs(f.time - (win.at - STEP)) < 0.01)!;
                const lifted = [...frame.people].filter(
                  ([name, person]) =>
                    person.state === 'safe' && previous.people.get(name)?.state !== 'safe',
                );
                expect(lifted.length).toBeGreaterThanOrEqual(1);
                expect(lifted.length).toBeLessThanOrEqual(3);
                expect(lifted.every(([, person]) => person.check === 'win')).toBe(true);
              }
              expect(checks.filter((check) => check.kind === 'miss').length).toBeGreaterThan(count);
            },
          );

          And('the spotlight waits at least 2.5 seconds after the last successful check', () => {
            const gap = 2.5;
            const { spotAt, wins } = earlyChecks(run);
            expect(wins[0]!.at).toBeGreaterThanOrEqual(4);
            expect(spotAt - wins.at(-1)!.at).toBeGreaterThanOrEqual(gap);
          });
        },
      );

      RuleScenario(
        'The spotlight, the side gust and the ending each get their own moment',
        ({ Given, When, Then, And }) => {
          let run: Watched;

          Given('{int} people', () => undefined);

          When('the show runs', async () => {
            run = await watch(SHORT_NAMES, SHORT_NAMES[3]!, { seed: 5 });
          });

          Then(
            'before touchdown no two gusts, caption changes or thunks are less than 1.5 seconds apart',
            () => {
              const gap = 1.5;
              const thunk = run.cues.find((c) => c.cue === 'thunk')!.time;
              const moments: number[] = [];
              for (const { cue, time } of run.cues) {
                if (cue === 'whoosh' && time <= thunk) moments.push(time);
              }
              for (const { from } of run.record.captions.slice(1)) {
                if (from <= thunk) moments.push(from);
              }
              moments.push(thunk);
              moments.sort((a, b) => a - b);
              expect(moments.length).toBeGreaterThanOrEqual(7);
              for (let i = 1; i < moments.length; i++) {
                expect(moments[i]! - moments[i - 1]!, `moment ${i}`).toBeGreaterThanOrEqual(gap);
              }
            },
          );

          And('the spotlight comes on at least 2.5 seconds after the last early updraft', () => {
            const gap = 2.5;
            const { spotAt, wins } = earlyChecks(run);
            expect(spotAt - wins.at(-1)!.at).toBeGreaterThanOrEqual(gap);
          });

          And('the side gust comes at least 2.5 seconds after the spotlight', () => {
            const gap = 2.5;
            const { spotAt } = earlyChecks(run);
            const gust = run.cues.find((c) => c.cue === 'whoosh' && c.time > spotAt)!.time;
            expect(gust - spotAt).toBeGreaterThanOrEqual(gap);
          });

          And(
            'the fanfare comes between {int} and {int} seconds',
            (_, low: number, high: number) => {
              const fanfare = run.cues.find((c) => c.cue === 'fanfare')!.time;
              expect(fanfare).toBeGreaterThanOrEqual(low);
              expect(fanfare).toBeLessThanOrEqual(high);
            },
          );
        },
      );
    },
  );

  Rule('The ground rises for the final stretch', ({ RuleScenario }) => {
    RuleScenario('Spotlight and rising mat', ({ Given, When, Then, And }) => {
      let run: Watched;
      let spotIndex = -1;

      Given('{int} people', () => undefined);

      When('{int} jumpers are left at risk', async (_, remaining: number) => {
        const team = SHORT_NAMES.slice(0, 6);
        run = await watch(team, team[4]!, { seed: 3 });
        spotIndex = run.frames.findIndex(
          (f) => f.spotlight && atRiskEntries(f).length === remaining,
        );
        expect(spotIndex).toBeGreaterThan(0);
      });

      Then('the spotlight turns on and the landing mat rises onto the stage', () => {
        const matFrames = run.frames
          .slice(spotIndex)
          .filter((f) => f.matTop !== null && f.matTop < STAGE.height);
        expect(matFrames.length).toBeGreaterThan(5);
        expect(matFrames.at(-1)!.matTop!).toBeLessThan(matFrames[0]!.matTop! + 1);
      });

      And('the remaining jumpers widen and grow larger', () => {
        const early = run.frames.find((f) => f.time >= 1.8)!;
        const spotFrame = run.frames
          .slice(spotIndex)
          .find((f) => f.time >= run.frames[spotIndex]!.time + 0.6)!;
        const finalists = atRiskEntries(spotFrame);
        expect(finalists).toHaveLength(3);
        const earlyXs = finalists.map(([n]) => early.people.get(n)!.x).sort((a, b) => a - b);
        const spotXs = finalists.map(([, p]) => p.x).sort((a, b) => a - b);
        expect(spotXs[2]! - spotXs[0]!).toBeGreaterThanOrEqual(earlyXs[2]! - earlyXs[0]!);
        for (const [name, during] of finalists) {
          expect(during.size).toBeGreaterThan(early.people.get(name)!.size * 1.1);
        }
      });

      And('the heartbeat starts and speeds up until touchdown', () => {
        const spotTime = run.frames[spotIndex]!.time;
        const fanfareTime = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
        const beats = run.cues
          .filter((c) => c.cue === 'heartbeat' && c.time >= spotTime - 0.1 && c.time < fanfareTime)
          .map((c) => c.time);
        expect(beats.length).toBeGreaterThanOrEqual(4);
        expect(beats.at(-1)! - beats.at(-2)!).toBeLessThan(beats[1]! - beats[0]!);
      });

      And('the music plays on without its bass until touchdown', () => {
        const spotTime = run.frames[spotIndex]!.time;
        const fanfareTime = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
        const earlyBass = run.played.filter(
          (p) => p.time < spotTime - 0.1 && p.note.voice === 'bass',
        );
        const lateNotes = run.played.filter(
          (p) => p.time >= spotTime + 0.15 && p.time < fanfareTime - 0.7,
        );
        const lateBass = lateNotes.filter((p) => p.note.voice === 'bass');
        expect(earlyBass.length).toBeGreaterThan(0);
        expect(lateNotes.length).toBeGreaterThan(0);
        expect(lateBass).toHaveLength(0);
      });
    });
  });

  Rule('Three endings decide touchdown', ({ RuleScenario }) => {
    RuleScenario('All three endings appear across runs', ({ Given, When, Then }) => {
      let count = 6;
      let endings: string[] = [];

      Given('{int} people', (_, n: number) => {
        count = n;
      });

      // The plan decides the ending; "Each ending stalls…" plays every one in full.
      When('the show is planned with {int} different random seeds', (_, seeds: number) => {
        const team = SHORT_NAMES.slice(0, count);
        endings = Array.from(
          { length: seeds },
          (_, i) => buildPlan(team, team[i % count]!, createRandom(i + 1)).ending,
        );
      });

      Then(
        'some runs end with {string}, some with {string} and some with {string}',
        (_, a: string, b: string, c: string) => {
          const seen = new Set(endings);
          expect(seen.has(a)).toBe(true);
          expect(seen.has(b)).toBe(true);
          expect(seen.has(c)).toBe(true);
        },
      );
    });

    RuleScenario(
      'Each ending stalls over the mat, cuts the music and lands the winner',
      ({ Given, When, Then, And }) => {
        let team: string[] = [];
        let unlucky = 'Marco';
        const byEnding = new Map<string, Watched>();

        Given('{int} people, and the unlucky person is {string}', (_, n: number, who: string) => {
          unlucky = who;
          team = [...SHORT_NAMES.slice(0, n - 1), who];
        });

        When('the show runs with each ending', async () => {
          byEnding.clear();
          for (let seed = 1; seed <= 60 && byEnding.size < 3; seed++) {
            const run = await watch(team, unlucky, { seed });
            const ending = run.frames.at(-1)?.ending ?? '';
            if (
              ['ankle-gust', 'canopy-fold', 'boot-boop'].includes(ending) &&
              !byEnding.has(ending)
            ) {
              byEnding.set(ending, run);
            }
          }
          expect(byEnding.size).toBe(3);
        });

        Then('the final two stall over the mat for at least 0.5 seconds before touchdown', () => {
          for (const [ending, run] of byEnding) {
            const fanfareAt = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
            const duel = run.frames.filter(
              (f) => f.time < fanfareAt && atRiskEntries(f).length === 2,
            );
            let streak = 0;
            let best = 0;
            for (let i = 1; i < duel.length; i++) {
              const prev = duel[i - 1]!.people.get(unlucky)!;
              const curr = duel[i]!.people.get(unlucky)!;
              if (Math.abs(curr.y - prev.y) < 0.6) {
                streak += duel[i]!.time - duel[i - 1]!.time;
                best = Math.max(best, streak);
              } else {
                streak = 0;
              }
            }
            expect(best, `${ending} stall before touchdown`).toBeGreaterThanOrEqual(0.49);
          }
        });

        And('the music stops before the fanfare and does not come back', () => {
          for (const [ending, run] of byEnding) {
            const fanfareAt = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
            expect(Number.isFinite(fanfareAt), ending).toBe(true);
            expect(run.played.length, ending).toBeGreaterThan(8);
            expect(
              run.played.filter((p) => p.time >= fanfareAt - 0.02),
              ending,
            ).toHaveLength(0);
          }
        });

        And(
          'Marco stands on the mat in the party mood with the caption {string}',
          (_, text: string) => {
            for (const [ending, run] of byEnding) {
              const last = run.frames.at(-1)!;
              expect(last.matTop, ending).not.toBeNull();
              expect(last.people.get(unlucky)?.state, ending).toBe('unlucky');
              expect(last.people.get(unlucky)?.mood, ending).toBe('party');
              expect(
                run.record.captions.some((c) => c.text === text),
                ending,
              ).toBe(true);
            }
          },
        );

        And('Marco holds still on stage for the last 1.5 seconds', () => {
          for (const [ending, run] of byEnding) {
            const cutoff = run.record.duration - 1.5 + STEP;
            const tail = run.frames.filter((f) => f.time >= cutoff);
            expect(tail.length, ending).toBeGreaterThanOrEqual(20);
            const anchor = tail[0]!.people.get(unlucky)!;
            for (const f of tail) {
              const p = f.people.get(unlucky)!;
              expect(Math.hypot(p.x - anchor.x, p.y - anchor.y), ending).toBeLessThan(0.5);
            }
          }
        });
      },
    );

    RuleScenario(
      'Every head count from 2 to 8 lasts between 20 and 28 seconds',
      ({ When, Then }) => {
        let runs: Watched[] = [];

        When(
          'the show runs at every head count from {int} to {int}',
          async (_, min: number, max: number) => {
            const counts = Array.from({ length: max - min + 1 }, (_, i) => min + i);
            runs = [];
            for (const n of counts) {
              const team = SHORT_NAMES.slice(0, n);
              runs.push(await watch(team, team[0]!, { seed: n }));
            }
          },
        );

        Then('each run lasts between {int} and {int} seconds', (_, min: number, max: number) => {
          for (const run of runs) {
            expect(run.record.duration).toBeGreaterThanOrEqual(min);
            expect(run.record.duration).toBeLessThanOrEqual(max);
          }
        });
      },
    );
  });

  Rule('Every lane keeps name tags and bubbles apart', ({ RuleScenario }) => {
    RuleScenario(
      'A name tag stays beside its owner and off the landing mat',
      ({ Given, When, Then, And }) => {
        let run: Watched;

        Given('{int} people', () => undefined);

        When('the show runs', async () => {
          run = await watch(SHORT_NAMES, SHORT_NAMES[6]!, { seed: 6 });
        });

        Then(
          "every visible name tag is within {int} pixels of its owner's body",
          (_, reach: number) => {
            expect(run.frames.some((f) => f.tags.some((t) => t.size >= 40))).toBe(true);
            for (const frame of run.frames) {
              for (const tag of frame.tags) {
                const owner = frame.people.get(tag.name)!;
                expect(
                  gapBetween(tag.box, bodyBox(owner)),
                  `${tag.name}'s tag at ${frame.time.toFixed(2)}s`,
                ).toBeLessThanOrEqual(reach);
              }
            }
          },
        );

        And('no visible name tag overlaps the landing mat', () => {
          for (const frame of run.frames) {
            if (frame.matTop === null) continue;
            const mat = {
              left: MAT_LEFT,
              right: MAT_RIGHT,
              top: frame.matTop,
              bottom: frame.matTop + MAT_HEIGHT,
            };
            for (const tag of frame.tags) {
              expect(
                overlaps(tag.box, mat),
                `${tag.name}'s tag on the mat at ${frame.time.toFixed(2)}s`,
              ).toBe(false);
            }
          }
        });
      },
    );

    RuleScenario(
      'Eight long names and bubbles stay clear across drop zones',
      ({ Given, When, Then, And }) => {
        let runs: Watched[] = [];

        Given('8 people with long names', () => undefined);

        When('the show runs on each drop zone', async () => {
          const themes = (updraft.lineUp?.themes ?? []).map((t) => t.name);
          expect(themes.length).toBe(4);
          runs = [];
          for (const [idx, theme] of themes.entries()) {
            runs.push(await watch(LONG_NAMES, LONG_NAMES[idx]!, { seed: idx + 1, theme }));
          }
        });

        Then(
          'every visible name tag is at least 22 pixels and no two visible name tags overlap',
          () => {
            const minAllowed = stagePx('--size-stage-tag-min');
            for (const run of runs) {
              expect(run.frames.some((f) => f.tags.length === 8)).toBe(true);
              for (const frame of run.frames) {
                for (let i = 0; i < frame.tags.length; i++) {
                  const a = frame.tags[i]!;
                  expect(a.size).toBeGreaterThanOrEqual(minAllowed);
                  expect(a.box.left, `${a.name} left at ${frame.time}`).toBeGreaterThanOrEqual(0);
                  expect(a.box.right).toBeLessThanOrEqual(STAGE.width);
                  expect(a.box.top).toBeGreaterThanOrEqual(0);
                  expect(a.box.bottom).toBeLessThanOrEqual(STAGE.height);
                  for (let j = i + 1; j < frame.tags.length; j++) {
                    const b = frame.tags[j]!;
                    expect(
                      overlaps(a.box, b.box),
                      `tags ${a.name} & ${b.name} overlap at ${frame.time.toFixed(2)}s`,
                    ).toBe(false);
                  }
                }
              }
            }
          },
        );

        And('no visible speech bubble covers a visible name tag or face', () => {
          for (const run of runs) {
            expect(run.frames.some((f) => f.bubbles.length > 0)).toBe(true);
            for (const frame of run.frames) {
              for (const b of frame.bubbles) {
                expect(b.box.left).toBeGreaterThanOrEqual(0);
                expect(b.box.right).toBeLessThanOrEqual(STAGE.width);
                expect(b.box.top).toBeGreaterThanOrEqual(0);
                expect(b.box.bottom).toBeLessThanOrEqual(STAGE.height);
                for (const tag of frame.tags) {
                  expect(
                    overlaps(b.box, tag.box),
                    `bubble "${b.text}" overlaps tag ${tag.name} at ${frame.time.toFixed(2)}s`,
                  ).toBe(false);
                }
                for (const [person, snap] of frame.people) {
                  if (!Number.isFinite(snap.x) || !Number.isFinite(snap.size)) continue;
                  expect(
                    overlaps(b.box, faceBox(snap)),
                    `bubble "${b.text}" covers ${person}'s face at ${frame.time.toFixed(2)}s`,
                  ).toBe(false);
                }
              }
            }
          }
        });
      },
    );

    RuleScenario(
      'Reduced motion stops cloud drift and canopy sway while keeping captions',
      ({ Given, When, Then, And }) => {
        let reduced: Watched;
        let full: Watched;
        const team = SHORT_NAMES.slice(0, 5);

        Given('5 people and reduced motion is on', () => undefined);

        When('the show runs', async () => {
          reduced = await watch(team, team[2]!, { seed: 7, reducedMotion: true });
          full = await watch(team, team[2]!, { seed: 7, reducedMotion: false });
        });

        Then('the captions tell the same story as with full motion', () => {
          const midFrames = reduced.frames.filter((f) => f.time >= 1.5 && f.time <= 6.0);
          if (midFrames[0]?.cloudTops.length) {
            const initial = midFrames[0].cloudTops[0]!;
            for (const f of midFrames) {
              expect(Math.abs((f.cloudTops[0] ?? initial) - initial)).toBeLessThan(0.5);
            }
          }
          expect(reduced.record.captions.map((c) => c.text)).toEqual(
            full.record.captions.map((c) => c.text),
          );
          expect(reduced.record.captions.length).toBeGreaterThanOrEqual(3);
        });

        And('the show lasts between {int} and {int} seconds', (_, min: number, max: number) => {
          expect(reduced.record.duration).toBeGreaterThanOrEqual(min);
          expect(reduced.record.duration).toBeLessThanOrEqual(max);
        });
      },
    );
  });
});
