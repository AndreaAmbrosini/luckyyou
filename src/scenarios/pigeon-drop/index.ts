// Everyone stands in the park while a pigeon flies over. Each dropping misses
// someone, who steps aside and goes home happy, until the last one lands on
// the unlucky person's head.

import { defineScenario } from '../../scenario-kit';
import { playPigeonDrop } from './play';
// Made with `npm run still -- pigeon-drop 3 1 50 50`.
import still from './still.webp';

export default defineScenario({
  id: 'pigeon-drop',
  name: 'Pigeon Drop',
  description: 'Whoever the pigeon hits gets the job.',
  still,
  people: { min: 2, max: 12 },
  play: playPigeonDrop,
});
