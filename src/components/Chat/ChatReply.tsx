import { IconButton } from "../Button";
import { DockIcon, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { resolveZenLabels } from "../_shared/labels";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import type { ChatFileKind, ChatSide } from "./Chat";
import "./chat-reply.css";
import "../Icon/core";

/**
 * Reply to a message (no Figma set yet — composed from Zen tokens and the Chat primitives, following the common
 * pattern of Messenger / iMessage / WhatsApp / Slack):
 * - the composer shows a "Replying to …" bar above the field (Escape or × cancels);
 * - the sent reply carries a quote above its bubble — "Ava replied to you" + a muted preview of the original —
 *   and pressing the quote jumps to the original message and flashes it. The quote of a deleted message is plain
 *   text, not a button: there is nothing left to jump to.
 * The preview adapts to what is being replied to: text (2 lines), photo(s), file, call, voice or a deleted message.
 */
export type ChatReplyKind = "text" | "photo" | "file" | "call" | "voice" | "deleted";

export interface ChatReplyTarget {
  /** The original message's id (ChatMessage `id`), used to jump back to it. */
  id: string;
  /** Who sent the original. */
  author: string;
  /** The original was your own message ("You replied to yourself", "Replying to yourself"). */
  fromYou?: boolean;
  kind: ChatReplyKind;
  /** text: the message; other kinds: an optional caption shown instead of the default label. */
  text?: string;
  /** photo: the first photo (thumbnail) and how many were sent. */
  photo?: { src: string; alt: string };
  count?: number;
  /** file: name and kind (drives the Dock Icon, as in ChatFile). */
  fileName?: string;
  fileKind?: ChatFileKind;
  /** call: audio or video, and whether it was missed. */
  callType?: "audio" | "video";
  missed?: boolean;
  /** voice: duration label ("0:42"). */
  duration?: string;
}

const fileTheme: Record<ChatFileKind, DockIconTheme> = { doc: "blue", pdf: "red", sheet: "green", other: "neutral" };
const fileIcon: Record<ChatFileKind, IconName> = { doc: "icon-file-doc-line", pdf: "icon-file-doc-line", sheet: "icon-table-line", other: "icon-file-attachment-05-line" };

/** The summary text of a reply preview (`chatReplySummary`); English by default. */
export interface ChatReplyLabels {
  /** One photo: "Photo". */
  replyPhoto: string;
  /** Several photos: "3 photos". */
  replyPhotos: (count: number) => string;
  /** A file sent without a name: "File". */
  replyFile: string;
  /** A call: "audio call", "Missed video call". */
  replyCall: (type: "audio" | "video", missed: boolean) => string;
  /** A voice message, with its duration when known: "Voice message · 0:42". */
  replyVoice: (duration?: string) => string;
  /** A deleted message: "Message unavailable". */
  replyUnavailable: string;
}

/** The English summary text: the `en` dictionary (ZenLabels has every ChatReplyLabels key). */
const englishReplyLabels: ChatReplyLabels = resolveZenLabels("en");

/**
 * What a reply shows for the original: a leading visual, a one-line summary, and an optional trailing thumbnail.
 * `labels` translates the summary text (all or some of ChatReplyLabels, e.g. `useZenLabels()`; English by default).
 */
export function chatReplySummary(target: ChatReplyTarget, labels?: Partial<ChatReplyLabels>): { icon?: IconName; text: string; thumb?: { src: string; alt: string }; file?: ChatFileKind } {
  const text = labels ? { ...englishReplyLabels, ...labels } : englishReplyLabels;
  switch (target.kind) {
    case "photo": {
      const n = target.count ?? 1;
      // The photo itself leads the preview; the image glyph is only a fallback when there is no thumbnail.
      return { icon: target.photo ? undefined : "icon-image-line", text: target.text ?? (n > 1 ? text.replyPhotos(n) : text.replyPhoto), thumb: target.photo };
    }
    case "file": return { file: target.fileKind ?? "other", text: target.fileName ?? text.replyFile };
    case "call": {
      const video = target.callType === "video";
      return { icon: target.missed ? (video ? "icon-video-recorder-off-line" : "icon-phone-x-line") : video ? "icon-video-recorder-line" : "icon-phone-line", text: text.replyCall(video ? "video" : "audio", Boolean(target.missed)) };
    }
    case "voice": return { icon: "icon-microphone-line", text: text.replyVoice(target.duration) };
    case "deleted": return { icon: "icon-slash-circle-01-line", text: text.replyUnavailable };
    default: return { text: target.text ?? "" };
  }
}

/** Shared body of the quote and the composer bar: leading icon / file Dock Icon · summary · trailing photo thumb. */
function ChatReplyBody({ target, lines = 1 }: { target: ChatReplyTarget; lines?: 1 | 2 }) {
  const t = useZenLabels();
  const summary = chatReplySummary(target, t);
  return (
    <>
      {summary.thumb ? <img className="zen-chat-reply__thumb" src={summary.thumb.src} alt="" loading="lazy" /> : null}
      {summary.file ? <DockIcon size="xsmall" theme={fileTheme[summary.file]} background={summary.file === "other" ? "subtle" : "solid"} icon={fileIcon[summary.file]} /> : null}
      {summary.icon ? <span className="zen-chat-reply__glyph" aria-hidden="true"><Icon name={summary.icon} size="sm" decorative /></span> : null}
      <span className={`zen-chat-reply__text ${typographyStyles["Body/Small/Regular"]}`} data-lines={lines} data-deleted={target.kind === "deleted" ? "true" : undefined}>{summary.text}</span>
    </>
  );
}

/** Find the original message in the same thread, scroll to it and flash it. */
export function jumpToChatMessage(from: HTMLElement | null, id: string) {
  const scope = from?.closest(".zen-chat-thread") ?? document;
  const target = scope.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  target.removeAttribute("data-flash");
  void target.offsetWidth; // restart the flash if the same message is jumped to twice
  target.setAttribute("data-flash", "true");
  window.setTimeout(() => target.removeAttribute("data-flash"), 1600);
  target.querySelector<HTMLElement>("[data-holdable], .zen-chat-message__content")?.focus({ preventScroll: true });
}

/**
 * In the thread: the quote above a reply bubble. `side` is the reply's side (it aligns with the reply);
 * `replier` names who replied ("You" for your own replies) for the caption. Pressing the quote jumps to the original
 * (`onJump`, or scroll + flash in the same thread); the quote of a deleted message ("Message unavailable") is plain
 * text with no hover, since there is nothing to jump to.
 */
export function ChatReplyQuote({ target, side, replier, onJump }: { target: ChatReplyTarget; side: ChatSide; replier?: string; onJump?: (id: string) => void }) {
  const t = useZenLabels();
  const who = side === "you" ? t.you : replier ?? t.they;
  const whom = target.fromYou ? (side === "you" ? t.yourself : t.youObject) : side === "others" && replier === target.author ? t.themselves : target.author;
  const caption = t.repliedTo(who, whom);
  const summary = chatReplySummary(target, t);
  return (
    <div className="zen-chat-reply" data-side={side}>
      <span className={`zen-chat-reply__caption ${typographyStyles["Caption/Regular"]}`}><Icon name="icon-reply-solid" size="xs" decorative />{caption}</span>
      {target.kind === "deleted" ? (
        <span className="zen-chat-reply__quote" data-kind={target.kind} data-static="true"><ChatReplyBody target={target} lines={2} /></span>
      ) : (
        <button type="button" className="zen-chat-reply__quote" data-kind={target.kind} aria-label={`${caption}: ${summary.text}. ${t.goToOriginal}`}
          onClick={(event) => { if (onJump) onJump(target.id); else jumpToChatMessage(event.currentTarget, target.id); }}>
          <ChatReplyBody target={target} lines={2} />
        </button>
      )}
    </div>
  );
}

/** In the composer: the "Replying to …" bar above the field, with × to cancel. */
export function ChatComposerReply({ target, onCancel }: { target: ChatReplyTarget; onCancel?: () => void }) {
  const t = useZenLabels();
  const label = t.replyingTo(target.fromYou ? t.yourself : target.author);
  return (
    <div className="zen-chat-composer-reply" role="status" aria-live="polite">
      <span className="zen-chat-composer-reply__body">
        <span className={`zen-chat-composer-reply__title ${typographyStyles["Body/Small/Medium"]}`}>{label}</span>
        <span className="zen-chat-composer-reply__preview"><ChatReplyBody target={target} /></span>
      </span>
      {onCancel ? <IconButton appearance="flat" level="primary" size="sm" aria-label={t.cancelReply} onClick={onCancel} icon={<Icon name="icon-x-small-line" />} /> : null}
    </div>
  );
}

