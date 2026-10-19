import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine, zenComponents } from "../builder/engine";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { displayName } from "../select/layerMeta";
import { multiSelection, selectedLayers, selectLayers, type ExtraLayer } from "../select/multiSelection";
import { wrapSelection } from "../select/wrapSelection";
import { findBySrc, selectHit } from "../select/picker";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit } from "../slots/actions";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { boxFloating, floatingGroup } from "./groupLayers";

/*
 * Figma's components on a page you made (research docs/research/studio-figma-native-parity-2026-10-17.md §9):
 *   ⌥⌘K            the selected layer becomes a main component where it is (`<Component id name>` around it)
 *   ⌘D / ⌥-drag    of a main: an instance (`<Use of>`), as Figma's duplicate of a main
 *   ⌥⌘B            detach an instance: the main's layers written in its place
 * plus Go to main component and Rename from the Inspector. The main's root layer is the component (renderPage marks
 * it), an instance is one layer drawn from its main. One edit, one ⌘Z each.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
/** A component property of a page's component (tools/studio/dialect.mjs COMPONENT_PROPERTY_TYPES). */
export type PropertyRef = { name: string; type: "text" | "boolean" | "swap" | "slot"; default?: unknown; preferred?: unknown[] };
export type MainRef = {
  id: string; name: string; componentLoc: string; rootLoc: string; file: string; uses: string[];
  /** Its component set's id, when it is a variant (F7). */
  set?: string;
  /** A variant's values ("Size" → "Small"). */
  variant?: Record<string, string>;
  /** Its properties (a variant's are its set's). */
  properties: PropertyRef[];
  description?: string;
  /** Figma's documentation link. */
  link?: string;
};
/** A page's component set (`<ComponentSet>`, Figma's Combine as variants). */
export type SetRef = { id: string; name: string; loc: string; file: string; variants: string[]; axes: Array<{ name: string; values: string[] }>; properties: PropertyRef[]; uses: string[]; description?: string; link?: string };

const fail = (message: string) => { announceEditStatus({ kind: "error", message, at: Date.now() }); return false; };

/** The page's main components as read from its text now: id, name, where the `<Component>` and its root are, its instances. */
export async function mainsOf(file: string): Promise<MainRef[]> {
  const engine = await loadEngine();
  const source = await studioApi.source(file);
  const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
  const uses = new Map<string, string[]>();
  engine.eachElement(tree.board, (node) => {
    if (node.name !== "Use") return;
    const of = String(node.props.of?.value ?? "");
    uses.set(of, [...(uses.get(of) ?? []), node.loc]);
  });
  return engine.localComponents(tree).filter((main) => main.id && main.root).map((main) => ({
    id: main.id!, name: String(main.name ?? main.id), componentLoc: main.loc, rootLoc: main.root!.loc, file, uses: uses.get(main.id!) ?? [],
    ...(main.set ? { set: main.set, variant: main.variant ?? {} } : {}), properties: main.properties ?? [], ...(main.description ? { description: main.description } : {}), ...(main.link ? { link: main.link } : {}),
  }));
}

/** The main component the selection is the root of, or null. */
export async function mainOfSelection(selection: StudioSelection | null): Promise<MainRef | null> {
  if (selection?.kind !== "node" || selection.part) return null;
  const at = parseSrc(selection.src);
  if (!at) return null;
  return (await mainsOf(at.file)).find((main) => main.rootLoc === at.loc) ?? null;
}

/** The main component an instance (`<Use>`) shows, or null. */
export async function mainOfInstance(selection: StudioSelection | null): Promise<MainRef | null> {
  if (selection?.kind !== "node" || selection.name !== "Use") return null;
  const at = parseSrc(selection.src);
  if (!at) return null;
  const element = await studioApi.element(at.file, at.loc);
  const of = element?.attributes.find((attr) => attr.kind === "string" && attr.name === "of")?.value;
  return (await mainsOf(at.file)).find((main) => main.id === of) ?? null;
}

/** Selects the layer written at `file:loc` (its first render), as a click would. */
function selectAt(file: string, loc: string, from: NodeSelection, name: string) {
  const world = canvasApi.getWorldElement();
  const src = `${file}:${loc}`;
  const hit = world ? findBySrc(world, src)[0] : undefined;
  multiSelection.clear();
  if (hit && world) selectHit(hit, world);
  else studioStore.setState({ selection: { ...from, src, name } });
  flushStudioStore();
}

const slug = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "component";

/** The layer's name as Layers shows it (a Text by its words, an instance by its component…). */
function layerName(layer: { name: string; src: string; instance: number }) {
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, layer.src)[layer.instance] : undefined;
  return displayName(layer.name, hit?.props, layer.src);
}

/** A component name and id for each base name: Figma's, numbered when the page (or one before it) has it. */
function freshNames(mains: MainRef[], bases: string[]): Array<{ name: string; id: string }> {
  const names = new Set(mains.map((main) => main.name));
  const ids = new Set(mains.map((main) => main.id));
  return bases.map((base) => {
    let name = base;
    for (let n = 2; names.has(name); n += 1) name = `${base} ${n}`;
    let id = slug(name);
    for (let n = 2; ids.has(id); n += 1) id = `${slug(name)}-${n}`;
    names.add(name);
    ids.add(id);
    return { name, id };
  });
}

/** ⌥⌘K: the selected layer becomes a main component where it is (Figma: named after the layer, numbered when taken). */
export async function createComponent(selection: NodeSelection): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const at = parseSrc(selection.src);
  if (!at) return false;
  if (selection.name === "Use") return fail("This is an instance already: detach it first (⌥⌘B) to make a component of its layers");
  const mains = await mainsOf(at.file);
  if (mains.some((main) => main.rootLoc === at.loc)) { inspectorStatus.set("neutral", "This layer is a main component already"); return false; }
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return fail(`${selection.name} is no longer there — select it again`);
  const world = canvasApi.getWorldElement();
  const { name, id } = freshNames(mains, [layerName(selection)])[0];
  const before = renderedNow(world);
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "wrap", tag: "Component", props: { id: { kind: "string", value: id }, name: { kind: "string", value: name } } } as EditOp], hash: element.hash }, `Create component ${name}`);
  if (!response.ok || !response.wrapped) return false;
  // The layer is the component (renderPage draws no element for <Component>): keep it selected, at its new place.
  const wrapper = await studioApi.element(response.file, response.wrapped.loc);
  const root = wrapper?.children.find((child) => child.kind === "element");
  if (root?.kind === "element") {
    const next: StudioSelection = { ...selection, src: `${response.file}:${root.loc}` };
    expectRender(next, before, () => undefined, 1500);
    studioStore.setState({ selection: next });
    flushStudioStore();
  }
  inspectorStatus.set("positive", `${name} is a component: ⌘D or ⌥-drag it for an instance`);
  return true;
}

/**
 * ⌥⌘K with several layers (Figma: one component of them all). Layers floating in a frame without auto layout go into
 * one Box, each keeping its place, and that Box is the component's layer (one edit); layers in auto layout go into an
 * auto layout frame first (Add auto layout, as Figma's component of a row), which then becomes the component.
 */
export async function createComponentOfLayers(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  if (layers.length < 2) return layers[0] ? createComponent({ kind: "node", ...layers[0] }) : false;
  for (const layer of layers) {
    const check = canStructurallyEdit({ kind: "node", ...layer });
    if (!check.ok) return fail(check.reason);
  }
  const at = parseSrc(layers[0].src);
  if (!at) return false;
  const mains = await mainsOf(at.file);
  const taken = new Set(mains.map((main) => main.name));
  let n = 1;
  while (taken.has(`Component ${n}`)) n += 1;
  const { name, id } = freshNames(mains, [`Component ${n}`])[0];
  const floating = floatingGroup(layers);
  if (floating) return boxFloating(floating, {}, `Create component ${name}`, `${name} is a component: ⌘D or ⌥-drag it for an instance`, { id, name });
  if (!(await wrapSelection("stack"))) return false;
  const wrapper = studioStore.getState().selection;
  return wrapper?.kind === "node" ? createComponent(wrapper) : false;
}

/** Figma's Create multiple components: each selected layer becomes a main component where it is (one edit), all selected. */
export async function createComponents(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  if (!layers.length) return false;
  for (const layer of layers) {
    const check = canStructurallyEdit({ kind: "node", ...layer });
    if (!check.ok) return fail(check.reason);
    if (layer.name === "Use") return fail("An instance is in the selection: detach it first (⌥⌘B) to make a component of its layers");
  }
  const at = parseSrc(layers[0].src);
  if (!at || layers.some((layer) => parseSrc(layer.src)?.file !== at.file)) return fail("Select layers of one page");
  const mains = await mainsOf(at.file);
  if (layers.some((layer) => mains.some((main) => main.rootLoc === parseSrc(layer.src)?.loc))) return fail("One of the layers is a main component already");
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return fail(`${layers[0].name} is no longer there — select it again`);
  const named = freshNames(mains, layers.map(layerName));
  const locs = layers.map((layer) => parseSrc(layer.src)!.loc);
  const names = Object.fromEntries(locs.map((loc, index) => [loc, named[index]]));
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "many", action: "components", locs, names } as unknown as EditOp], hash: element.hash }, `Create ${layers.length} components`);
  if (!response.ok) return false;
  // Each layer is its component's layer now, at its new place: select them all again.
  const after = await mainsOf(response.file);
  const roots = named.flatMap((entry, index) => {
    const main = after.find((candidate) => candidate.id === entry.id);
    return main ? [{ ...layers[index], src: `${response.file}:${main.rootLoc}`, instance: 0 }] : [];
  });
  multiSelection.clear();
  if (roots.length) selectLayers(roots[0], roots.slice(1), before);
  flushStudioStore();
  inspectorStatus.set("positive", `${layers.length} components: ⌘D or ⌥-drag one for an instance`);
  return true;
}

/** An instance of `main` right after the main (⌘D on a main, the Inspector's Create instance). */
export async function createInstance(main: MainRef, selection: NodeSelection): Promise<boolean> {
  const component = await studioApi.element(main.file, main.componentLoc);
  if (!component) return fail(`${main.name} is no longer there`);
  // The element the main sits in takes the instance after it.
  const engine = await loadEngine();
  const source = await studioApi.source(main.file);
  const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
  let parentLoc: string | null = null;
  let parentName = "";
  engine.eachElement(tree.board, (node, parents) => {
    if (node.loc !== main.componentLoc) return;
    const parent = parents.at(-1) as { loc: string; name: string } | undefined;
    if (parent) { parentLoc = parent.loc; parentName = parent.name; }
  });
  if (!parentLoc) return fail("The main component is not inside a layer that takes an instance");
  const parent = await studioApi.element(main.file, parentLoc);
  if (!parent) return false;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: main.file, loc: parentLoc, name: parentName, ops: [{ op: "pasteCode", code: `<Use of="${main.id}" />`, after: main.componentLoc } as EditOp], hash: parent.hash }, `Instance of ${main.name}`);
  if (!response.ok || !response.inserted) return false;
  const next: StudioSelection = { ...selection, src: `${response.file}:${response.inserted.loc}`, name: "Use" };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  return true;
}

/** ⌥⌘B on an instance: the main's layers written in its place (they no longer follow the main). */
export async function detachInstance(selection: NodeSelection): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const main = await mainOfInstance(selection);
  const at = parseSrc(selection.src);
  if (!main || !at) return fail("This instance's main component is not on the page");
  const [use, root, source] = await Promise.all([studioApi.element(at.file, at.loc), studioApi.element(main.file, main.rootLoc), studioApi.source(main.file)]);
  if (!use || !root?.range) return false;
  const engine = await loadEngine();
  const code = engine.relayoutCode(source.content, root.range, {});
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: "Use", ops: [{ op: "replaceElement", code } as EditOp], hash: use.hash }, `Detach ${main.name}`);
  if (!response.ok) return false;
  const next: StudioSelection = { ...selection, src: `${response.file}:${response.inserted?.loc ?? at.loc}`, name: root.name };
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  inspectorStatus.set("positive", `Detached from ${main.name}: its layers are this layer's own now`);
  return true;
}

/** Go to main component: the main's root layer selected (and shown). */
export async function goToMain(selection: NodeSelection): Promise<boolean> {
  const main = await mainOfInstance(selection);
  if (!main) return fail("This instance's main component is not on the page");
  selectAt(main.file, main.rootLoc, selection, main.name);
  return true;
}

/** Selects every instance of `main` (Figma's Select all instances). */
export function selectInstances(main: MainRef, selection: NodeSelection) {
  const world = canvasApi.getWorldElement();
  if (!world || !main.uses.length) return;
  const layers = main.uses.flatMap((loc) => findBySrc(world, `${main.file}:${loc}`).slice(0, 1)).map((hit) => ({ src: hit.src, name: "Use", frameId: selection.frameId, panelId: selection.panelId, instance: 0 }));
  const [first, ...others] = layers;
  if (first) selectLayers(first, others);
}

/** Renames a main component (its instances show the new name). */
export async function renameComponent(main: MainRef, name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed || trimmed === main.name) return false;
  const component = await studioApi.element(main.file, main.componentLoc);
  if (!component) return false;
  const response = await applyEdit({ file: main.file, loc: main.componentLoc, name: "Component", ops: [{ op: "setProp", name: "name", value: { kind: "string", value: trimmed } } as EditOp], hash: component.hash }, `Rename component → ${trimmed}`);
  return response.ok;
}

/** A main's or set's description or documentation link (Figma's Edit component); empty removes it. One edit. */
export async function setAbout(file: string, loc: string, field: "description" | "link", value: string): Promise<boolean> {
  const trimmed = value.trim();
  const element = await studioApi.element(file, loc);
  if (!element) return fail("The component is no longer there — select it again");
  const op = trimmed ? { op: "setProp", name: field, value: { kind: "string", value: trimmed } } : { op: "removeProp", name: field };
  const response = await applyEdit({ file, loc, name: element.name, ops: [op as EditOp], hash: element.hash }, trimmed ? `${field === "link" ? "Link" : "Description"} of ${element.name}` : `Remove ${field}`);
  return response.ok;
}

/** Swap instance (Figma's instance menu): the instance shows another main component of the page. */
export async function swapInstance(selection: NodeSelection, to: Pick<MainRef, "id" | "name">): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  const use = await studioApi.element(at.file, at.loc);
  if (!use) return false;
  // Another component takes its own variant and property values (Figma: a swap keeps only the overrides that still fit).
  const extra = use.attributes.some((attr) => attr.name === "variant" || attr.name === "props") ? [{ op: "removeProp", name: "variant" }, { op: "removeProp", name: "props" }] as EditOp[] : [];
  const response = await applyEdit({ file: at.file, loc: at.loc, name: "Use", ops: [{ op: "setProp", name: "of", value: { kind: "string", value: to.id } } as EditOp, ...extra], hash: use.hash }, `Swap instance → ${to.name}`);
  return response.ok;
}

/**
 * Delete on a main component: the main goes with its `<Component>` (true: handled here). Figma keeps instances whose
 * main is gone; a page cannot draw them, so a main that instances use stays and says so. False: not a main.
 */
export async function deleteMain(selection: NodeSelection): Promise<boolean> {
  const main = await mainOfSelection(selection);
  if (!main) return false;
  if (main.uses.length) {
    inspectorStatus.set("neutral", `${main.name} has ${main.uses.length} instance${main.uses.length > 1 ? "s" : ""}: detach or delete ${main.uses.length > 1 ? "them" : "it"} first`);
    return true;
  }
  const component = await studioApi.element(main.file, main.componentLoc);
  if (!component) return true;
  const response = await applyEdit({ file: main.file, loc: main.componentLoc, name: "Component", ops: [{ op: "removeElement" } as EditOp], hash: component.hash }, `Delete component ${main.name}`);
  if (response.ok) { multiSelection.clear(); studioStore.setState({ selection: null }); flushStudioStore(); }
  return true;
}

/* ── F7: component sets, variants and properties (docs/research/studio-f7-components-spec-2026-10-19.md) ───────────── */

/** The page's component sets as read from its text now. */
export async function setsOf(file: string): Promise<SetRef[]> {
  const engine = await loadEngine();
  const source = await studioApi.source(file);
  const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
  const uses = new Map<string, string[]>();
  engine.eachElement(tree.board, (node) => {
    if (node.name !== "Use") return;
    const of = String(node.props.of?.value ?? "");
    uses.set(of, [...(uses.get(of) ?? []), node.loc]);
  });
  return engine.componentSets(tree).filter((set) => set.id).map((set) => ({
    id: set.id!, name: String(set.name ?? set.id), loc: set.loc, file, variants: set.variants.flatMap((main) => (main.id ? [main.id] : [])), axes: set.axes,
    properties: set.properties ?? [], uses: [...(uses.get(set.id!) ?? []), ...set.variants.flatMap((main) => uses.get(main.id ?? "") ?? [])], ...(set.description ? { description: set.description } : {}), ...(set.link ? { link: set.link } : {}),
  }));
}

/** A JS object literal of `values` as the page writes it: names as they are when they can be, else quoted. */
export function objectCode(values: Record<string, unknown>): string {
  const entries = Object.entries(values);
  if (!entries.length) return "{}";
  const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
  const value = (entry: unknown): string => (entry && typeof entry === "object" && !Array.isArray(entry) ? objectCode(entry as Record<string, unknown>) : JSON.stringify(entry));
  return `{ ${entries.map(([name, entry]) => `${key(name)}: ${value(entry)}`).join(", ")} }`;
}
const expression = (values: Record<string, unknown>) => ({ kind: "expression" as const, code: objectCode(values) });

/** Writes `ops` on the element at `file:loc`, its hash read first (one edit, one ⌘Z). */
async function write(file: string, loc: string, ops: EditOp[], label: string): Promise<boolean> {
  const element = await studioApi.element(file, loc);
  if (!element) return fail("The component is no longer there — select it again");
  const response = await applyEdit({ file, loc, name: element.name, ops, hash: element.hash }, label);
  return Boolean(response.ok);
}

/**
 * Figma's Combine as variants: several main components side by side become one component set, each a variant named
 * "Property 1=Default", "Property 1=Variant2"… by its place (dialect.mjs defaultVariant), one edit. They must share a
 * frame (Figma moves them; here: put them in one frame first).
 */
export async function combineAsVariants(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  if (layers.length < 2) return fail("Select two or more main components to combine them as variants");
  const at = parseSrc(layers[0].src);
  if (!at || layers.some((layer) => parseSrc(layer.src)?.file !== at.file)) return fail("Select main components of one page");
  const mains = await mainsOf(at.file);
  const picked = layers.map((layer) => mains.find((main) => main.rootLoc === parseSrc(layer.src)?.loc) ?? null);
  if (picked.some((main) => !main)) return fail("Only main components combine as variants: make each a component first (⌥⌘K)");
  if (picked.some((main) => main!.set)) return fail("A variant is already in a component set: add variants to that set instead");
  const engine = await loadEngine();
  const source = await studioApi.source(at.file);
  const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
  const parentOf = new Map<string, string>();
  engine.eachElement(tree.board, (node, parents) => { if (node.name === "Component") parentOf.set(node.loc, (parents.at(-1) as { loc?: string } | undefined)?.loc ?? ""); });
  const ordered = [...picked as MainRef[]].sort((a, b) => compareLoc(a.componentLoc, b.componentLoc));
  if (new Set(ordered.map((main) => parentOf.get(main.componentLoc))).size !== 1) return fail("Put the components in one frame first, then combine them as variants");
  const sets = await setsOf(at.file);
  const { name, id } = freshNames([...mains, ...sets.map((set) => ({ ...set, componentLoc: set.loc, rootLoc: set.loc, properties: [] } as MainRef))], [ordered[0].name])[0];
  const [first, ...rest] = ordered;
  const ok = await write(at.file, first.componentLoc, [{ op: "wrap", tag: "ComponentSet", props: { id: { kind: "string", value: id }, name: { kind: "string", value: name } }, with: rest.map((main) => main.componentLoc) } as EditOp], `Combine as variants · ${name}`);
  if (ok) inspectorStatus.set("positive", `${name}: ${ordered.length} variants, Property 1 = Default, Variant2…`);
  return ok;
}

const compareLoc = (a: string, b: string) => { const [la, ca] = a.split(":").map(Number); const [lb, cb] = b.split(":").map(Number); return la - lb || ca - cb; };

/** Figma's + on a component set: the last variant again, its first property's value a new one (Variant3…), one edit. */
export async function addVariant(set: SetRef): Promise<boolean> {
  const mains = await mainsOf(set.file);
  const variants = set.variants.map((id) => mains.find((main) => main.id === id)).filter((main): main is MainRef => Boolean(main));
  const last = variants.at(-1);
  if (!last) return fail("The set has no variant to copy");
  const element = await studioApi.element(set.file, last.componentLoc);
  const source = await studioApi.source(set.file);
  if (!element?.range) return fail("The variant is no longer there — select the set again");
  const lines = source.content.split("\n");
  const code = lines.slice(element.range.start - 1, element.range.end).join("\n").trim();
  const axis = set.axes[0]?.name ?? "Property 1";
  const taken = new Set(set.axes[0]?.values ?? []);
  let n = variants.length + 1;
  while (taken.has(`Variant${n}`)) n += 1;
  const values = { ...(last.variant ?? {}), [axis]: `Variant${n}` };
  const { id } = freshNames(mains, [`${set.name} ${values[axis]}`])[0];
  const opening = code.replace(/^<Component\b[^>]*>/, `<Component id="${id}" variant={${objectCode(values)}}>`);
  const ok = await write(set.file, set.loc, [{ op: "pasteCode", code: opening, after: last.componentLoc } as EditOp], `Add variant · ${set.name}`);
  if (ok) inspectorStatus.set("positive", `${set.name}: ${axis}=${values[axis]} added`);
  return ok;
}

/** A variant's values (Figma: a variant property's value on that variant), one edit. */
export function setVariantValues(main: MainRef, values: Record<string, string>): Promise<boolean> {
  return write(main.file, main.componentLoc, [{ op: "setProp", name: "variant", value: expression(values) }], `${main.name} → ${Object.entries(values).map(([key, value]) => `${key}=${value}`).join(", ")}`);
}

/** Renames a variant property on every variant of the set (one edit). */
export async function renameVariantProperty(set: SetRef, from: string, to: string): Promise<boolean> {
  const name = to.trim();
  if (!name || name === from) return false;
  if (set.axes.some((axis) => axis.name === name)) return fail(`${set.name} has a ${name} property already`);
  const mains = await mainsOf(set.file);
  const variants = set.variants.map((id) => mains.find((main) => main.id === id)).filter((main): main is MainRef => Boolean(main));
  const opsByLoc = Object.fromEntries(variants.map((main) => [main.componentLoc, [{ op: "setProp", name: "variant", value: expression(Object.fromEntries(Object.entries(main.variant ?? {}).map(([key, value]) => [key === from ? name : key, value]))) } as EditOp]]));
  const element = await studioApi.element(set.file, variants[0].componentLoc);
  if (!element) return fail("The set is no longer there — select it again");
  const response = await applyEdit({ file: set.file, loc: variants[0].componentLoc, name: "Component", ops: [{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc } as EditOp], hash: element.hash }, `${set.name}: ${from} → ${name}`);
  return Boolean(response.ok);
}

/** Figma's default for a new property of a type: "Property N", and a value of its kind. */
export function newProperty(properties: PropertyRef[], type: PropertyRef["type"]): PropertyRef {
  const names = new Set(properties.map((property) => property.name));
  let n = properties.length + 1;
  while (names.has(`Property ${n}`)) n += 1;
  const fallback = { text: "Text", boolean: true, swap: "icon-star-01-line", slot: undefined }[type];
  return { name: `Property ${n}`, type, ...(fallback !== undefined ? { default: fallback } : {}) };
}

/** The `properties={{ … }}` value of a component or set (null: none, the prop goes). */
const propertiesValue = (properties: PropertyRef[]) => Object.fromEntries(properties.map((property) => [property.name, { type: property.type, ...(property.default !== undefined ? { default: property.default } : {}), ...(property.preferred ? { preferred: property.preferred } : {}) }]));

/** Writes a component's (or set's) properties, one edit; an empty list removes the prop. */
export function setComponentProperties(owner: { file: string; loc: string; name: string }, properties: PropertyRef[], label: string): Promise<boolean> {
  return write(owner.file, owner.loc, [properties.length ? { op: "setProp", name: "properties", value: expression(propertiesValue(properties)) } : { op: "removeProp", name: "properties" }], `${owner.name} · ${label}`);
}

/** The layer attribute that binds a layer to a property of each type (dialect.mjs PROPERTY_BINDINGS). */
export const BINDING_OF: Readonly<Record<PropertyRef["type"], string>> = { text: "data-prop-text", boolean: "data-prop-visible", swap: "data-prop-swap", slot: "data-prop-slot" };

/** Figma's Apply component property on a layer of a main: binds it to `property` (null unbinds), one edit. */
export function bindLayer(selection: NodeSelection, type: PropertyRef["type"], property: string | null): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return Promise.resolve(false);
  const attr = BINDING_OF[type];
  return write(at.file, at.loc, [property ? { op: "setProp", name: attr, value: { kind: "string", value: property } } : { op: "removeProp", name: attr }], property ? `${selection.name} → property ${property}` : `${selection.name} unbound`);
}

/** An instance's variant values and property values (`<Use variant props>`), one edit; empty objects remove the props. */
export function setInstanceValues(selection: NodeSelection, variant: Record<string, string>, props: Record<string, unknown>): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return Promise.resolve(false);
  const ops: EditOp[] = [
    Object.keys(variant).length ? { op: "setProp", name: "variant", value: expression(variant) } : { op: "removeProp", name: "variant" },
    Object.keys(props).length ? { op: "setProp", name: "props", value: expression(props) } : { op: "removeProp", name: "props" },
  ];
  return write(at.file, at.loc, ops, "Instance properties");
}

/* ── F7b · an instance's overrides (spec docs/research/studio-f7b-instance-overrides-spec-2026-10-19.md) ─────────── */

type TreeNode = { loc: string; name: string; props: Record<string, { kind: string; value?: unknown; fields?: Record<string, { kind: string; value?: unknown; fields?: unknown }> }>; children: Array<{ kind: string; value?: unknown }> };
type Literal = string | number | boolean;
/** An instance's overrides (`<Use overrides>`): layer path → literal props. */
export type OverridesTable = Record<string, Record<string, Literal>>;

/** A node's literal object prop as a table (`overrides`), or its fields (`variant`, `props`). */
function literalTable(value: TreeNode["props"][string] | undefined): OverridesTable {
  const out: OverridesTable = {};
  if (value?.kind !== "object" || !value.fields) return out;
  for (const [path, layer] of Object.entries(value.fields)) {
    const fields = (layer as { kind?: string; fields?: Record<string, { kind: string; value?: unknown }> }).fields;
    if (!fields) continue;
    const own: Record<string, Literal> = {};
    for (const [name, field] of Object.entries(fields)) if (field.kind === "literal" && ["string", "number", "boolean"].includes(typeof field.value)) own[name] = field.value as Literal;
    if (Object.keys(own).length) out[path] = own;
  }
  return out;
}
const literalFields = (value: TreeNode["props"][string] | undefined): Record<string, Literal> =>
  value?.kind === "object" && value.fields ? Object.fromEntries(Object.entries(value.fields).flatMap(([name, field]) => (field.kind === "literal" ? [[name, field.value as Literal]] : []))) : {};
/** A literal as a prop value: text as a string, numbers and switches as an expression. */
const literalValue = (value: Literal) => (typeof value === "string" ? { kind: "string" as const, value } : { kind: "expression" as const, code: JSON.stringify(value) });

/** The page's tree, its components model and the `<Use>` at `loc` (null when there is none). */
async function instanceAt(file: string, loc: string) {
  const [engine, source] = await Promise.all([loadEngine(), studioApi.source(file)]);
  const tree = engine.parsePage(source.content, { components: new Set(zenComponents) });
  const model = { mains: engine.localComponents(tree.board), sets: engine.componentSets(tree.board) };
  let use: TreeNode | null = null;
  engine.eachElement(tree.board, (node) => { if ((node as TreeNode).loc === loc && (node as TreeNode).name === "Use") use = node as TreeNode; });
  return { engine, tree, model, use: use as TreeNode | null };
}

/** How many layers an instance overrides (Figma's changed layers), for its panel. */
export function overrideCount(use: { props: Record<string, unknown> } | null | undefined): number {
  return Object.keys(literalTable((use?.props as TreeNode["props"] | undefined)?.overrides)).length;
}

/** Figma's Reset all changes on an instance: its variant and property values and its layers' overrides go, one edit. */
export function resetInstance(selection: NodeSelection): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return Promise.resolve(false);
  return write(at.file, at.loc, [{ op: "removeProp", name: "variant" }, { op: "removeProp", name: "props" }, { op: "removeProp", name: "overrides" }], "Reset all changes");
}

/**
 * Figma's Push changes to main component: each layer the instance overrides takes those props in the main — its
 * words (setText), its props, a nested instance's variant and property values — and a layer inside a component or a
 * nested instance goes into that layer's own `overrides`; the instance keeps none. One edit, one ⌘Z; every other
 * instance follows the main.
 */
export async function pushChangesToMain(selection: NodeSelection): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  const { engine, tree, model, use } = await instanceAt(at.file, at.loc);
  if (!use) return fail("Select an instance of a component on this page");
  const table = literalTable(use.props.overrides);
  if (!Object.keys(table).length) return fail("This instance has no changes of its layers to push");
  const resolved = engine.resolveInstance(tree, use);
  const main = model.mains.find((entry) => entry.id === resolved?.main.id);
  if (!main) return fail("Its main component is not on this page");
  const byPath = new Map([...engine.mainLayerPaths(main as never, model)].map(([node, path]) => [path, node as unknown as TreeNode]));
  const opsByLoc: Record<string, EditOp[]> = {};
  const add = (loc: string, op: EditOp) => { (opsByLoc[loc] ??= []).push(op); };
  const inner = new Map<string, { node: TreeNode; table: OverridesTable }>();
  // What the main cannot take (words of a layer whose text is not written there, a path it no longer has) stays on the
  // instance.
  const left: OverridesTable = {};
  const keep = (path: string, name: string, value: Literal) => { left[path] = { ...(left[path] ?? {}), [name]: value }; };
  for (const [path, props] of Object.entries(table)) {
    const node = byPath.get(path);
    if (node) {
      const nested: Record<"variant" | "props", Record<string, Literal>> = { variant: {}, props: {} };
      for (const [name, value] of Object.entries(props)) {
        const dot = /^(variant|props)\.(.+)$/.exec(name);
        if (dot) nested[dot[1] as "variant" | "props"][dot[2]] = value;
        else if (name === "children") {
          if (node.children.some((child) => child.kind === "text")) add(node.loc, { op: "setText", index: 0, value: String(value) });
          else keep(path, name, value);
        } else add(node.loc, { op: "setProp", name, value: literalValue(value) } as EditOp);
      }
      for (const kind of ["variant", "props"] as const) {
        if (Object.keys(nested[kind]).length) add(node.loc, { op: "setProp", name: kind, value: expression({ ...literalFields(node.props[kind]), ...nested[kind] }) });
      }
      continue;
    }
    // A layer inside one the main does not list (a component's own, a nested instance's): that layer's overrides.
    const leaf = [...byPath].filter(([known, candidate]) => path.startsWith(`${known}/`) && !candidate.children.some((child) => child.kind === "element")).sort((a, b) => b[0].length - a[0].length)[0];
    if (!leaf) { for (const [name, value] of Object.entries(props)) keep(path, name, value); continue; }
    const [known, holder] = leaf;
    const entry = inner.get(holder.loc) ?? { node: holder, table: literalTable(holder.props.overrides) };
    const rest = path.slice(known.length + 1);
    entry.table[rest] = { ...(entry.table[rest] ?? {}), ...props };
    inner.set(holder.loc, entry);
  }
  for (const { node, table: own } of inner.values()) add(node.loc, { op: "setProp", name: "overrides", value: expression(own) });
  add(use.loc, Object.keys(left).length ? { op: "setProp", name: "overrides", value: expression(left) } : { op: "removeProp", name: "overrides" });
  const element = await studioApi.element(at.file, at.loc);
  if (!element) return fail("The instance is no longer there — select it again");
  const name = resolved?.set?.name ?? resolved?.main.name ?? "its main component";
  const response = await applyEdit({ file: at.file, loc: at.loc, name: "Use", ops: [{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc } as EditOp], hash: element.hash }, `Push changes to ${name}`);
  const kept = Object.keys(left);
  if (response.ok) inspectorStatus.set(kept.length ? "neutral" : "positive", kept.length ? `Pushed to ${name}; kept on this instance: ${kept.join(", ")}` : `Pushed to ${name}: every instance shows the change`);
  return response.ok;
}

/** A layer inside an instance of a page's own component, as its part panel shows it (inspector/LocalPartPanel.tsx). */
export type LocalLayer = {
  /** The instance's overrides (all its layers). */
  table: OverridesTable;
  /** This layer's own overrides. */
  own: Record<string, Literal>;
  /** The instance's own variant and property values (`<Use variant props>`). */
  instance: { name: string; variant: Record<string, string>; props: Record<string, unknown> };
  /** The layer in its main: its tag, its words (a Text's first text child), the text property it is bound to. */
  name: string;
  words: string | null;
  boundText: string | null;
  /** Whether the main hides it (`hidden` on the main's layer). */
  hiddenInMain: boolean;
  /** A nested instance: its set (or main) and the values it shows here (the main's, then this instance's overrides). */
  nested: { setId: string | null; mainId: string; variant: Record<string, string>; values: Record<string, unknown> } | null;
  /** Below a component of the library (its own nested layer, as Figma's): the path inside it, else null. */
  inner: string | null;
};

/** The layer at `path` inside the instance at `file:loc` (through nested instances), or null. */
export async function localLayerAt(file: string, loc: string, path: string): Promise<LocalLayer | null> {
  const { engine, tree, model, use } = await instanceAt(file, loc);
  if (!use) return null;
  const table = literalTable(use.props.overrides);
  const mainOf = (node: TreeNode) => {
    const resolved = engine.resolveInstance(tree, node);
    return model.mains.find((entry) => entry.id === resolved?.main.id) ?? null;
  };
  let main = mainOf(use);
  let rest = path;
  let found: TreeNode | null = null;
  let inner: string | null = null;
  for (let depth = 0; main && depth < 8 && !found; depth++) {
    const byPath = new Map([...engine.mainLayerPaths(main as never, model)].map(([node, at]) => [at, node as unknown as TreeNode]));
    const exact = byPath.get(rest);
    if (exact) { found = exact; break; }
    const leaf = [...byPath].filter(([known, node]) => rest.startsWith(`${known}/`) && !node.children.some((child) => child.kind === "element")).sort((a, b) => b[0].length - a[0].length)[0];
    if (!leaf) return null;
    if (leaf[1].name !== "Use") { found = leaf[1]; inner = rest.slice(leaf[0].length + 1); break; }
    rest = rest.slice(leaf[0].length + 1);
    main = mainOf(leaf[1]);
  }
  if (!found) return null;
  const own = table[path] ?? {};
  const resolved = engine.resolveInstance(tree, use);
  const textChild = found.children.find((child) => child.kind === "text");
  const bound = found.props["data-prop-text"];
  let nested: LocalLayer["nested"] = null;
  if (found.name === "Use" && !inner) {
    const resolvedNested = engine.resolveInstance(tree, found);
    if (resolvedNested?.main.id) {
      const variant: Record<string, string> = { ...resolvedNested.variant };
      const values: Record<string, unknown> = { ...resolvedNested.values };
      for (const [name, value] of Object.entries(own)) {
        const dot = /^(variant|props)\.(.+)$/.exec(name);
        if (dot?.[1] === "variant") variant[dot[2]] = String(value);
        else if (dot) values[dot[2]] = value;
      }
      nested = { setId: resolvedNested.set?.id ?? null, mainId: resolvedNested.main.id, variant, values };
    }
  }
  return {
    table,
    own,
    instance: { name: resolved?.set?.name ?? resolved?.main.name ?? "Instance", variant: literalFields(use.props.variant) as Record<string, string>, props: literalFields(use.props.props) },
    name: found.name,
    words: typeof textChild?.value === "string" ? textChild.value.trim() : null,
    boundText: bound?.kind === "literal" && typeof bound.value === "string" ? bound.value : null,
    hiddenInMain: found.props.hidden?.kind === "literal" && found.props.hidden.value === true,
    nested,
    inner,
  };
}

/** The instance's overrides become `next` (removed when empty): one edit. */
export function setInstanceOverrides(selection: NodeSelection, next: OverridesTable, label: string): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return Promise.resolve(false);
  const op: EditOp = Object.keys(next).length ? { op: "setProp", name: "overrides", value: expression(next) } : { op: "removeProp", name: "overrides" };
  return write(at.file, at.loc, [op], label);
}
