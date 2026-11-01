import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { ArrowLeftIcon } from '../ui/icons';
import layout from './layout.module.css';

export interface BarProps {
  /** The way back, on steps that have one: the previous step's name. */
  back?: { label: string; onClick(): void };
  /** After the way back: a status, a hint, then the buttons, the main one last. */
  children: ReactNode;
}

/** The bar along the bottom of every step before the show. */
export function Bar({ back, children }: BarProps) {
  return (
    <footer className={layout.bar}>
      {back && (
        <Button onClick={back.onClick}>
          <ArrowLeftIcon size={20} />
          {back.label}
        </Button>
      )}
      {children}
    </footer>
  );
}
