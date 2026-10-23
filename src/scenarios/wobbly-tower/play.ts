// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. The plan says whose turn it is when; this says how
// it looks. What moves (the tower's lean, the blocks, the pointer and the
// pigeon) and who looks how are worked out from the show's time each frame,
// so every frame follows from the plan alone. The stage tells its story in
// data attributes too: the scene's beat, the tower's lean, its blocks and how
// many lie in the heap, whom the pointer is over, and each person's mood and
// whether they hold a block.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  nameTag,
  popIn,
  speechAt,
  STAGE,
  type Cue,
  type Head,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  BLOCK_WIDTHS,
  heap,
  headBox,
  heldBlock,
  overlap,
  placeTags,
  signedLean,
  spots as standing,
  tagBox,
  tagContentWidth,
  topOf,
  tower,
  towards,
  TOWER,
  type Block,
  type Box,
  type Point,
  type Spot,
} from './layout';
import {
  block as drawBlock,
  dust,
  field,
  hardHat,
  pigeon as drawPigeon,
  PIGEON_FEET,
  pointer as drawPointer,
  POINTER,
  speedLines,
} from './parts';
import { BEATS, planShow, READ, type Beat, type Plan, type Turn } from './plan';
import { fadeOf, FLIGHT, movesOn, planHops } from './pointer';
import styles from './wobbly-tower.module.css';

/** The two paper blocks land at these show seconds, each after falling for DROP seconds. */
const PAPER = [0.45, 1.2] as const;
const DROP = 0.4;
/** Where a paper block falls from: its centre's y, above the stage. */
const DROP_FROM = -60;
/** The paper blocks' sways, in degrees: left, then right. */
const PAPER_SWAY = [-1.5, 1.5] as const;
/**
 * A sway's swings, in seconds: out to the turn's lean, then back upright.
 * Each lasts at least 0.34 s, so the tower never turns back more than three
 * times a second (DESIGN.md).
 */
const QUICK = { out: 0.34, back: 0.34 };
const CAREFUL = { out: 0.36, back: 0.4 };
/**
 * The big wobble, from its landing: the three wide swings, as seconds and
 * parts of the turn's lean, each the other way and smaller; upright and
 * still at `settled`, when "…it holds!" goes up a second after "Wobble…
 * wobble…".
 */
const WOBBLE = {
  swings: [
    [0.22, 1],
    [0.56, -0.57],
    [0.9, 0.21],
  ],
  settled: 1.0,
} as const;
/**
 * The pigeon, in seconds from its beat's start: it lands on top, dips the
 * tower `dip` degrees to the right and back, a `swing` each way, and flies off.
 * It flies in from `from` and out to `to`, where its feet are.
 */
const PIGEON = {
  lands: 0.45,
  leaves: 0.95,
  dip: 3,
  swing: 0.34,
  from: { x: -120, y: 90 },
  to: { x: STAGE.width + 140, y: 40 },
} as const;
/** Seconds Nearly takes to swing back upright after its hold. */
const NEARLY_BACK = 0.5;
/** How far a toss arcs above the higher of its two ends. */
const ARC = 140;
/** Seconds a bubble stays up. */
const BUBBLE = 0.8;
/**
 * The fall, in seconds from `plan.still.to`: the tower tips to `lean` degrees
 * toward the unlucky person in `tip`, while on `it-holds` the top block
 * slides `slide` pixels off the one below; then every block tumbles over,
 * half a turn, into the heap. The bottom block lands at `first`, the top one
 * last, at `lands`: READ after "…or not!", so "{unlucky} toppled it!" never
 * waits for it. With reduced motion the tower tips slowly, in `calmTip`, and
 * every block drops at once, without turning over.
 */
const FALL = { lean: 35, tip: 0.35, calmTip: 0.6, slide: 60, first: 0.75, lands: READ };
/** Speed lines trail the tower's top while it tips, in seconds from the fall. */
const SPEED = { from: 0.15, to: 0.55 };
/** A dust puff is this wide; it grows for `grow` seconds as a block lands, then fades in `fade`. */
const DUST = { size: 48, grow: 0.4, fade: 0.3 };
/** How much the unlucky person grows as it falls, and in how long. */
const GROWN = 1.3;
const GROW = 0.5;
/** Seconds the hard hat takes to drop onto their head, once the last block is down. */
const HAT_DROP = 0.45;
/** "creak…" comes this long after the dead-still block lands. */
const CREAK = 0.3;

const ease = {
  sway: gsap.parseEase('sine.inOut'),
  toss: gsap.parseEase('sine.inOut'),
  drop: gsap.parseEase('power2.in'),
  fly: gsap.parseEase('sine.inOut'),
};

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  readonly spot: Spot;
  /** Their name tag, drawn over the blocks until they step in front at the fall. */
  readonly tag: HTMLElement;
  mood: Mood | '';
  holding: boolean;
  raised: boolean;
  sweat: boolean;
}

/** A block's way onto the tower: lifted, held overhead, released, landed; paper drops in. */
interface Flight {
  readonly el: HTMLElement;
  readonly by: string | null;
  readonly lift: number;
  readonly release: number;
  readonly lands: number;
  /** Where it starts from: held overhead, or above the stage. */
  readonly from: Block;
  /** Where it lands: on top of the tower. */
  readonly to: Block;
}

/** A stretch of show seconds. */
interface Span {
  readonly from: number;
  readonly to: number;
}

export async function playWobblyTower(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));
  const caption = (time: number, text: string) => at(time, () => show.caption(text));

  /** When each beat starts, in show seconds. */
  const { starts } = plan;
  const total = starts.timber + plan.beats.timber;

  const scene = field();
  show.stage.append(scene);

  // Everyone at their spot: the back row behind the tower, the front row in front.
  const spots = standing(plan.order.length);
  const people = new Map<string, Person>(
    plan.order.map((name, index) => [name, createPerson(name, looks.get(name)!, spots[index]!)]),
  );
  const spotOf = (name: string) => people.get(name)!.spot;
  const row = (kind: Spot['row']) => [...people.values()].filter((p) => p.spot.row === kind);
  for (const person of row('back')) scene.append(person.el);
  const built = scene.appendChild(document.createElement('div'));
  built.className = styles.tower;
  built.dataset.part = 'tower';
  for (const person of row('front')) scene.append(person.el);
  /** Every head and name tag, which a bubble keeps clear of. */
  const inTheWay = [
    ...placeNameTags([...people.values()]),
    ...[...people.values()].map((person) => headBox(person.spot)),
  ];
  // Every name tag is drawn over every block, flying or fallen: each in a
  // holder the size and place of its person, in a layer above the tower.
  const tags = scene.appendChild(document.createElement('div'));
  tags.className = styles.tower;
  tags.dataset.part = 'tags';
  for (const person of people.values()) {
    const holder = tags.appendChild(document.createElement('div'));
    holder.className = styles.person;
    for (const key of ['left', 'top', 'width', 'height'] as const) {
      holder.style[key] = person.el.style[key];
    }
    holder.append(person.tag);
  }

  // The tower's lean, sway by sway, in signed degrees.
  const lean = new Sway();
  const side = (turn: Turn) => signedLean(turn.lean, plan.order);
  const swayAfter = (turn: Turn) => {
    const peak = side(turn);
    if (turn.beat === 'wobble') {
      const moves = show.reducedMotion
        ? [
            [WOBBLE.settled / 2, peak],
            [WOBBLE.settled, 0],
          ]
        : [...WOBBLE.swings.map(([after, part]) => [after, part * peak]), [WOBBLE.settled, 0]];
      return lean.sway(turn.lands, moves as [number, number][]);
    }
    if (turn.beat === 'nearly') {
      return lean.sway(turn.lands, [
        [plan.hold.from - turn.lands, peak],
        [plan.hold.to - turn.lands, peak],
        [plan.hold.to + NEARLY_BACK - turn.lands, 0],
      ]);
    }
    const { out, back } = turn.beat === 'stack' ? QUICK : CAREFUL;
    return lean.sway(turn.lands, [
      [out, peak],
      [out + back, 0],
    ]);
  };

  /**
   * After the last block: dead still stays upright; it holds sways out and
   * back, settled by `still.from`; slow lean leans to the tipping point by
   * `still.from` and holds there.
   */
  const lastTurnSway = (turn: Turn) => {
    const peak = side(turn);
    const settles = plan.still.from - turn.lands;
    if (plan.ending === 'it-holds') {
      lean.sway(turn.lands, [
        [settles / 2, peak],
        [settles, 0],
      ]);
    } else if (plan.ending === 'slow-lean') {
      lean.sway(turn.lands, [[settles, peak]]);
    }
  };

  // Each block's way onto the tower, in the order they land, with the sways
  // after them; the pigeon's dip comes between the big wobble and the careful turns.
  const flights: Flight[] = [];
  const add = (by: string | null, flight: Omit<Flight, 'el' | 'by' | 'to'>) => {
    const k = flights.length;
    const to = tower(k + 1, lean.at(flight.lands))[k]!;
    const fill = by ? `var(--color-${looks.get(by)!.ring})` : 'var(--color-paper)';
    const el = drawBlock(BLOCK_WIDTHS[k % BLOCK_WIDTHS.length]!, fill);
    el.dataset.by = by ?? '';
    el.style.visibility = 'hidden';
    built.append(el);
    flights.push({ ...flight, el, by, to });
  };
  PAPER.forEach((lands, k) => {
    const to = tower(k + 1, 0)[k]!;
    add(null, {
      lift: lands - DROP,
      release: lands - DROP,
      lands,
      from: { ...to, y: DROP_FROM, turn: 0 },
    });
    lean.sway(lands, [
      [QUICK.out, PAPER_SWAY[k]!],
      [QUICK.out + QUICK.back, 0],
    ]);
  });
  /** When the big wobble's sway starts and the pigeon's dip, for the moods. */
  let wobbleFrom = 0;
  let dipFrom = 0;
  for (const turn of plan.turns) {
    add(turn.by, {
      lift: turn.stops + fadeOf(turn),
      release: Math.max(turn.stops + fadeOf(turn), turn.lands - FLIGHT),
      lands: turn.lands,
      from: heldBlock(spotOf(turn.by)),
    });
    if (turn.beat === 'last-turn') {
      lastTurnSway(turn);
      continue;
    }
    const from = swayAfter(turn);
    if (turn.beat === 'wobble') {
      wobbleFrom = from;
      if (plan.pigeon) {
        dipFrom = lean.sway(starts.pigeon + PIGEON.lands, [
          [PIGEON.swing, PIGEON.dip],
          [2 * PIGEON.swing, 0],
        ]);
      }
    }
  }
  const fallSide = towards(plan.falls, plan.order);
  const fallsAt = plan.still.to;
  const tip = show.reducedMotion ? FALL.calmTip : FALL.tip;
  const leaning = lean.at(fallsAt);
  /** The lean at `t`: the sways, then the tip toward the unlucky person. */
  const leanAt = (t: number) => {
    const tipping = (t - fallsAt) / tip;
    if (tipping <= 0) return lean.at(t);
    const u = (show.reducedMotion ? ease.sway : ease.drop)(Math.min(1, tipping));
    return leaning + (fallSide * FALL.lean - leaning) * u;
  };
  // A block lands in the frame its thunk sounds in, however its time is rounded.
  const landedBy = (t: number) => flights.filter((flight) => flight.lands <= t + 1e-9).length;
  const tumbles = planTumble(plan, heap(spotOf(show.unlucky), flights.length), {
    fallsAt,
    tip,
    side: fallSide,
    calm: show.reducedMotion,
    leanAt,
  });
  /** When the last block lands in the heap. */
  const downAt = fallsAt + FALL.lands;

  // The pointer: from above the tower, it hops to each turn's decoy and
  // taker, fades out as they lift the block, and fades in where it was as it
  // hops on.
  const pointer = drawPointer();
  pointer.el.dataset.over = '';
  const setPointerX = gsap.quickSetter(pointer.el, 'x', 'px') as (value: number) => void;
  const setPointerY = gsap.quickSetter(pointer.el, 'y', 'px') as (value: number) => void;
  const startTip = { x: TOWER.x, y: topOf(tower(PAPER.length, 0).at(-1)!).y - 10 };
  const hops = planHops(plan.turns, starts.stack, spotOf, spots, startTip);

  // The pigeon flies in, perches on the top block wherever it leans, and flies off.
  const bird = plan.pigeon ? drawPigeon() : null;
  const perch = (t: number) => topOf(tower(landedBy(t), leanAt(t)).at(-1)!);
  const setBirdX = bird && (gsap.quickSetter(bird.el, 'x', 'px') as (value: number) => void);
  const setBirdY = bird && (gsap.quickSetter(bird.el, 'y', 'px') as (value: number) => void);
  const P = starts.pigeon;
  const landsAt = P + PIGEON.lands;
  const leavesAt = P + PIGEON.leaves;
  if (bird) {
    bird.el.setAttribute('width', '90');
    bird.el.setAttribute('height', '70');
    bird.el.classList.add(styles.pigeon);
    bird.el.style.visibility = 'hidden';
    scene.append(bird.el);
  }
  scene.append(pointer.el);

  // Who looks how: everyone is scared while the tower sways wide, dips or
  // nearly topples; whoever the pointer picks is worried, then scared once
  // it's careful; Nearly's thrower is relieved; at the end the unlucky person
  // parties and everyone else cheers.
  const nearly = plan.turns.find((turn) => turn.beat === 'nearly')!;
  const alarms: Span[] = [
    { from: wobbleFrom, to: wobbleFrom + WOBBLE.settled },
    { from: nearly.lands, to: plan.hold.to + NEARLY_BACK },
  ];
  if (plan.pigeon) alarms.push({ from: dipFrom, to: dipFrom + 2 * PIGEON.swing });
  // Nearly's thrower says "Phew!" as it swings back, so that "Me again?!"
  // can follow before the toss when the pointer stays on them.
  const phewAt = plan.hold.to;
  const relieved = (name: string, t: number) =>
    (name === nearly.by && t >= phewAt && t < phewAt + BUBBLE) ||
    (plan.ending === 'it-holds' &&
      name === show.unlucky &&
      t >= plan.still.from &&
      t < plan.still.from + BUBBLE);
  const moodOf = (name: string, t: number, picked: string): Mood => {
    if (t >= downAt) return name === show.unlucky ? 'party' : 'happy';
    if (t >= fallsAt) return 'scared';
    if (relieved(name, t)) return 'happy';
    if (alarms.some((span) => t >= span.from - 1e-9 && t < span.to)) return 'scared';
    const careful = t >= starts.careful;
    if (name === picked) return careful ? 'scared' : 'worried';
    return careful ? 'worried' : 'calm';
  };

  let beat = '';
  let shownLean = '';
  let landed = -1;
  let fallen = -1;
  const draw = (t: number) => {
    let now: Beat = BEATS[0];
    for (const each of BEATS) if (plan.beats[each] > 0 && starts[each] <= t) now = each;
    if (now !== beat) scene.dataset.beat = beat = now;

    // The tower, and each block on its way to it.
    const degrees = leanAt(t);
    const rounded = String(Math.round(degrees * 1e4) / 1e4);
    if (rounded !== shownLean) built.dataset.lean = shownLean = rounded;
    const count = landedBy(t);
    if (count !== landed) built.dataset.blocks = String((landed = count));
    const poses = tower(count, degrees);
    flights.forEach((flight, k) => {
      if (t >= fallsAt) return place(flight.el, tumbles.at(k, t));
      if (k < count) return place(flight.el, poses[k]!);
      if (t < flight.lift) return hide(flight.el);
      place(flight.el, inFlight(flight, t));
    });
    const down = tumbles.down(t);
    if (down !== fallen) built.dataset.fallen = String((fallen = down));

    // The pointer.
    const where = hops.at(t);
    setPointerX(where.tip.x - POINTER.tip.x);
    setPointerY(where.tip.y - POINTER.tip.y);
    if (pointer.el.dataset.over !== where.over) pointer.el.dataset.over = where.over;
    setShown(pointer.el, where.shown);

    // The pigeon.
    if (bird) {
      const on = t >= P && t < P + plan.beats.pigeon;
      setShown(bird.el, on ? 1 : 0);
      if (on) {
        const flying = t < landsAt || t >= leavesAt;
        if (bird.el.dataset.pose !== (flying ? 'flying' : 'perched')) {
          bird.setPose(flying ? 'flying' : 'perched');
        }
        const feet =
          t < landsAt
            ? arc(PIGEON.from, perch(landsAt), ease.fly((t - P) / PIGEON.lands), 60)
            : t < leavesAt
              ? perch(t)
              : arc(
                  perch(leavesAt),
                  PIGEON.to,
                  ease.fly((t - leavesAt) / (P + plan.beats.pigeon - leavesAt)),
                  60,
                );
        setBirdX!(feet.x - PIGEON_FEET.x);
        setBirdY!(feet.y - PIGEON_FEET.y);
      }
    }

    // Everyone's look.
    const tossing = flights.find((flight) => flight.by && t >= flight.lift && t < flight.lands);
    const picked = where.over || tossing?.by || '';
    for (const person of people.values()) {
      const mood = moodOf(person.name, t, picked);
      const holding = person.holding;
      const sweat =
        t < fallsAt && (mood === 'scared' || (person.name === picked && t >= starts.careful));
      const raised = holding || t >= downAt;
      if (mood !== person.mood) {
        person.mood = mood;
        person.el.dataset.mood = mood;
        person.face.setMood(mood);
      }
      if (raised !== person.raised) person.face.setRaised((person.raised = raised));
      if (sweat !== person.sweat) person.face.setSweat((person.sweat = sweat));
    }
  };
  const clock = { t: 0 };
  timeline.to(clock, { t: total, duration: total, ease: 'none', onUpdate: () => draw(clock.t) }, 0);
  draw(0);

  // Who holds a block overhead, from the lift to the whoosh: set as each
  // moment passes, so a lift too short to fall on a frame still shows.
  for (const flight of flights) {
    if (!flight.by) continue;
    const person = people.get(flight.by)!;
    for (const [time, on] of [
      [flight.lift, true],
      [flight.release, false],
    ] as const) {
      at(time, () => {
        person.holding = on;
        person.el.dataset.holding = String(on);
      });
    }
  }

  // Sounds: a thunk as each block lands, a whoosh as it's tossed, the
  // heartbeat from the careful turns on, and the fall.
  for (const flight of flights) {
    if (flight.by) cue(flight.release, 'whoosh');
    cue(flight.lands, 'thunk');
  }
  for (const time of plan.heartbeats) cue(time, 'heartbeat');
  const last = plan.turns.at(-1)!;
  const creakAt = last.lands + CREAK;
  if (plan.ending === 'dead-still') cue(creakAt, 'creak');
  cue(fallsAt, 'tumble');
  cue(downAt + HAT_DROP, 'fanfare');

  // Captions, one at each moment; the kit holds each long enough to read.
  const wobble = plan.turns.find((turn) => turn.beat === 'wobble')!;
  caption(0, 'Whoever topples it gets the job!');
  caption(starts.stack, 'Stack it up!');
  caption(wobble.lands, 'Wobble… wobble…');
  caption(wobbleFrom + WOBBLE.settled, '…it holds!');
  if (plan.pigeon) caption(starts.pigeon, 'A pigeon?!');
  for (const turn of plan.turns.filter((each) => each.beat === 'careful')) {
    caption(turn.stops, `${turn.by}…`);
  }
  caption(nearly.lands, 'Nearly!');
  // The last turn's caption names the unlucky person once the pointer is on
  // its way to them: as it hops on from the decoy, as it stops over them, or
  // as the turn starts when it stays on them.
  const named =
    plan.pointer === 'fake-out'
      ? movesOn(last)
      : plan.pointer === 'straight'
        ? last.stops
        : starts['last-turn'];
  caption(named, pointerCaption(plan, show.unlucky));
  if (plan.ending === 'dead-still') caption(last.lands, 'Uh-oh…');
  if (plan.ending === 'it-holds') {
    caption(plan.still.from, 'It holds!');
    caption(fallsAt, '…or not!');
  }
  if (plan.ending === 'slow-lean') caption(last.lands, "It's leaning…");
  caption(downAt, `${show.unlucky} toppled it!`);

  // Gags, in bubbles beside the tower's top, a head or the pigeon.
  const say = (time: number, text: string, beside: Box, clearOf: readonly Box[] = []) => {
    const avoid = [...inTheWay.filter((box) => !overlap(box, beside)), ...clearOf];
    const speech = bubble(text, speechAt(text, beside, avoid));
    speech.dataset.part = 'bubble';
    scene.append(speech);
    timeline.add(popIn(speech), time);
    timeline.set(speech, { autoAlpha: 0 }, time + BUBBLE);
  };
  const around = (point: Point, half: number): Box => ({
    left: point.x - half,
    right: point.x + half,
    top: point.y - half,
    bottom: point.y + half,
  });
  const firstQuick = plan.turns[0]!;
  say(PAPER[0], 'Thunk!', around(topOf(flights[0]!.to), 40));
  say(firstQuick.lands, 'Thunk!', around(topOf(flights[2]!.to), 40));
  say(wobble.lands, 'Eek!', headBox(spotOf(wobble.by)));
  if (plan.pigeon) say(landsAt, 'Coo?', around(perch(landsAt), 45));
  say(phewAt, 'Phew!', headBox(spotOf(nearly.by)));
  const unluckyHead = headBox(spotOf(show.unlucky));
  if (plan.phew && plan.phew !== nearly.by) {
    // The decoy is let off as the pointer hops on from them. When they threw
    // Nearly, they are saying it already.
    say(movesOn(last), 'Phew!', headBox(spotOf(plan.phew)));
  }
  if (plan.pointer === 'again') say(last.stops + fadeOf(last), 'Me again?!', unluckyHead);
  const topAt = (t: number) => around(topOf(tower(flights.length, leanAt(t)).at(-1)!), 40);
  if (plan.ending === 'dead-still') say(creakAt, 'creak…', topAt(creakAt));
  if (plan.ending === 'it-holds') say(plan.still.from, 'Phew!', unluckyHead);

  // It falls: the unlucky person steps in front of everything and grows,
  // and "Timber!" goes up by the tower's top, clear of their grown head and
  // name tag, where the hard hat lands too.
  const unlucky = people.get(show.unlucky)!;
  // The hard hat, on the head's grid, hidden until it drops.
  const hat = hardHat();
  hat.setAttribute('width', String(unlucky.spot.size));
  hat.setAttribute('height', String(unlucky.spot.size));
  hat.classList.add(styles.hat);
  gsap.set(hat, { autoAlpha: 0 });
  unlucky.el.append(hat);
  const standsOut = grownBoxes(unlucky.spot);
  say(fallsAt, 'Timber!', topAt(fallsAt), [standsOut.head, standsOut.tag]);
  // Forward only: the show never rewinds, so nothing moves them back.
  at(fallsAt, () => {
    unlucky.el.insertBefore(unlucky.tag, hat);
    scene.append(unlucky.el);
  });
  timeline.to(
    unlucky.el,
    { scale: GROWN, duration: GROW, ease: show.reducedMotion ? 'power2.out' : 'back.out(1.4)' },
    fallsAt,
  );
  if (!show.reducedMotion) {
    const lines = speedLines();
    const top = topOf(tower(flights.length, fallSide * FALL.lean).at(-1)!);
    lines.style.left = `${top.x - fallSide * 90}px`;
    lines.style.top = `${top.y}px`;
    gsap.set(lines, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    built.append(lines);
    timeline.set(lines, { autoAlpha: 1 }, fallsAt + SPEED.from);
    timeline.set(lines, { autoAlpha: 0 }, fallsAt + SPEED.to);
  }
  // Dust puffs up where the first, a middle and the last block land.
  const count = flights.length;
  for (const k of new Set([0, count >> 1, count - 1])) {
    const lies = tumbles.rest(k);
    const puff = dust(DUST.size);
    puff.style.left = `${lies.x - DUST.size / 2}px`;
    puff.style.top = `${lies.y + lies.height / 2 - 0.75 * DUST.size}px`;
    gsap.set(puff, { autoAlpha: 0 });
    built.append(puff);
    const time = tumbles.landsAt(k);
    timeline.set(puff, { autoAlpha: 1, scale: 0.4 }, time);
    timeline.to(puff, { scale: 1.3, duration: DUST.grow, ease: 'power2.out' }, time);
    timeline.to(puff, { autoAlpha: 0, duration: DUST.fade }, time + DUST.grow);
  }
  // Once it's down, the hard hat drops onto their head.
  timeline.set(hat, { autoAlpha: 1, y: -1.5 * unlucky.spot.size }, downAt);
  timeline.to(hat, { y: 0, duration: HAT_DROP, ease: 'power2.in' }, downAt);
  timeline.set({}, {}, total);

  await show.play(timeline);
}

/**
 * The tower's lean over time, in signed degrees: still points the lean
 * swings between, eased in and out. A sway starts when its block lands, or
 * once the sway before has ended if that's later, so a swing is never cut
 * short and turns back sooner than it should.
 */
class Sway {
  private readonly keys: { at: number; lean: number }[] = [{ at: 0, lean: 0 }];

  /** Sways from `start` through `moves` ([seconds after the start, lean]); returns when it starts. */
  sway(start: number, moves: readonly (readonly [number, number])[]): number {
    const last = this.keys.at(-1)!;
    const from = Math.max(start, last.at);
    if (from > last.at) this.keys.push({ at: from, lean: last.lean });
    for (const [after, lean] of moves) this.keys.push({ at: from + after, lean });
    return from;
  }

  at(t: number): number {
    const { keys } = this;
    let low = 0;
    let high = keys.length - 1;
    if (t >= keys[high]!.at) return keys[high]!.lean;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (keys[middle]!.at <= t) low = middle;
      else high = middle;
    }
    const a = keys[low]!;
    const b = keys[high]!;
    return a.lean + (b.lean - a.lean) * ease.sway((t - a.at) / (b.at - a.at));
  }
}

/** A point `u` of the way from `a` to `b` on a curve over the higher of the two, `rise` above it. */
function arc(a: Point, b: Point, u: number, rise: number): Point {
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - rise };
  const v = 1 - u;
  return {
    x: v * v * a.x + 2 * v * u * c.x + u * u * b.x,
    y: v * v * a.y + 2 * v * u * c.y + u * u * b.y,
  };
}

/** Where a block is at `t` on its way: held overhead, then tossed in an arc, or dropped in. */
function inFlight(flight: Flight, t: number): Block {
  const { from, to, release, lands } = flight;
  if (t < release) return from;
  const u = (t - release) / (lands - release);
  const paper = flight.by === null;
  const point = paper
    ? { x: to.x, y: from.y + (to.y - from.y) * ease.drop(u) }
    : arc(from, to, ease.toss(u), ARC);
  return {
    ...point,
    width: from.width + (to.width - from.width) * u,
    height: from.height + (to.height - from.height) * u,
    turn: from.turn + (to.turn - from.turn) * u,
  };
}

/** The caption as the last turn starts, for how the pointer moves. */
function pointerCaption(plan: Plan, unlucky: string): string {
  if (plan.pointer === 'fake-out') return `${plan.phew}… nope, ${unlucky}!`;
  if (plan.pointer === 'again') return `${unlucky}… again?!`;
  return `${unlucky}…`;
}

/**
 * The head and the name tag of someone standing at `spot` once grown to
 * GROWN, about the point they stand on (the person's transform origin).
 * Their hard hat sits inside the head's box.
 */
export function grownBoxes(spot: Spot, tagWidth = spot.tag.maxWidth): { head: Box; tag: Box } {
  const grow = (box: Box): Box => ({
    left: spot.x + (box.left - spot.x) * GROWN,
    right: spot.x + (box.right - spot.x) * GROWN,
    top: spot.y + (box.top - spot.y) * GROWN,
    bottom: spot.y + (box.bottom - spot.y) * GROWN,
  });
  return { head: grow(headBox(spot)), tag: grow(tagBox(spot, tagWidth)) };
}

/**
 * How the tower comes down, from `fallsAt`: each block stands on the tower
 * as it tips (the top one sliding off on `it-holds`), lets go at the end of
 * the tip and tumbles to `heap`, its place k there. The bottom block lands
 * first and the top one last; with reduced motion all of them drop straight
 * down together, without turning over.
 */
function planTumble(
  plan: Plan,
  rests: readonly Block[],
  {
    fallsAt,
    tip,
    side,
    calm,
    leanAt,
  }: {
    fallsAt: number;
    tip: number;
    side: -1 | 1;
    calm: boolean;
    leanAt: (t: number) => number;
  },
) {
  const count = rests.length;
  const slides = plan.ending === 'it-holds';
  const leaves = fallsAt + tip;
  const landsAt = (k: number) =>
    fallsAt +
    (calm
      ? FALL.lands
      : FALL.first + (FALL.lands - FALL.first) * (count === 1 ? 1 : k / (count - 1)));
  /** Block k standing on the tipping tower at `t`; the top one slides off on `it-holds`. */
  const standing = (k: number, t: number): Block => {
    const block = tower(count, leanAt(t))[k]!;
    if (!slides || k !== count - 1) return block;
    const u = ease.sway(Math.max(0, Math.min(1, (t - fallsAt) / tip)));
    const a = (block.turn * Math.PI) / 180;
    const along = side * FALL.slide * u;
    return {
      ...block,
      x: block.x + along * Math.cos(a),
      y: block.y + along * Math.sin(a),
      turn: block.turn + side * 15 * u,
    };
  };
  const from = rests.map((_, k) => standing(k, leaves));
  return {
    landsAt,
    rest: (k: number) => rests[k]!,
    /** How many blocks lie in the heap at `t`. */
    down: (t: number) => rests.filter((_, k) => t >= landsAt(k)).length,
    /** Where block k is at `t`, from `fallsAt` on. */
    at(k: number, t: number): Block {
      if (t < leaves) return standing(k, t);
      const to = rests[k]!;
      const lands = landsAt(k);
      if (t >= lands) return to;
      const start = from[k]!;
      const u = (t - leaves) / (lands - leaves);
      const point = calm
        ? {
            x: start.x + (to.x - start.x) * ease.sway(u),
            y: start.y + (to.y - start.y) * ease.drop(u),
          }
        : arc(start, to, ease.toss(u), 40);
      const turn = calm ? to.turn : to.turn + side * 180;
      return { ...to, ...point, turn: start.turn + (turn - start.turn) * u };
    },
  };
}

/** Draws `el` as `block`: its size, its place and its turn. */
function place(el: HTMLElement, block: Block) {
  const width = `${block.width}px`;
  const height = `${block.height}px`;
  if (el.style.width !== width) el.style.width = width;
  if (el.style.height !== height) el.style.height = height;
  el.style.transform = `translate(${block.x - block.width / 2}px, ${block.y - block.height / 2}px) rotate(${block.turn}deg)`;
  if (el.style.visibility) el.style.visibility = '';
}

function hide(el: HTMLElement) {
  if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
}

/** Draws `el` at `opacity`, hidden at 0. */
function setShown(el: HTMLElement | SVGElement, opacity: number) {
  const visibility = opacity > 0 ? '' : 'hidden';
  if (el.style.visibility !== visibility) el.style.visibility = visibility;
  const value = String(opacity);
  if (el.style.opacity !== value) el.style.opacity = value;
}

/** Someone standing at `spot`: their head on land and their name on their chest. */
function createPerson(name: string, look: Look, spot: Spot): Person {
  const el = document.createElement('div');
  el.className = styles.person;
  el.dataset.person = name;
  el.dataset.holding = 'false';
  el.style.left = `${spot.x - spot.size / 2}px`;
  el.style.top = `${spot.y - 0.8 * spot.size}px`;
  el.style.width = `${spot.size}px`;
  el.style.height = `${spot.size}px`;
  const face = head(look, { land: true, mood: 'calm' });
  face.el.setAttribute('width', String(spot.size));
  face.el.setAttribute('height', String(spot.size));
  const tag = nameTag(name, { ...spot.tag, chest: true });
  el.append(face.el, tag);
  return { name, el, face, spot, tag, mood: '', holding: false, raised: false, sweat: false };
}

/**
 * Moves each name tag sideways as the layout says, to keep it on the stage
 * and clear of the tower. A tag is as wide as the browser draws it; where
 * nothing is drawn (jsdom), as the layout estimates.
 */
function placeNameTags(people: readonly Person[]): Box[] {
  const tags = people.map((person) => person.tag);
  const widths = people.map((person, index) => {
    const tag = tags[index]!;
    const set = Number.parseFloat(tag.style.maxWidth);
    const lines = tag.dataset.lines === '2' ? 2 : 1;
    return tag.offsetWidth || tagContentWidth(person.name, person.spot.tag.size, set, lines);
  });
  const shifts = placeTags(
    people.map((person) => person.spot),
    widths,
  );
  shifts.forEach((shift, index) => {
    if (shift !== 0) tags[index]!.style.left = `calc(50% + ${shift}px)`;
  });
  return people.map((person, index) => tagBox(person.spot, widths[index], shifts[index]));
}
