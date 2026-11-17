// The director: plays the whole show off one clock. The plan says who sits
// when; the choreography says where everyone is at any time; this builds the
// stage, redraws it every frame, and sets off sounds and captions on cue.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  nameTag,
  pickOne,
  type Box,
  type Cue,
  type Head,
  type Show,
} from '../../scenario-kit';
import { choreograph, type Pose } from './choreo';
import { bubbleSpot, faceBox, LOUNGE, RINGS, seatTag, STOOLS, tagBox, THRONE_TAG } from './layout';
import { waltzMusic } from './music';
import { gramophone, note, room, spotlight, stool, throne } from './parts';
import styles from './musical-stools.module.css';
import { planShow, TUMBLE_LEAD } from './plan';

const SAYINGS = ['Hey!', 'Wait…', 'Whoa!', 'Oops!', 'Mine!'];
const ENCORE_SAYING = 'Again?!';
/** Seconds a bubble stays and how quickly it fades. */
const BUBBLE = { stay: 0.9, fade: 0.1, after: 0.05 };
const NOTES = 3;
const STEP = 0.05;

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  readonly tags: Map<string, HTMLElement>;
}

interface Saying {
  readonly el: HTMLElement;
  readonly from: number;
  readonly to: number;
}

const rounded = (value: number, digits = 1) => value.toFixed(digits);

const written = new WeakMap<Element, Map<string, string>>();

/** Sets `prop` on `el` only when it changes: the stage is redrawn every frame. */
function put(el: HTMLElement | SVGElement, prop: string, value: string) {
  let known = written.get(el);
  if (!known) written.set(el, (known = new Map()));
  if (known.get(prop) === value) return;
  known.set(prop, value);
  el.style.setProperty(prop, value);
}

export async function playMusicalStools(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const score = waltzMusic(plan);
  const music = show.sound.music(score.notes);
  const choreo = choreograph(plan, show.unlucky, score, show.reducedMotion);

  const timeline = gsap.timeline({
    paused: true,
    onUpdate: () => {
      const { beat, speed } = score.at(timeline.time());
      music.to(beat, speed);
    },
  });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));

  // The stage.
  const scene = document.createElement('div');
  scene.className = styles.scene!;
  show.stage.append(scene);
  show.stage.dataset.ending = plan.ending;
  show.stage.dataset.spotlight = 'off';
  scene.append(room());

  const player = gramophone();
  scene.append(player.el);
  const notes = Array.from({ length: NOTES }, () => scene.appendChild(note()));

  const stools = new Map<string, SVGSVGElement>();
  for (const count of [1, 2, 3]) {
    STOOLS[count]!.forEach((spot, k) => {
      const el = scene.appendChild(stool());
      el.style.left = `${spot.x - 65}px`;
      el.style.top = `${spot.y - 24}px`;
      stools.set(`${count}.${k}`, el);
    });
  }

  const seat = scene.appendChild(throne());
  const dark = scene.appendChild(spotlight());

  const people = new Map<string, Person>();
  for (const name of plan.ring) {
    const el = document.createElement('div');
    el.className = styles.person!;
    el.dataset.person = name;
    const face = head(looks.get(name)!, { land: true, mood: 'calm' });
    el.append(face.el);
    scene.append(el);
    const tags = new Map<string, HTMLElement>();
    for (const key of choreo.tagKeys(name)) {
      const spec =
        RINGS.find((each) => each.name === key) ??
        [1, 2, 3].map(seatTag).find((each) => each.name === key) ??
        THRONE_TAG;
      const size = spec.tag;
      const maxWidth = spec.tagWidth;
      const wrapper = document.createElement('div');
      wrapper.className = styles.tag!;
      wrapper.dataset.tagOf = name;
      wrapper.dataset.key = key;
      wrapper.append(nameTag(name, { size, maxWidth }));
      scene.append(wrapper);
      tags.set(key, wrapper);
    }
    people.set(name, { name, el, face, tags });
  }

  /** The name tag element behind `name`'s tag `key`, for measuring. */
  const tagNode = (name: string, key: string) =>
    people.get(name)!.tags.get(key)!.firstElementChild as HTMLElement;

  // What people say in the freeze after each stop, found by trying the poses
  // the show will take over the bubble's whole life, so it never covers a
  // face, a name or the caption.
  const sayings: Saying[] = [];
  const say = (speaker: string, text: string, from: number) => {
    const to = from + BUBBLE.stay;
    const avoid: Box[] = [];
    for (let t = from - STEP; t <= to + STEP; t += STEP) {
      for (const name of plan.ring) {
        const pose = choreo.pose(name, t);
        avoid.push(faceBox(pose, pose.size, 6));
        if (pose.tag && pose.tag.opacity > 0.05) {
          avoid.push(tagBox(name, tagNode(name, pose.tag.key), pose.tag.x, pose.tag.top));
        }
      }
    }
    const from0 = choreo.pose(speaker, from);
    const spot = bubbleSpot(text, faceBox(from0, from0.size), avoid);
    if (!spot) return;
    const el = bubble(text, spot);
    el.dataset.part = 'bubble';
    el.dataset.by = speaker;
    el.style.opacity = '0';
    el.style.zIndex = '900';
    scene.append(el);
    sayings.push({ el, from, to });
  };
  // Someone left standing reacts once the last sitter has landed.
  for (const round of plan.rounds) {
    if (round.kind === 'duel') continue;
    const standing = round.marchers.filter((name) => !round.sitters.includes(name));
    say(
      pickOne(standing, show.random),
      pickOne(SAYINGS, show.random),
      round.arrivals.at(-1)! + BUBBLE.after,
    );
  }
  if (plan.encoreAt !== null) say(show.unlucky, ENCORE_SAYING, plan.encoreAt + 0.05);

  const drawPerson = ({ el, face, tags }: Person, pose: Pose) => {
    const size = rounded(pose.size);
    put(el, 'left', `${rounded(pose.x)}px`);
    put(el, 'top', `${rounded(pose.y)}px`);
    put(el, 'width', `${size}px`);
    put(el, 'height', `${size}px`);
    put(el, 'margin-left', `${rounded(-pose.size / 2)}px`);
    put(el, 'margin-top', `${rounded(-0.44 * pose.size)}px`);
    const lounged = pose.state === 'safe' && pose.y < LOUNGE.y + 60;
    put(el, 'z-index', String(lounged ? 60 : Math.round(pose.y + 0.6 * pose.size)));
    put(el, '--bounce', `${rounded(pose.lift)}px`);
    put(el, '--tilt', `${rounded(pose.tilt)}deg`);
    if (el.dataset.state !== pose.state) el.dataset.state = pose.state;
    if (el.dataset.mood !== pose.mood) {
      el.dataset.mood = pose.mood;
      face.setMood(pose.mood);
    }
    const sweat = String(pose.sweat);
    if (el.dataset.sweat !== sweat) {
      el.dataset.sweat = sweat;
      face.setSweat(pose.sweat);
    }
    if (el.dataset.raised !== String(pose.raised)) {
      el.dataset.raised = String(pose.raised);
      face.setRaised(pose.raised);
    }
    for (const [key, wrapper] of tags) {
      const spot = pose.tag?.key === key ? pose.tag : null;
      put(wrapper, 'opacity', spot ? rounded(spot.opacity, 2) : '0');
      if (spot) {
        put(wrapper, 'left', `${rounded(spot.x)}px`);
        put(wrapper, 'top', `${rounded(spot.top)}px`);
      }
    }
  };

  const draw = (t: number) => {
    for (const person of people.values()) drawPerson(person, choreo.pose(person.name, t));

    for (const [id, el] of stools) {
      const [count, k] = id.split('.').map(Number) as [number, number];
      put(el, 'opacity', rounded(choreo.stool(count, k, t), 2));
    }

    const state = choreo.gramophone(t);
    if (player.el.dataset.state !== state) player.el.dataset.state = state;
    const beat = choreo.beat(t);
    if (state === 'playing') player.spin(beat);
    notes.forEach((el, k) => {
      const f = (beat / 6 + k / NOTES) % 1;
      put(el, 'opacity', rounded(state === 'playing' ? Math.sin(Math.PI * f) * 0.9 : 0, 2));
      put(el, 'left', `${rounded(150 + 44 * k + 10 * Math.sin(6 * f + k))}px`);
      put(el, 'top', `${rounded(132 - 56 * f)}px`);
    });

    const lit = t >= plan.spotlight && t < plan.fanfare ? 'on' : 'off';
    if (show.stage.dataset.spotlight !== lit) show.stage.dataset.spotlight = lit;
    put(dark, 'opacity', rounded(choreo.spotlight(t), 2));

    const rise = choreo.throne(t);
    put(seat, 'opacity', rounded(rise, 2));
    put(
      seat,
      'transform',
      show.reducedMotion ? 'none' : `translateY(${rounded((1 - rise) * -160)}px)`,
    );

    for (const saying of sayings) {
      const u = Math.min((t - saying.from) / BUBBLE.fade, (saying.to - t) / BUBBLE.fade, 1);
      put(saying.el, 'opacity', rounded(Math.max(0, u), 2));
    }
  };

  // Sounds and captions.
  cue(0.7, 'latch');
  for (const round of plan.rounds) {
    for (const stutter of round.stutters) cue(stutter.at, 'creak');
    cue(round.stop, 'latch');
    round.arrivals.forEach((time) => cue(time, 'thunk'));
  }
  for (const time of plan.heartbeats) cue(time, 'heartbeat');
  const duel = plan.rounds.at(-1)!;
  if (plan.ending === 'hip-bump') cue(duel.arrivals[0]! - TUMBLE_LEAD, 'tumble');
  cue(plan.fanfare, 'fanfare');
  for (const { at: time, text } of plan.captions) at(time, () => show.caption(text));

  draw(0);
  const clock = { t: 0 };
  timeline.to(
    clock,
    { t: plan.end, duration: plan.end, ease: 'none', onUpdate: () => draw(clock.t) },
    0,
  );
  timeline.set({}, {}, plan.end);

  await show.play(timeline);
}
