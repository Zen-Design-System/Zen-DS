import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useToast, type ToastOptions } from "../../../../components/Toast";
import { componentsOf, renderNode, type LocalComponents, type PageNode, type PageTree } from "../render/renderPage";
import { frameMotion, motionProps } from "./playMotion";
import { useAnchoredPosition } from "../../../../components/Popover/useAnchoredPosition";
import { itemElement, layerElements } from "./protoDom";
import { choiceItemsOf, choicesOf, DEFAULT_DELAY, filterOf, filterValuesOf, findNode, linksOf, openerOf, optionsOf, OVERLAY_START, screenTargetOf, stepOf, stepperOf, steppedIndex, stepTargetsOf, targetLayerOf, type ProtoOptions } from "./protoModel";
import { anchorsItself, placesItself } from "./protoTriggers";
import { versionFor, versionScreensOf } from "./versions";
import type { ZenBreakpointKey } from "../../../../../tools/studio/screen-devices.mjs";
import { protoHandler, Screen, type PageDevice, type PlayFilter, type PlayLive, type ProtoActions, type ScreenCanvas, type ScreenLayout } from "./runtime";

/*
 * A page's prototype flow, shared by Play (Player.tsx, in the Studio) and the phone (device/DevicePlay.tsx, Open on phone):
 * which Screen shows, the way back, the open overlay and the animation between frames. navigate opens a Screen's default
 * state, open shows an Overlay over the current Screen, close / back undo them, toast shows a Toast, link opens the URL
 * in a new tab; a Screen's After delay runs its action once it shows. Needs a ToastProvider above it.
 *
 * Present from a selected Overlay frame (Figma presents any frame; `start` "overlay:<id>", playStart.ts): the Overlay
 * starts open, with no animation, over the Screen that opens it, which plays on once it closes; an Overlay no Screen
 * opens shows over a blank screen of the page's device (its first Screen's), and closing it calls `onLeave` (Play
 * leaves: there is nothing under it). Back from a Screen it led to opens it again.
 *
 * Option C (user, 2026-10-23): Navigate to may name a Screen's state ("orders:filtered"); an Overlay at Position Manual
 * opens next to the element pressed (or the layer that opens it on the Screen), and a DatePicker or Popover in an Overlay
 * anchors itself to it (its own `anchorRef`), as Figma's Manual overlay sits by its trigger; Filter table and Change step
 * drive the shown Screen's Table and Stepper, until the next Screen shows (each visit starts as drawn).
 */

/** A step of the flow: the Screen shown and the options of the action that showed it (Back plays them backwards). */
type Step = { screen: string; options?: ProtoOptions };
/** The open overlay: shown by a press (`options`: its animation), while the pointer stays on a layer (`hover`), or as
 *  the presented frame (`start`). */
export type OpenOverlay = { id: string; options?: ProtoOptions; hover?: boolean; start?: boolean; from?: Element | null };
/** The shown Screen's live Tables, Steppers and controls (Filter table, Change step, W-52 A), for the visit `key`. */
type Live = { key: string; filters: Map<string, Map<string, PlayFilter>>; steps: Map<string, number>; controls: Map<string, unknown> };
/** The frame going away while the next one comes in (`reverse`: Back). */
type Leaving = { key: string; screen: string; options?: ProtoOptions; reverse: boolean };
/** A frame going away is dropped after this long even if its animation never reports its end (no animation running). */
const LEAVE_MS = 700;

/** The live state for the visit `key`: the one kept, or a fresh one once another Screen shows. */
const liveNow = (state: Live, key: string): Live => (state.key === key ? state : { key, filters: new Map(), steps: new Map(), controls: new Map() });

export const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
const elements = (tree: PageTree | null) => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element");

export function usePlayFlow(tree: PageTree | null, start: string | null, { onLeave, breakpoint = null }: { onLeave?: () => void; breakpoint?: ZenBreakpointKey | null } = {}) {
  const frames = useMemo(() => elements(tree), [tree]);
  const screens = useMemo(() => frames.filter((node) => node.name === "Screen"), [frames]);
  const firstScreen = String(literal(screens[0] ?? { props: {} } as PageNode, "id") ?? "");
  // Present from an Overlay frame: it starts open (no animation) over the Screen that opens it, else alone.
  const presented = start?.startsWith(OVERLAY_START) ? start.slice(OVERLAY_START.length) : null;
  const presentedNode = presented ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === presented) : undefined;
  const opener = useMemo(() => (presented ? openerOf(tree, presented) : null), [presented, tree]);
  const alone = Boolean(presentedNode) && !opener;
  const startOverlay = useMemo<OpenOverlay | null>(() => (presented ? { id: presented, options: { animation: "instant" }, start: true } : null), [presented]);
  // A Screen's id finds its default state (else its first); "<id>:<state>" that state. With a `breakpoint` (a fixed
  // viewport's), a Screen drawn as a version of it for that breakpoint shows in its place (./versions.ts, decision D4).
  const versions = useMemo(() => versionScreensOf(tree), [tree]);
  const screenOf = useCallback((target: string) => {
    const { id: asked, state } = screenTargetOf(target);
    const id = breakpoint ? versionFor(versions, asked, breakpoint) : asked;
    if (state) return screens.find((node) => literal(node, "id") === id && literal(node, "state") === state) ?? screens.find((node) => literal(node, "id") === asked && literal(node, "state") === state);
    return screens.find((node) => literal(node, "id") === id && literal(node, "state") === undefined) ?? screens.find((node) => literal(node, "id") === id);
  }, [screens, versions, breakpoint]);
  const first = presentedNode ? opener ?? "" : start && screenOf(start) ? start : firstScreen;
  const [history, setHistory] = useState<Step[]>([]);
  const [overlay, setOverlay] = useState<OpenOverlay | null>(startOverlay);
  // Restart draws the Screen again even when it is already the first: what its components kept (a filter chip's pick,
  // typed text) goes with Play's own state.
  const [run, setRun] = useState(0);
  // Each Screen shown is a visit of its own, Back's too: the Screen it returns to starts as drawn (its live Tables,
  // Steppers and controls; the history's length alone gave Back the key of the visit it left, and its state with it).
  const [visit, setVisit] = useState(0);
  const current = history.at(-1)?.screen ?? first;
  const currentKey = `${run}:${visit}:${current}`;
  // The animation between two frames: the one going away stays drawn under (or over) the one coming in until it ends.
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [entering, setEntering] = useState<{ options?: ProtoOptions; reverse: boolean } | null>(null);
  const flow = useRef({ history, current, currentKey, overlay, alone, onLeave });
  flow.current = { history, current, currentKey, overlay, alone, onLeave };
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => { setLeaving(null); setEntering(null); }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  const { toast } = useToast();

  // Filter table, Change step and the choice controls: the shown Screen's live state, kept while it shows (an overlay
  // closed and opened again finds its pick), dropped when another Screen shows (or on Restart).
  const [live, setLive] = useState<Live>({ key: "", filters: new Map(), steps: new Map(), controls: new Map() });
  const restart = useCallback(() => { setHistory([]); setRun((count) => count + 1); setOverlay(startOverlay); setLeaving(null); setEntering(null); setLive({ key: "", filters: new Map(), steps: new Map(), controls: new Map() }); }, [startOverlay]);
  // An overlay closing over nothing (the presented Overlay alone, before any Screen) ends the flow.
  const closeOverlay = useCallback(() => {
    const { alone: lone, history: stack, onLeave: leave } = flow.current;
    if (lone && !stack.length && leave) leave();
    else setOverlay(null);
  }, []);
  const missing = useCallback((what: string, target: string) => toast({ title: `No ${what} “${target}” on this page`, type: "warning" }), [toast]);
  const hasOverlay = useCallback((target: string) => frames.some((node) => node.name === "Overlay" && literal(node, "id") === target), [frames]);
  const actions = useMemo<ProtoActions>(() => ({
    navigate: (target, raw) => {
      if (!screenOf(String(target))) { missing("screen", String(target)); return; }
      const options = optionsOf("navigate", [target, raw]);
      const { history: stack, current: from, currentKey: fromKey } = flow.current;
      setOverlay(null);
      setLeaving(options.animation === "instant" ? null : { key: fromKey, screen: from, options, reverse: false });
      setEntering(options.animation === "instant" ? null : { options, reverse: false });
      // The presented Overlay alone has no Screen to come back to: Back returns to it (below).
      setHistory([...(stack.length || !first ? stack : [{ screen: first }]), { screen: String(target), options }]);
      setVisit((count) => count + 1);
    },
    open: (target, raw, from) => {
      if (!hasOverlay(String(target))) { missing("overlay", String(target)); return; }
      // The layer that opened it pressed again closes it (Figma: the press lands outside the overlay).
      const open = flow.current.overlay;
      if (from && open && !open.hover && open.id === String(target) && open.from === from) { closeOverlay(); return; }
      setOverlay({ id: String(target), options: optionsOf("open", [target, raw]), from });
    },
    close: closeOverlay,
    back: () => {
      const { history: stack, overlay: open, currentKey: fromKey, alone: lone } = flow.current;
      if (open) { closeOverlay(); return; }
      const step = stack.at(-1);
      if (!step) return;
      // Back plays the way in backwards: the frame leaves the way it came.
      const instant = step.options?.animation === "instant";
      setLeaving(instant ? null : { key: fromKey, screen: step.screen, options: step.options, reverse: true });
      setEntering(instant ? null : { options: step.options, reverse: true });
      setHistory(stack.slice(0, -1));
      setVisit((count) => count + 1);
      if (lone && stack.length === 1) setOverlay(startOverlay);
    },
    toast: (options) => toast((options && typeof options === "object" ? options : { title: String(options ?? "") }) as ToastOptions),
    link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
    // Filter table: the shown Screen's Table (the one named, else its first) keeps the rows its filters match, one per
    // column and match (a Search and the filter chips beside it narrow together). The same fixed value or chosen item
    // again (a filter chip pressed or picked twice), or nothing to match (a chip's ×, a cleared Search), drops that one.
    filter: (raw, choice) => {
      const { current: shown, currentKey: key } = flow.current;
      const filter = filterOf([raw]);
      const table = targetLayerOf(screenOf(shown), "Table", filter.table);
      if (!table) { toast({ title: "No Table on this screen", type: "warning" }); return; }
      const values = filter.value !== undefined ? [filter.value] : filterValuesOf(choice);
      // What is typed never toggles: only a pressed value or a chosen item does.
      const toggles = filter.value !== undefined || (choice !== null && typeof choice === "object");
      const match = filter.match ?? "is";
      const slot = `${filter.column ?? ""}|${match}`;
      setLive((state) => {
        const now = liveNow(state, key);
        const filters = new Map(now.filters);
        const own = new Map(filters.get(table.loc));
        const was = own.get(slot);
        const again = toggles && was !== undefined && was.values.join("\u0000") === values.join("\u0000");
        if (again || !values.some((value) => value.trim())) own.delete(slot);
        else own.set(slot, { column: filter.column, values, match });
        if (own.size) filters.set(table.loc, own);
        else filters.delete(table.loc);
        return { ...now, filters };
      });
    },
    // Change step: the shown Screen's Stepper (the one named, else its first) moves to its next or previous step.
    step: (to, raw) => {
      const { current: shown, currentKey: key } = flow.current;
      const { to: way, stepper } = stepOf([to, raw]);
      const node = targetLayerOf(screenOf(shown), "Stepper", stepper);
      if (!node) { toast({ title: "No Stepper on this screen", type: "warning" }); return; }
      const { count, start: begin } = stepperOf(node);
      setLive((state) => {
        const now = liveNow(state, key);
        const steps = new Map(now.steps);
        steps.set(node.loc, steppedIndex(steps.get(node.loc) ?? begin, way, count));
        return { ...now, steps };
      });
    },
    // While hovering: the overlay shows while the pointer stays on the layer, then goes (an overlay opened by a press stays).
    hover: {
      enter: (target, raw, from) => { if (hasOverlay(target)) setOverlay({ id: target, options: optionsOf("open", [target, raw]), hover: true, from }); },
      leave: () => setOverlay((open) => (open?.hover ? null : open)),
    },
  }), [closeOverlay, first, hasOverlay, missing, screenOf, startOverlay, toast]);

  const screen = screenOf(current);
  // The presented Overlay alone shows over a blank screen of the page's device and size (its first Screen's).
  const blank = !screen && alone ? screenOf(firstScreen) : undefined;
  // After delay (a Screen's): once the screen shows, its action runs when the delay is over (again on each visit).
  const delayed = screen?.props.onDelay;
  const latest = useRef(actions);
  latest.current = actions;
  useEffect(() => {
    if (delayed?.kind !== "proto") return undefined;
    const timer = window.setTimeout(() => protoHandler(latest.current, delayed.action, delayed.args)(), optionsOf(delayed.action, delayed.args).delay ?? DEFAULT_DELAY);
    return () => window.clearTimeout(timer);
  }, [currentKey, delayed]);

  const leavingNode = leaving ? screenOf(leaving.screen) : undefined;
  const overlayNode = overlay ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === overlay.id) : undefined;
  const endLeaving = useCallback(() => { setLeaving(null); setEntering(null); }, []);
  const stepTargets = useMemo(() => stepTargetsOf(tree), [tree]);
  const onStep = useCallback((loc: string, index: number) => setLive((state) => {
    const now = liveNow(state, flow.current.currentKey);
    return { ...now, steps: new Map(now.steps).set(loc, index) };
  }), []);
  const choices = useMemo(() => choicesOf(tree), [tree]);
  const onControl = useCallback((loc: string, value: unknown) => setLive((state) => {
    const now = liveNow(state, flow.current.currentKey);
    return { ...now, controls: new Map(now.controls).set(loc, value) };
  }), []);
  const shownLive = live.key === currentKey ? live : null;
  const play = useMemo<PlayLive>(() => ({ filters: shownLive?.filters ?? new Map(), steps: shownLive?.steps ?? new Map(), stepTargets, onStep, controls: shownLive?.controls ?? new Map(), choices, onControl }), [choices, onControl, onStep, shownLive, stepTargets]);
  return { tree, screen, blank, base: screen ?? blank, alone, presentedNode, current, currentKey, history, overlay, setOverlay, closeOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions, restart, play };
}

export type PlayFlow = ReturnType<typeof usePlayFlow>;

/**
 * Where the open overlay anchors (an Overlay at Position Manual, a DatePicker or Popover in one), once drawn: the element
 * pressed while it still shows, else the layer that opens it on the shown Screen (the one holding focus first: a tab of
 * a tab bar…); null when there is none; undefined until it is found (the overlay waits a layout pass, never a paint).
 */
function useOverlayAnchor(flow: PlayFlow, file: string, screensRef: RefObject<HTMLElement | null>, wanted: boolean): Element | null | undefined {
  const { overlay, tree } = flow;
  const [found, setFound] = useState<{ overlay: OpenOverlay; element: Element | null } | null>(null);
  useLayoutEffect(() => {
    if (!overlay || !wanted) return;
    const screens = screensRef.current;
    const device = screens?.parentElement ?? screens;
    let element: Element | null = overlay.from?.isConnected && device?.contains(overlay.from) ? overlay.from : null;
    if (!element && screens) {
      const links = linksOf(tree).filter((link) => link.action === "open" && link.target === overlay.id);
      const drawn = layerElements(screens, new Set(links.map((link) => `${file}:${link.loc}`)));
      const candidates = links.flatMap((link) => (drawn.get(`${file}:${link.loc}`) ?? []).map((at) => {
        if (!link.item) return at;
        const node = findNode(tree, link.loc);
        const all = node ? choiceItemsOf(node) : [];
        const item = all.find((entry) => entry.value === link.item);
        return item ? itemElement(at, item, all) : null;
      })).filter((at): at is Element => Boolean(at));
      const active = document.activeElement;
      element = candidates.find((at) => active && at.contains(active)) ?? candidates[0] ?? null;
    }
    setFound({ overlay, element });
  }, [file, overlay, screensRef, tree, wanted]);
  if (!overlay || !wanted) return null;
  return found?.overlay === overlay ? found.element : undefined;
}

/** An overlay's layer at Position Manual: below its anchor (above when there is no room), at its start edge, as a Zen
 *  Popover sits by its trigger. */
function AnchoredContent({ anchor, motion, children }: { anchor: Element; motion: ReturnType<typeof motionProps>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const placement = useAnchoredPosition(ref, true, { anchor: () => anchor as HTMLElement });
  return (
    <div ref={ref} {...motion} className="studio-player__overlay-content" data-side={placement.side} style={{ ...motion.style, ...placement.style }}>
      {children}
    </div>
  );
}

/**
 * The flow drawn: the current Screen (and the one leaving, under or over it), then the open overlay. `file` names the
 * page's nodes (layers, hotspots); `overlaySafe`: the bars an overlay the Overlay places keeps clear of.
 */
export function PlayScreens({ flow, file, overlaySafe, library }: { flow: PlayFlow; file: string; overlaySafe?: { top: number | string; bottom: number | string } | null; library?: ReadonlyMap<string, LocalComponents> }) {
  const { tree, screen, blank, alone, currentKey, overlay, closeOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions, play } = flow;
  // `library`: the project's pages' components (Libraries' project components), as the canvas draws their instances.
  const ctx = { file, mock: tree?.mock ?? {}, proto: actions, components: componentsOf(tree?.board ?? null), library };
  // The shown Screen and its overlay take Play's live Tables and Steppers; the Screen going away stays as it was drawn.
  const shownCtx = { ...ctx, play };
  const overlayChild = overlayNode?.children.find((child): child is PageNode => child.kind === "element");
  const screensRef = useRef<HTMLDivElement>(null);
  const selfPlaced = Boolean(overlayChild && placesItself(overlayChild.name));
  const manual = Boolean(overlayNode && !selfPlaced && literal(overlayNode, "position") === "manual");
  const anchor = useOverlayAnchor(flow, file, screensRef, Boolean(overlayChild && (selfPlaced ? anchorsItself(overlayChild.name) : manual)));
  const anchorRef = useMemo(() => ({ current: (anchor ?? null) as HTMLElement | null }), [anchor]);
  const safe = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
  const blankSize = (prop: string) => { const value = blank ? literal(blank, prop) : undefined; return typeof value === "number" ? value : undefined; };
  const closeOn = (open: boolean) => { if (!open) closeOverlay(); };
  /** The Overlay's box: its layer where the Overlay says (Figma's overlay position; Manual: by its anchor), over a dimmed
   *  screen when asked; a press outside it closes it unless the Overlay says not to. */
  const placed = (node: PageNode, open: NonNullable<typeof overlay>, content: ReactNode) => {
    const motion = motionProps(open.hover ? null : frameMotion(open.options, "enter"));
    // Manual with nothing to sit by (no layer that opens it is drawn) shows at the center.
    const position = String(literal(node, "position") ?? "center");
    const anchored = manual && anchor ? anchor : null;
    return (
      <div
        className="studio-player__overlay"
        data-position={position === "manual" && !anchored ? "center" : position}
        data-background={literal(node, "background") === true || undefined}
        data-hover={open.hover || undefined}
        style={overlaySafe ? { "--zen-safe-area-top": safe(overlaySafe.top), "--zen-safe-area-bottom": safe(overlaySafe.bottom) } as CSSProperties : undefined}
        onPointerDown={(event) => { if (event.target === event.currentTarget && literal(node, "closeOnOutside") !== false) closeOverlay(); }}
      >
        {anchored ? <AnchoredContent key={open.id} anchor={anchored} motion={motion}>{content}</AnchoredContent> : <div key={open.id} className="studio-player__overlay-content" {...motion}>{content}</div>}
      </div>
    );
  };
  const overlayLayer = (): ReactNode => {
    if (!overlayChild || !overlayNode || !overlay || anchor === undefined) return null;
    const key = `overlay:${overlay.id}`;
    if (!selfPlaced) return placed(overlayNode, overlay, renderNode(overlayChild, { mock: ctx.mock }, shownCtx, key));
    // A DatePicker or Popover with no layer to sit by (Present from its Overlay frame, After delay): shown in place, in
    // the Overlay's box, as a Card would be.
    if (anchorsItself(overlayChild.name) && !anchor && overlayChild.name === "DatePicker") return placed(overlayNode, overlay, renderNode(overlayChild, { mock: ctx.mock }, shownCtx, key, { open: true }));
    // A Dialog, Side Panel, Bottom Sheet… places and animates itself; a DatePicker or Popover by the layer that opened it.
    return renderNode(overlayChild, { mock: ctx.mock }, shownCtx, key, { open: true, onOpenChange: closeOn, ...(anchor ? { anchorRef } : {}) });
  };
  return (
    <>
      <div ref={screensRef} className="studio-player__screens">
        {screen ? (
          <div key={currentKey} className="studio-player__screen" {...motionProps(entering ? frameMotion(entering.options, "enter", entering.reverse) : null)}>
            {renderNode(screen, { mock: ctx.mock }, shownCtx)}
          </div>
        ) : alone ? (
          <div className="studio-player__screen" data-blank="">
            <Screen device={(blank ? literal(blank, "device") as PageDevice | undefined : undefined) ?? "desktop"} layout={blank ? literal(blank, "layout") as ScreenLayout | undefined : undefined} canvas={blank ? literal(blank, "canvas") as ScreenCanvas | undefined : undefined} width={blankSize("width")} height={blankSize("height")} />
          </div>
        ) : <p className="studio-player__empty">{tree ? "This page has no Screen to play." : ""}</p>}
        {leaving && leavingNode ? (
          <div
            key={leaving.key}
            className="studio-player__screen"
            data-leaving=""
            inert
            aria-hidden="true"
            {...motionProps(frameMotion(leaving.options, "leave", leaving.reverse))}
            onAnimationEnd={(event) => { if (event.target === event.currentTarget) endLeaving(); }}
          >
            {renderNode(leavingNode, { mock: ctx.mock }, ctx)}
          </div>
        ) : null}
      </div>
      {overlayLayer()}
    </>
  );
}
