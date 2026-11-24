import { h, mergeProps, nextTick, onBeforeUnmount, ref, shallowRef, watch, type VNodeChild } from "vue";
import { hoverWait, iconTooltipPosition, markTooltipClosed, TOOLTIP_HOVER_DELAY, typographyStyles, type IconTooltipPosition } from "@zen-ds/core";
import { usePresence } from "../components/Motion/usePresence";
import { ZenPortal } from "../components/Portal/Portal";

type Listener = (event: Event) => void;

/**
 * Built-in tooltip for icon-only controls (React: Tooltip's useIconTooltip). Zen rule: every icon-only action shows its
 * name on hover after 1s, and at once on keyboard focus; touch never opens it. `bind(props)` merges the pointer and focus
 * listeners into the trigger's own props (the trigger's run first); `tooltip()` teleports a fixed TooltipSurface beside
 * it. Off when the label is empty or false. The label repeats the accessible name, so it is not aria-describedby.
 */
export function useIconTooltip(label: () => VNodeChild | false | undefined, { placement = "top", delay = TOOLTIP_HOVER_DELAY }: { placement?: "top" | "bottom"; delay?: number } = {}) {
  const enabled = () => { const value = label(); return value !== false && value !== undefined && value !== null && value !== ""; };
  const anchor = shallowRef<HTMLElement | null>(null);
  const lastAnchor = shallowRef<HTMLElement | null>(null);
  const escaped = ref(false);
  const position = ref<IconTooltipPosition | null>(null);
  const layer = shallowRef<HTMLElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const show = (element: HTMLElement) => { anchor.value = element; lastAnchor.value = element; escaped.value = false; };
  const open = (element: HTMLElement, wait: number) => { clear(); if (wait <= 0) show(element); else timer = setTimeout(() => show(element), wait); };
  const close = () => { clear(); if (anchor.value) markTooltipClosed(); anchor.value = null; };
  // Hiding fades out at XFast from the last anchor (tooltip.css); Escape dismisses at once.
  const presence = usePresence(() => Boolean(anchor.value), 80);
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { escaped.value = true; close(); } };
  watch(anchor, (now, _was, onCleanup) => {
    if (!now) return;
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    onCleanup(() => { document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", close, true); });
    position.value = null;
    void nextTick(() => { if (layer.value && anchor.value) position.value = iconTooltipPosition(anchor.value, layer.value, placement); });
  });
  onBeforeUnmount(clear);

  const listeners: Record<string, Listener> = {
    onPointerenter: (event) => { if ((event as PointerEvent).pointerType !== "touch") open(event.currentTarget as HTMLElement, hoverWait(delay)); },
    onPointerleave: close,
    onPointerdown: close,
    onFocus: (event) => { const target = event.currentTarget as HTMLElement; if (target.matches(":focus-visible")) open(target, 0); },
    onBlur: close,
  };
  /** The trigger's props with the tooltip's listeners merged in (theirs first). */
  const bind = <P extends Record<string, unknown>>(props: P): P => (enabled() ? (mergeProps(props, listeners) as P) : props);

  const tooltip = (): VNodeChild => {
    const shown = anchor.value ?? lastAnchor.value;
    if (!enabled() || !presence.value.mounted || !shown || (escaped.value && !anchor.value)) return null;
    const at = position.value;
    return h(ZenPortal, null, () => h("span", {
      ref: (element: unknown) => { layer.value = element as HTMLElement | null; },
      class: "zen-tooltip-layer",
      "data-placement": at?.side,
      "data-state": anchor.value ? undefined : "closing",
      style: at ? { top: `${at.top}px`, left: `${at.left}px` } : { top: "0px", left: "0px", visibility: "hidden" },
    }, h("span", { class: "zen-tooltip", role: "tooltip", "data-color": "default", "data-size": "medium" }, h("span", { class: `zen-tooltip__label ${typographyStyles["Caption/Medium"]}` }, [label() as VNodeChild]))));
  };
  return { bind, tooltip };
}
