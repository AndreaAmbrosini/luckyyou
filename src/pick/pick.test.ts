import { describe, expect, it } from 'vitest';
import { drawShow, pickUnlucky, randomIndex } from './pick';

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

describe('drawShow', () => {
  const shows = ['dog', 'potato', 'shark'].map((id) => ({ id }));
  const drawn = (last: string | null, ...values: number[]) =>
    values.map((value) => drawShow(shows, last, draws(value)).id);

  it('draws from every show when none was played last', () => {
    expect(drawn(null, 0, 1, 2)).toEqual(['dog', 'potato', 'shark']);
  });

  it('leaves out the show played last', () => {
    expect(drawn('potato', 0, 1, 2, 3)).toEqual(['dog', 'shark', 'dog', 'shark']);
  });

  it('draws the show played last when it is the only one', () => {
    expect(drawShow([{ id: 'potato' }], 'potato', draws(5)).id).toBe('potato');
  });
});
