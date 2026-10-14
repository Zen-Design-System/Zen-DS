import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ZenPortalProvider } from "../../../../components/Portal";
import { previewAttributes } from "../../shell/modes";
import { useStudio } from "../../store";
import type { PaletteItem } from "../../slots/palette";
import { loadEngine, zenComponents } from "../engine";
import { renderNode, type PageNode, type PageTree } from "../render/renderPage";
import type { ProtoActions } from "../proto/runtime";
import { previewPageText } from "./preview";

/*
 * The focused library item drawn for real (Studio builder GĐ3 M2, spec §3c): parsed by the engine (loaded on the first
 * preview), rendered in the canvas's preview modes, inert, scaled down to fit the pane and centred in it — what it paints,
 * not the layout box around it (a row of buttons justified to the end sits in the middle, user 2026-10-10).
 */

const inert: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };

/** Overlays stay closed in a preview (their `open` was a state variable the page cannot hold): the opener shows. */
const OVERLAYS = new Set(["Dialog", "ModalForm", "SidePanel", "BottomSheet"]);
function closeOverlays(node: PageNode): PageNode {
  const props = OVERLAYS.has(node.name) ? { ...node.props, open: { kind: "literal" as const, value: false } } : node.props;
  const children = node.children.map((child) => (child.kind === "element" ? closeOverlays(child) : child.kind === "map" ? { ...child, node: closeOverlays(child.node) } : child));
  return { ...node, props, children };
}
/** The width the item lays out at before it is scaled into the pane. */
const STAGE_WIDTH = 400;
/** Room kept around the item in the pane (Spacing/Padding/XLarge): a field or a card never runs to its edge. */
const PANE_INSET = 24;
/** Elements that paint whatever their styles. */
const PAINTED_TAGS = /^(img|svg|input|textarea|select|button|canvas|video|hr)$/i;

/**
 * The box the item paints on the stage, in stage pixels (before its transform): the union of its text (each run's own
 * extent, not the block it sits in: a heading is as wide as its words), of the elements with a fill, a border or a
 * shadow, of empty ones (an icon's shapes) and of images and controls — not the layout wrappers around them. Null when
 * nothing is drawn yet.
 */
function paintedBounds(stage: HTMLElement, scale: number) {
  const origin = stage.getBoundingClientRect();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const add = (rect: DOMRect) => {
    if (!rect.width || !rect.height) return;
    left = Math.min(left, rect.left); top = Math.min(top, rect.top); right = Math.max(right, rect.right); bottom = Math.max(bottom, rect.bottom);
  };
  for (const element of stage.querySelectorAll<HTMLElement>("*")) {
    const style = getComputedStyle(element);
    if (style.visibility === "hidden") continue;
    const empty = element.children.length === 0 && !element.textContent?.trim();
    const paints = empty || PAINTED_TAGS.test(element.tagName)
      || style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.backgroundImage !== "none" || style.boxShadow !== "none"
      || Number.parseFloat(style.borderTopWidth) > 0 || Number.parseFloat(style.borderBottomWidth) > 0;
    if (paints) add(element.getBoundingClientRect());
  }
  const texts = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let text = texts.nextNode(); text; text = texts.nextNode()) {
    if (!text.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    add(range.getBoundingClientRect());
  }
  if (!Number.isFinite(left)) return null;
  return { x: (left - origin.left) / scale, y: (top - origin.top) / scale, width: (right - left) / scale, height: (bottom - top) / scale };
}

/** The item as a page node, parsed by the engine (undefined while it loads, null when it cannot be drawn); `skip`
 *  waits (a thumbnail not scrolled into view yet). Shared by this pane and the Assets thumbnails. */
export function useItemNode(item: PaletteItem, skip = false): PageNode | null | undefined {
  const [node, setNode] = useState<PageNode | null | undefined>(undefined);
  useEffect(() => {
    if (skip) return undefined;
    let alive = true;
    setNode(undefined);
    void loadEngine().then((engine) => {
      const tree = engine.parsePage(previewPageText(item), { components: new Set(zenComponents) }) as unknown as PageTree;
      const screen = tree.board?.children.find((child): child is PageNode => child.kind === "element");
      const first = screen?.children.find((child): child is PageNode => child.kind === "element") ?? null;
      if (alive) setNode(first ? closeOverlays(first) : null);
    }).catch(() => { if (alive) setNode(null); });
    return () => { alive = false; };
  }, [item, skip]);
  return node;
}

/** A preview that throws while it renders (a prop the engine could not carry, as a Table's `cell` functions) shows
 *  `fallback` instead of taking the panel down with it. */
class PreviewBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Renders a parsed item inert: its links and prototype actions do nothing, its portals stay in `portal`; a render
 *  error shows `fallback` (nothing by default). */
export function renderInert(node: PageNode, portal: HTMLElement, fallback: ReactNode = null) {
  return (
    <PreviewBoundary fallback={fallback}>
      <ZenPortalProvider container={portal}>{renderNode(node, { mock: {} }, { file: "preview:item.zen.tsx", mock: {}, proto: inert })}</ZenPortalProvider>
    </PreviewBoundary>
  );
}

export function ItemPreview({ item }: { item: PaletteItem }) {
  const preview = useStudio((state) => state.preview);
  const node = useItemNode(item);
  const paneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** The stage's transform: its painted box scaled into the pane and centred there. */
  const [place, setPlace] = useState({ x: 0, y: 0, scale: 1 });
  const placeRef = useRef(place);
  placeRef.current = place;
  /** Anything the item portals (a popover, a menu) stays inside the inert pane. */
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const pane = paneRef.current;
    const stage = stageRef.current;
    if (!pane || !stage) return undefined;
    const fit = () => {
      const box = paintedBounds(stage, placeRef.current.scale) ?? { x: 0, y: 0, width: STAGE_WIDTH, height: Math.max(1, stage.offsetHeight) };
      const scale = Math.min(1, (pane.clientWidth - 2 * PANE_INSET) / Math.max(1, box.width), (pane.clientHeight - 2 * PANE_INSET) / Math.max(1, box.height));
      const next = { scale, x: pane.clientWidth / 2 - (box.x + box.width / 2) * scale, y: pane.clientHeight / 2 - (box.y + box.height / 2) * scale };
      setPlace((was) => (Math.abs(was.x - next.x) < 0.5 && Math.abs(was.y - next.y) < 0.5 && Math.abs(was.scale - next.scale) < 0.001 ? was : next));
    };
    fit();
    // Sizes, and the item's content itself: a new item can keep the stage's height (Heading → Paragraph) and must be
    // placed again all the same.
    let frame = 0;
    const refit = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); };
    const observer = new ResizeObserver(refit);
    observer.observe(stage);
    observer.observe(pane);
    const content = new MutationObserver(refit);
    content.observe(stage, { childList: true, subtree: true, characterData: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); content.disconnect(); };
  }, [node]);

  return (
    <div ref={paneRef} className="studio-qi__preview" data-e2e="quick-insert-preview" data-ready={node ? "true" : undefined} aria-hidden="true" inert {...previewAttributes(preview)}>
      {node ? (
        <div ref={stageRef} className="studio-qi__stage" style={{ width: STAGE_WIDTH, transform: `translate(${place.x}px, ${place.y}px) scale(${place.scale})` }} data-zen-overlay-root="">
          {portal ? renderInert(node, portal) : null}
        </div>
      ) : <div ref={stageRef} className="studio-qi__stage studio-qi__stage--empty" />}
      <div ref={setPortal} className="studio-qi__portal" />
    </div>
  );
}
