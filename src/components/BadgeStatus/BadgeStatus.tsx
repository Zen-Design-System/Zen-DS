import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import type { ZenLabels } from "../_shared/labels";
import { typographyStyles } from "../../tokens/typography.generated";
import "../Badge/badge.css";
import "./badge-status.css";
import "../Icon/core";

/** The workflow steps of Figma Badge-Status, in order. */
export const badgeStatuses = ["to-do", "in-progress", "in-review", "done", "blocked", "cancelled"] as const;
export type BadgeStatusValue = (typeof badgeStatuses)[number];
export const badgeStatusSizes = ["small", "medium"] as const;
/** Short (canonical) or long Figma spelling — both render the same. */
export type BadgeStatusSize = "sm" | "md" | "small" | "medium";

/** How full each step's ring is in Figma (the Progress arc); Blocked and Cancelled show a library icon instead. */
export const badgeStatusProgress: Record<BadgeStatusValue, number | null> = { "to-do": 0, "in-progress": 25, "in-review": 50, done: 100, blocked: null, cancelled: null };

const labelKey: Record<BadgeStatusValue, keyof ZenLabels> = {
  "to-do": "statusToDo", "in-progress": "statusInProgress", "in-review": "statusInReview", done: "statusDone", blocked: "statusBlocked", cancelled: "statusCancelled",
};

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<span>`. */
export interface BadgeStatusProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
  /** The workflow step: to-do (Neutral) · in-progress (Info) · in-review (Warning) · done (Positive) · blocked (Negative) · cancelled (Neutral, muted label). */
  status?: BadgeStatusValue;
  /** Short (sm, md) or Figma (small, medium) spelling. Medium is 28 high with a 20px ring, Small 20 with a 16px ring. */
  size?: BadgeStatusSize;
  /**
   * How full the ring is, 0–100 (Figma: the Progress layer's arc). Default: the step's own value (to-do 0, in-progress 25,
   * in-review 50, done 100). Set it for an exact value (a project at 60%); it is then read after the label. Blocked and
   * Cancelled have no ring and ignore it.
   */
  progress?: number;
  /** The label. Default: the step's name from the locale's labels (en "In Progress", vi "Đang làm"). */
  children?: ReactNode;
  className?: string;
}

/** The progress ring, drawn on Figma's 24 grid (Component Size Comfortable): a 2px ring inset 1 and a pie of radius 7 that
 *  fills clockwise from the top. It scales with the Element-Size token, so it is 20 with a 1.67px ring in Compact. */
function StatusRing({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  let pie: ReactNode = null;
  if (v >= 100) pie = <circle cx="12" cy="12" r="7" />;
  else if (v > 0) {
    const angle = (v / 100) * 2 * Math.PI;
    const x = (12 + 7 * Math.sin(angle)).toFixed(3);
    const y = (12 - 7 * Math.cos(angle)).toFixed(3);
    pie = <path d={`M12 12 L12 5 A7 7 0 ${v > 50 ? 1 : 0} 1 ${x} ${y} Z`} />;
  }
  return (
    <svg className="zen-badge-status__ring" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      {pie ? <g fill="currentColor">{pie}</g> : null}
    </svg>
  );
}

/**
 * Figma Badge-Status (16932:195, page ❖ Badge): Status × Size, promoted from the HR-Platform template. A task's or a
 * project's workflow step as a Subtle badge whose ring fills as the work moves on. Built on the Badge tokens
 * (Badge/Size, Badge/Spacing; the ring Element-Size/Popular/Base on Medium, Popular/Small on Small, left padding
 * Spacing/Padding/2XSmall · 3XSmall so the ring is concentric with the pill). Colours per step:
 * Color/Background/<Tone>/Subtle/Default, the label Content/<Tone>/Strongest, the ring Content/<Tone>/Light. Blocked and
 * Cancelled use the library's icon-slash-circle-01-line and icon-x-circle-line. The ring is
 * .Primitives/Badge/Progress-Icon (16943:171).
 */
export function BadgeStatus({ ref, status = "to-do", size: sizeProp = "md", progress, children, className, ...rest }: BadgeStatusProps) {
  const t = useZenLabels();
  const size = scaleKey(sizeProp, badgeStatusSizes);
  const step = badgeStatusProgress[status];
  const textStyle = size === "small" ? typographyStyles["Body/Small/Medium"] : typographyStyles["Body/Base/Medium"];
  const exact = step !== null && typeof progress === "number" ? Math.round(Math.min(100, Math.max(0, progress))) : null;
  const leading = step === null
    ? <Icon name={status === "blocked" ? "icon-slash-circle-01-line" : "icon-x-circle-line"} decorative />
    : <StatusRing value={exact ?? step} />;
  const label = children ?? (t[labelKey[status]] as string);
  return (
    <span {...rest} ref={ref} className={["zen-badge", "zen-badge-status", className].filter(Boolean).join(" ")} data-size={size} data-status={status}>
      <span className="zen-badge-status__leading">{leading}</span>
      <span className={`zen-badge__text ${textStyle}`}>{label}{exact !== null ? <VisuallyHidden>{`, ${t.statusPercent(exact)}`}</VisuallyHidden> : null}</span>
    </span>
  );
}
