# Session log 2026-11-01

## Session "Component example thumbnails" · docs Examples as static thumbnails (tier S; user 2026-11-01)

- Ask: "Phần example của các component chỉ nên hiển thị thumbnail tĩnh, chỉ cho interact khi bấm play để nhẹ trang
  hơn. Thumbnail nên nhỏ vừa lại để xếp theo grid cho gọn." The user picked a scaled live preview over pre-captured
  images (~500 examples × light/dark would have put 15–40 MB of webp in git and gone stale on every example edit).
- Built (`PlatformShowcases.tsx`): `ComponentExamples` shows `ExampleThumb`s in `.pe-thumbs` (auto-fill, min 240px;
  150px under 620px). A thumb is the example's bare `ExampleCard` laid out 520 / 960 (wide) / 1280 (screen) px wide,
  scaled to contain in a 4:3 frame, `inert`, mounted when within 400px of the viewport, its own portal root (an overlay
  opened on mount stays inside), CSS animations and transitions off. Play (Button/Overlay black-overlay, also a click on
  the frame) swaps it for the live `ExampleCard` across the row with a new `onClose` → Close (focus goes to Close, back to
  Play on close). One example plays at a time.
- `?examples=live` keeps the old all-live grid; `tools/platform-audit/{audit,behaviour,shoot,visual-diff}.mjs` add it, so
  the audits, behaviour walk, screenshots and visual diffs still drive every example. No audit threshold or rule changed.
- Checked: a Playwright walk on a private server (badge, chart, app-shell at 1512/390): no console errors, Play → focus on
  Close, Close → focus on "Play Task status"; thumbnails mount lazily (0 mounted at page top); chart page 6.6k DOM nodes vs
  9.5k live. tsc, style:check, usage:check clean.
- Gate (`--isolated`, badge · chart · app-shell · typography): PASS; behaviour 0 findings. 16 "new" rhythm warnings on
  app-shell A1–A4 (1512/390/320/1512-dark) were the baselined findings with the style list in another order (no gate had
  run app-shell since 10-26; live-mode DOM is unchanged here). Re-baselined `rhythm` for app-shell; the rewrite dropped the
  3 "Side panel toggled" keys only the gate's smoke step produces, so they were put back: the diff swaps exactly those 16 keys.
