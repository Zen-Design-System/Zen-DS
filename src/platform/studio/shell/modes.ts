import type { IconName } from "../../../components/Icon";
import { studioStore } from "../store";
import type { StudioPreviewSettings } from "../types";

/* Preview modes of the canvas (the classic topbar's shellControlDefinitions, which PlatformTemplate does not export).
   The one option source for every place that names them: the toolbar Modes popover (the control surface) and the
   Inspector's summary. Labels are sentence case: Mode, Component theme, Component size, Typography, Corner radius,
   Emphasis, Contrast. */

export type ModeKey = keyof StudioPreviewSettings;

export const previewModeDefinitions: ReadonlyArray<{ key: ModeKey; label: string; icon: IconName; values: ReadonlyArray<{ id: string; label: string }> }> = [
  { key: "theme", label: "Mode", icon: "icon-sun-line", values: [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }] },
  {
    key: "componentTheme",
    label: "Component theme",
    icon: "icon-colors-line",
    values: [
      { id: "neutral-s1", label: "Neutral-S1" },
      { id: "brand-s1", label: "Brand-S1" },
      { id: "neutral-s2", label: "Neutral-S2" },
      { id: "brand-s2", label: "Brand-S2" },
      { id: "neutral-s3", label: "Neutral-S3" },
      { id: "neutral-s4", label: "Neutral-S4" },
      { id: "neutral-s5", label: "Neutral-S5" },
      { id: "neutral-s6", label: "Neutral-S6" },
      { id: "neutral-s7", label: "Neutral-S7" },
    ],
  },
  { key: "density", label: "Component size", icon: "icon-ruler-line", values: [{ id: "compact", label: "Compact" }, { id: "comfortable", label: "Comfortable" }] },
  { key: "typography", label: "Typography", icon: "icon-type-01-line", values: [{ id: "dashboard", label: "Dashboard" }, { id: "popular", label: "Popular" }, { id: "mobile", label: "Mobile" }] },
  { key: "radius", label: "Corner radius", icon: "icon-maximize-02-line", values: [{ id: "rounded", label: "Rounded" }, { id: "smooth", label: "Smooth" }, { id: "standard", label: "Standard" }, { id: "luxury", label: "Luxury" }] },
  { key: "emphasis", label: "Emphasis", icon: "icon-sliders-02-line", values: [{ id: "medium", label: "Medium" }, { id: "strong", label: "Strong" }, { id: "light", label: "Light" }] },
  { key: "contrast", label: "Contrast", icon: "icon-contrast-01-line", values: [{ id: "standard", label: "Standard" }, { id: "high", label: "High" }] },
];

/** "Component size": the name of a mode. */
export const previewModeLabel = (key: ModeKey) => previewModeDefinitions.find((mode) => mode.key === key)?.label ?? key;

/** "Compact": the label of a mode's value. */
export const previewValueLabel = (key: ModeKey, value: string) => previewModeDefinitions.find((mode) => mode.key === key)?.values.find((option) => option.id === value)?.label ?? value;

/** "Light · Neutral-S1 · Compact": the toolbar summary of the current modes. */
export function previewSummary(preview: StudioPreviewSettings) {
  return (["theme", "componentTheme", "density"] as const).map((key) => previewValueLabel(key, preview[key])).join(" · ");
}

/**
 * Light or dark for the whole Studio: the chrome and the canvas's Mode change together (the toolbar sun/moon, Modes ›
 * Mode, Quick actions, Present), so examples and playgrounds never sit light on a dark Studio or the reverse. A frame
 * that should differ takes its own theme (frame toolbar, Frame panel).
 */
export function setStudioTheme(theme: "light" | "dark") {
  studioStore.setState((state) => ({ chromeTheme: theme, preview: state.preview.theme === theme ? state.preview : { ...state.preview, theme } }));
}

export function toggleStudioTheme() {
  setStudioTheme(studioStore.getState().chromeTheme === "dark" ? "light" : "dark");
}

/** The data-* attributes that put a subtree in the preview modes (the world, the overlay portal, Present). */
export function previewAttributes(preview: StudioPreviewSettings) {
  return {
    "data-brand": "zen",
    "data-theme": preview.theme,
    "data-component-theme": preview.componentTheme,
    "data-density": preview.density,
    "data-radius": preview.radius,
    "data-emphasis": preview.emphasis,
    "data-contrast": preview.contrast ?? "standard",
    "data-typography": preview.typography,
  } as const;
}
