import { useEffect, useState } from 'react';

export function isFullscreen(): boolean {
  return document.fullscreenElement != null;
}

/** The page's fullscreen state, and a way to switch it where the browser can. */
export function useFullscreen() {
  const [active, setActive] = useState(isFullscreen);

  useEffect(() => {
    const update = () => setActive(isFullscreen());
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  return {
    supported: document.fullscreenEnabled === true,
    active,
    toggle() {
      // The browser may refuse, for example without a user gesture; then nothing changes.
      const change = isFullscreen()
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen();
      change.catch(() => undefined);
    },
  };
}
