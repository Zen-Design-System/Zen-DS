// Figma's AppShell placeholders (◇ Master-Layout section 16254:1057, read 2026-10-26). User 2026-10-26: "Cần phân biệt
// rõ AppShell và Layout Example … AppShell nên là dạng placeholder giống component trong trang ◇ Master-Layout". An
// AppShell is a frame to design on, drawn with Figma's own placeholder content: "Label" rows, the Master › Child trail,
// "Heading Text" with Secondary · Main Action, an Empty State in Content and "Replace Component Here" in every pane. Real
// apps are the Layout examples (◇ Master-Layout · Example, the App Shell page's examples). No imports, so the Studio
// client, the page dialect, the Main component frame and the docs playground all take it.

const quote = (value) => JSON.stringify(String(value));
/** Indents every line after the first, so a multi-line part sits under the prop that holds it. */
const nest = (code, by = "  ") => code.split("\n").map((line, index) => (index === 0 ? line : by + line)).join("\n");
/** `<Tag` and its props (one per line once any is multi-line or the line gets long), then `/>`, or its children: on the
 *  same line when short, else indented between the tags. */
function element(tag, props, children = null) {
  const list = props.filter(Boolean);
  const multi = list.some((entry) => entry.includes("\n")) || list.join(" ").length > 120;
  const open = !list.length ? `<${tag}` : multi ? `<${tag}\n${list.map((entry) => `  ${nest(entry)}`).join("\n")}` : `<${tag} ${list.join(" ")}`;
  if (children === null) return `${open}${multi ? "\n" : " "}/>`;
  if (!multi && !children.includes("\n") && open.length + children.length < 110) return `${open}>${children}</${tag}>`;
  return `${open}${multi ? "\n" : ""}>\n  ${nest(children)}\n</${tag}>`;
}
const attr = (name, code) => `${name}={${code}}`;
const text = (name, value) => `${name}=${quote(value)}`;
const fragment = (items) => (items.length === 1 ? items[0] : `<>\n  ${items.map((item) => nest(item)).join("\n  ")}\n</>`);

/** Figma's placeholder copy, word for word (the account name and banner line are ours: Figma shows neither). */
export const APPSHELL_COPY = {
  label: "Label",
  workspace: "Đìzai Studio",
  master: "Master",
  child: "Child",
  heading: "Heading Text",
  secondary: "Secondary",
  mainAction: "Main Action",
  emptyTitle: "Empty State Title",
  emptyCaption: "Dummy caption for empty state here.",
  block: "Replace Component Here",
  paneTitle: "Title",
  stepTitle: "Step Title",
  stepCaption: "Optional",
  saveExit: "Save & exit",
  search: "Search",
  mobileHeading: "Heading",
  hero: "Hero",
  backdrop: "Photo, video or map",
  button: "Button",
  account: "User Name",
  banner: "Dummy caption for the banner here.",
};

/** Figma's placeholder pictures, as attribute values: the workspace mark and the account photo (`zen-media:` keys of
 *  builder/library/media.ts; the docs playground passes `{logo}` / `{photo}`). */
export const APPSHELL_MEDIA = { logo: quote("zen-media:tpl.hr.workspace-logo.png"), account: quote("zen-media:tpl.hr.account-photo.jpg") };

/** Pattern/AppShell/Desktop (16258:1857): Figma's nine variants, Layout × Collapse, in its order. */
export const APPSHELL_DESKTOP_VARIANTS = [
  { name: "Layout=Sidebar, Collapse=Header", pattern: "sidebar", collapse: "header" },
  { name: "Layout=Sidebar, Collapse=Sidebar", pattern: "sidebar", collapse: "sidebar" },
  { name: "Layout=List-Detail, Collapse=Header", pattern: "list-detail", collapse: "header" },
  { name: "Layout=List-Detail, Collapse=Sidebar", pattern: "list-detail", collapse: "sidebar" },
  { name: "Layout=Top-Bar, Collapse=None", pattern: "top-bar", collapse: "none" },
  { name: "Layout=Workspace, Collapse=None", pattern: "workspace", collapse: "none" },
  { name: "Layout=Docs, Collapse=None", pattern: "docs", collapse: "none" },
  { name: "Layout=Focus, Collapse=None", pattern: "focus", collapse: "none" },
  { name: "Layout=Grid, Collapse=Header", pattern: "grid", collapse: "header" },
];
const TOPS = [["bar", "Bar"], ["band", "Band"], ["band-sheet", "Band-Sheet"], ["media", "Media"]];
const BOTTOMS = [["tab-bar", "Tab-Bar"], ["floating", "Floating"], ["actions", "Actions"], ["none", "None"]];
/** Pattern/AppShell/Mobile (16261:136204): Figma's 32 variants, Device × Top × Bottom, in its order. */
export const APPSHELL_MOBILE_VARIANTS = [["phone", "Phone"], ["tablet", "Tablet"]].flatMap(([device, deviceName]) => TOPS.flatMap(([top, topName]) => BOTTOMS.map(([bottom, bottomName]) => ({
  name: `Device=${deviceName}, Top=${topName}, Bottom=${bottomName}`, device, top, bottom,
}))));

const SIDEBAR_PATTERNS = new Set(["sidebar", "list-detail", "grid"]);

/**
 * The code of each placeholder part. `act(label)` turns a label expression (`"Main Action"`, `item.label`) into the call
 * an action makes (Assets items: a toast), or gives null for no handler (a Screen you design on, the Main component).
 * `media` holds the pictures' attribute values.
 */
export function appShellParts({ act = () => null, media = APPSHELL_MEDIA } = {}) {
  const C = APPSHELL_COPY;
  const call = (label) => act(quote(label));
  const on = (name, label) => (call(label) ? attr(name, `() => ${call(label)}`) : null);
  /** An action object's handler (`, onClick: …`), or nothing. */
  const press = (label) => (call(label) ? `, onClick: () => ${call(label)}` : "");
  const button = (level, label) => element("Button", [text("level", level), on("onClick", label)], label);
  const iconButton = (props, label) => element("IconButton", [...props, text("aria-label", label), on("onClick", label)]);
  /** .Primitives/AppShell/Placeholder: a dashed Pale box naming what goes there; it fills its slot (a pane) or, given a
   *  height, keeps it (the Hero is 160 high in Figma). */
  const block = (label = C.block, height) => element("Stack", ['surface="pale"', 'border="subtle"', 'borderStyle="dashed"', 'radius="lg"', 'padding="md"', 'align="center"', 'justify="center"', height === undefined ? 'height="fill"' : `height={${height}}`], `<Text textStyle="Heading/4" tone="light" align="center">${label}</Text>`);
  const footerItems = [["settings", "Settings", "icon-settings-01-line"], ["help-center", "Help center", "icon-help-circle-line"], ["feedback", "Feedback", "icon-message-chat-circle-line"]];
  const logo = element("Stack", ['direction="row"', 'gap="xs"', 'align="center"'], [
    element("Avatar", ['size="small"', 'shape="square"', 'theme="photo"', `src=${media.logo}`, 'alt=""']),
    `<Text as="span" textStyle="Body/Base/Bold">${C.workspace}</Text>`,
    `<Icon name="icon-chevron-down-line" decorative />`,
  ].join("\n"));
  const mark = element("Avatar", ['size="small"', 'shape="square"', 'theme="photo"', `src=${media.logo}`, text("alt", C.workspace)]);
  const plus = (label) => `{ icon: "icon-plus-line", label: ${quote(label)}${press(label)} }`;
  return {
    block,
    logo,
    /** Patterns/Sidebar: the workspace switcher and six "Label" rows, the first selected; `footer`: how many of Settings ·
     *  Help center · Feedback (Figma: three with Collapse=Sidebar, one on List-Detail's rail, none otherwise). `brand:
     *  false` leaves the switcher out: on a page you make the brand is the page's own (figma-pull drops Figma's sample LOGO
     *  for the same reason), so only the component's own drawings (Main component, docs playground) show it. */
    sidebar: ({ footer = 0, brand = true } = {}) => element("Sidebar", [
      text("aria-label", "Main"), brand ? attr("logo", logo) : null, brand ? attr("logoCollapsed", mark) : null, 'selectedId="label-1"',
      act("item.label") ? attr("onItemClick", `(item) => ${act("item.label")}`) : null,
      footer ? attr("footer", fragment(footerItems.slice(0, footer).map(([id, label, icon]) => `<SidebarMenuItem id="${id}" label="${label}" icon="${icon}" />`))) : null,
    ], Array.from({ length: 6 }, (_, index) => `<SidebarMenuItem id="label-${index + 1}" label=${quote(C.label)} icon="icon-home-03-line" />`).join("\n")),
    /** Breadcrumbs Size=Small: Master › Child (the last crumb is the page). */
    crumbs: element("Breadcrumbs", [
      "master={false}", attr("items", `[{ id: "master", label: ${quote(C.master)} }, { id: "child", label: ${quote(C.child)} }]`),
      act("item.label") ? attr("onNavigate", `(item, event) => { event.preventDefault(); ${act("item.label")}; }`) : null,
    ]),
    /** The top row's end: the bell (Noti-type=Dot showing 8) and the account photo. */
    actions: ({ notifications = "count" } = {}) => fragment([
      element("AppShellAction", ['icon="icon-bell-01-solid"', text("aria-label", "Notifications"), notifications === "count" ? "count={8}" : notifications === "dot" ? "dot" : null, on("onClick", "Notifications")]),
      element("AppShellAccount", [text("name", C.account), `src=${media.account}`, on("onClick", C.account)]),
    ]),
    /** Main-Element: "Heading Text" with Icon-Main Tertiary (settings) · Secondary · Main Action. */
    main: element("PageHeader", [text("title", C.heading), attr("actions", fragment([
      iconButton(['level="tertiary"', 'icon="icon-settings-01-line"'], "Settings"),
      button("tertiary", C.secondary),
      button("primary", C.mainAction),
    ]))]),
    /** Top-Bar's navigation: Tab-Bar Style=Subtle with two "Label" tabs. */
    tabs: element("Tabs", ['variant="subtle"', text("aria-label", "Sections"), 'value="label-1"', attr("items", `[{ id: "label-1", label: ${quote(C.label)} }, { id: "label-2", label: ${quote(C.label)} }]`), act("id") ? attr("onValueChange", `(id) => ${act("id")}`) : null]),
    search: element("Search", [text("aria-label", C.search), text("placeholder", C.search)]),
    /** Focus: Help and Save & exit. */
    focusActions: fragment([iconButton(['level="tertiary"', 'icon="icon-help-circle-line"'], "Help"), button("tertiary", C.saveExit)]),
    /** Content: Empty-State Size=Medium (Small under a band sheet or a backdrop) with its placeholder illustration. */
    body: ({ size = "md" } = {}) => element("EmptyState", [text("title", C.emptyTitle), "headingLevel={2}", size === "sm" ? 'size="sm"' : null], C.emptyCaption),
    /** .Primitives/AppShell/Pane: its title, the ⋮ action (none on Docs' "On this page") and the placeholder, filling the
     *  pane or `height` high (Focus' Summary: 408 in a 480 pane). */
    pane: ({ title = C.paneTitle, theme, surface, action = true, height } = {}) => element("AppShellPane", [
      text("title", title), theme ? text("theme", theme) : null, surface && surface !== "default" ? text("surface", surface) : null,
      action ? attr("action", iconButton(['appearance="flat"', 'level="secondary"', 'size="sm"', 'icon="icon-dots-vertical-line"'], `${title} options`)) : null,
    ], block(C.block, height)),
    /** Focus' Stepper-Bar: three "Step Title" steps, "Optional" under each, the first current. */
    progress: element("Stepper", ['aria-label="Steps"', "current={0}", attr("steps", `[\n${[1, 2, 3].map((index) => `  { id: "step-${index}", title: ${quote(C.stepTitle)}, caption: ${quote(C.stepCaption)} },`).join("\n")}\n]`)]),
    /** Floating-Item: Button/Icon-Main Accent with the Zen mark. */
    floatingActions: iconButton(['level="accent"', 'icon="icon-zen"'], "Ask Zen AI"),
    banner: element("AlertBanner", ['theme="info"'], C.banner),
    sidePanel: element("SidePanel", ['type="standard"', 'size="small"', text("title", C.paneTitle), "open"], block()),
    /** Top-Navigation/Mobile: + at both ends and beside the large title, "Heading" in the bar and as the h1. Band-Sheet
     *  has no bar (the h1 alone); Media no titles (the backdrop is the top of the page). */
    topNavigation: ({ top = "bar" } = {}) => {
      if (top === "media") return element("TopNavigation", [text("aria-label", C.mobileHeading), "topBar", attr("leading", plus("Add")), attr("trailing", `[${plus("New")}]`)]);
      if (top === "band-sheet") return element("TopNavigation", [text("largeTitle", C.mobileHeading), attr("largeTitleAction", plus("Create"))]);
      return element("TopNavigation", [text("title", C.mobileHeading), text("largeTitle", C.mobileHeading), attr("leading", plus("Add")), attr("trailing", `[${plus("New")}]`), attr("largeTitleAction", plus("Create"))]);
    },
    hero: block(C.hero, 160),
    backdrop: block(C.backdrop),
    /** Bottom-Navigation: four "Label" tabs (icons only), the Floating-Glass one with its + action. */
    bottomNavigation: ({ bottom = "tab-bar" } = {}) => element("BottomNavigation", [
      bottom === "floating" ? 'type="floating-glass"' : null, text("aria-label", "Main"), 'value="label-1"',
      act("id") ? attr("onValueChange", `(id) => ${act("id")}`) : null,
      attr("items", `[\n${[1, 2, 3, 4].map((index) => `  { id: "label-${index}", label: ${quote(C.label)}, icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },`).join("\n")}\n]`),
      bottom === "floating" ? attr("action", plus("Add")) : null,
    ]),
    /** Action-Bar/Mobile Type=Default: two "Button"s, Tertiary · Primary. */
    actionBar: element("ActionBar", ['direction="horizontal"', attr("secondaryAction", `{ label: ${quote(C.button)}${press(C.button)} }`), attr("primaryAction", `{ label: ${quote(C.button)}${press(C.button)} }`)]),
  };
}

/**
 * One AppShell with Figma's placeholders: the parts of a Pattern/AppShell/Desktop variant (`pattern`, `collapse`; none with
 * `desktop: false`, a phone-only shell) and, with `mobile`, those of a Pattern/AppShell/Mobile variant (`top`, `bottom`).
 * The shell picks its layout from its own width (AppShell `layout="auto"`), so a 390 cell draws the phone parts.
 * `brand: false`: the Sidebar without Figma's sample workspace switcher (a page's own AppShell).
 */
export function appShellPlaceholderCode({ pattern = "sidebar", collapse, desktop = true, mobile = null, brand = true, act, media } = {}) {
  const P = appShellParts({ act, media });
  const props = [];
  if (desktop && pattern !== "sidebar") props.push(text("pattern", pattern));
  if (desktop && SIDEBAR_PATTERNS.has(pattern) && collapse && collapse !== "header") props.push(text("collapse", collapse));
  if (desktop) {
    const header = (parts) => element("AppShellHeader", parts.map(([name, code]) => attr(name, code)));
    const floating = `// zen-allow-accent: Figma's Floating-Item is the promoted action (Button/Icon-Main Accent).\n${attr("floatingActions", P.floatingActions)}`;
    if (SIDEBAR_PATTERNS.has(pattern)) {
      props.push(attr("sidebar", P.sidebar({ footer: pattern === "list-detail" ? 1 : collapse === "sidebar" ? 3 : 0, brand })));
      props.push(attr("header", header([["leading", P.crumbs], ["actions", P.actions()], ["main", P.main]])));
      if (pattern === "list-detail") props.push(attr("leadingPane", P.pane()));
      props.push(floating);
    } else if (pattern === "top-bar") {
      props.push(attr("header", header([["leading", fragment([P.logo, P.tabs])], ["actions", P.actions()], ["main", P.main]])));
      props.push(floating);
    } else if (pattern === "workspace") {
      props.push(attr("header", header([["leading", P.logo], ["actions", P.actions()]])));
      props.push(attr("leadingPane", P.pane({ title: "Layers" })), attr("trailingPane", P.pane({ title: "Inspector" })));
    } else if (pattern === "docs") {
      props.push(attr("header", header([["leading", P.logo], ["center", P.search], ["actions", P.actions()], ["main", P.main]])));
      props.push(attr("leadingPane", P.pane({ theme: "canvas" })), attr("trailingPane", P.pane({ title: "On this page", theme: "canvas", action: false })));
    } else if (pattern === "focus") {
      props.push(attr("header", header([["leading", P.logo], ["actions", P.focusActions]])));
      props.push(attr("progress", P.progress), attr("trailingPane", P.pane({ title: "Summary", height: 408 })));
    }
  }
  if (mobile) {
    const { top = "bar", bottom = "tab-bar" } = mobile;
    if (top !== "bar") props.push(text("mobileTop", top));
    props.push(attr("topNavigation", P.topNavigation({ top })));
    if (top === "band" || top === "band-sheet") props.push(attr("hero", P.hero));
    if (top === "media") props.push(attr("backdrop", P.backdrop));
    if (bottom === "tab-bar" || bottom === "floating") props.push(attr("bottomNavigation", P.bottomNavigation({ bottom })));
    if (bottom === "actions") props.push(attr("actionBar", P.actionBar));
  }
  // Figma's phone Content under a band sheet or a backdrop is Empty-State Size=Small.
  const small = !desktop && (mobile?.top === "band-sheet" || mobile?.top === "media");
  return element("AppShell", props, P.body({ size: small ? "sm" : "md" }));
}

/** The Zen components a placeholder's code names (an Assets item's `components`, an import line). */
export const componentsOf = (code) => [...new Set([...code.matchAll(/<([A-Z][A-Za-z]+)/g)].map((match) => match[1]))].sort();
