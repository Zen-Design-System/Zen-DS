import { useId, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Chip } from "../../components/Chip";
import { SelectField } from "../../components/Input";
import { ToggleButton } from "../../components/Toggle";
import { typographyStyles } from "../../tokens/typography.generated";
import { StudioPanelContext, useStudioBridge, useStudioPanel, useStudioPanelActive } from "../studio/bridge";

/*
 * Playground chrome shared by the component pages (PlatformExamples re-exports it) and the app-layer groups
 * (./shared). A leaf: it imports no platform page, so appLayer/* never imports PlatformExamples. That import cycle
 * (PlatformExamples → PlatformAppLayer → appLayer/* → PlatformExamples) made Vite fully reload the page on every hot
 * update of an app-layer group or a template.
 */

/** Keep component previews on the same Figma token mode as the platform shell. In Zen Studio each preview is one
 * selectable playground: its controls and code move into the inspector while it is the active panel. */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function ComponentPreview({ children, className = "" }: { children: ReactNode; className?: string }) {
  const studio = useStudioBridge();
  const id = useId();
  const active = useStudioPanelActive(id) && Boolean(studio);
  const panel = useMemo(() => studio ? { id, active, controlsSlot: studio.controlsSlot, codeSlot: studio.codeSlot } : null, [studio, id, active]);
  const preview = <div className={`platform-component-preview ${className}`.trim()} data-studio-panel={panel ? id : undefined} data-studio-active={active ? "true" : undefined}>{children}</div>;
  return panel ? <StudioPanelContext value={panel}>{preview}</StudioPanelContext> : preview;
}

/** A playground's property controls (Figma's component properties). Docs: a row above the preview; Zen Studio: the
 * inspector, while this playground is the active panel. */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function PlaygroundControls({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const panel = useStudioPanel();
  const controls = <div {...rest} className={["platform-playground-controls", className].filter(Boolean).join(" ")}>{children}</div>;
  if (!panel) return controls;
  return panel.active && panel.controlsSlot ? createPortal(controls, panel.controlsSlot) : null;
}

type PlaygroundOption = { id: string; label: string };

/** Platform composition for choosing one documented axis without rendering a
 * wall of variants. Single-value axes use the Figma Input/Select-Field owner;
 * multiple-choice axes reuse the production Advanced Chip + Popover owners. */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function PlaygroundFilterChip({
  label,
  value,
  options,
  onChange,
  multiple = false,
}: {
  label: string;
  value: string | string[] | undefined;
  options: PlaygroundOption[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
  const selected = selectedIds.length > 0;
  const selectedLabel = options.find((option) => option.id === selectedIds[0])?.label;
  const displayLabel = multiple ? label : selectedLabel ?? label;
  if (!multiple) {
    return <div className="platform-property-row" data-kind="select">
      <span className="platform-property-row__label">{label}</span>
      <SelectField
        aria-label={label}
        className="platform-property-row__control"
        size="small"
        value={selectedIds[0] ?? options[0]?.id ?? ""}
        onChange={(event) => onChange(event.target.value)}
        options={options.map((option) => ({ value: option.id, label: option.label }))}
      />
    </div>;
  }
  return <div className="platform-property-row" data-kind="select">
    <span className="platform-property-row__label">{label}</span>
    <span className="platform-property-row__chip">
      <Chip
        variant="advanced"
        size="small"
        selectionMode="multiple"
        selectionCount={selectedIds.length}
        select={selected}
        dropdown
        popoverOpen={open}
        onPopoverOpenChange={setOpen}
        popoverMultiple
        popoverItems={options.map((option) => ({ ...option, selected: selectedIds.includes(option.id) }))}
        onPopoverSelect={(option) => onChange(selectedIds.includes(option.id) ? selectedIds.filter((id) => id !== option.id) : [...selectedIds, option.id])}
        onClearSelection={selected ? () => { setOpen(false); onChange([]); } : undefined}
      >
        {displayLabel}
      </Chip>
    </span>
  </div>;
}

// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function PlaygroundToggle({ label, selected, onChange }: { label: string; selected: boolean; onChange: (selected: boolean) => void }) {
  return <div className="platform-property-row" data-kind="boolean">
    <span className="platform-property-row__label">{label}</span>
    <ToggleButton aria-label={label} selected={selected} onSelectedChange={onChange} size="medium" />
  </div>;
}

/** A component's empty Figma slot in a playground: the area it leaves for your own content (the examples fill it). */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function PlaygroundSlot({ name, className }: { name: string; className?: string }) {
  return <div className={["platform-slot", typographyStyles["Body/Small/Medium"], className].filter(Boolean).join(" ")}>{name}</div>;
}
