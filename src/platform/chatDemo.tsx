import { useState } from "react";
import { chatHoldActionsFor, chatReactionGlyph, type ChatReaction, type ChatReactionKind, type ChatReplyTarget, type ChatSide } from "../components/Chat";
import { typographyStyles } from "../tokens/typography.generated";

export type ChatDemoKind = "text" | "photo" | "file" | "call";

/**
 * Platform-only demo wiring (not a DS component): every Chat example uses this so no interaction is locked.
 * `act(id, side, { kind, text, author, reply })` spreads onto a ChatMessage: it sets the message `id` (reply jumps),
 * the Figma hold/hover action set for its kind (`chatHoldActionsFor`), the Reaction-Bar and the reactions shown.
 * Actions do something visible — Reply fills the composer's reply bar, Delete removes the message, Copy writes to the
 * clipboard, Call back calls, reactions stick — and everything else reports in the status line (`<ChatDemoNote />`).
 */
export function useChatDemo(initialNote = "Hold (or right-click) a message to react, reply or act on it.") {
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  const [note, setNote] = useState(initialNote);
  const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };

  /** Hold / hover / reactions for one message. `text` enables Copy and the reply preview; `reply` describes non-text
   *  messages (photo, file, call) for the reply bar; `reactions` are the ones already on the message. */
  const act = (id: string, side: ChatSide, options: { kind?: ChatDemoKind; text?: string; author?: string; reply?: Partial<Omit<ChatReplyTarget, "id">>; reactions?: ChatReaction[] } = {}) => {
    const kind = options.kind ?? "text";
    const mine = picked[id];
    const base = options.reactions ?? [];
    const reactions = mine
      ? base.some((r) => r.kind === mine) ? base.map((r) => (r.kind === mine ? { ...r, count: (r.count ?? r.by?.length ?? 1) + 1 } : r)) : [...base, { kind: mine }]
      : base;
    const who = side === "you" ? "You" : options.author ?? "them";
    return {
      id,
      holdActions: chatHoldActionsFor(kind, side),
      onHoldAction: (action: string) => {
        if (action === "delete") { setDeleted((all) => [...all, id]); setReplyTo((r) => (r?.id === id ? undefined : r)); setNote("Message deleted"); return; }
        if (action === "copy") { if (options.text) navigator.clipboard?.writeText(options.text).catch(() => undefined); setNote(options.text ? `Copied “${options.text.slice(0, 40)}”` : "Copied"); return; }
        if (action === "reply") { setReplyTo({ id, author: who, fromYou: side === "you", kind, text: options.text, ...options.reply }); setNote(`Replying to ${side === "you" ? "yourself" : who} — type in the composer`); return; }
        if (action === "call-back") { setNote(`Calling ${side === "you" ? "back" : who}…`); return; }
        setNote(`${actionNote[action] ?? action} · ${kind === "call" ? "call" : side === "you" ? "your message" : `${who}'s message`}`);
      },
      reaction: mine,
      onReact: (next: ChatReactionKind | undefined) => { setPicked((all) => ({ ...all, [id]: next })); setNote(next ? `Reacted ${chatReactionGlyph(next)}` : "Reaction removed"); },
      reactions: reactions.length ? reactions : undefined,
    };
  };

  return {
    act,
    note,
    say: setNote,
    isDeleted: (id: string) => deleted.includes(id),
    /** Spread onto ChatComposer: shows the "Replying to …" bar and lets × / Escape cancel it. */
    composerReply: { replyTo, onCancelReply: () => { setReplyTo(undefined); setNote("Reply cancelled"); } },
    /** Call when sending: returns the reply target to attach to the new message and clears the bar. */
    takeReply: () => { const target = replyTo; setReplyTo(undefined); return target; },
    openFile: (name: string) => () => setNote(`Opening ${name}`),
    openPhotos: (label: string) => (index: number) => setNote(`Opening ${label}, photo ${index + 1}`),
    callBack: (who: string) => () => setNote(`Calling ${who}…`),
    headerAction: (label: string) => () => setNote(`${label}…`),
    /** ChatComposer's default leading actions (plus · mic · photo), each with a visible result. */
    composerActions: [
      { icon: "icon-plus-circle-line" as const, label: "Add attachment", onClick: () => setNote("Add attachment: files, location, contact") },
      { icon: "icon-microphone-line" as const, label: "Record voice", onClick: () => setNote("Recording a voice message…") },
      { icon: "icon-image-line" as const, label: "Send a photo", onClick: () => setNote("Choose a photo to send") },
    ],
    onEmoji: () => setNote("Emoji picker"),
    moreReactions: () => setNote("More reactions: the full emoji picker opens here"),
  };
}

/** The example's status line: what the last interaction did (polite live region). */
export function ChatDemoNote({ note }: { note: string }) {
  return <p className={`pe-chat-note ${typographyStyles["Caption/Regular"]}`} role="status" aria-live="polite">{note}</p>;
}
