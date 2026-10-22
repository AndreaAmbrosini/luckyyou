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
  headBox,
  held,
  outOfPlay,
  POTATO,
  potatoBox,
  ring,
  speechAt,
  throwPath,
  type Box,
  type Spot,
} from './layout';
import { burst, confetti, crown, field, potato as drawPotato } from './parts';
import { BEATS, planShow, type Beat, type Catch } from './plan';
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
/** The kit holds each caption at least this many seconds. */
const READ = 1;

type Phase = 'throws' | 'dud' | 'relight' | 'showdown' | 'freeze' | 'ending';

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
  const over = (name: string) => held(people.get(name)!.spot, scale);
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
  // moods follow from these. Whoever has it, or has it coming, braces for it;
  // in the freeze, those out of play watch it too.
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
        : phase === 'dud' || (!inPlay && phase !== 'freeze')
          ? 'happy'
          : phase === 'relight' || braced
            ? 'scared'
            : 'worried';
      el.dataset.inPlay = String(inPlay);
      el.dataset.mood = mood;
      face.setMood(mood);
      face.setRaised(ending || braced);
      face.setSweat(!ending && inPlay && (braced || phase === 'showdown' || phase === 'freeze'));
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

  /** One throw, in an arc over the ring, or the boomerang's loop out and back. */
  function fly(each: Catch) {
    const path = throwPath(over(each.from!), over(each.by), scale);
    const along = { t: 0 };
    timeline.fromTo(
      along,
      { t: 0 },
      {
        t: 1,
        duration: each.at - each.thrown,
        ease: 'power1.inOut',
        immediateRender: false,
        onUpdate: () => {
          const point = bezier(along.t, ...path);
          setX(place(point).x);
          setY(place(point).y);
        },
      },
      each.thrown,
    );
  }

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

  const during = (beat: Beat) => plan.catches.filter((each) => each.beat === beat);
  const before = plan.catches.filter((each) => each.beat === 'plop' || each.beat === 'hot-hands');

  // Captions, one at each moment; the kit holds each long enough to read and
  // queues the next. The pop's caption has to go up on time, so the one before
  // it goes up a second earlier: "Uh-oh…" as the last throw comes down, or a
  // twist's own caption, which comes too soon after the showdown's last name
  // to leave room for "Uh-oh…" as well.
  caption(0, "Don't be holding it when it pops!");
  caption(starts['hot-hands'], 'Faster… faster…');
  if (plan.dud) {
    caption(starts.dud, '…a dud?');
    caption(starts.relight, 'Nope! Still lit!');
  }
  const named: string[] = [];
  for (const each of during('showdown')) {
    named.push(each.by);
    caption(each.at, `${named.join('… ')}…`);
  }
  if (plan.twist === 'back') {
    const away = plan.catches.at(-2)!;
    caption(away.at, `${away.by}… nope, back to ${show.unlucky}!`);
  } else if (plan.twist === 'boomerang') {
    // As it turns back, halfway.
    const last = plan.catches.at(-1)!;
    caption((last.thrown + last.at) / 2, "It's coming back!");
  } else {
    caption(starts.pop - READ, 'Uh-oh…');
  }
  caption(starts.pop, `It popped on ${show.unlucky}!`);

  // Gags, in bubbles beside the potato, or beside someone's head and clear
  // of the potato.
  const inHands = (name: string) => potatoBox(over(name), scale);
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
  if (plan.twist === 'back') {
    const away = plan.catches.at(-2)!;
    say(away.at, 'Nope!', inHands(away.by));
  }

  // The freeze: nothing moves but the face, squeezed shut on the last spark.
  at(starts.freeze, () => {
    potato.setFace('squeezed');
    potato.setSparkler(0);
  });
  enter(starts.freeze, 'freeze');

  // The pop: a burst behind the people where the potato was, confetti out
  // and down, and the unlucky person in front of everyone, growing, with a
  // paper crown; everyone else cheers.
  const heart = over(show.unlucky);
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
  const paperCrown = crown();
  paperCrown.setAttribute('width', String(unlucky.spot.size));
  paperCrown.setAttribute('height', String(unlucky.spot.size));
  paperCrown.style.position = 'absolute';
  paperCrown.style.left = '0px';
  paperCrown.style.top = '0px';
  gsap.set(paperCrown, { transformOrigin: '50% 100%' });
  unlucky.el.append(paperCrown);
  const grown = crowned(unlucky.spot);
  gsap.set(unlucky.el, { transformOrigin: '50% 100%' });

  sizzle(starts.pop, false);
  cue(starts.pop, 'pop');
  cue(starts.pop + 0.3, 'fanfare');
  timeline.set(potato.el, { autoAlpha: 0 }, starts.pop);
  enter(starts.pop, 'ending');
  at(starts.pop, () => potato.el.before(unlucky.el));
  timeline.to(
    unlucky.el,
    { scale: CROWNED, x: grown.x, y: grown.y, duration: GROW, ease: 'back.out(1.4)' },
    starts.pop,
  );
  say(starts.pop, 'Pop!', inHands(show.unlucky), [headBox(unlucky.spot), grown.head], 'sun');
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
