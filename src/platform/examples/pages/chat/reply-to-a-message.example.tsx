import { useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, Box, ChatCall, ChatComposer, ChatDateDivider, ChatEmojiPicker,
  ChatFile, ChatMessage, ChatPhotos, ChatThread, Divider, DockIcon, IconButton, Image, List, ListItem, Menu, PageHeader, SidePanel, Sidebar,
  SidebarMenuItem, Stack, Text, Thumbnail, VisuallyHidden, chatHoldActionsFor, chatReactionGlyph, plural, useToast,
  type ChatCallState, type ChatFileKind, type ChatPerson, type ChatReaction, type ChatReactionKind, type ChatReplyTarget, type ChatSide,
  type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { activity, daysFromToday, formatRelative, formatTime, initials, people, photos, studio, TODAY, type Person, type Photo } from "../../data";

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

const { alex, chi, bao, ava, finn, khoa, em, hana } = people;
const cp = (p: Person): ChatPerson => ({ name: p.name, src: p.photo, theme: p.theme });
/** "9:12 am" today · "Yesterday at 4:40 pm" (dividers show the clock for today). */
const clock = (h: number, m: number) => formatTime(daysFromToday(0, h, m));
const when = (days: number, h: number, m: number) => formatRelative(daysFromToday(days, h, m));
const now = formatTime(TODAY);

const at = (id: string, label: string): DateBreak => ({ kind: "divider", id, label });
const says = (from: Person, id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "others", from: cp(from), ...extra }) as Msg;
const mine = (id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "you", ...extra }) as Msg;
const sends = (from: Person, id: string, body: Exclude<Body, { kind: "text" }>): Msg => ({ ...body, id, side: "others", from: cp(from) }) as Msg;

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

// ——— The studio's chats: the Loyalty app group is chasing a checkout crash ———————————————————————————————————————————
/** The messages the replies below answer: text, a photo, a file and a call. */
const replyOriginals = {
  crash: says(chi, "rep-1", "Checkout crashes when a member redeems points and pays by card in the same order. Can someone reproduce it on staging before the 2 pm review?"),
  photo: sends(bao, "rep-2", { kind: "photo", photos: [photos.site[5]], album: "Lê Lợi store test" }),
  log: sends(em, "rep-3", { kind: "file", name: "checkout-crash-log.txt", file: "other", size: "84 KB" }),
  call: sends(bao, "rep-4", { kind: "call", call: "video", state: "in-missed", detail: clock(9, 41) }),
};
const chats: Conv[] = [
  groupChat("Loyalty app", [chi, bao, em], {
    id: "loyalty-bugs", time: clock(10, 2),
    attach: { name: "Checkout test plan.pdf", file: "pdf", size: "310 KB" },
    items: [
      at("rep-d1", clock(9, 30)),
      replyOriginals.crash,
      replyOriginals.photo,
      replyOriginals.log,
      replyOriginals.call,
      at("rep-d2", clock(9, 55)),
      mine("rep-5", "Reproduced it with Em's log: the card step drops the points discount.", { replyTo: quoteOf(replyOriginals.log) }),
      says(chi, "rep-6", "That's the counter where members redeem.", { replyTo: quoteOf(replyOriginals.photo) }),
      mine("rep-7", "Sorry Bao, I was on a client call. Calling you back in 5.", { replyTo: quoteOf(replyOriginals.call) }),
      says(em, "rep-8", "Never mind, I found the second crash too.", { replyTo: { id: "rep-gone", author: "Bao Nguyen", kind: "deleted" } }),
    ],
  }),
  /* The Lumen Bank project's group. */
  groupChat("Online banking", [ava, finn, khoa, hana], {
    id: "lumen", time: clock(9, 5),
    items: [
      at("lum-d1", clock(8, 58)),
      says(finn, "lum-1", "Passkey sign-in is merged. iOS only for now; Android follows next sprint."),
      says(ava, "lum-2", "Usability sessions 4 and 5 are booked for Friday."),
      mine("lum-3", "Great. I'll bring the transfer limits screen to the review.", { time: clock(9, 5) }),
    ],
  }),
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
];

/** The studio's mark and name in the Sidebar's logo slot; the mark alone on the rail. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const studioMark = <Thumbnail src={studio.logo} alt={studio.name} size="2xs" />;

/** The header's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const unreadActivity = activity.filter((item) => item.unread);
  const [unread, setUnread] = useState(unreadActivity.length);
  const latest = unreadActivity[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
        setUnread(0);
        toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={alex.name} src={alex.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: alex.name, children: `${alex.role} · ${alex.location}` }) },
        { id: "status", label: "Set a status", icon: "icon-face-smile-line", onSelect: () => toast({ title: "Status set", children: "In a meeting until 11:00 am" }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

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

/**
 * Reply in a message's hover toolbar fills the composer's "Replying to" bar, and × or Escape drops it. A sent reply quotes
 * what it answers (text, a photo, a file, a call, or a deleted message) and pressing the quote jumps back to it. The chat
 * app's Sidebar lists the groups and direct messages with their unread counts; picking one opens it.
 */
export default function ReplyToMessage() {
  const { toast, dismiss } = useToast();
  const [openId, setOpenId] = useState("loyalty-bugs");
  // The chat that is open is read.
  const [convs, setConvs] = useState(() => chats.map((c) => (c.id === "loyalty-bugs" ? { ...c, unread: false } : c)));
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  const [emoji, setEmoji] = useState(false);
  const [viewer, setViewer] = useState<{ msg: Msg & { kind: "photo" }; index: number } | null>(null);
  const [details, setDetails] = useState(false);
  // What the last action did, for screen readers.
  const [note, setNote] = useState("");
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

  // The chat list is the app's navigation: groups, then direct messages, each with its unread count.
  const row = (c: Conv): SidebarItem => ({
    id: c.id, label: c.title, counter: unreadCount(c) || undefined,
    icon: c.person ? <Avatar size="2xs" {...faceItem(c.person)} alt="" /> : "icon-users-line",
  });
  const sections: SidebarSection[] = [
    { label: "Groups", items: convs.filter((c) => c.group).map(row) },
    { label: "Direct messages", items: convs.filter((c) => !c.group).map(row) },
  ];
  const shown = conv.items.filter((item) => !isMsg(item) || !deleted.includes(item.id));
  const lastYou = [...shown].reverse().find((item): item is Msg => isMsg(item) && item.side === "you");
  const role = conv.person ? conv.details.find((row) => row.id === "role")?.title : undefined;
  return (
    // Sidebar: the studio's chat app, its Sidebar listing the chats (picking one opens it), the open chat's header in the
    // Main row with the top row's utilities above it, and the thread with its composer in the Body.
    <AppShell
      sidebar={(
        <Sidebar aria-label="Chats" logo={studioLogo} logoCollapsed={studioMark}
          sections={sections} selectedId={conv.id} onItemClick={(item) => (item.id === "settings" ? notHere("Settings") : open(item.id))}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      // The chat's header in the Main row: its name is the page's h1, what it is under it (the person's role and presence,
      // or the members), a group's faces beside it, and the chat's actions as Tertiary icon buttons.
      header={<AppShellHeader actions={<StudioActions />} sections={<Divider />} main={(
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
