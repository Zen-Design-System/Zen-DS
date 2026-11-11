# Session log — 2026-11-10

## Studio: a project's own fonts (tier M; session Bug; branch zen/feat/studio-project-fonts-upload-20261110)

User: "Nếu user muốn upload font riêng để dùng thì sao?", then "làm upload font riêng từng project". Built on PR #386
(a font per role, Inter + 24 Google Fonts).

**Spec card** (Project settings › Typography, Studio chrome):
- After the four role selects: one group per uploaded font. Its rows:
  - "Uploaded font": the name field, with Remove (an xs flat IconButton) in the icon column.
  - One row per file: its original name drawn in its own face (Body/Small/Regular, ellipsis), then its weight
    (SelectField sm, "Regular 400"…), or "Variable 100–900" (tone light).
  - Under them, what the font lacks (Caption/Regular, light): "No Medium, Semi Bold: text takes the nearest weight",
    "No Vietnamese letters: they show in Inter".
- "Upload font": a tertiary sm button that hugs its words.
- The section note adds the formats, the size and the licence line, behind its info button.
- The roles list the uploaded fonts first (meta "Uploaded").

**Model** (`tools/studio/project-theme.mjs`):
- `theme.type.uploads = [{ family, faces: [{ file, weight | [min, max], style, vietnamese }] }]`.
- Limits: at most 8 fonts of 18 files; files match `FONT_FILE` (slug-hash.ext).
- A family's name must be free: a name on the Google list gets " Custom".
- CSS family: `"<family> (<id>)"` (`uploadedFontName`), since @font-face is global. One project's font never draws
  another project's text or the Studio chrome.
- `projectThemeCss(…, { fontUrl })` writes one @font-face per file, after the @import:
  - `fonts/<file>` in theme.css;
  - the object URL in the Studio;
  - `zen-asset:<file>` for Open on phone.
- `projectFontsUrl` leaves uploaded families out of the Google request.

**Storage:**
- **Browser:** the files sit with the uploaded photos (`uploads.ts`, IndexedDB, a linked folder's assets/). Photo lists
  skip `font/*`.
- **Dev server:** `.zen-studio/projects/<id>/fonts/` (`projects-folder.mjs` writeFont/readFont, checked by first bytes,
  5 MB max). Routes are POST/GET `/projects/font`; GET /projects lists each project's fonts.
- **Sync:** `projectStore.syncFonts` pushes what the server lacks and pulls what this browser lacks after load and
  after each save. The sheets are written again when a file loads (`onUploadsChange`).

**Reading a file** (`project/projectFonts.ts`):
- FontFace loads it; refused files are named with the reason.
- A variable font is told by drawing at 200 and at 800.
- Vietnamese coverage: the same width with two different fallbacks.
- Family, weight and style come from the file name; files of one family join one font.
  - Known limit: CamelCase brand names split ("JetBrainsMono" → "Jet Brains Mono"). The name field renames it, and the
    roles follow.

**Shipping with the page:**
- Open on phone sends the files with the page's photos. `device-share.mjs` now takes `font/*`, and DevicePlay puts
  in their URLs.
- HTML export: `fontPath` names a blob font by its asset id.

**Bug met and fixed at its owner:** `htmlExport.tsx` `isTokenPart` did not allow `:not(`, so the HTML export left out
every project-mode rule (`[data-brand="p-…"] [data-contrast]:not([data-brand])`). An exported project page had lost
the project's colours, chart sectors and fonts.

**QA:**
- Self-tests: project-theme 2047, projects-folder 24 and device-share 45 checks; `npm run studio:selftest` ✓; tsc ✓;
  style:check ✓; usage ✓.
- E2E **S-13** (new, id from Giám sát), works:
  - a PNG is refused with its reason;
  - InterVariable uploaded as "AcmeSans-Variable" becomes Acme Sans, Variable 100–900;
  - JetBrains Mono Regular and Bold become one font at 400 and 700, with the "No Medium, Semi Bold" note;
  - Acme Sans picked for Heading and saved: the canvas heading's face is loaded;
  - the HTML export's styles.css has the project's Heading and the face with `fonts/<file>`;
  - `fonts/` and theme.css's @font-face are on disk, and a fresh browser pulls the file;
  - Remove sets Heading back to Inter.
- S-12 works.

## Studio: the project theme page redone as Figma's Variables window (tier M; same branch)

The user found the page "weird" ("UI UX chỗ này weird quá"). The review, with screenshots and an A/B mock-up, found:
- 11 sections in one column, about 2.6 screens tall.
- Six different controls for "pick one".
- Labels above every field, unlike the Inspector.
- Font files mixed into the role form.
- An unlabelled Type scale.
- A font list without samples.
- A preview that never followed what was edited.

User: "A, làm lại cả trang".

**Spec card** (`ProjectSetup.tsx`, `project.css`):
- **Body:** `200px | 320px | preview`.
- **Groups** (General, Color, Typography, Shape, Components): an APG vertical tab list (↑ ↓ Home End, one Tab stop). The
  rows match the Pages panel's (32px, 16px icon, Body/Small/Medium; Neutral/Flat hover, Active/Neutral/Subtle
  selected). Reset to Zen sits at the foot.
- **Opening a group** shows its preview tab: Color → Cards, Typography → Typography, Shape and Components →
  Components. A change never switches it (2026-11-07).
- **Fields** carry their label inside (`layout="inline"`, Figma's Inline-Field), one per row. A chart sector's field
  shows only its number, because "Sector 3" left no room for "Crimson". Type scale is a "Scale" select (14 / 16 px meta).
- **Typography › Fonts:**
  - A 28px row per font: "Ag" in its face, the name, "Variable" or "N weights", and a warning icon whose text is read
    out.
  - An uploaded font's row opens its files below it (a disclosure, not a Popover: the guideline keeps Popover for option
    lists). There: the name, each file's weight, what it lacks, Add files, and Remove font.
  - Remove font carries `zen-allow-destructive`: ⌘Z or Cancel brings it back.
  - ＋ in the section head uploads.
- **Roles:** every list shows the fonts in their own face. The listed fonts' "Ag" comes from one Google request with
  `text=Ag`, renamed "<family> Ag" so it never stands in for a whole font. The list ends in Upload font…, and the font
  uploaded takes that role.
- **Narrow (≤ 900px):** the groups become one row of tabs above the settings.

**QA:**
- S-13 was rewritten for the groups:
  - the Typography group shows the Typography preview, and Color shows Cards;
  - a picked font keeps the preview;
  - Fonts rows and the details group are checked, and Display › Upload font… gives Display "Brand Display".
- S-12 and S-13 work. Screenshots of each group, the font list and the narrow layout were looked at. Values cut in
  two-per-row status and sector fields, and a cut "Dashb…" in a 4-way Segmented, were fixed before the gate.

## Same day, later: the page polished, then v3 after the references (tier M; same branch)

**First polish.** The user said "UI xấu quá". The causes:
- Fields stopped at the Inspector's icon column while the swatches and segments ran on, so the right edge was jagged.
- The groups column was 200px and mostly empty, and the settings column 320px was cramped.
- The vertical rhythm was uneven.

I offered label-left rows; the user said "dùng inline input". So the page got its own `Section` and `Fields` (one grid
of equal columns, no icon column): colour dots in the colour fields, font cards, and Reset to Zen in the bar.

**v3.** The user asked for references ("tham khảo thêm các nguồn"). I looked at:
- shadcn /create;
- Radix's Theme panel;
- tweakcn;
- Material Theme Builder;
- Realtime Colors;
- Framer's and Canva's custom fonts.

What they share:
- The preview takes the window.
- There is no separate navigation column (tabs sit on top of the panel).
- Values are shown as pictures (dots, "Ag").
- Controls share one grid.
- A font list gives each font's kind.
- Uploads are kept apart from role assignment.

v3 is approved ("ok, làm theo v3"), then "v3 ok":
- Zen `Tabs` (subtle, sm, fullWidth, `idPrefix`) + `TabPanel` on a 340px panel: General · Color · Type · Style. Style
  holds corner radius, the component theme (a select whose leading is that theme's primary and selected fills),
  size and emphasis.
- The role lists add a kind ("Uploaded · Variable", "Zen · Variable", "Serif", "Sans"); the font rows are slimmer.
- Dropped from the mock-up, with the reasons:
  - "Ag" in the role fields: Zen's inline field puts a leading right after its label, far from the value.
  - Size and Emphasis side by side: "Medium" was cut.
- Fixed before delivering: tab labels "Typography" and "Components" ran into each other at 308px, so they became Type
  and Style.
- S-13 now opens the Type tab. S-12 and S-13 work.
- Fonts list: the user circled it ("UI chỗ này không đẹp"):
  - three bordered cards, "Ag" larger than the name, a grey Name field, cut mono file names next to "Regular 400", and
    two pill buttons.
  - Redone as Figma lists a family's styles: one box with hairlines, 36px font rows (disclosure, "Ag", name, kind, ⋯
    Menu: Rename, Add files, Remove font as danger), and opened style rows indented to the name ("Bold" in bold, 400 or
    700 on the right, file name in the tooltip).
  - S-13 now removes through the ⋯ menu. Row locators skip "<font> actions".
- QA: `npm run qa -- --isolated` PASS (Studio E2E 460 works, 0 broken; TypeScript, style, usage ✓); `npm run build` ✓.

## 2026-11-11: Component theme swatch fixed (tier XS; branch zen/fix/studio-theme-swatch-20261111)

The user reported a screenshot as a bug. In Style › Theme the two swatches (about 42px) sat in Zen's 20px leading slot,
so they ran out of the list's left edge and into the label. They are now one 20px square in two halves, its hairline
drawn on top in `::after`. The role lists' "Ag" sample also takes the 20px slot. Only `project.css` changed.

QA:
- The probe measured all 9 options: swatch 20px wide, 6px inside the list, 10px clear of the label.
- S-12 and S-13 work.
- `npm run qa -- --isolated --files=project.css` PASS (Studio E2E 460 works, 0 broken). `npm run build` ✓.
