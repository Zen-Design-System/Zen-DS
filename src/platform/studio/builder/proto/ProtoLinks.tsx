import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import type { PageNode, PageTree, PageValue } from "../render/renderPage";

/*
 * Prototype links on the canvas (Studio builder GĐ2 M3): while the Inspector's Prototype tab is open, an arrow from each
 * element whose action navigates to a Screen or opens an Overlay to that frame. Drawn in the board's own coordinates
 * (the world zooms them with the frames), behind nothing that takes pointer events.
 */

type Link = { loc: string; target: string };
type Path = { key: string; d: string; x: number; y: number; head: string };

/** Every navigate / open action of the page: the element's loc and the frame it leads to. */
export function linksOf(tree: PageTree | null): Link[] {
  const out: Link[] = [];
  const stack: PageNode[] = tree?.board ? [tree.board] : [];
  while (stack.length) {
    const node = stack.pop()!;
    const values: PageValue[] = Object.values(node.props);
    while (values.length) {
      const value = values.pop()!;
      if (value.kind === "proto" && (value.action === "navigate" || value.action === "open") && typeof value.args[0] === "string") {
        out.push({ loc: node.loc, target: `${value.action === "navigate" ? "screen" : "overlay"}:${value.args[0]}` });
      } else if (value.kind === "element") stack.push(value.node);
      else if (value.kind === "array") values.push(...value.items);
      else if (value.kind === "object") values.push(...Object.values(value.fields));
    }
    for (const child of node.children) {
      if (child.kind === "element") stack.push(child);
      else if (child.kind === "map") stack.push(child.node);
    }
  }
  return out;
}

export function ProtoLinks({ tree, file, boardRef }: { tree: PageTree | null; file: string; boardRef: RefObject<HTMLDivElement | null> }) {
  const links = useMemo(() => linksOf(tree), [tree]);
  const [paths, setPaths] = useState<Path[]>([]);
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || !links.length) { setPaths([]); return undefined; }
    const measure = () => {
      const box = board.getBoundingClientRect();
      const zoom = board.offsetWidth ? box.width / board.offsetWidth : 1;
      const local = (rect: DOMRect) => ({ left: (rect.left - box.left) / zoom, top: (rect.top - box.top) / zoom, right: (rect.right - box.left) / zoom, bottom: (rect.bottom - box.top) / zoom });
      const next: Path[] = [];
      links.forEach((link, index) => {
        const from = board.querySelector(`[data-zen-src="${CSS.escape(`${file}:${link.loc}`)}"]`);
        const to = board.querySelector(`[data-studio-frame="${CSS.escape(link.target)}"]`);
        if (!from || !to) return;
        const a = local(from.getBoundingClientRect());
        const b = local(to.getBoundingClientRect());
        const forward = b.left >= a.right;
        const x1 = forward ? a.right : a.left;
        const y1 = (a.top + a.bottom) / 2;
        const x2 = forward ? b.left : b.right;
        const y2 = Math.min(Math.max(y1, b.top + 24), b.bottom - 24);
        const bend = Math.max(48, Math.abs(x2 - x1) / 2) * (forward ? 1 : -1);
        const dir = forward ? -1 : 1;
        next.push({
          key: `${index}:${link.loc}:${link.target}`,
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          x: x1,
          y: y1,
          head: `M ${x2 + dir * 10} ${y2 - 6} L ${x2} ${y2} L ${x2 + dir * 10} ${y2 + 6}`,
        });
      });
      setPaths(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, [boardRef, file, links]);
  if (!paths.length) return null;
  return (
    <svg className="studio-proto-links" aria-hidden="true" data-links={paths.length}>
      {paths.map((path) => (
        <g key={path.key}>
          <circle cx={path.x} cy={path.y} r={4} />
          <path d={path.d} />
          <path d={path.head} />
        </g>
      ))}
    </svg>
  );
}
