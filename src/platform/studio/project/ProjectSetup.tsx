import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { ColorSelector } from "../../../components/ColorSelector";
import { ColorField, InputField, NumberField, SelectField } from "../../../components/Input";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { Segmented } from "../../../components/Segmented";
import { Heading, Text } from "../../../components/Text";
import { announceEditStatus } from "../api";
import { InspectorFields, InspectorSection, SectionNote } from "../inspector/Section";
import { ChromeScope } from "../shell/ChromeScope";
import { previewValueLabel } from "../shell/modes";
import { useStudio } from "../store";
import {
  DEFAULT_LOCALE, FONT_FAMILIES, MODE_VALUES, PRIMARY_RAMPS, PROJECT_LOCALES, RAMPS, SECTOR_NAMES, STATUS_ROLES, SUPPORT_FAMILIES, SUPPORT_LABELS, TYPE_ROLES, TYPE_SCALE_LIMITS,
  defaultProjectTheme, projectFontStack, projectPalettes, projectTypeScale,
  type ProjectLocale, type ProjectModes, type ProjectTheme, type RampName, type StatusRole, type SupportFamily, type TypeRole, type TypeScale, type UploadedFont,
} from "../../../../tools/studio/project-theme.mjs";
import { uploadOf } from "../builder/assets/uploads";
import { openProjectHome } from "./activeProject";
import { DRAFT_BRAND, createProject, setDraftStyles, updateProject, useProject, useProjects } from "./projectStore";
import { FONT_ACCEPT, WEIGHT_NAMES, fontGaps, removeFont, renameFont, setFaceWeight, uploadFonts, weightOptions } from "./projectFonts";
import { ThemePreview, type GalleryId } from "./ThemePreview";
import "./project.css";

/*
 * New project / Project settings (user, 2026-10-17): the project's name, language and theme on one page — the settings
 * on the left (the language of its pages, 2026-11-05; Primary, Neutral, status colours, chart sectors, corner radius,
 * component theme, typography, size, emphasis),
 * Zen components on the right in the draft's own mode, Light, Dark or both. The draft is a mode of its own
 * ([data-brand="studio-draft"]) until Create / Save; Cancel leaves the project as it was. ⌘Z / ⇧⌘Z step through the
 * page's changes. A full-window layer like Present: the Studio under it is inert.
 */

type Setup = null | { kind: "create" } | { kind: "edit"; id: string };
let setup: Setup = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Opens the theme page: a new project, or an existing one's settings. */
export function openProjectSetup(next: Exclude<Setup, null>) { setup = next; listeners.forEach((listener) => listener()); }
export function closeProjectSetup() { setup = null; listeners.forEach((listener) => listener()); }
export const useProjectSetup = (): Setup => useSyncExternalStore(subscribe, () => setup, () => setup);

const say = (kind: "saved" | "error", message: string) => announceEditStatus({ kind, message, at: Date.now() });
const RAMP_LABEL: Record<RampName, string> = Object.fromEntries(Object.keys(RAMPS).map((name) => [name, name])) as Record<RampName, string>;
const STATUS_LABEL: Record<StatusRole, string> = { positive: "Positive", negative: "Negative", warning: "Warning", info: "Info" };
const RADIUS_LABEL: Record<ProjectModes["radius"], string> = { rounded: "Rounded", smooth: "Smooth", standard: "Standard", luxury: "Luxury" };

export function ProjectSetup() {
  const current = useProjectSetup();
  if (!current) return null;
  return <SetupLayer key={current.kind === "edit" ? current.id : "new"} setup={current} />;
}

type History = { past: ProjectTheme[]; present: ProjectTheme; future: ProjectTheme[] };

function SetupLayer({ setup: current }: { setup: Exclude<Setup, null> }) {
  const project = useProject(current.kind === "edit" ? current.id : null);
  const chromeTheme = useStudio((state) => state.chromeTheme);
  const titleId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const projects = useProjects();
  // A new project is "Untitled project" (then 2, 3…), as Figma names a new file: Create works at once, and the name is
  // selected so typing replaces it (user, 2026-10-18: "Không bấm tạo project được" with an empty name field).
  const [name, setName] = useState(() => project?.name ?? untitledName(new Set(projects.map((item) => item.name))));
  const [nameError, setNameError] = useState<string | null>(null);
  // The pages' language (project.json `locale`): saved with the theme, outside its undo history.
  const [locale, setLocale] = useState<ProjectLocale>(project?.locale ?? DEFAULT_LOCALE);
  const [history, setHistory] = useState<History>(() => ({ past: [], present: project?.theme ?? defaultProjectTheme(), future: [] }));
  const [view, setView] = useState<"light" | "dark" | "both">(chromeTheme);
  const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<GalleryId>("cards");
  const [swatches, setSwatches] = useState<DraftSwatches | null>(null);
  const theme = history.present;
  const change = useCallback((next: ProjectTheme) => setHistory((h) => ({ past: [...h.past, h.present].slice(-100), present: next, future: [] })), []);
  const undo = useCallback(() => setHistory((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)), []);
  const redo = useCallback(() => setHistory((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)), []);

  // The draft's mode, kept in step with every change; gone with the page.
  useLayoutEffect(() => setDraftStyles(theme), [theme]);
  useEffect(() => () => setDraftStyles(null), []);
  // The page takes focus as it opens (a new project's name field takes it from there), and gives it back when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    if (current.kind === "edit") layerRef.current?.focus();
    return () => before?.focus?.();
  }, [current.kind]);

  const editing = current.kind === "edit";
  if (editing && !project) return null;

  const save = async () => {
    const value = name.trim();
    if (!value) { setNameError("Give the project a name"); return; }
    setBusy(true);
    try {
      if (current.kind === "create") {
        const made = await createProject(value, theme, locale);
        say("saved", `Created “${made.name}”`);
        closeProjectSetup();
        openProjectHome(made.id);
      } else {
        await updateProject(current.id, { name: value, theme, locale });
        say("saved", `Saved “${value}”`);
        closeProjectSetup();
      }
    } catch (error) {
      say("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The Studio's own shortcuts never act under this page.
    event.stopPropagation();
    if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); closeProjectSetup(); return; }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.altKey || event.key.toLowerCase() !== "z") return;
    if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]:not([contenteditable='false'])")) return;
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  };

  const themes = view === "both" ? (["light", "dark"] as const) : ([view] as const);
  return (
    <div ref={layerRef} className="studio-project-setup" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
      <ChromeScope as="header" className="studio-project-setup__bar">
        <IconButton icon="icon-arrow-left-line" aria-label="Close" appearance="flat" level="secondary" size="sm" onClick={closeProjectSetup} />
        <Heading id={titleId} level={2} textStyle="Body/Base/Bold" className="studio-project-setup__title">{editing ? `${project?.name} · Settings` : "New project"}</Heading>
        <div className="studio-project-setup__history">
          <IconButton icon="icon-reverse-left-line" aria-label="Undo" appearance="flat" level="secondary" size="sm" disabled={!history.past.length} onClick={undo} />
          <IconButton icon="icon-reverse-right-line" aria-label="Redo" appearance="flat" level="secondary" size="sm" disabled={!history.future.length} onClick={redo} />
        </div>
        <Segmented aria-label="Preview" size="sm" value={view} onValueChange={(value) => setView(value as typeof view)} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "both", label: "Both" }]} />
        <div className="studio-project-setup__actions">
          <Button level="tertiary" size="sm" onClick={closeProjectSetup}>Cancel</Button>
          {/* Words while the project is written: about 2 s with no sign before (walk 2026-10-29 W-01). */}
          <Button level="primary" size="sm" disabled={busy} aria-busy={busy || undefined} onClick={() => void save()}>{busy ? (editing ? "Saving…" : "Creating…") : editing ? "Save" : "Create project"}</Button>
        </div>
      </ChromeScope>
      <div className="studio-project-setup__body">
        <ChromeScope as="aside" className="studio-project-setup__settings" aria-label="Project settings">
          <InspectorSection title="Project" fieldGrid>
            <InspectorFields labels={["Name"]} fields={[
              <InputField key="name" size="sm" aria-label="Project name" placeholder="Untitled project" value={name} autoFocus={!editing} onFocus={(event) => { if (!editing) event.currentTarget.select(); }}
                error={nameError ?? undefined} onChange={(event) => { setName(event.target.value); if (nameError) setNameError(null); }}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void save(); } }} />,
            ]} />
          </InspectorSection>
          <InspectorSection title="Language" fieldGrid note={<SectionNote text="Dates and built-in words on its pages" more="On the canvas, in Play, on a phone, in Figma and in the export. Drafts stay in English." />}>
            <InspectorFields name="locale" fields={[
              <SelectField key="locale" size="sm" aria-label="Language" value={locale} onValueChange={(value) => setLocale(value as ProjectLocale)}
                options={(Object.keys(PROJECT_LOCALES) as ProjectLocale[]).map((code) => ({ value: code, label: PROJECT_LOCALES[code] }))} />,
            ]} />
          </InspectorSection>
          {/* A change never switches the preview's tab (user, 2026-11-07: "Đổi chọn không nên nhảy trang preview"). */}
          <ThemeSettings theme={theme} swatches={swatches} onChange={change} />
        </ChromeScope>
        <main className="studio-project-setup__preview" aria-label="Preview">
          <ThemePreview brand={DRAFT_BRAND} modes={theme.modes} type={theme.type} themes={themes} gallery={gallery} onGalleryChange={setGallery} />
          <DraftProbes theme={theme} onRead={setSwatches} />
        </main>
      </div>
    </div>
  );
}

/** "Untitled project", or "Untitled project 2", 3… while one of that name exists. */
function untitledName(taken: ReadonlySet<string>): string {
  let name = "Untitled project";
  for (let n = 2; taken.has(name); n += 1) name = `Untitled project ${n}`;
  return name;
}

/* ── the settings ──────────────────────────────────────────────────────────────────────────────────────────────── */

function ThemeSettings({ theme, swatches, onChange }: { theme: ProjectTheme; swatches: DraftSwatches | null; onChange: (next: ProjectTheme) => void }) {
  const palettes = useMemo(() => projectPalettes(theme), [theme]);
  const set = <K extends keyof ProjectTheme>(key: K, value: ProjectTheme[K]) => onChange({ ...theme, [key]: value });
  const setMode = <K extends keyof ProjectModes>(key: K, value: ProjectModes[K]) => onChange({ ...theme, modes: { ...theme.modes, [key]: value } });
  const primaryHex = palettes.primary.anchor;
  const onBrand = palettes.onBrand.light;
  const neutralKind = theme.neutral.tint ? "tint" : theme.neutral.hex ? "custom" : "gray";

  return (
    <>
      <InspectorSection title="Primary" fieldGrid note={`${onBrand.default === "#ffffff" ? "White" : "Dark"} text on Primary · Lc ${onBrand.lc}${onBrand.lc < 60 ? " — hard to read" : ""}`}>
        <ColorSelector aria-label="Primary ramp" name="studio-primary" value={theme.primary.ramp ? RAMPS[theme.primary.ramp] : ""}
          colors={PRIMARY_RAMPS.map((ramp) => ({ value: RAMPS[ramp], label: ramp }))}
          onValueChange={(value) => { const ramp = PRIMARY_RAMPS.find((name) => RAMPS[name] === value); if (ramp) set("primary", { ramp }); }} />
        <InspectorFields labels={["Color"]} fields={[
          <ColorField key="primary" size="sm" aria-label="Primary color" value={primaryHex} colorPicker
            onValueChange={(value) => { if (/^#[0-9a-f]{6}$/i.test(value) && value.toUpperCase() !== primaryHex.toUpperCase()) set("primary", rampOrHex(value)); }} />,
        ]} />
        <RampStrip palette={palettes.primary.lightSolid} label="Primary, Light" />
      </InspectorSection>

      <InspectorSection title="Neutral" fieldGrid>
        <Segmented aria-label="Neutral" size="sm" fullWidth value={neutralKind}
          onValueChange={(value) => set("neutral", value === "tint" ? { tint: "primary" } : value === "custom" ? { hex: palettes.neutral.anchor } : { ramp: "Gray" })}
          options={[{ id: "gray", label: "Gray" }, { id: "tint", label: "Tinted" }, { id: "custom", label: "Custom" }]} />
        {neutralKind === "custom" ? (
          <InspectorFields labels={["Color"]} fields={[
            <ColorField key="neutral" size="sm" aria-label="Neutral color" value={palettes.neutral.anchor} colorPicker
              onValueChange={(value) => { if (/^#[0-9a-f]{6}$/i.test(value)) set("neutral", { hex: value.toUpperCase() }); }} />,
          ]} />
        ) : null}
        <RampStrip palette={palettes.neutral.lightSolid} label="Neutral, Light" />
      </InspectorSection>

      <InspectorSection title="Status colors" fieldGrid>
        {(Object.keys(STATUS_ROLES) as StatusRole[]).map((role) => (
          <InspectorFields key={role} labels={[STATUS_LABEL[role]]} fields={[
            <SelectField key={role} size="sm" aria-label={`${STATUS_LABEL[role]} color`} value={theme.status[role]} popoverSearch
              onValueChange={(value) => set("status", { ...theme.status, [role]: value as RampName })}
              options={PRIMARY_RAMPS.map((ramp) => ({ value: ramp, label: RAMP_LABEL[ramp], ...(ramp === STATUS_ROLES[role] ? { meta: "Zen" } : {}) }))} />,
          ]} />
        ))}
      </InspectorSection>

      <InspectorSection title="Chart colors" fieldGrid note="Sectors 1 and 2 follow Primary and Neutral">
        <ol className="studio-project-setup__sectors" aria-label="Chart sectors">
          {SECTOR_NAMES.map((sector, index) => (
            <li key={sector} className="studio-project-setup__sector" title={`Sector ${index + 1}`} style={{ background: swatches?.sectors[index] }} />
          ))}
        </ol>
        {theme.chart.map((slot, index) => (
          <InspectorFields key={index} labels={[`Sector ${index + 3}`, "Tone"]} fields={[
            <SelectField key="family" size="sm" aria-label={`Sector ${index + 3} color`} value={slot.family} popoverSearch
              onValueChange={(value) => set("chart", theme.chart.map((item, at) => (at === index ? { ...item, family: value as SupportFamily } : item)))}
              options={SUPPORT_FAMILIES.map((family) => ({ value: family, label: SUPPORT_LABELS[family] }))} />,
            <Segmented key="tone" aria-label={`Sector ${index + 3} tone`} size="sm" fullWidth value={slot.tone}
              onValueChange={(value) => set("chart", theme.chart.map((item, at) => (at === index ? { ...item, tone: value === "soft" ? "soft" : "solid" } : item)))}
              options={[{ id: "solid", label: "Solid" }, { id: "soft", label: "Soft" }]} />,
          ]} />
        ))}
      </InspectorSection>

      <InspectorSection title="Corner radius">
        <TileGroup label="Corner radius" value={theme.modes.radius} onChange={(value) => setMode("radius", value)}
          options={MODE_VALUES.radius.map((radius) => ({ id: radius, label: RADIUS_LABEL[radius], art: <span className="studio-project-setup__radius-art" data-radius={radius} aria-hidden="true"><span /></span> }))} />
      </InspectorSection>

      <InspectorSection title="Component theme">
        <TileGroup label="Component theme" value={theme.modes.componentTheme} onChange={(value) => setMode("componentTheme", value)} columns={3}
          options={MODE_VALUES.componentTheme.map((mode) => ({
            id: mode,
            label: previewValueLabel("componentTheme", mode),
            art: (
              <span className="studio-project-setup__theme-art" aria-hidden="true">
                <span className="studio-project-setup__theme-fill" style={{ background: swatches?.themes[mode]?.primary }} />
                <span className="studio-project-setup__theme-fill" style={{ background: swatches?.themes[mode]?.selected }} />
              </span>
            ),
          }))} />
      </InspectorSection>

      <TypographySettings theme={theme} onChange={onChange} />


      <InspectorSection title="Size and emphasis" fieldGrid>
        <InspectorFields labels={["Component size"]} fields={[
          <Segmented key="density" aria-label="Component size" size="sm" fullWidth value={theme.modes.density} onValueChange={(value) => setMode("density", value as ProjectModes["density"])}
            options={MODE_VALUES.density.map((id) => ({ id, label: previewValueLabel("density", id) }))} />,
        ]} />
        <InspectorFields labels={["Emphasis"]} fields={[
          <Segmented key="emphasis" aria-label="Emphasis" size="sm" fullWidth value={theme.modes.emphasis} onValueChange={(value) => setMode("emphasis", value as ProjectModes["emphasis"])}
            options={(["light", "medium", "strong"] as const).map((id) => ({ id, label: previewValueLabel("emphasis", id) }))} />,
        ]} />
      </InspectorSection>

      <div className="studio-project-setup__reset">
        <Button level="tertiary" size="sm" startIcon="icon-refresh-ccw-01-line" onClick={() => onChange(defaultProjectTheme())}>Reset to Zen</Button>
      </div>
    </>
  );
}

/* Typography (user, 2026-11-06: "thiếu phần typography", then "vẫn không cho đổi typo như trong plugin"): the Zen
   Figma plugin's two tabs on one section — Typeface (a font per role) and Type Scale (a shipped mode, or Custom: the
   Body/Base size and the ratio between steps, sized by the plugin's formula). Each tile's "Aa" is that scale's
   Heading/3 in the Heading font. Upload font (user, 2026-11-10: "làm upload font riêng từng project") adds the
   project's own fonts (projectFonts.ts) to every role's list. */
const TYPE_ROLE_LABEL: Record<TypeRole, string> = { sans: "Body", heading: "Heading", display: "Display", button: "Button" };
/** The Body/Base size of each shipped mode (tokens.css), where a Custom scale starts. */
const MODE_BASE: Record<ProjectModes["typography"], number> = { dashboard: 14, popular: 16, mobile: 16 };
const FONT_OPTIONS = FONT_FAMILIES.map((family) => ({ value: family, label: family, ...(family === "Inter" ? { meta: "Zen" } : {}) }));

function TypographySettings({ theme, onChange }: { theme: ProjectTheme; onChange: (next: ProjectTheme) => void }) {
  const { fonts, scale, uploads } = theme.type;
  const setType = (type: Partial<ProjectTheme["type"]>) => onChange({ ...theme, type: { ...theme.type, ...type } });
  const heading = { "--zen-typography-font-family-heading": projectFontStack("draft", theme, fonts.heading) } as CSSProperties;
  const customSize = projectTypeScale(scale ?? { base: MODE_BASE[theme.modes.typography], ratio: 1.14 })["heading-3"].size;
  const tile = scale ? "custom" : theme.modes.typography;
  const pickScale = (id: typeof tile) => {
    if (id === "custom") { if (!scale) setType({ scale: { base: MODE_BASE[theme.modes.typography], ratio: 1.14 } }); return; }
    onChange({ ...theme, modes: { ...theme.modes, typography: id }, type: { ...theme.type, scale: null } });
  };
  const setScale = (key: keyof TypeScale, value: number | null) => {
    if (!scale || value === null) return;
    const { min, max } = TYPE_SCALE_LIMITS[key];
    setType({ scale: { ...scale, [key]: Math.min(max, Math.max(min, value)) } });
  };
  const options = [...uploads.map((font) => ({ value: font.family, label: font.family, meta: "Uploaded" })), ...FONT_OPTIONS];
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const upload = (files: File[]) => {
    if (!files.length) return;
    setReading(true);
    void uploadFonts(files, theme).then(({ theme: next, added, refused }) => {
      if (added) onChange(next);
      if (refused.length) say("error", `Not uploaded: ${refused.join("; ")}`);
      else say("saved", `Uploaded ${added} font file${added === 1 ? "" : "s"}: pick it for Body, Heading, Display or Button`);
    }).finally(() => setReading(false));
  };
  return (
    <InspectorSection title="Typography" fieldGrid note={<SectionNote text="Fonts and text sizes on every page" more="Upload WOFF2, WOFF, TTF or OTF files up to 5 MB each: fonts your licence lets you use in apps and on the web." />}>
      {TYPE_ROLES.map((role) => (
        <InspectorFields key={role} name={`font-${role}`} labels={[TYPE_ROLE_LABEL[role]]} fields={[
          <SelectField key={role} size="sm" aria-label={`${TYPE_ROLE_LABEL[role]} font`} value={fonts[role]} popoverSearch options={options}
            onValueChange={(value) => setType({ fonts: { ...fonts, [role]: value } })} />,
        ]} />
      ))}
      {uploads.map((font) => <UploadedFontFields key={font.family} font={font} theme={theme} onChange={onChange} />)}
      <div className="studio-project-setup__font-upload">
        <Button level="tertiary" size="sm" startIcon="icon-upload-01-line" disabled={reading} onClick={() => input.current?.click()}>Upload font</Button>
      </div>
      <input ref={input} type="file" accept={FONT_ACCEPT} multiple hidden data-e2e="upload-fonts" onChange={(event) => {
        // Copied first: clearing the input (so the same file can be picked again) empties its live FileList.
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        upload(files);
      }} />
      <TileGroup label="Type scale" value={tile} onChange={pickScale}
        options={[
          ...MODE_VALUES.typography.map((mode) => ({ id: mode, label: previewValueLabel("typography", mode), art: <span className="studio-project-setup__type-art" data-typography={mode} style={heading} aria-hidden="true">Aa</span> })),
          { id: "custom" as const, label: "Custom", art: <span className="studio-project-setup__type-art" style={{ ...heading, "--zen-typography-font-size-heading-3": `${customSize}px` } as CSSProperties} aria-hidden="true">Aa</span> },
        ]} />
      {scale ? (
        <InspectorFields labels={["Base size, px", "Ratio"]} fields={[
          <NumberField key="base" size="sm" aria-label="Base size in px" min={TYPE_SCALE_LIMITS.base.min} max={TYPE_SCALE_LIMITS.base.max} value={scale.base} onValueChange={(value) => setScale("base", value)} />,
          <NumberField key="ratio" size="sm" aria-label="Scale ratio" min={TYPE_SCALE_LIMITS.ratio.min} max={TYPE_SCALE_LIMITS.ratio.max} step={0.01} value={scale.ratio} onValueChange={(value) => setScale("ratio", value)} />,
        ]} />
      ) : null}
    </InspectorSection>
  );
}

/**
 * An uploaded font: its name (renamed on Enter or leaving the field; the roles follow), Remove (the roles that took it go
 * back to Inter), and each file in its own face with its weight (a variable font shows its range). Under them, what the
 * font lacks: a Zen weight (Regular, Medium, Semi Bold, Bold: text takes the nearest) or the Vietnamese letters.
 */
function UploadedFontFields({ font, theme, onChange }: { font: UploadedFont; theme: ProjectTheme; onChange: (next: ProjectTheme) => void }) {
  const [name, setName] = useState(font.family);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setName(font.family); setError(null); }, [font.family]);
  const rename = () => {
    const next = renameFont(theme, font.family, name);
    if (!next) { setError("Use another name: this one is taken or has a quote"); return; }
    setError(null);
    if (next !== theme) onChange(next);
  };
  const family = projectFontStack("draft", theme, font.family);
  const gaps = fontGaps(font);
  const lacks = [
    gaps.weights.length ? `No ${gaps.weights.map((weight) => WEIGHT_NAMES[weight]).join(", ")}: text takes the nearest weight` : null,
    gaps.vietnamese ? null : "No Vietnamese letters: they show in Inter",
  ].filter(Boolean).join(". ");
  return (
    <div className="studio-project-setup__font" role="group" aria-label={`Uploaded font ${font.family}`}>
      <InspectorFields labels={["Uploaded font"]} fields={[
        <InputField key="name" size="sm" aria-label="Font name" value={name} error={error ?? undefined} onChange={(event) => setName(event.target.value)} onBlur={rename}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); rename(); } }} />,
      ]} icon={<IconButton appearance="flat" level="secondary" size="xs" icon="icon-trash-line" aria-label={`Remove ${font.family}`} tooltip="Remove font" onClick={() => onChange(removeFont(theme, font.family))} />} />
      {font.faces.map((face) => (
        <InspectorFields key={face.file} fields={[
          <Text key="file" as="span" textStyle="Body/Small/Regular" className="studio-project-setup__font-file" title={face.file}
            style={{ fontFamily: family, fontWeight: Array.isArray(face.weight) ? 400 : face.weight, fontStyle: face.style }}>{uploadOf(face.file)?.name ?? face.file}</Text>,
          Array.isArray(face.weight)
            ? <Text key="weight" as="span" textStyle="Body/Small/Regular" tone="light" className="studio-project-setup__font-file">{`Variable ${face.weight[0]}–${face.weight[1]}`}</Text>
            : <SelectField key="weight" size="sm" aria-label={`Weight of ${uploadOf(face.file)?.name ?? face.file}`} value={String(face.weight)} options={weightOptions}
              onValueChange={(value) => onChange(setFaceWeight(theme, font.family, face.file, Number(value)))} />,
        ]} />
      ))}
      {lacks ? <Text as="p" textStyle="Caption/Regular" tone="light" className="studio-project-setup__font-gap">{lacks}</Text> : null}
    </div>
  );
}

/** A colour typed or picked: the shipped ramp it is step 9 of, else a custom colour. */
function rampOrHex(value: string): ProjectTheme["primary"] {
  const hex = value.toUpperCase();
  const ramp = PRIMARY_RAMPS.find((name) => RAMPS[name] === hex);
  return ramp ? { ramp } : { hex };
}

/** A ramp's twelve solid steps in a row. */
function RampStrip({ palette, label }: { palette: string[]; label: string }) {
  return (
    <ol className="studio-project-setup__strip" aria-label={label}>
      {palette.map((hex, index) => <li key={index} style={{ background: hex }} title={`${index + 1} · ${hex.toUpperCase()}`} />)}
    </ol>
  );
}

/** Picture tiles as one radio group (arrow keys move and pick, one Tab stop), as the Figma community theme pages show
 *  radius and theme choices. */
function TileGroup<T extends string>({ label, value, options, onChange, columns = 4 }: { label: string; value: T; options: Array<{ id: T; label: string; art: ReactNode }>; onChange: (value: T) => void; columns?: number }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const to = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : step ? (index + step + options.length) % options.length : -1;
    if (to < 0) return;
    event.preventDefault();
    onChange(options[to].id);
    refs.current[to]?.focus();
  };
  return (
    <div className="studio-project-setup__tiles" role="radiogroup" aria-label={label} style={{ "--studio-tiles": columns } as CSSProperties}>
      {options.map((option, index) => (
        <button key={option.id} ref={(node) => { refs.current[index] = node; }} type="button" role="radio" aria-checked={option.id === value} tabIndex={option.id === value ? 0 : -1}
          className="studio-project-setup__tile" onClick={() => onChange(option.id)} onKeyDown={(event) => move(event, index)}>
          {option.art}
          <Text as="span" textStyle="Caption/Medium" tone={option.id === value ? "strongest" : "base"}>{option.label}</Text>
        </button>
      ))}
    </div>
  );
}

/* ── colours the settings show ─────────────────────────────────────────────────────────────────────────────────── */

type DraftSwatches = { themes: Partial<Record<ProjectModes["componentTheme"], { primary: string; selected: string }>>; sectors: string[] };

/**
 * What a component theme's primary button and selected chip, and each chart sector, are in the draft: read from probes
 * on the preview side. The settings column is Studio chrome (Neutral-S7), and tokens.css re-resolves the component
 * theme for every [data-theme] under a [data-component-theme] ancestor, so a swatch drawn there would show S7's
 * colours. Read after the draft's styles are in place (an effect runs after the page's layout effect that writes them).
 */
function DraftProbes({ theme, onRead }: { theme: ProjectTheme; onRead: (swatches: DraftSwatches) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const read = (node: Element | null, name: string) => (node ? getComputedStyle(node).getPropertyValue(name).trim() : "");
    const themes: DraftSwatches["themes"] = {};
    for (const mode of MODE_VALUES.componentTheme) {
      const probe = host.querySelector(`[data-probe="${mode}"] > span`);
      themes[mode] = { primary: read(probe, "--zen-button-primary-background-default"), selected: read(probe, "--zen-chip-secondary-background-seclected-default") };
    }
    const chart = host.querySelector("[data-probe=\"chart\"] > span");
    onRead({ themes, sectors: SECTOR_NAMES.map((sector) => read(chart, `--zen-chart-sector-${sector}`)) });
  }, [theme, onRead]);
  return (
    <div ref={ref} className="studio-project-setup__probes" aria-hidden="true">
      {MODE_VALUES.componentTheme.map((mode) => (
        <ZenProvider key={mode} data-probe={mode} brand={DRAFT_BRAND as ZenBrand} theme="light" componentTheme={mode} paint={false} portal={false} syncDocument={false}><span /></ZenProvider>
      ))}
      <ZenProvider data-probe="chart" brand={DRAFT_BRAND as ZenBrand} theme="light" componentTheme={theme.modes.componentTheme} paint={false} portal={false} syncDocument={false}><span /></ZenProvider>
    </div>
  );
}
