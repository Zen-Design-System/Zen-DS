# Session log — 2026-11-18

## Smart guides beside a phone Screen's navigation (tier S, branch zen/feat/screen-bar-guides-20261118)

User: "Đang chưa có phần auto smart guide cho các element bên trong 1 screen với navigation của mobile".

Cause: a phone Screen with a Top or Bottom Navigation draws its chrome (runtime.tsx: `__main > __top · __content ·
__bottom`), and its layers sit in `__content`, not in the Screen. The snap targets missed this:
- move, group move, resize (`freeFrameBoxes`): the bars were no targets;
- draw (`snapTargets`): read the Screen's own children (`__main`, the system bars), never the layers or the bars;
- Assets drop (`freeDropAt`) and Assets / ⌘V insert (`freeInsertAt`): `layerBoxesIn(Screen)` read the Screen's children,
  so in such a Screen they saw no layer at all (an insert landed on the first layer under the Top Navigation).

Fix (edit/freeBlock.ts): `layerHolderOf(block)` (a Screen's content box when it draws bars) feeds `layerBoxesIn`;
`barBoxesIn(block)` gives the status bar, Top / Bottom Navigation and a desktop header / sidebar as boxes. Every snap
path takes both. The home indicator and the "Add Navigation" placeholders are canvas chrome, no longer snap targets (a
Screen without bars snapped to them as its children before).

E2E: FW-267 (move up to the Top Navigation, down to the Bottom Navigation, R drawn to it: red guide + snapped px),
FW-268 (Assets drop snaps to a layer's edge in such a Screen; an Assets click lands clear of the layers). Ids from Giám sát.

QA: FW-267/268 fail without the fix (git stash of src/) and pass with it; FW-27…29, 128–130, 261–264 work (FW-128 once
timed out reloading its page, Chromium load cut; alone and in a group it works); studio:dnd 25 055 + 12 654 cases, 0
findings; `--only=dnd` 8/8; qa --isolated PASS (Studio E2E 461 works; B-42 passed on retry after a cut module load);
build ✓.

## Top Navigation: Type → Theme in the Inspector (tier XS, branch zen/feat/top-nav-theme-label-20261118)

User (screenshot of Look: Type Alt): "Đổi type thành theme". Studio label only: `componentPropLabels.TopNavigation.type =
"Theme"` (propSchema.ts); the Compact warnings say "Compact themes". Code prop `type` and Figma "Type" unchanged; Bottom
Navigation keeps Type (its `type` is Default / Floating, its `theme` is Neutral / Accent). No E2E reads the old label.
E2E I-55 (id from Giám sát): fails on main ("Type Default"), works with the change.

QA: qa --isolated PASS (Studio E2E 462 works; ⟳ loaded twice: B-58, PT-54, DR-08); build ✓.
