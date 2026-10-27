import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import {
  BEHIND,
  bodyBox,
  dogFace,
  faceBox,
  GROWN,
  headBox,
  lane,
  LINE,
  overlap,
  placings,
  seat,
  sideOfSeat,
  tagBox,
  tagSize,
} from './layout';
import { planShow } from './plan';
import { names, plansFor } from './watching';

/** Twelve names, one of them 15 characters long. */
const LONG_TEAM = [...names(11), 'Priya Natarajan'];

describe('the line', () => {
  it('stands in one row up to 8, the sides outward from the gate', () => {
    for (let people = 2; people <= 8; people++) {
      const spots = Array.from({ length: people }, (_, k) => seat(k, people));
      expect(new Set(spots.map((spot) => spot.y))).toEqual(new Set([LINE.one.y]));
      spots.slice(1).forEach((spot, k) => expect(spot.x).toBeGreaterThan(spots[k]!.x));
      spots.forEach((spot, k) => {
        if (sideOfSeat(k, people) === -1) expect(spot.x).toBeLessThanOrEqual(440);
        else expect(spot.x).toBeGreaterThanOrEqual(840);
      });
    }
  });

  it('stands in two rows from 9, alternating from the inner end in the back row', () => {
    for (let people = 9; people <= 12; people++) {
      const spots = Array.from({ length: people }, (_, k) => seat(k, people));
      const left = Math.ceil(people / 2);
      expect(spots[left - 1]!.y).toBe(LINE.two.back);
      expect(spots[left]!.y).toBe(LINE.two.back);
      expect(spots[left - 2]!.y).toBe(LINE.two.front);
      expect(spots[left + 1]!.y).toBe(LINE.two.front);
    }
  });

  it("never covers the dog's face, at any size they stand at", () => {
    for (let people = 2; people <= 12; people++) {
      for (const size of [100, 120, 120 * GROWN]) {
        for (let k = 0; k < people; k++) {
          const spot = { ...seat(k, people), size };
          expect(overlap(bodyBox(spot), dogFace()), `${people}: ${k}`).toBe(false);
        }
      }
    }
  });

  it('keeps the lane clear of the back row, whatever size it grows to', () => {
    for (let people = 9; people <= 12; people++) {
      const way = lane(people);
      const walker = { x: 0, y: way.y, size: way.size };
      const tag = tagSize(way.size);
      const below = Math.max(headBox(walker).bottom, tagBox(walker, 0, 1.25 * tag + 6).bottom);
      for (const size of [100, 120, 120 * GROWN]) {
        const back = faceBox({ x: 0, y: LINE.two.back, size });
        expect(below).toBeLessThanOrEqual(back.top);
      }
    }
  });
});

describe('behind the fence', () => {
  it('fills each side from its outer end, in the order they get there', () => {
    for (const { plan } of plansFor(8, 10)) {
      const places = placings(plan);
      for (const side of [-1, 1] as const) {
        const own = plan.safe.filter(
          (name) => sideOfSeat(plan.order.indexOf(name), plan.order.length) === side,
        );
        const xs = own.map((name) => places.fence(name).x * side);
        xs.slice(1).forEach((x, k) => expect(x).toBeLessThan(xs[k]!));
        expect(Math.abs(places.fence(own[0]!).x - (side === -1 ? 0 : 1280))).toBe(BEHIND.outer);
      }
    }
  });

  it('keeps every name tag apart at the end, with 12 and a 15-character name', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plan = planShow(LONG_TEAM, LONG_TEAM[seed % 12]!, createRandom(seed));
      const places = placings(plan);
      const boxes = plan.safe.map((name) => places.tag(name, plan.end).box);
      boxes.forEach((box, k) =>
        boxes
          .slice(k + 1)
          .forEach((other) => expect(overlap(box, other), `seed ${seed}`).toBe(false)),
      );
      for (const name of plan.safe)
        expect(places.tag(name, plan.end).size).toBeGreaterThanOrEqual(22);
    }
  });
});
