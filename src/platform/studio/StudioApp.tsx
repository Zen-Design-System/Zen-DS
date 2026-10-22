import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { focusScaleField } from "./draw/scaleTool";
import { createComponent, createComponentOfLayers, createInstance, deleteMain, detachInstance, mainOfSelection } from "./edit/localComponents";
import { addAutoLayoutToSelection, removeAutoLayoutFromSelection } from "./edit/autoLayout";
import { ZenPortalProvider } from "../../components/Portal";
import { TabPanel, Tabs } from "../../components/Tabs";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { PlatformComponentPage, type PlatformPage } from "../PlatformExamples";
import { redoEdit, undoEdit } from "./api";
import { StudioBoard } from "./board/StudioBoard";
import { DocumentPage } from "./doc/DocumentPage";
import { Present } from "./board/Present";
import { presentFrame } from "./board/presentFrame";
import { setStudioActivePanel, StudioBridgeContext, type StudioBridge, type StudioPageParts } from "./bridge";
import { CanvasChrome } from "./canvas/CanvasChrome";
import { StudioCanvas } from "./canvas/StudioCanvas";
import { canvasApi, notifyCanvas, setCanvasInsets, zoomIn, zoomOut } from "./canvas/viewport";
import { zoomToSelection } from "./canvas/zoomToSelection";
import { CodeView } from "./code/CodeView";
import { detachSelection } from "./inspector/detach";
import { DetachDialog } from "./inspector/DetachAction";
import { ExportDialog } from "./builder/export/ExportDialog";
import { Inspector } from "./inspector/Inspector";
import { LayersPanel } from "./select/LayersPanel";
import { AssetsPanel } from "./edit/assets/AssetsPanel";
import { duplicateLayers, removeLayers } from "./edit/multi";
import { canHide, toggleLayerHidden } from "./edit/visibility";
import { multiSelection } from "./select/multiSelection";
import { wrapSelection } from "./select/wrapSelection";
import { duplicateSelection, editDataGroup, editDataItem, editDataItems, removeSelection } from "./slots/actions";
import { itemSelection, selectedPlaces } from "./slots/itemSelection";
import { dataGroupOfPart, dataItemRootOf } from "./slots/dataItems";
import { selectedPartStore } from "./select/parts";
import { SlotConfirm } from "./slots/SlotConfirm";
import { SharedConfirm } from "./shell/SharedConfirm";
import { BuilderBoard } from "./builder/BuilderBoard";
import { StudioHome } from "./project/ProjectsHome";
import { ProjectSetup, useProjectSetup } from "./project/ProjectSetup";
import { startProjects } from "./project/projectStore";
import { openQuickInsert, QuickInsert } from "./builder/library/QuickInsert";
import { VariablesWindow } from "./variables/VariablesWindow";
import { isPlaying, Player, playStartOf, startPlay } from "./builder/proto/Player";
import { removeFrames } from "./builder/proto/addFrame";
import { selectedFrames } from "./select/frameSelection";
import { stepFrame } from "./board/frameOrder";
import { startPageMirror } from "./builder/store/mirrors";
import { cachedPage } from "./builder/store/pageStore";
import { ChromePortalContext, ChromeScope, useChromeAttributes } from "./shell/ChromeScope";
import { previewAttributes } from "./shell/modes";
import { isComponentPage, navigate, pageTitle, readLocation } from "./shell/navigation";
import { CODE_EXPANDED_WIDTH, revealLeftPanel, toggleSidePanels, usePanelLayout } from "./shell/layout";
import { openQuickActions } from "./edit/quick/state";
import { useViewKeys } from "./canvas/viewKeys";
import { useFindKey } from "./edit/FindPanel";
import { useFigmaNotYet } from "./edit/figmaNotYet";
import { useLockKeys } from "./edit/lock";
import { useRenameKeys } from "./edit/rename";
import { BatchRenameDialog } from "./shell/BatchRenameDialog";
import { PAGE_SEARCH_ID, PagesPanel } from "./shell/PagesPanel";
import { CanvasMenu } from "./shell/CanvasMenu";
import { DraftsDialog } from "./shell/DraftsControls";
import { ParityDialog } from "./mainComponent/ParityDialog";
import { BindingDiffDialog } from "./mainComponent/BindingDiffDialog";
import { PanelResizer } from "./shell/PanelResizer";
import { ShortcutsDialog } from "./shell/ShortcutsDialog";
import { openShortcuts } from "./shell/shortcutsOpen";
import { CollapsedLeftBar, CollapsedRightBar, DrawerClose, LeftHeader, RightHeader } from "./shell/PanelHeaders";
import { requestSave } from "./sourceDrafts";
import { canEdit, pageKey, studioStore, useStudio } from "./store";
import type { StudioLeftTab } from "./types";
import { ensurePageDoc } from "./builder/localApi";
import { AgentPanel } from "./agent/AgentPanel";
import { AiChip } from "./mcp/AiChip";
import { startMcpRuntime } from "./mcp/runtime";
import "./studio.css";
import { useCanvasPreview, useRememberPageProject } from "./project/activeProject";
import { LibrariesDialog } from "./project/LibrariesDialog";
import { openLibraries } from "./project/libraries";

/** An open overlay owns Escape (it closes first): a popover, menu, listbox, dialog, or an expanded combobox/trigger. */
function escapeOwnedByOverlay(event: KeyboardEvent) {
  const target = event.target instanceof Element ? event.target : document.activeElement;
  if (!target) return false;
  if (target.closest(".zen-popover, [role='menu'], [role='listbox'], [role='dialog'], [aria-modal='true']")) return true;
  // An expanded trigger owns it too, except the drawer toggles themselves (Escape closes their drawer).
  return target.getAttribute("aria-expanded") === "true" && !["studio-left", "studio-right"].includes(target.getAttribute("aria-controls") ?? "");
}

/** Focus sits where single-key shortcuts must not fire: a field, an open popover, menu or dialog. */
/** Fields that take typed text: a checkbox, radio or switch input does not, so the canvas keys still work after one. */
const TEXT_FIELD = "input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='reset']):not([type='color']), textarea, select, [contenteditable]:not([contenteditable='false'])";

function keysOwnedByFocus(event: KeyboardEvent) {
  const target = event.target instanceof Element ? event.target : document.activeElement;
  if (!target) return false;
  if (target.closest(TEXT_FIELD)) return true;
  return Boolean(target.closest(".zen-popover, [role='menu'], [role='listbox'], [role='dialog'], [aria-modal='true']"));
}

/** What Tab can reach inside a drawer. */
const TABBABLE = "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable='false'])";

/** A drawer's first control (its own Close button aside): where focus goes when the drawer opens. */
function firstControl(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(TABBABLE)).find((element) =>
    element.tabIndex >= 0
    && !element.closest(".studio-drawer__close, [hidden], [inert], [aria-hidden='true']")
    && !(element as HTMLButtonElement).disabled
    && element.getClientRects().length > 0) ?? null;
}

/** URL ⇄ store: ?page=…&collection=… as in the classic app, one history entry per page. */
function useRouting() {
  // The address wins over the stored page, before anything reads the store.
  useState(() => {
    const location = readLocation();
    const state = studioStore.getState();
    if (state.page !== location.page || state.collection !== location.collection || state.localPage !== location.localPage || state.space !== location.space) studioStore.setState({ ...location, selection: null });
    return null;
  });
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const space = useStudio((state) => state.space);
  const first = useRef(true);
  // Builder pages: connect the folder that keeps their copy (the dev server's .zen-studio/pages/, or a linked folder).
  // ?play=<screen> on a builder page opens it in Play.
  useEffect(() => {
    void startPageMirror();
    // Studio projects (project/projectStore.ts): their modes must be in place before a project's page draws.
    startProjects();
    const play = new URLSearchParams(window.location.search).get("play");
    if (play !== null && studioStore.getState().localPage && !isPlaying(studioStore.getState().presenting)) startPlay(play || null);
  }, []);
  // The Studio MCP (mcp/runtime.ts): AI clients' calls to the dev server's /__zen-studio/mcp run in this tab.
  useEffect(() => startMcpRuntime(), []);
  // A builder page is a document (core rebuild M2): an older page, an import or a restored version gets one as it opens,
  // before anything on it is selected.
  useEffect(() => {
    if (localPage) void ensurePageDoc(localPage);
  }, [localPage]);
  useEffect(() => {
    const url = new URL(window.location.href);
    // A builder page kept in this browser: ?page=local:<id> (Studio builder GĐ2).
    url.searchParams.set("page", localPage ? `local:${localPage}` : page);
    if (!localPage && page === "design-tokens" && collection) url.searchParams.set("collection", collection);
    else url.searchParams.delete("collection");
    // The Studio space with no page open keeps its own address (a builder page is Studio already).
    if (!localPage && space === "studio") url.searchParams.set("space", "studio");
    else url.searchParams.delete("space");
    const next = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      // The first sync only normalises the address (no extra Back step).
      if (first.current) window.history.replaceState(null, "", next);
      else window.history.pushState(null, "", next);
    }
    first.current = false;
    document.title = `${localPage ? cachedPage(localPage)?.title ?? localPage : space === "studio" ? "Studio" : pageTitle(page, collection)} · Zen Studio`;
  }, [page, collection, localPage, space]);
  useEffect(() => {
    const onPopState = () => {
      const location = readLocation();
      studioStore.setState({ ...location, selection: null, presenting: null });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}

/** The board on the canvas (component pages only; documents render as a page, doc/DocumentPage.tsx): the page lays
 * itself out through the bridge. Memoised: selection, panels and modes change often and must not re-render every
 * example on the page. */
const WorldContent = memo(function WorldContent({ page, collection }: { page: PlatformPage; collection: string | null }) {
  const key = pageKey(page, collection);
  return <PlatformComponentPage key={key} page={page} activeCollection={collection} onCollectionClick={(slug) => navigate("design-tokens", slug)} />;
});

/**
 * Zen Studio (docs/research/zen-studio-spec-2026-10-02.md): the docs platform as a FigJam-like canvas, laid out as Figma
 * UI3's floating panels (user, 2026-10-15): the canvas fills the window, Pages | Layers floats on the left and the
 * Inspector on the right, each with its own header; there is no toolbar row. Docked panels resize
 * from their inner edge; below 1280px Pages | Layers is a drawer, below 1024px the Inspector too; ⌘/Ctrl+\ hides both
 * (shell/layout.ts), leaving a small bar in each corner that opens them.
 */
export function StudioApp() {
  useRouting();
  // Figma keys with no Zen Studio feature yet say so instead of running the browser's command (edit/figmaNotYet.ts).
  useFigmaNotYet();
  // Figma's View keys: ⌘' Pixel grid, ⌘Y Outlines, ⇧R Rulers, ⌃G Layout guides (F10, canvas/viewKeys.ts).
  useViewKeys();
  // Figma's Find and replace (⌘F, F10, edit/FindPanel.tsx).
  useFindKey();
  // Figma's ⌘R (rename) and ⇧⌘L (lock), before the keys below (F1: edit/rename.ts, edit/lock.ts).
  useRenameKeys();
  useLockKeys();
  useRememberPageProject();
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const selection = useStudio((state) => state.selection);
  const chromeTheme = useStudio((state) => state.chromeTheme);
  const { preview, brand } = useCanvasPreview();
  const leftTab = useStudio((state) => state.leftTab);
  const drawer = useStudio((state) => state.drawer);
  const presenting = useStudio((state) => state.presenting);
  const panels = useStudio((state) => state.panels);
  const layout = usePanelLayout();
  const { leftDocked, rightDocked } = layout;
  const chromeAttributes = useChromeAttributes();
  // The code view's expand button ("zen-studio:expand-code") widens the Inspector to 720px and back.
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [chromePortal, setChromePortal] = useState<HTMLDivElement | null>(null);
  const [previewPortal, setPreviewPortal] = useState<HTMLDivElement | null>(null);
  // The inspector hosts these two nodes; the active playground panel portals its controls and code into them.
  const [controlsSlot] = useState(() => document.createElement("div"));
  const [codeSlot] = useState(() => document.createElement("div"));
  const key = pageKey(page, collection, localPage);
  // Overviews, Installation and the Foundation pages are documents: a normal page, no canvas and no inspector. A
  // builder page (kept in this browser) is a canvas.
  // The Studio space with no page open shows its folders (builder/StudioHome): no canvas and no inspector either.
  const space = useStudio((state) => state.space);
  const studioHome = !localPage && space === "studio";
  const docPage = studioHome || (!localPage && !isComponentPage(page));

  // The active playground panel: the selected layer's panel, or (playground frame selected) the last one used, else the
  // first panel of the playground.
  const [lastPanel, setLastPanel] = useState<string | null>(null);
  const nodePanel = selection?.kind === "node" ? selection.panelId : null;
  useEffect(() => { if (nodePanel) setLastPanel(nodePanel); }, [nodePanel]);
  useEffect(() => { setLastPanel(null); }, [key]);
  const playgroundSelected = selection?.kind === "frame" && selection.frameId === "playground";
  useLayoutEffect(() => {
    if (!playgroundSelected || lastPanel) return;
    const first = document.querySelector<HTMLElement>('[data-studio-frame="playground"] [data-studio-panel]')?.dataset.studioPanel;
    if (first) setLastPanel(first);
  }, [playgroundSelected, lastPanel]);
  const activePanel = selection?.kind === "node" ? selection.panelId : playgroundSelected ? lastPanel : null;

  const renderComponentPage = useCallback((parts: StudioPageParts) => <StudioBoard parts={parts} />, []);
  const renderCode = useCallback((code: string) => <CodeView code={code} language="tsx" />, []);
  useEffect(() => { setStudioActivePanel(activePanel); }, [activePanel]);
  useEffect(() => () => setStudioActivePanel(null), []);
  const bridge = useMemo<StudioBridge>(() => ({ renderComponentPage, renderCode, controlsSlot, codeSlot }), [renderComponentPage, renderCode, controlsSlot, codeSlot]);

  // A panel that becomes docked (wider window, panels shown) is no drawer any more. A drawer that opens takes focus to
  // its first control (a caller that focuses something else in it, like page search, runs after this); one that closes
  // with focus inside hands it back to its toolbar button.
  useEffect(() => {
    if ((drawer === "left" && leftDocked) || (drawer === "right" && rightDocked)) studioStore.setState({ drawer: null });
  }, [drawer, leftDocked, rightDocked]);
  const openDrawer = useRef(drawer);
  useLayoutEffect(() => {
    const closed = openDrawer.current;
    openDrawer.current = drawer;
    if (drawer && drawer !== closed) {
      const panel = document.getElementById(drawer === "left" ? "studio-left" : "studio-right");
      if (panel && !panel.contains(document.activeElement)) firstControl(panel)?.focus({ preventScroll: true });
    }
    if (!closed || drawer === closed) return;
    const id = closed === "left" ? "studio-left" : "studio-right";
    if (document.getElementById(id)?.contains(document.activeElement)) document.querySelector<HTMLElement>(`[aria-controls="${id}"]`)?.focus();
  }, [drawer]);

  const openPageSearch = useCallback(() => {
    studioStore.setState({ leftTab: "pages" });
    revealLeftPanel();
    requestAnimationFrame(() => document.getElementById(PAGE_SEARCH_ID)?.focus());
  }, []);

  // Expand / restore the Inspector for the code view; the change is announced and reflected on the panel
  // (data-expanded, and a "zen-studio:code-expanded" event with { expanded }).
  const rightWidth = codeExpanded ? Math.max(panels.right, CODE_EXPANDED_WIDTH) : panels.right;
  useEffect(() => {
    const onExpand = () => setCodeExpanded((value) => !value);
    window.addEventListener("zen-studio:expand-code", onExpand);
    return () => window.removeEventListener("zen-studio:expand-code", onExpand);
  }, []);
  // The canvas runs under the floating panels: tell it which part they cover (fit, zoom and keep-in-view aim at the rest).
  const appRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const app = appRef.current;
    const left = document.getElementById("studio-left");
    const right = document.getElementById("studio-right");
    if (!app) return undefined;
    const measure = () => {
      const width = app.clientWidth;
      const leftCover = leftDocked && !presenting && left ? left.getBoundingClientRect().right : 0;
      const rightBox = right?.getBoundingClientRect();
      const rightCover = rightDocked && !presenting && !docPage && rightBox ? width - rightBox.left : 0;
      setCanvasInsets({ left: Math.max(0, Math.round(leftCover)), right: Math.max(0, Math.round(rightCover)), top: 0, bottom: 0 });
      notifyCanvas();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(app);
    if (left) observer.observe(left);
    if (right) observer.observe(right);
    return () => observer.disconnect();
  }, [leftDocked, rightDocked, presenting, docPage]);

  const firstExpand = useRef(true);
  useEffect(() => {
    if (firstExpand.current) { firstExpand.current = false; return; }
    setAnnouncement(codeExpanded ? `Inspector widened to ${Math.max(panels.right, CODE_EXPANDED_WIDTH)} pixels for the code` : `Inspector back to ${panels.right} pixels`);
    window.dispatchEvent(new CustomEvent("zen-studio:code-expanded", { detail: { expanded: codeExpanded } }));
    // Only the toggle announces (not a later resize).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeExpanded]);

  // Escape, in order: an open overlay (it handles the key first), then an open drawer, then the selection (the
  // selection module: layer → parent → frame; below: frame → nothing). On document, so it runs before the selection
  // module's window listener and marks the key used (defaultPrevented) when it closes a drawer.
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      const state = studioStore.getState();
      if (state.presenting || !state.drawer || escapeOwnedByOverlay(event)) return;
      event.preventDefault();
      studioStore.setState({ drawer: null });
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  // ⌘/Ctrl+K opens Actions wherever focus is (Figma's; ⌘/ too), ⌘/Ctrl+F finds a layer (the Layers search: Figma's
  // Find). Search pages is an action ("zen-studio:search-pages"). Capture phase: a field's own shortcut cannot take them;
  // an example in use (Interact) keeps the chords for itself.
  useEffect(() => {
    const onSearchKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      // ⇧⌘K is Figma's Place image/video: the Image tool.
      const place = event.shiftKey && event.code === "KeyK";
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.altKey || (event.shiftKey && !place) || (key !== "k" && event.code !== "KeyF")) return;
      const state = studioStore.getState();
      if (state.presenting) return;
      const active = document.activeElement;
      if (state.tool === "interact" && active?.closest(".studio-world, .studio-portal-root")) return;
      if (active?.closest("[aria-modal='true']")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (place) { studioStore.setState({ tool: "image" }); return; }
      if (key === "k") { openQuickActions(); return; }
      studioStore.setState({ leftTab: "layers" });
      revealLeftPanel();
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#studio-left input[aria-label='Find a layer']")?.focus());
    };
    const onSearchPages = () => openPageSearch();
    window.addEventListener("keydown", onSearchKey, true);
    window.addEventListener("zen-studio:search-pages", onSearchPages);
    return () => { window.removeEventListener("keydown", onSearchKey, true); window.removeEventListener("zen-studio:search-pages", onSearchPages); };
  }, [openPageSearch]);

  // ⌘/Ctrl+S saves the admin drafts from anywhere, a field included (its typed value is committed first); the
  // browser's own Save page never opens. It asks first only when a draft's file changed on disk since.
  useEffect(() => {
    const onSaveKey = (event: KeyboardEvent) => {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || (event.key.toLowerCase() !== "s" && event.code !== "KeyS")) return;
      event.preventDefault();
      const state = studioStore.getState();
      if (state.presenting || !canEdit(state) || document.activeElement?.closest("[aria-modal='true']")) return;
      void requestSave();
    };
    window.addEventListener("keydown", onSaveKey, true);
    return () => window.removeEventListener("keydown", onSaveKey, true);
  }, []);

  // Global shortcuts (spec §3). The selection module handles Escape / Enter on layers.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const state = studioStore.getState();
      if (state.presenting) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      // ⌘/Ctrl+\ hides or shows both side panels (Figma's Show/Hide UI), from anywhere but a text field.
      if (mod && !event.altKey && (event.code === "Backslash" || key === "\\")) {
        if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]:not([contenteditable='false'])")) return;
        event.preventDefault();
        toggleSidePanels();
        return;
      }
      // ⌘/Ctrl+D in one of the Studio's own text fields: the field keeps the key, but the browser's bookmark dialog must
      // not open (E2E K-04). Fields inside an example in use are the example's.
      if (mod && !event.altKey && !event.shiftKey && key === "d" && event.target instanceof Element && event.target.closest(TEXT_FIELD) && !event.target.closest(".studio-world, .studio-portal-root")) {
        event.preventDefault();
        return;
      }
      if (keysOwnedByFocus(event)) return;
      // Document pages (doc/DocumentPage.tsx) have no canvas: the zoom, tool and frame keys do nothing there.
      const doc = !state.localPage && (state.space === "studio" || !isComponentPage(state.page));
      // An example in use (Interact) keeps its own keys; only the zoom chords still reach the canvas.
      const inExample = state.tool === "interact" && document.activeElement?.closest(".studio-world");
      // ⌥⌘G / Ctrl+Alt+G wraps the selected layers in a Box (Figma's Frame selection), in the Select tool.
      if (mod && event.altKey && !event.shiftKey && event.code === "KeyG") {
        const selection = state.selection;
        if (doc || inExample) return;
        event.preventDefault();
        if (event.repeat || state.tool !== "select" || selection?.kind !== "node" || selection.part) return;
        void wrapSelection("box");
        return;
      }
      // ⌥⌘B / Ctrl+Alt+B detaches the selected component instance (Figma's Detach instance), in the Select tool: an
      // instance of a page's own component (<Use>) takes its main's layers (edit/localComponents.ts).
      if (mod && event.altKey && !event.shiftKey && event.code === "KeyB") {
        const selection = state.selection;
        if (doc || state.tool !== "select" || selection?.kind !== "node" || selection.part) return;
        event.preventDefault();
        if (selection.name === "Use") void detachInstance(selection);
        else void detachSelection(selection);
        return;
      }
      // ⌥⌘O / Ctrl+Alt+O: Figma's Libraries (project/LibrariesDialog.tsx) with nothing selected; with a layer selected the
      // key is Figma's Outline stroke, which edit/figmaKeys.ts takes first.
      if (mod && event.altKey && !event.shiftKey && event.code === "KeyO") {
        event.preventDefault();
        if (!event.repeat) openLibraries();
        return;
      }
      // ⌥⌘K / Ctrl+Alt+K: Figma's Create component — the selected layer becomes a main component where it is.
      if (mod && event.altKey && !event.shiftKey && event.code === "KeyK") {
        const selection = state.selection;
        if (doc || inExample) return;
        event.preventDefault();
        if (event.repeat || state.tool !== "select" || selection?.kind !== "node" || selection.part || !state.localPage) return;
        // Several layers: one component of them all (Figma's ⌥⌘K on a multi-selection).
        if (multiSelection.get().length) void createComponentOfLayers();
        else void createComponent(selection);
        return;
      }
      // ⌥⌘↵ / Ctrl+Alt+Enter: Figma's Present. A page you made plays from the selected Screen, or opens the selected
      // Overlay over the Screen that opens it (else its first Screen: the prototype, as Figma's Present); an example
      // frame is presented. P is Figma's Pen (edit/figmaNotYet.ts).
      if (mod && event.altKey && !event.shiftKey && event.key === "Enter") {
        if (doc || inExample) return;
        const frameId = state.selection?.kind === "frame" ? state.selection.frameId : state.selection?.frameId;
        if (state.localPage) { event.preventDefault(); startPlay(playStartOf(frameId)); return; }
        if (frameId) { event.preventDefault(); presentFrame(frameId); }
        return;
      }
      // ⇧⌘H hides the selected layer or shows it again (Figma's Show/Hide), on a page made in the Studio (edit/visibility.ts).
      if (mod && event.shiftKey && !event.altKey && event.code === "KeyH") {
        if (doc || inExample) return;
        const selection = state.selection;
        if (!canHide(selection)) return;
        event.preventDefault();
        if (!event.repeat) void toggleLayerHidden(selection.src, selection.name);
        return;
      }
      // ⌘/Ctrl+D duplicates the selected layer (Figma's Duplicate) in the Select tool. On the canvas the browser's bookmark
      // dialog never opens, whatever is selected; a held key does not go on duplicating the copy.
      if (mod && !event.altKey && !event.shiftKey && key === "d") {
        if (doc || inExample) return;
        event.preventDefault();
        const selection = state.selection;
        if (event.repeat || state.tool !== "select" || selection?.kind !== "node") return;
        // A data-slot item (TopNavigation's trailing action) duplicates like a layer; other parts are read-only.
        if (selection.part) {
          const item = dataItemRootOf(selectedPartStore.get());
          if (item?.slot.form === "array") void editDataItem(selection, item.slot, "duplicate", item.index);
          return;
        }
        // Several layers: each copied after itself in one edit (edit/multi.ts).
        if (multiSelection.get().length) { void duplicateLayers(); return; }
        // A main component duplicates as an instance of it (Figma); any other layer as a copy.
        if (state.localPage) {
          void mainOfSelection(selection).then((main) => (main ? createInstance(main, selection) : duplicateSelection(selection)));
          return;
        }
        void duplicateSelection(selection);
        return;
      }
      if (mod && !event.altKey) {
        if (!doc && (key === "=" || key === "+")) { event.preventDefault(); zoomIn(); return; }
        if (!doc && (key === "-" || key === "_")) { event.preventDefault(); zoomOut(); return; }
        if (!doc && key === "0") { event.preventDefault(); canvasApi.setZoom(1); return; }
        if (key === "z" && !inExample) {
          event.preventDefault();
          if (!canEdit(state)) return;
          void (event.shiftKey ? redoEdit() : undoEdit());
          return;
        }
        if (key === "y" && event.ctrlKey && !inExample) { event.preventDefault(); if (canEdit(state)) void redoEdit(); return; }
        // ⌘⌫ on a selected Section of a page you made: Figma's delete section, keep its frames (F4).
        if ((event.key === "Backspace" || event.key === "Delete") && !doc && !event.repeat && !event.shiftKey && state.localPage && state.tool === "select"
          && state.selection?.kind === "frame" && state.selection.frameId.startsWith("section:") && canEdit(state)) {
          event.preventDefault();
          void removeFrames(state.localPage, selectedFrames(), { keepContents: true });
        }
        return;
      }
      // ⌥⇧A: Figma's Remove auto layout on a Stack (edit/autoLayout.ts): a Box, each layer where it shows.
      if (event.altKey && event.shiftKey && !mod && event.code === "KeyA" && !event.repeat && !inExample && state.tool === "select" && state.selection?.kind === "node" && !state.selection.part) {
        event.preventDefault();
        void removeAutoLayoutFromSelection();
        return;
      }
      if (event.altKey || inExample) return;
      // Delete / Backspace removes the selected layer (Figma) when the canvas itself has focus, the selected layer's row in
      // Layers has it, nothing does, or a property control in the Inspector does (a switch or segment just used: Figma
      // still deletes the selection then, E2E K-02). Never from a text field (keysOwnedByFocus), an open popup, a control
      // inside the canvas (the zoom or frame toolbar), another Layers row or a slot row, and a held key (repeat) does not
      // go on to remove the parent it selects.
      if (event.key === "Delete" || event.key === "Backspace") {
        const selection = state.selection;
        const target = event.target instanceof Element ? event.target : null;
        const row = target?.closest(".studio-layers__tree [role='treeitem']");
        const inspectorControl = Boolean(target?.closest("#studio-right") && !target.closest("[data-slot], [data-item-index]")
          && target.getAttribute("aria-expanded") !== "true");
        const here = !target || target === document.body || target.matches(".studio-viewport") || inspectorControl
          || Boolean(row && row === target && (row.getAttribute("data-kind") === "node" || row.getAttribute("data-kind") === "part") && row.getAttribute("aria-selected") === "true");
        // A selected Screen, Overlay, Section or Slice of a page you made goes as one edit (Figma deletes a selected frame), also from its
        // name on the canvas (a button the click focused) or its selected row in Layers.
        const onFrame = here || Boolean(target?.closest(".studio-frame-label[data-selected='true']"))
          || Boolean(row && row === target && row.getAttribute("data-kind") === "frame" && row.getAttribute("aria-selected") === "true");
        if (!doc && !event.repeat && !event.shiftKey && onFrame && state.tool === "select" && selection?.kind === "frame" && state.localPage
          && /^(screen|overlay|section|slice):/.test(selection.frameId) && canEdit(state)) {
          event.preventDefault();
          // Every selected frame in one edit (F2c's several frames); a Section goes with its frames (⌘⌫ keeps them: the
          // ⌘ keys above).
          void removeFrames(state.localPage, selectedFrames());
          return;
        }
        if (doc || event.repeat || event.shiftKey || !here || state.tool !== "select" || selection?.kind !== "node") return;
        if (selection.part) {
          // A data-slot item goes like a layer (its host stays selected); so does a nested slot's group, its title or its
          // rows (a Sidebar section, 2026-10-10: "section title đang không xoá được"); other parts are read-only.
          const item = dataItemRootOf(selectedPartStore.get());
          const group = item ? null : dataGroupOfPart(selectedPartStore.get());
          if (!item && !group) return;
          event.preventDefault();
          // Several items of the slot selected (Shift/⌘+click): all of them, one undo step.
          const set = itemSelection.get();
          const places = item && set && set.src === selection.src && set.instance === selection.instance ? selectedPlaces(item.index, set, item.slot.prop) : [];
          if (item && places.length > 1) void editDataItems(selection, item.slot, places, "remove");
          else if (item) void editDataItem(selection, item.slot, "remove", item.index);
          else if (group) void editDataGroup(selection, group.slot, group.group, group.role === "group" ? "remove" : group.role === "title" ? "removeTitle" : "clearRows");
          return;
        }
        event.preventDefault();
        // Several layers: all removed in one edit (edit/multi.ts).
        if (multiSelection.get().length) { void removeLayers(); return; }
        // A main component goes with its <Component> (edit/localComponents.ts deleteMain), unless instances use it.
        if (state.localPage) { void deleteMain(selection).then((handled) => { if (!handled) void removeSelection(selection); }); return; }
        void removeSelection(selection);
        return;
      }
      if (event.key === "Escape") {
        if (state.selection?.kind === "frame") { event.preventDefault(); studioStore.setState({ selection: null }); }
        return;
      }
      if (doc) {
        if (event.key === "?") { event.preventDefault(); openShortcuts(); }
        return;
      }
      if (event.shiftKey) {
        // ⇧A on a frame without auto layout (one Box): auto layout on the frame itself, read from where its layers sit;
        // on other layers it wraps them in a Stack laid out as they render (Figma's Add auto layout).
        if (event.code === "KeyA" && !event.repeat && state.tool === "select" && state.selection?.kind === "node" && !state.selection.part) {
          event.preventDefault();
          void addAutoLayoutToSelection();
          return;
        }
        // …and on items of a list (one or several, Shift/⌘+click): a Sidebar's or Menu's go in a section of their own, a
        // TopNavigation's actions share one pill; a list without groups says so.
        if (event.code === "KeyA" && !event.repeat && state.tool === "select" && state.selection?.kind === "node" && state.selection.part && !inExample) {
          const item = dataItemRootOf(selectedPartStore.get());
          if (item) {
            event.preventDefault();
            const set = itemSelection.get();
            const places = set && set.src === state.selection.src && set.instance === state.selection.instance ? selectedPlaces(item.index, set, item.slot.prop) : [item.index];
            void editDataItems(state.selection, item.slot, places, "group");
            return;
          }
        }
        // ⇧N: Figma's Zoom to previous frame (a page you made; board/frameOrder.ts).
        if (event.code === "KeyN" && state.localPage) { event.preventDefault(); stepFrame(-1); return; }
        // ⇧S: Figma's Section tool (a page you made; builder/frameMove.ts).
        if (event.code === "KeyS" && !event.repeat && state.localPage) { event.preventDefault(); studioStore.setState({ tool: "section" }); return; }
        // ⇧L: Figma's Arrow tool (a page you made).
        if (event.code === "KeyL" && !event.repeat && state.localPage) { event.preventDefault(); studioStore.setState({ tool: "arrow" }); return; }
        // ⇧P: Figma's Pencil (a page you made; draw/penTool.ts).
        if (event.code === "KeyP" && !event.repeat && state.localPage) { event.preventDefault(); studioStore.setState({ tool: "pencil" }); return; }
        // ⇧I opens Quick insert (Figma's): search the library, Enter adds the item (builder/library/QuickInsert.tsx).
        if (event.code === "KeyI" && !event.repeat && !inExample) { event.preventDefault(); openQuickInsert(); return; }
        if (event.code === "Digit0") { event.preventDefault(); canvasApi.setZoom(1); return; }
        if (event.code === "Digit1") { event.preventDefault(); canvasApi.fit(); return; }
        if (event.code === "Digit2") { event.preventDefault(); zoomToSelection(); return; }
        if (event.key === "?") { event.preventDefault(); openShortcuts(); return; }
        return;
      }
      if (key === "v") studioStore.setState({ tool: "select" });
      else if (key === "h") studioStore.setState({ tool: "hand" });
      // K: Figma's Scale tool, on a page you made (draw/ScalePanel.tsx); K again puts the focus in its factor.
      // The key's own letter never lands in the factor, which takes the focus while it is down.
      else if (key === "k" && state.localPage) { event.preventDefault(); if (state.tool === "scale") focusScaleField(); else studioStore.setState({ tool: "scale" }); }
      else if (key === "i") studioStore.setState({ tool: "interact" });
      // Figma's A is the Frame tool too (on a page you made; elsewhere the Stack placement tool); T places text.
      else if (key === "a") studioStore.setState({ tool: state.localPage ? "frame" : "stack" });
      else if (key === "t") studioStore.setState({ tool: "text" });
      // Figma's Zoom to next frame (a page you made; board/frameOrder.ts).
      else if (key === "n" && state.localPage) stepFrame(1);
      // Figma's shape tools, on a page you made (draw/drawTool.ts): R rectangle, O ellipse, L line (⇧L arrow, above).
      else if ((key === "r" || key === "o" || key === "l") && state.localPage) studioStore.setState({ tool: key === "r" ? "rectangle" : key === "o" ? "ellipse" : "line" });
      // S: Figma's Slice tool, on a page you made (builder/SliceFrame.tsx; ⇧S is the Section tool, above).
      else if (key === "s" && state.localPage) studioStore.setState({ tool: "slice" });
      // C: Figma's Comment tool, on a page you made (comments/CommentsLayer.tsx; a Viewer comments too).
      else if (key === "c" && state.localPage) studioStore.setState({ tool: "comment" });
      // P: Figma's Pen, on a page you made (draw/penTool.ts).
      else if (key === "p" && state.localPage) studioStore.setState({ tool: "pen" });
      else if (key === "f") {
        // Figma's F: the Frame tool, on a page you made (user, 2026-10-15; Present moved to ⌥⌘↵).
        if (state.localPage) studioStore.setState({ tool: "frame" });
      } else return;
    };
    // Ctrl/⌘ + wheel over the chrome must never zoom the page itself (the canvas zooms its own content).
    const onWheel = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) event.preventDefault(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("wheel", onWheel); };
  }, []);

  const leftOpen = leftDocked || drawer === "left";
  const rightOpen = rightDocked || drawer === "right";
  // Present, Play and the project theme page (project/ProjectSetup.tsx) cover the Studio: what is under them is inert.
  const settingUp = useProjectSetup() !== null;
  const inert = presenting || settingUp ? true : undefined;
  const panelTabs = (
    <div className="studio-left__tabs">
    <Tabs
      size="sm"
      variant="subtle"
      aria-label="Left panel"
      idPrefix="studio-left"
      value={leftTab}
      onValueChange={(value) => studioStore.setState({ leftTab: value as StudioLeftTab })}
      items={docPage ? [{ id: "pages", label: "Pages" }, { id: "layers", label: "Layers" }] : [{ id: "pages", label: "Pages" }, { id: "layers", label: "Layers" }, { id: "assets", label: "Assets" }]}
    />
    {leftDocked ? null : <DrawerClose label="Close pages and layers" />}
    </div>
  );

  return (
    <ChromePortalContext value={chromePortal}>
      <div
        ref={appRef}
        className="studio-app"
        data-theme={chromeTheme}
        data-left={leftDocked ? "docked" : "drawer"}
        data-right={rightDocked ? "docked" : "drawer"}
        data-drawer={drawer ?? undefined}
        data-doc={docPage ? "true" : undefined}
        // Document or Studio (the Zen Studio menu switches them): for tools and tests, there is no visible switch to read.
        data-space={localPage ? "studio" : space}
        style={{ "--studio-left-width": `${panels.left}px`, "--studio-right-width": `${rightWidth}px` } as CSSProperties}
      >
        <ChromeScope as="aside" id="studio-left" className="studio-left" aria-label="Pages and layers" data-open={leftOpen ? "true" : "false"} inert={inert ?? (leftOpen ? undefined : true)}>
          <LeftHeader layout={layout} drawer={!leftDocked && docPage} />
          {/* A document page has no layers: the left panel is the page list alone. */}
          {docPage ? null : panelTabs}
          <TabPanel idPrefix="studio-left" id="pages" hidden={!docPage && leftTab !== "pages"} className="studio-left__panel"><PagesPanel /></TabPanel>
          {docPage ? null : <TabPanel idPrefix="studio-left" id="layers" hidden={leftTab !== "layers"} className="studio-left__panel"><LayersPanel /></TabPanel>}
          {/* Figma's Assets: Zen components to click or drag onto the canvas (edit/assets). */}
          {docPage ? null : <TabPanel idPrefix="studio-left" id="assets" hidden={leftTab !== "assets"} className="studio-left__panel"><AssetsPanel /></TabPanel>}
        </ChromeScope>

        <main className="studio-canvas-area" aria-label={`${pageTitle(page, collection)} canvas area`} inert={inert}>
          <StudioBridgeContext value={bridge}>
            <ZenPortalProvider container={previewPortal}>
              {localPage ? (
                <StudioCanvas label={`${cachedPage(localPage)?.title ?? localPage} canvas`} viewKey={key}>
                  <BuilderBoard id={localPage} />
                </StudioCanvas>
              ) : studioHome ? <StudioHome /> : docPage ? <DocumentPage page={page} collection={collection} /> : (
                <StudioCanvas label={`${pageTitle(page, collection)} canvas`} viewKey={key}>
                  <WorldContent page={page} collection={collection} />
                </StudioCanvas>
              )}
            </ZenPortalProvider>
          </StudioBridgeContext>
          {/* The canvas's overlay layer: unscaled, outside the world, in the preview modes, clipped to the canvas area
              (studio.css). Each frame holds its own example's overlays since 2026-10-15 (StudioFrame: in the world, so they
              zoom with it); this layer takes what renders outside a frame, and a frame's portals until its layer mounts. The class official-portal-root is what examples and the full-screen code
              look for. data-zen-isolation-root: a modal's isolation (inert) stays inside this layer, so the canvas keeps
              taking Studio's clicks (Select, E2E O-02/O-04) and the chrome stays usable. */}
          <div ref={setPreviewPortal} className="official-portal-root studio-portal-root" data-zen-isolation-root="" {...previewAttributes(preview, brand)} />
          {/* Zoom, tools and tip float above that layer: an overlay left open never covers them (canvas/CanvasChrome). */}
          {docPage ? null : <CanvasChrome />}
          {docPage ? null : <AiChip />}
          {/* Zen Agent (plan docs/research/studio-vibe-agent-2026-10-18.md): the chat panel beside Pages | Layers, ⌘J. */}
          {docPage ? null : <AgentPanel />}
        </main>

        {/* A document page has no Inspector: the right panel is its header alone, a small bar in the corner. */}
        {docPage ? (
          <ChromeScope as="aside" className="studio-right" aria-label="Studio" data-bar="true" data-open="true" inert={inert}>
            <RightHeader layout={layout} drawer={false} />
          </ChromeScope>
        ) : (
          <ChromeScope as="aside" id="studio-right" className="studio-right" aria-label="Inspector" data-open={rightOpen ? "true" : "false"} data-expanded={codeExpanded ? "true" : undefined} inert={inert ?? (rightOpen ? undefined : true)}>
            <RightHeader layout={layout} drawer={!rightDocked} />
            <Inspector controlsSlot={controlsSlot} codeSlot={codeSlot} />
          </ChromeScope>
        )}
        {leftDocked || presenting ? null : <ChromeScope className="studio-bar-scope" inert={inert}><CollapsedLeftBar layout={layout} /></ChromeScope>}
        {rightDocked || presenting || docPage ? null : <ChromeScope className="studio-bar-scope" inert={inert}><CollapsedRightBar layout={layout} /></ChromeScope>}

        {leftDocked && !presenting ? <PanelResizer side="left" width={panels.left} label="Resize Pages and layers panel" controls="studio-left" /> : null}
        {rightDocked && !presenting && !docPage ? <PanelResizer side="right" width={rightWidth} label="Resize Inspector" controls="studio-right" onResize={() => setCodeExpanded(false)} /> : null}
        <VisuallyHidden role="status" aria-live="polite">{announcement}</VisuallyHidden>

        {drawer && !(drawer === "left" ? leftDocked : rightDocked) ? <button type="button" className="studio-scrim" aria-label="Close panel" tabIndex={-1} onClick={() => studioStore.setState({ drawer: null })} /> : null}

        <StudioBridgeContext value={bridge}>
          <Present />
        </StudioBridgeContext>
        {/* Play (Studio builder GĐ2 M3): a builder page run full screen with live prototype actions. */}
        <Player />
        {/* New project / Project settings: the project's theme page, full window. */}
        <ProjectSetup />

        <ChromeScope className="studio-dialogs">
          <ShortcutsDialog />
          <LibrariesDialog />
          <BatchRenameDialog />
          <QuickInsert />
          <VariablesWindow />
          <DetachDialog />
          <ExportDialog />
          <SlotConfirm />
          <SharedConfirm />
          <DraftsDialog />
          <ParityDialog />
          <BindingDiffDialog />
          <CanvasMenu />
        </ChromeScope>
        {/* Popovers, menus, tooltips and dialogs of the chrome: above the canvas and its overlays. */}
        <div ref={setChromePortal} className="studio-chrome-portal" {...chromeAttributes} />
      </div>
    </ChromePortalContext>
  );
}

