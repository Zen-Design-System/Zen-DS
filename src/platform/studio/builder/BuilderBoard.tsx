import { useEffect, useMemo, useRef } from "react";
import { Icon } from "../../../components/Icon";
import { Heading, Text } from "../../../components/Text";
import { StudioFrame } from "../board/StudioFrame";
import type { StudioExample } from "../board/frames";
import { notifySourceUpdate } from "../select/picker";
import { announceEditStatus } from "../api";
import { zoomToFrame } from "../board/presentFrame";
import { usePageTree } from "./usePageTree";
import { ProtoLinks } from "./proto/ProtoLinks";
import { ProtoContext, type ProtoActions } from "./proto/runtime";
import { frameOf } from "./render/frames";
import { renderFrame, type PageNode } from "./render/renderPage";
import { Button } from "../../../components/Button";
import { useStudio } from "../store";
import { pageFile, pagesPersist, restorePage, usePage, useStorage, useTrash } from "./store/pageStore";
import "./builder.css";

/*
 * A builder page on the canvas (Studio builder GĐ2 M1; spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b):
 * the page's text from the PageStore, parsed by the engine (dialect.mjs) and rendered without eval, one Studio frame per
 * Screen ("screen:<id>[:<state>]") and Overlay ("overlay:<id>") at its device width. Frames are ordinary example frames
 * to the rest of the Studio (Layers, selection, the frame chrome, Present). Each new text re-renders the board and then
 * tells the Studio a source update happened (the Inspector and the slot layers read again), as Vite's hot update does.
 */

const inertProto: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };

/** With the Interact tool (GĐ2 M3), a page's actions act on the canvas: navigate / open zoom to their frame, toast says
 *  its title in the status line, link opens a tab. Close and back have nothing to undo here (Play runs the flow). */
const frameElement = (id: string) => document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(id)}"]`);
const canvasProto: ProtoActions = {
  navigate: (screen) => { const frame = frameElement(`screen:${screen}`); if (frame) zoomToFrame(frame); },
  open: (overlay) => { const frame = frameElement(`overlay:${overlay}`); if (frame) zoomToFrame(frame); },
  close: () => undefined,
  back: () => undefined,
  toast: (options) => {
    const title = options && typeof options === "object" && "title" in options ? String((options as { title?: unknown }).title ?? "") : String(options ?? "");
    announceEditStatus({ kind: "unchanged", message: `Toast: ${title}`, at: Date.now() });
  },
  link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
};


/** The board's kicker: where the page is kept. */
function whereKept(storage: ReturnType<typeof useStorage>): string {
  if (storage.kind === "mirror") return storage.mirror === "dev" ? `My page · kept in ${storage.label}` : `My page · kept in the folder “${storage.label}”`;
  return pagesPersist() ? "My page · saved in this browser" : "My page · this browser cannot keep pages: export it before closing";
}

export function BuilderBoard({ id }: { id: string }) {
  const page = usePage(id);
  const interact = useStudio((state) => state.tool === "interact");
  const showLinks = useStudio((state) => state.inspectorTab === "prototype");
  const boardRef = useRef<HTMLDivElement>(null);
  const proto = interact ? canvasProto : inertProto;
  const storage = useStorage();
  const inTrash = useTrash().some((item) => item.id === id);
  const admin = useStudio((state) => state.role === "admin");
  const text = page?.text;
  const tree = usePageTree(text);
  // The new text is on the canvas: what read the old one reads again (Vite's afterUpdate for example code).
  useEffect(() => { if (tree) notifySourceUpdate(); }, [tree]);

  const file = pageFile(id);
  const frames = useMemo(() => {
    if (!tree?.board) return [];
    // Proto handlers act on the canvas only with the Interact tool (Play runs the flow); in Select they are inert.
    const ctx = { file, mock: tree.mock, proto };
    return tree.board.children.filter((child): child is PageNode => child.kind === "element").map((node) => {
      const frame = frameOf(node);
      const example: StudioExample = { title: frame.label, description: "", code: text ?? "", screen: true, render: () => renderFrame(node, ctx) };
      return { ...frame, example };
    });
  }, [tree, file, text, proto]);

  if (!page) {
    return (
      <div className="studio-board studio-builder-board" data-page={`local:${id}`}>
        {inTrash ? (
          <header className="studio-board__title">
            <Heading level={1} textStyle="Heading/1">This page is in the Trash</Heading>
            <Text tone="base">{`${id}.zen.tsx stays in the Trash for 30 days.`}</Text>
            <Button appearance="main" level="primary" size="md" disabled={!admin} onClick={() => void restorePage(id)}>Restore page</Button>
          </header>
        ) : <header className="studio-board__title"><Heading level={1} textStyle="Heading/1">Page not found</Heading><Text tone="base">This browser has no page "{id}".</Text></header>}
      </div>
    );
  }
  return (
    <ProtoContext value={proto}>
      <div ref={boardRef} className="studio-board studio-builder-board" data-page={`local:${id}`}>
        <header className="studio-board__title">
          <Text as="p" textStyle="Body/Small/Medium" tone="base">{whereKept(storage)}</Text>
          <Heading level={1} textStyle="Heading/1">{page.title}</Heading>
        </header>
        {tree?.errors.length ? (
          <div className="studio-builder-board__errors" role="status">
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            <Text textStyle="Body/Small/Regular">{`Line ${tree.errors[0].line}: ${tree.errors[0].message}${tree.errors.length > 1 ? ` (+${tree.errors.length - 1} more)` : ""}`}</Text>
          </div>
        ) : null}
        <div className="studio-builder-board__frames">
          {frames.map((frame) => (
            <StudioFrame key={frame.id} id={frame.id} kind="example" label={frame.label} width={frame.width} example={frame.example}>
              {frame.example.render()}
            </StudioFrame>
          ))}
        </div>
        {showLinks ? <ProtoLinks tree={tree} file={file} boardRef={boardRef} /> : null}
      </div>
    </ProtoContext>
  );
}
