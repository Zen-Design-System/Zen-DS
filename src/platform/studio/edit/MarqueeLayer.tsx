import { useMarquee } from "./marquee";

/* The marquee rectangle (edit/marquee.ts), in canvas-viewport coordinates. */
export function MarqueeLayer({ viewport }: { viewport: HTMLElement | null }) {
  const rect = useMarquee();
  if (!rect || !viewport) return null;
  const origin = viewport.getBoundingClientRect();
  return <div className="studio-marquee" style={{ transform: `translate(${rect.x - origin.left}px, ${rect.y - origin.top}px)`, width: rect.w, height: rect.h }} />;
}
