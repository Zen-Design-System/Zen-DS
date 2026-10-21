import { type ButtonHTMLAttributes, type HTMLAttributes, type MouseEventHandler, type ReactNode, type Ref } from "react";
import { Avatar, type AvatarTheme } from "../Avatar";
import { DockIcon, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { typographyStyles } from "../../tokens/typography.generated";
import type { CalendarColor } from "../Calendar";
import "./timeline.css";
import "../Icon/core";

const join = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/** A marker's tone is status, never decoration: Accent the current or newest, Positive done / approved, Warning waiting /
 * due, Negative rejected / failed. */
export type TimelineTone = "neutral" | "accent" | "positive" | "warning" | "negative";

/* ── .Primitives/Timeline/Marker (16130:55) ──────────────────────────────────────────────────────────────────────── */

/** Dock-Icon themes and default icons per tone (Figma Marker Type=Icon). */
const ICON_TONE: Record<TimelineTone, { theme: DockIconTheme; icon: IconName }> = {
  neutral: { theme: "neutral", icon: "icon-edit-02-line" },
  accent: { theme: "accent", icon: "icon-message-chat-circle-line" },
  positive: { theme: "green", icon: "icon-check-line" },
  warning: { theme: "orange", icon: "icon-clock-line" },
  negative: { theme: "red", icon: "icon-flag-01-line" },
};

export interface TimelineMarkerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Figma Type: `dot` (10px; Neutral is hollow), `icon` (Dock-Icon XSmall, Subtle) or `avatar` (Avatar XSmall, one
   * initial). Avatar when a person did it, Icon when the system did, Dot in compact logs. */
  type?: "dot" | "icon" | "avatar";
  /** Figma Tone (status, not decoration). Default neutral. */
  tone?: TimelineTone;
  /** Type=Icon: the icon (default the tone's: edit, message, check, clock, flag). */
  icon?: IconName;
  /** Type=Avatar: the person's name (its initial) and photo. */
  avatarName?: string;
  avatarSrc?: string;
  /** Type=Avatar without a photo: the initial's theme (default teal). */
  avatarTheme?: Exclude<AvatarTheme, "photo">;
  /** Figma instance overrides of the Dock-Icon / Avatar it draws (`{ "Icon": { theme: "blue" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Figma `.Primitives/Timeline/Marker` (16130:55): the 24px marker on a timeline rail. Dot: 10px —
 * `Color/Background/<Tone>/Solid/Default`, Neutral a Surface dot with a 2px Border/Neutral/Solid ring. Icon: Dock-Icon
 * XSmall Subtle (Neutral, Accent, Green, Orange, Red). Avatar: Avatar/Single XSmall Subtle. Decorative: the item says what
 * happened.
 */
export function TimelineMarker({ type = "dot", tone = "neutral", icon, avatarName = "", avatarSrc, avatarTheme = "teal", overrides, className, ref, ...rest }: TimelineMarkerProps) {
  const nest = useNested(overrides);
  return (
    <span {...rest} ref={ref} className={join("zen-timeline-marker", className)} data-type={type} data-tone={tone} aria-hidden="true">
      {type === "icon" ? nest("Icon", <DockIcon size="xs" theme={ICON_TONE[tone].theme} background="subtle" icon={icon ?? ICON_TONE[tone].icon} />)
        : type === "avatar" ? nest("Avatar", <Avatar size="xs" src={avatarSrc} theme={avatarSrc ? "photo" : avatarTheme} background="subtle" alt={avatarName} />)
        : <i className="zen-timeline-marker__dot" />}
    </span>
  );
}

/* ── Timeline/Item (16131:1090) ──────────────────────────────────────────────────────────────────────────────────── */

const itemSizes = ["medium", "small"] as const;

/**
 * A marker as data (TimelineItem `marker`, TimelineActivity entries): `kind` is the marker's Figma Type. A data object
 * says `kind`, not `type`: an object with a string `type` reads as a component node in an AI UI spec.
 */
export interface TimelineMarkerData extends Pick<TimelineMarkerProps, "tone" | "icon" | "avatarName" | "avatarSrc" | "avatarTheme"> {
  /** Figma Type: `dot`, `icon` or `avatar`. */
  kind?: TimelineMarkerProps["type"];
}

export interface TimelineItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The actor, in Body/Small/Bold ("Maya Chen"). */
  actor?: ReactNode;
  /** What happened, after the actor (" approved your leave request"). */
  title: ReactNode;
  /** Figma Time ("10:42"). */
  time?: ReactNode;
  /** Figma Description + Detail: one line of detail ("Annual leave · Oct 12 – Oct 16"). */
  description?: ReactNode;
  /** Figma Attachment + Attachment-Slot: a comment, a file, a change. A string draws the comment box (Surface/Alt,
   * Padding/Small, Corner-Radius/Base); pass a node for your own. */
  attachment?: ReactNode;
  /** Figma Connector: the rail down to the next item (off on a group's last item). Default true. */
  connector?: boolean;
  /** Figma Size: `md` (24px marker, Large after each item, default) or `sm` (Small after; a Dot marker suits it). */
  size?: "md" | "sm" | "medium" | "small";
  /** The marker (Kind = Figma Type, Tone, icon, avatar). Default: Icon Accent (Medium), Dot Neutral (Small). */
  marker?: TimelineMarkerData;
  /** Figma instance overrides of the marker (`{ "Marker": { tone: "positive" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Timeline/Item` (16131:1090): one entry of an activity history — a 24px rail (the marker, then a 2px
 * Border/Neutral/Subtle connector, Gap/2XSmall), then the body (Padding-top 3XSmall, Padding-bottom Large / Small,
 * Gap/2XSmall): the actor in Body/Small/Bold and what they did in Body/Small/Regular (Strongest) beside the time
 * (Caption/Regular Light, Gap/XSmall), an optional detail (Body/Small/Regular Base) and attachment. Gap/Small (Small:
 * XSmall) between rail and body.
 */
export function TimelineItem({ actor, title, time, description, attachment, connector = true, size: sizeProp = "md", marker, overrides, className, ref, ...rest }: TimelineItemProps) {
  const nest = useNested(overrides);
  const size = scaleKey(sizeProp, itemSizes);
  const { kind, ...look }: TimelineMarkerData = marker ?? (size === "small" ? { kind: "dot", tone: "neutral" } : { kind: "icon", tone: "accent" });
  return (
    <div {...rest} ref={ref} className={join("zen-timeline-item", className)} data-size={size}>
      <span className="zen-timeline-item__rail">
        {nest("Marker", <TimelineMarker type={kind} {...look} />)}
        {connector ? <b className="zen-timeline-item__connector" aria-hidden="true" /> : null}
      </span>
      <span className="zen-timeline-item__body">
        <span className="zen-timeline-item__header">
          <span className={join("zen-timeline-item__title", typographyStyles["Body/Small/Regular"])}>
            {actor ? <strong className={typographyStyles["Body/Small/Bold"]}>{actor}</strong> : null}{actor ? " " : null}{title}
          </span>
          {time ? <span className={join("zen-timeline-item__time", typographyStyles["Caption/Regular"])}>{time}</span> : null}
        </span>
        {description ? <span className={join("zen-timeline-item__description", typographyStyles["Body/Small/Regular"])}>{description}</span> : null}
        {attachment ? (typeof attachment === "string"
          ? <span className={join("zen-timeline-item__comment", typographyStyles["Body/Small/Regular"])}>{attachment}</span>
          : <span className="zen-timeline-item__attachment">{nest.slot(attachment)}</span>) : null}
      </span>
    </div>
  );
}

/* ── .Primitives/Timeline/Milestone (16130:147) ──────────────────────────────────────────────────────────────────── */

export interface TimelineMilestoneProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Figma Date ("Sep 25"). */
  date: ReactNode;
  /** Figma Title ("Design sign-off"). */
  title: ReactNode;
  /** Figma Description: one line of detail (shown on the Current milestone). */
  description?: ReactNode;
  /** Figma Status: `done` (Accent dot and connector), `current` (Accent ring, Accent date, bold title) or `upcoming`
   * (a hollow neutral dot). */
  status?: "done" | "current" | "upcoming";
  /** Figma Orientation: `horizontal` (marker and connector above the text; desktop) or `vertical` (the rail on the left;
   * phones). Default horizontal. */
  orientation?: "horizontal" | "vertical";
  /** Figma Connector (off on the last milestone). Default true. */
  connector?: boolean;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `.Primitives/Timeline/Milestone` (16130:147): one dated milestone. Horizontal: an axis (a 16px marker box, then a
 * 2px connector, Gap/2XSmall) over the content (Padding-right Small, Gap/3XSmall), Gap/XSmall. Vertical: a 16px rail
 * (Padding-top 3XSmall) beside the content (Padding-bottom Large), Gap/Small. Date Caption/Medium (Current Accent/Base,
 * else Neutral/Light), Title Body/Small/Medium (Current Bold) Strongest, Description Caption/Regular Light. Markers as the
 * Itinerary's: Done Accent dot, Current a 16px Accent ring, Upcoming a hollow Neutral/Solid ring; connectors Accent after
 * Done, Border/Neutral/Subtle otherwise.
 */
export function TimelineMilestone({ date, title, description, status = "upcoming", orientation = "horizontal", connector = true, className, ref, ...rest }: TimelineMilestoneProps) {
  return (
    <div {...rest} ref={ref} className={join("zen-timeline-milestone", className)} data-status={status} data-orientation={orientation} aria-current={status === "current" ? "step" : undefined}>
      <span className="zen-timeline-milestone__axis" aria-hidden="true">
        <span className="zen-timeline-milestone__marker-box"><i className="zen-timeline-milestone__marker" /></span>
        {connector ? <b className="zen-timeline-milestone__connector" /> : null}
      </span>
      <span className="zen-timeline-milestone__content">
        <span className={join("zen-timeline-milestone__date", typographyStyles["Caption/Medium"])}>{date}</span>
        <span className={join("zen-timeline-milestone__title", typographyStyles[status === "current" ? "Body/Small/Bold" : "Body/Small/Medium"])}>{title}</span>
        {description ? <span className={join("zen-timeline-milestone__description", typographyStyles["Caption/Regular"])}>{description}</span> : null}
      </span>
    </div>
  );
}

/* ── .Primitives/Timeline/Gantt-Bar (16130:77) ───────────────────────────────────────────────────────────────────── */

export interface TimelineGanttBarProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "color"> {
  /** Figma Title (inside a task, beside a milestone; a summary shows none). */
  title: ReactNode;
  /** Figma Kind: `task` (Subtle hue with a Solid leading rule, the title inside), `summary` (a group's span: an 8px
   * Neutral bar) or `milestone` (an Accent diamond with the title beside it). */
  kind?: "task" | "summary" | "milestone";
  /** Figma Color for tasks: the workstream (default brand). */
  color?: CalendarColor;
  /** Hide a milestone's title (the phone Gantt shows it in the task column only). */
  hideTitle?: boolean;
  /** Pressing the bar (open the task). Without it the bar is static. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Ref to the root element (a `<button>` when pressable, else a `<div>`). */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma `.Primitives/Timeline/Gantt-Bar` (16130:77), 28px high. Task: Padding 2XSmall · XSmall, Corner-Radius/XSmall,
 * `Color/Background/Support/<Hue>/Subtle` with a 2px `Color/Border/Support/<Hue>/Solid` leading rule, the title in
 * Caption/Bold Strongest (one line). Summary: an 8px Corner-Radius/2XSmall `Color/Background/Neutral/Solid/Default` bar.
 * Milestone: an 11px Accent/Solid square turned 45° in a 16px box, the title (Caption/Bold Strongest) Gap/XSmall after it.
 */
export function TimelineGanttBar({ title, kind = "task", color = "brand", hideTitle = false, onClick, className, ref, ...rest }: TimelineGanttBarProps) {
  const content = kind === "summary" ? <i className="zen-timeline-bar__summary" aria-hidden="true" />
    : kind === "milestone" ? <><span className="zen-timeline-bar__diamond" aria-hidden="true"><i /></span>{hideTitle ? null : <span className={join("zen-timeline-bar__title", typographyStyles["Caption/Bold"])}>{title}</span>}</>
    : <span className={join("zen-timeline-bar__title", typographyStyles["Caption/Bold"])}>{title}</span>;
  const shared = { className: join("zen-timeline-bar", className), "data-kind": kind, "data-color": color };
  return onClick
    ? <button {...rest} {...shared} ref={ref as Ref<HTMLButtonElement>} type="button" onClick={onClick}>{content}</button>
    : <div {...(rest as HTMLAttributes<HTMLDivElement>)} {...shared} ref={ref as Ref<HTMLDivElement>}>{content}</div>;
}

/* ── .Primitives/Timeline/Gantt-Label (16130:90) ─────────────────────────────────────────────────────────────────── */

export interface TimelineGanttLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Figma Name. One line, truncated. */
  name: ReactNode;
  /** Figma Level: `group` (a chevron and Body/Small/Bold; collapses its tasks) or `task` (indented 32, Body/Small/Regular,
   * the assignee). */
  level?: "group" | "task";
  /** Figma Assignee (task): the person, as an Avatar XSmall. */
  assignee?: { src?: string; alt?: string };
  /** Group: whether its tasks show (the chevron points down). With `onToggle` the label is a disclosure button. */
  expanded?: boolean;
  /** Group: show or hide its tasks. */
  onToggle?: () => void;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** Figma `.Primitives/Timeline/Gantt-Label` (16130:90): a 44px row of the Gantt's task column with a Pale rule below —
 * Group: Padding 0 · Small, Gap/XSmall, icon-chevron-down-line, Body/Small/Bold; Task: 32 from the left, Body/Small/Regular
 * and the assignee's Avatar XSmall. */
export function TimelineGanttLabel({ name, level = "task", assignee, expanded = true, onToggle, className, ref, ...rest }: TimelineGanttLabelProps) {
  const text = <span className={join("zen-timeline-label__name", typographyStyles[level === "group" ? "Body/Small/Bold" : "Body/Small/Regular"])}>{name}</span>;
  return (
    <div {...rest} ref={ref} className={join("zen-timeline-label", className)} data-level={level} data-expanded={level === "group" ? expanded : undefined}>
      {level === "group"
        ? onToggle
          ? <button type="button" className="zen-timeline-label__toggle" aria-expanded={expanded} onClick={onToggle}><Icon name="icon-chevron-down-line" size="md" decorative className="zen-timeline-label__chevron" />{text}</button>
          : <><Icon name="icon-chevron-down-line" size="md" decorative className="zen-timeline-label__chevron" />{text}</>
        : <>{text}{assignee ? <Avatar size="xs" src={assignee.src} theme={assignee.src ? "photo" : "blue"} background="subtle" alt={assignee.alt ?? ""} /> : null}</>}
    </div>
  );
}
