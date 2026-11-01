import { loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { handOutLooks, type ChosenLook } from '../../scenario-kit';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec } from '../../scenario-kit/testing';
import theRace from './index';
import { faceAt, lane } from './layout';
import { creature, CREATURE_SPEC } from './creature';
import {
  CREATURES,
  isCreature,
  RACER,
  racer,
  SPEC,
  type Creature,
  type Kind,
  type RacerColour,
  type RacerLook,
  type RideLook,
} from './parts';
import styles from './the-race.module.css';
import css from './the-race.module.css?raw';
import {
  BURST,
  COURSES,
  crossingOf,
  leaderAt,
  orderAt,
  planShow,
  spacing,
  STOP,
  type Plan,
  type RaceEvent,
} from './plan';
import {
  read,
  bounds,
  names,
  STEP,
  type Drawn,
  type Watched,
  watch,
  captions,
  between,
  saying,
  shared,
  firstDrawn,
  reined,
  plansOn,
  type OnTrack,
  onTrack,
  actOutOwnEvent,
  DRESSED,
  dressedOn,
  accessories,
} from './watching';

describeSpec(await loadFeature('./autumn.feature'), ({ Rule }) => {
  Rule('Autumn', ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');
    const autumn = () => lineUp.themes!.find((each) => each.name === 'autumn')!;

    RuleScenario('Autumn is a theme', ({ When, Then, And }) => {
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then(
        '"Autumn" is a theme, after "Moon", its postcard trees in autumn colours over a path',
        () => {
          const labels = lineUp.themes!.map((theme) => theme.label);
          expect(labels.indexOf('Autumn')).toBe(labels.indexOf('Moon') + 1);
          const picture = autumn().picture() as SVGSVGElement;
          expect(picture.dataset).toMatchObject({ part: 'postcard', course: 'autumn' });
          const classes = [...picture.querySelectorAll('path')].map((path) =>
            path.getAttribute('class'),
          );
          // A sky, crowns in orange, tomato and sun on bark trunks, then the path with its paper line.
          expect(classes[0]).toBe(styles.skyFill);
          for (const colour of [styles.orange, styles.tomato, styles.sun]) {
            expect(classes).toContain(colour);
          }
          expect(classes.slice(-2)).toEqual([styles.bark, styles.paperFill]);
        },
      );
      And(`with Autumn chosen, the racer option's first tab is "Autumn racers"`, () => {
        // specs/line-up.feature: the sheet shows a theme's suits first, in its words.
        expect(`${autumn().label} ${lineUp.words!.choices}`).toBe('Autumn racers');
        expect(autumn().suits!.length).toBeGreaterThan(0);
      });
    });

    RuleScenario('What Autumn looks like', ({ When, Then, And }) => {
      let run: OnTrack;
      When('the show runs on Autumn', async () => {
        run = await onTrack('autumn');
      });
      Then(
        'the ground is a bark path strewn with fallen leaves, the lanes split by paper lines, and paper name tags read clearly on it',
        () => {
          const ground = run.track.querySelector('[data-part="ground"]')!;
          expect(ground.querySelector(`rect.${styles.bark}`)).not.toBeNull();
          const fallen = [...ground.querySelector('[data-part="fallen"]')!.children[0]!.children];
          expect(fallen.map((leaf) => leaf.getAttribute('class'))).toEqual([
            styles.orange,
            styles.tomato,
            styles.sun,
          ]);
          const lines = [...run.track.querySelectorAll('[data-part="lines"] path')];
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) expect(line.getAttribute('class')).toBe(styles.paperFill);
          const tags = run.stickers.filter((sticker) => sticker.what === 'tag');
          expect(tags.length).toBeGreaterThan(0);
          for (const tag of tags) expect(tag.background).toBe('var(--color-paper)');
        },
      );
      And(
        'behind the track is a park on a sunny afternoon: trees in orange, tomato and sun on a lawn, leaves falling, and a wooden fence with piles of leaves',
        () => {
          expect(run.sky).toBe('var(--color-sky)');
          const tile = (part: string) =>
            [...run.track.querySelector(`[data-part="${part}"]`)!.children[0]!.children].map(
              (shape) => ({
                part: shape.getAttribute('data-part'),
                className: shape.getAttribute('class'),
              }),
            );
          const park = tile('park').map((shape) => shape.className);
          // The lawn, its edge, the trunks, then each colour's crowns.
          expect(park.slice(0, 3)).toEqual([styles.grass, styles.line, styles.bark]);
          expect(park.slice(3)).toEqual([
            styles.orange,
            styles.tomato,
            styles.sun,
            styles.orange,
            styles.tomato,
            styles.sun,
          ]);
          expect(tile('leaves').map((shape) => shape.className)).toEqual([
            styles.orange,
            styles.tomato,
            styles.sun,
          ]);
          const ground = run.track.querySelector('[data-part="ground"]')!;
          expect(ground.querySelector('[data-part="rails"]')!.getAttribute('class')).toBe(
            styles.bark,
          );
          expect(tile('fence').map((shape) => shape.className)).toEqual([styles.bark]);
          expect(tile('piles')[0]!.className).toBe(styles.orange);
        },
      );
      And(
        'each distance is a paper sign on a wooden post, a rake standing in a pile of leaves beside it',
        () => {
          const signs = [...run.track.querySelectorAll<HTMLElement>('[data-part="sign"]')];
          expect(signs).toHaveLength(5);
          for (const sign of signs) {
            const board = sign.querySelector('p')!;
            const distance = board.textContent!.endsWith(' m');
            expect(board.classList.contains(styles.sunBoard!)).toBe(!distance);
            expect(sign.querySelector(`.${styles.post}`)!.classList).toContain(styles.woodPost);
            expect(!!sign.querySelector('[data-part="rake"]'), board.textContent!).toBe(distance);
          }
          expect(css).toMatch(/\.woodPost \{\s*background-color: var\(--color-bark\);/);
          const rake = [...signs[1]!.querySelector('[data-part="rake"]')!.children].map((shape) =>
            shape.getAttribute('class'),
          );
          // Its handle, its tines, and the pile of leaves round its foot.
          expect(rake).toEqual([
            styles.line,
            styles.barkLine,
            styles.line,
            styles.orange,
            styles.tomato,
            styles.sun,
          ]);
        },
      );
      And("a photo finish's photo shows the path and its finish line", () => {
        const view = run.photo!.firstElementChild as HTMLElement;
        expect(view.dataset.course).toBe('autumn');
        expect(view.classList).toContain(styles.autumn);
        const picture = view.querySelector(':scope > svg')!;
        expect(picture.querySelector('rect')!.getAttribute('class')).toBe(styles.bark);
        expect(picture.querySelector(`.${styles.inkFill}`)).not.toBeNull();
      });
    });

    RuleScenario('Autumn has a stop and a burst of its own', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, on Autumn', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plansOn(team, unlucky, 'autumn', seeds);
      });
      Then(`in every run, one event before "Final stretch!" is Autumn's own stop or burst`, () => {
        for (const plan of runs) {
          expect(own(plan)).toHaveLength(1);
          expect(own(plan)[0]!.at).toBeLessThan(plan.times.stretch);
        }
      });
      And('both come up across the runs', () => {
        const kinds = new Set(runs.flatMap((plan) => own(plan).map((event) => event.kind)));
        expect(kinds).toEqual(new Set(['burst', 'stop']));
      });
    });

    RuleScenarioOutline('On Autumn, <caption>', (steps, { event: kind, caption }) =>
      actOutOwnEvent(steps, {
        course: 'autumn',
        kind: kind as RaceEvent['kind'],
        caption,
        when: "someone's event is Autumn's own <event>",
      }),
    );

    RuleScenario('Everyone wears an acorn cap', ({ When, Then, And }) => {
      let drawn: SVGSVGElement[] = [];
      When('the show runs on Autumn', async () => {
        drawn = await dressedOn('autumn');
        expect(drawn).toHaveLength(DRESSED.size);
      });
      Then(
        'every rider wears an acorn cap instead of the cap, goggles or snorkel the kit hands out, and a top hat stays on the mount',
        () => {
          for (const svg of drawn.filter((each) => each.dataset.part === 'racer')) {
            const lean = svg.querySelector('[data-part="lean"]')!;
            const cap = lean.querySelector(':scope > [data-part="acorn-cap"] [data-part="hat"]')!;
            expect(cap.getAttribute('transform')).toBe('translate(50 24)');
            const classes = [...cap.children].map((shape) => shape.getAttribute('class'));
            expect(classes).toEqual([styles.line, styles.barkLine, styles.bark, styles.line]);
            expect(accessories(svg)).toHaveLength(0);
            expect(!!svg.querySelector('[data-part="mount"] [data-part="tophat"]')).toBe(
              svg.dataset.extra === 'tophat',
            );
          }
        },
      );
      And('every creature wears one where its top hat goes, instead of the top hat', () => {
        for (const svg of drawn.filter((each) => each.dataset.part === 'creature')) {
          const kind = svg.dataset.mount as Creature;
          if (kind === 'gnome') continue;
          const cap = svg.querySelector('[data-part="acorn-cap"]')!;
          const [x, y] = CREATURE_SPEC[kind].hat;
          expect(cap.getAttribute('transform'), kind).toBe(`translate(${x} ${y})`);
          expect(cap.querySelector(`.${styles.shade}`)).not.toBeNull();
          expect(svg.querySelector('[data-part="tophat"]'), kind).toBeNull();
        }
      });
      And('the garden gnome wears a small one on the tip of its own hat', () => {
        const gnomes = drawn.filter((each) => each.dataset.mount === 'gnome');
        expect(gnomes).toHaveLength(1);
        for (const gnome of gnomes) {
          const cap = gnome.querySelector('[data-part="acorn-cap"]')!;
          expect(cap.getAttribute('transform')).toBe('translate(130 -24) scale(0.55)');
          expect(gnome.querySelector('[data-part="hat"]')).not.toBeNull();
        }
      });
      And('on any other theme, nobody wears one', async () => {
        for (const course of COURSES.filter((each) => each !== 'autumn')) {
          const others = await dressedOn(course);
          for (const svg of others) {
            expect(svg.querySelector('[data-part="acorn-cap"]'), course).toBeNull();
          }
        }
      });
    });

    RuleScenario('The winner gets a golden acorn', ({ Given, When, Then, And }) => {
      let watched: Watched;
      let pieces: boolean[] = [];
      Given('the unlucky person is {string}, on Autumn', async (_, name: string) => {
        const people = ['Dario', 'Elena', 'Fabio', name];
        let seed = 1;
        while (planShow(people, name, createRandom(seed), 'autumn').ending !== 'brake') seed++;
        const { win } = planShow(people, name, createRandom(seed), 'autumn').times;
        watched = await watch(people, {
          unlucky: name,
          seed,
          course: 'autumn',
          onStage: (time, scene) => {
            if (time < win + 0.5 || pieces.length) return;
            pieces = [...scene.querySelectorAll<HTMLElement>('[data-part="confetti"]')].map(
              (piece) => piece.dataset.leaf === 'true',
            );
          },
        });
      });
      When('she has crossed the line', () => {
        expect(crossingOf(watched.plan, 'Anna')!).toBeLessThanOrEqual(watched.plan.times.finish);
      });
      Then(
        'the caption is {string}, with a fanfare and confetti with leaves in it',
        (_, caption: string) => {
          const { win } = watched.plan.times;
          expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
          expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
          // Sound isn't recorded: play.ts cues the fanfare as the caption comes.
          expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
          expect(pieces.filter(Boolean).length).toBeGreaterThan(5);
          expect(pieces.filter((leaf) => !leaf).length).toBeGreaterThan(5);
          expect(css).toMatch(/\.lens \{\s*border-radius: 0 100%;/);
        },
      );
      And('Anna holds up a golden acorn with a bark cap, where the trophy would be', () => {
        for (const frame of between(watched, watched.plan.times.win + STEP, Infinity)) {
          expect(frame.racers.Anna).toMatchObject({ trophy: true, mood: 'party' });
        }
        const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
        const dress = { costume: 'acorn', prize: 'golden-acorn' } as const;
        // As a rider, and as a creature that holds it overhead.
        const looks = [
          watched.looks.get('Anna'),
          { mount: 'snail', colour: 'mint', extra: 'number' },
          { mount: 'robot', colour: 'sun', extra: 'number' },
        ] as unknown as RacerLook[];
        for (const look of looks) {
          const balances =
            isCreature(look.mount) && CREATURE_SPEC[look.mount as Creature].reach < 1;
          if (balances) continue;
          const drawn = isCreature(look.mount)
            ? creature(look as never, { face, number: 4, dress })
            : racer(look as RideLook, { face, number: 4, dress });
          const plain = isCreature(look.mount)
            ? creature(look as never, { face, number: 4 })
            : racer(look as RideLook, { face, number: 4 });
          const acorn = drawn.el.querySelector('[data-part="golden-acorn"]')!;
          const trophy = plain.el.querySelector('[data-part="trophy"]')!;
          expect(drawn.el.querySelector('[data-part="trophy"]')).toBeNull();
          expect(acorn.getAttribute('x')).toBe(trophy.getAttribute('x'));
          expect(acorn.getAttribute('y')).toBe(trophy.getAttribute('y'));
          const classes = [...acorn.children].map((shape) => shape.getAttribute('class'));
          // A sun nut, under a bark cap.
          expect(classes[0]).toBe(styles.sun);
          expect(classes).toContain(styles.bark);
          expect(classes.indexOf(styles.bark)).toBeGreaterThan(0);
        }
      });
      And('whoever balances the trophy balances the acorn, on top of their acorn cap', () => {
        const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
        const dress = { costume: 'acorn', prize: 'golden-acorn' } as const;
        for (const kind of CREATURES) {
          const { reach, cup, hat } = CREATURE_SPEC[kind];
          const one = creature(
            { mount: kind, colour: 'sun', extra: 'scarf' },
            { face, number: 1, dress },
          );
          const top = Number(one.el.querySelector('[data-part="golden-acorn"]')!.getAttribute('y'));
          if (reach > 0 && reach < 1) {
            // The nut's tip on the cap, between its stalk's top and its rim.
            const size = kind === 'gnome' ? 0.55 : 1;
            expect(top + 58, kind).toBeGreaterThanOrEqual(hat[1] - 40 * size);
            expect(top + 58, kind).toBeLessThan(hat[1]);
          } else {
            expect(top, kind).toBe(cup[1]);
          }
        }
      });
    });

    RuleScenario('On Autumn, the unlucky person still crosses first', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('8 people, on Autumn', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plansOn(team, unlucky, 'autumn', seeds);
      });
      Then("the first nose over the finish line is always the unlucky person's", () => {
        for (const plan of runs) {
          const crossing = crossingOf(plan, unlucky);
          expect(crossing).not.toBeNull();
          expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
          for (const name of team.filter((each) => each !== unlucky)) {
            const theirs = crossingOf(plan, name);
            if (theirs !== null) expect(theirs).toBeGreaterThan(crossing!);
          }
        }
      });
    });

    RuleScenario('With reduced motion, Autumn keeps still too', ({ Given, When, Then }) => {
      const still: Record<RaceEvent['kind'], { watched: Watched; event: RaceEvent }> = {} as never;
      Given('reduced motion is on', () => undefined);
      When('the show runs on Autumn', async () => {
        for (const kind of ['stop', 'burst'] as const) {
          let seed = 1;
          const ownIs = (plan: Plan) => own(plan)[0]!.kind === kind;
          while (!ownIs(planShow(team, unlucky, createRandom(seed), 'autumn'))) seed++;
          const watched = await watch(team, { seed, course: 'autumn', reducedMotion: true });
          still[kind] = { watched, event: own(watched.plan)[0]! };
        }
      });
      Then(
        'no leaves fly up out of the pile, and the umbrella lifts its racer without swaying',
        () => {
          const of = (kind: RaceEvent['kind'], to: number) => {
            const { watched, event } = still[kind];
            return between(watched, event.at, event.at + to).map(
              (frame) => frame.racers[event.subject]!,
            );
          };
          const piled = of('stop', STOP.off);
          expect(piled.some((racer) => racer.track.includes('leaf-pile'))).toBe(true);
          for (const racer of piled) {
            expect(racer.track).not.toContain('flying-leaves');
            expect(racer.rotate).toBe('');
          }
          const blown = of('burst', BURST.seconds);
          expect(blown.every((racer) => racer.track.includes('umbrella'))).toBe(true);
          expect(Math.max(...blown.map((racer) => racer.lift))).toBeGreaterThan(8);
          for (const racer of blown) {
            expect(racer.sway).toBe(0);
            expect(racer.rotate).toBe('');
          }
        },
      );
    });
  });

  Rule("Autumn's own racers", ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const choices = lineUp.options[0]!.choices;
    const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
    /** The five racers, as the feature names them. */
    const FALL: Readonly<Record<string, Kind>> = {
      'giant leaf': 'leaf',
      squirrel: 'squirrel',
      hedgehog: 'hedgehog',
      mushroom: 'mushroom',
      acorn: 'acorn',
    };
    const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
    /** `kind` in `colour`, calm, as the show draws it, in the theme's `dress` if given. */
    const drawnAs = (
      kind: Kind,
      colour: RacerColour = 'tomato',
      dress?: Parameters<typeof creature>[1]['dress'],
    ) =>
      isCreature(kind)
        ? creature({ mount: kind, colour, extra: 'scarf' }, { face, number: 1, dress })
        : racer({ mount: kind, colour, extra: 'scarf' }, { face, number: 1, dress });
    /** Every shape in `svg` named `part`, but its groups. */
    const partsOf = (svg: Element, part: string) =>
      [...svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`)].filter(
        (shape) => shape.tagName !== 'g',
      );

    RuleScenario('Five racers for Autumn', ({ When, Then, And }) => {
      /** The racers in `group` right after `last`, which ends `held`. */
      const after = (group: string, held: string) => {
        const names = listed(held);
        const last = names.pop()!;
        const labels = choices
          .filter((choice) => choice.group === group)
          .map((choice) => read(choice.label));
        const from = labels.indexOf(last) + 1;
        expect(labels.slice(from, from + names.length)).toEqual(names);
      };
      When('the Line-up opens for The Race', () => {
        expect(lineUp.options[0]!.label).toBe('Racer');
      });
      Then('the group "Rides" also holds {any}', (_, held: string) => after('Rides', held));
      And('the group "Animals" also holds {any}', (_, held: string) => after('Animals', held));
      And('the group "Things on legs" also holds {any}', (_, held: string) =>
        after('Things on legs', held),
      );
      And('with Autumn chosen, its tab holds {any}', (_, held: string) => {
        const autumn = lineUp.themes!.find((each) => each.name === 'autumn')!;
        const labelOf = (name: string) =>
          read(choices.find((choice) => choice.name === name)!.label);
        expect(autumn.suits!.map(labelOf)).toEqual(listed(held));
      });
    });

    RuleScenario('The giant leaf', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let ivo: SVGSVGElement;
      Given('Ivo chose the giant leaf in sun', () => {
        looks.set('Ivo', { mount: 'leaf', colour: 'sun', extra: 'number' });
        looks.set('Anna', { mount: 'duck', colour: 'mint', extra: 'scarf' });
      });
      When('the show runs', async () => {
        ivo = (await firstDrawn(looks)).get('Ivo')!;
      });
      Then(
        'Ivo sits on a sun leaf with a face, floating on the breeze just off the ground, and holds its curled-up tip',
        () => {
          expect(ivo.dataset).toMatchObject({ part: 'racer', mount: 'leaf' });
          expect(ivo.style.getPropertyValue('--racer')).toBe('var(--color-sun)');
          const mount = ivo.querySelector('[data-part="mount"]')!;
          const blade = bounds(partsOf(mount, 'blade')[0]!.getAttribute('d')!);
          // Its face: two eyes and a smile on the blade, by its tip.
          const eyes = [...mount.querySelectorAll(`circle.${styles.inkFill}`)];
          expect(eyes).toHaveLength(2);
          for (const eye of eyes) {
            expect(Number(eye.getAttribute('cx'))).toBeGreaterThan(blade.left);
            expect(Number(eye.getAttribute('cx'))).toBeLessThan(blade.right);
          }
          // Under him, off the ground, over its shadow and the breeze.
          expect(blade.top).toBeLessThanOrEqual(SPEC.leaf.saddle[1]);
          expect(blade.bottom).toBeGreaterThan(SPEC.leaf.saddle[1]);
          expect(blade.bottom).toBeLessThan(RACER.feet - 30);
          const ground = partsOf(mount, 'leaf-shadow');
          expect(ground.map((shape) => shape.tagName)).toEqual(['ellipse', 'path']);
          expect(Number(ground[0]!.getAttribute('cy'))).toBeGreaterThan(RACER.feet - 6);
          expect(bounds(ground[1]!.getAttribute('d')!).top).toBeGreaterThan(blade.bottom);
          // No reins: his hand is on the tip, curled up at the front.
          expect(reined(ivo)).toBe(false);
          const [x, y] = SPEC.leaf.hold!;
          const tip = bounds(partsOf(mount, 'tip')[0]!.getAttribute('d')!);
          expect(x).toBeGreaterThanOrEqual(tip.left);
          expect(x).toBeLessThanOrEqual(tip.right);
          expect(y).toBeGreaterThanOrEqual(tip.top);
          expect(tip.top).toBeLessThan(blade.top);
          const fists = [...ivo.querySelectorAll(`[data-part="hands"] circle`)].filter(
            (fist) => fist.getAttribute('display') !== 'none',
          );
          expect(fists.map((fist) => [fist.getAttribute('cx'), fist.getAttribute('cy')])).toEqual([
            [String(x), String(y)],
          ]);
        },
      );
      And("his head is at the same height as every rider's", () => {
        expect(SPEC.leaf.saddle[1]).toBe(SPEC.snail.saddle[1]);
        for (const count of [2, 8]) {
          const at = lane(count - 1, count);
          expect(faceAt('leaf', at, 900).top).toBe(faceAt('snail', at, 900).top);
        }
      });
    });

    RuleScenario('Four creatures for Autumn', ({ When, Then, And }) => {
      let drawn: Record<
        'squirrel' | 'hedgehog' | 'mushroom' | 'acorn',
        ReturnType<typeof creature>
      >;
      /** Its legs' paint, and each foot's kind and its shoe's class. */
      const legsAndFeet = (one: ReturnType<typeof creature>) => ({
        legs: [...one.el.querySelectorAll<SVGElement>('path[data-part="legs"]')].map((leg) =>
          leg.style.getPropertyValue('--paint'),
        ),
        feet: one.shoes.map((shoe) => [
          shoe.dataset.foot,
          shoe.querySelector('[data-part="shoe"]')!.getAttribute('class'),
        ]),
      });
      const dark = {
        legs: ['var(--color-ink-soft)', 'var(--color-ink-soft)'],
        feet: [
          ['sneaker', styles.paper],
          ['sneaker', styles.paper],
        ],
      };
      /** Whether every eye of `one` is inside the box of the path named `part`. */
      const eyesOn = (one: ReturnType<typeof creature>, part: string) => {
        const box = bounds(partsOf(one.el, part)[0]!.getAttribute('d')!);
        return CREATURE_SPEC[one.look.mount].eyes.every(
          ([x, y]) => x > box.left && x < box.right && y > box.top && y < box.bottom,
        );
      };
      When('someone races as a squirrel, a hedgehog, a mushroom or an acorn', () => {
        drawn = {
          squirrel: drawnAs('squirrel') as ReturnType<typeof creature>,
          hedgehog: drawnAs('hedgehog') as ReturnType<typeof creature>,
          mushroom: drawnAs('mushroom') as ReturnType<typeof creature>,
          acorn: drawnAs('acorn') as ReturnType<typeof creature>,
        };
      });
      Then(
        'the squirrel has a bushy tail curling up behind it, a white belly and buck teeth, and runs on bare paws',
        () => {
          const { squirrel } = drawn;
          const own = squirrel.el.querySelector('[data-part="own"]')!;
          // Its tail first, behind the rest, and as tall as its head.
          const tail = partsOf(own, 'tail')[0]!;
          expect(own.firstElementChild).toBe(tail);
          expect(tail.getAttribute('class')).toBe(styles.racer);
          const ys = (tail.getAttribute('d')!.match(/-?[\d.]+/g) ?? [])
            .map(Number)
            .filter((_, i) => i % 2);
          expect(Math.min(...ys)).toBeLessThan(CREATURE_SPEC.squirrel.eyes[0]![1]);
          expect(partsOf(own, 'belly')[0]!.getAttribute('class')).toBe(styles.paper);
          // A buck tooth under its smirk.
          const tooth = squirrel.el.querySelector('[data-part="fangs"]')!;
          expect(tooth.getAttribute('display')).not.toBe('none');
          expect(tooth.getAttribute('d')).toMatch(/h8 v9 h-8 Z/);
          expect(legsAndFeet(squirrel)).toEqual({
            legs: ['var(--racer)', 'var(--racer)'],
            feet: [
              ['bare', styles.racer],
              ['bare', styles.racer],
            ],
          });
        },
      );
      And(
        'the hedgehog has spines over its back and head, a pointed snout with a black nose, and runs on bare feet',
        () => {
          const { hedgehog } = drawn;
          const spec = CREATURE_SPEC.hedgehog;
          const spines = bounds(partsOf(hedgehog.el, 'spines')[0]!.getAttribute('d')!);
          // Back past its hips and up over its eyes.
          expect(spines.left).toBeLessThan(spec.hips[0][0] - 40);
          expect(spines.top).toBeLessThan(Math.min(...spec.eyes.map(([, y]) => y)) - 30);
          const snout = partsOf(hedgehog.el, 'snout')[0]!;
          expect(snout.getAttribute('class')).toBe(styles.tomatoSoft);
          // Pointed: it narrows to the black nose at its tip.
          const nose = partsOf(hedgehog.el, 'nose')[0]!;
          expect(nose.getAttribute('class')).toBe(styles.inkFill);
          expect(Number(nose.getAttribute('cx')) + Number(nose.getAttribute('r'))).toBe(spec.nose);
          expect(bounds(snout.getAttribute('d')!).right).toBeGreaterThan(spec.nose - 10);
          expect(legsAndFeet(hedgehog)).toEqual({
            legs: ['var(--color-bark)', 'var(--color-bark)'],
            feet: [
              ['bare', styles.bark],
              ['bare', styles.bark],
            ],
          });
        },
      );
      And(
        'the mushroom has a spotted cap and its face on a white stalk, on dark legs in white sneakers',
        () => {
          const { mushroom } = drawn;
          const spots = partsOf(mushroom.el, 'spots');
          expect(spots.length).toBeGreaterThanOrEqual(5);
          for (const spot of spots) expect(spot.getAttribute('class')).toBe(styles.paper);
          expect(partsOf(mushroom.el, 'stalk')[0]!.getAttribute('class')).toBe(styles.paper);
          expect(eyesOn(mushroom, 'stalk')).toBe(true);
          expect(eyesOn(mushroom, 'cap')).toBe(false);
          expect(legsAndFeet(mushroom)).toEqual(dark);
        },
      );
      And(
        'the acorn has its face on the nut under a scaly bark cap with a stalk, on dark legs in white sneakers',
        () => {
          const { acorn } = drawn;
          expect(eyesOn(acorn, 'nut')).toBe(true);
          const cap = partsOf(acorn.el, 'scaly-cap')[0]!;
          expect(cap.getAttribute('class')).toBe(styles.bark);
          // Over the nut, its scales on it and its stalk on top.
          expect(bounds(cap.getAttribute('d')!).top).toBeLessThan(
            bounds(partsOf(acorn.el, 'nut')[0]!.getAttribute('d')!).top,
          );
          const scales = cap.nextElementSibling!;
          expect(scales.getAttribute('class')).toBe(styles.line);
          expect(scales.getAttribute('d')!.match(/M/g)!.length).toBeGreaterThanOrEqual(12);
          const stalk = partsOf(acorn.el, 'stalk').map((line) => line.getAttribute('class'));
          expect(stalk).toEqual([styles.line, styles.barkLine]);
          expect(legsAndFeet(acorn)).toEqual(dark);
        },
      );
      And("on Autumn, the acorn's own cap is all it wears", () => {
        const dress = { costume: 'acorn', prize: 'golden-acorn' } as const;
        const acorn = drawnAs('acorn', 'sun', dress);
        expect(acorn.el.querySelector('[data-part="acorn-cap"]')).toBeNull();
        expect(partsOf(acorn.el, 'scaly-cap')).toHaveLength(1);
        // Every other Autumn racer wears an acorn cap.
        for (const kind of ['leaf', 'squirrel', 'hedgehog', 'mushroom'] as const) {
          expect(
            drawnAs(kind, 'sun', dress).el.querySelector('[data-part="acorn-cap"]'),
            kind,
          ).not.toBeNull();
        }
      });
    });

    RuleScenarioOutline(
      'Where an autumn <racer> wears its colour',
      ({ When, Then }, { racer: called }) => {
        let svg: SVGSVGElement;
        /** Where each wears its colour: its parts so named. */
        const WEARS: Readonly<Record<string, readonly string[]>> = {
          'giant leaf': ['blade', 'tip'],
          squirrel: ['fur', 'tail', 'hand', 'shoe'],
          hedgehog: ['spines'],
          mushroom: ['cap'],
          acorn: ['nut'],
        };
        When('someone races as a <racer> in tomato', () => {
          svg = drawnAs(FALL[called]!).el;
        });
        Then('<where> is tomato', () => {
          expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
          for (const part of WEARS[called]!) {
            const shapes = partsOf(svg, part);
            expect(shapes.length, part).toBeGreaterThanOrEqual(1);
            for (const shape of shapes) {
              expect(shape.getAttribute('class'), `${called} ${part}`).toBe(
                part === 'tip' ? styles.racerLine : styles.racer,
              );
            }
          }
        });
      },
    );

    /** Five people on the giant leaf, or two as a creature, the burst and stop `name`'s. */
    const run = (called: string, name: string, reducedMotion = false) => {
      const kind = FALL[called]!;
      return isCreature(kind)
        ? shared.thing(kind, name, reducedMotion)
        : shared.mount(kind, name, reducedMotion);
    };

    RuleScenarioOutline(
      'An autumn <racer> bursts ahead',
      ({ When, Then, And }, { racer: called, name, burst }) => {
        let watched: Watched;
        When("someone's <racer> bursts ahead", async () => {
          watched = await run(called, name);
        });
        Then(`the caption is "<name>'s <racer> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, shouting "Nooo!", or its rider does', () => {
          const { at } = watched.plan.events[0]!;
          const during = between(watched, at, at + BURST.seconds).map(
            (frame) => frame.racers[name]!,
          );
          const before = between(watched, at - 0.5, at).map((frame) => frame.racers[name]!);
          /** How long the burst shows `prop`, in seconds. */
          const showing = (prop: string) =>
            during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
          const kind = FALL[called]!;
          const prop = {
            leaf: 'breeze',
            squirrel: 'blur',
            hedgehog: 'ball',
            mushroom: 'burrow',
            acorn: 'chaser',
          }[kind as 'leaf'];
          expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
          for (const racer of before) expect(racer.props).not.toContain(prop);
          switch (kind) {
            case 'leaf': {
              // Up off the ground, sailing most of the burst.
              expect(before.every((racer) => racer.hop === 0)).toBe(true);
              const high = during.filter((racer) => racer.hop > 25);
              expect(high.length * STEP).toBeGreaterThanOrEqual(0.3);
              break;
            }
            case 'squirrel':
              // Its tail whirls round.
              expect(Math.max(...during.map((racer) => racer.whirl))).toBeGreaterThan(180);
              break;
            case 'hedgehog':
              // Curled up, nothing of it shows but the ball, rolling.
              expect(during.every((racer) => !racer.legs)).toBe(true);
              expect(Math.max(...during.map((racer) => racer.spin))).toBeGreaterThan(180);
              break;
            case 'mushroom': {
              // Down into the ground, and up again by the end.
              const height = (racer: Drawn) => Number(racer.scale.split(' ')[1] ?? 1);
              expect(Math.min(...during.map(height))).toBe(0);
              const after = between(watched, at + BURST.seconds, at + BURST.seconds + 0.3);
              for (const frame of after) expect(frame.racers[name]!.scale).toBe('');
              break;
            }
            case 'acorn':
              break;
          }
          // Gone once the burst is over.
          const done = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
          for (const frame of done) expect(frame.racers[name]!.props).not.toContain(prop);
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + BURST.seconds)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        });
      },
    );

    RuleScenarioOutline(
      'An autumn <racer> stops',
      ({ When, Then, And }, { racer: called, name, stop }) => {
        let watched: Watched;
        /** The stopped racer, frame by frame from the stop to the next event or the run's end. */
        const during = () => {
          const { at } = watched.plan.events[1]!;
          return watched.frames
            .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
            .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
        };
        When("someone's <racer> stops", async () => {
          watched = await run(called, name);
        });
        Then(`the caption is "<name>'s <racer> <stop>!"`, () => {
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
          /** The first time in the stop it shows `prop`. */
          const first = (prop: string) =>
            stopped.find((frame) => frame.racer.props.split(' ').includes(prop))?.since ?? -1;
          switch (FALL[called]) {
            case 'leaf': {
              // Down in the puddle, turning round in it.
              expect(showing('puddle')).toBeGreaterThanOrEqual(1);
              expect(Math.min(...before.map((frame) => frame.racer.hop))).toBeLessThan(-20);
              const turns = before.map((frame) => Number(frame.racer.scale.split(' ')[0] || 1));
              expect(Math.min(...turns)).toBeLessThan(-0.9);
              break;
            }
            case 'squirrel': {
              // A hole, then the acorn in it, then the earth patted down over it.
              const [hole, nut, mound] = ['hole', 'nut', 'mound'].map(first);
              expect(hole).toBeGreaterThan(0);
              expect(nut).toBeGreaterThan(hole);
              expect(mound).toBeGreaterThan(nut);
              const bent = before.filter((frame) => frame.racer.bend > 15);
              expect(bent.length * STEP).toBeGreaterThanOrEqual(1);
              break;
            }
            case 'hedgehog': {
              // Leaves on its spines, shaken off by "Phew!".
              expect(showing('stuck')).toBeGreaterThanOrEqual(1);
              expect(Math.max(...before.map((frame) => frame.racer.shake))).toBeGreaterThan(4);
              break;
            }
            case 'mushroom': {
              // A puff of spores, and "Achoo!", with a bow.
              expect(showing('spores')).toBeGreaterThanOrEqual(0.8);
              const achoo = stopped.filter((frame) => saying(frame, name, 'Achoo!'));
              expect(achoo.length).toBeGreaterThan(0);
              expect(achoo[0]!.since).toBeCloseTo(first('spores'), 5);
              expect(Math.max(...before.map((frame) => frame.racer.bend))).toBeGreaterThan(15);
              break;
            }
            case 'acorn': {
              // Its cap on the ground while it bends for it.
              expect(showing('cap')).toBeGreaterThanOrEqual(0.8);
              const bending = before.filter(
                (frame) => frame.racer.bend > 20 && frame.racer.props.includes('cap'),
              );
              expect(bending.length * STEP).toBeGreaterThanOrEqual(0.5);
              break;
            }
          }
          const start = stopped[0]!;
          const last = stopped.at(-1)!;
          expect(last.racer.nose).toBeLessThan(start.racer.nose - 200);
          expect(last.camera).toBeGreaterThan(start.camera + 300);
        });
        And('it waves, says "Phew!", and sets off again further back, or its rider does', () => {
          const frames = during();
          const waving = frames.filter(
            ({ racer }) => racer.stopped && racer.pose === 'wave' && racer.bend === 0,
          );
          expect(waving.length).toBeGreaterThan(0);
          expect(frames.some((frame) => saying(frame, name, 'Phew!'))).toBe(true);
          const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
          expect(off.racer.stopped).toBe(false);
          expect(off.racer.gait).toBe('on');
          expect(off.racer.props).toBe('');
          expect([off.racer.bend, off.racer.shake, off.racer.hop, off.racer.scale]).toEqual([
            0,
            0,
            0,
            '',
          ]);
          const { at } = watched.plan.events[1]!;
          expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
            orderAt(watched.plan, at - 0.01).indexOf(name),
          );
        });
      },
    );

    RuleScenario(
      'With reduced motion, the Autumn racers keep still too',
      ({ Given, When, Then }) => {
        let squirrel: Watched;
        let hedgehog: Watched;
        let leaf: Watched;
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          squirrel = await run('squirrel', 'Giulia', true);
          hedgehog = await run('hedgehog', 'Marco', true);
          leaf = await run('giant leaf', 'Ivo', true);
        });
        Then(
          "the squirrel's tail doesn't whirl, the hedgehog doesn't spin as it rolls, and the giant leaf doesn't turn in its puddle",
          () => {
            /** `name` in `watched`, frame by frame, from its `index`th event for `seconds`. */
            const of = (watched: Watched, name: string, index: number, seconds: number) => {
              const { at } = watched.plan.events[index]!;
              return between(watched, at, at + seconds).map((frame) => frame.racers[name]!);
            };
            const whirling = of(squirrel, 'Giulia', 0, BURST.seconds);
            expect(whirling.every((racer) => racer.props.includes('blur'))).toBe(true);
            for (const racer of whirling) expect(racer.whirl).toBe(0);
            const rolling = of(hedgehog, 'Marco', 0, BURST.seconds);
            expect(rolling.every((racer) => racer.props.includes('ball'))).toBe(true);
            for (const racer of rolling) expect(racer.spin).toBe(0);
            const wet = of(leaf, 'Ivo', 1, STOP.phew);
            expect(wet.every((racer) => racer.props.includes('puddle'))).toBe(true);
            for (const racer of wet) expect(racer.scale).toBe('');
          },
        );
      },
    );
  });
});
