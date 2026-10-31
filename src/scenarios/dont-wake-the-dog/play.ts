// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where everyone is, how they look, how the dog looks
// and what the sign says are worked out from the show's time each frame, so
// every frame follows from the plan alone. The stage tells its story in data
// attributes too: the dog's state, marks and lift, the gate's swing, how many
// are at risk, and each person's layer, mood, arms and sweat.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  popIn,
  type Box,
  type Cue,
  type Head,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  DOG_AT,
  dog as drawDog,
  fence as drawFence,
  garden,
  heart,
  lead as drawLead,
  sign as drawSign,
  SIGN,
} from './parts';
import {
  anchorBy,
  bubbleAt,
  bubbleBy,
  captionBox,
  dogFace,
  faceBox,
  FRONT,
  headBox,
  nameTagFor,
  placings,
  tagSetOf,
  type DrawnTag,
  type Layer,
  type Places,
  type SetTag,
  type Spot,
  type TagSet,
} from './layout';
import { atRisk, BUBBLE, captionAt, dogAt, moodAt, planShow, type Plan, type Saying } from './plan';
import styles from './dont-wake-the-dog.module.css';

/** The dog lifts its head, or lowers it, in this many seconds. */
const LIFTING = 0.25;
/** It breathes in and out once every `seconds`, its body rising by `rise` of its height. */
const BREATH = { seconds: 3, rise: 0.035 };
/** Seconds the gate takes to swing open, or shut. */
const SWING = 0.3;
/** The sound each bubble makes as it appears. */
const SAID: Readonly<Record<string, Cue>> = {
  'Sniff…': 'sniff',
  'Sniff!': 'sniff',
  'Wuf…': 'grumble',
  'Woof!': 'bark',
  'Creak!': 'creak',
};
/** Seconds between the moments a bubble is checked clear of what moves around it. */
const SAMPLE = 0.05;
/** Stage pixels a bubble keeps clear of what moves round it, between samples. */
const MARGIN = 8;
/**
 * The dog jumps up `jump` px over `up` seconds at the woof, then bounces
 * `bounce` px every `every` seconds from the walk on.
 */
const JUMP = { jump: 50, up: 0.4, bounce: 10, every: 0.45 };
/** The standing dog's collar, on its drawing placed at DOG_AT.stand. */
const COLLAR = { x: 114, y: 70 };
/** The unlucky person's raised hand, on their head's 100 grid. */
const HAND = { x: 98, y: 6 };
/** Hearts over the standing dog's head, on its drawing placed at DOG_AT.stand. */
const HEARTS = [
  { x: 46, y: -33 },
  { x: 82, y: -57 },
];

const ease = { lift: gsap.parseEase('back.out(2.5)'), calm: gsap.parseEase('sine.inOut') };

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  /** Their name tag, in a holder the size and place of their head, in the tags' layer. */
  readonly tag: HTMLElement;
  readonly holder: HTMLElement;
  spot: Spot | null;
  layer: Layer | null;
  mood: Mood | null;
  raised: boolean | null;
  sweat: boolean | null;
}

export async function playDontWakeTheDog(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);

  // Back to front: the garden; the safe behind the fence; the fence, gate
  // and sign; whoever is behind the dog; the dog; those in front; whoever
  // is over everyone; every name tag; and the bubbles on top.
  const scene = show.stage.appendChild(garden());
  const layer = (name: string) => {
    const el = scene.appendChild(document.createElement('div'));
    el.className = styles.layer!;
    el.dataset.part = name;
    return el;
  };
  const behindFence = layer('behind-fence');
  const gate = drawFence();
  scene.append(gate.el);
  const board = drawSign();
  scene.append(board.el);
  const behindDog = layer('behind-dog');
  const sleeper = drawDog();
  sleeper.el.style.left = `${DOG_AT.x}px`;
  sleeper.el.style.top = `${DOG_AT.y}px`;
  scene.append(sleeper.el);
  const layers: Record<Layer, HTMLElement> = {
    fence: behindFence,
    dog: behindDog,
    front: layer('front'),
    top: layer('top'),
  };
  const tags = layer('tags');
  // The walk: the lead from the standing dog's collar to the unlucky
  // person's hand, and hearts over its head.
  const leash = drawLead();
  leash.el.style.visibility = 'hidden';
  layers.top.append(leash.el);
  const hearts = HEARTS.map(({ x, y }) => {
    const el = heart(DOG_AT.stand.x + x, DOG_AT.stand.y + y);
    el.style.visibility = 'hidden';
    return scene.appendChild(el);
  });
  const bubbles = layer('bubbles');

  // How the kit sets each tag, worked out once: as wide as the browser
  // draws it, or where nothing is drawn (jsdom), as the layout estimates.
  const sets = new Map<string, TagSet>();
  const setTag: SetTag = (name, fit) => {
    const key = `${name}|${fit.size}|${fit.maxWidth}`;
    let set = sets.get(key);
    if (!set) {
      const el = tags.appendChild(nameTagFor(name, fit));
      const kit = tagSetOf(name, el);
      set = { ...kit, width: el.offsetWidth || kit.width, height: el.offsetHeight || kit.height };
      el.remove();
      sets.set(key, set);
    }
    return set;
  };
  const places = placings(plan, setTag, show.reducedMotion);

  const people = new Map<string, Person>(
    plan.order.map((name) => {
      const el = document.createElement('div');
      el.className = styles.person!;
      el.dataset.person = name;
      const face = head(looks.get(name)!, { land: true, mood: 'calm' });
      el.append(face.el);
      const holder = tags.appendChild(document.createElement('div'));
      holder.className = styles.person!;
      holder.dataset.tagOf = name;
      const tag = holder.appendChild(nameTagFor(name, places.tag(name, 0)));
      const person: Person = {
        ...{ name, el, face, tag, holder },
        ...{ spot: null, layer: null, mood: null, raised: null, sweat: null },
      };
      return [name, person];
    }),
  );

  // The dog's head goes up for a sniff and stays up once it is awake: with
  // a bounce, or smoothly with reduced motion.
  const lifts = liftsOf(plan);
  const liftAt = (t: number) => {
    const span = lifts.findLast((each) => each.from <= t + 1e-9);
    if (!span) return 0;
    const shape = show.reducedMotion ? ease.calm : ease.lift;
    if (t < span.to) return Math.round(1000 * shape(Math.min(1, (t - span.from) / LIFTING))) / 1000;
    return Math.round(1000 * (1 - ease.calm(Math.min(1, (t - span.to) / LIFTING)))) / 1000;
  };

  // People's bubbles, moving with whoever says them.
  const following: {
    el: HTMLElement;
    name: string;
    offset: { dx: number; dy: number; lean: number };
    from: number;
    to: number;
  }[] = [];

  const draw = (t: number) => {
    for (const bubble of following) {
      if (t < bubble.from - 1e-9 || t > bubble.to + 1e-9) continue;
      const { x, y } = anchorBy(headBox(places.at(bubble.name, t).spot), bubble.offset);
      const left = `${x.toFixed(1)}px`;
      const top = `${y.toFixed(1)}px`;
      if (bubble.el.style.left !== left) bubble.el.style.left = left;
      if (bubble.el.style.top !== top) bubble.el.style.top = top;
    }
    for (const person of people.values()) {
      const { spot, layer: drawnIn } = places.at(person.name, t);
      if (drawnIn !== person.layer) {
        person.layer = drawnIn;
        person.el.dataset.layer = drawnIn;
        layers[drawnIn].append(person.el);
      }
      drawPerson(person, spot, places.tag(person.name, t));
      lookAs(person, moodAt(plan, person.name, t));
    }
    const { state, marks } = dogAt(plan, t);
    sleeper.set(state, liftAt(t), marks);
    // Up on its feet at the woof: a jump, then bounces, unless motion is reduced.
    const standing = state === 'stand';
    const rise = standing && !show.reducedMotion ? jumpAt(plan, t) : 0;
    const where = standing
      ? { x: DOG_AT.stand.x, y: DOG_AT.stand.y - rise }
      : { x: DOG_AT.x, y: DOG_AT.y };
    const left = `${where.x}px`;
    const top = `${where.y}px`;
    if (sleeper.el.style.left !== left) sleeper.el.style.left = left;
    if (sleeper.el.style.top !== top) sleeper.el.style.top = top;
    if (t >= plan.walkies - 1e-9) {
      board.say('Walkies!');
      const hand = {
        x: FRONT.x + ((HAND.x - 50) / 100) * FRONT.size,
        y: FRONT.y - 0.8 * FRONT.size + (HAND.y / 100) * FRONT.size,
      };
      leash.run({ x: where.x + COLLAR.x, y: where.y + COLLAR.y }, hand);
      for (const [k, el] of hearts.entries()) {
        const top = `${where.y + HEARTS[k]!.y}px`;
        if (el.style.top !== top) el.style.top = top;
      }
    } else {
      board.count(atRisk(plan, t).length);
    }
    const open = plan.turns.find(
      (turn) => turn.gate && t >= turn.gate.from - 1e-9 && t < turn.gate.to + SWING,
    );
    gate.swing(open?.gate ? swingAt(open.gate, t) : 0);
  };
  const clock = { t: 0 };
  timeline.to(
    clock,
    { t: plan.end, duration: plan.end, ease: 'none', onUpdate: () => draw(clock.t) },
    0,
  );
  draw(0);

  // It breathes slowly until it wakes: on the show's clock, outside the
  // timeline, which would otherwise never end.
  if (!show.reducedMotion) {
    const breathing = gsap.to(sleeper.body, {
      scaleY: 1 + BREATH.rise,
      svgOrigin: '190 164',
      duration: BREATH.seconds / 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    at(plan.wakes, () => {
      breathing.kill();
      gsap.set(sleeper.body, { scaleY: 1, svgOrigin: '190 164' });
    });
  }

  // Bubbles: each by whoever says it, clear of every face and name tag
  // while it is up, and of every other bubble up with it and the caption.
  // A person's moves with them, its tail over their head; where the row is
  // too full for that, over another bubble, about to go, else up against
  // the caption; only then beside them, its tail leaning towards them.
  const said: { boxAt: (t: number) => Box; from: number; to: number }[] = [];
  for (const saying of plan.says) {
    const until = saying.at + BUBBLE;
    const firmAt = (t: number) => [
      ...inTheWay(plan, places, t),
      dogFace(saying.at >= plan.woof - 1e-9),
      SIGN_BOX,
    ];
    const othersAt = (t: number) =>
      said.filter((other) => other.from <= t && t <= other.to).map((other) => other.boxAt(t));
    const person = saying.by !== 'dog' && saying.by !== 'gate';
    const tries = [
      (t: number) => [...firmAt(t), ...othersAt(t), ...captionsAt(plan, t)],
      (t: number) => [...firmAt(t), ...captionsAt(plan, t)],
      firmAt,
    ];
    let offset: { dx: number; dy: number; lean: number } | null = null;
    for (const where of ['over', 'beside'] as const) {
      for (const avoidAt of tries) {
        if (person && !offset) offset = byTheSpeaker(saying, places, avoidAt, where);
      }
    }
    const headAt = (t: number) => headBox(places.at(saying.by, t).spot);
    const fixed = offset
      ? null
      : bubbleAt(
          saying.text,
          preferFor(saying, places),
          times(saying.at, until).flatMap((t) => [...firmAt(t), ...othersAt(t)]),
        );
    const anchorAt = (t: number) => (offset ? anchorBy(headAt(t), offset) : fixed!);
    const lean = offset?.lean ?? 0;
    const el = bubbles.appendChild(
      bubble(saying.text, anchorAt(saying.at), {
        colour: saying.by === 'gate' || saying.text === 'Woof!' ? 'sun' : 'paper',
        lean,
      }),
    );
    el.dataset.part = 'bubble';
    el.dataset.by = saying.by;
    el.style.visibility = 'hidden';
    if (offset) following.push({ el, name: saying.by, offset, from: saying.at, to: until });
    said.push({
      boxAt: (t) => boxOfBubble(saying.text, anchorAt(t), lean),
      from: saying.at,
      to: until,
    });
    timeline.set(el, { visibility: 'visible' }, saying.at);
    if (!show.reducedMotion) timeline.add(popIn(el.firstElementChild!), saying.at);
    timeline.set(el, { visibility: 'hidden' }, until);
  }

  // Sounds: the dog's sniffs, mumbles and woof, the gate's creak and latch,
  // the heartbeat from the spotlight, the fanfare.
  for (const saying of plan.says) {
    const cue = SAID[saying.text];
    if (cue) at(saying.at, () => void show.sound.play(cue));
  }
  for (const { gate: swung } of plan.turns) {
    if (swung && swung.to + SWING <= plan.end) {
      at(swung.to + SWING, () => void show.sound.play('latch'));
    }
  }
  for (const time of plan.heartbeats) at(time, () => void show.sound.play('heartbeat'));
  at(plan.walkies, () => void show.sound.play('fanfare'));
  for (const el of [leash.el, ...hearts]) timeline.set(el, { visibility: 'visible' }, plan.walkies);
  if (!show.reducedMotion) timeline.add(popIn(hearts), plan.walkies);

  for (const { at: time, text } of plan.captions) at(time, () => show.caption(text));
  timeline.set({}, {}, plan.end);
  await show.play(timeline);
}

/** The sign's box, which bubbles keep clear of. */
const SIGN_BOX: Box = {
  left: SIGN.left,
  right: SIGN.left + SIGN.width + 5,
  top: SIGN.top,
  bottom: SIGN.top + SIGN.height + 5,
};

/** A bubble's box as `bubbleAt` or `bubbleBy` placed it, leaning `lean`. */
const boxOfBubble = (text: string, anchor: { x: number; y: number }, lean = 0): Box => {
  // The kit's estimate, as bubbleAt uses it.
  const font = 46;
  const half = (1.1 * (0.62 * font * [...text].length + 2 * (22 + 4))) / 2;
  const height = 1.1 * (22 + 1.1 * font + 2 * (6 + 4));
  return {
    left: anchor.x + lean - half,
    right: anchor.x + lean + half,
    top: anchor.y - height,
    bottom: anchor.y,
  };
};

/** The moments from `from` to `to`, SAMPLE apart, at which a bubble is checked clear. */
function times(from: number, to: number): number[] {
  const all: number[] = [];
  for (let t = from; t <= to + 1e-9; t += SAMPLE) all.push(t);
  return all;
}

/**
 * Every face and name tag at `t`, with MARGIN round each for how far they
 * move between samples.
 */
function inTheWay(plan: Plan, places: Places, t: number): Box[] {
  const padded = (box: Box): Box => ({
    left: box.left - MARGIN,
    right: box.right + MARGIN,
    top: box.top - MARGIN,
    bottom: box.bottom + MARGIN,
  });
  return plan.order.flatMap((name) => {
    const tag = places.tag(name, t);
    const face = padded(faceBox(places.at(name, t).spot));
    return tag.hidden ? [face] : [face, padded(tag.box)];
  });
}

/** The caption sticker's box at `t`. */
function captionsAt(plan: Plan, t: number): Box[] {
  const text = captionAt(plan, t);
  return text === null ? [] : [captionBox(text)];
}

/**
 * Where a person's bubble sits `where` they are while it is up, as
 * bubbleBy's offset, clear of `avoidAt` each moment; null when it can't.
 */
function byTheSpeaker(
  saying: Saying,
  places: Places,
  avoidAt: (t: number) => Box[],
  where: 'over' | 'beside',
) {
  const speaker = times(saying.at, saying.at + BUBBLE).map((t) => {
    const { spot } = places.at(saying.by, t);
    const tag = places.tag(saying.by, t);
    return {
      head: headBox(spot),
      face: faceBox(spot),
      tag: tag.hidden ? null : tag.box,
      avoid: avoidAt(t),
    };
  });
  return bubbleBy(saying.text, speaker, where);
}

/** Where a bubble would rather be: over its sayer's head, by the dog's nose, or by the gate. */
function preferFor(saying: Saying, places: Places): { x: number; y: number } {
  if (saying.by === 'dog') return saying.text === 'Woof!' ? { x: 800, y: 340 } : { x: 420, y: 404 };
  if (saying.by === 'gate') return { x: 840, y: 300 };
  const spot = places.at(saying.by, saying.at).spot;
  return { x: spot.x, y: spot.y - 0.8 * spot.size };
}

/** How high the standing dog is off the ground at `t`: its jump at the woof, then its bounces. */
function jumpAt(plan: Plan, t: number): number {
  const since = t - plan.woof;
  if (since < JUMP.up) return JUMP.jump * Math.sin((Math.PI * Math.max(0, since)) / JUMP.up);
  const bouncing = t - plan.walkies;
  if (bouncing < 0) return 0;
  return JUMP.bounce * Math.abs(Math.sin((Math.PI * bouncing) / JUMP.every));
}

/** While the dog's head is up: each sniff, and from its waking on. */
function liftsOf(plan: Plan): { from: number; to: number }[] {
  const spans = plan.turns
    .filter((turn) => turn.hold && turn.scare === 'sniff')
    .map((turn) => ({
      from: turn.hold!.from,
      to: turn.kind === 'last' ? Infinity : turn.hold!.to,
    }));
  if (!spans.some((span) => span.to === Infinity)) spans.push({ from: plan.wakes, to: Infinity });
  return spans.sort((a, b) => a.from - b.from);
}

/** How far open the gate is at `t` while it swings open from `gate.from` and back from `gate.to`. */
function swingAt(gate: { from: number; to: number }, t: number): number {
  const opening = Math.min(1, Math.max(0, (t - gate.from) / SWING));
  const closing = Math.min(1, Math.max(0, (t - gate.to) / SWING));
  return opening * (1 - closing);
}

/** Gives `person` the look `look` says, writing only what changes. */
function lookAs(person: Person, look: { mood: Mood; raised: boolean; sweat: boolean }) {
  if (look.mood !== person.mood) {
    person.face.setMood((person.mood = look.mood));
    person.el.dataset.mood = look.mood;
  }
  if (look.raised !== person.raised) {
    person.face.setRaised((person.raised = look.raised));
    person.el.dataset.raised = String(look.raised);
  }
  if (look.sweat !== person.sweat) {
    person.face.setSweat((person.sweat = look.sweat));
    person.el.dataset.sweat = String(look.sweat);
  }
}

/**
 * Draws `person` at `spot`, their head and their tag's holder, with their
 * tag as `tag` says. Styles are written only when they change.
 */
function drawPerson(person: Person, spot: Spot, tag: DrawnTag) {
  const was = person.spot;
  if (!was || was.x !== spot.x || was.y !== spot.y || was.size !== spot.size) {
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
  const visibility = tag.hidden ? 'hidden' : '';
  if (style.visibility !== visibility) style.visibility = visibility;
  const size = `${Math.round(tag.size * 10) / 10}px`;
  if (style.getPropertyValue('--tag-size') !== size) style.setProperty('--tag-size', size);
  const maxWidth = `${Math.round(tag.maxWidth)}px`;
  if (style.maxWidth !== maxWidth) style.maxWidth = maxWidth;
  const lines = String(tag.lines);
  if (dataset.lines !== lines) dataset.lines = lines;
  const left = tag.shift === 0 ? '50%' : `calc(50% + ${tag.shift}px)`;
  if (style.left !== left) style.left = left;
}
