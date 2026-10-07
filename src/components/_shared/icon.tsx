import type { ReactNode } from "react";
import { Icon, type IconProps } from "../Icon";
import type { IconName } from "../../icons/generated/names";

const iconNamePattern = /^(icon|ic)-[a-z0-9-]+$/;

/**
 * Render an icon prop. Every Zen prop that shows an icon (IconButton `icon`, Button `startIcon`, Tabs item `icon`…)
 * takes an icon name — `icon="icon-plus-line"` renders `<Icon name="icon-plus-line" />` — or any node (an <Icon> with
 * its own size, a custom SVG). Named icons are decorative: the control that holds them carries the accessible name.
 */
export function renderIcon(icon: IconName | ReactNode | undefined, props?: Omit<IconProps, "name">): ReactNode {
  if (typeof icon === "string" && iconNamePattern.test(icon)) return <Icon name={icon as IconName} decorative {...props} />;
  return icon;
}
