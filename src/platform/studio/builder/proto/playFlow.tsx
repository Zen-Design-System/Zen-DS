import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useToast, type ToastOptions } from "../../../../components/Toast";
import { componentsOf, renderNode, type PageNode, type PageTree } from "../render/renderPage";
import { frameMotion, motionProps } from "./playMotion";
import { DEFAULT_DELAY, optionsOf, type ProtoOptions } from "./protoModel";
import { placesItself } from "./protoTriggers";
import { protoHandler, type ProtoActions } from "./runtime";

/*
 * A page's prototype flow, shared by Play (Player.tsx, in the Studio) and the phone (device/DevicePlay.tsx, Open on phone):
 * which Screen shows, the way back, the open overlay and the animation between frames. navigate opens a Screen's default
 * state, open shows an Overlay over the current Screen, close / back undo them, toast shows a Toast, link opens the URL
 * in a new tab; a Screen's After delay runs its action once it shows. Needs a ToastProvider above it.
 */

/** A step of the flow: the Screen shown and the options of the action that showed it (Back plays them backwards). */
type Step = { screen: string; options?: ProtoOptions };
/** The open overlay: shown by a press (`options`: its animation) or while the pointer stays on a layer (`hover`). */
export type OpenOverlay = { id: string; options?: ProtoOptions; hover?: boolean };
/** The frame going away while the next one comes in (`reverse`: Back). */
type Leaving = { key: string; screen: string; options?: ProtoOptions; reverse: boolean };
/** A frame going away is dropped after this long even if its animation never reports its end (no animation running). */
const LEAVE_MS = 700;

export const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
const elements = (tree: PageTree | null) => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element");

export function usePlayFlow(tree: PageTree | null, start: string | null) {
  const frames = useMemo(() => elements(tree), [tree]);
  const screens = useMemo(() => frames.filter((node) => node.name === "Screen"), [frames]);
  const first = start && screens.some((node) => literal(node, "id") === start) ? start : String(literal(screens[0] ?? { props: {} } as PageNode, "id") ?? "");
  const [history, setHistory] = useState<Step[]>([]);
  const [overlay, setOverlay] = useState<OpenOverlay | null>(null);
  const current = history.at(-1)?.screen ?? first;
  const currentKey = `${history.length}:${current}`;
  // The animation between two frames: the one going away stays drawn under (or over) the one coming in until it ends.
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [entering, setEntering] = useState<{ options?: ProtoOptions; reverse: boolean } | null>(null);
  const flow = useRef({ history, current, currentKey, overlay });
  flow.current = { history, current, currentKey, overlay };
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => { setLeaving(null); setEntering(null); }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  const { toast } = useToast();

  const restart = useCallback(() => { setHistory([]); setOverlay(null); setLeaving(null); setEntering(null); }, []);
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
      setHistory([...(stack.length ? stack : [{ screen: first }]), { screen: String(target), options }]);
    },
    open: (target, raw) => {
      if (!hasOverlay(String(target))) { missing("overlay", String(target)); return; }
      setOverlay({ id: String(target), options: optionsOf("open", [target, raw]) });
    },
    close: () => setOverlay(null),
    back: () => {
      const { history: stack, overlay: open, currentKey: fromKey } = flow.current;
      if (open) { setOverlay(null); return; }
      const step = stack.at(-1);
      if (!step) return;
      // Back plays the way in backwards: the frame leaves the way it came.
      const instant = step.options?.animation === "instant";
      setLeaving(instant ? null : { key: fromKey, screen: step.screen, options: step.options, reverse: true });
      setEntering(instant ? null : { options: step.options, reverse: true });
      setHistory(stack.slice(0, -1));
    },
    toast: (options) => toast((options && typeof options === "object" ? options : { title: String(options ?? "") }) as ToastOptions),
    link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
    // While hovering: the overlay shows while the pointer stays on the layer, then goes (an overlay opened by a press stays).
    hover: {
      enter: (target, raw) => { if (hasOverlay(target)) setOverlay({ id: target, options: optionsOf("open", [target, raw]), hover: true }); },
      leave: () => setOverlay((open) => (open?.hover ? null : open)),
    },
  }), [first, hasOverlay, missing, screenOf, toast]);

  const screen = screenOf(current);
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
  return { tree, screen, current, currentKey, history, overlay, setOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions, restart };
}

export type PlayFlow = ReturnType<typeof usePlayFlow>;

/**
 * The flow drawn: the current Screen (and the one leaving, under or over it), then the open overlay. `file` names the
 * page's nodes (layers, hotspots); `overlaySafe`: the bars an overlay the Overlay places keeps clear of.
 */
export function PlayScreens({ flow, file, overlaySafe }: { flow: PlayFlow; file: string; overlaySafe?: { top: number | string; bottom: number | string } | null }) {
  const { tree, screen, currentKey, overlay, setOverlay, leaving, leavingNode, entering, endLeaving, overlayNode, actions } = flow;
  const ctx = { file, mock: tree?.mock ?? {}, proto: actions, components: componentsOf(tree?.board ?? null) };
  const overlayChild = overlayNode?.children.find((child): child is PageNode => child.kind === "element");
  const safe = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
  return (
    <>
      <div className="studio-player__screens">
        {screen ? (
          <div key={currentKey} className="studio-player__screen" {...motionProps(entering ? frameMotion(entering.options, "enter", entering.reverse) : null)}>
            {renderNode(screen, { mock: ctx.mock }, ctx)}
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
        ? renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`, { open: true, onOpenChange: (open: boolean) => { if (!open) setOverlay(null); } })
        : (
          // Any other layer: where the Overlay says (Figma's overlay position), over a dimmed screen when asked;
          // a press outside it closes it unless the Overlay says not to.
          <div
            className="studio-player__overlay"
            data-position={String(literal(overlayNode, "position") ?? "center")}
            data-background={literal(overlayNode, "background") === true || undefined}
            data-hover={overlay.hover || undefined}
            style={overlaySafe ? { "--zen-safe-area-top": safe(overlaySafe.top), "--zen-safe-area-bottom": safe(overlaySafe.bottom) } as CSSProperties : undefined}
            onPointerDown={(event) => { if (event.target === event.currentTarget && literal(overlayNode, "closeOnOutside") !== false) setOverlay(null); }}
          >
            <div key={overlay.id} className="studio-player__overlay-content" {...motionProps(overlay.hover ? null : frameMotion(overlay.options, "enter"))}>
              {renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`)}
            </div>
          </div>
        )) : null}
    </>
  );
}
