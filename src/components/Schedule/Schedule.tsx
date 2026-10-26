import { type HTMLAttributes, type InputHTMLAttributes, type MouseEventHandler, type ReactNode, type Ref } from "react";
import { Avatar, AvatarStack, type AvatarTheme } from "../Avatar";
import { Badge } from "../Badge";
import { IconButton } from "../Button";
import { DockIcon } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { typographyStyles } from "../../tokens/typography.generated";
import type { CalendarDevice } from "../Calendar";
import type { ScheduleColor } from "./scheduleData";
import "./schedule.css";
import "../Icon/core";

const join = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/* ── .Primitives/Schedule/Resource (16133:1070) ──────────────────────────────────────────────────────────────────── */

export interface ScheduleResourceProps extends HTMLAttributes<HTMLDivElement> {
  /** Figma Name ("Alex Duong"; on mobile a short name, "Alex"). One line, truncated. */
  name: ReactNode;
  /** Figma Meta: a role or a capacity ("Designer", "8 seats"). Desktop only. */
  meta?: ReactNode;
  /** Figma Type: `person` (an Avatar Small with initials or a photo) or `room` (a Dock-Icon Small, Neutral Subtle,
   * building icon: any resource — a room, a vehicle, a device). */
  type?: "person" | "room";
  /** Person: the photo. Without it the Avatar shows the name's initials. */
  avatarSrc?: string;
  /** Person: the initials' theme (Figma exposes it on the Avatar). Default `violet`. */
  avatarTheme?: Exclude<AvatarTheme, "photo">;
  /** Room: the icon (default `icon-building-02-line`). */
  icon?: IconName;
  /** Figma Device: `desktop` (200 wide: name and meta) or `mobile` (64 wide: the avatar over a short name). */
  device?: CalendarDevice;
  /** Figma instance overrides of the Avatar / Dock-Icon it draws (`{ "Avatar": { theme: "teal" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `.Primitives/Schedule/Resource` (16133:1070): the row header of Schedule/Resource-Grid. Desktop: Padding XSmall ·
 * Small, Gap/XSmall, an Avatar/Single Small (Circle, Subtle) or Dock-Icon Small (Neutral Subtle) beside Name
 * (Body/Small/Medium, Strongest) over Meta (Caption/Regular, Light). Mobile: Padding/2XSmall, Gap/2XSmall, the avatar over
 * the name in Caption/Medium, centred.
 */
export function ScheduleResource({ name, meta, type = "person", avatarSrc, avatarTheme = "violet", icon = "icon-building-02-line", device = "desktop", overrides, className, ref, ...rest }: ScheduleResourceProps) {
  const nest = useNested(overrides);
  const mobile = device === "mobile";
  const label = typeof name === "string" ? name : "";
  const visual = type === "room"
    ? nest("Icon", <DockIcon size="sm" theme="neutral" background="subtle" icon={icon} />)
    : nest("Avatar", <Avatar size="sm" src={avatarSrc} theme={avatarSrc ? "photo" : avatarTheme} background="subtle" alt={label} />);
  return (
    <div {...rest} ref={ref} className={join("zen-schedule-resource", className)} data-device={device} data-type={type}>
      <span className="zen-schedule-resource__visual" aria-hidden="true">{visual}</span>
      {mobile
        ? <span className={join("zen-schedule-resource__name", typographyStyles["Caption/Medium"])}>{name}</span>
        : (
          <span className="zen-schedule-resource__text">
            <span className={join("zen-schedule-resource__name", typographyStyles["Body/Small/Medium"])}>{name}</span>
            {meta ? <span className={join("zen-schedule-resource__meta", typographyStyles["Caption/Regular"])}>{meta}</span> : null}
          </span>
        )}
    </div>
  );
}

/* ── .Primitives/Schedule/Slot (16133:1087) ──────────────────────────────────────────────────────────────────────── */

const slotSizes = ["medium", "small"] as const;

export interface ScheduleSlotProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** Figma Time ("10:30"). */
  time: ReactNode;
  /** Figma Size: `md` (Select-Item Medium height; phones and the main picker, default) or `sm`. */
  size?: "md" | "sm" | "medium" | "small";
  /** Figma State=Selected: the chosen time (`checked` of its radio). */
  checked?: boolean;
  /** Figma State=Disabled: taken or past — struck through, never hidden, so the day keeps its rhythm. */
  disabled?: boolean;
  /** Ref to the radio `<input>`. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * Figma `.Primitives/Schedule/Slot` (16133:1087): one bookable time, a radio of the picker's single-choice group, in the
 * Date-Picker day's colours: `--zen-date-picker-item-background-unselected-*` with a 1px Border/Neutral/Subtle (Hover:
 * Subtle/Hover), Selected `--zen-date-picker-item-background-seclected-default` with its Selected content, Disabled a
 * Border/Disabled outline and Content/Disabled struck through. Corner-Radius/Action/Small, Padding 0 · Small, Medium 32
 * (Body/Small/Medium) or Small 24 (Caption/Medium). A native radio inside a label: the arrow keys move within its group.
 */
export function ScheduleSlot({ time, size: sizeProp = "md", checked, disabled, className, style, ref, ...rest }: ScheduleSlotProps) {
  const size = scaleKey(sizeProp, slotSizes);
  return (
    <label className={join("zen-schedule-slot", typographyStyles[size === "small" ? "Caption/Medium" : "Body/Small/Medium"], className)} style={style} data-size={size} data-checked={checked || undefined} data-disabled={disabled || undefined}>
      <input {...rest} ref={ref} className="zen-schedule-slot__input" type="radio" checked={checked} disabled={disabled} />
      <span className="zen-schedule-slot__time">{time}</span>
    </label>
  );
}

/* ── .Primitives/Schedule/Itinerary-Item (16133:1131) ────────────────────────────────────────────────────────────── */

export interface ScheduleItineraryItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Figma Start ("13:00"). */
  start: ReactNode;
  /** Figma Duration ("90 min"). */
  duration?: ReactNode;
  /** Figma Title. */
  title: ReactNode;
  /** Figma Meta: place · who ("Room 2 · Linh Tran"). */
  meta?: ReactNode;
  /** Figma Status: `past` (Accent dot and rail, quiet text), `now` (Accent ring and a Now badge) or `upcoming` (a hollow
   * neutral dot). */
  status?: "past" | "now" | "upcoming";
  /** Figma Connector: the rail down to the next stop (off on the last one). Default true. */
  connector?: boolean;
  /** Figma instance overrides of the Now badge (`{ "Badge": { theme: "positive" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `.Primitives/Schedule/Itinerary-Item` (16133:1131): one stop of a timed plan. Gap/Small between a 56px time column
 * (Start Body/Small/Bold over Duration Caption/Regular Light, Gap/3XSmall), a 16px rail (the marker, then a 2px connector,
 * Padding-top 2XSmall, Gap/2XSmall) and the content (Title Body/Base/Medium, Meta Caption/Regular, Gap/2XSmall,
 * Padding-bottom Large). Past: Accent/Solid dot and connector, Start / Title / Meta quiet (Light, Base, Light). Now: a
 * 16px Surface ring with a 2px Accent/Solid stroke and a 6px Accent dot, a Badge Small Accent Subtle "Now". Upcoming: a 12px
 * Surface dot with a 2px Border/Neutral/Solid stroke. Connectors after Now are Border/Neutral/Subtle.
 */
export function ScheduleItineraryItem({ start, duration, title, meta, status = "upcoming", connector = true, overrides, className, ref, ...rest }: ScheduleItineraryItemProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  return (
    <div {...rest} ref={ref} className={join("zen-schedule-stop", className)} data-status={status} aria-current={status === "now" ? "step" : undefined}>
      <span className="zen-schedule-stop__time">
        <span className={join("zen-schedule-stop__start", typographyStyles["Body/Small/Bold"])}>{start}</span>
        {duration ? <span className={join("zen-schedule-stop__duration", typographyStyles["Caption/Regular"])}>{duration}</span> : null}
      </span>
      <span className="zen-schedule-stop__rail" aria-hidden="true">
        <i className="zen-schedule-stop__marker" />
        {connector ? <b className="zen-schedule-stop__connector" /> : null}
      </span>
      <span className="zen-schedule-stop__content">
        <span className="zen-schedule-stop__header">
          <span className={join("zen-schedule-stop__title", typographyStyles["Body/Base/Medium"])}>{title}</span>
          {status === "now" ? nest("Badge", <Badge size="sm" theme="accent" background="subtle">{t.now}</Badge>) : null}
        </span>
        {meta ? <span className={join("zen-schedule-stop__meta", typographyStyles["Caption/Regular"])}>{meta}</span> : null}
      </span>
    </div>
  );
}

/* ── .Primitives/Schedule/Hour-Label (16143:488) ─────────────────────────────────────────────────────────────────── */

export interface ScheduleHourLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** Figma Hour ("13:00"). */
  hour: ReactNode;
  /** Figma State=Now: the current hour — an Accent Flat pill, Caption/Bold Accent/Strongest. */
  now?: boolean;
  /** Ref to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/** Figma `.Primitives/Schedule/Hour-Label` (16143:488): an hour on the day planner's rail — Padding 3XSmall · XSmall,
 * Corner-Radius/Rounded, Caption/Medium Neutral/Light; Now on `Color/Background/Accent/Flat/Default`. */
export function ScheduleHourLabel({ hour, now = false, className, ref, ...rest }: ScheduleHourLabelProps) {
  return <span {...rest} ref={ref} className={join("zen-schedule-hour", typographyStyles[now ? "Caption/Bold" : "Caption/Medium"], className)} data-now={now || undefined}>{hour}</span>;
}

/* ── .Primitives/Schedule/Event-Card (16143:817) ─────────────────────────────────────────────────────────────────── */

export interface ScheduleEventCardProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "color"> {
  /** Figma Title (two lines, truncated). */
  title: ReactNode;
  /** Figma Status, in words ("Done", "In progress", "Upcoming"): Light; colour stays on the rule. */
  status?: ReactNode;
  /** Figma Time ("13:00 – 16:00"), after the clock icon. */
  time?: ReactNode;
  /** Figma Color: the rule's hue (default brand; `neutral` for personal blocks). */
  color?: ScheduleColor;
  /** Figma Attendees: AvatarStack items (Small, Subtle, up to 3). */
  attendees?: Array<{ src?: string; alt?: string }>;
  /** Figma Note + Note-Text: a Surface/Alt box under the meta. */
  note?: ReactNode;
  /** Figma Menu: the ⋮ (Button/Icon-Flat Small Secondary in a 20px wrapper, the Card Sub-Action). Its name is the
   * locale's "Actions for {title}" unless `menuLabel` says otherwise. Without it the menu is left out. */
  onMenuClick?: MouseEventHandler<HTMLButtonElement>;
  /** The ⋮ button's accessible name. */
  menuLabel?: string;
  /** Figma instance overrides of the menu button and avatars (`{ "Menu": { icon: "icon-dots-horizontal-line" } }`).
   * Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<article>`. */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma `.Primitives/Schedule/Event-Card` (16143:817): an event as a card on the day planner — a Border box
 * (`Color/Background/Surface/Default`, 1px `Color/Border/Neutral/Pale/Default`, Corner-Radius/2XLarge, Padding/Medium, so
 * it reads on Canvas/Default and Canvas/Alt), a 4px rule in `Color/Background/Support/<Hue>/Solid`, then Gap/XSmall: Title
 * (Body/Base/Medium, 2 lines) over Status (Body/Small/Regular, Light) beside the ⋮, the attendees and the time (clock icon,
 * Caption/Medium Neutral/Light), and an optional note (Surface/Alt, Padding/Small, Corner-Radius/Small = 24 − 16).
 */
export function ScheduleEventCard({ title, status, time, color = "brand", attendees, note, onMenuClick, menuLabel, overrides, className, ref, ...rest }: ScheduleEventCardProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const name = menuLabel ?? t.actionsFor(typeof title === "string" ? title : "");
  return (
    <article {...rest} ref={ref} className={join("zen-schedule-card", className)} data-color={color}>
      <span className="zen-schedule-card__rule" aria-hidden="true" />
      <div className="zen-schedule-card__content">
        <div className="zen-schedule-card__header">
          <div className="zen-schedule-card__text">
            <span className={join("zen-schedule-card__title", typographyStyles["Body/Base/Medium"])}>{title}</span>
            {status ? <span className={join("zen-schedule-card__status", typographyStyles["Body/Small/Regular"])}>{status}</span> : null}
          </div>
          {onMenuClick ? <span className="zen-schedule-card__menu">{nest("Menu", <IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={name} onClick={onMenuClick} />)}</span> : null}
        </div>
        {attendees?.length || time ? (
          <div className="zen-schedule-card__meta">
            {attendees?.length ? nest("Attendees", <AvatarStack size="sm" background="subtle" max={3} showMore items={attendees} />) : <span />}
            {time ? <span className={join("zen-schedule-card__time", typographyStyles["Caption/Medium"])}><Icon name="icon-clock-line" size="sm" decorative />{time}</span> : null}
          </div>
        ) : null}
        {note ? <div className={join("zen-schedule-card__note", typographyStyles["Body/Small/Regular"])}>{note}</div> : null}
      </div>
    </article>
  );
}

