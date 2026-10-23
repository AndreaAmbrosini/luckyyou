import { describe, expect, it } from 'vitest';
import { BLOCK_HEIGHT } from './layout';
import { block, dust, field, hardHat, pigeon, pointer, POINTER, type Pose } from './parts';

const POSES: readonly Pose[] = ['perched', 'flying'];

const hidden = (el: Element | null) => el?.getAttribute('display') === 'none';

describe('the field', () => {
  it('draws the sky with clouds and the grass', () => {
    const el = field();
    expect(el.dataset.part).toBe('scene');
    expect(el.querySelector('[data-part="grass"]')).not.toBeNull();
    expect(el.children.length).toBeGreaterThanOrEqual(4);
  });
});

describe('the pointer', () => {
  it('is a compact sign whose tip is the bottom middle', () => {
    const p = pointer();
    expect(p.el.dataset.part).toBe('pointer');
    expect(p.height).toBeLessThanOrEqual(60);
    expect(p.tip).toEqual({ x: p.width / 2, y: p.height });
    expect(p.el.style.width).toBe(`${POINTER.width}px`);
    expect(p.el.style.height).toBe(`${POINTER.height}px`);
    expect(p.el.textContent).toContain('Your turn!');
  });

  it('can be a dashed ghost', () => {
    const p = pointer();
    expect(p.el.dataset.ghost).toBe('false');
    p.setGhost(true);
    expect(p.el.dataset.ghost).toBe('true');
    p.setGhost(false);
    expect(p.el.dataset.ghost).toBe('false');
  });
});

describe('a block', () => {
  it('has the width and colour it was given', () => {
    const b = block(150, 'var(--color-tomato)');
    expect(b.dataset.part).toBe('block');
    expect(b.style.width).toBe('150px');
    expect(b.style.height).toBe(`${BLOCK_HEIGHT}px`);
    expect(b.dataset.fill).toBe('var(--color-tomato)');
    expect(b.style.getPropertyValue('--block-fill')).toBe('var(--color-tomato)');
  });

  it('takes its own height, for the one held overhead', () => {
    expect(block(100, 'var(--color-paper)', 40).style.height).toBe('40px');
    expect(block(100, 'var(--color-paper)', 25).style.height).toBe('25px');
  });
});

describe('the pigeon', () => {
  it('shows exactly one pose at a time', () => {
    const bird = pigeon();
    expect(bird.el.dataset.part).toBe('pigeon');
    for (const pose of POSES) {
      bird.setPose(pose);
      expect(bird.el.dataset.pose).toBe(pose);
      for (const other of POSES) {
        const groups = [...bird.el.querySelectorAll(`[data-pose-part="${other}"]`)];
        expect(groups.length, other).toBeGreaterThan(0);
        for (const group of groups) {
          expect(hidden(group), `${other} while ${pose}`).toBe(other !== pose);
        }
      }
    }
  });

  it('paints each wing over the body', () => {
    const bird = pigeon();
    const body = bird.el.querySelector('ellipse')!;
    for (const pose of POSES) {
      const wing = bird.el.querySelector(`[data-pose-part="${pose}"] [data-wing]`);
      expect(wing, pose).not.toBeNull();
      expect(
        body.compareDocumentPosition(wing!) & Node.DOCUMENT_POSITION_FOLLOWING,
        pose,
      ).toBeTruthy();
    }
  });

  it('starts perched', () => {
    expect(pigeon().el.dataset.pose).toBe('perched');
  });
});

describe('the other drawings', () => {
  it('draws the hard hat on a 100 grid', () => {
    const hat = hardHat();
    expect(hat.dataset.part).toBe('hard-hat');
    expect(hat.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('draws a dust puff of the size asked', () => {
    const puff = dust(44);
    expect(puff.dataset.part).toBe('dust');
    expect(puff.style.width).toBe('44px');
    expect(puff.style.height).toBe('44px');
  });
});
