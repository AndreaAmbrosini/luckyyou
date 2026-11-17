import { defineScenario } from '../../scenario-kit';
import { playHideAndSeek } from './play';
// Made with `npm run still -- hide-and-seek 11.73 1 50 50`.
import still from './still.webp';

export default defineScenario({
  id: 'hide-and-seek',
  name: 'Hide and Seek',
  description: 'Best hider gets the job.',
  still,
  people: { min: 2, max: 12 },
  play: playHideAndSeek,
});
