import { describe, expect, it } from 'vitest';
import type { Look } from '../../scenario-kit';
import { COURSES } from './plan';
import styles from './the-race.module.css';
import {
  EXTRAS,
  MOUNTS,
  photoCard,
  racer,
  RIDER,
  SPEC,
  track,
  type Mount,
  type RideLook,
} from './parts';

const FACE: Look = { skin: 2, accessory: 'cap', colour: 'grape', ring: 'mint' };

const shown = (root: Element, selector: string) => {
  const el = root.querySelector(selector);
  if (!el) return false;
  // Shown when neither it nor anything up to the root is hidden.
  for (let at: Element | null = el; at && at !== root; at = at.parentElement) {
    if (at.getAttribute('display') === 'none') return false;
  }
  return true;
};

const drawn = (look: Partial<RideLook> = {}, number = 3) =>
  racer({ mount: 'duck', colour: 'sun', extra: 'scarf', ...look }, { face: FACE, number });

describe('a racer', () => {
  it('draws each mount in the racer’s colour, with the rider’s shirt to match', () => {
    for (const mount of MOUNTS) {
      const { el, face } = drawn({ mount, colour: 'grape' });
      expect(el.dataset.mount).toBe(mount);
      expect(el.style.getPropertyValue('--racer')).toBe('var(--color-grape)');
      expect(face.el.style.getPropertyValue('--shirt')).toBe('var(--color-grape)');
      expect(el.querySelector('[data-part="mount"]')!.children.length).toBeGreaterThan(3);
    }
  });

  it('seats every rider at the same height, whatever the mount', () => {
    const heights = MOUNTS.map((mount) => {
      const { rider } = drawn({ mount });
      return rider.getAttribute('transform')!.match(/translate\(\S+ (\S+)\)/)![1];
    });
    expect(new Set(heights)).toEqual(new Set([String(110 - RIDER.foot)]));
  });

  it('draws each extra, and only that one', () => {
    for (const extra of EXTRAS) {
      const { el } = drawn({ extra, mount: 'snail' });
      expect(el.dataset.extra).toBe(extra);
      expect(!!el.querySelector('[data-part="googly"]'), extra).toBe(extra === 'googly');
      expect(!!el.querySelector('[data-part="tophat"]'), extra).toBe(extra === 'tophat');
      expect(!!el.querySelector('[data-part="number"]'), extra).toBe(extra === 'number');
      expect(!!el.querySelector('[data-part="scarf"]'), extra).toBe(extra === 'scarf');
      expect(!!el.querySelector('[data-part="cape"]'), extra).toBe(extra === 'cape');
      expect(!!el.querySelector('[data-part="bowtie"]'), extra).toBe(extra === 'bowtie');
    }
  });

  it('wears the cape behind the rider, and the scarf and the bow tie in front', () => {
    const layers = (extra: RideLook['extra']) =>
      [...drawn({ extra }).el.querySelector('[data-part="lean"]')!.children].map(
        (child) => (child as SVGElement).dataset.part ?? 'head',
      );
    expect(layers('cape')).toEqual(['cape', 'head']);
    expect(layers('scarf')).toEqual(['head', 'scarf']);
    expect(layers('bowtie')).toEqual(['head', 'bowtie']);
    expect(layers('number')).toEqual(['head']);
  });

  it('keeps each mount’s props hidden until its burst or stop shows them', () => {
    const props = (mount: Mount) => Object.keys(drawn({ mount }).props).sort();
    expect(props('ostrich')).toEqual(['egg']);
    expect(props('rocket')).toEqual(['smoke']);
    expect(props('sandwich')).toEqual(['pickle', 'steam']);
    expect(props('hopper')).toEqual([]);
    for (const prop of Object.values(drawn({ mount: 'sandwich' }).props)) {
      expect(prop.getAttribute('display')).toBe('none');
    }
  });

  it('marks the rocket’s flame, and the ostrich’s legs', () => {
    expect(drawn({ mount: 'rocket' }).el.querySelectorAll('[data-part="flame"]')).toHaveLength(2);
    expect(drawn({ mount: 'ostrich' }).el.querySelectorAll('[data-part="legs"]')).toHaveLength(3);
  });

  it('has googly eyes instead of its own, one per eye', () => {
    const count = (mount: Mount, extra: RideLook['extra']) =>
      drawn({ mount, extra }).el.querySelectorAll('[data-part="mount"] circle').length;
    for (const mount of MOUNTS) {
      const googly = drawn({ mount, extra: 'googly' }).el.querySelectorAll(
        '[data-part="googly"] circle',
      );
      expect(googly).toHaveLength(SPEC[mount].googly.length * 2);
      expect(count(mount, 'googly') - googly.length).toBeLessThanOrEqual(count(mount, 'scarf'));
    }
  });

  it('wears its place in today’s list as a racing number', () => {
    expect(drawn({ extra: 'number' }, 7).el.querySelector('text')!.textContent).toBe('7');
  });

  it('gives a sun racer a tomato band and scarf, and the rest sun', () => {
    expect(drawn({ colour: 'sun' }).el.style.getPropertyValue('--band')).toBe(
      'var(--color-tomato)',
    );
    expect(drawn({ colour: 'mint' }).el.style.getPropertyValue('--band')).toBe('var(--color-sun)');
  });

  it('holds the reins, or the chair’s backrest, the hopper’s horns or the rocket’s handlebar', () => {
    for (const mount of MOUNTS) {
      const { el } = drawn({ mount });
      expect(el.dataset.pose).toBe('hold');
      expect(shown(el, '[data-part="reins"]'), mount).toBe(
        !['chair', 'hopper', 'rocket'].includes(mount),
      );
      expect(SPEC[mount].reins === null, mount).toBe(SPEC[mount].hold !== undefined);
    }
  });

  it('leans back and pulls on the reins when pulling, sweating when told', () => {
    const one = drawn({ mount: 'snail' });
    one.setMood('scared');
    one.setPose('pull');
    one.setSweat(true);
    const lean = one.el.querySelector('[data-part="lean"]')!.getAttribute('transform');
    expect(lean).toBe(`rotate(${RIDER.lean} 36 ${RIDER.foot})`);
    expect(shown(one.el, '[data-part="reins"]')).toBe(true);
    expect(one.el.querySelector('[data-part="reins"]')!.getAttribute('d')).toMatch(/^M\S+ \S+ L/);
    expect(one.el.dataset.sweat).toBe('true');
    expect(shown(one.face.el, '[data-part="sweat"]')).toBe(true);
    one.setPose('hold');
    expect(one.el.querySelector('[data-part="lean"]')!.getAttribute('transform')).toBe(
      'rotate(0 36 81)',
    );
  });

  it('waves one hand, and parties with both arms up and no reins, holding the trophy', () => {
    const one = drawn({ mount: 'caterpillar' });
    one.setPose('wave');
    expect(one.el.dataset.pose).toBe('wave');
    expect(shown(one.el, '[data-part="reins"]')).toBe(false);
    one.setMood('party');
    one.setPose('party');
    one.setTrophy(true);
    expect(shown(one.face.el, '[data-part="land-arms"]')).toBe(true);
    expect(shown(one.el, '[data-part="reins"]')).toBe(false);
    expect(shown(one.el, '[data-part="trophy"]')).toBe(true);
  });
});

describe('the track', () => {
  const lanes = [216, 278, 340];

  it('has grass, a paper line between each lane, the rail and bunting', () => {
    const { el } = track({ lanes, start: 426, finish: 6000 });
    const lines = el.querySelector('[data-part="lines"] path')!.getAttribute('d')!;
    expect(lines.match(/M/g)).toHaveLength(2);
    expect(el.querySelectorAll('[data-part="flags"] path').length).toBeGreaterThan(20);
    expect(el.querySelectorAll('[data-part="sign"]')).toHaveLength(5);
  });

  it('moves the start line, the finish line and the posts with the camera', () => {
    const field = track({ lanes, start: 426, finish: 6000 });
    const at = (part: string) =>
      field.el.querySelector(`[data-part="${part}"]`)!.getAttribute('transform');
    field.set(0);
    expect(at('start')).toBe('translate(426.0 0)');
    expect(shown(field.el, '[data-part="finish"]')).toBe(false);
    field.set(5100);
    expect(at('finish')).toBe('translate(900.0 0)');
    expect(shown(field.el, '[data-part="start"]')).toBe(false);
    expect(at('posts')).toBe('translate(-140.0 0)');
  });

  it('styles its signs apart from the drawings, which keep their own sizes', () => {
    const { el } = track({ lanes, start: 426, finish: 6000 });
    const board = el.querySelector('[data-part="sign"] p')!;
    const skateboard = drawn({ mount: 'duck' }).el.querySelector('[data-part="mount"] rect')!;
    expect(board.classList).not.toContain(skateboard.getAttribute('class'));
    expect(getComputedStyle(skateboard).width).not.toBe('max-content');
  });

  it('counts down to the finish with signs that pass by', () => {
    const field = track({ lanes, start: 426, finish: 6000 });
    const signs = () =>
      [...field.el.querySelectorAll<HTMLElement>('[data-part="sign"]')]
        .filter((sign) => !sign.hidden)
        .map((sign) => sign.textContent);
    field.set(0);
    expect(signs()).toEqual(['Start']);
    field.set(4500);
    expect(signs()).toEqual(['50 m', 'Finish']);
  });
});

describe('the office, the sea and the Moon', () => {
  const lanes = [216, 278, 340];
  const at = (el: Element, part: string) =>
    el.querySelector(`[data-part="${part}"]`)!.getAttribute('transform');

  it('draws each track on its own sky, and marks which it is', () => {
    for (const course of COURSES) {
      const { el } = track({ lanes, start: 426, finish: 6000, course });
      expect(el.dataset.course).toBe(course);
      expect(el.classList).toContain(styles[course]);
    }
  });

  it('moves the office’s wall at half the camera’s speed, and its partitions and carpet with it', () => {
    const office = track({ lanes, start: 426, finish: 6000, course: 'office' });
    office.set(5100);
    expect(at(office.el, 'wall')).toBe('translate(-1110.0 0)');
    expect(at(office.el, 'panels')).toBe('translate(-100.0 0)');
    expect(at(office.el, 'seams')).toBe('translate(-140.0 0)');
    expect(at(office.el, 'finish')).toBe('translate(900.0 0)');
  });

  it('moves the sea’s fish slowly, and its seaweed and floats with the camera', () => {
    const sea = track({ lanes, start: 426, finish: 6000, course: 'sea' });
    sea.set(5100);
    expect(at(sea.el, 'fish')).toBe('translate(-1020.0 0)');
    expect(at(sea.el, 'seaweed')).toBe('translate(0.0 0)');
    expect(at(sea.el, 'floats')).toBe('translate(-60.0 0)');
  });

  it('moves the Moon’s dashes and craters with the camera, and its sky barely', () => {
    const moon = track({ lanes, start: 426, finish: 6000, course: 'moon' });
    moon.set(5100);
    expect(at(moon.el, 'lines')).toBe('translate(-60.0 0)');
    expect(at(moon.el, 'craters')).toBe('translate(-1260.0 0)');
    expect(at(moon.el, 'space')).toBe('translate(-510.0 0)');
  });

  it('repeats each picture across the whole stage, wherever the camera is', () => {
    const office = track({ lanes, start: 426, finish: 6000, course: 'office' });
    const seams = office.el.querySelector('[data-part="seams"]')!;
    const xs = [...seams.children].map((tile) =>
      Number(tile.getAttribute('transform')!.match(/translate\((\S+) /)![1]),
    );
    expect(Math.min(...xs)).toBeLessThanOrEqual(-160);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(1280);
  });

  it('sticks the office’s signs to its partitions, and stands the others on posts but Christmas’s', () => {
    for (const course of COURSES) {
      const { el } = track({ lanes, start: 426, finish: 6000, course });
      const signs = [...el.querySelectorAll('[data-part="sign"]')];
      expect(signs.map((sign) => sign.textContent)).toEqual([
        'Start',
        '150 m',
        '100 m',
        '50 m',
        'Finish',
      ]);
      for (const sign of signs) {
        expect(!!sign.querySelector(`.${styles.post}`), course).toBe(
          course !== 'office' && course !== 'christmas',
        );
      }
    }
  });
});

describe('the photo-finish card', () => {
  it('shows the two side-on at the line, each named, and the verdict', () => {
    const card = photoCard(
      [
        { name: 'Priya', racer: drawn({ mount: 'caterpillar' }), nose: 378 },
        { name: 'Anna', racer: drawn({ mount: 'duck' }), nose: 396 },
      ],
      'Anna, by a nose!',
    );
    expect(card.dataset.part).toBe('photo');
    expect(card.querySelectorAll('[data-part="racer"]')).toHaveLength(2);
    expect(card.textContent).toContain('Priya');
    expect(card.textContent).toContain('Anna');
    expect(card.querySelector('p:last-child')!.textContent).toBe('Anna, by a nose!');
    const anna = card.querySelector<HTMLElement>('[data-person="Anna"]')!;
    expect(anna.style.translate).toBe(`${396 - SPEC.duck.nose * 1.4}px ${352 - 190 * 1.4}px`);
  });

  it('shows the track’s ground and sky behind the racers', () => {
    const grounds = {
      field: styles.grass,
      office: styles.carpet,
      sea: styles.sun,
      moon: styles.shark,
      christmas: styles.snow,
    };
    for (const course of COURSES) {
      const card = photoCard(
        [{ name: 'Anna', racer: drawn({ mount: 'duck' }), nose: 396 }],
        'Anna, by a nose!',
        course,
      );
      const view = card.firstElementChild!;
      expect(view.classList).toContain(styles[course]);
      expect(view.querySelector('svg rect')!.getAttribute('class')).toBe(grounds[course]);
    }
  });
});
