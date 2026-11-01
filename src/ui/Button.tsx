import type { ComponentProps } from 'react';
import styles from './Button.module.css';

/** One primary button per screen (DESIGN.md); "outline" sits in the bar; "done" is the mint "Done". */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'quiet' | 'done';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
