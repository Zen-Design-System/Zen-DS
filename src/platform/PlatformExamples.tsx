import { useContext, useState, type ReactNode } from "react";
import { Button, IconButton, type ButtonAppearance, type ButtonLevel, type ButtonSize } from "../components/Button";
import { Chip, type ChipLevel, type ChipSize, type ChipState, type ChipTheme, type ChipVariant } from "../components/Chip";
import { Icon, type IconName } from "../components/Icon";
import { AutocompleteField, ControlBarSelectItem, DateField, HeadingField, InputConditionItem, InputConditions, InputContent, InputField, InputHelpText, InputLabel, InputLeadingTrailing, NumberField, RichTextEditorBar, RichTextField, SelectField, TextAreaField, type InputSize, type InputState } from "../components/Input";
import { Search, type SearchSize, type SearchTheme, type SearchVariant } from "../components/Search";
import { Sidebar, type SidebarBackground, type SidebarSection, type SidebarVariant } from "../components/Sidebar";
import { Segmented, type SegmentedLevel, type SegmentedSize } from "../components/Segmented";
import { Avatar, AvatarStack, avatarThemes, type AvatarBackground, type AvatarShape, type AvatarSize, type AvatarTheme } from "../components/Avatar";
import { Checkbox, type CheckboxSide } from "../components/Checkbox";
import { RadioButton, type RadioSide } from "../components/RadioButton";
import { Badge, BadgeCounter, badgeThemes, type BadgeBackground, type BadgeSize, type BadgeTheme } from "../components/Badge";
import { Toggle, ToggleButton, type ToggleSize, type ToggleTheme } from "../components/Toggle";
import type { PopoverItemData } from "../components/Popover";
import { Tag, type TagTheme } from "../components/Tag";
import { DatePicker } from "../components/DatePicker";
import { Tooltip, tooltipColors, type TooltipColor, type TooltipPlacement, type TooltipSize } from "../components/Tooltip";
import { Tabs, TabPanel, type TabSize, type TabVariant } from "../components/Tabs";
import { Breadcrumbs, type BreadcrumbEmphasis } from "../components/Breadcrumbs";
import { ProgressBar, ProgressCircle, progressCircleThemes, type ProgressBarTheme, type ProgressCircleTheme } from "../components/Progress";
import { Dialog, dialogThemes, type DialogTheme } from "../components/Dialog";
import { Accordion, type AccordionSize, type AccordionTheme } from "../components/Accordion";
import { AlertBanner, alertBannerThemes, type AlertBannerSize, type AlertBannerTheme } from "../components/AlertBanner";
import { Pagination, type PaginationItemSize, type PaginationTheme } from "../components/Pagination";
import { SkeletonHeading, SkeletonShape, SkeletonText, skeletonShapes, skeletonShapeSizes, type SkeletonHeadingSize, type SkeletonShapeSize } from "../components/Skeleton";
import { Toast, toastTypes, type ToastType } from "../components/Toast";
import { typographyStyles } from "../tokens/typography.generated";
import { FoundationOverview } from "../foundations/FoundationOverview";
import { IconGallery } from "../foundations/IconGallery";
import { TextStylesGallery } from "../foundations/TextStylesGallery";
import { TokenCollectionPage } from "../foundations/TokenCollectionPage";
import { collections } from "../foundations/collections";
import { PlatformPageTemplate, PlatformTypographyContext } from "./PlatformTemplate";
import { PlatformCode } from "./PlatformCode";
import { ComponentGuidelines } from "./PlatformGuidelines";
import { ComponentExamples, popoverContentKinds, popoverContentSet, type PopoverContentKind } from "./PlatformShowcases";

const samplePhoto = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d9c7b8"/><circle cx="16" cy="13" r="6" fill="#8f735f"/><rect x="6" y="21" width="20" height="14" rx="7" fill="#8f735f"/></svg>');

export type PlatformPage = "overviews" | "installation" | "design-tokens" | "typography" | "iconography" | "button" | "chip" | "sidebar" | "input" | "search" | "segmented" | "toggle" | "avatar" | "checkbox" | "radio-button" | "badge" | "popover" | "tag" | "date-picker" | "tooltip" | "tabs" | "breadcrumbs" | "progress" | "dialog" | "accordion" | "alert-banner" | "pagination" | "skeleton" | "toast";

function ExamplePage({ eyebrow, title, description, titleLines, page, children }: { eyebrow: string; title: string; description: string; titleLines?: string[]; page?: PlatformPage; children: ReactNode }) {
  return (
    <PlatformPageTemplate title={title} eyebrow={eyebrow} titleLines={titleLines} description={description}>
      <div className="platform-example-page">{children}{page ? <><ComponentExamples page={page} /><ComponentGuidelines page={page} /></> : null}</div>
    </PlatformPageTemplate>
  );
}

/** Keep component previews on the same Figma token mode as the platform shell. */
function ComponentPreview({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`platform-component-preview ${className}`.trim()}>{children}</div>;
}

/** Only production field compositions are selectable in the platform page.
 * Figma primitive owners remain nested implementation details, not previews. */
const inputPlaygroundKinds = ["text", "field-only", "textarea", "select", "date", "autocomplete", "number-left", "number-center", "richtext", "heading"] as const;

type PlaygroundOption = { id: string; label: string };

/** Platform composition for choosing one documented axis without rendering a
 * wall of variants. Single-value axes use the Figma Input/Select-Field owner;
 * multiple-choice axes reuse the production Advanced Chip + Popover owners. */
function PlaygroundFilterChip({
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

function PlaygroundToggle({ label, selected, onChange }: { label: string; selected: boolean; onChange: (selected: boolean) => void }) {
  return <div className="platform-property-row" data-kind="boolean">
    <span className="platform-property-row__label">{label}</span>
    <ToggleButton aria-label={label} selected={selected} onSelectedChange={onChange} size="small" />
  </div>;
}

function ButtonSetPlayground({ title, appearance, iconOnly, levels, sizes }: { title: string; appearance: ButtonAppearance; iconOnly?: boolean; levels: readonly ButtonLevel[]; sizes: readonly ButtonSize[] }) {
  const previewTypography = useContext(PlatformTypographyContext);
  const [level, setLevel] = useState<ButtonLevel>(levels[0]);
  const [size, setSize] = useState<ButtonSize>(sizes.includes("md") ? "md" : sizes[0]);
  // Hover/pressed/focus are driven by the real control. Disabled is the one
  // explicit state toggle because it cannot be reached by interaction.
  const [disabled, setDisabled] = useState(false);
  const [leading, setLeading] = useState(true);
  const [trailing, setTrailing] = useState(false);
  const headingId = `button-${iconOnly ? "icon-" : ""}${appearance}-heading`;
  const code = iconOnly
    ? `import { IconButton } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";

<IconButton
  appearance="${appearance}"
  level="${level}"
  size="${size}"${disabled ? `
  disabled` : ""}
  aria-label="Add"
  icon={<Icon name="icon-plus-line" decorative />}
/>`
    : `import { Button } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";


<Button
  appearance="${appearance}"
  level="${level}"
  size="${size}"${disabled ? `
  disabled` : ""}${leading ? `
  startIcon={<Icon name="icon-check-line" decorative />}` : ""}${trailing ? `
  endIcon={<Icon name="icon-chevron-right-line-small" decorative />}` : ""}
>
  Button
</Button>`;
  return (
    <section className="platform-component-section" aria-labelledby={headingId}>
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title" id={headingId}>{title}</h2>
        <div className="platform-playground-controls" aria-label={`${title} playground controls`}>
          <PlaygroundFilterChip label="Level" value={level} onChange={(value) => setLevel(String(value) as ButtonLevel)} options={levels.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={size} onChange={(value) => setSize(String(value) as ButtonSize)} options={sizes.map((id) => ({ id, label: id.toUpperCase() }))} />
          <PlaygroundToggle label="Disabled" selected={disabled} onChange={setDisabled} />
          {!iconOnly ? <PlaygroundToggle label="Leading Icon" selected={leading} onChange={setLeading} /> : null}
          {!iconOnly ? <PlaygroundToggle label="Trailing Icon" selected={trailing} onChange={setTrailing} /> : null}
        </div>
        <div data-typography={previewTypography} className={`platform-example-row${appearance === "overlay" ? " platform-example-row--overlay" : ""}`}>
          {iconOnly ? (
            <IconButton aria-label={`${title} preview`} appearance={appearance} level={level} size={size} disabled={disabled} icon={<Icon name="icon-plus-line" decorative />} />
          ) : (
            <Button appearance={appearance} level={level} size={size} disabled={disabled} startIcon={leading ? <Icon name="icon-check-line" decorative /> : undefined} endIcon={trailing ? <Icon name="icon-chevron-right-line-small" decorative /> : undefined}>Button</Button>
          )}
        </div>
        <PlatformCode code={code} />
      </ComponentPreview>
    </section>
  );
}

export function PlatformComponentPage({ page, activeCollection, onCollectionClick }: { page: PlatformPage; activeCollection?: string | null; onCollectionClick?: (slug: string) => void }) {
  const previewTypography = useContext(PlatformTypographyContext);
  const [chipVariant, setChipVariant] = useState<string | undefined>("advanced");
  const [chipSize, setChipSize] = useState<string | undefined>("small");
  const [chipDisabled, setChipDisabled] = useState(false);
  const [chipThemes, setChipThemes] = useState<string[]>(["text-only"]);
  const [chipLevel, setChipLevel] = useState<string | undefined>("secondary");
  const [chipMultiple, setChipMultiple] = useState(true);
  const [chipSelected, setChipSelected] = useState<string[]>(["active"]);
  const [chipOpen, setChipOpen] = useState(false);
  const [chipNormalSelected, setChipNormalSelected] = useState(false);
  const [sidebarVariant, setSidebarVariant] = useState<string | undefined>("basic");
  const [inputKind, setInputKind] = useState<string | undefined>("text");
  const [inputSize, setInputSize] = useState<string | undefined>("medium");
  // Zen inputs have Read-only instead of Disabled (Search is the only input with Disabled).
  const [inputReadOnly, setInputReadOnly] = useState(false);
  const [inputLabel, setInputLabel] = useState(true);
  const [inputHelp, setInputHelp] = useState(true);
  const [inputLeading, setInputLeading] = useState(true);
  const [inputLeadingLabel, setInputLeadingLabel] = useState(true);
  const [inputTrailing, setInputTrailing] = useState(true);
  const [inputTrailingLabel, setInputTrailingLabel] = useState(true);
  const [inputError, setInputError] = useState(false);
  const [inputNumber, setInputNumber] = useState<number | null>(1);
  const [inputLeadingValue, setInputLeadingValue] = useState("user");
  const [inputTrailingValue, setInputTrailingValue] = useState("vn");
  const [searchTheme, setSearchTheme] = useState<string | undefined>("default");
  const [searchSize, setSearchSize] = useState<string | undefined>("medium");
  const [searchVariant, setSearchVariant] = useState<string | undefined>("default");
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [searchIcon, setSearchIcon] = useState<string | undefined>("yes");
  const [searchValue, setSearchValue] = useState("");
  const [segmentedLevel, setSegmentedLevel] = useState<string | undefined>("primary");
  const [segmentedSize, setSegmentedSize] = useState<string | undefined>("medium");
  const [segmentedDisabled, setSegmentedDisabled] = useState(false);
  const [segmentedValue, setSegmentedValue] = useState("overview");
  const [segmentedIcon, setSegmentedIcon] = useState(true);
  const [segmentedLabel, setSegmentedLabel] = useState(true);
  const [segmentedBadge, setSegmentedBadge] = useState(false);
  const [avatarSize, setAvatarSize] = useState<string | undefined>("medium");
  const [avatarTheme, setAvatarTheme] = useState<string | undefined>("accent");
  const [avatarShape, setAvatarShape] = useState<string | undefined>("circle");
  const [avatarBackground, setAvatarBackground] = useState<string | undefined>("solid");
  const [avatarStatus, setAvatarStatus] = useState<string | undefined>("yes");
  const [avatarFocus, setAvatarFocus] = useState(false);
  const [avatarStackCount, setAvatarStackCount] = useState<string | undefined>("4");
  const [checkboxDisabled, setCheckboxDisabled] = useState(false);
  const [checkboxSide, setCheckboxSide] = useState<string | undefined>("left");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [checkboxIndeterminate, setCheckboxIndeterminate] = useState(false);
  const [checkboxCaption, setCheckboxCaption] = useState(true);
  const [checkboxBold, setCheckboxBold] = useState(false);
  const [radioDisabled, setRadioDisabled] = useState(false);
  const [radioSide, setRadioSide] = useState<string | undefined>("left");
  const [radioValue, setRadioValue] = useState("semantic");
  const [radioCaption, setRadioCaption] = useState(true);
  const [radioBold, setRadioBold] = useState(false);
  const [toggleSize, setToggleSize] = useState<string | undefined>("medium");
  const [toggleDisabled, setToggleDisabled] = useState(false);
  const [toggleTheme, setToggleTheme] = useState<string | undefined>("text-first");
  const [toggleSelected, setToggleSelected] = useState(false);
  const [toggleCaption, setToggleCaption] = useState(true);
  const [toggleBold, setToggleBold] = useState(false);
  const [badgeSize, setBadgeSize] = useState<string | undefined>("medium");
  const [badgeTheme, setBadgeTheme] = useState<string | undefined>("neutral");
  const [badgeBackground, setBadgeBackground] = useState<string | undefined>("solid");
  const [badgeLeading, setBadgeLeading] = useState<string | undefined>("yes");
  const [badgeRemove, setBadgeRemove] = useState<string | undefined>("no");
  const [badgeRemoved, setBadgeRemoved] = useState(false);
  const [badgeCount, setBadgeCount] = useState<string | undefined>("7");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarBackground, setSidebarBackground] = useState<string | undefined>("flat");
  const [sidebarWorkspaceBar, setSidebarWorkspaceBar] = useState(true);
  const [sidebarSubMenu, setSidebarSubMenu] = useState(false);
  const [sidebarSelected, setSidebarSelected] = useState("dashboard");
  const [popoverOpen, setPopoverOpen] = useState(true);
  const [popoverTrigger, setPopoverTrigger] = useState<string | undefined>("chip");
  const [popoverLabelOn, setPopoverLabelOn] = useState(true);
  const [popoverSearch, setPopoverSearch] = useState("");
  const [popoverSearchOn, setPopoverSearchOn] = useState(true);
  const [popoverSelected, setPopoverSelected] = useState("updated");
  const [popoverContent, setPopoverContent] = useState<string | undefined>("icon");
  const [popoverCaption, setPopoverCaption] = useState(false);
  const [popoverCreateOn, setPopoverCreateOn] = useState(false);
  const [popoverCreated, setPopoverCreated] = useState<string[]>([]);
  const [tagTheme, setTagTheme] = useState<string | undefined>("text-only");
  const [tagRemove, setTagRemove] = useState(true);
  const [tagRemoved, setTagRemoved] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [tagDisabled, setTagDisabled] = useState(false);
  const [dateMode, setDateMode] = useState<string | undefined>("single");
  const [dateCalendar, setDateCalendar] = useState<string | undefined>("single");
  const [dateActions, setDateActions] = useState<string | undefined>("none");
  const [datePast, setDatePast] = useState(false);
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date | null } | null>(null);
  const [tooltipColor, setTooltipColor] = useState<string | undefined>("default");
  const [tooltipSize, setTooltipSize] = useState<string | undefined>("medium");
  const [tooltipPlacement, setTooltipPlacement] = useState<string | undefined>("top");
  const [tooltipPinned, setTooltipPinned] = useState(false);
  const [tabsVariant, setTabsVariant] = useState<string | undefined>("indicator");
  const [tabsSize, setTabsSize] = useState<string | undefined>("medium");
  const [tabsIcon, setTabsIcon] = useState(true);
  const [tabsLabel, setTabsLabel] = useState(true);
  const [tabsBadge, setTabsBadge] = useState(false);
  const [tabsDisabled, setTabsDisabled] = useState(false);
  const [tabsValue, setTabsValue] = useState("overview");
  const [crumbEmphasis, setCrumbEmphasis] = useState<string | undefined>("default");
  const [crumbMaster, setCrumbMaster] = useState(true);
  const [crumbDepth, setCrumbDepth] = useState<string | undefined>("4");
  const [crumbCollapse, setCrumbCollapse] = useState(false);
  const [crumbLast, setCrumbLast] = useState("");
  const [progressType, setProgressType] = useState<string | undefined>("bar");
  const [progressBarTheme, setProgressBarTheme] = useState<string | undefined>("accent");
  const [progressCircleTheme, setProgressCircleTheme] = useState<string | undefined>("accent");
  const [progressValue, setProgressValue] = useState(40);
  const [progressLabel, setProgressLabel] = useState(true);
  const [dialogTheme, setDialogTheme] = useState<string | undefined>("default");
  const [accordionSize, setAccordionSize] = useState<string | undefined>("medium");
  const [accordionTheme, setAccordionTheme] = useState<string | undefined>("divider");
  const [accordionOpen, setAccordionOpen] = useState<string>("seats");
  const [alertTheme, setAlertTheme] = useState<string | undefined>("default");
  const [alertSize, setAlertSize] = useState<string | undefined>("medium");
  const [alertLeading, setAlertLeading] = useState(true);
  const [alertAction, setAlertAction] = useState(true);
  const [alertClose, setAlertClose] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [paginationTheme, setPaginationTheme] = useState<string | undefined>("primary");
  const [paginationSize, setPaginationSize] = useState<string | undefined>("xsmall");
  const [paginationPage, setPaginationPage] = useState(1);
  const [paginationPageSize, setPaginationPageSize] = useState(50);
  const [skeletonType, setSkeletonType] = useState<string | undefined>("text");
  const [skeletonLines, setSkeletonLines] = useState<string | undefined>("3");
  const [skeletonHeading, setSkeletonHeading] = useState<string | undefined>("medium");
  const [skeletonShape, setSkeletonShape] = useState<string | undefined>("rectangle");
  const [skeletonShapeSize, setSkeletonShapeSize] = useState<string | undefined>("medium");
  const [skeletonAnimated, setSkeletonAnimated] = useState(true);
  const [toastType, setToastType] = useState<string | undefined>("neutral");
  const [toastTitle, setToastTitle] = useState(true);
  const [toastCaption, setToastCaption] = useState(true);
  const [toastAction, setToastAction] = useState(true);
  const [toastClose, setToastClose] = useState(true);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [dialogActions, setDialogActions] = useState<string | undefined>("dual");
  const [dialogIcon, setDialogIcon] = useState(true);
  const [dialogDescription, setDialogDescription] = useState(true);
  const [dialogCustom, setDialogCustom] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResult, setDialogResult] = useState("");
  if (page === "design-tokens") {
    if (activeCollection) {
      const collection = collections.find((item) => item.slug === activeCollection);
      return (
        <PlatformPageTemplate title={collection?.name ?? activeCollection} titleLines={collection?.name === "Global Colors" ? ["Global", "Colors"] : undefined} eyebrow="Design Tokens" description={collection?.purpose}>
          <TokenCollectionPage collection={activeCollection} embedded />
        </PlatformPageTemplate>
      );
    }
    return (
      <PlatformPageTemplate title="Design Tokens" eyebrow="Foundations" description="The source contract for primitives, semantic tokens, component themes, typography, spacing and responsive foundations.">
        <FoundationOverview embedded />
        <section className="platform-token-links" aria-label="Token collection pages">
          <p className="foundation-eyebrow">Collections</p>
          <div>{collections.map((collection) => <button key={collection.slug} onClick={() => onCollectionClick?.(collection.slug)} type="button">{collection.name}<span>{collection.variableCount.toLocaleString("en-US")} vars</span></button>)}</div>
        </section>
      </PlatformPageTemplate>
    );
  }
  if (page === "typography") {
    return <PlatformPageTemplate title="Typography" eyebrow="Foundations" description="Composite typography contracts exported from Figma and connected to Typography and Emphasis variables."><TextStylesGallery embedded sampleTypography={previewTypography} /></PlatformPageTemplate>;
  }
  if (page === "iconography") {
    return <PlatformPageTemplate title="Iconography" eyebrow="Foundations" description="SVG icons are generated from one source folder and rendered through one component."><IconGallery embedded /><ComponentGuidelines page="iconography" /></PlatformPageTemplate>;
  }

  if (page === "button") {
    return (
      <ExamplePage page="button" eyebrow="Components / Button" title="Button" description="Establish consistent interaction across project states with defined button styles. Button Style Tokens act as meaningful identifiers for your visual system's standard interaction elements.">
        <div className="platform-component-sections">
          <ButtonSetPlayground title="Button / Main" appearance="main" levels={["primary", "accent", "secondary", "tertiary", "danger", "danger-subtle", "positive", "positive-subtle", "surface"]} sizes={["xs", "sm", "md", "lg", "xl"]} />
          <ButtonSetPlayground title="Button / Flat" appearance="flat" levels={["primary", "accent"]} sizes={["xs", "sm", "md", "lg", "xl"]} />
          <ButtonSetPlayground title="Button / Overlay" appearance="overlay" levels={["inverse", "white", "white-overlay", "black-overlay"]} sizes={["xs", "sm", "md", "lg", "xl"]} />
          <ButtonSetPlayground title="Button / Icon-Main" appearance="main" iconOnly levels={["primary", "accent", "secondary", "tertiary", "danger", "danger-secondary", "positive", "positive-secondary", "surface"]} sizes={["2xs", "xs", "sm", "md", "lg", "xl"]} />
          <ButtonSetPlayground title="Button / Icon-Flat" appearance="flat" iconOnly levels={["primary", "secondary", "accent", "danger", "positive"]} sizes={["xs", "sm", "md", "lg", "xl"]} />
          <ButtonSetPlayground title="Button / Icon-Overlay" appearance="overlay" iconOnly levels={["inverse", "white", "white-overlay", "black-overlay"]} sizes={["2xs", "xs", "sm", "md", "lg", "xl"]} />
        </div>
      </ExamplePage>
    );
  }

  if (page === "chip") {
    const resolvedChipVariant = (chipVariant ?? "advanced") as ChipVariant;
    const allowedChipSizes = resolvedChipVariant === "normal" ? ["xsmall", "small", "medium"] : ["small", "medium"];
    const resolvedChipSize = (allowedChipSizes.includes(chipSize ?? "") ? chipSize : "small") as ChipSize;
    const resolvedChipState: ChipState = chipDisabled ? "disabled" : "default";
    const resolvedChipTheme = (chipThemes[0] ?? "text-only") as ChipTheme;
    const chipLeading = resolvedChipTheme === "leading-icon" ? <Icon name="icon-cube-line" size={resolvedChipSize === "medium" ? "base" : "sm"} decorative /> : undefined;
    // Leading-Photo renders the shared Avatar/Single (Photo) primitive from an image source.
    const chipPhoto = resolvedChipTheme === "leading-photo" ? samplePhoto : undefined;
    const resolvedChipLevel = (chipLevel ?? "secondary") as ChipLevel;
    const chipStatusOptions = [{ id: "active", label: "Active" }, { id: "paused", label: "Paused" }, { id: "archived", label: "Archived" }];
    const chipThemeProps = `${resolvedChipTheme === "leading-icon" ? `
  leading={<Icon name="icon-cube-line" decorative />}` : ""}${resolvedChipTheme === "leading-photo" ? `
  photoSrc="/avatars/user.jpg"` : ""}${chipDisabled ? `
  disabled` : ""}`;
    const chipCode = resolvedChipVariant === "number-only"
      ? `import { Chip } from "@zen/design-system";

<Chip variant="number-only" size="${resolvedChipSize}" value={count}${chipDisabled ? " disabled" : ""} />`
      : resolvedChipVariant === "advanced"
        ? `import { Chip } from "@zen/design-system";

<Chip
  variant="advanced"
  size="${resolvedChipSize}"${chipThemeProps}
  dropdown
  selectionMode="${chipMultiple ? "multiple" : "single"}"
  selectionCount={selected.length}
  select={selected.length > 0}
  popoverOpen={open}
  onPopoverOpenChange={setOpen}${chipMultiple ? `
  popoverMultiple` : ""}
  popoverLabel="Status"
  popoverItems={options.map((o) => ({ ...o, selected: selected.includes(o.id) }))}
  onPopoverSelect={(item) => toggle(item.id)}
  onClearSelection={() => setSelected([])}
>
  Status
</Chip>`
        : `import { Chip } from "@zen/design-system";

<Chip
  variant="normal"
  size="${resolvedChipSize}"
  level="${resolvedChipLevel}"${chipThemeProps}
  select={selected}
  aria-pressed={selected}
  onClick={() => setSelected(!selected)}
>
  Chip
</Chip>`;
    return (
      <ExamplePage page="chip" eyebrow="Components / Chip" title="Chip/Pill" description="Normal, Advanced and Number-only variants mapped from the Figma Chip/Pill page.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Chip/Pill</h2>
          <div className="platform-playground-controls" aria-label="Chip playground controls">
            <PlaygroundFilterChip label="Variant" value={chipVariant} onChange={(value) => setChipVariant(String(value) || undefined)} options={["advanced", "normal", "number-only"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={resolvedChipSize} onChange={(value) => setChipSize(String(value) || undefined)} options={allowedChipSizes.map((id) => ({ id, label: id }))} />
            {resolvedChipVariant === "normal" ? <PlaygroundFilterChip label="Level" value={chipLevel} onChange={(value) => setChipLevel(String(value) || undefined)} options={["primary", "secondary"].map((id) => ({ id, label: id }))} /> : null}
            {resolvedChipVariant === "advanced" ? <PlaygroundToggle label="Multiple" selected={chipMultiple} onChange={(on) => { setChipMultiple(on); if (!on) setChipSelected((current) => current.slice(0, 1)); }} /> : null}
            {resolvedChipVariant !== "number-only" ? <PlaygroundFilterChip label="Theme" value={chipThemes} multiple onChange={(value) => setChipThemes(Array.isArray(value) ? value : [value])} options={["text-only", "leading-icon", "leading-photo"].map((id) => ({ id, label: id }))} /> : null}
            <PlaygroundToggle label="Disabled" selected={chipDisabled} onChange={setChipDisabled} />
          </div>
          <div data-typography={previewTypography} className="platform-example-row">
            {resolvedChipVariant === "number-only" ? (
              <Chip variant="number-only" size={resolvedChipSize} value={chipSelected.length || 3} state={resolvedChipState} />
            ) : resolvedChipVariant === "advanced" ? (
              <Chip
                variant="advanced" size={resolvedChipSize} state={resolvedChipState} theme={resolvedChipTheme} leading={chipLeading} photoSrc={chipPhoto}
                selectionMode={chipMultiple ? "multiple" : "single"} selectionCount={chipSelected.length} select={chipSelected.length > 0} dropdown
                popoverOpen={chipOpen} onPopoverOpenChange={setChipOpen} popoverMultiple={chipMultiple} popoverLabel="Status"
                popoverItems={chipStatusOptions.map((option) => ({ ...option, selected: chipSelected.includes(option.id) }))}
                onPopoverSelect={(item) => setChipSelected((current) => chipMultiple ? (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]) : (current[0] === item.id ? [] : [item.id]))}
                onClearSelection={chipSelected.length ? () => { setChipSelected([]); setChipOpen(false); } : undefined}
              >
                {chipSelected.length === 1 ? chipStatusOptions.find((option) => option.id === chipSelected[0])?.label : "Status"}
              </Chip>
            ) : (
              <Chip variant="normal" size={resolvedChipSize} level={resolvedChipLevel} state={resolvedChipState} theme={resolvedChipTheme} leading={chipLeading} photoSrc={chipPhoto} select={chipNormalSelected} aria-pressed={chipNormalSelected} onClick={() => setChipNormalSelected((on) => !on)}>
                Chip
              </Chip>
            )}
          </div>
          <PlatformCode code={chipCode} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "sidebar") {
    const resolvedSidebarVariant = (sidebarVariant ?? "basic") as SidebarVariant;
    const resolvedSidebarBackground = (sidebarBackground ?? "flat") as SidebarBackground;
    const sidebarIcon = (name: IconName) => <Icon name={name} size="base" />;
    const sidebarSections: SidebarSection[] = [
      { items: [
        { id: "dashboard", label: "Dashboard", selected: sidebarSelected === "dashboard", icon: sidebarIcon("icon-home-03-line") },
        { id: "inbox", label: "Inbox", counter: 12, selected: sidebarSelected === "inbox", icon: sidebarIcon("ic-inbox-01-line") },
        { id: "activity", label: "Activity", notificationDot: true, selected: sidebarSelected === "activity", icon: sidebarIcon("icon-bell-01-line") },
      ] },
      { label: "Projects", action: <IconButton appearance="main" level="tertiary" size="2xs" aria-label="New project" icon={<Icon name="icon-plus-line" />} />, items: [
        { id: "design-system", label: "Design system", dropdown: true, selected: sidebarSelected.startsWith("ds-"), icon: sidebarIcon("icon-cube-line"), children: [{ id: "ds-components", label: "Components", selected: sidebarSelected === "ds-components" }, { id: "ds-tokens", label: "Tokens", selected: sidebarSelected === "ds-tokens" }] },
        { id: "website", label: "Website", selected: sidebarSelected === "website", icon: sidebarIcon("icon-globe-02-line"), trailingAction: <Icon name="icon-dots-horizontal-line" size="base" decorative /> },
        { id: "archive", label: "Archive (read-only)", disabled: true, icon: sidebarIcon("icon-folder-line") },
      ] },
    ];
    const sidebarFooter = <><button type="button"><Icon name="ic-figma-line" size="base" /><span>Download Figma</span></button><button type="button"><Icon name="icon-message-chat-circle-line" size="base" /><span>Feedback</span></button></>;
    return (
      <ExamplePage page="sidebar" eyebrow="Components / Sidebar" title="Patterns/Sidebar" titleLines={["Patterns/", "Sidebar"]} description="One shared Sidebar preview with the Figma Basic, Small-Density and Workspace variants selectable from the playground.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Patterns/Sidebar</h2>
            <div className="platform-playground-controls" aria-label="Sidebar playground controls">
              <PlaygroundFilterChip label="Variant" value={sidebarVariant} onChange={(value) => setSidebarVariant(String(value) || undefined)} options={["basic", "small-density", "workspace"].map((id) => ({ id, label: id }))} />
              {resolvedSidebarVariant !== "workspace" ? <PlaygroundToggle label="Expand" selected={!sidebarCollapsed} onChange={(selected) => setSidebarCollapsed(!selected)} /> : null}
              {resolvedSidebarVariant === "workspace" ? <PlaygroundFilterChip label="Master Background" value={sidebarBackground} onChange={(value) => setSidebarBackground(String(value) || undefined)} options={["flat", "default", "inverse"].map((id) => ({ id, label: id }))} /> : null}
              {resolvedSidebarVariant === "workspace" ? <PlaygroundToggle label="Workspace Bar" selected={sidebarWorkspaceBar} onChange={setSidebarWorkspaceBar} /> : null}
              <PlaygroundToggle label="Sub Menu" selected={sidebarSubMenu} onChange={setSidebarSubMenu} />
          </div>
          <div data-typography={previewTypography} className="platform-example-row">
            <Sidebar
              variant={resolvedSidebarVariant}
              collapsed={sidebarCollapsed && resolvedSidebarVariant !== "workspace"}
              onCollapsedChange={setSidebarCollapsed}
              background={resolvedSidebarBackground}
              workspaceBar={sidebarWorkspaceBar}
              workspaceItems={[{ id: "workspace-a", label: "Workspace A", selected: true, icon: <Avatar size="medium" theme="accent" background="subtle" alt="">A</Avatar> }, { id: "workspace-b", label: "Workspace B", icon: <Avatar size="medium" theme="indigo" background="solid" alt="">B</Avatar> }]}
              search={resolvedSidebarVariant === "small-density" ? <Search size="small" placeholder="Search" /> : undefined}
              sections={sidebarSections}
              onItemClick={(item) => { if (!item.children) setSidebarSelected(item.id); }}
              footer={sidebarFooter}
              subMenu={sidebarSubMenu ? <div className="platform-sidebar-demo__submenu"><strong>Sub menu</strong><span>Slot content from the Figma master template.</span></div> : undefined}
            />
          </div>
          <PlatformCode code={`import { Sidebar } from "@zen/design-system";

<Sidebar
  variant="${resolvedSidebarVariant}"${resolvedSidebarVariant === "workspace" ? `
  background="${resolvedSidebarBackground}"
  workspaceBar={${sidebarWorkspaceBar}}` : `
  collapsed={${sidebarCollapsed}}
  onCollapsedChange={setCollapsed}`}
  sections={sections}
  onItemClick={(item) => setSelected(item.id)}
  footer={footer}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "input") {
    const resolvedInputKind = inputKind ?? "text";
    const resolvedInputSize = (inputSize ?? "medium") as InputSize;
    const resolvedInputState: InputState = inputReadOnly ? "read-only" : "default";
    // Read-only shows a committed value, never a placeholder.
    const ro = <T,>(sample: T) => (inputReadOnly ? sample : undefined);
    // Only plain text fields own the Leading-Trailing slots; select/date/number keep their built-in affordances.
    const inputSupportsSlots = resolvedInputKind === "text" || resolvedInputKind === "field-only";
    const sharedFieldProps = {
      label: inputLabel ? "Label" : undefined,
      helpText: inputHelp ? "Supporting help text" : undefined,
      error: inputError && !inputReadOnly ? "This field is required" : undefined,
      size: resolvedInputSize,
      state: resolvedInputState,
    };
    // Labelled slots are pickers (click → Popover); icon-only slots stay decorative and focus the field.
    const accountOptions = [
      { value: "user", label: "User", icon: <Icon name="icon-user-circle-line" decorative /> },
      { value: "team", label: "Team", icon: <Icon name="icon-users-line" decorative /> },
      { value: "guest", label: "Guest", icon: <Icon name="icon-user-square-line" decorative /> },
    ];
    const regionOptions = [
      { value: "vn", label: "VN", caption: "Vietnam · +84" },
      { value: "us", label: "US", caption: "United States · +1" },
      { value: "jp", label: "JP", caption: "Japan · +81" },
      { value: "sg", label: "SG", caption: "Singapore · +65" },
    ];
    const slotSize = resolvedInputSize === "xlarge" ? "large" : resolvedInputSize;
    const slotProps = {
      leading: inputSupportsSlots && inputLeading ? <InputLeadingTrailing size={slotSize} icon={<Icon name="icon-user-circle-line" decorative />} label={inputLeadingLabel ? "User" : undefined} showLabel={inputLeadingLabel}
        options={accountOptions} value={inputLeadingValue} onValueChange={setInputLeadingValue} popoverLabel="Account type" align="start" disabled={inputReadOnly} /> : undefined,
      trailing: inputSupportsSlots && inputTrailing ? <InputLeadingTrailing size={slotSize} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown
        options={regionOptions} value={inputTrailingValue} onValueChange={setInputTrailingValue} popoverLabel="Region" align="end" disabled={inputReadOnly} /> : undefined,
    };
    let inputPreview: ReactNode;
    let inputComponentName = "InputField";
    switch (resolvedInputKind) {
      case "field-only": inputPreview = <InputField {...sharedFieldProps} {...slotProps} label={undefined} helpText={undefined} error={undefined} placeholder="Field only" />; inputComponentName = "InputField"; break;
      case "input-content": inputPreview = <InputContent size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} state="default" text="Content" />; inputComponentName = "InputContent"; break;
      case "label": inputPreview = <InputLabel optional tooltip action="Action">Label</InputLabel>; inputComponentName = "InputLabel"; break;
      case "help-text": inputPreview = <InputHelpText theme="neutral" characterLimit="0/120">Supporting help text</InputHelpText>; inputComponentName = "InputHelpText"; break;
      case "leading-trailing": inputPreview = <InputLeadingTrailing size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} icon={inputLeading ? <Icon name="icon-globe-02-line" decorative /> : undefined} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown={inputTrailing} />; inputComponentName = "InputLeadingTrailing"; break;
      case "textarea": inputPreview = <TextAreaField key={`ta-${inputReadOnly}`} {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Tell us more" defaultValue={ro("Shipped the Date Picker range mode and fixed the Checkbox hover.")} />; inputComponentName = "TextAreaField"; break;
      case "textarea-primitive": inputPreview = <TextAreaField {...sharedFieldProps} label={undefined} helpText={undefined} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Textarea primitive" />; inputComponentName = "TextAreaField"; break;
      case "select": inputPreview = <SelectField key={`sel-${inputReadOnly}`} {...sharedFieldProps} readOnly={inputReadOnly} defaultValue={ro("brand-s1")} options={[{ label: "Neutral - S1", value: "neutral-s1" }, { label: "Brand - S1", value: "brand-s1" }]} />; inputComponentName = "SelectField"; break;
      case "date": inputPreview = <DateField key={`date-${inputReadOnly}`} {...sharedFieldProps} readOnly={inputReadOnly} defaultValue={ro("09/26/2026")} />; inputComponentName = "DateField"; break;
      case "autocomplete": inputPreview = <AutocompleteField label={sharedFieldProps.label} helpText={sharedFieldProps.helpText} error={sharedFieldProps.error} readOnly={inputReadOnly} options={[{ id: "button", label: "Button" }, { id: "chip", label: "Chip" }, { id: "input", label: "Input" }, { id: "popover", label: "Popover" }, { id: "search", label: "Search" }, { id: "tag", label: "Tag" }]} defaultValue={["button", "chip"]} />; inputComponentName = "AutocompleteField"; break;
      case "number-center": inputPreview = <NumberField {...sharedFieldProps} align="center" value={inputNumber} onValueChange={setInputNumber} min={0} max={10} />; inputComponentName = "NumberField"; break;
      case "number-left": inputPreview = <NumberField {...sharedFieldProps} align="left" value={inputNumber} onValueChange={setInputNumber} min={0} max={10} />; inputComponentName = "NumberField"; break;
      case "richtext": inputPreview = <RichTextField {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Write formatted content" />; inputComponentName = "RichTextField"; break;
      case "editor-bar": inputPreview = <RichTextEditorBar />; inputComponentName = "RichTextEditorBar"; break;
      case "control-bar-item": inputPreview = <><ControlBarSelectItem aria-label="Default" icon={<Icon name="icon-bold-01-line" decorative />} /><ControlBarSelectItem aria-label="Selected" state="selected" icon={<Icon name="icon-bold-01-line" decorative />} /></>; inputComponentName = "ControlBarSelectItem"; break;
      case "heading": inputPreview = <HeadingField key={`h-${inputReadOnly}`} headingSize="h2" readOnly={inputReadOnly} defaultValue={ro("Q4 roadmap")} placeholder="Section heading" />; inputComponentName = "HeadingField"; break;
      case "conditions": inputPreview = <InputConditions><InputConditionItem label="At least 8 characters" state="success" /><InputConditionItem label="Includes a number" state="default" /><InputConditionItem label="Avoids common passwords" state="wrong" /></InputConditions>; inputComponentName = "InputConditions"; break;
      default: inputPreview = <InputField key={`text-${inputReadOnly}`} {...sharedFieldProps} {...slotProps} placeholder="Enter your name" defaultValue={ro("Ava Chen")} />;
    }
    const showLeading = inputSupportsSlots && inputLeading;
    const showTrailing = inputSupportsSlots && inputTrailing;
    const fieldLines = [
      `size="${resolvedInputSize}"`,
      resolvedInputKind !== "field-only" && inputLabel ? `label="Label"` : "",
      resolvedInputKind !== "field-only" && inputHelp ? `helpText="Supporting help text"` : "",
      resolvedInputKind !== "field-only" && inputError && !inputReadOnly ? `error="This field is required"` : "",
      inputReadOnly ? "readOnly" : "",
      showLeading ? (inputLeadingLabel
        ? `leading={<InputLeadingTrailing label="User" popoverLabel="Account type" align="start"\n    options={accountTypes} value={account} onValueChange={setAccount} />}`
        : `leading={<InputLeadingTrailing icon={<Icon name="icon-user-circle-line" decorative />} />}`) : "",
      showTrailing ? (inputTrailingLabel
        ? `trailing={<InputLeadingTrailing label="VN" popoverLabel="Region"\n    options={regions} value={region} onValueChange={setRegion} />}`
        : `trailing={<InputLeadingTrailing dropdown />}`) : "",
      resolvedInputKind === "select" ? "options={options}" : "",
      resolvedInputKind === "autocomplete" ? "options={options}\n  value={selected}\n  onChange={setSelected}" : "",
      resolvedInputKind === "date" ? "onDateChange={setDate}" : "",
      resolvedInputKind.startsWith("number") ? `align="${resolvedInputKind === "number-center" ? "center" : "left"}"\n  min={0}\n  max={10}\n  value={quantity}\n  onValueChange={setQuantity}` : "",
      ["text", "field-only", "textarea", "richtext"].includes(resolvedInputKind) ? "value={value}\n  onChange={(event) => setValue(event.target.value)}" : "",
    ].filter(Boolean);
    const inputCode = `import { ${[inputComponentName, showLeading || showTrailing ? "InputLeadingTrailing" : ""].filter(Boolean).join(", ")} } from "@zen/design-system";${showLeading ? `
import { Icon } from "@zen/design-system/icons";` : ""}

<${inputComponentName}
  ${fieldLines.join("\n  ")}
/>`;
    return (
      <ExamplePage page="input" eyebrow="Components / Input" title="Input" description="Production field compositions from the Figma Input page, with leading/trailing slots and native interaction states.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Input</h2>
          <div className="platform-playground-controls" aria-label="Input playground controls">
            <PlaygroundFilterChip label="Type" value={inputKind} onChange={(value) => setInputKind(String(value) || undefined)} options={inputPlaygroundKinds.map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={inputSize} onChange={(value) => setInputSize(String(value) || undefined)} options={["small", "medium", "large", "xlarge"].map((id) => ({ id, label: id }))} />
            <PlaygroundToggle label="Label" selected={inputLabel} onChange={setInputLabel} />
            <PlaygroundToggle label="Help Text" selected={inputHelp} onChange={setInputHelp} />
            {inputSupportsSlots ? <>
              <PlaygroundToggle label="Leading" selected={inputLeading} onChange={setInputLeading} />
              {inputLeading ? <PlaygroundToggle label="Leading Label" selected={inputLeadingLabel} onChange={setInputLeadingLabel} /> : null}
              <PlaygroundToggle label="Trailing" selected={inputTrailing} onChange={setInputTrailing} />
              {inputTrailing ? <PlaygroundToggle label="Trailing Label" selected={inputTrailingLabel} onChange={setInputTrailingLabel} /> : null}
            </> : null}
            {resolvedInputKind !== "field-only" ? <PlaygroundToggle label="Error" selected={inputError} onChange={setInputError} /> : null}
            <PlaygroundToggle label="Read-only" selected={inputReadOnly} onChange={setInputReadOnly} />
          </div>
          <div data-typography={previewTypography} className="platform-input-preview">{inputPreview}</div>
          <PlatformCode code={inputCode} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "search") {
    const resolvedSearchTheme = (searchTheme ?? "default") as SearchTheme;
    const resolvedSearchSize = (searchSize ?? "medium") as SearchSize;
    const resolvedSearchIcon = searchIcon !== "no";
    const resolvedSearchVariant = (searchVariant ?? "default") as SearchVariant;
    const isPopoverSearch = resolvedSearchVariant === "popover";
    return (
      <ExamplePage page="search" eyebrow="Components / Search" title="Search" description="Search/Default and Search/Popover with default, filter-icon and filter-dropdown themes, mapped from the Figma Search page.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Search</h2>
          <div className="platform-playground-controls" aria-label="Search playground controls">
            <PlaygroundFilterChip label="Variant" value={searchVariant} onChange={(value) => setSearchVariant(String(value) || undefined)} options={["default", "popover"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Theme" value={searchTheme} onChange={(value) => setSearchTheme(String(value) || undefined)} options={["default", "filter-icon", "filter-dropdown"].map((id) => ({ id, label: id }))} />
            {isPopoverSearch ? null : <PlaygroundFilterChip label="Size" value={searchSize} onChange={(value) => setSearchSize(String(value) || undefined)} options={["small", "medium"].map((id) => ({ id, label: id }))} />}
            <PlaygroundToggle label="Icon Search" selected={searchIcon !== "no"} onChange={(selected) => setSearchIcon(selected ? "yes" : "no")} />
            <PlaygroundToggle label="Disabled" selected={searchDisabled} onChange={setSearchDisabled} />
          </div>
          <div data-typography={previewTypography} className="platform-example-row platform-search-row">
            <Search variant={resolvedSearchVariant} theme={resolvedSearchTheme} size={resolvedSearchSize} disabled={searchDisabled} iconSearch={resolvedSearchIcon} placeholder="Search components" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} filterLabel="All" />
          </div>
          <PlatformCode code={`import { Search } from "@zen/design-system";

<Search${isPopoverSearch ? `
  variant="popover"` : ""}
  theme="${resolvedSearchTheme}"${isPopoverSearch ? "" : `
  size="${resolvedSearchSize}"`}${resolvedSearchIcon ? "" : `
  iconSearch={false}`}${searchDisabled ? `
  disabled` : ""}${resolvedSearchTheme === "filter-dropdown" ? `
  filterLabel="All"` : ""}
  placeholder="Search components"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "segmented") {
    const resolvedLevel = (segmentedLevel ?? "primary") as SegmentedLevel;
    const resolvedSize = (segmentedSize ?? "medium") as SegmentedSize;
    // An item needs at least an icon or a label: turning both off keeps the icon.
    const showSegIcon = segmentedIcon || !segmentedLabel;
    const segmentedOptions = [
      { id: "overview", label: segmentedLabel ? "Overview" : null, leading: showSegIcon ? <Icon name="icon-grid-01-line" decorative /> : undefined, badge: segmentedBadge ? 2 : undefined },
      { id: "tokens", label: segmentedLabel ? "Tokens" : null, leading: showSegIcon ? <Icon name="icon-colors-line" decorative /> : undefined, badge: segmentedBadge ? 4 : undefined },
      { id: "components", label: segmentedLabel ? "Components" : null, leading: showSegIcon ? <Icon name="icon-cube-line" decorative /> : undefined },
    ];
    return <ExamplePage page="segmented" eyebrow="Components / Segmented" title="Segmented" description="Mutually exclusive options using the Figma Segmented container and item primitives.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Segmented</h2>
        <div className="platform-playground-controls" aria-label="Segmented playground controls">
          <PlaygroundFilterChip label="Level" value={segmentedLevel} onChange={(value) => setSegmentedLevel(String(value) || undefined)} options={["primary", "secondary"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={segmentedSize} onChange={(value) => setSegmentedSize(String(value) || undefined)} options={["small", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Icon" selected={segmentedIcon} onChange={setSegmentedIcon} />
          <PlaygroundToggle label="Label" selected={segmentedLabel} onChange={setSegmentedLabel} />
          <PlaygroundToggle label="Badge" selected={segmentedBadge} onChange={setSegmentedBadge} />
          <PlaygroundToggle label="Disabled" selected={segmentedDisabled} onChange={setSegmentedDisabled} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row"><Segmented aria-label="Section" level={resolvedLevel} size={resolvedSize} disabled={segmentedDisabled} value={segmentedValue} onChange={setSegmentedValue} options={segmentedOptions} /></div>
        <PlatformCode code={`import { Segmented } from "@zen/design-system";

<Segmented
  aria-label="Section"
  level="${resolvedLevel}"
  size="${resolvedSize}"${segmentedDisabled ? `
  disabled` : ""}
  value={value}
  onChange={setValue}
  options={[
    { id: "overview", label: ${segmentedLabel ? `"Overview"` : "null"}${showSegIcon ? `, leading: <Icon name="icon-grid-01-line" decorative />` : ""}${segmentedBadge ? ", badge: 2" : ""} },
    { id: "tokens", label: ${segmentedLabel ? `"Tokens"` : "null"}${showSegIcon ? `, leading: <Icon name="icon-colors-line" decorative />` : ""}${segmentedBadge ? ", badge: 4" : ""} },
    { id: "components", label: ${segmentedLabel ? `"Components"` : "null"}${showSegIcon ? `, leading: <Icon name="icon-cube-line" decorative />` : ""} },
  ]}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "toggle") {
    const resolvedSize = (toggleSize ?? "medium") as ToggleSize;
    const resolvedTheme = (toggleTheme ?? "text-first") as ToggleTheme;
    return <ExamplePage page="toggle" eyebrow="Components / Toggle" title="Toggle" description="Toggle/Button and Toggle/Content are composed into the complete Figma Toggle set with Size, State, Select and Theme axes.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Toggle</h2>
        <div className="platform-playground-controls" aria-label="Toggle playground controls">
          <PlaygroundFilterChip label="Size" value={toggleSize} onChange={(value) => setToggleSize(String(value) || undefined)} options={["small", "medium", "large"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={toggleTheme} onChange={(value) => setToggleTheme(String(value) || undefined)} options={["text-first", "toggle-first"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={toggleSelected} onChange={setToggleSelected} />
          <PlaygroundToggle label="Caption" selected={toggleCaption} onChange={setToggleCaption} />
          <PlaygroundToggle label="Bold" selected={toggleBold} onChange={setToggleBold} />
          <PlaygroundToggle label="Disabled" selected={toggleDisabled} onChange={setToggleDisabled} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row"><Toggle size={resolvedSize} disabled={toggleDisabled} theme={resolvedTheme} selected={toggleSelected} onSelectedChange={setToggleSelected} label="Enable notifications" caption={toggleCaption ? "Receive updates for this workspace." : undefined} bold={toggleBold} /></div>
        <PlatformCode code={`import { Toggle } from "@zen/design-system";

<Toggle
  size="${resolvedSize}"
  theme="${resolvedTheme}"${toggleDisabled ? `
  disabled` : ""}
  selected={selected}
  onSelectedChange={setSelected}
  label="Enable notifications"${toggleCaption ? `
  caption="Receive updates for this workspace."` : ""}${toggleBold ? `
  bold` : ""}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "avatar") {
    const resolvedSize = (avatarSize ?? "medium") as AvatarSize;
    const resolvedTheme = (avatarTheme ?? "accent") as AvatarTheme;
    const resolvedShape = (avatarShape ?? "circle") as AvatarShape;
    const resolvedBackground = (avatarBackground ?? "solid") as AvatarBackground;
    const avatarStackPeople: Array<{ alt: string; children: string; theme: AvatarTheme }> = [{ alt: "Ava Chen", children: "AC", theme: "blue" }, { alt: "Bao Nguyen", children: "BN", theme: "green" }, { alt: "Chi Tran", children: "CT", theme: "purple" }, { alt: "Duy Le", children: "DL", theme: "red" }, { alt: "Em Pham", children: "EP", theme: "teal" }];
    const avatarProps = [`size="${resolvedSize}"`, `theme="${resolvedTheme}"`, resolvedShape !== "circle" ? `shape="${resolvedShape}"` : "", resolvedBackground !== "solid" ? `background="${resolvedBackground}"` : "", resolvedTheme === "photo" ? `src={user.photo}` : "", `alt="Zen Design"`, avatarStatus === "yes" ? "status" : "", avatarFocus ? "focus" : ""].filter(Boolean);
    return <ExamplePage page="avatar" eyebrow="Components / Avatar" title="Avatar" description="Avatar/Single and Avatar/Stack use the size, theme, shape, background and status axes from Figma.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Avatar</h2>
        <div className="platform-playground-controls" aria-label="Avatar playground controls">
          <PlaygroundFilterChip label="Size" value={avatarSize} onChange={(value) => setAvatarSize(String(value) || undefined)} options={["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={avatarTheme} onChange={(value) => setAvatarTheme(String(value) || undefined)} options={avatarThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Shape" value={avatarShape} onChange={(value) => setAvatarShape(String(value) || undefined)} options={["circle", "square"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={avatarBackground} onChange={(value) => setAvatarBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Status" selected={avatarStatus === "yes"} onChange={(selected) => setAvatarStatus(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Focus" selected={avatarFocus} onChange={setAvatarFocus} />
          <PlaygroundFilterChip label="Stack Count" value={avatarStackCount} onChange={(value) => setAvatarStackCount(String(value) || undefined)} options={["1", "2", "3", "4", "5"].map((id) => ({ id, label: id }))} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row">
          {resolvedTheme === "photo"
            ? <Avatar size={resolvedSize} theme="photo" shape={resolvedShape} background={resolvedBackground} src={samplePhoto} alt="Zen Design" status={avatarStatus === "yes"} focus={avatarFocus} />
            : <Avatar size={resolvedSize} theme={resolvedTheme} shape={resolvedShape} background={resolvedBackground} alt="Zen Design" status={avatarStatus === "yes"} focus={avatarFocus}>ZD</Avatar>}
          <AvatarStack size={resolvedSize} shape={resolvedShape} background={resolvedBackground} items={avatarStackPeople.slice(0, Number(avatarStackCount ?? 4))} />
        </div>
        <PlatformCode code={`import { Avatar, AvatarStack } from "@zen/design-system";

<Avatar
  ${avatarProps.join("\n  ")}
>${resolvedTheme === "photo" ? "" : `
  ZD
`}</Avatar>

<AvatarStack
  size="${resolvedSize}"${resolvedShape !== "circle" ? `
  shape="${resolvedShape}"` : ""}
  items={people.slice(0, ${avatarStackCount ?? 4}).map((p) => ({ alt: p.name, children: p.initials, theme: p.theme }))}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "checkbox") {
    const resolvedSide = (checkboxSide ?? "left") as CheckboxSide;
    return <ExamplePage page="checkbox" eyebrow="Components / Checkbox" title="Checkbox" description="Checkbox/Text with left or right mark, caption, selection and interaction states.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Checkbox</h2>
        <div className="platform-playground-controls" aria-label="Checkbox playground controls">
          <PlaygroundFilterChip label="Side" value={checkboxSide} onChange={(value) => setCheckboxSide(String(value) || undefined)} options={["left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={checkboxChecked} onChange={setCheckboxChecked} />
          <PlaygroundToggle label="Indeterminate" selected={checkboxIndeterminate} onChange={setCheckboxIndeterminate} />
          <PlaygroundToggle label="Caption" selected={checkboxCaption} onChange={setCheckboxCaption} />
          <PlaygroundToggle label="Bold" selected={checkboxBold} onChange={setCheckboxBold} />
          <PlaygroundToggle label="Disabled" selected={checkboxDisabled} onChange={setCheckboxDisabled} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row"><Checkbox checked={checkboxChecked || checkboxIndeterminate} indeterminate={checkboxIndeterminate} onChange={(next) => { setCheckboxChecked(next); setCheckboxIndeterminate(false); }} disabled={checkboxDisabled} checkSide={resolvedSide} label="Include source maps" caption={checkboxCaption ? "Useful for debugging production builds." : undefined} bold={checkboxBold} /></div>
        <PlatformCode code={`import { Checkbox } from "@zen/design-system";

<Checkbox${resolvedSide === "right" ? `
  checkSide="right"` : ""}
  checked={checked}${checkboxIndeterminate ? `
  indeterminate // some, but not all, children selected` : ""}
  onChange={setChecked}${checkboxDisabled ? `
  disabled` : ""}
  label="Include source maps"${checkboxCaption ? `
  caption="Useful for debugging production builds."` : ""}${checkboxBold ? `
  bold` : ""}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "radio-button") {
    const resolvedSide = (radioSide ?? "left") as RadioSide;
    const radioOptions = [
      { id: "semantic", label: "Use semantic tokens", caption: "Recommended for component consumers." },
      { id: "primitive", label: "Use primitive tokens", caption: "Only for building new components." },
      { id: "custom", label: "Use custom values", caption: "Not synced with Figma." },
    ];
    return <ExamplePage page="radio-button" eyebrow="Components / Radio Button" title="Radio Button" description="Radio-Button/Text with mutually exclusive selection, side and state axes from Figma.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Radio Button</h2>
        <div className="platform-playground-controls" aria-label="Radio playground controls">
          <PlaygroundFilterChip label="Side" value={radioSide} onChange={(value) => setRadioSide(String(value) || undefined)} options={["left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Caption" selected={radioCaption} onChange={setRadioCaption} />
          <PlaygroundToggle label="Bold" selected={radioBold} onChange={setRadioBold} />
          <PlaygroundToggle label="Disabled" selected={radioDisabled} onChange={setRadioDisabled} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row"><div className="platform-radio-group" role="radiogroup" aria-label="Token source">
          {radioOptions.map((option) => <RadioButton key={option.id} name="radio-preview" value={option.id} checked={radioValue === option.id} onChange={() => setRadioValue(option.id)} disabled={radioDisabled} radioSide={resolvedSide} label={option.label} caption={radioCaption ? option.caption : undefined} bold={radioBold} />)}
        </div></div>
        <PlatformCode code={`import { RadioButton } from "@zen/design-system";

<div role="radiogroup" aria-label="Token source">
  {options.map((option) => (
    <RadioButton
      key={option.id}
      name="token-source"
      value={option.id}${resolvedSide === "right" ? `
      radioSide="right"` : ""}
      checked={value === option.id}
      onChange={() => setValue(option.id)}${radioDisabled ? `
      disabled` : ""}
      label={option.label}${radioCaption ? `
      caption={option.caption}` : ""}${radioBold ? `
      bold` : ""}
    />
  ))}
</div>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "badge") {
    const resolvedSize = (badgeSize ?? "medium") as BadgeSize;
    const resolvedTheme = (badgeTheme ?? "neutral") as BadgeTheme;
    const resolvedBackground = (badgeBackground ?? "solid") as BadgeBackground;
    const showLeading = badgeLeading === "yes";
    const showRemove = badgeRemove === "yes";
    return <ExamplePage page="badge" eyebrow="Components / Badge" title="Badge" description="Badge and Badge-Counter for compact status, category and count communication.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Badge</h2>
        <div className="platform-playground-controls" aria-label="Badge playground controls">
          <PlaygroundFilterChip label="Size" value={badgeSize} onChange={(value) => setBadgeSize(String(value) || undefined)} options={["xsmall", "small", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={badgeTheme} onChange={(value) => setBadgeTheme(String(value) || undefined)} options={badgeThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={badgeBackground} onChange={(value) => setBadgeBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Leading Icon" selected={badgeLeading === "yes"} onChange={(selected) => setBadgeLeading(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Remove" selected={badgeRemove === "yes"} onChange={(selected) => { setBadgeRemove(selected ? "yes" : "no"); setBadgeRemoved(false); }} />
          <PlaygroundFilterChip label="Counter" value={badgeCount} onChange={(value) => setBadgeCount(String(value) || undefined)} options={["1", "7", "42", "99+"].map((id) => ({ id, label: id }))} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row">
          {badgeRemoved
            ? <Button appearance="main" level="tertiary" size="xs" onClick={() => setBadgeRemoved(false)}>Restore badge</Button>
            : <Badge size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} leadingIcon={showLeading} leading={showLeading ? <Icon name="icon-check-line" decorative /> : undefined} remove={showRemove} onRemove={() => setBadgeRemoved(true)}>Approved</Badge>}
          <BadgeCounter size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} value={badgeCount ?? "7"} />
        </div>
        <PlatformCode code={`import { Badge, BadgeCounter } from "@zen/design-system";${showLeading ? `
import { Icon } from "@zen/design-system/icons";` : ""}

<Badge
  size="${resolvedSize}"
  theme="${resolvedTheme}"
  background="${resolvedBackground}"${showLeading ? `
  leading={<Icon name="icon-check-line" decorative />}` : `
  leadingIcon={false}`}${showRemove ? `
  remove
  onRemove={() => removeFilter("approved")}` : ""}
>
  Approved
</Badge>

<BadgeCounter size="${resolvedSize}" theme="${resolvedTheme}" background="${resolvedBackground}" value={${badgeCount === "99+" ? `"99+"` : badgeCount ?? 7}} />`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "popover") {
    const popoverKind = (popoverContent ?? "icon") as PopoverContentKind;
    const popoverSet = popoverContentSet(popoverKind, popoverCaption);
    // Manual-Add-New: values created from the popover join the list (and become the selection).
    const createdItems: PopoverItemData[] = popoverCreated.map((label) => ({ id: `new-${label}`, label, ...(popoverKind === "badge" ? { theme: "badge" as const, badgeTheme: "neutral" as const } : {}) }));
    const popoverItems: PopoverItemData[] = [...popoverSet.items, ...createdItems].map((item) => ({ ...item, selected: popoverSelected === item.id }));
    const popoverCurrent = popoverItems.find((item) => item.id === popoverSelected);
    // The trigger mirrors the chosen option: icon, avatar/photo or plain label.
    const popoverChipLeading = popoverKind === "icon" || popoverKind === "dock-icon" ? popoverCurrent?.leading : undefined;
    const popoverChipPhoto = popoverKind.startsWith("avatar") || popoverKind.startsWith("photo") ? popoverCurrent?.photoSrc : undefined;
    const visibleItems = popoverItems.filter((item) => String(item.label).toLowerCase().includes(popoverSearch.toLowerCase()));
    return <ExamplePage page="popover" eyebrow="Components / Popover" title="Popover" description="The shared Popover surface and Item primitive used by Select, Chip advanced and other dropdown compositions.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Popover</h2>
        <div className="platform-playground-controls" aria-label="Popover playground controls">
          <PlaygroundFilterChip label="Trigger" value={popoverTrigger} onChange={(value) => { setPopoverTrigger(String(value) || undefined); setPopoverOpen(false); if (value === "select") setPopoverContent("text-only"); }} options={[{ id: "chip", label: "Chip" }, { id: "select", label: "Select Input" }]} />
          {popoverTrigger !== "select" ? <PlaygroundFilterChip label="Content" value={popoverContent} onChange={(value) => { const kind = (String(value) || "icon") as PopoverContentKind; setPopoverContent(kind); setPopoverCreated([]); setPopoverSelected(popoverContentSet(kind, false).items[0].id); setPopoverSearch(""); setPopoverOpen(true); }} options={popoverContentKinds.map((id) => ({ id, label: id }))} /> : null}
          {popoverKind !== "badge" ? <PlaygroundToggle label="Caption" selected={popoverCaption} onChange={setPopoverCaption} /> : null}
          {popoverTrigger !== "select" ? <PlaygroundToggle label="Manual-Add-New" selected={popoverCreateOn} onChange={(on) => { setPopoverCreateOn(on); setPopoverSearch(""); setPopoverOpen(true); }} /> : null}
          <PlaygroundToggle label="Label" selected={popoverLabelOn} onChange={setPopoverLabelOn} />
          <PlaygroundToggle label="Search" selected={popoverSearchOn} onChange={(on) => { setPopoverSearchOn(on); if (!on) setPopoverSearch(""); }} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-popover-preview">
          {popoverTrigger === "select" ? (
            <SelectField
              className="platform-popover-select"
              label={popoverSet.title}
              size="small"
              value={popoverSelected}
              onChange={(event) => setPopoverSelected(event.target.value)}
              options={popoverItems.map((item) => ({ value: item.id, label: String(item.label) }))}
              popoverLabel={popoverLabelOn ? popoverSet.title : undefined}
              popoverSearch={popoverSearchOn}
            />
          ) : (
            <Chip
              variant="advanced"
              size="small"
              leading={popoverChipLeading}
              photoSrc={popoverChipPhoto}
              dropdown
              popoverOpen={popoverOpen}
              onPopoverOpenChange={(open) => { setPopoverOpen(open); if (!open) setPopoverSearch(""); }}
              popoverLabel={popoverLabelOn ? popoverSet.title : undefined}
              popoverSearch={popoverSearchOn || popoverCreateOn}
              popoverSearchValue={popoverSearch}
              onPopoverSearchChange={setPopoverSearch}
              // Manual-Add-New filters by its own query and appends the Create row for a new value.
              popoverItems={popoverCreateOn ? popoverItems : visibleItems}
              onPopoverCreate={popoverCreateOn ? (value) => { setPopoverCreated((current) => [...current, value]); setPopoverSelected(`new-${value}`); setPopoverSearch(""); } : undefined}
              onPopoverSelect={(item) => setPopoverSelected(item.id)}
            >
              {String(popoverCurrent?.label ?? popoverSet.title)}
            </Chip>
          )}
        </div>
        <PlatformCode code={popoverTrigger === "select" ? `import { SelectField } from "@zen/design-system";

// SelectField owns the trigger, open state and the shared Popover.
<SelectField
  label="${popoverSet.title}"
  size="small"
  value={value}
  onChange={(event) => setValue(event.target.value)}
  options={options}${popoverLabelOn ? `
  popoverLabel="${popoverSet.title}"` : ""}${popoverSearchOn ? `
  popoverSearch` : ""}
/>` : `import { Chip } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";

// Chip (Advanced) is the trigger; it composes the shared Popover.
<Chip
  variant="advanced"
  size="small"
${popoverChipLeading ? `  leading={selected.leading}
` : ""}${popoverChipPhoto ? `  photoSrc={selected.photoSrc}
` : ""}  dropdown
  popoverOpen={open}
  onPopoverOpenChange={setOpen}${popoverLabelOn ? `
  popoverLabel="${popoverSet.title}"` : ""}${popoverSearchOn ? `
  popoverSearch
  popoverSearchValue={query}
  onPopoverSearchChange={setQuery}` : ""}
  // Content theme "${popoverKind}": each item looks like
  // ${popoverSet.code}
  popoverItems={items.map((item) => ({ ...item, selected: item.id === value }))}${popoverCreateOn ? `
  // Manual-Add-New: "Create" + Accent Badge for a value that isn't listed; Enter creates it.
  onPopoverCreate={(value) => addOption(value)}` : ""}
  onPopoverSelect={(item) => setValue(item.id)}
>
  {selectedLabel}
</Chip>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "tag") {
    const resolvedTheme = (tagTheme ?? "text-only") as TagTheme;
    const tagProps = [resolvedTheme === "leading-icon" ? `leading={<Icon name="icon-hash-02-line" decorative />}` : "", resolvedTheme === "leading-photo" ? `photoSrc={user.photo}` : "", tagError ? "error" : "", tagDisabled ? "disabled" : "", tagRemove ? `remove\n  onRemove={() => removeTag(id)}` : ""].filter(Boolean);
    return <ExamplePage page="tag" eyebrow="Components / Tag" title="Tag" description="Tag shows a chosen value inside fields such as Autocomplete, with icon or photo, error and removable variants from Figma.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Tag</h2>
        <div className="platform-playground-controls" aria-label="Tag playground controls">
          <PlaygroundFilterChip label="Theme" value={tagTheme} onChange={(value) => setTagTheme(String(value) || undefined)} options={["text-only", "leading-icon", "leading-photo"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Remove" selected={tagRemove} onChange={(on) => { setTagRemove(on); setTagRemoved(false); }} />
          <PlaygroundToggle label="Error" selected={tagError} onChange={setTagError} />
          <PlaygroundToggle label="Disabled" selected={tagDisabled} onChange={setTagDisabled} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row">
          {tagRemoved
            ? <Button appearance="main" level="tertiary" size="xs" onClick={() => setTagRemoved(false)}>Restore tag</Button>
            : <Tag leading={resolvedTheme === "leading-icon" ? <Icon name="icon-hash-02-line" decorative /> : undefined} photoSrc={resolvedTheme === "leading-photo" ? samplePhoto : undefined} error={tagError} disabled={tagDisabled} remove={tagRemove} onRemove={() => setTagRemoved(true)}>{resolvedTheme === "leading-photo" ? "Ava Chen" : "design-system"}</Tag>}
        </div>
        <PlatformCode code={`import { Tag } from "@zen/design-system";${resolvedTheme === "leading-icon" ? `
import { Icon } from "@zen/design-system/icons";` : ""}

<Tag${tagProps.length ? `
  ${tagProps.join("\n  ")}
` : ""}>
  ${resolvedTheme === "leading-photo" ? "Ava Chen" : "design-system"}
</Tag>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "date-picker") {
    const resolvedMode = (dateMode ?? "single") as "single" | "range";
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const summary = resolvedMode === "range"
      ? dateRange ? `${fmt(dateRange.start)} → ${dateRange.end ? fmt(dateRange.end) : "…"}` : "Pick a start date, then an end date."
      : dateValue ? fmt(dateValue) : "Pick a date.";
    const actions = dateActions === "none" ? undefined : dateActions as "single" | "dual";
    const resolvedCalendar = (dateCalendar ?? "single") as "single" | "dual";
    return <ExamplePage page="date-picker" eyebrow="Components / Date Picker" title="Date Picker" description="Date-Picker/Single-Calendar and Dual-Calendar with single or range selection, disabled dates and optional actions. Click the month and year of a single calendar to pick them directly.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Date Picker</h2>
        <div className="platform-playground-controls" aria-label="Date Picker playground controls">
          <PlaygroundFilterChip label="Calendar" value={dateCalendar} onChange={(value) => { setDateCalendar(String(value) || undefined); setDateValue(null); setDateRange(null); }} options={[{ id: "single", label: "Single" }, { id: "dual", label: "Dual" }]} />
          <PlaygroundFilterChip label="Selection" value={dateMode} onChange={(value) => { setDateMode(String(value) || undefined); setDateValue(null); setDateRange(null); }} options={["single", "range"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Actions" value={dateActions} onChange={(value) => setDateActions(String(value) || undefined)} options={["none", "single", "dual"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Disable Past Dates" selected={datePast} onChange={setDatePast} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-date-picker-preview">
          <div className="platform-date-picker-inline"><DatePicker key={`${resolvedCalendar}-${resolvedMode}`} calendar={resolvedCalendar} selectionMode={resolvedMode} value={resolvedMode === "single" ? dateValue : undefined} onChange={resolvedMode === "single" ? setDateValue : undefined} onRangeChange={setDateRange} minDate={datePast ? today : undefined} showActions={Boolean(actions)} action={actions} /></div>
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Base/Medium"]}`} aria-live="polite">{summary}</p>
        </div>
        <PlatformCode code={`import { DatePicker } from "@zen/design-system";

<DatePicker
${[
  ...(resolvedCalendar === "dual" ? [`calendar="dual"`] : []),
  ...(resolvedMode === "range" ? [`selectionMode="range"`, "onRangeChange={setRange}"] : ["value={date}", "onChange={setDate}"]),
  ...(datePast ? ["minDate={today}"] : []),
  ...(actions ? ["showActions", `action="${actions}"`] : []),
].map((line) => `  ${line}`).join("\n")}
/>

// As a popover, add open={open}, anchorRef={triggerRef} and onClose={() => setOpen(false)}:
// it then closes on an outside click, Escape, a completed pick or the actions.`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "tooltip") {
    const color = (tooltipColor ?? "default") as TooltipColor;
    const size = (tooltipSize ?? "medium") as TooltipSize;
    const placement = (tooltipPlacement ?? "top") as TooltipPlacement;
    return <ExamplePage page="tooltip" eyebrow="Components / Tooltip" title="Tooltip" description="A short, non-interactive label that appears on hover (after a delay) or keyboard focus, and closes with Escape.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Tooltip</h2>
        <div className="platform-playground-controls" aria-label="Tooltip playground controls">
          <PlaygroundFilterChip label="Color" value={tooltipColor} onChange={(value) => setTooltipColor(String(value) || undefined)} options={tooltipColors.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={tooltipSize} onChange={(value) => setTooltipSize(String(value) || undefined)} options={["medium", "small"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Placement" value={tooltipPlacement} onChange={(value) => setTooltipPlacement(String(value) || undefined)} options={["top", "bottom", "left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Always Show" selected={tooltipPinned} onChange={setTooltipPinned} />
        </div>
        <div data-typography={previewTypography} className={`platform-example-row platform-tooltip-preview${color === "white-overlay" || color === "black-overlay" ? " platform-example-row--overlay" : ""}`}>
          <Tooltip content="Duplicate layer" color={color} size={size} placement={placement} open={tooltipPinned ? true : undefined}>
            <IconButton appearance={color === "white-overlay" || color === "black-overlay" ? "overlay" : "main"} level={color === "white-overlay" || color === "black-overlay" ? "white-overlay" : "tertiary"} size="md" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} />
          </Tooltip>
        </div>
        <PlatformCode code={`import { IconButton, Tooltip } from "@zen/design-system";

<Tooltip content="Duplicate layer"${color !== "default" ? ` color="${color}"` : ""}${size !== "medium" ? ` size="${size}"` : ""}${placement !== "top" ? ` placement="${placement}"` : ""}>
  <IconButton aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} />
</Tooltip>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "tabs") {
    const variant = (tabsVariant ?? "indicator") as TabVariant;
    const size = (tabsSize ?? "medium") as TabSize;
    const showIcon = tabsIcon || !tabsLabel;
    const tabItems = [
      { id: "overview", label: tabsLabel ? "Overview" : undefined, "aria-label": "Overview", icon: showIcon ? <Icon name="icon-home-03-line" /> : undefined },
      { id: "activity", label: tabsLabel ? "Activity" : undefined, "aria-label": "Activity", icon: showIcon ? <Icon name="icon-bell-01-line" /> : undefined, badge: tabsBadge ? 3 : undefined },
      { id: "members", label: tabsLabel ? "Members" : undefined, "aria-label": "Members", icon: showIcon ? <Icon name="icon-user-circle-line" /> : undefined, badge: tabsBadge ? 12 : undefined },
      { id: "billing", label: tabsLabel ? "Billing" : undefined, "aria-label": "Billing", icon: showIcon ? <Icon name="icon-credit-card-line" /> : undefined, disabled: tabsDisabled },
    ];
    const panelText: Record<string, string> = { overview: "Project summary and recent files.", activity: "Comments, mentions and changes.", members: "People with access to this project.", billing: "Plan and invoices." };
    return <ExamplePage page="tabs" eyebrow="Components / Tabs" title="Tabs" description="Tab-Bar with Indicator and Subtle styles. Arrow keys move between tabs, Home/End jump, disabled tabs are skipped.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Tabs</h2>
        <div className="platform-playground-controls" aria-label="Tabs playground controls">
          <PlaygroundFilterChip label="Style" value={tabsVariant} onChange={(value) => setTabsVariant(String(value) || undefined)} options={["indicator", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={tabsSize} onChange={(value) => setTabsSize(String(value) || undefined)} options={["medium", "small"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Icon" selected={tabsIcon} onChange={setTabsIcon} />
          <PlaygroundToggle label="Label" selected={tabsLabel} onChange={setTabsLabel} />
          <PlaygroundToggle label="Badge" selected={tabsBadge} onChange={setTabsBadge} />
          <PlaygroundToggle label="Disabled Tab" selected={tabsDisabled} onChange={(on) => { setTabsDisabled(on); if (on && tabsValue === "billing") setTabsValue("overview"); }} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-tabs-preview">
          <Tabs idPrefix="pg-tabs" aria-label="Project sections" variant={variant} size={size} value={tabsValue} onChange={setTabsValue} items={tabItems} />
          {tabItems.map((item) => <TabPanel key={item.id} idPrefix="pg-tabs" id={item.id} hidden={tabsValue !== item.id}><p className={`platform-tabs-panel ${typographyStyles["Body/Base/Regular"]}`}>{panelText[item.id]}</p></TabPanel>)}
        </div>
        <PlatformCode code={`import { Tabs, TabPanel } from "@zen/design-system";

<Tabs
  idPrefix="project"
  aria-label="Project sections"${variant !== "indicator" ? `
  variant="${variant}"` : ""}${size !== "medium" ? `
  size="${size}"` : ""}
  value={tab}
  onChange={setTab}
  items={[
    { id: "overview"${tabsLabel ? `, label: "Overview"` : `, "aria-label": "Overview"`}${showIcon ? `, icon: <Icon name="icon-home-03-line" />` : ""} },
    { id: "activity"${tabsLabel ? `, label: "Activity"` : `, "aria-label": "Activity"`}${showIcon ? `, icon: <Icon name="icon-bell-01-line" />` : ""}${tabsBadge ? ", badge: 3" : ""} },
    { id: "billing"${tabsLabel ? `, label: "Billing"` : `, "aria-label": "Billing"`}${tabsDisabled ? ", disabled: true" : ""} },
  ]}
/>
<TabPanel idPrefix="project" id="overview" hidden={tab !== "overview"}>…</TabPanel>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "breadcrumbs") {
    const emphasis = (crumbEmphasis ?? "default") as BreadcrumbEmphasis;
    const path = [{ id: "home", label: "Home" }, { id: "projects", label: "Projects" }, { id: "zen", label: "Zen DS" }, { id: "components", label: "Components" }, { id: "button", label: "Button" }, { id: "specs", label: "Specs" }];
    const items = path.slice(0, Number(crumbDepth ?? 4));
    return <ExamplePage page="breadcrumbs" eyebrow="Components / Breadcrumbs" title="Breadcrumbs" description="Shows where the current page sits in the hierarchy. The last item is the current page; long paths can collapse the middle.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Breadcrumbs</h2>
        <div className="platform-playground-controls" aria-label="Breadcrumbs playground controls">
          <PlaygroundFilterChip label="Emphasis" value={crumbEmphasis} onChange={(value) => setCrumbEmphasis(String(value) || undefined)} options={["default", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Depth" value={crumbDepth} onChange={(value) => setCrumbDepth(String(value) || undefined)} options={["2", "3", "4", "5", "6"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Master Icon" selected={crumbMaster} onChange={setCrumbMaster} />
          <PlaygroundToggle label="Collapse (max 3)" selected={crumbCollapse} onChange={setCrumbCollapse} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-breadcrumbs-preview">
          <Breadcrumbs key={`${crumbCollapse}-${crumbDepth}`} items={items} emphasis={emphasis} master={crumbMaster} maxItems={crumbCollapse ? 3 : undefined} onNavigate={(item, event) => { event.preventDefault(); setCrumbLast(String(item.label)); }} />
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{crumbLast ? `Navigated to “${crumbLast}”` : "Click a breadcrumb"}</p>
        </div>
        <PlatformCode code={`import { Breadcrumbs } from "@zen/design-system";

<Breadcrumbs
  items={[${items.map((item) => `\n    { id: "${item.id}", label: "${item.label}", href: "/${item.id}" }`).join(",")}
  ]}${emphasis !== "default" ? `
  emphasis="${emphasis}"` : ""}${crumbMaster ? "" : `
  master={false}`}${crumbCollapse ? `
  maxItems={3}` : ""}
  onNavigate={(item, event) => { event.preventDefault(); router.push(item.href); }}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "progress") {
    const isBar = (progressType ?? "bar") === "bar";
    const barTheme = (progressBarTheme ?? "accent") as ProgressBarTheme;
    const circleTheme = (progressCircleTheme ?? "accent") as ProgressCircleTheme;
    const step = (delta: number) => setProgressValue((value) => Math.max(0, Math.min(100, value + delta)));
    return <ExamplePage page="progress" eyebrow="Components / Progress" title="Progress" description="Progress-Bar for linear tasks and Progress-Circle for compact status. Theme=Status colours the bar by how far along it is.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Progress</h2>
        <div className="platform-playground-controls" aria-label="Progress playground controls">
          <PlaygroundFilterChip label="Type" value={progressType} onChange={(value) => setProgressType(String(value) || undefined)} options={["bar", "circle"].map((id) => ({ id, label: id }))} />
          {isBar
            ? <PlaygroundFilterChip label="Theme" value={progressBarTheme} onChange={(value) => setProgressBarTheme(String(value) || undefined)} options={["neutral", "accent", "status"].map((id) => ({ id, label: id }))} />
            : <PlaygroundFilterChip label="Theme" value={progressCircleTheme} onChange={(value) => setProgressCircleTheme(String(value) || undefined)} options={progressCircleThemes.map((id) => ({ id, label: id }))} />}
          <PlaygroundFilterChip label="Progress" value={String(progressValue)} onChange={(value) => setProgressValue(Number(value))} options={[["0", "None · 0%"], ["20", "Low · 20%"], ["40", "Medium · 40%"], ["80", "Good · 80%"], ["100", "Done · 100%"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundToggle label="Label" selected={progressLabel} onChange={setProgressLabel} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-progress-preview">
          {isBar ? <ProgressBar value={progressValue} theme={barTheme} label={progressLabel ? true : undefined} aria-label="Upload progress" /> : <ProgressCircle value={progressValue} theme={circleTheme} label={progressLabel ? true : undefined} aria-label="Task progress" />}
          <div className="pe-row">
            <Button appearance="main" level="tertiary" size="xs" disabled={progressValue === 0} onClick={() => step(-10)}>−10%</Button>
            <Button appearance="main" level="tertiary" size="xs" disabled={progressValue === 100} onClick={() => step(10)}>+10%</Button>
          </div>
        </div>
        <PlatformCode code={`import { ${isBar ? "ProgressBar" : "ProgressCircle"} } from "@zen/design-system";

<${isBar ? "ProgressBar" : "ProgressCircle"}
  value={${progressValue}}
  theme="${isBar ? barTheme : circleTheme}"${progressLabel ? `
  label // shows "${progressValue}%"` : `
  aria-label="${isBar ? "Upload progress" : "Task progress"}"`}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }


  if (page === "accordion") {
    const size = (accordionSize ?? "medium") as AccordionSize;
    const theme = (accordionTheme ?? "divider") as AccordionTheme;
    const faqs = [
      { id: "seats", title: "Where can I see a breakdown of my seats?", body: "You can manage your full seats, viewer seats and pending invites from Settings → Members. The table shows who holds each seat and when it renews." },
      { id: "billing", title: "When will I be charged?", body: "Seats are billed at the start of each cycle. Seats added mid-cycle are prorated on the next invoice." },
      { id: "export", title: "Can I export the member list?", body: "Yes — use Export in the Members table to download a CSV of names, roles and last activity." },
    ];
    return <ExamplePage page="accordion" eyebrow="Components / Accordion" title="Accordion" description="Accordion/Text in three sizes with a Divider or Box theme. The whole header row toggles the panel; the chevron turns and the height animates.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Accordion</h2>
        <div className="platform-playground-controls" aria-label="Accordion playground controls">
          <PlaygroundFilterChip label="Size" value={accordionSize} onChange={(value) => setAccordionSize(String(value) || undefined)} options={[["medium", "Medium"], ["large", "Large"], ["xlarge", "XLarge"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundFilterChip label="Theme" value={accordionTheme} onChange={(value) => setAccordionTheme(String(value) || undefined)} options={[["divider", "Divider"], ["box", "Box"]].map(([id, label]) => ({ id, label }))} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-accordion-preview">
          <div className="platform-accordion-stack" data-theme={theme}>
            {faqs.map((faq) => <Accordion key={faq.id} size={size} theme={theme} title={faq.title} expanded={accordionOpen === faq.id} onExpandedChange={(open) => setAccordionOpen(open ? faq.id : "")}>{faq.body}</Accordion>)}
          </div>
        </div>
        <PlatformCode code={`import { Accordion } from "@zen/design-system";

<Accordion
  size="${size}"
  theme="${theme}"
  title="Where can I see a breakdown of my seats?"
  expanded={open}
  onExpandedChange={setOpen}
>
  You can manage your full seats from Settings → Members.
</Accordion>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "alert-banner") {
    const theme = (alertTheme ?? "default") as AlertBannerTheme;
    const size = (alertSize ?? "medium") as AlertBannerSize;
    const messages: Record<AlertBannerTheme, string> = { default: "Scheduled maintenance on Sunday, 02:00–03:00.", info: "A new version of the design system is available.", positive: "Your workspace was upgraded to the Pro plan.", warning: "Your trial ends in 3 days.", negative: "We couldn't sync your latest changes." };
    return <ExamplePage page="alert-banner" eyebrow="Components / Alert Banner" title="Alert Banner" description="A full-width Solid strip for page-level messages in five themes and two sizes, with an optional action (Medium) and a dismiss control.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Alert Banner</h2>
        <div className="platform-playground-controls" aria-label="Alert Banner playground controls">
          <PlaygroundFilterChip label="Theme" value={alertTheme} onChange={(value) => { setAlertTheme(String(value) || undefined); setAlertDismissed(false); }} options={alertBannerThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={alertSize} onChange={(value) => setAlertSize(String(value) || undefined)} options={[["medium", "Medium"], ["small", "Small"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundToggle label="Leading" selected={alertLeading} onChange={setAlertLeading} />
          {size === "medium" ? <PlaygroundToggle label="Action" selected={alertAction} onChange={setAlertAction} /> : null}
          <PlaygroundToggle label="Close" selected={alertClose} onChange={setAlertClose} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-banner-preview">
          {alertDismissed
            ? <Button appearance="main" level="tertiary" size="xs" onClick={() => setAlertDismissed(false)}>Show banner again</Button>
            : <AlertBanner theme={theme} size={size} leading={alertLeading} action={alertAction ? { label: "Details" } : undefined} onClose={alertClose ? () => setAlertDismissed(true) : undefined}>{messages[theme]}</AlertBanner>}
        </div>
        <PlatformCode code={`import { AlertBanner } from "@zen/design-system";

<AlertBanner
  theme="${theme}"
  size="${size}"${alertLeading ? "" : `
  leading={false}`}${alertAction && size === "medium" ? `
  action={{ label: "Details", onClick: openDetails }}` : ""}${alertClose ? `
  onClose={dismiss}` : ""}
>
  ${messages[theme]}
</AlertBanner>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "pagination") {
    const theme = (paginationTheme ?? "primary") as PaginationTheme;
    const size = (paginationSize ?? "xsmall") as PaginationItemSize;
    const compact = theme === "inline" || theme === "manually";
    return <ExamplePage page="pagination" eyebrow="Components / Pagination" title="Pagination" description="Numbered pagination (Primary / Secondary) and compact result navigators (Inline with a page-size Chip, Manually with a page-size Input).">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Pagination</h2>
        <div className="platform-playground-controls" aria-label="Pagination playground controls">
          <PlaygroundFilterChip label="Theme" value={paginationTheme} onChange={(value) => { setPaginationTheme(String(value) || undefined); setPaginationPage(1); }} options={[["primary", "Primary"], ["secondary", "Secondary"], ["inline", "Inline"], ["manually", "Manually"]].map(([id, label]) => ({ id, label }))} />
          {compact ? null : <PlaygroundFilterChip label="Item Size" value={paginationSize} onChange={(value) => setPaginationSize(String(value) || undefined)} options={[["xsmall", "XSmall · 24"], ["small", "Small · 32"]].map(([id, label]) => ({ id, label }))} />}
        </div>
        <div data-typography={previewTypography} className="platform-example-row">
          <Pagination theme={theme} size={size} page={paginationPage} onPageChange={setPaginationPage} pageCount={10} total={480} pageSize={paginationPageSize} onPageSizeChange={(value) => { setPaginationPageSize(value); setPaginationPage(1); }} />
        </div>
        <PlatformCode code={`import { Pagination } from "@zen/design-system";

<Pagination
  theme="${theme}"${compact ? `
  total={480}
  pageSize={pageSize}
  onPageSizeChange={setPageSize}` : `
  size="${size}"
  pageCount={10}`}
  page={page}
  onPageChange={setPage}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "skeleton") {
    const type = skeletonType ?? "text";
    const lines = Number(skeletonLines ?? 3);
    const headingSize = (skeletonHeading ?? "medium") as SkeletonHeadingSize;
    const shape = (skeletonShape ?? "rectangle") as (typeof skeletonShapes)[number];
    const shapeSize = (skeletonShapeSize ?? "medium") as SkeletonShapeSize;
    const code = type === "text" ? `<SkeletonText lines={${lines}}${skeletonAnimated ? "" : " animated={false}"} />`
      : type === "heading" ? `<SkeletonHeading size="${headingSize}"${skeletonAnimated ? "" : " animated={false}"} />`
        : `<SkeletonShape shape="${shape}" size="${shapeSize}"${skeletonAnimated ? "" : " animated={false}"} />`;
    return <ExamplePage page="skeleton" eyebrow="Components / Skeleton" title="Skeleton" description="Loading placeholders for body text, headings and shapes. They pulse while content loads (static when reduced motion is on).">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Skeleton</h2>
        <div className="platform-playground-controls" aria-label="Skeleton playground controls">
          <PlaygroundFilterChip label="Type" value={skeletonType} onChange={(value) => setSkeletonType(String(value) || undefined)} options={[["text", "Body Text"], ["heading", "Heading Text"], ["shape", "Shape"]].map(([id, label]) => ({ id, label }))} />
          {type === "text" ? <PlaygroundFilterChip label="Lines" value={skeletonLines} onChange={(value) => setSkeletonLines(String(value) || undefined)} options={["1", "2", "3", "5"].map((id) => ({ id, label: id }))} /> : null}
          {type === "heading" ? <PlaygroundFilterChip label="Size" value={skeletonHeading} onChange={(value) => setSkeletonHeading(String(value) || undefined)} options={[["large", "Large"], ["medium", "Medium"], ["small", "Small"]].map(([id, label]) => ({ id, label }))} /> : null}
          {type === "shape" ? <PlaygroundFilterChip label="Shape" value={skeletonShape} onChange={(value) => setSkeletonShape(String(value) || undefined)} options={skeletonShapes.map((id) => ({ id, label: id }))} /> : null}
          {type === "shape" ? <PlaygroundFilterChip label="Size" value={skeletonShapeSize} onChange={(value) => setSkeletonShapeSize(String(value) || undefined)} options={[...skeletonShapeSizes].reverse().map((id) => ({ id, label: id }))} /> : null}
          <PlaygroundToggle label="Animated" selected={skeletonAnimated} onChange={setSkeletonAnimated} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-skeleton-preview" aria-busy="true" aria-label="Loading">
          {type === "text" ? <div className="platform-skeleton-text"><SkeletonText lines={lines} animated={skeletonAnimated} /></div> : null}
          {type === "heading" ? <SkeletonHeading size={headingSize} animated={skeletonAnimated} /> : null}
          {type === "shape" ? <SkeletonShape shape={shape} size={shapeSize} animated={skeletonAnimated} /> : null}
        </div>
        <PlatformCode code={`import { ${type === "text" ? "SkeletonText" : type === "heading" ? "SkeletonHeading" : "SkeletonShape"} } from "@zen/design-system";

// Mark the loading region: <div aria-busy="true">…</div>
${code}`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "toast") {
    const type = (toastType ?? "neutral") as ToastType;
    const copy: Record<ToastType, [string, string]> = { neutral: ["Changes saved", "Your draft was saved a moment ago."], subtle: ["Link copied", "Anyone with the link can view this file."], info: ["Update available", "Reload to get the latest version."], positive: ["Project published", "It is now live for your team."], warning: ["Storage almost full", "You have used 92% of your space."], negative: ["Upload failed", "The file is larger than 25 MB."] };
    return <ExamplePage page="toast" eyebrow="Components / Toast Message" title="Toast Message" description="Toast-Message in six types with title, caption, one action and a close control, on the Popover effect surface.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Toast Message</h2>
        <div className="platform-playground-controls" aria-label="Toast playground controls">
          <PlaygroundFilterChip label="Type" value={toastType} onChange={(value) => { setToastType(String(value) || undefined); setToastDismissed(false); }} options={toastTypes.map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Title" selected={toastTitle} onChange={setToastTitle} />
          <PlaygroundToggle label="Caption" selected={toastCaption} onChange={setToastCaption} />
          <PlaygroundToggle label="Action" selected={toastAction} onChange={setToastAction} />
          <PlaygroundToggle label="Close" selected={toastClose} onChange={setToastClose} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-banner-preview">
          {toastDismissed
            ? <Button appearance="main" level="tertiary" size="xs" onClick={() => setToastDismissed(false)}>Show toast again</Button>
            : <Toast type={type} title={toastTitle ? copy[type][0] : undefined} action={toastAction ? { label: "Undo" } : undefined} onClose={toastClose ? () => setToastDismissed(true) : undefined}>{toastCaption ? copy[type][1] : undefined}</Toast>}
        </div>
        <PlatformCode code={`import { Toast } from "@zen/design-system";

<Toast
  type="${type}"${toastTitle ? `
  title="${copy[type][0]}"` : ""}${toastAction ? `
  action={{ label: "Undo", onClick: undo }}` : ""}${toastClose ? `
  onClose={dismiss}` : ""}
>${toastCaption ? `
  ${copy[type][1]}
` : ""}</Toast>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "dialog") {
    const theme = (dialogTheme ?? "default") as DialogTheme;
    const count = dialogActions === "single" ? 1 : dialogActions === "triple" ? 3 : 2;
    const titles: Record<DialogTheme, string> = { default: "Publish changes?", info: "New version available", positive: "Project published", warning: "Unsaved changes", negative: "Delete project?" };
    return <ExamplePage page="dialog" eyebrow="Components / Modal & Dialog" title="Dialog" description="Modal/Dialog with themed icon, heading, caption and up to three actions. Focus is trapped while open and returns to the trigger; Escape or the overlay closes it.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Dialog</h2>
        <div className="platform-playground-controls" aria-label="Dialog playground controls">
          <PlaygroundFilterChip label="Theme" value={dialogTheme} onChange={(value) => setDialogTheme(String(value) || undefined)} options={dialogThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Actions" value={dialogActions} onChange={(value) => setDialogActions(String(value) || undefined)} options={["single", "dual", "triple"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Icon" selected={dialogIcon} onChange={setDialogIcon} />
          <PlaygroundToggle label="Caption" selected={dialogDescription} onChange={setDialogDescription} />
          <PlaygroundToggle label="Custom Slot" selected={dialogCustom} onChange={setDialogCustom} />
        </div>
        <div data-typography={previewTypography} className="platform-example-row platform-dialog-preview">
          <Button appearance="main" level={theme === "negative" ? "danger" : "primary"} size="md" onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{dialogResult || "Try Tab, Shift+Tab and Escape while it is open."}</p>
          <Dialog
            open={dialogOpen}
            onOpenChange={(next) => { setDialogOpen(next); if (!next) setDialogResult((current) => current || "Dismissed"); }}
            theme={theme}
            icon={dialogIcon}
            title={titles[theme]}
            description={dialogDescription ? "Everything in Zen contains Auto Layout. Review the summary below before you continue." : undefined}
            primaryAction={{ label: theme === "negative" ? "Delete" : "Continue", level: theme === "negative" ? "danger" : "primary", onClick: () => { setDialogResult("Primary action"); setDialogOpen(false); } }}
            secondaryAction={count >= 2 ? { label: "Cancel", onClick: () => { setDialogResult("Cancelled"); setDialogOpen(false); } } : undefined}
            tertiaryAction={count === 3 ? { label: "Learn more", onClick: () => { setDialogResult("Learn more"); setDialogOpen(false); } } : undefined}
          >
            {dialogCustom ? <InputField label="Project name" placeholder="Type the project name to confirm" /> : null}
          </Dialog>
        </div>
        <PlatformCode code={`import { Button, Dialog } from "@zen/design-system";

<Button onClick={() => setOpen(true)}>Open dialog</Button>
<Dialog
  open={open}
  onOpenChange={setOpen}${theme !== "default" ? `
  theme="${theme}"` : ""}${dialogIcon ? "" : `
  icon={false}`}
  title="${titles[theme]}"${dialogDescription ? `
  description="Review the summary below before you continue."` : ""}
  primaryAction={{ label: "${theme === "negative" ? "Delete" : "Continue"}",${theme === "negative" ? ` level: "danger",` : ""} onClick: confirm }}${count >= 2 ? `
  secondaryAction={{ label: "Cancel" }}` : ""}${count === 3 ? `
  tertiaryAction={{ label: "Learn more", onClick: openDocs }}` : ""}
>${dialogCustom ? `
  <InputField label="Project name" />
` : ""}</Dialog>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "installation") {
    return <ExamplePage eyebrow="Installation" title="Install Zen DS" description="Use the generated CSS, tokens and React components from the package source."><div className="platform-example-panel"><pre><code>{`npm install @zen/design-system\n\nimport "@zen/design-system/styles";\nimport { Button, Icon } from "@zen/design-system";`}</code></pre></div></ExamplePage>;
  }

  return <ExamplePage eyebrow="Components" title="Component" description="Select a component from the sidebar."><div /></ExamplePage>;
}

export function isPlatformComponentPage(page: PlatformPage) {
  return page !== "overviews";
}
