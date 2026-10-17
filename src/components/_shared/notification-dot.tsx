import type { ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import "./notification-dot.css";

/**
 * Figma Primitives/Notification-Dot (4116:21789): Style=Dot without `value`, Style=Number with it (the count, already
 * formatted: "99+"); Theme Default (Negative), Active (Positive) or Accent. Internal and decorative: the component that
 * shows it positions it and puts the count in its own accessible name.
 */
export function NotificationDot({ className, tone = "default", value }: { className?: string; tone?: "default" | "active" | "accent"; value?: ReactNode }) {
  const number = value !== undefined && value !== null && value !== false && value !== "";
  return (
    <span className={["zen-notification-dot", className].filter(Boolean).join(" ")} data-style={number ? "number" : undefined} data-tone={tone === "default" ? undefined : tone} aria-hidden="true">
      {number ? <span className={typographyStyles["Caption/Regular"]}>{value}</span> : null}
    </span>
  );
}
