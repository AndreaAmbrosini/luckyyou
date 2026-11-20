// Pigeon Drop's script, worked out before the show from the app's pick and
// the show's random: where everyone stands, where the pigeon flies and who
// each drop misses, so the stage only has to draw it.

import { eliminationOrder, fitBeats, type Cue } from '../../scenario-kit';

/** Where a person stands, in stage pixels: their head is `size` wide, their tag at most `tag`, set at `font`. */
export interface Spot {
  readonly x: number;
  readonly feet: number;
  readonly size: number;
  readonly tag: number;
  readonly font: number;
}

/** The pigeon is over `x` from `arrive` to `leave`, over `over` if anyone. */
export interface Stop {
  readonly arrive: number;
  readonly leave: number;
  readonly x: number;
  readonly over: string | null;
}

/**
 * A drop aimed at `name`: it falls from `release` and lands at `land`, on
 * their head, `offset` pixels from its middle, or on the grass as they step
 * `dodge` pixels aside.
 */
export interface Drop {
  readonly name: string;
  readonly release: number;
  readonly land: number;
  readonly hit: boolean;
  readonly dodge: number;
  readonly offset: number;
}

/** A poo storm on the unlucky person, after which everyone `spared` is safe at `at`. */
export interface Storm {
  readonly at: number;
  readonly spared: readonly string[];
}

export interface Plan {
  readonly spots: ReadonlyMap<string, Spot>;
  readonly stops: readonly Stop[];
  readonly drops: readonly Drop[];
  readonly captions: readonly (readonly [number, string])[];
  readonly cues: readonly (readonly [number, Cue])[];
  /** The finale starts here: the unlucky person is alone, or the storm comes. */
  readonly finale: number;
  /** The first drop lands on the unlucky person. */
  readonly hit: number;
  readonly storm: Storm | null;
  readonly end: number;
}

/** Where the pigeon's middle flies, in stage pixels down. */
export const PIGEON_Y = 190;
export const FALL = 0.55;
const ARRIVE = 2;
const ROUND = 1.6;
const TEASE = 0.9;
const FINALE = 6.5;
const TOTAL = 15;
/** How often a show with 3 or more people has a poo storm. */
export const STORM_CHANCE = 0.2;
const STORM_DROPS = 9;

/**
 * Everyone across the park: one row up to 6 people, else two staggered
 * rows, the back row's tags clear of the front row's heads.
 */
export function lineUp(count: number): Spot[] {
  const rows = count > 6 ? 2 : 1;
  const column = 1080 / count;
  const apart = column * rows;
  const size = Math.min(rows === 2 ? 130 : 170, 0.6 * apart);
  return Array.from({ length: count }, (_, index) => ({
    x: 100 + column * (index + 0.5),
    feet: rows === 1 ? 650 : index % 2 ? 670 : 490,
    size,
    tag: Math.min(320, apart - 16),
    font: rows === 1 ? Math.min(40, 0.3 * size) : 28,
  }));
}

export function planShow(names: readonly string[], unlucky: string, random: () => number): Plan {
  const order = eliminationOrder(names, unlucky, random);
  const leaving = order.slice(0, -1);
  // A storm comes after at least one round, with at least one other person standing.
  const stormy = names.length >= 3 && random() < STORM_CHANCE;
  const played = stormy ? 1 + Math.floor(random() * (leaving.length - 1)) : leaving.length;
  const layout = lineUp(names.length);
  const spots = new Map(names.map((name, index) => [name, layout[index]!]));
  const x = (name: string) => spots.get(name)!.x;
  // The rounds stretch, with more passes over people, so short shows last 15 s.
  const beats = fitBeats(
    {
      arrive: { seconds: ARRIVE },
      rounds: { seconds: ROUND * played, flexible: true },
      finale: { seconds: FINALE },
    },
    TOTAL,
  );
  const round = beats.rounds / played;

  const stops: Stop[] = [{ arrive: 0, leave: 0.3, x: -120, over: null }];
  const drops: Drop[] = [];
  const captions: (readonly [number, string])[] = [
    [0, 'Pigeon Drop! Whoever gets hit gets the job.'],
  ];
  const cues: (readonly [number, Cue])[] = [];
  const dropOn = (name: string, arrive: number, hit: boolean) => {
    const release = arrive + 0.1;
    const land = release + FALL;
    const spot = spots.get(name)!;
    const side = spot.x < 300 ? 1 : spot.x > 980 ? -1 : random() < 0.5 ? -1 : 1;
    stops.push({ arrive, leave: release + 0.15, x: spot.x, over: name });
    drops.push({ name, release, land, hit, dodge: hit ? 0 : side * 0.6 * spot.size, offset: 0 });
    cues.push([release, 'whoosh'], [land, hit ? 'splash' : 'thunk']);
    if (!hit) captions.push([land, `Missed ${name}!`]);
    return land;
  };

  leaving.slice(0, played).forEach((name, index) => {
    const start = ARRIVE + index * round;
    const standing = order.slice(index + 1);
    let last: string | null = null;
    // Passes over others that don't drop, as many as the round has room for.
    const teases = Math.floor((round - ROUND) / TEASE);
    for (let tease = 0; tease < teases; tease++) {
      const choices = standing.filter((other) => other !== last);
      const over = choices[Math.floor(random() * choices.length)] ?? null;
      const arrive = start + 0.5 + tease * TEASE;
      if (over) stops.push({ arrive, leave: arrive + 0.4, x: x(over), over });
      last = over;
    }
    dropOn(name, start + round - 1.1, false);
  });

  const finale = ARRIVE + beats.rounds;
  const middle = x(unlucky);
  const end = finale + FINALE;
  let hit: number;
  let storm: Storm | null = null;
  if (stormy) {
    // The pigeon hovers over the unlucky one and lets everything go at once.
    const size = spots.get(unlucky)!.size;
    captions.push([finale + 0.3, 'Uh-oh… that pigeon looks full.']);
    stops.push({ arrive: finale + 1.2, leave: finale + 3, x: middle, over: unlucky });
    for (const time of [0.5, 1, 1.4]) cues.push([finale + time, 'heartbeat']);
    for (let index = 0; index < STORM_DROPS; index++) {
      const release = finale + 1.3 + 0.13 * index;
      const offset = (random() - 0.5) * 0.6 * size;
      drops.push({ name: unlucky, release, land: release + FALL, hit: true, dodge: 0, offset });
    }
    hit = drops.at(-STORM_DROPS)!.land;
    const at = drops.at(-1)!.land + 0.3;
    cues.push(
      [finale + 1.3, 'whoosh'],
      [hit, 'splash'],
      [at - 0.3, 'splash'],
      [at + 0.4, 'fanfare'],
    );
    captions.push([hit, 'Poo storm!'], [at, `${unlucky} gets the job. Everyone else is safe!`]);
    storm = { at, spared: order.slice(played, -1) };
    stops.push({ arrive: at + 1.3, leave: end, x: 1450, over: null });
  } else {
    // The unlucky one alone: the pigeon circles them, then it lands.
    const edge = (offset: number) => Math.min(1190, Math.max(90, middle + offset));
    captions.push([finale + 0.3, `Just ${unlucky} left…`]);
    stops.push(
      { arrive: finale + 0.8, leave: finale + 1.2, x: edge(160), over: null },
      { arrive: finale + 1.9, leave: finale + 2.3, x: edge(-160), over: null },
    );
    for (const time of [0.5, 1.2, 1.8, 2.3, 2.75, 3.15, 3.5]) {
      cues.push([finale + time, 'heartbeat']);
    }
    hit = dropOn(unlucky, finale + 3, true);
    captions.push([hit, `Splat! ${unlucky} gets the job.`]);
    cues.push([hit + 0.4, 'fanfare']);
    stops.push({ arrive: hit + 1.5, leave: end, x: 1450, over: null });
  }

  return {
    spots,
    stops: stops.sort((a, b) => a.arrive - b.arrive),
    drops,
    captions,
    cues: cues.sort((a, b) => a[0] - b[0]),
    finale,
    hit,
    storm,
    end,
  };
}
