import { useEffect, useId, useRef, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { SelectField } from "../../../components/Input";
import { Text } from "../../../components/Text";
import { studioStore, useStudio } from "../store";
import type { StudioPreviewSettings } from "../types";
import { previewModeDefinitions, previewSummary, setStudioTheme, type ModeKey } from "./modes";
import "./shell.css";

/** The mounted toolbar Modes popover's opener (one toolbar per Studio). */
let opener: (() => void) | null = null;

/** Opens the toolbar Modes popover and moves focus to its first field (the Inspector's "Change modes" link uses it). */
export function openModesMenu(): void {
  opener?.();
}

/**
 * Preview modes of the canvas (Mode, Component theme, Component size, Typography, Corner radius, Emphasis): THE control
 * surface for them, a small non-modal panel under the toolbar button, one Select per mode. It closes on Escape (focus
 * back on the button) and on a press outside.
 */
/** `compact`: an icon button (the phone toolbar), same popover. */
export function ModesMenu({ compact = false }: { compact?: boolean } = {}) {
  const preview = useStudio((state) => state.preview);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const open = () => setOpen(true);
    opener = open;
    return () => { if (opener === open) opener = null; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector<HTMLElement>("select, button, input")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <div ref={rootRef} className="studio-modes">
      {compact ? (
        <IconButton
          ref={triggerRef}
          appearance="flat"
          level="primary"
          size="sm"
          aria-label="Preview modes"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? `${id}-panel` : undefined}
          icon={<Icon name="icon-sliders-02-line" />}
          onClick={() => setOpen((value) => !value)}
        />
      ) : (
        <Button
          ref={triggerRef}
          appearance="flat"
          level="primary"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? `${id}-panel` : undefined}
          startIcon={<Icon name="icon-sliders-02-line" decorative />}
          endIcon={<Icon name="icon-chevron-down-line" decorative />}
          onClick={() => setOpen((value) => !value)}
        >
          Modes
        </Button>
      )}
      {open ? (
        <div ref={panelRef} id={`${id}-panel`} className="studio-modes__panel" role="dialog" aria-labelledby={`${id}-title`}>
          <div className="studio-modes__head">
            <Text as="p" id={`${id}-title`} textStyle="Body/Small/Bold">Preview modes</Text>
            <Text as="p" textStyle="Caption/Regular" tone="light">{previewSummary(preview)} · applies to the canvas</Text>
          </div>
          <PreviewModeFields idPrefix={id} />
        </div>
      ) : null}
    </div>
  );
}

/** Sets one preview mode; Mode (light/dark) is the whole Studio's, so the chrome changes with it. */
function setPreviewMode(key: ModeKey, value: string) {
  if (key === "theme") setStudioTheme(value === "dark" ? "dark" : "light");
  else studioStore.setState((state) => ({ preview: { ...state.preview, [key]: value } as StudioPreviewSettings }));
}

/** One labelled Select per preview mode (all of them, or `keys`): the Modes popover and Present's Modes panel. They show
 *  and set the canvas modes, or `values` / `onChange` when given (Present's own modes for the presented screen). */
export function PreviewModeFields({ idPrefix, keys, values, onChange = setPreviewMode }: { idPrefix: string; keys?: ReadonlyArray<ModeKey>; values?: StudioPreviewSettings; onChange?: (key: ModeKey, value: string) => void }) {
  const canvas = useStudio((state) => state.preview);
  const preview = values ?? canvas;
  return (
    <>
      {previewModeDefinitions.filter((mode) => !keys || keys.includes(mode.key)).map((mode) => (
        <div key={mode.key} className="studio-modes__row">
          <Text as="span" id={`${idPrefix}-${mode.key}`} textStyle="Body/Small/Regular" tone="base" className="studio-modes__label">{mode.label}</Text>
          <SelectField
            className="studio-modes__field"
            aria-labelledby={`${idPrefix}-${mode.key}`}
            size="small"
            value={preview[mode.key]}
            options={mode.values.map((value) => ({ value: value.id, label: value.label }))}
            onValueChange={(value) => onChange(mode.key, value)}
          />
        </div>
      ))}
    </>
  );
}
