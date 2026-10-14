import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../../../../components/Icon";
import { GROUP_ICON } from "../../builder/library/catalog";
import { renderInert, useItemNode } from "../../builder/library/ItemPreview";
import { previewAttributes } from "../../shell/modes";
import type { PaletteItem } from "../../slots/palette";
import { useStudio } from "../../store";

/*
 * An Assets thumbnail (Figma's asset grid, user 2026-10-09): the component drawn for real — the same engine render as
 * Quick insert's preview, in the canvas's preview modes, inert — at its own width (up to STAGE_MAX) and scaled down to
 * fit the tile. It renders once it first scrolls into view, so a long library costs only what is on screen.
 */

/** The widest an item lays out before it is scaled into its tile. */
const STAGE_MAX = 360;

export function AssetThumb({ item }: { item: PaletteItem }) {
  const preview = useStudio((state) => state.preview);
  const tileRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [scale, setScale] = useState(1);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const node = useItemNode(item, !seen);

  useEffect(() => {
    const tile = tileRef.current;
    if (!tile || seen) return undefined;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) setSeen(true); }, { rootMargin: "120px" });
    observer.observe(tile);
    return () => observer.disconnect();
  }, [seen]);

  useLayoutEffect(() => {
    const tile = tileRef.current;
    const stage = stageRef.current;
    if (!tile || !stage || !node) return undefined;
    const fit = () => {
      const width = Math.max(1, stage.offsetWidth);
      const height = Math.max(1, stage.offsetHeight);
      setScale(Math.min(1, (tile.clientWidth - 16) / width, (tile.clientHeight - 16) / height));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(tile);
    return () => observer.disconnect();
  }, [node]);

  return (
    <span ref={tileRef} className="studio-assets__thumb" data-ready={node ? "true" : undefined} aria-hidden="true" inert {...previewAttributes(preview)}>
      {node ? (
        <div ref={stageRef} className="studio-assets__stage" style={{ maxWidth: STAGE_MAX, transform: `scale(${scale})` }} data-zen-overlay-root="">
          {portal ? renderInert(node, portal, <Icon name={GROUP_ICON[item.group]} size="lg" decorative />) : null}
        </div>
      ) : null}
      <div ref={setPortal} className="studio-assets__portal" />
    </span>
  );
}
