import { describe, expect, it, vi } from 'vitest';
import { createSound } from './sound';

/** The few parts of a Web Audio context the sound player touches. */
function fakeAudio() {
  const contexts: { closed: boolean }[] = [];
  class FakeContext {
    currentTime = 0;
    destination = {};
    closed = false;
    constructor() {
      contexts.push(this);
    }
    close() {
      this.closed = true;
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return contexts;
}

describe('createSound', () => {
  it('opens an audio output the first time an unmuted show plays a sound', () => {
    const contexts = fakeAudio();
    const sound = createSound({ muted: false });
    expect(contexts).toHaveLength(0);
    sound.player.play('splash');
    sound.player.play('whoosh');
    expect(contexts).toHaveLength(1);
  });

  it('never opens one while muted', () => {
    const contexts = fakeAudio();
    createSound({ muted: true }).player.play('splash');
    expect(contexts).toHaveLength(0);
  });

  it('closes its output when the show is over', () => {
    const contexts = fakeAudio();
    const sound = createSound({ muted: false });
    sound.player.play('splash');
    sound.stop();
    expect(contexts[0]!.closed).toBe(true);
  });

  it('stays quiet where the browser has no Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => createSound({ muted: false }).player.play('splash')).not.toThrow();
  });
});
