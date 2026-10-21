// The director: builds the whole show as one timeline from the plan, beat by
// beat, and plays it on the show's clock. The stage tells its story in data
// attributes too: the scene's beat, who is in the water, who the rope is
// heading for, and what the helicopter and the shark are doing.

import { gsap } from 'gsap';
import {
  bob,
  bubble,
  handOutLooks,
  head,
  nameTag,
  popIn,
  scroller,
  STAGE,
  stagePx,
  type Cue,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import { fitTags, HANGING_SIZE, places, tagBottom, type Place, type Spot } from './layout';
import { helicopter, sea, shark as drawShark } from './parts';
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
/** Where the rope hangs from, low enough that the helicopter stays under the caption. */
const HOVER_Y = 218;
/** Where the hook stops for a swoop, and how far apart the people hanging from it are. */
const SWOOP_HOOK_Y = 400;
const CHAIN_GAP = 40;
/** Where the helicopter waits while people splash in, and how small it is far away. */
const WAITING = { x: 1130, y: 185, scale: 0.6 };
/** Where the helicopter flies off to at the end, and how long it takes. */
const OFF = { x: -260, y: 120, seconds: 0.9 };
/** The line the shark's fin patrols along. */
const PATROL = { left: 200, right: 1080, y: 668, start: 640, legSeconds: 3 };
/**
 * The ending, in seconds before the show is over: the shark dives, the water
 * stays still, the shark comes up with the last one riding it, and from
 * `settled` on the name on its fin holds still.
 */
const ENDING = { dive: 2.7, still: 2.4, ride: 1.9, settled: 1.5 };
/** How fast the sea scrolls past the riding shark, in stage pixels a second. */
const RIDE_SPEED = 420;
/** The widest the name on the fin may be. */
const FIN_NAME_WIDTH = 560;

type Timeline = gsap.core.Timeline;

export async function playSharkBait(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const caption = (time: number, text: string) => at(time, () => show.caption(text));
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));

  const { scene, waves } = sea();
  show.stage.append(scene);
  const chopper = createHelicopter(timeline);
  scene.append(chopper.el);

  /**
   * Name tags for `names` at `spots`, and places that keep the tags clear of
   * each other. The tags are measured as the browser draws them; where
   * nothing is drawn (in tests), the storyboard's places stand.
   */
  const measuring = scene.appendChild(document.createElement('div'));
  measuring.className = styles.measuring;
  const tagged = (names: readonly string[], spots: readonly Place[]) => {
    const tags = names.map((name, index) => nameTag(name, spots[index]!.tag));
    // Drawn sizes are scaled with the stage; a stage that isn't drawn has no scale.
    const scale = scene.getBoundingClientRect().width / STAGE.width;
    if (!scale) return { tags, places: [...spots] };
    measuring.replaceChildren(...tags);
    const boxes = tags.map((tag) => {
      const { width, height } = tag.getBoundingClientRect();
      return { width: width / scale, height: height / scale };
    });
    measuring.replaceChildren();
    return { tags, places: fitTags(spots, boxes) };
  };

  const start = tagged(plan.start, places(plan.start.length));
  const swimmers = new Map(
    plan.start.map((name, index) => [
      name,
      createSwimmer(timeline, name, looks.get(name)!, start.places[index]!, start.tags[index]!),
    ]),
  );
  for (const swimmer of swimmers.values()) {
    scene.append(swimmer.el);
    // Each bobs at its own pace, so the water doesn't move in step.
    bob(swimmer.bobber, { distance: 6, seconds: 1.2 + show.random() * 0.6 });
  }
  const shark = createShark(timeline, show, looks.get(show.unlucky)!);
  scene.append(shark.el);
  const woohoo = scene.appendChild(bubble('Woo-hoo!', { x: 330, y: 335 }, { colour: 'sun' }));

  /** When each beat starts, in show seconds. */
  const starts = {} as Record<Beat, number>;
  let total = 0;
  for (const beat of BEATS) {
    starts[beat] = total;
    total += plan.beats[beat];
  }
  for (const beat of BEATS) {
    if (plan.beats[beat] > 0) at(starts[beat], () => void (scene.dataset.beat = beat));
  }
  scene.dataset.beat = BEATS[0];

  const inWater = () => [...swimmers.values()].filter((swimmer) => !swimmer.lifted);

  /** Everyone still in the water but `aimed` looks worried, or scared if it's down to two. */
  const moods = (time: number, aimed: string | null) => {
    for (const swimmer of inWater()) {
      const scared = swimmer.name === show.unlucky && inWater().length === 2;
      const mood: Mood = swimmer.name === aimed ? 'calm' : scared ? 'scared' : 'worried';
      swimmer.mood(mood, time);
    }
  };

  /** Everyone still in the water glides to their places for how many are left. */
  const settle = (time: number) => {
    const spots = places(inWater().length);
    const rows = spots.some((spot) => spot.y !== spots[0]!.y);
    const water = inWater().sort(
      (a, b) => (rows ? a.place.y - b.place.y : 0) || a.place.x - b.place.x,
    );
    const next = tagged(
      water.map((swimmer) => swimmer.name),
      spots,
    );
    water.forEach((swimmer, index) =>
      swimmer.glide(next.places[index]!, time, ARRIVE, next.tags[index]),
    );
  };

  // Splash-in: everyone pops up in the water, and the helicopter waits far off.
  caption(0, 'Last one in the water gets the job');
  cue(0, 'splash');
  let stopRotor = () => {};
  at(0, () => (stopRotor = show.sound.play('rotor')));
  [...swimmers.values()].forEach((swimmer, index) => {
    timeline.add(popIn(swimmer.el), (index * 0.8) / swimmers.size);
  });
  const finX = shark.patrol(starts['sharks-run']);

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
    if (rescue.kind === 'hover') caption(starts[beat], '4 left…');
    rescueOne(rescue, starts[beat], plan.beats[beat]);
  }

  // The shark's run: the helicopter leaves, and the fin speeds at the last one.
  const last = swimmers.get(show.unlucky)!;
  const run = starts['sharks-run'];
  const ending = {
    run,
    dive: total - ENDING.dive,
    still: total - ENDING.still,
    ride: total - ENDING.ride,
    settled: total - ENDING.settled,
  };
  caption(run, 'Uh-oh…');
  last.mood('scared', run);
  chopper.phase('leaving', run);
  chopper.aim('', run);
  chopper.lower(0, run, 0.3);
  chopper.flyTo(OFF, run, OFF.seconds, 'power2.in');
  chopper.phase('gone', run + OFF.seconds);
  at(run + OFF.seconds, () => stopRotor());
  shark.goFor(last.place, finX, ending);

  // It dives and takes the last one under, the water stays still, and up they come.
  cue(ending.dive, 'splash');
  timeline.to(
    last.el,
    { y: '+=40', autoAlpha: 0, duration: ending.still - ending.dive, ease: 'power2.in' },
    ending.dive,
  );
  caption(ending.ride, 'Last one in the water!');
  cue(ending.ride, 'splash');
  cue(ending.ride, 'fanfare');
  at(ending.ride, () => void scroller(waves, { width: 1280, speed: RIDE_SPEED }));
  timeline.add(popIn(woohoo), ending.settled);
  timeline.set({}, {}, total);

  await show.play(timeline);

  /** One swoop: the helicopter dives in, everyone in `group` grabs the rope, and off it goes. */
  function swoop(group: readonly Swimmer[], start: number) {
    const x = clamp(group.reduce((sum, swimmer) => sum + swimmer.place.x, 0) / group.length);
    const away = x < 640 ? -1 : 1;
    chopper.aim('', start);
    chopper.phase('swooping', start);
    chopper.flyTo({ x, y: HOVER_Y, scale: 1 }, start, ARRIVE, 'power2.out');
    chopper.lower(SWOOP_HOOK_Y - HOVER_Y, start, ARRIVE);
    const grab = start + ARRIVE;
    const flyOff = grab + ARRIVE;
    const exit = { x: 380 * away, y: -560 };
    group.forEach((swimmer, index) => {
      const slot = {
        x: x + (index % 2 === 0 ? -8 : 8),
        y: SWOOP_HOOK_Y - 29 - CHAIN_GAP * (group.length - 1 - index),
        size: HANGING_SIZE,
      };
      swimmer.leave(grab);
      swimmer.glide(slot, grab, ARRIVE);
      timeline.to(
        swimmer.el,
        { x: `+=${exit.x}`, y: `+=${exit.y}`, duration: 1 - 2 * ARRIVE, ease: 'power2.in' },
        flyOff,
      );
      timeline.set(swimmer.el, { autoAlpha: 0 }, start + 1);
    });
    cue(grab, 'whoosh');
    const left = inWater().length;
    if (left !== 4) caption(grab, `Whoosh! ${left} left`);
    settle(grab);
    chopper.flyTo({ x: x + exit.x, y: HOVER_Y + exit.y }, flyOff, 1 - 2 * ARRIVE, 'power2.in');
  }

  /** One at a time: the rope heads for each of the rescue's aims in turn, then lifts one. */
  function rescueOne(rescue: Exclude<Rescue, { kind: 'group' }>, start: number, seconds: number) {
    const aims = AIMS[rescue.kind](rescue as never);
    const hold = (seconds - ARRIVE - (aims.length - 1) * SWING - LIFT) / aims.length;

    let time = start;
    aims.forEach((name, index) => {
      const target = swimmers.get(name)!;
      const seconds = index === 0 ? ARRIVE : SWING;
      chopper.aim(name, time);
      moods(time, name);
      chopper.phase('hovering', time);
      if (rescue.kind === 'duel') cue(time, 'heartbeat');
      if (rescue.kind === 'duel' && aims.length > 2) {
        // With two people, the caption follows the rope: "Marco… Giulia… Marco… Giulia!"
        const last = index === aims.length - 1;
        caption(time, aims.slice(0, index + 1).join('… ') + (last ? '!' : '…'));
      } else if (index === 1) {
        caption(time, `It's going for ${aims[0]}… nope, ${name}!`);
      } else if (index === 2) {
        caption(time, `…${name} after all!`);
      }
      if (index > 0) chopper.swing(target.place.x, time, seconds);
      chopper.flyTo({ x: target.place.x, y: HOVER_Y, scale: 1 }, time, seconds, 'power2.inOut');
      chopper.lower(hookAbove(target.place) - HOVER_Y, time, seconds);
      time += seconds;
      if (aims.length === 1) chopper.wobble(time, hold);
      time += hold;
    });
    const lifted = swimmers.get(rescue.lifted)!;
    chopper.lower(lifted.place.y - 0.68 * lifted.place.size - 10 - HOVER_Y, time, GRAB);
    const out = time + GRAB;
    lifted.leave(out);
    lifted.rise(out, chopper);
    cue(out, 'whoosh');
    settle(out);
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
const hookAbove = (place: Place) => labelY(place) + place.y - 1.1 * place.tag.size - 40;

/** Where a person's name tag sits, from the middle of their swim ring. */
const labelY = ({ size, lift = 0 }: Place) => tagBottom(size) - lift;

/** A person in the water: their head, bobbing, with their name `tag` above it. */
function createSwimmer(
  timeline: Timeline,
  name: string,
  look: Look,
  place: Place,
  tag: HTMLElement,
) {
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
  label.append(tag);
  gsap.set(el, { x: place.x, y: place.y });
  gsap.set(figure, { scale: place.size / 100 });
  gsap.set(label, { y: labelY(place) });

  let current: Spot | Place = place;
  let lifted = false;
  return {
    name,
    el,
    bobber,
    get place(): Place {
      return current as Place;
    },
    get lifted() {
      return lifted;
    },
    mood(mood: Mood, at: number) {
      timeline.call(() => face.setMood(mood), [], at);
    },
    /**
     * Glides to `next`. In the water, their `tag` for the new place is set
     * from the start, and grows or shrinks to its size on the way.
     */
    glide(next: Spot | Place, at: number, seconds: number, tag?: HTMLElement) {
      const from = current;
      current = next;
      const lifted = (spot: Spot | Place) => ('lift' in spot ? spot.lift : 0);
      const same = from.x === next.x && from.y === next.y && from.size === next.size;
      if (same && lifted(from) === lifted(next)) return;
      const ease = 'power2.inOut';
      timeline.to(el, { x: next.x, y: next.y, duration: seconds, ease }, at);
      timeline.to(figure, { scale: next.size / 100, duration: seconds, ease }, at);
      if (!tag || !('tag' in next) || !('tag' in from)) return;
      timeline.call(() => label.replaceChildren(tag), [], at);
      timeline.fromTo(
        label,
        { scale: from.tag.size / next.tag.size },
        { y: labelY(next), scale: 1, duration: seconds, ease, immediateRender: false },
        at,
      );
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

/**
 * The shark: a fin that patrols, then speeds at the last one, dives, and
 * comes up as the whole shark with the last one riding it, celebrating, and
 * their name on its fin.
 */
function createShark(timeline: Timeline, show: Show, look: Look) {
  const parts = drawShark({ speedLines: !show.reducedMotion });
  parts.el.dataset.phase = 'circling';
  gsap.set(parts.fin, { x: PATROL.start, y: PATROL.y });
  if (parts.finLines) gsap.set(parts.finLines, { autoAlpha: 0 });
  gsap.set(parts.ride, { y: 360, autoAlpha: 0 });
  gsap.set(parts.front, { autoAlpha: 0 });

  const rider = parts.ride.appendChild(document.createElement('div'));
  rider.className = styles.rider;
  rider.dataset.part = 'rider';
  rider.dataset.rider = show.unlucky;
  rider.append(head(look, { mood: 'party', ring: false }).el);
  const finName = nameTag(show.unlucky, {
    size: stagePx('--size-stage-fin-name'),
    maxWidth: FIN_NAME_WIDTH,
  });
  finName.dataset.part = 'fin-name';
  finName.classList.add(styles.finName);
  parts.ride.append(finName);

  const phase = (name: string, time: number) =>
    timeline.call(() => void (parts.el.dataset.phase = name), [], time);

  return {
    el: parts.el,
    /**
     * The fin swims to and fro along the bottom until the shark's run at
     * `until`. Returns where it ends up.
     */
    patrol(until: number): number {
      const legs = Math.max(1, Math.round(until / PATROL.legSeconds));
      const seconds = until / legs;
      for (let leg = 0; leg < legs; leg++) {
        const left = leg % 2 === 0;
        // Drawn, the fin swims left.
        timeline.set(parts.finShape, { scaleX: left ? 1 : -1 }, leg * seconds);
        timeline.to(
          parts.fin,
          { x: left ? PATROL.left : PATROL.right, duration: seconds, ease: 'sine.inOut' },
          leg * seconds,
        );
      }
      return legs % 2 === 1 ? PATROL.left : PATROL.right;
    },
    /** From `from`, the fin speeds straight at `target`, dives, and the shark comes up for the ride. */
    goFor(
      target: Spot,
      from: number,
      times: { run: number; dive: number; still: number; ride: number; settled: number },
    ) {
      const fromLeft = from < target.x;
      phase('run', times.run);
      timeline.set(parts.finShape, { scaleX: fromLeft ? -1 : 1 }, times.run);
      timeline.to(
        parts.fin,
        {
          x: target.x + (fromLeft ? -100 : 100),
          duration: times.dive - times.run,
          ease: 'power2.in',
        },
        times.run,
      );
      if (parts.finLines) {
        timeline.set(parts.finLines, { autoAlpha: 1 }, times.run);
        timeline.set(parts.finLines, { autoAlpha: 0 }, times.dive);
      }

      phase('dive', times.dive);
      timeline.to(
        parts.fin,
        { y: '+=50', autoAlpha: 0, duration: times.still - times.dive, ease: 'power2.in' },
        times.dive,
      );
      phase('still', times.still);

      phase('ride', times.ride);
      timeline.set([parts.ride, parts.front], { autoAlpha: 1 }, times.ride);
      timeline.to(
        parts.ride,
        { y: 0, duration: times.settled - times.ride, ease: 'back.out(1.4)' },
        times.ride,
      );
      timeline.call(
        () => void scroller(parts.front, { width: 1280, speed: RIDE_SPEED }),
        [],
        times.ride,
      );
      // The rider bounces for joy; the name on the fin holds still.
      timeline.to(
        rider,
        { y: -16, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 3 },
        times.settled,
      );
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
    /** Who the rope heads for; nobody when `name` is empty. */
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
