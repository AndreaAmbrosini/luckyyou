// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. The plan says whose turn it is when; this says how
// it looks. What moves (the tower's lean, the blocks, the pointers and the
// people) and who looks how are worked out from the show's time each frame,
// so every frame follows from the plan alone. The stage tells its story in
// data attributes too: the scene's beat, the tower's lean, its blocks and how
// many lie in the heap, whom each pointer is over, how many are at risk, and
// each person's mood, whether they hold a block and whether they sit on the
// Safe bench.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  popIn,
  speechAt,
  speechBox,
  type Cue,
  type Head,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  BLOCK_WIDTHS,
  benchTag,
  blockHeight,
  heap,
  headBox,
  heldBlock,
  overlap,
  placings,
  plank,
  nameTagFor,
  signedLean,
  tagBox,
  tagSetOf,
  topOf,
  tower,
  towards,
  type Block,
  type Box,
  type DrawnTag,
  type Point,
  type SetTag,
  type TagSet,
  type Spot,
} from './layout';
import {
  bench as drawBench,
  block as drawBlock,
  dust,
  field,
  hardHat,
  plinth as drawPlinth,
  pointer as drawPointer,
  POINTER,
  speedLines,
  spotlight as drawSpotlight,
} from './parts';
import { BEATS, hopInto, planShow, READ, type Beat, type Plan, type Turn } from './plan';
import { FLIGHT, planHops, startTipOf } from './pointer';
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
const SWAY = { out: 0.34, back: 0.34 };
/** The thrower lifts the block this long after the pointer stops over them. */
const LIFT = 0.15;
/**
 * Nearly, from its landing: "Whoa…" at `whoa` and "Nearly!" at `caption`;
 * after its hold it swings back upright in `back` seconds, overshooting a
 * little unless motion is reduced.
 */
const NEARLY = { whoa: 0.25, caption: 1.3, back: 0.5 };
/** How far a toss arcs above the higher of its two ends. */
const ARC = 140;
/** Seconds a bubble stays up. */
const BUBBLE = 0.8;
/** Seconds the spotlight takes to fade in. */
const SPOTLIGHT = 0.6;
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
  back: gsap.parseEase('back.out'),
};

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  /** Where they were last drawn. */
  spot: Spot;
  /** Their name tag, drawn over the blocks until they step in front at the fall. */
  readonly tag: HTMLElement;
  /** The box their name tag's holder takes, the size and place of their head. */
  readonly holder: HTMLElement;
  benched: boolean;
  /** Whether they're behind the spotlight. */
  dimmed: boolean;
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

  const total = plan.end;
  /** Every block's height: the tower stays under the bench however many land. */
  const height = blockHeight(2 + plan.turns.length);

  const scene = field();
  show.stage.append(scene);

  // The Safe bench along the top and the "At risk" plinth under the tower,
  // with 4 or more; the heads of those gone safe behind the spotlight, and
  // those at risk in front of it, the tower in front of them; and every name
  // tag over every block, flying or fallen, tossed past the bench too: each
  // in a holder the size and place of its person, in a layer above the tower.
  const headCount = plan.order.length;
  const benches = headCount >= 4;
  const dimmed = scene.appendChild(document.createElement('div'));
  dimmed.className = styles.tower;
  const light = scene.appendChild(drawSpotlight());
  setShown(light, 0);
  const crowd = scene.appendChild(document.createElement('div'));
  crowd.className = styles.tower;
  const stand = benches ? drawPlinth() : null;
  if (stand) scene.append(stand.el);
  const built = scene.appendChild(document.createElement('div'));
  built.className = styles.tower;
  built.dataset.part = 'tower';
  const tags = scene.appendChild(document.createElement('div'));
  tags.className = styles.tower;
  tags.dataset.part = 'tags';
  // How the kit sets each tag, each way the show sets it, worked out once
  // before the show: as wide as the browser draws it, or where nothing is
  // drawn (jsdom), as the layout estimates.
  const sets = new Map<string, TagSet>();
  const setTag: SetTag = (name, tag) => {
    const key = `${name}|${tag.size}|${tag.maxWidth}`;
    let set = sets.get(key);
    if (!set) {
      const el = tags.appendChild(nameTagFor(name, tag));
      const kit = tagSetOf(name, el);
      set = { ...kit, width: el.offsetWidth || kit.width };
      el.remove();
      sets.set(key, set);
    }
    return set;
  };
  const places = placings(plan, setTag, show.reducedMotion);
  const spotAt = (name: string, t: number) => places.at(name, t);
  const people = new Map<string, Person>(
    plan.order.map((name) => {
      const person = createPerson(name, looks.get(name)!, spotAt(name, 0), places.tag(name, 0)!);
      crowd.append(person.el);
      tags.append(person.holder);
      return [name, person];
    }),
  );
  // The bench seats everyone who goes safe, left to right as they do, by
  // their tags' widths there.
  const goingSafe = plan.turns.filter((turn) => turn.safe !== null).map((turn) => turn.by);
  const seat = benchTag(goingSafe.length);
  const plankFor = plank(goingSafe.map((name) => setTag(name, seat).width));
  if (benches) scene.insertBefore(drawBench(plankFor), dimmed);
  /** Every head and name tag at `t`, which a bubble keeps clear of. */
  const inTheWay = (t: number) =>
    plan.order.flatMap((name) => {
      const tag = places.tagBox(name, t);
      return tag ? [headBox(spotAt(name, t)), tag] : [headBox(spotAt(name, t))];
    });

  // The tower's lean, sway by sway, in signed degrees.
  const lean = new Sway();
  const side = (turn: Turn) => signedLean(turn.lean, (name) => spotAt(name, turn.lands));
  /** After a round's last block: Nearly leans out, holds and swings back; any other sways. */
  const swayAfter = (turn: Turn) => {
    const peak = side(turn);
    if (turn.nearly) {
      lean.sway(turn.lands, [
        [plan.hold.from - turn.lands, peak],
        [plan.hold.to - turn.lands, peak],
        [plan.hold.to + NEARLY.back - turn.lands, 0, show.reducedMotion ? ease.sway : ease.back],
      ]);
      return;
    }
    lean.sway(turn.lands, [
      [SWAY.out, peak],
      [SWAY.out + SWAY.back, 0],
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

  // Each block's way onto the tower, in the order they land, with the sway
  // after each round's last block.
  const flights: Flight[] = [];
  const add = (by: string | null, flight: Omit<Flight, 'el' | 'by' | 'to'>) => {
    const k = flights.length;
    const to = tower(k + 1, lean.at(flight.lands), height)[k]!;
    const fill = by ? `var(--color-${looks.get(by)!.ring})` : 'var(--color-paper)';
    const el = drawBlock(BLOCK_WIDTHS[k % BLOCK_WIDTHS.length]!, fill);
    el.dataset.by = by ?? '';
    el.style.visibility = 'hidden';
    built.append(el);
    flights.push({ ...flight, el, by, to });
  };
  PAPER.forEach((lands, k) => {
    const to = tower(k + 1, 0, height)[k]!;
    add(null, {
      lift: lands - DROP,
      release: lands - DROP,
      lands,
      from: { ...to, y: DROP_FROM, turn: 0 },
    });
    lean.sway(lands, [
      [SWAY.out, PAPER_SWAY[k]!],
      [SWAY.out + SWAY.back, 0],
    ]);
  });
  plan.turns.forEach((turn, index) => {
    const lift = turn.stops + LIFT;
    add(turn.by, {
      lift,
      release: Math.max(lift, turn.lands - FLIGHT),
      lands: turn.lands,
      from: heldBlock(spotAt(turn.by, lift)),
    });
    if (turn.beat === 'last-turn') lastTurnSway(turn);
    else if (plan.turns[index + 1]!.round !== turn.round) swayAfter(turn);
  });
  const fallsAt = plan.still.to;
  /** Where the unlucky person stands as it falls, and to the end. */
  const theirSpot = spotAt(show.unlucky, fallsAt);
  const fallSide = towards(plan.falls, () => theirSpot);
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
  const tumbles = planTumble(plan, heap(theirSpot, flights.length, height), {
    fallsAt,
    tip,
    side: fallSide,
    calm: show.reducedMotion,
    leanAt,
    height,
  });
  /** When the last block lands in the heap. */
  const downAt = fallsAt + FALL.lands;

  // The pointers: from above the tower, each hops to its round's stops and
  // thrower (the second to a pair's second thrower), fades out as they lift
  // the block, and fades in where it was as its next round starts.
  const pointers = [0, 1].map(() => {
    const { el } = drawPointer();
    el.dataset.over = '';
    scene.append(el);
    return {
      el,
      x: gsap.quickSetter(el, 'x', 'px') as (value: number) => void,
      y: gsap.quickSetter(el, 'y', 'px') as (value: number) => void,
    };
  });
  const hops = planHops(plan.turns, places, startTipOf(height, PAPER.length));

  // Who looks how: everyone is scared while Nearly nearly topples; whoever
  // the pointer picks is worried, then scared once the spotlight is on, when
  // everyone else at risk is worried; Nearly's thrower is relieved; at the
  // end the unlucky person parties and everyone else cheers.
  const nearly = plan.turns.find((turn) => turn.nearly)!;
  const alarm: Span = { from: nearly.lands, to: plan.hold.to + NEARLY.back };
  // Nearly's thrower says "Phew!" as it swings back.
  const phewAt = plan.hold.to;
  const relieved = (name: string, t: number) =>
    (name === nearly.by && t >= phewAt && t < phewAt + BUBBLE) ||
    (plan.ending === 'it-holds' &&
      name === show.unlucky &&
      t >= plan.still.from &&
      t < plan.still.from + BUBBLE);
  const moodOf = (name: string, t: number, picked: string, atRisk: boolean): Mood => {
    if (t >= downAt) return name === show.unlucky ? 'party' : 'happy';
    if (t >= fallsAt) return 'scared';
    if (relieved(name, t)) return 'happy';
    if (t >= alarm.from - 1e-9 && t < alarm.to) return 'scared';
    const final = t >= plan.spotlight;
    if (name === picked) return final ? 'scared' : 'worried';
    return final && atRisk ? 'worried' : 'calm';
  };

  let beat = '';
  let shownLean = '';
  let landed = -1;
  let fallen = -1;
  const draw = (t: number) => {
    let now: Beat = BEATS[0];
    for (const each of BEATS) if (plan.beats[each] > 0 && plan.starts[each] <= t) now = each;
    if (now !== beat) scene.dataset.beat = beat = now;

    // The tower, and each block on its way to it.
    const degrees = leanAt(t);
    const rounded = String(Math.round(degrees * 1e4) / 1e4);
    if (rounded !== shownLean) built.dataset.lean = shownLean = rounded;
    const count = landedBy(t);
    if (count !== landed) built.dataset.blocks = String((landed = count));
    const poses = tower(count, degrees, height);
    flights.forEach((flight, k) => {
      if (t >= fallsAt) return place(flight.el, tumbles.at(k, t));
      if (k < count) return place(flight.el, poses[k]!);
      if (t < flight.lift) return hide(flight.el);
      place(flight.el, inFlight(flight, t));
    });
    const down = tumbles.down(t);
    if (down !== fallen) built.dataset.fallen = String((fallen = down));

    // The pointers.
    const where = pointers.map((pointer, which) => {
      const at = hops.at(t, which);
      pointer.x(at.tip.x - POINTER.tip.x);
      pointer.y(at.tip.y - POINTER.tip.y);
      if (pointer.el.dataset.over !== at.over) pointer.el.dataset.over = at.over;
      setShown(pointer.el, at.shown);
      return at;
    });

    // Everyone where they are now, and how many are still at risk; once the
    // spotlight is on, whoever has gone safe is behind it.
    const atRisk = new Set(places.atRisk(t));
    for (const person of people.values()) {
      drawPerson(person, spotAt(person.name, t), places.tag(person.name, t));
      if (!person.benched && places.benched(person.name, t))
        person.el.dataset.benched = String((person.benched = true));
      if (!person.dimmed && t >= plan.spotlight && !atRisk.has(person.name)) {
        person.dimmed = true;
        dimmed.append(person.el);
      }
    }
    if (stand) stand.count(atRisk.size);
    // Faded in from the spotlight; a hair over, so it's full on time however t is rounded.
    setShown(light, Math.min(1, Math.max(0, (t - plan.spotlight) / SPOTLIGHT + 1e-9)));

    // Everyone's look.
    const tossing = flights.find((flight) => flight.by && t >= flight.lift && t < flight.lands);
    const picked = where[0]!.over || tossing?.by || '';
    for (const person of people.values()) {
      const risky = atRisk.has(person.name);
      const mood = moodOf(person.name, t, picked, risky);
      const holding = person.holding;
      const sweat = t < fallsAt && (mood === 'scared' || (risky && t >= plan.spotlight));
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

  // Sounds: a thunk as each block lands, a whoosh as it's tossed, a creak as
  // Nearly leans out, the heartbeat from the spotlight on, and the fall.
  for (const flight of flights) {
    if (flight.by) cue(flight.release, 'whoosh');
    cue(flight.lands, 'thunk');
  }
  cue(plan.hold.from, 'creak');
  for (const time of plan.heartbeats) cue(time, 'heartbeat');
  const last = plan.turns.at(-1)!;
  const creakAt = last.lands + CREAK;
  if (plan.ending === 'dead-still') cue(creakAt, 'creak');
  cue(fallsAt, 'tumble');
  cue(downAt + HAT_DROP, 'fanfare');

  // Captions, one at each moment; the kit holds each long enough to read.
  caption(0, 'Whoever topples it gets the job!');
  // As the second paper block lands.
  caption(
    PAPER[1],
    headCount === 2
      ? 'Just the two of you…'
      : headCount === 3
        ? 'Just the three of you…'
        : "Hold the tower, and you're safe!",
  );
  plan.turns.forEach((turn, index) => {
    const previous = plan.turns[index - 1];
    if (previous?.round === turn.round) return;
    if (turn.beat === 'safe') {
      // A safe round names its thrower, or its pair in their standing order.
      const pair = plan.turns
        .filter((each) => each.round === turn.round)
        .map((each) => each.by)
        .sort((a, b) => plan.order.indexOf(a) - plan.order.indexOf(b));
      caption(turn.stops, pair.length === 2 ? `${pair[0]} & ${pair[1]}!` : `${turn.by}'s turn`);
    } else {
      // A final round names each stop, and the thrower last.
      for (const stop of turn.decoys) caption(stop.at, `${stop.name}…`);
      caption(turn.stops, `…${turn.by}!`);
    }
  });
  caption(nearly.lands + NEARLY.whoa, 'Whoa…');
  caption(nearly.lands + NEARLY.caption, 'Nearly!');
  if (headCount >= 4) caption(plan.spotlight, 'Final three!');
  if (plan.finalTwo !== null) caption(plan.finalTwo, 'Final two!');
  if (plan.ending === 'dead-still') caption(last.lands, 'Uh-oh…');
  if (plan.ending === 'it-holds') {
    caption(plan.still.from, 'It holds!');
    caption(fallsAt, '…or not!');
  }
  if (plan.ending === 'slow-lean') caption(last.lands, "It's leaning…");
  caption(downAt, `${show.unlucky} toppled it!`);

  // Gags, in bubbles beside the tower's top or a head.
  const say = (time: number, text: string, beside: Box, clearOf: readonly Box[] = []) => {
    const avoid = [...inTheWay(time).filter((box) => !overlap(box, beside)), ...clearOf];
    const anchor = speechAt(text, beside, avoid);
    const speech = bubble(text, anchor);
    speech.dataset.part = 'bubble';
    scene.append(speech);
    timeline.add(popIn(speech), time);
    timeline.set(speech, { autoAlpha: 0 }, time + BUBBLE);
    return anchor;
  };
  const around = (point: Point, half: number): Box => ({
    left: point.x - half,
    right: point.x + half,
    top: point.y - half,
    bottom: point.y + half,
  });
  say(PAPER[0], 'Thunk!', around(topOf(flights[0]!.to), 40));
  say(plan.turns[0]!.lands, 'Thunk!', around(topOf(flights[2]!.to), 40));
  // "Safe!" beside each thrower whose block holds, as they set off for the
  // bench; after Nearly, "Phew!" first. A pair's two keep clear of each other.
  say(phewAt, 'Phew!', headBox(spotAt(nearly.by, phewAt)));
  // In the final, whoever the pointer leaves just before the thrower.
  for (const turn of plan.turns) {
    const before = turn.decoys.at(-1);
    if (!before) continue;
    const leaves = turn.stops - hopInto(turn.decoys.length);
    say(leaves, 'Phew!', headBox(spotAt(before.name, leaves)));
  }
  const saidSafe = new Map<number, Box[]>();
  for (const turn of plan.turns) {
    if (turn.safe === null) continue;
    const others = saidSafe.get(turn.safe) ?? [];
    const head = headBox(spotAt(turn.by, turn.safe));
    others.push(speechBox('Safe!', say(turn.safe, 'Safe!', head, others)));
    saidSafe.set(turn.safe, others);
  }
  const unluckyHead = headBox(theirSpot);
  const topAt = (t: number) => around(topOf(tower(flights.length, leanAt(t), height).at(-1)!), 40);
  if (plan.ending === 'dead-still') say(creakAt, 'creak…', topAt(creakAt));
  if (plan.ending === 'it-holds') say(plan.still.from, 'Phew!', unluckyHead);

  // It falls: the unlucky person steps in front of everything and grows,
  // and "Timber!" goes up by the tower's top, clear of their grown head and
  // name tag, where the hard hat lands too.
  const unlucky = people.get(show.unlucky)!;
  // The hard hat, on the head's grid, hidden until it drops.
  const hat = hardHat();
  hat.setAttribute('width', String(theirSpot.size));
  hat.setAttribute('height', String(theirSpot.size));
  hat.classList.add(styles.hat);
  gsap.set(hat, { autoAlpha: 0 });
  unlucky.el.append(hat);
  const standsOut = grownBoxes(theirSpot);
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
    const top = topOf(tower(flights.length, fallSide * FALL.lean, height).at(-1)!);
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
  timeline.set(hat, { autoAlpha: 1, y: -1.5 * theirSpot.size }, downAt);
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
  private readonly keys: { at: number; lean: number; ease?: (u: number) => number }[] = [
    { at: 0, lean: 0 },
  ];

  /**
   * Sways from `start` through `moves` ([seconds after the start, lean, and
   * the ease into it, sine.inOut unless given]).
   */
  sway(
    start: number,
    moves: readonly (readonly [number, number, ((u: number) => number)?])[],
  ): void {
    const last = this.keys.at(-1)!;
    const from = Math.max(start, last.at);
    if (from > last.at) this.keys.push({ at: from, lean: last.lean });
    for (const [after, lean, eased] of moves)
      this.keys.push({ at: from + after, lean, ease: eased });
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
    return a.lean + (b.lean - a.lean) * (b.ease ?? ease.sway)((t - a.at) / (b.at - a.at));
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
    height,
  }: {
    fallsAt: number;
    tip: number;
    side: -1 | 1;
    calm: boolean;
    leanAt: (t: number) => number;
    height: number;
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
    const block = tower(count, leanAt(t), height)[k]!;
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

/**
 * How each block was last drawn. Styles are written only when they change:
 * most frames leave most blocks as they were, and jsdom, where the shows are
 * tested, parses every write again.
 */
const drawnAs = new WeakMap<
  HTMLElement,
  { width: string; height: string; transform: string; hidden: boolean }
>();

/** Draws `el` as `block`: its size, its place and its turn. */
function place(el: HTMLElement, block: Block) {
  const was = drawnAs.get(el);
  const now = {
    width: `${block.width}px`,
    height: `${block.height}px`,
    transform: `translate(${block.x - block.width / 2}px, ${block.y - block.height / 2}px) rotate(${block.turn}deg)`,
    hidden: false,
  };
  for (const key of ['width', 'height', 'transform'] as const) {
    if (was?.[key] !== now[key]) el.style[key] = now[key];
  }
  if (was?.hidden !== false) el.style.visibility = '';
  drawnAs.set(el, now);
}

function hide(el: HTMLElement) {
  const was = drawnAs.get(el);
  if (was?.hidden) return;
  el.style.visibility = 'hidden';
  drawnAs.set(el, { width: '', height: '', transform: '', ...was, hidden: true });
}

/** Draws `el` at `opacity`, hidden at 0. */
function setShown(el: HTMLElement | SVGElement, opacity: number) {
  const visibility = opacity > 0 ? '' : 'hidden';
  if (el.style.visibility !== visibility) el.style.visibility = visibility;
  const value = String(opacity);
  if (el.style.opacity !== value) el.style.opacity = value;
}

/** Someone standing at `spot`: their head on land, and their name tag in a holder for the tags' layer. */
function createPerson(name: string, look: Look, spot: Spot, tag: DrawnTag): Person {
  const el = document.createElement('div');
  el.className = styles.person;
  el.dataset.person = name;
  el.dataset.holding = 'false';
  el.dataset.benched = 'false';
  const face = head(look, { land: true, mood: 'calm' });
  el.append(face.el);
  const holder = document.createElement('div');
  holder.className = styles.person;
  const person: Person = {
    name,
    el,
    face,
    spot,
    tag: holder.appendChild(nameTagFor(name, spot.tag)),
    holder,
    benched: false,
    dimmed: false,
    mood: '',
    holding: false,
    raised: false,
    sweat: false,
  };
  drawPerson(person, spot, tag, true);
  return person;
}

/**
 * Draws `person` at `spot`, their head and their tag's holder, with their
 * tag drawn as `tag` says (hidden when null, on the hop to the bench).
 * Styles are written only when they change, and nothing is measured: the
 * tags were all set before the show.
 */
function drawPerson(person: Person, spot: Spot, tag: DrawnTag | null, first = false) {
  const was = person.spot;
  if (first || was.x !== spot.x || was.y !== spot.y || was.size !== spot.size) {
    person.spot = spot;
    const place = {
      left: `${spot.x - spot.size / 2}px`,
      top: `${spot.y - 0.8 * spot.size}px`,
      width: `${spot.size}px`,
      height: `${spot.size}px`,
    };
    for (const el of [person.el, person.holder]) {
      for (const key of ['left', 'top', 'width', 'height'] as const) el.style[key] = place[key];
    }
    person.face.el.setAttribute('width', String(spot.size));
    person.face.el.setAttribute('height', String(spot.size));
  }
  const { style, dataset } = person.tag;
  const visibility = tag ? '' : 'hidden';
  if (style.visibility !== visibility) style.visibility = visibility;
  if (!tag) return;
  const size = `${tag.size}px`;
  if (style.getPropertyValue('--tag-size') !== size) style.setProperty('--tag-size', size);
  const maxWidth = `${tag.maxWidth}px`;
  if (style.maxWidth !== maxWidth) style.maxWidth = maxWidth;
  const lines = String(tag.lines);
  if (dataset.lines !== lines) dataset.lines = lines;
  const left = tag.shift === 0 ? '50%' : `calc(50% + ${tag.shift}px)`;
  if (style.left !== left) style.left = left;
}
