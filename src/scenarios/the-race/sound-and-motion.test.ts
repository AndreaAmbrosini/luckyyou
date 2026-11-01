import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { speechBox, type Box, type Note } from '../../scenario-kit';
import { pitchOf } from '../../scenario-kit/music';
import { describeSpec } from '../../scenario-kit/testing';
import { faceAt, lane, tagBox } from './layout';
import { raceMusic } from './music';
import { CREATURE_SPEC } from './creature';
import { CREATURES, isCreature, MOUNTS, RIDER, type Kind, type Mount } from './parts';
import { type Plan } from './plan';
import {
  names,
  type Frame,
  type Watched,
  kindOf,
  captions,
  saying,
  raised,
  overlap,
  shared,
  COURSE_NAMES,
  plansOn,
  type Heard,
  listen,
  plansByEnding,
} from './watching';

describeSpec(await loadFeature('./sound-and-motion.feature'), ({ Rule }) => {
  Rule('Its music follows the race', ({ RuleScenario }) => {
    /** A show second just before `time`. */
    const before = (time: number) => time - 1e-6;
    let heard: Promise<Heard> | undefined;
    /** One run at 8 people, Anna unlucky, shared by the scenarios that watch the show. */
    const heardRace = () => (heard ??= listen(names(8), 'Anna'));
    const lead = (notes: readonly Note[]) => notes.filter((note) => note.voice === 'lead');

    RuleScenario('A drum roll, then the galop from "Go!"', ({ When, Then, And }) => {
      let race: Heard;
      When('the show runs with music on', async () => {
        race = await heardRace();
        expect(race.record.outcome).toBe('finished');
      });
      Then(
        `a snare roll swells under "On your marks…" and leads into the galop's first bar on "Go!"`,
        () => {
          const { times } = race.plan;
          const roll = race.notes.filter((note) => note.at < -1);
          expect(roll.length).toBeGreaterThan(8);
          expect(new Set(roll.map((note) => note.voice))).toEqual(new Set(['snare']));
          roll.forEach((note, i) => {
            if (i > 0) expect(note.level!).toBeGreaterThan(roll[i - 1]!.level!);
          });
          // The roll, then a pickup into the first bar, all under "On your marks…".
          const marks = race.record.captions.find((each) => each.text === 'On your marks…')!;
          const [first] = race.moves;
          expect(first!.time).toBeLessThanOrEqual(marks.to);
          expect(first!.beat).toBeLessThanOrEqual(roll[0]!.at);
          expect(lead(race.notes.filter((note) => note.at < 0)).map((note) => note.at)).toEqual([
            -1, -0.5,
          ]);
          // On "Go!" the song is at the first bar's first beat.
          const go = race.record.captions.find((each) => each.text === 'Go!')!;
          expect(go.from).toBeCloseTo(times.go, 1);
          expect(raceMusic(race.plan).at(times.go).beat).toBeCloseTo(0, 9);
          expect(race.notes.filter((note) => note.at === 0).map((note) => note.voice)).toEqual(
            expect.arrayContaining(['lead', 'bass', 'kick']),
          );
        },
      );
      And(
        'the galop plays at 4.2 to 4.6 beats a second, 4 beats a bar, until "Final stretch!"',
        () => {
          const [least, most, bar] = [4.2, 4.6, 4];
          const { times } = race.plan;
          const stretchAt = raceMusic(race.plan).at(times.stretch).beat;
          const galop = race.moves.filter((move) => move.beat > 0 && move.beat < stretchAt - 1);
          expect(galop.length).toBeGreaterThan(100);
          const { speed } = galop[0]!;
          for (const move of galop) expect(move.speed).toBe(speed);
          expect(speed).toBeGreaterThanOrEqual(least);
          expect(speed).toBeLessThanOrEqual(most);
          // Bass and kicks on a bar's first and third beats, snares on the others.
          const inGalop = race.notes.filter((note) => note.at >= 0 && note.at < stretchAt);
          const beatsOf = (voice: string) =>
            new Set(inGalop.filter((note) => note.voice === voice).map((note) => note.at % bar));
          expect(beatsOf('bass')).toEqual(new Set([0, 2]));
          expect(beatsOf('kick')).toEqual(new Set([0, 2]));
          expect(beatsOf('snare')).toEqual(new Set([1, 3]));
          // The galop's tune stops at the stretch.
          const tune = lead(inGalop);
          expect(Math.max(...tune.map((note) => note.at + note.beats))).toBeLessThanOrEqual(
            stretchAt,
          );
        },
      );
    });

    RuleScenario('The final stretch starts on a bar', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at every head count from 2 to 8, with each ending', () => {
        runs = Array.from({ length: 7 }, (_, i) => plansByEnding(i + 2)).flat();
      });
      Then('"Final stretch!" comes on the first beat of a bar', () => {
        for (const plan of runs) {
          // The galop itself gets there: it is fitted to whole bars.
          const { beat } = raceMusic(plan).at(before(plan.times.stretch));
          const label = `${plan.setOff.length} people, ${plan.ending}`;
          expect(beat / 4 - Math.round(beat / 4), label).toBeCloseTo(0, 4);
          expect(beat, label).toBeGreaterThan(4);
        }
      });
    });

    RuleScenario(
      'The final stretch is faster, and leaves the low end to the heartbeat',
      ({ When, Then, And }) => {
        let runs: Plan[];
        When('"Final stretch!" appears', () => {
          runs = [2, 5, 8].flatMap(plansByEnding);
        });
        Then("the galop's minor strain plays, four bars in the stretch's time", () => {
          for (const plan of runs) {
            const { times } = plan;
            const score = raceMusic(plan);
            const start = score.at(times.stretch);
            expect(start.speed).toBeGreaterThan(score.at(times.go).speed);
            // Four bars, from "Final stretch!" to the slow moment.
            expect(score.at(before(times.slow)).beat - start.beat).toBeCloseTo(16, 4);
            const strain = score.notes.filter(
              (note) => note.at >= start.beat && note.at < start.beat + 16,
            );
            // In A minor: its bass on A and E, its tune ending on A.
            const bass = strain.filter((note) => note.voice === 'bass').map((note) => note.pitch);
            expect(new Set(bass)).toEqual(new Set([pitchOf('A2'), pitchOf('E3')]));
            expect(lead(strain).at(-1)!.pitch).toBe(pitchOf('A4'));
          }
        });
        And('no kick drum plays until the line', () => {
          for (const plan of runs) {
            const score = raceMusic(plan);
            const stretchAt = score.at(plan.times.stretch).beat;
            const kicks = score.notes.filter(
              (note) => note.voice === 'kick' && note.at >= stretchAt,
            );
            expect(kicks).toEqual([]);
          }
        });
      },
    );

    RuleScenario('The slow last moment slows the music too', ({ When, Then }) => {
      let runs: Plan[];
      When('the slow moment starts', () => {
        runs = Array.from({ length: 7 }, (_, i) => plansByEnding(i + 2)).flat();
      });
      Then(
        "the music plays a run down, an octave lower, at a quarter of the stretch's speed, until the line",
        () => {
          for (const plan of runs) {
            const { times } = plan;
            const score = raceMusic(plan);
            const slow = score.at(times.slow);
            const label = `${plan.setOff.length} people, ${plan.ending}`;
            expect(slow.speed / score.at(times.stretch).speed, label).toBeCloseTo(0.25, 2);
            const run = lead(score.notes.filter((note) => note.at >= slow.beat));
            const pitches = run.map((note) => note.pitch!);
            pitches.forEach((pitch, i) => i > 0 && expect(pitch).toBeLessThan(pitches[i - 1]!));
            // The galop's own run down, an octave up.
            const galop = lead(score.notes.filter((note) => note.at < slow.beat))
              .map((note) => note.pitch!)
              .join(' ');
            expect(galop).toContain(pitches.map((pitch) => pitch + 12).join(' '));
            // Its last note ends at the line.
            const end = Math.max(...run.map((note) => note.at + note.beats));
            expect(score.at(before(times.finish)).beat, label).toBeCloseTo(end, 4);
          }
        },
      );
    });

    RuleScenario('Silence from the line to the fanfare', ({ Given, When, Then, And }) => {
      let race: Heard;
      Given('the unlucky person is {string}', async (_, name: string) => {
        race = await heardRace();
        expect(race.record.captions.at(-1)!.text).toBe(`${name} wins!`);
      });
      When('the slow last moment ends at the line', () => {
        expect(race.moves.at(-1)!.time).toBeGreaterThan(race.plan.times.finish);
      });
      Then('the music stops', () => {
        const { times } = race.plan;
        const atLine = raceMusic(race.plan).at(before(times.finish)).beat;
        const last = Math.max(...race.notes.map((note) => note.at + note.beats));
        expect(last).toBeLessThanOrEqual(atLine + 1e-4);
        const atTheLine = race.moves.filter((move) => move.beat >= atLine - 1e-6);
        expect(atTheLine.length).toBeGreaterThan(30);
        for (const move of atTheLine) expect(move.speed).toBe(0);
      });
      And('the fanfare plays with {string}, as before', (_, text: string) => {
        const win = race.record.captions.find((each) => each.text === text)!;
        const fanfare = race.cues.find((each) => each.cue === 'fanfare')!;
        expect(fanfare.time).toBe(win.from);
        expect(win.from).toBeGreaterThan(race.plan.times.finish);
      });
    });

    const pitchesOf = (from: readonly Note[]) => from.map((note) => note.pitch!);
    const tuneOf = (text: string) => text.split(' ').map(pitchOf);

    /**
     * What every tune does on the galop's beats: a `roll` that swells under
     * "On your marks…" and a run up into "Go!", a faster strain from "Final
     * stretch!", a run down at a quarter of the speed in the slow moment, and
     * silence from the line to the fanfare. Returns the lead of each part.
     */
    const onTheGalopsBeats = ({ plan, notes, moves, record, cues }: Heard, roll: Note['voice']) => {
      const { times } = plan;
      const score = raceMusic(plan);
      // The song is where the galop's would be, at every frame.
      const galop = raceMusic({ ...plan, course: 'field' });
      for (const { time } of moves) expect(score.at(time)).toEqual(galop.at(time));
      const stretchAt = score.at(times.stretch).beat;
      const slowAt = score.at(times.slow).beat;
      const atLine = score.at(before(times.finish)).beat;

      const marks = record.captions.find((each) => each.text === 'On your marks…')!;
      expect(moves[0]!.time).toBeLessThanOrEqual(marks.to);
      const rolled = notes.filter((note) => note.at < 0 && note.voice === roll);
      expect(rolled.length).toBeGreaterThan(8);
      rolled.forEach((note, i) => {
        if (i > 0) expect(note.level!).toBeGreaterThan(rolled[i - 1]!.level!);
      });
      const runUp = pitchesOf(lead(notes.filter((note) => note.at < 0)));
      runUp.forEach((pitch, i) => i > 0 && expect(pitch).toBeGreaterThan(runUp[i - 1]!));
      expect(score.at(times.go).beat).toBeCloseTo(0, 9);

      expect(score.at(times.stretch).speed).toBeGreaterThan(score.at(times.go).speed);
      expect(score.at(times.slow).speed / score.at(times.stretch).speed).toBeCloseTo(0.25, 2);
      const run = lead(notes.filter((note) => note.at >= slowAt));
      expect(run.length).toBeGreaterThan(2);
      pitchesOf(run).forEach((pitch, i) => i > 0 && expect(pitch).toBeLessThan(run[i - 1]!.pitch!));

      const last = Math.max(...notes.map((note) => note.at + note.beats));
      expect(last).toBeLessThanOrEqual(atLine + 1e-4);
      for (const move of moves.filter((each) => each.time >= times.finish)) {
        expect(move.speed).toBe(0);
      }
      const win = record.captions.find((each) => each.text === 'Anna wins!')!;
      expect(cues.find((each) => each.cue === 'fanfare')!.time).toBe(win.from);

      return {
        stretchAt,
        racing: lead(notes.filter((note) => note.at >= 0 && note.at < stretchAt)),
        stretch: lead(notes.filter((note) => note.at >= stretchAt && note.at < slowAt)),
        stretchBass: notes.filter(
          (note) => note.voice === 'bass' && note.at >= stretchAt && note.at < slowAt,
        ),
      };
    };

    RuleScenario('Jingle Bells at Christmas, the galop elsewhere', ({ When, Then, And }) => {
      let race: Heard;
      When('the show runs on Christmas with music on', async () => {
        race = await listen(names(8), 'Anna', 1, 'christmas');
        expect(race.record.outcome).toBe('finished');
      });
      Then(
        `Jingle Bells plays instead of the galop, with sleigh bells, on the galop's beats: a roll under "On your marks…", the chorus from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare`,
        () => {
          const { racing, stretch, stretchAt } = onTheGalopsBeats(race, 'bells');
          // The chorus from "Go!", with sleigh bells on every beat until the stretch.
          expect(pitchesOf(racing).slice(0, 11)).toEqual(
            tuneOf('E5 E5 E5 E5 E5 E5 E5 G5 C5 D5 E5'),
          );
          const bells = race.notes.filter((note) => note.voice === 'bells' && note.at >= 0);
          for (let beat = 0; beat < stretchAt; beat++) {
            expect(bells.some((note) => note.at === beat)).toBe(true);
          }
          // The verse in the stretch.
          expect(stretch[0]!.at).toBe(stretchAt);
          expect(pitchesOf(stretch).slice(0, 4)).toEqual(tuneOf('G4 E5 D5 C5'));
        },
      );
      And('the sports field, the office, under the sea and the Moon keep the galop', () => {
        for (const plan of plansOn(names(8), 'Anna', 'field', 3)) {
          const galop = raceMusic(plan);
          // The galop's first bar, after its pickup.
          const tell = lead(galop.notes.filter((note) => note.at >= 0));
          expect(pitchesOf(tell).slice(0, 8)).toEqual(tuneOf('G4 G4 G4 G4 G4 C5 D5 E5'));
          expect(galop.notes.some((note) => note.voice === 'bells')).toBe(false);
          for (const [name, course] of Object.entries(COURSE_NAMES)) {
            expect(raceMusic({ ...plan, course }).notes, name).toEqual(galop.notes);
          }
        }
      });
    });

    RuleScenario("Vivaldi's Autumn on Autumn", ({ When, Then }) => {
      let race: Heard;
      When('the show runs on Autumn with music on', async () => {
        race = await listen(names(8), 'Anna', 1, 'autumn');
        expect(race.record.outcome).toBe('finished');
      });
      Then(
        `the opening of Autumn from Vivaldi's The Four Seasons plays instead of the galop, on the galop's beats: a roll under "On your marks…", its first theme from "Go!", a faster strain from "Final stretch!", a run down at a quarter of the speed in the slow moment, and silence from the line to the fanfare`,
        () => {
          const { racing, stretch, stretchBass, stretchAt } = onTheGalopsBeats(race, 'snare');
          // Its first theme from "Go!": Vivaldi's first bar, down a fourth from F to C...
          const fromF = (text: string) => tuneOf(text).map((pitch) => pitch - 5);
          const opening = fromF('A5 A5 A5 Bb5 A5 A5 Bb5');
          expect(pitchesOf(racing).slice(0, 7)).toEqual(opening);
          // ...and its echo, an octave lower, three bars on.
          const echo = racing.filter((note) => note.at >= 12 && note.at < 16);
          expect(pitchesOf(echo)).toEqual(opening.map((pitch) => pitch - 12));
          // The stretch: the same theme in A minor, from its first beat to a close on A.
          expect(stretch[0]!.at).toBe(stretchAt);
          expect(pitchesOf(stretch).slice(0, 7)).toEqual(opening);
          expect(stretchBass[0]!.pitch).toBe(pitchOf('A2'));
          expect(stretch.at(-1)!.pitch).toBe(pitchOf('A4'));
        },
      );
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the race, a thing at a time', ({ Given, When, Then }) => {
      let watched: Watched;
      Given(
        "{int} people, the unlucky person is {string}, Ben's snail and Carla's duck burst ahead, Carla's duck stops, and it ends in a photo finish",
        () => undefined,
      );
      When('the show runs', async () => {
        watched = await shared.story();
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const said = captions(watched);
        let from = 0;
        for (const { caption } of table) {
          const at = said.indexOf(caption, from);
          expect(at, caption).toBeGreaterThanOrEqual(from);
          from = at + 1;
        }
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let runs: Watched[];
      When('the show runs', async () => {
        runs = [await shared.eight(), await shared.story(), await shared.ending('brake', 'Ben')];
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const { record } of runs) {
          for (const { text, from, to } of record.captions) {
            expect(to - from, text).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });

    RuleScenario('Racers are drawn as big as the lanes allow', ({ When, Then, And }) => {
      const heads = (count: number) =>
        Array.from({ length: count }, (_, i) => RIDER.size * lane(i, count).k);
      let eight: Watched;
      When('the show runs at 8 and at 4 people', async () => {
        eight = await shared.eight();
      });
      Then(
        'at 8 people, heads are {int} pixels or more and name tags {int} pixels or more, on the 1280 by 720 stage',
        (_, head: number, tag: number) => {
          expect(Math.min(...heads(8))).toBeGreaterThanOrEqual(head);
          for (const frame of eight.frames) {
            expect(Object.keys(frame.tagSizes)).toHaveLength(8);
            for (const size of Object.values(frame.tagSizes)) {
              expect(size).toBeGreaterThanOrEqual(tag);
            }
          }
        },
      );
      And('at 4 people, heads are {int} pixels or more', (_, head: number) => {
        expect(Math.min(...heads(4))).toBeGreaterThanOrEqual(head);
      });
      And("every rider's head sits at the same height in its lane, whatever the mount", () => {
        for (const count of [2, 4, 8]) {
          for (let i = 0; i < count; i++) {
            const tops = MOUNTS.map((mount) => faceAt(mount, lane(i, count), 900).top);
            expect(new Set(tops).size).toBe(1);
          }
        }
      });
    });

    RuleScenario('Name tags sit beside the face', ({ When, Then, And }) => {
      let runs: Watched[];
      /** Each racer's face and tag in each frame. */
      const boxes = (watched: Watched, frame: Frame) =>
        watched.team.map((name, i) => {
          const at = lane(i, watched.team.length);
          const mount = (watched.looks.get(name)!.mount ?? 'snail') as Mount;
          const { nose, lift } = frame.racers[name]!;
          return {
            name,
            face: raised(faceAt(mount, at, nose), lift),
            tag: raised(tagBox(name, mount, at, nose), lift),
          };
        });
      When('the show runs at 8, at 4 and at 2 people, a 15-character name among them', async () => {
        runs = await Promise.all([8, 4, 2].map((count) => shared.long(count)));
        for (const { team } of runs) expect(team).toContain('Annamaria Rossi');
      });
      Then(
        "each name tag sits beside its rider's face, behind it, level with it, and moves with them",
        () => {
          for (const watched of runs) {
            for (const frame of watched.frames) {
              for (const { face, tag } of boxes(watched, frame)) {
                expect(tag.right).toBeLessThanOrEqual(face.left);
                expect(face.left - tag.right).toBeLessThan(6);
                const middle = (tag.top + tag.bottom) / 2;
                expect(middle).toBeGreaterThan(face.top);
                expect(middle).toBeLessThan(face.bottom);
              }
            }
          }
        },
      );
      And('no name tag is ever over another, or over a face', () => {
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const one of drawn) {
              for (const other of drawn) {
                if (one !== other) expect(overlap(one.tag, other.tag), `${frame.time}`).toBe(false);
                expect(overlap(one.tag, other.face), `${one.name}, ${other.name}`).toBe(false);
              }
            }
          }
        }
      });
      And('no speech bubble covers a name tag or a face', () => {
        let bubbles = 0;
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const said of frame.says) {
              bubbles++;
              const box = speechBox(said.text, said);
              for (const { name, face, tag } of drawn) {
                expect(overlap(box, face), `${said.text} on ${name}'s face`).toBe(false);
                expect(overlap(box, tag), `${said.text} on ${name}'s tag`).toBe(false);
              }
            }
          }
        }
        expect(bubbles).toBeGreaterThan(0);
      });
      And('each speech bubble sits by its speaker, touching their face or name tag', () => {
        // Touching: within the gap a bubble keeps from what it sits by.
        const touching = (one: Box, two: Box) =>
          overlap(one, {
            left: two.left - 16,
            right: two.right + 16,
            top: two.top - 16,
            bottom: two.bottom + 16,
          });
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const said of frame.says) {
              const box = speechBox(said.text, said);
              const { face, tag } = drawn.find(({ name }) => name === said.person)!;
              expect(
                touching(box, face) || touching(box, tag),
                `${said.person}: ${said.text}`,
              ).toBe(true);
            }
          }
        }
      });
    });

    RuleScenario('Everyone stays on stage', ({ When, Then }) => {
      let watched: Watched;
      When('the show runs at {int} people', async () => {
        watched = await shared.long(8);
      });
      Then('every racer is on stage from "On your marks…" to the end', () => {
        for (const frame of watched.frames) {
          watched.team.forEach((name, i) => {
            const at = lane(i, 8);
            const mount = watched.looks.get(name)!.mount as Mount;
            const nose = frame.racers[name]!.nose;
            expect(tagBox(name, mount, at, nose).left).toBeGreaterThanOrEqual(0);
            expect(nose).toBeLessThanOrEqual(1280);
          });
        }
      });
    });

    RuleScenario('Riders and creatures side by side', ({ When, Then, And }) => {
      let runs: Watched[];
      const KINDS: readonly Kind[] = [...MOUNTS, ...CREATURES];
      /** Each racer's face and tag in each frame. */
      const boxes = (watched: Watched, frame: Frame) =>
        watched.team.map((name, i) => {
          const at = lane(i, watched.team.length);
          const kind = kindOf(watched, name);
          const { nose, lift } = frame.racers[name]!;
          return {
            name,
            face: raised(faceAt(kind, at, nose), lift),
            tag: raised(tagBox(name, kind, at, nose), lift),
          };
        });
      When(
        'the show runs at 8 and at 2 people, riders and creatures mixed, a 15-character name among them',
        async () => {
          runs = await Promise.all([8, 2].map((count) => shared.mixed(count)));
          for (const watched of runs) {
            expect(watched.team).toContain('Annamaria Rossi');
            const kinds = watched.team.map((name) => isCreature(kindOf(watched, name)));
            expect(new Set(kinds)).toEqual(new Set([true, false]));
          }
        },
      );
      Then("every face, a rider's or a creature's, sits at the same height in its lane", () => {
        for (const count of [2, 4, 8]) {
          for (let i = 0; i < count; i++) {
            const tops = KINDS.map((kind) => faceAt(kind, lane(i, count), 900).top);
            expect(new Set(tops).size).toBe(1);
          }
        }
      });
      And("at 8 people, every creature's face is {int} pixels or more across", (_, px: number) => {
        for (let i = 0; i < 8; i++) {
          for (const kind of CREATURES) {
            const face = faceAt(kind, lane(i, 8), 900);
            expect(face.right - face.left).toBeGreaterThanOrEqual(px);
            // The box is round the creature's own face: its eyes are in it.
            const k = lane(i, 8).k;
            const left = 900 - CREATURE_SPEC[kind].nose * k;
            for (const [x] of CREATURE_SPEC[kind].eyes) {
              expect(left + x * k).toBeGreaterThan(face.left);
              expect(left + x * k).toBeLessThan(face.right);
            }
          }
        }
      });
      And(
        "each name tag sits beside its racer's face, behind it, level with it, and moves with it",
        () => {
          for (const watched of runs) {
            for (const frame of watched.frames) {
              for (const { face, tag } of boxes(watched, frame)) {
                expect(tag.right).toBeLessThanOrEqual(face.left);
                expect(face.left - tag.right).toBeLessThan(6);
                const middle = (tag.top + tag.bottom) / 2;
                expect(middle).toBeGreaterThan(face.top);
                expect(middle).toBeLessThan(face.bottom);
              }
            }
          }
        },
      );
      And('no name tag is ever over another, or over a face', () => {
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const one of drawn) {
              for (const other of drawn) {
                if (one !== other) expect(overlap(one.tag, other.tag), `${frame.time}`).toBe(false);
                expect(overlap(one.tag, other.face), `${one.name}, ${other.name}`).toBe(false);
              }
            }
          }
        }
      });
    });
  });

  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario('With reduced motion, nothing shakes', ({ Given, When, Then, And }) => {
      let still: Watched;
      let chairs: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        still = await shared.story(true);
        chairs = await shared.mount('chair', 'Marco', true);
      });
      Then("there are no speed lines, the duck doesn't tip and the chair doesn't spin", () => {
        for (const frame of [...still.frames, ...chairs.frames]) {
          expect(frame.speedLines).toBe(0);
          for (const racer of Object.values(frame.racers)) {
            expect(racer.rotate).toBe('');
            expect(racer.scale).toBe('');
          }
        }
        // Both stops still happen: the duck's and the chair's.
        expect(still.frames.some((frame) => frame.racers.Carla!.stopped)).toBe(true);
        expect(chairs.frames.some((frame) => frame.racers.Marco!.stopped)).toBe(true);
      });
      And(
        'the slow last moment, the photo and every caption still come, in the same order',
        async () => {
          const moving = await shared.story();
          expect(moving.frames.some((frame) => frame.speedLines > 0)).toBe(true);
          expect(captions(still)).toEqual(captions(moving));
          expect(still.frames.filter((frame) => frame.slow).length).toBe(
            moving.frames.filter((frame) => frame.slow).length,
          );
          expect(still.frames.some((frame) => frame.photo)).toBe(true);
        },
      );
    });

    RuleScenario('With reduced motion, the new rides keep still too', ({ Given, When, Then }) => {
      let rockets: Watched;
      let hoppers: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        rockets = await shared.mount('rocket', 'Carla', true);
        hoppers = await shared.mount('hopper', 'Anna', true);
      });
      Then(
        "the rocket's flame doesn't flicker, and a hopper that stops doesn't bounce on the spot",
        async () => {
          const flames = rockets.frames.flatMap((frame) =>
            Object.values(frame.racers).map((racer) => racer.flame),
          );
          expect(new Set(flames)).toEqual(new Set([1, 2, 'out']));
          const moving = await shared.mount('rocket', 'Carla');
          expect(
            moving.frames.some((frame) =>
              Object.values(frame.racers).some(
                (racer) =>
                  typeof racer.flame === 'number' && racer.flame !== 1 && racer.flame !== 2,
              ),
            ),
          ).toBe(true);
          for (const frame of hoppers.frames) {
            for (const racer of Object.values(frame.racers)) expect(racer.hop).toBe(0);
          }
          // The stop still happens.
          expect(hoppers.frames.some((frame) => frame.racers.Anna!.stopped)).toBe(true);
        },
      );
    });

    RuleScenario('With reduced motion, the creatures keep still too', ({ Given, When, Then }) => {
      let monsters: Watched;
      let villains: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        monsters = await shared.mount('monster', 'Marco', true);
        villains = await shared.mount('villain', 'Hana', true);
      });
      Then(
        "the monster doesn't hop with its hiccups, and the villain doesn't turn in its cape",
        () => {
          for (const frame of [...monsters.frames, ...villains.frames]) {
            for (const racer of Object.values(frame.racers)) {
              expect(racer.hop).toBe(0);
              expect(racer.scale).toBe('');
              expect(racer.flail).toBe(0);
            }
          }
          // The hiccups and the cape still come.
          expect(monsters.frames.some((frame) => saying(frame, 'Marco', 'Hic!'))).toBe(true);
          expect(villains.frames.some((frame) => frame.racers.Hana!.props === 'wrap')).toBe(true);
        },
      );
    });

    RuleScenario(
      'With reduced motion, the things on legs keep still too',
      ({ Given, When, Then }) => {
        const watched: Record<string, Watched> = {};
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          for (const [name, thing] of [
            ['Carla', 'printer'],
            ['Dario', 'sticky'],
            ['Femi', 'icecream'],
          ] as const) {
            watched[name] = await shared.thing(thing, name, true);
          }
        });
        Then(
          "the printer's light doesn't blink, the sticky note doesn't flutter and the ice cream doesn't drip",
          () => {
            const seen = (name: string) =>
              watched[name]!.frames.map((frame) => frame.racers[name]!);
            const props = (name: string) =>
              new Set(seen(name).flatMap((racer) => racer.props.split(' ')));
            for (const racer of seen('Carla')) expect(racer.light).toBe('on');
            for (const racer of seen('Dario')) expect(racer.rotate).toBe('');
            for (const racer of seen('Femi')) expect(racer.drip).toBe(0);
            // Each still happens: the jam, the wind, the puddle without drips.
            expect(props('Carla')).toContain('jam');
            expect(props('Dario')).toContain('wind');
            expect(props('Femi')).toContain('puddle');
            expect(props('Femi')).not.toContain('drips');
          },
        );
      },
    );

    RuleScenario(
      'With reduced motion, the new animals and spooky creatures keep still too',
      ({ Given, When, Then }) => {
        const watched: Record<string, Watched> = {};
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          for (const [name, kind] of [
            ['Ivo', 'octopus'],
            ['Priya', 'ghost'],
            ['Carla', 'yeti'],
          ] as const) {
            watched[name] = await shared.thing(kind, name, true);
          }
        });
        Then(
          "the octopus's legs don't whirl, the ghost doesn't jump and the yeti doesn't sweep its arms",
          () => {
            const seen = (name: string) =>
              watched[name]!.frames.map((frame) => frame.racers[name]!);
            const props = (name: string) =>
              new Set(seen(name).flatMap((racer) => racer.props.split(' ')));
            for (const racer of seen('Ivo')) expect(racer.whirl).toBe(0);
            for (const racer of seen('Priya')) expect([racer.hop, racer.rotate]).toEqual([0, '']);
            for (const racer of seen('Carla')) expect([racer.sweep, racer.rotate]).toEqual([0, '']);
            // Each still happens: the knot, the fright, the snow.
            expect(props('Ivo')).toContain('knot');
            expect(props('Priya')).toContain('fright');
            expect(props('Carla')).toContain('snow');
          },
        );
      },
    );
  });
});
