// A stand-in show that keeps the scenario contract until the real one lands.

import { gsap } from 'gsap';
import { eliminationOrder, fitBeats, nameTag, type Show } from '../../scenario-kit';
import styles from './hot-potato.module.css';

export async function playHotPotato(show: Show): Promise<void> {
  const order = eliminationOrder(show.names, show.unlucky, show.random);
  const leaving = order.slice(0, -1);
  // The leaving stretches so the show lasts 16 seconds at any head count.
  const beats = fitBeats(
    {
      arrive: { seconds: 1.5 },
      leave: { seconds: 0.6 * leaving.length, flexible: true },
      end: { seconds: 2.5 },
    },
    16,
  );

  const row = show.stage.appendChild(document.createElement('ul'));
  row.className = styles.people;
  const tags = new Map(
    show.names.map((name) => {
      const tag = row.appendChild(document.createElement('li'));
      tag.dataset.person = name;
      // The kit's tags set names as text, at a size that reads on a shared screen.
      tag.append(nameTag(name, { size: 48, maxWidth: 360 }));
      return [name, tag];
    }),
  );

  // One timeline for the whole show, played on the show's clock.
  const timeline = gsap.timeline();
  timeline.from([...tags.values()], {
    y: 60,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.9 / show.names.length,
  });
  const each = beats.leave / leaving.length;
  leaving.forEach((name, index) => {
    const tag = tags.get(name)!;
    const at = beats.arrive + index * each;
    timeline.call(() => void (tag.dataset.left = ''), [], at);
    timeline.to(tag, { y: -80, autoAlpha: 0, duration: 0.5 }, at);
  });
  const end = beats.arrive + beats.leave;
  timeline.to(tags.get(show.unlucky)!, { scale: 1.4, duration: 0.6, ease: 'back.out(2)' }, end);
  timeline.set({}, {}, end + beats.end);

  await show.play(timeline);
}
