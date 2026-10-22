// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. The plan says who catches the potato when; this
// says how it looks. The stage tells its story in data attributes too: the
// scene's beat, who holds the potato, who is still in play, and each mood.

import { gsap } from 'gsap';
import {
  handOutLooks,
  head,
  nameTag,
  shake,
  type Cue,
  type Head,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import { held, outOfPlay, POTATO, ring, type Spot } from './layout';
import { field, potato as drawPotato } from './parts';
import { BEATS, planShow, type Beat, type Catch } from './plan';
import styles from './hot-potato.module.css';

/** Where the plop drops in from, above the stage. */
const DROP_Y = -160;
/** How high a throw rises over the higher of its two ends, plus a share of its length. */
const ARC = { rise: 120, share: 0.25 };
/** How far the boomerang swings out towards the middle of the ring, and how high. */
const BOOMERANG = { reach: 420, rise: 300 };
/** The middle of the ring, for which way the boomerang swings. */
const MIDDLE = { x: 640, y: 450 };
/** Seconds for those out of play to step back. */
const STEP_BACK = 0.4;

type Phase = 'throws' | 'dud' | 'relight' | 'showdown';

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly face: Head;
  readonly spot: Spot;
}

export async function playHotPotato(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random);
  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));

  const scene = field();
  show.stage.append(scene);

  // Everyone at their spot in the ring, back to front so the front stands over the back.
  const spots = ring(plan.ring.length);
  const people = new Map<string, Person>(
    plan.ring.map((name, index) => [name, createPerson(name, looks.get(name)!, spots[index]!)]),
  );
  for (const person of [...people.values()].sort((a, b) => a.spot.y - b.spot.y)) {
    scene.append(person.el);
  }

  const potato = drawPotato();
  potato.el.classList.add(styles.potato);
  potato.el.dataset.holder = '';
  scene.append(potato.el);
  const scale = plan.ring.length === 2 ? POTATO.pairScale : 1;
  const place = (point: { x: number; y: number }) => ({
    x: point.x - POTATO.width / 2,
    y: point.y - POTATO.height / 2,
  });
  const over = (name: string) => held(people.get(name)!.spot);
  const first = plan.catches[0]!;
  gsap.set(potato.el, { ...place({ x: over(first.by).x, y: DROP_Y }), scale });
  const setX = gsap.quickSetter(potato.el, 'x', 'px') as (value: number) => void;
  const setY = gsap.quickSetter(potato.el, 'y', 'px') as (value: number) => void;

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

  // Who holds it, who it's flying to, what's going on and who is out: the
  // moods follow from these. Whoever has it, or has it coming, braces for it.
  let holder = '';
  let coming = first.by;
  let phase: Phase = 'throws';
  const out = new Set<string>();
  const refresh = () => {
    potato.el.dataset.holder = holder;
    for (const { name, el, face } of people.values()) {
      const inPlay = !out.has(name);
      const braced = name === holder || name === coming;
      const mood: Mood =
        phase === 'dud' || !inPlay ? 'happy' : phase === 'relight' || braced ? 'scared' : 'worried';
      el.dataset.inPlay = String(inPlay);
      el.dataset.mood = mood;
      face.setMood(mood);
      face.setRaised(braced);
      face.setSweat(inPlay && (braced || phase === 'showdown'));
    }
  };
  /** From `time` it's in `name`'s hands, or flying to them when `flying`. */
  const hold = (time: number, name: string, flying = false) =>
    at(time, () => {
      holder = flying ? '' : name;
      coming = flying ? name : '';
      refresh();
    });
  const enter = (time: number, next: Phase) =>
    at(time, () => {
      phase = next;
      refresh();
    });
  refresh();

  // The sparkler hisses from the plop to the pop, except while it's out.
  let stopSizzle = () => {};
  const sizzle = (time: number, on: boolean) =>
    at(time, () => {
      stopSizzle();
      stopSizzle = on ? show.sound.play('sizzle') : () => {};
    });

  // The sparkler burns down evenly from one catch's length to the next.
  const spark = { left: 1 };
  const burn = (from: number, to: number, left: number) =>
    timeline.to(
      spark,
      {
        left,
        duration: Math.max(0, to - from),
        ease: 'none',
        onUpdate: () => potato.setSparkler(spark.left),
      },
      from,
    );

  // The plop: it drops in from above onto the first catcher, shocked.
  at(0, () => potato.setFace('shocked'));
  sizzle(0, true);
  timeline.to(potato.el, { y: place(over(first.by)).y, duration: first.at, ease: 'bounce.out' }, 0);
  hold(first.at, first.by);

  let previous = first;
  for (const each of plan.catches.slice(1)) {
    // With the dud, the sparkler waits at its relit length until the showdown.
    const relit = plan.dud && each.beat === 'showdown' && previous.beat === 'hot-hands';
    burn(relit ? starts.showdown : previous.at, each.at, each.sparkler);
    hold(each.thrown, each.by, true);
    cue(each.thrown, 'whoosh');
    fly(each);
    hold(each.at, each.by);
    if (each.beat === 'hot-hands') timeline.add(shake(people.get(each.by)!.el, show), each.at);
    previous = each;
  }

  // Hot hands: nervous, steaming.
  at(starts['hot-hands'], () => {
    potato.setFace('nervous');
    potato.setSteam(true);
  });

  // The dud: it goes out and everyone relaxes, then it relights, shorter.
  if (plan.dud) {
    const { dud } = plan;
    at(starts.dud, () => {
      potato.setLit(false);
      potato.setSteam(false);
      potato.setFace('relieved');
    });
    enter(starts.dud, 'dud');
    sizzle(starts.dud, false);
    at(starts.relight, () => {
      potato.setLit(true);
      potato.setFlare(true);
      potato.setFace('shocked');
      spark.left = dud.relit;
      potato.setSparkler(dud.relit);
    });
    enter(starts.relight, 'relight');
    sizzle(starts.relight, true);
  }

  // The showdown: everyone else steps back, smaller and relieved.
  at(starts.showdown, () => {
    potato.setFlare(false);
    potato.setSteam(false);
    potato.setFace('nervous');
    for (const name of plan.ring) if (!plan.showdown.includes(name)) out.add(name);
  });
  enter(starts.showdown, 'showdown');
  cue(starts.showdown, 'heartbeat');
  for (const person of people.values()) {
    if (plan.showdown.includes(person.name)) continue;
    const smaller = outOfPlay(person.spot).size / person.spot.size;
    timeline.to(
      person.el,
      { scale: smaller, duration: STEP_BACK, ease: 'power2.out' },
      starts.showdown,
    );
  }

  // The boomerang leaves the unlucky person smug.
  if (plan.twist === 'boomerang') at(starts['last-throw'], () => potato.setFace('smug'));

  // The freeze: nothing moves but the face, squeezed shut on the last spark.
  at(starts.freeze, () => potato.setFace('squeezed'));

  // The pop (a stand-in for now): the sizzle stops and the potato is gone.
  sizzle(starts.pop, false);
  cue(starts.pop, 'pop');
  timeline.set(potato.el, { autoAlpha: 0 }, starts.pop);
  timeline.set({}, {}, total);

  try {
    await show.play(timeline);
  } finally {
    stopSizzle();
  }

  /** One throw, in an arc over the ring, or the boomerang's loop out and back. */
  function fly(each: Catch) {
    const from = over(each.from!);
    const to = over(each.by);
    let c1: { x: number; y: number };
    let c2: { x: number; y: number };
    if (each.from === each.by) {
      const dx = MIDDLE.x - from.x;
      const dy = MIDDLE.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const reach = { x: (BOOMERANG.reach * dx) / length, y: (BOOMERANG.reach * dy) / length };
      c1 = { x: from.x + reach.x, y: from.y + reach.y - BOOMERANG.rise };
      c2 = { x: from.x + reach.x, y: from.y + reach.y + BOOMERANG.rise / 3 };
    } else {
      const top =
        Math.min(from.y, to.y) - ARC.rise - ARC.share * Math.hypot(to.x - from.x, to.y - from.y);
      c1 = { x: from.x, y: top };
      c2 = { x: to.x, y: top };
    }
    const path = { t: 0 };
    timeline.fromTo(
      path,
      { t: 0 },
      {
        t: 1,
        duration: each.at - each.thrown,
        ease: 'power1.inOut',
        immediateRender: false,
        onUpdate: () => {
          const point = bezier(path.t, from, c1, c2, to);
          setX(point.x - POTATO.width / 2);
          setY(point.y - POTATO.height / 2);
        },
      },
      each.thrown,
    );
  }
}

/** A point `t` of the way along a cubic Bézier curve. */
function bezier(t: number, ...[a, b, c, d]: { x: number; y: number }[]): { x: number; y: number } {
  const u = 1 - t;
  const along = (key: 'x' | 'y') =>
    u * u * u * a![key] + 3 * u * u * t * b![key] + 3 * u * t * t * c![key] + t * t * t * d![key];
  return { x: along('x'), y: along('y') };
}

/** Someone in the ring: their head on land and their name on their chest, standing at `spot`. */
function createPerson(name: string, look: Look, spot: Spot): Person {
  const el = document.createElement('div');
  el.className = styles.person;
  el.dataset.person = name;
  el.style.left = `${spot.x - spot.size / 2}px`;
  el.style.top = `${spot.y - 0.8 * spot.size}px`;
  el.style.width = `${spot.size}px`;
  el.style.height = `${spot.size}px`;
  const face = head(look, { land: true, mood: 'worried' });
  face.el.setAttribute('width', String(spot.size));
  face.el.setAttribute('height', String(spot.size));
  el.append(face.el, nameTag(name, { ...spot.tag, chest: true }));
  return { name, el, face, spot };
}
