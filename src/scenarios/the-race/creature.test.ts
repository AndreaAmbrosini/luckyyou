import { describe, expect, it } from 'vitest';
import type { Look } from '../../scenario-kit';
import { creature, CREATURE_SPEC, FEET, LEAN } from './creature';
import { CREATURES, EXTRAS, RACER, type Creature, type RacerLook } from './parts';
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

/** Both legs' paths, back then front. */
const legs = (el: Element) =>
  [...el.querySelectorAll('path[data-part="legs"]')].map((leg) => leg.getAttribute('d'));

/** A foot's place: its ankle, how far it's turned, and its size. */
const footAt = (foot: Element) => {
  const [x, y, turn, k] = foot
    .getAttribute('transform')!
    .match(/-?[\d.]+/g)!
    .map(Number);
  return { x: x!, y: y!, turn: turn!, k: k! };
};

describe('a creature', () => {
  it('draws each creature in its colour, on its own feet, with no rider and no mount', () => {
    for (const kind of CREATURES) {
      const { el } = drawn({ mount: kind, colour: 'grape' });
      expect(el.dataset).toMatchObject({ part: 'creature', mount: kind, colour: 'grape' });
      expect(el.style.getPropertyValue('--racer')).toBe('var(--color-grape)');
      expect(el.querySelectorAll(`.${styles.racer}`).length, kind).toBeGreaterThan(0);
      // Two legs, each from a hip to a foot, and a shoe on each.
      expect(
        legs(el).map((d) => d!.match(/M/g)!.length),
        kind,
      ).toEqual([1, 1]);
      expect(el.querySelectorAll('[data-part="shoe"]'), kind).toHaveLength(2);
      expect(el.querySelector('[data-part="rider"], [data-part="mount"]')).toBeNull();
    }
  });

  it('sprints: its front foot planted on the line, its back one kicked up behind', () => {
    for (const kind of CREATURES) {
      const one = drawn({ mount: kind });
      const [back, front] = one.shoes.map(footAt);
      expect(front!.turn, kind).toBe(0);
      expect(front!.y + 11 * front!.k, kind).toBeCloseTo(RACER.feet, 5);
      expect(back!.turn, kind).toBe(62);
      expect(back!.y, kind).toBeLessThan(front!.y);
      expect(back!.x, kind).toBeLessThan(front!.x);
    }
  });

  it('runs in its own kind of feet, any of six', () => {
    const paints = { shoe: 'shoe', sole: 'sole', stripe: 'stripe', line: 'var(--racer)' };
    for (const [kind, foot] of Object.entries(FEET)) {
      const shoes = foot(paints).filter(([, , attributes]) => attributes['data-part'] === 'shoe');
      expect(shoes, kind).toHaveLength(1);
    }
    expect(Object.keys(FEET)).toEqual(['sneaker', 'boot', 'bare', 'paddle', 'toes', 'tip']);
    const feet = (kind: Creature) => drawn({ mount: kind }).shoes.map((foot) => foot.dataset.foot);
    expect(feet('zombie')).toEqual(['sneaker', 'sneaker']);
    expect(feet('robot')).toEqual(['boot', 'boot']);
    expect(feet('monster')).toEqual(['bare', 'bare']);
    expect(footAt(drawn({ mount: 'monster' }).shoes[1]).k).toBe(1.2);
  });

  it('gives the astronaut and the villain the kit’s skin tone, and the shark its legs', () => {
    for (const kind of ['astronaut', 'villain'] as const) {
      const { el } = drawn({ mount: kind });
      expect(el.style.getPropertyValue('--skin')).toBe('var(--color-skin-4)');
      expect(el.querySelector('[data-part="skin"]')!.getAttribute('class')).toBe(styles.skin);
    }
    const shark = drawn({ mount: 'shark' }).el;
    for (const leg of shark.querySelectorAll<SVGElement>('path[data-part="legs"]')) {
      expect(leg.style.getPropertyValue('--paint')).toBe('var(--skin)');
    }
  });

  it('shades each main part, its shadow clipped by an id no other drawing uses', () => {
    const ids = (kind: Creature) =>
      [...drawn({ mount: kind }).el.querySelectorAll('clipPath')].map((clip) => clip.id);
    const one = ids('zombie');
    expect(one.length).toBeGreaterThan(0);
    expect(new Set(one).size).toBe(one.length);
    for (const id of ids('zombie')) expect(one).not.toContain(id);
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

  it('makes every face’s eyes white and wobbly with googly eyes, with no lids', () => {
    const eyes = (kind: Creature, extra: RacerLook['extra']) =>
      [...drawn({ mount: kind, extra }).face.querySelectorAll('[data-part="eye"]')].map((eye) => [
        eye.getAttribute('class'),
        eye.getAttribute('rx'),
      ]);
    expect(eyes('alien', 'googly')).toHaveLength(3);
    expect(eyes('alien', 'googly')).not.toEqual(eyes('alien', 'scarf'));
    // A human face's dark eyes turn white.
    expect(eyes('villain', 'scarf').map(([fill]) => fill)).toEqual([styles.ink, styles.ink]);
    expect(eyes('villain', 'googly').map(([fill]) => fill)).toEqual([styles.paper, styles.paper]);
    expect(shown(drawn({ mount: 'zombie', extra: 'googly' }).face, '[data-part="lid"]')).toBe(
      false,
    );
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
      const shapes = [...drawn({ extra }).el.querySelectorAll(`[data-part="${extra}"] > *`)];
      // All but the scarf's fringe, which is a line.
      const filled = shapes.filter((shape) => shape.getAttribute('class') !== styles.line);
      expect(filled.length).toBeGreaterThan(0);
      for (const shape of filled) expect(shape.getAttribute('class')).toBe(styles.band);
    }
  });

  it('runs with a zombie’s arms out in front, and the rest pumping', () => {
    const zombie = drawn({ mount: 'zombie' }).el;
    const [x] = CREATURE_SPEC.zombie.shoulders[1];
    expect(end(arm(zombie, 'front'))[0]! - x).toBeGreaterThan(50);
    // The front hand forward at chest height, the back one behind.
    const robot = drawn({ mount: 'robot' }).el;
    const [[bx], [fx, fy]] = CREATURE_SPEC.robot.shoulders;
    expect(end(arm(robot, 'front'))[0]).toBe(fx + 20);
    expect(end(arm(robot, 'front'))[1]).toBeGreaterThan(fy);
    expect(end(arm(robot, 'back'))[0]).toBeLessThan(bx);
  });

  it('bends its arms at the elbow and ends them in gloves, or paws, or fins as leaves', () => {
    for (const kind of CREATURES) {
      const { el } = drawn({ mount: kind });
      const d = arm(el, 'front').getAttribute('d')!;
      if (CREATURE_SPEC[kind].fins) {
        expect(d.match(/Q/g), kind).toHaveLength(2);
        expect(d.endsWith('Z'), kind).toBe(true);
        expect(shown(el, '[data-part="front-arm"] [data-part="hand"]'), kind).toBe(false);
        continue;
      }
      expect(d, kind).toMatch(/^M\S+ \S+ Q\S+ \S+ \S+ \S+$/);
      expect(shown(el, '[data-part="front-arm"] [data-part="hand"]'), kind).toBe(true);
      expect(shown(el, '[data-part="front-arm"] [data-part="thumb"]'), kind).toBe(
        !CREATURE_SPEC[kind].noThumb,
      );
    }
  });

  it('leans back when scared, sweating, eyes wide and arms up, its legs running on', () => {
    for (const kind of CREATURES) {
      const one = drawn({ mount: kind });
      const before = legs(one.el);
      one.setMood('scared');
      one.setPose('pull');
      const [h1, h2] = CREATURE_SPEC[kind].hips;
      expect(one.body.getAttribute('transform')).toBe(
        `rotate(${LEAN} ${(h1[0] + h2[0]) / 2} ${(h1[1] + h2[1]) / 2})`,
      );
      // The arms and the extras lean with it.
      expect(one.arms[1].parentElement!.getAttribute('transform')).toBe(
        one.body.getAttribute('transform'),
      );
      expect(one.el.dataset).toMatchObject({ mood: 'scared', pose: 'pull', sweat: 'true' });
      expect(shown(one.el, '[data-part="sweat"]')).toBe(true);
      expect(legs(one.el)).toEqual(before);
      // Both arms up over the shoulders, or the fins.
      for (const [i, which] of (['back', 'front'] as const).entries()) {
        const shoulder = CREATURE_SPEC[kind].shoulders[i]![1];
        const tip = Math.min(...end(arm(one.el, which)).slice(1));
        if (CREATURE_SPEC[kind].reach > 0) expect(tip, kind).toBeLessThan(shoulder);
      }
    }
  });

  it('has brows for every mood but a party, and a robot never', () => {
    const one = drawn({ mount: 'monster' });
    const brows = () =>
      shown(one.face, '[data-part="brows"]')
        ? one.face.querySelector('[data-part="brows"]')!.getAttribute('d')
        : null;
    const calm = brows();
    expect(calm).not.toBeNull();
    one.setMood('worried');
    expect(brows()).not.toBe(calm);
    expect(one.el.dataset.sweat).toBe('false');
    one.setMood('party');
    expect(brows()).toBeNull();
    expect(shown(drawn({ mount: 'robot' }).face, '[data-part="brows"]')).toBe(false);
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
      // A robot's screen keeps its glowing eyes.
      expect(shown(one.el, '[data-part="shades"]'), kind).toBe(!CREATURE_SPEC[kind].screen);
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
        expect([hx, hy], kind).toEqual([cx + 22, cy + 30]);
      } else if (!CREATURE_SPEC[kind].fins) {
        expect(hy! - cy, kind).toBeGreaterThan(40);
      }
    }
    // The dinosaur's sits on its head, the shark's on its fin's tip.
    expect(CREATURE_SPEC.dinosaur.cup).toEqual([164, -36]);
    expect(CREATURE_SPEC.shark.cup).toEqual([108, -40]);
  });
});
