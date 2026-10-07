import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton, type ButtonAppearance, type ButtonLevel, type ButtonSize } from "../components/Button";
import { Chip, type ChipLevel, type ChipSize, type ChipState, type ChipTheme, type ChipVariant } from "../components/Chip";
import { Icon, type IconName } from "../components/Icon";
import { AutocompleteField, ControlBarSelectItem, DateField, HeadingField, headingInputSizes, type HeadingInputSize, InputConditionItem, InputConditions, InputContent, InputField, InputHelpText, InputLabel, InputLeadingTrailing, NumberField, type InputHelpTheme, RichTextEditorBar, RichTextField, SelectField, TextAreaField, type InputSize, type InputState } from "../components/Input";
import { Search, type SearchSize, type SearchTheme, type SearchVariant } from "../components/Search";
import { Sidebar, SidebarSubMenu, type SidebarBackground, type SidebarSection, type SidebarVariant } from "../components/Sidebar";
import { Segmented, type SegmentedLevel, type SegmentedSize } from "../components/Segmented";
import { Avatar, AvatarStack, avatarThemes, type AvatarBackground, type AvatarShape, type AvatarSize, type AvatarTheme } from "../components/Avatar";
import { Menu } from "../components/Menu";
import { Checkbox, type CheckboxSide } from "../components/Checkbox";
import { RadioButton, type RadioSide } from "../components/RadioButton";
import { Badge, BadgeCounter, badgeThemes, type BadgeBackground, type BadgeSize, type BadgeTheme } from "../components/Badge";
import { Toggle, type ToggleSize, type ToggleTheme } from "../components/Toggle";
import type { PopoverItemData } from "../components/Popover";
import { Tag, type TagTheme } from "../components/Tag";
import { DatePicker, type DatePickerDevice, type DatePickerTime } from "../components/DatePicker";
import { Tooltip, tooltipColors, type TooltipColor, type TooltipPlacement, type TooltipSize } from "../components/Tooltip";
import { Tabs, TabPanel, type TabSize, type TabVariant } from "../components/Tabs";
import { Breadcrumbs, type BreadcrumbEmphasis } from "../components/Breadcrumbs";
import { ProgressBar, ProgressCircle, progressCircleThemes, type ProgressBarTheme, type ProgressCircleTheme } from "../components/Progress";
import { Dialog, ModalForm, dialogThemes, modalActionDirections, modalFormLayouts, type DialogTheme, type ModalActionDirection, type ModalFormLayout } from "../components/Dialog";
import { Accordion, type AccordionContentWidth, type AccordionSize, type AccordionTheme } from "../components/Accordion";
import { Divider, dividerColors, type DividerColor } from "../components/Divider";
import { InlineMessage, inlineMessageThemes, type InlineMessageTheme } from "../components/InlineMessage";
import { EmptyState } from "../components/EmptyState";
import { Stepper, type StepperOrientation } from "../components/Stepper";
import { Slider, sliderSizes, sliderThemes, type SliderSize, type SliderTheme } from "../components/Slider";
import { Card, cardSpacings, cardThemes, type CardSpacing, type CardTheme } from "../components/Card";
import { DockIcon, dockIconSizes, dockIconThemes, type DockIconBackground, type DockIconSize, type DockIconTheme } from "../components/DockIcon";
import { List, ListBox, ListItem, listBoxThemes, type ListBoxTheme } from "../components/ListItem";
import { Table, TableActions, TableBadges, TableMedia, TableTags, TableText, TableTrend, type TableSort } from "../components/Table";
import { VisuallyHidden } from "../components/VisuallyHidden";
import { NpsScale, OpinionScale, Rating, RatingDisplay, ratingSizes, ratingThemes, type RatingSize, type RatingTheme } from "../components/Rating";
import { ColorSelector } from "../components/ColorSelector";
import { Metric, MetricCard, metricSizes, type MetricSize, type MetricTrendDirection } from "../components/MetricWidget";
import { FileUpload, type UploaderFile } from "../components/Uploader";
import { SidePanel, type SidePanelSize, type SidePanelType } from "../components/SidePanel";
import { AlertBanner, alertBannerThemes, type AlertBannerSize, type AlertBannerTheme } from "../components/AlertBanner";
import { Pagination, type PaginationItemSize, type PaginationTheme } from "../components/Pagination";
import { orders, pageOf, ScrollBox } from "./PlatformPaginationData";
import { SkeletonHeading, SkeletonShape, SkeletonText, skeletonShapes, skeletonShapeSizes, type SkeletonHeadingSize, type SkeletonShapeSize } from "../components/Skeleton";
import { Toast, toastTypes, type ToastType } from "../components/Toast";
import { typographyStyles } from "../tokens/typography.generated";
import { FoundationOverview } from "../foundations/FoundationOverview";
import { IconGallery } from "../foundations/IconGallery";
import { TextStylesGallery } from "../foundations/TextStylesGallery";
import { TokenCollectionPage } from "../foundations/TokenCollectionPage";
import { MotionTokens } from "../foundations/MotionTokens";
import { collections } from "../foundations/collections";
import { PlatformPageTemplate, PlatformTypographyContext } from "./PlatformTemplate";
import { PlatformCode } from "./PlatformCode";
import { ComponentGuidelines } from "./PlatformGuidelines";
import { ComponentApi, ComponentKeyboard, ComponentProps, PlatformOnThisPage, PlatformSection } from "./PlatformReference";
import { AiChatPlayground, BottomNavigationPlayground, BottomSheetPlayground, ChartPlayground, ChatPlayground, TopNavigationPlayground } from "./PlatformMobilePlaygrounds";
import { figmaSidebarBrand } from "./PlatformSidebarBrand";
import { appLayerPages } from "./PlatformAppLayer";
import { TypographyHierarchyRules } from "./PlatformTypographyHierarchy";
import type { AppLayerPage } from "./appLayer/types";
import { useStudioBridge } from "./studio/bridge";
import { ComponentPreview, PlaygroundControls, PlaygroundFilterChip, PlaygroundSlot, PlaygroundToggle } from "./appLayer/playgroundParts";
export { ComponentPreview, PlaygroundControls, PlaygroundFilterChip, PlaygroundSlot, PlaygroundToggle } from "./appLayer/playgroundParts";
import { ComponentExamples, PopoverBulkSelectionDemo } from "./PlatformShowcases";
import { popoverContentKinds, popoverContentSet, type PopoverContentKind } from "./PlatformPopoverContent";

const samplePhoto = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d9c7b8"/><circle cx="16" cy="13" r="6" fill="#8f735f"/><rect x="6" y="21" width="20" height="14" rx="7" fill="#8f735f"/></svg>');

export type PlatformPage = "overviews" | "installation" | "design-tokens" | "typography" | "iconography" | "button" | "chip" | "sidebar" | "input" | "search" | "segmented" | "toggle" | "avatar" | "checkbox" | "radio-button" | "badge" | "popover" | "tag" | "date-picker" | "tooltip" | "tabs" | "breadcrumbs" | "progress" | "dialog" | "accordion" | "alert-banner" | "pagination" | "skeleton" | "toast" | "divider" | "empty-state" | "inline-message" | "slider" | "stepper" | "card" | "dock-icon" | "list-item" | "table" | "color-selector" | "metric" | "rating" | "side-panel" | "uploader" | "ai-chat" | "bottom-navigation" | "bottom-sheet" | "chart" | "chat" | "top-navigation" | AppLayerPage;

/**
 * Figma Component-Page-Template (Codebase Platform 14260:96953): the content column (Playground, Examples,
 * Keyboard, API, Guidelines) with the sticky "On this page" bookmarks beside it.
 */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
function ExamplePage({ eyebrow, title, description, titleLines, page, children }: { eyebrow: string; title: string; description: string; titleLines?: string[]; page?: PlatformPage; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const studio = useStudioBridge();
  // Zen Studio (the canvas tool) lays a component page out as frames: playground, examples, docs.
  if (studio && page) return <>{studio.renderComponentPage({ page, eyebrow, title, description, playground: children })}</>;
  return (
    <PlatformPageTemplate title={title} eyebrow={eyebrow} titleLines={titleLines} description={description}>
      {page ? (
        <div className="platform-example-page platform-component-page">
          <div ref={contentRef} className="platform-component-page__content">
            <PlatformSection id="playground" label="Playground">{children}</PlatformSection>
            <PlatformSection id="examples" label="Examples"><ComponentExamples page={page} /></PlatformSection>
            <ComponentKeyboard page={page} />
            <ComponentApi page={page} />
            <ComponentProps page={page} />
            <PlatformSection id="guidelines" label="Guidelines"><ComponentGuidelines page={page} /></PlatformSection>
          </div>
          <PlatformOnThisPage scope={contentRef} />
        </div>
      ) : <div className="platform-example-page">{children}</div>}
    </PlatformPageTemplate>
  );
}

/** Only production field compositions are selectable in the platform page.
 * Figma primitive owners remain nested implementation details, not previews. */
const inputPlaygroundKinds = ["text", "field-only", "textarea", "select", "date", "autocomplete", "number-left", "number-center", "richtext", "heading", "conditions", "label", "help-text"] as const;
/** Input-Conditions demo rules: each turns Success when met, Wrong once the user has typed and it is not. */
const passwordRules = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "Contains an uppercase letter (A-Z)", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Contains a digit (0-9)", test: (value: string) => /\d/.test(value) },
  { label: "Contains a special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

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
import { Icon } from "@zen/design-system";

<IconButton
  appearance="${appearance}"
  level="${level}"
  size="${size}"${disabled ? `
  disabled` : ""}
  aria-label="Add"
  icon={<Icon name="icon-plus-line" decorative />}
/>`
    : `import { Button } from "@zen/design-system";
import { Icon } from "@zen/design-system";


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
        <PlaygroundControls aria-label={`${title} playground controls`}>
          <PlaygroundFilterChip label="Level" value={level} onChange={(value) => setLevel(String(value) as ButtonLevel)} options={levels.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={size} onChange={(value) => setSize(String(value) as ButtonSize)} options={sizes.map((id) => ({ id, label: id.toUpperCase() }))} />
          <PlaygroundToggle label="Disabled" selected={disabled} onChange={setDisabled} />
          {!iconOnly ? <PlaygroundToggle label="Leading Icon" selected={leading} onChange={setLeading} /> : null}
          {!iconOnly ? <PlaygroundToggle label="Trailing Icon" selected={trailing} onChange={setTrailing} /> : null}
        </PlaygroundControls>
        <div data-typography={previewTypography} className={`platform-example-row${appearance === "overlay" ? " platform-example-row--overlay" : ""}`}>
          {iconOnly ? (
            // zen-allow-no-action: the playground specimen is the component being configured, not an action.
            <IconButton aria-label={`${title} preview`} appearance={appearance} level={level} size={size} disabled={disabled} icon={<Icon name="icon-plus-line" decorative />} />
          ) : (
            // zen-allow-action-handler: the playground specimen is the component being configured, not an action.
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
  // Playground actions never do nothing: the preview logs which handler ran (like Storybook's Actions panel).
  const [actionLog, setActionLog] = useState<string | null>(null);
  useEffect(() => { setActionLog(null); }, [page]);
  const logAction = (label: string, handler = "onClick") => setActionLog(`“${label}” pressed · ${handler} ran`);
  const actionNote = actionLog ? <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{actionLog}</p> : null;
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
  const [conditionsPassword, setConditionsPassword] = useState("Zen2026");
  // Read-only and Disabled are exclusive; Disabled only on the kinds Figma gives State=Disabled (Field-Only 374:103464).
  const [inputReadOnly, setInputReadOnly] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [inputHeadingSize, setInputHeadingSize] = useState<string | undefined>("h2");
  const [inputHeadingMultiline, setInputHeadingMultiline] = useState(false);
  const [inputRichBar, setInputRichBar] = useState(true);
  const [inputRichHtml, setInputRichHtml] = useState("");
  const [inputLabel, setInputLabel] = useState(true);
  const [inputHelp, setInputHelp] = useState(true);
  const [inputLabelOptional, setInputLabelOptional] = useState(false);
  const [inputLabelTooltip, setInputLabelTooltip] = useState(false);
  const [inputLabelAction, setInputLabelAction] = useState(false);
  const [inputLabelDisabled, setInputLabelDisabled] = useState(false);
  const [inputHelpTheme, setInputHelpTheme] = useState<string | undefined>("neutral");
  const [inputHelpIcon, setInputHelpIcon] = useState(true);
  const [inputHelpLimit, setInputHelpLimit] = useState(false);
  const [inputLeading, setInputLeading] = useState(true);
  const [inputLeadingLabel, setInputLeadingLabel] = useState(true);
  const [inputTrailing, setInputTrailing] = useState(true);
  const [inputTrailingLabel, setInputTrailingLabel] = useState(true);
  const [inputLeadingClickable, setInputLeadingClickable] = useState(true);
  const [inputTrailingClickable, setInputTrailingClickable] = useState(true);
  const [inputError, setInputError] = useState(false);
  const [inputNumber, setInputNumber] = useState<number | null>(1);
  const [inputLeadingValue, setInputLeadingValue] = useState("user");
  const [inputTrailingValue, setInputTrailingValue] = useState("vn");
  const [searchTheme, setSearchTheme] = useState<string | undefined>("default");
  const [searchSize, setSearchSize] = useState<string | undefined>("medium");
  const [searchVariant, setSearchVariant] = useState<string | undefined>("default");
  const [searchIcon, setSearchIcon] = useState<string | undefined>("yes");
  const [searchValue, setSearchValue] = useState("");
  const [searchFilterClickable, setSearchFilterClickable] = useState(true);
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [searchFilter, setSearchFilter] = useState("all");
  const [segmentedLevel, setSegmentedLevel] = useState<string | undefined>("secondary");
  const [segmentedFull, setSegmentedFull] = useState(false);
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
  const [sidebarBackground, setSidebarBackground] = useState<string | undefined>(undefined);
  const [sidebarCanvas, setSidebarCanvas] = useState<string | undefined>(undefined);
  const [sidebarWorkspaceBar, setSidebarWorkspaceBar] = useState(true);
  const [sidebarSubMenu, setSidebarSubMenu] = useState(false);
  const [sidebarWorkspace, setSidebarWorkspace] = useState("workspace-a");
  const [sidebarSelected, setSidebarSelected] = useState("dashboard");
  const [sidebarNewProjects, setSidebarNewProjects] = useState<string[]>([]);
  const [sidebarNewWorkspaces, setSidebarNewWorkspaces] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverTrigger, setPopoverTrigger] = useState<string | undefined>("chip");
  const [popoverBulkHistory, setPopoverBulkHistory] = useState(true);
  const [popoverBulkDelete, setPopoverBulkDelete] = useState(true);
  const [popoverLabelOn, setPopoverLabelOn] = useState(true);
  const [popoverSearch, setPopoverSearch] = useState("");
  const [popoverSearchOn, setPopoverSearchOn] = useState(true);
  const [popoverSelected, setPopoverSelected] = useState("updated");
  const [popoverContent, setPopoverContent] = useState<string | undefined>("icon");
  const [popoverCaption, setPopoverCaption] = useState(false);
  const [popoverCreateOn, setPopoverCreateOn] = useState(false);
  const [popoverCreated, setPopoverCreated] = useState<string[]>([]);
  // The playground's surface opens by itself the first time its trigger is in view with room below it (opened at page
  // load it would sit over the intro and move on the way down). A press on the playground controls leaves it open, and
  // every control change opens it, so each change shows on the open surface.
  const popoverStageRef = useRef<HTMLDivElement>(null);
  const popoverControlPress = useRef(false);
  useEffect(() => {
    setPopoverOpen(false);
    const stage = popoverStageRef.current;
    if (page !== "popover" || !stage || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPopoverOpen(true);
    }, { rootMargin: "0px 0px -300px 0px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [page]);
  const holdPopoverOpen = () => {
    popoverControlPress.current = true;
    requestAnimationFrame(() => { popoverControlPress.current = false; });
  };
  const changePopoverOpen = (open: boolean) => {
    if (!open && popoverControlPress.current) return;
    setPopoverOpen(open);
    if (!open) setPopoverSearch("");
  };
  const [tagTheme, setTagTheme] = useState<string | undefined>("text-only");
  const [tagRemove, setTagRemove] = useState(true);
  const [tagRemoved, setTagRemoved] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [tagDisabled, setTagDisabled] = useState(false);
  const [dateMode, setDateMode] = useState<string | undefined>("single");
  const [dateCalendar, setDateCalendar] = useState<string | undefined>("single");
  const [dateActions, setDateActions] = useState<string | undefined>("none");
  const [datePast, setDatePast] = useState(false);
  const [dateDevice, setDateDevice] = useState<string | undefined>("desktop");
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date | null } | null>(null);
  const [dateTimeOn, setDateTimeOn] = useState(false);
  const [dateTime, setDateTime] = useState<DatePickerTime | null>(null);
  const [tooltipColor, setTooltipColor] = useState<string | undefined>("default");
  const [tooltipSize, setTooltipSize] = useState<string | undefined>("medium");
  const [tooltipPlacement, setTooltipPlacement] = useState<string | undefined>("top");
  const [tooltipPinned, setTooltipPinned] = useState(false);
  const [tooltipDuplicated, setTooltipDuplicated] = useState(false);
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
  const [accordionContentWidth, setAccordionContentWidth] = useState<string | undefined>("title");
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
  const [toastCaption, setToastCaption] = useState(true);
  const [toastAction, setToastAction] = useState(true);
  const [toastClose, setToastClose] = useState(true);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [dividerColor, setDividerColor] = useState<string | undefined>("default");
  const [dividerOrientation, setDividerOrientation] = useState<string | undefined>("horizontal");
  const [dividerDashed, setDividerDashed] = useState(false);
  const [inlineTheme, setInlineTheme] = useState<string | undefined>("info");
  const [inlineTitle, setInlineTitle] = useState(true);
  const [inlineCaption, setInlineCaption] = useState(true);
  const [inlineAction, setInlineAction] = useState(false);
  const [inlineClose, setInlineClose] = useState(true);
  const [inlineDismissed, setInlineDismissed] = useState(false);
  const [emptyCaption, setEmptyCaption] = useState(true);
  const [emptyPrimary, setEmptyPrimary] = useState(true);
  const [emptySecondary, setEmptySecondary] = useState(true);
  const [emptyIllustration, setEmptyIllustration] = useState(true);
  const [stepperOrientation, setStepperOrientation] = useState<string | undefined>("horizontal");
  const [stepperCurrent, setStepperCurrent] = useState(1);
  const [stepperError, setStepperError] = useState(false);
  const [stepperCaption, setStepperCaption] = useState(true);
  const [sliderTheme, setSliderTheme] = useState<string | undefined>("neutral");
  const [sliderSize, setSliderSize] = useState<string | undefined>("medium");
  const [sliderValue, setSliderValue] = useState(40);
  const [sliderIcon, setSliderIcon] = useState(true);
  const [sliderLimits, setSliderLimits] = useState(false);
  const [sliderDisabled, setSliderDisabled] = useState(false);
  const [cardTheme, setCardTheme] = useState<string | undefined>("shadow");
  const [cardSpacing, setCardSpacing] = useState<string | undefined>("medium");
  const [cardActive, setCardActive] = useState(false);
  const [cardSubAction, setCardSubAction] = useState(true);
  const [dockTheme, setDockTheme] = useState<string | undefined>("accent");
  const [dockSize, setDockSize] = useState<string | undefined>("medium");
  const [dockBackground, setDockBackground] = useState<string | undefined>("solid");
  const [listLeading, setListLeading] = useState(true);
  const [listCaption, setListCaption] = useState(true);
  const [listTrailing, setListTrailing] = useState(true);
  const [listInteractive, setListInteractive] = useState(true);
  const [listSelected, setListSelected] = useState("ava");
  const [listBoxTheme, setListBoxTheme] = useState<ListBoxTheme>("flat");
  const [tableSelectable, setTableSelectable] = useState(true);
  const [tableSelected, setTableSelected] = useState<string[]>(["zen-web"]);
  const [tableSort, setTableSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });
  const [tableEmpty, setTableEmpty] = useState(false);
  const [ratingType, setRatingType] = useState<string | undefined>("star");
  const [ratingSize, setRatingSize] = useState<string | undefined>("large");
  const [ratingTheme, setRatingTheme] = useState<string | undefined>("default");
  const [ratingValue, setRatingValue] = useState(4);
  const [colorValue, setColorValue] = useState("var(--zen-color-background-support-blue-solid)");
  const [metricSize, setMetricSize] = useState<string | undefined>("xlarge");
  const [metricTrend, setMetricTrend] = useState<string | undefined>("positive");
  const [metricIcon, setMetricIcon] = useState(true);
  const [metricCard, setMetricCard] = useState(true);
  const [metricIconTheme, setMetricIconTheme] = useState<string | undefined>("green");
  const [metricIconSolid, setMetricIconSolid] = useState(false);
  const [uploadType, setUploadType] = useState<string | undefined>("dropzone");
  const [uploadThumb, setUploadThumb] = useState<string | undefined>("file");
  const [uploadError, setUploadError] = useState(false);
  const [uploadMultiple, setUploadMultiple] = useState(true);
  const [uploadExtended, setUploadExtended] = useState(true);
  const [uploadFiles, setUploadFiles] = useState<UploaderFile[]>([
    { id: "f1", name: "brand-guidelines.pdf", size: "1.2 MB", state: "uploading", progress: 64, caption: "7 seconds left" },
    { id: "f2", name: "tokens.json", size: "86 KB", state: "uploaded" },
    { id: "f3", name: "hero-banner.png", size: "2.4 MB", state: "alert", error: "File is over 2 MB" },
  ]);
  const [panelType, setPanelType] = useState<string | undefined>("modal");
  const [panelSize, setPanelSize] = useState<string | undefined>("default");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDescription, setPanelDescription] = useState(true);
  const [tableMode, setTableMode] = useState<string | undefined>("display");
  const [tableOpenButton, setTableOpenButton] = useState(true);
  const [tableLockRow, setTableLockRow] = useState(true);
  const [tableEditLog, setTableEditLog] = useState("");
  const [tableBudget, setTableBudget] = useState([
    { id: "zen-web", name: "Zen website", owner: "ava", budget: "12000", tags: ["web", "brand"], status: "live", archived: false },
    { id: "tokens", name: "Token pipeline", owner: "bao", budget: "8500", tags: ["tooling"], status: "review", archived: false },
    { id: "mobile", name: "Mobile kit", owner: "chi", budget: "4200", tags: ["ios", "android"], status: "blocked", archived: false },
    { id: "legacy", name: "Legacy docs", owner: "duy", budget: "0", tags: ["archive"], status: "live", archived: true },
  ]);
  const [dialogActions, setDialogActions] = useState<string | undefined>("dual");
  const [dialogKind, setDialogKind] = useState<string | undefined>("dialog");
  const [dialogDirection, setDialogDirection] = useState<string | undefined>("horizontal");
  const [formLayout, setFormLayout] = useState<string | undefined>("basic");
  const [formSide, setFormSide] = useState(true);
  const [formClose, setFormClose] = useState(true);
  const [dialogIcon, setDialogIcon] = useState(true);
  const [dialogDescription, setDialogDescription] = useState(true);
  const [dialogCustom, setDialogCustom] = useState(true);
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
        <MotionTokens />
        <ComponentGuidelines page="design-tokens" title="Border usage" />
        <ComponentGuidelines page="design-tokens" slug="content-colors" title="Content colour usage" />
      </PlatformPageTemplate>
    );
  }
  if (page === "typography") {
    return <PlatformPageTemplate title="Typography" eyebrow="Foundations" description="Composite typography contracts exported from Figma and connected to Typography and Emphasis variables."><TextStylesGallery embedded sampleTypography={previewTypography} /><PlatformSection id="hierarchy" label="Content hierarchy"><TypographyHierarchyRules /></PlatformSection><PlatformSection id="examples" label="Examples"><ComponentExamples page="typography" /></PlatformSection></PlatformPageTemplate>;
  }
  if (page === "iconography") {
    return <PlatformPageTemplate title="Iconography" eyebrow="Foundations" description="SVG icons are generated from one source folder and rendered through one component."><IconGallery embedded /><ComponentGuidelines page="iconography" /><ComponentGuidelines page="iconography" slug="file-icon" title="File icon usage" /><ComponentGuidelines page="iconography" slug="flag" title="Flag usage" /></PlatformPageTemplate>;
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
          <PlaygroundControls aria-label="Chip playground controls">
            <PlaygroundFilterChip label="Variant" value={chipVariant} onChange={(value) => setChipVariant(String(value) || undefined)} options={["advanced", "normal", "number-only"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Size" value={resolvedChipSize} onChange={(value) => setChipSize(String(value) || undefined)} options={allowedChipSizes.map((id) => ({ id, label: id }))} />
            {resolvedChipVariant === "normal" ? <PlaygroundFilterChip label="Level" value={chipLevel} onChange={(value) => setChipLevel(String(value) || undefined)} options={["primary", "secondary"].map((id) => ({ id, label: id }))} /> : null}
            {resolvedChipVariant === "advanced" ? <PlaygroundToggle label="Multiple" selected={chipMultiple} onChange={(on) => { setChipMultiple(on); if (!on) setChipSelected((current) => current.slice(0, 1)); }} /> : null}
            {resolvedChipVariant !== "number-only" ? <PlaygroundFilterChip label="Theme" value={chipThemes} multiple onChange={(value) => setChipThemes(Array.isArray(value) ? value : [value])} options={["text-only", "leading-icon", "leading-photo"].map((id) => ({ id, label: id }))} /> : null}
            <PlaygroundToggle label="Disabled" selected={chipDisabled} onChange={setChipDisabled} />
          </PlaygroundControls>
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
    // Background layers: the page Canvas decides the sidebar Surface unless Background is picked by hand.
    const resolvedSidebarCanvas = (sidebarCanvas ?? (resolvedSidebarVariant === "workspace" ? "alt" : "default")) as "default" | "alt" | "flat";
    const resolvedSidebarBackground = (sidebarBackground ?? { default: "default", alt: "alt", flat: "flat" }[resolvedSidebarCanvas]) as SidebarBackground;
    const sidebarIcon = (name: IconName) => <Icon name={name} size="base" />;
    // Section and rail actions work: New project / Add workspace create an item and select it.
    const addSidebarProject = () => { const id = `project-new-${sidebarNewProjects.length + 1}`; setSidebarNewProjects((list) => [...list, id]); setSidebarSelected(id); };
    const addSidebarWorkspace = () => { const id = `workspace-new-${sidebarNewWorkspaces.length + 1}`; setSidebarNewWorkspaces((list) => [...list, id]); setSidebarWorkspace(id); };
    const sidebarSections: SidebarSection[] = [
      { items: [
        { id: "dashboard", label: "Dashboard", selected: sidebarSelected === "dashboard", icon: sidebarIcon("icon-home-03-line") },
        { id: "inbox", label: "Inbox", counter: 12, selected: sidebarSelected === "inbox", icon: sidebarIcon("ic-inbox-01-line") },
        { id: "activity", label: "Activity", notificationDot: true, selected: sidebarSelected === "activity", icon: sidebarIcon("icon-bell-01-line") },
      ] },
      { label: "Projects", action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New project" icon={<Icon name="icon-plus-line" />} onClick={addSidebarProject} />, items: [
        // New projects come first (newest on top), in view right under the section label.
        ...[...sidebarNewProjects].reverse().map((id) => ({ id, label: sidebarNewProjects.indexOf(id) ? `Untitled project ${sidebarNewProjects.indexOf(id) + 1}` : "Untitled project", selected: sidebarSelected === id, icon: sidebarIcon("icon-cube-line") })),
        { id: "design-system", label: "Design system", dropdown: true, selected: sidebarSelected.startsWith("ds-"), icon: sidebarIcon("icon-cube-line"), children: [{ id: "ds-components", label: "Components", selected: sidebarSelected === "ds-components" }, { id: "ds-tokens", label: "Tokens", selected: sidebarSelected === "ds-tokens" }] },
        { id: "website", label: "Website", selected: sidebarSelected === "website", icon: sidebarIcon("icon-globe-02-line"), trailingAction: <Icon name="icon-dots-horizontal-line" size="base" decorative /> },
        { id: "archive", label: "Archive (read-only)", disabled: true, icon: sidebarIcon("icon-folder-line") },
      ] },
    ];
    const sidebarFooter = <>{([["figma", "ic-figma-line", "Download Figma"], ["feedback", "icon-message-chat-circle-line", "Feedback"]] as const).map(([id, icon, label]) => <button key={id} type="button" aria-current={sidebarSelected === id ? "page" : undefined} onClick={() => setSidebarSelected(id)}><Icon name={icon} size="base" /><span>{label}</span></button>)}</>;
    return (
      <ExamplePage page="sidebar" eyebrow="Components / Sidebar" title="Patterns/Sidebar" titleLines={["Patterns/", "Sidebar"]} description="One shared Sidebar preview with the Figma Basic, Small-Density and Workspace variants selectable from the playground.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Patterns/Sidebar</h2>
            <PlaygroundControls aria-label="Sidebar playground controls">
              <PlaygroundFilterChip label="Variant" value={sidebarVariant} onChange={(value) => setSidebarVariant(String(value) || undefined)} options={["basic", "small-density", "workspace"].map((id) => ({ id, label: id }))} />
              {resolvedSidebarVariant !== "workspace" ? <PlaygroundToggle label="Expand" selected={!sidebarCollapsed} onChange={(selected) => setSidebarCollapsed(!selected)} /> : null}
              <PlaygroundFilterChip label="Canvas" value={sidebarCanvas} onChange={(value) => { setSidebarCanvas(String(value) || undefined); setSidebarBackground(undefined); }} options={["default", "alt", "flat"].map((id) => ({ id, label: id }))} />
              <PlaygroundFilterChip label={resolvedSidebarVariant === "workspace" ? "Master Background" : "Background"} value={sidebarBackground} onChange={(value) => setSidebarBackground(String(value) || undefined)} options={["default", "alt", "flat", "inverse"].map((id) => ({ id, label: id }))} />
              {resolvedSidebarVariant === "workspace" ? <PlaygroundToggle label="Workspace Bar" selected={sidebarWorkspaceBar} onChange={setSidebarWorkspaceBar} /> : null}
              <PlaygroundToggle label="Sub Menu" selected={sidebarSubMenu} onChange={setSidebarSubMenu} />
          </PlaygroundControls>
          <div data-typography={previewTypography} className="platform-example-row platform-sidebar-stage" data-canvas={resolvedSidebarCanvas}>
            <Sidebar
              variant={resolvedSidebarVariant}
              {...figmaSidebarBrand}
              collapsed={sidebarCollapsed && resolvedSidebarVariant !== "workspace"}
              onCollapsedChange={setSidebarCollapsed}
              background={resolvedSidebarBackground}
              workspaceBar={sidebarWorkspaceBar}
              workspaceItems={[{ id: "workspace-a", label: "Workspace A", selected: sidebarWorkspace === "workspace-a", icon: <Avatar size="medium" shape="square" theme="brown" background="solid" alt="">A</Avatar> }, { id: "workspace-b", label: "Workspace B", selected: sidebarWorkspace === "workspace-b", icon: <Avatar size="medium" shape="square" theme="indigo" background="solid" alt="">B</Avatar> }, ...sidebarNewWorkspaces.map((id, index) => ({ id, label: `Workspace ${String.fromCharCode(67 + index)}`, selected: sidebarWorkspace === id, icon: <Avatar size="medium" shape="square" theme="green" background="solid" alt="">{String.fromCharCode(67 + index)}</Avatar> }))]}
              workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon={<Icon name="icon-plus-line" />} onClick={addSidebarWorkspace} />}
              headerAction={(
                <Menu align="end" aria-label="Workspace settings"
                  trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon={<Icon name="icon-settings-01-line" />} />}
                  items={[
                    { id: "new", label: "New workspace", icon: "icon-plus-line" },
                    { id: "rail", label: sidebarWorkspaceBar ? "Hide workspace rail" : "Show workspace rail", icon: "icon-layout-left-line" },
                  ]}
                  onSelect={(item) => { if (item.id === "new") addSidebarWorkspace(); else setSidebarWorkspaceBar((shown) => !shown); }} />
              )}
              search={resolvedSidebarVariant === "small-density" ? <Search size="small" placeholder="Search" shortcut="K" /> : undefined}
              sections={sidebarSections}
              onItemClick={(item) => { if (item.id.startsWith("workspace-")) { setSidebarWorkspace(item.id); return; } if (!item.children) setSidebarSelected(item.id); }}
              footer={sidebarFooter}
              subMenu={sidebarSubMenu ? (
                <SidebarSubMenu
                  search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" />}
                  items={[
                    { id: "sub-components", label: "Components", icon: sidebarIcon("icon-cube-line"), selected: sidebarSelected === "sub-components" },
                    { id: "sub-tokens", label: "Tokens", icon: sidebarIcon("icon-palette-line"), counter: 8, selected: sidebarSelected === "sub-tokens" },
                    { id: "sub-patterns", label: "Patterns", icon: sidebarIcon("icon-layout-grid-01-line"), selected: sidebarSelected === "sub-patterns" },
                    { id: "sub-changelog", label: "Changelog", icon: sidebarIcon("icon-book-open-line"), notificationDot: true, selected: sidebarSelected === "sub-changelog" },
                  ]}
                  onItemClick={(item) => setSidebarSelected(item.id)}
                />
              ) : undefined}
              subMenuLabel="Projects"
              onSubMenuClose={(event) => { if (!(event.target instanceof Element && event.target.closest(".platform-playground-controls"))) setSidebarSubMenu(false); }}
            />
          </div>
          <PlatformCode code={`import { Sidebar } from "@zen/design-system";

<Sidebar
  variant="${resolvedSidebarVariant}"
  background="${resolvedSidebarBackground}" // page: Canvas/${resolvedSidebarCanvas[0].toUpperCase() + resolvedSidebarCanvas.slice(1)}${resolvedSidebarVariant === "workspace" ? `
  workspaceBar={${sidebarWorkspaceBar}}` : `
  collapsed={${sidebarCollapsed}}
  onCollapsedChange={setCollapsed}`}
  sections={sections}
  onItemClick={(item) => setSelected(item.id)}
  footer={footer}${sidebarSubMenu ? `
  subMenu={<SidebarSubMenu search={<Search variant="popover" placeholder="Search projects" />} items={subItems} onItemClick={open} />}
  subMenuLabel="Projects"
  onSubMenuClose={() => setSubMenuOpen(false)}` : ""}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "input") {
    const resolvedInputKind = inputKind ?? "text";
    const resolvedInputSize = (inputSize ?? "medium") as Exclude<InputSize, "sm" | "md" | "lg" | "xl">;
    // Figma State=Disabled exists on Text, Field-Only, Select, Date, Number and Text-Area; Label has its own toggle.
    const inputSupportsDisabled = ["text", "field-only", "textarea", "textarea-primitive", "select", "date", "number-center", "number-left"].includes(resolvedInputKind);
    const inputDisabledOn = inputDisabled && inputSupportsDisabled;
    const resolvedInputState: InputState = inputDisabledOn ? "disabled" : inputReadOnly ? "read-only" : "default";
    // Read-only shows a committed value, never a placeholder.
    const ro = <T,>(sample: T) => (inputReadOnly ? sample : undefined);
    // Only plain text fields own the Leading-Trailing slots; select/date/number keep their built-in affordances.
    const inputSupportsSlots = resolvedInputKind === "text" || resolvedInputKind === "field-only";
    // HeadingField has no label, help text, error or field size: its controls are Heading Size and Multi-line.
    const isHeadingKind = resolvedInputKind === "heading";
    const resolvedHeadingSize = (inputHeadingSize ?? "h2") as HeadingInputSize;
    const resolvedHelpTheme = (inputHelpTheme ?? "neutral") as InputHelpTheme;
    // Character-Limitation counts against maxLength on free-text fields only.
    const inputSupportsCount = ["text", "field-only", "textarea", "richtext"].includes(resolvedInputKind);
    const helpMessages: Record<InputHelpTheme, string> = { neutral: "Supporting help text", warning: "Double-check this value", positive: "Looks good", negative: "This value is not valid" };
    // The label action does something visible: it moves focus into its field (the label's htmlFor).
    const focusField = (event: { currentTarget: HTMLElement }) => { const id = event.currentTarget.closest(".zen-input-label")?.querySelector("label")?.htmlFor; if (id) document.getElementById(id)?.focus(); };
    const labelActionNode = inputLabelAction ? <button type="button" onClick={focusField}>Action</button> : undefined;
    const sharedFieldProps = {
      label: inputLabel ? "Label" : undefined,
      // Without a visible label the field still needs an accessible name.
      "aria-label": inputLabel ? undefined : "Label",
      labelOptional: inputLabelOptional,
      labelTooltip: inputLabelTooltip ? "Shown to teammates in the workspace" : undefined,
      labelAction: labelActionNode,
      helpText: inputHelp ? helpMessages[resolvedHelpTheme] : undefined,
      helpTheme: resolvedHelpTheme,
      helpIcon: inputHelpIcon,
      ...(inputHelpLimit && inputSupportsCount ? { characterLimit: true as const, maxLength: 100 } : {}),
      error: inputError && !inputReadOnly && !inputDisabledOn ? "This field is required" : undefined,
      size: resolvedInputSize,
      state: resolvedInputState,
    };
    // Each slot is clickable (picker → Popover) or decorative (a click focuses the field), chosen per use case.
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
        interactive={inputLeadingClickable} options={accountOptions} value={inputLeadingValue} onValueChange={setInputLeadingValue} popoverLabel="Account type" align="start" disabled={inputReadOnly} /> : undefined,
      trailing: inputSupportsSlots && inputTrailing ? <InputLeadingTrailing size={slotSize} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown
        interactive={inputTrailingClickable} options={regionOptions} value={inputTrailingValue} onValueChange={setInputTrailingValue} popoverLabel="Region" align="end" disabled={inputReadOnly} /> : undefined,
    };
    let inputPreview: ReactNode;
    let inputComponentName = "InputField";
    switch (resolvedInputKind) {
      case "field-only": inputPreview = <InputField {...sharedFieldProps} {...slotProps} label={undefined} aria-label="Search projects" helpText={undefined} error={undefined} placeholder="Field only" />; inputComponentName = "InputField"; break;
      case "input-content": inputPreview = <InputContent size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} state="default" text="Content" />; inputComponentName = "InputContent"; break;
      case "label": inputPreview = <InputLabel optional={inputLabelOptional} tooltip={inputLabelTooltip ? "Shown to teammates in the workspace" : false} action={labelActionNode} disabled={inputLabelDisabled}>Label</InputLabel>; inputComponentName = "InputLabel"; break;
      case "help-text": inputPreview = <InputHelpText theme={resolvedHelpTheme} icon={inputHelpIcon} characterLimit={inputHelpLimit ? "0/100" : undefined}>{helpMessages[resolvedHelpTheme]}</InputHelpText>; inputComponentName = "InputHelpText"; break;
      case "leading-trailing": inputPreview = <InputLeadingTrailing size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} icon={inputLeading ? <Icon name="icon-globe-02-line" decorative /> : undefined} label={inputTrailingLabel ? "VN" : undefined} showLabel={inputTrailingLabel} dropdown={inputTrailing} />; inputComponentName = "InputLeadingTrailing"; break;
      case "textarea": inputPreview = <TextAreaField key={`ta-${inputReadOnly}`} {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Tell us more" defaultValue={ro("Shipped the Date Picker range mode and fixed the Checkbox hover.")} />; inputComponentName = "TextAreaField"; break;
      case "textarea-primitive": inputPreview = <TextAreaField {...sharedFieldProps} label={undefined} helpText={undefined} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} placeholder="Textarea primitive" />; inputComponentName = "TextAreaField"; break;
      case "select": inputPreview = <SelectField key={`sel-${inputReadOnly}`} {...sharedFieldProps} readOnly={inputReadOnly} defaultValue={ro("brand-s1")} options={[{ label: "Neutral - S1", value: "neutral-s1" }, { label: "Brand - S1", value: "brand-s1" }]} />; inputComponentName = "SelectField"; break;
      case "date": inputPreview = <DateField key={`date-${inputReadOnly}`} {...sharedFieldProps} readOnly={inputReadOnly} defaultValue={ro("09/26/2026")} />; inputComponentName = "DateField"; break;
      case "autocomplete": inputPreview = <AutocompleteField label={sharedFieldProps.label} helpText={sharedFieldProps.helpText} error={sharedFieldProps.error} readOnly={inputReadOnly} options={[{ id: "button", label: "Button" }, { id: "chip", label: "Chip" }, { id: "input", label: "Input" }, { id: "popover", label: "Popover" }, { id: "search", label: "Search" }, { id: "tag", label: "Tag" }]} defaultValue={["button", "chip"]} />; inputComponentName = "AutocompleteField"; break;
      case "number-center": inputPreview = <NumberField {...sharedFieldProps} align="center" value={inputNumber} onValueChange={setInputNumber} min={0} max={10} />; inputComponentName = "NumberField"; break;
      case "number-left": inputPreview = <NumberField {...sharedFieldProps} align="left" value={inputNumber} onValueChange={setInputNumber} min={0} max={10} />; inputComponentName = "NumberField"; break;
      case "richtext": inputPreview = <RichTextField key={`rt-${inputReadOnly}`} {...sharedFieldProps} size={resolvedInputSize === "xlarge" ? "large" : resolvedInputSize} readOnly={inputReadOnly} editorBar={inputRichBar} placeholder="Write formatted content" value={inputReadOnly ? "<h2>Release notes</h2><p><b>Date Picker</b> now supports ranges.</p><ul><li>Checkbox hover fixed</li><li>New <a href=\"https://zen.design\">Popover</a> states</li></ul>" : inputRichHtml} onValueChange={(html) => setInputRichHtml(html)} />; inputComponentName = "RichTextField"; break;
      case "editor-bar": inputPreview = <RichTextEditorBar />; inputComponentName = "RichTextEditorBar"; break;
      case "control-bar-item": inputPreview = <><ControlBarSelectItem aria-label="Default" icon={<Icon name="icon-bold-02-line" decorative />} /><ControlBarSelectItem aria-label="Selected" state="selected" icon={<Icon name="icon-bold-02-line" decorative />} /></>; inputComponentName = "ControlBarSelectItem"; break;
      case "heading": inputPreview = <HeadingField key={`h-${inputReadOnly}-${inputHeadingMultiline}`} headingSize={resolvedHeadingSize} multiline={inputHeadingMultiline} aria-label="Section heading" readOnly={inputReadOnly} defaultValue={inputHeadingMultiline ? "Q4 roadmap: ship Zen DS to every product team, with templates, docs and a migration guide" : ro("Q4 roadmap")} placeholder="Section heading" />; inputComponentName = "HeadingField"; break;
      case "conditions": inputPreview = (
        <div className="platform-input-conditions-demo">
          <InputField {...sharedFieldProps} state="default" label={inputLabel ? "Password" : undefined} aria-label={inputLabel ? undefined : "Password"} helpText={inputHelp ? "Use a phrase you don't use elsewhere." : undefined} error={undefined} type="password" placeholder="Create a password" value={conditionsPassword} onChange={(event) => setConditionsPassword(event.target.value)} />
          <InputConditions>{passwordRules.map((rule) => <InputConditionItem key={rule.label} label={rule.label} state={!conditionsPassword ? "default" : rule.test(conditionsPassword) ? "success" : "wrong"} />)}</InputConditions>
        </div>
      ); inputComponentName = "InputConditions"; break;
      default: inputPreview = <InputField key={`text-${inputReadOnly}`} {...sharedFieldProps} {...slotProps} placeholder="Enter your name" defaultValue={ro("Ava Chen")} />;
    }
    const showLeading = inputSupportsSlots && inputLeading;
    const showTrailing = inputSupportsSlots && inputTrailing;
    const fieldLines = [
      `size="${resolvedInputSize}"`,
      resolvedInputKind !== "field-only" && inputLabel ? `label="Label"` : "",
      resolvedInputKind !== "field-only" && inputLabel && inputLabelOptional ? "labelOptional" : "",
      resolvedInputKind !== "field-only" && inputLabel && inputLabelTooltip ? `labelTooltip="Shown to teammates in the workspace"` : "",
      resolvedInputKind !== "field-only" && inputLabel && inputLabelAction ? `labelAction={<button type="button" onClick={onAction}>Action</button>}` : "",
      resolvedInputKind !== "field-only" && inputHelp ? `helpText="${helpMessages[resolvedHelpTheme]}"` : "",
      resolvedInputKind !== "field-only" && inputHelp && resolvedHelpTheme !== "neutral" ? `helpTheme="${resolvedHelpTheme}"` : "",
      resolvedInputKind !== "field-only" && inputHelp && !inputHelpIcon ? "helpIcon={false}" : "",
      inputHelpLimit && inputSupportsCount ? "maxLength={100}\n  characterLimit" : "",
      resolvedInputKind !== "field-only" && inputError && !inputReadOnly && !inputDisabledOn ? `error="This field is required"` : "",
      inputDisabledOn ? "disabled" : "",
      inputReadOnly ? "readOnly" : "",
      showLeading ? (inputLeadingClickable
        ? `leading={<InputLeadingTrailing ${inputLeadingLabel ? `label="User"` : `icon={<Icon name="icon-user-circle-line" decorative />} interactive`} popoverLabel="Account type" align="start"\n    options={accountTypes} value={account} onValueChange={setAccount} />}`
        : `leading={<InputLeadingTrailing icon={<Icon name="icon-user-circle-line" decorative />}${inputLeadingLabel ? ` label="User"` : ""} interactive={false} />}`) : "",
      showTrailing ? (inputTrailingClickable
        ? `trailing={<InputLeadingTrailing ${inputTrailingLabel ? `label="VN"` : "dropdown interactive"} popoverLabel="Region"\n    options={regions} value={region} onValueChange={setRegion} />}`
        : `trailing={<InputLeadingTrailing${inputTrailingLabel ? ` label="VN"` : ""} dropdown interactive={false} />}`) : "",
      resolvedInputKind === "select" ? "options={options}" : "",
      resolvedInputKind === "autocomplete" ? "options={options}\n  value={selected}\n  onChange={setSelected}" : "",
      resolvedInputKind === "date" ? "onDateChange={setDate}" : "",
      resolvedInputKind.startsWith("number") ? `align="${resolvedInputKind === "number-center" ? "center" : "left"}"\n  min={0}\n  max={10}\n  value={quantity}\n  onValueChange={setQuantity}` : "",
      ["text", "field-only", "textarea"].includes(resolvedInputKind) ? "value={value}\n  onChange={(event) => setValue(event.target.value)}" : "",
      resolvedInputKind === "richtext" ? `${inputRichBar ? "" : "editorBar={false}\n  "}value={html}\n  onValueChange={(html, text) => { setHtml(html); setText(text); }}` : "",
    ].filter(Boolean);
    const primitiveCode: Partial<Record<string, string>> = {
      label: `import { InputLabel } from "@zen/design-system";

<InputLabel id="workspace"${inputLabelOptional ? `
  optional` : ""}${inputLabelTooltip ? `
  tooltip="Shown to teammates in the workspace"` : ""}${inputLabelAction ? `
  action={<button type="button" onClick={onAction}>Action</button>}` : ""}${inputLabelDisabled ? `
  disabled` : ""}
>
  Label
</InputLabel>`,
      "help-text": `import { InputHelpText } from "@zen/design-system";

<InputHelpText theme="${resolvedHelpTheme}"${inputHelpIcon ? "" : " icon={false}"}${inputHelpLimit ? ` characterLimit="0/100"` : ""}>
  ${helpMessages[resolvedHelpTheme]}
</InputHelpText>`,
      heading: `import { HeadingField } from "@zen/design-system";

<HeadingField
  headingSize="${resolvedHeadingSize}"${inputHeadingMultiline ? `
  multiline` : ""}${inputReadOnly ? `
  readOnly` : ""}
  aria-label="Section heading"
  placeholder="Section heading"
  value={title}
  onValueChange={setTitle}
/>`,
    };
    const inputCode = primitiveCode[resolvedInputKind] ?? `import { ${[inputComponentName, showLeading || showTrailing ? "InputLeadingTrailing" : ""].filter(Boolean).join(", ")} } from "@zen/design-system";${showLeading ? `
import { Icon } from "@zen/design-system";` : ""}

<${inputComponentName}
  ${fieldLines.join("\n  ")}
/>`;
    const conditionsCode = `import { InputConditionItem, InputConditions, InputField } from "@zen/design-system";

const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains an uppercase letter (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Contains a digit (0-9)", test: (v: string) => /\\d/.test(v) },
  { label: "Contains a special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

<InputField
  size="${resolvedInputSize}"
  label="Password"
  type="password"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
/>
<InputConditions>
  {rules.map((rule) => (
    <InputConditionItem
      key={rule.label}
      label={rule.label}
      state={!password ? "default" : rule.test(password) ? "success" : "wrong"}
    />
  ))}
</InputConditions>`;
    return (
      <ExamplePage page="input" eyebrow="Components / Input" title="Input" description="Production field compositions from the Figma Input page, with leading/trailing slots and native interaction states.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Input</h2>
          <PlaygroundControls aria-label="Input playground controls">
            <PlaygroundFilterChip label="Type" value={inputKind} onChange={(value) => setInputKind(String(value) || undefined)} options={inputPlaygroundKinds.map((id) => ({ id, label: id }))} />
            {isHeadingKind
              ? <PlaygroundFilterChip label="Heading Size" value={inputHeadingSize} onChange={(value) => setInputHeadingSize(String(value) || undefined)} options={headingInputSizes.map((id) => ({ id, label: id.toUpperCase() }))} />
              : <PlaygroundFilterChip label="Size" value={inputSize} onChange={(value) => setInputSize(String(value) || undefined)} options={["small", "medium", "large", "xlarge"].map((id) => ({ id, label: id }))} />}
            {isHeadingKind ? null : <PlaygroundToggle label="Label" selected={inputLabel} onChange={setInputLabel} />}
            {!isHeadingKind && (inputLabel || resolvedInputKind === "label") ? <>
              <PlaygroundToggle label="Label Optional" selected={inputLabelOptional} onChange={setInputLabelOptional} />
              <PlaygroundToggle label="Label Tooltip" selected={inputLabelTooltip} onChange={setInputLabelTooltip} />
              <PlaygroundToggle label="Label Action" selected={inputLabelAction} onChange={setInputLabelAction} />
            </> : null}
            {resolvedInputKind === "label" ? <PlaygroundToggle label="Label Disabled" selected={inputLabelDisabled} onChange={setInputLabelDisabled} /> : null}
            {isHeadingKind ? null : <PlaygroundToggle label="Help Text" selected={inputHelp} onChange={setInputHelp} />}
            {!isHeadingKind && (inputHelp || resolvedInputKind === "help-text") ? <>
              <PlaygroundFilterChip label="Help Theme" value={inputHelpTheme} onChange={(value) => setInputHelpTheme(String(value) || undefined)} options={["neutral", "warning", "positive", "negative"].map((id) => ({ id, label: id }))} />
              <PlaygroundToggle label="Help Icon" selected={inputHelpIcon} onChange={setInputHelpIcon} />
            </> : null}
            {inputSupportsCount || resolvedInputKind === "help-text" ? <PlaygroundToggle label="Character Limit" selected={inputHelpLimit} onChange={setInputHelpLimit} /> : null}
            {inputSupportsSlots ? <>
              <PlaygroundToggle label="Leading" selected={inputLeading} onChange={setInputLeading} />
              {inputLeading ? <PlaygroundToggle label="Leading Label" selected={inputLeadingLabel} onChange={setInputLeadingLabel} /> : null}
              {inputLeading ? <PlaygroundToggle label="Leading Clickable" selected={inputLeadingClickable} onChange={setInputLeadingClickable} /> : null}
              <PlaygroundToggle label="Trailing" selected={inputTrailing} onChange={setInputTrailing} />
              {inputTrailing ? <PlaygroundToggle label="Trailing Label" selected={inputTrailingLabel} onChange={setInputTrailingLabel} /> : null}
              {inputTrailing ? <PlaygroundToggle label="Trailing Clickable" selected={inputTrailingClickable} onChange={setInputTrailingClickable} /> : null}
            </> : null}
            {resolvedInputKind === "richtext" ? <PlaygroundToggle label="Control Bar" selected={inputRichBar} onChange={setInputRichBar} /> : null}
            {resolvedInputKind !== "field-only" && resolvedInputKind !== "conditions" && !isHeadingKind && !inputDisabledOn ? <PlaygroundToggle label="Error" selected={inputError} onChange={setInputError} /> : null}
            {isHeadingKind ? <PlaygroundToggle label="Multi-line" selected={inputHeadingMultiline} onChange={setInputHeadingMultiline} /> : null}
            {inputSupportsDisabled ? <PlaygroundToggle label="Disabled" selected={inputDisabled} onChange={(on) => { setInputDisabled(on); if (on) setInputReadOnly(false); }} /> : null}
            {resolvedInputKind !== "conditions" ? <PlaygroundToggle label="Read-only" selected={inputReadOnly} onChange={(on) => { setInputReadOnly(on); if (on) setInputDisabled(false); }} /> : null}
          </PlaygroundControls>
          <div data-typography={previewTypography} className="platform-input-preview">{inputPreview}</div>
          <PlatformCode code={resolvedInputKind === "conditions" ? conditionsCode : inputCode} />
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
    const hasSearchFilter = resolvedSearchTheme !== "default";
    const searchFilterOptions = [{ value: "all", label: "All" }, { value: "components", label: "Components" }, { value: "tokens", label: "Tokens" }, { value: "guidelines", label: "Guidelines" }];
    return (
      <ExamplePage page="search" eyebrow="Components / Search" title="Search" description="Search/Default and Search/Popover with default, filter-icon and filter-dropdown themes, mapped from the Figma Search page.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Search</h2>
          <PlaygroundControls aria-label="Search playground controls">
            <PlaygroundFilterChip label="Variant" value={searchVariant} onChange={(value) => setSearchVariant(String(value) || undefined)} options={["default", "popover"].map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Theme" value={searchTheme} onChange={(value) => setSearchTheme(String(value) || undefined)} options={["default", "filter-icon", "filter-dropdown"].map((id) => ({ id, label: id }))} />
            {isPopoverSearch ? null : <PlaygroundFilterChip label="Size" value={searchSize} onChange={(value) => setSearchSize(String(value) || undefined)} options={["small", "medium"].map((id) => ({ id, label: id }))} />}
            <PlaygroundToggle label="Icon Search" selected={searchIcon !== "no"} onChange={(selected) => setSearchIcon(selected ? "yes" : "no")} />
            {hasSearchFilter ? <PlaygroundToggle label="Filter Clickable" selected={searchFilterClickable} onChange={setSearchFilterClickable} /> : null}
            <PlaygroundToggle label="Disabled" selected={searchDisabled} onChange={setSearchDisabled} />
          </PlaygroundControls>
          <div data-typography={previewTypography} className="platform-example-row platform-search-row">
            <Search variant={resolvedSearchVariant} theme={resolvedSearchTheme} size={resolvedSearchSize} iconSearch={resolvedSearchIcon} disabled={searchDisabled} placeholder="Search components" value={searchValue} onChange={(event) => setSearchValue(event.target.value)}
              filterLabel="All" filterInteractive={searchFilterClickable} filterOptions={resolvedSearchTheme === "filter-dropdown" ? searchFilterOptions : undefined} filterValue={searchFilter} onFilterChange={setSearchFilter} />
          </div>
          <PlatformCode code={`import { Search } from "@zen/design-system";

<Search${isPopoverSearch ? `
  variant="popover"` : ""}
  theme="${resolvedSearchTheme}"${isPopoverSearch ? "" : `
  size="${resolvedSearchSize}"`}${resolvedSearchIcon ? "" : `
  iconSearch={false}`}${hasSearchFilter && !searchFilterClickable ? `
  filterInteractive={false}` : ""}${resolvedSearchTheme === "filter-dropdown" ? (searchFilterClickable ? `
  filterOptions={scopes}
  filterValue={scope}
  onFilterChange={setScope}` : `
  filterLabel="All"`) : ""}${resolvedSearchTheme === "filter-icon" && searchFilterClickable ? `
  onFilterClick={openFilters}` : ""}${searchDisabled ? `
  disabled` : ""}
  placeholder="Search components"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
/>`} />
        </ComponentPreview>
      </ExamplePage>
    );
  }

  if (page === "segmented") {
    const resolvedLevel = (segmentedLevel ?? "secondary") as SegmentedLevel;
    const resolvedSize = (segmentedSize ?? "medium") as SegmentedSize;
    // An item needs at least an icon or a label: turning both off keeps the icon.
    const showSegIcon = segmentedIcon || !segmentedLabel;
    const segmentedOptions = [
      { id: "overview", label: segmentedLabel ? "Overview" : null, "aria-label": segmentedLabel ? undefined : "Overview", leading: showSegIcon ? <Icon name="icon-grid-01-line" decorative /> : undefined, badge: segmentedBadge ? 2 : undefined },
      { id: "tokens", label: segmentedLabel ? "Tokens" : null, "aria-label": segmentedLabel ? undefined : "Tokens", leading: showSegIcon ? <Icon name="icon-colors-line" decorative /> : undefined, badge: segmentedBadge ? 4 : undefined },
      { id: "components", label: segmentedLabel ? "Components" : null, "aria-label": segmentedLabel ? undefined : "Components", leading: showSegIcon ? <Icon name="icon-cube-line" decorative /> : undefined },
    ];
    return <ExamplePage page="segmented" eyebrow="Components / Segmented" title="Segmented" description="Mutually exclusive options using the Figma Segmented container and item primitives.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Segmented</h2>
        <PlaygroundControls aria-label="Segmented playground controls">
          <PlaygroundFilterChip label="Level" value={segmentedLevel} onChange={(value) => setSegmentedLevel(String(value) || undefined)} options={["secondary", "primary"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={segmentedSize} onChange={(value) => setSegmentedSize(String(value) || undefined)} options={["small", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Icon" selected={segmentedIcon} onChange={setSegmentedIcon} />
          <PlaygroundToggle label="Label" selected={segmentedLabel} onChange={setSegmentedLabel} />
          <PlaygroundToggle label="Badge" selected={segmentedBadge} onChange={setSegmentedBadge} />
          <PlaygroundToggle label="Disabled" selected={segmentedDisabled} onChange={setSegmentedDisabled} />
          <PlaygroundToggle label="Full width" selected={segmentedFull} onChange={setSegmentedFull} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row" style={segmentedFull ? { display: "block" } : undefined}><Segmented aria-label="Section" fullWidth={segmentedFull} level={resolvedLevel} size={resolvedSize} disabled={segmentedDisabled} value={segmentedValue} onChange={setSegmentedValue} options={segmentedOptions} /></div>
        <PlatformCode code={`import { Segmented } from "@zen/design-system";

<Segmented
  aria-label="Section"${segmentedFull ? `
  fullWidth` : ""}
  level="${resolvedLevel}"
  size="${resolvedSize}"${segmentedDisabled ? `
  disabled` : ""}
  value={value}
  onChange={setValue}
  options={[
    { id: "overview", label: ${segmentedLabel ? `"Overview"` : `null, "aria-label": "Overview"`}${showSegIcon ? `, leading: <Icon name="icon-grid-01-line" decorative />` : ""}${segmentedBadge ? ", badge: 2" : ""} },
    { id: "tokens", label: ${segmentedLabel ? `"Tokens"` : `null, "aria-label": "Tokens"`}${showSegIcon ? `, leading: <Icon name="icon-colors-line" decorative />` : ""}${segmentedBadge ? ", badge: 4" : ""} },
    { id: "components", label: ${segmentedLabel ? `"Components"` : `null, "aria-label": "Components"`}${showSegIcon ? `, leading: <Icon name="icon-cube-line" decorative />` : ""} },
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
        <PlaygroundControls aria-label="Toggle playground controls">
          <PlaygroundFilterChip label="Size" value={toggleSize} onChange={(value) => setToggleSize(String(value) || undefined)} options={["small", "medium", "large"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={toggleTheme} onChange={(value) => setToggleTheme(String(value) || undefined)} options={["text-first", "toggle-first"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={toggleSelected} onChange={setToggleSelected} />
          <PlaygroundToggle label="Caption" selected={toggleCaption} onChange={setToggleCaption} />
          <PlaygroundToggle label="Bold" selected={toggleBold} onChange={setToggleBold} />
          <PlaygroundToggle label="Disabled" selected={toggleDisabled} onChange={setToggleDisabled} />
        </PlaygroundControls>
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
        <PlaygroundControls aria-label="Avatar playground controls">
          <PlaygroundFilterChip label="Size" value={avatarSize} onChange={(value) => setAvatarSize(String(value) || undefined)} options={["2xsmall", "xsmall", "small", "medium", "large", "xlarge", "2xlarge", "3xlarge"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={avatarTheme} onChange={(value) => setAvatarTheme(String(value) || undefined)} options={avatarThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Shape" value={avatarShape} onChange={(value) => setAvatarShape(String(value) || undefined)} options={["circle", "square"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={avatarBackground} onChange={(value) => setAvatarBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Status" selected={avatarStatus === "yes"} onChange={(selected) => setAvatarStatus(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Focus" selected={avatarFocus} onChange={setAvatarFocus} />
          <PlaygroundFilterChip label="Stack Count" value={avatarStackCount} onChange={(value) => setAvatarStackCount(String(value) || undefined)} options={["1", "2", "3", "4", "5"].map((id) => ({ id, label: id }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-avatar-preview">
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
        <PlaygroundControls aria-label="Checkbox playground controls">
          <PlaygroundFilterChip label="Side" value={checkboxSide} onChange={(value) => setCheckboxSide(String(value) || undefined)} options={["left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Selected" selected={checkboxChecked} onChange={setCheckboxChecked} />
          <PlaygroundToggle label="Indeterminate" selected={checkboxIndeterminate} onChange={setCheckboxIndeterminate} />
          <PlaygroundToggle label="Caption" selected={checkboxCaption} onChange={setCheckboxCaption} />
          <PlaygroundToggle label="Bold" selected={checkboxBold} onChange={setCheckboxBold} />
          <PlaygroundToggle label="Disabled" selected={checkboxDisabled} onChange={setCheckboxDisabled} />
        </PlaygroundControls>
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
        <PlaygroundControls aria-label="Radio playground controls">
          <PlaygroundFilterChip label="Side" value={radioSide} onChange={(value) => setRadioSide(String(value) || undefined)} options={["left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Caption" selected={radioCaption} onChange={setRadioCaption} />
          <PlaygroundToggle label="Bold" selected={radioBold} onChange={setRadioBold} />
          <PlaygroundToggle label="Disabled" selected={radioDisabled} onChange={setRadioDisabled} />
        </PlaygroundControls>
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
        <PlaygroundControls aria-label="Badge playground controls">
          <PlaygroundFilterChip label="Size" value={badgeSize} onChange={(value) => setBadgeSize(String(value) || undefined)} options={["xsmall", "small", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Theme" value={badgeTheme} onChange={(value) => setBadgeTheme(String(value) || undefined)} options={badgeThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={badgeBackground} onChange={(value) => setBadgeBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Leading Icon" selected={badgeLeading === "yes"} onChange={(selected) => setBadgeLeading(selected ? "yes" : "no")} />
          <PlaygroundToggle label="Remove" selected={badgeRemove === "yes"} onChange={(selected) => { setBadgeRemove(selected ? "yes" : "no"); setBadgeRemoved(false); }} />
          <PlaygroundFilterChip label="Counter" value={badgeCount} onChange={(value) => setBadgeCount(String(value) || undefined)} options={["1", "7", "42", "99+"].map((id) => ({ id, label: id }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row">
          {badgeRemoved
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setBadgeRemoved(false)}>Restore badge</Button>
            : <Badge size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} leadingIcon={showLeading} leading={showLeading ? <Icon name="icon-check-line" decorative /> : undefined} remove={showRemove} onRemove={() => setBadgeRemoved(true)}>Approved</Badge>}
          <BadgeCounter size={resolvedSize} theme={resolvedTheme} background={resolvedBackground} value={badgeCount ?? "7"} />
        </div>
        <PlatformCode code={`import { Badge, BadgeCounter } from "@zen/design-system";${showLeading ? `
import { Icon } from "@zen/design-system";` : ""}

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
        <PlaygroundControls aria-label="Popover playground controls" onPointerDownCapture={holdPopoverOpen}>
          <PlaygroundFilterChip label="Trigger" value={popoverTrigger} onChange={(value) => { setPopoverTrigger(String(value) || undefined); setPopoverSearch(""); setPopoverOpen(true); if (value === "select") setPopoverContent("text-only"); }} options={[{ id: "chip", label: "Chip" }, { id: "select", label: "Select Input" }, { id: "bulk", label: "Bulk-Action (selection)" }]} />
          {popoverTrigger === "bulk" ? <><PlaygroundToggle label="History group" selected={popoverBulkHistory} onChange={setPopoverBulkHistory} /><PlaygroundToggle label="Delete" selected={popoverBulkDelete} onChange={setPopoverBulkDelete} /></> : <>
          {popoverTrigger !== "select" ? <PlaygroundFilterChip label="Content" value={popoverContent} onChange={(value) => { const kind = (String(value) || "icon") as PopoverContentKind; setPopoverContent(kind); setPopoverCreated([]); setPopoverSelected(popoverContentSet(kind, false).items[0].id); setPopoverSearch(""); setPopoverOpen(true); }} options={popoverContentKinds.map((id) => ({ id, label: id }))} /> : null}
          {popoverKind !== "badge" ? <PlaygroundToggle label="Caption" selected={popoverCaption} onChange={(on) => { setPopoverCaption(on); setPopoverOpen(true); }} /> : null}
          {popoverTrigger !== "select" ? <PlaygroundToggle label="Manual-Add-New" selected={popoverCreateOn} onChange={(on) => { setPopoverCreateOn(on); setPopoverSearch(""); setPopoverOpen(true); }} /> : null}
          <PlaygroundToggle label="Label" selected={popoverLabelOn} onChange={(on) => { setPopoverLabelOn(on); setPopoverOpen(true); }} />
          <PlaygroundToggle label="Search" selected={popoverSearchOn} onChange={(on) => { setPopoverSearchOn(on); if (!on) setPopoverSearch(""); setPopoverOpen(true); }} />
          </>}
        </PlaygroundControls>
        <div ref={popoverStageRef} data-typography={previewTypography} className="platform-example-row platform-popover-preview">
          {popoverTrigger === "bulk" ? <PopoverBulkSelectionDemo history={popoverBulkHistory} destructive={popoverBulkDelete} /> : popoverTrigger === "select" ? (
            <SelectField
              className="platform-popover-select"
              label={popoverSet.title}
              size="small"
              value={popoverSelected}
              onChange={(event) => setPopoverSelected(event.target.value)}
              options={popoverItems.map((item) => ({ value: item.id, label: String(item.label) }))}
              popoverLabel={popoverLabelOn ? popoverSet.title : undefined}
              popoverSearch={popoverSearchOn}
              popoverOpen={popoverOpen}
              onPopoverOpenChange={changePopoverOpen}
            />
          ) : (
            <Chip
              variant="advanced"
              size="small"
              leading={popoverChipLeading}
              photoSrc={popoverChipPhoto}
              dropdown
              popoverOpen={popoverOpen}
              onPopoverOpenChange={changePopoverOpen}
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
        <PlatformCode code={popoverTrigger === "bulk" ? `import { PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup } from "@zen/design-system";

<PopoverBulkAction aria-label="Selection actions">${popoverBulkHistory ? `
  <PopoverBulkActionGroup aria-label="History">
    <IconButton appearance="flat" size="md" aria-label="Undo" onClick={undo} icon={<Icon name="icon-flip-backward-line" />} />
    <IconButton appearance="flat" size="md" aria-label="Redo" onClick={redo} icon={<Icon name="icon-flip-forward-line" />} />
  </PopoverBulkActionGroup>
  <PopoverBulkActionDivider />` : ""}
  <PopoverBulkActionGroup aria-label="Format">
    <IconButton appearance="flat" size="md" aria-label="Bold" aria-pressed={bold} onClick={() => setBold(!bold)} icon={<Icon name="icon-bold-01-line" />} />
    <IconButton appearance="flat" size="md" aria-label="Italic" aria-pressed={italic} onClick={() => setItalic(!italic)} icon={<Icon name="icon-italic-01-line" />} />
  </PopoverBulkActionGroup>
  <PopoverBulkActionDivider />
  <PopoverBulkActionGroup aria-label="Comment">
    <IconButton appearance="flat" size="md" aria-label="Comment" onClick={addComment} icon={<Icon name="icon-message-plus-circle-line" />} />
  </PopoverBulkActionGroup>${popoverBulkDelete ? `
  <PopoverBulkActionDivider />
  <PopoverBulkActionGroup aria-label="Delete">
    <IconButton appearance="flat" size="md" aria-label="Delete selection" onClick={deleteSelection} icon={<Icon name="icon-trash-line" />} />
  </PopoverBulkActionGroup>` : ""}
</PopoverBulkAction>` : popoverTrigger === "select" ? `import { SelectField } from "@zen/design-system";

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
import { Icon } from "@zen/design-system";

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
        <PlaygroundControls aria-label="Tag playground controls">
          <PlaygroundFilterChip label="Theme" value={tagTheme} onChange={(value) => setTagTheme(String(value) || undefined)} options={["text-only", "leading-icon", "leading-photo"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Remove" selected={tagRemove} onChange={(on) => { setTagRemove(on); setTagRemoved(false); }} />
          <PlaygroundToggle label="Error" selected={tagError} onChange={setTagError} />
          <PlaygroundToggle label="Disabled" selected={tagDisabled} onChange={setTagDisabled} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row">
          {tagRemoved
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setTagRemoved(false)}>Restore tag</Button>
            : <Tag leading={resolvedTheme === "leading-icon" ? <Icon name="icon-hash-02-line" decorative /> : undefined} photoSrc={resolvedTheme === "leading-photo" ? samplePhoto : undefined} error={tagError} disabled={tagDisabled} remove={tagRemove} onRemove={() => setTagRemoved(true)}>{resolvedTheme === "leading-photo" ? "Ava Chen" : "design-system"}</Tag>}
        </div>
        <PlatformCode code={`import { Tag } from "@zen/design-system";${resolvedTheme === "leading-icon" ? `
import { Icon } from "@zen/design-system";` : ""}

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
    const resolvedCalendar = (dateCalendar ?? "single") as "single" | "dual";
    const resolvedDevice = (dateDevice ?? "desktop") as DatePickerDevice;
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const clock = (value: string | null) => (value ? new Date(`2000-01-01T${value}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "…");
    const timeText = dateTimeOn && dateTime ? (dateTime.fromAllDay && (resolvedCalendar === "single" || dateTime.toAllDay) ? "All day" : `${dateTime.fromAllDay ? "All day" : clock(dateTime.from)} – ${dateTime.toAllDay ? "All day" : clock(dateTime.to)}`) : "";
    const dateText = resolvedMode === "range"
      ? dateRange ? `${fmt(dateRange.start)} → ${dateRange.end ? fmt(dateRange.end) : "…"}` : ""
      : dateValue ? fmt(dateValue) : "";
    const summary = [dateText, timeText].filter(Boolean).join(" · ");
    const actions = dateActions === "none" ? undefined : dateActions as "single" | "dual";
    return <ExamplePage page="date-picker" eyebrow="Components / Date Picker" title="Date Picker" description="Date-Picker/Single-Calendar and Dual-Calendar with single or range selection, disabled dates and optional actions. Click the month and year of a single calendar to pick them directly.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Date Picker</h2>
        <PlaygroundControls aria-label="Date Picker playground controls">
          <PlaygroundFilterChip label="Calendar" value={dateCalendar} onChange={(value) => { setDateCalendar(String(value) || undefined); setDateValue(null); setDateRange(null); }} options={[{ id: "single", label: "Single" }, { id: "dual", label: "Dual" }]} />
          <PlaygroundFilterChip label="Selection" value={dateMode} onChange={(value) => { setDateMode(String(value) || undefined); setDateValue(null); setDateRange(null); }} options={["single", "range"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Actions" value={dateActions} onChange={(value) => setDateActions(String(value) || undefined)} options={["none", "single", "dual"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Device" value={dateDevice} onChange={(value) => setDateDevice(String(value) || undefined)} options={[{ id: "desktop", label: "Desktop" }, { id: "mobile", label: "Mobile" }]} />
          <PlaygroundToggle label="Time picker" selected={dateTimeOn} onChange={(on) => { setDateTimeOn(on); setDateTime(null); }} />
          <PlaygroundToggle label="Disable Past Dates" selected={datePast} onChange={setDatePast} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-date-picker-preview">
          {/* With actions a pick is a draft: the summary shows what Submit applied, and Cancel returns the calendar to it. */}
          <div className="platform-date-picker-inline" data-device={resolvedDevice}><DatePicker key={`${resolvedCalendar}-${resolvedMode}`} device={resolvedDevice} calendar={resolvedCalendar} selectionMode={resolvedMode} value={resolvedMode === "single" ? dateValue : undefined} onValueChange={resolvedMode === "single" && !actions ? setDateValue : undefined} onRangeChange={actions ? undefined : setDateRange} onApply={actions ? (date, range, time) => { if (resolvedMode === "range") setDateRange(range); else setDateValue(date); if (time) setDateTime(time); } : undefined} minDate={datePast ? today : undefined} showActions={Boolean(actions)} action={actions} timePicker={dateTimeOn} onTimeChange={actions ? undefined : setDateTime} /></div>
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Base/Medium"]}`} aria-live="polite">{summary}</p>
        </div>
        <PlatformCode code={`import { DatePicker } from "@zen/design-system";

<DatePicker
${[
  ...(resolvedCalendar === "dual" ? [`calendar="dual"`] : []),
  ...(resolvedDevice === "mobile" ? [`device="mobile" // automatic for an inline calendar at the mobile breakpoint`] : []),
  ...(resolvedMode === "range" ? [`selectionMode="range"`, actions ? "onApply={(_, range) => setRange(range)}" : "onRangeChange={setRange}"] : ["value={date}", actions ? "onApply={(picked) => setDate(picked)}" : "onValueChange={setDate}"]),
  ...(datePast ? ["minDate={today}"] : []),
  ...(dateTimeOn ? ["timePicker", actions ? "// onApply's third argument is the time: { from, to, fromAllDay, toAllDay }" : "onTimeChange={setTime} // { from: \"09:30\", to: \"17:00\", fromAllDay, toAllDay }"] : []),
  ...(actions ? ["showActions", `action="${actions}"`] : []),
].map((line) => `  ${line}`).join("\n")}
/>
${actions ? `
// With actions, picks are a draft: Submit calls onApply, Cancel returns to the applied value.` : ""}
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
        <PlaygroundControls aria-label="Tooltip playground controls">
          <PlaygroundFilterChip label="Color" value={tooltipColor} onChange={(value) => setTooltipColor(String(value) || undefined)} options={tooltipColors.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={tooltipSize} onChange={(value) => setTooltipSize(String(value) || undefined)} options={["medium", "small"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Placement" value={tooltipPlacement} onChange={(value) => setTooltipPlacement(String(value) || undefined)} options={["top", "bottom", "left", "right"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Always Show" selected={tooltipPinned} onChange={setTooltipPinned} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className={`platform-example-row platform-tooltip-preview${color === "white-overlay" || color === "black-overlay" ? " platform-example-row--overlay" : ""}`}>
          {/* Clicking Duplicate confirms it in the tooltip for 1.5s (the copy-feedback pattern). */}
          <Tooltip content={tooltipDuplicated ? "Layer duplicated" : "Duplicate layer"} color={color} size={size} placement={placement} open={tooltipPinned || tooltipDuplicated ? true : undefined}>
            <IconButton appearance={color === "white-overlay" || color === "black-overlay" ? "overlay" : "main"} level={color === "white-overlay" || color === "black-overlay" ? "white-overlay" : "tertiary"} size="md" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />}
              onClick={() => { setTooltipDuplicated(true); window.setTimeout(() => setTooltipDuplicated(false), 1500); }} />
          </Tooltip>
        </div>
        <PlatformCode code={`import { IconButton, Tooltip } from "@zen/design-system";

<Tooltip content={duplicated ? "Layer duplicated" : "Duplicate layer"}${color !== "default" ? ` color="${color}"` : ""}${size !== "medium" ? ` size="${size}"` : ""}${placement !== "top" ? ` placement="${placement}"` : ""} open={duplicated || undefined}>
  <IconButton aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} onClick={duplicateLayer} />
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
        <PlaygroundControls aria-label="Tabs playground controls">
          <PlaygroundFilterChip label="Style" value={tabsVariant} onChange={(value) => setTabsVariant(String(value) || undefined)} options={["indicator", "subtle"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={tabsSize} onChange={(value) => setTabsSize(String(value) || undefined)} options={["medium", "small"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Icon" selected={tabsIcon} onChange={setTabsIcon} />
          <PlaygroundToggle label="Label" selected={tabsLabel} onChange={setTabsLabel} />
          <PlaygroundToggle label="Badge" selected={tabsBadge} onChange={setTabsBadge} />
          <PlaygroundToggle label="Disabled Tab" selected={tabsDisabled} onChange={(on) => { setTabsDisabled(on); if (on && tabsValue === "billing") setTabsValue("overview"); }} />
        </PlaygroundControls>
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
        <PlaygroundControls aria-label="Breadcrumbs playground controls">
          <PlaygroundFilterChip label="Emphasis" value={crumbEmphasis} onChange={(value) => setCrumbEmphasis(String(value) || undefined)} options={["default", "medium"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Depth" value={crumbDepth} onChange={(value) => setCrumbDepth(String(value) || undefined)} options={["2", "3", "4", "5", "6"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Master Icon" selected={crumbMaster} onChange={setCrumbMaster} />
          <PlaygroundToggle label="Collapse (max 3)" selected={crumbCollapse} onChange={setCrumbCollapse} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-breadcrumbs-preview">
          <Breadcrumbs key={`${crumbCollapse}-${crumbDepth}`} items={items} emphasis={emphasis} master={crumbMaster} maxItems={crumbCollapse ? 3 : undefined} onNavigate={(item, event) => { event.preventDefault(); setCrumbLast(String(item.label)); }} />
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{crumbLast ? `Navigated to “${crumbLast}”` : ""}</p>
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
        <PlaygroundControls aria-label="Progress playground controls">
          <PlaygroundFilterChip label="Type" value={progressType} onChange={(value) => setProgressType(String(value) || undefined)} options={["bar", "circle"].map((id) => ({ id, label: id }))} />
          {isBar
            ? <PlaygroundFilterChip label="Theme" value={progressBarTheme} onChange={(value) => setProgressBarTheme(String(value) || undefined)} options={["neutral", "accent", "status"].map((id) => ({ id, label: id }))} />
            : <PlaygroundFilterChip label="Theme" value={progressCircleTheme} onChange={(value) => setProgressCircleTheme(String(value) || undefined)} options={progressCircleThemes.map((id) => ({ id, label: id }))} />}
          <PlaygroundFilterChip label="Progress" value={String(progressValue)} onChange={(value) => setProgressValue(Number(value))} options={[["0", "None · 0%"], ["20", "Low · 20%"], ["40", "Medium · 40%"], ["80", "Good · 80%"], ["100", "Done · 100%"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundToggle label="Label" selected={progressLabel} onChange={setProgressLabel} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-progress-preview">
          {isBar ? <ProgressBar value={progressValue} theme={barTheme} label={progressLabel ? true : undefined} aria-label="Upload progress" /> : <ProgressCircle value={progressValue} theme={circleTheme} label={progressLabel ? true : undefined} aria-label="Task progress" />}
          <div className="pe-row">
            <Button appearance="main" level="tertiary" size="sm" disabled={progressValue === 0} onClick={() => step(-10)}>−10%</Button>
            <Button appearance="main" level="tertiary" size="sm" disabled={progressValue === 100} onClick={() => step(10)}>+10%</Button>
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
    const contentWidth = (accordionContentWidth ?? "title") as AccordionContentWidth;
    const faqs = [
      { id: "seats", title: "Where can I see a breakdown of my seats?", body: "You can manage your full seats, viewer seats and pending invites from Settings → Members. The table shows who holds each seat and when it renews." },
      { id: "billing", title: "When will I be charged?", body: "Seats are billed at the start of each cycle. Seats added mid-cycle are prorated on the next invoice." },
      { id: "export", title: "Can I export the member list?", body: "Yes — use Export in the Members table to download a CSV of names, roles and last activity." },
    ];
    return <ExamplePage page="accordion" eyebrow="Components / Accordion" title="Accordion" description="Accordion/Text in three sizes with a Divider or Box theme. The whole header row toggles the panel; the chevron turns and the height animates.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Accordion</h2>
        <PlaygroundControls aria-label="Accordion playground controls">
          <PlaygroundFilterChip label="Size" value={accordionSize} onChange={(value) => setAccordionSize(String(value) || undefined)} options={[["medium", "Medium"], ["large", "Large"], ["xlarge", "XLarge"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundFilterChip label="Theme" value={accordionTheme} onChange={(value) => setAccordionTheme(String(value) || undefined)} options={[["divider", "Divider"], ["box", "Box"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundFilterChip label="Content width" value={accordionContentWidth} onChange={(value) => setAccordionContentWidth(String(value) || undefined)} options={[["title", "Title"], ["full", "Full"]].map(([id, label]) => ({ id, label }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-accordion-preview">
          <div className="platform-accordion-stack" data-tone={theme}>
            {faqs.map((faq) => <Accordion key={faq.id} size={size} theme={theme} contentWidth={contentWidth} title={faq.title} expanded={accordionOpen === faq.id} onExpandedChange={(open) => setAccordionOpen(open ? faq.id : "")}><PlaygroundSlot name="Content slot" /></Accordion>)}
          </div>
        </div>
        <PlatformCode code={`import { Accordion } from "@zen/design-system";

<Accordion
  size="${size}"
  theme="${theme}"${contentWidth === "full" ? `
  contentWidth="full"` : ""}
  title="Where can I see a breakdown of my seats?"
  expanded={open}
  onExpandedChange={setOpen}
>
  {/* Content slot: your own content */}
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
        <PlaygroundControls aria-label="Alert Banner playground controls">
          <PlaygroundFilterChip label="Theme" value={alertTheme} onChange={(value) => { setAlertTheme(String(value) || undefined); setAlertDismissed(false); }} options={alertBannerThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={alertSize} onChange={(value) => setAlertSize(String(value) || undefined)} options={[["medium", "Medium"], ["small", "Small"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundToggle label="Leading" selected={alertLeading} onChange={setAlertLeading} />
          {size === "medium" ? <PlaygroundToggle label="Action" selected={alertAction} onChange={setAlertAction} /> : null}
          <PlaygroundToggle label="Close" selected={alertClose} onChange={setAlertClose} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-banner-preview">
          {alertDismissed
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setAlertDismissed(false)}>Show banner again</Button>
            : <AlertBanner theme={theme} size={size} leading={alertLeading} action={alertAction ? { label: "Details", onClick: () => logAction("Details", "action.onClick") } : undefined} onClose={alertClose ? () => setAlertDismissed(true) : undefined}>{messages[theme]}</AlertBanner>}
        </div>
        {actionNote}
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
        <PlaygroundControls aria-label="Pagination playground controls">
          <PlaygroundFilterChip label="Theme" value={paginationTheme} onChange={(value) => { setPaginationTheme(String(value) || undefined); setPaginationPage(1); }} options={[["primary", "Primary"], ["secondary", "Secondary"], ["inline", "Inline"], ["manually", "Manually"]].map(([id, label]) => ({ id, label }))} />
          {compact ? null : <PlaygroundFilterChip label="Item Size" value={paginationSize} onChange={(value) => setPaginationSize(String(value) || undefined)} options={[["xsmall", "XSmall · 24"], ["small", "Small · 32"]].map(([id, label]) => ({ id, label }))} />}
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row">
          {/* Pagination always pages real content: the orders on the current page (48 per page for the numbered themes). */}
          <div className="pe-stack" style={{ width: "100%", gap: "var(--zen-spacing-gap-small, 12px)" }}>
            <ScrollBox label={`Orders, page ${paginationPage}`} resetKey={`${theme}-${paginationPage}-${paginationPageSize}`}>
              <Table aria-label="Orders" rows={pageOf(orders, paginationPage, compact ? paginationPageSize : 48)} getRowId={(row) => String(row.id)}
                columns={[
                  { id: "number", header: "Order", cell: (row) => <TableText>{row.number}</TableText> },
                  { id: "customer", header: "Customer", cell: (row) => <TableText>{row.customer}</TableText> },
                  { id: "total", header: "Total", align: "right", cell: (row) => <TableText>{row.total}</TableText> },
                ]} />
            </ScrollBox>
            <Pagination theme={theme} size={size} page={paginationPage} onPageChange={setPaginationPage} pageCount={10} total={480} pageSize={paginationPageSize} onPageSizeChange={(value) => { setPaginationPageSize(value); setPaginationPage(1); }} />
          </div>
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
        <PlaygroundControls aria-label="Skeleton playground controls">
          <PlaygroundFilterChip label="Type" value={skeletonType} onChange={(value) => setSkeletonType(String(value) || undefined)} options={[["text", "Body Text"], ["heading", "Heading Text"], ["shape", "Shape"]].map(([id, label]) => ({ id, label }))} />
          {type === "text" ? <PlaygroundFilterChip label="Lines" value={skeletonLines} onChange={(value) => setSkeletonLines(String(value) || undefined)} options={["1", "2", "3", "5"].map((id) => ({ id, label: id }))} /> : null}
          {type === "heading" ? <PlaygroundFilterChip label="Size" value={skeletonHeading} onChange={(value) => setSkeletonHeading(String(value) || undefined)} options={[["large", "Large"], ["medium", "Medium"], ["small", "Small"]].map(([id, label]) => ({ id, label }))} /> : null}
          {type === "shape" ? <PlaygroundFilterChip label="Shape" value={skeletonShape} onChange={(value) => setSkeletonShape(String(value) || undefined)} options={skeletonShapes.map((id) => ({ id, label: id }))} /> : null}
          {type === "shape" ? <PlaygroundFilterChip label="Size" value={skeletonShapeSize} onChange={(value) => setSkeletonShapeSize(String(value) || undefined)} options={[...skeletonShapeSizes].reverse().map((id) => ({ id, label: id }))} /> : null}
          <PlaygroundToggle label="Animated" selected={skeletonAnimated} onChange={setSkeletonAnimated} />
        </PlaygroundControls>
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

  if (page === "rating") {
    const size = (ratingSize ?? "large") as RatingSize;
    const theme = (ratingTheme ?? "default") as RatingTheme;
    const type = ratingType ?? "star";
    const preview = type === "display"
      ? <RatingDisplay value={4.5} size={size} theme={theme} />
      : type === "opinion" ? <OpinionScale scale={5} aria-label="How was the onboarding?" />
      : type === "nps" ? <NpsScale scale={10} aria-label="How likely are you to recommend Zen?" />
      : <Rating aria-label="Rate this template" value={ratingValue} onChange={setRatingValue} size={size} theme={theme} />;
    const code = type === "display" ? `<RatingDisplay value={4.5} size="${size}" theme="${theme}" />`
      : type === "opinion" ? `<OpinionScale scale={5} aria-label="How was the onboarding?" value={mood} onChange={setMood} />`
      : type === "nps" ? `<NpsScale scale={10} aria-label="How likely are you to recommend Zen?" value={score} onChange={setScore} />`
      : `<Rating aria-label="Rate this template" value={stars} onChange={setStars} size="${size}" theme="${theme}" />`;
    return <ExamplePage page="rating" eyebrow="Components / Rating" title="Rating" description="Star input and display (5 sizes × Default/Neutral/Accent), an emoji Opinion scale and an NPS number scale.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Rating</h2>
        <PlaygroundControls aria-label="Rating playground controls">
          <PlaygroundFilterChip label="Type" value={ratingType} onChange={(value) => setRatingType(String(value) || undefined)} options={[["star", "Star input"], ["display", "Display"], ["opinion", "Opinion scale"], ["nps", "NPS scale"]].map(([id, label]) => ({ id, label }))} />
          {type === "star" || type === "display" ? <>
            <PlaygroundFilterChip label="Size" value={ratingSize} onChange={(value) => setRatingSize(String(value) || undefined)} options={ratingSizes.map((id) => ({ id, label: id }))} />
            <PlaygroundFilterChip label="Theme" value={ratingTheme} onChange={(value) => setRatingTheme(String(value) || undefined)} options={ratingThemes.map((id) => ({ id, label: id }))} />
          </> : null}
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-rating-preview">
          {preview}
          {type === "star" ? <span className={`platform-rating-readout ${typographyStyles["Body/Small/Regular"]}`}>{ratingValue} / 5</span> : null}
        </div>
        <PlatformCode code={`import { ${type === "display" ? "RatingDisplay" : type === "opinion" ? "OpinionScale" : type === "nps" ? "NpsScale" : "Rating"} } from "@zen/design-system";

${code}`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "color-selector") {
    const colors = ["blue", "green", "yellow", "orange", "red", "pink", "purple", "teal"].map((name) => ({ value: `var(--zen-color-background-support-${name}-solid)`, label: name[0].toUpperCase() + name.slice(1), contrast: name === "yellow" ? "dark" as const : undefined }));
    const picked = colors.find((color) => color.value === colorValue);
    return <ExamplePage page="color-selector" eyebrow="Components / Color Selector" title="Color Selector" description="Round colour swatches with a check when selected, a hover ring and a keyboard focus halo; one radio per swatch.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Color Selector</h2>
        <PlaygroundControls aria-label="Color selector playground controls">
          <PlaygroundFilterChip label="Selected" value={colorValue} onChange={(value) => setColorValue(String(value))} options={colors.map((color) => ({ id: color.value, label: color.label }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-color-preview">
          <ColorSelector aria-label="Label colour" colors={colors} value={colorValue} onChange={setColorValue} />
          <span className={`platform-color-readout ${typographyStyles["Body/Small/Regular"]}`}>{picked?.label}</span>
        </div>
        <PlatformCode code={`import { ColorSelector } from "@zen/design-system";

<ColorSelector
  aria-label="Label colour"
  value={colour}
  onChange={setColour}
  colors={[
    { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" },
    { value: "var(--zen-color-background-support-yellow-solid)", label: "Yellow", contrast: "dark" },
    …
  ]}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "metric") {
    const size = (metricSize ?? "xlarge") as MetricSize;
    const trend = (metricTrend ?? "positive") as MetricTrendDirection;
    const trendLabel = trend === "positive" ? "+24% vs. last year" : trend === "negative" ? "−24% vs. last year" : "0% vs. last year";
    const props = { label: "Revenue", value: "$1,680.68", trend: { direction: trend, label: trendLabel }, icon: metricIcon ? "icon-credit-card-line" as const : false as const, iconTheme: (metricIconTheme ?? "neutral") as DockIconTheme, iconBackground: (metricIconSolid ? "solid" : "subtle") as DockIconBackground, size };
    return <ExamplePage page="metric" eyebrow="Components / Metric Widget" title="Metric Widget" description="Metric-Inline (icon, label, number, trend) in five sizes, and Metric-Card — the XLarge metric on a Shadow Card with a ⋮ Sub-Action.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Metric Widget</h2>
        <PlaygroundControls aria-label="Metric playground controls">
          <PlaygroundFilterChip label="Size" value={metricSize} onChange={(value) => setMetricSize(String(value) || undefined)} options={metricSizes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Trend" value={metricTrend} onChange={(value) => setMetricTrend(String(value) || undefined)} options={["positive", "negative", "normal"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Dock Icon" selected={metricIcon} onChange={setMetricIcon} />
          {metricIcon ? <PlaygroundFilterChip label="Icon theme" value={metricIconTheme} onChange={(value) => setMetricIconTheme(String(value) || undefined)} options={dockIconThemes.filter((id) => !["emoji", "on-color", "inverse", "surface"].includes(id)).map((id) => ({ id, label: id }))} /> : null}
          {metricIcon ? <PlaygroundToggle label="Solid icon" selected={metricIconSolid} onChange={setMetricIconSolid} /> : null}
          <PlaygroundToggle label="Card" selected={metricCard} onChange={setMetricCard} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-metric-preview">
          {metricCard ? <MetricCard theme="flat" {...props} subAction={{ label: "Metric actions", icon: "icon-dots-vertical-line", onClick: () => logAction("Metric actions", "subAction.onClick") }} /> : <Metric {...props} />}
        </div>
        {actionNote}
        <PlatformCode code={`import { ${metricCard ? "MetricCard" : "Metric"} } from "@zen/design-system";

<${metricCard ? "MetricCard" : "Metric"}
  label="Revenue"
  value="$1,680.68"
  trend={{ direction: "${trend}", label: "${trendLabel}" }}${metricIcon ? `
  icon="icon-credit-card-line"${metricIconTheme && metricIconTheme !== "neutral" ? `
  iconTheme="${metricIconTheme}"` : ""}${metricIconSolid ? `
  iconBackground="solid"` : ""}` : `
  icon={false}`}${size !== "xlarge" ? `
  size="${size}"` : ""}${metricCard ? `
  subAction={{ label: "Metric actions", icon: "icon-dots-vertical-line", onClick: openMenu }}` : ""}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "top-navigation") {
    return <ExamplePage page="top-navigation" eyebrow="Components / Top Navigation" title="Top Navigation" description="The mobile app bar: a 64px navigator bar (leading action · centred title · trailing actions) over a large Heading and an optional control bar. Ten types pair a background (Surface, Alt, blurring, overlay) with an action style (Tertiary, Flat, Liquid Glass)."><TopNavigationPlayground /></ExamplePage>;
  }
  if (page === "bottom-navigation") {
    return <ExamplePage page="bottom-navigation" eyebrow="Components / Bottom Navigation" title="Bottom Navigation" description="Root-level navigation anchored to the bottom of a mobile screen: a full-width Default bar, or a Floating / Floating Glass pill with an optional floating action. Three to five destinations."><BottomNavigationPlayground /></ExamplePage>;
  }
  if (page === "bottom-sheet") {
    return <ExamplePage page="bottom-sheet" eyebrow="Components / Bottom Sheet" title="Bottom Sheet" description="An anchored surface that slides up from the bottom of the screen for supplementary content, a short task (Modal) or a list of actions (Action). Drag, Escape or the scrim dismiss it; focus stays inside while it is open."><BottomSheetPlayground /></ExamplePage>;
  }
  if (page === "chat") {
    return <ExamplePage page="chat" eyebrow="Components / Chat" title="Chat" description="Person-to-person conversation: text, file, call and photo bubbles for you and others, reactions, read receipts, the composer and conversation-list rows. Social and Business domains."><ChatPlayground /></ExamplePage>;
  }
  if (page === "ai-chat") {
    return <ExamplePage page="ai-chat" eyebrow="Components / AI Chat" title="AI Chat" description="Prompting and conversing with an assistant: the Chat-Field (Default, Surface, Liquid Glass), You / AI bubbles with feedback actions, and the empty-state Block with suggestions."><AiChatPlayground /></ExamplePage>;
  }
  if (page === "chart") {
    return <ExamplePage page="chart" eyebrow="Components / Chart" title="Chart" description="Data visualisation: a Line chart for trends, a Stack-bar chart for part-to-whole comparisons, and the Chart Card that frames either with a title, range switch and report link."><ChartPlayground /></ExamplePage>;
  }
  if (page === "uploader") {
    const type = (uploadType ?? "dropzone") as "dropzone" | "button";
    const thumbnail = (uploadThumb ?? "file") as "none" | "file" | "photo";
    return <ExamplePage page="uploader" eyebrow="Components / Uploader" title="Uploader" description="File-Upload with a Drag & Drop field or a Choose File button, help text, and File-Items that show uploading, uploaded, replaceable and error states.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Uploader</h2>
        <PlaygroundControls aria-label="Uploader playground controls">
          <PlaygroundFilterChip label="Type" value={uploadType} onChange={(value) => setUploadType(String(value) || undefined)} options={[["dropzone", "Drag & Drop"], ["button", "Browse Button"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundFilterChip label="Thumbnail" value={uploadThumb} onChange={(value) => setUploadThumb(String(value) || undefined)} options={["none", "file"].map((id) => ({ id, label: id }))} />
          {type === "dropzone" ? <PlaygroundToggle label="Extended" selected={uploadExtended} onChange={setUploadExtended} /> : null}
          <PlaygroundToggle label="Multiple" selected={uploadMultiple} onChange={(on) => { setUploadMultiple(on); if (!on) setUploadFiles((current) => current.slice(0, 1)); }} />
          <PlaygroundToggle label="Field Error" selected={uploadError} onChange={setUploadError} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-uploader-preview">
          <FileUpload label="Attachments" type={type} caption="JPG, PNG or PDF. Max size of 2 MB" helpText="Up to 5 files." error={uploadError ? "Only JPG, PNG or PDF files are allowed." : undefined} multiple={uploadMultiple} extended={uploadExtended} thumbnail={thumbnail}
            files={uploadFiles}
            onFilesAdd={(added) => { const next = added.map((file, index) => ({ id: `${file.name}-${Date.now()}-${index}`, name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, state: "uploaded" as const })); setUploadFiles((current) => uploadMultiple ? [...current, ...next] : next.slice(0, 1)); }}
            onRemove={(file) => setUploadFiles((current) => current.filter((item) => item.id !== file.id))}
            onRetry={(file) => setUploadFiles((current) => current.map((item) => item.id === file.id ? { ...item, state: "uploading", progress: 10, caption: "Retrying…", error: undefined } : item))} />
        </div>
        <PlatformCode code={`import { FileUpload } from "@zen/design-system";

<FileUpload
  label="Attachments"${type === "button" ? `
  type="button"` : ""}
  caption="JPG, PNG or PDF. Max size of 2 MB"
  helpText="Up to 5 files."${uploadError ? `
  error="Only JPG, PNG or PDF files are allowed."` : ""}${uploadMultiple ? "\n  multiple" : ""}${type === "dropzone" && !uploadExtended ? "\n  extended={false}" : ""}
  thumbnail="${thumbnail}"
  files={files}
  onFilesAdd={upload}
  onRemove={remove}
  onRetry={retry}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "side-panel") {
    const type = (panelType ?? "modal") as SidePanelType;
    const size = (panelSize ?? "default") as SidePanelSize;
    const body = <PlaygroundSlot name="Content slot" className="platform-slot--tall" />;
    const panel = <SidePanel open={panelOpen} onOpenChange={setPanelOpen} type={type} size={size} icon={type === "modal" ? "icon-info-circle-solid" : undefined} title="Edit project" description={panelDescription ? "Changes apply to everyone in the workspace." : undefined} primaryAction={{ label: "Save changes", onClick: () => setPanelOpen(false) }} secondaryAction={{ label: "Cancel" }}>{body}</SidePanel>;
    return <ExamplePage page="side-panel" eyebrow="Components / Side Panel" title="Side Panel" description="A panel on the right edge: Standard docks beside the page (non-modal); Modal floats over a scrim and traps focus. Header, Contents slot and Modal/Actions footer.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Side Panel</h2>
        <PlaygroundControls aria-label="Side panel playground controls">
          <PlaygroundFilterChip label="Type" value={panelType} onChange={(value) => { setPanelType(String(value) || undefined); setPanelOpen(false); }} options={["modal", "standard"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={panelSize} onChange={(value) => setPanelSize(String(value) || undefined)} options={[["default", "Default (440)"], ["small", "Small (360)"]].map(([id, label]) => ({ id, label }))} />
          <PlaygroundToggle label="Caption" selected={panelDescription} onChange={setPanelDescription} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-side-panel-preview" data-type={type}>
          {type === "standard" ? (
            <div className="platform-side-panel-shell">
              <div className="platform-side-panel-shell__page">
                <span className={typographyStyles["Body/Base/Bold"]}>Zen website</span>
                <span className={`platform-side-panel-shell__muted ${typographyStyles["Body/Small/Regular"]}`}>12 pages · updated 5d ago</span>
                <Button appearance="main" level="tertiary" size="sm" onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? "Close details" : "Open details"}</Button>
              </div>
              {panel}
            </div>
          ) : (
            <>
              <Button appearance="main" level="primary" size="md" onClick={() => setPanelOpen(true)}>Edit project</Button>
              {panel}
            </>
          )}
        </div>
        <PlatformCode code={`import { SidePanel } from "@zen/design-system";

<SidePanel
  open={open}
  onOpenChange={setOpen}${type === "standard" ? `
  type="standard"` : ""}${size === "small" ? `
  size="small"` : ""}
  title="Edit project"${panelDescription ? `
  description="Changes apply to everyone in the workspace."` : ""}
  primaryAction={{ label: "Save changes", onClick: save }}
  secondaryAction={{ label: "Cancel" }}
>
  {/* Content slot: your own content */}
</SidePanel>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "card") {
    const theme = (cardTheme ?? "shadow") as CardTheme;
    const spacing = (cardSpacing ?? "medium") as CardSpacing;
    return <ExamplePage page="card" eyebrow="Components / Card" title="Card" description="A Content slot on five surfaces — Shadow, Flat, Pale, Border and Semi-Pale — in two paddings, with an Active (selected) state and a top-right Sub-Action.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Card</h2>
        <PlaygroundControls aria-label="Card playground controls">
          <PlaygroundFilterChip label="Theme" value={cardTheme} onChange={(value) => setCardTheme(String(value) || undefined)} options={cardThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Spacing" value={cardSpacing} onChange={(value) => setCardSpacing(String(value) || undefined)} options={cardSpacings.map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Active" selected={cardActive} onChange={setCardActive} />
          <PlaygroundToggle label="Sub-Action" selected={cardSubAction} onChange={setCardSubAction} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-card-preview" data-tone={theme}>
          <Card theme={theme} spacing={spacing} active={cardActive} subAction={cardSubAction ? { label: "More actions", onClick: () => logAction("More actions", "subAction.onClick") } : undefined}>
            <PlaygroundSlot name="Content slot" />
          </Card>
        </div>
        {actionNote}
        <PlatformCode code={`import { Card } from "@zen/design-system";

<Card${theme !== "shadow" ? ` theme="${theme}"` : ""}${spacing !== "medium" ? ` spacing="${spacing}"` : ""}${cardActive ? " active" : ""}${cardSubAction ? `
  subAction={{ label: "More actions", onClick: openMenu }}` : ""}>
  {/* Content slot: your own content */}
</Card>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "dock-icon") {
    const theme = (dockTheme ?? "accent") as DockIconTheme;
    const size = (dockSize ?? "medium") as DockIconSize;
    const background = (dockBackground ?? "solid") as DockIconBackground;
    return <ExamplePage page="dock-icon" eyebrow="Components / Dock Icon" title="Dock Icon" description="Round icon tiles in five sizes and 22 themes — Solid or Subtle — for apps, categories and file types in lists, tables and cards.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Dock Icon</h2>
        <PlaygroundControls aria-label="Dock icon playground controls">
          <PlaygroundFilterChip label="Theme" value={dockTheme} onChange={(value) => setDockTheme(String(value) || undefined)} options={dockIconThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={dockSize} onChange={(value) => setDockSize(String(value) || undefined)} options={dockIconSizes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Background" value={dockBackground} onChange={(value) => setDockBackground(String(value) || undefined)} options={["solid", "subtle"].map((id) => ({ id, label: id }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-dock-preview" data-tone={theme}>
          {dockIconSizes.map((s) => <DockIcon key={s} icon="icon-colors-line" emoji="🎨" theme={theme} size={s} background={background} label={s === size ? "Design tokens" : undefined} className={s === size ? "platform-dock-preview__current" : undefined} />)}
        </div>
        <PlatformCode code={`import { DockIcon } from "@zen/design-system";

<DockIcon ${theme === "emoji" ? `theme="emoji" emoji="🎨"` : `icon="icon-colors-line"${theme !== "neutral" ? ` theme="${theme}"` : ""}`}${size !== "medium" ? ` size="${size}"` : ""}${background !== "solid" ? ` background="${background}"` : ""} />`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "list-item") {
    const people = [
      { id: "ava", name: "Ava Chen", role: "Product Designer", initials: "AC", theme: "blue" as const },
      { id: "bao", name: "Bao Nguyen", role: "Frontend Engineer", initials: "BN", theme: "green" as const },
      { id: "chi", name: "Chi Tran", role: "Design Ops", initials: "CT", theme: "orange" as const },
    ];
    return <ExamplePage page="list-item" eyebrow="Components / List Item" title="List Item" description="List-Item rows with Leading (avatar or dock icon), Title + Caption, and Trailing actions. Every row pads Small (12px) above and below and nothing at the sides, so the container insets it; interactive rows (onClick or href) show Hover, Pressed and Selected on a fill 12px past the row sideways. List Box holds a list of rows with an optional header and footer.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">List Item</h2>
        <PlaygroundControls aria-label="List item playground controls">
          <PlaygroundToggle label="Leading" selected={listLeading} onChange={setListLeading} />
          <PlaygroundToggle label="Caption" selected={listCaption} onChange={setListCaption} />
          <PlaygroundToggle label="Trailing" selected={listTrailing} onChange={setListTrailing} />
          <PlaygroundToggle label="Interactive" selected={listInteractive} onChange={setListInteractive} />
          <PlaygroundFilterChip label="Box theme" value={listBoxTheme} onChange={(value) => setListBoxTheme((String(value) || "flat") as ListBoxTheme)} options={listBoxThemes.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }))} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-list-preview">
          <ListBox theme={listBoxTheme}>
            <List aria-label="Team">
              {people.map((person) => (
                <ListItem key={person.id} title={person.name} caption={listCaption ? person.role : undefined}
                  {...(listInteractive ? { selected: listSelected === person.id, onClick: () => setListSelected(person.id) } : {})}
                  leading={listLeading ? <Avatar size="medium" theme={person.theme} alt="">{person.initials}</Avatar> : undefined}
                  trailing={listTrailing ? <IconButton appearance="flat" level="primary" size="md" aria-label={`Message ${person.name}`} icon={<Icon name="icon-message-chat-circle-line" />} onClick={() => logAction(`Message ${person.name}`)} /> : undefined} />
              ))}
            </List>
          </ListBox>
        </div>
        {actionNote}
        <PlatformCode code={`import { List, ListBox, ListItem } from "@zen/design-system";

<ListBox${listBoxTheme === "flat" ? "" : ` theme="${listBoxTheme}"`}>
<List aria-label="Team">
  {people.map((person) => (
    <ListItem
      key={person.id}
      title={person.name}${listCaption ? `
      caption={person.role}` : ""}${listInteractive ? `
      selected={selected === person.id}
      onClick={() => setSelected(person.id)}` : ""}${listLeading ? `
      leading={<Avatar size="medium" theme={person.theme} alt="">{person.initials}</Avatar>}` : ""}${listTrailing ? `
      trailing={<IconButton appearance="flat" level="primary" size="md" aria-label={\`Message \${person.name}\`} icon={<Icon name="icon-message-chat-circle-line" />} onClick={() => message(person)} />}` : ""}
    />
  ))}
</List>
</ListBox>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "table") {
    const projects = [
      { id: "zen-web", name: "Zen website", owner: "Ava Chen", icon: "icon-globe-02-line" as const, theme: "blue" as const, status: "Live", progress: 100, trend: "up" as const, delta: "+12%", updated: 5 },
      { id: "tokens", name: "Token pipeline", owner: "Bao Nguyen", icon: "icon-colors-line" as const, theme: "purple" as const, status: "In review", progress: 72, trend: "neutral" as const, delta: "0%", updated: 2 },
      { id: "mobile", name: "Mobile kit", owner: "Chi Tran", icon: "icon-mobile-line" as const, theme: "orange" as const, status: "Blocked", progress: 38, trend: "down" as const, delta: "−8%", updated: 9 },
    ];
    const rows = tableEmpty ? [] : [...projects].sort((a, b) => {
      if (!tableSort) return 0;
      const dir = tableSort.direction === "asc" ? 1 : -1;
      return tableSort.columnId === "name" ? a.name.localeCompare(b.name) * dir : (a.updated - b.updated) * dir;
    });
    type BudgetRow = (typeof tableBudget)[number];
    const statuses = [{ value: "live", label: "Live", theme: "green" as const }, { value: "review", label: "In review", theme: "yellow" as const }, { value: "blocked", label: "Blocked", theme: "red" as const }];
    const updateRow = (row: BudgetRow, patch: Partial<BudgetRow>, log: string) => { setTableBudget((list) => list.map((item) => item.id === row.id ? { ...item, ...patch } : item)); setTableEditLog(log); };
    const money = (value: string) => `$${Number(value || 0).toLocaleString("en-US")}`;
    const locked = (row: BudgetRow) => tableLockRow && row.archived;
    if (tableMode === "editable") {
      return <ExamplePage page="table" eyebrow="Components / Table" title="Table" description="Header and data rows built from Table/Cell/Header and Table/Cell/Default: sortable headers, row selection, right-aligned numbers, cell primitives and in-place editable cells.">
        <ComponentPreview className="platform-example-panel platform-example-panel--stack">
          <h2 className="platform-main-component__title">Table · Editable cells</h2>
          <PlaygroundControls aria-label="Table playground controls">
            <PlaygroundFilterChip label="Mode" value={tableMode} onChange={(value) => setTableMode(String(value) || undefined)} options={[{ id: "display", label: "display" }, { id: "editable", label: "editable" }]} />
            <PlaygroundToggle label="Open Button" selected={tableOpenButton} onChange={setTableOpenButton} />
            <PlaygroundToggle label="Lock Archived Row" selected={tableLockRow} onChange={setTableLockRow} />
          </PlaygroundControls>
          <div data-typography={previewTypography} className="platform-example-row platform-table-preview platform-table-preview--editable">
            <Table aria-label="Project budgets" rows={tableBudget} getRowId={(row) => row.id}
              columns={[
                { id: "name", header: "Project", width: "26%", cell: (row) => <TableText bold caption={row.archived ? "Archived" : undefined}>{row.name}</TableText>,
                  onOpen: tableOpenButton ? (row) => setTableEditLog(`Opened ${row.name}`) : undefined,
                  edit: { value: (row) => row.name, placeholder: "Project name", "aria-label": "Project name", disabled: locked, validate: (value) => value.trim() ? undefined : "Name can't be empty", onCommit: (row: BudgetRow, value: string) => updateRow(row, { name: value.trim() }, `Renamed “${row.name}” → “${value.trim()}”`) } },
                { id: "status", header: "Status", cell: (row) => { const st = statuses.find((x) => x.value === row.status)!; return <Badge size="medium" theme={st.theme} background="subtle">{st.label}</Badge>; },
                  edit: { type: "select", value: (row) => row.status, options: statuses.map(({ value, label }) => ({ value, label })), "aria-label": "Status", disabled: locked, onCommit: (row, value) => updateRow(row, { status: value }, `${row.name} status → ${statuses.find((x) => x.value === value)?.label}`) } },
                { id: "tags", header: "Tags", width: "26%", cell: (row) => <TableTags>{row.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</TableTags>,
                  edit: { type: "tags", value: (row) => row.tags, suggestions: ["web", "brand", "tooling", "ios", "android", "research"], "aria-label": "Tags", disabled: locked, onCommit: (row, value) => updateRow(row, { tags: value }, `${row.name} tags → ${value.join(", ") || "none"}`) } },
                { id: "budget", header: "Budget", align: "right", cell: (row) => <TableText>{money(row.budget)}</TableText>,
                  edit: { type: "number", value: (row) => row.budget, placeholder: "0", "aria-label": "Budget", disabled: locked, validate: (value) => Number(value.replace(/,/g, "")) < 0 ? "Budget can't be negative" : undefined, onCommit: (row, value) => updateRow(row, { budget: value || "0" }, `${row.name} budget → ${money(value)}`) } },
              ]} />
            <p className={`platform-date-picker-summary ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{tableEditLog}</p>
          </div>
          <PlatformCode code={`import { Table, TableText } from "@zen/design-system";

<Table
  aria-label="Project budgets"
  rows={rows}
  getRowId={(row) => row.id}
  columns={[
    { id: "name", header: "Project", cell: (row) => <TableText bold>{row.name}</TableText>,${tableOpenButton ? `
      onOpen: (row) => openProject(row),` : ""}
      edit: { value: (row) => row.name, validate: (v) => v.trim() ? undefined : "Name can't be empty",
        onCommit: (row, value) => update(row.id, { name: value })${tableLockRow ? `, disabled: (row) => row.archived` : ""} } },
    { id: "tags", header: "Tags", cell: …,
      edit: { type: "tags", value: (row) => row.tags, suggestions, onCommit: (row, tags) => update(row.id, { tags }) } },
    { id: "budget", header: "Budget", align: "right", cell: (row) => <TableText>{money(row.budget)}</TableText>,
      edit: { type: "number", value: (row) => row.budget, onCommit: (row, budget) => update(row.id, { budget }) } },
  ]}
/>`} />
        </ComponentPreview>
      </ExamplePage>;
    }
    return <ExamplePage page="table" eyebrow="Components / Table" title="Table" description="Header and data rows built from Table/Cell/Header and Table/Cell/Default: sortable headers, row selection, right-aligned numbers and cell primitives (media, text, trend, actions).">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Table</h2>
        <PlaygroundControls aria-label="Table playground controls">
          <PlaygroundFilterChip label="Mode" value={tableMode} onChange={(value) => setTableMode(String(value) || undefined)} options={[{ id: "display", label: "display" }, { id: "editable", label: "editable" }]} />
          <PlaygroundToggle label="Selectable" selected={tableSelectable} onChange={setTableSelectable} />
          <PlaygroundToggle label="Empty" selected={tableEmpty} onChange={setTableEmpty} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-table-preview">
          <Table aria-label="Projects" rows={rows} getRowId={(row) => row.id} selectable={tableSelectable} selectedIds={tableSelected} onSelectionChange={setTableSelected} sort={tableSort} onSortChange={setTableSort}
            empty={<EmptyState title="No projects yet" illustration={false} primaryAction={{ label: "Create project", onClick: () => logAction("Create project", "primaryAction.onClick") }}>Projects you create show up here.</EmptyState>}
            columns={[
              { id: "name", header: "Project", sortable: true, width: "34%", cell: (row) => <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.owner}>{row.name}</TableMedia> },
              { id: "status", header: "Status", cell: (row) => <Badge size="medium" theme={row.status === "Live" ? "green" : row.status === "Blocked" ? "red" : "yellow"} background="subtle">{row.status}</Badge> },
              { id: "progress", header: "Progress", width: "20%", cell: (row) => <ProgressBar value={row.progress} label aria-label={`${row.name} progress`} /> },
              { id: "trend", header: "Traffic", cell: (row) => <TableTrend trend={row.trend}>{row.delta}</TableTrend> },
              { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="md" aria-label={`Open ${row.name}`} icon={<Icon name="icon-dots-horizontal-line" />} onClick={() => logAction(`Open ${row.name}`)} /></TableActions> },
            ]} />
        </div>
        {actionNote}
        <PlatformCode code={`import { Table, TableMedia, TableText, TableTrend, TableActions } from "@zen/design-system";

<Table
  aria-label="Projects"
  rows={projects}
  getRowId={(row) => row.id}${tableSelectable ? `
  selectable
  selectedIds={selected}
  onSelectionChange={setSelected}` : ""}
  sort={sort}
  onSortChange={setSort}
  empty={<EmptyState title="No projects yet" illustration={false} />}
  columns={[
    { id: "name", header: "Project", sortable: true, cell: (row) => (
      <TableMedia bold media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.owner}>{row.name}</TableMedia>
    ) },
    { id: "status", header: "Status", cell: (row) => <Badge size="medium" theme="green" background="subtle">{row.status}</Badge> },
    { id: "progress", header: "Progress", cell: (row) => <ProgressBar value={row.progress} label aria-label={\`\${row.name} progress\`} /> },
    { id: "trend", header: "Traffic", cell: (row) => <TableTrend trend={row.trend}>{row.delta}</TableTrend> },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" aria-label="Open" … /></TableActions> },
  ]}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "divider") {
    const color = (dividerColor ?? "default") as DividerColor;
    const orientation = dividerOrientation === "vertical" ? "vertical" : "horizontal";
    return <ExamplePage page="divider" eyebrow="Components / Divider" title="Divider" description="A 1px line that separates content. Default (Pale) is the everyday rule; Medium and High add emphasis, and dashed lines step up to Subtle.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Divider</h2>
        <PlaygroundControls aria-label="Divider playground controls">
          <PlaygroundFilterChip label="Color" value={dividerColor} onChange={(value) => setDividerColor(String(value) || undefined)} options={dividerColors.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Orientation" value={dividerOrientation} onChange={(value) => setDividerOrientation(String(value) || undefined)} options={["horizontal", "vertical"].map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Dashed" selected={dividerDashed} onChange={setDividerDashed} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-divider-preview" data-orientation={orientation}>
          <span className={typographyStyles["Body/Base/Regular"]}>Profile</span>
          <Divider color={color} orientation={orientation} dashed={dividerDashed} />
          <span className={typographyStyles["Body/Base/Regular"]}>Security</span>
        </div>
        <PlatformCode code={`import { Divider } from "@zen/design-system";

<Divider${color !== "default" ? ` color="${color}"` : ""}${orientation === "vertical" ? ` orientation="vertical"` : ""}${dividerDashed ? " dashed" : ""} />`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "inline-message") {
    const theme = (inlineTheme ?? "info") as InlineMessageTheme;
    const copy: Record<InlineMessageTheme, [string, string]> = {
      neutral: ["Heads up", "Changes to this template apply to new projects only."],
      info: ["Invites expire after 7 days", "Resend the invite from Members if a teammate missed it."],
      positive: ["Domain verified", "Emails from hello@zen.studio now pass SPF and DKIM."],
      warning: ["Storage almost full", "You've used 92% of your plan. Archive old files or upgrade."],
      negative: ["Payment failed", "Update your card to keep publishing. We'll retry in 3 days."],
      custom: ["New: Figma sync", "Connect a Figma file to pull tokens straight into this workspace."],
    };
    return <ExamplePage page="inline-message" eyebrow="Components / Inline Message" title="Inline Message" description="A Subtle-surface message inside the content it describes: six themes with title, caption, one action and a close control.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Inline Message</h2>
        <PlaygroundControls aria-label="Inline message playground controls">
          <PlaygroundFilterChip label="Theme" value={inlineTheme} onChange={(value) => { setInlineTheme(String(value) || undefined); setInlineDismissed(false); }} options={inlineMessageThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Title" selected={inlineTitle} onChange={setInlineTitle} />
          <PlaygroundToggle label="Caption" selected={inlineCaption} onChange={setInlineCaption} />
          <PlaygroundToggle label="Action" selected={inlineAction} onChange={setInlineAction} />
          <PlaygroundToggle label="Close" selected={inlineClose} onChange={setInlineClose} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-inline-message-preview">
          {inlineDismissed
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setInlineDismissed(false)}>Show message again</Button>
            : <InlineMessage theme={theme} title={inlineTitle ? copy[theme][0] : undefined} action={inlineAction ? { label: "Learn more", onClick: () => logAction("Learn more", "action.onClick") } : undefined} onClose={inlineClose ? () => setInlineDismissed(true) : undefined}>{inlineCaption || !inlineTitle ? copy[theme][1] : undefined}</InlineMessage>}
        </div>
        {actionNote}
        <PlatformCode code={`import { InlineMessage } from "@zen/design-system";

<InlineMessage
  theme="${theme}"${inlineTitle ? `
  title="${copy[theme][0]}"` : ""}${inlineAction ? `
  action={{ label: "Learn more", onClick: openDocs }}` : ""}${inlineClose ? `
  onClose={dismiss}` : ""}
>${inlineCaption || !inlineTitle ? `
  ${copy[theme][1]}
` : ""}</InlineMessage>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "empty-state") {
    return <ExamplePage page="empty-state" eyebrow="Components / Empty State" title="Empty State" description="Illustration, title, caption and up to two full-width actions for screens with nothing to show yet.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Empty State</h2>
        <PlaygroundControls aria-label="Empty state playground controls">
          <PlaygroundToggle label="Illustration" selected={emptyIllustration} onChange={setEmptyIllustration} />
          <PlaygroundToggle label="Caption" selected={emptyCaption} onChange={setEmptyCaption} />
          <PlaygroundToggle label="Primary CTA" selected={emptyPrimary} onChange={setEmptyPrimary} />
          <PlaygroundToggle label="Secondary CTA" selected={emptySecondary} onChange={setEmptySecondary} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-empty-state-preview">
          <EmptyState title="No projects yet" illustration={emptyIllustration} icon="icon-folder-line" primaryAction={emptyPrimary ? { label: "Create project", onClick: () => logAction("Create project", "primaryAction.onClick") } : undefined} secondaryAction={emptySecondary ? { label: "Import from Figma", onClick: () => logAction("Import from Figma", "secondaryAction.onClick") } : undefined}>{emptyCaption ? "Projects you create or join will show up here." : undefined}</EmptyState>
        </div>
        {actionNote}
        <PlatformCode code={`import { EmptyState } from "@zen/design-system";

<EmptyState
  title="No projects yet"${emptyIllustration ? `
  icon="icon-folder-line"` : `
  illustration={false}`}${emptyPrimary ? `
  primaryAction={{ label: "Create project", onClick: create }}` : ""}${emptySecondary ? `
  secondaryAction={{ label: "Import from Figma", onClick: importFile }}` : ""}
>${emptyCaption ? `
  Projects you create or join will show up here.
` : ""}</EmptyState>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "stepper") {
    const orientation = (stepperOrientation ?? "horizontal") as StepperOrientation;
    const steps = [
      { id: "account", title: "Account", caption: stepperCaption ? "Email & password" : undefined },
      { id: "workspace", title: "Workspace", caption: stepperCaption ? "Name & URL" : undefined, error: stepperError },
      { id: "team", title: "Invite team", caption: stepperCaption ? "Optional" : undefined },
      { id: "done", title: "Done", caption: stepperCaption ? "Start building" : undefined },
    ];
    return <ExamplePage page="stepper" eyebrow="Components / Stepper" title="Stepper" description="Stepper-Bar in horizontal and vertical layouts: Passed, Focused, Default and Error steps with a title and caption.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Stepper</h2>
        <PlaygroundControls aria-label="Stepper playground controls">
          <PlaygroundFilterChip label="Orientation" value={stepperOrientation} onChange={(value) => setStepperOrientation(String(value) || undefined)} options={["horizontal", "vertical"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Current Step" value={String(stepperCurrent)} onChange={(value) => setStepperCurrent(Number(value) || 0)} options={steps.map((step, index) => ({ id: String(index), label: `${index + 1} · ${step.title}` }))} />
          <PlaygroundToggle label="Caption" selected={stepperCaption} onChange={setStepperCaption} />
          <PlaygroundToggle label="Error on Workspace" selected={stepperError} onChange={setStepperError} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-stepper-preview" data-orientation={orientation}>
          <Stepper aria-label="Sign-up progress" orientation={orientation} steps={steps} current={stepperCurrent} onStepClick={(_, index) => setStepperCurrent(index)} />
        </div>
        <PlatformCode code={`import { Stepper } from "@zen/design-system";

<Stepper
  aria-label="Sign-up progress"${orientation === "vertical" ? `
  orientation="vertical"` : ""}
  current={${stepperCurrent}}
  onStepClick={(step, index) => setCurrent(index)}
  steps={[
${steps.map((step) => `    { id: "${step.id}", title: "${step.title}"${step.caption ? `, caption: "${step.caption}"` : ""}${step.error ? ", error: true" : ""} },`).join("\n")}
  ]}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "slider") {
    const theme = (sliderTheme ?? "neutral") as SliderTheme;
    const size = (sliderSize ?? "medium") as SliderSize;
    return <ExamplePage page="slider" eyebrow="Components / Slider" title="Slider" description="Slider/Horizontal in Neutral, Accent and White themes and three sizes, with a leading icon and min/max labels. A native range input keeps keyboard and screen-reader support.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Slider</h2>
        <PlaygroundControls aria-label="Slider playground controls">
          <PlaygroundFilterChip label="Theme" value={sliderTheme} onChange={(value) => setSliderTheme(String(value) || undefined)} options={sliderThemes.map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Size" value={sliderSize} onChange={(value) => setSliderSize(String(value) || undefined)} options={sliderSizes.map((id) => ({ id, label: id }))} />
          {size !== "small" ? <PlaygroundToggle label="Icon" selected={sliderIcon} onChange={setSliderIcon} /> : null}
          <PlaygroundToggle label="Value Labels" selected={sliderLimits} onChange={setSliderLimits} />
          <PlaygroundToggle label="Disabled" selected={sliderDisabled} onChange={setSliderDisabled} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-slider-preview" data-tone={theme}>
          <Slider aria-label="Volume" theme={theme} size={size} value={sliderValue} onChange={setSliderValue} icon={sliderIcon ? "icon-volume-max-solid" : false} showLimits={sliderLimits} disabled={sliderDisabled} valueText={(value) => `${value}%`} />
          <span className={`platform-slider-readout ${typographyStyles["Body/Small/Regular"]}`}>{sliderValue}%</span>
        </div>
        <PlatformCode code={`import { Slider } from "@zen/design-system";

<Slider
  aria-label="Volume"${theme !== "neutral" ? `
  theme="${theme}"` : ""}${size !== "medium" ? `
  size="${size}"` : ""}
  value={volume}
  onChange={setVolume}${size !== "small" && sliderIcon ? `
  icon="icon-volume-max-solid"` : size !== "small" ? `
  icon={false}` : ""}${sliderLimits ? `
  showLimits` : ""}${sliderDisabled ? `
  disabled` : ""}
  valueText={(value) => \`\${value}%\`}
/>`} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "toast") {
    const type = (toastType ?? "neutral") as ToastType;
    const copy: Record<ToastType, [string, string]> = { neutral: ["Changes saved", "Your draft was saved a moment ago."], subtle: ["Link copied", "Anyone with the link can view this file."], info: ["Update available", "Reload to get the latest version."], positive: ["Project published", "It is now live for your team."], warning: ["Storage almost full", "You have used 92% of your space."], negative: ["Upload failed", "The file is larger than 25 MB."] };
    return <ExamplePage page="toast" eyebrow="Components / Toast Message" title="Toast Message" description="Toast-Message in six types with title, caption, one action and a close control, on the Popover effect surface.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">Toast Message</h2>
        <PlaygroundControls aria-label="Toast playground controls">
          <PlaygroundFilterChip label="Type" value={toastType} onChange={(value) => { setToastType(String(value) || undefined); setToastDismissed(false); }} options={toastTypes.map((id) => ({ id, label: id }))} />
          <PlaygroundToggle label="Caption" selected={toastCaption} onChange={setToastCaption} />
          <PlaygroundToggle label="Action" selected={toastAction} onChange={setToastAction} />
          <PlaygroundToggle label="Close" selected={toastClose} onChange={setToastClose} />
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-banner-preview">
          {toastDismissed
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setToastDismissed(false)}>Show toast again</Button>
            : <Toast type={type} title={copy[type][0]} action={toastAction ? { label: "Undo", onClick: () => setToastDismissed(true) } : undefined} onClose={toastClose ? () => setToastDismissed(true) : undefined}>{toastCaption ? copy[type][1] : undefined}</Toast>}
        </div>
        <PlatformCode code={`import { Toast } from "@zen/design-system";

<Toast
  type="${type}"
  title="${copy[type][0]}"${toastAction ? `
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
    const direction = (dialogDirection ?? "horizontal") as ModalActionDirection;
    const isForm = dialogKind === "form";
    const layout = (formLayout ?? "basic") as ModalFormLayout;
    const layoutHasSide = layout === "1-3" || layout === "half-half" || layout === "3-4";
    const titles: Record<DialogTheme, string> = { default: "Publish changes?", info: "New version available", positive: "Project published", warning: "Unsaved changes", negative: "Delete project?" };
    const close = (result: string) => { setDialogResult(result); setDialogOpen(false); };
    const actionProps = {
      primaryAction: { label: isForm ? "Create project" : theme === "negative" ? "Delete" : "Continue", level: !isForm && theme === "negative" ? "danger" as const : "primary" as const, onClick: isForm ? undefined : () => close("Primary action") },
      secondaryAction: count >= 2 ? { label: "Cancel", onClick: () => close("Cancelled") } : undefined,
      tertiaryAction: count === 3 ? { label: isForm ? "Save draft" : "Learn more", onClick: () => close(isForm ? "Saved as draft" : "Learn more") } : undefined,
      actionsDirection: direction,
    };
    const formSideContent = <PlaygroundSlot name="Side-Content slot" className="platform-slot--fill" />;
    const actionsCode = `  primaryAction={{ label: "${actionProps.primaryAction.label}"${!isForm && theme === "negative" ? `, level: "danger"` : ""}${isForm ? "" : ", onClick: confirm"} }}${count >= 2 ? `
  secondaryAction={{ label: "Cancel" }}` : ""}${count === 3 ? `
  tertiaryAction={{ label: "${isForm ? "Save draft" : "Learn more"}", onClick: ${isForm ? "saveDraft" : "openDocs"} }}` : ""}${direction === "vertical" ? `
  actionsDirection="vertical"` : ""}`;
    const code = isForm ? `import { Button, ModalForm } from "@zen/design-system";

<Button onClick={() => setOpen(true)}>New project</Button>
<ModalForm
  open={open}
  onOpenChange={setOpen}${layout !== "basic" ? `
  layout="${layout}"` : ""}
  title="Create a project"${dialogDescription ? `
  description="Projects group files, tokens and tasks for one team."` : ""}${layoutHasSide && formSide ? `
  side={<SideContent />} // Side-Content slot` : ""}${formClose ? "" : `
  closeButton={false}`}
  onSubmit={createProject}
${actionsCode}
>
  {/* Main-Contents slot: your form fields */}
</ModalForm>` : `import { Button, Dialog } from "@zen/design-system";

<Button onClick={() => setOpen(true)}>Open dialog</Button>
<Dialog
  open={open}
  onOpenChange={setOpen}${theme !== "default" ? `
  theme="${theme}"` : ""}${dialogIcon ? "" : `
  icon={false}`}
  title="${titles[theme]}"${dialogDescription ? `
  description="Review the summary below before you continue."` : ""}
${actionsCode}
>${dialogCustom ? `
  {/* Custom slot: your own content */}
` : ""}</Dialog>`;
    return <ExamplePage page="dialog" eyebrow="Components / Modal & Dialog" title="Dialog" description="Modal/Dialog and Modal/Forms with themed icon, heading, caption and up to three actions in a horizontal or vertical direction. Focus is trapped while open and returns to the trigger; Escape or the overlay closes it.">
      <ComponentPreview className="platform-example-panel platform-example-panel--stack">
        <h2 className="platform-main-component__title">{isForm ? "Modal/Forms" : "Modal/Dialog"}</h2>
        <PlaygroundControls aria-label="Dialog playground controls">
          <PlaygroundFilterChip label="Type" value={dialogKind} onChange={(value) => setDialogKind(String(value) || undefined)} options={[{ id: "dialog", label: "dialog" }, { id: "form", label: "form" }]} />
          {isForm
            ? <PlaygroundFilterChip label="Layout" value={formLayout} onChange={(value) => setFormLayout(String(value) || undefined)} options={modalFormLayouts.map((id) => ({ id, label: id }))} />
            : <PlaygroundFilterChip label="Theme" value={dialogTheme} onChange={(value) => setDialogTheme(String(value) || undefined)} options={dialogThemes.map((id) => ({ id, label: id }))} />}
          <PlaygroundFilterChip label="Actions" value={dialogActions} onChange={(value) => setDialogActions(String(value) || undefined)} options={["single", "dual", "triple"].map((id) => ({ id, label: id }))} />
          <PlaygroundFilterChip label="Direction" value={dialogDirection} onChange={(value) => setDialogDirection(String(value) || undefined)} options={modalActionDirections.map((id) => ({ id, label: id }))} />
          {isForm ? null : <PlaygroundToggle label="Icon" selected={dialogIcon} onChange={setDialogIcon} />}
          <PlaygroundToggle label="Caption" selected={dialogDescription} onChange={setDialogDescription} />
          {isForm ? <>
            {layoutHasSide ? <PlaygroundToggle label="Side Content" selected={formSide} onChange={setFormSide} /> : null}
            <PlaygroundToggle label="Close" selected={formClose} onChange={setFormClose} />
          </> : <PlaygroundToggle label="Custom Slot" selected={dialogCustom} onChange={setDialogCustom} />}
        </PlaygroundControls>
        <div data-typography={previewTypography} className="platform-example-row platform-dialog-preview">
          <Button appearance="main" level={!isForm && theme === "negative" ? "danger" : "primary"} size="md" onClick={() => { setDialogResult(""); setDialogOpen(true); }}>{isForm ? "New project" : "Open dialog"}</Button>
          <p className={`platform-date-picker-summary ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{dialogResult}</p>
          {isForm ? (
            <ModalForm
              open={dialogOpen}
              onOpenChange={(next) => { setDialogOpen(next); if (!next) setDialogResult((current) => current || "Dismissed"); }}
              layout={layout}
              title="Create a project"
              description={dialogDescription ? "Projects group files, tokens and tasks for one team." : undefined}
              side={layoutHasSide && formSide ? formSideContent : undefined}
              closeButton={formClose}
              onSubmit={(event) => { const name = new FormData(event.currentTarget).get("project") || "Untitled"; close(`Created “${name}”`); }}
              {...actionProps}
            >
              <PlaygroundSlot name="Main-Contents slot" className="platform-slot--tall" />
            </ModalForm>
          ) : (
            <Dialog
              open={dialogOpen}
              onOpenChange={(next) => { setDialogOpen(next); if (!next) setDialogResult((current) => current || "Dismissed"); }}
              theme={theme}
              icon={dialogIcon}
              title={titles[theme]}
              description={dialogDescription ? "Everything in Zen contains Auto Layout. Review the summary below before you continue." : undefined}
              {...actionProps}
            >
              {dialogCustom ? <PlaygroundSlot name="Custom slot" /> : null}
            </Dialog>
          )}
        </div>
        <PlatformCode code={code} />
      </ComponentPreview>
    </ExamplePage>;
  }

  if (page === "installation") {
    const steps: Array<{ title: string; text: string; command?: string; code?: string }> = [
      { title: "1. Build the package", text: "In the Zen DS repo. It writes dist-pack/zen-design-system-<version>.tgz (ES modules, TypeScript types, styles.css).", command: "npm run pack:local" },
      { title: "2. Add it to your app", text: "Peer dependencies: react and react-dom 19.", command: "npm install /path/to/Zen-DS/dist-pack/zen-design-system-0.3.0.tgz" },
      { title: "3. Import the styles and wrap the app", text: "One stylesheet (Inter, tokens, text styles, every component). ZenProvider sets the token modes, paints the page Canvas and hosts the overlay portal.", code: `import "@zen/design-system/styles.css";
import "@zen/design-system/reset.css"; // optional page reset
import { Button, ZenProvider } from "@zen/design-system";

createRoot(document.getElementById("root")!).render(
  <ZenProvider theme="system" typography="dashboard">
    <Button level="primary">Save changes</Button>
  </ZenProvider>,
);` },
      { title: "4. Point your AI agent at the docs", text: "The package ships AGENTS.consumer.md (setup + the rules that go wrong most often), llms.txt, docs/getting-started.md, docs/guidelines (Do/Don't + props per component) and docs/api (props as JSON). Add one line to your app's CLAUDE.md or AGENTS.md:", command: "Read node_modules/@zen/design-system/AGENTS.consumer.md before writing UI, and follow it." },
    ];
    return (
      <ExamplePage eyebrow="Installation" title="Install Zen DS" description="Build the package, add it to your app, import the stylesheet once and wrap the app in ZenProvider.">
        <div className="platform-install">
          {steps.map((step) => (
            <section key={step.title} className="platform-example-panel platform-install__step">
              <h2 className={typographyStyles["Heading/4"]}>{step.title}</h2>
              <p className={typographyStyles["Body/Base/Regular"]}>{step.text}</p>
              {step.command ? <pre className="platform-install__command"><code>{step.command}</code></pre> : null}
              {step.code ? <PlatformCode code={step.code} /> : null}
            </section>
          ))}
        </div>
      </ExamplePage>
    );
  }

  // Phase-2 app layer pages (src/platform/appLayer/*): meta + playground come from their group module.
  const appLayerPage = appLayerPages[page as AppLayerPage];
  if (appLayerPage) {
    const Playground = appLayerPage.playground;
    return <ExamplePage page={page} eyebrow={appLayerPage.eyebrow} title={appLayerPage.title} description={appLayerPage.description}><Playground /></ExamplePage>;
  }

  return <ExamplePage eyebrow="Components" title="Component" description="Select a component from the sidebar."><div /></ExamplePage>;
}
