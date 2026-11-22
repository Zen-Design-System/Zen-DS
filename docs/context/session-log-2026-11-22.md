# Session log 2026-11-22

## Loose layers PR6: push layers on the canvas to Figma (tier M, Bug session)

User via Giám sát, 11-22 ("OK luôn" for the 4 parts left): PR6 sends `<Layer>` (a layer on the canvas) to Figma as a
page-level layer; tested with the plugin's real importer in Figma. Branch `zen/feat/studio-loose-figma-20261122`.

- `tools/studio/figma-push.mjs`: a `<Layer>` is a package frame (`layer:<id>`) holding its one layer, hugging or as wide
  as the Layer's `width` (its layer fills), with `layer: {x, y, width?, origin, anchor}`: its board place, counted from
  the Screen/Overlay nearest it (`nearestFrame`, by the gap to its box), named by `boardFrameId`. The "not pushed yet"
  note is gone. Every package frame carries its board `place` (a free board's x / y).
- Bug met and fixed: a drawn frame (`<Screen frame width>`) was pushed at the desktop's 1440 and noted "Screen frame /
  width: not pushed"; it is now its drawn width, no note (device Screens keep their device width).
- Plugin `src/plugin/studio-import.js` (zen-ds-figma-plugin `studio-import` 4a712ba): `unwrapLoose` moves the layer out
  of its frame onto the page at anchor + (layer − origin), keeps the Layer width and the page/frame plugin data, and
  removes the frame; `removePlacedLoose` takes the copy placed before (re-import replaces it). A new frame with `place`
  goes at its board offset from the first frame (`part.at`); a loose frame no longer pushes later frames along.
- Real Figma (file 9nZv…, page "Studio exports — QA"; importer bundled with page-wide search hidden, 44 unrelated parts
  stubbed to fit use_figma's 50k): 2 drawn frames (board x 0 / 1000) + a Button beside A + a Top Navigation (390) under
  B → A 400×300, B at A+(1000, 0), Button at A+(480, 0), Bar at B+(0, 360) 390 wide; import again → frames updated in
  place, loose layers replaced, 4 nodes. QA nodes removed after.
- Tests: figma-push selftest 535 (loose entries, nearest anchor, drawn width, places), figma-clip/pull/native/page-figma
  /library-keys selftests pass; plugin `npm test` passes (3 loose cases: unwrap + re-import, anchor + no push-along,
  board places); plugin dist backed up in `backups/` before each build.
- Gate (GO 21:00, extended to 00:15): `qa --isolated` passed its static steps and selftests. Studio E2E: 456 works,
  1 broken (BP-12). Shard 5 took 2042 s, so BP-13…17 ran out of time.
- Machine: load average ~3.5–4; replayd at ~86–89% CPU for 3 days. BP rows took ~4 min each.
- BP-09…17 re-run on this branch, until each row worked: BP-09, 11, 12, 14, 15, 16, 17 work.
- BP-13 times out at 45 s here, and also on main f81c4ff0 (a clean worktree, since removed) under the same load. The
  main run did BP-13…17: 14…17 work there.
- BP-14…17 broke here only after BP-13's timeout closed the browser; run without BP-13, they work.
- HO-09/16/11/13 (Export › Figma) work. `npm run build` ✓.
