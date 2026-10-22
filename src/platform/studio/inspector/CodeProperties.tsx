import type { ReactNode } from "react";
import { InspectorSection } from "./Section";

/*
 * Code properties: what the code has and Figma does not (an HTML element, Scroll, a button's type, an id, the attributes
 * no API lists…). They are the Code tab's Properties, under the layer's example code (§3a: "code-only ones on the Code
 * tab"), so the Design tab shows only Figma's sections (user, 2026-10-17: "Còn dùng ngôn ngữ dev nhiều quá"). DesignPanel's
 * code view fills it with the Design tab's own rows, edited the same way.
 */
export function CodeProperties({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div data-e2e="code-properties">
      <InspectorSection title="Properties" note={note}>{children}</InspectorSection>
    </div>
  );
}
