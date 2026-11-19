# Session log — 2026-11-20

## Code view P2b closed in the status lines (tier XS; session "Code view P2b")

Giám sát merged PR7 (#410, main 87acd3d7): P2b is done, 505/505 examples are files, baseline 0, `examples/portable-subset`
an error. Plan §11 and HANDOFF already said so; the plan's status header and the BACKLOG-user-and-later "Code view"
entry still said "started" and now say done (#400–#410). The BACKLOG line "Refs to components' inner controls" stays:
it waits for the user's approval.

## Studio E2E server: the AI UI alias (tier XS; Giám sát session, found by Bug)

- After P2b PR7 (#410) the AI UI examples import `@zen-ds/react/ai-ui`. `vite.config.ts`, `vitest.config.ts` and
  tsconfig got the alias, `vite.studio.config.ts` (the Studio E2E server) did not, so every Studio E2E row failed with
  "the Studio did not open" on main 87acd3d7+. CI runs no Studio E2E, so it passed. Fixed: the same alias, AI UI first.
