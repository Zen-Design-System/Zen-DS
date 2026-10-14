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
import { PageOsContext, pageOsOf, ProtoContext, type ProtoActions } from "./proto/runtime";
import { frameOf } from "./render/frames";
import { assetIdsOf, missingAssets, useUploadsVersion } from "./assets/uploads";
import { cacheGeneration, renderCache, renderFrame, type PageNode, type RenderCache } from "./render/renderPage";
import { engineNow, zenComponents } from "./engine";
import { setPlaces } from "../select/srcIds";

/** A stable number per prototype-actions object (the canvas's inert set, Interact's live one) for the render cache. */
const protoKeys = new WeakMap<object, number>();
let protoCount = 0;
const protoKey = (proto: object) => { if (!protoKeys.has(proto)) protoKeys.set(proto, (protoCount += 1)); return protoKeys.get(proto); };
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
  // Uploaded photos resolve once they have loaded (the frames render again); one this browser lacks is named.
  const uploads = useUploadsVersion();
  const assets = text ? assetIdsOf(text).join(" ") : "";
  useEffect(() => {
    if (!assets) return undefined;
    let alive = true;
    void missingAssets(assets.split(" ")).then((missing) => {
      if (alive && missing.length) announceEditStatus({ kind: "warning", message: `Missing photo${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Select the Image and pick another photo in Assets › Photos.`, at: Date.now() });
    });
    return () => { alive = false; };
  }, [id, assets]);
  // The new text is on the canvas: what read the old one reads again (Vite's afterUpdate for example code), once the
  // browser has painted it — in the same task the Inspector, Layers and the selection overlay would redraw first and
  // hold the edit back from the screen (2026-10-13: 13–35 ms of every edit).
  useEffect(() => {
    if (!tree) return undefined;
    let timer = 0;
    const frame = requestAnimationFrame(() => { timer = window.setTimeout(() => notifySourceUpdate(), 0); });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [tree]);

  const file = pageFile(id);
  // Elements of unchanged nodes are reused from the last render (renderPage.tsx renderCache): an edit renders what it
  // changed, not the whole page. What the nodes do not say starts the cache anew.
  const cacheRef = useRef<RenderCache | null>(null);
  cacheRef.current ??= renderCache();
  const mockKey = useMemo(() => JSON.stringify(tree?.mock ?? null), [tree]);
  if (tree) cacheGeneration(cacheRef.current, tree, `${file}|${protoKey(proto)}|${uploads}|${mockKey}`);
  // The page's document ids by place (doc.mjs locsOf): the canvas marks elements by id, and the Studio reads their place
  // back from select/srcIds.ts, set here in the render that shows this text. A page without a document (never edited
  // since it was made) is marked by place.
  const places = useMemo(() => {
    const engine = engineNow();
    if (!engine || !page?.doc || text === undefined) return null;
    try { return engine.locsOf(page.doc, text, { components: new Set(zenComponents) }) as { idAt: Map<string, string>; locOf: Map<string, string> }; } catch { return null; }
  }, [page?.doc, text]);
  if (places) setPlaces(file, places.locOf);
  const frames = useMemo(() => {
    if (!tree?.board) return [];
    // Proto handlers act on the canvas only with the Interact tool (Play runs the flow); in Select they are inert.
    const ctx = { file, mock: tree.mock, proto, cache: cacheRef.current ?? undefined, ids: places?.idAt };
    return tree.board.children.filter((child): child is PageNode => child.kind === "element").map((node) => {
      const frame = frameOf(node);
      const example: StudioExample = { title: frame.label, description: "", code: text ?? "", screen: true, render: () => renderFrame(node, ctx) };
      return { ...frame, example };
    });
  }, [tree, file, text, proto, places]);

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
      <PageOsContext value={pageOsOf(tree?.header)}>
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
      </PageOsContext>
    </ProtoContext>
  );
}
