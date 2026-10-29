import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../../components/Icon";
import { announceEditStatus, parseSrc } from "../../api";
import { onFramesMoved } from "../../board/frames";
import { canvasApi, getViewport, getViewportBox, toWorldRect } from "../../canvas/viewport";
import { elementAt } from "../../select/parts";
import { findBySrc, onSourceUpdate, rectOf, selectHit } from "../../select/picker";
import { canEdit, useStudio } from "../../store";
import type { PageTree } from "../render/renderPage";
import { writeAction, writeItemTargets } from "./protoEdit";
import { itemAt, itemElement, layerElements, selectedItem } from "./protoDom";
import { choiceItemsOf, findNode, frameNodeOf, isItemTrigger, linksOf, optionsOf, protoOf, targetOfFrame, targetsByItem, triggerValue, type ProtoLink } from "./protoModel";
import { protoSubject } from "./protoTriggers";

/*
 * Prototype connections on the canvas (Studio builder GĐ2 M3; Figma's prototype mode since 2026-10-15), while the
 * Inspector's Prototype tab is open:
 * - an arrow from each layer whose action navigates to a Screen or opens an Overlay to that frame (from the item that
 *   leads there, on a tab bar or another choice control); a click on an arrow selects its layer (the tab shows its
 *   interaction), the selected layer's arrows stand out;
 * - the selected layer's ⊕ on its right edge (a choice control: one ⊕ per item, or the selected item's): drag it onto a
 *   frame to connect (a Screen → Navigate to, an Overlay → Open overlay, on the trigger that already leads somewhere,
 *   else the one that hands over the chosen item, else On click); a click on ⊕ opens the action list in the tab;
 * - the end of a selected layer's arrow: drag it onto another frame to change where it leads, off every frame to remove
 *   it (Figma). Escape cancels a drag. One edit per drop (⌘Z undoes it).
 * Drawn in screen space over the canvas (portalled into the viewport, above the Select layer, below the frame chrome), so
 * lines and handles keep one size at every zoom; frame and layer boxes are measured in world coordinates and placed with
 * the viewport transform on every pan or zoom (a frame dragged on the board: onFramesMoved). Pointer-only, as the resize handles: the Prototype tab is the keyboard way.
 */

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
/** A ⊕ of the selected layer: the whole layer (`item` null) or one item of a choice control. `row`: the control's items
 *  sit in a row (a tab bar): its ⊕ goes inside the item by its right edge, and its arrows leave from its top. */
type PlusSpot = { item: string | null; rect: Rect; row: boolean };
type Source = { rect: Rect; row: boolean };
/** World boxes of the frames, the linked layers (by linkSource) and the selected layer's ⊕ spots. */
type Geometry = { frames: Map<string, Rect>; sources: Map<string, Source>; plus: PlusSpot[] };
/** `over`: the frame a drop would lead to; `home`: the pointer is on the layer's own frame (a drop there changes
 *  nothing); `moved`: the pointer left the press point (a press without a move is a click). */
type Drag = { kind: "new" | "end"; link?: ProtoLink; item?: string | null; start: Point; point: Point; over: string | null; home: boolean; moved: boolean };

/** The ⊕ sits this far (screen px) beside the selected layer's edge, as in Figma; inside an item in a row, this far in
 *  from its right edge. */
const PLUS_GAP = 12;
const PLUS_INSET = 12;

const linkSource = (loc: string, item?: string | null) => `${loc}|${item ?? ""}`;
const linkKey = (link: ProtoLink) => `${link.loc}|${link.trigger}|${link.item ?? ""}`;

const project = (rect: Rect, view: { x: number; y: number; zoom: number }): Rect => ({ x: rect.x * view.zoom + view.x, y: rect.y * view.zoom + view.y, width: rect.width * view.zoom, height: rect.height * view.zoom });

/** A curve from a layer (screen px) to frame `b`: into its near edge, level with the start where it can. */
function arrowPath(from: Point, b: Rect, forward: boolean, up = false) {
  const x2 = forward ? b.x : b.x + b.width;
  const y2 = Math.min(Math.max(from.y, b.y + 24), b.y + b.height - 24);
  return curve(from, { x: x2, y: y2 }, forward, up);
}

/** A curve from `from` to `to`, leaving sideways (or, `up`, upwards: an item in a row, as a tab) and entering `to`
 *  sideways, with an arrowhead. */
function curve(from: Point, to: Point, forward = to.x >= from.x, up = false) {
  const bend = Math.max(48, Math.abs(to.x - from.x) / 2) * (forward ? 1 : -1);
  const dir = forward ? -1 : 1;
  const lift = Math.max(48, Math.abs(to.y - from.y) / 2);
  const first = up ? `${from.x} ${from.y - lift}` : `${from.x + bend} ${from.y}`;
  return {
    d: `M ${from.x} ${from.y} C ${first}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`,
    head: `M ${to.x + dir * 10} ${to.y - 6} L ${to.x} ${to.y} L ${to.x + dir * 10} ${to.y + 6}`,
    end: to,
  };
}

const sameRect = (a: Rect | null | undefined, b: Rect | null | undefined) => a === b || Boolean(a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);
const sameFrames = (a: Map<string, Rect>, b: Map<string, Rect>) => a.size === b.size && [...b].every(([key, rect]) => sameRect(a.get(key), rect));
const sameSources = (a: Map<string, Source>, b: Map<string, Source>) => a.size === b.size && [...b].every(([key, source]) => a.get(key)?.row === source.row && sameRect(a.get(key)?.rect, source.rect));
const samePlus = (a: PlusSpot[], b: PlusSpot[]) => a.length === b.length && a.every((spot, index) => spot.item === b[index].item && spot.row === b[index].row && sameRect(spot.rect, b[index].rect));
/** Do these boxes sit in one row (a tab bar), not in a column (a sidebar)? */
const inRow = (rects: DOMRect[]) => rects.length > 1 && rects.every((rect) => Math.abs(rect.top - rects[0].top) < 4);

export function ProtoLinks({ tree, file, boardRef }: { tree: PageTree | null; file: string; boardRef: RefObject<HTMLDivElement | null> }) {
  const [host, setHost] = useState<HTMLElement | null>(() => canvasApi.getViewportElement());
  useEffect(() => { if (!host) setHost(canvasApi.getViewportElement()); }, [host]);
  // The item picked on the canvas belongs to this tab's session: forgotten when the connections go.
  useEffect(() => () => selectedItem.set(null), []);
  return host ? createPortal(<ProtoLayer tree={tree} file={file} boardRef={boardRef} />, host) : null;
}

function ProtoLayer({ tree, file, boardRef }: { tree: PageTree | null; file: string; boardRef: RefObject<HTMLDivElement | null> }) {
  const links = useMemo(() => linksOf(tree), [tree]);
  const view = useSyncExternalStore(canvasApi.onChange, getViewport, getViewport);
  const selection = useStudio((state) => state.selection);
  const editable = useStudio((state) => canEdit(state) && state.tool === "select" && !state.presenting);
  const [geometry, setGeometry] = useState<Geometry>({ frames: new Map(), sources: new Map(), plus: [] });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // The selected layer of this page and what its ⊕ edits: the layer and the trigger a drag writes, or (an item of a
  // choice control, as a SidebarMenuItem) its control with that item.
  const selectedSrc = selection?.kind === "node" ? selection.src : null;
  const parsed = selectedSrc ? parseSrc(selectedSrc) : null;
  // A selected Screen frame is its Screen (After delay leads from it).
  const frameScreen = selection?.kind === "frame" ? frameNodeOf(tree, selection.frameId) : null;
  const selectedLoc = parsed && parsed.file === file ? parsed.loc : frameScreen?.name === "Screen" ? frameScreen.loc : null;
  const subject = selectedLoc ? protoSubject(tree, selectedLoc) : null;
  const subjectLoc = subject?.node.loc ?? null;
  const trigger = subject?.trigger ?? null;
  const ownItem = subject?.item ?? null;
  const node = subject?.node ?? null;
  const items = useMemo(() => (node && trigger && isItemTrigger(node, trigger) ? choiceItemsOf(node) : []), [node, trigger]);
  const instance = selection?.kind === "node" ? selection.instance : 0;
  const part = selection?.kind === "node" ? selection.part ?? null : null;
  const homeFrame = selection?.kind === "node" || selection?.kind === "frame" ? selection.frameId : null;

  const measure = useCallback(() => {
    const board = boardRef.current;
    const world = canvasApi.getWorldElement();
    if (!board || !world) return;
    const frames = new Map<string, Rect>();
    board.querySelectorAll<HTMLElement>("[data-studio-frame]").forEach((frame) => {
      const id = frame.dataset.studioFrame;
      if (id && /^(screen|overlay):/.test(id)) frames.set(id, toWorldRect(frame.getBoundingClientRect()));
    });
    // Linked layers (their first instance), through React: some components keep the Studio's mark off their DOM.
    const drawn = layerElements(board, new Set(links.map((link) => `${file}:${link.loc}`)));
    const sources = new Map<string, Source>();
    for (const link of links) {
      const key = linkSource(link.loc, link.item);
      const hosts = drawn.get(`${file}:${link.loc}`);
      if (sources.has(key) || !hosts) continue;
      let rect: DOMRect | null = null;
      let row = false;
      if (link.item) {
        const at = findNode(tree, link.loc);
        const all = at ? choiceItemsOf(at) : [];
        const boxes = new Map(all.map((entry) => [entry.value, hosts.map((host) => itemElement(host, entry, all)).find(Boolean)?.getBoundingClientRect()]));
        rect = boxes.get(link.item) ?? null;
        row = inRow([...boxes.values()].filter((box): box is DOMRect => Boolean(box?.width)));
      } else rect = rectOf(hosts);
      if (rect && (rect.width || rect.height)) sources.set(key, { rect: toWorldRect(rect), row });
    }
    // The selected layer's ⊕: the layer, or (a choice control) its selected item, else each of its items.
    const plus: PlusSpot[] = [];
    let picked: string | null = null;
    if (selectedLoc && trigger) {
      const hit = findBySrc(world, `${file}:${selectedLoc}`)[instance];
      if (hit && ownItem) {
        // The selected layer is one item of its control: its own ⊕ leads that item.
        const rect = rectOf(hit.hosts);
        picked = ownItem;
        if (rect) plus.push({ item: ownItem, rect: toWorldRect(rect), row: false });
      } else if (hit && items.length) {
        const root = hit.hosts[0];
        const partElement = part ? elementAt(hit, part.path) : null;
        const chosen = root && partElement ? itemAt(root, items, partElement) : null;
        picked = chosen?.value ?? null;
        const spots = (chosen ? [chosen] : items).flatMap((item) => {
          const element = root ? itemElement(root, item, items) : null;
          const rect = element?.getBoundingClientRect();
          return rect && rect.width ? [{ item: item.value, rect: toWorldRect(rect) }] : [];
        });
        const row = inRow(items.map((item) => (root ? itemElement(root, item, items)?.getBoundingClientRect() : undefined)).filter((rect): rect is DOMRect => Boolean(rect?.width)));
        spots.forEach((spot) => plus.push({ ...spot, row }));
      } else if (hit) {
        const rect = rectOf(hit.hosts);
        if (rect) plus.push({ item: null, rect: toWorldRect(rect), row: false });
      }
    }
    selectedItem.set(picked && subjectLoc ? { loc: subjectLoc, item: picked } : null);
    setGeometry((previous) => (sameFrames(previous.frames, frames) && sameSources(previous.sources, sources) && samePlus(previous.plus, plus) ? previous : { frames, sources, plus }));
  }, [boardRef, file, links, tree, selectedLoc, subjectLoc, trigger, ownItem, items, instance, part]);

  // Measure after each render of the page (an edit, a frame moved or resized), on a selection change and when the
  // board's frames change size or place. Pan and zoom only re-place what was measured.
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(board);
    board.querySelectorAll("[data-studio-frame]").forEach((element) => observer.observe(element));
    const stop = onSourceUpdate(schedule);
    // A frame dragged, nudged or placed again (board/frames.ts): its arrows follow during the drag.
    const offMoved = onFramesMoved(schedule);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); stop(); offMoved(); };
  }, [boardRef, measure]);

  // Canvas keys (Escape, ⇧Enter, ⌘Z) keep working after a press on the layer: the canvas takes focus, as a click there would.
  const focusCanvas = () => canvasApi.getViewportElement()?.focus({ preventScroll: true });

  const selectSource = (link: ProtoLink) => {
    const world = canvasApi.getWorldElement();
    const hit = world ? findBySrc(world, `${file}:${link.loc}`)[0] : null;
    if (hit) selectHit(hit, world);
    focusCanvas();
  };

  /** The frame (a Screen or an Overlay) under a viewport-local point, the topmost when frames overlap. */
  const frameAt = (point: Point): string | null => {
    const world = { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
    let found: string | null = null;
    geometry.frames.forEach((rect, id) => {
      if (world.x >= rect.x && world.x <= rect.x + rect.width && world.y >= rect.y && world.y <= rect.y + rect.height) found = id;
    });
    return found;
  };

  /** The options the action on `trigger` has now (its animation, its delay): a drop that changes the target keeps them. */
  const optionsNow = (loc: string, trigger: string) => {
    const at = findNode(tree, loc);
    const proto = at ? protoOf(triggerValue(at, trigger)) : null;
    return proto ? optionsOf(proto.action, proto.args) : undefined;
  };

  const layerOf = (loc: string) => {
    const at = findNode(tree, loc);
    return at ? { file, loc, name: at.name } : null;
  };

  const startDrag = (event: ReactPointerEvent<Element>, base: Pick<Drag, "kind" | "link" | "item" | "start">, home: string | null) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    focusCanvas();
    const box = getViewportBox();
    const local = (pointer: { clientX: number; clientY: number }): Point => ({ x: pointer.clientX - box.left, y: pointer.clientY - box.top });
    const pressed = local(event);
    let current: Drag = { ...base, point: pressed, over: null, home: false, moved: false };
    setDrag(current);
    const move = (pointer: PointerEvent) => {
      const point = local(pointer);
      const at = frameAt(point);
      const moved = current.moved || Math.hypot(point.x - pressed.x, point.y - pressed.y) > 3;
      current = { ...current, point, moved, over: at === home ? null : at, home: Boolean(at && at === home) };
      setDrag(current);
    };
    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
      setDrag(null);
      if (commit) void drop(current);
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== "Escape") return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      finish(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
  };

  /** Leads `item` of the choice control at `loc` (its `trigger`) to `target` (null: nowhere), keeping its other items'
   *  targets. One action per trigger: an item can't open an overlay while the others navigate (the tab says why). */
  const writeItem = async (loc: string, trigger: string, item: string, target: { action: "navigate" | "open"; target: string } | null) => {
    const at = findNode(tree, loc);
    const layer = layerOf(loc);
    if (!at || !layer) return;
    const proto = protoOf(triggerValue(at, trigger));
    const current = proto && (proto.action === "navigate" || proto.action === "open") ? proto : null;
    const targets = current ? targetsByItem(current.args[0], choiceItemsOf(at)) ?? {} : {};
    const others = Object.keys(targets).filter((key) => key !== item);
    const action: "navigate" | "open" | undefined = target?.action ?? (current?.action === "navigate" || current?.action === "open" ? current.action : undefined);
    if (!action) return;
    if (current && target && current.action !== target.action && others.length) {
      announceEditStatus({ kind: "warning", message: `Its other items ${current.action === "navigate" ? "navigate" : "open overlays"}: one kind of action per control`, at: Date.now() });
      return;
    }
    const next = { ...(current?.action === action ? targets : {}), [item]: target?.target };
    if (!target && !others.length) { await writeAction(layer, trigger, "none"); return; }
    const label = choiceItemsOf(at).find((entry) => entry.value === item)?.label ?? item;
    await writeItemTargets(layer, trigger, action, next, target ? `${label} → ${target.target}` : `${label} → none`, current ? optionsOf(current.action, current.args) : undefined);
  };

  const drop = async (done: Drag) => {
    const target = done.over ? targetOfFrame(done.over) : null;
    if (done.kind === "new") {
      // A click on ⊕ (no drag) opens the trigger's action list in the Prototype tab, as Figma's + opens the interaction.
      if (!done.moved && trigger) { document.querySelector<HTMLElement>(`#studio-right [data-prop="proto:${CSS.escape(trigger)}"] button`)?.click(); return; }
      if (!target || !subjectLoc || !trigger) return;
      if (done.item) { await writeItem(subjectLoc, trigger, done.item, target); return; }
      const layer = layerOf(subjectLoc);
      if (layer) await writeAction(layer, trigger, target.action, target.target, optionsNow(subjectLoc, trigger));
      return;
    }
    const link = done.link;
    const layer = link ? layerOf(link.loc) : null;
    if (!link || !layer || !done.moved || done.home) return;
    if (target && target.action === link.action && target.target === link.target) return;
    if (link.item) { await writeItem(link.loc, link.trigger, link.item, target); return; }
    // Dropped on no frame: the connection goes (Figma); ⌘Z brings it back.
    if (!target) { await writeAction(layer, link.trigger, "none"); return; }
    await writeAction(layer, link.trigger, target.action, target.target, optionsNow(link.loc, link.trigger));
  };

  // Screen-space geometry.
  const picked = useSyncExternalStore(selectedItem.subscribe, selectedItem.get, selectedItem.get);
  const isSelected = (link: ProtoLink) => link.loc === subjectLoc && (!picked || picked.loc !== link.loc || link.item === picked.item);
  const paths = links.flatMap((link, index) => {
    const source = geometry.sources.get(linkSource(link.loc, link.item));
    const target = geometry.frames.get(link.frameId);
    if (!source || !target) return [];
    const a = project(source.rect, view);
    const b = project(target, view);
    // An item in a row (a tab) leaves from its top, so its arrow does not run along the bar.
    const forward = source.row ? b.x + b.width / 2 >= a.x + a.width / 2 : b.x >= a.x + a.width;
    const from = source.row ? { x: a.x + a.width / 2, y: a.y } : { x: forward ? a.x + a.width : a.x, y: a.y + a.height / 2 };
    const key = linkKey(link);
    const dragging = drag?.kind === "end" && drag.link === link;
    const path = dragging ? curve(from, drag.point, undefined, source.row) : arrowPath(from, b, forward, source.row);
    return [{ key: `${index}:${key}:${link.frameId}`, link, from, ...path, selected: isSelected(link), dragging }];
  });
  const plus = editable && trigger && !drag ? geometry.plus.map((spot) => {
    const box = project(spot.rect, view);
    return { item: spot.item, at: { x: spot.row ? box.x + box.width - PLUS_INSET : box.x + box.width + PLUS_GAP, y: box.y + box.height / 2 } };
  }) : [];
  const newLine = drag?.kind === "new" ? curve(drag.start, drag.point) : null;
  const overRect = drag?.over ? geometry.frames.get(drag.over) : null;
  const dim = paths.some((path) => path.selected) || Boolean(drag);

  if (!paths.length && !plus.length && !drag) return null;
  return (
    <div className="studio-proto-layer" data-dragging={drag ? "true" : undefined}>
      <svg className="studio-proto-links" aria-hidden="true" data-links={paths.length}>
        {paths.map((path) => (
          <g key={path.key} className="studio-proto-link" data-selected={path.selected || path.dragging || undefined} data-dim={(dim && !path.selected && !path.dragging) || undefined} data-hover={hovered === path.key || undefined}>
            <circle cx={path.from.x} cy={path.from.y} r={4} />
            <path className="studio-proto-link__line" d={path.d} />
            <path className="studio-proto-link__line" d={path.head} />
            {!drag ? (
              <path
                className="studio-proto-link__hit"
                d={path.d}
                onPointerEnter={() => setHovered(path.key)}
                onPointerLeave={() => setHovered((key) => (key === path.key ? null : key))}
                onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); selectSource(path.link); }}
              />
            ) : null}
          </g>
        ))}
        {newLine ? (
          <g className="studio-proto-link" data-selected="true">
            <circle cx={newLine.end.x} cy={newLine.end.y} r={4} />
            <path className="studio-proto-link__line" d={newLine.d} />
          </g>
        ) : null}
      </svg>
      {overRect ? (() => { const box = project(overRect, view); return <div className="studio-proto-target" style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.width, height: box.height }} />; })() : null}
      {editable && !drag ? paths.filter((path) => path.selected && path.link.own).map((path) => (
        <span
          key={`end:${path.key}`}
          className="studio-proto-end"
          title="Drag to another frame · off every frame to remove"
          style={{ transform: `translate(${path.end.x}px, ${path.end.y}px)` }}
          onPointerDown={(event) => startDrag(event, { kind: "end", link: path.link, start: path.from }, homeFrame)}
        />
      )) : null}
      {plus.map((spot) => (
        <span
          key={`plus:${spot.item ?? ""}`}
          className="studio-proto-plus"
          data-item={spot.item ?? undefined}
          title="Drag to a screen or overlay to connect"
          style={{ transform: `translate(${spot.at.x}px, ${spot.at.y}px)` }}
          onPointerDown={(event) => startDrag(event, { kind: "new", item: spot.item, start: spot.at }, homeFrame)}
        >
          <Icon name="icon-plus-line" size="xs" decorative />
        </span>
      ))}
      {drag ? <div className="studio-proto-cover" /> : null}
    </div>
  );
}
