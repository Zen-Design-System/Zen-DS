// Builder page → React (Studio builder GĐ5 M1, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3a): a
// `*.zen.tsx` page (tools/studio/dialect.mjs) compiled to one ordinary React component a developer can drop into an app.
// Isomorphic (browser and Node, no Node imports): the Studio's Export dialog loads it lazily (browser-compile.mjs).
//
//   compileReact(text, { file? }) → { code, component, screens, overlays, handlers, actions, dataType, media } | { error }
//
// - Each Screen is a branch on the current screen (history, so Back works); a Screen with a `state` is the variant shown
//   while the `state` prop names it. Board / Screen / Overlay are the design's runtime: they do not reach the output.
// - proto.navigate("x") → navigate("x") (and onNavigate), open / close → an `overlay` state, back → the history (then
//   onBack), toast → useToast, link → window.open. A TODO(dev) block names every handler to wire. A choice control's
//   per-item action (proto.navigate({ home: "screen-1" })) picks its target by the item the control hands over.
// - Each Overlay frame's overlay renders with open={overlay === "x"} and onOpenChange.
// - The mock becomes `export const mock` with a type inferred from it; `{mock.x}` reads the `data` prop (default: mock).
// - `zen-media:` / `zen-asset:` photos become imports from ./assets (the handoff zip carries the files; `mediaFile(kind,
//   key)` names each); `media` lists them.
// - A function the component requires but a page cannot write (standins.mjs) gets a stand-in and a TODO(dev) line; a
//   Table column shows its row's field named by its id. Fields a component's object type lacks are left out.
import { SCREEN_CHROME, eachElement, localComponents, parsePage, screenLayout } from "./dialect.mjs";
import { literalProp, objectFields, opensItself, requiredFunctions, standInKind } from "./standins.mjs";
import { pruneHidden } from "./visibility.mjs";

const UNIT = "  ";
const WIDTH = 110;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const PLAIN_ATTR = /^[^"\\&\r\n\u2028\u2029{}]*$/;
const PLAIN_TEXT = /^[^{}<>&\s\u2028\u2029](?:[^{}<>&\r\n\u2028\u2029]*[^{}<>&\s\u2028\u2029])?$/;
const MEDIA = /^zen-(media|asset):([\w.-]+)$/;

const json = (value) => JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const literalOf = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);

/** "Checkout · Pay" → "CheckoutPay" (ASCII letters and digits, a letter first). */
export function componentName(title) {
  const words = String(title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").split(/[^A-Za-z0-9]+/).filter(Boolean);
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return /^[A-Za-z]/.test(name) ? name : `Studio${name}`;
}

/**
 * A TypeScript type for a JSON-like value (lists: the union of their items' shapes, fields missing in some optional).
 * `typed`: data paths ("people.[].theme") read into a prop that takes string literals only, typed as that prop.
 */
function typeOf(value, indent, typed = new Map(), path = []) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "unknown[]";
    const objects = value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    if (objects.length === value.length) return `Array<${objectType(objects, indent, typed, [...path, "[]"])}>`;
    const types = [...new Set(value.map((item) => typeOf(item, indent, typed, [...path, "[]"])))];
    return types.length === 1 ? `${types[0]}[]` : `Array<${types.join(" | ")}>`;
  }
  if (typeof value === "object") return objectType([value], indent, typed, path);
  return typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
}

function objectType(objects, indent, typed = new Map(), path = []) {
  const keys = [...new Set(objects.flatMap((object) => Object.keys(object)))];
  if (!keys.length) return "Record<string, never>";
  const inner = indent + UNIT;
  const fields = keys.map((key) => {
    const present = objects.filter((object) => key in object);
    let types = [...new Set(present.map((object) => typeOf(object[key], inner, typed, [...path, key])))];
    // A row's own value of a literal prop (core rebuild M4: `theme={person.theme}`) is typed as the prop, not string.
    const use = typed.get([...path, key].join("."));
    if (use && types.length === 1 && types[0] === "string") types = [`NonNullable<ComponentProps<typeof ${use.component}>[${json(use.prop)}]>`];
    return `${inner}${IDENTIFIER.test(key) ? key : json(key)}${present.length < objects.length ? "?" : ""}: ${types.join(" | ")};`;
  });
  return `{\n${fields.join("\n")}\n${indent}}`;
}

/** A JS literal of JSON-like data, wrapped when long. */
function dataLiteral(value, indent) {
  if (value === null || typeof value !== "object") return typeof value === "string" ? json(value) : String(value);
  const inner = indent + UNIT;
  if (Array.isArray(value)) {
    const items = value.map((item) => dataLiteral(item, inner));
    const flat = `[${items.join(", ")}]`;
    return !flat.includes("\n") && indent.length + flat.length <= WIDTH ? flat : `[\n${items.map((item) => `${inner}${item},`).join("\n")}\n${indent}]`;
  }
  const fields = Object.entries(value).map(([key, field]) => `${IDENTIFIER.test(key) ? key : json(key)}: ${dataLiteral(field, inner)}`);
  if (!fields.length) return "{}";
  const flat = `{ ${fields.join(", ")} }`;
  return !flat.includes("\n") && indent.length + flat.length <= WIDTH ? flat : `{\n${fields.map((field) => `${inner}${field},`).join("\n")}\n${indent}}`;
}

/**
 * The compiler's state for one page: what the output uses (components, handlers, media) so the imports and the
 * component's body hold exactly that.
 */
function createContext(mediaFile, mock) {
  // `frame`: the Screen or Overlay being compiled ("screen:people", "overlay:invite"), for `actions`.
  // `rows`: the .map rows being compiled (their item name and data path); `typed`: data read into literal props.
  return { components: new Set(), uses: new Set(), media: new Map(), handlers: [], actions: [], frame: null, mediaFile, mock, rows: [], typed: new Map() };
}

/** The file a photo has in the export's assets/: a library photo is a .webp named after its key; an upload keeps its name. */
const defaultMediaFile = (kind, key) => (kind === "media" && !/\.[a-z0-9]+$/i.test(key) ? `${key}.webp` : key);

const mediaName = (ctx, key, kind) => {
  const id = `${kind}:${key}`;
  if (!ctx.media.has(id)) {
    const base = key.replace(/\.[a-z0-9]+$/i, "").replace(/[^A-Za-z0-9]+(.)?/g, (_, next) => (next ? next.toUpperCase() : ""));
    ctx.media.set(id, { key, kind, file: ctx.mediaFile(kind, key), name: `${/^[A-Za-z]/.test(base) ? base : `photo${base}`}Photo` });
  }
  return ctx.media.get(id).name;
};

/** The data path a ref reads ("people.[].theme" for `person.theme` in `mock.people.map`), or null. */
function dataPath(ref, ctx) {
  if (ref.root === "mock") return ref.path;
  const row = [...ctx.rows].reverse().find((entry) => entry.item === ref.root);
  return row ? [...row.path, ...ref.path] : null;
}

/** A ref (`mock.a.b`, `item.c`) as code: mock reads the `data` prop. */
const refCode = (value) => [value.root === "mock" ? "data" : value.root, ...value.path.map((key) => (IDENTIFIER.test(key) ? `.${key}` : `[${json(key)}]`))].join("");

/** A proto action as the handler code a prop receives. */
function protoCode(value, ctx, where) {
  const [arg] = value.args;
  // Its options (animation, After delay's delay) go to the handoff; the code switches screens without animating.
  const options = value.args[value.action === "close" || value.action === "back" ? 0 : 1];
  ctx.actions.push({ frame: ctx.frame, where, action: value.action, target: arg === undefined || arg === options ? null : arg, ...(options && typeof options === "object" ? { options } : {}) });
  // One target per item of a choice control (`proto.navigate({ home: "screen-1" })`): the item the control hands over
  // (its value, or the item with its id) picks the entry; an item without one does nothing.
  if ((value.action === "navigate" || value.action === "open") && arg && typeof arg === "object" && !Array.isArray(arg)) {
    ctx.uses.add("choice");
    const entries = Object.entries(arg).map(([item, target]) => `${item} → ${target}`).join(", ");
    if (value.action === "navigate") {
      ctx.uses.add("navigate");
      ctx.handlers.push(`${where} navigates by the chosen item (${entries})`);
      return `(choice: unknown) => { const to = (${dataLiteral(arg, "")} as Record<string, Parameters<typeof navigate>[0] | undefined>)[choiceKey(choice)]; if (to) navigate(to); }`;
    }
    ctx.uses.add("overlay");
    return `(choice: unknown) => { const to = (${dataLiteral(arg, "")} as Record<string, string | undefined>)[choiceKey(choice)]; if (to) setOverlay(to as Parameters<typeof setOverlay>[0]); }`;
  }
  switch (value.action) {
    case "navigate": ctx.uses.add("navigate"); ctx.handlers.push(`${where} navigates to "${arg}"`); return `() => navigate(${json(String(arg))})`;
    case "open": ctx.uses.add("overlay"); return `() => setOverlay(${json(String(arg))})`;
    case "close": ctx.uses.add("overlay"); return "() => setOverlay(null)";
    case "back": ctx.uses.add("back"); return "back";
    case "toast": ctx.uses.add("toast"); ctx.handlers.push(`${where} shows a toast: replace it with the real outcome`); return `() => toast(${dataLiteral(arg && typeof arg === "object" ? arg : { title: String(arg ?? "") }, "")})`;
    case "link": ctx.handlers.push(`${where} opens ${arg}`); return `() => window.open(${json(String(arg))}, "_blank", "noopener,noreferrer")`;
    default: return "() => undefined";
  }
}

/** A prop value inside {…}. */
function valueCode(value, ctx, indent, where) {
  switch (value.kind) {
    case "literal": {
      const media = typeof value.value === "string" ? MEDIA.exec(value.value) : null;
      if (media) return mediaName(ctx, media[2], media[1]);
      return value.value === undefined ? "undefined" : typeof value.value === "string" ? json(value.value) : dataLiteral(value.value, indent);
    }
    case "array": {
      const items = value.items.map((item) => valueCode(item, ctx, indent + UNIT, where));
      const flat = `[${items.join(", ")}]`;
      return !flat.includes("\n") && indent.length + flat.length <= WIDTH ? flat : `[\n${items.map((item) => `${indent}${UNIT}${item},`).join("\n")}\n${indent}]`;
    }
    case "object": {
      const fields = Object.entries(value.fields).map(([key, field]) => `${IDENTIFIER.test(key) ? key : json(key)}: ${valueCode(field, ctx, indent + UNIT, `${where}.${key}`)}`);
      if (!fields.length) return "{}";
      const flat = `{ ${fields.join(", ")} }`;
      return !flat.includes("\n") && indent.length + flat.length <= WIDTH ? flat : `{\n${fields.map((field) => `${indent}${UNIT}${field},`).join("\n")}\n${indent}}`;
    }
    case "element": return elementCode(value.node, ctx, indent);
    case "fragment": {
      // A slot holding several layers (Figma's slot): they stay side by side in the prop, the component lays them out.
      const kids = value.children.map((child) => childCode(child, ctx, indent + UNIT));
      const flat = `<>${kids.join("")}</>`;
      return !flat.includes("\n") && indent.length + flat.length <= WIDTH ? flat : `<>\n${kids.map((kid) => `${indent}${UNIT}${kid}`).join("\n")}\n${indent}</>`;
    }
    case "proto": return protoCode(value, ctx, where);
    case "ref": return refCode(value);
    case "code": return value.code;
    default: return "undefined";
  }
}

function attribute(name, value, ctx, indent, where) {
  if (value.kind === "literal" && value.value === true) return name;
  if (value.kind === "literal" && typeof value.value === "string" && PLAIN_ATTR.test(value.value) && !MEDIA.test(value.value)) return `${name}="${value.value}"`;
  return `${name}={${valueCode(value, ctx, indent, where)}}`;
}

function childCode(child, ctx, indent) {
  if (child.kind === "text") return PLAIN_TEXT.test(child.value) ? child.value : `{${json(child.value)}}`;
  if (child.kind === "ref") return `{${refCode(child)}}`;
  if (child.kind === "map") {
    const inner = indent + UNIT;
    const list = dataPath(child.source, ctx);
    if (list) ctx.rows.push({ item: child.item, path: [...list, "[]"] });
    const row = elementCode(child.node, ctx, inner, [["key", "index"]]);
    if (list) ctx.rows.pop();
    return `{${refCode(child.source)}.map((${child.item}, index) => (\n${inner}${row}\n${indent}))}`;
  }
  return elementCode(child, ctx, indent);
}

const STAND_IN = { void: "() => {}", null: "() => null", string: '() => ""' };

/** The element's props with a stand-in for each function its component requires that the page lacks (standins.mjs). */
function withStandIns(node, ctx) {
  const required = requiredFunctions(node.name);
  if (!required) return node.props;
  const props = { ...node.props };
  for (const [name, signature] of Object.entries(required.props ?? {})) {
    const kind = props[name] === undefined ? standInKind(signature) : null;
    if (!kind) continue;
    props[name] = { kind: "code", code: STAND_IN[kind] };
    ctx.handlers.push(`<${node.name}> ${name}: not in the design (a stand-in ${kind === "void" ? "does" : "draws"} nothing)`);
  }
  for (const [name, fields] of Object.entries(required.fields ?? {})) {
    const value = props[name];
    const fill = (object) => {
      if (object.kind !== "object") return object;
      const added = {};
      for (const [field, signature] of Object.entries(fields)) {
        if (object.fields[field] !== undefined) continue;
        const kind = standInKind(signature);
        if (!kind) continue;
        added[field] = { kind: "code", code: STAND_IN[kind] };
        ctx.handlers.push(`<${node.name}> ${name}.${field}: not in the design (a stand-in ${kind === "void" ? "does" : "draws"} nothing)`);
      }
      return Object.keys(added).length ? { kind: "object", fields: { ...object.fields, ...added } } : object;
    };
    if (value?.kind === "object") props[name] = fill(value);
    else if (value?.kind === "array") props[name] = { kind: "array", items: value.items.map(fill) };
  }
  return props;
}

/**
 * The element's props without the fields its component's object types do not have (an option's `at`: the design's own
 * data, which the component ignores and TypeScript refuses in a literal).
 */
function knownFieldsOnly(node) {
  const known = objectFields(node.name);
  if (!known) return node;
  const props = { ...node.props };
  for (const [name, fields] of Object.entries(known)) {
    const keep = new Set(fields);
    const trim = (object) => (object.kind === "object" ? { kind: "object", fields: Object.fromEntries(Object.entries(object.fields).filter(([key]) => keep.has(key))) } : object);
    const value = props[name];
    if (value?.kind === "object") props[name] = trim(value);
    else if (value?.kind === "array") props[name] = { kind: "array", items: value.items.map(trim) };
  }
  return { ...node, props };
}

/** An element; `extra`: [name, code] props written first (a list row's key, an overlay's open state). */
function elementCode(node, ctx, indent, extra = []) {
  // A page-local component (Figma's main, <Component>) and its instances (<Use>) are calls of its function (compileReact
  // writes one per main, named from its name).
  if (node.name === "Component" || node.name === "Use") {
    const id = String(literalOf(node, node.name === "Component" ? "id" : "of") ?? "");
    const local = ctx.locals?.get(id);
    if (!local) return "{null}";
    ctx.localUsed.add(id);
    return `<${local.fn} />`;
  }
  ctx.components.add(node.name.split(".")[0]);
  const inner = indent + UNIT;
  for (const [name, value] of Object.entries(node.props)) {
    const path = value.kind === "ref" && literalProp(node.name, name) ? dataPath(value, ctx) : null;
    if (path) ctx.typed.set(path.join("."), { component: node.name, prop: name });
  }
  // While hovering (Open overlay): the overlay shows while the pointer stays.
  const hover = node.props.whileHovering;
  const hovering = [];
  if (hover) {
    node = { ...node, props: Object.fromEntries(Object.entries(node.props).filter(([name]) => name !== "whileHovering")) };
    if (hover.kind === "proto" && hover.action === "open" && typeof hover.args[0] === "string") {
      ctx.uses.add("overlay");
      ctx.actions.push({ frame: ctx.frame, where: `<${node.name}> whileHovering`, action: "hover", target: hover.args[0] });
      hovering.push(["onPointerEnter", `() => setOverlay(${json(hover.args[0])})`], ["onPointerLeave", "() => setOverlay(null)"]);
    }
  }
  const props = [
    ...[...extra, ...hovering].map(([name, code]) => `${name}={${code}}`),
    ...Object.entries(withStandIns(knownFieldsOnly(node), ctx)).map(([name, value]) => attribute(name, value, ctx, inner, `<${node.name}> ${name}`)),
  ];
  const oneLine = props.every((prop) => !prop.includes("\n")) && indent.length + node.name.length + 2 + props.join(" ").length <= WIDTH;
  const open = !props.length ? `<${node.name}` : oneLine ? `<${node.name} ${props.join(" ")}` : `<${node.name}\n${props.map((prop) => `${inner}${prop}`).join("\n")}\n${indent}`;
  if (!node.children.length) return oneLine ? `${open} />` : `${open}/>`;
  const kids = node.children.map((child) => childCode(child, ctx, inner));
  if (oneLine && kids.length === 1 && (node.children[0].kind === "text" || node.children[0].kind === "ref") && indent.length + open.length + kids[0].length + node.name.length + 4 <= WIDTH) return `${open}>${kids[0]}</${node.name}>`;
  return `${open}>\n${kids.map((kid) => `${inner}${kid}`).join("\n")}\n${indent}</${node.name}>`;
}

/** A Screen's content as one expression (several children in a fragment). */
function screenContent(screen, ctx, indent) {
  const part = (prop) => (screen.props[prop]?.kind === "element" ? screen.props[prop].node : null);
  const layout = screenLayout(screen.props.device?.value ?? "desktop", screen.props.layout?.value);
  const shown = SCREEN_CHROME.filter((entry) => entry.layout === layout && part(entry.prop));
  const blank = (child) => child.kind === "text" && !child.value.trim();
  const all = screen.children.filter((child) => !blank(child));
  // A Screen on its master layout (a root AppShell) exports one AppShell for every width: the Screen's phone parts
  // become its topNavigation / bottomNavigation, which it draws under 744px (component-usage-rules §17).
  const shell = all.length === 1 && all[0].kind === "element" && all[0].name === "AppShell" ? all[0] : null;
  if (shell) {
    const props = { ...shell.props };
    for (const prop of ["topNavigation", "bottomNavigation"]) if (!props[prop] && part(prop)) props[prop] = screen.props[prop];
    return elementCode({ ...shell, props }, ctx, indent);
  }
  // The master layout (a root AppShell, screen-frame.mjs) is the desktop layout's: a phone shows its content only.
  const kids = layout === "mobile" && all.length === 1 && all[0].kind === "element" && all[0].name === "AppShell" ? all[0].children.filter((child) => !blank(child)) : all;
  if (!shown.length) {
    if (kids.length === 1 && kids[0].kind === "element") return elementCode(kids[0], ctx, indent);
    const inner = indent + UNIT;
    return `<>\n${kids.map((kid) => `${inner}${childCode(kid, ctx, inner)}`).join("\n")}\n${indent}</>`;
  }
  // The app frame (Screen's sidebar · header, or top · bottom navigation): an AppShell around the page on desktop,
  // the bars above and below it on a phone.
  const inner = indent + UNIT;
  const content = kids.map((kid) => `${inner}${childCode(kid, ctx, inner)}`);
  if (layout === "desktop") {
    ctx.components.add("AppShell");
    const sidebar = part("sidebar");
    const header = part("header");
    const open = sidebar ? `<AppShell sidebar={${elementCode(sidebar, ctx, inner)}}>` : "<AppShell>";
    return [open, ...(header ? [`${inner}${elementCode(header, ctx, inner)}`] : []), ...content, `${indent}</AppShell>`].join("\n");
  }
  const top = part("topNavigation");
  const bottom = part("bottomNavigation");
  return ["<>", ...(top ? [`${inner}${elementCode(top, ctx, inner)}`] : []), ...content, ...(bottom ? [`${inner}${elementCode(bottom, ctx, inner)}`] : []), `${indent}</>`].join("\n");
}

/**
 * The page compiled to one React component; `file` names the design in the header comment, `suffix` ends the component's
 * name (Page; Template when Promote writes it into src/templates/studio).
 */
export function compileReact(text, { file, mediaFile = defaultMediaFile, suffix = "Page" } = {}) {
  const page = parsePage(text);
  if (page.errors.length || !page.board) return { error: page.errors[0] ? `line ${page.errors[0].line}: ${page.errors[0].message}` : "The page has no board" };
  const title = String(page.header?.title ?? "Untitled");
  const name = componentName(title);
  // Each frame as its layout draws it: hidden layers and switched-off slots left out (tools/studio/visibility.mjs).
  const frames = page.board.children.filter((child) => child.kind === "element").map((node) => pruneHidden(node, node.name === "Screen" ? screenLayout(literalOf(node, "device") ?? "desktop", literalOf(node, "layout")) : undefined)).filter(Boolean);
  const screens = frames.filter((node) => node.name === "Screen");
  const overlays = frames.filter((node) => node.name === "Overlay");
  if (!screens.length) return { error: "The page has no Screen" };
  const ctx = createContext(mediaFile, page.mock ?? {});
  // Page-local components: one function each, named from the component's name (a name a layer of the page already uses
  // takes "Block"; a repeat takes a number).
  const taken = new Set([name]);
  eachElement(page.board, (node) => taken.add(node.name.split(".")[0]));
  ctx.locals = new Map();
  ctx.localUsed = new Set();
  for (const main of localComponents(page)) {
    if (!main.id || !main.root) continue;
    let fn = componentName(main.name);
    if (taken.has(fn)) fn = `${fn}Block`;
    for (let n = 2; taken.has(fn); n += 1) fn = `${componentName(main.name)}${n}`;
    taken.add(fn);
    ctx.locals.set(main.id, { fn, root: main.root, name: main.name });
  }
  const ids = [...new Set(screens.map((node) => String(literalOf(node, "id"))))];
  const states = [...new Set(screens.map((node) => literalOf(node, "state")).filter((state) => typeof state === "string"))];
  const hasMock = page.mock && Object.keys(page.mock).length > 0;
  const body = "      ";

  // Each screen id: its state variants first, then its default; one id needs no branch.
  const many = ids.length > 1;
  const branches = ids.map((id) => {
    const nodes = screens.filter((node) => String(literalOf(node, "id")) === id);
    const variants = nodes.filter((node) => typeof literalOf(node, "state") === "string");
    const plain = nodes.find((node) => literalOf(node, "state") === undefined) ?? nodes[0];
    return { id, title: String(literalOf(plain, "title") ?? id), device: literalOf(plain, "device") ?? "desktop", canvas: literalOf(plain, "canvas") ?? "default", variants, plain };
  });
  /** A screen's content at `indent`: a chain over its state variants (`state === "empty" ? (…) : (…)`) or the content. */
  const branchCode = (branch, indent) => {
    ctx.frame = `screen:${branch.id}`;
    if (!branch.variants.length) return screenContent(branch.plain, ctx, indent);
    const inner = indent + UNIT;
    const tests = branch.variants.map((node) => {
      ctx.frame = `screen:${branch.id}:${literalOf(node, "state")}`;
      return `${`state === ${json(literalOf(node, "state"))}`} ? (\n${inner}${screenContent(node, ctx, inner)}\n${indent}) : `;
    });
    ctx.frame = `screen:${branch.id}`;
    return `${tests.join("")}(\n${inner}${screenContent(branch.plain, ctx, inner)}\n${indent})`;
  };
  if (many) ctx.uses.add("screens");
  const overlayCode = overlays.map((node) => {
    const id = String(literalOf(node, "id"));
    ctx.frame = `overlay:${id}`;
    const root = node.children.find((child) => child.kind === "element");
    if (!root) return null;
    ctx.uses.add("overlay");
    const props = { ...root.props };
    delete props.open;
    delete props.defaultOpen;
    if (opensItself(root.name)) return `${body}{/* Overlay "${id}" */}\n${body}${elementCode({ ...root, props }, ctx, body, [["open", `overlay === ${json(id)}`], ["onOpenChange", "(open: boolean) => { if (!open) setOverlay(null); }"]])}`;
    // Any other layer: shown while the overlay is open, where the design places it (the developer positions it).
    const position = String(literalOf(node, "position") ?? "center").replace("-", " ");
    const closes = literalOf(node, "closeOnOutside") !== false;
    const dim = literalOf(node, "background") === true;
    ctx.handlers.push(`Overlay "${id}" (<${root.name}>): show it at the ${position} of the screen${dim ? " over a dimmed screen (Background/Overlay)" : ""}${closes ? "; a press outside closes it" : ""}`);
    const inner = body + UNIT;
    return `${body}{/* Overlay "${id}" · ${position}${dim ? " · dims the screen" : ""}${closes ? " · closes on an outside press" : ""} */}\n${body}{overlay === ${json(id)} && (\n${inner}${elementCode({ ...root, props }, ctx, inner)}\n${body})}`;
  }).filter(Boolean);

  // After delay (a Screen's onDelay): once that screen shows, its action runs when the delay is over.
  const delayEffects = screens.flatMap((node) => {
    const value = node.props.onDelay;
    if (value?.kind !== "proto") return [];
    const id = String(literalOf(node, "id"));
    const state = literalOf(node, "state");
    ctx.frame = `screen:${id}${typeof state === "string" ? `:${state}` : ""}`;
    const handler = protoCode(value, ctx, `Screen "${id}" after its delay`);
    const options = value.args[value.action === "close" || value.action === "back" ? 0 : 1];
    const delay = options && typeof options === "object" && Number.isFinite(options.delay) ? options.delay : 800;
    const tests = [...(many ? [`screen !== ${json(id)}`] : []), ...(typeof state === "string" ? [`state !== ${json(state)}`] : [])];
    const deps = [...(many ? ["screen"] : []), ...(typeof state === "string" ? ["state"] : [])];
    ctx.uses.add("effect");
    return [
      `  // After delay: ${delay} ms on Screen "${id}"${typeof state === "string" ? ` (${state})` : ""}.`,
      "  useEffect(() => {",
      ...(tests.length ? [`    if (${tests.join(" || ")}) return undefined;`] : []),
      `    const timer = setTimeout(${handler}, ${delay});`,
      "    return () => clearTimeout(timer);",
      `  }, [${deps.join(", ")}]);`,
    ];
  });

  const screenLines = branches.flatMap((branch) => {
    // A Screen on another background layer says so: the app's page (AppShell canvas, or its own) sets it.
    const comment = `${body}{/* Screen "${branch.id}" · ${branch.title} · ${branch.device}${branch.canvas === "default" ? "" : ` · canvas ${branch.canvas} (Background/Canvas/${branch.canvas === "alt" ? "Alt" : "Flat"})`} */}`;
    const inner = `${body}${UNIT}`;
    if (!many) return [comment, branch.variants.length ? `${body}{${branchCode(branch, body)}}` : `${body}${branchCode(branch, body)}`];
    return [comment, `${body}{screen === ${json(branch.id)} && (\n${inner}${branchCode(branch, inner)}\n${body})}`];
  });

  // Each main component the page draws, as a function (its layers once; every instance calls it). A main can hold
  // instances of another: until no new one shows up.
  const localLines = [];
  const written = new Set();
  for (let pending = [...ctx.localUsed]; pending.length; pending = [...ctx.localUsed].filter((id) => !written.has(id))) {
    for (const id of pending) {
      written.add(id);
      const local = ctx.locals.get(id);
      if (!local) continue;
      ctx.frame = `component:${id}`;
      localLines.push(`/** ${local.name.replace(/\*\//g, "* /")} (a component of the design: its instances call it). */`, `function ${local.fn}() {`, "  return (", `    ${elementCode(local.root, ctx, "    ")}`, "  );", "}", "");
    }
  }

  const usesState = many || overlays.length > 0 || ctx.uses.has("overlay") || ctx.uses.has("navigate") || ctx.uses.has("back");
  const screenType = `${name}Screen`;
  const overlayType = `${name}Overlay`;
  const propsType = `${name}${suffix}Props`;
  const mockType = `${name}Mock`;
  const lines = [];
  lines.push(`// Generated by Zen Studio from ${file ?? `${name}.zen.tsx`}. Edit the design, then export again.`);
  const typesProps = hasMock && ctx.typed.size > 0;
  const reactHooks = [...(ctx.uses.has("effect") ? ["useEffect"] : []), ...(usesState ? ["useState"] : [])];
  if (reactHooks.length) lines.push(`import { ${reactHooks.join(", ")}${typesProps ? ", type ComponentProps" : ""} } from "react";`);
  else if (typesProps) lines.push(`import type { ComponentProps } from "react";`);
  const zen = [...ctx.components, ...(ctx.uses.has("toast") ? ["useToast"] : [])].sort((a, b) => a.localeCompare(b));
  lines.push(`import { ${zen.join(", ")} } from "@zen-ds/react";`);
  for (const entry of ctx.media.values()) lines.push(`import ${entry.name} from "./assets/${entry.file}";`);
  lines.push("");
  if (hasMock) {
    lines.push(`/** The design's sample data: replace it with the app's. */`);
    lines.push(`export type ${mockType} = ${typeOf(page.mock, "", ctx.typed)};`);
    lines.push(`export const mock: ${mockType} = ${dataLiteral(page.mock, "")};`);
    lines.push("");
  }
  lines.push(`export type ${screenType} = ${ids.map((id) => json(id)).join(" | ")};`);
  if (overlays.length) lines.push(`export type ${overlayType} = ${overlays.map((node) => json(String(literalOf(node, "id")))).join(" | ")};`);
  lines.push("");
  const historyState = many || ctx.uses.has("navigate") || ctx.uses.has("back");
  const propLines = [];
  if (historyState) propLines.push(`  /** The screen shown first (default ${json(ids[0])}). */`, `  screen?: ${screenType};`);
  if (states.length) propLines.push(`  /** A screen's state variant, when the design draws one. */`, `  state?: ${states.map((state) => json(state)).join(" | ")};`);
  if (ctx.uses.has("navigate")) propLines.push("  /** TODO(dev): route to that screen in the app (the design switches screens itself). */", `  onNavigate?: (screen: ${screenType}) => void;`);
  if (ctx.uses.has("back")) propLines.push("  /** TODO(dev): leave this page (Back on its first screen). */", "  onBack?: () => void;");
  if (hasMock) propLines.push("  /** The page's data (default: the design's sample data). */", `  data?: ${mockType};`);
  lines.push(propLines.length ? `export type ${propsType} = {\n${propLines.join("\n")}\n};` : `export type ${propsType} = Record<string, never>;`);
  lines.push("");
  lines.push(...localLines);
  if (ctx.handlers.length) {
    lines.push("/*");
    lines.push(" * TODO(dev): the design's interactions, to wire to the app:");
    for (const handler of [...new Set(ctx.handlers)]) lines.push(` * - ${handler}`);
    lines.push(" */");
  }
  const params = [
    ...(historyState ? [`screen: first = ${json(ids[0])}`] : []),
    ...(states.length ? ["state"] : []),
    ...(ctx.uses.has("navigate") ? ["onNavigate"] : []),
    ...(ctx.uses.has("back") ? ["onBack"] : []),
    ...(hasMock ? ["data = mock"] : []),
  ];
  lines.push(`export function ${name}${suffix}(${params.length ? `{ ${params.join(", ")} }: ${propsType}` : `_props: ${propsType}`}) {`);

  // Only what the page uses is declared (apps often build with noUnusedLocals).
  const overlayState = overlays.length > 0 || ctx.uses.has("overlay");
  const readsOverlay = overlayCode.length > 0 || (ctx.uses.has("back") && overlays.length > 0) || (ctx.uses.has("back") && ctx.uses.has("overlay"));
  const readsHistory = many || ctx.uses.has("back");
  if (historyState) {
    lines.push(`  const [${readsHistory ? "history" : ""}, setHistory] = useState<${screenType}[]>([first]);`);
    if (many) lines.push("  const screen = history[history.length - 1];");
  }
  if (overlayState) lines.push(`  const [${readsOverlay ? "overlay" : ""}, setOverlay] = useState<${overlays.length ? overlayType : "string"} | null>(null);`);
  if (ctx.uses.has("toast")) lines.push("  const { toast } = useToast();");
  if (ctx.uses.has("navigate")) {
    lines.push(`  const navigate = (next: ${screenType}) => {`, ...(overlayState ? ["    setOverlay(null);"] : []), "    setHistory((stack) => [...stack, next]);", "    onNavigate?.(next);", "  };");
  }
  if (ctx.uses.has("choice")) {
    lines.push("  /** The item a choice control hands over (its value, or the item with its id), as the key of a per-item action. */", "  const choiceKey = (choice: unknown) => String(choice && typeof choice === \"object\" ? (choice as { id?: unknown; value?: unknown }).id ?? (choice as { value?: unknown }).value : choice);");
  }
  if (ctx.uses.has("back")) {
    lines.push("  const back = () => {", ...(overlayState ? ["    if (overlay) { setOverlay(null); return; }"] : []), "    if (history.length > 1) setHistory((stack) => stack.slice(0, -1));", "    else onBack?.();", "  };");
  }
  lines.push(...delayEffects);
  lines.push("  return (");
  lines.push("    <>");
  lines.push(...screenLines);
  lines.push(...overlayCode);
  lines.push("    </>");
  lines.push("  );");
  lines.push("}");
  lines.push("");
  const code = lines.join("\n");
  return {
    code,
    component: `${name}${suffix}`,
    screens: branches.map((branch) => ({ id: branch.id, title: branch.title, device: branch.device, states: branch.variants.map((node) => literalOf(node, "state")) })),
    overlays: overlays.map((node) => String(literalOf(node, "id"))),
    handlers: [...new Set(ctx.handlers)],
    actions: ctx.actions,
    components: [...ctx.components].sort((a, b) => a.localeCompare(b)),
    dataType: hasMock ? `export type ${mockType} = ${typeOf(page.mock, "", ctx.typed)};` : null,
    media: [...ctx.media.values()],
  };
}
