import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  head,
  nameTag,
  popIn,
  speechBox,
  stagePx,
  type Box,
  type Cue,
  type Head,
  type Mood,
  type Show,
} from '../../scenario-kit';
import {
  BALCONY_TAG_TOP,
  WINNER,
  emerged,
  layoutFor,
  winnerTag,
  tagWidth,
  type Place,
  type Spot,
  type TagSpec,
} from './layout';
import styles from './hide-and-seek.module.css';
import { scoreFor } from './music';
import { drawBoard, drawCrown, drawFurniture, drawLens, drawRoom, drawSeeker } from './parts';
import { planShow, type Move, type Pop, type Stop } from './plan';

const HOP = 0.5;
const WIN_GLIDE = 0.55;
const RISE = 0.25;
const BOB = 2.5;
const CONFETTI = 26;
const EXPOSED = 1960;

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const inOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const between = (spans: readonly { from: number; to: number }[], t: number) =>
  spans.some((span) => t >= span.from && t < span.to);
const lerp = (a: Spot, b: Spot, u: number): Spot => ({
  x: mix(a.x, b.x, u),
  y: mix(a.y, b.y, u),
  size: mix(a.size, b.size, u),
});

const written = new WeakMap<Element, Map<string, string>>();
/** Writes only what changed: the frames write this every tick. */
function put(el: HTMLElement, key: string, value: string | number): void {
  const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value;
  let seen = written.get(el);
  if (!seen) written.set(el, (seen = new Map()));
  if (seen.get(key) === text) return;
  seen.set(key, text);
  if (key.startsWith('data-')) el.setAttribute(key, text);
  else if (key === 'display') el.style.display = text;
  else if (key === 'opacity') el.style.opacity = text;
  else if (key === 'left' || key === 'top' || key === 'width' || key === 'z-index')
    el.style.setProperty(key, text);
  else el.style.setProperty(key, text);
}
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

type Variant = 'home' | 'balcony' | 'winner';

interface Actor {
  readonly name: string;
  readonly start: number;
  readonly moves: readonly Move[];
  readonly pop: Pop | undefined;
  readonly person: HTMLElement;
  readonly face: Head;
  readonly sweat: HTMLElement;
  readonly tags: Readonly<Record<Variant, HTMLElement | null>>;
  readonly phase: number;
}

export async function playHideAndSeek(show: Show): Promise<void> {
  const count = show.names.length;
  const layout = layoutFor(show.names, count + (count <= 3 ? 1 : 0));
  const { places } = layout;
  const looks = handOutLooks(show.names, show.random, show.photos);
  const plan = planShow(show.names, show.unlucky, show.random, layout);
  const score = scoreFor(plan);
  const music = show.sound.music(score.notes);
  const { reducedMotion } = show;

  const timeline = gsap.timeline({ paused: true });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  const cue = (time: number, sound: Cue) => at(time, () => void show.sound.play(sound));

  show.stage.dataset.ending = plan.ending;
  show.stage.dataset.spotlight = 'off';
  const scene = show.stage.appendChild(document.createElement('div'));
  scene.className = styles.scene!;
  const layer = (name?: string, z?: number) => {
    const el = scene.appendChild(document.createElement('div'));
    el.className = styles.layer!;
    if (name) el.dataset.part = name;
    if (z) el.style.zIndex = String(z);
    return el;
  };
  scene.append(drawRoom());
  const actors = layer();
  actors.append(drawBoard());
  const dim = layer();
  dim.className = styles.dim!;
  const tagLayer = layer('tags', 1950);
  const seeker = scene.appendChild(drawSeeker());
  const lens = scene.appendChild(drawLens());
  const speech = layer(undefined, 2200);
  const effects = layer();

  const props = places.map((place) => {
    const el = actors.appendChild(drawFurniture(place.furniture, 1, 'sea'));
    el.style.left = px(place.x);
    el.style.top = px(place.top);
    el.style.width = px(place.box);
    el.style.height = px(place.height);
    el.style.zIndex = String(Math.round(place.base) * 2 + 1);
    return el;
  });

  const tiered = plan.pops.length > 8;
  const balconyWidth = Math.max(60, (tiered ? 2160 : 1080) / Math.max(1, plan.pops.length) - 8);
  const balconySpec = (index: number): TagSpec => ({
    size: 22,
    maxWidth: balconyWidth,
    top: tiered && index % 2 === 1 ? 270 : BALCONY_TAG_TOP,
  });
  const holder = (name: string, spec: TagSpec, x: number): HTMLElement => {
    const el = tagLayer.appendChild(document.createElement('div'));
    el.className = styles.holder!;
    el.dataset.tagOf = name;
    el.style.left = px(x);
    el.style.top = px(spec.top);
    el.style.display = 'none';
    el.append(nameTag(name, { size: spec.size, maxWidth: spec.maxWidth }));
    return el;
  };

  const lensStops = plan.stops;
  const actorsByName = new Map<string, Actor>();
  show.names.forEach((name) => {
    const start = plan.homes.get(name)!;
    const pop = plan.pops.find((entry) => entry.name === name);
    const person = actors.appendChild(document.createElement('div'));
    person.className = styles.person!;
    person.dataset.person = name;
    const face = head(looks.get(name)!, { land: true });
    person.append(face.el);
    const sweat = actors.appendChild(document.createElement('div'));
    sweat.className = styles.sweat!;
    actorsByName.set(name, {
      name,
      start,
      moves: plan.moves.filter((move) => move.name === name),
      pop,
      person,
      face,
      sweat,
      phase: show.random() * Math.PI * 2,
      tags: {
        home: holder(name, places[start]!.tag, places[start]!.x),
        balcony: pop ? holder(name, balconySpec(plan.pops.indexOf(pop)), pop.slot.x) : null,
        winner: name === plan.unlucky ? holder(name, winnerTag(), WINNER.x) : null,
      },
    });
  });

  const crown = effects.appendChild(drawCrown());
  const badge = effects.appendChild(document.createElement('div'));
  badge.className = styles.badge!;
  badge.textContent = 'BEST HIDER';
  const confetti = Array.from({ length: CONFETTI }, (_, index) => {
    const el = effects.appendChild(document.createElement('div'));
    el.className = `${styles.piece} ${styles[`piece${index % 6}`]}`;
    return {
      el,
      x: 150 + show.random() * 980,
      delay: show.random() * 0.5,
      drift: (show.random() - 0.5) * 120,
      spin: (show.random() - 0.5) * 900,
    };
  });

  for (const [time, text] of plan.captions) at(time, () => show.caption(text));
  for (const [time, sound] of plan.cues) cue(time, sound);

  const lensAt = (t: number): { x: number; y: number; moving: boolean } => {
    const first = lensStops[0]!;
    if (t <= first.arrive) return { x: first.x, y: first.y, moving: false };
    for (let index = 0; index < lensStops.length; index++) {
      const stop: Stop = lensStops[index]!;
      if (t <= stop.leave) return { x: stop.x, y: stop.y, moving: false };
      const next = lensStops[index + 1];
      if (!next) break;
      if (t < next.arrive) {
        const u = inOut(clamp((t - stop.leave) / (next.arrive - stop.leave)));
        return { x: mix(stop.x, next.x, u), y: mix(stop.y, next.y, u), moving: true };
      }
    }
    const last = lensStops[lensStops.length - 1]!;
    return { x: last.x, y: last.y, moving: false };
  };

  /** Where `a` stands at `t` before being found: their furniture, or the floor between two. */
  const whereAt = (a: Actor, t: number): { place: Place; spot: Spot; crossing: boolean } => {
    let place = places[a.start]!;
    for (const move of a.moves) {
      if (t < move.depart) break;
      const from = places[move.from]!;
      const goal = move.end ?? places[move.to]!;
      if (t < move.arrive) {
        const u = inOut(clamp((t - move.depart) / (move.arrive - move.depart)));
        const hop = reducedMotion ? 0 : 8 * Math.abs(Math.sin(t * 14));
        return {
          place: from,
          crossing: true,
          spot: { x: mix(from.x, goal.x, u), y: mix(from.y, goal.y, u) - hop, size: from.size },
        };
      }
      if (move.end) return { place: from, crossing: true, spot: { ...move.end, size: from.size } };
      place = places[move.to]!;
    }
    return { place, crossing: false, spot: place };
  };

  const feelingAt = (name: string, t: number): Mood | null => {
    const found = plan.feelings.find((f) => f.name === name && t >= f.from && t < f.to);
    return found ? found.mood : null;
  };
  const spansOf = (list: readonly { name: string; from: number; to: number }[], name: string) =>
    list.filter((entry) => entry.name === name);

  const draw = (t: number, sampling = false) => {
    const lit = t >= plan.spotlight && t < plan.reveal;
    put(show.stage, 'data-spotlight', lit ? 'on' : 'off');
    const { beat, speed } = score.at(t);
    if (!sampling) music.to(beat, speed);

    const shaking = new Map<number, number>();
    const occupied = new Set<number>();

    for (const a of actorsByName.values()) {
      const unlucky = a.name === plan.unlucky;
      const found = a.pop !== undefined && t >= a.pop.at;
      const revealed = unlucky && t >= plan.reveal;
      const state = revealed ? 'unlucky' : found ? 'safe' : 'at-risk';
      const finalist = plan.finalists.includes(a.name) && t >= plan.spotlight;
      const w = whereAt(a, t);
      const showing = between(spansOf(plan.exposed, a.name), t);
      const hidden = state === 'at-risk' && !w.crossing && !showing;
      const hopping = a.pop !== undefined && t >= a.pop.hop && t < a.pop.hop + HOP;
      const mood: Mood = revealed
        ? 'party'
        : found
          ? 'happy'
          : finalist
            ? 'scared'
            : (feelingAt(a.name, t) ?? 'calm');
      const sweat = finalist && !found && !revealed;
      const arms = hopping || between(spansOf(plan.raised, a.name), t);
      put(a.person, 'data-state', state);
      put(a.person, 'data-mood', mood);
      put(a.person, 'data-sweat', String(sweat));
      put(a.person, 'data-hidden', String(hidden));
      a.face.setMood(mood);
      a.face.setSweat(sweat);
      a.face.setRaised(arms);

      let spot: Spot = showing ? emerged(w.place) : w.spot;
      if (hidden) {
        const peek = reducedMotion ? 0.3 : 0.22 * (1 + Math.sin(t * 2 + a.phase));
        spot = { ...spot, y: spot.y - peek * w.place.height };
      }
      if (found) {
        const pop = a.pop!;
        spot = lerp(w.spot, pop.from, inOut(clamp((t - pop.at) / RISE)));
        if (t >= pop.hop) {
          const u = inOut(clamp((t - pop.hop) / HOP));
          const arc = reducedMotion ? 0 : 90 * Math.sin(Math.PI * u);
          const moved = lerp(pop.from, pop.slot, u);
          spot = { ...moved, y: moved.y - arc };
        }
      }
      if (revealed) spot = lerp(spot, WINNER, inOut(clamp((t - plan.reveal) / WIN_GLIDE)));
      const bob =
        hidden && !reducedMotion && t < plan.reveal ? BOB * Math.sin(t * 5.5 + a.phase) : 0;
      const jump = found && !reducedMotion ? Math.sin(Math.PI * clamp((t - a.pop!.at) / 0.35)) : 0;
      put(a.person, 'left', px(spot.x));
      put(a.person, 'top', px(spot.y + bob));
      put(a.person, 'width', px(spot.size));
      put(a.person, '--pop', 1 + 0.22 * jump);
      const z =
        hopping || revealed
          ? 2300
          : found && t >= a.pop!.hop
            ? 2000
            : hidden
              ? Math.round(w.place.base) * 2
              : EXPOSED;
      put(a.person, 'z-index', z);

      const spotPlace = w.place;
      if (hidden || showing) {
        occupied.add(spotPlace.index);
        const amp = reducedMotion
          ? 0
          : between(spansOf(plan.trembles, a.name), t)
            ? 3
            : finalist && !found
              ? 1.6
              : 0;
        shaking.set(spotPlace.index, Math.max(shaking.get(spotPlace.index) ?? 0, amp));
        const look = looks.get(a.name)!;
        put(props[spotPlace.index]!, '--skin', `var(--color-skin-${look.skin})`);
        put(props[spotPlace.index]!, '--accent', `var(--color-${look.colour})`);
      }
      const dripping = sweat && hidden;
      put(a.sweat, 'display', dripping ? 'block' : 'none');
      put(a.sweat, 'left', px(spotPlace.x + 0.33 * spotPlace.box));
      put(a.sweat, 'top', px(spotPlace.top + 0.03 * spotPlace.box));
      put(a.sweat, 'z-index', Math.round(spotPlace.base) * 2 + 2);

      let variant: Variant | null = 'home';
      if (revealed) variant = t >= plan.reveal + WIN_GLIDE && a.tags.winner ? 'winner' : null;
      else if (found) variant = t >= a.pop!.hop + HOP && a.tags.balcony ? 'balcony' : null;
      else if (w.crossing) variant = null;
      if (variant === 'home') {
        put(a.tags.home!, 'left', px(spotPlace.x));
        put(a.tags.home!, 'top', px(spotPlace.tag.top));
      }
      for (const [key, el] of Object.entries(a.tags) as [Variant, HTMLElement | null][]) {
        if (!el) continue;
        put(el, 'display', key === variant ? 'block' : 'none');
        if (key === variant) {
          const fadeIn =
            key === 'winner'
              ? (t - plan.reveal - 0.4) / 0.2
              : key === 'balcony'
                ? (t - (a.pop!.hop + HOP)) / 0.2
                : 1;
          put(el, 'opacity', clamp(fadeIn, 0.06));
        }
      }
    }

    const gone = clamp((t - plan.reveal) / 0.4);
    props.forEach((el, index) => {
      put(el, 'data-empty', String(!occupied.has(index)));
      put(el, 'opacity', 1 - gone);
      const amp = shaking.get(index) ?? 0;
      put(el, '--tilt', `${amp ? Math.round(amp * Math.sin(t * 40 + index) * 10) / 10 : 0}deg`);
    });

    const away = between(plan.away, t);
    const edge = Math.min(
      ...plan.away.flatMap((span) => [Math.abs(t - span.from), Math.abs(t - span.to)]),
    );
    put(seeker, 'data-pose', away ? 'away' : 'search');
    put(seeker, '--turn', reducedMotion ? 1 : clamp(edge / 0.15, 0.04));

    const seen = t >= plan.lensIn && t < plan.lensOut;
    const place = lensAt(t);
    const click = plan.pops.reduce((most, pop) => {
      const u = (t - pop.at) / 0.25;
      return u >= 0 && u <= 1 ? Math.max(most, Math.sin(Math.PI * u)) : most;
    }, 0);
    put(lens, 'left', px(place.x));
    put(lens, 'top', px(place.y));
    put(lens, 'opacity', seen ? 1 : 0);
    put(lens, '--pop', 1 - (reducedMotion ? 0 : 0.18 * click));
    put(
      lens,
      '--tilt',
      `${reducedMotion || !place.moving ? 0 : Math.round(9 * Math.sin(t * 6) * 10) / 10}deg`,
    );
    put(dim, '--lx', px(seen ? place.x : 640));
    put(dim, '--ly', px(seen ? place.y : 400));
    put(dim, 'opacity', lit ? 0.58 * clamp((t - plan.spotlight) / 0.5) : 0);

    const win = t - plan.reveal - WIN_GLIDE;
    const fall = reducedMotion ? 1 : inOut(clamp(win / 0.4));
    put(crown, 'left', px(WINNER.x));
    put(crown, 'top', px(440 - (1 - fall) * 140));
    put(crown, 'opacity', win >= 0 ? 1 : 0);
    put(badge, 'left', px(WINNER.x));
    put(badge, 'top', px(338));
    put(badge, 'opacity', clamp((win - 0.3) / 0.3));
    for (const piece of confetti) {
      const u = reducedMotion ? -1 : (t - plan.reveal - piece.delay) / 1.8;
      const on = u >= 0 && u <= 1;
      put(piece.el, 'opacity', on ? 1 : 0);
      if (on) {
        put(piece.el, 'left', px(piece.x + piece.drift * u));
        put(piece.el, 'top', px(-30 + 780 * u * u));
        put(piece.el, 'rotate', `${piece.spin * u}deg`);
      }
    }
  };

  const overlaps = (a: Box, b: Box) =>
    a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
  const placed: { box: Box; from: number; to: number }[] = [];
  for (const line of plan.speeches) {
    const avoid: Box[] = [];
    for (let t = line.from - 0.05; t <= line.to + 0.05; t += 0.05) {
      draw(t, true);
      for (const actor of actorsByName.values()) {
        if (t < plan.reveal) {
          const x = Number.parseFloat(actor.person.style.left);
          const y = Number.parseFloat(actor.person.style.top);
          const r = Number.parseFloat(actor.person.style.width) * 0.42;
          avoid.push({ left: x - r, right: x + r, top: y - r, bottom: y + r });
        }
        for (const holder of Object.values(actor.tags)) {
          if (!holder || holder.style.display === 'none') continue;
          const tag = holder.firstElementChild as HTMLElement;
          const size = Number.parseFloat(tag.style.getPropertyValue('--tag-size'));
          const width = tagWidth(tag, actor.name);
          const height =
            (1.1 * (tag.dataset.lines === '2' ? 2 : 1) + 0.15) * size + 2 * stagePx('--line');
          const x = Number.parseFloat(holder.style.left);
          const top = Number.parseFloat(holder.style.top);
          avoid.push({ left: x - width / 2, right: x + width / 2, top, bottom: top + height });
        }
      }
    }
    avoid.push(
      ...placed
        .filter((other) => other.from < line.to && line.from < other.to)
        .map((other) => other.box),
    );
    const half = speechBox(line.text, { x: 0, y: 0 }).right;
    const candidates: { x: number; y: number }[] = [];
    for (let x = half + 12; x < 1268 - half; x += 24) {
      for (let y = 340; y <= 706; y += 24) candidates.push({ x, y });
    }
    candidates.sort(
      (a, b) =>
        Math.abs(a.x - line.x) +
        Math.abs(a.y - line.y) -
        Math.abs(b.x - line.x) -
        Math.abs(b.y - line.y),
    );
    const spot = candidates.find((candidate) =>
      avoid.every((box) => !overlaps(speechBox(line.text, candidate), box)),
    );
    if (!spot) continue;
    placed.push({ box: speechBox(line.text, spot), from: line.from, to: line.to });
    const el = bubble(line.text, spot);
    el.dataset.part = 'bubble';
    el.dataset.by = line.by;
    speech.append(el);
    timeline.add(popIn(el), line.from);
    timeline.set(el, { autoAlpha: 0 }, line.to);
  }
  draw(0);
  const clock = { t: 0 };
  timeline.to(
    clock,
    { t: plan.end, duration: plan.end, ease: 'none', onUpdate: () => draw(clock.t) },
    0,
  );
  await show.play(timeline);
}
