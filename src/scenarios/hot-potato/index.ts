// People stand in a ring and pass a potato with a lit sparkler round it, fast
// and then slower, while a fuse burns down. Whoever it won't come back to sits
// down, leaving three. It pops on the unlucky person.

import { defineScenario } from '../../scenario-kit';
import { playHotPotato } from './play';
// Made with `npm run still -- hot-potato 9 1.25 84 83`.
import still from './still.webp';

export default defineScenario({
  id: 'hot-potato',
  name: 'Hot Potato',
  description: "Whoever's holding it when it pops gets the job.",
  still,
  people: { min: 2, max: 12 },
  play: playHotPotato,
});
