# 0001 Toolchain versions

Accepted 2026-10-21

npm is the package manager because it comes with Node: nothing extra to
install. Node 22.13 is the floor, and every dependency is pinned to an exact
version, so `npm ci` gives every machine and CI run the same tree.

Two versions are held back on purpose:

- **TypeScript 6, not 7.** typescript-eslint doesn't support 7 yet.
- **jsdom 29, not 30.** jsdom 30 needs Node 22.22 or newer, above the floor.

Revisit both when the reason goes away.

Enforced by `package.json` (`engines` and exact versions).
