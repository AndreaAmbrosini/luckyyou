/**
 * A seeded random source (mulberry32): the same seed gives the same numbers,
 * so tests and the lab can replay a run. It decides how a show looks, never
 * who is picked.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** A shuffled copy of `items` (Fisher–Yates), drawn from `random`. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** One of `items`, drawn from `random`. */
export function pickOne<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) throw new RangeError('pickOne needs at least one item.');
  return items[Math.floor(random() * items.length)]!;
}
