import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import type { ZenLabels } from "../_shared/labels";
import { scaleKey } from "../_shared/scale";

/*
 * Avatar's framework-free part (the web core, src/core): sizes, themes, statuses, initials and what the root, the
 * initials and the status dot render. React's Avatar, AvatarStack and AvatarStatus and the Vue port all draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export const avatarSizes = ["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"] as const;
export const avatarThemes = ["photo", "accent", "blue", "brown", "crimson", "cyan", "green", "indigo", "neutral", "orange", "pink", "plum", "purple", "red", "teal", "violet", "yellow", "sky", "mint", "bronze", "golden"] as const;
/** CSS / Figma key (the `data-size` value). */
type AvatarSizeKey = (typeof avatarSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AvatarSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "2xsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge" | "3xlarge";
export type AvatarTheme = (typeof avatarThemes)[number];
export type AvatarShape = "circle" | "square";
export type AvatarBackground = "solid" | "subtle";
/** Figma .Primitives/Avatar/Status Status axis (217:7418). */
export const avatarStatuses = ["active", "disabled", "pending", "inactive"] as const;
export type AvatarStatusValue = (typeof avatarStatuses)[number];
export const avatarStatusSizes = ["xsmall", "small", "medium", "large"] as const;
/** Short (xs, sm, md, lg) or Figma (xsmall … large) spelling. */
export type AvatarStatusSize = "xs" | "sm" | "md" | "lg" | "xsmall" | "small" | "medium" | "large";

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

/** The dot size Figma Avatar/Single puts on each avatar size. */
const statusDotSize: Record<AvatarSizeKey, (typeof avatarStatusSizes)[number]> = {
  "2xsmall": "small",
  xsmall: "small",
  small: "small",
  medium: "small",
  large: "small",
  xlarge: "medium",
  "2xlarge": "large",
  "3xlarge": "large",
};

/** What a screen reader says for a status: "Online", "Disabled", "Pending" or "Inactive" in the locale's words. */
export function avatarStatusWord(labels: ZenLabels, status: AvatarStatusValue) {
  return status === "disabled" ? labels.statusDisabled : status === "pending" ? labels.statusPending : status === "inactive" ? labels.statusInactive : labels.online;
}

/**
 * The initials an avatar shows: up to two characters of a text label (one on XSmall and 2XSmall) or, with no label
 * (`text` undefined), the first letters of the words of `alt`; "?" when that leaves nothing.
 */
export function avatarInitials(size: AvatarSizeKey, text: string | undefined, alt: string) {
  const limit = size === "2xsmall" || size === "xsmall" ? 1 : 2;
  if (text !== undefined) return Array.from(text.trim()).slice(0, limit).join("").toUpperCase() || "?";
  const generated = alt.split(/\s+/).filter(Boolean).slice(0, limit).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return generated || "?";
}

export type AvatarModelInput = { size: AvatarSize; status: boolean | AvatarStatusValue; src?: string; alt: string };

/** The root's `data-size` and accessible name, the initials' class, and the status dot it draws (`status` null: none). */
export function avatarModel({ size: sizeProp, status, src, alt }: AvatarModelInput, labels: ZenLabels) {
  const size = scaleKey(sizeProp, avatarSizes);
  // Initials (no src): a named avatar is one image called `alt` (its status joins the name, since an image's children are
  // not read); alt="" hides the initials, as an empty alt hides a photo.
  const name = alt.trim();
  const named = !src && Boolean(name);
  const statusValue: AvatarStatusValue | null = status === true ? "active" : status || null;
  return {
    size,
    named,
    role: named ? "img" : undefined,
    ariaLabel: named ? [name, statusValue ? avatarStatusWord(labels, statusValue) : null].filter(Boolean).join(", ") : undefined,
    initialsClass: `zen-avatar__initials ${typographyStyles[initialsStyle[size]]}`,
    initialsHidden: named || !name ? true : undefined,
    status: statusValue,
    statusSize: statusDotSize[size],
  };
}

export type AvatarStatusModelInput = { status: AvatarStatusValue; size: AvatarStatusSize; label?: string; decorative: boolean };

/** The status dot's attributes: `data-*`, and its name unless it is decorative. */
export function avatarStatusModel({ status, size, label, decorative }: AvatarStatusModelInput, labels: ZenLabels) {
  const word = label ?? avatarStatusWord(labels, status);
  return {
    "data-size": scaleKey(size, avatarStatusSizes),
    "data-status": status,
    role: decorative ? undefined : "img",
    "aria-label": decorative ? undefined : word,
    "aria-hidden": decorative ? true : undefined,
  };
}

/** The stack's own attributes (data-*, aria-*, id, className, style, title) go on its root, not on every avatar. */
const STACK_ROOT_PROP = /^(?:data-|aria-)|^(?:id|className|style|title)$/;
export const isAvatarStackRootProp = (name: string) => STACK_ROOT_PROP.test(name);

/** The avatars a stack shows (the first `max`) and how many it leaves for the `showMore` chip. */
export function avatarStackModel<T>(items: readonly T[], max: number) {
  const visible = items.slice(0, max);
  return { visible, remaining: items.length - visible.length };
}
