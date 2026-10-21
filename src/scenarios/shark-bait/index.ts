// Everyone is in the water and a shark circles. A helicopter lifts people out,
// fast in groups at first, then one at a time. The last one left in the water
// gets the job, and rides off on the shark.

import { defineScenario } from '../../scenario-kit';
import { playSharkBait } from './play';

export default defineScenario({
  id: 'shark-bait',
  name: 'Shark Bait',
  description: 'The last one left in the water gets the job.',
  card: { emoji: '🦈' },
  people: { min: 2, max: 12 },
  play: playSharkBait,
});
