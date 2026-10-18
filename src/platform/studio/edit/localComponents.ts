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
export type MainRef = { id: string; name: string; componentLoc: string; rootLoc: string; file: string; uses: string[] };

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
  return engine.localComponents(tree).filter((main) => main.id && main.root).map((main) => ({ id: main.id!, name: String(main.name ?? main.id), componentLoc: main.loc, rootLoc: main.root!.loc, file, uses: uses.get(main.id!) ?? [] }));
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

/** Swap instance (Figma's instance menu): the instance shows another main component of the page. */
export async function swapInstance(selection: NodeSelection, to: MainRef): Promise<boolean> {
  const at = parseSrc(selection.src);
  if (!at) return false;
  const use = await studioApi.element(at.file, at.loc);
  if (!use) return false;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: "Use", ops: [{ op: "setProp", name: "of", value: { kind: "string", value: to.id } } as EditOp], hash: use.hash }, `Swap instance → ${to.name}`);
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
