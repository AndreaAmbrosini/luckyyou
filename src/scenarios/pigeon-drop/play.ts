// Pigeon Drop's stage: the park, the people, the pigeon and its droppings,
// drawn from the plan on one timeline. Every colour comes from a class in
// pigeon-drop.module.css.

import { gsap } from 'gsap';
import { handOutLooks, head, nameTag, type Look, type Mood, type Show } from '../../scenario-kit';
import { pigeonDropMusic } from './music';
import styles from './pigeon-drop.module.css';
import { FALL, PIGEON_Y, planShow, type Spot } from './plan';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

/** An SVG of `shapes` on a `width` by `height` grid, its groups marked by data-part. */
function drawing(
  width: number,
  height: number,
  parts: Record<string, readonly Shape[]>,
): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const [name, shapes] of Object.entries(parts)) {
    const group = svg.appendChild(document.createElementNS(SVG, 'g'));
    group.dataset.part = name;
    for (const [tag, className, attributes] of shapes) {
      const shape = group.appendChild(document.createElementNS(SVG, tag));
      shape.setAttribute('class', className);
      shape.setAttribute('stroke-width', '4');
      shape.setAttribute('stroke-linejoin', 'round');
      shape.setAttribute('stroke-linecap', 'round');
      for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
    }
  }
  return svg;
}

/** A pigeon facing right on a 160 by 110 grid; data-part="pigeon". */
function pigeon() {
  const el = document.createElement('div');
  el.className = styles.pigeon;
  el.dataset.part = 'pigeon';
  const svg = drawing(160, 110, {
    body: [
      ['path', styles.feather, { d: 'M10 56 L44 48 L44 74 Z' }],
      ['ellipse', styles.feather, { cx: 74, cy: 62, rx: 44, ry: 28 }],
      ['ellipse', styles.neck, { cx: 108, cy: 48, rx: 16, ry: 20 }],
      ['circle', styles.feather, { cx: 120, cy: 32, r: 18 }],
      ['path', styles.beak, { d: 'M136 28 L154 35 L136 40 Z' }],
      ['circle', styles.white, { cx: 124, cy: 28, r: 6, 'stroke-width': 2 }],
      ['circle', styles.ink, { cx: 126, cy: 28, r: 3 }],
      ['path', styles.feet, { d: 'M64 89 L58 100 M82 89 L86 100' }],
    ],
    wing: [
      ['path', styles.wing, { d: 'M48 56 Q66 4 104 40 Q82 66 48 56 Z' }],
      ['path', styles.bar, { d: 'M64 36 L76 52 M78 30 L88 48' }],
    ],
  });
  el.append(svg);
  return { el, svg, wing: svg.querySelector<SVGGElement>('[data-part="wing"]')! };
}

/** A dropping, white on ink, on a 34 by 34 grid; data-part="poo". */
function dropping(on: string): HTMLElement {
  const el = document.createElement('div');
  el.className = styles.poo;
  el.dataset.part = 'poo';
  el.dataset.on = on;
  el.append(
    drawing(34, 34, {
      blob: [
        [
          'path',
          styles.white,
          {
            d: 'M17 3 Q23 9 19 12 Q27 13 25 19 Q32 22 28 28 Q17 33 6 28 Q2 22 9 19 Q7 13 15 12 Q12 8 17 3 Z',
            'stroke-width': 3,
          },
        ],
      ],
    }),
  );
  return el;
}

interface Person {
  readonly el: HTMLElement;
  readonly spot: Spot;
  setMood(mood: Mood): void;
}

/** Someone in the park: their head on land, their name on their chest; data-person, data-mood, data-state. */
function person(name: string, look: Look, spot: Spot): Person {
  const el = document.createElement('div');
  el.className = styles.person;
  el.dataset.person = name;
  el.dataset.state = 'standing';
  el.style.left = `${spot.x - spot.size / 2}px`;
  el.style.top = `${spot.feet - spot.size}px`;
  el.style.width = `${spot.size}px`;
  el.style.height = `${spot.size}px`;
  const face = head(look, { land: true, mood: 'worried' });
  face.el.setAttribute('width', String(spot.size));
  face.el.setAttribute('height', String(spot.size));
  el.append(face.el, nameTag(name, { size: spot.font, maxWidth: spot.tag, chest: true }));
  const setMood = (mood: Mood) => {
    el.dataset.mood = mood;
    face.setMood(mood);
  };
  setMood('worried');
  return { el, spot, setMood };
}

export async function playPigeonDrop(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const looks = handOutLooks(show.names, show.random, show.photos);
  // The music moves along with the show's time, as everything else does.
  const score = pigeonDropMusic(plan);
  const music = show.sound.music(score.notes);
  const timeline = gsap.timeline({
    paused: true,
    onUpdate: () => {
      const { beat, speed } = score.at(timeline.time());
      music.to(beat, speed);
    },
  });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  for (const [time, text] of plan.captions) at(time, () => show.caption(text));
  for (const [time, cue] of plan.cues) at(time, () => void show.sound.play(cue));

  const park = show.stage.appendChild(document.createElement('div'));
  park.className = styles.park;
  park.appendChild(document.createElement('div')).className = styles.grass;

  const people = new Map(
    show.names.map((name) => [name, person(name, looks.get(name)!, plan.spots.get(name)!)]),
  );
  // The back row first, so the front row stands over it.
  for (const { el } of [...people.values()].sort((a, b) => a.spot.feet - b.spot.feet)) {
    park.append(el);
  }
  const mood = (time: number, name: string, next: Mood) =>
    at(time, () => people.get(name)!.setMood(next));

  // Droppings fall in front of everyone, from under the pigeon.
  for (const drop of plan.drops) {
    const { el, spot } = people.get(drop.name)!;
    const poo = park.appendChild(dropping(drop.name));
    const lands = drop.hit ? spot.feet - 0.9 * spot.size : spot.feet - 10;
    gsap.set(poo, { x: spot.x + drop.offset - 17, y: PIGEON_Y + 20, autoAlpha: 0 });
    timeline.set(poo, { autoAlpha: 1 }, drop.release);
    timeline.to(poo, { y: lands - 17, duration: FALL, ease: 'power2.in' }, drop.release);
    timeline.to(poo, { scaleX: 1.4, scaleY: 0.7, duration: 0.15 }, drop.land);
    at(drop.land, () => void (poo.dataset.landed = drop.hit ? 'hit' : 'miss'));
    mood(drop.release, drop.name, 'scared');
    if (drop.hit) {
      at(drop.land, () => void (el.dataset.state = 'hit'));
      continue;
    }
    timeline.to(el, { x: drop.dodge, duration: 0.35, ease: 'power2.out' }, drop.release + 0.1);
    mood(drop.land, drop.name, 'happy');
    at(drop.land, () => void (el.dataset.state = 'safe'));
    timeline.to(el, { y: -40, autoAlpha: 0, duration: 0.5 }, drop.land + 0.45);
  }
  // After a poo storm, everyone still standing is safe at once.
  for (const name of plan.storm?.spared ?? []) {
    const { el } = people.get(name)!;
    const time = plan.storm!.at;
    mood(time, name, 'happy');
    at(time, () => void (el.dataset.state = 'safe'));
    timeline.to(el, { y: -40, autoAlpha: 0, duration: 0.5 }, time + 0.45);
  }

  // The pigeon, over everyone, flying from stop to stop and facing its way.
  const bird = pigeon();
  park.append(bird.el);
  const [first, ...rest] = plan.stops;
  gsap.set(bird.el, { x: first!.x - 80, y: PIGEON_Y - 55 });
  rest.reduce((from, to) => {
    at(from.leave, () => void (bird.svg.style.scale = to.x < from.x ? '-1 1' : '1 1'));
    timeline.to(
      bird.el,
      { x: to.x - 80, duration: to.arrive - from.leave, ease: 'sine.inOut' },
      from.leave,
    );
    // Whoever it hovers over without dropping gets a fright.
    if (
      to.over &&
      !plan.drops.some((drop) => drop.release > to.arrive && drop.release < to.leave)
    ) {
      mood(to.arrive, to.over, 'scared');
      mood(to.leave, to.over, 'worried');
    }
    return to;
  }, first!);
  if (!show.reducedMotion) {
    // On the show's clock, so the run stops it when the show ends.
    gsap.fromTo(
      bird.wing,
      { '--flap': '10deg' },
      { '--flap': '-30deg', duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: -1 },
    );
  }
  timeline.set({}, {}, plan.end);

  await show.play(timeline);
}
