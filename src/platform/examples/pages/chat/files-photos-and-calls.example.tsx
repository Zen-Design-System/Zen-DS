import { useId, useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, Box, Breadcrumbs, Button, Card, ChatCall, ChatComposer,
  ChatDateDivider, ChatEmojiPicker, ChatFile, ChatMessage, ChatPhotos, ChatThread, FileIcon, Grid, Heading, IconButton, Image, List, ListBox,
  ListItem, Menu, PageHeader, SidePanel, Sidebar, SidebarMenuItem, Stack, TabPanel, Tabs, Text, Thumbnail, VisuallyHidden, chatHoldActionsFor,
  chatReactionGlyph, fileIconFormatOf, plural, useToast,
  type ChatCallState, type ChatFileKind, type ChatPerson, type ChatReaction, type ChatReactionKind, type ChatReplyTarget, type ChatSide,
  type SidebarSection,
} from "@zen-ds/react";
import {
  activity, daysFromToday, formatMoney, formatRelative, formatTime, initials, people, photos, projectById, studio, TODAY, type Person, type Photo,
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
  /** Groups: who has read your last message (replaces "Seen"). */
  seenBy?: ChatPerson[];
  delivery?: "sent";
};
type DateBreak = { kind: "divider"; id: string; label: string };
type Item = Msg | DateBreak;
type Detail = { id: string; title: string; caption: string; leading: ReactNode };
type Conv = {
  id: string;
  title: string;
  /** Everyone in it, you first (the header's AvatarStack). */
  members: ChatPerson[];
  status: string;
  /** Last activity, on the timestamp ladder. */
  time: string;
  /** Conversation details: the members. */
  details: Detail[];
  /** What Add attachment and Send a photo post in this chat. */
  attach?: { name: string; file: ChatFileKind; size: string };
  photo?: Photo;
  items: Item[];
};

const { alex, chi, ava, emi, gia, hana, linh } = people;
const cp = (p: Person): ChatPerson => ({ name: p.name, src: p.photo, theme: p.theme });
/** "9:12 am" today · "Yesterday at 4:40 pm" · "Monday at 10:15 am" (dividers show the clock for today). */
const clock = (h: number, m: number) => formatTime(daysFromToday(0, h, m));
const when = (days: number, h: number, m: number) => formatRelative(daysFromToday(days, h, m));
const now = formatTime(TODAY);

const at = (id: string, label: string): DateBreak => ({ kind: "divider", id, label });
const says = (from: Person, id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "others", from: cp(from), ...extra }) as Msg;
const mine = (id: string, text: string, extra: Partial<Msg> = {}): Msg => ({ kind: "text", text, id, side: "you", ...extra }) as Msg;
/** A photo, file or call: from someone, or from you (null). */
const sends = (from: Person | null, id: string, body: Exclude<Body, { kind: "text" }>): Msg =>
  ({ ...body, id, side: from ? "others" : "you", from: from ? cp(from) : undefined }) as Msg;

const face = (p: Person) => <Avatar size="md" theme={p.photo ? "photo" : p.theme} src={p.photo} alt="">{p.photo ? null : initials(p.name)}</Avatar>;
/** A chat person as Avatar props: their photo, or initials on their steady theme. */
const faceItem = (p: ChatPerson) => (p.src ? { theme: "photo" as const, src: p.src, alt: p.name } : { theme: p.theme ?? "neutral", alt: p.name, children: initials(p.name) });
const memberDetails = (members: Person[]): Detail[] =>
  [alex, ...members].map((p) => ({ id: p.id, title: p.id === alex.id ? `${p.name} (you)` : p.name, caption: p.role, leading: face(p) }));
const groupChat = (title: string, members: Person[], rest: Omit<Conv, "title" | "members" | "details" | "status">): Conv =>
  ({ title, members: [alex, ...members].map(cp), status: plural(members.length + 1, "member"), details: memberDetails(members), ...rest });

/** The quote a reply shows, built from the message it answers. */
const quoteOf = (m: Msg): ChatReplyTarget => {
  const base = { id: m.id, author: m.side === "you" ? "You" : m.from?.name ?? "", fromYou: m.side === "you" };
  if (m.kind === "photo") return { ...base, kind: "photo", photo: m.photos[0], count: m.photos.length };
  if (m.kind === "file") return { ...base, kind: "file", fileName: m.name, fileKind: m.file };
  if (m.kind === "call") return { ...base, kind: "call", callType: m.call, missed: m.state.endsWith("missed") };
  return { ...base, kind: "text", text: m.text };
};

// ——— The Saola brand refresh team's chat —————————————————————————————————————————————————————————————————————————————
const saolaBrand = projectById("saola-brand");
const saolaChat: Conv = groupChat("Saola brand refresh", [gia, emi, linh, hana, chi, ava], {
  id: "saola", time: clock(9, 24),
  attach: { name: "Naming shortlist.docx", file: "doc", size: "240 KB" },
  photo: photos.feed[6],
  // Newest last, so the window opens on the moodboard grid, the shortlist and the read list; files and calls sit above.
  items: [
    at("sao-d0", when(-2, 10, 15)),
    sends(hana, "sao-0a", { kind: "file", name: "Saola brief v2.pdf", file: "pdf", size: "2.1 MB" }),
    says(hana, "sao-0b", "The brief from Saola: three outdoor ranges for spring, and a new name for the hiking line."),
    sends(emi, "sao-0c", { kind: "photo", photos: [photos.feed[0], photos.feed[2], photos.feed[6]], album: "Trail scouting, Đà Lạt" }),
    says(emi, "sao-0d", "Scouting shots from the weekend, for the light and the colours."),
    sends(gia, "sao-0e", { kind: "file", name: "Logo sketches.fig", file: "other", size: "24.8 MB" }),
    at("sao-d1", when(-1, 17, 20)),
    sends(linh, "sao-1", { kind: "file", name: "Saola tone of voice.pdf", file: "pdf", size: "1.2 MB" }),
    sends(hana, "sao-2", { kind: "file", name: "Saola budget.xlsx", file: "sheet", size: "86 KB" }),
    says(hana, "sao-3", `Phase one is ${formatMoney(saolaBrand.budget)}, and Saola has signed it off.`),
    at("sao-d2", clock(9, 2)),
    sends(emi, "sao-4", { kind: "call", call: "video", state: "in-missed", detail: clock(9, 2) }),
    sends(null, "sao-5", { kind: "call", call: "audio", state: "out-call", detail: "12 min" }),
    at("sao-d3", clock(9, 20)),
    says(gia, "sao-6", "First pass at the moodboard for the outdoor range."),
    sends(gia, "sao-7", { kind: "photo", photos: [photos.feed[7], photos.feed[1], photos.feed[3], photos.feed[4], photos.feed[5]], album: "Saola moodboard" }),
    says(emi, "sao-8", "The moss one 😍 Motion could follow that slow light.", { reactions: [{ kind: "heart", by: [cp(gia), cp(linh)] }] }),
    sends(null, "sao-9", { kind: "file", name: "Naming shortlist.docx", file: "doc", size: "240 KB" }),
    mine("sao-10", "Here's the naming shortlist for Friday's workshop.", { seenBy: [gia, emi, linh, hana, chi, ava].map(cp) }),
  ],
});

/** The studio's mark and name in the Sidebar's logo slot; the mark alone on the rail. */
const studioLogo = <Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>;
const studioMark = <Thumbnail src={studio.logo} alt={studio.name} size="2xs" />;
/** The studio app's places: the chat is part of a project, so Projects stays selected. */
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "chats", label: "Chats", icon: "icon-message-chat-circle-line" },
  { id: "files", label: "Files", icon: "icon-file-doc-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];

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

/**
 * Attachments are cards: photos fill a 400px grid with "+N" past four, files take their type colour, and calls say what
 * happened with one action. In a group, the read list under your last message replaces "Seen". The chat is part of its
 * project: the trail leads back to it, and the header's Files and Photos tabs gather what the thread shared.
 */
export default function FilesPhotosCalls() {
  const { toast, dismiss } = useToast();
  const [conv, setConv] = useState(saolaChat);
  const tabsId = useId();
  const [tab, setTab] = useState("chat");
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
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the chat." });

  const edit = (change: (items: Item[]) => Item[], extra: Partial<Conv> = {}) => setConv((c) => ({ ...c, ...extra, items: change(c.items) }));
  const patch = (msgId: string, next: Partial<Msg>) => edit((items) => items.map((item) => (item.id === msgId ? ({ ...item, ...next } as Item) : item)));
  /** You send something: it carries the reply you picked. */
  const send = (body: Body) => {
    const id = `${conv.id}-${Date.now()}`;
    edit((items) => [...items, { ...body, id, side: "you", replyTo, time: now, delivery: "sent" } as Msg], { time: "Just now" });
    setReplyTo(undefined);
    setEmoji(false);
  };
  /** Calling adds a ringing call card; nobody answers in this demo, so it becomes a missed call with Call again. */
  const call = (type: "audio" | "video") => {
    const id = `${conv.id}-${Date.now()}`;
    edit((items) => [...items, { kind: "call", call: type, state: "out-call", detail: "Calling…", live: true, id, side: "you", time: now } as Msg], { time: "Just now" });
    setNote(`Calling ${conv.title}…`);
    setTimeout(() => { patch(id, { state: "out-missed", detail: "No answer", live: false } as Partial<Msg>); setNote(`${conv.title} didn't answer`); }, 2600);
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
  const openPhoto = (msg: Msg & { kind: "photo" }, index: number) => { setViewer({ msg, index }); setNote(`Opened ${msg.album}`); };
  const openFile = (msg: Msg & { kind: "file" }) => toast({ title: "File downloaded", children: `${msg.name} · ${msg.size}` });
  const bodyOf = (item: Msg) => {
    switch (item.kind) {
      case "text": return item.text;
      case "photo": return <ChatPhotos side={item.side} photos={item.photos} onOpen={(index) => openPhoto(item, index)} />;
      case "file": return <ChatFile side={item.side} kind={item.file} name={item.name} size={item.size} onOpen={() => openFile(item)} />;
      // The built-in action reads Call back or Call again; a call still ringing has none.
      case "call": return <ChatCall side={item.side} type={item.call} state={item.state} detail={item.detail} onAction={item.live ? undefined : () => call(item.call)} />;
    }
  };
  const closeEmoji = () => { setEmoji(false); setTimeout(() => emojiOpenerRef.current?.focus()); };

  // What the chat shared, newest first: the Files and Photos tabs follow the thread (a deleted message leaves them).
  const shared = conv.items.filter((item): item is Msg => isMsg(item) && !deleted.includes(item.id)).reverse();
  const sharedFiles = shared.filter((item): item is Msg & { kind: "file" } => item.kind === "file");
  const albums = shared.filter((item): item is Msg & { kind: "photo" } => item.kind === "photo");
  const photoCount = albums.reduce((sum, album) => sum + album.photos.length, 0);
  const sender = (msg: Msg) => (msg.side === "you" ? "You" : msg.from?.name ?? "");
  const shown = conv.items.filter((item) => !isMsg(item) || !deleted.includes(item.id));
  const lastYou = [...shown].reverse().find((item): item is Msg => isMsg(item) && item.side === "you");
  return (
    // Sidebar: the chat is a part of its project, so the studio's Sidebar stays on Projects and the trail leads to it.
    // The group's header holds its views as Tabs (Sections): the thread, then what it shared.
    <AppShell
      sidebar={<Sidebar logo={studioLogo} logoCollapsed={studioMark} sections={studioPlaces} selectedId="projects"
        onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
        footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />}
      // The chat's header: the trail to its project, the top row's utilities, the group's name as the page's h1 with its
      // members' faces and the chat's actions as Tertiary icon buttons, and its views as Tabs.
      header={<AppShellHeader actions={<StudioActions />}
        leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: saolaBrand.id, label: saolaBrand.name }, { id: "chat", label: "Team chat" }]}
          onNavigate={(item) => { if (item.id !== "chat") notHere(String(item.label)); }} />}
        sections={<Tabs aria-label={`${conv.title} views`} idPrefix={tabsId} value={tab} onValueChange={setTab}
          items={[{ id: "chat", label: "Chat" }, { id: "files", label: "Files", badge: sharedFiles.length }, { id: "photos", label: "Photos", badge: photoCount }]} />}
        main={(
          <PageHeader title={<span ref={titleRef} tabIndex={-1}>{conv.title}</span>}
            meta={<AvatarStack size="sm" max={4} showMore items={conv.members.map(faceItem)} />}
            description={conv.status}
            trailing={<>
              <IconButton level="tertiary" icon="icon-phone-call-line" aria-label="Voice call" onClick={() => call("audio")} />
              <IconButton level="tertiary" icon="icon-video-recorder-line" aria-label="Video call" onClick={() => call("video")} />
              <IconButton level="tertiary" icon="icon-info-circle-line" aria-label="Conversation details" onClick={() => setDetails(true)} />
            </>} />
        )} />}
    >
      <TabPanel idPrefix={tabsId} id="chat" hidden={tab !== "chat"}>
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
                    showName={others && !sameRun(shown[index - 1], item)} continued={others && sameRun(shown[index + 1], item)}
                    replyTo={item.replyTo} time={last && !ringing ? item.time : undefined} seenBy={item.seenBy}
                    status={last && item.kind !== "call" && !item.seenBy ? (item.delivery === "sent" ? "Sent" : "Seen") : undefined}>
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
                  { icon: "icon-image-line", label: "Send a photo", onClick: () => send({ kind: "photo", photos: [conv.photo ?? photos.site[5]], album: "Your photo" }) },
                ]}
                onEmoji={() => setEmoji((isOpen) => !isOpen)}
                replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); setNote("Reply cancelled"); }}
                onSend={(text) => send({ kind: "text", text })} />
            </Box>
          </Box>
          <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
        </Stack>
      </TabPanel>
      <TabPanel idPrefix={tabsId} id="files" hidden={tab !== "files"}>
        {/* Each file opens (downloads) from its row, as its card does in the thread. */}
        <ListBox theme="shadow">
          <List aria-label={`Files shared in ${conv.title}`}>
            {sharedFiles.map((msg) => (
              <ListItem key={msg.id} title={msg.name} caption={`${msg.size} · ${sender(msg)}`}
                leading={<FileIcon format={fileIconFormatOf(msg.name)} />} onClick={() => openFile(msg)} />
            ))}
          </List>
        </ListBox>
      </TabPanel>
      <TabPanel idPrefix={tabsId} id="photos" hidden={tab !== "photos"}>
        <Stack gap="lg">
          {albums.map((album) => (
            <Card key={album.id} as="section" theme="shadow" aria-label={album.album}>
              <Stack gap="md">
                <Stack direction="row" gap="sm" align="center" justify="between" wrap>
                  <Stack gap="3xs">
                    <Heading level={2} textStyle="Heading/Subheading">{album.album}</Heading>
                    <Text textStyle="Body/Small/Regular" tone="base">{`${plural(album.photos.length, "photo")} · ${sender(album)}`}</Text>
                  </Stack>
                  <Button level="tertiary" startIcon="icon-image-line" onClick={() => openPhoto(album, 0)}>View photos</Button>
                </Stack>
                <Grid columns={{ mobile: 2, desktop: 5 }} gap="sm">
                  {album.photos.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="1:1" radius="lg" />)}
                </Grid>
              </Stack>
            </Card>
          ))}
        </Stack>
      </TabPanel>
      {/* Conversation details and the photo viewer open as modal Side Panels. */}
      <SidePanel type="modal" size="small" open={details} onOpenChange={setDetails} title={conv.title} description={conv.status}>
        <List aria-label="Members">
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
