// Zen Studio → Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.1): a page as the JSON
// figmaReadCode (figma-pull.mjs) returns, so the Zen plugin's Import from Studio places it and a later pull reads it back
// the same — the round trip is the test (figma-push.selftest.mjs). Isomorphic: no Node imports; the caller passes the
// mapping (figma-pull.mjs repoMapping / figmaMapping) and the nested layers (inspector/nestedLayers.generated.ts).
//
//   figmaFromPage(text, { mapping, nestedLayers }) → { frame, notes }    every node keyed by its element's document id
//   figmaPackage(text, { mapping, nestedLayers, page: { id, title }, libraryKeys }) → { pkg, notes }   the file the plugin
//                                                 imports; with the library's keys (library-keys.mjs) it binds in any file
//
// Frames (Stack, Grid; absolute layers with their constraints and insets), text, instances (variant, boolean, text and
// icon properties, the label, slot content, `overrides` as nested instances, an icon-only control's name), data slots
// as their item instances (Sidebar sections, Breadcrumbs, Segmented), node slots (Sidebar brand / footer, Dashboard
// header rows), Sidebar footer rows and dashboard actions, the Dashboard header's texts and Search, a Table as Figma
// draws it (a frame of Data-Rows, header and content cells) and pictures (`images`, filled by the caller: the plugin has
// no network).
import { docFromText } from "./doc.mjs";
import { PROPERTY_BINDINGS, componentSets, layerChain, localComponents, resolveInstance, variantName } from "./dialect.mjs";
import { figmaBlendOf } from "./blend-modes.mjs";
import { INSTANCE_LOOK_PROPS, instanceLookStyle, takesInstanceLook } from "./instance-look.mjs";
import { BOX_SURFACE, GAP_PX, LONG_TO_SHORT, MARGIN_PX, MARGIN_VARIABLE, PADDING_PX, PROGRESS_TRACK, progressColumns, progressStep, sameValue } from "./figma-steps.mjs";
import { SCREEN_CHROME, screenLayout } from "./screen-chrome.mjs";
import { pruneHidden } from "./visibility.mjs";
import { FIGMA_NAMED, givenNameOf } from "./layer-meta.mjs";
import { BARE_HEADER, CHART_COMPONENTS, HEADING_LAYER, chartFigma, chartHeaderFigma } from "./figma-charts.mjs";
import { SUB_ACTION_ICON, metricCardFigma, metricCardTyped } from "./figma-metric.mjs";
import { PROPERTY_TYPE as PROPERTY_CELL_TYPE, propertyValueFigma } from "./figma-property.mjs";
import { NAV_ACTION_SET, TOP_NAV_HEADING, TOP_NAV_SET, TOP_NAV_TYPES, topNavActions, topNavLayout } from "./figma-top-nav.mjs";
import { contentToneToken } from "../../src/components/_shared/contentTone.ts";
import { textSegments } from "./text-runs.mjs";
import { imageFillOf } from "./figma-image.mjs";
import { arcData, fitVectorPath, normalizeArc, parseVectorPath, parseViewBox, STAR_RATIO, vectorBounds } from "../../src/components/Shape/geometry.ts";
import { DEFAULT_LINE_STROKE, DEFAULT_SHAPE_FILL, shapeFillTokens, shapeStrokeTokens } from "../../src/components/Shape/paint.ts";
import { zenLabels } from "../../src/components/_shared/labels.ts";
import { iconAliases } from "../../src/icons/generated/aliases.ts";
import { libraryKeysFor } from "./library-keys.mjs";
import { tokens } from "../../src/tokens/generated.ts";

/** A spacing step's Figma variable name: md → Medium ("Spacing/Gap/Medium"). */

/** Shape type → Figma node type and layer name (Shape.tsx; Figma names a drawn layer by its tool). */
const SHAPE_NODE = { rectangle: "RECTANGLE", ellipse: "ELLIPSE", line: "LINE", arrow: "LINE", polygon: "POLYGON", star: "STAR", vector: "VECTOR", boolean: "BOOLEAN_OPERATION" };
const SHAPE_LABEL = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star", vector: "Vector", boolean: "Union" };
/** A boolean group's operation → Figma's booleanOperation and its layer name. */
const BOOLEAN_OP = { union: ["UNION", "Union"], subtract: ["SUBTRACT", "Subtract"], intersect: ["INTERSECT", "Intersect"], exclude: ["EXCLUDE", "Exclude"] };
const SHAPE_DEFAULT_SIZE = 100;
/** A rectangle's Corner-Radius token → its Figma variable and px (Corner Radius, Rounded mode). */
const SHAPE_RADIUS = { none: ["", 0], "2xs": ["Corner-Radius/2XSmall", 2], xs: ["Corner-Radius/XSmall", 4], sm: ["Corner-Radius/Small", 8], md: ["Corner-Radius/Base", 12], lg: ["Corner-Radius/Large", 16], xl: ["Corner-Radius/XLarge", 20], "2xl": ["Corner-Radius/2XLarge", 24], "3xl": ["Corner-Radius/3XLarge", 28], full: ["Corner-Radius/Rounded", 1000] };

/** A frame's border (Layout appearance.ts) → its Border variable (Figma's stroke). */
const FRAME_STROKE = { pale: "Border/Neutral/Pale/Default", subtle: "Border/Neutral/Subtle/Default" };
/** The effect styles a frame takes (Layout effects.ts boxEffectStyles). */
const FRAME_EFFECTS = new Set(["Shadow/Bottom/Level-1", "Shadow/Bottom/Level-2", "Shadow/Bottom/Level-3", "Shadow/Bottom/Level-4", "Shadow/Top/Level-1", "Shadow/Top/Level-2", "Shadow/Top/Level-3", "Shadow/Top/Level-4", "Effect/Overlay"]);

const STEP_NAMES = { "3xs": "3XSmall", "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge", "4xl": "4XLarge", giant: "Giant", xgiant: "XGiant", "2xgiant": "2XGiant" };
/** Whether a pushed layer is wrapping text, or a plain column frame (no fill) around some: it needs a width to wrap in. */
const wrapsText = (node) => (node?.type === "TEXT" && !node.autoWidth) || (node?.type === "FRAME" && !node.fill && node.layout?.mode === "VERTICAL" && (node.children ?? []).some((child) => !child.absolute && wrapsText(child)));
/** Components with a size of their own in CSS (a definite width and height): a Stack's stretch never resizes them. */
const INTRINSIC_SIZE = new Set(["Avatar", "Chip", "DockIcon", "FileIcon", "Flag", "Icon", "IconButton"]);
/** The width of a Screen's frame by its device (figma-pull's deviceOf reads it back). */
const DEVICE_WIDTH = { phone: 390, tablet: 768, desktop: 1440 };
const DRAWN_BY_PULL = new Set(["Board", "Screen", "Overlay"]);

/** Figma sets the push draws itself (docs/figma-contracts/component-properties.json; checked against the live file). */
const SETS = {
  menuItem: { id: "1536:27473", name: "Primitives/Side-Bar/Menu-Item/Master" },
  sectionTitle: { id: "6044:81281", name: "Primitives/Sidebar/Menu-Item/Section-Title" },
  crumb: { id: "4031:20158", name: "Primitives/Breadcrumbs/Item/Slot" },
  aiChatBlock: { id: "7140:115622", name: "AI/Chat-Block/Pale" },
  segment: { id: "1204:11690", name: "Primitives/Segmented/Item" },
  actionItem: { id: "12280:19532", name: "Primitives/Dashboard/Header/Action-Item" },
  dataRow: { id: "4035:10629", name: "Primitives/Table/Data-Row" },
  headerCell: { id: "1604:12968", name: "Table/Cell/Header" },
  defaultCell: { id: "1603:23604", name: "Table/Cell/Default" },
  // ❖ Chart: figma-charts.mjs CHART_SETS (every chart set, its variants and header properties).
  // Data items drawn as their primitive (Term / Value, a tab's Text, a step's title and number).
  descriptionItem: { id: "14859:78890", name: ".Primitives/Description-List/Item" },
  tabItem: { id: "1576:2090", name: "Primitives/Tab-Item" },
  stepVertical: { id: "4034:11389", name: ".Primitives/Stepper/Step-Vertical" },
  // One colour swatch (its own fill is the colour); ColorSelector is a row of them.
  colorSwatch: { id: "373:97252", name: "Color-Selector" },
  // Iconography (🍑): a file's type icon (Format) and a country's flag (Name), 20 and 24px.
  fileIcon: { id: "5727:22537", name: "icon-media-file" },
  flag: { id: "7063:63834", name: "Flag" },
  // A ChatMessage's reaction emojis (in its bubble's Chat/Reaction/Status) and the read list under it.
  reactionEmoji: { id: "6263:67248", name: "Chat/Reaction/Emoji/Static" },
  readList: { id: "6101:61545", name: "Chat/Section/Read-List" },
  // A run of messages from one side (its Conversations slot, Gap/2XSmall); ChatThread is a column of them.
  chatSection: { id: "6182:57707", name: "Chat/Section/Conversation" },
};
/** A quick reaction (Chat.tsx chatReactionEmojis) → Figma Chat/Reaction/Emoji's Emoji option. */
const EMOJI_OPTION = { like: "Like", heart: "Heart", lol: "LOL", surprised: "Surprised", sad: "Sad", angry: "Angry" };
/** A token's CSS value → its Figma variable ("var(--zen-color-background-support-blue-solid)" → "Color/Background/Support/Blue/Solid"). */
const VARIABLE_OF_CSS = new Map(Object.entries(tokens).filter(([, value]) => typeof value === "string" && value.startsWith("var(")).map(([name, value]) => [value.replace(/\s+/g, ""), name]));
/** Form fields drawn as Figma's Input/…-Field: the label in Label, the value (else the placeholder) in Text, help in Message. */
const FIELDS = new Set(["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"]);
/** A data value as the text it shows (a string or number; anything else draws nothing). */
const textValue = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
/**
 * An icon's size (icon.css: Element-Size/Popular, the icon components' 20px is Base) as its Figma size variable, or a
 * px size; Base writes nothing.
 */
const ICON_SIZE = { "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge" };
const iconSizing = (size) => (typeof size === "number" ? { size } : ICON_SIZE[size] ? { sizeVar: `Element-Size/Popular/${ICON_SIZE[size]}` } : {});
/** FileIcon format → icon-media-file's Format option. */
const FILE_FORMAT = { doc: "Doc", pdf: "PDF", sheet: "Sheet", zip: "Zip", photo: "Photo", video: "Video", music: "Music", sound: "Sound", record: "Record", figma: "Figma" };
/** Flag size (flag.css, Image-Size) → its size variable; Medium is the component's 24px. */
const FLAG_SIZE = { small: "Image-Size/3XSmall", large: "Image-Size/Small" };
const scaleOf = (size) => ({ sm: "small", md: "medium", lg: "large" })[size] ?? size;
/** Metric's icon when it sets none (MetricWidget.tsx). */
const METRIC_ICON = "icon-home-02-solid";
/** MetricCard trend.direction → Figma .Primitives/Metrics/Metric-Trend's Trend option. */
const TREND_OPTION = { positive: "Positive", negative: "Negative", normal: "Normal", neutral: "Normal" };
/** A Table column's content cell (Figma Table/Cell/Default › Content) by the column's `content`. */
const CELL_SETS = {
  text: { id: "1603:3247", name: "Primitives/Table/Cell/Text-Cell" },
  avatar: { id: "1603:2869", name: "Primitives/Table/Cell/Avatar-Cell" },
  photo: { id: "1603:4668", name: "Primitives/Table/Cell/Photo-Cell" },
  icon: { id: "1603:4727", name: "Primitives/Table/Cell/Basic-Icon-Cell" },
  "dock-icon": { id: "1603:5099", name: "Primitives/Table/Cell/Dock-Icon-Cell" },
  badge: { id: "1603:6158", name: "Primitives/Table/Cell/Badge-Cell" },
  tag: { id: "1603:23304", name: "Primitives/Table/Cell/Tag-Cell" },
  trend: { id: "1603:14279", name: "Primitives/Table/Cell/Trend-Cell" },
  progress: { id: "4081:19726", name: "Primitives/Table/Cell/Progress-Cell" },
  checkbox: { id: "1603:14284", name: "Primitives/Table/Cell/Control-Cell" },
  toggle: { id: "1603:14284", name: "Primitives/Table/Cell/Control-Cell" },
  actions: { id: "1603:14291", name: "Primitives/Table/Cell/Actions-Cell" },
};
/** A data slot's item set (owner › prop): its items are instances of it, a nested slot's group titles of `title`. */
const DATA_ITEMS = {
  Sidebar: { sections: { item: SETS.menuItem, title: SETS.sectionTitle } },
  Breadcrumbs: { items: { item: SETS.crumb } },
  Segmented: { options: { item: SETS.segment } },
};
/** Node props that are a Figma slot (figma-pull SLOT_PROPS, the other way). */
const SLOT_OF_PROP = {
  Sidebar: { brand: "Header-Content", footer: "Footer-Content" },
  DashboardHeader: { leading: "Leading-Slots", center: "Center-Slots", trailing: "Trailing-Slots", controls: "Control-Slots", actions: "Action-Slots" },
  ListBox: { header: "Header-Slot", footer: "Footer-Slot" },
  // Metric-Inline's Custom-Slot (Custom shows it): MetricCard's own content under the number (MetricWidget.tsx custom).
  MetricCard: { custom: "Custom-Slot" },
  Metric: { custom: "Custom-Slot" },
  // Figma Header/AppShell (16783:71068): the Main row's Main-Element and the rows under it; leading · center · actions
  // go in Top-Elements as Figma lays them out (appShellHeaderParts).
  AppShellHeader: { main: "Main-Element", sections: "Sections" },
};
/**
 * Node props whose layers go in their slot as one frame: a ListBox header row keeps its row (title left, action right),
 * a Sidebar brand its logo beside its name (Figma's Header-Content spreads its layers apart), a MetricCard's custom
 * content its own Stack and gap.
 */
const FRAMED_SLOT_PROPS = { ListBox: new Set(["header", "footer"]), Sidebar: new Set(["brand"]), MetricCard: new Set(["custom"]), Metric: new Set(["custom"]) };
/** The property that shows a node prop's slot, where only some of a component's sets have it (Metric-Inline's
 *  Title-Highlight has Custom, Icon-Highlight no Custom-Slot at all). */
const SLOT_SHOWN_BY = { MetricCard: { custom: "Custom" }, Metric: { custom: "Custom" } };
/** Props the push draws in the instance's own layers (metricParts, listItemParts), not in a slot. */
const DRAWN_PARTS = { AppShellHeader: new Set(["leading", "center", "actions"]), Card: new Set(["subAction"]), MetricCard: new Set(["trend", "action"]), Metric: new Set(["trend", "action"]), ListItem: new Set(["leading", "trailing"]), InlineMessage: new Set(["action"]), UploaderFileItem: new Set(["file"]), ChatMessage: new Set(["author", "reactions", "seenBy"]), DatePickerSheet: new Set(["range", "defaultRange", "title", "open", "isOpen"]) };
/** What the page holds but does not show: screen-reader text. */
const NOT_DRAWN = new Set(["VisuallyHidden"]);
/**
 * Surfaces whose edge closes a Table inside them: its last row drops the cells' bottom rule (table.css, user rule
 * 2026-10-12), pushed as `strokeBottom: 0`. A Box counts when it paints a surface or a border.
 */
const SURFACES = new Set(["Card", "ChartCard", "MetricCard", "Accordion", "SidePanel", "Dialog", "ModalForm", "BottomSheet", "Popover", "ListBox"]);
/** Figma Card's Solid colours (15480:87472–87496); Pale and Subtle have all nine (no Accent). */
const CARD_SOLID_COLORS = new Set(["Neutral", "Brand", "Cyan", "Yellow", "Orange"]);
/** Figma Card's Surface per Theme (Card 6643:51021: Alt on Default and Border); the others draw Default (Flat-Border, renamed
 *  from Border × Surface=Flat on 2026-10-21, keeps its own Surface/Flat fill). */
const CARD_SURFACES = { Default: new Set(["Default", "Alt"]), Border: new Set(["Default", "Alt"]) };
/**
 * A Card's Theme × Color × Surface × Active as a variant Figma has (Card 6643:51021), drawn as the code draws it: Color
 * only on Pale, Subtle and Solid (Card.tsx ignores it elsewhere; a Pale or Subtle Accent is Neutral), a Solid hue Figma lacks as Solid Neutral, Shadow on Surface/Alt
 * as Default on Surface/Alt (Card.tsx drops the shadow there), a Surface the theme does not take as Default (Pale,
 * Subtle, Flat-Border, On-Container and Solid keep their own fill), and Active=Yes only on a Neutral card (the
 * code's selected look is the Surface fill with no hue; Solid has no Active=Yes).
 */
function cardVariant(props, notes, where) {
  if (props.Theme === "Shadow" && props.Surface === "Alt") {
    notes.push(`${where}: Shadow on Surface/Alt draws as Default on Surface/Alt (no shadow on Surface-Alt): Theme Default`);
    props.Theme = "Default";
  }
  if ("Surface" in props && props.Surface !== "Default" && !CARD_SURFACES[props.Theme]?.has(props.Surface)) {
    notes.push(`${where}: Figma has no ${props.Theme} card on Surface ${props.Surface} (the code ignores it): Surface Default`);
    props.Surface = "Default";
  }
  if ("Color" in props) {
    if (props.Theme !== "Pale" && props.Theme !== "Subtle" && props.Theme !== "Solid") props.Color = "Neutral";
    else if (props.Theme !== "Solid" && props.Color === "Accent") {
      notes.push(`${where}: Figma has no ${props.Theme} Accent (the code draws ${props.Theme} Neutral): Color Neutral`);
      props.Color = "Neutral";
    }
    else if (props.Theme === "Solid" && !CARD_SOLID_COLORS.has(props.Color)) {
      notes.push(`${where}: Figma has no Solid ${props.Color} (the code draws Solid Neutral): Color Neutral`);
      props.Color = "Neutral";
    }
  }
  if (props.Active === "Yes" && props.Theme === "Solid") {
    notes.push(`${where}: Figma has no selected Solid card: Active No`);
    props.Active = "No";
  } else if (props.Active === "Yes" && "Color" in props) props.Color = "Neutral";
  return props;
}
/**
 * A List-Box's Theme × Color × Surface as a variant Figma has (Component/List-Box 14922:75297), drawn as the code draws
 * it: Color only on Pale (ListBox ignores it elsewhere), Surface=Alt only on Default and Border (the others keep their
 * own fill).
 */
function listBoxVariant(props, notes, where) {
  if ("Color" in props && props.Theme !== "Pale") props.Color = "Neutral";
  if ("Surface" in props && props.Surface !== "Default" && props.Theme !== "Default" && props.Theme !== "Border") {
    notes.push(`${where}: Figma has no ${props.Theme} List-Box on Surface ${props.Surface} (the code ignores it): Surface Default`);
    props.Surface = "Default";
  }
  return props;
}
/** Side-Bar/Master/Workspace names its panel's slots Child-… (Master-… are its workspace column's): figma-pull maps them back. */
export const WORKSPACE_SLOTS = { "Header-Content": "Child-Header-Content", "Body-Content": "Child-Body-Content", "Footer-Content": "Child-Footer-Content" };
/** The slot a component's children go in, where it is not the set's first. */
const CHILD_SLOT = { DashboardHeader: "Custome-Elements", Sidebar: "Body-Content" };
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue" };
const ITEM_ICON = { Segmented: "leading" };
/** Components whose text prop is a plain text layer of their set (no Figma text property): it is the instance's text. */
const TEXT_PROP = { InputConditionItem: "label" };
/** Components whose `src` is a picture the plugin fills in (the instance's image layer). */
const PICTURED = new Set(["Avatar", "Image", "Thumbnail", "AppShellAccount"]);
/** Heading's text style when it sets none (src/components/Text/Text.tsx headingStyleByLevel). */
export const HEADING_STYLE = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };
/**
 * Code-only components (no Figma set) are drawn as a frame of their layers named by the component, in the layout their
 * CSS gives; any other one is a column with nothing between its layers.
 */
const WRAPPER_LAYOUT = {
  List: { gap: "3xs" }, // list-item.css .zen-list
  FormField: { gap: "xs" }, // form.css: Input outside-field gap
  FormFieldset: { gap: "xs" },
  FormActions: { direction: "row", gap: "sm", align: "center", justify: "end", wrap: true }, // form.css .zen-form-actions
  PageHeader: { gap: "xs" }, // page-header.css .zen-page-header
  Form: { gap: "lg" }, // Form.tsx: a Stack, gap lg by default
};
/** PageHeader props as the Dashboard header Type=Main draws them (DashboardHeader's props). */
const PAGE_HEADER_PROPS = { title: "title", childTitle: "childTitle", description: "subheading", actions: "actions", trailing: "trailing" };
/** AppShell's section rows (app-shell.css): Padding/Small above and below, Margin-Comfortable on the sides. */
const SHELL_ROW_PADDING = [12, 24, 12, 24];
/** Figma's Header/AppShell (16783:71068): AppShellHeader, on its own and as the AppShell's header (its variant pads it). */
const HEADER_APPSHELL = { id: "16783:71068", name: "Header/AppShell" };
const SHELL_ROW_PADDING_VARS = ["Spacing/Padding/Small", "Margin-Comfortable", "Spacing/Padding/Small", "Margin-Comfortable"];
/** Figma's ◇ Master-Layout (page 1128:29541): the page pattern, its Sidebar pattern and the Side-Bar that pattern holds. */
const MASTER_LAYOUT_SET = { id: "4122:41886", name: "Patterns/Pages/Density-Medium" };
/** The master layout's own height (its Viewport-Height): a shorter page keeps it, a longer one grows it. */
const MASTER_LAYOUT_HEIGHT = 982;
/** Figma Patterns/Sidebar (6040:67524), renamed from "Patterns/Sidebar/Density-Medium" on 2026-10-21. */
const MASTER_SIDEBAR_PATTERN = "Patterns/Sidebar";
const MASTER_SIDEBAR = "Side-Bar/Master/Basic";
const SIDEBAR_PATTERN_SET = { id: "6040:67524", name: MASTER_SIDEBAR_PATTERN };
/** Patterns/Sidebar's variants as "Expand,Shadow,Theme,Density" (read 2026-10-21): 16 of the 40 combinations, the themes
 *  other than Default only at Density=Small. */
const SIDEBAR_PATTERN_VARIANTS = [
  "Yes,Yes,Default,Medium", "Yes,No,Default,Medium", "Yes,Yes,Default,Small", "Yes,No,Default,Small",
  "Yes,No,Carved-Floating,Small", "Yes,No,Border,Small", "Yes,No,Borderless,Small", "Yes,No,Carved,Small",
  "No,Yes,Default,Medium", "No,No,Default,Medium", "No,Yes,Default,Small", "No,No,Default,Small",
  "No,No,Carved-Floating,Small", "No,Yes,Border,Small", "No,Yes,Borderless,Small", "No,Yes,Carved,Small",
].map((name) => Object.fromEntries(name.split(",").map((value, index) => [["Expand", "Shadow", "Theme", "Density"][index], value])));
/** Sidebar.tsx theme → Patterns/Sidebar Theme. */
const SIDEBAR_PATTERN_THEME = { default: "Default", border: "Border", borderless: "Borderless", carved: "Carved", "carved-floating": "Carved-Floating" };
/** The themes whose Sidebar sits flush with the page edge (sidebar.css): their rail is the 64px panel alone. */
const FLUSH_SIDEBAR_THEMES = new Set(["border", "borderless", "carved"]);

/**
 * The Patterns/Sidebar variant that draws a Sidebar's look ({ theme, density, shadow, collapsed }, Sidebar.tsx): its
 * Theme and Expand, then the nearest Density and Shadow the set has (Border at Density=Medium is Border · Small; the
 * flush rails are Shadow=Yes in Figma).
 */
export function sidebarPatternProps({ theme = "default", density = "medium", shadow = true, collapsed = false } = {}) {
  const want = { Expand: collapsed ? "No" : "Yes", Shadow: shadow === false ? "No" : "Yes", Theme: SIDEBAR_PATTERN_THEME[theme] ?? "Default", Density: density === "small" ? "Small" : "Medium" };
  const score = (variant) => (variant.Density === want.Density ? 2 : 0) + (variant.Shadow === want.Shadow ? 1 : 0);
  const [best] = SIDEBAR_PATTERN_VARIANTS.filter((variant) => variant.Expand === want.Expand && variant.Theme === want.Theme).sort((a, b) => score(b) - score(a));
  return { ...best };
}
/** The top bar's Search at its widest (app-shell.css). */
const HEADER_SEARCH_MAX = 400;
/** Container's content width by maxWidth (layout.css .zen-container[data-width]). */
const CONTAINER_MAX = { sm: 640, md: 960, lg: 1280, xl: 1440 };
/** AiChatBlock: Figma's Say-Hi text layer (its greeting) and the block's widest (ai-chat.css .zen-ai-block max-width). */
const AI_GREETING_LAYER = "How can I help you today?";
const AI_BLOCK_MAX = 800;
/** Sidebar's width open (sidebar.css --zen-sidebar-width; Figma's Side-Bar measures the same) and as the collapsed rail
 *  (basic: min-width 80px, Figma Patterns/Sidebar Expand=No · Density=Medium, 2026-10-21; at Density=Small 72, on the
 *  flush themes 64, as the pattern's rails measure; small-density: 20px + 4 × Padding/XSmall). */
const SIDEBAR_WIDTH = 240;
const SIDEBAR_RAIL_WIDTH = { basic: 80, "basic-small": 72, flush: 64, "small-density": 52 };
/** Margin-Comfortable: Container's gutter (layout.css) and the floating action's inset (app-shell.css). */
const MARGIN_COMFORTABLE = 24;

const literal = (value) => ({ kind: "literal", value });
/** A page element the push makes itself, to draw a code-only component with the Zen components it renders. */
const elementOf = (name, props, children = []) => ({ kind: "element", name, props: Object.fromEntries(Object.entries(props).filter(([, value]) => value)), children });
/** "Ava Chen" → "AC": the first letters of the first two words, as Avatar draws a name without a photo (Avatar.tsx). */
const initialsOf = (name) => String(name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "?";
/** An Avatar's initials as Avatar.tsx draws them: up to two letters, one on a small avatar (XSmall, 2XSmall; user, 2026-10-13). */
const SMALL_AVATAR = new Set(["xs", "2xs", "xsmall", "2xsmall", "XSmall", "2XSmall"]);
const avatarInitials = (text, size) => Array.from(String(text ?? "").trim()).slice(0, SMALL_AVATAR.has(size) ? 1 : 2).join("").toUpperCase() || "?";

const short = (step) => LONG_TO_SHORT[step] ?? step;
const pxOf = (step, table) => table.find(([, key]) => key === short(step))?.[0];
/** A page element's Figma id (figma-pull figmaDocId, the other way): "f14243-64878" → "14243:64878"; an id the pull added (".place") is none. */
export function figmaIdOf(docId) {
  const match = /^f([A-Za-z0-9_-]+)$/.exec(docId ?? "");
  return match ? match[1].replace(/_/g, ";").replace(/-/g, ":") : undefined;
}

const literalOf = (value) => (value?.kind === "literal" ? value.value : undefined);
/** A document value as plain data (literals, objects, arrays; anything else undefined). */
const plain = (value) => {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "array") return value.items.map(plain);
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plain(field)]));
  return undefined;
};
const textOf = (element) => element.children.filter((child) => child.kind === "text").map((child) => child.value).join("");
/** All the words a Text shows, its inline Links and spans included ("New to Zen? Create an account"). */
const deepText = (element) => element.children.map((child) => (child.kind === "text" ? child.value : child.kind === "element" ? deepText(child) : "")).join("");
/** A data field given as layers (`description: <Stack>…</Stack>`): the words they show, on one line. */
const layerWords = (value) => {
  if (value?.kind !== "element") return "";
  // Each Text (or Heading) is a line of its own: lines join with a space, a Text's inline words stay together.
  const lines = (element) => (["Text", "Heading"].includes(element.name) ? [deepText(element)] : element.children.flatMap((child) => (child.kind === "text" ? [child.value] : child.kind === "element" ? lines(child) : [])));
  return lines(value.node).join(" ").replace(/\s+/g, " ").trim();
};

/** The mapping's sets by code component (several for a component that is several Figma sets: Button's appearance). */
function setsByCode(mapping) {
  const out = new Map();
  for (const entry of new Set(mapping.sets.values())) out.set(entry.code, [...(out.get(entry.code) ?? []), entry]);
  return out;
}

/**
 * The Figma properties of an instance from its code props (instanceProps in figma-pull.mjs, the other way): every
 * mapped property whose code value is known (written, else the code default), by Figma name and Figma option.
 * `only`: write just these code props (a nested override names what it changes).
 */
function figmaProps(entry, code, mapping, notes, where, only = null, filled = null) {
  const props = {};
  const defaults = mapping.apiProps[entry.code];
  // A state prop written as its uncontrolled twin (a Chip's defaultSelected, a Checkbox's defaultChecked: what the Studio
  // writes so the page stays interactive) is the same Figma property.
  const twinOf = (prop) => `default${prop[0].toUpperCase()}${prop.slice(1)}`;
  const valueOf = (prop) => (prop in code ? code[prop] : twinOf(prop) in code ? code[twinOf(prop)] : only ? undefined : defaults?.get(prop));
  // A component that is several Figma sets (Sidebar: Basic, Workspace, Small-Density) maps the properties of them all:
  // write only those this set has (its contract's property names), when the contract knows the set.
  const known = entry.defaults && Object.keys(entry.defaults).length ? new Set(Object.keys(entry.defaults)) : null;
  const ownedBySet = (name) => !known || known.has(name);
  const swaps = new Map();
  for (const item of entry.own) {
    if (only && !only.has(item.prop)) continue;
    if (!ownedBySet(item.label ?? item.prop)) continue;
    const value = valueOf(item.prop);
    if (value === undefined) continue;
    const name = item.label ?? item.prop;
    if (item.type === "VARIANT") {
      const option = Object.entries(item.options ?? {}).find(([, codeValue]) => sameValue(codeValue, String(value)))?.[0];
      if (option) props[name] = option;
      else notes.push(`${where}: ${item.prop}="${value}" has no Figma option in ${name}`);
    } else if (item.type === "BOOLEAN") props[name] = Boolean(value);
    // A text property shows a number as its digits (a Badge-Counter's value 3).
    else if (item.type === "TEXT" && (typeof value === "string" || typeof value === "number")) props[name] = String(value);
    else if (item.type === "INSTANCE_SWAP" && typeof value === "string") swaps.set(item.prop, { name, icon: value });
  }
  for (const toggle of entry.toggles ?? []) {
    if (only && !only.has(toggle.prop)) continue;
    if (!ownedBySet(toggle.label)) continue;
    // On whenever the prop holds something: an icon, a slot's content, a text (Subheading's "96 results" is only what
    // the pull writes for a toggle without content). `filled`: the props that hold layers or data (not in `code`).
    const value = filled?.has(toggle.prop) ? true : valueOf(toggle.prop);
    props[toggle.label] = value !== undefined && value !== false && value !== null && value !== "";
  }
  for (const swap of swaps.values()) props[swap.name] = swap.icon;
  return props;
}

/** The set of a code component: by its set prop (Button appearance="flat" → Button/Flat), else its only set. */
/** Layers an override of names directly (words, visibility, a page instance's values), never a Zen component's set. */
const NOT_LIBRARY = new Set(["Use", "Text", "Heading", "Stack", "Grid", "Box", "Shape"]);

function entryFor(name, code, byCode, mapping) {
  const entries = byCode.get(name);
  if (!entries?.length) return null;
  const chooser = entries.find((entry) => entry.setProp);
  if (!chooser) return entries[0];
  const value = code[chooser.setProp] ?? mapping.apiProps[name]?.get(chooser.setProp) ?? chooser.setDefault;
  return entries.find((entry) => entry.setValue === value) ?? entries.find((entry) => !entry.setProp) ?? entries[0];
}

/** Literal props of an element ({ prop: value }); other kinds are noted by the caller. */
function codeProps(element) {
  return Object.fromEntries(Object.entries(element.props).filter(([, value]) => value.kind === "literal").map(([name, value]) => [name, value.value]));
}

/**
 * `text`: print the page with its ids (doc.mjs printPage(doc, { ids: true })) so the keys stay the same from one export to
 * the next; an element without one takes `newId()` (doc.mjs's random id by default, a counter in the CLI).
 */
/**
 * A slot prop holding several layers (`<>…</>`, user 2026-10-16) as the row Stack pages wrote before (a Stack of layout
 * props alone is the slot's layers for slotLayers / layersOf), so every Figma mapping below reads one element. Its id is
 * the owner's id and the prop, the same from one export to the next.
 */
function fragmentsAsRows(doc) {
  const value = (owner, name, entry) => {
    if (entry.kind === "fragment") return { kind: "element", node: { kind: "element", id: `${owner.id}~${name}`, name: "Stack", props: { direction: { kind: "literal", value: "row" }, gap: { kind: "literal", value: "xs" }, align: { kind: "literal", value: "center" } }, children: entry.children.map(child) } };
    if (entry.kind === "element") return { kind: "element", node: node(entry.node) };
    if (entry.kind === "array") return { kind: "array", items: entry.items.map((item) => value(owner, name, item)) };
    if (entry.kind === "object") return { kind: "object", fields: Object.fromEntries(Object.entries(entry.fields).map(([key, field]) => [key, value(owner, name, field)])) };
    return entry;
  };
  const child = (entry) => (entry.kind === "element" ? node(entry) : entry.kind === "map" ? { ...entry, node: node(entry.node) } : entry);
  const node = (element) => ({ ...element, props: Object.fromEntries(Object.entries(element.props).map(([name, entry]) => [name, value(element, name, entry)])), children: element.children.map(child) });
  return { ...doc, board: doc.board ? node(doc.board) : doc.board };
}

export function figmaFromPage(text, { mapping, nestedLayers = {}, newId, pages = {}, pageId } = {}) {
  const notes = [];
  const read = docFromText(text, newId ? { newId } : {});
  const { errors } = read;
  if (!read.doc) return { frame: null, notes: errors.map((error) => error.message) };
  // Each frame as its layout draws it: hidden layers and switched-off slots are not pushed (tools/studio/visibility.mjs).
  const lit = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);
  const shown = { ...read.doc, board: { ...read.doc.board, children: read.doc.board.children.map((node) => (node.kind === "element" ? pruneHidden(node, node.name === "Screen" ? screenLayout(lit(node, "device") ?? "desktop", lit(node, "layout")) : undefined) : node)).filter(Boolean) } };
  const doc = fragmentsAsRows(shown);
  const byCode = setsByCode(mapping);
  const screen = doc.board.children.find((child) => child.kind === "element" && child.name === "Screen");
  if (!screen) return { frame: null, notes: ["the page has no Screen"] };
  const device = literalOf(screen.props.device) ?? "desktop";
  const frameWidth = DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop;
  const boardElements = doc.board.children.filter((child) => child.kind === "element");
  if (boardElements.filter((child) => child.name === "Screen").length > 1) notes.push("only the first Screen is pushed");
  const overlays = boardElements.filter((child) => child.name === "Overlay").length;
  if (overlays) notes.push(`${overlays} Overlay${overlays > 1 ? "s" : ""} (dialogs and sheets the page opens): not pushed`);
  // Sections (F4) are areas of the Studio board; the push sends one Screen.
  const sections = boardElements.filter((child) => child.name === "Section").length;
  if (sections) notes.push(`${sections} Section${sections > 1 ? "s" : ""} (areas of the board): not pushed`);
  const slices = boardElements.filter((child) => child.name === "Slice").length;
  if (slices) notes.push(`${slices} Slice${slices > 1 ? "s" : ""} (export areas of the board): not pushed`);
  /** Code-only components drawn as a frame of their layers (or as their text), by name: one note each at the end. */
  const framed = new Map();
  const countFramed = (name) => framed.set(name, (framed.get(name) ?? 0) + 1);

  // Each node carries its element's document id (`key`): the plugin keeps it on the layer, so importing the page again
  // updates the same layers (Zen plugin src/plugin/studio-import.js).
  /** The page's own components by id → name (their instances are named after them, as Figma names an instance). */
  const localNames = new Map();
  const collect = (node) => {
    if (!node || node.kind !== "element") return;
    if ((node.name === "Component" || node.name === "ComponentSet") && node.props.id?.kind === "literal") localNames.set(String(node.props.id.value), String(node.props.name?.value ?? node.props.id.value));
    for (const value of Object.values(node.props)) if (value?.kind === "element") collect(value.node);
    for (const child of node.children ?? []) collect(child.kind === "map" ? child.node : child);
  };
  collect(doc.board);
  // The page's components and sets (dialect.mjs): a variant's name and values, a set's properties, an instance's values.
  const localModel = { mains: localComponents(doc.board), sets: componentSets(doc.board) };
  /** The project's other pages (`pages`: id → text), read once each, for `<Use page>` (Libraries' project components). */
  const otherPages = new Map();
  /** The other pages' mains being pushed, outermost first (`page/id`): one inside itself is left out, as the canvas does. */
  const drawing = new Set();
  const otherPage = (page) => {
    if (!otherPages.has(page)) {
      const board = typeof pages[page] === "string" ? docFromText(pages[page]).doc?.board : null;
      otherPages.set(page, board ? { board, model: { mains: localComponents(board), sets: componentSets(board) } } : null);
    }
    return otherPages.get(page);
  };
  /** A main of page `home` as this page pushes it: its own instances (no `page`) name `home`, so they resolve there. */
  const onPage = (node, home) => {
    if (!node || node.kind !== "element") return node?.kind === "map" ? { ...node, node: onPage(node.node, home) } : node;
    const props = Object.fromEntries(Object.entries(node.props).map(([name, value]) => [name, value?.kind === "element" ? { ...value, node: onPage(value.node, home) } : value]));
    if (node.name === "Use" && !props.page) props.page = { kind: "literal", value: home };
    return { ...node, props, children: (node.children ?? []).map((child) => onPage(child, home)) };
  };
  /** A layer tree made from another page's nodes keeps no ids of that page (they would meet this page's keys). */
  const withoutKeys = (node) => { if (!node || typeof node !== "object") return node; delete node.id; delete node.key; for (const child of node.children ?? []) withoutKeys(child); return node; };
  /** Figma's component property types by the page's (dialect.mjs COMPONENT_PROPERTY_TYPES). */
  const PROPERTY_TYPE = { text: "TEXT", boolean: "BOOLEAN", swap: "INSTANCE_SWAP", slot: "SLOT" };
  const figmaProperties = (properties) => properties.map((property) => ({ name: property.name, type: PROPERTY_TYPE[property.type], ...(property.default !== undefined ? { default: property.default } : {}), ...(property.preferred ? { preferred: property.preferred } : {}) }));
  /** A layer of a main bound to a component property: Figma's componentPropertyReferences by the property's name. */
  const REFERENCE = { "data-prop-text": "characters", "data-prop-visible": "visible", "data-prop-swap": "mainComponent" };
  const convert = (element, parent) => {
    const node = convertElement(element, parent);
    if (node && element.id) node.key = element.id;
    if (node && element.kind === "element") {
      const refs = Object.fromEntries(Object.keys(PROPERTY_BINDINGS).flatMap((attr) => (element.props[attr]?.kind === "literal" && REFERENCE[attr] ? [[REFERENCE[attr], String(element.props[attr].value)]] : [])));
      if (Object.keys(refs).length) node.propRefs = refs;
      // A layer an instance fills: Figma's slot in its main (the importer's createSlot), named as its property.
      if (element.props["data-prop-slot"]?.kind === "literal") node.slot = String(element.props["data-prop-slot"].value);
    }
    // The name the person gave a frame, shape or text (data-name, layer-meta.mjs) is its Figma name.
    const given = element.kind === "element" && FIGMA_NAMED.has(element.name) ? givenNameOf(element) : null;
    if (node && given) node.name = given;
    // A component sized like a layout layer (Card, ListBox: width / minWidth / maxWidth, sizing.ts): Fixed or Fill, and
    // the instance's min and max width.
    if (node?.type === "INSTANCE" && element.kind === "element") {
      const own = codeProps(element);
      if (mapping.apiProps[element.name]?.has("width")) {
        if (typeof own.width === "number" && node.fixedWidth === undefined && !node.fillW) node.fixedWidth = own.width;
        if (own.width === "fill") node.fillW = true;
        if (own.width === "hug") delete node.fillW;
      }
      if (typeof own.minWidth === "number") node.minW ??= own.minWidth;
      if (typeof own.maxWidth === "number") node.maxW ??= own.maxWidth;
    }
    return node;
  };
  const images = new Set();
  /** The properties a captured set has (contract), to write an item's only where its set takes them. */
  const ownProps = (set) => {
    const captured = mapping.contractSets?.get(set.id) ?? mapping.contractSets?.get(set.name);
    return captured ? new Set((captured.props ?? []).map((prop) => prop.name)) : null;
  };
  const onlyOwn = (set, props) => {
    const own = ownProps(set);
    return own ? Object.fromEntries(Object.entries(props).filter(([name]) => own.has(name))) : props;
  };

  // Texts with tabularNumbers (Figma's Numbers: Tabular, which the plugin API only reads): one note for the page.
  const tabular = [];
  const convertElement = (element, parent) => {
    if (element.kind !== "element") return null;
    // Not on screen: screen-reader text, a tab's panel while another tab is selected.
    if (NOT_DRAWN.has(element.name) || (element.name === "TabPanel" && literalOf(element.props.hidden) === true)) return null;
    const id = figmaIdOf(element.id);
    // A Zen instance's own opacity and blend (instance-look.mjs): the layer's, not a Figma property of its component.
    const look = takesInstanceLook(element.name) && INSTANCE_LOOK_PROPS.some((name) => element.props[name]) ? { opacity: literalOf(element.props.opacity), blendMode: literalOf(element.props.blendMode) } : null;
    if (look) element = { ...element, props: Object.fromEntries(Object.entries(element.props).filter(([name]) => !INSTANCE_LOOK_PROPS.includes(name))) };
    const code = codeProps(element);
    let node;
    if (element.name === "Stack" || element.name === "Grid" || element.name === "Box") node = frameNode(element, code, id, parent);
    // Figma's own shapes (Shape): RECTANGLE, ELLIPSE with its arcData, LINE (an arrow's end cap), POLYGON, STAR.
    else if (element.name === "Shape") node = shapeNode(code, id, element);
    // A page's own component: its main as Figma's COMPONENT around its layer, each instance an INSTANCE of it (the
    // importer makes the main first, then the instances; `local` is the page's component id).
    else if (element.name === "ComponentSet") {
      // Figma's component set: its variants side by side in a wrapping row (the set frame), its properties defined on it.
      const set = localModel.sets.find((entry) => entry.node === element);
      const variants = element.children.filter((child) => child.kind === "element" && child.name === "Component").map((child) => convert(child, { direction: "row", stretch: false, width: null })).filter(Boolean);
      node = { type: "COMPONENT_SET", local: String(code.id ?? ""), name: String(code.name ?? code.id ?? "Component set"), ...(id ? { id } : {}), ...(typeof code.description === "string" ? { description: code.description } : {}), ...(typeof code.link === "string" ? { link: code.link } : {}), properties: figmaProperties(set?.properties ?? []), layout: { mode: "HORIZONTAL", wrap: true, gap: 24, rowGap: 24, padding: [24, 24, 24, 24], counter: "MIN", primary: "MIN" }, children: variants, hugW: true, hugH: true };
    } else if (element.name === "Component") {
      const root = element.children.find((child) => child.kind === "element");
      const inner = root ? convert(root, parent) : null;
      const main = localModel.mains.find((entry) => entry.node === element);
      // A variant is named by its values ("Size=Small"), as Figma names one; a lone main carries its own properties.
      const named = main?.set ? { name: variantName(main.variant), variant: main.variant } : { name: String(code.name ?? code.id ?? "Component"), ...(main?.properties.length ? { properties: figmaProperties(main.properties) } : {}) };
      // The main hugs its layer (Figma's component frame around one layer); the layer keeps its own sizing inside.
      node = { type: "COMPONENT", local: String(code.id ?? ""), ...named, ...(typeof code.description === "string" ? { description: code.description } : {}), ...(typeof code.link === "string" ? { link: code.link } : {}), ...(id ? { id } : {}), layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: inner ? [inner] : [], hugW: true, hugH: true };
    } else if (element.name === "Use" && element.props.page?.kind === "literal") {
      // An instance of another page's component (Libraries' project components, a live link): a push sends one page, so
      // its main's layers go in its place, named after it.
      const home = String(element.props.page.value);
      // One of this page's own components, named by its page (a main on another page may hold one): the local way.
      if (pageId && home === pageId) return convertElement({ ...element, props: Object.fromEntries(Object.entries(element.props).filter(([name]) => name !== "page")) }, parent);
      const other = otherPage(home);
      const resolved = other ? resolveInstance(other.board, element, other.model) : null;
      const main = resolved ? other.model.mains.find((entry) => entry.id === resolved.main.id) : null;
      const root = main?.node.children.find((child) => child.kind === "element");
      if (!root) { notes.push(`An instance of ${String(code.of ?? "")} on page ${home} is not pushed: that page's component is not here`); return null; }
      const link = `${home}/${resolved.main.id}`;
      if (drawing.has(link)) { notes.push(`${resolved.set?.name ?? resolved.main.name} (page ${home}) sits inside itself through another page: that layer is not pushed`); return null; }
      drawing.add(link);
      try {
        node = withoutKeys(convert(onPage(root, home), parent));
      } finally {
        drawing.delete(link);
      }
      if (!node) return null;
      node.name = resolved.set?.name ?? resolved.main.name;
      notes.push(`${node.name} (a component of page ${home}): pushed as its layers, without its instance changes`);
    } else if (element.name === "Use") {
      // An instance of a set or a main, with its variant values and its property values (setProperties in the importer).
      const resolved = resolveInstance(doc.board, element, localModel);
      const local = resolved?.set?.id ?? String(code.of ?? "");
      node = { type: "INSTANCE", local, name: localNames.get(local) ?? "Instance", ...(resolved?.set ? { variant: resolved.variant } : {}), ...(resolved && Object.keys(resolved.values).length ? { props: resolved.values } : {}), ...(id ? { id } : {}), hugW: true, hugH: true };
      // What it puts in its main's slots (F7b): Figma's slot content, by the slot's name (the importer fills it).
      const fills = element.props.slots?.kind === "object" ? element.props.slots.fields : null;
      if (fills) {
        const slots = Object.entries(fills).map(([name, content]) => {
          const layers = content.kind === "element" ? [content.node] : content.kind === "fragment" ? content.children.filter((child) => child.kind === "element") : [];
          return { name, children: layers.map((layer) => convert(layer, { direction: "column", stretch: false, width: null })).filter(Boolean) };
        }).filter((slot) => slot.children.length);
        if (slots.length) node.slots = slots;
      }
      // Its overrides of its main's layers (F7b): placed by the main's drawn layers once the frame is built (below).
      const table = element.props.overrides?.kind === "object" ? element.props.overrides.fields : null;
      const main = resolved ? localModel.mains.find((entry) => entry.id === resolved.main.id) : null;
      if (table && main) {
        const plain = Object.fromEntries(Object.entries(table).map(([path, layer]) => [path, layer.kind === "object" ? Object.fromEntries(Object.entries(layer.fields).flatMap(([name, value]) => (value.kind === "literal" ? [[name, value.value]] : []))) : {}]));
        const pending = [];
        for (const [path, props] of Object.entries(plain)) {
          // The layer, through the nested instances of the page's own components it is in (Chip/Text): one step each,
          // in the main that draws it.
          const steps = layerChain(doc.board, main, path, localModel, plain);
          if (!steps?.every((step) => step.layer.id)) { notes.push(`${node.name}: its override of ${path} is not pushed (no such layer in its main)`); continue; }
          const last = steps.at(-1);
          const keys = steps.map((step) => ({ main: step.main.id, key: step.layer.id }));
          // A Zen component in the main (a Badge): its props as Figma properties, its words as its label; a layer inside
          // it (Badge/Dot, its nest() name) as a nested override, as a placed component's own overrides are pushed.
          if (!NOT_LIBRARY.has(last.layer.name) && byCode.has(last.layer.name)) {
            const { hidden, children, ...fields } = props;
            const where = `${node.name} › ${path}`;
            const own = codeProps(last.layer);
            if (last.inner === undefined) {
              const entry = entryFor(last.layer.name, { ...own, ...fields }, byCode, mapping);
              const figma = entry && Object.keys(fields).length ? figmaProps(entry, { ...own, ...fields }, mapping, notes, where, new Set(Object.keys(fields))) : null;
              if (Object.keys(fields).length && !Object.keys(figma ?? {}).length) notes.push(`${where}: ${Object.keys(fields).join(", ")} has no Figma property (not pushed)`);
              pending.push({ steps: keys, path, props: hidden === undefined ? {} : { hidden }, kind: last.layer.name, figma, ...(typeof children === "string" ? { text: children } : {}) });
              continue;
            }
            let owner = last.layer.name;
            for (const segment of last.inner.split("/")) owner = owner ? nestedLayers[owner]?.[segment.replace(/\[.*$/, "")] : null;
            const inner = owner ? entryFor(owner, fields, byCode, mapping) : null;
            if (!inner) { notes.push(`${where}: its component is not known (override left out)`); continue; }
            if (hidden !== undefined) notes.push(`${where}: hidden is not pushed (a layer inside a Zen component shows as its component draws it)`);
            const nested = { path: last.inner, set: { id: inner.id, name: inner.name }, props: figmaProps(inner, fields, mapping, notes, where, new Set(Object.keys(fields))), ...(typeof children === "string" ? { text: children } : {}) };
            if (Object.keys(fields).length && !Object.keys(nested.props).length) notes.push(`${where}: ${Object.keys(fields).join(", ")} has no Figma property (not pushed)`);
            pending.push({ steps: keys, path, props: {}, kind: last.layer.name, nested });
            continue;
          }
          if (last.inner !== undefined) { notes.push(`${node.name}: its override of ${path} is not pushed (${last.layer.name} has no layers of its own)`); continue; }
          pending.push({ steps: keys, path, props, kind: last.layer.name });
        }
        // On the node itself: the frame's assembly copies nodes ({ ...node, fillW }).
        if (pending.length) node.layerPending = { pending };
      }
    }
    else if (element.name === "Text" || element.name === "Heading") {
      const align = { center: "CENTER", end: "RIGHT", justify: "JUSTIFIED" }[code.align];
      // Text.tsx's defaults: Body/Base/Regular in Neutral Strongest; a tone paints with its Color/Content variable.
      const textStyle = code.textStyle ?? (element.name === "Heading" ? HEADING_STYLE[code.level ?? 2] : "Body/Base/Regular");
      const fill = contentToneToken(code.tone ?? "strongest");
      // wrap={false} is Figma's Auto width (one line, as wide as its words). Numbers: Tabular cannot be set by a plugin.
      if (code.tabularNumbers === true) tabular.push(id ?? element.name);
      // A Heading's layer is named for its level ("Heading 2"): Figma has no heading level, and the pull reads it back.
      const name = element.name === "Heading" ? `Heading ${code.level ?? 2}` : null;
      // Words with styles of their own (TextRun): ranges the importer styles with setRange… (text-runs.mjs).
      const segments = textSegments(element, textStyle, contentToneToken);
      node = { type: "TEXT", ...(id ? { id } : {}), ...(name ? { name } : {}), characters: deepText(element), textStyle, ...(fill ? { fill } : {}), ...(segments ? { segments } : {}), ...(align ? { align } : {}), ...(code.wrap === false ? { autoWidth: true } : {}) };
    } else if (element.name === "Icon" && typeof code.name === "string") node = { type: "INSTANCE", ...(id ? { id } : {}), name: code.name, set: { id: null, name: code.name }, props: {}, ...iconSizing(code.size) };
    // FileIcon: Figma's icon-media-file by Format; Flag: Figma's Flag by Name (both on 🍑 Iconography), sized as the code.
    else if (element.name === "FileIcon" && typeof code.format === "string") node = { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code.title === "string" ? code.title : `${code.format} file`, set: SETS.fileIcon, props: { Format: FILE_FORMAT[code.format] ?? code.format }, ...iconSizing(code.size) };
    else if (element.name === "Flag" && typeof code.name === "string") node = { type: "INSTANCE", ...(id ? { id } : {}), name: code.name, set: SETS.flag, props: { Name: code.name }, ...(FLAG_SIZE[scaleOf(code.size)] ? { sizeVar: FLAG_SIZE[scaleOf(code.size)] } : {}) };
    else if (element.name === "SidebarMenuItem") node = sidebarItemNode(code, id);
    else if (element.name === "AppShellAction") node = actionItemNode(code, id);
    else if (element.name === "Table") node = tableNode(element, code, id, parent);
    else if (element.name === "AppShell") node = appShellNode(element, code, id, parent);
    else if (element.name === "AppShellAccount") node = accountNode(element, code, id);
    else if (element.name === "PageHeader") node = pageHeaderNode(element, code, id);
    else if (element.name === "TopNavigation") node = topNavigationNode(element, code, id);
    else if (element.name === "ColorSelector") node = colorSelectorNode(element, code, id);
    else if (element.name === "UploaderFileItem") node = uploaderFileItemNode(element, code, id, parent);
    else if (element.name === "DatePickerSheet") node = datePickerSheetNode(element, code, id, parent);
    else if (element.name === "ChatMessage") node = chatMessageNode(element, code, id, parent);
    else if (element.name === "ChatThread") node = chatThreadNode(element, code, id);
    // Tabs written with TabItem children: the same Item-List of Tab-Items as its `items` (Tabs.tsx renders either).
    else if (element.name === "Tabs" && !element.props.items && element.children.some((child) => child.kind === "element" && child.name === "TabItem")) {
      const tabs = tabsOfChildren(element);
      node = instanceNode(tabs, codeProps(tabs), id, parent);
    }
    else if (element.name === "ChartCard" && element.children.some((child) => child.kind === "element" && CHART_COMPONENTS.has(child.name))) node = chartCardNode(element, code, id);
    else if (CHART_COMPONENTS.has(element.name)) node = chartNode(element, null, id);
    // A typed MetricCard is Figma's Metric-Card of that Type (figma-metric.mjs); a KPI one a Card around Metric-Inline.
    else if (element.name === "MetricCard" && metricCardTyped({ type: literalOf(element.props.type) })) node = metricCardNode(element, code, id);
    // A KPI MetricCard is a Card around Metric-Inline (Metric's set; Figma Metric-Card is the typed ones').
    else if (element.name === "MetricCard") node = cardAround(instanceNode({ ...element, name: "Metric" }, code), code.theme ?? "shadow", id, typeof code.label === "string" ? code.label : "MetricCard", code.color);
    else if (element.name === "AiChatBlock") node = aiChatBlockNode(element, code, id);
    // Metric is MetricCard's content without its Card: the same Metric-Inline set and parts.
    else if (element.name === "Metric") node = instanceNode(element, code, id);
    // A Menu draws its trigger on the page; its items open in a popover.
    else if (element.name === "Menu" && element.props.trigger?.kind === "element") node = convertElement(element.props.trigger.node, parent);
    // A Sidebar on its own is Figma's Patterns/Sidebar around its Side-Bar (an AppShell's: appShellNode places it).
    else if (element.name === "Sidebar" && !parent?.inShell) node = sidebarPatternNode(instanceNode(element, code, id, parent), sidebarLook(element, code.collapsed === true));
    else node = instanceNode(element, code, id, parent);
    if (node && code.position === "absolute") node.absolute = absoluteOf(code);
    if (node && look) {
      const css = instanceLookStyle(look);
      if (css?.opacity !== undefined) node.opacity = css.opacity;
      const blend = figmaBlendOf(look.blendMode, true);
      if (blend) node.blendMode = blend;
    }
    return node;
  };

  /**
   * A Shape as Figma's own node (src/components/Shape): its type's node, sized in px (a line: its length, no height),
   * filled and stroked with its Color/Background and Color/Border variables, a rectangle's corners on Corner-Radius,
   * an ellipse's arc as arcData, a star's ratio as innerRadius, an arrow as a LINE with Figma's "Line arrow" end cap;
   * rotation (degrees, counter-clockwise, about the centre) and opacity as Figma's. `shape: true` tells the importer
   * from a chart mark's ELLIPSE.
   */
  function shapeNode(code, id, element = null) {
    const kind = SHAPE_NODE[code.type] ? code.type : "rectangle";
    const line = kind === "line" || kind === "arrow";
    const vector = kind === "vector";
    // An image fill (F8, figma-image.mjs): the importer's IMAGE paint over the colour; a shape with one has no colour unless given.
    const picture = line ? null : imageFillOf(code, element);
    if (picture) images.add(picture.src);
    const fill = code.fill ?? (line || vector || picture ? "none" : DEFAULT_SHAPE_FILL);
    const stroke = code.stroke ?? (line || vector ? DEFAULT_LINE_STROKE : "none");
    const width = typeof code.width === "number" ? code.width : SHAPE_DEFAULT_SIZE;
    const height = line ? 0 : typeof code.height === "number" ? code.height : SHAPE_DEFAULT_SIZE;
    const arc = kind === "ellipse" ? normalizeArc({ start: code.arcStart, sweep: code.arcSweep, ratio: code.arcRatio }) : null;
    const data = arc && !(arc.sweep >= 100 && arc.ratio <= 0) ? arcData(arc) : null;
    const radius = kind === "rectangle" && typeof code.radius === "string" ? SHAPE_RADIUS[LONG_TO_SHORT[code.radius] ?? code.radius] : null;
    const weight = typeof code.strokeWeight === "number" ? code.strokeWeight : 1;
    return {
      type: SHAPE_NODE[kind], shape: true, ...(id ? { id } : {}), name: SHAPE_LABEL[kind],
      ...(fill !== "none" && shapeFillTokens[fill] ? { fill: shapeFillTokens[fill] } : {}),
      ...(picture ? { imageFill: picture } : {}),
      ...(stroke !== "none" && shapeStrokeTokens[stroke] ? { stroke: shapeStrokeTokens[stroke], strokeWeight: weight, strokeAlign: line ? "CENTER" : { center: "CENTER", outside: "OUTSIDE", inside: "INSIDE" }[code.strokeAlign] ?? (vector ? "CENTER" : "INSIDE") } : {}),
      // A vector: its path in the node's px (Figma's vectorPaths), stretched from its viewBox to its size.
      ...(vector && kind !== "boolean" ? vectorSpec(code, width, height) : {}),
      // A boolean group (F9b): Figma's BOOLEAN_OPERATION of its shapes, each at its X / Y inside it (the importer
      // builds them, then combines them).
      ...(kind === "boolean" ? booleanSpec(code, element) : {}),
      ...(kind === "arrow" ? { endCap: "ARROW_LINES" } : {}),
      ...(data ? { arc: { start: data.startingAngle, end: data.endingAngle, inner: data.innerRadius } } : {}),
      ...(kind === "polygon" || kind === "star" ? { pointCount: typeof code.pointCount === "number" ? code.pointCount : kind === "star" ? 5 : 3 } : {}),
      ...(kind === "star" ? { innerRadius: (typeof code.starRatio === "number" ? code.starRatio : STAR_RATIO) / 100 } : {}),
      ...(radius && radius[1] ? { radius: radius[1], radiusVar: radius[0] } : {}),
      ...(typeof code.rotation === "number" && code.rotation % 360 ? { rotation: code.rotation } : {}),
      ...(["horizontal", "vertical", "both"].includes(code.flip) ? { flip: code.flip } : {}),
      ...(typeof code.opacity === "number" && code.opacity < 100 ? { opacity: Math.max(0, code.opacity) / 100 } : {}),
      // Its layer blend (blend-modes.mjs), when not Normal.
      ...(figmaBlendOf(code.blendMode, false) ? { blendMode: figmaBlendOf(code.blendMode, false) } : {}),
      ...(code.width === "fill" ? { fillW: true } : { fixedWidth: width }),
      ...(code.height === "fill" && !line ? { fillH: true } : { fixedHeight: height }),
    };
  }

  /** A boolean group's Figma operation, name and its shapes (pushed as shapes are). */
  function booleanSpec(code, element) {
    const [operation, name] = BOOLEAN_OP[code.operation] ?? BOOLEAN_OP.union;
    const children = (element?.children ?? []).filter((child) => child.kind === "element" && child.name === "Shape").map((child) => convert(child, { direction: "column", stretch: false })).filter(Boolean);
    return { booleanOperation: operation, name, children };
  }

  /** A vector's Figma vectorPaths (`d` fitted to `width` × `height`, its winding rule), or none when its path is not one. */
  function vectorSpec(code, width, height) {
    const commands = parseVectorPath(typeof code.d === "string" ? code.d : "");
    const box = commands ? parseViewBox(code.viewBox) ?? vectorBounds(commands) : null;
    if (!commands || !box) return {};
    return { vectorPaths: [{ windingRule: code.fillRule === "evenodd" ? "EVENODD" : "NONZERO", data: fitVectorPath(commands, box, width, height) }] };
  }

  /** A page margin's px on this Screen's device (Margin-Comfortable 24, 20 on a phone), or undefined for a ladder step. */
  const marginPx = (step) => (typeof step === "string" && MARGIN_PX[step] ? MARGIN_PX[step][device] ?? MARGIN_PX[step].desktop : undefined);

  /** position="absolute": Figma's constraints and the insets to the pinned edges, in px (figma-pull positioned, the other way). */
  function absoluteOf(code) {
    const cx = { left: "MIN", right: "MAX", center: "CENTER", "left-right": "STRETCH" }[code.constraintX ?? "left"] ?? "MIN";
    const cy = { top: "MIN", bottom: "MAX", center: "CENTER", "top-bottom": "STRETCH" }[code.constraintY ?? "top"] ?? "MIN";
    // A token step, or px (Figma's X / Y in a free frame).
    const inset = (step) => (typeof step === "number" ? step : marginPx(step) ?? pxOf(step ?? "none", PADDING_PX) ?? 0);
    return { cx, cy, left: inset(code.insetLeft), right: inset(code.insetRight), top: inset(code.insetTop), bottom: inset(code.insetBottom) };
  }

  /** A data item (or a Sidebar row) as its primitive: Label / Icon shown, Icon-Src, Select, the label text (itemFields, the other way). */
  function itemNode(set, fields, { id, key, selected = false, labelKey = "label", iconKey = "icon", look = {} } = {}) {
    const label = typeof fields[labelKey] === "string" ? fields[labelKey] : typeof fields.children === "string" ? fields.children : "";
    const icon = typeof fields[iconKey] === "string" ? fields[iconKey] : null;
    const props = onlyOwn(set, { Label: label !== "", Icon: Boolean(icon), ...(icon ? { "Icon-Src": icon } : {}), Select: selected ? "Yes" : "No", ...look });
    const name = typeof fields["aria-label"] === "string" ? fields["aria-label"] : label || set.name;
    return { type: "INSTANCE", ...(id ? { id } : {}), ...(key ? { key } : {}), name, set, props, ...(label ? { text: label } : {}) };
  }

  /** SidebarMenuItem as Figma's Menu-Item: its row, and its counter (Sidebar.tsx: a Badge-Counter after the label) in
   *  the Counter it shows; the rail's rows mark it with their Noti-Dot (sidebarRail). */
  function sidebarItemNode(code, id) {
    const node = itemNode(SETS.menuItem, code, { id });
    const counter = typeof code.counter === "number" || typeof code.counter === "string" ? String(code.counter).trim() : "";
    Object.assign(node.props, onlyOwn(node.set, { Counter: counter !== "" }));
    if (counter) node.nested = [...(node.nested ?? []), { path: "Counter", props: {}, text: counter }];
    return node;
  }

  /** A Segmented's Level and Size on its items (Segmented.tsx: secondary, md; "overlay" = Black-Overlay), as Figma's item options. */
  const SEGMENT_LEVEL = { primary: "Primary", overlay: "Black-Overlay", "black-overlay": "Black-Overlay", "white-overlay": "White-Overlay" };
  const segmentLook = (code) => ({ Level: SEGMENT_LEVEL[code.level] ?? "Secondary", Size: ["sm", "small"].includes(code.size) ? "Small" : "Medium" });

  /** AppShellAction as Figma's Dashboard Header Action-Item: Theme Flat, its notification dot or number, the glyph it draws. */
  function actionItemNode(code, id) {
    const count = typeof code.count === "number" ? code.count : 0;
    const props = { Notification: Boolean(code.dot) || count > 0, ...(code.appearance === "flat" ? { Theme: "Flat" } : {}), ...(count > 0 ? { "Noti-type": "Number" } : {}) };
    return { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "Action", set: SETS.actionItem, props, ...(count > 0 ? { textList: [String(count)] } : {}), ...(typeof code.icon === "string" ? { swapIcon: code.icon } : {}) };
  }

  /**
   * A code-only component (no Figma set) as a frame of its layers, named by the component, so nothing inside it is lost:
   * the layers in its node props, then its children, in its CSS layout (WRAPPER_LAYOUT; Container's gutter). One with
   * text and no layers (a Link) is its text; one with neither is left out.
   */
  function wrapperNode(element, code, id, where, parent = null) {
    const layers = [
      ...Object.values(element.props).filter((value) => value.kind === "element").map((value) => value.node),
      ...element.children.filter((child) => child.kind === "element"),
    ];
    const label = textOf(element).trim();
    if (!layers.length && label) {
      countFramed(element.name);
      // In Text.tsx's defaults (Body/Base/Regular, Neutral Strongest), as the page inherits them: a bare text imported
      // at Figma's 12px and pasted at 14px in black (board test, 2026-10-18).
      return { type: "TEXT", ...(id ? { id } : {}), characters: label, textStyle: "Body/Base/Regular", fill: contentToneToken("strongest") };
    }
    const shape = WRAPPER_LAYOUT[element.name] ?? {};
    const gutter = element.name === "Container" && code.gutter !== false ? { paddingX: "xl" } : {};
    // Container's content stops at its maxWidth (layout.css: lg 1280 by default; full has none).
    const contentMax = element.name === "Container" ? CONTAINER_MAX[code.maxWidth ?? "lg"] : undefined;
    // A surface drawn as a frame (no Figma set) still closes a Table inside it.
    const within = SURFACES.has(element.name) ? { ...(parent ?? {}), surface: true } : parent;
    // A wrapper's own gap (Form's) wins over its layout's.
    const own = code.gap !== undefined ? { gap: code.gap } : {};
    const frame = layers.length ? frameNode(elementOf("Stack", {}, layers), { gap: "none", ...shape, ...own, ...gutter, ...(contentMax ? { contentMax } : {}) }, id, within) : null;
    if (!frame?.children.length) {
      notes.push(`${where}: no Figma set for ${element.name} (left out)`);
      return null;
    }
    countFramed(element.name);
    return { ...frame, name: element.name };
  }

  /** A row frame of layers (the AppShell's parts), nothing between them. */
  const shellFrame = (name, mode, children, extra = {}) => ({ type: "FRAME", name, layout: { mode, gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: children.filter(Boolean), ...extra });
  const layerOf = (element, prop) => (element.props[prop]?.kind === "element" ? element.props[prop].node : null);
  /** A node prop's layers: a Stack of layout props alone gives its layers (as slotLayers does), anything else itself. */
  const layersOf = (element, prop) => {
    const node = layerOf(element, prop);
    if (!node) return [];
    return node.name === "Stack" && !Object.keys(node.props).some((name) => !["gap", "direction", "align", "justify", "wrap"].includes(name)) ? node.children.filter((child) => child.kind === "element") : [node];
  };

  /**
   * AppShell with the Zen components it renders (app-shell.css), named by Zen: the Sidebar, then a column of the top bar
   * (Figma's Dashboard header Type=Navigation: the collapse toggle and the AppShellHeader's `leading` in Leading-Slots,
   * `center` in Center-Slots, `actions` in Trailing-Slots), its `main` and `sections` rows, the page (`children`), the
   * floating actions pinned bottom right; the docked `sidePanel` last. Drawn on ◇ Master-Layout's Sidebar pattern: the
   * other patterns' panes and progress are not drawn yet (docs/research/appshell-rebuild-2026-10-19.md, phase 2b).
   */
  function appShellNode(element, code, id, parent = null) {
    const sidebar = layerOf(element, "sidebar");
    const overrides = plain(element.props.overrides) ?? {};
    // Header/AppShell (AppShellHeader.tsx): the top row's leading · center · actions, the Main row and the section rows.
    const header = layerOf(element, "header")?.name === "AppShellHeader" ? layerOf(element, "header") : null;
    const hasTopBar = Boolean(header) && ["leading", "center", "actions"].some((prop) => layerOf(header, prop));
    for (const prop of ["leadingPane", "trailingPane", "progress"]) if (layerOf(element, prop)) notes.push(`AppShell ${prop}: not drawn in Figma yet (the Sidebar pattern only)`);
    // The collapse toggle (AppShell.tsx, collapse="header"): a Zen Sidebar that is not the workspace rail, with a top bar.
    // Header/AppShell draws it as its Collapse Button.
    const collapsed = literalOf(sidebar?.props.collapsed) ?? code.defaultSidebarCollapsed ?? code.sidebarCollapsed ?? false;
    const shellToggles = sidebar?.name === "Sidebar" && literalOf(sidebar.props.variant) !== "workspace" && code.layout !== "drawer";
    const toggle = hasTopBar && (code.collapse ?? "header") === "header" && shellToggles;
    // The column's width: the shell's less the open Sidebar (another sidebar, a collapsed one or a side panel: unknown).
    const aside = layerOf(element, "sidePanel") ? convert(layerOf(element, "sidePanel"), { direction: "row", stretch: true }) : null;
    const sideWidth = !sidebar ? 0 : sidebarWidth(sidebar, collapsed, code.pattern);
    const columnWidth = typeof parent?.width === "number" && sideWidth !== null && !aside ? parent.width - sideWidth : null;
    const stretch = { direction: "column", stretch: true, width: columnWidth };
    const filling = (layers, width = columnWidth) => layers.map((layer) => convert(layer, { direction: "column", stretch: true, width })).filter(Boolean).map((node) => (node.absolute ? node : { ...node, fillW: true }));
    // The header: Header/AppShell with its slots (appShellHeaderParts), the AppShell's toggle as its Collapse Button.
    const headerNode = header ? convert(header, stretch) : null;
    if (headerNode?.type === "INSTANCE") headerNode.props = { ...headerNode.props, "Collapse Button": toggle };
    const floating = layerOf(element, "floatingActions") ? convert(layerOf(element, "floatingActions"), stretch) : null;
    const page = filling(element.children.filter((child) => child.kind === "element"));
    // A desktop task's ActionBar is the page's last child (sticky); nothing else is a footer.
    const footer = [];
    // A Sidebar the AppShell collapses (defaultSidebarCollapsed) is drawn as the rail too.
    const shellSidebar = sidebar?.name === "Sidebar" && collapsed && literalOf(sidebar.props.collapsed) === undefined ? { ...sidebar, props: { ...sidebar.props, collapsed: literal(true) } } : sidebar;
    // Its Side-Bar alone (inShell): the master or the row puts it in Patterns/Sidebar with its look.
    const sidebarNode = shellSidebar ? convert(shellSidebar, { direction: "row", stretch: true, inShell: true }) : null;
    // collapse="sidebar": the toggle is the Side-Bar's own Collapse Button.
    if (shellToggles && code.collapse === "sidebar" && sidebarNode?.type === "INSTANCE") sidebarNode.props = { ...sidebarNode.props, "Collapse Button": true };
    const look = shellSidebar?.name === "Sidebar" ? sidebarLook(shellSidebar, collapsed, code.pattern) : null;
    const banner = layersOf(element, "banner");
    // The page is Canvas (app-shell.css; canvas="alt" | "flat" the other two).
    const canvas = { fill: `Background/Canvas/${{ alt: "Alt", flat: "Flat" }[code.canvas] ?? "Default"}` };
    // Figma's ◇ Master-Layout, when every part has its place in it.
    const master = masterLayoutNode({ sidebar: sidebarNode, collapsed, look, header: headerNode, page, footer, floating, aside, canvas: code.canvas });
    if (master && !banner.length) return { ...master, ...(id ? { id } : {}) };
    if (master) return shellFrame("AppShell", "VERTICAL", [...filling(banner), { ...master, fillW: true }], { ...(id ? { id } : {}), ...canvas });
    const column = shellFrame("Column", "VERTICAL", [
      headerNode && { ...headerNode, fillW: true },
      shellFrame("Main", "VERTICAL", page, { fillW: true }),
      ...footer,
      floating && { ...floating, absolute: { cx: "MAX", cy: "MAX", left: 0, right: MARGIN_COMFORTABLE, top: 0, bottom: MARGIN_COMFORTABLE } },
    ], { fillW: true });
    const row = [look ? sidebarPatternNode(sidebarNode, look) : sidebarNode, column, aside].filter(Boolean).map((node) => (node === column ? node : { ...node, fillH: true }));
    if (!banner.length) return shellFrame("AppShell", "HORIZONTAL", row, { ...(id ? { id } : {}), ...canvas });
    return shellFrame("AppShell", "VERTICAL", [...filling(banner), shellFrame("Frame", "HORIZONTAL", row, { fillW: true })], { ...(id ? { id } : {}), ...canvas });
  }

  /**
   * AppShell as Figma's ◇ Master-Layout (Patterns/Pages/Density-Medium Level=Master, read 2026-10-17; user: "app shell và
   * master layout không khớp với nhau thành component master layout"): the Sidebar pattern (its variant by the Sidebar's
   * look, sidebarPatternProps) around the Side-Bar the Sidebar converts to; Header/Dashboard's Sections slot with the top bar and the section rows,
   * Dashboard header rows padded as the master's own rows are (the top bar Margin-Comfortable · Padding/Small below, a
   * section Padding/Small · Margin-Comfortable); Body's Content slot with the page, Body padded Margin-Comfortable and
   * Gap/XSmall apart as AppShell's Body is (app-shell.css .zen-app-shell__body); Floating-Item; the Side-Panel. Null when
   * a part has no place in it (an aside that is no SidePanel, a sidebar that is no instance): the frames then.
   */
  function masterLayoutNode({ sidebar, collapsed, look, header, page, footer, floating, aside, canvas }) {
    if (sidebar && sidebar.type !== "INSTANCE") return null;
    if (aside && !(aside.type === "INSTANCE" && aside.set?.name === "Side-Panel")) return null;
    const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);
    const nested = [], slots = [], edits = [];
    /** One part's own instance writes, at its place in the master: nested paths, slots and edit layers re-rooted, its
     *  hidden layers as edits inside it (a name alone would hide the master's first layer of that name). */
    const inside = (spec, path, layers) => {
      const own = Object.fromEntries(["set", "text", "texts", "textList", "swapIcon"].filter((field) => spec[field] !== undefined).map((field) => [field, spec[field]]));
      nested.push({ path, props: spec.props ?? {}, ...own });
      for (const entry of spec.nested ?? []) nested.push({ ...entry, path: `${path}/${entry.path}` });
      for (const slot of spec.slots ?? []) slots.push({ ...slot, within: [...layers, ...list(slot.within)] });
      for (const edit of spec.edits ?? []) edits.push({ ...edit, layer: [...layers, ...list(edit.layer)] });
      for (const name of spec.hide ?? []) edits.push({ layer: [...layers, name], visible: false });
    };
    if (sidebar) {
      // The pattern's variant by the Sidebar's look (theme, density, shadow; Expand by the collapsed state).
      const pattern = look ? sidebarPatternProps(look) : { Expand: collapsed ? "No" : "Yes" };
      const expand = pattern.Expand;
      nested.push({ path: "Patterns", props: pattern });
      // The pattern's Side-Bar (Patterns/Density/Comfortable/Sidebar/Yes|No): a nested path matches it by its first part.
      const { set, ...rest } = sidebar;
      const layers = [MASTER_SIDEBAR_PATTERN, `Patterns/Density/Comfortable/Sidebar/${expand}`];
      inside(set?.name === MASTER_SIDEBAR ? rest : sidebar, "Patterns/Patterns", layers);
      // As tall as the page (the component's is the viewport's 982).
      edits.push({ layer: layers, fillH: true });
    }
    // The header: the master's Header/Dashboard swapped to Header/AppShell (the master predates it), its variant and
    // switches set, its slots filled where it now sits; a header with nothing in it hides the master's.
    if (header?.type === "INSTANCE" && header.set?.name === HEADER_APPSHELL.name) {
      nested.push({ path: "Header/Dashboard", set: header.set, name: HEADER_APPSHELL.name, props: header.props ?? {} });
      for (const slot of header.slots ?? []) slots.push({ ...slot, within: [HEADER_APPSHELL.name, ...list(slot.within)] });
    } else edits.push({ layer: ["Header/Dashboard"], visible: false });
    // The page grows the master as the Studio's Screen grows (Figma's master is one viewport tall, its Content filling
    // it): Main-Container, Body and the Content slot hug their content; the viewport's height stays the minimum.
    const content = [...page, ...footer];
    if (content.length) slots.push({ name: "Content", within: ["Body"], hugH: true, children: content });
    edits.push({ layer: ["Main-Container"], hugH: true }, { layer: ["Body"], hugH: true });
    // The master centres its row's layers on the cross axis: a page shorter than the viewport would sit mid-height.
    edits.push({ layer: [], counter: "MIN" });
    if (floating) {
      const { absolute, ...action } = floating;
      slots.push({ name: "Floating-Item", within: ["Floating-Actions"], children: [action] });
    }
    if (aside) {
      inside(aside, "Side-Panel", ["Side-Panel"]);
      edits.push({ layer: ["Side-Panel"], fillH: true });
    }
    // The master's own fill is Canvas/Default; canvas="alt" | "flat" overrides it.
    const fill = { alt: "Background/Canvas/Alt", flat: "Background/Canvas/Flat" }[canvas];
    return {
      type: "INSTANCE", name: "AppShell", set: MASTER_LAYOUT_SET,
      props: { Level: "Master", Sidebar: Boolean(sidebar), "Side-Panel": Boolean(aside), "Floating-Actions": Boolean(floating) },
      ...(nested.length ? { nested } : {}), slots, edits, ...(fill ? { fill } : {}), fillW: true, minH: MASTER_LAYOUT_HEIGHT,
    };
  }

  /**
   * A Sidebar as Figma draws one on its own (beside the page, the Screen's chrome, an AppShell drawn as frames): its
   * Side-Bar inside Patterns/Sidebar (6040:67524), whose variant gives the theme, density, shadow and rail
   * (sidebarPatternProps), the Side-Bar's own writes at its place there (the Patterns/Density/Comfortable/Sidebar/Yes|No
   * layer), as masterLayoutNode places it in the master. Another set (Workspace, Small-Density) stays as it is: the
   * pattern holds the Basic panel only.
   */
  function sidebarPatternNode(sideBar, look) {
    if (sideBar?.type !== "INSTANCE" || sideBar.set?.name !== MASTER_SIDEBAR) return sideBar;
    const props = sidebarPatternProps(look);
    const layer = `Patterns/Density/Comfortable/Sidebar/${props.Expand}`;
    const within = (value) => [layer, ...(Array.isArray(value) ? value : value ? [value] : [])];
    const { set, name, props: own, text, texts, textList, swapIcon, nested = [], slots = [], edits = [], hide = [], ...place } = sideBar;
    return {
      ...place, name: name === MASTER_SIDEBAR ? MASTER_SIDEBAR_PATTERN : name, set: SIDEBAR_PATTERN_SET, props,
      // The pattern's Side-Bar: a nested path matches it by its first part.
      nested: [
        { path: "Patterns", props: own ?? {}, ...Object.fromEntries(Object.entries({ text, texts, textList, swapIcon }).filter(([, value]) => value !== undefined)) },
        ...nested.map((entry) => ({ ...entry, path: `Patterns/${entry.path}` })),
      ],
      ...(slots.length ? { slots: slots.map((slot) => ({ ...slot, within: within(slot.within) })) } : {}),
      // Its hidden layers inside it (a name alone would hide the pattern's first layer of that name); as tall as the pattern.
      edits: [...edits.map((edit) => ({ ...edit, layer: within(edit.layer) })), ...hide.map((hidden) => ({ layer: [layer, hidden], visible: false })), { layer: [layer], fillH: true }],
    };
  }

  /* ── charts (figma-charts.mjs: sets, variants, header properties) ── */

  /** A prop's plain data, its mock data when it reads `mock.…`; `true` for a prop that holds no data (a handler, a node). */
  const chartValue = (value) => {
    if (value?.kind === "ref" && value.root === "mock") return value.path.reduce((data, step) => data?.[step], doc.mock);
    const data = plain(value);
    return data === undefined && value ? true : data;
  };
  /** A header text a ChartCard prop shows: a string or number, else the words its layers show. */
  const headerText = (value) => (value?.kind === "element" ? layerWords(value) : textValue(literalOf(value)));
  /** An icon prop as an icon name: a name, or an <Icon name> node. */
  const iconName = (value) => (typeof literalOf(value) === "string" ? literalOf(value) : value?.kind === "element" && value.node.name === "Icon" ? literalOf(value.node.props.name) ?? null : null);

  /**
   * A chart as Figma's set of its kind (figma-charts.mjs chartFigma: Line, Multi-Line by its Sector, Bar by its
   * Orientation, Donut, Radial, Area by its Type…), with Show Average / Show Legend from the code. `header`: a ChartCard's
   * header as the set's properties; null for a chart on its own, whose header is off and Heading hidden (its title has
   * no toggle). Figma draws its own sample data: a note says so.
   */
  function chartNode(element, header, id) {
    const where = `${element.name}${id ? ` (${id})` : ""}`;
    const values = Object.fromEntries(Object.entries(element.props).map(([name, value]) => [name, chartValue(value)]));
    const drawn = chartFigma(element.name, values, notes, where);
    if (!drawn) return null;
    if (!drawn.drawn) notes.push(`${element.name}: Figma's ${drawn.set.name} draws its own sample data`);
    const { set } = drawn;
    // The page's data in the set's slots, nested instances and own layers (Stack-Bar, Donut: figma-charts.mjs marks).
    const marks = { ...(drawn.edits ? { edits: drawn.edits } : {}) };
    const nested = [...(header?.nested ?? []), ...(drawn.nested ?? [])];
    const slots = [...(header?.slots ?? []), ...(drawn.slots ?? [])];
    if (!header) return { type: "INSTANCE", ...(id ? { id } : {}), name: set.name, set, props: { ...BARE_HEADER, ...drawn.props }, hide: [HEADING_LAYER], ...(nested.length ? { nested } : {}), ...(slots.length ? { slots } : {}), ...marks };
    return { type: "INSTANCE", ...(id ? { id } : {}), name: set.name, set, props: { ...header.props, ...drawn.props }, ...(nested.length ? { nested } : {}), ...(slots.length ? { slots } : {}), ...marks };
  }

  /**
   * ChartCard as Chart.tsx draws it: a Card (its theme) holding its chart's set (chartNode) with the header turned on
   * by its props (Title, Show Icon + Icon, Show Description + Description, Show Value + Value, Show Ranges with
   * `ranges` as the Segmented's items, Show Open with `onOpen`). The chart keeps its own key, so a pull gives it back
   * its element id.
   */
  function chartCardNode(element, code, id) {
    const charts = element.children.filter((child) => child.kind === "element" && CHART_COMPONENTS.has(child.name));
    const chart = charts[0];
    const where = `ChartCard${id ? ` (${id})` : ""}`;
    const others = element.children.filter((child) => child.kind === "element" && child !== chart).length;
    if (others) notes.push(`${where}: ${others} layer${others > 1 ? "s" : ""} beside its chart not pushed (Figma's Chart-Card holds one chart)`);
    const title = headerText(element.props.title);
    const ranges = Array.isArray(plain(element.props.ranges)) ? plain(element.props.ranges) : [];
    const icon = iconName(element.props.icon);
    if (element.props.icon && !icon) notes.push(`${where}: its icon is not an icon name (Show Icon off)`);
    // The range switch (Chart.tsx: a Segmented, secondary md) fills the card and splits it, or hugs its items
    // (rangesFullWidth={false}): then the chart's Segmented and its Item-List hug too.
    const full = code.rangesFullWidth !== false;
    const items = ranges.map((range) => ({ ...itemNode(SETS.segment, range ?? {}, { selected: range?.id !== undefined && range.id === (code.range ?? ranges[0]?.id), look: segmentLook({}) }), ...(full ? { fillW: true } : {}) }));
    const header = {
      props: chartHeaderFigma({ title, icon, description: headerText(element.props.description), value: headerText(element.props.value), ranges: items.length, open: Boolean(element.props.onOpen) }),
      ...(items.length && !full ? { nested: [{ path: "Segmented", hugW: true }] } : {}),
      ...(items.length ? { slots: [{ name: "Item-List", children: items, ...(full ? {} : { hugW: true }) }] } : {}),
    };
    const drawing = chartNode(chart, header, null);
    if (!drawing) return null;
    if (chart.id) drawing.key = chart.id;
    return cardAround(drawing, code.theme ?? "default", id, title || "ChartCard", code.color, code.surface);
  }

  /**
   * AiChatBlock as Figma's AI/Chat-Block/Pale (AiChat.tsx): its greeting in the Say-Hi text, the look of the
   * AiChatField it holds on the block's own field, its suggestions as Chip/Normal items in Suggestions (off without
   * any), as wide as its column up to 800 and centred (ai-chat.css .zen-ai-block) in a frame of its name.
   */
  function aiChatBlockNode(element, code, id) {
    const where = `AiChatBlock${id ? ` (${id})` : ""}`;
    const own = plain(element.props.overrides) ?? {};
    const chipOf = (item) => {
      const fields = { variant: "normal", size: "medium", level: "secondary", theme: item.icon ? "leading-icon" : "text-only", ...(typeof item.icon === "string" ? { leading: item.icon } : {}), ...(own[`Suggestion[${item.label}]`] ?? {}) };
      const chip = elementOf("Chip", Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, literal(value)])), [{ kind: "text", value: item.label }]);
      return instanceNode(chip, codeProps(chip));
    };
    const suggestions = (Array.isArray(plain(element.props.suggestions)) ? plain(element.props.suggestions) : []).filter((item) => typeof item?.label === "string");
    const chips = suggestions.map(chipOf).filter(Boolean);
    const findIn = (node, name) => (node.kind !== "element" ? null : node.name === name ? node : node.children.map((child) => findIn(child, name)).find(Boolean) ?? null);
    const field = element.children.map((child) => findIn(child, "AiChatField")).find(Boolean) ?? null;
    const fieldNode = field ? instanceNode(field, codeProps(field)) : null;
    if (element.props.logo) notes.push(`${where}: its logo is Figma's Zen mark (logo not pushed)`);
    const block = {
      type: "INSTANCE", name: "AiChatBlock", set: SETS.aiChatBlock, props: onlyOwn(SETS.aiChatBlock, { "Suggestion-Chips": chips.length > 0 }),
      ...(typeof code.greeting === "string" ? { texts: { [AI_GREETING_LAYER]: code.greeting } } : {}),
      ...(fieldNode ? { nested: [{ path: "AI", props: fieldNode.props, ...(fieldNode.texts ? { texts: fieldNode.texts } : {}) }] } : {}),
      ...(chips.length ? { slots: [{ name: "Suggestions", children: [{ type: "FRAME", name: "Items", layout: { mode: "HORIZONTAL", gap: 8, gapVar: "Spacing/Gap/XSmall", rowGap: 8, rowGapVar: "Spacing/Gap/XSmall", padding: [0, 0, 0, 0], counter: "CENTER", primary: "CENTER", wrap: true }, children: chips, fillW: true }] }] } : {}),
      fillW: true, maxW: AI_BLOCK_MAX,
    };
    return { type: "FRAME", ...(id ? { id } : {}), name: "AiChatBlock", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "CENTER", primary: "MIN" }, children: [block] };
  }

  /**
   * A typed MetricCard as Figma's Metric-Card of its Type (figma-metric.mjs metricCardFigma): Type, title and number,
   * trend, the Card's Theme / Color / Sub-Action, Comparison's columns and the Hero's button words. Figma draws its own
   * marks: a note says so.
   */
  function metricCardNode(element, code, id) {
    const where = `MetricCard${id ? ` (${id})` : ""}`;
    const values = Object.fromEntries(Object.entries(element.props).map(([name, value]) => [name, plain(value) ?? (value ? true : undefined)]));
    const footer = element.props.footer?.kind === "element" ? element.props.footer.node : null;
    const footerText = footer?.name === "Button" ? deepText(footer).trim() : "";
    // Any type but the Hero (its Button) draws its footer under the marks, across the card (.zen-metric-card__footer).
    const footerLayers = footer && literalOf(element.props.type) !== "hero" ? [convert(footer, { direction: "column", stretch: true })].filter(Boolean).map((layer) => ({ ...layer, fillW: true })) : [];
    const drawn = metricCardFigma(values, { notes, where, footerText: footerText || null, footerLayers });
    return { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code.label === "string" ? code.label : "MetricCard", ...drawn };
  }

  /** A layer in a Card of `theme`, `color` and `surface` (MetricCard and ChartCard are a Card around their content:
   *  Figma Metric-Card, Chart-Card). */
  function cardAround(content, theme, id, name, color, surface) {
    if (!content) return null;
    const card = entryFor("Card", { theme }, byCode, mapping);
    if (!card) return { ...content, ...(id ? { id } : {}) };
    const set = { id: card.id, name: card.name };
    const own = { theme, ...(color !== undefined ? { color } : {}), ...(surface !== undefined ? { surface } : {}) };
    const props = cardVariant({ ...figmaProps(card, own, mapping, notes, name, new Set(Object.keys(own))), ...onlyOwn(set, { "Sub-Action": false }) }, notes, name);
    return { type: "INSTANCE", ...(id ? { id } : {}), name, set, props, slots: [{ name: "Content", children: [{ ...content, fillW: true }] }] };
  }

  /** AppShellAccount: the Avatar it draws (Avatar/Single Circle Medium), its photo or the name's initials. */
  function accountNode(element, code, id) {
    const own = plain(element.props.overrides)?.Avatar ?? {};
    // AppShell.tsx draws it background="subtle" (initials in the theme's colour on its tint).
    const props = Object.fromEntries(Object.entries({ size: "md", shape: "circle", background: "subtle", ...(code.theme ? { theme: code.theme } : {}), ...(code.src ? { src: code.src } : {}), alt: code.name ?? "", ...own }).map(([name, value]) => [name, literal(value)]));
    const node = instanceNode(elementOf("Avatar", props, code.src ? [] : [{ kind: "text", value: initialsOf(code.name) }]), codeProps({ props }), id);
    return node && typeof code.name === "string" ? { ...node, name: code.name } : node;
  }

  /**
   * PageHeader as Figma's Dashboard header Type=Main (title, Child, SubHeading, Action-Slots, Trailing-Slots), with its
   * breadcrumbs, eyebrow, meta and tabs as the layers around it (page-header.css: a column, Gap/XSmall).
   */
  function pageHeaderNode(element, code, id) {
    const props = { type: literal("main") };
    for (const [from, to] of Object.entries(PAGE_HEADER_PROPS)) if (element.props[from]) props[to] = element.props[from];
    const header = instanceNode(elementOf("DashboardHeader", props), { ...codeProps({ props }) });
    if (element.props.back) notes.push(`PageHeader${id ? ` (${id})` : ""} back: not pushed (no Back in Figma's Dashboard header)`);
    const around = (prop) => {
      const value = element.props[prop];
      if (value?.kind === "element") return convert(value.node, { direction: "column", stretch: false });
      // A text eyebrow is PageHeader.tsx's Text (Body/Small/Medium, tone base): bare, it pasted 14px and imported 12px.
      if (value?.kind === "literal" && typeof value.value === "string") {
        return prop === "eyebrow"
          ? convert(elementOf("Text", { textStyle: literal("Body/Small/Medium"), tone: literal("base") }, [{ kind: "text", value: value.value }]), { direction: "column", stretch: false })
          : { type: "TEXT", characters: value.value, textStyle: "Body/Base/Regular", fill: contentToneToken("strongest") };
      }
      return null;
    };
    const before = ["breadcrumbs", "eyebrow"].map(around).filter(Boolean);
    const after = ["meta", "tabs"].map(around).filter(Boolean);
    if (!header || (!before.length && !after.length)) return header ? { ...header, ...(id ? { id } : {}) } : null;
    const frame = { type: "FRAME", ...(id ? { id } : {}), name: "PageHeader", layout: { mode: "VERTICAL", gap: 8, gapVar: "Spacing/Gap/XSmall", padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [...before, { ...header, fillW: true }, ...after] };
    return frame;
  }

  /**
   * ChatMessage as Figma's Chat/Conversation/Bubble, with what Chat.tsx draws around the bubble: the author's Avatar
   * (initials on its theme; hidden on a run's later message) and name, the reactions pill (Reaction=Yes: the total in
   * Count, up to three Chat/Reaction/Emoji/Static in Emoji-Items) and the read list under it (Chat/Section/Read-List:
   * Seen by, each reader's initials, "+N" past five), in a column aligned to the message's side (chat.css, Gap/2XSmall).
   */
  function chatMessageNode(element, code, id, parent) {
    const node = instanceNode(element, code, id, parent);
    if (node?.type !== "INSTANCE") return node;
    const where = `ChatMessage${id ? ` (${id})` : ""}`;
    const side = code.side === "you" ? "you" : "others";
    const people = (value) => (Array.isArray(value) ? value : []).filter((person) => person && typeof person === "object" && typeof person.name === "string");
    const avatar = (person, path) => {
      if (person.src) notes.push(`${where}: ${person.name}'s photo keeps Figma's sample picture`);
      const theme = person.src ? "Photo" : String(person.theme ?? "neutral").replace(/^./, (char) => char.toUpperCase());
      // The layer takes the person's name (Figma has no field for it): the pull reads it back.
      return { path, name: person.name, props: { Theme: theme, Background: "Subtle" }, ...(person.src ? {} : { text: avatarInitials(initialsOf(person.name), "XSmall") }) };
    };
    const author = people([plain(element.props.author)])[0];
    // Its text in the bubble's Message (the Avatar's initials are the first text layer once shown).
    if (typeof node.text === "string") { node.texts = { ...(node.texts ?? {}), Message: node.text }; delete node.text; }
    const nested = [];
    if (side === "others" && author) {
      node.props = { ...node.props, ...onlyOwn(node.set, { Avatar: code.continued !== true }) };
      if (code.continued !== true) nested.push(avatar(author, "Avatar"));
      if (code.showName === true) node.texts = { ...(node.texts ?? {}), Name: author.name };
    }
    const reactions = (plain(element.props.reactions) ?? []).filter((reaction) => reaction && typeof reaction.kind === "string");
    if (reactions.length) {
      const total = reactions.reduce((sum, reaction) => sum + (Number(reaction.count) || reaction.by?.length || 1), 0);
      node.props = { ...node.props, ...onlyOwn(node.set, { Reaction: "Yes" }) };
      nested.push({ path: "Bubble/Chat", props: { Counter: total > 1 ? "Yes" : "No" }, ...(total > 1 ? { texts: { Count: String(total) } } : {}) });
      const emojis = reactions.slice(0, 3).map((reaction) => (EMOJI_OPTION[reaction.kind]
        ? { type: "INSTANCE", name: reaction.kind, set: SETS.reactionEmoji, props: { Emoji: EMOJI_OPTION[reaction.kind] } }
        : { type: "INSTANCE", name: reaction.kind, set: SETS.reactionEmoji, props: {}, texts: { Message: reaction.kind } }));
      node.slots = [...(node.slots ?? []), { name: "Emoji-Items", within: "Chat/Reaction/Status/No", children: emojis }];
    }
    if (nested.length) node.nested = [...(node.nested ?? []), ...nested];
    const seenBy = people(plain(element.props.seenBy));
    if (!seenBy.length) return node;
    // Figma's Seen by=5+ holds the "+N" Badge and four Avatars (the code draws five after it): the fifth has no layer.
    const many = seenBy.length > 5;
    if (many) notes.push(`ChatMessage${id ? ` (${id})` : ""}: Figma's Seen by=5+ shows four readers after "+${seenBy.length - 5}" (the code five)`);
    const readList = { type: "INSTANCE", name: "Seen by", set: SETS.readList, props: { "Seen by": many ? "5+" : String(seenBy.length) },
      nested: [...(many ? [{ path: "Badge", props: {}, text: `+${seenBy.length - 5}` }] : []), ...seenBy.slice(0, many ? 4 : 5).map((person, index) => avatar(person, `Avatar[${index}]`))] };
    const { id: _own, fillW: _fill, ...message } = node;
    return { type: "FRAME", ...(id ? { id } : {}), name: "ChatMessage", layout: { mode: "VERTICAL", gap: 4, gapVar: "Spacing/Gap/2XSmall", padding: [0, 0, 0, 0], counter: side === "you" ? "MAX" : "MIN", primary: "MIN" }, children: [message, readList] };
  }

  /**
   * ChatThread (chat.css: Padding/Medium, 4px within a run, 16px between sides) as Figma draws a conversation: a column
   * (Gap/Medium) of Chat/Section/Conversation, one per run of messages from one side, the messages hugging in its
   * Conversations slot (Gap/2XSmall, a You run at the right); its other layers (a date divider) between them.
   */
  function chatThreadNode(element, code, id) {
    const layers = [];
    let run = null;
    for (const child of element.children.filter((item) => item.kind === "element")) {
      // ChatDateDivider (Chat.tsx, Figma Chat/Section Time): a centred Caption/Regular time in Neutral Light, Padding/XSmall
      // above and below (chat.css .zen-chat-date); drawn as a bare text it came out 14px black.
      if (child.name === "ChatDateDivider") {
        run = null;
        layers.push({ type: "FRAME", name: "ChatDateDivider", layout: { mode: "VERTICAL", gap: 0, padding: [8, 0, 8, 0], paddingVars: ["Spacing/Padding/XSmall", null, "Spacing/Padding/XSmall", null], counter: "CENTER", primary: "MIN" }, fillW: true,
          children: [{ type: "TEXT", characters: deepText(child), textStyle: "Caption/Regular", fill: contentToneToken("light"), align: "CENTER" }] });
        continue;
      }
      if (child.name !== "ChatMessage") {
        run = null;
        const layer = convert(child, { direction: "column", stretch: true });
        if (layer) layers.push({ ...layer, fillW: true });
        continue;
      }
      const side = literalOf(child.props.side) === "you" ? "You" : "Others";
      if (run?.props.Side !== side) {
        run = { type: "INSTANCE", name: side, set: SETS.chatSection, props: { Side: side }, slots: [{ name: "Conversations", children: [] }], fillW: true };
        layers.push(run);
      }
      const layer = convert(child, { direction: "column", stretch: false });
      if (layer) { const { fillW: _fill, ...hugging } = layer; run.slots[0].children.push(hugging); }
    }
    return { type: "FRAME", ...(id ? { id } : {}), name: "ChatThread", layout: { mode: "VERTICAL", gap: 16, gapVar: "Spacing/Gap/Medium", padding: [16, 16, 16, 16], paddingVar: "Spacing/Padding/Medium", counter: "MIN", primary: "MIN" }, children: layers };
  }

  /**
   * DatePickerSheet as Figma's Date-Picker/Mobile: Variant Single, or Multiple (Selected once a range is chosen), its
   * title in the heading (the locale's "Choose date" / "Choose dates" by default, labels.ts en). The calendar keeps
   * Figma's sample month: the page's dates are not literals.
   */
  function datePickerSheetNode(element, code, id, parent) {
    // A closed sheet shows nothing on the page (the Studio draws it only while open).
    if (code.open !== true && code.isOpen !== true) {
      notes.push(`DatePickerSheet${id ? ` (${id})` : ""}: closed (open is not set): not pushed`);
      return null;
    }
    const node = instanceNode(element, code, id, parent);
    if (node?.type !== "INSTANCE") return node;
    const range = code.selectionMode === "range";
    const chosen = range && (element.props.range ?? element.props.defaultRange) !== undefined;
    node.props = { ...node.props, ...onlyOwn(node.set, { Variant: range ? (chosen ? "Multiple-Selected" : "Multiple-Default") : "Single" }) };
    const title = typeof code.title === "string" ? code.title : layerWords(element.props.title) || (range ? "Choose dates" : "Choose date");
    node.nested = [...(node.nested ?? []), { path: "Main-Heading-Text", props: {}, texts: { "Header-Text": title } }];
    if (node.name === node.set.name) node.name = title;
    return node;
  }

  /**
   * UploaderFileItem as Figma's Primitives/Uploader/File-Item: its theme and thumbnail (photo when the file has a preview,
   * Uploader.tsx), its file's State, Name, Size and Additional Caption (the upload's caption, or the error of an alert).
   */
  function uploaderFileItemNode(element, code, id, parent) {
    const node = instanceNode(element, code, id, parent);
    if (node?.type !== "INSTANCE") return node;
    const file = plain(element.props.file) ?? {};
    const state = ["uploading", "uploaded", "replaceable", "alert"].includes(file.state) ? file.state : "uploaded";
    const thumbnail = code.thumbnail ?? (file.previewUrl ? "photo" : "none");
    const caption = textValue(state === "uploading" ? file.caption : "");
    // An alert's error in its Help-Text; an upload's progress as the Progress-Bar's step.
    const error = state === "alert" ? textValue(file.error) : "";
    const nested = [...(error ? [{ path: "Help-Text", props: {}, text: error }] : []), ...(state === "uploading" ? [{ path: "Progress-Bar", props: { Progress: progressStep(Number(file.progress) || 0) } }] : [])];
    if (nested.length) node.nested = [...(node.nested ?? []), ...nested];
    if (state === "uploading") node.edits = [...(node.edits ?? []), { layer: `Progress-Bar/${PROGRESS_TRACK}`, columns: progressColumns(file.progress) }];
    // Its buttons show only with their handler (Uploader.tsx): Remove (onRemove), Retry (an alert's onRetry).
    const hide = [...(element.props.onRemove ? [] : ["Remove"]), ...(state === "alert" && !element.props.onRetry ? ["Retry"] : [])];
    if (hide.length) node.hide = [...(node.hide ?? []), ...hide];
    if (thumbnail === "photo") notes.push(`UploaderFileItem "${textValue(file.name)}": its photo thumbnail keeps Figma's sample picture`);
    Object.assign(node.props, onlyOwn(node.set, { State: state[0].toUpperCase() + state.slice(1), Thumbnail: thumbnail[0].toUpperCase() + thumbnail.slice(1), "✏️ Name": textValue(file.name), "✏️ Size": textValue(file.size), "✏️ Additional Caption": caption }));
    if (typeof file.name === "string" && node.name === node.set.name) node.name = file.name;
    return node;
  }

  /** Tabs with TabItem children as Tabs with `items` (each tab's value, else its position, as the id; a selected one the default). */
  function tabsOfChildren(element) {
    const tabs = element.children.filter((child) => child.kind === "element" && child.name === "TabItem");
    const items = tabs.map((tab, index) => ({ kind: "object", fields: { id: literal(literalOf(tab.props.value) ?? String(index)), ...Object.fromEntries(["label", "icon", "badge"].filter((name) => tab.props[name]?.kind === "literal").map((name) => [name, tab.props[name]])) } }));
    const chosen = tabs.find((tab) => literalOf(tab.props.selected) === true);
    const props = { ...element.props, items: { kind: "array", items } };
    if (chosen && !props.value && !props.defaultValue) props.defaultValue = literal(literalOf(chosen.props.value) ?? String(tabs.indexOf(chosen)));
    return { ...element, props, children: element.children.filter((child) => !(child.kind === "element" && child.name === "TabItem")) };
  }

  /**
   * ColorSelector as a row of Figma Color-Selector swatches (color-selector.css: wrap, Gap/Small, centred): each named by
   * its label, its fill the colour's variable, Select=Yes on the chosen one. A colour that is no Zen token keeps Figma's
   * sample fill.
   */
  function colorSelectorNode(element, code, id) {
    const colors = (plain(element.props.colors) ?? []).filter((color) => color && typeof color === "object");
    const swatches = colors.map((color) => {
      const variable = typeof color.value === "string" ? VARIABLE_OF_CSS.get(color.value.replace(/\s+/g, "")) : undefined;
      if (!variable) notes.push(`ColorSelector: the colour ${color.value} is no Zen token: its swatch keeps Figma's sample colour`);
      if (color.contrast === "dark" && color.value === code.value) notes.push(`ColorSelector: the chosen ${color.label}'s dark check (contrast) is drawn in Figma's check colour`);
      return { type: "INSTANCE", name: typeof color.label === "string" ? color.label : String(color.value), set: SETS.colorSwatch, props: { Select: color.value === code.value ? "Yes" : "No", Status: "Default" }, ...(variable ? { fill: variable.replace(/^Color\//, "") } : {}) };
    });
    return { type: "FRAME", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "ColorSelector", layout: { mode: "HORIZONTAL", gap: 12, gapVar: "Spacing/Gap/Small", padding: [0, 0, 0, 0], counter: "CENTER", primary: "MIN", wrap: true }, children: swatches };
  }

  /**
   * TopNavigation as Figma's Top-Navigation/Mobile (figma-top-nav.mjs): its Type and Margin, the parts the static page
   * shows (TopNavigation.tsx), the bar and large titles in their Heading-Text layers, the leading action in Top-Leading,
   * the actions as Nav-Slot/Action instances in the bar's or the large-title row's Trailing-Slot (each in the Button the
   * Type draws), the control bar in Control-Slot. No Status-bar: the Studio's Screen draws none. A banner sits under it.
   */
  function topNavigationNode(element, code, id) {
    const look = TOP_NAV_TYPES[code.type ?? "default"] ?? TOP_NAV_TYPES.default;
    const where = `TopNavigation${id ? ` (${id})` : ""}`;
    const words = (prop) => {
      const value = plain(element.props[prop]);
      return typeof value === "string" || typeof value === "number" ? String(value) : layerWords(element.props[prop]);
    };
    const title = words("title"), largeTitle = words("largeTitle"), subtitle = words("subtitle");
    const leading = element.props.leading;
    const layout = topNavLayout({ largeTitle, title, subtitle, titleLeading: element.props.titleLeading, leading, topBar: code.topBar, collapsed: code.collapsed === true });
    // Folded (a root's large title showing): one row, the large title with the actions beside it (Top-bar=false).
    const folded = layout.barFolds && layout.showLarge;
    const actionsOf = (prop) => {
      const value = plain(element.props[prop]);
      return (Array.isArray(value) ? value : value ? [value] : []).filter((action) => action && typeof action === "object");
    };
    const titleActions = actionsOf("largeTitleAction");
    const flat = look.style === "Flat";
    const bar = topNavActions(layout.barFolds ? titleActions : [], actionsOf("trailing"), { flat, firstTwo: code.trailingGroup === true });
    const beside = folded ? bar : layout.showLarge ? topNavActions(titleActions, [], { flat }) : { actions: [] };
    const barActions = folded ? [] : bar.actions;
    if (bar.grouped) notes.push(`${where}: actions that share a pill are drawn one by one (Figma's Trailing-Slot has no shared pill)`);
    const navAction = (action, part, index) => {
      const icon = typeof action.icon === "string" ? action.icon : null;
      if (!icon) notes.push(`${where}: an action whose icon is not an icon name keeps Figma's sample glyph`);
      return {
        type: "INSTANCE", ...(element.id ? { key: `${element.id}/${part}.${index}` } : {}), name: typeof action.label === "string" ? action.label : "Action", set: NAV_ACTION_SET,
        props: { Style: look.style, "Noti-Dot": Boolean(action.dot) },
        nested: [{ path: "Button", set: look.button, props: { Level: look.level }, ...(icon ? { swapIcon: icon } : {}) }],
      };
    };
    const props = {
      Device: "Mobile", Type: look.option, Margin: code.margin === "compact" ? "Compact" : "Comfortable", "Status-Bar": false,
      "Top-bar": !folded, "Top-Leading": !folded && Boolean(leading), "Top-Heading-Text": !folded && layout.barShowsTitle, "Top-Trailing": barActions.length > 0,
      "Expand-Heading": layout.showLarge, "Expand-Trailing": beside.actions.length > 0, "Control-Bar": element.props.controlBar?.kind === "element",
    };
    // A bar title under a showing large title appears only once it scrolls away: Figma's bar title is hidden then.
    if (title && layout.showLarge && !layout.identity) notes.push(`${where}: title shows once the large title scrolls away (Figma shows the large title; the bar title is not pushed)`);
    const nested = [];
    if (props["Top-Heading-Text"]) {
      const titleLeading = element.props.titleLeading?.kind === "element";
      if (titleLeading) notes.push(`${where}: titleLeading is drawn as Heading-Text's Leading sample`);
      nested.push({ path: "Top-Heading-Text", props: { Type: "Sub", Header: true, Subheading: Boolean(subtitle), Leading: titleLeading }, texts: { "Header-Text": layout.identity ? title : layout.barTitle, ...(subtitle ? { Subheading: subtitle } : {}) } });
    }
    if (layout.showLarge) nested.push({ path: "Main-Heading-Text", props: { Type: TOP_NAV_HEADING[code.headingLevel ?? "h1"] ?? "H1" }, texts: { "Header-Text": largeTitle } });
    if (props["Top-Leading"]) {
      const action = leading.kind === "object" ? plain(leading) : null;
      // The Action layer takes the action's label (its name, read back by the pull).
      if (action && typeof action.icon === "string") nested.push({ path: "Top-Leading/Action", ...(typeof action.label === "string" ? { name: action.label } : {}), props: { "Noti-Dot": Boolean(action.dot) }, swapIcon: action.icon });
      else if (!action) {
        nested.push({ path: "Top-Leading", props: { Type: "Visual", Style: "Avatar Small" } });
        notes.push(`${where}: leading is drawn as Figma's Nav-Slot/Visual sample (Avatar Small)`);
      }
    }
    const slots = [];
    if (barActions.length) slots.push({ name: "Trailing-Slot", within: "Navigator-bar", children: barActions.map((action, index) => navAction(action, "bar", index)) });
    if (beside.actions.length) slots.push({ name: "Trailing-Slot", within: "Expand-Heading", children: beside.actions.map((action, index) => navAction(action, "title", index)) });
    if (props["Control-Bar"]) {
      // top-navigation.css .zen-top-nav__control: Padding/2XSmall above, Padding/XSmall below, the bar's side margin
      // (Padding/Large, Medium when compact) on the sides; Figma's Control-Bar has none of its own.
      const control = convert(element.props.controlBar.node, { direction: "column", stretch: true });
      // A Search in the control bar is a pill unless the page sets its shape (SearchShapeContext, user 2026-10-17): the
      // Searches with no `shape` in the page (by element id, the layer's key) draw Shape=Rounded.
      const unshaped = new Set();
      const collect = (el) => {
        if (el?.kind !== "element") return;
        if (el.name === "Search" && el.props?.shape === undefined && el.id) unshaped.add(el.id);
        for (const child of el.children ?? []) collect(child);
      };
      collect(element.props.controlBar.node);
      const roundSearches = (layer) => {
        if (!layer) return;
        if (layer.type === "INSTANCE" && layer.set?.name === "Search/Default" && unshaped.has(layer.key) && layer.props) layer.props.Shape = "Rounded";
        for (const child of [...(layer.children ?? []), ...(layer.slots ?? []).flatMap((slot) => slot.children ?? [])]) roundSearches(child);
      };
      roundSearches(control);
      const side = code.margin === "compact" ? 16 : 20;
      // top-navigation.css .zen-top-nav__control: Padding/XSmall above and below (none around Tabs, which carry their own
      // indicator row), the bar's margin at the sides; Figma Control-Bar (12014:44764) hugs its slot.
      const block = element.props.controlBar.node.name === "Tabs" ? 0 : 8;
      if (control) slots.push({ name: "Control-Slot", children: [{ type: "FRAME", name: "Control", layout: { mode: "VERTICAL", gap: 0, padding: [block, side, block, side], counter: "MIN", primary: "MIN" }, children: [{ ...control, fillW: true }], fillW: true }] });
    }
    const node = { type: "INSTANCE", ...(id ? { id } : {}), name: title || largeTitle || "TopNavigation", set: TOP_NAV_SET, props, ...(nested.length ? { nested } : {}), ...(slots.length ? { slots } : {}) };
    const banner = element.props.banner?.kind === "element" ? convert(element.props.banner.node, { direction: "column", stretch: true }) : null;
    if (!banner) return node;
    const { id: _id, ...inner } = node;
    return { type: "FRAME", ...(id ? { id } : {}), name: "TopNavigation", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [{ ...inner, fillW: true }, { ...banner, fillW: true }] };
  }

  const fills = (element, parent) => {
    const code = codeProps(element);
    const row = parent?.direction === "row";
    // A component of a set size (a definite CSS width: DockIcon, Avatar…) is passed by a column's stretch; FILL in Figma
    // would scale it (a Large Dock-Icon in a Card came out 520px wide and tall, 2026-10-16).
    const sized = INTRINSIC_SIZE.has(element.name);
    return { fillW: code.width === "fill" || (!row && parent?.stretch && !sized), fillH: code.height === "fill" || (row && parent?.stretch && !sized) };
  };

  /** A frame's width in px where the push knows it: a width of its own, else its parent's when it fills it; maxWidth caps it. */
  const widthIn = (code, parent, filling) => {
    const px = (value) => (/^\d+(\.\d+)?(px)?$/.test(String(value ?? "")) ? Number.parseFloat(String(value)) : null);
    const width = px(code.width) ?? (filling && typeof parent?.width === "number" ? parent.width : null);
    const max = px(code.maxWidth);
    return width !== null && max !== null ? Math.min(width, max) : width;
  };
  /**
   * A Zen Sidebar's look as Patterns/Sidebar draws it (sidebarPatternProps): its theme and density, else those an AppShell
   * of `pattern="grid"` gives it (Border · Small, AppShell.tsx), its shadow, collapsed or not.
   */
  const sidebarLook = (sidebar, collapsed, shellPattern = null) => ({
    theme: literalOf(sidebar.props.theme) ?? (shellPattern === "grid" ? "border" : "default"),
    density: literalOf(sidebar.props.density) ?? (shellPattern === "grid" ? "small" : "medium"),
    shadow: literalOf(sidebar.props.shadow) !== false,
    collapsed,
  });
  /** A Zen Sidebar's width, open or as the rail (another sidebar, a workspace one or one of its own width: unknown). */
  const sidebarWidth = (sidebar, collapsed, shellPattern = null) => {
    const variant = literalOf(sidebar.props.variant) ?? "basic";
    if (sidebar.name !== "Sidebar" || variant === "workspace" || sidebar.props.width !== undefined) return null;
    const look = sidebarLook(sidebar, collapsed, shellPattern);
    const rail = variant !== "basic" ? variant : FLUSH_SIDEBAR_THEMES.has(look.theme) ? "flush" : look.density === "small" ? "basic-small" : "basic";
    return collapsed ? SIDEBAR_RAIL_WIDTH[rail] ?? null : SIDEBAR_WIDTH;
  };
  /** Each grid column's width (Figma's tracks: Fixed px, Flex shares what is left after the gaps); unknown without a width. */
  const trackWidths = (columns, inner, gap) => {
    if (inner === null) return null;
    const tracks = columns.sizes ?? Array.from({ length: columns.count }, () => ({ type: "FLEX", value: 1 }));
    const fixed = tracks.reduce((sum, track) => sum + (track.type === "FIXED" ? track.value : 0), 0);
    const flex = tracks.reduce((sum, track) => sum + (track.type === "FLEX" ? track.value : 0), 0);
    const free = Math.max(0, inner - (tracks.length - 1) * gap - fixed);
    return tracks.map((track) => (track.type === "FIXED" ? track.value : track.type === "FLEX" && flex ? (free * track.value) / flex : null));
  };

  /** A track list's top-level tracks ("minmax(0, 1fr) 320px" → two). */
  const splitTracks = (text) => {
    const tracks = [];
    let depth = 0, current = "";
    for (const char of text) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (/\s/.test(char) && depth === 0) { if (current) tracks.push(current); current = ""; } else current += char;
    }
    return current ? [...tracks, current] : tracks;
  };
  /** A track as Figma's grid track: fr → Flex, px → Fixed, minmax(…, n fr) → Flex n, minmax(…, n px) → Fixed n (the
   *  free space a 1fr beside it leaves lets it reach its maximum), auto → Hug. */
  const trackSize = (track) => {
    const fr = /([\d.]+)fr\)?$/.exec(track);
    if (fr) return { type: "FLEX", value: Number(fr[1]) };
    const px = /^(?:minmax\([^,]+,\s*)?([\d.]+)px\)?$/.exec(track);
    if (px) return { type: "FIXED", value: Number(px[1]) };
    return track === "auto" ? { type: "HUG" } : { type: "FLEX", value: 1 };
  };
  /**
   * A Grid's columns in this Screen's frame (Layout.tsx Grid; the breakpoint is the Screen's device): `{ count, sizes }`
   * for a column count or a track list, `{ min }` for columns that fit as many as the width allows (no columns:
   * minColumnWidth; repeat(auto-fit | auto-fill, minmax(min(100%, Npx), 1fr))).
   */
  function gridColumns(element, code) {
    const value = plain(element.props.columns);
    const order = { phone: ["mobile", "tablet", "desktop"], tablet: ["tablet", "desktop", "mobile"] }[device] ?? ["desktop", "tablet", "mobile"];
    const tracks = value && typeof value === "object" ? order.map((name) => value[name]).find((item) => item !== undefined) : value;
    // layout.css data-mode="fill": auto-fill keeps a row's empty columns; auto-fit lets the cells take them.
    if (tracks === undefined || tracks === null) return { min: Number.parseFloat(String(code.minColumnWidth ?? 240)) || 240, mode: "fill" };
    if (typeof tracks === "number") return { count: Math.max(1, Math.round(tracks)) };
    const text = String(tracks).trim();
    const fit = /^repeat\(\s*auto-(fit|fill)\s*,\s*minmax\(\s*(?:min\(\s*100%\s*,\s*)?([\d.]+)px\s*\)?\s*,\s*[\d.]*fr\s*\)\s*\)$/.exec(text);
    if (fit) return { min: Number(fit[2]), mode: fit[1] };
    const repeat = /^repeat\(\s*(\d+)\s*,/.exec(text);
    if (repeat) return { count: Number(repeat[1]) };
    const list = splitTracks(text);
    return { count: Math.max(1, list.length), sizes: list.map(trackSize) };
  }

  /**
   * A frame's appearance (Box, Stack and Grid alike; src/components/Layout/appearance.ts) as Figma's frame: `fill` its
   * Color/Background variable, `stroke` Border/Neutral/Pale|Subtle inside at `strokeWeight` (one side: `strokeSides`;
   * dashed: Zen's Figma dash 2 / 2, the Input's), the corners on Corner-Radius (`radius` + `radiusVar`, or `radii` +
   * `radiiVars` TL TR BR BL when they differ), the effect style by name, opacity 0–1, rotation (degrees,
   * counter-clockwise) and flip. Only what the code writes; Figma's defaults are left out.
   */
  function frameLook(code, element = null) {
    const look = {};
    const fill = BOX_SURFACE[code.surface];
    if (fill) look.fill = fill;
    // An image fill (F8, figma-image.mjs) over the frame's fill.
    const picture = imageFillOf(code, element);
    if (picture) { look.imageFill = picture; images.add(picture.src); }
    const stroke = FRAME_STROKE[code.border];
    if (stroke) {
      look.stroke = stroke;
      look.strokeWeight = typeof code.borderWeight === "number" && code.borderWeight >= 0 ? code.borderWeight : 1;
      look.strokeAlign = "INSIDE";
      if (["top", "right", "bottom", "left"].includes(code.borderSides)) look.strokeSides = code.borderSides;
      if (code.borderStyle === "dashed" && code.border === "subtle") look.dash = [2, 2];
    }
    const step = (value) => (typeof value === "string" ? SHAPE_RADIUS[LONG_TO_SHORT[value] ?? value] ?? null : null);
    const corners = ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"].map((name) => step(code[name]) ?? step(code.radius));
    if (corners.some(Boolean)) {
      const steps = corners.map((corner) => corner ?? SHAPE_RADIUS.none);
      if (steps.every((corner) => corner === steps[0])) Object.assign(look, { radius: steps[0][1], ...(steps[0][0] ? { radiusVar: steps[0][0] } : {}) });
      else Object.assign(look, { radii: steps.map((corner) => corner[1]), radiiVars: steps.map((corner) => corner[0] || null) });
    }
    if (typeof code.effectStyle === "string" && FRAME_EFFECTS.has(code.effectStyle)) look.effectStyle = code.effectStyle;
    if (typeof code.opacity === "number" && code.opacity < 100) look.opacity = Math.max(0, code.opacity) / 100;
    // Its layer blend (blend-modes.mjs), when not Pass through (a frame's and a group's default).
    if (figmaBlendOf(code.blendMode, true)) look.blendMode = figmaBlendOf(code.blendMode, true);
    if (typeof code.rotation === "number" && code.rotation % 360 !== 0) look.rotation = code.rotation;
    if (["horizontal", "vertical", "both"].includes(code.flip)) look.flip = code.flip;
    return look;
  }

  function frameNode(element, code, id, parent = null) {
    const grid = element.name === "Grid";
    const row = code.direction === "row";
    // A Box lays its layers out as blocks, without a gap (layout.css); Stack and Grid take md unless told.
    const gap = code.gap ?? (element.name === "Box" ? "none" : "md");
    const gapPx = pxOf(gap, GAP_PX) ?? 0;
    const pad = (step) => marginPx(step) ?? pxOf(step ?? "none", PADDING_PX) ?? 0;
    const x = pad(code.paddingX ?? code.padding);
    const y = pad(code.paddingY ?? code.padding);
    // The width inside it, where the push knows it (a page's frames fill the Screen; an instance's slot is unknown).
    const self = widthIn(code, parent, parent?.cell || fills(element, parent).fillW);
    const inner = self === null ? null : Math.min(Math.max(0, self - 2 * x), code.contentMax ?? Infinity);
    // Columns that fit (CSS auto-fill / auto-fit) are as many as that width takes, an even Figma grid; with no width
    // known, a wrapping row whose cells fill it, no narrower than the minimum. A column count is Figma's grid.
    let columns = grid ? gridColumns(element, code) : null;
    // stackBelow: one column while the Grid itself is narrower (Layout.tsx useStackBelow), where the push knows its width.
    if (grid && typeof code.stackBelow === "number" && self !== null && self < code.stackBelow) columns = { count: 1 };
    if (columns?.min && inner !== null) {
      const fitting = Math.max(1, Math.floor((inner + gapPx) / (columns.min + gapPx)));
      const cells = element.children.filter((child) => child.kind === "element").length;
      const count = columns.mode === "fit" ? Math.max(1, Math.min(fitting, cells)) : fitting;
      columns = { count, sizes: Array.from({ length: count }, () => ({ type: "FLEX", value: 1 })), min: columns.min, even: true };
    }
    const fit = Boolean(columns?.min) && !columns.even;
    const layout = { mode: grid && !fit ? "GRID" : row || fit ? "HORIZONTAL" : "VERTICAL" };
    layout.gap = gapPx;
    if (short(gap) !== "none" && STEP_NAMES[short(gap)]) layout.gapVar = `Spacing/Gap/${STEP_NAMES[short(gap)]}`;
    // Between wrapped rows (and grid rows): rowGap, else the gap (CSS gap is both).
    const rowGap = code.rowGap ?? gap;
    if (grid || code.wrap) {
      layout.rowGap = pxOf(rowGap, GAP_PX) ?? 0;
      if (short(rowGap) !== "none" && STEP_NAMES[short(rowGap)]) layout.rowGapVar = `Spacing/Gap/${STEP_NAMES[short(rowGap)]}`;
    }
    layout.padding = [y, x, y, x];
    if (code.padding && !code.paddingX && !code.paddingY && MARGIN_VARIABLE[code.padding]) layout.paddingVar = MARGIN_VARIABLE[code.padding];
    else if (code.padding && !code.paddingX && !code.paddingY && short(code.padding) !== "none") layout.paddingVar = `Spacing/Padding/${STEP_NAMES[short(code.padding)]}`;
    const align = code.align ?? (row ? "center" : "stretch");
    if (!grid) {
      layout.counter = { start: "MIN", center: "CENTER", end: "MAX", baseline: "BASELINE" }[align] ?? "MIN";
      // Figma aligns a frame's children, not one child: children that all align themselves the same way (alignSelf, a
      // card centred at its maxWidth) set the frame's alignment.
      const selves = element.children.filter((child) => child.kind === "element").map((child) => literalOf(child.props.alignSelf));
      if (selves.length && selves.every((value) => value && value === selves[0]) && selves[0] !== "stretch") layout.counter = { start: "MIN", center: "CENTER", end: "MAX" }[selves[0]] ?? layout.counter;
      layout.primary = { center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" }[code.justify] ?? "MIN";
      if (code.wrap) layout.wrap = true;
    } else if (fit) Object.assign(layout, { counter: "MIN", primary: "MIN", wrap: true });
    // What a child fills: a column's width inside the padding, a grid cell its column's share; a row's is unknown.
    // Inside a surface (passed down, or this Box paints one or a border): a Table in it drops its last row's rule.
    const surface = Boolean(parent?.surface) || [code.surface, code.border].some((value) => value && value !== "none");
    const context = { direction: row ? "row" : "column", stretch: !grid && align === "stretch", width: grid || row ? null : inner, surface };
    const cellWidths = grid && !fit ? trackWidths(columns, inner, gapPx) : null;
    let cellIndex = 0;
    const children = element.children.map((child) => {
      const node = convert(child, grid && child.kind === "element" ? { ...context, cell: true, width: cellWidths?.[cellIndex++ % columns.count] ?? null } : context);
      if (!node || node.absolute) return node;
      // A grid's cells fill their column; Grid's default align (stretch) makes a row's cards as tall as its tallest. A
      // Grid in a cell stretches too, its rows sharing the height (Flex, as CSS stretches auto rows), so its cards match
      // the row's tallest (Dashboard's metric pairs, 2026-10-21: measured in Figma); another frame cell hugs (Fill
      // inside Fill leaves Figma a height it cannot settle). Columns that fit keep their minimum on each cell
      // (figma-pull reads them back as minColumnWidth).
      if (grid) {
        const innerGrid = align === "stretch" && node.type === "FRAME" && node.layout?.mode === "GRID" && node.layout.grid;
        const stretched = innerGrid ? { ...node, layout: { ...node.layout, grid: { ...node.layout.grid, rowSizes: Array.from({ length: node.layout.grid.rows }, () => ({ type: "FLEX", value: 1 })) } } } : node;
        return { ...stretched, fillW: true, ...(align === "stretch" && (node.type === "INSTANCE" || innerGrid) ? { fillH: true } : {}), ...(columns.min ? { minW: Math.min(columns.min, frameWidth - 32) } : {}) };
      }
      const { fillW, fillH } = fills(child, context);
      // fillChildren (layout.css): in a row every child without its own width takes an equal share; in a column only
      // when the column has a height of its own (else they keep their content height).
      const own = codeProps(child);
      const shareW = code.fillChildren === true && row && own.width === undefined;
      const shareH = code.fillChildren === true && !row && code.height !== undefined && own.height === undefined;
      // A text in a column wraps at the column's width whatever the Stack aligns (CSS), where Figma's Hug runs on: it
      // fills. A Divider between layers of a row takes the room they leave (divider.css).
      // A text on one line (wrap={false}) keeps Auto width unless it is given a width.
      const oneLine = node.autoWidth && own.width !== "fill";
      // A plain Stack in a column that holds wrapping text: CSS shrinks it to fit, which for text longer than the line is
      // the column's width; Figma's Hug around a Fill text collapses the text to a sliver (a centred tagline came out 175px
      // wide, 2026-10-16). It fills; one with a surface keeps hugging (its background would spread).
      const holdsWrap = !row && !own.width && wrapsText(node);
      const wide = (fillW && !oneLine) || shareW || holdsWrap || (node.type === "TEXT" && !row && !node.autoWidth) || (row && child.name === "Divider");
      // A frame of a px width / height keeps it (CSS: a set width wins over a column's stretch).
      const ownW = node.type === "FRAME" && node.fixedWidth !== undefined;
      const ownH = node.type === "FRAME" && node.fixedHeight !== undefined;
      return { ...node, ...(wide && !ownW ? { fillW: true } : {}), ...((fillH || shareH) && !ownH ? { fillH: true } : {}) };
    }).filter(Boolean);
    if (grid && !fit) {
      layout.grid = { columns: columns.count, rows: Math.max(1, Math.ceil(children.length / columns.count)), ...(columns.sizes ? { sizes: columns.sizes } : {}) };
      children.forEach((child, index) => { child.cell = { col: index % columns.count, row: Math.floor(index / columns.count), span: 1 }; });
    }
    // maxWidth (a number of px, or "400px"): the frame fills up to it (a sign-in form in its centred row).
    const maxW = Number.parseFloat(String(code.maxWidth ?? "")) || null;
    // maxHeight in px: Figma's Max height (a scrolling list stops there).
    const maxH = /^\d+(px)?$/.test(String(code.maxHeight ?? "")) ? Number.parseFloat(String(code.maxHeight)) : null;
    // `scroll` is Figma's Overflow scrolling (it clips, as CSS overflow does).
    const scroll = { x: "HORIZONTAL", y: "VERTICAL" }[code.scroll];
    // Only a frame with `clip` (Box, Stack or Grid) cuts what overflows it: the importer clips that frame alone. Its
    // fill, stroke, corners, effect, opacity, rotation and flip: one Figma frame (frameLook).
    // A Box group (⌘G): Figma's GROUP (the importer turns the frame into one once its layers sit where they go).
    const group = element.name === "Box" && code.group === true;
    // A mask (Box mask, ⌃⌘M): the importer makes the first layer Figma's mask (isMask) once the layers are placed.
    const mask = element.name === "Box" && code.mask === true;
    // A width / height in px (a free frame drawn in the Studio, Stack width={480}): Figma's Fixed size; the importer
    // hugged it before (2026-10-19, a 560 × 240 free frame came out as tall as its layers in the flow).
    const px = (value) => (/^\d+(\.\d+)?(px)?$/.test(String(value ?? "")) ? Number.parseFloat(String(value)) : null);
    const fixedWidth = px(code.width);
    const fixedHeight = px(code.height);
    // A free frame (a Box of a px size whose layers all float at their X / Y, or none: the Frame tool's): Figma's frame
    // without auto layout (layoutMode NONE), its layers at their X / Y (F4, A found it 2026-10-19).
    const layers = element.children.filter((child) => child.kind === "element");
    const free = element.name === "Box" && !group && fixedWidth !== null && fixedHeight !== null && layers.every((child) => literalOf(child.props.position) === "absolute");
    return { type: "FRAME", ...(id ? { id } : {}), name: group ? (mask ? "Mask group" : "Group") : element.name, ...(group ? { group: true } : {}), ...(mask ? { mask: true } : {}), layout: free ? { mode: "NONE" } : layout, children, ...frameLook(code, element), ...(fixedWidth !== null ? { fixedWidth } : {}), ...(fixedHeight !== null ? { fixedHeight } : {}), ...(maxW && /^\d+(px)?$/.test(String(code.maxWidth)) ? { maxW } : {}), ...(maxH ? { maxH } : {}), ...(code.clip === true || scroll ? { clip: true } : {}), ...(scroll ? { scroll } : {}) };
  }

  /** A node prop's layers as a slot's: a Stack the pull made of a slot's several layers gives its layers back. */
  function slotLayers(value, surface = false) {
    const element = value.node;
    const layers = element.name === "Stack" && !Object.keys(element.props).some((name) => !["gap", "direction", "align", "justify", "wrap", "padding", "paddingX", "paddingY"].includes(name)) ? element.children : [element];
    return layers.map((child) => convert(child, { direction: "column", stretch: false, surface })).filter(Boolean);
  }

  /** A data slot's items as instances of its item set; a nested slot (Sidebar sections) a frame per group, its title first. */
  /**
   * Data items Figma draws as a primitive with texts and options of its own: DescriptionList's Term / Value (its Layout
   * and Divider on each item: Figma's list set carries a duplicate variant), Tabs' Tab-Items (the selected one, their
   * Style and Size), a vertical Stepper's steps (number, title, caption; Passed before `current`, Focused at it).
   */
  const ITEM_BUILDERS = {
    // A description given as layers (an address on two lines) gives its words.
    DescriptionList: { items: (list, code, raw) => list.map((item, index) => ({ type: "INSTANCE", name: textValue(item?.term) || "Item", set: SETS.descriptionItem, fillW: true,
      props: { Layout: code.layout === "stacked" ? "Stacked" : "Inline", Divider: code.divider ? "Yes" : "No", Emphasis: item?.emphasis ? "Yes" : "No", Action: Boolean(item?.action), Term: textValue(item?.term) || layerWords(raw?.items?.[index]?.fields?.term), Value: textValue(item?.description) || layerWords(raw?.items?.[index]?.fields?.description) } })) },
    Tabs: { items: (list, code) => {
      const selected = code.value ?? code.defaultValue ?? list[0]?.id;
      return list.map((item) => ({ type: "INSTANCE", name: textValue(item?.label) || "Tab", set: SETS.tabItem, ...(textValue(item?.label) ? { text: textValue(item.label) } : {}), ...(code.fullWidth ? { fillW: true } : {}),
        props: { Style: code.variant === "subtle" ? "Subtle" : "Indicator", Size: ["sm", "small"].includes(code.size) ? "Small" : "Medium", Select: item?.id === selected ? "Yes" : "No", Label: textValue(item?.label) ? "True" : "False", Icon: typeof item?.icon === "string" ? "True" : "False", ...(typeof item?.icon === "string" ? { "Icon-Src": item.icon } : {}), Badge: item?.badge !== undefined && item?.badge !== null && item?.badge !== false },
        // Its count in the Badge-Counter Badge=Yes shows.
        ...(textValue(item?.badge) ? { nested: [{ path: "Badge-Counter", text: textValue(item.badge) }] } : {}) }));
    } },
    Stepper: { steps: (list, code) => {
      if (code.orientation !== "vertical") return null;
      const current = Number(code.current ?? 0);
      return list.map((step, index) => {
        const caption = textValue(step?.caption);
        const state = step?.error ? "Error" : index < current ? "Passed" : index === current ? "Focused" : "Default";
        // A passed or failed step draws a mark, not its number.
        return { type: "INSTANCE", name: textValue(step?.title) || `Step ${index + 1}`, set: SETS.stepVertical, fillW: true,
          props: { Position: index === 0 ? "First" : index === list.length - 1 ? "Last" : "Middle", State: state, Caption: Boolean(caption) },
          texts: { ...(state === "Passed" || state === "Error" ? {} : { Label: String(index + 1) }), "Step Title": textValue(step?.title), ...(caption ? { Caption: caption } : {}) } };
      });
    } },
  };

  function dataSlotChildren(owner, dataSlot, value, code, raw) {
    const build = ITEM_BUILDERS[owner]?.[dataSlot.prop];
    if (build) return build(Array.isArray(value) ? value : [], code, raw);
    const items = DATA_ITEMS[owner]?.[dataSlot.prop];
    if (!items) return null;
    const labelKey = /\btitle:/.test(dataSlot.newItem(0).code) ? "title" : "label";
    const iconKey = ITEM_ICON[owner] ?? "icon";
    // A Segmented shows `value`, else `defaultValue`, else its first option selected (Segmented.tsx).
    const selectedId = owner === "Segmented" ? code.value ?? code.defaultValue ?? (Array.isArray(value) ? value[0]?.id : undefined) : code[SELECTED_PROP[owner]];
    // A Segmented's items take its Level and Size (Figma's item starts Small Primary); they split a full-width one.
    const look = owner === "Segmented" ? segmentLook(code) : {};
    const fill = owner === "Segmented" && code.fullWidth === true ? { fillW: true } : {};
    const item = (fields) => ({ ...itemNode(items.item, fields ?? {}, { selected: fields?.id !== undefined && fields.id === selectedId, labelKey, iconKey, look }), ...fill });
    const list = Array.isArray(value) ? value : [];
    // A crumb draws its chevron as the slot's Dash (all but the last) and its look on the Item inside (Breadcrumbs.tsx:
    // the first crumb is Master while `master` is on, Emphasis from the crumb or the trail).
    if (owner === "Breadcrumbs") return list.map((fields, index) => {
      const node = item(fields);
      const level = fields?.level ?? (code.master !== false && index === 0 ? "master" : "sub");
      const emphasis = fields?.emphasis ?? code.emphasis ?? "default";
      node.props = { ...node.props, Dash: index < list.length - 1 };
      node.nested = [{ path: "Item", props: { Level: level === "master" ? "Master" : "Sub", Emphasis: emphasis === "medium" ? "Medium" : "Default", ...(fields?.state === "hover" ? { State: "Hover" } : {}) },
        ...(level === "master" && typeof fields?.icon === "string" ? { swapIcon: fields.icon } : {}) }];
      return node;
    });
    if (!dataSlot.nested) return list.map(item);
    return list.map((section, index) => ({
      type: "FRAME", name: section?.label ? `Section ${section.label}` : `Section ${index + 1}`,
      layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" },
      children: [
        ...(section?.label && items.title ? [{ type: "INSTANCE", name: "Section-Title", set: items.title, props: {}, text: section.label, fillW: true }] : []),
        ...(Array.isArray(section?.[dataSlot.nested]) ? section[dataSlot.nested] : []).map((fields) => ({ ...item(fields), fillW: true })),
      ],
    }));
  }

  /**
   * An open Sidebar's header as Sidebar.tsx draws it: its brand, else its logo. Figma's Header-Content holds a sample
   * LOGO, which a page without one drops; the collapse control is the set's Collapse Button (Header › Wrapper, read
   * 2026-10-21), on with onCollapsedChange (sidebarCollapseButton).
   */
  function sidebarHeader(element, slots, surface) {
    if (slots.some((slot) => slot.name === "Header-Content")) return;
    const logo = element.props.logo?.kind === "element" ? convert(element.props.logo.node, { direction: "column", stretch: true, surface }) : null;
    slots.unshift({ name: "Header-Content", children: logo ? [{ ...logo, fillW: true }] : [] });
  }

  /**
   * A collapsed Sidebar as Figma's rail (Side-Bar Expand=No; Sidebar.tsx collapsed): its mark alone in the header
   * (logoCollapsed, else the brand's first layer), each row its icon without its label, the groups' titles gone and a
   * Divider opening each later group.
   */
  function sidebarRail(element, node, slots) {
    Object.assign(node.props, onlyOwn(node.set, { Expand: "No" }));
    const brand = element.props.brand?.kind === "element" ? element.props.brand.node : null;
    const mark = element.props.logoCollapsed?.kind === "element" ? element.props.logoCollapsed.node
      : brand?.name === "Stack" ? brand.children.find((child) => child.kind === "element") ?? null : brand;
    const markNode = mark ? convert(mark, { direction: "column", stretch: false }) : null;
    const header = slots.find((slot) => slot.name === "Header-Content");
    if (header) header.children = markNode ? [markNode] : [];
    else if (markNode) slots.unshift({ name: "Header-Content", children: [markNode] });
    // A row of the rail is its icon: as wide as it (Figma's 44; its Element fills the open row), its label left in its
    // layer's name (no text to write).
    const iconOnly = (layer) => {
      if (layer?.set?.id !== SETS.menuItem.id) return layer;
      const { text, fillW, nested, ...row } = layer;
      // Its counter has no room in the rail: the Noti-Dot marks it (Sidebar.tsx railCount; a "0" shows nothing).
      const count = nested?.find((entry) => entry.path === "Counter")?.text;
      const kept = (nested ?? []).filter((entry) => entry.path !== "Counter");
      const counted = layer.props.Counter === true ? { Counter: false, ...onlyOwn(layer.set, { "Noti-Dot": count !== "0" }) } : {};
      return { ...row, ...(kept.length ? { nested: kept } : {}), props: { ...layer.props, Label: false, ...counted }, hugW: true, hugLayers: [{ name: "Element", w: true }] };
    };
    for (const slot of slots) {
      if (slot.name === "Header-Content") continue;
      let group = 0;
      slot.children = slot.children.map((layer) => {
        if (layer.type !== "FRAME" || !layer.name.startsWith("Section")) return iconOnly(layer);
        const divider = group++ > 0 ? instanceNode(elementOf("Divider", {}), {}) : null;
        const rows = layer.children.filter((child) => child.set?.id !== SETS.sectionTitle.id).map(iconOnly);
        return { ...layer, children: [...(divider ? [{ ...divider, fillW: true }] : []), ...rows] };
      });
    }
  }

  /** The Dashboard header's texts (Type Main: title, Child, SubHeading; Control-Bar: its count) and Search (dashboardHeaderParts, the other way). */
  function dashboardHeaderParts(element, code, node) {
    const type = code.type ?? "control-bar";
    const texts = {};
    if (type === "main") {
      if (typeof code.title === "string") node.text = code.title;
      if (typeof code.childTitle === "string") texts.Child = code.childTitle;
      if (typeof code.subheading === "string") texts.SubHeading = code.subheading;
      // Header-Text is a slot (7394:1274): its Child and SubHeading show by their own eyes. Figma dropped Child-Heading,
      // and Subheading no longer reaches the slot's layers (read 2026-10-21).
      delete node.props["Child-Heading"];
      node.edits = [...(node.edits ?? []), { layer: ["Header-Text", "Heading-Wrapper", "Child"], visible: Boolean(texts.Child) }, { layer: ["Header-Text", "SubHeading"], visible: Boolean(texts.SubHeading) }];
    }
    if (type === "control-bar") {
      if (typeof code.subheading === "string") texts.Subheading = code.subheading;
      const search = element.props.search;
      if (search?.kind === "element") {
        const placeholder = literalOf(search.node.props.placeholder);
        node.props.Search = true;
        if (typeof placeholder === "string") (node.nested ??= []).push({ path: "Search", props: {}, text: placeholder });
      } else node.props.Search = false;
    }
    if (Object.keys(texts).length) node.texts = texts;
  }

  /**
   * A Table as Figma draws it (figma-pull tableElement, the other way): a frame of Primitives/Table/Data-Row instances,
   * the first a header row of Table/Cell/Header, each other row's Columns slot a Table/Cell/Default per column holding
   * the column's content cell (Text-Cell, Badge-Cell…), fixed width or Fill; a row's overrides change its Badge, Dock
   * Icon or action buttons.
   */
  function tableNode(element, code, id, parent = null) {
    const columns = Array.isArray(plain(element.props.columns)) ? plain(element.props.columns) : [];
    const rows = Array.isArray(plain(element.props.rows)) ? plain(element.props.rows) : [];
    const overrides = plain(element.props.overrides) ?? {};
    if (!columns.length) notes.push(`Table${id ? ` (${id})` : ""}: its columns are not written in the page (left out)`);
    const widthOf = (column) => (/^\d+px$/.test(String(column.width ?? "")) ? Number.parseInt(column.width, 10) : null);
    const sized = (node, column) => (widthOf(column) ? { ...node, fixedWidth: widthOf(column) } : { ...node, fillW: true });
    const align = (column) => (column.align === "right" ? "Right" : "Left");
    // The sorted column's header shows its direction (Table.tsx: arrow up / down) in Figma's Sort glyph, the others ↕.
    const sort = plain(element.props.sort);
    // (The header's Icon layer is the glyph itself: swapped for the arrow's component.)
    const sortGlyph = (column) => (column.sortable && sort?.columnId === column.id && ["asc", "desc"].includes(sort.direction) ? { nested: [{ path: "Icon", set: { id: null, name: sort.direction === "asc" ? "icon-arrow-up-line" : "icon-arrow-down-line" } }] } : {});
    const header = columns.map((column) => sized({ type: "INSTANCE", name: column.id, set: SETS.headerCell, props: onlyOwn(SETS.headerCell, { "✏️ Label": String(column.header ?? ""), Label: Boolean(column.header), Type: column.sortable ? "Sort" : "None", Align: align(column), Icon: Boolean(column.icon) }), ...sortGlyph(column) }, column));
    // selectable: a 48px checkbox column first (table.css .zen-table__col-select): Figma's header Type=Checkbox, a
    // Control-Cell checkbox in each row.
    const selectable = code.selectable === true;
    const selectWidth = 48;
    if (selectable) header.unshift({ type: "INSTANCE", name: "select", set: SETS.headerCell, props: onlyOwn(SETS.headerCell, { "✏️ Label": "", Label: false, Type: "Checkbox", Align: "Left", Icon: false }), fixedWidth: selectWidth });
    const instanceOf = (name, codeValues, where) => {
      const entry = entryFor(name, codeValues, byCode, mapping);
      if (!entry) { notes.push(`${where}: no Figma set for ${name}`); return null; }
      return { type: "INSTANCE", name, set: { id: entry.id, name: entry.name }, props: figmaProps(entry, codeValues, mapping, notes, where) };
    };
    const content = (column, row, rowId) => {
      const kind = column.content ?? "text";
      const set = CELL_SETS[kind];
      const field = column.field ?? column.id;
      const value = row[field];
      const label = typeof value === "string" || typeof value === "number" ? String(value) : "";
      const caption = column.captionField && typeof row[column.captionField] === "string" ? row[column.captionField] : "";
      const own = (name) => overrides[`Row[${rowId}]/${column.id}/${name}`] ?? {};
      const where = `Table › ${column.id} › row ${rowId}`;
      if (kind === "text") return { type: "INSTANCE", name: "Text-Cell", set, props: onlyOwn(set, { Bold: column.bold ? "Yes" : "No", Caption: Boolean(caption) }), textList: caption ? [label, caption] : [label] };
      if (kind === "badge" || kind === "tag") {
        const labels = (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== "").map(String);
        const layer = kind === "badge" ? "Badge" : "Tag";
        const drawn = kind === "badge" ? { size: "medium", theme: "neutral", background: "subtle", leadingIcon: false } : {};
        return { type: "INSTANCE", name: `${layer}-Cell`, set, props: {}, slots: [{ name: "Items", children: labels.map((text, index) => {
          const node = instanceOf(layer, { ...drawn, ...(labels.length > 1 ? own(`${layer}[${index}]`) : own(layer)) }, where);
          return node ? { ...node, text } : null;
        }).filter(Boolean) }] };
      }
      if (kind === "trend") {
        const number = Number.parseFloat(label.replace(/[^\d.+-]/g, ""));
        return { type: "INSTANCE", name: "Trend-Cell", set, props: { Trend: label.trim().startsWith("-") || number < 0 ? "Down" : number > 0 ? "Up" : "Neutral" }, textList: [label] };
      }
      if (kind === "progress") return { type: "INSTANCE", name: "Progress-Cell", set, props: {}, textList: [`${Math.max(0, Math.min(100, Number(value) || 0))}%`] };
      if (kind === "checkbox" || kind === "toggle") return { type: "INSTANCE", name: "Control-Cell", set, props: { Type: kind === "checkbox" ? "Checkbox" : "Toggle" } };
      if (kind === "actions") {
        const actions = Array.isArray(column.actions) ? column.actions : [];
        return { type: "INSTANCE", name: "Actions-Cell", set, props: {}, slots: [{ name: "Actions", children: actions.map((action, index) => {
          const node = instanceOf("IconButton", { appearance: "flat", level: action.level ?? "primary", size: action.size ?? "md", icon: action.icon, ...(actions.length > 1 ? own(`Button[${index}]`) : own("Button")) }, where);
          return node ? { ...node, name: action.label ?? "Action" } : null;
        }).filter(Boolean) }] };
      }
      // Media cells: the label (and Subtext) in their nested Text-Cell (the live file: Content-Div › Text-Cell › Label,
      // Caption), the Dock Icon's or icon's own look, the photo.
      const media = column.mediaField ? row[column.mediaField] : undefined;
      const pictured = typeof media === "string" && media !== "";
      // A photo cell without its picture draws a square Avatar with the label's initials (Table.tsx cellVisual): that is
      // Figma's Avatar-Cell with a Square Avatar, since Photo-Cell's Photo is a rectangle (figma-pull reads it back as photo).
      const cellSet = kind === "photo" && !pictured ? CELL_SETS.avatar : set;
      const node = { type: "INSTANCE", name: cellSet.name.split("/").pop(), set: cellSet, props: onlyOwn(cellSet, { Bold: column.bold ? "Yes" : "No", Subtext: caption ? "Yes" : "No" }), nested: [{ path: "Text-Cell", props: { Caption: Boolean(caption) }, textList: caption ? [label, caption] : [label] }] };
      if (kind === "dock-icon") {
        const dock = instanceOf("DockIcon", { size: "xs", theme: "neutral", background: "subtle", ...(typeof media === "string" ? { icon: media } : {}), ...own("Dock-Icon") }, where);
        if (dock) node.nested.push({ path: "Dock-Icon", set: dock.set, props: dock.props, ...(typeof own("Dock-Icon").emoji === "string" ? { text: own("Dock-Icon").emoji } : {}) });
      }
      if (kind === "icon" && typeof media === "string") node.swapIcon = media;
      // Its Avatar as Table.tsx draws it (cellVisual): Subtle, Small over a Subtext (XSmall alone), a photo or the
      // label's initials on Neutral, the row's Avatar override on top (Figma's sample is a Photo placeholder). A photo
      // cell with its picture has no Avatar in Figma: the picture fills Photo-Cell's Photo.
      if (kind === "avatar" || (kind === "photo" && !pictured)) {
        const mine = own("Avatar");
        const avatar = instanceOf("Avatar", { size: caption ? "sm" : "xs", shape: kind === "photo" ? "square" : "circle", background: "subtle", theme: pictured ? "photo" : "neutral", ...mine }, where);
        // The page's own initials (an override's children: "Bich Ngoc Ha" → BH) win over the label's first two words.
        if (avatar) node.nested.push({ path: "Avatar", props: avatar.props, ...(pictured ? {} : { text: avatarInitials(typeof mine.children === "string" ? mine.children : initialsOf(label), mine.size ?? (caption ? "sm" : "xs")) }) });
      }
      if ((kind === "avatar" || kind === "photo") && pictured) { node.image = media; images.add(media); }
      return node;
    };
    // Inside a surface the last row's cells drop their bottom rule (only the weight: the paint keeps its variable).
    const closed = Boolean(parent?.surface);
    const rowNodes = rows.map((row, index) => {
      const rowId = row?.id ?? String(index);
      const edge = closed && index === rows.length - 1 ? { strokeBottom: 0 } : {};
      const select = selectable ? [{ type: "INSTANCE", name: "select", set: SETS.defaultCell, props: onlyOwn(SETS.defaultCell, { Align: "Left" }), ...edge, fixedWidth: selectWidth, slots: [{ name: "Content", children: [{ type: "INSTANCE", name: "Control-Cell", set: CELL_SETS.checkbox, props: { Type: "Checkbox" } }] }] }] : [];
      return { type: "INSTANCE", name: `Row ${index + 1}`, set: SETS.dataRow, props: {}, fillW: true, slots: [{ name: "Columns", children: [...select, ...columns.map((column) => sized({ type: "INSTANCE", name: column.id, set: SETS.defaultCell, props: onlyOwn(SETS.defaultCell, { Align: align(column) }), ...edge, slots: [{ name: "Content", children: [content(column, row ?? {}, rowId)] }] }, column))] }] };
    });
    return { type: "FRAME", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "Table", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [{ type: "INSTANCE", name: "Header", set: SETS.dataRow, props: {}, fillW: true, slots: [{ name: "Columns", children: header }] }, ...rowNodes] };
  }

  /**
   * MetricCard in Figma's Metric-Inline layers: Label and Metric-Number, the Trend badge (its Trend option and label),
   * the Metric-Icon Dock Icon (icon, theme, background), the action's Icon-Main glyph; each part shown only when set.
   */
  function metricParts(element, code, node, where) {
    const texts = {};
    if (typeof code.label === "string") texts.Label = code.label;
    if (typeof code.value === "string" || typeof code.value === "number") texts["Metric-Number"] = String(code.value);
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    const trend = plain(element.props.trend);
    const action = layerOf(element, "action");
    // Its Dock Icon shows unless icon={false} (MetricWidget.tsx: icon-home-02-solid, Neutral, Subtle by default).
    const icon = code.icon === false || code.iconEmoji ? null : typeof code.icon === "string" ? code.icon : METRIC_ICON;
    Object.assign(node.props, onlyOwn(node.set, { "Metric-Title": Boolean(texts.Label), Trend: Boolean(trend), "Dock-Icon": code.icon !== false && Boolean(icon || code.iconEmoji), Action: Boolean(action) }));
    const nested = [];
    if (trend && typeof trend === "object") nested.push({ path: "Trend", props: TREND_OPTION[trend.direction] ? { Trend: TREND_OPTION[trend.direction] } : {}, ...(typeof trend.label === "string" ? { textList: [trend.label] } : {}) });
    const dock = icon ? entryFor("DockIcon", {}, byCode, mapping) : null;
    if (dock) {
      const fields = { icon, theme: code.iconTheme ?? "neutral", background: code.iconBackground ?? "subtle" };
      nested.push({ path: "Metric-Icon", props: figmaProps(dock, fields, mapping, notes, `${where} › Metric-Icon`, new Set(Object.keys(fields))) });
    }
    const actionIcon = action?.name === "IconButton" ? literalOf(action.props.icon) : undefined;
    const button = typeof actionIcon === "string" ? entryFor("IconButton", { appearance: "main" }, byCode, mapping) : null;
    // The action is the Metric's "Button/Icon-Main" instance (layerKey "Button"), in the sets with an Action (not Icon-Highlight).
    const actionable = "Action" in onlyOwn(node.set, { Action: true });
    if (button && actionable) nested.push({ path: "Button", props: figmaProps(button, { icon: actionIcon }, mapping, notes, `${where} › Button`, new Set(["icon"])) });
    else if (action && !actionable) notes.push(`${where}: action has no place in Figma's ${node.set.name} (no Action): not written`);
    else if (action) notes.push(`${where}: action ${action.name} has no place in Figma's Metric (its Icon-Main)`);
    if (nested.length) node.nested = [...(node.nested ?? []), ...nested];
  }

  /** ListItem in Figma's List-Item layers: Title and Subtitle (hidden without a caption), its leading Avatar (or the Dock Icon it swaps to), Selected. */
  /**
   * A form field in Figma's Input/…-Field layers: its label in Label, what it shows in Text (its value, a SelectField's
   * option label, else the placeholder; a value is State Inputted), its help or error in Message.
   */
  function fieldParts(element, code, node) {
    let shown = [code.value, code.defaultValue].find((value) => (typeof value === "string" && value !== "") || typeof value === "number");
    if (shown !== undefined && element.name === "SelectField") {
      const option = (Array.isArray(plain(element.props.options)) ? plain(element.props.options) : []).find((item) => String(item?.value) === String(shown));
      if (option && textValue(option.label)) shown = option.label;
    }
    const help = [code.errorMessage, code.helpText].find((text) => typeof text === "string" && text);
    const texts = {
      ...(typeof code.label === "string" ? { Label: code.label } : {}),
      // Neither value nor placeholder: the field is empty (not Figma's sample "Placeholder").
      Text: shown !== undefined ? String(shown) : typeof code.placeholder === "string" ? code.placeholder : "",
      ...(help ? { Message: help } : {}),
    };
    // Figma's Autocomplete-Field draws no typed text (its Label, a button and the help): no Text to write.
    if (/Autocomplete-Field$/.test(node.set?.name ?? "")) delete texts.Text;
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    if (shown !== undefined && (node.props.State ?? "Default") === "Default") Object.assign(node.props, onlyOwn(node.set, { State: "Inputted" }));
  }

  function listItemParts(element, code, node, where, slots) {
    const texts = {};
    if (typeof code.title === "string") texts.Title = code.title;
    if (typeof code.caption === "string") texts.Subtitle = code.caption;
    else if (layerOf(element, "caption")) texts.Subtitle = deepText(layerOf(element, "caption"));
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    // Without a caption Subtitle hides (its own content replaces both when it has children).
    if (texts.Title && !texts.Subtitle && !element.children.some((child) => child.kind === "element")) node.hide = [...(node.hide ?? []), "Subtitle"];
    if (code.selected === true) Object.assign(node.props, onlyOwn(node.set, { State: "Selected" }));
    // Its trailing layer (a Badge, a price, an IconButton) in the Trailing primitive's Actions slot.
    const trailing = layerOf(element, "trailing");
    const after = trailing ? convert(trailing, { direction: "row", stretch: false }) : null;
    if (after) slots.push({ name: "Actions", children: [after] });
    const leading = layerOf(element, "leading");
    if (!leading) return;
    const lead = convert(leading, { direction: "row", stretch: false });
    if (lead?.type === "INSTANCE" && lead.set?.id) (node.nested ??= []).push({ path: "Avatar", set: lead.set, props: lead.props, ...(lead.text ? { text: lead.text } : {}), ...(lead.swapIcon ? { swapIcon: lead.swapIcon } : {}) });
    else notes.push(`${where}: leading ${leading.name} has no place in Figma's List-Item (its Avatar)`);
    // An icon's size is its own size (a variable on its width), which Figma does not let a layer inside an instance
    // override ("cannot be overridden in an instance: size"): the List-Item shows the icon at the component's size.
    if (lead?.type === "INSTANCE" && (lead.sizeVar || lead.size)) notes.push(`${where}: its leading ${leading.name} shows at its own size in Figma (a layer inside a List-Item cannot be resized)`);
  }

  /**
   * Header/AppShell's top row (16783:71068, read 2026-10-21): Top-Elements holds Leading-Slots (Fill, Gap/Medium), the
   * Center-Slots (400 wide, shown with content) and Trailing-Slots (Fill, right-aligned, Gap/Small), as the set draws
   * them; Top-Header shows while any of them holds layers. The Collapse Button is the AppShell's (collapse="header"),
   * never a header's own.
   */
  function appShellHeaderParts(element, node, slots) {
    const row = (name, layers, extra) => ({ type: "FRAME", name, layout: { mode: "HORIZONTAL", gap: 0, padding: [0, 0, 0, 0], counter: "CENTER", primary: "MIN", ...extra.layout }, children: layers, ...extra.frame });
    const layers = (prop) => (element.props[prop]?.kind === "element" ? slotLayers(element.props[prop]) : []);
    // The header's Search fills the row up to 400px (app-shell.css .zen-app-shell-header__leading > .zen-search), where
    // Figma's Search keeps its own 250px and cuts the placeholder short.
    const leading = layers("leading").map((layer) => (/^Search\//.test(layer.set?.name ?? "") ? { ...layer, fillW: true, maxW: HEADER_SEARCH_MAX } : layer));
    // The centre's layers fill its 400px (dashboard-header.css .zen-dashboard-header__center > * { width: 100% }), where
    // Figma's Center-Slots would push them to its end.
    const center = layers("center").map((layer) => (layer.absolute ? layer : { ...layer, fillW: true })), actions = layers("actions");
    // The Main row fills the header; each section row pads Padding/Small above and below, Margin-Comfortable at the sides
    // (app-shell.css .zen-app-shell-header__section), Sections' slot having none of its own.
    for (const slot of slots) {
      if (slot.name === "Main-Element") slot.children = slot.children.map((layer) => (layer.absolute ? layer : { ...layer, fillW: true }));
      if (slot.name === "Sections") slot.children = slot.children.map((layer) => ({ type: "FRAME", name: "Section", layout: { mode: "VERTICAL", gap: 0, padding: SHELL_ROW_PADDING, paddingVars: SHELL_ROW_PADDING_VARS, counter: "MIN", primary: "MIN" }, children: [{ ...layer, fillW: true }], fillW: true }));
    }
    const top = [
      row("Leading-Slots", leading, { layout: { gap: 16, gapVar: "Spacing/Gap/Medium" }, frame: { fillW: true } }),
      ...(center.length ? [row("Center-Slots", center, { layout: { gap: 12, gapVar: "Spacing/Gap/Small", primary: "MAX" }, frame: { fixedWidth: 400 } })] : []),
      row("Trailing-Slots", actions, { layout: { gap: 12, gapVar: "Spacing/Gap/Small", primary: "MAX" }, frame: { fillW: true } }),
    ];
    const shown = leading.length + center.length + actions.length > 0;
    node.props = { ...node.props, "Top-Header": shown, "Collapse Button": false };
    // Sections is a slot with no switch, holding two sample rows: a header with no sections empties it.
    delete node.props.Sections;
    if (!slots.some((slot) => slot.name === "Sections")) slots.push({ name: "Sections", children: [] });
    // Figma draws Border & Divider at Density Small only (the code at both): the theme is what shows.
    if (node.props.Theme && node.props.Theme !== "Default" && (node.props.Density ?? "Medium") === "Medium") {
      notes.push(`AppShellHeader: Figma has no ${node.props.Theme} header at Density Medium: Density Small`);
      node.props.Density = "Small";
    }
    if (shown) slots.push({ name: "Top-Elements", children: top });
  }

  /**
   * A Card's `subAction` in Figma's Sub-Action (Button/Icon-Flat Small Secondary, its Leading-Icon-Src): the icon when it
   * is not the default ⋮. Its label (the button's aria-label) and handler have no place in Figma; a node there (a Menu's
   * trigger) shows as Figma's ⋮, with a note unless it is an IconButton.
   */
  function subActionIcon(value, where) {
    if (value?.kind === "object") {
      const label = literalOf(value.fields.label);
      if (typeof label === "string" && label !== zenLabels.en.moreActions) notes.push(`${where}: its subAction label "${label}" has no place in Figma (it reads back as "${zenLabels.en.moreActions}")`);
      const icon = literalOf(value.fields.icon);
      return typeof icon === "string" && icon !== SUB_ACTION_ICON ? icon : null;
    }
    if (value?.kind !== "element") return null;
    if (value.node.name === "IconButton") {
      const icon = literalOf(value.node.props.icon);
      return typeof icon === "string" && icon !== SUB_ACTION_ICON ? icon : null;
    }
    notes.push(`${where}: its subAction ${value.node.name} shows as Figma's ⋮ Sub-Action`);
    return null;
  }

  function instanceNode(element, code, id, parent = null) {
    const where = `${element.name}${id ? ` (${id})` : ""}`;
    const entry = entryFor(element.name, code, byCode, mapping);
    if (!entry) return wrapperNode(element, code, id, where, parent);
    const filled = new Set(Object.entries(element.props).filter(([name, value]) => name !== "overrides" && ["element", "array", "object"].includes(value.kind)).map(([name]) => name));
    const props = figmaProps(entry, code, mapping, notes, where, null, filled);
    const node = { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : entry.name, set: { id: entry.id, name: entry.name }, props };
    const label = textOf(element) || (TEXT_PROP[element.name] && typeof code[TEXT_PROP[element.name]] === "string" ? code[TEXT_PROP[element.name]] : "");
    // An Avatar's initials as it draws them (one letter when small).
    if (label) node.text = element.name === "Avatar" ? avatarInitials(label, code.size ?? "md") : label;
    const slots = [];
    const dataSlots = mapping.dataSlots?.[element.name] ?? [];
    const slotProps = SLOT_OF_PROP[element.name] ?? {};
    // What its slots hold sits inside a surface when this is one (a Card) or sits in one: a Table there drops its last rule.
    const surface = Boolean(parent?.surface) || SURFACES.has(element.name);
    for (const [name, value] of Object.entries(element.props)) {
      const dataSlot = dataSlots.find((slot) => slot.prop === name);
      if (dataSlot && (value.kind === "array" || value.kind === "object")) {
        const children = dataSlotChildren(element.name, dataSlot, plain(value), code, value);
        // Segmented hugs its items unless fullWidth (Segmented.tsx): its Item-List slot hugs with it.
        // A Segmented's items hug, or split a full-width one: its Item-List slot fills it then (Figma's slot hugs).
        if (children) slots.push({ name: dataSlot.name, children, ...(element.name === "Segmented" ? (code.fullWidth === true ? { fillW: true } : { hugW: true }) : {}) });
        else notes.push(`${where}: ${name} (${dataSlot.name}) has no item set yet: not written`);
        continue;
      }
      if (slotProps[name] && value.kind === "element") {
        const shownBy = SLOT_SHOWN_BY[element.name]?.[name];
        if (shownBy && !(shownBy in onlyOwn(node.set, { [shownBy]: true }))) {
          notes.push(`${where}: ${name} has no place in Figma's ${node.set.name} (no ${slotProps[name]}): not written`);
          continue;
        }
        const framed = FRAMED_SLOT_PROPS[element.name]?.has(name) ? [convert(value.node, { direction: "column", stretch: true, surface })].filter(Boolean).map((layer) => ({ ...layer, fillW: true })) : null;
        slots.push({ name: slotProps[name], children: framed ?? slotLayers(value, surface) });
        continue;
      }
      if (name === "search" && element.name === "DashboardHeader") continue;
      // A Sidebar's logo is its header (sidebarHeader); its collapsed mark the rail's (sidebarRail).
      if ((name === "logo" || name === "logoCollapsed") && element.name === "Sidebar") continue;
      if (DRAWN_PARTS[element.name]?.has(name)) continue;
      if (value.kind === "array" || (value.kind === "object" && name !== "overrides")) notes.push(`${where}: ${name} is data with no Figma slot: not written`);
      if (value.kind === "element") notes.push(`${where}: ${name} holds layers with no Figma slot: not written`);
    }
    if (element.name === "DashboardHeader") dashboardHeaderParts(element, code, node);
    if (element.name === "AppShellHeader") appShellHeaderParts(element, node, slots);
    if (element.name === "MetricCard" || element.name === "Metric") metricParts(element, code, node, where);
    // ListBox is as tall as its rows (Figma's List-Box starts at its sample's fixed height, in its Container-Slot frame
    // and its Body-Slot too).
    if (element.name === "ListBox") {
      listBoxVariant(node.props, notes, where);
      node.hugH = true;
      node.hugLayers = [{ name: "Container-Slot", h: true }];
    }
    // Segmented is as wide as its items (inline, max-content) unless fullWidth: it never stretches with its column.
    if (element.name === "Segmented") node[code.fullWidth === true ? "fillW" : "hugW"] = true;
    // Card's ⋮ Sub-Action shows by default in Figma; the page shows it only with `subAction`.
    if (element.name === "Card") {
      cardVariant(Object.assign(node.props, onlyOwn(node.set, { "Sub-Action": Boolean(element.props.subAction) })), notes, where);
      const icon = subActionIcon(element.props.subAction, where);
      const flat = icon ? entryFor("IconButton", { appearance: "flat" }, byCode, mapping) : null;
      if (icon) (node.nested ??= []).push({ path: "Sub-Action", ...(flat ? { set: { id: flat.id, name: flat.name } } : {}), props: { "Leading-Icon-Src": icon } });
    }
    if (element.name === "ListItem") listItemParts(element, code, node, where, slots);
    if (FIELDS.has(element.name)) fieldParts(element, code, node);
    // Progress: its label (a string, else the percentage) in Text; the bar's fill step by its value (Progress-Bar).
    if (element.name === "ProgressBar" || element.name === "ProgressCircle") {
      const value = Math.max(0, Math.min(100, Number(code.value) || 0));
      const label = typeof code.label === "string" ? code.label : code.label ? `${Math.round(value)}%` : null;
      Object.assign(node.props, onlyOwn(node.set, { ...(label ? { Text: label } : {}), ...(element.name === "ProgressBar" ? { Progress: progressStep(value) } : {}) }));
      // Stacked: the Value at the header's end is valueLabel, else the rounded percentage (Progress.tsx).
      if (element.name === "ProgressBar" && code.layout === "stacked") node.texts = { ...(node.texts ?? {}), Value: typeof code.valueLabel === "string" || typeof code.valueLabel === "number" ? String(code.valueLabel) : `${Math.round(value)}%` };
      // The fill at its exact share: the step is the nearest look, the Container's columns the value itself.
      if (element.name === "ProgressBar") node.edits = [...(node.edits ?? []), { layer: PROGRESS_TRACK, columns: progressColumns(value) }];
    }
    // Pagination Inline / Manually: the range (its own text layer, so textList) and Inline's page size chip, as
    // Pagination.tsx counts them (labels.ts en), where Figma kept "1 - 50 of 100 results" and "50 results".
    if (element.name === "Pagination" && (code.theme === "inline" || code.theme === "manually")) {
      const perPage = Math.max(1, Number(code.pageSize ?? code.defaultPageSize ?? 50) || 50);
      const total = Math.max(0, Number(code.total ?? 0) || 0);
      const pages = Math.max(1, Math.ceil(total / perPage));
      const current = Math.min(Math.max(1, Number(code.page ?? code.defaultPage ?? 1) || 1), pages);
      const first = total === 0 ? 0 : (current - 1) * perPage + 1;
      node.textList = [zenLabels.en.resultsRange(first, Math.min(total, current * perPage), total)];
      if (code.theme === "inline") node.nested = [...(node.nested ?? []), { path: "Page-Size", props: {}, text: zenLabels.en.results(perPage) }];
    }
    if (element.name === "AiChatField" && typeof code.placeholder === "string") node.texts = { ...(node.texts ?? {}), Text: code.placeholder };
    // Its model switch shows only with `model` (Figma's Model starts on).
    if (element.name === "AiChatField") Object.assign(node.props, onlyOwn(node.set, { Model: element.props.model !== undefined }));
    // Toggle, Checkbox, RadioButton: their label and caption in the nested Content primitive (its Label and Subtext,
    // which its Subtext property shows; the live file, 2026-10-13).
    if (element.name === "Toggle" || element.name === "Checkbox" || element.name === "RadioButton") {
      // The caption goes with the Content's Subtext: the importer shows the layer, then writes it (a hidden layer is
      // not found).
      const caption = typeof code.caption === "string" && code.caption ? code.caption : null;
      if (typeof code.label === "string") node.texts = { ...(node.texts ?? {}), Label: code.label };
      if (typeof code.label === "string" || caption) node.nested = [...(node.nested ?? []), { path: "Content", props: { Subtext: Boolean(caption) }, ...(caption ? { texts: { Subtext: caption } } : {}) }];
    }
    // A DockIcon of the Emoji theme draws its emoji as its text (Dock-Icon Theme=Emoji's text layer).
    if (element.name === "DockIcon" && code.theme === "emoji" && typeof code.emoji === "string" && code.emoji) node.text = code.emoji;
    if (element.name === "FileUpload") {
      const texts = Object.fromEntries([["Label", code.label], ["Message", code.helpText], ["Text", code.text], ["Internal Caption", code.caption]].filter(([, text]) => typeof text === "string" && text));
      if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    }
    if (element.name === "PropertyField") {
      const cell = element.children.find((child) => child.kind === "element" && PROPERTY_CELL_TYPE[child.name]);
      if (!cell) notes.push(`${where}: no value cell (PropertyText … PropertyTags): its Value keeps Figma's sample`);
      else {
        const drawn = propertyValueFigma(cell.name, Object.fromEntries(Object.entries(cell.props).map(([name, value]) => [name, plain(value)])));
        node.nested = [...(node.nested ?? []), ...drawn.nested];
        if (drawn.hide.length) node.hide = [...(node.hide ?? []), ...drawn.hide];
        for (const note of drawn.notes) notes.push(`${where}: ${note}`);
      }
    }
    // InlineMessage: its title in Title, its words in Caption (not the first text layer), its action's label.
    if (element.name === "InlineMessage") {
      const words = deepText(element).trim();
      node.texts = { ...(node.texts ?? {}), ...(typeof code.title === "string" ? { Title: code.title } : {}), ...(words ? { Caption: words } : {}) };
      delete node.text;
      const action = plain(element.props.action);
      if (action && typeof action === "object" && typeof action.label === "string") (node.nested ??= []).push({ path: "Action", props: {}, text: action.label });
      // Its close button shows only with onClose (Figma's Close starts on).
      node.props.Close = element.props.onClose !== undefined;
    }
    // IconButton without a level takes the one Button.tsx resolves (no static default, so none was written and Figma
    // showed its Primary): Tertiary on Main, Primary on Flat, Accent on Overlay.
    if (element.name === "IconButton" && code.level === undefined && code.variant === undefined) {
      Object.assign(node.props, onlyOwn(node.set, { Level: { flat: "Primary", overlay: "Accent" }[code.appearance] ?? "Tertiary" }));
    }
    if (element.name === "Search") {
      const shown = [code.value, code.defaultValue, code.placeholder].find((text) => typeof text === "string" && text);
      if (shown) node.texts = { ...(node.texts ?? {}), Text: shown };
    }
    // Chip/Advanced draws a leading icon as Theme Leading-Icon (no Icon-Src property): its Leading glyph swapped.
    if (element.name === "Chip" && typeof code.leading === "string" && ownProps(node.set)?.has("Theme") && !ownProps(node.set)?.has("Icon-Src")) {
      delete node.props["Icon-Src"];
      node.props.Theme = "Leading-Icon";
      node.swapIcon = code.leading;
    }
    // A Sidebar without a footer: Figma's sample footer rows go, and the footer's divider and padding with them.
    const noFooter = element.name === "Sidebar" && !element.props.footer && (entry.slots?.includes("Footer-Content") || entry.slots?.includes("Child-Footer-Content"));
    if (noFooter) node.hide = [...(node.hide ?? []), "Divider", "Footer-Container"];
    if (PICTURED.has(element.name) && typeof code.src === "string" && code.src) {
      node.image = code.src;
      images.add(code.src);
      // A photo Avatar only comes with a Subtle background in Figma (Theme=Photo, Background=Solid is no variant).
      if (element.name === "Avatar") Object.assign(node.props, { Theme: "Photo", ...("Background" in node.props ? { Background: "Subtle" } : {}) });
    }
    // A PropertyField's cell is its nested Value (above), not slot content.
    const layers = element.name === "PropertyField" ? [] : element.children.filter((child) => child.kind === "element");
    if (layers.length) {
      const taken = new Set(slots.map((slot) => slot.name));
      const own = CHILD_SLOT[element.name];
      const name = (own && (!entry.slots || entry.slots.includes(own)) ? own : null) ?? (entry.slots ?? []).find((slot) => !taken.has(slot)) ?? "Content";
      // A row the component marks selected (Sidebar selectedId → its SidebarMenuItem's Select Yes).
      const selected = SELECTED_PROP[element.name] ? code[SELECTED_PROP[element.name]] : undefined;
      const content = layers.map((child) => {
        const layer = convert(child, { direction: "column", stretch: true, surface });
        if (layer?.props && "Select" in layer.props && selected !== undefined && literalOf(child.props.id) === selected) layer.props.Select = "Yes";
        // A component's content column stretches its blocks (a Card's Stack, a ListBox's List) and wraps its texts:
        // frames and texts fill the slot.
        return (layer?.type === "FRAME" || layer?.type === "TEXT") && !layer.absolute ? { ...layer, fillW: true } : layer;
      }).filter(Boolean);
      // A ListItem's own content is a column (list-item.css .zen-list-item__contents, Gap/3XSmall); Figma's Contents
      // slot lays its layers in a row: one column frame holds them.
      const column = element.name === "ListItem" && content.length > 1
        ? [{ type: "FRAME", name: "Contents", layout: { mode: "VERTICAL", gap: 2, gapVar: "Spacing/Gap/3XSmall", padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: content, fillW: true }]
        : content;
      slots.push({ name, children: column });
    }
    if (noFooter) slots.push({ name: "Footer-Content", children: [] });
    if (element.name === "Sidebar" && literalOf(element.props.collapsed) !== true && (code.variant ?? "basic") !== "workspace") sidebarHeader(element, slots, surface);
    // Side-Bar/Master's Collapse Button (on by default in Figma): Sidebar.tsx draws the control with onCollapsedChange,
    // or where its AppShell puts the toggle (collapse="sidebar", appShellNode).
    if (element.name === "Sidebar" && (code.variant ?? "basic") !== "workspace") node.props = { ...node.props, "Collapse Button": "onCollapsedChange" in element.props };
    if (element.name === "Sidebar" && literalOf(element.props.collapsed) === true && (code.variant ?? "basic") !== "workspace") sidebarRail(element, node, slots);
    if (element.name === "ListBox") for (const slot of slots) if (slot.name === "Body-Slot") slot.hugH = true;
    // A workspace Sidebar's sections went to a Body-Content its set does not have (no menu in Figma; corpus test 2026-10-18).
    if (element.name === "Sidebar" && node.set?.name === "Side-Bar/Master/Workspace") for (const slot of slots) slot.name = WORKSPACE_SLOTS[slot.name] ?? slot.name;
    if (slots.length) node.slots = slots;
    const overrides = element.props.overrides;
    if (overrides?.kind === "object") {
      node.nested ??= [];
      for (const [path, value] of Object.entries(overrides.fields)) {
        if (value.kind !== "object") continue;
        // The nested instance's component, layer by layer from the owner (Card › Sub-Action → IconButton).
        let owner = element.name;
        for (const segment of path.split("/")) owner = owner ? nestedLayers[owner]?.[segment.replace(/\[.*$/, "")] : null;
        const fields = Object.fromEntries(Object.entries(value.fields).filter(([, field]) => field.kind === "literal").map(([name, field]) => [name, field.value]));
        const inner = owner ? entryFor(owner, fields, byCode, mapping) : null;
        if (!inner) { notes.push(`${where} › ${path}: its component is not known (override left out)`); continue; }
        node.nested.push({ path, set: { id: inner.id, name: inner.name }, props: figmaProps(inner, fields, mapping, notes, `${where} › ${path}`, new Set(Object.keys(fields))), ...(typeof fields.children === "string" ? { text: fields.children } : {}) });
      }
    }
    if (node.nested && !node.nested.length) delete node.nested;
    return node;
  }

  const title = literalOf(screen.props.title) ?? doc.header?.title ?? "Studio page";
  // The Screen's app frame (screen-chrome.mjs; builder runtime Screen): the desktop layout's Sidebar and Page header, the
  // mobile layout's Top and Bottom navigation, around the page. The other layout's parts wait for a device change.
  const active = screenLayout(device, literalOf(screen.props.layout));
  const chromeProps = SCREEN_CHROME.map((part) => part.prop);
  const chromeOf = (prop) => (SCREEN_CHROME.some((part) => part.prop === prop && part.layout === active) && screen.props[prop]?.kind === "element" ? screen.props[prop].node : null);
  const chrome = chromeProps.some(chromeOf);
  const placed = screen.children.filter((child) => child.kind === "element");
  // The master layout (a root AppShell, screen-frame.mjs) is the desktop layout's: the mobile layout draws its content.
  const layers = active === "mobile" && placed.length === 1 && placed[0].name === "AppShell" ? placed[0].children.filter((child) => child.kind === "element") : placed;
  const rootStack = !chrome && layers.length === 1 && layers[0].name === "Stack";
  // Anything else on the Screen (an AppShell, a Container…) fills the frame's width, as it fills the Screen.
  const filled = (node) => (node.absolute ? node : { ...node, fillW: true });
  // The page's width: the frame's, less the desktop layout's Sidebar (an open Zen Sidebar; any other: unknown).
  const chromeSidebar = chrome && active === "desktop" ? chromeOf("sidebar") : null;
  const chromeSide = chromeSidebar ? sidebarWidth(chromeSidebar, literalOf(chromeSidebar.props.collapsed) === true) : 0;
  const pageWidth = chromeSide === null ? null : frameWidth - chromeSide;
  const page = rootStack ? [] : layers.map((layer) => convert(layer, { direction: "column", stretch: true, width: pageWidth })).filter(Boolean).map(filled);
  const column = (name, children, extra = {}) => ({ type: "FRAME", name, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: children.filter(Boolean), ...extra });
  const part = (prop, parent) => (chromeOf(prop) ? convert(chromeOf(prop), parent) : null);
  let body = page;
  if (chrome && active === "desktop") {
    const sidebar = part("sidebar", { direction: "row", stretch: true });
    const header = part("header", { direction: "column", stretch: true });
    const main = column("Main", [
      // builder.css .studio-builder-screen__header: Padding/XLarge above and on the sides.
      header && column("Header", [filled(header)], { layout: { mode: "VERTICAL", gap: 0, padding: [24, 24, 0, 24], counter: "MIN", primary: "MIN" }, fillW: true }),
      column("Content", page, { fillW: true }),
    ], { fillW: true });
    body = [{ type: "FRAME", name: "Screen", layout: { mode: "HORIZONTAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [sidebar && { ...sidebar, fillH: true }, main].filter(Boolean), fillW: true }];
  } else if (chrome) {
    body = [part("topNavigation", { direction: "column", stretch: true }), column("Content", page, { fillW: true }), part("bottomNavigation", { direction: "column", stretch: true })].filter(Boolean).map(filled);
  }
  const root = rootStack ? frameNode(layers[0], codeProps(layers[0]), figmaIdOf(layers[0].id), { direction: "column", stretch: true, width: frameWidth }) : { type: "FRAME", name: title, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: body };
  for (const element of [doc.board, screen]) for (const name of Object.keys(element.props)) if (!["id", "title", "device", "layout", "canvas", "height", ...chromeProps].includes(name) && !DRAWN_BY_PULL.has(name)) notes.push(`${element.name} ${name}: not pushed`);
  // The frame is keyed by the Stack it draws, else by the Screen (its layers keep their own keys).
  if (rootStack && layers[0].id) root.key = layers[0].id;
  else if (screen.id) root.key = screen.id;
  for (const [name, count] of framed) notes.push(`${name}${count > 1 ? ` ×${count}` : ""}: no Figma component, drawn as a frame of its layers (or as its text)`);
  // The Screen's canvas and height (builder.css .studio-builder-screen: Canvas/Default, Alt or Flat; at least 900px, a
  // phone 844, or the height it is drawn at): the plugin's frame was Figma's default white, the paste's had no fill.
  const canvas = { alt: "Alt", flat: "Flat" }[literalOf(screen.props.canvas)] ?? "Default";
  const screenHeight = literalOf(screen.props.height);
  const frame = {
    ...root, name: title, width: DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop,
    ...(root.fill || root.fillStyle ? {} : { fill: `Background/Canvas/${canvas}` }),
    minH: typeof screenHeight === "number" ? screenHeight : device === "phone" ? 844 : 900,
    ...(doc.header?.figma?.file ? { file: doc.header.figma.file } : {}),
  };
  if (doc.header?.figma?.node) frame.id = doc.header.figma.node;
  // Layers the push draws itself (a Table's rows and cells, a data slot's items, a section) take their parent's key and
  // their place, so importing the page again finds them too.
  const keyed = (node, parentKey, place) => {
    node.key ??= `${parentKey}/${place}`;
    (node.children ?? []).forEach((child, index) => keyed(child, node.key, index));
    // A slot named in several layers (a chart's columns, each its own Value) keys its content by the layer it is in.
    (node.slots ?? []).forEach((slot) => slot.children.forEach((child, index) => keyed(child, node.key, `${slot.name}${Array.isArray(slot.within) ? `@${slot.within.join(">")}` : ""}.${index}`)));
    (node.edits ?? []).forEach((edit) => (edit.append ?? []).forEach((child, index) => keyed(child, node.key, `${edit.layer}.${index}`)));
  };
  keyed(frame, "page", 0);
  // An instance's overrides of its main's layers (F7b): each by the child indices that reach it in the main's drawn
  // COMPONENT (an instance's layers mirror its main's), in Figma's fields — a text's characters and fill, a layer's
  // visibility, a nested instance's variant and property values.
  const mainsDrawn = new Map();
  const withPending = [];
  const findMains = (node) => {
    if (node.type === "COMPONENT" && node.local) mainsDrawn.set(node.local, node);
    if (node.layerPending) withPending.push(node);
    (node.children ?? []).forEach(findMains);
    (node.slots ?? []).forEach((slot) => slot.children.forEach(findMains));
  };
  findMains(frame);
  if (withPending.length) {
    const indexPath = (node, key, path = []) => {
      if (node.key === key && path.length) return path;
      for (const [index, child] of (node.children ?? []).entries()) { const found = indexPath(child, key, [...path, index]); if (found) return found; }
      return null;
    };
    for (const instance of withPending) {
      const { pending } = instance.layerPending;
      delete instance.layerPending;
      const out = [];
      for (const { steps, path, props, kind, figma, text, nested: inside } of pending) {
        // The indices to the nested instance in its main, then on inside it (its layers mirror its own main's).
        let at = [];
        for (const step of steps) {
          const drawn = mainsDrawn.get(step.main);
          const part = drawn ? indexPath(drawn, step.key) : null;
          if (!part) { at = null; break; }
          at.push(...part);
        }
        if (!at) { notes.push(`${instance.name}: its override of ${path} is not pushed (the layer is not drawn in its main)`); continue; }
        // One entry per layer: a Zen component's own props and its nested layers' overrides go together.
        const known = out.find((each) => each.at.join(".") === at.join("."));
        const override = known ?? { at };
        if (figma && Object.keys(figma).length) override.props = { ...(override.props ?? {}), ...figma };
        if (typeof text === "string") override.text = text;
        if (inside) override.nested = [...(override.nested ?? []), inside];
        for (const [name, value] of Object.entries(props)) {
          const nested = /^(variant|props)\.(.+)$/.exec(name);
          if (nested && kind === "Use") (override[nested[1]] ??= {})[nested[2]] = value;
          else if (name === "children" && (kind === "Text" || kind === "Heading")) override.characters = String(value);
          else if (name === "hidden" && typeof value === "boolean") override.visible = !value;
          else if (name === "tone" && (kind === "Text" || kind === "Heading") && typeof value === "string") override.fill = contentToneToken(value);
          else notes.push(`${instance.name}: ${path} ${name} is not pushed (an override Figma has no field for here yet)`);
        }
        if (!known && Object.keys(override).length > 1) out.push(override);
      }
      // A nested instance's variant first, then the layers inside it (they are the variant's: Figma swaps them).
      out.sort((a, b) => a.at.length - b.at.length);
      if (out.length) instance.layerOverrides = out;
    }
  }
  // An icon the code names plainly ("icon-chevron-right-line") is a cut in Figma ("…-medium", icons/generated/aliases.ts).
  const figmaIcon = (value) => (typeof value === "string" && iconAliases[value]) || value;
  const cutIcons = (node) => {
    if (node.swapIcon) node.swapIcon = figmaIcon(node.swapIcon);
    // An Icon placed on its own is the icon component, found by name.
    if (node.set && !node.set.id && node.set.name) node.set = { ...node.set, name: figmaIcon(node.set.name) };
    for (const props of [node.props, ...(node.nested ?? []).map((nested) => nested.props)]) for (const name of Object.keys(props ?? {})) props[name] = figmaIcon(props[name]);
    for (const nested of node.nested ?? []) if (nested.swapIcon) nested.swapIcon = figmaIcon(nested.swapIcon);
    for (const nested of node.nested ?? []) if (nested.set && !nested.set.id && nested.set.name) nested.set = { ...nested.set, name: figmaIcon(nested.set.name) };
    (node.children ?? []).forEach(cutIcons);
    (node.slots ?? []).forEach((slot) => slot.children.forEach(cutIcons));
    (node.edits ?? []).forEach((edit) => (edit.append ?? []).forEach(cutIcons));
  };
  cutIcons(frame);
  if (tabular.length) notes.push(`${tabular.length} text${tabular.length > 1 ? "s" : ""} with tabularNumbers: set Numbers: Tabular by hand in Figma (Type details; a plugin cannot)`);
  // The same note for several layers (a MetricCard's trend on four cards) once, with its count.
  const counted = new Map();
  for (const note of notes) counted.set(note, (counted.get(note) ?? 0) + 1);
  return { frame, notes: [...counted].map(([note, count]) => (count > 1 ? `${note} (×${count})` : note)), images: [...images] };
}

/**
 * The file the Zen plugin's Import from Studio reads: `{ format: "zen-studio-figma", version: 1, page, frame }`. With
 * `libraryKeys` (docs/figma-contracts/library-keys.json) it also carries `library`, the keys of the sets, icons, styles
 * and variable collections it uses, so the plugin imports them from the published library in a file other than Zen's.
 */
export function figmaPackage(text, { mapping, nestedLayers = {}, page = {}, newId, libraryKeys, pages } = {}) {
  const { frame, notes, images } = figmaFromPage(text, { mapping, nestedLayers, newId, pages, pageId: page.id });
  if (!frame) return { pkg: null, notes, images: [] };
  // A frame with nothing in it would import as an empty frame: say why instead.
  if (!frame.children?.length) return { pkg: null, notes: [`nothing on the page has a place in Figma${notes.length ? ` (${notes.join("; ")})` : ""}`], images: [] };
  // `images`: picture source → base64 bytes, which the caller fills (the Studio reads its uploads and the dev server's
  // files; the CLI reads repo files): a picture left null keeps the component's own.
  const pkg = { format: "zen-studio-figma", version: 1, page: { id: page.id ?? null, title: page.title ?? frame.name }, frame, images: Object.fromEntries(images.map((src) => [src, null])) };
  if (libraryKeys) pkg.library = libraryKeysFor(pkg, libraryKeys);
  return { pkg, notes, images };
}
