import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { handOutLooks, type ChosenLook, type Mood } from '../../scenario-kit';
import { token } from '../../scenario-kit/tokens';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec } from '../../scenario-kit/testing';
import theRace from './index';
import { eventCaption } from './play';
import { faceAt, lane } from './layout';
import { creature, CREATURE_SPEC } from './creature';
import {
  CREATURES,
  isCreature,
  MOUNTS,
  RACER,
  RACER_COLOURS,
  racer,
  RIDER,
  SPEC,
  type Creature,
  type Kind,
} from './parts';
import styles from './the-race.module.css';
import css from './the-race.module.css?raw';
import {
  CAMERA,
  cameraAt,
  COURSES,
  crossingOf,
  eventCount,
  leaderAt,
  LENGTH,
  noseAt,
  lineAt,
  orderAt,
  planShow,
  spacing,
  STOP,
  type Ending,
  type Plan,
} from './plan';
import {
  ENDINGS,
  read,
  THING_NAMES,
  THING_KINDS,
  NEW_NAMES,
  bounds,
  names,
  STEP,
  type Frame,
  type Watched,
  kindOf,
  between,
  shownAt,
  saying,
  headOf,
  shared,
  firstDrawn,
  ends,
  reined,
  plans,
  frames,
  everyPlan,
} from './watching';

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

  Rule('Its line-up', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Racers as pictures, by kind', ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      const option = (label: string) => lineUp.options.find((each) => each.label === label)!;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      // Its first racers: "Four animals and four spooky creatures" adds more after them.
      const holds = (group: string, held: string) => {
        const choices = option('Racer').choices.filter((choice) => choice.group === group);
        const names = listed(held);
        expect(choices.slice(0, names.length).map((choice) => read(choice.label))).toEqual(names);
      };
      When('the Line-up opens for The Race', () => {
        expect(lineUp.heading).toBe('Line up the racers');
        expect(lineUp.start).toBe('Start the race');
      });
      Then('its first option is {string}, its choices in groups, as tabs', (_, label: string) => {
        const first = lineUp.options[0]!;
        expect(first.label).toBe(label);
        // Still `mount`, so stored looks keep their ride.
        expect(first.name).toBe('mount');
        // In groups, each a tab: "Six things on legs" says their order.
        for (const choice of first.choices) expect(choice.group, choice.name).toBeTruthy();
        expect(new Set(first.choices.map((choice) => choice.group)).size).toBeGreaterThan(1);
      });
      And('the group "Rides" holds {any}', (_, held: string) => holds('Rides', held));
      And('the group "Animals" holds {any}', (_, held: string) => holds('Animals', held));
      And('the group "Spooky" holds {any}', (_, held: string) => holds('Spooky', held));
      And('the group "Space" holds {any}', (_, held: string) => holds('Space', held));
      And(
        'each racer is shown as the chosen person racing as it, in their colour and extra, calm, its name under it',
        () => {
          const racer = option('Racer');
          expect(racer.drawn).toBe(true);
          for (const { name } of racer.choices) {
            const drawn = lineUp.draw(
              { mount: name, colour: 'mint', extra: 'number' },
              { name: 'Anna', place: 3 },
            ) as SVGSVGElement;
            expect(drawn.dataset).toMatchObject({ mount: name, colour: 'mint', mood: 'calm' });
            expect(drawn.querySelector('text')!.textContent).toBe('3');
          }
        },
      );
      And(
        '"Colour" offers the same swatches as before, and "Extra" a picture of each extra, each named for screen readers',
        () => {
          expect(lineUp.options.map((each) => each.name)).toEqual(['mount', 'colour', 'extra']);
          const colours = option('Colour').choices;
          expect(colours.map((choice) => choice.name)).toEqual([...RACER_COLOURS]);
          for (const choice of colours) expect(choice.swatch).toBe(choice.name);
          expect(colours.find((choice) => choice.name === 'shark')!.label).toBe('Grey');
          const extras = option('Extra').choices;
          expect(extras.map((choice) => choice.label)).toEqual([
            'Googly eyes',
            'Top hat',
            'Number',
            'Scarf',
            'Cape',
            'Bow tie',
          ]);
          for (const choice of extras) {
            const picture = choice.picture!();
            expect(picture.querySelector(`[data-part="${choice.name}"]`)).not.toBeNull();
            expect(picture.getAttribute('aria-hidden')).toBe('true');
          }
        },
      );
    });

    RuleScenario('Its themes, and the racers that suit each', ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      const labelOf = (name: string) =>
        read(lineUp.options[0]!.choices.find((choice) => choice.name === name)!.label);
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then(
        'its themes are {any}, after "Surprise", each a postcard of its track',
        (_, themes: string) => {
          const labels = [...themes.matchAll(/"([^"]+)"/g)].map(([, label]) => label);
          // The four tracks come first; "Christmas is a theme" says what follows.
          const tracks = lineUp.themes!.slice(0, labels.length);
          expect(tracks.map((theme) => theme.label)).toEqual(labels);
          expect(lineUp.themes!.map((theme) => theme.name)).toEqual([...COURSES]);
          for (const theme of lineUp.themes!) {
            const picture = theme.picture() as SVGSVGElement;
            expect(picture.dataset).toMatchObject({ part: 'postcard', course: theme.name });
            expect(picture.getAttribute('viewBox')).toBe('0 0 120 46');
            expect(picture.getAttribute('aria-hidden')).toBe('true');
          }
        },
      );
      And(
        "each theme's tab holds, in this order:",
        (_, table: { theme: string; racers: string }[]) => {
          expect(table.map((row) => row.theme)).toEqual(
            lineUp.themes!.slice(0, table.length).map((each) => each.label),
          );
          for (const row of table) {
            const theme = lineUp.themes!.find((each) => each.label === row.theme)!;
            expect(theme.suits!.map(labelOf), row.theme).toEqual(row.racers.split(', '));
          }
        },
      );
    });

    RuleScenario("Its Line-up's words, and each track's ground", ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      /** WCAG's relative luminance of a token's colour, as tokens.css writes it. */
      const luminance = (colour: string) => {
        // #fff is #ffffff.
        const [r, g, b] = token(`--color-${colour}`)
          .replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
          .match(/^#(..)(..)(..)$/)!
          .slice(1)
          .map((hex) => parseInt(hex, 16) / 255)
          .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const contrast = (one: string, two: string) => {
        const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a);
        return (light! + 0.05) / (dark! + 0.05);
      };
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then(
        "its themes are called {string}, and the first option's choices {string}",
        (_, theme: string, choices: string) => {
          expect(lineUp.words).toEqual({ theme, choices });
        },
      );
      And(
        "each track names a ground, a sky and a floor colour on which every racer's ink outline reads",
        () => {
          for (const { name, ground } of lineUp.themes!) {
            for (const colour of [ground.sky, ground.floor]) {
              expect(contrast(colour, 'ink'), `${name}: ${colour}`).toBeGreaterThanOrEqual(3);
            }
            expect(ground.sky, name).not.toBe(ground.floor);
          }
        },
      );
      And('on Autumn, everyone stands on bark under the sky', () => {
        const autumn = lineUp.themes!.find((each) => each.name === 'autumn')!;
        expect(autumn.ground).toEqual({ sky: 'sky', floor: 'bark' });
      });
    });

    RuleScenario('Each racer looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      const shirt = (svg: SVGSVGElement) => headOf(svg).style.getPropertyValue('--shirt');
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
            const head = headOf(svg);
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

    RuleScenario('Each new ride looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(
        'Anna chose the space hopper, Ben the ostrich, Carla the rocket and Dario the sandwich',
        () => {
          looks.set('Anna', { mount: 'hopper', colour: 'sea', extra: 'number' });
          looks.set('Ben', { mount: 'ostrich', colour: 'shark', extra: 'cape' });
          looks.set('Carla', { mount: 'rocket', colour: 'orange', extra: 'bowtie' });
          looks.set('Dario', { mount: 'sandwich', colour: 'pink', extra: 'scarf' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      const arm = (name: string) => drawn.get(name)!.querySelector('[data-part="hands"] path');
      Then('Anna sits on the hopper and holds its horns', () => {
        const anna = drawn.get('Anna')!;
        expect(anna.dataset.mount).toBe('hopper');
        expect(ends(arm('Anna'))).toBe(SPEC.hopper.hold!.join(' '));
        expect(reined(anna)).toBe(false);
        // The hand is on a horn's tip, the horn's end at (146, 84).
        const horns = anna.querySelector('[data-part="mount"] path')!.getAttribute('d')!;
        expect(horns).toContain('146 84');
      });
      And("Ben holds reins tied to the ostrich's neck", () => {
        const ben = drawn.get('Ben')!;
        expect(ben.dataset.mount).toBe('ostrich');
        expect(reined(ben)).toBe(true);
        const [x, y] = SPEC.ostrich.reins!;
        expect(ends(ben.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
        // On the neck, which runs from (150, 126) up to the head at (180, 70).
        expect(x).toBeGreaterThan(150);
        expect(x).toBeLessThan(184);
        expect(y).toBeGreaterThan(70);
        expect(y).toBeLessThan(126);
      });
      And('Carla sits astride the rocket and holds its handlebar', () => {
        const carla = drawn.get('Carla')!;
        expect(carla.dataset.mount).toBe('rocket');
        expect(ends(arm('Carla'))).toBe(SPEC.rocket.hold!.join(' '));
        expect(reined(carla)).toBe(false);
        // The handlebar rises from the rocket's top to (164, 94).
        const bar = [...carla.querySelectorAll('[data-part="mount"] path')].at(-1)!;
        expect(ends(bar)).toBe('164 94');
        // Astride: the shirt's foot is on the rocket's top, at y 110.
        expect(SPEC.rocket.saddle[1]).toBe(110);
      });
      And('Dario sits on the top slice and holds reins tied to its cocktail stick', () => {
        const dario = drawn.get('Dario')!;
        expect(dario.dataset.mount).toBe('sandwich');
        expect(reined(dario)).toBe(true);
        const [x, y] = SPEC.sandwich.reins!;
        expect(ends(dario.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
        // On the stick, from (196, 110) up to (200, 82).
        expect(x).toBeGreaterThanOrEqual(196);
        expect(x).toBeLessThanOrEqual(200);
        expect(y).toBeGreaterThanOrEqual(82);
        expect(y).toBeLessThanOrEqual(110);
      });
      And(
        "each mount and shirt is in the colour chosen, and every rider's head sits at the same height in its lane",
        () => {
          const rows = [...drawn].map(([name, svg]) => {
            const { colour } = looks.get(name)!;
            expect(svg.style.getPropertyValue('--racer')).toBe(`var(--color-${colour})`);
            expect(headOf(svg).style.getPropertyValue('--shirt')).toBe(`var(--color-${colour})`);
            return svg
              .querySelector('[data-part="rider"]')!
              .getAttribute('transform')!
              .split(' ')[1];
          });
          expect(new Set(rows).size).toBe(1);
          for (const count of [2, 4, 8]) {
            for (let i = 0; i < count; i++) {
              const tops = MOUNTS.map((mount) => faceAt(mount, lane(i, count), 900).top);
              expect(new Set(tops).size).toBe(1);
            }
          }
        },
      );
    });

    RuleScenario('A cape and a bow tie', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given('Anna chose the cape and Ben the bow tie', () => {
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'cape' });
        looks.set('Ben', { mount: 'snail', colour: 'mint', extra: 'bowtie' });
        looks.set('Carla', { mount: 'chair', colour: 'grape', extra: 'number' });
      });
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      /** The rider's parts in `lean`, back to front. */
      const layers = (name: string) =>
        [...drawn.get(name)!.querySelector('[data-part="lean"]')!.children].map(
          (child) => (child as SVGElement).dataset.part ?? 'head',
        );
      Then("Anna's cape flies out behind the rider's shoulders", () => {
        expect(layers('Anna')).toEqual(['cape', 'head']);
        const cape = drawn.get('Anna')!.querySelector('[data-part="cape"] path')!;
        const xs = [...cape.getAttribute('d')!.matchAll(/(-?\d+) (-?\d+)/g)].map(([, x]) => +x!);
        // From the shoulders on the head's grid, out behind the head's left edge.
        expect(Math.max(...xs)).toBeGreaterThanOrEqual(30);
        expect(Math.min(...xs)).toBeLessThan(-30);
      });
      And('Ben wears a bow tie at the collar', () => {
        expect(layers('Ben')).toEqual(['head', 'bowtie']);
        const knot = drawn.get('Ben')!.querySelector('[data-part="bowtie"] circle')!;
        expect([knot.getAttribute('cx'), knot.getAttribute('cy')]).toEqual(['50', '80']);
      });
      And('each is in sun, or in tomato on a sun shirt, as the scarf is', () => {
        expect(drawn.get('Anna')!.style.getPropertyValue('--band')).toBe('var(--color-tomato)');
        expect(drawn.get('Ben')!.style.getPropertyValue('--band')).toBe('var(--color-sun)');
        // Drawn in the scarf's class, which takes --band.
        const scarf = racer(
          { mount: 'duck', colour: 'sun', extra: 'scarf' },
          { face: handOutLooks(['Anna'], createRandom(1)).get('Anna')!, number: 1 },
        ).el.querySelector('[data-part="scarf"] path')!;
        for (const [name, part] of [
          ['Anna', 'cape'],
          ['Ben', 'bowtie'],
        ] as const) {
          for (const shape of drawn.get(name)!.querySelectorAll(`[data-part="${part}"] > *`)) {
            expect(shape.getAttribute('class')).toBe(scarf.getAttribute('class'));
          }
        }
      });
    });

    RuleScenario('Each creature looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(
        'Femi chose the zombie in pink with "Number", and Giulia the shark with feet in sea with the top hat',
        () => {
          looks.set('Femi', { mount: 'zombie', colour: 'pink', extra: 'number' });
          looks.set('Giulia', { mount: 'shark', colour: 'sea', extra: 'tophat' });
          looks.set('Carla', { mount: 'snail', colour: 'mint', extra: 'scarf' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then(
        'Femi races as a zombie in a pink shirt, arms out in front, with a paper roundel on its chest',
        () => {
          const femi = drawn.get('Femi')!;
          expect(femi.dataset).toMatchObject({ part: 'creature', mount: 'zombie' });
          expect(femi.style.getPropertyValue('--racer')).toBe('var(--color-pink)');
          expect(femi.querySelector('[data-part="shirt"]')!.getAttribute('class')).toBe(
            styles.racer,
          );
          // Both arms reach forward of the front shoulder, level with the shoulders.
          const [x, y] = CREATURE_SPEC.zombie.shoulders[1];
          for (const which of ['back', 'front']) {
            const [hx, hy] = ends(femi.querySelector(`[data-part="${which}-arm"] path`))
              .split(' ')
              .map(Number);
            expect(hx).toBeGreaterThan(x);
            expect(Math.abs(hy! - y)).toBeLessThan(10);
          }
          const roundel = femi.querySelector('[data-part="number"]')!;
          expect(roundel.textContent).toBe('1');
          const [cx, cy] = CREATURE_SPEC.zombie.chest;
          expect(roundel.querySelector('circle')!.getAttribute('cx')).toBe(String(cx));
          expect(roundel.querySelector('circle')!.getAttribute('cy')).toBe(String(cy));
        },
      );
      And('Giulia races as a sea-coloured shark on two legs in sneakers, wearing a top hat', () => {
        const giulia = drawn.get('Giulia')!;
        expect(giulia.dataset).toMatchObject({ part: 'creature', mount: 'shark' });
        expect(giulia.style.getPropertyValue('--racer')).toBe('var(--color-sea)');
        const legs = [...giulia.querySelectorAll('path[data-part="legs"]')];
        expect(legs.map((leg) => leg.getAttribute('d')!.match(/M/g))).toEqual([['M'], ['M']]);
        const shoes = giulia.querySelectorAll('[data-part="shoe"]');
        expect(shoes).toHaveLength(2);
        for (const shoe of shoes) expect(shoe.getAttribute('class')).toBe(styles.racer);
        expect(giulia.querySelector('[data-part="tophat"]')).not.toBeNull();
      });
      And('neither has a rider or a mount', () => {
        for (const name of ['Femi', 'Giulia']) {
          const svg = drawn.get(name)!;
          expect(svg.querySelector('[data-part="rider"], [data-part="mount"]')).toBeNull();
        }
      });
    });

    /** Where each creature wears its colour: the parts of it so named. */
    const WEARS: Record<string, { creature: Creature; parts: string[] }> = {
      zombie: { creature: 'zombie', parts: ['shirt'] },
      robot: { creature: 'robot', parts: ['body', 'antenna'] },
      shark: { creature: 'shark', parts: ['body'] },
      astronaut: { creature: 'astronaut', parts: ['backpack', 'panel'] },
      monster: { creature: 'monster', parts: ['fur'] },
      villain: { creature: 'villain', parts: ['cape', 'collar'] },
      alien: { creature: 'alien', parts: ['head', 'arms', 'legs'] },
      dinosaur: { creature: 'dinosaur', parts: ['body'] },
      'coffee mug': { creature: 'mug', parts: ['mug', 'handle'] },
      printer: { creature: 'printer', parts: ['cover', 'tray'] },
      'sticky note': { creature: 'sticky', parts: ['note'] },
      banana: { creature: 'banana', parts: ['peel'] },
      'ice cream': { creature: 'icecream', parts: ['scoop'] },
      sushi: { creature: 'sushi', parts: ['fish'] },
      cat: { creature: 'cat', parts: ['fur'] },
      octopus: { creature: 'octopus', parts: ['body', 'tentacles'] },
      penguin: { creature: 'penguin', parts: ['back', 'fins'] },
      pigeon: { creature: 'pigeon', parts: ['neck', 'fins'] },
      ghost: { creature: 'ghost', parts: ['dots', 'shoe'] },
      gnome: { creature: 'gnome', parts: ['hat'] },
      mummy: { creature: 'mummy', parts: ['sweatband', 'shoe'] },
      yeti: { creature: 'yeti', parts: ['earmuffs'] },
    };
    /** The six things on legs, as the feature names them. */
    const THINGS = Object.keys(THING_NAMES);
    /** Each set of creatures in tomato in one race, as the show first draws them. */
    const inTomato = new Map<string, Promise<Map<string, SVGSVGElement>>>();
    const tomato = (names: readonly string[]) => {
      const key = names.join();
      if (!inTomato.has(key)) {
        inTomato.set(
          key,
          firstDrawn(
            new Map(
              names.map((name) => {
                const mount = WEARS[name]!.creature;
                return [mount, { mount, colour: 'tomato', extra: 'scarf' }];
              }),
            ),
          ),
        );
      }
      return inTomato.get(key)!;
    };
    /** Checks that each part `name` wears its colour in is tomato. */
    const wearsTomato = (svg: SVGSVGElement, name: string) => {
      expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
      for (const part of WEARS[name]!.parts) {
        const shapes =
          part === 'arms'
            ? [...svg.querySelectorAll<SVGElement>('[data-part$="-arm"] > :nth-child(2)')]
            : part === 'fins'
              ? // Flippers and wings: each arm's leaf.
                [...svg.querySelectorAll<SVGElement>('[data-part$="-arm"] > :first-child')]
              : [...svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`)].filter(
                  (shape) => shape.tagName !== 'g',
                );
        expect(shapes.length, part).toBeGreaterThan(0);
        for (const shape of shapes) {
          const painted =
            shape.getAttribute('class') === styles.racer ||
            shape.style.getPropertyValue('--paint') === 'var(--racer)';
          expect(painted, `${name} ${part}`).toBe(true);
        }
      }
    };

    RuleScenarioOutline(
      'Where a <creature> wears its colour',
      ({ When, Then }, { creature: kind }) => {
        let svg: SVGSVGElement;
        When('someone races as a <creature> in tomato', async () => {
          // All eight in one race.
          const eight = Object.keys(WEARS).filter(
            (name) => !THINGS.includes(name) && !(name in NEW_NAMES),
          );
          svg = (await tomato(eight)).get(WEARS[kind]!.creature)!;
        });
        Then('<where> is tomato', () => wearsTomato(svg, kind));
      },
    );

    RuleScenarioOutline('Where a <thing> wears its colour', ({ When, Then }, { thing }) => {
      let svg: SVGSVGElement;
      When('someone races as a <thing> in tomato', async () => {
        svg = (await tomato(THINGS)).get(WEARS[thing]!.creature)!;
      });
      Then('<where> is tomato', () => wearsTomato(svg, thing));
    });

    RuleScenario("The astronaut and the villain have the kit's faces", ({ When, Then }) => {
      const looks = new Map<string, ChosenLook>([
        ['Anna', { mount: 'astronaut', colour: 'sea', extra: 'scarf' }],
        ['Ben', { mount: 'villain', colour: 'grape', extra: 'number' }],
        ['Carla', { mount: 'duck', colour: 'sun', extra: 'scarf' }],
      ]);
      let drawn: Map<string, SVGSVGElement>;
      When('someone races as the astronaut or the villain', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('its face has the skin tone the kit hands out for the run', () => {
        const random = createRandom(4);
        planShow([...looks.keys()], 'Carla', random);
        const faces = handOutLooks([...looks.keys()], random);
        for (const name of ['Anna', 'Ben']) {
          const svg = drawn.get(name)!;
          expect(svg.style.getPropertyValue('--skin')).toBe(
            `var(--color-skin-${faces.get(name)!.skin})`,
          );
          expect(svg.querySelector('[data-part="skin"]')!.getAttribute('class')).toBe(styles.skin);
        }
      });
    });

    /** `kind` in tomato with a scarf, as the show draws it, `mood`. */
    const modern = (kind: Creature, mood: Mood = 'calm') => {
      const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
      return creature({ mount: kind, colour: 'tomato', extra: 'scarf' }, { face, number: 1, mood });
    };
    /** Whether `el` and everything round it up to `root` is shown. */
    const visible = (el: Element | null, root: Element) => {
      for (let at = el; at && at !== root; at = at.parentElement) {
        if (at.getAttribute('display') === 'none') return false;
      }
      return !!el;
    };
    /** Every number in `text`, in order. */
    const numbers = (text: string) => (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    /** A path's points, as [x, y] pairs: every pair of numbers in it. */
    const points = (d: string) => {
      const all = numbers(d);
      return all.flatMap((_, i) => (i % 2 ? [] : [[all[i]!, all[i + 1]!] as const]));
    };
    /** A foot's place: its ankle, how far it's turned, and its size. */
    const footAt = (foot: Element) => {
      const [x, y, turn, k] = numbers(foot.getAttribute('transform')!);
      return { x: x!, y: y!, turn: turn!, k: k! };
    };

    RuleScenario('Creatures are modern cartoons', ({ When, Then, And }) => {
      let all: ReturnType<typeof modern>[];
      When('someone races as any creature', () => {
        all = CREATURES.map((kind) => modern(kind));
      });
      Then(
        'each main part of its body has a flat shadow on its lower left, ink at 18%, and most have a white highlight on the upper right',
        () => {
          const rule = /\.shade\s*{([^}]*)}/.exec(css)![1]!;
          expect(rule).toMatch(/fill:\s*var\(--color-ink\)/);
          expect(rule).toMatch(/opacity:\s*0?\.18/);
          let highlighted = 0;
          for (const { el, look } of all) {
            const kind = look.mount;
            const shades = [...el.querySelectorAll('[data-part="own"] [data-part="shade"]')];
            expect(shades.length, kind).toBeGreaterThan(0);
            for (const shade of shades) {
              expect(shade.getAttribute('class')).toBe(styles.shade);
              // The part less itself moved up and right, so what's left is its lower left.
              const id = /url\(#(.+)\)/.exec(shade.getAttribute('clip-path')!)![1]!;
              const clip = el.querySelector(`clipPath[id="${id}"] path`)!;
              expect(clip.getAttribute('d')).toContain(shade.getAttribute('d'));
              expect(clip.getAttribute('clip-rule')).toBe('evenodd');
              const [dx, dy] = numbers(clip.getAttribute('transform')!);
              expect(dx, kind).toBeGreaterThan(0);
              expect(dy, kind).toBeLessThan(0);
              // Its outline over it.
              expect(shade.nextElementSibling!.getAttribute('d')).toBe(shade.getAttribute('d'));
              expect(shade.nextElementSibling!.getAttribute('class')).toBe(styles.line);
            }
            const [h1, h2] = CREATURE_SPEC[kind].hips;
            const highlights = [...el.querySelectorAll('[data-part="highlight"]')];
            if (highlights.length) highlighted++;
            for (const highlight of highlights) {
              expect(highlight.getAttribute('class')).toBe(styles.stripe);
              expect(Number(highlight.getAttribute('opacity'))).toBeLessThanOrEqual(0.8);
              const line = points(highlight.getAttribute('d')!);
              expect(Math.max(...line.map(([x]) => x)), kind).toBeGreaterThan((h1[0] + h2[0]) / 2);
              const middle = line.reduce((sum, [, y]) => sum + y, 0) / line.length;
              expect(middle, kind).toBeLessThan(h1[1] - 40);
            }
          }
          expect(highlighted).toBeGreaterThan(CREATURES.length / 2);
        },
      );
      And('each pupil has a white shine', () => {
        for (const one of all) {
          for (const mood of ['calm', 'worried', 'scared', 'happy'] as const) {
            one.setMood(mood);
            // A pupil, or a person's dark eye, which is all pupil; a robot's screen has none.
            for (const eye of one.face.querySelectorAll('[data-part="eye"]')) {
              const pupil = eye.nextElementSibling!;
              const shine = pupil.nextElementSibling!;
              const dark = visible(pupil, one.el) || eye.getAttribute('class') === styles.ink;
              expect(dark, `${one.look.mount} ${mood}`).toBe(!CREATURE_SPEC[one.look.mount].screen);
              expect(shine.getAttribute('data-part')).toBe('shine');
              expect(shine.getAttribute('class')).toBe(styles.paperFill);
              expect(visible(shine, one.el)).toBe(dark);
            }
          }
          one.setMood('calm');
        }
      });
      And('its arms bend at the elbow and end in gloves, paws, tentacle tips or fins', () => {
        for (const { el, look } of all) {
          const spec = CREATURE_SPEC[look.mount];
          for (const which of ['back', 'front']) {
            const holder = el.querySelector(`[data-part="${which}-arm"]`)!;
            const d = holder.querySelector('path')!.getAttribute('d')!;
            const hand = holder.querySelector('[data-part="hand"]');
            const thumb = holder.querySelector('[data-part="thumb"]');
            if (spec.fins) {
              // A leaf from the shoulder.
              expect(d.match(/Q/g)).toHaveLength(2);
              expect(d.endsWith('Z')).toBe(true);
              expect(visible(hand, el)).toBe(false);
            } else {
              // Shoulder, elbow, hand.
              expect(d, look.mount).toMatch(/^M\S+ \S+ Q\S+ \S+ \S+ \S+$/);
              expect(visible(hand, el)).toBe(true);
              // A glove has a thumb; a paw doesn't.
              expect(visible(thumb, el)).toBe(!spec.noThumb);
            }
          }
        }
      });
      And('it sprints: its front foot planted, its back foot kicked up behind', () => {
        for (const { look, shoes } of all) {
          const [back, front] = shoes.map(footAt);
          expect(front!.turn, look.mount).toBe(0);
          expect(front!.y + 11 * front!.k, look.mount).toBeCloseTo(RACER.feet, 5);
          expect(back!.turn, look.mount).toBeGreaterThan(45);
          expect(back!.y, look.mount).toBeLessThan(front!.y);
          expect(back!.x, look.mount).toBeLessThan(front!.x);
        }
      });
      And(
        'it fills the same box as before, its feet on the same line and its face at the same height',
        () => {
          // Its face and nose where they were, so tags and bubbles don't move.
          const places = CREATURES.map((kind) => [
            kind,
            [CREATURE_SPEC[kind].face, CREATURE_SPEC[kind].nose],
          ]);
          expect(Object.fromEntries(places)).toEqual({
            zombie: [130, 206],
            robot: [130, 176],
            shark: [188, 228],
            astronaut: [130, 180],
            monster: [130, 196],
            villain: [130, 172],
            alien: [130, 176],
            dinosaur: [162, 220],
            // The things on legs, from the canvas.
            mug: [139, 170],
            printer: [131, 180],
            sticky: [131, 170],
            banana: [134, 186],
            icecream: [131, 172],
            sushi: [141, 192],
            // The animals and spooky creatures, from the canvas.
            cat: [137, 189],
            octopus: [130, 178],
            penguin: [130, 177],
            pigeon: [167, 204],
            ghost: [131, 176],
            gnome: [130, 168],
            mummy: [130, 160],
            yeti: [130, 188],
            // Christmas's things on legs, from the canvas.
            snowman: [131, 163],
            gingerbread: [131, 160],
            tree: [130, 182],
            // Autumn's animals and things on legs, from the canvas.
            squirrel: [139, 176],
            hedgehog: [171, 212],
            mushroom: [131, 190],
            acorn: [131, 188],
          });
          for (const { el, look } of all) {
            expect(el.getAttribute('viewBox')).toBe(`0 0 ${RACER.width} ${RACER.height}`);
            // Its eyes in the 72 px box a rider's head fills, which stands on y 110.
            for (const [, y] of CREATURE_SPEC[look.mount].eyes) {
              expect(y).toBeGreaterThan(110 - RIDER.foot);
              expect(y).toBeLessThan(110 - RIDER.foot + RIDER.size);
            }
          }
        },
      );
    });

    RuleScenarioOutline(
      "A <creature>'s face when it is <mood>",
      ({ When, Then }, { creature: kind, mood }) => {
        let one: ReturnType<typeof modern>;
        const part = (name: string) => [...one.face.querySelectorAll(`[data-part="${name}"]`)];
        const shownPart = (name: string) => part(name).filter((el) => visible(el, one.el));
        /** Each brow's points. */
        const brows = () =>
          shownPart('brows').flatMap((el) =>
            el
              .getAttribute('d')!
              .split('M')
              .filter((each) => each.trim())
              .map(points),
          );
        When('a <creature> is <mood>', () => {
          one = modern(kind as Creature, mood as Mood);
          expect(one.el.dataset.mood).toBe(mood);
        });
        Then('<face>', () => {
          const eyes = CREATURE_SPEC[kind as Creature].eyes;
          const middle = eyes.reduce((sum, [x]) => sum + x, 0) / eyes.length;
          const mouth = part('mouth')[0]!;
          const d = mouth.getAttribute('d')!;
          switch (`${kind} ${mood}`) {
            case 'zombie calm': {
              // Half shut: each lid's edge level, between the eye's top and its middle.
              const lids = shownPart('lid');
              expect(lids).toHaveLength(eyes.length);
              lids.forEach((lid, i) => {
                const y = eyes[i]![1];
                const ry = Number(part('eye')[i]!.getAttribute('ry'));
                const all = numbers(lid.getAttribute('d')!);
                const [left, right] = [all[1]!, all.at(-1)!];
                expect(left).toBeCloseTo(right, 5);
                expect(left).toBeGreaterThan(y - ry);
                expect(left).toBeLessThan(y);
              });
              // The front brow higher.
              const [back, front] = brows();
              expect(Math.min(...front!.map(([, y]) => y))).toBeLessThan(
                Math.min(...back!.map(([, y]) => y)),
              );
              // A smirk: open, its front corner up.
              const line = points(d);
              expect(d).not.toContain('Z');
              expect(line.at(-1)![1]).toBeLessThan(line[0]![1]);
              break;
            }
            case 'zombie worried': {
              for (const [i, lid] of shownPart('lid').entries()) {
                const all = numbers(lid.getAttribute('d')!);
                const [left, right] = [all[1]!, all.at(-1)!];
                // Lower on the outside.
                if (eyes[i]![0] < middle) expect(left).toBeGreaterThan(right);
                else expect(right).toBeGreaterThan(left);
              }
              expect(brows()).toHaveLength(2);
              for (const brow of brows()) {
                // Each brow ends higher, nearer the middle.
                const [start, end] = [brow[0]!, brow.at(-1)!];
                expect(end[1]).toBeLessThan(start[1]);
                expect(Math.abs(end[0] - middle)).toBeLessThan(Math.abs(start[0] - middle));
              }
              expect(d.match(/Q/g)).toHaveLength(2);
              expect(d).not.toContain('Z');
              break;
            }
            case 'zombie scared': {
              const calm = modern('zombie');
              part('eye').forEach((eye, i) => {
                const before = calm.face.querySelectorAll('[data-part="eye"]')[i]!;
                const rx = Number(eye.getAttribute('rx'));
                expect(rx).toBeGreaterThan(Number(before.getAttribute('rx')));
                expect(Number(part('pupil')[i]!.getAttribute('rx'))).toBeLessThan(rx * 0.3);
              });
              expect(shownPart('lid')).toHaveLength(0);
              expect(d).toMatch(/ a.* a.*Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              break;
            }
            case 'zombie happy':
              expect(d).toMatch(/Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              expect(shownPart('teeth')).toHaveLength(1);
              expect(shownPart('tongue')).toHaveLength(1);
              break;
            case 'zombie party':
              expect(shownPart('shades')).toHaveLength(1);
              expect(part('shades')[0]!.getAttribute('class')).toBe(styles.ink);
              expect(shownPart('glint')).toHaveLength(1);
              expect(d).toMatch(/Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              break;
            case 'monster calm':
              expect(shownPart('fangs')).toHaveLength(1);
              expect(part('fangs')[0]!.getAttribute('d')!.match(/M/g)).toHaveLength(5);
              expect(d).not.toContain('Z');
              break;
            case 'robot calm':
              expect(one.el.querySelector('[data-part="screen"]')!.getAttribute('class')).toBe(
                styles.ink,
              );
              for (const eye of part('eye')) expect(eye.getAttribute('class')).toBe(styles.glass);
              expect(shownPart('pupil')).toHaveLength(0);
              expect(mouth.getAttribute('class')).toBe(styles.glassLine);
              expect(shownPart('brows')).toHaveLength(0);
              break;
            default:
              throw new Error(`No face for a ${kind} ${mood}`);
          }
        });
      },
    );

    /** The paints the feature names, as the classes a shoe or its stripe is drawn in, in tomato. */
    const SHOE_PAINTS: Record<string, string> = {
      tomato: styles.racer!,
      'ink-soft': styles.inkSoft!,
      ink: styles.ink!,
      grey: styles.shark!,
      glass: styles.glass!,
      'light blue': styles.glass!,
      white: styles.paper!,
    };
    const STRIPE_PAINTS: Record<string, string> = {
      tomato: styles.racerLine!,
      sun: styles.bandLine!,
    };

    RuleScenarioOutline(
      'A <creature> runs in <feet>',
      ({ When, Then }, { creature: kind, feet }) => {
        let one: ReturnType<typeof modern>;
        When('someone races as a <creature> in tomato', () => {
          one = modern(kind as Creature);
          expect(one.el.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
        });
        Then('it runs in <feet>', () => runsOn(one, feet));
      },
    );

    /** Checks that `one` runs on `feet`, as the feature words them. */
    const runsOn = (one: ReturnType<typeof modern>, feet: string) => {
      const shod = /^(\S+) (sneakers|boots)(?: with a (\S+) stripe)?$/.exec(feet);
      const bare = /^big bare feet, (.+)$/.exec(feet);
      // Tips, paddles and toes: the foot, and its shoe's class or the paint of its line.
      const other: Record<string, [string, string]> = {
        'two tentacles with curled tips': ['tip', 'var(--racer)'],
        'orange flat feet': ['paddle', styles.orange!],
        'pink toes': ['toes', 'var(--color-pink)'],
      };
      expect(one.shoes).toHaveLength(2);
      if (other[feet]) {
        const [foot, paint] = other[feet];
        for (const each of one.shoes) {
          expect(each.dataset.foot).toBe(foot);
          const shoe = each.querySelector<SVGElement>('[data-part="shoe"]')!;
          expect(
            paint.startsWith('var(')
              ? shoe.style.getPropertyValue('--paint')
              : shoe.getAttribute('class'),
          ).toBe(paint);
        }
        return;
      }
      const paint = (shod ?? bare)?.[1];
      expect(paint, feet).toBeDefined();
      const foot = shod ? (shod[2] === 'sneakers' ? 'sneaker' : 'boot') : 'bare';
      for (const each of one.shoes) {
        expect(each.dataset.foot).toBe(foot);
        const shoe = each.querySelector('[data-part="shoe"]')!;
        expect(shoe.getAttribute('class')).toBe(SHOE_PAINTS[paint!]);
        const stripe = each.querySelector('[data-part="stripe"]');
        if (shod?.[3]) expect(stripe!.getAttribute('class')).toBe(STRIPE_PAINTS[shod[3]]);
        else expect(stripe).toBeNull();
        if (bare) expect(footAt(each).k).toBeGreaterThan(1);
      }
    };

    RuleScenario('Six things on legs', ({ When, Then, And }) => {
      const choices = theRace.lineUp!.options[0]!.choices;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      When('the Line-up opens for The Race', () => {
        expect(theRace.lineUp!.options[0]!.label).toBe('Racer');
      });
      Then('the group "Things on legs" holds {any}', (_, held: string) => {
        // Its first six: "Four racers for Christmas" adds more after them.
        const things = choices.filter((choice) => choice.group === 'Things on legs').slice(0, 6);
        expect(things.map((choice) => choice.label)).toEqual(listed(held));
        expect(things.map((choice) => choice.name)).toEqual(THING_KINDS);
      });
      And('the tabs read {any}, in that order', (_, tabs: string) => {
        expect([...new Set(choices.map((choice) => choice.group))]).toEqual(listed(tabs));
      });
    });

    RuleScenario('A thing on legs runs like the others', ({ When, Then, And }) => {
      let all: ReturnType<typeof modern>[];
      When(
        'someone races as a coffee mug, a printer, a sticky note, a banana, an ice cream or a sushi',
        () => {
          all = THING_KINDS.map((kind) => modern(kind));
        },
      );
      Then(
        'it runs on dark legs in white sneakers striped in its colour, and its arms end in white gloves',
        () => {
          for (const { el, look, shoes } of all) {
            const kind = look.mount;
            for (const leg of el.querySelectorAll<SVGElement>('path[data-part="legs"]')) {
              expect(leg.style.getPropertyValue('--paint'), kind).toBe('var(--color-ink-soft)');
            }
            for (const shoe of shoes) {
              expect(shoe.dataset.foot, kind).toBe('sneaker');
              expect(shoe.querySelector('[data-part="shoe"]')!.getAttribute('class')).toBe(
                styles.paper,
              );
              expect(shoe.querySelector('[data-part="stripe"]')!.getAttribute('class')).toBe(
                styles.racerLine,
              );
            }
            for (const which of ['back', 'front']) {
              const holder = el.querySelector(`[data-part="${which}-arm"]`)!;
              for (const part of ['hand', 'thumb']) {
                const glove = holder.querySelector(`[data-part="${part}"]`);
                expect(visible(glove, el), `${kind} ${part}`).toBe(true);
                expect(glove!.getAttribute('class')).toBe(styles.paper);
              }
            }
          }
        },
      );
      And('its face is on the thing itself', () => {
        for (const { el, look } of all) {
          // No head: every eye on a main part of its body.
          const parts = [...el.querySelectorAll('[data-part="own"] [data-part="shade"]')].map(
            (shade) => bounds(shade.getAttribute('d')!),
          );
          for (const [x, y] of CREATURE_SPEC[look.mount].eyes) {
            const on = parts.some(
              (box) => x > box.left && x < box.right && y > box.top && y < box.bottom,
            );
            expect(on, `${look.mount} eye at ${x} ${y}`).toBe(true);
          }
        }
      });
    });

    RuleScenario('Four animals and four spooky creatures', ({ When, Then, And }) => {
      const choices = theRace.lineUp!.options[0]!.choices;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      /** The racers in `group` right after `last`, which ends `held`. */
      const after = (group: string, held: string) => {
        const names = listed(held);
        const last = names.pop()!;
        const labels = choices
          .filter((choice) => choice.group === group)
          .map((choice) => choice.label);
        const from = labels.indexOf(last) + 1;
        expect(labels.slice(from, from + names.length)).toEqual(names);
        return names;
      };
      When('the Line-up opens for The Race', () => {
        expect(theRace.lineUp!.options[0]!.label).toBe('Racer');
      });
      Then('the group "Animals" also holds {any}', (_, held: string) => {
        expect(after('Animals', held)).toEqual(['Cat', 'Octopus', 'Penguin', 'Pigeon']);
      });
      And('the group "Spooky" also holds {any}', (_, held: string) => {
        expect(after('Spooky', held)).toEqual(['Ghost', 'Mummy', 'Yeti', 'Garden gnome']);
      });
    });

    RuleScenarioOutline(
      'Where a <creature> wears its colour, and its feet',
      ({ When, Then, And }, { creature: name, feet }) => {
        let svg: SVGSVGElement;
        When('someone races as a <creature> in tomato', async () => {
          svg = (await tomato(Object.keys(NEW_NAMES))).get(NEW_NAMES[name]!)!;
        });
        Then('<where> is tomato', () => wearsTomato(svg, name));
        And('it runs on <feet>', () => runsOn(modern(NEW_NAMES[name]!), feet));
      },
    );

    RuleScenario("The gnome has the kit's face", ({ When, Then }) => {
      const looks = new Map<string, ChosenLook>([
        ['Anna', { mount: 'gnome', colour: 'tomato', extra: 'scarf' }],
        ['Ben', { mount: 'duck', colour: 'sun', extra: 'scarf' }],
      ]);
      let drawn: Map<string, SVGSVGElement>;
      When('someone races as the garden gnome', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('its face and hands have the skin tone the kit hands out for the run', () => {
        const random = createRandom(4);
        planShow([...looks.keys()], 'Ben', random);
        const faces = handOutLooks([...looks.keys()], random);
        const svg = drawn.get('Anna')!;
        expect(svg.style.getPropertyValue('--skin')).toBe(
          `var(--color-skin-${faces.get('Anna')!.skin})`,
        );
        const skin = [...svg.querySelectorAll('[data-part="skin"], [data-part="hand"]')];
        // Its face, its nose and both hands.
        expect(skin).toHaveLength(4);
        for (const part of skin) expect(part.getAttribute('class')).toBe(styles.skin);
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

    RuleScenario(
      'Whatever reaches furthest, the unlucky person is over first',
      ({ Given, When, Then, And }) => {
        const team = names(8);
        const unlucky = team.at(-1)!;
        let short: number;
        let past: number;
        let runs: Plan[];
        Given(
          "{int} people, the unlucky person's racer leaning back {int} px short of its nose as it leads",
          (_, __: number, px: number) => {
            short = px;
          },
        );
        And("everyone else's hands reaching {int} px past their noses", (_, px: number) => {
          past = px;
        });
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          const reach = (name: string) =>
            name === unlucky ? { least: -short, most: 0 } : { least: 0, most: past };
          runs = Array.from({ length: seeds }, (_, index) =>
            planShow(team, unlucky, createRandom(index + 1), 'field', reach),
          );
        });
        Then(
          "all of the unlucky person's racer is over the line before anyone else's hands reach it",
          () => {
            expect(new Set(runs.map((plan) => plan.ending))).toEqual(new Set(ENDINGS));
            const step = 1 / 120;
            for (const plan of runs) {
              let over: number | null = null;
              for (let t = plan.times.stretch; t <= plan.times.end && over === null; t += step) {
                const line = lineAt(plan, t);
                for (const name of team.filter((each) => each !== unlucky)) {
                  expect(noseAt(plan, name, t) + past, `${plan.ending} ${name}`).toBeLessThan(line);
                }
                if (noseAt(plan, unlucky, t) - short >= line) over = t;
              }
              expect(over, plan.ending).not.toBeNull();
            }
          },
        );
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
    RuleScenario('The leader is scared, rider or creature', ({ Given, When, Then, And }) => {
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
      /** Who is in front in each racing frame, and whether they are a creature. */
      const leaders = () =>
        racing().map((frame) => {
          const [name, racer] = Object.entries(frame.racers).find(
            ([, each]) => each.nose === front(frame),
          )!;
          return { time: frame.time, racer, creature: isCreature(kindOf(watched, name)) };
        });
      Given('{int} people, four riders and four creatures', (_, count: number) => {
        expect(count).toBe(8);
      });
      When('the show runs', async () => {
        watched = await shared.mixed(8);
        const kinds = [...watched.looks.values()].map((look) => isCreature(look.mount as Kind));
        expect(kinds.filter(Boolean)).toHaveLength(4);
      });
      Then('whoever is in front looks scared and sweats', () => {
        for (const { time, racer } of leaders()) {
          expect(racer.mood, `${time}`).toBe('scared');
          expect(racer.sweat).toBe(true);
        }
      });
      And(
        'a rider in front leans back and pulls on the reins, or holds on tight on the chair',
        () => {
          const riders = leaders().filter((leader) => !leader.creature);
          expect(riders.length).toBeGreaterThan(0);
          for (const { racer } of riders) expect(racer.pose).toBe('pull');
        },
      );
      And('a creature in front leans back and flails its arms, while its legs keep running', () => {
        const creatures = leaders().filter((leader) => leader.creature);
        expect(creatures.length).toBeGreaterThan(0);
        for (const { racer } of creatures) {
          expect(racer.pose).toBe('pull');
          expect(racer.gait).not.toBe('off');
        }
        // Swinging both ways.
        const flails = new Set(creatures.map(({ racer }) => Math.sign(racer.flail)));
        expect(flails.has(-1) && flails.has(1)).toBe(true);
      });
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
            expect(racer.flail).toBe(0);
            if (racer.pose === 'wave') waving++;
          }
        }
        expect(waving).toBeGreaterThan(0);
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
          const surge = { kind: 'burst', subject: 'Anna', cause: 'racer', at: slow } as const;
          const said = eventCaption(surge, kindOf(watched, 'Anna'));
          const shown = watched.record.captions.find((each) => each.text === said)!;
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

    RuleScenario('A creature wins', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}, racing as the dinosaur', async (_, name: string) => {
        watched = await shared.dinosaurWins();
        expect(watched.unlucky).toBe(name);
        expect(watched.looks.get(name)!.mount).toBe('dinosaur');
      });
      When('Dario has crossed the line', () => {
        expect(crossingOf(watched.plan, 'Dario')!).toBeLessThanOrEqual(watched.plan.times.finish);
      });
      Then('the caption is {string}, with a fanfare and confetti', (_, caption: string) => {
        const { win } = watched.plan.times;
        expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
        expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
        expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
      });
      And(
        'the dinosaur balances the trophy on its head, waving its tiny arms, in the party mood',
        () => {
          const after = between(watched, watched.plan.times.win + STEP, Infinity);
          for (const frame of after) {
            expect(frame.racers.Dario).toMatchObject({
              trophy: true,
              mood: 'party',
              pose: 'party',
            });
          }
          expect(new Set(after.map((frame) => Math.sign(frame.racers.Dario!.flail)))).toEqual(
            new Set([-1, 0, 1]),
          );
          // The trophy's base sits on the top of its head, at y 22.
          const [, top] = CREATURE_SPEC.dinosaur.cup;
          expect(Math.abs(top + 57 - 22)).toBeLessThanOrEqual(4);
        },
      );
      And('a shark balances it on its fin, and every other creature holds it over its head', () => {
        const face = handOutLooks(['Dario'], createRandom(1)).get('Dario')!;
        for (const kind of CREATURES) {
          const one = creature({ mount: kind, colour: 'sun', extra: 'scarf' }, { face, number: 1 });
          one.setMood('party');
          one.setPose('party');
          one.setTrophy(true);
          const [x, y] = CREATURE_SPEC[kind].cup;
          if (kind === 'shark') {
            // Its base on the fin, which rises from (104, 46) to its tip at (92, 2).
            expect(x).toBeGreaterThan(92);
            expect(x).toBeLessThan(138);
            expect(y + 57).toBeGreaterThan(2);
            expect(y + 57).toBeLessThan(46);
          } else if (!['dinosaur', 'pigeon', 'gnome'].includes(kind)) {
            // "A pigeon or a gnome wins" says where theirs goes.
            expect(handsOf(one), kind).toEqual([
              [x - 22, y + 30],
              [x + 22, y + 30],
            ]);
          }
        }
      });
    });

    /** Where a creature's hands are, or its fins' tips. */
    const handsOf = (one: ReturnType<typeof creature>) =>
      CREATURE_SPEC[one.look.mount].fins
        ? [...one.el.querySelectorAll('[data-part$="-arm"] > path:first-child')].map(
            // A leaf: M root Q bulge tip Q bulge root Z.
            (leaf) =>
              leaf
                .getAttribute('d')!
                .match(/-?[\d.]+/g)!
                .slice(4, 6)
                .map(Number),
          )
        : [...one.el.querySelectorAll('[data-part="hand"]')].map((hand) => [
            Number(hand.getAttribute('cx')),
            Number(hand.getAttribute('cy')),
          ]);

    RuleScenario('A pigeon or a gnome wins', ({ When, Then, And }) => {
      const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
      /** `kind` as it is once it has crossed the line first. */
      const winning = (kind: Creature) => {
        const one = creature({ mount: kind, colour: 'sun', extra: 'scarf' }, { face, number: 1 });
        one.setMood('party');
        one.setPose('party');
        one.setTrophy(true);
        expect(one.el.dataset).toMatchObject({ trophy: 'true', mood: 'party' });
        return one;
      };
      /** The trophy's base, 57 below its top. */
      const base = (kind: Creature) => CREATURE_SPEC[kind].cup[1] + 57;
      When('a pigeon or a garden gnome has crossed the line first', () => {
        expect(CREATURE_SPEC.pigeon.reach).toBeLessThan(1);
        expect(CREATURE_SPEC.gnome.reach).toBeLessThan(1);
      });
      Then(
        'the pigeon balances the trophy on its head, and the gnome on the tip of its hat',
        () => {
          // The pigeon's head is a circle round (162, 46) of radius 26; the gnome's hat peaks near (130, -26).
          expect(CREATURE_SPEC.pigeon.cup[0]).toBe(162);
          expect(Math.abs(base('pigeon') - (46 - 26))).toBeLessThanOrEqual(4);
          expect(CREATURE_SPEC.gnome.cup[0]).toBe(130);
          expect(Math.abs(base('gnome') - -26)).toBeLessThanOrEqual(4);
          // Their short wings and arms wave below it.
          for (const kind of ['pigeon', 'gnome'] as const) {
            for (const [, hy] of handsOf(winning(kind))) {
              expect(hy! - CREATURE_SPEC[kind].cup[1], kind).toBeGreaterThan(40);
            }
          }
        },
      );
      And(
        'the penguin holds it up in its flippers, and every other new creature over its head',
        () => {
          for (const kind of Object.values(NEW_NAMES)) {
            if (kind === 'pigeon' || kind === 'gnome') continue;
            const [x, y] = CREATURE_SPEC[kind].cup;
            expect(handsOf(winning(kind)), kind).toEqual([
              [x - 22, y + 30],
              [x + 22, y + 30],
            ]);
          }
        },
      );
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

  it('has one event of the track’s own off the sports field, and none on it', () => {
    for (const { label, plan } of all) {
      const own = plan.events.filter((event) => event.cause === 'track');
      expect(own, label).toHaveLength(plan.course === 'field' ? 0 : 1);
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
