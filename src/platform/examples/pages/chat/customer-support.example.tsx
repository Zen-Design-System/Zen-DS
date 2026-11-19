import { useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, BottomSheet, Box, ChatCall, ChatComposer, ChatConversationItem, ChatDateDivider, ChatEmojiPicker, ChatFile,
  ChatMessage, ChatPhotos, ChatThread, DockIcon, Image, List, ListItem, Stack, TopNavigation, VisuallyHidden, chatHoldActionsFor, chatReactionGlyph,
  plural, useToast,
  type BottomNavigationItem, type ChatCallState, type ChatConversationItemProps, type ChatFileKind, type ChatPerson, type ChatReaction,
  type ChatReactionKind, type ChatReplyTarget, type ChatSide,
} from "@zen-ds/react";
import { daysFromToday, formatTime, initials, photos, TODAY, type Photo } from "../../data";

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
  /** Others: who sent it (their avatar). */
  from?: ChatPerson;
  /** Business: the time sits inside every bubble and card. */
  time?: string;
  reactions?: ChatReaction[];
  replyTo?: ChatReplyTarget;
  /** Your message went out; none: they have seen it (support answered). */
  delivery?: "sent";
};
type DateBreak = { kind: "divider"; id: string; label: string };
type Item = Msg | DateBreak;
type Detail = { id: string; title: string; caption: string; leading: ReactNode };
type Conv = {
  id: string;
  title: string;
  person: ChatPerson;
  status: string;
  online?: boolean;
  unread?: boolean;
  /** List row time, on the timestamp ladder. */
  time: string;
  /** The chat's details: what it is and where. */
  details: Detail[];
  /** What Add attachment posts in this chat. */
  attach?: { name: string; file: ChatFileKind; size: string };
  items: Item[];
};

const firstName = (name: string) => name.split(" ")[0];
/** "9:58 am" today. */
const clock = (h: number, m: number) => formatTime(daysFromToday(0, h, m));
const now = formatTime(TODAY);

const at = (id: string, label: string): DateBreak => ({ kind: "divider", id, label });
const says = (from: ChatPerson, id: string, text: string, time: string): Msg => ({ kind: "text", text, id, side: "others", from, time });
const mine = (id: string, text: string, time: string): Msg => ({ kind: "text", text, id, side: "you", time });

const dock = (icon: "icon-briefcase-line" | "icon-marker-pin-01-line") => <DockIcon size="md" theme="neutral" background="subtle" icon={icon} />;
const phinDetails = (what: string, where: string): Detail[] => [
  { id: "about", title: what, caption: "Phin & Co", leading: dock("icon-briefcase-line") },
  { id: "place", title: where, caption: "Location", leading: dock("icon-marker-pin-01-line") },
];

/** The quote a reply shows, built from the message it answers. */
const quoteOf = (m: Msg): ChatReplyTarget => {
  const base = { id: m.id, author: m.side === "you" ? "You" : m.from?.name ?? "", fromYou: m.side === "you" };
  if (m.kind === "photo") return { ...base, kind: "photo", photo: m.photos[0], count: m.photos.length };
  if (m.kind === "file") return { ...base, kind: "file", fileName: m.name, fileKind: m.file };
  if (m.kind === "call") return { ...base, kind: "call", callType: m.call, missed: m.state.endsWith("missed") };
  return { ...base, kind: "text", text: m.text };
};

// ——— Alex's messages in the Phin & Co app (he is also a member of the loyalty app the studio builds) —————————————————
const phinSupport: ChatPerson = { name: "Phin & Co", src: photos.site[5].src };
const phinStore: ChatPerson = { name: "Lê Lợi store", theme: "brown" };
const chats: Conv[] = [
  {
    id: "phin-support", title: phinSupport.name, person: phinSupport, status: "Member support", time: clock(10, 6),
    details: phinDetails("Member support, replies in about 5 minutes", "Ho Chi Minh City"),
    attach: { name: "Receipt.pdf", file: "pdf", size: "96 KB" },
    items: [
      at("phin-d1", clock(9, 58)),
      says(phinSupport, "phin-1", "Hi Alex, this is Thảo from Phin & Co. How can I help?", clock(9, 58)),
      mine("phin-2", "I bought two cold brews this morning, but no points showed up.", clock(10, 1)),
      { kind: "file", name: "Receipt.pdf", file: "pdf", size: "96 KB", id: "phin-3", side: "you", time: clock(10, 1) },
      // A non-breaking hyphen keeps the order number on one line.
      says(phinSupport, "phin-4", "Thanks! I can see order PH‑20931 from 8:47 am at our Lê Lợi store.", clock(10, 4)),
      says(phinSupport, "phin-5", "I've added the 40 points by hand. They're in your balance now.", clock(10, 5)),
      mine("phin-6", "Got them, thank you!", clock(10, 6)),
    ],
  },
  {
    id: "phin-store", title: phinStore.name, person: phinStore, status: "Open until 10 pm", time: clock(8, 49),
    details: phinDetails("Phin & Co coffee shop", "Lê Lợi, District 1"),
    items: [at("store-d1", clock(8, 49)), says(phinStore, "store-1", "Your order PH‑20931 is ready for pickup.", clock(8, 49))],
  },
];

/** The Phin & Co app (a member's view): Messages holds the support chats. */
const roots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "order", label: "Order", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
  { id: "chats", label: "Messages", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
];

const isMsg = (item: Item): item is Msg => item.kind !== "divider";
/** A run of messages from one person shows their avatar once, on the last. */
const sameRun = (other: Item | undefined, item: Msg) => other !== undefined && isMsg(other) && other.side === item.side && other.from?.name === item.from?.name;
/** What the hold actions without a screen of their own report in the status line. */
const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };
const actionToast: Record<string, string> = { copy: "Message copied", forward: "Message forwarded", pin: "Message pinned", report: "Call reported" };

/** A list row from the chat's last message: "You: …", a call state, or a photo / file line. */
function rowOf(c: Conv, deleted: string[]): Omit<ChatConversationItemProps, "onClick" | "selected"> {
  const last = [...c.items].reverse().find((item): item is Msg => isMsg(item) && !deleted.includes(item.id));
  const sender = last?.side === "you" ? "You" : firstName(last?.from?.name ?? "");
  const preview = !last ? "No messages yet"
    : last.kind === "text" ? (last.side === "you" ? `You: ${last.text}` : last.text)
    : last.kind === "photo" ? `${sender} sent ${last.photos.length === 1 ? "a photo" : plural(last.photos.length, "photo")}`
    : last.kind === "file" ? `${sender} sent ${last.name}` : undefined;
  const call: ChatConversationItemProps["call"] = last?.kind !== "call" ? undefined
    : last.side === "you" ? "outgoing"
    : last.state === "in-missed" ? (last.call === "audio" ? "missed-audio" : "missed-video") : "incoming";
  // The built-in preview reads Missed call · Audio call; a video call that went through says so.
  const callLabel = (call === "incoming" || call === "outgoing") && last?.kind === "call" && last.call === "video" ? "Video call" : undefined;
  return { person: c.person, preview, call, callLabel, time: c.time, unread: c.unread, online: c.online };
}

/**
 * A support chat in the Phin & Co app: the Business domain puts the time inside every bubble and card, and support answers
 * a moment after you write. Back leads to the app's Messages, a tab root.
 */
// scrollRef: what scrolls the screen, so the bar shows its rule once messages run under it. "window" in your app.
export default function CustomerSupport({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast, dismiss } = useToast();
  const [openId, setOpenId] = useState<string | null>("phin-support");
  // The chat that is open is read.
  const [convs, setConvs] = useState(() => chats.map((c) => (c.id === "phin-support" ? { ...c, unread: false } : c)));
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  const [emoji, setEmoji] = useState(false);
  const [moreFor, setMoreFor] = useState<Msg | null>(null);
  const [viewer, setViewer] = useState<{ msg: Msg & { kind: "photo" }; index: number } | null>(null);
  const [details, setDetails] = useState(false);
  // What the last action did, for screen readers.
  const [note, setNote] = useState("");
  // Focus follows the screen: a chat focuses its title, Back the chat list.
  const titleRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // ChatComposer gives no ref to its emoji button: the composer remembers the control last focused in it (the button
  // that opened the emoji panel), and the panel hands focus back to it when it closes.
  const emojiPanelRef = useRef<HTMLElement>(null);
  const emojiOpenerRef = useRef<HTMLElement | null>(null);
  const conv = convs.find((c) => c.id === openId);
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the chat." });

  const edit = (convId: string, change: (items: Item[]) => Item[], extra: Partial<Conv> = {}) =>
    setConvs((all) => all.map((c) => (c.id === convId ? { ...c, ...extra, items: change(c.items) } : c)));
  const patch = (convId: string, msgId: string, next: Partial<Msg>) =>
    edit(convId, (items) => items.map((item) => (item.id === msgId ? ({ ...item, ...next } as Item) : item)));

  /** Opens a chat (it is read now) or, with null, the chat list. Leaving a chat drops its reply bar and emoji panel. */
  const show = (id: string | null) => {
    if (replyTo) { setReplyTo(undefined); setNote("Reply cancelled"); }
    setEmoji(false);
    setOpenId(id);
    if (id) setConvs((all) => all.map((c) => (c.id === id ? { ...c, unread: false } : c)));
    setTimeout(() => (id ? titleRef.current : listRef.current)?.focus());
  };
  /** You send something: it carries the reply you picked, and support answers a moment later. */
  const send = (body: Body) => {
    if (!conv) return;
    const { id: convId, person } = conv;
    const id = `${convId}-${Date.now()}`;
    edit(convId, (items) => [...items, { ...body, id, side: "you", replyTo, time: now, delivery: "sent" } as Msg], { time: "Just now", unread: false });
    setReplyTo(undefined);
    setEmoji(false);
    // An answer means they read it: your message turns from Sent to Seen.
    setTimeout(() => edit(convId, (items) => [
      ...items.map((item) => (item.id === id ? ({ ...item, delivery: undefined } as Item) : item)),
      { kind: "text", text: "Thanks, Alex. Thảo will reply here in a few minutes.", id: `${id}-answer`, side: "others", from: person, time: now } as Msg,
    ]), 1400);
  };
  /** Calling adds a ringing call card; nobody answers in this demo, so it becomes a missed call with Call again. */
  const call = (type: "audio" | "video") => {
    if (!conv) return;
    const { id: convId, title } = conv;
    const id = `${convId}-${Date.now()}`;
    edit(convId, (items) => [...items, { kind: "call", call: type, state: "out-call", detail: "Calling…", live: true, id, side: "you", time: now } as Msg], { time: "Just now" });
    setNote(`Calling ${title}…`);
    setTimeout(() => { patch(convId, id, { state: "out-missed", detail: "No answer", live: false } as Partial<Msg>); setNote(`${title} didn't answer`); }, 2600);
  };
  /** Delete can be undone, so it acts at once and the toast offers Undo. The bubble that had focus is gone: focus moves to the chat's title. */
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
  /** Hold actions and reactions for one message, spread onto its ChatMessage. */
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
        else if (action === "more") setMoreFor(m);
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

  // ——— Messages: a tab root with the large-title bar and the tab bar —————————————————————————————————————————————————
  if (!conv) {
    const unread = convs.some((c) => c.unread);
    return (
      <AppShell key="chats"
        topNavigation={<TopNavigation title="Messages" largeTitle="Messages" scrollRef={scrollRef}
          trailing={[{ icon: "icon-edit-01-line", label: "New chat", onClick: () => toast({ title: "New chat", children: "Pick a person or a group to write to." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label="Phin & Co" showLabels value="chats"
          items={roots.map((root) => (root.id === "chats" ? { ...root, dot: unread } : root))}
          onValueChange={(id) => { if (id !== "chats") notHere(roots.find((root) => root.id === id)?.label ?? id); }} />}
      >
        {/* Conversation-List rows run edge to edge with their own 16px sides (Figma 375 wide): the list takes back the
            body's side margins. ChatConversationItem gives no ref to its row, so Back focuses the list. */}
        <Box style={{ marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))" }}>
          <List ref={listRef} tabIndex={-1} aria-label="Messages">
            {convs.map((c) => <ChatConversationItem key={c.id} {...rowOf(c, deleted)} onClick={() => show(c.id)} />)}
          </List>
        </Box>
        <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
      </AppShell>
    );
  }

  // ——— A chat: the conversation header, the thread edge to edge, and the composer where an Action bar goes ———————————
  const shown = conv.items.filter((item) => !isMsg(item) || !deleted.includes(item.id));
  const lastYou = [...shown].reverse().find((item): item is Msg => isMsg(item) && item.side === "you");
  const online = Boolean(conv.online);
  const person = conv.person;
  return (
    <AppShell key={conv.id}
      // The conversation header (Figma ◆ Social): Back, the person and their presence (the title opens the details) and
      // one pill for both calls. The thread scrolls the screen, so the bar shows its rule once messages run under it.
      topNavigation={<TopNavigation type="alt" margin="compact" scrollRef={scrollRef} title={<span ref={titleRef} tabIndex={-1}>{conv.title}</span>} subtitle={conv.status}
        titleLeading={<Avatar size="large" theme={person.src ? "photo" : person.theme ?? "neutral"} background="subtle" src={person.src} alt="" status={online}>{person.src ? null : initials(person.name)}</Avatar>}
        onTitleClick={() => setDetails(true)} titleLabel={`${conv.title}, ${conv.status}. Open details`}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => show(null) }}
        trailing={[
          { icon: "icon-phone-line", label: "Audio call", group: "call", onClick: () => call("audio") },
          { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: () => call("video") },
        ]} />}
      actionBar={(
        // The emoji panel floats above the composer's emoji button, over the thread: a pick sends it; Escape, Back or a
        // click outside closes it.
        <Box style={{ position: "relative" }} onFocus={(event) => { if (!emojiPanelRef.current?.contains(event.target)) emojiOpenerRef.current = event.target; }}>
          {emoji ? (
            // zen-allow-raw-position: ChatEmojiPicker is its own Popover surface; it sits 8px above the composer it belongs to.
            <Box ref={emojiPanelRef} tabIndex={-1} style={{ position: "absolute", zIndex: 5, right: "var(--zen-spacing-padding-xsmall, 8px)", bottom: "calc(100% + var(--zen-spacing-padding-xsmall, 8px))" }}
              onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closeEmoji(); } }}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== emojiOpenerRef.current) setEmoji(false); }}>
              <ChatEmojiPicker label="Choose an emoji" onPick={(glyph) => { send({ kind: "text", text: glyph }); closeEmoji(); }} onBack={closeEmoji} />
            </Box>
          ) : null}
          <ChatComposer
            actions={[
              { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => send({ kind: "file", ...(conv.attach ?? { name: "Meeting notes.pdf", file: "pdf", size: "640 KB" }) }) },
              { icon: "icon-microphone-line", label: "Record voice", onClick: () => toast({ title: "Hold to record", children: "Release to send the voice message." }) },
              { icon: "icon-image-line", label: "Send a photo", onClick: () => send({ kind: "photo", photos: [photos.site[5]], album: "Your photo" }) },
            ]}
            onEmoji={() => setEmoji((open) => !open)}
            replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); setNote("Reply cancelled"); }}
            onSend={(text) => send({ kind: "text", text })} />
        </Box>
      )}
    >
      {/* The thread keeps its own 16px padding edge to edge (Figma Chat 375): it takes back the body's margins and fills
          the screen, so the newest message sits right above the composer. */}
      <Stack gap="none" fillChildren style={{ flex: "1 1 auto", minHeight: 0, marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))", marginBlockEnd: "calc(-1 * var(--zen-app-shell-body-pad-end, 20px))" }}>
        <ChatThread aria-label={`Messages with ${conv.title}`}>
          {shown.map((item, index) => {
            if (!isMsg(item)) return <ChatDateDivider key={item.id}>{item.label}</ChatDateDivider>;
            const last = item === lastYou;
            // A call that is still ringing gets its time once it ends (Business shows it inside the card).
            const ringing = item.kind === "call" && Boolean(item.live);
            return (
              <ChatMessage key={item.id} {...act(item)} side={item.side} domain="business" author={item.side === "others" ? item.from : undefined}
                continued={item.side === "others" && sameRun(shown[index + 1], item)} replyTo={item.replyTo}
                time={!ringing ? item.time : undefined} status={last && item.kind !== "call" ? (item.delivery === "sent" ? "Sent" : "Seen") : undefined}>
                {bodyOf(item)}
              </ChatMessage>
            );
          })}
        </ChatThread>
      </Stack>
      <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
      {/* The hold menu's More, the chat's details and the photo viewer open as sheets over the whole screen. */}
      <BottomSheet type="action" open={Boolean(moreFor)} onOpenChange={(open) => { if (!open) setMoreFor(null); }} title="More"
        items={[
          { id: "pin", label: "Pin message", icon: "icon-pin-02-line" },
          { id: "remind", label: "Remind me", icon: "icon-bell-01-line" },
          ...(moreFor?.side === "others" ? [{ id: "report", label: "Report message", icon: "icon-flag-01-line" as const }] : []),
        ]}
        onSelect={(item) => toast(item.id === "pin" ? { title: "Message pinned" } : item.id === "remind" ? { title: "Reminder set", children: "Tomorrow at 9:00 am" } : { title: "Message reported" })} />
      <BottomSheet open={details} onOpenChange={setDetails} title={conv.title}>
        <List aria-label="Contact details">
          {conv.details.map((row) => <ListItem key={row.id} title={row.title} caption={row.caption} leading={row.leading} />)}
        </List>
      </BottomSheet>
      <BottomSheet size="max" open={Boolean(viewer)} onOpenChange={(open) => { if (!open) setViewer(null); }} title={viewer?.msg.album ?? ""}>
        {viewer ? (
          <Image src={viewer.msg.photos[viewer.index].src} alt={viewer.msg.photos[viewer.index].alt} ratio="3:4" radius="lg"
            caption={`Photo ${viewer.index + 1} of ${viewer.msg.photos.length} · ${viewer.msg.from?.name ?? "You"}`} />
        ) : null}
      </BottomSheet>
    </AppShell>
  );
}
