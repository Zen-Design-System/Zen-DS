# Zen Studio usability check against Figma — 2026-10-10

The user's brief: "đánh giá khả dụng lại studio tool so với figma … Cần giống figma 100% … có thể thay hình vào avatar
trong mọi component hệt như các example … thử mọi thao tác thiết kế xem có khó không. Thử dùng studio build 1 trang
dashboard từ blank xem."

Method: two scripted walks through the real Studio UI (Playwright on the E2E harness server, which skips the Google
sign-in; the built-in browser cannot). Every step is what a person does — a click, a double-click, a shortcut, an
Inspector control — with the Inspector heading, rows and the status line read after each. Scripts and screenshots:
the session's scratchpad (`ux-walk.mjs`, `dash-walk3.mjs`, `ux/*.png`, `dash3/*.png`).

## 1. "Replace the picture of an Avatar" on five pages (examples)

Figma: click the avatar (or Enter into its group), Fill › Image › choose, or drop an image on it. 2–3 steps, one
layer, no code words.

| Page | One click selects | Double-clicks to reach the Avatar | ⌘-click selects | Assets › Photos click (Avatar selected) | The Src row |
| --- | --- | ---: | --- | --- | --- |
| avatar | PageHeader | 2 (lands on AvatarStack) | AvatarStack | pastes an `<Image>`: "Example code not updated: a paste is not copied into the example snippet; update it by hand" | text field, "Bound to {platformMedia.viewer.src}. An edit sets a fixed value; Restore brings the binding back" |
| card | Grid | 3 | AvatarStack ×6 — "edits apply to all 6" | same paste | same |
| app-shell | AppShell ×3 — "edits apply to all 3" | 3 — a *part* of AppShellAccount: "Read-only — Edit via the owner's src (Playground properties or source)" | AppShellAccount ×5 | "<Menu> has no children to drop into; drop beside it instead" | "Bound to {me.photo}" |
| table | Table | 5 | Avatar ×17 — "edits apply to all 17" | "<PersonAvatar> has no children to drop into" | "Bound to {person.photo}. From <PersonAvatar>'s person.photo where it is used: an edit changes it everywhere" |
| sidebar | AppShell | not reached after 6 (stuck on List ×5) | ListItem ×24 | refused: a `<div>` "would break the List" | — |

Result: on 0 of 5 pages can a picture be put on an Avatar the Figma way. The Photos click only swaps a picture on a
page made in the Studio (`edit/assets/assets.ts` PICTURED → `local:` files only); everywhere else it pastes an
`<Image>` or fails. The Src control is a text field holding a code expression.

## 2. A dashboard from a blank page (19 operations)

| Operation | Works | What it took | Note |
| --- | --- | --- | --- |
| New page (desktop) | ✓ | 2 clicks | comes with Sidebar + Page header + mobile bars; named from the Inspector |
| Insert Metric card ×3, Chart card, Table, Text | ✓ | Assets › search › click, ×6 | the new item is selected; the next insert lands beside it (Figma-like) |
| Shift-click three cards, ⇧A, Flow › Horizontal | ✓ | 3 clicks + ⇧A + 1 click | "3 layers" → Stack → row |
| Rename a card (Label) | ✓ | click → Stack, double-click → MetricCard, Inspector field | Figma: double-click the text on the canvas |
| Page header title | ✓ | double-click the title edits in place | Figma-like |
| Text layer | ✓ | Enter or double-click edits in place | Figma-like |
| Table › row states | ✓ | click → Stack, dbl → Table, dbl → Data-Row, 2 toggles | 3 levels down; Figma needs 2 |
| ⌘D a card | ✗ → fixed | refused: "MetricCard has a key; a copy would repeat it — edit it in the code" | the renderer's React key was read as a written key: ⌘D was dead on every page you made. Fixed (`slots/actions.ts`, E2E B-34) |
| Delete, ⌘Z | ✓ | 1 key each | |
| Chart card width | ✓ / ✗ | px and Fill only; "50%" refused with "Sizes are px numbers: use Fill for 100%" | Figma has no % either |
| Drag a card past another | ? | not verified by the walk (K-05 arrow reorder passes in the matrix) | |

The page that came out reads as a real Zen screen (`dash3/10-final.png`): title, a row of metric cards, a chart card,
a table, a text field. 13 of the 19 steps worked first time; 4 failures were the walk's own locating mistakes, 1 was a
real bug (fixed), 1 is inconclusive.

## 3. Verdict

The parts are Figma's: Design / Prototype tabs, Position and Auto-layout panels with Figma's controls, ⇧A, ⌘D,
Enter-to-edit, Layers, Assets with search, a Screen with its app frame. Building a page from blank is workable.

What makes it "quá khó dùng" is not the panels but four things:

1. **Selection on example and template pages follows the code, not the picture.** One click grabs AppShell, Grid or
   Table; a `.map` row becomes "Avatar ×17 — edits apply to all 17"; reaching an avatar takes 2–5 double-clicks and on
   the sidebar page never arrives. Figma selects one layer, the one under the pointer, and "all instances" is never
   implicit.
2. **Pictures cannot be replaced the Figma way outside pages you made.** No picture picker on the Src row, the
   Photos click pastes an `<Image>`, no drop-on-layer.
3. **Everything speaks code.** "Bound to {me.photo}", "part of AppShellAccount — Set by AppShellAccount at
   app-shell.tsx:140", "has no children to drop into", "Example code not updated: a paste is not copied into the
   example snippet", "Saved · local:untitled-page.zen.tsx:26". A designer has no model for any of it; Figma says
   "Image", "Instance", "Main component", and hides the rest.
4. **Studio-made wrappers add a level.** The blank page's body Stack and the wrap Stacks are real layers the designer
   did not draw; a Table row is three levels down.

Bugs met: ⌘D dead on builder pages (fixed, B-34); B-08 flaked while another session rewrote the rename field; the
`SLOT_OPS` self-test of another session.

## 4. Proposed work, in order (needs the user's approval; tiers per AGENTS.md §C)

- **P0 — Picture like Figma, everywhere (M).** Avatar, Image, Thumbnail, AppShellAccount selected → the Inspector's
  Src becomes a *Picture* control (library, uploads, people) on every file. A literal `src` is written in place; a
  bound one (`{row.photo}`, `{me.photo}`) writes the data the way Table cells already do (`setDataField`), with
  "This row / All rows" when the layer renders many. Assets › Photos click and a drop onto the layer do the same;
  never paste an `<Image>` into a Menu. Then the user's example — any avatar in any example — works in 2 steps.
- **P1 — Select like Figma on code pages (L).** A click on a `.map` rendering selects *that* rendering; the "×17"
  multi-selection becomes an explicit "All rows" choice. The first click in a frame picks the item under the pointer
  when the container is the frame's own root (AppShell, Grid, the body Stack), as Figma does for a frame's direct
  children. Cap the drill: Table → Data-Row → Cell stays; AppShell/List should not hide an Avatar six levels down.
- **P2 — Say it in design words (S–M).** One glossary for the Inspector and the status line: Picture, From data (Alex's
  photo), Shared by 17 rows, Can't change here — it comes from code (Show code). File:line moves to the Code tab.
- **P3 — Small frictions (S).** The blank page's body Stack transparent to clicks and Layers; % width hint; drag
  reorder verified with a row in the matrix.

Without P0–P1 the user's conclusion stands: designers will not adopt it. With P0 alone the single most-asked action
(replace a picture) works everywhere; P1 is what makes the rest feel like Figma.

## 5. Built the same day (P0 and part of P1), and the program to Figma-level usability

The user's bar (2026-10-10): not a list of gaps but the *feel* — "User phải cảm giác thao tác tự do dễ dàng để
design": click what you see and it is selected, drop a photo and it changes, type and it changes, never a refusal in
code words.

### Done (session "Table states", E2E SE-36 + scratch checks on the harness server)

| You do | What happens now | Where it was checked |
| --- | --- | --- |
| ⌘-click an avatar anywhere, click a photo in Assets | The avatar shows it. A row's avatar changes that row's data (table example → `data.ts` alex; app-shell account → `me.photo`); a page you made keeps `zen-media:`; a library-bound Image takes its own picture | table, app-shell, builder, fixture |
| Drag a photo from Assets onto an avatar or image | The layer lights up with "Picture of Avatar"; the drop replaces it (one undo step) | fixture SE-36 |
| Open the Inspector's Picture | A picker (People, Library, your uploads) with the current photo's name, in every file — no more text field "Bound to {…}" | fixture, table |
| ⌘-click an avatar a row passes into a ListItem | The Avatar is selected (was: the ListItem), the hover outline shows it first | sidebar |
| Drop a photo on an avatar shared by 14 rows (built by a helper) | Refused in plain words: "shared by 14 rows … change the person's photo in the data" (Figma would override one instance; see the program) | sidebar |
| ⌘D on a page you made | Duplicates (was refused as "has a key") | B-34 |

### The remaining program, as acceptance criteria

1. **Any avatar, any page, 2 steps** — the helper-built rows (sidebar) and list props (AvatarStack items, seenBy) take a
   photo per row / per item: extend the engine's data tracing to helper calls and item indices (BACKLOG P1).
2. **One click = the layer under the pointer, always** — the body Stack and wrap Stacks are transparent; AppShell/Grid
   first clicks land on the item when the container is the frame's root; "n of N" selections offer *This row / All
   rows* before a fixed edit (BACKLOG P1/P3).
3. **No code words in front of a designer** — every Inspector row, note and status message rewritten against one
   glossary; file:line only on the Code tab (BACKLOG P2).
4. **A photo from the desktop lands on any page** — repo pages save the file under `src/assets/media/` through the dev
   server (BACKLOG P2).
5. **Selection never gets lost** — a re-render, a saved edit or a tab switch keeps the selected layer and its outline;
   every E2E select row asserts the outline, not only the heading (the heading can be the page's name).

Measure each with the two walks in §1–2 rerun: the avatar walk must reach 5/5 pages in ≤ 2 steps, the dashboard walk
19/19 with no refusal.
