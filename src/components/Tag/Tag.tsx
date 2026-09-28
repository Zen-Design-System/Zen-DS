import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Avatar } from "../Avatar";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tag.css";
import "../Icon/core";

export const tagStates = ["default", "hover", "focused", "error", "disabled"] as const;
export type TagState = (typeof tagStates)[number];
export type TagTheme = "text-only" | "leading-icon" | "leading-photo";

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  /** Leading icon (Theme=Leading-Icon): an icon name (`"icon-tag-line"`) or a node. */
  leading?: IconName | ReactNode;
  /** Leading photo (Theme=Leading-Photo) rendered as Avatar 2XSmall. */
  photoSrc?: string;
  /** Deterministic Figma State for matrices; hover and keyboard focus also apply natively. */
  state?: TagState;
  error?: boolean;
  disabled?: boolean;
  /** Figma Remove=Yes: trailing icon-x-circle-solid button. */
  remove?: boolean;
  onRemove?: () => void;
  /** Name of the remove button (default "Remove" and the tag text, from the locale's labels). */
  removeLabel?: string;
}

/** Figma Tag (288:32046): Medium only — Theme × State × Remove. */
export function Tag({ children, leading, photoSrc, state, error = false, disabled = false, remove = false, onRemove, removeLabel, className, onClick, onKeyDown, ...props }: TagProps) {
  // onClick makes the tag itself an action (filter by it, open it): focusable, Enter / Space activate it.
  const interactive = Boolean(onClick) && !disabled;
  const theme: TagTheme = photoSrc ? "leading-photo" : leading ? "leading-icon" : "text-only";
  const resolvedState: TagState = disabled ? "disabled" : error ? "error" : state ?? "default";
  const t = useZenLabels();
  const removeName = removeLabel ?? (typeof children === "string" ? t.removeItem(children) : t.remove);
  const removeTip = useIconTooltip(remove ? removeName : false);
  return (
    <span {...props} className={["zen-tag", className].filter(Boolean).join(" ")} data-tone={theme} data-state={resolvedState} aria-disabled={disabled || undefined}
      data-interactive={interactive || undefined} role={interactive ? "button" : props.role} tabIndex={interactive ? 0 : props.tabIndex}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event);
        if (interactive && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.currentTarget.click(); }
      }}>
      {photoSrc ? <span className="zen-tag__photo"><Avatar size="2xsmall" theme="photo" background="subtle" src={photoSrc} alt="" /></span> : null}
      {!photoSrc && leading ? <span className="zen-tag__leading" aria-hidden="true">{renderIcon(leading)}</span> : null}
      <span className={`zen-tag__label ${typographyStyles["Body/Base/Medium"]}`}>{children}</span>
      {remove ? (
        <button className="zen-tag__remove" type="button" disabled={disabled} aria-label={removeName} {...removeTip.bind({ onClick: (event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); onRemove?.(); } })}>
          <Icon name="icon-x-circle-solid" decorative />{removeTip.tooltip}
        </button>
      ) : null}
    </span>
  );
}
