import { InspectorRow } from "../inspector/Section";
import { RowSelectField } from "../inspector/rowFields";
import { studioStore, useStudio } from "../store";
import type { StudioPreviewSettings } from "../types";
import { previewModeDefinitions, setPreviewTheme, type ModeKey } from "./modes";
import "./shell.css";

/*
 * Preview modes (Mode, Component theme, Component size, Typography, Corner radius, Emphasis, Contrast) change in Play
 * and Present only, in their bar's Modes panel (board/PresentBar); the toolbar keeps light/dark (user, 2026-10-09).
 */

/** Sets one preview mode; Mode (light/dark) is the frames' alone, the chrome keeps its own (Zen Studio menu › Dark mode). */
function setPreviewMode(key: ModeKey, value: string) {
  if (key === "theme") setPreviewTheme(value === "dark" ? "dark" : "light");
  else studioStore.setState((state) => ({ preview: { ...state.preview, [key]: value } as StudioPreviewSettings }));
}

/** One Select per preview mode (all of them, or `keys`) for Present's Modes panel, drawn as the Inspector's rows (an
 *  InspectorRow holding a RowSelectField: Figma's Input/Inline-Field with the mode's name inside, the user 2026-10-16:
 *  "Giao diện không đồng bộ với studio"). They show and set the canvas modes, or `values` / `onChange` when given
 *  (Present's own modes for the presented screen). */
export function PreviewModeFields({ idPrefix, keys, values, onChange = setPreviewMode }: { idPrefix: string; keys?: ReadonlyArray<ModeKey>; values?: StudioPreviewSettings; onChange?: (key: ModeKey, value: string) => void }) {
  const canvas = useStudio((state) => state.preview);
  const preview = values ?? canvas;
  return (
    <>
      {previewModeDefinitions.filter((mode) => !keys || keys.includes(mode.key)).map((mode) => (
        <InspectorRow key={mode.key} label={mode.label} name={mode.key}>
          <RowSelectField
            id={`${idPrefix}-${mode.key}`}
            size="small"
            value={preview[mode.key]}
            options={mode.values.map((value) => ({ value: value.id, label: value.label }))}
            onValueChange={(value) => onChange(mode.key, value)}
          />
        </InspectorRow>
      ))}
    </>
  );
}
