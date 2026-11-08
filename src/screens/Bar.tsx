import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { ArrowLeftIcon } from '../ui/icons';
import { useFold } from '../ui/useFold';
import layout from './layout.module.css';

export interface BarProps {
  /** The way back, on steps that have one: the previous step's name. */
  back?: { label: string; onClick(): void };
  /** After the way back: a status, a hint, then the buttons, the main one last. */
  children: ReactNode;
  /** While a sheet is open over the step. */
  inert?: boolean;
}

/**
 * Short of room, the bar folds (layout.module.css): its status goes, the way
 * back down to its arrow, the buttons smaller, and only then a second row.
 */
const FOLDS = ['say', 'back', 'small', 'wrap'];

/** The bar along the bottom of every step before the show. */
export function Bar({ back, children, inert }: BarProps) {
  const bar = useFold<HTMLElement>(FOLDS);

  return (
    <footer ref={bar} className={layout.bar} inert={inert}>
      {back && (
        <Button variant="outline" className={layout.back} onClick={back.onClick}>
          <ArrowLeftIcon size={22} />
          <span className={layout.backLabel}>{back.label}</span>
        </Button>
      )}
      {children}
    </footer>
  );
}
