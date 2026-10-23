import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { handOutLooks } from '../../scenario-kit';
import { BEATS, hopInto, LEANS as PEAKS, planShow, READ, stayOn, type Plan } from './plan';
import {
  HEAP_BAND,
  blockOverlaps,
  blockBox,
  headBox,
  heap,
  heldBlock,
  overlap,
  pointerTip,
  sideOf,
  signedLean,
  spots,
  tower,
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
  inside,
  anyOverlap,
  NORMAL,
  casts,
  LEANS,
  HEIGHTS,
  STEP,
  watch,
  stops,
  swings,
  swaysPerSecond,
  tagsOf,
  pointerBox,
  spotOf,
  seedOf,
  eightRun,
  expectSwaysAndSettles,
} from './watching';

describe('The layout', () => {
  it('no tag overlaps at any count', () => {
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const label = `${count} people`;
      expect(all, label).toHaveLength(count);
      for (const [round, { boxes }] of casts(count).entries()) {
        const at_ = `${label}, names shifted ${round}`;
        expect(anyOverlap(boxes), at_).toBe(false);
        for (const box of boxes) {
          expect(box.left, at_).toBeGreaterThanOrEqual(0);
          expect(box.right, at_).toBeLessThanOrEqual(1280);
          // Own head excepted: a chest tag starts on its bottom edge.
          all.forEach((spot, own) => {
            if (boxes[own] !== box) expect(overlap(box, headBox(spot)), at_).toBe(false);
          });
        }
      }
      for (const spot of all) {
        expect(spot.tag.size, label).toBe(Math.max(22, Math.round(0.22 * spot.size)));
        expect(spot.tag.maxWidth, label).toBeGreaterThanOrEqual(120);
        expect(spot.tag.maxWidth, label).toBeLessThanOrEqual(
          Math.max(198, Math.round(2.2 * spot.size)),
        );
      }
    }
  });

  it('no tag is under the tower or the heap at any count', () => {
    // Hundreds of thousands of checks: each failure is noted, and checked once.
    const failures: string[] = [];
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const everyCast = casts(count);
      const tags = everyCast.flatMap(({ boxes }) => boxes);
      for (const blocks of HEIGHTS) {
        for (const lean of LEANS) {
          tower(blocks, lean).forEach((block, k) => {
            if (tags.some((box) => blockOverlaps(block, box))) {
              failures.push(`${count} people, ${blocks} blocks, lean ${lean}, block ${k}`);
            }
          });
        }
        for (const unlucky of all) {
          for (const block of heap(unlucky, blocks)) {
            const box = blockBox(block);
            const label = `${count} people, heap of ${blocks}`;
            expect(box.top, label).toBeGreaterThanOrEqual(HEAP_BAND.top);
            expect(box.bottom, label).toBeLessThanOrEqual(HEAP_BAND.bottom);
            expect(Math.sign(block.x - 640), label).toBe(sideOf(unlucky));
            if (tags.some((tag) => overlap(box, tag))) failures.push(`${label} over a tag`);
            if (all.some((spot) => overlap(box, headBox(spot)))) {
              failures.push(`${label} over a head`);
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("the pointer's tip never covers a tag", () => {
    for (let count = 2; count <= 12; count++) {
      const all = spots(count);
      const everyCast = casts(count);
      for (const spot of all) {
        for (const holding of [false, true]) {
          const tip = pointerTip(spot, holding);
          for (const { boxes } of everyCast) {
            for (const box of boxes) expect(inside(box, tip), `${count} people`).toBe(false);
          }
          expect(tip.y, `${count} people`).toBeGreaterThanOrEqual(120);
        }
        // The held block is 0.96 heads wide over the head; the tip is 10 px over head or block.
        const block = heldBlock(spot);
        expect(block.width).toBeCloseTo(0.96 * spot.size, 9);
        expect(blockBox(block).bottom).toBeLessThan(headBox(spot).top);
        expect(pointerTip(spot).y).toBeCloseTo(headBox(spot).top - 10, 9);
        expect(pointerTip(spot, true).y).toBeCloseTo(blockBox(block).top - 10, 9);
      }
    }
  });

  it('normal names need no shift at 8 and 12', () => {
    for (const count of [8, 12]) {
      const all = spots(count);
      for (const { boxes } of casts(count)) {
        boxes.forEach((box, index) => {
          expect((box.left + box.right) / 2, `${count} people`).toBeCloseTo(all[index]!.x, 9);
        });
      }
    }
  });

  it('8 people match the storyboard', () => {
    const all = spots(8);
    expect(all.map((s) => [s.x, s.y, s.size, s.row])).toEqual([
      ...[130, 340, 940, 1150].map((x) => [x, 430, 80, 'back']),
      ...[150, 400, 880, 1130].map((x) => [x, 650, 104, 'front']),
    ]);
  });

  it('12 and 2 people match the storyboard', () => {
    expect(spots(12).map((s) => [s.x, s.y, s.size])).toEqual([
      ...[90, 260, 430, 850, 1020, 1190].map((x) => [x, 430, 66]),
      ...[115, 300, 480, 800, 990, 1170].map((x) => [x, 650, 92]),
    ]);
    expect(spots(2).map((s) => [s.x, s.y, s.size])).toEqual([
      [260, 640, 200],
      [1020, 640, 200],
    ]);
  });

  it('other counts split each row either side of the tower', () => {
    for (let count = 3; count <= 11; count++) {
      const all = spots(count);
      expect(
        all.filter((s) => s.row === 'back'),
        `${count} people`,
      ).toHaveLength(Math.floor(count / 2));
      for (const spot of all)
        expect(Math.abs(spot.x - 640), `${count} people`).toBeGreaterThanOrEqual(150);
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
    // Upright, a stack of 40 high blocks on y 610 (each a few pixels off centre).
    tower(11, 0).forEach((block, k) => {
      expect(block.y).toBeCloseTo(590 - 40 * k, 9);
      expect(Math.abs(block.x - 640)).toBeLessThanOrEqual(6);
    });
  });

  it("a lean's side is a number or the side a person stands on", () => {
    const order = names(8);
    const all = spots(8);
    expect(signedLean({ degrees: 7, toward: -1 }, order)).toBe(-7);
    expect(signedLean({ degrees: 7, toward: 1 }, order)).toBe(7);
    order.forEach((name, index) => {
      expect(signedLean({ degrees: 22, toward: name }, order)).toBe(22 * sideOf(all[index]!));
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

describe('The stage', () => {
  it('the stage plays the plan for its seed', async () => {
    for (const count of [2, 8, 12]) {
      for (const seed of [1, 2]) {
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
      }
    }
  });

  it("the pointer's whole box never covers a name tag at 8 and 12", async () => {
    for (const count of [8, 12]) {
      const team = NORMAL.slice(0, count);
      for (const seed of [1, 2, 3]) {
        const { frames, plan } = await watch(team, team.at(-1)!, { seed });
        const tags = tagsOf(plan.order);
        for (const frame of frames.filter((each) => each.pointer.shown > 0)) {
          for (const tag of tags) {
            expect(
              overlap(pointerBox(frame.pointer), tag),
              `${count} people, seed ${seed}, at ${frame.time}`,
            ).toBe(false);
          }
        }
      }
    }
  });

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

  it('the tower never sways more than 3 times a second, and settles after each block', async () => {
    // At 2 and 5, at 12 with pairs, and at 8 falling with 2 left: Nearly in the final.
    const runs = [
      { count: 2, seed: 1 },
      { count: 5, seed: 1 },
      { count: 12, seed: 1 },
      { count: 8, seed: seedOf(names(8), unluckyOf(8), (plan) => plan.fallsWith === 2) },
    ];
    for (const { count, seed } of runs) {
      for (const reducedMotion of [false, true]) {
        const label = `${count} people, seed ${seed}${reducedMotion ? ', reduced motion' : ''}`;
        const { frames, plan } = await watch(names(count), unluckyOf(count), {
          seed,
          reducedMotion,
        });
        const before = frames.filter((frame) => frame.time < plan.still.to);
        expect(swaysPerSecond(before), label).toBeLessThanOrEqual(3);
        for (const swing of swings(before))
          expect(swing, label).toBeGreaterThanOrEqual(0.34 - STEP);
        expectSwaysAndSettles(frames, plan, label);
      }
    }
  });
});

describe('Hops and tosses', () => {
  /** Show seconds per frame in these runs: fine enough to time a hop to the frame. */
  const FINE = 1 / 120;
  /** The first seed from 1 whose plan at `count` with the usual unlucky person passes `test`. */
  const seedFor = (count: number, test: (plan: Plan) => boolean) =>
    seedOf(names(count), unluckyOf(count), test);
  /** A run at 2, at 8 falling with 2 left, and at 12 with pairs, finely timed. */
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
        const run = await watch(names(count), unluckyOf(count), { seed, step: FINE });
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
      const tags = tagsOf(plan.order);
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
          for (const tag of tags)
            expect(overlap(pointerBox(frame.pointer), tag), label).toBe(false);
        }
      }
    }
  });
});

describe('Blocks and name tags', () => {
  it('a name tag a block crosses, in the air, on the tower or in the heap, is drawn over it', async () => {
    // Blocks do cross tags at 8: a front-row toss, and the tumble.
    let crossed = 0;
    for (const { count, seed } of [
      { count: 2, seed: 1 },
      { count: 8, seed: 1 },
      { count: 8, seed: 2 },
      { count: 12, seed: 1 },
    ]) {
      const { frames, plan } = await watch(names(count), unluckyOf(count), { seed });
      const tags = tagsOf(plan.order);
      for (const frame of frames) {
        for (const block of frame.drawn) {
          plan.order.forEach((name, index) => {
            if (!blockOverlaps(block, tags[index]!)) return;
            crossed++;
            expect(
              block.under,
              `${count} people, seed ${seed}, ${name}'s tag at ${frame.time}`,
            ).toContain(name);
          });
        }
      }
    }
    expect(crossed).toBeGreaterThan(0);
  });
});
