import { useEffect, useMemo, useReducer, useState } from 'react';
import { readJson, writeJson } from '../storage';
import { checkNewName, compareNames, sameName } from './names';
import { validPhoto } from './photos';

export const PEOPLE_KEY = 'luckyyou:v1:people';

export interface Person {
  readonly name: string;
  /** In today's pick. */
  readonly ticked: boolean;
  readonly photo?: string;
}

const byName = (a: Person, b: Person) => compareNames(a.name, b.name);

/**
 * The stored list, keeping every entry that still fits the rules: a name that
 * tidies to a valid one not seen earlier. An entry without a ticked state, as
 * an older version stored it, counts as ticked.
 */
export function loadPeople(): Person[] {
  const stored = readJson(PEOPLE_KEY);
  if (!Array.isArray(stored)) return [];

  const people: Person[] = [];
  for (const entry of stored as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { name, ticked, photo } = entry as { name?: unknown; ticked?: unknown; photo?: unknown };
    if (typeof name !== 'string') continue;
    const check = checkNewName(
      name,
      people.map((person) => person.name),
    );
    if (!check.ok) continue;
    people.push({
      name: check.name,
      ticked: typeof ticked === 'boolean' ? ticked : true,
      ...(validPhoto(photo) ? { photo } : {}),
    });
  }
  return people.sort(byName);
}

export function savePeople(people: readonly Person[]): boolean {
  return writeJson(PEOPLE_KEY, people);
}

type Action =
  | { type: 'add'; name: string }
  | { type: 'toggle'; name: string }
  | { type: 'untick'; name: string }
  | { type: 'tick-all'; ticked: boolean }
  | { type: 'remove'; name: string }
  | { type: 'photo'; name: string; photo?: string };

function reduce(people: readonly Person[], action: Action): readonly Person[] {
  switch (action.type) {
    case 'add':
      return [...people, { name: action.name, ticked: true }].sort(byName);
    case 'toggle':
      return people.map((person) =>
        sameName(person.name, action.name) ? { ...person, ticked: !person.ticked } : person,
      );
    case 'untick':
      return people.map((person) =>
        sameName(person.name, action.name) ? { ...person, ticked: false } : person,
      );
    case 'tick-all':
      return people.map((person) => ({ ...person, ticked: action.ticked }));
    case 'remove':
      return people.filter((person) => !sameName(person.name, action.name));
    case 'photo':
      return people.map((person) =>
        sameName(person.name, action.name) ? { ...person, photo: action.photo } : person,
      );
  }
}

export interface People {
  readonly list: readonly Person[];
  readonly saveFailed: boolean;
  /** Adds a name that `checkNewName` accepted, ticked, in its place. */
  add(name: string): void;
  toggle(name: string): void;
  untick(name: string): void;
  tickAll(ticked: boolean): void;
  remove(name: string): void;
  setPhoto(name: string, photo?: string): void;
}

/** The people list, kept in this browser as it changes. */
export function usePeople(): People {
  const [list, dispatch] = useReducer(reduce, undefined, loadPeople);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    const saved = savePeople(list);
    // The warning reflects the result of synchronizing with browser storage.
    setSaveFailed(!saved);
  }, [list]);

  return useMemo(
    () => ({
      list,
      saveFailed,
      add: (name) => dispatch({ type: 'add', name }),
      toggle: (name) => dispatch({ type: 'toggle', name }),
      untick: (name) => dispatch({ type: 'untick', name }),
      tickAll: (ticked) => dispatch({ type: 'tick-all', ticked }),
      remove: (name) => dispatch({ type: 'remove', name }),
      setPhoto: (name, photo) => dispatch({ type: 'photo', name, photo }),
    }),
    [list, saveFailed],
  );
}
