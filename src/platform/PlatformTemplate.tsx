import { createContext, type ReactNode } from "react";
import { IconButton } from "../components/Button";
import { SelectField } from "../components/Input";
import { Stack } from "../components/Layout";
import { SidePanel } from "../components/SidePanel";
import { Heading, Text } from "../components/Text";

export type PlatformBreadcrumb = {
  label: string;
  current?: boolean;
};

export type PlatformViewMode = "light" | "dark";

export type PlatformShellSettings = {
  theme: PlatformViewMode;
  density: "compact" | "comfortable";
  componentTheme: "neutral-s1" | "brand-s1" | "neutral-s2" | "brand-s2" | "neutral-s3" | "neutral-s4" | "neutral-s5" | "neutral-s6" | "neutral-s7";
  typography: "dashboard" | "popular" | "mobile";
  radius: "rounded" | "smooth" | "standard" | "luxury";
  emphasis: "medium" | "strong" | "light";
  /** Global Colors mode: standard (Zen) or high (Zen-High-Contrast). */
  contrast: "standard" | "high";
};

/** System Typography Configuration mode (the Appearance panel) for component previews. The platform
 * chrome itself renders in the platform-only Zen-Platform typography (see platform.css). */
export const PlatformTypographyContext = createContext<PlatformShellSettings["typography"]>("dashboard");

/** The component previews' token modes, one field each in the Appearance panel (data-* on the platform root). */
const shellControlDefinitions = [
  {
    key: "density" as const,
    label: "Component Size",
    values: [
      { id: "compact", label: "Compact" },
      { id: "comfortable", label: "Comfortable" },
    ],
  },
  {
    key: "componentTheme" as const,
    label: "Component Theme",
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
  {
    key: "typography" as const,
    label: "Typography",
    values: [
      { id: "dashboard", label: "Dashboard" },
      { id: "popular", label: "Popular" },
      { id: "mobile", label: "Mobile" },
    ],
  },
  {
    key: "radius" as const,
    label: "Corner Radius",
    values: [
      { id: "rounded", label: "Rounded" },
      { id: "smooth", label: "Smooth" },
      { id: "standard", label: "Standard" },
      { id: "luxury", label: "Luxury" },
    ],
  },
  {
    key: "emphasis" as const,
    label: "Emphasis Level",
    values: [
      { id: "medium", label: "Medium" },
      { id: "strong", label: "Strong" },
      { id: "light", label: "Light" },
    ],
  },
  {
    key: "contrast" as const,
    label: "Contrast",
    values: [
      { id: "standard", label: "Standard" },
      { id: "high", label: "High" },
    ],
  },
] as const;

type PlatformAppearanceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PlatformShellSettings;
  onSettingsChange: (changes: Partial<PlatformShellSettings>) => void;
};

/**
 * Component pages: the previews' token modes (size, component theme, typography, corner radius, emphasis, contrast) in
 * one Side-Panel Type=Standard, Size=Small, docked beside the page by the AppShell so every change shows in the page at
 * once (SidePanel guideline: many settings at once). Opened from the header's Appearance button; Escape closes it.
 */
export function PlatformAppearancePanel({ open, onOpenChange, settings, onSettingsChange }: PlatformAppearanceProps) {
  return (
    <SidePanel type="standard" size="small" open={open} onOpenChange={onOpenChange} title="Appearance" description="How the components on this page render.">
      <Stack gap="md">
        {shellControlDefinitions.map((control) => (
          <SelectField
            key={control.key}
            label={control.label}
            options={control.values.map((value) => ({ value: value.id, label: value.label }))}
            value={settings[control.key]}
            onValueChange={(value) => onSettingsChange({ [control.key]: value } as Partial<PlatformShellSettings>)}
          />
        ))}
      </Stack>
    </SidePanel>
  );
}

/** Header colour mode: one flat icon button that switches the whole platform between light and dark. */
export function PlatformColorModeButton({ theme, onChange }: { theme: PlatformViewMode; onChange: (theme: PlatformViewMode) => void }) {
  const dark = theme === "dark";
  return (
    <IconButton appearance="flat" level="primary" aria-label="Dark mode" aria-pressed={dark} icon={dark ? "icon-moon-01-solid" : "icon-sun-solid"} onClick={() => onChange(dark ? "light" : "dark")} />
  );
}

type PlatformPageTemplateProps = {
  title: string;
  /** @deprecated The breadcrumbs above the page name its section now (Figma B5); kept so existing pages compile. */
  eyebrow?: string;
  description?: string;
  /** @deprecated The old cover split the title over lines; the B5 title is one Display/3 line. */
  titleLines?: string[];
  children: ReactNode;
};

/**
 * Foundation and component page frame (Figma ◇ Master-Layout B5 · Docs / Learning, 15917:6719): the page's h1 in
 * Display/3, its Body/Extra/Regular lead in Neutral/Base, then the body, typography-led on the Canvas (no cover).
 */
export function PlatformPageTemplate({ title, description, children }: PlatformPageTemplateProps) {
  return (
    <div className="platform-page-template">
      <Stack as="header" gap="sm" className="platform-page-header">
        <Heading level={1} textStyle="Display/3">{title}</Heading>
        {description ? <Text textStyle="Body/Extra/Regular" tone="base">{description}</Text> : null}
      </Stack>
      <div className="platform-page-template__body">{children}</div>
    </div>
  );
}
