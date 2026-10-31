// Everyone rides a mount or races as a creature, as the host chose on the
// Line-up, a lane each, on the theme chosen there: a track (a sports field,
// the office, under the sea or the Moon). The camera follows the leaders.
// Winning is losing: the leader looks scared, pulling on the reins or
// flailing its arms. One thing happens at a time before the final stretch,
// which runs at full speed; only the last moment before the line is slow,
// and the unlucky person crosses first.

import { defineScenario, handOutLooks, type LineUp } from '../../scenario-kit';
import { creature } from './creature';
import {
  CREATURES,
  EXTRAS,
  extraPicture,
  isCreature,
  MOUNTS,
  type Kind,
  RACER_COLOURS,
  racer,
  type Creature,
  type RacerLook,
  type RideLook,
} from './parts';
import type { Course } from './plan';
import { playTheRace } from './play';
import { postcard } from './postcards';

/** What someone races as. */
const RACERS = {
  snail: 'Snail',
  duck: 'Duck',
  chair: 'Office chair',
  caterpillar: 'Caterpillar',
  hopper: 'Space hopper',
  ostrich: 'Ostrich',
  rocket: 'Rocket',
  sandwich: 'Sandwich',
  zombie: 'Zombie',
  robot: 'Robot',
  shark: 'Shark with feet',
  astronaut: 'Astronaut',
  monster: 'Monster',
  villain: 'Villain',
  alien: 'Alien',
  dinosaur: 'Dinosaur',
  mug: 'Coffee mug',
  printer: 'Printer',
  sticky: 'Sticky note',
  banana: 'Banana',
  icecream: 'Ice cream',
  sushi: 'Sushi',
  cat: 'Cat',
  octopus: 'Octopus',
  penguin: 'Penguin',
  pigeon: 'Pigeon',
  ghost: 'Ghost',
  mummy: 'Mummy',
  yeti: 'Yeti',
  gnome: 'Garden gnome',
} as const;

/** The creatures' tabs on the Line-up, after the rides', and each creature's tab. */
const GROUPS = ['Animals', 'Things on legs', 'Spooky', 'Space'] as const;
const KINDS: Record<Creature, (typeof GROUPS)[number]> = {
  shark: 'Animals',
  dinosaur: 'Animals',
  cat: 'Animals',
  octopus: 'Animals',
  penguin: 'Animals',
  pigeon: 'Animals',
  mug: 'Things on legs',
  printer: 'Things on legs',
  sticky: 'Things on legs',
  banana: 'Things on legs',
  icecream: 'Things on legs',
  sushi: 'Things on legs',
  zombie: 'Spooky',
  monster: 'Spooky',
  villain: 'Spooky',
  ghost: 'Spooky',
  mummy: 'Spooky',
  yeti: 'Spooky',
  gnome: 'Spooky',
  robot: 'Space',
  astronaut: 'Space',
  alien: 'Space',
};

/** The themes, each a track, with the racers that suit it, in the order its tab shows them. */
const THEMES: readonly { name: Course; label: string; suits: readonly Kind[] }[] = [
  {
    name: 'field',
    label: 'Sports field',
    suits: ['hopper', 'ostrich', 'duck', 'snail', 'caterpillar', 'cat', 'pigeon', 'dinosaur'],
  },
  {
    name: 'office',
    label: 'Office',
    suits: ['chair', 'mug', 'printer', 'sticky', 'sandwich', 'banana', 'robot', 'villain'],
  },
  { name: 'sea', label: 'Under the sea', suits: ['shark', 'octopus', 'sushi', 'duck', 'penguin'] },
  { name: 'moon', label: 'Moon', suits: ['rocket', 'astronaut', 'alien', 'robot', 'hopper'] },
];

/** Colours and extras: "shark" is a colour here, read out as "Grey". */
const LABELS = {
  tomato: 'Tomato',
  sun: 'Sun',
  mint: 'Mint',
  grape: 'Grape',
  pink: 'Pink',
  orange: 'Orange',
  sea: 'Sea',
  shark: 'Grey',
  googly: 'Googly eyes',
  tophat: 'Top hat',
  number: 'Number',
  scarf: 'Scarf',
  cape: 'Cape',
  bowtie: 'Bow tie',
} as const;

/** The same rider's face for a name every time: the Line-up has no run to hand faces out. */
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

const lineUp: LineUp = {
  heading: 'Line up the racers',
  start: 'Start the race',
  options: [
    {
      // Still `mount`, so looks stored before creatures keep their ride (decision 0012).
      name: 'mount',
      label: 'Racer',
      drawn: true,
      choices: [
        ...MOUNTS.map((mount) => ({ name: mount, label: RACERS[mount], group: 'Rides' })),
        ...GROUPS.flatMap((group) =>
          CREATURES.filter((kind) => KINDS[kind] === group).map((kind) => ({
            name: kind,
            label: RACERS[kind],
            group,
          })),
        ),
      ],
    },
    {
      name: 'colour',
      label: 'Colour',
      choices: RACER_COLOURS.map((colour) => ({
        name: colour,
        label: LABELS[colour],
        swatch: colour,
      })),
    },
    {
      name: 'extra',
      label: 'Extra',
      choices: EXTRAS.map((extra) => ({
        name: extra,
        label: LABELS[extra],
        picture: () => extraPicture(extra),
      })),
    },
  ],
  themes: THEMES.map((theme) => ({ ...theme, picture: () => postcard(theme.name) })),
  draw: (chosen, { name, place }) => {
    const look = chosen as unknown as RacerLook;
    const drawn = { face: faceOf(name), number: place };
    return isCreature(look.mount)
      ? creature(look as RacerLook & { mount: Creature }, drawn).el
      : racer(look as RideLook, drawn).el;
  },
};

export default defineScenario({
  id: 'the-race',
  name: 'The Race',
  description: 'Whoever crosses the line first gets the job.',
  card: { emoji: '🏁' },
  people: { min: 2, max: 8 },
  lineUp,
  play: playTheRace,
});
