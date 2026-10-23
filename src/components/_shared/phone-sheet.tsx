import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { Avatar } from "../Avatar";
import type { IconName } from "../../icons/generated/names";
import { renderIcon } from "./icon";
import { useZen } from "./zen-context";

/**
 * Whether a control's list opens as a Bottom Sheet instead of its popover (SelectField, DateField, Menu, Chip; user
 * 2026-10-24: "the same rule SelectField follows"). Figma has no phone popover: on a phone the list is a sheet. The
 * nearest `data-breakpoint` above the control decides (ZenProvider's, or a phone frame that only sets the attribute),
 * else ZenProvider's breakpoint; it is read again whenever the list opens or closes.
 */
export function usePhoneSheet(controlRef: RefObject<HTMLElement | null>, open: boolean): boolean {
  const zenBreakpoint = useZen()?.breakpoint;
  const [domBreakpoint, setDomBreakpoint] = useState<string | null>(null);
  useLayoutEffect(() => {
    setDomBreakpoint(controlRef.current?.parentElement?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") ?? null);
  }, [controlRef, open, zenBreakpoint]);
  return (domBreakpoint ?? zenBreakpoint) === "mobile";
}

/** What leads an option's row in a phone sheet: its icon, else its picture (a photo or an avatar, by its theme). */
export function sheetLeading(option: { leading?: IconName | ReactNode; photoSrc?: string; photoAlt?: string; theme?: string }): ReactNode {
  if (option.leading) return renderIcon(option.leading);
  if (!option.photoSrc) return undefined;
  const avatar = option.theme === "avatar-small" || option.theme === "avatar-big";
  return <Avatar size={option.theme === "avatar-big" || option.theme === "photo-big" ? "medium" : "small"} shape={avatar ? "circle" : "square"} theme="photo" src={option.photoSrc} alt={option.photoAlt ?? ""} />;
}
