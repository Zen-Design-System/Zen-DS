# Building deck pages in Figma with `deck-lib.js`

File `WxivIlv1HgC9NEMwtw9MOS` (UI-Foundations), page `UI Foundations · Giáo án 2026` (727:2). The approved concept, fonts
and placement rules are in [`../HANDOFF.md`](../HANDOFF.md); the page list is [`../outline.md`](../outline.md).

`deck-lib.js` is stored in the Figma file as shared plugin data, so a `use_figma` call only sends page content:

```js
const L = await (new Function('figma', figma.root.getSharedPluginData('uifdeck', 'lib')))(figma);
const sec = L.section('Lesson 03 · Design process', 3);   // finds or creates the section, row 3 (y = 3 × 2600)
const r = await L.slide(sec, 0, { ...page data... });     // index 0 = first page of the section (x = 80 + i × 3200)
L.fit(sec);                                               // resize the section to its content
await (await figma.getNodeByIdAsync(r.slide)).screenshot({ scale: 0.3 });   // look at it
return r;                                                  // { slide, keynote, issues: [] }
```

The repo copy is the source of truth. To change the library: edit `deck-lib.js`, then patch the stored copy with exact
string replacements in a `use_figma` call and check the checksum (body from `return (async function () {`, comment-only
and blank lines removed, `h = (h * 31 + charCode) % 2^32`). Do not re-upload by hand.

## Sections and numbering

- One section per lesson: `Lesson NN · Title` from the outline, row `NN`. A part divider is the first page of the section
  of the lesson that follows it (pages 10, 62, 95, 111). Index `i` = position inside the section.
- `name`: `'NNN · Short title'` (3-digit page: `'018 · Lesson 03 · Opening'`, `'019 · Design thinking'`,
  `'023 · Exercise 03'`). Re-running `L.slide` with the same name replaces that page and its keynote.
- `ref`: `'UIF-LL/PP'` (lesson, page; page with 2 digits below 100, 3 above). `where`: `'Lesson NN · Title'` (`'Part N ·
  Name'` on a divider). `page`: `'18'` / `'104'`.

## Page data

```js
{
  name, ref, where, page,
  title: 'Design thinking\nin five steps',  // English, uppercase by style, explicit line breaks; re-broken automatically if too wide
  deck: 'One or two sentences, under ~110 characters.',
  points: ['Exactly three points,', 'each 45 characters or less.', 'Project: … on the opening page.'],
  note: 'remember this one!',              // optional handwritten note, a few pages only (opening ideas, exercises: 'your turn!'); no em dash
  stamp: ['LESSON 03', 'UI FOUNDATIONS · 2026'], // opening pages; exercises: ['EXERCISE 03', '45 MIN · DUE AT LESSON 04']
  illo: { kind: 'flow', ... },             // see below
  caption: 'Fig. N — …',                   // ≤ 70 characters; ≤ 45 when the page has a stamp
  time: '12 phút',
  kn: [['Mục tiêu trang', '…'], ['Lời giảng', '…'], ...],   // keynote, Vietnamese
}
```

Part divider: `{ layout: 'part', name, ref, where, page, note, title: 'Part 3:\nSystems', deck, lessons: [['10', 'Atomic
design', 'p. 63'], …], quote: [text, author], stamp: ['PART 3', 'UI FOUNDATIONS · 2026'], time, kn }`.

Rhythm of a lesson (outline): opening page (goals + project piece, stamp, `lessonCard` or a lesson-specific
illustration), 3–6 summary pages, exercise page (note `your turn!`, stamp).

## Keynote (Vietnamese, detailed — the user asked for this)

A speakable teaching script, not a summary. Sections in this order, skip what does not apply:
`Mục tiêu trang` · `Lời giảng` (the explanation with one running example, numbers and names where they help) ·
`Minh hoạ` or `Ví dụ` (what to point at in the pinned photo) · `Lỗi hay gặp` · `Hoạt động (N phút)` and/or `Hỏi lớp` ·
`Chuyển ý` (one line into the next page). Exercise pages: `Mục tiêu trang`, `Hướng dẫn` (timed steps), `Tiêu chí`,
`Lỗi hay gặp`, `Nộp bài`, `Review buổi sau`. Opening pages add `Phần việc dự án`. Aim for 1,800–2,800 characters on a
content page. Lists inside a section: one item per line starting with `· `.

Facts: only well-known, checkable facts (author, year, standard number). If unsure, leave the number out. Examples:
Garrett 2002, WCAG 2.2 contrast 4.5:1 / 3:1 / 7:1, Material 3 window classes, Apple 44 pt, Material 48 dp, WCAG 2.2
target size minimum 24 × 24 CSS px, Brad Frost Atomic Design (2013 post, 2016 book), W3C Design Tokens Community Group.
Plan-dependent Figma features: say which plan (branching: Organization+; library publishing: paid plans).

## Illustrations (`illo.kind`)

Everything inside the photo is built from Zen components (`zi`) and Zen variables (`zpaint`); text inside illustrations
uses Inter (`Z`) or `Typed/Label`. The photo is 846 × 640; an illustration is scaled to fit (max 1.25×), design it about
760 wide.

| kind | params |
|---|---|
| `cards` | `cols`, `items: [{ tag, theme, title, text }]` (theme = Zen badge theme: Accent, Neutral, Yellow, Orange, Red, Pink, Plum, Purple, Blue, Cyan, Teal, Green…) |
| `flow` | `items: [{ label, sub }]`, `loop`, `loopLabel`, `highlight` (index), `numbered` |
| `compare` | `cols: [{ head, tag, theme, rows: [] }]` |
| `nested` | `rings: [{ label, sub }]` outer first, `colors` |
| `bars` | `items: [{ label, value, note, color }]`, `max`, `unit`, `labelW`, `barW` |
| `swatches` | `rows: [[{ name, label, sub }]]` — `name` = Zen variable short name (ink, base, white, canvas, subtle, accent, accentText, accentSoft, yellow, pink, blue, green, orange, red) or a full Zen variable name (e.g. `Light/Brand-Ananas/6`, looked up in Global Colors / Mode Colors) |
| `type` | `rows: [{ label, size, weight, text, family, lh, width }]` |
| `strip` | `items: [{ comp, v: { variant }, text: { prop: value }, bools: { prop: bool }, label, scale }]`, `cols` |
| `checklist` | `title`, `items: [{ text, checked }]` |
| `form` | `title`, `fields: [{ label, value, state, help }]`, `button` |
| `code` | `title`, `lines: []`, `size` |
| `timeline` | `items: [{ label, sub, top, color }]`, `highlight` |
| `diamond` | `labels: [4]`, `phases: [2]` |
| `grid` | `cols`, `gutter`, `margin`, `label`, `w`, `h` |
| `boxes` | `w`, `h`, `nodes: [{ id, label, sub, x, y, w, color, tag, theme }]`, `edges: [[from, to, dashed, label]]` |
| `spec` | `comp`, `v`, `text`, `scale`, `rows: 'auto' \| [[k, v]]`, `extra`, `label` |
| `table` | `head: []`, `rows: [[]]`, `widths: []` |
| `lessonCard` | `num`, `title`, `terms: []`, `project` |
| `phone` | `title`, `items: [strip items + fill]`, `button`, `navType` |
| `row` / `column` | `parts: [illo, …]`, `gap` |
| `text` | `text`, `size`, `weight`, `typed`, `width` |
| `images` | real images: `cols`, `width`, `boxH`, `items: [{ src, iw, ih, cover, boxH, maxScale, mark: 'do'\|'dont', tag, theme, title, sub, source }]`; builds empty slots, see below |
| `custom` | `draw`: a JS function body (string) receiving `api` (`L` itself: `zi, zpaint, Z, T, al, card, svg, recolor, arrowH, arrowV, arrowXY, labelUnder, wrapText, fixW, VAR, ZEFFECT`) and returning a node |

Tip for `custom`: `api` is `L` itself, so you can define a helper in the same call (`L.dGestalt = async () => { … }`) and pass `draw: 'return api.dGestalt()'` instead of writing the whole function as a string.

Zen components (`comp`) and their variants: `button` (Size XLarge/Large/Medium (Base)/Small/XSmall, Level
Primary/Accent/Secondary/Tertiary/Danger/Danger Subtle/Positive/Positive Subtle, State Default/Hover/Pressed/Focused/Disabled,
text `Text`), `textField` (Size, State Default/Hover/Focused/Typing/Inputted/Read-Only/Disabled/Inputted-Error/Blank-Error;
nested texts Label, Text), `toggle` (Size Large/Medium/Small, State Default/Disabled, Select Yes/No), `chip` (Size,
Level Primary/Secondary, Theme Text-Only/Leading-Icon/Leading-Photo, State, Select; text `Text`), `badge` (Size
Medium/Small/XSmall, Theme, Background Solid/Subtle, text `Text`), `avatar` (Shape, Size 3XLarge…2XSmall, Theme,
Background), `avatarStack` (Size, Background, Number 1–5), `progress` (Theme Accent/Neutral/Status, Progress
None/Low/Medium/Good/Done, text `Text`), `topNav` (Type Default/Alt/…/Liquid Glass/Compact…, Margin), `toast` (Type
Neutral/Subtle/Info/Positive/Warning/Negative, texts `Title-Text`, `Caption-Text`, bool `Actions`), `inline` (Theme
Neutral/Info/Positive/Warning/Negative), `dialog` (Theme, Device Desktop/Mobile), `stepper`, `tabBar` (Style
Indicator/Subtle), `checkbox` (State, Select Yes/No, Check-Side), `skeleton` (Shape Pill/Round/Square/Rectangle, Size).
Zen shadow styles: `api.ZEFFECT['Level-1' | 'Level-3' | 'Level-4']` (style keys, `figma.importStyleByKeyAsync`).

## Example pages (`layout: 'example'`)

The user wants one detailed UI example per principle (2026-10-13), as sub-pages numbered after the page they illustrate
(`'026a · Proximity in a form'`, ref `UIF-04/26a`, page `26a`). Layout: text column `textW` (712 fits the longest
two-line titles at 112 px) and `photos: [{ label: 'not this', illo, caption }, { label: 'do this', illo, caption }]`,
`photoH: 620`; the margin note says `example N of 5`. Each photo holds a QuickClinic screen built with
`L.screen(name, 380, opts)` from Zen components (`zi`) and Inter text (`Z`), with `L.redline(scr, a, b, x)` for spacing
and `L.pin(scr, node, n)` for numbered notes the keynote refers to. Build at any index, then `L.reflow(sec)` orders the
section by name (`026` < `026a` < `027`) and moves the keynotes. The scripts for Lesson 04 are in
[`pages/l04-gestalt-examples.js`](pages/l04-gestalt-examples.js) (one block per `use_figma` call, after COMMON).

## Real images (platform guidelines, tool screenshots)

The user wants real images wherever a page shows a platform's own guidelines (Apple HIG, Material 3) or the Figma UI.
`images` draws each one as a Zen card with an empty rectangle named `Image · <file>`, sized to the image's aspect
(`cover` crops it to the box instead). Fill the rectangles with `upload_assets` (`nodeIds` in the same order,
`scaleMode: 'FILL'`), then POST each file to its `submitUrl` as `-F file=@…`. Give every card a `source` line, and
the keynote a `Nguồn ảnh` section with the URL. Keep the files out of git; the list and licences are in
[`real-images.md`](real-images.md).

`L.knSet(slideId, [[heading, text], …])` rewrites a keynote section in place (a heading the keynote lacks is added
before `Chuyển ý`) and re-spaces the group. `L.reillo(slideId, spec)` swaps only the illustration. After a swap, move
the clip (`Clip`, x 64 by default) off any card title it covers; x 330 sits over the gap of a 2-column grid.

## Checks before you move on

- `issues` from `L.slide` must be empty (title wider than the column, overflow, long point, tight illustration, stamp
  over caption). Fix the data and run `L.slide` again for that page.
- Look at every page screenshot: nothing clipped, illustration readable, no placeholder text ("Button", "Chip", "Label").
- At most 4 pages per call (the 50 kB code limit and the 20 kB answer limit).
