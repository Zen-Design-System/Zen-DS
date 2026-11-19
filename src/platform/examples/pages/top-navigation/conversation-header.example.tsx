import { useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomSheet, ChatAvatarGroup, ChatCall, ChatComposer, ChatMessage, ChatThread, DescriptionList, List, ListItem, Stack, Text,
  TopNavigation, VisuallyHidden, chatHoldActionsFor, chatReactionGlyph, plural, useToast,
  type ChatPerson, type ChatReactionKind, type ChatReplyTarget, type ChatSide,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, formatRelative, initials, leaveRequests, me, people, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const chatPerson = (person: Person): ChatPerson => ({ name: person.name, src: person.photo, theme: person.theme });
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
const back = "icon-chevron-left-line-medium" as const;
const firstName = (id: PersonId) => people[id].name.split(" ")[0];
// Alex's approved leave, from the studio's shared leave requests.
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
const myLeaveDays = `${formatDay(myLeave.from)} – ${formatDay(myLeave.to)}`;

/** A call Alex starts rings first, then shows "No answer" with Call again (`missed`). */
type Message = { id: string; side: ChatSide; from?: PersonId; text?: string; call?: "audio" | "video"; missed?: boolean; replyTo?: ChatReplyTarget };
/** One person, or a group (several members). Most recent first. */
type Conversation = { id: string; name: string; members: PersonId[]; seed: Message[] };
const direct = (id: PersonId, seed: Message[]): Conversation => ({ id, name: people[id].name, members: [id], seed });
const said = (id: string, side: ChatSide, text: string, from?: PersonId): Message => ({ id, side, text, from });
const conversations: Conversation[] = [
  direct("bao", [
    said("b1", "others", "The rewards API is on staging now."),
    said("b2", "others", "Points update within a second of checkout."),
    said("b3", "you", "Nice. I'll test it on the points history screen."),
    said("b4", "others", "Ping me if a total looks off."),
  ]),
  { id: "loyalty-team", name: "Loyalty app", members: ["chi", "bao", "em", "duy"], seed: [
    said("l1", "others", "Sprint 14 demo moves to Friday at 3 pm.", "duy"),
    said("l2", "others", "Works for me. I'll show the points history flows.", "chi"),
  ] },
  direct("chi", [said("c1", "others", "I've put the new points history flows in Figma."), said("c2", "you", "Thanks, I'll look before the 2 pm call.")]),
  direct("duy", [said("d1", "others", "Mekong Freight wants to restart tracking in November."), said("d2", "you", "Good news. Let's plan the kickoff next week.")]),
  direct("hana", [said("h1", "others", "Lumen Bank moved the review to Friday.")]),
  direct("ava", [said("a1", "others", "Transfer sessions are booked for Thursday and Friday.")]),
  direct("finn", [said("f1", "you", "Does the passkey spike cover Android too?"), said("f2", "others", "iOS only for now. Android is next sprint.")]),
  direct("emi", [said("e1", "others", "Uploaded the loading animation for points history.")]),
  direct("em", [said("m1", "others", "The Android build passes the regression run.")]),
  direct("gia", [said("g1", "others", "The Saola moodboard is ready for your eyes.")]),
  direct("linh", [said("n1", "others", "Can you check the copy for the Book Fair recap?")]),
  direct("khoa", [said("k1", "others", "The transfer limits endpoint is merged.")]),
  direct("minhAnh", [said("v1", "others", `Your leave for ${myLeaveDays} is approved.`)]),
  direct("mai", [said("i1", "you", "Has Lumen Bank paid INV-2026-0141?"), said("i2", "others", "Yes, it came in last Tuesday.")]),
];
const lastSeen: Partial<Record<PersonId, Date>> = { chi: minutesAgo(12), hana: daysFromToday(-1, 18, 5), ava: minutesAgo(48), gia: daysFromToday(0, 8, 55) };
const presence = (person: Person) => person.online ? "Active now" : lastSeen[person.id as PersonId] ? `Active ${formatRelative(lastSeen[person.id as PersonId]!).toLowerCase()}` : "Offline";
/** What the hold actions without a screen of their own report in the status line. */
const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };

/** Messages: the conversation's identity header, with one pill for the audio and video calls. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ConversationHeader({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast, dismiss } = useToast();
  const [openId, setOpenId] = useState<string | null>("bao");
  const [fromId, setFromId] = useState<string | null>("bao");
  const [threads, setThreads] = useState(() => Object.fromEntries(conversations.map((c) => [c.id, c.seed])) as Record<string, Message[]>);
  const [profile, setProfile] = useState(false);
  // Every message action does something visible: reactions stick, Reply fills the composer, Delete offers Undo, and
  // the rest report in a status line for screen readers.
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  // Focus follows the screen: a conversation focuses its title, Back returns to the row you came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const goBack = () => {
    setProfile(false);
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const add = (message: Omit<Message, "id">) => {
    if (!openId) return;
    const id = `${openId}-${Date.now()}`;
    setThreads((all) => ({ ...all, [openId]: [...all[openId], { ...message, id }] }));
    return id;
  };
  // The demo call is never answered: after a few rings the card turns into a missed call you can try again.
  const call = (type: "audio" | "video") => {
    const thread = openId, id = add({ side: "you", call: type });
    setTimeout(() => thread && setThreads((all) => ({ ...all, [thread]: all[thread].map((m) => m.id === id ? { ...m, missed: true } : m) })), 4000);
  };
  // Delete: the message goes at once and a toast offers Undo. The bubble that had focus is gone, so focus moves to the
  // conversation's title.
  const remove = (id: string) => {
    setDeleted((all) => (all.includes(id) ? all : [...all, id]));
    setReplyTo((target) => (target?.id === id ? undefined : target));
    setNote("Message deleted");
    setTimeout(() => titleRef.current?.focus());
    const toastId = toast({
      title: "Message deleted",
      action: { label: "Undo", onClick: () => { setDeleted((all) => all.filter((entry) => entry !== id)); dismiss(toastId); setNote("Message restored"); } },
    });
  };
  /** Hold (or hover) actions and reactions for one message, spread onto its ChatMessage. */
  const actions = (id: string, side: ChatSide, kind: "text" | "call", text?: string, author?: string) => {
    const who = side === "you" ? "You" : author ?? "them";
    const mine = picked[id];
    return {
      id,
      holdActions: chatHoldActionsFor(kind, side),
      onHoldAction: (action: string) => {
        if (action === "delete") { remove(id); return; }
        if (action === "copy") { if (text) navigator.clipboard?.writeText(text).catch(() => undefined); setNote(text ? `Copied “${text.slice(0, 40)}”` : "Copied"); return; }
        if (action === "reply") { setReplyTo({ id, author: who, fromYou: side === "you", kind, text }); setNote(`Replying to ${side === "you" ? "yourself" : who} — type in the composer`); return; }
        if (action === "call-back") { setNote(`Calling ${side === "you" ? "back" : who}…`); return; }
        setNote(`${actionNote[action] ?? action} · ${kind === "call" ? "call" : side === "you" ? "your message" : `${who}'s message`}`);
      },
      reaction: mine,
      onReact: (next: ChatReactionKind | undefined) => { setPicked((all) => ({ ...all, [id]: next })); setNote(next ? `Reacted ${chatReactionGlyph(next)}` : "Reaction removed"); },
      reactions: mine ? [{ kind: mine }] : undefined,
    };
  };

  const chat = conversations.find((c) => c.id === openId);
  if (!chat) {
    return (
      <AppShell key="root" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Messages" largeTitle="Messages" />}>
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge. */}
        <List aria-label="Conversations">
          {conversations.map(({ id, name, members }) => {
            const last = threads[id][threads[id].length - 1];
            const who = last.side === "you" ? "You: " : members.length > 1 ? `${firstName(last.from!)}: ` : "";
            const one = members.length === 1 ? people[members[0]] : null;
            return (
              <ListItem key={id} ref={id === fromId ? rowRef : undefined} tabIndex={id === fromId ? -1 : undefined}
                title={name} caption={last.call ? `${last.call === "audio" ? "Audio" : "Video"} call${last.missed ? " · No answer" : ""}` : `${who}${last.text}`}
                leading={one ? <Avatar size="md" status={one.online} {...avatarOf(one)} /> : <ChatAvatarGroup size="md" people={members.map((m) => chatPerson(people[m]))} />}
                onClick={() => open(id)} />
            );
          })}
        </List>
      </AppShell>
    );
  }

  const one = chat.members.length === 1 ? people[chat.members[0]] : null;
  const status = one ? presence(one) : plural(chat.members.length + 1, "member");
  return (
    <>
      <AppShell key={chat.id}
        // Identity header: Default type, compact margin, the person (or group) as the title and one pill for both calls.
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" margin="compact" title={<span ref={titleRef} tabIndex={-1}>{chat.name}</span>} subtitle={status}
          titleLeading={one ? <Avatar size="lg" background="subtle" status={one.online} {...avatarOf(one)} /> : <ChatAvatarGroup size="lg" people={chat.members.map((m) => chatPerson(people[m]))} />}
          onTitleClick={() => setProfile(true)} titleLabel={`${chat.name}, ${status.toLowerCase()}. ${one ? "Open profile" : "Open group info"}`}
          leading={{ icon: back, label: "Back", onClick: goBack }}
          trailing={[
            { icon: "icon-phone-line", label: "Audio call", group: "call", onClick: () => call("audio") },
            { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: () => call("video") },
          ]} />}
        // The composer is the screen's input bar, pinned where an Action bar goes.
        actionBar={<ChatComposer
          actions={[
            { icon: "icon-plus-circle-line", label: "Add attachment", onClick: () => setNote("Add attachment: files, location, contact") },
            { icon: "icon-microphone-line", label: "Record voice", onClick: () => setNote("Recording a voice message…") },
            { icon: "icon-image-line", label: "Send a photo", onClick: () => setNote("Choose a photo to send") },
          ]}
          onEmoji={() => setNote("Emoji picker")}
          replyTo={replyTo} onCancelReply={() => { setReplyTo(undefined); setNote("Reply cancelled"); }}
          onSend={(text) => { add({ side: "you", text, replyTo }); setReplyTo(undefined); }} />}>
        {/* The thread fills the screen above the composer, edge to edge like a messaging app: the newest message rests on
            the composer and a short thread starts at the bottom (the thread keeps its own padding). */}
        <Stack fillChildren style={{ flex: "1 1 auto", marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))", marginBlockEnd: "calc(-1 * var(--zen-app-shell-body-pad-end, 20px))" }}>
          <ChatThread aria-label={`Conversation with ${chat.name}`}>
            {threads[chat.id].filter((message) => !deleted.includes(message.id)).map((message) => {
              if (message.call) {
                return (
                  <ChatMessage key={message.id} {...actions(message.id, "you", "call")} side="you" time="Just now">
                    {message.missed
                      ? <ChatCall side="you" type={message.call} state="out-missed" detail="No answer" onAction={() => call(message.call!)} />
                      : <ChatCall side="you" type={message.call} state="out-call" detail="Calling…" />}
                  </ChatMessage>
                );
              }
              const author = people[message.from ?? chat.members[0]];
              return (
                <ChatMessage key={message.id} {...actions(message.id, message.side, "text", message.text, author.name)} side={message.side}
                  author={message.side === "others" ? chatPerson(author) : undefined} replyTo={message.replyTo}>{message.text}</ChatMessage>
              );
            })}
          </ChatThread>
        </Stack>
        <VisuallyHidden as="p" role="status" aria-live="polite">{note}</VisuallyHidden>
      </AppShell>
      <BottomSheet inline open={profile} onOpenChange={setProfile} title={chat.name}>
        {one ? (
          <Stack gap="md">
            <Stack direction="row" gap="md" align="center">
              <Avatar size="xl" {...avatarOf(one)} />
              <Stack gap="xs">
                <Text textStyle="Body/Base/Bold">{one.role}</Text>
                <Text textStyle="Body/Small/Regular" tone="base">{`${one.team} · ${status}`}</Text>
              </Stack>
            </Stack>
            <DescriptionList items={[
              { term: "Email", description: one.email },
              { term: "Location", description: one.location },
            ]} />
          </Stack>
        ) : (
          <List aria-label="Members">
            {[me.id as PersonId, ...chat.members].map((id) => (
              <ListItem key={id} title={id === me.id ? `${people[id].name} (you)` : people[id].name} caption={people[id].role} leading={<Avatar size="md" {...avatarOf(people[id])} />} />
            ))}
          </List>
        )}
      </BottomSheet>
    </>
  );
}
