// People stand around a tower of blocks. A pointer picks whose turn it is,
// and they toss a block on top. If the tower holds, they are safe and hop up
// to the Safe bench, so fewer and fewer are at risk while the tower grows
// shakier. With three left the stage dims to a spotlight. The tower falls
// with three or two left, on the unlucky person's turn, toward them, and they
// get a hard hat. With 2 or 3 people it is the final from the start.

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
