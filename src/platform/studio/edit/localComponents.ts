import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine, zenComponents } from "../builder/engine";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { displayName } from "../select/layerMeta";
import { multiSelection, selectLayers } from "../select/multiSelection";
import { findBySrc, selectHit } from "../select/picker";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit } from "../slots/actions";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";

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
  const hit = world ? findBySrc(world, selection.src)[selection.instance] : undefined;
  const base = displayName(selection.name, hit?.props, selection.src);
  const names = new Set(mains.map((main) => main.name));
  const ids = new Set(mains.map((main) => main.id));
  let name = base;
  for (let n = 2; names.has(name); n += 1) name = `${base} ${n}`;
  let id = slug(name);
  for (let n = 2; ids.has(id); n += 1) id = `${slug(name)}-${n}`;
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
