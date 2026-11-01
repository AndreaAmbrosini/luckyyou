import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { describeSpec } from '../../scenario-kit/testing';
import { lane } from './layout';
import { CREATURE_SPEC } from './creature';
import { type Creature, type Mount } from './parts';
import { BURST, leaderAt, orderAt, spacing, STOP } from './plan';
import {
  THING_NAMES,
  NEW_NAMES,
  STEP,
  type Watched,
  captions,
  between,
  saying,
  shared,
} from './watching';

describeSpec(await loadFeature('./one-thing-at-a-time.feature'), ({ Rule }) => {
  Rule('One thing at a time', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('The start', ({ When, Then, And }) => {
      let watched: Watched;
      When('the show runs', async () => {
        watched = await shared.eight();
      });
      Then(
        'everyone waits at the start line, noses on it, with the caption {string}',
        (_, caption: string) => {
          const { go } = watched.plan.times;
          expect(watched.record.captions[0]!.text).toBe(caption);
          expect(watched.record.captions[0]!.from).toBeLessThanOrEqual(STEP);
          for (const frame of watched.frames.filter((each) => each.time <= go)) {
            for (const racer of Object.values(frame.racers)) expect(racer.nose).toBe(420);
            expect(frame.camera).toBe(0);
          }
        },
      );
      And(
        'at {string} they spring off together and the camera starts to follow the leaders',
        (_, caption: string) => {
          const { go } = watched.plan.times;
          expect(watched.record.captions[1]).toMatchObject({ text: caption });
          expect(watched.record.captions[1]!.from).toBeCloseTo(go, 1);
          const off = watched.frames.find((frame) => frame.time > go + 0.25)!;
          for (const racer of Object.values(off.racers)) expect(racer.nose).toBeGreaterThan(440);
          expect(off.camera).toBeGreaterThan(0);
          const later = watched.frames.find((frame) => frame.time > go + 2)!;
          expect(later.camera - off.camera).toBeGreaterThan(200);
        },
      );
    });

    RuleScenarioOutline(
      'With <count> people there are <events> events before the final stretch',
      ({ Given, When, Then, And }, { count, events }) => {
        let watched: Watched;
        Given('<count> people', () => undefined);
        When('the show runs', async () => {
          watched = await shared.count(Number(count));
        });
        Then(
          '<events> things happen before "Final stretch!", one at a time, each with a caption of its own',
          () => {
            const said = captions(watched);
            const between = said.slice(said.indexOf('Go!') + 1, said.indexOf('Final stretch!'));
            expect(between).toHaveLength(Number(events));
            expect(watched.plan.events).toHaveLength(Number(events));
            expect(new Set(between).size).toBe(between.length);
            watched.plan.events.forEach((event, i) => {
              expect(between[i]).toContain(event.subject);
              const shown = watched.record.captions.find((each) => each.text === between[i])!;
              expect(shown.from).toBeCloseTo(event.at, 0);
            });
          },
        );
        And('each starts 2.5 seconds or more after the one before', () => {
          const times = watched.plan.events.map((event) => event.at);
          times.slice(1).forEach((time, i) => expect(time - times[i]!).toBeGreaterThanOrEqual(2.5));
        });
      },
    );

    RuleScenarioOutline('A <mount> bursts ahead', ({ When, Then, And }, { mount, name, burst }) => {
      let watched: Watched;
      When("someone's <mount> bursts ahead", async () => {
        watched = await shared.mount(mount as Mount, name);
      });
      Then(`the caption is "<name>'s <mount> <burst>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${mount} ${burst}!`);
        expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
      });
      And('it shoots into the lead, its rider shouting "Nooo!"', () => {
        const { at } = watched.plan.events[0]!;
        expect(leaderAt(watched.plan, at)).not.toBe(name);
        expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
        const shouting = watched.frames.filter((frame) =>
          frame.says.some((said) => said.person === name && said.text === 'Nooo!'),
        );
        expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
        expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
      });
    });

    RuleScenarioOutline('A <mount> stops', ({ When, Then, And }, { mount, name, stop }) => {
      let watched: Watched;
      /** The stopped racer, frame by frame from the stop to the next event. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <mount> stops", async () => {
        watched = await shared.mount(mount as Mount, name);
      });
      Then(`the caption is "<name>'s <mount> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${mount} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        if (mount === 'snail') {
          expect(stopped.filter((frame) => frame.since > 0.3).every((f) => f.racer.leaf)).toBe(
            true,
          );
        }
        if (mount === 'duck') {
          const tilts = stopped.map((frame) => parseFloat(frame.racer.rotate || '0'));
          expect(Math.min(...tilts)).toBeLessThan(-15);
          expect(tilts.at(-1)).toBe(0);
        }
        if (mount === 'chair') {
          const flips = stopped
            .map((frame) => Math.sign(parseFloat(frame.racer.scale || '1')))
            .filter((sign, i, all) => i > 0 && sign !== all[i - 1]);
          expect(flips).toHaveLength(4);
        }
        if (mount === 'caterpillar') {
          const dozing = stopped.filter((frame) =>
            frame.says.some((said) => said.person === name && said.text === 'Zzz…'),
          );
          expect(dozing.length * STEP).toBeGreaterThanOrEqual(1);
          expect(stopped.every((frame) => frame.racer.gait === 'off')).toBe(true);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('its rider waves, says "Phew!", and the mount sets off again further back', () => {
        const frames = during();
        expect(frames.some((frame) => frame.racer.stopped && frame.racer.pose === 'wave')).toBe(
          true,
        );
        const phew = frames.filter((frame) =>
          frame.says.some((said) => said.person === name && said.text === 'Phew!'),
        );
        expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenarioOutline(
      'A new <ride> bursts ahead',
      ({ When, Then, And }, { ride, name, burst }) => {
        let watched: Watched;
        /** The burster, frame by frame from just before the burst to its end. */
        const bursting = () => {
          const { at } = watched.plan.events[0]!;
          return watched.frames
            .filter((frame) => frame.time >= at && frame.time < at + BURST.seconds)
            .map((frame) => frame.racers[name]!);
        };
        When("someone's <ride> bursts ahead", async () => {
          watched = await shared.mount(ride as Mount, name);
        });
        Then(`the caption is "<name>'s <ride> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${ride} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, its rider shouting "Nooo!"', () => {
          const during = bursting();
          const before = watched.frames.find(
            (frame) => frame.time < watched.plan.events[0]!.at && frame.time > 1,
          )!.racers[name]!;
          if (ride === 'hopper') {
            const hops = during.map((racer) => racer.hop);
            expect(Math.max(...hops)).toBeGreaterThan(35);
            // Big bounces: up, down to the ground, and up again.
            const landed = hops.findIndex(
              (hop, i) => i > hops.indexOf(Math.max(...hops)) && hop < 5,
            );
            expect(landed).toBeGreaterThan(0);
            expect(Math.max(...hops.slice(landed))).toBeGreaterThan(35);
          }
          if (ride === 'ostrich') {
            expect(before.stride).toBe(1);
            const strides = during.map((racer) => racer.stride);
            // Wider than it walks, the legs swinging from one side to the other.
            expect(Math.max(...strides)).toBeGreaterThan(1.5);
            expect(Math.min(...strides)).toBeLessThan(0);
          }
          if (ride === 'rocket') {
            expect(before.flame).toBeGreaterThan(0.8);
            expect(before.flame).toBeLessThan(1.2);
            expect(during.every((racer) => racer.flame === 2)).toBe(true);
          }
          if (ride === 'sandwich') {
            expect(before.props).not.toContain('steam');
            expect(during.every((racer) => racer.props.includes('steam'))).toBe(true);
          }
          const { at } = watched.plan.events[0]!;
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + BURST.seconds)).toBe(name);
          expect(
            watched.frames.some((frame) => frame.time < at + 0.5 && saying(frame, name, 'Nooo!')),
          ).toBe(true);
        });
      },
    );

    RuleScenarioOutline('A new <ride> stops', ({ When, Then, And }, { ride, name, stop }) => {
      let watched: Watched;
      /** The stopped racer, frame by frame from the stop to the next event. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <ride> stops", async () => {
        watched = await shared.mount(ride as Mount, name);
      });
      Then(`the caption is "<name>'s <ride> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${ride} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        if (ride === 'hopper') {
          expect(Math.max(...stopped.map((frame) => frame.racer.hop))).toBeGreaterThan(20);
          // On the spot: never forward on screen, while the camera goes on.
          stopped.slice(1).forEach((frame, i) => {
            expect(frame.racer.nose).toBeLessThanOrEqual(stopped[i]!.racer.nose + 1e-6);
          });
        }
        if (ride === 'ostrich') {
          const laid = stopped.filter((frame) => frame.racer.props.includes('egg'));
          expect(laid.length).toBeGreaterThan(10);
          expect(stopped.some((frame) => frame.racer.look === 'back')).toBe(true);
          expect(stopped.every((frame) => frame.racer.stride === 1)).toBe(true);
        }
        if (ride === 'rocket') {
          expect(stopped.every((frame) => frame.racer.flame === 'out')).toBe(true);
          expect(stopped[0]!.racer.props).toContain('smoke');
          expect(stopped.at(-1)!.racer.props).not.toContain('smoke');
        }
        if (ride === 'sandwich') {
          const dropped = stopped.filter((frame) => frame.racer.props.includes('pickle'));
          expect(dropped.length).toBeGreaterThan(10);
          // Picked up again before it sets off.
          expect(stopped.at(-1)!.racer.props).not.toContain('pickle');
          expect(stopped.every((frame) => frame.racer.gait === 'off')).toBe(true);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('its rider waves, says "Phew!", and the mount sets off again further back', () => {
        const frames = during();
        expect(frames.some((frame) => frame.racer.stopped && frame.racer.pose === 'wave')).toBe(
          true,
        );
        expect(frames.some((frame) => saying(frame, name, 'Phew!'))).toBe(true);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        expect(off.racer.props).toBe('');
        if (ride === 'rocket') expect(off.racer.flame).not.toBe('out');
      });
    });

    RuleScenarioOutline(
      'A <creature> bursts ahead',
      ({ When, Then, And }, { creature: kind, name, burst }) => {
        let watched: Watched;
        When("someone's <creature> bursts ahead", async () => {
          watched = await shared.mount(kind as Creature, name);
        });
        Then(`the caption is "<name>'s <creature> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${kind} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('it shoots into the lead, shouting "Nooo!"', () => {
          const { at } = watched.plan.events[0]!;
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
          expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
        });
      },
    );

    RuleScenarioOutline(
      'A <creature> stops',
      ({ When, Then, And }, { creature: kind, name, stop }) => {
        let watched: Watched;
        /** The stopped creature, frame by frame from the stop to the next event. */
        const during = () => {
          const { at } = watched.plan.events[1]!;
          return watched.frames
            .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
            .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
        };
        When("someone's <creature> stops", async () => {
          watched = await shared.mount(kind as Creature, name);
        });
        Then(`the caption is "<name>'s <creature> <stop>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${kind} ${stop}!`);
          expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
        });
        And('<what>, and it drops back while the camera goes on', () => {
          const stopped = during().filter((frame) => frame.racer.stopped);
          expect(stopped.length).toBeGreaterThan(10);
          /** How long the stop shows `prop`, in seconds. */
          const showing = (prop: string) =>
            stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
          if (kind === 'zombie') {
            expect(showing('lostShoe')).toBeGreaterThanOrEqual(1);
            expect(Math.max(...stopped.map((frame) => frame.racer.hop))).toBeGreaterThan(8);
          }
          if (kind === 'robot') {
            expect(stopped[0]!.racer.blank).toBe(true);
            expect(stopped.at(-1)!.racer.blank).toBe(false);
          }
          if (kind === 'shark') {
            expect(stopped.filter((frame) => frame.racer.bend > 20).length * STEP).toBeGreaterThan(
              1,
            );
          }
          if (kind === 'astronaut') {
            expect(showing('flag')).toBeGreaterThanOrEqual(1);
            // Planted: it stays where it went in while the astronaut drops back.
            const planted = stopped.filter((frame) => frame.racer.flag !== null);
            const along = planted.map((frame) => {
              const k = lane(watched.team.indexOf(name), watched.team.length).k;
              const left = frame.racer.nose - CREATURE_SPEC.astronaut.nose * k;
              return left + frame.racer.flag! * k + frame.camera;
            });
            expect(Math.max(...along) - Math.min(...along)).toBeLessThan(2);
          }
          if (kind === 'monster') {
            const hics = stopped.filter((frame) => saying(frame, name, 'Hic!'));
            expect(hics.length * STEP).toBeGreaterThanOrEqual(1);
            expect(hics.some((frame) => frame.racer.hop > 8)).toBe(true);
            expect(
              stopped
                .filter((frame) => !saying(frame, name, 'Hic!'))
                .every((f) => f.racer.hop === 0),
            ).toBe(true);
          }
          if (kind === 'villain') {
            expect(showing('wrap')).toBeGreaterThanOrEqual(1);
            const flips = stopped
              .map((frame) => Math.sign(parseFloat(frame.racer.scale || '1')))
              .filter((sign) => sign !== 0)
              .filter((sign, i, all) => i > 0 && sign !== all[i - 1]);
            // Once round: facing back, then forward again.
            expect(flips).toHaveLength(2);
          }
          if (kind === 'alien') expect(showing('question')).toBeGreaterThanOrEqual(1);
          if (kind === 'dinosaur') {
            expect(showing('snack')).toBeGreaterThanOrEqual(1);
            const reaching = stopped.filter((frame) => frame.racer.props.includes('snack'));
            expect(reaching.every((frame) => frame.racer.stretch)).toBe(true);
          }
          const first = stopped[0]!;
          const last = stopped.at(-1)!;
          expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
          expect(last.camera).toBeGreaterThan(first.camera + 300);
        });
        And('it waves, says "Phew!", and sets off again further back', () => {
          const frames = during();
          const waving = frames.filter(
            ({ racer }) =>
              racer.stopped && racer.pose === 'wave' && !racer.stretch && racer.bend === 0,
          );
          expect(waving.length).toBeGreaterThan(0);
          const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
          expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
          const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
          expect(off.racer.stopped).toBe(false);
          expect(off.racer.gait).toBe('on');
          expect(off.racer.props).toBe('');
          const { at } = watched.plan.events[1]!;
          expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
            orderAt(watched.plan, at - 0.01).indexOf(name),
          );
        });
      },
    );

    RuleScenarioOutline('A <thing> bursts ahead', ({ When, Then, And }, { thing, name, burst }) => {
      let watched: Watched;
      When("someone's <thing> bursts ahead", async () => {
        watched = await shared.thing(THING_NAMES[thing]!, name);
      });
      Then(`the caption is "<name>'s <thing> <burst>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${thing} ${burst}!`);
        expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
      });
      And('<what>, and it shoots into the lead, shouting "Nooo!"', () => {
        const { at } = watched.plan.events[0]!;
        const during = between(watched, at, at + BURST.seconds).map((frame) => frame.racers[name]!);
        /** How long the burst shows `prop`, in seconds. */
        const showing = (prop: string) =>
          during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
        const props: Partial<Record<Creature, string>> = {
          mug: 'jets',
          printer: 'stream',
          sticky: 'wind',
          banana: 'skid',
          icecream: 'sprinkles',
          sushi: 'belt',
        };
        const prop = props[THING_NAMES[thing]!]!;
        expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
        const tilts = during.map((racer) => parseFloat(racer.rotate || '0'));
        // A sticky note flutters both ways; a banana skids, tilted back.
        if (thing === 'sticky note') {
          expect(Math.max(...tilts)).toBeGreaterThan(4);
          expect(Math.min(...tilts)).toBeLessThan(-4);
        }
        if (thing === 'banana') expect(Math.min(...tilts)).toBeLessThan(-6);
        // Gone once the burst is over.
        const after = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
        for (const frame of after) expect(frame.racers[name]!.props).not.toContain(prop);
        expect(leaderAt(watched.plan, at)).not.toBe(name);
        expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
        const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
        expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
        expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
      });
    });

    RuleScenarioOutline('A <thing> stops', ({ When, Then, And }, { thing, name, stop }) => {
      let watched: Watched;
      /** The stopped thing, frame by frame from the stop to the end of the run. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at)
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <thing> stops", async () => {
        watched = await shared.thing(THING_NAMES[thing]!, name);
      });
      Then(`the caption is "<name>'s <thing> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${thing} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        const before = stopped.filter((frame) => frame.since < STOP.phew);
        /** How long the stop shows `prop`, in seconds. */
        const showing = (prop: string) =>
          stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
        /** How long the stop is as `test` says, in seconds. */
        const lasting = (test: (frame: (typeof stopped)[number]) => boolean) =>
          stopped.filter(test).length * STEP;
        switch (THING_NAMES[thing]) {
          case 'mug':
            // Tipped forward to peer inside, and no steam: it's empty.
            expect(lasting((frame) => frame.racer.bend > 20)).toBeGreaterThanOrEqual(1);
            expect(before.every((frame) => frame.racer.empty)).toBe(true);
            break;
          case 'printer': {
            expect(showing('jam')).toBeGreaterThanOrEqual(1);
            const lights = new Set(before.map((frame) => frame.racer.light));
            expect(lights).toEqual(new Set(['on', 'off']));
            expect(stopped.at(-1)!.racer.light).toBe('on');
            break;
          }
          case 'sticky':
            // One foot stuck on the patch, tugging back at it.
            expect(showing('patch')).toBeGreaterThanOrEqual(1);
            expect(Math.min(...before.map((frame) => frame.racer.bend))).toBeLessThan(-8);
            break;
          case 'banana': {
            expect(lasting((frame) => frame.racer.splits > 50)).toBeGreaterThanOrEqual(1);
            expect(Math.min(...before.map((frame) => frame.racer.hop))).toBeLessThan(-15);
            // Back up, with a spring.
            const up = stopped.filter((frame) => frame.since >= STOP.phew);
            expect(up.every((frame) => frame.racer.splits === 0)).toBe(true);
            expect(Math.max(...up.map((frame) => frame.racer.hop))).toBeGreaterThan(8);
            break;
          }
          case 'icecream': {
            expect(showing('drips')).toBeGreaterThanOrEqual(1);
            expect(showing('puddle')).toBeGreaterThanOrEqual(1);
            // It droops, then firms up again.
            const drips = before.map((frame) => frame.racer.drip);
            const peak = drips.indexOf(Math.max(...drips));
            expect(drips[peak]).toBeGreaterThan(0.8);
            expect(drips.at(-1)!).toBeLessThan(drips[peak]! - 0.5);
            break;
          }
          case 'sushi':
            expect(showing('wasabi')).toBeGreaterThanOrEqual(1);
            expect(showing('tears')).toBeGreaterThanOrEqual(1);
            expect(showing('steam')).toBeGreaterThanOrEqual(1);
            break;
          default:
            throw new Error(`No stop for a ${thing}`);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('it waves, says "Phew!", and sets off again further back', () => {
        const frames = during();
        const waving = frames.filter(
          ({ racer }) => racer.stopped && racer.pose === 'wave' && racer.bend === 0,
        );
        expect(waving.length).toBeGreaterThan(0);
        const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
        expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        expect(off.racer.props).toBe('');
        expect([off.racer.bend, off.racer.splits, off.racer.drip]).toEqual([0, 0, 0]);
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenarioOutline(
      'A new <creature> bursts ahead',
      ({ When, Then, And }, { creature: called, name, burst }) => {
        const kind = NEW_NAMES[called]!;
        let watched: Watched;
        When("someone's <creature> bursts ahead", async () => {
          watched = await shared.thing(kind, name);
        });
        Then(`the caption is "<name>'s <creature> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, shouting "Nooo!"', () => {
          const { at } = watched.plan.events[0]!;
          const during = between(watched, at, at + BURST.seconds).map(
            (frame) => frame.racers[name]!,
          );
          /** How long the burst shows `prop`, in seconds. */
          const showing = (prop: string) =>
            during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
          const most = (values: number[]) => Math.max(...values);
          const least = (values: number[]) => Math.min(...values);
          const tilts = during.map((racer) => parseFloat(racer.rotate || '0'));
          const props: Partial<Record<Creature, string>> = {
            cat: 'laser',
            penguin: 'ice',
            pigeon: 'chip',
            ghost: 'fright',
            mummy: 'trail',
            yeti: 'skis',
          };
          const prop = props[kind];
          if (prop) expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
          switch (kind) {
            case 'cat':
              // It crouches after the dot.
              expect(most(during.map((racer) => racer.bend))).toBeGreaterThan(8);
              break;
            case 'octopus':
              expect(most(during.map((racer) => racer.whirl))).toBeGreaterThan(15);
              break;
            case 'penguin':
              // Down on its belly, then up again.
              expect(most(tilts)).toBeGreaterThan(60);
              expect(tilts.at(-1)!).toBeLessThan(most(tilts));
              break;
            case 'pigeon':
              // Its head bobs, back and forth.
              expect(most(tilts)).toBeGreaterThan(3);
              expect(least(tilts)).toBeLessThan(-3);
              break;
            case 'ghost':
              // It jumps, and its sheet flaps.
              expect(most(during.map((racer) => racer.hop))).toBeGreaterThan(20);
              expect(most(tilts)).toBeGreaterThan(3);
              expect(least(tilts)).toBeLessThan(-3);
              break;
            case 'gnome':
              // Bent low, in long, low steps.
              expect(least(during.map((racer) => racer.bend))).toBeGreaterThan(10);
              expect(most(during.map((racer) => racer.hop))).toBeGreaterThan(4);
              expect(most(during.map((racer) => racer.hop))).toBeLessThan(10);
              break;
            case 'mummy':
              // Spinning along.
              expect(most(tilts) - least(tilts)).toBeGreaterThan(300);
              break;
            case 'yeti':
              expect(least(during.map((racer) => racer.bend))).toBeGreaterThan(5);
              break;
            default:
              throw new Error(`No burst for a ${called}`);
          }
          // Gone once the burst is over.
          const after = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
          for (const frame of after) {
            const racer = frame.racers[name]!;
            if (prop) expect(racer.props).not.toContain(prop);
            expect([racer.rotate, racer.whirl, racer.bend]).toEqual(['', 0, 0]);
          }
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
          expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
        });
      },
    );

    RuleScenarioOutline(
      'A new <creature> stops',
      ({ When, Then, And }, { creature: called, name, stop }) => {
        const kind = NEW_NAMES[called]!;
        let watched: Watched;
        /** The stopped creature, frame by frame from the stop to the end of the run. */
        const during = () => {
          const { at } = watched.plan.events[1]!;
          return watched.frames
            .filter((frame) => frame.time >= at)
            .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
        };
        When("someone's <creature> stops", async () => {
          watched = await shared.thing(kind, name);
        });
        Then(`the caption is "<name>'s <creature> <stop>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${stop}!`);
          expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
        });
        And('<what>, and it drops back while the camera goes on', () => {
          const stopped = during().filter((frame) => frame.racer.stopped);
          expect(stopped.length).toBeGreaterThan(10);
          const before = stopped.filter((frame) => frame.since < STOP.phew);
          /** How long the stop shows `prop`, in seconds. */
          const showing = (prop: string) =>
            stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
          /** How long the stop is as `test` says, in seconds. */
          const lasting = (test: (frame: (typeof stopped)[number]) => boolean) =>
            stopped.filter(test).length * STEP;
          const tilts = before.map((frame) => parseFloat(frame.racer.rotate || '0'));
          switch (kind) {
            case 'cat':
              // Sitting in the box, its legs out of sight.
              expect(showing('box')).toBeGreaterThanOrEqual(1);
              expect(lasting((frame) => !frame.racer.legs)).toBeGreaterThanOrEqual(1);
              break;
            case 'octopus': {
              const knotted = stopped.filter((frame) => frame.racer.props.includes('knot'));
              expect(knotted.length * STEP).toBeGreaterThanOrEqual(0.8);
              expect(knotted.every((frame) => !frame.racer.legs)).toBe(true);
              // Then it whirls them free.
              const free = before.filter((frame) => frame.since > knotted.at(-1)!.since);
              expect(Math.max(...free.map((frame) => frame.racer.whirl))).toBeGreaterThan(15);
              break;
            }
            case 'penguin':
              // The fish falls, and it bends down for it.
              expect(showing('fish')).toBeGreaterThanOrEqual(1);
              expect(lasting((frame) => frame.racer.bend > 20)).toBeGreaterThanOrEqual(0.6);
              break;
            case 'pigeon':
              expect(showing('chest')).toBeGreaterThanOrEqual(1);
              expect(Math.max(...tilts)).toBeGreaterThan(3);
              expect(Math.min(...tilts)).toBeLessThan(-3);
              break;
            case 'ghost':
              // Down on its front, and up again by "Phew!".
              expect(showing('hem')).toBeGreaterThanOrEqual(1);
              expect(
                lasting((frame) => parseFloat(frame.racer.rotate || '0') > 45),
              ).toBeGreaterThanOrEqual(0.6);
              expect(tilts.at(-1)!).toBeLessThan(15);
              break;
            case 'gnome': {
              // Up on a plinth, stock-still.
              const statue = stopped.filter((frame) => frame.racer.props.includes('plinth'));
              expect(statue.length * STEP).toBeGreaterThanOrEqual(1);
              for (const { racer } of statue) {
                expect(racer.hop).toBeGreaterThan(15);
                expect([racer.rotate, racer.flail, racer.gait]).toEqual(['', 0, 'off']);
              }
              expect(new Set(statue.map((frame) => frame.racer.hop)).size).toBe(1);
              break;
            }
            case 'mummy':
              // The bandage comes off, then it turns to wind it back on.
              expect(showing('unwrap')).toBeGreaterThanOrEqual(1);
              expect(Math.max(...tilts)).toBeGreaterThan(180);
              break;
            case 'yeti':
              // On its back in the snow, sweeping its arms and legs.
              expect(showing('snow')).toBeGreaterThanOrEqual(1);
              expect(Math.min(...tilts)).toBeLessThan(-80);
              expect(Math.max(...before.map((frame) => frame.racer.sweep))).toBeGreaterThan(20);
              expect(tilts.at(-1)!).toBeGreaterThan(Math.min(...tilts));
              break;
            default:
              throw new Error(`No stop for a ${called}`);
          }
          const first = stopped[0]!;
          const last = stopped.at(-1)!;
          expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
          expect(last.camera).toBeGreaterThan(first.camera + 300);
        });
        And('it waves, says "Phew!", and sets off again further back', () => {
          const frames = during();
          const waving = frames.filter(
            ({ racer }) =>
              racer.stopped && racer.pose === 'wave' && racer.bend === 0 && racer.rotate === '',
          );
          expect(waving.length).toBeGreaterThan(0);
          const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
          expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
          const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
          expect(off.racer.stopped).toBe(false);
          expect(off.racer.gait).toBe('on');
          expect(off.racer.props).toBe('');
          expect(off.racer.legs).toBe(true);
          expect([off.racer.bend, off.racer.hop, off.racer.whirl, off.racer.sweep]).toEqual([
            0, 0, 0, 0,
          ]);
          expect(off.racer.rotate).toBe('');
          const { at } = watched.plan.events[1]!;
          expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
            orderAt(watched.plan, at - 0.01).indexOf(name),
          );
        });
      },
    );
  });
});
