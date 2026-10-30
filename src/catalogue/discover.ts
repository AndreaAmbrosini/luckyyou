import { compareNames, MAX_NAME_LENGTH, nameLength } from '../people/names';
import { HEAD_COUNT, type Scenario } from '../scenario-kit/contract';

const MAX_DESCRIPTION_LENGTH = 90;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Every problem with what `src/scenarios/<folder>/index.ts` exports, worded
 * for the console. Empty when it is a valid scenario.
 */
export function validateScenario(value: unknown, folder: string): string[] {
  if (typeof value !== 'object' || value === null) return ["it doesn't export a scenario"];
  const { id, name, description, card, people, developmentOnly, lineUp, play } = value as Record<
    string,
    unknown
  >;
  const problems: string[] = [];

  if (typeof id !== 'string' || id === '') {
    problems.push('it has no id');
  } else {
    if (!KEBAB_CASE.test(id)) problems.push(`its id "${id}" isn't kebab-case`);
    if (id !== folder) problems.push(`its id "${id}" differs from its folder name`);
  }

  if (typeof name !== 'string' || name.trim() === '') {
    problems.push('it has no name');
  } else if (nameLength(name) > MAX_NAME_LENGTH) {
    problems.push(`its name has ${nameLength(name)} characters; the most is ${MAX_NAME_LENGTH}`);
  }

  if (typeof description !== 'string' || description.trim() === '') {
    problems.push('it has no description');
  } else {
    if (/[\r\n]/.test(description)) problems.push('its description is on more than one line');
    if (nameLength(description) > MAX_DESCRIPTION_LENGTH) {
      problems.push(
        `its description has ${nameLength(description)} characters; ` +
          `the most is ${MAX_DESCRIPTION_LENGTH}`,
      );
    }
  }

  const picture = card as { emoji?: unknown; image?: unknown } | null | undefined;
  if (!filled(picture?.emoji) && !filled(picture?.image)) {
    problems.push('its card has no emoji or image');
  }

  const { min, max } = (people ?? {}) as { min?: unknown; max?: unknown };
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    problems.push("its people limits aren't whole numbers");
  } else {
    const [least, most] = [min as number, max as number];
    if (least < HEAD_COUNT.min) {
      problems.push(`its minimum of ${least} is below ${HEAD_COUNT.min} people`);
    }
    if (most > HEAD_COUNT.max) {
      problems.push(`its maximum of ${most} is above ${HEAD_COUNT.max} people`);
    }
    if (least > most) problems.push(`its minimum of ${least} is above its maximum of ${most}`);
  }

  if (developmentOnly !== undefined && typeof developmentOnly !== 'boolean') {
    problems.push("its development-only flag isn't true or false");
  }

  if (lineUp !== undefined) problems.push(...lineUpProblems(lineUp));

  if (typeof play !== 'function') problems.push('it has no play function');

  return problems;
}

const filled = (text: unknown) => typeof text === 'string' && text.trim() !== '';

/** Every problem with a scenario's line-up (decision 0011). */
function lineUpProblems(lineUp: unknown): string[] {
  if (typeof lineUp !== 'object' || lineUp === null) return ["its line-up isn't an object"];
  const { heading, start, options, draw } = lineUp as Record<string, unknown>;
  const problems: string[] = [];
  if (!filled(heading)) problems.push('its line-up has no heading');
  if (!filled(start)) problems.push('its line-up has no start label');

  if (!Array.isArray(options) || options.length === 0) {
    problems.push('its line-up has no options');
  } else {
    const seen = new Set<unknown>();
    for (const option of options as unknown[]) {
      const { name, label, choices } = (option ?? {}) as Record<string, unknown>;
      if (!filled(name) || !filled(label)) {
        problems.push('its line-up has an option without a name or label');
        continue;
      }
      if (seen.has(name)) problems.push(`its line-up has two options named "${name}"`);
      seen.add(name);
      if (!Array.isArray(choices) || choices.length < 2) {
        problems.push(`its line-up option "${name}" has fewer than 2 choices`);
        continue;
      }
      const given = (choices as unknown[]).map(
        (choice) => (choice ?? {}) as Record<string, unknown>,
      );
      if (!given.every((choice) => filled(choice.name) && filled(choice.label))) {
        problems.push(`its line-up option "${name}" has a choice without a name or label`);
      } else if (new Set(given.map((choice) => choice.name)).size < given.length) {
        problems.push(`its line-up option "${name}" has two choices with the same name`);
      }
      if (given.some((choice) => choice.group !== undefined && !filled(choice.group))) {
        problems.push(`its line-up option "${name}" has a group without a label`);
      }
      const pictured = given.filter((choice) => typeof choice.picture === 'function').length;
      if (pictured > 0 && pictured < given.length) {
        problems.push(`its line-up option "${name}" has a picture for only some choices`);
      }
    }
  }

  if (typeof draw !== 'function') problems.push('its line-up has no draw function');
  return problems;
}

/**
 * The scenarios in a map of `src/scenarios/<folder>/index.ts` modules, as
 * `import.meta.glob` gives it, sorted by name. Folders starting with `_` are
 * skipped, and so is any scenario with a problem, which the console names.
 */
export function discoverScenarios(
  modules: Readonly<Record<string, unknown>>,
  { production }: { production: boolean },
): Scenario[] {
  const found: Scenario[] = [];
  for (const [path, value] of Object.entries(modules)) {
    const folder = path.split('/').at(-2) ?? path;
    if (folder.startsWith('_')) continue;
    const problems = validateScenario(value, folder);
    for (const problem of problems) console.warn(`Skipped src/scenarios/${folder}/: ${problem}`);
    if (problems.length > 0) continue;
    const scenario = value as Scenario;
    if (production && scenario.developmentOnly) continue;
    found.push(scenario);
  }
  return found.sort((a, b) => compareNames(a.name, b.name));
}
