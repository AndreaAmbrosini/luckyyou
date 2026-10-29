// The director: builds the whole show as one timeline from the plan and plays
// it on the show's clock. Where every racer is follows from the plan's time
// each frame.

import { gsap } from 'gsap';
import { handOutLooks, nameTag, type Show } from '../../scenario-kit';
import { boxAt, lane, tagAt, tagSize } from './layout';
import { racer, track, type RacerLook } from './parts';
import { cameraAt, FINISH, noseAt, planShow, START } from './plan';
import styles from './the-race.module.css';

const FALLBACK: RacerLook = { mount: 'snail', colour: 'tomato', extra: 'number' };

export async function playTheRace(show: Show): Promise<void> {
  const plan = planShow(show.names, show.unlucky, show.random);
  const faces = handOutLooks(show.names, show.random);
  const count = show.names.length;

  const scene = show.stage.appendChild(document.createElement('div'));
  scene.className = styles.scene!;
  const field = track({
    lanes: show.names.map((_, index) => lane(index, count).top),
    start: START.line,
    finish: FINISH + cameraAt(plan, plan.times.finish),
  });
  scene.append(field.el);
  const tags = document.createElement('div');
  tags.className = styles.layer!;

  const riders = show.names.map((name, index) => {
    const look = (show.looks.get(name) as RacerLook | undefined) ?? FALLBACK;
    const at = lane(index, count);
    const drawn = racer(look, { face: faces.get(name)!, number: index + 1 });
    const holder = scene.appendChild(document.createElement('div'));
    holder.className = styles.holder!;
    holder.dataset.person = name;
    holder.style.scale = String(at.k);
    holder.append(drawn.el);
    const tag = tags.appendChild(nameTag(name, tagSize(at.k)));
    tag.classList.add(styles.tag!);
    return { name, look, at, holder, tag };
  });
  scene.append(tags);

  const place = (time: number) => {
    field.set(cameraAt(plan, time));
    for (const { name, look, at, holder, tag } of riders) {
      const nose = noseAt(plan, name, time);
      const box = boxAt(look.mount, at, nose);
      holder.style.translate = `${box.left}px ${box.top}px`;
      const beside = tagAt(look.mount, at, nose);
      tag.style.translate = `calc(${beside.right}px - 100%) calc(${beside.middle}px - 50%)`;
    }
  };
  place(0);

  const { times } = plan;
  const timeline = gsap.timeline({ paused: true, onUpdate: () => place(timeline.time()) });
  const at = (time: number, run: () => void) => void timeline.call(run, [], time);
  at(0, () => show.caption('On your marks…'));
  at(times.go, () => show.caption('Go!'));
  at(times.stretch, () => show.caption('Final stretch!'));
  at(times.win, () => show.caption(`${show.unlucky} wins!`));
  timeline.set({}, {}, times.end);

  await show.play(timeline);
}
