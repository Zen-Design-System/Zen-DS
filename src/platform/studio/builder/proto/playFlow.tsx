import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useToast, type ToastOptions } from "../../../../components/Toast";
import { componentsOf, renderNode, type PageNode, type PageTree } from "../render/renderPage";
import { frameMotion, motionProps } from "./playMotion";
import { DEFAULT_DELAY, openerOf, optionsOf, OVERLAY_START, type ProtoOptions } from "./protoModel";
import { placesItself } from "./protoTriggers";
import { protoHandler, Screen, type PageDevice, type ProtoActions, type ScreenCanvas, type ScreenLayout } from "./runtime";

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
 */

/** A step of the flow: the Screen shown and the options of the action that showed it (Back plays them backwards). */
type Step = { screen: string; options?: ProtoOptions };
/** The open overlay: shown by a press (`options`: its animation), while the pointer stays on a layer (`hover`), or as
 *  the presented frame (`start`). */
export type OpenOverlay = { id: string; options?: ProtoOptions; hover?: boolean; start?: boolean };
/** The frame going away while the next one comes in (`reverse`: Back). */
type Leaving = { key: string; screen: string; options?: ProtoOptions; reverse: boolean };
/** A frame going away is dropped after this long even if its animation never reports its end (no animation running). */
const LEAVE_MS = 700;

export const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
const elements = (tree: PageTree | null) => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element");

export function usePlayFlow(tree: PageTree | null, start: string | null, { onLeave }: { onLeave?: () => void } = {}) {
  const frames = useMemo(() => elements(tree), [tree]);
  const screens = useMemo(() => frames.filter((node) => node.name === "Screen"), [frames]);
  const firstScreen = String(literal(screens[0] ?? { props: {} } as PageNode, "id") ?? "");
  // Present from an Overlay frame: it starts open (no animation) over the Screen that opens it, else alone.
  const presented = start?.startsWith(OVERLAY_START) ? start.slice(OVERLAY_START.length) : null;
  const presentedNode = presented ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === presented) : undefined;
  const opener = useMemo(() => (presented ? openerOf(tree, presented) : null), [presented, tree]);
  const alone = Boolean(presentedNode) && !opener;
  const startOverlay = useMemo<OpenOverlay | null>(() => (presented ? { id: presented, options: { animation: "instant" }, start: true } : null), [presented]);
  const first = presentedNode ? opener ?? "" : start && screens.some((node) => literal(node, "id") === start) ? start : firstScreen;
  const [history, setHistory] = useState<Step[]>([]);
  const [overlay, setOverlay] = useState<OpenOverlay | null>(startOverlay);
  const current = history.at(-1)?.screen ?? first;
  const currentKey = `${history.length}:${current}`;
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

  const restart = useCallback(() => { setHistory([]); setOverlay(startOverlay); setLeaving(null); setEntering(null); }, [startOverlay]);
  // An overlay closing over nothing (the presented Overlay alone, before any Screen) ends the flow.
  const closeOverlay = useCallback(() => {
    const { alone: lone, history: stack, onLeave: leave } = flow.current;
    if (lone && !stack.length && leave) leave();
    else setOverlay(null);
  }, []);
  const screenOf = useCallback((screenId: string) => screens.find((node) => literal(node, "id") === screenId && literal(node, "state") === undefined) ?? screens.find((node) => literal(node, "id") === screenId), [screens]);
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
    },
    open: (target, raw) => {
      if (!hasOverlay(String(target))) { missing("overlay", String(target)); return; }
      setOverlay({ id: String(target), options: optionsOf("open", [target, raw]) });
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
      if (lone && stack.length === 1) setOverlay(startOverlay);
    },
    toast: (options) => toast((options && typeof options === "object" ? options : { title: String(options ?? "") }) as ToastOptions),
    link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
    // While hovering: the overlay shows while the pointer stays on the layer, then goes (an overlay opened by a press stays).
    hover: {
      enter: (target, raw) => { if (hasOverlay(target)) setOverlay({ id: target, options: optionsOf("open", [target, raw]), hover: true }); },
      leave: () => setOverlay((open) => (open?.hover ? null : open)),
    },
  }), [closeOverlay, first, hasOverlay, missing, screenOf, startOverlay, toast]);

  const screen = screenOf(current);
  // The presented Overlay alone shows over a blank screen of the page's device and size (its first Screen's).
  const blank = !screen && alone ? screenOf(firstScreen) : undefined;
  // After delay (a Screen's): once the screen shows, its action runs when the delay is over (again on each visit).
  const delayed = screen?.props.onDelay;
  const live = useRef(actions);
  live.current = actions;
  useEffect(() => {
    if (delayed?.kind !== "proto") return undefined;
    const timer = window.setTimeout(() => protoHandler(live.current, delayed.action, delayed.args)(), optionsOf(delayed.action, delayed.args).delay ?? DEFAULT_DELAY);
    return () => window.clearTimeout(timer);
  }, [currentKey, delayed]);

  const leavingNode = leaving ? screenOf(leaving.screen) : undefined;
  const overlayNode = overlay ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === overlay.id) : undefined;
  const endLeaving = useCallback(() => { setLeaving(null); setEntering(null); }, []);
  return { tree, screen, blank, base: screen ?? blank, alone, presentedNode, current, currentKey, history, overlay, setOverlay, closeOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions, restart };
}

export type PlayFlow = ReturnType<typeof usePlayFlow>;

/**
 * The flow drawn: the current Screen (and the one leaving, under or over it), then the open overlay. `file` names the
 * page's nodes (layers, hotspots); `overlaySafe`: the bars an overlay the Overlay places keeps clear of.
 */
export function PlayScreens({ flow, file, overlaySafe }: { flow: PlayFlow; file: string; overlaySafe?: { top: number | string; bottom: number | string } | null }) {
  const { tree, screen, blank, alone, currentKey, overlay, closeOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions } = flow;
  const ctx = { file, mock: tree?.mock ?? {}, proto: actions, components: componentsOf(tree?.board ?? null) };
  const overlayChild = overlayNode?.children.find((child): child is PageNode => child.kind === "element");
  const safe = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
  const blankSize = (prop: string) => { const value = blank ? literal(blank, prop) : undefined; return typeof value === "number" ? value : undefined; };
  return (
    <>
      <div className="studio-player__screens">
        {screen ? (
          <div key={currentKey} className="studio-player__screen" {...motionProps(entering ? frameMotion(entering.options, "enter", entering.reverse) : null)}>
            {renderNode(screen, { mock: ctx.mock }, ctx)}
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
      {overlayChild && overlayNode && overlay ? (placesItself(overlayChild.name)
        // A Dialog, Side Panel, Bottom Sheet… places and animates itself.
        ? renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`, { open: true, onOpenChange: (open: boolean) => { if (!open) closeOverlay(); } })
        : (
          // Any other layer: where the Overlay says (Figma's overlay position), over a dimmed screen when asked;
          // a press outside it closes it unless the Overlay says not to.
          <div
            className="studio-player__overlay"
            data-position={String(literal(overlayNode, "position") ?? "center")}
            data-background={literal(overlayNode, "background") === true || undefined}
            data-hover={overlay.hover || undefined}
            style={overlaySafe ? { "--zen-safe-area-top": safe(overlaySafe.top), "--zen-safe-area-bottom": safe(overlaySafe.bottom) } as CSSProperties : undefined}
            onPointerDown={(event) => { if (event.target === event.currentTarget && literal(overlayNode, "closeOnOutside") !== false) closeOverlay(); }}
          >
            <div key={overlay.id} className="studio-player__overlay-content" {...motionProps(overlay.hover ? null : frameMotion(overlay.options, "enter"))}>
              {renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`)}
            </div>
          </div>
        )) : null}
    </>
  );
}
