import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { InputField, TextAreaField } from "../components/Input";
import { List, ListItem } from "../components/ListItem";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { ToggleButton } from "../components/Toggle";
import { TopNavigation } from "../components/TopNavigation";
import { BottomNavigation } from "../components/BottomNavigation";
import { BottomSheet } from "../components/BottomSheet";
import { ChatCall, ChatComposer, ChatConversationItem, ChatDateDivider, ChatFile, ChatMessage, ChatPhotos, ChatThread, chatHoldActions, type ChatPerson, type ChatReactionKind, type ChatReplyTarget } from "../components/Chat";
import { AiChatBlock, AiChatBubble, AiChatField, AiChatThread } from "../components/AiChat";
import { ChartCard, LineChart, StackBarChart } from "../components/Chart";
import { MetricCard } from "../components/MetricWidget";
import { EmptyState } from "../components/EmptyState";
import { Thumbnail } from "../components/Image";
import { Heading, plural } from "../components/Text";
import { InlineMessage } from "../components/InlineMessage";
import { SidePanel } from "../components/SidePanel";
import { Table, TableText } from "../components/Table";
import type { PlatformPage } from "./PlatformExamples";
import { ChatDemoNote, useChatDemo } from "./chatDemo";
import { PlatformPhone, usePhoneScreen } from "./PlatformPhone";
import { PlatformChatHeader } from "./PlatformChatHeader";
import { avatarOf, bottomNavItems, budgetSeries, mobileConversations, mobileFiles, mobileInbox, mobilePeople, mobileProjects, mobileSettings, mobileTasks } from "./PlatformMobileData";
import { PlatformPhoneMedia, platformMedia } from "./PlatformMedia";
import { chatDesktopExamples } from "./PlatformChatDesktopShowcases";
import { typographyStyles } from "../tokens/typography.generated";

type ExampleDef = { title: string; description: string; code: string; wide?: boolean; /** A whole desktop screen: the card offers Full screen. */ screen?: boolean; render: () => ReactNode };

/* Shared screen content: long enough that every phone scrolls under its bars. */
/** A message sent from "New message": it starts a conversation at the top of the list. */
type SentMessage = { id: string; to: string; text: string };
/** The demo person whose name starts with what was typed ("bao" → Bao Nguyen), or a new contact shown by initials. */
const personNamed = (typed: string): ChatPerson => Object.values(mobilePeople).find((p) => p.name.toLowerCase().startsWith(typed.trim().toLowerCase())) ?? { name: typed.trim(), theme: "teal" };

function ConversationList({ label = "Conversations", count = mobileConversations.length, sent = [] }: { label?: string; count?: number; sent?: SentMessage[] }) {
  // Opening a conversation marks it read and selects it, like the Inbox example (no locked Chat interactions).
  // A message sent from New message starts a conversation on top, opened.
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState<string | undefined>(undefined);
  const newest = sent[0]?.id;
  useEffect(() => { if (newest) setOpen(newest); }, [newest]);
  return (
    <List aria-label={label}>
      {sent.map((m) => <ChatConversationItem key={m.id} person={personNamed(m.to)} preview={`You: ${m.text}`} time="Now" selected={open === m.id} onClick={() => setOpen(m.id)} />)}
      {mobileConversations.slice(0, count).map((c) => <ChatConversationItem key={c.id} person={c.person} preview={c.preview} time={c.time} unread={c.unread && !read.includes(c.id)} online={c.online} selected={open === c.id} onClick={() => { setOpen(c.id); setRead((r) => (r.includes(c.id) ? r : [...r, c.id])); }} />)}
    </List>
  );
}

function ProjectList({ extra = [] }: { extra?: string[] }) {
  // Opening a project selects it, like a conversation in ConversationList. A project created in the example (extra,
  // newest first) lands on top, opened.
  const [open, setOpen] = useState<string | null>(null);
  const newest = extra.length ? `new-${extra.length}` : null;
  useEffect(() => { if (newest) setOpen(newest); }, [newest]);
  const projects = [...extra.map((title, i) => ({ id: `new-${extra.length - i}`, title, caption: "Created just now", theme: (["teal", "purple", "indigo"] as const)[i % 3] })), ...mobileProjects.map((p) => ({ ...p, id: p.title }))];
  return (
    <List aria-label="Projects">
      {projects.map((p) => <ListItem key={p.id} title={p.title} caption={p.caption} leading={<Avatar size="medium" shape="square" theme={p.theme} alt={p.title} />} selected={open === p.id} onClick={() => setOpen(p.id)} />)}
    </List>
  );
}

function TaskList({ extra = [] }: { extra?: string[] }) {
  return (
    <List aria-label="Tasks">
      {[...extra.map((title, i) => ({ id: `new${i}`, title, due: "Today" })), ...mobileTasks].map((t) => <ListItem key={t.id} title={t.title} caption={`Due ${t.due.toLowerCase()}`} leading={<Checkbox aria-label={`Done: ${t.title}`} />} />)}
    </List>
  );
}

function PhotoFeed({ bottomRoom = false }: { bottomRoom?: boolean }) {
  return (
    <div className="pe-stack pe-phone-feed" data-bottom-room={bottomRoom ? "true" : undefined}>
      {platformMedia.feed.map((photo, i) => (
        <Card key={photo.src} as="article" spacing="small" className="pe-phone-feed__card">
          <img className="pe-phone-feed__img" src={photo.src} alt={photo.alt} loading="lazy" />
          <div className="pe-stack pe-stack--tight pe-phone-feed__caption">
            <span className={`pe-text pe-text--strongest ${typographyStyles["Body/Base/Medium"]}`}>{photo.alt}</span>
            <span className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`}>{mobileConversations[i].person.name} · {i + 2}h</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Copy on an AI answer: writes the text to the clipboard and confirms in place (a check and "Copied") for 2 s. */
function useCopyAction(text: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return { icon: copied ? "icon-check-line" as const : "icon-copy-line" as const, label: copied ? "Copied" : "Copy", onClick: () => { void navigator.clipboard?.writeText(text).catch(() => undefined); setCopied(true); } };
}

/* ── Top Navigation ─────────────────────────────────────────────── */
function TopNavCollapseExample() {
  const [collapsed, setCollapsed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearch = useRef(false);
  // The collapsed bar's Search action scrolls back to the top; once the search bar is back, it takes focus.
  useEffect(() => { if (!collapsed && focusSearch.current) { focusSearch.current = false; searchRef.current?.focus(); } }, [collapsed]);
  const openSearch = () => {
    if (!collapsed) { searchRef.current?.focus(); return; } // the bar is already out: straight into the field
    focusSearch.current = true; scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  // New message opens a compose sheet; Send starts the conversation on top of the list and scrolls up to it.
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState<SentMessage[]>([]);
  const send = () => {
    setSent((list) => [{ id: `sent-${list.length + 1}`, to: to.trim(), text: text.trim() || "Hi!" }, ...list]);
    setTo(""); setText(""); setComposing(false);
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <PlatformPhone label="Scrolling inbox" header={<TopNavigation title="Inbox" largeTitle="Inbox" collapsed={collapsed} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: () => setComposing(true) }]}
      controlBar={<Search ref={searchRef} placeholder="Search messages" />} searchAction={{ label: "Search messages", onClick: openSearch }} />}>
      <div ref={scrollerRef} onScroll={(e) => setCollapsed(e.currentTarget.scrollTop > 24)} className="pe-phone-scroll">
        <ConversationList sent={sent} />
      </div>
      <BottomSheet inline open={composing} onOpenChange={setComposing} title="New message"
        primaryAction={{ label: "Send", disabled: !to.trim(), onClick: send }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="To" placeholder="Name or email" value={to} onValueChange={setTo} data-autofocus="" />
        <TextAreaField label="Message" placeholder="Write a message" value={text} onValueChange={setText} />
      </BottomSheet>
    </PlatformPhone>
  );
}

const profileNotifications = [
  { id: "n1", person: mobilePeople.bao, title: "Bao Nguyen assigned you “Hero copy”", caption: "Brand refresh · 5 min ago" },
  { id: "n2", person: mobilePeople.chi, title: "Chi Tran commented on Tokens.json", caption: "“Can we keep 8px here?” · 1 h ago" },
  { id: "n3", person: mobilePeople.duy, title: "Duy shared Q3 report.pdf", caption: "Finance · 3 h ago" },
];

function TopNavProfileExample() {
  // The bell opens the notifications and clears its dot; Settings opens a settings sheet.
  const [sheet, setSheet] = useState<"notifications" | "settings" | null>(null);
  const [seen, setSeen] = useState(false);
  const [setting, setSetting] = useState<string | null>(null);
  const close = (open: boolean) => { if (!open) setSheet(null); };
  return (
    <PlatformPhone canvas="alt" label="Profile home" header={<TopNavigation type="alt" largeTitle="Good morning, Ava" leading={<Avatar size="medium" theme="photo" background="subtle" src={mobilePeople.ava.src} alt="Ava Chen" />}
      trailing={[{ icon: "icon-bell-01-line", label: seen ? "Notifications" : "Notifications, 3 new", dot: !seen, onClick: () => { setSheet("notifications"); setSeen(true); } }, { icon: "icon-settings-01-line", label: "Settings", onClick: () => setSheet("settings") }]} />}>
      <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)", gap: "var(--zen-spacing-gap-large, 24px)" }}>
        <MetricCard label="Tasks due today" value="7" icon="icon-check-circle-line" size="large" trend={{ direction: "positive", label: "2 fewer than yesterday" }} />
        <section className="pe-stack" aria-label="Today">
          <Heading level={2} textStyle="Body/Small/Bold" tone="base">Today</Heading>
          <Card spacing="small" className="pe-list-card"><TaskList /></Card>
        </section>
        <section className="pe-stack" aria-label="Recent photos">
          <Heading level={2} textStyle="Body/Small/Bold" tone="base">Recent photos</Heading>
          <PhotoFeed />
        </section>
      </div>
      <BottomSheet inline open={sheet === "notifications"} onOpenChange={close} title="Notifications">
        <List aria-label="Notifications">
          {profileNotifications.map((n) => <ListItem key={n.id} title={n.title} caption={n.caption} leading={<Avatar size="medium" background="subtle" alt="" {...avatarOf(n.person)} />} />)}
        </List>
      </BottomSheet>
      <BottomSheet inline open={sheet === "settings"} onOpenChange={close} title="Settings">
        <List aria-label="Settings">
          {mobileSettings.slice(0, 6).map((s) => <ListItem key={s.title} title={s.title} caption={s.caption} selected={setting === s.title} onClick={() => setSetting(s.title)} />)}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

const sitePhotos = [platformMedia.viewer, ...platformMedia.site];

function TopNavMediaExample() {
  // Close viewer goes back to the album and a photo opens the viewer again; Share opens a share sheet; Like toggles.
  const [index, setIndex] = useState<number | null>(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const screen = usePhoneScreen();
  if (index === null) {
    return (
      <PlatformPhone label="Photo viewer" header={<TopNavigation type="compact" title="Site visit" />}>
        {screen.anchor}
        <List aria-label="Site visit photos">
          {sitePhotos.map((photo, i) => <ListItem key={photo.src} title={photo.alt} caption={`Photo ${i + 1} of ${sitePhotos.length}${liked.includes(i) ? " · Liked" : ""}`} leading={<Thumbnail src={photo.src} alt="" />}
            onClick={() => screen.go('.zen-top-nav__action[aria-label="Close viewer"]', () => setIndex(i))} data-photo={i} />)}
        </List>
      </PlatformPhone>
    );
  }
  const isLiked = liked.includes(index);
  return (
    <PlatformPhone canvas="media" statusBar="light" label="Photo viewer" header={<TopNavigation type="liquid-overlay" title={`Site visit · ${index + 1} of ${sitePhotos.length}`}
      leading={{ icon: "icon-x-medium-line", label: "Close viewer", onClick: () => screen.go(`[data-photo="${index}"] .zen-list-item__wrapper`, () => setIndex(null)) }}
      trailing={[{ icon: "icon-share-01-line", label: "Share", onClick: () => { setCopied(false); setSharing(true); } }, { icon: isLiked ? "icon-heart-solid" : "icon-heart-line", label: isLiked ? "Unlike" : "Like", onClick: () => setLiked((list) => (isLiked ? list.filter((i) => i !== index) : [...list, index])) }]} />}>
      {screen.anchor}
      <PlatformPhoneMedia photo={sitePhotos[index]} />
      <BottomSheet inline open={sharing} onOpenChange={setSharing} type="action" title={copied ? "Link copied" : "Share photo"} keepOpen onSelect={(item) => { if (item.id === "copy") setCopied(true); else setSharing(false); }}
        items={[{ id: "copy", label: copied ? "Copied" : "Copy link", icon: copied ? "icon-check-line" : "icon-link-01-line" }, { id: "message", label: "Message", icon: "icon-message-chat-circle-line" }, { id: "save", label: "Save to Files", icon: "icon-download-01-line" }]} />
    </PlatformPhone>
  );
}

const uploadSources = [{ id: "photos", label: "Photo library", icon: "icon-image-plus-line" }, { id: "camera", label: "Take photo", icon: "icon-camera-line" }, { id: "scan", label: "Scan document", icon: "icon-scan-line" }] as const;

function TopNavSegmentedExample() {
  // Back goes up to Drive, whose Files row comes back; Upload opens a source sheet and adds the new file on top.
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [atDrive, setAtDrive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<string[]>([]);
  const screen = usePhoneScreen();
  const all = [...uploads.map((name) => ({ name, caption: "Uploaded just now", shared: false, starred: false })), ...mobileFiles];
  const files = all.filter((f) => tab === "all" || (tab === "shared" ? f.shared : f.starred));
  const upload = (source: string) => {
    const n = uploads.length + 1;
    const name = source === "photos" ? `IMG_${2040 + n}.jpg` : source === "camera" ? `Photo ${n}.heic` : `Scan ${n}.pdf`;
    setUploads((list) => [name, ...list]); setOpen(name); setTab("all"); setUploading(false); screen.scrollTop();
  };
  if (atDrive) {
    return (
      <PlatformPhone label="Files with a control bar" header={<TopNavigation title="Drive" largeTitle="Drive" />}>
        {screen.anchor}
        <List aria-label="Drive">
          <ListItem data-row="files" title="Files" caption={plural(all.length, "item")} leading={<Avatar size="medium" shape="square" theme="indigo" alt="Files" />} onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setAtDrive(false))} />
          {[["Photos", "248 items", "orange"], ["Shared with me", "12 items", "green"], ["Trash", "Empty", "brown"]].map(([title, caption, theme]) => <ListItem key={title} title={title} caption={caption} leading={<Avatar size="medium" shape="square" theme={theme as "orange" | "green" | "brown"} alt={title} />} selected={open === title} onClick={() => setOpen(title)} />)}
        </List>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone label="Files with a control bar" header={<TopNavigation type="compact" title="Files" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go('[data-row="files"] .zen-list-item__wrapper', () => setAtDrive(true)) }} trailing={[{ icon: "icon-plus-line", label: "Upload", onClick: () => setUploading(true) }]} controlBar={<Segmented fullWidth options={[{ id: "all", label: "All" }, { id: "shared", label: "Shared" }, { id: "starred", label: "Starred" }]} value={tab} onChange={setTab} aria-label="Filter files" />} />}>
      {screen.anchor}
      <List aria-label="Files">
        {files.map((f) => <ListItem key={f.name} title={f.name} caption={f.caption} selected={open === f.name} onClick={() => setOpen(f.name)} />)}
      </List>
      <BottomSheet inline open={uploading} onOpenChange={setUploading} type="action" title="Upload from" items={[...uploadSources]} onSelect={(item) => upload(item.id)} />
    </PlatformPhone>
  );
}

/* ── Bottom Navigation ──────────────────────────────────────────── */
function BottomNavAppExample() {
  const [tab, setTab] = useState("home");
  const [unread, setUnread] = useState(true);
  const [setting, setSetting] = useState<string | null>(null);
  const items = bottomNavItems.map((i) => (i.id === "inbox" ? { ...i, dot: unread } : i));
  return (
    <PlatformPhone canvas="canvas" label="App with tabs" header={<TopNavigation type="compact" title={items.find((i) => i.id === tab)?.label} />}
      footer={<BottomNavigation items={items} value={tab} onValueChange={(id) => { setTab(id); if (id === "inbox") setUnread(false); }} />}>
      {tab === "home" ? <div style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)" }}><PhotoFeed /></div> : null}
      {tab === "search" ? <><div style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px)" }}><Search placeholder="Search projects" /></div><ProjectList /></> : null}
      {tab === "inbox" ? <ConversationList label="Inbox" /> : null}
      {tab === "profile" ? <List aria-label="Profile settings">{mobileSettings.map((s) => <ListItem key={s.title} title={s.title} caption={s.caption} selected={setting === s.title} onClick={() => setSetting(s.title)} />)}</List> : null}
    </PlatformPhone>
  );
}

function BottomNavFloatingExample() {
  // Picking what to create starts a draft: a confirmation on top of the feed, scrolled into view.
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const screen = usePhoneScreen();
  return (
    <PlatformPhone canvas="alt" label="Floating navigation with an action"
      footer={<BottomNavigation type="floating" selection="surface" items={bottomNavItems} value={tab} onValueChange={setTab} action={{ icon: "icon-plus-line", label: "New post", onClick: () => setSheet(true) }} />}>
      {screen.anchor}
      <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px)", gap: "var(--zen-spacing-gap-medium, 16px)" }}>
        {draft ? <InlineMessage theme="positive" title={`${draft} draft started`}>Finish it from Drafts on your profile.</InlineMessage> : null}
        <PhotoFeed bottomRoom />
      </div>
      <BottomSheet inline open={sheet} onOpenChange={setSheet} type="action" title="Create" items={[{ id: "post", label: "Post", icon: "icon-edit-02-line" }, { id: "photo", label: "Photo", icon: "icon-camera-line" }, { id: "event", label: "Event", icon: "icon-calendar-line" }]}
        onSelect={(item) => { setDraft(String(item.label)); screen.scrollTop(); }} />
    </PlatformPhone>
  );
}

function BottomNavGlassExample() {
  const [tab, setTab] = useState("search");
  return (
    <PlatformPhone canvas="media" statusBar="light" label="Glass navigation over media"
      footer={<BottomNavigation type="floating-glass" selection="solid" backdrop="none" items={bottomNavItems} value={tab} onValueChange={setTab} />}>
      <PlatformPhoneMedia video={platformMedia.canyonPortrait} />
    </PlatformPhone>
  );
}

function BottomNavLabelsExample() {
  // Create opens a New project sheet; the project lands on top of the list, opened.
  const [tab, setTab] = useState("home");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const screen = usePhoneScreen();
  const create = () => { setCreated((list) => [name.trim(), ...list]); setName(""); setCreating(false); screen.scrollTop(); };
  return (
    <PlatformPhone label="Labelled accent navigation" header={<TopNavigation type="compact" title="Projects" />} footer={<BottomNavigation theme="accent" showLabels items={bottomNavItems} value={tab} onValueChange={setTab} action={{ icon: "icon-plus-line", label: "Create", theme: "accent", onClick: () => setCreating(true) }} />}>
      {screen.anchor}
      <ProjectList extra={created} />
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New project" primaryAction={{ label: "Create project", disabled: !name.trim(), onClick: create }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Project name" placeholder="e.g. Spring campaign" value={name} onValueChange={setName} data-autofocus="" />
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ── Bottom Sheet ───────────────────────────────────────────────── */
function SheetShareExample() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  return (
    <PlatformPhone canvas="canvas" label="Share sheet" header={<TopNavigation type="compact" title="Brand refresh" trailing={[{ icon: "icon-share-01-line", label: "Share", onClick: () => { setCopied(false); setOpen(true); } }]} />}>
      <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)", gap: "var(--zen-spacing-gap-large, 24px)" }}>
        <img className="pe-phone-feed__img" src={platformMedia.site[0].src} alt={platformMedia.site[0].alt} />
        <div className="pe-row pe-row--between"><strong className={`pe-text pe-text--strongest ${typographyStyles["Body/Base/Bold"]}`}>Brand refresh</strong><Button level="tertiary" size="sm" onClick={() => setOpen(true)}>Share project</Button></div>
        <Card spacing="small" className="pe-list-card"><List aria-label="Project files">{mobileFiles.slice(0, 10).map((f) => <ListItem key={f.name} title={f.name} caption={f.caption} selected={file === f.name} onClick={() => setFile(f.name)} />)}</List></Card>
      </div>
      <BottomSheet inline open={open} onOpenChange={setOpen} type="action" title={copied ? "Link copied" : "Share"} keepOpen onSelect={(item) => { if (item.id === "copy") setCopied(true); else setOpen(false); }}
        items={[{ id: "copy", label: copied ? "Copied" : "Copy link", icon: copied ? "icon-check-line" : "icon-link-01-line" }, { id: "mail", label: "Email", icon: "icon-mail-01-line" }, { id: "message", label: "Message", icon: "icon-message-chat-circle-line" }, { id: "remove", label: "Remove access", icon: "icon-trash-line", destructive: true }]} />
    </PlatformPhone>
  );
}

function SheetFilterExample() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ unread: true, mentions: false });
  const [applied, setApplied] = useState(draft);
  const [openId, setOpenId] = useState<string | null>(null);
  const count = Object.values(applied).filter(Boolean).length;
  return (
    <PlatformPhone label="Filters in a sheet" header={<TopNavigation type="compact" title="Inbox" trailing={[{ icon: "icon-filter-lines-line", label: `Filters, ${count} applied`, dot: count > 0, onClick: () => { setDraft(applied); setOpen(true); } }]} />}>
      <List aria-label={`Messages, showing ${count ? Object.entries(applied).filter(([, v]) => v).map(([k]) => k).join(" + ") : "everything"}`}>
        {mobileInbox.filter((m) => (!applied.unread || m.unread) && (!applied.mentions || m.mention)).map((m) => (
          <ListItem key={m.id} title={m.subject} caption={`${m.person.name} · ${m.time}`} leading={<Avatar size="medium" background="subtle" alt="" {...avatarOf(m.person)} />} selected={openId === m.id} onClick={() => setOpenId(m.id)} />
        ))}
      </List>
      <BottomSheet inline open={open} onOpenChange={setOpen} title="Filters" primaryAction={{ label: "Apply", onClick: () => { setApplied(draft); setOpen(false); } }} secondaryAction={{ label: "Reset", onClick: () => setDraft({ unread: false, mentions: false }) }}>
        <Checkbox label="Unread only" checked={draft.unread} onChange={(checked) => setDraft({ ...draft, unread: checked })} />
        <Checkbox label="Mentions" checked={draft.mentions} onChange={(checked) => setDraft({ ...draft, mentions: checked })} />
      </BottomSheet>
    </PlatformPhone>
  );
}

function SheetFormExample() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const [tab, setTab] = useState("home");
  return (
    <PlatformPhone label="Quick create" header={<TopNavigation type="compact" title="My tasks" />} footer={<BottomNavigation type="floating" items={bottomNavItems} value={tab} onValueChange={setTab} action={{ icon: "icon-plus-line", label: "New task", onClick: () => setOpen(true) }} />}>
      <div className="pe-floating-room"><TaskList extra={created} /></div>
      <BottomSheet inline open={open} onOpenChange={setOpen} title="New task" actionsDirection="vertical"
        primaryAction={{ label: "Create task", disabled: !title.trim(), onClick: () => { setCreated((c) => [title.trim(), ...c]); setTitle(""); setOpen(false); } }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Title" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.currentTarget.value)} data-autofocus="" />
        <TextAreaField label="Notes" placeholder="Optional" />
      </BottomSheet>
    </PlatformPhone>
  );
}

function SheetSettingsExample() {
  const [open, setOpen] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [setting, setSetting] = useState<string | null>(null);
  return (
    <PlatformPhone canvas="canvas" label="Full-height settings sheet" header={<TopNavigation type="compact" title="Device" trailing={[{ icon: "icon-settings-01-line", label: "Settings", onClick: () => setOpen(true) }]} />}>
      <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)", gap: "var(--zen-spacing-gap-large, 24px)" }}>
        <MetricCard label="Storage used" value="12.4 GB" icon="icon-database-01-line" />
        <Button level="tertiary" onClick={() => setOpen(true)}>Open settings</Button>
        <Card spacing="small" className="pe-list-card"><List aria-label="Recent files">{mobileFiles.map((f) => <ListItem key={f.name} title={f.name} caption={f.caption} />)}</List></Card>
      </div>
      <BottomSheet inline open={open} onOpenChange={setOpen} size="max" title="Settings" search={<Search placeholder="Search settings" />}>
        <List aria-label="Settings">
          <ListItem title="Sync over Wi-Fi only" caption={wifi ? "On" : "Off"} trailing={<ToggleButton aria-label="Sync over Wi-Fi only" selected={wifi} onSelectedChange={setWifi} />} />
          {mobileSettings.map((s) => <ListItem key={s.title} title={s.title} caption={s.caption} selected={setting === s.title} onClick={() => setSetting(s.title)} />)}
        </List>
      </BottomSheet>
    </PlatformPhone>
  );
}

/* ── Chat ───────────────────────────────────────────────────────── */
/** A chat demo message: sent ones can carry the reply they answer. */
type DemoMsg = { id: string; side: "you" | "others"; text: string; replyTo?: ChatReplyTarget };

function ChatSupportExample() {
  const demo = useChatDemo();
  const support = { name: "Zen Support", theme: "accent" as const };
  const [msgs, setMsgs] = useState<DemoMsg[]>(() => [
    { side: "others", text: "Hi! How can we help today?" },
    { side: "you", text: "My invoice for September shows two seats too many." },
    { side: "others", text: "Sorry about that — let me check your workspace." },
    { side: "others", text: "I can see 14 seats billed and 12 active members." },
    { side: "you", text: "Right, two people left in August." },
    { side: "others", text: "I've removed the two inactive seats and issued a credit for September." },
    { side: "others", text: "The credit shows on your next invoice. Anything else?" },
    { side: "you", text: "Can I get the corrected invoice as a PDF?" },
    { side: "others", text: "Of course — it's in Settings → Billing → Invoices, and I've emailed it to you too." },
    { side: "you", text: "Perfect, thanks!" },
  ].map((m, i) => ({ id: `support-${i}`, ...m }) as DemoMsg));
  const send = (text: string) => { const replyTo = demo.takeReply(); const at = Date.now(); setMsgs((m) => [...m, { id: `support-${at}`, side: "you", text, replyTo }, { id: `support-${at}-r`, side: "others", text: "Thanks, an agent will reply in a few minutes." }]); };
  const shown = msgs.filter((m) => !demo.isDeleted(m.id));
  return (
    <div className="pe-stack pe-chat-demo">
      <PlatformPhone canvas="canvas" label="Support chat" header={<PlatformChatHeader title="Zen Support" subtitle="Typically replies in 5 min" person={support} onAction={demo.headerAction} />}
        footer={<ChatComposer device="mobile" actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-attachment-01-line", label: "Attach a file", onClick: demo.headerAction("Attach a file") }} {...demo.composerReply} onSend={send} />}>
        <ChatThread aria-label="Support conversation">
          {shown.map((m, i) => <ChatMessage key={m.id} {...demo.act(m.id, m.side, { text: m.text, author: support.name })} side={m.side} domain="business" author={m.side === "others" ? support : undefined} continued={m.side === "others" && shown[i + 1]?.side === "others"} time="09:41" replyTo={m.replyTo}>{m.text}</ChatMessage>)}
        </ChatThread>
      </PlatformPhone>
      <ChatDemoNote note={demo.note} />
    </div>
  );
}

function ChatMediaExample() {
  const demo = useChatDemo();
  const { ava, bao, chi, gia, hana } = mobilePeople;
  const [sent, setSent] = useState<DemoMsg[]>([]);
  const send = (text: string) => { const replyTo = demo.takeReply(); setSent((m) => [...m, { id: `media-${Date.now()}`, side: "you", text, replyTo }]); };
  const msg = (id: string, side: "you" | "others", body: ReactNode, options: Omit<NonNullable<Parameters<typeof demo.act>[2]>, "author"> & { person?: typeof ava; showName?: boolean; continued?: boolean; time?: string; seenBy?: (typeof ava)[] } = {}) =>
    demo.isDeleted(id) ? null : (
      <ChatMessage key={id} {...demo.act(id, side, { ...options, author: options.person?.name })} side={side} author={options.person} showName={options.showName} continued={options.continued} time={options.time} seenBy={options.seenBy}>{body}</ChatMessage>
    );
  return (
    <div className="pe-stack pe-chat-demo">
      <PlatformPhone label="Media and calls" header={<PlatformChatHeader title="Design team" subtitle="Active 2h ago" group={[ava, bao, chi]} onAction={demo.headerAction} />}
        footer={<ChatComposer device="mobile" actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => send("👍") }} {...demo.composerReply} onSend={send} />}>
        <ChatThread aria-label="Design team">
          <ChatDateDivider>Yesterday 09:12</ChatDateDivider>
          {msg("m1", "others", "Morning! Who's joining the site visit?", { person: ava, showName: true, continued: true, text: "Morning! Who's joining the site visit?" })}
          {msg("m2", "others", "We leave at 10 from the office.", { person: ava, text: "We leave at 10 from the office." })}
          {msg("m3", "you", "I'm in, I'll bring the camera.", { text: "I'm in, I'll bring the camera." })}
          {msg("m4", "others", "Me too 🙌", { person: gia, showName: true, text: "Me too 🙌" })}
          {msg("m5", "others", "I'll meet you there at 10:30.", { person: chi, showName: true, text: "I'll meet you there at 10:30." })}
          <ChatDateDivider>Yesterday 18:04</ChatDateDivider>
          {msg("m6", "others", <ChatPhotos photos={platformMedia.site} onOpen={demo.openPhotos("the site visit photos")} />, { kind: "photo", person: bao, showName: true, reply: { photo: platformMedia.site[0], count: platformMedia.site.length } })}
          {msg("m7", "others", "These are from the site visit 👆", { person: chi, showName: true, text: "These are from the site visit 👆", reactions: [{ kind: "like", by: [bao, gia] }, { kind: "heart", by: [ava] }] })}
          {msg("m8", "you", <ChatCall side="you" state="out-missed" detail="12:33" onAction={demo.callBack("the Design team")} />, { kind: "call", time: "18:20", reply: { callType: "audio", missed: true } })}
          {msg("m9", "you", "Call me when you're free", { text: "Call me when you're free", seenBy: [ava, bao, chi, gia, hana] })}
          {sent.filter((m) => !demo.isDeleted(m.id)).map((m) => <ChatMessage key={m.id} {...demo.act(m.id, "you", { text: m.text })} side="you" replyTo={m.replyTo}>{m.text}</ChatMessage>)}
        </ChatThread>
      </PlatformPhone>
      <ChatDemoNote note={demo.note} />
    </div>
  );
}

function ChatReactExample() {
  const demo = useChatDemo("Hold a message (or right-click / Shift+F10) to react, reply or act on it.");
  const ava = mobilePeople.ava;
  const [sent, setSent] = useState<DemoMsg[]>([]);
  const send = (text: string) => { const replyTo = demo.takeReply(); setSent((m) => [...m, { id: `react-${Date.now()}`, side: "you", text, replyTo }]); };
  // Long enough to scroll under the header (every phone example scrolls).
  const earlier: DemoMsg[] = [
    { side: "others", text: "Morning! Release day 🚀" }, { side: "you", text: "Morning! How's the checklist?" },
    { side: "others", text: "Tokens are merged, docs are building." }, { side: "others", text: "Only the changelog is left." },
    { side: "you", text: "I can write the changelog." }, { side: "others", text: "That would be great, thanks!" },
    { side: "you", text: "Draft is in the release notes doc." }, { side: "others", text: "Reading it now." },
    { side: "others", text: "Looks good — two small typos, fixed them." }, { side: "you", text: "Perfect, ship it 🙌" },
  ].map((m, i) => ({ id: `react-early-${i}`, ...m }) as DemoMsg);
  return (
    <div className="pe-stack pe-chat-demo">
      <PlatformPhone label="Hold to react" header={<PlatformChatHeader title="Ava Chen" person={ava} online onAction={demo.headerAction} />}
        footer={<ChatComposer device="mobile" actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => send("👍") }} {...demo.composerReply} onSend={send} />}>
        <ChatThread aria-label="Hold to react">
          {earlier.filter((m) => !demo.isDeleted(m.id)).map((m, i, shown) => <ChatMessage key={m.id} {...demo.act(m.id, m.side, { text: m.text, author: ava.name })} side={m.side} author={m.side === "others" ? ava : undefined} continued={m.side === "others" && shown[i + 1]?.side === "others"}>{m.text}</ChatMessage>)}
          {demo.isDeleted("tokens") ? null : <ChatMessage {...demo.act("tokens", "others", { text: "We shipped the new tokens 🎉", author: ava.name })} side="others" author={ava}>We shipped the new tokens 🎉</ChatMessage>}
          {demo.isDeleted("mine") ? null : <ChatMessage {...demo.act("mine", "you", { text: "Amazing, great work!", reactions: [{ kind: "heart", by: [ava] }] })} side="you">Amazing, great work!</ChatMessage>}
          {demo.isDeleted("call") ? null : <ChatMessage {...demo.act("call", "others", { kind: "call", author: ava.name, reply: { callType: "audio", missed: true } })} side="others" author={ava}><ChatCall state="in-missed" detail="12:33" onAction={demo.callBack("Ava")} /></ChatMessage>}
          {sent.filter((m) => !demo.isDeleted(m.id)).map((m) => <ChatMessage key={m.id} {...demo.act(m.id, "you", { text: m.text })} side="you" replyTo={m.replyTo}>{m.text}</ChatMessage>)}
        </ChatThread>
      </PlatformPhone>
      <ChatDemoNote note={demo.note} />
    </div>
  );
}

function ChatInboxExample() {
  // Figma Chat/Conversation-List/List-Item is a 375px mobile row: shown in the device, under the compact Top Navigation.
  const demo = useChatDemo("Open a conversation to mark it read.");
  const [active, setActive] = useState("ava");
  const [read, setRead] = useState<string[]>([]);
  const open = (id: string, name: string) => { setActive(id); setRead((r) => (r.includes(id) ? r : [...r, id])); demo.say(`Opened the chat with ${name}.`); };
  const unread = (id: string) => !read.includes(id);
  return (
    <div className="pe-stack pe-chat-demo">
      <PlatformPhone label="Chats" header={<TopNavigation type="compact" title="Chats" trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: demo.headerAction("New message") }]} />}>
        <List aria-label="Conversations">
          <ChatConversationItem person={mobilePeople.ava} preview="Did you get the brand files?" time="2 mins ago" unread={unread("ava")} online selected={active === "ava"} onClick={() => open("ava", mobilePeople.ava.name)} />
          <ChatConversationItem person={mobilePeople.bao} call="missed-audio" time="12 mins ago" unread={unread("bao")} selected={active === "bao"} onClick={() => open("bao", mobilePeople.bao.name)} />
          <ChatConversationItem person={{ name: "Design team" }} group={[mobilePeople.chi, mobilePeople.gia]} call="ongoing" time="now" online selected={active === "team"} onClick={() => open("team", "Design team")} />
          <ChatConversationItem person={mobilePeople.chi} call="missed-video" time="Yesterday" selected={active === "chi"} onClick={() => open("chi", mobilePeople.chi.name)} />
          <ChatConversationItem person={mobilePeople.hana} call="outgoing" time="Mon" selected={active === "hana"} onClick={() => open("hana", mobilePeople.hana.name)} />
        </List>
      </PlatformPhone>
      <ChatDemoNote note={demo.note} />
    </div>
  );
}

/* ── AI Chat ────────────────────────────────────────────────────── */
function AiStreamingExample() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const full = "Sure — here's a friendly reminder:\n\nHi team, the design review moves to Thursday 10:30. Please add your agenda items to the doc by Wednesday.";
  const copy = useCopyAction(full);
  const ask = () => {
    setBusy(true); setAnswer("");
    let i = 0;
    const timer = window.setInterval(() => { i += 6; setAnswer(full.slice(0, i)); if (i >= full.length) { window.clearInterval(timer); setBusy(false); } }, 40);
  };
  return (
    <AiChatThread>
      <AiChatBubble side="you">Write a short note moving the design review to Thursday.</AiChatBubble>
      {answer !== null ? <AiChatBubble side="ai" streaming={busy} actions={busy ? [] : [copy, { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: ask }]}>{answer}</AiChatBubble> : null}
      {answer === null ? <Button level="primary" onClick={ask}>Generate</Button> : null}
    </AiChatThread>
  );
}

function AiFeedbackExample() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const copy = useCopyAction("Churn fell to 2.1% in Q3, driven by the onboarding checklist and faster support replies.");
  return (
    <AiChatThread>
      <AiChatBubble side="ai" version="2/2" actions={[
        { icon: vote === "up" ? "icon-thumbs-up-solid" : "icon-thumbs-up-line", label: "Good response", pressed: vote === "up", onClick: () => setVote(vote === "up" ? null : "up") },
        { icon: vote === "down" ? "icon-thumbs-down-solid" : "icon-thumbs-down-line", label: "Bad response", pressed: vote === "down", onClick: () => setVote(vote === "down" ? null : "down") },
        copy,
      ]}>Churn fell to 2.1% in Q3, driven by the onboarding checklist and faster support replies.</AiChatBubble>
      {vote ? <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{vote === "up" ? "Thanks for the feedback." : "Thanks — we'll use this to improve."}</p> : null}
    </AiChatThread>
  );
}

function AiEmptyExample() {
  const [prompt, setPrompt] = useState<string | null>(null);
  return prompt ? (
    <AiChatThread><AiChatBubble side="you">{prompt}</AiChatBubble><AiChatBubble side="ai" thinking /><Button level="tertiary" size="sm" style={{ justifySelf: "start", alignSelf: "flex-start" }} onClick={() => setPrompt(null)}>Start over</Button></AiChatThread>
  ) : (
    <AiChatBlock suggestions={[{ label: "Help me write", icon: "icon-pencil-line", onClick: () => setPrompt("Help me write a launch announcement") }, { label: "Summarize text", icon: "icon-align-left-line", onClick: () => setPrompt("Summarize this document") }, { label: "Analyze image", icon: "icon-image-line", onClick: () => setPrompt("What's in this image?") }]}>
      <AiChatField model="AI Model V 1.0" onSubmit={setPrompt} />
    </AiChatBlock>
  );
}

const longPrompt = "Write a detailed summary of the key findings from the quarterly performance report, grouped by team, with one risk per team.";

function AiLongPromptExample() {
  // Sending moves the prompt into the thread and the assistant answers; Stop ends the answer early. The field stays
  // mounted in the thread, so it keeps focus and empties for the next prompt.
  type Turn = { id: number; prompt: string; answer: string };
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const ask = (prompt: string) => {
    const answer = prompt === longPrompt
      ? "Q3 by team:\n• Product: 4 of 5 roadmap items shipped. Risk: the chat kit slips to November.\n• Design: token rename done. Risk: 38 near-duplicate icons.\n• Engineering: build time down 30%. Risk: two flaky test suites.\n• Support: first reply in 1h 12m. Risk: billing tickets up 18%."
      : "Here is a first draft. Tell me what to change.";
    setTurns((all) => [...all, { id: Date.now(), prompt, answer }]);
    setBusy(true);
    timer.current = window.setTimeout(() => setBusy(false), 900);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setTurns((all) => all.map((turn, i) => (i === all.length - 1 ? { ...turn, answer: "Stopped before the answer was ready." } : turn)));
    setBusy(false);
  };
  return (
    <AiChatThread>
      {turns.map((turn, i) => [
        <AiChatBubble key={`${turn.id}-you`} side="you">{turn.prompt}</AiChatBubble>,
        busy && i === turns.length - 1 ? <AiChatBubble key={`${turn.id}-ai`} side="ai" thinking /> : <AiChatBubble key={`${turn.id}-ai`} side="ai">{turn.answer}</AiChatBubble>,
      ])}
      <AiChatField fieldStyle="surface" model="AI Model V 1.0" defaultValue={longPrompt} busy={busy} onStop={stop} onSubmit={ask} />
    </AiChatThread>
  );
}

/* ── Chart ──────────────────────────────────────────────────────── */
const money = (v: number) => (v === 0 ? "0" : `$${Math.round(v / 100) / 10}K`);
const usd = (v: number) => `$${v.toLocaleString("en-US")}`;

/** Chart Card "Open report" (the header chevron): a modal Side Panel with the numbers behind the chart. */
export function ChartReportPanel({ open, onOpenChange, title, description, head, rows, total }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Headers of the label column and the value column. */
  head: [string, string];
  rows: Array<[string, string]>;
  /** A last row in bold, e.g. ["Total", "$78,000"]. */
  total?: [string, string];
}) {
  const lines = [...rows.map(([label, value]) => ({ id: label, label, value, bold: false })), ...(total ? [{ id: "total", label: total[0], value: total[1], bold: true }] : [])];
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} type="modal" title={title} description={description}>
      <Table aria-label={title} rows={lines}
        columns={[
          { id: "label", header: head[0], cell: (row) => <TableText bold={row.bold}>{row.label}</TableText> },
          { id: "value", header: head[1], align: "right", cell: (row) => <TableText bold={row.bold}>{row.value}</TableText> },
        ]} />
    </SidePanel>
  );
}

const revenueByMonth = [["Jan", 3200], ["Feb", 4100], ["Mar", 3900], ["Apr", 5600], ["May", 6100], ["Jun", 7300]].map(([label, value]) => ({ label: String(label), value: Number(value) }));

function ChartDashboardExample() {
  const [report, setReport] = useState(false);
  return (
    <div className="pe-chart-dash">
      <MetricCard label="Revenue" value="$48.2K" icon="icon-credit-card-line" size="large" trend={{ direction: "positive", label: "+12% vs. last month" }} />
      <ChartCard title="Revenue" onOpen={() => setReport(true)}>
        <LineChart aria-label="Revenue by month" data={revenueByMonth} format={money} height={200} />
      </ChartCard>
      <ChartReportPanel open={report} onOpenChange={setReport} title="Revenue report" description="Monthly revenue, January to June."
        head={["Month", "Revenue"]} rows={revenueByMonth.map((point) => [point.label, usd(point.value)])} total={["Total", usd(revenueByMonth.reduce((sum, point) => sum + point.value, 0))]} />
    </div>
  );
}

function ChartRangeExample() {
  const data = { Week: [["Mon", 12], ["Tue", 19], ["Wed", 15], ["Thu", 23], ["Fri", 28]], Month: [["W1", 64], ["W2", 81], ["W3", 72], ["W4", 97]] } as const;
  const [range, setRange] = useState<keyof typeof data>("Week");
  return (
    <ChartCard title="Sign-ups" ranges={[{ id: "Week", label: "This week" }, { id: "Month", label: "This month" }]} range={range} onRangeChange={(id) => setRange(id as keyof typeof data)}>
      <LineChart key={range} aria-label={`Sign-ups, ${range.toLowerCase()}`} data={data[range].map(([label, value]) => ({ label, value }))} format={(v) => `${v}`} />
    </ChartCard>
  );
}

/* Budget Allocation: one $78K budget grouped three ways; the range switch picks the grouping. Values in $K per quarter. */
type BudgetView = { label: string; series: Array<{ id: string; label: string }>; quarters: Array<[string, ...number[]]> };
const budgetViews: Record<"dept" | "cat" | "proj", BudgetView> = {
  dept: { label: "Department", series: budgetSeries, quarters: [["Q1", 8, 3, 4, 2, 1], ["Q2", 9, 4, 5, 2, 1], ["Q3", 7, 3, 4, 3, 1], ["Q4", 10, 3, 3, 3, 2]] },
  cat: { label: "Category", series: [{ id: "salaries", label: "Salaries" }, { id: "software", label: "Software" }, { id: "hardware", label: "Hardware" }, { id: "travel", label: "Travel" }, { id: "events", label: "Events" }],
    quarters: [["Q1", 10, 3, 2, 2, 1], ["Q2", 11, 4, 2, 2, 2], ["Q3", 10, 3, 1, 2, 2], ["Q4", 12, 3, 2, 1, 3]] },
  proj: { label: "Project", series: [{ id: "web", label: "Web app" }, { id: "mobile", label: "Mobile app" }, { id: "ds", label: "Design system" }, { id: "brand", label: "Brand refresh" }],
    quarters: [["Q1", 7, 5, 4, 2], ["Q2", 8, 6, 4, 3], ["Q3", 6, 6, 4, 2], ["Q4", 7, 7, 5, 2]] },
};

function ChartBudgetExample() {
  const [view, setView] = useState<keyof typeof budgetViews>("dept");
  const [report, setReport] = useState(false);
  const { label, series, quarters } = budgetViews[view];
  const yearTotal = (index: number) => quarters.reduce((sum, [, ...values]) => sum + values[index], 0) * 1000;
  return (
    <>
      <ChartCard title="Budget Allocation" onOpen={() => setReport(true)} ranges={Object.entries(budgetViews).map(([id, v]) => ({ id, label: v.label }))}
        range={view} onRangeChange={(id) => setView(id as keyof typeof budgetViews)}>
        <StackBarChart key={view} aria-label={`Budget by ${label.toLowerCase()} and quarter`} series={series} format={money}
          data={quarters.map(([quarter, ...values]) => ({ label: quarter, values: Object.fromEntries(series.map((s, i) => [s.id, values[i] * 1000])) }))} />
      </ChartCard>
      <ChartReportPanel open={report} onOpenChange={setReport} title="Budget allocation report" description={`This year's budget by ${label.toLowerCase()}.`}
        head={[label, "Year total"]} rows={series.map((s, i) => [s.label, usd(yearTotal(i))])} total={["Total", usd(series.reduce((sum, _s, i) => sum + yearTotal(i), 0))]} />
    </>
  );
}

function ChartInlineExample() {
  return (
    <div className="pe-stack" style={{ width: "100%", maxWidth: 480 }}>
      <div className="pe-row" style={{ justifyContent: "space-between" }}><span className={`pe-text pe-text--strongest ${typographyStyles["Body/Base/Medium"]}`}>Storage used</span><Badge theme="orange" background="subtle" size="small">82%</Badge></div>
      <LineChart aria-label="Storage used over six months, in GB" data={[["Apr", 22], ["May", 31], ["Jun", 36], ["Jul", 44], ["Aug", 49], ["Sep", 52]].map(([label, value]) => ({ label: String(label), value: Number(value) }))} format={(v) => `${v} GB`} height={180} />
    </div>
  );
}

/* ── QA 2026-09-27: state / edge-case examples (see docs/guides/example-patterns.md) ── */
function ChatFailedExample() {
  type Msg = { id: number; side: "you" | "others"; text: string; state?: "failed" | "sending" | "sent"; replyTo?: ChatReplyTarget };
  const demo = useChatDemo("Retry the failed message, or hold any message to react, reply or act on it.");
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 11, side: "others", text: "Morning! Is the review still at 3?" }, { id: 12, side: "you", text: "Yes, same room as last week." },
    { id: 13, side: "others", text: "Great. Did legal sign off on the copy?" }, { id: 14, side: "you", text: "They did, two small wording changes." },
    { id: 15, side: "others", text: "Can you share them before the meeting?" }, { id: 16, side: "you", text: "Sure, adding them to the deck now." },
    { id: 17, side: "others", text: "Thanks! I'll print a few copies." },
    { id: 18, side: "you", text: "Five should be enough." },
    { id: 19, side: "others", text: "Ok. Also, the client asked for the Q3 numbers." },
    { id: 20, side: "you", text: "They're on slide 12, I'll highlight them." },
    { id: 21, side: "others", text: "Perfect 👌" },
    { id: 22, side: "others", text: "One more thing: can we move it to 3:30?" },
    { id: 23, side: "you", text: "Works for me, I'll update the invite." },
    { id: 1, side: "others", text: "Can you send the final deck?" }, { id: 2, side: "you", text: "Uploading it now", state: "failed" },
  ]);
  const set = (id: number, state: Msg["state"]) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, state } : x)));
  // The retry succeeds: failed → Sending… → Sent. A new message sent offline fails first.
  const retry = (id: number) => { set(id, "sending"); window.setTimeout(() => set(id, "sent"), 900); };
  const send = (text: string) => { const replyTo = demo.takeReply(); setMsgs((m) => [...m, { id: Date.now(), side: "you", text, state: "failed", replyTo }]); };
  return (
    <div className="pe-stack pe-chat-demo">
      <PlatformPhone label="Failed message" header={<PlatformChatHeader title="Ava Chen" subtitle="Active 12m ago" person={mobilePeople.ava} onAction={demo.headerAction} />}
        footer={<ChatComposer actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => send("👍") }} {...demo.composerReply} onSend={send} />}>
        <ChatThread aria-label="Conversation with Ava">
          {msgs.filter((m) => !demo.isDeleted(`failed-${m.id}`)).map((m) => (
            <ChatMessage key={m.id} {...demo.act(`failed-${m.id}`, m.side, { text: m.text, author: "Ava Chen" })} side={m.side} author={m.side === "others" ? mobilePeople.ava : undefined} failed={m.state === "failed"} onRetry={() => retry(m.id)}
              status={m.state === "sending" ? "Sending…" : m.state === "sent" ? "Sent" : undefined} replyTo={m.replyTo}>{m.text}</ChatMessage>
          ))}
        </ChatThread>
      </PlatformPhone>
      <ChatDemoNote note={demo.note} />
    </div>
  );
}

function AiErrorExample() {
  const [state, setState] = useState<"error" | "loading" | "done">("error");
  const retry = () => { setState("loading"); window.setTimeout(() => setState("done"), 800); };
  const copy = useCopyAction("142 tickets: 38% billing, 27% sign-in, 19% exports. Median first reply 1h 12m.");
  return (
    <AiChatThread>
      <AiChatBubble side="you">Summarise last week's support tickets.</AiChatBubble>
      {state === "error" ? <InlineMessage theme="negative" title="The assistant couldn't finish this answer" action={{ label: "Try again", onClick: retry }}>The connection dropped after 12 seconds. Your question is kept.</InlineMessage> : null}
      {state === "loading" ? <AiChatBubble side="ai" thinking thinkingLabel="Retrying" /> : null}
      {state === "done" ? <AiChatBubble side="ai" actions={[copy, { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: () => setState("error") }]}>142 tickets: 38% billing, 27% sign-in, 19% exports. Median first reply 1h 12m.</AiChatBubble> : null}
    </AiChatThread>
  );
}

function ChartEmptyExample() {
  const [connected, setConnected] = useState(false);
  return (
    <ChartCard title="Weekly sign-ups">
      {connected
        ? <LineChart aria-label="Weekly sign-ups" data={[["W1", 12], ["W2", 19], ["W3", 15], ["W4", 23]].map(([label, value]) => ({ label: String(label), value: Number(value) }))} format={(v) => `${v}`} height={220} />
        : <EmptyState illustration={false} headingLevel={4} title="No data yet" primaryAction={{ label: "Connect analytics", onClick: () => setConnected(true) }}>Sign-ups appear here after the first day of tracking.</EmptyState>}
    </ChartCard>
  );
}

const checkoutLines = [["Team plan · 12 seats", "$144.00"], ["Extra storage · 100 GB", "$12.00"], ["Priority support", "$20.00"], ["SSO & audit log", "$24.00"], ["Discount · annual", "−$20.00"], ["Tax", "$18.00"], ["Total per month", "$198.00"]];

function SheetTermsExample() {
  // Back goes up to the cart; "Continue to checkout" comes back to this screen.
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [atCart, setAtCart] = useState(false);
  const screen = usePhoneScreen();
  const amount = (value: string) => <span className={`pe-text pe-text--strongest ${typographyStyles["Body/Base/Medium"]}`}>{value}</span>;
  if (atCart) {
    return (
      <PlatformPhone canvas="canvas" label="Long content sheet" header={<TopNavigation title="Cart" largeTitle="Cart" />}
        footer={<div className="pe-phone-cta"><Button level="primary" size="lg" onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setAtCart(false))}>Continue to checkout</Button></div>}>
        {screen.anchor}
        <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)" }}>
          <Card spacing="small" className="pe-list-card">
            <List aria-label="Cart">
              {checkoutLines.slice(0, 4).map(([label, value]) => <ListItem key={label} title={label} trailing={amount(value)} />)}
            </List>
          </Card>
        </div>
      </PlatformPhone>
    );
  }
  return (
    <PlatformPhone canvas="canvas" label="Long content sheet" header={<TopNavigation type="compact" title="Checkout" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(".pe-phone-cta .zen-button", () => setAtCart(true)) }} />}>
      {screen.anchor}
      <div className="pe-stack" style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px) var(--zen-spacing-padding-xlarge, 24px)", gap: "var(--zen-spacing-gap-medium, 16px)" }}>
        <Card spacing="small" className="pe-list-card">
          <List aria-label="Order summary">
            {checkoutLines.map(([label, value]) => <ListItem key={label} title={label} trailing={amount(value)} />)}
          </List>
        </Card>
        <InputField label="Billing email" defaultValue="ava@zen.studio" />
        <InputField label="Company" defaultValue="Zen Studio" />
        <InputField label="VAT number" placeholder="Optional" />
        <InputField label="Billing address" defaultValue="12 Nguyen Hue, District 1" />
        <InputField label="City" defaultValue="Ho Chi Minh City" />
        <Checkbox label="I agree to the subscription terms" checked={accepted} onChange={setAccepted} />
        <Button level="tertiary" size="sm" style={{ justifySelf: "start" }} onClick={() => setOpen(true)}>Read the terms</Button>
      </div>
      <BottomSheet inline open={open} onOpenChange={setOpen} size="max" title="Subscription terms" actionsDirection="vertical"
        primaryAction={{ label: "Agree and close", onClick: () => { setAccepted(true); setOpen(false); } }} secondaryAction={{ label: "Close" }}>
        {["Billing", "Renewal", "Cancellation", "Refunds", "Data retention", "Changes to these terms"].map((h) => (
          <section key={h} className="pe-stack" style={{ gap: "var(--zen-spacing-gap-2-xsmall, 4px)" }}><strong>{h}</strong><span className="pe-text pe-text--base">Plans renew automatically at the end of each period unless cancelled from Settings → Billing. You keep access until the period ends; partial periods are not refunded.</span></section>
        ))}
      </BottomSheet>
    </PlatformPhone>
  );
}

export const mobileExamples: Partial<Record<PlatformPage, ExampleDef[]>> = {
  "top-navigation": [
    { title: "Collapse on scroll", description: "The large title folds into the navigator bar once the list scrolls (collapsed). The Search control bar folds into a Search action at the top right; scrolling back up (or tapping it) brings the search bar back and the action leaves. New message opens a compose sheet; Send starts the conversation on top.", render: () => <TopNavCollapseExample />, code: `const [collapsed, setCollapsed] = useState(false);

<TopNavigation title="Inbox" largeTitle="Inbox" collapsed={collapsed}
  trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: () => setComposing(true) }]}
  controlBar={<Search ref={searchRef} placeholder="Search messages" />}
  searchAction={{ label: "Search messages", onClick: () => { scroller.scrollTo({ top: 0, behavior: "smooth" }); focusSearchWhenExpanded(); } }} />
<div onScroll={(e) => setCollapsed(e.currentTarget.scrollTop > 24)}>…</div>
<BottomSheet inline open={composing} onOpenChange={setComposing} title="New message"
  primaryAction={{ label: "Send", disabled: !to.trim(), onClick: send }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="To" value={to} onValueChange={setTo} data-autofocus="" />
  <TextAreaField label="Message" value={text} onValueChange={setText} />
</BottomSheet>` },
    { title: "Home with avatar", description: "A tab root: the large title is the screen's h1 (Heading/1) and the group labels under it are h2. Alt background on an Alt canvas; a visual leading slot (Avatar) and a notification dot on the trailing action. The bell opens the notifications and clears the dot; Settings opens a settings sheet.", render: () => <TopNavProfileExample />, code: `<TopNavigation type="alt" largeTitle="Good morning, Ava"
  leading={<Avatar size="medium" theme="photo" src={ava} alt="Ava Chen" />}
  trailing={[
    { icon: "icon-bell-01-line", label: seen ? "Notifications" : "Notifications, 3 new", dot: !seen, onClick: () => { setSheet("notifications"); setSeen(true); } },
    { icon: "icon-settings-01-line", label: "Settings", onClick: () => setSheet("settings") },
  ]} />
<BottomSheet inline open={sheet === "notifications"} onOpenChange={close} title="Notifications">
  <List aria-label="Notifications">…</List>
</BottomSheet>` },
    { title: "Over media", description: "Liquid-Overlay: a black gradient keeps white actions readable on photos and video. Close goes back to the album, Share opens a share sheet and Like toggles.", render: () => <TopNavMediaExample />, code: `<TopNavigation type="liquid-overlay" title={\`Site visit · \${index + 1} of \${photos.length}\`}
  leading={{ icon: "icon-x-medium-line", label: "Close viewer", onClick: backToAlbum }}
  trailing={[
    { icon: "icon-share-01-line", label: "Share", onClick: () => setSharing(true) },
    { icon: liked ? "icon-heart-solid" : "icon-heart-line", label: liked ? "Unlike" : "Like", onClick: toggleLike },
  ]} />` },
    { title: "Control bar", description: "A Segmented in the Control-Bar slot filters the screen under a compact bar. Back goes up to Drive; Upload opens a source sheet and adds the file on top.", render: () => <TopNavSegmentedExample />, code: `<TopNavigation type="compact" title="Files"
  leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setAtDrive(true) }}
  trailing={[{ icon: "icon-plus-line", label: "Upload", onClick: () => setUploading(true) }]}
  controlBar={<Segmented fullWidth options={tabs} value={tab} onChange={setTab} aria-label="Filter files" />} />
<BottomSheet inline open={uploading} onOpenChange={setUploading} type="action" title="Upload from" items={sources} onSelect={(item) => upload(item.id)} />` },
  ],
  "bottom-navigation": [
    { title: "Tabbed app", description: "Default bar with a notification dot that clears when Inbox opens.", render: () => <BottomNavAppExample />, code: `<BottomNavigation items={items} value={tab} onValueChange={(id) => { setTab(id); if (id === "inbox") markRead(); }} />` },
    { title: "Floating + action", description: "The floating pill over content, with a floating action that opens an Action bottom sheet; the pick starts a draft.", render: () => <BottomNavFloatingExample />, code: `<BottomNavigation type="floating" items={items} value={tab} onValueChange={setTab}
  action={{ icon: "icon-plus-line", label: "New post", onClick: () => setSheet(true) }} />
<BottomSheet open={sheet} onOpenChange={setSheet} type="action" title="Create" items={createItems} onSelect={(item) => startDraft(item.label)} />` },
    { title: "Glass over media", description: "Floating Glass with the Solid selection keeps contrast on imagery.", render: () => <BottomNavGlassExample />, code: `<BottomNavigation type="floating-glass" selection="solid" backdrop="none" items={items} value={tab} onValueChange={setTab} />` },
    { title: "Labels + accent action", description: "Accent theme with labels and a Type=Action item in the bar; Create opens a New project sheet.", render: () => <BottomNavLabelsExample />, code: `<BottomNavigation theme="accent" showLabels items={items} value={tab} onValueChange={setTab}
  action={{ icon: "icon-plus-line", label: "Create", theme: "accent", onClick: () => setCreating(true) }} />
<BottomSheet open={creating} onOpenChange={setCreating} title="New project"
  primaryAction={{ label: "Create project", disabled: !name.trim(), onClick: create }} secondaryAction={{ label: "Cancel" }}>
  <InputField label="Project name" value={name} onValueChange={setName} data-autofocus="" />
</BottomSheet>` },
  ],
  "bottom-sheet": [
    { title: "Share sheet", description: "An Action sheet; Copy link confirms in place (keepOpen) and destructive items use Negative.", render: () => <SheetShareExample />, code: `<BottomSheet open={open} onOpenChange={setOpen} type="action" title="Share" keepOpen
  onSelect={(item) => item.id === "copy" ? copy() : setOpen(false)}
  items={[
    { id: "copy", label: "Copy link", icon: "icon-link-01-line" },
    { id: "mail", label: "Email", icon: "icon-mail-01-line" },
    { id: "remove", label: "Remove access", icon: "icon-trash-line", destructive: true },
  ]} />` },
    { title: "Filters", description: "A Modal sheet edits a draft; Apply commits, Reset clears, dismissing discards.", render: () => <SheetFilterExample />, code: `<BottomSheet open={open} onOpenChange={setOpen} title="Filters"
  primaryAction={{ label: "Apply", onClick: apply }}
  secondaryAction={{ label: "Reset", onClick: reset }}>
  <Checkbox label="Unread only" … />
  <Checkbox label="Mentions" … />
</BottomSheet>` },
    { title: "Quick create", description: "Vertical actions stack the Primary over Cancel; the Primary stays disabled until the title is filled.", render: () => <SheetFormExample />, code: `<BottomSheet open={open} onOpenChange={setOpen} title="New task" actionsDirection="vertical"
  primaryAction={{ label: "Create task", disabled: !title.trim(), onClick: create }}
  secondaryAction={{ label: "Cancel" }}>
  <InputField label="Title" data-autofocus="" … />
</BottomSheet>` },
    { title: "Full-height with search", description: "Max-Fixed size with a Search under the header; the body scrolls, the header stays.", render: () => <SheetSettingsExample />, code: `<BottomSheet open={open} onOpenChange={setOpen} size="max" title="Settings" search={<Search placeholder="Search settings" />}>
  <List aria-label="Settings">…</List>
</BottomSheet>` },
    { title: "Long content", description: "Max-Fixed for reading: the body scrolls under a fixed header, vertical actions stay reachable at the bottom. Back goes up to the cart.", render: () => <SheetTermsExample />, code: `<TopNavigation type="compact" title="Checkout" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setAtCart(true) }} />
<BottomSheet open={open} onOpenChange={setOpen} size="max" title="Subscription terms" actionsDirection="vertical"
  primaryAction={{ label: "Agree and close", onClick: agree }} secondaryAction={{ label: "Close" }}>
  {sections}
</BottomSheet>` },
  ],
  chat: [
    { title: "Support chat", description: "Business domain: time inside the bubble, an attachment as the quick action, and an automatic reply.", render: () => <ChatSupportExample />, code: `<ChatThread aria-label="Support conversation">
  <ChatMessage side="others" domain="business" author={{ name: "Zen Support" }} time="09:41">Hi! How can we help today?</ChatMessage>
</ChatThread>
<ChatComposer quickAction={{ icon: "icon-attachment-01-line", label: "Attach a file" }} onSend={send} />` },
    { title: "Group media", description: "Names in a group, a 4+ photo grid, reactions, a missed call and a read list.", render: () => <ChatMediaExample />, code: `<ChatMessage side="others" author={bao} showName><ChatPhotos photos={photos} /></ChatMessage>
<ChatMessage side="others" author={chi} showName reactions={[{ kind: "like", count: 2 }, { kind: "heart" }]}>These are from the site visit 👆</ChatMessage>
<ChatMessage side="you"><ChatCall side="you" state="out-missed" detail="12:33" onAction={call} /></ChatMessage>
<ChatMessage side="you" seenBy={[ava, bao, chi]}>Call me when you're free</ChatMessage>` },
    { title: "Hold to react", description: "Long-press (or right-click / Shift+F10) a message: the screen blurs, the Reaction-Bar sits above the bubble and the Figma action menu below it (Reply · Forward · Copy · Delete · More; a call gets Report · Delete).", render: () => <ChatReactExample />, code: `<ChatMessage side="others" author={ava}
  reactions={reaction ? [{ kind: reaction }] : undefined}
  reaction={reaction} onReact={setReaction}
  holdActions={chatHoldActions.others} onHoldAction={(id) => handle(id, message)}>
  We shipped the new tokens 🎉
</ChatMessage>
<ChatMessage side="others" author={ava} holdActions={chatHoldActions.call} onHoldAction={handleCall}>
  <ChatCall state="in-missed" detail="12:33" onAction={callBack} />
</ChatMessage>` },
    { title: "Conversation list", description: "Mobile inbox: ChatConversationItem rows (a ListItem, Figma 375px) under a compact Top Navigation — on desktop the same rows fill the messenger's left pane. unread text is Bold with a green Active dot; a missed call is Negative until opened; an ongoing call is Positive. Open a row to mark it read.", render: () => <ChatInboxExample />, code: `<List aria-label="Conversations">
  <ChatConversationItem person={ava} preview="Did you get the brand files?" time="2 mins ago" unread online onClick={open} />
  <ChatConversationItem person={bao} call="missed-audio" time="12 mins ago" unread onClick={open} />
  <ChatConversationItem person={{ name: "Design team" }} group={[chi, ava]} call="ongoing" time="now" onClick={open} />
  <ChatConversationItem person={chi} call="missed-video" time="Yesterday" onClick={open} />
</List>` },
    { title: "Failed to send", description: "A Negative “Not delivered” line with Retry replaces the status; Retry shows Sending… then Sent. Messages sent here fail first.", render: () => <ChatFailedExample />, code: `<ChatMessage side="you" failed={failed} onRetry={resend}>Uploading it now</ChatMessage>` },
    ...chatDesktopExamples,
  ],
  "ai-chat": [
    { title: "Streaming answer", description: "Three dots wave while the assistant thinks, then the answer streams in (aria-busy, pulsing caret); actions appear once it finishes.", render: () => <AiStreamingExample />, code: `// Copy confirms in place: { icon: copied ? "icon-check-line" : "icon-copy-line", label: copied ? "Copied" : "Copy", onClick: copyAnswer }
<AiChatBubble side="ai" streaming={busy} actions={busy ? [] : [copy, { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate }]}>
  {answer}
</AiChatBubble>` },
    { title: "Feedback", description: "Thumbs are toggle buttons (aria-pressed) and swap to the solid glyph when chosen.", render: () => <AiFeedbackExample />, code: `<AiChatBubble side="ai" version="2/2" actions={[
  { icon: vote === "up" ? "icon-thumbs-up-solid" : "icon-thumbs-up-line", label: "Good response", pressed: vote === "up", onClick: toggleUp },
  …
  { icon: copied ? "icon-check-line" : "icon-copy-line", label: copied ? "Copied" : "Copy", onClick: copyAnswer },
]}>…</AiChatBubble>` },
    { title: "Empty state", description: "The Block greets and offers suggestions that start a conversation.", render: () => <AiEmptyExample />, code: `<AiChatBlock suggestions={[{ label: "Help me write", icon: "icon-pencil-line", onClick: () => ask("…") }]}>
  <AiChatField model="AI Model V 1.0" onSubmit={ask} />
</AiChatBlock>` },
    { title: "Long prompt", description: "Surface style; a long prompt moves above the controls (State=Long-Typing). Sending moves it into the thread and the assistant answers; Stop ends the answer early.", wide: true, render: () => <AiLongPromptExample />, code: `<AiChatThread>
  {turns}
  <AiChatField fieldStyle="surface" model="AI Model V 1.0" busy={busy} onStop={stop} onSubmit={ask} />
</AiChatThread>` },
    { title: "Error and retry", description: "A failed answer becomes a Negative Inline Message that keeps the question and offers Try again; the retry streams.", render: () => <AiErrorExample />, code: `<AiChatBubble side="you">{question}</AiChatBubble>
{error ? <InlineMessage theme="negative" title="The assistant couldn't finish this answer" action={{ label: "Try again", onClick: retry }}>
  The connection dropped after 12 seconds. Your question is kept.
</InlineMessage> : <AiChatBubble side="ai" streaming={busy}>{answer}</AiChatBubble>}` },
  ],
  chart: [
    { title: "Dashboard tile", description: "A Chart Card next to a Metric Card; the chevron opens the report in a modal Side Panel.", wide: true, render: () => <ChartDashboardExample />, code: `<MetricCard label="Revenue" value="$48.2K" icon="icon-credit-card-line" trend={{ direction: "positive", label: "+12% vs. last month" }} />
<ChartCard title="Revenue" onOpen={() => setReport(true)}>
  <LineChart aria-label="Revenue by month" data={months} format={money} height={200} />
</ChartCard>
<SidePanel open={report} onOpenChange={setReport} type="modal" title="Revenue report" description="Monthly revenue, January to June.">
  <Table aria-label="Revenue report" rows={months} columns={columns} />
</SidePanel>` },
    { title: "Range switch", description: "The Segmented range swaps the dataset; ←/→ move between points.", render: () => <ChartRangeExample />, code: `<ChartCard title="Sign-ups" ranges={ranges} range={range} onRangeChange={setRange}>
  <LineChart aria-label={\`Sign-ups, \${range}\`} data={data[range]} />
</ChartCard>` },
    { title: "Budget allocation", description: "Stack-bar with the Figma palette and legend; the tooltip shows the column total. The range regroups the same budget by department, category or project; the chevron opens the report.", render: () => <ChartBudgetExample />, code: `const [view, setView] = useState("dept"); // budgetViews: { dept: { label: "Department", series, data }, cat: …, proj: … }
const { label, series, data } = budgetViews[view];

<ChartCard title="Budget Allocation" onOpen={() => setReport(true)}
  ranges={Object.entries(budgetViews).map(([id, v]) => ({ id, label: v.label }))} range={view} onRangeChange={setView}>
  <StackBarChart key={view} aria-label={\`Budget by \${label.toLowerCase()} and quarter\`} series={series} data={data} format={money} />
</ChartCard>` },
    { title: "Inline trend", description: "A bare LineChart inside a page section with a status Badge.", render: () => <ChartInlineExample />, code: `<LineChart aria-label="Storage used over six months, in GB" data={storage} format={(v) => \`\${v} GB\`} height={180} />` },
    { title: "No data yet", description: "Before there is data the card keeps its title and shows an Empty State with the action that produces data — never an empty grid. The Empty State title sits one level below the card title (h4 under the h3).", render: () => <ChartEmptyExample />, code: `<ChartCard title="Weekly sign-ups">
  {points.length ? <LineChart aria-label="Weekly sign-ups" data={points} />
    : <EmptyState illustration={false} headingLevel={4} title="No data yet" primaryAction={{ label: "Connect analytics", onClick: connect }}>…</EmptyState>}
</ChartCard>` },
  ],
};
