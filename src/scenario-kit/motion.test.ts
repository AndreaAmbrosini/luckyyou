import { gsap } from 'gsap';
import { afterEach, describe, expect, it } from 'vitest';
import { bob } from './motion';

describe('bob', () => {
  const tweens: gsap.core.Animation[] = [];
  afterEach(() => tweens.splice(0).forEach((tween) => tween.kill()));

  it('moves the element through --bob, leaving its transform alone', () => {
    const element = document.createElement('div');
    gsap.set(element, { x: 100 });
    const placed = element.style.transform;
    const tween = bob(element, { distance: 6, seconds: 1 });
    tweens.push(tween);
    const offsets = new Set<string>();
    for (let time = 0; time <= 1; time += 0.1) {
      tween.time(time);
      offsets.add(element.style.getPropertyValue('--bob'));
      expect(element.style.transform).toBe(placed);
    }
    expect(offsets.size).toBeGreaterThan(5);
    expect(element.style.getPropertyValue('--bob')).not.toBe('');
  });
});
