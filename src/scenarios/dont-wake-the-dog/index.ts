// A dog sleeps across the gateway of a garden fence. Turns go along the line
// of people at risk: each tiptoes up behind the dog, over it and out through
// the gate, where they are safe. The dog sleeps lighter after every crossing,
// and safe turns get the same scares as the last one. It wakes with three or
// two left, on the unlucky person's turn, and takes them for a walk. With 2
// or 3 people it is the final from the start.

import { defineScenario } from '../../scenario-kit';
import { playDontWakeTheDog } from './play';

export default defineScenario({
  id: 'dont-wake-the-dog',
  name: "Don't Wake the Dog",
  description: 'Whoever wakes the dog gets the job.',
  card: { emoji: '🐶' },
  people: { min: 2, max: 12 },
  play: playDontWakeTheDog,
});
