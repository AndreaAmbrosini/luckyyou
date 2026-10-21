// The director: builds the whole show as one timeline from the plan, beat by
// beat, and plays it on the show's clock. The stage tells its story in data
// attributes too: the scene's beat, who is in the water, who the rope is
// heading for, and what the helicopter and the shark are doing.

import { gsap } from 'gsap';
import {
  bob,
  handOutLooks,
  head,
  nameTag,
  popIn,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import { HANGING_SIZE, places, tagBottom, tagFor, type Place } from './layout';
import { fin, helicopter, sea } from './parts';
import { BEATS, planShow, type Beat, type Rescue } from './plan';
import styles from './shark-bait.module.css';

/** Seconds for the helicopter to reach someone, and for people to glide to their places. */
const ARRIVE = 0.4;
/** Seconds for the rope to swing from one person to another. */
const SWING = 0.4;
/** Seconds from the hook coming down to the person being up and away. */
const LIFT = 0.7;
/** Of a lift, the seconds before the person leaves the water. */
const GRAB = 0.25;
/** Where the rope hangs from: while hovering, and while swooping low. */
const HOVER_Y = 218;
const SWOOP_Y = 138;
/** Where the hook stops for a swoop, and how far apart the people hanging from it are. */
const SWOOP_HOOK_Y = 372;
const CHAIN_GAP = 48;
/** Where the helicopter waits while people splash in, and how small it is far away. */
const WAITING = { x: 1130, y: 185, scale: 0.6 };
/** The line the shark's fin patrols along. */
const PATROL = { left: 200, right: 1080, y: 668, start: 640, legSeconds: 3 };

type Timeline = gsap.core.Timeline;

export async function playSharkBait(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });

  const { scene } = sea();
  show.stage.append(scene);
  const chopper = createHelicopter(timeline);
  scene.append(chopper.el);
  const start = places(plan.start.length);
  const swimmers = new Map(
    plan.start.map((name, index) => [
      name,
      createSwimmer(timeline, name, looks.get(name)!, start[index]!),
    ]),
  );
  for (const swimmer of swimmers.values()) {
    scene.append(swimmer.el);
    // Each bobs at its own pace, so the water doesn't move in step.
    bob(swimmer.bobber, { distance: 6, seconds: 1.2 + show.random() * 0.6 });
  }
  const shark = fin();
  scene.append(shark.el);
  gsap.set(shark.el, { x: PATROL.start, y: PATROL.y });

  /** When each beat starts, in show seconds. */
  const starts = {} as Record<Beat, number>;
  let total = 0;
  for (const beat of BEATS) {
    starts[beat] = total;
    total += plan.beats[beat];
  }
  for (const beat of BEATS) {
    if (plan.beats[beat] > 0)
      timeline.call(() => void (scene.dataset.beat = beat), [], starts[beat]);
  }
  scene.dataset.beat = BEATS[0];

  const inWater = () => [...swimmers.values()].filter((swimmer) => !swimmer.lifted);

  /** Everyone still in the water but `aimed` gets `mood`; `aimed` gets calm. */
  const moods = (time: number, aimed: string | null) => {
    for (const swimmer of inWater()) {
      const scared = swimmer.name === show.unlucky && inWater().length === 2;
      const mood: Mood = swimmer.name === aimed ? 'calm' : scared ? 'scared' : 'worried';
      swimmer.mood(mood, time);
    }
  };

  // Splash-in: everyone pops up in the water, and the helicopter waits far off.
  [...swimmers.values()].forEach((swimmer, index) => {
    timeline.add(popIn(swimmer.el), (index * 0.8) / swimmers.size);
  });
  const finX = patrol(timeline, shark, starts['sharks-run']);

  // The rescues, in the plan's order.
  let groupAt = starts['group-rescues'];
  for (const rescue of plan.rescues) {
    if (rescue.kind === 'group') {
      moods(groupAt, null);
      swoop(
        rescue.lifted.map((name) => swimmers.get(name)!),
        groupAt,
      );
      groupAt += 1;
      continue;
    }
    const beat = BEAT_OF[rescue.kind];
    rescueOne(rescue, starts[beat], plan.beats[beat]);
  }

  // The shark's run: the helicopter leaves, and the fin heads for the last one.
  const last = swimmers.get(show.unlucky)!;
  const run = starts['sharks-run'];
  chopper.phase('leaving', run);
  chopper.lower(0, run, ARRIVE);
  chopper.flyTo({ x: -260, y: 120 }, run, 0.9, 'power2.in');
  timeline.call(() => void (chopper.rope.dataset.aim = ''), [], run);
  last.glide(places(1)[0]!, run, ARRIVE);
  last.mood('scared', run);
  const alone = places(1)[0]!;
  const fromLeft = finX < alone.x;
  timeline.set(shark.shape, { scaleX: fromLeft ? -1 : 1 }, run);
  timeline.to(
    shark.el,
    { x: alone.x + (fromLeft ? -160 : 160), duration: plan.beats['sharks-run'], ease: 'power2.in' },
    run,
  );

  // The victory lap.
  last.mood('party', starts['victory-lap']);
  timeline.set({}, {}, total);

  await show.play(timeline);

  /** One swoop: the helicopter dives in, everyone in `group` grabs the rope, and off it goes. */
  function swoop(group: readonly Swimmer[], at: number) {
    const x = clamp(group.reduce((sum, swimmer) => sum + swimmer.place.x, 0) / group.length);
    const away = x < 640 ? -1 : 1;
    timeline.call(() => void (chopper.rope.dataset.aim = ''), [], at);
    chopper.phase('swooping', at);
    chopper.flyTo({ x, y: SWOOP_Y, scale: 1 }, at, ARRIVE, 'power2.out');
    chopper.lower(SWOOP_HOOK_Y - SWOOP_Y, at, ARRIVE);
    const grab = at + ARRIVE;
    const flyOff = grab + ARRIVE;
    const exit = { x: 380 * away, y: -560 };
    group.forEach((swimmer, index) => {
      const slot = {
        x: x + (index % 2 === 0 ? -8 : 8),
        y: SWOOP_HOOK_Y - 29 - CHAIN_GAP * (group.length - 1 - index),
        size: HANGING_SIZE,
      };
      swimmer.leave(grab);
      swimmer.glide(slot, grab, ARRIVE, { label: false });
      timeline.to(
        swimmer.el,
        { x: `+=${exit.x}`, y: `+=${exit.y}`, duration: 1 - 2 * ARRIVE, ease: 'power2.in' },
        flyOff,
      );
      timeline.set(swimmer.el, { autoAlpha: 0 }, at + 1);
    });
    chopper.flyTo({ x: x + exit.x, y: SWOOP_Y + exit.y }, flyOff, 1 - 2 * ARRIVE, 'power2.in');
  }

  /** One at a time: the rope heads for each of the rescue's aims in turn, then lifts one. */
  function rescueOne(rescue: Exclude<Rescue, { kind: 'group' }>, at: number, seconds: number) {
    const aims = AIMS[rescue.kind](rescue as never);
    const hold = (seconds - ARRIVE - (aims.length - 1) * SWING - LIFT) / aims.length;
    const water = inWater().sort((a, b) => a.place.x - b.place.x || a.place.y - b.place.y);
    const settled = places(water.length);
    water.forEach((swimmer, index) => swimmer.glide(settled[index]!, at, ARRIVE));

    let time = at;
    aims.forEach((name, index) => {
      const target = swimmers.get(name)!;
      const seconds = index === 0 ? ARRIVE : SWING;
      chopper.aim(name, time);
      moods(time, name);
      chopper.phase('hovering', time);
      if (index > 0) chopper.swing(target.place.x, time, seconds);
      chopper.flyTo({ x: target.place.x, y: HOVER_Y, scale: 1 }, time, seconds, 'power2.inOut');
      chopper.lower(hookAbove(target.place) - HOVER_Y, time, seconds);
      time += seconds;
      if (aims.length === 1) chopper.wobble(time, hold);
      time += hold;
    });
    const lifted = swimmers.get(rescue.lifted)!;
    chopper.lower(lifted.place.y - 0.68 * lifted.place.size - 10 - HOVER_Y, time, GRAB);
    lifted.leave(time + GRAB);
    lifted.rise(time + GRAB, chopper);
  }
}

type Swimmer = ReturnType<typeof createSwimmer>;

const BEAT_OF = { hover: 'four-left', 'fake-out': 'fake-out', duel: 'duel' } as const;

/** Who the rope heads for, in order, in each kind of one-at-a-time rescue. */
const AIMS: {
  [Kind in keyof typeof BEAT_OF]: (rescue: Extract<Rescue, { kind: Kind }>) => readonly string[];
} = {
  hover: ({ lifted }) => [lifted],
  'fake-out': ({ decoy, via, lifted }) => (via ? [lifted, via, lifted] : [decoy, lifted]),
  duel: ({ aims }) => aims,
};

/** Keeps the helicopter's rope where the whole helicopter is on stage. */
const clamp = (x: number) => Math.min(1100, Math.max(180, x));

/** Where the hook waits above someone: just over their name tag. */
const hookAbove = ({ y, size }: Place) => y + tagBottom(size) - 1.1 * tagFor({ size }).size - 40;

/**
 * The fin swims to and fro along the bottom until the shark's run at `until`.
 * Returns where it ends up.
 */
function patrol(timeline: Timeline, shark: ReturnType<typeof fin>, until: number): number {
  const legs = Math.max(1, Math.round(until / PATROL.legSeconds));
  const seconds = until / legs;
  for (let leg = 0; leg < legs; leg++) {
    const left = leg % 2 === 0;
    timeline.set(shark.shape, { scaleX: left ? 1 : -1 }, leg * seconds);
    timeline.to(
      shark.el,
      { x: left ? PATROL.left : PATROL.right, duration: seconds, ease: 'sine.inOut' },
      leg * seconds,
    );
  }
  return legs % 2 === 1 ? PATROL.left : PATROL.right;
}

/** A person in the water: their head, bobbing, with their name tag above it. */
function createSwimmer(timeline: Timeline, name: string, look: Look, place: Place) {
  const el = document.createElement('div');
  el.className = styles.swimmer;
  el.dataset.person = name;
  el.dataset.inWater = 'true';
  const bobber = el.appendChild(document.createElement('div'));
  bobber.className = styles.bobber;
  const figure = bobber.appendChild(document.createElement('div'));
  figure.className = styles.figure;
  const face = head(look);
  figure.append(face.el);
  const label = bobber.appendChild(document.createElement('div'));
  label.className = styles.label;
  label.append(nameTag(name, tagFor(place)));
  gsap.set(el, { x: place.x, y: place.y });
  gsap.set(figure, { scale: place.size / 100 });
  gsap.set(label, { y: tagBottom(place.size) });

  let current = place;
  let lifted = false;
  return {
    name,
    el,
    bobber,
    get place() {
      return current;
    },
    get lifted() {
      return lifted;
    },
    mood(mood: Mood, at: number) {
      timeline.call(() => face.setMood(mood), [], at);
    },
    /** Glides to `next`; their tag grows or shrinks with them unless `label` is false. */
    glide(next: Place, at: number, seconds: number, { label: keepLabel = true } = {}) {
      const from = current;
      current = next;
      if (from.x === next.x && from.y === next.y && from.size === next.size) return;
      const ease = 'power2.inOut';
      timeline.to(el, { x: next.x, y: next.y, duration: seconds, ease }, at);
      timeline.to(figure, { scale: next.size / 100, duration: seconds, ease }, at);
      if (!keepLabel) return;
      const grow = tagFor(next).size / tagFor(from).size;
      timeline.to(label, { y: tagBottom(next.size), scale: grow, duration: seconds, ease }, at);
      timeline.call(() => label.replaceChildren(nameTag(name, tagFor(next))), [], at + seconds);
      timeline.set(label, { scale: 1 }, at + seconds);
    },
    /** Grabs the rope and leaves the water: happy, with no swim ring and no tag. */
    leave(at: number) {
      lifted = true;
      timeline.call(
        () => {
          el.dataset.inWater = 'false';
          face.setMood('happy');
          face.setRing(false);
        },
        [],
        at,
      );
      timeline.to(label, { autoAlpha: 0, duration: 0.2 }, at);
    },
    /** Goes up the rope into the helicopter. */
    rise(at: number, chopper: Helicopter) {
      const seconds = LIFT - GRAB;
      const climb = chopper.length - 40;
      timeline.to(el, { y: `-=${climb}`, duration: seconds, ease: 'power2.in' }, at);
      timeline.to(el, { autoAlpha: 0, duration: 0.15 }, at + seconds - 0.15);
      chopper.lower(40, at, seconds, 'power2.in');
    },
  };
}

type Helicopter = ReturnType<typeof createHelicopter>;

/**
 * The helicopter, with what it does added to `timeline`. Its moves must be
 * added in the order they happen: it remembers where it ends up.
 */
function createHelicopter(timeline: Timeline) {
  const parts = helicopter();
  const at = { x: WAITING.x, y: WAITING.y, scale: WAITING.scale, facing: 1, length: 0 };
  parts.el.dataset.phase = 'waiting';
  parts.rope.dataset.aim = '';
  gsap.set(parts.el, { x: at.x, y: at.y });
  gsap.set(parts.body, { scale: at.scale });
  gsap.set(parts.hook, { autoAlpha: 0 });
  gsap.set(parts.rope, { height: 0 });
  // The rotor turns all show long.
  gsap.to(parts.rotor, { scaleX: 0.35, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  return {
    ...parts,
    /** How long the rope is, once every move added so far has played. */
    get length() {
      return at.length;
    },
    phase(phase: string, time: number) {
      timeline.call(() => void (parts.el.dataset.phase = phase), [], time);
    },
    aim(name: string, time: number) {
      timeline.call(() => void (parts.rope.dataset.aim = name), [], time);
    },
    flyTo(
      to: { x: number; y: number; scale?: number },
      time: number,
      seconds: number,
      ease: string,
    ) {
      const scale = to.scale ?? at.scale;
      // It faces the way it flies; drawn, it faces left.
      const facing = to.x === at.x ? at.facing : to.x > at.x ? -1 : 1;
      timeline.to(parts.el, { x: to.x, y: to.y, duration: seconds, ease }, time);
      timeline.to(
        parts.body,
        { scaleX: facing * scale, scaleY: scale, duration: Math.min(seconds, 0.3) },
        time,
      );
      Object.assign(at, { x: to.x, y: to.y, scale, facing });
    },
    lower(length: number, time: number, seconds: number, ease = 'power2.out') {
      if (length > 0) timeline.set(parts.hook, { autoAlpha: 1 }, time);
      timeline.to(parts.rope, { height: length, duration: seconds, ease }, time);
      timeline.to(parts.hook, { y: length, duration: seconds, ease }, time);
      if (length === 0) timeline.set(parts.hook, { autoAlpha: 0 }, time + seconds);
      at.length = length;
    },
    /** The rope trails behind as the helicopter swings across to `x`, then hangs straight. */
    swing(x: number, time: number, seconds: number) {
      const trail = x > at.x ? 10 : -10;
      timeline.to(
        parts.line,
        {
          keyframes: [{ rotation: trail }, { rotation: 0 }],
          duration: seconds,
          ease: 'sine.inOut',
        },
        time,
      );
    },
    /** The rope sways while the helicopter hovers. */
    wobble(time: number, seconds: number) {
      timeline.to(
        parts.line,
        {
          keyframes: [{ rotation: 5 }, { rotation: -5 }, { rotation: 0 }],
          duration: seconds,
          ease: 'sine.inOut',
        },
        time,
      );
    },
  };
}
