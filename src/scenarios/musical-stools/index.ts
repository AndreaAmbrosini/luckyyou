// People march round an oval to a gramophone waltz. When it stops they
// scramble for one stool fewer than there are marchers; whoever sits is safe
// and goes to the sofa. The last two fight for one stool, and the one left
// standing gets the Boss Throne.

import { defineScenario } from '../../scenario-kit';
import { playMusicalStools } from './play';
// Made with `npm run still -- musical-stools 7 1 50 50`.
import still from './still.webp';

export default defineScenario({
  id: 'musical-stools',
  name: 'Musical Stools',
  description: 'Last one standing gets the job.',
  still,
  people: { min: 2, max: 12 },
  play: playMusicalStools,
});
