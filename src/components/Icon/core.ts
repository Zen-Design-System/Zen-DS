/**
 * Registers the icons Zen components draw themselves (the core set from `npm run icons:build`: the icon names found in
 * component source). Every component with a built-in icon imports this module for its side effect, so those icons
 * paint on the first frame. It is listed in package.json `sideEffects` so bundlers keep the import;
 * `npm run icons:check` fails when a component names an icon without importing it.
 */
import { coreIcons } from "../../icons/generated/core";
import { registerIcons } from "./registry";

registerIcons(coreIcons);
