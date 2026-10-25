# Studio responsive breakpoints — plan (2026-10-26)

Status: **approved by the user on 2026-10-26**, with D1–D4 as recommended; D5 (a harness rule) is not approved, so
no harness rule or audit check is added. Session bp-studio builds the Studio half (P1, P3, the Studio half of P2),
session bp-layout the library half of P2.

The user's ask (2026-10-25): people using Studio should see and adjust the desktop, tablet and phone versions of a
screen, as in Framer; today they cannot tell how the other versions will look, nor change them.

The user's choices (2026-10-26) between the options weighed in the session:

- **Yes:** P1 switch a Screen between breakpoints on the canvas and edit there (a view, not saved; dragging an edge
  stays a real resize, and a desktop Screen's breakpoint follows its width); P2 a few responsive layout props (the
  Grid `columns` shape on more props); P3 a "Make a separate Screen" action for a phone or tablet layout that is truly
  different.
- **No:** three frames side by side per Screen (dropped 2026-10-26 for the switch: lighter, fewer risks); Framer /
  Figma Sites per-layer overrides of every property (too heavy: an override layer in the page file, translated again for
  code, handoff and Figma); variables with breakpoint modes (Studio Variables are COLOR and FLOAT only, and indirect);
  intrinsic layout only (no real control).

## 1. Today (code read 2026-10-25)

| What exists | Where | Gap for the person |
| --- | --- | --- |
| A Screen is drawn for one device (`device`, `width`, `height`) | `builder/proto/runtime.tsx` Screen | The canvas shows one version |
| Changing a Screen's device (Inspector › Screen › Size) | `inspector/FramePanel.tsx` | A real edit of the page file (`device`, size): undo steps, and the Screen stays changed for handoff, Play and push |
| Dragging a Screen's edge writes its width; its breakpoint follows `device`, not width | `builder/frameMove.ts`, Screen | A desktop Screen dragged to 390 still renders the desktop breakpoint |
| View-only frame width (`frameOverrides`, kept per tab in sessionStorage) | `store.ts`, `board/StudioFrame.tsx:39` | Turned off for Screens and Overlays |
| A Screen keeps the desktop parts (root AppShell: sidebar, header) and the mobile ones (`topNavigation`, `bottomNavigation`) | Screen, `tools/studio/screen-chrome.mjs` | Mobile parts exist only when someone adds them; every Screen in `.zen-studio/pages/` is `device="desktop"`, so on a phone they show no navigation and nobody sees it |
| Device simulator in Present and Play (`SimulatedDeviceContext`: device type, layout, bars, height) | `board/presentViewport.tsx`, `builder/proto/Player.tsx` | The only way to see another version: away from the canvas, view only, no drag |
| Zen changes things per breakpoint by itself: phone density and typography, page margins, AppShell structure below 1024, Select / Menu / Chip / Segmented as phone sheets, Grid columns | tokens `[data-breakpoint]`, AppShell, `_shared/phone-sheet.tsx` | Invisible: nobody knows what will change |
| One field edits per breakpoint: Grid Columns (Mobile / Tablet / Desktop switch) | `inspector/controls/ColumnsField.tsx`, `inspector/layoutModel.ts` | Stack direction, gap, padding, show / hide cannot differ per breakpoint |
| Breakpoints are fixed token modes: mobile < 744, tablet 744–1023, desktop ≥ 1024 | `Provider/ZenProvider.tsx` | — |

**Finding (fixed in P1):** six components follow the **window** width with `@media`, not their frame's breakpoint, so a
phone Screen on the canvas (or in Present inside a wide window) shows their desktop look:
`ai-chat.css:64`, `alert-banner.css:48`, `dialog.css:68` and `:139`, `date-picker.css:127`, `pagination.css:5`,
`side-panel.css:74`.

## 2. Model

- **Breakpoints** are Zen's three token modes (desktop, tablet, mobile) with their fixed thresholds. No custom
  thresholds (that would change Breakpoint & Grids in tokens and Figma for the whole system).
- **Primary** is the Screen as saved: its device and width. Every other breakpoint is a view of it.
- **The Screen's breakpoint:** a `device="desktop"` Screen takes the breakpoint of its width (a web page: 390 → mobile,
  800 → tablet, 1512 → desktop). Phone and tablet Screens keep their device's, so iPhone and iPad Screens render as
  today. Every desktop Screen in `.zen-studio/pages/` is 1440 or 1512 wide, so none changes.
- **Inheritance:** desktop → tablet → mobile. A breakpoint without its own value takes the next wider one's, as Grid
  `columns` does today (`layoutModel.ts` `columnsAt`).
- **Storage:** responsive values are real library props, `prop={{ desktop?, tablet?, mobile? }}`, the Grid `columns`
  shape. Studio edits them; the app, the handoff and the Code panel get them as written. No Studio-only override layer.
- **Editing breakpoint** (P2 writes to it): the breakpoint the Screen shows now, from the view switch or from its width.

## 3. P1 — Switch a Screen between breakpoints (Studio; PR 1)

1. **Window media queries → the frame's breakpoint.** The six rules above move to `[data-breakpoint="mobile"] …` (or
   a container query where the width that matters is the component's own). Checked at 390 inside a 1512 window.
2. **Screen publishes its breakpoint in the mode context**, not only as `data-breakpoint`: `useModeScope` gets
   `breakpoint`, so components reading `useZen().breakpoint` see the frame's on the first render (`runtime.tsx`).
3. **A desktop Screen's breakpoint follows its width** (§2), with Zen's thresholds (744, 1024), not `deviceFor`'s 600
   (that one keeps choosing the device of a newly drawn frame). Dragging an edge stays Figma's real resize: drag a
   desktop Screen to 390, edit, drag it back.
4. **View switch on the Screen's label:** `Desktop · Tablet · Mobile` (Zen's device icons).
   - Mobile shows the Screen as the page OS's phone (iPhone 390, Android 412), Tablet as its tablet in portrait (744,
     800), Desktop as the Screen itself. The switch's menu adds the other devices of `FRAME_DEVICES` and a typed width.
   - A **view, never saved**: the frame takes the width through `frameOverrides` (opened to Screens) and renders in
     `SimulatedDeviceContext` (device type, layout, bars, height: Present's path). No page edit, no undo step; kept per
     tab like other frame overrides, never in the page, handoff, Code panel or push.
   - The label says so: `Viewing Mobile · 390 · Back to Desktop`; Esc on the label, or the Desktop button, ends it.
   - While viewing, the Screen's resize handles are off (a drag would resize the saved Screen from a width it does not
     have); the view's width changes through the switch (a device, or the typed width).
   - Selection, editing, overlays and Play work as on any Screen: it is the same element, only narrower.
   - A view wider than the Screen (a phone Screen viewed as Desktop) keeps its left edge and draws above the frames
     next to it until the view ends.
   - Present and Play open on the device being viewed.
5. **"Changes on this breakpoint"** (Inspector, a Screen selected): what Zen changes at the breakpoint shown, listed
   from the Screen's tree: phone density and typography, page margins (`margin-*` paddings 24 → 20, 20 → 16), AppShell
   desktop → mobile structure, phone sheets for Select / Menu / Chip / Segmented, Grid columns, the responsive props of
   P2. One registry: `inspector/breakpointBehaviours.ts`.
6. **Missing phone parts.** A Screen in the mobile layout (viewed or saved) whose root AppShell has no Top or Bottom
   Navigation shows dashed placeholders, "Add Top Navigation" / "Add Bottom Navigation" (canvas only). A click writes
   the root AppShell's prop, so the app gets it too (a Screen's own `topNavigation` props keep working): a
   TopNavigation with the Screen's title; a BottomNavigation from the Sidebar's first top-level items (decision D3).
7. **Present / Play: drag the width.** Handles on the viewport's sides change W live, labelled `W × H · Mobile`,
   beside the Device menu and the typed W × H (`presentViewport.tsx`, `PresentBar.tsx`).

Checks: selftests (the breakpoint of a Screen by device and width; the view override never reaches the page text);
E2E rows (switch to Mobile and back with the page text unchanged; edit while viewing; drag a desktop Screen to 390 and
see the mobile breakpoint; placeholders; Present drag); `platform:audit` of the six components at 390; `npm run qa`.

## 4. P2 — Responsive layout props (library + Studio; PR 2)

**Library** (`src/components/Layout`, an API change: L tier for the Layout part, `npm run qa -- --all`):

| Component | Responsive props (`T` or `{ desktop?, tablet?, mobile? }`) | New |
| --- | --- | --- |
| Stack | `direction`, `gap`, `align`, `justify`, `wrap`, `padding`, `paddingX`, `paddingY` | `hideOn` |
| Grid | `columns` (exists), `gap`, `rowGap`, `columnGap`, `padding` | `hideOn` |
| Box | `padding`, `paddingX`, `paddingY` | `hideOn` |

- `_shared/responsive.ts`: `Responsive<T>`, `resolveAt(value, breakpoint)` with the inheritance above.
- Values resolve in JS from `useZen().breakpoint` (ZenProvider `auto` in apps; the Screen in Studio; a frame's
  `modes={{ breakpoint }}`). One rule, correct for nested modes, no CSS duplication: Stack's direction drives about
  twenty sizing rules keyed on `data-direction` in `layout.css`, which stay as they are.
- `hideOn?: ("desktop" | "tablet" | "mobile")[]` hides the layer at those breakpoints (`display: none`, the element
  stays so Studio can still list it).
- Docs: JSDoc per prop (props docs are generated), guideline entry for Layout (Do: responsive values for structure,
  tokens and modes for sizes; Don't: hide on every breakpoint), two platform examples (a row that stacks on mobile; a
  panel hidden on mobile), `guidelines:build`, Studio `compile-api` regenerated.
- Figma has no breakpoints: **push** writes the value of the Screen's saved breakpoint; **pull / Update from Figma**
  writes only that breakpoint's key and keeps the others (`figma-pull.mjs`, `figma-diff.mjs` merge), with a selftest.

**Studio:**

- One `ResponsiveField` wrapper, generalised from `ColumnsField`, for the props above. It edits the key of the
  **editing breakpoint** (§2), switchable in the field as Columns is today.
- A plain value stays plain until a narrower breakpoint differs (`direction="row"` →
  `direction={{ desktop: "row", mobile: "column" }}`); it collapses back to plain when every key is equal.
- A dot marks a breakpoint with its own value; "Reset to Desktop / Tablet" removes the key; "Same on every
  breakpoint" (link icon) writes the shown value plain.
- Fields that are not responsive show a small "All breakpoints" note while the editing breakpoint is Tablet or Mobile.
- Canvas handles (direction arrows, gap and padding drags: `select/spacing.ts`, `gridTracks.ts`) write the editing
  breakpoint's key.
- **Hide on <breakpoint>**: context menu, Layers row and Inspector, for Stack / Grid / Box; any other layer gets
  "Wrap in Box and hide on Mobile" (the existing wrap op, one undo step).
- Layers panel: a layer hidden at the breakpoint shown is dimmed, with an eye-off and the breakpoint icon.
- Zen Agent and MCP: no new tool; the `update` tool description and the zen-ds knowledge name the responsive shape.

Checks: selftests (`resolveAt`; field ops plain ↔ object and collapse; pull keeps other keys); a browser test of
Stack / Grid / Box at the three breakpoints and in nested modes; `usage:selftest`; `guidelines:check`; E2E rows (edit
direction while viewing Mobile → Desktop unchanged; reset; hide; handles); `npm run qa`.

## 5. P3 — Make a separate Screen (Studio; small, PR 3 or with PR 1)

- The view switch's menu, while viewing Tablet or Mobile: **Make a separate Screen** → `copyFrame`
  (`builder/frameEdit.ts`) as a new Screen with that device's size, id `<id>-mobile`, title `<title> · Mobile`, in the
  free space right of the original; the new Screen carries `versionOf="<id>"`; the original goes back to Desktop.
- Its label reads "Mobile version of <title>" and says the content is a copy (edits do not sync; shared parts as
  components, ⌥⌘K, do).
- Play, Present and Open on phone show the version matching the viewport's breakpoint when the flow reaches the
  primary (`proto.navigate("home")` at phone width shows `home-mobile`) (decision D4).
- Handoff names the versions and says to switch them with `useZen().breakpoint`. Figma push: each Screen as today.

## 6. Decisions for the user

- **D1** The view switch is per Screen (not one switch for every Screen on the page). *Recommended*; a page-wide
  switch can come later.
- **D2** The P2 props are the table above; responsive width / height comes later (Fill / Hug already adapt).
  *Recommended.*
- **D3** "Add Bottom Navigation" builds its items from the AppShell Sidebar's first top-level items (icon + label),
  else four blank items. *Recommended.*
- **D4** Play / Present / Open on phone follow `versionOf` by width. *Recommended.*
- **D5** Harness rule `layout/hide-on-every-breakpoint` (warning): only with the user's OK (scope lock).

## 7. Order and sessions

- **Session A** (Studio: `src/platform/studio/**`, `tools/studio/**`, the six component CSS files): P1 → P3 → the
  Studio half of P2.
- **Session B** (library: `src/components/Layout/**`, `_shared/responsive.ts`, guidelines, platform Layout page,
  `figma-push.mjs` / `figma-pull.mjs`): the library half of P2, from the start, in parallel with A.
- Each in its own worktree; A's P2 half starts after B's PR is merged. E2E ids: a new `BP-` prefix (not `FW-`).

## 8. Risks

- **No side-by-side comparison:** an edit made on Desktop can change Mobile unseen. The switch is one click each way,
  and "Changes on this breakpoint" lists what moves; side-by-side previews stay possible later as an option.
- **A view mistaken for the saved Screen:** the label says `Viewing …` and nothing of the view is saved, so a
  forgotten view changes no output.
- **First paint without a provider:** JS-resolved props show the desktop value until a breakpoint is known; apps have
  ZenProvider `auto`, Studio Screens have their own.
- **Grid `columns` in nested modes:** its CSS uses descendant selectors (`layout.css:25–26`); a desktop frame inside
  a mobile page may take the mobile columns. A P2 browser test checks it; if confirmed, Grid moves to `resolveAt`.
- **Free-placed layers** (x / y) keep their place in narrower views, as in Framer.
