import "./notification-dot.css";

/** Figma Primitives/Notification-Dot (4116:21789), Style=Dot. Internal: the component that shows it positions it. */
export function NotificationDot({ className, tone = "default" }: { className?: string; tone?: "default" | "active" | "accent" }) {
  return <span className={["zen-notification-dot", className].filter(Boolean).join(" ")} data-tone={tone === "default" ? undefined : tone} aria-hidden="true" />;
}
