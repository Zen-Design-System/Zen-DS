// zen-usage-guard: dont-examples
// This file deliberately renders *wrong* usage in its "dont" previews, so the usage harness skips it
// (tools/usage-guard/check-usage.mjs honours the marker above). Keep "do" previews exemplary.
import type { ReactNode } from "react";
import { Avatar, AvatarStack } from "../components/Avatar";
import { Badge, BadgeCounter } from "../components/Badge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button, IconButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { InputField } from "../components/Input";
import { Popover, PopoverManualAddNew } from "../components/Popover";
import { ProgressBar } from "../components/Progress";
import { RadioButton } from "../components/RadioButton";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { Tabs } from "../components/Tabs";
import { Tag } from "../components/Tag";
import { Toggle } from "../components/Toggle";
import { Tooltip } from "../components/Tooltip";

export type GuidelineExample = { preview: ReactNode; caption: string };
export type GuidelinePair = { do: GuidelineExample; dont: GuidelineExample };

const noop = () => undefined;
const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><rect x="6" y="21" width="20" height="14" rx="7" fill="${fg}"/></svg>`);
const faces = [photo("#d9c7b8", "#8f735f"), photo("#c8d6c2", "#5f7a58"), photo("#d4cbe3", "#6d5b92"), photo("#e6c8c4", "#9a5a52"), photo("#c4dfdc", "#4f8a84"), photo("#f1e4d6", "#b07d4f"), photo("#dde5ec", "#4a6078")];
const Row = ({ children }: { children: ReactNode }) => <div className="pgv-row">{children}</div>;
const Stack = ({ children }: { children: ReactNode }) => <div className="pgv-stack">{children}</div>;

/** Curated visual Do/Don't pairs per guideline slug. Text-only rules stay in the checklist below them. */
export const guidelineVisuals: Record<string, GuidelinePair[]> = {
  button: [
    { do: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="primary" size="sm">Save changes</Button></Row>, caption: "One Primary for the main action; Tertiary for everything else." },
      dont: { preview: <Row><Button level="primary" size="sm">Cancel</Button><Button level="primary" size="sm">Save changes</Button></Row>, caption: "Two Primary buttons compete — nothing reads as the main action." } },
    { do: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="danger" size="sm" startIcon={<Icon name="icon-trash-line" decorative />}>Delete project</Button></Row>, caption: "Irreversible actions use Danger." },
      dont: { preview: <Row><Button level="tertiary" size="sm">Cancel</Button><Button level="secondary" size="sm">Delete project</Button></Row>, caption: "A neutral level hides the consequence; Secondary is not a default." } },
  ],
  chip: [
    { do: { preview: <Row><Chip variant="advanced" size="small" dropdown>Status</Chip><Chip variant="advanced" size="small" select selectionMode="multiple" selectionCount={2} onClearSelection={noop}>Owner</Chip></Row>, caption: "Filters are Advanced chips — one per dimension, with a counter for multiple." },
      dont: { preview: <Row><Button level="secondary" size="sm" endIcon={<Icon name="icon-chevron-down-line" decorative />}>Filter by status</Button></Row>, caption: "Never open a filter from a Button." } },
    { do: { preview: <Row><Chip variant="advanced" size="small" dropdown>Status</Chip><Search size="small" placeholder="Filter tasks" /></Row>, caption: "Pair Search with Chip filters in a toolbar." },
      dont: { preview: <Row><Segmented size="small" aria-label="Scope" value="open" options={[{ id: "all", label: "All" }, { id: "open", label: "Open" }, { id: "done", label: "Done" }]} /></Row>, caption: "Segmented switches views; it does not filter data." } },
  ],
  input: [
    { do: { preview: <div className="pgv-field"><InputField label="Work email" placeholder="you@company.com" /></div>, caption: "A visible label stays after the user starts typing." },
      dont: { preview: <div className="pgv-field"><InputField aria-label="Work email" placeholder="Work email" /></div>, caption: "Placeholder-as-label disappears on input and fails contrast." } },
    { do: { preview: <div className="pgv-field"><InputField label="Workspace ID" readOnly value="zen-7f3k2" /></div>, caption: "Values users can see but not change are Read-only." },
      dont: { preview: <div className="pgv-field"><InputField label="Workspace ID" disabled value="zen-7f3k2" /></div>, caption: "Zen inputs have no Disabled state (Search is the exception)." } },
  ],
  search: [
    { do: { preview: <div className="pgv-field"><Search placeholder="Search components" /></div>, caption: "Say what is being searched." },
      dont: { preview: <div className="pgv-field"><Search placeholder="Type here…" /></div>, caption: "A vague placeholder hides the scope." } },
  ],
  segmented: [
    { do: { preview: <Segmented size="small" aria-label="Layout" value="grid" options={[{ id: "grid", label: null, leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, leading: <Icon name="icon-list-line" decorative /> }]} />, caption: "2–5 short, mutually exclusive views." },
      dont: { preview: <Segmented size="small" aria-label="Sections" value="a" options={["Overview", "Activity", "Members", "Billing", "Settings", "Integrations"].map((label, i) => ({ id: i ? label : "a", label }))} />, caption: "Too many or long options — use Tabs or a Select." } },
  ],
  toggle: [
    { do: { preview: <div className="pgv-field"><Toggle label="Email notifications" caption="Applies immediately" selected onSelectedChange={noop} /></div>, caption: "Toggles apply instantly and name the setting." },
      dont: { preview: <div className="pgv-field"><Stack><Toggle label="Email notifications" selected onSelectedChange={noop} /><Button level="primary" size="sm">Save settings</Button></Stack></div>, caption: "If a Save button is needed, use a Checkbox instead." } },
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
  tooltip: [
    { do: { preview: <Tooltip content="Duplicate · ⌘D" placement="bottom" open><IconButton level="tertiary" size="sm" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>, caption: "Short name (+ shortcut) for an icon-only control." },
      dont: { preview: <Tooltip content="Creates a copy of this layer, including all nested layers, variables and prototype links. Learn more in the docs." placement="bottom" open><IconButton level="tertiary" size="sm" aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>, caption: "Long explanations and links belong in a Popover or inline help." } },
  ],
  tabs: [
    { do: { preview: <Tabs aria-label="Project" size="small" value="overview" onChange={noop} items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity", badge: 3 }, { id: "members", label: "Members" }]} />, caption: "Short nouns; counters as badges." },
      dont: { preview: <Tabs aria-label="Project" size="small" value="overview" onChange={noop} items={[{ id: "overview", label: "Overview" }, { id: "activity", icon: <Icon name="icon-bell-01-line" />, "aria-label": "Activity" }, { id: "members", label: "Members" }]} />, caption: "Don't mix icon-only and labelled tabs." } },
  ],
  breadcrumbs: [
    { do: { preview: <Breadcrumbs maxItems={4} items={["Home", "Teams", "Design", "Projects", "Zen DS", "Release notes"].map((label) => ({ id: label, label, href: "#" }))} />, caption: "Long paths collapse; the last item is the current page." },
      dont: { preview: <div className="pgv-narrow"><Breadcrumbs items={["Home", "Teams", "Design", "Projects", "Zen DS", "Release notes"].map((label) => ({ id: label, label, href: "#" }))} /></div>, caption: "Uncollapsed deep paths wrap and bury the current page." } },
  ],
  progress: [
    { do: { preview: <div className="pgv-field"><ProgressBar value={24} theme="accent" label="Uploading · 24%" /></div>, caption: "Accent for task progress, with a label." },
      dont: { preview: <div className="pgv-field"><ProgressBar value={24} theme="status" aria-label="Upload" /></div>, caption: "Status turns low values red — an upload that just started isn't an error." } },
  ],
};
