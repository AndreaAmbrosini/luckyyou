import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  speechBox,
  STAGE,
  stagePx,
  type Box,
  type Cue,
  type Note,
  type Scenario,
} from '../../scenario-kit';
import { follow } from '../../scenario-kit/music';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import musicalStools from './index';
import { planShow } from './plan';

const SHORT_NAMES = [
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
];

const LONG_NAMES = [
  'Maximilian-Alexander',
  'Bartholomew-James',
  'Francesca-Romana',
  'Jean-Christophe',
  'Anastasia-Maria',
  'Konstantinos-Paul',
  'al-Khwarizmi-Sato',
  'hubert-blaine-sr',
  'Evangelista-Torri',
  'Pierferdinando-Roi',
  'Mariagrazia-Livia',
  'Sebastiano-Vittor',
];

interface PersonSnap {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly state: string;
  readonly mood: string;
  readonly sweat: boolean;
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
  readonly gramophoneState: string | null;
  readonly stoolCount: number;
  readonly throneVisible: boolean;
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

function watch(
  team: readonly string[],
  unlucky: string,
  seed = 1,
  reducedMotion = false,
): Promise<Watched> {
  const key = `${team.join('|')}::${unlucky}::${seed}::${reducedMotion}`;
  let existing = cache.get(key);
  if (!existing) {
    existing = recordRun(team, unlucky, seed, reducedMotion);
    cache.set(key, existing);
  }
  return existing;
}

async function recordRun(
  team: readonly string[],
  unlucky: string,
  seed: number,
  reducedMotion: boolean,
): Promise<Watched> {
  const frames: Frame[] = [];
  const rawCues: { time: number | null; cue: Cue }[] = [];
  const rawMoves: { time: number | null; beat: number; speed: number }[] = [];
  const rawPlayed: { frameTime: number | null; delay: number; note: Note }[] = [];

  const spied: Scenario = {
    ...musicalStools,
    play: (show) =>
      musicalStools.play({
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
    seed,
    step: STEP,
    reducedMotion,
    onFrame(time, stage) {
      for (const c of rawCues) c.time ??= time;
      for (const m of rawMoves) m.time ??= time;
      for (const p of rawPlayed) p.frameTime ??= time;

      // Once the show is over, the run empties the stage.
      if (!stage.querySelector('[data-part="gramophone"]')) return;

      const people = new Map<string, PersonSnap>();
      for (const el of stage.querySelectorAll<HTMLElement>('[data-person]')) {
        const name = el.dataset.person!;
        people.set(name, {
          x: px(el.style.left),
          y: px(el.style.top),
          size: px(el.style.width) || px(el.dataset.size ?? ''),
          state: el.dataset.state ?? '',
          mood: el.dataset.mood ?? '',
          sweat: el.dataset.sweat === 'true',
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

      const gramophone = stage.querySelector<HTMLElement>('[data-part="gramophone"]');
      const stools = [...stage.querySelectorAll<HTMLElement>('[data-part="stool"]')].filter(
        visible,
      );
      const throne = stage.querySelector<HTMLElement>('[data-part="throne"]');

      frames.push({
        time,
        spotlight: stage.dataset.spotlight === 'on',
        ending: stage.dataset.ending ?? '',
        gramophoneState: gramophone ? (gramophone.dataset.state ?? 'playing') : null,
        stoolCount: stools.length,
        throneVisible: visible(throne),
        people,
        tags,
        bubbles,
      });
    },
  });

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

function atRiskNames(frame: Frame): string[] {
  return [...frame.people.entries()].filter(([, p]) => p.state === 'at-risk').map(([name]) => name);
}

describeSpec(await loadFeature('./musical-stools.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Musical Stools', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(musicalStools.name).toBe(name);
        expect(musicalStools.developmentOnly).toBeFalsy();
      });
      And('its description is {string}', (_, description: string) => {
        expect(musicalStools.description).toBe(description);
      });
      And('it takes {int} to {int} people', (_, min: number, max: number) => {
        expect(musicalStools.people).toEqual({ min, max });
      });
    });
  });

  Rule('Marchers circle the stools and grabbing one makes you safe', ({ RuleScenarioOutline }) => {
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
          run = await watch(team, unlucky, 1);
          expect(run.record.outcome).toBe('finished');
        });

        Then('a gramophone and between 1 and 3 stools appear inside the ring each round', () => {
          const activeFrames = run.frames.filter(
            (f) => f.time >= 1.8 && atRiskNames(f).length >= 2 && !f.throneVisible,
          );
          expect(activeFrames.length).toBeGreaterThan(10);
          expect(activeFrames.every((f) => f.gramophoneState !== null)).toBe(true);
          expect(activeFrames.some((f) => f.stoolCount >= 1 && f.stoolCount <= 3)).toBe(true);
          for (const f of activeFrames) {
            expect(f.stoolCount).toBeLessThanOrEqual(3);
          }
        });

        And(
          'every person except the unlucky one grabs a stool with a thunk and retires happy to the lounge',
          () => {
            const thunks = run.cues.filter((c) => c.cue === 'thunk');
            expect(thunks.length).toBeGreaterThanOrEqual(1);
            const end = run.frames.at(-1)!;
            for (const person of team) {
              if (person === unlucky) continue;
              const retired = run.frames.some((f) => {
                const snap = f.people.get(person);
                return snap?.state === 'safe' && snap.mood === 'happy' && snap.y <= 210;
              });
              expect(retired, `${person} retires happy to top lounge`).toBe(true);
              expect(end.people.get(person)?.state).toBe('safe');
            }
          },
        );

        And('the unlucky person never sits on a party stool', () => {
          const fanfareAt = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
          expect(Number.isFinite(fanfareAt)).toBe(true);
          for (const frame of run.frames) {
            if (frame.time < fanfareAt - STEP) {
              expect(frame.people.get(unlucky)?.state).toBe('at-risk');
            }
          }
          expect(run.frames.at(-1)!.people.get(unlucky)?.state).toBe('unlucky');
        });
      },
    );
  });

  Rule('Each stop is staged on its own, with room before the next', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people get their saves one stop at a time',
      ({ Given, When, Then, And }, variables) => {
        let runs: Watched[] = [];

        Given('<count> people', () => undefined);

        When('the show runs', async () => {
          const team = SHORT_NAMES.slice(0, Number(variables.count));
          runs = [];
          for (const seed of [1, 2, 3]) runs.push(await watch(team, team.at(-1)!, seed));
        });

        const gaps = (times: readonly number[]) => times.slice(1).map((t, i) => t - times[i]!);
        const sound = (run: Watched, cue: Cue) =>
          run.cues.filter((c) => c.cue === cue).map((c) => c.time);

        Then('the music stops at least 3.5 seconds after the stop before', () => {
          for (const run of runs) {
            const stops = sound(run, 'latch').slice(1);
            expect(stops.length).toBeGreaterThanOrEqual(3);
            for (const [i, gap] of gaps(stops).entries()) {
              expect(gap, `gap ${i}`).toBeGreaterThanOrEqual(3.5);
            }
          }
        });

        And('people who grab stools at the same stop thunk at least 0.25 seconds apart', () => {
          const least = 0.25;
          for (const run of runs) {
            const stops = sound(run, 'latch').slice(1);
            let grouped = 0;
            for (const [i, stop] of stops.entries()) {
              const thunks = sound(run, 'thunk').filter(
                (t) => t > stop && t < (stops[i + 1] ?? Infinity),
              );
              grouped += thunks.length > 1 ? 1 : 0;
              for (const gap of gaps(thunks)) expect(gap).toBeGreaterThanOrEqual(least - 0.01);
            }
            expect(grouped, 'a staged group save').toBeGreaterThanOrEqual(1);
          }
        });

        And('no two sounds come within 0.2 seconds of each other', () => {
          const least = 0.2;
          for (const run of runs) {
            const all = run.cues.map((c) => c.time).sort((a, b) => a - b);
            for (const gap of gaps(all)) expect(gap).toBeGreaterThanOrEqual(least - 1e-9);
          }
        });

        And('no two captions are up less than {int} seconds apart', (_, least: number) => {
          for (const run of runs) {
            for (const gap of gaps(run.record.captions.map((c) => c.from))) {
              expect(gap).toBeGreaterThanOrEqual(least);
            }
          }
        });

        And('only the stops before the spotlight save more than one person', () => {
          for (const run of runs) {
            const lit = run.frames.find((f) => f.spotlight)!;
            const later = run.frames.filter((f) => f.time >= lit.time + 0.5);
            expect(Math.max(...later.map((f) => f.stoolCount))).toBe(1);
            const before = run.frames.filter((f) => f.time < lit.time);
            expect(Math.max(...before.map((f) => f.stoolCount))).toBeGreaterThanOrEqual(2);
          }
        });

        And('the show lasts at most {int} seconds', (_, most: number) => {
          for (const run of runs) expect(run.record.duration).toBeLessThanOrEqual(most);
        });
      },
    );
  });

  Rule(
    'The stops start late and come faster as the show goes on',
    ({ RuleScenario, RuleScenarioOutline }) => {
      RuleScenario('Every restart plays an audible part of the song', ({ Then }) => {
        Then('every marching window lasts at least 1 second at every supported head count', () => {
          for (let count = 2; count <= 12; count++) {
            const names = SHORT_NAMES.slice(0, count);
            const plan = planShow(names, names.at(-1)!, createRandom(1));
            expect(plan.end).toBeLessThanOrEqual(30);
            for (const window of plan.rounds.flatMap((round) => round.windows)) {
              expect(
                window.to - window.from,
                `${count} people at ${window.from}s`,
              ).toBeGreaterThanOrEqual(1 - 1e-9);
            }
          }
        });
      });

      RuleScenarioOutline(
        '<count> people wait <first> seconds for the first stop, then it speeds up',
        ({ Given, When, Then, And }, variables) => {
          let runs: Watched[] = [];

          Given('<count> people', () => undefined);

          When('the show runs', async () => {
            const team = SHORT_NAMES.slice(0, Number(variables.count));
            runs = [];
            for (const seed of [1, 2, 3]) runs.push(await watch(team, team.at(-1)!, seed));
          });

          // The first latch is the needle dropping; the rest are real stops.
          const stopsOf = (run: Watched) =>
            run.cues
              .filter((c) => c.cue === 'latch')
              .map((c) => c.time)
              .slice(1);

          const checksOf = (run: Watched) =>
            [...stopsOf(run), ...run.cues.filter((c) => c.cue === 'creak').map((c) => c.time)].sort(
              (a, b) => a - b,
            );

          Then('the first music stop comes at least <first> seconds in', () => {
            for (const run of runs) {
              expect(stopsOf(run)[0]!).toBeGreaterThanOrEqual(Number(variables.first) - 0.05);
            }
          });

          And('every gap between stops is shorter than the one before', () => {
            for (const run of runs) {
              const stops = stopsOf(run);
              const between = [stops[0]!, ...stops.slice(1).map((t, i) => t - stops[i]!)];
              expect(between.length).toBeGreaterThanOrEqual(4);
              for (const [i, gap] of between.slice(1).entries()) {
                expect(gap, `gap ${i + 1} vs ${i}`).toBeLessThan(between[i]! - 0.05);
              }
            }
          });

          And(
            'checks accelerate to a fastest cadence between 1 and 2 seconds with no check less than 1 second apart',
            () => {
              for (const run of runs) {
                const checks = checksOf(run);
                const checkGaps = checks.slice(1).map((t, i) => t - checks[i]!);
                expect(checkGaps.length).toBeGreaterThanOrEqual(4);
                for (const gap of checkGaps) {
                  expect(gap).toBeGreaterThanOrEqual(1.0 - 0.05);
                }
                const fastest = Math.min(...checkGaps);
                expect(fastest).toBeGreaterThanOrEqual(1.0 - 0.05);
                expect(fastest).toBeLessThanOrEqual(2.0 + 0.05);
              }
            },
          );

          And('the last stop comes within {int} seconds', (_, most: number) => {
            for (const run of runs) expect(stopsOf(run).at(-1)!).toBeLessThanOrEqual(most);
          });

          And('the show lasts at most {int} seconds', (_, most: number) => {
            for (const run of runs) expect(run.record.duration).toBeLessThanOrEqual(most);
          });
        },
      );
    },
  );

  Rule('The gramophone fakes everyone out at least once', ({ RuleScenario }) => {
    RuleScenario(
      'A needle screech pauses the waltz without anyone sitting',
      ({ Given, When, Then }) => {
        let run: Watched;

        Given('{int} people', () => undefined);

        When('the show runs', async () => {
          const team = SHORT_NAMES.slice(0, 8);
          run = await watch(team, team[4]!, 2);
        });

        Then(
          'before the final three, the gramophone creaks and pauses the music while nobody goes safe, then resumes',
          () => {
            const spotAt = run.frames.find((f) => f.spotlight)?.time ?? Infinity;
            const fakeout = run.cues.find((creak) => {
              if (creak.cue !== 'creak' || creak.time >= spotAt - 0.3) return false;
              const pausedMove = run.moves.some(
                (m) => m.speed === 0 && m.time >= creak.time - 0.1 && m.time <= creak.time + 0.8,
              );
              const resumedMove = run.moves.some(
                (m) => m.speed > 0 && m.time > creak.time + 0.3 && m.time <= creak.time + 1.8,
              );
              const before = run.frames.findLast((f) => f.time <= creak.time);
              const after = run.frames.find((f) => f.time >= creak.time + 0.9);
              if (!pausedMove || !resumedMove || !before || !after) return false;
              return atRiskNames(before).length === atRiskNames(after).length;
            });
            expect(fakeout).toBeDefined();
          },
        );
      },
    );
  });

  Rule('The final stretch spotlights the last marchers', ({ RuleScenario }) => {
    RuleScenario('Final three spotlight', ({ Given, When, Then, And }) => {
      let run: Watched;
      let spotIndex = -1;

      Given('{int} people', () => undefined);

      When('{int} marchers are left at risk', async (_, remaining: number) => {
        const team = SHORT_NAMES.slice(0, 8);
        run = await watch(team, team[2]!, 3);
        spotIndex = run.frames.findIndex((f) => f.spotlight && atRiskNames(f).length === remaining);
        expect(spotIndex).toBeGreaterThan(0);
      });

      Then('the spotlight turns on over {int} stool', (_, stools: number) => {
        const spotFrame = run.frames
          .slice(spotIndex)
          .find((f) => f.stoolCount === stools && atRiskNames(f).length === 3);
        expect(spotFrame).toBeDefined();
        expect(spotFrame!.spotlight).toBe(true);
      });

      And('the remaining marchers grow larger and sweat', () => {
        const early = run.frames.find((f) => f.time >= 1.6)!;
        const spotFrame = run.frames
          .slice(spotIndex)
          .find((f) => f.time >= run.frames[spotIndex]!.time + 0.5)!;
        const finalists = atRiskNames(spotFrame);
        expect(finalists).toHaveLength(3);
        for (const name of finalists) {
          expect(spotFrame.people.get(name)!.size).toBeGreaterThan(
            early.people.get(name)!.size * 1.1,
          );
          expect(spotFrame.people.get(name)!.sweat).toBe(true);
        }
      });

      And('the heartbeat starts and speeds up until the final stool is taken', () => {
        const spotTime = run.frames[spotIndex]!.time;
        const fanfareTime = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
        const beats = run.cues
          .filter((c) => c.cue === 'heartbeat' && c.time >= spotTime - 0.1 && c.time < fanfareTime)
          .map((c) => c.time);
        expect(beats.length).toBeGreaterThanOrEqual(4);
        expect(beats.at(-1)! - beats.at(-2)!).toBeLessThan(beats[1]! - beats[0]!);
      });

      And('the waltz plays on without its bass until the final stop', () => {
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

  Rule('Three endings settle the last stool between the final two', ({ RuleScenario }) => {
    RuleScenario('All three endings appear across runs', ({ Given, When, Then }) => {
      let count = 6;
      let endings: string[] = [];

      Given('{int} people', (_, n: number) => {
        count = n;
      });

      // The plan draws the ending first; "Each ending freezes…" plays every one in full.
      When('the show is planned with {int} different random seeds', (_, seeds: number) => {
        const team = SHORT_NAMES.slice(0, count);
        endings = Array.from(
          { length: seeds },
          (_, i) => planShow(team, team[i % count]!, createRandom(i + 1)).ending,
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
      'Each ending freezes, cuts the waltz and drops the Boss Throne',
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
            const run = await watch(team, unlucky, seed);
            const ending = run.frames.at(-1)?.ending ?? '';
            if (
              ['clean-beat', 'encore-fakeout', 'hip-bump'].includes(ending) &&
              !byEnding.has(ending)
            ) {
              byEnding.set(ending, run);
            }
          }
          expect(byEnding.size).toBe(3);
        });

        Then('the final duel holds a freeze of at least 0.5 seconds before the reveal', () => {
          for (const [ending, run] of byEnding) {
            const fanfareAt = run.cues.find((c) => c.cue === 'fanfare')?.time ?? Infinity;
            const duelEnd = run.frames.filter((f) => f.time < fanfareAt && f.spotlight);
            let streak = 0;
            let best = 0;
            for (let i = 1; i < duelEnd.length; i++) {
              const prev = duelEnd[i - 1]!.people.get(unlucky)!;
              const curr = duelEnd[i]!.people.get(unlucky)!;
              if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < 0.5) {
                streak += duelEnd[i]!.time - duelEnd[i - 1]!.time;
                best = Math.max(best, streak);
              } else {
                streak = 0;
              }
            }
            expect(best, `${ending} freeze before reveal`).toBeGreaterThanOrEqual(0.49);
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
          'a Boss Throne appears for Marco in the party mood with the caption {string}',
          (_, text: string) => {
            for (const [ending, run] of byEnding) {
              const last = run.frames.at(-1)!;
              expect(last.throneVisible, ending).toBe(true);
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
  });

  Rule('Two or three people start straight in the spotlight', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> marchers circle one stool from the start',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let run: Watched;

        Given('<count> people', () => {
          count = Number(variables.count);
        });

        When('the show runs', async () => {
          const team = SHORT_NAMES.slice(0, count);
          run = await watch(team, team[0]!, 4);
        });

        Then('the spotlight turns on right after the opening with "<caption>" and 1 stool', () => {
          const spot = run.frames.find((f) => f.spotlight && f.stoolCount === 1);
          expect(spot).toBeDefined();
          expect(spot!.time).toBeLessThanOrEqual(4.5);
          expect(run.record.captions.some((c) => c.text === variables.caption)).toBe(true);
        });

        And('the gramophone fakes the marchers out before the decisive stop', () => {
          const firstSafeTime =
            run.frames.find((f) => atRiskNames(f).length < count)?.time ?? Infinity;
          const screeched = run.cues.some((c) => c.cue === 'creak' && c.time < firstSafeTime - 0.1);
          expect(screeched).toBe(true);
        });

        And('the show lasts between {int} and {int} seconds', (_, min: number, max: number) => {
          expect(run.record.duration).toBeGreaterThanOrEqual(min);
          expect(run.record.duration).toBeLessThanOrEqual(max);
        });
      },
    );
  });

  Rule('Orbiting name tags and speech bubbles never overlap', ({ RuleScenario }) => {
    RuleScenario('Twelve long names orbit without overlapping', ({ Given, When, Then, And }) => {
      let run: Watched;

      Given('12 people with long names', () => undefined);

      When('the show runs', async () => {
        run = await watch(LONG_NAMES, LONG_NAMES[7]!, 5);
      });

      Then(
        'every visible name tag is at least 22 pixels and no two visible name tags overlap',
        () => {
          const minAllowed = stagePx('--size-stage-tag-min');
          expect(run.frames.some((f) => f.tags.length === 12)).toBe(true);
          for (const frame of run.frames) {
            for (let i = 0; i < frame.tags.length; i++) {
              const a = frame.tags[i]!;
              expect(a.size).toBeGreaterThanOrEqual(minAllowed);
              expect(a.box.left).toBeGreaterThanOrEqual(0);
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
        },
      );

      And('no visible speech bubble covers a visible name tag or face', () => {
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
      });
    });

    RuleScenario(
      'Reduced motion glides around the oval without waltz bounce',
      ({ Given, When, Then, And }) => {
        let reduced: Watched;
        let full: Watched;
        const team = SHORT_NAMES.slice(0, 6);

        Given('6 people and reduced motion is on', () => undefined);

        When('the show runs', async () => {
          reduced = await watch(team, team[1]!, 6, true);
          full = await watch(team, team[1]!, 6, false);
        });

        Then('the captions tell the same story as with full motion', () => {
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
