import { useState, type ReactNode } from "react";
import { BadgeCounter } from "../../../components/Badge";
import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";

/*
 * Code properties: what the code has and Figma does not (an HTML element, Scroll, a button's type, an id…), kept out of
 * the design view behind a closed disclosure at the end of the Design tab, so the panel reads as Figma's (user,
 * 2026-10-17: "Còn dùng ngôn ngữ dev nhiều quá"). Opened once, it stays open for the next layers in this session.
 */

let openNow = false;

/** `placement`: "panel" straight in the Design tab (a frame, text or shape), which pads it as a section; "section" (default)
 *  inside the Properties section, which already does. */
export function CodeProperties({ count, placement = "section", children }: { count: number; placement?: "panel" | "section"; children: ReactNode }) {
  const [open, setOpen] = useState(openNow);
  if (!count) return null;
  return (
    <details
      className="studio-inspector__code"
      data-e2e="code-properties"
      data-placement={placement}
      open={open}
      onToggle={(event) => { openNow = event.currentTarget.open; setOpen(openNow); }}
    >
      <summary className={`studio-inspector__code-summary ${typographyStyles["Body/Small/Bold"]}`}>
        <Icon name="icon-chevron-right-line" size={16} decorative />
        <span>Code properties</span>
        <BadgeCounter className="studio-inspector__code-count" value={count} size="xs" theme="neutral" background="subtle" />
      </summary>
      <div className="studio-inspector__code-body">{children}</div>
    </details>
  );
}
