import { describe, expect, it } from 'vitest';
import { createRandom } from '../../scenario-kit/random';
import { handOutLooks } from '../../scenario-kit';
import { BEATS, planShow, READ, type Plan } from './plan';
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
  POINTER_MOVES,
  ENDINGS,
  names,
  unluckyOf,
  plans,
  during,
  only,
  total,
  startOf,
  repeatsBeforeLast,
  everyPlan,
  inside,
  anyOverlap,
  NORMAL,
  casts,
  LEANS,
  HEIGHTS,
  STEP,
  watch,
  stops,
  turnsBack,
  swings,
  swaysPerSecond,
  tagsOf,
  pointerBox,
  spotOf,
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

  it('quick turns never drop under 0.6 s', () => {
    for (const { label, plan } of all) {
      for (const turn of during(plan, 'stack')) {
        expect(turn.seconds, label).toBeGreaterThanOrEqual(0.6);
        // The toss, from the pointer's stop to the landing, stays readable.
        expect(turn.lands - turn.stops, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
      }
    }
  });

  it('every turn follows the turn rules', () => {
    for (let count = 2; count <= 12; count++) {
      const unlucky = unluckyOf(count);
      const seeds = Array.from({ length: 50 }, (_, index) => index + 1);
      // Every pointer move with every ending, the first seed past 50 that
      // has it when seeds 1–50 don't.
      for (const pointer of POINTER_MOVES) {
        for (const ending of ENDINGS) {
          const has = (seed: number) => {
            const plan = planShow(names(count), unlucky, createRandom(seed));
            return plan.pointer === pointer && plan.ending === ending;
          };
          if (!seeds.some(has)) {
            let seed = 51;
            while (!has(seed)) seed++;
            seeds.push(seed);
          }
        }
      }
      for (const seed of seeds) {
        const label = `${count} people, seed ${seed}`;
        const plan = planShow(names(count), unlucky, createRandom(seed));
        const { turns } = plan;
        expect(turns.at(-1)!.by, label).toBe(unlucky);
        expect(turns.at(-1)!.beat, label).toBe('last-turn');
        expect(
          turns.filter((turn) => turn.beat === 'last-turn'),
          label,
        ).toHaveLength(1);
        turns.forEach((turn, index) => {
          expect(names(count), label).toContain(turn.by);
          if (turn.decoy !== null) {
            expect(names(count), label).toContain(turn.decoy);
            expect(turn.decoy, label).not.toBe(turn.by);
          }
          const again = plan.pointer === 'again' && turn.beat === 'last-turn';
          if (count >= 3 && index > 0 && !again) {
            expect(turn.by, label).not.toBe(turns[index - 1]!.by);
          }
        });
        for (const turn of during(plan, 'careful')) expect(turn.decoy, label).not.toBeNull();
        for (const beat of ['stack', 'wobble', 'nearly'] as const) {
          for (const turn of during(plan, beat)) expect(turn.decoy, label).toBeNull();
        }
        const last = turns.at(-1)!;
        expect(last.decoy !== null, label).toBe(plan.pointer === 'fake-out');
        expect(plan.phew, label).toBe(last.decoy);
        expect(only(plan, 'nearly').by === unlucky, label).toBe(plan.pointer === 'again');
        expect(plan.falls, label).toBe(unlucky);
      }
    }
  });

  it('the turns add up', () => {
    for (const { label, plan } of all) {
      const { turns } = plan;
      expect(
        turns.map((turn) => turn.beat),
        label,
      ).toEqual([
        ...during(plan, 'stack').map(() => 'stack'),
        'wobble',
        'careful',
        'careful',
        'nearly',
        'last-turn',
      ]);
      // Each turn starts where the one before ends; the careful turns start
      // after the pigeon's beat.
      turns.forEach((turn, index) => {
        const previous = turns[index - 1];
        const from =
          index === 0
            ? startOf(plan, 'stack')
            : turn.beat === 'careful' && previous!.beat === 'wobble'
              ? startOf(plan, 'careful')
              : previous!.from + previous!.seconds;
        expect(turn.from, label).toBeCloseTo(from, 9);
        expect(turn.from, label).toBeGreaterThanOrEqual(startOf(plan, turn.beat) - 1e-9);
        if (turn.decoyStops !== null) {
          expect(turn.decoyStops, label).toBeGreaterThan(turn.from);
          expect(turn.decoyStops, label).toBeLessThan(turn.stops);
        }
        expect(turn.stops, label).toBeGreaterThan(turn.from);
        expect(turn.lands, label).toBeGreaterThan(turn.stops);
        expect(turn.lands, label).toBeLessThanOrEqual(turn.from + turn.seconds + 1e-9);
      });
      // The beats start one after another.
      BEATS.forEach((beat, index) => {
        const before = BEATS.slice(0, index).reduce((sum, each) => sum + plan.beats[each], 0);
        expect(plan.starts[beat], `${label}, ${beat}`).toBeCloseTo(before, 9);
      });
      // Each beat's turns fill it, and the last ends where timber starts.
      const wobble = only(plan, 'wobble');
      expect(wobble.from + wobble.seconds, label).toBeCloseTo(startOf(plan, 'pigeon'), 9);
      const last = turns.at(-1)!;
      expect(last.from + last.seconds, label).toBeCloseTo(startOf(plan, 'timber'), 9);
    }
  });

  it('every pointer hop and toss lasts long enough to follow', () => {
    for (const { label, plan } of all) {
      plan.turns.forEach((turn, index) => {
        const at = `${label}, turn ${index + 1} (${turn.beat})`;
        // The hop leaves as the previous block lands; the first, at its start.
        const leaves = index === 0 ? startOf(plan, 'stack') : plan.turns[index - 1]!.lands;
        expect(turn.lands - turn.stops, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (turn.beat === 'stack') {
          expect(turn.stops - leaves, at).toBeGreaterThanOrEqual(0.2 - 1e-9);
        } else if (turn.beat === 'last-turn' && plan.pointer === 'again') {
          // The pointer stays on them: no hop.
        } else if (turn.decoyStops !== null) {
          // A hop to the decoy, a rest of 0.25 s on them and a hop on, each hop 0.4 s or more.
          expect(turn.decoyStops - leaves, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
          expect(turn.stops - turn.decoyStops, at).toBeGreaterThanOrEqual(0.65 - 1e-9);
        } else {
          expect(turn.stops - leaves, at).toBeGreaterThanOrEqual(0.4 - 1e-9);
        }
      });
    }
  });

  it("Nearly's lean holds still for half a second inside its beat", () => {
    for (const { label, plan } of all) {
      const nearly = only(plan, 'nearly');
      expect(plan.hold.from - nearly.lands, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(plan.hold.to - plan.hold.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.hold.from, label).toBeGreaterThan(startOf(plan, 'nearly'));
      expect(plan.hold.to, label).toBeLessThanOrEqual(startOf(plan, 'last-turn') + 1e-9);
    }
  });

  it('Nearly is the biggest lean before the fall', () => {
    for (const { label, plan } of all) {
      const nearly = only(plan, 'nearly');
      expect(nearly.lean).toEqual({ degrees: 22, toward: nearly.by });
      for (const turn of plan.turns) {
        if (turn !== nearly) expect(turn.lean.degrees, label).toBeLessThan(nearly.lean.degrees);
      }
      for (const turn of during(plan, 'stack')) {
        expect(turn.lean.degrees, label).toBeGreaterThanOrEqual(2);
        expect(turn.lean.degrees, label).toBeLessThanOrEqual(3);
        expect([-1, 1], label).toContain(turn.lean.toward);
      }
      const wobble = only(plan, 'wobble');
      expect(wobble.lean.degrees, label).toBe(7);
      expect([-1, 1], label).toContain(wobble.lean.toward);
    }
    const sides = all.map(({ plan }) => only(plan, 'wobble').lean.toward);
    expect(sides).toContain(-1);
    expect(sides).toContain(1);
  });

  it('the heartbeat quickens until the last block, and the tower is still before the fall', () => {
    for (const { label, plan } of all) {
      const last = plan.turns.at(-1)!;
      const T = startOf(plan, 'timber');
      const { heartbeats } = plan;
      expect(heartbeats[0], label).toBeCloseTo(startOf(plan, 'careful'), 9);
      expect(heartbeats.at(-1)!, label).toBeLessThan(last.lands);
      const gaps = heartbeats.slice(1).map((time, index) => time - heartbeats[index]!);
      expect(gaps[0], label).toBeCloseTo(0.9, 9);
      gaps.forEach((gap, index) => {
        expect(gap, label).toBeGreaterThanOrEqual(0.4 - 1e-9);
        if (index > 0) expect(gap, label).toBeLessThanOrEqual(gaps[index - 1]! + 1e-9);
      });
      // It falls as timber starts; on it-holds, once "It holds!" has had its
      // second, and early enough that the unlucky person has grown (in 0.5 s)
      // by the show's last 1.5 s.
      if (plan.ending === 'it-holds') {
        expect(plan.still.to, label).toBeCloseTo(Math.max(T, plan.still.from + READ), 9);
        expect(plan.still.to + 0.5, label).toBeLessThanOrEqual(total(plan) - 1.5);
      } else {
        expect(plan.still.to, label).toBeCloseTo(T, 9);
      }
      expect(plan.still.to - plan.still.from, label).toBeGreaterThanOrEqual(0.5);
      expect(plan.still.from, label).toBeGreaterThanOrEqual(last.lands - 1e-9);
    }
  });

  it('the standing order is everyone, shuffled', () => {
    const orders = plans(8).map((plan) => plan.order.join());
    for (const order of orders) expect(order.split(',').sort()).toEqual([...names(8)].sort());
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe('The stage', () => {
  /** The first seed from 1 whose plan at `count` passes `test`. */
  const seedWhere = (count: number, test: (plan: Plan) => boolean) => {
    let seed = 1;
    while (!test(planShow(names(count), unluckyOf(count), createRandom(seed)))) seed++;
    return seed;
  };

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
    // The quickest quick turns: four of them, at 2 and at 5 people.
    const runs = [
      { count: 2, seed: seedWhere(2, (plan) => during(plan, 'stack').length === 4) },
      { count: 5, seed: seedWhere(5, (plan) => during(plan, 'stack').length === 4) },
      { count: 12, seed: seedWhere(12, (plan) => during(plan, 'stack').length === 4) },
      { count: 8, seed: 3 },
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
        expectSwaysAndSettles(frames, label);
      }
    }
  });

  it('with reduced motion the big wobble is one slow lean and settle', async () => {
    const { frames, plan } = await watch(names(8), 'Luca', { reducedMotion: true });
    const wobble = only(plan, 'wobble');
    const wobbling = frames.filter(
      (frame) => frame.time >= wobble.lands && frame.time < wobble.from + wobble.seconds,
    );
    expect(turnsBack(wobbling)).toHaveLength(1);
    expect(Math.max(...wobbling.map((frame) => Math.abs(frame.lean)))).toBeCloseTo(7, 1);
  });
});

describe('Hops and tosses', () => {
  /** Show seconds per frame in these runs: fine enough to time a hop to the frame. */
  const FINE = 1 / 120;
  /** The first seed from 1 whose plan at `count` with the usual unlucky person passes `test`. */
  const seedFor = (count: number, test: (plan: Plan) => boolean) => {
    let seed = 1;
    while (!test(planShow(names(count), unluckyOf(count), createRandom(seed)))) seed++;
    return seed;
  };
  /** A run at 2, at 8 with the fake-out, and at 12 with 4 quick turns, finely timed. */
  let shows: Promise<{ label: string; run: Awaited<ReturnType<typeof watch>> }[]> | undefined;
  const fineRuns = () =>
    (shows ??= (async () => {
      const all = [];
      // One at a time: every run drives the one GSAP clock.
      for (const { count, seed } of [
        { count: 2, seed: seedFor(2, (plan) => during(plan, 'stack').length === 4) },
        { count: 8, seed: seedFor(8, (plan) => plan.pointer === 'fake-out') },
        { count: 12, seed: seedFor(12, (plan) => during(plan, 'stack').length === 4) },
      ]) {
        const run = await watch(names(count), unluckyOf(count), { seed, step: FINE });
        all.push({ label: `${count} people, seed ${seed}`, run });
      }
      return all;
    })());

  it('every hop lasts 0.4 s or more (0.2 s in a quick turn), and the pointer rests 0.25 s or more on a decoy', async () => {
    for (const { label, run } of await fineRuns()) {
      const { frames, plan } = run;
      const stopped = stops(frames);
      // Each stop, with the turn it belongs to.
      const turnOf = plan.turns.flatMap((turn) => (turn.decoy ? [turn, turn] : [turn]));
      expect(
        stopped.map((stop) => stop.name),
        label,
      ).toEqual(plan.turns.flatMap((turn) => (turn.decoy ? [turn.decoy, turn.by] : [turn.by])));
      stopped.forEach((stop, index) => {
        const turn = turnOf[index]!;
        const at = `${label}, stop ${index + 1} on ${stop.name} (${turn.beat})`;
        const after = index === 0 ? -1 : stopped[index - 1]!.to;
        const leaves = frames.find(
          (frame) => frame.time > after && frame.over === '' && frame.pointer.shown > 0,
        )!;
        const least = turn.beat === 'stack' ? 0.2 : 0.4;
        expect(stop.from - leaves.time, at).toBeGreaterThanOrEqual(least - FINE);
        if (turn.decoy === stop.name && turn.by !== stop.name) {
          expect(stop.to + FINE - stop.from, at).toBeGreaterThanOrEqual(0.25 - FINE);
        }
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
    // "Again?!" at 8 and 12 with the unlucky person in the front row, and a repeat turn at 2.
    const front = (count: number) => (plan: Plan) =>
      plan.pointer === 'again' && spotOf(plan, unluckyOf(count)).row === 'front';
    const runs = [
      { count: 8, seed: seedFor(8, front(8)) },
      { count: 12, seed: seedFor(12, front(12)) },
      { count: 2, seed: seedFor(2, repeatsBeforeLast) },
    ];
    for (const { count, seed } of runs) {
      const label = `${count} people, seed ${seed}`;
      const { frames, plan } = await watch(names(count), unluckyOf(count), { seed });
      const stopped = stops(frames);
      const tags = tagsOf(plan.order);
      const bounces = stopped.slice(1).filter((stop, index) => stop.name === stopped[index]!.name);
      expect(bounces.length, label).toBeGreaterThan(0);
      for (const stop of bounces) {
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
