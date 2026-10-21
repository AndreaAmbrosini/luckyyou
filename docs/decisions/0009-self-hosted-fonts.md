# 0009 Self-hosted fonts

Accepted 2026-10-21

The look needs two web fonts, Lilita One and Nunito. They come from the
`@fontsource` packages and are bundled with the site, not loaded from Google
Fonts. So the page makes no request to another host: nobody else learns that
a pick is running, in line with [0004](0004-no-backend.md), and the fonts
work on any network that can reach the site. The packages are pinned like
every other dependency ([0001](0001-toolchain-versions.md)), so a font can't
change under the design.

Only the weights the design uses are imported: Lilita One 400 and Nunito
700, 800 and 900.

Enforced by `e2e/smoke.spec.ts`.
