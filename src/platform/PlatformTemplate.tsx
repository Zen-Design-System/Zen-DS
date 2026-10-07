import { createContext, useEffect, useState, type ReactNode } from "react";
import { IconButton } from "../components/Button";
import { Chip } from "../components/Chip";
import { Icon, type IconName } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { typographyStyles } from "../tokens/typography.generated";
import { AccountMenu } from "./auth/AuthGate";

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

/** System Typography Configuration mode (topbar chip) for component previews. The platform
 * chrome itself renders in the platform-only Zen-Platform typography (see platform.css). */
export const PlatformTypographyContext = createContext<PlatformShellSettings["typography"]>("dashboard");

type PlatformTopbarProps = {
  breadcrumbs: PlatformBreadcrumb[];
  settings: PlatformShellSettings;
  onSettingsChange: (changes: Partial<PlatformShellSettings>) => void;
  showSettingsControls?: boolean;
  /** Narrow viewports: the menu button that opens the navigation drawer. */
  navOpen?: boolean;
  onMenuClick?: () => void;
};

const viewModes: ReadonlyArray<{ mode: PlatformViewMode; label: string; icon: IconName }> = [
  { mode: "light", label: "Light mode", icon: "icon-sun-solid" },
  { mode: "dark", label: "Dark mode", icon: "icon-moon-01-solid" },
];

const shellControlDefinitions = [
  {
    key: "density" as const,
    label: "Component Size",
    icon: "icon-ruler-solid" as IconName,
    values: [
      { id: "compact", label: "Compact" },
      { id: "comfortable", label: "Comfortable" },
    ],
  },
  {
    key: "componentTheme" as const,
    label: "Component Theme",
    icon: "icon-colors-solid" as IconName,
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
    icon: "icon-monitor-02-solid" as IconName,
    values: [
      { id: "dashboard", label: "Dashboard" },
      { id: "popular", label: "Popular" },
      { id: "mobile", label: "Mobile" },
    ],
  },
  {
    key: "radius" as const,
    label: "Corner Radius",
    icon: "icon-maximize-02-line" as IconName,
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
    icon: "icon-bold-02-solid" as IconName,
    values: [
      { id: "medium", label: "Medium" },
      { id: "strong", label: "Strong" },
      { id: "light", label: "Light" },
    ],
  },
  {
    key: "contrast" as const,
    label: "Contrast",
    icon: "icon-contrast-01-solid" as IconName,
    values: [
      { id: "standard", label: "Standard" },
      { id: "high", label: "High" },
    ],
  },
] as const;

/** Below 1024px the sticky topbar keeps one row; the settings chips get their own row that scrolls with the page. */
const compactTopbarQuery = "(max-width: 1024px)";
function useCompactTopbar() {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.(compactTopbarQuery).matches));
  useEffect(() => {
    const query = window.matchMedia?.(compactTopbarQuery);
    if (!query) return undefined;
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

export function PlatformTopbar({ breadcrumbs, settings, onSettingsChange, showSettingsControls = false, navOpen = false, onMenuClick }: PlatformTopbarProps) {
  const compact = useCompactTopbar();
  const controls = showSettingsControls ? (
    <div className="official-topbar__controls" aria-label="Platform settings">
      {shellControlDefinitions.map((control) => {
        const selected = control.values.find((value) => value.id === settings[control.key]);
        // Popover/Label names the option group, not the current value.
        return (
          <Chip
            key={control.key}
            size="medium"
            leading={<Icon name={control.icon} size="base" decorative />}
            dropdown
            popoverLabel={control.label}
            popoverItems={control.values.map((value) => ({
              id: value.id,
              label: value.label,
              selected: value.id === settings[control.key],
            }))}
            onPopoverSelect={(item) => onSettingsChange({ [control.key]: item.id } as Partial<PlatformShellSettings>)}
          >
            {selected?.label ?? control.values[0].label}
          </Chip>
        );
      })}
    </div>
  ) : null;
  return (
    <>
    <header className="official-topbar">
      {onMenuClick ? <IconButton className="official-topbar__menu" appearance="main" level="tertiary" size="sm" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="official-navigation" onClick={onMenuClick} icon={<Icon name="icon-menu-01-line" />} /> : null}
      <nav className="official-topbar__breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((breadcrumb, index) => (
          <span className="official-topbar__breadcrumb-group" key={`${breadcrumb.label}-${index}`}>
            {index > 0 ? <Icon name="icon-chevron-right-line-small" size="base" decorative /> : null}
            <span className={`official-topbar__breadcrumb ${typographyStyles["Body/Base/Regular"]}`} aria-current={breadcrumb.current ? "page" : undefined}>
              {breadcrumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="official-topbar__trailing">
        {compact ? null : controls}
        <Segmented
          aria-label="Color mode"
          className="official-topbar__segmented"
          level="secondary"
          size="medium"
          value={settings.theme}
          onChange={(theme) => onSettingsChange({ theme: theme as PlatformViewMode })}
          options={viewModes.map((item) => ({ id: item.mode, label: null, leading: <Icon name={item.icon} size="base" title={item.label} decorative={false} /> }))}
        />
        <AccountMenu />
      </div>
    </header>
    {/* Not sticky: on a phone the five chips wrap to two or three rows, which as part of the sticky bar covered a
        quarter of the screen and the popovers opened under it. */}
    {compact && controls ? <div className="official-topbar-settings">{controls}</div> : null}
    </>
  );
}

type PlatformPageHeroProps = {
  title: string;
  eyebrow?: string;
  titleLines?: string[];
};

export function PlatformPageHero({ title, eyebrow = "Zen Design System", titleLines }: PlatformPageHeroProps) {
  return (
    <section className="platform-page-hero" aria-labelledby="platform-page-hero-title">
      <span className="platform-page-hero__logo" aria-hidden="true" />
      <span className={`platform-page-hero__kaiz ${typographyStyles["All-Caps/M-BOLD"]}`}>KAIZ</span>
      <div className="platform-page-hero__main">
        <h1 id="platform-page-hero-title">{(titleLines ?? [title]).map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h1>
        <span className="platform-page-hero__divider" aria-hidden="true" />
      </div>
      <div className="platform-page-hero__meta" aria-label="Template metadata">
        <span className={typographyStyles["All-Caps/M"]}>V1.0.2</span>
        <span className={typographyStyles["All-Caps/M"]}>Đìzai® Studio</span>
        <span className={typographyStyles["All-Caps/M"]}>2026</span>
      </div>
    </section>
  );
}

type PlatformPageTemplateProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  titleLines?: string[];
  children: ReactNode;
};

/** Shared foundation/component page frame from the Codebase Platform page. */
export function PlatformPageTemplate({ title, eyebrow, description, titleLines, children }: PlatformPageTemplateProps) {
  return (
    <div className="platform-page-template">
      <PlatformPageHero title={title} eyebrow={eyebrow} titleLines={titleLines} />
      <div className="platform-page-template__body">
        {description ? (
          <section className="platform-page-intro" aria-label={`${title} introduction`}>
            <p className={typographyStyles["Body/Extra/Regular"]}>{description}</p>
          </section>
        ) : null}
        {children}
      </div>
    </div>
  );
}
