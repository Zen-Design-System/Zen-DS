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
//     { prop, bool: true }                  a Yes/No (or True/False) variant held as a boolean
//     { prop, trust: "why" }                the code type is wider than api.generated.json says: options are not checked
//     { toggle: "startIcon", on: … }        a Figma boolean that shows a layer = the presence of a code prop: on writes
//                                           `on` (a text value, "slot" for the content-slot picker, or { code } for an
//                                           object written as code: `{ label: "Action" }`, or { swap: "Leading-Icon-Src" }
//                                           for that swap property's default icon in Figma), off removes it
//     { skip: "why" }                       Figma-only (a preview state, a device frame, content written elsewhere)
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

/** Metric and MetricCard (a card holding a Metric-Inline instance, with the same props). */
const METRIC = {
  sets: { "Primitives/Metric/Metric-Inline/Icon-Highlight": "icon-highlight", "Primitives/Metric/Metric-Inline/Title-Highlight": "title-highlight" },
  setProp: "variant",
  props: {
    Trend: skip("the trend is an object: direction and label (Object properties)"),
    "Metric-Color": "metricColor",
    "Metric-Title": skip("the title is the required label"),
    Counter: { toggle: "counter", on: "3" },
    "Dock-Icon": skip("icon={false} hides the dock icon; the icon itself is the Icon row"),
    Action: skip("a node with no content slot yet"),
    Hint: { toggle: "hint", on: "How this number is worked out" },
    "Label-Icon": { toggle: "labelIcon", on: "icon-wallet-02-line" },
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
  Card: {
    sets: { Card: null },
    props: { Content: skip("content slot (Slots section)"), "Sub-Action": skip("a sub-action object or node (Object properties)"), Theme: "theme", Spacing: "spacing", Active: { prop: "active", bool: true } },
  },
  Chip: {
    sets: { "Chip/Normal": "normal", "Chip/Advanced": "advanced", "Chip/Number-Only": "number-only" },
    setProp: "variant",
    props: { "Icon-Src": "leading", Counter: skip("the selection count (selectionCount)"), Size: "size", Level: "level", Theme: "theme", State: "state", Select: { prop: "selected", bool: true } },
  },
  Checkbox: {
    sets: { "Checkbox/Text": null },
    props: { Caption: { toggle: "caption", on: "Caption" }, State: "state", Select: { prop: "checked", bool: true }, "Check-Side": "checkSide" },
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
      Visual: skip("content slot"),
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
      State: skip("selected / hover come from the row's interaction and `selected`"),
      Interactive: skip("a row is interactive when it has onClick or href"),
    },
  },
  ListBox: {
    sets: { "Component/List-Box": null },
    props: {
      Header: { toggle: "header", on: "slot" },
      "Header-Slot": skip("content slot (Slots section)"),
      "Body-Slot": skip("content slot (Slots section)"),
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
    props: { Text: skip("the label text (the Label row)"), Label: { toggle: "label", on: "Label" }, Theme: "theme", Progress: skip("progress is the numeric value") },
  },
  ProgressCircle: {
    sets: { "Progress-Circle": null },
    props: { Label: { toggle: "label", on: "Label" }, Text: skip("the label text (the Label row)"), Size: skip("one size") },
  },
  Pagination: { sets: { Pagination: null }, props: { Theme: "theme" } },
  Rating: { sets: { "Rating/Star": null }, props: { Rating: skip("the rating is the numeric value"), Size: "size", Theme: "theme" } },
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
    props: { Size: "size", Theme: "theme", State: "state", "Icon-Search": { prop: "iconSearch", bool: true } },
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
  Sidebar: {
    sets: { "Side-Bar/Master/Basic": "basic", "Side-Bar/Master/Workspace": "workspace", "Side-Bar/Master/Small-Density": "small-density" },
    setProp: "variant",
    props: {
      "Header-Content": skip("content slot"),
      "Body-Content": skip("data slot (sections)"),
      "Footer-Content": skip("content slot"),
      "Sub-Item": skip("data slot"),
      "Sub-Menu": skip("the sub-menu object"),
      Expand: skip("collapsed is the opposite of Expand"),
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
  SkeletonText: { sets: { "Skeleton/Body-Text": null }, props: { "No. of line": skip("lines is a number") } },
  SkeletonHeading: { sets: { "Skeleton/Heading-Text": null }, props: { Size: "size" } },
  SkeletonShape: {
    sets: { "Skeleton/Shapes": null },
    props: { Shape: "shape", Size: { prop: "size", values: { "Large - 48px": "large", "Medium - 40px": "medium", "Small - 32px": "small" } } },
  },
  Segmented: { sets: { Segmented: null }, props: { "Item-List": skip("data slot (options list)"), Level: "level" } },
  SidePanel: { sets: { "Side-Panel": null }, props: { Contents: skip("content slot"), Type: "type", Size: "size" } },
  Tabs: { sets: { "Tab-Bar": null }, props: { "Item-List": skip("data slot (items list)"), Style: "variant" } },
  Tag: {
    sets: { Tag: null },
    props: { "Icon-Src": "leading", Label: skip("the label is the element's text"), Theme: skip("set by leading / photoSrc"), State: "state", Remove: { prop: "remove", bool: true } },
  },
  Toggle: {
    sets: { Toggle: null },
    props: { Size: "size", State: "state", Select: { prop: "checked", bool: true }, Theme: "theme" },
  },
  ToggleButton: { sets: { "Toggle-Button": null }, props: { Size: "size", State: { prop: "state", values: { "Default-Hover": "hover" } }, Select: { prop: "checked", bool: true } } },
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
    props: { "Nav-Items": skip("data slot (items list)"), "Nav-Item": skip("data slot (items list)"), CTA: skip("the action object") },
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
  Stepper: {
    sets: { "Stepper-Bar/Horizontal": "horizontal", "Stepper-Bar/Vertical": "vertical" },
    setProp: "orientation",
    props: { Items: skip("data slot (steps list)"), Variant: skip("one variant") },
  },
  Metric: METRIC,
  MetricCard: METRIC,
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
    props: { State: skip("a call row is the call prop (Text: none)"), Unread: { prop: "unread", bool: true } },
  },
  AiChatBubble: {
    sets: { "AI/Chat-Bubble": null },
    props: { "Chat-Content": skip("the bubble's content"), Items: skip("the actions list"), Side: "side", State: HOVER },
  },
  EmptyState: { sets: { "Empty-State": null }, props: { CTA: { toggle: "primaryAction", on: ACTION } } },
  InputConditionItem: { sets: { "Primitives/Input/Input-Conditions/Condition-Item": null }, props: { State: "state" } },
  ControlBarSelectItem: { sets: { "Control-Bar/Select-Item": null }, props: { "Icon-Src": "icon", Theme: "theme", State: "state" } },
};
