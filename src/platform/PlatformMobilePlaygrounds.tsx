import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertBanner } from "../components/AlertBanner";
import { Button } from "../components/Button";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { List, ListItem } from "../components/ListItem";
import { DockIcon } from "../components/DockIcon";
import { Box } from "../components/Layout";
import { EmptyState } from "../components/EmptyState";
import { InputField } from "../components/Input";
import { PlatformChatHeader } from "./PlatformChatHeader";
import { TopNavigation, topNavigationTypes, type TopNavigationHeading, type TopNavigationMargin, type TopNavigationType } from "../components/TopNavigation";
import { BottomNavigation, type BottomNavigationSelection, type BottomNavigationTheme, type BottomNavigationType } from "../components/BottomNavigation";
import { BottomSheet, type BottomSheetItem, type BottomSheetSize, type BottomSheetType } from "../components/BottomSheet";
import { ChatComposer, ChatFile, ChatMessage, ChatThread, ChatDateDivider, type ChatDomain, type ChatReplyTarget } from "../components/Chat";
import { AiChatBlock, AiChatBubble, AiChatField, AiChatThread, type AiChatFieldStyle } from "../components/AiChat";
import { ChartCard, LineChart, StackBarChart } from "../components/Chart";
import { typographyStyles } from "../tokens/typography.generated";
import { PlatformCode } from "./PlatformCode";
import { PlatformPhone } from "./PlatformPhone";
import { ChatDemoNote, useChatDemo } from "./chatDemo";
import { headerActions, ThreadHeader } from "./PlatformChatDesktopShowcases";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { bottomNavItems, budgetSeries, mobilePeople } from "./PlatformMobileData";
import { PlatformPhoneMedia, platformMedia } from "./PlatformMedia";
// From the leaf, not PlatformExamples (which imports these playgrounds): that cycle made Vite reload the whole page.
import { ComponentPreview, PlaygroundControls, PlaygroundFilterChip, PlaygroundSlot, PlaygroundToggle } from "./appLayer/playgroundParts";
import { ChartReportPanel } from "./PlatformMobileShowcases";

/* Playgrounds for the mobile / conversation / data-viz batch (Top & Bottom Navigation, Bottom Sheet, Chat, AI Chat, Chart). */

function Panel({ title, controls, children, code }: { title: string; controls: ReactNode; children: ReactNode; code: string }) {
  const previewTypography = useContext(PlatformTypographyContext);
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">{title}</h2>
      <PlaygroundControls aria-label={`${title} playground controls`}>{controls}</PlaygroundControls>
      <div data-typography={previewTypography} className="platform-example-row platform-mobile-preview">{children}</div>
      <PlatformCode code={code} />
    </ComponentPreview>
  );
}

const option = (id: string, label = id) => ({ id, label });

/** Long enough to scroll under a floating (blurring / glass / overlay) header. */
const projects = ["Zen website", "Brand refresh", "Mobile app", "Docs platform", "Design tokens", "Icon library", "Marketing site", "Onboarding flow", "Help center", "Release notes", "Pricing page", "Analytics", "Email templates", "Partner portal"]
  .map((title, index) => ({ title, pages: (index * 7) % 23 + 3, days: index + 1, theme: (["brown", "indigo", "green", "orange", "teal", "purple"] as const)[index % 6] }));
type Project = (typeof projects)[number];
type ProjectSort = "recent" | "name" | "pages";
const projectOrder: Record<ProjectSort, (a: Project, b: Project) => number> = {
  recent: (a, b) => a.days - b.days,
  name: (a, b) => a.title.localeCompare(b.title),
  pages: (a, b) => b.pages - a.pages,
};
const sortItems: BottomSheetItem[] = [
  { id: "recent", label: "Most recent", icon: "icon-clock-line" },
  { id: "name", label: "Name", icon: "icon-type-01-line" },
  { id: "pages", label: "Most pages", icon: "icon-layers-three-01-line" },
];

function ScreenList({ extra = [], query = "", sort = "recent", onClearQuery }: { extra?: string[]; query?: string; sort?: ProjectSort; onClearQuery?: () => void }) {
  // Opening a project selects it (the rows are never locked, even in a playground). A project created from the header
  // (extra, newest first) lands on top, opened. The header's Search filters the rows by name; a Sort sheet orders them.
  const [open, setOpen] = useState<string | null>(null);
  const newest = extra[0];
  useEffect(() => { if (newest) setOpen(newest); }, [newest]);
  const q = query.trim().toLowerCase();
  const created = extra.filter((title) => title.toLowerCase().includes(q));
  const rows = projects.filter((project) => project.title.toLowerCase().includes(q)).sort(projectOrder[sort]);
  if (!created.length && !rows.length) {
    return (
      <EmptyState illustration={false} headingLevel={2} title={`No projects match “${query.trim()}”`}
        secondaryAction={onClearQuery ? { label: "Clear search", onClick: onClearQuery } : undefined}>
        Try another name, such as Zen website.
      </EmptyState>
    );
  }
  // List-Item rows have no padding: the screen margin (lg, 20px) insets them and leaves room for the selected fill
  // (12px outside the content); Padding/Small above keeps the first fill off the header.
  return (
    <Box paddingX="lg" paddingY="xs">
      <List aria-label="Recent projects">
        {created.map((title) => <ListItem key={title} title={title} caption="Created just now" leading={<DockIcon icon="icon-folder-line" theme="teal" background="subtle" />} selected={open === title} onClick={() => setOpen(title)} />)}
        {rows.map((project) => (
          <ListItem key={project.title} title={project.title} caption={`${project.pages} pages · updated ${project.days}d ago`} leading={<DockIcon icon="icon-folder-line" theme={project.theme} background="subtle" />} selected={open === project.title} onClick={() => setOpen(project.title)} />
        ))}
      </List>
    </Box>
  );
}

export function TopNavigationPlayground() {
  const [type, setType] = useState<string | undefined>("default");
  const [margin, setMargin] = useState<string | undefined>("comfortable");
  const [level, setLevel] = useState<string | undefined>("h1");
  // On scroll: the bar follows the phone screen (scrollRef); Expanded / Collapsed pin it by hand (collapsed).
  const [collapse, setCollapse] = useState<string | undefined>("scroll");
  const screenRef = useRef<HTMLDivElement>(null);
  const [control, setControl] = useState(false);
  // Back makes this a pushed screen (the bar row sits above the large title); without it, it is a root, where the bar
  // row folds into the large-title row (Figma Top-bar=false). Banner pins a status under the bar.
  const [back, setBack] = useState(false);
  const [banner, setBanner] = useState(false);
  // Grouped trailing: a second trailing action (More) shares one pill with Notifications (`group`, Figma Nav-Action
  // Trailing-Icon).
  const [grouped, setGrouped] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [dot, setDot] = useState(true);
  // Every action does something: Back reports where it goes, the bell clears its dot, + adds a project on top.
  const [note, setNote] = useState<string | null>(null);
  const [created, setCreated] = useState<string[]>([]);
  const t = (type ?? "default") as TopNavigationType;
  const overlay = t.endsWith("overlay");
  // The compact types draw Flat actions, which never share a pill (Figma's Icon-Flat has no trailing icon): no Grouped
  // trailing control there.
  const flat = t.startsWith("compact");
  const pair = grouped && !flat;
  /** The Search action: back to the top, then into the field once the bar no longer folds it away (inert). */
  const openSearch = () => {
    if (collapse === "collapsed") setCollapse("expanded");
    screenRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const started = performance.now();
    const focusWhenBack = () => {
      const field = searchRef.current;
      if (field && !field.closest("[inert]")) field.focus({ preventScroll: true });
      else if (performance.now() - started < 1500) requestAnimationFrame(focusWhenBack);
    };
    requestAnimationFrame(focusWhenBack);
  };
  return (
    <Panel title="Top Navigation / Mobile"
      controls={<>
        <PlaygroundFilterChip label="Type" value={type} onChange={(v) => setType(String(v) || undefined)} options={topNavigationTypes.map((id) => option(id))} />
        <PlaygroundFilterChip label="Margin" value={margin} onChange={(v) => setMargin(String(v) || undefined)} options={[option("comfortable", "Comfortable (20)"), option("compact", "Compact (16)")]} />
        <PlaygroundFilterChip label="Heading" value={level} onChange={(v) => setLevel(String(v) || undefined)} options={["h1", "h2", "h3"].map((id) => option(id, id.toUpperCase()))} />
        <PlaygroundFilterChip label="Collapse" value={collapse} onChange={(v) => setCollapse(String(v) || undefined)} options={[option("scroll", "On scroll"), option("expanded", "Expanded"), option("collapsed", "Collapsed")]} />
        <PlaygroundToggle label="Control bar" selected={control} onChange={(on) => { setControl(on); if (!on) setQuery(""); }} />
        <PlaygroundToggle label="Noti dot" selected={dot} onChange={setDot} />
        <PlaygroundToggle label="Back" selected={back} onChange={setBack} />
        <PlaygroundToggle label="Banner" selected={banner} onChange={setBanner} />
        {flat ? null : <PlaygroundToggle label="Grouped trailing" selected={grouped} onChange={setGrouped} />}
      </>}
      code={`import { TopNavigation } from "@zen-ds/react";

<TopNavigation${t !== "default" ? `\n  type="${t}"` : ""}${margin === "compact" ? `\n  margin="compact"` : ""}
  title="Projects"
  largeTitle="Projects"${level !== "h1" ? `\n  headingLevel="${level}"` : ""}${collapse === "collapsed" ? "\n  collapsed" : collapse === "expanded" ? "\n  collapsed={false}" : "\n  scrollRef={screenRef}"}${back ? `\n  leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: goBack }}` : ""}
  trailing={[{ icon: "icon-bell-01-line", label: "Notifications"${dot ? ", dot: true" : ""}${pair ? `, group: "alerts"` : ""}, onClick: openNotifications }${pair ? `,\n    { icon: "icon-dots-horizontal-line", label: "More", group: "alerts", onClick: openProjectOptions }` : ""}]}
  largeTitleAction={{ icon: "icon-plus-line", label: "New project", onClick: createProject }}${banner ? `\n  banner={<AlertBanner size="small" theme="negative">You're offline. Showing projects from 10:12 am.</AlertBanner>}` : ""}${control ? `\n  controlBar={<Search placeholder="Search projects" value={query} onValueChange={setQuery} />}\n  searchAction={{ label: "Search projects", onClick: scrollUpAndFocusSearch }}` : ""}
/>`}>
      <PlatformPhone canvas={overlay ? "media" : t.includes("alt") || t === "liquid-glass" ? "alt" : "default"} statusBar={overlay ? "light" : "dark"} headerOverlay={collapse === "scroll" || t.includes("blurring") || t === "liquid-glass" || overlay} screenRef={screenRef}
        header={<TopNavigation type={t} margin={(margin ?? "comfortable") as TopNavigationMargin} headingLevel={(level ?? "h1") as TopNavigationHeading}
          scrollRef={collapse === "scroll" ? screenRef : undefined} collapsed={collapse === "scroll" ? undefined : collapse === "collapsed"}
          title="Projects" largeTitle="Projects" leading={back ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setNote("Back returns to the previous screen.") } : undefined}
          banner={banner ? <AlertBanner size="small" theme="negative">You're offline. Showing projects from 10:12 am.</AlertBanner> : undefined}
          trailing={pair
            ? [{ icon: "icon-bell-01-line", label: "Notifications", dot, group: "alerts", onClick: () => { setDot(false); setNote("Notifications opened; the dot clears."); } }, { icon: "icon-dots-horizontal-line", label: "More", group: "alerts", onClick: () => setNote("Project options opened.") }]
            : [{ icon: "icon-bell-01-line", label: "Notifications", dot, onClick: () => { setDot(false); setNote("Notifications opened; the dot clears."); } }]}
          largeTitleAction={{ icon: "icon-plus-line", label: "New project", onClick: () => { setCreated((list) => [`New project ${list.length + 1}`, ...list]); setNote(null); } }} controlBar={control ? <Search ref={searchRef} placeholder="Search projects" value={query} onValueChange={setQuery} /> : undefined}
          searchAction={control ? { label: "Search projects", onClick: openSearch } : undefined} />}>
        {overlay ? <PlatformPhoneMedia photo={platformMedia.mountainRoad} /> : <ScreenList extra={created} query={query} onClearQuery={() => { setQuery(""); searchRef.current?.focus(); }} />}
      </PlatformPhone>
      {note ? <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{note}</p> : null}
    </Panel>
  );
}


export function BottomNavigationPlayground() {
  const [type, setType] = useState<string | undefined>("default");
  const [theme, setTheme] = useState<string | undefined>("neutral");
  const [selection, setSelection] = useState<string | undefined>("surface");
  const [labels, setLabels] = useState(false);
  const [action, setAction] = useState(false);
  const [value, setValue] = useState("home");
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const t = (type ?? "default") as BottomNavigationType;
  // Each tab is a root: its label is the large title, which folds as the list scrolls. Tapping the current tab again
  // scrolls back to the top, so the large title opens again.
  const screenRef = useRef<HTMLDivElement>(null);
  const tabLabel = bottomNavItems.find((i) => i.id === value)?.label;
  const pickTab = (id: string) => { if (id === value) screenRef.current?.scrollTo({ top: 0, behavior: "smooth" }); setValue(id); };
  return (
    <Panel title="Bottom Navigation / Mobile"
      controls={<>
        <PlaygroundFilterChip label="Type" value={type} onChange={(v) => { setType(String(v) || undefined); setSelection(v === "floating-glass" ? "subtle" : "surface"); }} options={[option("default", "Default"), option("floating", "Floating"), option("floating-glass", "Floating Glass")]} />
        <PlaygroundFilterChip label="Theme" value={theme} onChange={(v) => setTheme(String(v) || undefined)} options={[option("neutral", "Neutral"), option("accent", "Accent")]} />
        {t !== "default" ? <PlaygroundFilterChip label="Selected" value={selection} onChange={(v) => setSelection(String(v) || undefined)} options={[option("subtle", "Subtle"), option("surface", "Surface"), option("solid", "Solid")]} /> : null}
        <PlaygroundToggle label="Labels" selected={labels} onChange={setLabels} />
        <PlaygroundToggle label="Action" selected={action} onChange={setAction} />
      </>}
      code={`import { BottomNavigation } from "@zen-ds/react";

<BottomNavigation${t !== "default" ? `\n  type="${t}"` : ""}${theme === "accent" ? `\n  theme="accent"` : ""}${t !== "default" && selection !== (t === "floating-glass" ? "subtle" : "surface") ? `\n  selection="${selection}"` : ""}${labels ? "\n  showLabels" : ""}
  items={[
    { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
    { id: "search", label: "Search", icon: "icon-search-medium-line" },
    { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", dot: true },
    { id: "profile", label: "Profile", icon: "icon-user-circle-line" },
  ]}
  value={tab}
  onValueChange={(id) => { if (id === tab) scrollToTop(); setTab(id); }}${action ? `\n  action={{ icon: "icon-plus-line", label: "New post", onClick: compose }}` : ""}
/>`}>
      <PlatformPhone headerOverlay screenRef={screenRef} header={<TopNavigation title={tabLabel} largeTitle={tabLabel} scrollRef={screenRef} />}
        footer={<BottomNavigation type={t} theme={(theme ?? "neutral") as BottomNavigationTheme} selection={(selection ?? "surface") as BottomNavigationSelection} showLabels={labels} items={bottomNavItems} value={value} onValueChange={pickTab} action={action ? { icon: "icon-plus-line", label: "New post", onClick: () => setSheet(true) } : undefined} />}>
        <ScreenList />
        <BottomSheet inline open={sheet} onOpenChange={setSheet} type="action" title="Create" items={[{ id: "post", label: "Post", icon: "icon-edit-02-line" }, { id: "photo", label: "Photo", icon: "icon-camera-line" }, { id: "event", label: "Event", icon: "icon-calendar-line" }]} onSelect={(item) => setDraft(String(item.label))} />
      </PlatformPhone>
      {draft ? <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{`${draft} draft started.`}</p> : null}
    </Panel>
  );
}

export function BottomSheetPlayground() {
  const [type, setType] = useState<string | undefined>("modal");
  const [size, setSize] = useState<string | undefined>("flex");
  const [search, setSearch] = useState(false);
  const [vertical, setVertical] = useState(false);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<ProjectSort>("recent");
  // The sheet's Search narrows its options; closing the sheet clears it.
  const [query, setQuery] = useState("");
  const openChange = (next: boolean) => { setOpen(next); if (!next) setQuery(""); };
  const t = (type ?? "modal") as BottomSheetType;
  // The backdrop is the Projects root: its large title folds as the list scrolls under it.
  const screenRef = useRef<HTMLDivElement>(null);
  return (
    <Panel title="Bottom Sheet"
      controls={<>
        <PlaygroundFilterChip label="Type" value={type} onChange={(v) => { setType(String(v) || undefined); openChange(false); }} options={[option("modal", "Modal"), option("action", "Action")]} />
        <PlaygroundFilterChip label="Size" value={size} onChange={(v) => setSize(String(v) || undefined)} options={[option("flex", "Flex"), option("max", "Max-Fixed")]} />
        <PlaygroundToggle label="Search" selected={search} onChange={setSearch} />
        {t === "modal" ? <PlaygroundToggle label="Vertical actions" selected={vertical} onChange={setVertical} /> : null}
      </>}
      code={`import { BottomSheet } from "@zen-ds/react";

<BottomSheet
  open={open}
  onOpenChange={setOpen}${t === "action" ? `\n  type="action"` : ""}${size === "max" ? `\n  size="max"` : ""}
  title="${t === "action" ? "Sort by" : "New project"}"${search ? `\n  search={<Search placeholder="Search" />}` : ""}${t === "action" ? `
  items={[
    { id: "recent", label: "Most recent", icon: "icon-clock-line" },
    { id: "name", label: "Name", icon: "icon-type-01-line" },
    { id: "pages", label: "Most pages", icon: "icon-layers-three-01-line" },
  ]}
  selectedId={sort}
  onSelect={(item) => setSort(item.id)}
/>` : `${vertical ? `\n  actionsDirection="vertical"` : ""}
  primaryAction={{ label: "Create", onClick: create }}
  secondaryAction={{ label: "Cancel" }}
>
  {/* Contents slot: your own content */}
</BottomSheet>`}`}>
      <PlatformPhone headerOverlay screenRef={screenRef} header={<TopNavigation title="Projects" largeTitle="Projects" scrollRef={screenRef} topBar={false} />}>
        <div style={{ padding: "var(--zen-spacing-padding-xsmall, 8px) var(--zen-spacing-padding-large, 20px)" }}><Button appearance="main" level="primary" size="lg" onClick={() => setOpen(true)}>{t === "action" ? "Sort projects" : "New project"}</Button></div>
        <ScreenList sort={sort} />
        <BottomSheet inline open={open} onOpenChange={openChange} type={t} size={(size ?? "flex") as BottomSheetSize} title={t === "action" ? "Sort by" : "New project"}
          search={search ? <Search placeholder="Search" value={query} onValueChange={setQuery} /> : undefined} actionsDirection={vertical ? "vertical" : "horizontal"}
          items={sortItems.filter((item) => String(item.label).toLowerCase().includes(query.trim().toLowerCase()))}
          selectedId={sort} onSelect={(item) => setSort(item.id as ProjectSort)}
          primaryAction={{ label: "Create", onClick: () => openChange(false) }} secondaryAction={{ label: "Cancel" }}>
          <PlaygroundSlot name="Contents slot" />
        </BottomSheet>
      </PlatformPhone>
    </Panel>
  );
}

type Msg = { id: number; side: "you" | "others"; text: string; replyTo?: ChatReplyTarget };

export function ChatPlayground() {
  const [domain, setDomain] = useState<string | undefined>("social");
  const [device, setDevice] = useState<string | undefined>("mobile");
  const [names, setNames] = useState(false);
  const demo = useChatDemo();
  const [messages, setMessages] = useState<Msg[]>([
    { id: 11, side: "others", text: "Hey! Are you around this afternoon?" },
    { id: 12, side: "you", text: "Yes, free after 2." },
    { id: 13, side: "others", text: "Great, I want to walk you through the new brand files." },
    { id: 14, side: "others", text: "Colours, type and the logo lockups are all updated." },
    { id: 15, side: "you", text: "Nice. Did the icon set change too?" },
    { id: 16, side: "others", text: "Only the stroke weight, 1.5 → 1.75." },
    { id: 17, side: "you", text: "Makes sense for the smaller sizes." },
    { id: 1, side: "others", text: "Did you get the brand files?" },
    { id: 2, side: "others", text: "The PDF is the latest one." },
    { id: 3, side: "you", text: "Yes! Reviewing now, looks great." },
  ]);
  const d = (domain ?? "social") as ChatDomain;
  const thread = (
    <ChatThread device={(device ?? "mobile") as "mobile" | "desktop"}>
      <ChatDateDivider>Today</ChatDateDivider>
      {messages.filter((m) => !demo.isDeleted(`pg-${m.id}`)).map((m, i, messages) => {
        // A run from one person shows the avatar once, on its last message (Figma Avatar-Container is bottom-aligned).
        const continued = m.side === "others" && messages[i + 1]?.side === "others";
        const firstOfRun = i === 0 || messages[i - 1].side !== m.side;
        const lastYou = m.side === "you" && !messages.slice(i + 1).some((n) => n.side === "you");
        return <ChatMessage key={m.id} side={m.side} domain={d} author={m.side === "others" ? mobilePeople.ava : undefined} showName={names && firstOfRun} continued={continued}
          time={d === "business" || lastYou ? "20:32" : undefined} status={lastYou ? "Seen" : undefined}
          {...demo.act(`pg-${m.id}`, m.side, { text: m.text, author: mobilePeople.ava.name, reactions: m.id === 3 ? [{ kind: "heart", by: [mobilePeople.ava] }] : undefined })} replyTo={m.replyTo}>{m.text}</ChatMessage>;
      })}
      {demo.isDeleted("pg-file") ? null : <ChatMessage {...demo.act("pg-file", "others", { kind: "file", author: mobilePeople.ava.name, reply: { fileName: "ZenDS-brand.pdf", fileKind: "pdf" } })} side="others" domain={d} author={mobilePeople.ava} time={d === "business" ? "20:33" : undefined}><ChatFile kind="pdf" name="ZenDS-brand.pdf" size="13,6 MB" onOpen={demo.openFile("ZenDS-brand.pdf")} /></ChatMessage>}
    </ChatThread>
  );
  const send = (text: string) => { const replyTo = demo.takeReply(); setMessages((all) => [...all, { id: Date.now(), side: "you", text, replyTo }]); };
  const composer = <ChatComposer device={(device ?? "mobile") as "mobile" | "desktop"} actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => send("👍") }} {...demo.composerReply} onSend={send} />;
  return (
    <Panel title="Chat / Conversation"
      controls={<>
        <PlaygroundFilterChip label="Domain" value={domain} onChange={(v) => setDomain(String(v) || undefined)} options={[option("social", "Social"), option("business", "Business")]} />
        <PlaygroundFilterChip label="Device" value={device} onChange={(v) => setDevice(String(v) || undefined)} options={[option("mobile", "Mobile"), option("desktop", "Desktop")]} />
        <PlaygroundToggle label="Names" selected={names} onChange={setNames} />
      </>}
      code={`import { ChatComposer, ChatMessage, ChatThread } from "@zen-ds/react";

<ChatThread${device === "desktop" ? ` device="desktop"` : ""}>
  <ChatMessage side="others" author={{ name: "Ava Chen", src: ava }}${d === "business" ? ` domain="business" time="20:30"` : ""}${names ? " showName" : ""}>
    Did you get the brand files?
  </ChatMessage>
  <ChatMessage side="you"${d === "business" ? ` domain="business"` : ""} time="20:32" status="Seen"
    reactions={reaction ? [{ kind: reaction }] : undefined} reaction={reaction} onReact={setReaction}
    holdActions={chatHoldActions.you} onHoldAction={handleAction}>
    Yes! Reviewing now, looks great.
  </ChatMessage>
</ChatThread>
<ChatComposer${device === "desktop" ? ` device="desktop"` : ""} onSend={send} />`}>
      <div className="pe-stack pe-chat-demo">
        {device === "desktop"
          // Desktop = the desktop examples' window: ThreadHeader (Button/Icon-Flat actions) over the thread, desktop Chat-Control.
          ? <div className="pe-chat-desktop pe-chat-desktop--single" data-domain={d}><section className="pe-chat-desktop__main" aria-label="Chat with Ava Chen"><ThreadHeader person={mobilePeople.ava} status="Active 2h ago" actions={headerActions} onAction={(label) => demo.say(`${label} · Ava Chen…`)} />{thread}{composer}</section></div>
          : <PlatformPhone canvas={d === "business" ? "canvas" : "default"} header={<PlatformChatHeader title="Ava Chen" subtitle="Active 2h ago" person={mobilePeople.ava} onAction={demo.headerAction} />} footer={composer}>{thread}</PlatformPhone>}
        {/* Desktop has no hold: the same actions sit in the Hover toolbar (right-click opens its More menu). */}
        <ChatDemoNote note={demo.note} />
      </div>
    </Panel>
  );
}

type AiTurn = { id: number; side: "you" | "ai"; text: string };

export function AiChatPlayground() {
  const [style, setStyle] = useState<string | undefined>("default");
  const [empty, setEmpty] = useState(false);
  const [turns, setTurns] = useState<AiTurn[]>([
    { id: 1, side: "you", text: "Summarise the Q3 report in three bullets." },
    { id: 2, side: "ai", text: "• Revenue grew 12% quarter on quarter.\n• Churn fell to 2.1%, the lowest this year.\n• Two enterprise deals closed in September." },
  ]);
  const [busy, setBusy] = useState(false);
  // Every bubble action works: Copy confirms in place, Edit puts the prompt back in the field, the thumbs toggle and
  // Regenerate writes another answer.
  const [copied, setCopied] = useState<number | null>(null);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [draft, setDraft] = useState({ key: 0, text: "" });
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (copied === null) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  useEffect(() => { if (draft.key) stageRef.current?.querySelector("textarea")?.focus(); }, [draft.key]);
  const s = (style ?? "default") as AiChatFieldStyle;
  const answer = (text: string) => {
    setBusy(true); setVote(null);
    window.setTimeout(() => { setTurns((all) => [...all, { id: Date.now() + 1, side: "ai", text }]); setBusy(false); }, 900);
  };
  const send = (text: string) => {
    setTurns((all) => [...all, { id: Date.now(), side: "you", text }]);
    answer("Here is a first draft. Tell me what to change.");
    setEmpty(false);
  };
  const regenerate = () => { setTurns((all) => all.slice(0, -1)); answer("Here's another take: shorter, with the numbers first."); };
  const copy = (turn: AiTurn) => { void navigator.clipboard?.writeText(turn.text).catch(() => undefined); setCopied(turn.id); };
  const copyAction = (turn: AiTurn) => ({ icon: copied === turn.id ? "icon-check-line" as const : "icon-copy-line" as const, label: copied === turn.id ? "Copied" : "Copy", onClick: () => copy(turn) });
  const field = <AiChatField key={draft.key} defaultValue={draft.text} fieldStyle={s} model="AI Model V 1.0" busy={busy} onStop={() => setBusy(false)} onSubmit={send} />;
  return (
    <Panel title="AI Chat"
      controls={<>
        <PlaygroundFilterChip label="Field style" value={style} onChange={(v) => setStyle(String(v) || undefined)} options={[option("default", "Default"), option("surface", "Surface"), option("liquid-glass", "Liquid Glass")]} />
        <PlaygroundToggle label="Empty (block)" selected={empty} onChange={setEmpty} />
      </>}
      code={`import { AiChatBubble, AiChatField, AiChatThread } from "@zen-ds/react";

<AiChatThread>
  <AiChatBubble side="you" actions={[{ icon: "icon-copy-line", label: "Copy", onClick: copyPrompt }, { icon: "icon-edit-02-line", label: "Edit", onClick: editPrompt }]}>
    Summarise the Q3 report in three bullets.
  </AiChatBubble>
  <AiChatBubble side="ai" actions={[
    { icon: vote === "up" ? "icon-thumbs-up-solid" : "icon-thumbs-up-line", label: "Good response", pressed: vote === "up", onClick: toggleUp },
    { icon: vote === "down" ? "icon-thumbs-down-solid" : "icon-thumbs-down-line", label: "Bad response", pressed: vote === "down", onClick: toggleDown },
    { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate },
    { icon: copied ? "icon-check-line" : "icon-copy-line", label: copied ? "Copied" : "Copy", onClick: copyAnswer },
  ]}>…</AiChatBubble>
</AiChatThread>
<AiChatField${s !== "default" ? ` fieldStyle="${s}"` : ""} model="AI Model V 1.0" busy={streaming} onStop={stop} onSubmit={ask} />`}>
      <div ref={stageRef} className="platform-ai-stage" data-style={s}>
        {empty ? (
          <AiChatBlock suggestions={[{ label: "Help me write", icon: "icon-pencil-line", onClick: () => send("Help me write a launch announcement") }, { label: "Learn about", icon: "icon-book-open-line", onClick: () => send("Teach me how design tokens work") }, { label: "Analyze image", icon: "icon-image-line", onClick: () => send("What stands out in this chart?") }, { label: "Summarize text", icon: "icon-align-left-line", onClick: () => send("Summarize this document in three bullets") }]}>{field}</AiChatBlock>
        ) : (
          <AiChatThread>
            {turns.map((turn, index) => (
              <AiChatBubble key={turn.id} side={turn.side}
                actions={turn.side === "you" ? [copyAction(turn), { icon: "icon-edit-02-line", label: "Edit", onClick: () => setDraft((d) => ({ key: d.key + 1, text: turn.text })) }] : index === turns.length - 1 && !busy ? [
                  { icon: vote === "up" ? "icon-thumbs-up-solid" : "icon-thumbs-up-line", label: "Good response", pressed: vote === "up", onClick: () => setVote(vote === "up" ? null : "up") },
                  { icon: vote === "down" ? "icon-thumbs-down-solid" : "icon-thumbs-down-line", label: "Bad response", pressed: vote === "down", onClick: () => setVote(vote === "down" ? null : "down") },
                  { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate },
                  copyAction(turn),
                ] : undefined}>
                {turn.text}
              </AiChatBubble>
            ))}
            {busy ? <AiChatBubble side="ai" thinking /> : null}
            {field}
          </AiChatThread>
        )}
      </div>
    </Panel>
  );
}

const quarters = { Quarterly: [["Q1", 9200], ["Q2", 14800], ["Q3", 12600], ["Q4", 23400]], Monthly: [["Jul", 4100], ["Aug", 5200], ["Sep", 3900], ["Oct", 6100], ["Nov", 7400], ["Dec", 9900]], Weekly: [["W1", 1200], ["W2", 1900], ["W3", 1500], ["W4", 2300]] } as const;
const budget = [
  { label: "Q1", values: { dev: 8, research: 3, marketing: 4, finance: 2, hr: 1 } },
  { label: "Q2", values: { dev: 9, research: 4, marketing: 5, finance: 2, hr: 1 } },
  { label: "Q3", values: { dev: 7, research: 3, marketing: 4, finance: 3, hr: 1 } },
  { label: "Q4", values: { dev: 10, research: 3, marketing: 3, finance: 3, hr: 2 } },
];

export function ChartPlayground() {
  const [kind, setKind] = useState<string | undefined>("line");
  const [inCard, setInCard] = useState(true);
  const [range, setRange] = useState<keyof typeof quarters>("Quarterly");
  const [report, setReport] = useState(false);
  const money = (v: number) => (v === 0 ? "0" : `$${Math.round(v / 100) / 10}K`);
  const usd = (v: number) => `$${v.toLocaleString("en-US")}`;
  // The chevron opens the numbers behind the chart: yearly totals per department (stack) or the points of the range (line).
  const reportRows: Array<[string, string]> = kind === "stack"
    ? budgetSeries.map((s) => [s.label, usd(budget.reduce((sum, b) => sum + b.values[s.id as keyof typeof b.values], 0) * 1000)])
    : quarters[range].map(([label, value]) => [label, usd(value)]);
  const reportTotal = kind === "stack"
    ? budget.reduce((sum, b) => sum + Object.values(b.values).reduce((all, v) => all + v, 0), 0) * 1000
    : quarters[range].reduce((sum, [, value]) => sum + value, 0);
  // Only the line chart follows a range; the budget stack is always by quarter, so it shows no range switch.
  const ranges = kind === "line" ? Object.keys(quarters).map((id) => ({ id, label: id })) : undefined;
  const chart = kind === "stack"
    ? <StackBarChart aria-label="Budget allocation by quarter" data={budget.map((b) => ({ ...b, values: Object.fromEntries(Object.entries(b.values).map(([k, v]) => [k, v * 1000])) }))} series={budgetSeries} format={money} />
    : <LineChart aria-label={`Expense trends, ${range.toLowerCase()}`} data={quarters[range].map(([label, value]) => ({ label, value }))} format={money} />;
  return (
    <Panel title="Chart"
      controls={<>
        <PlaygroundFilterChip label="Chart" value={kind} onChange={(v) => setKind(String(v) || undefined)} options={[option("line", "Line"), option("stack", "Stack bar")]} />
        <PlaygroundToggle label="In Chart Card" selected={inCard} onChange={setInCard} />
      </>}
      code={`import { ChartCard, ${kind === "stack" ? "StackBarChart" : "LineChart"} } from "@zen-ds/react";

${inCard ? `<ChartCard
  title="${kind === "stack" ? "Budget Allocation" : "Expense Trends"}"
  onOpen={openReport}${kind === "stack" ? "" : `
  ranges={[{ id: "Quarterly", label: "Quarterly" }, { id: "Monthly", label: "Monthly" }, { id: "Weekly", label: "Weekly" }]}
  range={range}
  onRangeChange={setRange}`}
>
  ` : ""}${kind === "stack" ? `<StackBarChart aria-label="Budget allocation by quarter" data={quarters} series={departments} format={money} />` : `<LineChart aria-label="Expense trends" data={points} format={money} />`}${inCard ? "\n</ChartCard>" : ""}`}>
      <div className="platform-chart-preview">
        {inCard ? (
          <ChartCard title={kind === "stack" ? "Budget Allocation" : "Expense Trends"} onOpen={() => setReport(true)} ranges={ranges} range={range} onRangeChange={(id) => setRange(id as keyof typeof quarters)}>
            {chart}
          </ChartCard>
        ) : (
          <div className="platform-chart-preview__bare"><span className={typographyStyles["Heading/Subheading"]}>{kind === "stack" ? "Budget Allocation" : "Expense Trends"}</span>{ranges ? <Segmented options={ranges} value={range} onChange={(id) => setRange(id as keyof typeof quarters)} aria-label="Range" /> : null}{chart}</div>
        )}
        <ChartReportPanel open={report} onOpenChange={setReport} title={kind === "stack" ? "Budget allocation report" : "Expense trends report"}
          description={kind === "stack" ? "This year's budget by department." : `${range} expenses.`} head={kind === "stack" ? ["Department", "Year total"] : ["Period", "Expenses"]} rows={reportRows} total={["Total", usd(reportTotal)]} />
      </div>
    </Panel>
  );
}
