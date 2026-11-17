// The director: builds the show as one timeline from the plan and plays it on
// the show's clock. The plan says who goes where when; this says how it looks.
// Everything that moves is worked out from the show's time each frame, so any
// frame follows from the plan alone, and the stage tells its story in data
// attributes too: the spotlight, the ending, and each person's state, mood,
// sweat and look.

import { gsap } from 'gsap';
import {
  bubble,
  handOutLooks,
  nameTag,
  pickOne,
  speechBox,
  stagePx,
  type Box,
  type Look,
  type Show,
} from '../../scenario-kit';
import { updraftMusic } from './music';
import { buildPlan, sample, type Plan } from './plan';
import {
  BOOTS,
  CANOPIES,
  COLOURS,
  EXTRAS,
  cloudPicture,
  dustPicture,
  matPicture,
  rig,
  trophyPicture,
  type Canopy,
  type CanopyColour,
  type Extra,
  type Rig,
} from './parts';
import { isDropZone, scenery, THEMES } from './postcards';
import styles from './updraft.module.css';

const SURFACE_AT = 120;
const MAT = { from: 740, to: 582 };
const GROUND = { from: 840, to: 600 };
const RISE = 1.4;
const SCROLL = 420;
const BRAKE = 1.2;
const CLOUDS = [
  { x: 90, y: 60, scale: 1.1, depth: 0.5 },
  { x: 380, y: 340, scale: 0.8, depth: 0.7 },
  { x: 720, y: 150, scale: 1.3, depth: 0.9 },
  { x: 1010, y: 480, scale: 0.9, depth: 1.1 },
  { x: 220, y: 600, scale: 1, depth: 0.6 },
  { x: 860, y: 760, scale: 0.7, depth: 0.8 },
  { x: 1150, y: 230, scale: 1.2, depth: 1 },
] as const;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (u: number) => (1 - Math.cos(Math.PI * clamp(u))) / 2;
const px = (value: number) => `${value.toFixed(2)}px`;

function known<T extends string>(all: readonly T[], name: string | undefined): T | undefined {
  return all.find((each) => each === name);
}

/** Sets a style or attribute only when it changes. */
function writer(el: HTMLElement | SVGElement) {
  const last = new Map<string, string>();
  return (key: string, value: string) => {
    if (last.get(key) === value) return;
    last.set(key, value);
    if (key === 'text') el.textContent = value;
    else if (key.startsWith('data-')) el.setAttribute(key, value);
    else el.style.setProperty(key, value);
  };
}

interface Person {
  readonly name: string;
  readonly el: HTMLElement;
  readonly rig: Rig;
  readonly put: ReturnType<typeof writer>;
  readonly index: number;
  mood: string;
  sweat: boolean;
}

interface Tag {
  readonly wrap: HTMLElement;
  readonly put: ReturnType<typeof writer>;
  readonly width: number;
  readonly height: number;
  on(t: number): boolean;
  x(t: number): number;
  top(t: number): number;
  readonly lane?: number;
}

export async function playUpdraft(show: Show): Promise<void> {
  const { stage, names, unlucky, reducedMotion } = show;
  const theme = THEMES.find((each) => each.name === show.theme) ?? THEMES[0]!;
  const zone = isDropZone(theme.name) ? theme.name : 'meadow';
  const plan = buildPlan(names, unlucky, show.random);
  const faces = handOutLooks(names, show.random);
  const night = zone === 'crater';

  stage.dataset.theme = zone;
  stage.dataset.ending = plan.ending;
  stage.dataset.spotlight = 'off';

  // The scene: sky, drifting clouds, a veil, the ground, the mat.
  const sky = stage.appendChild(document.createElement('div'));
  sky.className = styles.sky!;
  sky.style.backgroundColor = `var(--color-${theme.ground.sky})`;

  const clouds = CLOUDS.map((spec, k) => {
    const el = stage.appendChild(document.createElement('div'));
    el.className = styles.cloud!;
    el.dataset.part = 'cloud';
    const picture = cloudPicture(k, night);
    picture.setAttribute('width', String(140 * spec.scale));
    picture.setAttribute('height', String(60 * spec.scale));
    el.appendChild(picture);
    el.style.left = px(spec.x);
    return { el, spec, put: writer(el) };
  });

  const veil = stage.appendChild(document.createElement('div'));
  veil.className = styles.veil!;
  const putVeil = writer(veil);

  const ground = stage.appendChild(document.createElement('div'));
  ground.className = styles.ground!;
  ground.dataset.part = 'ground';
  ground.appendChild(scenery(zone));
  const putGround = writer(ground);

  const mat = stage.appendChild(document.createElement('div'));
  mat.className = styles.mat!;
  mat.dataset.part = 'mat';
  mat.appendChild(matPicture());
  const label = mat.appendChild(document.createElement('div'));
  label.className = styles.matText!;
  label.textContent = 'ON DUTY';
  const putMat = writer(mat);
  putMat('top', px(MAT.from));

  // The people.
  const people = new Map<string, Person>();
  names.forEach((name, index) => {
    const chosen = show.looks.get(name);
    const suits = theme.suits.map((each) => known(CANOPIES, each)).filter((each) => each);
    const canopy: Canopy =
      known(CANOPIES, chosen?.canopy) ?? pickOne(suits.length > 0 ? suits : CANOPIES, show.random)!;
    const colour: CanopyColour = known(COLOURS, chosen?.colour) ?? pickOne(COLOURS, show.random);
    const extra: Extra = known(EXTRAS, chosen?.extra) ?? pickOne(EXTRAS, show.random);
    const look: Look = faces.get(name)!;
    const jumper = rig(look, canopy, colour, extra, 'calm');
    jumper.el.style.width = '100%';
    jumper.el.style.height = '100%';
    const el = stage.appendChild(document.createElement('div'));
    el.className = styles.jumper!;
    el.dataset.person = name;
    el.dataset.canopy = canopy;
    el.dataset.colour = colour;
    el.dataset.extra = extra;
    el.dataset.state = 'at-risk';
    el.dataset.mood = 'calm';
    el.dataset.sweat = 'false';
    el.appendChild(jumper.el);
    people.set(name, { name, el, rig: jumper, put: writer(el), index, mood: 'calm', sweat: false });
  });

  const position = (name: string, t: number) => {
    const one = plan.jumpers.get(name)!;
    return { x: sample(one.x, t), y: sample(one.y, t), size: sample(one.size, t) };
  };

  // Name tags: a rail tag each at first, a bigger one for each finalist once
  // the ground rises, and a big one for the unlucky one at the reveal.
  const slot = people.size > 3 ? 1130 / people.size : 880 / people.size;
  const tiered = names.length >= 5;
  const tags = new Map<string, Tag[]>();
  const makeTag = (
    name: string,
    options: Parameters<typeof nameTag>[1],
    on: Tag['on'],
    x: (t: number, width: number) => number,
    top: (t: number, height: number, width: number) => number,
    lane?: number,
  ) => {
    const tag = nameTag(name, options);
    const wrap = stage.appendChild(document.createElement('div'));
    wrap.className = styles.tagSlot!;
    wrap.dataset.tagOf = name;
    wrap.appendChild(tag);
    const size = Number.parseFloat(tag.style.getPropertyValue('--tag-size'));
    const lines = tag.dataset.lines === '2' ? 2 : 1;
    const border = 2 * stagePx('--line');
    const chars = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(name)].length;
    const maxWidth = Number.parseFloat(tag.style.maxWidth) || 320;
    const width =
      lines === 1
        ? Math.min(maxWidth, Math.ceil(chars * 0.6 * size + 0.6 * size + border + 2))
        : maxWidth;
    const height = (1.1 * lines + 0.15) * size + border;
    const entry: Tag = {
      wrap,
      put: writer(wrap),
      width,
      height,
      on,
      x: (t) => x(t, width),
      top: (t) => top(t, height, width),
      lane,
    };
    wrap.style.display = 'none';
    (tags.get(name) ?? tags.set(name, []).get(name)!).push(entry);
  };

  const finalists = new Set(
    names.filter((name) => {
      const one = plan.jumpers.get(name)!;
      return name === unlucky || name === plan.foe || name === plan.third || one.rescueAt === null;
    }),
  );
  const ends = (name: string) => plan.jumpers.get(name)!.rescueAt ?? Infinity;
  const bigAt = plan.spot + 0.9;
  // A rail tag hangs just under its owner's boots; in a tiered rail an odd
  // lane's tag steps down only as far as it must to clear a neighbour's.
  const railOwn = (name: string, t: number, height: number) => {
    const { y, size } = position(name, t);
    return Math.min(y + BOOTS * size + 6, 718 - height);
  };
  const railTop = (name: string, lane: number, t: number, height: number, width: number) => {
    const own = railOwn(name, t, height);
    if (!tiered || lane % 2 === 0) return own;
    const myX = Math.min(1276 - width / 2, Math.max(4 + width / 2, position(name, t).x));
    let top = own;
    for (const list of tags.values()) {
      for (const tag of list) {
        if (tag.lane === undefined || tag.lane % 2 === 1 || !tag.on(t)) continue;
        if (Math.abs(tag.x(t) - myX) > (tag.width + width) / 2 + 2) continue;
        top = Math.max(top, tag.top(t) + tag.height + 2);
      }
    }
    return Math.min(top, 718 - height);
  };
  /** Big tags sit outward of their owner; a duelist's side eases over to its duel side as it moves into place. */
  const sideAt = (name: string, t: number): number => {
    const first = sample(plan.jumpers.get(name)!.x, bigAt);
    const start = first < 500 ? -1 : 1;
    if (name === plan.third) return start;
    const end = name === plan.left ? -1 : 1;
    const from = plan.gust ?? plan.spot;
    return start + (end - start) * smooth((t - from) / 0.7);
  };
  names.forEach((name) => {
    const one = plan.jumpers.get(name)!;
    const railEnd = finalists.has(name) ? Math.min(ends(name), bigAt) : ends(name);
    makeTag(
      name,
      {
        size: 28,
        maxWidth: Math.min(tiered ? 2 * slot - 12 : slot - 12, tiered ? 210 : 300),
        wrapBelow: 24,
      },
      (t) => t >= one.arrive + 0.65 && t < railEnd,
      (t, width) => Math.min(1276 - width / 2, Math.max(4 + width / 2, sample(one.x, t))),
      (t, height, width) => railTop(name, one.lane, t, height, width),
      one.lane,
    );
    if (!finalists.has(name)) return;
    const bigEnd = name === unlucky ? plan.reveal : ends(name);
    makeTag(
      name,
      { size: 34, maxWidth: 170, wrapBelow: 24 },
      (t) => t >= bigAt && t < bigEnd,
      (t, width) => {
        const { x, size } = position(name, t);
        const wanted = x + sideAt(name, t) * (0.45 * size + 8 + width / 2);
        return Math.min(1276 - width / 2, Math.max(4 + width / 2, wanted));
      },
      (t) => position(name, t).y + 0.3 * position(name, t).size,
    );
  });
  makeTag(
    unlucky,
    { size: 48, maxWidth: 560, wrapBelow: 30 },
    (t) => t >= plan.reveal,
    () => 640,
    (_, height) => Math.min(626, 714 - height),
  );

  const tagBoxes = (t: number): Box[] =>
    [...tags.values()].flat().flatMap((tag) => {
      if (!tag.on(t)) return [];
      const x = tag.x(t);
      const top = tag.top(t);
      return [{ left: x - tag.width / 2, right: x + tag.width / 2, top, bottom: top + tag.height }];
    });

  // Speech bubbles: each placed once, over every moment it is up.
  const hits = (a: Box, b: Box) =>
    a.left + 1 < b.right - 1 &&
    a.right - 1 > b.left + 1 &&
    a.top + 1 < b.bottom - 1 &&
    a.bottom - 1 > b.top + 1;
  const placed: { box: Box; from: number; to: number }[] = [];
  const speech: { el: HTMLElement; from: number; to: number }[] = [];
  for (const line of plan.bubbles) {
    const { by, text, from, to } = line;
    const size = speechBox(text, { x: 0, y: 0 });
    const half = size.right;
    const height = -size.top;
    const samples: number[] = [];
    for (let t = from - 0.025; t <= to + 0.025; t += 0.025) samples.push(t);
    const faceBoxes = samples.map((t) =>
      names.map((name) => {
        const { x, y, size: face } = position(name, t);
        const r = 0.42 * face + 8;
        return { left: x - r, right: x + r, top: y - r, bottom: y + r };
      }),
    );
    const tagBoxesAt = samples.map((t) =>
      tagBoxes(t).map((box) => ({
        left: box.left - 6,
        right: box.right + 6,
        top: box.top - 6,
        bottom: box.bottom + 6,
      })),
    );
    const speaker = position(by, line.near);
    const targetX = speaker.x;
    const targetY = speaker.y - 0.5 * speaker.size;
    const candidates: { x: number; y: number; cost: number }[] = [];
    for (let x = half + 8; x <= 1280 - half - 8; x += 20) {
      for (let y = 140 + height; y <= 712; y += 20) {
        candidates.push({ x, y, cost: Math.abs(x - targetX) + Math.abs(y - targetY) });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    const spot = candidates.find(({ x, y }) => {
      const box = { left: x - half, right: x + half, top: y - height, bottom: y };
      if (
        placed.some(
          (other) =>
            other.from < to + 0.1 &&
            from < other.to + 0.1 &&
            hits(box, {
              left: other.box.left - 8,
              right: other.box.right + 8,
              top: other.box.top - 8,
              bottom: other.box.bottom + 8,
            }),
        )
      )
        return false;
      return samples.every(
        (_, k) =>
          !faceBoxes[k]!.some((face) => hits(box, face)) &&
          !tagBoxesAt[k]!.some((tag) => hits(box, tag)),
      );
    });
    if (!spot) continue;
    placed.push({
      box: { left: spot.x - half, right: spot.x + half, top: spot.y - height, bottom: spot.y },
      from,
      to,
    });
    const el = bubble(text, { x: spot.x, y: spot.y });
    el.dataset.part = 'bubble';
    el.dataset.by = by;
    el.style.display = 'none';
    stage.appendChild(el);
    speech.push({ el, from, to });
  }

  // Dust at touchdown, the trophy at the reveal.
  const dust = stage.appendChild(document.createElement('div'));
  dust.className = styles.dust!;
  dust.dataset.part = 'dust';
  dust.appendChild(dustPicture());
  const putDust = writer(dust);
  putDust('display', 'none');
  const trophy = stage.appendChild(document.createElement('div'));
  trophy.className = styles.trophy!;
  trophy.dataset.part = 'trophy';
  trophy.appendChild(trophyPicture());
  const putTrophy = writer(trophy);
  putTrophy('display', 'none');
  putTrophy('left', px(860));
  putTrophy('top', px(MAT.to + 4));

  const lifted = (name: string, t: number) =>
    plan.lifts.some((lift) => lift.name === name && t >= lift.from && t < lift.to);
  const nameOrder = new Map(names.map((name, index) => [name, index]));

  const draw = (t: number) => {
    // The ground and the mat rise from the spotlight on.
    const rising = smooth((t - plan.spot) / RISE);
    const on = t >= plan.spot - 1e-9;
    if (stage.dataset.spotlight !== (on ? 'on' : 'off'))
      stage.dataset.spotlight = on ? 'on' : 'off';
    putMat('top', px(MAT.from + (MAT.to - MAT.from) * rising));
    putGround('top', px(GROUND.from + (GROUND.to - GROUND.from) * rising - SURFACE_AT));
    putVeil('opacity', (0.2 * smooth((t - plan.spot) / 1.2)).toFixed(3));

    // The clouds slide up while the jumpers fall, and stop as the ground comes.
    const after = Math.min(Math.max(0, t - plan.spot), BRAKE);
    const travelled = reducedMotion
      ? 0
      : SCROLL * (Math.min(t, plan.spot) + after - (after * after) / (2 * BRAKE));
    for (const { spec, put } of clouds) {
      const top = ((((spec.y - travelled * spec.depth) % 900) + 900) % 900) - 120;
      put('top', px(top));
    }

    // Who is where, and how they feel about it.
    const checking = plan.checks.find((each) => t >= each.at - 1e-9 && t < each.at + 0.6 - 1e-9);
    const kindOfCheck = checking ? (checking.win ? 'win' : 'miss') : 'none';
    if (stage.dataset.check !== kindOfCheck) stage.dataset.check = kindOfCheck;
    const exposed = names.filter((name) => {
      const at = plan.jumpers.get(name)!.rescueAt;
      return at === null || t < at - 1e-9;
    });
    const spots = new Map<string, { x: number; y: number; size: number }>();
    for (const person of people.values()) {
      const base = position(person.name, t);
      const calm = 1 - clamp((t - plan.spot) / 0.5);
      const phase = 2 * Math.PI * (0.9 * t + person.index * 0.37);
      const bob = reducedMotion ? 0 : 3 * Math.sin(phase) * calm;
      spots.set(person.name, { ...base, y: base.y + bob });
    }
    const lowest = exposed.reduce<string | null>(
      (best, name) => (best === null || spots.get(name)!.y > spots.get(best)!.y ? name : best),
      null,
    );
    for (const person of people.values()) {
      const one = plan.jumpers.get(person.name)!;
      const at = spots.get(person.name)!;
      const saved = one.rescueAt !== null && t >= one.rescueAt - 1e-9;
      const landed = person.name === unlucky && t >= plan.touchdown - 1e-9;
      const state = landed ? 'unlucky' : saved ? 'safe' : 'at-risk';
      let mood = 'worried';
      if (saved) mood = 'happy';
      else if (landed) mood = t >= plan.reveal - 1e-9 ? 'party' : 'worried';
      else if (person.name === lowest) mood = 'scared';
      const sweat = mood === 'scared';
      person.put('left', px(at.x));
      person.put('top', px(at.y));
      person.put('width', px(at.size));
      person.put('height', px(at.size));
      person.put('data-state', state);
      const check = plan.checks.find(
        (each) => each.name === person.name && t >= each.at - 1e-9 && t < each.at + 0.6 - 1e-9,
      );
      const sweptUp = saved && one.rescueAt !== null && t < one.rescueAt + 0.65;
      person.put('data-check', check && !check.win ? 'miss' : sweptUp ? 'win' : 'none');
      person.put('data-mood', mood);
      person.put('data-sweat', String(sweat));
      if (mood !== person.mood) {
        person.mood = mood;
        person.rig.setMood(mood as Parameters<Rig['setMood']>[0]);
      }
      if (sweat !== person.sweat) {
        person.sweat = sweat;
        person.rig.setSweat(sweat);
      }
      person.rig.setFolded(sample(one.fold, t));
      person.rig.setGust(lifted(person.name, t));
      const kicking =
        person.name === unlucky && plan.kick && t >= plan.kick.from && t < plan.kick.to;
      const swing = kicking
        ? 38 * Math.sin(2 * Math.PI * 5 * (t - plan.kick!.from))
        : reducedMotion
          ? 0
          : 6 *
            Math.sin(2 * Math.PI * (0.7 * t + person.index * 0.21)) *
            (1 - clamp((t - plan.spot) / 0.5));
      person.rig.setSwing(Math.round(swing * 10) / 10);
      void nameOrder;
    }

    for (const list of tags.values()) {
      for (const tag of list) {
        const shown = tag.on(t);
        tag.put('display', shown ? 'block' : 'none');
        if (!shown) continue;
        tag.put('left', px(tag.x(t)));
        tag.put('top', px(tag.top(t)));
      }
    }
    for (const line of speech) {
      const shown = t >= line.from && t < line.to;
      const display = shown ? 'block' : 'none';
      if (line.el.style.display !== display) line.el.style.display = display;
    }

    const landing = spots.get(unlucky)!;
    const puff = clamp((t - plan.touchdown) / 0.7);
    if (t >= plan.touchdown && puff < 1) {
      putDust('display', 'block');
      putDust('left', px(landing.x));
      putDust('top', px(MAT.to + 6));
      putDust('opacity', (1 - puff).toFixed(3));
    } else putDust('display', 'none');
    putTrophy('display', t >= plan.reveal ? 'block' : 'none');
  };

  // The timeline: cues and captions on their moments, the drawing on the clock.
  const score = updraftMusic(plan);
  const music = show.sound.music(score.notes);
  const timeline = gsap.timeline({ paused: true });
  for (const { t, cue } of plan.cues) timeline.call(() => void show.sound.play(cue), [], t);
  for (const { t, text } of plan.captions) timeline.call(() => show.caption(text), [], t);
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
  timeline.set({}, {}, plan.end);
  await show.play(timeline);
}

export type { Plan };
