import { tip } from "../shell/ShortcutTip";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, startTransition } from "react";
import { layerIcon, objectIcon } from "./layerNames";
import { COLLAPSE_LAYERS_EVENT, displayName, isLockedFrame, isOwnLock, useLayerMeta } from "./layerMeta";
import { toggleFrame, useFrameSelection } from "./frameSelection";
import { useIconTooltip } from "../../../components/Tooltip";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Search } from "../../../components/Search";
import { plural } from "../../../components/Text";
import { ToggleButton } from "../../../components/Toggle";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { IconName } from "../../../icons/generated/names";
import type { PlatformPage } from "../../PlatformExamples";
import { useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { frameLabel } from "../inspector/frames";
import { focusSlot, selectedSlotOf, useSlotFocusRequest } from "../slots/actions";
import { layerSlotsOf } from "../slots/layers";
import { dataItemRootOf, itemParts, renderedItemTitle } from "../slots/dataItems";
import { itemSelection, useItemSelection } from "../slots/itemSelection";
import { dataSlotsOf } from "../slots/dataSlots";
import { canEdit, studioStore, useStudio } from "../store";
import { componentSchema } from "../inspector/propSchema";
import { elementFiber, hitOf, hostsOf, isHostFiber, isPortalFiber, isTypingTarget, layerHover, nameOf, onSourceUpdate, panelOf, rectOf, rendersPortal, shortSrc, srcOf, type Fiber, type FiberHit } from "./picker";
import { classHint, elementAt, isComponentFiber, nestedPathOf, ownsText, partChildren, partForElement, selectedPartStore, type PartHit } from "./parts";
import { bodyRows, rowCells, TABLE_PARTS } from "../table/tableCells";
import { isTableHit } from "../table/tableSelect";
import { isLayerSelected, selectLayers, toggleLayer, useExtraSelection, type ExtraLayer } from "./multiSelection";
import { wrapperCandidate } from "./resize";
import { mapSrc, onStudioWrite } from "./remap";
import { pressLayersRow } from "../edit/layersDrag";
import { canLockSrc, lockShortcut, setFrameLocked, setLayerLocked } from "../edit/lock";
import { doneRenameRequest, renameFrame, renameLayer, useRenameRequest } from "../edit/rename";
import { RenameField } from "../builder/RenameField";
import { pageFile } from "../builder/store/pageStore";
import { openCanvasMenu, openFrameMenu } from "../shell/CanvasMenu";

import { allHiddenLayers, canHideSrc, hideShortcut, toggleLayerHidden } from "../edit/visibility";
import { hiddenLabel, type HiddenValue } from "../../../../tools/studio/visibility.mjs";
import { layerName, MAIN_FRAME, variantKey, variantRoot } from "../mainComponent/model";
import type { StudioSelection, StudioVariantRef } from "../types";
import "./select.css";

/*
 * Layers (spec §5): the annotated JSX tree of the page, grouped by frame. Built from the fibers on demand (page change,
 * HMR update, DOM and text changes), as Figma's layers follow the canvas with no refresh; rows render lazily and never
 * more than MAX_ROWS at once.
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
type LayerKind = "frame" | "panel" | "node" | "parts" | "part" | "slot" | "variant";

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
  /** variant: a variant of the Main component frame or a layer of it (its DOM node is `element`). */
  variant?: StudioVariantRef;
  /** panel: the innermost element folded into it (what a click on the panel's own area selects on the canvas). */
  stand?: LayerNode;
  /** parts / part: children not computed yet. */
  lazy?: boolean;
  /** slot: its prop and its container on the canvas (the row's hover outline). */
  slot?: { prop: string; container: Element | null };
  /** node: the src of the Studio wrap Stack folded into this component's row (it takes the component's size). */
  wrap?: string;
  /** part: a data-slot item listed under its slot row (the Parts folder gives its own copy another id). */
  dataItem?: boolean;
  /** part: that item's slot prop and place among the slot's items (Shift/⌘+click selects several, itemSelection.ts). */
  item?: { prop: string; index: number };
  /** node (Figma mode): the instance's own layers, computed when first listed (namedParts). */
  named?: LayerNode[];
  /** part: a text layer (named by its words). */
  text?: boolean;
  /** node: its `hidden` on a page made in the Studio (edit/visibility.ts); a row not drawn here has no fiber. */
  hiddenLayer?: HiddenValue;
};

/** `aliases`: a folded wrapper's id → the panel row that stands for it (selecting the wrapper highlights the panel). */
/** `figma`: Layers as Figma lists them (no Parts folders, no empty slots, an instance's own layers named); false with
 *  "Show all layers". */
/** `front`: a page you made lists its layers as Figma does, the front-most (the last written) at the top of each group. */
type Tree = { groups: LayerNode[]; byId: Map<string, LayerNode>; total: number; aliases: Map<string, string>; figma: boolean; front: boolean };

const emptyTree: Tree = { groups: [], byId: new Map(), total: 0, aliases: new Map(), figma: true, front: false };

/** A playground panel's title ("Button / Main"): its own h2, else the first heading inside. */
function panelTitle(element: Element) {
  const heading = element.querySelector(":scope > .platform-main-component__title, :scope > h2, :scope > h3") ?? element.querySelector("h2, h3");
  return heading?.textContent?.trim() || "Playground panel";
}

function buildTree(world: Element, page: PlatformPage, showAll: boolean, local = false): Tree {
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
        // The Main component frame lists its sets, variants and their layers from the DOM (they are not page JSX).
        if (frameId === MAIN_FRAME) variantLayers(element, group, byId);
        else visit(current.child, group, inherited, { id: frameId, element }, depth + 1);
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
      // A DOM node or a named component inside a component (not annotated): the component has parts of its own. A
      // layout layer (Stack, Grid, Box, Container) draws only its own box, a Figma frame's: no "Parts" row (2026-10-13).
      if (parent?.kind === "node" && parent.isComponent && !parent.hasParts && !LAYOUT.has(parent.name) && (isHostFiber(current) || isComponentFiber(current))) parent.hasParts = true;
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
  const pageGroups = groups.filter((group) => group.frameId !== MAIN_FRAME);
  if (!showAll) pageGroups.forEach(collapseWrappers);
  for (const group of groups) {
    if (group.frameId !== MAIN_FRAME) {
      // A page you made: its Screen or Overlay element is the frame's own row (Figma has one frame layer).
      const element = local && group.children.length === 1 ? group.children[0] : null;
      if (element?.kind === "node" && (element.name === "Screen" || element.name === "Overlay")) {
        aliases.set(element.id, group.id);
        group.children = element.children;
      }
      // Layers lists what a click on the canvas selects (user, 2026-10-13: "Panel Layers vẫn hiện các lớp mà click đã
      // bỏ qua"): the wrappers a click passes over fold away.
      if (!showAll) group.children = simplify(group.children, aliases);
      attachSlots(group.children, byId, !showAll);
      addHiddenRows(group, byId);
    }
    group.children.forEach((child) => relink(child, group));
  }
  return { groups, byId, total, aliases, figma: !showAll, front: local };
}

/** Figma's eye on a layer row: on hover, and always while the layer is hidden; ⇧⌘H does the same from the keyboard. Its
 *  name shows as Zen's icon tooltip. The tree's keys reach the rows, so the eye takes no Tab stop. */
function LayerEye({ src, name, hidden }: { src: string; name: string; hidden: boolean }) {
  const { bind, tooltip } = useIconTooltip(tip(hidden ? "Show" : "Hide", hideShortcut));
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        className="studio-layers__eye"
        aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
        {...bind({ onPointerDown: (event: ReactPointerEvent) => event.stopPropagation(), onClick: (event: MouseEvent) => { event.stopPropagation(); void toggleLayerHidden(src, name); } })}
      >
        <Icon name={hidden ? "icon-eye-off-line" : "icon-eye-line"} size={16} />
      </button>
      {tooltip}
    </>
  );
}

/** Figma's padlock on a row: on hover, and always while the layer or frame is locked; ⇧⌘L does the same from the keys. */
function LayerLock({ name, locked, onToggle }: { name: string; locked: boolean; onToggle: () => void }) {
  const { bind, tooltip } = useIconTooltip(tip(locked ? "Unlock" : "Lock", lockShortcut));
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        className="studio-layers__lock"
        aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
        aria-pressed={locked}
        {...bind({ onPointerDown: (event: ReactPointerEvent) => event.stopPropagation(), onClick: (event: MouseEvent) => { event.stopPropagation(); onToggle(); } })}
      >
        <Icon name={locked ? "icon-lock-01-line" : "icon-lock-unlocked-01-line"} size={16} />
      </button>
      {tooltip}
    </>
  );
}

/** The row whose children hold `row`, searched under `root`. */
function holderOf(root: LayerNode, row: LayerNode): LayerNode | null {
  if (root.children.includes(row)) return root;
  for (const child of root.children) { const found = holderOf(child, row); if (found) return found; }
  return null;
}

/**
 * Hidden layers of a page made in the Studio (edit/visibility.ts): one hidden on this frame's layout is not drawn, so it
 * gets a row of its own where it would be (under its nearest listed ancestor, in its slot, after the layer drawn before
 * it), dimmed, as Figma lists a hidden layer; one hidden on the other layout only is drawn and its row says so.
 */
function addHiddenRows(group: LayerNode, byId: Map<string, LayerNode>) {
  for (const layer of allHiddenLayers()) {
    if (layer.frameId !== group.frameId) continue;
    const own = byId.get(`${layer.src}#0`);
    if (own) { own.hiddenLayer = layer.value; own.meta ??= hiddenLabel(layer.value); continue; }
    if (layer.drawn) continue;
    const parent = layer.ancestors.map((src) => byId.get(`${src}#0`)).find((row): row is LayerNode => Boolean(row && row.frameId === group.frameId)) ?? group;
    const slot = layer.prop ? parent.children.find((row) => row.kind === "slot" && row.slot?.prop === layer.prop) : undefined;
    const before = layer.after ? byId.get(`${layer.after}#0`) : undefined;
    const holder = (before ? holderOf(slot ?? parent, before) : null) ?? slot ?? parent;
    const row: LayerNode = { id: `${layer.src}#0`, kind: "node", name: layer.name, src: layer.src, frameId: group.frameId, isComponent: true, instance: 0, count: 1, depth: 0, children: [], fiber: null, frame: group.frame, parent: holder, hiddenLayer: layer.value, meta: hiddenLabel(layer.value) };
    const at = before ? holder.children.indexOf(before) + 1 : 0;
    holder.children.splice(at, 0, row);
    byId.set(row.id, row);
  }
}

/** The Main component frame's layers: each component, its Figma sets, their variants and the elements inside them. */
function variantLayers(frame: Element, group: LayerNode, byId: Map<string, LayerNode>) {
  const add = (node: LayerNode, parent: LayerNode) => { parent.children.push(node); byId.set(node.id, node); return node; };
  const layer = (ref: StudioVariantRef, element: Element, parent: LayerNode) => {
    const part = Array.from(element.classList).find((name) => /^zen-[a-z0-9-]+__[a-z0-9-]+$/.test(name));
    const node = add({ id: `variant:${variantKey(ref)}`, kind: "variant", name: ref.name, src: null, frameId: MAIN_FRAME, isComponent: !ref.path.length, instance: 0, count: 1, depth: 0, children: [], fiber: null, frame, parent, element, variant: ref, meta: ref.path.length ? part : undefined }, parent);
    // An icon's drawing is one layer, as Figma's vector.
    if (element instanceof SVGElement) return;
    Array.from(element.children).forEach((child, index) => layer({ ...ref, path: [...ref.path, index], name: layerName(child, ref.component) }, child, node));
  };
  for (const section of Array.from(frame.querySelectorAll(".studio-mc__component"))) {
    const component = section.getAttribute("aria-label") ?? "";
    const componentNode = add({ id: `mc:${component}`, kind: "panel", name: component, src: null, frameId: MAIN_FRAME, isComponent: true, instance: 0, count: 1, depth: 0, children: [], fiber: null, frame, parent: group, element: section }, group);
    for (const setElement of Array.from(section.querySelectorAll(":scope > .studio-mc__set"))) {
      const set = setElement.getAttribute("aria-label") ?? "";
      const setNode = add({ id: `mc:${component}|${set}`, kind: "panel", name: set, src: null, frameId: MAIN_FRAME, isComponent: false, instance: 0, count: 1, depth: 0, children: [], fiber: null, frame, parent: componentNode, element: setElement }, componentNode);
      for (const cell of Array.from(setElement.querySelectorAll<HTMLElement>("[data-mc-cell]"))) {
        const root = variantRoot(cell);
        if (!root) continue;
        layer({ component, set, variant: JSON.parse(cell.dataset.mcVariant ?? "{}") as Record<string, string>, path: [], name: cell.dataset.mcName ?? component }, root, setNode);
      }
    }
  }
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
function attachSlots(nodes: LayerNode[], byId: Map<string, LayerNode>, figma = false) {
  for (const node of nodes) {
    attachSlots(node.children, byId, figma);
    if (node.kind !== "node" || !node.isComponent) continue;
    if (tableRows(node, byId)) continue;
    const data = dataSlotRows(node, byId);
    const groups = layerSlotsOf(node.name, node.fiber, node.children.map(firstHostOf));
    if (!groups) {
      if (data.length) node.children = [...data, ...node.children];
      continue;
    }
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
    // As Figma lists them (user, 2026-10-13: "hàng slot (vd. Sidebar › Sidebar), chưa giống tên layer trong Figma"): an
    // empty slot is no row (the canvas shows it on the selected instance, the Inspector's Slots lists it), and a slot
    // holding one layer of its own name is that layer.
    const shown = figma ? rows.flatMap((row) => (!row.children.length ? [] : row.children.length === 1 && row.children[0].name === row.name ? row.children : [row])) : rows;
    node.children = [...shown, ...data, ...node.children.filter((child) => !claimed.has(child))];
  }
}

/**
 * A Table's rows and cells as Figma lists them (user, 2026-10-10: "giống Figma 100%"): Table › Header (Header-Cell…) and
 * Data-Row › Cell, each Cell holding the layers its column's `cell` writes for that row (a column the Table draws itself:
 * the Cell opens on what it draws). Rows and cells are parts (select/parts.ts names them); layers in no cell (the empty
 * state) stay under the Table, and the DOM in between (div › table › tbody) is not listed. False for any other node.
 */
function tableRows(node: LayerNode, byId: Map<string, LayerNode>): boolean {
  if (node.name !== "Table" || !node.fiber) return false;
  const owner = hitOf(node.fiber);
  if (!isTableHit(owner)) return false;
  const root = owner.hosts.map((host) => (host.matches(".zen-table") ? host : host.querySelector(":scope > .zen-table"))).find(Boolean);
  const table = root?.querySelector(":scope > table");
  if (!table) return false;
  const claimed = new Set<LayerNode>();
  const partRow = (part: PartHit | null, parent: LayerNode, meta: string | undefined, children: LayerNode[] | null): LayerNode | null => {
    if (!part) return null;
    const row: LayerNode = {
      id: `${node.id}/part:${partKey(part.path, part.name)}`, kind: "part", name: part.name, src: node.src, frameId: node.frameId, isComponent: true, instance: node.instance, count: 0,
      depth: parent.depth + 1, children: children ?? [], fiber: part.fiber, frame: node.frame, parent, owner: node, part, meta, lazy: children === null, dataItem: true,
    };
    byId.set(row.id, row);
    return row;
  };
  // A cell's first text (its label, not an avatar's initials) names a row; a header cell's text names its column.
  const text = (element: Element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
      if (value && !node.parentElement?.closest(".zen-avatar, svg, .zen-visually-hidden")) return value.slice(0, 28);
    }
    return undefined;
  };
  const rows: LayerNode[] = [];
  const headerRow = table.querySelector(":scope > thead > tr");
  const headers = headerRow ? Array.from(headerRow.children).filter((th) => !th.classList.contains("zen-table__select")) : [];
  const header = headerRow ? partRow(partForElement(owner, headerRow, TABLE_PARTS.header), node, undefined, []) : null;
  if (header) {
    header.children = headers.flatMap((th) => {
      const cell = partRow(partForElement(owner, th, TABLE_PARTS.headerCell), header, text(th), null);
      return cell ? [cell] : [];
    });
    rows.push(header);
  }
  const tbody = table.querySelector(":scope > tbody");
  for (const tr of tbody ? bodyRows(tbody) : []) {
    const cells = rowCells(tr);
    const row = partRow(partForElement(owner, tr, TABLE_PARTS.row), node, cells[0] ? text(cells[0]) : undefined, []);
    if (!row) continue;
    row.children = cells.flatMap((td, index) => {
      const written = node.children.filter((child) => {
        const host = firstHostOf(child);
        return Boolean(host && td.contains(host));
      });
      written.forEach((child) => claimed.add(child));
      const cell = partRow(partForElement(owner, td, TABLE_PARTS.cell), row, headers[index] ? text(headers[index]) : undefined, written.length ? written : null);
      return cell ? [cell] : [];
    });
    rows.push(row);
  }
  node.children = [...rows, ...node.children.filter((child) => !claimed.has(child))];
  node.hasParts = false;
  return true;
}

/**
 * A component's data slots (slots/dataSlots.ts: TopNavigation's Top-Trailing) as slot rows, each listing the items it
 * draws as part rows ("Favourite", or "Action 2"), as Figma lists the Action instances in Trailing-Slot. A click on an
 * item selects it as the canvas does (the item part: the inspector's item panel). Items past what the component draws
 * have no part and no row (the Slots section lists them, with why).
 */
function dataSlotRows(node: LayerNode, byId: Map<string, LayerNode>): LayerNode[] {
  const slots = dataSlotsOf(node.name);
  if (!slots.length || !node.fiber) return [];
  const owner = hitOf(node.fiber);
  if (!owner) return [];
  return slots.flatMap((slot) => {
    const parts = itemParts(owner, slot);
    if (!parts.length && slot.form !== "array") return [];
    const row: LayerNode = {
      id: `${node.id}/slot:${slot.prop}`, kind: "slot", name: slot.name, src: node.src, frameId: node.frameId, isComponent: false, instance: node.instance, count: 0,
      depth: node.depth + 1, children: [], fiber: node.fiber, frame: node.frame, parent: node, owner: node, meta: parts.length ? undefined : "Empty",
      slot: { prop: slot.prop, container: commonParent(parts.flatMap((part) => (part ? part.hosts : []))) },
    };
    row.children = parts.flatMap((part, index): LayerNode[] => {
      if (!part) return [];
      const id = `${node.id}/part:${partKey(part.path, part.name)}`;
      const item: LayerNode = {
        id, kind: "part", name: renderedItemTitle({ slot, index, part }), src: node.src, frameId: node.frameId, isComponent: true, instance: node.instance, count: 0,
        depth: node.depth + 2, children: [], fiber: part.fiber, frame: node.frame, parent: row, owner: node, part, meta: slot.itemName, lazy: true, dataItem: true, item: { prop: slot.prop, index },
      };
      byId.set(id, item);
      return [item];
    });
    byId.set(row.id, row);
    return [row];
  });
}

/** The nearest element holding every node (a data slot's row outline), or null for none. */
function commonParent(hosts: Element[]): Element | null {
  if (!hosts.length) return null;
  if (hosts.length === 1) return hosts[0];
  let parent: Element | null = hosts[0].parentElement;
  while (parent && !hosts.every((host) => parent!.contains(host))) parent = parent.parentElement;
  return parent;
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

/** Layers that only lay out their children (clickTarget.ts LAYOUT_ONLY): they draw nothing of their own. */
const LAYOUT_ONLY = new Set(["Stack", "Grid", "Container", "div", "section"]);
const LAYOUT = new Set([...LAYOUT_ONLY, "Box"]);

const sameRect = (a: DOMRect | null, b: DOMRect | null) => Boolean(a && b && Math.abs(a.left - b.left) < 1.5 && Math.abs(a.top - b.top) < 1.5 && Math.abs(a.right - b.right) < 1.5 && Math.abs(a.bottom - b.bottom) < 1.5);
const nodeRect = (node: LayerNode) => (node.fiber ? rectOf(hostsOf(node.fiber)) : null);

/*
 * Folds the layers a click passes through (select/clickTarget.ts `folded`, so Layers lists what the canvas selects; user,
 * 2026-10-13: "Panel Layers vẫn hiện các lớp mà click đã bỏ qua"): a Stack, Grid, Container, div or section holding one
 * layer, a Box exactly as large as its one child, the one layout layer inside a Zen component (a Card's content Stack:
 * its layers are the Card's; an example's own component keeps its root Stack), a List's <ul> (its rows are its parent's), any element whose single child is a playground
 * panel (the panel group stands for it), and the Stack the Studio wrapped a component in to size it (its row stands for
 * both, as Figma shows an instance's sizing on the instance). A folded layer's selection shows on the row that stands
 * for it (`aliases`); "Show all layers" lists them again, and they stay selectable on the canvas.
 */
function simplify(nodes: LayerNode[], aliases: Map<string, string>, owner: LayerNode | null = null): LayerNode[] {
  return nodes.flatMap((node) => {
    node.children = simplify(node.children, aliases, node);
    if (node.kind !== "node") return [node];
    // A List's rows sit in its parent, as Figma's List-Box holds its List-Items.
    if (node.name === "List" && node.children.length) {
      if (owner) aliases.set(node.id, owner.id);
      return node.children;
    }
    // The one layout layer inside a component is that slot's auto layout: its layers are the component's.
    if (LAYOUT_ONLY.has(node.name) && owner?.kind === "node" && owner.isComponent && !LAYOUT.has(owner.name) && componentSchema(owner.name) && nodes.length === 1 && node.children.length > 1) {
      aliases.set(node.id, owner.id);
      return node.children;
    }
    if (node.children.length !== 1) return [node];
    const only = node.children[0];
    if (only.kind === "panel") {
      only.stand ??= node;
      aliases.set(node.id, only.id);
      return [only];
    }
    // The Studio's sizing Stack first: its child's row stands for both and says so (`wrap`).
    if (isStudioWrap(node, only)) {
      only.wrap = node.src ?? undefined;
      aliases.set(node.id, only.id);
      return [only];
    }
    if (LAYOUT_ONLY.has(node.name) || (node.name === "Box" && sameRect(nodeRect(node), nodeRect(only)))) {
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

/** A nested instance's Figma layer name ("Sub-Action", "Leading-Icon"), the last step of its path, shown beside it. */
const layerNameOf = (part: PartHit) => nestedPathOf(part)?.split("/").pop()?.replace(/\[[^\]]*\]$/, "") || undefined;

/**
 * An instance's own layers as Figma lists them (no "Parts" folder, user 2026-10-13): its nested instances by their Figma
 * layer names and its texts, the DOM wrappers between them left out (their layers come up a level); a data-slot item is
 * listed in its slot row instead. Each nested instance opens on its own layers the same way.
 */
function namedParts(owner: FiberHit, fiber: Fiber, depth = 0): PartHit[] {
  const out: PartHit[] = [];
  for (const hit of partChildren(owner, fiber)) {
    // A data-slot item is its slot row's (its own layers open there): skipped here with everything inside it.
    if (dataItemRootOf(hit)) continue;
    // Words for screen readers only draw nothing: no layer (Figma has none).
    if (hit.element.closest(".zen-visually-hidden") || hit.name === "VisuallyHidden") continue;
    if (hit.isComponent && nestedPathOf(hit) !== null) out.push(hit);
    else if (!hit.isComponent && hit.path.length > 1 && ownsText(hit.element)) {
      // A text clipped to a pixel is a screen reader's (a chart's summary line), not a layer on the canvas.
      const box = hit.element.getBoundingClientRect();
      if (box.width > 1 || box.height > 1) out.push(hit);
    }
    else if (depth < 24) out.push(...namedParts(owner, hit.fiber, depth + 1));
  }
  return out;
}

/** A row for part `hit` of `owner`'s instance, under `parent` (a unique id; a text is named by its words, as Figma does). */
function partRowOf(owner: LayerNode, parent: LayerNode, hit: PartHit, byId: Map<string, LayerNode>, used: Set<string>): LayerNode {
  let id = `${owner.id}/part:${partKey(hit.path, hit.name)}`;
  for (let copy = 2; used.has(id) || (byId.get(id)?.dataItem && byId.get(id)?.parent !== parent); copy++) id = `${owner.id}/part:${partKey(hit.path, hit.name)}~${copy}`;
  used.add(id);
  const text = !hit.isComponent && ownsText(hit.element) ? (hit.element.textContent ?? "").trim().replace(/\s+/g, " ") : null;
  const child: LayerNode = {
    id, kind: "part", name: text ? (text.length > 28 ? `${text.slice(0, 28)}…` : text) : hit.isComponent ? layerNameOf(hit) ?? hit.name : hit.name, src: owner.src, frameId: owner.frameId, isComponent: hit.isComponent, instance: owner.instance, count: 0,
    depth: parent.depth + 1, children: [], fiber: hit.fiber, frame: owner.frame, parent, owner, part: hit,
    meta: text ? "Text" : hit.isComponent ? (layerNameOf(hit) ? hit.name : undefined) : classHint(hit.element) ?? undefined, lazy: !text, text: Boolean(text),
  };
  byId.set(id, child);
  return child;
}

/** The rows under a node; a "Parts" folder or part computes its parts the first time it is asked. In Figma mode an
 *  instance lists its own layers (namedParts) after its written ones. */
function childrenOf(node: LayerNode, byId: Map<string, LayerNode>, figma = false): LayerNode[] {
  if (node.kind === "node") {
    if (!figma) return node.hasParts ? [partsFolderOf(node), ...node.children] : node.children;
    if (!node.hasParts || !node.fiber) return node.children;
    if (!node.named) {
      const owner = hitOf(node.fiber);
      const used = new Set<string>();
      node.named = owner?.fiber ? namedParts(owner, owner.fiber).map((hit) => partRowOf(node, node, hit, byId, used)) : [];
    }
    return [...node.children, ...node.named];
  }
  if (!node.lazy) return node.children;
  if (figma && node.kind === "part" && node.owner && node.part) {
    node.lazy = false;
    const ownerHit = node.owner.fiber ? hitOf(node.owner.fiber) : null;
    const used = new Set<string>();
    node.children = ownerHit ? namedParts(ownerHit, node.part.fiber).map((hit) => partRowOf(node.owner!, node, hit, byId, used)) : [];
    return node.children;
  }
  node.lazy = false;
  const owner = node.owner;
  const ownerHit = owner?.fiber ? hitOf(owner.fiber) : null;
  const fiber = node.kind === "parts" ? ownerHit?.fiber : node.part?.fiber;
  if (!owner || !ownerHit || !fiber) return node.children;
  const used = new Set<string>();
  node.children = partChildren(ownerHit, fiber).map((hit) => {
    let id = `${owner.id}/part:${partKey(hit.path, hit.name)}`;
    for (let copy = 2; used.has(id) || (byId.get(id)?.dataItem && byId.get(id)?.parent !== node); copy++) id = `${owner.id}/part:${partKey(hit.path, hit.name)}~${copy}`;
    used.add(id);
    const child: LayerNode = {
      id, kind: "part", name: hit.name, src: owner.src, frameId: owner.frameId, isComponent: hit.isComponent, instance: owner.instance, count: 0,
      depth: node.depth + 1, children: [], fiber: hit.fiber, frame: owner.frame, parent: node, owner, part: hit,
      meta: hit.isComponent ? layerNameOf(hit) : classHint(hit.element) ?? undefined, lazy: true,
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
      if (node.kind === "frame" || node.kind === "parts" || node.kind === "slot" || !(rowLabel(node).toLowerCase().includes(needle) || node.name.toLowerCase().includes(needle) || (node.kind !== "part" && shortSrc(node.src ?? "").toLowerCase().includes(needle)))) continue;
      for (let current: LayerNode | null = node; current && !matches.has(current); current = current.parent) matches.add(current);
    }
  }
  // One row per layer: a part listed both as a data-slot item and under Parts (the same owner, place and name, while the
  // canvas redraws after an item edit) shows once — React needs the rows' keys unique.
  const emitted = new Set<string>();
  const walk = (nodes: LayerNode[]) => {
    // Figma's order on a page you made: the front-most layer (the last written) on top.
    for (const node of tree.front ? [...nodes].reverse() : nodes) {
      if (needle && !matches.has(node)) continue;
      if (emitted.has(node.id)) continue;
      emitted.add(node.id);
      // Every layer is listed, as in Figma; "Show all layers" (every part and wrapper) stops at MAX_ROWS.
      if (!tree.figma && rows.length >= MAX_ROWS) { hidden += 1; continue; }
      // A part row looks one level ahead (its own parts) to know whether it opens.
      const children = node.kind === "part" || isOpen(node) || needle ? childrenOf(node, tree.byId, tree.figma) : node.kind === "node" && node.hasParts ? (tree.figma ? childrenOf(node, tree.byId, true) : [partsFolderOf(node)]) : node.children;
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
  if (node.kind === "panel" || node.kind === "variant") return node.element?.isConnected ? { src: "", name: node.name, hosts: [node.element], isComponent: false, props: {} } : null;
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
  else if (node.kind === "variant" && node.variant) studioStore.setState({ selection: { kind: "variant", frameId: MAIN_FRAME, ...node.variant } });
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
    // A slot is part of its component: the component is selected and the inspector shows that slot's block. The row stays
    // the selected one (⌘V pastes into that slot) until the selection changes.
    const owner = node.owner;
    const ownerHit = owner.fiber ? hitOf(owner.fiber) : null;
    const selection: StudioSelection = { kind: "node", src: owner.src!, name: owner.name, frameId: owner.frameId, panelId: panelOf(ownerHit?.hosts[0]), instance: owner.instance };
    studioStore.setState({ selection });
    focusSlot(owner.src!, node.slot.prop, selection);
  }
  const rect = hit ? rectOf(hit.hosts) : null;
  if (rect) canvasApi.ensureVisible(rect);
}

/** Frames, playground panels, slots and first-level elements with child elements open by default; parts never (computed on demand). */
const defaultOpen = (node: LayerNode) => node.kind === "frame" || node.kind === "panel" || node.kind === "slot" || (node.kind === "node" && node.depth <= 1 && node.children.length > 0);

/** The name a row shows: the one the person gave the layer, else its automatic or component name (select/layerMeta.ts). */
const rowLabel = (node: LayerNode) => (node.kind === "node" ? displayName(node.name, node.fiber?.memoizedProps as Record<string, unknown> | null, node.src) : node.name);

/** "main" for a main component's root layer, "instance" for an instance (renderPage's marks), else undefined. */
const componentOfRow = (node: LayerNode) => {
  const props = node.kind === "node" ? (node.fiber?.memoizedProps as Record<string, unknown> | null) : null;
  return props?.["data-zen-main"] ? "main" : props?.["data-zen-instance"] ? "instance" : undefined;
};

function rowIcon(node: LayerNode, front: boolean): IconName {
  // A page you made: a frame is Figma's frame (#); a code page's frames are its sections.
  if (node.kind === "frame") return front ? "icon-hash-01-line" : "icon-layout-alt-01-line";
  // Figma's layer icons (select/layerNames.ts): a component's ◇ (its main and its instances), a shape's own, a frame's
  // # (Box), auto layout by its direction (Stack), text's T.
  const own = node.kind === "node" ? objectIcon(node.name, node.fiber?.memoizedProps as Record<string, unknown> | null) : null;
  if (own) return own;
  if (node.kind === "panel") return node.frameId === MAIN_FRAME ? (node.isComponent ? "icon-cube-line" : "icon-grid-01-line") : "icon-sliders-04-line";
  if (node.kind === "variant") return node.isComponent ? "icon-cube-line" : "icon-layers-three-01-line";
  if (node.kind === "parts") return "icon-layers-three-01-line";
  if (node.kind === "slot") return "icon-grid-dots-blank-line";
  if (node.text) return "icon-type-01-line";
  return node.kind === "node" ? layerIcon(node.name, null, node.isComponent) : node.isComponent ? "icon-cube-line" : "icon-code-02-line";
}

function rowTitle(node: LayerNode) {
  // A data-slot item is edited, moved and removed like a layer (⌘/Shift+click adds it to the selection).
  if (node.kind === "part" && node.item) return `${node.name} · ${node.meta ?? "Item"} in ${node.owner?.name ?? "the layer"} · ⇧-click to select several`;
  if (node.kind === "part") return `${node.name}: part of ${node.owner?.name ?? "the layer"} · View only`;
  if (node.kind === "parts") return `Layers inside ${node.owner?.name ?? "this component"} · View only`;
  if (node.kind === "panel") return node.frameId === MAIN_FRAME ? node.name : `Playground panel: ${node.name}`;
  if (node.kind === "variant") return `${node.variant?.component ?? ""} · ${node.variant?.set ?? ""}`;
  if (node.kind === "slot") return `${node.name}: a slot of ${node.owner?.name ?? "the component"}${node.children.length ? "" : " (empty)"}`;
  // No file:line (plan criterion 7): the Code tab shows where a layer is written.
  return node.wrap ? "In an auto layout frame that sets its size" : undefined;
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
  const extraFrames = useFrameSelection();
  const extraIds = useMemo(() => new Set([...extras.map((layer) => `${layer.src}#${layer.instance}`), ...extraFrames.map((frameId) => `frame:${frameId}`)]), [extras, extraFrames]);
  const itemSet = useItemSelection();
  const [tree, setTree] = useState<Tree>(emptyTree);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [openState, setOpenState] = useState<Map<string, boolean>>(() => new Map());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(readShowAll);
  const localPage = useStudio((state) => state.localPage);
  // A name changed or a layer (un)locked: rows read their names and padlocks again (select/layerMeta.ts).
  const metaVersion = useLayerMeta();
  /** The row whose name is being edited (Figma's rename: double-click, ⌘R). */
  const [renaming, setRenaming] = useState<string | null>(null);
  const server = useStudioServer();
  const treeRef = useRef<HTMLDivElement>(null);
  // A source update rebuilds the tree after the canvas has shown the edit (a transition: never on an edit's way there).
  const refresh = useCallback(() => startTransition(() => setVersion((value) => value + 1)), []);

  // Build (and rebuild) the tree; retried while the page is still rendering.
  useEffect(() => {
    let tries = 0;
    let timer = 0;
    const build = () => {
      const world = canvasApi.getWorldElement();
      const next = world ? buildTree(world, page, showAll, Boolean(localPage)) : emptyTree;
      setTree(next);
      if (next.groups.length || tries++ > 20) setReady(true);
      else timer = window.setTimeout(build, 300);
    };
    build();
    return () => window.clearTimeout(timer);
  }, [page, collection, version, showAll, localPage]);

  useEffect(() => onSourceUpdate(refresh), [refresh]);
  // A write moves the layers below the change: keep their open/closed state with them.
  useEffect(() => onStudioWrite((write) => {
    // The name field stays on its layer when the write moved it (a rename adds the layer's data-name).
    setRenaming((current) => {
      const match = current ? /^(.*)#(\d+)$/.exec(current) : null;
      if (!match || current!.startsWith("frame:")) return current;
      const moved = mapSrc(match[1], write);
      return moved && moved !== match[1] ? `${moved}#${match[2]}` : current;
    });
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
  // Text changes count too: a text layer is named by its text ("3 items" → "4 items" in Interact).
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
    observer.observe(world, { subtree: true, childList: true, characterData: true });
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
  // A slot row clicked: its row is the selected one while its host stays selected (⌘V pastes into that slot).
  useSlotFocusRequest();
  const slotProp = selectedSlotOf(selection);
  const slotId = selection?.kind === "node" && slotProp ? `${selection.src}#${selection.instance}/slot:${slotProp}` : null;
  const selectionId = selection ? (selection.kind === "frame" ? `frame:${selection.frameId}` : selection.kind === "variant" ? `variant:${variantKey(selection)}` : slotId && tree.byId.has(slotId) ? slotId : `${selection.src}#${selection.instance}${part ? `/part:${partKey(part.path, part.name)}` : ""}`) : null;
  // A folded panel wrapper shows as its panel row.
  // A folded layer shows on the row that stands for it, which may itself be folded (a List in a Card's content Stack).
  let selectedId = selectionId;
  for (let guard = 0; selectedId && tree.aliases.has(selectedId) && guard < 20; guard++) selectedId = tree.aliases.get(selectedId) ?? null;

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
      // Figma mode: from the instance's own layers; else from its Parts folder.
      let level: LayerNode[];
      if (tree.figma) level = childrenOf(owner, tree.byId, true).filter((candidate) => candidate.kind === "part");
      else {
        const folder = partsFolderOf(owner);
        opens.push(folder);
        level = childrenOf(folder, tree.byId);
      }
      for (let depth = 0; depth < 80 && level.length && !node; depth++) {
        node = level.find((candidate) => candidate.part && candidate.part.name === part.name && partKey(candidate.part.path, candidate.part.name) === partKey(part.path, part.name));
        if (node) break;
        const next = level.find((candidate) => candidate.part?.hosts.some((host) => host === target || host.contains(target)));
        if (!next) break;
        opens.push(next);
        level = childrenOf(next, tree.byId, tree.figma);
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
  const { rows, hidden } = useMemo(() => flatten(tree, isOpen, query), [tree, isOpen, query, metaVersion]); // eslint-disable-line react-hooks/exhaustive-deps -- metaVersion: names are read by rowLabel

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
  /** ⌥-click a chevron: the layer and every layer in it open or close together (Figma's). */
  const toggleDeep = (node: LayerNode) => {
    const open = !isOpen(node);
    setOpenState((current) => {
      const next = new Map(current);
      const visit = (each: LayerNode) => { if (each.children.length || each.hasParts) next.set(each.id, open); each.children.forEach(visit); };
      visit(node);
      return next;
    });
  };
  // ⌥L and Actions › Collapse layers: every group and layer closes but the way to the selection (Figma's).
  useEffect(() => {
    const collapse = () => {
      const keep = new Set<string>();
      for (let parent = selectedId ? tree.byId.get(selectedId)?.parent : null; parent; parent = parent.parent) keep.add(parent.id);
      const next = new Map<string, boolean>();
      for (const node of [...tree.groups, ...tree.byId.values()]) if (node.children.length || node.hasParts) next.set(node.id, keep.has(node.id));
      setOpenState(next);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.code !== "KeyL" || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (isTypingTarget(target) || target?.closest("input, textarea, [contenteditable]:not([contenteditable='false']), [role='dialog']") || studioStore.getState().presenting) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      collapse();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener(COLLAPSE_LAYERS_EVENT, collapse);
    return () => { window.removeEventListener("keydown", onKeyDown, true); window.removeEventListener(COLLAPSE_LAYERS_EVENT, collapse); };
  }, [tree, selectedId]);

  // Rename (Figma's): a layer of a page you made, or one of its frames, by double-click, Tab from the name before, ⌘R.
  const canRenameRow = (node: LayerNode) => Boolean(localPage) && ((node.kind === "node" && canLockSrc(node.src)) || (node.kind === "frame" && /^(screen|overlay):/.test(node.frameId)));
  const commitRename = (node: LayerNode, name: string) => (node.kind === "frame" ? renameFrame(node.frameId, name) : renameLayer(node.src!, node.name, name, node.fiber?.memoizedProps as Record<string, unknown> | null));
  const renameNext = (node: LayerNode, backward: boolean) => {
    const index = rows.findIndex((row) => row.node.id === node.id);
    for (let at = index + (backward ? -1 : 1); at >= 0 && at < rows.length; at += backward ? -1 : 1) {
      if (!canRenameRow(rows[at].node)) continue;
      selectNode(rows[at].node);
      setRenaming(rows[at].node.id);
      return;
    }
  };
  const renameRequest = useRenameRequest();
  useEffect(() => {
    if (!renameRequest) return;
    let id = renameRequest.id;
    for (let guard = 0; tree.aliases.has(id) && guard < 20; guard++) id = tree.aliases.get(id) ?? id;
    if (!tree.byId.has(id)) return;
    setRenaming(id);
    doneRenameRequest();
  }, [renameRequest, tree]);
  // Right-click a row: the canvas menu of that layer or frame (Figma's Layers), selecting it first.
  const openRowMenu = (node: LayerNode, event: MouseEvent) => {
    event.preventDefault();
    if (node.kind !== "node" && node.kind !== "frame") return;
    if (node.id !== selectedId && !extraIds.has(node.id)) activate(node);
    const { clientX: x, clientY: y } = event;
    requestAnimationFrame(() => {
      const current = studioStore.getState().selection;
      if (node.kind === "frame") openFrameMenu(x, y, node.frameId);
      else if (current?.kind === "node") openCanvasMenu(x, y, current);
    });
  };
  /** The row a Shift+click range starts from: the last row clicked (or ⌘-clicked), else the selected one. */
  const anchorRef = useRef<string | null>(null);
  const layerOf = (node: LayerNode): ExtraLayer | null => {
    const target = node.stand ?? node;
    return target.kind === "node" && target.src ? { src: target.src, name: target.name, frameId: target.frameId, panelId: panelOf(hitForNode(target)?.hosts[0]), instance: target.instance } : null;
  };
  /** Click / Enter / Space on a row: select it; the "Parts" folder opens or closes instead. */
  const activate = (node: LayerNode, event?: MouseEvent) => {
    const target = node.stand ?? node;
    // ⇧ / ⌘-click a frame's row: it joins the frames selected, or leaves them (select/frameSelection.ts).
    if (event && (event.shiftKey || event.metaKey || event.ctrlKey) && node.kind === "frame") { toggleFrame(node.frameId); return; }
    const layer = layerOf(node);
    // Items of one data slot (Sidebar Menu-Items): with an item of that slot selected, ⌘/Ctrl+click adds one, Shift+click
    // the range from it (user, 2026-10-10: "Chưa chọn được nhiều item add stack được").
    if (event && (event.shiftKey || event.metaKey || event.ctrlKey) && target.kind === "part" && target.item && target.owner) {
      const current = studioStore.getState().selection;
      const primaryItem = current?.kind === "node" && current.part ? dataItemRootOf(selectedPartStore.get()) : null;
      if (current?.kind === "node" && primaryItem && primaryItem.slot.prop === target.item.prop && current.src === target.owner.src && current.instance === target.owner.instance) {
        itemSelection.toggle(current, target.item.prop, primaryItem.index, target.item.index, event.shiftKey && !event.metaKey && !event.ctrlKey);
        return;
      }
    }
    // Shift+click selects the layers of every row from the anchor to this one, the anchor staying primary (Figma's range
    // in Layers); ⌘/Ctrl+click adds the layer to the selection or takes it out.
    if (event?.shiftKey && !event.metaKey && !event.ctrlKey && layer) {
      // The anchor counts while its layer is still selected (a canvas click since then moves it to the selection).
      const anchored = rows.find((row) => row.node.id === anchorRef.current);
      const anchorLayer = anchored ? layerOf(anchored.node) : null;
      const from = rows.findIndex((row) => row.node.id === (anchorLayer && isLayerSelected(anchorLayer) ? anchorRef.current : selectedId));
      const to = rows.findIndex((row) => row.node.id === node.id);
      const range = from >= 0 && to >= 0 ? rows.slice(Math.min(from, to), Math.max(from, to) + 1).map((row) => layerOf(row.node)).filter((each): each is ExtraLayer => Boolean(each)) : [];
      if (range.length > 1) {
        const anchor = layerOf(rows[from].node) ?? layer;
        selectLayers(anchor, range);
        anchorRef.current = rows[from].node.id;
        return;
      }
    }
    if (event && (event.shiftKey || event.metaKey || event.ctrlKey) && layer) {
      toggleLayer(layer);
      anchorRef.current = node.id;
      return;
    }
    if (node.kind === "parts") toggle(node);
    else {
      anchorRef.current = node.id;
      selectNode(target);
    }
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
  // A page you made lists its frames even when they hold nothing yet (an empty Screen is a frame row, as in Figma).
  const noAnnotations = ready && tree.groups.length > 0 && tree.total === 0 && !tree.front;
  const tabbable = focusId && rows.some((row) => row.node.id === focusId) ? focusId : rows[0]?.node.id;

  return (
    <div ref={rootRef} className="studio-layers">
      <div className="studio-layers__bar">
        <Search size="sm" value={query} onValueChange={setQuery} onClear={() => setQuery("")} placeholder="Find a layer" aria-label="Find a layer" />
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
            {nothing ? "The page is still loading."
              : server.ready && server.writable ? "This page has no layers to show. Component pages and examples have layers."
                : "Layers show while the Studio server runs."}
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
          data-order={tree.front ? "front" : undefined}
          onKeyDown={onKeyDown}
          // Drag a row to move the layer (edit/layersDrag.ts); a click still selects.
          onPointerDown={(event) => pressLayersRow(event.nativeEvent, event.currentTarget, (row) => {
            const node = rows.find((entry) => entry.node.id === row.getAttribute("data-layer-id"))?.node;
            return node ? hitForNode(node) : null;
          })}
          onPointerLeave={() => layerHover.set(null)}
        >
          {rows.map(({ node, open, hasChildren }) => {
            const lockable = Boolean(localPage) && ((node.kind === "node" && canLockSrc(node.src)) || (node.kind === "frame" && /^(screen|overlay):/.test(node.frameId)));
            const locked = lockable && (node.kind === "frame" ? isLockedFrame(pageFile(localPage!), node.frameId) : isOwnLock(node.src));
            return (
            <div
              key={node.id}
              role="treeitem"
              aria-level={node.depth + 1}
              aria-expanded={hasChildren ? open : undefined}
              aria-selected={node.id === selectedId || extraIds.has(node.id) || Boolean(node.item && itemSet && node.owner?.src === itemSet.src && node.owner.instance === itemSet.instance
                && node.item.prop === itemSet.prop && itemSet.indices.includes(node.item.index))}
              tabIndex={node.id === tabbable ? 0 : -1}
              data-layer-id={node.id}
              data-kind={node.kind}
              data-component={node.isComponent || undefined}
              data-wrapped={node.wrap ? "true" : undefined}
              data-hidden={node.hiddenLayer === undefined ? undefined : String(node.hiddenLayer)}
              data-locked={locked || undefined}
              className={`studio-layers__row ${typographyStyles[node.kind === "frame" ? "Body/Small/Bold" : node.kind === "panel" ? "Body/Small/Medium" : "Body/Small/Regular"]}`}
              style={{ ["--studio-depth" as string]: node.depth }}
              onPointerEnter={() => layerHover.set(hitForNode(node))}
              onFocus={() => setFocusId(node.id)}
              onClick={(event) => activate(node, event)}
              onDoubleClick={(event) => { if (canRenameRow(node) && canEdit()) { event.preventDefault(); setRenaming(node.id); } }}
              onContextMenu={(event) => openRowMenu(node, event)}
              title={renaming === node.id ? undefined : rowTitle(node)}
            >
              <span
                className="studio-layers__chevron"
                data-open={open || undefined}
                data-leaf={!hasChildren || undefined}
                onClick={(event) => { event.stopPropagation(); if (event.altKey) toggleDeep(node); else toggle(node); }}
                aria-hidden="true"
              >
                <Icon name="icon-chevron-right-line-small" size={16} />
              </span>
              <span className="studio-layers__icon" data-component={componentOfRow(node)} aria-hidden="true">
                <Icon name={rowIcon(node, tree.front)} size={16} />
              </span>
              {renaming === node.id ? (
                <RenameField
                  className="studio-layers__rename"
                  value={rowLabel(node)}
                  label="Layer name"
                  onCommit={(name) => commitRename(node, name)}
                  onDone={() => setRenaming((current) => (current === node.id ? null : current))}
                  onTab={(backward) => renameNext(node, backward)}
                />
              ) : <span className="studio-layers__name">{rowLabel(node)}</span>}
              {node.meta ? <span className={`studio-layers__hint ${typographyStyles["Caption/Regular"]}`}>{node.meta}</span> : null}
              {node.count > 1 ? <span className={`studio-layers__count ${typographyStyles["Caption/Regular"]}`} aria-label={`${node.count} instances`}>×{node.count}</span> : null}
              {lockable ? (
                <LayerLock
                  name={rowLabel(node)}
                  locked={locked}
                  onToggle={() => { void (node.kind === "frame" ? setFrameLocked(node.frameId, !locked, rowLabel(node)) : setLayerLocked(node.src!, node.name, !locked)); }}
                />
              ) : null}
              {node.kind === "node" && node.src && canHideSrc(node.src) ? (
                <LayerEye src={node.src} name={node.name} hidden={node.hiddenLayer === true} />
              ) : null}
            </div>
            );
          })}
          {hidden ? <p className={`studio-layers__more ${typographyStyles["Caption/Regular"]}`}>{plural(hidden, "more layer")}: collapse a group or find by name.</p> : null}
        </div>
      )}
    </div>
  );
}
