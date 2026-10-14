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
