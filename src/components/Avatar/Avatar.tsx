import { useMemo, type ReactNode, type Ref } from "react";
import { scaleKey } from "../_shared/scale";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./avatar.css";
import { dataAttributes } from "../_shared/data-attributes";

export const avatarSizes = ["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"] as const;
export const avatarThemes = ["photo", "accent", "blue", "brown", "crimson", "cyan", "green", "indigo", "neutral", "orange", "pink", "plum", "purple", "red", "teal", "violet", "yellow", "sky", "mint", "bronze", "golden"] as const;
/** CSS / Figma key (the `data-size` value). */
type AvatarSizeKey = (typeof avatarSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AvatarSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "2xsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge" | "3xlarge";
export type AvatarTheme = (typeof avatarThemes)[number];
export type AvatarShape = "circle" | "square";
export type AvatarBackground = "solid" | "subtle";
/** Figma .Primitives/Avatar/Status Status axis (217:7418). */
export const avatarStatuses = ["active", "disabled", "pending", "inactive"] as const;
export type AvatarStatusValue = (typeof avatarStatuses)[number];
export const avatarStatusSizes = ["xsmall", "small", "medium", "large"] as const;
/** Short (xs, sm, md, lg) or Figma (xsmall … large) spelling. */
export type AvatarStatusSize = "xs" | "sm" | "md" | "lg" | "xsmall" | "small" | "medium" | "large";

/** Figma Avatar/Single label text style per size. */
const initialsStyle: Record<AvatarSizeKey, TypographyStyleName> = {
  "2xsmall": "Caption/Medium",
  xsmall: "Caption/Medium",
  small: "Body/Base/Medium",
  medium: "Body/Extra/Medium",
  large: "Heading/4",
  xlarge: "Heading/4",
  "2xlarge": "Heading/3",
  "3xlarge": "Display/4",
};

export interface AvatarProps {
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: AvatarSize;
  theme?: AvatarTheme;
  background?: AvatarBackground;
  shape?: AvatarShape;
  /**
   * The status dot (Figma Avatar/Single Status + .Primitives/Avatar/Status 217:7418) at the bottom-right: `true` or
   * `"active"` (Positive, read as "Online"), `"disabled"` (Solid-Disabled), `"pending"` (Warning) or `"inactive"`
   * (Negative). Its size follows the avatar (Small on 2XSmall–Large, Medium on XLarge, Large on 2XLarge / 3XLarge). The
   * dot is never the only signal: say the status in text beside the avatar too.
   */
  status?: boolean | AvatarStatusValue;
  focus?: boolean;
  src?: string;
  /**
   * The person's name. With `src` it is the photo's alt text; without it the initials avatar is named by it (`role="img"`,
   * `aria-label`), so screen readers say "Ava Chen", not "AC" (an AvatarStack of initials reads names). `alt=""` makes the
   * avatar decorative: use it only when the name is shown next to it.
   */
  alt?: string;
  children?: ReactNode;
  className?: string;
  /** Forwarded to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/** The dot size Figma Avatar/Single puts on each avatar size. */
const statusDotSize: Record<AvatarSizeKey, (typeof avatarStatusSizes)[number]> = {
  "2xsmall": "small",
  xsmall: "small",
  small: "small",
  medium: "small",
  large: "small",
  xlarge: "medium",
  "2xlarge": "large",
  "3xlarge": "large",
};

export interface AvatarStatusProps {
  /** Figma Status: Active (Positive) · Disabled (Solid-Disabled) · Pending (Warning) · Inactive (Negative). */
  status?: AvatarStatusValue;
  /** Figma Size: XSmall 4px with a 1px ring · Small 8/2 · Medium 12/2 · Large 16/3. Short or Figma spelling. */
  size?: AvatarStatusSize;
  /** What a screen reader says. Default: the status word from the labels ("Online", "Disabled", "Pending", "Inactive"). */
  label?: string;
  /** Hide the dot from assistive technology when the status is said in text beside it. */
  decorative?: boolean;
  className?: string;
  /** Forwarded to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Figma .Primitives/Avatar/Status (217:7418): a Corner-Radius/Rounded dot with an OUTSIDE Color/Border/Inverse ring, on
 * its own (a presence mark beside a name) or as an Avatar's `status`. Fills: Color/Background/Positive/Solid/Default,
 * Solid-Disabled, Warning/Solid/Default, Negative/Solid/Default.
 */
export function AvatarStatus({ status = "active", size: sizeProp = "sm", label, decorative = false, className, ref, ...rest }: AvatarStatusProps) {
  const t = useZenLabels();
  const size = scaleKey(sizeProp, avatarStatusSizes);
  const word = label ?? statusWord(t, status);
  return <span {...dataAttributes(rest)} ref={ref} className={["zen-avatar-status", className].filter(Boolean).join(" ")} data-size={size} data-status={status} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : word} aria-hidden={decorative ? true : undefined} />;
}

function statusWord(t: ReturnType<typeof useZenLabels>, status: AvatarStatusValue) {
  return status === "disabled" ? t.statusDisabled : status === "pending" ? t.statusPending : status === "inactive" ? t.statusInactive : t.online;
}

/** Figma Avatar/Single (Medium 223:8784 … 3XLarge 223:8714): photo or initials on the theme fill, optional status dot. */
export function Avatar({ size: sizeProp = "md", theme = "neutral", background = "solid", shape = "circle", status = false, focus = false, src, alt = "", children, className, ref, ...rest }: AvatarProps) {
  const t = useZenLabels();
  const size = scaleKey(sizeProp, avatarSizes);
  // Initials: up to two characters; XSmall and 2XSmall show a single one.
  const initials = useMemo(() => {
    const limit = size === "2xsmall" || size === "xsmall" ? 1 : 2;
    if (typeof children === "string" || typeof children === "number") return Array.from(String(children).trim()).slice(0, limit).join("").toUpperCase() || "?";
    if (children) return children;
    const generated = alt.split(/\s+/).filter(Boolean).slice(0, limit).map((part) => Array.from(part)[0]).join("").toUpperCase();
    return generated || "?";
  }, [alt, children, size]);
  // Initials (no src): a named avatar is one image called `alt` (its status joins the name, since an image's children are
  // not read); alt="" hides the initials, as an empty alt hides a photo.
  const name = alt.trim();
  const named = !src && Boolean(name);
  const statusValue: AvatarStatusValue | null = status === true ? "active" : status || null;
  return (
    <span {...dataAttributes(rest)} ref={ref} className={["zen-avatar", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={background} data-shape={shape} data-focus={focus ? "true" : "false"}
      role={named ? "img" : undefined} aria-label={named ? [name, statusValue ? statusWord(t, statusValue) : null].filter(Boolean).join(", ") : undefined}>
      <span className="zen-avatar__inner">
        {src ? <img src={src} alt={alt} /> : <span className={`zen-avatar__initials ${typographyStyles[initialsStyle[size]]}`} aria-hidden={named || !name ? true : undefined}>{initials}</span>}
      </span>
      {statusValue ? <AvatarStatus className="zen-avatar__status" status={statusValue} size={statusDotSize[size]} decorative={named} /> : null}
    </span>
  );
}

export interface AvatarStackProps extends Omit<AvatarProps, "children" | "alt" | "src"> {
  items: Array<Pick<AvatarProps, "src" | "alt" | "children" | "theme">>;
  max?: number;
  showMore?: boolean;
  /** Figma instance overrides: props of each avatar the stack draws, by layer (`{ "Avatar[0]": { src: "…" } }`, `More`
   *  for the overflow chip). Written by Zen Studio; app code sets `items`. */
  overrides?: NestedOverrides;
}

/** The stack's own attributes (data-*, aria-*, id, className, style, title) go on its root, not on every avatar. */
const STACK_ROOT_PROP = /^(?:data-|aria-)|^(?:id|className|style|title)$/;

/** Figma Avatar/Stack: 1–5 avatars, first on top, no overflow chip (`showMore` is an opt-in extension). */
export function AvatarStack({ items, max = 5, showMore = false, size: sizeProp = "md", overrides, ref, ...rest }: AvatarStackProps) {
  const nest = useNested(overrides);
  const size = scaleKey(sizeProp, avatarSizes);
  const visible = items.slice(0, max);
  const remaining = items.length - visible.length;
  const root: Record<string, unknown> = {};
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(rest)) (STACK_ROOT_PROP.test(name) ? root : props)[name] = value;
  return <span {...root} ref={ref} className={["zen-avatar-stack", root.className].filter(Boolean).join(" ")} data-size={size}>{visible.map((item, index) => nest("Avatar", <Avatar key={`${item.alt ?? "avatar"}-${index}`} {...props} {...item} size={size} className="zen-avatar-stack__item" />, index))}{showMore && remaining > 0 ? nest("More", <Avatar {...props} size={size} theme="neutral" background="subtle" alt={`+${remaining}`} className="zen-avatar-stack__item">+{remaining}</Avatar>) : null}</span>;
}
