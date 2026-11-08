import { describe, expect, it } from 'vitest';
import { checkNewName, checkNewNames, nameLength } from './names';

describe('nameLength', () => {
  it.each([
    ['🦄🦄🦄', 3],
    ['ليلى', 4],
    ['José', 4],
    ['👩‍👩‍👧', 1],
  ])('counts %s as %i characters', (name, length) => {
    expect(nameLength(name)).toBe(length);
  });
});

describe('checkNewName', () => {
  it('accepts 30 characters with no space to break on', () => {
    expect(checkNewName('Bartholomew-Montgomery-Smithso', [])).toEqual({
      ok: true,
      name: 'Bartholomew-Montgomery-Smithso',
    });
  });

  it('treats a decomposed accent as the same name as a composed one', () => {
    const decomposed = 'José';
    expect(checkNewName(decomposed, ['José'])).toEqual({
      ok: false,
      message: 'José is already on the list.',
      existing: 'José',
    });
  });

  it('keeps names that differ only in an accent apart', () => {
    expect(checkNewName('Jose', ['José'])).toEqual({ ok: true, name: 'Jose' });
  });
});

describe('checkNewNames', () => {
  const long = 'n'.repeat(31);

  it.each([
    ['anna, ben', 'Anna and Ben are already on the list.'],
    ['anna, ben, carla', 'Anna, Ben and Carla are already on the list.'],
    [`Dario, anna, ${long}`, 'Added 1. Anna is already on the list. 1 name is over 30 characters.'],
    [`${long}, ${long}`, '2 names are over 30 characters.'],
  ])('sums up %s as "%s"', (raw, message) => {
    expect(checkNewNames(raw, ['Anna', 'Ben', 'Carla']).message).toBe(message);
  });

  it('skips a name given twice once it has been added', () => {
    expect(checkNewNames('Dario, dario', [])).toMatchObject({
      add: ['Dario'],
      message: 'Added 1. Dario is already on the list.',
    });
  });

  it('asks for a name when there are only separators', () => {
    expect(checkNewNames(' , ;', []).message).toBe('Type a name first.');
  });
});
