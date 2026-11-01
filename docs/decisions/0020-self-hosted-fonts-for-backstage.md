# 0020 Self-hosted fonts for Backstage

Accepted 2026-11-01

The screens around the shows now use Bricolage Grotesque and Figtree; the
shows keep Lilita One and Nunito for their name tags and captions, so a show
looks the same as before. All four are bundled with the site from
`@fontsource` packages, not loaded from Google Fonts, for
[0009](0009-self-hosted-fonts.md)'s reasons: no request to another host
([0004](0004-no-backend.md)), and pinned so a font can't change under the
design ([0001](0001-toolchain-versions.md)).

- Bricolage Grotesque comes from `@fontsource-variable/bricolage-grotesque`,
  its width-and-weight file, because the design sets its width to 88 %.
- Figtree comes from `@fontsource-variable/figtree`: one file holds every
  weight the design uses.
- Lilita One 400 and Nunito 700, 800 and 900 stay as 0009 imported them.

Enforced by `e2e/smoke.spec.ts`.
