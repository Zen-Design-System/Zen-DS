# Session log 2026-11-03

## Session "docs-chrome-b5" · App Shell Layout examples on their own pages (tier L; user 2026-11-02, via session Bug)

- Ask: "cân nhắc tách example appshell ra page riêng cho đỡ nặng". The App Shell page held 49 finished apps (Figma
  ◇ Master-Layout · Example A–G, 43 screens, plus 6 behaviour examples).
- Split by Figma section: the App Shell page keeps A (4 compositions) + the 6 behaviours; five Layout pages under App
  Shell in the nav (`examples/appShellLayouts.ts`, `examples/pages/app-shell-<id>.tsx`): Desktop (B + G, 8), Mobile
  (C, 7), Expressive (D, 5), Consumer (E, 7), Smart home (F, 12). A Layout page is the examples only (title, lead,
  thumbnails), breadcrumbs Docs › App Shell › page, component-page rules (Appearance, TOC width).
- Kept out of `componentNavigation` on purpose: Studio's Pages panel and `tools/studio/e2e/scenarios/board.mjs` read it
  and expect a Component board per page. The gate (`tools/qa/lib.mjs` allPages), `audit.mjs` and `visual-diff.mjs` read
  `appShellLayoutPageIds` too; a part file (`examples/pages/app-shell/*.tsx`) scopes to the page that imports it; the
  coverage matrix follows `...spreads` into part files. Quality baseline keys of B/E/F/G moved to their new pages;
  behaviour budgets: app-shell 6× → 2×, desktop and smart home 2×.
- Measured (1512×900, private server, thumbnails mode, scrolled to the end so every thumbnail mounts; 2 runs each,
  same on both runs). Before = main 7b8860ba (before Bug's #376 icon fix, which does not change node counts):

  | Page | Examples | DOM nodes on load | after scroll | Long tasks (total) | JS heap |
  | --- | --- | --- | --- | --- | --- |
  | app-shell, before | 49 | 3,645 | 17,894 | 1.5–1.7 s (9) | 133 MB |
  | app-shell, after | 10 | 3,198 | 8,598 | 0.66 s (4) | 117 MB |
  | app-shell-desktop | 8 | 4,197 | 4,197 | 0.48 s (3) | 104 MB |
  | app-shell-mobile | 7 | 1,908 | 1,908 | 0.32 s | 93 MB |
  | app-shell-expressive | 5 | 1,395 | 1,395 | 0.29 s | 93–98 MB |
  | app-shell-consumer | 7 | 1,978 | 1,978 | 0.35 s | 93–104 MB |
  | app-shell-smart-home | 12 | 2,492 | 2,492 | 0.32 s | 93–98 MB |
  | sidebar (reference) | 8 | 2,481 | 4,362 | 0.5 s (3) | 104 MB |

  App Shell: −52% nodes, −60% long-task time, page 17,846 → 14,680px (the rest is playground, props and guidelines).
