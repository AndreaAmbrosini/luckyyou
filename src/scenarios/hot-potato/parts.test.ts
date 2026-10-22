import { describe, expect, it } from 'vitest';
import { burst, confetti, crown, field, potato, type Face } from './parts';

const FACES: readonly Face[] = ['calm', 'nervous', 'relieved', 'shocked', 'squeezed', 'smug'];

const hidden = (el: Element | null) => el?.getAttribute('display') === 'none';

describe('the potato', () => {
  it('shows exactly the group of its face', () => {
    const p = potato();
    for (const face of FACES) {
      p.setFace(face);
      expect(p.el.dataset.face).toBe(face);
      for (const other of FACES) {
        const group = p.el.querySelector(`[data-face-part="${other}"]`);
        expect(group, other).not.toBeNull();
        expect(hidden(group), `${other} while ${face}`).toBe(other !== face);
      }
    }
  });

  it('moves the spark down the stick as the sparkler burns', () => {
    const p = potato();
    const spark = p.el.querySelector('[data-part="spark"]');
    p.setSparkler(1);
    expect(p.el.dataset.sparkler).toBe('1');
    expect(spark?.getAttribute('transform')).toBe('translate(74 -40) scale(1.1)');
    p.setSparkler(0);
    expect(p.el.dataset.sparkler).toBe('0');
    expect(spark?.getAttribute('transform')).toBe('translate(65 22) scale(1.1)');
    p.setSparkler(1 / 3);
    expect(p.el.dataset.sparkler).toBe('0.333');
  });

  it('swaps the spark for smoke when it goes out', () => {
    const p = potato();
    const spark = p.el.querySelector('[data-part="spark"]');
    const smoke = p.el.querySelector('[data-part="smoke"]');
    expect(hidden(spark)).toBe(false);
    expect(hidden(smoke)).toBe(true);
    p.setLit(false);
    expect(p.el.dataset.lit).toBe('false');
    expect(hidden(spark)).toBe(true);
    expect(hidden(smoke)).toBe(false);
    p.setLit(true);
    expect(hidden(spark)).toBe(false);
    expect(hidden(smoke)).toBe(true);
  });

  it('grows the spark and shows its second ring when flared', () => {
    const p = potato();
    const spark = p.el.querySelector('[data-part="spark"]');
    const rays = p.el.querySelector('[data-part="flare"]');
    expect(hidden(rays)).toBe(true);
    p.setFlare(true);
    expect(hidden(rays)).toBe(false);
    expect(spark?.getAttribute('transform')).toContain('scale(1.7)');
    p.setFlare(false);
    expect(hidden(rays)).toBe(true);
  });

  it('shows steam only when asked', () => {
    const p = potato();
    const steam = p.el.querySelector('[data-part="steam"]');
    expect(hidden(steam)).toBe(true);
    p.setSteam(true);
    expect(hidden(steam)).toBe(false);
  });
});

describe('the other drawings', () => {
  it('draws the field with three clouds', () => {
    const el = field();
    expect(el.dataset.part).toBe('scene');
    expect(el.children.length).toBeGreaterThanOrEqual(4);
  });

  it('draws the crown', () => {
    expect(crown().dataset.part).toBe('crown');
  });

  it('draws a burst of 28 points', () => {
    const star = burst();
    expect(star.dataset.part).toBe('burst');
    const points = star.querySelector('polygon')?.getAttribute('points')?.trim().split(/\s+/);
    expect(points).toHaveLength(28);
  });

  it('gives as many confetti pieces as asked', () => {
    const pieces = confetti(() => 0.5, 20);
    expect(pieces).toHaveLength(20);
    for (const piece of pieces) expect(piece.dataset.part).toBe('confetti');
  });
});
