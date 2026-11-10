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
