// Everyone rides a mount or races as a creature, as the host chose on the
// Line-up, a lane each, down a sports-field track, the camera following the
// leaders. Winning is losing: the leader looks scared, pulling on the reins
// or flailing its arms. One thing happens at a time
// before the final stretch, which runs at full speed; only the last moment
// before the line is slow, and the unlucky person crosses first.

import { defineScenario, handOutLooks, type LineUp } from '../../scenario-kit';
import { creature } from './creature';
import {
  CREATURES,
  EXTRAS,
  isCreature,
  MOUNTS,
  RACER_COLOURS,
  racer,
  type Creature,
  type RacerLook,
  type RideLook,
} from './parts';
import { playTheRace } from './play';

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
} as const;

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
      choices: [
        ...MOUNTS.map((mount) => ({ name: mount, label: RACERS[mount], group: 'Rides' })),
        ...CREATURES.map((kind) => ({ name: kind, label: RACERS[kind], group: 'Creatures' })),
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
      choices: EXTRAS.map((extra) => ({ name: extra, label: LABELS[extra] })),
    },
  ],
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
