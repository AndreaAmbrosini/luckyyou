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
  racer,
  SPEC,
  type Creature,
  type Kind,
  type RacerColour,
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
  type Watched,
  watch,
  captions,
  between,
  saying,
  headOf,
  shared,
  firstDrawn,
  ends,
  reined,
  plansOn,
  type OnTrack,
  onTrack,
  actOutOwnEvent,
  DRESSED,
  dressedOn,
  accessories,
} from './watching';

describeSpec(await loadFeature('./christmas.feature'), ({ Rule }) => {
  Rule('Christmas', ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');
    const christmas = () => lineUp.themes!.find((each) => each.name === 'christmas')!;

    RuleScenario('Christmas is a theme, after Autumn', ({ When, Then, And }) => {
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then('"Christmas" is a theme, after "Autumn", its postcard a tree on snow at dusk', () => {
        const labels = lineUp.themes!.map((theme) => theme.label);
        expect(labels.indexOf('Christmas')).toBe(labels.indexOf('Autumn') + 1);
        const picture = christmas().picture() as SVGSVGElement;
        expect(picture.dataset).toMatchObject({ part: 'postcard', course: 'christmas' });
        const classes = [...picture.querySelectorAll('path')].map((path) =>
          path.getAttribute('class'),
        );
        // Dusk, the tree with its star, and snow on the ground, last.
        expect(classes[0]).toBe(styles.seaBlue);
        expect(classes).toContain(styles.leaf);
        expect(classes).toContain(styles.sun);
        expect(classes.at(-1)).toBe(styles.snow);
      });
      And(`with Christmas chosen, the racer option's first tab is "Christmas racers"`, () => {
        // specs/line-up.feature: the sheet shows a theme's suits first, in its words.
        expect(`${christmas().label} ${lineUp.words!.choices}`).toBe('Christmas racers');
        expect(christmas().suits!.length).toBeGreaterThan(0);
      });
    });

    RuleScenario('What Christmas looks like', ({ When, Then, And }) => {
      let run: OnTrack;
      When('the show runs on Christmas', async () => {
        run = await onTrack('christmas');
      });
      Then(
        'the ground is snow, the lanes split by light blue lines, and paper name tags read clearly on it',
        () => {
          const ground = run.track.querySelector('[data-part="ground"]')!;
          expect(ground.querySelector(`.${styles.snow}`)).not.toBeNull();
          expect(css).toMatch(/\.snow \{\s*fill: var\(--color-paper\);/);
          const lines = [...run.track.querySelectorAll('[data-part="lines"] path')];
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) expect(line.getAttribute('class')).toBe(styles.glassFill);
          expect(css).toMatch(/\.glassFill \{\s*fill: var\(--color-glass\);/);
          const tags = run.stickers.filter((sticker) => sticker.what === 'tag');
          expect(tags.length).toBeGreaterThan(0);
          for (const tag of tags) expect(tag.background).toBe('var(--color-paper)');
        },
      );
      And(
        'behind the track is a snowy village at dusk: white hills, two houses with lit windows, pines, a big tree with a star, and a crescent moon',
        () => {
          expect(run.sky).toBe('var(--color-sea)');
          const back = run.track.querySelector('[data-part="backdrop"]')!;
          const first = (part: string) => back.querySelector(`[data-part="${part}"]`);
          const tile = (part: string) =>
            [...first(part)!.children[0]!.children].map((shape) => ({
              part: shape.getAttribute('data-part'),
              className: shape.getAttribute('class'),
            }));
          expect(tile('hills').map((shape) => shape.className)).toEqual([
            styles.paperFill,
            styles.line,
          ]);
          const village = tile('village');
          expect(village.filter((shape) => shape.part === 'house').map((s) => s.className)).toEqual(
            [styles.tomato, styles.mint],
          );
          expect(village.filter((shape) => shape.part === 'windows')).toHaveLength(2);
          for (const part of ['pines', 'tree', 'baubles', 'star']) {
            expect(village.map((shape) => shape.part)).toContain(part);
          }
          expect(tile('night').map((shape) => shape.part)).toContain('moon');
          // The houses' windows, the star and the moon are lit: sun.
          expect(village.find((shape) => shape.part === 'star')!.className).toBe(styles.sun);
        },
      );
      And(
        'fairy lights run along the edge of the track, and each distance is a paper sign by a candy cane',
        () => {
          const bulbs = [...run.track.querySelector('[data-part="lights"]')!.children[0]!.children];
          expect(bulbs.map((bulb) => bulb.getAttribute('class'))).toEqual([
            styles.tomato,
            styles.sun,
            styles.mint,
            styles.pink,
          ]);
          const signs = [...run.track.querySelectorAll<HTMLElement>('[data-part="sign"]')];
          expect(signs).toHaveLength(5);
          for (const sign of signs) {
            const board = sign.querySelector('p')!;
            const distance = board.textContent!.endsWith(' m');
            expect(!!sign.querySelector('[data-part="cane"]'), board.textContent!).toBe(distance);
            expect(board.classList.contains(styles.sunBoard!)).toBe(!distance);
            expect(sign.querySelector(`.${styles.post}`)).toBeNull();
          }
          const cane = signs[1]!.querySelector('[data-part="cane"]')!;
          expect([...cane.children].map((stroke) => stroke.getAttribute('class'))).toEqual([
            styles.line,
            styles.stripe,
            styles.caneStripe,
          ]);
          expect(css).toMatch(/\.caneStripe \{\s*fill: none;\s*stroke: var\(--color-tomato\);/);
        },
      );
    });

    RuleScenario('Christmas has a stop and a burst of its own', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, on Christmas', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plansOn(team, unlucky, 'christmas', seeds);
      });
      Then(
        `in every run, one event before "Final stretch!" is Christmas's own stop or burst`,
        () => {
          for (const plan of runs) {
            expect(own(plan)).toHaveLength(1);
            expect(own(plan)[0]!.at).toBeLessThan(plan.times.stretch);
          }
        },
      );
      And('both come up across the runs', () => {
        const kinds = new Set(runs.flatMap((plan) => own(plan).map((event) => event.kind)));
        expect(kinds).toEqual(new Set(['burst', 'stop']));
      });
    });

    RuleScenarioOutline('On Christmas, <caption>', (steps, { event: kind, caption }) =>
      actOutOwnEvent(steps, {
        course: 'christmas',
        kind: kind as RaceEvent['kind'],
        caption,
        when: "someone's event is Christmas's own <event>",
      }),
    );

    RuleScenario('Everyone wears a Santa hat', ({ When, Then, And }) => {
      let drawn: SVGSVGElement[] = [];
      When('the show runs on Christmas', async () => {
        drawn = await dressedOn('christmas');
        expect(drawn).toHaveLength(DRESSED.size);
      });
      Then(
        'every rider wears a Santa hat instead of the cap, goggles or snorkel the kit hands out, and a top hat stays on the mount',
        () => {
          for (const svg of drawn.filter((each) => each.dataset.part === 'racer')) {
            const lean = svg.querySelector('[data-part="lean"]')!;
            expect(
              lean.querySelector(':scope > [data-part="santa"] [data-part="hat"]'),
            ).not.toBeNull();
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
          const hat = svg.querySelector('[data-part="santa"]')!;
          const [x, y] = CREATURE_SPEC[kind].hat;
          expect(hat.getAttribute('transform'), kind).toBe(`translate(${x} ${y})`);
          expect(hat.querySelector(`.${styles.shade}`)).not.toBeNull();
          expect(svg.querySelector('[data-part="tophat"]'), kind).toBeNull();
        }
      });
      And("the garden gnome's own hat gets a white brim and a bobble instead", () => {
        const gnomes = drawn.filter((each) => each.dataset.mount === 'gnome');
        expect(gnomes).toHaveLength(1);
        for (const gnome of gnomes) {
          const brim = gnome.querySelector('[data-part="santa"]')!;
          expect([...brim.children].map((shape) => shape.getAttribute('class'))).toEqual([
            styles.paper,
            styles.paper,
          ]);
          expect(brim.querySelector(`.${styles.tomato}`)).toBeNull();
          expect(gnome.querySelector('[data-part="hat"]')).not.toBeNull();
        }
      });
      And('on any other theme, nobody wears one', async () => {
        for (const course of COURSES.filter((each) => each !== 'christmas')) {
          const others = await dressedOn(course);
          for (const svg of others) {
            expect(svg.querySelector('[data-part="santa"]'), course).toBeNull();
            if (svg.dataset.part === 'racer') {
              expect(accessories(svg), course).toHaveLength(course === 'autumn' ? 0 : 1);
            }
          }
        }
      });
    });

    RuleScenario('The winner gets a present', ({ Given, When, Then, And }) => {
      let watched: Watched;
      let flakes: boolean[] = [];
      Given('the unlucky person is {string}, on Christmas', async (_, name: string) => {
        const people = ['Dario', 'Elena', 'Fabio', name];
        let seed = 1;
        while (planShow(people, name, createRandom(seed), 'christmas').ending !== 'brake') seed++;
        const { win } = planShow(people, name, createRandom(seed), 'christmas').times;
        watched = await watch(people, {
          unlucky: name,
          seed,
          course: 'christmas',
          onStage: (time, scene) => {
            if (time < win + 0.5 || flakes.length) return;
            flakes = [...scene.querySelectorAll<HTMLElement>('[data-part="confetti"]')].map(
              (piece) => piece.dataset.flake === 'true',
            );
          },
        });
      });
      When('she has crossed the line', () => {
        expect(crossingOf(watched.plan, 'Anna')!).toBeLessThanOrEqual(watched.plan.times.finish);
      });
      Then(
        'the caption is {string}, with a fanfare and confetti with snowflakes in it',
        (_, caption: string) => {
          const { win } = watched.plan.times;
          expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
          expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
          // Sound isn't recorded: play.ts cues the fanfare as the caption comes.
          expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
          expect(flakes.filter(Boolean).length).toBeGreaterThan(5);
          expect(flakes.filter((flake) => !flake).length).toBeGreaterThan(5);
          expect(css).toMatch(/\.flake \{\s*border-radius: var\(--radius-pill\);/);
        },
      );
      And(
        'Anna holds up a present, red with a gold ribbon and bow, where the trophy would be',
        () => {
          for (const frame of between(watched, watched.plan.times.win + STEP, Infinity)) {
            expect(frame.racers.Anna).toMatchObject({ trophy: true, mood: 'party' });
          }
          const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
          const look = watched.looks.get('Anna') as unknown as Parameters<typeof racer>[0];
          const dress = { costume: 'santa', prize: 'present' } as const;
          const drawn = isCreature(look.mount)
            ? creature(look as never, { face, number: 4, dress })
            : racer(look, { face, number: 4, dress });
          const plain = isCreature(look.mount)
            ? creature(look as never, { face, number: 4 })
            : racer(look, { face, number: 4 });
          const present = drawn.el.querySelector('[data-part="present"]')!;
          const trophy = plain.el.querySelector('[data-part="trophy"]')!;
          expect(drawn.el.querySelector('[data-part="trophy"]')).toBeNull();
          expect(present.getAttribute('x')).toBe(trophy.getAttribute('x'));
          expect(present.getAttribute('y')).toBe(trophy.getAttribute('y'));
          const classes = [...present.children].map((shape) => shape.getAttribute('class'));
          expect(classes.slice(0, 2)).toEqual([styles.tomato, styles.tomato]);
          expect(classes.slice(2, 5)).toEqual([styles.sun, styles.sun, styles.sun]);
        },
      );
      And(
        'whoever balances the trophy balances the present, the dinosaur and the pigeon on top of their Santa hat',
        () => {
          const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
          const dress = { costume: 'santa', prize: 'present' } as const;
          for (const kind of CREATURES) {
            const { reach, cup, hat } = CREATURE_SPEC[kind];
            const one = creature(
              { mount: kind, colour: 'sun', extra: 'scarf' },
              { face, number: 1, dress },
            );
            const top = Number(one.el.querySelector('[data-part="present"]')!.getAttribute('y'));
            if (kind === 'dinosaur' || kind === 'pigeon') {
              // Its bottom on the hat's cone and tail, which reach 54 and 60 over the brim's bottom.
              expect(top + 57, kind).toBeGreaterThan(hat[1] - 60);
              expect(top + 57, kind).toBeLessThan(hat[1] - 15);
            } else {
              expect(top, kind).toBe(cup[1]);
            }
            if (reach < 1 && reach > 0) expect(['dinosaur', 'pigeon', 'gnome']).toContain(kind);
          }
        },
      );
    });

    RuleScenario(
      'On Christmas, the unlucky person still crosses first',
      ({ Given, When, Then }) => {
        let runs: Plan[];
        Given('8 people, on Christmas', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, 'christmas', seeds);
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
      },
    );
  });

  Rule("Christmas's own racers", ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const choices = lineUp.options[0]!.choices;
    const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
    /** The four racers, as the feature names them. */
    const XMAS: Readonly<Record<string, Kind>> = {
      reindeer: 'reindeer',
      snowman: 'snowman',
      gingerbread: 'gingerbread',
      'Christmas tree': 'tree',
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
    RuleScenario('Four racers for Christmas', ({ When, Then, And }) => {
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
      And('the group "Things on legs" also holds {any}', (_, held: string) =>
        after('Things on legs', held),
      );
      And('with Christmas chosen, its tab holds {any}', (_, held: string) => {
        const christmas = lineUp.themes!.find((each) => each.name === 'christmas')!;
        const labelOf = (name: string) =>
          read(choices.find((choice) => choice.name === name)!.label);
        expect(christmas.suits!.map(labelOf)).toEqual(listed(held));
      });
    });

    RuleScenario('The reindeer, reins up its neck', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let ivo: SVGSVGElement;
      Given('Ivo chose the reindeer in grape', () => {
        looks.set('Ivo', { mount: 'reindeer', colour: 'grape', extra: 'number' });
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
      });
      When('the show runs', async () => {
        ivo = (await firstDrawn(looks)).get('Ivo')!;
      });
      Then(
        'Ivo rides a brown reindeer with cream antlers, a red nose, a gold collar with a bell, and a grape blanket under him',
        () => {
          expect(ivo.dataset).toMatchObject({ part: 'racer', mount: 'reindeer' });
          const mount = ivo.querySelector('[data-part="mount"]')!;
          // Its body, head and muzzle in bark, its legs and neck painted bark.
          expect(mount.querySelectorAll(`ellipse.${styles.bark}`)).toHaveLength(3);
          for (const leg of partsOf(mount, 'legs').filter((shape) => shape.style.length)) {
            expect(leg.style.getPropertyValue('--paint')).toBe('var(--color-bark)');
          }
          const antlers = partsOf(mount, 'antlers').map((shape) =>
            shape.style.getPropertyValue('--paint'),
          );
          expect(antlers).toContain('var(--color-tomato-soft)');
          expect(partsOf(mount, 'nose')[0]!.getAttribute('class')).toBe(styles.tomato);
          expect(partsOf(mount, 'collar')[0]!.getAttribute('class')).toBe(styles.sunLine);
          expect(partsOf(mount, 'bell')[0]!.getAttribute('class')).toBe(styles.sun);
          expect(ivo.style.getPropertyValue('--racer')).toBe('var(--color-grape)');
          const blanket = partsOf(mount, 'blanket')[0]!;
          expect(blanket.getAttribute('class')).toBe(styles.racer);
          // Under him: the blanket's top edge is the saddle, where the shirt sits.
          const { top, bottom } = bounds(blanket.getAttribute('d')!);
          expect(top).toBeLessThanOrEqual(SPEC.reindeer.saddle[1]);
          expect(bottom).toBeGreaterThan(SPEC.reindeer.saddle[1]);
        },
      );
      And(
        "he holds reins tied on up its neck, above the collar, in a grape shirt, his head at the same height as every rider's",
        () => {
          expect(reined(ivo)).toBe(true);
          const [x, y] = SPEC.reindeer.reins!;
          expect(ends(ivo.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
          // Where the canvas ties them: up the neck past the collar, under the head.
          const mount = ivo.querySelector('[data-part="mount"]')!;
          const collar = bounds(partsOf(mount, 'collar')[0]!.getAttribute('d')!);
          expect(x).toBeGreaterThan(collar.right);
          expect(y).toBeLessThan(collar.top);
          expect(y).toBeGreaterThan(90);
          expect(headOf(ivo).style.getPropertyValue('--shirt')).toBe('var(--color-grape)');
          expect(SPEC.reindeer.saddle[1]).toBe(SPEC.snail.saddle[1]);
          for (const count of [2, 8]) {
            const at = lane(count - 1, count);
            expect(faceAt('reindeer', at, 900).top).toBe(faceAt('snail', at, 900).top);
          }
        },
      );
    });

    RuleScenario('Three things on legs for Christmas', ({ When, Then, And }) => {
      let drawn: Record<'snowman' | 'gingerbread' | 'tree', ReturnType<typeof creature>>;
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
      /** The fills of its shaded parts, back to front. */
      const fills = (one: ReturnType<typeof creature>) =>
        [...one.el.querySelectorAll('[data-part="own"] [data-part="shade"]')].map((shade) => {
          const d = shade.getAttribute('d');
          return [...shade.parentElement!.children]
            .find((each) => each.getAttribute('d') === d)!
            .getAttribute('class');
        });
      When('someone races as a snowman, a gingerbread or a Christmas tree', () => {
        drawn = {
          snowman: creature(
            { mount: 'snowman', colour: 'tomato', extra: 'scarf' },
            { face, number: 1 },
          ),
          gingerbread: creature(
            { mount: 'gingerbread', colour: 'tomato', extra: 'scarf' },
            { face, number: 1 },
          ),
          tree: creature({ mount: 'tree', colour: 'tomato', extra: 'scarf' }, { face, number: 1 }),
        };
      });
      Then(
        'the snowman is two snowballs with a carrot nose, on dark legs in white sneakers',
        () => {
          const { snowman } = drawn;
          expect(fills(snowman)).toEqual([styles.paper, styles.paper]);
          const carrot = partsOf(snowman.el, 'carrot')[0]!;
          expect(carrot.getAttribute('class')).toBe(styles.orange);
          // Its point is the snowman's nose.
          expect(bounds(carrot.getAttribute('d')!).right).toBe(CREATURE_SPEC.snowman.nose);
          expect(legsAndFeet(snowman)).toEqual(dark);
        },
      );
      And(
        'the gingerbread is a cookie with white icing, on cookie legs and feet, its hands cookie too',
        () => {
          const { gingerbread } = drawn;
          expect(fills(gingerbread)).toEqual([styles.bark, styles.bark]);
          const icing = partsOf(gingerbread.el, 'icing');
          expect(icing).toHaveLength(2);
          for (const line of icing) expect(line.getAttribute('class')).toBe(styles.stripe);
          expect(legsAndFeet(gingerbread)).toEqual({
            legs: ['var(--color-bark)', 'var(--color-bark)'],
            feet: [
              ['bare', styles.bark],
              ['bare', styles.bark],
            ],
          });
          const hands = partsOf(gingerbread.el, 'hand');
          expect(hands).toHaveLength(2);
          for (const hand of hands) expect(hand.getAttribute('class')).toBe(styles.bark);
        },
      );
      And(
        'the Christmas tree is two green tiers with a gold garland and a star on top, on dark legs in white sneakers',
        () => {
          const { tree } = drawn;
          expect(fills(tree)).toEqual([styles.leaf, styles.leaf]);
          const garland = partsOf(tree.el, 'garland').map((line) => line.getAttribute('class'));
          expect(garland).toEqual([styles.line, styles.sunLine]);
          const star = partsOf(tree.el, 'star')[0]!;
          expect(star.getAttribute('class')).toBe(styles.sun);
          // On top: over the top tier's tip at y 12.
          expect(bounds(star.getAttribute('d')!).bottom).toBeLessThan(24);
          expect(bounds(star.getAttribute('d')!).top).toBeLessThan(12);
          expect(legsAndFeet(tree)).toEqual(dark);
        },
      );
      And('at Christmas, the tree wears its Santa hat instead of its star', () => {
        const dress = { costume: 'santa', prize: 'present' } as const;
        const tree = creature(
          { mount: 'tree', colour: 'sun', extra: 'tophat' },
          { face, number: 1, dress },
        );
        expect(tree.el.querySelector('[data-part="star"]')).toBeNull();
        const [x, y] = CREATURE_SPEC.tree.hat;
        expect(tree.el.querySelector('[data-part="santa"]')!.getAttribute('transform')).toBe(
          `translate(${x} ${y})`,
        );
        // Every other Christmas racer keeps what it has and wears the hat too.
        for (const kind of ['reindeer', 'snowman', 'gingerbread'] as const) {
          expect(
            drawnAs(kind, 'sun', dress).el.querySelector('[data-part="santa"]'),
            kind,
          ).not.toBeNull();
        }
      });
    });

    RuleScenarioOutline('Where a <racer> wears its colour', ({ When, Then }, { racer: called }) => {
      let svg: SVGSVGElement;
      /** Where each wears its colour: its parts so named. */
      const WEARS: Readonly<Record<string, readonly string[]>> = {
        reindeer: ['blanket'],
        snowman: ['buttons', 'hand'],
        gingerbread: ['buttons'],
        'Christmas tree': ['baubles'],
      };
      When('someone races as a <racer> in tomato', () => {
        svg = drawnAs(XMAS[called]!).el;
      });
      Then('<where> is tomato', () => {
        expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
        for (const part of WEARS[called]!) {
          const shapes = partsOf(svg, part);
          expect(shapes.length, part).toBeGreaterThanOrEqual(part === 'blanket' ? 1 : 2);
          for (const shape of shapes) {
            expect(shape.getAttribute('class'), `${called} ${part}`).toBe(styles.racer);
          }
        }
      });
    });

    /** Five people on the reindeer, or two as a thing, the burst and stop `name`'s. */
    const run = (called: string, name: string, reducedMotion = false) => {
      const kind = XMAS[called]!;
      return isCreature(kind)
        ? shared.thing(kind, name, reducedMotion)
        : shared.mount(kind, name, reducedMotion);
    };

    RuleScenarioOutline(
      'A <racer> bursts ahead',
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
          const prop = {
            reindeer: 'spray',
            snowman: 'blizzard',
            gingerbread: 'crumbs',
            tree: 'lights',
          }[XMAS[called] as 'reindeer'];
          expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
          for (const racer of before) expect(racer.props).not.toContain(prop);
          switch (XMAS[called]) {
            case 'reindeer': {
              // Up off the snow, gliding most of the burst.
              expect(before.every((racer) => racer.hop === 0)).toBe(true);
              const high = during.filter((racer) => racer.hop > 25);
              expect(high.length * STEP).toBeGreaterThanOrEqual(0.4);
              break;
            }
            case 'snowman':
              // The swirl whirls round.
              expect(Math.max(...during.map((racer) => racer.spin))).toBeGreaterThan(180);
              break;
            case 'gingerbread':
              break;
            case 'tree':
              expect(during.every((racer) => racer.lit > 0)).toBe(true);
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

    RuleScenarioOutline('A <racer> stops', ({ When, Then, And }, { racer: called, name, stop }) => {
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
        const kind = XMAS[called]!;
        if (kind === 'reindeer') {
          // Lights round its antlers, shaken off by "Phew!".
          expect(showing('tangle')).toBeGreaterThanOrEqual(1);
          expect(Math.max(...before.map((frame) => frame.racer.shake))).toBeGreaterThan(5);
          const phewed = stopped.filter((frame) => frame.since >= STOP.phew);
          for (const frame of phewed) expect(frame.racer.props).not.toContain('tangle');
        } else {
          // What falls off lies on the ground while it bends for it.
          const prop = { snowman: 'carrot', gingerbread: 'gumdrop', tree: 'bauble' }[
            kind as 'snowman'
          ];
          expect(showing(prop)).toBeGreaterThanOrEqual(0.8);
          const bending = before.filter(
            (frame) => frame.racer.bend > 20 && frame.racer.props.includes(prop),
          );
          expect(bending.length * STEP).toBeGreaterThanOrEqual(0.5);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
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
        expect([off.racer.bend, off.racer.shake]).toEqual([0, 0]);
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenario("The Christmas tree's lights stay on", ({ When, Then }) => {
      let watched: Watched;
      When("someone's Christmas tree lights up", async () => {
        watched = await run('Christmas tree', 'Jonas');
      });
      Then(
        'all its lights come on at once and stay on until its burst ends, none of them blinking',
        () => {
          const { at } = watched.plan.events[0]!;
          const lit = (from: number, to: number) =>
            new Set(between(watched, from, to).map((frame) => frame.racers.Jonas!.lit));
          const all = drawnAs('tree').el.querySelectorAll('[data-part="lights"] circle').length;
          expect(all).toBeGreaterThan(0);
          expect(lit(at - 0.5, at)).toEqual(new Set([0]));
          expect(lit(at, at + BURST.seconds)).toEqual(new Set([all]));
          expect(lit(at + BURST.seconds + 0.1, at + BURST.seconds + 0.5)).toEqual(new Set([0]));
        },
      );
    });

    RuleScenario('With reduced motion, the blizzard keeps still', ({ Given, When, Then }) => {
      let watched: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        watched = await run('snowman', 'Giulia', true);
      });
      Then("the blizzard's swirl doesn't spin", () => {
        const { at } = watched.plan.events[0]!;
        const bursting = between(watched, at, at + BURST.seconds).map(
          (frame) => frame.racers.Giulia!,
        );
        expect(bursting.every((racer) => racer.props.includes('blizzard'))).toBe(true);
        for (const racer of watched.frames.map((frame) => frame.racers.Giulia!)) {
          expect(racer.spin).toBe(0);
        }
      });
    });
  });
});
