// People stand in a ring and throw a potato with a lit sparkler, faster and
// faster. The sparkler burns down, seems to go out, relights, and the throws
// slow to a showdown between three. It pops in the unlucky person's hands.

import { defineScenario } from '../../scenario-kit';
import { playHotPotato } from './play';

export default defineScenario({
  id: 'hot-potato',
  name: 'Hot Potato',
  description: "Whoever's holding it when it pops gets the job.",
  card: { emoji: '🥔' },
  people: { min: 2, max: 12 },
  play: playHotPotato,
});
