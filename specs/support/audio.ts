import { vi } from 'vitest';

export interface FakeAudio {
  /** Sources started on every output opened, and those cut off before they ended. */
  started: number;
  stopped: number;
  /** Outputs opened, and closed. */
  opened: number;
  closed: number;
  /** The level each gain straight into an output is set to now. */
  readonly outputLevels: number[];
}

/**
 * A Web Audio output whose nodes do nothing but count what was started and
 * stopped, and note what feeds the speakers at what level.
 */
export function fakeAudio(): FakeAudio {
  const outputs: { readonly level: number | null }[] = [];
  const audio: FakeAudio = {
    started: 0,
    stopped: 0,
    opened: 0,
    closed: 0,
    get outputLevels() {
      return outputs.map((gain) => gain.level ?? 1);
    },
  };
  const destination = {};
  const param = () => {
    let level: number | null = null;
    const self = {
      get level() {
        return level;
      },
      setValueAtTime: (value: number) => ((level = value), self),
      linearRampToValueAtTime: () => self,
      exponentialRampToValueAtTime: () => self,
    };
    return self;
  };
  const node = () => {
    const gain = param();
    return {
      gain,
      frequency: param(),
      detune: param(),
      Q: param(),
      connect: <T>(next: T) => {
        if (next === destination) outputs.push(gain);
        return next;
      },
      start: () => void audio.started++,
      // A stop with a time is the end a source is given as it starts.
      stop: (when?: number) => void (when === undefined && audio.stopped++),
    };
  };
  class FakeContext {
    currentTime = 0;
    sampleRate = 8000;
    state = 'running';
    destination = destination;
    constructor() {
      audio.opened++;
    }
    createGain = node;
    createOscillator = node;
    createBiquadFilter = node;
    createBufferSource = node;
    createBuffer = (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    });
    close = () => (audio.closed++, Promise.resolve());
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return audio;
}
