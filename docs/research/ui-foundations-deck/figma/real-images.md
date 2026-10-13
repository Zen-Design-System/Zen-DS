# Real images in the deck

The user asked for real images wherever a page shows Apple or Material guidelines (2026-10-13: "Các ảnh về platform
guidelines của Apple và Material nên dùng ảnh thật"). The files live only in Figma (image fills) and are not in git.
Fetch them again from these URLs when the HTML version is built. Every card in the deck names its source, and every
keynote has a `Nguồn ảnh` section.

Hosts reachable from the cloud session: `developer.apple.com`, `developer.android.com` and `raw.githubusercontent.com`.
`m3.material.io`, `docs-assets.developer.apple.com` and `lh3.googleusercontent.com` are blocked by the session's network
policy.

| Page | Image | Source | Licence |
|---|---|---|---|
| 034 Breakpoints | `window_size_classes_width.png` (2048×772) | developer.android.com/static/develop/ui/compose/images/layouts/adaptive/window-size-classes/window_size_classes_width.png, page "Use window size classes" | Android Developers content, CC BY 4.0 |
| 057 Material 3 and Apple HIG | `dialogs-types-hero.png` (2048×1244) | raw.githubusercontent.com/material-components/material-components-android/master/docs/components/assets/dialogs/dialogs-types-hero.png | Apache 2.0 |
| 057 | `human-interface-guidelines-page-image-card@2x.png` (1724×972) | developer.apple.com/tutorials/images/com.apple.HIG/human-interface-guidelines-page-image-card@2x.png (HIG landing page) | © Apple, teaching use with credit |
| 058 Minimum touch targets | `accessibility-controls-spacing-incorrect@2x.png`, `…-correct@2x.png` (356×148) | developer.apple.com/tutorials/images/com.apple.HIG/…, HIG Accessibility › Mobility | © Apple, teaching use with credit |
| 058 | `a11y-checkbox-padding.png` (132×132), `a11y-larger-inner-box.png` (275×275) | developer.android.com/static/develop/ui/compose/images/…, page "Accessibility API defaults" (Compose) | CC BY 4.0 |
| 059 Familiar navigation | `tab-bar-badges-iphone@2x.png` (536×580), `ipad-sidebar-music-app@2x.png` (1350×1012) | developer.apple.com/tutorials/images/com.apple.HIG/…, HIG Tab bars and Sidebars | © Apple, teaching use with credit |
| 059 | `bottom-nav-default.png` (1080×1000), `navigation-rail-example.png` (656×876) | raw.githubusercontent.com/material-components/material-components-android/master/docs/components/assets/bottomnav/…, …/navigationrail/… | Apache 2.0 |

How to find more: an HIG page's data is at `developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`.
Its `references` list every image with its alt text, and the files are under `developer.apple.com/tutorials/images/…`.
The Material component docs in `material-components-android/docs/components/*.md` link their images under `assets/`.

Facts checked against these pages: the iOS/iPadOS control size is 44 × 44 pt by default and 28 × 28 pt at minimum, with
about 12 pt of padding around bezeled controls and 24 pt around others (HIG Accessibility). Android touch targets are at
least 48 dp, "even if this extends past the UI element visual" (Design for Android, Accessibility). Window size classes
break at 600, 840, 1200 and 1600 dp.
