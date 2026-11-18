// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where the claw and everyone are, how they look,
// what the plaque says and whether the prize door is open are worked out from
// the show's time each frame, so every frame follows from the plan alone. The
// stage tells its story in data attributes too: the claw's pose, marks and
// place, and each person's layer, mood, arms, sweat and bow.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  popIn,
  speechBox,
  type Box,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  anchorBy,
  bubbleAt,
  bubbleBy,
  captionBox,
  clawAt,
  faceBox,
  headBox,
  nameTagFor,
  overlap,
  placings,
  tagSetOf,
  TUMBLE,
  type DrawnTag,
  type Layer,
  type Places,
  type SetTag,
  type Spot,
  type TagSet,
} from './layout';
import { clawMusic } from './music';
import { atRiskAt, captionAt, moodAt, planShow, type Plan, type Saying } from './plan';
import {
  chute as drawChute,
  claw as drawClaw,
  lines as drawLines,
  logo,
  machine,
  plaque as drawPlaque,
  plush,
  sign,
  SIGN,
  sparkles as drawSparkles,
  type Plush,
} from './parts';
import styles from './the-claw.module.css';

/** The chute rumbles this far, this many times a second. */
const RUMBLE = { px: 3, hz: 14 } as const;
/** Speed lines: how long, how far apart, and how far behind whoever flies. */
const SPEED = { length: 56, apart: 0.24, behind: 0.6 } as const;
/** Seconds between the moments a bubble is checked clear of what moves round it. */
const SAMPLE = 0.1;
/** Stage pixels a bubble keeps clear of faces and tags, for how far they move between samples. */
const MARGIN = 8;
/** The plaque and the logo on the base, which bubbles keep clear of. */
const BASE: Box = { left: 36, right: 560, top: 670, bottom: 720 };
const SIGN_BOX: Box = {
  left: SIGN.left,
  right: SIGN.left + SIGN.width + 5,
  top: SIGN.top,
  bottom: SIGN.top + SIGN.height + 5,
};

interface Person {
  readonly name: string;
  readonly drawn: Plush;
  readonly tag: HTMLElement;
  readonly holder: HTMLElement;
  spot: Spot | null;
  layer: Layer | null;
  gone: boolean | null;
  mood: Mood | null;
  raised: boolean | null;
  sweat: boolean | null;
  bow: boolean | null;
}

export async function playTheClaw(show: Show): Promise<void> {
  // Drawn first from the show's random numbers, so a seed gives the same show.
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random, show.photos);
  const calm = show.reducedMotion;
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);

  // Back to front: the stall and its sign; the pile and the shelf; whoever
  // falls into the chute; the chute's front; the plaque and the logo; the
  // trolley and the cable; the claw's prong; whoever it holds; its fingers
  // and hub; speed lines; whoever is in the air, on the rim or the prize;
  // the sparkles; every name tag; and the bubbles on top.
  const scene = show.stage.appendChild(machine(plan.people));
  scene.append(sign());
  const layer = (name: string) => {
    const el = scene.appendChild(document.createElement('div'));
    el.className = styles.layer!;
    el.dataset.part = name;
    return el;
  };
  const layers = {} as Record<Layer, HTMLElement>;
  layers.pile = layer('pile');
  layers.chute = layer('in-chute');
  const front = drawChute();
  scene.append(front.el);
  const board = drawPlaque();
  scene.append(board.el, logo());
  const claw = drawClaw();
  scene.append(claw.trolley, claw.back);
  layers.held = layer('held');
  scene.append(claw.front);
  const speed = drawLines();
  scene.append(speed.el);
  layers.top = layer('top');
  const sparkles = drawSparkles();
  for (const el of sparkles) el.style.visibility = 'hidden';
  scene.append(...sparkles);
  const tags = layer('tags');
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
  const places = placings(plan, setTag, calm);
  const everyone = [...plan.seats.keys()];

  const people = new Map<string, Person>(
    everyone.map((name) => {
      const drawn = plush(looks.get(name)!);
      drawn.el.dataset.person = name;
      const holder = tags.appendChild(document.createElement('div'));
      holder.className = styles.holder!;
      holder.dataset.tagOf = name;
      const tag = holder.appendChild(nameTagFor(name, places.tag(name, 0)));
      const person: Person = {
        ...{ name, drawn, tag, holder },
        ...{
          spot: null,
          layer: null,
          gone: null,
          mood: null,
          raised: null,
          sweat: null,
          bow: null,
        },
      };
      return [name, person];
    }),
  );

  const draw = (t: number) => {
    claw.set(clawAt(plan, t, calm));
    for (const person of people.values()) {
      const { spot, layer: drawnIn, gone } = places.at(person.name, t);
      if (drawnIn !== person.layer) {
        person.layer = drawnIn;
        person.drawn.el.dataset.layer = drawnIn;
        layers[drawnIn].append(person.drawn.el);
      }
      if (gone !== person.gone) {
        person.gone = gone;
        person.drawn.el.style.visibility = gone ? 'hidden' : '';
      }
      drawPerson(person, spot, places.tag(person.name, t));
      lookAs(
        person,
        moodAt(plan, person.name, t),
        t >= plan.doorOpens - 1e-9 && person.name === plan.unlucky,
      );
    }
    if (t >= plan.prize - 1e-9) board.win();
    else board.count(atRiskAt(plan, t));
    front.door(t >= plan.doorOpens - 1e-9);
    const rumbling = !calm && t >= plan.fall.to && t < plan.doorOpens;
    front.rumble(rumbling ? RUMBLE.px * Math.sin(2 * Math.PI * RUMBLE.hz * (t - plan.fall.to)) : 0);
    speed.set(calm ? null : speedLines(plan, places, t));
  };
  // The music moves along with the show's time, as everything else does.
  const score = clawMusic(plan);
  const music = show.sound.music(score.notes);
  const clock = { t: 0 };
  timeline.to(
    clock,
    {
      t: plan.end,
      duration: plan.end,
      ease: 'none',
      onUpdate: () => {
        draw(clock.t);
        const { beat, speed } = score.at(clock.t);
        music.to(beat, speed);
      },
    },
    0,
  );
  draw(0);

  // Bubbles: each by whoever says it, clear of every face and name tag
  // while it is up, of every other bubble up with it, the caption, the sign
  // and the base. A person's sits over their head, its tail pointing down at
  // it; where that is full, beside them, leaning towards them; the claw's
  // and the chute's where the canvas has them.
  const said: { box: Box; from: number; to: number }[] = [];
  for (const saying of plan.says) {
    const others = said
      .filter((other) => other.from < saying.to && saying.at < other.to)
      .map((other) => other.box);
    const firmAt = (t: number) => [...inTheWay(everyone, places, t), SIGN_BOX, BASE];
    const tries = [
      (t: number) => [...firmAt(t), ...others, ...captionsAt(plan, t)],
      (t: number) => [...firmAt(t), ...others],
    ];
    let offset: { dx: number; dy: number; lean: number } | null = null;
    if (saying.by !== 'claw' && saying.by !== 'chute') {
      for (const where of ['over', 'beside'] as const) {
        for (const avoidAt of tries) {
          offset ??= bubbleBy(saying.text, speakerAt(places, saying, avoidAt), where);
        }
      }
    }
    const lean = offset?.lean ?? 0;
    const anchor = offset
      ? anchorBy(headBox(places.at(saying.by, saying.at).spot), offset)
      : bubbleAt(
          saying.text,
          preferFor(plan, places, saying),
          sampled(saying.at, saying.to).flatMap((t) => tries[0]!(t)),
        );
    const el = bubbles.appendChild(
      bubble(saying.text, anchor, {
        colour: saying.by === 'claw' || saying.by === 'chute' ? 'sun' : 'paper',
        lean,
      }),
    );
    el.dataset.part = 'bubble';
    el.dataset.by = saying.by;
    el.style.visibility = 'hidden';
    said.push({ box: speechBox(saying.text, anchor, lean), from: saying.at, to: saying.to });
    timeline.set(el, { visibility: 'visible' }, saying.at);
    if (!calm) timeline.add(popIn(el.firstElementChild!), saying.at);
    if (saying.to < plan.end) timeline.set(el, { visibility: 'hidden' }, saying.to);
  }

  // The prize's sparkles, but any that would cover someone's face or tag.
  const settledAt = Math.min(plan.end, plan.prize + 0.5);
  const others = inTheWay(
    everyone.filter((name) => name !== plan.unlucky),
    places,
    settledAt,
  );
  const shining = sparkles.filter((el) => {
    const [left, top] = [Number.parseFloat(el.style.left), Number.parseFloat(el.style.top)];
    const size = Number.parseFloat(el.style.width);
    const box = { left, top, right: left + size, bottom: top + size };
    return !others.some((other) => overlap(box, other));
  });
  for (const el of shining) timeline.set(el, { visibility: 'visible' }, plan.prize);
  if (!calm && shining.length > 0) timeline.add(popIn(shining), plan.prize);

  for (const { at: time, cue } of plan.cues) at(time, () => void show.sound.play(cue));
  for (const { at: time, text } of plan.captions) at(time, () => show.caption(text));
  timeline.set({}, {}, plan.end);
  await show.play(timeline);
}

/** Whoever says `saying`, at each moment it is up: their head, face and tag, and what to keep clear of. */
function speakerAt(places: Places, saying: Saying, avoidAt: (t: number) => Box[]) {
  return sampled(saying.at, saying.to).map((t) => {
    const { spot } = places.at(saying.by, t);
    const tag = places.tag(saying.by, t);
    return {
      head: headBox(spot),
      face: faceBox(spot),
      tag: tag.hidden ? null : tag.box,
      avoid: avoidAt(t),
    };
  });
}

/** The moments from `from` to `to`, SAMPLE apart, at which a bubble is checked clear. */
function sampled(from: number, to: number): number[] {
  const all: number[] = [];
  for (let t = from; t <= to + 1e-9; t += SAMPLE) all.push(t);
  return all;
}

/** Every face and visible name tag at `t`, with MARGIN round each. */
function inTheWay(everyone: readonly string[], places: Places, t: number): Box[] {
  const padded = (box: Box): Box => ({
    left: box.left - MARGIN,
    right: box.right + MARGIN,
    top: box.top - MARGIN,
    bottom: box.bottom + MARGIN,
  });
  return everyone.flatMap((name) => {
    const { spot, gone } = places.at(name, t);
    if (gone) return [];
    const tag = places.tag(name, t);
    const face = padded(faceBox(spot));
    return tag.hidden ? [face] : [face, padded(tag.box)];
  });
}

/** The caption sticker's box at `t`. */
function captionsAt(plan: Plan, t: number): Box[] {
  const text = captionAt(plan, t);
  return text === null ? [] : [captionBox(text)];
}

/**
 * Where a bubble would rather be: over its sayer's head for a "Phew!",
 * right of whoever slips a notch, left of the claw for "Click!", over the
 * prize for "Ta-da!".
 */
function preferFor(plan: Plan, places: Places, saying: Saying): { x: number; y: number } {
  if (saying.by === 'chute') return { x: 730, y: 502 };
  if (saying.by === 'claw') {
    const claw = clawAt(plan, saying.at);
    return { x: claw.x - 230, y: claw.hub + 78 };
  }
  const { spot } = places.at(saying.by, saying.at);
  if (saying.text === 'Eek!') return { x: spot.x + 155, y: spot.top };
  return { x: spot.x, y: spot.top - 0.05 * spot.size };
}

/**
 * Speed lines at `t`: three behind whoever tumbles through the air, and
 * three over whoever falls into the chute; null when nobody does.
 */
function speedLines(plan: Plan, places: Places, t: number): string | null {
  let d = '';
  const behind = (spot: Spot, was: Spot) => {
    const [vx, vy] = [spot.x - was.x, spot.top - was.top];
    const speed = Math.hypot(vx, vy);
    if (speed < 1e-6) return;
    const [ux, uy] = [vx / speed, vy / speed];
    const centre = { x: spot.x, y: spot.top + spot.size / 2 };
    for (const k of [-1, 0, 1]) {
      const sx = centre.x - ux * SPEED.behind * spot.size - uy * k * SPEED.apart * spot.size;
      const sy = centre.y - uy * SPEED.behind * spot.size + ux * k * SPEED.apart * spot.size;
      const length = SPEED.length * (k === 0 ? 1 : 0.8);
      d += `M${sx.toFixed(1)} ${sy.toFixed(1)} L${(sx - ux * length).toFixed(1)} ${(sy - uy * length).toFixed(1)} `;
    }
  };
  for (const flight of plan.flights) {
    if (flight.off !== 'claw' || t < flight.from || t >= flight.from + TUMBLE) continue;
    behind(
      places.at(flight.by, t).spot,
      places.at(flight.by, Math.max(flight.from, t - 0.03)).spot,
    );
  }
  if (t >= plan.fall.from && t < plan.fall.to) {
    behind(
      places.at(plan.unlucky, t).spot,
      places.at(plan.unlucky, Math.max(plan.fall.from, t - 0.03)).spot,
    );
  }
  return d ? d.trim() : null;
}

/** Gives `person` the look `look` says, and the bow when `bow`, writing only what changes. */
function lookAs(
  person: Person,
  look: { mood: Mood; raised: boolean; sweat: boolean },
  bow: boolean,
) {
  const { drawn } = person;
  if (look.mood !== person.mood) {
    drawn.setMood((person.mood = look.mood));
    drawn.el.dataset.mood = look.mood;
  }
  if (look.raised !== person.raised) {
    drawn.setRaised((person.raised = look.raised));
    drawn.el.dataset.raised = String(look.raised);
  }
  if (look.sweat !== person.sweat) {
    drawn.setSweat((person.sweat = look.sweat));
    drawn.el.dataset.sweat = String(look.sweat);
  }
  if (bow !== person.bow) {
    drawn.setBow((person.bow = bow));
    drawn.el.dataset.bow = String(bow);
  }
}

/**
 * Draws `person` at `spot`, turned and squashed as it says, with their tag
 * as `tag` says, upright. Styles are written only when they change.
 */
function drawPerson(person: Person, spot: Spot, tag: DrawnTag) {
  const was = person.spot;
  const { style } = person.drawn.el;
  if (!was || was.x !== spot.x || was.top !== spot.top || was.size !== spot.size) {
    style.left = `${(spot.x - spot.size / 2).toFixed(1)}px`;
    style.top = `${spot.top.toFixed(1)}px`;
    style.width = style.height = `${spot.size.toFixed(1)}px`;
  }
  if (!was || was.rot !== spot.rot || was.squash !== spot.squash) {
    style.rotate = spot.rot === 0 ? '' : `${spot.rot.toFixed(1)}deg`;
    style.scale =
      spot.squash === 1 ? '' : `${(2 - spot.squash).toFixed(3)} ${spot.squash.toFixed(3)}`;
    style.transformOrigin = spot.squash === 1 ? '' : '50% 116%';
  }
  person.spot = spot;
  const holder = person.holder.style;
  const left = `${tag.holder.left.toFixed(1)}px`;
  const top = `${tag.holder.top.toFixed(1)}px`;
  const size = `${tag.holder.size.toFixed(1)}px`;
  if (holder.left !== left) holder.left = left;
  if (holder.top !== top) holder.top = top;
  if (holder.width !== size) holder.width = holder.height = size;
  const { style: tagStyle, dataset } = person.tag;
  const visibility = tag.hidden ? 'hidden' : '';
  if (tagStyle.visibility !== visibility) tagStyle.visibility = visibility;
  const tagSize = `${Math.round(tag.size * 10) / 10}px`;
  if (tagStyle.getPropertyValue('--tag-size') !== tagSize)
    tagStyle.setProperty('--tag-size', tagSize);
  const maxWidth = `${Math.round(tag.maxWidth)}px`;
  if (tagStyle.maxWidth !== maxWidth) tagStyle.maxWidth = maxWidth;
  const lines = String(tag.lines);
  if (dataset.lines !== lines) dataset.lines = lines;
}
