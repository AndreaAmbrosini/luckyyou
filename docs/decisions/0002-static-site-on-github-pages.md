# 0002 Static site on GitHub Pages

Accepted 2026-10-21

LuckyYou has no server. The people list never leaves the browser, so a static
build is all there is to host, and GitHub Pages hosts it for free next to the
code.

One workflow does both jobs. Every push and pull request runs the checks; a
push to `main` that passes them is deployed to Pages. Vite builds with
`base: './'`, so the site works at any Pages address without knowing the
repository name.

Pages has to be switched on once by hand: Settings → Pages → Source: GitHub
Actions. Until then the deploy job fails and the checks still run.

Enforced by `.github/workflows/ci.yml`.
