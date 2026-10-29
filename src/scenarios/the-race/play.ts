// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where every racer is, how they feel, what they say
// and what their mount does follow from the show's time each frame, so every
// frame follows from the plan alone. Gaits bob outside the timeline, on the
// show's clock, so their endless repeats don't keep the show going. The
// stage tells its story in data attributes too: the part of the race, the
// camera, whether it is slow, and each racer's nose, gait and stop.

import { gsap } from 'gsap';
import {
  bob,
  bubble,
  handOutLooks,
  nameTag,
  type Box,
  type Cue,
  type Mood,
  type Show,
} from '../../scenario-kit';
import { boxAt, bubbleOffset, faceAt, lane, tagAt, tagBox, tagSize, type Lane } from './layout';
import {
  photoCard,
  PHOTO,
  RACER_COLOURS,
  racer,
  track,
  type Mount,
  type Pose,
  type Racer,
  type RacerLook,
} from './parts';
import {
  BEATS,
  CAMERA,
  cameraAt,
  FINISH,
  LENGTH,
  noseAt,
  planShow,
  START,
  STOP,
  stopping,
  type Plan,
  type RaceEvent,
} from './plan';
import styles from './the-race.module.css';

const FALLBACK: RacerLook = { mount: 'snail', colour: 'tomato', extra: 'number' };

/** What each mount does when it bursts ahead, and when it stops. */
const BURSTS: Record<Mount, string> = {
  snail: 'finds a turbo',
  duck: 'rolls downhill',
  chair: 'catches a gust',
  caterpillar: 'goes full wiggle',
};
const STOPS: Record<Mount, string> = {
  snail: 'stops for a snack',
  duck: 'hits a pebble',
  chair: 'spins round',
  caterpillar: 'dozes off',
};

/** Each mount's gait: how far it bobs, in stage pixels, and how often. */
const GAITS: Record<Mount, { px: number; seconds: number }> = {
  snail: { px: 3, seconds: 1.1 },
  duck: { px: 4, seconds: 0.42 },
  chair: { px: 3, seconds: 0.3 },
  caterpillar: { px: 7, seconds: 0.7 },
};

/** A duck that hits a pebble tips up by `degrees` and back over `seconds`, about its back wheel. */
const TIP = { degrees: -24, seconds: 1, origin: '74px 183px' };
/** A chair spins round twice over `seconds`, about its stem. */
const SPIN = { turns: 2, seconds: 1.2, origin: '112px 0' };
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
/** In the photo, the unlucky nose is this far over the line. */
const AHEAD = 16;
/** Confetti at the win: how many pieces, falling at least this fast to where they settle. */
const CONFETTI = { count: 26, fall: 520 };

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
  readonly drawn: Racer;
  readonly tag: HTMLElement;
  readonly speed: SVGPathElement;
  readonly gait: gsap.core.Animation;
  state: { mood: Mood; pose: Pose; sweat: boolean } | null;
}

/** The caption for an event, as the commentator says it. */
export function eventCaption(event: RaceEvent, mount: Mount): string {
  const did = event.kind === 'burst' ? BURSTS[mount] : STOPS[mount];
  return `${event.subject}'s ${mount} ${did}!`;
}

/**
 * What gets said when: "Nooo!" in a burst and in a surge; "Zzz…" from a
 * dozing caterpillar and "Phew!" in a stop, and from the rival who brakes.
 */
function sayings(plan: Plan, unlucky: string, mountOf: (name: string) => Mount): Saying[] {
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
    return [
      ...(mountOf(name) === 'caterpillar'
        ? [{ name, text: 'Zzz…', from: at + 0.3, to: at + STOP.phew - 0.1 }]
        : []),
      { name, text: 'Phew!', from: at + STOP.phew, to: at + STOP.phew + 1.1 },
    ];
  });
  return [...events, ...ending];
}

export async function playTheRace(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const faces = handOutLooks(show.names, show.random);
  const count = show.names.length;
  const { times } = plan;
  const lookOf = (name: string) => (show.looks.get(name) as RacerLook | undefined) ?? FALLBACK;

  const scene = show.stage.appendChild(document.createElement('div'));
  scene.className = styles.scene!;
  const field = track({
    lanes: show.names.map((_, index) => lane(index, count).top),
    start: START.line,
    finish: FINISH + cameraAt(plan, times.finish),
  });
  scene.append(field.el);
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
    const drawn = racer(look, { face: faces.get(name)!, number: index + 1 });
    const holder = racers.appendChild(document.createElement('div'));
    holder.className = styles.holder!;
    holder.dataset.person = name;
    holder.style.scale = String(at.k);
    holder.append(drawn.el);
    // Where a duck tips from, or a chair spins round.
    drawn.el.style.transformOrigin = look.mount === 'duck' ? TIP.origin : SPIN.origin;
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
    return { name, index, look, at, holder, drawn, tag, speed, gait, state: null };
  });
  const byName = new Map(riders.map((rider) => [rider.name, rider]));

  // The photo finish: the two side-on at the line, the unlucky nose over it.
  const photo =
    plan.ending === 'photo'
      ? scene.appendChild(
          photoCard(
            [plan.rival, show.unlucky]
              .map((name) => byName.get(name)!)
              .sort((one, two) => one.index - two.index)
              .map(({ name, look, index }) => {
                const drawn = racer(look, { face: faces.get(name)!, number: index + 1 });
                drawn.setMood('scared');
                drawn.setPose('pull');
                drawn.setSweat(true);
                const nose = PHOTO.line + (name === show.unlucky ? AHEAD : -2);
                return { name, racer: drawn, nose };
              }),
            `${show.unlucky}, by a nose!`,
          ),
        )
      : null;
  if (photo) photo.hidden = true;

  // Bubbles, each placed once where it stays clear of every face and tag
  // round it while it's up, then following its speaker.
  const said = sayings(plan, show.unlucky, (name) => lookOf(name).mount).map((saying) => {
    const speaker = byName.get(saying.name)!;
    const samples: { face: Box; avoid: Box[] }[] = [];
    for (let t = saying.from; t <= saying.to + 1e-9; t += SAMPLE) {
      samples.push({
        face: faceAt(speaker.look.mount, speaker.at, noseAt(plan, speaker.name, t)),
        avoid: riders.flatMap((rider) => {
          const nose = noseAt(plan, rider.name, t);
          return [
            faceAt(rider.look.mount, rider.at, nose),
            tagBox(rider.name, rider.look.mount, rider.at, nose),
          ];
        }),
      });
    }
    const offset = bubbleOffset(saying.text, samples);
    const el = bubbles.appendChild(bubble(saying.text, { x: 0, y: 0 }));
    el.dataset.person = saying.name;
    el.dataset.says = saying.text;
    el.hidden = true;
    return { ...saying, speaker, offset, el };
  });

  const stopOf = (name: string, t: number) => stopping(plan, name, t);

  /** How fast `name`'s nose moves along the track at show second `t`. */
  const speedOf = (name: string, t: number) => {
    const dt = 1 / 60;
    const along = (time: number) => noseAt(plan, name, time) + cameraAt(plan, time);
    return (along(t + dt) - along(t - dt)) / (2 * dt);
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

  const place = (t: number) => {
    const camera = cameraAt(plan, t);
    field.set(camera);
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
      write(
        tag,
        'translate',
        `calc(${beside.right.toFixed(1)}px - 100%) calc(${beside.middle.toFixed(1)}px - 50%)`,
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

      // What a stop does to each mount.
      const since = stop ? t - stop.at : -1;
      drawn.setLeaf(look.mount === 'snail' && since >= 0.2);
      const tip =
        look.mount === 'duck' && since >= 0 && since < TIP.seconds && !show.reducedMotion
          ? TIP.degrees * Math.sin((Math.PI * since) / TIP.seconds)
          : 0;
      const tilt = tip ? `${tip.toFixed(1)}deg` : '';
      write(drawn.el, 'rotate', tilt);
      write(drawn.el, '@data-rotate', tilt);
      const spin =
        look.mount === 'chair' && since >= 0 && since < SPIN.seconds && !show.reducedMotion
          ? Math.cos((2 * Math.PI * SPIN.turns * since) / SPIN.seconds)
          : 1;
      const turned = spin === 1 ? '' : `${spin.toFixed(2)} 1`;
      write(drawn.el, 'scale', turned);
      write(drawn.el, '@data-scale', turned);

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
      const x = ((face.left + face.right) / 2 + saying.offset.dx).toFixed(1);
      const y = (face.top + saying.offset.dy).toFixed(1);
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
    at(event.at, () => show.caption(eventCaption(event, lookOf(event.subject).mount)));
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
    const surge = { kind: 'burst', subject: show.unlucky, at: times.slow } as const;
    at(times.slow, () => show.caption(eventCaption(surge, lookOf(show.unlucky).mount)));
    cue(times.slow, 'whoosh');
  }
  at(times.win, () => show.caption(`${show.unlucky} wins!`));
  cue(times.win, 'fanfare');
  timeline.set({}, {}, times.end);

  place(0);
  await show.play(timeline);
}
