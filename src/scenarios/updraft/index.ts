// Everyone drops from the sky under a canopy of their choice, on the drop
// zone chosen on the Line-up, a lane each. A thermal takes the lucky ones up
// and away while the ground, and a landing mat, rise to meet the rest. The
// last two hang over the mat, and the unlucky one touches down first.

import { defineScenario, handOutLooks, type ChosenLook, type LineUp } from '../../scenario-kit';
import {
  CANOPIES,
  COLOURS,
  EXTRAS,
  extraPicture,
  jumperPicture,
  type Canopy,
  type CanopyColour,
  type Extra,
} from './parts';
import { playUpdraft } from './play';
import { postcard, THEMES } from './postcards';
// Made with `npm run still -- updraft 19.5 1.05 50 46 meadow`.
import still from './still.webp';

const CANOPY_LABELS: Record<Canopy, string> = {
  chute: 'Patch\u00ADwork',
  umbrella: 'Umbrella',
  parasol: 'Parasol',
  kite: 'Box kite',
  balloons: 'Balloons',
  bedsheet: 'Bedsheet',
  pizza: 'Pizza box',
  coat: 'Big coat',
  towel: 'Beach towel',
  newspaper: 'News\u00ADpaper',
  dandelion: 'Dan\u00ADde\u00ADlion',
  gulls: 'Sea\u00ADgulls',
  saucer: 'Toy saucer',
  flamingo: 'Flamingo',
};

const GROUPS: Record<Canopy, string> = {
  chute: 'Classics',
  umbrella: 'Classics',
  parasol: 'Classics',
  kite: 'Classics',
  balloons: 'Classics',
  bedsheet: 'Cupboard',
  pizza: 'Cupboard',
  coat: 'Cupboard',
  towel: 'Cupboard',
  newspaper: 'Cupboard',
  dandelion: 'Wildcards',
  gulls: 'Wildcards',
  saucer: 'Wildcards',
  flamingo: 'Wildcards',
};

const COLOUR_LABELS: Record<CanopyColour, string> = {
  tomato: 'Red',
  orange: 'Orange',
  sun: 'Yellow',
  mint: 'Green',
  sea: 'Blue',
  grape: 'Purple',
  pink: 'Pink',
  shark: 'Grey',
};

const EXTRA_LABELS: Record<Extra, string> = {
  none: 'Nothing',
  scarf: 'Scarf',
  goggles: 'Aviator shades',
  fan: 'Hand fan',
  mug: 'Coffee mug',
};

/** The same face for a name every time: the Line-up has no run to hand faces out. */
function faceOf(name: string) {
  let seed = [...name].reduce((hash, character) => (hash * 31 + character.codePointAt(0)!) | 0, 7);
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  return handOutLooks([name], random).get(name)!;
}

const pick = <T extends string>(all: readonly T[], name: string | undefined, fallback: T): T =>
  all.find((each) => each === name) ?? fallback;

function drawJumper(chosen: ChosenLook, { name }: { name: string }) {
  return jumperPicture(
    faceOf(name),
    pick(CANOPIES, chosen.canopy, 'chute'),
    pick(COLOURS, chosen.colour, 'tomato'),
    pick(EXTRAS, chosen.extra, 'none'),
  );
}

const lineUp: LineUp = {
  heading: 'Line up the jumpers',
  start: 'Take the plunge',
  options: [
    {
      name: 'canopy',
      label: 'Jumper',
      drawn: true,
      choices: CANOPIES.map((canopy) => ({
        name: canopy,
        label: CANOPY_LABELS[canopy],
        group: GROUPS[canopy],
      })),
    },
    {
      name: 'colour',
      label: 'Colour',
      choices: COLOURS.map((colour) => ({
        name: colour,
        label: COLOUR_LABELS[colour],
        swatch: colour,
      })),
    },
    {
      name: 'extra',
      label: 'Extra',
      choices: EXTRAS.map((extra) => ({
        name: extra,
        label: EXTRA_LABELS[extra],
        picture: () => extraPicture(extra),
      })),
    },
  ],
  themes: THEMES.map((theme) => ({ ...theme, picture: () => postcard(theme.name) })),
  words: { theme: 'Drop zone', choices: 'jumpers' },
  draw: drawJumper,
};

export default defineScenario({
  id: 'updraft',
  name: 'Updraft!',
  description: 'First feet on the mat get the job.',
  still,
  people: { min: 2, max: 8 },
  lineUp,
  play: playUpdraft,
});
