// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock.

import { gsap } from 'gsap';
import { nameTag, type Show } from '../../scenario-kit';
import { seat } from './layout';
import { planShow } from './plan';

export async function playDontWakeTheDog(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  plan.order.forEach((name, index) => {
    const spot = seat(index, plan.order.length);
    const tag = show.stage.appendChild(nameTag(name, { size: 28, maxWidth: 160 }));
    tag.style.position = 'absolute';
    tag.style.left = `${spot.x - 80}px`;
    tag.style.top = `${spot.y}px`;
  });
  const timeline = gsap.timeline({ paused: true });
  for (const { at, text } of plan.captions) timeline.call(() => show.caption(text), [], at);
  timeline.set({}, {}, plan.end);
  await show.play(timeline);
}
