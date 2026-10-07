# Changelog

All notable changes to Zen DS. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/) (0.x: minor bumps may break).

How to maintain it:

- Add a line under **Unreleased** whenever a change touches the public API (`src/index.ts`), a component's look or
  behaviour, a house rule, a harness rule or a QA gate.
- Keep lines short and user-facing. The details (causes, measurements, test names) belong in
  `docs/context/session-log-<date>.md`.
- On release, rename **Unreleased** to the version and date, bump `package.json`, and start a new empty Unreleased
  section.

## [0.4.0] — Unreleased

Vibe-code readiness, part 2: one API vocabulary, localised labels and tooling for AI agents (branch
`feat/vibe-ready`). Renamed props stay as deprecated aliases that keep working (the harness warns); no component API was
removed (four unused colour ramps were, see Removed).

### Added
- **ToggleListItem and ChipGroup (2026-10-07, backlog batch 6):** `<ToggleListItem>` is a settings row whose whole
  surface flips its switch (title names it, caption describes it); `<ChipGroup>` is a single-choice radio group of
  Normal chips (one Tab stop, arrow keys move the choice). Both are composed from the existing Figma primitives (no
  Figma master yet). Sidebar takes `searchCollapsed`, what the collapsed rail shows in place of `search`. Harness:
  `list-item/switch-row`, `chip/radio-is-chip-group`.
- Docs platform and Zen Studio: required sign-in with Google through PocketBase (`src/platform/auth/`); Log out in the
  platform topbar's account menu and in the Studio brand menu. Automated browsers (QA gate, E2E) skip the sign-in screen.
- **Zen-High-Contrast (2026-10-05, prototype):** `<ZenProvider contrast="high">` (or `"system"`, which follows the OS
  Increase Contrast setting, `prefers-contrast: more`) switches the Global Colors to a high-contrast mode. Subtle borders
  (Checkbox, Radio, Subtle controls) reach 3:1, the placeholder and Light text 4.5:1, a colour's Light text 4.5:1 and its
  Base text 4.5:1 on its own Subtle background. Step 9 of every colour, the backgrounds and the text on Solid fills keep
  their values (user rule), so no token is added. The Zen Plugin writes the mode into Figma with the same algorithm
  after every Global Colors write (and on Color Scales › Create Variables › Sync High Contrast); since the 2026-10-05
  evening export the repo takes it from Figma (all 960 values equal `scripts/high-contrast.mjs`, which stays the
  fallback), and `tokens:check` verifies the rules either way. Docs: a Contrast control in the classic top bar and the Studio Modes menu, `?contrast=high`, and
  `shoot.mjs --contrast=high`. axe on 14 pages, Light: about 880 failing text nodes → about 40, the rest being white
  initials on step-9 Avatars and the docs code view.
- **Sky, Mint, Bronze and Golden themes (2026-10-05, from the live Figma sets):** Avatar, Badge and BadgeCounter take
  `theme="sky" | "mint" | "bronze" | "golden"`, and DockIcon takes `"sky" | "mint" | "bronze"` (it already had Golden).
  Solid fills use Support/<colour>/Solid. Text on Sky and Mint is On-Brights (dark), on Bronze and Golden On-Colors
  (white); DockIcon icons are On-Colors for all four, as in Figma. Subtle fills use Support/<colour>/Subtle with
  Strongest text and Light icons. New tokens: the Support Sky and Mint sets (Content, Background and Border, 20 in all),
  and Text/Heading/Icon `tone` takes `support-sky-*` and `support-mint-*` (Lights group: no Light text).
- **`npx zen-ds audit <url…>` (2026-10-05):** checks an app's pages as rendered, in Chromium: the page scrolling
  sideways, broken images, controls without a name, nested controls, Surface boxes on a Canvas/Alt page without a border,
  duplicate ids, phone targets under 24px, text under 3:1, the heading outline, Zen text styles / tokens / hierarchy /
  rhythm / spacing ladder, text wider than its box, and axe-core when installed (its 4.5:1 contrast rule with
  `--wcag-contrast`). Screenshots at 1440 and 390 (and dark with `--dark`), `.zen-audit/report.md` + `report.json`; exit 1
  on an error, `--strict` on warnings too. Needs Playwright in the app.
- **TopNavigation trailing groups never apply to Flat actions (2026-10-05):** the compact types draw Nav-Action/Flat, which
  never pairs (Figma's Icon-Flat has no trailing icon; the component already ignored `group` there). Now the Studio
  follows: on a compact TopNavigation, dragging an action onto another only reorders, the Slots rows and the action's
  panel offer no Group / Take out of group, and a written `group` stays with a note ("draws no pill here") so it comes
  back with the other types; Properties warns under the actions. The playground hides Grouped trailing on the compact
  types. Data slots take `groups` as a test of the owner's props (`slotGroups`, `slotGroupsAt`, `groupsOffNote`).
- **One full-screen bar for the docs and the Studio; Present steps between examples (2026-10-05):** the classic docs'
  full screen (cards flagged `screen`, the App Shell playground) now uses the same bottom-centre bar as the Studio's
  Present (`FullScreenBar` in `PlatformFullScreen.tsx`, replacing `FullScreenExitButton`): the screen's name and Exit with
  its Esc hint, fading out while the pointer rests and staying while a keyboard user is on it. Present adds ‹ 3 / 7 › to
  step through the page's examples (← / → when the focus is not inside the example; the button keeps the focus) and no
  longer loses a desktop screen's full-window layout when a hot update remounts the card (ExampleCard `presented`).
- **Zen Studio: one light/dark, and Present gets its own controls (2026-10-05):** the toolbar sun/moon (now "Dark mode" /
  "Light mode"), Modes › Mode and Quick actions switch the Studio and the canvas together, so examples and playgrounds
  follow the interface instead of staying light on a dark Studio; a frame's own theme (frame toolbar, Frame panel) still
  wins. Present replaces the small "Exit full screen" pill at the top with a floating bar at the bottom centre in the
  canvas pills' style: the example's name, light/dark, Modes (component theme, size, typography, corner radius,
  emphasis in a panel above the bar) and Exit with its Esc hint. The bar fades out 2.5 s after the pointer stops and comes
  back on movement, hover or keyboard focus (Tab reaches it first); Escape closes an open panel before it leaves Present.
- **Text / Heading: `height`, `verticalAlign` and `align="justify"` (2026-10-05):** Figma's text box options.
  `height` (hug · fill · px, with `minHeight` / `maxHeight`) works as on Stack, Grid and Box (Figma's Fixed size text
  box). `verticalAlign` is `"top"` · `"middle"` · `"bottom"` (Figma's Align top / middle / bottom); it shows only when
  the box is taller than its text (CSS `align-content`; a clamped text packs its lines). `align` also takes `"justify"`
  (Figma's Justified), meant for long paragraphs in a wide column. New types: `TextAlign`, `TextVerticalAlign`.
- **Zen Studio: text alignment as in Figma (2026-10-05):** in the Text section of a selected Text or Heading, `align` is
  now Figma's Typography › Alignment, placed right under Style: icon-only Align left / Align center / Align right /
  Justified, each named by a tooltip after 1 s, and a "Vertical" row below it (Align top / middle / bottom) whose note
  says when the box has no room for it yet. A host text element (`<p>`, `<span>` with a text-style class) gets the same
  two rows, written as its inline style (`textAlign`, `alignContent`; the reset removes the key, or the whole `style`
  when it was the only one). Text and Heading resize on the canvas on both axes now, and Layout › Size shows H. Unset, it shows the alignment the text renders with (Center when a parent centres it);
  picking that one writes nothing, another writes `align`, and the row's reset removes it. `truncate` follows Figma's
  Truncate text + Max lines: the switch on writes `truncate` and shows Max lines (whole number ≥ 1; 1 writes `truncate`,
  N writes `truncate={N}`, a stepper writes at once), off removes it. `truncate={2}` in the code now reads as on · 2
  (before, the switch showed off and locked). A playground's boolean state keeps Max lines at 1, with the reason shown.
- **Every resting Color/Content token as a `tone` (2026-10-05):** Text, Heading and the new Icon `tone` take any resting
  content colour, spelled as its token path (`Content/Support/Blue/Light` → `tone="support-blue-light"`; Neutral keeps
  `strongest` · `base` · `light`; `hyperlink`, `on-accent`, `on-brights`, overlays, Inverse Base/Light…): 81 tones instead
  of 12. Old names stay as aliases (`secondary`, `accent` = `accent-base`, `inverse` = `inverse-strongest`); Icon without a
  tone keeps its parent's colour. Zen Studio's Tone picker lists them all, grouped by family with search. The harness rule
  `content/lights-no-light-text` now also checks a written `tone` (Light text stays allowed, sparingly, for help or error
  text and conditions in every family outside the Lights group). Shared source
  `src/components/_shared/contentTone.ts` + `content-tone.css`; test `tests/content-tone.test.tsx`.
- **Zen Studio E2E harness (2026-10-05):** `npm run studio:e2e` drives the Studio UI in Chromium on its own dev server
  (port 5190+, its own drafts) and writes a feature matrix of 65 rows (shell, selection, Inspector, keyboard, structural
  edits, data, overlays, drafts, read-only gate). Baseline: 42 work, 23 are broken; those 23 are the GĐ1 work list in
  `docs/research/studio-builder-plan-2026-10-05.md`. `npm run studio:selftest` runs the Studio self-tests. `npm run qa`
  now runs both whenever Studio files change, and no longer fails Studio files on "Page mapping".
- **Zen Studio fixes, GĐ1 (2026-10-05):** 18 E2E rows now work.
  - Menus and popovers in the chrome open on screen (the zoom menu no longer opens below the window).
  - ⇧1 fits every frame.
  - The toolbar fits a phone: Undo, Redo, theme and role move into the Zen Studio menu, and Modes becomes an icon.
  - Layers search with no match says so.
  - Delete works after using an Inspector control.
  - ⌘D in a text field no longer opens the bookmark dialog.
  - ⌘C works right after a canvas click.
  - Quick actions Duplicate and Remove act on every selected layer.
  - Right-click gives a canvas menu on the empty canvas, a frame menu on a frame, and Copy, Cut, Duplicate, Remove and
    Wrap for several layers. The layer menu shows all its items, moved up to fit the window.
  - "Detach instance" is labelled as in Figma.
  - Mixed properties work in shared component files.
  - Removing a layer also removes the `useState` only it read, and react's import when no `useState` is left.
  - Menu Move up / down keeps the layer selected.
  - Structural actions that cannot run show disabled with the reason instead of disappearing.
  - A toolbar "Read-only" chip says why the Studio cannot edit (built site, Viewer, non-localhost address, no dev
    server) and offers the fix (Switch to Admin, Open on 127.0.0.1, Reset Studio settings).
  - Studio focus rings use Focus/Neutral (3:1 on the light canvas).
- **Zen Studio: data at its source and overlays as layers (2026-10-05, GĐ1 WP-C server + WP-F):**
  - The dev server says where each expression prop and child gets its value (`dataSource` on GET /element, from the new
    `tools/studio/data-source.mjs`): a `.map` row of a literal list, a const, an import such as `examples/data.ts`, or
    a factory call like `person(…)`.
  - New op `setDataField` writes a value where the data holds it, as a draft of that file (undo follows it).
  - Double-clicking text that comes from a `.map` row edits that row's data.
  - The Inspector edits those values too: a prop fed by a list row or by `examples/data.ts` shows an editable field
    with what it renders and a note naming the data ("From people.bao.role in data.ts"), and the edit goes to the data
    (the binding stays). A binding that reads no state (a condition on a const, a helper's value) offers "Set fixed
    value", which writes what it renders now; Restore puts the binding back. State-bound values never get a fixed
    value: they edit their starting state instead.
  - In Select mode an open Dialog, Side Panel or Bottom Sheet is a layer: a click selects and outlines it, and its
    buttons stay inert until Interact. Layers lists overlay owners even while they are closed.
- **Zen Studio: Properties follow Figma for 53 components (2026-10-05, GĐ1 WP-E):** the Studio read every public
  Figma component set's properties (`docs/figma-contracts/component-properties.json`, 143 sets) and maps them to the
  code props (`tools/studio/figma-props.map.mjs`).
  - The Inspector lists the variants first, then the Figma booleans (Leading-Icon, Caption, Help-Text…), then the
    instance swaps and texts, all under their Figma names.
  - A boolean writes the prop it stands for. An instance-swap row (Leading-Icon-Src) shows only while its boolean is on.
  - `node tools/studio/figma-props-build.mjs --check` (in `studio:selftest`) fails when Figma or the code drifts:
    an unmapped property, a renamed prop, an option with no code value.
- **Zen Studio: Appearance and Effects sections for Box (2026-10-05, GĐ1 WP-D, Figma UI3):**
  - Appearance: Fill, Border, Corner radius, Clip content. Image gets Corner radius only.
    - Corner radius shows its px and has "Independent corners": four corner fields written in the canonical form
      (`radius` plus only the corners that differ; Mixed shows the px range).
    - The corner fields stay off the Properties list.
  - Effects: one Figma effect style per Box.
    - "+" adds the elevation that fits the fill (a Top shadow when pinned to the bottom).
    - The picker lists the 9 Box styles with their use, and greys out the ones the fill can't take.
    - The eye hides an effect for the session; − removes it.
    - Warnings come with their fix: no shadow on a tinted fill, a shadow needs the Surface fill, a shadowed surface
      takes no border, blur needs a translucent fill.
- **Zen Studio builder, M1: make your own pages (2026-10-06, GĐ2):** Pages › My pages › + opens "New page" (a title
  and Phone, Tablet or Desktop). The page opens on the canvas as a Screen frame and is saved in this browser as you edit
  (IndexedDB; reload and it is still there). Everything the Studio does on example code works on it: select, the
  Inspector, Layout, Assets, slots, drag, undo/redo. Actions from Assets become prototype actions (`proto.toast(…)`);
  items that keep state wait for the prototype milestone and say so. A page is a real TSX file in a small dialect
  (`*.zen.tsx`: Zen components, literal props, `mock` data lists, `proto.*` actions), run by the same edit engine as the
  dev server, now loadable in the browser (no Node imports). The toolbar reads "My pages › <title>".
- **Zen Studio builder, M2: manage your pages (2026-10-06, GĐ2):**
  - Each page under My pages has a menu: Rename…, Duplicate, Export file (`<id>.zen.tsx`, byte for byte), Version
    history… (the last 50 versions; one is kept before each burst of edits, a rename, a restore or an import) and
    Move to Trash.
  - The section's menu: Import pages… (one or more `.zen.tsx` files; an invalid file is refused with its line), Trash
    (Restore, Delete forever; pages are deleted for good after 30 days), Sync with the folder, Link folder….
  - On the dev server the pages are also kept in the repo's gitignored `.zen-studio/pages/` (the source of truth; a
    page moved to the Trash goes to `.zen-studio/trash/`, nothing is deleted on disk). A change made in the folder
    reaches the Studio on the next sync; when both changed, the folder wins and the browser's text stays in Version
    history.
  - On a build without the dev server, Link folder… keeps a copy in a folder you pick (Chromium); after a reload,
    Reconnect gives the browser access again.
  - Under My pages a line says where the pages are kept.
- **Zen Studio builder, M3: prototype and Play (2026-10-06, GĐ2):**
  - On a builder page the Inspector has a Prototype tab. Flow lists the page's Screens and Overlays, with Add screen,
    Add overlay (an Overlay holding a Dialog whose buttons close it) and Play.
  - Interactions: select a button (or anything with onClick, onSelect…) and pick an action: Navigate to a Screen, Open
    overlay, Close overlay, Back, Show toast (a title) or Open link (a URL). It is written as code
    (`onClick={proto.navigate("screen-2")}`), so ⌘Z undoes it.
  - While the Prototype tab is open, arrows on the canvas join each action to its Screen or Overlay.
  - Play (P, the Play button, or `?play=<screen>` in the address) runs the page full screen from the selected or first
    Screen: navigate, overlays (opened inside the device), toasts, links, Back, R to restart, Esc to leave. The
    Interact tool (I) runs the actions on the canvas too: navigate and open zoom to their frame.
  - An Overlay frame on the canvas now keeps its Dialog's scrim inside the frame (it covered the whole board).
- **Zen Studio builder, M4: checked on a production build (2026-10-06, GĐ2):**
  - The deployed docs (no dev server) make, edit, reload, prototype and play builder pages, and Link folder… keeps them
    in a folder. `npm run studio:build-check` builds the platform, serves it with `vite preview` and drives that whole
    flow in Chromium.
  - The edit engine loads only when a builder page opens: a component page never requests it. Its lazy chunk went from
    150 to 135 KB gzip: builder pages have no Detach, so the browser engine leaves the detach recipes out. The helpers
    the edit ops share moved to `tools/studio/source-helpers.mjs`, and `detach.mjs` registers op "detach" when it
    loads. Its budget is 140 KB gzip (the spec's 130 guessed the parser at 100 KB; it is 77); the check fails above it.
- **Zen Studio library, GĐ3 M1: search that understands you, and adding with nothing selected (2026-10-06):**
  - The Assets search lists the best match first and knows what people call things, in English and Vietnamese:
    "modal", "popup", "hộp thoại" or "hop thoai" find Dialog; "dropdown" finds Select; "switch" or "công tắc" finds
    Toggle; "nút" finds Button; "bảng" finds Table. One typo is forgiven ("buton", "tabel"). Words from each component's
    guideline count too ("confirm" → Dialog).
  - With nothing selected, a click on an Assets item adds it into the frame most in view (its first layout); with a
    frame selected, into that frame. On a builder page, Dialog and the other overlays point to Prototype › Add overlay.
- **Zen Studio library, GĐ3 M2: Quick insert (⇧I) (2026-10-07):** ⇧I on the canvas opens a search over the library,
  as Figma's Quick insert does. ↑/↓ pick a result and Enter adds it. A line under the field says where it will go ("Into
  Stack · Checkout", "After Button"); with nothing selected it goes into the frame in view. Esc or a click outside
  closes it. The focused item is drawn for real beside the list, in the canvas's modes, with its overlays kept closed.
  The Shortcuts dialog lists ⇧I and P (Play).
- **Zen Studio library, GĐ3 M3: icons and photos (2026-10-07):**
  - The Assets tab has Components · Icons · Photos. Icons lists every glyph of the set once (Line or Solid), with a
    search that knows English and Vietnamese ("xoá" or "delete" → trash, "nhà" → home, "đóng" → x) and one typo. A
    click adds an `<Icon>`; with an Icon selected it swaps that Icon's glyph instead (⌘Z puts it back). Photos are the
    platform's sample photos.
  - On a page you made a photo is written `src="zen-media:<name>"`, the same text in every build; the canvas, Play and
    the previews show this build's file. Example code keeps `platformMedia`, with its import.
  - Quick insert (⇧I) lists Components, Icons and Photos in groups, and previews an icon or a photo as itself.
- **Zen Studio instance panel, GĐ4 M1: like Figma's (2026-10-07):**
  - A variant select lists Figma's options first, in Figma's order and by Figma's names ("Medium (Base)", "Danger
    Subtle"); options only the code has come last. The file still gets the code value (`size="md"`). Selecting several
    layers of one component shows the same names.
  - 70 components follow their Figma set (54 before): NumberField, TextAreaField, DatePicker, Stepper, Metric,
    MetricCard, EmptyState, the chat bubbles and more. NumberField and TextAreaField now list the field props they take
    from InputField (Label, Help text, Size, State), and AvatarStack and BadgeCounter their Theme and Background.
  - A field's Label and Help-Text are groups, as Figma's nested layers: the text with Optional, Tooltip-Icon and Action,
    or with Theme, Icon and Character limit, shown while the Label or Help-Text switch is on.
  - Switches for layers held as objects: EmptyState CTA, AlertBanner and InlineMessage Action write `{ label: "Action" }`,
    then its fields; off removes it. An icon that can be hidden (Dialog and Toast icon, AlertBanner Leading, Metric's
    dock icon) is a switch plus the icon picker in one row.
  - **Reset all overrides** (↺ in the Inspector header): the variants, switches and icons written on a Zen instance go
    back to their defaults in one step, and one ⌘Z brings them all back. The text, handlers, data, value and open state
    stay.
- **Zen Studio instance panel, GĐ4 M2: swaps (2026-10-07):**
  - The icon picker leads with the icon swap's default in Figma ("Default in Figma"), then the icons the file already
    uses ("Used in this file"), then every icon. Figma's own preferred lists hold the whole icon set, so they add nothing.
  - A layer switch that shows an icon (Button Leading-Icon, Trailing-Icon) starts from Figma's default icon
    (`icon-plus-line`), not a fixed one. Slider's Icon is its icon row's switch.
  - **Swap a component in a slot:** a ListItem's Leading (Avatar ↔ Dock icon) or Actions (Badge, Icon button, Button) has a
    ⇄ menu on its layer row: the other component takes its place, imports follow, one ⌘Z.
  - **Swap instance:** ⇄ in the Inspector header or the canvas menu's "Swap instance…" opens Quick insert in its Swap
    mode. Enter puts the chosen component in the selected layer's place (a child, a prop's value or a list row; a `key`
    stays), selects it, and one ⌘Z brings the old layer back. Works on pages made in the Studio too.
- **Zen Studio instance panel, GĐ4 M3: nested instances (2026-10-07):**
  - A Zen component inside another one's props (the Avatar in a ListItem's Leading, a Button in a Card's sub-action) now
    shows all of its properties under its owner, as Figma's nested instances do: its variants by Figma's names, the
    switches that show a layer, icon swaps and texts. Before, only its on/off switches showed. An edit writes the nested
    layer where it is written.
  - Reset all overrides on an instance resets its nested instances too, in one ⌘Z ("3 properties back to default (1 in
    nested instances)"). A nested instance written elsewhere (a const, a helper, another file) is shared code and stays.
- **Zen Studio starters, GĐ3b M1: a new page from any example or template (2026-10-07):**
  - **New page from this frame** (right-click a frame on the canvas, or the frame's Inspector): the Studio copies what
    the example or template shows into a new page of your own, kept in this browser. Every prop is a plain value you
    can edit; the state it showed is kept (the open tab, what was typed, the list as filtered), its logic is not
    (handlers, forms' wiring: add links in the Prototype tab).
  - Works on the deployed docs too (no dev server). The status line lists what could not be kept.
- **Zen Studio starters, GĐ3b M2: an example's own HTML becomes layout (2026-10-07):**
  - An example's `div` rows and grids become Stack and Grid (direction, gap, alignment, wrap, columns, padding), a
    tinted or bordered box a Box (Surface, Border, Radius), headings Heading, paragraphs Text (their text style and
    tone), links Link, images Image, rules Divider. Spacing takes the nearest token.
  - A Stack, Grid, Box or Text styled by an example's own class gets what that class renders as props (gap, padding,
    alignment, text style).
  - The docs' card around an example is not copied; the room it leaves around the content is (a padded Stack).
  - Measured on every example and template: 323 of 323 frames become a valid page.
- **Zen Studio starters, GĐ3b M3: Start from a template; overlays as Overlay frames (2026-10-07):**
  - **New page › Start from:** Blank page or one of the 15 page templates (the title defaults to the template's; a phone
    template makes a phone page). Works without a dev server.
  - A Dialog, ModalForm, SidePanel or BottomSheet in what you copy becomes an Overlay frame of the page, drawn open; its
    own buttons close it (`proto.close()`). Link the button that opens it in the Prototype tab (Open overlay).
- **Zen Studio export, GĐ5 M1: a page as React code (2026-10-07):**
  - **Export…** (a page's Inspector panel, or its menu in My pages): the page as one React component for an app that
    uses `@zen/design-system` (Copy code, or Download `<Name>Page.tsx`), or as its design file (`.zen.tsx`). No dev
    server needed.
  - Each screen is a branch (Back works through its history), a state variant shows while the `state` prop names it,
    overlays open and close from their own state, the sample data becomes `export const mock` with its type (the
    `data` prop replaces it). Prototype links become code (navigate, open / close an overlay, back, a toast, a link),
    library photos imports from `./assets`. A TODO(dev) block lists what to wire.
  - What a component requires but a design cannot hold (a chat field's `onSubmit`, a Table column's `cell`, an action's
    `onClick`) gets a stand-in, listed in the TODO block. On the canvas a Table column without a cell now shows its
    rows' field named by its id; before, a page made from a template with a Table (Admin list, Dashboard, the HR lists)
    stopped the canvas.
  - Fields a component's object type does not have (an option's own `at`) are left out of the code. In New page from
    this frame, a date given to a prop (DateField `today`, a DatePicker range) is left out instead of becoming text the
    component cannot read, and a router link (`as={RouterLink} to="/x"`) becomes a plain link (`href="/x"`).
  - The React of every template and example frame passes TypeScript and the usage harness.
- **Zen Studio export, GĐ5 M2: a page as static HTML (2026-10-07):**
  - Export › **HTML**: each screen, state variant and overlay as an HTML file (`screens/<id>.html`, an overlay drawn
    open), with `styles.css`: the Zen rules those screens use (tokens and their modes, the components' rules, the fonts
    and animations they name), read from the styles the Studio has loaded. **Download `<page>-html.zip`** holds them, an
    `index.html` that lists the screens, the library photos and the font files; open `index.html` in a browser.
  - The markup is what the canvas draws, without the Studio's attributes; form fields keep what they show. Measured on a
    page with a list, a photo, a form, a state variant and a Dialog: each file matches its frame on the canvas at 100%.
  - Static markup: menus, dialogs, tabs and fields do not open or change; the React code has them.
- **Zen Studio export, GĐ5 M3: the handoff package (2026-10-07):**
  - Export › **Handoff** shows the page's `handoff.md`; **Download `<page>-handoff.zip`** packs everything a developer
    needs: the React component, the design file (`.zen.tsx`), the photos the code imports, a picture of each screen and
    overlay (`screens/*.png`, 2×, drawn in the browser as the canvas shows it), the HTML export (`html/`) and
    `handoff.md`.
  - `handoff.md` is written from the page, never by hand: setup (the library version, `styles.css`, the ZenProvider
    props of the Studio's modes, the mobile modes of phone screens), the components with their purpose and the paths of
    their guideline and API docs, the text styles and token names the design writes, the prototype flow (each frame,
    each interaction and what it does in the code, what to wire), the data contract (the sample data's type) and
    accessibility (each frame's focus order with roles and names, and the guidelines' keyboard and accessibility notes).
  - The pictures match the canvas: measured on screens, a state variant and a Dialog overlay, under 0.1% of pixels
    differ. What a picture cannot draw (a video, a canvas) is listed in `handoff.md`.
- **Zen Studio photos, GĐ5 M4: upload your own (2026-10-07):**
  - Assets › Photos › **Upload** (or drop files on the panel): PNG, JPEG, WebP, GIF or SVG up to 5 MB each. Your photos
    are listed above the library's; click one to add it to a page you made, or drag it there. They stay in this
    browser and, when a folder is linked, in its `assets/` beside the pages. The same file uploaded twice is one photo.
  - With an Image of a page selected, a photo (yours or the library's) replaces its picture in one step.
  - The exports carry them: the React code imports them from `./assets`, the HTML and the pictures show them, the
    handoff zip holds the files. Import pages… now takes a handoff zip too: the page comes back with its photos.
  - A page whose photo this browser lacks (imported alone, from another browser) shows "Missing photo" in its place
    and names it in the status line: select the Image and pick another photo.
- **Zen Studio export, GĐ5 M5: Promote a page into the repo (2026-10-07):**
  - On the dev server, an admin's Export panel has **Promote to the repo**: the page becomes
    `src/templates/studio/<Name>Template.tsx` (one React component, `<Name>Template`), its photos beside it in
    `src/templates/studio/assets/` (library photos copied, uploaded ones sent from the browser). TypeScript and the usage
    and style harness run on it; the panel says what they found. No pull request is opened: `npm run ship` does that.
  - A template that exists and differs (edited in the repo) is replaced only on a second, explicit click (Replace
    `<Name>Template.tsx`). A build of the Studio (no dev server) does not offer Promote.
- **Zen Studio instance panel, GĐ4 M4: size and Detach (2026-10-07):**
  - **W / H for an instance** (Inspector › Layout › Size): Hug, Fill or a Fixed px, as in Figma. A component with its
    own size prop or `fullWidth` uses it; any other is wrapped in a Stack that it fills (`<Stack direction="row"
    fillChildren width="fill">`), as a drag of its handles on the canvas does. The instance stays selected, later
    sizes edit that Stack, Hug takes the Stack away again; one ⌘Z each.
  - That Stack follows its instance: the Layers show only the instance's row, and Remove, Duplicate, Move up / down
    and a drag take the Stack along.
  - **Detach on pages made in the Studio:** Badge, Tag, Card, ListItem, MetricCard, Metric and InlineMessage become Zen
    primitives there too (the recipes load the first time a page asks about Detach). EmptyState and DescriptionList are
    refused on a page, saying why: their layout needs an inline style, which pages do not take.
  - Fixed: the E2E row I-15 (Gap ⌫) no longer flakes.
- **Zen Studio: shared demo code can be restructured, after a question (2026-10-06, GĐ1 WP-B2):**
  - Removing, duplicating, moving, inserting, pasting, dragging or wrapping layers whose code lives in shared demo files
    (PlatformDemoActions.tsx, chatDemo.tsx, PlatformChat…) used to be greyed out ("shared beyond this example").
  - Now the Studio asks "Change shared code?", naming the files that use it, like Figma's "Edit main component".
    Cancel writes nothing; "Change everywhere" goes ahead, and later edits to that file don't ask again until the page
    reloads. Playground files stay out of reach.
  - Fixed: a quick second click right after an edit landed (Show effect, then Remove) could do nothing; the Inspector
    now plans it again from a fresh read.
- **Zen Studio: the Layout section works like Figma UI3 (2026-10-06, GĐ1 WP-D):** one control per idea, each change
  one undo step.
  - Direction is one switch: Vertical · Horizontal · Wrap (Wrap writes `direction="row"` and `wrap` together).
  - The alignment box draws the items as bars (a ghost on hover, the effective default when nothing is written). Auto
    (space between) turns it into three lanes; a stretched cross axis into three main-axis lanes. Keys: arrows, W/A/S/D
    to an edge, X for Auto, B for Text baseline, ⌫ to reset (never the layer).
  - Gap sits beside the box with an "Auto" choice; Cross axis is Position · Stretch · Text baseline.
  - Padding is one field for all sides, or Horizontal + Vertical (the square button switches); going back to all
    sides from different values shows "Mixed" and writes `padding` while removing the two axes.
  - Grid: Align cells, one gap or separate row and column gaps, Columns as Auto-fit · Count · Tracks (with a preview of
    the tracks), and per breakpoint for `columns={{ mobile, desktop }}`: only the chosen breakpoint's value changes.
  - A prop that does nothing where it is written (wrap in a vertical stack, a min column width next to Columns, …) shows
    a warning with Remove.
- **Zen Studio: spacing and radius fields read "md · 16" (2026-10-05, GĐ1 WP-D, ScaleField):** Gap, row and column
  gap, padding (all, horizontal, vertical) and corner radius name each token with what it measures where the layer
  renders, the same wording as the canvas spacing pills. An unset field shows what renders now in the placeholder tone
  (Horizontal padding follows Padding). ↑/↓ step the ladder and write once when the key is released, so holding a key
  is one undo step; ⌫ resets a written value instead of deleting the layer.
- **Zen Studio: constraint lines on the canvas (2026-10-05, GĐ1 WP-D, Figma constraints):** select a floating
  Stack, Grid or Box (`position="absolute"`) and the canvas shows dashed lines from the parent's padding edge to each
  pinned edge, with a pill beside each line ("right · sm · 12"). A centred axis gets a tick on the parent's centre
  line and a "center" pill, and the parent gets the dashed owner outline. Pills step aside for the name tag and the
  size pill.
- **TopNavigation: grouped trailing actions, any of them (2026-10-05):** each action takes `group?: string`; actions
  next to each other with the same group share one pill (Figma's Nav-Action with Trailing-Icon, iOS's paired bar
  buttons), drawn in the bar's action style: Tertiary, Liquid Glass on `liquid-glass`, Liquid Glass Black Overlay on the
  overlay types; the compact types keep their Flat actions apart (Figma's Icon-Flat has no trailing icon). A pill is one
  of the bar's three places (harness `top-navigation/max-three-trailing` counts places). `trailingGroup` (the first two)
  is deprecated; the chat header and examples use `group: "call"`. The playground gets a Grouped trailing toggle.
- **Zen Studio: drag trailing actions to reorder or group them (2026-10-05):** on the canvas (drag an action of the
  selected TopNavigation, or a selected action) and in the Slots list: onto another action's edge it moves there
  (joining the group it lands inside, leaving one it is dragged out of), onto its middle the two share one pill. The
  item panel and the Slots rows also group with the action before/after or take one out of its group (link buttons),
  and the item's Group field edits the name. New item ops `groupItem` / `ungroupItem`, `moveItem` `regroup`; a group
  left with one action loses its field. Restart the dev server to load them.
- **Zen Studio: Properties grouped like Figma (2026-10-05):** a component with Figma groups (TopNavigation first) shows
  its own properties and Figma's booleans (Top-Leading, Top-Heading-Text, Top-Trailing, Expand-Heading,
  Expand-Trailing, Control-Bar), then one group per nested layer (Top-Leading, Top-Heading-Text, Top-Trailing,
  Main-Heading-Text, Header-Trailing, Control-Bar) with its props, list items and nested instances (the Avatar in
  `leading` sits under Top-Leading). A layer whose boolean is off shows no group, and props that do nothing in the
  current state (Title label without a click handler) hide; Trailing group stays and warns instead. Switching a boolean on
  writes a starting value (a title, an action with a working handler, the Control-Slot picker); off removes it.
- **Zen Studio: data slots, TopNavigation Top-Trailing like Figma (2026-10-04):** Figma's Trailing-Slot holds Action
  instances, while the code takes `trailing={[{ icon, label, onClick }]}`. The Slots section now lists Top-Trailing,
  Header-Trailing (`largeTitleAction`) and Control-Slot (`controlBar`); actions are added (with a working toast
  handler), removed, duplicated and moved there. Selecting an action on the canvas shows it as Figma's nested instance
  in a slot: its icon, label, dot and disabled fields, Move up/down, Duplicate (⌘D) and Remove (⌫). Any other list prop
  written in place (Tabs/Segmented options, ActionBar actions…) gets Move up/down, Remove and "Add item" (a copy of the
  last, with a fresh id/value) in Properties. Example and template content only, like other slot edits.
- **Zen Studio: smaller value text (2026-10-04):** inspector fields and selects show their value in Body/Small/Medium (12px) instead of Body/Base/Medium; the fields keep the Small height.
- **Zen Studio: object and array props editable (2026-10-04):** props written as an object or a list of objects
  (TopNavigation `leading` / `trailing`, EmptyState and Dialog actions, Tabs/Segmented options, DescriptionList items…)
  no longer read "Bound to {…}": the Properties section shows one group per object (per list item, named by its label)
  with its booleans (dot, disabled), text, icon picker and enums from the prop's TypeScript type. Edits change only that
  field (new op `setField`). `node tools/studio/editability-audit.mjs` lists what the inspector still cannot edit.
- **Zen Studio: Ignore auto layout (2026-10-04):** the Design tab has a Position section (Figma UI3, above Layout):
  Align (6 buttons), measured X / Y and an Ignore auto layout toggle for any layer inside a layout. A Stack, Grid or Box
  floats on its own props (`position="absolute"`, `constraintX/Y`, `inset*`); any other layer or component floats in a
  Box around it, and turning it off takes that Box away again (new server op `unwrap`), so the code is what it was. On
  turning it on the layer keeps its place where the tokens allow: it spans → Left and right, centred → Center, else the
  nearer edge at the snapped Spacing/Padding offset (past 4xl it clamps and says so). Floating layers get Figma's
  constraint diagram (Shift+click for both edges), Horizontal / Vertical selects (Scale listed, disabled) and an offset
  row per pinned edge; dead constraints, ignored offsets and "pinned to an outer layer" show as notes. One write and
  one undo step per gesture.
- **Description List in Figma (2026-10-04):** the code-only DescriptionList now has a Figma component on the new page
  ❖ Description List (14857:3): `Description List` (14859:79180, Layout Inline/Stacked × Divider No/Yes, an Items slot)
  built from `.Primitives/Description-List/Item` (14859:78890, Layout × Emphasis × Divider = 8 variants; Term, Value, Action
  and Action Button props). Every gap, rule and text binds the same tokens as the code (Gap/XSmall 8px, Gap/Medium 16px,
  Padding/Small 12px, Divider Default/High, Body/Small/Regular, Body/Base/Medium, Body/Base/Bold); the copy action is a
  Button/Icon-Flat Small in a 20px wrapper so its icon meets the row's end edge.
- **DatePicker mobile primitives (2026-10-04):** `device="desktop" | "mobile"` on DatePicker, DatePickerItem and
  DatePickerHeader (Figma `.Primitives/Mobile-Date-Picker/Item` 9921:3283, Date-Picker/Mobile 9923:3576): days fill the
  width as squares (50×50 on a 390px phone) in Body/Base/Medium, the month and year in Heading/Subheading at the start
  with Back / Next at the end, Spacing/Gap/XLarge to the table (the dual calendar stacks its months Gap/Medium apart,
  Gap/XSmall under each header). Unset, an inline calendar follows the breakpoint (nearest `data-breakpoint`, else
  ZenProvider); a popover stays desktop. Playground: Device control.
- **Accordion `contentWidth` (2026-10-03):** `title` (default, Figma: the content stops before the chevron column) or
  `full` (the content also runs under the chevron, to the box padding / row end), for rows with end-aligned values such
  as a receipt. Figma Accordion/Text got the matching `Content Width=Title|Full` property the same day; the Accordion example "Mobile order summary" is rebuilt on it: folded, the total sits
  in the title; open, the cart rows (with their options), Subtotal, the points (positive) and Total, prices on one edge.
- **Zen Studio: marquee and several layers at once (2026-10-03):** dragging on empty canvas, a frame's background or
  the background of a layout that is not selected draws a marquee (Figma; pan with Space, the Hand tool or scrolling):
  it selects the layers it touches one level inside the deepest layer that holds it, ⌘ the deepest layers fully inside,
  ⇧ adds. With several layers selected, Delete and ⌘D remove / duplicate them all, ⌘C / ⌘X / ⌘V copy and paste them
  together, and layers of one component show their shared properties ("Mixed" where they differ) — each one edit and
  one undo step. Server op `many`; `pasteCode` takes several elements.
- **Zen Studio: Quick actions ⌘/ (2026-10-03):** search every Studio action by name (tools, edit, clipboard, wrap,
  detach, selection, zoom, panels, theme, pages) and run it with Enter; an action that cannot run now says why. The
  Keyboard shortcuts sheet lists the new keys (Tab/⇧Tab, ⇧Enter, ⌥ measure, text edit, arrows, drag, clipboard, ⌘/).
- **Zen Studio: Assets tab (2026-10-03):** the left panel's third tab lists the Zen components the Studio can add
  (the slot palette, by group, with search). Drag one onto the canvas: the insertion line shows where it lands, a
  playground or docs frame says why not; a click (or Enter) adds it into the selected layout, else right after the
  selected layer. Imports and an action's `useToast()` are added; one undo step; the new layer gets selected.
- **Zen Studio: drag and drop in Layers (2026-10-03):** drag a layer row: a line between rows shows where it lands
  (at that row's depth), the middle of a layout row puts it inside; ⌥ copies, Esc cancels, the list scrolls at its
  edges. Same rules and one undo step as dragging on the canvas.
- **Zen Studio: Tab / ⇧Enter navigation and ⌥ measure (2026-10-03):** Tab and ⇧Tab select the next / previous
  sibling layer (round its parent), ⇧Enter the parent (Figma). Hold ⌥ with a layer selected and point at another:
  red lines give the distances (inside edges when it holds the selection, else the gaps), with the Spacing token when
  the distance is that padding or gap ("8 · xs").
- **Zen Studio: copy, cut, paste (2026-10-03):** ⌘C copies the selected layer (its exact JSX, also as text for an
  editor), ⌘X cuts it, ⌘V pastes into the selected layout (Stack, Grid, Box, Card, Form parts) or right after the
  selected layer, ⇧⌘R pastes to replace it, ⌥⌘C / ⌥⌘V copy and paste its look (literal props the target takes). Code
  or plain text from elsewhere pastes too (text becomes a `<Text>`); Zen components join the imports; names that do not
  exist where it lands are refused. Same items at the top of the canvas menu. One undo step each; the pasted layer gets
  selected. Server: `GET /element` answers `range`, ops `moveTo { copy, replace }` and `pasteCode`.
- **Zen Studio: reorder by dragging and arrow keys (2026-10-03):** drag a layer: it follows the pointer, a blue line
  shows where it lands among the siblings of the container under the pointer (that container is outlined), drop moves
  it, ⌥ drops a copy, Esc cancels, the canvas pans at its edges. In the middle of a sibling layout (Stack, Grid, Box,
  Card, Form parts) it goes inside it. A press inside the selected layer drags that layer; a click still selects what
  is under the pointer. ←/↑ and →/↓ move the selected layer one place earlier or later. Layers move within their
  example; `.map` rows, condition branches, cloned children (Tooltip, FormField) and names that would not exist where
  it lands are refused with the reason. One undo step each. Server op `moveTo` (`tools/studio/arrange.mjs`).
- **Zen Studio: edit text on the canvas (2026-10-03):** double-click text (or Enter on a selected text layer) edits it in
  place, Figma-like: same font, size and colour over the text, the frame reflows as you type, Enter/Esc/click outside
  keep it, ⌘Z undoes it in one step, IME input (Vietnamese Telex) is safe. Works for a text child
  (`<Button>Save</Button>`) and a string prop (`<Checkbox label="…">`, `<ListItem title="…">`); text from data or
  playground state says where it comes from. Plan for the other phases:
  `docs/research/studio-figma-editing-plan-2026-10-03.md`.
- **Zen Studio: select several layers and wrap them in a new container (2026-10-03):** Shift+click on the canvas, or
  Shift/⌘+click in Layers, selects several layers; the Inspector then shows "N layers" with Wrap in container. ⇧A puts
  them in a Stack laid out as they render (Figma's Add auto layout: direction, a Spacing/Gap token, align), ⌥⌘G in a
  plain Box (Frame selection); both also work on one layer, from the canvas menu too. Layers of one parent only (others
  are told why); layers that are not next to each other move up into the container. One undo step, which selects the
  layers again. Example and template content only. Server op `wrap` + `with` (tools/studio/README.md).
- **Zen Studio slots (2026-10-03):** a component's Figma content slots (Card Content, Dialog Custom, ModalForm
  Main-Contents / Side-Content / Top, SidePanel, BottomSheet, Accordion, TabPanel, ChartCard, ListItem leading/trailing)
  are shown as slots: dashed outlines and a "+" on the canvas, a "slot" row in Layers, and a Slots section in the
  Inspector. In examples and templates, slot content can be added from an insert picker (preferred items first), removed
  (⌫), duplicated (⌘D), moved, reset to the saved file (Figma "Reset slot", with a Modified tag) or cleared ("Clear
  contents"); the main component is never touched and playground slots stay empty. Spec
  `docs/research/studio-slots-spec-2026-10-03.md`.
- **Figma position, effects and corners on the layout primitives (2026-10-03):** Stack, Grid and Box take
  `position="absolute"` (Figma "Ignore auto layout") with `constraintX` / `constraintY` and `insetTop/Right/Bottom/Left`
  on the padding tokens; Box takes `effectStyle` (the nine Figma Effect styles, drop shadows only on `surface="surface"`),
  `clip` (Clip content) and per-corner radius (`radiusTopLeft`…); Image takes the corner props. Token-only; unset props
  render nothing. Ten new usage rules plus `radius/full-mixed`, a style-guard raw-inset warning for examples and
  templates, runtime audits (shadow on Canvas/Alt, one elevation level per screen, per-corner concentric radius) and
  `npm run layout:selftest` in the gate. Spec `docs/research/studio-position-effects-radius-spec-2026-10-03.md`.
- **Figma-like sizing on the layout primitives (2026-10-03):** Stack, Grid and Box take `width` / `height` = `"hug"` · `"fill"` · a number (Fixed px), `minWidth` / `maxWidth` / `minHeight` / `maxHeight` and `alignSelf` (the child's alignment in its Stack or Grid); Stack takes `fillChildren`; Text and Heading take `width`, `minWidth`, `maxWidth` and `alignSelf`. Fill grows along the parent Stack's direction and stretches across it. Unset props render nothing, so existing pages are unchanged.
- **Zen Studio, the docs platform as a canvas tool (2026-10-02):** the default UI of the docs platform is now a
  FigJam-like canvas built with Zen (Neutral-S7 · Compact · Dashboard): Pages/Layers on the left, zoomable canvas with
  Playground, Examples and Docs frames at their real widths (desktop screens 1440px, no more squeezed playgrounds),
  Inspector on the right (Overviews, Installation and the Foundation pages stay normal scrolling pages). Admins click any element of a playground or example and edit its props (variants, spacing,
  alignment, text style, text) in the Inspector; the change is written to the source file at once (dev server only),
  the example's hand-written snippet follows, and ⌘Z/⇧⌘Z undo and redo. Playground properties move into the Inspector;
  the Code tab shows the real source git-style (line numbers, syntax colours, changed lines). ⌘/Ctrl-click selects a
  component's nested parts (SidebarItem, InputLabel…) read-only, with their props, text style, layout and colour tokens.
  Text style is editable on any text element (the typographyStyles import is added when missing), and the gap and
  padding of a selected Stack/Grid/Box/Form… are edited on the canvas: hover shows "gap · md · 16", click picks a step.
  Detach component (⌥⌘B, like Figma): a presentational instance (Card, ListItem, MetricCard, Metric, EmptyState,
  DescriptionList, InlineMessage, Badge, Tag) becomes Box/Stack/Text… in the source, marked `zen-detached`; in a list only
  the selected row; ⌘Z restores the component.
  Present (F) shows desktop examples full screen. Viewer role is read-only. `?ui=classic` opens the old docs (also what Playwright and the QA gate
  see); `tools/studio/` holds the dev-server plugin (`node tools/studio/selftest.mjs`).
- **Zen Studio drafts and Save (2026-10-03):** admin edits on the canvas are drafts on the dev server (every browser on
  it sees them, they survive a restart) until an admin saves: nothing reaches the disk before. Each frame with unsaved
  changes shows "● N changes · Discard · Save" in its frame toolbar and a dot on its name, and saves or discards only
  its own changes (with the imports they need; the other frames keep theirs). The toolbar has "Unsaved · N files" (the
  list, Discard per file, Discard all) and **Save all** (⌘S). Save writes atomically, merges a disk that changed
  meanwhile (a collision stays a draft) and runs style-guard + usage-guard on the saved files; a disk change made
  elsewhere now shows on top of a draft instead of being hidden by it. `npm run qa` warns when its browser checks
  render unsaved drafts.
- **Zen Studio: nested booleans work on elements that spread props (2026-10-04, user: "Các boolean trong nested vẫn không hoạt động"):** most example Avatars are written `<Avatar size="md" {...avatarOf(person)} />`, and Studio locked every prop not written out, so Status/Focus were greyed out in Nested instances and in Properties. A prop the spread does not feed (not among the props the element renders with) is now editable, booleans and every other kind (Avatar Background and Shape, a ListItem's Title lines). The new attribute is written in front of the first spread (`status {...avatarOf(person)}`), so a spread that feeds it still wins: Theme and Src under `{...avatarOf(person)}` and a playground's `Selected` stay read-only.
- **Zen Studio: editing a component playground no longer reloads the whole page (2026-10-04):** `PlatformExamples.tsx` exported an unused helper (`isPlatformComponentPage`), so it was no Fast Refresh boundary and every Studio edit there made Vite reload the page; the inspector jumped to the top after each toggle. The helper is removed and the playground now updates in place in about 0.5 s.
- **Zen Studio nested booleans, Figma-style (2026-10-03, user: "Các boolean của nested không hiển thị để sử dụng được trong studio"):**
  - A selected component lists **Nested instances** under Properties: each Zen component written in its props (the Avatar in a ListItem's leading, the Icon in a Button's startIcon) with its boolean props as toggles, written to that nested element's own line; the name selects it.
  - Double-click on a selected component goes into the nested instance under the cursor (editable), then into its read-only parts; a click on the selected nested instance keeps it even where the row's click target covers it.
  - Properties show the boolean HTML attributes a component inherits: Disabled (Button, IconButton, Chip, Tabs/Segmented/Pagination items…), Disabled · Required · Read-only (InputField, TextAreaField, Search), Disabled · Required (SelectField, Toggle).
- **Zen Studio Design tab, part 1 (2026-10-03):**
  - The header is a set of labelled rows:
    - Type: Zen component, Layout primitive, Local component or HTML element.
    - Docs: a link to the component's page.
    - Used in: file:line, which opens the Code tab, plus a copy button.
    - Repeats: "N× — edits apply to all N".
    - Detach instance: shown only for types the dev server can detach. A blocked Detach gives its reason in visible text.
  - Layout sits above Properties. Stack/Grid/Box/Text/Heading get a Size group (W/H Hug · Fill · Fixed, min/max, Align in parent, Children). Then come Properties and Slots/Children (add, remove, move). Remove sits under Detach.
  - align/justify show once, in the alignment grid plus Distribution and Cross axis.
  - Props get sentence-case labels; the prop name is in the tooltip.
  - Pages and Layers rows use Zen's list-row states: Neutral/Flat hover and pressed, Active/Neutral/Subtle selected with neutral text.
- **Zen Studio resize like Figma (2026-10-03):** a selected Box/Stack/Grid gets 8 handles (Text/Heading: width), a
  live size pill and Shift for 8 px steps; a drag writes Fixed, a double-click on a handle writes Hug, Escape cancels.
  A Zen component without a size prop is wrapped in a Stack it fills (later drags edit that Stack; undo of the wrap
  reselects the component); its own `width`/`height`/`fullWidth` props are used when it has them. Handles never go
  below what the component can render (a Button's label, a Badge's text), and are hidden with a reason where a resize
  would not show (an InputField's height) or would break the component (a Menu trigger, a Tooltip's child, FormActions
  Buttons, ChatMessage bodies, an AppShell sidebar: `src/platform/studio/cloning.json`). Dragging a frame's right edge
  sets a free preview width. The Inspector's Layout section has a Size group (W/H Hug · Fill · Fixed, min/max, Align
  in parent, Children: Own size | Fill equally). Layout CSS: a fillChildren Stack with `align="stretch"` fills its
  children across too, a column without its own height keeps children at their content height, and absolute layers
  are left out of flow sizing.
- **Zen Studio board keeps frames in place (2026-10-03):** like Figma, a frame never moves sideways or to another
  column when content changes or another frame is resized: a taller or shorter frame moves only the frames below it in
  its column, by exactly that much; a width override (preset or edge drag) moves nothing else (the frame may overlap
  its neighbour). The board opens exactly as before and keeps that opening across page switches and reloads. A
  selection that a relayout pushes off screen is brought back with the smallest pan.
- **Component Theme Neutral-S5, S6, S7 (2026-10-02, Figma export):** `componentTheme="neutral-s5"` fills inputs with
  Neutral/Subtle (no border or shadow; focused Neutral/Flat); `neutral-s6` is Neutral-S4 (outlined inputs) with filled
  Tertiary buttons and Secondary chips (Neutral/Subtle, no border or shadow); `neutral-s7` is S5 with a Neutral/Pale
  focused field. In ZenProvider, Storybook, the docs Component Theme chip and the native token packages.
- **Motion tokens (2026-10-01):** `--zen-motion-duration-xfast/fast/base/slow` (80/120/200/280ms), `--zen-motion-ease-
  standard/emphasized/exit/linear` and `--zen-motion-movement` now ship in `tokens.css` from a code-owned source,
  `tokens/source/motion.json` (Figma variables cannot hold easing curves; the Figma file mirrors the durations in a
  Motion collection). `motionTokens` and `motionRules` are exported from `src/tokens/generated.ts`, and Design Tokens has
  a Motion section. Rules: exit is one step shorter than enter; animate transform, opacity and colours, not layout.
- **EmptyState `compactTitle` (2026-10-01):** in a Card you title yourself, the title uses Body/Extra/Bold like inside a
  ChartCard, so it never outsizes the card title (also when the card title is an h2 in Subheading).
- Tooling: `tools/figma-kit/` finds changed Figma sets by hash through `use_figma`, fetches only changed variants and patches `docs/figma-contracts/` (`node tools/figma-kit/selftest.mjs`).
- **Language:** `<ZenProvider locale="vi">` translates every built-in label of every component (close/dismiss,
  pagination, search and pickers, rich-text toolbar, chat, uploads, screen-reader names) and date formats; built in:
  `en`, `vi`. `labels={{ … }}` overrides single strings; `useZenLabels()`, `useZenLocale()`, `zenLabels`.
- **One API vocabulary** (the names agents guess from Radix/MUI), with the old names kept as deprecated aliases:
  - `size` on every component takes the short scale (`xs sm md lg xl`) or the Figma spelling (`xsmall small medium
    large xlarge`); both render identically.
  - value controls: `value` / `defaultValue` / `onValueChange` (Tabs, Segmented, Rating, OpinionScale, NpsScale,
    Slider, ColorSelector; InputField, TextAreaField, SelectField and Search add `onValueChange(value)`).
  - boolean controls: `checked` / `defaultChecked` / `onCheckedChange` (Checkbox, RadioButton, Toggle).
  - selection: `selected` (Chip, Card).
  - icon props take an icon name (`icon="icon-plus-line"`) or a node (IconButton, Button, Tabs, Breadcrumbs, Sidebar,
    EmptyState, Stepper, SidePanel…).
  - `headingLevel` on EmptyState, Dialog/ModalForm and SidePanel; `EmptyStateAction.level`; SelectField
    `placeholder`; DatePicker `onOpenChange`; HTML attribute and `ref` pass-through on Table, Badge, Card, List,
    ListItem, EmptyState, Stepper.
- **Spellings from other libraries** are accepted (deprecated aliases unless noted; the harness warns apps):
  - overlays (Dialog, ModalForm, SidePanel, BottomSheet): `isOpen`, and `onClose` (not deprecated), called with every
    close request next to `onOpenChange(false)`. `open` is optional: a mounted overlay without it is shown, so
    `{show && <Dialog … />}` works.
  - Button `leftIcon` / `rightIcon`; Badge `color`; Toast, AlertBanner and InlineMessage
    `status="success | error | warning | info"` (→ positive, negative, warning, info).
  - icons that only come in sizes take their plain name too: `icon-search-line`, `icon-x-line`,
    `icon-chevron-left-line`, `icon-chevron-right-line` draw the Medium cut (valid `IconName`s; generated from the
    icon set, so new sized icons get one automatically).
- **Tooling for AI agents and editors:**
  - `npx zen-usage` — the usage harness for apps (checks only components imported from the package; `--json`).
  - `@zen/design-system/eslint` — the same rules in ESLint (`zen/usage`, `zen/usage-warn`; `configs.recommended`,
    `configs.standalone`).
  - `@zen/design-system/usage` — `checkSource()` for tools.
  - `zen-ds-mcp` — MCP server: setup, component docs, icon/token search, templates, `check_usage`,
    `map_figma_component` (Figma instance → Zen JSX).
  - `npx zen-ds init | doctor | check`.
- **Harness rules:** `icon/unknown-name` (suggests the closest real names, and knows other sets' words: close → x,
  gear → settings), `icon-button/needs-action`, `api/deprecated-prop`, `layout/use-stack` and `text/use-text` (the
  last three in apps only), `empty-state/way-out-tertiary`, `table/actions-flat`, `heading/h1-is-heading-1`; size
  rules read both spellings; in apps, raw elements next to Zen imports are checked too.
- **HeadingField `multiline`:** long titles wrap and the field grows with them (Figma Inputted-Multi-Line); Enter adds
  no line break and pasted line breaks become spaces. One line stays the default, for short names. HeadingField also
  reports `onValueChange(value)`.
- **Token modes from the 2026-09-28 Figma variables:** Component Theme `neutral-s4` (`componentTheme="neutral-s4"`) is
  Neutral-S1 with outlined inputs (Surface fill, Subtle border, no inner shadow), plus the token
  `Input/Border/Disabled` for a disabled field's border. Emphasis `light` (`emphasis="light"`)
  uses lighter weights (400–500) and 1px active strokes. Both are in the docs platform topbar and Storybook.
- **Docs platform:** Segmented has a phone example, "Period switch on a phone". Its four periods (This week · This
  month · This quarter · This year) are wider than the 390px screen, so the default Secondary Segmented keeps its full
  labels and scrolls sideways; an empty week shows an EmptyState. The page now has 4 examples, with states and mobile.
- **App Shell, the Figma HR-Platform pattern (◇ Master-Layout):**
  - Collapse to the icon rail from a toggle at the start of the top bar. It shows whenever the shell has a top bar
    (`sidebarToggle={false}` hides it); `sidebarCollapsed` / `defaultSidebarCollapsed` / `onSidebarCollapsedChange`
    hold the state. A Sidebar with its own `onCollapsedChange` keeps its header control instead.
  - `AppShellAction`: a top-bar icon action with an unread dot or count (99+), read out as “Notifications, 12 new”.
    `AppShellAccount`: the avatar button that opens the account Menu.
  - New slots:
    - `banner`: a full-width AlertBanner that stays in view.
    - `aside`: a docked SidePanel. It docks only while the page keeps at least 744px beside it; otherwise it opens as
      the modal panel.
    - `floatingAction`: one floating button bottom-right. The end of the page keeps room for it, so it never covers
      the last row.
  - `useAppShell()` gives your own controls the layout, the rail state and the drawer.
- **Docs platform:** the App Shell page has a new playground and 7 examples: HR workspace, Admin app, Collapsed rail,
  Drawer in a narrow shell, Banner, Flat canvas and Phone app. The four desktop templates use the new top bar:
  Breadcrumbs or a Search, notifications and the account menu.

### Fixed
- **Zen Studio small fixes (2026-10-07, backlog batch 5b):** Escape on several layers selects their common parent;
  a layer switch flips at once (optimistic) and a bound switch shows no control until the live props arrive; Assets
  "No components match" has Clear search; ⌘Z after a paste or an Assets insert returns to the layout it went into;
  hovering a selected nested instance under a row's click target no longer outlines the row; a Hug double-click on
  the only item of a px Grid column writes that column as `auto`; resize handles and spacing areas read the live props
  (a spread that does not set the prop leaves it editable); the tone picker captions what the harness would flag
  (Lights-group Light on text, Light titles, colour Light body copy); Detach says where a bare handler comes from and
  works on namespace JSX; the "applies to all N rows" note is a .map's only; Save all leaves the toolbar below 1024px
  (the drafts panel has it); the frame chrome lays out on the next frame after a size change.
- **Zen Studio decisions and multi-select (2026-10-07, backlog batch 5c):** a column with a minHeight sizes its Fill
  children into it; a dropdown Chip keeps its width handle; the Pages panel drops the description the board shows; a
  click on the Docs frame below 100% opens it at 100%, top-aligned; ⌘-click lands on a TopNavigation action, not its
  icon. The arrow keys move several selected layers of one parent together (they stay selected); ⇧-click in Layers
  selects the range of rows; Mixed properties edit text props on several layers.
- **Uploader error text in Light (2026-10-07):** the field's error help text and a file item's error line (icon and text) use Content/Negative/Light like every help text but Warning (Input already did); they were Negative/Strongest.
- **QA gate sees the example pages again (2026-10-07):** since the examples moved to `src/platform/examples/pages/<page>.tsx`, `npm run qa` mapped an edit there to no page and its example-coverage step (④) read no example list, so both passed without checking. Each page file (and its stylesheet) now scopes to its page, and step ④ reads the page's `examples` array.
- **Zen Studio quick fixes (2026-10-07, backlog batch 2):** the Inspector's Frames list names the open builder page's
  Screens after switching pages (two pages both have `screen-1`); the first view zooms down to 50% so the Playground
  clears the Inspector at 1024–1280 px; setting a prop after an attribute with a trailing `// comment` keeps the comment
  on its line; the Size row of Stack/Grid/Box is "Child size" (the Slots section keeps "Children"); public exports the
  props docs do not list (ZenPortal, PopoverBulkAction…) read as Zen components; truncated layer names in the Inspector
  header show the full name on hover; List `inset` loses its "Row inset" label (it is deprecated); the palette's
  second Metric is "Metric card"; switching a Figma list boolean off (Top-Trailing with two or more actions) removes the
  `useToast()` line those actions brought; moving an item past an identical one says the code stays the same instead of
  "No change"; a slot's + chip no longer covers the selection's size pill. The Studio selftest no longer breaks a
  parallel `tsc` (its samples are excluded) and runs the detach-type selftest.
- **Zen Studio: frames and examples keep up with edits (2026-10-07, backlog batch 5a):** a frame's Save and Discard
  take the edits to code it reads outside its JSX (sample data, a column const, a helper, a Zen component that keeps
  its source line off the DOM, a portalled overlay); an edit to an example page no longer restarts its examples (an
  opened chat thread stays open: example pages export their list through `keepOnHotUpdate`); a data edit still restarts
  its frame so new initial data shows. Effects gains Effect settings (the style's layers, read-only) and Card,
  MetricCard and ChartCard show the effect their theme draws. An unset object prop (EmptyState `secondaryAction`) gets
  a "+" that writes a starting object, a prop held by a same-file const (`options={views}`) edits that const field by
  field, and Toast's Figma Actions boolean is a switch.
- **Docs example fixes (2026-10-07, backlog batch 4):** the Visually Hidden playground shows the invoice table's Archive
  column (its stage widens for the table); AI Chat › "Assistant on a phone" names the screen with its bar title (h1);
  HR · Public holidays' "Holidays in …" is Heading/4 like the other HR sections; the Table playground's Progress column is
  Neutral with its % label (Figma Progress-Cell); the chat phones' thread header follows the scroll (its Pale rule once
  messages run under it); the Accordion playground has a Content width control (Title / Full).
- **Task priority flags use the Light icon colour (2026-10-06):** the HR Tasks flags (list, board, panel) take their
  family's Content Light (Urgent Negative, High Warning, Medium Info, Low Neutral) through Icon `tone`, instead of the
  Base text colour; Light is the icon level.
- **Zen Studio: resizing an item in a Grid column moves its neighbours (2026-10-06):** dragging the width of the only
  item of a Grid column the source sizes in px (`columns={{ desktop: "minmax(0, 320px) 1fr" }}`, `columns="320px 1fr"`)
  now resizes that column (one edit on the Grid, one ⌘Z) instead of wrapping the item in a fixed Stack, so the next
  column follows and the gap stays the gap. A Grid's canvas gaps are measured between its tracks (they used to span
  the free part of a cell and still read "gap · 12"); a px column wider than its only item shows that space as
  "column 1 · 80 free", and a click offers **Fit column to content**.
- **Emoji in secondary text keep full colour (2026-10-06):** colour emoji take the alpha of `color`, so an emoji inside
  Content/Neutral/Base or Light text (alpha) looked faded. HR Home's leave rows ("🤒 Sick leave · Sep 29 – Sep 30") and
  the HR phone app's Leave balance terms now put the emoji in its own `Text` span with tone `strongest` (opaque); the
  words keep their Base colour.
- **Sidebar rail keeps its mark centred (2026-10-06):** a collapsed Sidebar with a custom `brand` now shows
  `logoCollapsed` in its place; without it the rail keeps the brand's first element, centred, and hides the name
  visually (it used to sit 2–12px right of the items, the name bleeding in). HR module rails pass the workspace logo,
  so they match Home's 88px rail. HR Home's rail, opened from the top bar, shows the workspace header and a labelled
  Apps instead of an empty header and an icon-only footer.
- **Input label tooltip target (2026-10-05):** the info button beside a field label keeps its 12px icon but gets the
  invisible 24×24 hit area its label action already had (WCAG 2.5.8).
- **Table action cells are Medium (2026-10-05):** the docs' Table examples use 40px IconButtons in the Actions column, as
  Figma's Actions-Cell (Button/Icon-Flat Medium); the 48px selection column stays (user decision).
- **Backlog decisions of 2026-10-05:** Sidebar rows default to the Neutral theme at every level (Figma's default; a
  selected child is grey, `theme: "accent"` keeps the pink). QA: `npm run qa -- --isolated` runs the browser steps on a
  private dev server (no HMR from other sessions, no Studio drafts; also used when the shared server is down), and the
  post-edit hook warns when you edit a file another session touched in the last 30 minutes. Closed as already done:
  docs phones on Mobile tokens, Metric Title-Highlight, the dark alphas and Neutral Dark step 1 (in the 2026-10-03
  token sync); closed by decision: Motion, Avatar solid colours.
- **Backlog batch 6 (2026-10-05):** Chip takes `popoverPortal` (its menu opens in the overlay layer, anchored to the chip,
  so a sideways-scrolling row no longer clips it); PageHeader on a phone shows the description under the title and the
  actions after it; the docs platform has no import cycle left (PlatformExamples ↔ PlatformMobilePlaygrounds made hot
  updates reload the page). Checked, nothing to change in code: the Checkbox/Radio unchecked border is Figma's
  `Checkbox/Border/Default`; the Button page dialogs move and return focus correctly.
- **Backlog batches 4–5 (2026-10-05):** SelectField's trigger is named by its label and value ("Role, Editor"); a DateField
  calendar opens on the month of the date in the field, and with `datePickerActions` a pick waits for Submit (Cancel and
  Escape keep the old date); the DatePicker's time fields are Medium on a phone; a Menu that fits on neither side of its
  trigger shifts into the window (it ran off a 390px phone); a keyboard-opened Popover no longer scrolls the page (Sidebar
  › Switch workspace jumped); `DialogAction` takes `type="submit"` + `form`, so a SidePanel's Save submits the form in its
  body (Enter too); the docs' Inter has system fallbacks (no serif flash). Regression tests in
  `tests/interaction/input-popups.test.tsx`.
- **Backlog batches 1–3 (2026-10-05):** App Shell › Narrow window opens its navigation drawer again (three Studio-written
  props locked it closed); Sidebar is a `<nav>` landmark (was `<aside>`); a clickable ListItem says `aria-current="true"`
  when selected instead of `aria-pressed` on every row; the Zen wordmark in the Sidebar examples follows the theme (it was
  black on the dark Sidebar); docs list every DockIcon / Metric `iconTheme` hue (`scripts/build-api.mjs` now resolves
  spreads in `as const` arrays); AGENTS.consumer.md and the Bottom Sheet / Chip guidelines no longer contradict the house
  rules (fields have `disabled` again; a single choice in a sheet is List + ListItem).
- **Zen Studio: nested booleans work in real use (2026-10-05, user: "Các nested boolean vẫn k hoạt động"):**
  - A quick second toggle no longer snaps back: an edit refused because the Studio's own earlier write changed the file
    is moved onto that write and sent again; a queued click is planned from the element as the file holds it then.
  - The Nested instances list stays put after a write and follows its elements when a write adds a line; switching a
    boolean back (off, or on when its default is on) leaves the file as saved, with no leftover draft.
  - Nested instances are found from what the selection renders: JSX in a const, a helper, a local component, another file
    or a Table column's cell is listed (675 booleans were missing), with "Written in <file>:<line>" when it lives there.
  - A boolean bound to data (`status={one.online}`) has a switch showing what it renders; switching writes a fixed value
    (through `defaultX` for state props), and Restore puts the binding back. Bindings to state stay read-only.
  - TopNavigation's Figma group switches restore what the saved file had (an Avatar leading, the call actions) instead of
    a placeholder, and adding an item keeps the TopNavigation selected.
  - Editing a template or the App Shell page no longer reloads the whole Studio, and an example edit no longer re-runs
    the Studio panels (Fast Refresh boundaries; `appLayer/playgroundParts.tsx`).
- **Text / Heading `align="start"` (2026-10-05):** it now sets `text-align: start`. Before, it only wrote
  `data-align="start"`, which had no CSS, so a text inside a parent that centres its text stayed centred.
- **TopNavigation: notification dot placed as in Figma (2026-10-05, user report):** the action's Noti dot now sits 10px
  from the top and the end of the 44px button, on the icon's top-right corner (Figma Nav-Slot/Action 6085:44062, every
  style). Before, it was 6px in (Default, Glass) and 8px in (Flat). It uses the Navigation-Action icon padding tokens.
- **Toast stack motion and phone alignment (2026-10-04, user report):** a closing toast now fades in place first and
  only then its row closes (it was sliced by a clip that also cropped its shadow, and left an 8px jump); a new toast
  rises from the screen edge without covering its neighbours (top placements overlapped); each toast counts down from
  when it appears, so they leave one by one (every new or closed toast restarted all timers, so they vanished
  together). Every toast fills the stack width (Figma 648px; short ones hugged their text, so a stack had ragged edges
  and phones mixed widths); the layer keeps Margin/Comfortable and the safe area from the edges (was 16px sides, 20px
  bottom, and 12/20px for right placements on a phone). Stacks of sibling ZenProviders (each docs example card) share
  one layer per placement instead of overlapping.
- **AppShell in a zoomed preview (2026-10-04):** the shell measured its rendered size, which a CSS transform (the Zen
  Studio canvas below about 70% zoom) shrinks, so a 1440px frame switched to the drawer (menu button, no Sidebar) while
  Present showed the Sidebar. It now reads its layout size (also for the Sidebar, banner, floating action and docked
  panel offsets, and the top bar's fit check), so the canvas and Present match at every zoom.
- **DatePicker hover halos (2026-10-04, user report):** the view viewport clips only while days ⇄ Select-Month-Year
  switches (`data-switching`, ~280ms), so at rest the All day Checkbox's 8px hover halo and focus rings are no longer cut
  at its 4px inset.
- **Card Sub-Action = Figma (2026-10-04):** the Content slot keeps the full width and the Sub-Action is an absolute
  layer over the top-right corner that takes no room (Figma 6664:21686; the 28px reserve beside / above the content is
  gone). The default button is Button/Icon-Flat Small **Secondary** (Content/Neutral/Light) with ⋮
  `icon-dots-vertical-line` (Figma 1460:13), was Primary ⋯.
- **Card (2026-10-03):** `theme="shadow"` with `surface="alt"` no longer casts an outer shadow on Surface-Alt (renders
  as Figma Theme=Flat on Alt).
- **Chat (2026-10-03, user request):** `Bubble-Chat-Others-Business/Background/Default` now aliases Background/Surface/Default
  (was Popover/Default) in all nine Component Theme modes: Business "others" bubbles and cards are opaque white in Light
  and Dark/Gray/2 in Dark. Repo only; the live Figma file still has Popover.
- **Phone examples are centred (2026-10-03):** the device in a mobile example sat at the left of its stage at desktop widths (73 of 77 phones in the docs, 70 of 74 in Zen Studio); `.platform-phone-fit` now centres itself with auto inline margins in example stages, playgrounds, Studio frames and full screen.
- **Table pages span the page width (2026-10-03, user rule):** a page whose content is a non-widget Table now uses
  `<Container maxWidth="full">` instead of the default lg 1280 cap: 8 templates (Admin list, Empty and error states, HR
  My expenses, My leaves, Leave types, Public holidays, All tasks, Expense overview), the App Shell playground and 16
  example screens. At 1920/2560 the tables went from 1280 to 1612/2252 px. Widget tables (Dashboard, Detail) keep
  their card. Recorded in component-usage-rules §14, the Table guideline and Container's `maxWidth` doc.
- **Docs full screen no longer scrolls sideways** when a preview's root is a Container (its gutters overflowed by 48px).
- **Popover icons line up with their label on phones (2026-10-02, user report):** Icon and Photo-Small items keep the
  leading at the top, as Figma does, and now centre it on the label's first line. In the Mobile and Marketing type
  scales the Body/Base line is 24px around a 20px icon, so icons sat 2px above the text (the Chat hold menu, Menu,
  Select). The offset is computed from the tokens, `--zen-typography-line-height-body-base` and
  `--zen-element-size-popular-base`, so it is 2px at Compact and 0 at Comfortable; Dashboard is unchanged.
- **AiChatField and ChatComposer draw Figma's field stroke (2026-10-02):** the AI Chat-Field (Style=Default) and the
  Chat-Control message field now carry Input/Border/Default as a 1px inside stroke, so Component Theme S4 shows their
  Subtle border like Figma (clear in S1–S3); the AI field also takes Effect/Input's background blur. Focus is unchanged.
- **Gate: no more false "paints over the open popover" on chat (2026-10-02):** the smoke layer check sampled a popover
  position read before the pointer moved; chat demo timers re-pin threads mid-check and the popover rightly moves with
  its anchor. It now samples the popover where it is, so the chat and templates@390 HR · Home flakes stop; genuinely
  covered popovers still fail (`tools/platform-audit/audit.mjs`).
- **Popovers that fit on neither side of their anchor stay on screen (2026-10-02):** they shift into the viewport
  (8px margin) instead of running off it; the 310px chat Reaction-Bar was cut off on a 390px phone. Menus, Selects,
  Date Pickers and every other anchored surface that fits are placed exactly as before, and so is everything inside a
  transform-scaled frame (docs phone previews, the Studio canvas).
- **Chat threads keep the reader's place (2026-10-02):** a click, tap or Tab on an older message unpins the thread, so a
  new message or a call card changing no longer snaps it (and an open message menu) to the bottom. The hover
  Reaction-Bar focuses an emoji once when it opens instead of pulling focus back on every render. Sending your own
  message brings the thread back to it; older history loading, a removed message or an Undo keep your place.
- **Docs:** the page no longer jumps when a demo phone's chat re-pins (`.platform-phone` is out of scroll anchoring).
- **Gate smoke step:** the pointer stays inside the viewport, partly visible popovers are sampled on screen, chat
  hover toolbars open their menus reliably (with a bounded wait, so a full pass is as fast as before), a leftover Toast no
  longer hides a covered popover from the check, and `report.smokeStats` says how many popovers were sampled or skipped.
- **Docs topbar settings chips work again below 1024px (2026-10-01):** the chips sat in a horizontal scroll box, which
  clipped their menus, so Typography, Component Size, Theme, Radius and Emphasis could not be changed in narrow windows.
  The chips now get their own row and wrap; the light/dark toggle stays on the breadcrumb row.
- **Docs topbar stays one row on phones and tablets (2026-10-02, user approval):** below 1024px the settings chips sit
  in a row under the topbar that scrolls with the page; the sticky bar keeps only the menu, breadcrumbs and light/dark
  toggle (72px; the wrapped chips made it 216px at 390 and covered popovers). Full screen works again on screen
  examples whose card has focus.
- **Liquid Glass blurs again in the docs' phone frames (2026-10-01):** the frame clipped its header and footer with
  `clip-path`, which made them backdrop roots, so every `backdrop-filter` inside (glass pills and buttons, the progressive
  blur) saw only the bar and nothing behind it. The blur layers round their own corners instead. Apps: never put
  `clip-path`, `mask`, `filter` or `opacity` on an ancestor of a glass element inside the bar.
- **Popover and Menu stop jumping while the page scrolls (2026-09-30):** an open surface keeps the side it opened on
  (below or above the trigger) until that side would cut it off, instead of flipping back as soon as the other side
  fits, and it follows its trigger in the same frame (no lag inside a scrolling panel). Applies to Popover, Select,
  Chip, Date Picker, Table cell pickers, Chat reactors and Menu. SelectField gains optional `popoverOpen` /
  `onPopoverOpenChange` (as on Chip); a list opened from outside leaves focus where it is. The Popover playground
  opens by itself once its trigger is in view and stays open while you change its controls.
- **Screens name themselves with one h1 (2026-09-30):** the Empty & error states template has a page title (PageHeader
  "Projects", h1) with its Empty States one level below (h2, still Heading/4), and its not-found state reads "Project
  not found". Bottom Navigation "Floating + action" shows a compact TopNavigation with the tab name; "Glass over media"
  names its full-bleed screen with a visually hidden h1.
- Overlays (Dialog, ModalForm, SidePanel, BottomSheet) no longer move focus back to their first field when the parent
  re-renders with an inline `onOpenChange` handler: the focus trap re-ran on every render, so typing in a second
  field of a controlled form jumped to the first one.
- A Dialog whose primary action starts disabled (Send, waiting for a valid email) now moves focus inside, to the first
  control that can take it; focus used to stay on the opener.
- `zen-ds-mcp` rejects unknown, missing or mistyped arguments; a misspelt `check_usage` argument used to come back as
  an empty, clean-looking answer.
- Templates follow their guidelines: Sidebar `selectedId`, Search `onValueChange`, two-letter avatar initials, and an
  h1 on the mobile detail screen. Docs: `locale` really switches the built-in labels; ToastStack is only for hosts
  outside a ZenProvider.
- Toggle exposed its hidden checkbox next to the switch (axe nested-interactive); Popover and ChatReactorsPanel
  lists without accessible names; the rich-text ⌘K shortcut no longer depends on the English label; SelectField
  `onBlur` fires; a consumer `aria-describedby` on fields is merged, not overwritten; `useFormState` accepts
  `interface` value types.
- Button and IconButton match Figma at every size, including the Smooth/Standard/Luxury Corner Radius modes: the focus
  ring follows each size's Action/Focus radius (every size used Medium's); IconButton is a circle with a circular
  ring in every radius mode; Flat IconButton Secondary rests on Neutral/Light, and Danger/Positive stay Light on hover
  and turn Base when pressed.
- HeadingField reports its real height again (40/36/32 for H1–H3): the input's pad collapsed through the root and
  made the field report 16px taller.
- Docs platform: every icon-only button in the examples does something (27 had no action). Sidebar "+" actions create
  the team, teamspace, project or workspace and open it; Workspace settings opens its page (a menu in the playground);
  Share copies the link; toolbar Align left toggles and Insert link confirms; Duplicate confirms in its tooltip. The
  code samples show the same handlers.
- Keyboard focus stays visible. Popover options (Select, Menu, Chip lists) show the 3px Focus/Accent ring inside the
  row: on the selected option focus changed nothing, because Selected, Flat/Hover and Flat/Pressed are the same
  alpha. An invalid field keeps its Negative border and adds the 3px focus ring; it used to look exactly like its
  resting error state (WCAG 2.4.7).
- Chat (desktop): Escape in a React or More menu returns focus to the button that opened it. After one keyboard
  opening from the message, every later menu sent focus to the message. More opened with Enter on its button now
  takes focus, and Escape on the button of an open menu closes it.
- Docs platform examples no longer lock interactions: SidePanel "Docked inspector" Width steps with ↑/↓ and +/−;
  DatePicker "Birthday" pages through months; Button "Confirm a destructive action" Cancel closes the dialog (focus
  goes to "Delete project…"); Toast "Inline confirmations" Dismiss hides the toast ("Show message again") and Upgrade
  confirms.
- Docs platform: the 22 locked interactions that `interaction/no-noop-handler` and
  `interaction/controlled-needs-handler` listed now work (`usage:check`: 0 warnings). The code samples show the same
  handlers.
  - Button "Mobile footer CTA": the Deliver to, Arrives and Pay with rows open Action sheets that change the address,
    speed (and the total) or the card. "Save for later" confirms on its button.
  - Table "Invoices with pagination": the page-size Chip picks 5, 10 or 20 rows.
  - Chart "Budget allocation": the range regroups the budget by department, category or project.
  - Chart Card chevrons open a report Side Panel.
  - AI Chat "Long prompt" sends and answers (Stop works).
  - "Quick create": the bottom bar switches tabs.
  - List rows in the Sidebar, Search, mobile and playground examples select.
- Docs platform: actions passed with no handler at all now do something visible (96 found by the harness changes
  below; code samples show the handlers).
  - Phone Back buttons go up to a parent screen whose row comes back (focus moves to the new screen); Top Navigation
    New message, Upload, Share, Notifications and Settings open sheets; Like toggles; Close viewer goes to the album.
  - Share, Invite, New project, New task, Compose and Continue with email open a one-field dialog that confirms;
    Export and Duplicate confirm with a toast; Publish toggles; Sidebar footer items open their pages.
  - KPI ⋯ and "View failed payments" open the numbers in a report Side Panel; Table Edit changes a member's role;
    AI answers' Copy confirms in place; truncated names and annotation pins pin their tooltip on click.
  - Templates: Dashboard Export, New project and Notifications work; the Admin list and Detail sidebars select.
  - Playground actions show which handler ran under the preview.
- Top Navigation: a trailing action whose label changes (a count clearing, Like → Unlike) keeps keyboard focus; the
  actions were keyed by label, so the button was remounted.
- Figma details found while moving component CSS to tokens:
  - Rating emoji: Heading/4 in its 32px slot (was 24px).
  - Slider: the Medium thumb shadow is Shadow/Neutral/Strong (was Base).
  - Chat: the status line (time · Seen) is Gap/2XSmall (was 6px).
  - Avatar: focus rings take each size's radius, so they are right in the Luxury mode.
  - Color Selector swatches and the Dialog and SidePanel header icons grow in Comfortable, as in Figma.
  - DatePicker: range ends follow the radius mode.
  - Docs platform: the topbar chips use the Shadow/Action/Tertiary effect with its backdrop blur, and example gaps and
    paddings that were off the scale (6, 10 and 20px) snap to the nearest Gap or Padding token.
- Segmented no longer squeezes its labels into each other when its options are wider than the container. On a phone,
  Templates › "Empty & error states" read "404 No resultsFirst useLoad failed". It now scrolls sideways like Tabs:
  there is no scrollbar, the segments keep their width, and the selected segment scrolls into view. `fullWidth` still
  splits the width equally.
- Segmented now scrolls the selected segment fully into view inside a scaled container too, such as the docs
  platform's phone preview. The scroll used to stop short by the scale, so the last segment stayed a few pixels clipped.
- No more dead clicks in components: a Number-only Chip without `onClick` or `selected` is a static count; with
  `showActions`, DatePicker picks are a draft that Submit applies through the new `onApply(value, range)` and Cancel
  drops (`onCancel`; new `range` / `defaultRange`, harness `date-picker/actions-need-apply`); RichTextField keeps its
  own undo history, so Undo / Redo are disabled with nothing to undo or redo and never undo another field; the quote
  of a deleted Chat message is plain text.
- **AppShell:**
  - Clicking a Sidebar section title or its "+" no longer closes the navigation drawer; picking a page does, and
    focus moves to the page instead of back to the menu button.
  - The drawer always shows the whole Sidebar, never its rail or collapse control. It gains a Close button, the page
    behind it is inert, and it animates out.
  - The skip link no longer changes the URL, so hash routers keep working.
  - The sticky top bar no longer paints over the host page's own sticky header (the docs topbar showed it).
  - In a narrow frame the examples no longer squeeze the page to a few pixels next to the Sidebar.
- **DatePicker and Breadcrumbs re-read from the live Figma** (2026-09-29):
  - DatePicker days follow the Corner Radius mode: a selected day and the range ends use Corner-Radius/Action/Small, a
    rounded square in Smooth, Standard and Luxury (they were always circles). The In-Range strip rounds at
    Corner-Radius/XSmall where a week starts or ends, and hovering an in-range day lifts it on Inverse/Solid/Default.
  - `DatePickerItem size="sm"` renders Figma's 24px Small item on Corner-Radius/Action/XSmall (it stayed 32px).
  - The DatePicker month button turns Corner-Radius/Base on hover and focus and has no side padding; the month and
    year wheels have no corner radius and fade 1 / 0.25 / 0.1 (Figma changed this from 1 / 0.4 / 0.2).
  - Breadcrumbs are 20px tall, as in Figma (28px before: the list padded 4px above and below for the hover plate,
    which still bleeds outside the trail).

### Changed
- **Docs platform examples (2026-10-07, backlog batch 6b):** phone screens and playground stages paint Canvas/Default
  (§16; `PlatformPhone canvas="surface"` keeps a white screen); one-item Sidebar groups lose their title; HR · Home is
  full width like the other HR pages, and side content on full-width pages stops at 1440px; the phone templates sit
  two per row; the Badge and Button task tables fold the assignee into the task caption on a phone.
- **Component decisions of backlog batch 8 (2026-10-07, batch 6):** `TableMedia` defaults to `bold={false}` like every
  Figma media cell — **behaviour change**: pass `bold` to keep a bold label. PageHeader `headingLevel={2}` renders
  Heading/4 (the house ladder's h2). AiChatField (all styles) and the chat composer take the standard Input focus ring.
  On phones a BottomSheet pads 20px at the sides, a Medium Card takes radius XLarge, and AppShell's `floatingAction`
  hides while the page scrolls down. A Sidebar with a custom `brand` keeps its collapse control. A flat Secondary
  IconButton no longer trips `button/secondary-justified` (the Card Sub-Action ⋮ in the examples uses it). Text
  guideline: wrap a colour emoji in an opaque span inside light text.
- **Zen Studio toolbar without dividers (2026-10-06):** the vertical rules between the toolbar groups (brand · tools,
  theme · undo/redo, before Drafts) are gone; groups are told apart by space instead (4px inside a group, 8px between).
- **Zen Studio canvas chrome placed as in Figma (2026-10-06):** the Select · Hand · Interact tools left the top toolbar
  for a floating pill at the bottom centre of the canvas; the zoom pill moved to the top-right corner and keeps only
  the percentage and its menu (zoom in/out and fit are in the menu and on their keys); the mode hint became one "?" icon bottom-right whose tooltip gives the current tool's hint (a
  click opens Keyboard shortcuts). The pills sit above the overlays an example opens, so an open Dialog never covers
  the Select tool.
- **Sidebar groups never sit apart without a title (2026-10-06, user):** the Dashboard, Detail and Empty & error
  templates had Settings alone in an untitled second group, which read as an empty gap; it now ends the main list. HR ·
  Home's rail titles its second group "Modules", seen when the phone drawer shows it expanded.
- **Zen Studio: the Design panel reads like Figma / Lunagraph (2026-10-06, user):** one text size (Body/Small, 12px) for
  every line of the Inspector; every control shows at once — a value bound to code shows what it renders in its control,
  with a ƒ after the label (the tooltip names the expression), and an edit sets a fixed value (↺ restores the binding) or
  edits its data, while a state-bound value stays read-only in a field's frame; no more "Bound to {…}" + "Set fixed value"
  + caption lines. Properties without Figma groups split into Appearance · Content · Icon · State · Actions sections with
  a divider between them (an object prop such as Trend gets its own); the header is one row (name, ×N, Detach and Remove
  icons) plus the kind, Docs and the file. The Design · Code and Pages · Layers · Assets tabs are Figma-style text tabs on
  a quiet fill. Controls keep their 32px height. Spec: `docs/research/studio-design-panel-ui3-2026-10-06.md`.
- **Sidebar/Default-Width 240 / 260 (2026-10-06, user):** the token is 240px in Compact and 260px in Comfortable (was
  260 / 280), set in `tokens/source/figma/component-size.json`; Sidebar's fallbacks follow. The docs platform no longer
  pins its own 260px rail (classic `.official-platform` and the Studio board), so the docs nav and every Sidebar in the
  playgrounds, examples, templates and Present take the token as the density mode resolves it. The live Figma file still
  has 260 / 280: update the variable there, or a future variables sync brings the old values back.
- **One mood for every example: Canvas/Default + flat Surface/Default (2026-10-06, user rule, usage rules §16):** the
  example stage (desktop `screen` cards too) paints Canvas/Default instead of a Neutral/Pale tint, and boxes on it are
  Surface/Default with no border and no shadow: Card and MetricCard `theme="flat"`, ChartCard without
  `theme="border"`, ListBox, the Search split view without its Pale border, the Segmented file box (was Pale); the typography hierarchy's outline and
  page cards follow. 81 render and `code` lines changed in 27 example pages, so the code people and AI copy matches
  what the example shows; the list Cards on menu, text and visually-hidden screens became ListBoxes. Kept on purpose
  (a condition picks them): cards in phones, in AppShells, clickable and choice cards, the selected card; the two
  clickable cards that rendered Flat (Card › Browse projects, Dock Icon › Choose a project type) are Border again, as
  their code showed, since Flat has no hover state. The rule is
  in the usage rules, the example brief, `example-patterns.md`, the `zen-component-usage` skill, `AGENTS.consumer.md`
  and the Card / Background layers guidelines.
- **DescriptionList row actions take room only in their own row (2026-10-06, user: "lúc có icon copy lúc không… layout
  lệch", researched against iOS):** a row without an action now keeps its value on the list's end edge; a row with one
  puts it Gap/XSmall (8px) after its own value, its icon on the same edge. Before, one action gave every row an empty
  action column, so Type and Host in "Verify a domain" stopped short of the edge, under an empty gap. This is how an iOS value cell
  lays out an accessory (the content shrinks only in that row) and how Figma's Item (Content · Action) already did; lists
  where every row has the same action (Copy payment details) look the same as before. Guideline updated: mixing rows
  with and without an action is fine, except amounts that add up to a total.
- **Phone examples always in the phone modes; Present changes modes on its own (2026-10-06, user rule):** every phone
  frame (`PlatformPhone`: mobile examples, phone playgrounds) renders at Component size Comfortable as well as Typography
  Mobile, what a phone app sets (`<ZenProvider typography="mobile" density="comfortable">`), whatever the docs chips or the
  Studio canvas modes say (Button/Small 32 → 40, Avatar/Medium 40 → 48 inside the phone). In Zen Studio's Present, the
  Modes panel now sets the presented screen's own modes ("this presentation only"): a phone screen opens in Comfortable +
  Mobile, a desktop one in the canvas modes; picks hold while ‹ › step between examples, end with Present and never
  change the canvas. Light/dark stays the Studio's.
- **List Box `theme` (2026-10-06, user):** `<ListBox theme="flat" | "shadow" | "pale" | "border">`, the elevation of
  Card's Figma Theme (same tokens; no Semi-Pale), default `flat`. Examples and templates pick it by usage rules §16:
  flat on Canvas/Default and on Surface-Alt phone screens, shadow beside a default Sidebar (elevation follows the
  Sidebar), border on a white page or phone and inside another Surface. Exported `listBoxThemes` / `ListBoxTheme`;
  stories in `ListBox.stories.tsx`. Figma's Component/List-Box has no Theme property yet.
- **List Box only for List-Item rows (2026-10-06, user rule):** in the examples, templates and the List Item
  playground, a container whose content is a list of List-Item rows (with an optional title, search or filters above
  and buttons or pagination below) is now a `<ListBox header footer>` instead of a Card; everything else (Description
  List, toggles, forms, Tabs, Stepper, tables) stays in a Card. The phone Details and settings blocks that held a
  Description List or Toggles in a ListBox went back to `Card theme="flat"`.
- **List Box, a new component (2026-10-06, Figma Component/List-Box 14922:75297):** `<ListBox header footer>` is the
  white box of rows, the same on every device — only the tokens change by mode: Surface/Default, Corner-Radius/2XLarge,
  Header-Slot · Body-Slot · Footer-Slot padded Card-padding-medium sideways (24px desktop, 20px tablet and mobile); the
  header pads it on top and 8px below, the footer on every side, the body List-Container-Vertical-Padding above and below
  (12px desktop, 8px tablet and mobile) with rows Gap/3XSmall (2px) apart. Grouped lists and boxes of rows in the examples
  use it instead of a Box padded by hand. Zen Studio knows its three slots (Header/Footer toggles as in Figma) and the List
  Item's Contents slot; the insert palette offers "List box".
- **List Item follows the latest Figma (2026-10-06, List-Item 4080:11700):** one set for every device (no Device
  variant). Every row, with or without `onClick`/`href`, pads Padding/Small (12px) above and below and nothing at the
  sides (clickable rows padded 12px × Margin-Comfortable since 2026-10-03); the container insets the List sideways. A
  clickable row's hover/pressed/selected fill covers the row's height and hangs 12px past it sideways, with corners
  `Interactive-List-Item-Radius` (Corner-Radius/Base 12px desktop, Large 16px tablet and mobile). A List spaces every row
  Gap/3XSmall (2px), static and clickable alike; title and caption sit Gap/3XSmall apart (Info-Content).
  `--zen-list-bleed` is gone; `List inset` stays deprecated. Phone lists sit in the screen margin (`Box paddingX="lg"
  paddingY="xs"`); Zen Studio Detach gives a row `paddingY sm`. (Two intermediate syncs on 2026-10-05/06 were replaced.)
- **Breakpoint & Grids tokens:** `Interactive-List-Item-Radius` and `List-Container-Vertical-Padding` added from the
  live file (2,201 variables).
- **List Item examples in Figma (2026-10-06):** the ❖ List-Item page has an Examples section (five platform examples
  rebuilt from List-Item, List-Box, Card, Avatar, Dock-Icon, Badge, Button, Search, Chip, Description List and
  Top-Navigation instances, with variables and text styles; the phone screen uses Breakpoint & Grids › Mobile).
- **Mint ramp re-synced (2026-10-05 evening export):** 46 Mint and Mint-Alpha values, Light and Dark (Mint/9 #04CDA1 →
  #40E7AD in both, Light/Mint/11 #006C55 → #007455, Dark/Mint/11 #00CDA3 → #3CE7AF), matching the live file. Before
  this sync no component used Mint, so only the new Sky/Mint themes show it.
- **Placeholder text one step stronger (2026-10-05):** Color/Content/Placeholder now uses Neutral-Alpha/9 in Light and
  Dark (was step 8, the same as Disabled), as in the live Figma file. On Surface: Light 1.92 → 3.32:1, Dark 3.39 →
  5.48:1, so Dark field placeholders pass 4.5:1 (AiChatField and InputContent leave the Dark axe baseline). The overlay
  placeholders follow (On-White-Overlay → Light/Neutral-Alpha/9, On-Black-Overlay → Dark/Neutral-Alpha/9, both modes;
  user, the same day); Disabled stays at step 8.
- **Global Colors re-synced (2026-10-05 Figma export):** 235 values in six ramps and their Alpha twins, Light and Dark:
  Cyan, Grass, Blue and Bronze (steps 2–12), Orange and Zen (most steps); no token added, removed or renamed. Step 9
  moves in all six (Blue/9 #0F73FF, Cyan/9 #12A2CE, Grass/9 #3A9C4C, Orange/9 #E37A02, Bronze/9 #D76F37, Zen/9
  #FF6BD5), so Accent (Zen), Positive (Grass), Info (Blue) and the Support fills of these ramps shift; Zen hover
  (step 10) sits closer to the solid.
- **Chat composer radius (2026-10-05):** the message field uses Corner-Radius/2XLarge (24px in Rounded) instead of a raw
  20px and follows the radius mode; one line stays a pill, a multi-line field gets 24px corners.
- **Zen Studio: variant and boolean edits keep the component's behaviour (2026-10-05):** a prop bound to state
  (`checked={agree}` with `useState(false)` in the component) now shows that initial state and edits the useState
  literal (server op `setStateInit`, the example snippet follows) instead of reading "Bound to {agree}"; the component
  keeps toggling. A state prop with a `defaultX` twin (Checkbox/Toggle checked, Tabs/Segmented/Slider value, Accordion
  expanded, Menu open … 20 in all) that the source does not control writes the twin, and a locking literal `checked`
  moves to `defaultChecked`; the twin has no row of its own. A boolean switched off is removed unless its default is
  true (`collapsed={false}` used to stop TopNavigation's scroll-linked fold). The frame remounts once the hot update
  lands, so an initial-state edit shows on the canvas (`studio/inspector/writePlan.ts`, `studio/board/remount.ts`).
- **TopNavigation: up to three actions per Trailing-Slot, like Figma (2026-10-05):** Figma's Trailing-Slot
  (`.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571) takes 3 in Top-Trailing and Header-Trailing. The bar now
  draws three `trailing` actions (two before), and `largeTitleAction` takes one action or a list of up to three; a
  folded root draws three in all. `trailingGroup` keeps its two-half pill. The bar's sides never shrink below their
  actions, so a long title ellipsizes instead of running under three Tertiary actions (centred as before while both
  sides fit). Harness `top-navigation/max-two-trailing` → `top-navigation/max-three-trailing` (same allow key
  `nav-trailing`; also warns past three large-title actions). Rule R9 and the guideline say three.
- **Zen Studio: TopNavigation slots re-read from Figma (2026-10-05):** the three Figma slots (Control-Slot,
  Top-Trailing, Header-Trailing) were already in the Studio; Top-Trailing and Header-Trailing now take three actions,
  Header-Trailing as a list (adding beside one `largeTitleAction={{ … }}` turns it into an array; data-slot form
  `list`, server op flag `list`). The empty Control-Slot's ghost sits just below the header, with its tag under it,
  instead of covering the large title. Figma: Trailing-Slot's preferred instances now point at Nav-Slot/Action
  (6340:42675); the seven old ones pointed outside the file.
- **Zen Studio code view names its language (2026-10-04):** every code view header (Snippet, Source, wide view) shows a
  language Badge (xs, neutral subtle): "React · TSX" for TSX, then TypeScript, CSS, JSON, Shell. It used to be a grey
  "TSX" caption that read like a title.
- **Zen Studio empty states show the illustration (2026-10-04):** the Code tab with nothing selected, Layers on a page
  without layers, and the Pages and Assets searches with no match use the Empty-State placeholder illustration (Figma
  6085:25816, 240px) with their own centre icon (code, layers, search) instead of `illustration={false}`.
- **DescriptionList actions keep one end edge (2026-10-04):** a row action sits Gap/XSmall (8px) after its value and a
  Flat icon action lines its icon, not its 32px box, up with the list's end edge (it overhangs by its own padding).
  Examples: Copy payment details gives every row its Copy action; Invoice total shows the discount as a removable Badge
  beside its term, so every amount, the total and Send invoice share one edge. Input help text keeps its icon on the
  first line when the message wraps.
- **Zen Studio: slots take every component, rules warn instead of hiding (2026-10-04, user):** the insert picker and the
  Assets tab offer every DS component (73 items in 11 groups: Navigation, Charts, Overlays, Page and Chat are new).
  Overlays come with the Button that opens them, controlled components with their state: the server adds
  `const [x, setX] = useState(…)` under a fresh name and imports useState. An item that goes against the host's rules
  (a control inside a clickable card, a card in a card…) is listed under "Not recommended here" with its reason and
  still inserts; the usage harness reports it at Save.
- **Zen Studio: the add-to-slot "+" is Accent (2026-10-04, user):** the canvas chip is Button/Icon-Main XSmall
  Accent and the Inspector Slots add button Icon-Flat XSmall Accent, so adding to a slot stands out.
- **Chip levels follow the selection mode (2026-10-04, user rule):** a multi-select group of Normal chips is Secondary
  for every chip (Selected = 2px dark outline), a single-select group Primary for every chip (Selected = dark fill); no
  example switches a chip's level on selection any more (Chip, Empty State, Avatar, Rating = Secondary; Segmented, Badge,
  Mobile list, HR Home, app-layer single filters = Primary). Chip › Weekly digest keeps its chips in their own Stack at
  Spacing/Gap/XSmall (8px) instead of the fieldset's gap.
- **List group headers (kickers) take the Light tone (2026-10-04, user decision):** Body/Small/Bold group headers move
  from Content/Neutral/Base to Content/Neutral/Light (3.7:1 on Surface and Surface-Alt, above Apple's 3:1 for bold
  text; about 7:1 in dark mode). 80 kickers in examples, templates and the app layer follow; `heading/title-not-light`
  lets a Body/Small/Bold heading take Light and the audit's kicker check now expects Light.
- **Card Sub-Action no longer insets the whole content (2026-10-04):** as in Figma (6643:51021) the Content slot keeps
  the full width; only the first row (the content's first child, or the first child of a Stack wrapping it) keeps clear
  of the action, so a DescriptionList or footer button under it reaches the card padding.
- **Segmented icon-only segments centre their icon (2026-10-04):** a segment with `label: ""` rendered an empty label
  box that pushed its icon off centre (Zen Studio's Direction control); an empty label now renders nothing, like `null`.
- **Zen Studio tone control shows the colour (2026-10-04):** a `tone` prop (Text, Heading, Link) is a select whose
  trigger and options lead with a swatch of the tone's Color/Content colour and name the token
  (Content/Neutral/Base…); the primary/secondary/tertiary aliases are listed only when the source uses one.
- **List Item follows Figma Interactive=Yes/No (2026-10-03, List-Item 4080:11700, List-Item-Example 14730:76349):**
  a row with `onClick` or `href` is Interactive=Yes: padding Spacing/Padding/Small (12px) × Margin-Comfortable, which
  follows Figma's Device variant (Device=Desktop Spacing/Padding/XLarge 24px, Device=Mobile Margin-Comfortable in Mobile
  mode 20px; in code by data-breakpoint, tablet 24px), and the hover/pressed/selected fill 12px outside the row content
  (12px from the row edge on desktop, 8px on phones) with Corner-Radius/Base (12px; was Large 16px). A row without either is Interactive=No: padding 0, no states; the container insets it.
  `List` spaces interactive rows Gap/3XSmall (2px) and static rows Gap/Medium (16px); a static row in a list of interactive rows takes
  their box. Containers no longer zero the row padding: a list of interactive rows inside a Card, Modal, Side Panel,
  Bottom Sheet, padded Stack/Box or Container gutter runs to the container's edge (`--zen-list-bleed`), so the rows' own
  padding lines them up with the Card/Modal padding (24px desktop · 20px mobile). `List inset` is deprecated (still works). Every example, template and app-layer list was
  refactored to the component's own spacing and the right case; grouped blocks of interactive rows on phones are
  `Box radius="xl" paddingY="xs"` (20px radius, 8px padding; kicker `paddingX="lg"` 20px), list cards pad
  Margin-Comfortable − Padding/Small above and below with a radius of Base + that gap (concentric on every device). The List Item playground has an Interactive toggle.
- **Zen Studio Detach of a List Item follows Interactive=No (2026-10-03):** a detached static row gets no `paddingX`/
  `paddingY` (it was always Padding/Small × the list inset), except next to clickable rows in its List, where it keeps
  their 12 × 24 box (or the deprecated `inset`, inherited from an outer List too). Cards and padded containers no longer
  zero the inset, and padding the Studio measured as none is left out instead of written as `"none"`. When the file cannot
  show whether the List has clickable rows, the measured padding decides and the approximations say so.
- **Input and Search focus borders from Component Theme (2026-10-03, Component Theme.json):** two new tokens.
  `Input/Border/Focus` (`--zen-input-border-focus`) is the Focused/Typing border of every field (Text, Select, Date, Number,
  Text-Area, Rich-Text, Search): Color/Focus/Neutral/Solid as before, Focus/Neutral/Subtle in Neutral-S7.
  `Input/Border/Popover-Search` (`--zen-input-border-popover-search`) is the Focused/Typing border of Search `variant="popover"`
  (the search row of Popover, SelectField `popoverSearch` and AutocompleteField): transparent, Focus/Neutral/Subtle in Neutral-S7 (Neutral-S4/S6 lose the Subtle border while focused). Search/Popover Hover now
  uses Field-Only's 2px Input/Border/Hover (was 1px), as in the live Figma file. Component Theme has 115 variables, the repo 2,179.
- **Neutral-S7 field focus is Solid (2026-10-03 evening, Component Theme.json, mode Neutral - S7):** `Input/Border/Focus`
  now aliases Color/Focus/Neutral/Solid in Neutral-S7 too (was Focus/Neutral/Subtle), so a focused Text, Select, Date,
  Number, Text-Area, Rich-Text or Search field shows the same solid border in all nine Component Themes. Search
  `variant="popover"` keeps Input/Border/Popover-Search (Subtle in Neutral-S7). Search re-checked against the live file:
  no other change.
- **Zen Studio code view names its language (2026-10-03, user: "Bổ sung tên cho ngôn ngữ ở code view"):** a code view
  with a file title (the Code tab's Source) now shows the language ("TSX", "TypeScript", "CSS", "JSON", "Shell") after the
  path and line range, in Caption/Medium Content/Neutral/Base, also while the file loads; untitled views keep the language as
  their title.
- **AI Chat field radius follows density (2026-10-02, Component Size.json):** new token `AI-Chat/Field/Corner-Radius`
  (`--zen-ai-chat-field-corner-radius`: Compact = Corner-Radius/Giant, Comfortable = Corner-Radius/XGiant). `.zen-ai-field`
  uses it instead of the fixed Giant, so the field stays concentric with its 40/48px buttons (Rounded: 32 → 36px in
  Comfortable). Component Size has 195 variables, the repo 2,177.
- **App-layer examples rebuilt (2026-10-02, user: "làm luôn"):** action-bar, app-shell, description-list, form,
  image, layout, link, menu, page-header, side-panel, text and visually-hidden now have their own example files
  (`src/platform/examples/pages/<page>.tsx`, 4–7 examples each).
  - They are built to the example brief, in the same Đìzai Studio world as the 43 component pages.
  - They follow the spacing ladder, one style per job, the phone rules and §15 grouped lists.
  - Every control works, and focus never drops to the page after an action.
  - Process: 4 builders of 3 pages each, an independent UX review per batch (2 P1, 25 P2, 33 P3), two fix rounds and
    a verify pass.
  - Shared or component findings went to the BACKLOG, for example the platform's Full screen rule and PageHeader on
    phones.
- **App layer, templates and playgrounds follow the spacing ladder (2026-10-02, user request):** every gap a page picks
  is one of 2xs · xs · sm · md · lg · xl (usage rules §13).
  - Two lines of one item (name + meta, count + total, file + size) are `2xs`; a section or card heading with its
    description is `xs`. Both were `3xs` (2px) in 18 places.
  - HR Home's page stack is `xl` with `sm` block padding like the other HR pages (it was `3xl`).
  - Playground property rows are `md` apart, the step for stacked fields (they were 4px).
- **Every component and mobile example rebuilt (2026-09-30 → 10-02):** all 43 component and mobile pages have new
  examples (one file per page, `src/platform/examples/pages/<page>.tsx`, found by `examples/registry.ts`) set in one
  believable world (Đìzai Studio, shared data and formatters in `examples/data.ts`), built from a brief
  (`docs/research/example-rebuild-brief-2026-09-30.md`), reviewed, polished and given a final six-criteria check
  (aesthetics, layer elevation, one style, one behaviour, clear context, complete interaction). New house rules from
  the user: one spacing ladder by relationship (usage rules §13), a Table that is not a widget has no container (§14),
  page-like desktop examples take a whole row, Medium sizes by default (Chip now defaults to Medium), phone screens
  follow the Top Navigation rules (scroll-linked large titles, long-enough lists). App-layer pages come next.
- **Grouped lists read as groups (2026-10-02, user report on the Toggle settings phone):** settings, profile and
  checkout groups on a phone are inset grouped: a Surface-Alt screen, one white block per group, the kicker above the
  block aligned with its rows (usage rules §15). Applied to the phone examples of Toggle, Avatar, Bottom Navigation,
  Chart, Date Picker, Dialog, Inline Message, Input, List Item and Stepper.
- **Docs phones preview real phone tokens:** `PlatformPhone` sets `data-breakpoint="mobile"` (margins 20/16 inside
  phones); examples keep the default insets.
- **Approved backlog fixes (2026-10-02):**
  - Toast: an action (Undo, View…) dismisses its toast after running (`keepOpen: true` opts out).
  - Search: the clear button returns focus to the field; `filterHasPopup` / `filterExpanded` describe a filter that
    opens a panel; the filter icon has a 24×24 hit area. Chip: a count is named "Filters, 2 applied", not "Filters2".
    Segmented: icon-only options show their name tooltip.
  - Avatar: an initials Avatar with `alt` is named; harness `avatar/solid-initials-contrast` warns about white initials
    on solid green, teal, orange or cyan. Badge `removeLabel`; a pressed Tag looks selected; Link `as="button"` looks
    like a link.
  - Dialog/ModalForm/BottomSheet: initial focus lands on a SelectField or the checked radio; ModalForm is noValidate
    and announces "N fields need attention"; the mobile Dialog keeps 20px side margins and clears the safe area; a
    form sheet focuses its first field or Search.
  - DateField is an APG date-picker combobox (`role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`) whose
    calendar opens on user focus only, and ArrowDown opens it with focus on the selected day (else today); an inline DatePicker is a group with `aria-current="date"` on today; AutocompleteField and Uploader
    move focus to the next item after a removal; Popover's Escape no longer reaches a parent overlay.
  - Breadcrumbs "…" keeps focus on the first revealed crumb; collapsed Sidebar footer buttons keep a name and tooltip;
    a vertical Stepper starts at its first marker; ListItem `titleLines={2}`; Bottom Navigation idle labels are
    Content/Neutral/Light on Default and Floating (user decision).
  - Chat: Reply focuses the composer, initials avatars show two letters, threads pin after web fonts load, call and
    file cards hug their text; Accordion Divider rows are fully clickable; OpinionScale labels never wrap to three
    lines; NpsScale falls back below 264px.
  - Example cards follow the docs breakpoint (they no longer force desktop), so examples reflow on a phone.
- **Component fixes approved with the examples pass (2026-10-01):**
  - Escape closes only the innermost popup: an open Select list, date picker, picker, Menu or Popover inside a Dialog,
    ModalForm, Side Panel or Bottom Sheet closes first, the next Escape closes the modal; with stacked modals only the
    top one answers.
  - ModalForm: a blocked submit focuses the first invalid field (`onSubmit` may return a promise). Dialog and ModalForm
    open inside the nearest device frame (`[data-zen-overlay-root]`, e.g. a phone preview).
  - RichTextField: the insert-link box is no longer a nested `<form>`, so the field works inside any Form.
  - Input: read-only fields show the focus ring; AutocompleteField shows no Create row for a value that is already a
    Tag; Form focus lands on the first Error tag of an invalid AutocompleteField.
  - DatePicker: `today` prop; days are named with their full date; an inline calendar has no popover surface.
    DateField forwards `minDate`, `maxDate`, `today`.
  - Bottom Navigation idle labels are Content/Neutral/Light (user decision; icons stay Placeholder as in Figma); Pagination `size="sm"` sizes the
    arrows and the range reads “1–10 of 1,284 results”; Badge remove is named “Remove <label>”; Chat labels are in
    sentence case, the composer shows a focus ring and an action-less call card keeps its bottom padding.
  - Accordion Box: the whole box header is the toggle; BottomSheet: `onSubmit` makes it a form; NpsScale and
    OpinionScale stay on one row on narrow cards.
- **Reduced motion keeps fades (2026-10-01):** under `prefers-reduced-motion` the movement factor is 0 instead of every
  duration: dialogs, sheets, side panels, the drawer, toasts and menus crossfade instead of sliding, colour and hover
  changes still fade, and the Toggle thumb, Accordion, Progress and the Sidebar width jump. WCAG 2.3.3 covers movement,
  not fades.
- **Popover, Menu and tooltip motion (2026-10-01):** every floating Popover surface (Menu, the Select dropdown, Chip
  filters, Table editors, the Sidebar flyout) fades in with a 4px slide from its anchor at Base Emphasized and fades out
  at Fast; tooltips fade out at XFast (Escape still hides them at once). Durations and curves across 22 components now
  come from the motion tokens: Dialog exits in 200ms (was 160), the standard SidePanel in 120ms.
- **Liquid Glass and Top Navigation gradients matched to Figma (2026-10-01):** glass follows the two Figma effect
  styles. Liquid-Glass/Normal (TopNavigation glass actions, AiChatField Liquid Glass) blurs 2px and Glass-Floating (Bottom
  Navigation floating-glass pill and action) 4px: Figma frost ÷ 2, where they were 12, 24 and 8px with an extra saturate.
  A light rim stands for the GLASS light (−45°), and the dark glass actions get their Liquid-Glass shadow. The gradient
  Top Navigation types (Bluring, Liquid Glass, Overlays) paint at 80% like Figma: the overlays are black 40% (was 50%) and
  Compact-Overlay 48% (was 60%).
- **AiChatField: the whole field is the hit area (2026-10-01):** a click or tap anywhere outside its buttons puts the caret
  in the prompt. The model switch is a 36px pill as in the live Figma (Button/Spacing/Small padding 8, Corner-Radius/
  Action/Small, Neutral/Flat fill with hover and pressed), so a press next to its label opens the model menu; it was the
  bare label. Liquid Glass keeps its glass shadow when focused.
- **Inputs and Search have Disabled again (2026-09-30, from Figma):** Text, Select, Date, Number and Text-Area take
  `disabled` as Figma Field-Only State=Disabled (same fill, Input/Border/Disabled, label, value and slot icons in
  Content/Disabled, Leading/Trailing Active=No and locked, Number steppers disabled); `disabled` alone now also sets
  the field's look and its label, not just the native element. `Search` takes `disabled` again (Search/Default is a
  Field-Only instance): the clear button and ⌘K hint hide and the filter locks. Autocomplete and Rich-Text keep
  Read-only only (Figma has no Disabled there), so `input/no-disabled` now covers just those two. Read-only stays the
  choice for a value people need to read or copy. The Input and Search playgrounds have a Disabled toggle.
- **Review batch 3–4 (2026-09-30):**
  - Date Picker gains the Figma Time-Picker: `timePicker` adds a Divider and From / To times (hh:mm + AM/PM picker) with
    All day, stacked on the single calendar and side by side on the dual one; `time` / `defaultTime` / `onTimeChange`,
    times join the Submit draft (`onApply`'s third argument); new `DatePickerTimePicker`, labels in en/vi.
  - Single choices in a Bottom Sheet (Chip › Mobile filter row, Button › Mobile footer CTA) are List + ListItem rows
    (Selected + check) instead of the accent-subtle sheet item.
  - Metric Widget examples fill their width: KPI, sales, team and goal rows share it equally (four KPI cards), the
    department budget is one even row, Service health and Inline metrics are equal cells split by Pale rules that stack
    in a narrow card; no empty tracks or orphan items.
  - Playgrounds show content slots empty (Card, Dialog Custom / Main-Contents / Side-Content, Side Panel, Bottom Sheet,
    Accordion); examples keep the real content.
  - Layout page rebuilt (researched against Material 3 canonical layouts, Polaris, Primer PageLayout, Every Layout,
    Atlassian): 9 examples — main column + aside, list-detail, annotated settings, toolbar + auto-fill gallery, readable
    width, equal-height cards, wrapping cluster, centred in a panel, mobile screen — whose columns really change on a
    phone; the playground gains Stack align/justify, Grid track lists / min width / one column on phones, Box padding and
    radius, Container width and margin.
  - Page Header examples take a full row each. The phone period switch is a single-choice Chip row (moved to Chip;
    Segmented guideline: no sliding Segmented on phones). Sidebar shells use PageHeader (h1, Heading/1) with h2 sections.
- **Table `onRowClick` (2026-09-30):** read-only rows that open a record are clickable as a whole: pointer, hover
  tint, a Tab stop per row, Enter/Space, a Focus/Accent/Solid ring; buttons, links, checkboxes and fields inside the row
  keep their own clicks. The column `onOpen` hover button stays for editable tables (guideline updated).
- **Table, Dock Icon and Chart Card match Figma (2026-09-30, found auditing the HR templates):**
  - Table: a px column `width` is now a fixed width (Figma FIXED) — a narrow container scrolls the table sideways
    instead of squeezing the column and wrapping dates; the column without a width fills (Figma FILL). Rows keep the
    fixed Table/Cell/Size (52): a 32–40px Avatar, Dock Icon or icon button (`TableMedia`, `TableActions`) and a label +
    Subtext cell spill into the padding instead of growing the row to 56–64. Labels next to media stay on one line.
  - Table `onRowClick` ignores clicks that bubble from a portal (a Menu, Popover or Dialog opened from the row).
  - Dock Icon Theme=Emoji: Medium draws a 28px glyph (Heading/1), Large a 36px glyph (Display/3) in a 48px tile.
  - Chart Card: `theme` (Flat default, Shadow next to Shadow metric cards) and `rangesFullWidth` (the range Segmented
    fills with equal items by default, `false` hugs); the legend is centred and the chart Tooltip is Medium (Figma).
  - Sidebar (Basic, collapsed): the panel hugs its logo like Figma 4081:15233 — 84px with the 28px logo, 88px (72px
    panel) with a 32px Avatar logo such as the HR rail, so the page starts at 80 as in Figma; a custom `brand` never
    widens the rail.
  - AI Chat Block: a suggestion longer than the block (a phone at Comfortable) ellipsizes instead of overflowing.
- **Medium is the default size for Tabs, Segmented and Chip (2026-10-01, user rule):** on desktop and phones; small only
  inside a genuinely narrow component space. Chip's default changed from small to medium (a filter row now lines up
  with Search and Buttons at 40px); Tabs and Segmented already defaulted to medium. Guidelines and the Do/Don't visuals
  follow it.
- **Mobile playgrounds: every control acts (2026-10-01):**
  - Top Navigation: the control-bar Search filters the project list. When nothing matches, an Empty State offers Clear
    search, which puts focus back in the field. The folded Search action scrolls back up (or expands a pinned-collapsed
    bar) and then focuses the field.
  - Bottom Sheet: Sort projects really orders the list (Most recent, Name, Most pages), and the sheet's Search narrows
    its options. The backdrop is now a Projects root whose large title folds with the scroll, and the modal sheet is
    "New project".
  - Bottom Navigation: each tab is a root, with its label as the large title, folding with the scroll. Tapping the
    current tab again scrolls back to the top.
  - Chart: only the line chart shows a range switch, because the budget stack is always by quarter.
  - The project rows line up with the bar's 20px margin.
- **Top Navigation keeps folding after a screen swap (2026-10-01, P1 G1):** a scroll-linked bar shared by a list and its
  detail screen stopped folding after root → child → root, because only the first fold element was measured. The fold is
  now measured again whenever it mounts. The interaction test in `tests/interaction/navigation.test.tsx` fails on the old
  code.
- **Focus never hides under a phone's overlaid header (2026-10-01, G2, WCAG 2.2 SC 2.4.11):** PlatformPhone gives the
  screen a `scroll-padding-top` equal to the part of the header that stays. A row reached by keyboard now scrolls clear of
  the bar instead of sitting under it. The Top Navigation guideline tells apps to do the same on their scroller.
- **Top Navigation: roots as in Figma, a pinned status banner (2026-10-02, user decisions G4 · G5 · G6):**
  - A root (a large title and no leading) hides the empty navigator-bar row while the large title shows, as Figma's root
    screens do (Top-bar=false). Its actions sit at the right of the large-title row. When the title folds, the bar title
    shows in that same row, so the header keeps its height (114px instead of 178).
  - `topBar` maps Figma's Top-bar boolean: `true` keeps the row above the large title (iOS layout).
  - `largeTitleAction` now sits in the trailing slot on such roots, so it stays in reach after the title folds.
  - New `banner` takes a Small AlertBanner pinned under the bar and the control bar, edge to edge, for a status that
    must stay in view (offline, syncing). It never scrolls away.
  - The guideline, props docs and interaction tests cover all three. The Top Navigation playground gains Back and
    Banner toggles.
- **Sidebar workspace switcher opens with the arrow keys (2026-10-02, P2):** Down and Up open the workspace list as Enter
  does (APG listbox button). The interaction test is in `tests/interaction/app-shell.test.tsx`.
- **Phone examples follow the Top Navigation rules (2026-10-01):** research and an audit of all 77 phones are in
  `docs/research/top-navigation-mobile-rules-2026-10-01.md`. It has a decision table, rules R1–R18, and a list-length rule:
  a list screen is at least 1.5× the phone's height, about 14 rows.
  - Typography › Master screen: folds with the screen's scroll (`scrollRef`), replacing a hand-made 24px trigger.
  - Typography › Child screen and App layer › Text › Mobile typography: open on order #1042. Back goes up to a real
    Orders root (14 orders, folding large title), and every order opens its own screen. The child bar is Compact.
  - Dates and times follow the house format: "Sep 12", "9:41 am".
  - Docs phones preview real phone tokens (`data-breakpoint="mobile"`). Lists keep their default inset, so rows,
    kicker headers and the large title share the bar's 20px margin.
- **Templates and App layer: UX interaction pass (2026-10-01):**
  - Toasts close after Undo and View.
  - An opened row stays selected while its panel is open.
  - Phone filters open Bottom Sheets instead of popovers. Phone tables with row menus or toggles become Lists.
  - Focus lands on a sensible control after dialogs, clears and empty states.
  - Negative dialogs focus Cancel first.
  - Dead "+" and microphone buttons in the Zen AI field now attach a file and fill the prompt (Home and every HR module).
  - Mobile list shows 10 orders, so its large title and Search fold. Mobile detail's bar shows its line once content
    runs under it.
  - App Shell examples follow the window's breakpoint, so at 390 the HR pages inside take their phone layouts. A status
    Badge no longer gets cut ("Appro…").
  - The docs stage no longer wraps Lists inside a phone, a full-bleed screen or a painted Box in a second bordered card.
- **Elevation follows the Sidebar, widget titles are Subheading (2026-10-01, user rules):** a screen keeps one
  elevation, set by its Sidebar — the grey Canvas with the default Sidebar (Surface + shadow) takes Shadow cards with
  no border; a white Canvas takes a Surface-alt or Flat Sidebar and bordered cards (never a shadowed Sidebar on white).
  Templates and App Shell examples follow it, and the App Shell playground couples Canvas, Sidebar style and card
  elevation. Sidebar gains `divider` (a full-height Pale line inside the Sidebar, for Alt/Flat Sidebars on white).
  AppShell lifts the Sidebar above the sticky top bar, so its shadow no longer stops halfway like a divider. Every
  widget title (Card, ChartCard, panel) is Heading/Subheading; harness `table/title-heading-4` now expects Subheading
  for a table inside a Card and Heading/4 for a bare table section. Metric (Icon-Highlight Medium–XSmall) top-aligns
  its Dock Icon with the label, as in Figma 595:55188.
- **Templates rebuilt as real product screens (2026-10-01, user request):** every page template was redesigned from
  Zen's own components, text styles and tokens and the UI-patterns research, with the Figma HR-Platform as a moodboard
  only (brief: `docs/research/template-rebuild-brief-2026-09-30.md`). The HR set lives in one product world (Đìzai
  Studio, Alex Duong, today Sep 30, 2026) backed by a shared typed module, `src/templates/hr/data.ts`: people and
  teams, leave kinds and balances, requests, real 2026 public holidays for five countries, expense claims and budgets,
  tasks, and the formatters the research asks for (month-name dates and ranges, the relative-time ladder, money,
  working days without holidays). Every visible control works: filters, sort, row detail panels, create and edit
  forms with validation, approve / decline / cancel with Undo, board drag, and phone layouts (lists, Bottom Sheets).
  Template titles are sentence case (`HR · My leaves`, `Detail page · Invoice`…). Lists inside templates no longer
  pick up the docs' loose-list card styling.
- **Desktop-screen examples bleed to the card (2026-09-30, user request):** templates, app shells, Sidebar shells, desktop
  chat, docked Side Panels and page layouts (every example flagged `screen`) fill the example card edge to edge — no grey
  stage, no inset, no frame border of their own — in the card and in full screen; page layouts keep Margin-Comfortable.
- **Full screen looks like the real web app (2026-09-30, user request):** a desktop screen in full screen is the page
  alone — no docs header, description, Code button or code panel — filling the viewport, with one floating "Exit full
  screen" pill at the top centre (Escape too). The App Shell playground gains Full screen with its current settings.
- **Flag and Metric Title-Highlight (2026-09-30):** `Flag` renders the 260 Figma country flags (7063:63834) by name,
  lazily loaded (Iconography › Flags; harness `flag/unknown-name`, `flag/no-emoji-flag`). `MetricCard`/`Metric`
  `variant="title-highlight"` is the Figma Metric-Inline/Title-Highlight primitive (title on top, value at the bottom,
  Dock Icon at the bottom-right) with an `action` slot.
- **HR templates rebuilt from Figma data (2026-09-30):** Home, Expense Overviews, My Leaves, My Expenses, Leave Types,
  Public Holiday and All Tasks were re-read node by node (component, variant, sizing, text style) and rebuilt with the
  same components and primitives, the Figma copy and sample data; invented views, rows and dialogs were removed. The
  HR sidebar follows Figma: neutral child selection, collapsed Configurations chevron, Space marks (Accent/Purple
  Avatar) and the Space section's add action.
- **Examples and templates use components as designed (2026-09-30):** HR templates show MetricCard / Metric instead of
  hand-built number cards; read-only tables and task lists open from the whole row (My Leaves, My Expenses, Leave Types,
  All Tasks list · Gantt · Kanban cards; Side Panel "Employee profile"); rows that mix people and things lead with
  same-size visuals (Avatar Medium beside a Dock Icon Medium); item icons in lists are Dock Icons (Side Panel, App Shell,
  HR Inbox, Search results, Detail template activity). Dialog examples (Form · Basic, 1-3, Half-Half, Big with steps,
  Invite teammates, Destructive confirmation) open from a members list, a profile card, a workspace switcher, an import
  history, a shared project and a project list.
- **Review batch 5 (2026-09-30):**
  - HR-Platform templates built from the live Figma file (Templates page, `src/templates/hr/`): Home, Expense
    Overviews, My Expenses, My Leaves, Leave Types, Public Holiday and All Tasks (List / Kanban / Calendar / Gantt, task
    dialog), all on one `HrShell` (Home icon rail, module Sidebar with workspace, Back and App Store, top bar with Pro,
    Settings, Inbox count and account). `HrRouterContext` links the pages into one app.
  - App Shell examples are HR-Platform screens: HR workspace (the templates linked, navigable), People admin (Search in
    the top bar), Home on the rail, Time Off in a drawer, Billing with a banner, Workbench on a flat canvas, the HR app
    on a phone.
  - Side Panel examples are full screens: employee profile from a table row (Tabs: details, leave balances,
    documents), filters for an approval queue (live result count), a docked inspector beside a page builder,
    notifications from the bell, a Submit leave form. Dialog's Unsaved changes, Success and Vertical actions examples
    open from a real page editor, site card and members card.
  - Visually Hidden: the icon-only table header no longer shows an icon; the status example drops its "screen readers
    hear" line; new "Unread counts on a phone" example.
- **Top Navigation follows the scroll like iOS (2026-09-30):** new `scrollRef` (the scrolling element, or "window").
  The large title and a folding Search slide under the bar with the content 1:1 (no jump), the bar title fades in once
  the large title is covered, a scroll that stops half-way settles open or closed, the folded Search becomes the
  top-right Search action, and the opaque types show a Border/Neutral/Pale rule only while content runs under the bar;
  covered parts are inert. `collapsed` still pins it by hand. The playground has Collapse: On scroll · Expanded ·
  Collapsed; the "Collapse on scroll" example drops its 24px onScroll threshold. Guideline: large titles only on
  top-level screens. `PlatformPhone` takes `screenRef`.
- **Examples and playgrounds carry no instructions (2026-09-30, user rule):** a component that needs a "click here /
  press Tab / try X" line has a UX problem, so the hint lines are gone (≈ 25: Badge, Popover, Date Picker, Breadcrumbs,
  Table, Rating, Color Selector, Toast, Link, Menu, Action Bar, Dialog, Chat). Status lines stay but start empty and
  report only what happened; empty panels show real copy ("Add dates", "5 files"), toasts carry real messages.
- **Action Bar on phones can be horizontal (2026-09-30):** a horizontal bar under 480px (a phone) shows two Large
  buttons side by side, Tertiary · Primary (the Bottom-Sheet dual footer), instead of Medium ones; the playground picks
  the device and the direction separately, and a "Filters on a phone" example shows Clear all · Show 6 prints. The
  guideline now chooses the phone direction by the actions: vertical when one main action leads, horizontal for a pair.
- **Sizes on phones (2026-09-30, user rule):** components keep their full size on mobile. Toggle guideline: phones use
  `size="large"`; Input guideline: phones use medium or larger. The smaller sizes are for dense desktop rows, tables,
  toolbars and panels. Harness `mobile/full-size-controls` (error) checks Toggle/ToggleButton and inputs inside a
  Bottom Sheet or a platform phone frame; Bottom Sheet › "Full-height settings sheet" now uses a Large ToggleButton.
- **Content hierarchy (2026-09-29, researched against 15+ design systems and WCAG):** every page and phone screen keeps
  exactly one h1 (a compact TopNavigation bar title is the h1 in its bar style, also while collapsing);
  `<Heading level>` defaults follow the ladder (2 → Heading/4, 3 → Subheading, 4 → Body/Extra/Bold); Accordion takes
  `headingLevel` (its triggers sit inside headings); an EmptyState inside a ChartCard steps below the card title; group
  labels in Menu, Popover and Select are labels, not headings; phone examples render in the Mobile typography mode. The
  hierarchy checks accept list-group kickers and h1/h2 overlay titles and no longer flag the TopNavigation bar h1.
- **Typography and colour from the 2026-09-28 Figma variables:** Dashboard and Mobile text styles have new sizes, line
  heights and tracking (Dashboard: Heading/1 28/36, Heading/3 22/28, Display/1 45/52, Caption 11/16, Label/Small 9;
  button labels are no longer tracked tighter); Popular is unchanged. In Light mode `Color/Content/Neutral/Base` text
  and the Neutral Solid hover fills are darker (Gray/11).
- HeadingField keeps its Figma height (Input/Size/Heading-H1–H3: 40/36/32, Comfortable 44/40/36) and centres the
  heading text in it; it used to take the text's line box, which is now smaller.
- Component variant attributes are `data-tone` (was `data-theme`), and Sidebar density is `data-sidebar-density`
  (was `data-density`): those names are the token mode attributes, and every variant element used to re-declare the
  component-theme variables. Styling hooks that targeted `[data-theme=…]` on a component must switch to `[data-tone=…]`.
- Inter ships as WOFF2 instead of WOFF: 771 KB instead of 960 KB for both files (normal 367 KB, italic 405 KB). The
  font tables are unchanged, so text renders pixel-identically.
- **Tokens from the 2026-09-29 Figma exports:** in component theme Neutral - S4, a selected Secondary chip now looks
  like Neutral - S1: a Surface fill with its shadow, and the solid active border at the Primary active weight (it was a
  Subtle fill with a thin Subtle border, no shadow). Small input fields match Medium ones: `Corner-Radius/Input/Small`
  is 12 / 12 / 8 / 2 px in Rounded / Smooth / Standard / Luxury (was 8 / 8 / 4 / 2).
- **Global Colors from the Zen Plugin's Dark-contrast revision (2026-10-04 Figma export):** 420 values moved (210 solid,
  210 Alpha); no token added, removed or renamed. Dark shades now sit further from the canvas than their Light twins:
  steps 2–8 are lighter (Gray/2 #1C1C1C, Gray/3 #262626, Gray/8 #696969), so Dark surfaces, subtle fills and borders
  read stronger, and Dark Neutral step 9 is darker (Gray/9 #8D8D8D) so its hover stands out. Accent hover (step 10)
  moves further from the solid in both modes, and Dark accent Base text (step 11) is darker and more saturated
  (Blue/11 #86BCFF, was #CAE2FF); bright solids (Sky, Mint, Yellow) darken on hover in Dark. One-step rounding at Light
  step 2.
- **Global Colors from the Zen Plugin's new ramp algorithm (2026-10-03 Figma export):** 258 values moved (109 solid,
  149 Alpha); no token added, removed or renamed. Light Neutral steps 4–6 are spread evenly between steps 3 and 7
  (Gray/4 #E5E5E5, Gray/5 #DEDEDE, Gray/6 #D7D7D7), so the Neutral Subtle border, hover and pressed fills and the
  disabled solid read slightly stronger. In Dark, step 2 is a little lighter (Surface and Canvas/Alt #1A1A1A, was
  #191919), Neutral steps 4–5 are spread evenly (Gray/4 #2A2A2A) and the accent steps 4–7 a little darker (Support
  Soft fills, Subtle borders). One-step rounding changes on Light Gray/10 and 12, Orange/8, Brown/7 and Dark Gray/6–10.
- **Global Colors step 3 (2026-09-29 Figma export):** step 3 of every colour ramp and its Alpha twin moved (79 values;
  no token added, removed or renamed). It is a little darker in Light and a little lighter in Dark, so the Subtle
  fills, Pale borders, pressed states and disabled borders built on it read slightly stronger.
- **Dark Gray step 9 (2026-09-29 Figma export):** Dark/Gray/9 is #929292 (was #656565) and Dark/Gray-Alpha/9 is
  #FFFFFF8B (was #FFFFFF5C), from the Zen Plugin's Dark Neutral step 9. In Dark mode the Neutral solid (e.g. the
  neutral Progress circle's done ring) and `Color/Content/On-Black-Overlay/Light` are lighter; Light is unchanged.
- **Dark Alpha steps (2026-09-29 Figma export):** 69 Dark Alpha values at steps 1–9 are now bright hues at low alpha
  (most were near-opaque dark colours), e.g. Dark/Teal-Alpha/5 #003F37F5 → #00FFDB2F; step 3 moved in Orange, Yellow,
  Golden and Mint. In Dark mode the Subtle fills and borders built on them (Warning InlineMessage and Badge; orange,
  yellow and golden Avatar, Badge and DockIcon; the orange and yellow Progress ring) let the surface under them show
  through: on the canvas they look almost the same, on a lighter surface slightly lighter. Gray and Light are unchanged.
- **Dark ramps (2026-09-29, fourth Figma export):** steps 1–8 of the Dark colour ramps are a touch lighter (at most
  4/255 per channel), with small matching Alpha adjustments; Light is unchanged. In Dark mode the canvas is #121212
  (was #0F0F0F) and Surface/Default #191919 (was #1B1B1B), so surfaces stand out from the canvas a little less and
  rely more on their border; Neutral text is slightly brighter (Gray/12 #FDFDFD, Gray/11 #D5D5D5).
- **Matched to the live Figma file (2026-09-29):**
  - Checkbox, Radio Button, Toggle and Table cell captions use Caption/Regular 11/16 (was Body/Small/Regular 12/16).
  - Toggle tracks size from the dot plus Spacing/Padding/3XSmall on each side.
  - Chat text bubbles keep Spacing/Gap/3XSmall between the message and its time, and cap the text at 220 / 516px
    (Mobile / Desktop).
  - Search in a popover (`variant="popover"`) keeps a 1px Input/Border stroke in every state (Input/Border/Hover on
    hover, 1px instead of 2px) and draws no focus ring. The stroke is transparent in every theme except Neutral - S4.
  - Table trend badges use the trend-up-01 / trend-down-01 / minus icons. The in-place editor pads 12 × 16, keeps
    XSmall between its tags and the input, and draws its underline inside the cell.
  - Segmented Medium badges get Spacing/Padding/3XSmall on each side.
  - Breadcrumbs: 4px between an item and its chevron, 8px between items (was 0 and 2).
- **AppShell:**
  - The top bar follows Figma Header Type=Navigation: 72px on desktop (Margin-Comfortable above, Spacing/Padding/XSmall
    below), 8px between the toggle and the Breadcrumbs, and 12px between actions. It was 64px, centred.
  - The header content (Breadcrumbs, Search) takes a row of its own when it does not fit beside the toggle and the
    actions. A top-bar Search stops at 400px (Figma Center-Slots).
  - A collapsed rail keeps the same 24px gutter to the page as the expanded Sidebar.
  - `layout="auto"` follows the shell's own width instead of the viewport, so a shell in a split view, iframe or preview
    frame gets the drawer when it is narrower than 1024px.
  - The drawer renders next to the shell instead of in the portal: fixed to the viewport in an app, or to a preview
    frame that sets `contain: layout`.
  - A shell inside a scrolling frame can fill it by setting `--zen-app-shell-height`.
  - Templates Detail and Settings put Breadcrumbs in the top bar; the Detail page drops its PageHeader Back.

### Removed
- **Colour ramps VT, Chat, Brand-Ananas and Neutral-Ananas (2026-09-29):** 192 Global Colors primitives are gone, in
  Light and Dark and with their Alpha twins, e.g. `--zen-light-vt-9` and `--zen-dark-chat-3`. No Zen token or component
  used them. Global Colors now has 960 variables and the library 2,176.

### Quality
- **Target check follows WCAG 2.5.8's spacing exception (2026-10-05):** the platform audit and `zen-ds audit` flag a
  phone target under 24×24 only when a 24px circle centred on it meets another target (or another small target's
  circle), so a lone text link in a list row no longer counts. A 390 pass of all 61 pages had found two cases: the
  Input label tooltip (fixed above) and the lone links on the Tooltip page (exempt).
- **Spacing ladder check (2026-10-02):** `audit.mjs --quality` (so `npm run qa`) warns `ladder` when a rendered
  gap is not one of the ladder's six steps, or when peer groups laid out alike are wider apart inside than between
  each other. It reads Stack, Grid and example markup; components keep their own gaps. All 61 pages pass it at 1512
  and 390 (0 findings).
- **Audit tools read phones and dialogs right (2026-10-02):** target and edge checks measure controls in a scaled docs
  phone at their app size (no false positives at 390). The density snapshot skips inert content such as a collapsed
  Accordion panel. The dialog check presses Escape a second time when the first one only closed a popup inside the
  dialog (a DateField calendar). `shoot.mjs` takes `--timeout=` and `--wait-until=` for a busy machine.
  The combobox check knows the APG Date Picker Combobox (`aria-haspopup="dialog"` or `"grid"`). It expects a calendar
  dialog, focus inside it, and focus back on the field after Escape, not a listbox.
- **Motion rules (2026-10-01):** `motion/token-only` (raw durations or curves; endless loops exempt),
  `motion/no-layout-animation` (width, height, top/left, margin, flex-basis) and `motion/reduced-motion`, which now also
  covers transitions that move and accepts `--zen-motion-movement` or fade-only keyframes as the fallback. The platform
  audit, the behaviour probes and the browser tests (`tests/setup.ts`) freeze animations, since reduced motion no longer
  zeroes them (axe sampled a fading Popover); the interaction harness waits for the Select list's exit fade.
- **Outline warnings on by default (2026-09-30):** `audit.mjs --quality` now reports outline-h1, outline-start,
  outline-card and outline-siblings (`--no-outline` turns them off); the baseline holds the screens that still lack an h1
  (Chat desktop, Sidebar shells, Side Panel "Docked inspector"), and `rhythm` was re-seeded after its messages changed.
  The gate maps edits in `PlatformPhone.tsx` (every page with a phone frame), `PlatformTypographyHierarchy.tsx`
  (Typography) and helpers in `PlatformMobileShowcases.tsx` (through the examples that use them) to their pages.
- **Gate: parallel contract suites (2026-09-30):** every contract run builds its harness in its own folder
  (`tools/figma-contract/.out/<suite>-<pid>`); a shared one let concurrent suites load each other's cases, and 18 of 23
  failed on a token change. The gate runs 4 suites at a time (`ZEN_QA_SUITES`, one by one under `--serial`), and a
  token sync takes the fast path by itself: `tokens.css` written by `npm run tokens:build` no longer needs `--files`.
- **Proportional process (2026-09-29):** a tier table (XS/S/M/L) in AGENTS.md decides how much planning, QA and
  logging a change gets. `npm run qa` now checks only what changed since the session's last pass (token edits → the
  pages that use them), with `--only=` and `--keep-going`; static gates run only for what you edited and stop the run
  early on a ✗; the Stop hook asks for at most 12 new contact sheets and lets a turn end while a run is still going.
  `figma-console-extract.js` works in `use_figma` as is and adds `__HASHES(ids)`. A token-only change takes a fast
  path (tokens:check, the consumers' Figma suites, contrast and fit on the consumer pages; no behaviour, smoke or
  TypeScript): 7 pages in 138 s instead of 256 s. New label keys check only the components that read them, and
  `--all` is reserved for changes every page renders.
- Browser tests (Vitest, Chromium): every component renders in light and dark with an axe baseline that only
  shrinks; size spellings render identically; interaction tests for Menu, Dialog, Tooltip, useToast, Table,
  Pagination, Accordion, Form and ZenProvider. CI workflow for every gate. Pixel-level visual diff tool for the
  docs platform.
- **Build-QA gate** (`npm run qa`; skill `skills/zen-build-qa`; `docs/qa/build-qa-process.md`): one command after
  every component, playground or example change, scoped to the files the session edited. It runs the static gates,
  the new **style guard** (`npm run style:check`: 15 rules for spacing, radius, typography, colour roles, shadows and
  slot sizes in CSS and inline styles), runtime checks for text styles, content hierarchy, token scale, concentric
  corners and Comfortable density (`platform:audit --quality --density`), dark mode, **behaviour probes**
  (`npm run platform:behaviour`: focus ring, keyboard reach, APG keys, dead clicks, hover), example coverage and
  1512/390 screenshots. Claude Code hooks lint every edit at once and hold a turn until the gate passed and its
  screenshots were opened. Pre-existing findings are baselined; only new ones fail.
- Figma contract suites for all six Button sets (every size × level × state) and Input/Heading. The checker also
  verifies radius bindings in a second Corner Radius mode, gradient strokes, and exceptions pinned to the value code
  renders.
- Harness rules from the behaviour probes: `interaction/no-noop-handler` (a no-op handler on any Zen component,
  action objects included), `interaction/controlled-needs-handler` (a controlled prop without its change handler,
  e.g. `month` without `onMonthChange`), and for CSS `focus/state-parity` (a focus selector in the same rule as its
  resting state) and `focus/selected-fill-only` (focus drawn only as a fill on an item whose selected state is a
  fill). Interaction tests for the focus fixes: `tests/interaction/focus.test.tsx`.
- Harness rule `interaction/action-without-handler` (repo examples, playgrounds and templates; apps are not judged):
  a Button or `<button>` without `onClick` / `href` / `type="submit"`, an action object (`leading`, `trailing`,
  `action`, `primaryAction`, `subAction`, `actions`, `suggestions`…) without `onClick`, and pressable `items` whose
  list has no `onSelect` / `onNavigate` / `onItemClick` / `onValueChange`. Documented defaults pass (Dialog, ModalForm,
  SidePanel and BottomSheet actions close the overlay; a Menu opens from its trigger). `icon-button/needs-action` now
  also checks IconButtons whose label is a template literal, and the usage scanner no longer reads a glob such as
  `accept="image/*"` as the start of a comment (it hid the code after it from every rule).
- Style-guard debt is paid off: `tools/style-guard/baseline.json` went from 376 findings in 32 files to 0.
  - Component CSS binds the token that the live Figma node binds.
  - Platform CSS and example inline styles use the Spacing, Corner-Radius, typography and shadow tokens.
  - Deliberate exceptions carry a `zen-allow-<rule>` reason that cites the Figma node.
  - With an empty baseline, every finding is new, so the gate reports it.
- Runtime check `fit` (`platform:audit --quality`, so `npm run qa`): text wider than its own box with no ellipsis and
  no scroll, which runs into its neighbours or is cut off. It also looks inside `overflow: hidden` ancestors, which the
  `overflow` check skips, so the Segmented that read "404 No resultsFirst use" on 2026-09-28 is now caught. With
  `--density` it also runs at Comfortable. The 24 findings already on the platform are baselined. `audit.mjs` also
  gains `--baseline-update=<kinds>` (seed one kind without touching the others) and `--css=<file>` (re-create a fixed
  bug to prove that a check catches it).
- App Shell harness rules:
  - `app-shell/primary-in-top-bar`: a Primary or Accent Button in `header` / `headerActions`.
  - `app-shell/nested`: an AppShell inside another.
  - `app-shell/breadcrumbs-once`: Breadcrumbs both in the top bar and in the PageHeader.
  - `app-shell/forced-layout`: apps only, `layout="sidebar" | "drawer"`.
  - Interaction tests in `tests/interaction/app-shell.test.tsx` (11) cover the rail toggle, the drawer (focus, Tab,
    Escape, Close, section title, choosing a page), the shell width, the skip link, the count in the accessible name
    (en/vi), the account Menu and `useAppShell`.

## [0.3.0] — Unreleased

This covers the uncommitted working tree on top of commit `eafb0de` ("Udated", 2026-09-26). `package.json` already says
0.3.0. Details are in `docs/context/session-log-2026-09-26.md` (09-26 → 09-28) and `session-log-2026-09-27.md`.

### Added — components

- **Layout and content:**
  - Divider
  - InlineMessage
  - EmptyState
  - Stepper
  - Slider
  - Card
  - DockIcon
  - List + ListItem
  - Table: sort, select, in-place editor with text/number/select/tags cells
  - DescriptionList
  - ActionBar
  - Image
  - VisuallyHidden
- **Input and feedback:**
  - Rating, RatingDisplay, OpinionScale, NpsScale
  - ColorSelector
  - Metric, MetricTrend, MetricCard
  - Uploader: FileUpload and UploaderFileItem
  - SidePanel: Standard and Modal
  - ToastStack
  - FileIcon: 10 formats from Figma `icon-media-file`
- **Mobile and conversation:**
  - TopNavigation
  - BottomNavigation
  - BottomSheet
  - Chat kit: thread, bubbles, file/call/photo cards, reactions, hold-to-react, reply, composer, conversation list,
    hover actions, avatar group, emoji picker
  - AiChat, with a thinking indicator
- **Chart:** Line, Stack bar, Card.
- **Motion:** motion tokens (`--zen-motion-duration-*`, `--zen-motion-ease-*`), shared keyframes, `usePresence`.
  SidePanel, Dialog, ModalForm and Toast animate in and out, with a reduced-motion fallback.
- **RichTextField:** rebuilt on Figma Input/Richtext. `RichTextEditorBar`, `RichTextCommand`, `RichTextBlockType` and
  `richTextBlockTypes` are exported.

### Added — props and API

- **Chat:**
  - `ChatThread device` ("mobile" | "desktop"): text max 220 or 516.
  - `ChatMessage`: `holdActions`, `onHoldAction`, `reaction`, `onReact`, `onMoreReactions`.
  - `ChatReactionPicker onMore`. Without it, "+" opens the built-in emoji picker. `ChatReactionKind` accepts any emoji.
  - `AiChatBubble`: `thinking`, `thinkingLabel`.
- **Mobile navigation:**
  - `BottomNavigation backdrop`: "surface" (default) or "none" for glass over media.
  - TopNavigation Search control bar folds into a trailing Search action.
- **Controls:**
  - `Segmented fullWidth`.
  - `Chip`: `onPopoverCreate` and `popoverCreateLabel` (Manual-Add-New).
  - `AutocompleteField`: `onCreate` and `createLabel`.
  - `PopoverItem control="checkbox"` (multi-select).
- **Metric:** `iconTheme`, `iconBackground`, `iconEmoji`.
- **Uploader:** `extended` prop and single-file mode.
- **Sidebar:** `SidebarSubMenu` flyout, `onSubMenuClose`.
- **Input:** `InputLabel labelId`. The label info tooltip is now a real `<button>`.
- **Density:** Component Size mode (`data-density` compact/comfortable) applies to every token-sized component.

### Added — package and composition layer (vibe-code readiness, part 1)

- Installable library: ESM with preserved modules, `.d.ts`, one `styles.css` (+ optional `reset.css`), `exports` map,
  React 19 peer dependency; the docs platform is no longer part of the package.
- Icons: 96 core icons render synchronously, the rest load from 256 lazy buckets; `icons/all`, `icons/names`,
  `registerIcons`, `preloadIcons`.
- `ZenProvider` (token modes, Canvas, portal root, toasts via `useToast()`).
- Props API generated from the TypeScript sources (`docs/api`, compact props in `docs/guidelines/index.json`),
  `AGENTS.md`, `AGENTS.consumer.md`, `llms.txt`, `docs/getting-started.md`.
- Composition layer: Stack, Grid, Box, Container, Text, Heading, Link, Menu, AppShell, PageHeader, Form +
  useFormState, VisuallyHidden, DescriptionList, ActionBar, Image/Thumbnail; eight page templates in `src/templates`.
- Defaults: IconButton `tertiary`, Popover closed, Sidebar without product branding and with an `aria-label` prop.

### Changed

- **Segmented:**
  - The default level is `secondary`.
  - The selected item has no hover.
- **Chip:**
  - A Chip owns a Popover only with `popoverItems` or `onPopoverCreate`. `dropdown` alone is just the chevron.
  - The caller's `aria-haspopup` and `aria-expanded` are kept.
- **Popover Item:** synced to Figma 829:20006.
  - Selected uses Active/Neutral/Subtle.
  - Avatar Small is always 32px.
  - Label and Subtext truncate to one line (a deliberate deviation from Figma).
- **Table:**
  - The `caption` is Heading/4.
  - An edit that ends refocuses the cell without a ring.
- **Figma parity passes** (size and spacing) on Chat, AiChat, TopNavigation, BottomNavigation, BottomSheet, Uploader,
  Breadcrumbs, SidePanel close and Input Read-only. Read-only fields draw a real 2/2 dashed stroke.
- **Close and dismiss buttons** are Flat Primary everywhere.
- **Shadows:**
  - Popover, Tooltip, DatePicker and the Sidebar flyout use the `-shadow-unclipped` effect (spread 0, as Figma renders
    them).
  - Subtle, Pale and Surface-Alt fills lose their outer drop shadow (house rule §9, theme-aware `-shadow-off` tokens).
- **Theme scope:** component themes follow nested `[data-theme]` scopes (build-tokens selectors).
- **Icons:** named icon sizes (`--zen-icon-size-*`) and Popover rows now follow density.

### Fixed

- **Modals:**
  - The modal Tab trap (Dialog, ModalForm, SidePanel, BottomSheet) let focus escape past roving-tabindex items.
  - Opening a Dialog whose Primary is disabled left focus outside it; Dialog now focuses its first field.
  - The AppShell drawer did not trap Tab.
- **Chat:**
  - Popup triggers announce the popup they open (listbox or dialog).
  - React and More return focus when they close.
- **Popover:** a selected item had no visible keyboard focus.
- **Pagination:** on phones it stays on one line in Comfortable density.
- **AI Chat:** answer actions wrap instead of overflowing.

- Chat File and Call text crop.
- Mobile filter row: Sort opened a stray empty Popover.
- Search example padding.
- SidePanel stretched fixed-size visuals (the Row details avatar).
- Bottom-nav blur bleeding over the device bezel.
- Reactions tab emoji rendered faded.
- ModalForm still animated under reduced motion.
- Card and Popover context menus opened far from their button.
- The Table tags cell couldn't remove a tag.
- Input Leading/Trailing slots clipped wide content.
- Sidebar workspace avatars were not square.
- Slider was not flush at 0.
- Scrims faded the panel inside them.

### Harness, QA and docs

- **Usage harness** (`tools/usage-guard`): 24 → **135 rules**.
  - Now scans CSS and `src/components/**/*.tsx`.
  - Every rule has bad/good fixtures.
- **House rules** in `docs/component-usage-rules.md` §1–§12, including:
  - §6 borders
  - §7 content colours
  - §8 background layers
  - §9 no shadow on tinted fills
  - §10 back chevron
  - §11 Surface on Canvas/Alt needs a border
  - §12 icon tooltip after 1s
- **Platform audit** (`npm run platform:audit`): `surfaces`, `edges` and `sizes` checks at error level. With
  `--smoke` they also run after every example click.
- **Guidelines:** generated for all 49 slugs, with Do/Don't visual pairs and Keyboard and API tables.

### Platform (docs site only, not part of the package)

- **Navigation and layout:**
  - Page history and deep links.
  - Responsive drawer.
  - Nav search (⌘K).
  - Sticky "On this page" pill rail with ↑/↓ section jumps.
- **Examples:**
  - At least 4 per component.
  - Example cards are equal height (subgrid) with Heading/4 titles.
  - Desktop chat examples.
  - Paginated examples carry real data.
  - Examples that are a whole desktop screen (`screen: true`) have a **Full screen** button. This covers the Sidebar
    shells, desktop chat, the docked SidePanel, desktop typography pages, App Shell and the desktop templates. Overlays
    keep working in full screen, and Escape leaves it.
- **Device simulator:** iPhone 15, iPhone 15 Pro Max and iPad, with status bar, safe areas and bezel.
- **Media:** real photos and video in `src/assets/media`; credits are in `CREDITS.md`.
- **Typography:** platform typography from `Typography Configuration.json` (platform only, not in the Zen docs).

## [0.2.0] — 2026-09-26

- Components aligned with the live Figma file `9nZv4uW2LT21yuHabMTCh1`: commit "Zen DS v0.2.0: align components with
  live Figma".
- Checkbox hover on selected and disabled boxes.
- Accordion, AlertBanner, Pagination, Skeleton and Toast, with platform pages and stories (commit `eafb0de`).
- History up to here is in `docs/context/session-log-2026-09-24.md` and `-09-25.md`.
