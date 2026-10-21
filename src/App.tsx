import { usePeople } from './people/people';
import { WhosIn } from './screens/WhosIn';

export default function App() {
  const people = usePeople();
  return <WhosIn people={people} />;
}
