import { h, type VNodeChild } from "vue";
import type { ContentTone, IconName, IconSize } from "@zen-ds/core";
import { Icon } from "../components/Icon/Icon";
import { slotContent } from "./slots";

const iconNamePattern = /^(icon|ic)-[a-z0-9-]+$/;

type IconPartProps = { size?: IconSize | number | string; tone?: ContentTone; class?: unknown };

/**
 * An icon prop (React: _shared/icon.tsx renderIcon). Every Zen prop that shows an icon takes an icon name —
 * `start-icon="icon-plus-line"` draws `<Icon name="icon-plus-line" decorative />` — or, in Vue, a slot of the same name
 * with any content (`<template #startIcon><Icon … /></template>`), which wins. Named icons are decorative: the control
 * that holds them carries the accessible name.
 */
export function iconPart(slot: (() => VNodeChild) | undefined, icon: IconName | string | undefined, props?: IconPartProps): VNodeChild {
  const content = slotContent(slot);
  if (content) return content;
  if (typeof icon === "string" && iconNamePattern.test(icon)) return h(Icon, { name: icon as IconName, decorative: true, ...props });
  return icon;
}
