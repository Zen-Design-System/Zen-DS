import { useMemo, type ReactNode } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./avatar.css";

export const avatarSizes = ["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"] as const;
export const avatarThemes = ["photo", "accent", "blue", "brown", "crimson", "cyan", "green", "indigo", "neutral", "orange", "pink", "plum", "purple", "red", "teal", "violet", "yellow"] as const;
export type AvatarSize = (typeof avatarSizes)[number];
export type AvatarTheme = (typeof avatarThemes)[number];
export type AvatarShape = "circle" | "square";
export type AvatarBackground = "solid" | "subtle";

/** Figma Avatar/Single label text style per size. */
const initialsStyle: Record<AvatarSize, TypographyStyleName> = {
  "2xsmall": "Caption/Medium",
  xsmall: "Caption/Medium",
  small: "Body/Base/Medium",
  medium: "Heading/Subheading",
  large: "Heading/4",
  xlarge: "Heading/4",
  "2xlarge": "Heading/3",
  "3xlarge": "Display/4",
};

export interface AvatarProps {
  size?: AvatarSize;
  theme?: AvatarTheme;
  background?: AvatarBackground;
  shape?: AvatarShape;
  status?: boolean;
  focus?: boolean;
  src?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
}

export function Avatar({ size = "medium", theme = "neutral", background = "solid", shape = "circle", status = false, focus = false, src, alt = "", children, className }: AvatarProps) {
  // Initials: up to two characters; XSmall and 2XSmall show a single one.
  const initials = useMemo(() => {
    const limit = size === "2xsmall" || size === "xsmall" ? 1 : 2;
    if (typeof children === "string" || typeof children === "number") return Array.from(String(children).trim()).slice(0, limit).join("").toUpperCase() || "?";
    if (children) return children;
    const generated = alt.split(/\s+/).filter(Boolean).slice(0, limit).map((part) => Array.from(part)[0]).join("").toUpperCase();
    return generated || "?";
  }, [alt, children, size]);
  return (
    <span className={["zen-avatar", className].filter(Boolean).join(" ")} data-size={size} data-theme={theme} data-background={background} data-shape={shape} data-focus={focus ? "true" : "false"}>
      <span className="zen-avatar__inner">
        {src ? <img src={src} alt={alt} /> : <span className={`zen-avatar__initials ${typographyStyles[initialsStyle[size]]}`}>{initials}</span>}
      </span>
      {status ? <span className="zen-avatar__status" aria-label="Online" /> : null}
    </span>
  );
}

export interface AvatarStackProps extends Omit<AvatarProps, "children" | "alt" | "src"> {
  items: Array<Pick<AvatarProps, "src" | "alt" | "children" | "theme">>;
  max?: number;
  showMore?: boolean;
}

/** Figma Avatar/Stack: 1–5 avatars, first on top, no overflow chip (`showMore` is an opt-in extension). */
export function AvatarStack({ items, max = 5, showMore = false, size = "medium", ...props }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const remaining = items.length - visible.length;
  return <span className="zen-avatar-stack" data-size={size}>{visible.map((item, index) => <Avatar key={`${item.alt ?? "avatar"}-${index}`} {...props} {...item} size={size} className="zen-avatar-stack__item" />)}{showMore && remaining > 0 ? <Avatar {...props} size={size} theme="neutral" background="subtle" className="zen-avatar-stack__item">+{remaining}</Avatar> : null}</span>;
}
