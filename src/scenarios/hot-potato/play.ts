// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. The plan says who catches the potato when; this
// says how it looks. The stage tells its story in data attributes too: the
// scene's beat, who holds the potato, who is still in play, and each mood.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  nameTag,
  popIn,
  shake,
  speechAt,
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
  duelGrowth,
  duelLayout,
  duelMove,
  hang,
  headBox,
  held,
  outOfPlay,
  POTATO,
  potatoBox,
  raised,
  ring,
  throwPath,
  windUp,
  type Box,
  type Path,
  type Point,
  type Spot,
} from './layout';
import { burst, confetti, crown, field, potato as drawPotato } from './parts';
import { BEATS, planShow, type Beat, type Catch, type Ending } from './plan';
import styles from './hot-potato.module.css';

/** Where the plop drops in from, above the stage. */
const DROP_Y = -160;
/** Seconds for those out of play to step back. */
const STEP_BACK = 0.4;
/** Seconds a gag bubble stays up. */
const BUBBLE = 0.8;
/** The fewest seconds between two "Hot! Hot! Hot!" bubbles. */
const HOT_GAP = 1.0;
/** Bits of confetti in the pop, and seconds they fly out and then fall. */
const CONFETTI = { count: 36, out: 0.45, fall: 1.4 };
/** Seconds the unlucky person takes to grow at the pop. */
const GROW = 0.5;
/** In the duel the spark dims to `low` and back, `half` seconds each way. */
const FLICKER = { low: 0.45, half: 0.2 };
/** Seconds of the kit's shake. */
const SHAKE = 0.4;
/** How far the control points of the hang's drift reach above its top: it floats up 3/4 of this. */
const DRIFT = 16;
/** How far the unlucky person leans into the throw they never make. */
const LEAN = 50;
/** Seconds into the last second when the unlucky person starts to wind up. */
const WIND_UP = 0.2;
/** The caption a second before the pop. */
const ENDING_CAPTION: Readonly<Record<Ending, string>> = {
  'too-hot': 'Too hot!',
  'hang-time': 'Which way…?',
  'holding-on': 'Throw it!',
};

type Phase = 'throws' | 'dud' | 'relight' | 'showdown' | 'duel' | 'gasp' | 'ending';

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

  const scene = field();
  show.stage.append(scene);

  // Everyone at their spot in the ring, back to front so the front stands over the back.
  const spots = ring(plan.ring.length);
  const people = new Map<string, Person>(
    plan.ring.map((name, index) => [name, createPerson(name, looks.get(name)!, spots[index]!)]),
  );
  const backToFront = [...people.values()].sort((a, b) => a.spot.y - b.spot.y);
  for (const person of backToFront) scene.append(person.el);

  const potato = drawPotato();
  potato.el.classList.add(styles.potato);
  potato.el.dataset.holder = '';
  scene.append(potato.el);
  const scale = plan.ring.length === 2 ? POTATO.pairScale : 1;
  const place = (point: { x: number; y: number }) => ({
    x: point.x - POTATO.width / 2,
    y: point.y - POTATO.height / 2,
  });
  // In the duel the two stand big in front, and the rest watch from the back.
  const pair = plan.duel.map((name) => plan.ring.indexOf(name)) as [number, number];
  const duelSpots = duelLayout(plan.ring.length, pair);
  const inDuel = (name: string) => duelSpots[plan.ring.indexOf(name)]!;
  /** Where `name` holds the potato: in the duel, or before it. */
  const over = (name: string, duel = false) =>
    held(duel ? inDuel(name) : people.get(name)!.spot, scale);
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
      const ending = phase === 'ending';
      const mood: Mood = ending
        ? name === show.unlucky
          ? 'party'
          : 'happy'
        : phase === 'gasp'
          ? 'scared'
          : phase === 'dud' || (!inPlay && phase !== 'duel')
            ? 'happy'
            : phase === 'relight' || (inPlay && braced)
              ? 'scared'
              : 'worried';
      el.dataset.inPlay = String(inPlay);
      el.dataset.mood = mood;
      face.setMood(mood);
      face.setRaised(ending || braced);
      face.setSweat(!ending && inPlay && (braced || ['showdown', 'duel', 'gasp'].includes(phase)));
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

  const during = (beat: Beat) => plan.catches.filter((each) => each.beat === beat);
  const duelThrows = during('duel');
  /** With 3 or more, the two step in before the duel's first throw. */
  const stepIn = duelThrows[0]!.thrown - starts.duel;

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

  /** One throw, in an arc over the ring, or between the two in the duel. */
  function fly(each: Catch) {
    const duel = each.thrown >= starts.duel + stepIn - 1e-9;
    follow(throwPath(over(each.from!, duel), over(each.by, duel), scale), each.thrown, each.at);
  }

  /**
   * The hang-time throw: it floats up to between the two, hangs there while
   * it's still, drifting up a little and back, then drops onto the catcher.
   */
  function hangUp(each: Catch) {
    const two = plan.duel.map((name) => over(name, true)) as [Point, Point];
    const { rise, top, drop } = hang(over(each.from!, true), over(each.by, true), two, scale);
    const up = { x: top.x, y: top.y - DRIFT };
    follow(rise, each.thrown, plan.still.from, 'power2.out');
    follow([top, up, up, top], plan.still.from, plan.still.to, 'sine.inOut');
    follow(drop, plan.still.to, each.at, 'power1.in');
  }

  // The plop: it drops in from above onto the first catcher, shocked.
  at(0, () => potato.setFace('shocked'));
  sizzle(0, true);
  timeline.to(potato.el, { y: place(over(first.by)).y, duration: first.at, ease: 'bounce.out' }, 0);
  hold(first.at, first.by);

  let previous = first;
  for (const each of plan.catches.slice(1)) {
    // With the dud, the sparkler waits at its relit length until the showdown.
    // In the last second it burns to its last spark on its own time.
    const relit = plan.dud && each.beat !== 'hot-hands' && previous.beat === 'hot-hands';
    if (each.beat !== 'last-second') {
      burn(relit ? starts.showdown : previous.at, each.at, each.sparkler);
    }
    hold(each.thrown, each.by, true);
    cue(each.thrown, 'whoosh');
    if (each.beat === 'last-second' && plan.ending === 'hang-time') hangUp(each);
    else fly(each);
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
  for (const time of plan.heartbeats) cue(time, 'heartbeat');
  // Only the head: the name tag keeps its size, so it stays readable.
  for (const person of people.values()) {
    if (plan.showdown.includes(person.name)) continue;
    const smaller = outOfPlay(person.spot).size / person.spot.size;
    timeline.to(
      person.face.el,
      { scale: smaller, duration: STEP_BACK, ease: 'power2.out' },
      starts.showdown,
    );
  }

  // After the showdown's two catches, the one of the three left without it
  // says "Phew!" and steps back, relieved (the bubble is below, with the gags).
  const showdownThrows = during('showdown');
  const phewAt = showdownThrows.at(-1)?.at ?? starts.duel;
  if (plan.phew) {
    const { phew } = plan;
    const person = people.get(phew)!;
    at(phewAt, () => {
      out.add(phew);
      refresh();
    });
    timeline.to(
      person.face.el,
      {
        scale: outOfPlay(person.spot).size / person.spot.size,
        duration: STEP_BACK,
        ease: 'power2.out',
      },
      phewAt,
    );
  }

  // The duel: the two step into the middle and grow, facing each other, while
  // everyone else fades out and back in watching from the back, worried. The
  // potato goes with whoever has it.
  enter(starts.duel, 'duel');
  if (stepIn > 0) {
    const opener = plan.ring.indexOf(duelThrows[0]!.from!);
    const two = plan.duel.map((name) => people.get(name)!.el);
    at(starts.duel, () => potato.el.before(...two));
    const move = { t: 0 };
    timeline.to(
      move,
      {
        t: 1,
        duration: stepIn,
        ease: 'none',
        onUpdate: () => {
          const moved = duelMove(plan.ring.length, pair, move.t);
          plan.ring.forEach((name, index) => {
            const person = people.get(name)!;
            const { spot, shown } = moved[index]!;
            const x = spot.x - person.spot.x;
            const y = spot.y - person.spot.y;
            if (!pair.includes(index)) {
              gsap.set(person.el, { x, y, autoAlpha: shown });
              return;
            }
            // The whole of them grows as their tag does; the head makes up the rest.
            const growth = spot.tag.size / person.spot.tag.size;
            gsap.set(person.el, { x, y, scale: growth });
            gsap.set(person.face.el, { scale: spot.size / (person.spot.size * growth) });
          });
          const point = place(held(moved[opener]!.spot, scale));
          setX(point.x);
          setY(point.y);
        },
      },
      starts.duel,
    );
  }
  // The spark flickers from the duel to the pop, ending lit.
  if (!show.reducedMotion) {
    const flickers = Math.floor((starts.pop - starts.duel) / (2 * FLICKER.half));
    timeline.to(
      potato.spark,
      {
        opacity: FLICKER.low,
        duration: FLICKER.half,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 2 * flickers - 1,
      },
      starts.duel,
    );
  }

  const before = plan.catches.filter((each) => each.beat === 'plop' || each.beat === 'hot-hands');

  // Captions, one at each moment; the kit holds each long enough to read and
  // queues the next. The duel's last name goes up as the last second starts,
  // 2 s before the pop, and the ending's caption 1 s before it, so each has
  // its second and the pop's caption goes up on time.
  caption(0, "Don't be holding it when it pops!");
  caption(starts['hot-hands'], 'Faster… faster…');
  if (plan.dud) {
    caption(starts.dud, '…a dud?');
    caption(starts.relight, 'Nope! Still lit!');
  }
  // With 2 people the showdown takes no time, so this is the duel's start.
  caption(starts.showdown, 'Uh-oh…');
  for (const each of during('duel')) caption(each.at, `${each.by}…`);
  caption(starts.pop - 1, ENDING_CAPTION[plan.ending]);
  caption(starts.pop, `It popped on ${show.unlucky}!`);

  // Gags, in bubbles beside the potato, or beside someone's head and clear
  // of the potato.
  const inHands = (name: string, duel = false) => potatoBox(over(name, duel), scale);
  const say = (
    time: number,
    text: string,
    beside: Box,
    avoid: Box[] = [],
    colour: 'paper' | 'sun' = 'paper',
  ) => {
    const speech = bubble(text, speechAt(text, beside, avoid), { colour });
    speech.dataset.part = 'bubble';
    scene.append(speech);
    timeline.add(popIn(speech), time);
    timeline.set(speech, { autoAlpha: 0 }, time + BUBBLE);
  };
  say(first.at, 'Fzzzt!', inHands(first.by));
  let lastHot = first.at;
  for (const each of during('hot-hands')) {
    if (each.at - lastHot < HOT_GAP) continue;
    say(each.at, 'Hot! Hot! Hot!', inHands(each.by));
    lastHot = each.at;
  }
  const lastHolder = before.at(-1)!.by;
  if (plan.dud) say(starts.relight, 'Psssst!', inHands(lastHolder), [], 'sun');
  const steppingBack = plan.ring.find((name) => !plan.showdown.includes(name));
  if (steppingBack) {
    say(starts.showdown, 'Not me!', headBox(people.get(steppingBack)!.spot), [inHands(lastHolder)]);
  }
  if (plan.phew) {
    const holding = showdownThrows.at(-1)!.by;
    say(phewAt, 'Phew!', headBox(people.get(plan.phew)!.spot), [inHands(holding)]);
  }

  // The last second: the sparkler burns to its last spark, and the face
  // squeezes shut.
  burn(starts['last-second'], plan.lastSpark, 0);
  at(plan.lastSpark, () => potato.setFace('squeezed'));
  const partner = plan.duel.find((name) => name !== show.unlucky)!;
  if (plan.ending === 'too-hot') {
    // Too hot: it reaches its last spark in the other one's hands, everyone
    // gasps, and they shake with it until they fling it (above, with the throws).
    enter(plan.lastSpark, 'gasp');
    for (let time = plan.still.from; time + SHAKE <= plan.still.to + 1e-9; time += SHAKE) {
      timeline.add(shake(people.get(partner)!.el, show), time);
      timeline.add(shake(potato.el, show), time);
    }
  }
  /** Where the potato is when it pops: landed in the unlucky person's hands, or held up. */
  let heart: Point = over(show.unlucky, true);
  if (plan.ending === 'holding-on') {
    // Holding on: they wind up, holding it over their head, hesitate, and
    // lean into the throw; it pops before they let go.
    const L = starts['last-second'];
    const up = raised(inDuel(show.unlucky), scale);
    const towards = over(partner, true);
    const away = Math.hypot(towards.x - up.x, towards.y - up.y);
    const lean = {
      x: up.x + (LEAN * (towards.x - up.x)) / away,
      y: up.y + (LEAN * (towards.y - up.y)) / away,
    };
    follow(windUp(inDuel(show.unlucky), scale), L + WIND_UP, plan.still.from, 'power2.inOut');
    follow(straight(up, lean), plan.still.to, starts.pop, 'power2.in');
    heart = lean;
  }

  // The pop: a burst behind the people where the potato is, confetti out
  // and down, and the unlucky person in front of everyone, growing, with a
  // paper crown; everyone else cheers.
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
  // Where they stand at the pop, how much bigger all of them is drawn there,
  // and how much bigger still their head: the crown sits on the head.
  const unlucky = people.get(show.unlucky)!;
  const final = inDuel(show.unlucky);
  const growth = stepIn > 0 ? duelGrowth(unlucky.spot) : 1;
  const headSize = final.size / growth;
  const paperCrown = crown();
  paperCrown.setAttribute('width', String(headSize));
  paperCrown.setAttribute('height', String(headSize));
  paperCrown.style.position = 'absolute';
  paperCrown.style.left = `${(unlucky.spot.size - headSize) / 2}px`;
  paperCrown.style.top = `${0.8 * (unlucky.spot.size - headSize)}px`;
  gsap.set(paperCrown, { transformOrigin: '50% 100%' });
  unlucky.el.append(paperCrown);
  // crowned() grows them about their feet; they're drawn about the spot
  // they stand on, 0.2 of a head above the feet, so that moves up the rest.
  const grown = crowned(final);
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
      scale: growth * CROWNED,
      x: final.x - unlucky.spot.x + grown.x,
      y: final.y - unlucky.spot.y + grown.y + lift,
      duration: GROW,
      ease: 'back.out(1.4)',
    },
    starts.pop,
  );
  say(starts.pop, 'Pop!', potatoBox(heart, scale), [headBox(final), grown.head], 'sun');
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
