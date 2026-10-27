import type { IconName } from "../../../components/Icon";
import { studioStore } from "../store";
import type { StudioPreviewSettings } from "../types";
import { tokenModeNames, tokenModes } from "../../../tokens/modes.generated";

/* Preview modes of the canvas (the classic topbar's shellControlDefinitions, which PlatformTemplate does not export).
   The one option source for every place that names them: the toolbar Modes popover (the control surface) and the
   Inspector's summary. Labels are sentence case: Mode, Component theme, Component size, Typography, Corner radius,
   Emphasis, Contrast. */

export type ModeKey = keyof StudioPreviewSettings;

/** An axis's modes from the tokens (src/tokens/modes.generated.ts), Figma's names as labels; the Studio's own `studio`
 *  mode (its chrome's) is not a preview choice. */
const modesOf = (axis: keyof typeof tokenModes) => tokenModes[axis].filter((id) => id !== "studio").map((id) => ({ id, label: (tokenModeNames[axis] as Record<string, string>)[id] ?? id }));

export const previewModeDefinitions: ReadonlyArray<{ key: ModeKey; label: string; icon: IconName; values: ReadonlyArray<{ id: string; label: string }> }> = [
  { key: "theme", label: "Mode", icon: "icon-sun-line", values: modesOf("theme") },
  { key: "componentTheme", label: "Component theme", icon: "icon-colors-line", values: modesOf("componentTheme") },
  { key: "density", label: "Component size", icon: "icon-ruler-line", values: modesOf("density") },
  { key: "typography", label: "Typography", icon: "icon-type-01-line", values: modesOf("typography") },
  { key: "radius", label: "Corner radius", icon: "icon-maximize-02-line", values: modesOf("radius") },
  { key: "emphasis", label: "Emphasis", icon: "icon-sliders-02-line", values: modesOf("emphasis") },
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
 * Light or dark for the Studio's own panels and chrome (Zen Studio menu › Dark mode, Quick actions), as Figma's theme
 * setting: the frames keep the Mode chosen in Preview modes (user, 2026-10-27, UX review §2.9; before that the canvas's
 * Mode changed with it). `setPreviewTheme` is the canvas's Mode (Preview modes › Mode in Present and Play); a frame that
 * should differ takes its own theme (frame toolbar, Frame panel).
 */
export function setStudioTheme(theme: "light" | "dark") {
  studioStore.setState((state) => (state.chromeTheme === theme ? state : { chromeTheme: theme }));
}

/** The frames' Mode (Preview modes): the design's light or dark, apart from the chrome's. */
export function setPreviewTheme(theme: "light" | "dark") {
  studioStore.setState((state) => (state.preview.theme === theme ? state : { preview: { ...state.preview, theme } }));
}

export function toggleStudioTheme() {
  setStudioTheme(studioStore.getState().chromeTheme === "dark" ? "light" : "dark");
}

/** The data-* attributes that put a subtree in the preview modes (the world, the overlay portal, Present). `brand`: a
 *  Studio project's Base Colors mode ("p-<id>", project/activeProject.ts), else Zen's. */
export function previewAttributes(preview: StudioPreviewSettings, brand = "zen") {
  return {
    "data-brand": brand,
    "data-theme": preview.theme,
    "data-component-theme": preview.componentTheme,
    "data-density": preview.density,
    "data-radius": preview.radius,
    "data-emphasis": preview.emphasis,
    "data-contrast": preview.contrast ?? "standard",
    "data-typography": preview.typography,
  } as const;
}
