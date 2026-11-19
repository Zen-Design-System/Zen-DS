import { useRef, useState } from "react";
import {
  AppShell, AppShellHeader, AppShellPane, Avatar, Badge, BadgeCounter, Box, Button, ChatComposer, ChatDateDivider, ChatMessage, ChatThread,
  DescriptionList, Divider, Icon, IconButton, List, ListItem, Menu, PageHeader, Search, Segmented, SidePanel, Sidebar, SidebarMenuItem, Stack, Text,
  Thumbnail, chatHoldActionsFor, chatReactionGlyph, useToast, useZen,
  type AvatarTheme, type ChatPerson, type ChatReactionKind, type ChatReplyTarget, type ChatSide, type SidebarSection,
} from "@zen-ds/react";
import { me, studio } from "../../data";

type Message = { id: string; kind: "time"; label: string } | { id: string; kind: "message"; side: "you" | "others"; text: string; replyTo?: ChatReplyTarget };
type Conversation = {
  id: string; name: string; theme: AvatarTheme; subject: string; preview: string; time: string; unread?: boolean; mine?: boolean;
  email: string; city: string; plan: string; vip?: boolean; since: string; value: string; lastOrder: string;
  tickets: { id: string; title: string; caption: string }[]; thread: Message[];
};
const say = (id: string, side: "you" | "others", text: string): Message => ({ id, kind: "message", side, text });
const stamp = (id: string, label: string): Message => ({ id, kind: "time", label });
/* Figma B2's queue, newest first. Lia's conversation is the one open in Figma; the others open on their last message. */
const conversations: Conversation[] = [
  {
    id: "lia", name: "Lia Campbell", theme: "violet", subject: "Refund still pending", preview: "Refund for order #10428 still pending", time: "2m", mine: true,
    email: "lia@northwind.io", city: "Lisbon", plan: "Pro plan", vip: true, since: "Mar 2022", value: "$2,480", lastOrder: "#10428 · Sep 30",
    tickets: [{ id: "t1", title: "Wrong size delivered", caption: "Resolved · Aug 12" }, { id: "t2", title: "Change delivery address", caption: "Resolved · Jun 03" }],
    thread: [
      stamp("s1", "Today 09:12"),
      say("m1", "others", "Hi, I returned the sneakers last week but the refund has not arrived yet."),
      say("m2", "others", "Order #10428, paid with Visa ending 42."),
      stamp("s2", "10:05"),
      say("m3", "you", "Hi Lia, thanks for the order number. I can see the return reached our warehouse on Monday."),
      say("m4", "you", "The refund was approved today; it shows on your card within 3–5 business days."),
      stamp("s3", "10:21"),
      say("m5", "others", "Great, thank you for checking!"),
    ],
  },
  {
    id: "john", name: "John McLeod", theme: "blue", subject: "Move the kickoff", preview: "Can we move the kickoff to Thursday?", time: "14m", unread: true,
    email: "john@mcleod.studio", city: "Glasgow", plan: "Team plan", since: "Jan 2024", value: "$1,120", lastOrder: "#10391 · Sep 18",
    tickets: [], thread: [stamp("s1", "Today 10:09"), say("m1", "others", "Can we move the kickoff to Thursday?")],
  },
  {
    id: "paul", name: "Paul Rivera", theme: "green", subject: "Export fixed", preview: "Thanks! The export works now.", time: "1h", mine: true,
    email: "paul@riveracoffee.co", city: "Austin", plan: "Pro plan", since: "Jul 2023", value: "$860", lastOrder: "#10322 · Sep 02",
    tickets: [], thread: [stamp("s1", "Today 09:23"), say("m1", "others", "Thanks! The export works now.")],
  },
  {
    id: "sarah", name: "Sarah Kim", theme: "orange", subject: "Invoice address", preview: "Invoice address needs an update", time: "3h",
    email: "sarah@kimstudio.kr", city: "Seoul", plan: "Starter plan", since: "May 2025", value: "$310", lastOrder: "#10377 · Sep 14",
    tickets: [], thread: [stamp("s1", "Today 07:23"), say("m1", "others", "Invoice address needs an update")],
  },
  {
    id: "aiden", name: "Aiden Nguyen", theme: "cyan", subject: "Two seats added", preview: "Two seats added to the Team plan", time: "Yesterday", unread: true,
    email: "aiden@lumen.vn", city: "Hanoi", plan: "Team plan", since: "Nov 2023", value: "$1,940", lastOrder: "#10402 · Sep 22",
    tickets: [], thread: [stamp("s1", "Yesterday 16:40"), say("m1", "others", "Two seats added to the Team plan")],
  },
  {
    id: "maya", name: "Maya Thompson", theme: "pink", subject: "Login link expired", preview: "Login link expired again", time: "Mon", mine: true,
    email: "maya@thompsonlaw.ca", city: "Toronto", plan: "Pro plan", since: "Feb 2022", value: "$2,050", lastOrder: "#10355 · Sep 08",
    tickets: [], thread: [stamp("s1", "Mon 11:05"), say("m1", "others", "Login link expired again")],
  },
  {
    id: "ethan", name: "Ethan Kim", theme: "teal", subject: "Dark mode on mobile", preview: "Feature request: dark mode on mobile", time: "Sun",
    email: "ethan@kimrun.app", city: "Busan", plan: "Starter plan", since: "Aug 2025", value: "$140", lastOrder: "#10360 · Sep 10",
    tickets: [], thread: [stamp("s1", "Sun 18:30"), say("m1", "others", "Feature request: dark mode on mobile")],
  },
];
const inboxSections: SidebarSection[] = [{ items: [
  { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line" },
  { id: "chats", label: "Chats", icon: "icon-message-chat-circle-line" },
  { id: "customers", label: "Customers", icon: "icon-user-circle-line" },
  { id: "reports", label: "Reports", icon: "icon-bar-chart-up-line" },
  { id: "files", label: "Files", icon: "icon-folder-line" },
  { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
] }];
const inboxViews = [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "mine", label: "Mine" }];
const initialsOf = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
/** What the hold actions without a screen of their own report. */
const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };

/** A support inbox: the rail, the queue, the open conversation and the customer's facts (Figma ◇ Master-Layout B2). */
// startOpen: the customer's facts start open where the shell docks them, while the page keeps a Tablet width (744)
// beside the rail (80) and the panel (360): from 1184 wide. Narrower they would open as a Modal over the page, so pass
// false. Without it they follow the breakpoint.
export default function SupportInboxApp({ startOpen }: { startOpen?: boolean }) {
  const { toast, dismiss } = useToast();
  const desktop = useZen()?.breakpoint === "desktop";
  const [openId, setOpenId] = useState("lia");
  const [view, setView] = useState("all");
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<Record<string, Message[]>>(() => Object.fromEntries(conversations.map((item) => [item.id, item.thread])));
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  // Until someone shows or hides the customer's facts, they follow startOpen; in a narrower window they open on
  // demand (as a modal).
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const panelOpen = panelChoice ?? startOpen ?? desktop;
  // Every message can be held, hovered, replied to and reacted to; what an action did shows as a toast.
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  // A deleted message takes its focus with it: focus goes to the conversation's title.
  const titleRef = useRef<HTMLSpanElement>(null);
  const q = query.trim().toLowerCase();
  const shown = conversations.filter((item) => (view === "unread" ? item.unread : view === "mine" ? item.mine : true)
    && (!q || `${item.name} ${item.preview}`.toLowerCase().includes(q)));
  const open = conversations.find((item) => item.id === openId) ?? conversations[0];
  const thread = threads[open.id] ?? [];
  const author: ChatPerson = { name: open.name, theme: open.theme };
  const done = Boolean(resolved[open.id]);
  const first = open.name.split(" ")[0];
  const note = (title: string) => toast({ title });
  const resolve = (next: boolean) => {
    setResolved((all) => ({ ...all, [open.id]: next }));
    if (next) toast({ title: `${first}’s conversation resolved`, action: { label: "Undo", onClick: () => setResolved((all) => ({ ...all, [open.id]: false })) } });
  };
  // Delete: the message goes at once and a toast offers Undo.
  const remove = (id: string) => {
    setDeleted((all) => (all.includes(id) ? all : [...all, id]));
    setReplyTo((target) => (target?.id === id ? undefined : target));
    setTimeout(() => titleRef.current?.focus());
    const toastId = toast({
      title: "Message deleted",
      action: { label: "Undo", onClick: () => { setDeleted((all) => all.filter((entry) => entry !== id)); dismiss(toastId); note("Message restored"); setTimeout(() => titleRef.current?.focus()); } },
    });
  };
  /** Hold (or hover) actions and reactions for one message, spread onto its ChatMessage. */
  const actions = (id: string, side: ChatSide, text: string) => {
    const who = side === "you" ? "You" : first;
    const mine = picked[id];
    return {
      id,
      holdActions: chatHoldActionsFor("text", side),
      onHoldAction: (action: string) => {
        if (action === "delete") { remove(id); return; }
        if (action === "copy") { navigator.clipboard?.writeText(text).catch(() => undefined); note(`Copied “${text.slice(0, 40)}”`); return; }
        if (action === "reply") { setReplyTo({ id, author: who, fromYou: side === "you", kind: "text", text }); note(`Replying to ${side === "you" ? "yourself" : who} — type in the composer`); return; }
        if (action === "call-back") { note(`Calling ${side === "you" ? "back" : who}…`); return; }
        note(`${actionNote[action] ?? action} · ${side === "you" ? "your message" : `${who}'s message`}`);
      },
      reaction: mine,
      onReact: (next: ChatReactionKind | undefined) => { setPicked((all) => ({ ...all, [id]: next })); note(next ? `Reacted ${chatReactionGlyph(next)}` : "Reaction removed"); },
      reactions: mine ? [{ kind: mine }] : undefined,
    };
  };
  const send = (text: string) => {
    const target = replyTo;
    setReplyTo(undefined);
    setThreads((all) => ({ ...all, [open.id]: [...(all[open.id] ?? []), { ...say(`sent-${Date.now()}`, "you", text), replyTo: target }] }));
  };
  const visible = thread.filter((item) => item.kind === "time" || !deleted.includes(`${open.id}-${item.id}`));
  const lastYou = [...visible].reverse().find((item) => item.kind === "message" && item.side === "you");
  const pageHeader = (
    <PageHeader title={<span ref={titleRef} tabIndex={-1}>{open.subject}</span>} meta={done ? <Badge theme="green" background="subtle">Resolved</Badge> : undefined}
      actions={<>
        <Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => toast({ title: `Assigned to ${me.name}`, children: open.subject })}>Assign</Button>
        {done
          ? <Button level="tertiary" onClick={() => resolve(false)}>Reopen</Button>
          : <Button level="primary" startIcon="icon-check-line" onClick={() => resolve(true)}>Resolve</Button>}
      </>}
      trailing={(
        <Menu align="end" trigger={<IconButton level="tertiary" icon="icon-dots-vertical-line" aria-label="Conversation actions" />} items={[
          { id: "details", label: panelOpen ? "Hide customer details" : "Show customer details", icon: "icon-user-circle-line", onSelect: () => setPanelChoice(!panelOpen) },
          { id: "snooze", label: "Snooze until tomorrow", icon: "icon-clock-line", onSelect: () => toast({ title: "Snoozed until tomorrow, 9:00" }) },
          { id: "unread", label: "Mark as unread", icon: "icon-mail-01-line", onSelect: () => toast({ title: "Marked as unread" }) },
          { id: "spam", label: "Mark as spam", icon: "icon-slash-circle-01-line", onSelect: () => toast({ title: "Moved to spam" }) },
        ]} />
      )} />
  );
  return (
    // List-Detail on Canvas/Default: the Sidebar sits on its rail with the toggle in its own header (Collapse=Sidebar),
    // the queue is the Leading-Pane (a flat white tile, never shadowed), the open conversation is the main column under
    // its header, and the customer's facts are the docked Side-Panel (Standard, Small 360).
    <AppShell pattern="list-detail" collapse="sidebar"
      sidebar={(
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">Northwind Support</Text></Stack>}
          logoCollapsed={<Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt="Northwind Support" />}
          sections={inboxSections} selectedId="inbox"
          onItemClick={(item) => { if (item.id !== "inbox") toast({ title: `${item.label} isn't part of this example`, children: "The Inbox shows the list-detail layout." }); }}
          footer={<SidebarMenuItem id="preferences" label="Preferences" icon="icon-settings-01-line" />} />
      )}
      leadingPane={(
        <AppShellPane theme="default" title={<>Inbox <BadgeCounter theme="neutral" background="solid" value={12} /></>}
          action={<IconButton level="tertiary" size="sm" icon="icon-edit-01-line" aria-label="New conversation" onClick={() => toast({ title: "New conversation", children: "Pick a customer or type an email address." })} />}>
          <Stack paddingX="xs" gap="sm">
            <Search theme="filter-icon" placeholder="Search conversations" aria-label="Search conversations" value={query} onValueChange={setQuery}
              filterActionLabel="Filter conversations" onFilterClick={() => toast({ title: "Filters", children: "Channel, status, tags and assignee." })} />
            <Segmented fullWidth aria-label="Conversations" options={inboxViews} value={view} onValueChange={setView} />
          </Stack>
          <List aria-label="Conversations">
            {shown.map((item) => (
              <ListItem key={item.id} selected={item.id === open.id} title={item.name} caption={item.preview}
                leading={<Avatar size="md" theme={item.theme} background="subtle" alt="">{initialsOf(item.name)}</Avatar>}
                trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{item.time}</Text>}
                onClick={() => setOpenId(item.id)} />
            ))}
          </List>
        </AppShellPane>
      )}
      header={(
        // Header/AppShell with its Main row only (Top-Header off): the conversation's title and actions, then a rule.
        <AppShellHeader main={pageHeader} sections={<Divider />} />
      )}
      sidePanel={(
        <SidePanel type="standard" size="small" open={panelOpen} onOpenChange={setPanelChoice} title={open.name} description={`${open.email} · ${open.city}`}
          headerContent={(
            <Stack direction="row" gap="2xs">
              {open.vip ? <Badge size="sm" theme="violet" background="solid" leadingIcon={false}>VIP</Badge> : null}
              <Badge size="sm" theme="neutral" background="solid" leadingIcon={false}>{open.plan}</Badge>
            </Stack>
          )}>
          <Stack gap="lg">
            <Stack gap="sm">
              <Text textStyle="All-Caps/S" tone="light">Details</Text>
              <DescriptionList layout="inline" divider items={[
                { term: "Customer since", description: open.since },
                { term: "Lifetime value", description: open.value },
                { term: "Last order", description: open.lastOrder },
              ]} />
            </Stack>
            <Stack gap="xs">
              <Text textStyle="All-Caps/S" tone="light">Recent tickets</Text>
              {open.tickets.length ? (
                <List aria-label="Recent tickets">
                  {open.tickets.map((ticket) => (
                    <ListItem key={ticket.id} title={ticket.title} caption={ticket.caption}
                      trailing={<Icon name="icon-chevron-right-line-medium" size="base" decorative />}
                      onClick={() => toast({ title: ticket.title, children: ticket.caption })} />
                  ))}
                </List>
              ) : <Text textStyle="Body/Small/Regular" tone="base">No earlier tickets.</Text>}
            </Stack>
          </Stack>
        </SidePanel>
      )}
    >
      {/* The thread from the top, the composer at the foot of the column. */}
      <Stack height="fill" gap="md" justify="between">
        <ChatThread device="desktop" aria-label={`Messages with ${open.name}`}>
          {visible.map((item, index) => {
            if (item.kind === "time") return <ChatDateDivider key={item.id}>{item.label}</ChatDateDivider>;
            const next = visible[index + 1];
            const sameRun = next?.kind === "message" && next.side === item.side;
            return (
              <ChatMessage key={item.id} {...actions(`${open.id}-${item.id}`, item.side, item.text)} side={item.side}
                author={item.side === "others" ? author : undefined} replyTo={item.replyTo}
                continued={item.side === "others" && sameRun} status={item === lastYou ? "Sent" : undefined}>
                {item.text}
              </ChatMessage>
            );
          })}
        </ChatThread>
        {/* Figma rounds this screen's Chat-Control into a pill (Corner-Radius/Rounded on the instance); a reply bar on top
            keeps the 2XLarge corners. */}
        <Box radius={replyTo ? "2xl" : "full"} clip>
          <ChatComposer device="desktop" label={`Reply to ${open.name}`} onSend={send}
            replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); note("Reply cancelled"); }}
            actions={[
              { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => note("Add attachment: files, location, contact") },
              { icon: "icon-microphone-line", label: "Record voice", onClick: () => note("Recording a voice message…") },
              { icon: "icon-image-line", label: "Send a photo", onClick: () => note("Choose a photo to send") },
            ]}
            onEmoji={() => note("Emoji picker")} />
        </Box>
      </Stack>
    </AppShell>
  );
}
