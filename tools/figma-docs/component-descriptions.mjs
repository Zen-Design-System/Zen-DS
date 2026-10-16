// Descriptions of the Zen Figma component sets, written for designers and AI agents working in Figma. Distilled from
// the guidelines (tools/usage-guard/guidelines.source.mjs), the usage rules (docs/component-usage-rules.md) and the
// harness; written to the live file by tools/figma-docs/build.mjs (README there). Keys are the exact set names.
// Rich text (descriptionMarkdown): **bold** and "- " lists only.

/** A component's description: what it is, when to use it, what to use instead, its key properties, its rules. */
function card({ what, use = [], instead = [], props = [], rules = [], code }) {
  const parts = [what];
  if (use.length) parts.push(`**Use for**\n${use.map((line) => `- ${line}`).join("\n")}`);
  if (instead.length) parts.push(`**Use something else**\n${instead.map((line) => `- ${line}`).join("\n")}`);
  if (props.length) parts.push(`**Properties**\n${props.map(([name, text]) => `- **${name}**: ${text}`).join("\n")}`);
  if (rules.length) parts.push(`**Rules**\n${rules.map((line) => `- ${line}`).join("\n")}`);
  if (code) parts.push(`Code: ${code} (Zen DS)`);
  return parts.join("\n\n");
}

/** A building block that sits inside another component. */
const part = (what, owner, extra = "") => `${what}\n\nBuilding block of ${owner}: place ${owner}, not this primitive${extra ? `, ${extra}` : ""}.`;

const LEVELS = "Primary: the one main action of an area · Tertiary: every other action, the most common · Secondary: rare, a highlight that must stay visible · Accent: promoted CTAs only (upsell, onboarding) · Danger / Danger Subtle: destructive · Positive / Positive Subtle: confirming · Surface: on imagery or a coloured fill";
const STATE_REAL = "Hover, Pressed and Focused show the real interaction; pick Disabled only while a precondition is unmet, and say why nearby";

export const componentDescriptions = {
  // ❖ Button
  "Button/Main": card({
    what: "The labelled button: triggers an action on the current surface (save, submit, open, delete).",
    use: ["Committing or cancelling a task in forms, dialogs, toolbars and cards.", "The default pair is Tertiary (dismiss) + Primary (commit), Primary last, on the right."],
    instead: ["Choosing a filter, sort, scope or period → Chip/Advanced.", "Switching views or sections → Segmented or Tab-Bar.", "Going to another page → a link or a Sidebar item."],
    props: [["Level", LEVELS], ["Size", "XSmall–XLarge; Small and below hug their label, a full-width button is Medium or larger; phone footers use Large"], ["State", STATE_REAL]],
    rules: ["One Primary per area; never two Primaries side by side.", "Labels start with a verb, 1–3 words, naming the outcome (never OK, Yes, Submit).", "Use Danger for irreversible actions and repeat the dialog's verb (Delete project)."],
    code: "`<Button>`",
  }),
  "Button/Flat": card({
    what: "A labelled button with no fill until hover: the quietest action, for inline and low-emphasis actions that sit in text or on a surface without a frame.",
    use: ["Inline actions next to content (Show all, Learn more).", "Low-emphasis actions in dense areas where a Tertiary frame would be noisy."],
    instead: ["Cancel or dismiss beside a Primary → Button/Main Level=Tertiary (the default pair).", "Close or dismiss icons in Dialog, Modal/Forms and Side-Panel headers → Button/Icon-Flat Small."],
    props: [["Level", "Primary (neutral text) · Accent"], ["State", STATE_REAL]],
    code: "`<Button appearance=\"flat\">`",
  }),
  "Button/Overlay": card({
    what: "A labelled button for imagery, video and dark media: its fills stay legible over photos.",
    use: ["Actions over hero images, media players and photo cards."],
    instead: ["Any plain Canvas or Surface → Button/Main."],
    props: [["Level", "Inverse · White · White Overlay · Black Overlay — pick by the image underneath"], ["State", STATE_REAL]],
    code: "`<Button appearance=\"overlay\">`",
  }),
  "Button/Icon-Main": card({
    what: "An icon-only button with the same levels as Button/Main, for dense toolbars and headers.",
    use: ["Toolbar and header actions whose icon is universally understood (Edit, Delete, More)."],
    instead: ["An action whose icon is ambiguous → Button/Main with a label.", "Row actions in tables and list trailing slots → Button/Icon-Flat Medium."],
    props: [["Level", LEVELS], ["Icon-Src", "swap only to a different icon; re-setting the current icon loses the level's colour"], ["State", STATE_REAL]],
    rules: ["Every icon-only action shows its name in a Tooltip (after 1 s of hover).", "Same pairing rules as Button/Main: one Primary per area."],
    code: "`<IconButton>`",
  }),
  "Button/Icon-Flat": card({
    what: "An icon-only button with no fill until hover: the standard row, list and header action.",
    use: ["Row actions in tables (Actions-Cell) and List-Item trailing slots, at Medium.", "Close and dismiss in Dialog, Modal/Forms and Side-Panel headers (Primary, Small)."],
    instead: ["The main action of an area → Button/Main Primary."],
    props: [["Level", "Primary (neutral) · Secondary · Accent · Danger · Positive"], ["State", STATE_REAL]],
    rules: ["Every icon-only action shows its name in a Tooltip.", "Keep one or two per row; move the rest into a More (⋯) menu."],
    code: "`<IconButton appearance=\"flat\">`",
  }),
  "Button/Icon-Overlay": card({
    what: "An icon-only button for imagery, video and dark media (play, close a viewer, fullscreen).",
    instead: ["Plain Canvas or Surface → Button/Icon-Main or Button/Icon-Flat."],
    props: [["Level", "Inverse · White · White Overlay · Black Overlay — pick by the image underneath"], ["State", STATE_REAL]],
    code: "`<IconButton appearance=\"overlay\">`",
  }),

  // ❖ Badge
  "Badge": card({
    what: "A non-interactive label for a status, category or attribute (Live, Failed, Draft).",
    use: ["Statuses in tables and lists (Badge-Cell), categories, short attributes."],
    instead: ["Selectable filters → Chip.", "Values chosen inside a field → Tag.", "Counts → Badge-Counter."],
    props: [["Theme", "the colour family; pick it by meaning (Green done, Red failed, Yellow waiting), Neutral for plain labels"], ["Background", "Subtle (default, text in the family's Strongest) · Solid (high emphasis, On-Colors text)"], ["Size", "XSmall–Medium; match the row's text size"]],
    rules: ["Never colour alone: the text says the status.", "Keep it to one or two words."],
    code: "`<Badge>`",
  }),
  "Badge-Counter": card({
    what: "A small count (unread, items) attached to a navigation item, tab, chip or icon.",
    instead: ["A status or label → Badge.", "A count that only says something is new → the Notification-Dot."],
    props: [["Theme", "Accent or Red for attention, Neutral for plain totals"], ["Size", "XSmall–Medium, one step smaller than its host's text"]],
    code: "`<BadgeCounter>`",
  }),

  // ❖ Breadcrumbs
  "Breadcrumbs": card({
    what: "Shows where the page sits in a hierarchy and lets people go up a level.",
    use: ["Pages three or more levels deep, file browsers, child pages under a master page header."],
    instead: ["Flat apps and step flows → no breadcrumbs (Stepper for steps).", "A single level up → a Back action named after the parent."],
    rules: ["The last item is the current page and is not a link.", "Keep labels equal to the page titles they lead to."],
    code: "`<Breadcrumbs>`",
  }),
  "Primitives/Breadcrumbs/Item/Slot": part("One crumb of Breadcrumbs (a link and its separator dash).", "Breadcrumbs", "fill its Item-List slot"),

  // ❖ Bottom Sheet (Mobile)
  "Bottom-Sheet": card({
    what: "A phone surface that slides up from the bottom for supplementary content, a short task or a list of actions, without leaving the screen.",
    use: ["Contextual actions for the screen or an item (Type=Action).", "A short form, filters or a single-choice list such as Sort by (Type=Modal)."],
    instead: ["Destructive confirmations → Modal/Dialog.", "Long flows or many fields → a new screen.", "Desktop side details → Side-Panel."],
    props: [["Type", "Action: a list of actions · Modal: header, content and actions"], ["Size", "Flex grows with its content · Max-Fixed keeps the maximum height"]],
    rules: ["Container fill (layer 4): Cards and List-Boxes inside take Theme=On-Container.", "Footer actions are Large and full width, Primary on top."],
    code: "`<BottomSheet>`",
  }),
  "Bottom-Sheet/Modal": card({ what: "A phone example (390 × 844) of a modal Bottom-Sheet over its Overlay; in your own screen, place Bottom-Sheet Type=Modal on a state frame." }),
  "Primitives/Sheet-Actions/Item": part("One row of a Bottom-Sheet's action list or single-choice list (Pressed and Single-Selected states).", "Bottom-Sheet", "one Item per action in its Items slot"),

  // ❖ Card
  "Card": card({
    what: "A surface that groups the content about one object: a project, a plan, a KPI, a widget.",
    use: ["Grids of objects people scan and pick.", "Dashboard widgets (title in Heading/Subheading).", "A selectable option with rich content (Active=Yes marks the choice).", "Non-row content inside overlays (Description List, labelled toggles)."],
    instead: ["Page sections that are only spacing → auto layout, no card.", "Rows of List-Items → Component/List-Box.", "Comparable rows → a Table on the canvas.", "Messages → Inline-Message."],
    props: [["Theme", "pick by where it sits — Flat on Canvas/Default (the default pairing) · Shadow beside a default (shadowed) Sidebar · Border on a white page, inside another surface or when clickable · On-Container inside a Modal, Side-Panel or Bottom-Sheet · Pale on imagery"], ["Spacing", "Medium (Card-padding-medium, 2XLarge corners) · Small (Card-padding-small, Large corners)"], ["Active", "Yes only for the selected card of a choice; never as decoration"]],
    rules: ["One theme per grid.", "No card inside a card, and no shadow on a Pale card.", "A clickable card holds no buttons, links or inputs."],
    code: "`<Card>`",
  }),

  // ❖ Chip/Pill
  "Chip/Advanced": card({
    what: "The Zen filter control: a chip that opens its own popover of options to filter, sort or scope content.",
    use: ["Filters, sort order, scope, status, owner and period pickers.", "On dashboards, in the header's Control-Bar row next to Search."],
    instead: ["An action → Button.", "A read-only status → Badge.", "A value inside a field → Tag.", "Switching views → Segmented."],
    props: [["State", "Default · Hover · Focused from interaction; Press while its popover is open (draw the open popover on a state frame); Placeholder before a value is picked"], ["Theme", "Text-Only · Leading-Icon · Leading-Photo (people pickers)"], ["Size", "Small in dense toolbars, Medium otherwise"]],
    rules: ["A period or date-range picker is a Chip/Advanced, never a Button.", "Show the picked value in the label; multiple picks show a count."],
    code: "`<Chip variant=\"advanced\">`",
  }),
  "Chip/Normal": card({
    what: "A toggleable pill for topics and quick choices (on/off), usually in a wrapping group.",
    use: ["Topic or interest pickers, quick suggestions, a single-choice row of options."],
    instead: ["Filters with a list of options → Chip/Advanced.", "Statuses → Badge."],
    props: [["Level", "Primary · Secondary"], ["Theme", "Text-Only · Leading-Icon · Leading-Photo"], ["State", "Default · Hover · Focused; the selected look comes from the Select property"]],
    code: "`<Chip variant=\"normal\">`",
  }),
  "Chip/Number-Only": card({
    what: "A compact chip that shows only a number (a count or a page), static unless it is selectable.",
    instead: ["A count on a navigation item or icon → Badge-Counter."],
    code: "`<Chip variant=\"number-only\">`",
  }),

  // ❖ Checkbox
  "Checkbox/Text": card({
    what: "A checkbox with its label: select zero, one or many independent options, or confirm a statement.",
    use: ["Multi-select lists and settings that apply on Save.", "Consent that gates a primary action."],
    instead: ["A setting that applies instantly → Toggle.", "One of many → Radio-Button."],
    props: [["Select", "No · Yes; Checkbox/Mark Type=Indeterminate for a partly selected parent"], ["Caption", "a second line that explains the option"], ["State", STATE_REAL]],
    code: "`<Checkbox>`",
  }),
  "Checkbox/Mark": part("The bare checkbox box (Default or Indeterminate) without a label.", "Checkbox/Text", "unless the label sits elsewhere (a table's Control-Cell, a select-all header)"),

  // ❖ Color Selector
  "Color-Selector": card({
    what: "One swatch of a small curated colour set; a row of them picks a colour for labels, tags, events or chart series.",
    instead: ["A status with a meaning → a Badge theme chosen by the system.", "Any colour (hex) → a colour field."],
    props: [["Select", "Yes marks the picked swatch"], ["Status", "Default · Hover · Focused"]],
    code: "`<ColorSelector>`",
  }),

  // ❖ Divider
  "Divider": card({
    what: "A 1px line between groups of content.",
    use: ["Between groups of rows, settings sections or list blocks.", "Between toolbar groups (vertical).", "Under a total line (High)."],
    instead: ["Framing a box → the container's border (Subtle if actionable, Pale if static).", "Space → a spacing variable, never an empty line."],
    props: [["Color", "Default (Pale) is the everyday rule · Medium (Subtle) · High (Solid) only when the design calls for emphasis; a dashed line steps up to Subtle"]],
    code: "`<Divider>`",
  }),

  // ❖ Dock Icon
  "Dock-Icon": card({
    what: "A rounded, filled icon tile that identifies an app, category, file type or object.",
    use: ["The leading visual of List-Items and table Dock-Icon-Cells.", "Metric-Card icons (Background=Solid by default).", "Category marks (Subtle) and emoji reactions (Theme=Emoji)."],
    instead: ["People → Avatar.", "A clickable icon → Button/Icon-*.", "A status → Badge."],
    props: [["Theme", "the colour family; Surface / Pale / Inverse / On-Color for special backgrounds"], ["Background", "Solid (icon in On-Colors) · Subtle"], ["Size", "XSmall–XLarge; 44px in Side-Panel and Dialog headers"]],
    rules: ["Never repaint the icon: the variant gives its colour."],
    code: "`<DockIcon>`",
  }),

  // ❖ Date Picker
  "Date-Picker/Single-Calendar": card({
    what: "The calendar panel for one date (with an optional time picker and actions), opened from Input/Date-Field.",
    instead: ["A date in a form → Input/Date-Field (it owns this panel).", "Known far-past dates (birthdays) → a typed Date-Field."],
    props: [["State", "Default · Select-Month-Year (the month/year grid)"], ["Time-Picker / Actions", "on when the value needs a time or an explicit OK"]],
    code: "`<DatePicker>`",
  }),
  "Date-Picker/Dual-Calendar": card({
    what: "Two months side by side for picking a date range (bookings, reports).",
    instead: ["One date → Date-Picker/Single-Calendar.", "Phones → Date-Picker/Mobile."],
    code: "`<DatePicker selectionMode=\"range\">`",
  }),
  "Date-Picker/Mobile": card({
    what: "The phone date picker, shown in a Bottom-Sheet: one month with Cancel / OK, or stacked months for a range.",
    props: [["Variant", "Single · Multiple-Default · Multiple-Selected (a range)"]],
    code: "`<DatePickerSheet>`",
  }),

  // ❖ Description List
  "Description List": card({
    what: "Read-only term → value pairs: order summaries, receipts, contact and profile details, specs and metadata.",
    use: ["Details of one record in a Card, Side-Panel or Bottom-Sheet, closed by one total row when it sums up."],
    instead: ["Records people compare or sort → Table.", "Rows people open → List-Item.", "Editable values → Input fields."],
    props: [["Layout", "Inline (term and value on one row) · Stacked (narrow panels, long values)"], ["Divider", "Yes between rows of long lists"]],
    rules: ["Values are not headings."],
    code: "`<DescriptionList>`",
  }),

  // ❖ Empty State
  "Empty-State": card({
    what: "Explains why a screen or region has nothing to show and what to do next.",
    use: ["First run: one Primary action that creates the first item.", "No results: echo the query and offer to clear the filters.", "No permission: explain and offer to request access."],
    instead: ["Loading → Skeleton.", "An error that needs a retry → Inline-Message (Negative) with an action.", "A single empty cell → a short line of text."],
    rules: ["One clear action at most; the title says what is missing, the text says why or what next.", "It sits on the canvas, not in a card."],
    code: "`<EmptyState>`",
  }),
  "Empty-State/Illustration/Placeholder": part("The icon illustration at the top of an Empty-State (swap the icon to match the missing content).", "Empty-State"),

  // ❖ Inline Message
  "Inline-Message": card({
    what: "A message on a Subtle surface, placed inside the content it describes; it stays until resolved or dismissed.",
    use: ["Context for a form or section (You're editing production).", "The result of an action next to where it happened.", "A summary of form errors above the fields.", "Theme=Custom with your own visual for announcements."],
    instead: ["Page- or app-wide conditions → Alert-Banner.", "Transient feedback → Toast-Message.", "One field's validation → the field's error text.", "A blocking decision → Modal/Dialog."],
    props: [["Theme", "Neutral · Info · Warning · Negative · Custom"], ["Action / Close", "one action that resolves it; Close only when it can be dismissed"]],
    code: "`<InlineMessage>`",
  }),

  // ❖ List-Item
  "List-Item": card({
    what: "One row of a vertical list: a leading visual, a title with an optional caption, and trailing actions, a value or a chevron.",
    use: ["People, messages, files, approvals and settings lists.", "Drill-down navigation lists (Interactive=Yes with a passive chevron)."],
    instead: ["Data compared across columns → Table.", "Options in a popover → Primitives/Popover/Item.", "A grid of objects → Card."],
    props: [["Interactive", "Yes when the whole row opens or selects something; No for static rows"], ["State", "Default · Hover · Pressed · Selected (Interactive=Yes only)"], ["Leading", "Avatar (40px), Dock-Icon or thumbnail; one size per list"], ["Trailing", "Button/Icon-Flat Medium (one or two), a value, a Badge or a chevron"]],
    rules: ["Rows sit in a Component/List-Box; never pad the rows yourself.", "Row titles are Body/Base/Bold and are not headings.", "No Toggle or Checkbox on a clickable row."],
    code: "`<ListItem>`",
  }),
  "Component/List-Box": card({
    what: "The box that holds a group of List-Item rows, with an optional header and footer; one component for every device.",
    use: ["Lists of people, approvals, files, settings groups on desktop and phones."],
    instead: ["Content that is not List-Item rows (a Description List, labelled toggles, a form) → Card."],
    props: [["Theme", "pick by where it sits — Flat on Canvas/Default and on a Surface-Alt phone screen · Shadow beside a default Sidebar · Border on a white page or inside another surface · On-Container inside a Modal, Side-Panel or Bottom-Sheet · Pale on imagery"], ["Header / Footer", "a title row (kicker or Subheading) and a footer action (View all)"]],
    rules: ["Grouped settings: one List-Box per group, a kicker (Body/Small/Bold, Light) above it.", "Rows are spaced by its Body-Slot; never add padding to rows."],
    code: "`<ListBox>`",
  }),

  // ❖ Modal & Dialog
  "Modal/Dialog": card({
    what: "A blocking dialog for a decision: destructive confirmations, unsaved-changes guards, blocking success or failure.",
    use: ["Confirming an irreversible action (title as the question: Delete “Marketing site”?)."],
    instead: ["Non-blocking feedback → Toast-Message.", "A 3–8 field create or edit flow → Modal/Forms.", "Reading a record's details → Side-Panel.", "Hints → Tooltip or Popover."],
    props: [["Theme", "Default · Info · Positive · Warning · Negative (with Danger actions for irreversible ones)"], ["Device", "Desktop · Mobile (350 of 390, at the bottom, stacked full-width actions)"], ["Custom", "a slot between the text and the actions"]],
    rules: ["Actions: Tertiary + Primary; the primary repeats the title's verb.", "Never open a dialog from a dialog.", "Title in Heading/3 (Heading/4 on phones)."],
    code: "`<Dialog>`",
  }),
  "Modal/Forms": card({
    what: "A modal form for short create and edit flows (3–8 fields), with a header, the form and an action row.",
    instead: ["A confirmation → Modal/Dialog.", "Long or multi-step flows → a page.", "Details beside a list → Side-Panel."],
    props: [["Layout", "Basic 440 · 1-3 (240px side column) · Half-Half · 3-4 · Big 960"], ["Close / Default-Header / Top-Customize", "header parts; Close is Button/Icon-Flat Small"]],
    rules: ["Container fill: Cards and List-Boxes inside take Theme=On-Container.", "Title in Heading/2; fields stacked Spacing/Gap/Medium apart."],
    code: "`<ModalForm>`",
  }),
  "Overlay": card({
    what: "The scrim behind a Modal/Dialog, Modal/Forms, Side-Panel (Type=Modal) or Bottom-Sheet (Color/Background/Overlay).",
    rules: ["Place it under the modal on a state frame; never use it as a page fill."],
  }),

  // ❖ Metric Widget (Dashboard)
  "Metric-Card": card({
    what: "A dashboard KPI tile: one key number with its label, an identifying icon and how it changed.",
    use: ["KPI rows at the top of a dashboard, next to Chart cards."],
    instead: ["A series over time → Chart.", "Many comparable numbers → Table.", "Progress toward a goal → Progress-Bar."],
    rules: ["Theme follows the screen's pairing (Flat on Canvas/Default, Shadow beside a default Sidebar).", "Type=KPI is a Title-Highlight Metric (Large), laid out like the other types: the title on top, the number and trend at the foot, the Dock-Icon in the corner.", "Its Dock-Icon is Background=Solid.", "The value is not a heading; the trend says up or down in text, not only colour."],
    code: "`<MetricCard>`",
  }),
  "Primitives/Metric/Metric-Inline/Icon-Highlight": card({
    what: "An inline metric led by a Dock-Icon: summary rows above tables or charts, a figure inside a card or panel.",
    props: [["Size", "XSmall–XLarge; one size per row of metrics"], ["Trend / Counter / Metric-Title", "turn on what the figure needs"]],
    code: "`<Metric>`",
  }),
  "Primitives/Metric/Metric-Inline/Title-Highlight": card({
    what: "An inline metric led by its title, with optional trend, hint, action and a custom slot (KPI tiles, summary rows).",
    props: [["Size", "XSmall–XLarge"], ["Action", "a Button/Icon-Main Tertiary (keep its icon colour: swap, never re-set)"]],
    code: "`<Metric>`",
  }),

  // ❖ Popover
  "Popover/Default": card({
    what: "The shared floating list behind Chip/Advanced, Input/Select-Field, Autocomplete and Leading/Trailing pickers; also the action menu.",
    use: ["Option lists (single or multiple), sort menus, assignee pickers with Search.", "A row's ⋯ menu (Edit, Duplicate, Delete)."],
    instead: ["Rich interactive content or forms → Modal/Forms.", "Short hints → Tooltip."],
    props: [["Search", "on for long lists"], ["Label", "a group label over the options (a label, not a heading)"]],
    rules: ["Popover fill (layer 5): it floats above everything; draw it on a state frame with its trigger in the Pressed state.", "Group items, destructive ones last."],
    code: "`<Popover>` · `<Menu>`",
  }),
  "Primitives/Popover/Item": part("One option or action of a Popover/Default (Hover and Single-Selected states, optional caption and trailing).", "Popover/Default", "one Item per option in its Item-List"),
  "Popover/Manual-Add-New": card({ what: "A popover with a field to add an option by hand (a new tag, label or list entry that is not in the list yet)." }),
  "Scroll-Bar": card({ what: "The custom scrollbar (track and thumb) of a scrolling area inside a panel, list or popover." }),
  "Popover/Bulk-Action": card({
    what: "The floating bar under a table while rows are selected: Clear selection, the count and icon actions for the selection.",
    rules: ["At most five actions, labelled with how many rows they touch (Archive 3 projects).", "Actions that do not fit move into a More menu."],
    code: "`<Table bulkActions>`",
  }),

  // ❖ Progress
  "Progress-Bar": card({
    what: "Determinate progress of a task, a step or a quota.",
    use: ["Uploads, setup checklists, quotas and budgets (Theme=Status)."],
    instead: ["Unknown duration → Skeleton.", "Ratings or scores → Rating."],
    props: [["Theme", "Accent · Neutral · Status (Low red, Medium yellow, Good and Done green)"], ["Layout", "Inline · Stacked (label and value above the bar)"], ["Progress", "None · Low · Medium · Good · Done"]],
    code: "`<ProgressBar>`",
  }),
  "Progress-Circle": card({
    what: "Circular progress with an optional label and value, for compact places (a card corner, a list trailing).",
    code: "`<ProgressCircle>`",
  }),
  "Progress-Circle/Icon": card({
    what: "A small progress ring that turns into a check when done; a status mark for steps and checklists.",
    props: [["Theme", "Neutral · Accent · Red · Orange · Yellow · Green · Blue"], ["Done", "Yes shows the check"]],
    code: "`<ProgressCircle variant=\"icon\">`",
  }),

  // ❖ Pagination
  "Pagination": card({
    what: "Moves through a large ordered result set one page at a time.",
    use: ["Tables and result lists where position matters (page 3 of 10)."],
    instead: ["Short lists that fit on one screen → show them all.", "Continuous feeds → load more."],
    props: [["Theme", "Primary · Secondary · Inline · Manually (a page-size choice or a jump-to-page field for data tables)"]],
    code: "`<Pagination>`",
  }),

  // ❖ Rating
  "Rating/Star": card({
    what: "Star rating input for reviews and quick feedback on an item.",
    instead: ["A read-only average → Rating-Display.", "Precise scores → a number field or Slider."],
    props: [["Theme", "Default · Neutral · Accent"], ["Size", "XSmall–XLarge"]],
    code: "`<Rating>`",
  }),
  "Rating-Display": card({ what: "A read-only rating (stars with the average, fractions allowed).", code: "`<RatingDisplay>`" }),
  "Rating/Opinion-Scale": card({ what: "An emoji scale (2, 3 or 5 faces) for how an experience felt.", code: "`<OpinionScale>`" }),
  "Rating/NPS-Scale": card({ what: "The 0–10 (or 0–5) recommendation question with its bottom and top criteria.", code: "`<NpsScale>`" }),

  // ❖ Radio Button
  "Radio-Button/Radio-Button": card({
    what: "A radio with its label: pick exactly one option from a small visible set.",
    use: ["2–6 options worth comparing side by side (plans, density)."],
    instead: ["Long lists → Input/Select-Field.", "View switching → Segmented.", "An instant on/off → Toggle."],
    props: [["Select", "one Yes per group"], ["State", STATE_REAL]],
    code: "`<RadioButton>`",
  }),
  "Radio-Button/Radio-Mark": part("The bare radio mark without a label.", "Radio-Button/Radio-Button", "unless the label sits elsewhere (a table's Control-Cell, a radio card)"),

  // ❖ Search
  "Search/Default": card({
    what: "The search field: find or filter content by typing.",
    use: ["Filtering a visible list or table as people type (the header's Control-Bar row).", "Global or entity search with results below."],
    instead: ["A form value → Input/Text-Field.", "A choice from a short known list → Input/Select-Field or Chip/Advanced."],
    props: [["Theme", "Default · Filter-Icon · Filter-Dropdown (a filter affordance at the end)"], ["State", "Default · Hover · Focused · Typing · Inputted — a field that shows a query is Inputted"], ["Size", "Small in dense toolbars, Medium otherwise"]],
    rules: ["Never a Text-Field with a magnifier icon instead.", "In a toolbar, keep it about 320px wide."],
    code: "`<Search>`",
  }),
  "Search/Popover": card({ what: "The search field at the top of a Popover/Default list (pickers with many options).", code: "`<Popover search>`" }),

  // ❖ Slider
  "Slider/Horizontal": card({
    what: "Picks a value from a continuous or stepped range by dragging, where the relative position matters more than the exact number.",
    use: ["Volume, brightness, zoom, size.", "Stepped quantities with visible limits."],
    instead: ["Exact numbers → Input/Number field.", "A few discrete options → Segmented or Radio-Button.", "On/off → Toggle."],
    props: [["Theme", "Neutral · Accent · White (on imagery)"], ["Size", "Small · Medium · Large"], ["State", "Default · Hover · Hold · Disabled"]],
    code: "`<Slider>`",
  }),
  "Slider/Field": card({
    what: "A number field that is also a slider: the whole field is the track, the Fill shows the value inside min–max, the label sits left and the number right. Drag anywhere to scrub (State=Dragging), click to type an exact number (State=Typing, the fill hides), arrow keys step.",
    use: ["Tuning values in dense property panels and inspectors: offset, scale, opacity, duration, bounce.", "Rows beside Input/Inline-Field: the same height, radius and label position."],
    instead: ["A value tuned by feel, with no number to read → Slider/Horizontal.", "An exact quantity with steppers in a form → Input/Number field.", "2–5 named options → Segmented."],
    props: [["Theme", "Neutral (Background/Neutral/Subtle fill) · Accent (Background/Accent/Subtle)"], ["Size", "Medium 40 · Small 32, the Input sizes and tokens"], ["State", "Default · Hover · Dragging · Typing · Disabled"], ["Label · Value", "text properties: what it changes, and the number with its unit (\"2 px\", \"0.50 s\", \"60%\")"]],
    rules: [
      "Set the value with the Track frame padding-right: the remaining share × the width (60% of 320 → 128), as Slider/Horizontal sets its Track-Wrapper.",
      "Pick min, max and step so the fill means something: the whole field is the range.",
      "The border is a top \"Border\" layer (same radius, inside stroke), not the root stroke: a root stroke would clip the Fill 1px inside the edge and leave a gap at the corners.",
    ],
    code: "`<SliderField>`",
  }),

  // ❖ Sidebar
  "Side-Bar/Master/Basic": card({
    what: "The app's primary navigation for desktop: header (workspace or account), sections of items, nested items and a footer.",
    use: ["App shells with five or more destinations."],
    instead: ["In-page section switching → Tab-Bar.", "Phones → Top-Navigation/Mobile and Bottom-Navigation."],
    props: [["Expand", "Yes: labels shown · No: the icon rail"]],
    rules: ["Every page shows its current row with Select=Yes; a selected child opens its parent group.", "Child rows sit in a gap-0 Child frame after their parent and carry no icon.", "The screen's surfaces follow the Sidebar: a shadowed Sidebar on Canvas/Default takes Shadow cards."],
    code: "`<Sidebar>`",
  }),
  "Side-Bar/Master/Small-Density": card({ what: "The Sidebar in the small density (tighter rows) for dense tools; same rules as Side-Bar/Master/Basic.", props: [["Expand", "Yes · No (icon rail)"]], code: "`<Sidebar>`" }),
  "Side-Bar/Master/Workspace": card({
    what: "The two-level Sidebar: a workspace bar (apps or workspaces) beside the navigation of the chosen one.",
    props: [["Master-Background", "Flat · Default · Inverse"]],
    code: "`<Sidebar variant=\"workspace\">`",
  }),
  "Primitives/Side-Bar/Menu-Item/Master": part("One navigation row of the Sidebar (Master or Child level, Select, counter, notification dot, trailing action).", "Side-Bar/Master/*", "and set Select=Yes on the current page's row (Child rows carry no icon)"),
  "Primitives/Sidebar/Menu-Item/Section-Title": part("The title of a Sidebar section, with an optional action.", "Side-Bar/Master/*"),

  // ❖ Stepper
  "Stepper-Bar/Horizontal": card({
    what: "Progress through a multi-step, sequential process (2–7 steps) and where the user is in it.",
    use: ["Checkouts, onboarding, imports and setup wizards."],
    instead: ["Peer views → Tab-Bar or Segmented.", "A percentage → Progress-Bar."],
    code: "`<Stepper>`",
  }),
  "Stepper-Bar/Vertical": card({ what: "The vertical stepper, beside the step content when steps have longer titles or captions, or as a read-only status tracker.", code: "`<Stepper orientation=\"vertical\">`" }),

  // ❖ Skeleton
  "Skeleton/Body-Text": card({
    what: "Placeholder lines that mirror text while it loads.",
    instead: ["A button's own action in progress → the button's busy label.", "Measurable progress → Progress-Bar."],
    code: "`<SkeletonText>`",
  }),
  "Skeleton/Heading-Text": card({ what: "A placeholder for a heading while it loads.", code: "`<SkeletonHeading>`" }),
  "Skeleton/Shapes": card({ what: "Placeholder shapes for avatars, icons, thumbnails and buttons while they load.", props: [["Shape", "Pill · Round · Square · Rectangle, sized like the element it stands for"]], code: "`<SkeletonShape>`" }),

  // ❖ Segmented
  "Segmented": card({
    what: "Switches between 2–5 mutually exclusive views or sections of the same content.",
    use: ["View switchers (grid ↔ list), section switchers with counters (Inbox · Mentions), a period switch."],
    instead: ["Filtering data → Chip/Advanced.", "More than five options or long labels → Tab-Bar or Input/Select-Field.", "Form answers → Radio-Button."],
    props: [["Level", "Secondary (default) · Primary"]],
    code: "`<Segmented>`",
  }),
  "Primitives/Segmented/Item": part("One option of a Segmented (label, icon or both, optional Badge).", "Segmented", "one Item per option"),

  // ❖ Side Panel / Side Sheet
  "Side-Panel": card({
    what: "Shows a record's details, many filters or an edit form next to the page without leaving it.",
    use: ["Record details from a list or table row (Type=Modal).", "Many filters at once (Type=Modal, Size=Small).", "A persistent inspector beside a canvas (Type=Standard)."],
    instead: ["Destructive or blocking confirmations → Modal/Dialog.", "Short messages → Toast-Message or Inline-Message."],
    props: [["Type", "Modal (over the page with an Overlay) · Standard (beside the page)"], ["Size", "Default · Small"]],
    rules: ["Header through Header-Contents with a 44px Dock-Icon; body fills so Actions sit at the bottom.", "Group content like a settings screen: a kicker over each block, Cards and List-Boxes with Theme=On-Container."],
    code: "`<SidePanel>`",
  }),

  // ❖ Tab
  "Tab-Bar": card({
    what: "Switches between related panels of content at the same level.",
    use: ["Settings pages and detail views with sections (Style=Indicator).", "Compact switches inside cards (Style=Subtle)."],
    instead: ["Filtering → Chip/Advanced.", "Sequential steps → Stepper.", "App navigation → Sidebar."],
    props: [["Style", "Indicator (underline, page level) · Subtle (filled, inside cards)"]],
    code: "`<Tabs>`",
  }),
  "Primitives/Tab-Item": part("One tab of a Tab-Bar (label, icon, Badge; Select and Disabled).", "Tab-Bar", "one Item per tab"),

  // ❖ Tag
  "Tag": card({
    what: "A chosen value inside a field (keywords, recipients), usually removable.",
    use: ["Autocomplete selections, keyword inputs, the Tag-Cell of a table."],
    instead: ["Statuses → Badge.", "Filters → Chip/Advanced."],
    props: [["Theme", "Text-Only · Leading-Photo (people) · Leading-Icon"], ["State", "Default · Hover · Focused · Error · Disabled"], ["Remove", "Yes shows the × to remove it"]],
    code: "`<Tag>`",
  }),

  // ❖ Table
  "Table/Cell/Default": card({
    what: "The body cell of a table: holds one kind of content (text, avatar, badge, tag, trend, progress, a control or actions) and its states.",
    use: ["Data with several comparable attributes per record (members, invoices, files)."],
    instead: ["One or two attributes per item → List-Item.", "Key/value details of one record → Description List."],
    props: [["State", "Default · Hover · Focused · Edit (an editor: a cell that shows a value sets its nested input to State=Typing) · Selected (a selected row)"], ["Align", "Left for text · Right for numbers and amounts"], ["Content", "slot: one Primitives/Table/Cell/* per cell"]],
    rules: ["A page-level table sits on the canvas at full width, with a Heading/4 title above it; only a dashboard widget's table goes in a Card.", "Inside a surface (Card, Accordion, Side-Panel, Modal) the last row has no bottom stroke.", "Row actions are Button/Icon-Flat Medium in the last column; a ⋯ menu for several."],
    code: "`<Table>`",
  }),
  "Table/Cell/Header": card({
    what: "A column header cell (All-Caps/S, Light): a label, optional sort, a select-all checkbox or a custom slot.",
    props: [["Type", "None · Sort · Checkbox (select all) · Custom"], ["Align", "match the column: Right for numbers"]],
    code: "`<Table columns>`",
  }),
  "Primitives/Table/Header": card({ what: "The header row of a table: one Table/Cell/Header per column, aligned like the body cells under it (Right for numbers)." }),
  "Primitives/Table/Data-Row": card({ what: "One body row of a table: one Table/Cell/Default per column, one row per record.", rules: ["One primary text per row (Bold in the main column) and at most one caption.", "Inside a surface, the last row has no bottom stroke."] }),
  "Primitives/Table/Cell/Text-Cell": part("Text content of a cell: one primary text (Bold for the row's main column) and an optional caption.", "Table/Cell/Default"),
  "Primitives/Table/Cell/Avatar-Cell": part("A person in a cell: Avatar (Background=Solid by default) with a name and optional subtext.", "Table/Cell/Default"),
  "Primitives/Table/Cell/Group-Avatar-Cell": part("A group of people (Avatar/Stack) with a label in a cell (teams, shared with).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Photo-Cell": part("A thumbnail with a label and optional subtext in a cell (products, files).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Basic-Icon-Cell": part("An icon with a label and optional subtext in a cell.", "Table/Cell/Default"),
  "Primitives/Table/Cell/Dock-Icon-Cell": part("A Dock-Icon with a label and optional subtext in a cell (apps, categories).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Progress-Cell": part("A Progress-Bar in a cell (Neutral, inline).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Badge-Cell": part("Status Badges in a cell; the text says the status, never colour alone.", "Table/Cell/Default"),
  "Primitives/Table/Cell/Tag-Cell": part("Tags in a cell (labels, keywords).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Trend-Cell": part("An up, down or neutral trend with its value in a cell.", "Table/Cell/Default"),
  "Primitives/Table/Cell/Control-Cell": part("A Checkbox, Radio-Button or Toggle in a cell (row selection or an on/off column).", "Table/Cell/Default"),
  "Primitives/Table/Cell/Actions-Cell": part("Row actions: Button/Icon-Flat Medium, in the last column.", "Table/Cell/Default", "with one or two actions, or a ⋯ menu for more"),
  "Primitives/Table/Cell/Editabled-Cell": part("The editor of an editable cell (Table/Cell/Default State=Edit).", "Table/Cell/Default", "and make only the fields people routinely correct editable"),

  // ❖ Toggle
  "Toggle": card({
    what: "A switch with its label: turns a setting on or off with immediate effect.",
    use: ["Settings that apply at once (notifications, sync)."],
    instead: ["Choices that apply on Save → Checkbox.", "One of several options → Radio-Button or Segmented."],
    props: [["Theme", "Text-First (label left) · Toggle-First"], ["Size", "Small · Medium · Large (phones: Medium or larger)"], ["Select", "No · Yes"]],
    code: "`<Toggle>`",
  }),
  "Toggle-Button": part("The bare switch without a label.", "Toggle", "unless the label sits elsewhere (a List-Item's trailing on a static row, a table's Control-Cell)"),

  // ❖ Tooltip
  "Tooltip": card({
    what: "Names or briefly describes a control on hover (after 1 s) and keyboard focus.",
    use: ["Icon-only buttons, truncated text, keyboard shortcuts."],
    instead: ["Essential information or anything interactive → Popover or inline help.", "Touch-only screens → visible labels."],
    props: [["Color", "Default · Accent · White Overlay · Black-Overlay"], ["Size", "Small · Medium"]],
    code: "`<Tooltip>`",
  }),

  // ❖ Toast-Message (Snack)
  "Toast-Message": card({
    what: "Brief, non-blocking feedback about something people just did or the system just finished.",
    use: ["Confirming a completed action (Changes saved), ideally with Undo.", "Background results to act on (Export ready → View)."],
    instead: ["Decisions → Modal/Dialog.", "Persistent page conditions → Alert-Banner.", "Field validation → the field's error."],
    props: [["Type", "Neutral · Subtle · Info · Positive · Warning · Negative"], ["Actions", "at most one action (Undo, View)"]],
    rules: ["One short sentence; the title says what happened."],
    code: "`useToast()` · `<Toast>`",
  }),

  // ❖ Uploader
  "Uploader/File-Upload": card({
    what: "Adds files by dropping or browsing, then tracks each file's upload.",
    use: ["Attachments, documents and media in forms (Type=Drag & Drop).", "A single avatar or logo (Type=Browse Button, a photo thumbnail)."],
    instead: ["A link → Input/Text-Field.", "Files already uploaded → a list or media picker."],
    props: [["Type", "Drag & Drop · Browse Button"], ["State / File List", "Default · Uploaded; None · Single File · Multiple Files"]],
    code: "`<FileUpload>`",
  }),
  "Primitives/Uploader/DragDrop-Field": part("The drop zone of Uploader/File-Upload (dashed Subtle border; Hover, Dragover, Focus and Alert states).", "Uploader/File-Upload"),
  "Primitives/Uploader/File-Item": part("One file in the upload list: name, size, thumbnail and its state (Uploading, Uploaded, Replaceable, Alert).", "Uploader/File-Upload"),

  // ❖ Avatar
  "Avatar/Single": card({
    what: "Represents a person or a workspace with a photo or initials.",
    use: ["People lists, assignees, account switchers, chat."],
    instead: ["Brand logos and categories → Dock-Icon.", "Decorative illustrations."],
    props: [["Theme", "Photo, or a colour family for initials"], ["Background", "Solid (initials in On-Colors; the default in table Avatar-Cells) · Subtle"], ["Size", "2XSmall–3XLarge: 40px (Medium) in list rows, 32px in captioned popover items"], ["Status", "the presence dot"]],
    code: "`<Avatar>`",
  }),
  "Avatar/Stack": card({ what: "Overlapping avatars for people sharing something (at most five, then +N).", props: [["Number", "1–5"], ["More", "the +N counter"]], code: "`<AvatarStack>`" }),

  // ❖ AI-Chat
  "AI/Chat-Field": card({
    what: "The prompt field of an assistant: ask, attach, pick a model, send.",
    instead: ["Person-to-person messaging → Chat-Control."],
    props: [["State", "Default · Focused · Typing · Long-Typing"], ["Style", "Default · Surface · Liquid Glass"]],
    code: "`<AiChatField>`",
  }),
  "AI/Chat-Bubble": card({ what: "One turn of an assistant conversation: the user's prompt (Side=You) or the assistant's answer with its actions (Side=AI).", code: "`<AiChatBubble>`" }),
  "AI/Chat-Block/Pale": card({ what: "The assistant's empty state: a greeting and suggestion chips that show where to start.", code: "`<AiChatBlock>`" }),

  // ❖ Accordion
  "Accordion/Text": card({
    what: "Progressive disclosure of secondary content under short headings.",
    use: ["FAQs and help content.", "Long grouped settings: one item per group, titled “Group · N items”, the first open."],
    instead: ["Content everyone needs → show it.", "Peer views → Tab-Bar.", "Sequential steps → Stepper."],
    props: [["Theme", "Divider · Box"], ["Size", "Small (dense panels and cards: Body/Base/Bold title, Body/Small content) · Medium · Large · XLarge"], ["Content Width", "Title · Full"]],
    rules: ["Fill every item's content, also the collapsed ones.", "One level: no accordion inside an accordion.", "Title → Contents is the item's own gap (Small, Medium and Large 12, XLarge 16), one step more than the 8 between rows inside it: never pad the rows to move them off the title."],
    code: "`<Accordion>`",
  }),

  // ❖ Alert Banner
  "Alert-Banner": card({
    what: "A full-width message about a persistent page- or app-level condition.",
    use: ["System status (maintenance, degraded service).", "Account conditions (trial ending, payment failed) with one action."],
    instead: ["Feedback on one action → Toast-Message.", "Errors inside a form → the field's error.", "A blocking decision → Modal/Dialog."],
    props: [["Theme", "Default · Info · Positive · Warning · Negative"], ["Size", "Small · Medium"]],
    code: "`<AlertBanner>`",
  }),

  // ❖ Chat
  "Chat-Control": card({
    what: "The message composer of a person-to-person chat (attach, emoji, voice, send).",
    instead: ["Talking to an assistant → AI/Chat-Field."],
    props: [["Device", "Desktop · Mobile"], ["State", "Default · Focused · Typing"]],
    code: "`<ChatComposer>`",
  }),
  "Chat/Section/Conversation": card({ what: "A run of messages from one side (You or Others) in a thread; holds Chat/Conversation/Bubble instances.", code: "`<ChatThread>`" }),
  "Chat/Conversation/Bubble": card({
    what: "One message in a thread, with the sender's avatar and name (Others), the sent mark (You) and reactions.",
    props: [["Side", "Others (left, with avatar) · You (right)"], ["Reaction", "Yes shows the reactions row"]],
    code: "`<ChatBubble>`",
  }),
  "Chat/Bubble/Text-You": part("The text bubble of your own message (Social or Business domain, Desktop or Mobile).", "Chat/Conversation/Bubble"),
  "Chat/Bubble/Text-Others": part("The text bubble of someone else's message (Social or Business domain, Desktop or Mobile).", "Chat/Conversation/Bubble"),
  "Chat/Bubble/File": part("A file message (Doc, PDF, Sheet, Others) with its icon, name and size.", "Chat/Conversation/Bubble"),
  "Chat/Bubble/Call": part("An audio or video call entry (in call, missed, outgoing).", "Chat/Conversation/Bubble"),
  "Chat/Bubble/Photo-You": part("A photo message you sent (a Chat/Photo-Container grid).", "Chat/Conversation/Bubble"),
  "Chat/Bubble/Photo-Others": part("A photo message someone else sent (a Chat/Photo-Container grid).", "Chat/Conversation/Bubble"),
  "Chat/Bubble/Focused/Text": part("A text message lifted out of the thread while its actions or reactions menu is open.", "Chat/Conversation/Bubble", "on a state frame"),
  "Chat/Bubble/Focused/File": part("A file message lifted out of the thread while its menu is open.", "Chat/Conversation/Bubble", "on a state frame"),
  "Chat/Bubble/Focused/Call": part("A call entry lifted out of the thread while its menu is open.", "Chat/Conversation/Bubble", "on a state frame"),
  "Chat/Photo-Container": part("The grid of photos in a photo message, with a +N tile when there are more.", "Chat/Bubble/Photo-*"),
  "Chat/Photo/Grid-Slot": part("The layout of 1, 2, 3 or 4+ photos inside a Chat/Photo-Container.", "Chat/Photo-Container"),
  "Chat/Mobile/Bubble/Overlay (Mobile)": part("The phone overlay that holds a focused bubble and its menu.", "Chat/Bubble/Focused/*"),
  "Chat/Reaction/Emoji/Interactive": part("A reaction you can add or remove (Default, Hover, Selected).", "Chat/Conversation/Bubble", "in its reactions row"),
  "Chat/Reaction/Emoji/Static": part("A read-only reaction emoji.", "Chat/Conversation/Bubble"),
  "Chat/Reaction/Status/No": part("The reactions row under a message, with an optional counter.", "Chat/Conversation/Bubble"),
  "Chat/Section/Read-List": part("Read receipts: the avatars of who has seen the thread (1–5+).", "Chat/Section/Conversation"),
  "Chat/Avatar-Group": part("The avatars of a group conversation in the conversation list.", "Chat/Conversation-List/List-Item/Content"),
  "Chat/Conversation-List/List-Item/Content": card({
    what: "The content of one conversation in an inbox: name, last message or call, time and the unread state.",
    props: [["Unread", "Yes: the title and preview go Bold and Strongest, and a dot or Badge says it in text too"], ["State", "Text · audio and video call states · Ongoing-Call"]],
    rules: ["Place it in a List-Item inside a List-Box; never hand-build inbox rows."],
    code: "`<ChatConversationItem>`",
  }),

  "Chat/Section/Time": card({ what: "The time divider between runs of messages in a thread (Today, 10:24).", code: "`<ChatDateDivider>`" }),
  "Chat/Reaction-Bar": card({ what: "The emoji bar above a focused message for adding a reaction; draw it on a state frame with Chat/Bubble/Focused/*.", code: "`<ChatReactionPicker>`" }),
  "Chat/Conversation-List/List-Item/Default": card({
    what: "One conversation row of an inbox, ready to place: avatar, name, last message, time and the unread state.",
    rules: ["Rows sit in a Component/List-Box; unread is said in text too (a dot or Badge), not by weight alone."],
    code: "`<ChatConversationItem>`",
  }),
  "Chat/Bubble/Voice": card({
    what: "A voice-message bubble: play or pause, the waveform and the duration, on your side or someone else's.",
    instead: ["Recording a new take → Voice Recorder."],
    props: [["Side", "You · Others · You-Business · Others-Business"], ["State", "Idle · Playing"]],
    code: "`<ChatVoice>`",
  }),
  "Chat/Conversation/Reply": card({
    what: "A message that replies to another: the quote of the original (Chat/Reply/Quote) with the reply bubble tucked 12px over it, the sender's avatar (Others) and the sent mark (You).",
    props: [["Side", "Others (left, with avatar) · You (right)"], ["Quote › Kind", "what was replied to: Text (2 lines) · Photo · File · Call · Voice · Deleted"]],
    rules: ["The caption names who replied to whom, so a reply has no name line; it starts its own turn, 16px below the message above.", "Pressing the quote jumps to the original; the quote of a deleted message (Deleted) is plain text."],
    code: "`<ChatMessage replyTo>`",
  }),
  "Chat/Reply/Quote": part("The quote above a reply bubble: who replied to whom and a muted preview of the original (text in 2 lines, photo, file, call, voice or a deleted message).", "Chat/Conversation/Reply"),
  "Chat/Composer-Reply": card({
    what: "The Replying-to bar on top of the composer: who you are replying to, a one-line preview of the original and ✕ to cancel.",
    props: [["Kind", "Text · Photo · File · Call · Voice"]],
    rules: ["Place it right above Chat-Control, at the same width; ✕ (and Escape) cancels the reply."],
    code: "`<ChatComposer replyTo onCancelReply>`",
  }),

  // ❖ Top-Navigations (Mobile)
  "Top-Navigation/Mobile": card({
    what: "The phone app bar: where you are (title), how to go back (leading) and up to three actions for this screen (trailing).",
    use: ["The top of every phone screen: a large title on root screens, a compact title on pushed screens.", "A Search, Segmented or Tab-Bar that filters the screen (Control-Bar)."],
    instead: ["Desktop chrome → Sidebar and Header/Dashboard.", "Switching between root sections → Bottom-Navigation.", "More than three actions → a ⋯ Bottom-Sheet."],
    props: [["Type", "Default · Alt (Surface-Alt screens) · Bluring variants over scrolling content · Overlay for media · Liquid Glass · Compact (pushed screens)"], ["Margin", "Comfortable · Compact"]],
    rules: ["Back is the left chevron, never an arrow.", "The large title is Heading/1; the compact bar title is the screen's h1 in Body/Extra/Bold."],
    code: "`<TopNavigation>`",
  }),
  "Nav-Action/Main": part("A labelled action in Top-Navigation/Mobile (Main levels).", "Top-Navigation/Mobile", "in its leading or trailing slot"),
  "Nav-Action/Flat": part("A labelled flat action in Top-Navigation/Mobile (Cancel, Done on sheets).", "Top-Navigation/Mobile"),
  "Nav-Action/Overlay": part("A labelled action for Top-Navigation/Mobile over media.", "Top-Navigation/Mobile"),
  "Nav-Action/Icon-Main": part("An icon action in Top-Navigation/Mobile (Main levels).", "Top-Navigation/Mobile", "with Back as the left chevron"),
  "Nav-Action/Icon-Flat": part("An icon action with no fill in Top-Navigation/Mobile.", "Top-Navigation/Mobile"),
  "Nav-Action/Icon-Overlay": part("An icon action for Top-Navigation/Mobile over media.", "Top-Navigation/Mobile"),
  "Nav-Action/Liquid-Glass": part("An icon or labelled action in the Liquid Glass type of Top-Navigation/Mobile.", "Top-Navigation/Mobile"),

  // ❖ Bottom-Navigations (Mobile)
  "Bottom-Navigation/Mobile/Default": card({
    what: "Root navigation on a phone: switch between three to five top destinations with one tap.",
    instead: ["Two destinations → Segmented or Tab-Bar.", "More than five → a More destination.", "Actions inside a screen → Top-Navigation/Mobile or a Bottom-Sheet."],
    rules: ["Only on top-level screens; pushed screens hide it."],
    code: "`<BottomNavigation>`",
  }),
  "Bottom-Navigation/Mobile/Floating": card({ what: "The floating bottom navigation, with an optional create action (CTA) beside the destinations.", code: "`<BottomNavigation variant=\"floating\">`" }),
  "Bottom-Navigation/Mobile/Floating-Glass": card({ what: "The floating bottom navigation in Liquid Glass, for screens with rich content behind it.", code: "`<BottomNavigation variant=\"floating-glass\">`" }),

  // ❖ Input
  "Input/Text-Field": card({
    what: "A labelled single-line text field.",
    use: ["Names, emails, short free text."],
    instead: ["Long text, notes, a brief or a description → Input/Text-Area.", "A date → Input/Date-Field.", "One option from a list → Input/Select-Field or Input/Autocomplete-Field.", "Searching content → Search/Default."],
    props: [["State", "Default and Focused are the empty look · Typing while editing · Inputted shows a value · Read-Only (dashed Subtle border) for values people read but cannot change · Disabled while something else blocks it (say why) · Inputted-Error / Blank-Error"], ["Size", "Small for dense desktop toolbars and tables · Medium (base) · Large / XLarge; phones Medium or larger"]],
    rules: ["Always a visible label; never use the placeholder as the label.", "Error text says how to fix it."],
    code: "`<InputField>`",
  }),
  "Input/Text-Area": card({
    what: "A labelled multi-line field for notes, briefs and descriptions.",
    instead: ["One line → Input/Text-Field.", "Formatted text → Input/Richtext."],
    props: [["State", "same states as Input/Text-Field; a filled field is Inputted"]],
    code: "`<TextAreaField>`",
  }),
  "Input/Date-Field": card({
    what: "A labelled date field (calendar icon, dd/mm/yyyy) that opens Date-Picker/Single-Calendar (a Bottom-Sheet on phones).",
    props: [["State", "Inputted when it shows a date; Read-Only keeps the calendar icon but never opens"]],
    rules: ["Every date in a form is a Date-Field, never a Text-Field."],
    code: "`<DateField>`",
  }),
  "Input/Select-Field": card({
    what: "A labelled field that picks one option from a list of up to about ten (a Popover/Default; a Bottom-Sheet on phones).",
    instead: ["Longer lists or type-to-find → Input/Autocomplete-Field.", "2–5 visible options → Radio-Button or Segmented."],
    props: [["State", "Inputted when it shows a choice"]],
    code: "`<SelectField>`",
  }),
  "Input/Autocomplete-Field": card({
    what: "A labelled field that finds and picks values by typing; picked values show as Tags.",
    props: [["State", "no Disabled: use View-Only (Read-only)"]],
    code: "`<AutocompleteField>`",
  }),
  "Input/Number-Align-Left": card({ what: "A labelled number field with − + steppers at the end, for quantities.", rules: ["Numbers right-align in tables; steppers disable at min and max."], code: "`<NumberField align=\"left\">`" }),
  "Input/Number-Align-Center": card({ what: "A number field with − value + centred, for small quantities (cart, guests).", code: "`<NumberField align=\"center\">`" }),
  "Input/Richtext": card({ what: "A labelled rich-text editor with its formatting bar, for announcements and long descriptions.", instead: ["Plain notes → Input/Text-Area."], code: "`<RichTextField>`" }),
  "Input/Heading": card({ what: "An inline-editable title (Heading/1–3) for boards, files, documents and tasks.", code: "`<HeadingField>`" }),
  "Primitives/Input/Label": part("The label above a field (with Optional marker, info tooltip or an action).", "the Input/* fields"),
  ".Primitives/Input/Help-Text": part("The help or error text under a field (Neutral, Negative, Warning, Positive).", "the Input/* fields"),
  "Input-Conditions": card({ what: "A checklist of rules under a field (password strength, requirements), each met, unmet or wrong.", code: "`<InputConditions>`" }),
  "Primitives/Input/Input-Conditions/Condition-Item": part("One rule of Input-Conditions (Default, Success, Wrong).", "Input-Conditions"),
  "Control-Bar/Select-Item": part("One option of a field's leading or trailing picker (units, country codes).", "the Input/* fields"),
  "Input/Inline-Field": card({
    what: "A one-line field for dense property panels and inspectors: the label sits inside the box (left) and the value on the right, as text, an option, a colour or a number. Built on .Primitives/Input/Field-Only, so its states and sizes follow the Input family.",
    use: ["Property panels and inspectors (a tweak panel, layer or widget settings) where a stacked Label → Field → Help-Text would double the height.", "Rows beside Slider/Field: the same height, radius and label position."],
    instead: ["Forms people fill once → Input/Text-Field, Input/Select-Field or Input/Color-Field (label above).", "Numbers tuned by feel inside a known min–max → Slider/Field.", "On/off → Toggle.", "2–5 options → Segmented."],
    props: [["Type", "Text (free text) · Select (opens the Popover of options; chevron) · Color (the hex and a Color-Swatch; opens Color-Picker) · Number (the number and − + steppers, .Primitives/Input/Number/Trailing; ↑/↓ step)"], ["State", "Inputted (rest) · Hover · Typing (editing, cursor) · Disabled"], ["Size", "Medium 40 · Small 32"]],
    rules: [
      "The label is the text in the Leading slot (Content/Neutral/Base) and the value is the Content text (right-aligned): edit both texts directly.",
      "Type=Number for exact counts and steps (lines, columns, a px size): the steppers stay visible in every state and are disabled with the field.",
      "Group rows per section, Spacing/Gap/XSmall apart; the section title sits 12 above its rows (the Accordion's own gap).",
    ],
    code: "`<InputField layout=\"inline\">` · `<SelectField layout=\"inline\">` · `<ColorField layout=\"inline\">` · `<NumberField layout=\"inline\">`",
  }),
  "Input/Color-Field": card({
    what: "Pick or type one colour (any hex): the field shows the value as a Color-Swatch (leading) and its hex; clicking it opens Color-Picker under the field (State=Focused), typing edits the hex (State=Typing).",
    use: ["Brand, theme, chart or shadow colours where any value is allowed, in a form or settings."],
    instead: ["A small curated set (labels, tags, series) → Color-Selector.", "A colour that must mean something (status) → a semantic Badge theme chosen by the system.", "A dense property panel → Input/Inline-Field Type=Color.", "A Zen token for a component → its Theme or Color property, not a free colour."],
    props: [["Label · Help-Text", "booleans, as Input/Text-Field (Label → Field → Help-Text)"], ["Size", "Small · Medium (Base) · Large · XLarge, the Input sizes"], ["State", "Inputted · Hover · Focused (the picker open) · Typing · Disabled · Inputted-Error"]],
    rules: [
      "The Color-Swatch fill is the value: override it on the instance (the one fill override Zen allows).",
      "The label names what the colour is for (\"Brand colour\"), not \"Colour\".",
      "Hex values are upper-case with a # (\"#1F6FEB\").",
    ],
    code: "`<ColorField>`",
  }),
  "Color-Picker": card({
    what: "The panel that picks any colour, under Input/Color-Field (or Input/Inline-Field Type=Color) or open inside a panel: drag in the Saturation area (saturation → right, brightness → up), pick the hue on the Hue slider, type the value in the channels of its Format, or reuse a Saved colour.",
    instead: ["A few fixed colours → Color-Selector.", "A Zen token for a component → its Theme or Color property."],
    props: [["Format", "Hex · RGB · HSL · HSB: the Format select (Inline-Field Type=Select, a Popover with the four) and the channels of that format (Inline-Field Type=Text, the channel letter inside: # · R G B · H S L · H S B)"], ["Saved", "boolean: the row of saved colours (Color-Selector), 6 at most so they fit one row"]],
    rules: [
      "Built from Zen parts: the Popover container tokens (Popover/Background, Popover/Border, Effect/Popover, Corner-Radius/Large), Slider/Horizontal (White, Medium) as the Hue slider, .Primitives/Slider/Slide-Dot (White) as the saturation handle, Color-Selector for saved colours.",
      "The saturation area and the hue spectrum are the colour space itself, so their gradients are raw colours by design (the saturation base takes the picked hue); the Hue track spectrum is its one paint override.",
    ],
    code: "`<ColorPicker>`, inline by default; a Popover with open, onOpenChange and anchorRef",
  }),
  ".Primitives/Input/Color-Swatch": card({
    what: "The colour chip that shows a colour value: inside Input/Color-Field, Input/Inline-Field Type=Color and Color-Picker, or next to a colour name (a legend, a table cell).",
    props: [["Size", "the field leading icon: Small 16 (Element-Size/Popular/Small) in Small fields · Medium 20 (Popular/Base) in Medium and Large fields · Large 24 (Popular/Medium) in XLarge fields"]],
    rules: [
      "Its fill IS the value: override the fill of the swatch instance (the only fill override Zen allows; the value is content, like a photo), as Color-Selector does.",
      "One shape: the fill and the inside border (Border/Neutral/Subtle, keeps white or canvas-coloured values visible) sit on one layer, so the corners never show a gap.",
      "Radius is concentric with the field: the field radius minus the swatch inset (Small 12 − 8 = 4, Corner-Radius/XSmall; Medium 12 − 10 = 2, Corner-Radius/2XSmall; Large and XLarge Corner-Radius/2XSmall).",
      "Never the only cue of meaning: name it or show the value beside it.",
    ],
    code: "`<ColorSwatch>`",
  }),

  // ❖ Voice
  "Voice Recorder": card({
    what: "Records a voice take: a waveform, what the state means, and voice actions around one main action.",
    use: ["Voice notes on a task, a comment or a ticket."],
    instead: ["A voice message already sent → the chat's voice bubble.", "Dictating into a prompt → AI/Chat-Field."],
    props: [["State", "Ready · Recording · Paused"]],
    code: "`<VoiceRecorder>`",
  }),
  "AI Voice Conversation": card({
    what: "Talking with the assistant out loud: the voice signal, what the assistant is doing, and the voice actions.",
    props: [["State", "Ready · Listening · Responding"]],
    code: "`<AiVoiceConversation>`",
  }),

  // ❖ Chart (the newer chart sets keep their specific descriptions)
  "Chart/Curve-Preview": card({
    what: "A picture of a motion curve: how a value moves from its start (bottom left) to its target (the dashed line) over time, left → right: a spring, a bounce or an easing curve. Not a control, and not data.",
    use: ["Above the motion settings it previews (Type, Duration, Bounce) in a property panel, so people see the effect of a change at once.", "Comparing easing choices side by side."],
    instead: ["Data over time → Chart/Line-Chart.", "A progress value → Progress.", "Choosing the curve → Segmented or Input/Select-Field next to the preview."],
    props: [["Type", "Spring (light damping, about 4% overshoot) · Bounce (visible overshoot) · Ease-Out (Zen emphasized curve, cubic-bezier .16 1 .3 1) · Ease-In-Out (.65 0 .35 1)"]],
    rules: [
      "Grid lines Border/Neutral/Pale (as the charts), the target dashed Border/Neutral/Subtle, the curve Content/Neutral/Strongest 2px; the surface uses the Input tokens so it sits with fields.",
      "The Curve vector scales with the frame (constraints Scale): let it take the panel width; the height stays 176.",
    ],
    code: "`<CurvePreview>`",
  }),
  "Chart/Chart-Card": card({
    what: "The frame of a dashboard chart: title, range switch and the chart, beside Metric-Cards.",
    instead: ["One number → Metric-Card.", "Exact values to compare or export → Table.", "More than about seven series → split the chart."],
    props: [
      ["Card", "the nested Card is exposed — set Theme, Surface, Color and Spacing on the instance; they follow the Card rules for the page's Canvas"],
      ["Content", "the chart: any Chart/* component (Line, Stack-Bar, Multi-Line, Bar, Donut, Radial, Heatmap, Area …), Fill width"],
    ],
    rules: [
      "Title in Heading/Subheading; the card follows the Card rules for the page's Canvas and the screen's one elevation.",
      "Charts draw no surface of their own: the card always comes from Chart-Card (or a Card), never from the chart. Keep Sub-Action off when the chart shows its own open button.",
    ],
    code: "`<ChartCard>`",
  }),
  "Chart/Line-Chart": card({ what: "How a value changes over a few periods (4–12 points).", code: "`<LineChart>`" }),
  "Chart/Stack-Bar-Chart": card({ what: "How parts make up a total across periods, with a legend.", code: "`<StackBarChart>`" }),

  // ◇ Master-Layout
  "Patterns/Pages/Density-Medium": card({
    what: "The desktop page frame (1512 × 982): Sidebar, the header area, the Content slot, and optional Side-Panel and floating actions.",
    use: ["Start every desktop screen from an instance; put the page's content in its Content slot."],
    props: [["Sidebar / Side-Panel / Floating-Actions", "turn on what the screen has"]],
    rules: ["Content sections are Spacing/Gap/XLarge apart; the margins come from Breakpoint & Grids.", "To make a state frame, clone this instance (not the frame around it) so the slot content stays."],
    code: "`<AppShell>`",
  }),
  "Patterns/Sidebar/Density-Medium": card({
    what: "The page frame's Sidebar (240 expanded or 80 as a rail), with or without its shadow.",
    props: [["Expand", "Yes · No (rail)"], ["Shadow", "Yes on Canvas/Default (cards then take Shadow) · No on a white page"]],
    code: "`<Sidebar>`",
  }),
  "Header/Dashboard": card({
    what: "The header of a dashboard page: stack the Primitives/Dashboard/Header rows the page needs in its Sections slot.",
    rules: ["Navigation (where the page is, notifications, the account), Main (the Heading/1 title and page actions), Control-Bar (Search, filters, the period); each row keeps its Type."],
    code: "`<PageHeader>` · `<DashboardHeader>`",
  }),
  "Primitives/Dashboard/Header": card({
    what: "One row of Header/Dashboard.",
    props: [["Type", "Main: the page title (Heading/1) and page actions · Control-Bar: Search, Chip/Advanced filters, a result count, the period and view switches · Navigation: breadcrumbs, notifications and the account · Custom: your own row"]],
    rules: ["Filters and the period picker live in the Control-Bar row, never in the content."],
    code: "`<DashboardHeader type>`",
  }),
  "Primitives/Dashboard/Header/Action-Item": part("A header icon action with a notification dot or count (Tertiary or Flat).", "Primitives/Dashboard/Header", "in its trailing slots"),
  "Primitives/Notification-Dot": part("The unread dot or number on a header action or navigation item.", "Primitives/Dashboard/Header/Action-Item"),
};

/**
 * Old descriptions replaced even when they look specific (the earlier generated set: "**Overview:** … Original Notes",
 * one-line placeholders). A description that matches none of these is kept unless its set is listed in FORCE.
 */
export const GENERIC = [/\*\*Overview:\*\*/, /Original Notes/, /^Data visualization elements/, /^Purpose-specific voice component/, /^\s*$/];
// Sets whose Figma description is replaced even when it is specific: the property-panel sets drafted in Figma on
// 2026-10-14 ("Draft …, not yet in code"), in code since #53–#55; Accordion/Text since Size=Small (2026-10-15).
export const FORCE = new Set(["Input/Inline-Field", "Input/Color-Field", "Color-Picker", ".Primitives/Input/Color-Swatch", "Slider/Field", "Chart/Curve-Preview", "Accordion/Text"]);
