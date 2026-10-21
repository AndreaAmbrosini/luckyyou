import { shuffle } from './random';

/**
 * The order people leave the show in: everyone but the unlucky person in a
 * random order, then the unlucky person last. The show only acts out the
 * app's pick (decision 0005), so the last one out is always the unlucky one.
 */
export function eliminationOrder(
  names: readonly string[],
  unlucky: string,
  random: () => number,
): string[] {
  if (!names.includes(unlucky)) throw new RangeError(`${unlucky} is not in this show.`);
  const others = names.filter((name) => name !== unlucky);
  return [...shuffle(others, random), unlucky];
}
