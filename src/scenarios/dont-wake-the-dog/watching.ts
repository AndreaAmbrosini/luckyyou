// What the tests watch a show through: plans for many seeds, and where
// everyone is on their way past the dog. Statistical scenarios read the plan
// alone; only stage scenarios run shows.

import { createRandom } from '../../scenario-kit/random';
import { planShow, type Ending, type Place, type Plan, type Span, type Turn } from './plan';

export const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Hana',
  'Ivo',
  'Jonas',
  'Kofi',
  'Luca',
];

export const ENDINGS: readonly Ending[] = ['on-back', 'creak', 'sniff'];

/** The first `count` of the team. */
export const names = (count: number) => TEAM.slice(0, count);

/** A plan, with whom it was made for. */
export interface Run {
  readonly plan: Plan;
  readonly team: readonly string[];
  readonly unlucky: string;
  readonly seed: number;
}

/** The unlucky person for `seed` when the scenario doesn't say: a different one most seeds. */
const someone = (team: readonly string[], seed: number) => team[(seed * 5) % team.length]!;

/** Plans for `count` people with seeds 1 to `seeds`, for `unlucky`, or someone else each seed. */
export function plansFor(count: number, seeds: number, unlucky?: string): Run[] {
  const team = names(count);
  return Array.from({ length: seeds }, (_, k) => {
    const seed = k + 1;
    const who = unlucky ?? someone(team, seed);
    return { plan: planShow(team, who, createRandom(seed)), team, unlucky: who, seed };
  });
}

/** The first plan for `count` people, from seed 1 up, that `wanted` accepts. */
export function find(count: number, wanted: (plan: Plan) => boolean, unlucky?: string): Run {
  const team = names(count);
  for (let seed = 1; seed <= 2000; seed++) {
    const who = unlucky ?? someone(team, seed);
    const plan = planShow(team, who, createRandom(seed));
    if (wanted(plan)) return { plan, team, unlucky: who, seed };
  }
  throw new Error(`No seed gives that plan for ${count} people.`);
}

/** The place `name` is at, or last left, at `t`. */
export function placeAt(plan: Plan, name: string, t: number): Place {
  const keys = plan.paths.get(name) ?? [];
  return keys.findLast((key) => key.at <= t + 1e-9)?.place ?? 'seat';
}

/** Whether `name` moves at any moment inside `span`. */
export function moves(plan: Plan, name: string, span: Span): boolean {
  const keys = plan.paths.get(name) ?? [];
  return keys.some((key, k) => {
    const before = keys[k - 1];
    if (!before || before.place === key.place) return false;
    return before.at < span.to - 1e-9 && key.at > span.from + 1e-9;
  });
}

/** How long a safe turn lasts: until the next turn, or "Final three!" after the last. */
export function turnLength(plan: Plan, turn: Turn): number {
  const next = plan.turns[plan.turns.indexOf(turn) + 1]!;
  return (next.kind === 'safe' ? next.from : plan.spotlight) - turn.from;
}
