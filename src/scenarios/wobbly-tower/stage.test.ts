import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { handOutLooks } from '../../scenario-kit';
import { POINTER } from './parts';
import { FLIGHT, planHops, startTipOf } from './pointer';
import { BEATS, DIP, LEANS as PEAKS, planShow, READ, type Plan } from './plan';
import {
  CAPTION_BOTTOM,
  HEAP_BAND,
  PLINTH,
  benchSpot,
  benchTag,
  between,
  estimateTag,
  HOP,
  HOP_ARC,
  HOP_CLEAR,
  placings,
  blockBox,
  blockHeight,
  blockOverlaps,
  headBox,
  heap,
  heldBlock,
  overlap,
  plank,
  pointerTip,
  riskSpots,
  sideOf,
  startingRows,
  signedLean,
  tagBox,
  tagSetOf,
  tower,
  nameTagFor,
  type Box,
  type Spot,
} from './layout';
import {
  names,
  unluckyOf,
  plans,
  everyPlan,
  roundsOf,
  firstTurns,
  stopsOf,
  atRiskFor,
  nextAlong,
  nearlyOf,
  plannedCaptions,
  anyOverlap,
  NORMAL,
  TEAM,
  drawnWidth,
  sizeOf,
  STEP,
  watch,
  stops,
  swings,
  swaysPerSecond,
  pointersIn,
  drawnAs,
  shows,
  pointerBox,
  placesOf,
  seedOf,
  eightRun,
  expectSwaysAndSettles,
} from './watching';

describe('The layout', () => {
  /** The tallest towers the show builds, at every lean before the fall, row by row: how far they reach. */
  const outline = (() => {
    const left = Array.from({ length: 721 }, () => Infinity);
    const right = Array.from({ length: 721 }, () => -Infinity);
    for (let total = 9; total <= 15; total++) {
      for (let lean = -11; lean <= 11; lean++) {
        for (const block of tower(total, lean, blockHeight(total))) {
          const box = blockBox(block);
          for (let y = Math.floor(box.top); y <= Math.ceil(box.bottom); y++) {
            left[y] = Math.min(left[y]!, box.left);
            right[y] = Math.max(right[y]!, box.right);
          }
        }
      }
    }
    return { left, right };
  })();
  const underTower = (box: Box) => {
    for (let y = Math.max(0, Math.ceil(box.top)); y <= Math.min(720, Math.floor(box.bottom)); y++) {
      if (outline.left[y]! < box.right && outline.right[y]! > box.left) return true;
    }
    return false;
  };
  /** Every way `leaving` of `count` can leave: their places in the standing order. */
  const leavers = (count: number, leaving: number): number[][] =>
    leaving === 1
      ? Array.from({ length: count }, (_, i) => [i])
      : Array.from({ length: count }, (_, i) =>
          Array.from({ length: count - i - 1 }, (__, k) => [i, i + 1 + k]),
        ).flat();

  it("nobody's tag crosses another while the gap closes", () => {
    const failures: string[] = [];
    /** Checks the tags of those staying at risk, moving `from` → `to` (in order), at t = 0, 0.05 … 1. */
    const closing = (from: readonly Spot[], to: readonly Spot[], at: string) => {
      // Whoever changes sides walks round the tower, their tag drawn over it like over every block.
      const round = from.map((spot, index) => sideOf(spot) !== sideOf(to[index]!));
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        const boxes = from.map((spot, index) => tagBox(between(spot, to[index]!, t)));
        const label = `${at}, t ${t}`;
        if (anyOverlap(boxes)) failures.push(`${label}: tags cross`);
        boxes.forEach((box, index) => {
          if (box.left < 0 || box.right > 1280 || box.top < 0 || box.bottom > 720) {
            failures.push(`${label}: off the stage`);
          }
          if (round[index]) return;
          if (overlap(box, PLINTH)) failures.push(`${label}: on the plinth`);
          if (underTower(box)) failures.push(`${label}: under the tower`);
        });
      }
    };
    for (let people = 4; people <= 12; people++) {
      const rows = startingRows(people);
      // At risk: everyone but the first `gone`, the last `gone`, or every other one from the start.
      const sets = (gone: number) => [
        rows.map((_, index) => index).slice(gone),
        rows.map((_, index) => index).slice(0, people - gone),
        rows.map((_, index) => index).filter((index) => index >= 2 * gone || index % 2 === 1),
      ];
      for (let count = people; count >= 3; count--) {
        for (const set of sets(people - count)) {
          const atRisk = set.slice(0, count);
          for (const leaving of people >= 9 && count >= 4 ? [1, 2] : [1]) {
            for (const gone of leavers(count, leaving)) {
              const staying = atRisk.filter((_, index) => !gone.includes(index));
              const from = riskSpots(
                count,
                people,
                atRisk.map((index) => rows[index]!),
              );
              const to = riskSpots(
                count - leaving,
                people,
                staying.map((index) => rows[index]!),
              );
              closing(
                from.filter((_, index) => !gone.includes(index)),
                to,
                `${people} people, ${count} at risk, ${gone.join('+')} leaving`,
              );
            }
          }
        }
      }
    }
    // And every gap that closes in the plans for seeds 1–40.
    for (const { label, plan } of everyPlan()) {
      const places = placesOf(plan);
      for (const at of new Set(
        plan.turns.flatMap((turn) => (turn.safe === null ? [] : [turn.safe])),
      )) {
        const staying = places.atRisk(at);
        closing(
          staying.map((name) => places.at(name, at - 1e-9)),
          staying.map((name) => places.at(name, at + 0.6)),
          `${label}, at ${at.toFixed(2)}`,
        );
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it('the bench holds everyone at 12', () => {
    const long = TEAM.at(-1)!;
    const others = TEAM.slice(0, -1);
    for (let benched = 1; benched <= 10; benched++) {
      // The long name in each slot, the rest of the team around it.
      for (let slot = 0; slot < benched; slot++) {
        const called = [...others.slice(0, benched - 1)];
        called.splice(slot, 0, long);
        const label = `${benched} benched, the long name in slot ${slot}`;
        const tag = benchTag(benched);
        const tags = called.map((name) => nameTagFor(name, tag));
        const widths = called.map((name, index) => drawnWidth(name, tags[index]!));
        const all = called.map((_, index) => benchSpot(index, widths));
        const boxes = all.map((spot, index) => tagBox(spot, widths[index]));
        expect(anyOverlap(boxes), label).toBe(false);
        boxes.forEach((box, index) => {
          expect(sizeOf(tags[index]!), label).toBeGreaterThanOrEqual(22);
          expect(box.left, label).toBeGreaterThanOrEqual(16);
          expect(box.right, label).toBeLessThanOrEqual(1280 - 16);
          expect(box.top, label).toBeGreaterThanOrEqual(CAPTION_BOTTOM);
          expect(box.bottom, label).toBeLessThanOrEqual(250);
          const head = headBox(all[index]!);
          expect(head.top, label).toBeGreaterThanOrEqual(CAPTION_BOTTOM);
          expect(head.bottom, label).toBeLessThanOrEqual(250);
          expect(head.right - head.left, label).toBeCloseTo(76, 9);
        });
        // In the order they go safe, left to right, from x 250 unless the bench is too long.
        const xs = all.map((spot) => spot.x);
        xs.slice(1).forEach((x, index) => {
          expect(x - xs[index]!, label).toBeGreaterThanOrEqual(
            Math.min(125, 870 / (benched - 1)) - 1e-9,
          );
        });
        if (boxes.at(-1)!.right < 1280 - 16 - 1e-9) expect(xs[0], label).toBe(250);
        // Its top 6 under the lowest tag: they sit on it.
        const seats = called.map((name, index) => tagSetOf(name, tags[index]!));
        const on = plank(seats.map((seat, index) => ({ ...seat, width: widths[index]! })));
        expect(on.right, label).toBeCloseTo(xs.at(-1)! + 60, 9);
        const lowest = Math.max(
          ...all.map((spot, index) => headBox(spot).top + 0.76 * 76 + seats[index]!.height),
        );
        expect(on.top, label).toBeCloseTo(lowest + 6, 9);
        expect(on.top, label).toBeLessThanOrEqual(250);
      }
    }
  });

  it('the at-risk sizes', () => {
    for (let count = 2; count <= 12; count++) {
      for (let people = Math.max(count, 2); people <= 12; people++) {
        const label = `${count} at risk of ${people}`;
        const all = riskSpots(count, people);
        expect(all, label).toHaveLength(count);
        const head = count <= 6 ? 120 : 100;
        const tag = people === 2 ? 44 : count <= 6 ? 36 : 30;
        for (const spot of all) {
          expect(spot.size, label).toBe(head);
          expect(spot.tag.size, label).toBe(tag);
        }
        // Left to right, half (rounded up) left of the tower.
        expect(
          all.map((spot) => spot.x),
          label,
        ).toEqual([...all.map((spot) => spot.x)].sort((a, b) => a - b));
        expect(
          all.filter((spot) => spot.x < 640),
          label,
        ).toHaveLength(Math.ceil(count / 2));
        // Every normal name is set at its full size, never over another tag or a head.
        for (let round = 0; round < count; round++) {
          const called = all.map((_, index) => NORMAL[(index + round) % NORMAL.length]!);
          const tags = called.map((name, index) => nameTagFor(name, all[index]!.tag));
          const boxes = all.map((spot, index) =>
            tagBox(spot, drawnWidth(called[index]!, tags[index]!)),
          );
          expect(anyOverlap(boxes), label).toBe(false);
          tags.forEach((each) => expect(sizeOf(each), label).toBe(tag));
          boxes.forEach((box, own) => {
            all.forEach((spot, index) => {
              if (index !== own) expect(overlap(box, headBox(spot)), label).toBe(false);
            });
          });
        }
      }
    }
  });

  it("the pointer's whole box never covers a tag, over anyone at risk or on the bench", () => {
    for (let people = 2; people <= 12; people++) {
      for (let count = 2; count <= people; count++) {
        const all = riskSpots(count, people);
        const tags = all.map((spot) => tagBox(spot));
        // Everyone else on the bench, with tags as wide as the slots allow.
        const benched = people - count;
        const bench = Array.from({ length: benched }, (_, slot) =>
          tagBox(
            benchSpot(
              slot,
              Array.from({ length: benched }, () => benchTag(benched).maxWidth),
            ),
          ),
        );
        for (const spot of all) {
          const box = pointerBox(pointerTip(spot));
          // On the stage, over the outermost spots too.
          expect(box.left, `${count} at risk of ${people}`).toBeGreaterThanOrEqual(0);
          expect(box.right, `${count} at risk of ${people}`).toBeLessThanOrEqual(1280);
          for (const tag of [...tags, ...bench]) {
            expect(overlap(box, tag), `${count} at risk of ${people}`).toBe(false);
          }
        }
      }
    }
  });

  it('the held block and the pointer sit over the head', () => {
    for (const spot of riskSpots(6, 6)) {
      const block = heldBlock(spot);
      expect(block.width).toBeCloseTo(0.96 * spot.size, 9);
      expect(blockBox(block).bottom).toBeLessThan(headBox(spot).top);
      expect(pointerTip(spot).y).toBeCloseTo(headBox(spot).top - 10, 9);
      expect(pointerTip(spot, true).y).toBeCloseTo(blockBox(block).top - 10, 9);
    }
  });

  it('the heap lies clear of every head at risk at the end', () => {
    for (const count of [2, 3]) {
      for (let people = count; people <= 12; people++) {
        const all = riskSpots(count, people);
        for (const unlucky of all) {
          for (let blocks = 4; blocks <= 15; blocks++) {
            for (const block of heap(unlucky, blocks, blockHeight(blocks))) {
              const box = blockBox(block);
              const label = `${count} at risk of ${people}, heap of ${blocks}`;
              expect(box.top, label).toBeGreaterThanOrEqual(HEAP_BAND.top);
              expect(box.bottom, label).toBeLessThanOrEqual(HEAP_BAND.bottom);
              expect(Math.sign(block.x - 640), label).toBe(sideOf(unlucky));
              for (const spot of all) expect(overlap(box, headBox(spot)), label).toBe(false);
            }
          }
        }
      }
    }
  });

  it('the tower bends: the top leans most and each block rests on the one below', () => {
    const blocks = tower(11, 22);
    expect(blocks.map((b) => b.width)).toEqual([
      200, 184, 150, 170, 124, 164, 140, 112, 156, 132, 150,
    ]);
    blocks.forEach((block, k) => {
      expect(block.turn).toBeCloseTo(22 * (0.4 + (0.6 * (k + 1)) / 11), 9);
      if (k > 0) expect(block.turn).toBeGreaterThan(blocks[k - 1]!.turn);
    });
    expect(blocks.at(-1)!.x).toBeGreaterThan(blocks[0]!.x);
    expect(tower(11, -22).at(-1)!.x).toBeLessThan(640);
    // Upright, a stack of 40 high blocks on the plinth at y 650 (each a few pixels off centre).
    tower(11, 0).forEach((block, k) => {
      expect(block.y).toBeCloseTo(630 - 40 * k, 9);
      expect(Math.abs(block.x - 640)).toBeLessThanOrEqual(6);
    });
    expect(PLINTH).toEqual({ left: 470, top: 650, right: 810, bottom: 706 });
  });

  it("a lean's side is a number or the side a person stands on", () => {
    const all = riskSpots(8, 8);
    const where = (name: string) => all[names(8).indexOf(name)]!;
    expect(signedLean({ degrees: 7, toward: -1 }, where)).toBe(-7);
    expect(signedLean({ degrees: 7, toward: 1 }, where)).toBe(7);
    names(8).forEach((name, index) => {
      expect(signedLean({ degrees: 22, toward: name }, where)).toBe(22 * sideOf(all[index]!));
    });
  });
});

describe('The plan', () => {
  const all = everyPlan();

  it('the fit stays in bounds, at every count and both ways it falls', () => {
    for (let count = 4; count <= 12; count++) {
      const ways = all
        .filter(({ plan }) => plan.order.length === count)
        .map(({ plan }) => plan.fallsWith);
      expect(new Set(ways), `${count} people`).toEqual(new Set([3, 2]));
    }
    for (const { label, plan } of all) {
      const count = plan.order.length;
      const rounds = roundsOf(plan);
      // The safe rounds that take r: all but the one that leads into "Final three!".
      const paced = rounds.filter(
        (round, index) => round[0]!.beat === 'safe' && rounds[index + 1]![0]!.beat === 'safe',
      );
      for (const round of paced) {
        const { seconds } = round[0]!;
        expect(seconds, label).toBeGreaterThanOrEqual((round.length === 2 ? 2.1 : 2.0) - 1e-9);
        expect(seconds, label).toBeLessThanOrEqual(3 + 1e-9);
      }
      // Every turn with 3 or 2 at risk is a careful toss, hovering 1 to 3 s.
      const hovers = plan.turns.flatMap((turn) => {
        expect(turn.hover === null, label).toBe(turn.beat === 'safe');
        return turn.hover ? [turn.lands - turn.hover.from] : [];
      });
      for (const h of hovers) {
        expect(h, label).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(h, label).toBeLessThanOrEqual(3 + 1e-9);
      }
      // Too long, only with every hover and r as short as they go; too short, as long.
      const r = paced.map((round) => round[0]!.seconds);
      if (plan.end > 28 + 1e-9) {
        for (const h of hovers) expect(h, label).toBeCloseTo(1, 9);
        for (const seconds of r) expect(seconds, label).toBeLessThanOrEqual(2.1 + 1e-9);
      }
      if (plan.end < 21.5 - 1e-9) {
        for (const h of hovers) expect(h, label).toBeCloseTo(3, 9);
        for (const seconds of r) expect(seconds, label).toBeCloseTo(3, 9);
      }
      expect(plan.end, label).toBeGreaterThanOrEqual(15);
      expect(plan.end, label).toBeLessThanOrEqual(28 + 1e-9);
      // The handover's worked lengths.
      if (count === 4 && plan.fallsWith === 3) expect(plan.end, label).toBeCloseTo(15.5, 9);
      if (count === 6) expect(plan.end, label).toBeGreaterThanOrEqual(21);
    }
  });

  it('a careful toss dips 1 to 3 times, as many as its hover has time for', () => {
    const drawn = new Set<number>();
    for (const { label, plan } of all) {
      for (const turn of plan.turns) {
        if (!turn.hover) continue;
        const { dips } = turn.hover;
        drawn.add(dips);
        expect(dips, label).toBeGreaterThanOrEqual(1);
        expect(dips, label).toBeLessThanOrEqual(3);
        const h = turn.lands - turn.hover.from;
        expect(2 * dips * DIP.least + DIP.setDown, label).toBeLessThanOrEqual(h + 1e-9);
      }
    }
    expect(drawn).toEqual(new Set([1, 2, 3]));
  });

  it('the line is seated from the turn order, so every turn goes to the next one along', () => {
    for (const { label, plan, unlucky } of all) {
      const places = placesOf(plan);
      plan.turns.forEach((turn, index) => {
        // The line is the standing order, left to right across the stage, in one row or two.
        const atRisk = atRiskFor(plan, turn);
        const xs = atRisk.map((name) => places.at(name, turn.from).x);
        expect(xs, `${label} at ${turn.from}`).toEqual([...xs].sort((a, b) => a - b));
        if (index === 0) return;
        const before = plan.turns[index - 1]!.by;
        expect(turn.by, label).toBe(nextAlong(plan, before, atRisk));
      });
      // At 4 or more, the two who never throw stand next along after the unlucky person.
      if (plan.order.length < 4) continue;
      const seat = plan.order.indexOf(unlucky);
      const after = [1, 2].map((k) => plan.order[(seat + k) % plan.order.length]!);
      const throwers = plan.turns.map((turn) => turn.by);
      const idle = plan.final.filter((name) => !throwers.includes(name));
      expect(after.slice(0, idle.length).sort(), label).toEqual([...idle].sort());
    }
  });

  it('the turns add up', () => {
    for (const { label, plan } of all) {
      const small = plan.order.length <= 3;
      const rounds = roundsOf(plan);
      const nearly = nearlyOf(plan);
      const last = plan.turns.at(-1)!;
      rounds.forEach((round, index) => {
        const first = round[0]!;
        const at = `${label}, round ${index}`;
        // Each round starts where the one before ends.
        const previous = rounds[index - 1]?.[0];
        expect(first.from, at).toBeCloseTo(previous ? previous.from + previous.seconds : 2.4, 9);
        expect(round.length, at).toBeLessThanOrEqual(plan.order.length >= 9 ? 2 : 1);
        for (const turn of round) {
          expect(turn.round, at).toBe(index);
          expect(turn.from, at).toBe(first.from);
          expect(turn.seconds, at).toBe(first.seconds);
          // Named as the round starts, or once the caption before has had its second; then the lift.
          expect(turn.named, at).toBeGreaterThanOrEqual(turn.from - 1e-9);
          expect(turn.named, at).toBeLessThan(turn.lifts);
          expect(turn.lifts, at).toBeCloseTo(turn.from + 0.5, 9);
        }
        if (first.beat === 'safe') {
          // The blocks land at 1.15 and 1.25, and "Safe!" comes 0.45 after
          // the round's last block, or 1.9 after Nearly's.
          const landed = round.at(-1)!.lands;
          round.forEach((turn, k) => {
            expect(turn.hover, at).toBeNull();
            expect(turn.lands, at).toBeCloseTo(first.from + 1.15 + 0.1 * k, 9);
            expect(turn.safe, at).toBeCloseTo(landed + (turn.nearly ? 1.9 : 0.45), 9);
          });
        } else {
          // A careful toss: at the hover point 0.9 s in, landing h later.
          expect(first.hover!.from, at).toBeCloseTo(first.from + 0.9, 9);
          expect(first.lands, at).toBeGreaterThan(first.hover!.from);
          if (first.nearly && !small) expect(first.safe, at).toBeCloseTo(first.lands + 1.9, 9);
          else expect(first.safe, at).toBeNull();
        }
      });
      // The spotlight, "Final two!", Nearly's hold and the beats.
      const lastSafe = rounds.filter((round) => round[0]!.beat === 'safe').at(-1)?.[0];
      const spotlight = small ? 1.2 : lastSafe!.lands + (plan.fallsWith === 3 ? 2.35 : 1.05);
      expect(plan.spotlight, label).toBeCloseTo(spotlight, 9);
      expect(plan.finalTwo === null, label).toBe(small || plan.fallsWith === 3);
      if (plan.finalTwo !== null) expect(plan.finalTwo, label).toBeCloseTo(nearly.lands + 2.35, 9);
      // The interludes: the round after "Final three!", the last round after
      // "Final two!", and with 2 or 3 people each next round after a landing.
      if (small) {
        rounds.slice(1).forEach((round, index) => {
          const before = rounds[index]![0]!;
          expect(round[0]!.from, `${label}, round ${index + 1}`).toBeCloseTo(
            before.lands + (before.nearly ? 2.0 : 0.85),
            9,
          );
        });
      } else {
        const afterSpotlight = rounds[rounds.findIndex((round) => round[0]!.beat !== 'safe')]![0]!;
        expect(afterSpotlight.from, label).toBeCloseTo(
          plan.spotlight + (plan.fallsWith === 3 ? 1.8 : 1.0),
          9,
        );
        if (plan.fallsWith === 2) expect(last.from, label).toBeCloseTo(nearly.lands + 3.05, 9);
      }
      expect(plan.hold.from, label).toBeCloseTo(nearly.lands + 0.6, 9);
      expect(plan.hold.to, label).toBeCloseTo(nearly.lands + 1.4, 9);
      expect(plan.starts.final, label).toBeCloseTo(plan.spotlight, 9);
      expect(plan.starts['last-turn'], label).toBeCloseTo(last.from, 9);
      expect(plan.starts.timber, label).toBeCloseTo(last.lands + 1.3, 9);
      expect(last.from + last.seconds, label).toBeCloseTo(plan.starts.timber, 9);
      BEATS.forEach((beat, index) => {
        const before = BEATS.slice(0, index).reduce((sum, each) => sum + plan.beats[each], 0);
        expect(plan.starts[beat], `${label}, ${beat}`).toBeCloseTo(before, 9);
      });
      expect(plan.beats.timber, label).toBe(2.6);
      expect(plan.end, label).toBeCloseTo(plan.starts.timber + plan.beats.timber, 9);
      // The tower is still before the fall; on it-holds it falls once "It holds!" has had its second.
      const T = plan.starts.timber;
      if (plan.ending === 'it-holds') {
        expect(plan.still.from, label).toBeCloseTo(last.lands + 0.68, 9);
        expect(plan.still.to, label).toBeCloseTo(Math.max(T, plan.still.from + READ), 9);
        expect(plan.still.to + 0.5, label).toBeLessThanOrEqual(plan.end - 1.5);
      } else {
        expect(plan.still.to, label).toBeCloseTo(T, 9);
      }
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(last.lands - 1e-9);
      // The captions, planned at least READ apart.
      const times = plannedCaptions(plan).map((caption) => caption.at);
      times.slice(1).forEach((time, index) => {
        expect(time - times[index]!, label).toBeGreaterThanOrEqual(READ - 1e-9);
      });
    }
  });

  it('Nearly is the turn before the last and leans furthest before the fall', () => {
    for (const { label, plan, unlucky } of all) {
      const nearly = nearlyOf(plan);
      const last = plan.turns.at(-1)!;
      expect(plan.turns.indexOf(nearly), label).toBe(plan.turns.length - 2);
      expect(nearly.lean, label).toEqual({ degrees: PEAKS.nearly, toward: nearly.by });
      if (plan.order.length >= 4) expect(nearly.by, label).not.toBe(unlucky);
      plan.turns.forEach((turn, index) => {
        if (turn === nearly) return;
        expect(turn.lean.degrees, label).toBeLessThan(PEAKS.nearly);
        if (turn === last) return;
        // Every other sway leans out further as the tower grows.
        expect(turn.lean.degrees, label).toBeCloseTo(1.5 + 0.45 * (3 + index), 9);
        expect([-1, 1], label).toContain(turn.lean.toward);
      });
      expect(last.beat, label).toBe('last-turn');
      expect(last.lean, label).toEqual(
        plan.ending === 'slow-lean'
          ? { degrees: PEAKS.slowLean, toward: unlucky }
          : plan.ending === 'it-holds'
            ? { degrees: PEAKS.itHolds, toward: last.lean.toward }
            : { degrees: 0, toward: unlucky },
      );
    }
  });

  it('the heartbeat quickens until the last block', () => {
    for (const { label, plan } of all) {
      const { heartbeats, spotlight } = plan;
      const landed = plan.turns.at(-1)!.lands;
      const gap = (t: number) => 0.85 - (0.4 * (t - spotlight)) / (landed - spotlight);
      expect(heartbeats[0], label).toBe(spotlight);
      heartbeats.slice(1).forEach((time, index) => {
        expect(time - heartbeats[index]!, label).toBeCloseTo(gap(heartbeats[index]!), 9);
        if (index > 0) {
          expect(time - heartbeats[index]!, label).toBeLessThan(
            heartbeats[index]! - heartbeats[index - 1]!,
          );
        }
      });
      expect(heartbeats.at(-1)!, label).toBeLessThan(landed);
      expect(heartbeats.at(-1)! + gap(heartbeats.at(-1)!), label).toBeGreaterThanOrEqual(landed);
    }
  });

  it('the standing order is everyone, shuffled', () => {
    const orders = plans(8).map((plan) => plan.order.join());
    for (const order of orders) expect(order.split(',').sort()).toEqual([...names(8)].sort());
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe('Moving people', () => {
  /** Every safe turn of the plans at 4, 8 and 12, seeds 1–5. */
  const safeTurns = [4, 8, 12].flatMap((count) =>
    plans(count, 5).flatMap((plan, seed) =>
      plan.turns
        .filter((turn) => turn.safe !== null)
        .map((turn) => ({ label: `${count} people, seed ${seed + 1}, ${turn.by}`, plan, turn })),
    ),
  );

  it('the hop to the bench peaks 80 px over its higher end, or just under the caption', () => {
    for (const { label, plan, turn } of safeTurns) {
      const places = placesOf(plan);
      const headTop = (t: number) => headBox(places.at(turn.by, t)).top;
      const higher = Math.min(headTop(turn.safe!), headTop(turn.safe! + HOP));
      const peak = Math.max(higher - HOP_ARC, CAPTION_BOTTOM + HOP_CLEAR);
      const tops = Array.from({ length: 601 }, (_, k) => headTop(turn.safe! + (HOP * k) / 600));
      expect(Math.min(...tops), label).toBeGreaterThanOrEqual(CAPTION_BOTTOM + HOP_CLEAR - 1e-9);
      expect(Math.min(...tops), label).toBeGreaterThanOrEqual(peak - 2);
      expect(Math.min(...tops), label).toBeLessThanOrEqual(peak + 2);
    }
  });

  it('with reduced motion the hop is a straight slide, with no overshoot', () => {
    for (const { label, plan, turn } of safeTurns) {
      const places = placings(plan, estimateTag, true);
      const from = places.at(turn.by, turn.safe!);
      const to = places.at(turn.by, turn.safe! + HOP);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      let along = 0;
      for (let k = 0; k <= 60; k++) {
        const p = places.at(turn.by, turn.safe! + (HOP * k) / 60);
        // On the line from one end to the other, never back, never past it.
        const off = ((p.x - from.x) * (to.y - from.y) - (p.y - from.y) * (to.x - from.x)) / length;
        expect(Math.abs(off), label).toBeLessThan(1e-6);
        const now = ((p.x - from.x) * (to.x - from.x) + (p.y - from.y) * (to.y - from.y)) / length;
        expect(now, label).toBeGreaterThanOrEqual(along - 1e-9);
        expect(now, label).toBeLessThanOrEqual(length + 1e-9);
        along = now;
      }
    }
  });

  it('the pointers never cover a tag, even while people move, at every count and seed', () => {
    const failures: string[] = [];
    for (const { label, plan } of everyPlan()) {
      const places = placesOf(plan);
      const hops = planHops(plan.turns, places, startTipOf(blockHeight(2 + plan.turns.length), 2));
      // Every frame of every round, from the pointer leaving until it has faded out.
      for (const turn of firstTurns(plan)) {
        for (let frame = Math.ceil(turn.from * 30); frame / 30 <= turn.lifts; frame++) {
          const t = frame / 30;
          for (const which of [0, 1]) {
            const pointer = hops.at(t, which);
            if (pointer.shown === 0) continue;
            const box = pointerBox(pointer.tip);
            for (const name of plan.order) {
              // No tag is more than 500 wide: one further off can't reach it.
              if (Math.abs(places.at(name, t).x - pointer.tip.x) > POINTER.width / 2 + 260)
                continue;
              const tag = places.tagBox(name, t);
              if (tag && overlap(box, tag)) {
                failures.push(`${label}: over ${name} at ${t.toFixed(3)}`);
              }
            }
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  const long = TEAM.at(-1)!;
  /**
   * The plans at 8 to 12, seeds 1–20, the 15-character name in each place in
   * the list in turn (the plan goes by place, not by name), worked out once for
   * the tests that share them; and when to look: standing, before the first
   * close and after each, and every moment of each close.
   */
  let longShows:
    | {
        label: string;
        plan: Plan;
        places: ReturnType<typeof placings>;
        moves: number[];
        /** Every tag's box at each moment looked at; none while it hides. */
        looks: { t: number; boxes: { name: string; box: Box }[] }[];
      }[]
    | undefined;
  const withTheLongName = () =>
    (longShows ??= Array.from({ length: 5 }, (_, k) => k + 8).flatMap((count) =>
      Array.from({ length: 20 }, (_, k) => k + 1).flatMap((seed) =>
        Array.from({ length: count }, (_, place) => {
          const team = NORMAL.slice(0, count).map((name, index) => (index === place ? long : name));
          const plan = planShow(team, team.at(-1)!, createRandom(seed));
          const moves = [
            ...new Set(plan.turns.flatMap((turn) => (turn.safe === null ? [] : [turn.safe]))),
          ];
          const places = placings(plan);
          const times = [
            0,
            ...moves.flatMap((at) => Array.from({ length: 21 }, (_, k) => at + (HOP * k) / 20)),
          ];
          return {
            label: `${count} people, seed ${seed}, ${long} in place ${place}`,
            plan,
            places,
            moves,
            looks: times.map((t) => ({
              t,
              boxes: plan.order.flatMap((name) => {
                const box = places.tagBox(name, t);
                return box ? [{ name, box }] : [];
              }),
            })),
          };
        }),
      ),
    ));

  it('the 15-character name keeps its tag apart, wherever it stands, at 8 to 12', () => {
    const failures: string[] = [];
    for (const { label, looks } of withTheLongName()) {
      for (const { t, boxes } of looks) {
        boxes.forEach(({ name, box }, index) => {
          for (const other of boxes.slice(index + 1)) {
            if (overlap(box, other.box)) {
              failures.push(`${label}: ${name} and ${other.name} at ${t.toFixed(3)}`);
            }
          }
        });
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('with the 15-character name, tags at risk clear the tower and its plinth, at 8 to 12', () => {
    const failures: string[] = [];
    /**
     * Every block of a tower `landed` blocks high or lower, `height` each, at
     * every lean before the fall, with its upright box; and how far those
     * boxes reach, row by row, so a tag far from them all is passed quickly.
     */
    const poses = new Map<
      string,
      {
        blocks: { block: ReturnType<typeof tower>[number]; box: Box }[];
        left: number[];
        right: number[];
      }
    >();
    const towerUpTo = (landed: number, height: number) => {
      const key = `${landed}/${height}`;
      let known = poses.get(key);
      if (!known) {
        const blocks = Array.from({ length: landed }, (_, k) => k + 1)
          .flatMap((count) =>
            Array.from({ length: 23 }, (_, k) => tower(count, k - 11, height)).flat(),
          )
          .map((block) => ({ block, box: blockBox(block) }));
        const left = Array.from({ length: 721 }, () => Infinity);
        const right = Array.from({ length: 721 }, () => -Infinity);
        for (const { box } of blocks) {
          for (let y = Math.max(0, Math.floor(box.top)); y <= Math.ceil(box.bottom); y++) {
            left[y] = Math.min(left[y]!, box.left);
            right[y] = Math.max(right[y]!, box.right);
          }
        }
        poses.set(key, (known = { blocks, left, right }));
      }
      return known;
    };
    const near = ({ left, right }: { left: number[]; right: number[] }, box: Box) => {
      for (
        let y = Math.max(0, Math.floor(box.top));
        y <= Math.min(720, Math.ceil(box.bottom));
        y++
      ) {
        if (left[y]! < box.right && right[y]! > box.left) return true;
      }
      return false;
    };
    for (const { label, plan, places, moves, looks } of withTheLongName()) {
      const height = blockHeight(2 + plan.turns.length);
      for (const { t, boxes } of looks) {
        // The two paper blocks, and every thrown one landed by then.
        const landed = 2 + plan.turns.filter((turn) => turn.lands <= t + 1e-9).length;
        const built = towerUpTo(landed, height);
        const move = moves.findLast((at) => at <= t + 1e-9);
        const atRisk = places.atRisk(t);
        for (const { name, box } of boxes) {
          if (!atRisk.includes(name)) continue;
          // Whoever changes sides walks round the tower, their tag drawn over it like over every block.
          if (
            move !== undefined &&
            sideOf(places.at(name, move - 1e-9)) !== sideOf(places.at(name, move + HOP))
          ) {
            continue;
          }
          const at = `${label}: ${name} at ${t.toFixed(3)}`;
          if (overlap(box, PLINTH)) failures.push(`${at}, on the plinth`);
          if (
            near(built, box) &&
            built.blocks.some((pose) => overlap(pose.box, box) && blockOverlaps(pose.block, box))
          ) {
            failures.push(`${at}, on the tower`);
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it("a frame's tag box is where the tag is drawn, moved sideways as it is", () => {
    const person = document.createElement('div');
    person.dataset.person = 'Anna';
    Object.assign(person.style, { left: '40px', top: '370px', width: '120px', height: '120px' });
    const tag = nameTagFor('Anna', { size: 36, maxWidth: 160 });
    const plain = drawnAs(person, tag).tag;
    tag.style.left = 'calc(50% + 12.5px)';
    const moved = drawnAs(person, tag).tag;
    expect(moved.left - plain.left).toBeCloseTo(12.5, 9);
    expect(moved.right - plain.right).toBeCloseTo(12.5, 9);
    tag.style.left = 'calc(50% + -7px)';
    expect(drawnAs(person, tag).tag.left - plain.left).toBeCloseTo(-7, 9);
  });
});

describe('The stage', () => {
  // One test a show, each in its own time; shows that other tests watch too are run once.
  for (const count of [2, 8, 12]) {
    for (const seed of [1, 2]) {
      it(`the stage plays the plan for its seed: ${count} people, seed ${seed}`, async () => {
        const label = `${count} people, seed ${seed}`;
        const team = names(count);
        const { plan, built, shirts, lifts } = await watch(team, unluckyOf(count), { seed });
        // The looks are drawn after the plan's draws.
        const random = createRandom(seed);
        planShow(team, unluckyOf(count), random);
        const looks = handOutLooks(team, random);
        expect(
          lifts.map((lift) => lift.name),
          label,
        ).toEqual(plan.turns.map((turn) => turn.by));
        expect(
          built.map((block) => block.by),
          label,
        ).toEqual(['', '', ...plan.turns.map((turn) => turn.by)]);
        expect(
          built.map((block) => block.fill),
          label,
        ).toEqual([
          'var(--color-paper)',
          'var(--color-paper)',
          ...plan.turns.map((turn) => `var(--color-${looks.get(turn.by)!.ring})`),
        ]);
        for (const name of team) {
          expect(shirts[name], label).toBe(`var(--color-${looks.get(name)!.ring})`);
        }
      });
    }
  }

  for (const count of [8, 12]) {
    for (const seed of [1, 2, 3]) {
      it(`the pointers' whole boxes never cover a name tag, as people move: ${count} people, seed ${seed}`, async () => {
        const team = NORMAL.slice(0, count);
        const { frames } = await watch(team, team.at(-1)!, { seed });
        for (const frame of frames) {
          for (const pointer of pointersIn(frame)) {
            for (const [name, { tag }] of Object.entries(frame.people)) {
              expect(
                overlap(pointer, tag),
                `${count} people, seed ${seed}, ${name} at ${frame.time}`,
              ).toBe(false);
            }
          }
        }
      });
    }
  }

  it('the pointer has faded out by the lift, so it never sits over a held block', async () => {
    for (const count of [2, 8, 12]) {
      const { frames } = await (count === 8 ? eightRun() : watch(names(count), unluckyOf(count)));
      for (const frame of frames) {
        if (frame.holding.includes(frame.over)) {
          expect(frame.pointer.shown, `${count} people, ${frame.over} at ${frame.time}`).toBe(0);
        }
      }
    }
  });

  // At 2 and 5, at 12 with pairs, and at 8 falling with 2 left: Nearly in the final.
  for (const { count, seed } of [
    { count: 2, seed: 1 },
    { count: 5, seed: 1 },
    { count: 12, seed: 1 },
    { count: 8, seed: seedOf(names(8), unluckyOf(8), (plan) => plan.fallsWith === 2) },
  ]) {
    for (const reducedMotion of [false, true]) {
      const label = `${count} people, seed ${seed}${reducedMotion ? ', reduced motion' : ''}`;
      it(`the tower never sways more than 3 times a second, and settles after each block: ${label}`, async () => {
        const { frames, plan } = await watch(names(count), unluckyOf(count), {
          seed,
          reducedMotion,
        });
        const before = frames.filter((frame) => frame.time < plan.still.to);
        expect(swaysPerSecond(before), label).toBeLessThanOrEqual(3);
        for (const swing of swings(before))
          expect(swing, label).toBeGreaterThanOrEqual(0.34 - STEP);
        expectSwaysAndSettles(frames, plan, label);
      });
    }
  }
});

describe('Hops and tosses', () => {
  /** Show seconds per frame in these runs: fine enough to time a hop to the frame. */
  const FINE = 1 / 120;
  /** The first seed from 1 whose plan at `count` with the usual unlucky person passes `test`. */
  const seedFor = (count: number, test: (plan: Plan) => boolean) =>
    seedOf(names(count), unluckyOf(count), test);
  /**
   * A run at 2, at 8 falling with 2 left, and at 12 with pairs, finely timed,
   * up to just after the last block lands: every hop and toss is over by then.
   */
  let shows: Promise<{ label: string; run: Awaited<ReturnType<typeof watch>> }[]> | undefined;
  const fineRuns = () =>
    (shows ??= (async () => {
      const all = [];
      // One at a time: every run drives the one GSAP clock.
      for (const { count, seed } of [
        { count: 2, seed: 1 },
        { count: 8, seed: seedFor(8, (plan) => plan.fallsWith === 2) },
        { count: 12, seed: 1 },
      ]) {
        const plan = planShow(names(count), unluckyOf(count), createRandom(seed));
        const until = plan.turns.at(-1)!.lands + 0.1;
        const run = await watch(names(count), unluckyOf(count), { seed, step: FINE, until });
        all.push({ label: `${count} people, seed ${seed}`, run });
      }
      return all;
    })());

  it('every hop lasts 0.35 s or more, and every stay 0.15 s or more', async () => {
    for (const { label, run } of await fineRuns()) {
      const { frames, plan } = run;
      const stopped = stops(frames);
      expect(
        stopped.map((stop) => stop.name),
        label,
      ).toEqual(firstTurns(plan).flatMap(stopsOf));
      stopped.forEach((stop, index) => {
        const at = `${label}, stop ${index + 1} on ${stop.name}`;
        const after = index === 0 ? -1 : stopped[index - 1]!.to;
        const leaves = frames.find(
          (frame) => frame.time > after && frame.over === '' && frame.pointer.shown > 0,
        )!;
        expect(stop.from - leaves.time, at).toBeGreaterThanOrEqual(0.35 - FINE);
        expect(stop.to + FINE - stop.from, at).toBeGreaterThanOrEqual(0.15 - FINE);
      });
    }
  });

  it('each tossed block flies 0.4 s or more, from the whoosh to the thunk', async () => {
    for (const { label, run } of await fineRuns()) {
      const whooshes = run.cues.filter((each) => each.cue === 'whoosh');
      const thunks = run.cues.filter((each) => each.cue === 'thunk').slice(2);
      expect(whooshes, label).toHaveLength(run.plan.turns.length);
      expect(thunks, label).toHaveLength(run.plan.turns.length);
      whooshes.forEach((whoosh, index) => {
        expect(
          thunks[index]!.time - whoosh.time,
          `${label}, turn ${index + 1}`,
        ).toBeGreaterThanOrEqual(0.4 - FINE);
      });
    }
  });
});

describe('Blocks and name tags', () => {
  // Blocks do cross tags at 8: a front-row toss, and the tumble.
  let crossed = 0;
  for (const { count, seed } of [
    { count: 2, seed: 1 },
    { count: 8, seed: 1 },
    { count: 8, seed: 2 },
    { count: 12, seed: 1 },
  ]) {
    it(`a name tag a block crosses, in the air, on the tower or in the heap, is drawn over it: ${count} people, seed ${seed}`, async () => {
      const { frames } = await watch(names(count), unluckyOf(count), { seed });
      for (const frame of frames) {
        for (const block of frame.drawn) {
          Object.entries(frame.people).forEach(([name, { tag }]) => {
            if (!shows(tag) || !blockOverlaps(block, tag)) return;
            crossed++;
            expect(
              block.under,
              `${count} people, seed ${seed}, ${name}'s tag at ${frame.time}`,
            ).toContain(name);
          });
        }
      }
    });
  }
  it("a tossed block's top stays under the bench's plank with 7 or more at risk: 12 people, seeds 1 and 2", async () => {
    let seen = 0;
    for (const seed of [1, 2]) {
      const team = names(12);
      const { frames, plan } = await watch(team, unluckyOf(12), { seed });
      const going = plan.turns.filter((turn) => turn.safe !== null);
      const seat = benchTag(going.length);
      const under = plank(going.map((turn) => estimateTag(turn.by, seat))).bottom;
      const places = placesOf(plan);
      plan.turns.forEach((turn, index) => {
        if (places.atRisk(turn.lands).length < 7) return;
        // Block 2 + index is this turn's, in the air from its whoosh to its landing: under
        // the plank, or, held higher than that (a two-line bench), never rising from there.
        const tossed = frames.filter(
          (frame) => frame.time >= turn.lands - FLIGHT - 1e-9 && frame.time < turn.lands - 1e-9,
        );
        const held = blockBox(tossed[0]!.drawn[2 + index]!).top;
        for (const frame of tossed) {
          seen++;
          const top = blockBox(frame.drawn[2 + index]!).top;
          expect(top, `seed ${seed}, ${turn.by}'s block at ${frame.time}`).toBeGreaterThanOrEqual(
            Math.min(under, held) - 1e-6,
          );
        }
      });
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('blocks do cross name tags in those runs', () => {
    expect(crossed).toBeGreaterThan(0);
  });
});
