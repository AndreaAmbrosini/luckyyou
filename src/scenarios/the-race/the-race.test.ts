import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { handOutLooks, speechBox, type Box, type ChosenLook } from '../../scenario-kit';
import { dealLooks } from '../../scenario-kit/line-up';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import theRace from './index';
import { eventCaption } from './play';
import { faceAt, lane, tagBox } from './layout';
import { RACER_COLOURS, RIDER, SPEC, type Mount } from './parts';
import {
  CAMERA,
  cameraAt,
  crossingOf,
  eventCount,
  leaderAt,
  LENGTH,
  lineAt,
  orderAt,
  planShow,
  spacing,
  STOP,
  type Ending,
  type Plan,
} from './plan';

const ENDINGS: readonly Ending[] = ['photo', 'brake', 'surge'];

/** Names up to 15 characters: the last is as long as the layout plans for. */
const TEAM = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Fabio', 'Giulia', 'Annamaria Rossi'];

const names = (count: number) => TEAM.slice(0, count);

/** Show seconds per frame of the shared runs: coarse, so they stay quick. */
const STEP = 1 / 10;

/** One racer as a frame drew them. */
interface Drawn {
  readonly nose: number;
  readonly mood: string;
  readonly pose: string;
  readonly sweat: boolean;
  readonly gait: string;
  readonly stopped: boolean;
  readonly rotate: string;
  readonly scale: string;
  readonly leaf: boolean;
  readonly trophy: boolean;
}

/** What the stage showed in one frame. */
interface Frame {
  readonly time: number;
  readonly beat: string;
  readonly camera: number;
  readonly slow: boolean;
  readonly racers: Readonly<Record<string, Drawn>>;
  /** Who says what in a bubble on screen, and where its tail is. */
  readonly says: readonly {
    readonly person: string;
    readonly text: string;
    readonly x: number;
    readonly y: number;
  }[];
  /** How many speed lines are drawn. */
  readonly speedLines: number;
  /** Each name tag's size in stage pixels, by name. */
  readonly tagSizes: Readonly<Record<string, number>>;
  readonly flash: boolean;
  /** The photo's verdict and who it shows, back lane first, while it's up. */
  readonly photo: { readonly verdict: string; readonly names: readonly string[] } | null;
  readonly confetti: number;
}

interface Watched {
  readonly record: ShowRecord;
  readonly frames: readonly Frame[];
  readonly plan: Plan;
  readonly team: readonly string[];
  readonly unlucky: string;
  /** Everyone's look, as given or dealt for the run. */
  readonly looks: ReadonlyMap<string, ChosenLook>;
}

/** Everyone in a show on `mount`, in the colours in turn, with a racing number. */
const allOn = (team: readonly string[], mount: Mount) =>
  new Map<string, ChosenLook>(
    team.map((name, i) => [name, { mount, colour: RACER_COLOURS[i % 6]!, extra: 'number' }]),
  );

/** The elements a frame is read from. */
function find(stage: HTMLElement) {
  const all = <T extends Element>(selector: string) => [...stage.querySelectorAll<T>(selector)];
  return {
    racers: all<HTMLElement>('[data-person]')
      .filter((el) => el.querySelector(':scope > svg') && !el.closest('[data-part="photo"]'))
      .map((holder) => {
        const svg = holder.querySelector<SVGSVGElement>(':scope > svg')!;
        return {
          name: holder.dataset.person!,
          holder,
          svg,
          leaf: svg.querySelector('[data-part="leaf"]'),
        };
      }),
    bubbles: all<HTMLElement>('[data-says]'),
    tagSizes: Object.fromEntries(
      all<HTMLElement>('[data-person][data-lines]').map((tag) => [
        tag.dataset.person!,
        parseFloat(tag.style.getPropertyValue('--tag-size')),
      ]),
    ),
    speedLines: all<SVGPathElement>('[data-part="speed-lines"] path'),
    card: stage.querySelector<HTMLElement>('[data-part="photo"]'),
    flash: stage.querySelector<HTMLElement>('[data-part="flash"]'),
    confetti: all<HTMLElement>('[data-part="confetti"]'),
  };
}

/** Runs the race and keeps what the stage showed each frame. */
async function watch(
  team: readonly string[],
  {
    unlucky = team.at(-1)!,
    seed = 1,
    looks,
    cancelAt,
    reducedMotion = false,
  }: {
    unlucky?: string;
    seed?: number;
    looks?: ReadonlyMap<string, ChosenLook>;
    cancelAt?: number;
    reducedMotion?: boolean;
  } = {},
): Promise<Watched> {
  const frames: Frame[] = [];
  let found: ReturnType<typeof find> | undefined;
  const dealt = looks ?? dealLooks(theRace.lineUp!, team, createRandom(seed));
  const record = await runShow(theRace, {
    names: team,
    unlucky,
    seed,
    looks: dealt,
    cancelAt,
    reducedMotion,
    step: STEP,
    onFrame: (time, stage) => {
      const scene = stage.firstElementChild as HTMLElement | null;
      // Once the show is over, the stage is empty.
      if (!scene) return;
      // The show keeps its elements from start to end: found once, in the first frame.
      found ??= find(stage);
      const racers: Record<string, Drawn> = {};
      for (const { name, holder, svg, leaf } of found.racers) {
        racers[name] = {
          nose: Number(holder.dataset.nose),
          mood: svg.dataset.mood!,
          pose: svg.dataset.pose!,
          sweat: svg.dataset.sweat === 'true',
          gait: holder.dataset.gait!,
          stopped: holder.dataset.stopped === 'true',
          rotate: svg.getAttribute('data-rotate') ?? '',
          scale: svg.getAttribute('data-scale') ?? '',
          leaf: !!leaf && leaf.getAttribute('display') !== 'none',
          trophy: svg.dataset.trophy === 'true',
        };
      }
      const says = found.bubbles
        .filter((el) => !el.hidden)
        .map((el) => ({
          person: el.dataset.person!,
          text: el.dataset.says!,
          x: Number(el.dataset.x),
          y: Number(el.dataset.y),
        }));
      const card = found.card;
      const photo =
        card && !card.hidden
          ? {
              verdict: card.querySelector('p:last-child')!.textContent!,
              names: [...card.querySelectorAll<HTMLElement>('[data-person]')].map(
                (el) => el.dataset.person!,
              ),
            }
          : null;
      frames.push({
        time,
        speedLines: found.speedLines.filter((path) => path.getAttribute('display') !== 'none')
          .length,
        tagSizes: found.tagSizes,
        flash: !(found.flash?.hidden ?? true),
        photo,
        confetti: found.confetti.filter((el) => !el.hidden).length,
        beat: scene.dataset.beat!,
        camera: Number(scene.dataset.camera),
        slow: scene.dataset.slow === 'true',
        racers,
        says,
      });
    },
  });
  const plan = planShow(team, unlucky, createRandom(seed));
  return { record, frames, plan, team, unlucky, looks: dealt };
}

/** The captions shown, in order. */
const captions = (watched: Watched) => watched.record.captions.map((each) => each.text);

/** The frames from `from` up to `to`, in show seconds. */
const between = (watched: Watched, from: number, to: number) =>
  watched.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);
const shownAt = (watched: Watched, text: string) =>
  watched.record.captions.find((each) => each.text === text)?.from;
const saying = (frame: Frame, person: string, text: string) =>
  frame.says.some((said) => said.person === person && said.text === text);

const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/** Runs that more than one scenario reads, each run once, when first asked for. */
const shared = (() => {
  const runs = new Map<string, Promise<Watched>>();
  const once = (key: string, run: () => Promise<Watched>) => {
    if (!runs.has(key)) runs.set(key, run());
    return runs.get(key)!;
  };
  return {
    eight: () => once('8', () => watch(names(8), { seed: 3 })),
    /**
     * Four people ending `ending`, Anna unlucky and the rival called `rival`.
     */
    ending: (ending: Ending, rival = 'Priya') =>
      once(`ending ${ending}`, () => {
        const team = ['Dario', 'Elena', 'Fabio', 'Anna'];
        let seed = 1;
        while (planShow(team, 'Anna', createRandom(seed)).ending !== ending) seed++;
        const plan = planShow(team, 'Anna', createRandom(seed));
        team[team.indexOf(plan.rival)] = rival;
        return watch(team, { unlucky: 'Anna', seed });
      }),
    count: (count: number) =>
      count === 8 ? shared.eight() : once(`count ${count}`, () => watch(names(count), { seed: 5 })),
    /**
     * Five people on `mount`, so the first event is a burst and the second
     * that burster's stop; whoever bursts is called `name`.
     */
    mount: (mount: Mount, name: string, reducedMotion = false) =>
      once(`mount ${mount} ${reducedMotion}`, () => {
        const team = ['Dario', 'Elena', 'Fabio', 'Giulia', 'Hana'];
        const seed = 7;
        const plan = planShow(team, team.at(-1)!, createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = name;
        return watch(team, { seed, looks: allOn(team, mount), reducedMotion });
      }),
    /**
     * Six people, Anna unlucky: Ben's snail and Carla's duck burst, Carla's
     * duck stops, and it ends in a photo finish.
     */
    story: (reducedMotion = false) =>
      once(`story ${reducedMotion}`, () => {
        const team = ['Dario', 'Elena', 'Fabio', 'Giulia', 'Hana', 'Anna'];
        let seed = 1;
        const fits = (plan: Plan) =>
          plan.ending === 'photo' && plan.events.every((event) => event.subject !== 'Anna');
        while (!fits(planShow(team, 'Anna', createRandom(seed)))) seed++;
        const plan = planShow(team, 'Anna', createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = 'Ben';
        team[team.indexOf(plan.events[1]!.subject)] = 'Carla';
        const looks = allOn(team, 'chair');
        looks.set('Ben', { mount: 'snail', colour: 'tomato', extra: 'number' });
        looks.set('Carla', { mount: 'duck', colour: 'sun', extra: 'scarf' });
        return watch(team, { unlucky: 'Anna', seed, looks, reducedMotion });
      }),
    /** `count` people with a 15-character name, unlucky, and every mount. */
    long: (count: number) =>
      once(`long ${count}`, () => {
        const team = [...names(count - 1), 'Annamaria Rossi'];
        const mounts = ['snail', 'duck', 'chair', 'caterpillar'] as const;
        const looks = new Map<string, ChosenLook>(
          team.map((name, i) => [name, { mount: mounts[i % 4]!, colour: 'mint', extra: 'scarf' }]),
        );
        return watch(team, { seed: 11, looks });
      }),
  };
})();

/** Plans for seeds 1 to `seeds`. */
function plans(team: readonly string[], unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(team, unlucky, createRandom(index + 1)),
  );
}

/** Show seconds from `from` to `to`, every frame. */
function* frames(from: number, to: number, step = 1 / 30) {
  for (let t = from; t <= to + 1e-9; t += step) yield t;
}

/** Every head count with seeds 1–40, the last of the team unlucky. */
function everyPlan(): { label: string; plan: Plan; team: string[]; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 8; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const team = names(count);
      const unlucky = team.at(-1)!;
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(team, unlucky, createRandom(seed)),
        team,
        unlucky,
      });
    }
  }
  return all;
}

describeSpec(await loadFeature('./the-race.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows The Race', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => expect(theRace.name).toBe(name));
      And('its description is {string}', (_, text: string) =>
        expect(theRace.description).toBe(text),
      );
      And('its picture is 🏁', () => expect(theRace.card).toEqual({ emoji: '🏁' }));
      And('it takes {int} to {int} people', (_, min: number, max: number) =>
        expect(theRace.people).toEqual({ min, max }),
      );
      And('it has a line-up', () => expect(theRace.lineUp).toBeDefined());
    });
  });

  Rule('Its line-up', ({ RuleScenario }) => {
    RuleScenario('Ride, colour and extra', ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      const option = (label: string) => lineUp.options.find((each) => each.label === label)!;
      const labels = (label: string) => option(label).choices.map((choice) => choice.label);
      let drawings: Element[] = [];
      When('the Line-up opens for The Race', () => {
        drawings = names(3).map((name, index) =>
          lineUp.draw(
            { mount: 'chair', colour: 'mint', extra: 'number' },
            { name, place: index + 1 },
          ),
        );
      });
      Then(
        'its heading is {string} and its button {string}',
        (_, heading: string, start: string) => {
          expect(lineUp.heading).toBe(heading);
          expect(lineUp.start).toBe(start);
        },
      );
      And('"Rides" offers {any}', (_, offered: string) => {
        expect(labels('Rides')).toEqual([...offered.matchAll(/"([^"]+)"/g)].map(([, x]) => x));
      });
      And('"Colour" offers tomato, sun, mint, grape, pink and orange, as swatches', () => {
        const choices = option('Colour').choices;
        expect(choices.map((choice) => choice.name)).toEqual([
          'tomato',
          'sun',
          'mint',
          'grape',
          'pink',
          'orange',
        ]);
        for (const choice of choices) expect(choice.swatch).toBe(choice.name);
      });
      And('"Extra" offers {any}', (_, offered: string) => {
        expect(labels('Extra')).toEqual([...offered.matchAll(/"([^"]+)"/g)].map(([, x]) => x));
      });
      And('each tile and the preview draw the racer as the show does, calm', () => {
        drawings.forEach((drawing, index) => {
          const el = drawing as SVGSVGElement;
          expect(el.dataset.part).toBe('racer');
          expect(el.dataset.mount).toBe('chair');
          expect(el.dataset.colour).toBe('mint');
          expect(el.dataset.mood).toBe('calm');
          expect(el.dataset.pose).toBe('hold');
          expect(el.querySelector('text')!.textContent).toBe(String(index + 1));
        });
      });
    });

    /** Anna, Ben and Carla as the show first draws them, with the looks given. */
    async function firstDrawn(looks: Map<string, ChosenLook>, seed = 4) {
      const team = ['Anna', 'Ben', 'Carla'];
      const drawn = new Map<string, SVGSVGElement>();
      await runShow(theRace, {
        names: team,
        unlucky: 'Carla',
        seed,
        looks,
        cancelAt: 0.2,
        step: STEP,
        onFrame: (_, stage) => {
          for (const name of team) {
            const svg = stage.querySelector<SVGSVGElement>(`[data-person="${name}"] svg`)!;
            if (!drawn.has(name)) drawn.set(name, svg.cloneNode(true) as SVGSVGElement);
          }
        },
      });
      return drawn;
    }

    RuleScenario('Each racer looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      const shirt = (svg: SVGSVGElement) =>
        svg
          .querySelector<SVGSVGElement>('[data-part="lean"] svg')!
          .style.getPropertyValue('--shirt');
      Given(
        'Anna chose the duck, sun and the scarf, and Ben the office chair, grape and googly eyes',
        () => {
          looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
          looks.set('Ben', { mount: 'chair', colour: 'grape', extra: 'googly' });
          looks.set('Carla', { mount: 'snail', colour: 'mint', extra: 'number' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('Anna rides a sun duck on a skateboard, in a sun shirt, with a scarf', () => {
        const anna = drawn.get('Anna')!;
        expect(anna.dataset).toMatchObject({ mount: 'duck', colour: 'sun', extra: 'scarf' });
        expect(anna.style.getPropertyValue('--racer')).toBe('var(--color-sun)');
        expect(anna.querySelectorAll('[data-part="wheel"]')).toHaveLength(2);
        expect(shirt(anna)).toBe('var(--color-sun)');
        expect(anna.querySelector('[data-part="scarf"]')).not.toBeNull();
      });
      And(
        'Ben rides a grape office chair backwards, holding its backrest, in a grape shirt, with googly eyes on the backrest',
        () => {
          const ben = drawn.get('Ben')!;
          expect(ben.dataset).toMatchObject({ mount: 'chair', colour: 'grape', extra: 'googly' });
          expect(shirt(ben)).toBe('var(--color-grape)');
          const [x, y] = SPEC.chair.hold!;
          expect(ben.querySelector('[data-part="hands"] path')!.getAttribute('d')).toContain(
            `L${x} ${y}`,
          );
          expect(ben.querySelector('[data-part="reins"]')!.getAttribute('display')).toBe('none');
          for (const eye of ben.querySelectorAll('[data-part="googly"] circle')) {
            const cx = Number(eye.getAttribute('cx'));
            const cy = Number(eye.getAttribute('cy'));
            expect(cx).toBeGreaterThan(162);
            expect(cx).toBeLessThan(200);
            expect(cy).toBeGreaterThan(34);
            expect(cy).toBeLessThan(110);
          }
        },
      );
      And(
        "each rider's head keeps the skin tone and accessory the kit hands out for the run",
        () => {
          const random = createRandom(4);
          planShow(['Anna', 'Ben', 'Carla'], 'Carla', random);
          const faces = handOutLooks(['Anna', 'Ben', 'Carla'], random);
          for (const [name, svg] of drawn) {
            const head = svg.querySelector<SVGSVGElement>('[data-part="lean"] svg')!;
            const face = faces.get(name)!;
            expect(head.style.getPropertyValue('--skin')).toBe(`var(--color-skin-${face.skin})`);
            expect(head.querySelector(`[data-part="${face.accessory}"]`)).not.toBeNull();
          }
        },
      );
    });

    RuleScenario("A racing number is their place in today's list", ({ Given, When, Then }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(`Carla is third in today's list and chose "Number"`, () => {
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
        looks.set('Ben', { mount: 'chair', colour: 'grape', extra: 'number' });
        looks.set('Carla', { mount: 'caterpillar', colour: 'pink', extra: 'number' });
      });
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('her mount wears a paper roundel with {string}', (_, number: string) => {
        const roundel = drawn.get('Carla')!.querySelector('[data-part="number"]')!;
        expect(roundel.querySelector('circle')).not.toBeNull();
        expect(roundel.textContent).toBe(number);
      });
    });
  });

  Rule('The unlucky person crosses first', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        const team = names(Number(count));
        let unlucky: string;
        let runs: Plan[];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          unlucky = position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plans(team, unlucky, seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
          }
        });
        And("nobody else's nose reaches the line before theirs", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky)!;
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing);
            }
          }
        });
      },
    );

    RuleScenario('Nobody wins out of nowhere', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('from "Final stretch!" on, the unlucky person is always among the front three', () => {
        for (const plan of runs) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(3);
          }
        }
      });
      And('in the photo finish and the late brake, among the front two', () => {
        for (const plan of runs.filter((each) => each.ending !== 'surge')) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(2);
          }
        }
      });
    });

    RuleScenario('Who leads gives nothing away', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people, with the same unlucky person every time', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('the first to take the lead is at least {int} different people', (_, least: number) => {
        const first = new Set(runs.map((plan) => leaderAt(plan, plan.times.go + 0.3)));
        expect(first.size).toBeGreaterThanOrEqual(least);
      });
      And(
        'the unlucky person leads before the final stretch in some runs and not in others',
        () => {
          const leads = runs.map((plan) =>
            [...frames(plan.times.go + 0.1, plan.times.stretch)].some(
              (t) => leaderAt(plan, t) === unlucky,
            ),
          );
          expect(leads).toContain(true);
          expect(leads).toContain(false);
        },
      );
      And(
        'the others in the front group of the final stretch are at least {int} different people across the runs',
        (_, least: number) => {
          const others = new Set(
            runs.flatMap((plan) =>
              orderAt(plan, plan.times.stretch + 1.5)
                .slice(0, 3)
                .filter((name) => name !== unlucky),
            ),
          );
          expect(others.size).toBeGreaterThanOrEqual(least);
        },
      );
    });
  });

  Rule('Winning is losing', ({ RuleScenario }) => {
    RuleScenario('The leader is scared, the rest relieved', ({ Given, When, Then, And }) => {
      let watched: Watched;
      /** Frames while the race is on, with nobody stopped. */
      const racing = () =>
        watched.frames.filter(
          (frame) =>
            frame.time > watched.plan.times.go + 0.2 &&
            frame.time < watched.plan.times.finish &&
            Object.values(frame.racers).every((racer) => !racer.stopped),
        );
      const front = (frame: Frame) => Math.max(...Object.values(frame.racers).map((r) => r.nose));
      Given('{int} people', () => undefined);
      When('the show runs', async () => {
        watched = await shared.eight();
      });
      Then(
        'whoever is in front looks scared, sweats, leans back and pulls on the reins, or holds on tight on the chair',
        () => {
          for (const frame of racing()) {
            const [, leader] = Object.entries(frame.racers).find(
              ([, racer]) => racer.nose === front(frame),
            )!;
            expect(leader.mood, `${frame.time}`).toBe('scared');
            expect(leader.sweat).toBe(true);
            expect(leader.pose).toBe('pull');
          }
        },
      );
      And("whoever is within a mount's length behind them looks worried", () => {
        for (const frame of racing()) {
          for (const racer of Object.values(frame.racers)) {
            const behind = front(frame) - racer.nose;
            if (behind > 0 && behind <= LENGTH) expect(racer.mood, `${frame.time}`).toBe('worried');
          }
        }
      });
      And('everyone further back looks happy, some of them waving', () => {
        let waving = 0;
        for (const frame of racing()) {
          for (const racer of Object.values(frame.racers)) {
            if (front(frame) - racer.nose <= LENGTH) continue;
            expect(racer.mood, `${frame.time}`).toBe('happy');
            if (racer.pose === 'wave') waving++;
          }
        }
        expect(waving).toBeGreaterThan(0);
      });
    });
  });

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
  });

  Rule('The final stretch, and a slow last moment', ({ RuleScenario }) => {
    RuleScenario('Full speed to the line', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('{int} people', () => undefined);
      When('"Final stretch!" appears', async () => {
        watched = await shared.eight();
        const shown = watched.record.captions.find((each) => each.text === 'Final stretch!')!;
        expect(shown.from).toBeCloseTo(watched.plan.times.stretch, 1);
      });
      Then('the heartbeat starts, and comes quicker and quicker until the line', () => {
        // Sound isn't recorded: play.ts cues a heartbeat at each of these.
        const { heartbeats, times } = watched.plan;
        expect(heartbeats[0]! - times.stretch).toBeCloseTo(0.2, 9);
        expect(heartbeats.at(-1)!).toBeLessThan(times.finish);
        const gaps = heartbeats.slice(1).map((time, i) => time - heartbeats[i]!);
        gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThanOrEqual(gaps[i]! + 1e-9));
        expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
      });
      And('the front two or three close up and swap places once', () => {
        const { plan } = watched;
        const { stretch, slow } = plan.times;
        const fronts = watched.frames
          .filter((frame) => frame.time >= stretch && frame.time < slow)
          .map((frame) => orderAt(plan, frame.time).slice(0, 3).join());
        const changes = fronts.filter((front, i) => i > 0 && front !== fronts[i - 1]);
        expect(changes).toHaveLength(1);
        const spread = (t: number) => {
          const noses = orderAt(plan, t).map(
            (name) => watched.frames.find((frame) => frame.time >= t)!.racers[name]!.nose,
          );
          return noses[0]! - noses[2]!;
        };
        expect(spread(stretch + 1.5)).toBeLessThan(spread(stretch) - 40);
      });
      And('the camera keeps its speed, and the finish line comes in from the right', () => {
        const { plan } = watched;
        const { stretch, slow } = plan.times;
        for (let t = stretch; t < slow - 0.1; t += 0.25) {
          expect((cameraAt(plan, t + 0.1) - cameraAt(plan, t)) / 0.1).toBeCloseTo(CAMERA.speed, 5);
        }
        expect(lineAt(plan, stretch)).toBeGreaterThan(1280);
        expect(lineAt(plan, slow)).toBeLessThan(1280);
      });
    });

    RuleScenario('Only the last moment is slow', ({ When, Then, And }) => {
      let watched: Watched;
      When("the front reaches a mount's length from the finish line", async () => {
        watched = await shared.eight();
        const { plan } = watched;
        const leaderNose = (t: number) =>
          watched.frames.find((frame) => frame.time >= t)!.racers[orderAt(plan, t)[0]!]!.nose;
        const gap = lineAt(plan, plan.times.slow) - leaderNose(plan.times.slow);
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(1.4 * LENGTH);
      });
      Then(
        'everything slows to a quarter of its speed, the camera, the racers and their gaits, for 1.2 to 1.6 seconds',
        () => {
          const { plan, frames } = watched;
          const slow = frames.filter((frame) => frame.slow);
          const seconds = slow.length * STEP;
          expect(seconds).toBeGreaterThanOrEqual(1.2);
          expect(seconds).toBeLessThanOrEqual(1.6);
          const mid = plan.times.slow + 0.5;
          expect((cameraAt(plan, mid + 0.1) - cameraAt(plan, mid)) / 0.1).toBeCloseTo(
            CAMERA.speed * CAMERA.slow,
            5,
          );
          for (const frame of slow) {
            for (const racer of Object.values(frame.racers)) {
              expect(['slow', 'off']).toContain(racer.gait);
            }
          }
        },
      );
      And('nothing before that is slowed', () => {
        const { plan, frames } = watched;
        const before = frames.filter((frame) => frame.time < plan.times.slow - 1e-6);
        expect(before.every((frame) => !frame.slow)).toBe(true);
        for (const frame of before) {
          for (const racer of Object.values(frame.racers)) expect(racer.gait).not.toBe('slow');
        }
      });
    });
  });

  Rule('The last moment could go three ways', ({ RuleScenario }) => {
    RuleScenario('The ending, over many runs', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(names(8), names(8).at(-1)!, seeds);
      });
      Then('about half end in a photo finish, and the rest in a late brake or a surge', () => {
        const share = (ending: Ending) => runs.filter((plan) => plan.ending === ending).length;
        expect(share('photo') / runs.length).toBeGreaterThanOrEqual(0.35);
        expect(share('photo') / runs.length).toBeLessThanOrEqual(0.65);
        expect(share('brake')).toBeGreaterThan(0);
        expect(share('surge')).toBeGreaterThan(0);
      });
    });

    RuleScenario('Photo finish', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}, side by side with {string} at the line', async () => {
        watched = await shared.ending('photo', 'Priya');
        expect(orderAt(watched.plan, watched.plan.times.finish).slice(0, 2).sort()).toEqual([
          'Anna',
          'Priya',
        ]);
      });
      When('their noses cross', () => {
        const crossing = crossingOf(watched.plan, 'Anna')!;
        expect(crossing).toBeLessThanOrEqual(watched.plan.times.finish);
        expect(crossingOf(watched.plan, 'Priya')).toBeNull();
      });
      Then(
        'everything freezes, the stage flashes once, and the caption is {string}',
        (_, caption: string) => {
          const { finish, win } = watched.plan.times;
          const frozen = between(watched, finish + STEP, win);
          for (const frame of frozen) {
            expect(frame.camera).toBe(frozen[0]!.camera);
            for (const [name, racer] of Object.entries(frame.racers)) {
              expect(racer.nose).toBe(frozen[0]!.racers[name]!.nose);
              expect(racer.gait).toBe('off');
            }
          }
          const flashes = watched.frames.filter((frame) => frame.flash);
          expect(flashes.length).toBeGreaterThan(0);
          expect(flashes.length * STEP).toBeLessThanOrEqual(0.3 + 1e-9);
          expect(flashes[0]!.time).toBeGreaterThanOrEqual(finish - 1e-9);
          expect(flashes[0]!.time).toBeLessThanOrEqual(finish + STEP + 1e-9);
          expect(shownAt(watched, caption)).toBeCloseTo(finish, 1);
        },
      );
      And("a photo pops up showing the two side-on at the line, Anna's nose over it first", () => {
        const { finish, win } = watched.plan.times;
        const up = watched.frames.filter((frame) => frame.photo);
        expect(up[0]!.time).toBeGreaterThanOrEqual(finish + 0.3 - 1e-9);
        expect(up.at(-1)!.time).toBeLessThan(win);
        expect(up.length * STEP).toBeGreaterThanOrEqual(1.5);
        const lanes = watched.team.filter((name) => name === 'Anna' || name === 'Priya');
        expect(up[0]!.photo!.names).toEqual(lanes);
      });
      And('it says {string}', (_, verdict: string) => {
        expect(watched.frames.find((frame) => frame.photo)!.photo!.verdict).toBe(verdict);
      });
    });

    RuleScenario('Late brake', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given(
        'the unlucky person is {string}, just behind {string} at the start of the slow moment',
        async () => {
          watched = await shared.ending('brake', 'Ben');
          expect(orderAt(watched.plan, watched.plan.times.slow).slice(0, 2)).toEqual([
            'Ben',
            'Anna',
          ]);
        },
      );
      When('the slow moment starts', () => undefined);
      Then(
        'the caption is {string} and Ben stops short of the line, saying {string}',
        (_, caption: string, phew: string) => {
          const { slow, finish, win } = watched.plan.times;
          expect(shownAt(watched, caption)).toBeCloseTo(slow, 1);
          expect(crossingOf(watched.plan, 'Ben')).toBeNull();
          const ben = between(watched, slow, win).map((frame) => frame.racers.Ben!.nose);
          expect(ben.at(-1)!).toBeLessThan(ben[0]! - 60);
          expect(between(watched, slow + 0.5, finish).every((f) => saying(f, 'Ben', phew))).toBe(
            true,
          );
        },
      );
      And('the caption is {string} as Anna sails past him and over the line', (_, text: string) => {
        const { slow, finish } = watched.plan.times;
        const shown = shownAt(watched, text)!;
        expect(shown).toBeGreaterThan(slow);
        expect(shown).toBeLessThan(finish);
        expect(orderAt(watched.plan, finish)[0]).toBe('Anna');
        expect(crossingOf(watched.plan, 'Anna')!).toBeLessThanOrEqual(finish);
      });
    });

    RuleScenario('Surge', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given(
        'the unlucky person is {string}, third behind two others at the start of the slow moment',
        async () => {
          watched = await shared.ending('surge');
          expect(orderAt(watched.plan, watched.plan.times.slow).indexOf('Anna')).toBe(2);
        },
      );
      When('the slow moment starts', () => undefined);
      Then(
        "the caption is Anna's mount bursting ahead, as in an event, and she shouts {string}",
        (_, shout: string) => {
          const { slow, finish } = watched.plan.times;
          const surge = { kind: 'burst', subject: 'Anna', at: slow } as const;
          const said = (['snail', 'duck', 'chair', 'caterpillar'] as const).map((mount) =>
            eventCaption(surge, mount),
          );
          const shown = watched.record.captions.find((each) => said.includes(each.text))!;
          expect(shown.from).toBeCloseTo(slow, 1);
          expect(between(watched, slow + 0.2, finish).every((f) => saying(f, 'Anna', shout))).toBe(
            true,
          );
        },
      );
      And('she passes both and crosses first', () => {
        const { slow, finish } = watched.plan.times;
        const [first, second] = orderAt(watched.plan, slow);
        const crossing = crossingOf(watched.plan, 'Anna')!;
        expect(crossing).toBeLessThanOrEqual(finish);
        expect(orderAt(watched.plan, crossing).indexOf('Anna')).toBe(0);
        for (const passed of [first!, second!]) {
          const theirs = crossingOf(watched.plan, passed);
          if (theirs !== null) expect(theirs).toBeGreaterThan(crossing);
        }
      });
    });
  });

  Rule('The winner gets the trophy', ({ RuleScenario }) => {
    RuleScenario('The win', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}', async () => {
        watched = await shared.ending('photo', 'Priya');
      });
      When('she has crossed the line', () => undefined);
      Then('the caption is {string}, with a fanfare and confetti', (_, caption: string) => {
        const { win } = watched.plan.times;
        expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
        expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
        // Sound isn't recorded: play.ts cues the fanfare as the caption comes.
        expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
        expect(between(watched, 0, win).every((f) => f.confetti === 0)).toBe(true);
      });
      And('Anna holds a trophy over her head, in the party mood', () => {
        for (const frame of between(watched, watched.plan.times.win + STEP, Infinity)) {
          expect(frame.racers.Anna).toMatchObject({ trophy: true, mood: 'party', pose: 'party' });
        }
      });
      And('everyone else celebrates', () => {
        const last = watched.frames.at(-1)!;
        for (const [name, racer] of Object.entries(last.racers)) {
          if (name === 'Anna') continue;
          expect(racer.trophy).toBe(false);
          expect(racer.mood === 'party' || (racer.mood === 'happy' && racer.pose === 'wave')).toBe(
            true,
          );
        }
      });
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      let watched: Watched;
      Given('the unlucky person is {string}', () => undefined);
      When('the show runs', async () => {
        watched = await shared.ending('brake', 'Ben');
      });
      Then(
        '{string} is on stage, not moving, for the last {number} seconds',
        (_, name: string, seconds: number) => {
          const last = between(watched, watched.record.duration - seconds, Infinity);
          expect(last.length * STEP).toBeGreaterThanOrEqual(seconds - STEP);
          for (const frame of last) {
            const racer = frame.racers[name]!;
            expect(racer.nose).toBe(last[0]!.racers[name]!.nose);
            expect(racer.gait).toBe('off');
            expect(racer.rotate).toBe('');
            expect(racer.scale).toBe('');
          }
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
            const tops = (['snail', 'duck', 'chair', 'caterpillar'] as const).map(
              (mount) => faceAt(mount, lane(i, count), 900).top,
            );
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
          const nose = frame.racers[name]!.nose;
          return { name, face: faceAt(mount, at, nose), tag: tagBox(name, mount, at, nose) };
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
  });

  Rule('The beats keep every show inside the limit', ({ RuleScenario }) => {
    /** For each ending, the first of seeds 1–40 whose plan ends that way. */
    const byEnding = (count: number) =>
      ENDINGS.map((ending) => {
        const team = names(count);
        const plan = plans(team, team.at(-1)!, 40).find((each) => each.ending === ending);
        if (!plan) throw new Error(`No ${ending} with ${count} people.`);
        return plan;
      });

    RuleScenario('About 20 to 22 seconds at 8 people', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with each ending', () => {
        runs = byEnding(8);
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end, plan.ending).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, plan.ending).toBeLessThanOrEqual(most);
        }
      });
    });

    RuleScenario('Every head count lands between 14 and 25 seconds', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at every head count from 2 to 8, with each ending', () => {
        runs = Array.from({ length: 7 }, (_, i) => byEnding(i + 2)).flat();
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end).toBeGreaterThanOrEqual(least);
          expect(plan.times.end).toBeLessThanOrEqual(most);
        }
      });
    });
  });
});

describe('the plan', () => {
  const all = everyPlan();

  it('lasts 14 to 25 seconds at every head count, with every ending, seeds 1–40', () => {
    for (const { label, plan } of all) {
      expect(plan.times.end, label).toBeGreaterThanOrEqual(14);
      expect(plan.times.end, label).toBeLessThanOrEqual(25);
    }
  });

  it('has the rival and the third from the others, the third only from 3 people', () => {
    for (const { label, plan, team, unlucky } of all) {
      expect(team, label).toContain(plan.rival);
      expect(plan.rival, label).not.toBe(unlucky);
      if (team.length === 2) expect(plan.third, label).toBeNull();
      else expect([unlucky, plan.rival], label).not.toContain(plan.third);
    }
  });

  it('puts the rival beside the unlucky person at the line, or just ahead for a brake or a surge', () => {
    for (const { label, plan, unlucky } of all) {
      const front = orderAt(plan, plan.times.slow);
      if (plan.ending === 'brake') expect(front.slice(0, 2), label).toEqual([plan.rival, unlucky]);
      if (plan.ending === 'surge' && plan.third) {
        expect(front.slice(0, 3), label).toEqual([plan.rival, plan.third, unlucky]);
      }
      if (plan.ending === 'photo') {
        expect([...front.slice(0, 2)].sort(), label).toEqual([plan.rival, unlucky].sort());
      }
    }
  });

  it('has its events one at a time, bursts and then the leader stopping', () => {
    for (const { label, plan, team, unlucky } of all) {
      const count = team.length;
      expect(plan.events, label).toHaveLength(eventCount(count));
      const bursts = plan.events.filter((event) => event.kind === 'burst');
      expect(plan.events.slice(0, bursts.length).every((event) => event.kind === 'burst')).toBe(
        true,
      );
      plan.events.forEach((event, i) => {
        if (i > 0) expect(event.at - plan.events[i - 1]!.at, label).toBeCloseTo(spacing(count));
        expect(event.at - (plan.events[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(2.5);
        if (event.kind === 'stop') {
          expect(event.subject, label).not.toBe(unlucky);
          expect(leaderAt(plan, event.at), label).toBe(event.subject);
          expect(orderAt(plan, event.at + STOP.off)[0], label).not.toBe(event.subject);
        } else {
          expect(leaderAt(plan, event.at + 0.01), label).not.toBe(event.subject);
          expect(leaderAt(plan, event.at + 0.9), label).toBe(event.subject);
        }
      });
      expect(plan.events.at(-1)!.at + spacing(count), label).toBeCloseTo(plan.times.stretch);
    }
  });

  it('starts everyone with their noses on the line, and springs them off together at "Go!"', () => {
    for (const { label, plan, team } of all.slice(0, 80)) {
      const ranks = orderAt(plan, plan.times.go + 0.3);
      expect(ranks, label).toEqual(plan.setOff);
      expect(new Set(team.map((name) => orderAt(plan, 0).indexOf(name))).size).toBe(team.length);
    }
  });

  it('crosses with the unlucky nose first in every run', () => {
    for (const { label, plan, team, unlucky } of all) {
      const crossing = crossingOf(plan, unlucky);
      expect(crossing, label).not.toBeNull();
      for (const name of team.filter((each) => each !== unlucky)) {
        const theirs = crossingOf(plan, name);
        if (theirs !== null) expect(theirs, label).toBeGreaterThan(crossing!);
      }
    }
  });
});
