import { useState } from "react";
import { chatHoldActionsFor, chatReactionGlyph, type ChatReaction, type ChatReactionKind, type ChatReplyTarget, type ChatSide } from "../components/Chat";
import { useToast, type ToastApi } from "../components/Toast";
import { typographyStyles } from "../tokens/typography.generated";

export type ChatDemoKind = "text" | "photo" | "file" | "call" | "voice";

/** The example card's toast queue (its ZenProvider hosts one); null where none is mounted (playground panels). */
function useOptionalToast(): ToastApi | null {
  // useToast() always calls useContext before it throws, so the hook order is the same on every render.
  try { return useToast(); } catch { return null; }
}

/** The rendered message `id` belongs to. Ids can repeat across examples on a page: the one whose menu or hold layer is
 *  open (it is acting on itself) wins, else the first. */
function messageNode(id: string) {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`));
  return all.find((node) => node.querySelector('.zen-chat-message__content[aria-expanded="true"]')) ?? all[0] ?? null;
}

/** A message's focus target: its bubble, when it takes focus (hold / hover menus). */
const bubbleOf = (node: Element | null | undefined) => node?.querySelector<HTMLElement>('.zen-chat-message__content[tabindex="0"]') ?? null;

/** Where focus goes when `node` leaves the thread: the next message, else the one before, else the example's composer. */
function focusTargetAfter(node: HTMLElement | null) {
  if (!node) return () => null;
  const siblings = (step: "nextElementSibling" | "previousElementSibling") => {
    for (let next = node[step]; next; next = next[step]) { const target = bubbleOf(next); if (target) return target; }
    return null;
  };
  const scope = node.closest(".platform-phone, .pe-chat-desktop, .pe-chat-demo, .pe-card__stage");
  const target = siblings("nextElementSibling") ?? siblings("previousElementSibling");
  return () => (target?.isConnected ? target : scope?.querySelector<HTMLTextAreaElement>(".zen-chat-composer textarea:not(:disabled)") ?? null);
}

/**
 * Platform-only demo wiring (not a DS component): every Chat example uses this so no interaction is locked.
 * `act(id, side, { kind, text, author, reply })` spreads onto a ChatMessage: it sets the message `id` (reply jumps),
 * the Figma hold/hover action set for its kind (`chatHoldActionsFor`), the Reaction-Bar and the reactions shown.
 * Actions do something visible — Reply fills the composer's reply bar (ChatComposer moves focus into its field), Delete
 * removes the message and offers Undo in a Toast (house rule: undoable → act, then Toast with Undo), Copy writes to the
 * clipboard, Call back calls, reactions stick — and everything else reports in the status line (`<ChatDemoNote />`).
 * Without a toast host (a playground panel has no ZenProvider) Delete still removes the message and announces it.
 */
export function useChatDemo(initialNote = "") {
  const toastApi = useOptionalToast();
  const [picked, setPicked] = useState<Record<string, ChatReactionKind | undefined>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | undefined>(undefined);
  const [note, setNote] = useState(initialNote);
  const actionNote: Record<string, string> = { forward: "Forward", pin: "Pinned", more: "More options", report: "Reported" };

  /** Removes a message at once, with no Undo (for flows that already confirmed it). */
  const remove = (id: string) => {
    setDeleted((all) => (all.includes(id) ? all : [...all, id]));
    setReplyTo((r) => (r?.id === id ? undefined : r));
  };
  /** Brings a deleted message back. */
  const restore = (id: string) => setDeleted((all) => all.filter((entry) => entry !== id));

  /** Delete: the message goes at once, focus moves to its neighbour, and a Toast offers Undo (which puts it back and
   *  focuses it again). */
  const deleteWithUndo = (id: string) => {
    const node = messageNode(id);
    const thread = node?.closest<HTMLElement>(".zen-chat-thread") ?? null;
    const nextFocus = focusTargetAfter(node);
    remove(id);
    setNote("Message deleted");
    // The bubble that held focus (or opened the menu) is gone: focus the next message instead of dropping to <body>.
    window.setTimeout(() => { const active = document.activeElement; if (!active || active === document.body || !active.isConnected) nextFocus()?.focus(); }, 0);
    if (!toastApi) return;
    const toastId = toastApi.toast({
      title: "Message deleted",
      action: {
        label: "Undo",
        onClick: () => {
          restore(id);
          toastApi.dismiss(toastId);
          setNote("Message restored");
          window.setTimeout(() => bubbleOf(thread?.querySelector(`[data-message-id="${CSS.escape(id)}"]`))?.focus(), 0);
        },
      },
    });
  };

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
        if (action === "delete") { deleteWithUndo(id); return; }
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
    /** Delete without the Undo toast (a flow that asked first), and put a deleted message back. */
    remove,
    restore,
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
