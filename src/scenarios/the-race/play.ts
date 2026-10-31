// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where every racer is, how they feel, what they say
// and what their mount or creature does follow from the show's time each
// frame, so every frame follows from the plan alone. Gaits bob outside the
// timeline, on the show's clock, so their endless repeats don't keep the show
// going. Off the sports field, one event is the track's own, and brings its
// props instead of what the racer's mount or creature does. The stage tells its story in data attributes too: the part of the
// race, the camera, whether it is slow, and each racer's nose, gait and stop.

import { gsap } from 'gsap';
import {
  bob,
  bubble,
  handOutLooks,
  nameTag,
  type Box,
  type Cue,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import { creature, CREATURE_SPEC, FLAIL, REACH, TENTACLES, type CreatureRunner } from './creature';
import { boxAt, bubbleOffsets, faceAt, lane, tagAt, tagBox, tagSize, type Lane } from './layout';
import {
  isCreature,
  group,
  RACER,
  THINGS,
  photoCard,
  PHOTO,
  RACER_COLOURS,
  racer,
  show as showPart,
  track,
  TRACK_PROPS,
  type Creature,
  type Kind,
  type Pose,
  type Racer,
  type RacerLook,
  type RideLook,
  type Runner,
} from './parts';
import {
  BEATS,
  BURST,
  CAMERA,
  cameraAt,
  FINISH,
  LENGTH,
  noseAt,
  planShow,
  START,
  STOP,
  stopping,
  type Course,
  type Plan,
  type RaceEvent,
  type Reach,
} from './plan';
import styles from './the-race.module.css';

const FALLBACK: RacerLook = { mount: 'snail', colour: 'tomato', extra: 'number' };

/** What each mount or creature does when it bursts ahead, and when it stops. */
const BURSTS: Record<Kind, string> = {
  snail: 'finds a turbo',
  duck: 'rolls downhill',
  chair: 'catches a gust',
  caterpillar: 'goes full wiggle',
  hopper: 'finds its bounce',
  ostrich: 'stretches its legs',
  rocket: 'fires its boosters',
  sandwich: 'gets extra spicy',
  zombie: 'gets a second wind',
  robot: 'switches to turbo',
  shark: 'finds its sea legs',
  astronaut: 'fires the jetpack',
  monster: 'gets the zoomies',
  villain: 'takes a shortcut',
  alien: 'gets beamed ahead',
  dinosaur: 'stomps ahead',
  mug: 'has a caffeine rush',
  printer: 'prints at full speed',
  sticky: 'catches a draft',
  banana: 'slips on its own peel',
  icecream: 'gets a sugar rush',
  sushi: 'rides the conveyor belt',
  cat: 'chases a laser dot',
  octopus: 'uses all eight legs',
  penguin: 'belly-slides',
  pigeon: 'spots a chip',
  ghost: 'gets spooked',
  mummy: 'unrolls downhill',
  yeti: 'skis ahead',
  gnome: 'sneaks ahead',
};
const STOPS: Record<Kind, string> = {
  snail: 'stops for a snack',
  duck: 'hits a pebble',
  chair: 'spins round',
  caterpillar: 'dozes off',
  hopper: 'bounces on the spot',
  ostrich: 'lays an egg',
  rocket: 'runs out of fuel',
  sandwich: 'drops its pickle',
  zombie: 'loses a shoe',
  robot: 'needs a reboot',
  shark: 'stops to tie its laces',
  astronaut: 'plants a flag',
  monster: 'gets the hiccups',
  villain: 'gets tangled in its cape',
  alien: 'stops to ask the way',
  dinosaur: "can't reach its snack",
  mug: 'needs a refill',
  printer: 'has a paper jam',
  sticky: 'sticks to the floor',
  banana: 'does the splits',
  icecream: 'starts to melt',
  sushi: 'gets too much wasabi',
  cat: 'sits in a box',
  octopus: 'ties its legs in a knot',
  penguin: 'drops its fish',
  pigeon: 'puffs up its chest',
  ghost: 'trips on its sheet',
  mummy: 'comes unwrapped',
  yeti: 'makes a snow angel',
  gnome: 'freezes like a statue',
};
/** What the commentator calls a racer, where it isn't its kind's name. */
const CALLED: Partial<Record<Kind, string>> = {
  mug: 'coffee mug',
  sticky: 'sticky note',
  icecream: 'ice cream',
};

/** What each track does to someone in its own burst and stop. */
const TRACK_EVENTS: Record<Exclude<Course, 'field'>, Record<RaceEvent['kind'], string>> = {
  office: { burst: 'slides on a wet floor', stop: 'stops at the coffee machine' },
  sea: { burst: 'catches a current', stop: 'gets tangled in seaweed' },
  moon: { burst: 'does a moon bounce', stop: 'floats off the ground' },
};

/** Each mount's or creature's gait: how far it bobs, in stage pixels, and how often. */
const GAITS: Record<Kind, { px: number; seconds: number }> = {
  snail: { px: 3, seconds: 1.1 },
  duck: { px: 4, seconds: 0.42 },
  chair: { px: 3, seconds: 0.3 },
  caterpillar: { px: 7, seconds: 0.7 },
  hopper: { px: 10, seconds: 0.5 },
  ostrich: { px: 5, seconds: 0.32 },
  rocket: { px: 2, seconds: 0.2 },
  sandwich: { px: 4, seconds: 0.36 },
  zombie: { px: 3, seconds: 0.5 },
  robot: { px: 2, seconds: 0.24 },
  shark: { px: 4, seconds: 0.32 },
  astronaut: { px: 6, seconds: 0.5 },
  monster: { px: 5, seconds: 0.34 },
  villain: { px: 3, seconds: 0.3 },
  alien: { px: 3, seconds: 0.28 },
  dinosaur: { px: 6, seconds: 0.44 },
  mug: { px: 4, seconds: 0.34 },
  printer: { px: 3, seconds: 0.3 },
  sticky: { px: 5, seconds: 0.3 },
  banana: { px: 4, seconds: 0.36 },
  icecream: { px: 4, seconds: 0.38 },
  sushi: { px: 3, seconds: 0.28 },
  cat: { px: 4, seconds: 0.3 },
  octopus: { px: 5, seconds: 0.4 },
  penguin: { px: 4, seconds: 0.26 },
  pigeon: { px: 3, seconds: 0.24 },
  ghost: { px: 6, seconds: 0.5 },
  mummy: { px: 3, seconds: 0.46 },
  yeti: { px: 6, seconds: 0.44 },
  gnome: { px: 3, seconds: 0.3 },
};

/** `look` drawn: a rider on its mount, or a creature. */
function drawRacer(look: RacerLook, face: Look, number: number): Runner {
  return isCreature(look.mount)
    ? creature(look as RacerLook & { mount: Creature }, { face, number })
    : racer(look as RideLook, { face, number });
}

/** How far `look`'s drawing reaches past its nose on its grid: a ride reaches its nose. */
const reachOf = (look: RacerLook): Reach =>
  isCreature(look.mount) ? REACH[look.mount] : { least: 0, most: 0 };

/** A track's prop drawn on a racer, hidden until its event shows it. */
function propOn(el: SVGElement, prop: 'cup' | 'seaweed' | 'swirls'): SVGGElement {
  const g = group(el, prop, TRACK_PROPS[prop]);
  showPart(g, false);
  return g;
}

/** A duck that hits a pebble tips up by `degrees` and back over `seconds`, about its back wheel. */
const TIP = { degrees: -24, seconds: 1, origin: '74px 183px' };
/** A chair spins round twice over `seconds`, about its stem. */
const SPIN = { turns: 2, seconds: 1.2, origin: '112px 0' };
/** A hopper bounds this high, in drawing pixels, this many times in a burst, and lower on the spot in a stop. */
const BOUNCE = { burst: { px: 44, count: 3 }, stop: { px: 28, count: 5 } };
/** An ostrich's legs swing this wide from its hips, this many times in a burst. */
const STRIDE = { wide: 1.7, count: 3, hip: 111 };
/**
 * A rocket's flame flickers by `flicker` while it races, grows `burst` times
 * as long in a burst, from its tail at x `tail`, and goes out in a stop in a
 * puff of smoke that is up for `smoke` seconds, growing as it drifts back
 * from the tail.
 */
const FLAME = {
  flicker: 0.15,
  rate: 30,
  burst: 2,
  tail: 38,
  smoke: 1.2,
  from: [24, 134],
  to: [4, 128],
};
/** An egg drops from under the ostrich's tail `drop` s into a stop, over `fall` s; it looks back from `look` s. */
const LAY = { drop: 0.2, fall: 0.3, from: [30, 100], to: [10, 142], look: 0.5 };
/** Steam rises this far over a burst. */
const STEAM = { rise: 30 };
/** A pickle drops out `drop` s into a stop, over `fall` s, to the ground in front, and is picked up at "Phew!". */
const DROP = { drop: 0.1, fall: 0.35, from: [184, 134], to: [222, 180] };
/**
 * A track's own burst shows for `burst` s, past the burst itself, so the
 * moon bounce is one long hop; it skids `skid` degrees on a wet floor. A
 * stop holds a cup from `cup` s in, by the face; seaweed wraps round until
 * "Phew!", shaken for the last `shake` s; on the Moon a racer floats and
 * hops over its shadow, up to `rise` stage px, as long as its face and tag
 * stay `clear` px from every tag and face in the lanes behind, tilting up
 * to `drift` degrees nose up.
 */
const OWN = { burst: 1.4, skid: -10, drift: -8, cup: 0.3, shake: 0.4, rise: 70, clear: 4 };
/**
 * Where the cup, the seaweed and the swirls sit on a racer's grid, and how
 * big: the swirls over its back, clear of the tags and the lane in front.
 */
const HELD = { cup: [28, 52, 0.95], seaweed: [20, 70, 1.25], swirls: [-50, -150, 1.3] } as const;
/** The coffee machine stands this far behind the face of whoever stops at it. */
const MACHINE = 120;
/** The wet-floor sign, this many times its racer's scale. */
const WET_FLOOR = 1.3;
/** A bubble pops in over this many seconds. */
const POP = 0.25;
/** Seconds between the moments a bubble is checked clear of the faces and tags round it. */
const SAMPLE = 0.1;
/** Noses moving at least this fast along the track trail speed lines. */
const SPEEDY = 150;
/** The stage flashes once for this long as a photo finish freezes. */
const FLASH = 0.25;
/** The photo pops up this long after the freeze. */
const PHOTO_AFTER = 0.3;
/** In the photo, all of the unlucky racer is this far over the line. */
const AHEAD = 16;
/** Confetti at the win: how many pieces, falling at least this fast to where they settle. */
const CONFETTI = { count: 26, fall: 520 };
/**
 * A zombie's front shoe flies back from its foot over `fly` s, and it hops
 * back for it, this high and this many times, until "Phew!".
 */
const SHOE = { fly: 0.5, from: [176, 186], to: [40, 182], hop: 14, count: 3 };
/** A robot's screen is blank for this long into its stop. */
const REBOOT = 1.1;
/** A shark bends this far over its sneaker, from `from` s into its stop until "Phew!". */
const LACES = { degrees: 28, from: 0.2 };
/** An astronaut plants its flag `at` s into its stop, by its front foot, and leaves it there. */
const PLANT = { at: 0.3, foot: [200, 186] };
/** A monster hiccups at these seconds into its stop, hopping this high for this long. */
const HICCUPS = { at: [0.2, 0.7, 1.2], px: 16, seconds: 0.3 };
/** A villain's cape wraps round it for `seconds`, while it turns round once to get free. */
const CAPE = { seconds: 1.2, turns: 1 };
/** The alien's question mark pops up this long into its stop. */
const ASK = 0.2;
/** Steam puffs out of a thing's top, rising this far over a burst, and over and over in a stop. */
const JET = { rise: 24, loop: 0.6 };
/** A mug tips forward this far from `from` s into its stop, to peer inside, empty of steam, until "Phew!". */
const REFILL = { degrees: 26, from: 0.15 };
/** Paper flies back this far behind a printer over its burst. */
const PAPER = { to: [-60, 12] };
/** A jammed printer's red light blinks this many times a second, from `from` s into its stop. */
const BLINK = { rate: 3, from: 0.2 };
/** A sticky note flutters this far either way, this many times a second, in its burst. */
const FLUTTER = { degrees: 8, rate: 4 };
/** A stuck sticky note tugs back this far, this many times, from `from` s into its stop. */
const TUG = { degrees: -12, count: 3, from: 0.2 };
/** A banana skids on its peel, tilted back this far at most. */
const SKID = -10;
/**
 * A banana slides into the splits from `from` s into its stop over `into` s,
 * each leg swung this far from its hip and the banana this far lower, and
 * springs back up this high after "Phew!".
 */
const SPLITS = { degrees: 62, down: 20, from: 0.1, into: 0.3, spring: 14 };
/** Sprinkles fly back this far off the scoop over a burst. */
const SPRINKLE = { to: [-56, -16] };
/**
 * An ice cream melts: its drips hang from the scoop at y `top`, growing to
 * `long` times their length by `peak` s into its stop and back by "Phew!";
 * its puddle spreads at (x, y) as they grow.
 */
const MELT = { top: 88, long: 2, peak: 0.9, puddle: [168, 189] };
/** A conveyor belt slides in from this far behind over `slide` s of a burst. */
const BELT = { from: -220, slide: 0.3 };
/** Wasabi drops from this far above onto the sushi's fish at (x, y) over `fall` s; then its eyes water. */
const WASABI = { from: -70, at: [150, 34], fall: 0.3 };
/** The animals and spooky creatures that tilt from their feet, as the things on legs do. */
const CRITTERS: readonly Creature[] = [
  'cat',
  'octopus',
  'penguin',
  'pigeon',
  'ghost',
  'mummy',
  'yeti',
  'gnome',
];
/** Where each of the octopus's hanging tentacles starts, to whirl about. */
const TENTACLES_FROM = TENTACLES.map((d) => d.slice(1).split(' ').slice(0, 2).map(Number));
/** A laser dot zips along the ground from `from` to `to` ahead of a cat, wobbling this far this often; the cat crouches this far. */
const LASER = { from: [214, 188], to: [262, 188], wobble: 14, rate: 4, crouch: 12 };
/** A cat sits in its box from `from` s into its stop until "Phew!". */
const BOXED = 0.15;
/** An octopus's tentacles whirl this far either way, this many times a second. */
const WHIRL = { degrees: 30, rate: 4 };
/** An octopus's legs are knotted from `from` s into its stop until `to`, then whirl free until "Phew!". */
const KNOT = { from: 0.15, to: 1.1 };
/** A penguin drops onto its belly this far over `drop` s, and gets up over the burst's last `drop` s. */
const BELLY = { degrees: 80, drop: 0.15 };
/**
 * A penguin's fish falls from its flipper at `from` to the ground at `to`
 * over `fall` s; it bends this far for it from `reach` s until it picks it
 * up at `picked`.
 */
const FISH = { from: [190, 104], to: [210, 182], fall: 0.35, reach: 0.4, degrees: 30, picked: 1.3 };
/** A chip lies on the ground from `from` to `to` as a pigeon dashes up to it, its head bobbing this far this often. */
const CHIP = { from: [262, 188], to: [214, 188], bob: 6, rate: 3.5 };
/** A pigeon puffs up its chest from `from` s into its stop, strutting this far either way this often. */
const STRUT = { from: 0.1, degrees: 5, rate: 2.5 };
/** A ghost jumps this high over the first `seconds` of its burst, and its sheet flaps this far this often. */
const SPOOKED = { px: 36, seconds: 0.45, flap: 6, rate: 4.5 };
/** A ghost trips forward this far from `from` s into its stop, over `fall` s, lies until `up`, and is up by "Phew!". */
const TRIP = { degrees: 60, from: 0.1, fall: 0.25, up: 1.1 };
/** A gnome sneaks along bent this far, in this many long, low steps of this height. */
const SNEAK = { degrees: 14, steps: 2, px: 8 };
/** A gnome stands still on a plinth this high from `from` s into its stop until "Phew!". */
const STATUE = { px: 20, from: 0.1 };
/** A mummy spins this many times about its middle over its burst. */
const ROLL = { turns: 2, middle: [130, 100] };
/**
 * A mummy's bandage unrolls from `from` s into its stop over `out` s, then
 * winds back on from `wind` s, the mummy turning once, until "Phew!".
 */
const UNWRAP = { from: 0.1, out: 0.5, wind: 0.9 };
/** A yeti glides on skis, crouched this far. */
const GLIDE = 10;
/**
 * A yeti lies back in the snow from `from` s into its stop over `fall` s,
 * sweeps its arms this far and its legs `legs` far, `rate` times a second,
 * and is up by "Phew!" after `up`.
 */
const ANGEL = { from: 0.1, fall: 0.25, arms: 40, legs: 18, rate: 1.5, up: 1.35 };

/** What each element was last given, so a frame writes only what changed: jsdom parses each style. */
const written = new WeakMap<Element, Map<string, string>>();

/** Sets style property `key` on `el`, or the attribute after an "@", unless it already has `value`. */
function write(el: HTMLElement | SVGElement, key: string, value: string) {
  let last = written.get(el);
  if (!last) written.set(el, (last = new Map()));
  if (last.get(key) === value) return;
  last.set(key, value);
  if (key.startsWith('@')) el.setAttribute(key.slice(1), value);
  else el.style.setProperty(key, value);
}

/** Shows or hides `el`, writing only on a change. */
const reveal = (el: HTMLElement, on: boolean) => {
  if (el.hidden === on) el.hidden = !on;
};

/** What someone says, and while it's up. */
interface Saying {
  readonly name: string;
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

interface Rider {
  readonly name: string;
  readonly index: number;
  readonly look: RacerLook;
  readonly at: Lane;
  readonly holder: HTMLElement;
  readonly drawn: Runner;
  /** The same drawing, as a rider on a mount or as a creature. */
  readonly ridden: Racer | null;
  readonly creature: CreatureRunner | null;
  readonly tag: HTMLElement;
  readonly speed: SVGPathElement;
  readonly gait: gsap.core.Animation;
  /** The rocket's flame, the ostrich's legs and its head, where the mount has them. */
  readonly flame: SVGElement[];
  readonly legs: SVGElement[];
  readonly head: SVGElement[];
  /** What the track's own event brings to this racer: a cup, seaweed, swirls, a shadow. */
  readonly own: {
    cup?: SVGGElement;
    seaweed?: SVGGElement;
    swirls?: SVGGElement;
    shadow?: HTMLElement;
  };
  state: { mood: Mood; pose: Pose; sweat: boolean } | null;
}

/** The caption for an event, as the commentator says it: the track's own names only the racer. */
export function eventCaption(event: RaceEvent, kind: Kind, course: Course = 'field'): string {
  if (event.cause === 'track' && course !== 'field') {
    return `${event.subject} ${TRACK_EVENTS[course][event.kind]}!`;
  }
  const did = event.kind === 'burst' ? BURSTS[kind] : STOPS[kind];
  return `${event.subject}'s ${CALLED[kind] ?? kind} ${did}!`;
}

/**
 * What gets said when: "Nooo!" in a burst and in a surge; "Zzz…" from a
 * dozing caterpillar, "Hic!" from a monster, and "Phew!" in any stop, and
 * from the rival who brakes.
 */
function sayings(plan: Plan, unlucky: string, mountOf: (name: string) => Kind): Saying[] {
  const { slow, finish, win } = plan.times;
  const ending: Saying[] =
    plan.ending === 'brake'
      ? [{ name: plan.rival, text: 'Phew!', from: slow + 0.4, to: win }]
      : plan.ending === 'surge'
        ? [{ name: unlucky, text: 'Nooo!', from: slow + 0.1, to: finish + 0.3 }]
        : [];
  const events = plan.events.flatMap((event): Saying[] => {
    const { subject: name, at } = event;
    if (event.kind === 'burst') return [{ name, text: 'Nooo!', from: at + 0.1, to: at + 1.4 }];
    // A track's stop brings no snoring or hiccups.
    const kind = event.cause === 'racer' ? mountOf(name) : null;
    return [
      ...(kind === 'caterpillar'
        ? [{ name, text: 'Zzz…', from: at + 0.3, to: at + STOP.phew - 0.1 }]
        : []),
      ...(kind === 'monster'
        ? HICCUPS.at.map((hic) => ({ name, text: 'Hic!', from: at + hic, to: at + hic + 0.4 }))
        : []),
      { name, text: 'Phew!', from: at + STOP.phew, to: at + STOP.phew + 1.1 },
    ];
  });
  return [...events, ...ending];
}

export async function playTheRace(show: Show): Promise<void> {
  const count = show.names.length;
  const lookOf = (name: string) => (show.looks.get(name) as RacerLook | undefined) ?? FALLBACK;
  // Each racer's reach in stage px, in its lane.
  const plan = planShow(show.names, show.unlucky, show.random, (name) => {
    const { k } = lane(show.names.indexOf(name), count);
    const { least, most } = reachOf(lookOf(name));
    return { least: least * k, most: most * k };
  });
  const faces = handOutLooks(show.names, show.random);
  const { times } = plan;

  const scene = show.stage.appendChild(document.createElement('div'));
  scene.className = styles.scene!;
  const { course } = plan;
  const own = plan.events.find((event) => event.cause === 'track') ?? null;
  const field = track({
    lanes: show.names.map((_, index) => lane(index, count).top),
    start: START.line,
    finish: FINISH + cameraAt(plan, times.finish),
    course: plan.course,
  });
  scene.append(field.el);
  // What stands on the track for its own event: the coffee machine, the wet-floor sign.
  const props = scene.appendChild(document.createElement('div'));
  props.className = styles.layer!;
  const stands = props.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  stands.setAttribute('class', `${styles.full} ${styles.drawing}`);
  stands.setAttribute('viewBox', '0 0 1280 720');
  stands.setAttribute('aria-hidden', 'true');
  const trails = scene.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  trails.setAttribute('class', `${styles.full} ${styles.drawing}`);
  trails.setAttribute('viewBox', '0 0 1280 720');
  trails.setAttribute('aria-hidden', 'true');
  trails.dataset.part = 'speed-lines';
  const confetti = Array.from({ length: CONFETTI.count }, (_, j) => {
    const piece = scene.appendChild(document.createElement('span'));
    piece.className = styles.confetti!;
    piece.dataset.part = 'confetti';
    piece.style.setProperty(
      '--confetti',
      `var(--color-${RACER_COLOURS[j % RACER_COLOURS.length]})`,
    );
    piece.style.rotate = `${((j * 37) % 90) - 45}deg`;
    piece.hidden = true;
    return {
      piece,
      x: (j * 97 + 40) % 1260,
      y: 110 + ((j * 53) % 250),
      fall: CONFETTI.fall + ((j * 29) % 160),
    };
  });
  const racers = scene.appendChild(document.createElement('div'));
  racers.className = styles.layer!;
  const tags = scene.appendChild(document.createElement('div'));
  tags.className = styles.layer!;
  const bubbles = scene.appendChild(document.createElement('div'));
  bubbles.className = styles.layer!;
  const flash = scene.appendChild(document.createElement('div'));
  flash.className = styles.flash!;
  flash.dataset.part = 'flash';
  flash.hidden = true;

  // Back lane first, so each lane in front is drawn over the one behind.
  const riders: Rider[] = show.names.map((name, index) => {
    const look = lookOf(name);
    const at = lane(index, count);
    const drawn = drawRacer(look, faces.get(name)!, index + 1);
    const holder = racers.appendChild(document.createElement('div'));
    holder.className = styles.holder!;
    holder.dataset.person = name;
    holder.style.scale = String(at.k);
    holder.append(drawn.el);
    // Where a duck tips from, or a chair or a creature turns round.
    drawn.el.style.transformOrigin =
      look.mount === 'duck'
        ? TIP.origin
        : THINGS.includes(look.mount as Creature) || CRITTERS.includes(look.mount as Creature)
          ? `${drawn.faceX}px ${RACER.feet}px`
          : isCreature(look.mount)
            ? `${drawn.faceX}px 0`
            : SPIN.origin;
    const tag = tags.appendChild(nameTag(name, tagSize(at.k)));
    tag.classList.add(styles.tag!);
    tag.dataset.person = name;
    const speed = trails.appendChild(
      document.createElementNS('http://www.w3.org/2000/svg', 'path'),
    );
    speed.setAttribute('class', styles.line!);
    speed.setAttribute('stroke-width', '6');
    const gait = bob(drawn.el, {
      distance: GAITS[look.mount].px / at.k,
      seconds: GAITS[look.mount].seconds,
    });
    gait.pause();
    // A hopper's bounces go on top of its gait.
    drawn.el.style.setProperty(
      'translate',
      '0 calc(var(--bob) + var(--hop, 0px) + var(--lift, 0px))',
    );
    const parts = (part: string) => [
      ...drawn.el.querySelectorAll<SVGElement>(`[data-part="${part}"]`),
    ];
    // What the track's own event brings, for whoever it happens to.
    const mine: Rider['own'] = {};
    if (own?.subject === name) {
      const held = (prop: 'cup' | 'seaweed') => {
        const [x, y, size] = HELD[prop];
        const g = propOn(drawn.el, prop);
        g.setAttribute(
          'transform',
          `translate(${prop === 'cup' ? drawn.faceX + x : x} ${y}) scale(${size})`,
        );
        return g;
      };
      if (course === 'office' && own.kind === 'stop') mine.cup = held('cup');
      if (course === 'sea' && own.kind === 'stop') mine.seaweed = held('seaweed');
      if (course === 'sea' && own.kind === 'burst') {
        mine.swirls = propOn(drawn.el, 'swirls');
        drawn.el.prepend(mine.swirls);
      }
      if (course === 'moon') {
        mine.shadow = props.appendChild(document.createElement('div'));
        mine.shadow.className = styles.shadow!;
        mine.shadow.dataset.part = 'shadow';
        mine.shadow.hidden = true;
      }
    }
    return {
      name,
      index,
      look,
      at,
      holder,
      drawn,
      ridden: isCreature(look.mount) ? null : (drawn as Racer),
      creature: isCreature(look.mount) ? (drawn as CreatureRunner) : null,
      tag,
      speed,
      gait,
      flame: parts('flame'),
      legs: parts('legs'),
      head: parts('bird-head'),
      own: mine,
      state: null,
    };
  });
  const byName = new Map(riders.map((rider) => [rider.name, rider]));

  // What the track's own event stands on the track, where along it: the
  // coffee machine on the floor behind whoever stops there, or the
  // wet-floor sign in the lane, just ahead of whoever slides on it.
  const standing = (() => {
    if (course !== 'office' || !own) return null;
    const { look, at, holder } = byName.get(own.subject)!;
    if (own.kind === 'stop') {
      const when = own.at + STOP.seconds;
      const face = faceAt(look.mount, at, noseAt(plan, own.subject, when));
      return {
        el: group(stands, 'machine', TRACK_PROPS.machine),
        along: (face.left + face.right) / 2 - MACHINE + cameraAt(plan, when),
        ground: 0,
        k: 1,
      };
    }
    // In its lane: over the racer that slides past it, under the lanes in front.
    const lane = stands.cloneNode() as SVGSVGElement;
    holder.after(lane);
    return {
      el: group(lane, 'wet-floor', TRACK_PROPS.wetFloor),
      along: noseAt(plan, own.subject, own.at) + cameraAt(plan, own.at) + 30,
      ground: at.ground,
      k: at.k * WET_FLOOR,
    };
  })();

  /** How far into the track's own event `name` is at show second `t`, or -1. */
  const ownSince = (name: string, t: number) => {
    if (own?.subject !== name || t < own.at) return -1;
    return t < own.at + (own.kind === 'stop' ? STOP.off : OWN.burst) ? t - own.at : -1;
  };

  /** A racer's face and tag on the stage with its nose at `nose`. */
  const facing = ({ name, look, at }: Rider, nose: number) => [
    faceAt(look.mount, at, nose),
    tagBox(name, look.mount, at, nose),
  ];

  // How high the Moon's own event lifts its racer at most: as high as it can
  // while, at each moment of its rise and fall, nothing of it touches a tag,
  // or a tag of it touches a face, behind it.
  const rise = (() => {
    if (course !== 'moon' || !own) return 0;
    const subject = byName.get(own.subject)!;
    const seconds = own.kind === 'stop' ? STOP.off : OWN.burst;
    let most = OWN.rise;
    for (let t = own.at; t <= own.at + seconds; t += SAMPLE / 2) {
      const share = Math.sin((Math.PI * (t - own.at)) / seconds);
      if (share < 0.05) continue;
      const mine = facing(subject, noseAt(plan, subject.name, t));
      for (const other of riders.filter((rider) => rider !== subject)) {
        const theirs = facing(other, noseAt(plan, other.name, t));
        mine.forEach((one, i) =>
          theirs.forEach((two, j) => {
            // Face by face is no tag over anything; a box wider by half a sample's travel.
            const side = i + j > 0 && one.left - 20 < two.right && two.left < one.right + 20;
            if (side && two.bottom <= one.top) {
              most = Math.min(most, (one.top - two.bottom - OWN.clear) / share);
            }
          }),
        );
      }
    }
    return Math.max(0, most);
  })();

  /** How high `name` floats or hops on the Moon at show second `t`, in stage px. */
  const liftOf = (name: string, t: number) => {
    const since = ownSince(name, t);
    if (course !== 'moon' || since < 0) return 0;
    return rise * Math.sin((Math.PI * since) / (own!.kind === 'stop' ? STOP.off : OWN.burst));
  };

  // The photo finish: the two side-on at the line, the unlucky nose over it.
  const photo =
    plan.ending === 'photo'
      ? scene.appendChild(
          photoCard(
            [plan.rival, show.unlucky]
              .map((name) => byName.get(name)!)
              .sort((one, two) => one.index - two.index)
              .map(({ name, look, index }) => {
                const drawn = drawRacer(look, faces.get(name)!, index + 1);
                drawn.setMood('scared');
                drawn.setPose('pull');
                drawn.setSweat(true);
                const { least, most } = reachOf(look);
                const nose =
                  name === show.unlucky
                    ? PHOTO.line + AHEAD - least * PHOTO.scale
                    : PHOTO.line - 2 - most * PHOTO.scale;
                return { name, racer: drawn, nose };
              }),
            `${show.unlucky}, by a nose!`,
            plan.course,
          ),
        )
      : null;
  if (photo) photo.hidden = true;

  // Bubbles, each placed once where it stays clear of every face and tag
  // round it while it's up, then following its speaker.
  const said = sayings(plan, show.unlucky, (name) => lookOf(name).mount).map((saying) => {
    const speaker = byName.get(saying.name)!;
    const samples: { face: Box; tag: Box; avoid: Box[] }[] = [];
    for (let t = saying.from; t <= saying.to + SAMPLE; t += SAMPLE) {
      // Where each face and tag is, raised if it floats.
      const placed = (rider: Rider) =>
        facing(rider, noseAt(plan, rider.name, t)).map((box) => {
          const lift = liftOf(rider.name, t);
          return { ...box, top: box.top - lift, bottom: box.bottom - lift };
        });
      const [face, tag] = placed(speaker);
      samples.push({ face: face!, tag: tag!, avoid: riders.flatMap(placed) });
    }
    const offsets = bubbleOffsets(saying.text, samples);
    const el = bubbles.appendChild(bubble(saying.text, { x: 0, y: 0 }));
    el.dataset.person = saying.name;
    el.dataset.says = saying.text;
    el.hidden = true;
    return { ...saying, speaker, offsets, el };
  });

  const stopOf = (name: string, t: number) => stopping(plan, name, t);

  /** How far into `name`'s burst, or their surge, show second `t` is, and how long it lasts. */
  const burstOf = (name: string, t: number) => {
    const event = plan.events.find(
      (each) =>
        each.kind === 'burst' &&
        each.cause === 'racer' &&
        each.subject === name &&
        t >= each.at &&
        t < each.at + BURST.seconds,
    );
    if (event) return { since: t - event.at, seconds: BURST.seconds };
    const surging =
      plan.ending === 'surge' && name === show.unlucky && t >= times.slow && t < times.finish;
    return surging ? { since: t - times.slow, seconds: times.finish - times.slow } : null;
  };

  /** Puts a prop at `from`, moving to `to` as `done` goes from 0 to 1, turned `degrees`. */
  const move = (
    prop: SVGGElement,
    from: readonly number[],
    to: readonly number[],
    done: number,
    extra = '',
  ) => {
    const x = from[0]! + (to[0]! - from[0]!) * done;
    const y = from[1]! + (to[1]! - from[1]!) * done;
    write(prop, '@transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${extra}`);
  };

  /** What a new mount does in a burst and in a stop; `since` is how far into a stop. */
  const ride = (rider: Rider, t: number, moving: boolean, since: number) => {
    const { look, ridden: drawn } = rider;
    if (!drawn) return;
    const { props } = drawn;
    const still = show.reducedMotion;
    const burst = burstOf(rider.name, t);
    const stopped = since >= 0;
    const shown: string[] = [];
    if (look.mount === 'hopper') {
      let hop = 0;
      if (burst && !still) {
        const { px, count } = BOUNCE.burst;
        hop = px * Math.abs(Math.sin((Math.PI * count * burst.since) / burst.seconds));
      } else if (stopped && !still) {
        const { px, count } = BOUNCE.stop;
        hop = px * Math.abs(Math.sin((Math.PI * count * since) / STOP.off));
      }
      write(drawn.el, '--hop', hop ? `${(-hop).toFixed(1)}px` : '0px');
      write(drawn.el, '@data-hop', hop.toFixed(1));
    }
    if (look.mount === 'ostrich') {
      const swing = burst
        ? still
          ? STRIDE.wide
          : STRIDE.wide * Math.cos((2 * Math.PI * STRIDE.count * burst.since) / burst.seconds)
        : 1;
      const legs =
        swing === 1
          ? ''
          : `matrix(${swing.toFixed(2)} 0 0 1 ${(STRIDE.hip * (1 - swing)).toFixed(1)} 0)`;
      for (const leg of rider.legs) write(leg, '@transform', legs);
      write(drawn.el, '@data-stride', swing.toFixed(2));
      const egg = props.egg!;
      const laid = stopped && since >= LAY.drop;
      showPart(egg, laid);
      if (laid) move(egg, LAY.from, LAY.to, still ? 1 : Math.min(1, (since - LAY.drop) / LAY.fall));
      if (laid) shown.push('egg');
      const back = stopped && since >= LAY.look && since < STOP.phew;
      for (const part of rider.head)
        write(part, '@transform', back ? 'matrix(-1 0 0 1 364 0)' : '');
      write(drawn.el, '@data-look', back ? 'back' : '');
    }
    if (look.mount === 'rocket') {
      const length = burst
        ? FLAME.burst
        : moving && !still
          ? 1 + FLAME.flicker * Math.sin(FLAME.rate * t)
          : 1;
      const flame =
        length === 1
          ? ''
          : `matrix(${length.toFixed(2)} 0 0 1 ${(FLAME.tail * (1 - length)).toFixed(1)} 0)`;
      for (const part of rider.flame) {
        write(part, '@transform', flame);
        write(part, '@display', stopped ? 'none' : 'inline');
      }
      write(drawn.el, '@data-flame', stopped ? 'out' : length.toFixed(2));
      const smoke = props.smoke!;
      const puff = stopped && since < FLAME.smoke;
      showPart(smoke, puff);
      if (puff) {
        const done = still ? 1 : since / FLAME.smoke;
        move(smoke, FLAME.from, FLAME.to, done, ` scale(${(0.8 + 0.6 * done).toFixed(2)})`);
        shown.push('smoke');
      }
    }
    if (look.mount === 'sandwich') {
      const steam = props.steam!;
      showPart(steam, !!burst);
      if (burst) {
        move(steam, [0, 0], [0, -STEAM.rise], still ? 0 : burst.since / burst.seconds);
        shown.push('steam');
      }
      const pickle = props.pickle!;
      const dropped = stopped && since >= DROP.drop && since < STOP.phew;
      showPart(pickle, dropped);
      if (dropped) {
        const done = still ? 1 : Math.min(1, (since - DROP.drop) / DROP.fall);
        move(pickle, DROP.from, DROP.to, done, ` rotate(${still ? 0 : Math.round(200 * done)})`);
        shown.push('pickle');
      }
    }
    write(drawn.el, '@data-props', shown.join(' '));
  };

  /** Where `name`'s nose is along the track, not on the stage, at show second `t`. */
  const alongAt = (name: string, t: number) => noseAt(plan, name, t) + cameraAt(plan, t);

  /**
   * What a creature does: its arms flail in front, and what its burst and
   * its stop bring; `since` is how far into a stop. Returns how far a thing
   * on legs tilts from its feet.
   */
  const act = (rider: Rider, t: number, since: number) => {
    const { creature: drawn, at } = rider;
    if (!drawn) return 0;
    const kind = drawn.look.mount;
    const spec = CREATURE_SPEC[kind];
    const still = show.reducedMotion;
    const stopped = since >= 0;
    const shown: string[] = [];
    const { pose } = rider.state!;
    const flailing = pose === 'pull' || (pose === 'party' && spec.reach < 1);
    const flail =
      flailing && !still ? FLAIL.degrees * Math.sin((2 * Math.PI * t) / FLAIL.seconds) : 0;
    drawn.arms.forEach((arm, i) => {
      const [x, y] = spec.shoulders[i]!;
      const degrees = (i ? flail : -flail).toFixed(1);
      write(arm, '@transform', flail ? `rotate(${degrees} ${x} ${y})` : '');
    });
    write(drawn.el, '@data-flail', flail.toFixed(1));

    let hop = 0;
    const until = (from: number, to: number) => stopped && since >= from && since < to;
    if (kind === 'zombie') {
      const flying = until(0, STOP.phew);
      const shoe = drawn.props.lostShoe!;
      showPart(shoe, flying);
      showPart(drawn.shoes[1], !flying);
      if (flying) {
        const done = still ? 1 : Math.min(1, since / SHOE.fly);
        move(shoe, SHOE.from, SHOE.to, done, ` rotate(${still ? 0 : Math.round(-300 * done)})`);
        shown.push('lostShoe');
      }
      if (until(SHOE.fly, STOP.phew) && !still) {
        const hops = (SHOE.count * (since - SHOE.fly)) / (STOP.phew - SHOE.fly);
        hop = SHOE.hop * Math.abs(Math.sin(Math.PI * hops));
      }
    }
    if (kind === 'robot') {
      const blank = until(0, REBOOT);
      showPart(drawn.face, !blank);
      write(drawn.el, '@data-blank', String(blank));
    }
    if (kind === 'shark') drawn.setBend(until(LACES.from, STOP.phew) ? LACES.degrees : 0);
    if (kind === 'astronaut') {
      const flag = drawn.props.flag!;
      const planted = until(PLANT.at, STOP.off);
      showPart(flag, planted);
      if (!planted) write(drawn.el, '@data-flag', '');
      if (planted) {
        // Where it went in, along the track, from where the astronaut is now.
        const back = alongAt(rider.name, t - since + PLANT.at) - alongAt(rider.name, t);
        const x = PLANT.foot[0]! + back / at.k;
        write(flag, '@transform', `translate(${x.toFixed(1)} ${PLANT.foot[1]})`);
        write(drawn.el, '@data-flag', x.toFixed(1));
        shown.push('flag');
      }
    }
    if (kind === 'monster' && !still) {
      for (const hic of HICCUPS.at) {
        if (until(hic, hic + HICCUPS.seconds)) {
          hop = HICCUPS.px * Math.sin((Math.PI * (since - hic)) / HICCUPS.seconds);
        }
      }
    }
    if (kind === 'villain') {
      const wrapped = until(0, CAPE.seconds);
      showPart(drawn.props.wrap!, wrapped);
      if (wrapped) shown.push('wrap');
    }
    if (kind === 'alien') {
      const asking = until(ASK, STOP.phew);
      showPart(drawn.props.question!, asking);
      if (asking) shown.push('question');
    }
    if (kind === 'dinosaur') {
      const reaching = until(0, STOP.phew);
      showPart(drawn.props.snack!, reaching);
      drawn.setStretch(reaching);
      if (reaching) shown.push('snack');
    }
    const tilt = THINGS.includes(kind)
      ? thing(rider, t, since, shown, (lift) => (hop = lift))
      : CRITTERS.includes(kind)
        ? critter(rider, t, since, shown, (lift) => (hop = lift))
        : 0;
    write(drawn.el, '--hop', hop ? `${(-hop).toFixed(1)}px` : '0px');
    write(drawn.el, '@data-hop', hop.toFixed(1));
    write(drawn.el, '@data-props', shown.join(' '));
    return tilt;
  };

  /**
   * What a thing on legs does in its burst and its stop, noting the props it
   * shows in `shown` and lifting it with `lift`; `since` is how far into a
   * stop. Returns how far it tilts from its feet.
   */
  const thing = (
    rider: Rider,
    t: number,
    since: number,
    shown: string[],
    lift: (px: number) => void,
  ) => {
    const drawn = rider.creature!;
    const { props } = drawn;
    const kind = drawn.look.mount;
    const spec = CREATURE_SPEC[kind];
    const still = show.reducedMotion;
    const burst = burstOf(rider.name, t);
    const done = burst ? burst.since / burst.seconds : 0;
    const until = (from: number, to: number) => since >= from && since < to;
    /** Shows `prop` while `on`, noting it. */
    const showing = (prop: keyof typeof props, on: boolean) => {
      showPart(props[prop]!, on);
      if (on) shown.push(prop);
      return on;
    };
    /** Puts steam over its top, `rise` up. */
    const steam = (prop: 'jets' | 'steam', rise: number) => {
      const [x, y] = spec.hat;
      write(props[prop]!, '@transform', `translate(${x} ${(y - 6 - rise).toFixed(1)})`);
    };
    let tilt = 0;
    if (kind === 'mug') {
      if (showing('jets', !!burst)) steam('jets', still ? 0 : JET.rise * done);
      drawn.setBend(until(REFILL.from, STOP.phew) ? REFILL.degrees : 0);
      // Empty: no steam.
      const empty = until(0, STOP.phew);
      for (const wisp of drawn.wisps) showPart(wisp, !empty);
      write(drawn.el, '@data-empty', String(empty));
    }
    if (kind === 'printer') {
      if (showing('stream', !!burst)) move(props.stream!, [0, 0], PAPER.to, still ? 0 : done);
      showing('jam', until(0, STOP.phew));
      const off =
        !still &&
        until(BLINK.from, STOP.phew) &&
        Math.floor(2 * BLINK.rate * (since - BLINK.from)) % 2 === 1;
      write(drawn.light!, '@class', off ? styles.inkSoft! : styles.tomato!);
      write(drawn.el, '@data-light', off ? 'off' : 'on');
    }
    if (kind === 'sticky') {
      showing('wind', !!burst);
      if (burst && !still) {
        tilt = FLUTTER.degrees * Math.sin(2 * Math.PI * FLUTTER.rate * burst.since);
      }
      const stuck = showing('patch', until(0, STOP.phew));
      const tugs = (TUG.count * (since - TUG.from)) / (STOP.phew - TUG.from);
      const tug = !until(TUG.from, STOP.phew)
        ? 0
        : still
          ? TUG.degrees
          : TUG.degrees * Math.abs(Math.sin(Math.PI * tugs));
      drawn.setBend(stuck ? Math.round(tug * 10) / 10 : 0);
    }
    if (kind === 'banana') {
      if (showing('skid', !!burst) && !still) tilt = SKID * Math.sin(Math.PI * done);
      const splitting = until(SPLITS.from, STOP.phew);
      const k = !splitting ? 0 : still ? 1 : Math.min(1, (since - SPLITS.from) / SPLITS.into);
      drawn.shoes.forEach((shoe, i) => {
        const [x, y] = spec.hips[i]!;
        const degrees = (i ? -SPLITS.degrees : SPLITS.degrees) * k;
        write(
          shoe.parentNode as SVGGElement,
          '@transform',
          k ? `rotate(${degrees.toFixed(1)} ${x} ${y})` : '',
        );
      });
      write(drawn.el, '@data-splits', (SPLITS.degrees * k).toFixed(1));
      if (k) lift(-SPLITS.down * k);
      if (until(STOP.phew, STOP.off) && !still) {
        lift(SPLITS.spring * Math.sin((Math.PI * (since - STOP.phew)) / (STOP.off - STOP.phew)));
      }
    }
    if (kind === 'icecream') {
      if (showing('sprinkles', !!burst)) {
        move(props.sprinkles!, [0, 0], SPRINKLE.to, still ? 0 : done);
      }
      const melting = until(0, STOP.phew);
      // How long the drips hang, 0 to 1: up to the peak, then firming up by "Phew!".
      const melt = !melting
        ? 0
        : since < MELT.peak
          ? since / MELT.peak
          : (STOP.phew - since) / (STOP.phew - MELT.peak);
      if (showing('drips', melting && !still)) {
        const k = 0.4 + (MELT.long - 0.4) * melt;
        write(
          props.drips!,
          '@transform',
          `translate(0 ${(MELT.top * (1 - k)).toFixed(1)}) scale(1 ${k.toFixed(2)})`,
        );
      }
      write(drawn.el, '@data-drip', (still ? 0 : melt).toFixed(2));
      if (showing('puddle', melting)) {
        const [x, y] = MELT.puddle;
        const k = still ? 1 : 0.3 + 0.7 * melt;
        write(props.puddle!, '@transform', `translate(${x} ${y}) scale(${k.toFixed(2)} 1)`);
      }
    }
    if (kind === 'sushi') {
      if (showing('belt', !!burst)) {
        const slid = still ? 1 : Math.min(1, burst!.since / BELT.slide);
        write(props.belt!, '@transform', `translate(${(BELT.from * (1 - slid)).toFixed(1)} 0)`);
      }
      if (showing('wasabi', until(0, STOP.phew))) {
        const fallen = still ? 1 : Math.min(1, since / WASABI.fall);
        const [x, y] = WASABI.at;
        write(
          props.wasabi!,
          '@transform',
          `translate(${x} ${(y + WASABI.from * (1 - fallen)).toFixed(1)})`,
        );
      }
      showing('tears', until(WASABI.fall, STOP.phew));
      if (showing('steam', until(WASABI.fall, STOP.phew))) {
        steam('steam', still ? 0 : JET.rise * (((since - WASABI.fall) / JET.loop) % 1));
      }
    }
    return tilt;
  };

  /**
   * What an animal or a spooky creature does in its burst and its stop,
   * noting the props it shows in `shown` and lifting it with `lift`; `since`
   * is how far into a stop. Returns how far it tilts from its feet, or, for
   * a mummy, about its middle.
   */
  const critter = (
    rider: Rider,
    t: number,
    since: number,
    shown: string[],
    lift: (px: number) => void,
  ) => {
    const drawn = rider.creature!;
    const { props } = drawn;
    const kind = drawn.look.mount;
    const spec = CREATURE_SPEC[kind];
    const still = show.reducedMotion;
    const burst = burstOf(rider.name, t);
    const done = burst ? burst.since / burst.seconds : 0;
    const until = (from: number, to: number) => since >= from && since < to;
    /** Shows `prop` while `on`, noting it. */
    const showing = (prop: keyof typeof props, on: boolean) => {
      showPart(props[prop]!, on);
      if (on) shown.push(prop);
      return on;
    };
    /** How far from 0 to 1 a ramp up from `from` over `over` s, and down again from `down`, is at `at`. */
    const ramp = (at: number, from: number, over: number, down: number, to: number) =>
      at < from || at >= to
        ? 0
        : Math.min(1, (at - from) / over, (to - at) / Math.max(1e-6, to - down));
    /** Keeps a prop on the ground flat while the creature tilts `degrees` about (x, y). */
    const flat = (prop: SVGGElement, degrees: number, [x, y]: readonly number[], then = '') =>
      write(
        prop,
        '@transform',
        `${degrees ? `rotate(${(-degrees).toFixed(1)} ${x} ${y}) ` : ''}${then}`.trim(),
      );
    const feet = [spec.face, RACER.feet] as const;
    /** Each leg swung `degrees` from its hip, the back one the other way. */
    const swing = (degrees: number) =>
      drawn.shoes.forEach((shoe, i) => {
        const [x, y] = spec.hips[i]!;
        const turn = i ? degrees : -degrees;
        write(
          shoe.parentNode as SVGGElement,
          '@transform',
          degrees ? `rotate(${turn.toFixed(1)} ${x} ${y})` : '',
        );
      });
    let tilt = 0;
    let origin: readonly number[] = feet;
    if (kind === 'cat') {
      if (showing('laser', !!burst)) {
        const wobble = still ? 0 : LASER.wobble * Math.sin(2 * Math.PI * LASER.rate * burst!.since);
        const at = still ? 0.5 : done;
        move(props.laser!, LASER.from, [LASER.to[0]! + wobble, LASER.to[1]!], at);
      }
      const boxed = showing('box', until(BOXED, STOP.phew));
      for (const shoe of drawn.shoes) showPart(shoe.parentNode as SVGGElement, !boxed);
      drawn.setBend(burst ? LASER.crouch : 0);
    }
    if (kind === 'octopus') {
      const knotted = showing('knot', until(KNOT.from, still ? STOP.phew : KNOT.to));
      const freeing = !still && until(KNOT.to, STOP.phew);
      const whirling = !still && (!!burst || freeing);
      const at = burst ? burst.since : since;
      const whirl = (i: number) =>
        whirling ? WHIRL.degrees * Math.sin(2 * Math.PI * WHIRL.rate * at + (i * Math.PI) / 2) : 0;
      drawn.tentacles.forEach((parts, i) => {
        const [x, y] = TENTACLES_FROM[i]!;
        for (const part of parts) {
          showPart(part, !knotted);
          write(part, '@transform', whirling ? `rotate(${whirl(i).toFixed(1)} ${x} ${y})` : '');
        }
      });
      for (const shoe of drawn.shoes) showPart(shoe.parentNode as SVGGElement, !knotted);
      swing(whirl(1));
      write(drawn.el, '@data-whirl', Math.abs(whirl(0)).toFixed(1));
    }
    if (kind === 'penguin') {
      if (showing('ice', !!burst)) {
        tilt = still
          ? 0
          : BELLY.degrees *
            ramp(burst!.since, 0, BELLY.drop, burst!.seconds - BELLY.drop, burst!.seconds);
        flat(props.ice!, tilt, feet);
      }
      const dropped = showing('fish', until(0.1, FISH.picked));
      if (dropped) {
        const fallen = still ? 1 : Math.min(1, (since - 0.1) / FISH.fall);
        move(
          props.fish!,
          FISH.from,
          FISH.to,
          fallen,
          ` rotate(${still ? 0 : Math.round(160 * fallen)})`,
        );
      }
      drawn.setBend(until(FISH.reach, FISH.picked) ? FISH.degrees : 0);
    }
    if (kind === 'pigeon') {
      if (showing('chip', !!burst)) {
        move(props.chip!, CHIP.from, CHIP.to, still ? 0.5 : done);
        if (!still) tilt = CHIP.bob * Math.sin(2 * Math.PI * CHIP.rate * burst!.since);
      }
      if (showing('chest', until(STRUT.from, STOP.phew)) && !still) {
        tilt = STRUT.degrees * Math.sin(2 * Math.PI * STRUT.rate * (since - STRUT.from));
      }
    }
    if (kind === 'ghost') {
      if (showing('fright', !!burst) && !still) {
        if (burst!.since < SPOOKED.seconds) {
          lift(SPOOKED.px * Math.sin((Math.PI * burst!.since) / SPOOKED.seconds));
        }
        tilt = SPOOKED.flap * Math.sin(2 * Math.PI * SPOOKED.rate * burst!.since);
      }
      if (showing('hem', until(0, STOP.phew)) && !still) {
        tilt = TRIP.degrees * ramp(since, TRIP.from, TRIP.fall, TRIP.up, STOP.phew);
      }
    }
    if (kind === 'gnome') {
      drawn.setBend(burst ? SNEAK.degrees : 0);
      if (burst && !still) {
        lift(SNEAK.px * Math.abs(Math.sin((Math.PI * SNEAK.steps * burst.since) / burst.seconds)));
      }
      if (showing('plinth', until(STATUE.from, STOP.phew))) lift(STATUE.px);
    }
    if (kind === 'mummy') {
      origin = ROLL.middle;
      if (showing('trail', !!burst)) {
        tilt = still ? 0 : 360 * ROLL.turns * done;
        const k = still ? 1 : Math.min(1, 0.2 + done);
        flat(
          props.trail!,
          tilt,
          origin,
          `matrix(${k.toFixed(2)} 0 0 1 ${(112 * (1 - k)).toFixed(1)} 0)`,
        );
      }
      if (showing('unwrap', until(UNWRAP.from, STOP.phew))) {
        const out = Math.min(1, (since - UNWRAP.from) / UNWRAP.out);
        const back = Math.max(0, (since - UNWRAP.wind) / (STOP.phew - UNWRAP.wind));
        const k = still ? 1 : Math.max(0.05, Math.min(out, 1 - back));
        if (!still && back > 0) tilt = 360 * back;
        flat(
          props.unwrap!,
          tilt,
          origin,
          `matrix(${k.toFixed(2)} 0 0 1 ${(150 * (1 - k)).toFixed(1)} 0)`,
        );
      }
    }
    if (kind === 'yeti') {
      showing('skis', !!burst);
      drawn.setBend(burst ? GLIDE : 0);
      const lying = showing('snow', until(0, STOP.phew));
      let sweep = 0;
      if (lying && !still) {
        tilt = -90 * ramp(since, ANGEL.from, ANGEL.fall, ANGEL.up, STOP.phew);
        if (until(ANGEL.from + ANGEL.fall, ANGEL.up)) {
          sweep = Math.sin(2 * Math.PI * ANGEL.rate * (since - ANGEL.from - ANGEL.fall));
        }
        flat(props.snow!, tilt, feet);
      }
      drawn.arms.forEach((arm, i) => {
        const [x, y] = spec.shoulders[i]!;
        const degrees = ANGEL.arms * sweep * (i ? -1 : 1);
        if (sweep) write(arm, '@transform', `rotate(${degrees.toFixed(1)} ${x} ${y})`);
      });
      swing(ANGEL.legs * sweep);
      write(drawn.el, '@data-sweep', Math.abs(ANGEL.arms * sweep).toFixed(1));
    }
    write(drawn.el, 'transform-origin', `${origin[0]}px ${origin[1]}px`);
    return tilt;
  };

  /** How fast `name`'s nose moves along the track at show second `t`. */
  const speedOf = (name: string, t: number) => {
    const dt = 1 / 60;
    return (alongAt(name, t + dt) - alongAt(name, t - dt)) / (2 * dt);
  };

  const feel = (rider: Rider, t: number, leader: string | null, front: number) => {
    const nose = noseAt(plan, rider.name, t);
    if (t >= times.win) {
      if (rider.name === show.unlucky)
        return { mood: 'party', pose: 'party', sweat: false } as const;
      return plan.wavers.has(rider.name)
        ? ({ mood: 'happy', pose: 'wave', sweat: false } as const)
        : ({ mood: 'party', pose: 'party', sweat: false } as const);
    }
    if (plan.ending === 'brake' && rider.name === plan.rival && t >= times.slow + 0.4) {
      return { mood: 'happy', pose: 'wave', sweat: false } as const;
    }
    if (t < times.go)
      return {
        mood: rider.index % 3 === 0 ? 'calm' : 'worried',
        pose: 'hold',
        sweat: false,
      } as const;
    const stop = stopOf(rider.name, t);
    if (stop)
      return { mood: 'happy', pose: t - stop.at > 0.3 ? 'wave' : 'hold', sweat: false } as const;
    if (rider.name === leader) return { mood: 'scared', pose: 'pull', sweat: true } as const;
    if (nose >= front - LENGTH) {
      return { mood: 'worried', pose: 'hold', sweat: t >= times.stretch } as const;
    }
    return {
      mood: 'happy',
      pose: plan.wavers.has(rider.name) ? 'wave' : 'hold',
      sweat: false,
    } as const;
  };

  /** What the track's own event does to `rider`: its props, its skid; `since` is how far in. */
  const undergo = (rider: Rider, t: number, since: number) => {
    const { cup, seaweed, swirls, shadow } = rider.own;
    const still = show.reducedMotion;
    const shown: string[] = [];
    if (cup) {
      showPart(cup, since >= OWN.cup);
      if (since >= OWN.cup) shown.push('cup');
    }
    if (seaweed) {
      const wrapped = since >= 0 && since < STOP.phew;
      showPart(seaweed, wrapped);
      if (wrapped) shown.push('seaweed');
      const shaking = wrapped && !still && since > STOP.phew - OWN.shake;
      const [x, y, size] = HELD.seaweed;
      const shake = shaking ? ` rotate(${(8 * Math.sin(40 * since)).toFixed(1)} 80 60)` : '';
      write(seaweed, '@transform', `translate(${x} ${y}) scale(${size})${shake}`);
    }
    if (swirls) {
      showPart(swirls, since >= 0);
      if (since >= 0) shown.push('swirls');
      const drift = since >= 0 && !still ? (-40 * since) / OWN.burst : 0;
      const [x, y, size] = HELD.swirls;
      write(swirls, '@transform', `translate(${(x + drift).toFixed(1)} ${y}) scale(${size})`);
    }
    const lift = liftOf(rider.name, t);
    write(rider.drawn.el, '--lift', `${(-lift / rider.at.k).toFixed(1)}px`);
    write(rider.drawn.el, '@data-lift', lift.toFixed(1));
    if (shadow) {
      reveal(shadow, lift > 0);
      if (lift > 0) {
        const box = boxAt(rider.look.mount, rider.at, noseAt(plan, rider.name, t));
        write(
          shadow,
          'translate',
          `${(box.left + 30 * rider.at.k).toFixed(1)}px ${(rider.at.ground - 8).toFixed(1)}px`,
        );
        write(shadow, 'width', `${(180 * rider.at.k).toFixed(1)}px`);
      }
    }
    write(rider.drawn.el, '@data-track', shown.join(' '));
    // A skid on the wet floor tilts the racer back as it shoots ahead; on
    // the Moon it tilts nose up as it rises, however little room it has.
    if (since < 0 || still) return 0;
    if (course === 'office' && own?.kind === 'burst') {
      return OWN.skid * Math.sin((Math.PI * since) / OWN.burst);
    }
    if (course === 'moon') {
      return (
        OWN.drift * Math.sin((Math.PI * since) / (own!.kind === 'stop' ? STOP.off : OWN.burst))
      );
    }
    return 0;
  };

  const place = (t: number) => {
    const camera = cameraAt(plan, t);
    field.set(camera);
    if (standing) {
      const x = standing.along - camera;
      const near = x > -200 && x < 1480;
      showPart(standing.el, near);
      write(standing.el, '@data-x', near ? x.toFixed(1) : '');
      if (near) {
        write(
          standing.el,
          '@transform',
          `translate(${x.toFixed(1)} ${standing.ground.toFixed(1)}) scale(${standing.k.toFixed(3)})`,
        );
      }
    }
    write(scene, '@data-camera', camera.toFixed(1));
    const slow = t >= times.slow && t < times.finish;
    write(scene, '@data-slow', String(slow));
    const noses = riders.map((rider) => noseAt(plan, rider.name, t));
    const front = Math.max(...noses);
    const leader = t > times.go ? riders[noses.indexOf(front)]!.name : null;

    riders.forEach((rider, i) => {
      const { look, at, holder, drawn, tag, speed, gait } = rider;
      const nose = noses[i]!;
      const box = boxAt(look.mount, at, nose);
      write(holder, 'translate', `${box.left.toFixed(1)}px ${box.top.toFixed(1)}px`);
      write(holder, '@data-nose', nose.toFixed(1));
      const beside = tagAt(look.mount, at, nose);
      const middle = beside.middle - liftOf(rider.name, t);
      write(
        tag,
        'translate',
        `calc(${beside.right.toFixed(1)}px - 100%) calc(${middle.toFixed(1)}px - 50%)`,
      );

      const next = feel(rider, t, leader, front);
      const was = rider.state;
      if (!was || was.mood !== next.mood) drawn.setMood(next.mood);
      if (!was || was.pose !== next.pose) drawn.setPose(next.pose);
      if (!was || was.sweat !== next.sweat) drawn.setSweat(next.sweat);
      rider.state = next;

      // The mount's gait: off at the line, while stopped and after the finish.
      const stop = stopOf(rider.name, t);
      const moving = t > times.go && t < times.finish && !stop;
      if (gait.paused() === moving) gait.paused(!moving);
      gait.timeScale(slow ? CAMERA.slow : 1);
      write(holder, '@data-gait', moving ? (slow ? 'slow' : 'on') : 'off');
      write(holder, '@data-stopped', String(!!stop));

      // What a stop does to each mount, unless the track stopped it.
      const since = stop?.cause === 'racer' ? t - stop.at : -1;
      // A skid or a float from the track's own event, and how a thing on legs tilts.
      const sway = undergo(rider, t, ownSince(rider.name, t)) + act(rider, t, since);
      rider.ridden?.setLeaf(look.mount === 'snail' && since >= 0.2);
      const tip =
        look.mount === 'duck' && since >= 0 && since < TIP.seconds && !show.reducedMotion
          ? TIP.degrees * Math.sin((Math.PI * since) / TIP.seconds)
          : 0;
      const tilt = tip || sway ? `${(tip + sway).toFixed(1)}deg` : '';
      write(drawn.el, 'rotate', tilt);
      write(drawn.el, '@data-rotate', tilt);
      const turn = look.mount === 'chair' ? SPIN : look.mount === 'villain' ? CAPE : null;
      const spin =
        turn && since >= 0 && since < turn.seconds && !show.reducedMotion
          ? Math.cos((2 * Math.PI * turn.turns * since) / turn.seconds)
          : 1;
      const turned = spin === 1 ? '' : `${spin.toFixed(2)} 1`;
      write(drawn.el, 'scale', turned);
      write(drawn.el, '@data-scale', turned);
      ride(rider, t, moving, since);

      // Speed lines behind whoever is racing along.
      const racing = moving && !show.reducedMotion && speedOf(rider.name, t) > SPEEDY;
      if (racing) {
        const tail = box.left + 20 * at.k;
        write(
          speed,
          '@d',
          `M${(tail - 8).toFixed(1)} ${(at.ground - 40 * at.k).toFixed(1)} h-44 ` +
            `M${tail.toFixed(1)} ${(at.ground - 70 * at.k).toFixed(1)} h-28`,
        );
      }
      write(speed, '@display', racing ? 'inline' : 'none');
    });

    byName.get(show.unlucky)!.drawn.setTrophy(t >= times.win);
    for (const { piece, x, y, fall } of confetti) {
      reveal(piece, t >= times.win);
      if (piece.hidden) continue;
      const falling = show.reducedMotion ? y : Math.min(y, -40 + fall * (t - times.win));
      write(piece, 'translate', `${x}px ${falling.toFixed(1)}px`);
    }
    reveal(flash, plan.ending === 'photo' && t >= times.finish && t < times.finish + FLASH);
    if (photo) {
      const from = times.finish + PHOTO_AFTER;
      reveal(photo, t >= from && t < times.win);
      const grown = Math.min(1, (t - from) / POP);
      const scale = !photo.hidden && grown < 1 ? gsap.parseEase('back.out(1.7)')(grown) : 1;
      write(photo, 'scale', scale === 1 ? '' : String(scale));
    }

    for (const saying of said) {
      const up = t >= saying.from && t < saying.to;
      reveal(saying.el, up);
      if (!up) continue;
      const { look, at, name } = saying.speaker;
      const face = faceAt(look.mount, at, noseAt(plan, name, t));
      const offset = saying.offsets[Math.floor((t - saying.from) / SAMPLE + 1e-9)]!;
      const x = ((face.left + face.right) / 2 + offset.dx).toFixed(1);
      const y = (face.top + offset.dy - liftOf(name, t)).toFixed(1);
      write(saying.el, 'left', `${x}px`);
      write(saying.el, 'top', `${y}px`);
      write(saying.el, '@data-x', x);
      write(saying.el, '@data-y', y);
      const grown = Math.min(1, (t - saying.from) / POP);
      write(saying.el, 'scale', grown < 1 ? String(gsap.parseEase('back.out(2)')(grown)) : '');
    }
  };

  const timeline = gsap.timeline({ paused: true, onUpdate: () => place(timeline.time()) });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));
  const starts = BEATS.map((beat) => [beat, times[beat]] as const);
  for (const [beat, time] of starts) at(time, () => void (scene.dataset.beat = beat));
  scene.dataset.beat = BEATS[0];

  at(0, () => show.caption('On your marks…'));
  at(times.go, () => show.caption('Go!'));
  cue(times.go, 'pop');
  for (const event of plan.events) {
    at(event.at, () => show.caption(eventCaption(event, lookOf(event.subject).mount, course)));
    cue(event.at, event.kind === 'burst' ? 'whoosh' : 'thunk');
  }
  at(times.stretch, () => show.caption('Final stretch!'));
  for (const time of plan.heartbeats) cue(time, 'heartbeat');
  const { rival } = plan;
  if (plan.ending === 'photo') {
    at(times.finish, () => show.caption('Photo finish!'));
    cue(times.finish, 'pop');
  } else if (plan.ending === 'brake') {
    at(times.slow, () => show.caption(`${rival} slams on the brakes!`));
    cue(times.slow, 'creak');
    at(times.slow + 1, () => show.caption(`${show.unlucky} can't stop!`));
  } else {
    const surge = { kind: 'burst', subject: show.unlucky, cause: 'racer', at: times.slow } as const;
    at(times.slow, () => show.caption(eventCaption(surge, lookOf(show.unlucky).mount)));
    cue(times.slow, 'whoosh');
  }
  at(times.win, () => show.caption(`${show.unlucky} wins!`));
  cue(times.win, 'fanfare');
  timeline.set({}, {}, times.end);

  place(0);
  await show.play(timeline);
}
