# Session log 2026-11-02

## Session "Fix studio:build-check" · `npm run studio:build-check` green again (tier M; user 2026-11-02)

- Ask: the BACKLOG P2 from the B4 chrome session — build-check failed 8 steps on main (last green 2026-10-11, 23 ok).
- Two chunk leaks, traced with a static-import walk from `StudioApp.tsx`:
  - `edit/FindPanel.tsx` (F10, 2026-10-19) imported `parsePage` from `tools/studio/browser-engine.mjs` statically, which
    put the whole engine and @babel/parser in the Studio's first load. Find now loads it with `loadEngine()` when it
    opens (`engineNow()` first, as `projectAssets.ts` does).
  - `builder/export/htmlExport.tsx` imported `componentName` from `browser-compile.mjs`, and `ExportSection.tsx`,
    `mcp/tools.ts`, `edit/copyAs.ts`, `builder/SlicePanel.tsx` import htmlExport statically for its pictures, so the
    compiler sat in the first load. `componentName` moved to `tools/studio/component-name.mjs` (+ `.d.mts`);
    `compile.mjs` re-exports it (compile selftest 91 ok). htmlExport's header comment no longer says "its own chunk".
- The engine budget step had passed by mistake since 10-19 (25.8 KB: with the engine in the first load it summed only
  the leftovers). Measured for real: 185.2 KB gzip (154.2 on 10-11; +31 KB across dialect, data-source,
  responsive-header, arrange, screen-frame, proto-vars-edit, path-ops, slot-fill). The user chose budget **200 KB** over
  splitting the engine. The step now fails when `browser-engine.mjs` is in the first load.
- The five timeouts (insert, Inspector edit, Swap, reload, Prototype) had one cause: New page starts from Empty page
  since 2026-10-18, so the page had no `<Text>` for the insert step to click. The check now picks iPhone and "Page with
  App shell" in the dialog (a phone's Top / Bottom Navigation around an empty Stack, no Buttons of its own) and selects
  the empty Stack as the E2E's `selectStack` does. The handoff zip's overlay picture is 780 px wide: an Overlay takes the
  page device's width since walk W-39 (720 only on a desktop page). A failing step now names the locator it waited for.
- BACKLOG P2 line removed.
