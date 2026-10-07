/**
 * `@zen/design-system/icons/all` — registers every Zen icon up front, so no <Icon> ever waits for a lazy bucket.
 * For docs sites, icon pickers and galleries. Apps normally skip it: icons they render load on demand.
 */
import { registerIcons } from "../components/Icon/registry";
import { iconData } from "./generated/all";
import type { IconDefinition, IconName } from "./generated/names";

registerIcons(iconData);

export { iconData };
export { iconNames, type IconColorMode, type IconDefinition, type IconName } from "./generated/names";
export const getIconData = (name: IconName): IconDefinition | undefined => iconData[name];
