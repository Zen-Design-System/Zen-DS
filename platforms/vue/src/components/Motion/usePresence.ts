import { computed, onBeforeUnmount, ref, watch, type ComputedRef } from "vue";

export type PresencePhase = "open" | "closing";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps an overlay mounted while its exit animation plays (React: components/Motion/usePresence.ts).
 * `open` true → mounted, phase "open" (CSS runs the enter keyframes on mount).
 * `open` false → phase "closing" for `exitMs` (CSS runs the exit keyframes on data-state="closing"), then unmounts.
 * Reduced motion skips the wait: the surface fades in without moving and leaves at once.
 */
export function usePresence(open: () => boolean, exitMs = 200): ComputedRef<{ mounted: boolean; phase: PresencePhase }> {
  const mounted = ref(open());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  watch(open, (isOpen) => {
    clear();
    if (isOpen) { mounted.value = true; return; }
    if (!mounted.value) return;
    if (prefersReducedMotion()) { mounted.value = false; return; }
    timer = setTimeout(() => { mounted.value = false; }, exitMs);
  });
  onBeforeUnmount(clear);
  return computed(() => ({ mounted: open() || mounted.value, phase: open() ? "open" : "closing" }));
}
