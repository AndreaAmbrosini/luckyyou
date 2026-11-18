// The Claw's music: Pop Goes the Weasel, the jack-in-the-box tune
// (traditional, in print since the 1850s, public domain), arranged from the
// Nottingham Music Database's "Pop Goes the Wheezle" (Eric Foxley's
// collection, in its ABC edition by James Allwright): its first strain, eight
// bars of 6/8, up a fourth from G to C, with its chords, one or two a bar. A
// beat is an eighth note, six to a bar. The tune is on the steel voice, close
// to a music box, over a bass on each bar's first beat and chords on its
// second half. It winds up from the claw's first move, quicker all the way
// along one smooth curve, and stops for good on the eighth before "Pop!".

import { melody, type Note } from '../../scenario-kit';
import type { Plan } from './plan';

/**
 * Eighths a second as the claw first moves, as near START as the stop
 * allows (see `paceFor`), and TOP times that as it stops; between them the
 * pace grows as `start × TOP ^ (u ^ CURVE)`, `u` from 0 to 1.
 */
export const START = 4.2;
export const TOP = 1.7;
export const CURVE = 1.6;

const BAR = 6;
const STRAIN = 8 * BAR;
/** The strain's eight bars; "Pop!" is the A that opens bar 7. */
const TUNE = [
  'C5:2 E5 D5:2 F5 | E5 G5 E5 C5:2 G4 | C5:2 E5 D5 E5 F5 | E5:3 C5:2 G4',
  'C5:2 E5 D5:2 F5 | E5 G5 E5 C5:3 | A5:3 D5:2 F5 | E5:3 C5:3',
].join(' | ');
/** The beat of "Pop!" in the strain. */
export const POP = 6 * BAR;
/** Each bar's chords from the print: the first on its first beat, the second on its fourth. */
const CHORDS: readonly (readonly [string, string])[] = [
  ['C', 'G7'],
  ['C', 'G7'],
  ['C', 'G7'],
  ['C', 'G7'],
  ['C', 'G7'],
  ['C', 'C'],
  ['F', 'G7'],
  ['C', 'C'],
];
const ROOT: Readonly<Record<string, string>> = { C: 'C3', F: 'F2', G7: 'G2' };
const STAB: Readonly<Record<string, readonly string[]>> = {
  C: ['C4', 'E4', 'G4'],
  F: ['A3', 'C4', 'F4'],
  G7: ['B3', 'D4', 'F4'],
};
/**
 * Where the tune may come in: at the top of bar 1, 3 or 5, where its
 * phrases start. The song starts with the claw's first move at one of them,
 * whichever lets it reach the eighth before "Pop!" at the stop nearest START.
 */
const ENTRIES = [0, 2 * BAR, 4 * BAR] as const;
/** Where in that eighth it stops: half way through it. */
const BEFORE = 0.5;

/** The strain, starting at song beat `from`. */
function strain(from: number): Note[] {
  return [
    ...melody(TUNE, from, 'steel'),
    ...CHORDS.flatMap(([first, second], bar) => [
      ...melody(`${ROOT[first]}:2`, from + bar * BAR, 'bass'),
      ...STAB[second]!.flatMap((name) => melody(`${name}:.5`, from + bar * BAR + 3, 'stab')),
    ]),
  ];
}

/** How far the tune goes as `u` goes from 0 to 1 at a pace of 1 to TOP: its beats over the pace at the start. */
const STEPS = 1000;
const WOUND = (() => {
  const table = [0];
  const pace = (u: number) => TOP ** (u ** CURVE);
  for (let k = 1; k <= STEPS; k++) {
    table.push(table[k - 1]! + (pace((k - 1) / STEPS) + pace(k / STEPS)) / (2 * STEPS));
  }
  return table;
})();
const wound = (u: number) => {
  const at = Math.min(STEPS - 1, Math.floor(u * STEPS));
  return WOUND[at]! + (WOUND[at + 1]! - WOUND[at]!) * (u * STEPS - at);
};

/**
 * Where the song comes in, and its pace as the claw first moves, so that
 * over `seconds` it reaches half way through the eighth before a "Pop!":
 * of the tune's three entries and the strains it can play, the one whose
 * pace is nearest START.
 */
export function paceFor(seconds: number): { entry: number; start: number; beats: number } {
  const options = ENTRIES.flatMap((entry) =>
    Array.from({ length: 12 }, (_, k) => POP - BEFORE - entry + k * STRAIN)
      .filter((beats) => beats > 0)
      .map((beats) => ({ entry, beats, start: beats / (seconds * WOUND[STEPS]!) })),
  );
  return options.reduce((best, each) =>
    Math.abs(Math.log(each.start / START)) < Math.abs(Math.log(best.start / START)) ? each : best,
  );
}

export interface Score {
  readonly notes: readonly Note[];
  /** Where the song is at show time `t`, and how fast it's moving. */
  at(t: number): { beat: number; speed: number };
  /** Where in the strain the song came in, in beats. */
  readonly entry: number;
  /** Its pace as the claw first moves, in eighths a second. */
  readonly start: number;
  /** Show seconds it starts and stops. */
  readonly from: number;
  readonly to: number;
}

/**
 * Pop Goes the Weasel from the claw's first move, quicker all the way,
 * without its bass from the heartbeat on, stopping for good half way
 * through the eighth before "Pop!" as the claw shuts round the unlucky
 * person or they tip into the chute.
 */
export function clawMusic(plan: Plan): Score {
  const from = plan.grabs[0]!.from;
  const to = plan.wake;
  const seconds = to - from;
  const { entry, start, beats: ends } = paceFor(seconds);
  const beatAt = (t: number) => start * seconds * wound((t - from) / seconds);
  const speedAt = (t: number) => start * TOP ** (((t - from) / seconds) ** CURVE);
  const thin = plan.spotlight <= from ? 0 : beatAt(plan.spotlight);

  const strains = Math.ceil((ends + entry) / STRAIN) + 1;
  const notes = Array.from({ length: strains }, (_, k) => strain(k * STRAIN - entry))
    .flat()
    .filter((note) => note.at >= 0 && note.at < ends - 1e-9)
    .filter((note) => note.voice !== 'bass' || note.at < thin - 1e-9)
    // Nothing rings past the stop.
    .map((note) => ({ ...note, beats: Math.min(note.beats, ends - note.at) }))
    .sort((a, b) => a.at - b.at);

  return {
    notes,
    entry,
    start,
    from,
    to,
    at(t) {
      if (t < from) return { beat: 0, speed: 0 };
      if (t >= to) return { beat: ends, speed: 0 };
      return { beat: beatAt(t), speed: speedAt(t) };
    },
  };
}
