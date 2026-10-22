# Session log 2026-10-22

## Select matching layers ⌥⌘A + Select all with same › (Session A, branch `zen/feat/studio-select-matching-20261022`)

The user's ask, relayed by the progress session: "điều phối cho session nhận scope chưa ai nhận đi". ⌥⌘A was one of
the four ❌ keys of the walk's §2a.

**Spec questions answered by the user in session A:**
- Figma's rule, from help.figma.com "Identify matching objects": a match is an identical layer in another frame, with
  the same name, the same parent names and the same place in the hierarchy. A layer in a Section matches only inside
  that Section, and a text that was never renamed matches by its text style.
- Studio numbers auto names per page, so the user picked "as Figma, without the auto numbers". A given name must be
  equal. An auto name compares by its kind. An instance compares by its component and variant (the Figma variant axes
  from variantSets.generated). A text compares by its text style.
- "Select all with same ›" is built in the same PR. It searches the whole page:
  - Fill compares Shape `fill`, frame `surface` and text `tone`.
  - Stroke compares Shape `stroke` and frame `border`.
  - Effect compares `effectStyle`.
  - Text properties compares `textStyle`.
  - Font compares the text style's family and weight.
  - Instance compares the component.
  - Properties compares the type and the paint props.

**Code:**
- `edit/matchModel.ts` is pure, with a selftest of 21 checks in studio:selftest.
- `edit/selectMatching.ts` maps the locs to rendered layers, leaving out locked and unrendered ones, and selects them
  with the source as primary.
- `select/layerMeta.ts` now keeps the page board (`pageBoardOf`).
- The entry points:
  - the ⌥⌘A key in figmaKeys, which works on view-only pages too;
  - its entry in figmaNotYet is removed;
  - the layer menu items "Select matching layers" and "Select all with same ›" (the list opens in place);
  - Quick actions;
  - the Shortcuts row;
  - `selectMatchingShortcut` in modKey (Ctrl+Alt+A off a Mac).
- E2E FW-175…179 (figma group).
- The worktree had no `uqr` (added by #191), so it was copied from the main checkout (memory: worktree node_modules).
- **Found by FW-178/179:** a right-click on a selected layer's resize handle opened no menu, because the handle only
  prevented the browser's menu. A short text at 53 % zoom is mostly handles. ResizeLayer now passes the right-click to
  SelectionLayer's onContextMenu (one prop, as SpacingLayer does). FW-178 right-clicks the text's left handle.
- **E2E:** FW-175…179 pass alone, 5 / 5 (after merging `main` f7e8708f). The test right-clicks off a selected ellipse's
  middle, since the arc dot is a handle of its own.

