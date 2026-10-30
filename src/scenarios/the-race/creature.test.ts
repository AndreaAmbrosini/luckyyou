import { describe, expect, it } from 'vitest';
import type { Look } from '../../scenario-kit';
import { creature, CREATURE_SPEC, LEAN } from './creature';
import { CREATURES, EXTRAS, type Creature, type RacerLook } from './parts';
import styles from './the-race.module.css';

const FACE: Look = { skin: 4, accessory: 'cap', colour: 'grape', ring: 'mint' };

const shown = (root: Element, selector: string) => {
  const el = root.querySelector(selector);
  if (!el) return false;
  for (let at: Element | null = el; at && at !== root; at = at.parentElement) {
    if (at.getAttribute('display') === 'none') return false;
  }
  return true;
};

const drawn = (look: Partial<RacerLook> & { mount?: Creature } = {}, number = 3) =>
  creature({ mount: 'zombie', colour: 'mint', extra: 'scarf', ...look }, { face: FACE, number });

/** The end of a path's `d`, as [x, y]. */
const end = (path: Element) =>
  path
    .getAttribute('d')!
    .trim()
    .split(/[ A-Z]+/)
    .slice(-2)
    .map(Number);

const arm = (el: Element, which: 'back' | 'front') =>
  el.querySelector(`[data-part="${which}-arm"] path`)!;

describe('a creature', () => {
  it('draws each creature in its colour, on its own feet, with no rider and no mount', () => {
    for (const kind of CREATURES) {
      const { el } = drawn({ mount: kind, colour: 'grape' });
      expect(el.dataset).toMatchObject({ part: 'creature', mount: kind, colour: 'grape' });
      expect(el.style.getPropertyValue('--racer')).toBe('var(--color-grape)');
      expect(el.querySelectorAll(`.${styles.racer}`).length, kind).toBeGreaterThan(0);
      // Two legs, each from a hip to a foot, and a shoe on each.
      const legs = el.querySelector('path[data-part="legs"]')!.getAttribute('d')!;
      expect(legs.match(/M/g), kind).toHaveLength(2);
      expect(el.querySelectorAll('[data-part="shoe"]'), kind).toHaveLength(2);
      expect(el.querySelector('[data-part="rider"], [data-part="mount"]')).toBeNull();
    }
  });

  it('gives the astronaut and the villain the kit’s skin tone, and the shark its legs', () => {
    for (const kind of ['astronaut', 'villain'] as const) {
      const { el } = drawn({ mount: kind });
      expect(el.style.getPropertyValue('--skin')).toBe('var(--color-skin-4)');
      expect(el.querySelector('[data-part="skin"]')!.getAttribute('class')).toBe(styles.skin);
    }
    const shark = drawn({ mount: 'shark' }).el;
    expect(
      shark.querySelector<SVGElement>('path[data-part="legs"]')!.style.getPropertyValue('--paint'),
    ).toBe('var(--skin)');
  });

  it('draws each extra, and only that one', () => {
    for (const extra of EXTRAS) {
      const { el } = drawn({ extra, mount: 'robot' });
      expect(el.dataset.extra).toBe(extra);
      for (const part of ['tophat', 'number', 'scarf', 'cape', 'bowtie']) {
        expect(!!el.querySelector(`[data-part="${part}"]`), `${extra} ${part}`).toBe(
          extra === part,
        );
      }
    }
  });

  it('makes its own eyes wobbly with googly eyes, but not a human face’s dots', () => {
    const eyes = (kind: Creature, extra: RacerLook['extra']) =>
      [...drawn({ mount: kind, extra }).face.querySelectorAll('circle')].map((eye) =>
        eye.getAttribute('r'),
      );
    expect(eyes('alien', 'googly')).toHaveLength(6);
    expect(eyes('alien', 'googly')).not.toEqual(eyes('alien', 'scarf'));
    expect(eyes('villain', 'googly')).toEqual(eyes('villain', 'scarf'));
  });

  it('wears its place in today’s list as a racing number on its chest', () => {
    const { el } = drawn({ mount: 'zombie', extra: 'number' }, 7);
    const roundel = el.querySelector('[data-part="number"]')!;
    expect(roundel.textContent).toBe('7');
    const [x, y] = CREATURE_SPEC.zombie.chest;
    expect(roundel.querySelector('circle')!.getAttribute('cx')).toBe(String(x));
    expect(roundel.querySelector('circle')!.getAttribute('cy')).toBe(String(y));
  });

  it('wears the scarf, cape and bow tie in sun, or tomato when it is sun', () => {
    expect(drawn({ colour: 'sun' }).el.style.getPropertyValue('--band')).toBe(
      'var(--color-tomato)',
    );
    expect(drawn({ colour: 'sea' }).el.style.getPropertyValue('--band')).toBe('var(--color-sun)');
    for (const extra of ['scarf', 'cape', 'bowtie'] as const) {
      for (const shape of drawn({ extra }).el.querySelectorAll(`[data-part="${extra}"] > *`)) {
        expect(shape.getAttribute('class')).toBe(styles.band);
      }
    }
  });

  it('runs with a zombie’s arms out in front, and the rest swinging by its sides', () => {
    const zombie = drawn({ mount: 'zombie' }).el;
    const [x] = CREATURE_SPEC.zombie.shoulders[1];
    expect(end(arm(zombie, 'front'))[0]! - x).toBeGreaterThan(50);
    const robot = drawn({ mount: 'robot' }).el;
    const [, y] = CREATURE_SPEC.robot.shoulders[1];
    expect(end(arm(robot, 'front'))[1]).toBeGreaterThan(y);
  });

  it('leans back when scared, sweating, eyes wide and arms up, its legs running on', () => {
    for (const kind of CREATURES) {
      const one = drawn({ mount: kind });
      const legs = one.el.querySelector('path[data-part="legs"]')!.getAttribute('d');
      one.setMood('scared');
      one.setPose('pull');
      const [h1, h2] = CREATURE_SPEC[kind].hips;
      expect(one.body.getAttribute('transform')).toBe(
        `rotate(${LEAN} ${(h1[0] + h2[0]) / 2} ${(h1[1] + h2[1]) / 2})`,
      );
      expect(one.el.dataset).toMatchObject({ mood: 'scared', pose: 'pull', sweat: 'true' });
      expect(shown(one.el, '[data-part="sweat"]')).toBe(true);
      expect(one.el.querySelector('path[data-part="legs"]')!.getAttribute('d')).toBe(legs);
      // Both arms up over the shoulders, or the fins.
      for (const [i, which] of (['back', 'front'] as const).entries()) {
        const shoulder = CREATURE_SPEC[kind].shoulders[i]![1];
        const tip = Math.min(...end(arm(one.el, which)).slice(1));
        if (CREATURE_SPEC[kind].reach > 0) expect(tip, kind).toBeLessThan(shoulder);
      }
    }
  });

  it('is worried with brows, and calm without', () => {
    const one = drawn({ mount: 'monster' });
    const brows = () => one.face.querySelector('path')!.getAttribute('d');
    expect(brows()).toBe('M0 0');
    one.setMood('worried');
    expect(brows()).not.toBe('M0 0');
    expect(one.el.dataset.sweat).toBe('false');
  });

  it('waves one arm', () => {
    const one = drawn({ mount: 'alien' });
    one.setMood('happy');
    one.setPose('wave');
    const [x, y] = CREATURE_SPEC.alien.shoulders[1];
    const [hx, hy] = end(arm(one.el, 'front'));
    expect(hy).toBeLessThan(y - 30);
    expect(Math.abs(hx! - x)).toBeLessThan(20);
    expect(one.el.dataset.pose).toBe('wave');
  });

  it('parties in shades, holding the trophy overhead, or balancing it on its head or fin', () => {
    for (const kind of CREATURES) {
      const one = drawn({ mount: kind });
      expect(shown(one.el, '[data-part="trophy"]')).toBe(false);
      one.setMood('party');
      one.setPose('party');
      one.setTrophy(true);
      expect(shown(one.el, '[data-part="shades"]')).toBe(true);
      const trophy = one.el.querySelector('[data-part="trophy"]')!;
      expect(shown(one.el, '[data-part="trophy"]')).toBe(true);
      const [cx, cy] = CREATURE_SPEC[kind].cup;
      expect([trophy.getAttribute('x'), trophy.getAttribute('y')]).toEqual([
        String(cx - 36),
        String(cy),
      ]);
      // Overhead: the hands at the cup's handles; short arms only wave.
      const [hx, hy] = end(arm(one.el, 'front'));
      if (CREATURE_SPEC[kind].reach === 1) {
        expect([hx, hy], kind).toEqual([cx + 24, cy + 26]);
      } else if (!CREATURE_SPEC[kind].fins) {
        expect(hy! - cy, kind).toBeGreaterThan(40);
      }
    }
    // The dinosaur's sits on its head, the shark's on its fin's tip.
    expect(CREATURE_SPEC.dinosaur.cup).toEqual([164, -36]);
    expect(CREATURE_SPEC.shark.cup).toEqual([108, -40]);
  });
});
