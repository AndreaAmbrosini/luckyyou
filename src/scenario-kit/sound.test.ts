import { describe, expect, it, vi } from 'vitest';
import { createSound, type Cue } from './sound';

const CUES: Cue[] = ['splash', 'rotor', 'whoosh', 'heartbeat', 'fanfare', 'sizzle', 'pop'];

/**
 * A Web Audio context whose nodes do nothing but count what was started and
 * stopped. It starts in `state`, as a browser may hand one back suspended.
 */
function fakeAudio({ state = 'running' }: { state?: AudioContextState } = {}) {
  const contexts: { closed: boolean; started: number; stopped: number; state: string }[] = [];
  class FakeParam {
    value = 0;
    setValueAtTime() {
      return this;
    }
    linearRampToValueAtTime() {
      return this;
    }
    exponentialRampToValueAtTime() {
      return this;
    }
  }
  class FakeContext {
    currentTime = 0;
    sampleRate = 8000;
    closed = false;
    state = state;
    started = 0;
    stopped = 0;
    destination = this.node();
    constructor() {
      contexts.push(this);
    }
    node() {
      const context = this as FakeContext;
      return {
        gain: new FakeParam(),
        frequency: new FakeParam(),
        Q: new FakeParam(),
        type: '',
        buffer: null as unknown,
        loop: false,
        connect: <T>(next: T) => next,
        disconnect: () => undefined,
        start: () => void context.started++,
        stop: () => void context.stopped++,
      };
    }
    createGain() {
      return this.node();
    }
    createOscillator() {
      return this.node();
    }
    createBiquadFilter() {
      return this.node();
    }
    createBufferSource() {
      return this.node();
    }
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    close() {
      this.closed = true;
      return Promise.resolve();
    }
    resume() {
      this.state = 'running';
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

  it('resumes an output the browser hands back suspended', () => {
    const contexts = fakeAudio({ state: 'suspended' });
    createSound({ muted: false }).player.play('splash');
    expect(contexts[0]!.state).toBe('running');
  });

  it('never opens one while muted', () => {
    const contexts = fakeAudio();
    createSound({ muted: true }).player.play('splash');
    expect(contexts).toHaveLength(0);
  });

  it('plays every cue', () => {
    const contexts = fakeAudio();
    const { player } = createSound({ muted: false });
    for (const cue of CUES) {
      const before = contexts[0]?.started ?? 0;
      expect(() => player.play(cue), cue).not.toThrow();
      expect(contexts[0]!.started, cue).toBeGreaterThan(before);
    }
  });

  it('stops a sound when asked, and every sound at once', () => {
    const contexts = fakeAudio();
    const { player } = createSound({ muted: false });
    // The rotor loops: nothing stops it but being told to.
    const stopRotor = player.play('rotor');
    const [context] = contexts;
    expect(context!.stopped).toBe(0);
    stopRotor();
    const afterOne = context!.stopped;
    expect(afterOne).toBeGreaterThan(0);
    player.play('rotor');
    expect(context!.stopped).toBe(afterOne);
    player.stopAll();
    expect(context!.stopped).toBe(2 * afterOne);
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
