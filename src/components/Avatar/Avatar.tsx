import { useMemo, type ReactNode, type Ref } from "react";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels } from "../_shared/zen-context";
import { avatarInitials, avatarModel, avatarSizes, avatarStackModel, avatarStatusModel, isAvatarStackRootProp, type AvatarBackground, type AvatarShape, type AvatarSize, type AvatarStatusSize, type AvatarStatusValue, type AvatarTheme } from "./model";
import { scaleKey } from "../_shared/scale";
import "./avatar.css";
import { dataAttributes } from "../_shared/data-attributes";

export { avatarSizes, avatarStatuses, avatarStatusSizes, avatarThemes, type AvatarBackground, type AvatarShape, type AvatarSize, type AvatarStatusSize, type AvatarStatusValue, type AvatarTheme } from "./model";

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
  return <span {...dataAttributes(rest)} ref={ref} className={["zen-avatar-status", className].filter(Boolean).join(" ")} {...avatarStatusModel({ status, size: sizeProp, label, decorative }, t)} />;
}

/** Figma Avatar/Single (Medium 223:8784 … 3XLarge 223:8714): photo or initials on the theme fill, optional status dot. */
export function Avatar({ size: sizeProp = "md", theme = "neutral", background = "solid", shape = "circle", status = false, focus = false, src, alt = "", children, className, ref, ...rest }: AvatarProps) {
  const t = useZenLabels();
  const avatar = avatarModel({ size: sizeProp, status, src, alt }, t);
  const size = avatar.size;
  // Initials: a text label is cut to its first characters; any other node shows as it is.
  const initials = useMemo(() => {
    if (typeof children === "string" || typeof children === "number") return avatarInitials(size, String(children), alt);
    if (children) return children;
    return avatarInitials(size, undefined, alt);
  }, [alt, children, size]);
  return (
    <span {...dataAttributes(rest)} ref={ref} className={["zen-avatar", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={background} data-shape={shape} data-focus={focus ? "true" : "false"}
      role={avatar.role} aria-label={avatar.ariaLabel}>
      <span className="zen-avatar__inner">
        {src ? <img src={src} alt={alt} /> : <span className={avatar.initialsClass} aria-hidden={avatar.initialsHidden}>{initials}</span>}
      </span>
      {avatar.status ? <AvatarStatus className="zen-avatar__status" status={avatar.status} size={avatar.statusSize} decorative={avatar.named} /> : null}
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

/** Figma Avatar/Stack: 1–5 avatars, first on top, no overflow chip (`showMore` is an opt-in extension). */
export function AvatarStack({ items, max = 5, showMore = false, size: sizeProp = "md", overrides, ref, ...rest }: AvatarStackProps) {
  const nest = useNested(overrides);
  const size = scaleKey(sizeProp, avatarSizes);
  const { visible, remaining } = avatarStackModel(items, max);
  const root: Record<string, unknown> = {};
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(rest)) (isAvatarStackRootProp(name) ? root : props)[name] = value;
  return <span {...root} ref={ref} className={["zen-avatar-stack", root.className].filter(Boolean).join(" ")} data-size={size}>{visible.map((item, index) => nest("Avatar", <Avatar key={`${item.alt ?? "avatar"}-${index}`} {...props} {...item} size={size} className="zen-avatar-stack__item" />, index))}{showMore && remaining > 0 ? nest("More", <Avatar {...props} size={size} theme="neutral" background="subtle" alt={`+${remaining}`} className="zen-avatar-stack__item">+{remaining}</Avatar>) : null}</span>;
}
