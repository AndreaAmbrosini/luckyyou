// The app's pick (decision 0005): made before the show starts, from the
// browser's cryptographic source, with everyone on the same chance.

/** Fills the array with random 32-bit draws. */
type Fill = (array: Uint32Array<ArrayBuffer>) => void;

const cryptoFill: Fill = (array) => {
  crypto.getRandomValues(array);
};

const RANGE = 2 ** 32;

/**
 * A uniform index below `n`. A 32-bit draw from the uneven tail of the range
 * is thrown away and drawn again, so taking the remainder favours no index.
 */
export function randomIndex(n: number, fill: Fill = cryptoFill): number {
  const limit = RANGE - (RANGE % n);
  const draw = new Uint32Array(1);
  for (;;) {
    fill(draw);
    if (draw[0]! < limit) return draw[0]! % n;
  }
}

export function pickUnlucky(names: readonly string[], fill: Fill = cryptoFill): string {
  return names[randomIndex(names.length, fill)]!;
}

/** A seed for a show's own random source, which only decides how the show looks. */
export function newSeed(fill: Fill = cryptoFill): number {
  const draw = new Uint32Array(1);
  fill(draw);
  return draw[0]!;
}
