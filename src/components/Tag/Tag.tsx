import type { HTMLAttributes, ReactNode } from "react";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tag.css";

export const tagStates = ["default", "hover", "focused", "error", "disabled"] as const;
export type TagState = (typeof tagStates)[number];
export type TagTheme = "text-only" | "leading-icon" | "leading-photo";

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  /** Leading icon (Theme=Leading-Icon). */
  leading?: ReactNode;
  /** Leading photo (Theme=Leading-Photo) rendered as Avatar 2XSmall. */
  photoSrc?: string;
  /** Deterministic Figma State for matrices; hover and keyboard focus also apply natively. */
  state?: TagState;
  error?: boolean;
  disabled?: boolean;
  /** Figma Remove=Yes: trailing icon-x-circle-solid button. */
  remove?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Figma Tag (288:32046): Medium only — Theme × State × Remove. */
export function Tag({ children, leading, photoSrc, state, error = false, disabled = false, remove = false, onRemove, removeLabel, className, ...props }: TagProps) {
  const theme: TagTheme = photoSrc ? "leading-photo" : leading ? "leading-icon" : "text-only";
  const resolvedState: TagState = disabled ? "disabled" : error ? "error" : state ?? "default";
  return (
    <span {...props} className={["zen-tag", className].filter(Boolean).join(" ")} data-theme={theme} data-state={resolvedState} aria-disabled={disabled || undefined}>
      {photoSrc ? <span className="zen-tag__photo"><Avatar size="2xsmall" theme="photo" background="subtle" src={photoSrc} alt="" /></span> : null}
      {!photoSrc && leading ? <span className="zen-tag__leading" aria-hidden="true">{leading}</span> : null}
      <span className={`zen-tag__label ${typographyStyles["Body/Base/Medium"]}`}>{children}</span>
      {remove ? (
        <button className="zen-tag__remove" type="button" disabled={disabled} aria-label={removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove")} onClick={onRemove}>
          <Icon name="icon-x-circle-solid" decorative />
        </button>
      ) : null}
    </span>
  );
}
