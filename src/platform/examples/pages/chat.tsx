/* Chat examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Chat decision: the desktop messenger pairs Conversation-List
   rows with a desktop thread, the phone holds a message to react, the inbox rows carry unread and call states, a reply
   quotes what it answers, a message that could not be sent stays with Retry, support chats use the Business domain, and
   attachments are cards with a read list under the last message.
   Every interaction is live (useChatDemo + this file's useMessenger): hold / hover actions, reactions, reply, delete,
   retry, calls, the composer's attachment, photo, voice and emoji actions, details and photo viewers, Back on phones. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../../../components/Avatar";
import { BottomSheet } from "../../../components/BottomSheet";
import { IconButton } from "../../../components/Button";
import {
  ChatAvatarGroup, ChatCall, ChatComposer, ChatConversationItem, ChatDateDivider, ChatEmojiPicker, ChatFile, ChatMessage, ChatPhotos, ChatThread,
  type ChatCallState, type ChatComposerProps, type ChatConversationItemProps, type ChatDomain, type ChatFileKind, type ChatPerson,
  type ChatReaction, type ChatReplyTarget, type ChatSide,
} from "../../../components/Chat";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Image } from "../../../components/Image";
import { Box, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Search } from "../../../components/Search";
import { SidePanel } from "../../../components/SidePanel";
import { Heading, plural, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { ChatDemoNote, useChatDemo } from "../../chatDemo";
import { PlatformChatHeader } from "../../PlatformChatHeader";
import { ThreadHeader, headerActions } from "../../PlatformChatDesktopShowcases";
import { platformMedia, type PlatformPhoto } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { daysFromToday, formatMoney, formatRange, formatRelative, formatTime, initials, leaveRequests, people, projectById, TODAY, type Person } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./chat.css";

export const page: PlatformPage = "chat";

// ——— The conversation model ————————————————————————————————————————————————————————————————————
type Body =
  | { kind: "text"; text: string }
  | { kind: "photo"; photos: PlatformPhoto[]; album: string }
  | { kind: "file"; name: string; file: ChatFileKind; size: string }
  /** `live`: still ringing (no action yet) · `join`: a call in progress that others can join. */
  | { kind: "call"; call: "audio" | "video"; state: ChatCallState; detail: string; live?: boolean; join?: boolean };
type Msg = Body & {
  id: string;
  side: ChatSide;
  /** Others: who sent it (avatar, and the name in groups). */
  from?: ChatPerson;
  /** Business: inside every bubble. Social: only under your last message. */
  time?: string;
  reactions?: ChatReaction[];
  replyTo?: ChatReplyTarget;
  seenBy?: ChatPerson[];
  delivery?: "failed" | "sending" | "sent";
};
type DateBreak = { kind: "divider"; id: string; label: string };
type Item = Msg | DateBreak;
type Detail = { id: string; title: string; caption: string; leading: ReactNode };
type Conv = {
  id: string;
  title: string;
  /** One-to-one: the other person. Groups set `group` (the two faces) instead. */
  person?: ChatPerson;
  group?: ChatPerson[];
  status: string;
  online?: boolean;
  unread?: boolean;
  /** A call is going on in this chat right now (the list row turns Positive). */
  ongoing?: boolean;
  /** List row time, on the timestamp ladder. */
  time: string;
  domain?: ChatDomain;
  /** "Conversation details": the person's role and contact, or the members of a group. */
  details: Detail[];
  /** A chat with no messages yet: who the other person is, under "No messages yet". */
  intro?: string;
  /** What Add attachment and Send a photo post in this chat. */
  attach?: { name: string; file: ChatFileKind; size: string };
  photo?: PlatformPhoto;
  items: Item[];
};

const { alex, chi, bao, duy, ava, emi, finn, em, gia, hana, minhAnh, linh, khoa, mai } = people;
const cp = (p: Person): ChatPerson => ({ name: p.name, src: p.photo, theme: p.theme });
const firstName = (name: string) => name.split(" ")[0];
/** "9:12 am" today · "Yesterday at 4:40 pm" · "Monday at 11:05 am" (dividers show the clock for today). */
const clock = (h: number, m: number) => formatTime(daysFromToday(0, h, m));
const when = (days: number, h: number, m: number) => formatRelative(daysFromToday(days, h, m));
const now = formatTime(TODAY);
/** Alex's approved annual leave (the shared leave requests). */
const myLeave = leaveRequests.find((request) => request.person === "alex")!;

const at = (id: string, label: string): DateBreak => ({ kind: "divider", id, label });
const says = (from: Person | ChatPerson, id: string, text: string, extra: Partial<Msg> = {}): Msg =>
  ({ kind: "text", text, id, side: "others", from: "role" in from ? cp(from) : from, ...extra }) as Msg;
const mine = (id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "you", ...extra }) as Msg;
const sends = (from: Person | ChatPerson | null, id: string, body: Exclude<Body, { kind: "text" }>, extra: Partial<Msg> = {}): Msg =>
  ({ ...body, id, side: from ? "others" : "you", from: from ? ("role" in from ? cp(from) : from) : undefined, ...extra }) as Msg;

const dock = (icon: "icon-briefcase-line" | "icon-marker-pin-01-line" | "icon-mail-01-line") => <DockIcon size="md" theme="neutral" background="subtle" icon={icon} />;
const face = (p: ChatPerson) => <Avatar size="md" theme={p.src ? "photo" : p.theme ?? "neutral"} src={p.src} alt="">{p.src ? null : initials(p.name)}</Avatar>;
const personDetails = (p: Person): Detail[] => [
  { id: "role", title: p.role, caption: `${p.team} team`, leading: dock("icon-briefcase-line") },
  { id: "place", title: p.location, caption: "Location", leading: dock("icon-marker-pin-01-line") },
  { id: "email", title: p.email, caption: "Email", leading: dock("icon-mail-01-line") },
];
const memberDetails = (members: Person[]): Detail[] =>
  [alex, ...members].map((p) => ({ id: p.id, title: p.id === alex.id ? `${p.name} (you)` : p.name, caption: p.role, leading: face(cp(p)) }));
const oneToOne = (p: Person, rest: Omit<Conv, "title" | "person" | "details" | "status" | "online"> & { status?: string }): Conv =>
  ({ title: p.name, person: cp(p), online: p.online, status: p.online ? "Active now" : "Active today", details: personDetails(p), ...rest });
const groupChat = (title: string, members: Person[], rest: Omit<Conv, "title" | "group" | "details" | "status">): Conv =>
  ({ title, group: members.slice(0, 2).map(cp), status: plural(members.length + 1, "member"), details: memberDetails(members), ...rest });

/** The quote a reply shows, built from the message it answers. */
const quoteOf = (m: Msg): ChatReplyTarget => {
  const base = { id: m.id, author: m.side === "you" ? "You" : m.from?.name ?? "", fromYou: m.side === "you" };
  if (m.kind === "photo") return { ...base, kind: "photo", photo: m.photos[0], count: m.photos.length };
  if (m.kind === "file") return { ...base, kind: "file", fileName: m.name, fileKind: m.file };
  if (m.kind === "call") return { ...base, kind: "call", callType: m.call, missed: m.state.endsWith("missed") };
  return { ...base, kind: "text", text: m.text };
};

// ——— Shared conversations (the studio's chats, reused by the phone inboxes) ——————————————————————
const chiChat = (): Conv => oneToOne(chi, {
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
});
const baoChat = (): Conv => oneToOne(bao, {
  id: "bao", unread: true, time: when(0, 10, 17),
  items: [
    at("bao-d1", clock(10, 12)),
    says(bao, "bao-1", "Hey Alex, can you review PHIN-219 today?"),
    says(bao, "bao-2", "It connects the rewards API to checkout. Two screens changed."),
    sends(bao, "bao-3", { kind: "call", call: "audio", state: "in-missed", detail: clock(10, 17) }),
  ],
});
const loyaltyChat = (ongoing = false): Conv => groupChat("Loyalty app", [chi, bao, em, duy], {
  id: "loyalty", time: ongoing ? when(0, 10, 5) : clock(9, 48), online: true, ongoing,
  items: [
    at("loy-d1", when(-1, 16, 40)),
    says(duy, "loy-1", "Phin & Co moved the launch to Nov 2."),
    says(em, "loy-2", "Then the Android regression run starts on Monday."),
    mine("loy-3", "Thanks, I'll update the design plan.", { time: when(-1, 16, 52) }),
    at("loy-d2", clock(9, 48)),
    says(bao, "loy-4", "The rewards API is on staging 🎉", { reactions: [{ kind: "heart", by: [cp(chi), cp(duy)] }] }),
    says(bao, "loy-5", "Checkout shows the points balance now."),
    ...(ongoing ? [sends(duy, "loy-6", { kind: "call", call: "video", state: "in-call", detail: `Started at ${clock(10, 5)}`, join: true })] : []),
  ],
});
const hanaChat = (): Conv => oneToOne(hana, {
  id: "hana", time: clock(8, 52),
  items: [
    at("hana-d1", clock(8, 40)),
    says(hana, "hana-1", "Lumen Bank signed off on the statement of work. Here's v3 for the files."),
    sends(hana, "hana-2", { kind: "file", name: "Lumen Bank SOW v3.pdf", file: "pdf", size: "1.2 MB" }),
    mine("hana-3", "Great news. I'll brief the design team at standup.", { time: clock(8, 52) }),
  ],
});
const duyCallChat = (): Conv => oneToOne(duy, {
  id: "duy", time: when(-1, 16, 40),
  items: [at("duy-d1", when(-1, 16, 40)), sends(duy, "duy-1", { kind: "call", call: "video", state: "in-missed", detail: formatTime(daysFromToday(-1, 16, 40)) })],
});
const minhAnhChat = (): Conv => oneToOne(minhAnh, {
  id: "minh-anh", time: when(-2, 11, 5),
  items: [
    at("ma-d1", when(-2, 10, 58)),
    says(minhAnh, "ma-1", `Your leave for ${formatRange(myLeave.from, myLeave.to)} is approved. Enjoy the break!`),
    sends(null, "ma-2", { kind: "call", call: "audio", state: "out-call", detail: "4 min" }, { time: formatTime(daysFromToday(-2, 11, 5)) }),
  ],
});

// ——— useMessenger: one chat app's state, shared by the phone and desktop frames ————————————————————
type Options = {
  device: "mobile" | "desktop";
  /** The chat that is open first; `null` starts on the chat list (phones). Default: the first. */
  open?: string | null;
  /** Business support: an answer arrives a moment after each message you send. */
  answer?: (conv: Conv) => string | undefined;
  /** No network: what you send fails ("Not delivered") until Retry reconnects. */
  offline?: boolean;
};

function useMessenger(initial: Conv[], options: Options) {
  const demo = useChatDemo();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(options.open === undefined ? initial[0].id : options.open);
  // The chat that is open is read.
  const [convs, setConvs] = useState(() => initial.map((c) => (c.id === openId ? { ...c, unread: false } : c)));
  const [offline, setOffline] = useState(Boolean(options.offline));
  const [emoji, setEmoji] = useState(false);
  const [moreFor, setMoreFor] = useState<Msg | null>(null);
  const [viewer, setViewer] = useState<{ msg: Msg & { kind: "photo" }; index: number } | null>(null);
  const [details, setDetails] = useState(false);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);
  // The composer of this chat app: Retry and Say hello put the caret back in it (Reply does by itself, via ChatComposer).
  const composerRef = useRef<HTMLElement>(null);
  const focusComposer = () => requestAnimationFrame(() => composerRef.current?.querySelector("textarea")?.focus());
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const later = (ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, ms)); };
  const conv = convs.find((c) => c.id === openId) ?? null;

  const edit = (convId: string, change: (items: Item[]) => Item[], extra: Partial<Conv> = {}) =>
    setConvs((all) => all.map((c) => (c.id === convId ? { ...c, ...extra, items: change(c.items) } : c)));
  const patch = (convId: string, msgId: string, next: Partial<Msg>) =>
    edit(convId, (items) => items.map((item) => (item.id === msgId ? ({ ...item, ...next } as Item) : item)));
  const nextId = (convId: string) => `${convId}-new-${++seq.current}`;

  /** You send something: it carries the reply you picked, goes out (or fails while offline) and may get an answer. */
  const send = (body: Body) => {
    if (!conv) return;
    const replyTo = body.kind === "call" ? undefined : demo.takeReply();
    const id = nextId(conv.id);
    // The first message of a new chat opens it with today's time.
    edit(conv.id, (items) => [...(items.length ? items : [at(`${id}-day`, now)]), { ...body, id, side: "you", replyTo, time: now, delivery: offline ? "failed" : "sent" } as Msg], { time: "Just now", unread: false });
    setEmoji(false);
    const answer = offline ? undefined : options.answer?.(conv);
    // An answer means they read it: your message turns from Sent to Seen.
    if (answer && conv.person) later(1400, () => edit(conv.id, (items) => [...items.map((item) => (item.id === id ? { ...item, delivery: undefined } as Item : item)), says(conv.person!, nextId(conv.id), answer, { time: now })]));
  };
  /** Retry: the network is back, the message shows Sending… and then Sent. */
  const retry = (convId: string, msgId: string) => {
    setOffline(false);
    patch(convId, msgId, { delivery: "sending" });
    // Retry leaves with the "Not delivered" line: focus moves to the composer, not to <body>.
    focusComposer();
    demo.say("Sending…");
    later(900, () => { patch(convId, msgId, { delivery: "sent" }); demo.say("Message sent"); });
  };
  /** Calling adds a ringing call card; with no answer it becomes a missed call with Call again. */
  const call = (type: "audio" | "video") => {
    if (!conv) return;
    const convId = conv.id;
    const id = nextId(convId);
    edit(convId, (items) => [...items, { kind: "call", call: type, state: "out-call", detail: "Calling…", live: true, id, side: "you", time: now } as Msg], { time: "Just now" });
    demo.say(`Calling ${conv.title}…`);
    later(2600, () => { patch(convId, id, { state: "out-missed", detail: "No answer", live: false } as Partial<Msg>); demo.say(`${conv.title} didn't answer`); });
  };
  const open = (id: string | null) => {
    if (demo.composerReply.replyTo) demo.composerReply.onCancelReply();
    setEmoji(false);
    setOpenId(id);
    if (id) setConvs((all) => all.map((c) => (c.id === id ? { ...c, unread: false } : c)));
  };

  /** Hold (mobile) / hover (desktop) wiring from useChatDemo, plus a visible result for the actions it only announces.
   *  Delete is useChatDemo's: the message goes at once, focus moves to its neighbour and the toast offers Undo. */
  const act = (m: Msg) => {
    const wired = demo.act(m.id, m.side, {
      kind: m.kind, text: m.kind === "text" ? m.text : undefined, author: m.from?.name, reactions: m.reactions,
      reply: m.kind === "text" ? undefined : quoteOf(m),
    });
    return {
      ...wired,
      onHoldAction: (action: string) => {
        if (action === "more") { setMoreFor(m); return; }
        if (action === "call-back" && m.kind === "call") { call(m.call); return; }
        wired.onHoldAction(action);
        const done: Record<string, string> = { copy: "Message copied", forward: "Message forwarded", pin: "Message pinned", report: "Call reported" };
        if (done[action]) toast({ title: done[action] });
      },
    };
  };
  const openPhoto = (msg: Msg & { kind: "photo" }, index: number) => { setViewer({ msg, index }); demo.say(`Opened ${msg.album}`); };
  const openFile = (msg: Msg & { kind: "file" }) => toast({ title: "File downloaded", children: `${msg.name} · ${msg.size}` });
  const joinCall = () => { if (conv) toast({ title: "Call joined", children: conv.title }); };

  const actions: ChatComposerProps["actions"] = [
    { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => send({ kind: "file", ...(conv?.attach ?? { name: "Meeting notes.pdf", file: "pdf", size: "640 KB" }) }) },
    { icon: "icon-microphone-line", label: "Record voice", onClick: () => toast({ title: "Hold to record", children: "Release to send the voice message." }) },
    { icon: "icon-image-line", label: "Send a photo", onClick: () => send({ kind: "photo", photos: [conv?.photo ?? platformMedia.site[5]], album: "Your photo" }) },
  ];
  const composer: ChatComposerProps = {
    device: options.device,
    actions,
    onEmoji: () => setEmoji((shown) => !shown),
    quickAction: { icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => send({ kind: "text", text: "👍" }) },
    onSend: (text: string) => send({ kind: "text", text }),
    ...demo.composerReply,
  };
  /** PlatformChatHeader (phones): calls ring, the title opens the details; Back is handled by the phone frame. */
  const phoneHeaderAction = (what: string) => () => {
    if (what.startsWith("Open")) setDetails(true);
    else if (what.startsWith("Starting a video call")) call("video");
    else if (what.startsWith("Calling")) call("audio");
  };
  /** ThreadHeader (desktop): Voice call · Video call · Conversation details. */
  const desktopHeaderAction = (label: string) => {
    if (label === "Conversation details") setDetails(true);
    else call(label === "Video call" ? "video" : "audio");
  };

  return {
    demo, toast, device: options.device, convs, conv, open, send, retry, call, act, openPhoto, openFile, joinCall, composer, composerRef, focusComposer,
    emoji, setEmoji, moreFor, setMoreFor, viewer, setViewer, details, setDetails, offline, phoneHeaderAction, desktopHeaderAction,
  };
}
type Messenger = ReturnType<typeof useMessenger>;

// ——— Rendering ——————————————————————————————————————————————————————————————————————————————————
const isMsg = (item: Item): item is Msg => item.kind !== "divider";

/** A list row from the chat's last message: "You: …", "Bao: …" in groups, a call state, or a photo / file line. */
function rowOf(m: Messenger, c: Conv): Omit<ChatConversationItemProps, "onClick" | "selected"> {
  const last = [...c.items].reverse().find((item): item is Msg => isMsg(item) && !m.demo.isDeleted(item.id));
  const who = !last ? "" : last.side === "you" ? "You" : c.group ? firstName(last.from?.name ?? "") : "";
  const lead = (text: string) => (who ? `${who}: ${text}` : text);
  const sender = last?.side === "you" ? "You" : firstName(last?.from?.name ?? "");
  const preview = !last ? "No messages yet"
    : last.kind === "text" ? lead(last.text)
    : last.kind === "photo" ? `${sender} sent ${last.photos.length === 1 ? "a photo" : plural(last.photos.length, "photo")}`
    : last.kind === "file" ? `${sender} sent ${last.name}` : undefined;
  const call = c.ongoing ? "ongoing" as const
    : last?.kind !== "call" ? undefined
    : last.side === "you" ? "outgoing" as const
    : last.state === "in-missed" ? (last.call === "audio" ? "missed-audio" as const : "missed-video" as const) : "incoming" as const;
  // The built-in preview reads Missed call · Audio call · Ongoing call…; a video call that went through says so.
  const callLabel = (call === "incoming" || call === "outgoing") && last?.kind === "call" && last.call === "video" ? "Video call" : undefined;
  return { person: c.person ?? { name: c.title }, group: c.group, preview, call, callLabel, time: c.time, unread: c.unread, online: c.online };
}

function bodyOf(m: Messenger, item: Msg) {
  switch (item.kind) {
    case "text": return item.text;
    case "photo": return <ChatPhotos side={item.side} photos={item.photos} onOpen={(index) => m.openPhoto(item, index)} />;
    case "file": return <ChatFile side={item.side} kind={item.file} name={item.name} size={item.size} onOpen={() => m.openFile(item)} />;
    // The built-in action reads Call back or Call again; a call going on now offers Join call instead.
    case "call": return <ChatCall side={item.side} type={item.call} state={item.state} detail={item.detail} actionLabel={item.join ? "Join call" : undefined}
      onAction={item.live ? undefined : item.join ? m.joinCall : () => m.call(item.call)} />;
  }
}

/** The thread: a run shows the avatar once (last message) and, in groups, the name once (first message). */
function Thread({ m }: { m: Messenger }) {
  const conv = m.conv!;
  const shown = conv.items.filter((item) => !isMsg(item) || !m.demo.isDeleted(item.id));
  const lastYou = [...shown].reverse().find((item): item is Msg => isMsg(item) && item.side === "you");
  const business = conv.domain === "business";
  const sameRun = (other: Item | undefined, item: Msg) => other !== undefined && isMsg(other) && other.side === item.side && other.from?.name === item.from?.name;
  // A new chat: say who it is with and offer the first message; the thread takes over once something is sent.
  if (!shown.some(isMsg)) {
    return (
      <Stack justify="center" className="px-chat-empty">
        <EmptyState headingLevel={2} icon="icon-message-smile-circle-line" title="No messages yet"
          primaryAction={{ label: "Say hello", onClick: () => { m.send({ kind: "text", text: "👋" }); m.focusComposer(); } }}>
          {conv.intro}
        </EmptyState>
      </Stack>
    );
  }
  return (
    <ChatThread device={m.device} aria-label={`Messages with ${conv.title}`}>
      {shown.map((item, index) => {
        if (!isMsg(item)) return <ChatDateDivider key={item.id}>{item.label}</ChatDateDivider>;
        const others = item.side === "others";
        const last = item === lastYou;
        const status = !last || item.kind === "call" || item.seenBy || item.delivery === "failed" ? undefined : item.delivery === "sending" ? "Sending…" : item.delivery === "sent" ? "Sent" : "Seen";
        // A call that is still ringing gets its time once it ends (Business shows it inside the card).
        const ringing = item.kind === "call" && Boolean(item.live);
        return (
          <ChatMessage key={item.id} {...m.act(item)} side={item.side} domain={conv.domain} author={others ? item.from : undefined}
            showName={others && Boolean(conv.group) && !sameRun(shown[index - 1], item)} continued={others && sameRun(shown[index + 1], item)}
            time={(business || last) && !ringing ? item.time : undefined} status={status} seenBy={item.seenBy} replyTo={item.replyTo}
            failed={item.delivery === "failed"} onRetry={() => m.retry(conv.id, item.id)}>
            {bodyOf(m, item)}
          </ChatMessage>
        );
      })}
    </ChatThread>
  );
}

/** The composer with its emoji panel: the smiley opens it above the field, a pick sends it, Escape or Back closes it. */
function Composer({ m }: { m: Messenger }) {
  const ref = m.composerRef;
  const emojiButton = () => ref.current?.querySelector<HTMLElement>(".zen-chat-composer__field button");
  const close = (refocus: boolean) => { m.setEmoji(false); if (refocus) emojiButton()?.focus(); };
  useEffect(() => {
    if (!m.emoji) return undefined;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.querySelector(".px-chat-emoji")?.contains(target) && !emojiButton()?.contains(target)) m.setEmoji(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [m.emoji, m.setEmoji]);
  return (
    <Box ref={ref} className="px-chat-composer">
      {m.emoji ? (
        <Box className="px-chat-emoji" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(true); } }}>
          <ChatEmojiPicker label="Choose an emoji" onPick={(glyph) => { m.send({ kind: "text", text: glyph }); close(true); }} onBack={() => close(true)} />
        </Box>
      ) : null}
      <ChatComposer {...m.composer} />
    </Box>
  );
}

function DetailList({ m }: { m: Messenger }) {
  return (
    <List aria-label={m.conv?.group ? "Members" : "Contact details"}>
      {m.conv?.details.map((row) => <ListItem key={row.id} title={row.title} caption={row.caption} leading={row.leading} />)}
    </List>
  );
}

function viewerCaption(viewer: NonNullable<Messenger["viewer"]>) {
  return `Photo ${viewer.index + 1} of ${viewer.msg.photos.length} · ${viewer.msg.from?.name ?? "You"}`;
}

/** Phone overlays anchor to the device: the hold menu's More, the chat details and the photo viewer. */
function PhoneSheets({ m }: { m: Messenger }) {
  const more = m.moreFor;
  return (
    <>
      <BottomSheet inline type="action" open={Boolean(more)} onOpenChange={(shown) => { if (!shown) m.setMoreFor(null); }} title="More"
        items={[
          { id: "pin", label: "Pin message", icon: "icon-pin-02-line" },
          { id: "remind", label: "Remind me", icon: "icon-bell-01-line" },
          ...(more?.side === "others" ? [{ id: "report", label: "Report message", icon: "icon-flag-01-line" as const }] : []),
        ]}
        onSelect={(item) => m.toast(item.id === "pin" ? { title: "Message pinned" } : item.id === "remind" ? { title: "Reminder set", children: "Tomorrow at 9:00 am" } : { title: "Message reported" })} />
      <BottomSheet inline open={m.details} onOpenChange={m.setDetails} title={m.conv?.title ?? ""}>
        <DetailList m={m} />
      </BottomSheet>
      <BottomSheet inline size="max" open={Boolean(m.viewer)} onOpenChange={(shown) => { if (!shown) m.setViewer(null); }} title={m.viewer?.msg.album ?? ""}>
        {m.viewer ? <Image src={m.viewer.msg.photos[m.viewer.index].src} alt={m.viewer.msg.photos[m.viewer.index].alt} ratio="3:4" radius="lg" caption={viewerCaption(m.viewer)} /> : null}
      </BottomSheet>
    </>
  );
}

/** Desktop overlays: Conversation details and the photo viewer open as modal Side Panels. */
function DesktopPanels({ m }: { m: Messenger }) {
  return (
    <>
      <SidePanel type="modal" size="small" open={m.details} onOpenChange={m.setDetails} title={m.conv?.title ?? ""} description={m.conv?.status}>
        <DetailList m={m} />
      </SidePanel>
      <SidePanel type="modal" open={Boolean(m.viewer)} onOpenChange={(shown) => { if (!shown) m.setViewer(null); }} title={m.viewer?.msg.album ?? ""} description={m.viewer ? viewerCaption(m.viewer) : undefined}>
        {m.viewer ? <Image src={m.viewer.msg.photos[m.viewer.index].src} alt={m.viewer.msg.photos[m.viewer.index].alt} ratio="4:3" radius="lg" /> : null}
      </SidePanel>
    </>
  );
}

/** A chat app on a phone: the chat list, and a thread whose Back returns to it. */
function PhoneMessenger({ m, label, listTitle = "Chats", canvas }: { m: Messenger; label: string; listTitle?: string; canvas?: "default" | "canvas" }) {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  // The chat list folds its large title as it scrolls; each screen has its own key, so a thread opens fresh.
  const screenRef = useRef<HTMLDivElement>(null);
  const conv = m.conv;
  if (!conv) {
    return (
      <>
        <PlatformPhone key="chats" label={label} canvas={canvas} headerOverlay screenRef={screenRef}
          header={<TopNavigation type="alt" title={listTitle} largeTitle={listTitle} scrollRef={screenRef} trailing={[{ icon: "icon-plus-line", label: "Favourite", onClick: () => toast({ title: "Favourite" }) }]} />}>
          {screen.anchor}
          <List aria-label={listTitle}>
            {m.convs.map((c) => <ChatConversationItem key={c.id} {...rowOf(m, c)} onClick={() => screen.go('[aria-label="Back"]', () => m.open(c.id))} />)}
          </List>
        </PlatformPhone>
        <ChatDemoNote note={m.demo.note} />
      </>
    );
  }
  const index = m.convs.indexOf(conv);
  const back = () => screen.go(`.zen-list > li:nth-child(${index + 1}) .zen-list-item__wrapper`, () => m.open(null));
  return (
    <>
      {/* The thread is the bar's scroller too: once messages run under the header, it shows its Pale rule. */}
      <PlatformPhone key={conv.id} label={label} canvas={canvas} screenRef={screenRef}
        header={<PlatformChatHeader title={conv.title} subtitle={m.offline ? "Connecting…" : conv.status} person={conv.person} group={conv.group} online={!m.offline && conv.online} scrollRef={screenRef}
          onAction={(what) => (what.startsWith("Back") ? back : m.phoneHeaderAction(what))} />}
        footer={<Composer m={m} />}>
        {screen.anchor}
        <Thread m={m} />
        <PhoneSheets m={m} />
      </PlatformPhone>
      <ChatDemoNote note={m.demo.note} />
    </>
  );
}

/**
 * The desktop thread header: ThreadHeader for a one-to-one chat. ThreadHeader takes one person, so a group shows the
 * same bar with its two faces (ChatAvatarGroup Medium, the 40px of ThreadHeader's Avatar) instead of initials of its name.
 */
function DesktopHeader({ m }: { m: Messenger }) {
  const conv = m.conv!;
  if (!conv.group) return <ThreadHeader person={conv.person ?? { name: conv.title }} status={conv.status} actions={headerActions} onAction={m.desktopHeaderAction} />;
  return (
    <>
      <div className="pe-chat-desktop__header">
        <ChatAvatarGroup people={conv.group} size="md" online={conv.online} />
        <div className="pe-chat-desktop__who">
          <Text as="span" textStyle="Body/Base/Bold" className="pe-chat-desktop__name">{conv.title}</Text>
          <Text as="span" textStyle="Body/Small/Regular" tone="light" className="pe-chat-desktop__status">{conv.status}</Text>
        </div>
        <div className="pe-chat-desktop__actions">
          {headerActions.map((a) => <IconButton key={a.label} appearance="flat" level="primary" size="md" aria-label={a.label} icon={<Icon name={a.icon} />} onClick={() => m.desktopHeaderAction(a.label)} />)}
        </div>
      </div>
      <Divider decorative />
    </>
  );
}

/** One desktop chat window: the thread header over the desktop thread and Chat-Control. */
function DesktopThread({ m }: { m: Messenger }) {
  const conv = m.conv!;
  return (
    <div className="pe-chat-desktop px-chat-single px-chat-window" data-domain={conv.domain}>
      <section className="pe-chat-desktop__main" aria-label={`Chat with ${conv.title}`}>
        {/* The window's one h1 names the open chat; the header bar shows it. */}
        <VisuallyHidden as="h1">{conv.title}</VisuallyHidden>
        <DesktopHeader m={m} />
        <Thread key={conv.id} m={m} />
        <Composer m={m} />
        <ChatDemoNote note={m.demo.note} />
      </section>
      <DesktopPanels m={m} />
    </div>
  );
}

// ——— 1. Team messenger (desktop): Conversation-List rows beside the thread ——————————————————————————
function TeamMessenger() {
  const m = useMessenger([chiChat(), loyaltyChat(), baoChat(), hanaChat(), duyCallChat(), minhAnhChat()], { device: "desktop" });
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const q = query.trim().toLowerCase();
  const shown = m.convs.filter((c) => c.title.toLowerCase().includes(q));
  const conv = m.conv!;
  return (
    <div className="pe-chat-desktop px-chat-window">
      {/* The screen's one h1 names the open chat (the header bar shows it); the chat list is its h2. */}
      <VisuallyHidden as="h1">{conv.title}</VisuallyHidden>
      <aside className="pe-chat-desktop__list" aria-labelledby={headingId}>
        <div className="pe-chat-desktop__list-head">
          <Heading level={2} id={headingId} textStyle="Heading/4">Chats</Heading>
          <Search ref={searchRef} placeholder="Search chats" aria-label="Search chats" value={query} onValueChange={setQuery} clearable />
        </div>
        {shown.length ? (
          // The pane scrolls under its sticky head; the rows pad 12px above and below and keep their own 16px sides
          // (Conversation-List), so their fill stays 4px inside the pane.
          <Box>
            <List aria-labelledby={headingId}>
              {shown.map((c) => <ChatConversationItem key={c.id} {...rowOf(m, c)} selected={c.id === conv.id} onClick={() => m.open(c.id)} />)}
            </List>
          </Box>
        ) : (
          <EmptyState illustration={false} headingLevel={3} title="No chats match" secondaryAction={{ label: "Show all chats", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
            No person or group is called “{query.trim()}”.
          </EmptyState>
        )}
      </aside>
      <Divider orientation="vertical" decorative className="pe-chat-desktop__split" />
      <section className="pe-chat-desktop__main" aria-label={`Chat with ${conv.title}`}>
        <DesktopHeader m={m} />
        <Thread key={conv.id} m={m} />
        <Composer m={m} />
        <ChatDemoNote note={m.demo.note} />
      </section>
      <DesktopPanels m={m} />
    </div>
  );
}

// ——— 2. Hold to react (phone) ———————————————————————————————————————————————————————————————————
const avaChat = (): Conv => oneToOne(ava, {
  id: "ava", time: clock(9, 41),
  attach: { name: "Usability plan.pdf", file: "pdf", size: "1.2 MB" },
  items: [
    at("ava-d1", when(-1, 17, 15)),
    says(ava, "ava-1", "Sessions 1 and 2 are done. Both people found the transfer limit on their own."),
    mine("ava-2", "That's a relief. Did anyone get stuck on the confirmation step?"),
    says(ava, "ava-3", "One person tapped Back twice before confirming."),
    says(ava, "ava-4", "I'll put the clip in the report."),
    at("ava-d2", clock(8, 50)),
    sends(ava, "ava-5", { kind: "call", call: "audio", state: "in-missed", detail: clock(8, 50) }),
    says(ava, "ava-6", "Session 3 is done too 🙌 Three out of three found the limit."),
    mine("ava-7", "Great work. Let's show the team on Friday.", { reactions: [{ kind: "like", by: [cp(ava)] }] }),
    says(ava, "ava-8", "Booked 10:30 on Friday in the big room."),
    mine("ava-9", "Perfect, see you there.", { time: clock(9, 41) }),
  ],
});

function HoldToReact() {
  const m = useMessenger([avaChat(), chiChat(), baoChat(), hanaChat()], { device: "mobile" });
  return <PhoneMessenger m={m} label="Chat with Ava Chen" />;
}

// ——— 3. Chats inbox (phone): row states, and the thread each row opens ——————————————————————————————
const inboxChats = (): Conv[] => [
  chiChat(),
  baoChat(),
  loyaltyChat(true),
  avaChat(),
  hanaChat(),
  duyCallChat(),
  oneToOne(emi, {
    id: "emi", time: when(-1, 14, 5),
    attach: { name: "Motion notes.pdf", file: "pdf", size: "180 KB" },
    items: [
      at("emi-d1", when(-1, 13, 50)),
      says(emi, "emi-1", "Here's the points counter for the Loyalty app."),
      sends(emi, "emi-2", { kind: "file", name: "Points counter.mov", file: "other", size: "6.8 MB" }),
      says(emi, "emi-3", "It counts up over 600 ms and settles with a small bounce. Too much?"),
    ],
  }),
  minhAnhChat(),
  oneToOne(em, {
    id: "em", time: when(-3, 17, 30),
    items: [
      at("em-d1", when(-3, 17, 22)),
      says(em, "em-1", "I filed two bugs on the Loyalty app: PHIN-226 and PHIN-227."),
      says(em, "em-2", "Both only happen on Android 14, when points and a voucher are used together."),
      mine("em-3", "Thanks, Em. I'll pair with Bao on them tomorrow.", { time: when(-3, 17, 30) }),
    ],
  }),
  oneToOne(linh, {
    id: "linh", time: when(-5, 15, 45),
    items: [
      at("linh-d1", when(-5, 15, 45)),
      says(linh, "linh-1", "Saola's tone of voice is ready for review: plain, warm, and no gear jargon."),
      sends(linh, "linh-2", { kind: "file", name: "Saola tone of voice.pdf", file: "pdf", size: "1.2 MB" }),
    ],
  }),
  oneToOne(mai, {
    id: "mai", time: when(-8, 15, 30),
    items: [at("mai-d1", when(-8, 15, 30)), says(mai, "mai-1", "INV-2026-0141 from Lumen Bank is marked as paid.")],
  }),
  oneToOne(gia, {
    id: "gia", time: when(-9, 17, 20),
    items: [at("gia-d1", when(-9, 17, 20)), sends(gia, "gia-1", { kind: "photo", photos: platformMedia.feed.slice(0, 3), album: "Saola moodboard" })],
  }),
  oneToOne(finn, {
    id: "finn", time: when(-12, 11, 45),
    items: [at("finn-d1", when(-12, 11, 45)), says(finn, "finn-1", "Passkey sign-in works on iOS. Notes are in LUM-095."), mine("finn-2", "Brilliant, thank you!", { time: when(-12, 11, 50) })],
  }),
  oneToOne(khoa, {
    id: "khoa", time: when(-14, 9, 10),
    items: [at("khoa-d1", when(-14, 9, 10)), says(khoa, "khoa-1", "Customs hold states are mapped in the API draft.")],
  }),
];

function ChatsInbox() {
  const m = useMessenger(inboxChats(), { device: "mobile", open: null });
  return <PhoneMessenger m={m} label="Chats" />;
}

// ——— 4. Reply to a message (desktop) ————————————————————————————————————————————————————————————
const replyOriginals = {
  crash: says(chi, "rep-1", "Checkout crashes when a member redeems points and pays by card in the same order. Can someone reproduce it on staging before the 2 pm review?"),
  photo: sends(bao, "rep-2", { kind: "photo", photos: [platformMedia.site[5]], album: "Lê Lợi store test" }),
  log: sends(em, "rep-3", { kind: "file", name: "checkout-crash-log.txt", file: "other", size: "84 KB" }),
  call: sends(bao, "rep-4", { kind: "call", call: "video", state: "in-missed", detail: clock(9, 41) }),
};
const replyChat = (): Conv => groupChat("Loyalty app", [chi, bao, em], {
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
});

function ReplyToMessage() {
  const m = useMessenger([replyChat()], { device: "desktop" });
  return <DesktopThread m={m} />;
}

// ——— 5. Not delivered (phone) ———————————————————————————————————————————————————————————————————
const duyScopeChat = (): Conv => oneToOne(duy, {
  id: "duy-scope", time: clock(10, 24), status: "Active now",
  attach: { name: "Customs hold states.pdf", file: "pdf", size: "860 KB" },
  items: [
    at("scope-d1", when(-1, 17, 30)),
    says(duy, "scope-1", "Mekong Freight put the tracking project on hold until their board meets."),
    mine("scope-2", "Understood. Do they need anything from us before then?"),
    says(duy, "scope-3", "Only the latest scope, so the board can compare options."),
    at("scope-d2", clock(10, 2)),
    says(duy, "scope-4", "The board meets at 11. Can you send the scope now?"),
    mine("scope-5", "Sure, it's the one with the customs hold states."),
    sends(null, "scope-6", { kind: "file", name: "Scope v4.pdf", file: "pdf", size: "2.4 MB" }, { delivery: "failed", time: clock(10, 24) }),
  ],
});

function NotDelivered() {
  const m = useMessenger([duyScopeChat(), chiChat(), hanaChat()], { device: "mobile", offline: true });
  return <PhoneMessenger m={m} label="Chat with Duy Le" />;
}

// ——— 6. First message (phone): a chat with nothing in it yet ————————————————————————————————————————
const emChat = (): Conv => oneToOne(em, { id: "em", time: "Just now", intro: "Em Pham is the QA engineer on the Loyalty app, based in Hanoi.", items: [] });

function FirstMessage() {
  // Em answers the first message only; after that the chat is yours to continue.
  const m = useMessenger([emChat(), chiChat(), baoChat(), hanaChat()], {
    device: "mobile",
    answer: (c) => (c.items.some((item) => isMsg(item) && item.side === "others") ? undefined : "Hi Alex! I'm on the Android regression run today. How can I help?"),
  });
  return <PhoneMessenger m={m} label="New chat with Em Pham" />;
}

// ——— 7. Customer support (phone, Business domain) ————————————————————————————————————————————————
/* Another domain on purpose: Alex is also a member of the Phin & Co loyalty app the studio builds. */
const phinSupport: ChatPerson = { name: "Phin & Co", src: platformMedia.site[5].src };
const phinStore: ChatPerson = { name: "Lê Lợi store", theme: "brown" };
const phinDetails = (what: string, where: string): Detail[] => [
  { id: "about", title: what, caption: "Phin & Co", leading: dock("icon-briefcase-line") },
  { id: "place", title: where, caption: "Location", leading: dock("icon-marker-pin-01-line") },
];
const supportChats = (): Conv[] => [
  {
    id: "phin-support", title: phinSupport.name, person: phinSupport, status: "Member support", domain: "business", time: clock(10, 6),
    details: phinDetails("Member support, replies in about 5 minutes", "Ho Chi Minh City"), photo: platformMedia.site[5],
    attach: { name: "Receipt.pdf", file: "pdf", size: "96 KB" },
    items: [
      at("phin-d1", clock(9, 58)),
      says(phinSupport, "phin-1", "Hi Alex, this is Thảo from Phin & Co. How can I help?", { time: clock(9, 58) }),
      mine("phin-2", "I bought two cold brews this morning, but no points showed up.", { time: clock(10, 1) }),
      sends(null, "phin-3", { kind: "file", name: "Receipt.pdf", file: "pdf", size: "96 KB" }, { time: clock(10, 1) }),
      // A non-breaking hyphen keeps the order number on one line.
      says(phinSupport, "phin-4", "Thanks! I can see order PH‑20931 from 8:47 am at our Lê Lợi store.", { time: clock(10, 4) }),
      says(phinSupport, "phin-5", "I've added the 40 points by hand. They're in your balance now.", { time: clock(10, 5) }),
      mine("phin-6", "Got them, thank you!", { time: clock(10, 6) }),
    ],
  },
  {
    id: "phin-store", title: phinStore.name, person: phinStore, status: "Open until 10 pm", domain: "business", time: clock(8, 49),
    details: phinDetails("Phin & Co coffee shop", "Lê Lợi, District 1"),
    items: [at("store-d1", clock(8, 49)), says(phinStore, "store-1", "Your order PH‑20931 is ready for pickup.", { time: clock(8, 49) })],
  },
];

function CustomerSupport() {
  const m = useMessenger(supportChats(), { device: "mobile", answer: () => "Thanks, Alex. Thảo will reply here in a few minutes." });
  return <PhoneMessenger m={m} label="Phin & Co support chat" listTitle="Messages" canvas="canvas" />;
}

// ——— 8. Files, photos and calls (desktop) ———————————————————————————————————————————————————————
const saolaBrand = projectById("saola-brand");
const saolaChat = (): Conv => groupChat("Saola brand refresh", [gia, emi, linh, hana, chi, ava], {
  id: "saola", time: clock(9, 24),
  attach: { name: "Naming shortlist.docx", file: "doc", size: "240 KB" },
  photo: platformMedia.feed[6],
  // Newest last, so the window opens on the moodboard grid, the shortlist and the read list; files and calls sit above.
  items: [
    at("sao-d1", when(-1, 17, 20)),
    sends(linh, "sao-1", { kind: "file", name: "Saola tone of voice.pdf", file: "pdf", size: "1.2 MB" }),
    sends(hana, "sao-2", { kind: "file", name: "Saola budget.xlsx", file: "sheet", size: "86 KB" }),
    says(hana, "sao-3", `Phase one is ${formatMoney(saolaBrand.budget)}, and Saola has signed it off.`),
    at("sao-d2", clock(9, 2)),
    sends(emi, "sao-4", { kind: "call", call: "video", state: "in-missed", detail: clock(9, 2) }),
    sends(null, "sao-5", { kind: "call", call: "audio", state: "out-call", detail: "12 min" }),
    at("sao-d3", clock(9, 20)),
    says(gia, "sao-6", "First pass at the moodboard for the outdoor range."),
    sends(gia, "sao-7", { kind: "photo", photos: [platformMedia.feed[7], platformMedia.feed[1], platformMedia.feed[3], platformMedia.feed[4], platformMedia.feed[5]], album: "Saola moodboard" }),
    says(emi, "sao-8", "The moss one 😍 Motion could follow that slow light.", { reactions: [{ kind: "heart", by: [cp(gia), cp(linh)] }] }),
    sends(null, "sao-9", { kind: "file", name: "Naming shortlist.docx", file: "doc", size: "240 KB" }),
    mine("sao-10", "Here's the naming shortlist for Friday's workshop.", { seenBy: [gia, emi, linh, hana, chi, ava].map(cp) }),
  ],
});

function FilesPhotosCalls() {
  const m = useMessenger([saolaChat()], { device: "desktop" });
  return <DesktopThread m={m} />;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Team messenger",
    wide: true,
    screen: true,
    description: "On desktop, Conversation-List rows sit beside a thread with device=\"desktop\": text runs to 516px and each message gets the hover toolbar. Opening a chat marks it read, and Search narrows the list by name.",
    render: () => <TeamMessenger />,
    code: `const shown = chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));

<VisuallyHidden as="h1">{chat.title}</VisuallyHidden>
<aside aria-labelledby="chats">
  <Heading level={2} id="chats" textStyle="Heading/4">Chats</Heading>
  <Search placeholder="Search chats" aria-label="Search chats" value={query} onValueChange={setQuery} clearable />
  {/* The pane scrolls; rows pad 12px above and below and 16px at the sides (Conversation-List) */}
  <Box>
    <List aria-labelledby="chats">
      {shown.map((c) => (
        <ChatConversationItem key={c.id} person={c.person} group={c.group} preview={c.preview} time={c.time}
          unread={c.unread} online={c.online} selected={c.id === openId} onClick={() => open(c.id)} />
      ))}
    </List>
  </Box>
</aside>
<Divider orientation="vertical" decorative />
<section aria-label={\`Chat with \${chat.title}\`}>
  {/* Thread header: avatar, name, presence and Icon-Flat call · video · details */}
  <ChatThread device="desktop" aria-label={\`Messages with \${chat.title}\`}>
    {chat.messages.map((m) => (
      <ChatMessage key={m.id} side={m.side} author={m.author} continued={m.continued}
        holdActions={chatHoldActionsFor("text", m.side)} onHoldAction={(action) => handle(action, m)}
        reaction={picked[m.id]} onReact={(kind) => react(m.id, kind)}>{m.text}</ChatMessage>
    ))}
  </ChatThread>
  <ChatComposer device="desktop" onSend={send} replyTo={replyTo} onCancelReply={() => setReplyTo(undefined)} />
</section>`,
  },
  {
    title: "Hold to react",
    description: "On a phone, holding a message (or Shift+F10 on a focused one) blurs the chat and shows the Reaction-Bar above it and its actions below; a call offers only Call back, Report and Delete. The reaction pill names who reacted, and Delete removes the message at once with Undo in the toast.",
    render: () => <HoldToReact />,
    code: `<ChatMessage id="ava-6" side="others" author={ava}
  holdActions={chatHoldActionsFor("text", "others")} onHoldAction={(action) => handle(action, "ava-6")}
  reaction={picked} onReact={setPicked}>
  Session 3 is done too 🙌 Three out of three found the limit.
</ChatMessage>
<ChatMessage id="ava-7" side="you"
  reactions={[{ kind: "like", by: [ava] }]}
  holdActions={chatHoldActionsFor("text", "you")} onHoldAction={(action) => handle(action, "ava-7")}
  reaction={mine} onReact={setMine}>
  Great work. Let's show the team on Friday.
</ChatMessage>
<ChatMessage id="ava-5" side="others" author={ava}
  holdActions={chatHoldActionsFor("call", "others")} onHoldAction={(action) => handle(action, "ava-5")}>
  <ChatCall state="in-missed" detail="8:50 am" onAction={callBack} />
</ChatMessage>

// Delete can be undone, so it acts at once and the toast offers Undo (which closes the toast as it runs).
const handle = (action, id) => {
  if (action !== "delete") return;
  setDeleted((ids) => [...ids, id]);
  toast({ title: "Message deleted", action: { label: "Undo", onClick: () => setDeleted((ids) => ids.filter((other) => other !== id)) } });
};`,
  },
  {
    title: "Chats inbox",
    description: "Unread chats have a bold preview and a green dot; a missed call stays red until opened, and a call going on now is green. Each row opens its chat, and Back returns to the list with that chat read.",
    render: () => <ChatsInbox />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="chats" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Chats" largeTitle="Chats" scrollRef={screenRef} />}>
  <List aria-label="Chats">
    <ChatConversationItem person={chi} preview="Can you look at it before the 2 pm review?" time="2 minutes ago" unread={!read.chi} onClick={() => open("chi")} />
    <ChatConversationItem person={bao} call="missed-audio" time="13 minutes ago" unread={!read.bao} online onClick={() => open("bao")} />
    <ChatConversationItem person={{ name: "Loyalty app" }} group={[chi, bao]} call="ongoing" time="25 minutes ago" online onClick={() => open("loyalty")} />
    <ChatConversationItem person={duy} call="missed-video" time="Yesterday at 4:40 pm" online onClick={() => open("duy")} />
    <ChatConversationItem person={minhAnh} call="outgoing" time="Monday at 11:05 am" onClick={() => open("minh-anh")} />
  </List>
</PlatformPhone>`,
  },
  {
    title: "Reply to a message",
    wide: true,
    screen: true,
    description: "Reply in the hover toolbar fills the composer's “Replying to” bar, and × or Escape drops it. A sent reply quotes what it answers (text, a photo, a file, a call, or a deleted message) and pressing the quote jumps back to it.",
    render: () => <ReplyToMessage />,
    code: `<ChatMessage id="rep-3" side="others" author={em} showName
  holdActions={chatHoldActionsFor("file", "others")}
  onHoldAction={(action) => action === "reply" && setReplyTo({ id: "rep-3", author: "Em Pham", kind: "file", fileName: "checkout-crash-log.txt", fileKind: "other" })}>
  <ChatFile kind="other" name="checkout-crash-log.txt" size="84 KB" onOpen={download} />
</ChatMessage>
<ChatMessage id="rep-5" side="you" replyTo={{ id: "rep-3", author: "Em Pham", kind: "file", fileName: "checkout-crash-log.txt", fileKind: "other" }}>
  Reproduced it with Em's log: the card step drops the points discount.
</ChatMessage>
<ChatMessage id="rep-8" side="others" author={em} replyTo={{ id: "rep-gone", author: "Bao Nguyen", kind: "deleted" }}>
  Never mind, I found the second crash too.
</ChatMessage>

<ChatComposer device="desktop" replyTo={replyTo} onCancelReply={() => setReplyTo(undefined)}
  onSend={(text) => { post({ text, replyTo }); setReplyTo(undefined); }} />`,
  },
  {
    title: "Not delivered",
    description: "Without a network, a message stays in the thread with “Not delivered” and Retry instead of disappearing. Retry shows Sending… and then Sent, while the header reads Connecting… until the network is back.",
    render: () => <NotDelivered />,
    code: `<PlatformChatHeader title="Duy Le" subtitle={offline ? "Connecting…" : "Active now"} online={!offline} person={duy} onAction={onAction} />

<ChatMessage id="scope-6" side="you" failed={message.state === "failed"}
  status={message.state === "sending" ? "Sending…" : message.state === "sent" ? "Sent" : undefined}
  onRetry={() => { setState("sending"); resend().then(() => setState("sent")); }}>
  <ChatFile side="you" kind="pdf" name="Scope v4.pdf" size="2.4 MB" onOpen={download} />
</ChatMessage>`,
  },
  {
    title: "First message",
    description: "A new chat says who it is with instead of showing an empty thread, and offers one first step: Say hello sends a 👋. That first message opens the thread, and its Sent turns to Seen when Em answers.",
    render: () => <FirstMessage />,
    code: `<PlatformPhone screenRef={screenRef} header={<PlatformChatHeader title="Em Pham" subtitle="Active today" person={em} scrollRef={screenRef} onAction={onAction} />}
  footer={<ChatComposer onSend={send} actions={actions} onEmoji={toggleEmoji} />}>
  {messages.length === 0 ? (
    <EmptyState headingLevel={2} icon="icon-message-smile-circle-line" title="No messages yet"
      primaryAction={{ label: "Say hello", onClick: () => send("👋") }}>
      Em Pham is the QA engineer on the Loyalty app, based in Hanoi.
    </EmptyState>
  ) : (
    <ChatThread aria-label="Messages with Em Pham">
      {messages.map((m) => <ChatMessage key={m.id} {...act(m)} side={m.side} author={m.author}>{m.text}</ChatMessage>)}
    </ChatThread>
  )}
</PlatformPhone>`,
  },
  {
    title: "Files, photos and calls",
    wide: true,
    screen: true,
    description: "Attachments are cards: photos fill a 400px grid with “+N” past four, files take their type colour, and calls say what happened with one action. In a group, the read list under your last message replaces “Seen”.",
    render: () => <FilesPhotosCalls />,
    code: `<ChatThread device="desktop" aria-label="Messages with Saola brand refresh">
  <ChatMessage side="others" author={linh} showName><ChatFile kind="pdf" name="Saola tone of voice.pdf" size="1.2 MB" onOpen={download} /></ChatMessage>
  <ChatMessage side="others" author={hana} showName><ChatFile kind="sheet" name="Saola budget.xlsx" size="86 KB" onOpen={download} /></ChatMessage>
  <ChatDateDivider>9:02 am</ChatDateDivider>
  <ChatMessage side="others" author={emi} showName><ChatCall type="video" state="in-missed" detail="9:02 am" onAction={() => call("video")} /></ChatMessage>
  <ChatMessage side="you"><ChatCall side="you" type="audio" state="out-call" detail="12 min" onAction={() => call("audio")} /></ChatMessage>
  <ChatDateDivider>9:20 am</ChatDateDivider>
  <ChatMessage side="others" author={gia} showName><ChatPhotos photos={moodboard} onOpen={openPhoto} /></ChatMessage>
  <ChatMessage side="you"><ChatFile side="you" kind="doc" name="Naming shortlist.docx" size="240 KB" onOpen={download} /></ChatMessage>
  <ChatMessage side="you" seenBy={[gia, emi, linh, hana, chi, ava]}>Here's the naming shortlist for Friday's workshop.</ChatMessage>
</ChatThread>`,
  },
  {
    title: "Customer support",
    description: "A support chat uses the Business domain on the Canvas background: the time sits inside every bubble and card, and support answers a moment after you write.",
    render: () => <CustomerSupport />,
    code: `<PlatformPhone canvas="canvas" screenRef={screenRef} header={<PlatformChatHeader title="Phin & Co" subtitle="Member support" person={support} scrollRef={screenRef} onAction={onAction} />}
  footer={<ChatComposer onSend={send} />}>
  <ChatThread aria-label="Messages with Phin & Co">
    <ChatMessage side="others" domain="business" author={support} time="9:58 am">Hi Alex, this is Thảo from Phin & Co. How can I help?</ChatMessage>
    <ChatMessage side="you" domain="business" time="10:01 am">I bought two cold brews this morning, but no points showed up.</ChatMessage>
    <ChatMessage side="you" domain="business" time="10:01 am"><ChatFile side="you" kind="pdf" name="Receipt.pdf" size="96 KB" onOpen={download} /></ChatMessage>
    <ChatMessage side="others" domain="business" author={support} time="10:05 am">I've added the 40 points by hand. They're in your balance now.</ChatMessage>
  </ChatThread>
</PlatformPhone>`,
  },
]);
