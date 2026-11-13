# Session log — 2026-11-14

## Code view in other languages, P2b PR2: display and text examples become files (tier L; session "Code view P2b")

User: kept AppShell's spacing for the phone examples (A/B, "Giữ AppShell"); PR1 shipped as #400, merged by Giám sát.
Branch `zen/feat/code-view-p2b2-20261114` from main 31232373.

**Built:**
- 75 examples moved to `examples/pages/<page>/<slug>.example.tsx`: Text 6, Typography hierarchy 5 (files in
  `pages/typography/`, list stays in `PlatformTypographyHierarchy.tsx`), Avatar 6, Tag 5, Divider 5, Dock Icon 5, Image 7,
  Progress 5, Skeleton 5, Rating 6, Visually Hidden 6, Empty State 5, Inline Message 5, Alert Banner 4. Five agents,
  three pages each, briefed with §8b; one review pass here. Baseline 492 → 417 (88 of 505 moved).
- Helper replacements, now in `docs/guides/example-patterns.md` §8b: `StudioLogo` → Thumbnail 2xs + Text, `StudioMark` →
  Thumbnail 2xs, `DemoFieldDialog` → an inline ModalForm + useFormState + useToast, `platformMedia` → `photos`
  (moved into `examples/data.ts`; `PlatformMedia` spreads it and keeps the videos), page CSS → Zen props or inline token
  styles (all eight page CSS files deleted), container queries → `useZen()?.breakpoint`, `document.title` → a comment.
- Phone examples take `scrollRef` (default "window"); `PlatformPhoneApp` (PlatformPhone.tsx) passes the device screen.
  The large titles fold again: PR1 had dropped every phone example's `scrollRef` (Link, Badge included).
- `examples:check` writes its fixture project per run (`zen-examples-fixture-<pid>`), so parallel runs don't collide.
- CI: `native.yml` runs on macos-15 (GitHub cancels macos-14 jobs: "configuration … not supported").

**Bugs met and fixed:**
- PR1's phone examples lost the large-title fold (no `scrollRef`): fixed with `PlatformPhoneApp` for all 16.
- Typography desktop pages turned white: `Stack surface="canvas"` reads `--zen-app-shell-canvas`, which the docs' own
  AppShell (canvas alt) sets; `.pth-demo__ui` resets it, and the pages are identical again.
- The logo as Thumbnail xs outgrew the Sidebar's fixed 24px logo slot by 4px at Comfortable (gate density audit, 9 cards):
  2xs fits it at every density.
- Moodboard strip lost its keyboard focus ring (it was `:focus-visible` CSS): drawn from state, keyboard focus only.
- Icon-only columns lost the 18rem name column: `--zen-table-fill-min-width` (Table CSS contract) set on the section.
- Three descriptions said what the examples no longer do (Back on the row, Log hours focus): reworded.
- Dead CSS after the move (`.pth-page/-section/-cards/-screen`, `.pe-inbox-meta`) and `src/platform/phoneOrders.ts`
  removed; a typo fixed ("Enter a dates" → "Enter the dates").

**Visual diff (16 pages, 1512 + 390):** 127 identical. Changed, each for a reason:
- the phone examples follow AppShell's spacing (user A/B 2026-11-14), and the grid rows beside them follow their height;
- the studio logo is a Zen Thumbnail 2xs (20px at Compact where the image filled the 24px slot, plus its 1px hairline);
- loads that started in an effect start from Refresh / Try again, so the cards show the loaded or failed state at once
  (Skeleton ×3, Image "Loading and failed"); after the first 1–2 s a reader sees the same as before;
- Milestones' percentages align through the label (ProgressCircle takes no width);
- Skip link's description now points at the note at the end of the code.
Fold check (scratch script): every phone example with room to scroll folds its large title.

**Not done (BACKLOG-user-and-later, needs approval):** refs to components' inner controls (ListItem's row, Tag's Remove,
EmptyState / InlineMessage / AlertBanner / ActionBar actions, TopNavigation's actions, AutocompleteField's Add; Rating
`error`). Until then focus goes to the nearest target a ref reaches (a group heading, the new screen's title).
