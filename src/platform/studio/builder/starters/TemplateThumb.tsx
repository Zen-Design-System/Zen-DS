import { useEffect, useRef, useState, type ComponentType } from "react";
import { ZenProvider } from "../../../../components/Provider";
import { templateComponent } from "./fromTemplate";

/*
 * A page template's thumbnail in New page (user, 2026-10-09: "a grid of templates with small thumbnails"): the template
 * itself, rendered at its screen width (desktop 1440, phone 390) and scaled down into the card. It renders once the card
 * scrolls into view, inert and hidden from assistive tech (the card's text names it).
 */

const SIZE = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } } as const;

export function TemplateThumb({ id, mobile }: { id: string; mobile: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [fit, setFit] = useState({ scale: 0, left: 0 });
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const size = mobile ? SIZE.phone : SIZE.desktop;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const seen = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); seen.disconnect(); } }, { rootMargin: "120px" });
    seen.observe(box);
    // A phone screen fits the card's height, a desktop one its width.
    const measure = () => {
      const scale = mobile ? box.clientHeight / size.height : box.clientWidth / size.width;
      setFit({ scale, left: mobile ? (box.clientWidth - size.width * scale) / 2 : 0 });
    };
    measure();
    const resized = new ResizeObserver(measure);
    resized.observe(box);
    return () => { seen.disconnect(); resized.disconnect(); };
  }, [mobile, size.height, size.width]);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    void templateComponent(id).then((next) => { if (alive && next) setComponent(() => next); });
    return () => { alive = false; };
  }, [id, visible]);

  return (
    <div ref={boxRef} className="studio-thumb" data-device={mobile ? "phone" : "desktop"} aria-hidden="true" inert>
      {Component && fit.scale ? (
        <div className="studio-thumb__screen" style={{ width: size.width, height: size.height, left: fit.left, transform: `scale(${fit.scale})` }}>
          {mobile
            ? <ZenProvider typography="mobile" density="comfortable" paint portal={false} syncDocument={false} breakpoint="mobile"><Component /></ZenProvider>
            : <ZenProvider paint portal={false} syncDocument={false} breakpoint="desktop"><Component /></ZenProvider>}
        </div>
      ) : null}
    </div>
  );
}
