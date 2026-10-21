import { describe, expect, it } from 'vitest';
import { pickUnlucky, randomIndex } from './pick';

/** A random source that hands out these 32-bit draws, in order. */
function draws(...values: number[]) {
  const queue = [...values];
  return (array: Uint32Array) => {
    array[0] = queue.shift()!;
    return array;
  };
}

describe('randomIndex', () => {
  it('throws away a draw from the uneven tail and draws again', () => {
    // 2^32 = 3 × 1431655765 + 1, so only the draw 2^32 − 1 lies in the tail.
    expect(randomIndex(3, draws(2 ** 32 - 1, 4))).toBe(1);
  });

  it('keeps the highest draw below the tail', () => {
    expect(randomIndex(3, draws(2 ** 32 - 2))).toBe((2 ** 32 - 2) % 3);
  });

  it('stays in range for every head count', () => {
    for (let n = 1; n <= 12; n++) {
      for (let i = 0; i < 200; i++) {
        const index = randomIndex(n);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(n);
      }
    }
  });
});

describe('pickUnlucky', () => {
  it('names the person at the drawn index', () => {
    expect(pickUnlucky(['Anna', 'Ben', 'Carla'], draws(7))).toBe('Ben');
  });
});
