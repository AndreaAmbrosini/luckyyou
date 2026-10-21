import { describe, expect, it } from 'vitest';
import { checkNewName, nameLength } from './names';

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
