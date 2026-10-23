import { describe, expect, it } from 'vitest';
import { BLOCK_HEIGHT } from './layout';
import { block, dust, field, hardHat, pointer, POINTER } from './parts';

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
    expect(POINTER.height).toBeLessThanOrEqual(60);
    expect(POINTER.tip).toEqual({ x: POINTER.width / 2, y: POINTER.height });
    expect(p.el.style.width).toBe(`${POINTER.width}px`);
    expect(p.el.style.height).toBe(`${POINTER.height}px`);
    expect(p.el.textContent).toContain('Your turn!');
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
