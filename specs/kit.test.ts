import { loadFeature } from '@amiceli/vitest-cucumber';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import gsap from 'gsap';
import { createElement } from 'react';
import { expect, vi } from 'vitest';
import { discoverScenarios } from '../src/catalogue/discover';
import { Lab } from '../src/lab/Lab';
import { nameLength } from '../src/people/names';
import { handOutLooks, head, type Look, type Mood } from '../src/scenario-kit/characters';
import type { Scenario, Show } from '../src/scenario-kit/contract';
import { bob, shake } from '../src/scenario-kit/motion';
import { eliminationOrder } from '../src/scenario-kit/order';
import { createRandom } from '../src/scenario-kit/random';
import { spread } from '../src/scenario-kit/stage';
import { runShow, type ShowRecord } from '../src/scenario-kit/testing';
import { bubble, nameTag } from '../src/scenario-kit/text';
import { fitBeats } from '../src/scenario-kit/time';
import { onReset } from '../src/test/reset';
import { TEAM } from './support/app';
import { fakeScenario } from './support/fake-scenarios';
import { describeSpec } from './support/spec';

/** One frame of the harness's clock. */
const FRAME = 1 / 30;
/** A pick to run kit checks on, when who is in it doesn't matter. */
const PICK = { names: ['Anna', 'Ben', 'Carla'], unlucky: 'Ben' };

/** Show seconds since `start` on GSAP's clock. */
const since = (start: number) => gsap.globalTimeline.time() - start;

/** The size a name tag is set at, in stage pixels. */
const tagSize = (tag: HTMLElement) => parseFloat(tag.style.getPropertyValue('--tag-size'));

/** Stands in for the browser's font loading: `ready` resolves when `load` is called. */
function fontsStillLoading() {
  let load!: () => void;
  const ready = new Promise<void>((resolve) => (load = resolve));
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  onReset(() => Reflect.deleteProperty(document, 'fonts'));
  return load;
}

const renderLab = (scenarios: readonly Scenario[]) => render(createElement(Lab, { scenarios }));

const MOODS: Mood[] = ['calm', 'worried', 'scared', 'happy', 'party'];
const ACCESSORIES = ['cap', 'goggles', 'snorkel'];
const LOOK: Look = { skin: 3, accessory: 'snorkel', colour: 'mint', ring: 'tomato' };

/** The parts of a head that are drawn, by name. */
const visibleParts = (el: SVGSVGElement) =>
  [...el.querySelectorAll<SVGElement>('[data-part]')]
    .filter((part) => part.getAttribute('display') !== 'none')
    .map((part) => part.dataset.part!);

const expectNothingLeft = (record: ShowRecord) => {
  expect(record.stage?.childElementCount).toBe(0);
  expect(record.stage?.isConnected).toBe(false);
  expect(record.leftovers).toEqual({ elements: 0, animations: 0, timers: 0, listeners: 0 });
};

describeSpec(await loadFeature('./kit.feature'), ({ Rule }) => {
  Rule('A show is handed what it needs', ({ RuleScenario }) => {
    RuleScenario('The stage is 1280 by 720 stage pixels', ({ When, Then }) => {
      let stage: HTMLElement;
      When('a show starts', async () => {
        const scenario = fakeScenario({
          play: (show) => {
            stage = show.stage;
          },
        });
        await runShow(scenario, PICK);
      });
      Then('its stage is 1280 by 720 stage pixels', () => {
        const style = getComputedStyle(stage);
        expect([style.width, style.height]).toEqual(['1280px', '720px']);
      });
    });

    RuleScenario('The names are a frozen copy', ({ Given, When, Then, And }) => {
      let names: string[];
      let handed: readonly string[];
      Given('the names "Anna", "Ben" and "Carla"', () => {
        names = ['Anna', 'Ben', 'Carla'];
      });
      When('a show starts', async () => {
        const scenario = fakeScenario({
          play: (show) => {
            handed = show.names;
          },
        });
        await runShow(scenario, { names, unlucky: 'Ben' });
      });
      Then('it is handed "Anna", "Ben" and "Carla", in that order', () => {
        expect(handed).toEqual(['Anna', 'Ben', 'Carla']);
      });
      And("it can't change them", () => {
        expect(handed).not.toBe(names);
        expect(() => (handed as string[]).push('Dario')).toThrow(TypeError);
        expect(handed).toEqual(['Anna', 'Ben', 'Carla']);
      });
    });

    RuleScenario('The same seed gives the same draws', ({ When, Then, And }) => {
      const draws = async (seed: number) => {
        let numbers: number[] = [];
        const scenario = fakeScenario({
          play: (show) => {
            numbers = Array.from({ length: 10 }, show.random);
          },
        });
        await runShow(scenario, { ...PICK, seed });
        return numbers;
      };
      let first: number[];
      let second: number[];
      When('two shows start with the same seed', async () => {
        first = await draws(42);
        second = await draws(42);
      });
      Then('they draw the same random numbers', () => {
        expect(second).toEqual(first);
        expect(new Set(first).size).toBe(10);
      });
      And('a show with another seed draws different ones', async () => {
        expect(await draws(43)).not.toEqual(first);
      });
    });

    RuleScenario("A show waits for the page's fonts", ({ Given, When, Then }) => {
      let load: () => void;
      let startedAt: number | null = null;
      Given("the page's fonts are still loading", () => {
        load = fontsStillLoading();
      });
      When('a show is started', async () => {
        let now = 0;
        const scenario = fakeScenario({
          play: async (show) => {
            startedAt ??= now;
            await show.wait(1);
          },
        });
        await runShow(scenario, {
          ...PICK,
          onFrame: (time) => {
            now = time;
            if (time >= 0.5) load();
          },
        });
      });
      Then("it doesn't begin until the fonts are ready", () => {
        expect(startedAt).toBeGreaterThanOrEqual(0.5);
      });
    });

    RuleScenario('A show loads the fonts its names are set in', ({ Given, When, Then }) => {
      /** What the show asked to load, and for which text. */
      const asked: [font: string, text: string | undefined][] = [];
      let loaded: () => void;
      let startedAt: number | null = null;
      Given("the page hasn't used the stage's fonts yet", () => {
        // Nothing is loading, so `ready` has nothing to wait for.
        const done = new Promise<void>((resolve) => (loaded = resolve));
        const fonts = {
          ready: Promise.resolve(),
          load(font: string, text?: string) {
            asked.push([font, text]);
            return done.then(() => []);
          },
        };
        Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
        onReset(() => Reflect.deleteProperty(document, 'fonts'));
      });
      When('a show is started', async () => {
        let now = 0;
        const scenario = fakeScenario({
          play: async (show) => {
            startedAt ??= now;
            await show.wait(1);
          },
        });
        await runShow(scenario, {
          ...PICK,
          onFrame: (time) => {
            now = time;
            if (time >= 0.5) loaded();
          },
        });
      });
      Then("it doesn't begin until the name tag and caption fonts are loaded for its names", () => {
        expect(startedAt).toBeGreaterThanOrEqual(0.5);
        const fonts = asked.map(([font]) => font);
        expect(fonts.some((font) => /^900 .*Nunito/.test(font))).toBe(true);
        expect(fonts.some((font) => /Lilita One/.test(font))).toBe(true);
        for (const [, text] of asked) {
          for (const name of PICK.names) expect(text).toContain(name);
        }
      });
    });
  });

  Rule("Time runs on GSAP's clock", ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('A wait lasts its show time', ({ When, Then }) => {
      let record: ShowRecord;
      When('a show waits 1.5 seconds', async () => {
        record = await runShow(fakeScenario({ play: (show) => show.wait(1.5) }), PICK);
      });
      Then('it carries on after 1.5 seconds of show time, not before', () => {
        expect(record.outcome).toBe('finished');
        expect(record.duration).toBeGreaterThan(1.5 - 1e-6);
        expect(record.duration).toBeLessThan(1.5 + 2 * FRAME);
      });
    });

    RuleScenario('Playing an animation lasts until it completes', ({ When, Then }) => {
      let record: ShowRecord;
      let progress = 0;
      When('a show plays a 2-second animation', async () => {
        const scenario = fakeScenario({
          play: async (show) => {
            const box = show.stage.appendChild(document.createElement('div'));
            const tween = gsap.to(box, { x: 100, duration: 2 });
            await show.play(tween);
            progress = tween.progress();
          },
        });
        record = await runShow(scenario, PICK);
      });
      Then('it carries on when the animation completes, not before', () => {
        expect(record.outcome).toBe('finished');
        expect(progress).toBe(1);
        expect(record.duration).toBeGreaterThan(2 - 1e-6);
        expect(record.duration).toBeLessThan(2 + 2 * FRAME);
      });
    });

    RuleScenarioOutline(
      'A cancel stops a pending <step> at once',
      ({ Given, When, Then, And }, { step }) => {
        let scenario: ReturnType<typeof fakeScenario>;
        let record: ShowRecord;
        let tween: gsap.core.Tween | null = null;
        let error: unknown = null;
        let rejectedAfter = 0;
        Given('a show is in a 5-second <step>', () => {
          scenario = fakeScenario({
            play: async (show) => {
              const start = gsap.globalTimeline.time();
              try {
                if (step === 'wait') {
                  await show.wait(5);
                } else {
                  const box = show.stage.appendChild(document.createElement('div'));
                  tween = gsap.to(box, { x: 100, duration: 5 });
                  await show.play(tween);
                }
              } catch (caught) {
                error = caught;
                rejectedAfter = since(start);
              }
            },
          });
        });
        When('the show is cancelled at 1 second', async () => {
          record = await runShow(scenario, { ...PICK, cancelAt: 1 });
        });
        Then('the <step> is rejected at once', () => {
          expect(record.outcome).toBe('cancelled');
          expect(error).toBeInstanceOf(DOMException);
          expect((error as DOMException).name).toBe('AbortError');
          expect(rejectedAfter).toBeCloseTo(1, 5);
        });
        And('nothing of it runs on', () => {
          expect(record.leftovers.animations).toBe(0);
          if (tween) expect((tween as gsap.core.Tween).progress()).toBeCloseTo(0.2, 1);
        });
      },
    );

    RuleScenario('Flexible beats stretch to reach a total', ({ Given, When, Then }) => {
      let beats: { fixed: { seconds: number }; flexible: { seconds: number; flexible: true } };
      let fitted: Record<'fixed' | 'flexible', number>;
      Given('a fixed beat of 2 seconds and a flexible beat of 3 seconds', () => {
        beats = { fixed: { seconds: 2 }, flexible: { seconds: 3, flexible: true } };
      });
      When('the beats are fitted to 10 seconds', () => {
        fitted = fitBeats(beats, 10);
      });
      Then('the fixed beat takes 2 seconds and the flexible beat 8', () => {
        expect(fitted.fixed).toBe(2);
        expect(fitted.flexible).toBeCloseTo(8, 9);
      });
    });

    RuleScenario('Beats that are long enough are left alone', ({ Given, When, Then }) => {
      let beats: { fixed: { seconds: number }; flexible: { seconds: number; flexible: true } };
      let fitted: Record<'fixed' | 'flexible', number>;
      Given('a fixed beat of 6 seconds and a flexible beat of 6 seconds', () => {
        beats = { fixed: { seconds: 6 }, flexible: { seconds: 6, flexible: true } };
      });
      When('the beats are fitted to 10 seconds', () => {
        fitted = fitBeats(beats, 10);
      });
      Then('the fixed beat takes 6 seconds and the flexible beat 6', () => {
        expect(fitted).toEqual({ fixed: 6, flexible: 6 });
      });
    });

    RuleScenarioOutline(
      'In development, a <seconds>-second show <warns>',
      ({ Given, When, Then }, { seconds, warns }) => {
        let scenario: ReturnType<typeof fakeScenario>;
        let warn: ReturnType<typeof vi.spyOn>;
        Given('a show that lasts <seconds> seconds', () => {
          scenario = fakeScenario({ name: 'Slowpoke', play: (show) => show.wait(Number(seconds)) });
        });
        When('it runs in development', async () => {
          warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
          await runShow(scenario, { ...PICK, development: true, limit: 20 });
        });
        Then('the console <warns>', () => {
          if (warns === 'stays quiet') {
            expect(warn).not.toHaveBeenCalled();
          } else {
            expect(warn).toHaveBeenCalledExactlyOnceWith(
              `Slowpoke lasted ${seconds}.0 s. A show must last 10 to 15 s.`,
            );
          }
        });
      },
    );
  });

  Rule('Who leaves when', ({ RuleScenario }) => {
    RuleScenario('Everyone leaves once, the unlucky person last', ({ Given, When, Then, And }) => {
      const names = TEAM.slice(0, 12);
      let unlucky: string;
      let order: string[];
      Given('12 names, with the unlucky person first in the list', () => {
        unlucky = names[0]!;
      });
      When('the order they leave in is drawn', () => {
        order = eliminationOrder(names, unlucky, createRandom(7));
      });
      Then('it lists each name once', () => {
        expect([...order].sort()).toEqual([...names].sort());
      });
      And('the unlucky person is last', () => {
        expect(order.at(-1)).toBe(unlucky);
      });
    });

    RuleScenario('The order changes with the seed', ({ When, Then }) => {
      const names = TEAM.slice(0, 12);
      let orders: Set<string>;
      When('the order 12 people leave in is drawn with 20 different seeds', () => {
        orders = new Set(
          Array.from({ length: 20 }, (_, seed) =>
            eliminationOrder(names, 'Luca', createRandom(seed)).join(),
          ),
        );
      });
      Then("the others don't always leave in the same order", () => {
        expect(orders.size).toBeGreaterThan(1);
      });
    });
  });

  Rule('People are spread out', ({ RuleScenario }) => {
    RuleScenario('People are spread evenly and centred', ({ When, Then, And }) => {
      let places: { x: number; size: number }[];
      When('4 people are spread across 100 to 1180 stage pixels', () => {
        places = spread(4, { left: 100, right: 1180 });
      });
      Then('they are evenly spaced', () => {
        const gaps = places.slice(1).map((place, index) => place.x - places[index]!.x);
        expect(gaps).toHaveLength(3);
        for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 9);
      });
      And('they are centred on 640', () => {
        expect((places[0]!.x + places.at(-1)!.x) / 2).toBeCloseTo(640, 9);
      });
    });

    RuleScenario('Fewer people are bigger, up to a cap', ({ When, Then, And }) => {
      let sizes: number[];
      When(
        '12, then 6, then 2 people are spread across the stage, at most 200 stage pixels each',
        () => {
          sizes = [12, 6, 2].map(
            (count) => spread(count, { left: 0, right: 1280 }, { maxSize: 200 })[0]!.size,
          );
        },
      );
      Then('the 6 are bigger than the 12', () => {
        expect(sizes[1]).toBeGreaterThan(sizes[0]!);
      });
      And('the 2 are 200 stage pixels', () => {
        expect(sizes[2]).toBe(200);
      });
    });
  });

  Rule('Text is safe and readable', ({ RuleScenario }) => {
    RuleScenario('A name tag shows a name as typed', ({ Given, When, Then, And }) => {
      let name: string;
      let tag: HTMLElement;
      Given('a person named {string}', (_, given: string) => {
        name = given;
      });
      When('their name tag is made', () => {
        tag = nameTag(name, { size: 48, maxWidth: 400 });
      });
      Then('it reads {string}', (_, text: string) => {
        expect(tag.textContent).toBe(text);
      });
      And('no element is created from it', () => {
        expect(tag.querySelector('b')).toBeNull();
      });
    });

    RuleScenario('A name tag is never too small', ({ When, Then }) => {
      let tag: HTMLElement;
      When('a name tag is asked for at 10 stage pixels', () => {
        tag = nameTag('Anna', { size: 10, maxWidth: 400 });
      });
      Then('it is set at 22 stage pixels', () => {
        expect(tagSize(tag)).toBe(22);
      });
    });

    RuleScenario(
      'A long name takes at most two lines, shrinking first',
      ({ Given, When, Then, And }) => {
        let name: string;
        let tag: HTMLElement;
        Given('a person named {string}, 30 characters with no space', (_, given: string) => {
          name = given;
          expect(nameLength(name)).toBe(30);
        });
        When('their name tag is made at 48 stage pixels, at most 240 stage pixels wide', () => {
          tag = nameTag(name, { size: 48, maxWidth: 240 });
        });
        Then('it takes at most two lines', () => {
          expect(Number(tag.dataset.lines)).toBeLessThanOrEqual(2);
          // jsdom has no text layout; the kit estimates 0.6 em per character there.
          expect(0.6 * tagSize(tag) * 30).toBeLessThanOrEqual(2 * parseFloat(tag.style.maxWidth));
          expect(getComputedStyle(tag).overflowWrap).toBe('anywhere');
        });
        And('it is set smaller than 48 stage pixels, and at 22 or more', () => {
          expect(tagSize(tag)).toBeLessThan(48);
          expect(tagSize(tag)).toBeGreaterThanOrEqual(22);
        });
      },
    );

    RuleScenario('A caption stays up for at least a second', ({ When, Then, And }) => {
      let record: ShowRecord;
      When('a show captions "One", and "Two" half a second later', async () => {
        const scenario = fakeScenario({
          play: async (show) => {
            show.caption('One');
            await show.wait(0.5);
            show.caption('Two');
            await show.wait(2);
          },
        });
        record = await runShow(scenario, PICK);
      });
      Then('"One" is on screen for 1 second', () => {
        const [one] = record.captions;
        expect(one?.text).toBe('One');
        expect(one!.to - one!.from).toBeGreaterThan(1 - 1e-6);
      });
      And('"Two" comes after it', () => {
        expect(record.captions.map(({ text }) => text)).toEqual(['One', 'Two']);
        expect(record.captions[1]!.from).toBeCloseTo(record.captions[0]!.to, 6);
      });
    });

    RuleScenario('Captions are read out', ({ When, Then }) => {
      let said: string | null = null;
      When('a show captions "Whoosh! 8 left"', async () => {
        const scenario = fakeScenario({
          play: async (show) => {
            show.caption('Whoosh! 8 left');
            await show.wait(0.5);
          },
        });
        await runShow(scenario, {
          ...PICK,
          onFrame: (_, stage) => {
            const frame = stage.closest('[data-kit="frame"]');
            said ??= frame?.querySelector('[aria-live="polite"]')?.textContent || null;
          },
        });
      });
      Then('a polite live region says "Whoosh! 8 left"', () => {
        expect(said).toBe('Whoosh! 8 left');
      });
    });

    RuleScenario('A bubble shows its text at its anchor', ({ When, Then, And }) => {
      let speech: HTMLElement;
      When('a bubble says "Woo-hoo!" at 640, 300', () => {
        speech = bubble('Woo-hoo!', { x: 640, y: 300 });
      });
      Then('it reads "Woo-hoo!"', () => {
        expect(speech.textContent).toBe('Woo-hoo!');
      });
      And('it points at 640, 300', () => {
        expect([speech.style.left, speech.style.top]).toEqual(['640px', '300px']);
      });
    });
  });

  Rule('Characters', ({ RuleScenario }) => {
    RuleScenario('A head has five moods and one accessory', ({ When, Then, And }) => {
      let heads: SVGSVGElement[];
      When('a head is drawn calm, worried, scared, happy and party', () => {
        heads = ACCESSORIES.flatMap((accessory) =>
          MOODS.map((mood) => head({ ...LOOK, accessory } as Look, { mood }).el),
        );
      });
      Then('each mood looks different', () => {
        for (let start = 0; start < heads.length; start += MOODS.length) {
          const looks = heads
            .slice(start, start + MOODS.length)
            .map((el) => visibleParts(el).join());
          expect(new Set(looks).size).toBe(MOODS.length);
        }
      });
      And('each head wears one accessory', () => {
        for (const el of heads) {
          const worn = ACCESSORIES.filter((accessory) =>
            el.querySelector(`[data-part="${accessory}"]`),
          );
          expect(worn).toHaveLength(1);
        }
      });
    });

    RuleScenario('A head keeps its look when its mood changes', ({ Given, When, Then }) => {
      let drawn: ReturnType<typeof head>;
      Given('a head with skin tone 3 and a snorkel', () => {
        drawn = head(LOOK, { mood: 'calm' });
      });
      When('its mood changes from calm to party', () => {
        const before = visibleParts(drawn.el).join();
        drawn.setMood('party');
        expect(visibleParts(drawn.el).join()).not.toBe(before);
      });
      Then('it still has skin tone 3 and a snorkel', () => {
        expect(drawn.el.style.getPropertyValue('--skin')).toBe('var(--color-skin-3)');
        expect(visibleParts(drawn.el)).toContain('snorkel');
      });
    });

    RuleScenario('Looks are varied', ({ When, Then }) => {
      let looks: Map<string, Look>;
      When('looks are handed out to 12 people', () => {
        looks = handOutLooks(TEAM.slice(0, 12), createRandom(5));
      });
      Then('they use at least 4 skin tones', () => {
        expect(looks.size).toBe(12);
        expect(new Set([...looks.values()].map((look) => look.skin)).size).toBeGreaterThanOrEqual(
          4,
        );
      });
    });
  });

  Rule('Motion', ({ RuleScenario }) => {
    RuleScenario("Motion runs on the show's clock and ends with it", ({ Given, When, Then }) => {
      let scenario: ReturnType<typeof fakeScenario>;
      let target: SVGSVGElement;
      const heights = new Set<number>();
      Given('a show that makes a head bob', () => {
        scenario = fakeScenario({
          play: async (show) => {
            target = show.stage.appendChild(head(LOOK).el);
            bob(target);
            await show.wait(2);
          },
        });
      });
      When('the show ends', async () => {
        await runShow(scenario, {
          ...PICK,
          onFrame: () => heights.add(Number(gsap.getProperty(target, 'y'))),
        });
      });
      Then('the head stops bobbing', () => {
        expect(heights.size).toBeGreaterThan(10);
        expect(gsap.getTweensOf(target)).toEqual([]);
      });
    });

    RuleScenario('With reduced motion, nothing shakes', ({ Given, When, Then }) => {
      let target: SVGSVGElement;
      const places = new Set<number>();
      Given('the viewer prefers reduced motion', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }));
      });
      When('a show shakes a head', async () => {
        const scenario = fakeScenario({
          play: async (show) => {
            expect(show.reducedMotion).toBe(true);
            target = show.stage.appendChild(head(LOOK).el);
            await show.play(shake(target, show));
            await show.wait(1);
          },
        });
        await runShow(scenario, {
          ...PICK,
          onFrame: () => places.add(Number(gsap.getProperty(target, 'x'))),
        });
      });
      Then("the head doesn't move", () => {
        expect([...places]).toEqual([0]);
      });
    });
  });

  Rule('The lab runs any show in development', ({ RuleScenario }) => {
    RuleScenario('The lab lists every scenario', ({ Given, When, Then }) => {
      const labRat = fakeScenario({ name: 'Lab Rat', developmentOnly: true });
      const potato = fakeScenario({ name: 'Hot Potato' });
      let scenarios: ReturnType<typeof discoverScenarios>;
      Given('a scenario marked development-only', () => {
        scenarios = discoverScenarios(
          {
            '../scenarios/lab-rat/index.ts': labRat,
            '../scenarios/hot-potato/index.ts': potato,
          },
          { production: false },
        );
      });
      When('the lab opens', () => {
        renderLab(scenarios);
      });
      Then('it lists every scenario, the development-only one included', () => {
        const options = screen.getAllByRole('option', { name: /Hot Potato|Lab Rat/ });
        expect(options.map((option) => option.textContent)).toEqual(['Hot Potato', 'Lab Rat']);
      });
    });

    RuleScenario('The lab runs a show as asked', ({ When, Then, And }) => {
      const draws: number[] = [];
      const sharkBait = fakeScenario({
        name: 'Shark Bait',
        play: (show) => void draws.push(show.random()),
      });
      When(
        'I run "Shark Bait" in the lab with 5 people, the unlucky person last and seed 42',
        async () => {
          const user = userEvent.setup();
          renderLab([fakeScenario({ name: 'Hot Potato' }), sharkBait]);
          await user.selectOptions(screen.getByRole('combobox', { name: 'Show' }), 'Shark Bait');
          await user.selectOptions(screen.getByRole('combobox', { name: 'People' }), '5');
          await user.selectOptions(
            screen.getByRole('combobox', { name: 'Unlucky person' }),
            'Last',
          );
          await user.clear(screen.getByRole('spinbutton', { name: 'Seed' }));
          await user.type(screen.getByRole('spinbutton', { name: 'Seed' }), '42');
          await user.click(screen.getByRole('button', { name: 'Run' }));
          await screen.findByText('Shark Bait finished.');
        },
      );
      Then('the show plays with 5 people', () => {
        expect(sharkBait.runs).toHaveLength(1);
        expect(sharkBait.runs[0]!.names).toHaveLength(5);
      });
      And('the last of them is the unlucky person', () => {
        const [run] = sharkBait.runs;
        expect(run!.unlucky).toBe(run!.names.at(-1));
      });
      And('its random draws come from seed 42', () => {
        expect(draws).toEqual([createRandom(42)()]);
      });
    });
  });

  Rule('Nothing is left after a show', ({ RuleScenarioOutline }) => {
    RuleScenarioOutline(
      'A show that <ends> leaves nothing behind',
      ({ Given, When, Then, And }, { ends }) => {
        let scenario: ReturnType<typeof fakeScenario>;
        let record: ShowRecord;
        Given('a show that starts an animation of its own after a wait', () => {
          scenario = fakeScenario({
            play: async (show: Show) => {
              await show.wait(0.5);
              const box = show.stage.appendChild(document.createElement('div'));
              gsap.to(box, { x: 500, duration: 10 });
              await show.wait(1);
            },
          });
        });
        When('the show <ends>', async () => {
          record = await runShow(scenario, {
            ...PICK,
            cancelAt: ends === 'is cancelled' ? 1 : undefined,
          });
          expect(record.outcome).toBe(ends === 'is cancelled' ? 'cancelled' : 'finished');
        });
        Then('the stage is empty', () => {
          expect(record.stage?.childElementCount).toBe(0);
          expect(record.stage?.isConnected).toBe(false);
        });
        And('no animation is left', () => {
          expectNothingLeft(record);
        });
      },
    );
  });
});
