import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar, AvatarStack, type AvatarTheme } from "../components/Avatar";
import { Badge, BadgeCounter, type BadgeTheme } from "../components/Badge";
import { Button, IconButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Chip, type ChipSize } from "../components/Chip";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { AutocompleteField, DateField, InputConditionItem, InputConditions, InputField, NumberField, SelectField, TextAreaField } from "../components/Input";
import { Popover, type PopoverItemData } from "../components/Popover";
import { RadioButton } from "../components/RadioButton";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { Sidebar, type SidebarSection } from "../components/Sidebar";
import { Tag } from "../components/Tag";
import { Toggle } from "../components/Toggle";
import { Tooltip } from "../components/Tooltip";
import { TabPanel, Tabs } from "../components/Tabs";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProgressBar, ProgressCircle } from "../components/Progress";
import { Dialog } from "../components/Dialog";
import { typographyStyles } from "../tokens/typography.generated";
import { PlatformCode } from "./PlatformCode";
import type { PlatformPage } from "./PlatformExamples";
import { PlatformTypographyContext } from "./PlatformTemplate";

/* Real-world compositions shown under each component playground. Every example
 * is a live, stateful composition of production components: no forced visual
 * states, so hover, focus, keyboard and outside-click behave like in an app. */

const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><rect x="6" y="21" width="20" height="14" rx="7" fill="${fg}"/></svg>`);
const people = [
  { id: "ava", name: "Ava Chen", role: "Product Designer", initials: "AC", theme: "blue" as AvatarTheme, photo: photo("#d9c7b8", "#8f735f"), online: true },
  { id: "bao", name: "Bao Nguyen", role: "Frontend Engineer", initials: "BN", theme: "green" as AvatarTheme, photo: photo("#c8d6c2", "#5f7a58"), online: true },
  { id: "chi", name: "Chi Tran", role: "Design Ops", initials: "CT", theme: "purple" as AvatarTheme, photo: photo("#d4cbe3", "#6d5b92"), online: false },
  { id: "duy", name: "Duy Le", role: "Product Manager", initials: "DL", theme: "red" as AvatarTheme, photo: photo("#e6c8c4", "#9a5a52"), online: false },
  { id: "em", name: "Em Pham", role: "QA Engineer", initials: "EP", theme: "teal" as AvatarTheme, photo: photo("#c4dfdc", "#4f8a84"), online: true },
];

function Text({ style = "Body/Base/Regular", tone = "strongest", children, as: Tag = "span" }: { style?: keyof typeof typographyStyles; tone?: "strongest" | "base" | "light"; children: ReactNode; as?: "span" | "p" | "strong" }) {
  return <Tag className={`pe-text pe-text--${tone} ${typographyStyles[style]}`}>{children}</Tag>;
}

function ExampleCard({ title, description, code, wide, children }: { title: string; description: string; code: string; wide?: boolean; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  const previewTypography = useContext(PlatformTypographyContext);
  return (
    <article className="pe-card" data-wide={wide ? "true" : undefined}>
      <header className="pe-card__head">
        <div className="pe-card__titles">
          <h3 className={typographyStyles["Body/Extra/Bold"]}>{title}</h3>
          <p className={typographyStyles["Body/Small/Regular"]}>{description}</p>
        </div>
        <Button appearance="main" level="tertiary" size="xs" aria-expanded={showCode} startIcon={<Icon name="icon-code-02-line" decorative />} onClick={() => setShowCode((open) => !open)}>
          {showCode ? "Hide code" : "Code"}
        </Button>
      </header>
      <div className="pe-card__stage" data-typography={previewTypography}>{children}</div>
      {showCode ? <div className="pe-card__code"><PlatformCode code={code} /></div> : null}
    </article>
  );
}

/* ───────────── Button ───────────── */

function ButtonDialogExample() {
  const [phase, setPhase] = useState<"idle" | "deleting" | "deleted">("idle");
  useEffect(() => {
    if (phase !== "deleting") return undefined;
    const timer = window.setTimeout(() => setPhase("deleted"), 1200);
    return () => window.clearTimeout(timer);
  }, [phase]);
  return (
    <div className="pe-dialog" role="dialog" aria-labelledby="pe-dialog-title">
      {phase === "deleted" ? (
        <>
          <Text style="Body/Base/Medium" as="p">“Marketing site” was deleted.</Text>
          <div className="pe-actions"><Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-refresh-cw-01-line" decorative />} onClick={() => setPhase("idle")}>Undo</Button></div>
        </>
      ) : (
        <>
          <span id="pe-dialog-title"><Text style="Body/Extra/Bold">Delete project?</Text></span>
          <Text tone="base" as="p">“Marketing site” and its 24 pages will be removed for everyone in the workspace.</Text>
          <div className="pe-actions">
            <Button appearance="main" level="tertiary" size="sm" disabled={phase === "deleting"}>Cancel</Button>
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
    <div className="pe-stack">
      <div className="pe-toolbar" role="toolbar" aria-label="Document actions">
        <IconButton appearance="main" level="tertiary" size="sm" aria-label="Undo" disabled={history.length <= 1} onClick={undo} icon={<Icon name="icon-reverse-left-line" />} />
        <IconButton appearance="main" level="tertiary" size="sm" aria-label="Redo" disabled={future.length === 0} onClick={redo} icon={<Icon name="icon-reverse-right-line" />} />
        <span className="pe-toolbar__divider" aria-hidden="true" />
        <Button appearance="main" level="tertiary" size="sm" startIcon={<Icon name="icon-edit-02-line" decorative />} onClick={edit}>Make an edit</Button>
        <span className="pe-grow" />
        <Button appearance="main" level="primary" size="sm" disabled={published} onClick={() => setPublished(true)}>{published ? "Published" : "Publish"}</Button>
      </div>
      <Text style="Caption/Regular" tone="light">{history.length - 1} change(s) · {future.length} to redo · {published ? "live" : "unpublished"}</Text>
    </div>
  );
}

/* ───────────── Chip ───────────── */

const tasks = [
  { id: 1, title: "Audit Checkbox hover", status: "in-progress", owner: "ava" },
  { id: 2, title: "Ship Date Picker range", status: "done", owner: "bao" },
  { id: 3, title: "Write Tag guidelines", status: "todo", owner: "chi" },
  { id: 4, title: "Token rename for Seclected", status: "todo", owner: "duy" },
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
    <div className="pe-stack">
      <div className="pe-row">
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
        {statuses.length || owner ? <Button appearance="main" level="tertiary" size="xs" onClick={() => { setStatuses([]); setOwner(null); }}>Clear all</Button> : null}
      </div>
      <ul className="pe-list" aria-live="polite">
        {rows.map((task) => (
          <li key={task.id} className="pe-list__row">
            <Text>{task.title}</Text>
            <Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge>
          </li>
        ))}
        {rows.length === 0 ? <li className="pe-empty"><Text tone="light">No tasks match these filters.</Text></li> : null}
      </ul>
    </div>
  );
}

function ChipTopicsExample() {
  const topics = ["Accessibility", "Tokens", "Motion", "Icons", "Dark mode", "Density", "Typography"];
  const [picked, setPicked] = useState<string[]>(["Tokens", "Dark mode"]);
  return (
    <div className="pe-stack">
      <Text style="Body/Base/Medium">Pick topics you want updates about</Text>
      <div className="pe-row" role="group" aria-label="Topics">
        {topics.map((topic) => {
          const on = picked.includes(topic);
          return <Chip key={topic} variant="normal" size="small" level={on ? "primary" : "secondary"} select={on} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((item) => item !== topic) : [...picked, topic])}>{topic}</Chip>;
        })}
      </div>
      <Text style="Caption/Regular" tone="light">{picked.length} selected</Text>
    </div>
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
    return <div className="pe-stack pe-center"><Icon name="icon-check-circle-line" size="lg" decorative /><Text style="Body/Extra/Bold">Welcome, {name.split(" ")[0]}!</Text><Text tone="base">We sent a confirmation link to {email}.</Text><Button appearance="main" level="tertiary" size="sm" onClick={() => { setSubmitted(false); setPassword(""); setAgree(false); }}>Start over</Button></div>;
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
      <div className="pe-stack pe-stack--tight">
        <InputField label="Password" required type="password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        <InputConditions>{rules.map((rule) => <InputConditionItem key={rule.label} label={rule.label} state={password ? (rule.ok ? "success" : "wrong") : "default"} />)}</InputConditions>
      </div>
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
      <DateField label="Billing starts" helpText="MM/DD/YYYY" />
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
      <div className="pe-results" aria-live="polite">
        {query ? (
          results.length ? results.map((item) => (
            <button key={item} type="button" className="pe-result" onClick={() => open(item)}>
              <Icon name="icon-cube-line" size="sm" decorative /><Text>{highlight(item, query)}</Text>
            </button>
          )) : <div className="pe-empty"><Text tone="light">No components match “{query}”.</Text></div>
        ) : (
          <>
            <Text style="Caption/Medium" tone="light">Recent</Text>
            {recent.map((item) => <button key={item} type="button" className="pe-result" onClick={() => open(item)}><Icon name="icon-clock-line" size="sm" decorative /><Text>{item}</Text></button>)}
          </>
        )}
      </div>
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
    <div className="pe-stack">
      <div className="pe-row pe-row--between">
        <Chip variant="advanced" size="small" dropdown select={Boolean(status)} popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Status"
          popoverItems={Object.entries(statusLabels).map(([id, label]) => ({ id, label, selected: status === id }))}
          onPopoverSelect={(item) => setStatus(item.id === status ? null : item.id)} onClearSelection={status ? () => setStatus(null) : undefined}>
          {status ? statusLabels[status] : "Status"}
        </Chip>
        <div className="pe-search-sm"><Search size="small" placeholder="Filter tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      </div>
      <ul className="pe-list">
        {rows.map((task) => <li key={task.id} className="pe-list__row"><Text>{task.title}</Text><Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge></li>)}
        {rows.length === 0 ? <li className="pe-empty"><Text tone="light">Nothing here. Try another filter.</Text></li> : null}
      </ul>
    </div>
  );
}

/* ───────────── Segmented ───────────── */

function SegmentedViewSwitcherExample() {
  const [view, setView] = useState("grid");
  return (
    <div className="pe-stack">
      <div className="pe-row pe-row--between">
        <Text style="Body/Base/Medium">Team</Text>
        <Segmented size="small" aria-label="Layout" value={view} onChange={setView} options={[{ id: "grid", label: null, leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, leading: <Icon name="icon-list-line" decorative /> }]} />
      </div>
      <div className={view === "grid" ? "pe-people-grid" : "pe-list"}>
        {people.map((person) => (
          <div key={person.id} className={view === "grid" ? "pe-person-tile" : "pe-list__row pe-list__row--start"}>
            <Avatar size={view === "grid" ? "large" : "small"} theme="photo" src={person.photo} alt="" />
            <div className="pe-person-meta"><Text style="Body/Base/Medium">{person.name}</Text><Text style="Caption/Regular" tone="light">{person.role}</Text></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegmentedInboxExample() {
  const [tab, setTab] = useState("inbox");
  const [counts, setCounts] = useState({ inbox: 12, mentions: 3, archived: 0 });
  return (
    <div className="pe-stack">
      <Segmented aria-label="Mailbox" value={tab} onChange={setTab} options={[
        { id: "inbox", label: "Inbox", badge: counts.inbox || undefined },
        { id: "mentions", label: "Mentions", badge: counts.mentions || undefined },
        { id: "archived", label: "Archived", badge: counts.archived || undefined },
      ]} />
      <div className="pe-row pe-row--between">
        <Text tone="base">{counts[tab as keyof typeof counts]} unread in {tab}</Text>
        <Button appearance="main" level="tertiary" size="xs" disabled={!counts[tab as keyof typeof counts]} onClick={() => setCounts((current) => ({ ...current, [tab]: 0 }))}>Mark all as read</Button>
      </div>
    </div>
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
      <span className="pe-divider" aria-hidden="true" />
      <Toggle theme="text-first" label="Mentions" caption="When someone @mentions you" selected={prefs.mentions} onSelectedChange={set("mentions")} disabled={paused} />
      <Toggle theme="text-first" label="Comments" caption="Replies on files you follow" selected={prefs.comments} onSelectedChange={set("comments")} disabled={paused} />
      <Toggle theme="text-first" label="Weekly digest" caption="A summary every Monday" selected={prefs.digest} onSelectedChange={set("digest")} disabled={paused} />
    </div>
  );
}

function ToggleInlineExample() {
  const [dark, setDark] = useState(false);
  return (
    <div className="pe-preview-card" data-theme={dark ? "dark" : "light"}>
      <Toggle theme="toggle-first" size="small" label="Dark preview" selected={dark} onSelectedChange={setDark} />
      <Text tone="base">This card follows the toggle through the <code>data-theme</code> token mode.</Text>
    </div>
  );
}

/* ───────────── Avatar ───────────── */

function AvatarMembersExample() {
  return (
    <ul className="pe-list">
      {people.slice(0, 4).map((person, index) => (
        <li key={person.id} className="pe-list__row pe-list__row--start">
          {index % 2 ? <Avatar size="medium" theme={person.theme} background="subtle" status={person.online} alt={person.name}>{person.initials}</Avatar> : <Avatar size="medium" theme="photo" src={person.photo} status={person.online} alt={person.name} />}
          <div className="pe-person-meta"><Text style="Body/Base/Medium">{person.name}</Text><Text style="Caption/Regular" tone="light">{person.online ? "Online" : "Away"} · {person.role}</Text></div>
          <span className="pe-grow" />
          {index === 0 ? <Badge size="small" theme="accent" background="subtle" leadingIcon={false}>Owner</Badge> : null}
        </li>
      ))}
    </ul>
  );
}

function AvatarShareExample() {
  const [members, setMembers] = useState(people.slice(0, 3));
  const next = people.find((person) => !members.includes(person));
  return (
    <div className="pe-row pe-row--between">
      <div className="pe-row">
        <AvatarStack size="small" items={members.map((person) => ({ alt: person.name, src: person.photo, theme: "photo" as AvatarTheme }))} />
        <Text tone="base">Shared with {members.length} {members.length === 1 ? "person" : "people"}</Text>
      </div>
      <div className="pe-row">
        {/* zen-allow-destructive: removing access is reversible (the person can be re-invited). */}
        {members.length > 1 ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setMembers(members.slice(0, -1))}>Remove</Button> : null}
        <Button appearance="main" level="primary" size="sm" disabled={!next} startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => next && setMembers([...members, next])}>{next ? `Invite ${next.name.split(" ")[0]}` : "Everyone invited"}</Button>
      </div>
    </div>
  );
}

/* ───────────── Checkbox ───────────── */

function CheckboxSelectAllExample() {
  const files = ["tokens.css", "style-effects.css", "icons.svg", "typography.generated.ts"];
  const [picked, setPicked] = useState<string[]>(["tokens.css"]);
  const all = picked.length === files.length;
  const some = picked.length > 0 && !all;
  return (
    <div className="pe-stack">
      <Checkbox bold label="Include all build files" caption={`${picked.length} of ${files.length} selected`} checked={all || some} indeterminate={some} onChange={() => setPicked(all ? [] : files)} />
      <div className="pe-indent">
        {files.map((file) => <Checkbox key={file} label={file} checked={picked.includes(file)} onChange={(on) => setPicked(on ? [...picked, file] : picked.filter((item) => item !== file))} />)}
      </div>
      <div className="pe-actions"><Button appearance="main" level="primary" size="sm" disabled={!picked.length}>Export {picked.length || ""} file{picked.length === 1 ? "" : "s"}</Button></div>
    </div>
  );
}

function CheckboxConsentExample() {
  const [consent, setConsent] = useState({ terms: false, marketing: false });
  return (
    <div className="pe-stack">
      <Checkbox label="I accept the Terms of Service and Privacy Policy" checked={consent.terms} onChange={(on) => setConsent({ ...consent, terms: on })} />
      <Checkbox label="Send me product news" caption="Optional · about once a month" checked={consent.marketing} onChange={(on) => setConsent({ ...consent, marketing: on })} />
      <Checkbox label="Enable legacy API" caption="Unavailable on the Free plan" disabled />
      <div className="pe-actions"><Button appearance="main" level="primary" size="sm" disabled={!consent.terms}>Continue</Button></div>
    </div>
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
    <div className="pe-stack">
      <div className="pe-radio-cards" role="radiogroup" aria-label="Plan">
        {plans.map((item) => (
          <div key={item.id} className="pe-radio-card" data-selected={plan === item.id ? "true" : undefined}>
            <RadioButton name="pe-plan" value={item.id} checked={plan === item.id} onChange={() => setPlan(item.id)} bold label={`${item.label} · $${item.price}/mo`} caption={item.caption} />
          </div>
        ))}
      </div>
      <div className="pe-row pe-row--between"><Text tone="base">Total: ${current.price}/month</Text><Button appearance="main" level="primary" size="sm">{current.price ? `Upgrade to ${current.label}` : "Stay on Free"}</Button></div>
    </div>
  );
}

function RadioSettingsExample() {
  const [density, setDensity] = useState("compact");
  return (
    <div className="pe-settings" role="radiogroup" aria-label="Density">
      <Text style="Body/Base/Bold">Interface density</Text>
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
    <ul className="pe-list">
      {deployments.map((item) => (
        <li key={item.id} className="pe-list__row"><Text>{item.env}</Text><Badge size="small" theme={item.theme} background="subtle" leading={<Icon name={item.icon} decorative />}>{item.status}</Badge></li>
      ))}
    </ul>
  );
}

function BadgeRemovableExample() {
  const initial = ["Design", "Q4", "Mobile", "Urgent"];
  const [labels, setLabels] = useState(initial);
  return (
    <div className="pe-stack">
      <div className="pe-row">
        {labels.map((label) => <Badge key={label} size="medium" theme={label === "Urgent" ? "red" : "neutral"} background="subtle" leadingIcon={false} remove onRemove={() => setLabels(labels.filter((item) => item !== label))}>{label}</Badge>)}
        {labels.length === 0 ? <Text tone="light">No labels</Text> : null}
      </div>
      <div><Button appearance="main" level="tertiary" size="xs" disabled={labels.length === initial.length} onClick={() => setLabels(initial)}>Reset labels</Button></div>
    </div>
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
      {items.map((item) => (
        <button key={item.id} type="button" className="pe-nav-row" onClick={() => setUnread({ ...unread, [item.id]: 0 })}>
          <Icon name={item.icon} size="base" decorative /><Text>{item.label}</Text><span className="pe-grow" />
          {unread[item.id] ? <BadgeCounter size="small" theme={item.id === "alerts" ? "red" : "neutral"} value={unread[item.id] > 99 ? "99+" : unread[item.id]} /> : null}
        </button>
      ))}
      <Text style="Caption/Regular" tone="light">Click a row to mark it as read.</Text>
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
    <div className="pe-stack">
      <div className="pe-row">
        {/* Sort is a filter-type choice: Chip (Advanced) owns the trigger and its Popover. */}
        <Chip variant="advanced" size="small" dropdown leading={<Icon name="icon-switch-vertical-01-line" decorative />} popoverOpen={open} onPopoverOpenChange={setOpen} popoverLabel="Sort by"
          popoverItems={options.map((item) => ({ ...item, selected: item.id === sort }))} onPopoverSelect={(item) => setSort(item.id)}>
          {`Sort: ${String(current.label)}`}
        </Chip>
      </div>
      <ul className="pe-list">{rows.slice(0, 4).map((task) => <li key={task.id} className="pe-list__row"><Text>{task.title}</Text><Badge size="small" theme={statusTheme[task.status]} background="subtle" leadingIcon={false}>{statusLabels[task.status]}</Badge></li>)}</ul>
    </div>
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
      <div ref={anchorRef} className="pe-row">
        {assigned.length ? <AvatarStack size="xsmall" items={assigned.map((id) => people.find((person) => person.id === id)!).map((person) => ({ alt: person.name, src: person.photo, theme: "photo" as AvatarTheme }))} /> : <Text tone="light">Unassigned</Text>}
        <Button appearance="main" level="tertiary" size="sm" aria-expanded={open} startIcon={<Icon name="icon-user-plus-line" decorative />} onClick={() => setOpen(!open)}>Assign</Button>
      </div>
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
    <div className="pe-stack">
      <div className="pe-row">
        <Chip variant="advanced" size="small" dropdown select={picked.length > 0} selectionMode="multiple" selectionCount={picked.length} onClearSelection={() => setPicked([])}
          popoverOpen={open} onPopoverOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} popoverMultiple popoverLabel="Select a label or create one" popoverSearchPlaceholder="Find or create a label"
          popoverSearchValue={query} onPopoverSearchChange={setQuery} popoverCreateLabel="Create"
          popoverItems={labels.map((label) => ({ ...label, selected: picked.includes(label.id) }))} onPopoverSelect={(item) => toggle(item.id)}
          onPopoverCreate={(value) => { const id = value.toLowerCase().replace(/\s+/g, "-"); setLabels((current) => [...current, { id, label: value }]); setPicked((current) => [...current, id]); setQuery(""); }}>
          {picked.length === 1 ? labels.find((label) => label.id === picked[0])?.label : "Labels"}
        </Chip>
      </div>
      <div className="pe-row">{picked.map((id) => <Badge key={id} size="small" theme="neutral" background="subtle" leadingIcon={false}>{labels.find((label) => label.id === id)?.label}</Badge>)}{picked.length === 0 ? <Text tone="light">No labels</Text> : null}</div>
      <Text style="Caption/Regular" tone="light">Type a label that doesn't exist (e.g. “Urgent”) and press Enter or pick “Create”.</Text>
    </div>
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

function SidebarAppShellExample() {
  const [page, setPage] = useState("inbox");
  const [collapsed, setCollapsed] = useState(false);
  const icon = (name: Parameters<typeof Icon>[0]["name"]) => <Icon name={name} size="base" />;
  const pages: Record<string, string> = { inbox: "Inbox", projects: "Projects", "p-web": "Website redesign", "p-app": "Mobile app", reports: "Reports", settings: "Settings" };
  const sections: SidebarSection[] = [
    { items: [
      { id: "inbox", label: "Inbox", icon: icon("ic-inbox-01-line"), counter: 4, selected: page === "inbox" },
      { id: "reports", label: "Reports", icon: icon("icon-bar-chart-01-line"), selected: page === "reports" },
    ] },
    { label: "Workspace", items: [
      { id: "projects", label: "Projects", icon: icon("icon-folder-line"), selected: page === "projects", children: [
        { id: "p-web", label: "Website redesign", selected: page === "p-web" },
        { id: "p-app", label: "Mobile app", selected: page === "p-app" },
      ] },
      { id: "settings", label: "Settings", icon: icon("icon-settings-01-line"), selected: page === "settings" },
    ] },
  ];
  return (
    <div className="pe-shell">
      <Sidebar variant="basic" collapsed={collapsed} onCollapsedChange={setCollapsed} sections={sections} onItemClick={(item) => { if (!item.children) setPage(item.id); }} />
      <section className="pe-shell__main" aria-live="polite">
        <Text style="Heading/3">{pages[page]}</Text>
        <Text tone="base">Select items in the sidebar, expand “Projects”, or collapse the rail with the layout button.</Text>
      </section>
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
      <div className="pe-row">{tags.map((tag) => <Tag key={tag} leading={<Icon name="icon-hash-02-line" decorative />} remove onRemove={() => setTags(tags.filter((item) => item !== tag))}>{tag}</Tag>)}</div>
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
    <div className="pe-row pe-row--top">
      <div className="pe-inline-picker"><DatePicker selectionMode="range" minDate={today} onRangeChange={setRange} /></div>
      <div className="pe-stack pe-summary">
        <Text style="Body/Base/Bold">Your stay</Text>
        <Text tone="base">{range ? `${fmt(range.start)} → ${range.end ? fmt(range.end) : "pick check-out"}` : "Pick check-in, then check-out. Past dates are disabled."}</Text>
        {nights ? <Text>{nights} night{nights === 1 ? "" : "s"} · ${nights * 89}</Text> : null}
        <Button appearance="main" level="primary" size="sm" disabled={!nights}>Reserve</Button>
      </div>
    </div>
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
    <div className="pe-row">
      <InputField aria-label="Share link" readOnly value="https://zen.ds/p/7f3k2" />
      <Tooltip content={copied ? "Copied!" : "Copy link"} color={copied ? "accent" : "default"} open={copied ? true : undefined}>
        <IconButton appearance="main" level="tertiary" size="md" aria-label="Copy link" icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />} onClick={() => { void navigator.clipboard?.writeText("https://zen.ds/p/7f3k2").catch(() => undefined); setCopied(true); }} />
      </Tooltip>
    </div>
  );
}

function TooltipTruncateExample() {
  const files = ["Q4-brand-refresh-final-final-v3-approved.fig", "Checkout flow — mobile explorations.fig", "Tokens.json"];
  return (
    <ul className="pe-list pe-narrow">
      {files.map((file) => (
        <li key={file} className="pe-list__row pe-list__row--start">
          <Icon name="ic-figma-line" size="sm" decorative />
          <Tooltip content={file} placement="bottom" size="small"><button type="button" className="pe-truncate">{file}</button></Tooltip>
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Tabs ───────────── */

function TabsSettingsExample() {
  const [tab, setTab] = useState("general");
  const [notify, setNotify] = useState(true);
  return (
    <div className="pe-stack">
      <Tabs idPrefix="pe-settings" aria-label="Workspace settings" value={tab} onChange={setTab} items={[
        { id: "general", label: "General", icon: <Icon name="icon-settings-01-line" /> },
        { id: "members", label: "Members", icon: <Icon name="icon-user-circle-line" />, badge: 5 },
        { id: "notifications", label: "Notifications", icon: <Icon name="icon-bell-01-line" />, badge: notify ? undefined : "off" },
        { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" />, disabled: true },
      ]} />
      <TabPanel idPrefix="pe-settings" id="general" hidden={tab !== "general"}><div className="pe-form"><InputField label="Workspace name" defaultValue="Zen Studio" /><SelectField label="Language" options={[{ value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" }]} /></div></TabPanel>
      <TabPanel idPrefix="pe-settings" id="members" hidden={tab !== "members"}><AvatarMembersExample /></TabPanel>
      <TabPanel idPrefix="pe-settings" id="notifications" hidden={tab !== "notifications"}><Toggle label="Email notifications" caption="Summary of activity in this workspace" selected={notify} onSelectedChange={setNotify} /></TabPanel>
    </div>
  );
}

function TabsPeriodExample() {
  const data: Record<string, { value: string; delta: string }> = { day: { value: "1,284", delta: "+4.2%" }, week: { value: "8,930", delta: "+12.8%" }, month: { value: "36,402", delta: "−2.1%" } };
  const [period, setPeriod] = useState("week");
  return (
    <div className="pe-metric">
      <div className="pe-row pe-row--between">
        <Text style="Body/Base/Medium">Active users</Text>
        <Tabs size="small" variant="subtle" aria-label="Period" value={period} onChange={setPeriod} items={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]} />
      </div>
      <div className="pe-row" aria-live="polite"><Text style="Heading/2">{data[period].value}</Text><Badge size="small" theme={data[period].delta.startsWith("+") ? "green" : "red"} background="subtle" leadingIcon={false}>{data[period].delta}</Badge></div>
    </div>
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
    <div className="pe-stack">
      <Breadcrumbs items={trail.map((folder) => ({ id: folder.id, label: folder.name, icon: folder.id === "root" ? <Icon name="icon-folder-line" /> : undefined }))} onNavigate={(item) => setTrail(trail.slice(0, trail.findIndex((folder) => folder.id === item.id) + 1))} />
      <ul className="pe-list">
        {current.children?.length ? current.children.map((folder) => (
          <li key={folder.id}><button type="button" className="pe-nav-row pe-nav-row--full" onClick={() => setTrail([...trail, folder])}><Icon name="icon-folder-line" size="base" decorative /><Text>{folder.name}</Text><span className="pe-grow" /><Text style="Caption/Regular" tone="light">{folder.children?.length ?? 0} items</Text></button></li>
        )) : <li className="pe-empty"><Text tone="light">This folder is empty.</Text></li>}
      </ul>
    </div>
  );
}

function BreadcrumbsCollapsedExample() {
  const [last, setLast] = useState("");
  return (
    <div className="pe-stack">
      <Breadcrumbs maxItems={4} emphasis="medium" onNavigate={(item, event) => { event.preventDefault(); setLast(String(item.label)); }} items={[
        { id: "home", label: "Home", href: "#home" }, { id: "org", label: "Dìzai Studio", href: "#org" }, { id: "teams", label: "Teams", href: "#teams" },
        { id: "design", label: "Design", href: "#design" }, { id: "projects", label: "Projects", href: "#projects" }, { id: "zen", label: "Zen DS", href: "#zen" }, { id: "release", label: "Release notes" },
      ]} />
      <Text style="Caption/Regular" tone="light">{last ? `Would navigate to “${last}”` : "Click “…” to reveal the hidden levels."}</Text>
    </div>
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
    <div className="pe-stack">
      {files.map((file) => (
        <div key={file.id} className="pe-stack pe-stack--tight">
          <div className="pe-row pe-row--between"><Text style="Body/Small/Medium">{file.name}</Text><Text style="Caption/Regular" tone="light">{file.value >= 100 ? "Uploaded" : `${Math.round(file.size * file.value / 100)} / ${file.size} MB`}</Text></div>
          <ProgressBar value={file.value} theme={file.value >= 100 ? "status" : "accent"} aria-label={`${file.name} upload`} />
        </div>
      ))}
      <div className="pe-row pe-row--between">
        <Text tone="base">Total {total}%</Text>
        <div className="pe-row">
          {running ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setRunning(false)}>Pause</Button> : null}
          {total >= 100
            ? <Button appearance="main" level="tertiary" size="sm" onClick={() => setFiles(initial)}>Reset</Button>
            : <Button appearance="main" level="primary" size="sm" disabled={running} startIcon={<Icon name="icon-upload-01-line" decorative />} onClick={() => setRunning(true)}>{total > 0 ? "Resume" : "Upload"}</Button>}
        </div>
      </div>
    </div>
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
    <div className="pe-stack">
      <ProgressBar value={overall} theme="status" label={`${overall}% set up`} />
      <ul className="pe-list">
        {steps.map((step) => (
          <li key={step.id} className="pe-list__row">
            <ProgressCircle value={progress[step.id]} theme={step.theme} label={step.label} />
            <Button appearance="main" level="tertiary" size="xs" disabled={progress[step.id] >= 100} onClick={() => setProgress({ ...progress, [step.id]: Math.min(100, progress[step.id] + 25) })}>{progress[step.id] >= 100 ? "Done" : "Continue"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Dialog ───────────── */

function DialogDeleteExample() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleted, setDeleted] = useState(false);
  const name = "Marketing site";
  return (
    <div className="pe-stack">
      {deleted
        ? <div className="pe-row"><Text>“{name}” was deleted.</Text><Button appearance="main" level="tertiary" size="xs" onClick={() => setDeleted(false)}>Restore</Button></div>
        : <div className="pe-row pe-row--between pe-list__row pe-list"><Text>{name}</Text><Button appearance="main" level="danger-subtle" size="sm" startIcon={<Icon name="icon-trash-line" decorative />} onClick={() => { setTyped(""); setOpen(true); }}>Delete</Button></div>}
      <Dialog open={open} onOpenChange={setOpen} theme="negative" title={`Delete “${name}”?`} description="This removes all 24 pages and their history for everyone. This can't be undone."
        primaryAction={{ label: "Delete project", level: "danger", disabled: typed !== name, onClick: () => { setOpen(false); setDeleted(true); } }}
        secondaryAction={{ label: "Cancel", autoFocus: true }}>
        <InputField label={`Type “${name}” to confirm`} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
      </Dialog>
    </div>
  );
}

function DialogUnsavedExample() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("You have 3 unsaved edits.");
  return (
    <div className="pe-row pe-row--between">
      <Text tone="base">{status}</Text>
      <Button appearance="main" level="tertiary" size="sm" onClick={() => setOpen(true)}>Leave page</Button>
      <Dialog open={open} onOpenChange={setOpen} theme="warning" title="Save changes before leaving?" description="Your edits to “Checkout flow” will be lost if you don't save them."
        primaryAction={{ label: "Save & leave", onClick: () => { setStatus("Saved. You left the page."); setOpen(false); } }}
        secondaryAction={{ label: "Stay" }}
        tertiaryAction={{ label: "Discard", level: "danger-subtle", onClick: () => { setStatus("Changes discarded."); setOpen(false); } }} />
    </div>
  );
}

function DialogSuccessExample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pe-row">
      <Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-upload-01-line" decorative />} onClick={() => setOpen(true)}>Publish</Button>
      <Dialog open={open} onOpenChange={setOpen} theme="positive" title="Your site is live" description="zen-ds.dizai.studio was published a moment ago. Share it with your team."
        primaryAction={{ label: "Done" }} />
    </div>
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

type ExampleDef = { title: string; description: string; code: string; wide?: boolean; render: () => ReactNode };

const examples: Partial<Record<PlatformPage, ExampleDef[]>> = {
  button: [
    { title: "Confirm a destructive action", description: "Danger + tertiary pair; the primary action shows progress and disables both buttons while it runs.", render: () => <ButtonDialogExample />, code: `<Button level="tertiary" size="sm" disabled={busy}>Cancel</Button>
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
  ],
  chip: [
    { title: "Filter bar", description: "Advanced chips open a real Popover: multiple selection shows a counter, single selection shows the chosen owner. Delete/Backspace clears a focused chip.", wide: true, render: () => <ChipFilterBarExample />, code: `<Chip variant="advanced" size="small" dropdown
  selectionMode="multiple" selectionCount={statuses.length} select={statuses.length > 0}
  popoverOpen={open} onPopoverOpenChange={setOpen} popoverMultiple popoverLabel="Status"
  popoverItems={options.map((o) => ({ ...o, selected: statuses.includes(o.id) }))}
  onPopoverSelect={(item) => toggleStatus(item.id)}
  onClearSelection={() => setStatuses([])}
>
  Status
</Chip>` },
    { title: "Selectable topics", description: "Normal chips as toggle pills with aria-pressed.", render: () => <ChipTopicsExample />, code: `{topics.map((topic) => (
  <Chip key={topic} variant="normal" size="small"
    level={picked.includes(topic) ? "primary" : "secondary"}
    select={picked.includes(topic)} aria-pressed={picked.includes(topic)}
    onClick={() => toggle(topic)}>
    {topic}
  </Chip>
))}` },
  ],
  input: [
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
    { title: "Search with live results", description: "Results filter while typing, matches are highlighted, Enter opens the first hit and the clear button resets to recent items.", render: () => <SearchResultsExample />, code: `<Search placeholder="Search components" value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && open(results[0])} />
{query && results.length === 0 ? <EmptyState /> : <Results items={results} />}` },
    { title: "Table toolbar", description: "Small Search next to a Chip (Advanced) status filter — filters are always chips, never buttons.", render: () => <SearchTableToolbarExample />, code: `<Chip variant="advanced" size="small" dropdown select={Boolean(status)} popoverLabel="Status"
  popoverItems={statuses.map((s) => ({ ...s, selected: s.id === status }))}
  onPopoverSelect={(item) => setStatus(item.id)} onClearSelection={() => setStatus(null)}>
  {status ?? "Status"}
</Chip>
<Search size="small" placeholder="Filter tasks" value={query} onChange={(e) => setQuery(e.target.value)} />` },
  ],
  segmented: [
    { title: "View switcher", description: "Icon-only segments switch between grid and list layouts.", render: () => <SegmentedViewSwitcherExample />, code: `<Segmented size="small" aria-label="Layout" value={view} onChange={setView} options={[
  { id: "grid", label: null, leading: <Icon name="icon-grid-01-line" decorative /> },
  { id: "list", label: null, leading: <Icon name="icon-list-line" decorative /> },
]} />` },
    { title: "Tabs with counters", description: "Badge-Counter switches between selected and default styling; counters disappear at zero.", render: () => <SegmentedInboxExample />, code: `<Segmented aria-label="Mailbox" value={tab} onChange={setTab} options={[
  { id: "inbox", label: "Inbox", badge: counts.inbox || undefined },
  { id: "mentions", label: "Mentions", badge: counts.mentions || undefined },
  { id: "archived", label: "Archived" },
]} />` },
  ],
  toggle: [
    { title: "Notification settings", description: "A master toggle disables the dependent toggles.", render: () => <ToggleSettingsExample />, code: `<Toggle bold size="medium" label="Pause all notifications" selected={paused} onSelectedChange={setPaused} />
<Toggle label="Mentions" caption="When someone @mentions you"
  selected={prefs.mentions} onSelectedChange={setMentions} disabled={paused} />` },
    { title: "Inline preference", description: "Toggle-first theme inside a card; the card switches token mode.", render: () => <ToggleInlineExample />, code: `<div data-theme={dark ? "dark" : "light"}>
  <Toggle theme="toggle-first" size="small" label="Dark preview" selected={dark} onSelectedChange={setDark} />
</div>` },
  ],
  avatar: [
    { title: "Member list", description: "Photo and initials avatars with presence status.", render: () => <AvatarMembersExample />, code: `<Avatar size="medium" theme="photo" src={user.photo} status={user.online} alt={user.name} />
<Avatar size="medium" theme="green" background="subtle" status={user.online} alt={user.name}>BN</Avatar>` },
    { title: "Shared with", description: "Avatar/Stack grows as people are invited (max 5).", render: () => <AvatarShareExample />, code: `<AvatarStack size="small" items={members.map((m) => ({ alt: m.name, src: m.photo, theme: "photo" }))} />
<Button level="primary" size="sm" onClick={invite}>Invite</Button>` },
  ],
  checkbox: [
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
    { title: "Deployment status", description: "Semantic themes with leading icons.", render: () => <BadgeStatusExample />, code: `<Badge size="small" theme="green" background="subtle" leading={<Icon name="icon-check-line" decorative />}>Live</Badge>
<Badge size="small" theme="red" background="subtle" leading={<Icon name="icon-x-small-line" decorative />}>Failed</Badge>` },
    { title: "Removable labels", description: "Remove=Yes badges wired to onRemove.", render: () => <BadgeRemovableExample />, code: `{labels.map((label) => (
  <Badge key={label} theme="neutral" background="subtle" leadingIcon={false}
    remove onRemove={() => removeLabel(label)}>{label}</Badge>
))}` },
    { title: "Unread counters", description: "Badge-Counter caps at 99+ and disappears once read.", render: () => <BadgeCounterNavExample />, code: `{unread > 0 ? <BadgeCounter size="small" theme="neutral" value={unread > 99 ? "99+" : unread} /> : null}` },
  ],
  popover: [
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
    { title: "App shell", description: "Selection follows clicks, groups expand, and the rail collapses with its own control.", wide: true, render: () => <SidebarAppShellExample />, code: `<Sidebar variant="basic" collapsed={collapsed} onCollapsedChange={setCollapsed}
  sections={sections /* selected: page === item.id */}
  onItemClick={(item) => { if (!item.children) setPage(item.id); }} />` },
  ],
  tag: [
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
    { title: "Toolbar hints", description: "Small tooltips name icon-only buttons and show their shortcut; they appear on hover after a delay and instantly on keyboard focus.", render: () => <TooltipToolbarExample />, code: `<Tooltip content="Bold · ⌘B" size="small">
  <IconButton aria-label="Bold" level="tertiary" size="sm" icon={<Icon name="icon-bold-01-line" />} />
</Tooltip>` },
    { title: "Copy feedback", description: "Controlled open briefly confirms the action with the Accent color.", render: () => <TooltipCopyExample />, code: `<Tooltip content={copied ? "Copied!" : "Copy link"} color={copied ? "accent" : "default"} open={copied || undefined}>
  <IconButton aria-label="Copy link" icon={<Icon name="icon-copy-line" />} onClick={copy} />
</Tooltip>` },
    { title: "Truncated text", description: "Reveal the full file name without widening the list.", render: () => <TooltipTruncateExample />, code: `<Tooltip content={file.name} placement="bottom" size="small">
  <button className="truncate">{file.name}</button>
</Tooltip>` },
  ],
  tabs: [
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
    { title: "File browser", description: "Open folders to go deeper; click a breadcrumb to go back up.", render: () => <BreadcrumbsDriveExample />, code: `<Breadcrumbs
  items={trail.map((f) => ({ id: f.id, label: f.name }))}
  onNavigate={(item) => setTrail(trail.slice(0, indexOf(item.id) + 1))}
/>` },
    { title: "Long path", description: "maxItems keeps the first level and the last three; “…” expands the rest.", render: () => <BreadcrumbsCollapsedExample />, code: `<Breadcrumbs maxItems={4} emphasis="medium" items={path}
  onNavigate={(item, event) => { event.preventDefault(); router.push(item.href); }} />` },
  ],
  progress: [
    { title: "File uploads", description: "Accent bars while uploading; Status theme turns green when a file completes.", render: () => <ProgressUploadExample />, code: `<ProgressBar value={file.progress} theme={file.progress >= 100 ? "status" : "accent"}
  aria-label={\`\${file.name} upload\`} />` },
    { title: "Setup checklist", description: "Progress-Circle per task with its label, plus an overall Status bar.", render: () => <ProgressChecklistExample />, code: `<ProgressBar value={overall} theme="status" label={\`\${overall}% set up\`} />
<ProgressCircle value={step.progress} theme="green" label="Invite your team" />` },
  ],
  dialog: [
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
    { title: "Booking range", description: "Range selection with past dates disabled and a live night count.", wide: true, render: () => <DateBookingExample />, code: `<DatePicker selectionMode="range" minDate={today}
  onRangeChange={({ start, end }) => setRange({ start, end })} />` },
    { title: "Date field in a form", description: "The field opens the calendar on focus and formats the picked date.", render: () => <DateFieldFormExample />, code: `<DateField label="Date" onDateChange={setDate} helpText={date ? format(date) : "Click the field to open the calendar"} />` },
  ],
};

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
        {list.map((example) => <ExampleCard key={example.title} title={example.title} description={example.description} code={example.code} wide={example.wide}>{example.render()}</ExampleCard>)}
      </div>
    </section>
  );
}
