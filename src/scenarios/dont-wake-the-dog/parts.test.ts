import { describe, expect, it } from 'vitest';
import { DOG, type DogState } from './plan';
import { AT_RISK, dog, fence, garden, heart, lead, sign, SIGN } from './parts';

const shown = (root: Element, part: string) => {
  const el = root.querySelector(`[data-part="${part}"]`);
  if (!el) throw new Error(`No ${part}.`);
  // Shown when neither it nor anything up to the root is hidden.
  for (let at: Element | null = el; at && at !== root; at = at.parentElement) {
    if (at.getAttribute('display') === 'none') return false;
  }
  return true;
};

describe('the garden', () => {
  it('draws the sky with clouds and the grass', () => {
    const el = garden();
    expect(el.dataset.part).toBe('scene');
    expect(el.querySelector('[data-part="grass"]')).not.toBeNull();
    expect(el.children.length).toBe(4);
  });
});

describe('the fence and the gate', () => {
  it('swings the gate open on its hinge and shut again', () => {
    const { el, swing } = fence();
    const gate = el.querySelector<SVGGElement>('[data-part="gate"]')!;
    expect(gate.dataset.open).toBe('0');
    swing(1);
    expect(gate.dataset.open).toBe('1');
    expect(gate.getAttribute('transform')).toContain('scale(0.3');
    swing(0);
    expect(gate.getAttribute('transform')).toContain('scale(1 1)');
  });

  it('puts the sign on the arch, with the count at risk or what it says', () => {
    const board = sign();
    expect(board.el.dataset.part).toBe('sign');
    expect(board.el.style.left).toBe(`${SIGN.left}px`);
    board.count(7);
    expect(board.el.textContent).toBe(`${AT_RISK}7`);
    expect(board.el.querySelector('[data-part="at-risk"]')!.textContent).toBe('7');
    board.say('Walkies!');
    expect(board.el.textContent).toBe('Walkies!');
  });
});

describe('the dog', () => {
  const STATES = Object.keys(DOG) as DogState[];

  it('shows as many Zs as its state has, and the "!" only when awake', () => {
    const { el, set } = dog();
    for (const state of STATES) {
      set(state, 0, 'none');
      const zs = ['z1', 'z2', 'z3'].filter((z) => shown(el, z)).length;
      expect(zs, state).toBe(state === 'stand' ? 0 : DOG[state].zs);
      expect(shown(el, 'bang'), state).toBe(DOG[state].bang);
    }
  });

  it('opens its eyes, raises its ears and tail as its state says', () => {
    const { el, set } = dog();
    for (const state of STATES.filter((each) => each !== 'stand')) {
      set(state, 0, 'none');
      const look = DOG[state];
      expect(shown(el, 'ear-up'), state).toBe(look.ears === 'up');
      expect(shown(el, 'ear-flat'), state).toBe(look.ears === 'flat');
      expect(shown(el, 'tail-raised'), state).toBe(look.tail === 'raised');
      expect(shown(el, 'eyes-open'), state).toBe(look.eyes === 'open');
      expect(shown(el, 'left-half'), state).toBe(look.eyes === 'both-half');
      expect(shown(el, 'right-half'), state).toBe(
        look.eyes === 'one-half' || look.eyes === 'both-half',
      );
      expect(shown(el, 'left-shut'), state).toBe(look.eyes === 'shut' || look.eyes === 'one-half');
    }
  });

  it('stands up wagging, and draws its marks and its lifted head', () => {
    const { el, set } = dog();
    set('stand', 0, 'wag');
    expect([shown(el, 'standing'), shown(el, 'lying')]).toEqual([true, false]);
    set('light', 1, 'sniff');
    expect(shown(el, 'sniff')).toBe(true);
    expect(el.querySelector('[data-part="head"]')!.getAttribute('transform')).toContain(
      'rotate(16',
    );
    set('light', 0, 'twitch');
    expect([shown(el, 'sniff'), shown(el, 'twitch')]).toEqual([false, true]);
    expect(el.getAttribute('aria-label')).toBe('The dog, sleeping lightly');
  });
});

describe('the walk', () => {
  it('draws the lead from the collar to the hand, and hearts where asked', () => {
    const { el, run } = lead();
    run({ x: 704, y: 475 }, { x: 582, y: 544 });
    expect(el.querySelector('path')!.getAttribute('d')).toMatch(/^M582 544 Q.* 704 475$/);
    const love = heart(636, 372);
    expect([love.style.left, love.style.top]).toEqual(['636px', '372px']);
  });
});
