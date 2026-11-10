import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { ColorSelector } from "../../../components/ColorSelector";
import { Icon } from "../../../components/Icon";
import { ColorField, InputField, NumberField, SelectField } from "../../../components/Input";
import { Menu } from "../../../components/Menu";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { Segmented } from "../../../components/Segmented";
import { TabPanel, Tabs } from "../../../components/Tabs";
import { Heading, Text } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { announceEditStatus } from "../api";
import { SectionNote } from "../inspector/Section";
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
import { FONT_ACCEPT, WEIGHT_NAMES, fontGaps, listedSample, loadFontSamples, removeFont, renameFont, setFaceWeight, uploadFonts, weightOptions } from "./projectFonts";
import { ThemePreview, type GalleryId } from "./ThemePreview";
import "./project.css";

/*
 * New project / Project settings (user, 2026-10-17): the project's name, language and theme on one page, shaped as
 * one panel since the UX review of 2026-11-10 (option A, then v3 after the references: shadcn /create, Radix's Theme
 * panel, tweakcn): the settings on the left, four tabs on top of them (General: name and language; Color: Primary,
 * Neutral, status colours, chart sectors; Type: fonts, roles, type scale; Style: corner radius, component theme, size,
 * emphasis), and Zen components on the right — most of the window — in the draft's own mode, Light, Dark
 * or both. Opening a tab shows its preview tab. The draft is a mode of its own
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

/** The settings' tabs, and the preview tab each opens on (a change inside one never switches it: user, 2026-11-07). */
type GroupId = "general" | "color" | "typography" | "components";
const GROUPS: Array<{ id: GroupId; label: string; preview?: GalleryId }> = [
  { id: "general", label: "General" },
  { id: "color", label: "Color", preview: "cards" },
  { id: "typography", label: "Type", preview: "typography" },
  { id: "components", label: "Style", preview: "components" },
];

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
  const [group, setGroup] = useState<GroupId>("general");
  const panelId = useId();
  const openGroup = (id: GroupId) => {
    setGroup(id);
    const tab = GROUPS.find((item) => item.id === id)?.preview;
    if (tab) setGallery(tab);
  };
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
    if (!value) { setGroup("general"); setNameError("Give the project a name"); return; }
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
          <IconButton icon="icon-refresh-ccw-01-line" aria-label="Reset to Zen" tooltip="Reset to Zen" appearance="flat" level="secondary" size="sm" onClick={() => change(defaultProjectTheme())} />
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
          <div className="studio-project-setup__tabs">
            <Tabs aria-label="Settings" variant="subtle" size="sm" fullWidth idPrefix={panelId} value={group} onValueChange={(id) => openGroup(id as GroupId)} items={GROUPS.map(({ id, label }) => ({ id, label }))} />
          </div>
          <TabPanel idPrefix={panelId} id={group} className="studio-project-setup__panel">
          {group === "general" ? (
            <>
              <Section title="Project">
                <Fields name="name" fields={[
                  <InputField key="name" size="sm" layout="inline" label="Name" placeholder="Untitled project" value={name} autoFocus={!editing} onFocus={(event) => { if (!editing) event.currentTarget.select(); }}
                    error={nameError ?? undefined} onChange={(event) => { setName(event.target.value); if (nameError) setNameError(null); }}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void save(); } }} />,
                ]} />
              </Section>
              <Section title="Language" note={<SectionNote text="Dates and built-in words on its pages" more="On the canvas, in Play, on a phone, in Figma and in the export. Drafts stay in English." />}>
                <Fields name="locale" fields={[
                  <SelectField key="locale" size="sm" layout="inline" label="Language" value={locale} onValueChange={(value) => setLocale(value as ProjectLocale)}
                    options={(Object.keys(PROJECT_LOCALES) as ProjectLocale[]).map((code) => ({ value: code, label: PROJECT_LOCALES[code] }))} />,
                ]} />
              </Section>
            </>
          ) : null}
          {/* A change never switches the preview's tab (user, 2026-11-07: "Đổi chọn không nên nhảy trang preview"). */}
          {group === "color" ? <ColorSettings theme={theme} swatches={swatches} onChange={change} /> : null}
          {group === "typography" ? <TypographySettings theme={theme} onChange={change} /> : null}
          {group === "components" ? <ComponentSettings theme={theme} swatches={swatches} onChange={change} /> : null}
          </TabPanel>
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

/**
 * A group's section (the page's own rhythm, project.css; not the Inspector's, whose rows keep an icon column): its title
 * and action, one short note, its controls.
 */
function Section({ title, note, actions, children }: { title: string; note?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="studio-project-setup__section" aria-labelledby={id}>
      <div className="studio-project-setup__section-head">
        <Heading id={id} level={3} textStyle="Body/Small/Bold">{title}</Heading>
        {actions}
      </div>
      {note ? <Text as="div" textStyle="Body/Small/Regular" tone="light" className="studio-project-setup__note">{note}</Text> : null}
      {children}
    </section>
  );
}

/** Controls side by side in equal columns (or `columns`, a grid template), every row ending on the same right edge.
 *  `name`: the row's data-prop. */
function Fields({ name, fields, columns }: { name?: string; fields: ReactNode[]; columns?: string }) {
  return <div className="studio-project-setup__fields" data-prop={name} style={columns ? { gridTemplateColumns: columns } : undefined}>{fields}</div>;
}

/** A colour's dot, leading its field and its options. */
const dot = (color: string | undefined) => <span className="studio-project-setup__dot" style={{ background: color }} aria-hidden="true" />;

/* ── Color ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

function ColorSettings({ theme, swatches, onChange }: { theme: ProjectTheme; swatches: DraftSwatches | null; onChange: (next: ProjectTheme) => void }) {
  const palettes = useMemo(() => projectPalettes(theme), [theme]);
  const set = <K extends keyof ProjectTheme>(key: K, value: ProjectTheme[K]) => onChange({ ...theme, [key]: value });
  const primaryHex = palettes.primary.anchor;
  const onBrand = palettes.onBrand.light;
  const neutralKind = theme.neutral.tint ? "tint" : theme.neutral.hex ? "custom" : "gray";
  const statusField = (role: StatusRole) => (
    <SelectField key={role} size="sm" layout="inline" label={STATUS_LABEL[role]} value={theme.status[role]} popoverSearch leading={dot(RAMPS[theme.status[role]])}
      onValueChange={(value) => set("status", { ...theme.status, [role]: value as RampName })}
      options={PRIMARY_RAMPS.map((ramp) => ({ value: ramp, label: RAMP_LABEL[ramp], leading: dot(RAMPS[ramp]), ...(ramp === STATUS_ROLES[role] ? { meta: "Zen" } : {}) }))} />
  );

  return (
    <>
      <Section title="Primary" note={`${onBrand.default === "#ffffff" ? "White" : "Dark"} text on Primary · Lc ${onBrand.lc}${onBrand.lc < 60 ? " — hard to read" : ""}`}>
        <ColorSelector aria-label="Primary ramp" name="studio-primary" value={theme.primary.ramp ? RAMPS[theme.primary.ramp] : ""}
          colors={PRIMARY_RAMPS.map((ramp) => ({ value: RAMPS[ramp], label: ramp }))}
          onValueChange={(value) => { const ramp = PRIMARY_RAMPS.find((name) => RAMPS[name] === value); if (ramp) set("primary", { ramp }); }} />
        <Fields fields={[
          <ColorField key="primary" size="sm" layout="inline" label="Color" value={primaryHex} colorPicker
            onValueChange={(value) => { if (/^#[0-9a-f]{6}$/i.test(value) && value.toUpperCase() !== primaryHex.toUpperCase()) set("primary", rampOrHex(value)); }} />,
        ]} />
        <RampStrip palette={palettes.primary.lightSolid} label="Primary, Light" />
      </Section>

      <Section title="Neutral">
        <Segmented aria-label="Neutral" size="sm" fullWidth value={neutralKind}
          onValueChange={(value) => set("neutral", value === "tint" ? { tint: "primary" } : value === "custom" ? { hex: palettes.neutral.anchor } : { ramp: "Gray" })}
          options={[{ id: "gray", label: "Gray" }, { id: "tint", label: "Tinted" }, { id: "custom", label: "Custom" }]} />
        {neutralKind === "custom" ? (
          <Fields fields={[
            <ColorField key="neutral" size="sm" layout="inline" label="Color" value={palettes.neutral.anchor} colorPicker
              onValueChange={(value) => { if (/^#[0-9a-f]{6}$/i.test(value)) set("neutral", { hex: value.toUpperCase() }); }} />,
          ]} />
        ) : null}
        <RampStrip palette={palettes.neutral.lightSolid} label="Neutral, Light" />
      </Section>

      <Section title="Status colors">
        {(Object.keys(STATUS_ROLES) as StatusRole[]).map((role) => <Fields key={role} name={`status-${role}`} fields={[statusField(role)]} />)}
      </Section>

      <Section title="Chart colors" note="Sectors 1 and 2 follow Primary and Neutral">
        <ol className="studio-project-setup__sectors" aria-label="Chart sectors">
          {SECTOR_NAMES.map((sector, index) => (
            <li key={sector} className="studio-project-setup__sector" title={`Sector ${index + 1}`} style={{ background: swatches?.sectors[index] }} />
          ))}
        </ol>
        {theme.chart.map((slot, index) => (
          <Fields key={index} columns="minmax(0, 1fr) 112px" fields={[
            <SelectField key="family" size="sm" layout="inline" label={`Sector ${index + 3}`} value={slot.family} popoverSearch leading={dot(swatches?.sectors[index + 2])}
              onValueChange={(value) => set("chart", theme.chart.map((item, at) => (at === index ? { ...item, family: value as SupportFamily } : item)))}
              options={SUPPORT_FAMILIES.map((family) => ({ value: family, label: SUPPORT_LABELS[family] }))} />,
            <Segmented key="tone" aria-label={`Sector ${index + 3} tone`} size="sm" fullWidth value={slot.tone}
              onValueChange={(value) => set("chart", theme.chart.map((item, at) => (at === index ? { ...item, tone: value === "soft" ? "soft" : "solid" } : item)))}
              options={[{ id: "solid", label: "Solid" }, { id: "soft", label: "Soft" }]} />,
          ]} />
        ))}
      </Section>
    </>
  );
}

/* ── Components ────────────────────────────────────────────────────────────────────────────────────────────────── */

function ComponentSettings({ theme, swatches, onChange }: { theme: ProjectTheme; swatches: DraftSwatches | null; onChange: (next: ProjectTheme) => void }) {
  const setMode = <K extends keyof ProjectModes>(key: K, value: ProjectModes[K]) => onChange({ ...theme, modes: { ...theme.modes, [key]: value } });
  // A component theme's primary button and selected chip, in the draft's colours (DraftProbes).
  const themeArt = (mode: ProjectModes["componentTheme"]) => (
    <span className="studio-project-setup__theme-art" aria-hidden="true">
      <span className="studio-project-setup__theme-fill" style={{ background: swatches?.themes[mode]?.primary }} />
      <span className="studio-project-setup__theme-fill" style={{ background: swatches?.themes[mode]?.selected }} />
    </span>
  );
  return (
    <>
      <Section title="Corner radius">
        <TileGroup label="Corner radius" value={theme.modes.radius} onChange={(value) => setMode("radius", value)}
          options={MODE_VALUES.radius.map((radius) => ({ id: radius, label: RADIUS_LABEL[radius], art: <span className="studio-project-setup__radius-art" data-radius={radius} aria-hidden="true"><span /></span> }))} />
      </Section>
      <Section title="Components">
        <Fields name="component-theme" fields={[
          <SelectField key="theme" size="sm" layout="inline" label="Theme" aria-label="Component theme" value={theme.modes.componentTheme} leading={themeArt(theme.modes.componentTheme)}
            onValueChange={(value) => setMode("componentTheme", value as ProjectModes["componentTheme"])}
            options={MODE_VALUES.componentTheme.map((mode) => ({ value: mode, label: previewValueLabel("componentTheme", mode), leading: themeArt(mode) }))} />,
        ]} />
        <Fields name="density" fields={[
          <SelectField key="density" size="sm" layout="inline" label="Size" aria-label="Component size" value={theme.modes.density} onValueChange={(value) => setMode("density", value as ProjectModes["density"])}
            options={MODE_VALUES.density.map((id) => ({ value: id, label: previewValueLabel("density", id) }))} />,
        ]} />
        <Fields name="emphasis" fields={[
          <SelectField key="emphasis" size="sm" layout="inline" label="Emphasis" value={theme.modes.emphasis} onValueChange={(value) => setMode("emphasis", value as ProjectModes["emphasis"])}
            options={(["light", "medium", "strong"] as const).map((id) => ({ value: id, label: previewValueLabel("emphasis", id) }))} />,
        ]} />
      </Section>
    </>
  );
}

/* ── Typography ────────────────────────────────────────────────────────────────────────────────────────────────── */

/* Typography (user, 2026-11-06: "thiếu phần typography", then "vẫn không cho đổi typo như trong plugin"; 2026-11-10 its
   own fonts and option A): Fonts (Inter and the fonts the project uploaded, each opening its files), Roles (a font per
   role, the Zen Figma plugin's Typeface; each list shows its fonts in their own face and ends in Upload font…), Type scale
   (a shipped mode, or Custom: the Body/Base size and the ratio between steps, the plugin's formula). */
const TYPE_ROLE_LABEL: Record<TypeRole, string> = { sans: "Body", heading: "Heading", display: "Display", button: "Button" };
/** The Body/Base size of each shipped mode (tokens.css), where a Custom scale starts. */
const MODE_BASE: Record<ProjectModes["typography"], number> = { dashboard: 14, popular: 16, mobile: 16 };
/** A role list's last option: it opens the file picker, and the font uploaded takes that role. */
const UPLOAD = "zen-upload-font";
/** The listed fonts that are serif (the rest are sans): a role list says which. */
const SERIF = new Set(["Lora", "Playfair Display", "Fraunces", "Noto Serif", "Source Serif 4"]);

function TypographySettings({ theme, onChange }: { theme: ProjectTheme; onChange: (next: ProjectTheme) => void }) {
  const { fonts, scale, uploads } = theme.type;
  const setType = (type: Partial<ProjectTheme["type"]>) => onChange({ ...theme, type: { ...theme.type, ...type } });
  const tile = scale ? "custom" : theme.modes.typography;
  const pickScale = (id: string) => {
    if (id === "custom") { if (!scale) setType({ scale: { base: MODE_BASE[theme.modes.typography], ratio: 1.14 } }); return; }
    onChange({ ...theme, modes: { ...theme.modes, typography: id as ProjectModes["typography"] }, type: { ...theme.type, scale: null } });
  };
  const setScale = (key: keyof TypeScale, value: number | null) => {
    if (!scale || value === null) return;
    const { min, max } = TYPE_SCALE_LIMITS[key];
    setType({ scale: { ...scale, [key]: Math.min(max, Math.max(min, value)) } });
  };
  useEffect(() => loadFontSamples(FONT_FAMILIES.filter((family) => family !== "Inter")), []);
  const sample = (stack: string) => <span className="studio-project-setup__font-sample" style={{ fontFamily: stack }} aria-hidden="true">Ag</span>;
  // "Ag" in a font, and what kind it is (tweakcn's "sans-serif • Variable"): an uploaded one by its own name.
  const uploaded = (family: string) => uploads.find((font) => font.family === family);
  const stackOf = (family: string) => (uploaded(family) ? projectFontStack("draft", theme, family) : listedSample(family));
  const kindOf = (family: string) => {
    const own = uploaded(family);
    if (own) return own.faces.some((face) => Array.isArray(face.weight)) ? "Uploaded · Variable" : "Uploaded";
    return family === "Inter" ? "Zen · Variable" : SERIF.has(family) ? "Serif" : "Sans";
  };
  const options = [
    ...[...uploads.map((font) => font.family), ...FONT_FAMILIES].map((family) => ({ value: family, label: family, meta: kindOf(family), leading: sample(stackOf(family)) })),
    { value: UPLOAD, label: "Upload font…", leading: "icon-upload-01-line" as const },
  ];
  // The file picker, for Upload (the Fonts header, a role list's last option) and a font's Add files.
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<{ role?: TypeRole; into?: string }>({});
  const [reading, setReading] = useState(false);
  const pick = (next: { role?: TypeRole; into?: string } = {}) => { target.current = next; input.current?.click(); };
  const upload = (files: File[]) => {
    if (!files.length) return;
    const { role, into } = target.current;
    setReading(true);
    void uploadFonts(files, theme, { into }).then(({ theme: next, added, families, refused }) => {
      if (added) onChange(role && families[0] ? { ...next, type: { ...next.type, fonts: { ...next.type.fonts, [role]: families[0] } } } : next);
      if (refused.length) say("error", `Not uploaded: ${refused.join("; ")}`);
      else say("saved", role ? `Uploaded ${families[0]}: ${TYPE_ROLE_LABEL[role]} uses it` : `Uploaded ${added} font file${added === 1 ? "" : "s"}`);
    }).finally(() => setReading(false));
  };
  return (
    <>
      <Section title="Fonts" note={<SectionNote text="WOFF2, WOFF, TTF or OTF, up to 5 MB" more="Use fonts your licence lets you put in apps and on the web. Files of one family (AcmeSans-Regular, AcmeSans-Bold) become one font." />}
        actions={<IconButton icon="icon-plus-line" aria-label="Upload font" tooltip="Upload font" appearance="flat" level="secondary" size="xs" disabled={reading} onClick={() => pick()} />}>
        <ul className="studio-project-setup__fonts" aria-label="Fonts">
          <li className="studio-project-setup__font">
            <div className="studio-project-setup__font-head">
              <div className="studio-project-setup__font-row">
                <span className="studio-project-setup__font-toggle" aria-hidden="true" />
                {sample('"Inter", sans-serif')}
                <Text as="span" textStyle="Body/Small/Medium" className="studio-project-setup__font-name">Inter</Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="light" className="studio-project-setup__font-meta">Zen · Variable</Text>
              </div>
              <span className="studio-project-setup__font-menu" aria-hidden="true" />
            </div>
          </li>
          {uploads.map((font) => <FontRow key={font.family} font={font} theme={theme} onChange={onChange} onAddFiles={() => pick({ into: font.family })} />)}
        </ul>
        <input ref={input} type="file" accept={FONT_ACCEPT} multiple hidden data-e2e="upload-fonts" onChange={(event) => {
          // Copied first: clearing the input (so the same file can be picked again) empties its live FileList.
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          upload(files);
        }} />
      </Section>
      <Section title="Roles">
        {TYPE_ROLES.map((role) => (
          <Fields key={role} name={`font-${role}`} fields={[
            <SelectField key={role} size="sm" layout="inline" label={TYPE_ROLE_LABEL[role]} aria-label={`${TYPE_ROLE_LABEL[role]} font`} value={fonts[role]} popoverSearch options={options}
              onValueChange={(value) => { if (value === UPLOAD) pick({ role }); else setType({ fonts: { ...fonts, [role]: value } }); }} />,
          ]} />
        ))}
      </Section>
      <Section title="Type scale">
        <Fields name="type-scale" fields={[
          <SelectField key="scale" size="sm" layout="inline" label="Scale" aria-label="Type scale" value={tile} onValueChange={pickScale}
            options={[...MODE_VALUES.typography.map((mode) => ({ value: mode, label: previewValueLabel("typography", mode), meta: `${MODE_BASE[mode]} px` })), { value: "custom", label: "Custom" }]} />,
        ]} />
        {scale ? (
          <Fields fields={[
            <NumberField key="base" size="sm" layout="inline" label="Base" aria-label="Base size in px" min={TYPE_SCALE_LIMITS.base.min} max={TYPE_SCALE_LIMITS.base.max} value={scale.base} onValueChange={(value) => setScale("base", value)} />,
            <NumberField key="ratio" size="sm" layout="inline" label="Ratio" aria-label="Scale ratio" min={TYPE_SCALE_LIMITS.ratio.min} max={TYPE_SCALE_LIMITS.ratio.max} step={0.01} value={scale.ratio} onValueChange={(value) => setScale("ratio", value)} />,
          ]} />
        ) : null}
      </Section>
    </>
  );
}

/** A face's style in words: its weight's name, Italic after it ("Bold Italic"; a regular italic is "Italic"). */
const styleName = (face: UploadedFont["faces"][number]) => {
  if (Array.isArray(face.weight)) return face.style === "italic" ? "Variable Italic" : "Variable";
  const weight = face.weight === 400 && face.style === "italic" ? "" : WEIGHT_NAMES[face.weight];
  return [weight, face.style === "italic" ? "Italic" : ""].filter(Boolean).join(" ");
};
/** A static face's weight field: the number shows, the name follows it in the list. */
const weightNumbers = weightOptions.map((option) => ({ value: option.value, label: option.value, meta: WEIGHT_NAMES[Number(option.value)] }));

/**
 * An uploaded font in the Fonts list, as Figma lists a family's styles: a row with a disclosure (its styles under it),
 * "Ag" in its face, its name, what it is (in the warning tone when it lacks a Zen weight or the Vietnamese letters), and
 * ⋯ for Rename, Add files and Remove font (the roles that took it go back to Inter). Under it, a slim row per file: its
 * style in its own face ("Bold" in bold) and its weight, the file's name in the tooltip; then what the font lacks.
 * Rename turns the name into a field (Enter or leaving it renames; the roles follow; Escape keeps the name).
 */
function FontRow({ font, theme, onChange, onAddFiles }: { font: UploadedFont; theme: ProjectTheme; onChange: (next: ProjectTheme) => void; onAddFiles: () => void }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(font.family);
  const [error, setError] = useState<string | null>(null);
  const detailsId = useId();
  useEffect(() => { setName(font.family); setError(null); }, [font.family]);
  const rename = () => {
    const next = renameFont(theme, font.family, name);
    if (!next) { setError("Taken, or has a quote"); return; }
    setError(null);
    setRenaming(false);
    if (next !== theme) onChange(next);
  };
  const family = projectFontStack("draft", theme, font.family);
  const gaps = fontGaps(font);
  const lacks = [
    gaps.weights.length ? `No ${gaps.weights.map((weight) => WEIGHT_NAMES[weight]).join(", ")}: text takes the nearest weight` : null,
    gaps.vietnamese ? null : "No Vietnamese letters: they show in Inter",
  ].filter(Boolean).join(". ");
  const variable = font.faces.some((face) => Array.isArray(face.weight));
  const weights = new Set(font.faces.map((face) => JSON.stringify(face.weight))).size;
  const fileOf = (file: string) => uploadOf(file)?.name ?? file;
  return (
    <li className="studio-project-setup__font">
      <div className="studio-project-setup__font-head">
        {renaming ? (
          <div className="studio-project-setup__font-rename">
            <InputField size="sm" layout="inline" label="Name" aria-label="Font name" autoFocus value={name} error={error ?? undefined} onChange={(event) => setName(event.target.value)} onBlur={rename}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); rename(); }
                // Escape keeps the name (and leaves the page open).
                if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setName(font.family); setError(null); setRenaming(false); }
              }} />
          </div>
        ) : (
          <button type="button" className="studio-project-setup__font-row" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
            <span className="studio-project-setup__font-toggle"><Icon name={open ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="xs" decorative /></span>
            <span className="studio-project-setup__font-sample" style={{ fontFamily: family }} aria-hidden="true">Ag</span>
            <Text as="span" textStyle="Body/Small/Medium" className="studio-project-setup__font-name">{font.family}</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone={lacks ? "warning-base" : "light"} className="studio-project-setup__font-meta" title={lacks || undefined}>
              {lacks ? <Icon name="icon-alert-triangle-line" size="xs" decorative /> : null}
              {variable ? "Variable" : `${weights} weight${weights === 1 ? "" : "s"}`}
              {lacks ? <VisuallyHidden>{`, ${lacks}`}</VisuallyHidden> : null}
            </Text>
          </button>
        )}
        <span className="studio-project-setup__font-menu">
          <Menu align="end" trigger={<IconButton icon="icon-dots-horizontal-line" aria-label={`${font.family} actions`} appearance="flat" level="secondary" size="xs" />}
            items={[
              { id: "rename", label: "Rename", icon: "icon-edit-02-line", onSelect: () => setRenaming(true) },
              { id: "add", label: "Add files", icon: "icon-upload-01-line", onSelect: onAddFiles },
              { type: "separator" },
              { id: "remove", label: "Remove font", icon: "icon-trash-line", danger: true, onSelect: () => onChange(removeFont(theme, font.family)) },
            ]} />
        </span>
      </div>
      {open ? (
        <div id={detailsId} className="studio-project-setup__font-faces" role="group" aria-label={`${font.family} files`}>
          {font.faces.map((face) => (
            <div key={face.file} className="studio-project-setup__font-face" title={fileOf(face.file)}>
              <Text as="span" textStyle="Body/Small/Regular" className="studio-project-setup__font-style"
                style={{ fontFamily: family, fontWeight: Array.isArray(face.weight) ? 400 : face.weight, fontStyle: face.style }}>{styleName(face)}</Text>
              {Array.isArray(face.weight)
                ? <Text as="span" textStyle="Body/Small/Regular" tone="light" className="studio-project-setup__font-range">{`${face.weight[0]}–${face.weight[1]}`}</Text>
                : <SelectField size="sm" aria-label={`Weight of ${fileOf(face.file)}`} value={String(face.weight)} options={weightNumbers}
                  onValueChange={(value) => onChange(setFaceWeight(theme, font.family, face.file, Number(value)))} />}
            </div>
          ))}
          {lacks ? (
            <Text as="p" textStyle="Caption/Regular" tone="warning-base" className="studio-project-setup__font-gap">
              <Icon name="icon-alert-triangle-line" size="xs" decorative />{lacks}
            </Text>
          ) : null}
        </div>
      ) : null}
    </li>
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
