// Figma component properties → Zen code props, for the Studio's Properties panel (WP-E of
// docs/research/studio-builder-plan-2026-10-05.md). tools/studio/figma-props-build.mjs joins it with the Figma read
// (docs/figma-contracts/component-properties.json) and the code API (src/platform/api.generated.json) and writes
// src/platform/studio/inspector/figmaProps.generated.ts; `--check` fails when either side drifted.
//
// One entry per code component:
//   sets:   the Figma sets it covers; when several, `setProp` is the code prop that picks one (Button: appearance).
//   props:  Figma property name → how the code holds it:
//     "size"                                a code prop (a variant's options map by name: "Danger Subtle" → danger-subtle,
//                                           "Medium (Base)" → medium; `values` overrides one option)
//     { prop, values: { "Max-Fixed": "max" } }
//                                           on a number prop: a select of Figma's named steps writing those numbers
//                                           (Progress-Bar Progress: Low → 20); the number's own field stays below it
//     { prop, bool: true }                  a Yes/No (or True/False) variant held as a boolean
//     { prop, trust: "why" }                the code type is wider than api.generated.json says: options are not checked
//     { toggle: "startIcon", on: … }        a Figma boolean that shows a layer = the presence of a code prop: on writes
//                                           `on` (a text value, "slot" for the content-slot picker, or { code } for an
//                                           object written as code: `{ label: "Action" }`, or { swap: "Leading-Icon-Src" }
//                                           for that swap property's default icon in Figma), off removes it. The row shows
//                                           only on the sets that have the boolean (generated), and while every
//                                           `when: [{ prop, oneOf, default? }]` holds (the layer exists only at those values)
//     { skip: "why" }                       Figma-only (a preview state, a device frame, content written elsewhere)
//     { skip: "why", main: { prop, values } } a variant the Properties panel leaves out (the value is a number, or the
//                                           opposite of a boolean) that the Main component frame still draws: each Figma
//                                           option → that value (Progress=Low → value 20; Sidebar Expand=No → collapsed)
//   nested: Figma nested layer name → { when, set?, props?, code? }: a group shown while code prop `when` is set, with
//           the nested set's properties mapped as above, then `code` rows ({ prop, label }) for code props that set has
//           no property for.
// TopNavigation keeps its hand-written groups (inspector/propGroups.ts); it is not listed here.

const skip = (why) => ({ skip: why });
const DEVICE = skip("device frame: the platform renders phones and desktops itself");
const CHILDREN = skip("the label is the element's text (Content section)");
const HOVER = skip("preview state: hover comes from the pointer");
const NO_PROP = skip("no code prop");

/** A field's Label and Help-Text layers (Primitives/Input/Label, .Primitives/Input/Help-Text): the text and its options,
 *  shown while the field's Label or Help-Text boolean is on. Help-Text's set is private (a "." name, which the page read
 *  leaves out): read on its own on 2026-10-08 (373:97364) and kept in component-properties.json with the Input page. */
const LABEL = {
  when: "label",
  set: "Primitives/Input/Label",
  props: {
    Optional: "labelOptional",
    "Tooltip-Icon": "labelTooltip",
    // A node: plain text here (a link or a button needs the code until it has a content slot).
    Action: "labelAction",
    Label: "label",
    State: skip("the field's State disables it"),
  },
};
const HELP_TEXT_PROPS = {
  Theme: "helpTheme",
  Icon: "helpIcon",
  // characterLimit is `ReactNode | true` (a count or the field's own counter): the code row edits it, not a switch.
  "Character-Limitation": skip("characterLimit is ReactNode | true: its own row (Character-Limitation) edits it"),
};
const HELP_TEXT = { when: "helpText", set: ".Primitives/Input/Help-Text", props: HELP_TEXT_PROPS, code: [{ prop: "helpText", label: "Text" }, { prop: "characterLimit", label: "Character-Limitation" }] };
const FIELD_NESTED = { Label: LABEL, "Help-Text": HELP_TEXT };
/** An action written as an object (`action={{ label: "Action" }}`): its label and handler are edited in Object properties. */
const ACTION = { code: '{ label: "Action" }' };

/** Title-Highlight's title row (Label-Icon, Hint, Action) exists at XLarge–Medium, either spelling. */
const TITLED = { prop: "size", oneOf: ["xl", "xlarge", "lg", "large", "md", "medium"], default: "xl" };

/** Metric and MetricCard (a card holding a Metric-Inline instance, with the same props). */
const METRIC = {
  sets: { "Primitives/Metric/Metric-Inline/Icon-Highlight": "icon-highlight", "Primitives/Metric/Metric-Inline/Title-Highlight": "title-highlight" },
  setProp: "variant",
  props: {
    // Figma Trend (a boolean) shows the Metric-Trend badge; in code the trend is an object (direction, label): on writes
    // one to start from, edited field by field in Object properties; off removes it (2026-10-13 Figma walk).
    Trend: { toggle: "trend", on: { code: '{ direction: "positive", label: "+12%" }' } },
    "Metric-Color": "metricColor",
    "Metric-Title": skip("the title is the required label"),
    Counter: { toggle: "counter", on: "3" },
    "Dock-Icon": skip("icon={false} hides the dock icon; the icon itself is the Icon row"),
    Action: skip("a node with no content slot yet"),
    // Figma Title-Highlight (read live 2026-10-17): the Hint follows the title at XLarge–Medium and the Caption label at
    // Small/XSmall; the Label-Icon is in the title row of XLarge–Medium only. Metric-Color's dot is only in the Caption
    // row (Icon-Highlight, Title-Highlight Small/XSmall); Figma shows the boolean on every size, so the row stays.
    Hint: { toggle: "hint", on: "How this number is worked out" },
    "Label-Icon": { toggle: "labelIcon", on: "icon-wallet-02-line", when: [TITLED] },
    Size: "size",
    Custom: { toggle: "custom", on: "slot" },
    "Custom-Slot": skip("content slot (Slots section)"),
  },
};

export const FIGMA_PROPS = {
  Button: {
    sets: { "Button/Main": "main", "Button/Flat": "flat", "Button/Overlay": "overlay" },
    setProp: "appearance",
    props: {
      "Leading-Icon": { toggle: "startIcon", on: { swap: "Leading-Icon-Src" } },
      "Trailing-Icon": { toggle: "endIcon", on: { swap: "Trailing-Icon-Src" } },
      Text: CHILDREN,
      "Leading-Icon-Src": "startIcon",
      "Trailing-Icon-Src": "endIcon",
      Size: "size",
      Level: "level",
      State: "state",
    },
  },
  IconButton: {
    sets: { "Button/Icon-Main": "main", "Button/Icon-Flat": "flat", "Button/Icon-Overlay": "overlay" },
    setProp: "appearance",
    props: { "Leading-Icon-Src": "icon", Size: "size", Level: "level", State: "state" },
  },
  Avatar: {
    sets: { "Avatar/Single": null },
    props: { Status: "status", Focus: "focus", Shape: "shape", Size: "size", Theme: "theme", Background: "background" },
  },
  AvatarStack: {
    sets: { "Avatar/Stack": null },
    // background reaches every avatar (AvatarStack spreads its Avatar props; inspector/inheritedProps.ts lists them).
    props: { More: "showMore", Size: "size", Background: "background", Number: skip("how many avatars: the items list") },
  },
  Accordion: {
    sets: { "Accordion/Text": null },
    props: { Size: "size", Theme: "theme", Expanded: { prop: "expanded", bool: true }, "Content Width": "contentWidth" },
  },
  AlertBanner: {
    sets: { "Alert-Banner": null },
    props: { Leading: "leading", Action: { toggle: "action", on: ACTION }, Size: "size", Theme: "theme" },
  },
  Badge: {
    sets: { Badge: null },
    props: { Remove: "remove", "Leading-Icon": "leadingIcon", "Leading-Icon-Src": "leading", Text: CHILDREN, Size: "size", Theme: "theme", Background: "background" },
  },
  BadgeCounter: {
    sets: { "Badge-Counter": null },
    // Theme and Background come from BadgeProps (inspector/inheritedProps.ts).
    props: { Text: "value", Size: "size", Theme: "theme", Background: "background" },
  },
  // Figma Badge-Status (16932:195, read 2026-10-21): Status × Size; the ring's exact value (the Progress layer's arc) is
  // the code's `progress`, which no Figma property holds.
  BadgeStatus: {
    sets: { "Badge-Status": null },
    props: { Status: "status", Size: "size" },
  },
  BottomSheet: {
    sets: { "Bottom-Sheet": null },
    props: {
      Header: { toggle: "title", on: "Title" },
      Contents: skip("content slot (Slots section)"),
      Items: skip("data slot (items list)"),
      Search: skip("a search object (Object properties)"),
      Actions: skip("action objects (Object properties)"),
      Type: "type",
      Size: { prop: "size", values: { "Max-Fixed": "max" } },
    },
  },
  // Figma ◇ Master-Layout Primitives/Dashboard/Header (4122:33402, read 2026-10-11): one row per Type, each boolean shows
  // its slot. Type=Main renders PageHeader (title, childTitle, subheading as its description, actions, trailing).
  DashboardHeader: {
    sets: { "Primitives/Dashboard/Header": null },
    props: {
      Type: "type",
      // Each boolean's layer exists on some Types only (DashboardHeader.tsx): the row shows there.
      Search: { toggle: "search", on: "slot", when: [{ prop: "type", oneOf: ["control-bar"] }] },
      Controls: { toggle: "controls", on: "slot", when: [{ prop: "type", oneOf: ["control-bar"] }] },
      Subheading: { toggle: "subheading", on: "96 results", when: [{ prop: "type", oneOf: ["control-bar", "main"] }] },
      Actions: { toggle: "actions", on: "slot", when: [{ prop: "type", oneOf: ["control-bar", "main"] }] },
      "Nav-Center-Block": { toggle: "center", on: "slot", when: [{ prop: "type", oneOf: ["navigation"] }] },
      "Nav-Trailing-Block": { toggle: "trailing", on: "slot", when: [{ prop: "type", oneOf: ["navigation", "main"] }] },
      "Child-Heading": { toggle: "childTitle", on: "2026", when: [{ prop: "type", oneOf: ["main"] }] },
      "Leading-Slots": skip("content slot (Slots section)"),
      "Center-Slots": skip("content slot (Slots section)"),
      "Trailing-Slots": skip("content slot (Slots section)"),
      "Control-Slots": skip("content slot (Slots section)"),
      "Action-Slots": skip("content slot (Slots section)"),
      "Custome-Elements": skip("the row's children (Slots section)"),
      "Header-Text": skip("the title text (title prop)"),
    },
  },
  // Figma ◇ Master-Layout Header/AppShell (16783:71068, read 2026-10-21; user: "Update Header/AppShell component từ Figma
  // lên studio"): Theme Default · Border & Divider, Density Medium · Small. Top-Header holds the Collapse Button and Top-Elements (Dashboard header
  // Type=Navigation: Leading · Center · Trailing slots = leading · center · actions); Main holds Main-Element (the page's
  // PageHeader); Sections are the rows under it. The slots Figma has no switch for (leading · center · actions) show as
  // the Slots rows of the Properties panel, by their Figma names (propSchema).
  AppShellHeader: {
    sets: { "Header/AppShell": null },
    props: {
      "Collapse Button": skip("the AppShell's collapse=\"header\" draws it beside its Sidebar (an AppShell prop)"),
      "Top-Elements": skip("its Leading, Center and Trailing slots (leading · center · actions)"),
      "Top-Header": skip("the top row shows while leading, center or actions hold content"),
      "Main-Element": skip("content slot (the Main switch)"),
      Main: { toggle: "main", on: "slot" },
      Sections: { toggle: "sections", on: "slot" },
      Theme: { prop: "theme", values: { Default: "default", "Border & Divider": "border-divider" } },
      Density: "density",
    },
  },
  Card: {
    sets: { Card: null },
    // Color: Pale and Subtle take all nine, Solid Neutral · Brand · Cyan · Yellow · Orange. Surface: Alt on Flat and Border, Flat on
    // Border (Shadow on alt draws as Flat on Surface/Alt). figma-push writes only variants Figma has (cardVariant). Active
    // is `selected` (`active` is its deprecated alias).
    props: { Content: skip("content slot (Slots section)"), "Sub-Action": skip("a sub-action object or node (Object properties)"), Theme: "theme", Color: "color", Surface: "surface", Spacing: "spacing", Active: { prop: "selected", bool: true } },
  },
  Chip: {
    sets: { "Chip/Normal": "normal", "Chip/Advanced": "advanced", "Chip/Number-Only": "number-only" },
    setProp: "variant",
    props: { "Icon-Src": "leading", Counter: skip("the selection count (selectionCount)"), Size: "size", Level: "level", Theme: "theme", State: "state", Select: { prop: "selected", bool: true } },
  },
  Checkbox: {
    sets: { "Checkbox/Text": null },
    // Caption moved to the nested Content's Subtext (the live file, 2026-10-13): figma-push writes it there.
    props: { Caption: skip("the caption is the nested Content's Subtext (figma-push)"), State: "state", Select: { prop: "checked", bool: true }, "Check-Side": "checkSide" },
  },
  Divider: { sets: { Divider: null }, props: { Color: "color" } },
  DockIcon: {
    sets: { "Dock-Icon": null },
    // api.generated.json lists theme without the spread dockIconSupportColors (react-docgen): the type takes them.
    props: { "Icon-Src": "icon", Size: "size", Theme: { prop: "theme", trust: "dockIconThemes spreads dockIconSupportColors" }, Background: "background" },
  },
  DescriptionList: {
    sets: { "Description List": null },
    props: { Items: skip("data slot (items list)"), Layout: "layout", Divider: { prop: "divider", bool: true } },
  },
  // Figma Input/Property-Field (16923:6031, a lone component, read 2026-10-21): the row. Its Value is the nested
  // .Primitives/Input/Property-Value, whose Type is the child cell (PropertyText … PropertyTags): figma-push draws it.
  PropertyField: {
    sets: { "Input/Property-Field": null },
    props: {
      Label: "label",
      Icon: { toggle: "icon", on: { swap: "Icon-Src" } },
      "Icon-Src": "icon",
      Action: { toggle: "action", on: { code: '{ label: "Add" }' } },
    },
  },
  InputField: {
    sets: { "Input/Text-Field": null },
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, Label: { toggle: "label", on: "Label" }, Size: "size", State: "state" },
    nested: FIELD_NESTED,
  },
  SelectField: {
    sets: { "Input/Select-Field": null },
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, Label: { toggle: "label", on: "Label" }, Size: "size", State: "state" },
    nested: FIELD_NESTED,
  },
  DateField: {
    sets: { "Input/Date-Field": null },
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, Label: { toggle: "label", on: "Label" }, Size: "size", State: "state" },
    nested: FIELD_NESTED,
  },
  ColorField: {
    sets: { "Input/Color-Field": null },
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, Label: { toggle: "label", on: "Label" }, Size: "size", State: "state" },
    nested: FIELD_NESTED,
  },
  ColorPicker: {
    sets: { "Color-Picker": null },
    props: { Format: "defaultFormat", Saved: { toggle: "savedColors", on: { code: '["#1F6FEB", "#0E9F8E", "#E07B12", "#E5533D"]' } } },
  },
  AutocompleteField: {
    sets: { "Input/Autocomplete-Field": null },
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, State: skip("preview state: the code shows it through interaction") },
    nested: { "Help-Text": { when: "helpText", set: ".Primitives/Input/Help-Text", props: { ...HELP_TEXT_PROPS, "Character-Limitation": skip("no characterLimit here") }, code: [{ prop: "helpText", label: "Text" }] } },
  },
  RichTextField: { sets: { "Input/Richtext": null }, props: { "Control-Bar": "editorBar" } },
  HeadingField: { sets: { "Input/Heading": null }, props: { Status: "status", Size: "headingSize" } },
  InlineMessage: {
    sets: { "Inline-Message": null },
    props: {
      Action: { toggle: "action", on: ACTION },
      Close: skip("closing is onClose in the code"),
      Caption: skip("the message text is the element's content"),
      Title: { toggle: "title", on: "Title" },
      Leading: skip("content slot (Theme=Custom's visual)"),
      Content: skip("content slot"),
      Theme: "theme",
    },
  },
  ListItem: {
    sets: { "List-Item": null },
    props: {
      Trailing: { toggle: "trailing", on: "slot" },
      Contents: skip("content slot (Slots section)"),
      Leading: { toggle: "leading", on: "slot" },
      // Hover and Pressed come from the pointer; the Main component draws Default and Selected.
      State: { ...skip("selected / hover come from the row's interaction and `selected`"), main: { prop: "selected", values: { Default: "false", Selected: "true" } } },
      Interactive: skip("a row is interactive when it has onClick or href"),
    },
  },
  ListBox: {
    sets: { "Component/List-Box": null },
    props: {
      Header: { toggle: "header", on: "slot" },
      "Header-Slot": skip("content slot (Slots section)"),
      "Body-Slot": skip("content slot (Slots section)"),
      Theme: "theme",
      Footer: { toggle: "footer", on: "slot" },
      "Footer-Slot": skip("content slot (Slots section)"),
    },
  },
  Dialog: {
    sets: { "Modal/Dialog": null },
    props: { Caption: { toggle: "description", on: "Description" }, Custom: skip("custom content goes in the dialog's children"), "Modal-Icon": "icon", Theme: "theme", Device: DEVICE },
  },
  ModalForm: {
    sets: { "Modal/Forms": null },
    props: {
      "Main-Contents": skip("content slot"),
      "Side-Content": skip("content slot (side)"),
      Caption: { toggle: "description", on: "Description" },
      "Top-Custom-Slot": skip("content slot (top)"),
      "Top-Customize": skip("the top slot (top)"),
      Close: "closeButton",
      "Default-Header": "header",
      Layout: "layout",
    },
  },
  Popover: {
    sets: { "Popover/Default": null },
    props: { "Item-List": skip("data slot (items list)"), Search: "search", Label: { toggle: "label", on: "Label" }, "Scroll-Bar": "scrollBar" },
  },
  ProgressBar: {
    sets: { "Progress-Bar": null },
    // Figma's Progress fills (live file 2026-10-18): None 0, Low 20, Medium 40, Good 80, Done 100. A select of those steps
    // in Properties (user 2026-10-19: "thêm ô chọn Progress cho ProgressBar"); the Value slider sets any other number.
    props: { Text: skip("the label text (the Label row)"), Label: { toggle: "label", on: "Label" }, Theme: "theme", Progress: { prop: "value", values: { None: "0", Low: "20", Medium: "40", Good: "80", Done: "100" } }, Layout: "layout" },
  },
  ProgressCircle: {
    // Progress-Circle (label, one size) holds Progress-Circle/Icon, where the colour and the done check live (Done=No
    // draws an 80% pie in Figma).
    sets: { "Progress-Circle": null, "Progress-Circle/Icon": null },
    props: { Label: { toggle: "label", on: "Label" }, Text: skip("the label text (the Label row)"), Size: skip("one size"), Theme: "theme", Done: { ...skip("done is value 100"), main: { prop: "value", values: { No: 80, Yes: 100 } } } },
  },
  Pagination: { sets: { Pagination: null }, props: { Theme: "theme" } },
  Rating: { sets: { "Rating/Star": null }, props: { Rating: { ...skip("the rating is the numeric value"), main: { prop: "value", values: { None: 0, "1.0": 1, "2.0": 2, "3.0": 3, "4.0": 4, "5.0": 5 } } }, Size: "size", Theme: "theme" } },
  RatingDisplay: { sets: { "Rating-Display": null }, props: { Size: "size", Theme: "theme" } },
  OpinionScale: { sets: { "Rating/Opinion-Scale": null }, props: { Scale: "scale", Type: skip("one type (emoji)") } },
  NpsScale: { sets: { "Rating/NPS-Scale": null }, props: { "Top criteria": "highLabel", "Bottom criteria": "lowLabel", Scale: "scale" } },
  RadioButton: {
    sets: { "Radio-Button/Radio-Button": null },
    props: { State: "state", Select: { prop: "checked", bool: true }, "Radio-Side": "radioSide" },
  },
  Search: {
    sets: { "Search/Default": "default", "Search/Popover": "popover" },
    setProp: "variant",
    props: { Size: "size", Shape: "shape", Theme: "theme", State: "state", "Icon-Search": { prop: "iconSearch", bool: true } },
  },
  Slider: {
    sets: { "Slider/Horizontal": null },
    props: {
      Value: skip("the value label is valueText"),
      "Range-Line": skip("a range is the value's shape"),
      "Leading-Dot": skip("drawn by the value"),
      // The icon shows by default (icon={false} hides it): the Icon-Src row's own switch does what this boolean does.
      Icon: skip("the Icon-Src row's switch (icon={false} hides the icon, which shows by default)"),
      "Icon-Src": "icon",
      Theme: "theme",
      Size: "size",
      State: skip("preview state: disabled is its own prop"),
    },
  },
  CurvePreview: {
    sets: { "Chart/Curve-Preview": null },
    props: {
      Type: "type",
    },
  },
  SliderField: {
    sets: { "Slider/Field": null },
    props: {
      Label: "label",
      Value: skip("the number is the value prop (formatValue writes its text)"),
      Theme: "theme",
      Size: "size",
      State: skip("preview state: hover and drag come from the pointer, typing from a click; disabled is its own prop"),
    },
  },
  Sidebar: {
    // Figma ◇ Master-Layout Patterns/Sidebar (6040:67524; user 2026-10-21: "Studio vẽ đủ các variant") wraps Side-Bar/
    // Master/Basic in its Theme, Density, Shadow and Expand: variant "basic" with those props (the select shows Basic once).
    sets: { "Side-Bar/Master/Basic": "basic", "Side-Bar/Master/Workspace": "workspace", "Side-Bar/Master/Small-Density": "small-density", "Patterns/Sidebar": "basic" },
    setProp: "variant",
    props: {
      "Header-Content": skip("content slot"),
      "Body-Content": skip("data slot (sections)"),
      "Footer-Content": skip("content slot"),
      "Sub-Item": skip("data slot"),
      "Sub-Menu": skip("the sub-menu object"),
      // A switch cannot show the opposite of its prop: the Properties panel leaves Expand out, the Main component draws it.
      Expand: { ...skip("collapsed is the opposite of Expand"), main: { prop: "collapsed", values: { Yes: false, No: true } } },
      Theme: "theme",
      Density: "density",
      Shadow: { prop: "shadow", bool: true },
      // Figma Side-Bar/Master Footer (2026-10-21): shows Footer-Container (and its Divider) = the Sidebar has a footer.
      Footer: { toggle: "footer", on: "slot" },
      "Collapse Button": skip("the collapse control has no prop: it shows with onCollapsedChange, or where the AppShell puts the toggle (collapse=\"sidebar\")"),
      "Child-Header-Content": skip("content slot"),
      "Child-Body-Content": skip("data slot"),
      "Child-Footer-Content": skip("content slot"),
      "Master-Body-Content": skip("data slot"),
      "Master-Header-Content": skip("content slot"),
      "Workspace-bar": "workspaceBar",
      Expanded: skip("one value"),
      "Master-Background": "background",
    },
  },
  SkeletonText: { sets: { "Skeleton/Body-Text": null }, props: { "No. of line": { ...skip("lines is a number"), main: { prop: "lines", values: { 1: 1, 2: 2, 3: 3, 5: 5 } } } } },
  SkeletonHeading: { sets: { "Skeleton/Heading-Text": null }, props: { Size: "size" } },
  SkeletonShape: {
    sets: { "Skeleton/Shapes": null },
    props: { Shape: "shape", Size: { prop: "size", values: { "Large - 48px": "large", "Medium - 40px": "medium", "Small - 32px": "small" } } },
  },
  Segmented: { sets: { Segmented: null }, props: { "Item-List": skip("data slot (options list)"), Level: "level" } },
  SidePanel: { sets: { "Side-Panel": null }, props: { Contents: skip("content slot"), "Header-Contents": skip("the header slot (headerContent)"), "Top-Customize": skip("the top slot (top)"), Type: "type", Size: "size" } },
  Tabs: { sets: { "Tab-Bar": null }, props: { "Item-List": skip("data slot (items list)"), Style: "variant" } },
  Tag: {
    sets: { Tag: null },
    props: { "Icon-Src": "leading", Label: skip("the label is the element's text"), Theme: skip("set by leading / photoSrc"), State: "state", Remove: { prop: "remove", bool: true } },
  },
  Toggle: {
    sets: { Toggle: null },
    props: { Size: "size", State: "state", Select: { prop: "checked", bool: true }, Theme: "theme" },
  },
  ToggleButton: {
    sets: { "Toggle-Button": null },
    props: {
      Size: "size", State: { prop: "state", values: { "Default-Hover": "hover" } }, Select: { prop: "checked", bool: true },
      // XLarge's dot icon (Toggle.tsx `icon`): the layer exists only at Size=XLarge.
      Icon: { toggle: "icon", on: { swap: "Icon-Src" }, when: [{ prop: "size", oneOf: ["xlarge"], default: "medium" }] },
      "Icon-Src": "icon",
    },
  },
  Tooltip: { sets: { Tooltip: null }, props: { Slot: skip("the trigger is the element's child"), Color: { prop: "color", values: { "Black-Overlay": "black-overlay" } }, Size: "size" } },
  Toast: {
    sets: { "Toast-Message": null },
    props: {
      // On: the Small action button with its label (onClick is optional: pressing it dismisses the toast).
      Actions: { toggle: "action", on: ACTION },
      "Title-Text": "title",
      "Caption-Text": skip("the message is the element's content"),
      Title: skip("a toast without a title omits title"),
      Caption: skip("a toast without a caption has no content"),
      Close: skip("closing is onClose in the code"),
      Type: "type",
    },
  },
  // One file of a FileUpload's list: Theme and Thumbnail are its own props; the rest is its `file` object (figma-push
  // uploaderFileItemNode writes State and the texts, figma-pull reads them back).
  UploaderFileItem: {
    sets: { "Primitives/Uploader/File-Item": null },
    props: {
      Theme: "theme",
      Thumbnail: "thumbnail",
      State: skip("the file's state (file.state)"),
      "✏️ Name": skip("the file's name (file.name)"),
      "✏️ Size": skip("the file's size (file.size)"),
      "✏️ Additional Caption": skip("the upload's caption or error (file.caption, file.error)"),
    },
  },
  FileUpload: {
    sets: { "Uploader/File-Upload": null },
    props: {
      hasLabel: { toggle: "label", on: "Attachments" },
      hasHelperText: { toggle: "helpText", on: "Up to 5 files." },
      Type: { prop: "type", values: { "Drag & Drop": "dropzone", "Browse Button": "button" } },
      State: skip("uploaded files are the files list"),
      "File List": skip("the files list"),
    },
  },
  BottomNavigation: {
    sets: { "Bottom-Navigation/Mobile/Default": "default", "Bottom-Navigation/Mobile/Floating": "floating", "Bottom-Navigation/Mobile/Floating-Glass": "floating-glass" },
    setProp: "type",
    // CTA (Floating, Floating-Glass; on in Figma): the action button beside the capsule, a "New" plus (user 2026-10-19:
    // "Update bottom navigation từ Figma lên Studio").
    props: { "Nav-Items": skip("data slot (items list)"), "Nav-Item": skip("data slot (items list)"), CTA: { toggle: "action", on: { code: '{ icon: "icon-plus-line", label: "New" }' } } },
  },
  ChatComposer: { sets: { "Chat-Control": null }, props: { Device: "device", State: skip("preview state: typing is interaction") } },
  ChatAvatarGroup: { sets: { "Chat/Avatar-Group": null }, props: { Size: "size" } },
  AiChatField: {
    sets: { "AI/Chat-Field": null },
    props: { Model: skip("the model picker is a node (model)"), State: skip("preview state: typing is interaction"), Style: { prop: "fieldStyle", values: { "Liquid Glass": "liquid-glass" } } },
  },

  // GĐ4 M1 (2026-10-07): the components with a Figma set that the first pass left out. NumberField and TextAreaField take
  // InputField's props through their props type, which api.generated.json does not list (inspector/inheritedProps.ts).
  NumberField: {
    sets: { "Input/Number-Align-Left": "left", "Input/Number-Align-Center": "center" },
    setProp: "align",
    props: { "Help-Text": { toggle: "helpText", on: "Help text" }, Label: { toggle: "label", on: "Label" }, Size: "size", State: "state" },
    nested: FIELD_NESTED,
  },
  TextAreaField: {
    sets: { "Input/Text-Area": null },
    props: {
      "Help-Text": { toggle: "helpText", on: "Help text" },
      Label: { toggle: "label", on: "Label" },
      Size: { prop: "size", trust: "Exclude<InputSize, \"xlarge\" | \"xl\">: the docs type names only the excluded sizes" },
      State: "state",
    },
    nested: FIELD_NESTED,
  },
  DatePicker: {
    // Date-Picker/Mobile is the device prop (device="mobile"), not a third calendar: left out.
    sets: { "Date-Picker/Single-Calendar": "single", "Date-Picker/Dual-Calendar": "dual" },
    setProp: "calendar",
    props: { "Time-Picker": "timePicker", Actions: "showActions", State: skip("preview state: the month and year list opens from the header") },
  },
  // The phone date picker (a Bottom-Sheet around the calendar): Variant follows selectionMode and whether a range is
  // chosen (figma-push datePickerSheetNode), the title is its heading's text.
  DatePickerSheet: { sets: { "Date-Picker/Mobile": null }, props: { Variant: { ...skip("selectionMode, and a chosen range (Multiple-Selected)"), main: { prop: "selectionMode", values: { Single: "single", "Multiple-Default": "range" } } } } },
  Stepper: {
    sets: { "Stepper-Bar/Horizontal": "horizontal", "Stepper-Bar/Vertical": "vertical" },
    setProp: "orientation",
    props: { Items: skip("data slot (steps list)"), Variant: skip("one variant") },
  },
  Metric: METRIC,
  // Figma Metric-Card (6643:64008): its Type, and its exposed Card (Theme, Color). A KPI MetricCard draws Metric-Inline in
  // the Card (figma-push), the typed ones Metric-Card itself (figma-metric.mjs); Metric keeps the Metric-Inline sets.
  MetricCard: {
    sets: { "Metric-Card": null },
    props: { Type: "type" },
    nested: {
      Card: {
        when: "label",
        set: "Card",
        props: { Content: skip("the Metric-Card's own layers"), "Sub-Action": skip("subAction (Object properties)"), Theme: "theme", Color: "color", Surface: skip("MetricCard has no surface prop"), Spacing: "spacing", Active: skip("a MetricCard is not selectable") },
      },
    },
  },
  ChatMessage: {
    sets: { "Chat/Conversation/Bubble": null },
    props: {
      Name: "showName",
      "Bubble-Others-Content": skip("the bubble is the message's content"),
      "Bubble-You-Content": skip("the bubble is the message's content"),
      Avatar: skip("continued hides it (a run's later messages)"),
      Sent: skip("the status line is the status prop (a node)"),
      Side: "side",
      Reaction: skip("reactions are the reactions list"),
    },
  },
  ChatBubble: {
    sets: { "Chat/Bubble/Text-You": "you", "Chat/Bubble/Text-Others": "others" },
    setProp: "side",
    props: { Hover: HOVER, Reaction: skip("reactions belong to the ChatMessage"), Domain: "domain", Device: skip("the thread's device (ChatThread)") },
  },
  ChatCall: {
    sets: { "Chat/Bubble/Call": null },
    props: { "Others-Hover": HOVER, "You-Hover": HOVER, Category: skip("the domain is the ChatMessage's"), Type: "type", State: "state" },
  },
  ChatFile: {
    sets: { "Chat/Bubble/File": null },
    props: { "Others-Hover": HOVER, "You-Hover": HOVER, Reaction: skip("reactions belong to the ChatMessage"), Category: skip("the domain is the ChatMessage's"), Type: { prop: "kind", values: { Others: "other" } } },
  },
  ChatPhotos: {
    sets: { "Chat/Bubble/Photo-You": "you", "Chat/Bubble/Photo-Others": "others" },
    setProp: "side",
    props: { Reaction: skip("reactions belong to the ChatMessage"), Domain: skip("the domain is the ChatMessage's"), Device: skip("the thread's device (ChatThread)"), Hover: HOVER },
  },
  ChatConversationItem: {
    sets: { "Chat/Conversation-List/List-Item/Content": null },
    props: { State: { ...skip("a call row is the call prop (Text: none)"), main: { prop: "call", values: { Text: "", "Audio Missed Call": "missed-audio", "Audio Out-Call": "outgoing", "Audio In-Call": "incoming", "Video Missed Call": "missed-video", "Ongoing-Call": "ongoing" } } }, Unread: { prop: "unread", bool: true } },
  },
  AiChatBubble: {
    sets: { "AI/Chat-Bubble": null },
    props: { "Chat-Content": skip("the bubble's content"), Items: skip("the actions list"), Side: "side", State: HOVER },
  },
  EmptyState: { sets: { "Empty-State": null }, props: { CTA: { toggle: "primaryAction", on: ACTION }, Size: "size" } },
  InputConditionItem: { sets: { "Primitives/Input/Input-Conditions/Condition-Item": null }, props: { State: "state" } },
  // The list around them: its Item-List slot holds the Condition-Items (the element's children).
  InputConditions: { sets: { "Input-Conditions": null }, props: { "Item-List": skip("content slot (Slots section)"), State: "state" } },
  ControlBarSelectItem: { sets: { "Control-Bar/Select-Item": null }, props: { "Icon-Src": "icon", Theme: "theme", State: "state" } },
};
