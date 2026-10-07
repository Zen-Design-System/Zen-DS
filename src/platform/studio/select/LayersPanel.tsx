import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { IconButton } from "../../../components/Button";
import { Search } from "../../../components/Search";
import { plural } from "../../../components/Text";
import { ToggleButton } from "../../../components/Toggle";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { IconName } from "../../../icons/generated/names";
import type { PlatformPage } from "../../PlatformExamples";
import { useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { frameLabel } from "../inspector/frames";
import { focusSlot } from "../slots/actions";
import { layerSlotsOf } from "../slots/layers";
import { studioStore, useStudio } from "../store";
import { elementFiber, hitOf, hostsOf, isHostFiber, isPortalFiber, layerHover, nameOf, onSourceUpdate, panelOf, rectOf, rendersPortal, shortSrc, srcOf, type Fiber, type FiberHit } from "./picker";
import { classHint, elementAt, isComponentFiber, partChildren, type PartHit } from "./parts";
import { toggleLayer, useExtraSelection } from "./multiSelection";
import { wrapperCandidate } from "./resize";
import { mapSrc, onStudioWrite } from "./remap";
import { pressLayersRow } from "../edit/layersDrag";
import "./select.css";

/*
 * Layers (spec §5): the annotated JSX tree of the page, grouped by frame. Built from the fibers on demand (page change,
 * HMR update, DOM changes, the refresh button); rows render lazily and never more than MAX_ROWS at once.
 *
 * Less noise than the raw tree: playground panels are groups named by their title ("Button / Main"), anonymous
 * single-child div/section wrappers and the wrappers around a panel fold away ("Show all layers" brings them back),
 * and elements that render nothing on the canvas (portalled, null) are left out. A component row also lists its
 * internal parts (read-only) under "Parts", computed when that row is opened. A component with content slots (Card,
 * ModalForm, ListItem…) shows a "slot" row per slot between it and its children ("Content", "Empty" when it holds
 * nothing), like Figma's slot frame in an instance (slots/layers.ts sorts the children into them).
 */

const MAX_ROWS = 500;
const SHOW_ALL_KEY = "zen-studio:layers-show-all";

/**
 * frame / panel: groups; node: an annotated JSX element; parts: a component's "Parts" folder; part: one internal part;
 * slot: a content slot of a component (its children in that slot under it).
 */
type LayerKind = "frame" | "panel" | "node" | "parts" | "part" | "slot";

type LayerNode = {
  id: string;
  kind: LayerKind;
  name: string;
  src: string | null;
  frameId: string;
  isComponent: boolean;
  instance: number;
  count: number;
  depth: number;
  children: LayerNode[];
  fiber: Fiber | null;
  frame: Element | null;
  parent: LayerNode | null;
  /** panel: the panel's DOM node (hover outline, scroll into view). */
  element?: Element;
  /** node: renders DOM nodes or components of its own (gets a "Parts" row). */
  hasParts?: boolean;
  /** node: its "Parts" folder, made when first shown. */
  partsFolder?: LayerNode;
  /** parts / part: the element they belong to. */
  owner?: LayerNode;
  /** part: the resolved part. */
  part?: PartHit;
  /** Caption beside the name (a DOM part's class). */
  meta?: string;
  /** panel: the innermost element folded into it (what a click on the panel's own area selects on the canvas). */
  stand?: LayerNode;
  /** parts / part: children not computed yet. */
  lazy?: boolean;
  /** slot: its prop and its container on the canvas (the row's hover outline). */
  slot?: { prop: string; container: Element | null };
  /** node: the src of the Studio wrap Stack folded into this component's row (it takes the component's size). */
  wrap?: string;
};

/** `aliases`: a folded wrapper's id → the panel row that stands for it (selecting the wrapper highlights the panel). */
type Tree = { groups: LayerNode[]; byId: Map<string, LayerNode>; total: number; aliases: Map<string, string> };

const emptyTree: Tree = { groups: [], byId: new Map(), total: 0, aliases: new Map() };

/** A playground panel's title ("Button / Main"): its own h2, else the first heading inside. */
function panelTitle(element: Element) {
  const heading = element.querySelector(":scope > .platform-main-component__title, :scope > h2, :scope > h3") ?? element.querySelector("h2, h3");
  return heading?.textContent?.trim() || "Playground panel";
}

function buildTree(world: Element, page: PlatformPage, showAll: boolean): Tree {
  const root = elementFiber(world);
  if (!root) return emptyTree;
  const groups: LayerNode[] = [];
  const byId = new Map<string, LayerNode>();
  const counts = new Map<string, number>();
  const nodes: LayerNode[] = [];
  // Same element rule as picker.walkAnnotated (a src different from the nearest annotated ancestor's), so instance
  // numbers match findBySrc.
  const visit = (fiber: Fiber | null, parent: LayerNode | null, inherited: string | null, frame: { id: string; element: Element } | null, depth: number) => {
    for (let current = fiber; current; current = current.sibling) {
      if (isPortalFiber(current) || depth > 1500) continue;
      const element = isHostFiber(current) && current.stateNode instanceof Element ? current.stateNode : null;
      const frameId = element?.getAttribute("data-studio-frame");
      if (element && frameId) {
        const group: LayerNode = { id: `frame:${frameId}`, kind: "frame", name: frameLabel(frameId, page), src: null, frameId, isComponent: false, instance: 0, count: 1, depth: 0, children: [], fiber: current, frame: element, parent: null };
        groups.push(group);
        byId.set(group.id, group);
        visit(current.child, group, inherited, { id: frameId, element }, depth + 1);
        continue;
      }
      const panelId = element && parent && frame ? element.getAttribute("data-studio-panel") : null;
      if (panelId && parent && frame && element) {
        const group: LayerNode = { id: `panel:${panelId}`, kind: "panel", name: panelTitle(element), src: null, frameId: frame.id, isComponent: false, instance: 0, count: 1, depth: parent.depth + 1, children: [], fiber: current, frame: frame.element, parent, element };
        parent.children.push(group);
        byId.set(group.id, group);
        visit(current.child, group, inherited, frame, depth + 1);
        continue;
      }
      const src = srcOf(current);
      if (src && src !== inherited) {
        const instance = counts.get(src) ?? 0;
        counts.set(src, instance + 1);
        // Rendering nothing on the canvas (null): no layer; its subtree is still counted for instances. An overlay owner
        // (a Dialog: a portal, open or closed) is a layer, as Figma lists an overlay (plan WP-F).
        if (parent && frame && (hostsOf(current).length || rendersPortal(current))) {
          const node: LayerNode = { id: `${src}#${instance}`, kind: "node", name: nameOf(current), src, frameId: frame.id, isComponent: typeof current.type !== "string", instance, count: 0, depth: parent.depth + 1, children: [], fiber: current, frame: frame.element, parent };
          parent.children.push(node);
          byId.set(node.id, node);
          nodes.push(node);
          visit(current.child, node, src, frame, depth + 1);
        } else {
          visit(current.child, null, src, frame, depth + 1);
        }
        continue;
      }
      // A DOM node or a named component inside a component (not annotated): the component has parts of its own.
      if (parent?.kind === "node" && parent.isComponent && !parent.hasParts && (isHostFiber(current) || isComponentFiber(current))) parent.hasParts = true;
      visit(current.child, parent, inherited, frame, depth + 1);
    }
  };
  try {
    visit(root.child, null, null, null, 0);
  } catch {
    // React internals changed: show what was collected.
  }
  for (const node of nodes) node.count = counts.get(node.src ?? "") ?? 1;
  const aliases = new Map<string, string>();
  let total = 0;
  const relink = (node: LayerNode, parent: LayerNode) => {
    node.parent = parent;
    node.depth = parent.depth + 1;
    if (node.kind === "node") total += 1;
    node.children.forEach((child) => relink(child, node));
  };
  if (!showAll) groups.forEach(collapseWrappers);
  for (const group of groups) {
    if (!showAll) group.children = simplify(group.children, aliases);
    attachSlots(group.children, byId);
    group.children.forEach((child) => relink(child, group));
  }
  return { groups, byId, total, aliases };
}

/** The first DOM node of a layer (where it sits on the canvas), for sorting it into a slot. */
function firstHostOf(node: LayerNode): Element | undefined {
  if (node.kind === "panel") return node.element;
  return node.fiber ? hostsOf(node.fiber)[0] : undefined;
}

/*
 * Puts a "slot" row between each slot component and its children (slots/layers.ts: a child belongs to the slot whose
 * container holds its first DOM node). Children outside every slot (JSX in another prop) stay directly under the
 * component. Depths and parents are set by the relink that follows.
 */
function attachSlots(nodes: LayerNode[], byId: Map<string, LayerNode>) {
  for (const node of nodes) {
    attachSlots(node.children, byId);
    if (node.kind !== "node" || !node.isComponent) continue;
    const groups = layerSlotsOf(node.name, node.fiber, node.children.map(firstHostOf));
    if (!groups) continue;
    const claimed = new Set<LayerNode>();
    const rows = groups.map((group): LayerNode => {
      const members = group.members.map((index) => node.children[index]);
      members.forEach((member) => claimed.add(member));
      const row: LayerNode = {
        id: `${node.id}/slot:${group.prop}`, kind: "slot", name: group.name, src: node.src, frameId: node.frameId, isComponent: false, instance: node.instance, count: 0,
        depth: node.depth + 1, children: members, fiber: node.fiber, frame: node.frame, parent: node, owner: node, meta: members.length ? undefined : "Empty",
        slot: { prop: group.prop, container: group.container },
      };
      byId.set(row.id, row);
      return row;
    });
    node.children = [...rows, ...node.children.filter((child) => !claimed.has(child))];
  }
}

/** What a Studio wrap Stack renders with (select/resize.ts studioWrapper reads the same from the source). */
const WRAP_PROPS = new Set(["direction", "align", "fillChildren", "width", "height", "children"]);

/**
 * A Stack the Studio wrapped one library component in to size it (Fill, Fixed: GĐ4 M4): a fillChildren Stack with no
 * other prop, whose only element is that component.
 */
function isStudioWrap(node: LayerNode, only: LayerNode): boolean {
  if (node.name !== "Stack" || !node.isComponent || only.kind !== "node" || !only.isComponent || !only.fiber || !node.fiber) return false;
  const host = hostsOf(only.fiber)[0];
  if (!host || wrapperCandidate(host) !== node.src) return false;
  const props = (node.fiber.memoizedProps ?? {}) as Record<string, unknown>;
  return props.fillChildren === true && Object.keys(props).every((key) => WRAP_PROPS.has(key) || key.startsWith("data-"));
}

/*
 * Folds the wrappers that only add depth: an anonymous div/section with a single child, any element whose single
 * child is a playground panel (the panel group stands for it), and the Stack the Studio wrapped a component in to size
 * it (its row stands for both, as Figma shows an instance's sizing on the instance). They stay selectable on the canvas.
 */
function simplify(nodes: LayerNode[], aliases: Map<string, string>): LayerNode[] {
  return nodes.flatMap((node) => {
    node.children = simplify(node.children, aliases);
    if (node.kind !== "node" || node.children.length !== 1) return [node];
    const only = node.children[0];
    if (only.kind === "panel") {
      only.stand ??= node;
      aliases.set(node.id, only.id);
      return [only];
    }
    if (node.name === "div" || node.name === "section") return [only];
    if (isStudioWrap(node, only)) {
      only.wrap = node.src ?? undefined;
      aliases.set(node.id, only.id);
      return [only];
    }
    return [node];
  });
}

const fileOf = (src: string | null) => (src ? src.replace(/:\d+:\d+$/, "") : "");

/*
 * A frame's content starts under platform wrappers (ZenProvider › div › div from the showcase) that are not part of the
 * example. The single-child chain at the top of a frame is followed to the content; the links of the chain written in
 * another file than that content are left out, so the example's own component is the frame's first layer. The wrappers
 * stay selectable on the canvas.
 */
function collapseWrappers(group: LayerNode) {
  let end: LayerNode = group;
  while (end.children.length === 1) end = end.children[0];
  if (end === group || !end.src) return;
  const contentFile = fileOf(end.src);
  let top = group.children;
  while (top.length === 1 && top[0].src && fileOf(top[0].src) !== contentFile && top[0].children.length === 1) top = top[0].children;
  if (top === group.children) return;
  group.children = top;
  const relink = (node: LayerNode, parent: LayerNode) => {
    node.parent = parent;
    node.depth = parent.depth + 1;
    node.children.forEach((child) => relink(child, node));
  };
  top.forEach((node) => relink(node, group));
}

/** A component row's "Parts" folder (made once per tree). */
function partsFolderOf(node: LayerNode): LayerNode {
  node.partsFolder ??= { id: `${node.id}/parts`, kind: "parts", name: "Parts", src: node.src, frameId: node.frameId, isComponent: false, instance: node.instance, count: 0, depth: node.depth + 1, children: [], fiber: node.fiber, frame: node.frame, parent: node, owner: node, lazy: true };
  node.partsFolder.depth = node.depth + 1;
  return node.partsFolder;
}

const partKey = (path: number[], name: string) => `${path.join(".")}:${name}`;

/** The rows under a node; a "Parts" folder or part computes its parts the first time it is asked. */
function childrenOf(node: LayerNode, byId: Map<string, LayerNode>): LayerNode[] {
  if (node.kind === "node") return node.hasParts ? [partsFolderOf(node), ...node.children] : node.children;
  if (!node.lazy) return node.children;
  node.lazy = false;
  const owner = node.owner;
  const ownerHit = owner?.fiber ? hitOf(owner.fiber) : null;
  const fiber = node.kind === "parts" ? ownerHit?.fiber : node.part?.fiber;
  if (!owner || !ownerHit || !fiber) return node.children;
  const used = new Set<string>();
  node.children = partChildren(ownerHit, fiber).map((hit) => {
    let id = `${owner.id}/part:${partKey(hit.path, hit.name)}`;
    for (let copy = 2; used.has(id); copy++) id = `${owner.id}/part:${partKey(hit.path, hit.name)}~${copy}`;
    used.add(id);
    const child: LayerNode = {
      id, kind: "part", name: hit.name, src: owner.src, frameId: owner.frameId, isComponent: hit.isComponent, instance: owner.instance, count: 0,
      depth: node.depth + 1, children: [], fiber: hit.fiber, frame: owner.frame, parent: node, owner, part: hit,
      meta: hit.isComponent ? undefined : classHint(hit.element) ?? undefined, lazy: true,
    };
    byId.set(id, child);
    return child;
  });
  return node.children;
}

type Row = { node: LayerNode; open: boolean; hasChildren: boolean };

function flatten(tree: Tree, isOpen: (node: LayerNode) => boolean, query: string): { rows: Row[]; hidden: number } {
  const rows: Row[] = [];
  let hidden = 0;
  const needle = query.trim().toLowerCase();
  const matches = new Set<LayerNode>();
  if (needle) {
    // A match shows with its ancestors, expanded.
    for (const node of tree.byId.values()) {
      // Parts carry their owner's src: they match by name only. Slot rows show when a layer in them matches.
      if (node.kind === "frame" || node.kind === "parts" || node.kind === "slot" || !(node.name.toLowerCase().includes(needle) || (node.kind !== "part" && shortSrc(node.src ?? "").toLowerCase().includes(needle)))) continue;
      for (let current: LayerNode | null = node; current && !matches.has(current); current = current.parent) matches.add(current);
    }
  }
  const walk = (nodes: LayerNode[]) => {
    for (const node of nodes) {
      if (needle && !matches.has(node)) continue;
      if (rows.length >= MAX_ROWS) { hidden += 1; continue; }
      // A part row looks one level ahead (its own parts) to know whether it opens.
      const children = node.kind === "part" || isOpen(node) || needle ? childrenOf(node, tree.byId) : node.kind === "node" && node.hasParts ? [partsFolderOf(node)] : node.children;
      const hasChildren = children.length > 0 || (node.kind === "parts" && Boolean(node.lazy));
      const open = hasChildren && (needle ? children.some((child) => matches.has(child)) : isOpen(node));
      rows.push({ node, open, hasChildren });
      if (open) walk(children);
    }
  };
  walk(tree.groups);
  return { rows, hidden };
}

function hitForNode(node: LayerNode): FiberHit | null {
  if (node.kind === "frame") return node.frame ? { src: "", name: node.name, hosts: [node.frame], isComponent: false, props: {} } : null;
  if (node.kind === "panel") return node.element ? { src: "", name: node.name, hosts: [node.element], isComponent: false, props: {} } : null;
  if (node.kind === "part") return node.part?.hosts.every((host) => host.isConnected) ? node.part : null;
  if (node.kind === "parts") return node.owner?.fiber ? hitOf(node.owner.fiber) : null;
  // A slot: its container on the canvas (else its component, when the slot renders nothing while empty).
  if (node.kind === "slot") return node.slot?.container?.isConnected ? { src: "", name: node.name, hosts: [node.slot.container], isComponent: false, props: {} } : node.owner?.fiber ? hitOf(node.owner.fiber) : null;
  return node.fiber ? hitOf(node.fiber) : null;
}

/** Selects a layer (a part: with its owner as the element) and brings it into view; a panel group only scrolls to it. */
function selectNode(node: LayerNode) {
  const hit = hitForNode(node);
  if (node.kind === "frame") studioStore.setState({ selection: { kind: "frame", frameId: node.frameId } });
  else if (node.kind === "part" && node.owner?.src && node.part) {
    const owner = node.owner;
    const ownerHit = owner.fiber ? hitOf(owner.fiber) : null;
    studioStore.setState({
      selection: { kind: "node", src: node.owner.src, name: owner.name, frameId: owner.frameId, panelId: panelOf(ownerHit?.hosts[0]), instance: owner.instance, part: { path: node.part.path, name: node.part.name } },
    });
  } else if (node.kind === "node" && node.src) {
    studioStore.setState({
      selection: { kind: "node", src: node.src, name: node.name, frameId: node.frameId, panelId: panelOf(hit?.hosts[0]), instance: node.instance },
    });
  } else if (node.kind === "slot" && node.owner?.src && node.slot) {
    // A slot is part of its component: the component is selected and the inspector shows that slot's block.
    const owner = node.owner;
    const ownerHit = owner.fiber ? hitOf(owner.fiber) : null;
    studioStore.setState({
      selection: { kind: "node", src: owner.src!, name: owner.name, frameId: owner.frameId, panelId: panelOf(ownerHit?.hosts[0]), instance: owner.instance },
    });
    focusSlot(owner.src!, node.slot.prop);
  }
  const rect = hit ? rectOf(hit.hosts) : null;
  if (rect) canvasApi.ensureVisible(rect);
}

/** Frames, playground panels, slots and first-level elements with child elements open by default; parts never (computed on demand). */
const defaultOpen = (node: LayerNode) => node.kind === "frame" || node.kind === "panel" || node.kind === "slot" || (node.kind === "node" && node.depth <= 1 && node.children.length > 0);

function rowIcon(node: LayerNode): IconName {
  if (node.kind === "frame") return "icon-layout-alt-01-line";
  if (node.kind === "panel") return "icon-sliders-04-line";
  if (node.kind === "parts") return "icon-layers-three-01-line";
  if (node.kind === "slot") return "icon-grid-dots-blank-line";
  return node.isComponent ? "icon-cube-line" : "icon-code-02-line";
}

function rowTitle(node: LayerNode) {
  if (node.kind === "part") return `${node.name}${node.meta ? ` .${node.meta}` : ""}: part of ${node.owner?.name ?? "the element"} (read-only)`;
  if (node.kind === "parts") return `What ${node.owner?.name ?? "this component"} renders inside itself (read-only)`;
  if (node.kind === "panel") return `Playground panel: ${node.name}`;
  if (node.kind === "slot") return `${node.name}: a slot of ${node.owner?.name ?? "the component"}${node.children.length ? "" : " (empty)"}`;
  if (node.wrap) return `${shortSrc(node.src ?? "")} · in a Stack that sets its size (${shortSrc(node.wrap)})`;
  return node.src ? shortSrc(node.src) : undefined;
}

function readShowAll() {
  try {
    return window.localStorage.getItem(SHOW_ALL_KEY) === "true";
  } catch {
    return false;
  }
}

/** The Layers tab of the left panel. */
export function LayersPanel() {
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const selection = useStudio((state) => state.selection);
  const extras = useExtraSelection();
  const extraIds = useMemo(() => new Set(extras.map((layer) => `${layer.src}#${layer.instance}`)), [extras]);
  const [tree, setTree] = useState<Tree>(emptyTree);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [openState, setOpenState] = useState<Map<string, boolean>>(() => new Map());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(readShowAll);
  const server = useStudioServer();
  const treeRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  // Build (and rebuild) the tree; retried while the page is still rendering.
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    const build = () => {
      const world = canvasApi.getWorldElement();
      const next = world ? buildTree(world, page, showAll) : emptyTree;
      setTree(next);
      if (next.groups.length || tries++ > 20) setReady(true);
      else timer = window.setTimeout(build, 300);
    };
    build();
    return () => window.clearTimeout(timer);
  }, [page, collection, version, showAll]);

  useEffect(() => onSourceUpdate(refresh), [refresh]);
  // A write moves the layers below the change: keep their open/closed state with them.
  useEffect(() => onStudioWrite((write) => {
    setOpenState((current) => {
      let next: Map<string, boolean> | null = null;
      for (const [id, open] of current) {
        const match = /^(.*)#(\d+)$/.exec(id);
        if (!match || id.startsWith("frame:")) continue;
        const moved = mapSrc(match[1], write);
        if (moved === match[1]) continue;
        next ??= new Map(current);
        next.delete(id);
        if (moved) next.set(`${moved}#${match[2]}`, open);
      }
      return next ?? current;
    });
  }), []);
  // DOM changes rebuild the tree while the panel is visible; a hidden panel (Pages tab) rebuilds when shown again.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const world = canvasApi.getWorldElement();
    const root = rootRef.current;
    if (!world || !root) return undefined;
    let timer = 0;
    let visible = true;
    let dirty = false;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && dirty) { dirty = false; refresh(); }
    });
    visibility.observe(root);
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (visible) refresh(); else dirty = true; }, 700);
    });
    observer.observe(world, { subtree: true, childList: true });
    return () => { observer.disconnect(); visibility.disconnect(); window.clearTimeout(timer); };
  }, [refresh, ready, page]);
  useEffect(() => () => layerHover.set(null), []);
  // Shown (Layers tab) or hidden (Pages tab): the selected row is revealed when the panel is visible.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const visibility = new IntersectionObserver(([entry]) => setShown(Boolean(entry?.isIntersecting)));
    visibility.observe(root);
    return () => visibility.disconnect();
  }, []);

  const part = selection?.kind === "node" ? selection.part : undefined;
  const selectionId = selection ? (selection.kind === "frame" ? `frame:${selection.frameId}` : `${selection.src}#${selection.instance}${part ? `/part:${partKey(part.path, part.name)}` : ""}`) : null;
  // A folded panel wrapper shows as its panel row.
  const selectedId = selectionId ? tree.aliases.get(selectionId) ?? selectionId : null;

  // Reveal the selection: open its ancestors, then scroll its row into view. A part's rows are computed on the way
  // down from its owner's "Parts" folder, following the DOM node the part starts at.
  useEffect(() => {
    let node = selectedId ? tree.byId.get(selectedId) : undefined;
    const opens: LayerNode[] = [];
    if (!node && part && selection?.kind === "node") {
      const owner = tree.byId.get(`${selection.src}#${selection.instance}`);
      const ownerHit = owner?.fiber ? hitOf(owner.fiber) : null;
      const target = ownerHit ? elementAt(ownerHit, part.path) : null;
      if (!owner?.hasParts || !target) return;
      const folder = partsFolderOf(owner);
      opens.push(folder);
      let level = childrenOf(folder, tree.byId);
      for (let depth = 0; depth < 80 && level.length && !node; depth++) {
        node = level.find((candidate) => candidate.part && candidate.part.name === part.name && partKey(candidate.part.path, candidate.part.name) === partKey(part.path, part.name));
        if (node) break;
        const next = level.find((candidate) => candidate.part?.hosts.some((host) => host === target || host.contains(target)));
        if (!next) break;
        opens.push(next);
        level = childrenOf(next, tree.byId);
      }
    }
    if (!node) return;
    for (let parent = node.parent; parent; parent = parent.parent) opens.push(parent);
    setOpenState((current) => {
      let next: Map<string, boolean> | null = null;
      for (const parent of opens) {
        if (current.get(parent.id) === false || (!current.has(parent.id) && !defaultOpen(parent))) {
          next ??= new Map(current);
          next.set(parent.id, true);
        }
      }
      return next ?? current;
    });
    setFocusId(node.id);
  }, [selectedId, tree]); // eslint-disable-line react-hooks/exhaustive-deps -- selection and part are read with selectedId

  const isOpen = useCallback((node: LayerNode) => openState.get(node.id) ?? defaultOpen(node), [openState]);
  const { rows, hidden } = useMemo(() => flatten(tree, isOpen, query), [tree, isOpen, query]);

  // Centre the selected row once per selection (not again on every rebuild, which would fight the person's scrolling).
  const revealed = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!selectedId) { revealed.current = null; return; }
    if (revealed.current === selectedId || !shown) return;
    const row = treeRef.current?.querySelector(`[data-layer-id="${CSS.escape(selectedId)}"]`);
    if (!row || !row.getClientRects().length) return;
    revealed.current = selectedId;
    row.scrollIntoView({ block: "center" });
  }, [selectedId, rows, shown]);

  const toggle = (node: LayerNode, open?: boolean) => setOpenState((current) => new Map(current).set(node.id, open ?? !isOpen(node)));
  /** Click / Enter / Space on a row: select it; the "Parts" folder opens or closes instead. */
  const activate = (node: LayerNode, event?: MouseEvent) => {
    const target = node.stand ?? node;
    // Shift/⌘+click adds the layer to the selection or takes it out (Figma's multi-select in Layers).
    if (event && (event.shiftKey || event.metaKey || event.ctrlKey) && target.kind === "node" && target.src) {
      toggleLayer({ src: target.src, name: target.name, frameId: target.frameId, panelId: panelOf(hitForNode(target)?.hosts[0]), instance: target.instance });
      return;
    }
    if (node.kind === "parts") toggle(node);
    else selectNode(target);
  };
  const changeShowAll = (next: boolean) => {
    setShowAll(next);
    try {
      window.localStorage.setItem(SHOW_ALL_KEY, String(next));
    } catch {
      // Storage blocked: the choice lasts until reload.
    }
  };

  const focusRow = (id: string) => {
    setFocusId(id);
    treeRef.current?.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(id)}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex((row) => row.node.id === focusId);
    const row = rows[index];
    const move = (to: number) => { const next = rows[Math.max(0, Math.min(rows.length - 1, to))]; if (next) focusRow(next.node.id); };
    switch (event.key) {
      case "ArrowDown": move(index + 1); break;
      case "ArrowUp": move(index - 1); break;
      case "Home": move(0); break;
      case "End": move(rows.length - 1); break;
      case "ArrowRight":
        if (!row?.hasChildren) return;
        if (!row.open) toggle(row.node, true);
        else move(index + 1);
        break;
      case "ArrowLeft":
        if (!row) return;
        if (row.open) toggle(row.node, false);
        else if (row.node.parent) focusRow(row.node.parent.id);
        break;
      case "Enter":
      case " ":
        if (!row) return;
        activate(row.node);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const nothing = ready && tree.groups.length === 0;
  const noAnnotations = ready && tree.groups.length > 0 && tree.total === 0;
  const tabbable = focusId && rows.some((row) => row.node.id === focusId) ? focusId : rows[0]?.node.id;

  return (
    <div ref={rootRef} className="studio-layers">
      <div className="studio-layers__bar">
        <Search size="sm" value={query} onValueChange={setQuery} onClear={() => setQuery("")} placeholder="Find a layer" aria-label="Find a layer" />
        <IconButton icon="icon-refresh-cw-01-line" aria-label="Refresh layers" appearance="flat" level="primary" size="sm" onClick={refresh} />
      </div>
      {tree.groups.length ? (
        <div className="studio-layers__meta">
          <p className={typographyStyles["Caption/Regular"]}>{plural(tree.total, "layer")} in {plural(tree.groups.length, "frame")}</p>
          <label className={`studio-layers__show-all ${typographyStyles["Caption/Regular"]}`}>
            <span>Show all layers</span>
            <ToggleButton size="sm" aria-label="Show all layers" checked={showAll} onCheckedChange={changeShowAll} />
          </label>
        </div>
      ) : null}
      {nothing || noAnnotations ? (
        <div className="studio-layers__empty">
          <EmptyState
            title={nothing ? "No frames on this page yet" : "No layers on this page"}
            compactTitle
            icon="icon-layers-three-01-line"
            headingLevel={3}
          >
            {nothing ? "The canvas is still rendering this page."
              : server.ready && server.writable ? "This page comes from the platform shell, which the Studio does not annotate. Component pages and examples have layers."
                : "Elements carry their source location only on the Studio dev server (zen-studio plugin)."}
          </EmptyState>
        </div>
      ) : query.trim() && !rows.length ? (
        // A search with no match says so and offers the way out, as Pages and Assets do (E2E SE-07).
        <div className="studio-layers__empty">
          <EmptyState title="No layers found" compactTitle icon="icon-search-line" headingLevel={3} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
            Nothing on this page matches “{query.trim()}”.
          </EmptyState>
        </div>
      ) : (
        <div
          ref={treeRef}
          className="studio-layers__tree"
          role="tree"
          aria-label="Layers"
          aria-multiselectable="true"
          onKeyDown={onKeyDown}
          // Drag a row to move the layer (edit/layersDrag.ts); a click still selects.
          onPointerDown={(event) => pressLayersRow(event.nativeEvent, event.currentTarget, (row) => {
            const node = rows.find((entry) => entry.node.id === row.getAttribute("data-layer-id"))?.node;
            return node ? hitForNode(node) : null;
          })}
          onPointerLeave={() => layerHover.set(null)}
        >
          {rows.map(({ node, open, hasChildren }) => (
            <div
              key={node.id}
              role="treeitem"
              aria-level={node.depth + 1}
              aria-expanded={hasChildren ? open : undefined}
              aria-selected={node.id === selectedId || extraIds.has(node.id)}
              tabIndex={node.id === tabbable ? 0 : -1}
              data-layer-id={node.id}
              data-kind={node.kind}
              data-component={node.isComponent || undefined}
              data-wrapped={node.wrap ? "true" : undefined}
              className={`studio-layers__row ${typographyStyles[node.kind === "frame" ? "Body/Small/Bold" : node.kind === "panel" ? "Body/Small/Medium" : "Body/Small/Regular"]}`}
              style={{ ["--studio-depth" as string]: node.depth }}
              onPointerEnter={() => layerHover.set(hitForNode(node))}
              onFocus={() => setFocusId(node.id)}
              onClick={(event) => activate(node, event)}
              title={rowTitle(node)}
            >
              <span
                className="studio-layers__chevron"
                data-open={open || undefined}
                data-leaf={!hasChildren || undefined}
                onClick={(event) => { event.stopPropagation(); toggle(node); }}
                aria-hidden="true"
              >
                <Icon name="icon-chevron-right-line-small" size={16} />
              </span>
              <span className="studio-layers__icon" aria-hidden="true">
                <Icon name={rowIcon(node)} size={16} />
              </span>
              <span className="studio-layers__name">{node.name}</span>
              {node.meta ? <span className={`studio-layers__hint ${typographyStyles["Caption/Regular"]}`}>{node.meta}</span> : null}
              {node.count > 1 ? <span className={`studio-layers__count ${typographyStyles["Caption/Regular"]}`} aria-label={`${node.count} instances`}>×{node.count}</span> : null}
            </div>
          ))}
          {hidden ? <p className={`studio-layers__more ${typographyStyles["Caption/Regular"]}`}>{plural(hidden, "more layer")}: collapse a group or find by name.</p> : null}
        </div>
      )}
    </div>
  );
}
