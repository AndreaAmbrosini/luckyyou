// People stand around a tower of blocks. A pointer picks whose turn it is,
// anyone at any time, and they toss a block on top. The tower sways and
// holds, a pigeon may land on it, and the turns slow down. The biggest wobble
// is a false alarm, and the last turn could end three ways. The tower falls
// on the unlucky person's turn, toward them, and they get a hard hat.

import { defineScenario } from '../../scenario-kit';
import { playWobblyTower } from './play';

export default defineScenario({
  id: 'wobbly-tower',
  name: 'Wobbly Tower',
  description: 'Whoever topples it gets the job.',
  card: { emoji: '🧱' },
  people: { min: 2, max: 12 },
  play: playWobblyTower,
});
