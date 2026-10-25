// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. The plan says who catches the potato when; this
// says how it looks. The stage tells its story in data attributes too: the
// scene's beat, who holds the potato, who sits and who has grown, each mood,
// and what's left of the fuse.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  nameTag,
  popIn,
  shake,
  speechAt,
  speechBox,
  type Cue,
  type Head,
  type Look,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  bezier,
  crowned,
  CROWNED,
  grown,
  GROWN,
  hang,
  headBox,
  held,
  heldOut,
  highest,
  nameBox,
  overlap,
  POTATO,
  potatoBox,
  ring,
  seated,
  SITTING,
  sittingHead,
  throwPath,
  type Box,
  type Path,
  type Point,
  type Spot,
} from './layout';
import { burst, confetti, crown, field, fuse as drawFuse, potato as drawPotato } from './parts';
import { BEATS, planShow, type Beat, type Catch, type Ending } from './plan';
import styles from './hot-potato.module.css';

/** Where the plop drops in from, above the stage. */
const DROP_Y = -160;
/** Seconds a gag bubble stays up. */
const BUBBLE = 0.8;
/** The fewest seconds between two "Hot! Hot! Hot!" bubbles. */
const HOT_GAP = 1.0;
/** Bits of confetti in the pop, and seconds they fly out and then fall. */
const CONFETTI = { count: 36, out: 0.45, fall: 1.4 };
/** Seconds the unlucky person takes to grow at the pop. */
const GROW = 0.5;
/** Seconds to sit down, and for the last three to grow. */
const SIT = 0.4;
const GROW_THREE = 0.4;
/** The fuse's spark grows to `scale` and back, `half` seconds each way: 2.5 pulses a second. */
const PULSE = { scale: 1.25, half: 0.2 };
/** Seconds of the kit's shake. */
const SHAKE = 0.4;
/** Seconds into the last second when holding on, the potato starts to be held out. */
const HOLD_OUT = 0.5;
/** How far the second leans in towards the third, holding on, before it pops. */
const LEAN = 50;
/** How far the control points of the hang's drift reach above its top: it floats up 3/4 of this. */
const DRIFT = 16;
/** The caption a second before the pop. */
const ENDING_CAPTION: Readonly<Record<Ending, string>> = {
  'holding-on': 'Pass it!',
  'too-hot': 'Too hot!',
  hangs: 'Which way…?',
  strays: 'Too hot!',
};

type Phase = 'passing' | 'gasp' | 'ending';

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
  const caption = (time: number, text: string) => at(time, () => show.caption(text));
  const count = plan.ring.length;

  /** When each part starts, in show seconds. */
  const starts = {} as Record<Beat, number>;
  let total = 0;
  for (const beat of BEATS) {
    starts[beat] = total;
    total += plan.beats[beat];
  }

  const scene = field();
  show.stage.append(scene);
  for (const beat of BEATS) at(starts[beat], () => void (scene.dataset.beat = beat));
  scene.dataset.beat = BEATS[0];

  // Everyone at their spot in the ring, back to front so the front stands
  // over the back, and the fuse behind them all.
  const spots = ring(count);
  const people = new Map<string, Person>(
    plan.ring.map((name, index) => [name, createPerson(name, looks.get(name)!, spots[index]!)]),
  );
  const backToFront = [...people.values()].sort((a, b) => a.spot.y - b.spot.y);
  const fuse = drawFuse();
  scene.append(fuse.el);
  for (const person of backToFront) scene.append(person.el);

  // From the crawl the last three stand GROWN times their size; with 2
  // people nobody grows.
  const growing: readonly string[] = count > 2 ? plan.three : [];
  /** Where `name` stands at `time`, and how big: their name tag is there. */
  const standAt = (name: string, time: number) => {
    const { spot } = people.get(name)!;
    return growing.includes(name) && time >= starts.crawl ? grown(spot) : spot;
  };
  /** When `name` sits down, if they do. */
  const sitsAt = new Map(plan.sits.map((each) => [each.name, each.at]));
  /** Where `name`'s head is at `time`: standing, or sitting down. */
  const spotAt = (name: string, time: number) =>
    (sitsAt.get(name) ?? Infinity) <= time ? seated(standAt(name, time)) : standAt(name, time);
  /** Everyone's name but `name`'s, where it is at `time`. */
  const namesBut = (name: string, time: number) =>
    plan.ring.filter((each) => each !== name).map((each) => nameBox(standAt(each, time)));

  const potato = drawPotato();
  potato.el.classList.add(styles.potato);
  potato.el.dataset.holder = '';
  scene.append(potato.el);
  const scale = count === 2 ? POTATO.pairScale : 1;
  const place = (point: Point) => ({
    x: point.x - POTATO.width / 2,
    y: point.y - POTATO.height / 2,
  });
  /** Where `name` holds the potato at `time`, clear of every name. */
  const over = (name: string, time: number) =>
    held(spotAt(name, time), scale, [...namesBut(name, time), nameBox(standAt(name, time))]);
  const first = plan.catches[0]!;
  gsap.set(potato.el, { ...place({ x: over(first.by, 0).x, y: DROP_Y }), scale });
  const setX = gsap.quickSetter(potato.el, 'x', 'px') as (value: number) => void;
  const setY = gsap.quickSetter(potato.el, 'y', 'px') as (value: number) => void;

  // Who holds it, who it's flying to, who sits and what's going on: the
  // moods follow from these. Whoever has it, has it coming or is next in
  // line braces for it; whoever sits is happy.
  const nextOf = (name: string) =>
    plan.ring[(plan.ring.indexOf(name) + plan.direction + count) % count]!;
  let holder = '';
  let coming = first.by;
  let phase: Phase = 'passing';
  const sitting = new Set<string>();
  const refresh = () => {
    potato.el.dataset.holder = holder;
    const next = holder ? nextOf(holder) : '';
    for (const { name, el, face } of people.values()) {
      const braced = name === holder || name === coming;
      const ending = phase === 'ending';
      const sat = sitting.has(name);
      const mood: Mood = ending
        ? name === show.unlucky
          ? 'party'
          : 'happy'
        : phase === 'gasp'
          ? 'scared'
          : sat
            ? 'happy'
            : braced || name === next
              ? 'scared'
              : 'worried';
      el.dataset.mood = mood;
      el.dataset.sitting = String(sat);
      face.setMood(mood);
      face.setRaised(ending || braced);
      face.setSweat(!ending && !sat && (braced || name === next));
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

  /** Animates `target` to `vars` over `duration` from `time`; with reduced motion, at once. */
  const change = (
    target: gsap.TweenTarget,
    vars: gsap.TweenVars,
    time: number,
    duration: number,
  ) =>
    show.reducedMotion
      ? timeline.set(target, vars, time)
      : timeline.to(target, { ...vars, duration, ease: 'power2.out' }, time);

  // The sparkler hisses from the plop to the pop.
  let stopSizzle = () => {};
  const sizzle = (time: number, on: boolean) =>
    at(time, () => {
      stopSizzle();
      stopSizzle = on ? show.sound.play('sizzle') : () => {};
    });

  // The fuse and the sparkler burn down evenly from the plop to their last
  // spark; the fuse's spark pulses until the pop, and the fuse is gone then.
  const left = { value: 1 };
  timeline.to(
    left,
    {
      value: 0,
      duration: plan.lastSpark,
      ease: 'none',
      onUpdate: () => {
        potato.setSparkler(left.value);
        fuse.setLeft(left.value);
      },
    },
    0,
  );
  if (!show.reducedMotion) {
    const pulses = Math.floor(starts.pop / (2 * PULSE.half));
    timeline.to(
      fuse.spark,
      {
        scale: PULSE.scale,
        transformOrigin: '50% 50%',
        duration: PULSE.half,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 2 * pulses - 1,
      },
      0,
    );
  }
  timeline.set(fuse.el, { autoAlpha: 0 }, starts.pop);

  /** The potato along `path`, from `from` to `to` show seconds. */
  function follow(path: Path, from: number, to: number, ease = 'power1.inOut') {
    const along = { t: 0 };
    timeline.fromTo(
      along,
      { t: 0 },
      {
        t: 1,
        duration: to - from,
        ease,
        immediateRender: false,
        onUpdate: () => {
          const point = bezier(along.t, ...path);
          setX(place(point).x);
          setY(place(point).y);
        },
      },
      from,
    );
  }

  /** A straight path from `from` to `to`. */
  const straight = (from: Point, to: Point): Path => [from, from, to, to];

  /**
   * The hang: it floats up to between the second and the third, hangs there
   * while it's still, drifting up a little and back, then drops onto the
   * catcher.
   */
  function hangUp(each: Catch) {
    const two = [over(plan.three[1], each.at), over(plan.three[2], each.at)] as [Point, Point];
    // Off both their faces, and everyone's name.
    const faces = [plan.three[1], plan.three[2]].map((name) => headBox(spotAt(name, each.at)));
    const names = plan.ring.map((name) => nameBox(standAt(name, each.at)));
    const { rise, top, drop } = hang(
      over(each.from!, each.at),
      over(each.by, each.at),
      two,
      scale,
      [...faces, ...names],
    );
    // Never into the sky: from the highest it may go, it hangs without drifting.
    const up = { x: top.x, y: Math.max(highest(scale), top.y - DRIFT) };
    follow(rise, each.thrown, plan.still.from, 'power2.out');
    follow([top, up, up, top], plan.still.from, plan.still.to, 'sine.inOut');
    follow(drop, plan.still.to, each.at, 'power1.in');
  }

  // The plop: it drops in from above onto the first catcher, shocked.
  at(0, () => potato.setFace('shocked'));
  sizzle(0, true);
  timeline.to(
    potato.el,
    { y: place(over(first.by, 0)).y, duration: first.at, ease: 'bounce.out' },
    0,
  );
  hold(first.at, first.by);

  for (const each of plan.catches.slice(1)) {
    hold(each.thrown, each.by, true);
    cue(each.thrown, 'whoosh');
    if (each.beat === 'last-second' && plan.ending === 'hangs') hangUp(each);
    else {
      // The last lap's last catch lands before the three grow.
      const landed = each.beat === 'last-lap' ? each.at - 1e-6 : each.at;
      const path = throwPath(over(each.from!, each.thrown), over(each.by, landed), scale);
      follow(path, each.thrown, each.at);
    }
    hold(each.at, each.by);
    if (each.beat === 'laps') timeline.add(shake(people.get(each.by)!.el, show), each.at);
  }

  // The laps: nervous, steaming.
  at(starts.laps, () => {
    potato.setFace('nervous');
    potato.setSteam(true);
  });
  for (const time of plan.heartbeats) cue(time, 'heartbeat');

  const during = (beat: Beat) => plan.catches.filter((each) => each.beat === beat);

  // Captions, one at each moment; the kit holds each long enough to read and
  // queues the next. In the crawl each catch is named; going back, "Back!"
  // goes up a second after the second is named, while it flies.
  caption(0, "Don't be holding it when it pops!");
  caption(starts.laps, 'Pass it on!');
  caption(starts['last-lap'], 'Last lap!');
  caption(starts.crawl, `${plan.three[0]}…`);
  during('crawl').forEach((each, index) => {
    if (index === 1) caption(each.thrown + 0.5, 'Back!');
    if (each.by === plan.three[1]) caption(each.at, `${each.by}…`);
  });
  caption(starts.pop - 1, ENDING_CAPTION[plan.ending]);
  caption(starts.pop, `It popped on ${show.unlucky}!`);

  // Gags, in bubbles beside the potato, or beside someone's head and clear
  // of the potato and everyone's name.
  const inHands = (name: string, time: number) => potatoBox(over(name, time), scale);
  /**
   * A bubble beside `beside`, clear of everything in `avoid` where there's
   * room, and always clear of `keepOff` (all of `avoid` unless given).
   */
  const say = (
    time: number,
    text: string,
    beside: Box,
    avoid: Box[] = [],
    colour: 'paper' | 'sun' = 'paper',
    keepOff: Box[] = avoid,
  ) => {
    let anchor = speechAt(text, beside, avoid);
    if (keepOff.some((box) => overlap(speechBox(text, anchor), box))) {
      anchor = speechAt(text, beside, keepOff);
    }
    const speech = bubble(text, anchor, { colour });
    speech.dataset.part = 'bubble';
    scene.append(speech);
    timeline.add(popIn(speech), time);
    timeline.set(speech, { autoAlpha: 0 }, time + BUBBLE);
  };
  say(first.at, 'Fzzzt!', inHands(first.by, first.at));
  let lastHot = first.at;
  for (const each of during('laps')) {
    if (each.at - lastHot < HOT_GAP) continue;
    say(each.at, 'Hot! Hot! Hot!', inHands(each.by, each.at));
    lastHot = each.at;
  }

  // Phew: once it won't come back to them, they say so and sit down, head
  // shrinking and dropping towards their name tag, which keeps its size.
  for (const { name, at: time } of plan.sits) {
    const person = people.get(name)!;
    const catcher = plan.catches.findLast((each) => each.at <= time + 1e-9)!.by;
    at(time, () => {
      sitting.add(name);
      refresh();
    });
    change(person.face.el, { scale: SITTING.scale, y: SITTING.drop * person.spot.size }, time, SIT);
    // Clear of the names too where the ring has room.
    const potatoThen = inHands(catcher, time);
    say(
      time,
      'Phew!',
      sittingHead(person.spot),
      [potatoThen, ...namesBut(name, time), nameBox(standAt(name, time))],
      'paper',
      [potatoThen],
    );
  }

  // The crawl: the last three grow where they stand, tags and all, the
  // potato in the first one's hands with them.
  for (const name of growing) {
    change(people.get(name)!.el, { scale: GROWN }, starts.crawl, GROW_THREE);
  }
  if (growing.length > 0) {
    const first = plan.three[0];
    const from = over(first, starts.crawl - 1e-6);
    const to = over(first, starts.crawl);
    if (show.reducedMotion) follow(straight(to, to), starts.crawl, starts.crawl + 1e-3);
    else follow(straight(from, to), starts.crawl, starts.crawl + GROW_THREE, 'power2.out');
  }

  // The last second: the sparkler reaches its last spark and the face
  // squeezes shut.
  at(plan.lastSpark, () => potato.setFace('squeezed'));
  const second = plan.three[1];
  if (plan.ending === 'too-hot' || plan.ending === 'strays') {
    // Too hot: it reaches its last spark in the second's hands, everyone
    // gasps, and they shake with it until they fling it (above, with the passes).
    enter(plan.lastSpark, 'gasp');
    for (let time = plan.still.from; time + SHAKE <= plan.still.to + 1e-9; time += SHAKE) {
      timeline.add(shake(people.get(second)!.el, show), time);
      timeline.add(shake(potato.el, show), time);
    }
  }
  /** Where the potato is when it pops: landed in the unlucky person's hands, or held out. */
  let heart: Point = over(show.unlucky, starts.pop);
  if (plan.ending === 'holding-on') {
    // Holding on: they hold it out beside their face towards the third,
    // hesitate, and lean in; it pops before they let go.
    const L = starts['last-second'];
    const towards = over(plan.three[2], L);
    const out = heldOut(spotAt(second, L), towards, scale, [
      ...namesBut(second, L),
      nameBox(standAt(second, L)),
    ]);
    const away = Math.hypot(towards.x - out.x, towards.y - out.y);
    const lean = {
      x: out.x + (LEAN * (towards.x - out.x)) / away,
      y: out.y + (LEAN * (towards.y - out.y)) / away,
    };
    follow(straight(over(second, L), out), L + HOLD_OUT, plan.still.from);
    follow(straight(out, lean), plan.still.to, starts.pop, 'power2.in');
    heart = lean;
  }
  if (plan.ending === 'strays') {
    // It strays: flung across the ring with a "Whoa!", onto someone sitting.
    const fling = plan.catches.at(-1)!;
    const potatoThen = potatoBox(over(second, fling.thrown), scale);
    say(
      fling.thrown,
      'Whoa!',
      headBox(spotAt(second, fling.thrown)),
      [potatoThen, ...namesBut(second, fling.thrown), nameBox(standAt(second, fling.thrown))],
      'paper',
      [potatoThen],
    );
  }

  // The pop: a burst behind the people where the potato is, confetti out
  // and down, and the unlucky person in front of everyone, growing, with a
  // paper crown; everyone else cheers. Sitting, they stand up for it.
  const star = burst();
  star.setAttribute('width', '300');
  star.setAttribute('height', '300');
  star.style.position = 'absolute';
  star.style.left = `${heart.x - 150}px`;
  star.style.top = `${heart.y - 150}px`;
  gsap.set(star, { autoAlpha: 0, scale: 0.3 });
  backToFront[0]!.el.before(star);
  const bits = confetti(show.random, CONFETTI.count);
  for (const bit of bits) {
    bit.style.left = '0px';
    bit.style.top = '0px';
    gsap.set(bit, { x: heart.x, y: heart.y, autoAlpha: 0 });
    scene.append(bit);
  }
  const unlucky = people.get(show.unlucky)!;
  // Standing again at the pop, if they were sitting.
  const final = standAt(show.unlucky, starts.pop);
  const paperCrown = crown();
  paperCrown.setAttribute('width', String(unlucky.spot.size));
  paperCrown.setAttribute('height', String(unlucky.spot.size));
  paperCrown.style.position = 'absolute';
  paperCrown.style.left = '0px';
  paperCrown.style.top = '0px';
  gsap.set(paperCrown, { transformOrigin: '50% 100%' });
  unlucky.el.append(paperCrown);
  // crowned() grows them about their feet; they're drawn about the spot
  // they stand on, 0.2 of a head above the feet, so that moves up the rest.
  const grownUp = crowned(final);
  const lift = (1 - CROWNED) * 0.2 * final.size;

  sizzle(starts.pop, false);
  cue(starts.pop, 'pop');
  cue(starts.pop + 0.3, 'fanfare');
  timeline.set(potato.el, { autoAlpha: 0 }, starts.pop);
  enter(starts.pop, 'ending');
  // Forward only: the show never rewinds, so nothing moves them back.
  at(starts.pop, () => potato.el.before(unlucky.el));
  timeline.to(
    unlucky.el,
    {
      scale: (final.size / unlucky.spot.size) * CROWNED,
      x: grownUp.x,
      y: grownUp.y + lift,
      duration: GROW,
      ease: 'back.out(1.4)',
    },
    starts.pop,
  );
  if (plan.sits.some((each) => each.name === show.unlucky)) {
    timeline.to(
      unlucky.face.el,
      { scale: 1, y: 0, duration: GROW, ease: 'back.out(1.4)' },
      starts.pop,
    );
  }
  say(starts.pop, 'Pop!', potatoBox(heart, scale), [headBox(final), grownUp.head], 'sun');
  timeline.set(star, { autoAlpha: 1 }, starts.pop);
  timeline.to(star, { scale: 1.1, duration: 0.25, ease: 'power2.out' }, starts.pop);
  timeline.to(star, { autoAlpha: 0, duration: 0.3 }, starts.pop + 0.3);
  bits.forEach((bit) => {
    const angle = Math.PI * (1.1 + 0.8 * show.random());
    const reach = 160 + 240 * show.random();
    const x = heart.x + reach * Math.cos(angle);
    const y = heart.y + reach * Math.sin(angle);
    const turn = 360 * (show.random() - 0.5);
    timeline.set(bit, { autoAlpha: 1 }, starts.pop);
    timeline.to(
      bit,
      { x, y, rotation: `+=${turn}`, duration: CONFETTI.out, ease: 'power2.out' },
      starts.pop,
    );
    timeline.to(
      bit,
      { x: x + 120 * (show.random() - 0.5), y: 780, duration: CONFETTI.fall, ease: 'power1.in' },
      starts.pop + CONFETTI.out,
    );
    timeline.set(bit, { autoAlpha: 0 }, starts.pop + CONFETTI.out + CONFETTI.fall);
  });
  timeline.add(popIn(paperCrown), starts.pop + 0.3);
  timeline.set({}, {}, total);

  try {
    await show.play(timeline);
  } finally {
    stopSizzle();
  }
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
