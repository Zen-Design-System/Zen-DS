import { useEffect, useState } from "react";
import "./motion.css";

export type PresencePhase = "open" | "closing";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps an overlay mounted while its exit animation plays.
 * `open` true → mounted, phase "open" (CSS runs the enter keyframes on mount).
 * `open` false → phase "closing" for `exitMs` (CSS runs the exit keyframes on data-state="closing"), then unmounts.
 * `exitMs` matches the exit animation's duration token. Reduced motion skips the wait: the surface fades in without moving
 * (tokens.css sets --zen-motion-movement to 0) and leaves at once. An animationend-driven exit is a later step.
 */
export function usePresence(open: boolean, exitMs = 200): { mounted: boolean; phase: PresencePhase } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return undefined; }
    if (!mounted) return undefined;
    if (prefersReducedMotion()) { setMounted(false); return undefined; }
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs, mounted]);
  return { mounted: open || mounted, phase: open ? "open" : "closing" };
}
