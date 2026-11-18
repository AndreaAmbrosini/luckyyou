import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import {
  speechBox,
  handOutLooks,
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
import hideAndSeek from './index';
import { layoutFor } from './layout';
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
  readonly z: number;
  readonly state: string;
  readonly mood: string;
  readonly sweat: boolean;
  readonly hidden: boolean;
}

interface PropSnap {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly z: number;
  readonly tell: string;
  readonly empty: boolean;
  readonly opacity: number;
  readonly tilt: number;
}

interface TagSnap {
  readonly name: string;
  readonly size: number;
  readonly box: Box;
  /** The stacking order of the layer the tag is drawn in. */
  readonly z: number;
}

interface Frame {
  readonly time: number;
  readonly spotlight: boolean;
  readonly ending: string;
  readonly lens: { readonly x: number; readonly y: number } | null;
  readonly seekerPose: string;
  readonly people: ReadonlyMap<string, PersonSnap>;
  readonly props: readonly PropSnap[];
  readonly tags: readonly TagSnap[];
  readonly bubbles: readonly { readonly by: string; readonly text: string; readonly box: Box }[];
}

interface Watched {
  readonly frames: readonly Frame[];
  readonly record: ShowRecord;
  readonly cues: readonly { readonly time: number; readonly cue: Cue }[];
  readonly played: readonly { readonly time: number; readonly note: Note }[];
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
  const cx = px(wrapper.style.left);
  const top = px(wrapper.style.top);
  if (![size, cx, top].every(Number.isFinite)) return null;
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
    z: px(wrapper.parentElement?.style.zIndex ?? ''),
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

function faceBox(person: PersonSnap): Box {
  const radius = person.size * 0.42;
  return {
    left: person.x - radius,
    right: person.x + radius,
    top: person.y - radius,
    bottom: person.y + radius,
  };
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
  const rawPlayed: { frameTime: number | null; delay: number; note: Note }[] = [];
  const spied: Scenario = {
    ...hideAndSeek,
    play: (show) =>
      hideAndSeek.play({
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
      for (const cue of rawCues) cue.time ??= time;
      for (const note of rawPlayed) note.frameTime ??= time;

      const people = new Map<string, PersonSnap>();
      for (const el of stage.querySelectorAll<HTMLElement>('[data-person]')) {
        const name = el.dataset.person!;
        people.set(name, {
          x: px(el.style.left),
          y: px(el.style.top),
          size: px(el.style.width) || px(el.dataset.size ?? ''),
          z: px(el.style.zIndex),
          state: el.dataset.state ?? '',
          mood: el.dataset.mood ?? '',
          sweat: el.dataset.sweat === 'true',
          hidden: el.dataset.hidden === 'true',
        });
      }
      if (people.size === 0) return;

      const props = [...stage.querySelectorAll<HTMLElement>('[data-part="prop"]')].map((el) => ({
        x: px(el.style.left),
        y: px(el.style.top),
        width: px(el.style.width),
        height: px(el.style.height) || px(el.style.width),
        z: px(el.style.zIndex),
        tell: el.dataset.tell ?? '',
        empty: el.dataset.empty === 'true',
        opacity: el.style.opacity === '' ? 1 : Number.parseFloat(el.style.opacity),
        tilt: Number.parseFloat(el.style.getPropertyValue('--tilt')) || 0,
      }));

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

      const lensEl = stage.querySelector<HTMLElement>('[data-part="lens"]');
      const lens =
        lensEl && visible(lensEl) ? { x: px(lensEl.style.left), y: px(lensEl.style.top) } : null;
      frames.push({
        time,
        spotlight: stage.dataset.spotlight === 'on',
        ending: stage.dataset.ending ?? '',
        lens,
        seekerPose: stage.querySelector<HTMLElement>('[data-part="seeker"]')?.dataset.pose ?? '',
        people,
        props,
        tags,
        bubbles,
      });
    },
  });

  return {
    frames,
    record,
    cues: rawCues.map((cue) => ({ time: cue.time ?? record.duration, cue: cue.cue })),
    played: rawPlayed.map((note) => ({
      time: (note.frameTime ?? record.duration) + note.delay,
      note: note.note,
    })),
  };
}

function atRiskNames(frame: Frame): string[] {
  return [...frame.people.entries()]
    .filter(([, person]) => person.state === 'at-risk')
    .map(([name]) => name);
}

function awaySpans(run: Watched): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (const frame of run.frames) {
    if (frame.seekerPose === 'away' && start === null) start = frame.time;
    if (frame.seekerPose !== 'away' && start !== null) {
      spans.push({ from: start, to: frame.time });
      start = null;
    }
  }
  if (start !== null) spans.push({ from: start, to: run.record.duration });
  return spans;
}

function hasCrossing(run: Watched): boolean {
  for (let i = 1; i < run.frames.length; i++) {
    const before = run.frames[i - 1]!;
    const after = run.frames[i]!;
    if (after.seekerPose !== 'away') continue;
    for (const [name, current] of after.people) {
      const previous = before.people.get(name);
      if (
        previous?.state === 'at-risk' &&
        current.state === 'at-risk' &&
        !current.hidden &&
        Math.hypot(current.x - previous.x, current.y - previous.y) > 0.5
      ) {
        return true;
      }
    }
  }
  return false;
}

describeSpec(await loadFeature('./hide-and-seek.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows Hide and Seek', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => {
        expect(hideAndSeek.name).toBe(name);
        expect(hideAndSeek.developmentOnly).toBeFalsy();
      });
      And('its description is {string}', (_, description: string) => {
        expect(hideAndSeek.description).toBe(description);
      });
      And('it takes {int} to {int} people', (_, min: number, max: number) => {
        expect(hideAndSeek.people).toEqual({ min, max });
      });
    });
  });

  Rule('Everyone hides, and getting found sets you free', ({ RuleScenarioOutline }) => {
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

        Then('at least <count> pieces of furniture, a seeker and a lens appear on stage', () => {
          expect(run.frames.some((frame) => frame.props.length >= count)).toBe(true);
          expect(run.frames.some((frame) => frame.lens !== null)).toBe(true);
          expect(run.frames.some((frame) => frame.seekerPose !== '')).toBe(true);
        });

        And(
          'every person except the unlucky one is found with a pop, turns happy and goes safe on the balcony',
          () => {
            expect(run.cues.filter((cue) => cue.cue === 'pop').length).toBeGreaterThanOrEqual(
              count - 1,
            );
            for (const name of team) {
              if (name === unlucky) continue;
              expect(
                run.frames.some((frame) => {
                  const person = frame.people.get(name);
                  return person?.state === 'safe' && person.mood === 'happy' && person.y <= 220;
                }),
                `${name} reaches the balcony happy and safe`,
              ).toBe(true);
            }
          },
        );

        And('the unlucky person is never found before the reveal', () => {
          const fanfareAt = run.cues.find((cue) => cue.cue === 'fanfare')?.time ?? Infinity;
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

  Rule('Furniture really hides people and names stay readable', ({ RuleScenario }) => {
    RuleScenario('A furnished room rather than a row of props', ({ Then, And }) => {
      Then('hiding places occupy two staggered depths for 4 to 12 people', () => {
        for (let count = 4; count <= 12; count++) {
          const { places } = layoutFor(SHORT_NAMES.slice(0, count), count);
          const depths = [...new Set(places.map((place) => place.top))];
          expect(depths.length).toBeGreaterThanOrEqual(2);
          expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(130);
          expect(new Set(places.map((place) => place.x)).size).toBe(places.length);
        }
      });
      And('the sofa and dining table are wider than they are tall', () => {
        const { places } = layoutFor(SHORT_NAMES.slice(0, 8), 8);
        for (const kind of [0, 3]) {
          const place = places.find((each) => each.furniture === kind)!;
          expect(place).toBeDefined();
          expect(place.box).toBeGreaterThan(place.height * 1.3);
        }
      });
    });

    RuleScenario('Hiders sit inside furniture that covers them', ({ Given, When, Then, And }) => {
      let run: Watched;
      Given('8 people', () => undefined);
      When('the show runs', async () => {
        run = await watch(SHORT_NAMES.slice(0, 8), SHORT_NAMES[7]!, 8);
      });

      Then(
        'every hidden person shelters behind furniture at least 1.5 times as wide as their face',
        () => {
          const frame = run.frames.find((entry) => entry.time >= 1.5)!;
          const hidden = [...frame.people.values()].filter((person) => person.hidden);
          expect(hidden).toHaveLength(8);
          for (const person of hidden) {
            const face = faceBox(person);
            const covering = frame.props.find((prop) => {
              const left = prop.x - prop.width / 2;
              return (
                face.left >= left &&
                face.right <= left + prop.width &&
                face.bottom >= prop.y + prop.height * 0.3 &&
                face.bottom <= prop.y + prop.height
              );
            });
            expect(covering).toBeDefined();
            expect(covering!.width).toBeGreaterThanOrEqual((face.right - face.left) * 1.5);
            expect(covering!.z).toBeGreaterThan(person.z);
          }
        },
      );

      And('each piece of furniture shows a small giveaway', () => {
        const frame = run.frames.find((entry) => entry.time >= 1.5)!;
        expect(frame.props).toHaveLength(8);
        expect(frame.props.every((prop) => prop.tell !== '')).toBe(true);
      });

      And('hiders occasionally peek above their hiding place while remaining behind it', () => {
        expect(
          run.frames.some(
            (frame) =>
              frame.time < 2.5 &&
              [...frame.people.values()].some(
                (person) =>
                  person.hidden &&
                  frame.props.some(
                    (prop) =>
                      Math.abs(person.x - prop.x) < 1 &&
                      faceBox(person).top < prop.y - 8 &&
                      person.z < prop.z,
                  ),
              ),
          ),
        ).toBe(true);
      });

      And('no visible name tag overlaps visible furniture', () => {
        expect(run.frames.some((frame) => frame.tags.length === 8)).toBe(true);
        for (const frame of run.frames) {
          for (const tag of frame.tags) {
            for (const prop of frame.props.filter((item) => item.opacity > 0.05)) {
              const box = {
                left: prop.x - prop.width / 2,
                right: prop.x + prop.width / 2,
                top: prop.y,
                bottom: prop.y + prop.height,
              };
              expect(
                overlaps(tag.box, box),
                `${tag.name}'s tag overlaps furniture at ${frame.time.toFixed(2)}s`,
              ).toBe(false);
            }
          }
        }
      });
    });
  });

  Rule('Big groups find pairs early so the show stays brisk', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'Early sweeps find two at once with <count> people',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let run: Watched;
        Given('<count> people', () => {
          count = Number(variables.count);
        });
        When('the show runs', async () => {
          const team = SHORT_NAMES.slice(0, count);
          run = await watch(team, team[0]!, 2);
        });

        Then('at least one sweep before the final three finds two hiders together', () => {
          const finalThreeAt = run.frames.find((frame) => frame.spotlight)?.time ?? Infinity;
          const early = run.frames.filter((frame) => frame.time < finalThreeAt);
          expect(
            early.some((frame) => {
              const later = early.find((entry) => entry.time >= frame.time + 0.35);
              return later && atRiskNames(frame).length - atRiskNames(later).length >= 2;
            }),
          ).toBe(true);
        });

        And('the show lasts between {int} and {int} seconds', (_, min: number, max: number) => {
          expect(run.record.duration).toBeGreaterThanOrEqual(min);
          expect(run.record.duration).toBeLessThanOrEqual(max);
        });
      },
    );
  });

  Rule('A near-miss pass-over teases a hider before moving on', ({ RuleScenario }) => {
    RuleScenario('The lens hovers over someone and skips past', ({ Given, When, Then }) => {
      let runs: Watched[] = [];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', async (_, seeds: number) => {
        const team = SHORT_NAMES.slice(0, 8);
        runs = [];
        for (let seed = 1; seed <= seeds; seed++) {
          runs.push(await watch(team, team[seed % team.length]!, seed));
        }
      });
      Then(
        'before the final three, the lens hovers with a sniff and creaks past without finding anyone',
        () => {
          expect(
            runs.some((run) => {
              const finalThreeAt = run.frames.find((frame) => frame.spotlight)?.time ?? Infinity;
              return run.cues.some((sniff) => {
                if (sniff.cue !== 'sniff' || sniff.time >= finalThreeAt - 0.3) return false;
                const creak = run.cues.find(
                  (cue) =>
                    cue.cue === 'creak' &&
                    cue.time >= sniff.time - 0.1 &&
                    cue.time <= sniff.time + 1.4,
                );
                const before = run.frames.findLast((frame) => frame.time <= sniff.time);
                const after = run.frames.find((frame) => frame.time >= sniff.time + 0.8);
                return (
                  creak !== undefined &&
                  before !== undefined &&
                  after !== undefined &&
                  atRiskNames(before).length === atRiskNames(after).length
                );
              });
            }),
          ).toBe(true);
        },
      );
    });
  });

  Rule('When the seeker looks away a hider sneaks to another spot', ({ RuleScenario }) => {
    RuleScenario('Hiders keep changing hiding places', ({ Then, And }) => {
      const plans = () =>
        Array.from({ length: 9 }, (_, i) => i + 4).flatMap((count) =>
          [1, 2, 3, 4, 5].map((seed) => {
            const names = SHORT_NAMES.slice(0, count);
            const random = createRandom(seed);
            handOutLooks(names, random);
            return planShow(names, names.at(-1)!, random, layoutFor(names, count));
          }),
        );
      Then(
        'at least two hiders cross between hiding places in every show with 4 to 12 people',
        () => {
          for (const plan of plans()) {
            expect(new Set(plan.moves.map((move) => move.name)).size).toBeGreaterThanOrEqual(2);
            expect(plan.end).toBeLessThanOrEqual(30);
            for (const move of plan.moves) {
              expect(
                plan.away.some((span) => move.depart >= span.from && move.arrive <= span.to),
              ).toBe(true);
            }
          }
        },
      );
      And('later finding sweeps hold for less time than the first', () => {
        for (const plan of plans()) {
          const sweeps = plan.stops.filter((stop) =>
            plan.pops.some((pop) => pop.at >= stop.arrive && pop.at < stop.leave),
          );
          expect(sweeps.at(-1)!.leave - sweeps.at(-1)!.arrive).toBeLessThan(
            sweeps[0]!.leave - sweeps[0]!.arrive,
          );
        }
      });
    });

    RuleScenario(
      'A hider crosses the room while the seeker looks away',
      ({ Given, When, Then, And }) => {
        let runs: Watched[] = [];
        Given('{int} people', () => undefined);
        When('the show runs with {int} different random seeds', async (_, seeds: number) => {
          const team = SHORT_NAMES.slice(0, 8);
          runs = [];
          for (let seed = 1; seed <= seeds; seed++) {
            runs.push(await watch(team, team[seed % team.length]!, seed + 100));
          }
        });

        Then(
          'the seeker looks away, a hider leaves cover and crosses the open floor to a free piece of furniture',
          () => {
            expect(runs.every((run) => awaySpans(run).length > 0 && hasCrossing(run))).toBe(true);
            expect(
              runs.some((run) =>
                run.record.captions.some((caption) => caption.text.endsWith('made it!')),
              ),
            ).toBe(true);
          },
        );

        And(
          'some runs end the crossing hidden at the new spot and some runs have the seeker turn back and catch the hider mid-crossing',
          () => {
            const succeeds = runs.filter((run) =>
              run.record.captions.some((caption) => caption.text.endsWith('made it!')),
            );
            const catches = runs.filter((run) =>
              run.record.captions.some((caption) => caption.text.startsWith('Caught sneaking, ')),
            );
            expect(succeeds.length).toBeGreaterThan(0);
            expect(catches.length).toBeGreaterThan(0);
            for (const run of succeeds) {
              const caption = run.record.captions.find((entry) => entry.text.endsWith('made it!'))!;
              const name = caption.text.slice(0, -' made it!'.length);
              const frame = run.frames.find((entry) => entry.time >= caption.from)!;
              expect(frame.people.get(name)?.hidden).toBe(true);
            }
          },
        );

        And('a caught hider turns happy and goes safe on the balcony', () => {
          for (const run of runs) {
            for (const caption of run.record.captions.filter((entry) =>
              entry.text.startsWith('Caught sneaking, '),
            )) {
              const name = caption.text.slice('Caught sneaking, '.length, -1);
              expect(
                run.frames.some((frame) => {
                  const person = frame.people.get(name);
                  return person?.state === 'safe' && person.mood === 'happy' && person.y <= 220;
                }),
              ).toBe(true);
            }
          }
        });

        And('nobody is found while the seeker looks away', () => {
          for (let index = 1; index < runs[0]!.frames.length; index++) {
            const before = runs[0]!.frames[index - 1]!;
            const current = runs[0]!.frames[index]!;
            if (current.seekerPose !== 'away') continue;
            const newlySafe = [...current.people].some(
              ([name, person]) =>
                person.state === 'safe' && before.people.get(name)?.state === 'at-risk',
            );
            expect(newlySafe).toBe(false);
          }
        });
      },
    );
  });

  Rule('The final stretch spotlights the last hiders', ({ RuleScenario }) => {
    RuleScenario('Final three spotlight', ({ Given, When, Then, And }) => {
      let run: Watched;
      let spotlightFrame: Frame;
      Given('8 people', () => undefined);
      When('{int} people are left at risk', async () => {
        run = await watch(SHORT_NAMES.slice(0, 8), SHORT_NAMES[3]!, 3);
        spotlightFrame = run.frames.find(
          (frame) => frame.spotlight && atRiskNames(frame).length === 3,
        )!;
        expect(spotlightFrame).toBeDefined();
      });

      Then('the caption is {string} and the spotlight turns on', (_, text: string) => {
        expect(spotlightFrame.spotlight).toBe(true);
        expect(run.record.captions.some((caption) => caption.text === text)).toBe(true);
      });

      And(
        'the remaining hiders stay behind their furniture with scared, sweating faces while it trembles',
        () => {
          const after = run.frames.filter(
            (frame) =>
              frame.time >= spotlightFrame.time + 0.6 && frame.time <= spotlightFrame.time + 1.2,
          );
          expect(after.length).toBeGreaterThan(5);
          for (const frame of after) {
            for (const name of atRiskNames(frame)) {
              const person = frame.people.get(name)!;
              expect(person.hidden).toBe(true);
              expect(person.mood).toBe('scared');
              expect(person.sweat).toBe(true);
            }
          }
          expect(after.some((frame) => frame.props.some((prop) => Math.abs(prop.tilt) > 0))).toBe(
            true,
          );
        },
      );

      And('the heartbeat starts and comes quicker until the reveal', () => {
        const fanfareAt = run.cues.find((cue) => cue.cue === 'fanfare')?.time ?? Infinity;
        const beats = run.cues
          .filter(
            (cue) =>
              cue.cue === 'heartbeat' &&
              cue.time >= spotlightFrame.time - 0.1 &&
              cue.time < fanfareAt,
          )
          .map((cue) => cue.time);
        expect(beats.length).toBeGreaterThanOrEqual(4);
        expect(beats.at(-1)! - beats.at(-2)!).toBeLessThan(beats[1]! - beats[0]!);
      });

      And('the music plays on without its bass until the reveal', () => {
        const fanfareAt = run.cues.find((cue) => cue.cue === 'fanfare')?.time ?? Infinity;
        const beforeBass = run.played.filter(
          (played) => played.time < spotlightFrame.time - 0.1 && played.note.voice === 'bass',
        );
        const during = run.played.filter(
          (played) => played.time >= spotlightFrame.time + 0.15 && played.time < fanfareAt - 0.6,
        );
        expect(beforeBass.length).toBeGreaterThan(0);
        expect(during.length).toBeGreaterThan(0);
        expect(during.filter((played) => played.note.voice === 'bass')).toHaveLength(0);
      });
    });
  });

  Rule('Three endings decide the last two', ({ RuleScenario }) => {
    RuleScenario('All three endings appear across runs', ({ Given, When, Then }) => {
      let planned: string[] = [];
      Given('{int} people', () => undefined);
      // The plan decides the ending; "Each ending pauses…" plays every one in full.
      When('the show is planned with {int} different random seeds', (_, seeds: number) => {
        const team = SHORT_NAMES.slice(0, 6);
        planned = Array.from({ length: seeds }, (_, i) => {
          const random = createRandom(i + 201);
          handOutLooks(team, random);
          return planShow(team, team[(i + 1) % team.length]!, random, layoutFor(team, 6)).ending;
        });
      });
      Then(
        'some runs end with {string}, some with {string} and some with {string}',
        (_, first: string, second: string, third: string) => {
          const endings = new Set(planned);
          expect(endings.has(first)).toBe(true);
          expect(endings.has(second)).toBe(true);
          expect(endings.has(third)).toBe(true);
        },
      );
    });

    RuleScenario(
      'Each ending pauses, cuts the music and crowns the champion',
      ({ Given, When, Then, And }) => {
        let team: string[] = [];
        let unlucky = 'Marco';
        const byEnding = new Map<string, Watched>();
        Given(
          '{int} people, and the unlucky person is {string}',
          (_, count: number, name: string) => {
            unlucky = name;
            team = [...SHORT_NAMES.slice(0, count - 1), name];
          },
        );
        When('the show runs with each ending', async () => {
          byEnding.clear();
          for (let seed = 1; seed <= 60 && byEnding.size < 3; seed++) {
            const run = await watch(team, unlucky, seed + 500);
            const ending = run.frames.at(-1)?.ending ?? '';
            if (['double-take', 'decoy-wave', 'walk-on-by'].includes(ending)) {
              byEnding.set(ending, run);
            }
          }
          expect(byEnding.size).toBe(3);
        });

        Then(
          'the final two hold a freeze of at least 0.5 seconds before the last safe hider is cleared',
          () => {
            for (const [ending, run] of byEnding) {
              const duel = run.frames.filter((frame) => atRiskNames(frame).length === 2);
              let held = 0;
              let longest = 0;
              for (let index = 1; index < duel.length; index++) {
                const before = duel[index - 1]!;
                const current = duel[index]!;
                const still =
                  before.lens !== null &&
                  current.lens !== null &&
                  Math.hypot(current.lens.x - before.lens.x, current.lens.y - before.lens.y) < 0.5;
                held = still ? held + current.time - before.time : 0;
                longest = Math.max(longest, held);
              }
              expect(longest, `${ending} pause`).toBeGreaterThanOrEqual(0.49);
            }
          },
        );

        And('each ending shows its own clue before the last safe hider is found', () => {
          const clues: Record<string, string> = {
            'double-take': 'Wait…',
            'decoy-wave': 'Is it you?',
            'walk-on-by': 'Nobody else here?',
          };
          for (const [ending, run] of byEnding) {
            const clue = run.record.captions.find((caption) => caption.text === clues[ending]);
            const lastPop = run.cues.filter((cue) => cue.cue === 'pop').at(-1)?.time ?? -Infinity;
            expect(clue, ending).toBeDefined();
            expect(clue!.from, ending).toBeLessThan(lastPop);
          }
        });

        And('the music stops before the fanfare and does not come back', () => {
          for (const [ending, run] of byEnding) {
            const fanfareAt = run.cues.find((cue) => cue.cue === 'fanfare')?.time ?? Infinity;
            expect(Number.isFinite(fanfareAt), ending).toBe(true);
            expect(run.played.length, ending).toBeGreaterThan(8);
            expect(
              run.played.filter((played) => played.time >= fanfareAt - 0.02),
              `${ending} remains silent at the fanfare`,
            ).toHaveLength(0);
          }
        });

        And('Marco is crowned in the party mood with the caption {string}', (_, text: string) => {
          const name = unlucky;
          for (const [ending, run] of byEnding) {
            const finalPerson = run.frames.at(-1)!.people.get(name)!;
            expect(finalPerson.state, ending).toBe('unlucky');
            expect(finalPerson.mood, ending).toBe('party');
            expect(
              run.record.captions.some((caption) => caption.text === text),
              ending,
            ).toBe(true);
          }
        });

        And('Marco holds still on stage for the last 1.5 seconds', () => {
          const name = unlucky;
          const seconds = 1.5;
          for (const [ending, run] of byEnding) {
            const cutoff = run.record.duration - seconds + STEP;
            const tail = run.frames.filter((frame) => frame.time >= cutoff);
            expect(tail.length, ending).toBeGreaterThanOrEqual(20);
            const anchor = tail[0]!.people.get(name)!;
            for (const frame of tail) {
              const person = frame.people.get(name)!;
              expect(Math.hypot(person.x - anchor.x, person.y - anchor.y), ending).toBeLessThan(
                0.5,
              );
            }
          }
        });

        And("Marco's name tag shows in front of Marco, not behind", () => {
          const name = unlucky;
          for (const [ending, run] of byEnding) {
            const final = run.frames.at(-1)!;
            const person = final.people.get(name)!;
            // The head and the body below it.
            const drawn: Box = {
              left: person.x - person.size / 2,
              right: person.x + person.size / 2,
              top: person.y - person.size / 2,
              bottom: person.y + person.size,
            };
            const tag = final.tags.find((each) => each.name === name);
            expect(tag, ending).toBeDefined();
            if (overlaps(tag!.box, drawn)) {
              expect(tag!.z, `${ending}: tag layer above ${name}`).toBeGreaterThan(person.z);
            }
          }
        });
      },
    );
  });

  Rule('Small groups go straight to the showdown', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people open in spotlight mode',
      ({ Given, When, Then, And }, variables) => {
        let count: number;
        let run: Watched;
        Given('<count> people', () => {
          count = Number(variables.count);
        });
        When('the show runs', async () => {
          const team = SHORT_NAMES.slice(0, count);
          run = await watch(team, team.at(-1)!, 4 + count);
        });
        Then('the spotlight turns on right after the opening with "<caption>"', () => {
          const firstSpotlight = run.frames.find((frame) => frame.spotlight);
          expect(firstSpotlight).toBeDefined();
          expect(firstSpotlight!.time).toBeLessThanOrEqual(4.5);
          expect(run.record.captions.some((caption) => caption.text === variables.caption)).toBe(
            true,
          );
        });
        And('the lens makes at least one fake-out pass before anyone is found', () => {
          const firstPop = run.cues.find((cue) => cue.cue === 'pop')?.time ?? Infinity;
          expect(
            run.cues.some(
              (cue) => (cue.cue === 'sniff' || cue.cue === 'creak') && cue.time < firstPop - 0.1,
            ),
          ).toBe(true);
        });
        And('a hider sneaks to the spare piece of furniture while the seeker looks away', () => {
          expect(run.frames.some((frame) => frame.props.length === count + 1)).toBe(true);
          const success = run.record.captions.find((caption) => caption.text.endsWith('made it!'));
          expect(success).toBeDefined();
          const name = success!.text.slice(0, -' made it!'.length);
          expect(
            run.frames.some(
              (frame) => frame.time >= success!.from && frame.people.get(name)?.hidden === true,
            ),
          ).toBe(true);
          expect(hasCrossing(run)).toBe(true);
        });
        And('the show lasts between {int} and {int} seconds', (_, min: number, max: number) => {
          expect(run.record.duration).toBeGreaterThanOrEqual(min);
          expect(run.record.duration).toBeLessThanOrEqual(max);
        });
      },
    );
  });

  Rule('No two visible name tags or speech bubbles overlap', ({ RuleScenario }) => {
    RuleScenario(
      'Twelve long names and speech bubbles stay clear',
      ({ Given, When, Then, And }) => {
        let run: Watched;
        Given('12 people with long names', () => undefined);
        When('the show runs', async () => {
          run = await watch(LONG_NAMES, LONG_NAMES[5]!, 5);
        });

        Then(
          'every visible name tag is at least 22 pixels and no two visible name tags overlap',
          () => {
            const minimum = stagePx('--size-stage-tag-min');
            expect(run.frames.some((frame) => frame.tags.length === 12)).toBe(true);
            for (const frame of run.frames) {
              for (let index = 0; index < frame.tags.length; index++) {
                const tag = frame.tags[index]!;
                expect(tag.size).toBeGreaterThanOrEqual(minimum);
                expect(tag.box.left).toBeGreaterThanOrEqual(0);
                expect(tag.box.right).toBeLessThanOrEqual(STAGE.width);
                expect(tag.box.top).toBeGreaterThanOrEqual(0);
                expect(tag.box.bottom).toBeLessThanOrEqual(STAGE.height);
                for (let other = index + 1; other < frame.tags.length; other++) {
                  expect(
                    overlaps(tag.box, frame.tags[other]!.box),
                    `${tag.name} overlaps another tag at ${frame.time.toFixed(2)}s`,
                  ).toBe(false);
                }
              }
            }
          },
        );

        And('no visible speech bubble covers a visible name tag or a face that shows', () => {
          expect(run.frames.some((frame) => frame.bubbles.length > 0)).toBe(true);
          for (const frame of run.frames) {
            for (const bubble of frame.bubbles) {
              expect(bubble.box.left).toBeGreaterThanOrEqual(0);
              expect(bubble.box.right).toBeLessThanOrEqual(STAGE.width);
              expect(bubble.box.top).toBeGreaterThanOrEqual(0);
              expect(bubble.box.bottom).toBeLessThanOrEqual(STAGE.height);
              for (const tag of frame.tags) {
                expect(
                  overlaps(bubble.box, tag.box),
                  `bubble "${bubble.text}" overlaps ${tag.name}'s tag at ${frame.time.toFixed(2)}s`,
                ).toBe(false);
              }
              for (const [name, person] of frame.people) {
                if (person.hidden || !Number.isFinite(person.size)) continue;
                expect(
                  overlaps(bubble.box, faceBox(person)),
                  `bubble "${bubble.text}" covers ${name}'s visible face at ${frame.time.toFixed(2)}s`,
                ).toBe(false);
              }
            }
          }
        });
      },
    );

    RuleScenario(
      'Reduced motion keeps the story without idle bobbing',
      ({ Given, When, Then, And }) => {
        let reduced: Watched;
        let full: Watched;
        const team = SHORT_NAMES.slice(0, 6);
        Given('6 people and reduced motion is on', () => undefined);
        When('the show runs', async () => {
          reduced = await watch(team, team[2]!, 6, true);
          full = await watch(team, team[2]!, 6, false);
        });
        Then('waiting hiders hold still between sweeps', () => {
          const finalThreeAt = reduced.frames.find((frame) => frame.spotlight)?.time ?? 10;
          const window = reduced.frames.filter(
            (frame) => frame.time >= 2.2 && frame.time <= finalThreeAt - 1,
          );
          expect(window.length).toBeGreaterThan(10);
          const still = [...window[0]!.people.keys()].some((name) => {
            const people = window.map((frame) => frame.people.get(name)!);
            if (people.some((person) => !person.hidden)) return false;
            const ys = people.map((person) => person.y);
            return Math.max(...ys) - Math.min(...ys) < 0.5;
          });
          expect(still).toBe(true);
        });
        And(
          'the captions, the finds and the times the seeker looks away are the same as with full motion',
          () => {
            expect(reduced.record.captions.map((caption) => caption.text)).toEqual(
              full.record.captions.map((caption) => caption.text),
            );
            expect(reduced.cues.filter((cue) => cue.cue === 'pop').map((cue) => cue.time)).toEqual(
              full.cues.filter((cue) => cue.cue === 'pop').map((cue) => cue.time),
            );
            expect(awaySpans(reduced)).toEqual(awaySpans(full));
          },
        );
      },
    );
  });
});
