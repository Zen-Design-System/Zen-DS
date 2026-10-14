import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { ToastProvider, useToast, type ToastOptions } from "../../../../components/Toast";
import { fullScreenEscapeOwners } from "../../../PlatformFullScreen";
import { PresentBar } from "../../board/PresentBar";
import { canvasApi } from "../../canvas/viewport";
import { previewAttributes, type ModeKey } from "../../shell/modes";
import { studioStore, useStudio } from "../../store";
import type { StudioPreviewSettings } from "../../types";
import { renderNode, type PageNode, type PageTree } from "../render/renderPage";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { useUploadsVersion } from "../assets/uploads";
import { DEVICE_WIDTH, PageOsContext, pageOsOf, ProtoContext, type PageDevice, type ProtoActions } from "./runtime";

/*
 * Play (Studio builder GĐ2 M3, spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2d): the page runs full
 * screen from its first Screen (or the one named), and its proto actions are live: navigate opens a Screen's default
 * state, open shows an Overlay over the current Screen, close / back undo them, toast shows a Toast, link opens the URL
 * in a new tab. P starts it on a builder page, R restarts, Esc leaves. Play is Present's layer under the name
 * `presenting: "play:<screen>"`, so the Studio behind it is inert and its shortcuts wait, as for Present.
 */

export const PLAY_PREFIX = "play:";
export const isPlaying = (presenting: string | null | undefined) => Boolean(presenting?.startsWith(PLAY_PREFIX));

/** Starts Play on the open builder page (at `screen`, else its first Screen). */
export function startPlay(screen?: string | null) {
  const state = studioStore.getState();
  if (!state.localPage) return;
  studioStore.setState({ presenting: `${PLAY_PREFIX}${screen ?? ""}` });
}

export const stopPlay = () => { if (isPlaying(studioStore.getState().presenting)) studioStore.setState({ presenting: null }); };

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
const elements = (tree: PageTree | null) => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element");

/** StudioApp renders it beside Present: the Play layer while `presenting` is "play:…" on a builder page. */
export function Player() {
  const presenting = useStudio((state) => state.presenting);
  const localPage = useStudio((state) => state.localPage);
  if (!localPage || !isPlaying(presenting)) return null;
  return (
    <ToastProvider placement="bottom-center">
      <PlayLayer key={localPage} id={localPage} start={presenting!.slice(PLAY_PREFIX.length) || null} />
    </ToastProvider>
  );
}

function PlayLayer({ id, start }: { id: string; start: string | null }) {
  const page = usePage(id);
  const tree = usePageTree(page?.text);
  // Uploaded photos show once they have loaded.
  useUploadsVersion();
  const frames = useMemo(() => elements(tree), [tree]);
  const screens = frames.filter((node) => node.name === "Screen");
  const first = start && screens.some((node) => literal(node, "id") === start) ? start : String(literal(screens[0] ?? { props: {} } as PageNode, "id") ?? "");
  const [history, setHistory] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<string | null>(null);
  const current = history.at(-1) ?? first;
  const layerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  // Preview modes change here and in Present only (the toolbar has none): Play's own, light/dark included, over the
  // canvas modes. They change the page being played, never the Studio's UI (its bar keeps the chrome modes).
  const canvasModes = useStudio((state) => state.preview);
  const [own, setOwn] = useState<Partial<StudioPreviewSettings>>({});
  const modes: StudioPreviewSettings = { ...canvasModes, ...own };
  const setMode = useCallback((key: ModeKey, value: string) => setOwn((current) => ({ ...current, [key]: value })), []);

  const restart = useCallback(() => { setHistory([]); setOverlay(null); }, []);
  const exit = useCallback(() => stopPlay(), []);
  const screenOf = useCallback((screenId: string) => screens.find((node) => literal(node, "id") === screenId && literal(node, "state") === undefined) ?? screens.find((node) => literal(node, "id") === screenId), [screens]);
  const missing = useCallback((what: string, target: string) => toast({ title: `No ${what} “${target}” on this page`, type: "warning" }), [toast]);

  const actions = useMemo<ProtoActions>(() => ({
    navigate: (target) => {
      if (!screenOf(String(target))) { missing("screen", String(target)); return; }
      setOverlay(null);
      setHistory((stack) => [...(stack.length ? stack : [first]), String(target)]);
    },
    open: (target) => {
      if (!frames.some((node) => node.name === "Overlay" && literal(node, "id") === target)) { missing("overlay", String(target)); return; }
      setOverlay(String(target));
    },
    close: () => setOverlay(null),
    back: () => {
      if (overlay) { setOverlay(null); return; }
      setHistory((stack) => stack.slice(0, -1));
    },
    toast: (options) => toast((options && typeof options === "object" ? options : { title: String(options ?? "") }) as ToastOptions),
    link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
  }), [first, frames, missing, overlay, screenOf, toast]);

  useEffect(() => {
    layerRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const url = new URL(window.location.href);
    url.searchParams.set("play", start ?? "");
    window.history.replaceState(window.history.state, "", url);
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        // An open overlay (Dialog, Menu…) takes Escape first.
        if (layerRef.current?.querySelector(fullScreenEscapeOwners)) return;
        event.preventDefault();
        exit();
      } else if (event.key.toLowerCase() === "r" && !event.shiftKey) {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      root.style.overflow = overflow;
      const back = new URL(window.location.href);
      back.searchParams.delete("play");
      window.history.replaceState(window.history.state, "", back);
      requestAnimationFrame(() => { if (!studioStore.getState().presenting) canvasApi.getViewportElement()?.focus({ preventScroll: true }); });
    };
  }, [exit, restart, start]);

  const screen = screenOf(current);
  const overlayNode = overlay ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === overlay) : undefined;
  const overlayChild = overlayNode?.children.find((child): child is PageNode => child.kind === "element");
  const device = (screen ? (literal(screen, "device") as PageDevice | undefined) : undefined) ?? "desktop";
  const ctx = { file: pageFile(id), mock: tree?.mock ?? {}, proto: actions };
  const title = page?.title ?? id;
  const screenTitle = screen ? String(literal(screen, "title") ?? current) : "";

  return (
    <div ref={layerRef} className="studio-present studio-player" role="dialog" aria-label={`${title}, playing`} tabIndex={-1} data-device={device} {...previewAttributes(modes)}>
      <ProtoContext value={actions}>
      <PageOsContext value={pageOsOf(tree?.header)}>
        <div className="studio-player__stage">
          <div className="studio-player__device" style={{ width: `min(${DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop}px, 100%)` }} data-zen-overlay-root="" data-screen-id={current}>
            {screen ? (
              <div key={`${history.length}:${current}`} className="studio-player__screen">
                {renderNode(screen, { mock: ctx.mock }, ctx)}
              </div>
            ) : <p className="studio-player__empty">{tree ? "This page has no Screen to play." : ""}</p>}
            {overlayChild ? renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay}`, { open: true, onOpenChange: (open: boolean) => { if (!open) setOverlay(null); } }) : null}
          </div>
        </div>
      </PageOsContext>
      </ProtoContext>
      <PresentBar title={screenTitle ? `${title} · ${screenTitle}` : title} theme={modes.theme} onToggleTheme={() => setMode("theme", modes.theme === "dark" ? "light" : "dark")} modes={modes} onModeChange={setMode} onExit={exit} modesScope="while playing"
        leading={<>
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Back" icon={<Icon name="icon-chevron-left-line-medium" />} disabled={!history.length && !overlay} onClick={() => actions.back()} />
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Restart" aria-keyshortcuts="R" tooltip="Restart (R)" icon={<Icon name="icon-refresh-ccw-01-line" />} onClick={restart} />
        </>} />
    </div>
  );
}
