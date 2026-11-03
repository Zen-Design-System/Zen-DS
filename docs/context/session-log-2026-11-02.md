# Session log 2026-11-02

## Session "docs-chrome-b5" · Popover Search focus ring (tier S; user 2026-11-02)

- Ask: "Thêm focus ring cho ô Search trong Popover." It answers the P3 question from the B5 gate (behaviour warning
  on popover@1512: Figma Search/Popover 1604:27401 draws Focused/Typing with Input/Border/Popover-Search, transparent
  except in Neutral-S7, so only the caret showed focus).
- `search.css`: the popover Focused/Typing rule keeps Figma's 1px Popover-Search border and adds Search/Default's 3px
  OUTSIDE ring, Color/Focus/Neutral/Subtle (was `box-shadow: none`). It fits the Popover's 4px padding (the Popover
  clips with overflow hidden) and the Sidebar's 8px.
- Removed the question from `BACKLOG-user-and-later.md`.

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
  page device's width since walk W-39 (720 only on a desktop page). Reset all waited for `<Button onClick`: the Button
  Assets inserts has no onClick until the Prototype step, so it now waits for the level to go. A failing step now names
  the locator it waited for.
- Result: `npm run studio:build-check` 23 ok · 1 skipped (the Chromium OPFS reload, as before) · 0 failed, engine 185.2 KB
  gzip (report `.qa/studio-e2e/build-check-2026-11-02T07-13-11.json`); tsc clean, compile selftest 91 ok.
- Gate `npm run qa -- --isolated --files=` (htmlExport, FindPanel, compile.mjs, component-name.mjs): static gates,
  TypeScript and Studio self-tests pass; Studio E2E 285 works · 0 broken, but the Mac slept with its lid shut (12:42–14:05,
  14:39–17:59, Giám sát's pmset log), so shard 4/5 hung to its limit and 77 rows of shard 5 did not run. Re-run on
  2026-11-03 (Giám sát's GO 15:13): shard 4/5 91 works · 0 broken, the 77 rows 77 works · 0 broken. Every row green; the
  gate's own ledger still says FAIL (only a full `npm run qa` writes PASS).
- BACKLOG P2 line removed; two stale lines closed too (asked by session "Kiểm tra tiến độ"): Open items had PR #334 "in
  review" (merged 10-27), and the 10-29 prototype walk entry moved to `BACKLOG-archive.md` (all fixes merged, #349–#370).

## AppShell collapse icon (session Bug, tier S)

- User: "một số example appshell bị lỗi size icon button thu gọn sidebar", then "hình như tất cả đều lỗi … có thể lỗi từ chính appshell".
- Figma (use_figma, 9nZv4uW2LT21yuHabMTCh1): every Header/AppShell variant's Collapse (16243:290464) is a Button/Icon-Flat
  Small 32 whose Leading-Icon is 20×20, bound to Element-Size/Popular/Base; the set's own Small variant has the 16px
  Button/Icon-Size/Small. Code drew `IconButton size="sm"`, so the toggle glyph was 16 in every AppShell (the Sidebar's own
  toggle, `.zen-sidebar__collapse`, was already 20).
- Fix: `app-shell.css` sets `--zen-button-icon-size: var(--zen-element-size-popular-base)` on the toggle's button (menu
  toggle too: same wrapper). Test: tests/interaction/app-shell.test.tsx checks 32×32 button, 20×20 glyph.
- The user's other ask, AppShell examples on a page of their own, went to session "Docs platform chrome → Figma B5".
