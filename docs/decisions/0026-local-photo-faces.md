# 0026 Local photo faces

Accepted 2026-11-17

A person can keep a manually framed photo in the existing browser-local
people list. Native image decoding and canvas turn a JPEG, PNG or WebP
picture into a small JPEG crop; the original is not kept. This avoids
another storage lifecycle or an upload service. Old lists need no migration.
If browser storage refuses a write, setup says changes last for this visit.

The app hands each show a read-only photo snapshot by name, separate from
the random looks and unlucky draw. A look can carry the photo into the
shared head renderer. A line-up receives it with the person. A scenario
with its own face drawing, such as The Race's creatures, uses the kit's
round photo drawing. Scenarios never read browser storage.

Photos replace drawn facial features, including expression changes; body
poses, accessories and effects still react. Removing the photo restores
the cartoon face. SVG clip identifiers are distinct across drawings.

Enforced by `specs/photos.feature`, `src/people/photos.test.ts` and
`e2e/photos.spec.ts`.
