// zen-usage-guard: dont-examples
// This file deliberately renders *wrong* usage in its "dont" previews, so the usage harness skips it
// (tools/usage-guard/check-usage.mjs honours the marker above). Keep "do" previews exemplary.
import type { ReactNode } from "react";
import { typographyStyles } from "../tokens/typography.generated";
import { Avatar, AvatarStack } from "../components/Avatar";
import { Badge, BadgeCounter } from "../components/Badge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button, IconButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { InputField } from "../components/Input";
import { Popover, PopoverItem, PopoverManualAddNew } from "../components/Popover";
import { Link } from "../components/Link";
import { Text } from "../components/Text";
import { MenuItem, MenuSeparator } from "../components/Menu";
import { ProgressBar } from "../components/Progress";
import { RadioButton } from "../components/RadioButton";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { Tabs } from "../components/Tabs";
import { Tag } from "../components/Tag";
import { Toggle, ToggleButton } from "../components/Toggle";
import { Tooltip } from "../components/Tooltip";
import { Toast } from "../components/Toast";
import { AlertBanner } from "../components/AlertBanner";
import { Accordion } from "../components/Accordion";
import { Pagination } from "../components/Pagination";
import { SkeletonHeading, SkeletonShape, SkeletonText } from "../components/Skeleton";
import { Divider } from "../components/Divider";
import { InlineMessage } from "../components/InlineMessage";
import { EmptyState } from "../components/EmptyState";
import { Stepper } from "../components/Stepper";
import { Slider } from "../components/Slider";
import { Card } from "../components/Card";
import { DockIcon } from "../components/DockIcon";
import { List, ListItem } from "../components/ListItem";
import { Table, TableText } from "../components/Table";
import { Rating, RatingDisplay } from "../components/Rating";
import { ColorSelector } from "../components/ColorSelector";
import { Metric } from "../components/MetricWidget";
import { FileUpload } from "../components/Uploader";
import { TopNavigation } from "../components/TopNavigation";
import { BottomNavigation } from "../components/BottomNavigation";
import { ChatMessage, ChatThread } from "../components/Chat";
import { AiChatBubble } from "../components/AiChat";
import { LineChart, StackBarChart } from "../components/Chart";
import { FormFieldset } from "../components/Form";
import { ActionBar } from "../components/ActionBar";
import { DescriptionList } from "../components/DescriptionList";
import { Image, Thumbnail } from "../components/Image";
import { VisuallyHidden } from "../components/VisuallyHidden";
import { platformMedia } from "./PlatformMedia";

export type GuidelineExample = { preview: ReactNode; caption: string };
export type GuidelinePair = { do: GuidelineExample; dont: GuidelineExample };

const noop = () => undefined;
const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><rect x="6" y="21" width="20" height="14" rx="7" fill="${fg}"/></svg>`);
const faces = [photo("#d9c7b8", "#8f735f"), photo("#c8d6c2", "#5f7a58"), photo("#d4cbe3", "#6d5b92"), photo("#e6c8c4", "#9a5a52"), photo("#c4dfdc", "#4f8a84"), photo("#f1e4d6", "#b07d4f"), photo("#dde5ec", "#4a6078")];
const Row = ({ children }: { children: ReactNode }) => <div className="pgv-row">{children}</div>;
const Stack = ({ children }: { children: ReactNode }) => <div className="pgv-stack">{children}</div>;
/** A static Menu surface for the Do/Don't previews (the real Menu floats from its trigger). */
const MenuPreview = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="pgv-popover"><div className="zen-popover"><div className="zen-popover__items zen-menu__list" role="menu" aria-label={label}>{children}</div></div></div>
);

/** Content-colour illustrations: a Subtle callout (icon always Light) and a neutral text card. */
function Callout({ tone, icon, text, children }: { tone: "warning" | "info"; icon: "icon-alert-triangle-solid" | "icon-alert-circle-solid"; text: "strongest" | "base" | "light"; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: `var(--zen-color-background-${tone}-subtle-default)` }}>
      <span style={{ display: "inline-flex", color: `var(--zen-color-content-${tone}-light)` }}><Icon name={icon} size="base" decorative /></span>
      <span className={typographyStyles["Body/Base/Medium"]} style={{ color: `var(--zen-color-content-${tone}-${text})` }}>{children}</span>
    </div>
  );
}
function NeutralCard({ title, meta }: { title: "strongest" | "light"; meta: "strongest" | "light" }) {
  return (
    <div style={{ display: "grid", gap: 4, width: 240, padding: 16, borderRadius: 12, background: "var(--zen-color-background-surface-default)" }}>
      <span className={typographyStyles["Body/Base/Bold"]} style={{ color: `var(--zen-color-content-neutral-${title})` }}>Q4 roadmap</span>
      <span className={typographyStyles["Body/Small/Regular"]} style={{ color: "var(--zen-color-content-neutral-base)" }}>Milestones for the design system release.</span>
      <span className={typographyStyles["Caption/Regular"]} style={{ color: `var(--zen-color-content-neutral-${meta})` }}>Edited 2 hours ago</span>
    </div>
  );
}

/** Curated visual Do/Don't pairs per guideline slug. Text-only rules stay in the checklist below them. */
export const guidelineVisuals: Record<string, GuidelinePair[]> = {
  link: [
    { do: { preview: <div className="pgv-narrow"><Text tone="base">Lost your phone? Sign in with a <Link href="#recovery-codes" underline="always">recovery code</Link>.</Text></div>, caption: "The link names its destination; inside a sentence it is underlined." },
      dont: { preview: <div className="pgv-narrow"><Text tone="base">Lost your phone? <Link href="#recovery-codes" underline="none">Click here</Link>.</Text></div>, caption: "“Click here” means nothing out of context, and colour alone marks it." } },
    { do: { preview: <Text><Link href="https://status.zen.design" external>Status page</Link></Text>, caption: "external opens a new tab and says so: icon + hidden “(opens in a new tab)”." },
      dont: { preview: <Text><Link href="https://status.zen.design" target="_blank">Status page</Link></Text>, caption: "A bare target=\"_blank\" moves people to a new tab without warning." } },
  ],
  menu: [
    { do: { preview: <MenuPreview label="Actions for Q4 roadmap"><MenuItem label="Rename" icon="icon-edit-02-line" /><MenuItem label="Duplicate" icon="icon-duplicate-line" /><MenuSeparator /><MenuItem label="Delete" icon="icon-trash-line" danger /></MenuPreview>, caption: "Actions, verb first; the destructive one last, after a separator." },
      dont: { preview: <MenuPreview label="Sort by"><PopoverItem itemRole="menuitemradio" tabIndex={-1} label="Name" selected /><PopoverItem itemRole="menuitemradio" tabIndex={-1} label="Date modified" /><PopoverItem itemRole="menuitemradio" tabIndex={-1} label="Size" /></MenuPreview>, caption: "Picking a value (sort, status) is a Chip + Popover or a Select, not a Menu." } },
    { do: { preview: <MenuPreview label="Share"><MenuItem label="Copy link" icon="icon-link-01-line" /><MenuItem label="Email" icon="icon-mail-01-line" /><MenuItem label="Export as PDF" icon="icon-download-01-line" /></MenuPreview>, caption: "Short labels, and an icon on every item or on none." },
      dont: { preview: <MenuPreview label="Share"><MenuItem label="Copy a link to this document to your clipboard" icon="icon-link-01-line" /><MenuItem label="Email" /><MenuItem label="Export as PDF" icon="icon-download-01-line" /></MenuPreview>, caption: "Sentence-long labels get cut off; a missing icon breaks the column." } },
  ],
  form: [
    { do: { preview: <div className="pgv-field"><div className="pgv-wide pgv-stack"><InputField label="Work email" defaultValue="ava@zen" error="Enter a full address, like name@company.com" /><Button level="primary" size="md">Create account</Button></div></div>, caption: "Let people submit, then point at the field and say how to fix it." },
      dont: { preview: <div className="pgv-field"><div className="pgv-wide pgv-stack"><InputField label="Work email" defaultValue="ava@zen" /><Button level="primary" size="md" disabled>Create account</Button></div></div>, caption: "A disabled submit gives no reason: people can't tell what is wrong." } },
    { do: { preview: <div className="pgv-field"><FormFieldset kind="radio" legend="Delivery" required error="Choose a delivery speed"><RadioButton name="pgv-delivery" label="Standard · Free" caption="3–5 business days" checked={false} onChange={noop} /><RadioButton name="pgv-delivery" label="Express · $9.00" caption="Tomorrow" checked={false} onChange={noop} /></FormFieldset></div>, caption: "A legend names the group and one error covers it (kind=\"radio\" makes it a radiogroup)." },
      dont: { preview: <div className="pgv-field"><Stack><RadioButton name="pgv-delivery-bad" label="Standard · Free" checked={false} onChange={noop} /><RadioButton name="pgv-delivery-bad" label="Express · $9.00" checked={false} onChange={noop} /></Stack></div>, caption: "Unnamed radios: screen readers can't tell what the choice is for." } },
  ],
  button: [
    { do: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="primary" size="sm">Save changes</Button></Row>, caption: "One Primary for the main action; Tertiary for everything else." },
      dont: { preview: <Row><Button level="primary" size="sm">Cancel</Button><Button level="primary" size="sm">Save changes</Button></Row>, caption: "Two Primary buttons compete — nothing reads as the main action." } },
    { do: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="danger" size="sm" startIcon={<Icon name="icon-trash-line" decorative />}>Delete project</Button></Row>, caption: "Irreversible actions use Danger." },
      dont: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="secondary" size="sm">Delete project</Button></Row>, caption: "A neutral level hides the consequence; Secondary is not a default." } },
    { do: { preview: <Row><Button level="tertiary" size="sm">Keep editing</Button><Button level="primary" size="sm">Publish page</Button></Row>, caption: "Verb + object says exactly what happens." },
      dont: { preview: <Row><Button level="tertiary" size="sm">No</Button><Button level="primary" size="sm">OK</Button></Row>, caption: "“OK” / “No” force users to reread the question." } },

    { do: { preview: <div className="pgv-wide pgv-stack"><Button level="primary" size="md">Create project</Button><Button level="tertiary" size="sm" style={{ justifySelf: "start" }}>Simulate an upload</Button></div>, caption: "Full width is Medium or larger; a Small button hugs its label at the start." },
      dont: { preview: <div className="pgv-wide pgv-stack"><Button level="tertiary" size="xs">Simulate an upload</Button></div>, caption: "A Small button stretched edge to edge reads as a bar, not an action." } },
  ],
  chip: [
    { do: { preview: <Row><Chip variant="advanced" size="small" dropdown>Status</Chip><Chip variant="advanced" size="small" select selectionMode="multiple" selectionCount={2} onClearSelection={noop}>Owner</Chip></Row>, caption: "Filters are Advanced chips — one per dimension, with a counter for multiple." },
      dont: { preview: <Row><Button level="secondary" size="sm" endIcon={<Icon name="icon-chevron-down-line" decorative />}>Filter by status</Button></Row>, caption: "Never open a filter from a Button." } },
    { do: { preview: <Row><Chip variant="advanced" size="small" dropdown>Status</Chip><Search size="small" placeholder="Filter tasks" /></Row>, caption: "Pair Search with Chip filters in a toolbar." },
      dont: { preview: <Row><Segmented level="secondary" size="small" aria-label="Scope" value="open" options={[{ id: "all", label: "All" }, { id: "open", label: "Open" }, { id: "done", label: "Done" }]} /></Row>, caption: "Segmented switches views; it does not filter data." } },
    { do: { preview: <Row><Chip variant="advanced" size="small" select selectionMode="multiple" selectionCount={3} onClearSelection={noop}>Owner</Chip></Row>, caption: "Multiple selection shows its count and a clear affordance." },
      dont: { preview: <Row><Chip variant="advanced" size="small" select selectionMode="multiple">Owner</Chip></Row>, caption: "Without a count users can't tell a filter is applied." } },
  ],
  input: [
    { do: { preview: <div className="pgv-field"><InputField label="Work email" placeholder="you@company.com" /></div>, caption: "A visible label stays after the user starts typing." },
      dont: { preview: <div className="pgv-field"><InputField aria-label="Work email" placeholder="Work email" /></div>, caption: "Placeholder-as-label disappears on input and fails contrast." } },
    { do: { preview: <div className="pgv-field"><InputField label="Workspace ID" readOnly value="zen-7f3k2" /></div>, caption: "Values users can see but not change are Read-only." },
      dont: { preview: <div className="pgv-field"><InputField label="Workspace ID" disabled value="zen-7f3k2" /></div>, caption: "Zen inputs have no Disabled state." } },
    { do: { preview: <div className="pgv-field"><InputField label="Work email" defaultValue="ava@zen" error="Enter a full address, like name@company.com" /></div>, caption: "Errors say how to fix the value." },
      dont: { preview: <div className="pgv-field"><InputField label="Work email" defaultValue="ava@zen" error="Invalid input" /></div>, caption: "A generic error leaves users guessing." } },
  ],
  search: [
    { do: { preview: <div className="pgv-field"><Search placeholder="Search components" /></div>, caption: "Say what is being searched." },
      dont: { preview: <div className="pgv-field"><Search placeholder="Type here…" /></div>, caption: "A vague placeholder hides the scope." } },
    { do: { preview: <div className="pgv-field"><Search placeholder="Search members" /></div>, caption: "When search is a primary task, keep the field visible." },
      dont: { preview: <Row><IconButton level="tertiary" size="sm" aria-label="Search members" icon={<Icon name="icon-search-medium-line" />} /></Row>, caption: "An icon-only trigger hides search on desktop and costs an extra click." } },
  ],
  segmented: [
    { do: { preview: <Segmented level="secondary" size="small" aria-label="Layout" value="grid" options={[{ id: "grid", label: null, leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, leading: <Icon name="icon-list-line" decorative /> }]} />, caption: "2–5 short, mutually exclusive views." },
      dont: { preview: <Segmented level="secondary" size="small" aria-label="Sections" value="a" options={["Overview", "Activity", "Members", "Billing", "Settings", "Integrations"].map((label, i) => ({ id: i ? label : "a", label }))} />, caption: "Too many or long options — use Tabs or a Select." } },
  ],
  toggle: [
    { do: { preview: <div className="pgv-field"><Toggle label="Email notifications" caption="Applies immediately" selected onSelectedChange={noop} /></div>, caption: "Toggles apply instantly and name the setting." },
      dont: { preview: <div className="pgv-field"><Stack><Toggle label="Email notifications" selected onSelectedChange={noop} /><Button level="primary" size="sm">Save settings</Button></Stack></div>, caption: "If a Save button is needed, use a Checkbox instead." } },
    { do: { preview: <div className="pgv-field"><Toggle label="Dark mode preview" selected onSelectedChange={noop} /></div>, caption: "The label names the setting; the switch shows the state." },
      dont: { preview: <div className="pgv-field"><Toggle label="On" selected onSelectedChange={noop} /></div>, caption: "“On” / “Off” labels repeat the state and hide the setting." } },
  ],
  checkbox: [
    { do: { preview: <Checkbox label="Send me product news" caption="Optional · about once a month" checked={false} onChange={noop} />, caption: "Opt-ins start unchecked and are clearly optional." },
      dont: { preview: <Checkbox label="Send me offers from partners" checked onChange={noop} />, caption: "Don't pre-check marketing consent." } },
  ],
  "radio-button": [
    { do: { preview: <div className="pgv-stack" role="radiogroup" aria-label="Billing"><RadioButton name="pgv-billing" label="Monthly" checked onChange={noop} /><RadioButton name="pgv-billing" label="Yearly" caption="Save 20%" checked={false} onChange={noop} /></div>, caption: "A named group with a sensible default." },
      dont: { preview: <RadioButton name="pgv-lone" label="I agree" checked={false} onChange={noop} />, caption: "A lone radio can't be unselected — use a Checkbox." } },
  ],
  badge: [
    { do: { preview: <Row><Badge size="small" theme="green" background="subtle" leading={<Icon name="icon-check-line" decorative />}>Live</Badge><BadgeCounter size="small" theme="red" value="99+" /></Row>, caption: "Semantic colour + text; counters cap at 99+." },
      dont: { preview: <Row><Badge size="small" theme="green" background="subtle" leadingIcon={false}> </Badge><BadgeCounter size="small" theme="red" value={1284} /></Row>, caption: "Colour alone carries no meaning; raw big numbers overflow." } },
  ],
  tag: [
    { do: { preview: <Row><Tag remove onRemove={noop}>react</Tag><Tag remove onRemove={noop}>tokens</Tag></Row>, caption: "Tags are values the user entered, removable in place." },
      dont: { preview: <Row><Tag>Failed</Tag><Tag>Live</Tag></Row>, caption: "Statuses are Badges, not Tags." } },
  ],
  avatar: [
    { do: { preview: <Row><AvatarStack size="small" items={faces.slice(0, 4).map((src, i) => ({ src, alt: `Member ${i + 1}`, theme: "photo" as const }))} /><span className="pgv-note">+3 others</span></Row>, caption: "Stack up to 5 and summarise the rest in text." },
      dont: { preview: <Row>{faces.map((src, i) => <Avatar key={src} size="small" theme="photo" src={src} alt={`Member ${i + 1}`} />)}</Row>, caption: "A long row of avatars adds noise, not information." } },
  ],
  popover: [
    { do: { preview: <div className="pgv-popover"><Popover open label="Assignee" items={[{ id: "a", label: "Ava Chen", caption: "Product Designer", theme: "avatar-small", photoSrc: faces[0], selected: true }, { id: "b", label: "Bao Nguyen", caption: "Frontend Engineer", theme: "avatar-small", photoSrc: faces[1] }]} /></div>, caption: "Pass photoSrc; captioned items get a 32px avatar." },
      dont: { preview: <div className="pgv-popover"><Popover open label="New assignee"><div className="pgv-popover-form"><InputField label="Name" size="small" placeholder="Full name" /><InputField label="Email" size="small" placeholder="name@company.com" /><Button level="primary" size="xs">Invite</Button></div></Popover></div>, caption: "Forms and rich content belong in a Dialog, not a Popover." } },
    { do: { preview: <div className="pgv-popover"><PopoverManualAddNew open label="Select a label or create one" searchValue="Urgent" items={[{ id: "design", label: "Design" }, { id: "bug", label: "Bug" }]} /></div>, caption: "Open sets (labels, tags): let users create the missing value." },
      dont: { preview: <div className="pgv-popover"><Popover open label="Labels" search searchValue="Urgent" items={[]} emptyState="No results" /></div>, caption: "Don't dead-end with “No results” when creating is allowed." } },
  ],
  toast: [
    { do: { preview: <div className="pgv-wide"><Toast type="neutral" title="Project archived" action={{ label: "Undo", onClick: noop }} onClose={noop} /></div>, caption: "Past-tense outcome + one action (Undo)." },
      dont: { preview: <div className="pgv-wide"><Toast type="negative" title="Delete 24 pages?" action={{ label: "Delete", onClick: noop }} onClose={noop}>This can't be undone.</Toast></div>, caption: "Decisions and destructive confirmations need a Dialog." } },
    { do: { preview: <div className="pgv-field"><InputField label="Work email" defaultValue="ava@zen" error="Enter a full address, like name@company.com" /></div>, caption: "Field errors appear inline, next to the field that needs fixing." },
      dont: { preview: <div className="pgv-wide"><Toast type="negative" title="Email is invalid" onClose={noop} /></div>, caption: "A toast vanishes before the user can fix the field." } },
  ],
  "alert-banner": [
    { do: { preview: <div className="pgv-wide"><AlertBanner theme="warning" action={{ label: "Update card", onClick: noop }} onClose={noop}>Payment failed. Update your card to keep your plan.</AlertBanner></div>, caption: "Page-level condition, impact first, one fix." },
      dont: { preview: <div className="pgv-wide pgv-stack"><AlertBanner size="small" theme="info">New comments on this file.</AlertBanner><AlertBanner size="small" theme="warning">Storage almost full.</AlertBanner><AlertBanner size="small" theme="negative">Sync failed.</AlertBanner></div>, caption: "Stacked banners compete — merge them or show the most severe." } },
  ],
  accordion: [
    { do: { preview: <div className="pgv-wide"><Accordion title="How do I change my plan?" defaultExpanded>Go to Settings → Billing and pick a new plan. Changes apply immediately.</Accordion><Accordion title="Can I get an invoice?">Yes — invoices are emailed monthly.</Accordion></div>, caption: "Scannable questions; open the one that matches the context." },
      dont: { preview: <div className="pgv-wide"><Accordion title="Price">$24 / month</Accordion><Accordion title="Buy">Checkout</Accordion></div>, caption: "Don't hide essential information or the main action." } },
    { do: { preview: <div className="pgv-wide"><Accordion title="Billing">Invoices are emailed on the 1st.</Accordion><Accordion title="Invoices">Download past invoices as PDF.</Accordion></div>, caption: "One level: siblings, not children." },
      dont: { preview: <div className="pgv-wide"><Accordion title="Billing" defaultExpanded><Accordion title="Invoices">Download past invoices as PDF.</Accordion></Accordion></div>, caption: "Nested accordions hide content two clicks deep." } },
  ],
  pagination: [
    { do: { preview: <Pagination page={2} pageCount={10} onPageChange={noop} />, caption: "Current page marked; first/last kept with an ellipsis." },
      dont: { preview: <Pagination page={1} pageCount={2} onPageChange={noop} />, caption: "Two pages don't need pagination — show all items." } },
  ],
  skeleton: [
    { do: { preview: <div className="pgv-skeleton-card"><SkeletonShape shape="round" size="medium" /><div className="pgv-stack pgv-grow"><SkeletonHeading size="small" /><SkeletonText lines={2} /></div></div>, caption: "Mirror the real layout: avatar, title, two lines." },
      dont: { preview: <div className="pgv-skeleton-card"><SkeletonShape shape="rectangle" size="large" style={{ width: "100%" }} /></div>, caption: "One big block hides the structure users are waiting for." } },
  ],
  tooltip: [
    { do: { preview: <Tooltip content="Duplicate · ⌘D" placement="bottom" open><IconButton level="tertiary" size="sm" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>, caption: "Short name (+ shortcut) for an icon-only control." },
      dont: { preview: <Tooltip content="Creates a copy of this layer, including all nested layers, variables and prototype links. Learn more in the docs." placement="bottom" open><IconButton level="tertiary" size="sm" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>, caption: "Long explanations and links belong in a Popover or inline help." } },
    { do: { preview: <Stack><Button level="tertiary" size="sm" disabled>Export</Button><span className="pgv-note">Export is available on the Pro plan.</span></Stack>, caption: "Explain why a control is disabled in visible text." },
      dont: { preview: <Tooltip content="Upgrade to export" placement="bottom" open><Button level="tertiary" size="sm" disabled>Export</Button></Tooltip>, caption: "Disabled controls can't take focus, so keyboard users never see the tooltip." } },
  ],
  tabs: [
    { do: { preview: <Tabs aria-label="Project" size="small" value="overview" onChange={noop} items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity", badge: 3 }, { id: "members", label: "Members" }]} />, caption: "Short nouns; counters as badges." },
      dont: { preview: <Tabs aria-label="Project" size="small" value="overview" onChange={noop} items={[{ id: "overview", label: "Overview" }, { id: "activity", icon: <Icon name="icon-bell-01-line" />, "aria-label": "Activity" }, { id: "members", label: "Members" }]} />, caption: "Don't mix icon-only and labelled tabs." } },
    { do: { preview: <Tabs aria-label="Account" size="small" value="profile" onChange={noop} items={[{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }, { id: "billing", label: "Billing" }]} />, caption: "2–7 short tabs fit and scan at a glance." },
      dont: { preview: <div className="pgv-wide"><Tabs aria-label="Account" size="small" value="a" onChange={noop} items={["Profile", "Security", "Billing", "Members", "Apps", "API", "Logs", "Export", "Danger"].map((label, i) => ({ id: i ? label : "a", label }))} /></div>, caption: "More than 7 tabs overflow — use a Sidebar or a Select." } },
  ],
  breadcrumbs: [
    { do: { preview: <Breadcrumbs maxItems={4} items={["Home", "Teams", "Design", "Projects", "Zen DS", "Release notes"].map((label) => ({ id: label, label, href: "#" }))} />, caption: "Long paths collapse; the last item is the current page." },
      dont: { preview: <div className="pgv-narrow"><Breadcrumbs items={["Home", "Teams", "Design", "Projects", "Zen DS", "Release notes"].map((label) => ({ id: label, label, href: "#" }))} /></div>, caption: "Uncollapsed deep paths wrap and bury the current page." } },
  ],
  progress: [
    { do: { preview: <div className="pgv-field"><ProgressBar value={24} theme="accent" label="Uploading · 24%" /></div>, caption: "Accent for task progress, with a label." },
      dont: { preview: <div className="pgv-field"><ProgressBar value={24} theme="status" aria-label="Upload" /></div>, caption: "Status turns low values red — an upload that just started isn't an error." } },
    { do: { preview: <div className="pgv-field"><ProgressBar value={92} theme="status" scale="quota" label="Storage · 92% used" /></div>, caption: "Status when a high value is a problem (quotas, storage)." },
      dont: { preview: <div className="pgv-field"><ProgressBar value={92} theme="accent" label /></div>, caption: "A bare percentage hides what is filling up." } },
  ],
  borders: [
    { do: { preview: <Row><div style={{ padding: 12, borderRadius: 12, background: "var(--zen-color-background-surface-default)", boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-pale-default)" }} className="pgv-note">Static summary</div><button type="button" className="pgv-note" style={{ padding: 12, borderRadius: 12, background: "var(--zen-color-background-surface-default)", border: 0, fontFamily: "inherit", color: "var(--zen-color-content-neutral-strongest)", boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-subtle-default)", cursor: "pointer" }}>Choose plan</button></Row>, caption: "Pale frames what you read; Subtle frames what you act on." },
      dont: { preview: <Row><div style={{ padding: 12, borderRadius: 12, background: "var(--zen-color-background-surface-default)", boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-subtle-default)" }} className="pgv-note">Static summary</div><button type="button" className="pgv-note" style={{ padding: 12, borderRadius: 12, background: "var(--zen-color-background-surface-default)", border: 0, fontFamily: "inherit", color: "var(--zen-color-content-neutral-strongest)", boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-pale-default)", cursor: "pointer" }}>Choose plan</button></Row>, caption: "Swapped: the static box looks clickable, the button looks disabled." } },
    { do: { preview: <div style={{ padding: 16, borderRadius: 12, background: "var(--zen-color-background-surface-default)", border: "1px dashed var(--zen-color-border-neutral-subtle-default)" }} className="pgv-note">Drop files here</div>, caption: "Dashed strokes always use Subtle." },
      dont: { preview: <div style={{ padding: 16, borderRadius: 12, background: "var(--zen-color-background-surface-default)", border: "1px dashed var(--zen-color-border-neutral-pale-default)" }} className="pgv-note">Drop files here</div>, caption: "A Pale dash nearly disappears." } },
  ],
  "content-colors": [
    { do: { preview: <Callout tone="warning" icon="icon-alert-triangle-solid" text="base">Storage is 92% full.</Callout>, caption: "Lights group (Sky, Mint, Yellow, Zen): icon Light, text Base at most." },
      dont: { preview: <Callout tone="warning" icon="icon-alert-triangle-solid" text="light">Storage is 92% full.</Callout>, caption: "Lights-group text at Light fails contrast." } },
    { do: { preview: <NeutralCard title="strongest" meta="light" />, caption: "Neutral: title Strongest, description Base, meta Light." },
      dont: { preview: <NeutralCard title="light" meta="strongest" />, caption: "A Light title and a Strongest meta line invert the hierarchy." } },
    { do: { preview: <Callout tone="info" icon="icon-alert-circle-solid" text="strongest">New tokens are available in v1.0.2.</Callout>, caption: "Colour family on Subtle: text Strongest/Base, Light only on the icon." },
      dont: { preview: <Callout tone="info" icon="icon-alert-circle-solid" text="light">New tokens are available in v1.0.2.</Callout>, caption: "Colour Light is a highlight, not body copy." } },
  ],
  divider: [
    { do: { preview: <div className="pgv-field"><Stack><span className="pgv-note">Profile</span><Divider /><span className="pgv-note">Security</span></Stack></div>, caption: "Default (Pale) between groups — quiet, everyday." },
      dont: { preview: <div className="pgv-field"><Stack><span className="pgv-note">Profile</span><Divider color="high" /><Divider color="high" /><span className="pgv-note">Security</span></Stack></div>, caption: "Stacked, High-contrast lines shout for no reason." } },
  ],
  "inline-message": [
    { do: { preview: <div className="pgv-wide"><Stack><InlineMessage theme="warning" title="You're editing production">Changes publish to 12 live sites on save.</InlineMessage><InputField label="Site title" size="small" defaultValue="Zen Studio" /></Stack></div>, caption: "Right above the content it describes." },
      dont: { preview: <div className="pgv-wide"><Stack><InlineMessage theme="info" title="Heads up" /><InlineMessage theme="warning" title="Check this" /><InlineMessage theme="negative" title="Also this" /></Stack></div>, caption: "Stacked messages compete; merge them or show the most severe." } },
  ],
  "empty-state": [
    { do: { preview: <EmptyState title="No projects yet" illustration={false} primaryAction={{ label: "Create project", onClick: noop }}>Projects you create show up here.</EmptyState>, caption: "Say what's empty and offer the next step." },
      dont: { preview: <EmptyState title="Nothing here" illustration={false} primaryAction={{ label: "OK", onClick: noop }} />, caption: "A vague title and “OK” leave users stuck." } },
  ],
  stepper: [
    { do: { preview: <div className="pgv-wide"><Stepper aria-label="Checkout" current={1} steps={[{ id: "a", title: "Cart" }, { id: "b", title: "Shipping" }, { id: "c", title: "Payment" }]} /></div>, caption: "2–7 short noun steps; the current one is clear." },
      dont: { preview: <div className="pgv-wide"><Stepper aria-label="Settings" current={0} steps={["General", "Members", "Billing", "Apps", "API", "Logs", "Export", "Danger"].map((title) => ({ id: title, title }))} /></div>, caption: "Unordered sections aren't steps — use Tabs or a Sidebar." } },
  ],
  slider: [
    { do: { preview: <div className="pgv-field"><Row><Slider aria-label="Volume" defaultValue={60} icon="icon-volume-max-solid" /><span className="pgv-note">60%</span></Row></div>, caption: "A felt value with its number shown beside it." },
      dont: { preview: <div className="pgv-field"><Slider aria-label="Quantity" size="small" min={1} max={500} defaultValue={137} showLimits /></div>, caption: "Exact quantities need a NumberField users can type into." } },
  ],
  card: [
    { do: { preview: <Row><Card theme="border" spacing="small" active onClick={noop} aria-label="Pro plan"><span className="pgv-note">Pro · $12</span></Card><Card theme="border" spacing="small" onClick={noop} aria-label="Team plan"><span className="pgv-note">Team · $24</span></Card></Row>, caption: "The whole card is one choice; Active marks the selected one." },
      dont: { preview: <Row><Card theme="border" spacing="small"><Stack><span className="pgv-note">Pro · $12</span><Button level="primary" size="xs">Choose</Button><Button level="tertiary" size="xs">Details</Button></Stack></Card></Row>, caption: "Several buttons inside a card compete; pick one action." } },
  ],
  "dock-icon": [
    { do: { preview: <Row><DockIcon icon="icon-folder-line" theme="yellow" background="subtle" /><DockIcon icon="icon-file-doc-line" theme="blue" background="subtle" /><DockIcon icon="icon-colors-line" theme="purple" background="subtle" /></Row>, caption: "One size and one background per list; colour maps to a category." },
      dont: { preview: <Row><DockIcon icon="icon-folder-line" theme="yellow" size="large" /><DockIcon icon="icon-file-doc-line" theme="blue" background="subtle" size="small" /><DockIcon icon="icon-colors-line" theme="accent" size="medium" /></Row>, caption: "Mixed sizes and fills read as noise." } },
  ],
  "list-item": [
    { do: { preview: <div className="pgv-field"><List aria-label="Team"><ListItem title="Ava Chen" caption="Product Designer" leading={<Avatar size="medium" theme="blue" alt="">AC</Avatar>} onClick={noop} trailing={<IconButton appearance="flat" level="primary" size="md" aria-label="Message Ava Chen" icon={<Icon name="icon-message-chat-circle-line" />} />} /></List></div>, caption: "The row opens the profile; the trailing Icon-Flat Medium button is its own action (Figma Slot-Actions)." },
      dont: { preview: <div className="pgv-field"><List aria-label="Team"><ListItem title="Ava Chen" caption="Product Designer" leading={<Avatar size="medium" theme="blue" alt="">AC</Avatar>} trailing={<IconButton appearance="flat" level="primary" size="md" aria-label="Open Ava Chen" icon={<Icon name="icon-chevron-right-line-small" />} />} /></List></div>, caption: "Only the small chevron opens the item — make the whole row the target and keep the chevron passive." } },
    { do: { preview: <div className="pgv-field"><List aria-label="Settings"><ListItem title="Notifications" caption="Mentions, replies and reminders" leading={<DockIcon icon="icon-bell-01-line" theme="blue" background="subtle" size="small" />} onClick={noop} trailing={<Icon name="icon-chevron-right-line-small" decorative />} /></List></div>, caption: "Drill-down row: the whole row is the target, the chevron is passive." },
      dont: { preview: <div className="pgv-field"><List aria-label="Settings"><ListItem title="Wi-Fi" caption="Zen Studio 5G" leading={<DockIcon icon="icon-wifi-line" theme="blue" background="subtle" size="small" />} onClick={noop} trailing={<ToggleButton aria-label="Wi-Fi" selected onSelectedChange={noop} />} /></List></div>, caption: "A clickable row with a switch — the row click and the toggle compete. Let the row flip it, or keep the row static." } },
  ],
  table: [
    { do: { preview: <div className="pgv-wide"><Table aria-label="Invoices" rows={[{ id: "1", n: "INV-2401", a: "$120.00" }, { id: "2", n: "INV-2402", a: "$8.50" }]} getRowId={(r) => r.id} columns={[{ id: "n", header: "Invoice", cell: (r) => <TableText bold>{r.n}</TableText> }, { id: "a", header: "Amount", align: "right", cell: (r) => <TableText>{r.a}</TableText> }]} /></div>, caption: "Numbers right-aligned; one bold primary column." },
      dont: { preview: <div className="pgv-wide"><Table aria-label="Invoices" rows={[{ id: "1", n: "INV-2401", a: "$120.00" }, { id: "2", n: "INV-2402", a: "$8.50" }]} getRowId={(r) => r.id} columns={[{ id: "n", header: "Invoice", cell: (r) => <TableText bold>{r.n}</TableText> }, { id: "a", header: "Amount", cell: (r) => <TableText bold>{r.a}</TableText> }]} /></div>, caption: "Left-aligned amounts are hard to compare; everything bold has no hierarchy." } },
  ],
  rating: [
    { do: { preview: <Stack><Row><RatingDisplay value={4.6} /><span className="pgv-note">4.6 · 1,284 reviews</span></Row></Stack>, caption: "Averages use RatingDisplay with the count beside them." },
      dont: { preview: <Row><Rating aria-label="Average rating" value={5} /></Row>, caption: "An input showing a rounded average invites clicks and hides the sample size." } },
  ],
  "color-selector": [
    { do: { preview: <ColorSelector aria-label="Label colour" value="blue" colors={[["blue", "Blue"], ["green", "Green"], ["orange", "Orange"], ["purple", "Purple"]].map(([value, label]) => ({ value: `var(--zen-color-background-support-${value}-solid)`, label }))} />, caption: "A few named token colours, ordered by hue." },
      dont: { preview: <ColorSelector aria-label="Label colour" value="#fffbe6" colors={["#ffffff", "#fffbe6", "#f6f6f6", "#fff0f6"].map((value) => ({ value, label: value }))} />, caption: "Raw near-white hexes: indistinguishable, unnamed, and the check vanishes." } },
  ],
  metric: [
    { do: { preview: <Metric size="medium" label="Revenue" value="$48,210" trend={{ direction: "positive", label: "+12% vs. last month" }} />, caption: "Formatted value; the trend says what it compares to." },
      dont: { preview: <Metric size="medium" label="Revenue" value="48210.4567" trend={{ direction: "positive", label: "+12%" }} />, caption: "Raw numbers and a trend with no baseline." } },
  ],
  uploader: [
    { do: { preview: <div className="pgv-field"><FileUpload label="Contract" caption="PDF only. Max size of 2 MB" /></div>, caption: "Types and size limit are stated before upload." },
      dont: { preview: <div className="pgv-field"><FileUpload label="Contract" text="Upload" /></div>, caption: "No hint of what's accepted — users find out by failing." } },
  ],
  "top-navigation": [
    { do: { preview: <div className="pgv-mobile"><TopNavigation type="compact" title="Files" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} trailing={[{ icon: "icon-plus-line", label: "Upload" }, { icon: "icon-dots-horizontal-line", label: "More" }]} /></div>, caption: "Two trailing actions at most; the rest live behind More." },
      dont: { preview: <div className="pgv-mobile"><TopNavigation type="compact" title="Files" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} trailing={[{ icon: "icon-plus-line", label: "Upload" }, { icon: "icon-share-01-line", label: "Share" }, { icon: "icon-trash-line", label: "Delete" }]} /></div>, caption: "Three actions crowd the title and push it off-centre." } },
    { do: { preview: <div className="pgv-mobile"><TopNavigation largeTitle="Inbox" trailing={[{ icon: "icon-bell-01-line", label: "Notifications, 3 new", dot: true }]} /></div>, caption: "One style per bar: Tertiary actions with the Default type." },
      dont: { preview: <div className="pgv-mobile pgv-mobile--plain"><TopNavigation type="liquid-overlay" largeTitle="Inbox" trailing={[{ icon: "icon-bell-01-line", label: "Notifications" }]} /></div>, caption: "Overlay types need imagery behind them; on a plain surface the title washes out." } },
    { do: { preview: <div className="pgv-mobile"><TopNavigation type="compact" title="Invoice #1024" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} /></div>, caption: "Back is a left chevron — the mobile / tablet back affordance." },
      dont: { preview: <div className="pgv-mobile"><TopNavigation type="compact" title="Invoice #1024" leading={{ icon: "icon-arrow-left-line", label: "Back" }} /></div>, caption: "An arrow reads as \"move left\", not \"go back a level\"." } },
  ],
  "bottom-navigation": [
    { do: { preview: <div className="pgv-mobile"><BottomNavigation value="home" onValueChange={noop} items={[{ id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" }, { id: "search", label: "Search", icon: "icon-search-medium-line" }, { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line" }, { id: "me", label: "Profile", icon: "icon-user-circle-line" }]} /></div>, caption: "Four root destinations; the selected one uses the solid glyph." },
      dont: { preview: <div className="pgv-mobile"><BottomNavigation value="home" onValueChange={noop} items={[{ id: "home", label: "Home", icon: "icon-home-smile-line" }, { id: "me", label: "Profile", icon: "icon-user-circle-line" }]} /></div>, caption: "Two destinations don't need a bar; use Segmented or Tabs." } },
  ],
  "bottom-sheet": [
    { do: { preview: <div className="pgv-sheet"><span className="pgv-sheet__grab" /><strong className={typographyStyles["Heading/4"]}>Share</strong><List aria-label="Share"><ListItem title="Copy link" leading={<Icon name="icon-link-01-line" />} onClick={noop} /><ListItem title="Remove access" leading={<Icon name="icon-trash-line" />} onClick={noop} /></List></div>, caption: "One task, a clear title, destructive actions last." },
      dont: { preview: <div className="pgv-sheet"><span className="pgv-sheet__grab" /><strong className={typographyStyles["Heading/4"]}>Delete project?</strong><Row><Button level="tertiary" size="sm">Cancel</Button><Button level="danger" size="sm">Delete</Button></Row></div>, caption: "Destructive confirmations belong in a Dialog, not a sheet that can be swiped away." } },
  ],
  chat: [
    { do: { preview: <div className="pgv-mobile"><ChatThread><ChatMessage side="others" author={{ name: "Ava Chen" }} continued>Did you get the files?</ChatMessage><ChatMessage side="others" author={{ name: "Ava Chen" }}>The PDF is the latest.</ChatMessage><ChatMessage side="you" status="Seen">Yes, thanks!</ChatMessage></ChatThread></div>, caption: "A run shows one avatar; status sits under your last message." },
      dont: { preview: <div className="pgv-mobile"><ChatThread><ChatMessage side="others" author={{ name: "Ava Chen" }} time="20:30" status="Delivered">Did you get the files?</ChatMessage><ChatMessage side="others" author={{ name: "Ava Chen" }} time="20:30" status="Delivered">The PDF is the latest.</ChatMessage></ChatThread></div>, caption: "Repeating avatars, times and statuses on every bubble is noise." } },
  ],
  "ai-chat": [
    { do: { preview: <div className="pgv-wide"><AiChatBubble side="ai" actions={[{ icon: "icon-thumbs-up-line", label: "Good response" }, { icon: "icon-thumbs-down-line", label: "Bad response" }, { icon: "icon-copy-line", label: "Copy" }]}>Churn fell to 2.1% in Q3.</AiChatBubble></div>, caption: "Actions appear once the answer is complete, each with a name." },
      dont: { preview: <div className="pgv-wide"><AiChatBubble side="ai" streaming actions={[{ icon: "icon-copy-line", label: "Copy" }, { icon: "icon-refresh-cw-01-line", label: "Regenerate" }]}>Churn fell to</AiChatBubble></div>, caption: "Copy or Regenerate on a streaming answer acts on half a reply." } },
  ],
  chart: [
    { do: { preview: <div className="pgv-wide"><StackBarChart aria-label="Budget by quarter" height={180} series={[{ id: "a", label: "Development" }, { id: "b", label: "Research" }, { id: "c", label: "Marketing" }]} data={[{ label: "Q1", values: { a: 5, b: 2, c: 3 } }, { label: "Q2", values: { a: 6, b: 3, c: 2 } }, { label: "Q3", values: { a: 4, b: 3, c: 3 } }]} /></div>, caption: "A legend names every colour in a stack." },
      dont: { preview: <div className="pgv-wide"><StackBarChart aria-label="Budget by quarter" height={180} showLegend={false} series={[{ id: "a", label: "Development" }, { id: "b", label: "Research" }, { id: "c", label: "Marketing" }]} data={[{ label: "Q1", values: { a: 5, b: 2, c: 3 } }, { label: "Q2", values: { a: 6, b: 3, c: 2 } }, { label: "Q3", values: { a: 4, b: 3, c: 3 } }]} /></div>, caption: "Without a legend, colour is the only key." } },
    { do: { preview: <div className="pgv-wide"><LineChart aria-label="Revenue by quarter" height={180} format={(v) => `$${v}K`} data={[{ label: "Q1", value: 9 }, { label: "Q2", value: 15 }, { label: "Q3", value: 13 }, { label: "Q4", value: 23 }]} /></div>, caption: "Formatted values and a named chart the keyboard can explore." },
      dont: { preview: <div className="pgv-wide"><LineChart aria-label="Chart" height={180} data={[{ label: "Design", value: 9 }, { label: "Sales", value: 15 }, { label: "Ops", value: 13 }, { label: "HR", value: 23 }]} /></div>, caption: "A line implies order in time; departments are categories, use bars." } },
  ],
  "description-list": [
    { do: { preview: <div className="pgv-field"><DescriptionList items={[{ term: "Subtotal", description: "$134.00" }, { term: "Shipping", description: "$8.00" }, { term: "Total", description: "$142.00", emphasis: true }]} /></div>, caption: "One total closes the sum: Body/Base/Bold under a High rule." },
      dont: { preview: <div className="pgv-field"><DescriptionList items={[{ term: "Subtotal", description: "$134.00", emphasis: true }, { term: "Shipping", description: "$8.00", emphasis: true }, { term: "Total", description: "$142.00", emphasis: true }]} /></div>, caption: "Every row emphasised: nothing reads as the total." } },
    { do: { preview: <div className="pgv-field"><DescriptionList layout="stacked" items={[{ term: "Shipping address", description: "12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City" }, { term: "Email", description: "ava.chen@zen-studio.example" }]} /></div>, caption: "Long values stack: the term above, the value left-aligned." },
      dont: { preview: <div className="pgv-field"><DescriptionList stackBelow={0} items={[{ term: "Shipping address", description: "12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City" }, { term: "Email", description: "ava.chen@zen-studio.example" }]} /></div>, caption: "Long values forced inline wrap into a ragged, right-aligned column." } },
  ],
  "action-bar": [
    { do: { preview: <div className="pgv-mobile"><ActionBar position="static" primaryAction={{ label: "Add to cart", onClick: noop }} secondaryAction={{ label: "Save for later", onClick: noop }} /></div>, caption: "Phone: Large, full width, Primary on top, one Tertiary below." },
      dont: { preview: <div className="pgv-mobile"><ActionBar position="static"><Button level="primary" size="lg">Add to cart</Button><Button level="primary" size="lg">Buy now</Button></ActionBar></div>, caption: "Two Primary buttons compete: nothing reads as the main action." } },
    { do: { preview: <div className="pgv-mobile"><p className="pgv-note" style={{ margin: 0, padding: "20px 24px" }}>Windmill by the sea · 40 × 30 cm</p><ActionBar position="static" summary={<span className="pgv-note">2 prints · $96.00</span>} primaryAction={{ label: "Check out", onClick: noop }} /></div>, caption: "Surface with a Pale top rule: the bar is separate without elevation." },
      dont: { preview: <div className="pgv-mobile"><p className="pgv-note" style={{ margin: 0, padding: "20px 24px" }}>Windmill by the sea · 40 × 30 cm</p><ActionBar position="static" surface="alt" style={{ borderTop: 0, boxShadow: "var(--zen-style-shadow-top-level-2-shadow)" }} summary={<span className="pgv-note">2 prints · $96.00</span>} primaryAction={{ label: "Check out", onClick: noop }} /></div>, caption: "A drop shadow on a tinted bar muddies the layers (§9)." } },
  ],
  image: [
    { do: { preview: <div className="pgv-field"><Image src={platformMedia.site[3].src} alt="White houses and a windmill by the sea" ratio="16:9" /></div>, caption: "A ratio frame: the picture fills it without distortion." },
      dont: { preview: <div className="pgv-field"><img src={platformMedia.site[3].src} alt="" style={{ display: "block", width: "100%", height: 96, borderRadius: 12 }} /></div>, caption: "A fixed width and height squash the picture." } },
    { do: { preview: <div className="pgv-field"><List aria-label="Uploads"><ListItem title="windmill-by-the-sea.webp" caption="1.2 MB · 2 hours ago" leading={<Thumbnail src={platformMedia.site[3].src} alt="" />} /></List></div>, caption: "Thumbnail md (40px) leads the row; alt=\"\" because the title names it." },
      dont: { preview: <div className="pgv-field"><List aria-label="Uploads"><ListItem title="windmill-by-the-sea.webp" caption="1.2 MB · 2 hours ago" leading={<Thumbnail src={platformMedia.site[3].src} alt="" size="2xl" />} /></List></div>, caption: "An oversized thumbnail breaks the row rhythm and squeezes the title." } },
  ],
  "visually-hidden": [
    { do: { preview: <Stack>{["paper", "framing"].map((topic) => <Row key={topic}><Button level="tertiary" size="sm">Read more<VisuallyHidden> about {topic}</VisuallyHidden></Button><span className="pgv-note">Heard: “Read more about {topic}”</span></Row>)}</Stack>, caption: "Hidden text makes each “Read more” unique for screen readers." },
      dont: { preview: <Stack>{["paper", "framing"].map((topic) => <Row key={topic}><Button level="tertiary" size="sm">Read more</Button><span className="pgv-note">Heard: “Read more”</span></Row>)}</Stack>, caption: "Identical names: screen-reader users can't tell the links apart." } },
  ],
};
