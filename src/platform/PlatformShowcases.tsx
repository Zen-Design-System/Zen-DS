import { createContext, Fragment, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar, AvatarStack, type AvatarTheme } from "../components/Avatar";
import { Badge, BadgeCounter, type BadgeTheme } from "../components/Badge";
import { Button, IconButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Chip, type ChipSize } from "../components/Chip";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { AutocompleteField, DateField, HeadingField, InputConditionItem, InputConditions, InputField, InputHelpText, InputLabel, NumberField, RichTextField, SelectField, TextAreaField, type InputHelpTheme } from "../components/Input";
import { Popover, PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup, type PopoverItemData } from "../components/Popover";
import { RadioButton } from "../components/RadioButton";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { Sidebar, SidebarSubMenu, type SidebarSection } from "../components/Sidebar";
import { Tag } from "../components/Tag";
import { Toggle, ToggleButton } from "../components/Toggle";
import { Tooltip } from "../components/Tooltip";
import { TabPanel, Tabs } from "../components/Tabs";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProgressBar, ProgressCircle } from "../components/Progress";
import { Dialog, ModalForm } from "../components/Dialog";
import { Accordion } from "../components/Accordion";
import { AlertBanner } from "../components/AlertBanner";
import { Pagination } from "../components/Pagination";
import { SkeletonHeading, SkeletonShape, SkeletonText } from "../components/Skeleton";
import { Toast, ToastStack, useToast, type ToastItem, type ToastType } from "../components/Toast";
import { DescriptionList } from "../components/DescriptionList";
import { Card } from "../components/Card";
import { NpsScale, OpinionScale, Rating, RatingDisplay, type OpinionEmotion } from "../components/Rating";
import { ColorSelector } from "../components/ColorSelector";
import { Metric, MetricCard } from "../components/MetricWidget";
import { FileUpload, UploaderFileItem, type UploaderFile } from "../components/Uploader";
import { SidePanel } from "../components/SidePanel";
import { DockIcon } from "../components/DockIcon";
import { FileIcon, fileIconFormatOf } from "../components/FileIcon";
import { List, ListItem } from "../components/ListItem";
import { Table, TableActions, TableBadges, TableMedia, TableTags, TableText, TableTrend, type TableSort } from "../components/Table";
import { VisuallyHidden } from "../components/VisuallyHidden";
import { Divider } from "../components/Divider";
import { InlineMessage } from "../components/InlineMessage";
import { EmptyState } from "../components/EmptyState";
import { Stepper, type StepperStep } from "../components/Stepper";
import { TopNavigation } from "../components/TopNavigation";
import { BottomSheet } from "../components/BottomSheet";
import { Slider } from "../components/Slider";
import { ZenProvider } from "../components/Provider";
import { Stack } from "../components/Layout";
import { Heading, Text } from "../components/Text";
import { figmaSidebarBrand } from "./PlatformSidebarBrand";
import { typographyStyles } from "../tokens/typography.generated";
import { PlatformCode } from "./PlatformCode";
import { PlatformPhone } from "./PlatformPhone";
import type { PlatformPage } from "./PlatformExamples";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { mobileExamples } from "./PlatformMobileShowcases";
import { appLayerExamples } from "./PlatformAppLayer";
import { typographyHierarchyExamples } from "./PlatformTypographyHierarchy";
import { platformMedia, usePlatformVideo } from "./PlatformMedia";
import { auditLog, pageOf, ScrollBox, searchResults } from "./PlatformPaginationData";

/* Real-world compositions shown under each component playground. Every example
 * is a live, stateful composition of production components: no forced visual
 * states, so hover, focus, keyboard and outside-click behave like in an app. */

/** "1 item" / "3 items" — counts in example copy always agree with their number. */
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><rect x="6" y="21" width="20" height="14" rx="7" fill="${fg}"/></svg>`);
const people = [
  { id: "ava", name: "Ava Chen", role: "Product Designer", initials: "AC", theme: "blue" as AvatarTheme, photo: photo("#d9c7b8", "#8f735f"), online: true },
  { id: "bao", name: "Bao Nguyen", role: "Frontend Engineer", initials: "BN", theme: "green" as AvatarTheme, photo: photo("#c8d6c2", "#5f7a58"), online: true },
  { id: "chi", name: "Chi Tran", role: "Design Ops", initials: "CT", theme: "purple" as AvatarTheme, photo: photo("#d4cbe3", "#6d5b92"), online: false },
  { id: "duy", name: "Duy Le", role: "Product Manager", initials: "DL", theme: "red" as AvatarTheme, photo: photo("#e6c8c4", "#9a5a52"), online: false },
  { id: "em", name: "Em Pham", role: "QA Engineer", initials: "EP", theme: "teal" as AvatarTheme, photo: photo("#c4dfdc", "#4f8a84"), online: true },
];


/** Lets an example switch its whole card (header, stage, code and every component inside) to a token mode. */
const ExampleCardThemeContext = createContext<(theme: "light" | "dark" | null) => void>(() => undefined);

/** Overlays that own Escape while an example is full screen (Escape closes them first, not the full-screen view). */
const fullScreenEscapeOwners = ".zen-popover, .zen-sidebar__submenu, [aria-modal='true'], [role='menu'], [role='listbox']";

/**
 * Full-screen view for examples that are a whole desktop screen: the card covers the viewport (header, stage, code),
 * everything behind it is inert, and the platform portal stays live so the example's overlays still work. Escape
 * leaves unless an overlay or a text field inside the example owns it; focus and the page scroll position return.
 */
function useExampleFullScreen(openRef: { current: HTMLButtonElement | null }, exitRef: { current: HTMLButtonElement | null }) {
  const [fullScreen, setFullScreen] = useState(false);
  const scrollY = useRef(0);
  const enter = useCallback(() => { scrollY.current = window.scrollY; setFullScreen(true); }, []);
  const exit = useCallback(() => setFullScreen(false), []);
  useEffect(() => {
    const card = exitRef.current?.closest<HTMLElement>(".pe-card");
    if (!fullScreen || !card) return undefined;
    const inerted: HTMLElement[] = [];
    const stop = card.closest(".official-platform") ?? document.body;
    for (let node: HTMLElement = card; node !== stop && node.parentElement; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert || sibling.querySelector(".official-portal-root") || sibling.matches(".official-portal-root")) continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
    const root = document.documentElement;
    const { overflow, overflowAnchor } = root.style;
    // The card leaves the page flow while it covers the viewport; without anchoring the page keeps its scroll position.
    root.style.overflow = "hidden";
    root.style.overflowAnchor = "none";
    exitRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], td, th") || document.querySelector(fullScreenEscapeOwners)) return;
      setFullScreen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      inerted.forEach((element) => { element.inert = false; });
      root.style.overflow = overflow;
      window.scrollTo({ top: scrollY.current, behavior: "instant" });
      openRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => { window.scrollTo({ top: scrollY.current, behavior: "instant" }); root.style.overflowAnchor = overflowAnchor; });
    };
  }, [fullScreen, openRef, exitRef]);
  return { fullScreen, enter, exit };
}

function ExampleCard({ title, description, code, wide, screen, children }: { title: string; description: string; code: string; wide?: boolean; screen?: boolean; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const previewTypography = useContext(PlatformTypographyContext);
  const openRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const { fullScreen, enter, exit } = useExampleFullScreen(openRef, exitRef);
  const titleId = useId();
  return (
    <ExampleCardThemeContext.Provider value={setTheme}>
    {/* Scoped modes through the public ZenProvider (dogfood): the card's own light/dark switch, no paint, and no portal
        root, so overlays keep using the platform portal (preview typography, audit hooks). */}
    <ZenProvider as="article" className="pe-card" data-wide={wide ? "true" : undefined} data-fullscreen={fullScreen ? "true" : undefined}
      role={fullScreen ? "dialog" : undefined} aria-labelledby={fullScreen ? titleId : undefined}
      theme={theme ?? undefined} breakpoint="desktop" paint={false} portal={false}>
      <header className="pe-card__head">
        <div className="pe-card__titles">
          <h3 id={titleId} className={typographyStyles["Heading/4"]}>{title}</h3>
          <p className={typographyStyles["Body/Small/Regular"]}>{description}</p>
        </div>
        <div className="pe-card__actions">
          {/* zen-allow-compact-button: platform chrome — the compact "Code" pill in every example card header. */}
          <Button appearance="main" level="tertiary" size="xs" aria-expanded={showCode} startIcon={<Icon name="icon-code-02-line" decorative />} onClick={() => setShowCode((open) => !open)}>
            {showCode ? "Hide code" : "Code"}
          </Button>
          {/* zen-allow-compact-button: platform chrome — desktop-screen examples open full screen from the card header. */}
          {screen && !fullScreen ? <Button ref={openRef} appearance="main" level="tertiary" size="xs" startIcon={<Icon name="icon-maximize-01-line" decorative />} onClick={enter}>Full screen</Button> : null}
          {/* zen-allow-compact-button: platform chrome — leaves the full-screen view (Escape does the same). */}
          {fullScreen ? <Button ref={exitRef} appearance="main" level="tertiary" size="xs" aria-keyshortcuts="Escape" startIcon={<Icon name="icon-minimize-01-line" decorative />} onClick={exit}>Exit full screen</Button> : null}
        </div>
      </header>
      <div className="pe-card__stage" data-typography={previewTypography}><div className="pe-card__preview">{children}</div></div>
      {showCode ? <div className="pe-card__code"><PlatformCode code={code} /></div> : null}
    </ZenProvider>
    </ExampleCardThemeContext.Provider>
  );
}

/* ───────────── Button ───────────── */

function ButtonDialogExample() {
  const [phase, setPhase] = useState<"closed" | "confirm" | "deleting" | "deleted">("confirm");
  // Focus moves as with a real dialog, and only after a click (never on load): Cancel and Undo return it to the trigger,
  // the trigger moves it to Cancel (the safe action), and Undo takes it once the project is gone.
  const focusTarget = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const go = (next: typeof phase) => { moveFocus.current = true; setPhase(next); };
  useEffect(() => {
    if (phase === "deleting") {
      const timer = window.setTimeout(() => go("deleted"), 1200);
      return () => window.clearTimeout(timer);
    }
    if (moveFocus.current) { moveFocus.current = false; focusTarget.current?.focus(); }
    return undefined;
  }, [phase]);
  if (phase === "closed") return <Button ref={focusTarget} appearance="main" level="danger" size="sm" startIcon={<Icon name="icon-trash-line" decorative />} onClick={() => go("confirm")}>Delete project…</Button>;
  return (
    <div className="pe-dialog" role="dialog" aria-labelledby="pe-dialog-title">
      {phase === "deleted" ? (
        <>
          <Text textStyle="Body/Base/Medium" as="p">“Marketing site” was deleted.</Text>
          <div className="pe-actions"><Button ref={focusTarget} appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-refresh-cw-01-line" decorative />} onClick={() => go("closed")}>Undo</Button></div>
        </>
      ) : (
        <>
          <span id="pe-dialog-title"><Text as="span" textStyle="Body/Extra/Bold">Delete project?</Text></span>
          <Text tone="base" as="p">“Marketing site” and its 24 pages will be removed for everyone in the workspace.</Text>
          <div className="pe-actions">
            <Button ref={focusTarget} appearance="main" level="tertiary" size="sm" disabled={phase === "deleting"} onClick={() => go("closed")}>Cancel</Button>
            <Button appearance="main" level="danger" size="sm" disabled={phase === "deleting"} startIcon={<Icon name="icon-trash-line" decorative />} onClick={() => setPhase("deleting")}>
              {phase === "deleting" ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ButtonToolbarExample() {
  const [history, setHistory] = useState<string[]>(["Draft"]);
  const [future, setFuture] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const edit = () => { setHistory((items) => [...items, `Edit ${items.length}`]); setFuture([]); setPublished(false); };
  const undo = () => { const last = history[history.length - 1]; setHistory(history.slice(0, -1)); setFuture([last, ...future]); setPublished(false); };
  const redo = () => { const [next, ...rest] = future; setHistory([...history, next]); setFuture(rest); setPublished(false); };
  return (
    <Stack gap="sm" align="stretch">
      <div className="pe-toolbar" role="toolbar" aria-label="Document actions">
        <IconButton appearance="main" level="tertiary" size="sm" aria-label="Undo" disabled={history.length <= 1} onClick={undo} icon={<Icon name="icon-reverse-left-line" />} />
        <IconButton appearance="main" level="tertiary" size="sm" aria-label="Redo" disabled={future.length === 0} onClick={redo} icon={<Icon name="icon-reverse-right-line" />} />
        <Divider orientation="vertical" decorative />
        <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-edit-02-line" decorative />} onClick={edit}>Make an edit</Button>
        <span className="pe-grow" />
        <Button appearance="main" level="primary" size="sm" disabled={published} onClick={() => setPublished(true)}>{published ? "Published" : "Publish"}</Button>
      </div>
      <Text as="span" textStyle="Caption/Regular" tone="light">{plural(history.length - 1, "change")} · {future.length} to redo · {published ? "live" : "unpublished"}</Text>
    </Stack>
  );
}

/* ───────────── Chip ───────────── */

const tasks = [
  { id: 1, title: "Audit Checkbox hover", status: "in-progress", owner: "ava" },
  { id: 2, title: "Ship Date Picker range", status: "done", owner: "bao" },
  { id: 3, title: "Write Tag guidelines", status: "todo", owner: "chi" },
  { id: 4, title: "Token rename for Selected", status: "todo", owner: "duy" },
  { id: 5, title: "Sidebar small density QA", status: "in-progress", owner: "bao" },
  { id: 6, title: "Popover outside click", status: "done", owner: "ava" },
];
const statusLabels: Record<string, string> = { todo: "To do", "in-progress": "In progress", done: "Done" };
const statusTheme: Record<string, BadgeTheme> = { todo: "neutral", "in-progress": "blue", done: "green" };

function ChipFilterBarExample() {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const rows = tasks.filter((task) => (statuses.length === 0 || statuses.includes(task.status)) && (!owner || task.owner === owner));
  const ownerPerson = people.find((person) => person.id === owner);
  const size: ChipSize = "small";
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip
          variant="advanced" size={size} selectionMode="multiple" selectionCount={statuses.length} select={statuses.length > 0} dropdown
          popoverOpen={statusOpen} onPopoverOpenChange={setStatusOpen} popoverMultiple popoverLabel="Status"
          popoverItems={Object.entries(statusLabels).map(([id, label]) => ({ id, label, selected: statuses.includes(id) }))}
          onPopoverSelect={(item) => setStatuses((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
          onClearSelection={statuses.length ? () => { setStatuses([]); setStatusOpen(false); } : undefined}
        >
          {statuses.length === 1 ? statusLabels[statuses[0]] : "Status"}
        </Chip>
        <Chip
          variant="advanced" size={size} select={Boolean(owner)} dropdown photoSrc={ownerPerson?.photo} theme={ownerPerson ? "leading-photo" : "text-only"}
          popoverOpen={ownerOpen} onPopoverOpenChange={setOwnerOpen} popoverLabel="Owner"
          popoverItems={people.map((person) => ({ id: person.id, label: person.name, caption: person.role, selected: owner === person.id, theme: "avatar-small", photoSrc: person.photo }))}
          onPopoverSelect={(item) => setOwner(item.id === owner ? null : item.id)}
          onClearSelection={owner ? () => setOwner(null) : undefined}
        >
          {ownerPerson?.name ?? "Owner"}
        </Chip>
        {/* Clear all matches the chips' height (Chip Small 32 ↔ Button sm 32) and stays quiet as a Flat button. */}
        {statuses.length || owner ? <Button appearance="flat" level="primary" size="sm" onClick={() => { setStatuses([]); setOwner(null); }}>Clear all</Button> : null}
      </Stack>
      <List aria-label="Tasks">
        {rows.map((task) => <ListItem key={task.id} title={task.title} trailing={<Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>} />)}
        {rows.length === 0 ? <li className="pe-empty" aria-live="polite"><Text as="span" tone="light">No tasks match these filters.</Text></li> : null}
      </List>
    </Stack>
  );
}

function ChipTopicsExample() {
  const topics = ["Accessibility", "Tokens", "Motion", "Icons", "Dark mode", "Density", "Typography"];
  const [picked, setPicked] = useState<string[]>(["Tokens", "Dark mode"]);
  return (
    <Stack gap="sm" align="stretch">
      <Text as="span" textStyle="Body/Base/Medium">Pick topics you want updates about</Text>
      <Stack direction="row" gap="xs" align="center" wrap role="group" aria-label="Topics">
        {topics.map((topic) => {
          const on = picked.includes(topic);
          return <Chip key={topic} variant="normal" size="small" level={on ? "primary" : "secondary"} select={on} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((item) => item !== topic) : [...picked, topic])}>{topic}</Chip>;
        })}
      </Stack>
      <Text as="span" textStyle="Caption/Regular" tone="light">{picked.length} selected</Text>
    </Stack>
  );
}

/* ───────────── Input ───────────── */

function SignUpExample() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Includes a number", ok: /\d/.test(password) },
    { label: "Includes an uppercase letter", ok: /[A-Z]/.test(password) },
  ];
  const valid = name.trim().length > 0 && emailValid && rules.every((rule) => rule.ok) && agree;
  if (submitted) {
    return <div className="pe-stack pe-center"><Icon name="icon-check-circle-line" size="lg" decorative /><Text as="span" textStyle="Body/Extra/Bold">Welcome, {name.split(" ")[0]}!</Text><Text as="span" tone="base">We sent a confirmation link to {email}.</Text><Button appearance="main" level="tertiary" size="sm" onClick={() => { setSubmitted(false); setPassword(""); setAgree(false); }}>Start over</Button></div>;
  }
  return (
    <form className="pe-form" onSubmit={(event) => { event.preventDefault(); if (valid) setSubmitted(true); }} noValidate>
      <InputField label="Full name" required placeholder="Ava Chen" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      <InputField
        label="Work email" required type="email" placeholder="you@company.com" value={email} autoComplete="email"
        onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmailTouched(true)}
        leading={<Icon name="icon-mail-01-line" decorative />}
        error={emailTouched && email && !emailValid ? "Enter a valid email address, like name@company.com" : undefined}
        helpText="We'll never share it."
      />
      <Stack gap="xs" align="stretch">
        <InputField label="Password" required type="password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        <InputConditions>{rules.map((rule) => <InputConditionItem key={rule.label} label={rule.label} state={password ? (rule.ok ? "success" : "wrong") : "default"} />)}</InputConditions>
      </Stack>
      <Checkbox checked={agree} onChange={setAgree} label="I agree to the Terms of Service" />
      <Button appearance="main" level="primary" size="md" type="submit" disabled={!valid}>Create account</Button>
    </form>
  );
}

function WorkspaceSettingsExample() {
  const [seats, setSeats] = useState(5);
  const [bio, setBio] = useState("");
  const limit = 120;
  return (
    <div className="pe-form">
      <SelectField label="Region" defaultValue="sg" options={[{ value: "sg", label: "Singapore (ap-southeast-1)" }, { value: "tokyo", label: "Tokyo (ap-northeast-1)" }, { value: "frankfurt", label: "Frankfurt (eu-central-1)" }]} helpText="Data is stored in this region." />
      <NumberField label="Seats" align="center" min={1} max={50} value={seats} onValueChange={(next) => setSeats(next ?? 1)} helpText={`$${seats * 12}/month · $12 per seat`} />
      <DateField label="Billing starts" helpText="The first invoice goes out on this date." />
      <TextAreaField label="Workspace description" placeholder="What does this team work on?" value={bio} maxLength={limit} onChange={(event) => setBio(event.target.value)} helpText={`${bio.length}/${limit}`} />
    </div>
  );
}

/* ───────────── Search ───────────── */

const componentIndex = ["Avatar", "Badge", "Button", "Checkbox", "Chip", "Date Picker", "Input", "Popover", "Radio Button", "Search", "Segmented", "Sidebar", "Tag", "Toggle"];

function SearchResultsExample() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(["Button", "Popover"]);
  const results = componentIndex.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (item: string) => { setRecent((items) => [item, ...items.filter((entry) => entry !== item)].slice(0, 3)); setQuery(""); };
  return (
    <div className="pe-stack pe-narrow">
      <Search placeholder="Search components" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) open(results[0]); }} />
      {/* Results and recents are a DS List (ListItem rows keep the list inset), not ad-hoc buttons. */}
      <Stack gap="xs" align="stretch" aria-live="polite">
        {query ? (
          results.length ? (
            <List aria-label="Results">
              {results.map((item) => <ListItem key={item} title={highlight(item, query)} leading={<Icon name="icon-cube-line" size="sm" decorative />} onClick={() => open(item)} />)}
            </List>
          ) : <EmptyState title={`No components match “${query}”`} illustration={false} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try “button” or “input”.</EmptyState>
        ) : (
          <>
            <Text as="span" textStyle="Caption/Medium" tone="light">Recent</Text>
            <List aria-label="Recent">
              {recent.map((item) => <ListItem key={item} title={item} leading={<Icon name="icon-clock-line" size="sm" decorative />} onClick={() => open(item)} />)}
            </List>
          </>
        )}
      </Stack>
    </div>
  );
}
function highlight(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0 || !query.trim()) return text;
  const end = index + query.trim().length;
  return <>{text.slice(0, index)}<mark className="pe-mark">{text.slice(index, end)}</mark>{text.slice(end)}</>;
}

function SearchTableToolbarExample() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rows = tasks.filter((task) => (!status || task.status === status) && task.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Chip variant="advanced" size="small" dropdown select={Boolean(status)} popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Status"
          popoverItems={Object.entries(statusLabels).map(([id, label]) => ({ id, label, selected: status === id }))}
          onPopoverSelect={(item) => setStatus(item.id === status ? null : item.id)} onClearSelection={status ? () => setStatus(null) : undefined}>
          {status ? statusLabels[status] : "Status"}
        </Chip>
        <div className="pe-search-sm"><Search size="small" placeholder="Filter tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      </Stack>
      <List aria-label="Tasks">
        {rows.map((task) => <ListItem key={task.id} title={task.title} trailing={<Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>} />)}
        {rows.length === 0 ? <li className="pe-empty"><Text as="span" tone="light">Nothing here. Try another filter.</Text></li> : null}
      </List>
    </Stack>
  );
}

/* ───────────── Segmented ───────────── */

function SegmentedViewSwitcherExample() {
  const [view, setView] = useState("grid");
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" textStyle="Body/Base/Medium">Team</Text>
        <Segmented level="secondary" size="small" aria-label="Layout" value={view} onChange={setView} options={[{ id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> }]} />
      </Stack>
      {view === "grid" ? (
        <div className="pe-people-grid">
          {people.map((person) => (
            <div key={person.id} className="pe-person-tile">
              <Avatar size="large" theme="photo" src={person.photo} alt="" />
              <div className="pe-person-meta"><Text as="span" textStyle="Body/Base/Medium">{person.name}</Text><Text as="span" textStyle="Caption/Regular" tone="light">{person.role}</Text></div>
            </div>
          ))}
        </div>
      ) : (
        <List aria-label="Team">
          {people.map((person) => <ListItem key={person.id} title={person.name} caption={person.role} leading={<Avatar size="medium" theme="photo" src={person.photo} alt="" />} />)}
        </List>
      )}
    </Stack>
  );
}

function SegmentedInboxExample() {
  const [tab, setTab] = useState("inbox");
  const [counts, setCounts] = useState({ inbox: 12, mentions: 3, archived: 0 });
  return (
    <Stack gap="sm" align="stretch">
      <Segmented level="secondary" aria-label="Mailbox" value={tab} onChange={setTab} options={[
        { id: "inbox", label: "Inbox", badge: counts.inbox || undefined },
        { id: "mentions", label: "Mentions", badge: counts.mentions || undefined },
        { id: "archived", label: "Archived", badge: counts.archived || undefined },
      ]} />
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" tone="base">{counts[tab as keyof typeof counts]} unread in {tab}</Text>
        <Button appearance="main" level="tertiary" size="sm" disabled={!counts[tab as keyof typeof counts]} onClick={() => setCounts((current) => ({ ...current, [tab]: 0 }))}>Mark all as read</Button>
      </Stack>
    </Stack>
  );
}

/* ───────────── Toggle ───────────── */

function ToggleSettingsExample() {
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState({ mentions: true, comments: true, digest: false });
  const set = (key: keyof typeof prefs) => (value: boolean) => setPrefs((current) => ({ ...current, [key]: value }));
  return (
    <div className="pe-settings">
      <Toggle theme="text-first" size="medium" bold label="Pause all notifications" caption={paused ? "You won't receive anything until you turn this off." : "Temporarily mute every channel."} selected={paused} onSelectedChange={setPaused} />
      <Divider decorative />
      <Toggle theme="text-first" label="Mentions" caption="When someone @mentions you" selected={prefs.mentions} onSelectedChange={set("mentions")} disabled={paused} />
      <Toggle theme="text-first" label="Comments" caption="Replies on files you follow" selected={prefs.comments} onSelectedChange={set("comments")} disabled={paused} />
      <Toggle theme="text-first" label="Weekly digest" caption="A summary every Monday" selected={prefs.digest} onSelectedChange={set("digest")} disabled={paused} />
    </div>
  );
}

/** Follows the platform's light/dark mode; the toggle switches the whole example card (header, stage, code and
 * every component in it) through the `data-theme` token mode until the platform mode changes again. */
function ToggleInlineExample() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const setCardTheme = useContext(ExampleCardThemeContext);
  const [platformDark, setPlatformDark] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    // The platform's mode lives above the card (the card itself carries the override).
    const host = scopeRef.current?.closest(".pe-card")?.parentElement?.closest<HTMLElement>("[data-theme='dark'], [data-theme='light']");
    if (!host) return undefined;
    const sync = () => { setPlatformDark(host.dataset.theme === "dark"); setOverride(null); };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(host, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const dark = override ?? platformDark;
  useEffect(() => { setCardTheme(override === null ? null : override ? "dark" : "light"); }, [override, setCardTheme]);
  useEffect(() => () => setCardTheme(null), [setCardTheme]);
  const setDark = (next: boolean) => setOverride(next === platformDark ? null : next);
  return (
    <div ref={scopeRef} className="pe-theme-scope">
      <Card theme="border" spacing="small">
        <Stack gap="sm" align="stretch">
          <Toggle theme="toggle-first" size="small" label="Dark preview" selected={dark} onSelectedChange={setDark} />
          <Text as="span" tone="base">Starts in the platform&apos;s mode; the toggle switches this whole example card through the <code>data-theme</code> token mode.</Text>
        </Stack>
      </Card>
    </div>
  );
}

/* ───────────── Avatar ───────────── */

function AvatarMembersExample() {
  return (
    <List aria-label="Members">
      {people.slice(0, 4).map((person, index) => (
        <ListItem key={person.id} title={person.name} caption={`${person.online ? "Online" : "Away"} · ${person.role}`}
          leading={index % 2 ? <Avatar size="medium" theme={person.theme} background="subtle" status={person.online} alt="">{person.initials}</Avatar> : <Avatar size="medium" theme="photo" src={person.photo} status={person.online} alt="" />}
          trailing={index === 0 ? <Badge size="small" theme="accent" background="subtle" leadingIcon={false}>Owner</Badge> : undefined} />
      ))}
    </List>
  );
}

function AvatarShareExample() {
  const [members, setMembers] = useState(people.slice(0, 3));
  const next = people.find((person) => !members.includes(person));
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <Stack direction="row" gap="xs" align="center" wrap>
        <AvatarStack size="small" items={members.map((person) => ({ alt: person.name, src: person.photo, theme: "photo" as AvatarTheme }))} />
        <Text as="span" tone="base">Shared with {members.length} {members.length === 1 ? "person" : "people"}</Text>
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap>
        {/* zen-allow-destructive: removing access is reversible (the person can be re-invited). */}
        {members.length > 1 ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setMembers(members.slice(0, -1))}>Remove</Button> : null}
        <Button appearance="main" level="primary" size="sm" disabled={!next} startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => next && setMembers([...members, next])}>{next ? `Invite ${next.name.split(" ")[0]}` : "Everyone invited"}</Button>
      </Stack>
    </Stack>
  );
}

/* ───────────── Checkbox ───────────── */

function CheckboxSelectAllExample() {
  const files = ["tokens.css", "style-effects.css", "icons.svg", "typography.generated.ts"];
  const [picked, setPicked] = useState<string[]>(["tokens.css"]);
  const all = picked.length === files.length;
  const some = picked.length > 0 && !all;
  return (
    <Stack gap="sm" align="stretch">
      <Checkbox bold label="Include all build files" caption={`${picked.length} of ${files.length} selected`} checked={all || some} indeterminate={some} onChange={() => setPicked(all ? [] : files)} />
      <div className="pe-indent">
        {files.map((file) => <Checkbox key={file} label={file} checked={picked.includes(file)} onChange={(on) => setPicked(on ? [...picked, file] : picked.filter((item) => item !== file))} />)}
      </div>
      <div className="pe-actions"><Button appearance="main" level="primary" size="sm" disabled={!picked.length}>Export {picked.length || ""} file{picked.length === 1 ? "" : "s"}</Button></div>
    </Stack>
  );
}

function CheckboxConsentExample() {
  const [consent, setConsent] = useState({ terms: false, marketing: false });
  return (
    <Stack gap="sm" align="stretch">
      <Checkbox label="I accept the Terms of Service and Privacy Policy" checked={consent.terms} onChange={(on) => setConsent({ ...consent, terms: on })} />
      <Checkbox label="Send me product news" caption="Optional · about once a month" checked={consent.marketing} onChange={(on) => setConsent({ ...consent, marketing: on })} />
      <Checkbox label="Enable legacy API" caption="Unavailable on the Free plan" disabled />
      <div className="pe-actions"><Button appearance="main" level="primary" size="sm" disabled={!consent.terms}>Continue</Button></div>
    </Stack>
  );
}

/* ───────────── Radio Button ───────────── */

function RadioPlanExample() {
  const plans = [
    { id: "free", label: "Free", caption: "1 editor · community support", price: 0 },
    { id: "pro", label: "Pro", caption: "Unlimited editors · version history", price: 12 },
    { id: "team", label: "Team", caption: "SSO · audit log · priority support", price: 24 },
  ];
  const [plan, setPlan] = useState("pro");
  const current = plans.find((item) => item.id === plan)!;
  return (
    <Stack gap="sm" align="stretch">
      <div className="pe-radio-cards" role="radiogroup" aria-label="Plan">
        {plans.map((item) => (
          <Card key={item.id} theme="border" spacing="small" active={plan === item.id} className="pe-choice-card">
            <RadioButton name="pe-plan" value={item.id} checked={plan === item.id} onChange={() => setPlan(item.id)} bold label={`${item.label} · $${item.price}/mo`} caption={item.caption} />
          </Card>
        ))}
      </div>
      <Stack direction="row" gap="xs" align="center" justify="between" wrap><Text as="span" tone="base">Total: ${current.price}/month</Text><Button appearance="main" level="primary" size="sm">{current.price ? `Upgrade to ${current.label}` : "Stay on Free"}</Button></Stack>
    </Stack>
  );
}

function RadioSettingsExample() {
  const [density, setDensity] = useState("compact");
  return (
    <div className="pe-settings" role="radiogroup" aria-label="Density">
      <Text as="span" textStyle="Body/Base/Bold">Interface density</Text>
      {[{ id: "compact", label: "Compact", caption: "More rows on screen" }, { id: "comfortable", label: "Comfortable", caption: "Larger hit targets" }, { id: "spacious", label: "Spacious", caption: "Coming soon" }].map((item) => (
        <RadioButton key={item.id} name="pe-density" radioSide="right" value={item.id} checked={density === item.id} onChange={() => setDensity(item.id)} label={item.label} caption={item.caption} disabled={item.id === "spacious"} />
      ))}
    </div>
  );
}

/* ───────────── Badge ───────────── */

function BadgeStatusExample() {
  const deployments: Array<{ id: string; env: string; status: string; theme: BadgeTheme; icon: Parameters<typeof Icon>[0]["name"] }> = [
    { id: "a1", env: "Production", status: "Live", theme: "green", icon: "icon-check-line" },
    { id: "b2", env: "Staging", status: "Building", theme: "blue", icon: "icon-refresh-cw-01-line" },
    { id: "c3", env: "Preview #42", status: "Needs review", theme: "yellow", icon: "icon-alert-triangle-line" },
    { id: "d4", env: "Preview #41", status: "Failed", theme: "red", icon: "icon-x-small-line" },
  ];
  return (
    <List aria-label="Deployments">
      {deployments.map((item) => (
        <ListItem key={item.id} title={item.env} trailing={<Badge size="small" theme={item.theme} background="subtle" leading={<Icon name={item.icon} decorative />}>{item.status}</Badge>} />
      ))}
    </List>
  );
}

function BadgeRemovableExample() {
  const initial = ["Design", "Q4", "Mobile", "Urgent"];
  const [labels, setLabels] = useState(initial);
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap>
        {labels.map((label) => <Badge key={label} size="medium" theme={label === "Urgent" ? "red" : "neutral"} background="subtle" leadingIcon={false} remove onRemove={() => setLabels(labels.filter((item) => item !== label))}>{label}</Badge>)}
        {labels.length === 0 ? <Text as="span" tone="light">No labels</Text> : null}
      </Stack>
      <div><Button appearance="main" level="tertiary" size="sm" disabled={labels.length === initial.length} onClick={() => setLabels(initial)}>Reset labels</Button></div>
    </Stack>
  );
}

function BadgeCounterNavExample() {
  const [unread, setUnread] = useState({ inbox: 8, reviews: 2, alerts: 124 });
  const items: Array<{ id: keyof typeof unread; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
    { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" },
    { id: "reviews", label: "Reviews", icon: "icon-eye-line" },
    { id: "alerts", label: "Alerts", icon: "icon-bell-01-line" },
  ];
  return (
    <div className="pe-stack pe-narrow">
      <List aria-label="Channels">
        {items.map((item) => (
          <ListItem key={item.id} title={item.label} onClick={() => setUnread({ ...unread, [item.id]: 0 })}
            leading={<DockIcon icon={item.icon} theme="pale" size="small" />}
            trailing={unread[item.id] ? <BadgeCounter size="small" theme={item.id === "alerts" ? "red" : "neutral"} value={unread[item.id] > 99 ? "99+" : unread[item.id]} /> : undefined} />
        ))}
      </List>
      <Text as="span" textStyle="Caption/Regular" tone="light">Click a row to mark it as read.</Text>
    </div>
  );
}

/* ───────────── Popover ───────────── */

function PopoverSortExample() {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("updated");
  const options: PopoverItemData[] = [
    { id: "updated", label: "Last updated", leading: <Icon name="icon-clock-line" decorative /> },
    { id: "name", label: "Name (A–Z)", leading: <Icon name="icon-type-01-line" decorative /> },
    { id: "status", label: "Status", leading: <Icon name="icon-check-circle-line" decorative /> },
  ];
  const order = { todo: 0, "in-progress": 1, done: 2 } as Record<string, number>;
  const rows = [...tasks].sort((a, b) => sort === "name" ? a.title.localeCompare(b.title) : sort === "status" ? order[a.status] - order[b.status] : b.id - a.id);
  const current = options.find((item) => item.id === sort)!;
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap>
        {/* Sort is a filter-type choice: Chip (Advanced) owns the trigger and its Popover. */}
        <Chip variant="advanced" size="small" dropdown leading={<Icon name="icon-switch-vertical-01-line" decorative />} popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Sort by"
          popoverItems={options.map((item) => ({ ...item, selected: item.id === sort }))} onPopoverSelect={(item) => setSort(item.id)}>
          {`Sort: ${String(current.label)}`}
        </Chip>
      </Stack>
      <List aria-label="Tasks">{rows.slice(0, 4).map((task) => <ListItem key={task.id} title={task.title} trailing={<Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>} />)}</List>
    </Stack>
  );
}

function PopoverAssignExample() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assigned, setAssigned] = useState<string[]>(["ava"]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const items: PopoverItemData[] = people
    .filter((person) => person.name.toLowerCase().includes(query.toLowerCase()))
    .map((person) => ({ id: person.id, label: person.name, caption: person.role, theme: "avatar-small", selected: assigned.includes(person.id), photoSrc: person.photo }));
  return (
    <div className="pe-anchor">
      <Stack direction="row" gap="xs" align="center" wrap ref={anchorRef}>
        {assigned.length ? <AvatarStack size="xsmall" items={assigned.map((id) => people.find((person) => person.id === id)!).map((person) => ({ alt: person.name, src: person.photo, theme: "photo" as AvatarTheme }))} /> : <Text as="span" tone="light">Unassigned</Text>}
        <Button appearance="main" level="tertiary" size="sm" aria-expanded={open} startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => setOpen(!open)}>Assign</Button>
      </Stack>
      <Popover
        className="pe-anchor__popover" open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} anchorRef={anchorRef} autoFocus
        label="Assignees" multiple search searchPlaceholder="Search people" searchValue={query} onSearchChange={setQuery} emptyState="No one found"
        items={items} onSelect={(item) => setAssigned(assigned.includes(item.id) ? assigned.filter((id) => id !== item.id) : [...assigned, item.id])}
      />
    </div>
  );
}


function PopoverCreateLabelExample() {
  const [labels, setLabels] = useState([{ id: "design", label: "Design" }, { id: "bug", label: "Bug" }, { id: "research", label: "Research" }]);
  const [picked, setPicked] = useState<string[]>(["design"]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toggle = (id: string) => setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" size="small" dropdown select={picked.length > 0} selectionMode="multiple" selectionCount={picked.length} onClearSelection={() => setPicked([])}
          popoverOpen={open} onPopoverOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} popoverMultiple popoverLabel="Select a label or create one" popoverSearchPlaceholder="Find or create a label"
          popoverSearchValue={query} onPopoverSearchChange={setQuery} popoverCreateLabel="Create"
          popoverItems={labels.map((label) => ({ ...label, selected: picked.includes(label.id) }))} onPopoverSelect={(item) => toggle(item.id)}
          onPopoverCreate={(value) => { const id = value.toLowerCase().replace(/\s+/g, "-"); setLabels((current) => [...current, { id, label: value }]); setPicked((current) => [...current, id]); setQuery(""); }}>
          {picked.length === 1 ? labels.find((label) => label.id === picked[0])?.label : "Labels"}
        </Chip>
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap>{picked.map((id) => <Badge key={id} size="small" theme="neutral" background="subtle" leadingIcon={false}>{labels.find((label) => label.id === id)?.label}</Badge>)}{picked.length === 0 ? <Text as="span" tone="light">No labels</Text> : null}</Stack>
      <Text as="span" textStyle="Caption/Regular" tone="light">Type a label that doesn't exist (e.g. “Urgent”) and press Enter or pick “Create”.</Text>
    </Stack>
  );
}

function TagCreateExample() {
  const [options, setOptions] = useState([{ id: "react", label: "react" }, { id: "tokens", label: "tokens" }, { id: "figma", label: "figma" }, { id: "a11y", label: "a11y" }]);
  const [value, setValue] = useState<string[]>(["react"]);
  return (
    <div className="pe-narrow">
      <AutocompleteField label="Keywords" addLabel="Add keyword" popoverLabel="Select a keyword or create one" searchPlaceholder="Find or create" createLabel="Create"
        options={options} value={value} onChange={setValue} helpText={`${value.length} keyword${value.length === 1 ? "" : "s"}`}
        onCreate={(label) => { const id = label.toLowerCase(); setOptions((current) => [...current, { id, label: id }]); return id; }} />
    </div>
  );
}

/* ───────────── Sidebar ───────────── */

type ShellIconName = Parameters<typeof Icon>[0]["name"];
const shellIcon = (name: ShellIconName) => <Icon name={name} size="base" />;
/** Trailing chevron on items that open the Side-Bar/Sub flyout. */
const flyoutChevron = <Icon name="icon-chevron-right-01-line" size="base" decorative />;
const shellProjects = [
  { id: "web", name: "Website redesign", icon: "icon-globe-02-line" as ShellIconName, pinned: true, team: ["ava", "bao", "chi"], updated: "2h ago" },
  { id: "app", name: "Mobile app", icon: "icon-layout-grid-01-line" as ShellIconName, pinned: true, team: ["bao", "em"], updated: "Yesterday" },
  { id: "ds", name: "Design system", icon: "icon-cube-line" as ShellIconName, pinned: false, team: ["ava", "chi", "duy", "em"], updated: "3d ago" },
  { id: "brand", name: "Brand refresh", icon: "icon-palette-line" as ShellIconName, pinned: false, team: ["chi", "duy"], updated: "1w ago" },
  { id: "help", name: "Help center", icon: "icon-book-open-line" as ShellIconName, pinned: false, team: ["duy", "em"], updated: "2w ago" },
  { id: "api", name: "Public API", icon: "icon-code-02-line" as ShellIconName, pinned: false, team: ["bao", "ava"], updated: "1mo ago" },
];
const shellTeams = [
  { id: "design", name: "Design", icon: "icon-palette-line" as ShellIconName, members: ["ava", "chi"], about: "Product design, the design system and brand.", ritual: "Wed 15:00" },
  { id: "eng", name: "Engineering", icon: "icon-code-02-line" as ShellIconName, members: ["bao", "em"], about: "Web app, component library and the release train.", ritual: "Mon 10:00" },
  { id: "product", name: "Product", icon: "icon-target-04-line" as ShellIconName, members: ["duy", "ava"], about: "Roadmap, research and launches.", ritual: "Thu 11:00" },
];
const matches = (query: string, label: string) => label.toLowerCase().includes(query.trim().toLowerCase());

/** Right-hand page of the sidebar examples: header (eyebrow, title, description, actions) + body. */
function ShellPage({ eyebrow, crumbs, title, description, actions, children }: { eyebrow: string; crumbs?: string[]; title: string; description: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="pe-shell__main" aria-live="polite">
      <header className="pe-shell__head">
        <div className="pe-shell__titles">
          {/* A document path replaces the eyebrow with Breadcrumbs (the last crumb is this page). */}
          {crumbs ? <Breadcrumbs items={crumbs.map((label, index) => ({ id: `${index}`, label, href: "#" }))} onNavigate={(_, event) => event.preventDefault()} /> : <Text as="span" textStyle="Body/Small/Medium" tone="light">{eyebrow}</Text>}
          <Heading level={4} textStyle="Heading/3">{title}</Heading>
          <Text as="span" tone="base">{description}</Text>
        </div>
        {actions ? <Stack direction="row" gap="xs" align="center" wrap>{actions}</Stack> : null}
      </header>
      {children}
    </section>
  );
}

function ShellStats({ stats }: { stats: Array<{ label: string; value: string; hint?: string; theme?: BadgeTheme }> }) {
  return (
    <div className="pe-shell__stats">
      {stats.map((stat) => (
        <div key={stat.label} className="pe-shell__stat">
          <Text as="span" textStyle="Body/Small/Medium" tone="light">{stat.label}</Text>
          <Text as="span" textStyle="Heading/3">{stat.value}</Text>
          {stat.hint ? <Badge size="small" theme={stat.theme ?? "neutral"} background="subtle" leadingIcon={false}>{stat.hint}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

const statusOrder: Record<string, number> = { todo: 0, "in-progress": 1, done: 2 };
const sortRows = <T,>(rows: T[], sort: TableSort | null, key: (row: T, columnId: string) => string | number) => !sort ? rows
  : [...rows].sort((a, b) => { const x = key(a, sort.columnId), y = key(b, sort.columnId); return (x < y ? -1 : x > y ? 1 : 0) * (sort.direction === "asc" ? 1 : -1); });

/** Task list of the sidebar app shells: a Table (Task · Owner · Status), sortable by task and status. */
function ShellTasks({ title, owners }: { title: string; owners?: string[] }) {
  const [sort, setSort] = useState<TableSort | null>(null);
  const rows = sortRows(tasks.filter((task) => !owners || owners.includes(task.owner)), sort,
    (task, column) => column === "status" ? statusOrder[task.status] : column === "owner" ? people.find((person) => person.id === task.owner)!.name : task.title);
  return (
    <Stack gap="sm" align="stretch">
      <Heading level={5} textStyle="Heading/4">{title}</Heading>
      <Table aria-label={title} rows={rows} getRowId={(task) => String(task.id)} sort={sort} onSortChange={setSort}
        columns={[
          { id: "title", header: "Task", sortable: true, cell: (task) => <TableText bold>{task.title}</TableText> },
          { id: "owner", header: "Owner", width: "36%", sortable: true, cell: (task) => { const owner = people.find((person) => person.id === task.owner)!; return <TableMedia media={<Avatar size="xsmall" theme="photo" src={owner.photo} alt="" />} bold={false}>{owner.name}</TableMedia>; } },
          { id: "status", header: "Status", width: "24%", sortable: true, cell: (task) => <Badge size="medium" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge> },
        ]} />
    </Stack>
  );
}

/** Workspace "Projects" page: one row per project with its team and open work. */
function ShellProjectsTable() {
  const [sort, setSort] = useState<TableSort | null>(null);
  const open = (project: (typeof shellProjects)[number]) => tasks.filter((task) => project.team.includes(task.owner) && task.status !== "done").length;
  const rows = sortRows(shellProjects, sort, (project, column) => column === "open" ? open(project) : project.name);
  return (
    <Table aria-label="Projects" rows={rows} getRowId={(project) => project.id} sort={sort} onSortChange={setSort}
      columns={[
        // Narrow app-shell column: "Updated · Pinned" rides in the caption instead of its own column.
        { id: "name", header: "Project", sortable: true, cell: (project) => <TableMedia media={<Icon name={project.icon} size="lg" decorative />} caption={`Updated ${project.updated}${project.pinned ? " · Pinned" : ""}`}>{project.name}</TableMedia> },
        { id: "team", header: "Team", width: "96px", cell: (project) => <AvatarStack size="small" items={project.team.map((id) => people.find((person) => person.id === id)!).map((person) => ({ alt: person.name, src: person.photo, theme: "photo" as AvatarTheme }))} /> },
        { id: "open", header: "Open", align: "right", width: "80px", sortable: true, cell: (project) => <TableText>{open(project)}</TableText> },
      ]} />
  );
}

/* Realistic page bodies shared by the sidebar app shells: an inbox, today's agenda and a document. */
const person = (id: string) => people.find((p) => p.id === id)!;
const personAvatar = (id: string, size: "xsmall" | "medium" = "medium") => <Avatar size={size} theme="photo" src={person(id).photo} alt="" />;
const teamStack = (ids: readonly string[]) => <AvatarStack size="xsmall" items={ids.map((id) => ({ theme: "photo" as AvatarTheme, src: person(id).photo, alt: person(id).name }))} />;
const shellInbox = [
  { id: "m1", from: "ava", subject: "Checkbox hover spec", preview: "Pushed the new hover states. Can you check the focus ring on dark before I hand off?", time: "9:41", unread: true },
  { id: "m2", from: "bao", subject: "Date Picker range is live", preview: "Range selection shipped to staging; release notes are in #releases.", time: "9:12", unread: true },
  { id: "m3", from: "duy", subject: "Q4 roadmap review moved", preview: "Now Thursday 14:00 in Kyoto. Agenda and pre-read are linked in the doc.", time: "Yesterday", unread: true },
  { id: "m4", from: "em", subject: "Regression run · build 1.8.2", preview: "214 checks passed, 2 flaky tests quarantined. Report attached.", time: "Yesterday", unread: true },
  { id: "m5", from: "chi", subject: "Tag guidelines draft", preview: "First pass is ready. Two open questions about truncation in narrow tables.", time: "Mon" },
  { id: "m6", from: "ava", subject: "Icon library audit", preview: "Found 38 near-duplicates. Proposal to merge them is in the Design teamspace.", time: "Mon" },
];
const shellAgenda = [
  { id: "a1", time: "09:30 – 10:00", title: "Design standup", where: "Google Meet", team: ["ava", "chi", "em"] },
  { id: "a2", time: "11:00 – 12:00", title: "Q4 roadmap review", where: "Room Kyoto", team: ["duy", "ava", "bao"] },
  { id: "a3", time: "14:00 – 14:30", title: "1:1 · Bao", where: "Zoom", team: ["bao"] },
  { id: "a4", time: "16:00 – 17:00", title: "Component office hours", where: "Room Hanoi", team: ["chi", "em", "ava", "bao"] },
];
type ShellDocData = { title: string; path: string[]; owner: string; updated: string; summary: string; sections: Array<[string, string]>; pages?: Array<[string, string]>; team?: string[] };
const shellDocs: Record<string, ShellDocData> = {
  handbook: { title: "Handbook", path: ["Docs"], owner: "duy", updated: "2h ago", team: ["duy", "ava", "bao"], summary: "How Zen Studio works: principles, tools and the rituals that keep six time zones in sync.",
    sections: [["Principles", "Write things down. Default to async. Ship small, reversible changes and review them within one working day."], ["Tools", "Figma for design, Linear for work, GitHub for code, this wiki for decisions. Anything else is optional."], ["Working hours", "Core overlap is 14:00–17:00 ICT. Block focus time on your calendar; nobody books over it."]],
    pages: [["Onboarding checklist", "Updated 3d ago"], ["Expense policy", "Updated 2w ago"], ["Security basics", "Updated 1mo ago"]] },
  rituals: { title: "Team rituals", path: ["Docs"], owner: "chi", updated: "Yesterday", team: ["chi", "ava", "em"], summary: "The recurring meetings we keep, what each is for, and what to bring.",
    sections: [["Weekly planning", "Monday 10:00. Each team brings its top three outcomes; anything else goes to the backlog."], ["Design critique", "Wednesday 15:00. Post work in #critique by noon; feedback is about the problem, not the pixels."], ["Demo Friday", "Friday 16:30. Five minutes per team, recorded for the other time zones."]],
    pages: [["Critique template", "Updated 1w ago"], ["Demo sign-up sheet", "Updated today"]] },
  onboarding: { title: "Onboarding", path: ["Docs"], owner: "ava", updated: "3d ago", team: ["ava", "em"], summary: "Everything a new teammate needs in the first two weeks.",
    sections: [["Day one", "Laptop, accounts and a buddy. Your buddy books a 30-minute tour of the design system and the codebase."], ["Week one", "Ship one small fix end-to-end: a copy change, a token rename or a docs typo counts."], ["Week two", "Join critique and Demo Friday; pick your first real project with your lead."]],
    pages: [["Accounts to request", "Updated 3d ago"], ["Buddy guide", "Updated 1w ago"]] },
};

function ShellInbox({ items = shellInbox }: { items?: typeof shellInbox }) {
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Stack gap="sm" align="stretch">
      <Heading level={5} textStyle="Heading/4">Messages</Heading>
      <Card theme="border" spacing="small" className="pe-list-card">
        <List aria-label="Messages">
          {items.map((message) => {
            const unread = message.unread && !read.includes(message.id);
            return (
              <ListItem key={message.id} selected={open === message.id} onClick={() => { setOpen(message.id); setRead((r) => [...r, message.id]); }}
                leading={personAvatar(message.from)} title={`${person(message.from).name} · ${message.subject}`} caption={message.preview}
                trailing={<span className="pe-inbox-meta"><Text as="span" textStyle="Body/Small/Regular" tone="light">{message.time}</Text>{unread ? <Badge size="small" theme="blue" background="subtle" leadingIcon={false}>New</Badge> : null}</span>} />
            );
          })}
        </List>
      </Card>
    </Stack>
  );
}

function ShellAgenda() {
  return (
    <Stack gap="sm" align="stretch">
      <Heading level={5} textStyle="Heading/4">Today</Heading>
      <Card theme="border" spacing="small" className="pe-list-card">
        <List aria-label="Today's meetings">
          {shellAgenda.map((event) => (
            <ListItem key={event.id} onClick={() => undefined} leading={<DockIcon icon="icon-calendar-line" theme="pale" size="small" />}
              title={event.title} caption={`${event.time} · ${event.where}`} trailing={teamStack(event.team)} />
          ))}
        </List>
      </Card>
    </Stack>
  );
}

function ShellDoc({ doc, root }: { doc: ShellDocData; root?: string }) {
  const [sub, setSub] = useState<string | null>(null);
  const trail = [...(root ? [root] : []), ...doc.path, doc.title];
  return (
    <ShellPage eyebrow={trail.slice(0, -1).join(" / ")} crumbs={trail} title={doc.title} description={doc.summary}
      actions={<>{doc.team ? teamStack(doc.team) : null}<Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-link-01-line" decorative />}>Copy link</Button><Button appearance="main" level="primary" size="sm">Share</Button></>}>
      <Stack direction="row" gap="xs" align="center" wrap>{personAvatar(doc.owner, "xsmall")}<Text as="span" textStyle="Body/Small/Regular" tone="light">{`${person(doc.owner).name} · edited ${doc.updated}`}</Text></Stack>
      {doc.sections.map(([heading, body]) => (
        <Stack gap="sm" align="stretch" key={heading}>
          <Heading level={5} textStyle="Heading/4">{heading}</Heading>
          <Text as="p" tone="base">{body}</Text>
        </Stack>
      ))}
      {doc.pages?.length ? (
        <Stack gap="sm" align="stretch">
          <Heading level={5} textStyle="Heading/4">In this page</Heading>
          <Card theme="border" spacing="small" className="pe-list-card">
            <List aria-label={`Pages in ${doc.title}`}>
              {doc.pages.map(([title, caption]) => <ListItem key={title} selected={sub === title} onClick={() => setSub(title)} title={title} caption={caption} leading={<DockIcon icon="icon-file-doc-line" theme="pale" size="small" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />)}
            </List>
          </Card>
        </Stack>
      ) : null}
    </ShellPage>
  );
}

/** Basic sidebar: "Projects" opens the Side-Bar/Sub flyout (Search/Popover + Pinned/All sections). */
function SidebarProjectsFlyoutExample() {
  const [page, setPage] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [flyout, setFlyout] = useState(false);
  const [query, setQuery] = useState("");
  // "New team" (the Teams section action) creates a team with you in it and opens its page.
  const [createdTeams, setCreatedTeams] = useState<typeof shellTeams>([]);
  // Newest first, right under the section label, so the new team is in view without scrolling the nav.
  const teams = [...[...createdTeams].reverse(), ...shellTeams];
  const addTeam = () => {
    const id = `new-${createdTeams.length + 1}`;
    setCreatedTeams((list) => [...list, { id, name: list.length ? `New team ${list.length + 1}` : "New team", icon: "icon-users-line", members: ["ava"], about: "A new team. Invite people to share its tasks and rituals.", ritual: "Not set" }]);
    setPage(`t-${id}`); setFlyout(false);
  };
  const project = shellProjects.find((item) => `p-${item.id}` === page);
  const projectItem = (item: (typeof shellProjects)[number]) => ({ id: `p-${item.id}`, label: item.name, icon: shellIcon(item.icon), counter: tasks.filter((task) => item.team.includes(task.owner) && task.status !== "done").length, selected: page === `p-${item.id}` });
  const visible = shellProjects.filter((item) => matches(query, item.name));
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: shellIcon("icon-home-03-line"), selected: page === "home" },
      { id: "inbox", label: "Inbox", icon: shellIcon("ic-inbox-01-line"), counter: 4, selected: page === "inbox" },
      { id: "tasks", label: "My tasks", icon: shellIcon("icon-check-circle-line"), notificationDot: true, selected: page === "tasks" },
      { id: "calendar", label: "Calendar", icon: shellIcon("icon-calendar-line"), selected: page === "calendar" },
    ] },
    { label: "Workspace", items: [
      { id: "projects", label: "Projects", icon: shellIcon("icon-folder-line"), trailingAction: flyoutChevron, selected: flyout || Boolean(project) },
      { id: "docs", label: "Docs", icon: shellIcon("icon-file-doc-line"), selected: page.startsWith("docs-"), children: [
        { id: "docs-handbook", label: "Handbook", selected: page === "docs-handbook" },
        { id: "docs-rituals", label: "Team rituals", selected: page === "docs-rituals" },
        { id: "docs-onboarding", label: "Onboarding", selected: page === "docs-onboarding" },
      ] },
      { id: "reports", label: "Reports", icon: shellIcon("icon-bar-chart-01-line"), selected: page === "reports" },
    ] },
    { label: "Teams", action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New team" icon={<Icon name="icon-plus-line" />} onClick={addTeam} />, items: teams.map((team) => ({ id: `t-${team.id}`, label: team.name, icon: shellIcon(team.icon), counter: tasks.filter((task) => team.members.includes(task.owner) && task.status !== "done").length, selected: page === `t-${team.id}` })) },
  ];
  const team = teams.find((item) => `t-${item.id}` === page);
  const doc = shellDocs[page.replace(/^docs-/, "")];
  return (
    <div className="pe-shell pe-shell--tall" data-canvas="default">
      <Sidebar variant="basic" background="default" {...figmaSidebarBrand} collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections}
        onItemClick={(item) => {
          if (item.id === "projects") { setFlyout((open) => !open); return; }
          if (item.children) return;
          setPage(item.id); setFlyout(false);
        }}
        footer={<><button type="button"><Icon name="icon-settings-01-line" size="base" /><span>Settings</span></button><button type="button"><Icon name="icon-help-circle-line" size="base" /><span>Help</span></button></>}
        subMenuLabel="Projects"
        onSubMenuClose={() => setFlyout(false)}
        subMenu={flyout ? (
          <SidebarSubMenu
            search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />}
            sections={[
              ...(visible.some((item) => item.pinned) ? [{ label: "Pinned", items: visible.filter((item) => item.pinned).map(projectItem) }] : []),
              ...(visible.some((item) => !item.pinned) ? [{ label: "All projects", items: visible.filter((item) => !item.pinned).map(projectItem) }] : []),
            ]}
            onItemClick={(item) => { setPage(item.id); setFlyout(false); }}
          >
            {visible.length ? null : <Text as="span" tone="light">No project matches “{query}”.</Text>}
            <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />}>New project</Button>
          </SidebarSubMenu>
        ) : undefined}
      />
      {project ? (
        <ShellPage eyebrow="Projects" title={project.name} description={`Updated ${project.updated} · ${plural(project.team.length, "member")}`}
          actions={<><AvatarStack size="xsmall" items={project.team.map((id) => { const person = people.find((p) => p.id === id)!; return { theme: "photo" as AvatarTheme, src: person.photo, alt: person.name }; })} /><Button appearance="main" level="primary" size="sm">Share</Button></>}>
          <ShellStats stats={[
            { label: "Open tasks", value: String(tasks.filter((task) => project.team.includes(task.owner) && task.status !== "done").length), hint: "This sprint" },
            { label: "Completed", value: String(tasks.filter((task) => project.team.includes(task.owner) && task.status === "done").length), hint: "+2 this week", theme: "green" },
            { label: "Members", value: String(project.team.length), hint: project.pinned ? "Pinned" : "Workspace" },
          ]} />
          <ShellTasks title="Tasks" owners={project.team} />
        </ShellPage>
      ) : doc && page.startsWith("docs-") ? <ShellDoc key={page} doc={doc} root="Zen Studio" />
      : team ? (
        <ShellPage eyebrow="Zen Studio · Teams" title={team.name} description={team.about}
          actions={<>{teamStack(team.members)}<Button appearance="main" level="tertiary" size="sm">Invite</Button></>}>
          <ShellStats stats={[{ label: "Members", value: String(team.members.length), hint: `${team.members.filter((id) => person(id).online).length} online`, theme: "green" }, { label: "Open tasks", value: String(tasks.filter((task) => team.members.includes(task.owner) && task.status !== "done").length), hint: "This sprint" }, { label: "Next ritual", value: team.ritual }]} />
          <ShellTasks title="Team tasks" owners={team.members} />
        </ShellPage>
      ) : page === "inbox" ? <ShellPage eyebrow="Zen Studio" title="Inbox" description="Mentions, reviews and updates from your projects."><ShellInbox /></ShellPage>
      : page === "calendar" ? <ShellPage eyebrow="Zen Studio" title="Calendar" description="Thursday, 27 September · 4 meetings, 2h of focus time left."><ShellAgenda /></ShellPage>
      : page === "reports" ? (
        <ShellPage eyebrow="Zen Studio" title="Reports" description="Sprint 42 · 16–27 September">
          <ShellStats stats={[{ label: "Velocity", value: "42 pts", hint: "+8% vs last sprint", theme: "green" }, { label: "Cycle time", value: "2.4 days", hint: "−0.6 days", theme: "green" }, { label: "Bugs opened", value: "7", hint: "3 critical", theme: "orange" }]} />
          <ShellProjectsTable />
        </ShellPage>
      ) : (
        <ShellPage eyebrow="Zen Studio" title={page === "tasks" ? "My tasks" : "Good morning, Ava"} description={page === "tasks" ? "Everything assigned to you, across projects." : "3 tasks due this week, 4 unread messages and your 11:00 roadmap review."}
          actions={<Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />}>New task</Button>}>
          <ShellStats stats={[
            { label: "Projects", value: String(shellProjects.length), hint: "2 pinned" },
            { label: "Open tasks", value: String(tasks.filter((task) => task.status !== "done").length), hint: "3 due soon", theme: "orange" },
            { label: "Done this week", value: String(tasks.filter((task) => task.status === "done").length), hint: "+40%", theme: "green" },
          ]} />
          <ShellTasks title={page === "tasks" ? "Assigned to me" : "Recent activity"} owners={page === "tasks" ? ["ava", "bao"] : undefined} />
        </ShellPage>
      )}
    </div>
  );
}

/** Workspace billing page: plan summary + invoice history. */
function ShellInvoices({ workspace }: { workspace: string }) {
  const invoices = [{ id: "INV-2409", date: "Sep 1, 2026", amount: "$240.00", seats: 12, status: "paid" }, { id: "INV-2408", date: "Aug 1, 2026", amount: "$240.00", seats: 12, status: "paid" }, { id: "INV-2407", date: "Jul 1, 2026", amount: "$220.00", seats: 11, status: "paid" }, { id: "INV-2406", date: "Jun 1, 2026", amount: "$220.00", seats: 11, status: "refunded" }];
  return (
    <Stack gap="sm" align="stretch">
      <Heading level={5} textStyle="Heading/4">Invoices</Heading>
      <Table aria-label={`${workspace} invoices`} rows={invoices} getRowId={(invoice) => invoice.id}
        columns={[
          { id: "id", header: "Invoice", cell: (invoice) => <TableText bold>{invoice.id}</TableText> },
          { id: "date", header: "Date", cell: (invoice) => <TableText>{invoice.date}</TableText> },
          { id: "seats", header: "Seats", align: "right", width: "72px", cell: (invoice) => <TableText>{invoice.seats}</TableText> },
          { id: "amount", header: "Amount", align: "right", width: "96px", cell: (invoice) => <TableText>{invoice.amount}</TableText> },
          { id: "status", header: "Status", width: "110px", cell: (invoice) => <Badge size="medium" theme={invoice.status === "paid" ? "green" : "neutral"} background="subtle" leadingIcon={false}>{invoice.status === "paid" ? "Paid" : "Refunded"}</Badge> },
        ]} />
    </Stack>
  );
}

/** Workspace rail: switch organisations; "Members" opens a people flyout. */
function SidebarWorkspaceExample() {
  const [workspace, setWorkspace] = useState("zen");
  const [page, setPage] = useState("home");
  const [flyout, setFlyout] = useState(false);
  const [query, setQuery] = useState("");
  // Add workspace (rail +) creates and opens one; Workspace settings (header) opens the settings page.
  const [createdWorkspaces, setCreatedWorkspaces] = useState<Array<{ id: string; label: string; initials: string; theme: AvatarTheme }>>([]);
  const seedWorkspaces = [{ id: "zen", label: "Zen Studio", initials: "Z", theme: "brown" as AvatarTheme }, { id: "kaiz", label: "Kaiz Labs", initials: "K", theme: "indigo" as AvatarTheme }, { id: "ananas", label: "Ananas Retail", initials: "A", theme: "green" as AvatarTheme }];
  const workspaces = [...seedWorkspaces, ...createdWorkspaces];
  const addWorkspace = () => {
    const id = `new-${createdWorkspaces.length + 1}`;
    setCreatedWorkspaces((list) => [...list, { id, label: list.length ? `New workspace ${list.length + 1}` : "New workspace", initials: "N", theme: "blue" }]);
    setWorkspace(id); setPage("home"); setFlyout(false);
  };
  const current = workspaces.find((w) => w.id === workspace)!;
  const member = people.find((person) => `m-${person.id}` === page);
  const sections: SidebarSection[] = [{ items: [
    { id: "home", label: "Home", icon: shellIcon("icon-home-03-line"), selected: page === "home" },
    { id: "projects", label: "Projects", icon: shellIcon("icon-folder-line"), counter: shellProjects.length, selected: page === "projects" },
    { id: "members", label: "Members", icon: shellIcon("icon-users-line"), trailingAction: flyoutChevron, selected: flyout || Boolean(member) },
    { id: "billing", label: "Billing", icon: shellIcon("icon-credit-card-line"), selected: page === "billing" },
  ] }];
  return (
    <div className="pe-shell pe-shell--tall" data-canvas="alt">
      <Sidebar variant="workspace" background="alt" workspaceBar sections={sections}
        onItemClick={(item) => {
          if (workspaces.some((w) => w.id === item.id)) { setWorkspace(item.id); setFlyout(false); return; }
          if (item.id === "members") { setFlyout((open) => !open); return; }
          setPage(item.id); setFlyout(false);
        }}
        workspaceItems={workspaces.map((w) => ({ id: w.id, label: w.label, selected: w.id === workspace, icon: <Avatar size="medium" shape="square" theme={w.theme} background="solid" alt="">{w.initials}</Avatar> }))}
        workspaceAction={<IconButton appearance="main" level="tertiary" size="md" aria-label="Add workspace" icon={<Icon name="icon-plus-line" />} onClick={addWorkspace} />}
        headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" icon={<Icon name="icon-settings-01-line" />} onClick={() => { setPage("settings"); setFlyout(false); }} />}
        subMenuLabel="Members"
        onSubMenuClose={() => setFlyout(false)}
        subMenu={flyout ? (
          <SidebarSubMenu
            search={<Search variant="popover" placeholder="Search people" aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} />}
            sections={[
              { label: "Online", items: people.filter((p) => p.online && matches(query, p.name)).map((p) => ({ id: `m-${p.id}`, label: p.name, icon: <Avatar size="2xsmall" theme="photo" src={p.photo} alt="" />, selected: page === `m-${p.id}` })) },
              { label: "Offline", items: people.filter((p) => !p.online && matches(query, p.name)).map((p) => ({ id: `m-${p.id}`, label: p.name, icon: <Avatar size="2xsmall" theme="photo" src={p.photo} alt="" />, selected: page === `m-${p.id}` })) },
            ].filter((section) => section.items.length)}
            onItemClick={(item) => { setPage(item.id); setFlyout(false); }}
          >
            <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />}>Invite people</Button>
          </SidebarSubMenu>
        ) : undefined}
      />
      {member ? (
        <ShellPage eyebrow={`${current.label} · Members`} title={member.name} description={`${member.role} · ${member.online ? "Online now" : "Offline"}`}
          actions={<><Avatar size="small" theme="photo" src={member.photo} alt={member.name} /><Button appearance="main" level="tertiary" size="sm">Message</Button></>}>
          <ShellStats stats={[{ label: "Assigned", value: String(tasks.filter((t) => t.owner === member.id).length) }, { label: "Projects", value: String(shellProjects.filter((p) => p.team.includes(member.id)).length) }, { label: "Status", value: member.online ? "Active" : "Away", hint: member.online ? "Online" : "Offline", theme: member.online ? "green" : "neutral" }]} />
          <ShellTasks title="Assigned tasks" owners={[member.id]} />
        </ShellPage>
      ) : (
        <ShellPage eyebrow={current.label} title={{ home: "Home", projects: "Projects", billing: "Billing", settings: "Workspace settings" }[page] ?? "Home"} description={{ projects: `Every project in ${current.label}, with its team and open work.`, billing: "Team plan · 12 seats · billed monthly to Visa ending 4242.", settings: `Name, address and plan of ${current.label}.` }[page] ?? "The rail switches organisations; the panel keeps that workspace's pages. Open Members for the people flyout."}>
          <ShellStats stats={[{ label: "Members", value: String(people.length), hint: `${people.filter((p) => p.online).length} online`, theme: "green" }, { label: "Projects", value: String(shellProjects.length) }, { label: "Plan", value: "Team", hint: "Renews Oct 1" }]} />
          {page === "projects" ? <ShellProjectsTable /> : page === "billing" ? <ShellInvoices workspace={current.label} /> : page === "settings" ? (
            <Stack gap="sm" align="stretch">
              <Heading level={5} textStyle="Heading/4">General</Heading>
              <DescriptionList divider items={[
                { term: "Workspace name", description: current.label },
                { term: "Workspace URL", description: `${current.id}.zen.studio` },
                { term: "Plan", description: "Team · 12 seats" },
                { term: "Members", description: plural(people.length, "member") },
              ]} />
            </Stack>
          ) : <ShellTasks title="Workspace activity" />}
        </ShellPage>
      )}
    </div>
  );
}

/** Collapsed rail with tooltips; "Reports" opens a flyout even while the rail is collapsed. */
function SidebarCollapsedExample() {
  const [page, setPage] = useState("inbox");
  const [collapsed, setCollapsed] = useState(true);
  const [flyout, setFlyout] = useState(false);
  const reports = [{ id: "r-velocity", label: "Sprint velocity", value: "42 pts", hint: "+8%", last: "39 pts", target: "40 pts" }, { id: "r-quality", label: "Bug trend", value: "7 open", hint: "−3", last: "10 open", target: "< 5" }, { id: "r-adoption", label: "Component adoption", value: "86%", hint: "+5%", last: "81%", target: "90%" }, { id: "r-a11y", label: "Accessibility score", value: "94", hint: "+2", last: "92", target: "95" }];
  const report = reports.find((item) => item.id === page);
  const sections: SidebarSection[] = [{ items: [
    { id: "inbox", label: "Inbox", icon: shellIcon("ic-inbox-01-line"), notificationDot: true, selected: page === "inbox" },
    { id: "calendar", label: "Calendar", icon: shellIcon("icon-calendar-line"), selected: page === "calendar" },
    { id: "reports", label: "Reports", icon: shellIcon("icon-bar-chart-01-line"), trailingAction: flyoutChevron, selected: flyout || Boolean(report) },
    { id: "starred", label: "Starred", icon: shellIcon("icon-star-01-line"), selected: page === "starred" },
  ] }];
  return (
    <div className="pe-shell pe-shell--tall" data-canvas="alt">
      <Sidebar variant="basic" background="alt" {...figmaSidebarBrand} collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections}
        onItemClick={(item) => { if (item.id === "reports") { setFlyout((open) => !open); return; } setPage(item.id); setFlyout(false); }}
        subMenuLabel="Reports"
        onSubMenuClose={() => setFlyout(false)}
        subMenu={flyout ? <SidebarSubMenu sections={[{ label: "Reports", items: reports.map((item) => ({ id: item.id, label: item.label, icon: shellIcon("icon-bar-chart-01-line"), selected: page === item.id })) }]} onItemClick={(item) => { setPage(item.id); setFlyout(false); }} /> : undefined}
      />
      <ShellPage eyebrow={report ? "Reports" : "Focus mode"} title={report ? report.label : page[0].toUpperCase() + page.slice(1)}
        description={report ? "Weekly snapshot generated from the tracker." : page === "calendar" ? "Thursday, 27 September · 4 meetings" : page === "starred" ? "Pages and projects you starred." : "Collapsed by default for focus-heavy tools; hover an icon for its tooltip, open Reports for the flyout."}>
        {report ? <>
          <ShellStats stats={[{ label: "This week", value: report.value, hint: report.hint, theme: "green" }, { label: "Last week", value: report.last }, { label: "Target", value: report.target, hint: "Q4", theme: "blue" }]} />
          <ShellTasks title="Related tasks" owners={["bao", "em"]} />
        </> : page === "calendar" ? <ShellAgenda />
        : page === "starred" ? (
          <Card theme="border" spacing="small" className="pe-list-card">
            <List aria-label="Starred">
              {[...Object.values(shellDocs).map((d) => ({ id: d.title, title: d.title, caption: `Docs · edited ${d.updated}`, icon: "icon-file-doc-line" as ShellIconName })), ...shellProjects.filter((p) => p.pinned).map((p) => ({ id: p.id, title: p.name, caption: `Project · updated ${p.updated}`, icon: p.icon }))].map((item) => (
                <ListItem key={item.id} onClick={() => undefined} title={item.title} caption={item.caption} leading={<DockIcon icon={item.icon} theme="pale" size="small" />} trailing={<Icon name="icon-star-01-line" size="base" decorative />} />
              ))}
            </List>
          </Card>
        ) : <>
          <ShellStats stats={[{ label: "Unread", value: "4", hint: "2 mentions", theme: "blue" }, { label: "Meetings", value: "4", hint: "Today" }, { label: "Starred", value: "5" }]} />
          <ShellInbox />
        </>}
      </ShellPage>
    </div>
  );
}

/* Knowledge base on a Canvas/Flat page: the Surface/Flat sidebar is seamless with the page. */
const wikiDocs: Record<string, ShellDocData> = {
  "product-roadmap": { title: "Roadmap", path: ["Teamspaces", "Product"], owner: "duy", updated: "40m ago", team: ["duy", "ava", "bao", "em"], summary: "What we're building this quarter and why. Dates are targets, outcomes are commitments.",
    sections: [["Q4 outcomes", "Cut time-to-first-screen for new teams in half, reach 90% component adoption in the web app, and ship the mobile chat kit."], ["Now", "Date Picker ranges, Sidebar flyouts and the token rename are in progress; each has an owner and a weekly demo."], ["Next", "Offline drafts in chat, theming per workspace and the public API for design tokens."]],
    pages: [["Q4 OKRs", "Updated 2d ago"], ["Launch calendar", "Updated today"], ["Decision log", "Updated 1w ago"]] },
  "product-specs": { title: "Specs", path: ["Teamspaces", "Product"], owner: "duy", updated: "Yesterday", team: ["duy", "bao"], summary: "One page per feature: the problem, the smallest solution, and how we'll know it worked.",
    sections: [["Template", "Problem · Users · Proposal · Out of scope · Success metric · Open questions. Keep it under two screens."], ["Review", "Specs are reviewed async for 48 hours, then signed off in weekly planning."]],
    pages: [["Chat reactions", "In review"], ["Workspace theming", "Draft"], ["Token API", "Approved"]] },
  "product-releases": { title: "Release notes", path: ["Teamspaces", "Product"], owner: "bao", updated: "Today", team: ["bao", "em"], summary: "What shipped, for whom, and what changed in the API.",
    sections: [["1.8.2", "Date Picker range selection, Sidebar small density, 38 icon fixes. No breaking changes."], ["1.8.1", "Popover outside-click fix and faster Table sorting on 10k rows."]] },
  "design-guidelines": { title: "Guidelines", path: ["Teamspaces", "Design"], owner: "ava", updated: "3h ago", team: ["ava", "chi"], summary: "How to use the components: do's and don'ts, content and accessibility.",
    sections: [["Layers", "Canvas, then Surface, then content. A flat canvas pairs with flat navigation so the page reads as one plane."], ["Writing", "Sentence case, verbs on buttons, no trailing periods on single-sentence labels."]],
    pages: [["Buttons", "Updated 1d ago"], ["Forms", "Updated 4d ago"], ["Navigation", "Updated 1w ago"]] },
  "design-critiques": { title: "Critiques", path: ["Teamspaces", "Design"], owner: "chi", updated: "Wed", team: ["chi", "ava", "em"], summary: "Notes from Wednesday critique, newest first.",
    sections: [["Chat top nav", "Identity reads well; group avatars need the 48px frame. Call actions merged into one pill."], ["Breadcrumbs", "Separator sits flush with the item; hover fills the whole master item."]] },
  "eng-rfcs": { title: "RFCs", path: ["Teamspaces", "Engineering"], owner: "bao", updated: "2d ago", team: ["bao", "em"], summary: "Proposals for changes that are hard to undo. Comment inline; the author resolves.",
    sections: [["Open", "RFC-014 Token pipeline v2 · RFC-015 Portal root for overlays."], ["Accepted", "RFC-012 Presence-based motion · RFC-013 Usage-guard harness in CI."]],
    pages: [["RFC-014 Token pipeline v2", "Open · 6 comments"], ["RFC-015 Overlay portal root", "Open · 2 comments"]] },
  "eng-runbooks": { title: "Runbooks", path: ["Teamspaces", "Engineering"], owner: "em", updated: "1w ago", team: ["em", "bao"], summary: "Step-by-step fixes for the things that page us.",
    sections: [["Docs site down", "Check the CDN status page, then redeploy the last green build from CI."], ["Token build fails", "Run tokens:check locally; a renamed Figma variable is the usual cause."]] },
  "q4": { title: "Q4 roadmap", path: ["Favorites"], owner: "duy", updated: "40m ago", team: ["duy", "ava"], summary: "The one-page version of the roadmap for leadership updates.",
    sections: [["Headline", "On track for all three outcomes; chat kit is the riskiest and has two engineers from November."]] },
  "critique-notes": { title: "Design critique notes", path: ["Favorites"], owner: "chi", updated: "Wed", team: ["chi"], summary: "Running notes you starred from critique.",
    sections: [["This week", "Group avatar size, breadcrumb spacing and the list-in-card padding."]] },
  "reading": { title: "Reading list", path: ["Private"], owner: "ava", updated: "5d ago", summary: "Articles to read on the train.",
    sections: [["Queue", "Concentric corners in UI · Designing for six time zones · The case for boring tech."]] },
  "one-on-one": { title: "1:1 notes · Bao", path: ["Private"], owner: "ava", updated: "Mon", summary: "Private notes for weekly 1:1s.",
    sections: [["Mon", "Wants more ownership of the Table component; pair on the editable cells RFC."]] },
};
const wikiRecent = ["product-roadmap", "design-guidelines", "eng-rfcs", "product-releases"];

function SidebarFlatExample() {
  const [page, setPage] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  // "New teamspace" (the Teamspaces section action) adds an empty teamspace and opens it.
  const [createdSpaces, setCreatedSpaces] = useState<string[]>([]);
  const spaceLabel = (id: string) => { const index = createdSpaces.indexOf(id); return index ? `Untitled teamspace ${index + 1}` : "Untitled teamspace"; };
  const addSpace = () => { const id = `space-new-${createdSpaces.length + 1}`; setCreatedSpaces((list) => [...list, id]); setPage(id); setQuery(""); };
  const doc = wikiDocs[page];
  const child = (id: string, label: string) => ({ id, label, selected: page === id });
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", icon: shellIcon("icon-home-03-line"), selected: page === "home" },
      { id: "inbox", label: "Inbox", icon: shellIcon("ic-inbox-01-line"), counter: 4, selected: page === "inbox" },
      { id: "calendar", label: "Calendar", icon: shellIcon("icon-calendar-line"), selected: page === "calendar" },
    ] },
    { label: "Favorites", items: [
      { id: "q4", label: "Q4 roadmap", icon: shellIcon("icon-star-01-line"), selected: page === "q4" },
      { id: "critique-notes", label: "Design critique notes", icon: shellIcon("icon-star-01-line"), selected: page === "critique-notes" },
    ] },
    { label: "Teamspaces", action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New teamspace" icon={<Icon name="icon-plus-line" />} onClick={addSpace} />, items: [
      // New teamspaces come first (newest on top), so the one just created is in view without scrolling the nav.
      ...[...createdSpaces].reverse().map((id) => ({ id, label: spaceLabel(id), icon: shellIcon("icon-folder-line"), selected: page === id })),
      { id: "product", label: "Product", icon: shellIcon("icon-rocket-line"), selected: page.startsWith("product-"), children: [child("product-roadmap", "Roadmap"), child("product-specs", "Specs"), child("product-releases", "Release notes")] },
      { id: "design", label: "Design", icon: shellIcon("icon-palette-line"), selected: page.startsWith("design-"), children: [child("design-guidelines", "Guidelines"), child("design-critiques", "Critiques")] },
      { id: "eng", label: "Engineering", icon: shellIcon("icon-code-02-line"), selected: page.startsWith("eng-"), children: [child("eng-rfcs", "RFCs"), child("eng-runbooks", "Runbooks")] },
    ] },
    { label: "Private", items: [
      { id: "reading", label: "Reading list", icon: shellIcon("icon-bookmark-line"), selected: page === "reading" },
      { id: "one-on-one", label: "1:1 notes", icon: shellIcon("icon-file-doc-line"), selected: page === "one-on-one" },
    ] },
  ];
  const results = Object.entries(wikiDocs).filter(([, d]) => query.trim() && matches(query, [d.title, d.summary, ...d.sections.flat(), ...(d.pages ?? []).map(([title]) => title)].join(" ")));
  return (
    <div className="pe-shell pe-shell--tall" data-canvas="flat">
      <Sidebar variant="basic" background="flat" {...figmaSidebarBrand} collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections}
        search={<Search variant="popover" placeholder="Search the wiki" aria-label="Search the wiki" value={query} onChange={(event) => setQuery(event.target.value)} />}
        onItemClick={(item) => { if (item.children) return; setPage(item.id); setQuery(""); }}
        footer={<><button type="button"><Icon name="icon-layers-three-01-line" size="base" /><span>Templates</span></button><button type="button"><Icon name="icon-trash-line" size="base" /><span>Trash</span></button><button type="button"><Icon name="icon-settings-01-line" size="base" /><span>Settings</span></button></>} />
      {query.trim() ? (
        <ShellPage eyebrow="Zen Wiki · Search" title={`Results for “${query.trim()}”`} description={results.length ? `${plural(results.length, "page")} mention it.` : "Searched titles, page text and sub-pages in every teamspace."}>
          {!results.length ? <EmptyState title={`Nothing matches “${query.trim()}”`} illustration={false} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Try a teamspace name, or a keyword like “tokens” or “critique”.</EmptyState> : null}
          {results.length ? (
            <Card theme="border" spacing="small" className="pe-list-card">
              <List aria-label="Search results">
                {results.map(([id, d]) => <ListItem key={id} onClick={() => { setPage(id); setQuery(""); }} title={d.title} caption={`${d.path.join(" / ")} · edited ${d.updated}`} leading={<DockIcon icon="icon-file-doc-line" theme="pale" size="small" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />)}
              </List>
            </Card>
          ) : null}
        </ShellPage>
      ) : doc ? <ShellDoc key={page} doc={doc} root="Zen Wiki" />
      : createdSpaces.includes(page) ? (
        <ShellPage eyebrow="Zen Wiki · Teamspaces" title={spaceLabel(page)} description="A new teamspace: pages you add here are shared with everyone in it.">
          <EmptyState title="No pages yet" illustration={false} icon="icon-file-doc-line">Pages you create in this teamspace appear here.</EmptyState>
        </ShellPage>
      )
      : page === "inbox" ? <ShellPage eyebrow="Zen Wiki" title="Inbox" description="Mentions, comments and page requests from your teamspaces."><ShellInbox /></ShellPage>
      : page === "calendar" ? <ShellPage eyebrow="Zen Wiki" title="Calendar" description="Thursday, 27 September · 4 meetings"><ShellAgenda /></ShellPage>
      : (
        <ShellPage eyebrow="Zen Wiki" title="Good morning, Ava" description="Pick up where you left off, or search the wiki from the sidebar."
          actions={<Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />}>New page</Button>}>
          <ShellStats stats={[{ label: "Pages", value: String(Object.keys(wikiDocs).length), hint: "3 teamspaces" }, { label: "Edited this week", value: "12", hint: "+4", theme: "green" }, { label: "Open comments", value: "8", hint: "2 on RFC-014", theme: "orange" }]} />
          <Stack gap="sm" align="stretch">
            <Heading level={5} textStyle="Heading/4">Recently visited</Heading>
            <Card theme="border" spacing="small" className="pe-list-card">
              <List aria-label="Recently visited">
                {wikiRecent.map((id) => { const d = wikiDocs[id]; return <ListItem key={id} onClick={() => setPage(id)} title={d.title} caption={`${d.path.join(" / ")} · edited ${d.updated}`} leading={<DockIcon icon="icon-file-doc-line" theme="pale" size="small" />} trailing={teamStack(d.team ?? [d.owner])} />; })}
              </List>
            </Card>
          </Stack>
        </ShellPage>
      )}
    </div>
  );
}

/* ───────────── Tag ───────────── */

function TagInputExample() {
  const [tags, setTags] = useState(["react", "tokens", "a11y"]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  const add = () => {
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (tags.includes(value)) { setError(`“${value}” is already added`); return; }
    setTags([...tags, value]); setDraft(""); setError(undefined);
  };
  return (
    <div className="pe-stack pe-narrow">
      <InputField label="Keywords" placeholder="Type and press Enter" value={draft} error={error} helpText="Up to 8 keywords" readOnly={tags.length >= 8}
        onChange={(event) => { setDraft(event.target.value); setError(undefined); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } if (event.key === "Backspace" && !draft && tags.length) setTags(tags.slice(0, -1)); }} />
      <Stack direction="row" gap="xs" align="center" wrap>{tags.map((tag) => <Tag key={tag} leading={<Icon name="icon-hash-02-line" decorative />} remove onRemove={() => setTags(tags.filter((item) => item !== tag))}>{tag}</Tag>)}</Stack>
    </div>
  );
}

function TagRecipientsExample() {
  const [to, setTo] = useState<string[]>(["ava", "bao"]);
  return (
    <div className="pe-narrow">
      <AutocompleteField label="Share with" addLabel="Add people" popoverLabel="People" searchPlaceholder="Search by name"
        options={people.map((person) => ({ id: person.id, label: person.name, photoSrc: person.photo }))}
        value={to} onChange={setTo} invalidValues={to.includes("duy") ? ["duy"] : []}
        error={to.includes("duy") ? "Duy Le is outside your organization." : undefined}
        helpText={`${to.length} ${to.length === 1 ? "person" : "people"} will get access`} />
    </div>
  );
}

/* ───────────── Date Picker ───────────── */

function DateBookingExample() {
  const today = useMemo(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }, []);
  const [range, setRange] = useState<{ start: Date; end: Date | null } | null>(null);
  const nights = range?.end ? Math.round((range.end.getTime() - range.start.getTime()) / 86400000) : 0;
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Stack direction="row" gap="lg" align="start" wrap>
      <div className="pe-inline-picker"><DatePicker selectionMode="range" minDate={today} onRangeChange={setRange} /></div>
      <div className="pe-stack pe-summary">
        <Text as="span" textStyle="Body/Base/Bold">Your stay</Text>
        <Text as="span" tone="base">{range ? `${fmt(range.start)} → ${range.end ? fmt(range.end) : "pick check-out"}` : "Pick check-in, then check-out. Past dates are disabled."}</Text>
        {nights ? <Text as="span">{nights} night{nights === 1 ? "" : "s"} · ${nights * 89}</Text> : null}
        <Button appearance="main" level="primary" size="sm" style={{ justifySelf: "start" }} disabled={!nights}>Reserve</Button>
      </div>
    </Stack>
  );
}

function DateFieldFormExample() {
  const [date, setDate] = useState<Date | null>(null);
  return (
    <div className="pe-form">
      <InputField label="Event name" placeholder="Design review" />
      <DateField label="Date" onDateChange={setDate} helpText={date ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Click the field to open the calendar"} />
    </div>
  );
}


/* ───────────── Tooltip ───────────── */

function TooltipToolbarExample() {
  const tools: Array<{ id: string; label: string; key: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
    { id: "bold", label: "Bold", key: "⌘B", icon: "icon-bold-01-line" },
    { id: "italic", label: "Italic", key: "⌘I", icon: "icon-italic-01-line" },
    { id: "link", label: "Insert link", key: "⌘K", icon: "icon-link-01-line" },
    { id: "image", label: "Add image", key: "⌘⇧I", icon: "icon-image-plus-line" },
  ];
  const [active, setActive] = useState<string[]>(["bold"]);
  return (
    <div className="pe-toolbar" role="toolbar" aria-label="Formatting">
      {tools.map((tool) => (
        <Tooltip key={tool.id} content={`${tool.label} · ${tool.key}`} size="small">
          {/* zen-allow-secondary: a pressed formatting toggle is a visible highlight, not a CTA. */}
          <IconButton appearance="main" level={active.includes(tool.id) ? "secondary" : "tertiary"} size="sm" aria-label={tool.label} aria-pressed={active.includes(tool.id)} icon={<Icon name={tool.icon} />} onClick={() => setActive(active.includes(tool.id) ? active.filter((id) => id !== tool.id) : [...active, tool.id])} />
        </Tooltip>
      ))}
    </div>
  );
}

function TooltipCopyExample() {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return undefined; const timer = window.setTimeout(() => setCopied(false), 1500); return () => window.clearTimeout(timer); }, [copied]);
  return (
    <Stack direction="row" gap="xs" align="center" wrap>
      <InputField aria-label="Share link" readOnly value="https://zen.ds/p/7f3k2" />
      <Tooltip content={copied ? "Copied!" : "Copy link"} color={copied ? "accent" : "default"} open={copied ? true : undefined}>
        <IconButton appearance="main" level="tertiary" size="md" aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={() => { void navigator.clipboard?.writeText("https://zen.ds/p/7f3k2").catch(() => undefined); setCopied(true); }} />
      </Tooltip>
    </Stack>
  );
}

function TooltipTruncateExample() {
  const files = ["Q4-brand-refresh-final-final-v3-approved.fig", "Checkout flow — mobile explorations.fig", "Tokens.json"];
  return (
    <List aria-label="Files" className="pe-narrow">
      {files.map((file) => (
        <ListItem key={file} title={file} leading={<FileIcon format={fileIconFormatOf(file)} size="xl" />}>
          <Tooltip content={file} placement="bottom" size="small"><button type="button" className={`pe-truncate ${typographyStyles["Body/Base/Medium"]}`}>{file}</button></Tooltip>
        </ListItem>
      ))}
    </List>
  );
}

/* ───────────── Tabs ───────────── */

function TabsSettingsExample() {
  const [tab, setTab] = useState("general");
  const [notify, setNotify] = useState(true);
  return (
    <Stack gap="sm" align="stretch">
      <Tabs idPrefix="pe-settings" aria-label="Workspace settings" value={tab} onChange={setTab} items={[
        { id: "general", label: "General", icon: <Icon name="icon-settings-01-line" /> },
        { id: "members", label: "Members", icon: <Icon name="icon-user-circle-line" />, badge: 5 },
        { id: "notifications", label: "Notifications", icon: <Icon name="icon-bell-01-line" />, badge: notify ? undefined : "off" },
        { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" />, disabled: true },
      ]} />
      <TabPanel idPrefix="pe-settings" id="general" hidden={tab !== "general"}><div className="pe-form"><InputField label="Workspace name" defaultValue="Zen Studio" /><SelectField label="Language" options={[{ value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" }]} /></div></TabPanel>
      <TabPanel idPrefix="pe-settings" id="members" hidden={tab !== "members"}><AvatarMembersExample /></TabPanel>
      <TabPanel idPrefix="pe-settings" id="notifications" hidden={tab !== "notifications"}><Toggle label="Email notifications" caption="Summary of activity in this workspace" selected={notify} onSelectedChange={setNotify} /></TabPanel>
    </Stack>
  );
}

function TabsPeriodExample() {
  const data: Record<string, { value: string; delta: string }> = { day: { value: "1,284", delta: "+4.2%" }, week: { value: "8,930", delta: "+12.8%" }, month: { value: "36,402", delta: "−2.1%" } };
  const [period, setPeriod] = useState("week");
  return (
    <Card theme="flat" spacing="small" className="pe-metric-card">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" textStyle="Body/Base/Medium">Active users</Text>
        <Tabs size="small" variant="subtle" aria-label="Period" value={period} onChange={setPeriod} items={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]} />
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap aria-live="polite"><Text as="span" textStyle="Heading/2">{data[period].value}</Text><Badge size="small" theme={data[period].delta.startsWith("+") ? "green" : "red"} background="subtle" leadingIcon={false}>{data[period].delta}</Badge></Stack>
    </Card>
  );
}

/* ───────────── Breadcrumbs ───────────── */

type Folder = { id: string; name: string; children?: Folder[] };
const driveTree: Folder = { id: "root", name: "My Drive", children: [
  { id: "design", name: "Design", children: [
    { id: "zen", name: "Zen DS", children: [{ id: "components", name: "Components", children: [{ id: "button", name: "Button" }, { id: "tabs", name: "Tabs" }] }, { id: "tokens", name: "Tokens" }] },
    { id: "brand", name: "Brand" },
  ] },
  { id: "finance", name: "Finance", children: [{ id: "2026", name: "2026" }] },
] };

function BreadcrumbsDriveExample() {
  const [trail, setTrail] = useState<Folder[]>([driveTree]);
  const current = trail[trail.length - 1];
  return (
    <Stack gap="sm" align="stretch">
      <Breadcrumbs items={trail.map((folder) => ({ id: folder.id, label: folder.name, icon: folder.id === "root" ? <Icon name="icon-folder-line" /> : undefined }))} onNavigate={(item) => setTrail(trail.slice(0, trail.findIndex((folder) => folder.id === item.id) + 1))} />
      {current.children?.length ? (
        <List aria-label={current.name}>
          {current.children.map((folder) => (
            <ListItem key={folder.id} title={folder.name} caption={plural(folder.children?.length ?? 0, "item")} onClick={() => setTrail([...trail, folder])}
              leading={<DockIcon icon="icon-folder-line" theme="pale" size="small" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />
          ))}
        </List>
      ) : <EmptyState title="This folder is empty" illustration={false}>Upload files or create a folder.</EmptyState>}
    </Stack>
  );
}

function BreadcrumbsCollapsedExample() {
  const [last, setLast] = useState("");
  return (
    <Stack gap="sm" align="stretch">
      <Breadcrumbs maxItems={4} emphasis="medium" onNavigate={(item, event) => { event.preventDefault(); setLast(String(item.label)); }} items={[
        { id: "home", label: "Home", href: "#home" }, { id: "org", label: "Dìzai Studio", href: "#org" }, { id: "teams", label: "Teams", href: "#teams" },
        { id: "design", label: "Design", href: "#design" }, { id: "projects", label: "Projects", href: "#projects" }, { id: "zen", label: "Zen DS", href: "#zen" }, { id: "release", label: "Release notes" },
      ]} />
      <Text as="span" textStyle="Caption/Regular" tone="light">{last ? `Would navigate to “${last}”` : "Click “…” to reveal the hidden levels."}</Text>
    </Stack>
  );
}

/* ───────────── Progress ───────────── */

function ProgressUploadExample() {
  const initial = [{ id: "a", name: "hero-video.mp4", size: 48, value: 0 }, { id: "b", name: "brand-guide.pdf", size: 12, value: 0 }, { id: "c", name: "icons.zip", size: 6, value: 0 }];
  const [files, setFiles] = useState(initial);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setFiles((list) => {
      const next = list.map((file) => ({ ...file, value: Math.min(100, file.value + Math.round(60 / file.size + Math.random() * 6)) }));
      if (next.every((file) => file.value >= 100)) setRunning(false);
      return next;
    }), 180);
    return () => window.clearInterval(timer);
  }, [running]);
  const total = Math.round(files.reduce((sum, file) => sum + file.value * file.size, 0) / files.reduce((sum, file) => sum + file.size, 0));
  return (
    <Stack gap="sm" align="stretch">
      {files.map((file) => (
        <Stack gap="xs" align="stretch" key={file.id}>
          <Stack direction="row" gap="xs" align="center" justify="between" wrap><Text as="span" textStyle="Body/Small/Medium">{file.name}</Text><Text as="span" textStyle="Caption/Regular" tone="light">{file.value >= 100 ? "Uploaded" : `${Math.round(file.size * file.value / 100)} / ${file.size} MB`}</Text></Stack>
          <ProgressBar value={file.value} theme={file.value >= 100 ? "status" : "accent"} aria-label={`${file.name} upload`} />
        </Stack>
      ))}
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" tone="base">Total {total}%</Text>
        <Stack direction="row" gap="xs" align="center" wrap>
          {running ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setRunning(false)}>Pause</Button> : null}
          {total >= 100
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setFiles(initial)}>Reset</Button>
            : <Button appearance="main" level="primary" size="sm" disabled={running} startIcon={<Icon name="icon-upload-01-line" decorative />} onClick={() => setRunning(true)}>{total > 0 ? "Resume" : "Upload"}</Button>}
        </Stack>
      </Stack>
    </Stack>
  );
}

function ProgressChecklistExample() {
  const steps = [
    { id: "profile", label: "Complete your profile", theme: "blue" as const },
    { id: "team", label: "Invite your team", theme: "green" as const },
    { id: "project", label: "Create a project", theme: "orange" as const },
    { id: "figma", label: "Connect Figma", theme: "accent" as const },
  ];
  const [progress, setProgress] = useState<Record<string, number>>({ profile: 100, team: 60, project: 0, figma: 25 });
  const overall = Math.round(Object.values(progress).reduce((sum, value) => sum + value, 0) / steps.length);
  return (
    <Stack gap="sm" align="stretch">
      <ProgressBar value={overall} theme="status" label={`${overall}% set up`} />
      <List aria-label="Setup steps">
        {steps.map((step) => (
          <ListItem key={step.id} title={step.label} caption={`${progress[step.id]}% done`}
            leading={<ProgressCircle value={progress[step.id]} theme={step.theme} aria-label={`${step.label} progress`} />}
            trailing={<Button appearance="main" level="tertiary" size="md" disabled={progress[step.id] >= 100} onClick={() => setProgress({ ...progress, [step.id]: Math.min(100, progress[step.id] + 25) })}>{progress[step.id] >= 100 ? "Done" : "Continue"}</Button>} />
        ))}
      </List>
    </Stack>
  );
}

/* ───────────── Dialog ───────────── */

function DialogDeleteExample() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleted, setDeleted] = useState(false);
  const name = "Marketing site";
  return (
    <Stack gap="sm" align="stretch">
      {deleted
        ? <Stack direction="row" gap="xs" align="center" wrap><Text as="span">“{name}” was deleted.</Text><Button appearance="main" level="tertiary" size="sm" onClick={() => setDeleted(false)}>Restore</Button></Stack>
        : <Card theme="border" spacing="small" className="pe-list-card"><ListItem as="div" title={name} caption="24 pages · edited today" leading={<DockIcon icon="icon-globe-02-line" theme="blue" background="subtle" size="small" />} trailing={<Button appearance="main" level="danger-subtle" size="md" startIcon={<Icon name="icon-trash-line" decorative />} onClick={() => { setTyped(""); setOpen(true); }}>Delete</Button>} /></Card>}
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title={`Delete “${name}”?`} description="This removes all 24 pages and their history for everyone. This can't be undone."
        primaryAction={{ label: "Delete project", level: "danger", disabled: typed !== name, onClick: () => { setOpen(false); setDeleted(true); } }}
        secondaryAction={{ label: "Cancel", autoFocus: true }}>
        <InputField label={`Type “${name}” to confirm`} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
      </Dialog>
    </Stack>
  );
}

function DialogUnsavedExample() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("You have 3 unsaved edits.");
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <Text as="span" tone="base">{status}</Text>
      <Button appearance="main" level="tertiary" size="sm" onClick={() => setOpen(true)}>Leave page</Button>
      <Dialog open={open} onOpenChange={setOpen} theme="warning" title="Save changes before leaving?" description="Your edits to “Checkout flow” will be lost if you don't save them."
        primaryAction={{ label: "Save & leave", onClick: () => { setStatus("Saved. You left the page."); setOpen(false); } }}
        secondaryAction={{ label: "Stay" }}
        tertiaryAction={{ label: "Discard", level: "danger-subtle", onClick: () => { setStatus("Changes discarded."); setOpen(false); } }} />
    </Stack>
  );
}

function DialogSuccessExample() {
  const [open, setOpen] = useState(false);
  return (
    <Stack direction="row" gap="xs" align="center" wrap>
      <Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-upload-01-line" decorative />} onClick={() => setOpen(true)}>Publish</Button>
      <Dialog open={open} onOpenChange={setOpen} theme="positive" title="Your site is live" description="zen-ds.dizai.studio was published a moment ago. Share it with your team."
        primaryAction={{ label: "Done" }} />
    </Stack>
  );
}


/** Direction=Vertical: three stacked full-width actions for a choice that deserves equal weight. */
function DialogVerticalActionsExample() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Team plan · 12 of 12 seats used.");
  const done = (text: string) => { setStatus(text); setOpen(false); };
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <Text as="span" tone="base">{status}</Text>
      <Button appearance="main" level="primary" size="sm" onClick={() => setOpen(true)}>Add a seat</Button>
      <Dialog open={open} onOpenChange={setOpen} theme="info" title="You're out of seats" description="Upgrade to Business for unlimited seats, or add one seat to your current plan."
        actionsDirection="vertical"
        primaryAction={{ label: "Upgrade to Business", onClick: () => done("Upgraded to Business · unlimited seats.") }}
        secondaryAction={{ label: "Add 1 seat · $12/month", onClick: () => done("Team plan · 13 seats.") }}
        tertiaryAction={{ label: "Not now" }} />
    </Stack>
  );
}

/** Modal/Forms Layout=Basic: a short form that submits with Enter or the primary button. */
function ModalFormInviteExample() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Text as="span" tone="base">{invited.length ? `Invited: ${invited.join(", ")}` : "No pending invites."}</Text>
        <Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => { setEmail(""); setTouched(false); setOpen(true); }}>Invite member</Button>
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} title="Invite a member" description="They'll get an email with a link to join Zen Studio."
        onSubmit={() => { setTouched(true); if (!valid) return; setInvited((list) => [...list, email]); setOpen(false); }}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Work email" type="email" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched(true)}
          error={touched && !valid ? "Enter a valid email address, like name@company.com." : undefined} />
        <SelectField label="Role" options={[{ label: "Member", value: "member" }, { label: "Admin", value: "admin" }, { label: "Viewer", value: "viewer" }]} />
      </ModalForm>
    </Stack>
  );
}

/** Modal/Forms Layout=1-3: a 240px live preview beside the profile fields. */
function ModalFormProfileExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Ava Chen");
  const [title, setTitle] = useState("Product Designer");
  const [saved, setSaved] = useState({ name: "Ava Chen", title: "Product Designer" });
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <span className="pe-row"><Avatar size="small" theme="blue" alt="">{saved.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</Avatar><Text as="span">{saved.name} · {saved.title}</Text></span>
      <Button appearance="main" level="tertiary" size="sm" onClick={() => { setName(saved.name); setTitle(saved.title); setOpen(true); }}>Edit profile</Button>
      <ModalForm open={open} onOpenChange={setOpen} layout="1-3" title="Edit profile" description="This is how teammates see you across Zen."
        side={<div className="pe-modal-preview"><Avatar size="2xlarge" theme="blue" alt="">{initials}</Avatar><Text as="span" textStyle="Body/Base/Bold">{name || "Your name"}</Text><Text as="span" textStyle="Body/Small/Regular" tone="base">{title || "Your title"}</Text></div>}
        onSubmit={() => { setSaved({ name, title }); setOpen(false); }}
        primaryAction={{ label: "Save profile", disabled: !name.trim() }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Display name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} characterLimit />
        <InputField label="Title" labelOptional value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextAreaField label="Bio" labelOptional rows={3} placeholder="A sentence about what you work on" />
      </ModalForm>
    </Stack>
  );
}

/** Modal/Forms Layout=Half-Half: the workspace card preview updates as the form is filled. */
const workspaceColors = ["indigo", "blue", "teal", "green", "orange", "red", "pink", "purple"] as const;
const swatch = (id: string) => `var(--zen-color-background-support-${id}-solid)`;
function ModalFormWorkspaceExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("indigo");
  const [created, setCreated] = useState<string | null>(null);
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-workspace";
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <Text as="span" tone="base">{created ? `Created ${created}.` : "Create a workspace for another team."}</Text>
      <Button appearance="main" level="primary" size="sm" onClick={() => { setName(""); setOpen(true); }}>New workspace</Button>
      <ModalForm open={open} onOpenChange={setOpen} layout="half-half" title="Create a workspace" description="Workspaces keep projects, members and billing separate."
        side={<div className="pe-modal-preview pe-modal-preview--card"><Avatar size="xlarge" shape="square" theme={color as AvatarTheme} background="solid" alt="">{(name.trim()[0] ?? "W").toUpperCase()}</Avatar><Text as="span" textStyle="Heading/4">{name || "Workspace name"}</Text><Text as="span" textStyle="Body/Small/Regular" tone="base">zen.app/{slug}</Text></div>}
        onSubmit={() => { setCreated(name || "Untitled workspace"); setOpen(false); }}
        primaryAction={{ label: "Create workspace", disabled: !name.trim() }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Workspace name" placeholder="Kaiz Labs" value={name} onChange={(event) => setName(event.target.value)} helpText={`URL: zen.app/${slug}`} />
        <Stack gap="sm" align="stretch">
          <InputLabel>Color</InputLabel>
          <ColorSelector aria-label="Workspace color" value={swatch(color)} onChange={(value) => setColor(workspaceColors.find((id) => swatch(id) === value) ?? "indigo")}
            colors={workspaceColors.map((id) => ({ value: swatch(id), label: id[0].toUpperCase() + id.slice(1) }))} />
        </Stack>
      </ModalForm>
    </Stack>
  );
}

/** Modal/Forms Layout=Big with a Stepper in the Top-Customize slot: a three-step import. */
function ModalFormImportExample() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const steps: StepperStep[] = [{ id: "upload", title: "Upload", caption: "tokens.json" }, { id: "map", title: "Map collections" }, { id: "review", title: "Review" }];
  const last = step === steps.length - 1;
  return (
    <Stack direction="row" gap="xs" align="center" justify="between" wrap>
      <Text as="span" tone="base">{done ? "Imported 2,214 tokens from tokens.json." : "Import a Figma variables export."}</Text>
      <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-upload-01-line" decorative />} onClick={() => { setStep(0); setOpen(true); }}>Import tokens</Button>
      <ModalForm open={open} onOpenChange={setOpen} layout="big" title="Import tokens" description="Bring a Figma variables export into this workspace. Existing tokens with the same name are updated."
        onSubmit={() => { if (last) { setDone(true); setOpen(false); } else setStep(step + 1); }}
        primaryAction={{ label: last ? "Import 2,214 tokens" : "Continue" }} secondaryAction={{ label: "Cancel" }}
        tertiaryAction={step > 0 ? { label: "Back", onClick: () => setStep(step - 1) } : undefined}>
        {/* Header first, then the steps: the Stepper opens the Main-Contents slot instead of the Top-Customize slot. */}
        <Stepper aria-label="Import steps" steps={steps} current={step} onStepClick={(_, index) => setStep(index)} />
        {step === 0 ? <InputField label="File" readOnly value="tokens.json · 412 KB" helpText="Exported from Figma → Variables → Export." helpTheme="positive" /> : null}
        {step === 1 ? <div className="pe-grid-2"><SelectField label="Primitives" defaultValue="global" options={[{ label: "Global Colors", value: "global" }, { label: "New collection", value: "new" }]} /><SelectField label="Semantic" defaultValue="mode" options={[{ label: "Mode Colors (Semantic)", value: "mode" }, { label: "New collection", value: "new" }]} /></div> : null}
        {step === 2 ? <InputHelpText theme="warning">36 tokens will be renamed. Review the diff before importing.</InputHelpText> : null}
      </ModalForm>
    </Stack>
  );
}

/* ───────────── Table · editable cells ───────────── */

/** Spreadsheet-style inventory: text and number cells edited in place; Total and the footer recompute live. */
function TableInventoryEditExample() {
  type Item = { id: string; sku: string; name: string; qty: string; price: string };
  const [items, setItems] = useState<Item[]>([
    { id: "1", sku: "ZEN-001", name: "Linen notebook", qty: "24", price: "12.5" },
    { id: "2", sku: "ZEN-002", name: "Brass pen", qty: "8", price: "38" },
    { id: "3", sku: "ZEN-003", name: "Desk mat", qty: "15", price: "22" },
  ]);
  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((item) => item.id === id ? { ...item, ...patch } : item));
  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const total = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  return (
    <Stack gap="sm" align="stretch">
      <Table aria-label="Inventory" rows={items} getRowId={(item) => item.id}
        columns={[
          { id: "sku", header: "SKU", width: "16%", cell: (item) => <TableText>{item.sku}</TableText> },
          { id: "name", header: "Product", cell: (item) => <TableText bold>{item.name}</TableText>,
            edit: { type: "text", value: (item) => item.name, "aria-label": "Product name", validate: (v) => v.trim() ? undefined : "Name can't be empty", onCommit: (item, name) => update(item.id, { name: name.trim() }) } },
          { id: "qty", header: "Qty", align: "right", width: "14%", cell: (item) => <TableText>{item.qty}</TableText>,
            edit: { type: "number", value: (item) => item.qty, "aria-label": "Quantity", validate: (v) => Number.isInteger(Number(v)) && Number(v) >= 0 ? undefined : "Whole number, 0 or more", onCommit: (item, qty) => update(item.id, { qty }) } },
          { id: "price", header: "Price", align: "right", width: "16%", cell: (item) => <TableText>{usd(Number(item.price))}</TableText>,
            edit: { type: "number", value: (item) => item.price, "aria-label": "Unit price", validate: (v) => Number(v) > 0 ? undefined : "Price must be above 0", onCommit: (item, price) => update(item.id, { price }) } },
          { id: "total", header: "Total", align: "right", width: "16%", cell: (item) => <TableText bold>{usd(Number(item.qty) * Number(item.price))}</TableText> },
        ]} />
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => setItems((list) => [...list, { id: String(Date.now()), sku: `ZEN-00${list.length + 1}`, name: "", qty: "0", price: "1" }])}>Add row</Button>
        <Text as="span" textStyle="Body/Base/Bold">Inventory value {usd(total)}</Text>
      </Stack>
    </Stack>
  );
}

/** Select editors (status, assignee), a tags editor, the Open button on hover, and rows locked once Done. */
function TableTaskEditExample() {
  type Task = { id: string; title: string; status: string; owner: string; labels: string[] };
  const [list, setList] = useState<Task[]>([
    { id: "t1", title: "Audit Checkbox hover", status: "in-progress", owner: "ava", labels: ["a11y"] },
    { id: "t2", title: "Ship Date Picker range", status: "done", owner: "bao", labels: ["release"] },
    { id: "t3", title: "Write Tag guidelines", status: "todo", owner: "chi", labels: ["docs", "tags"] },
  ]);
  const [opened, setOpened] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const update = (id: string, patch: Partial<Task>) => setList((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  const statusOptions = [{ value: "todo", label: "To do" }, { value: "in-progress", label: "In progress" }, { value: "done", label: "Done" }];
  const done = (task: Task) => task.status === "done";
  const task = list.find((row) => row.id === opened);
  return (
    <Stack gap="sm" align="stretch">
      <Table aria-label="Tasks" rows={filter ? list.filter((row) => row.labels.includes(filter)) : list} getRowId={(row) => row.id}
        columns={[
          { id: "title", header: "Task", width: "34%", cell: (row) => <TableText bold caption={done(row) ? "Locked — reopen to edit" : undefined}>{row.title}</TableText>, onOpen: (row) => setOpened(row.id),
            edit: { type: "text", value: (row) => row.title, "aria-label": "Task title", disabled: done, onCommit: (row, title) => update(row.id, { title }) } },
          { id: "status", header: "Status", cell: (row) => <Badge size="medium" theme={statusTheme[row.status]} background="subtle" leadingIcon={false}>{statusLabels[row.status]}</Badge>,
            edit: { type: "select", value: (row) => row.status, options: statusOptions, "aria-label": "Status", onCommit: (row, status) => update(row.id, { status }) } },
          { id: "owner", header: "Assignee", cell: (row) => { const p = people.find((x) => x.id === row.owner)!; return <TableMedia media={<Avatar size="xsmall" theme="photo" src={p.photo} alt="" />} bold={false}>{p.name}</TableMedia>; },
            edit: { type: "select", value: (row) => row.owner, options: people.map((p) => ({ value: p.id, label: p.name })), "aria-label": "Assignee", disabled: done, onCommit: (row, owner) => update(row.id, { owner }) } },
          { id: "labels", header: "Labels", width: "26%", cell: (row) => <TableTags>{row.labels.map((label) => <Tag key={label} aria-label={`Filter by ${label}`} onClick={() => setFilter(label)}>{label}</Tag>)}</TableTags>,
            edit: { type: "tags", value: (row) => row.labels, suggestions: ["a11y", "docs", "release", "tags", "bug"], "aria-label": "Labels", disabled: done, onCommit: (row, labels) => update(row.id, { labels }) } },
        ]} />
      {filter ? <span className="pe-row"><Text as="span" tone="base">Filtered by</Text><Tag remove removeLabel="Clear filter" onRemove={() => setFilter(null)}>{filter}</Tag></span> : null}
      <Text as="span" tone="base">{task ? `Opened “${task.title}” · ${statusLabels[task.status]} · ${people.find((p) => p.id === task.owner)?.name}` : "Hover a task and press Open, or set Status to Done to lock its row."}</Text>
    </Stack>
  );
}

/* ───────────── Popover content sets (shared with the playground) ───────────── */

const thumb = (bg: string, fg: string, shape: "doc" | "product") => "data:image/svg+xml;utf8," + encodeURIComponent(shape === "doc"
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><rect x="7" y="8" width="18" height="3" rx="1.5" fill="${fg}"/><rect x="7" y="14" width="14" height="3" rx="1.5" fill="${fg}" opacity=".6"/><rect x="7" y="20" width="10" height="3" rx="1.5" fill="${fg}" opacity=".4"/></svg>`
  : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="15" r="8" fill="${fg}"/><rect x="10" y="24" width="12" height="3" rx="1.5" fill="${fg}" opacity=".5"/></svg>`);

export const popoverContentKinds = ["icon", "text-only", "avatar-small", "avatar-big", "photo-small", "photo-big", "dock-icon", "badge"] as const;
export type PopoverContentKind = (typeof popoverContentKinds)[number];
export type PopoverContentSet = { title: string; items: PopoverItemData[]; code: string };

/** One realistic data set per Figma .Primitives/Popover/Item/Content theme. */
export function popoverContentSet(kind: PopoverContentKind, caption: boolean): PopoverContentSet {
  const c = (text: string) => (caption ? text : undefined);
  switch (kind) {
    case "icon": return { title: "Sort by", code: `{ id: "updated", label: "Last updated", caption: "Newest first", leading: <Icon name="icon-clock-line" /> }`, items: [
      { id: "updated", label: "Last updated", caption: c("Newest first"), leading: <Icon name="icon-clock-line" decorative /> },
      { id: "name", label: "Name", caption: c("A → Z"), leading: <Icon name="icon-type-01-line" decorative /> },
      { id: "size", label: "File size", caption: c("Largest first"), leading: <Icon name="icon-ruler-line" decorative /> },
      { id: "status", label: "Status", caption: c("Grouped by state"), leading: <Icon name="icon-check-circle-line" decorative /> },
    ] };
    case "text-only": return { title: "Language", code: `{ id: "vi", label: "Tiếng Việt", caption: "Vietnamese" }`, items: [
      { id: "en", label: "English", caption: c("Default") },
      { id: "vi", label: "Tiếng Việt", caption: c("Vietnamese") },
      { id: "ja", label: "日本語", caption: c("Japanese") },
      { id: "fr", label: "Français", caption: c("French") },
    ] };
    case "avatar-small": return { title: "Assignee", code: `{ id: user.id, label: user.name, caption: user.role, theme: "avatar-small", photoSrc: user.photo }`, items:
      people.slice(0, 4).map((person) => ({ id: person.id, label: person.name, caption: c(person.role), theme: "avatar-small", photoSrc: person.photo })) };
    case "avatar-big": return { title: "Switch account", code: `{ id: account.id, label: account.name, caption: account.email, theme: "avatar-big", photoSrc: account.photo }`, items:
      people.slice(0, 3).map((person) => ({ id: person.id, label: person.name, caption: c(`${person.name.split(" ")[0].toLowerCase()}@dizai.studio`), theme: "avatar-big", photoSrc: person.photo })) };
    case "photo-small": return { title: "Recent files", code: `{ id: file.id, label: file.name, caption: "Edited 2h ago", theme: "photo-small", photoSrc: file.thumbnail }`, items: [
      { id: "brief", label: "Q4 brief.doc", caption: c("Edited 2h ago"), theme: "photo-small", photoSrc: thumb("#dbe7ff", "#4c6ef5", "doc") },
      { id: "budget", label: "Budget 2026.xls", caption: c("Edited yesterday"), theme: "photo-small", photoSrc: thumb("#d3f9d8", "#2f9e44", "doc") },
      { id: "notes", label: "Research notes", caption: c("Edited Mon"), theme: "photo-small", photoSrc: thumb("#fff3bf", "#e67700", "doc") },
    ] };
    case "photo-big": return { title: "Products", code: `{ id: product.id, label: product.name, caption: "$129 · In stock", theme: "photo-big", photoSrc: product.image }`, items: [
      { id: "lamp", label: "Arc desk lamp", caption: c("$129 · In stock"), theme: "photo-big", photoSrc: thumb("#f1e4d6", "#b07d4f", "product") },
      { id: "chair", label: "Ergo chair", caption: c("$349 · 3 left"), theme: "photo-big", photoSrc: thumb("#dde5ec", "#4a6078", "product") },
      { id: "mug", label: "Stoneware mug", caption: c("$24 · Pre-order"), theme: "photo-big", photoSrc: thumb("#e8e0f0", "#7a5a9e", "product") },
    ] };
    case "dock-icon": return { title: "Integrations", code: `{ id: "figma", label: "Figma", caption: "Design files", theme: "dock-icon", leading: <Icon name="ic-figma-line" /> }`, items: [
      { id: "figma", label: "Figma", caption: c("Design files"), theme: "dock-icon", leading: <Icon name="ic-figma-line" decorative /> },
      { id: "chat", label: "Team chat", caption: c("Messages & threads"), theme: "dock-icon", leading: <Icon name="icon-message-chat-circle-line" decorative /> },
      { id: "calendar", label: "Calendar", caption: c("Events & reminders"), theme: "dock-icon", leading: <Icon name="icon-calendar-line" decorative /> },
      { id: "storage", label: "Cloud storage", caption: c("Files & backups"), theme: "dock-icon", leading: <Icon name="icon-cloud-line" decorative /> },
    ] };
    case "badge": return { title: "Status", code: `{ id: "active", label: "Active", theme: "badge", badgeTheme: "green" }`, items: [
      { id: "active", label: "Active", theme: "badge", badgeTheme: "green" },
      { id: "paused", label: "Paused", theme: "badge", badgeTheme: "yellow" },
      { id: "blocked", label: "Blocked", theme: "badge", badgeTheme: "red" },
      { id: "archived", label: "Archived", theme: "badge", badgeTheme: "neutral" },
    ] };
  }
}

/* ───────────── Registry ───────────── */

/* Search with filter variants */

const catalog = [
  { name: "Button", type: "components" }, { name: "Chip", type: "components" }, { name: "Date Picker", type: "components" }, { name: "Popover", type: "components" },
  { name: "Color/Background/Accent/Solid", type: "tokens" }, { name: "Spacing/Gap/Medium", type: "tokens" }, { name: "Corner-Radius/Large", type: "tokens" },
  { name: "icon-search-medium-line", type: "icons" }, { name: "icon-calendar-line", type: "icons" }, { name: "icon-chevron-down-line", type: "icons" },
];
const scopeOptions = [
  { value: "all", label: "All" },
  { value: "components", label: "Components" },
  { value: "tokens", label: "Tokens" },
  { value: "icons", label: "Icons" },
];

function SearchScopeExample() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const results = catalog.filter((item) => (scope === "all" || item.type === scope) && item.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="pe-stack pe-narrow">
      <Search theme="filter-dropdown" placeholder="Search the design system" value={query} onChange={(event) => setQuery(event.target.value)}
        filterOptions={scopeOptions} filterValue={scope} onFilterChange={setScope} filterActionLabel="Search in" />
      {results.length ? (
        <List aria-label="Results">
          {results.slice(0, 5).map((item) => (
            <ListItem key={item.name} title={item.name} onClick={() => undefined}
              trailing={<Badge size="small" theme="neutral" background="subtle" leadingIcon={false}>{item.type[0].toUpperCase() + item.type.slice(1)}</Badge>} />
          ))}
        </List>
      ) : (
        <EmptyState illustration={false} title={`No ${scope === "all" ? "results" : scope} for “${query}”`} secondaryAction={{ label: scope === "all" ? "Clear search" : "Search everything", onClick: () => (scope === "all" ? setQuery("") : setScope("all")) }}>
          {scope === "all" ? "Check the spelling or try a broader term." : "Widen the scope to search every part of the system."}
        </EmptyState>
      )}
    </div>
  );
}

const statusFilters: PopoverItemData[] = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
];

function SearchAdvancedFilterExample() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<string[]>(["todo", "in-progress"]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const rows = tasks.filter((task) => (statuses.length === 0 || statuses.includes(task.status)) && task.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <Stack gap="sm" align="stretch">
      <div className="pe-anchor" ref={anchorRef} style={{ display: "grid", width: "100%" }}>
        <Search theme="filter-icon" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)}
          onFilterClick={() => setOpen((current) => !current)} filterActionLabel="Filter by status" aria-expanded={open} />
        <Popover open={open} onOpenChange={setOpen} anchorRef={anchorRef} align="end" multiple label="Status"
          items={statusFilters.map((item) => ({ ...item, selected: statuses.includes(item.id) }))}
          onSelect={(item) => setStatuses((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />
      </div>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Text as="span" tone="base">{plural(rows.length, "task")}</Text>
        {statuses.length && statuses.length < statusFilters.length ? <Badge size="small" theme="accent" background="subtle" leadingIcon={false}>{plural(statuses.length, "filter")}</Badge> : null}
      </Stack>
      <Stack gap="sm" align="stretch" style={{ gap: 6 }}>
        <List aria-label="Tasks">{rows.slice(0, 4).map((task) => <ListItem key={task.id} title={task.title} trailing={<Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>} />)}</List>
      </Stack>
    </Stack>
  );
}

const pickerIcons = ["icon-home-03-line", "icon-search-medium-line", "icon-calendar-line", "icon-settings-03-line", "icon-bell-01-line", "icon-user-plus-line", "icon-trash-line", "icon-code-02-line", "icon-grid-01-line", "icon-colors-line", "icon-check-line", "icon-x-small-line"] as const;

function SearchIconPickerExample() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>("icon-bell-01-line");
  const matches = pickerIcons.filter((name) => name.includes(query.trim().toLowerCase()));
  return (
    <div className="pe-stack pe-icon-picker" style={{ width: 260, gap: 4, padding: 4, borderRadius: 16, background: "var(--zen-color-background-popover-default)", boxShadow: "var(--zen-style-effect-popover-shadow-unclipped)", outline: "1px solid var(--zen-color-border-popover-subtle)" }}>
      <Search variant="popover" iconSearch={false} placeholder="Search icons" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div role="listbox" aria-label="Icons" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
        {matches.map((name) => (
          <Fragment key={name}>
            {/* zen-allow-secondary: marks the selected icon in a picker grid (a pressed state, not a CTA) */}
            <IconButton appearance="flat" level={picked === name ? "secondary" : "tertiary"} size="sm" aria-label={name} aria-selected={picked === name} role="option"
              onClick={() => setPicked(name)} icon={<Icon name={name} />} />
          </Fragment>
        ))}
      </div>
      {matches.length
        ? <div className="pe-icon-picker__meta"><Text as="span" tone="light">Selected: {picked}</Text></div>
        : <EmptyState className="pe-empty-compact" title="No icons match" illustration={false} secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }} />}
    </div>
  );
}

/* ───────────── Examples batch: low-coverage components ───────────── */

function ChipPeopleFilterExample() {
  const [owner, setOwner] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const person = people.find((p) => p.id === owner);
  const rows = tasks.filter((task) => !owner || task.owner === owner);
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" size="small" dropdown select={Boolean(owner)} photoSrc={person?.photo} photoAlt={person?.name}
          popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Owner" onClearSelection={() => setOwner(null)}
          popoverItems={people.map((p) => ({ id: p.id, label: p.name, caption: p.role, photoSrc: p.photo, selected: p.id === owner }))}
          onPopoverSelect={(item) => setOwner(item.id)}>{person ? person.name : "Owner"}</Chip>
      </Stack>
      <List aria-label="Tasks">{rows.slice(0, 4).map((task) => <ListItem key={task.id} title={task.title} trailing={<Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>} />)}</List>
    </Stack>
  );
}

function ChipCountersExample() {
  const groups = [["Open", 12], ["In review", 4], ["Blocked", 1]] as const;
  return (
    <Stack gap="sm" align="stretch" style={{ gap: 10 }}>
      {groups.map(([label, count]) => <Stack direction="row" gap="xs" align="center" wrap justify="between" key={label}><Text as="span">{label}</Text><Chip variant="number-only" size="small" value={count} /></Stack>)}
    </Stack>
  );
}

function CheckboxBulkTableExample() {
  const files = [
    { id: "brand-guidelines.pdf", size: "4.2 MB", icon: "icon-file-doc-line" as const, theme: "red" as const },
    { id: "tokens.json", size: "86 KB", icon: "icon-code-02-line" as const, theme: "purple" as const },
    { id: "icons.zip", size: "12.8 MB", icon: "icon-folder-line" as const, theme: "yellow" as const },
    { id: "release-notes.md", size: "9 KB", icon: "icon-file-doc-line" as const, theme: "blue" as const },
  ];
  const [picked, setPicked] = useState<string[]>(["tokens.json"]);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap justify="between" style={{ minHeight: 32 }}>
        <Text as="span" textStyle="Heading/4">{picked.length ? `${picked.length} selected` : "Files"}</Text>
        {picked.length ? <Button appearance="main" level="danger-subtle" size="sm" onClick={() => setPicked([])}>Delete {picked.length}</Button> : null}
      </Stack>
      <Table aria-label="Files" rows={files} getRowId={(file) => file.id} selectable selectedIds={picked} onSelectionChange={setPicked}
        columns={[
          { id: "name", header: "Name", cell: (file) => <TableMedia media={<DockIcon icon={file.icon} theme={file.theme} background="subtle" size="xsmall" />} bold={false}>{file.id}</TableMedia> },
          { id: "size", header: "Size", align: "right", cell: (file) => <TableText>{file.size}</TableText> },
        ]} />
    </Stack>
  );
}

function CheckboxPermissionsExample() {
  const [perms, setPerms] = useState<Record<string, boolean>>({ view: true, comment: true, edit: false, admin: false });
  const labels: Record<string, [string, string]> = { view: ["View files", "Open and download"], comment: ["Comment", "Leave feedback on frames"], edit: ["Edit", "Change content and structure"], admin: ["Manage members", "Invite and remove people"] };
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      {Object.keys(perms).map((key) => <Checkbox key={key} checkSide="right" label={labels[key][0]} caption={labels[key][1]} checked={perms[key]} disabled={key === "view"} onChange={(on) => setPerms({ ...perms, [key]: on })} />)}
    </Stack>
  );
}

function RadioShippingExample() {
  const [method, setMethod] = useState("standard");
  const options = [["standard", "Standard", "3–5 business days", "Free"], ["express", "Express", "1–2 business days", "$9.00"], ["pickup", "Store pickup", "Ready tomorrow", "Free"]] as const;
  return (
    <Stack gap="xs" align="stretch" role="radiogroup" aria-label="Shipping method" style={{ width: "100%" }}>
      {options.map(([id, label, caption, price]) => (
        <Card key={id} theme="border" spacing="small" active={method === id} className="pe-choice-card">
          <Stack direction="row" gap="xs" align="center" justify="between" style={{ alignItems: "flex-start" }}>
            <RadioButton className="pe-radio-card__main" name="shipping" value={id} bold label={label} caption={caption} checked={method === id} onChange={() => setMethod(id)} />
            <Text as="span" textStyle="Body/Base/Bold">{price}</Text>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function RadioRightAlignedExample() {
  const [density, setDensity] = useState("comfortable");
  return (
    <Stack gap="none" align="stretch" role="radiogroup" aria-label="Row density" style={{ width: "100%" }}>
      {[["compact", "Compact", "More rows on screen"], ["comfortable", "Comfortable", "Default spacing"], ["spacious", "Spacious", "Easier to scan"]].map(([id, label, caption]) => (
        <div key={id} style={{ padding: "var(--zen-spacing-padding-small, 12px) 0", boxShadow: "inset 0 -1px 0 var(--zen-color-border-neutral-pale-default)" }}>
          <RadioButton name="density" value={id} radioSide="right" label={label} caption={caption} checked={density === id} onChange={() => setDensity(id)} />
        </div>
      ))}
    </Stack>
  );
}

function TabsIconBadgeExample() {
  const [tab, setTab] = useState("inbox");
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Tabs aria-label="Mail" value={tab} onChange={setTab} items={[
        { id: "inbox", label: "Inbox", icon: <Icon name="ic-inbox-01-line" decorative />, badge: 8 },
        { id: "mentions", label: "Mentions", icon: <Icon name="icon-at-sign-line" decorative />, badge: 2 },
        { id: "archive", label: "Archive", icon: <Icon name="icon-archive-line" decorative /> },
      ]} />
      <Text as="span" tone="base">{tab === "archive" ? "Nothing new in Archive." : `Showing ${tab}.`}</Text>
    </Stack>
  );
}

function TabsMobileExample() {
  const [tab, setTab] = useState("overview");
  return (
    <Stack gap="sm" align="stretch" padding="sm" style={{ width: 320, maxWidth: "100%", borderRadius: 20, boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-pale-default)" }}>
      <Tabs aria-label="Order" size="small" fullWidth value={tab} onChange={setTab} items={[{ id: "overview", label: "Overview" }, { id: "items", label: "Items" }, { id: "refunds", label: "Refunds", disabled: true }]} />
      <Text as="span" tone="base">{tab === "overview" ? "Order #2409 · Paid · Shipping today" : "3 items · $184.00"}</Text>
    </Stack>
  );
}

function BreadcrumbsHeaderExample() {
  const [path, setPath] = useState(["home", "projects", "web"]);
  const labels: Record<string, string> = { home: "Home", projects: "Projects", web: "Website redesign" };
  return (
    <Stack gap="xs" align="stretch" style={{ width: "100%" }}>
      <Breadcrumbs items={path.map((id) => ({ id, label: labels[id], icon: id === "home" ? <Icon name="icon-home-03-line" decorative /> : undefined }))} onNavigate={(item, event) => { event.preventDefault(); setPath(path.slice(0, path.indexOf(item.id) + 1)); }} />
      <Stack direction="row" gap="xs" align="center" wrap justify="between">
        <Heading level={1}>{labels[path[path.length - 1]]}</Heading>
        <Stack direction="row" gap="xs" align="center" wrap><Button level="tertiary" size="sm">Share</Button><Button level="primary" size="sm">Publish</Button></Stack>
      </Stack>
      {path.length < 3 ? <Stack direction="row" gap="xs" align="center" wrap><Button level="tertiary" size="sm" onClick={() => setPath(["home", "projects", "web"])}>Reset path</Button></Stack> : null}
    </Stack>
  );
}

function BreadcrumbsSettingsExample() {
  return (
    <Stack gap="xs" align="stretch">
      <Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, { id: "invoices", label: "Invoices" }]} onNavigate={(_item, event) => event.preventDefault()} />
      <Text as="span" tone="base">Without the master icon: for in-page sections like Settings → Billing → Invoices.</Text>
    </Stack>
  );
}

function ProgressStorageExample() {
  const [used, setUsed] = useState(92);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap justify="between"><Text as="span" textStyle="Body/Base/Bold">Storage</Text><Text as="span" tone="base">{used}% of 20 GB</Text></Stack>
      <ProgressBar value={used} theme="status" scale="quota" aria-label="Storage used" />
      <Stack direction="row" gap="xs" align="center" wrap>
        <Button level="tertiary" size="sm" onClick={() => setUsed(Math.max(12, used - 30))}>Clean up</Button>
        {used > 80 ? <Button level="primary" size="sm">Upgrade storage</Button> : null}
      </Stack>
    </Stack>
  );
}

function ProgressOnboardingExample() {
  const [step, setStep] = useState(1);
  const steps = ["Profile", "Team", "Integrations"];
  return (
    <Stack gap="md" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="lg" align="center" wrap>
        {steps.map((label, index) => <ProgressCircle key={label} value={index < step ? 100 : index === step ? 50 : 0} theme={index < step ? "green" : "accent"} label={label} />)}
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Button level="tertiary" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <Button level="primary" size="sm" disabled={step === steps.length} onClick={() => setStep(step + 1)}>{step >= steps.length - 1 ? "Finish" : "Next"}</Button>
      </Stack>
    </Stack>
  );
}

/* ───────────── Examples batch 2: new contexts ───────────── */

function ButtonEmptyStateExample() {
  const [created, setCreated] = useState(false);
  return (
    <Stack gap="sm" align="center" padding="xl" style={{ textAlign: "center", width: "100%" }}>
      <Icon name="icon-folder-line" size="var(--zen-image-size-small, 32px)" decorative />
      <Text as="span" textStyle="Body/Extra/Bold">{created ? "Project created" : "No projects yet"}</Text>
      <Text as="span" tone="base">{created ? "Invite your team to start collaborating." : "Projects group your files, tokens and components."}</Text>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Button level="tertiary" size="sm">Import from Figma</Button>
        <Button level="primary" size="sm" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => setCreated(true)}>{created ? "Invite team" : "New project"}</Button>
      </Stack>
    </Stack>
  );
}

/** Figma .Primitives/Input/Help-Text (373:97364): Theme × Icon × Character-Limitation. */
function InputHelpTextVariantsExample() {
  const themes: Array<[InputHelpTheme, string]> = [["neutral", "We'll never share your email."], ["warning", "Personal address — use your work email for SSO."], ["positive", "Email verified."], ["negative", "Enter a valid email address."]];
  return (
    <div className="pe-help-matrix">
      <Text as="span" textStyle="Body/Small/Medium" tone="light">Icon</Text>
      <Text as="span" textStyle="Body/Small/Medium" tone="light">No icon</Text>
      <Text as="span" textStyle="Body/Small/Medium" tone="light">Character limit</Text>
      {themes.map(([theme, message]) => (
        <Fragment key={theme}>
          <InputHelpText theme={theme}>{message}</InputHelpText>
          <InputHelpText theme={theme} icon={false}>{message}</InputHelpText>
          <InputHelpText theme={theme} characterLimit="42/100">{message}</InputHelpText>
        </Fragment>
      ))}
    </div>
  );
}

/** Help text that reacts to the value: availability (positive / negative), a soft warning, and a live counter. */
function InputHelpTextFormExample() {
  const taken = ["ava", "admin", "zen"];
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("ava@gmail.com");
  const [bio, setBio] = useState("Product designer building Zen DS.");
  const handle = username.trim().toLowerCase();
  const invalid = handle.length > 0 && !/^[a-z0-9_]{3,20}$/.test(handle);
  const isTaken = taken.includes(handle);
  const personal = /@(gmail|yahoo|outlook|hotmail)\./i.test(email);
  return (
    <div className="pe-stack pe-narrow">
      <InputField label="Username" placeholder="ava_chen" value={username} onChange={(event) => setUsername(event.target.value)}
        maxLength={20} characterLimit
        error={invalid ? "3–20 letters, numbers or underscores." : isTaken ? `@${handle} is already taken.` : undefined}
        helpText={handle && !invalid && !isTaken ? `@${handle} is available.` : "Your public handle."}
        helpTheme={handle && !invalid && !isTaken ? "positive" : "neutral"} />
      <InputField label="Work email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
        helpText={personal ? "Personal address — use your work email to sign in with SSO." : "Used for SSO and notifications."}
        helpTheme={personal ? "warning" : "neutral"} />
      <TextAreaField label="Bio" rows={3} value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} characterLimit
        helpText={bio.length > 140 ? "Almost at the limit." : "Shown on your profile."} helpTheme={bio.length > 140 ? "warning" : "neutral"} helpIcon={bio.length > 140} />
    </div>
  );
}

/** Figma Primitives/Input/Label (387:3651): Optional × Tooltip-Icon × Action, Default and Disabled. */
function InputLabelVariantsExample() {
  const variants: Array<[string, { optional?: boolean; tooltip?: boolean | string; action?: ReactNode }]> = [
    ["Label", {}],
    ["Optional", { optional: true }],
    ["Tooltip icon", { tooltip: "Visible to everyone in the workspace" }],
    ["Action", { action: <button type="button">Action</button> }],
    ["All", { optional: true, tooltip: "Visible to everyone in the workspace", action: <button type="button">Action</button> }],
  ];
  return (
    <div className="pe-label-matrix">
      <Text as="span" textStyle="Body/Small/Medium" tone="light">Variant</Text>
      <Text as="span" textStyle="Body/Small/Medium" tone="light">Default</Text>
      <Text as="span" textStyle="Body/Small/Medium" tone="light">Disabled</Text>
      {variants.map(([name, props]) => (
        <Fragment key={name}>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{name}</Text>
          <InputLabel {...props}>Display name</InputLabel>
          <InputLabel {...props} disabled>Display name</InputLabel>
        </Fragment>
      ))}
    </div>
  );
}

/** Labels doing real work: a tooltip that explains, an action that helps, and an optional marker. */
function InputLabelFormExample() {
  const [email, setEmail] = useState("ava@zen.studio");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [company, setCompany] = useState("");
  return (
    <div className="pe-stack pe-narrow">
      <InputField label="Work email" labelTooltip="We use this for SSO and billing receipts." type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <InputField label="Password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)}
        labelAction={<button type="button" onClick={() => setSent(true)}>Forgot password?</button>}
        helpText={sent ? `Reset link sent to ${email}.` : undefined} helpTheme="positive" />
      <InputField label="Company" labelOptional placeholder="Zen Studio" value={company} onChange={(event) => setCompany(event.target.value)} />
    </div>
  );
}

function InputCheckoutExample() {
  const [qty, setQty] = useState<number | null>(2);
  const [coupon, setCoupon] = useState("ZEN10X");
  const couponError = coupon && coupon !== "ZEN10" ? "This code is not valid." : undefined;
  return (
    <Stack gap="md" align="stretch" style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SelectField label="Country" options={[{ value: "vn", label: "Vietnam" }, { value: "sg", label: "Singapore" }, { value: "jp", label: "Japan" }]} defaultValue="vn" />
        <NumberField label="Seats" value={qty} onValueChange={setQty} min={1} max={50} />
      </div>
      <DateField label="Start date" helpText="Billing starts on this date." />
      <InputField label="Coupon" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} error={couponError} helpText={couponError ? undefined : coupon ? "10% off applied." : undefined} />
    </Stack>
  );
}

function TogglePrivacyCardsExample() {
  const [prefs, setPrefs] = useState({ profile: true, activity: false });
  return (
    <Stack gap="xs" align="stretch" style={{ width: "100%" }}>
      <Card theme="border" spacing="small"><Toggle theme="text-first" bold label="Public profile" caption="Anyone in your organisation can see your profile." selected={prefs.profile} onSelectedChange={(v) => setPrefs({ ...prefs, profile: v })} /></Card>
      <Card theme="border" spacing="small"><Toggle theme="text-first" bold label="Share activity" caption="Show what you are working on in the team feed." selected={prefs.activity} onSelectedChange={(v) => setPrefs({ ...prefs, activity: v })} /></Card>
    </Stack>
  );
}

function AvatarPresenceExample() {
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      {people.slice(0, 4).map((person) => (
        <Stack direction="row" gap="sm" align="center" wrap key={person.id}>
          <Avatar size="medium" theme="photo" src={person.photo} alt={person.name} status={person.online} />
          <Stack gap="none" align="stretch"><Text as="span" textStyle="Body/Base/Medium">{person.name}</Text><Text as="span" tone="light">{person.online ? "Online" : "Away"}</Text></Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function BadgePriorityExample() {
  const items = [["Payment API returns 500", "Urgent", "red", "icon-alert-octagon-solid"], ["Update onboarding copy", "Medium", "orange", "icon-alert-triangle-solid"], ["Refactor token build", "Low", "blue", "icon-info-circle-solid"]] as const;
  return (
    <List aria-label="Issues">
      {items.map(([title, level, theme, icon]) => <ListItem key={title} title={title} trailing={<Badge size="small" theme={theme} background="subtle" leading={<Icon name={icon} decorative />}>{level}</Badge>} />)}
    </List>
  );
}

/* ───────────── Popover / Bulk-Action ───────────── */

const bulkIcon = (icon: ShellIconName, label: string, onClick?: () => void, pressed?: boolean) => (
  <IconButton key={label} appearance="flat" level="primary" size="md" aria-label={label} aria-pressed={pressed} onClick={onClick} icon={<Icon name={icon} />} />
);

/** Figma Popover/Bulk-Action on a text selection: history · format · comment, floating above the selected phrase. */
export function PopoverBulkSelectionDemo({ history = true, destructive = true }: { history?: boolean; destructive?: boolean }) {
  const [format, setFormat] = useState<{ bold: boolean; italic: boolean }>({ bold: false, italic: false });
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="pe-bulk-stage">
      <PopoverBulkAction aria-label="Selection actions" className="pe-bulk-stage__bar">
        {history ? <><PopoverBulkActionGroup aria-label="History">{bulkIcon("icon-flip-backward-line", "Undo", () => setNote("Undone"))}{bulkIcon("icon-flip-forward-line", "Redo", () => setNote("Redone"))}</PopoverBulkActionGroup><PopoverBulkActionDivider /></> : null}
        <PopoverBulkActionGroup aria-label="Format">
          {bulkIcon("icon-bold-01-line", "Bold", () => setFormat((f) => ({ ...f, bold: !f.bold })), format.bold)}
          {bulkIcon("icon-italic-01-line", "Italic", () => setFormat((f) => ({ ...f, italic: !f.italic })), format.italic)}
        </PopoverBulkActionGroup>
        <PopoverBulkActionDivider />
        <PopoverBulkActionGroup aria-label="Comment">{bulkIcon("icon-message-plus-circle-line", "Comment", () => setNote("Comment added"))}</PopoverBulkActionGroup>
        {destructive ? <><PopoverBulkActionDivider /><PopoverBulkActionGroup aria-label="Delete">{bulkIcon("icon-trash-line", "Delete selection", () => setNote("Selection deleted"))}</PopoverBulkActionGroup></> : null}
      </PopoverBulkAction>
      <p className={`pe-bulk-stage__text ${typographyStyles["Body/Extra/Regular"]}`}>
        Launch notes: the new pricing page ships on Monday, and{" "}
        <mark className="pe-bulk-stage__selection" style={{ fontWeight: format.bold ? 600 : undefined, fontStyle: format.italic ? "italic" : undefined }}>the Team plan now includes SSO</mark>{" "}
        for every workspace on annual billing.
      </p>
      <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{note ?? "Select text to show quick actions; try Bold or Italic."}</p>
    </div>
  );
}

/** List selection: the Bulk-Action bar floats at the bottom while rows are selected and acts on all of them. */
/** Table selection: checking rows floats a Bulk-Action bar over the table's bottom edge; each action names how many
 *  files it affects, and Delete removes them and clears the selection. */
function PopoverBulkListExample() {
  const all = [
    { id: "brand", name: "Brand guidelines.pdf", owner: "Ava Chen", size: "4.2 MB", updated: "2d ago", icon: "icon-file-doc-solid" as ShellIconName, theme: "red" as const },
    { id: "q3", name: "Q3 report.pdf", owner: "Bao Nguyen", size: "1.8 MB", updated: "3d ago", icon: "icon-file-doc-solid" as ShellIconName, theme: "red" as const },
    { id: "tokens", name: "Tokens.json", owner: "Chi Tran", size: "86 KB", updated: "5h ago", icon: "icon-code-02-line" as ShellIconName, theme: "purple" as const },
    { id: "logo", name: "Logo pack.zip", owner: "Ava Chen", size: "12.8 MB", updated: "1w ago", icon: "icon-folder-line" as ShellIconName, theme: "yellow" as const },
    { id: "onboarding", name: "Onboarding.fig", owner: "Duy Le", size: "9.1 MB", updated: "2w ago", icon: "icon-palette-line" as ShellIconName, theme: "blue" as const },
  ];
  const [files, setFiles] = useState(all);
  const [picked, setPicked] = useState<string[]>(["q3", "tokens"]);
  const [note, setNote] = useState("");
  const count = `${picked.length} ${picked.length === 1 ? "file" : "files"}`;
  return (
    <div className="pe-bulk-list">
      <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{note || (picked.length ? `${count} selected` : "Select files to act on them together.")}</p>
      <div className="pe-bulk-list__area">
        <Table aria-label="Project files" rows={files} getRowId={(row) => row.id} selectable selectedIds={picked} onSelectionChange={(ids) => { setPicked(ids); setNote(""); }}
          empty={<EmptyState title="No files left" illustration={false} primaryAction={{ label: "Restore files", onClick: () => { setFiles(all); setNote("Files restored"); } }}>Deleted files show up again when you restore them.</EmptyState>}
          columns={[
            { id: "name", header: "Name", cell: (row) => <TableMedia media={<DockIcon icon={row.icon} theme={row.theme} background="subtle" size="small" />} caption={row.owner}>{row.name}</TableMedia> },
            { id: "size", header: "Size", align: "right", cell: (row) => <TableText>{row.size}</TableText> },
            { id: "updated", header: "Updated", align: "right", cell: (row) => <TableText>{row.updated}</TableText> },
          ]} />
        {picked.length ? (
          <PopoverBulkAction aria-label={`Actions for ${count}`} className="pe-bulk-list__bar">
            <PopoverBulkActionGroup aria-label="Edit">
              {bulkIcon("icon-edit-02-line", `Rename ${count}`, () => setNote(`Renaming ${count}`))}
              {bulkIcon("icon-copy-line", `Duplicate ${count}`, () => setNote(`Duplicated ${count}`))}
              {bulkIcon("icon-share-01-line", `Share ${count}`, () => setNote(`Sharing ${count}`))}
            </PopoverBulkActionGroup>
            <PopoverBulkActionDivider />
            <PopoverBulkActionGroup aria-label="Delete">{bulkIcon("icon-trash-line", `Delete ${count}`, () => { setFiles((rows) => rows.filter((row) => !picked.includes(row.id))); setNote(`Deleted ${count}`); setPicked([]); })}</PopoverBulkActionGroup>
          </PopoverBulkAction>
        ) : null}
      </div>
    </div>
  );
}

function PopoverContextMenuExample() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  // The menu belongs to the ⋯ button: anchor it there, not to the whole card.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const items: PopoverItemData[] = [
    { id: "rename", label: "Rename", leading: <Icon name="icon-edit-02-line" decorative /> },
    { id: "duplicate", label: "Duplicate", leading: <Icon name="icon-copy-line" decorative /> },
    { id: "move", label: "Move to…", leading: <Icon name="icon-folder-line" decorative />, disabled: true, caption: "No other projects" },
    { id: "archive", label: "Archive", leading: <Icon name="icon-archive-line" decorative /> },
  ];
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <div className="pe-anchor" style={{ width: "100%" }}>
        <Card theme="border" spacing="small" className="pe-list-card">
          <ListItem as="div" title="Q3 roadmap.fig" caption="Edited 2 hours ago" leading={<DockIcon icon="icon-file-doc-line" theme="blue" background="subtle" size="small" />}
            trailing={<IconButton ref={triggerRef} appearance="main" level="tertiary" size="md" aria-label="More actions" aria-expanded={open} onClick={() => setOpen(!open)} icon={<Icon name="icon-dots-horizontal-line" />} />} />
        </Card>
        <Popover open={open} onOpenChange={setOpen} anchorRef={triggerRef} align="end" items={items} onSelect={(item) => { setLast(String(item.label)); setOpen(false); triggerRef.current?.focus(); }} />
      </div>
      <Text as="span" tone="base">{last ? `Last action: ${last}` : "Open the ⋯ menu."}</Text>
    </Stack>
  );
}

function TagInvalidRecipientsExample() {
  const [emails, setEmails] = useState(["ava@zen.studio", "bao@zen", "chi@zen.studio"]);
  const valid = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const invalid = emails.filter((email) => !valid(email));
  return (
    <Stack gap="xs" align="stretch">
      <Stack direction="row" gap="2xs" align="center" wrap style={{ flexWrap: "wrap" }}>
        {emails.map((email) => <Tag key={email} error={!valid(email)} leading={<Icon name="icon-mail-01-line" decorative />} remove onRemove={() => setEmails(emails.filter((e) => e !== email))}>{email}</Tag>)}
      </Stack>
      <Text as="span" tone={invalid.length ? "strongest" : "base"}>{invalid.length ? `${plural(invalid.length, "address", "addresses")} ${invalid.length === 1 ? "needs" : "need"} fixing before sending.` : "All recipients look good."}</Text>
    </Stack>
  );
}

/** A real filter side panel: header with the applied count + Clear all, one Divider accordion per facet (the title
 *  carries a Badge-Counter of its selections), and a primary "Show N" action with the live result count. */
function AccordionFiltersExample() {
  const facets = [
    { id: "team", title: "Team", options: [{ id: "design", label: "Design" }, { id: "eng", label: "Engineering" }, { id: "ops", label: "Operations" }] },
    { id: "status", title: "Status", options: [{ id: "active", label: "Active" }, { id: "paused", label: "Paused" }, { id: "archived", label: "Archived" }] },
    { id: "owner", title: "Owner", options: people.slice(0, 3).map((person) => ({ id: person.id, label: person.name })) },
  ];
  const projects = [
    { team: "design", status: "active", owner: "ava" }, { team: "design", status: "paused", owner: "chi" }, { team: "eng", status: "active", owner: "bao" },
    { team: "eng", status: "active", owner: "ava" }, { team: "eng", status: "archived", owner: "bao" }, { team: "ops", status: "active", owner: "chi" },
    { team: "ops", status: "paused", owner: "ava" }, { team: "design", status: "active", owner: "bao" },
  ] as Array<Record<string, string>>;
  const [selected, setSelected] = useState<Record<string, string[]>>({ team: ["design"], status: [], owner: [] });
  const toggle = (facet: string, option: string) => setSelected((all) => ({ ...all, [facet]: all[facet].includes(option) ? all[facet].filter((o) => o !== option) : [...all[facet], option] }));
  const applied = Object.values(selected).reduce((sum, list) => sum + list.length, 0);
  const results = projects.filter((project) => facets.every((facet) => !selected[facet.id].length || selected[facet.id].includes(project[facet.id]))).length;
  return (
    <Card theme="border" spacing="small" className="pe-filter-panel" as="section" aria-label="Filters">
      <header className="pe-filter-panel__head">
        <span className="pe-row" style={{ gap: 8 }}><Text as="span" textStyle="Heading/4">Filters</Text>{applied ? <BadgeCounter size="small" theme="neutral" background="subtle" value={applied} /> : null}</span>
        <Button appearance="main" level="tertiary" size="sm" disabled={!applied} onClick={() => setSelected({ team: [], status: [], owner: [] })}>Clear all</Button>
      </header>
      <div className="pe-filter-panel__facets">
        {facets.map((facet, index) => (
          <Accordion key={facet.id} size="medium" defaultExpanded={index < 2}
            title={<span className="pe-filter-panel__facet-title">{facet.title}{selected[facet.id].length ? <BadgeCounter size="xsmall" theme="neutral" background="subtle" value={selected[facet.id].length} /> : null}</span>}>
            <div className="pe-filter-panel__options">
              {facet.options.map((option) => <Checkbox key={option.id} label={option.label} checked={selected[facet.id].includes(option.id)} onChange={() => toggle(facet.id, option.id)} />)}
            </div>
          </Accordion>
        ))}
      </div>
      <Button appearance="main" level="primary" size="md" className="pe-filter-panel__submit" disabled={!results}>{results ? `Show ${results} ${results === 1 ? "project" : "projects"}` : "No matching projects"}</Button>
    </Card>
  );
}

function AlertRetryExample() {
  const [state, setState] = useState<"error" | "retrying" | "ok">("error");
  const retry = () => { setState("retrying"); window.setTimeout(() => setState("ok"), 900); };
  return (
    <Stack gap="xs" align="stretch" style={{ width: "100%" }}>
      {state === "error" ? <AlertBanner theme="negative" action={{ label: "Retry", onClick: retry }}>We couldn't load your invoices.</AlertBanner> : null}
      {state === "retrying" ? <AlertBanner theme="info">Retrying…</AlertBanner> : null}
      {state === "ok" ? <AlertBanner theme="positive" onClose={() => setState("error")}>Invoices loaded.</AlertBanner> : null}
    </Stack>
  );
}

function PaginationAuditLogExample() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows = pageOf(auditLog, page, pageSize);
  const first = (page - 1) * pageSize + 1;
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <ScrollBox label={`Audit log ${first}–${first + rows.length - 1} of ${auditLog.length}`} resetKey={`${page}-${pageSize}`}>
        <Table aria-label="Audit log" rows={rows} getRowId={(row) => String(row.id)}
          columns={[
            { id: "time", header: "Time", cell: (row) => <TableText>{row.time}</TableText> },
            { id: "actor", header: "Member", cell: (row) => <TableText>{row.actor}</TableText> },
            { id: "event", header: "Event", cell: (row) => <TableText>{row.event}</TableText> },
          ]} />
      </ScrollBox>
      <Pagination theme="manually" page={page} onPageChange={setPage} total={auditLog.length} pageSize={pageSize} onPageSizeChange={(v) => { setPageSize(v); setPage(1); }} aria-label="Audit log pages" />
    </Stack>
  );
}

function ToastExportExample() {
  const [state, setState] = useState<"idle" | "done">("idle");
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap><Button level="primary" size="sm" onClick={() => setState("done")}>Export CSV</Button></Stack>
      {state === "done" ? <Toast type="positive" title="Export ready" action={{ label: "Download", onClick: () => setState("idle") }} onClose={() => setState("idle")}>members-2026-09.csv · 48 KB</Toast> : <Text as="span" tone="light">Exports finish in the background and notify you here.</Text>}
    </Stack>
  );
}

function SkeletonTableExample() {
  const rows = ["a", "b", "c", "d"];
  return (
    <div aria-busy="true" aria-label="Loading invoices" style={{ width: "100%" }}>
      <Table aria-label="Invoices (loading)" rows={rows} getRowId={(row) => row}
        columns={[
          { id: "invoice", header: "Invoice", width: "50%", cell: () => <span className="pe-row" style={{ flexWrap: "nowrap" }}><SkeletonShape shape="round" size="xsmall" /><SkeletonText lines={1} /></span> },
          { id: "status", header: "Status", cell: () => <SkeletonShape shape="pill" size="xsmall" /> },
          { id: "amount", header: "Amount", align: "right", cell: () => <SkeletonText lines={1} style={{ width: 60, marginInlineStart: "auto" }} /> },
        ]} />
    </div>
  );
}

function DateBirthdayExample() {
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | null>(null);
  // Opens on June 1995. A controlled month needs onMonthChange, or Previous / Next and the month/year wheel do nothing.
  const [month, setMonth] = useState(() => new Date(1995, 5, 1));
  return (
    <Stack gap="sm" align="center">
      <div className="pe-inline-picker"><DatePicker value={date} onValueChange={setDate} maxDate={today} month={month} onMonthChange={setMonth} /></div>
      <Text as="span" tone="base">{date ? `Birthday: ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "No birthday set"}</Text>
    </Stack>
  );
}

/* ───────────── Divider · Inline Message · Empty State · Stepper · Slider ───────────── */

function DividerSettingsExample() {
  const rows = [["Display name", "Ava Chen"], ["Email", "ava@zen.studio"], ["Time zone", "GMT+7 · Ho Chi Minh"]];
  return (
    <Stack gap="none" align="stretch" style={{ width: "100%" }}>
      {rows.map(([label, value], index) => (
        <Fragment key={label}>
          {index > 0 ? <Divider /> : null}
          <Stack direction="row" gap="xs" align="center" wrap justify="between" style={{ padding: "12px 0" }}>
            <Text as="span" tone="base">{label}</Text>
            <Text as="span" textStyle="Body/Base/Medium">{value}</Text>
          </Stack>
        </Fragment>
      ))}
    </Stack>
  );
}

function DividerToolbarExample() {
  const { toast } = useToast();
  const [marks, setMarks] = useState<string[]>(["bold"]);
  const toggle = (id: string) => setMarks((current) => current.includes(id) ? current.filter((m) => m !== id) : [...current, id]);
  return (
    <Stack direction="row" gap="2xs" align="center" role="toolbar" aria-label="Formatting">
      {([["bold", "icon-bold-01-line"], ["italic", "icon-italic-01-line"], ["underline", "icon-underline-01-line"]] as const).map(([id, icon]) => (
        <Fragment key={id}>
          {/* zen-allow-secondary: pressed toolbar toggle (the documented Secondary case). */}
          <IconButton appearance="main" level={marks.includes(id) ? "secondary" : "tertiary"} size="sm" aria-label={id[0].toUpperCase() + id.slice(1)} aria-pressed={marks.includes(id)} onClick={() => toggle(id)} icon={<Icon name={icon} />} />
        </Fragment>
      ))}
      <Divider orientation="vertical" decorative />
      {/* zen-allow-secondary: pressed toolbar toggle (the documented Secondary case). */}
      <IconButton appearance="main" level={marks.includes("align-left") ? "secondary" : "tertiary"} size="sm" aria-label="Align left" aria-pressed={marks.includes("align-left")} onClick={() => toggle("align-left")} icon={<Icon name="icon-align-left-line" />} />
      <IconButton appearance="main" level="tertiary" size="sm" aria-label="Insert link" onClick={() => toast({ title: "Link inserted" })} icon={<Icon name="icon-link-01-line" />} />
    </Stack>
  );
}

function DividerReceiptExample() {
  const lines = [["Pro plan · 5 seats", "$60.00"], ["Extra storage", "$8.00"], ["Discount", "−$6.80"]];
  return (
    <Stack gap="xs" align="stretch" style={{ width: "100%" }}>
      {lines.map(([label, amount]) => <Stack direction="row" gap="xs" align="center" wrap justify="between" key={label}><Text as="span" tone="base">{label}</Text><Text as="span">{amount}</Text></Stack>)}
      <Divider color="high" />
      <Stack direction="row" gap="xs" align="center" wrap justify="between"><Text as="span" textStyle="Body/Base/Bold">Total</Text><Text as="span" textStyle="Body/Base/Bold">$61.20</Text></Stack>
    </Stack>
  );
}

function DividerLabelledExample() {
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Button appearance="main" level="primary" size="md">Continue with email</Button>
      <Stack direction="row" gap="sm" align="center">
        <Divider dashed decorative />
        <Text as="span" textStyle="Caption/Regular" tone="light">or</Text>
        <Divider dashed decorative />
      </Stack>
      <Button appearance="main" level="tertiary" size="md" startIcon={<Icon name="ic-figma-line" decorative />}>Continue with Figma</Button>
    </Stack>
  );
}

function InlineContextExample() {
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <InlineMessage theme="warning" title="You're editing production">Changes publish to 12 live sites as soon as you save.</InlineMessage>
      <InputField label="Site title" defaultValue="Zen Studio" />
    </Stack>
  );
}

function InlineUpgradeExample() {
  const [open, setOpen] = useState(true);
  return open
    ? <InlineMessage theme="info" title="Version history is limited to 30 days" action={{ label: "View plans" }} onClose={() => setOpen(false)}>Upgrade to Pro to keep every version forever.</InlineMessage>
    : <Button appearance="main" level="tertiary" size="sm" onClick={() => setOpen(true)}>Show message again</Button>;
}

function InlineVerifyExample() {
  const [state, setState] = useState<"idle" | "checking" | "done">("idle");
  const verify = () => { setState("checking"); window.setTimeout(() => setState("done"), 700); };
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <InputField label="Custom domain" defaultValue="docs.zen.studio" readOnly />
      {state === "done"
        ? <InlineMessage theme="positive" title="Domain verified">DNS records found. HTTPS is ready in a few minutes.</InlineMessage>
        : <Button appearance="main" level="primary" size="sm" style={{ alignSelf: "flex-start" }} onClick={verify} disabled={state === "checking"}>{state === "checking" ? "Checking DNS…" : "Verify domain"}</Button>}
    </Stack>
  );
}

function InlineFormErrorsExample() {
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <InlineMessage theme="negative" title="2 fields need attention">Fix the highlighted fields, then submit again.</InlineMessage>
      <InputField label="Card number" defaultValue="4242 4242" error="Enter all 16 digits." />
      <InputField label="Expiry" defaultValue="13/28" error="Month must be 01–12." />
    </Stack>
  );
}

function InlineCustomVisualExample() {
  return (
    <InlineMessage theme="custom" icon={<Avatar size="small" theme="blue" alt="">AC</Avatar>} title="Ava shared “Q4 roadmap”" action={{ label: "Open file" }}>You can comment; ask Ava for edit access.</InlineMessage>
  );
}

function EmptySearchExample() {
  const [query, setQuery] = useState("tokns");
  const items = ["Button", "Chip", "Tokens", "Typography"];
  const results = items.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Search placeholder="Search components" value={query} onChange={(event) => setQuery(event.target.value)} clearable onClear={() => setQuery("")} />
      {results.length
        ? <List aria-label="Results">{results.map((item) => <ListItem key={item} title={item} />)}</List>
        : <EmptyState title={`No results for “${query}”`} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Check the spelling or try a broader term.</EmptyState>}
    </Stack>
  );
}

function EmptyFirstRunExample() {
  return <EmptyState title="Your inbox is empty" icon="icon-mail-01-line" primaryAction={{ label: "Compose message" }}>Messages from your team and clients land here.</EmptyState>;
}

function EmptyFilteredExample() {
  const [status, setStatus] = useState<string | null>("Blocked");
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" size="small" dropdown select={Boolean(status)} onClearSelection={() => setStatus(null)} popoverLabel="Status" popoverItems={["Todo", "Blocked", "Done"].map((id) => ({ id, label: id, selected: status === id }))} onPopoverSelect={(item) => setStatus(String(item.id))}>{status ?? "Status"}</Chip>
      </Stack>
      {status === "Blocked"
        ? <EmptyState title="No blocked tasks" illustration={false} secondaryAction={{ label: "Clear filters", onClick: () => setStatus(null) }}>Nothing is stuck right now. Nice.</EmptyState>
        : <List aria-label="Tasks">{["Audit tokens", "Ship Slider", "Write docs"].map((task) => <ListItem key={task} title={task} />)}</List>}
    </Stack>
  );
}

function EmptyPermissionExample() {
  const [requested, setRequested] = useState(false);
  return <EmptyState title="You don't have access" icon="icon-lock-01-line" primaryAction={requested ? undefined : { label: "Request access", onClick: () => setRequested(true) }} secondaryAction={{ label: "Back to projects" }}>{requested ? "Request sent to the workspace owner. We'll email you when it's approved." : "Ask the workspace owner to add you to “Finance Q4”."}</EmptyState>;
}

const checkoutSteps: StepperStep[] = [
  { id: "cart", title: "Cart", caption: "3 items" },
  { id: "shipping", title: "Shipping", caption: "Address" },
  { id: "payment", title: "Payment", caption: "Card" },
  { id: "review", title: "Review" },
];

function StepperCheckoutExample() {
  const [current, setCurrent] = useState(1);
  return (
    <Stack gap="lg" align="stretch" style={{ width: "100%" }}>
      <Stepper aria-label="Checkout" steps={checkoutSteps} current={current} onStepClick={(_, index) => setCurrent(index)} />
      <Stack direction="row" gap="xs" align="center" wrap justify="end">
        <Button appearance="main" level="tertiary" size="sm" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Back</Button>
        <Button appearance="main" level="primary" size="sm" onClick={() => setCurrent(Math.min(current + 1, checkoutSteps.length - 1))}>{current === checkoutSteps.length - 1 ? "Place order" : `Continue to ${String(checkoutSteps[current + 1]?.title ?? "").toLowerCase()}`}</Button>
      </Stack>
    </Stack>
  );
}

function StepperVerticalExample() {
  const [current, setCurrent] = useState(1);
  const steps: StepperStep[] = [
    { id: "profile", title: "Create your profile", caption: "2 minutes" },
    { id: "workspace", title: "Name your workspace", caption: "You can rename it later" },
    { id: "invite", title: "Invite your team", caption: "Optional" },
    { id: "figma", title: "Connect Figma", caption: "Sync tokens" },
  ];
  const details = [
    "Add your name and a photo so teammates recognise you.",
    "Pick a name for the workspace. It shows in the sidebar and in invite emails.",
    "Invite teammates by email. You can skip this and do it later from Members.",
    "Connect a Figma file to sync variables and text styles into Zen tokens.",
  ];
  const last = current === steps.length - 1;
  return (
    <div className="pe-stepper-layout">
      <Stepper aria-label="Onboarding" orientation="vertical" steps={steps} current={current} onStepClick={(_, index) => setCurrent(index)} className="pe-stepper-rail" />
      <section className="pe-stepper-panel" aria-live="polite">
        <Text as="span" textStyle="Body/Small/Medium" tone="light">Step {current + 1} of {steps.length}</Text>
        <Text as="span" textStyle="Heading/4">{String(steps[current].title)}</Text>
        <Text as="span" tone="base">{details[current]}</Text>
        <div className="pe-row pe-stepper-panel__actions">
          <Button appearance="main" level="tertiary" size="sm" disabled={current === 0} onClick={() => setCurrent(Math.max(current - 1, 0))}>Back</Button>
          <Button appearance="main" level="primary" size="sm" onClick={() => setCurrent(Math.min(current + 1, steps.length - 1))}>{last ? "Finish" : "Next step"}</Button>
        </div>
      </section>
    </div>
  );
}

function StepperErrorExample() {
  const [fixed, setFixed] = useState(false);
  const steps: StepperStep[] = [
    { id: "upload", title: "Upload", caption: "tokens.json" },
    { id: "validate", title: "Validate", caption: fixed ? "Passed" : "3 invalid tokens", error: !fixed },
    { id: "publish", title: "Publish" },
  ];
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%", gap: 20 }}>
      <Stepper aria-label="Token import" steps={steps} current={fixed ? 2 : 1} />
      {fixed
        ? <InlineMessage theme="positive" title="Ready to publish">All 1,240 tokens are valid.</InlineMessage>
        : <InlineMessage theme="negative" title="3 tokens reference missing values" action={{ label: "Fix automatically", onClick: () => setFixed(true) }}>Color/Brand/Hover, Radius/Card and Spacing/Hero point to deleted variables.</InlineMessage>}
    </Stack>
  );
}

function StepperIconExample() {
  const steps: StepperStep[] = [
    { id: "ordered", title: "Ordered", caption: "Sep 24", icon: "icon-package-line" },
    { id: "paid", title: "Paid", caption: "Sep 24", icon: "icon-credit-card-line" },
    { id: "shipped", title: "Shipped", caption: "Sep 25", icon: "icon-package-check-line" },
    { id: "delivered", title: "Delivered", caption: "Est. Sep 28", icon: "icon-home-01-line" },
  ];
  return <Stepper aria-label="Order status" steps={steps} current={2} />;
}

function SliderVolumeExample() {
  const [volume, setVolume] = useState(64);
  return (
    <Stack direction="row" gap="sm" align="center" style={{ width: "100%" }}>
      <Slider aria-label="Volume" value={volume} onChange={setVolume} icon="icon-volume-max-solid" valueText={(value) => `${value}%`} />
      <Text as="span" textStyle="Body/Small/Regular" tone="base">{volume}%</Text>
    </Stack>
  );
}

function SliderMediaExample() {
  const [brightness, setBrightness] = useState(70);
  return (
    <div className="pe-media-slider" style={{ filter: `brightness(${0.5 + brightness / 100})` }}>
      <Slider aria-label="Brightness" theme="white" size="large" value={brightness} onChange={setBrightness} icon="icon-sun-solid" valueText={(value) => `${value}%`} />
    </div>
  );
}

function SliderStorageExample() {
  const [gb, setGb] = useState(120);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap justify="between">
        <Text as="span" textStyle="Body/Base/Medium">Storage per seat</Text>
        <Text as="span" textStyle="Body/Base/Bold">{gb} GB</Text>
      </Stack>
      <Slider aria-label="Storage per seat" theme="accent" size="small" min={10} max={500} step={10} value={gb} onChange={setGb} showLimits valueText={(value) => `${value} gigabytes`} />
      <Text as="span" textStyle="Caption/Regular" tone="light">≈ ${(gb * 0.02).toFixed(2)} per seat each month</Text>
    </Stack>
  );
}

function SliderFontSizeExample() {
  const [size, setSize] = useState(16);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Slider aria-label="Reading size" size="large" min={12} max={24} value={size} onChange={setSize} icon="icon-type-02-solid" valueText={(value) => `${value} pixels`} />
      {/* data-audit-skip-type: the slider sets this size on purpose (a reading-size preview), so it is off the type scale. */}
      <p data-audit-skip-type="" style={{ margin: 0, fontSize: size, lineHeight: 1.5, color: "var(--zen-color-content-neutral-strongest)" }}>The quick brown fox jumps over the lazy dog.</p>
    </Stack>
  );
}

/* ───────────── Card · Dock Icon · List Item · Table ───────────── */

function CardProjectGridExample() {
  const [picked, setPicked] = useState("web");
  const projects = [
    { id: "web", name: "Zen website", meta: "12 pages · Ava", icon: "icon-globe-02-line" as const, theme: "blue" as const },
    { id: "tokens", name: "Token pipeline", meta: "1,240 variables · Bao", icon: "icon-colors-line" as const, theme: "purple" as const },
    { id: "mobile", name: "Mobile kit", meta: "38 screens · Chi", icon: "icon-mobile-line" as const, theme: "orange" as const },
  ];
  return (
    <div className="pe-card-grid">
      {projects.map((project) => (
        <Card key={project.id} theme="border" spacing="small" active={picked === project.id} onClick={() => setPicked(project.id)} aria-label={`${project.name}, ${project.meta}`}>
          <Stack gap="xs" align="stretch">
            <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
            <Text as="span" textStyle="Body/Base/Bold">{project.name}</Text>
            <Text as="span" textStyle="Caption/Regular" tone="light">{project.meta}</Text>
          </Stack>
        </Card>
      ))}
    </div>
  );
}

function CardStatExample() {
  return (
    <div className="pe-card-grid">
      {[["Active users", "8,930", "+12.8%", "green"], ["Churn", "2.1%", "+0.4%", "red"], ["Avg. session", "6m 12s", "0%", "neutral"]].map(([label, value, delta, trend]) => (
        <Card key={label} theme="shadow" spacing="small">
          <Stack gap="2xs" align="stretch">
            <Text as="span" textStyle="Caption/Regular" tone="light">{label}</Text>
            <Text as="span" textStyle="Heading/3">{value}</Text>
            <TableTrend trend={trend === "green" ? "up" : trend === "red" ? "down" : "neutral"}>{delta}</TableTrend>
          </Stack>
        </Card>
      ))}
    </div>
  );
}

function CardSubActionExample() {
  const [open, setOpen] = useState(false);
  // Anchor the menu to the Sub-Action button itself (not the card), so it opens right under the "…".
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="pe-anchor" style={{ width: "100%" }}>
      <Card theme="flat" subAction={<IconButton ref={triggerRef} appearance="flat" level="primary" size="sm" aria-label="Card actions" aria-expanded={open} onClick={() => setOpen(!open)} icon={<Icon name="icon-dots-horizontal-line" />} />}>
        <Stack gap="sm" align="stretch">
          <Text as="span" textStyle="Body/Base/Bold">Q4 design review</Text>
          <Text as="span" tone="base">Walk through the Slider, Stepper and Table specs with engineering.</Text>
          <AvatarStack size="small" items={people.slice(0, 3).map((person) => ({ src: person.photo, alt: person.name, theme: "photo" as const }))} />
        </Stack>
      </Card>
      <Popover open={open} onOpenChange={setOpen} anchorRef={triggerRef} align="end" items={[{ id: "edit", label: "Edit" }, { id: "share", label: "Share" }, { id: "archive", label: "Archive" }]} onSelect={() => { setOpen(false); triggerRef.current?.focus(); }} />
    </div>
  );
}

function CardSurfacesExample() {
  return (
    <div className="pe-card-grid pe-card-grid--surfaces">
      {(["shadow", "flat", "border", "pale", "semi-pale"] as const).map((theme) => (
        <Card key={theme} theme={theme} spacing="small"><Text as="span" textStyle="Body/Small/Bold">{theme}</Text><Text as="span" textStyle="Caption/Regular" tone="light">Theme={theme}</Text></Card>
      ))}
    </div>
  );
}

function DockIconAppsExample() {
  const apps = [["Figma", "ic-figma-line", "purple"], ["Mail", "icon-mail-01-line", "blue"], ["Calendar", "icon-calendar-line", "red"], ["Files", "icon-folder-line", "yellow"], ["Chat", "icon-message-chat-circle-line", "green"], ["Tokens", "icon-colors-line", "accent"]] as const;
  return (
    <div className="pe-app-grid">
      {apps.map(([name, icon, theme]) => (
        <button key={name} type="button" className="pe-app-tile"><DockIcon icon={icon} theme={theme} size="large" /><Text as="span" textStyle="Caption/Regular">{name}</Text></button>
      ))}
    </div>
  );
}

function DockIconCategoriesExample() {
  return (
    <List aria-label="Spending">
      {([["Groceries", "$412.80", "icon-shopping-bag-01-line", "green"], ["Transport", "$96.20", "icon-car-01-line", "blue"], ["Eating out", "$184.50", "icon-coffee-cup-line", "orange"]] as const).map(([name, amount, icon, theme]) => (
        <ListItem key={name} title={name} caption="This month" leading={<DockIcon icon={icon} theme={theme} background="subtle" />} trailing={<Text as="span" textStyle="Body/Base/Bold">{amount}</Text>} />
      ))}
    </List>
  );
}

function DockIconEmojiExample() {
  const [reaction, setReaction] = useState("🎉");
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap role="radiogroup" aria-label="Reaction">
        {["🎉", "👏", "🔥", "💡"].map((emoji) => (
          <button key={emoji} type="button" role="radio" aria-checked={reaction === emoji} aria-label={`React ${emoji}`} className="pe-emoji-choice" onClick={() => setReaction(emoji)}>
            <DockIcon theme="emoji" emoji={emoji} size="medium" />
          </button>
        ))}
      </Stack>
      <Text as="span" tone="base">You reacted {reaction}</Text>
    </Stack>
  );
}

function DockIconOnColorExample() {
  return (
    <div className="pe-on-color">
      <DockIcon icon="icon-star-93-solid" theme="on-color" size="large" />
      <Stack gap="3xs" align="stretch">
        <Text as="span" textStyle="Body/Base/Bold">Pro trial</Text>
        <Text as="span" textStyle="Caption/Regular">12 days left</Text>
      </Stack>
    </div>
  );
}

function ListItemInboxExample() {
  const [selected, setSelected] = useState("m1");
  const mails = [{ id: "m1", from: "Ava Chen", subject: "Slider spec is ready", time: "9:41" }, { id: "m2", from: "Bao Nguyen", subject: "Token pipeline PR", time: "Yesterday" }, { id: "m3", from: "Chi Tran", subject: "Mobile kit review", time: "Mon" }];
  return (
    <List aria-label="Inbox">
      {mails.map((mail, index) => (
        <ListItem key={mail.id} title={mail.from} caption={mail.subject} selected={selected === mail.id} onClick={() => setSelected(mail.id)}
          leading={<Avatar size="medium" theme="photo" src={people[index].photo} alt="" />}
          trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{mail.time}</Text>} />
      ))}
    </List>
  );
}

function ListItemSettingsExample() {
  return (
    <Card theme="border" spacing="small" className="pe-list-card">
      <List aria-label="Settings">
        {([["Profile", "Name, photo, bio", "icon-user-circle-line"], ["Notifications", "Email, push, digest", "icon-bell-01-line"], ["Security", "Password, 2FA, sessions", "icon-lock-01-line"]] as const).map(([title, caption, icon]) => (
          <ListItem key={title} title={title} caption={caption} href="#settings" leading={<DockIcon icon={icon} theme="pale" size="small" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />
        ))}
      </List>
    </Card>
  );
}

function ListItemActionsExample() {
  const [members, setMembers] = useState(people.slice(0, 3));
  return (
    <List aria-label="Pending invites">
      {members.map((person) => (
        <ListItem key={person.id} title={person.name} caption={`${person.role} · invited 2d ago`} leading={<Avatar size="medium" theme="photo" src={person.photo} alt="" />}
          trailing={<><IconButton appearance="flat" level="primary" size="md" aria-label={`Resend invite to ${person.name}`} icon={<Icon name="icon-mail-01-line" />} /><IconButton appearance="flat" level="primary" size="md" aria-label={`Revoke invite for ${person.name}`} onClick={() => setMembers(members.filter((m) => m.id !== person.id))} icon={<Icon name="icon-x-small-line" />} /></>} />
      ))}
      {members.length === 0 ? <li className="pe-empty"><Text as="span" tone="light">No pending invites.</Text></li> : null}
    </List>
  );
}

function ListItemCustomContentExample() {
  return (
    <List aria-label="Uploads">
      {[["brand-kit.zip", 72], ["hero-video.mp4", 34]].map(([name, value]) => (
        <ListItem key={String(name)} title={String(name)} leading={<FileIcon format={fileIconFormatOf(String(name))} size="xl" />}>
          <span className="pe-stack" style={{ gap: 4 }}>
            <Text as="span" textStyle="Body/Base/Bold">{name}</Text>
            <ProgressBar value={Number(value)} theme="accent" label={`${value}%`} />
          </span>
        </ListItem>
      ))}
    </List>
  );
}

const tableMembers = [
  { id: "ava", role: "Admin", seats: 3, last: "Today", status: "Active" },
  { id: "bao", role: "Editor", seats: 1, last: "Yesterday", status: "Active" },
  { id: "chi", role: "Viewer", seats: 1, last: "Sep 12", status: "Invited" },
  { id: "dan", role: "Editor", seats: 2, last: "Sep 3", status: "Suspended" },
];

function TableMembersExample() {
  const [sort, setSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });
  const rows = tableMembers.map((row, index) => ({ ...row, person: people[index % people.length] }))
    .sort((a, b) => !sort ? 0 : (sort.columnId === "name" ? a.person.name.localeCompare(b.person.name) : a.seats - b.seats) * (sort.direction === "asc" ? 1 : -1));
  return (
    <Table aria-label="Members" rows={rows} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
      columns={[
        { id: "name", header: "Member", sortable: true, cell: (row) => <TableMedia media={<Avatar size="small" theme="photo" src={row.person.photo} alt="" />} caption={row.person.role}>{row.person.name}</TableMedia> },
        { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> },
        { id: "status", header: "Status", cell: (row) => <Badge size="medium" background="subtle" theme={row.status === "Active" ? "green" : row.status === "Invited" ? "blue" : "red"}>{row.status}</Badge> },
        { id: "seats", header: "Seats", sortable: true, align: "right", cell: (row) => <TableText>{row.seats}</TableText> },
        { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="sm" aria-label={`Edit ${row.person.name}`} icon={<Icon name="icon-edit-02-line" />} /></TableActions> },
      ]} />
  );
}

function TableInvoicesExample() {
  const all = Array.from({ length: 42 }, (_, i) => ({ id: `INV-${2400 + i}`, customer: ["Acme", "Globex", "Initech", "Umbrella"][i % 4], amount: 49 + (i * 37) % 900, paid: i % 5 !== 0 }));
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const rows = all.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Table aria-label="Invoices" rows={rows} getRowId={(row) => row.id}
        columns={[
          { id: "id", header: "Invoice", icon: "icon-file-doc-line", cell: (row) => <TableText bold>{row.id}</TableText> },
          { id: "customer", header: "Customer", cell: (row) => <TableText caption="Net 30">{row.customer}</TableText> },
          { id: "status", header: "Status", cell: (row) => <Badge size="medium" background="subtle" theme={row.paid ? "green" : "yellow"}>{row.paid ? "Paid" : "Due"}</Badge> },
          { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>${row.amount.toFixed(2)}</TableText> },
        ]} />
      <Pagination theme="inline" page={page} onPageChange={setPage} total={all.length} pageSize={pageSize} aria-label="Invoice pages" />
    </Stack>
  );
}

function TableEmptyExample() {
  const [query, setQuery] = useState("zzz");
  const rows = tableMembers.filter((row) => row.id.includes(query.trim().toLowerCase()) || !query.trim());
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Search size="small" placeholder="Filter members" value={query} onChange={(event) => setQuery(event.target.value)} clearable onClear={() => setQuery("")} />
      <Table aria-label="Filtered members" rows={rows} getRowId={(row) => row.id}
        empty={<EmptyState title={`No members match “${query}”`} illustration={false} secondaryAction={{ label: "Clear filter", onClick: () => setQuery("") }} />}
        columns={[
          { id: "id", header: "Member", cell: (row) => <TableText bold>{row.id}</TableText> },
          { id: "role", header: "Role", cell: (row) => <TableText>{row.role}</TableText> },
        ]} />
    </Stack>
  );
}

/* ───────────── Rating · Color Selector · Metric · Uploader · Side Panel ───────────── */

function RatingSummaryExample() {
  const bars = [[5, 68], [4, 21], [3, 6], [2, 3], [1, 2]] as const;
  return (
    <Stack direction="row" gap="lg" align="center" wrap style={{ alignItems: "flex-start", width: "100%", flexWrap: "wrap" }}>
      <Stack gap="2xs" align="stretch">
        <Text as="span" textStyle="Display/4">4.6</Text>
        <RatingDisplay value={4.6} size="medium" />
        <Text as="span" textStyle="Caption/Regular" tone="light">1,284 reviews</Text>
      </Stack>
      <Stack gap="sm" align="stretch" style={{ gap: 6, flex: "1 1 200px" }}>
        {bars.map(([stars, pct]) => <Stack direction="row" gap="xs" align="center" key={stars}><Text as="span" textStyle="Caption/Regular" tone="base">{stars}★</Text><div style={{ flex: 1 }}><ProgressBar value={pct} theme="neutral" aria-label={`${stars} stars: ${pct}%`} /></div><Text as="span" textStyle="Caption/Regular" tone="light">{pct}%</Text></Stack>)}
      </Stack>
    </Stack>
  );
}

function RatingReviewExample() {
  const [stars, setStars] = useState(0);
  const [sent, setSent] = useState(false);
  const words = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  if (sent) return <InlineMessage theme="positive" title="Thanks for your review" action={{ label: "Edit review", onClick: () => setSent(false) }}>You rated this template {stars} out of 5.</InlineMessage>;
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap><Rating aria-label="Rate the Dashboard template" value={stars} onChange={setStars} size="large" /><Text as="span" tone="base">{words[stars] || "Tap a star"}</Text></Stack>
      <TextAreaField label="What did you like?" placeholder="Optional" />
      <Stack direction="row" gap="xs" align="center" wrap justify="end"><Button appearance="main" level="primary" size="sm" disabled={!stars} onClick={() => setSent(true)}>Submit review</Button></Stack>
    </Stack>
  );
}

function RatingOpinionExample() {
  const [mood, setMood] = useState<OpinionEmotion | null>(null);
  return (
    <Card theme="border" spacing="small">
      <Stack gap="sm" align="stretch">
        <Text as="span" textStyle="Body/Base/Bold">How was setting up your workspace?</Text>
        <OpinionScale scale={3} value={mood} onChange={setMood} aria-label="How was setting up your workspace?" />
        {mood === "disappointed" ? <TextAreaField label="What went wrong?" placeholder="Tell us so we can fix it" /> : mood ? <Text as="span" tone="base">Glad to hear it — thanks!</Text> : null}
      </Stack>
    </Card>
  );
}

function RatingNpsExample() {
  const [score, setScore] = useState<number | null>(null);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Text as="span" textStyle="Body/Base/Bold">How likely are you to recommend Zen to a colleague?</Text>
      <NpsScale scale={10} value={score} onChange={setScore} lowLabel="Not likely" highLabel="Very likely" aria-label="How likely are you to recommend Zen to a colleague?" />
      {score !== null ? <Text as="span" tone="base">{score >= 9 ? "Promoter" : score >= 7 ? "Passive" : "Detractor"} · score {score}</Text> : null}
    </Stack>
  );
}

const labelColors = [["blue", "Blue"], ["green", "Green"], ["yellow", "Yellow"], ["orange", "Orange"], ["red", "Red"], ["purple", "Purple"]] as const;

function ColorLabelExample() {
  const [color, setColor] = useState<(typeof labelColors)[number][0]>("blue");
  return (
    <Stack gap="sm" align="stretch">
      <InputField label="Label name" defaultValue="Design review" />
      {/* Swatch values are the Support Solid tokens; the chosen id drives the Badge theme. */}
      <ColorSelector aria-label="Label colour" value={`var(--zen-color-background-support-${color}-solid)`} onChange={(value) => setColor((labelColors.find(([id]) => value.includes(`support-${id}-`))?.[0] ?? "blue") as typeof color)} colors={labelColors.map(([id, label]) => ({ value: `var(--zen-color-background-support-${id}-solid)`, label, contrast: id === "yellow" ? "dark" as const : undefined }))} className="pe-swatches" />
      <Stack direction="row" gap="xs" align="center" wrap><Text as="span" tone="base">Preview</Text><Badge size="small" theme={color} background="subtle">Design review</Badge></Stack>
    </Stack>
  );
}

function ColorEventExample() {
  const [color, setColor] = useState("var(--zen-color-background-support-purple-solid)");
  const colors = ["purple", "blue", "teal", "orange", "pink"].map((name) => ({ value: `var(--zen-color-background-support-${name}-solid)`, label: name[0].toUpperCase() + name.slice(1) }));
  return (
    <Card theme="shadow" spacing="small">
      <Stack gap="sm" align="stretch">
        <Stack direction="row" gap="sm" align="center"><span style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: color }} aria-hidden="true" /><Stack gap="3xs" align="stretch"><Text as="span" textStyle="Body/Base/Bold">Sprint planning</Text><Text as="span" textStyle="Caption/Regular" tone="light">Mon 10:00 – 11:00</Text></Stack></Stack>
        <ColorSelector aria-label="Event colour" colors={colors} value={color} onChange={setColor} />
      </Stack>
    </Card>
  );
}

function ColorBrandExample() {
  const [color, setColor] = useState("var(--zen-color-background-accent-solid-default)");
  const colors = [
    { value: "var(--zen-color-background-accent-solid-default)", label: "Zen pink" },
    { value: "var(--zen-color-background-support-indigo-solid)", label: "Indigo" },
    { value: "var(--zen-color-background-support-teal-solid)", label: "Teal" },
    { value: "var(--zen-color-background-neutral-solid-default)", label: "Ink" },
    { value: "var(--zen-color-background-white-solid-default)", label: "White", contrast: "dark" as const },
  ];
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <ColorSelector aria-label="Brand colour" colors={colors} value={color} onChange={setColor} />
      <div className="pe-brand-preview" data-contrast={colors.find((c) => c.value === color)?.contrast ?? "light"} style={{ background: color }}><Text as="span" textStyle="Body/Base/Bold">Acme workspace</Text></div>
      <Text as="span" textStyle="Caption/Regular" tone="light">Light swatches (White) get a dark check via contrast="dark".</Text>
    </Stack>
  );
}

function ColorKeyboardExample() {
  const [color, setColor] = useState("var(--zen-color-background-support-green-solid)");
  const colors = ["green", "teal", "cyan", "blue", "indigo", "violet", "purple", "plum", "pink", "crimson", "red", "orange"].map((name) => ({ value: `var(--zen-color-background-support-${name}-solid)`, label: name[0].toUpperCase() + name.slice(1) }));
  return (
    <Stack gap="sm" align="stretch">
      <ColorSelector aria-label="Chart series colour" colors={colors} value={color} onChange={setColor} />
      <Text as="span" textStyle="Caption/Regular" tone="light">Tab into the group, then use the arrow keys; focus shows the grey halo.</Text>
    </Stack>
  );
}

function MetricKpiExample() {
  return (
    <div className="pe-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <MetricCard label="Revenue" value="$48,210" icon="icon-credit-card-line" iconTheme="green" trend={{ direction: "positive", label: "+12% vs. last month" }} size="large" subAction={{ label: "Revenue actions", icon: "icon-dots-vertical-line" }} />
      <MetricCard label="Active users" value="8,930" icon="icon-users-line" iconTheme="blue" trend={{ direction: "positive", label: "+4.2% vs. last month" }} size="large" subAction={{ label: "Users actions", icon: "icon-dots-vertical-line" }} />
      <MetricCard label="Churn" value="2.1%" icon="icon-arrow-down-right-line" iconTheme="crimson" trend={{ direction: "negative", label: "+0.4 pt vs. last month" }} size="large" subAction={{ label: "Churn actions", icon: "icon-dots-vertical-line" }} />
    </div>
  );
}

const salesRanges = {
  today: [["$3,240", "+8%"], ["86", "+5%"], ["$37.70", "−2%"], ["3.1%", "+0.2 pt"]],
  week: [["$21,480", "+14%"], ["612", "+9%"], ["$35.10", "+3%"], ["2.8%", "−0.1 pt"]],
  month: [["$92,300", "+11%"], ["2,540", "+6%"], ["$36.34", "+1%"], ["2.9%", "+0.3 pt"]],
} as const;

function MetricSalesExample() {
  const [range, setRange] = useState<keyof typeof salesRanges>("week");
  const rows = salesRanges[range];
  const tiles = [
    { label: "Sales", icon: "icon-coins-stacked-01-line", theme: "golden" },
    { label: "Orders", icon: "icon-shopping-cart-line", theme: "orange" },
    { label: "Avg. order value", icon: "icon-bank-note-01-line", theme: "teal" },
    { label: "Conversion", icon: "icon-percent-01-line", theme: "violet" },
  ] as const;
  return (
    <Stack gap="md" align="stretch" style={{ width: "100%" }}>
      <Segmented options={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }, { id: "month", label: "This month" }]} value={range} onChange={(id) => setRange(id as keyof typeof salesRanges)} aria-label="Sales period" />
      <div className="pe-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {tiles.map((tile, i) => (
          <MetricCard key={tile.label} size="medium" theme="border" label={tile.label} value={rows[i][0]} icon={tile.icon} iconTheme={tile.theme}
            trend={{ direction: rows[i][1].startsWith("−") ? "negative" : "positive", label: rows[i][1] }} />
        ))}
      </div>
    </Stack>
  );
}

function MetricDepartmentsExample() {
  const departments = [
    { label: "Design", value: "$18.2K", icon: "icon-palette-line", theme: "purple" },
    { label: "Engineering", value: "$64.5K", icon: "icon-code-02-line", theme: "indigo" },
    { label: "Marketing", value: "$22.9K", icon: "icon-rocket-line", theme: "pink" },
    { label: "Support", value: "$9.4K", icon: "icon-headphones-line", theme: "cyan" },
    { label: "Logistics", value: "$12.1K", icon: "icon-truck-line", theme: "brown" },
    { label: "Infrastructure", value: "$15.7K", icon: "icon-server-01-line", theme: "plum" },
  ] as const;
  return (
    <Card theme="flat" spacing="small">
      <div className="pe-metric-grid">
        {departments.map((d) => <Metric key={d.label} size="small" label={d.label} value={d.value} icon={d.icon} iconTheme={d.theme} />)}
      </div>
    </Card>
  );
}

function MetricGoalExample() {
  return (
    <div className="pe-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      <Card theme="shadow">
        <Stack gap="md" align="stretch">
          <Metric size="medium" label="Quarterly target" value="$184K of $240K" icon="icon-target-04-line" iconTheme="accent" iconBackground="solid" />
          <ProgressBar value={77} theme="accent" label aria-label="Quarterly target progress" />
        </Stack>
      </Card>
      <Card theme="shadow">
        <Stack gap="md" align="stretch">
          <Metric size="medium" label="Deals closed" value="31 of 40" icon="icon-trophy-01-line" iconTheme="yellow" />
          <ProgressBar value={78} theme="neutral" label aria-label="Deals closed progress" />
        </Stack>
      </Card>
    </div>
  );
}

function MetricHealthExample() {
  return (
    <Card theme="border" spacing="small">
      <div className="pe-metric-row">
        <Metric size="small" label="Uptime" value="99.98%" icon="icon-activity-line" iconTheme="green" trend={{ direction: "positive", label: "30 days" }} />
        <Divider orientation="vertical" decorative />
        <Metric size="small" label="p95 latency" value="182 ms" icon="icon-lightning-01-line" iconTheme="orange" trend={{ direction: "negative", label: "+24 ms" }} />
        <Divider orientation="vertical" decorative />
        <Metric size="small" label="Errors" value="0.4%" icon="icon-alert-triangle-line" iconTheme="red" iconBackground="solid" trend={{ direction: "negative", label: "+0.1 pt" }} />
      </div>
    </Card>
  );
}

function MetricPulseExample() {
  return (
    <div className="pe-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
      <MetricCard size="large" theme="pale" label="Team mood" value="4.3 / 5" iconEmoji="😊" trend={{ direction: "positive", label: "+0.2 this week" }} />
      <MetricCard size="large" theme="pale" label="Shipping streak" value="12 days" iconEmoji="🔥" trend={{ direction: "normal", label: "Best: 18" }} />
      <MetricCard size="large" theme="pale" label="Focus time" value="18h" iconEmoji="🎧" trend={{ direction: "negative", label: "−3h" }} />
    </div>
  );
}

function MetricInlineExample() {
  return (
    <Card theme="flat" spacing="small">
      <div className="pe-metric-row">
        <Metric size="small" label="Open tickets" value="42" icon="ic-inbox-01-line" iconTheme="blue" trend={{ direction: "normal", label: "0% today" }} />
        <Divider orientation="vertical" decorative />
        <Metric size="small" label="Median reply" value="1h 12m" icon="icon-clock-line" iconTheme="teal" trend={{ direction: "positive", label: "−18m" }} />
        <Divider orientation="vertical" decorative />
        <Metric size="small" label="CSAT" value="94%" icon="icon-face-smile-line" iconTheme="green" trend={{ direction: "positive", label: "+2 pt" }} />
      </div>
    </Card>
  );
}

function MetricAlertExample() {
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <MetricCard label="Failed payments" value="37" icon="icon-alert-triangle-line" iconTheme="red" iconBackground="solid" trend={{ direction: "negative", label: "+9 vs. yesterday" }} theme="border" />
      <InlineMessage theme="negative" title="Card declines are rising" action={{ label: "View failed payments" }}>Most failures come from expired cards — send a reminder.</InlineMessage>
    </Stack>
  );
}

function MetricSizesExample() {
  const themes = ["accent", "blue", "green", "orange"] as const;
  return (
    <Stack gap="sm" align="stretch" style={{ gap: 20 }}>
      {(["large", "medium", "small", "xsmall"] as const).map((size, i) => <Metric key={size} size={size} label={`Size=${size}`} value="$1,680.68" iconTheme={themes[i]} trend={{ direction: "positive", label: "+24%" }} />)}
    </Stack>
  );
}

function UploaderAvatarExample() {
  const [file, setFile] = useState<UploaderFile | null>({ id: "a", name: "ava-portrait.jpg", size: "240 KB", state: "replaceable", previewUrl: people[0].photo });
  return (
    <FileUpload label="Profile photo" type="button" buttonLabel="Choose photo" helpText="Square JPG or PNG, at least 256 px." accept="image/*" thumbnail="photo"
      files={file ? [file] : []}
      onFilesAdd={([picked]) => setFile({ id: picked.name, name: picked.name, size: `${Math.round(picked.size / 1024)} KB`, state: "replaceable", previewUrl: URL.createObjectURL(picked) })}
      onRemove={() => setFile(null)} />
  );
}

function UploaderProgressExample() {
  const [files, setFiles] = useState<UploaderFile[]>([]);
  useEffect(() => {
    if (!files.some((f) => f.state === "uploading")) return undefined;
    const timer = window.setInterval(() => setFiles((current) => current.map((f) => {
      if (f.state !== "uploading") return f;
      const progress = Math.min(100, (f.progress ?? 0) + 17);
      return progress >= 100 ? { ...f, progress, state: "uploaded", caption: undefined } : { ...f, progress, caption: `${Math.ceil((100 - progress) / 17)} seconds left` };
    })), 500);
    return () => window.clearInterval(timer);
  }, [files]);
  const simulate = () => setFiles((current) => [...current, { id: `d${current.length}`, name: `report-q${current.length + 1}.pdf`, size: "1.8 MB", state: "uploading", progress: 0, caption: "Starting…" }]);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <FileUpload label="Quarterly reports" caption="PDF only. Max size of 10 MB" multiple thumbnail="file" files={files}
        onFilesAdd={(added) => setFiles((current) => [...current, ...added.map((f, i) => ({ id: `${f.name}-${i}-${current.length}`, name: f.name, size: `${Math.round(f.size / 1024)} KB`, state: "uploading" as const, progress: 0 }))])}
        onRemove={(file) => setFiles((current) => current.filter((f) => f.id !== file.id))} />
      <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-upload-01-line" />} style={{ alignSelf: "flex-start" }} onClick={simulate}>Simulate an upload</Button>
    </Stack>
  );
}

function UploaderErrorExample() {
  const [files, setFiles] = useState<UploaderFile[]>([{ id: "e1", name: "contract-signed.docx", size: "3.1 MB", state: "alert", error: "Only PDF is accepted" }]);
  return (
    <FileUpload label="Signed contract" caption="PDF only. Max size of 2 MB" error="1 file couldn't be added." thumbnail="file" files={files}
      onRetry={(file) => setFiles((current) => current.map((f) => f.id === file.id ? { ...f, state: "uploaded", error: undefined, name: f.name.replace(/\.docx$/, ".pdf") } : f))}
      onRemove={(file) => setFiles((current) => current.filter((f) => f.id !== file.id))} />
  );
}

function UploaderOverlayExample() {
  return (
    <div className="pe-media-upload">
      <ul className="zen-file-upload__list" aria-label="Uploading to the media wall">
        <UploaderFileItem file={{ id: "v", name: "launch-teaser.mp4", size: "48 MB", state: "uploading", progress: 42, caption: "1 minute left" }} theme="overlay" thumbnail="file" onRemove={() => undefined} />
      </ul>
    </div>
  );
}

function SidePanelDetailsExample() {
  const [openId, setOpenId] = useState<string | null>(null);
  const member = people.find((p) => p.id === openId);
  return (
    <>
      <List aria-label="Team">
        {people.slice(0, 3).map((person) => <ListItem key={person.id} title={person.name} caption={person.role} onClick={() => setOpenId(person.id)} leading={<Avatar size="medium" theme="photo" src={person.photo} alt="" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />)}
      </List>
      <SidePanel open={Boolean(member)} onOpenChange={(open) => { if (!open) setOpenId(null); }} type="modal" title={member?.name ?? ""} description={member?.role} primaryAction={{ label: "Send message", onClick: () => setOpenId(null) }} secondaryAction={{ label: "Close" }}>
        {member ? <><Avatar size="xlarge" theme="photo" src={member.photo} alt="" /><InputField label="Email" readOnly value={`${member.id}@zen.studio`} /><SelectField label="Role" defaultValue="editor" options={[{ label: "Editor", value: "editor" }, { label: "Viewer", value: "viewer" }]} /></> : null}
      </SidePanel>
    </>
  );
}

function SidePanelFiltersExample() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ open: true, blocked: false, mine: true });
  const active = Object.values(filters).filter(Boolean).length;
  return (
    <>
      {/* Filters are Chips (Advanced), never Buttons: the counter shows how many are on, × clears them. */}
      <Chip variant="advanced" size="small" leading={<Icon name="icon-filter-lines-line" decorative />} selectionMode="multiple" selectionCount={active} select={active > 0} aria-haspopup="dialog" onClick={() => setOpen(true)}
        onClearSelection={active ? () => setFilters({ open: false, blocked: false, mine: false }) : undefined}>All filters</Chip>
      <SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Filters" primaryAction={{ label: "Show results", onClick: () => setOpen(false) }} secondaryAction={{ label: "Reset", onClick: () => setFilters({ open: false, blocked: false, mine: false }) }}>
        <Checkbox label="Open tasks" checked={filters.open} onChange={(v) => setFilters({ ...filters, open: v })} />
        <Checkbox label="Blocked" checked={filters.blocked} onChange={(v) => setFilters({ ...filters, blocked: v })} />
        <Checkbox label="Assigned to me" checked={filters.mine} onChange={(v) => setFilters({ ...filters, mine: v })} />
      </SidePanel>
    </>
  );
}

function SidePanelInspectorExample() {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState<number | null>(320);
  return (
    <div className="pe-panel-shell">
      <div className="pe-panel-shell__canvas">
        <Card theme="shadow" spacing="small"><Text as="span" textStyle="Body/Base/Bold">Hero banner</Text><Text as="span" textStyle="Caption/Regular" tone="light">{width === null ? "Selected layer" : `Selected layer · ${width} px`}</Text></Card>
        {!open ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setOpen(true)}>Show inspector</Button> : null}
      </div>
      <SidePanel open={open} onOpenChange={setOpen} type="standard" size="small" title="Inspector">
        <NumberField label="Width" align="left" value={width} onValueChange={setWidth} min={0} max={1440} />
        <SelectField label="Corner radius" defaultValue="large" options={[{ label: "Large (16)", value: "large" }, { label: "2XLarge (24)", value: "2xlarge" }]} />
      </SidePanel>
    </div>
  );
}

function SidePanelActivityExample() {
  const [open, setOpen] = useState(false);
  const events = [["Ava Chen", "published Zen website", "2m"], ["Bao Nguyen", "commented on Tokens", "18m"], ["Chi Tran", "uploaded brand-kit.zip", "1h"]];
  return (
    <>
      <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-bell-01-line" decorative />} onClick={() => setOpen(true)}>Activity</Button>
      <SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Activity" description="Last 24 hours">
        <List aria-label="Activity">
          {events.map(([who, what, when], i) => <ListItem key={what} title={who} caption={`${what} · ${when}`} leading={<Avatar size="medium" theme="photo" src={people[i].photo} alt="" />} />)}
        </List>
      </SidePanel>
    </>
  );
}

/* ───────────── Variant coverage examples ───────────── */

function ButtonMediaCardExample() {
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const video = usePlatformVideo(false);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <div className="pe-media-card">
        <video ref={video.ref} src={platformMedia.canyonLandscape.src} poster={platformMedia.canyonLandscape.poster} muted loop playsInline preload="metadata" aria-label={platformMedia.canyonLandscape.label} />
        <Stack direction="row" gap="xs" align="center" wrap style={{ position: "absolute", top: 12, right: 12 }}>
          <IconButton appearance="overlay" level="white-overlay" size="sm" aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked} onClick={() => setLiked(!liked)} icon={<Icon name={liked ? "icon-heart-solid" : "icon-heart-line"} />} />
          <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label="Share" icon={<Icon name="icon-share-01-line" />} onClick={() => { void navigator.clipboard?.writeText("https://zen.ds/v/onboarding-walkthrough").catch(() => undefined); toast({ title: "Link copied" }); }} />
        </Stack>
        <div style={{ position: "absolute", left: 12, bottom: 12 }}><Button appearance="overlay" level="white" size="sm" aria-pressed={video.playing} onClick={video.toggle} startIcon={<Icon name={video.playing ? "icon-pause-solid" : "icon-play-solid"} decorative />}>{video.playing ? "Pause preview" : "Play preview"}</Button></div>
      </div>
      <Stack direction="row" gap="xs" align="center" wrap justify="between">
        <Text as="span" textStyle="Body/Base/Bold">Onboarding walkthrough</Text>
        <Stack direction="row" gap="2xs" align="center" wrap>
          <Button appearance="flat" level="primary" size="sm">Edit</Button>
          <Button appearance="flat" level="primary" size="sm">Duplicate</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

function SegmentedBillingExample() {
  const [period, setPeriod] = useState("yearly");
  const price = period === "yearly" ? 96 : 10;
  return (
    <Stack gap="md" align="center" style={{ width: "100%" }}>
      <Segmented aria-label="Billing period" level="primary" size="medium" value={period} onChange={setPeriod}
        options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly", badge: "−20%" }]} />
      <Text as="span" textStyle="Heading/3">${price}<Text as="span" tone="base"> / {period === "yearly" ? "year" : "month"} per seat</Text></Text>
    </Stack>
  );
}

function ToggleFlagsExample() {
  const [flags, setFlags] = useState<Record<string, boolean>>({ "new-editor": true, "ai-summaries": false, "dark-canvas": true });
  const labels: Record<string, string> = { "new-editor": "New editor", "ai-summaries": "AI summaries", "dark-canvas": "Dark canvas" };
  return (
    <Stack gap="none" align="stretch" style={{ width: "100%" }}>
      {Object.keys(flags).map((key) => (
        <Stack direction="row" gap="xs" align="center" wrap justify="between" key={key} style={{ padding: "10px 0", boxShadow: "inset 0 -1px 0 var(--zen-color-border-neutral-pale-default)" }}>
          <Stack gap="3xs" align="stretch"><Text as="span">{labels[key]}</Text><Text as="span" tone="light">{flags[key] ? "Enabled for 100% of workspaces" : "Off"}</Text></Stack>
          <ToggleButton size="small" aria-label={labels[key]} selected={flags[key]} onSelectedChange={(next) => setFlags({ ...flags, [key]: next })} />
        </Stack>
      ))}
    </Stack>
  );
}

function AvatarWorkspaceExample() {
  const workspaces = [{ id: "zen", name: "Zen Studio", theme: "blue" as AvatarTheme, initials: "ZS" }, { id: "kaiz", name: "Kaiz Labs", theme: "purple" as AvatarTheme, initials: "KL" }, { id: "dz", name: "Đìzai", theme: "teal" as AvatarTheme, initials: "Đ" }];
  const [current, setCurrent] = useState("zen");
  return (
    <Stack gap="2xs" align="stretch" style={{ width: "100%" }} role="listbox" aria-label="Workspaces">
      {workspaces.map((ws) => (
        <button key={ws.id} type="button" role="option" aria-selected={current === ws.id} className="pe-row" onClick={() => setCurrent(ws.id)}
          style={{ gap: 12, padding: 8, border: 0, borderRadius: 12, background: current === ws.id ? "var(--zen-color-background-active-accent-subtle)" : "transparent", cursor: "pointer", textAlign: "left" }}>
          <Avatar shape="square" size="small" theme={ws.theme} alt={ws.name}>{ws.initials}</Avatar>
          <Text as="span" textStyle="Body/Base/Medium">{ws.name}</Text>
        </button>
      ))}
    </Stack>
  );
}

function DateReportRangeExample() {
  const [range, setRange] = useState<{ start: Date; end: Date | null } | null>(null);
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Stack gap="sm" align="center">
      <div className="pe-inline-picker"><DatePicker calendar="dual" selectionMode="range" onRangeChange={setRange} showActions action="dual" /></div>
      <Text as="span" tone="base">{range ? `Report period: ${fmt(range.start)} → ${range.end ? fmt(range.end) : "…"}` : "Pick a start and end date across both months."}</Text>
    </Stack>
  );
}

function DialogInviteExample() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Stack gap="sm" align="stretch">
      <Stack direction="row" gap="xs" align="center" wrap><Button level="primary" size="sm" startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => setOpen(true)}>Invite teammates</Button></Stack>
      <Text as="span" tone="base">{sent.length ? `Invited: ${sent.join(", ")}` : "No invites sent yet."}</Text>
      <Dialog open={open} onOpenChange={setOpen} theme="info" title="Invite teammates" description="They'll get an email with a link to join Zen Studio."
        primaryAction={{ label: "Send invite", disabled: !email.includes("@"), onClick: () => { setSent([...sent, email]); setEmail(""); setOpen(false); } }}
        secondaryAction={{ label: "Cancel" }}>
        <InputField label="Work email" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      </Dialog>
    </Stack>
  );
}

function PaginationGalleryExample() {
  const [page, setPage] = useState(2);
  const photos = [...platformMedia.feed, ...platformMedia.site];
  const perPage = 4;
  return (
    <Stack gap="md" align="center" style={{ width: "100%" }}>
      <ul className="pe-photo-page" aria-label={`Photos ${(page - 1) * perPage + 1}–${Math.min(page * perPage, photos.length)} of ${photos.length}`}>
        {pageOf(photos, page, perPage).map((photo) => <li key={photo.src}><img src={photo.src} alt={photo.alt} loading="lazy" /></li>)}
      </ul>
      <Pagination theme="secondary" size="small" page={page} onPageChange={setPage} pageCount={Math.ceil(photos.length / perPage)} aria-label="Gallery pages" />
    </Stack>
  );
}

function ToastInlineExample() {
  const [linkShown, setLinkShown] = useState(true);
  const [storage, setStorage] = useState<"full" | "upgraded" | "dismissed">("full");
  const hidden = Number(!linkShown) + Number(storage === "dismissed");
  // The pressed button leaves with its toast, so focus moves on after the change (never on load): to the toast that
  // replaced it, or to "Show message again", which brings the toasts back.
  const stackRef = useRef<HTMLElement>(null);
  const focusNext = useRef("");
  useEffect(() => {
    if (focusNext.current) stackRef.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
    focusNext.current = "";
  }, [linkShown, storage]);
  const then = (focus: string, change: () => void) => () => { focusNext.current = focus; change(); };
  const restore = () => { setLinkShown(true); setStorage("full"); };
  return (
    <Stack ref={stackRef} gap="xs" align="stretch" style={{ width: "100%" }}>
      {linkShown ? <Toast type="subtle" title="Link copied" onClose={then("[data-restore]", () => setLinkShown(false))}>Anyone with the link can view this file.</Toast> : null}
      {storage === "full" ? <Toast type="warning" title="Storage almost full" action={{ label: "Upgrade", onClick: then("[data-type='positive'] .zen-toast__close", () => setStorage("upgraded")) }}>You have used 92% of your space.</Toast> : null}
      {storage === "upgraded" ? <Toast type="positive" title="Storage upgraded" onClose={then("[data-restore]", () => setStorage("dismissed"))}>You now have 1 TB of space.</Toast> : null}
      {hidden ? (
        <Stack direction="row" gap="xs" align="center" wrap>
          <Button data-restore appearance="main" level="tertiary" size="sm" onClick={then(linkShown ? "[data-type='warning'] .zen-toast__action" : "[data-type='subtle'] .zen-toast__close", restore)}>{hidden > 1 ? "Show messages again" : "Show message again"}</Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

function AccordionReleaseNotesExample() {
  const [open, setOpen] = useState("v1.0.2");
  const notes = [["v1.0.2", "Five new components: Accordion, Alert Banner, Pagination, Skeleton and Toast Message."], ["v1.0.1", "Date Picker dual calendar and month/year wheel; popovers flip above near the bottom edge."], ["v1.0.0", "First release of the Codebase Platform and the Zen token foundation."]];
  return (
    <Stack gap="none" align="stretch" style={{ width: "100%" }}>
      {notes.map(([version, body]) => <Accordion key={version} size="xlarge" theme="divider" title={version} expanded={open === version} onExpandedChange={(next) => setOpen(next ? version : "")}>{body}</Accordion>)}
    </Stack>
  );
}

function SkeletonDashboardExample() {
  return (
    <Stack gap="md" align="stretch" style={{ width: "100%" }} aria-busy="true" aria-label="Loading dashboard">
      <Stack direction="row" gap="xs" align="center" wrap justify="between"><SkeletonHeading size="large" /><SkeletonShape shape="rectangle" size="small" /></Stack>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[0, 1, 2].map((key) => <Stack gap="sm" align="stretch" padding="sm" key={key} style={{ gap: 10, borderRadius: 16, boxShadow: "inset 0 0 0 1px var(--zen-color-border-neutral-pale-default)" }}><SkeletonShape shape="square" size="small" /><SkeletonHeading size="small" /><SkeletonText lines={1} /></Stack>)}
      </div>
    </Stack>
  );
}

function InputComposeExample() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bodyText, setBodyText] = useState("");
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <HeadingField headingSize="h2" multiline placeholder="Announcement title" value={title} onValueChange={setTitle} aria-label="Announcement title" />
      <RichTextField label="Message" placeholder="Share what changed and why it matters…" value={body} onValueChange={(html, text) => { setBody(html); setBodyText(text); }} characterLimit maxLength={2000} />
      <Stack direction="row" gap="xs" align="center" wrap justify="end"><Button level="primary" size="sm" disabled={!title.trim() || !bodyText.trim()}>Post announcement</Button></Stack>
    </Stack>
  );
}

function TooltipAnnotationsExample() {
  const pins = [{ id: "a", x: "22%", y: "38%", text: "Header uses Heading/1", placement: "right" as const, color: "black-overlay" as const }, { id: "b", x: "72%", y: "64%", text: "Primary CTA", placement: "left" as const, color: "white-overlay" as const }];
  return (
    <div style={{ position: "relative", width: "100%", height: 180, borderRadius: 16, background: "linear-gradient(135deg, #e8d7c9, #7b8fb8)" }}>
      {pins.map((pin) => (
        <div key={pin.id} style={{ position: "absolute", left: pin.x, top: pin.y }}>
          <Tooltip content={pin.text} placement={pin.placement} color={pin.color} size="small">
            <IconButton appearance="overlay" level={pin.color === "black-overlay" ? "black-overlay" : "white-overlay"} size="xs" aria-label={`Annotation: ${pin.text}`} icon={<Icon name="icon-info-circle-line" />} />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

function AlertAnnouncementExample() {
  const [visible, setVisible] = useState(true);
  return (
    <Stack gap="xs" align="stretch" style={{ width: "100%" }}>
      {visible ? <AlertBanner theme="info" action={{ label: "What's new", onClick: () => setVisible(false) }} onClose={() => setVisible(false)}>Zen DS 1.0.2 adds five new components.</AlertBanner> : <Stack direction="row" gap="xs" align="center" wrap><Button level="tertiary" size="sm" onClick={() => setVisible(true)}>Show announcement</Button></Stack>}
      <AlertBanner theme="positive" size="small" leading={false}>Small banner without a leading icon.</AlertBanner>
    </Stack>
  );
}

/* ───────────── Accordion ───────────── */

function AccordionFaqExample() {
  const faqs = [
    ["Can I change my plan later?", "Yes. Upgrades apply immediately and downgrades at the end of the billing cycle."],
    ["Do you offer student discounts?", "Students and educators get 50% off with a verified school email."],
    ["How do I cancel?", "Open Billing → Plan and choose Cancel. Your workspace stays read-only for 30 days."],
  ];
  return <Stack gap="xs" align="stretch" style={{ width: "100%" }}>{faqs.map(([title, body], index) => <Accordion key={title} theme="box" size="medium" title={title} defaultExpanded={index === 0}>{body}</Accordion>)}</Stack>;
}

function AccordionSettingsExample() {
  const [open, setOpen] = useState("notifications");
  const sections = [
    { id: "profile", title: "Profile", count: 2, body: "Name, photo and time zone." },
    { id: "notifications", title: "Notifications", count: 5, body: "Email digests, mentions, reminders, product news and security alerts." },
    { id: "security", title: "Security", count: 3, body: "Password, two-factor authentication and active sessions." },
  ];
  return <Stack gap="none" align="stretch" style={{ width: "100%" }}>{sections.map((section) => (
    <Accordion key={section.id} size="large" title={<span className="pe-row" style={{ gap: 8 }}>{section.title}<BadgeCounter size="small" theme="neutral" background="subtle" value={section.count} /></span>} expanded={open === section.id} onExpandedChange={(next) => setOpen(next ? section.id : "")}>{section.body}</Accordion>
  ))}</Stack>;
}

/* ───────────── Alert Banner ───────────── */

function AlertPageExample() {
  const [visible, setVisible] = useState(true);
  return (
    <Stack gap="none" align="stretch" style={{ width: "100%", overflow: "hidden", borderRadius: 12, background: "var(--zen-color-background-surface-default)" }}>
      {visible ? <AlertBanner theme="warning" action={{ label: "Upgrade", onClick: () => setVisible(false) }} onClose={() => setVisible(false)}>Your trial ends in 3 days. Upgrade to keep your projects.</AlertBanner> : null}
      <Stack gap="xs" align="stretch" padding="lg">
        <Text as="span" textStyle="Body/Base/Bold">Projects</Text>
        <Text as="span" tone="base">{visible ? "The banner sits above the page content." : "Dismissed — it won't show again this session."}</Text>
        {!visible ? <Button appearance="main" level="tertiary" size="sm" style={{ alignSelf: "flex-start" }} onClick={() => setVisible(true)}>Reset</Button> : null}
      </Stack>
    </Stack>
  );
}

function AlertConnectionExample() {
  const [state, setState] = useState<"offline" | "syncing" | "online">("offline");
  const config = { offline: ["negative", "You're offline. Changes will sync when you reconnect."], syncing: ["info", "Reconnected — syncing 12 changes…"], online: ["positive", "All changes synced."] } as const;
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <AlertBanner size="small" theme={config[state][0]}>{config[state][1]}</AlertBanner>
      <Segmented aria-label="Connection state" level="secondary" size="small" value={state} onChange={(value) => setState(value as typeof state)} options={[{ id: "offline", label: "Offline" }, { id: "syncing", label: "Syncing" }, { id: "online", label: "Online" }]} />
    </Stack>
  );
}

/* ───────────── Pagination ───────────── */

function PaginationTableExample() {
  const all = Array.from({ length: 137 }, (_, index) => ({ id: index + 1, name: `Invoice #${String(2400 + index)}`, amount: `$${(49 + (index * 17) % 300).toFixed(2)}` }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const first = (page - 1) * pageSize;
  const rows = all.slice(first, first + pageSize);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      {/* The whole page is rendered; the table scrolls (sticky header) once it is taller than about five rows. */}
      <ScrollBox label={`Invoices ${first + 1}–${first + rows.length} of ${all.length}`} resetKey={`${page}-${pageSize}`}>
        <Table aria-label="Invoices" rows={rows} getRowId={(row) => String(row.id)}
          columns={[
            { id: "name", header: "Invoice", cell: (row) => <TableText>{row.name}</TableText> },
            { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> },
          ]} />
      </ScrollBox>
      <Pagination theme="inline" page={page} onPageChange={setPage} total={all.length} pageSize={pageSize} pageSizeOptions={[5, 10, 25, 50]} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </Stack>
  );
}

function PaginationResultsExample() {
  const [page, setPage] = useState(4);
  const perPage = 10;
  const pageCount = Math.ceil(searchResults.length / perPage);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Text as="span" tone="base">{plural(searchResults.length, "result")} for “tokens” — page {page} of {pageCount}</Text>
      <ScrollBox label={`Search results, page ${page} of ${pageCount}`} resetKey={page}>
        <List aria-label="Search results">
          {pageOf(searchResults, page, perPage).map((result) => <ListItem key={result.id} title={result.title} caption={`${result.kind} · ${result.path}`} href="#result" />)}
        </List>
      </ScrollBox>
      <Stack direction="row" gap="xs" align="center" wrap justify="center"><Pagination theme="primary" size="small" page={page} onPageChange={setPage} pageCount={pageCount} aria-label="Search results pages" /></Stack>
    </Stack>
  );
}

/* ───────────── Toast ───────────── */

function ToastStackExample() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (type: ToastType, title: string) => setToasts((current) => [...current, { id: Date.now() + Math.random(), type, title, children: "Disappears after 4 seconds; hover to pause." }]);
  const dismiss = useCallback((id: ToastItem["id"]) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Button appearance="main" level="tertiary" size="sm" onClick={() => push("positive", "Project published")}>Publish</Button>
        <Button appearance="main" level="tertiary" size="sm" onClick={() => push("info", "Link copied")}>Copy link</Button>
        <Button appearance="main" level="tertiary" size="sm" onClick={() => push("negative", "Upload failed")}>Fail upload</Button>
      </Stack>
      <div className="pe-toast-well">
        {toasts.length === 0 ? <Text as="span" tone="light">Trigger a toast — it rises in, others slide up, and it collapses out.</Text> : null}
        <ToastStack inline toasts={toasts} onDismiss={dismiss} duration={4000} max={3} />
      </div>
    </Stack>
  );
}

function ToastUndoExample() {
  const [items, setItems] = useState(["Design review", "Sprint planning", "Retro notes"]);
  const [removed, setRemoved] = useState<{ name: string; index: number } | null>(null);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <List aria-label="Meetings">
        {items.map((item, index) => <ListItem key={item} title={item} trailing={<Button appearance="main" level="danger-subtle" size="md" aria-label={`Delete ${item}`} onClick={() => { setItems(items.filter((entry) => entry !== item)); setRemoved({ name: item, index }); }}>Delete</Button>} />)}
      </List>
      {removed ? <Toast type="neutral" title={`“${removed.name}” deleted`} action={{ label: "Undo", onClick: () => { const next = [...items]; next.splice(removed.index, 0, removed.name); setItems(next); setRemoved(null); } }} onClose={() => setRemoved(null)} /> : null}
    </Stack>
  );
}

/* ───────────── Skeleton ───────────── */

function SkeletonCardExample() {
  const [loading, setLoading] = useState(true);
  return (
    <Stack gap="sm" align="stretch" style={{ width: "100%" }}>
      <Stack direction="row" gap="md" align="center" wrap padding="md" style={{ alignItems: "flex-start", borderRadius: 16, background: "var(--zen-color-background-support-neutral-pale)" }} aria-busy={loading}>
        {loading ? <SkeletonShape shape="round" size="medium" /> : <Avatar size="medium" theme="photo" src={people[0].photo} alt={people[0].name} />}
        <Stack gap="xs" align="stretch" style={{ flex: 1 }}>
          {loading ? <><SkeletonHeading size="small" /><SkeletonText lines={2} /></> : <><Text as="span" textStyle="Body/Base/Bold">{people[0].name}</Text><Text as="span" tone="base">Shipped the new token table and fixed the Date Picker popover placement.</Text></>}
        </Stack>
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap><Button appearance="main" level="tertiary" size="sm" onClick={() => setLoading(!loading)}>{loading ? "Finish loading" : "Show skeleton"}</Button></Stack>
    </Stack>
  );
}

function SkeletonListExample() {
  return (
    <Stack gap="md" align="stretch" style={{ width: "100%" }} aria-busy="true" aria-label="Loading members">
      {[0, 1, 2].map((row) => <Stack direction="row" gap="sm" align="center" wrap key={row}><SkeletonShape shape="round" size="small" /><Stack gap="xs" align="stretch" style={{ flex: 1 }}><SkeletonText lines={1} /></Stack><SkeletonShape shape="pill" size="xsmall" /></Stack>)}
    </Stack>
  );
}

type ExampleDef = { title: string; description: string; code: string; wide?: boolean; /** A whole desktop screen: the card offers Full screen. */ screen?: boolean; render: () => ReactNode };

/* ───────────── QA 2026-09-27: pattern examples (docs/guides/example-patterns.md) ───────────── */

/** Button · mobile footer CTA: Large (lg) buttons fill the footer, Primary on top; small sizes never stretch. */
function ButtonMobileFooterExample() {
  const [placed, setPlaced] = useState(false);
  const items = [
    { name: "Pour-over kettle", meta: "Matte black · 1", price: "$64.00", icon: "icon-coffee-cup-line", theme: "orange" },
    { name: "Filter papers", meta: "100 pack · 2", price: "$12.40", icon: "icon-package-check-line", theme: "green" },
    { name: "Burr grinder", meta: "Steel · 1", price: "$139.00", icon: "icon-coffee-cup-line", theme: "brown" },
    { name: "Brew scale", meta: "0.1 g · 1", price: "$24.00", icon: "icon-scales-01-line", theme: "indigo" },
    { name: "Single-origin beans", meta: "Ethiopia · 250 g", price: "$18.50", icon: "icon-shopping-bag-01-line", theme: "orange" },
    { name: "Glass carafe", meta: "600 ml · 1", price: "$34.00", icon: "icon-droplets-01-line", theme: "teal" },
    { name: "Stoneware mug", meta: "Sand · 1", price: "$16.00", icon: "icon-coffee-cup-line", theme: "purple" },
    { name: "Gift wrap", meta: "Recycled paper", price: "$4.00", icon: "icon-gift-01-line", theme: "green" },
  ] as const;
  return (
    <PlatformPhone height={560} label="Checkout footer" header={<TopNavigation type="compact" title="Review order" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />}
      footer={<div className="pe-phone-cta">
        <Button level="primary" size="lg" onClick={() => setPlaced(true)}>{placed ? "Track order" : "Place order · $321.90"}</Button>
        <Button level="tertiary" size="lg">Save for later</Button>
      </div>}>
      <Stack gap="sm" align="stretch" style={{ padding: "8px 0 20px" }}>
        {placed ? <div style={{ padding: "0 20px" }}><InlineMessage theme="positive" title="Order placed">Arrives Thursday, 2 Oct.</InlineMessage></div> : null}
        <List aria-label="Order items">
          {items.map((item) => <ListItem key={item.name} title={item.name} caption={item.meta} leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} trailing={<Text as="span" textStyle="Body/Base/Medium">{item.price}</Text>} />)}
        </List>
        <Divider />
        <dl className={`pe-order-summary ${typographyStyles["Body/Base/Regular"]}`}>
          {[["Subtotal", "$311.90"], ["Shipping", "$10.00"], ["Total", "$321.90"]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <Divider />
        <List aria-label="Delivery and payment">
          <ListItem title="Deliver to" caption="12 Nguyen Hue, District 1, Ho Chi Minh City" leading={<DockIcon icon="icon-package-check-line" theme="neutral" background="subtle" />} onClick={() => undefined} />
          <ListItem title="Arrives" caption="Thursday, 2 Oct · Standard" leading={<DockIcon icon="icon-shopping-bag-01-line" theme="neutral" background="subtle" />} onClick={() => undefined} />
          <ListItem title="Pay with" caption="Visa ending 4242" leading={<DockIcon icon="icon-credit-card-line" theme="neutral" background="subtle" />} onClick={() => undefined} />
        </List>
      </Stack>
    </PlatformPhone>
  );
}

/** Card · pricing plans: Border cards, Active = the current plan, an Accent Badge for the recommended one, one CTA per card. */
function CardPricingExample() {
  const [period, setPeriod] = useState("yearly");
  const [current, setCurrent] = useState("starter");
  const plans = [
    { id: "starter", name: "Starter", price: 0, blurb: "For personal projects", features: ["3 projects", "1 GB storage", "Community support"] },
    { id: "pro", name: "Pro", price: 15, blurb: "For growing teams", features: ["Unlimited projects", "100 GB storage", "Version history", "Priority support"], recommended: true },
    { id: "business", name: "Business", price: 30, blurb: "For organisations", features: ["Everything in Pro", "SSO and audit log", "Custom roles"] },
  ];
  const currentPrice = plans.find((plan) => plan.id === current)?.price ?? 0;
  return (
    <Stack gap="sm" align="stretch">
      <Segmented level="secondary" aria-label="Billing period" options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly · save 20%" }]} value={period} onChange={setPeriod} />
      <div className="pe-plan-grid">
        {plans.map((plan) => {
          const isCurrent = plan.id === current;
          const price = period === "yearly" ? plan.price * 0.8 : plan.price;
          return (
            <Card key={plan.id} as="section" theme="border" spacing="medium" active={isCurrent} aria-label={`${plan.name} plan`}>
              <div className="pe-plan">
                <Stack direction="row" gap="xs" align="center" wrap>
                  <Heading level={3} textStyle="Heading/Subheading">{plan.name}</Heading>
                  {isCurrent ? <Badge theme="neutral" background="subtle" size="small">Current</Badge> : plan.recommended ? <Badge theme="accent" background="subtle" size="small">Recommended</Badge> : null}
                </Stack>
                <Text as="span" tone="light">{plan.blurb}</Text>
                <div className="pe-plan__price"><Text as="span" textStyle="Heading/2">{price ? `$${price}` : "Free"}</Text>{price ? <Text as="span" tone="light">per seat / month</Text> : null}</div>
                <ul className="pe-checklist">{plan.features.map((feature) => <li key={feature}><Icon name="icon-check-line" size="sm" decorative /><Text as="span">{feature}</Text></li>)}</ul>
                {isCurrent
                  ? <Button level="tertiary" size="md">Manage plan</Button>
                  : <Button level={plan.recommended ? "primary" : "tertiary"} size="md" onClick={() => setCurrent(plan.id)}>{plan.price > currentPrice ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}</Button>}
              </div>
            </Card>
          );
        })}
      </div>
    </Stack>
  );
}

/** List Item · grouped sections: a heading per group, each group its own List (named by the heading). */
function ListItemGroupedExample() {
  const uid = useId().replace(/:/g, "");
  const groups = [
    { title: "Account", items: [["Profile", "Name, photo, bio", "icon-user-circle-line"], ["Security", "Password, 2FA, sessions", "icon-lock-01-line"]] },
    { title: "Preferences", items: [["Appearance", "Light, dark or system", "icon-moon-01-line"], ["Language", "English (US)", "icon-translate-line"]] },
    { title: "Support", items: [["Help centre", "Guides and FAQs", "icon-help-circle-line"], ["Contact us", "Replies within a day", "icon-message-chat-circle-line"]] },
  ] as const;
  return (
    <div className="pe-list-groups">
      {groups.map((group) => (
        <section key={group.title} className="pe-list-group" aria-labelledby={`${uid}-${group.title}`}>
          <h3 id={`${uid}-${group.title}`} className={`pe-list-group__title ${typographyStyles["Body/Small/Bold"]}`}>{group.title}</h3>
          <Card theme="border" spacing="small" className="pe-list-card">
            <List aria-label={group.title}>
              {group.items.map(([title, caption, icon]) => <ListItem key={title} title={title} caption={caption} href="#settings" leading={<DockIcon icon={icon} theme="pale" size="small" />} trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />)}
            </List>
          </Card>
        </section>
      ))}
    </div>
  );
}

/** Chip · mobile filter row: one horizontally scrolling row; the sort chip opens a Bottom Sheet (not a Popover) on a phone. */
function ChipMobileFilterExample() {
  const quickFilters = ["Open now", "Rating 4.5+", "Outdoor seating", "Wi-Fi", "Pet friendly"];
  const [on, setOn] = useState<string[]>(["Open now"]);
  const [sort, setSort] = useState("recommended");
  const [sheet, setSheet] = useState(false);
  const sorts = [{ id: "recommended", label: "Recommended" }, { id: "distance", label: "Distance" }, { id: "rating", label: "Rating" }];
  const places = [
    { name: "Hạt Coffee", km: 0.4, rating: 4.7, tags: ["Open now", "Rating 4.5+", "Wi-Fi"] },
    { name: "The Workshop", km: 1.2, rating: 4.6, tags: ["Open now", "Rating 4.5+", "Wi-Fi", "Outdoor seating"] },
    { name: "Cộng Café", km: 0.8, rating: 4.3, tags: ["Open now", "Outdoor seating", "Pet friendly"] },
    { name: "Là Việt", km: 2.1, rating: 4.8, tags: ["Rating 4.5+", "Wi-Fi", "Pet friendly"] },
    { name: "Okkio", km: 1.6, rating: 4.4, tags: ["Open now", "Wi-Fi"] },
  ];
  const shown = places.filter((place) => on.every((f) => place.tags.includes(f)))
    .sort((a, b) => (sort === "distance" ? a.km - b.km : sort === "rating" ? b.rating - a.rating : 0));
  const sortLabel = sorts.find((s) => s.id === sort)?.label ?? "Sort";
  return (
    <PlatformPhone height={560} label="Mobile filter row" header={<TopNavigation type="compact" title="Coffee nearby" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />}>
      <div className="pe-chip-scroll" role="group" aria-label="Filters">
        <Chip variant="advanced" size="small" dropdown aria-haspopup="dialog" aria-expanded={sheet} popoverOpen={sheet} select={sort !== "recommended"} onClick={() => setSheet(true)} onClearSelection={sort !== "recommended" ? () => setSort("recommended") : undefined}>{sort === "recommended" ? "Sort" : sortLabel}</Chip>
        {quickFilters.map((f) => {
          const pressed = on.includes(f);
          return <Chip key={f} variant="normal" size="small" level={pressed ? "primary" : "secondary"} select={pressed} aria-pressed={pressed} onClick={() => setOn(pressed ? on.filter((x) => x !== f) : [...on, f])}>{f}</Chip>;
        })}
      </div>
      <div style={{ padding: "4px 20px 8px" }}><Text as="span" textStyle="Caption/Regular" tone="light">{plural(shown.length, "place")}</Text></div>
      {shown.length ? (
        <List aria-label="Places">
          {shown.map((place) => <ListItem key={place.name} title={place.name} caption={`${place.km} km · ${place.rating} ★`} href="#place" leading={<DockIcon icon="icon-coffee-cup-line" theme="brown" background="subtle" />} />)}
        </List>
      ) : <EmptyState illustration={false} title="No places match" secondaryAction={{ label: "Clear filters", onClick: () => setOn([]) }}>Try removing a filter.</EmptyState>}
      <BottomSheet inline open={sheet} onOpenChange={setSheet} type="action" title="Sort by" items={sorts} selectedId={sort} onSelect={(item) => setSort(item.id)} />
    </PlatformPhone>
  );
}

const examples: Partial<Record<PlatformPage, ExampleDef[]>> = {
  button: [
    { title: "Empty state", description: "Tertiary secondary path + one Primary CTA in an empty state.", render: () => <ButtonEmptyStateExample />, code: `<Button level="tertiary" size="sm">Import from Figma</Button>
<Button level="primary" size="sm" startIcon={<Icon name="icon-plus-line" />}>New project</Button>` },
    { title: "Media card", description: "Overlay buttons (White-Overlay / Black-Overlay icon buttons, White label button) sit on imagery; Flat buttons handle quiet inline actions in the card footer.", render: () => <ButtonMediaCardExample />, code: `<IconButton appearance="overlay" level="white-overlay" size="sm" aria-label="Like" aria-pressed={liked} onClick={() => setLiked(!liked)} icon={<Icon name="icon-heart-line" />} />
<IconButton appearance="overlay" level="black-overlay" size="sm" aria-label="Share" onClick={copyLink} icon={<Icon name="icon-share-01-line" />} />
<Button appearance="overlay" level="white" size="sm">Play preview</Button>
<Button appearance="flat" level="primary" size="sm">Edit</Button>` },
    { title: "Confirm a destructive action", description: "Danger + tertiary pair; the primary action shows progress and disables both buttons while it runs.", render: () => <ButtonDialogExample />, code: `<Button level="tertiary" size="sm" disabled={busy} onClick={close}>Cancel</Button>
<Button level="danger" size="sm" disabled={busy}
  startIcon={<Icon name="icon-trash-line" decorative />}
  onClick={deleteProject}>
  {busy ? "Deleting…" : "Delete project"}
</Button>` },
    { title: "Editor toolbar", description: "Icon buttons disable themselves when there is nothing to undo or redo.", render: () => <ButtonToolbarExample />, code: `<div role="toolbar" aria-label="Document actions">
  <IconButton appearance="main" level="tertiary" size="sm" aria-label="Undo"
    disabled={!canUndo} onClick={undo} icon={<Icon name="icon-reverse-left-line" />} />
  <IconButton appearance="main" level="tertiary" size="sm" aria-label="Redo"
    disabled={!canRedo} onClick={redo} icon={<Icon name="icon-reverse-right-line" />} />
  <Button level="primary" size="sm" disabled={published} onClick={publish}>Publish</Button>
</div>` },
    { title: "Mobile footer CTA", description: "On a phone the main action sits in the footer: Large buttons fill the width, Primary on top, one Tertiary alternative below. Small sizes never stretch.", render: () => <ButtonMobileFooterExample />, code: `<footer className="checkout-footer"> {/* display: grid; gap: 12px; padding: 12px 20px */}
  <Button level="primary" size="lg" onClick={placeOrder}>Place order · $86.40</Button>
  <Button level="tertiary" size="lg" onClick={saveForLater}>Save for later</Button>
</footer>` },
  ],
  chip: [
    { title: "People filter", description: "Advanced chip with a leading photo once an owner is chosen; the Popover lists people with captions.", render: () => <ChipPeopleFilterExample />, code: `<Chip variant="advanced" size="small" dropdown select={Boolean(owner)} photoSrc={person?.photo}
  popoverItems={people.map((p) => ({ id: p.id, label: p.name, caption: p.role, photoSrc: p.photo }))}
  onPopoverSelect={(item) => setOwner(item.id)} onClearSelection={() => setOwner(null)}>Owner</Chip>` },
    { title: "Counters", description: "Number-only chips show counts next to a label; they are not interactive.", render: () => <ChipCountersExample />, code: `<Chip variant="number-only" size="small" value={12} />` },
    { title: "Filter bar", description: "Advanced chips open a real Popover: multiple selection shows a counter, single selection shows the chosen owner. Delete/Backspace clears a focused chip.", wide: true, render: () => <ChipFilterBarExample />, code: `<Chip variant="advanced" size="small" dropdown
  selectionMode="multiple" selectionCount={statuses.length} select={statuses.length > 0}
  popoverOpen={open} onPopoverOpenChange={setOpen} popoverMultiple popoverLabel="Status"
  popoverItems={options.map((o) => ({ ...o, selected: statuses.includes(o.id) }))}
  onPopoverSelect={(item) => toggleStatus(item.id)}
  onClearSelection={() => setStatuses([])}
>
  Status
</Chip>
{applied ? <Button appearance="flat" level="primary" size="sm" onClick={clearAll}>Clear all</Button> : null}` },
    { title: "Selectable topics", description: "Normal chips as toggle pills with aria-pressed.", render: () => <ChipTopicsExample />, code: `{topics.map((topic) => (
  <Chip key={topic} variant="normal" size="small"
    level={picked.includes(topic) ? "primary" : "secondary"}
    select={picked.includes(topic)} aria-pressed={picked.includes(topic)}
    onClick={() => toggle(topic)}>
    {topic}
  </Chip>
))}` },
    { title: "Mobile filter row", description: "On a phone chips sit in one horizontally scrolling row. Quick filters are Normal toggle chips; the Sort chip opens an Action Bottom Sheet instead of a Popover. The result count uses a plural label and an empty result offers Clear filters.", render: () => <ChipMobileFilterExample />, code: `<div className="chip-scroll" role="group" aria-label="Filters"> {/* overflow-x: auto; flex-wrap: nowrap */}
  <Chip variant="advanced" size="small" dropdown aria-haspopup="dialog" aria-expanded={sheet} popoverOpen={sheet} select={sorted}
    onClick={() => setSheet(true)} onClearSelection={sorted ? resetSort : undefined}>{sortLabel}</Chip>
  {quickFilters.map((f) => <Chip key={f} variant="normal" size="small" level={on(f) ? "primary" : "secondary"}
    select={on(f)} aria-pressed={on(f)} onClick={() => toggle(f)}>{f}</Chip>)}
</div>
<BottomSheet open={sheet} onOpenChange={setSheet} type="action" title="Sort by"
  items={sorts} selectedId={sort} onSelect={(item) => setSort(item.id)} />` },
  ],
  input: [
    { title: "Label variants", description: "Figma Primitives/Input/Label: Optional, Tooltip-Icon and Action, in the Default and Disabled states. Hover or focus the info icon for its tooltip.", wide: true, render: () => <InputLabelVariantsExample />, code: `<InputLabel id="name">Display name</InputLabel>
<InputLabel id="name" optional>Display name</InputLabel>
<InputLabel id="name" tooltip="Visible to everyone in the workspace">Display name</InputLabel>
<InputLabel id="name" action={<button type="button" onClick={onAction}>Action</button>}>Display name</InputLabel>
<InputLabel id="name" optional tooltip="…" action={…} disabled>Display name</InputLabel>` },
    { title: "Labels in a sign-in form", description: "Fields take the same parts through labelTooltip, labelAction and labelOptional: a tooltip that explains, a Forgot password? action, and an Optional marker.", render: () => <InputLabelFormExample />, code: `<InputField label="Work email" labelTooltip="We use this for SSO and billing receipts." />
<InputField label="Password" type="password"
  labelAction={<button type="button" onClick={sendReset}>Forgot password?</button>} />
<InputField label="Company" labelOptional />` },
    { title: "Help text variants", description: "Figma Help-Text: Neutral, Warning, Positive and Negative themes, with or without the icon and with the Character-Limitation counter.", wide: true, render: () => <InputHelpTextVariantsExample />, code: `<InputHelpText theme="neutral">We'll never share your email.</InputHelpText>
<InputHelpText theme="warning" icon={false}>Personal address — use your work email.</InputHelpText>
<InputHelpText theme="positive" characterLimit="42/100">Email verified.</InputHelpText>
<InputField label="Email" error="Enter a valid email address." /> {/* error = Negative */}` },
    { title: "Help text that responds", description: "Username availability flips Neutral → Positive / Negative, a personal email shows a Warning, and the bio counts characters against maxLength.", render: () => <InputHelpTextFormExample />, code: `<InputField label="Username" maxLength={20} characterLimit
  error={taken ? \`@\${handle} is already taken.\` : undefined}
  helpText={available ? \`@\${handle} is available.\` : "Your public handle."}
  helpTheme={available ? "positive" : "neutral"} />
<InputField label="Work email" helpText="Use your work email to sign in with SSO." helpTheme="warning" />
<TextAreaField label="Bio" maxLength={160} characterLimit helpText="Shown on your profile." />` },
    { title: "Checkout details", description: "Select, Number and Date fields with help text, plus an inline coupon error.", render: () => <InputCheckoutExample />, code: `<SelectField label="Country" options={countries} />
<NumberField label="Seats" value={qty} onValueChange={setQty} min={1} max={50} />
<InputField label="Coupon" value={coupon} error={invalid ? "This code is not valid." : undefined} />` },
    { title: "Compose announcement", description: "A multi-line heading field (H2) above a Rich-Text field with its editor bar; long titles wrap instead of scrolling.", wide: true, render: () => <InputComposeExample />, code: `<HeadingField headingSize="h2" multiline placeholder="Announcement title" value={title} onValueChange={setTitle} />
<RichTextField label="Message" value={html} characterLimit maxLength={2000}
  onValueChange={(html, text) => { setHtml(html); setText(text); }} />` },
    { title: "Sign-up form", description: "Email validates on blur, password rules update while typing, and submit stays disabled until everything passes.", render: () => <SignUpExample />, code: `<InputField label="Work email" required type="email" value={email}
  onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)}
  leading={<Icon name="icon-mail-01-line" decorative />}
  error={touched && !valid ? "Enter a valid email address" : undefined} />

<InputField label="Password" required type="password" value={password} onChange={...} />
<InputConditions>
  <InputConditionItem label="At least 8 characters" state={long ? "success" : "wrong"} />
</InputConditions>` },
    { title: "Workspace settings", description: "Select, number, date and textarea fields with live helper text.", render: () => <WorkspaceSettingsExample />, code: `<SelectField label="Region" options={regions} helpText="Data is stored in this region." />
<NumberField label="Seats" align="center" min={1} max={50} value={seats}
  onValueChange={(next) => setSeats(next ?? 1)} helpText={\`$\${seats * 12}/month\`} />
<DateField label="Billing starts" />
<TextAreaField label="Workspace description" maxLength={120} value={bio}
  onChange={(e) => setBio(e.target.value)} helpText={\`\${bio.length}/120\`} />` },
  ],
  search: [
    { title: "Search with scope", description: "Theme Filter-Dropdown: the trailing picker (All / Components / Tokens / Icons) opens the shared Popover and narrows the results.", render: () => <SearchScopeExample />, code: `<Search theme="filter-dropdown" placeholder="Search the design system"
  value={query} onChange={(e) => setQuery(e.target.value)}
  filterOptions={[{ value: "all", label: "All" }, { value: "components", label: "Components" }, …]}
  filterValue={scope} onFilterChange={setScope} filterActionLabel="Search in" />` },
    { title: "Advanced filters", description: "Theme Filter-Icon: the filter button opens a multi-select Popover (checkbox marks); a Badge counts the active filters.", render: () => <SearchAdvancedFilterExample />, code: `<div ref={anchorRef}>
  <Search theme="filter-icon" placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)}
    onFilterClick={() => setOpen(!open)} filterActionLabel="Filter by status" />
  <Popover open={open} onOpenChange={setOpen} anchorRef={anchorRef} align="end" multiple label="Status"
    items={statuses} onSelect={toggleStatus} />
</div>` },
    { title: "Icon picker", description: "Variant Popover (Search/Popover): Small, no search icon, no focus ring — for search inside a custom popover surface.", render: () => <SearchIconPickerExample />, code: `<Search variant="popover" iconSearch={false} placeholder="Search icons"
  value={query} onChange={(e) => setQuery(e.target.value)} />` },
    { title: "Search with live results", description: "Results filter while typing, matches are highlighted, Enter opens the first hit and the clear button resets to recent items.", render: () => <SearchResultsExample />, code: `<Search placeholder="Search components" value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && open(results[0])} />
{query && results.length === 0
  ? <EmptyState title="No components match" illustration={false} secondaryAction={{ label: "Clear search", onClick: clear }} />
  : <Results items={results} />}` },
    { title: "Table toolbar", description: "Small Search next to a Chip (Advanced) status filter — filters are always chips, never buttons.", render: () => <SearchTableToolbarExample />, code: `<Chip variant="advanced" size="small" dropdown select={Boolean(status)} popoverLabel="Status"
  popoverItems={statuses.map((s) => ({ ...s, selected: s.id === status }))}
  onPopoverSelect={(item) => setStatus(item.id)} onClearSelection={() => setStatus(null)}>
  {status ?? "Status"}
</Chip>
<Search size="small" placeholder="Filter tasks" value={query} onChange={(e) => setQuery(e.target.value)} />` },
  ],
  segmented: [
    { title: "Billing period", description: "Level Primary, size Medium, with a Badge on the Yearly option.", render: () => <SegmentedBillingExample />, code: `<Segmented aria-label="Billing period" level="primary" size="medium" value={period} onChange={setPeriod}
  options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly", badge: "−20%" }]} />` },
    { title: "View switcher", description: "Icon-only segments switch between grid and list layouts.", render: () => <SegmentedViewSwitcherExample />, code: `<Segmented level="secondary" size="small" aria-label="Layout" value={view} onChange={setView} options={[
  { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
  { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> },
]} />` },
    { title: "Tabs with counters", description: "Badge-Counter switches between selected and default styling; counters disappear at zero.", render: () => <SegmentedInboxExample />, code: `<Segmented level="secondary" aria-label="Mailbox" value={tab} onChange={setTab} options={[
  { id: "inbox", label: "Inbox", badge: counts.inbox || undefined },
  { id: "mentions", label: "Mentions", badge: counts.mentions || undefined },
  { id: "archived", label: "Archived" },
]} />` },
  ],
  toggle: [
    { title: "Privacy cards", description: "Text-first bold toggles with captions inside selectable cards.", render: () => <TogglePrivacyCardsExample />, code: `<Toggle theme="text-first" bold label="Public profile" caption="Anyone in your organisation can see your profile." selected={on} onSelectedChange={setOn} />` },
    { title: "Feature flags", description: "Toggle-Button (switch only) in table rows; the row text names it via aria-label.", render: () => <ToggleFlagsExample />, code: `<ToggleButton size="small" aria-label="New editor" selected={on} onSelectedChange={setOn} />` },
    { title: "Notification settings", description: "A master toggle disables the dependent toggles.", render: () => <ToggleSettingsExample />, code: `<Toggle bold size="medium" label="Pause all notifications" selected={paused} onSelectedChange={setPaused} />
<Toggle label="Mentions" caption="When someone @mentions you"
  selected={prefs.mentions} onSelectedChange={setMentions} disabled={paused} />` },
    { title: "Inline preference", description: "Toggle-first theme inside a card; it starts in the platform mode and the toggle switches the card's token mode.", render: () => <ToggleInlineExample />, code: `<div data-theme={dark ? "dark" : "light"}>
  <Toggle theme="toggle-first" size="small" label="Dark preview" selected={dark} onSelectedChange={setDark} />
</div>` },
  ],
  avatar: [
    { title: "Presence", description: "Photo avatars with the Active status dot for online members.", render: () => <AvatarPresenceExample />, code: `<Avatar size="medium" theme="photo" src={person.photo} alt={person.name} status={person.online} />` },
    { title: "Workspace switcher", description: "Square Avatars (initials) identify workspaces and organisations; circles stay for people.", render: () => <AvatarWorkspaceExample />, code: `<Avatar shape="square" size="small" theme="blue" alt="Zen Studio">ZS</Avatar>` },
    { title: "Member list", description: "Photo and initials avatars with presence status.", render: () => <AvatarMembersExample />, code: `<Avatar size="medium" theme="photo" src={user.photo} status={user.online} alt={user.name} />
<Avatar size="medium" theme="green" background="subtle" status={user.online} alt={user.name}>BN</Avatar>` },
    { title: "Shared with", description: "Avatar/Stack grows as people are invited (max 5).", render: () => <AvatarShareExample />, code: `<AvatarStack size="small" items={members.map((m) => ({ alt: m.name, src: m.photo, theme: "photo" }))} />
<Button level="primary" size="sm" onClick={invite}>Invite</Button>` },
  ],
  checkbox: [
    { title: "Bulk selection", description: "An indeterminate “select all” plus a Danger-Subtle bulk action.", render: () => <CheckboxBulkTableExample />, code: `<Checkbox label={\`\${picked.length} selected\`} bold checked={all} indeterminate={some} onChange={toggleAll} />` },
    { title: "Permissions", description: "Right-side marks with captions; a required permission is disabled.", render: () => <CheckboxPermissionsExample />, code: `<Checkbox checkSide="right" label="Edit" caption="Change content and structure" checked={on} onChange={setOn} />` },
    { title: "Select all", description: "The parent checkbox is indeterminate while only some children are selected.", render: () => <CheckboxSelectAllExample />, code: `const all = picked.length === files.length;
const some = picked.length > 0 && !all;

<Checkbox bold label="Include all build files" checked={all || some} indeterminate={some}
  onChange={() => setPicked(all ? [] : files)} />
{files.map((file) => (
  <Checkbox key={file} label={file} checked={picked.includes(file)} onChange={(on) => toggle(file, on)} />
))}` },
    { title: "Consent", description: "A required checkbox gates the primary action; unavailable options are disabled with a reason.", render: () => <CheckboxConsentExample />, code: `<Checkbox label="I accept the Terms of Service" checked={terms} onChange={setTerms} />
<Checkbox label="Enable legacy API" caption="Unavailable on the Free plan" disabled />
<Button level="primary" size="sm" disabled={!terms}>Continue</Button>` },
  ],
  "radio-button": [
    { title: "Shipping method", description: "Radio cards: bold label, caption and a price on the trailing side.", render: () => <RadioShippingExample />, code: `<RadioButton name="shipping" value="express" bold label="Express" caption="1–2 business days" checked={m === "express"} onChange={() => setM("express")} />` },
    { title: "Row density", description: "Right-side radios in a settings list separated by Pale dividers.", render: () => <RadioRightAlignedExample />, code: `<RadioButton name="density" radioSide="right" label="Compact" caption="More rows on screen" … />` },
    { title: "Plan picker", description: "Radio cards in a radiogroup; arrow keys move the selection.", render: () => <RadioPlanExample />, code: `<div role="radiogroup" aria-label="Plan">
  {plans.map((p) => (
    <RadioButton key={p.id} name="plan" value={p.id} bold
      checked={plan === p.id} onChange={() => setPlan(p.id)}
      label={\`\${p.label} · $\${p.price}/mo\`} caption={p.caption} />
  ))}
</div>` },
    { title: "Settings list", description: "Right-side radios for a settings panel, with a disabled option.", render: () => <RadioSettingsExample />, code: `<RadioButton name="density" radioSide="right" value="compact"
  checked={density === "compact"} onChange={() => setDensity("compact")}
  label="Compact" caption="More rows on screen" />` },
  ],
  badge: [
    { title: "Priority labels", description: "Subtle badges with leading icons: red Urgent, orange Medium, blue Low.", render: () => <BadgePriorityExample />, code: `<Badge size="small" theme="red" background="subtle" leading={<Icon name="icon-alert-octagon-solid" />}>Urgent</Badge>` },
    { title: "Deployment status", description: "Semantic themes with leading icons.", render: () => <BadgeStatusExample />, code: `<Badge size="small" theme="green" background="subtle" leading={<Icon name="icon-check-line" decorative />}>Live</Badge>
<Badge size="small" theme="red" background="subtle" leading={<Icon name="icon-x-small-line" decorative />}>Failed</Badge>` },
    { title: "Removable labels", description: "Remove=Yes badges wired to onRemove.", render: () => <BadgeRemovableExample />, code: `{labels.map((label) => (
  <Badge key={label} theme="neutral" background="subtle" leadingIcon={false}
    remove onRemove={() => removeLabel(label)}>{label}</Badge>
))}` },
    { title: "Unread counters", description: "Badge-Counter caps at 99+ and disappears once read.", render: () => <BadgeCounterNavExample />, code: `{unread > 0 ? <BadgeCounter size="small" theme="neutral" value={unread > 99 ? "99+" : unread} /> : null}` },
  ],
  popover: [
    { title: "Selection toolbar (Bulk-Action)", description: "Popover/Bulk-Action above a text selection: History · Format · Comment groups split by 40px dividers, Button/Icon-Flat Medium actions (5–6 max).", render: () => <PopoverBulkSelectionDemo />, code: `<PopoverBulkAction aria-label="Selection actions">
  <PopoverBulkActionGroup aria-label="History">{undo}{redo}</PopoverBulkActionGroup>
  <PopoverBulkActionDivider />
  <PopoverBulkActionGroup aria-label="Format">
    <IconButton appearance="flat" size="md" aria-label="Bold" aria-pressed={bold} onClick={() => setBold(!bold)} icon={<Icon name="icon-bold-01-line" />} />
    {italic}
  </PopoverBulkActionGroup>
  <PopoverBulkActionDivider />
  <PopoverBulkActionGroup aria-label="Comment">{comment}</PopoverBulkActionGroup>
</PopoverBulkAction>` },
    { title: "Bulk actions on a table", description: "Selecting table rows (or all of them from the header) floats a Bulk-Action bar over the table’s bottom edge; each action names how many files it affects, and Delete removes them and clears the selection.", render: () => <PopoverBulkListExample />, code: `<Table aria-label="Project files" rows={files} getRowId={(row) => row.id}
  selectable selectedIds={picked} onSelectionChange={setPicked} columns={columns} />
{picked.length ? (
  <PopoverBulkAction aria-label={\`Actions for \${count}\`}>
    <PopoverBulkActionGroup aria-label="Edit">
      <IconButton appearance="flat" size="md" aria-label={\`Duplicate \${count}\`} icon={<Icon name="icon-copy-line" />} />
      …
    </PopoverBulkActionGroup>
    <PopoverBulkActionDivider />
    <PopoverBulkActionGroup aria-label="Delete">
      <IconButton appearance="flat" size="md" aria-label={\`Delete \${count}\`} icon={<Icon name="icon-trash-line" />} onClick={removePicked} />
    </PopoverBulkActionGroup>
  </PopoverBulkAction>
) : null}` },
    { title: "Context menu", description: "A ⋯ IconButton opens an end-aligned menu with icons; an unavailable action is disabled with a caption.", render: () => <PopoverContextMenuExample />, code: `<IconButton ref={triggerRef} aria-label="More actions" aria-expanded={open}
  onClick={() => setOpen(!open)} icon={<Icon name="icon-dots-horizontal-line" />} />
<Popover open={open} onOpenChange={setOpen} anchorRef={triggerRef} align="end"
  items={[{ id: "rename", label: "Rename", leading: <Icon name="icon-edit-02-line" /> }, { id: "move", label: "Move to…", disabled: true, caption: "No other projects" }]} />` },
    { title: "Sort menu", description: "Sort is a filter-type choice, so a Chip (Advanced) owns the trigger and its Popover; closes on select, outside click or Escape.", render: () => <PopoverSortExample />, code: `<Chip variant="advanced" size="small" dropdown leading={<Icon name="icon-switch-vertical-01-line" />}
  popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Sort by"
  popoverItems={options.map((o) => ({ ...o, selected: o.id === sort }))}
  onPopoverSelect={(item) => setSort(item.id)}>
  Sort: {current.label}
</Chip>` },
    { title: "Create a label (Manual-Add-New)", description: "A multi-select label filter that can create what's missing: the Create row with an Accent Badge appears only for a new value; Enter creates and selects it.", render: () => <PopoverCreateLabelExample />, code: `<Chip variant="advanced" size="small" dropdown popoverMultiple selectionMode="multiple" selectionCount={picked.length}
  popoverLabel="Select a label or create one" popoverItems={labels} onPopoverSelect={(item) => toggle(item.id)}
  onPopoverCreate={(value) => { addLabel(value); select(value); }}>
  Labels
</Chip>` },
    { title: "Assign people", description: "Multi-select with search; stays open while toggling, focus moves into the search.", render: () => <PopoverAssignExample />, code: `<Popover open={open} onOpenChange={setOpen} anchorRef={anchorRef} autoFocus multiple
  label="Assignees" search searchValue={query} onSearchChange={setQuery} emptyState="No one found"
  items={people.map((p) => ({ id: p.id, label: p.name, caption: p.role, theme: "avatar-small",
    selected: assigned.includes(p.id), photoSrc: p.photo }))}
  onSelect={(item) => toggleAssignee(item.id)} />` },
  ],
  sidebar: [
    { title: "Projects flyout", screen: true, description: "Basic sidebar: Projects opens the Side-Bar/Sub flyout with Search and Pinned / All sections; Docs expands in place; the rail collapses. Canvas/Default page → Surface/Default sidebar and cards.", wide: true, render: () => <SidebarProjectsFlyoutExample />, code: `// page: Canvas/Default
<Sidebar background="default" collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections}
  onItemClick={(item) => item.id === "projects" ? setFlyout(!flyout) : setPage(item.id)}
  subMenuLabel="Projects" onSubMenuClose={() => setFlyout(false)}
  subMenu={flyout && <SidebarSubMenu search={<Search variant="popover" placeholder="Search projects" />}
    sections={[{ label: "Pinned", items: pinned }, { label: "All projects", items: rest }]}
    onItemClick={(item) => setPage(item.id)}>
    <Button appearance="main" level="tertiary" size="sm">New project</Button>
  </SidebarSubMenu>} />

// Page body: the task list is a sortable Table
<Table aria-label="Tasks" rows={sorted} getRowId={(t) => t.id} sort={sort} onSortChange={setSort}
  columns={[
    { id: "title", header: "Task", sortable: true, cell: (t) => <TableText bold>{t.title}</TableText> },
    { id: "owner", header: "Owner", sortable: true, cell: (t) => <TableMedia media={<Avatar size="xsmall" theme="photo" src={t.owner.photo} alt="" />} bold={false}>{t.owner.name}</TableMedia> },
    { id: "status", header: "Status", sortable: true, cell: (t) => <Badge size="medium" theme={statusTheme[t.status]} background="subtle">{t.label}</Badge> },
  ]} />` },
    { title: "Workspace + members", screen: true, description: "The active workspace carries the accent Focus-Ring; switch from the rail or the header name dropdown. Members opens a people flyout (Online / Offline). Canvas/Alt (white) page → Surface/Alt rail and panel.", wide: true, render: () => <SidebarWorkspaceExample />, code: `// page: Canvas/Alt
<Sidebar variant="workspace" background="alt" workspaceBar sections={sections}
  workspaceItems={workspaces.map((w) => ({ ...w, selected: w.id === active }))}
  onItemClick={(item) => isWorkspace(item) ? setActive(item.id) : setPage(item.id)}
  workspaceAction={<IconButton level="tertiary" size="md" aria-label="Add workspace" onClick={addWorkspace} icon={<Icon name="icon-plus-line" />} />}
  headerAction={<IconButton appearance="flat" level="primary" size="sm" aria-label="Workspace settings" onClick={() => setPage("settings")} icon={<Icon name="icon-settings-01-line" />} />}
  onSubMenuClose={() => setFlyout(false)}
  subMenu={flyout && <SidebarSubMenu search={<Search variant="popover" placeholder="Search people" />}
    sections={[{ label: "Online", items: online }, { label: "Offline", items: offline }]} />} />

// Projects page: one Table row per project
<Table aria-label="Projects" rows={sorted} getRowId={(p) => p.id} sort={sort} onSortChange={setSort}
  columns={[
    { id: "name", header: "Project", sortable: true, cell: (p) => <TableMedia media={<Icon name={p.icon} size="lg" />} caption={\`Updated \${p.updated}\`}>{p.name}</TableMedia> },
    { id: "team", header: "Team", width: "96px", cell: (p) => <AvatarStack size="small" items={p.team} /> },
    { id: "open", header: "Open", align: "right", width: "80px", sortable: true, cell: (p) => <TableText>{p.open}</TableText> },
  ]} />` },
    { title: "Flat · knowledge base", screen: true, description: "background=\"flat\" on a Canvas/Flat page: Surface/Flat is the same colour as the canvas, so the sidebar and page read as one plane in light and dark. Search in the sidebar filters pages; Teamspaces expand in place; cards keep a Pale border because the surface no longer separates them.", wide: true, render: () => <SidebarFlatExample />, code: `// page: Canvas/Flat
<Sidebar background="flat" collapsed={collapsed} onCollapsedChange={setCollapsed}
  search={<Search variant="popover" placeholder="Search the wiki" value={query} onChange={…} />}
  sections={[
    { items: [home, inbox, calendar] },
    { label: "Favorites", items: favorites },
    { label: "Teamspaces", action: <IconButton appearance="flat" level="primary" size="sm" aria-label="New teamspace" onClick={addTeamspace} icon={<Icon name="icon-plus-line" />} />,
      items: [{ id: "product", label: "Product", icon, children: [roadmap, specs, releases] }, …] },
    { label: "Private", items: privatePages },
  ]}
  onItemClick={(item) => !item.children && setPage(item.id)}
  footer={<><button type="button"><Icon name="icon-layers-three-01-line" /><span>Templates</span></button>…</>} />

// Page body: cards on a flat page keep their own frame
<Breadcrumbs items={[{ id: "wiki", label: "Zen Wiki" }, { id: "product", label: "Product" }, { id: "roadmap", label: "Roadmap" }]} />
<Card theme="border" spacing="small">
  <List aria-label="Recently visited">
    <ListItem title="Roadmap" caption="Teamspaces / Product · edited 40m ago" onClick={open}
      leading={<DockIcon icon="icon-file-doc-line" theme="pale" size="small" />} trailing={<AvatarStack size="xsmall" items={team} />} />
  </List>
</Card>` },
    { title: "Collapsed rail + flyout", screen: true, description: "Collapsed by default with tooltips; Reports opens the flyout straight from the icon rail. Canvas/Alt (white) page → Surface/Alt sidebar and cards.", wide: true, render: () => <SidebarCollapsedExample />, code: `// page: Canvas/Alt
<Sidebar background="alt" collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections}
  onSubMenuClose={() => setFlyout(false)}
  subMenu={flyout && <SidebarSubMenu sections={[{ label: "Reports", items: reports }]} />} />

// Page body: the task list is a sortable Table
<Table aria-label="Tasks" rows={sorted} getRowId={(t) => t.id} sort={sort} onSortChange={setSort}
  columns={[
    { id: "title", header: "Task", sortable: true, cell: (t) => <TableText bold>{t.title}</TableText> },
    { id: "owner", header: "Owner", sortable: true, cell: (t) => <TableMedia media={<Avatar size="xsmall" theme="photo" src={t.owner.photo} alt="" />} bold={false}>{t.owner.name}</TableMedia> },
    { id: "status", header: "Status", sortable: true, cell: (t) => <Badge size="medium" theme={statusTheme[t.status]} background="subtle">{t.label}</Badge> },
  ]} />` },
  ],
  tag: [
    { title: "Invalid recipients", description: "Error tags flag addresses that fail validation; each tag is removable.", render: () => <TagInvalidRecipientsExample />, code: `<Tag error={!valid(email)} leading={<Icon name="icon-mail-01-line" />} remove onRemove={() => remove(email)}>{email}</Tag>` },
    { title: "Keyword input", description: "Enter adds a tag, Backspace on an empty field removes the last one, duplicates show an error.", render: () => <TagInputExample />, code: `<InputField label="Keywords" value={draft} error={error}
  onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Backspace" && !draft) removeLast(); }} />
{tags.map((tag) => <Tag key={tag} remove onRemove={() => remove(tag)}>{tag}</Tag>)}` },
    { title: "Keywords with create", description: "AutocompleteField with onCreate: new keywords become Tags; return the new option's id to select it.", render: () => <TagCreateExample />, code: `<AutocompleteField label="Keywords" options={options} value={value} onChange={setValue}
  popoverLabel="Select a keyword or create one" createLabel="Create"
  onCreate={(label) => { setOptions((o) => [...o, { id: label, label }]); return label; }} />` },
    { title: "Recipients", description: "Autocomplete field built on Tag + Popover; invalid people are flagged with the Error state.", render: () => <TagRecipientsExample />, code: `<AutocompleteField label="Share with" addLabel="Add people"
  options={people.map((p) => ({ id: p.id, label: p.name, photoSrc: p.photo }))}
  value={to} onChange={setTo} invalidValues={outside} error={outside.length ? "Outside your organization" : undefined} />` },
  ],
  tooltip: [
    { title: "Image annotations", description: "Black-Overlay and White-Overlay tooltips on imagery, placed right and left of their pins.", render: () => <TooltipAnnotationsExample />, code: `<Tooltip content="Primary CTA" placement="left" color="white-overlay" size="small">
  <IconButton appearance="overlay" level="white-overlay" size="xs" aria-label="Annotation" icon={…} />
</Tooltip>` },
    { title: "Toolbar hints", description: "Small tooltips name icon-only buttons and show their shortcut; they appear on hover after a delay and instantly on keyboard focus.", render: () => <TooltipToolbarExample />, code: `<Tooltip content="Bold · ⌘B" size="small">
  <IconButton aria-label="Bold" level="tertiary" size="sm" aria-pressed={bold} onClick={() => setBold(!bold)} icon={<Icon name="icon-bold-01-line" />} />
</Tooltip>` },
    { title: "Copy feedback", description: "Controlled open briefly confirms the action with the Accent color.", render: () => <TooltipCopyExample />, code: `<Tooltip content={copied ? "Copied!" : "Copy link"} color={copied ? "accent" : "default"} open={copied || undefined}>
  <IconButton aria-label="Copy link" icon={<Icon name="icon-copy-line" />} onClick={copy} />
</Tooltip>` },
    { title: "Truncated text", description: "Reveal the full file name without widening the list.", render: () => <TooltipTruncateExample />, code: `<Tooltip content={file.name} placement="bottom" size="small">
  <button className="truncate">{file.name}</button>
</Tooltip>` },
  ],
  tabs: [
    { title: "Icons and badges", description: "Indicator tabs with leading icons and counters.", render: () => <TabsIconBadgeExample />, code: `<Tabs aria-label="Mail" items={[{ id: "inbox", label: "Inbox", icon: <Icon name="ic-inbox-01-line" />, badge: 8 }, …]} value={tab} onChange={setTab} />` },
    { title: "Mobile, full width", description: "Small, full-width tabs in a narrow card; a disabled tab stays visible.", render: () => <TabsMobileExample />, code: `<Tabs aria-label="Order" size="small" fullWidth items={[{ id: "overview", label: "Overview" }, { id: "refunds", label: "Refunds", disabled: true }]} />` },
    { title: "Settings page", description: "Indicator tabs with icons, counters and a disabled tab; each tab controls a TabPanel.", wide: true, render: () => <TabsSettingsExample />, code: `<Tabs idPrefix="settings" aria-label="Workspace settings" value={tab} onChange={setTab} items={[
  { id: "general", label: "General", icon: <Icon name="icon-settings-01-line" /> },
  { id: "members", label: "Members", icon: <Icon name="icon-user-circle-line" />, badge: 5 },
  { id: "billing", label: "Billing", disabled: true },
]} />
<TabPanel idPrefix="settings" id="general" hidden={tab !== "general"}>…</TabPanel>` },
    { title: "Metric period switch", description: "Small Subtle tabs inside a dashboard card.", render: () => <TabsPeriodExample />, code: `<Tabs size="small" variant="subtle" aria-label="Period" value={period} onChange={setPeriod}
  items={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]} />` },
  ],
  breadcrumbs: [
    { title: "Page header", description: "Breadcrumbs above the page title with Tertiary + Primary actions; clicking a crumb navigates up.", render: () => <BreadcrumbsHeaderExample />, code: `<Breadcrumbs items={path} onNavigate={(item) => go(item.id)} />
<h1>Website redesign</h1>` },
    { title: "In-page sections", description: "master={false} drops the home icon for in-page navigation such as Settings.", render: () => <BreadcrumbsSettingsExample />, code: `<Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }, …]} />` },
    { title: "File browser", description: "Open folders to go deeper; click a breadcrumb to go back up.", render: () => <BreadcrumbsDriveExample />, code: `<Breadcrumbs
  items={trail.map((f) => ({ id: f.id, label: f.name }))}
  onNavigate={(item) => setTrail(trail.slice(0, indexOf(item.id) + 1))}
/>` },
    { title: "Long path", description: "maxItems keeps the first level and the last three; “…” expands the rest.", render: () => <BreadcrumbsCollapsedExample />, code: `<Breadcrumbs maxItems={4} emphasis="medium" items={path}
  onNavigate={(item, event) => { event.preventDefault(); router.push(item.href); }} />` },
  ],
  progress: [
    { title: "Storage quota", description: "Status theme on the quota scale: green while there is room, Warning from 75%, Negative from 90%; the upgrade CTA appears above 80%.", render: () => <ProgressStorageExample />, code: `<ProgressBar value={used} theme="status" scale="quota" aria-label="Storage used" />` },
    { title: "Onboarding steps", description: "Progress-Circles as step indicators: green when done, accent for the current step.", render: () => <ProgressOnboardingExample />, code: `<ProgressCircle value={done ? 100 : current ? 50 : 0} theme={done ? "green" : "accent"} label="Team" />` },
    { title: "File uploads", description: "Accent bars while uploading; Status theme turns green when a file completes.", render: () => <ProgressUploadExample />, code: `<ProgressBar value={file.progress} theme={file.progress >= 100 ? "status" : "accent"}
  aria-label={\`\${file.name} upload\`} />` },
    { title: "Setup checklist", description: "Progress-Circle per task with its label, plus an overall Status bar.", render: () => <ProgressChecklistExample />, code: `<ProgressBar value={overall} theme="status" label={\`\${overall}% set up\`} />
<ProgressCircle value={step.progress} theme="green" label="Invite your team" />` },
  ],
  accordion: [
    { title: "Filter panel", description: "A side panel of Medium Divider accordions, one per facet: the title shows a Badge-Counter of its picks, Clear all resets, and the primary action shows the live result count.", render: () => <AccordionFiltersExample />, code: `<Card theme="border" spacing="small" as="section" aria-label="Filters">
  <header>
    <Text as="span" textStyle="Heading/4">Filters</Text> <BadgeCounter size="small" value={applied} />
    <Button level="tertiary" size="sm" disabled={!applied} onClick={clearAll}>Clear all</Button>
  </header>
  {facets.map((facet) => (
    <Accordion key={facet.id} size="medium" title={<>{facet.title} <BadgeCounter size="xsmall" value={picked(facet)} /></>}>
      {facet.options.map((option) => <Checkbox key={option.id} label={option.label} checked={…} onChange={…} />)}
    </Accordion>
  ))}
  <Button level="primary" size="md">Show {results} projects</Button>
</Card>` },
    { title: "Release notes", description: "XLarge size with the Divider theme for long-form, one-at-a-time sections.", render: () => <AccordionReleaseNotesExample />, code: `<Accordion size="xlarge" theme="divider" title="v1.0.2" expanded={open === "v1.0.2"} onExpandedChange={…}>…</Accordion>` },
    { title: "FAQ", description: "Box theme; several answers can be open at once, the first starts expanded.", render: () => <AccordionFaqExample />, code: `<Accordion theme="box" title="Can I change my plan later?" defaultExpanded>
  Upgrades apply immediately…
</Accordion>` },
    { title: "Settings sections", description: "Divider theme, Large size, one section open at a time; the title slot takes a Badge-Counter.", render: () => <AccordionSettingsExample />, code: `<Accordion size="large" title={<>Notifications <BadgeCounter size="small" theme="neutral" background="subtle" value={5} /></>}
  expanded={open === "notifications"} onExpandedChange={(next) => setOpen(next ? "notifications" : "")}>…</Accordion>` },
  ],
  "alert-banner": [
    { title: "Error with retry", description: "Negative banner with Retry; it switches to Info while retrying and Positive on success.", render: () => <AlertRetryExample />, code: `<AlertBanner theme="negative" action={{ label: "Retry", onClick: retry }}>We couldn't load your invoices.</AlertBanner>` },
    { title: "Product announcement", description: "Info theme at Medium with an action, plus a Small Positive banner without a leading icon.", render: () => <AlertAnnouncementExample />, code: `<AlertBanner theme="info" action={{ label: "What's new", onClick: open }} onClose={dismiss}>Zen DS 1.0.2 adds five new components.</AlertBanner>
<AlertBanner theme="positive" size="small" leading={false}>…</AlertBanner>` },
    { title: "Page-level notice", description: "A Warning banner on top of the page with an action; both the action and close dismiss it.", wide: true, render: () => <AlertPageExample />, code: `<AlertBanner theme="warning" action={{ label: "Upgrade", onClick: upgrade }} onClose={dismiss}>
  Your trial ends in 3 days. Upgrade to keep your projects.
</AlertBanner>` },
    { title: "Connection status", description: "Small banner whose theme follows the sync state (Negative → Info → Positive).", render: () => <AlertConnectionExample />, code: `<AlertBanner size="small" theme={online ? "positive" : "negative"}>{message}</AlertBanner>` },
  ],
  pagination: [
    { title: "Audit log", description: "Manually theme: type the page size, read the range, step with ‹ ›.", render: () => <PaginationAuditLogExample />, code: `<Pagination theme="manually" page={page} onPageChange={setPage} total={1240} pageSize={size} onPageSizeChange={setSize} />` },
    { title: "Photo gallery", description: "Secondary theme with Small (32px) items: a quieter selected state for media grids.", render: () => <PaginationGalleryExample />, code: `<Pagination theme="secondary" size="small" page={page} onPageChange={setPage} pageCount={6} />` },
    { title: "Table footer", description: "Inline theme: the Chip picks the page size, the label shows the visible range. Every row of the page is rendered; a long page scrolls inside the table (sticky header) instead of pushing the footer away.", render: () => <PaginationTableExample />, code: `<div className="table-scroll" role="region" tabIndex={0} aria-label="Invoices 1–10 of 137">
  <Table aria-label="Invoices" rows={pageRows} columns={columns} />
</div>
<Pagination theme="inline" page={page} onPageChange={setPage}
  total={rows.length} pageSize={pageSize} pageSizeOptions={[5, 10, 25, 50]} onPageSizeChange={setPageSize} />` },
    { title: "Search results", description: "Primary theme with Small (32px) items over 24 pages; the range collapses around the current page.", render: () => <PaginationResultsExample />, code: `<Pagination size="small" page={page} onPageChange={setPage} pageCount={24} />` },
  ],
  toast: [
    { title: "Export ready", description: "Positive toast with a Download action after a background export.", render: () => <ToastExportExample />, code: `<Toast type="positive" title="Export ready" action={{ label: "Download", onClick: download }} onClose={close}>members-2026-09.csv · 48 KB</Toast>` },
    { title: "Inline confirmations", description: "Subtle (popover surface, outside stroke) for low-key feedback; Warning with an Upgrade action.", render: () => <ToastInlineExample />, code: `<Toast type="subtle" title="Link copied" onClose={close}>Anyone with the link can view this file.</Toast>
<Toast type="warning" title="Storage almost full" action={{ label: "Upgrade", onClick: upgrade }}>…</Toast>` },
    { title: "Stacked notifications", description: "ToastStack queues up to three, auto-dismisses (paused on hover/focus) and animates enter, exit and reflow.", render: () => <ToastStackExample />, code: `const [toasts, setToasts] = useState<ToastItem[]>([]);
const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

<Button onClick={() => setToasts((t) => [...t, { id: Date.now(), type: "positive", title: "Project published" }])}>Publish</Button>
<ToastStack toasts={toasts} onDismiss={dismiss} placement="bottom-center" duration={4000} max={3} />` },
    { title: "Undo delete", description: "Neutral toast with an Undo action that restores the item in place.", render: () => <ToastUndoExample />, code: `<Toast title={\`“\${name}” deleted\`} action={{ label: "Undo", onClick: restore }} onClose={close} />` },
  ],
  skeleton: [
    { title: "Table rows", description: "A round avatar and text line, a status pill and the amount stand in for each row while the Table loads (aria-busy on the region).", render: () => <SkeletonTableExample />, code: `<div aria-busy="true" aria-label="Loading invoices">
  <Table aria-label="Invoices (loading)" rows={rows} getRowId={(row) => row} columns={[
    { id: "invoice", header: "Invoice", cell: () => <><SkeletonShape shape="round" size="xsmall" /><SkeletonText lines={1} /></> },
    { id: "status", header: "Status", cell: () => <SkeletonShape shape="pill" size="xsmall" /> },
    { id: "amount", header: "Amount", align: "right", cell: () => <SkeletonText lines={1} /> },
  ]} />
</div>` },
    { title: "Loading dashboard", description: "Heading Large, Rectangle and Square shapes block out a dashboard while metrics load.", render: () => <SkeletonDashboardExample />, code: `<SkeletonHeading size="large" />
<SkeletonShape shape="rectangle" size="small" />
<SkeletonShape shape="square" size="small" />` },
    { title: "Loading card", description: "Round shape + heading + two lines stand in for the avatar, name and message.", render: () => <SkeletonCardExample />, code: `<div aria-busy={loading}>
  {loading ? <><SkeletonShape shape="round" size="medium" /><SkeletonHeading size="small" /><SkeletonText lines={2} /></> : content}
</div>` },
    { title: "Loading list", description: "Rows of round avatar, one text line and a pill for the role badge.", render: () => <SkeletonListExample />, code: `<SkeletonShape shape="round" size="small" />
<SkeletonText lines={1} />
<SkeletonShape shape="pill" size="xsmall" />` },
  ],
  dialog: [
    { title: "Vertical actions", description: "Direction=Vertical: three full-width actions stacked Primary → Secondary → Tertiary, for a choice that deserves equal weight.", render: () => <DialogVerticalActionsExample />, code: `<Dialog open={open} onOpenChange={setOpen} theme="info" title="You're out of seats"
  actionsDirection="vertical"
  primaryAction={{ label: "Upgrade to Business", onClick: upgrade }}
  secondaryAction={{ label: "Add 1 seat · $12/month", onClick: addSeat }}
  tertiaryAction={{ label: "Not now" }} />` },
    { title: "Form · Basic", description: "Modal/Forms Layout=Basic (440px). onSubmit wraps it in a form: Enter or Send invite submits and the email validates first.", render: () => <ModalFormInviteExample />, code: `<ModalForm open={open} onOpenChange={setOpen} title="Invite a member"
  description="They'll get an email with a link to join Zen Studio."
  onSubmit={sendInvite}
  primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Work email" type="email" error={error} />
  <SelectField label="Role" options={roles} />
</ModalForm>` },
    { title: "Form · 1-3 with preview", description: "Layout=1-3 (876px): a 240px Side-Content column shows a live profile preview beside the fields.", wide: true, render: () => <ModalFormProfileExample />, code: `<ModalForm layout="1-3" title="Edit profile" side={<ProfilePreview name={name} title={title} />}
  onSubmit={save} primaryAction={{ label: "Save profile" }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Display name" maxLength={40} characterLimit />
  <InputField label="Title" labelOptional />
  <TextAreaField label="Bio" labelOptional rows={3} />
</ModalForm>` },
    { title: "Form · Half-Half", description: "Layout=Half-Half (876px): the workspace card on the left updates as the name and colour change.", wide: true, render: () => <ModalFormWorkspaceExample />, code: `<ModalForm layout="half-half" title="Create a workspace" side={<WorkspaceCard name={name} color={color} />}
  onSubmit={create} primaryAction={{ label: "Create workspace", disabled: !name }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Workspace name" helpText={\`URL: zen.app/\${slug}\`} />
  <InputLabel>Color</InputLabel>
  <ColorSelector aria-label="Workspace color" value={color} onChange={setColor}
    colors={["indigo", "blue", "teal", "green", "orange", "red", "pink", "purple"].map((id) => ({
      value: \`var(--zen-color-background-support-\${id}-solid)\`, label: id }))} />
</ModalForm>` },
    { title: "Form · Big with steps", description: "Layout=Big (960px): the header comes first, then a Stepper at the top of Main-Contents; Back appears as the tertiary action from step 2.", wide: true, render: () => <ModalFormImportExample />, code: `<ModalForm layout="big" title="Import tokens"
  onSubmit={last ? runImport : next}
  primaryAction={{ label: last ? "Import 2,214 tokens" : "Continue" }}
  secondaryAction={{ label: "Cancel" }}
  tertiaryAction={step > 0 ? { label: "Back", onClick: back } : undefined}>
  <Stepper aria-label="Import steps" steps={steps} current={step} onStepClick={(_, i) => setStep(i)} />
  {stepFields}
</ModalForm>` },
    { title: "Invite teammates", description: "Info theme with an Input in the Custom slot; Send stays disabled until the email is valid.", render: () => <DialogInviteExample />, code: `<Dialog open={open} onOpenChange={setOpen} theme="info" title="Invite teammates"
  primaryAction={{ label: "Send invite", disabled: !valid, onClick: send }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Work email" value={email} onChange={…} />
</Dialog>` },
    { title: "Destructive confirmation", description: "Negative theme with a Custom slot: Delete stays disabled until the name is typed. Cancel gets initial focus.", render: () => <DialogDeleteExample />, code: `<Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete “Marketing site”?"
  description="This can't be undone."
  primaryAction={{ label: "Delete project", level: "danger", disabled: typed !== name, onClick: remove }}
  secondaryAction={{ label: "Cancel", autoFocus: true }}>
  <InputField label="Type the name to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} />
</Dialog>` },
    { title: "Unsaved changes", description: "Warning theme with three actions (Button=Triple): the tertiary action sits on the left.", render: () => <DialogUnsavedExample />, code: `<Dialog open={open} onOpenChange={setOpen} theme="warning" title="Save changes before leaving?"
  primaryAction={{ label: "Save & leave", onClick: save }}
  secondaryAction={{ label: "Stay" }}
  tertiaryAction={{ label: "Discard", level: "danger-subtle", onClick: discard }} />` },
    { title: "Success", description: "Positive theme with a single action.", render: () => <DialogSuccessExample />, code: `<Dialog open={open} onOpenChange={setOpen} theme="positive" title="Your site is live"
  primaryAction={{ label: "Done" }} />` },
  ],
  "date-picker": [
    { title: "Birthday", description: "Single date, future disabled (maxDate), starting in 1995; the month/year wheel jumps decades.", render: () => <DateBirthdayExample />, code: `const [month, setMonth] = useState(() => new Date(1995, 5, 1));
<DatePicker value={date} onValueChange={setDate} maxDate={today} month={month} onMonthChange={setMonth} />` },
    { title: "Report period", description: "Dual calendar with range selection and Cancel / Submit actions.", render: () => <DateReportRangeExample />, code: `<DatePicker calendar="dual" selectionMode="range" onRangeChange={setRange} showActions action="dual" />` },
    { title: "Booking range", description: "Range selection with past dates disabled and a live night count.", wide: true, render: () => <DateBookingExample />, code: `<DatePicker selectionMode="range" minDate={today}
  onRangeChange={({ start, end }) => setRange({ start, end })} />` },
    { title: "Date field in a form", description: "The field opens the calendar on focus and formats the picked date.", render: () => <DateFieldFormExample />, code: `<DateField label="Date" onDateChange={setDate} helpText={date ? format(date) : "Click the field to open the calendar"} />` },
  ],
  divider: [
    { title: "Settings rows", description: "Default (Pale) dividers between static rows — the everyday rule.", render: () => <DividerSettingsExample />, code: `{rows.map(([label, value], index) => (
  <Fragment key={label}>
    {index > 0 ? <Divider /> : null}
    <Row label={label} value={value} />
  </Fragment>
))}` },
    { title: "Toolbar groups", description: "A decorative vertical divider separates formatting from insert actions.", render: () => <DividerToolbarExample />, code: `<div role="toolbar" aria-label="Formatting">
  <IconButton aria-label="Bold" aria-pressed={bold} … />
  <Divider orientation="vertical" decorative />
  <IconButton aria-label="Insert link" onClick={insertLink} icon={<Icon name="icon-link-01-line" />} />
</div>` },
    { title: "Receipt total", description: "High (Solid) marks the one line that closes a calculation.", render: () => <DividerReceiptExample />, code: `<LineItem label="Discount" amount="−$6.80" />
<Divider color="high" />
<Total amount="$61.20" />` },
    { title: "Labelled separator", description: "Dashed dividers step up to Subtle; the label sits between two decorative lines.", render: () => <DividerLabelledExample />, code: `<div className="row">
  <Divider dashed decorative />
  <Text as="span">or</Text>
  <Divider dashed decorative />
</div>` },
  ],
  "inline-message": [
    { title: "Context above a form", description: "Warning on its Subtle surface; the text stays Strongest/Base while the icon uses Light.", render: () => <InlineContextExample />, code: `<InlineMessage theme="warning" title="You're editing production">
  Changes publish to 12 live sites as soon as you save.
</InlineMessage>` },
    { title: "Upgrade prompt", description: "Info with one Tertiary action and a close control.", render: () => <InlineUpgradeExample />, code: `<InlineMessage theme="info" title="Version history is limited to 30 days"
  action={{ label: "View plans", onClick: openPlans }} onClose={dismiss}>
  Upgrade to Pro to keep every version forever.
</InlineMessage>` },
    { title: "Result of an action", description: "Positive replaces the button once the check finishes, next to the field it describes.", render: () => <InlineVerifyExample />, code: `{verified
  ? <InlineMessage theme="positive" title="Domain verified">DNS records found…</InlineMessage>
  : <Button level="primary" onClick={verify}>Verify domain</Button>}` },
    { title: "Form error summary", description: "Negative summary above fields that each carry their own inline error.", render: () => <InlineFormErrorsExample />, code: `<InlineMessage theme="negative" title="2 fields need attention">
  Fix the highlighted fields, then submit again.
</InlineMessage>
<InputField label="Card number" error="Enter all 16 digits." />` },
    { title: "Custom visual", description: "Theme Custom swaps the icon for any visual — here an Avatar.", render: () => <InlineCustomVisualExample />, code: `<InlineMessage theme="custom" icon={<Avatar size="small" theme="blue" alt="">AC</Avatar>}
  title="Ava shared “Q4 roadmap”" action={{ label: "Open file", onClick: open }}>
  You can comment; ask Ava for edit access.
</InlineMessage>` },
  ],
  "empty-state": [
    { title: "No search results", description: "Echo the query and offer a way out (Tertiary “Clear search”).", render: () => <EmptySearchExample />, code: `<EmptyState title={\`No results for “\${query}”\`} icon="icon-search-medium-line"
  secondaryAction={{ label: "Clear search", onClick: clear }}>
  Check the spelling or try a broader term.
</EmptyState>` },
    { title: "First run", description: "One Primary action that creates the first item.", render: () => <EmptyFirstRunExample />, code: `<EmptyState title="Your inbox is empty" icon="icon-mail-01-line"
  primaryAction={{ label: "Compose message", onClick: compose }}>
  Messages from your team and clients land here.
</EmptyState>` },
    { title: "Filtered to nothing", description: "Inside a list, drop the illustration and let users clear the filter.", render: () => <EmptyFilteredExample />, code: `<EmptyState title="No blocked tasks" illustration={false}
  secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>
  Nothing is stuck right now. Nice.
</EmptyState>` },
    { title: "No permission", description: "Primary requests access; the caption updates after the request.", render: () => <EmptyPermissionExample />, code: `<EmptyState title="You don't have access" icon="icon-lock-01-line"
  primaryAction={{ label: "Request access", onClick: request }}
  secondaryAction={{ label: "Back to projects", onClick: back }}>
  Ask the workspace owner to add you to “Finance Q4”.
</EmptyState>` },
  ],
  stepper: [
    { title: "Checkout", description: "Horizontal steps driven by Back / Continue; passed steps are clickable to edit.", wide: true, render: () => <StepperCheckoutExample />, code: `<Stepper aria-label="Checkout" steps={steps} current={current}
  onStepClick={(step, index) => setCurrent(index)} />
<Button level="tertiary" onClick={back}>Back</Button>
<Button level="primary" onClick={next}>Continue to payment</Button>` },
    { title: "Vertical onboarding", description: "Vertical Stepper-Bar beside a content panel: steps are clickable, Back / Next move through them and the last step finishes.", wide: true, render: () => <StepperVerticalExample />, code: `<div className="onboarding">
  <Stepper aria-label="Onboarding" orientation="vertical" steps={steps} current={current}
    onStepClick={(_, index) => setCurrent(index)} />
  <section aria-live="polite">
    <h3>{steps[current].title}</h3>
    <p>{details[current]}</p>
    <Button level="tertiary" size="sm" disabled={current === 0} onClick={back}>Back</Button>
    <Button level="primary" size="sm" onClick={next}>{last ? "Finish" : "Next step"}</Button>
  </section>
</div>` },
    { title: "Error and recovery", description: "State=Error on a failed step with an Inline Message that fixes it.", render: () => <StepperErrorExample />, code: `<Stepper aria-label="Token import" current={1} steps={[
  { id: "upload", title: "Upload" },
  { id: "validate", title: "Validate", caption: "3 invalid tokens", error: true },
  { id: "publish", title: "Publish" },
]} />` },
    { title: "Icon steps", description: "Style=Icon: icons replace numbers for a read-only status tracker.", wide: true, render: () => <StepperIconExample />, code: `<Stepper aria-label="Order status" current={2} steps={[
  { id: "ordered", title: "Ordered", caption: "Sep 24", icon: "icon-package-line" },
  { id: "paid", title: "Paid", caption: "Sep 24", icon: "icon-credit-card-line" },
  …
]} />` },
  ],
  slider: [
    { title: "Volume", description: "Medium Neutral with a leading icon and a visible value.", render: () => <SliderVolumeExample />, code: `<Slider aria-label="Volume" value={volume} onChange={setVolume}
  icon="icon-volume-max-solid" valueText={(value) => \`\${value}%\`} />` },
    { title: "On media", description: "White Large sits on imagery; the knob appears on hover and hold.", render: () => <SliderMediaExample />, code: `<Slider aria-label="Brightness" theme="white" size="large"
  value={brightness} onChange={setBrightness} icon="icon-sun-solid" />` },
    { title: "Stepped value with limits", description: "Accent Small, step 10 between 10 and 500 GB, with min/max labels.", render: () => <SliderStorageExample />, code: `<Slider aria-label="Storage per seat" theme="accent" size="small"
  min={10} max={500} step={10} value={gb} onChange={setGb} showLimits
  valueText={(value) => \`\${value} gigabytes\`} />` },
    { title: "Live preview", description: "Large Neutral drives the preview text size as you drag.", render: () => <SliderFontSizeExample />, code: `<Slider aria-label="Reading size" size="large" min={12} max={24}
  value={size} onChange={setSize} icon="icon-type-02-solid" />
<p style={{ fontSize: size }}>The quick brown fox…</p>` },
  ],
  card: [
    { title: "Selectable project cards", description: "Clickable Border cards step up to Neutral/Subtle; Active marks the selected one.", wide: true, render: () => <CardProjectGridExample />, code: `<Card theme="border" spacing="small" active={picked === project.id}
  onClick={() => setPicked(project.id)} aria-label={\`\${project.name}, \${project.meta}\`}>
  <DockIcon icon={project.icon} theme={project.theme} background="subtle" />
  <Text as="span">{project.name}</Text>
</Card>` },
    { title: "Stat cards", description: "Shadow cards for KPIs with a trend badge.", wide: true, render: () => <CardStatExample />, code: `<Card theme="shadow" spacing="small">
  <Text as="span">Active users</Text>
  <Text as="span" textStyle="Heading/3">8,930</Text>
  <TableTrend trend="up">+12.8%</TableTrend>
</Card>` },
    { title: "Sub-Action menu", description: "The top-right Sub-Action opens a Popover of card actions.", render: () => <CardSubActionExample />, code: `<div className="anchor"> {/* position: relative */}
  <Card theme="flat" subAction={<IconButton ref={triggerRef} appearance="flat" level="primary" size="sm"
    aria-label="Card actions" aria-expanded={open}
    onClick={() => setOpen(!open)} icon={<Icon name="icon-dots-horizontal-line" />} />}>
    …
  </Card>
  {/* Anchor to the Sub-Action button, not the card, so the menu opens 4px under it. */}
  <Popover open={open} onOpenChange={setOpen} anchorRef={triggerRef} align="end" items={actions} />
</div>` },
    { title: "Surfaces", description: "All five themes at Spacing=Small.", render: () => <CardSurfacesExample />, code: `<Card theme="shadow" spacing="small">…</Card>
<Card theme="flat" spacing="small">…</Card>
<Card theme="border" spacing="small">…</Card>
<Card theme="pale" spacing="small">…</Card>
<Card theme="semi-pale" spacing="small">…</Card>` },
    { title: "Pricing plans", description: "Border cards in a grid: Active marks the current plan, an Accent Badge marks the recommended one, and each card ends with one md CTA whose label says what happens (Upgrade / Switch / Manage). A Secondary Segmented switches the billing period.", wide: true, render: () => <CardPricingExample />, code: `<Segmented level="secondary" aria-label="Billing period" options={periods} value={period} onChange={setPeriod} />
<Card as="section" theme="border" spacing="medium" active={isCurrent} aria-label="Pro plan">
  <Text as="span" textStyle="Heading/Subheading">Pro</Text>
  {recommended ? <Badge theme="accent" background="subtle" size="small">Recommended</Badge> : null}
  <Text as="span" textStyle="Heading/2">$12</Text> <Text as="span" tone="light">per seat / month</Text>
  <ul>{features.map((f) => <li key={f}><Icon name="icon-check-line" decorative />{f}</li>)}</ul>
  <Button level={recommended ? "primary" : "tertiary"} size="md" onClick={upgrade}>Upgrade to Pro</Button>
</Card>` },
  ],
  "dock-icon": [
    { title: "App launcher", description: "Large Solid dock icons as app tiles.", render: () => <DockIconAppsExample />, code: `<button type="button" className="app-tile">
  <DockIcon icon="ic-figma-line" theme="purple" size="large" />
  <Text as="span">Figma</Text>
</button>` },
    { title: "Categories in a list", description: "Subtle dock icons lead List-Items; the label sits next to them, so the icon is decorative.", render: () => <DockIconCategoriesExample />, code: `<ListItem title="Groceries" caption="This month"
  leading={<DockIcon icon="icon-shopping-bag-01-line" theme="green" background="subtle" />}
  trailing={<Text as="span">$412.80</Text>} />` },
    { title: "Emoji reactions", description: "Theme=Emoji renders any glyph at the icon size.", render: () => <DockIconEmojiExample />, code: `<DockIcon theme="emoji" emoji="🎉" size="medium" />` },
    { title: "On color", description: "On-Color sits on Accent or imagery.", render: () => <DockIconOnColorExample />, code: `<DockIcon icon="icon-star-93-solid" theme="on-color" size="large" />` },
  ],
  "list-item": [
    { title: "Inbox", description: "Clickable rows with Selected state, avatar leading and a trailing time.", render: () => <ListItemInboxExample />, code: `<List aria-label="Inbox">
  <ListItem title="Ava Chen" caption="Slider spec is ready" selected onClick={open}
    leading={<Avatar size="medium" theme="photo" src={photo} alt="" />}
    trailing={<Text as="span">9:41</Text>} />
</List>` },
    { title: "Settings links", description: "Rows as links with a Pale dock icon and a chevron, inside a Border card.", render: () => <ListItemSettingsExample />, code: `<Card theme="border" spacing="small">
  <List aria-label="Settings">
    <ListItem title="Profile" caption="Name, photo, bio" href="/settings/profile"
      leading={<DockIcon icon="icon-user-circle-line" theme="pale" size="small" />}
      trailing={<Icon name="icon-chevron-right-line-small" decorative />} />
  </List>
</Card>` },
    { title: "Trailing actions", description: "Static rows with two Flat icon buttons (Figma Slot-Actions).", render: () => <ListItemActionsExample />, code: `<ListItem title={name} caption="Editor · invited 2d ago" leading={<Avatar size="medium" theme="photo" src={photo} alt="" />}
  trailing={<>
    <IconButton appearance="flat" level="primary" size="md" aria-label="Resend invite" … />
    <IconButton appearance="flat" level="primary" size="md" aria-label="Revoke invite" … />
  </>} />` },
    { title: "Custom contents", description: "The Contents slot takes any content — here a progress bar.", render: () => <ListItemCustomContentExample />, code: `<ListItem title="brand-kit.zip" leading={<DockIcon icon="icon-folder-line" theme="blue" background="subtle" size="small" />}>
  <Text as="span">brand-kit.zip</Text>
  <ProgressBar value={72} theme="accent" label="72%" />
</ListItem>` },
    { title: "Grouped sections", description: "Long settings split into groups: each group has a visible heading and its own List named after it, so screen readers announce “Account, list, 2 items”.", render: () => <ListItemGroupedExample />, code: `<section aria-labelledby="account">
  <h3 id="account">Account</h3>
  <Card theme="border" spacing="small">
    <List aria-label="Account">
      <ListItem title="Profile" caption="Name, photo, bio" href="/settings/profile"
        leading={<DockIcon icon="icon-user-circle-line" theme="pale" size="small" />}
        trailing={<Icon name="icon-chevron-right-line-small" decorative />} />
    </List>
  </Card>
</section>` },
  ],
  table: [
    { title: "Inline edit · inventory", description: "Notion-style cells: one click edits (or select a cell with the arrows and just type), long text grows, Enter saves, Tab moves on, Escape leaves and keeps the value. Totals recompute on save; invalid numbers stay in Edit with an error.", wide: true, render: () => <TableInventoryEditExample />, code: `<Table aria-label="Inventory" rows={items} getRowId={(item) => item.id} columns={[
  { id: "name", header: "Product", cell: (item) => <TableText bold>{item.name}</TableText>,
    edit: { type: "text", value: (item) => item.name, validate: (v) => v.trim() ? undefined : "Name can't be empty",
      onCommit: (item, name) => update(item.id, { name }) } },
  { id: "qty", header: "Qty", align: "right", cell: (item) => <TableText>{item.qty}</TableText>,
    edit: { type: "number", value: (item) => item.qty, validate: (v) => Number.isInteger(+v) && +v >= 0 ? undefined : "Whole number, 0 or more",
      onCommit: (item, qty) => update(item.id, { qty }) } },
  { id: "total", header: "Total", align: "right", cell: (item) => <TableText bold>{usd(item.qty * item.price)}</TableText> },
]} />` },
    { title: "Editable tasks", description: "One click opens a searchable list for Status and Assignee (type, then Enter picks the top match) and the Labels editor (Enter picks a suggestion or creates the tag). Clicking a label filters by it; clicking the cell around the labels edits them. Open appears on hover; Done locks the row.", wide: true, render: () => <TableTaskEditExample />, code: `{ id: "status", header: "Status", cell: (row) => <Badge …>{label}</Badge>,
  edit: { type: "select", value: (row) => row.status, options: statuses, onCommit: (row, status) => update(row.id, { status }) } },
{ id: "labels", header: "Labels", cell: (row) => row.labels.map((l) => <Tag key={l}>{l}</Tag>),
  edit: { type: "tags", value: (row) => row.labels, suggestions, disabled: (row) => row.status === "done",
    onCommit: (row, labels) => update(row.id, { labels }) } },
{ id: "title", header: "Task", cell: …, onOpen: (row) => openTask(row.id) }` },
    { title: "Sortable members", description: "Media cells with avatars, a status Badge, right-aligned numbers and an actions column.", wide: true, render: () => <TableMembersExample />, code: `<Table aria-label="Members" rows={rows} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
  columns={[
    { id: "name", header: "Member", sortable: true, cell: (row) => <TableMedia media={<Avatar size="small" theme="photo" src={row.photo} alt="" />} caption={row.role}>{row.name}</TableMedia> },
    { id: "status", header: "Status", cell: (row) => <Badge size="medium" background="subtle" theme="green">{row.status}</Badge> },
    { id: "seats", header: "Seats", sortable: true, align: "right", cell: (row) => <TableText>{row.seats}</TableText> },
  ]} />` },
    { title: "Invoices with pagination", description: "Header icon, Text cells with captions and Pagination (Inline) under the table.", wide: true, render: () => <TableInvoicesExample />, code: `<Table aria-label="Invoices" rows={pageRows} getRowId={(row) => row.id} columns={[
  { id: "id", header: "Invoice", icon: "icon-file-doc-line", cell: (row) => <TableText bold>{row.id}</TableText> },
  { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> },
]} />
<Pagination theme="inline" page={page} onPageChange={setPage} total={total} pageSize={5} />` },
    { title: "Empty result", description: "The empty prop renders an Empty State across all columns.", render: () => <TableEmptyExample />, code: `<Table aria-label="Members" rows={[]} getRowId={(row) => row.id} columns={columns}
  empty={<EmptyState title="No members match “zzz”" illustration={false}
    secondaryAction={{ label: "Clear filter", onClick: clear }} />} />` },
    { title: "Bulk selection", description: "Selectable rows with an indeterminate select-all header.", render: () => <CheckboxBulkTableExample />, code: `<Table aria-label="Files" rows={files} getRowId={(file) => file.id}
  selectable selectedIds={picked} onSelectionChange={setPicked} columns={columns} />` },
  ],
  rating: [
    { title: "Review summary", description: "RatingDisplay with a fractional value, the count and a distribution of Progress bars.", render: () => <RatingSummaryExample />, code: `<RatingDisplay value={4.6} size="medium" />
<ProgressBar value={68} theme="neutral" aria-label="5 stars: 68%" />` },
    { title: "Leave a review", description: "Star input with a word for each value; submit stays disabled until a star is picked.", render: () => <RatingReviewExample />, code: `<Rating aria-label="Rate the Dashboard template" value={stars} onChange={setStars} size="large" />
<Button level="primary" disabled={!stars}>Submit review</Button>` },
    { title: "Opinion scale", description: "Three emoji options; a negative answer asks for details.", render: () => <RatingOpinionExample />, code: `<OpinionScale scale={3} value={mood} onChange={setMood} aria-label="How was setting up your workspace?" />` },
    { title: "NPS survey", description: "0–10 number chips with end labels; the score is classified live.", render: () => <RatingNpsExample />, code: `<NpsScale scale={10} value={score} onChange={setScore} lowLabel="Not likely" highLabel="Very likely"
  aria-label="How likely are you to recommend Zen to a colleague?" />` },
  ],
  "color-selector": [
    { title: "Label colour", description: "Pick a label colour and preview it on a Badge.", render: () => <ColorLabelExample />, code: `<ColorSelector aria-label="Label colour" value={color} onChange={setColor}
  colors={[{ value: "blue", label: "Blue" }, { value: "yellow", label: "Yellow", contrast: "dark" }, …]} />` },
    { title: "Event colour", description: "Swatches inside a Card recolour the event marker.", render: () => <ColorEventExample />, code: `<ColorSelector aria-label="Event colour" colors={colors} value={color} onChange={setColor} />` },
    { title: "Brand colour with light swatch", description: "A White swatch keeps its hairline and a dark check (contrast=\"dark\").", render: () => <ColorBrandExample />, code: `{ value: "var(--zen-color-background-white-solid-default)", label: "White", contrast: "dark" }` },
    { title: "Keyboard", description: "One radio group: Tab in, arrows move; focus shows the 48px halo.", render: () => <ColorKeyboardExample />, code: `<ColorSelector aria-label="Chart series colour" colors={twelveColours} value={color} onChange={setColor} />` },
  ],
  metric: [
    { title: "KPI cards", description: "MetricCard (Large) on Shadow cards; each Dock-Icon theme colour-codes its category.", wide: true, render: () => <MetricKpiExample />, code: `<MetricCard size="large" label="Revenue" value="$48,210" icon="icon-credit-card-line" iconTheme="green"
  trend={{ direction: "positive", label: "+12% vs. last month" }}
  subAction={{ label: "Revenue actions", icon: "icon-dots-vertical-line", onClick: open }} />
<MetricCard size="large" label="Active users" value="8,930" icon="icon-users-line" iconTheme="blue" … />
<MetricCard size="large" label="Churn" value="2.1%" icon="icon-arrow-down-right-line" iconTheme="crimson" … />` },
    { title: "Sales by period", description: "A Segmented period switch updates four Border cards; Golden, Orange, Teal and Violet tell the metrics apart.", wide: true, render: () => <MetricSalesExample />, code: `<Segmented options={periods} value={range} onChange={setRange} aria-label="Sales period" />
<MetricCard size="medium" theme="border" label="Sales" value={sales} icon="icon-coins-stacked-01-line" iconTheme="golden" trend={…} />
<MetricCard size="medium" theme="border" label="Orders" value={orders} icon="icon-shopping-cart-line" iconTheme="orange" trend={…} />` },
    { title: "Budget by department", description: "Small metrics in a grid, one support colour per department so the eye can find each team.", wide: true, render: () => <MetricDepartmentsExample />, code: `<Card theme="flat" spacing="small">
  <Metric size="small" label="Design" value="$18.2K" icon="icon-palette-line" iconTheme="purple" />
  <Metric size="small" label="Engineering" value="$64.5K" icon="icon-code-02-line" iconTheme="indigo" />
  <Metric size="small" label="Marketing" value="$22.9K" icon="icon-rocket-line" iconTheme="pink" />
  …
</Card>` },
    { title: "Goal progress", description: "A Solid Accent Dock-Icon marks the headline goal; a Progress Bar shows how far along it is.", render: () => <MetricGoalExample />, code: `<Card theme="shadow">
  <Metric size="medium" label="Quarterly target" value="$184K of $240K" icon="icon-target-04-line" iconTheme="accent" iconBackground="solid" />
  <ProgressBar value={77} theme="accent" label aria-label="Quarterly target progress" />
</Card>` },
    { title: "Service health", description: "Status colours carry meaning: Green up, Orange slower, Red (Solid) for the one that needs action.", wide: true, render: () => <MetricHealthExample />, code: `<Metric size="small" label="Uptime" value="99.98%" icon="icon-activity-line" iconTheme="green" trend={…} />
<Divider orientation="vertical" decorative />
<Metric size="small" label="Errors" value="0.4%" icon="icon-alert-triangle-line" iconTheme="red" iconBackground="solid" trend={…} />` },
    { title: "Team pulse", description: "Dock-Icon Theme=Emoji for softer, people-centred metrics on Pale cards.", wide: true, render: () => <MetricPulseExample />, code: `<MetricCard size="large" theme="pale" label="Team mood" value="4.3 / 5" iconEmoji="😊" trend={{ direction: "positive", label: "+0.2 this week" }} />
<MetricCard size="large" theme="pale" label="Shipping streak" value="12 days" iconEmoji="🔥" trend={{ direction: "normal", label: "Best: 18" }} />` },
    { title: "Inline metrics", description: "Small metrics side by side in a Flat card, split by vertical Dividers.", wide: true, render: () => <MetricInlineExample />, code: `<Metric size="small" label="Open tickets" value="42" icon="ic-inbox-01-line" iconTheme="blue" … />
<Divider orientation="vertical" decorative />
<Metric size="small" label="CSAT" value="94%" icon="icon-face-smile-line" iconTheme="green" … />` },
    { title: "Metric with context", description: "A negative trend with a Solid Red icon, paired with an Inline Message that says what to do.", render: () => <MetricAlertExample />, code: `<MetricCard theme="border" label="Failed payments" value="37" icon="icon-alert-triangle-line" iconTheme="red" iconBackground="solid"
  trend={{ direction: "negative", label: "+9 vs. yesterday" }} />
<InlineMessage theme="negative" title="Card declines are rising" action={{ label: "View failed payments" }}>…</InlineMessage>` },
    { title: "Sizes", description: "Large stacks the icon; Medium–XSmall put it inline; the number scales Heading/1 → Subheading.", render: () => <MetricSizesExample />, code: `<Metric size="medium" label="Revenue" value="$1,680.68" iconTheme="blue" trend={{ direction: "positive", label: "+24%" }} />` },
  ],
  uploader: [
    { title: "Profile photo", description: "Single-file Browse Button: the photo File-Item takes the button's place (Replaceable); Replace re-opens the picker, Remove brings the button back.", render: () => <UploaderAvatarExample />, code: `<FileUpload label="Profile photo" type="button" accept="image/*" helpText="Square JPG or PNG, at least 256 px." thumbnail="photo"
  files={[{ id: "a", name: "ava.jpg", size: "240 KB", state: "replaceable", previewUrl: url }]}
  onFilesAdd={pick} onRemove={remove} />
// Single file (no multiple): the File-Item replaces the button; Replace re-opens the picker by default.` },
    { title: "Upload progress", description: "Uploading items show progress and time left, then settle to Uploaded.", render: () => <UploaderProgressExample />, code: `<FileUpload label="Quarterly reports" multiple thumbnail="file" files={files} onFilesAdd={upload} onRemove={cancel} />
// files: { state: "uploading", progress: 42, caption: "3 seconds left" }` },
    { title: "Rejected file", description: "Field error plus an Alert item with Retry and Remove.", render: () => <UploaderErrorExample />, code: `<FileUpload label="Signed contract" error="1 file couldn't be added." thumbnail="file"
  files={[{ id: "e1", name: "contract.docx", state: "alert", error: "Only PDF is accepted" }]}
  onRetry={retry} onRemove={remove} />` },
    { title: "Overlay item", description: "Theme=Overlay File-Item for busy or dark backgrounds.", render: () => <UploaderOverlayExample />, code: `<UploaderFileItem theme="overlay" thumbnail="file"
  file={{ id: "v", name: "launch-teaser.mp4", state: "uploading", progress: 42 }} onRemove={cancel} />` },
  ],
  "side-panel": [
    { title: "Row details", description: "A List row opens a Modal panel with the record; focus returns to the row on close.", render: () => <SidePanelDetailsExample />, code: `<ListItem title={person.name} onClick={() => setOpenId(person.id)} … />
<SidePanel open={Boolean(member)} onOpenChange={(open) => !open && setOpenId(null)} type="modal"
  title={member.name} description={member.role}
  primaryAction={{ label: "Send message" }} secondaryAction={{ label: "Close" }}>…</SidePanel>` },
    { title: "Filters", description: "A Small modal panel collects many filters at once.", render: () => <SidePanelFiltersExample />, code: `<Chip variant="advanced" size="small" leading={<Icon name="icon-filter-lines-line" decorative />}
  selectionMode="multiple" selectionCount={active} select={active > 0} aria-haspopup="dialog"
  onClick={() => setOpen(true)} onClearSelection={clearAll}>All filters</Chip>
<SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Filters"
  primaryAction={{ label: "Show results" }} secondaryAction={{ label: "Reset", onClick: reset }}>
  <Checkbox label="Open tasks" … />
</SidePanel>` },
    { title: "Docked inspector", screen: true, description: "Standard panel docked beside the canvas; the page stays interactive.", wide: true, render: () => <SidePanelInspectorExample />, code: `<div className="layout">
  <main>…</main>
  <SidePanel open={open} onOpenChange={setOpen} type="standard" size="small" title="Inspector">…</SidePanel>
</div>` },
    { title: "Activity feed", description: "A read-only panel (no actions) with a List.", render: () => <SidePanelActivityExample />, code: `<SidePanel open={open} onOpenChange={setOpen} type="modal" size="small" title="Activity" description="Last 24 hours">
  <List aria-label="Activity">…</List>
</SidePanel>` },
  ],
  ...mobileExamples,
};
// Phase-2 app layer examples (src/platform/appLayer/*): appended, so a group can add to an existing page too.
for (const [page, list] of Object.entries(appLayerExamples)) examples[page as PlatformPage] = [...(examples[page as PlatformPage] ?? []), ...list];
// Typography › Content hierarchy: one example per page type (master / child, desktop / phone) and emphasis inside a level.
examples.typography = [...(examples.typography ?? []), ...typographyHierarchyExamples];

export function ComponentExamples({ page }: { page: PlatformPage }) {
  const list = examples[page];
  if (!list?.length) return null;
  return (
    <section className="pe-section" aria-labelledby={`pe-${page}-title`}>
      <header className="pe-section__head">
        <h2 id={`pe-${page}-title`} className={typographyStyles["Heading/3"]}>Examples</h2>
        <p className={typographyStyles["Body/Base/Regular"]}>Real-world compositions. Everything is interactive — hover, click, type and use the keyboard.</p>
      </header>
      <div className="pe-grid">
        {list.map((example) => <ExampleCard key={example.title} title={example.title} description={example.description} code={example.code} wide={example.wide} screen={example.screen}>{example.render()}</ExampleCard>)}
      </div>
    </section>
  );
}
