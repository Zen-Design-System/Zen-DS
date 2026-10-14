import { useMemo, type ReactNode, type Ref } from "react";
import { scaleKey } from "../_shared/scale";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./avatar.css";

export const avatarSizes = ["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"] as const;
export const avatarThemes = ["photo", "accent", "blue", "brown", "crimson", "cyan", "green", "indigo", "neutral", "orange", "pink", "plum", "purple", "red", "teal", "violet", "yellow", "sky", "mint", "bronze", "golden"] as const;
/** CSS / Figma key (the `data-size` value). */
type AvatarSizeKey = (typeof avatarSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AvatarSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "2xsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge" | "3xlarge";
export type AvatarTheme = (typeof avatarThemes)[number];
export type AvatarShape = "circle" | "square";
export type AvatarBackground = "solid" | "subtle";

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
  status?: boolean;
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

/** Figma Avatar/Single (Medium 223:8784 … 3XLarge 223:8714): photo or initials on the theme fill, optional status dot. */
export function Avatar({ size: sizeProp = "md", theme = "neutral", background = "solid", shape = "circle", status = false, focus = false, src, alt = "", children, className, ref }: AvatarProps) {
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
  return (
    <span ref={ref} className={["zen-avatar", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={background} data-shape={shape} data-focus={focus ? "true" : "false"}
      role={named ? "img" : undefined} aria-label={named ? [name, status ? t.online : null].filter(Boolean).join(", ") : undefined}>
      <span className="zen-avatar__inner">
        {src ? <img src={src} alt={alt} /> : <span className={`zen-avatar__initials ${typographyStyles[initialsStyle[size]]}`} aria-hidden={named || !name ? true : undefined}>{initials}</span>}
      </span>
      {status ? <span className="zen-avatar__status" aria-label={named ? undefined : t.online} /> : null}
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
