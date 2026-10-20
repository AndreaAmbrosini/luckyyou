# 0004 No backend

Accepted 2026-10-21

The team's names stay in the browser that typed them, in localStorage, one
list per browser. There are no accounts and no server: nothing to host,
secure or pay for, and names never leave the machine. The cost is that the
list doesn't follow anyone to another browser.

Stored data carries a version in its key (`luckyyou:v1:people`,
`luckyyou:v1:settings`). Reading it is defensive: entries that no longer fit
the rules are dropped and the rest kept, and storage that is blocked or full
leaves the app working for the visit. A change to the stored shape that old
data can't survive gets a new version in the key.

Enforced by `specs/people.feature`.
