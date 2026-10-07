import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * preview), rendered in the canvas's preview modes, inert, scaled down to fit the pane.
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

export function ItemPreview({ item }: { item: PaletteItem }) {
  const preview = useStudio((state) => state.preview);
  const [node, setNode] = useState<PageNode | null | undefined>(undefined);
  const paneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  /** Anything the item portals (a popover, a menu) stays inside the inert pane. */
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setNode(undefined);
    void loadEngine().then((engine) => {
      const tree = engine.parsePage(previewPageText(item), { components: new Set(zenComponents) }) as unknown as PageTree;
      const screen = tree.board?.children.find((child): child is PageNode => child.kind === "element");
      const first = screen?.children.find((child): child is PageNode => child.kind === "element") ?? null;
      if (alive) setNode(first ? closeOverlays(first) : null);
    }).catch(() => { if (alive) setNode(null); });
    return () => { alive = false; };
  }, [item]);

  useLayoutEffect(() => {
    const pane = paneRef.current;
    const stage = stageRef.current;
    if (!pane || !stage) return undefined;
    const fit = () => setScale(Math.min(1, (pane.clientWidth - 24) / STAGE_WIDTH, (pane.clientHeight - 24) / Math.max(1, stage.offsetHeight)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [node]);

  return (
    <div ref={paneRef} className="studio-qi__preview" data-e2e="quick-insert-preview" data-ready={node ? "true" : undefined} aria-hidden="true" inert {...previewAttributes(preview)}>
      {node ? (
        <div ref={stageRef} className="studio-qi__stage" style={{ width: STAGE_WIDTH, transform: `scale(${scale})` }} data-zen-overlay-root="">
          {portal ? <ZenPortalProvider container={portal}>{renderNode(node, { mock: {} }, { file: "preview:item.zen.tsx", mock: {}, proto: inert })}</ZenPortalProvider> : null}
        </div>
      ) : <div ref={stageRef} className="studio-qi__stage studio-qi__stage--empty" />}
      <div ref={setPortal} className="studio-qi__portal" />
    </div>
  );
}
