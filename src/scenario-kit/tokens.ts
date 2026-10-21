import tokens from '../styles/tokens.css?raw';

/** A custom property's value as tokens.css writes it. */
export function token(name: `--${string}`): string {
  const value = new RegExp(`${name}:([^;]+);`).exec(tokens)?.[1];
  if (value === undefined) throw new Error(`tokens.css has no ${name}.`);
  return value.trim();
}

export type StageSize =
  | '--size-stage-tag-min'
  | '--size-stage-tag-duel'
  | '--size-stage-caption'
  | '--size-stage-fin-name';

/** A size from tokens.css in stage pixels, for a show to compute with. */
export function stagePx(name: StageSize | '--line' | '--line-bold'): number {
  return parseFloat(token(name));
}
