import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { handOutLooks } from '../../scenario-kit';
import { POINTER } from './parts';
import { planHops, startTipOf } from './pointer';
import { BEATS, hopInto, LEANS as PEAKS, planShow, READ, stayOn, type Plan } from './plan';
import {
  CAPTION_BOTTOM,
  HEAP_BAND,
  PLINTH,
  benchSpot,
  benchTag,
  between,
  estimateTag,
  HOP,
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
  spotOf,
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
        expect(plank(widths).right, label).toBeCloseTo(xs.at(-1)! + 60, 9);
        expect(plank(widths).top, label).toBe(250);
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

  it('the fit stays in bounds', () => {
    for (let count = 4; count <= 12; count++) {
      const ways = all
        .filter(({ plan }) => plan.order.length === count)
        .map(({ plan }) => plan.fallsWith);
      expect(new Set(ways), `${count} people`).toEqual(new Set([3, 2]));
    }
    for (const { label, plan } of all) {
      const small = plan.order.length <= 3;
      const rounds = roundsOf(plan);
      // The safe rounds that take r: all but the one that leads into "Final three!".
      const paced = rounds.filter(
        (round, index) => round[0]!.beat === 'safe' && rounds[index + 1]![0]!.beat === 'safe',
      );
      for (const round of paced) {
        const { seconds } = round[0]!;
        expect(seconds, label).toBeGreaterThanOrEqual((round.length === 2 ? 2.1 : 2.0) - 1e-9);
        expect(seconds, label).toBeLessThanOrEqual(2.6 + 1e-9);
      }
      const finals = rounds.filter((round) => round[0]!.beat !== 'safe');
      const [least, most] = small ? [1, 2] : [2, 4];
      for (const [turn] of finals) {
        expect(turn!.decoys.length, label).toBeGreaterThanOrEqual(least!);
        expect(turn!.decoys.length, label).toBeLessThanOrEqual(most!);
      }
      expect(plan.end, label).toBeLessThanOrEqual(28 + 1e-9);
      const stretched =
        finals.every(([turn]) => turn!.decoys.length === most) &&
        paced.every((round) => Math.abs(round[0]!.seconds - 2.6) < 1e-9);
      if (!stretched) expect(plan.end, label).toBeGreaterThanOrEqual(21.5 - 1e-9);
      // The timing file's checkpoints.
      const count = plan.order.length;
      if (count === 8 && plan.fallsWith === 2) {
        for (const round of paced) expect(round[0]!.seconds, label).toBeCloseTo(2.1, 9);
      }
      if (count === 12 && plan.fallsWith === 2) {
        expect(plan.end, label).toBeCloseTo(28.0, 9);
        for (const round of paced.filter((each) => each.length === 2)) {
          expect(round[0]!.seconds, label).toBeCloseTo(2.1, 9);
        }
      }
      if (count === 6 && plan.fallsWith === 3) {
        expect(plan.end, label).toBeGreaterThanOrEqual(21.8 - 1e-9);
        expect(plan.end, label).toBeLessThanOrEqual(23.3 + 1e-9);
      }
    }
  });

  it('no stop repeats the one before', () => {
    for (const { label, plan } of all) {
      const safe = new Set<string>();
      for (const round of roundsOf(plan)) {
        const turn = round[0]!;
        const stopped = stopsOf(turn);
        stopped.slice(1).forEach((name, index) => expect(name, label).not.toBe(stopped[index]));
        // A final round stops only on those still at risk.
        if (turn.beat !== 'safe') {
          const atRisk = plan.final.filter((name) => !safe.has(name));
          for (const name of stopped) expect(atRisk, label).toContain(name);
        } else {
          for (const each of round) expect(plan.final, label).not.toContain(each.by);
        }
        for (const each of round) if (each.safe !== null) safe.add(each.by);
      }
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
          expect(turn.stops, at).toBeGreaterThan(turn.from);
          expect(turn.stops, at).toBeLessThan(turn.lands);
          expect(turn.lands - turn.stops, at).toBeGreaterThanOrEqual(0.8 - 1e-9);
        }
        if (first.beat === 'safe') {
          // The pointer stops at 0.35, the blocks land at 1.15 and 1.25, and
          // "Safe!" comes 0.45 after the round's last block, or 1.9 after Nearly's.
          const landed = round.at(-1)!.lands;
          round.forEach((turn, k) => {
            expect(turn.decoys, at).toEqual([]);
            expect(turn.stops, at).toBeCloseTo(first.from + 0.35, 9);
            expect(turn.lands, at).toBeCloseTo(first.from + 1.15 + 0.1 * k, 9);
            expect(turn.safe, at).toBeCloseTo(landed + (turn.nearly ? 1.9 : 0.45), 9);
          });
        } else {
          // A round of stops: each hop 0.05 s and each stay 0.1 s longer than the one before.
          const times = [...first.decoys.map((stop) => stop.at), first.stops];
          times.forEach((time, i) => {
            const before = i === 0 ? first.from : times[i - 1]! + stayOn(i - 1);
            expect(time - before, at).toBeCloseTo(hopInto(i), 9);
          });
          expect(first.lands - first.stops, at).toBeCloseTo(first === last ? 1.05 : 0.8, 9);
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

  it('the hop to the bench peaks 80 px over its higher end', () => {
    for (const { label, plan, turn } of safeTurns) {
      const places = placesOf(plan);
      const from = places.at(turn.by, turn.safe!);
      const to = places.at(turn.by, turn.safe! + HOP);
      const ys = Array.from(
        { length: 601 },
        (_, k) => places.at(turn.by, turn.safe! + (HOP * k) / 600).y,
      );
      expect(Math.min(...ys), label).toBeGreaterThanOrEqual(Math.min(from.y, to.y) - 80 - 2);
      expect(Math.min(...ys), label).toBeLessThanOrEqual(Math.min(from.y, to.y) - 80 + 2);
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
        for (let frame = Math.ceil(turn.from * 30); frame / 30 <= turn.stops + 0.15; frame++) {
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

  it('a bounce in place is a visible hop, clear of the name tags', async () => {
    // With 2 or 3 people a round can start on the last round's thrower.
    const bounces = (plan: Plan) =>
      firstTurns(plan).some(
        (turn, index, all) => index > 0 && stopsOf(turn)[0] === all[index - 1]!.by,
      );
    for (const count of [2, 3]) {
      const seed = seedFor(count, bounces);
      const label = `${count} people, seed ${seed}`;
      const { frames, plan } = await watch(names(count), unluckyOf(count), { seed });
      const stopped = stops(frames);
      const again = stopped.slice(1).filter((stop, index) => stop.name === stopped[index]!.name);
      expect(again.length, label).toBeGreaterThan(0);
      for (const stop of again) {
        const before = stopped[stopped.indexOf(stop) - 1]!;
        const hop = frames.filter((frame) => frame.time > before.to && frame.time < stop.from);
        const tip = pointerTip(spotOf(plan, stop.name));
        expect(
          tip.y - Math.min(...hop.map((frame) => frame.pointer.y)),
          label,
        ).toBeGreaterThanOrEqual(10);
        for (const frame of hop.filter((each) => each.pointer.shown > 0)) {
          for (const { tag } of Object.values(frame.people)) {
            expect(overlap(pointerBox(frame.pointer), tag), label).toBe(false);
          }
        }
      }
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
  it('blocks do cross name tags in those runs', () => {
    expect(crossed).toBeGreaterThan(0);
  });
});
