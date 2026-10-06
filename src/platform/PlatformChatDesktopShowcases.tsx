import { useState, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Divider } from "../components/Divider";
import { IconButton } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { List } from "../components/ListItem";
import { Search } from "../components/Search";
import { chatHoldActionsFor, ChatCall, ChatComposer, ChatConversationItem, ChatDateDivider, ChatFile, ChatMessage, ChatPhotos, ChatThread, type ChatPerson, type ChatReaction, type ChatReplyTarget, type ChatSide } from "../components/Chat";
import { typographyStyles } from "../tokens/typography.generated";
import { mobilePeople } from "./PlatformMobileData";
import { platformMedia } from "./PlatformMedia";
import { useChatDemo } from "./chatDemo";

/* Desktop chat examples (Figma Chat Device=Desktop): 516px text, 400px photo grids, the desktop Chat-Control. */

type ExampleDef = { title: string; description: string; code: string; wide?: boolean; /** A whole desktop screen: the card offers Full screen. */ screen?: boolean; render: () => ReactNode };
type Msg = { id: number; side: "you" | "others"; text: string; author?: ChatPerson; replyTo?: ChatReplyTarget };

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Desktop thread header: avatar · name + presence · call / video / details (Button/Icon-Flat Medium, with tooltips). The
 *  desktop counterpart of the mobile TopNavigation chat header (PlatformChatHeader). */
export function ThreadHeader({ person, status, actions = [], onAction }: { person: ChatPerson; status: string; actions?: { icon: IconName; label: string }[]; onAction?: (label: string) => void }) {
  return (
    <>
    <div className="pe-chat-desktop__header">
      <Avatar size="medium" theme={person.src ? "photo" : person.theme ?? "neutral"} background="subtle" src={person.src} alt="" status={status === "Active now"}>{person.src ? null : initials(person.name)}</Avatar>
      <div className="pe-chat-desktop__who">
        <span className={`pe-chat-desktop__name ${typographyStyles["Body/Base/Bold"]}`}>{person.name}</span>
        <span className={`pe-chat-desktop__status ${typographyStyles["Body/Small/Regular"]}`}>{status}</span>
      </div>
      <div className="pe-chat-desktop__actions">
        {/* IconButton shows its aria-label as the tooltip (1s hover, instant on focus). */}
        {actions.map((a) => <IconButton key={a.label} appearance="flat" level="primary" size="md" aria-label={a.label} icon={<Icon name={a.icon} />} onClick={() => onAction?.(a.label)} />)}
      </div>
    </div>
    {/* The only line in the thread pane: the messages scroll under a static header. The composer needs none (its field is its own shape). */}
    <Divider decorative />
    </>
  );
}

export const headerActions: { icon: IconName; label: string }[] = [{ icon: "icon-phone-call-line", label: "Voice call" }, { icon: "icon-video-recorder-line", label: "Video call" }, { icon: "icon-info-circle-line", label: "Conversation details" }];

const scripts: Record<string, string[]> = {
  ava: ["Did you get the brand files?", "The PDF is the latest one — colours, type and lockups are all updated.", "Yes! Reviewing now, looks great.", "The icon stroke went from 1.5 to 1.75 for the small sizes.", "Makes sense. I'll update the Figma library this afternoon.", "Perfect, ping me when it's published."],
  bao: ["Merged the token PR 🎉", "Nice! Did the dark theme snapshots pass?", "All green after the last fix.", "Great, I'll cut the release notes.", "Perfect, tag me when they're up."],
  chi: ["Standup moved to 10:30 tomorrow.", "Thanks for the heads-up!", "Can you bring the usability findings?", "Sure, I'll share the top five."],
  duy: ["Can you review the icons?", "On it — anything specific?", "Mostly the 16px set, some look blurry.", "I'll check pixel snapping.", "Thanks! The bell and calendar icons are the worst."],
  emi: ["Lunch at 12?", "Sounds good, the usual place?", "Yes, see you there."],
};

/** Figma Chat Desktop: a two-pane messenger — Conversation-List items on the left, the thread + desktop Chat-Control on the right. */
/** Desktop Hover: every message gets the hover toolbar (React · Reply/Share · More) from the same chatHoldActions the
 *  mobile hold menu uses; reactions and the last action are kept per example so the toolbar does something visible. */
function useDesktopActions() {
  const demo = useChatDemo();
  const act = (id: string, side: ChatSide, kind: "text" | "photo" | "file" | "call" = "text", extra: { text?: string; author?: string; reply?: Partial<Omit<ChatReplyTarget, "id">>; reactions?: ChatReaction[] } = {}) => demo.act(id, side, { kind, ...extra });
  return { ...demo, act };
}

function ChatDesktopMessengerExample() {
  const { act, note: actionNote, isDeleted, composerReply, takeReply, composerActions, onEmoji, openFile, openPhotos, callBack, moreReactions, say } = useDesktopActions();
  // Mixed avatars: three photos and two initials people (Gia, Hana).
  const people = [mobilePeople.ava, mobilePeople.bao, mobilePeople.gia, mobilePeople.duy, mobilePeople.hana];
  const ids = ["ava", "bao", "chi", "duy", "emi"];
  const [active, setActive] = useState("ava");
  const [read, setRead] = useState<string[]>(["ava"]);
  const [threads, setThreads] = useState<Record<string, Msg[]>>(() => Object.fromEntries(ids.map((id, p) => [id, scripts[id].map((text, i) => ({ id: i, side: i % 2 === 0 ? "others" : "you", text, author: people[p] }) as Msg)])));
  const [query, setQuery] = useState("");
  const person = people[ids.indexOf(active)];
  const msgs = threads[active];
  const open = (id: string) => { setActive(id); setRead((r) => (r.includes(id) ? r : [...r, id])); };
  const visible = ids.filter((id, i) => people[i].name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="pe-chat-desktop">
      <aside className="pe-chat-desktop__list" aria-label="Chats">
        <div className="pe-chat-desktop__list-head">
          <h3 className={`pe-chat-desktop__title ${typographyStyles["Heading/4"]}`}>Messages</h3>
          <Search placeholder="Search people" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
        </div>
        <List aria-label="Conversations">
          {visible.map((id) => { const i = ids.indexOf(id); const last = threads[id][threads[id].length - 1]; return (
            // Only a thread whose last message came from the other person can be unread; "You: …" rows are always read.
            <ChatConversationItem key={id} person={people[i]} preview={last.side === "you" ? `You: ${last.text}` : last.text} time={i === 0 ? "now" : `${i * 12}m`} unread={last.side === "others" && !read.includes(id)} online={i % 2 === 0} selected={active === id} onClick={() => open(id)} />
          ); })}
        </List>
      </aside>
      <Divider orientation="vertical" decorative className="pe-chat-desktop__split" />
      <section className="pe-chat-desktop__main" aria-label={`Chat with ${person.name}`}>
        <ThreadHeader person={person} status={ids.indexOf(active) % 2 === 0 ? "Active now" : "Active 1h ago"} actions={headerActions} onAction={(label) => say(`${label} · ${person.name}…`)} />
        <ChatThread device="desktop" aria-label={`Messages with ${person.name}`}>
          <ChatDateDivider>Today 09:12</ChatDateDivider>
          {msgs.filter((m) => !isDeleted(`${active}-${m.id}`)).map((m, i, shown) => {
            const continued = m.side === "others" && shown[i + 1]?.side === "others";
            const lastYou = m.side === "you" && !shown.slice(i + 1).some((n) => n.side === "you");
            return <ChatMessage {...act(`${active}-${m.id}`, m.side, "text", { text: m.text, author: m.author?.name, reactions: m.id === 1 ? [{ kind: "like", by: [person] }] : undefined })} key={m.id} side={m.side} author={m.author} continued={continued} time={lastYou ? "09:41" : undefined} status={lastYou ? "Seen" : undefined} replyTo={m.replyTo}>{m.text}</ChatMessage>;
          })}
        </ChatThread>
        <p className={`pe-chat-desktop__note ${typographyStyles["Caption/Regular"]}`} role="status">{actionNote}</p>
        <ChatComposer device="desktop" actions={composerActions} onEmoji={onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => setThreads((t) => ({ ...t, [active]: [...t[active], { id: Date.now(), side: "you", text: "👍" }] })) }} {...composerReply}
          onSend={(text) => { const replyTo = takeReply(); setThreads((t) => ({ ...t, [active]: [...t[active], { id: Date.now(), side: "you", text, replyTo }] })); }} />
      </section>
    </div>
  );
}

/** Business on desktop: Surface bubbles on Canvas, time inside every bubble and card, a file + a photo card, and an auto-reply. */
function ChatDesktopBusinessExample() {
  const { act, note: actionNote, isDeleted, composerReply, takeReply, composerActions, onEmoji, openFile, openPhotos, callBack, moreReactions, say } = useDesktopActions();
  const support: ChatPerson = { name: "Zen Support", theme: "accent" };
  const [msgs, setMsgs] = useState<Msg[]>([]);
  return (
    <div className="pe-chat-desktop pe-chat-desktop--single" data-domain="business">
      <section className="pe-chat-desktop__main" aria-label="Chat with Zen Support">
        <ThreadHeader person={support} status="Typically replies in 5 minutes" actions={[{ icon: "icon-info-circle-line", label: "Ticket details" }]} onAction={(label) => say(`${label} · #4821`)} />
        <ChatThread device="desktop" aria-label="Support conversation">
          <ChatDateDivider>Today 09:30</ChatDateDivider>
          {isDeleted("busi10") ? null : <ChatMessage {...act("busi10", "others", "text", { text: "Hi Ava! I'm Linh from Zen Support.", author: support.name })} side="others" domain="business" author={support} continued time="09:30">Hi Ava! I'm Linh from Zen Support.</ChatMessage>}
          {isDeleted("busi11") ? null : <ChatMessage {...act("busi11", "others", "text", { text: "I can see your export failed at 64%. Could you send the log file?", author: support.name })} side="others" domain="business" author={support} time="09:30">I can see your export failed at 64%. Could you send the log file?</ChatMessage>}
          {isDeleted("busi12") ? null : <ChatMessage {...act("busi12", "you", "file")} side="you" domain="business" time="09:34"><ChatFile side="you" kind="doc" name="export-log-2026-09-27.txt" size="84 KB" onOpen={openFile("export-log-2026-09-27.txt")} /></ChatMessage>}
          {isDeleted("busi13") ? null : <ChatMessage {...act("busi13", "you", "text", { text: "Here it is. It happens with the brand board, which has lots of photos." })} side="you" domain="business" time="09:34">Here it is. It happens with the brand board, which has lots of photos.</ChatMessage>}
          {isDeleted("busi14") ? null : <ChatMessage {...act("busi14", "others", "text", { text: "Thanks! Two images are larger than 40 MB — these ones:", author: support.name })} side="others" domain="business" author={support} continued time="09:38">Thanks! Two images are larger than 40 MB — these ones:</ChatMessage>}
          {isDeleted("busi15") ? null : <ChatMessage {...act("busi15", "others", "photo", { author: support.name })} side="others" domain="business" author={support} time="09:38"><ChatPhotos photos={platformMedia.site.slice(0, 2)} onOpen={openPhotos("the oversized images")} /></ChatMessage>}
          {isDeleted("busi16") ? null : <ChatMessage {...act("busi16", "you", "text", { text: "Got it, I'll compress them and retry." })} side="you" domain="business" time="09:40">Got it, I'll compress them and retry.</ChatMessage>}
          {msgs.filter((m) => !isDeleted(`busi-${m.id}`)).map((m) => <ChatMessage {...act(`busi-${m.id}`, m.side, "text", { text: m.text, author: support.name })} key={m.id} side={m.side} domain="business" author={m.side === "others" ? support : undefined} time="09:41" replyTo={m.replyTo}>{m.text}</ChatMessage>)}
        </ChatThread>
        <p className={`pe-chat-desktop__note ${typographyStyles["Caption/Regular"]}`} role="status">{actionNote}</p>
        <ChatComposer device="desktop" actions={composerActions} onEmoji={onEmoji} quickAction={{ icon: "icon-attachment-01-line", label: "Attach a file", onClick: () => say("Attach a file…") }} {...composerReply}
          onSend={(text) => { const replyTo = takeReply(); setMsgs((m) => [...m, { id: Date.now(), side: "you", text, replyTo }, { id: Date.now() + 1, side: "others", text: "Thanks — I've added that to your ticket #4821." }]); }} />
      </section>
    </div>
  );
}

/** Group media on desktop: the 400px grid (4+ with "+N", and the overlapping pair), calls, reactions and a read list. */
function ChatDesktopMediaExample() {
  const { act, note: actionNote, isDeleted, composerReply, takeReply, composerActions, onEmoji, openFile, openPhotos, callBack, moreReactions, say } = useDesktopActions();
  const [sent, setSent] = useState<Msg[]>([]);
  const team: ChatPerson = { name: "Design team" };
  return (
    <div className="pe-chat-desktop pe-chat-desktop--single">
      <section className="pe-chat-desktop__main" aria-label="Design team chat">
        <ThreadHeader person={team} status="5 members · Chi is typing…" actions={headerActions} onAction={(label) => say(`${label} · Design team…`)} />
        <ChatThread device="desktop" aria-label="Design team">
          <ChatDateDivider>Yesterday 18:04</ChatDateDivider>
          {isDeleted("medi10") ? null : <ChatMessage {...act("medi10", "others", "photo", { author: mobilePeople.bao.name })} side="others" author={mobilePeople.bao} showName><ChatPhotos photos={platformMedia.site} onOpen={openPhotos("the site visit photos")} /></ChatMessage>}
          {isDeleted("medi11") ? null : <ChatMessage {...act("medi11", "others", "text", { text: "These are from the site visit — the courtyard light was amazing 👆", author: mobilePeople.chi.name })} side="others" author={mobilePeople.chi} showName reactions={[{ kind: "heart", by: [mobilePeople.ava, mobilePeople.bao, mobilePeople.gia] }, { kind: "like", by: [mobilePeople.duy] }]}>These are from the site visit — the courtyard light was amazing 👆</ChatMessage>}
          {isDeleted("medi12") ? null : <ChatMessage {...act("medi12", "you", "photo")} side="you"><ChatPhotos side="you" photos={platformMedia.feed.slice(0, 2)} onOpen={openPhotos("your photos")} /></ChatMessage>}
          {isDeleted("medi13") ? null : <ChatMessage {...act("medi13", "you", "text", { text: "Two more from the drive back." })} side="you">Two more from the drive back.</ChatMessage>}
          <ChatDateDivider>Today 09:05</ChatDateDivider>
          {isDeleted("medi15") ? null : <ChatMessage {...act("medi15", "others", "call", { author: mobilePeople.ava.name })} side="others" author={mobilePeople.ava} showName><ChatCall type="video" state="in-missed" detail="09:02" onAction={callBack("Ava")} /></ChatMessage>}
          {isDeleted("medi16") ? null : <ChatMessage {...act("medi16", "you", "call")} side="you" time="09:07"><ChatCall side="you" type="audio" state="out-call" detail="12 mins" /></ChatMessage>}
          {isDeleted("medi17") ? null : <ChatMessage {...act("medi17", "you", "text", { text: "Sorry I missed that — just called you back." })} side="you" seenBy={[mobilePeople.ava, mobilePeople.bao, mobilePeople.chi, mobilePeople.duy, mobilePeople.emi, mobilePeople.finn, mobilePeople.gia]}>Sorry I missed that — just called you back.</ChatMessage>}
          {sent.filter((m) => !isDeleted(`medi-${m.id}`)).map((m) => <ChatMessage {...act(`medi-${m.id}`, "you", "text", { text: m.text })} key={m.id} side="you" replyTo={m.replyTo}>{m.text}</ChatMessage>)}
        </ChatThread>
        <p className={`pe-chat-desktop__note ${typographyStyles["Caption/Regular"]}`} role="status">{actionNote}</p>
        <ChatComposer device="desktop" actions={composerActions} onEmoji={onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => setSent((m) => [...m, { id: Date.now(), side: "you", text: "👍" }]) }} {...composerReply}
          onSend={(text) => { const replyTo = takeReply(); setSent((m) => [...m, { id: Date.now(), side: "you", text, replyTo }]); }} />
      </section>
    </div>
  );
}

/** Reply to every message type: Reply (hover on desktop, hold on mobile) fills the composer's "Replying to" bar; sending
 *  posts a reply whose quote previews the original — text, photos, file, call, voice or a deleted message — and pressing
 *  the quote jumps back to it. */
function ChatReplyExample() {
  type Msg = { id: string; side: ChatSide; text?: string; replyTo?: ChatReplyTarget; body?: "photos" | "file" | "call" };
  const originals: Record<string, ChatReplyTarget> = {
    r1: { id: "r1", author: "Chi Tran", kind: "text", text: "Can someone check the export? It stops at 64% whenever the brand board has more than 40 photos." },
    r2: { id: "r2", author: "Bao Nguyen", kind: "photo", photo: platformMedia.site[0], count: 4 },
    r3: { id: "r3", author: "Chi Tran", kind: "file", fileName: "export-log-2026-09-27.txt", fileKind: "doc" },
    r4: { id: "r4", author: "Bao Nguyen", kind: "call", callType: "video", missed: true },
  };
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "r1", side: "others", text: originals.r1.text },
    { id: "r2", side: "others", body: "photos" },
    { id: "r3", side: "others", body: "file" },
    { id: "r4", side: "others", body: "call" },
    { id: "m5", side: "you", text: "Looking into it now — the log helps.", replyTo: originals.r3 },
    { id: "m6", side: "others", text: "The second one is the widest shot.", replyTo: originals.r2 },
    { id: "m7", side: "you", text: "Sorry, I was presenting. Calling back in 5.", replyTo: originals.r4 },
    { id: "m8", side: "others", text: "Never mind, found it.", replyTo: { id: "gone", author: "Bao Nguyen", kind: "deleted" } },
  ]);
  const [replying, setReplying] = useState<ChatReplyTarget | undefined>(originals.r1);
  const demo = useChatDemo();
  const authorOf = (m: Msg) => m.id === "r2" || m.id === "r4" ? mobilePeople.bao : mobilePeople.chi;
  const targetOf = (m: Msg): ChatReplyTarget => originals[m.id] ?? { id: m.id, author: m.side === "you" ? "You" : authorOf(m).name, fromYou: m.side === "you", kind: "text", text: m.text };
  return (
    <div className="pe-chat-desktop pe-chat-desktop--single">
      <ChatThread device="desktop" aria-label="Design team">
        {msgs.filter((m) => !demo.isDeleted(m.id)).map((m) => {
          // Shared demo wiring (reactions, Copy, Delete, …) with this example's own Reply: the rich originals r1–r4.
          const wired = demo.act(m.id, m.side, { kind: m.body === "call" ? "call" : m.body === "file" ? "file" : m.body === "photos" ? "photo" : "text", text: m.text, author: m.side === "others" ? authorOf(m).name : undefined });
          return (
            <ChatMessage key={m.id} {...wired} id={m.id} side={m.side} author={m.side === "others" ? authorOf(m) : undefined} showName={m.side === "others"}
              replyTo={m.replyTo} onHoldAction={(action) => { if (action === "reply") setReplying(targetOf(m)); else wired.onHoldAction(action); }}>
              {m.body === "photos" ? <ChatPhotos photos={platformMedia.site} onOpen={demo.openPhotos("Bao's photos")} />
                : m.body === "file" ? <ChatFile kind="doc" name="export-log-2026-09-27.txt" size="84 KB" onOpen={demo.openFile("export-log-2026-09-27.txt")} />
                : m.body === "call" ? <ChatCall type="video" state="in-missed" detail="09:02" onAction={demo.callBack("Bao")} />
                : m.text}
            </ChatMessage>
          );
        })}
      </ChatThread>
      <p className={`pe-chat-desktop__note ${typographyStyles["Caption/Regular"]}`} role="status">{demo.note}</p>
      <ChatComposer device="desktop" actions={demo.composerActions} onEmoji={demo.onEmoji} quickAction={{ icon: "icon-thumbs-up-line", label: "Send a like", onClick: () => setMsgs((all) => [...all, { id: `n${Date.now()}`, side: "you", text: "👍" }]) }}
        replyTo={replying} onCancelReply={() => setReplying(undefined)}
        onSend={(text) => { setMsgs((all) => [...all, { id: `n${Date.now()}`, side: "you", text, replyTo: replying }]); setReplying(undefined); }} />
    </div>
  );
}

export const chatDesktopExamples: ExampleDef[] = [
  { title: "Desktop messenger", screen: true, wide: true, description: "Two panes: Conversation-List items (search, unread, selected) beside the thread. Desktop text runs to 516px; the desktop Chat-Control keeps plus · mic · photo while empty. Pick a chat or send a message.", render: () => <ChatDesktopMessengerExample />, code: `<aside aria-label="Chats">
  <Search placeholder="Search people" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
  <List aria-label="Conversations">
    {chats.map((c) => <ChatConversationItem key={c.id} person={c.person} preview={c.last} time={c.time} unread={c.unread} selected={c.id === active} onClick={() => open(c.id)} />)}
  </List>
</aside>
<section aria-label={\`Chat with \${person.name}\`}>
  <ChatThread device="desktop">…</ChatThread>
  <ChatComposer device="desktop" onSend={send} />
</section>` },
  { title: "Desktop support (Business)", screen: true, wide: true, description: "Business on desktop: time inside every bubble and card, a log file from you, the two oversized images from support, and an automatic reply when you send.", render: () => <ChatDesktopBusinessExample />, code: `<ChatThread device="desktop">
  <ChatMessage side="others" domain="business" author={support} time="09:30">I can see your export failed at 64%…</ChatMessage>
  <ChatMessage side="you" domain="business" time="09:34"><ChatFile side="you" kind="doc" name="export-log.txt" size="84 KB" /></ChatMessage>
  <ChatMessage side="others" domain="business" author={support} time="09:38"><ChatPhotos photos={photos} /></ChatMessage>
</ChatThread>
<ChatComposer device="desktop" quickAction={{ icon: "icon-attachment-01-line", label: "Attach a file" }} onSend={send} />` },
  { title: "Desktop group media", screen: true, wide: true, description: "400px photo grids (4+ with “+N”, and the overlapping pair), a missed video call with Call back, a finished call, reactions (hover a message → React, with “+” for any emoji; the pill shows who reacted) and a 5+ read list.", render: () => <ChatDesktopMediaExample />, code: `<ChatThread device="desktop">
  <ChatMessage side="others" author={bao} showName><ChatPhotos photos={sitePhotos} /></ChatMessage>
  <ChatMessage side="you"><ChatPhotos side="you" photos={twoPhotos} /></ChatMessage>
  <ChatMessage side="others" author={ava} showName><ChatCall type="video" state="in-missed" detail="09:02" onAction={callBack} /></ChatMessage>
  <ChatMessage side="you" seenBy={readers}>Sorry I missed that — just called you back.</ChatMessage>
</ChatThread>
// Reactions come from the hover toolbar (React · "+"), not a standalone picker under the thread.` },
  { title: "Reply to any message", screen: true, wide: true, description: "Reply from the hover toolbar (desktop) or the hold menu (mobile) fills the composer's \u201cReplying to\u201d bar (\u00d7 or Escape cancels). The sent reply quotes the original — text (2 lines), photos, a file, a missed call, or a deleted message — and pressing the quote jumps back to it.", render: () => <ChatReplyExample />, code: `<ChatMessage id="r3" side="others" author={chi} holdActions={chatHoldActionsFor("file", "others")}
  onHoldAction={(action) => action === "reply" && setReplying({ id: "r3", author: "Chi Tran", kind: "file", fileName: "export-log.txt", fileKind: "doc" })}>
  <ChatFile kind="doc" name="export-log.txt" size="84 KB" />
</ChatMessage>
<ChatMessage id="m5" side="you" replyTo={{ id: "r3", author: "Chi Tran", kind: "file", fileName: "export-log.txt", fileKind: "doc" }}>
  Looking into it now — the log helps.
</ChatMessage>
<ChatComposer device="desktop" replyTo={replying} onCancelReply={() => setReplying(undefined)}
  onSend={(text) => { post({ text, replyTo: replying }); setReplying(undefined); }} />` },
];
