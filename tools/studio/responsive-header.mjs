// A builder Screen's phone header drawn from its desktop one (user, 2026-10-16: "thanh header không có pattern đổi từ
// desktop qua top nav của Mobile một cách thông minh"; rules docs/component-usage-rules.md §17, spec
// docs/research/responsive-header-spec-2026-10-16.md P4). Pure functions over the page dialect (dialect.mjs parsePage),
// isomorphic (browser and Node).
//
//   derivePhoneChrome(screen, { mock }) → { kind, topNavigation, bottomNavigation, notes }   dialect nodes (or null)
//   phoneChromeCode(screen, { mock })   → { topNavigation, bottomNavigation }                  their JSX (or null)
//   planPhoneSync(before, after)        → [{ loc, ops }]   the Screen edits that keep linked phone parts on the desktop's
//
// A Screen's phone parts (its `topNavigation` / `bottomNavigation`) are linked to its desktop AppShell while they are in
// its Studio-only `phoneLinked` list: an edit of the desktop header redraws them; an edit of a part itself makes it the
// person's own (it leaves the list); Reset to desktop puts it back. A Screen without `phoneLinked` has not been decided:
// its parts that are missing or still the starting code (screen-chrome.mjs) get linked.
import { parsePage } from "./dialect.mjs";
import { elementText } from "./doc.mjs";
import { screenChromeCode } from "./screen-chrome.mjs";

export const PHONE_LINKED_PROP = "phoneLinked";
export const PHONE_PARTS = ["topNavigation", "bottomNavigation"];
/** Trailing places of a TopNavigation (Figma Trailing-Slot holds 3). */
const TRAILING_PLACES = 3;
/** Destinations a BottomNavigation takes one to one; more → the first 4 + More. */
const BOTTOM_ROOTS = 5;

/* ── reading the desktop header ─────────────────────────────────────────────────────────────────────────────────── */

const literalOf = (node, name) => (node?.props[name]?.kind === "literal" ? node.props[name].value : undefined);
const read = (value, path) => path.reduce((at, step) => (at == null ? undefined : at[step]), value);

/** A Value as plain data (literals, lists, objects, mock fields), or undefined (an element, a handler). */
function plain(value, scope) {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "array") return value.items.map((item) => plain(item, scope));
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([key, field]) => [key, plain(field, scope)]));
  if (value.kind === "ref") return read(scope[value.root], value.path);
  return undefined;
}

/** The elements a prop holds: one, a fragment's, or a row Stack's (pages written before 2026-10-16). */
function elementsIn(value) {
  if (!value) return [];
  const list = value.kind === "element" ? [value.node] : value.kind === "fragment" ? value.children.filter((child) => child.kind === "element") : [];
  return list.flatMap((node) => (node.name === "Stack" && literalOf(node, "direction") === "row" && Object.keys(node.props).every((name) => ["direction", "gap", "align", "justify", "wrap"].includes(name)) ? node.children.filter((child) => child.kind === "element") : [node]));
}

/** A node's words (its text children, deep). */
const textOf = (node, scope) => node.children.map((child) => (child.kind === "text" ? child.value : child.kind === "ref" ? String(read(scope[child.root], child.path) ?? "") : child.kind === "element" ? textOf(child, scope) : "")).join("").trim();

/** The first element named `name` in `children`, depth first (props skipped: a Dialog's own header is not the page's). */
function firstNamed(children, name) {
  for (const child of children) {
    if (child.kind !== "element") continue;
    if (child.name === name) return child;
    const inner = firstNamed(child.children, name);
    if (inner) return inner;
  }
  return null;
}

/** The Screen's root AppShell (its only element child), or null. */
function rootShell(screen) {
  const kids = screen.children.filter((child) => !(child.kind === "text" && !child.value.trim()));
  return kids.length === 1 && kids[0].kind === "element" && kids[0].name === "AppShell" ? kids[0] : null;
}

/** The Sidebar's top-level rows in order (group titles and sub-rows skipped): { id, label, icon, dot, onClick } (onClick:
 *  a row's own handler, as the page writes it). */
function sidebarRows(sidebar, scope) {
  if (!sidebar) return [];
  const rows = [];
  const add = (item, onClick) => { if (item && typeof item.id === "string" && typeof item.label === "string") rows.push({ id: item.id, label: item.label, icon: typeof item.icon === "string" ? item.icon : "icon-circle-line", dot: Boolean(item.counter) || item.dot === true, onClick }); };
  // Data: sections={[{ label, items: [{ id, label, icon, counter }] }]} or items={[…]}.
  const sections = plain(sidebar.props.sections, scope);
  if (Array.isArray(sections)) for (const section of sections) for (const item of section?.items ?? []) add(item);
  const items = plain(sidebar.props.items, scope);
  if (Array.isArray(items)) items.forEach(add);
  // Rows written as children: SidebarMenuItem, in SidebarMenuSection too, or a list of them over the mock.
  const visit = (children, at) => {
    for (const child of children) {
      if (child.kind === "map" && child.node.name === "SidebarMenuItem") {
        const list = read(at[child.source.root], child.source.path);
        if (Array.isArray(list)) for (const row of list) add(Object.fromEntries(Object.keys(child.node.props).map((name) => [name, plain(child.node.props[name], { ...at, [child.item]: row })])));
      } else if (child.kind === "element" && child.name === "SidebarMenuItem") add(Object.fromEntries(Object.keys(child.props).map((name) => [name, plain(child.props[name], at)])), child.props.onClick);
      else if (child.kind === "element" && child.name === "SidebarMenuSection") visit(child.children, at);
    }
  };
  visit(sidebar.children, scope);
  return rows;
}

/** Whether an icon action is the notifications one (it keeps its own trailing place, with its dot). */
const isNotifications = (icon, label) => /bell|inbox|notification/i.test(`${icon ?? ""} ${label ?? ""}`);

/** A per-item navigate / open's first argument (`proto.navigate({ home: "overview" })`), or null. */
const targetMap = (handler) => {
  const [first] = handler?.kind === "proto" && ["navigate", "open"].includes(handler.action) ? handler.args : [];
  return first && typeof first === "object" && !Array.isArray(first) ? first : null;
};

/** One item's handler from its list's: a per-item navigate / open narrowed to the item's own target (undefined: the item
 *  has none), any other handler as it is. */
function itemHandler(handler, id) {
  const targets = targetMap(handler);
  if (!targets) return handler;
  return typeof targets[id] === "string" ? { kind: "proto", action: handler.action, args: [targets[id], ...handler.args.slice(1)] } : undefined;
}

/** A desktop Menu's entries as a phone action's `menu` (an action sheet on a phone): each item keeps its own onSelect or
 *  takes the Menu's for it, groups too. Undefined when the Menu lists no items. */
function menuOf(menu) {
  const items = menu?.props.items;
  if (items?.kind !== "array") return undefined;
  const entries = (list) => list.map((entry) => {
    if (entry.kind !== "object") return entry;
    const type = literalOf({ props: entry.fields }, "type");
    if (type === "group" && entry.fields.items?.kind === "array") return obj({ ...entry.fields, items: { kind: "array", items: entries(entry.fields.items.items) } });
    const id = literalOf({ props: entry.fields }, "id");
    return type === "separator" || entry.fields.onSelect || typeof id !== "string" ? entry : obj({ ...entry.fields, onSelect: itemHandler(menu.props.onSelect, id) });
  });
  return { kind: "array", items: entries(items.items) };
}

/** A Menu item id from an action's label (the More sheet's rows). */
const itemId = (label, index) => label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `action-${index + 1}`;

/** The ⋯ More sheet's entries: an action as a row running its onClick, an action with a menu as a group of its rows. */
function moreMenu(folded) {
  const ids = new Set();
  return { kind: "array", items: folded.map((item, index) => {
    const { icon, label, onClick, menu } = item.entry.fields;
    if (menu) return obj({ type: lit("group"), label, items: menu });
    const id = ids.has(itemId(item.label, index)) ? `action-${index + 1}` : itemId(item.label, index);
    ids.add(id);
    return obj({ id: lit(id), label, icon, onSelect: onClick });
  }) };
}

/* ── writing the phone parts ────────────────────────────────────────────────────────────────────────────────────── */

const lit = (value) => ({ kind: "literal", value });
const obj = (fields) => ({ kind: "object", fields: Object.fromEntries(Object.entries(fields).filter(([, field]) => field !== undefined)) });
const el = (name, props, children = []) => ({ kind: "element", name, loc: "0:0", props: Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)), children });

/**
 * The phone's TopNavigation and BottomNavigation for a Screen, by §17: a root (no Back, Breadcrumbs of one crumb or
 * none) gets the large title, the account in leading and the BottomNavigation; a child (Breadcrumbs of two or more, or
 * a PageHeader `back`) gets Back, the bar title and no BottomNavigation. The top bar's Search becomes the Search control
 * bar (above the tabs), a root's folding into the Search action. Trailing: the Primary as "+", notifications, then More
 * for the rest (three places, the Search action taking one), its sheet running each folded action. The account keeps its
 * Menu and the tabs go where the Sidebar's rows go. Null parts when the Screen has no desktop AppShell.
 */
export function derivePhoneChrome(screen, { mock = {} } = {}) {
  const shell = rootShell(screen);
  if (!shell) return { kind: null, topNavigation: null, bottomNavigation: null, notes: ["no desktop AppShell to draw the phone header from"] };
  // An AppShell written for the phone (its own Top / Bottom Navigation: a mobile template, walk 2026-10-29 W-48) has its
  // phone parts already: they are the Screen's, as written (its title, Search control bar, tabs), not drawn from a
  // desktop header it does not have (that drew the page's title and dropped the Search and the tabs).
  const ownTop = elementsIn(shell.props.topNavigation).find((node) => node.name === "TopNavigation") ?? null;
  const ownBottom = elementsIn(shell.props.bottomNavigation).find((node) => node.name === "BottomNavigation") ?? null;
  if (ownTop || ownBottom) return { kind: "own", topNavigation: ownTop, bottomNavigation: ownBottom, notes: [] };
  const scope = { mock };
  const notes = [];
  // Header/AppShell: its top row (leading · center · actions) and its Main row (main, then sections).
  const appHeader = elementsIn(shell.props.header).find((node) => node.name === "AppShellHeader") ?? null;
  const header = elementsIn(appHeader?.props.leading);
  const center = elementsIn(appHeader?.props.center);
  const mainRows = [...elementsIn(appHeader?.props.main), ...elementsIn(appHeader?.props.sections)];
  const pageHeader = mainRows.find((node) => node.name === "PageHeader") ?? firstNamed(shell.children, "PageHeader");
  const crumbs = [...header, ...elementsIn(pageHeader?.props.breadcrumbs)].find((node) => node.name === "Breadcrumbs");
  const crumbCount = Array.isArray(plain(crumbs?.props.items, scope)) ? plain(crumbs.props.items, scope).length : 0;
  const child = crumbCount >= 2 || Boolean(pageHeader?.props.back);
  const titleValue = pageHeader?.props.title ?? screen.props.title ?? lit("Untitled");

  // The top bar's Search: the phone's Search control bar, doing what the desktop's does (its props, without the desktop's
  // keyboard shortcut and size). A root's folds into TopNavigation's own Search action as the large title scrolls away.
  const search = [...header, ...center].find((node) => node.name === "Search");
  const phoneSearch = search ? el("Search", Object.fromEntries(Object.entries(search.props).filter(([name]) => !["shortcut", "size"].includes(name))), search.children) : null;
  // Trailing candidates, by priority. A Menu's trigger becomes an action that opens the Menu's items (a sheet on a phone).
  const primary = [];
  const rest = [];
  for (const action of elementsIn(pageHeader?.props.actions)) {
    const menu = action.name === "Menu" ? menuOf(action) : undefined;
    const button = action.name === "Menu" ? elementsIn(action.props.trigger)[0] ?? null : action;
    if (button?.name === "Button") {
      const label = textOf(button, scope) || "Action";
      const entry = obj({ icon: lit(literalOf(button, "level") === "primary" ? "icon-plus-line" : typeof literalOf(button, "startIcon") === "string" ? literalOf(button, "startIcon") : "icon-dots-horizontal-line"), label: lit(label), onClick: button.props.onClick, menu });
      (literalOf(button, "level") === "primary" ? primary : rest).push({ entry, label, dot: false });
    } else if (button?.name === "IconButton") rest.push({ entry: obj({ icon: button.props.icon ?? lit("icon-dots-horizontal-line"), label: button.props["aria-label"] ?? lit("More"), onClick: button.props.onClick, menu }), label: String(literalOf(button, "aria-label") ?? "More"), dot: false });
    else rest.push({ entry: null, label: action.name, dot: false });
  }
  let account = null;
  let notifications = null;
  for (const action of elementsIn(appHeader?.props.actions)) {
    const menu = action.name === "Menu" ? action : null;
    const trigger = menu ? elementsIn(action.props.trigger)[0] ?? null : action;
    if (!trigger) continue;
    if (trigger.name === "AppShellAccount" || trigger.name === "Avatar") { account = account ?? { trigger, menu }; continue; }
    if (trigger.name === "AppShellAction" || trigger.name === "IconButton") {
      const label = String(literalOf(trigger, "aria-label") ?? "Action");
      const dot = Boolean(literalOf(trigger, "count")) || literalOf(trigger, "dot") === true || trigger.props.count?.kind === "ref";
      const entry = obj({ icon: trigger.props.icon ?? lit("icon-dots-horizontal-line"), label: lit(label), dot: dot ? lit(true) : undefined, onClick: trigger.props.onClick, menu: menuOf(menu) });
      if (!child && !notifications && isNotifications(literalOf(trigger, "icon"), label)) notifications = { entry, label, dot };
      else if (!child) rest.push({ entry, label, dot });
      continue;
    }
    if (trigger.name === "Badge") notes.push(`the ${textOf(trigger, scope) || "plan"} Badge stays on desktop (the account sheet's on a phone)`);
  }
  // A root's Search action takes a trailing place once its Search folds (rule 1): two places stay for the rest.
  const searchAction = phoneSearch && !child;
  const placesLeft = TRAILING_PLACES - (searchAction ? 1 : 0);
  const places = [
    // A child screen's Primary goes to its footer (R15); a root's is "+".
    ...(child ? [] : primary),
    ...(notifications ? [notifications] : []),
  ];
  if (child && primary.length) notes.push(`${primary.map((item) => item.label).join(", ")} belongs in the screen's ActionBar footer on a phone`);
  const more = rest.filter((item) => item.entry);
  let trailing = [...places, ...more];
  if (trailing.length > placesLeft) {
    const kept = trailing.slice(0, placesLeft - 1);
    const folded = trailing.slice(placesLeft - 1);
    trailing = [...kept, { entry: obj({ icon: lit("icon-dots-horizontal-line"), label: lit("More"), dot: folded.some((item) => item.dot) ? lit(true) : undefined, menu: moreMenu(folded) }), label: "More", dot: false }];
    notes.push(`${folded.map((item) => item.label).join(", ")} go into More`);
  }
  const tabs = elementsIn(pageHeader?.props.tabs).find((node) => node.name === "Tabs");
  // The control bar: the Search above the tabs (Figma Control-Bar's Search and Controls, a column 8 apart).
  const controls = [phoneSearch, tabs].filter(Boolean);
  // The account keeps its menu (the account sheet on a phone).
  const avatar = account ? el("AppShellAccount", Object.fromEntries(["name", "src", "theme", ...(account.menu ? [] : ["onClick"])].filter((name) => account.trigger.props[name]).map((name) => [name, account.trigger.props[name]]))) : null;
  const accountNode = avatar && account.menu ? el("Menu", { ...Object.fromEntries(Object.entries(account.menu.props).filter(([name]) => !["trigger", "align"].includes(name))), trigger: { kind: "element", node: avatar } }, account.menu.children) : avatar;
  const topNavigation = el("TopNavigation", {
    type: lit(child ? "compact-alt" : "alt"),
    title: titleValue,
    largeTitle: child ? undefined : titleValue,
    leading: child ? obj({ icon: lit("icon-chevron-left-line-medium"), label: lit("Back"), onClick: { kind: "proto", action: "back", args: [] } })
      : accountNode ? { kind: "element", node: accountNode } : undefined,
    trailing: trailing.length ? { kind: "array", items: trailing.map((item) => item.entry) } : undefined,
    controlBar: controls.length > 1 ? { kind: "element", node: el("Stack", { gap: lit("xs") }, controls) } : controls.length ? { kind: "element", node: controls[0] } : undefined,
    searchAction: searchAction ? obj({ label: search.props["aria-label"] ?? lit("Search") }) : undefined,
  });

  // The roots: a child screen shows none (R14).
  const sidebar = elementsIn(shell.props.sidebar).find((node) => node.name === "Sidebar");
  const rows = sidebarRows(sidebar, scope);
  let bottomNavigation = null;
  if (!child && rows.length >= 2) {
    const shown = rows.length > BOTTOM_ROOTS ? [...rows.slice(0, BOTTOM_ROOTS - 1), { id: "more", label: "More", icon: "icon-dots-horizontal-line", dot: rows.slice(BOTTOM_ROOTS - 1).some((row) => row.dot) }] : rows;
    const selected = literalOf(sidebar, "selectedId");
    const value = shown.some((row) => row.id === selected) ? selected : rows.length > BOTTOM_ROOTS && rows.some((row) => row.id === selected) ? "more" : shown[0].id;
    // A tab goes where its Sidebar row goes: the Sidebar's onItemClick (a per-item navigate keyed by the same ids), else
    // the rows' own navigates as one per-item navigate.
    const rowTargets = Object.fromEntries(rows.map((row) => [row.id, row.onClick?.kind === "proto" && row.onClick.action === "navigate" && typeof row.onClick.args[0] === "string" ? row.onClick.args[0] : null]).filter(([, target]) => target));
    const onValueChange = sidebar.props.onItemClick ?? (Object.keys(rowTargets).length ? { kind: "proto", action: "navigate", args: [rowTargets] } : undefined);
    bottomNavigation = el("BottomNavigation", {
      value: lit(value),
      onValueChange,
      showLabels: lit(true),
      items: { kind: "array", items: shown.map((row) => obj({ id: lit(row.id), label: lit(row.label), icon: lit(row.icon), dot: row.dot ? lit(true) : undefined })) },
    });
    if (rows.length > BOTTOM_ROOTS) notes.push(`${rows.slice(BOTTOM_ROOTS - 1).map((row) => row.label).join(", ")} go into More`);
  }
  return { kind: child ? "child" : "root", topNavigation, bottomNavigation, notes };
}

/** The phone parts as JSX (null: none). */
export function phoneChromeCode(screen, options) {
  const derived = derivePhoneChrome(screen, options);
  return { kind: derived.kind, topNavigation: derived.topNavigation ? elementText(derived.topNavigation) : null, bottomNavigation: derived.bottomNavigation ? elementText(derived.bottomNavigation) : null, notes: derived.notes };
}

/* ── keeping linked parts in step ───────────────────────────────────────────────────────────────────────────────── */

const partCode = (screen, prop) => (screen?.props[prop]?.kind === "element" ? elementText(screen.props[prop].node) : null);
const linkedOf = (screen) => {
  const value = screen.props[PHONE_LINKED_PROP];
  if (!value) return null;
  const list = value.kind === "array" ? value.items.map((item) => (item.kind === "literal" ? item.value : null)) : value.kind === "literal" && Array.isArray(value.value) ? value.value : [];
  return list.filter((name) => PHONE_PARTS.includes(name));
};
const screensOf = (tree) => (tree?.board?.children ?? []).filter((child) => child.kind === "element" && child.name === "Screen");
/** The Zen components a page imports, and the ones a part's code draws (its tags). */
const importedOf = (text) => new Set([...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@zen-ds\/react["']/g)].flatMap((match) => match[1].split(",").map((name) => name.trim().split(/\s+as\s+/).pop()).filter(Boolean)));
const tagsOf = (code) => [...code.matchAll(/<([A-Z][\w.]*)/g)].map((match) => match[1].split(".")[0]);
const idOf = (screen) => `${literalOf(screen, "id") ?? ""}|${literalOf(screen, "state") ?? ""}`;

/** The starting code of a phone part (screen-chrome.mjs), as the page would print it. */
function seedCode(prop, title) {
  const page = parsePage(`import { Board, Screen } from "@zen-ds/react/builder";\nimport { BottomNavigation, TopNavigation } from "@zen-ds/react";\nexport const mock = {};\nexport default function Page() { return (<Board><Screen id="s" ${prop}={${screenChromeCode(prop, title)}} /></Board>); }\n`);
  return partCode(page.board?.children[0], prop);
}

/**
 * The edits that keep each Screen's linked phone parts on its desktop header after an edit (`before` → `after`, page
 * texts): a part the edit changed itself leaves the linked list (the person's own now); a linked part whose desktop
 * changed is redrawn; a Screen not decided yet (no `phoneLinked`) with a desktop AppShell links the parts that are
 * missing or still the starting code. `before` null: the page as it opens. Each entry is one Screen's request.
 */
export function planPhoneSync(before, after, { components } = {}) {
  // Only a Screen with a desktop AppShell has phone parts to draw (most edits: a quick no).
  if (!/<AppShell\b/.test(after)) return [];
  const now = parsePage(after, { components });
  if (!now.board || now.errors.length) return [];
  const was = before === null ? null : parsePage(before, { components });
  const earlier = new Map(screensOf(was).map((screen) => [idOf(screen), screen]));
  const imported = importedOf(after);
  const plans = [];
  for (const screen of screensOf(now)) {
    if (!rootShell(screen)) continue;
    const derived = phoneChromeCode(screen, { mock: now.mock ?? {} });
    const title = String(literalOf(screen, "title") ?? "Untitled");
    const decided = linkedOf(screen);
    const previous = earlier.get(idOf(screen));
    // Not decided yet: a part that is missing, still the starting code or already what the desktop draws gets linked.
    let linked = decided ?? PHONE_PARTS.filter((prop) => { const code = partCode(screen, prop); return code === null || code === seedCode(prop, title) || code === derived[prop]; });
    const ops = [];
    for (const prop of PHONE_PARTS) {
      if (!linked.includes(prop)) continue;
      const code = partCode(screen, prop);
      // Changed on the phone by this edit (and not to what the desktop draws): the person's own from now on.
      if (decided && previous && code !== partCode(previous, prop) && code !== derived[prop]) { linked = linked.filter((name) => name !== prop); continue; }
      if (code === derived[prop]) continue;
      // A part written for the first time goes in as a slot insert, which imports its components (setProp does not); a part
      // redrawn with a component the page does not import yet (a Menu, the control bar's Stack) is swapped in its place,
      // which imports it too.
      const unimported = derived[prop] !== null && code !== null && tagsOf(derived[prop]).some((name) => !imported.has(name));
      ops.push(derived[prop] === null ? { op: "removeProp", name: prop } : code === null ? { op: "insertChild", prop, code: derived[prop] }
        : unimported ? { op: "replaceElement", code: derived[prop], part: screen.props[prop].node } : { op: "setProp", name: prop, value: { kind: "expression", code: derived[prop] } });
    }
    // A slot insert or swap goes alone in its request (the engine's rule): one now, the rest planned again on the new text.
    const insert = ops.find((op) => op.op === "insertChild");
    if (insert) { plans.push({ loc: screen.loc, name: "Screen", ops: [insert], notes: derived.notes }); continue; }
    const swap = ops.find((op) => op.op === "replaceElement");
    if (swap) { plans.push({ loc: swap.part.loc, name: swap.part.name, ops: [{ op: "replaceElement", code: swap.code }], notes: derived.notes }); continue; }
    const listChanged = !decided || linked.length !== decided.length;
    if (listChanged) ops.push({ op: "setProp", name: PHONE_LINKED_PROP, value: { kind: "expression", code: JSON.stringify(linked) } });
    if (ops.length) plans.push({ loc: screen.loc, name: "Screen", ops, notes: derived.notes });
  }
  return plans;
}

/** A Screen's linked phone parts (for the Screen section), from its dialect node. */
export function phoneLinkedOf(screen) {
  return linkedOf(screen) ?? [];
}
