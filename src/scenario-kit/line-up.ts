// Looks for a show's Line-up (decision 0011): dealt at random, fitted to
// what the show offers now, and handed to the show where it can't change them.

import type { ChosenLook, LineUp } from './contract';
import { pickOne, shuffle } from './random';

/**
 * A look for each of `names`, dealt from a shuffled deck per option, so the
 * choices vary as much as the head count allows.
 */
export function dealLooks(
  lineUp: LineUp,
  names: readonly string[],
  random: () => number,
): Map<string, ChosenLook> {
  const decks = lineUp.options.map((option) => ({
    option: option.name,
    deck: shuffle(option.choices, random).map((choice) => choice.name),
  }));
  return new Map(
    names.map((name, index) => [
      name,
      Object.fromEntries(decks.map(({ option, deck }) => [option, deck[index % deck.length]!])),
    ]),
  );
}

/** A look with a choice drawn at random for each option. */
export function randomLook(lineUp: LineUp, random: () => number): ChosenLook {
  return Object.fromEntries(
    lineUp.options.map((option) => [option.name, pickOne(option.choices, random).name]),
  );
}

/**
 * `stored` as a look for `lineUp`: each choice it offers is kept, and any
 * option without one gets a choice at random. Null when nothing was stored.
 */
export function fitLook(lineUp: LineUp, stored: unknown, random: () => number): ChosenLook | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const given = stored as Record<string, unknown>;
  return Object.fromEntries(
    lineUp.options.map((option) => {
      const kept = option.choices.find((choice) => choice.name === given[option.name]);
      return [option.name, (kept ?? pickOne(option.choices, random)).name];
    }),
  );
}

/** A map that refuses changes, once filled. */
class FrozenMap<K, V> extends Map<K, V> {
  #frozen = false;

  constructor(entries: Iterable<readonly [K, V]>) {
    super();
    for (const [key, value] of entries) super.set(key, value);
    this.#frozen = true;
  }

  override set(key: K, value: V): this {
    if (this.#frozen) throw new TypeError('The looks are frozen.');
    return super.set(key, value);
  }

  override delete(): boolean {
    throw new TypeError('The looks are frozen.');
  }

  override clear(): void {
    throw new TypeError('The looks are frozen.');
  }
}

/** A copy of `looks` that neither the map nor any look in it can be changed in. */
export function freezeLooks(
  looks: ReadonlyMap<string, ChosenLook>,
): ReadonlyMap<string, ChosenLook> {
  return new FrozenMap(
    [...looks].map(([name, look]) => [name, Object.freeze({ ...look })] as const),
  );
}
