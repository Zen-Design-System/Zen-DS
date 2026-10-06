# Zen Studio inspector redesign — Design-tab header and Layout controls (2026-10-03)

Research: two workflows (Figma UI3, Penpot, Framer, Webflow, Subframe, Onlook, React DevTools; current-state audit with screenshots; code and DS constraints). Session "Cloud migration feasibility". Owner of `src/platform/studio/**`: session "Platform UI/UX redesign với canvas editor" — it lands its Sizing block first (`inspector/SizingSection.tsx`), then hands DesignPanel / PropField / inspector.css over.

## User decisions (2026-10-03)

- **Header: option B — labelled rows** (Type / Docs / Used in / Repeats; Detach as a visible button only for detachable types). Not the ••• menu option A.
- **Layout section above Properties** for layout components (Figma UI3 order).
- **Off-scale px** (e.g. gap 14): never written; the field offers the nearest tokens (`No gap token is 14 px · sm 12 · md 16`).
- **Phased delivery**, each phase gated (`npm run qa`) and shown to the user.

## Problems found

### Header
- **high** — Detach is a dead control for almost every selection. It takes the header's top-right slot for any capitalised component, but only 9 types (Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge, Tag) can ever detach. Seven different reasons all render as the same grey 'Detach', and the reason appears only in a tooltip on a wrapper span after 1s of hover. This breaks the Zen rules 'no locked or dead controls' and 'explain disabled controls in visible text'.
- **high** — Keyboard and screen-reader users cannot reach the disabled reason. A native-disabled button leaves the Tab order, so its 'instant on focus' tooltip never fires, and aria-describedby sits on a node that cannot take focus.
- **high** — 'button.tsx:397' says the wrong thing. It sits unlabelled under 'Avatar', so it reads as 'Avatar is defined in button.tsx'. It is really where this one instance is written, in the Button docs page's example 'Approve on a phone'. Example files are named after pages, so on an Avatar it even suggests 'inside a Button'. Two nodes on one line get the same label because the column is dropped.
- **high** — Nothing leads to the component itself (its definition or docs page). For a DS owner that is the most useful jump from a selected instance, Figma's 'Go to main component'. When Figma UI3 hid that action, users complained and created duplicate components by mistake.
- **medium** — The file link is a second, worse copy of the Code tab. It only sets inspectorTab:'code'. The tab opens on the Snippet, not the element. The Design panel unmounts, so focus drops to <body>. The visible text is not in the accessible name ('Show button.tsx line 397 in the Code tab'), which fails WCAG 2.5.3. The same </> glyph also means 'Element' one row above.
- **medium** — The hierarchy is inverted. When enabled, Detach (14px/600, #111, 32px tall, 16px icon) has the same weight as the node name and the selected Design tab, and it is the loudest thing in the header. It rewrites source in one click, yet it sits beside a navigation link, and its tooltip never says the instance becomes Box/Stack/Text.
- **medium** — The grey 'Component' pill is a Badge used as a type label. It repeats the purple cube, looks like a chip, and is often wrong: 'Component' means any capitalised name (Box, local example functions such as PhoneApproveExample, platform helpers).
- **medium** — The repeat note uses an orange warning pill for a plain fact. It changes wording in place when the detach plan loads, it packs two ideas into one sentence, and viewers and read-only users see 'edits change all' even though they cannot edit. 'Instances' also clashes with Figma's meaning, where editing one instance does NOT change the others. Here it is one JSX line rendered N times.
- **medium** — The read-only state says the same thing up to three times in three wordings (header note, Detach tooltip, footer status line), and viewers still see a write action they can never use.
- **low** — The header height and alignment are unstable. Rows are 20, 32 and 24px, so the header is 77px for Box, 85px for ListItem and 129px with the note, and the Properties section jumps when the selection changes. Icon sizes are mixed (12 vs 16), the icon-to-name gap is xs although the ladder says 2xs, and at 280px both the name and the Badge are clipped with no way to read the full name.
- **low** — Each selection kind gets a differently built header: Page has an eyebrow above the name, Frame and Element have icon + name + Badge, Part has 'name · part of Owner' plus a note, two xs buttons and an info pill. Part copies the same ambiguous file-link pattern, pointing at the owner's line.

### Property controls
- **high** — Spacing values appear as bare token names in plain Selects, with no px, no meaning and no ordering cues. The inspector also disagrees with the canvas picker for the same prop.
- **high** — Justify and align render twice, and the alignment grid can't show the most common distribution. Stretch and baseline have no cell either.
- **high** — The Layout section dumps raw props instead of modelling spacing. Padding takes three rows and Grid gap takes three more, and the panel never shows which value wins.
- **high** — The new Figma resizing API (width/height = hug | fill | px, min/max, alignSelf, fillChildren) can't be edited, and its rows are scattered across two sections.
- **high** — Grid columns can't be edited, and its display contradicts itself.
- **medium** — The panel is long and poorly ordered: one prop per 40 px row, and Layout sits below Properties.
- **medium** — A control's width and even its type change with the value state.
- **medium** — Unset, default, inherited, bound and spread values each look different from row to row, and some look disabled.
- **medium** — Props that have no effect are still shown as editable, and the panel never says why they do nothing.
- **medium** — Labels are raw camelCase API names. They get cut off, and their descriptions are never shown.
- **medium** — Bug: the short and long spelling of the same size appear as two separate options.
- **low** — The keyboard path is long, and values can't be nudged or scrubbed.

## Header — option B (chosen)

Principles kept from the research: name first, then kind, then context; every reference says what it points to; show only what can work, explain temporary blocks in visible text (never only a hover tooltip); facts in neutral tone, one place per message.

### Layout

Container: same .studio-inspector__head-block.
ROW 1, title row: kind icon 16 · <Heading level={2} textStyle="Body/Base/Bold" truncate>Avatar</Heading>. No Badge and no actions; height 24.
ROWS 2–5: label/value rows reusing the inspector's own row grid (.studio-inspector__row: label column var(--studio-inspector-label), column gap Gap/XSmall 8, min-height 32 → use 24 here). Labels are Body/Small/Regular, Content/Neutral/Base; values are Body/Small/Regular, Content/Neutral/Strongest:
  'Type'    → 'Zen component' | 'Layout primitive' | 'Local component' | 'HTML element'
  'Docs'    → <Link tone="hyperlink">Avatar page</Link> (Zen components only)
  'Used in' → flat primary xs Button (zen-allow-compact-button) startIcon icon-file-code-line, text 'button.tsx:397', aria-label 'Show button.tsx:397 in the Code tab' (contains the visible text), plus IconButton flat xs icon-copy-line aria-label 'Copy source location'
  'Repeats' → '3× — edits apply to all 3' (only when count > 1)
ROW 6, only for DETACHABLE types with an admin + writable server: <Button level="tertiary" size="sm" startIcon="icon-link-broken-02-line" aria-keyshortcuts={detachKeys}>Detach instance</Button>, full width. Below it, Caption/Regular Content/Neutral/Light: 'Becomes Box/Stack/Text in the source · ⌘Z to undo'. When temporarily blocked: disabled, with the visible caption giving the reason (no tooltip). .map row label: 'Detach this row…'.
Gap between rows: Gap/XSmall 8. Height ≈ 24 + 3–4 × 24 + gaps ≈ 140–170px.

### Pros / cons (from the research)

- + Everything is labelled and visible. Nobody has to open a menu to learn where the instance is written.
- + Developers keep the one-click file:line, now unambiguous ('Used in').
- + Detach, when it exists, explains its consequence and blocked reason in visible wrapping text, so screen readers reach it in reading order.
- + It reuses the inspector's own label/value row rhythm, so it reads like the Properties section.
- − Roughly twice as tall as today. It pushes Properties (what designers came for) below the fold at common window heights, on every selection.
- − At 280px the label column eats about 80px, so 'button.tsx:397' and long names truncate again.
- − It still has two clickable things for one destination (the 'Used in' button and the Code tab), and the header becomes a section in disguise.
- − A visible Detach button is still a peer of navigation and still the loudest control for the 9 types. Only Builder.io does this, and it is the outlier.
- − It needs zen-allow-compact-button exemptions again.

### States (adapted from the research's state table to option B)

- **Instance detachable (Zen component in DETACHABLE, e.g. a single Card; admin + writable; plan ready)** — R1: purple cube · 'Card' · [•••]. R2: 'Zen component · Card page' (link). No R3. ••• → Code: Show in Code tab (caption 'button.tsx · line 84'), Open in VS Code, Copy source location | Component: Open Card page | Structure: 'Detach instance' ⌥⌘B, enabled, caption 'Becomes Box/Stack/Text in the source'. Right-click shows the identical list.
- **Not detachable: type can never detach (Avatar, Button, Tabs, Input… ~50 of 59)** — R1: purple cube · 'Avatar' · [•••]. R2: 'Zen component · Avatar page'. ••• has only the Code + Component groups, with no Detach item, so nothing appears disabled. ⌥⌘B writes to the status line (role=status, announced): 'Avatar can't be detached. Detach works on Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge and Tag.'
- **Not detachable: this instance only (a detachable type with an instance-level refusal, e.g. DescriptionList layout={layout}, spread props, inside a <p>)** — Header as in the detachable state. ••• Structure: 'Detach instance' ⌥⌘B, DISABLED, with a visible caption giving the short reason (the first clause of the server reason, e.g. 'Its layout comes from {layout}'), readable without hovering. ⌥⌘B puts the full sentence in the status line ('Its layout comes from {layout}; set a fixed layout before detaching.').
- **Mapped row (ListItem rendered 3× by a .map)** — R1: purple cube · 'ListItem' · [•••]. R2: 'Zen component · List page' (the page label of its slug). R3: 'Repeated 3× — edits apply to all 3'. The wording does not change when the plan loads. ••• Structure: 'Detach this row…' ⌥⌘B, caption 'Row 2 of 3 · other rows stay ListItem' → the existing DetachDialog ('Detach only this row?' / 'Detach row' / 'Cancel').
- **Repeated outside a .map (one JSX line rendered several times, e.g. a component used twice)** — R3: 'Repeated 2× — edits apply to all 2'. For a detachable type, Structure shows 'Detach instance' disabled, caption 'It renders several times outside a .map'.
- **Host element (div, h2, span)** — R1: neutral </> icon · 'div' · [•••]. R2: 'HTML element'. ••• → Code group only. No Detach, and no </> icon reused for anything else.
- **Layout primitive (Box, Stack, Grid, Container, Text, Heading), including the root of a just-detached instance** — R1: purple cube (as in Layers) · 'Stack' · [•••]. R2: 'Layout primitive · Layout page'. ••• → Code + Component groups; no Detach.
- **Local component (capitalised, not in api.generated.json, e.g. PhoneApproveExample, platform helpers)** — R1: purple cube · 'PhoneApproveExample' · [•••]. R2: 'Local component' (no link). ••• → Code group only.
- **Already on the component's own page (e.g. Avatar in the Avatar playground)** — R2: 'Zen component' with no link (it would go nowhere). ••• Component group omitted for the same reason.
- **Viewer role** — R1/R2 unchanged; the Link works (navigation is not editing). R3, if repeated: 'Repeated 3×' with no 'edits apply' clause. ••• → Code + Component only; the Structure group is hidden in the header menu and in right-click. The only mode message is the footer status line 'View only — switch to Admin to edit'. No header note, no tooltip.
- **Read-only server (admin, server ready, not writable)** — Same as Viewer. The single message is the footer status line 'Read-only — editing needs the Studio dev server'. The header 'Read-only' note is removed. 'Open in VS Code' is still offered when server.root is known.
- **Connecting (admin, server not ready yet)** — Header unchanged. For DETACHABLE types, ••• Structure: 'Detach instance' disabled, caption 'Connecting to the dev server…' (temporary, so shown disabled rather than hidden). Status line: 'Connecting to the Studio dev server…'.
- **Loading (source element being read / detach plan being checked)** — R1 and R2 render at once from selection.name, with no skeleton and no layout shift, because the kind comes from the name and the API JSON. The body keeps today's 'Reading the source…'. For DETACHABLE types, the ••• Detach item is disabled with caption 'Checking…' until the plan arrives (typically < 300 ms).
- **Detaching (running) and just detached** — While running: the Detach item is disabled with caption 'Detaching…'. After: the selection moves to the new root, so the header shows 'Box · Layout primitive · Layout page'. Status line (existing): 'Detached Card · Draft · ⌘S to save' (drafts server) or 'Detached Card · ⌘Z to undo'. The toolbar Undo IconButton is the clickable recovery.
- **Source moved (element === null)** — Header unchanged (name and kind from the selection). ••• Code items still work ('Show in Code tab'). Detach is hidden. The body keeps the existing line 'button.tsx:397 has no element there any more — select it again.'
- **Long name at the 280px minimum inspector width** — The h2 truncates with an ellipsis; the full name shows on hover (tooltip) and is in the trigger's accessible name 'Actions for BackgroundExportExample'. The [•••] never shrinks. R2 never truncates ('Local component' is short; a Zen component's 'X page' link wraps to a second line if needed). No Badge left to clip.
- **Part header (deep-selected part, e.g. span inside ListItem)** — R1: </> or cube · 'span' · [•••]. R2: 'Part of ListItem · read-only' (Body/Small/Regular, Base; replaces 'Read-only — set by ListItem at button.tsx:198'). R3: flat primary xs Button 'Select ListItem' (icon-corner-left-up-line; kept visible because it is the main action). R4: the existing info note 'Edit via the owner's title (Playground properties or source)'. The owner file-link button moves into ••• → 'Show ListItem in Code tab', caption 'button.tsx · line 198'.
- **Frame header** — R1: frame icon (icon-layout-alt-01-line / sliders / book) · 'Approve on a phone' (the example title, without the 'Example:' prefix). No ••• (the frame's actions are already in its Frame section). R2: 'Example frame' | 'Playground frame' | 'Docs frame' | 'Document frame' (replaces the kind Badge). R3: the example description (Body/Small/Regular, Base, wraps).
- **Page header (nothing selected)** — R1: h2 'Button'. R2: 'Page' (moved from the Caption/Medium eyebrow above the title to the meta line below it, like every other header). R3: the description/purpose (unchanged).

> The state table above was written for option A (••• menu). For option B read: Code items → the labelled `Used in` row (+ copy IconButton); `Open {X} page` → the `Docs` row link; the Structure group → the visible `Detach instance` button with its caption; `Repeated N×` → the `Repeats` row.

### Interaction and copy

- Tab order in the header: [•••] → the 'Avatar page' Link → the first control in the body. The h2 and the meta text are not focusable. Nothing in the header is natively disabled, so nothing drops out of the Tab order.
- [•••] IconButton flat/primary/xs 'Actions for Avatar': the name tooltip appears after 1s of hover and at once on keyboard focus (IconButton default). Enter, Space or ↓ opens the Menu with the first enabled item focused; ↑ opens with the last focused; Escape or Tab closes and returns focus to the trigger (Menu behaviour). align='end', so the menu opens leftwards from the panel edge.
- Right-click on the canvas selection opens the SAME list (shared nodeMenuItems builder), so the header and the canvas never disagree.
- 'Show in Code tab': sets inspectorTab:'code', then on the next frame focuses #studio-inspector-tab-code, because the Design panel unmounts and Menu's focus-return target no longer exists. Today focus falls to <body>. The Code tab's Source section highlights the element as it already does.
- 'Open in VS Code': window.location.href = vscode://file/<root>/<file>:<line> (the same URL SourcePanel builds). Hidden when server.root is unknown.
- 'Copy source location': copyText('src/platform/examples/pages/button.tsx:397', 'the source location'), then the status line reads 'Copied the source location' (existing frames.ts helper).
- 'Avatar page' Link: a real href (current URL with page=avatar), so ⌘/Ctrl-click opens a new tab. A plain click calls preventDefault() and then navigate('avatar'), which pushes history, so browser Back returns to the Button page. The selection is cleared, as navigate() already does. No tooltip is needed because the text is visible.
- 'Detach instance' (from •••, right-click or ⌥⌘B, which all call detachSelection(selection)): for a single instance there is NO confirmation. It writes one draft edit (one undo record), and the selection moves to the new root. The status line says 'Detached Card · Draft · ⌘S to save' or '· ⌘Z to undo'. Recovery is the toolbar Undo IconButton or ⌘Z, and nothing reaches disk until Save on a drafts server. This follows NN/g's 'undo beats confirmation' and matches Figma and Webflow.
- 'Detach this row…' (.map row): the ellipsis promises a dialog, and the existing DetachDialog asks 'Detach only this row?' with 'Detach row' (autofocus) / 'Cancel'. A dialog is kept here only because the scope is ambiguous (one row vs the whole list).
- How an unavailable Detach explains itself without hovering: (a) a type that can never detach shows no item at all, and if the user still presses ⌥⌘B, the status line (role=status, aria-live=polite) states why and lists the 9 detachable types; (b) a temporary or instance-level block shows the item disabled with the reason as its visible caption in the open menu; (c) viewer and read-only modes hide write actions and say it once in the status line. No reason lives only in a tooltip.
- Keyboard shortcut ⌥⌘B / Ctrl+Alt+B is unchanged (StudioApp, Select tool, not on doc pages, not on parts). The menu item displays it on the right; the Shortcuts dialog row is renamed 'Detach the selected instance'.
- The truncated h2 shows its full name in a hover tooltip. Keyboard and screen-reader users get the full name from the trigger's accessible name and from the Layers row.

- Header row 1, menu trigger aria-label and tooltip: `Actions for {Name}`
- Header row 2, kind label (Zen component): `Zen component`
- Header row 2, kind label (Box/Stack/Grid/Container/Text/Heading): `Layout primitive`
- Header row 2, kind label (capitalised, not in the Zen API): `Local component`
- Header row 2, kind label (host tag): `HTML element`
- Header row 2, link after ' · ' (Zen component or primitive, not the current page): `{PageLabel} page   (e.g. 'Avatar page', 'Layout page')`
- Header row 3, repeated, can edit: `Repeated {n}× — edits apply to all {n}`
- Header row 3, repeated, viewer / read-only / connecting: `Repeated {n}×`
- Menu group label 1: `Code`
- Menu item + caption: `Show in Code tab — caption: {file} · line {line}`
- Menu item + caption: `Open in VS Code — caption: {folder}/{file}  (e.g. examples/pages/button.tsx)`
- Menu item + caption: `Copy source location — caption: {file}:{line}`
- Status after copy: `Copied the source location`
- Menu group label 2: `Component`
- Menu item: `Open {PageLabel} page`
- Menu group label 3: `Structure`
- Menu item (single instance), shortcut, caption: `Detach instance — ⌥⌘B — caption: Becomes Box/Stack/Text in the source`
- Menu item (.map row), shortcut, caption: `Detach this row… — ⌥⌘B — caption: Row {r} of {n} · other rows stay {Component}`
- Disabled Detach caption: plan loading: `Checking…`
- Disabled Detach caption: running: `Detaching…`
- Disabled Detach caption: admin, server not ready: `Connecting to the dev server…`
- Disabled Detach caption: instance-level refusal: `First clause of the server reason, e.g. 'Its layout comes from {layout}' / 'It spreads {...rest}' / 'It renders several times outside a .map'`
- Status line, ⌥⌘B on a type that can never detach (replaces '<Avatar> has no detach recipe; …' and '… is not a component instance'): `{Name} can't be detached. Detach works on Card, ListItem, MetricCard, Metric, EmptyState, DescriptionList, InlineMessage, Badge and Tag.`
- Status line, ⌥⌘B on a host element or layout primitive: `{name} is already plain markup — only Zen components detach.`
- Status line after detach (unchanged): `Detached {Component} · Draft · ⌘S to save   |   Detached {Component} · ⌘Z to undo`
- DetachDialog (unchanged): `Title 'Detach only this row?' · description 'Row {r} of {n} becomes Box/Stack/Text; the other rows stay {Component}.' · buttons 'Detach row' / 'Cancel'`
- Canvas right-click item label (was 'Detach component'): `Detach instance`
- Shortcuts dialog row (was 'Detach the selected component'): `Detach the selected instance`
- Part header row 2 (replaces 'Read-only — set by {Owner} at {file:line}'): `Part of {Owner} · read-only`
- Part menu item + caption (replaces the owner file-link button): `Show {Owner} in Code tab — caption: {file} · line {line}`
- Frame header row 2 (replaces the kind Badge): `Example frame | Playground frame | Docs frame | Document frame`
- Page header row 2 (replaces the 'Page' eyebrow above the title): `Page`

## Layout controls

### Principles

- Token-first, px always. Every scale value reads as token + px for that prop's own scale (gap lg = 24, padding lg = 20, radius follows the radius mode). The px is measured on the selected element with spacing.ts tokenPx, so the inspector and the canvas label always agree. Props accept tokens only, so a typed px snaps to the matching token or offers the nearest ones; it never writes raw px.
- One concept, one control. The section models Flow, Size, Alignment, Gap, Padding and Columns, not individual props. Each control writes whatever combination of props expresses the user's intent as ONE request, which is one undo step: Wrap = direction row + wrap; All sides = padding + remove paddingX/Y; Hug clears nothing it doesn't own.
- Figma muscle memory, Zen truth. Copy Figma UI3's arrangement, icon language and keys (arrows, W/A/S/D, X, B, Alt, scrubbing). Never pretend the API has something it lacks: no per-side padding, no free px, no Stack↔Grid flow swap, no space-around offered.
- Always show the effective value. An unset prop shows what actually renders (documented default, inherited from padding/gap, the parent's contextual default, or a parent-set value) in Content/Neutral/Base. A written value uses Content/Neutral/Strongest. Never show '—', 'Not set' or an empty field.
- Stable geometry. A control's width and type never depend on its value state. The 'Default' word column goes. Reset lives inside the control's popover and on ⌫, or in a fixed trailing slot sized like an xs IconButton (density-safe token).
- One gesture, one write. Commit on release, Enter, blur or pick, as AlignmentGrid already does. Hovering, scrubbing and arrow-key repeats never write. Escape reverts. This matters because every write is a POST, a draft, an undo record and an HMR reload.
- Relevance over completeness. Hide a prop that has no effect in the current configuration. If the source still writes it, show a one-line warning with Remove instead of a live-looking control.
- Read-only is honest and quiet. Bound and spread values show their live value and their source, can't be edited, and get one note per section, not a hint under every row. Viewer means disabled; spread means read-only, and the two look different.
- The ladder teaches. The gap list carries the user's relationship captions (2xs items · xs labels/toolbars · sm groups · md in-surface/fields · lg columns · xl page sections). ↑/↓ and scrubbing walk the common steps (none, 2xs–xl), which cover 100% of repo usage. Off-ladder tokens stay one modifier or one popover away.
- Compose only Zen. Use Segmented, InputField, NumberField, Popover/PopoverItem, IconButton, ToggleButton, Tooltip/useIconTooltip and the existing tokens. Studio composites (ScaleField, SizeField, AlignmentBox, ColumnsField) live in src/platform/studio/inspector/controls/. No new tokens, no new DS components, no new component props.
- Figma density. Group labels sit above multi-field groups, fields carry icon prefixes, and two fields share a row. A Stack's Layout section drops from 18 rows (about 1040 px) to about 6 visual rows (about 260 px).
- Keyboard and assistive parity. Every pointer gesture has a key. Icon-only controls get aria-label plus the 1 s name tooltip. ScaleField is a combobox with a listbox, the scrub handle is a slider, and the alignment box stays a radiogroup with roving focus.

### Section, top to bottom

PLACEMENT. For Stack, Grid, Box, Container, Form, FormFieldset and FormActions, the Layout section moves directly under the header, after Playground properties when that block is present and before Properties (Figma UI3 order). Text and Heading get a Layout section after their Text section that holds only the Size group. Shell: InspectorSection title “Layout” (Heading level 3, Body/Small/Bold). Section padding is padding-small (12). Rows inside a group are gap-xsmall (8) apart; groups are gap-small (12) apart (ladder: group). Multi-field groups use a new InspectorGroup: a label ABOVE the controls in Caption/Regular, Content/Neutral/Base, sentence case. Single full-width controls keep the label-left InspectorRow. Every row and group carries data-prop (the first prop it writes) so focusProp and 'Edit size' still work. The trailing slot is a fixed column sized with the xs IconButton token. It holds a reset only for controls without a popover. The word “Default” is removed everywhere. Width check at the 320 px default panel (295 px content): a pair is two fields of about 131 px each plus the slot. At 280 px they are about 111 px each, which still fits “2xs 4 ⌄”.

STACK (example: row, wrap, align center, justify between, gap xs, no padding):

0. Section note, only when a layout value is bound or spread. Caption/Regular: “2 values come from code. Change them in Playground properties.” plus Button flat primary xs “Show” (zen-allow-compact-button), which calls focusRow on the playground row. It replaces the per-row 'Use Playground properties' hints.

1. FLOW (no label). [Segmented size sm, fullWidth, aria-label “Direction”, icon-only items (label: null + aria-label): icon-arrow-down-line “Vertical” | icon-arrow-right-line “Horizontal” | icon-corner-down-left-line “Wrap”] [slot: IconButton appearance flat, level primary, xs, icon-reverse-left-line, aria-label “Reset direction”, shown only when direction or wrap is written]. The old Wrap toggle row is gone.

2. SIZE (group label “Size”). [W field][H field][slot: IconButton flat primary xs icon-ruler-line, aria-label “Min and max size”, opens a Popover: “Add min width” · “Add max width” · “Add min height” · “Add max height” · divider · “Remove min and max”]. Each field is an InputField sm. Leading is Caption/Medium “W” / “H”, which is also the scrub handle (cursor ew-resize, tooltip “Width · drag to change”). The value is “Hug” | “Fill” | “320” | “Auto” (unset). Trailing is the measured px in Caption/Regular, Content/Neutral/Base (“312”), plus icon-chevron-down-line.
   2b. Only when a min/max is written: a pair of NumberField sm, leading Caption/Medium “Min W” / “Max W”, trailing Caption “px”. A second pair appears for heights when those are written.
   2c. Only when the parent renders as a Stack or Grid: InspectorRow label “Align in parent” holding Segmented sm fullWidth with 4 icon-only items (see alignSelf).
   2d. Stack only: InspectorRow label “Children” holding Segmented sm fullWidth with the text items “Own size” | “Fill equally” (fillChildren).

3. ALIGNMENT + GAP (one line of two group labels: “Alignment” over the box, “Gap” over the right column). [Alignment box 76×64][right column, fills the rest][slot: IconButton xs icon-reverse-left-line “Reset alignment”, shown when align or justify is written; it removes both in one apply].
   Box: the existing 3×3 grid of 24×20 cells on Background/Neutral/Pale, corner-radius small.
   - Idle cells show a 4 px dot in Content/Neutral/Light.
   - The selected cell shows three bars of unequal length in Content/Accent/Base, turned across the flow (vertical bars for rows, horizontal for columns).
   - Hover shows the same bars as a ghost in Content/Neutral/Light.
   - Unset shows the effective cell's bars in Content/Neutral/Base: rows → middle-left; columns → bars stretched across the top row. Tooltip: “Default: rows centre items; columns stretch fields, buttons keep their width”.
   - Auto (justify between) collapses the box to 3 cross-axis lanes, with the bars spread along the main axis.
   - Stretch draws bars spanning the cross axis; only the 3 main-axis lanes are clickable.
   Right column:
   a) Gap ScaleField: leading icon-spacing-width-01-line (row) or icon-spacing-height-01-line (column), which doubles as the scrub handle. Value “xs”, trailing “8” plus chevron. In Auto: value “Auto”, trailing “min 8”.
   b) Segmented sm fullWidth, aria-label “Cross axis”, icon-only. Rows: icon-align-vertical-center-01-line “Position” | icon-chevron-selector-vertical-line “Stretch” | icon-type-01-line “Text baseline”. Columns: icon-align-horizontal-centre-01-line “Position” | icon-chevron-selector-horizontal-line “Stretch”.

4. PADDING (group label “Padding”).
   - Axial view: [ScaleField icon-spacing-width-02-line, aria-label “Horizontal padding”][ScaleField icon-spacing-height-02-line, “Vertical padding”][slot: IconButton xs icon-grid-dots-outer-line, aria-label “Same padding on all sides”, aria-pressed false, level tertiary].
   - Uniform view: [one ScaleField, full width, icon-grid-dots-outer-line, “Padding”][slot: the same IconButton, aria-pressed true, level secondary; zen-allow-secondary as a pressed toolbar toggle, the precedent being CodeView's 'Wrap lines'].
   - The view follows the source: uniform when only padding (or nothing) is written, axial when paddingX or paddingY is.
   - Mixed: if the user switches to uniform while X ≠ Y, the field reads “Mixed” with trailing “16 / 4”, and nothing is written until they pick a value.

5. NO-EFFECT WARNINGS, only when the source writes a prop that does nothing: .studio-inspector__note[data-tone=warning] with icon-alert-triangle-line plus Button flat xs “Remove”. Copy: “Wrap does nothing in a vertical stack.” · “Min column width is ignored while Columns is set.” · “Gap is ignored: row and column gaps are both set.” · “Side inset only applies when pinned.”

Result for a Stack: about 6 visual rows instead of 18.

GRID. No Flow row. Size as above. Group “Alignment”: Segmented sm fullWidth, aria-label “Align cells”, icon-only: icon-flex-align-top-line “Top” | icon-align-vertical-center-01-line “Middle” | icon-flex-align-bottom-line “Bottom” | icon-chevron-selector-vertical-line “Stretch” (default). Group “Gap”:
   - Linked: [ScaleField icon-layout-grid-01-line “Gap”][slot: IconButton xs icon-link-01-line, aria-label “Separate row and column gaps”, aria-pressed true].
   - Unlinked: [ScaleField icon-spacing-width-01-line “Column gap”][ScaleField icon-spacing-height-01-line “Row gap”][slot: icon-link-broken-01-line “Use one gap”].
   Group “Columns”: Segmented sm fullWidth with the text items “Auto-fit” | “Count” | “Tracks”, then one field. For a per-breakpoint object, an icon-only Segmented “Breakpoint” sits above the field: icon-phone-line “Mobile” | icon-tablet-line “Tablet” | icon-monitor-01-line “Desktop”. Group “Padding”: one ScaleField icon-grid-dots-outer-line “Padding”, with no toggle (Grid has no X/Y).

BOX. Size and Padding (axial/uniform). Surface, border and radius move to a new “Appearance” section directly below Layout (Figma's Fill / Stroke / Radius).

CONTAINER. InspectorRow “Max width” holds a ScaleField on the container scale: “lg” with trailing “1280”. InspectorRow “Page margin” holds ToggleButton sm, with the Caption hint “24 px on desktop and tablet, 20 px on mobile”.

FORM. Group “Gap”: one ScaleField (default lg).

FORMFIELDSET. Flow with 2 items (Horizontal tooltip “Horizontal (wraps)”). Group “Gap”: a ScaleField. When horizontal, its aria-label is “Gap between lines” and a Caption hint reads “Fields in a row are lg · 24 apart.”

FORMACTIONS. Group “Alignment”: Segmented sm fullWidth, icon-only: icon-flex-align-left-line “Start” | icon-distribute-spacing-horizontal-line “Space between” | icon-flex-align-right-line “End” (default). InspectorRow “Pin to bottom” holds a ToggleButton for sticky (moved here from Properties). When pinned, InspectorRow “Side inset” holds a ScaleField icon-spacing-width-02-line on the padding scale.

TEXT / HEADING. The Size group holds W only (H is not in their API), plus “Align in parent” when the parent is a Stack or Grid.

### Control specs

#### Stack direction + wrap
- Control: Flow Segmented (sm, fullWidth, icon-only, aria-label 'Direction'). Items: icon-arrow-down-line 'Vertical', icon-arrow-right-line 'Horizontal', icon-corner-down-left-line 'Wrap'. Reset sits in the trailing slot.
- Values: Vertical = setProp direction 'column' + removeProp wrap. Horizontal = setProp direction 'row' + removeProp wrap. Wrap = setProp direction 'row' + setProp wrap true. Each is one apply, one undo step. A pick writes exactly what was picked; the slot reset removes both props.
- States: Unset: Vertical is selected and the row is in the default tone. Literal: normal, with reset in the slot. Bound (either prop): read-only pill with icon-code-01-line, the expression in Body/Code, trailing the live value 'Horizontal'. Spread: Segmented disabled, slot shows icon-lock-01-line with the tooltip 'Set by {...rest}. Read-only here.' wrap written on a column: Vertical is selected and the warning 'Wrap does nothing in a vertical stack. Remove' shows. Viewer: disabled.
- Keyboard: Tab reaches each segment (Zen Segmented buttons); Enter/Space picks. The slot reset is a separate stop only while something is written. Backlog: roving focus in Segmented.

#### FormFieldset direction
- Control: The same Flow Segmented with 2 items: 'Vertical' | 'Horizontal' (tooltip 'Horizontal (wraps)').
- Values: column | row (a row always wraps; wrap is not a FormFieldset prop).
- States: Same as Stack. Unset shows Vertical in the default tone.
- Keyboard: Same as Stack.

#### Stack align + justify (positions)
- Control: AlignmentBox v2: the existing 76×64 radiogroup, moved to controls/AlignmentBox.tsx. Three accent bars mark the selected cell; ghost bars preview on hover; useIconTooltip replaces the native title. Cell names are 'Top left' … 'Bottom right', with the tooltip 'Top left · align start, justify start'.
- Values: 9 cells = align {start, center, end} × justify {start, center, end}, axes swapped by direction, written with one setProps. In Auto mode (justify between) the box shows 3 cross-axis lanes named 'Top' / 'Middle' / 'Bottom' for rows or 'Left' / 'Center' / 'Right' for columns; a click writes align only. In Stretch mode only the 3 main-axis lanes remain and a click writes justify only. 'around' (0 repo uses) is never offered; if the source has it, the box shows the Auto lanes, the gap field reads 'Around', and the gap popover lists 'Space around' as checked so it can be changed.
- States: Unset: ghost bars at the effective cell (rows: middle-left; columns: stretched top row), default tone. Literal: accent bars, with reset in the slot (removes align + justify). Bound: no box; read-only pills for whichever is bound, live values shown. Spread: box disabled, with the lock in the slot. Viewer: disabled.
- Keyboard: One Tab stop (roving). Arrows move a pending mark and write once on key release (already implemented). W/A/S/D jump to the top/left/bottom/right edge, keeping the other axis. X toggles Auto (justify between ↔ previous justify or removed). B toggles Text baseline (rows only). ⌫/Delete resets alignment. Esc drops the pending mark.

#### Stack align (stretch / baseline)
- Control: Cross-axis Segmented under the gap field (sm, fullWidth, icon-only, aria-label 'Cross axis'). Rows: 'Position' (icon-align-vertical-center-01-line), 'Stretch' (icon-chevron-selector-vertical-line), 'Text baseline' (icon-type-01-line). Columns: 'Position' (icon-align-horizontal-centre-01-line), 'Stretch' (icon-chevron-selector-horizontal-line).
- Values: Position: setProp align to the box's last cross position (center if none). Stretch: setProp align 'stretch'. Text baseline: setProp align 'baseline' (rows only).
- States: Unset in a column: Stretch is shown selected in the default tone, with the tooltip 'Default: fields stretch, buttons keep their width'. An explicit Stretch also stretches buttons, and its tooltip says so. Unset in a row: Position selected in the default tone. Baseline written on a column: Position selected plus the warning 'Text baseline only applies to rows. Remove'.
- Keyboard: Segment Tab stops, Enter/Space. B in the box toggles baseline.

#### gap (Stack, Grid linked, Form, FormFieldset)
- Control: ScaleField: an InputField sm combobox. Leading: a semantic icon that doubles as the scrub handle (role=slider). Value: the token in the field's text style. Trailing: px in Caption/Regular, Content/Neutral/Base, plus a chevron. Click, the chevron, Enter or Alt+↓ opens a Popover with PopoverItems. Row anatomy: label = token, caption = ladder role (+ ' · Default' on the component's default), trailing = px, selected = current. Item order: 'Reset to default · md 16' (only when written; leading icon-reverse-left-line), then Stack only 'Auto' with the caption 'Space between · gap becomes the minimum', a divider, none 0, 3xs 2, 2xs 4 'Items', xs 8 'Labels, toolbars', sm 12 'Groups', md 16 'In surfaces, fields', lg 24 'Columns', xl 32 'Page sections', then a divider with 2xl 40, 3xl 48, giant 64, xgiant 88 and 2xgiant 144.
- Values: Token keys of ZenGap only. px is measured with tokenPx on the element. A typed 'md', 'medium' or '16' resolves to md. An off-scale number such as 14 never writes; the list then shows 'No gap token is 14 px' with 'sm 12' and 'md 16' as the choices. Picking 'Auto' writes justify 'between' and keeps gap. Picking a scale row while in Auto writes gap and removes justify (Figma parity: a number leaves Auto). Alt+pick, or ↑/↓, changes only the minimum gap and keeps Auto.
- States: Unset: the effective default in the default tone (Stack md 16, Grid md 16, Form lg 24, FormFieldset sm 12 or md 16 for toggles, read from the DOM via keyForPx). Literal: Strongest tone; reset from the popover or ⌫. Auto: value 'Auto', trailing 'min 8'. Long spelling such as 'medium': shown as 'md'; the tooltip says 'Written as medium'; nothing is rewritten unless the user picks. Bound: pill '{gap}' with trailing 'md · 16', no scrub. Spread: InputField read-only state with trailing icon-lock-01-line. Viewer: disabled.
- Keyboard: Tab focuses the field. ↑/↓ move through the common steps (none, 2xs, xs, sm, md, lg, xl); Shift+↑/↓ move through the full scale. The value commits once on key release. Typing filters the list and Enter commits. Esc reverts or closes. ⌫/Delete on a fully selected value resets to default. Home/End go to none / xl. Alt+↓ opens the list. In the list: ↑/↓, typeahead, Enter, Esc.

#### Grid gap / rowGap / columnGap
- Control: Linked: one ScaleField 'Gap' (icon-layout-grid-01-line) plus a slot IconButton xs icon-link-01-line 'Separate row and column gaps' (aria-pressed true, secondary). Unlinked: a ScaleField 'Column gap' (icon-spacing-width-01-line) and a ScaleField 'Row gap' (icon-spacing-height-01-line), plus icon-link-broken-01-line 'Use one gap'.
- Values: Linked writes gap. Unlinking writes nothing; it shows two fields that both inherit gap. Editing one writes only rowGap or columnGap. Re-linking when both are written offers a Popover: 'Use md for both' / 'Use lg for both'. The pick writes gap and removes rowGap and columnGap in one apply.
- States: The view is unlinked whenever rowGap or columnGap is written. An unset axis shows the inherited gap in the default tone, with the tooltip 'From gap · md'. If both axes are set and gap is also written: warning 'Gap is ignored: row and column gaps are both set. Remove gap'. Bound and spread as for ScaleField.
- Keyboard: ScaleField keys on each field; the link is one Tab stop and toggles with Enter/Space.

#### padding / paddingX / paddingY (Stack, Box)
- Control: Padding group. Axial view: two ScaleFields, 'Horizontal padding' (icon-spacing-width-02-line) and 'Vertical padding' (icon-spacing-height-02-line). Uniform view: one ScaleField 'Padding' (icon-grid-dots-outer-line). A slot IconButton xs icon-grid-dots-outer-line 'Same padding on all sides' toggles the view (aria-pressed). Popover rows on the padding scale: none 0, 3xs 2, 2xs 4, xs 8, sm 12, md 16, lg 20, xl 24, then a divider with 2xl 32, 3xl 40, 4xl 48. No ladder captions; the default carries 'Default'.
- Values: An axial field writes paddingX or paddingY only. The uniform field writes padding, plus removeProp paddingX and paddingY when they are written (one apply, as SpacingLayer's Alt+click does). Alt+pick in an axial field writes both axes as padding (collapse). Switching the view to uniform writes nothing; the field shows 'Mixed 16 / 4' until the user picks.
- States: An axial field that is unset while padding is written shows the padding token in the default tone, with the tooltip 'From padding · md'. Nothing written: 'none 0' in the default tone. Mixed, as above. Bound and spread as for ScaleField. Precedence is always visible: paddingX beats padding.
- Keyboard: ScaleField keys. Alt+↑/↓ in an axial field steps both axes and collapses to padding. The view toggle is one Tab stop.

#### padding (Grid)
- Control: One ScaleField 'Padding' (icon-grid-dots-outer-line), with no view toggle, because Grid has no paddingX/paddingY.
- Values: ZenPadding tokens.
- States: As for ScaleField; unset shows 'none 0'.
- Keyboard: ScaleField keys.

#### fillChildren (Stack)
- Control: InspectorRow 'Children' with a Segmented sm fullWidth holding the text items 'Own size' | 'Fill equally'.
- Values: Own size = removeProp fillChildren. Fill equally = setProp fillChildren true.
- States: Unset: Own size in the default tone. While Fill equally is on, the AlignmentBox main axis collapses to lanes (the main axis is decided), and the children's W (row) or H (column) reads 'Fill · from parent'. Tooltip: 'Every child takes an equal share along the direction; a child's own width or height wins.'
- Keyboard: Segment Tab stops, Enter/Space.

#### width / height (Stack, Grid, Box); width (Text, Heading)
- Control: SizeField: InputField sm, leading Caption/Medium 'W' or 'H' as the scrub handle. Value 'Hug' | 'Fill' | the px number | 'Auto'. Trailing: measured px (sizeOf, zoom removed) plus a chevron. Popover items: 'Fixed width · 312' (caption 'Keep the current size'), 'Hug contents' (caption 'As wide as the content'), 'Fill container' (caption from the parent read off the DOM: 'Equal share of the row' / 'Stretch across the column' / 'Fill the grid cell' / 'Full width'), divider, 'Reset to auto' (when written).
- Values: 'hug' | 'fill' | number px (a positive integer). Typing a number gives Fixed; typing 'h' or 'hug' gives Hug; 'f' or 'fill' gives Fill.
- States: Unset: 'Auto' plus the measured px in the default tone, with the tooltip 'Not set: follows the parent (rows hug, columns stretch)'. Literal: the mode word or number in the Strongest tone, always with the measured px beside it (the lesson from Figma UI3's Hug/Fill complaint). A Fill whose parent is not a Stack or Grid gets the tooltip 'Fill = 100% of the container'. Bound and spread as for ScaleField. Viewer: disabled.
- Keyboard: ↑/↓ ±1 px; Shift ±8 px. On Hug/Fill/Auto, ↑/↓ converts the measured px to Fixed ±1, as Figma does. Typing plus Enter commits. ⌫ on a fully selected value resets. Alt+↓ opens the popover. Esc reverts. The scrub handle is a slider: 1 px per 2 px of pointer travel, Shift ×8.

#### minWidth / maxWidth / minHeight / maxHeight (px; Stack, Grid, Box, Text, Heading)
- Control: Hidden until written or added from the Size slot's 'Min and max size' popover. Then a pair of NumberField sm per axis, leading Caption/Medium 'Min W' / 'Max W' (or 'Min H' / 'Max H'), trailing Caption 'px'. When any limit is set, the W/H handle gains the tooltip suffix '· min 120 / max 640'.
- Values: Positive integers in px. Clearing the field removes the prop. 'Remove min and max' removes all four in one apply.
- States: Written: Strongest tone. A just-added field is prefilled in the default tone with the measured px and writes nothing until committed. Bound and spread as above.
- Keyboard: NumberField ↑/↓ ±1, Shift ±8 (wrapper onKeyDown). Enter/blur commit. Empty plus Enter removes the prop.

#### alignSelf
- Control: InspectorRow 'Align in parent', shown only when the parent renders as a Stack or Grid. Segmented sm fullWidth with 4 icon-only items. Parent row or Grid: icon-flex-align-top-line 'Top' | icon-align-vertical-center-01-line 'Middle' | icon-flex-align-bottom-line 'Bottom' | icon-chevron-selector-vertical-line 'Stretch'. Parent column: icon-flex-align-left-line 'Left' | icon-align-horizontal-centre-01-line 'Center' | icon-flex-align-right-line 'Right' | icon-chevron-selector-horizontal-line 'Stretch'. Reset sits in the slot.
- Values: start | center | end | stretch.
- States: Unset: the parent's effective align (computed align-self) is selected in the default tone, with the tooltip 'Follows the parent: center'. Literal: reset in the slot. Parent not a Stack or Grid but the prop is written: warning 'Align in parent needs a Stack or Grid parent. Remove'.
- Keyboard: Segment Tab stops, Enter/Space.

#### columns (Grid)
- Control: ColumnsField: Segmented sm fullWidth with the text items 'Auto-fit' | 'Count' | 'Tracks'. Auto-fit shows the minColumnWidth field. Count shows a NumberField sm with leading icon-columns-03-line, aria-label 'Columns', min 1, max 12, plus a 1–12 strip of mini cells in a Popover, opened from the field's chevron, to hover and click (Figma's interactive selector). Tracks shows an InputField sm (Body/Code) with the value '2fr 1fr' and, below it, a proportional preview bar of Background/Neutral/Pale segments. For a responsive object, an icon-only Segmented 'Breakpoint' sits above the mode control (icon-phone-line 'Mobile' | icon-tablet-line 'Tablet' | icon-monitor-01-line 'Desktop'), preselected from the frame's data-breakpoint. A slot IconButton icon-link-01-line 'Same on every breakpoint' collapses the object to a plain value.
- Values: Auto-fit = removeProp columns. Count = setProp columns N (number literal). Tracks = setProp columns 'string'. Responsive = setExpression columns '{ mobile: 1, desktop: 2 }'; only the edited key changes and the other keys keep their source text. Per-breakpoint editing is offered only after the client can read object literals; until then the object shows read-only with its summary.
- States: Unset: Auto-fit selected in the default tone. A number literal shows Count with that number; it no longer reads 'Bound to {2}' and has no contradictory Reset. Object: 'Responsive · 1 / – / 2' summary, with the breakpoints editable once supported. Bound to a variable: read-only pill with the live value. Viewer: disabled.
- Keyboard: Mode Segmented: segment stops. Count: ↑/↓ ±1. Tracks: text, with Enter/blur commit. Breakpoint Segmented: segment stops.

#### minColumnWidth (Grid)
- Control: Shown only in Auto-fit mode: a NumberField sm with leading icon-ruler-line, aria-label 'Min column width', and trailing Caption 'px'. A string length (e.g. '16rem') switches it to an InputField. Hint Caption: 'As many columns as fit, each at least 240 px.'
- Values: number px (default 240) or a CSS length string.
- States: Unset: 240 in the default tone. Written while columns is set: the field is hidden and the warning 'Min column width is ignored while Columns is set. Remove' shows.
- Keyboard: ↑/↓ ±8 (the 8-pt grid), Shift ±40; Enter/blur commits; emptying the field removes the prop.

#### maxWidth (Container)
- Control: InspectorRow 'Max width' with a ScaleField on the container scale. No scrub handle: 5 named widths. Popover rows: sm 640, md 960, lg 1280 'Default', xl 1440, full 'No limit'.
- Values: sm | md | lg | xl | full. px comes from the Container width tokens (computed) or the documented values.
- States: Unset: 'lg 1280' in the default tone. Long spelling normalised in the display. Bound and spread as above.
- Keyboard: ScaleField keys: ↑/↓ steps through all 5.

#### gutter (Container)
- Control: InspectorRow 'Page margin' with a ToggleButton sm. Hint Caption: '24 px on desktop and tablet, 20 px on mobile.'
- Values: true (default) | false. Turning it off writes gutter={false}; turning it back on removes the prop.
- States: Unset: on, in the default tone. Bound and spread: read-only.
- Keyboard: Space toggles.

#### align (Grid)
- Control: Group 'Alignment': Segmented sm fullWidth, aria-label 'Align cells', icon-only: 'Top' | 'Middle' | 'Bottom' | 'Stretch' (icons as in alignSelf for rows). It replaces the Select. No 3×3 box, because Grid has no justify.
- Values: start | center | end | stretch (default).
- States: Unset: Stretch in the default tone. Reset in the slot when written.
- Keyboard: Segment Tab stops, Enter/Space.

#### align (FormActions)
- Control: Group 'Alignment': Segmented sm fullWidth, icon-only: icon-flex-align-left-line 'Start' | icon-distribute-spacing-horizontal-line 'Space between' | icon-flex-align-right-line 'End'. Tooltip on Space between: 'First button alone on the left'.
- Values: start | between | end (default).
- States: Unset: End in the default tone. Reset in the slot when written.
- Keyboard: Segment Tab stops, Enter/Space.

#### sticky + inset (FormActions)
- Control: InspectorRow 'Pin to bottom' with a ToggleButton sm (sticky, moved into Layout). Only when pinned: InspectorRow 'Side inset' with a ScaleField on the padding scale, leading icon-spacing-width-02-line.
- Values: sticky boolean; inset ZenPadding tokens.
- States: inset written while sticky is off: the field is hidden and the warning 'Side inset only applies when pinned. Remove' shows. Unset inset: 'none 0' in the default tone.
- Keyboard: Space toggles; ScaleField keys.

### Other properties

- Box surface: an 'Appearance' section (Figma's Fill), placed directly below Layout. The control is a ScaleField-style picker whose Popover rows carry a 16 px swatch drawn with the real background token. Rows: 'none', 'surface' (caption 'Cards and panels on Canvas'), 'surface-alt' ('On a white canvas'), 'subtle', 'pale' ('Wells'). Captions come from the API description and the background-layers guideline. A surface on Canvas/Alt with no border gets a warning (memory rule: 'Surface on Canvas/Alt needs a border').
- Box border (Figma's Stroke): always a text Segmented 'none | pale | subtle'. Thanks to the fixed slot, it never flips to a Select. The tooltip quotes the border rule: 'Subtle if actionable, Pale if static'.
- Box radius and every ZenCornerRadius prop: a ScaleField on the radius scale. The px comes from the computed --zen-corner-radius-* token, so it follows the radius mode. Rows run none, 2xs to 3xl, then full ('Pill'). There is no ladder caption. The concentric-radius hint ('Outer = item radius + gap') goes in the field's tooltip when the box holds a padded child.
- Card spacing (and any other short scale): a Segmented with normalised short tokens and the px in each segment's tooltip ('md · 16', 'sm · 12'). normalizeScale runs before matching, which fixes the 'md | sm | small' bug. Card surface 'default | alt': when unset, the effective value is shown selected in the default tone, never an empty Segmented.
- Component size props (Button, Chip, Segmented, Input…): a text Segmented 'sm | md | lg' (it fits at 157 px). A size that a parent sets gets an inherited state: the effective value is shown selected in the default tone, with a Caption hint 'lg · set by FormActions' (from the existing text-source logic), instead of 'md · Default'.
- Text align: an icon-only Segmented: icon-align-left-line 'Start' | icon-align-center-line 'Center' | icon-align-right-line 'End'.
- Text truncate (boolean | number): an InspectorRow 'Truncate' with a ToggleButton. When it is on, a NumberField sm 'Lines' (min 1) appears. Lines 1 writes truncate; Lines ≥ 2 writes truncate={N}. Today a line clamp can't be set at all.
- Text tone and colour-role props: a ScaleField-style picker whose rows show a swatch plus the role name. Groups follow Content roles (Primary / Secondary / Tertiary for neutral; Strongest / Base for colour), per the content-colour-roles memory.
- Text style: keep the existing grouped TypographyControl, and show the resolved size and line height as trailing Caption text ('14 / 20').
- Booleans: always a ToggleButton with the effective default shown in the default tone, never a bare '—'.
- Plain number props in px: NumberField with a 'px' trailing Caption, a placeholder showing the effective value, ↑/↓ ±1 and Shift ±8.
- 'as' (rendered element): moves to the bottom of Properties as InspectorRow 'HTML element'. The SelectField options use the Body/Code text style.
- Object, function and ReactNode props (Card subAction, Value chips with .map()): a read-only chip showing a short kind summary ('Action', 'List of 6'), never a text field. Code is rendered without the ligature that turned '===' into a triple bar.
- Labels everywhere: sentence case from a propLabel map ('Min column width', 'Horizontal padding', 'Align in parent'). The label tooltip, after 1 s, shows the prop name in Body/Code plus the API description, also exposed as aria-description on the control. Labels never truncate in Layout, because label-above groups free the width.
- Playground properties: once the controls are proven, the playground portal rows (bridge.controlsSlot) should use the same Flow Segmented and ScaleField so a prop never has two different control types. This is a separate step because it also changes the classic UI.

### Not representable (show this instead)

- Per-side padding (Figma's T/R/B/L 'individual padding' expand, Webflow's box model): Zen only has padding, paddingX and paddingY. Show the Horizontal/Vertical pair plus the 'All sides' toggle; never show a 4-side expand. If a user asks for one side, the tooltip on the pair says 'Zen pads by axis'.
- Free px gap or padding (Figma numbers): the props accept tokens only. A typed px snaps to the token with that px; an off-scale value offers the nearest tokens ('No gap token is 14 px · sm 12 · md 16') and never writes.
- Separate row and column gap on a wrapping Stack: Stack has a single gap. Show one field with the tooltip 'Used between items and between wrapped lines'. Only Grid gets the linked/unlinked pair.
- FormFieldset column gap in a row: it is fixed at lg. Show the read-only Caption hint 'Fields in a row are lg · 24 apart'.
- justify 'around': there is no Figma equivalent and no repo usage. Don't offer it. If the source has it, the box shows the Auto lanes, the gap field reads 'Around', and the popover lists 'Space around' as checked so it can be changed.
- Space-evenly, row-reverse and column-reverse: not in the API. Show nothing.
- Grid horizontal alignment of cells (justify-items) and Grid direction: not in the API. Grid gets only the vertical 'Align cells' Segmented.
- Figma's Grid flow as a fourth Direction option (Stack → Grid): Stack and Grid are different components, so swapping them is structural. Don't offer it. The Detach work handles structure.
- Clip content (overflow), absolute position / ignore auto layout, strokes-included-in-layout, negative gap: no API. Don't show placeholders for them.
- Height for Text and Heading: width only. Size shows W only.
- Container width and height: only the maxWidth enum. Container's Size group is replaced by 'Max width' and 'Page margin'.
- Grid track sizing per track (Figma's Fixed / Fill / Hug per column) and cell spans: tracks are a CSS string and there are no span props. Show the 'Tracks' text field with a proportional preview bar, and no per-track editor.
- Per-breakpoint values for anything other than Grid columns: spacing tokens are single-mode, so the px is the same at every breakpoint and density. Don't show breakpoint chips elsewhere. The px shown is the one measured on the selected frame.
- Editing a bound expression (gap={dense ? 'xs' : 'md'}) or overriding a spread value: Studio's invariant is read-only. Show a pill with the live value and the expression in a tooltip, plus the section note pointing at Playground properties.
- Figma variable binding and detach UI: Zen values ARE tokens, so there is nothing to bind or detach. The token name is always the visible value; the px is secondary.
- Width or height as a percentage or CSS unit: LayoutSizing is 'hug' | 'fill' | number px. SizeField accepts numbers only and explains 'Use Fill for 100%'.

## Implementation

### Header (option B)

- `(process, before any edit)` — Needs the user's approval under the scope lock, and a hand-off to or coordination with the active 'Platform UI/UX redesign với canvas editor' session that owns src/platform/studio/* (SendMessage before touching its files). Per the user's rule, tar the files to be changed into backups/ first. The steps below are ordered so phase 1 (Element header + shared menu) ships alone; phase 2 (Part/Frame/Page) follows.
- `src/platform/studio/detachable.ts (new, runtime-free: no imports)` — export const DETACHABLE = ["Card","ListItem","MetricCard","Metric","EmptyState","DescriptionList","InlineMessage","Badge","Tag"] as const; export const isDetachableType = (name: string) => (DETACHABLE as readonly string[]).includes(name). Runtime-free so tools/studio/selftest.mjs can import it with Node type stripping, as history.selftest.mjs does with history.ts. The server's list in tools/studio/detach.mjs l.44 stays the source for recipes; the selftest keeps the two equal.
- `src/platform/studio/inspector/detach.ts` — detachShown(element, selection) uses isDetachableType(element?.name ?? selection.name) instead of offersDetach (l.316-317). Keep offersDetach for detachSelection's guard, but split its message: host tag or primitive → '{name} is already plain markup — only Zen components detach.'; capitalised and not detachable → client-side fail('{Name} can't be detached. Detach works on …') before calling the server. Leave detachShortcut, detachKeys, useDetachPlan, withRowCheck, rowOf, detachSelection's edit/undo/selection flow and the confirm store untouched. Add an exported shortReason(reason) = reason cut at the first ';' or ':' (trimmed, without a trailing '.') for menu captions.
- `src/platform/studio/inspector/propSchema.ts` — While building the components map (l.40-43), also record name → slug from the api.generated.json key, and export componentPage(name): string | null (null when the slug is not in pageLabels). No new data file and no generator change.
- `src/platform/studio/inspector/nodeActions.ts (new)` — Pure builder nodeMenuItems({ name, kind, file, line, vscodeUrl, page, currentPage, detach }) → MenuEntry[] (type-only import of MenuEntry from components/Menu), with the groups Code / Component / Structure and the copy above. detach = { shown: boolean, label: 'Detach instance' | 'Detach this row…', caption: string, disabled: boolean } is computed by the caller from DetachAvailability + editable + running (DesignPanel) or from its own plan reply (CanvasMenu). It also exports nodeKind(name) → 'zen' | 'primitive' | 'local' | 'element' and kindLabel(kind), taking componentSchema and primitiveNames as injected predicates so the module stays importable by a Node selftest.
- `src/platform/studio/inspector/DesignPanel.tsx (header block, currently ~l.596-630)` — Replace the header with: title row = existing kind-icon span + <Heading level={2} textStyle="Body/Base/Bold" truncate> + <Menu align="end" items={nodeMenuItems(...)} trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-dots-horizontal-line" aria-label={`Actions for ${name}`} />} />. Meta <p className={`studio-inspector__description ${typographyStyles["Body/Small/Regular"]}`}> = kindLabel + optional ' · ' + <Link href={pageHref(slug)} onClick={(e) => { e.preventDefault(); navigate(slug); }}>{pageLabels[slug]} page</Link>. Optional repeat <p> (same classes) when instances > 1, with copy depending on editable. Delete the Badge, the src-row Button (and its zen-allow-compact-button comment), <DetachAction/>, the warning-tone note and the read-only note. Keep the useDetachPlan call: it now feeds the menu's Detach item. Drop Badge, shortSrc and DetachAction imports if unused. The 'Show in Code tab' onSelect: studioStore.setState({ inspectorTab: 'code' }); requestAnimationFrame(() => document.getElementById('studio-inspector-tab-code')?.focus()).
- `src/platform/studio/inspector/DetachAction.tsx` — Remove the DetachAction component (the wrapper-span tooltip hack, VisuallyHidden reason, useIconTooltip/useId imports). Keep DetachDialog exactly as is (mounted once in StudioApp.tsx l.403).
- `src/platform/studio/inspector/inspector.css` — .studio-inspector__title-row gap → var(--zen-spacing-gap-2-xsmall, 4px) (icon + text = 2xs on the ladder) and min-height: 24px (so Page/Frame headers without a trigger keep the same row height). Delete .studio-inspector__src-row*, .studio-detach* and .studio-inspector__note[data-tone="warning"] once nothing uses them. .studio-inspector__src stays until phase 2 because PartPanel uses it. No new tokens: only existing --zen-spacing-gap-* variables.
- `src/platform/studio/shell/CanvasMenu.tsx` — Build items with nodeMenuItems(...) so right-click equals •••. The visibility test uses isDetachableType(selection.name) instead of offersDetach (l.41), and the Structure group is omitted for viewers and non-writable servers (canEdit() false). Label 'Detach instance'. Keep its own detachPlan fetch, withRowCheck and detachSelection call. Update the header comment l.12.
- `src/platform/studio/shell/ShortcutsDialog.tsx l.14` — Row label 'Detach the selected component' → 'Detach the selected instance' (still detachShortcut).
- `tools/studio/detach.mjs (copy only, optional in phase 1)` — notDetachable(): '<Avatar> has no detach recipe; …' → 'Avatar can't be detached. Detach works on Card, ListItem, …, Badge and Tag.' and the interactive variant likewise ('Button is interactive and can't be detached …'). Update any selftest assertions on these strings. The l.1 comment and tools/studio/README.md §3 heading become 'Detach instance'.
- `src/platform/studio/inspector/PartPanel.tsx, FramePanel.tsx, PagePanel.tsx (phase 2)` — Same recipe. Part: the meta line 'Part of {Owner} · read-only' replaces the note; keep the 'Select {Owner}' flat xs Button; move the owner file-link Button into a ••• Menu ('Show {Owner} in Code tab', caption '{file} · line {line}'). Frame: drop the kind Badge; the h2 shows exampleOf(page, frameId)?.title ?? frameLabel(...); the meta line is '{frameKind} frame'; the description is unchanged. Page: move the 'Page' eyebrow below the h2 as the meta line (Body/Small/Regular, Base) so all four headers read title → kind.
- `docs/context/HANDOFF.md + CHANGELOG.md` — Record the new header recipe, the DETACHABLE client copy + selftest guard, the 'Detach instance' rename and the removal of DetachAction (user rule: finishing work updates both).

> Header implementation notes above were written for option A; for B keep the DETACHABLE client list + selftest, the label/value rows reuse the inspector row grid, and Detach stays a visible tertiary sm Button (aria-keyshortcuts kept) with a visible caption instead of moving into a menu.

### Layout

- `src/platform/studio/inspector/propSchema.ts` — Add editor kinds { kind: 'sizing' } for '"hug" | "fill" | number' and { kind: 'columns' } for GridColumns, so they stop falling through to readonly. Add scaleFor(type) → 'gap' | 'padding' | 'radius' | 'container' | 'card' | null, keyed on ZenGap / ZenPadding / ZenCornerRadius / ContainerWidth. Keep the enum output of editorFor unchanged, because select/spacing.ts spacingOptions depends on it. Add propLabel(name), sentence-case labels with a camelCase fallback. Replace the layoutProps Set with layoutGroupOf(component, prop) → 'flow' | 'size' | 'alignment' | 'gap' | 'padding' | 'columns' | 'container' | 'actions' | null, scoping maxWidth: Container → container, Stack/Grid/Box/Text → size. Export normalizeOption(value, options) so long spellings match. Consider splitting the pure helpers (splitUnion, editorFor, literalOf) into a JSON-free propTypes.ts so Node selftests can import them; coordinate that with the owner session.
- `src/platform/studio/inspector/layoutModel.ts (new)` — Pure module with no JSON or CSS imports, so Node can import it directly as history.selftest.mjs does. readLayout(component, valueFor, measured) returns a view model: flow {mode, wrapNoEffect}; alignment {cross, main, effective, mode: position | stretch | baseline, auto}; gap {linked, gap, rowGap, columnGap, inherited}; padding {view: uniform | axial | mixed, all, x, y, source}; size {w, h, min/max, alignSelf, parentKind}; columns {mode, count, tracks, responsive}; warnings[]. Intent → EditOp[] builders: flowOps, alignOps, autoOps, crossOps, gapOps({keepAuto}), linkGapOps, paddingOps({collapse}), sizeOps, limitOps, columnsOps. Also the ladder table (key → caption) and the common-step list (none, 2xs–xl).
- `src/platform/studio/inspector/DesignPanel.tsx` — Keep changes minimal (the peer session is editing this file). (1) Extend FieldApi with apply(ops: EditOp[], label, optimistic), a thin wrapper over the existing send() so one gesture is one request and one undo step; setExpression(name, code) using EditValue {kind: 'expression', code}; element (the rendered host, for tokenPx / sizeOf / parent kind); and component. (2) Teach alreadyApplied to compare expression ops by normalised source text instead of literalOf, which returns undefined for objects. (3) Delete the inline LayoutSection and AlignmentGrid and mount the new LayoutSection. (4) Order sections: Layout first for layout components and after Properties otherwise; Appearance after Layout for Box. (5) Route sizing props (width, height, min/max, alignSelf, fillChildren) and FormActions sticky into Layout.
- `src/platform/studio/inspector/LayoutSection.tsx (new)` — The section described in sectionLayout, built from layoutModel plus the new controls. It owns the per-component composition for Stack, Grid, Box, Container, Form, FormFieldset, FormActions, Text and Heading; the section note for bound and spread values; and the no-effect warnings. Every write goes through api.apply / setProps / removeProp. Every group gets a data-prop.
- `src/platform/studio/inspector/controls/ScaleField.tsx (new)` — Composite of Zen InputField (sm, role=combobox, aria-expanded, aria-controls, aria-activedescendant) + Popover + PopoverItem (label, caption, trailing px, selected). Props: scale, options from spacingOptions/tokenPx (or the radius and container equivalents), defaultKey (effective from the DOM via keyForPx), icon, value state, extra items (Auto / Reset), onPick(key, {alt}). Typeahead with snap-to-token; off-scale suggestions; ↑/↓ ladder steps with a pending value committed on keyup or blur; ⌫ reset. No search box (13 rows or fewer).
- `src/platform/studio/inspector/controls/useScrub.ts (new)` — Pointer-capture scrub on a leading handle. role=slider, aria-valuetext ('md, 16 pixels'), cursor ew-resize. About 12 px of travel per step (Shift: full scale or ×8 px). Esc cancels; pointerup commits once. Optional onPreview hook, used in a later phase. Respects prefers-reduced-motion; there is no animation.
- `src/platform/studio/inspector/controls/SizeField.tsx (new)` — W/H field: InputField sm, leading 'W'/'H' handle via useScrub, mode word or px, measured px trailing (partInfo sizeOf), Popover with Fixed / Hug / Fill (parent-aware captions) / Reset. Plus the min/max NumberField pair and the 'Min and max size' slot popover.
- `src/platform/studio/inspector/controls/AlignmentBox.tsx (new; AlignmentGrid moved here)` — The v2 box: three-bar marks, ghost hover and default marks, Auto lanes and Stretch lanes, W/A/S/D/X/B and ⌫ keys, commit on keyup (already implemented), useIconTooltip instead of title=, and lane radios named Top/Middle/Bottom or Left/Center/Right. The CSS bars keep the zen-allow-slot-size note.
- `src/platform/studio/inspector/controls/ColumnsField.tsx (new)` — Grid columns: mode Segmented, Count NumberField plus the 1–12 strip popover, Tracks InputField plus the preview bar, the Auto-fit minColumnWidth field, and a breakpoint Segmented for objects. Object literals are read through a small parser for { mobile?, tablet?, desktop? } with number or string values; the object writes via api.setExpression.
- `src/platform/studio/inspector/Section.tsx` — Add InspectorGroup({label, labels?, name, children, action?}): the label-above variant with optional twin labels ('Alignment' / 'Gap'), a children grid, and a fixed action slot. Give InspectorRow an option to keep the action column fixed (slot = xs IconButton size token) and stop rendering the 'Default' word, which falls out of PropField.
- `src/platform/studio/inspector/PropField.tsx` — (1) EnumControl: normalise long spellings before matching (normalizeScale); never append a duplicate option. (2) The default branch shows a literal number or string as a value, not 'Bound to {2}', with no Reset on readonly. (3) Route editors whose scaleFor is not null to ScaleField (Box radius, Card spacing, Container maxWidth, inset) and kind 'sizing' to SizeField. (4) Bound pill: icon-code-01-line + expression + trailing live value. Spread: the InputField read-only state with icon-lock-01-line (Segmented: disabled plus the lock in the slot). (5) Fixed action slot, and no 'Default' word.
- `src/platform/studio/inspector/inspector.css` — New classes, token-only: .studio-layout__group, __pair (grid: 1fr 1fr slot), __split (box | column), __lanes, __bars, __preview-bar, and the warning note reuse. Change the row grid's third column from auto to the slot token. Delete the styles for the alignment cell title text. Spacing: group gap-small, row gap-xsmall, section padding-small. Style-guard: radius action-* or input-*, colour roles only; a dark-mode check comes free through the tokens.
- `src/platform/studio/inspector/hoverBus.ts (new) + src/platform/studio/select/SpacingLayer.tsx` — A tiny emitter (not the persisted studio store) carrying {src, prop, key?}. ScaleField emits it on field hover or focus and on popover-row hover. SpacingLayer subscribes and emphasises the matching gap or padding area, showing the hovered row's label ('gap · lg · 24'). Hovering never writes. A later, optional live preview would set a transient inline custom property on the canvas host and remove it on commit or cancel; ship it only if it proves safe with HMR.
- `src/platform/studio/select/spacing.ts` — Reuse spacingOptions, tokenPx, defaultKey and keyForPx as they are. Only export gapKeys and paddingKeys (read-only consumers). No behaviour change, so the canvas picker stays identical.
- `src/platform/studio/inspector/layoutModel.selftest.mjs (new) and /Users/vuduong/Documents/Zen-CodeBase/Zen-DS/tools/studio/selftest.mjs` — Unit cases for readLayout and every intent builder. Server cases for multi-op requests: direction + wrap; padding plus removing X/Y; gap plus removing justify; removing align + justify; the columns expression write and the alreadyApplied expression compare.
- `tools/studio/inspector-probe.mjs (new)` — Read-only Playwright probe against ?ui=studio. It selects nodes via picker.ts findBySrc/selectHit, as the audit's capture.mjs did, then asserts the DOM contracts and geometry and that no POST happens on hover, focus, Escape or scroll. Write tests run only against the standalone Studio (vite.studio.config.ts, port 5180) on a scratch fixture, never against the shared 5173 drafts.
- `docs/research/zen-studio-spec-2026-10-02.md, docs/context/HANDOFF.md, CHANGELOG.md, docs/context/BACKLOG.md` — Rewrite spec §6.4 Layout to match this design. Add HANDOFF and CHANGELOG entries per phase. Add BACKLOG items: roving focus for Zen Segmented (DS-level; one Tab stop per group); playground rows reusing the same controls; optional live preview.

### Phases (Sizing / resizing = the Studio owner's SizingSection.tsx, not in this list)

- Phase 0, gate (no code). Get the user's approval (scope lock), then agree file ownership with the Studio owner session 'Platform UI/UX redesign với canvas editor' via SendMessage. New files land under inspector/controls/ and LayoutSection.tsx so the DesignPanel.tsx diff stays small. This env reports Zen-DS is not a git repo, so tar the touched files into backups/ before the first edit and report the path.
- Phase 1, bug fixes with no new UI (S). Remove the duplicate align/justify Fields. Show literal columns={2} as '2' without the contradictory Reset. Normalise Card 'small'. Make the action slot fixed and drop the 'Default' word so widths and types stop flipping. Scope maxWidth by component. Add human labels and data-prop on Direction and Alignment. Test: selftests, inspector-probe geometry assertions, npm run qa.
- Phase 2, ScaleField (M, the biggest win). Token + px + ladder captions, Reset item, typeahead with snap-to-token, ↑/↓ ladder steps with one commit on release. Wire it to gap, rowGap, columnGap, padding, paddingX, paddingY, inset, plus radius and Container maxWidth in Properties. No scrub yet. Test: the probe checks the value matches the SpacingLayer label for the same area; POST count is 1 per gesture.
- Phase 3, FieldApi.apply + layoutModel + Flow + Padding (M). Add apply, setExpression and element to FieldApi; layoutModel.ts with its selftest; the Direction + Wrap Segmented; the padding axial/uniform toggle with inherited and mixed display; the Grid gap link; no-effect warnings. Test: multi-op server selftests (one undo step), layoutModel cases.
- Phase 4, Alignment box v2 (M). Bars, ghost defaults, Auto lanes and the Gap 'Auto' item, the Cross-axis Segmented (stretch/baseline), W/A/S/D/X/B and ⌫ keys, useIconTooltip. Grid 'Align cells' and the FormActions align Segmented. Test: aria-checked for every align/justify combination in the layout page fixtures, and one write per arrow gesture.
- Phase 6, Grid columns (M/L). Auto-fit / Count / Tracks, then per-breakpoint objects via setExpression plus the object-literal reader, plus the alreadyApplied expression compare. Test: expression round-trip selftest; the other breakpoint keys stay byte-identical.
- Phase 7, polish (S each, separately approvable). Scrub handles (useScrub) on ScaleField and SizeField; the hoverBus → SpacingLayer area emphasis; the Appearance section (Box surface swatches, border, radius); Text truncate and align. Optional: live preview during scrub. After each: npm run qa, both selftests, the Studio probe, screenshots at 280/320/480 px in light and dark, then update HANDOFF and CHANGELOG.

### Tests

- tools/studio/selftest.mjs (extend): import DETACHABLE from ../../src/platform/studio/detachable.ts and assert it deep-equals detach.mjs's DETACHABLE, so the client can never offer a type the server refuses, or hide one it supports. Update any string assertions if notDetachable() copy changes.
- src/platform/studio/inspector/nodeActions.selftest.mjs (new, same pattern as history.selftest.mjs, run with node): nodeKind table: Avatar→zen, ListItem→zen, Stack/Box/Text/Heading→primitive, PhoneApproveExample→local, div/h2→element. nodeMenuItems cases: Avatar has no item with id 'detach'; Card + editable has label 'Detach instance', shortcut detachShortcut and enabled; viewer has no 'Structure' group; .map row has label 'Detach this row…' and a caption matching /Row \d+ of \d+/; refused has disabled:true with a non-empty caption; loading has caption 'Checking…'; every item has an icon (menu.md: all or none); group order is Code → Component → Structure; 'Open {X} page' is absent when page === currentPage; shortReason() output contains no ';' and is ≤ 60 chars for every refusal string in detach.mjs.
- npm run usage:check: must stay clean on src/platform/studio (the IconButton has an aria-label, the Link has a real href, no zen-allow-compact-button left in DesignPanel, no Secondary). npx tsc --noEmit. npm run qa as the build gate (it renders the classic UI, so it does not cover the Studio; the manual pass below does).
- Manual matrix at http://localhost:5173/?ui=studio, at inspector widths 280px and 400px, as Admin and as Viewer, and with the dev server read-only (never pressing Save or an enabled Detach on real drafts): Avatar button.tsx:397 (no Detach anywhere: header, •••, right-click; ⌥⌘B shows the status reason); single Card (Detach works, draft + Undo); ListItem .map row (dialog); DescriptionList with layout={…} (disabled item with visible caption); div/h2 host; Box; local component; Part; Frame; Page; a long name (BackgroundExportExample at 280px). Check the header height stays 77px for every element without a Repeated line.
- Keyboard-only pass: Tab reaches [•••] then the Link; Enter opens the menu with the first item focused; 'Show in Code tab' leaves focus on the Code tab (not BODY); Escape returns focus to the trigger. VoiceOver: the trigger is announced as 'Actions for Avatar, menu button'; the Link as 'Avatar page, link'.
- Optional browser test, if the header markup is pulled into a small local render helper composed only of Zen Heading/Icon/IconButton/Menu/Link: tests/interaction/studio-node-header.test.tsx (vitest browser, include tests/**). Assert one h2, no button whose name matches /detach/i in the header, trigger name 'Actions for Avatar', the opened menu contains the visible caption text of a disabled Detach, the Link href contains 'page=avatar', and an axe pass is clean.
- layoutModel.selftest.mjs, read: unset Stack → flow vertical, cross 'smart stretch' (column) or center (row), gap md effective. A row with justify between → auto true, box lanes. wrap written on a column → wrapNoEffect warning. padding md + paddingX lg → view axial, x lg (literal), y md (inherited from padding). rowGap and columnGap both set while gap is written → 'gap ignored' warning. minColumnWidth written while columns is set → warning. inset written while sticky is off → warning. A spread or bound value on any prop → read-only flags.
- layoutModel.selftest.mjs, intents → exact EditOp[]: Wrap → [setProp direction 'row', setProp wrap true]; Vertical from wrap → [setProp direction 'column', removeProp wrap]; uniform padding from axial → [setProp padding, removeProp paddingX, removeProp paddingY]; a gap pick while Auto → [setProp gap, removeProp justify]; Alt+pick while Auto → [setProp gap]; re-link Grid gap → [setProp gap, removeProp rowGap, removeProp columnGap]; reset alignment → [removeProp align, removeProp justify]; Count 3 → setProp columns 3 (number); responsive desktop 3 → expression with the other keys unchanged.
- tools/studio/selftest.mjs: each multi-op request is applied atomically, the file has one undo record, and conflicting ops on one prop are rejected. The expression write formats as columns={{ mobile: 1, desktop: 3 }}. alreadyApplied returns true for a re-sent identical expression op after a stale hash.
- propSchema cases, once the pure helpers are importable: '"hug" | "fill" | number' → sizing; 'GridColumns' → columns; ZenGap → enum + scaleFor 'gap'; ZenPadding → 'padding'; ZenCornerRadius → 'radius'; ContainerWidth → 'container'. spacingOptions output is unchanged for every layout prop (a snapshot guards the canvas picker).
- inspector-probe.mjs, read-only on 5173 with ?ui=studio. Covers the same nodes as the audit: layout.tsx:119/111/475/87/54/488/476/117/276/187/213/109, form.tsx:148/164/379/168, text.tsx:77, card.tsx:517. Asserts: no SelectField remains in Layout for scale props; no duplicate align/justify; every Layout group has data-prop; the ScaleField text equals the SpacingLayer label (token + px) for the same area; Stack Layout section height ≤ 320 px at 320 px panel width; zero POSTs across hover, focus, popover open, Escape and selection changes.
- Geometry: control widths are identical (±0.5 px) for unset, literal, bound and spread states at panel widths 280, 320 and 480. No horizontal overflow and no truncated Layout labels. A Segmented never flips to a Select because of state. Screenshots in light and dark.
- Gestures, on the standalone Studio (5180) with a scratch fixture: hold ↑ 5× on gap then release → exactly 1 POST and 1 undo step; scrub 4 steps then release → 1 POST; Esc mid-scrub → 0 POSTs; 3 arrow moves in the alignment box → 1 POST; typing '14' + Enter → 0 POSTs plus the nearest-token suggestions.
- Accessibility (axe on the inspector, plus targeted checks): ScaleField has role combobox and a listbox with aria-activedescendant; the scrub handle is a slider with aria-valuetext; the alignment box is a radiogroup with one tab stop and named lanes in Auto; every icon-only control has an aria-label and shows its tooltip after 1 s hover and at once on focus; Stack Tab-stop count ≤ 16 (≤ 10 once Segmented roving lands).
- Roles: in Viewer, every Layout control is disabled and hovering a field still emphasises the canvas area. A bound prop shows a pill with its live value and never opens a popover. A spread prop shows the read-only state (not disabled) and its lock tooltip.
- Gates: npm run qa (style-guard and usage-guard cover src/platform, including Segmented 2–5 options, icon-only names, token-only CSS, zen-allow notes); node src/platform/studio/history.selftest.mjs; node tools/studio/selftest.mjs; node src/platform/studio/inspector/layoutModel.selftest.mjs.

## Open questions still to settle with the user

- Gap 'Auto' semantics: Figma parity, where picking a number leaves Auto (writes gap and removes justify), with Alt+pick or ↑/↓ to change only the minimum gap while staying in Auto. Or should a gap pick always keep justify? Recommended: Figma parity.
- Picking a value equal to the documented default (Stack gap md, direction column): write it explicitly, as the codebase does (gap='md' appears 533 times), or remove the prop to keep the JSX minimal? Recommended: write what the user picks; only Reset removes.
- ↑/↓ stepping: walk only the common ladder (none, 2xs–xl) with Shift for the full scale, or walk the full scale? Recommended: ladder first.
- Should off-ladder gap tokens (3xs, 2xl, 3xl, giant, xgiant, 2xgiant; 0 repo uses) be grouped under a 'Larger' divider, or also carry a soft 'Off the spacing ladder' caption?
- Padding default view: follow the source (uniform when only padding is written) or always the Figma H/V pair? Recommended: follow the source.
- Cross-axis Stretch/Baseline as a small 3-icon Segmented under the gap field (always visible), or behind an overflow like Figma's advanced settings? Recommended: visible, since align='stretch' appears 31 times.
- fillChildren as the row 'Children: Own size | Fill equally' in the Size group. Is that the right name and place for you?
- Spread-fed props stay read-only (current Studio invariant). Do you ever want an explicit 'Override here' that writes the prop after the {...rest}?
- Hide no-effect props (and warn only when the source writes them), or show them dimmed with a reason? Recommended: hide plus warn.
- Live canvas preview while scrubbing or hovering popover rows (a transient inline style on the canvas node), or only highlight the area plus the label and let HMR show the result after commit?
- Roving focus for the Zen Segmented component (one Tab stop per group) is a DS-level change to a shared component. Approve it as separate DS work, or keep it in the Backlog?
