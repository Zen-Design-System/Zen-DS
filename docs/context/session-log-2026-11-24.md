# Session log — 2026-11-24

## Play takes the played frame's light or dark (tier S, branch claude/vigilant-torvalds-8ae18e)

User: "chạy prototype vẫn lỗi darkmode". Earlier fixes on this path: #307 (2026-10-26, Play's own Dark button: popovers,
tooltips and toasts in Play's portal layer) and #338 (2026-10-27, the Zen Studio menu's Dark mode is UI only). Neither
looked at the frame's own theme.

- Cause: `proto/Player.tsx` built Play's modes from the canvas preview and Play's own picks only. A Screen set dark with
  its frame toolbar's moon (`frameOverrides[page][frame].theme`) played light, although Present (`board/Present.tsx`)
  and the export (`htmlExport.tsx canvasModes`) read that override. A Screen with `modes={{ theme: "dark" }}` was dark
  itself, but what Play draws outside it stayed light: the Overlay's Bottom Sheet and a Menu's phone sheet (the device's
  overlay root), the portal layer, the toasts and the stage around the phone.
- Fix: Play's layer theme = Play's own pick › the shown frame's moon (`frameOf(screen).id`, or the Overlay presented
  alone) › the Screen's `modes.theme` › the canvas's. Per Screen, so a flow into a light Screen plays it light. The
  Screen's own `modes` still win inside the Screen, as on the canvas. Open on phone gets the same modes.
- Before/after (scratch Playwright on a private :5289 server, Giám sát's slot 19:12 and 19:18): moon → Play layer
  light 247/255 → dark 18; `modes` dark → Bottom Sheet and Menu sheet 247/255 → 33; desktop moon → Side Panel 247 → 33;
  Play's own Dark unchanged (dark); chrome Dark keeps Play light with a dark bar (UI only, as decided 10-27).
- E2E FW-295 (id from Giám sát): broken on the old Player ("Play's layer is light for a frame set dark on the canvas"),
  works on the fix; prototype group 64/64; baseline records FW-295.
- Gate `npm run qa -- --isolated --files=…` PASS (the hook recorded no edits in this worktree, so `--files`): static
  steps, Studio E2E 463 works · 0 broken in 6 shards (B-28 timed out once under load and passed on retry; alone,
  `--no-retry`, it works on the first try). `npm run build` passes.
- Seen, not changed: in dark, the Floating Bottom Navigation's fade ends on Surface/Default, a step lighter than
  Canvas/Default, so the strip under the bar reads lighter (Figma's fill, canvas and Play alike). The glass rim after
  Play's own Dark toggle is PR #425's (Liquid Glass re-reads its light on a `data-theme` change).
