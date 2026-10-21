import { useLayoutEffect, useRef } from 'react';

const STEP = 0.05;

/**
 * Fits an element's text on one line. Its stylesheet sizes it from `--fit`,
 * 1 for the largest size and 0 for the smallest; this lowers `--fit` until
 * the text fits. If it doesn't fit even at the smallest, it sets
 * `data-wrap="true"` so the text can wrap.
 */
export function useFitText<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const overflows = () => element.scrollWidth > element.clientWidth;

    const fit = () => {
      element.dataset.wrap = 'false';
      let fit = 1;
      element.style.setProperty('--fit', String(fit));
      while (overflows() && fit > 0) {
        fit = Math.max(0, fit - STEP);
        element.style.setProperty('--fit', String(fit));
      }
      if (overflows()) element.dataset.wrap = 'true';
    };

    let live = true;
    fit();
    // The display font may arrive after the first layout.
    void document.fonts?.ready.then(() => {
      if (live) fit();
    });
    window.addEventListener('resize', fit);
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [text]);

  return ref;
}
