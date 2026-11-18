// A toy grabber at a fair. Everyone is a plush toy in the pile; the claw
// takes them out a grab at a time and carries each to the stop over the prize
// chute, where they slip out onto a shelf it can't reach. The last grab takes
// two, and the one who doesn't slip goes down the chute and comes out of its
// door as the prize. With 2 or 3 people it is the final from the start.

import { defineScenario } from '../../scenario-kit';
import { playTheClaw } from './play';
// Made with `npm run still -- the-claw 3.64 1.42 5 74`: the first grab, of two,
// half way up its lift.
import still from './still.webp';

export default defineScenario({
  id: 'the-claw',
  name: 'The Claw',
  description: 'Whoever the claw keeps hold of gets the job.',
  still,
  people: { min: 2, max: 12 },
  play: playTheClaw,
});
