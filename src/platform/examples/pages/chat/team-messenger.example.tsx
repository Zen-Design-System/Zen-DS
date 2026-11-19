import { useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellHeader, AppShellPane, Avatar, AvatarStack, BadgeCounter, Box, ChatCall, ChatComposer, ChatConversationItem, ChatDateDivider,
  ChatEmojiPicker, ChatFile, ChatMessage, ChatPhotos, ChatThread, Divider, DockIcon, EmptyState, IconButton, Image, List, ListItem, PageHeader, Search,
  SidePanel, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, VisuallyHidden, chatHoldActionsFor, chatReactionGlyph, plural, useToast,
  type ChatCallState, type ChatConversationItemProps, type ChatFileKind, type ChatPerson, type ChatReaction, type ChatReactionKind,
  type ChatReplyTarget, type ChatSide, type SidebarSection,
} from "@zen-ds/react";
import {
  daysFromToday, formatRange, formatRelative, formatTime, initials, leaveRequests, people, photos, studio, TODAY, type Person, type Photo,
} from "../../data";

// ——— The conversation model ——————————————————————————————————————————————————————————————————————————————————————————
type Body =
  | { kind: "text"; text: string }
  | { kind: "photo"; photos: Photo[]; album: string }
  | { kind: "file"; name: string; file: ChatFileKind; size: string }
  /** `live`: still ringing (no answer yet). */
  | { kind: "call"; call: "audio" | "video"; state: ChatCallState; detail: string; live?: boolean };
type Msg = Body & {
  id: string;
  side: ChatSide;
  /** Others: who sent it (their avatar, and their name in groups). */
  from?: ChatPerson;
  /** Shown under your last message only. */
  time?: string;
  reactions?: ChatReaction[];
  replyTo?: ChatReplyTarget;
  delivery?: "sent";
};
type DateBreak = { kind: "divider"; id: string; label: string };
type Item = Msg | DateBreak;
type Detail = { id: string; title: string; caption: string; leading: ReactNode };
type Conv = {
  id: string;
  title: string;
  /** One-to-one: the other person. Groups set `group` (the two faces) and `members` instead. */
  person?: ChatPerson;
  group?: ChatPerson[];
  /** Groups: everyone in it, you first (the header's AvatarStack). */
  members?: ChatPerson[];
  status: string;
  online?: boolean;
  unread?: boolean;
  /** List row time, on the timestamp ladder. */
  time: string;
  /** Conversation details: the person's role and contact, or the members of a group. */
  details: Detail[];
  /** What Add attachment posts in this chat. */
  attach?: { name: string; file: ChatFileKind; size: string };
  items: Item[];
};

const { alex, chi, bao, duy, em, hana, minhAnh } = people;
const cp = (p: Person): ChatPerson => ({ name: p.name, src: p.photo, theme: p.theme });
const firstName = (name: string) => name.split(" ")[0];
/** "9:12 am" today · "Yesterday at 4:40 pm" · "Monday at 11:05 am" (dividers show the clock for today). */
const clock = (h: number, m: number) => formatTime(daysFromToday(0, h, m));
const when = (days: number, h: number, m: number) => formatRelative(daysFromToday(days, h, m));
const now = formatTime(TODAY);
/** Alex's approved annual leave (the shared leave requests). */
const myLeave = leaveRequests.find((request) => request.person === "alex")!;

const at = (id: string, label: string): DateBreak => ({ kind: "divider", id, label });
const says = (from: Person, id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "others", from: cp(from), ...extra }) as Msg;
const mine = (id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "you", ...extra }) as Msg;
/** A photo, file or call: from someone, or from you (null). */
const sends = (from: Person | null, id: string, body: Exclude<Body, { kind: "text" }>, extra: Partial<Msg> = {}): Msg =>
  ({ ...body, id, side: from ? "others" : "you", from: from ? cp(from) : undefined, ...extra }) as Msg;

const dock = (icon: "icon-briefcase-line" | "icon-marker-pin-01-line" | "icon-mail-01-line") => <DockIcon size="md" theme="neutral" background="subtle" icon={icon} />;
const face = (p: Person) => <Avatar size="md" theme={p.photo ? "photo" : p.theme} src={p.photo} alt="">{p.photo ? null : initials(p.name)}</Avatar>;
/** A chat person as Avatar props: their photo, or initials on their steady theme. */
const faceItem = (p: ChatPerson) => (p.src ? { theme: "photo" as const, src: p.src, alt: p.name } : { theme: p.theme ?? "neutral", alt: p.name, children: initials(p.name) });
const personDetails = (p: Person): Detail[] => [
  { id: "role", title: p.role, caption: `${p.team} team`, leading: dock("icon-briefcase-line") },
  { id: "place", title: p.location, caption: "Location", leading: dock("icon-marker-pin-01-line") },
  { id: "email", title: p.email, caption: "Email", leading: dock("icon-mail-01-line") },
];
const memberDetails = (members: Person[]): Detail[] =>
  [alex, ...members].map((p) => ({ id: p.id, title: p.id === alex.id ? `${p.name} (you)` : p.name, caption: p.role, leading: face(p) }));
const oneToOne = (p: Person, rest: Omit<Conv, "title" | "person" | "details" | "status" | "online"> & { status?: string }): Conv =>
  ({ title: p.name, person: cp(p), online: p.online, status: p.online ? "Active now" : "Active today", details: personDetails(p), ...rest });
const groupChat = (title: string, members: Person[], rest: Omit<Conv, "title" | "group" | "members" | "details" | "status">): Conv =>
  ({ title, group: members.slice(0, 2).map(cp), members: [alex, ...members].map(cp), status: plural(members.length + 1, "member"), details: memberDetails(members), ...rest });

/** The quote a reply shows, built from the message it answers. */
const quoteOf = (m: Msg): ChatReplyTarget => {
  const base = { id: m.id, author: m.side === "you" ? "You" : m.from?.name ?? "", fromYou: m.side === "you" };
  if (m.kind === "photo") return { ...base, kind: "photo", photo: m.photos[0], count: m.photos.length };
  if (m.kind === "file") return { ...base, kind: "file", fileName: m.name, fileKind: m.file };
  if (m.kind === "call") return { ...base, kind: "call", callType: m.call, missed: m.state.endsWith("missed") };
  return { ...base, kind: "text", text: m.text };
};

// ——— The studio's chats ——————————————————————————————————————————————————————————————————————————————————————————————
const chats: Conv[] = [
  oneToOne(chi, {
    id: "chi", unread: true, time: when(0, 10, 28), status: "Active 2 minutes ago",
    attach: { name: "Review notes.pdf", file: "pdf", size: "420 KB" },
    items: [
      at("chi-d1", clock(9, 12)),
      says(chi, "chi-1", "Morning! The points history screen is in Figma now."),
      says(chi, "chi-2", "Expired points sit under their own divider, with the date they expired."),
      mine("chi-3", "Nice. Does the empty state still say “No points yet”?", { time: clock(9, 20) }),
      at("chi-d2", clock(10, 28)),
      says(chi, "chi-4", "Yes, and it links to the points guide."),
      sends(chi, "chi-5", { kind: "file", name: "Points history v3.fig", file: "other", size: "18.4 MB" }),
      says(chi, "chi-6", "Can you look at it before the 2 pm review?"),
    ],
  }),
  groupChat("Loyalty app", [chi, bao, em, duy], {
    id: "loyalty", time: clock(9, 48), online: true,
    items: [
      at("loy-d1", when(-1, 16, 40)),
      says(duy, "loy-1", "Phin & Co moved the launch to Nov 2."),
      says(em, "loy-2", "Then the Android regression run starts on Monday."),
      mine("loy-3", "Thanks, I'll update the design plan.", { time: when(-1, 16, 52) }),
      at("loy-d2", clock(9, 48)),
      says(bao, "loy-4", "The rewards API is on staging 🎉", { reactions: [{ kind: "heart", by: [cp(chi), cp(duy)] }] }),
      says(bao, "loy-5", "Checkout shows the points balance now."),
    ],
  }),
  oneToOne(bao, {
    id: "bao", unread: true, time: when(0, 10, 17),
    items: [
      at("bao-d1", clock(10, 12)),
      says(bao, "bao-1", "Hey Alex, can you review PHIN-219 today?"),
      says(bao, "bao-2", "It connects the rewards API to checkout. Two screens changed."),
      sends(bao, "bao-3", { kind: "call", call: "audio", state: "in-missed", detail: clock(10, 17) }),
    ],
  }),
  oneToOne(hana, {
    id: "hana", time: clock(8, 52),
    items: [
      at("hana-d1", clock(8, 40)),
      says(hana, "hana-1", "Lumen Bank signed off on the statement of work. Here's v3 for the files."),
      sends(hana, "hana-2", { kind: "file", name: "Lumen Bank SOW v3.pdf", file: "pdf", size: "1.2 MB" }),
      mine("hana-3", "Great news. I'll brief the design team at standup.", { time: clock(8, 52) }),
    ],
  }),
  oneToOne(duy, {
    id: "duy", time: when(-1, 16, 40),
    items: [at("duy-d1", when(-1, 16, 40)), sends(duy, "duy-1", { kind: "call", call: "video", state: "in-missed", detail: formatTime(daysFromToday(-1, 16, 40)) })],
  }),
  oneToOne(minhAnh, {
    id: "minh-anh", time: when(-2, 11, 5),
    items: [
      at("ma-d1", when(-2, 10, 58)),
      says(minhAnh, "ma-1", `Your leave for ${formatRange(myLeave.from, myLeave.to)} is approved. Enjoy the break!`),
      sends(null, "ma-2", { kind: "call", call: "audio", state: "out-call", detail: "4 min" }, { time: formatTime(daysFromToday(-2, 11, 5)) }),
    ],
  }),
];

/** The studio's mark and name in the Sidebar's logo slot; the mark alone on the rail. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const studioMark = <Thumbnail src={studio.logo} alt={studio.name} size="2xs" />;
/** The studio app's places; Chats carries the unread count. */
const studioPlaces = (unread: number): SidebarSection[] => [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "chats", label: "Chats", icon: "icon-message-chat-circle-line", counter: unread || undefined },
  { id: "files", label: "Files", icon: "icon-file-doc-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];

const isMsg = (item: Item): item is Msg => item.kind !== "divider";
/** A run of messages from one person shows the avatar once (last message) and, in groups, the name once (first). */
const sameRun = (other: Item | undefined, item: Msg) => other !== undefined && isMsg(other) && other.side === item.side && other.from?.name === item.from?.name;
/** What the hover actions without a screen of their own report in the status line. */
const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };
const actionToast: Record<string, string> = { copy: "Message copied", forward: "Message forwarded", pin: "Message pinned", report: "Call reported" };

/** Unread messages: the run of the other side's messages at the end of the chat (0 once it is read). */
const unreadCount = (c: Conv) => {
  if (!c.unread) return 0;
  let count = 0;
  for (let i = c.items.length - 1; i >= 0; i -= 1) {
    const item = c.items[i];
    if (!isMsg(item)) continue;
    if (item.side === "you") break;
    count += 1;
  }
  return Math.max(count, 1);
};

/** A list row from the chat's last message: "You: …", "Bao: …" in groups, a call state, or a photo / file line. */
function rowOf(c: Conv, deleted: string[]): Omit<ChatConversationItemProps, "onClick" | "selected"> {
  const last = [...c.items].reverse().find((item): item is Msg => isMsg(item) && !deleted.includes(item.id));
  const who = !last ? "" : last.side === "you" ? "You" : c.group ? firstName(last.from?.name ?? "") : "";
  const lead = (text: string) => (who ? `${who}: ${text}` : text);
  const sender = last?.side === "you" ? "You" : firstName(last?.from?.name ?? "");
  const preview = !last ? "No messages yet"
    : last.kind === "text" ? lead(last.text)
    : last.kind === "photo" ? `${sender} sent ${last.photos.length === 1 ? "a photo" : plural(last.photos.length, "photo")}`
    : last.kind === "file" ? `${sender} sent ${last.name}` : undefined;
  const call: ChatConversationItemProps["call"] = last?.kind !== "call" ? undefined
    : last.side === "you" ? "outgoing"
    : last.state === "in-missed" ? (last.call === "audio" ? "missed-audio" : "missed-video") : "incoming";
  // The built-in preview reads Missed call · Audio call; a video call that went through says so.
  const callLabel = (call === "incoming" || call === "outgoing") && last?.kind === "call" && last.call === "video" ? "Video call" : undefined;
  return { person: c.person ?? { name: c.title }, group: c.group, preview, call, callLabel, time: c.time, unread: c.unread, online: c.online };
}

/**
 * The studio's messenger on desktop: an AppShell List-Detail, the Sidebar on its rail, the chats in the Leading-Pane and
 * the open chat beside them. Its thread has device="desktop" (text runs to 516px, each message gets the hover toolbar)
 * and the composer docks at the bottom of the window. Opening a chat marks it read, and Search narrows the list by name.
 */
export default function TeamMessenger() {
  const { toast, dismiss } = useToast();
  const [openId, setOpenId] = useState("chi");
  // The chat that is open is read.
  const [convs, setConvs] = useState(() => chats.map((c) => (c.id === "chi" ? { ...c, unread: false } : c)));
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  const [emoji, setEmoji] = useState(false);
  const [viewer, setViewer] = useState<{ msg: Msg & { kind: "photo" }; index: number } | null>(null);
  const [details, setDetails] = useState(false);
  // What the last action did, for screen readers.
  const [note, setNote] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // A deleted message had focus: focus moves to the chat's title.
  const titleRef = useRef<HTMLSpanElement>(null);
  // ChatComposer gives no ref to its emoji button: the composer remembers the control last focused in it (the button
  // that opened the emoji panel), and the panel hands focus back to it when it closes.
  const emojiPanelRef = useRef<HTMLElement>(null);
  const emojiOpenerRef = useRef<HTMLElement | null>(null);
  const conv = convs.find((c) => c.id === openId) ?? convs[0];
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the chat." });

  const edit = (convId: string, change: (items: Item[]) => Item[], extra: Partial<Conv> = {}) =>
    setConvs((all) => all.map((c) => (c.id === convId ? { ...c, ...extra, items: change(c.items) } : c)));
  const patch = (convId: string, msgId: string, next: Partial<Msg>) =>
    edit(convId, (items) => items.map((item) => (item.id === msgId ? ({ ...item, ...next } as Item) : item)));

  /** Opens a chat: it is read now. Leaving a chat drops its reply bar and emoji panel. */
  const open = (id: string) => {
    if (replyTo) { setReplyTo(undefined); setNote("Reply cancelled"); }
    setEmoji(false);
    setOpenId(id);
    setConvs((all) => all.map((c) => (c.id === id ? { ...c, unread: false } : c)));
  };
  /** You send something: it carries the reply you picked. */
  const send = (body: Body) => {
    const id = `${conv.id}-${Date.now()}`;
    edit(conv.id, (items) => [...items, { ...body, id, side: "you", replyTo, time: now, delivery: "sent" } as Msg], { time: "Just now", unread: false });
    setReplyTo(undefined);
    setEmoji(false);
  };
  /** Calling adds a ringing call card; nobody answers in this demo, so it becomes a missed call with Call again. */
  const call = (type: "audio" | "video") => {
    const { id: convId, title } = conv;
    const id = `${convId}-${Date.now()}`;
    edit(convId, (items) => [...items, { kind: "call", call: type, state: "out-call", detail: "Calling…", live: true, id, side: "you", time: now } as Msg], { time: "Just now" });
    setNote(`Calling ${title}…`);
    setTimeout(() => { patch(convId, id, { state: "out-missed", detail: "No answer", live: false } as Partial<Msg>); setNote(`${title} didn't answer`); }, 2600);
  };
  /** Delete can be undone, so it acts at once and the toast offers Undo. The message that had focus is gone: focus moves to the chat's title. */
  const remove = (id: string) => {
    setDeleted((all) => [...all, id]);
    setReplyTo((target) => (target?.id === id ? undefined : target));
    setNote("Message deleted");
    setTimeout(() => titleRef.current?.focus());
    const toastId = toast({
      title: "Message deleted",
      action: { label: "Undo", onClick: () => { setDeleted((all) => all.filter((other) => other !== id)); dismiss(toastId); setNote("Message restored"); setTimeout(() => titleRef.current?.focus()); } },
    });
  };
  /** Hover actions and reactions for one message, spread onto its ChatMessage. */
  const act = (m: Msg) => {
    const mineReaction = picked[m.id];
    const base = m.reactions ?? [];
    // Your reaction joins the ones already there (one more on the same kind).
    const reactions = !mineReaction ? base
      : base.some((r) => r.kind === mineReaction) ? base.map((r) => (r.kind === mineReaction ? { ...r, count: (r.count ?? r.by?.length ?? 1) + 1 } : r))
      : [...base, { kind: mineReaction }];
    const who = m.side === "you" ? "You" : m.from?.name ?? "them";
    return {
      id: m.id,
      holdActions: chatHoldActionsFor(m.kind, m.side),
      onHoldAction: (action: string) => {
        if (action === "delete") remove(m.id);
        else if (action === "call-back" && m.kind === "call") call(m.call);
        // Reply fills the composer's "Replying to" bar (the composer moves focus into its field).
        else if (action === "reply") { setReplyTo(quoteOf(m)); setNote(`Replying to ${m.side === "you" ? "yourself" : who} — type in the composer`); }
        else if (action === "copy" && m.kind === "text") { navigator.clipboard?.writeText(m.text).catch(() => undefined); setNote(`Copied “${m.text.slice(0, 40)}”`); }
        else setNote(`${actionNote[action] ?? action} · ${m.kind === "call" ? "call" : m.side === "you" ? "your message" : `${who}'s message`}`);
        if (actionToast[action]) toast({ title: actionToast[action] });
      },
      reaction: mineReaction,
      onReact: (next: ChatReactionKind | undefined) => { setPicked((all) => ({ ...all, [m.id]: next })); setNote(next ? `Reacted ${chatReactionGlyph(next)}` : "Reaction removed"); },
      reactions: reactions.length ? reactions : undefined,
    };
  };
  const bodyOf = (item: Msg) => {
    switch (item.kind) {
      case "text": return item.text;
      case "photo": return <ChatPhotos side={item.side} photos={item.photos} onOpen={(index) => { setViewer({ msg: item, index }); setNote(`Opened ${item.album}`); }} />;
      case "file": return <ChatFile side={item.side} kind={item.file} name={item.name} size={item.size} onOpen={() => toast({ title: "File downloaded", children: `${item.name} · ${item.size}` })} />;
      // The built-in action reads Call back or Call again; a call still ringing has none.
      case "call": return <ChatCall side={item.side} type={item.call} state={item.state} detail={item.detail} onAction={item.live ? undefined : () => call(item.call)} />;
    }
  };
  const closeEmoji = () => { setEmoji(false); setTimeout(() => emojiOpenerRef.current?.focus()); };

  const q = query.trim().toLowerCase();
  const listed = convs.filter((c) => c.title.toLowerCase().includes(q));
  const unread = convs.reduce((sum, c) => sum + unreadCount(c), 0);
  const shown = conv.items.filter((item) => !isMsg(item) || !deleted.includes(item.id));
  const lastYou = [...shown].reverse().find((item): item is Msg => isMsg(item) && item.side === "you");
  const role = conv.person ? conv.details.find((row) => row.id === "role")?.title : undefined;
  return (
    // List-Detail: the studio's Sidebar on its rail with the toggle in its own header (Collapse=Sidebar), the chats as the
    // Leading-Pane, the open chat in the main column under its header, and its details as a modal Side Panel. The panes
    // take the Sidebar's elevation (Shadow) on Canvas/Default. defaultSidebarCollapsed: List-Detail starts on the rail.
    <AppShell pattern="list-detail" collapse="sidebar" defaultSidebarCollapsed
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={studioPlaces(unread)} selectedId="chats"
        onItemClick={(item) => { if (item.id !== "chats") notHere(item.label); }}
        footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />}
      leadingPane={(
        <AppShellPane title={<>Chats {unread ? <BadgeCounter theme="neutral" background="solid" value={unread} /> : null}</>}
          action={<IconButton level="tertiary" size="sm" icon="icon-edit-01-line" aria-label="New chat" onClick={() => toast({ title: "New chat", children: "Pick a person or a group to write to." })} />}>
          <Box paddingX="xs">
            <Search ref={searchRef} placeholder="Search chats" aria-label="Search chats" value={query} onValueChange={setQuery} clearable />
          </Box>
          {listed.length ? (
            // Conversation-List rows pad 12px above and below and keep their own 16px sides inside the pane.
            <List aria-label="Chats">
              {listed.map((c) => <ChatConversationItem key={c.id} {...rowOf(c, deleted)} selected={c.id === conv.id} onClick={() => open(c.id)} />)}
            </List>
          ) : (
            <EmptyState size="sm" headingLevel={3} icon="icon-search-medium-line" title="No chats match" secondaryAction={{ label: "Show all chats", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
              No person or group is called “{query.trim()}”.
            </EmptyState>
          )}
        </AppShellPane>
      )}
      // The chat's header in the Main row: its name is the page's h1, what it is under it (the person's role and presence,
      // or the members), a group's faces beside it, and the chat's actions as Tertiary icon buttons.
      header={<AppShellHeader sections={<Divider />} main={(
        <PageHeader title={<span ref={titleRef} tabIndex={-1}>{conv.title}</span>}
          meta={conv.members ? <AvatarStack size="sm" max={4} showMore items={conv.members.map(faceItem)} /> : undefined}
          description={[role, conv.status].filter(Boolean).join(" · ")}
          trailing={<>
            <IconButton level="tertiary" icon="icon-phone-call-line" aria-label="Voice call" onClick={() => call("audio")} />
            <IconButton level="tertiary" icon="icon-video-recorder-line" aria-label="Video call" onClick={() => call("video")} />
            <IconButton level="tertiary" icon="icon-info-circle-line" aria-label="Conversation details" onClick={() => setDetails(true)} />
          </>} />
      )} />}
    >
      {/* The thread fills the page under the header (the newest message at the bottom) and the composer docks at the
          bottom of the window, so the messages scroll under the header and above it. */}
      <Stack as="section" gap="none" height="fill" style={{ flex: "1 1 auto", minHeight: 0 }} aria-label={`Chat with ${conv.title}`}>
        {/* The thread lines its messages up with the page margin: it takes back its own 16px sides. */}
        <Stack gap="none" fillChildren style={{ flex: "1 1 auto", minHeight: 0, marginInline: "calc(-1 * var(--zen-spacing-padding-medium, 16px))" }}>
          <ChatThread key={conv.id} device="desktop" aria-label={`Messages with ${conv.title}`}>
            {shown.map((item, index) => {
              if (!isMsg(item)) return <ChatDateDivider key={item.id}>{item.label}</ChatDateDivider>;
              const others = item.side === "others";
              const last = item === lastYou;
              // A call that is still ringing gets its time once it ends.
              const ringing = item.kind === "call" && Boolean(item.live);
              return (
                <ChatMessage key={item.id} {...act(item)} side={item.side} author={others ? item.from : undefined}
                  showName={others && Boolean(conv.group) && !sameRun(shown[index - 1], item)} continued={others && sameRun(shown[index + 1], item)}
                  replyTo={item.replyTo} time={last && !ringing ? item.time : undefined}
                  status={last && item.kind !== "call" ? (item.delivery === "sent" ? "Sent" : "Seen") : undefined}>
                  {bodyOf(item)}
                </ChatMessage>
              );
            })}
          </ChatThread>
        </Stack>
        {/* Docked at the foot of the Body (Figma Fix position when scrolling) on the page's Canvas: the messages scroll
            under it. The emoji panel floats above its emoji button: a pick sends it; Escape, Back or a click outside closes it. */}
        <Box sticky="bottom" surface="canvas">
          <Box style={{ position: "relative" }} onFocus={(event) => { if (!emojiPanelRef.current?.contains(event.target)) emojiOpenerRef.current = event.target; }}>
            {emoji ? (
              // zen-allow-raw-position: ChatEmojiPicker is its own Popover surface; it sits 8px above the composer it belongs to.
              <Box ref={emojiPanelRef} tabIndex={-1} style={{ position: "absolute", zIndex: 5, right: "var(--zen-spacing-padding-xsmall, 8px)", bottom: "calc(100% + var(--zen-spacing-padding-xsmall, 8px))" }}
                onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closeEmoji(); } }}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== emojiOpenerRef.current) setEmoji(false); }}>
                <ChatEmojiPicker label="Choose an emoji" onPick={(glyph) => { send({ kind: "text", text: glyph }); closeEmoji(); }} onBack={closeEmoji} />
              </Box>
            ) : null}
            <ChatComposer device="desktop"
              actions={[
                { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => send({ kind: "file", ...(conv.attach ?? { name: "Meeting notes.pdf", file: "pdf", size: "640 KB" }) }) },
                { icon: "icon-microphone-line", label: "Record voice", onClick: () => toast({ title: "Hold to record", children: "Release to send the voice message." }) },
                { icon: "icon-image-line", label: "Send a photo", onClick: () => send({ kind: "photo", photos: [photos.site[5]], album: "Your photo" }) },
              ]}
              onEmoji={() => setEmoji((isOpen) => !isOpen)}
              replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); setNote("Reply cancelled"); }}
              onSend={(text) => send({ kind: "text", text })} />
          </Box>
        </Box>
        <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
      </Stack>
      {/* Conversation details and the photo viewer open as modal Side Panels. */}
      <SidePanel type="modal" size="small" open={details} onOpenChange={setDetails} title={conv.title} description={conv.status}>
        <List aria-label={conv.group ? "Members" : "Contact details"}>
          {conv.details.map((row) => <ListItem key={row.id} title={row.title} caption={row.caption} leading={row.leading} />)}
        </List>
      </SidePanel>
      <SidePanel type="modal" open={Boolean(viewer)} onOpenChange={(isOpen) => { if (!isOpen) setViewer(null); }} title={viewer?.msg.album ?? ""}
        description={viewer ? `Photo ${viewer.index + 1} of ${viewer.msg.photos.length} · ${viewer.msg.from?.name ?? "You"}` : undefined}>
        {viewer ? <Image src={viewer.msg.photos[viewer.index].src} alt={viewer.msg.photos[viewer.index].alt} ratio="4:3" radius="lg" /> : null}
      </SidePanel>
    </AppShell>
  );
}
