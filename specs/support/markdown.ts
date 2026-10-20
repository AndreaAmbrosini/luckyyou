import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;
const FENCE = /^```[\s\S]*?^```/gm;
const INLINE_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** Words as a reader counts them: table pipes, rules and punctuation don't count. */
export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

/**
 * Targets of inline links that point at a file in the repository, without
 * their `#fragment` or `?query`. Links inside code fences are examples, not
 * links.
 */
export function relativeLinks(markdown: string): string[] {
  const prose = markdown.replace(FENCE, '');
  return [...prose.matchAll(INLINE_LINK)]
    .map(([, target]) => target!)
    .filter((target) => !target.startsWith('#') && !HAS_SCHEME.test(target))
    .map((target) => target.replace(/[#?].*$/, ''));
}

/**
 * The phrases that appear in the text, ignoring case, line breaks inside a
 * phrase (docs are hard-wrapped) and curly apostrophes.
 */
export function bannedPhrasesIn(text: string, phrases: readonly string[]): string[] {
  const plain = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').replace(/’/g, "'");
  const prose = plain(text);
  return phrases.filter((phrase) => prose.includes(plain(phrase)));
}

/**
 * Every doc in the repository, as POSIX paths relative to `root`: Markdown at
 * the root and in `docs/`, and the `.feature` files in `specs/`. Working
 * material in `docs/superpowers/` is never committed, so it's skipped.
 */
export function listDocs(root: string): string[] {
  const inside = (folder: string, extension: string) =>
    existsSync(join(root, folder))
      ? readdirSync(join(root, folder), { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
          .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
      : [];

  const atRoot = readdirSync(root).filter((name) => name.endsWith('.md'));
  const docs = inside('docs', '.md').filter((path) => !path.startsWith('docs/superpowers/'));
  return [...atRoot, ...docs, ...inside('specs', '.feature')];
}
