import { useRef, useState, type ReactNode } from "react";
import { Button, IconButton, type ButtonAppearance, type ButtonLevel, type ButtonSize, type ButtonState } from "../components/Button";
import { Chip, type ChipSize, type ChipState, type ChipTheme, type ChipVariant } from "../components/Chip";
import { Icon, type IconName } from "../components/Icon";
import { AutocompleteField, ControlBarSelectItem, DateField, HeadingField, InputConditionItem, InputConditions, InputContent, InputField, InputHelpText, InputLabel, InputLeadingTrailing, NumberField, RichTextEditorBar, RichTextField, SelectField, TextAreaField, type InputSize, type InputState } from "../components/Input";
import { Search, type SearchSize, type SearchState, type SearchTheme } from "../components/Search";
import { Sidebar, type SidebarBackground, type SidebarSection, type SidebarVariant } from "../components/Sidebar";
import { Segmented, type SegmentedLevel, type SegmentedSize, type SegmentedState } from "../components/Segmented";
import { Avatar, AvatarStack, type AvatarBackground, type AvatarShape, type AvatarSize, type AvatarTheme } from "../components/Avatar";
import { Checkbox, type CheckboxSide, type CheckboxState } from "../components/Checkbox";
import { RadioButton, type RadioSide, type RadioState } from "../components/RadioButton";
import { Badge, BadgeCounter, type BadgeBackground, type BadgeSize, type BadgeTheme } from "../components/Badge";
import { Toggle, ToggleButton, type ToggleSize, type ToggleState, type ToggleTheme } from "../components/Toggle";
import { Popover, type PopoverItemData } from "../components/Popover";
import { FoundationOverview } from "../foundations/FoundationOverview";
import { IconGallery } from "../foundations/IconGallery";
import { TextStylesGallery } from "../foundations/TextStylesGallery";
import { TokenCollectionPage } from "../foundations/TokenCollectionPage";
import { collections } from "../foundations/collections";
import { PlatformPageTemplate } from "./PlatformTemplate";

const samplePhoto = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d9c7b8"/><circle cx="16" cy="13" r="6" fill="#8f735f"/><rect x="6" y="21" width="20" height="14" rx="7" fill="#8f735f"/></svg>');

export type PlatformPage = "overviews" | "installation" | "design-tokens" | "typography" | "iconography" | "button" | "chip" | "sidebar" | "input" | "search" | "segmented" | "toggle" | "avatar" | "checkbox" | "radio-button" | "badge" | "popover";

function ExamplePage({ eyebrow, title, description, titleLines, children }: { eyebrow: string; title: string; description: string; titleLines?: string[]; children: ReactNode }) {
  return (
    <PlatformPageTemplate title={title} eyebrow={eyebrow} titleLines={titleLines} description={description}>
      <div className="platform-example-page">{children}</div>
    </PlatformPageTemplate>
  );
}

/** Keep component previews on the same Figma token mode as the platform shell. */
function ComponentPreview({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`platform-component-preview ${className}`.trim()}>{children}</div>;
}

const codeLanguages = ["React", "Vue", "Svelte", "HTML", "Swift", "Flutter"] as const;
/** Only production field compositions are selectable in the platform page.
 * Figma primitive owners remain nested implementation details, not previews. */
const inputPlaygroundKinds = ["text", "field-only", "textarea", "select", "date", "autocomplete", "number-left", "number-center", "richtext"] as const;

const codeTokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][^>\n]*>|\b(?:import|from|export|const|let|return|function|true|false|null|undefined|as|type|interface)\b|\b\d+(?:\.\d+)?\b)/g;
const codeKeywords = new Set(["import", "from", "export", "const", "let", "return", "function", "true", "false", "null", "undefined", "as", "type", "interface"]);

function highlightCode(source: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  codeTokenPattern.lastIndex = 0;
  while ((match = codeTokenPattern.exec(source)) !== null) {
    if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
    const token = match[0];
    const className = token.startsWith("//") || token.startsWith("/*")
      ? "platform-code__token platform-code__token--comment"
      : token.startsWith("<")
        ? "platform-code__token platform-code__token--tag"
        : token.startsWith("\"") || token.startsWith("'") || token.startsWith("`")
          ? "platform-code__token platform-code__token--string"
          : codeKeywords.has(token)
            ? "platform-code__token platform-code__token--keyword"
            : "platform-code__token platform-code__token--number";
    nodes.push(<span className={className} key={`${match.index}-${token}`}>{token}</span>);
    cursor = match.index + token.length;
  }
  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

function PlatformCode({ code }: { code: string }) {
  const [language, setLanguage] = useState<(typeof codeLanguages)[number]>("React");
  const [copied, setCopied] = useState(false);
  const output = language === "React" ? code : `// ${language} — Coming Soon\n// React is the reference implementation for this component.`;
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="platform-code" aria-label="Code preview">
      <div className="platform-code__header">
        <div className="platform-code__language-group">
          <SelectField
            aria-label="Code language"
            className="platform-code__language"
            size="small"
            value={language}
            onChange={(event) => setLanguage(event.target.value as (typeof codeLanguages)[number])}
            options={codeLanguages.map((item) => ({ value: item, label: `${item}${item === "React" ? "" : " — Coming Soon"}` }))}
          />
        </div>
        <Button appearance="main" level="tertiary" size="sm" endIcon={<Icon name={"icon-copy-line" as IconName} decorative />} onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre><code>{highlightCode(output)}</code></pre>
    </section>
  );
}

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
  const [level, setLevel] = useState<ButtonLevel>(levels[0]);
  const [size, setSize] = useState<ButtonSize>(sizes.includes("md") ? "md" : sizes[0]);
  // Hover/pressed/focus are driven by the real control. Disabled is the one
  // explicit state toggle because it cannot be reached by interaction.
  const [disabled, setDisabled] = useState(false);
  const state: ButtonState = disabled ? "disabled" : "default";
  const [leading, setLeading] = useState(true);
  const [trailing, setTrailing] = useState(false);
  const headingId = `button-${iconOnly ? "icon-" : ""}${appearance}-heading`;
  const code = iconOnly
    ? `import { IconButton } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";

<IconButton
  appearance="${appearance}"
  level="${level}"
  size="${size}"
  state="${state}"
  aria-label="Add"
  icon={<Icon name="icon-plus-line" decorative />}
/>`
    : `import { Button } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";


<Button
  appearance="${appearance}"
  level="${level}"
  size="${size}"
  state="${state}"${leading ? `
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
        <div className={`platform-example-row${appearance === "overlay" ? " platform-example-row--overlay" : ""}`}>
          {iconOnly ? (
            <IconButton aria-label={`${title} preview`} appearance={appearance} level={level} size={size} state={state} icon={<Icon name="icon-plus-line" decorative />} />
          ) : (
            <Button appearance={appearance} level={level} size={size} state={state} startIcon={leading ? <Icon name="icon-check-line" decorative /> : undefined} endIcon={trailing ? <Icon name="icon-chevron-right-line-small" decorative /> : undefined}>Button</Button>
          )}
        </div>
        <PlatformCode code={code} />
      </ComponentPreview>
    </section>
  );
}

export function PlatformComponentPage({ page, activeCollection, onCollectionClick }: { page: PlatformPage; activeCollection?: string | null; onCollectionClick?: (slug: string) => void }) {
  const [chipVariant, setChipVariant] = useState<string | undefined>("advanced");
  const [chipSize, setChipSize] = useState<string | undefined>("small");
  const [chipDisabled, setChipDisabled] = useState(false);
  const [chipThemes, setChipThemes] = useState<string[]>(["text-only"]);
  const [sidebarVariant, setSidebarVariant] = useState<string | undefined>("basic");
  const [inputKind, setInputKind] = useState<string | undefined>("text");
  const [inputSize, setInputSize] = useState<string | undefined>("medium");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [inputLabel, setInputLabel] = useState(true);
  const [inputHelp, setInputHelp] = useState(true);
  const [inputLeading, setInputLeading] = useState(true);
  const [inputLeadingLabel, setInputLeadingLabel] = useState(true);
  const [inputTrailing, setInputTrailing] = useState(true);
  const [inputTrailingLabel, setInputTrailingLabel] = useState(true);
  const [searchTheme, setSearchTheme] = useState<string | undefined>("default");
  const [searchSize, setSearchSize] = useState<string | undefined>("medium");
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [searchIcon, setSearchIcon] = useState<string | undefined>("yes");
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
  const [checkboxDisabled, setCheckboxDisabled] = useState(false);
  const [checkboxSide, setCheckboxSide] = useState<string | undefined>("left");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [checkboxIndeterminate, setCheckboxIndeterminate] = useState(false);
  const [checkboxCaption, setCheckboxCaption] = useState(true);
  const [checkboxBold, setCheckboxBold] = useState(false);
  const [radioDisabled, setRadioDisabled] = useState(false);
  const [radioSide, setRadioSide] = useState<string | undefined>("left");
  const [radioChecked, setRadioChecked] = useState(false);
  const [radioCaption, setRadioCaption] = useState(true);
  const [radioBold, setRadioBold] = useState(false);
  const [toggleSize, setToggleSize] = useState<string | undefined>("medium");
  const [toggleDisabled, setToggleDisabled] = useState(false);
  const [toggleHover, setToggleHover] = useState(false);
  const [toggleTheme, setToggleTheme] = useState<string | undefined>("text-first");
  const [toggleSelected, setToggleSelected] = useState(false);
  const [toggleCaption, setToggleCaption] = useState(true);
  const [toggleBold, setToggleBold] = useState(false);
  const [badgeSize, setBadgeSize] = useState<string | undefined>("medium");
  const [badgeTheme, setBadgeTheme] = useState<string | undefined>("neutral");
  const [badgeBackground, setBadgeBackground] = useState<string | undefined>("solid");
  const [badgeLeading, setBadgeLeading] = useState<string | undefined>("yes");
  const [badgeRemove, setBadgeRemove] = useState<string | undefined>("no");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarBackground, setSidebarBackground] = useState<string | undefined>("flat");
  const [sidebarWorkspaceBar, setSidebarWorkspaceBar] = useState(true);
  const [sidebarSubMenu, setSidebarSubMenu] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(true);
  const [popoverSearch, setPopoverSearch] = useState("");
  const [popoverSearchOn, setPopoverSearchOn] = useState(true);
  const popoverAnchorRef = useRef<HTMLDivElement>(null);
  const [popoverSelected, setPopoverSelected] = useState("medium");
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
    return <PlatformPageTemplate title="Typography" eyebrow="Foundations" description="Composite typography contracts exported from Figma and connected to Typography and Emphasis variables."><TextStylesGallery embedded /></PlatformPageTemplate>;
  }
  if (page === "iconography") {
    return <PlatformPageTemplate title="Iconography" eyebrow="Foundations" description="SVG icons are generated from one source folder and rendered through one component."><IconGallery embedded /></PlatformPageTemplate>;
  }

  if (page === "button") {
    return (
      <ExamplePage eyebrow="Components / Button" title="Button" description="Establish consistent interaction across project states with defined button styles. Button Style Tokens act as meaningful identifiers for your visual system's standard interaction elements.">
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
    return (
      <ExamplePage eyebrow="Components / Chip" title="Chip/Pill" description="Normal, Advanced and Number-only variants mapped from the Figma Chip/Pill page.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Chip/Pill</h2>
          <div className="platform-playground-controls" aria-label="Chip playground controls">
            <PlaygroundFilterChip label="Variant" value={chipVariant} onChange={(value) => setChipVariant(String(value) || undefined)} options={["advanced", "normal", "number-only"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={resolvedChipSize} onChange={(value) => setChipSize(String(value) || undefined)} options={allowedChipSizes.map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Theme" value={chipThemes} multiple onChange={(value) => setChipThemes(Array.isArray(value) ? value : [value])} options={["text-only", "leading-icon", "leading-photo"].map((id) => ({ id, label: id }))} />
            <PlaygroundToggle label="Disabled" selected={chipDisabled} onChange={setChipDisabled} />
          </div>
          <div className="platform-example-row">
            {resolvedChipVariant === "number-only" ? (
              <Chip variant="number-only" size={resolvedChipSize} value={3} state={resolvedChipState} />
            ) : (
              <Chip variant={resolvedChipVariant} size={resolvedChipSize} state={resolvedChipState} theme={resolvedChipTheme} leading={chipLeading} photoSrc={chipPhoto} select={resolvedChipVariant === "advanced"} counter={resolvedChipVariant === "advanced" ? 3 : undefined}>
                {resolvedChipVariant === "advanced" ? "Status" : "Chip"}
              </Chip>
            )}
          </div>
          <PlatformCode code={`import { Chip } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";

<Chip
  variant="${resolvedChipVariant}"
  size="${resolvedChipSize}"
  state="${resolvedChipState}"
  theme="${resolvedChipTheme}"${resolvedChipVariant === "advanced" ? `
  selectionMode="multiple"
  selectionCount={3}
  select
  dropdown
  leading={<Icon name="icon-cube-line" decorative />}` : ""}${resolvedChipTheme === "leading-photo" ? `
  photoSrc="/avatars/user.jpg"` : ""}
>
  ${resolvedChipVariant === "number-only" ? "3" : resolvedChipVariant === "advanced" ? "Status" : "Chip"}
</Chip>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "sidebar") {
    const resolvedSidebarVariant = (sidebarVariant ?? "basic") as SidebarVariant;
    const resolvedSidebarBackground = (sidebarBackground ?? "flat") as SidebarBackground;
    const sidebarSections: SidebarSection[] = [
      { items: [
        { id: "selected", label: "Selected item", selected: true, icon: <Icon name="icon-cube-line" size="base" /> },
        { id: "counter", label: "Counter item", counter: 12, icon: <Icon name="icon-cube-line" size="base" /> },
        { id: "notification", label: "Notification item", notificationDot: true, icon: <Icon name="icon-cube-line" size="base" /> },
      ] },
      { label: "Section title", action: <Icon name="icon-plus-line" size="base" decorative />, items: [
        { id: "dropdown", label: "Dropdown item", dropdown: true, icon: <Icon name="icon-cube-line" size="base" />, children: [{ id: "child-selected", label: "Selected child", selected: true, theme: "accent" }, { id: "child-default", label: "Child item", theme: "accent" }] },
        { id: "hover", label: "Hover item", state: "hover", icon: <Icon name="icon-cube-line" size="base" /> },
        { id: "focus", label: "Focus item", state: "focus", icon: <Icon name="icon-cube-line" size="base" />, trailingAction: <Icon name="icon-dots-horizontal-line" size="base" decorative /> },
        { id: "disabled", label: "Disabled item", state: "disabled", disabled: true, icon: <Icon name="icon-cube-line" size="base" /> },
      ] },
    ];
    const sidebarFooter = <><button type="button"><Icon name="ic-figma-line" size="base" /><span>Download Figma</span></button><button type="button"><Icon name="icon-message-chat-circle-line" size="base" /><span>Feedback</span></button></>;
    return (
      <ExamplePage eyebrow="Components / Sidebar" title="Patterns/Sidebar" titleLines={["Patterns/", "Sidebar"]} description="One shared Sidebar preview with the Figma Basic, Small-Density and Workspace variants selectable from the playground.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Patterns/Sidebar</h2>
            <div className="platform-playground-controls" aria-label="Sidebar playground controls">
              <PlaygroundFilterChip label="Variant" value={sidebarVariant} onChange={(value) => setSidebarVariant(String(value) || undefined)} options={["basic", "small-density", "workspace"].map((id) => ({ id, label: id }))} />
              <PlaygroundToggle label="Expand" selected={!sidebarCollapsed} onChange={(selected) => setSidebarCollapsed(!selected)} />
              {resolvedSidebarVariant === "workspace" ? <PlaygroundFilterChip label="Master Background" value={sidebarBackground} onChange={(value) => setSidebarBackground(String(value) || undefined)} options={["flat", "default", "inverse"].map((id) => ({ id, label: id }))} /> : null}
              {resolvedSidebarVariant === "workspace" ? <PlaygroundToggle label="Workspace Bar" selected={sidebarWorkspaceBar} onChange={setSidebarWorkspaceBar} /> : null}
              <PlaygroundToggle label="Sub Menu" selected={sidebarSubMenu} onChange={setSidebarSubMenu} />
          </div>
          <div className="platform-example-row">
            <Sidebar
              variant={resolvedSidebarVariant}
              collapsed={sidebarCollapsed && resolvedSidebarVariant !== "workspace"}
              onCollapsedChange={setSidebarCollapsed}
              background={resolvedSidebarBackground}
              workspaceBar={sidebarWorkspaceBar}
              workspaceItems={[{ id: "workspace-a", label: "Workspace A", selected: true, icon: <Avatar size="medium" theme="accent" background="subtle">A</Avatar> }, { id: "workspace-b", label: "Workspace B", icon: <Avatar size="medium" theme="indigo" background="solid">B</Avatar> }]}
              search={resolvedSidebarVariant === "small-density" ? <Search size="small" placeholder="Search" /> : undefined}
              sections={sidebarSections}
              footer={sidebarFooter}
              subMenu={sidebarSubMenu ? <div className="platform-sidebar-demo__submenu"><strong>Sub menu</strong><span>Slot content from the Figma master template.</span></div> : undefined}
            />
          </div>
          <PlatformCode code={`import { Sidebar } from "@zen/design-system";

<Sidebar
  variant="${resolvedSidebarVariant}"
  background="${resolvedSidebarBackground}"
  workspaceBar={${sidebarWorkspaceBar}}
  sections={sections}
  footer={footer}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "input") {
    const resolvedInputKind = inputKind ?? "text";
    const resolvedInputSize = (inputSize ?? "medium") as InputSize;
    const resolvedInputState: InputState = inputDisabled ? "disabled" : "default";
    const sharedFieldProps = {
      label: inputLabel ? "Label" : undefined,
      helpText: inputHelp ? "Supporting help text" : undefined,
      size: resolvedInputSize,
      state: resolvedInputState,
      leading: inputLeading ? <InputLeadingTrailing size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} icon={<Icon name="icon-user-circle-line" decorative />} label={inputLeadingLabel ? "User" : undefined} showLabel={inputLeadingLabel} /> : undefined,
      trailing: inputTrailing ? <InputLeadingTrailing size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown /> : undefined,
    };
    let inputPreview: ReactNode;
    let inputComponentName = "InputField";
    switch (resolvedInputKind) {
      case "field-only": inputPreview = <InputField {...sharedFieldProps} label={undefined} helpText={undefined} placeholder="Field only" />; inputComponentName = "InputField"; break;
      case "input-content": inputPreview = <InputContent size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} state={resolvedInputState === "disabled" ? "disabled" : "default"} text="Content" />; inputComponentName = "InputContent"; break;
      case "label": inputPreview = <InputLabel optional tooltip action="Action">Label</InputLabel>; inputComponentName = "InputLabel"; break;
      case "help-text": inputPreview = <InputHelpText theme="neutral" characterLimit="0/120">Supporting help text</InputHelpText>; inputComponentName = "InputHelpText"; break;
      case "leading-trailing": inputPreview = <InputLeadingTrailing size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} icon={inputLeading ? <Icon name="icon-globe-02-line" decorative /> : undefined} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown={inputTrailing} />; inputComponentName = "InputLeadingTrailing"; break;
      case "textarea": inputPreview = <TextAreaField {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Tell us more" />; inputComponentName = "TextAreaField"; break;
      case "textarea-primitive": inputPreview = <TextAreaField {...sharedFieldProps} label={undefined} helpText={undefined} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Textarea primitive" />; inputComponentName = "TextAreaField"; break;
      case "select": inputPreview = <SelectField {...sharedFieldProps} options={[{ label: "Neutral - S1", value: "neutral-s1" }, { label: "Brand - S1", value: "brand-s1" }]} />; inputComponentName = "SelectField"; break;
      case "date": inputPreview = <DateField {...sharedFieldProps} />; inputComponentName = "DateField"; break;
      case "autocomplete": inputPreview = <AutocompleteField label={sharedFieldProps.label} helpText={sharedFieldProps.helpText} disabled={sharedFieldProps.state === "disabled"} options={[{ id: "button", label: "Button" }, { id: "chip", label: "Chip" }, { id: "input", label: "Input" }, { id: "popover", label: "Popover" }, { id: "search", label: "Search" }, { id: "tag", label: "Tag" }]} defaultValue={["button", "chip"]} />; inputComponentName = "AutocompleteField"; break;
      case "number-center": inputPreview = <NumberField {...sharedFieldProps} align="center" defaultValue={1} />; inputComponentName = "NumberField"; break;
      case "number-left": inputPreview = <NumberField {...sharedFieldProps} align="left" defaultValue={1} />; inputComponentName = "NumberField"; break;
      case "richtext": inputPreview = <RichTextField {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Write formatted content" />; inputComponentName = "RichTextField"; break;
      case "editor-bar": inputPreview = <RichTextEditorBar />; inputComponentName = "RichTextEditorBar"; break;
      case "control-bar-item": inputPreview = <><ControlBarSelectItem aria-label="Default" icon={<Icon name="icon-bold-01-line" decorative />} /><ControlBarSelectItem aria-label="Selected" state="selected" icon={<Icon name="icon-bold-01-line" decorative />} /></>; inputComponentName = "ControlBarSelectItem"; break;
      case "heading": inputPreview = <HeadingField headingSize="h2" disabled={resolvedInputState === "disabled"} placeholder="Section heading" />; inputComponentName = "HeadingField"; break;
      case "conditions": inputPreview = <InputConditions><InputConditionItem label="At least 8 characters" state="success" /><InputConditionItem label="Includes a number" state="default" /><InputConditionItem label="Avoids common passwords" state="wrong" /></InputConditions>; inputComponentName = "InputConditions"; break;
      default: inputPreview = <InputField {...sharedFieldProps} placeholder="Enter your name" />;
    }
    return (
      <ExamplePage eyebrow="Components / Input" title="Input" description="Production field compositions from the Figma Input page, with leading/trailing slots and native interaction states.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Input</h2>
          <div className="platform-playground-controls" aria-label="Input playground controls">
            <PlaygroundFilterChip label="Type" value={inputKind} onChange={(value) => setInputKind(String(value) || undefined)} options={inputPlaygroundKinds.map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={inputSize} onChange={(value) => setInputSize(String(value) || undefined)} options={["small", "medium", "large", "xlarge"].map((id) => ({ id, label: id }))} />
            <PlaygroundToggle label="Label" selected={inputLabel} onChange={setInputLabel} />
            <PlaygroundToggle label="Help Text" selected={inputHelp} onChange={setInputHelp} />
            <PlaygroundToggle label="Leading" selected={inputLeading} onChange={setInputLeading} />
            <PlaygroundToggle label="Leading Label" selected={inputLeadingLabel} onChange={setInputLeadingLabel} />
            <PlaygroundToggle label="Trailing" selected={inputTrailing} onChange={setInputTrailing} />
            <PlaygroundToggle label="Trailing Label" selected={inputTrailingLabel} onChange={setInputTrailingLabel} />
            <PlaygroundToggle label="Disabled" selected={inputDisabled} onChange={setInputDisabled} />
          </div>
          <div className="platform-input-preview">{inputPreview}</div>
          <PlatformCode code={`import { ${inputComponentName}, InputLeadingTrailing } from "@zen/design-system";
import { Icon } from "@zen/design-system/icons";

<${inputComponentName}
  size="${resolvedInputSize}"
  state="${resolvedInputState}"
  label="Label"
  helpText="Supporting help text"
  leading={<InputLeadingTrailing icon={<Icon name="icon-user-circle-line" decorative />} label="User" />}
  trailing={<InputLeadingTrailing label="VN" dropdown />}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "search") {
    const resolvedSearchTheme = (searchTheme ?? "default") as SearchTheme;
    const resolvedSearchSize = (searchSize ?? "medium") as SearchSize;
    const resolvedSearchState: SearchState = searchDisabled ? "disabled" : "default";
    const resolvedSearchIcon = searchIcon !== "no";
    return (
      <ExamplePage eyebrow="Components / Search" title="Search" description="Default, filter-icon and filter-dropdown variants mapped from the Figma Search page.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Search</h2>
          <div className="platform-playground-controls" aria-label="Search playground controls">
            <PlaygroundFilterChip label="Theme" value={searchTheme} onChange={(value) => setSearchTheme(String(value) || undefined)} options={["default", "filter-icon", "filter-dropdown"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={searchSize} onChange={(value) => setSearchSize(String(value) || undefined)} options={["small", "medium"].map((id) => ({ id, label: id }))} />
            <PlaygroundToggle label="Icon Search" selected={searchIcon !== "no"} onChange={(selected) => setSearchIcon(selected ? "yes" : "no")} />
            <PlaygroundToggle label="Disabled" selected={searchDisabled} onChange={setSearchDisabled} />
          </div>
          <div className="platform-example-row platform-search-row">
            <Search theme={resolvedSearchTheme} size={resolvedSearchSize} state={resolvedSearchState} iconSearch={resolvedSearchIcon} placeholder="Search components" />
          </div>
          <PlatformCode code={`import { Search } from "@zen/design-system";

<Search
  theme="${resolvedSearchTheme}"
  size="${resolvedSearchSize}"
  state="${resolvedSearchState}"
  iconSearch={${resolvedSearchIcon}}
  placeholder="Search components"
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "segmented") {
    const resolvedLevel = (segmentedLevel ?? "primary") as SegmentedLevel;
    const resolvedSize = (segmentedSize ?? "medium") as SegmentedSize;
    const resolvedState: SegmentedState = segmentedDisabled ? "disabled" : "default";
    const segmentedOptions = [
      { id: "overview", label: segmentedLabel ? "Overview" : null, leading: segmentedIcon ? <Icon name="icon-grid-01-line" decorative /> : undefined, badge: segmentedBadge ? 2 : undefined, state: resolvedState },
      { id: "tokens", label: segmentedLabel ? "Tokens" : null, leading: segmentedIcon ? <Icon name="icon-colors-line" decorative /> : undefined, badge: segmentedBadge ? 4 : undefined, state: resolvedState },
      { id: "components", label: segmentedLabel ? "Components" : null, leading: segmentedIcon ? <Icon name="icon-cube-line" decorative /> : undefined, state: resolvedState },
    ];
    return <ExamplePage eyebrow="Components / Segmented" title="Segmented" description="Mutually exclusive options using the Figma Segmented container and item primitives.">
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
        <div className="platform-example-row"><Segmented level={resolvedLevel} size={resolvedSize} value={segmentedValue} onChange={setSegmentedValue} options={segmentedOptions} /></div>
        <PlatformCode code={`import { Segmented } from "@zen/design-system";

<Segmented
  level="${resolvedLevel}"
  size="${resolvedSize}"
  value="${segmentedValue}"
  onChange={setValue}
  options={options}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "toggle") {
    const resolvedSize = (toggleSize ?? "medium") as ToggleSize;
    const resolvedState: ToggleState = toggleDisabled ? "disabled" : toggleHover ? "hover" : "default";
    const resolvedTheme = (toggleTheme ?? "text-first") as ToggleTheme;
    return <ExamplePage eyebrow="Components / Toggle" title="Toggle" description="Toggle/Button and Toggle/Content are composed into the complete Figma Toggle set with Size, State, Select and Theme axes.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Toggle</h2>
        <div className="platform-playground-controls" aria-label="Toggle playground controls">
          <PlaygroundFilterChip label="Size" value={toggleSize} onChange={(value) => setToggleSize(String(value) || undefined)} options={["small", "medium", "large"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={toggleTheme} onChange={(value) => setToggleTheme(String(value) || undefined)} options={["text-first", "toggle-first"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={toggleSelected} onChange={setToggleSelected} />
          <PlaygroundToggle label="Caption" selected={toggleCaption} onChange={setToggleCaption} />
          <PlaygroundToggle label="Bold" selected={toggleBold} onChange={setToggleBold} />
          <PlaygroundToggle label="Hover" selected={toggleHover} onChange={setToggleHover} />
          <PlaygroundToggle label="Disabled" selected={toggleDisabled} onChange={setToggleDisabled} />
        </div>
        <div className="platform-example-row"><Toggle size={resolvedSize} state={resolvedState} theme={resolvedTheme} selected={toggleSelected} onSelectedChange={setToggleSelected} label="Enable notifications" caption={toggleCaption ? "Receive updates for this workspace." : undefined} bold={toggleBold} /></div>
        <PlatformCode code={`import { Toggle } from "@zen/design-system";

<Toggle
  size="${resolvedSize}"
  state="${resolvedState}"
  theme="${resolvedTheme}"
  selected={${toggleSelected}}
  onSelectedChange={setSelected}
  label="Enable notifications"
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "avatar") {
    const resolvedSize = (avatarSize ?? "medium") as AvatarSize;
    const resolvedTheme = (avatarTheme ?? "accent") as AvatarTheme;
    const resolvedShape = (avatarShape ?? "circle") as AvatarShape;
    const resolvedBackground = (avatarBackground ?? "solid") as AvatarBackground;
    return <ExamplePage eyebrow="Components / Avatar" title="Avatar" description="Avatar/Single and Avatar/Stack use the size, theme, shape, background and status axes from Figma.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Avatar</h2>
        <div className="platform-playground-controls" aria-label="Avatar playground controls">
          <PlaygroundFilterChip label="Size" value={avatarSize} onChange={(value) => setAvatarSize(String(value) || undefined)} options={["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={avatarTheme} onChange={(value) => setAvatarTheme(String(value) || undefined)} options={["accent", "neutral", "blue", "green", "purple", "red"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Shape" value={avatarShape} onChange={(value) => setAvatarShape(String(value) || undefined)} options={["circle", "square"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={avatarBackground} onChange={(value) => setAvatarBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Status" selected={avatarStatus === "yes"} onChange={(selected) => setAvatarStatus(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Focus" selected={avatarFocus} onChange={setAvatarFocus} />
        </div>
        <div className="platform-example-row"><Avatar size={resolvedSize} theme={resolvedTheme} shape={resolvedShape} background={resolvedBackground} alt="Zen Design" status={avatarStatus === "yes"} focus={avatarFocus}>ZD</Avatar><AvatarStack size={resolvedSize} shape={resolvedShape} background={resolvedBackground} items={[{ alt: "Ava Chen", children: "AC", theme: "blue" }, { alt: "Bao Nguyen", children: "BN", theme: "green" }, { alt: "Chi Tran", children: "CT", theme: "purple" }, { alt: "Duy Le", children: "DL", theme: "red" }, { alt: "More", children: "ME" }]} /></div>
        <PlatformCode code={`import { Avatar, AvatarStack } from "@zen/design-system";

<Avatar
  size="${resolvedSize}"
  theme="${resolvedTheme}"
  shape="${resolvedShape}"
  background="${resolvedBackground}"
  status={${avatarStatus === "yes"}}
  focus={${avatarFocus}}
>
  ZD
</Avatar>

<AvatarStack size="${resolvedSize}" items={items} />`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "checkbox") {
    const resolvedState: CheckboxState = checkboxDisabled ? "disabled" : "default";
    const resolvedSide = (checkboxSide ?? "left") as CheckboxSide;
    return <ExamplePage eyebrow="Components / Checkbox" title="Checkbox" description="Checkbox/Text with left or right mark, caption, selection and interaction states.">
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
        <div className="platform-example-row"><Checkbox checked={checkboxChecked} indeterminate={checkboxIndeterminate} onChange={(next) => setCheckboxChecked(next)} state={resolvedState} checkSide={resolvedSide} label="Include source maps" caption={checkboxCaption ? "Useful for debugging production builds." : undefined} bold={checkboxBold} /></div>
        <PlatformCode code={`import { Checkbox } from "@zen/design-system";

<Checkbox
  state="${resolvedState}"
  checkSide="${resolvedSide}"
  checked={checked}
  onChange={setChecked}
  label="Include source maps"
  caption="Useful for debugging production builds."
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "radio-button") {
    const resolvedState: RadioState = radioDisabled ? "disabled" : "default";
    const resolvedSide = (radioSide ?? "left") as RadioSide;
    return <ExamplePage eyebrow="Components / Radio Button" title="Radio Button" description="Radio-Button/Text with mutually exclusive selection, side and state axes from Figma.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Radio Button</h2>
        <div className="platform-playground-controls" aria-label="Radio playground controls">
          <PlaygroundFilterChip label="Side" value={radioSide} onChange={(value) => setRadioSide(String(value) || undefined)} options={["left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={radioChecked} onChange={setRadioChecked} />
          <PlaygroundToggle label="Caption" selected={radioCaption} onChange={setRadioCaption} />
          <PlaygroundToggle label="Bold" selected={radioBold} onChange={setRadioBold} />
          <PlaygroundToggle label="Disabled" selected={radioDisabled} onChange={setRadioDisabled} />
        </div>
        <div className="platform-example-row"><RadioButton checked={radioChecked} onChange={(next) => setRadioChecked(next)} state={resolvedState} radioSide={resolvedSide} name="radio-preview" label="Use semantic tokens" caption={radioCaption ? "Recommended for component consumers." : undefined} bold={radioBold} /></div>
        <PlatformCode code={`import { RadioButton } from "@zen/design-system";

<RadioButton
  state="${resolvedState}"
  radioSide="${resolvedSide}"
  name="token-source"
  checked={checked}
  onChange={setChecked}
  label="Use semantic tokens"
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "badge") {
    const resolvedSize = (badgeSize ?? "medium") as BadgeSize;
    const resolvedTheme = (badgeTheme ?? "neutral") as BadgeTheme;
    const resolvedBackground = (badgeBackground ?? "solid") as BadgeBackground;
    const showLeading = badgeLeading === "yes";
    const showRemove = badgeRemove === "yes";
    return <ExamplePage eyebrow="Components / Badge" title="Badge" description="Badge and Badge-Counter for compact status, category and count communication.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Badge</h2>
        <div className="platform-playground-controls" aria-label="Badge playground controls">
          <PlaygroundFilterChip label="Size" value={badgeSize} onChange={(value) => setBadgeSize(String(value) || undefined)} options={["xsmall", "small", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={badgeTheme} onChange={(value) => setBadgeTheme(String(value) || undefined)} options={["neutral", "accent", "blue", "green", "red"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={badgeBackground} onChange={(value) => setBadgeBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Leading Icon" selected={badgeLeading === "yes"} onChange={(selected) => setBadgeLeading(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Remove" selected={badgeRemove === "yes"} onChange={(selected) => setBadgeRemove(selected ? "yes" : "no")} />
        </div>
        <div className="platform-example-row"><Badge size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} leadingIcon={showLeading} leading={showLeading ? <Icon name="icon-check-line" decorative /> : undefined} remove={showRemove}>Approved</Badge><BadgeCounter size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} value={7} /></div>
        <PlatformCode code={`import { Badge, BadgeCounter } from "@zen/design-system";

import { Icon } from "@zen/design-system/icons";

<Badge
  size="${resolvedSize}"
  theme="${resolvedTheme}"
  background="${resolvedBackground}"
  leadingIcon={${showLeading}}
  leading={${showLeading ? `<Icon name="icon-check-line" decorative />` : "undefined"}}
  remove={${showRemove}}
>
  Approved
</Badge>
<BadgeCounter size="${resolvedSize}" value={7} />`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "popover") {
    const popoverItems: PopoverItemData[] = [
      { id: "xsmall", label: "XSmall", value: "xsmall", selected: popoverSelected === "xsmall", leading: <Icon name="icon-ruler-line" size="sm" decorative /> },
      { id: "small", label: "Small", value: "small", selected: popoverSelected === "small", leading: <Icon name="icon-ruler-line" size="sm" decorative /> },
      { id: "medium", label: "Medium", value: "medium", selected: popoverSelected === "medium", leading: <Icon name="icon-ruler-line" size="sm" decorative /> },
      { id: "large", label: "Large", value: "large", selected: popoverSelected === "large", leading: <Icon name="icon-ruler-line" size="sm" decorative /> },
    ];
    const visibleItems = popoverItems.filter((item) => String(item.label).toLowerCase().includes(popoverSearch.toLowerCase()));
    return <ExamplePage eyebrow="Components / Popover" title="Popover" description="The shared Popover surface and Item primitive used by Select, Chip advanced and other dropdown compositions.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Popover</h2>
        <div className="platform-playground-controls" aria-label="Popover playground controls">
          <PlaygroundToggle label="Open" selected={popoverOpen} onChange={setPopoverOpen} />
          <PlaygroundToggle label="Search" selected={popoverSearchOn} onChange={(on) => { setPopoverSearchOn(on); if (!on) setPopoverSearch(""); }} />
        </div>
        <div className="platform-example-row platform-popover-preview">
          <div className="platform-popover-anchor">
            <div ref={popoverAnchorRef} style={{ display: "inline-flex" }}><Button appearance="main" level="secondary" size="sm" onClick={() => setPopoverOpen((open) => !open)} endIcon={<Icon name="icon-chevron-down-line" decorative />}>Component Size</Button></div>
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              anchorRef={popoverAnchorRef}
              label="Component Size"
              search={popoverSearchOn}
              searchValue={popoverSearch}
              onSearchChange={setPopoverSearch}
              items={visibleItems}
              onSelect={(item) => { setPopoverSelected(item.id); setPopoverOpen(false); }}
            />
          </div>
        </div>
        <PlatformCode code={`import { Button, Popover } from "@zen/design-system";

<Button ref={anchorRef} onClick={() => setOpen(!open)}>Component Size</Button>
<Popover
  open={open}
  onOpenChange={setOpen}
  anchorRef={anchorRef}
  label="Component Size"
  search={${popoverSearchOn}}
  items={items}
  onSelect={(item) => setValue(item.id)}
/>`} />
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
