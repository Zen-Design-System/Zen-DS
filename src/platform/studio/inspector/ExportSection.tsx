import { useEffect, useState } from "react";
import { Button, IconButton } from "../../../components/Button";
import { SelectField } from "../../../components/Input";
import { plural } from "../../../components/Text";
import { layerPicture, type LayerExportFormat } from "../builder/export/htmlExport";
import { InspectorSection } from "./Section";
import { inspectorStatus } from "./status";

/*
 * Figma UI3's Export section, the last of the Design tab (F5c of docs/research/studio-figma-design-parity-2026-10-18.md):
 * the selected layer's export settings, each a scale and a format; "+" adds one (1x PNG, then the next scale up), "−"
 * removes it, and "Export <layer>" downloads one file per setting, named as Figma names them (the layer, "@2x", the
 * extension). Drawn by htmlExport.ts layerPicture, as the handoff draws its pictures. The settings are this session's,
 * per layer (Figma keeps them in the file).
 */

type ExportSetting = { scale: number; format: LayerExportFormat };

const settingsByLayer = new Map<string, ExportSetting[]>();
/** A layer's export settings this session (`src`, or `frame:<page key>:<frame id>`): ⇧⌘C copies at the first one's scale. */
export const exportSettingsOf = (src: string): readonly ExportSetting[] => settingsByLayer.get(src) ?? [];
const SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4];
const FORMATS: ReadonlyArray<{ value: LayerExportFormat | "pdf"; label: string; disabled?: boolean }> = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "svg", label: "SVG" },
  { value: "pdf", label: "PDF", disabled: true },
];
const EXTENSION: Readonly<Record<LayerExportFormat, string>> = { png: "png", jpg: "jpg", svg: "svg" };

/** "Card@2x.png": the layer's name, Figma's scale suffix (none at 1x), the format's extension. */
export function exportFileName(layer: string, setting: ExportSetting): string {
  const base = layer.trim().replace(/[\\/:*?"<>|]+/g, "-") || "Layer";
  return `${base}${setting.scale === 1 ? "" : `@${setting.scale}x`}.${EXTENSION[setting.format]}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportSection({ src, layer, host }: { src: string; layer: string; host: HTMLElement | null }) {
  const [settings, setSettings] = useState<ExportSetting[]>(() => settingsByLayer.get(src) ?? []);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSettings(settingsByLayer.get(src) ?? []); }, [src]);
  const update = (next: ExportSetting[]) => { settingsByLayer.set(src, next); setSettings(next); };
  const add = () => {
    const last = settings.at(-1);
    update([...settings, { scale: last ? SCALES.find((scale) => scale > last.scale) ?? last.scale : 1, format: last?.format ?? "png" }]);
  };
  const run = async () => {
    if (!host?.isConnected) { inspectorStatus.set("neutral", "The layer is not on the canvas right now"); return; }
    setBusy(true);
    let done = 0;
    const notes: string[] = [];
    try {
      for (const setting of settings) {
        const result = await layerPicture(host, setting);
        if ("error" in result) { notes.push(result.error); continue; }
        notes.push(...result.notes);
        download(result.blob, exportFileName(layer, setting));
        done += 1;
      }
    } finally {
      setBusy(false);
    }
    if (done) inspectorStatus.set("positive", `Exported ${plural(done, "file")}${notes.length ? ` · ${notes[0]}` : ""}`);
    else inspectorStatus.set("negative", `Couldn't export ${layer}. ${notes[0] ?? "Try again"}`);
  };
  return (
    <InspectorSection title="Export" actions={<IconButton icon="icon-plus-line" aria-label="Add export setting" appearance="flat" level="primary" size="xs" onClick={add} />}>
      {settings.map((setting, index) => (
        <div key={index} className="studio-export__row">
          <SelectField
            aria-label="Scale"
            size="sm"
            value={String(setting.scale)}
            onValueChange={(value) => update(settings.map((item, at) => (at === index ? { ...item, scale: Number(value) } : item)))}
            options={SCALES.map((scale) => ({ value: String(scale), label: `${scale}x` }))}
          />
          <SelectField
            aria-label="Format"
            size="sm"
            value={setting.format}
            onValueChange={(value) => { if (value !== "pdf") update(settings.map((item, at) => (at === index ? { ...item, format: value as LayerExportFormat } : item))); }}
            options={FORMATS.map((format) => ({ value: format.value, label: format.label, disabled: format.disabled, caption: format.disabled ? "Not in Zen Studio yet" : undefined }))}
          />
          <IconButton icon="icon-minus-line" aria-label="Remove export setting" appearance="flat" level="primary" size="xs" onClick={() => update(settings.filter((_, at) => at !== index))} />
        </div>
      ))}
      {settings.length ? (
        <Button level="tertiary" size="sm" disabled={busy} onClick={() => void run()}>{busy ? "Exporting…" : `Export ${layer}`}</Button>
      ) : null}
    </InspectorSection>
  );
}
