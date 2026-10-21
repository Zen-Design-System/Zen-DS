import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { frameOf, isSectionNode } from "./render/frames";
import { SectionFrame } from "./SectionFrame";
import { placeFrames } from "./render/framePlace";
import { livePlace, settleLivePlace } from "./frameMove";
import { useFrameKeys } from "./frameKeys";
import { arrivingFor, notifyFramesMoved } from "../board/frames";
import { notifyCanvas } from "../canvas/viewport";
import { assetIdsOf, missingAssets, useUploadsVersion } from "./assets/uploads";
import { cacheGeneration, componentsKey, componentsOf, renderCache, renderFrame, type PageNode, type RenderCache } from "./render/renderPage";
import { engineNow, zenComponents } from "./engine";
import { setPlaces } from "../select/srcIds";
import { setHiddenLayers } from "../edit/visibility";
import { setLayerMeta } from "../select/layerMeta";

/** A stable number per prototype-actions object (the canvas's inert set, Interact's live one) for the render cache. */
const protoKeys = new WeakMap<object, number>();
let protoCount = 0;
const protoKey = (proto: object) => { if (!protoKeys.has(proto)) protoKeys.set(proto, (protoCount += 1)); return protoKeys.get(proto); };
import { Button } from "../../../components/Button";
import { studioStore, useStudio } from "../store";
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
  // The page's main components (an instance is drawn from its main): their signature is part of the cache's env.
  const components = useMemo(() => componentsOf(tree?.board ?? null), [tree]);
  if (tree) cacheGeneration(cacheRef.current, tree, `${file}|${protoKey(proto)}|${uploads}|${mockKey}|${componentsKey(components)}`);
  // The page's document ids by place (doc.mjs locsOf): the canvas marks elements by id, and the Studio reads their place
  // back from select/srcIds.ts, set here in the render that shows this text. A page without a document (never edited
  // since it was made) is marked by place.
  const places = useMemo(() => {
    const engine = engineNow();
    if (!engine || !page?.doc || text === undefined) return null;
    try { return engine.locsOf(page.doc, text, { components: new Set(zenComponents) }) as { idAt: Map<string, string>; locOf: Map<string, string> }; } catch { return null; }
  }, [page?.doc, text]);
  if (places) setPlaces(file, places.locOf);
  // Hidden layers are not drawn: Layers lists them from the page's tree (edit/visibility.ts).
  if (tree) setHiddenLayers(file, tree);
  // Layer names and locks (Figma's): the automatic names and the locked layers, from the same tree (select/layerMeta.ts).
  if (tree) setLayerMeta(file, tree);
  const framesRef = useRef<HTMLDivElement>(null);
  useFrameKeys(id, text);
  const frames = useMemo(() => {
    if (!tree?.board) return [];
    // Proto handlers act on the canvas only with the Interact tool (Play runs the flow); in Select they are inert.
    const ctx = { file, mock: tree.mock, proto, cache: cacheRef.current ?? undefined, ids: places?.idAt, components };
    // The page's OS goes with each frame, so Present (outside the board) draws its Screens' bars and picks their device
    // as the canvas does.
    const os = pageOsOf(tree.header);
    return tree.board.children.filter((child): child is PageNode => child.kind === "element" && !isSectionNode(child)).map((node) => {
      const frame = frameOf(node);
      const example: StudioExample = { title: frame.label, description: "", code: text ?? "", screen: true, render: () => <PageOsContext value={os}>{renderFrame(node, ctx)}</PageOsContext> };
      return { ...frame, example };
    });
  }, [tree, file, text, proto, places]);
  // Free frames (Figma-like): each at its x / y from the page, the others in the row (render/framePlace.ts); a frame being
  // dragged or nudged keeps its live place until the page has it (frameMove.ts). Written before the browser paints, as
  // the component board places its examples; the box spans the frames for the board's size.
  // Figma's sections (F4): drawn first, behind the frames; placed like them (always at their own place).
  const sections = useMemo(() => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element" && isSectionNode(child)).map(frameOf), [tree]);
  const allPlaces = useMemo(() => placeFrames([...sections, ...frames]), [sections, frames]);
  const framePlaces = useMemo(() => allPlaces.slice(sections.length), [allPlaces, sections.length]);
  // A selected frame the page no longer has (⌘Z took back the copy or the drawn frame): nothing stays selected. A frame
  // the Studio has just added keeps its selection a moment (a render of an older text can come after its own, board/
  // frames.ts arrivingFor), then the check runs again.
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!tree?.board || tree.errors.length) return;
    const selection = studioStore.getState().selection;
    if (selection?.kind !== "frame" || !/^(screen|overlay|section):/.test(selection.frameId) || frames.some((frame) => frame.id === selection.frameId) || sections.some((section) => section.id === selection.frameId)) return;
    const wait = arrivingFor(selection.frameId);
    if (!wait) { studioStore.setState({ selection: null }); return; }
    const timer = window.setTimeout(() => setRecheck((n) => n + 1), wait + 50);
    return () => window.clearTimeout(timer);
  }, [tree, frames, sections, recheck]);
  useLayoutEffect(() => {
    const container = framesRef.current;
    if (!container) return;
    let moved = false;
    let right = 0;
    let bottom = 0;
    [...sections, ...frames].forEach((frame, index) => {
      const element = container.querySelector<HTMLElement>(`:scope > [data-studio-frame="${CSS.escape(frame.id)}"]`);
      if (!element) return;
      settleLivePlace(frame.id, allPlaces[index]);
      const place = livePlace(frame.id) ?? allPlaces[index];
      const left = `${place.x}px`;
      const top = `${place.y}px`;
      if (element.style.left !== left || element.style.top !== top) {
        element.style.left = left;
        element.style.top = top;
        moved = true;
      }
      right = Math.max(right, place.x + element.offsetWidth);
      bottom = Math.max(bottom, place.y + element.offsetHeight);
    });
    container.style.width = `${right}px`;
    container.style.height = `${bottom}px`;
    if (moved) {
      notifyFramesMoved();
      notifyCanvas();
    }
  });

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
        <div ref={framesRef} className="studio-builder-board__frames">
          {sections.map((section) => <SectionFrame key={section.id} id={section.id} label={section.label} width={section.width} height={section.height ?? 100} />)}
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
