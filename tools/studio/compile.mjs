// Builder page → React (Studio builder GĐ5 M1, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3a): a
// `*.zen.tsx` page (tools/studio/dialect.mjs) compiled to one ordinary React component a developer can drop into an app.
// Isomorphic (browser and Node, no Node imports): the Studio's Export dialog loads it lazily (browser-compile.mjs).
//
//   compileReact(text, { file? }) → { code, component, screens, overlays, handlers, actions, dataType, media } | { error }
//
// - Each Screen is a branch on the current screen (history, so Back works); a Screen with a `state` is the variant shown
//   while the `state` prop names it. Board / Screen / Overlay are the design's runtime: they do not reach the output.
// - proto.navigate("x") → navigate("x") (and onNavigate), open / close → an `overlay` state, back → the history (then
//   onBack), toast → useToast, link → window.open. A TODO(dev) block names every handler to wire.
// - Each Overlay frame's overlay renders with open={overlay === "x"} and onOpenChange.
// - The mock becomes `export const mock` with a type inferred from it; `{mock.x}` reads the `data` prop (default: mock).
// - `zen-media:` / `zen-asset:` photos become imports from ./assets (the handoff zip carries the files; `mediaFile(kind,
//   key)` names each); `media` lists them.
// - A function the component requires but a page cannot write (standins.mjs) gets a stand-in and a TODO(dev) line; a
//   Table column shows its row's field named by its id. Fields a component's object type lacks are left out.
import { SCREEN_CHROME, parsePage, screenLayout } from "./dialect.mjs";
import { objectFields, requiredFunctions, standInKind } from "./standins.mjs";

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

/** A TypeScript type for a JSON-like value (lists: the union of their items' shapes, fields missing in some optional). */
function typeOf(value, indent) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "unknown[]";
    const objects = value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    if (objects.length === value.length) return `Array<${objectType(objects, indent)}>`;
    const types = [...new Set(value.map((item) => typeOf(item, indent)))];
    return types.length === 1 ? `${types[0]}[]` : `Array<${types.join(" | ")}>`;
  }
  if (typeof value === "object") return objectType([value], indent);
  return typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
}

function objectType(objects, indent) {
  const keys = [...new Set(objects.flatMap((object) => Object.keys(object)))];
  if (!keys.length) return "Record<string, never>";
  const inner = indent + UNIT;
  const fields = keys.map((key) => {
    const present = objects.filter((object) => key in object);
    const types = [...new Set(present.map((object) => typeOf(object[key], inner)))];
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
  return { components: new Set(), uses: new Set(), media: new Map(), handlers: [], actions: [], frame: null, mediaFile, mock };
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

/** A ref (`mock.a.b`, `item.c`) as code: mock reads the `data` prop. */
const refCode = (value) => [value.root === "mock" ? "data" : value.root, ...value.path.map((key) => (IDENTIFIER.test(key) ? `.${key}` : `[${json(key)}]`))].join("");

/** A proto action as the handler code a prop receives. */
function protoCode(value, ctx, where) {
  const [arg] = value.args;
  ctx.actions.push({ frame: ctx.frame, where, action: value.action, target: arg === undefined ? null : arg });
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
    const row = elementCode(child.node, ctx, inner, [["key", "index"]]);
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
  ctx.components.add(node.name.split(".")[0]);
  const inner = indent + UNIT;
  const props = [
    ...extra.map(([name, code]) => `${name}={${code}}`),
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
  const kids = screen.children.filter((child) => child.kind !== "text" || child.value.trim());
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
  const frames = page.board.children.filter((child) => child.kind === "element");
  const screens = frames.filter((node) => node.name === "Screen");
  const overlays = frames.filter((node) => node.name === "Overlay");
  if (!screens.length) return { error: "The page has no Screen" };
  const ctx = createContext(mediaFile, page.mock ?? {});
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
    return `${body}{/* Overlay "${id}" */}\n${body}${elementCode({ ...root, props }, ctx, body, [["open", `overlay === ${json(id)}`], ["onOpenChange", "(open: boolean) => { if (!open) setOverlay(null); }"]])}`;
  }).filter(Boolean);

  const screenLines = branches.flatMap((branch) => {
    // A Screen on another background layer says so: the app's page (AppShell canvas, or its own) sets it.
    const comment = `${body}{/* Screen "${branch.id}" · ${branch.title} · ${branch.device}${branch.canvas === "default" ? "" : ` · canvas ${branch.canvas} (Background/Canvas/${branch.canvas === "alt" ? "Alt" : "Flat"})`} */}`;
    const inner = `${body}${UNIT}`;
    if (!many) return [comment, branch.variants.length ? `${body}{${branchCode(branch, body)}}` : `${body}${branchCode(branch, body)}`];
    return [comment, `${body}{screen === ${json(branch.id)} && (\n${inner}${branchCode(branch, inner)}\n${body})}`];
  });

  const usesState = many || overlays.length > 0 || ctx.uses.has("overlay") || ctx.uses.has("navigate") || ctx.uses.has("back");
  const screenType = `${name}Screen`;
  const overlayType = `${name}Overlay`;
  const propsType = `${name}${suffix}Props`;
  const mockType = `${name}Mock`;
  const lines = [];
  lines.push(`// Generated by Zen Studio from ${file ?? `${name}.zen.tsx`}. Edit the design, then export again.`);
  if (usesState) lines.push(`import { useState } from "react";`);
  const zen = [...ctx.components, ...(ctx.uses.has("toast") ? ["useToast"] : [])].sort((a, b) => a.localeCompare(b));
  lines.push(`import { ${zen.join(", ")} } from "@zen/design-system";`);
  for (const entry of ctx.media.values()) lines.push(`import ${entry.name} from "./assets/${entry.file}";`);
  lines.push("");
  if (hasMock) {
    lines.push(`/** The design's sample data: replace it with the app's. */`);
    lines.push(`export type ${mockType} = ${typeOf(page.mock, "")};`);
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
  if (ctx.uses.has("back")) {
    lines.push("  const back = () => {", ...(overlayState ? ["    if (overlay) { setOverlay(null); return; }"] : []), "    if (history.length > 1) setHistory((stack) => stack.slice(0, -1));", "    else onBack?.();", "  };");
  }
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
    dataType: hasMock ? `export type ${mockType} = ${typeOf(page.mock, "")};` : null,
    media: [...ctx.media.values()],
  };
}
