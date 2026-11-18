// The director: builds the whole show as one timeline from the plan, beat by
// beat, and plays it on the show's clock. The stage tells its story in data
// attributes too: the scene's beat and rescue, who is in the water, who the
// rope is heading for, and what the helicopter and the shark are doing.

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
import { sharkBaitMusic } from './music';
import { helicopter, sea, shark as drawShark } from './parts';
import { BEATS, planShow, type Beat, type Rescue } from './plan';
import styles from './shark-bait.module.css';

/** Seconds for people to glide to their places. */
const ARRIVE = 0.4;
/** Seconds for the helicopter to come in to a rescue, from off stage or from where it waits. */
const APPROACH = 0.5;
/** Seconds for the rope to swing from one person to another. */
const SWING = 0.4;
/** Seconds from the hook coming down to the person leaving the water. */
const GRAB = 0.25;
/** Seconds for the rope to reel them up, as the helicopter climbs a little. */
const REEL = 0.3;
/** Seconds for the helicopter to fly them off the stage. */
const CARRY = 0.7;
/** How a lifted person hangs: the rope's length, and the least size of their name tag. */
const HANG = { rope: 80, tag: 30 };
/**
 * How the duel's rope swings: the seconds of each move to the next aim, and
 * how the rest of the beat is shared out as holds over each, the last one
 * the hang before the hook comes down. With more than two, the rope lingers
 * on the first, flicks back and forth, then slows; with two, each hold is
 * long enough to read the caption that goes with it. A feint comes out of
 * the time for holds.
 */
const DUEL = {
  many: { moves: [APPROACH, 0.3, 0.35, 0.5], holds: [2, 1, 1.2, 3] },
  manyOnce: { moves: [APPROACH, 0.5], holds: [1, 1.8] },
  manySlip: { moves: [APPROACH, 0.45], holds: [1, 2] },
  two: { moves: [APPROACH, 0.4, 0.45, 0.6], holds: [1, 1, 1.2, 2.5] },
  twoFeint: { moves: [APPROACH, 0.4, 0.45, 0.6], holds: [1, 1, 1, 1.6] },
  twoSlip: { moves: [APPROACH, 0.4, 0.45, 0.6], holds: [1.1, 1.1, 0.6, 1.4] },
};
/** A feint: how far towards the other one the helicopter gets, and the seconds out and back. */
const FEINT = { reach: 0.45, out: 0.3, back: 0.35 };
/** A slip: how far up the rope they get, and the seconds up and back down into the water. */
const SLIP = { reach: 0.4, up: 0.45, down: 0.45 };
/** How far the hook creeps down while the rope hangs over the one it lifts at 4 left and in a duel. */
const CREEP = 24;
/** Where the rope hangs from, low enough that the helicopter stays under the caption. */
const HOVER_Y = 218;
/** Where the helicopter waits while people splash in, and how small it is far away. */
const WAITING = { x: 1130, y: 185, scale: 0.6 };
/** Where the helicopter flies off to, by the side of the stage it's nearer, with the people it lifted. */
const OFF = { left: -320, right: 1600, y: -260 };
/** Seconds for the helicopter to leave at the start of the shark's run. */
const LEAVE = 0.9;
/**
 * The fin: when it surfaces, the line it patrols along, and the seconds it
 * takes to cross and how big it is, by how many are left in the water: it
 * crosses quicker and grows from 8 left down.
 */
const FIN = { up: 1.4, rise: 0.5, left: 200, right: 1080, y: 668, start: 640 };
const crossing = (left: number) => 1.2 + 0.2 * Math.min(left, 8);
const finSize = (left: number) => 1 + 0.075 * (8 - Math.min(left, 8));
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
  /** Every heartbeat, in show seconds: the music plays quieter under them. */
  const heartbeats: number[] = [];
  const heartbeat = (time: number) => (heartbeats.push(time), cue(time, 'heartbeat'));
  /** Each time people leave the water, and how many are left after. */
  const lifts: { time: number; left: number }[] = [];

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
  scene.dataset.rescue = '';

  const inWater = () => [...swimmers.values()].filter((swimmer) => !swimmer.lifted);

  /** Everyone still in the water but `aimed` looks worried, or scared if it's down to two. */
  const moods = (time: number, aimed: readonly string[]) => {
    for (const swimmer of inWater()) {
      const scared = swimmer.name === show.unlucky && inWater().length === 2;
      const mood: Mood = aimed.includes(swimmer.name) ? 'calm' : scared ? 'scared' : 'worried';
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

  // Splash-in: everyone pops up in the water, the helicopter waits far off,
  // and then a fin comes up.
  caption(0, 'Last one in the water gets the job');
  cue(0, 'splash');
  let stopRotor = () => {};
  at(0, () => (stopRotor = show.sound.play('rotor')));
  [...swimmers.values()].forEach((swimmer, index) => {
    timeline.add(popIn(swimmer.el), (index * 1.2) / swimmers.size);
  });
  shark.surface(FIN.up);
  caption(FIN.up, 'Is that a fin?');

  // The rescues, in the plan's order, each numbered on the stage as it starts.
  let time = starts.rescues;
  plan.rescues.forEach((rescue, index) => {
    const start = rescue.kind === 'quick' ? time : starts[BEAT_OF[rescue.kind]];
    at(start, () => void (scene.dataset.rescue = String(index + 1)));
    if (rescue.kind === 'quick') {
      const lifted = rescue.lifted.map((name) => swimmers.get(name)!);
      if (lifted.length === 1) rescueOne(rescue, start, rescue.seconds);
      else pair(lifted as [Swimmer, Swimmer], start, rescue.seconds);
      time += rescue.seconds;
      return;
    }
    // With 4, the hover opens the rescues; with more, the rescue that left 4 said so.
    if (rescue.kind === 'hover' && index === 0) caption(start, '4 left…');
    rescueOne(rescue, start, plan.beats[BEAT_OF[rescue.kind]]);
  });

  // The shark's run: the helicopter leaves with the last one it lifted, and
  // the fin speeds at the last one in the water.
  const last = swimmers.get(show.unlucky)!;
  const run = starts['sharks-run'];
  const ending = {
    run,
    dive: total - ENDING.dive,
    still: total - ENDING.still,
    ride: total - ENDING.ride,
    settled: total - ENDING.settled,
  };
  at(run, () => void (scene.dataset.rescue = ''));
  caption(run, 'Uh-oh…');
  last.mood('scared', run);
  chopper.phase('leaving', run);
  chopper.aim('', run);
  const rescued = plan.rescues.at(-1)!;
  flyOff(
    [swimmers.get(rescued.kind === 'quick' ? rescued.lifted[0]! : rescued.lifted)!],
    run,
    LEAVE,
  );
  chopper.phase('gone', run + LEAVE);
  at(run + LEAVE, () => stopRotor());
  const finX = shark.patrol(FIN.up + FIN.rise, run, lifts, show.names.length);
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

  // The music moves along with the show's time, as everything else does.
  const score = sharkBaitMusic({
    dive: ending.dive,
    heartbeats: heartbeats.sort((a, b) => a - b),
  });
  const music = show.sound.music(score.notes);
  timeline.eventCallback('onUpdate', () => {
    const { beat, speed } = score.at(timeline.time());
    music.to(beat, speed);
  });

  await show.play(timeline);

  /**
   * At `time` the hook comes down for `group`, who grab it and leave the
   * water; the rope reels them up to hang under the helicopter, named.
   * Returns when they hang.
   */
  function hookUp(group: readonly Swimmer[], time: number): number {
    const hook = Math.max(...group.map((swimmer) => hookDown(swimmer.place)));
    chopper.lower(hook - HOVER_Y, time, GRAB);
    const out = time + GRAB;
    for (const swimmer of group) swimmer.leave(out);
    cue(out, 'whoosh');
    lifts.push({ time: out, left: inWater().length });
    settle(out);

    // The name goes on the side towards the middle, away from where they'll fly off to.
    const side = chopper.x < STAGE.width / 2 ? 1 : -1;
    const y = chopper.y;
    chopper.lower(HANG.rope, out, REEL);
    const size = group.length > 1 ? HANGING_SIZE.pair : HANGING_SIZE.alone;
    group.forEach((swimmer, index) => {
      // The first holds the hook between raised hands; the second holds on below.
      const hands = y + HANG.rope + HANDS * size + index * 0.75 * size;
      swimmer.hang({ x: chopper.x, y: hands, size }, out, REEL, side);
    });
    return out + REEL;
  }

  /** From `time`, the helicopter flies `group` off the stage, by the side it's nearer. */
  function flyOff(group: readonly Swimmer[], time: number, seconds = CARRY) {
    const to = { x: chopper.x < STAGE.width / 2 ? OFF.left : OFF.right, y: OFF.y };
    const by = { x: to.x - chopper.x, y: to.y - chopper.y };
    chopper.flyTo(to, time, seconds, 'power1.in');
    for (const swimmer of group) swimmer.carry(by, time, seconds);
  }

  /**
   * Two who float side by side, in `seconds`: the helicopter comes in over
   * them, they swim together under the hook, grab it, and off they go.
   */
  function pair(two: readonly [Swimmer, Swimmer], start: number, seconds: number) {
    const [a, b] = [...two].sort((one, other) => one.place.x - other.place.x) as [Swimmer, Swimmer];
    const x = clamp((a.place.x + b.place.x) / 2);
    const y = Math.max(a.place.y, b.place.y);
    const gap = (a.place.size + b.place.size) / 4 + 6;
    chopper.aim('', start);
    chopper.phase('hovering', start);
    moods(start, [a.name, b.name]);
    chopper.flyTo({ x, y: HOVER_Y, scale: 1 }, start, APPROACH, 'power2.out');
    a.glide({ ...a.place, x: x - gap, y }, start, APPROACH);
    b.glide({ ...b.place, x: x + gap, y }, start, APPROACH);
    chopper.lower(Math.min(hookAbove(a.place), hookAbove(b.place)) - HOVER_Y, start, APPROACH);
    const hold = seconds - APPROACH - GRAB - REEL - CARRY;
    chopper.wobble(start + APPROACH, hold);
    const hung = hookUp([a, b], start + APPROACH + hold);
    whoosh(hung - REEL);
    flyOff([a, b], hung);
  }

  /**
   * One at a time: the rope heads for each of the rescue's aims in turn, then
   * lifts one, and, but for the duel's, flies them off. The rest of the
   * rescue's `seconds` is spread as holds over the aims it swings away from;
   * over the last one, the lift is its hold. A duel has its own pace, and
   * hangs over the last one too, as the rope does at 4 left.
   */
  function rescueOne(
    rescue: Exclude<Rescue, { kind: 'quick' }> | { kind: 'quick'; lifted: readonly string[] },
    start: number,
    seconds: number,
  ) {
    const aims = rescue.kind === 'quick' ? rescue.lifted : AIMS[rescue.kind](rescue as never);
    const feint = rescue.kind === 'duel' ? rescue.feint : null;
    const slip = rescue.kind === 'duel' ? rescue.slip : null;
    const pace =
      rescue.kind === 'duel' ? DUEL[duelPace(show.names.length === 2, aims, feint, slip)] : null;
    const two = pace === DUEL.two || pace === DUEL.twoFeint || pace === DUEL.twoSlip;
    const moves = pace?.moves ?? aims.map((_, index) => (index === 0 ? APPROACH : SWING));
    const shares =
      pace?.holds ?? aims.map((_, index) => (aims.length === 1 || index < aims.length - 1 ? 1 : 0));
    const feinting = feint === null ? 0 : FEINT.out + FEINT.back;
    const slipping = slip === null ? 0 : GRAB + SLIP.up + SLIP.down;
    const lift = GRAB + REEL + (rescue.kind === 'duel' ? 0 : CARRY);
    const spare = seconds - sum(moves) - feinting - slipping - lift;
    const holds = shares.map((share) => (spare * share) / sum(shares));

    let time = start;
    aims.forEach((name, index) => {
      const target = swimmers.get(name)!;
      const seconds = moves[index]!;
      const last = index === aims.length - 1;
      chopper.aim(name, time);
      moods(time, [name]);
      chopper.phase('hovering', time);
      if (rescue.kind === 'duel') heartbeat(time);
      if (two && (slip === null || index <= slip)) {
        // With two people, the caption follows the rope: "Marco… Giulia… Marco… Giulia!"
        caption(time, aims.slice(0, index + 1).join('… ') + (last ? '!' : '…'));
      } else if (pace) {
        if (index === 0) caption(time, `${aims[0]} or ${aims[1]}?`);
      } else if (index === 1) {
        caption(time, `It's going for ${aims[0]}… nope, ${name}!`);
      } else if (index === 2) {
        caption(time, `…${name} after all!`);
      }
      if (index > 0) chopper.swing(target.place.x, time, seconds);
      chopper.flyTo({ x: target.place.x, y: HOVER_Y, scale: 1 }, time, seconds, 'power2.inOut');
      chopper.lower(hookAbove(target.place) - HOVER_Y, time, seconds);
      time += seconds;
      const hold =
        holds[index]! + (index === feint ? feinting : 0) + (index === slip ? slipping : 0);
      // A feint swings the rope itself, so it doesn't sway as well.
      if (aims.length === 1 || (pace && last && index !== feint)) chopper.wobble(time, hold);
      // At 4 left and in a duel, the hook creeps down over the one it lifts.
      if ((pace || rescue.kind === 'hover') && last) {
        chopper.lower(hookAbove(target.place) - HOVER_Y + CREEP, time, hold, 'sine.inOut');
      }
      if (index === feint) {
        // Halfway through the hold, it sets off for the other one, and thinks better of it.
        const other = swimmers.get(aims.find((each) => each !== name)!)!;
        const out = time + holds[index]! / 2;
        const back = out + FEINT.out;
        const halfway = target.place.x + FEINT.reach * (other.place.x - target.place.x);
        moods(out, [other.name]);
        heartbeat(out);
        chopper.swing(halfway, out, FEINT.out);
        chopper.flyTo({ x: halfway, y: HOVER_Y }, out, FEINT.out, 'power2.out');
        moods(back, [name]);
        chopper.swing(target.place.x, back, FEINT.back);
        chopper.flyTo({ x: target.place.x, y: HOVER_Y }, back, FEINT.back, 'power2.inOut');
      }
      if (index === slip) {
        // Halfway through the hold, the hook catches them, and they slip off.
        const grab = time + holds[index]! / 2;
        const fall = grab + GRAB + SLIP.up;
        chopper.lower(hookDown(target.place) - HOVER_Y, grab, GRAB);
        target.slip(grab + GRAB, chopper);
        cue(grab + GRAB, 'whoosh');
        caption(fall, `Whoops! ${name} slipped!`);
        chopper.lower(hookAbove(target.place) - HOVER_Y, fall, SLIP.down);
        cue(fall + SLIP.down, 'splash');
      }
      time += hold;
    });
    const lifted = swimmers.get(rescue.kind === 'quick' ? aims[0]! : rescue.lifted)!;
    const hung = hookUp([lifted], time);
    if (rescue.kind === 'quick') whoosh(time + GRAB);
    if (rescue.kind !== 'duel') flyOff([lifted], hung);
  }

  /** As a quick rescue lifts people out, the caption says how many are left. */
  function whoosh(time: number) {
    const left = inWater().length;
    caption(time, left === 4 ? '4 left…' : `Whoosh! ${left} left`);
  }
}

type Swimmer = ReturnType<typeof createSwimmer>;

const BEAT_OF = { hover: 'four-left', 'fake-out': 'fake-out', duel: 'duel' } as const;

/** Who the rope heads for, in order, in each kind of slow rescue. */
const AIMS: {
  [Kind in keyof typeof BEAT_OF]: (rescue: Extract<Rescue, { kind: Kind }>) => readonly string[];
} = {
  hover: ({ lifted }) => [lifted],
  'fake-out': ({ decoy, via, lifted }) => (via ? [lifted, via, lifted] : [decoy, lifted]),
  duel: ({ aims }) => aims,
};

/** Which of the duel's paces fits its shape. */
function duelPace(
  pair: boolean,
  aims: readonly string[],
  feint: number | null,
  slip: number | null,
): keyof typeof DUEL {
  if (pair) return slip !== null ? 'twoSlip' : feint !== null ? 'twoFeint' : 'two';
  if (slip !== null) return 'manySlip';
  return aims.length === 2 ? 'manyOnce' : 'many';
}

const sum = (seconds: readonly number[]) => seconds.reduce((total, each) => total + each, 0);

/** Keeps the helicopter's rope where the whole helicopter is on stage. */
const clamp = (x: number) => Math.min(1100, Math.max(180, x));

/** Where the hook waits above someone: just over their name tag. */
const hookAbove = (place: Place) => labelY(place) + place.y - 1.1 * place.tag.size - 40;

/** Where the hook comes down to, to catch someone. */
const hookDown = (place: Place) => place.y - 0.68 * place.size - 10;

/** How far below their raised hands a person's swim ring sits, in heads. */
const HANDS = 0.68;

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
  label.dataset.part = 'label';
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
    /** Grabs the rope and leaves the water: happy, with no swim ring. */
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
    },
    /**
     * Reeled up to hang at `spot` by their raised hands, smaller, with their
     * name tag beside their face on `side`, at least HANG.tag big.
     */
    hang(spot: Spot, at: number, seconds: number, side: number) {
      const tagSize = 'tag' in current ? current.tag.size : HANG.tag;
      current = spot;
      const ease = 'power2.out';
      const scale = spot.size / 100;
      // On the rope, in front of everyone still in the water.
      timeline.set(el, { zIndex: 1 }, at);
      timeline.to(el, { x: spot.x, y: spot.y, duration: seconds, ease }, at);
      timeline.to(figure, { scale, duration: seconds, ease }, at);
      timeline.to(
        label,
        {
          // Beside the face: its middle is 0.36 heads above the ring, and it's 0.29 heads across.
          x: side * (0.29 * spot.size + 14),
          y: -0.36 * spot.size,
          scale: Math.max(1, HANG.tag / tagSize),
          '--side': side,
          '--drop': 1,
          duration: seconds,
          ease,
        },
        at,
      );
    },
    /** Carried `by` so far with the helicopter, then out of sight. */
    carry(by: { x: number; y: number }, at: number, seconds: number) {
      timeline.to(el, { x: `+=${by.x}`, y: `+=${by.y}`, duration: seconds, ease: 'power1.in' }, at);
      timeline.set(el, { autoAlpha: 0 }, at + seconds);
    },
    /** Pulled partway up the rope, then slips off and falls back into the water. */
    slip(at: number, chopper: Helicopter) {
      const climb = SLIP.reach * (chopper.length - 40);
      const fall = at + SLIP.up;
      timeline.call(
        () => {
          el.dataset.slip = 'true';
          face.setMood('happy');
          face.setRing(false);
        },
        [],
        at,
      );
      timeline.to(el, { y: `-=${climb}`, duration: SLIP.up, ease: 'power2.out' }, at);
      chopper.lower(chopper.length - climb, at, SLIP.up);
      timeline.call(() => face.setMood('scared'), [], fall);
      timeline.to(el, { y: current.y, duration: SLIP.down, ease: 'power2.in' }, fall);
      timeline.call(
        () => {
          el.dataset.slip = 'false';
          face.setRing(true);
        },
        [],
        fall + SLIP.down,
      );
    },
  };
}

/**
 * The shark: a fin that surfaces and patrols, then speeds at the last one,
 * dives, and comes up as the whole shark with the last one riding it,
 * celebrating, and their name on its fin.
 */
function createShark(timeline: Timeline, show: Show, look: Look) {
  const parts = drawShark({ speedLines: !show.reducedMotion });
  parts.el.dataset.phase = 'under';
  gsap.set(parts.fin, { x: FIN.start, y: FIN.y + 60, autoAlpha: 0 });
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
    wrapBelow: stagePx('--size-stage-tag-duel'),
  });
  finName.dataset.part = 'fin-name';
  finName.classList.add(styles.finName);
  parts.ride.append(finName);

  const phase = (name: string, time: number) =>
    timeline.call(() => void (parts.el.dataset.phase = name), [], time);

  return {
    el: parts.el,
    /** At `time`, the fin comes up out of the water. */
    surface(time: number) {
      phase('circling', time);
      timeline.to(
        parts.fin,
        { y: FIN.y, autoAlpha: 1, duration: FIN.rise, ease: 'power2.out' },
        time,
      );
    },
    /**
     * The fin swims to and fro along the bottom from `from` until the shark's
     * run at `until`; each time people leave the water it grows, and crosses
     * quicker. Returns where it ends up.
     */
    patrol(
      from: number,
      until: number,
      lifts: readonly { time: number; left: number }[],
      count: number,
    ): number {
      const stops = [
        { time: from, left: count },
        ...lifts.filter((lift) => lift.time > from && lift.time < until),
      ];
      let left = true;
      stops.forEach((stop, index) => {
        const end = stops[index + 1]?.time ?? until;
        timeline.to(
          parts.fin,
          { scale: finSize(stop.left), duration: index === 0 ? 0 : ARRIVE, ease: 'power2.out' },
          stop.time,
        );
        const legs = Math.max(1, Math.round((end - stop.time) / crossing(stop.left)));
        const seconds = (end - stop.time) / legs;
        for (let leg = 0; leg < legs; leg++, left = !left) {
          const time = stop.time + leg * seconds;
          // Drawn, the fin swims left.
          timeline.set(parts.finShape, { scaleX: left ? 1 : -1 }, time);
          timeline.to(
            parts.fin,
            { x: left ? FIN.left : FIN.right, duration: seconds, ease: 'sine.inOut' },
            time,
          );
        }
      });
      return left ? FIN.right : FIN.left;
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
    /** Where the helicopter is, and how long its rope, once every move added so far has played. */
    get x() {
      return at.x;
    },
    get y() {
      return at.y;
    },
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
