import { useLayoutEffect, useRef } from 'react';

/**
 * Keeps a row on one line in a small window. While its content spills out,
 * this folds the row one step at a time, adding the next of `folds` to its
 * `data-fold`, as in `data-fold="logo chosen"`; the row's stylesheet says
 * what each fold puts away, and the last may let it wrap. It looks again
 * after every render, when the window resizes, and once the fonts arrive.
 */
export function useFold<T extends HTMLElement>(folds: readonly string[]) {
  const ref = useRef<T>(null);
  const all = folds.join(' ');

  const fold = () => {
    const row = ref.current;
    if (!row) return;
    const each = all.split(' ');
    // Past the row's padding, as well as out of the row.
    const spills = () => {
      const end =
        row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight);
      return (
        row.scrollWidth > row.clientWidth + 0.5 ||
        [...row.children].some((child) => child.getBoundingClientRect().right > end + 0.5)
      );
    };
    let count = 0;
    row.dataset.fold = '';
    while (spills() && count < each.length) {
      count += 1;
      row.dataset.fold = each.slice(0, count).join(' ');
    }
  };
  const latest = useRef(fold);

  // After every render: what the row holds may have changed.
  useLayoutEffect(() => {
    latest.current = fold;
    fold();
  });

  useLayoutEffect(() => {
    let live = true;
    const again = () => latest.current();
    void document.fonts?.ready.then(() => {
      if (live) again();
    });
    window.addEventListener('resize', again);
    return () => {
      live = false;
      window.removeEventListener('resize', again);
    };
  }, []);

  return ref;
}
