# Session log 2026-11-01

## Studio Project setup: Corner radius tiles (tier S; user 2026-11-01: "Phần này xấu quá")

Branch zen/fix/studio-radius-tiles-20261101 (walk session).
- The tile drew a cropped card corner at Base radius. Rounded and Smooth share Base 12, so they looked the same; the
  picture was cut at its right and bottom edges.
- First try, a card holding a button: the user still found it ugly. Three styles were rendered with real tokens
  (Corner, Button, Card); the user picked Corner.
- `project.css`: one corner line (top and left border in accent), rounded as `--zen-corner-radius-action-medium`
  capped at `--zen-corner-radius-xlarge` (Rounded's pill → 20). `zen-allow-radius-role`: it pictures a button's corner.
  The selected tile's ring is accent (Component theme shares the tile).
- Gate `--isolated`: PASS, Studio E2E 451 works · 0 broken. Two runs in between failed on timeouts only: the Mac slept
  on battery (pmset log 19:18–19:40); `--failed` re-runs passed.

## Studio chrome → Figma B4 · Workspace Editor (tier L, branch `claude/studio-chrome-b4-59548a`)

User 2026-11-01: "Giao diện Studio thì làm lại kiểu B4" — replaces the 2026-10-15 UI3 floating panels (PR #63).
Source: Figma `9nZv4uW2LT21yuHabMTCh1` node `15916:6196` (read with use_figma: Pattern/AppShell/Desktop
Layout=Workspace; panes 240 + 8px edge, Theme=Border, Corner-Radius/XLarge, Border/Neutral/Pale, no effects; Body =
Neutral/Pale field r XLarge, 8px from the panes; top bar = Header/AppShell with Avatar Square "Z", Body/Base/Bold name,
Badge Small, Segmented secondary, AvatarStack, tertiary Play, Share, primary Publish; zoom Chip/Advanced Small at the
field's bottom-right). Code twin: `WorkspaceEditorApp` (`examples/pages/app-shell/b-desktop-2.tsx`).

- **Top bar** (`shell/PanelHeaders.tsx` `TopBar`, 48px, replaces LeftHeader/RightHeader/Collapsed*Bar): Zen Studio
  menu (Avatar "Z" + chevron, same items), Pages and layers button while that pane is a drawer, page name, Saved /
  Unsaved Badge (admin, writable; a page you made is always Saved); end =
  Read-only chip, Undo/Redo, Role, Present / Play (⌥⌘↵), Open on phone (a page you made, from the selected Screen),
  Save all with the drafts count or Export, the Inspector button while it is a drawer. Phone keeps menu, name,
  Present, drafts count, Inspector; Undo/Redo/role stay in the menu as before (S-07).
- **Panes** (`studio.css`): Border panes under the bar, no shadow (drawers keep the popover shadow while they cover the
  canvas); tab rows get B4's 8px Pane-Content padding; the Inspector's Close ends its tab row as a drawer.
- **Canvas** = the area between the panes (`--studio-left-column` / `--studio-right-column-end`), radius XLarge; its
  default colour is Neutral/Pale (`canvas.css`; the page Background option "Canvas" now reads "Pale"). The strips under
  the old floating panels, `--studio-inset-*`, `setCanvasInsets` and the inset measuring in StudioApp are gone:
  `getSafeBox` is the whole viewport (fit, zoom to selection, keep in view, first view, rulers, frame chrome).
  StudioCanvas already compensates the canvas's left edge moving when a pane resizes.
- **Overlay layer** inset 0 in the canvas area; window-placed tooltips shift back by the area's top-left; the App Shell
  playground full screen anchors its portal at the window corner (`position: fixed`).
- **Zoom** is an advanced Chip in the canvas's bottom-right corner beside the tip "?" (now a tertiary IconButton),
  `zen-allow-chip-action` (Menu trigger). Agent panel and AI chip lose their inset offsets.
- **E2E:** S-02 (zoom Chip), S-03 (top bar), G-01…03 chromeText (top bar), new S-10 (B4 geometry, no pane shadow, Pale
  canvas, no view switch repeated in the bar). Ids kept: `#studio-left`, `#studio-right`, `studio-left-panel-*`, `.studio-zoom__value`,
  "Zen Studio menu", "Undo", "Inspector", "Pages and layers".
- Walk (Playwright, private server): 1512 light/dark, 1100 + Pages drawer, 900 + Inspector drawer, 390, Studio home,
  a page you made in Prototype; Present, resizer keys, zoom Chip menu, ⌘\, Undo. Fixed on the way: at 390px the zoom
  Chip ran into the tools (the corner moves to the canvas's top-right below 768px); a Saved badge on Studio's folders,
  and beside another file's drafts.
- Gate run 1: 449 works, B-55…57 broken — their drag dropped 80px right of a Screen fitted to the view, which is now the
  Inspector pane (the canvas ends there): `dragAssetToBoard` drops inside the canvas area (below the Screen when the
  right is short). S-10 recorded in the baseline.
- User 2026-11-01 ("Tính năng bị trùng", screenshot of the bar): B4's centre Mode Segmented repeated the Inspector's
  Design · Code · Prototype tabs. Removed from the top bar; the Inspector's tabs stay (they also work while the
  Inspector is a drawer, where the bar had no room for the Segmented). S-10 now checks the bar repeats none of them.
- Export lived twice (top bar Export and the Page section's Export…): the top bar keeps it (B4's primary action; tertiary
  beside Save all; on a phone in the Zen Studio menu), the Page section drops it. E2E I-32, handoff `openExport` and
  build-check now press the top bar's Export; S-07, S-10, I-32 and nine HO rows pass.
- `studio:build-check` fails 8 steps here and on a clean origin/main worktree alike (chunk checks, then time-outs):
  pre-existing, logged in BACKLOG (P2).
