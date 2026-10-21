import { describe, expect, it } from 'vitest';
import { createRandom } from './random';

const take = (random: () => number, count: number) => Array.from({ length: count }, random);

describe('createRandom', () => {
  it('replays the same numbers for the same seed', () => {
    expect(take(createRandom(42), 20)).toEqual(take(createRandom(42), 20));
  });

  it('gives different numbers for a different seed', () => {
    expect(take(createRandom(42), 20)).not.toEqual(take(createRandom(43), 20));
  });

  it('stays in [0, 1) and spreads across it', () => {
    const numbers = take(createRandom(7), 1000);
    expect(numbers.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(numbers.filter((n) => n < 0.5).length).toBeGreaterThan(400);
    expect(numbers.filter((n) => n < 0.5).length).toBeLessThan(600);
  });
});
