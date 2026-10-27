// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where everyone is, how the dog looks and what the
// sign says are worked out from the show's time each frame, so every frame
// follows from the plan alone. The stage tells its story in data attributes
// too: the dog's state and marks, the gate's swing, how many are at risk, and
// each person's place and layer.

import { gsap } from 'gsap';
import { handOutLooks, head, type Head, type Show } from '../../scenario-kit';
import { DOG_AT, dog as drawDog, fence as drawFence, garden, sign as drawSign } from './parts';
import {
  nameTagFor,
  placings,
  tagSetOf,
  type DrawnTag,
  type Layer,
  type SetTag,
  type Spot,
  type TagSet,
} from './layout';
import { atRisk, dogAt, planShow } from './plan';
import styles from './dont-wake-the-dog.module.css';

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  /** Their name tag, in a holder the size and place of their head, in the tags' layer. */
  readonly tag: HTMLElement;
  readonly holder: HTMLElement;
  spot: Spot | null;
  layer: Layer | null;
}

export async function playDontWakeTheDog(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);

  // Back to front: the garden; the safe behind the fence; the fence, gate
  // and sign; whoever is behind the dog; the dog; those in front; whoever
  // is over everyone; and every name tag on top.
  const scene = show.stage.appendChild(garden());
  const layer = (name: string) => {
    const el = scene.appendChild(document.createElement('div'));
    el.className = styles.layer!;
    el.dataset.part = name;
    return el;
  };
  const layers: Record<Layer, HTMLElement> = {
    fence: layer('behind-fence'),
    dog: null!,
    front: null!,
    top: null!,
  };
  const gate = drawFence();
  scene.append(gate.el);
  const board = drawSign();
  scene.append(board.el);
  layers.dog = layer('behind-dog');
  const sleeper = drawDog();
  sleeper.el.style.left = `${DOG_AT.x}px`;
  sleeper.el.style.top = `${DOG_AT.y}px`;
  scene.append(sleeper.el);
  layers.front = layer('front');
  layers.top = layer('top');
  const tags = layer('tags');

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
      const tag = holder.appendChild(nameTagFor(name, places.tag(name, 0)));
      return [name, { name, el, face, tag, holder, spot: null, layer: null }];
    }),
  );

  const draw = (t: number) => {
    for (const person of people.values()) {
      const { spot, layer: drawnIn } = places.at(person.name, t);
      if (drawnIn !== person.layer) {
        person.layer = drawnIn;
        person.el.dataset.layer = drawnIn;
        layers[drawnIn].append(person.el);
      }
      drawPerson(person, spot, places.tag(person.name, t));
    }
    const { state, lift, marks } = dogAt(plan, t);
    sleeper.set(state, lift ? 1 : 0, marks);
    board.count(atRisk(plan, t).length);
    const open = plan.turns.find(
      (turn) => turn.gate && t >= turn.gate.from - 1e-9 && t < turn.gate.to + 0.3,
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

  for (const { at: time, text } of plan.captions) at(time, () => show.caption(text));
  timeline.set({}, {}, plan.end);
  await show.play(timeline);
}

/** How far open the gate is at `t` while it swings open from `gate.from` and back from `gate.to`. */
function swingAt(gate: { from: number; to: number }, t: number): number {
  const opening = Math.min(1, Math.max(0, (t - gate.from) / 0.3));
  const closing = Math.min(1, Math.max(0, (t - gate.to) / 0.3));
  return opening * (1 - closing);
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
  const size = `${Math.round(tag.size * 10) / 10}px`;
  if (style.getPropertyValue('--tag-size') !== size) style.setProperty('--tag-size', size);
  const maxWidth = `${Math.round(tag.maxWidth)}px`;
  if (style.maxWidth !== maxWidth) style.maxWidth = maxWidth;
  const lines = String(tag.lines);
  if (dataset.lines !== lines) dataset.lines = lines;
  const left = tag.shift === 0 ? '50%' : `calc(50% + ${tag.shift}px)`;
  if (style.left !== left) style.left = left;
}
