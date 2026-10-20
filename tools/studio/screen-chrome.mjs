// A builder Screen's app frame (user, 2026-10-09): what dialect.mjs writes into a new page and the Inspector's Screen
// section switches on and off. No imports, so the Studio client takes it without the page parser.

const quote = (value) => JSON.stringify(String(value));

/** A tablet Screen is laid out as a phone's (mobile) or a desktop's; a phone is mobile and a desktop desktop. */
export const SCREEN_LAYOUTS = ["mobile", "desktop"];
/**
 * A Screen's app frame (user, 2026-10-09: a blank page comes with it, each part switched on or off as you build): the
 * desktop layout shows `sidebar` and `header` (a Page Header), the mobile layout `topNavigation` and `bottomNavigation`.
 * Each is a prop of <Screen> holding its component; a Screen keeps both sets, so changing its device keeps your edits.
 */
export const SCREEN_CHROME = [
  { prop: "sidebar", layout: "desktop", label: "Sidebar", component: "Sidebar" },
  { prop: "header", layout: "desktop", label: "Page header", component: "PageHeader" },
  { prop: "topNavigation", layout: "mobile", label: "Top navigation", component: "TopNavigation" },
  { prop: "bottomNavigation", layout: "mobile", label: "Bottom navigation", component: "BottomNavigation" },
];

/** The layout a Screen shows: a phone is mobile, a desktop desktop, a tablet its `layout` (mobile by default). */
export function screenLayout(device, layout) {
  if (device === "phone") return "mobile";
  if (device === "tablet") return layout === "desktop" ? "desktop" : "mobile";
  return "desktop";
}

/** The component a Screen's chrome prop starts with (`title`: the page's). Static: a page keeps no state. */
export function screenChromeCode(prop, title) {
  const name = quote(String(title ?? "Untitled").replace(/[{}<>]/g, ""));
  if (prop === "header") return `<PageHeader title=${name} />`;
  if (prop === "topNavigation") return `<TopNavigation type="compact" title=${name} />`;
  if (prop === "sidebar") {
    // The rows are Body-Content children (Figma Menu-Item instances in the slot), so each is a layer to select, swap,
    // remove or add to in the Slots section.
    return [
      `<Sidebar aria-label="Main" selectedId="home">`,
      `  <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
      `  <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
      `  <SidebarMenuItem id="people" label="People" icon="icon-users-line" />`,
      `</Sidebar>`,
    ].join("\n");
  }
  if (prop === "bottomNavigation") {
    return [
      `<BottomNavigation value="home" items={[`,
      `  { id: "home", label: "Home", icon: "icon-home-03-line" },`,
      `  { id: "projects", label: "Projects", icon: "icon-folder-line" },`,
      `  { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" },`,
      `  { id: "profile", label: "Profile", icon: "icon-user-circle-line" },`,
      `]} />`,
    ].join("\n");
  }
  throw new Error(`${prop} is not a Screen chrome prop (${SCREEN_CHROME.map((part) => part.prop).join(", ")})`);
}

/**
 * The desktop layout's master layout (user, 2026-10-15; screen-frame.mjs): one <AppShell> at the Screen's root, Figma's
 * AppShell patterns (◇ Master-Layout 16254:1057; the AppShell rebuilt on them 2026-10-19). The parts the Screen section
 * switches, each with the code it starts with: an AppShell prop (`host` "shell") or a prop of the AppShellHeader in the
 * AppShell's `header` (`host` "header": the header's top row and its Main row).
 */
export const FRAME_PARTS = [
  { prop: "banner", host: "shell", label: "Banner", component: "AlertBanner" },
  { prop: "sidebar", host: "shell", label: "Sidebar", component: "Sidebar" },
  { prop: "leading", host: "header", label: "Top bar", component: "Search" },
  // Figma Center-Slots (up to 400px): a Search in the middle of the top row (user, 2026-10-16).
  { prop: "center", host: "header", label: "Top bar center", component: "Search" },
  { prop: "actions", host: "header", label: "Top bar actions", component: "AppShellAccount" },
  { prop: "main", host: "header", label: "Page header", component: "PageHeader" },
  { prop: "sidePanel", host: "shell", label: "Side panel", component: "SidePanel" },
  { prop: "floatingActions", host: "shell", label: "Floating action", component: "IconButton" },
];

/** Every AppShell prop that draws part of the frame: an AppShell without any of them is no frame (it unwraps). */
export const FRAME_PROPS = new Set(["banner", "sidebar", "header", "leadingPane", "trailingPane", "progress", "sidePanel", "floatingActions"]);
/** The AppShellHeader props that draw part of the header: a header without any of them goes with its last one. */
export const HEADER_PROPS = new Set(["leading", "center", "actions", "main", "sections"]);

/** The component a frame part starts with (`title`: the page's). */
export function screenFrameCode(prop, title) {
  const name = quote(String(title ?? "Untitled").replace(/[{}<>]/g, ""));
  switch (prop) {
    case "sidebar": return screenChromeCode("sidebar", title);
    case "leading": return `<Search aria-label="Search" placeholder="Search" />`;
    case "center": return `<Search aria-label="Search" placeholder="Search" />`;
    case "banner": return `<AlertBanner theme="info">Your trial ends in 7 days.</AlertBanner>`;
    case "actions": return `<AppShellAccount name="Khoa Dang" />`;
    case "main": return `<PageHeader title=${name} />`;
    case "sidePanel": return [`<SidePanel type="standard" title="Details" open>`, `  <Text tone="base">Details of the selected item.</Text>`, `</SidePanel>`].join("\n");
    case "floatingActions": return `<IconButton level="accent" icon="icon-plus-line" aria-label="New" />`;
    default: throw new Error(`${prop} is not a frame part (${FRAME_PARTS.map((part) => part.prop).join(", ")})`);
  }
}

/** The AppShell's `header` holding `parts` ([prop, code] of AppShellHeader props). */
export function screenHeaderCode(parts) {
  if (!parts.length) return "<AppShellHeader />";
  return ["<AppShellHeader", ...parts.map(([prop, code]) => `  ${prop}={${code.split("\n").join("\n  ")}}`), "/>"].join("\n");
}

/** Whether a page may hold the old frame props (cheap; migrateScreenFrame then reads the Screens themselves). */
export const LEGACY_FRAME = /<Screen\b[\s\S]*\b(?:sidebar|header)=\{/;
