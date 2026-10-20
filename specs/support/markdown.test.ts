import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bannedPhrasesIn, countWords, listDocs, relativeLinks } from './markdown';

describe('countWords', () => {
  it('counts words, not punctuation', () => {
    expect(countWords("it's a co-op, ok?")).toBe(4);
  });

  it('ignores table pipes and rules', () => {
    expect(countWords('| a | b |\n|---|---|')).toBe(2);
  });
});

describe('relativeLinks', () => {
  it('keeps only relative file targets', () => {
    const markdown = '[a](docs/x.md#y) [b](https://e.com) [c](#top) [d](mailto:a@b.c)';
    expect(relativeLinks(markdown)).toEqual(['docs/x.md']);
  });

  it('skips links in code fences', () => {
    expect(relativeLinks('```md\n[a](missing.md)\n```')).toEqual([]);
  });
});

describe('bannedPhrasesIn', () => {
  it('matches regardless of case', () => {
    expect(bannedPhrasesIn('A Seamless flow', ['seamless'])).toEqual(['seamless']);
  });

  it('matches across a line break', () => {
    expect(bannedPhrasesIn('and, in\n  conclusion', ['in conclusion'])).toEqual(['in conclusion']);
  });

  it('matches a curly apostrophe', () => {
    expect(bannedPhrasesIn('it’s worth noting', ["it's worth noting"])).toEqual([
      "it's worth noting",
    ]);
  });
});

describe('listDocs', () => {
  it('skips working material', () => {
    const root = mkdtempSync(join(tmpdir(), 'luckyyou-docs-'));
    for (const file of ['README.md', 'docs/a.md', 'docs/superpowers/b.md', 'specs/x.feature']) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), 'text');
    }
    expect(listDocs(root).sort()).toEqual(['README.md', 'docs/a.md', 'specs/x.feature']);
  });
});
