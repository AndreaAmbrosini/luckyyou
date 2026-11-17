import { loadFeature } from '@amiceli/vitest-cucumber';
import { screen } from '@testing-library/react';
import { afterAll, beforeAll, expect } from 'vitest';
import { loadPeople } from '../src/people/people';
import { catalogue } from '../src/catalogue/catalogue';
import { handOutLooks, head } from '../src/scenario-kit/characters';
import { createRandom } from '../src/scenario-kit/random';
import { runShow } from '../src/scenario-kit/testing';
import type { Scenario } from '../src/scenario-kit/contract';
import { creature } from '../src/scenarios/the-race/creature';
import { CREATURES } from '../src/scenarios/the-race/parts';
import { addName, blockStorage, choose, renderApp, storePeople, tickBox } from './support/app';
import { describeSpec } from './support/spec';

const PHOTO = 'data:image/jpeg;base64,/9j/2Q==';
const saved = () => storePeople([{ name: 'Anna', ticked: true, photo: PHOTO }]);

// jsdom has no native modal implementation; browser specs exercise its focus and Escape behavior.
beforeAll(() =>
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  }),
);
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});

describeSpec(await loadFeature('./photos.feature'), ({ Rule }) => {
  Rule('A photo belongs to the person', ({ RuleScenario }) => {
    RuleScenario('A saved photo survives a reload', ({ Given, When, Then }) => {
      Given('Anna has a saved photo', saved);
      When('I reload the people list', () => {
        renderApp();
      });
      Then('Anna still has that photo', () => {
        expect(loadPeople()[0]).toMatchObject({ name: 'Anna', photo: PHOTO });
      });
    });
    RuleScenario('A photo can be removed without removing the person', ({ Given, When, Then }) => {
      Given('Anna has a saved photo', () => {
        saved();
        renderApp();
      });
      When("I remove Anna's photo", async () => {
        await choose('Change photo for Anna');
        await choose('Remove photo');
      });
      Then('Anna has no photo and is still ticked', () => {
        expect(loadPeople()).toEqual([{ name: 'Anna', ticked: true }]);
        expect(tickBox('Anna')).toBeChecked();
      });
    });
    RuleScenario('Unsafe stored pictures do not remove names', ({ Given, When, Then }) => {
      Given('Anna has a remote picture in storage', () =>
        storePeople([{ name: 'Anna', ticked: true, photo: 'https://example.com/face.jpg' }]),
      );
      When('I reload the people list', () => {
        renderApp();
      });
      Then('Anna has no photo and is still ticked', () => {
        expect(loadPeople()).toEqual([{ name: 'Anna', ticked: true }]);
      });
    });
  });
  Rule('A photo replaces the drawn face, not the character', ({ RuleScenario }) => {
    RuleScenario(
      'A photo face keeps its accessories and reactions',
      ({ Given, When, Then, And }) => {
        let drawn: ReturnType<typeof head>;
        Given('a person has a photo face', () => {
          drawn = head({ skin: 1, accessory: 'cap', colour: 'mint', ring: 'pink', photo: PHOTO });
        });
        When('their mood changes through every mood', () => {
          for (const mood of ['calm', 'worried', 'scared', 'happy', 'party'] as const) {
            drawn.setMood(mood);
            expect(drawn.el.querySelector('image')).toHaveAttribute('href', PHOTO);
          }
          drawn.setSweat(true);
        });
        Then('the photo replaces their drawn facial features', () => {
          for (const part of [
            'eyes',
            'wide-eyes',
            'brows',
            'sunglasses',
            'smile',
            'frown',
            'scream',
            'grin',
          ]) {
            expect(drawn.el.querySelector(`[data-part="${part}"]`)).toBeNull();
          }
        });
        And('their accessory and sweat remain', () => {
          expect(drawn.el.querySelector('[data-part="cap"]')).not.toHaveAttribute(
            'display',
            'none',
          );
          expect(drawn.el.querySelector('[data-part="sweat"]')).not.toHaveAttribute(
            'display',
            'none',
          );
        });
      },
    );
    RuleScenario('Photos do not change the random choices', ({ When, Then }) => {
      let plain: ReturnType<typeof handOutLooks>;
      let photographed: ReturnType<typeof handOutLooks>;
      let plainNext: number;
      let photoNext: number;
      When('looks are handed out with and without photos', () => {
        const one = createRandom(42);
        const two = createRandom(42);
        plain = handOutLooks(['Anna', 'Ben'], one);
        photographed = handOutLooks(['Anna', 'Ben'], two, new Map([['Anna', PHOTO]]));
        plainNext = one();
        photoNext = two();
      });
      Then('the random choices are the same', () => {
        expect(photographed.get('Anna')).toEqual({ ...plain.get('Anna'), photo: PHOTO });
        expect(photographed.get('Ben')).toEqual(plain.get('Ben'));
        expect(photoNext).toBe(plainNext);
      });
    });
    RuleScenario("Every show uses the person's photo", ({ Given, When, Then }) => {
      const seen = new Set<string>();
      const outcomes: string[] = [];
      Given("Anna has a photo for today's pick", () => {});
      When('each available show plays', async () => {
        for (const scenario of catalogue) {
          if (scenario.developmentOnly) continue;
          const record = await runShow(scenario, {
            names: ['Anna', 'Ben'],
            unlucky: 'Anna',
            photos: new Map([['Anna', PHOTO]]),
            onFrame: (_, stage) => {
              if (stage.querySelector(`image[href="${PHOTO}"]`)) seen.add(scenario.id);
            },
          });
          outcomes.push(record.outcome);
          expect(record.leftovers).toEqual({ elements: 0, animations: 0, timers: 0, listeners: 0 });
        }
      });
      Then("every show draws Anna's photo and finishes", () => {
        expect([...seen].sort()).toEqual(
          catalogue
            .filter((show) => !show.developmentOnly)
            .map((show) => show.id)
            .sort(),
        );
        expect(outcomes.every((outcome) => outcome === 'finished')).toBe(true);
      });
    });
    RuleScenario("Every Race creature can wear the person's photo", ({ Given, When, Then }) => {
      const drawn: Element[] = [];
      Given("Anna has a photo for today's pick", () => {});
      When('every Race creature is drawn', () => {
        for (const mount of CREATURES) {
          const look = handOutLooks(['Anna'], createRandom(1), new Map([['Anna', PHOTO]])).get(
            'Anna',
          )!;
          const runner = creature(
            { mount, colour: 'mint', extra: 'googly' },
            { face: look, number: 1 },
          );
          runner.setMood('scared');
          runner.setMood('party');
          drawn.push(runner.el);
        }
      });
      Then('each creature wears the photo instead of its drawn expression', () => {
        expect(drawn).toHaveLength(CREATURES.length);
        for (const el of drawn) {
          expect(el.querySelector('[data-part="photo-face"] image')).toHaveAttribute('href', PHOTO);
          expect(el.querySelector('[data-part="face"]')).toHaveAttribute('display', 'none');
        }
        const ids = drawn.flatMap((el) =>
          [...el.querySelectorAll('clipPath')].map((clip) => clip.id),
        );
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
    RuleScenario("Shows cannot alter the team's photos", ({ Given, When, Then }) => {
      const photos = new Map([
        ['Anna', PHOTO],
        ['Not in the pick', PHOTO],
      ]);
      let handed: ReadonlyMap<string, string>;
      Given("Anna has a photo for today's pick", () => {});
      When('a show tries to change its photo snapshot', async () => {
        const scenario: Scenario = {
          id: 'photos',
          name: 'Photos',
          description: 'Photo snapshot',
          still: '',
          people: { min: 2, max: 12 },
          async play(show) {
            handed = show.photos;
            expect(() => (show.photos as Map<string, string>).set('Anna', 'changed')).toThrow(
              TypeError,
            );
            expect(() => (show.photos as Map<string, string>).delete('Anna')).toThrow(TypeError);
            expect(() => (show.photos as Map<string, string>).clear()).toThrow(TypeError);
            photos.set('Anna', 'outside change');
          },
        };
        expect(
          (await runShow(scenario, { names: ['Anna', 'Ben'], unlucky: 'Ben', photos })).outcome,
        ).toBe('finished');
      });
      Then("the photo snapshot stays unchanged and contains only today's people", () => {
        expect(handed!.get('Anna')).toBe(PHOTO);
        expect(handed!.has('Not in the pick')).toBe(false);
      });
    });
  });
  Rule('The host frames pictures before saving them', ({ RuleScenario }) => {
    RuleScenario('Each person has a separate photo control', ({ Given, When, Then }) => {
      Given('Anna is on the team', () => {
        storePeople([{ name: 'Anna', ticked: true }]);
        renderApp();
      });
      When("I open Anna's photo control", async () => choose('Add photo for Anna'));
      Then('I can choose a picture without changing who is ticked', () => {
        expect(screen.getByRole('dialog', { name: 'Photo for Anna' })).toBeVisible();
        expect(screen.getByLabelText('Choose picture')).toHaveAttribute('type', 'file');
        expect(tickBox('Anna')).toBeChecked();
      });
    });
    RuleScenario('Cancelling leaves the saved photo alone', ({ Given, When, Then }) => {
      Given('Anna has a saved photo', () => {
        saved();
        renderApp();
      });
      When("I cancel Anna's photo editor", async () => {
        await choose('Change photo for Anna');
        await choose('Cancel');
      });
      Then('Anna still has that photo', () => {
        expect(loadPeople()[0]).toMatchObject({ photo: PHOTO });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
    RuleScenario('Storage refusal is visible', ({ Given, When, Then }) => {
      Given('this browser cannot save the people list', () => {
        blockStorage();
        renderApp();
      });
      When('I add Anna to the team', async () => addName('Anna'));
      Then('I am warned that changes last only for this visit', () => {
        expect(screen.getByText(/only for this visit/i)).toHaveAttribute('role', 'status');
      });
    });
  });
});
