import { createContext, isValidElement, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar, type AvatarTheme } from "../Avatar";
import { Badge } from "../Badge";
import { Button, IconButton } from "../Button";
import { DockIcon, type DockIconTheme } from "../DockIcon";
import { Icon, type IconName } from "../Icon";
import { ListItem } from "../ListItem";
import { Popover } from "../Popover";
import { ZenPortal } from "../Portal";
import { useModal } from "../Dialog/Dialog";
import { TopNavigationActionButton } from "../TopNavigation";
import { useIconTooltip } from "../Tooltip";
import { scaleKey } from "../_shared/scale";
import { renderIcon } from "../_shared/icon";
import { resolveZenLabels, type ZenLabels } from "../_shared/labels";
import { useZenLabels } from "../_shared/zen-context";
import { ChatComposerReply, ChatReplyQuote, type ChatReplyTarget } from "./ChatReply";
import { ChatReactorsPanel } from "./ChatReactors";
import { typographyStyles } from "../../tokens/typography.generated";
import { ChatEmojiPicker } from "./ChatEmojiPicker";
import "./chat.css";
import "../Icon/core";

/** Figma Side: You (right, Bubble-Chat-You) · Others (left, Surface + Neutral/Subtle, with a 24px avatar). */
export type ChatSide = "you" | "others";
/** Figma Domain: Social (radius 20, time under the thread) · Business (radius 16, time inside the bubble). */
export type ChatDomain = "social" | "business";
/** Figma Chat/Reaction/Emoji set. */
export const chatReactionEmojis = { like: "👍", heart: "❤️", lol: "😆", surprised: "😮", sad: "😢", angry: "😡" } as const;
/** One of the six quick reactions, or any emoji picked from the "+" panel. */
export type ChatQuickReaction = keyof typeof chatReactionEmojis;
export type ChatReactionKind = ChatQuickReaction | (string & {});
/** The glyph for a reaction: quick kinds map to their emoji, anything else is already an emoji. */
export const chatReactionGlyph = (kind: ChatReactionKind) => (chatReactionEmojis as Record<string, string>)[kind] ?? kind;

export interface ChatPerson { name: string; src?: string; theme?: AvatarTheme }
export interface ChatReaction {
  kind: ChatReactionKind;
  count?: number;
  /** Who reacted: pressing the pill then opens the "Reactions" panel (ChatReactorsPanel) listing them by emoji. */
  by?: ChatPerson[];
}

export interface ChatMessageProps {
  side: ChatSide;
  domain?: ChatDomain;
  /** Others: who sent it (the avatar and, when `showName`, the name above the bubble). */
  author?: ChatPerson;
  /** Show the author's name above the bubble (Figma Name; group chats). */
  showName?: boolean;
  /** Hide the avatar but keep its space (follow-up messages in a run). */
  continued?: boolean;
  /** Business: inside the bubble (Caption/Regular). Social: under the bubble. */
  time?: ReactNode;
  /** Figma Sent: a status line under your last message ("Sent", "Seen"). */
  status?: ReactNode;
  /** Your message could not be sent: a Negative "Not delivered" line with a Retry action replaces the status. */
  failed?: boolean;
  onRetry?: () => void;
  reactions?: ChatReaction[];
  /** Figma Chat/Section/Read-List: people who have seen the message. */
  seenBy?: ChatPerson[];
  /** Figma Bubble-*-Content: plain text is wrapped in a text bubble; pass ChatFile / ChatCall / ChatPhotos as-is. */
  children: ReactNode;
  /** Message id (→ data-message-id): lets a reply's quote jump back to this message. */
  id?: string;
  /** This message replies to another: a quote of the original sits above the bubble (ChatReplyQuote). */
  replyTo?: ChatReplyTarget;
  /** Pressing the quote; defaults to scrolling to `[data-message-id]` in the same thread and flashing it. */
  onJumpToReply?: (id: string) => void;
  /**
   * Hold to react (Figma Chat/Bubble/Focused/*, mobile): a long press, right-click, or Shift+F10 / the Menu key on the focused
   * message opens a blurred layer with the Reaction-Bar above the bubble and these actions below it (Popover/Default).
   * On desktop (ChatThread device="desktop") the same actions live in the Hover toolbar; right-click / Shift+F10 opens its More menu.
   * Use `chatHoldActions` for the Figma sets: their built-in labels show in the ZenProvider locale, your own labels as written.
   */
  holdActions?: ChatHoldAction[];
  onHoldAction?: (id: string) => void;
  /** Your reaction to this message (selected in the Reaction-Bar); `onReact` enables the bar. */
  reaction?: ChatReactionKind;
  onReact?: (kind: ChatReactionKind | undefined) => void;
  /** Reaction-Bar "+": open a full emoji picker. */
  onMoreReactions?: () => void;
  className?: string;
}

export interface ChatHoldAction {
  id: string;
  /** Menu text. The built-in actions' English labels (chatHoldActions) show in the ZenProvider locale. */
  label: string;
  /** An icon name ("icon-reply-solid") or your own icon element. */
  icon: IconName | ReactElement;
  destructive?: boolean;
}

/** The built-in hold actions' labels in English (the `en` dictionary); every other locale translates them. */
const englishHoldLabels = resolveZenLabels("en").holdActions;
/** Built-in hold action id → its ZenLabels `holdActions` key. */
const holdLabelKeys = new Map<string, keyof ZenLabels["holdActions"]>([
  ["reply", "reply"], ["forward", "forward"], ["copy", "copy"], ["pin", "pin"], ["delete", "delete"], ["report", "report"], ["call-back", "callBack"], ["more", "more"],
]);

/** Built-in actions that still carry their English label take the given text; labels you wrote yourself stay. */
function localizeHoldActions(actions: ChatHoldAction[], labels: Partial<ZenLabels["holdActions"]>): ChatHoldAction[] {
  return actions.map((action) => {
    const key = holdLabelKeys.get(action.id);
    const label = key && action.label === englishHoldLabels[key] ? labels[key] : undefined;
    return label === undefined || label === action.label ? action : { ...action, label };
  });
}

/**
 * Figma hold menus: text from others · your text · a call. Delete is Content/Negative/Light. The labels are English;
 * ChatMessage shows them in the ZenProvider locale (or pass labels to `chatHoldActionsFor`).
 */
export const chatHoldActions = {
  others: [
    { id: "reply", label: englishHoldLabels.reply, icon: "icon-reply-solid" },
    { id: "forward", label: englishHoldLabels.forward, icon: "icon-share-01-solid" },
    { id: "copy", label: englishHoldLabels.copy, icon: "icon-copy-solid" },
    { id: "delete", label: englishHoldLabels.delete, icon: "icon-trash-solid", destructive: true },
    { id: "more", label: englishHoldLabels.more, icon: "icon-dots-horizontal-line" },
  ],
  you: [
    { id: "reply", label: englishHoldLabels.reply, icon: "icon-reply-solid" },
    { id: "copy", label: englishHoldLabels.copy, icon: "icon-copy-solid" },
    { id: "delete", label: englishHoldLabels.delete, icon: "icon-trash-solid", destructive: true },
    { id: "more", label: englishHoldLabels.more, icon: "icon-dots-horizontal-line" },
  ],
  /** Figma Focused/File (6220:59108): Reply · Forward · Pin · Delete (plus the Reaction-Bar). */
  file: [
    { id: "reply", label: englishHoldLabels.reply, icon: "icon-reply-solid" },
    { id: "forward", label: englishHoldLabels.forward, icon: "icon-share-01-solid" },
    { id: "pin", label: englishHoldLabels.pin, icon: "icon-pin-02-solid" },
    { id: "delete", label: englishHoldLabels.delete, icon: "icon-trash-solid", destructive: true },
  ],
  /** Figma Focused/Call, Side=Others: Call back · Report · Delete (no Reaction-Bar). */
  call: [
    { id: "call-back", label: englishHoldLabels.callBack, icon: "icon-phone-incoming-solid" },
    { id: "report", label: englishHoldLabels.report, icon: "icon-alert-triangle-solid" },
    { id: "delete", label: englishHoldLabels.delete, icon: "icon-trash-solid", destructive: true },
  ],
  /** Figma Focused/Call, Side=You: Call back · Delete. */
  callYou: [
    { id: "call-back", label: englishHoldLabels.callBack, icon: "icon-phone-incoming-solid" },
    { id: "delete", label: englishHoldLabels.delete, icon: "icon-trash-solid", destructive: true },
  ],
} satisfies Record<string, ChatHoldAction[]>;

/**
 * The Figma hold/hover action set for a message: text & photos by side, files their own, calls by side.
 * `labels` (e.g. `useZenLabels().holdActions`, or a few entries of it) replaces the English action text.
 */
export function chatHoldActionsFor(kind: "text" | "photo" | "file" | "call", side: ChatSide, labels?: Partial<ZenLabels["holdActions"]>): ChatHoldAction[] {
  const actions = kind === "file" ? chatHoldActions.file : kind === "call" ? (side === "you" ? chatHoldActions.callYou : chatHoldActions.call) : chatHoldActions[side];
  return labels ? localizeHoldActions(actions, labels) : actions;
}

const isText = (node: ReactNode) => typeof node === "string" || typeof node === "number";

/** The message a file / call / photo card sits in: Business cards take its time inside (Figma Footed). */
const ChatMessageContext = createContext<{ domain: ChatDomain; time?: ReactNode }>({ domain: "social" });
/** Set by ChatThread: desktop threads add the hover toolbar beside each bubble (mobile keeps hold-to-react only). */
const ChatDeviceContext = createContext<"mobile" | "desktop">("mobile");

type ChatHoverKind = "text" | "file" | "photo" | "call";
/** Figma desktop Hover (Text/File/Photo/Call "Actions", Button/Icon-Flat Small Secondary 32px, gap 0, 8px beside the
 *  bubble, vertically centred): Text & File = React · Reply · More, Photo = Share · React · More, Call = More.
 *  Others read left→right away from the bubble; for "you" the row is mirrored so React stays next to the bubble. */
const chatHoverOrder: Record<ChatHoverKind, Array<"react" | "reply" | "forward" | "more">> = {
  text: ["react", "reply", "more"], file: ["react", "reply", "more"], photo: ["forward", "react", "more"], call: ["more"],
};
const chatHoverIcon = { react: "icon-face-smile-line", reply: "icon-reply-solid", forward: "icon-share-01-line", more: "icon-dots-vertical-line" } as const;

type ChatHoverMenu = "react" | "more" | null;

function ChatHoverActions({ kind, side, reaction, onReact, onMoreReactions, actions = [], onAction, open: openProp, onOpenChange, fromBubble = false, onReturnFocus }: {
  kind: ChatHoverKind; side: ChatSide; reaction?: ChatReactionKind; onReact?: (kind: ChatReactionKind | undefined) => void; onMoreReactions?: () => void;
  actions?: ChatHoldAction[]; onAction?: (id: string) => void;
  /** Controlled menu (ChatMessage opens "more" on a desktop right-click / Shift+F10). */
  open?: ChatHoverMenu; onOpenChange?: (open: ChatHoverMenu) => void;
  /** Opened from the bubble with the keyboard: focus moves into the menu and Escape hands it back via `onReturnFocus`. */
  fromBubble?: boolean; onReturnFocus?: () => void;
}) {
  const t = useZenLabels();
  const reactRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [ownOpen, setOwnOpen] = useState<ChatHoverMenu>(null);
  // Opened with Enter / Space on its toolbar button (a click with detail 0): the list takes focus, as the bubble's does.
  const [fromKeys, setFromKeys] = useState(false);
  const requested = openProp !== undefined ? openProp : ownOpen;
  const setOpen = (next: ChatHoverMenu) => { if (openProp === undefined) setOwnOpen(next); onOpenChange?.(next); };
  const has = (id: string) => actions.some((action) => action.id === id);
  const shown = chatHoverOrder[kind].filter((id) => id === "react" ? Boolean(onReact) : id === "more" ? actions.length > 0 : has(id));
  if (!shown.length) return null;
  const order = side === "you" ? [...shown].reverse() : shown;
  // "More" lists the hold actions the row doesn't already show (one list for hold and hover — chatHoldActions).
  const menu = actions.filter((action) => action.id !== "more" && !shown.includes(action.id as never));
  // A context-menu request for "more" falls back to React when there is no More menu (e.g. a text with only reactions).
  const open: ChatHoverMenu = requested === "more" && !(shown.includes("more") && menu.length) ? (shown.includes("react") ? "react" : null) : requested;
  const label = (id: string) => id === "react" ? t.react : id === "more" ? t.moreActions : actions.find((action) => action.id === id)?.label ?? id;
  // Closing a menu (Escape, outside click, a pick) hands focus back to its trigger unless the user moved it somewhere else.
  const close = (trigger: { current: HTMLButtonElement | null }) => {
    setOpen(null);
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && document.contains(active)) return;
      if (fromBubble && onReturnFocus) onReturnFocus(); else trigger.current?.focus({ preventScroll: true });
    });
  };
  return (
    // Stop pointer/key events here: the bubble underneath listens for long-press / Enter to open the hold layer.
    <div className="zen-chat-message__hover" role="toolbar" aria-label={t.messageActions} data-side={side} data-open={open ? "true" : undefined}
      onPointerDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        // That also keeps Escape from the Popover's document listener, so Escape on the button of an open menu closes it
        // here (focus stays on the button). Escape inside the portalled menu is the menu's own.
        if (event.key === "Escape" && open && event.currentTarget.contains(event.target as Node)) { event.preventDefault(); close(open === "react" ? reactRef : moreRef); }
      }}>
      {order.map((id) => (
        // zen-allow-secondary: Figma Chat Hover toolbar = Button/Icon-Flat Small Secondary. zen-allow-filter-button: React / More open message menus, not filters.
        <IconButton key={id} ref={id === "react" ? reactRef : id === "more" ? moreRef : undefined} appearance="flat" level="secondary" size="sm" aria-label={label(id)}
          aria-haspopup={id === "react" || id === "more" ? "listbox" : undefined} aria-expanded={id === "react" || id === "more" ? open === id : undefined}
          onClick={(event) => { if (id === "react" || id === "more") { setFromKeys(event.detail === 0); setOpen(open === id ? null : id); } else onAction?.(id); }}
          icon={<Icon name={chatHoverIcon[id]} />} />
      ))}
      {/* Both menus are portalled to the page's overlay layer so they always sit above the thread: inline, they shared the
          message's stacking order and the next hovered/focused message (z-index 4) painted over them. */}
      {open === "react" ? (
        // Only the Figma Chat/Reaction-Bar shows: the Popover supplies anchoring and outside-click dismissal, its chrome is
        // stripped (zen-chat-message__hover-popover), exactly like the Reaction-Bar in the mobile hold layer.
        <ZenPortal><Popover open onOpenChange={(next) => { if (!next) close(reactRef); }} anchorRef={reactRef} align={side === "you" ? "end" : "start"} aria-label={t.react} className="zen-chat-message__hover-popover"
          ref={(node) => { node?.querySelector<HTMLElement>(".zen-chat-picker__emoji[aria-pressed='true'], .zen-chat-picker__emoji")?.focus({ preventScroll: true }); }}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(null); if (fromBubble && onReturnFocus) onReturnFocus(); else reactRef.current?.focus(); } }}>
          <ChatReactionPicker value={reaction} label={t.reactToMessage} onValueChange={(next) => { onReact?.(next); setOpen(null); reactRef.current?.focus(); }} onMore={onMoreReactions ? () => { setOpen(null); onMoreReactions(); } : undefined} />
        </Popover></ZenPortal>
      ) : null}
      {open === "more" && menu.length ? (
        <ZenPortal><Popover className="zen-chat-message__menu-popover" open onOpenChange={(next) => { if (!next) close(moreRef); }} anchorRef={moreRef} align={side === "you" ? "end" : "start"} label={t.messageActions} autoFocus={fromBubble || fromKeys}
          onKeyDown={(event) => { if (event.key === "Escape" && fromBubble && onReturnFocus) { event.preventDefault(); event.stopPropagation(); setOpen(null); onReturnFocus(); } }}
          items={menu.map((action) => ({ id: action.id, label: action.label, leading: renderIcon(action.icon) }))}
          onSelect={(item) => { onAction?.(item.id); close(moreRef); }} /></ZenPortal>
      ) : null}
    </div>
  );
}

const chatHoverKind = (children: ReactNode): ChatHoverKind =>
  isText(children) ? "text" : isValidElement(children) && children.type === ChatPhotos ? "photo" : isValidElement(children) && children.type === ChatCall ? "call" : "file";

/** Figma Chat/Conversation/Bubble (6349:64085): avatar (others) + bubble + reactions, with time / status / read list under it. */
export function ChatMessage({ side, domain = "social", author, showName = false, continued = false, time, status, failed = false, onRetry, reactions, seenBy, children, holdActions: holdActionsProp, onHoldAction, reaction, onReact, onMoreReactions, id, replyTo, onJumpToReply, className }: ChatMessageProps) {
  const t = useZenLabels();
  const device = useContext(ChatDeviceContext);
  // The built-in actions (chatHoldActions) follow the locale; labels the app wrote itself are shown as they are.
  const holdActions = holdActionsProp && localizeHoldActions(holdActionsProp, t.holdActions);
  // A call bubble takes no reactions: its hold layer and hover toolbar show only the actions popover.
  const kind = chatHoverKind(children);
  const reactable = kind === "call" ? undefined : onReact;
  const actionable = Boolean(holdActions?.length || reactable);
  // Hold to react (Chat/Mobile/Bubble/Overlay) is mobile only. Desktop uses the Hover toolbar; a right-click, Shift+F10,
  // the Menu key or Enter on the focused bubble opens the toolbar's More menu instead — and the text stays selectable.
  const hold = useChatHold(actionable && device !== "desktop");
  const [hoverMenu, setHoverMenu] = useState<ChatHoverMenu>(null);
  const [menuFromKeys, setMenuFromKeys] = useState(false);
  const desktopMenu = device === "desktop" && actionable ? {
    tabIndex: 0,
    // Opens the toolbar's More list (a Popover listbox), so it announces a listbox.
    "aria-haspopup": "listbox" as const,
    "aria-expanded": hoverMenu !== null,
    "aria-keyshortcuts": "Shift+F10",
    "data-menu": "true",
    onContextMenu: (event: { preventDefault: () => void }) => { event.preventDefault(); setMenuFromKeys(false); setHoverMenu("more"); },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey) || event.key === "Enter") { event.preventDefault(); setMenuFromKeys(true); setHoverMenu("more"); }
    },
  } : {};
  // Only the bubble's own keys (above) open a menu that hands focus back to the bubble. What the toolbar opens or closes
  // (the React / More buttons, Escape, a pick, an outside click) comes through here and returns focus to its button: the
  // flag used to stick after one keyboard opening, so every later React / More menu sent focus to the bubble.
  const changeHoverMenu = (next: ChatHoverMenu) => { setMenuFromKeys(false); setHoverMenu(next); };
  const bubble = isText(children)
    ? <ChatBubble side={side} domain={domain} time={domain === "business" ? time : undefined}>{children}</ChatBubble>
    : <ChatMessageContext.Provider value={{ domain, time: domain === "business" ? time : undefined }}>{children}</ChatMessageContext.Provider>;
  return (
    <div data-message-id={id} className={["zen-chat-message", className].filter(Boolean).join(" ")} data-side={side} data-domain={domain} data-reacted={reactions?.length ? "true" : undefined} data-continued={continued ? "true" : undefined} data-failed={failed ? "true" : undefined}>
      {side === "others" ? (
        <div className="zen-chat-message__avatar" aria-hidden={continued || undefined}>
          {!continued && author ? <Avatar size="xsmall" theme={author.src ? "photo" : author.theme ?? "neutral"} background="subtle" src={author.src} alt={author.name} /> : null}
        </div>
      ) : null}
      <div className="zen-chat-message__stack">
        {/* A reply's caption ("Chi replied to Bao") already names the sender, so the name line is dropped (Messenger). */}
        {showName && author && side === "others" && !replyTo ? <span className={`zen-chat-message__name ${typographyStyles["Body/Small/Regular"]}`}>{author.name}</span> : null}
        {replyTo ? <ChatReplyQuote target={replyTo} side={side} replier={author?.name} onJump={onJumpToReply} /> : null}
        <div ref={hold.ref} className="zen-chat-message__content" data-holdable={hold.enabled ? "true" : undefined} data-holding={hold.pressing ? "true" : undefined} {...hold.triggerProps} {...desktopMenu}>
          {bubble}
          {reactions?.length ? <ChatReactions reactions={reactions} mine={reaction} onRemoveMine={reactable ? () => reactable(undefined) : undefined} side={side} device={device} /> : null}
          {device === "desktop" && (holdActions?.length || reactable) ? <ChatHoverActions kind={kind} side={side} reaction={reaction} onReact={reactable} onMoreReactions={onMoreReactions} actions={holdActions} onAction={onHoldAction} open={hoverMenu} onOpenChange={changeHoverMenu} fromBubble={menuFromKeys} onReturnFocus={() => hold.ref.current?.focus()} /> : null}
        </div>
        {hold.open ? (
          <ChatHoldLayer anchor={hold.ref.current} side={side} onClose={hold.close} reaction={reaction} onReact={reactable} onMoreReactions={reactable ? onMoreReactions : undefined} actions={holdActions} onAction={onHoldAction}>
            {bubble}
          </ChatHoldLayer>
        ) : null}
        {failed ? (
          <span className={`zen-chat-message__meta zen-chat-message__failed ${typographyStyles["Caption/Medium"]}`} role="status">
            <Icon name="icon-alert-circle-solid" size="xs" decorative />{t.notDelivered}
            {onRetry ? <button type="button" className="zen-chat-message__retry" onClick={onRetry}>{t.retry}</button> : null}
          </span>
        ) : (domain === "social" && time) || status ? <span className={`zen-chat-message__meta ${typographyStyles["Caption/Regular"]}`}>{[domain === "social" ? time : null, status].filter(Boolean).map((part, index) => <span key={index}>{part}</span>)}</span> : null}
        {seenBy?.length ? <ChatReadList people={seenBy} /> : null}
      </div>
    </div>
  );
}

/** Long press (450ms, cancelled by moving > 8px), right-click, or Shift+F10 / ContextMenu / Enter on the focused bubble. */
function useChatHold(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => { window.clearTimeout(timer.current); start.current = null; setPressing(false); };
  const triggerProps = enabled ? {
    tabIndex: 0,
    // Opens the hold layer: a modal dialog (Reaction-Bar + actions).
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
    "aria-keyshortcuts": "Shift+F10",
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      fired.current = false; start.current = { x: event.clientX, y: event.clientY }; setPressing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { fired.current = true; setPressing(false); setOpen(true); }, 450);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => { if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) cancel(); },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // A long press must not also trigger the card underneath (open file, call back).
    onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => { if (fired.current) { event.preventDefault(); event.stopPropagation(); fired.current = false; } },
    onContextMenu: (event: { preventDefault: () => void }) => { event.preventDefault(); cancel(); setOpen(true); },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey) || event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); }
    },
  } : {};
  return { ref, enabled, open, pressing, close: () => setOpen(false), triggerProps };
}

/**
 * Figma Chat/Bubble/Focused (6182:56277 · 57953 · 57708) on Chat/Mobile/Bubble/Overlay: the whole screen dims
 * (Background/Overlay at 25%) and blurs (Figma 100 → CSS 50px); the pressed bubble stays in place with the Reaction-Bar
 * 8px above it and a 240px Popover/Default menu 8px below, aligned to its side and kept inside the screen.
 * It renders into the nearest `[data-zen-overlay-root]` (a device frame) or the page portal; focus is trapped and returns.
 */
function ChatHoldLayer({ anchor, side, onClose, reaction, onReact, onMoreReactions, actions, onAction, children }: {
  anchor: HTMLElement | null; side: ChatSide; onClose: () => void; reaction?: ChatReactionKind; onReact?: (kind: ChatReactionKind | undefined) => void;
  onMoreReactions?: () => void; actions?: ChatHoldAction[]; onAction?: (id: string) => void; children: ReactNode;
}) {
  const t = useZenLabels();
  const panelRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const root = anchor?.closest<HTMLElement>("[data-zen-overlay-root]") ?? null;
  const [place, setPlace] = useState<CSSProperties>({ visibility: "hidden" });
  useModal(true, panelRef, true, (next) => { if (!next) onClose(); }, ".zen-chat-picker__emoji, .zen-popover__item");
  // Inside a container root (device frame) blur the app itself: backdrop-filter skips layers that composite on their own
  // (blurred bars, glass bubbles), so Figma's full-screen blur is applied as a filter on the root's other children.
  useLayoutEffect(() => {
    if (!root) return undefined;
    root.dataset.zenHolding = "true";
    return () => { delete root.dataset.zenHolding; };
  }, [root]);
  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!anchor || !stack) return undefined;
    // Re-place whenever the stack changes size (the "+" emoji panel is taller than the bar), so it never leaves the screen.
    const place = () => {
    const frame = root?.getBoundingClientRect() ?? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    const scale = root ? frame.width / root.offsetWidth || 1 : 1;
    const width = root ? root.offsetWidth : window.innerWidth;
    const height = root ? root.offsetHeight : window.innerHeight;
    const bubble = anchor.getBoundingClientRect();
    const bar = stack.querySelector<HTMLElement>(".zen-chat-hold__bar");
    const barOffset = bar ? bar.offsetHeight + 8 : 0;
    const top = (bubble.top - frame.top) / scale - barOffset;
    const stackHeight = stack.offsetHeight;
    const safeTop = 48, safeBottom = 20;
    const clamped = Math.max(safeTop, Math.min(top, height - safeBottom - stackHeight));
    const x = side === "you" ? { right: width - (bubble.right - frame.left) / scale } : { left: (bubble.left - frame.left) / scale };
    setPlace({ top: clamped, ...x, ["--zen-chat-hold-bubble" as string]: `${bubble.width / scale}px` } as CSSProperties);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [anchor, root, side]);
  // The layer owns dismissal (backdrop tap, Escape via useModal); the menu Popover must not close it on outside pointer-downs,
  // or pressing the Reaction-Bar (outside the menu) would unmount the layer before the click lands.
  const choose = (id: string) => { onAction?.(id); onClose(); };
  const layer = (
    <div className="zen-chat-hold" data-contained={root ? "true" : undefined} onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className="zen-chat-hold__panel" role="dialog" aria-modal="true" aria-label={t.messageActions} tabIndex={-1}>
        <div ref={stackRef} className="zen-chat-hold__stack" data-side={side} style={place}>
          {onReact ? <div className="zen-chat-hold__bar"><ChatReactionPicker value={reaction} onValueChange={(kind) => { onReact(kind); onClose(); }} label={t.reactToMessage} onMore={onMoreReactions ? () => { onMoreReactions(); onClose(); } : undefined} /></div> : null}
          <div className="zen-chat-hold__bubble" inert aria-hidden="true">{children}</div>
          {actions?.length ? (
            <Popover className="zen-chat-hold__menu" open aria-label={t.messageActions}
              items={actions.map((action) => ({
                id: action.id,
                theme: "icon" as const,
                label: action.destructive ? <span className="zen-chat-hold__danger">{action.label}</span> : action.label,
                leading: renderIcon(action.icon, { className: action.destructive ? "zen-chat-hold__danger" : undefined }),
              }))}
              onSelect={(item) => choose(item.id)} />
          ) : null}
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return root ? createPortal(layer, root) : <ZenPortal>{layer}</ZenPortal>;
}

/** Figma Chat/Bubble/Text-You · Text-Others: padding 12 (+4 text inset), Body/Base/Regular; the tail corner is 4px. */
export function ChatBubble({ side, domain = "social", time, children }: { side: ChatSide; domain?: ChatDomain; time?: ReactNode; children: ReactNode }) {
  return (
    <div className="zen-chat-bubble" data-side={side} data-domain={domain}>
      <p className={`zen-chat-bubble__text ${typographyStyles["Body/Base/Regular"]}`}>{children}</p>
      {time ? <span className={`zen-chat-bubble__time ${typographyStyles["Caption/Regular"]}`}>{time}</span> : null}
    </div>
  );
}

export type ChatFileKind = "doc" | "pdf" | "sheet" | "other";
const fileTheme: Record<ChatFileKind, DockIconTheme> = { doc: "blue", pdf: "red", sheet: "green", other: "neutral" };
/* Figma Type=Others is a Neutral Subtle Dock-Icon; the typed files are Solid. */
const fileBackground = (kind: ChatFileKind) => (kind === "other" ? "subtle" : "solid");
const fileIcon: Record<ChatFileKind, IconName> = { doc: "icon-file-doc-line", pdf: "icon-file-doc-line", sheet: "icon-table-line", other: "icon-file-attachment-05-line" };

/** Size line; Business adds the message time on its right (Figma Footed: Body/Small + Caption/Regular). */
function ChatCardFooter({ detail, time }: { detail?: ReactNode; time?: ReactNode }) {
  if (!time) return detail ? <span className={`zen-chat-file__size ${typographyStyles["Body/Small/Regular"]}`}>{detail}</span> : null;
  return (
    <span className="zen-chat-file__footer">
      {detail ? <span className={`zen-chat-file__size ${typographyStyles["Body/Small/Regular"]}`}>{detail}</span> : null}
      <span className={`zen-chat-file__time ${typographyStyles["Caption/Regular"]}`}>{time}</span>
    </span>
  );
}

/**
 * Figma Chat/Bubble/File (6182:57708): 220 wide, padding 12; a Small Dock-Icon by type (Doc blue · PDF red · Sheet green Solid,
 * Others Neutral Subtle) + a 32px text column: name (Body/Base/Bold) and size (Body/Small/Regular). In a Business message the
 * card is Bubble-Chat-Others-Business (radius 16) and the time sits beside the size.
 */
export function ChatFile({ side = "others", kind = "other", name, size, href, onOpen }: { side?: ChatSide; kind?: ChatFileKind; name: string; size?: ReactNode; href?: string; onOpen?: () => void }) {
  const { domain, time } = useContext(ChatMessageContext);
  const body = (
    <>
      <DockIcon size="small" theme={fileTheme[kind]} background={fileBackground(kind)} icon={fileIcon[kind]} />
      <span className="zen-chat-file__text">
        <span className={`zen-chat-file__name ${typographyStyles["Body/Base/Bold"]}`}>{name}</span>
        <ChatCardFooter detail={size} time={time} />
      </span>
    </>
  );
  return href
    ? <a className="zen-chat-card zen-chat-file" data-side={side} data-domain={domain} href={href} download>{body}</a>
    : <button type="button" className="zen-chat-card zen-chat-file" data-side={side} data-domain={domain} onClick={onOpen}>{body}</button>;
}

export type ChatCallState = "in-call" | "in-missed" | "out-call" | "out-missed";
/** Figma Chat/Bubble/Call glyphs (solid) per Type × State; only an incoming missed call is Red Solid, the rest Neutral Subtle. */
const callGlyph: Record<"audio" | "video", Record<ChatCallState, IconName>> = {
  audio: { "in-call": "icon-phone-incoming-solid", "out-call": "icon-phone-outgoing-solid", "in-missed": "icon-phone-x-solid", "out-missed": "icon-phone-x-solid" },
  video: { "in-call": "icon-video-in-solid", "out-call": "icon-video-out-solid", "in-missed": "icon-video-recorder-x-solid", "out-missed": "icon-video-recorder-x-solid" },
};
/** Figma copy: "Audio call" / "Missed audio call" (video alike); the button says Call Back (you missed it), Call Again (they missed yours) or Call back. */
const callTitle = (t: ZenLabels, type: "audio" | "video", state: ChatCallState) =>
  state.endsWith("missed") ? (type === "audio" ? t.missedAudioCall : t.missedVideoCall) : type === "audio" ? t.audioCall : t.videoCall;
const callAction = (t: ZenLabels): Record<ChatCallState, string> => ({ "in-call": t.callBack, "out-call": t.callBack, "in-missed": t.callBackMissed, "out-missed": t.callAgain });
/** Business shows an action only on missed calls: Call Back (you missed it) · Send Voice (they missed yours). */
const businessCallAction = (t: ZenLabels): Partial<Record<ChatCallState, string>> => ({ "in-missed": t.callBackMissed, "out-missed": t.sendVoice });

/**
 * Figma Chat/Bubble/Call (6349:59813): 220 wide, padding 8; a 40px row (padding 4, gap 8) of a Small Dock-Icon with the
 * solid call glyph (Red Solid only for an incoming missed call, else Neutral Subtle) + title/duration, then a full-width
 * Small action: Social = Button/Overlay Inverse; Business = Button/Flat Primary, on missed calls only (the card is
 * Bubble-Chat-Others-Business, radius 16, and the time sits beside the duration). Never a Secondary button.
 */
export function ChatCall({ side = "others", type = "audio", state = "in-call", detail, actionLabel, onAction }: { side?: ChatSide; type?: "audio" | "video"; state?: ChatCallState; detail?: ReactNode; /** The action's text (the locale's Call back / Call Again / Send Voice by default). */ actionLabel?: string; onAction?: () => void }) {
  const t = useZenLabels();
  const { domain, time } = useContext(ChatMessageContext);
  const alert = state === "in-missed";
  const action = domain === "business" ? businessCallAction(t)[state] : callAction(t)[state];
  return (
    <div className="zen-chat-card zen-chat-call" data-side={side} data-domain={domain}>
      <div className="zen-chat-call__row">
        <DockIcon size="small" theme={alert ? "red" : "neutral"} background={alert ? "solid" : "subtle"} icon={callGlyph[type][state]} />
        <span className="zen-chat-file__text">
          <span className={`zen-chat-file__name ${typographyStyles["Body/Base/Bold"]}`}>{callTitle(t, type, state)}</span>
          <ChatCardFooter detail={detail} time={time} />
        </span>
      </div>
      {onAction && (domain !== "business" || action) ? (
        // zen-allow-small-full-width: Figma Chat/Bubble/Call — the Small action FILLs the 220px card (204px Social, 216px Business).
        <Button appearance={domain === "business" ? "flat" : "overlay"} level={domain === "business" ? "primary" : "inverse"} size="sm" className="zen-chat-call__action" onClick={onAction}>
          {actionLabel ?? action}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Figma Chat/Photo/Grid-Slot (6347:52935): 1 · 2 · 3 · 4+ photos as radius-16 tiles in a 260 (Mobile) / 400 (Desktop) square;
 * the 4th tile shows "+N" (Heading/2 on Background/Overlay). Business wraps the grid in a Surface card (padding 12, radius 24)
 * with the time under it (Figma Chat/Bubble/Photo-*, Domain=Business).
 */
export function ChatPhotos({ side = "others", photos, onOpen }: { side?: ChatSide; photos: { src: string; alt: string }[]; onOpen?: (index: number) => void }) {
  const t = useZenLabels();
  const { domain, time } = useContext(ChatMessageContext);
  const shown = photos.slice(0, 4);
  const more = photos.length - shown.length;
  const grid = (
    <div className="zen-chat-photos" data-side={side} data-count={Math.min(photos.length, 4)}>
      {shown.map((photo, index) => (
        <button key={index} type="button" className="zen-chat-photos__tile" onClick={() => onOpen?.(index)} aria-label={index === 3 && more > 0 ? t.andMorePhotos(photo.alt, more) : photo.alt}>
          <img src={photo.src} alt="" />
          {index === 3 && more > 0 ? <span className={`zen-chat-photos__more ${typographyStyles["Heading/2"]}`} aria-hidden="true">+{more}</span> : null}
        </button>
      ))}
    </div>
  );
  if (domain !== "business") return grid;
  return (
    <div className="zen-chat-card zen-chat-photo-card" data-side={side} data-domain={domain}>
      {grid}
      {time ? <span className={`zen-chat-photo-card__time ${typographyStyles["Body/Small/Regular"]}`}>{time}</span> : null}
    </div>
  );
}

/** Figma Chat/Reaction/Status (6263:67242): a Surface pill (count + up to 3 emojis) overlapping the bubble's bottom edge. */
/**
 * Figma Chat/Reaction/Status: the pill on a bubble (total + up to 3 emojis). When it knows who reacted (`by`, or your
 * own `mine`), it is a button that opens the "Reactions" panel (ChatReactorsPanel): tabs by emoji and the people.
 * It stops pointer/key events so pressing it never starts the message's hold-to-react.
 */
export function ChatReactions({ reactions, mine, onRemoveMine, side = "others", device = "mobile" }: { reactions: ChatReaction[]; mine?: ChatReactionKind; onRemoveMine?: () => void; side?: ChatSide; device?: "mobile" | "desktop" }) {
  const t = useZenLabels();
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const total = reactions.reduce((sum, r) => sum + (r.count ?? r.by?.length ?? 1), 0);
  // English on purpose: the reaction kind ids ("heart", "lol"…) double as their spoken names.
  const label = reactions.map((r) => `${r.count ?? r.by?.length ?? 1} ${r.kind}`).join(", ");
  const content = (
    <>
      {total > 1 ? <span className={typographyStyles["Body/Small/Regular"]}>{total}</span> : null}
      <span className="zen-chat-reactions__emojis" aria-hidden="true">{reactions.slice(0, 3).map((r) => <span key={r.kind}>{chatReactionGlyph(r.kind)}</span>)}</span>
    </>
  );
  if (!reactions.some((r) => r.by?.length) && !mine) {
    return <span className="zen-chat-reactions" role="img" aria-label={t.reactionsSummary(label)}>{content}</span>;
  }
  return (
    <>
      <button ref={pillRef} type="button" className="zen-chat-reactions" aria-label={t.showWhoReacted(label)} aria-haspopup="dialog" aria-expanded={open}
        onPointerDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}
        // Keys that would open the hold layer stay on the pill; Escape still reaches the panel to close it.
        onKeyDown={(event) => { if (["Enter", " ", "ContextMenu"].includes(event.key) || (event.key === "F10" && event.shiftKey)) event.stopPropagation(); }}
        onClick={(event) => { event.stopPropagation(); setOpen((was) => !was); }}>
        {content}
      </button>
      <ChatReactorsPanel reactions={reactions} mine={mine} onRemoveMine={onRemoveMine} glyph={chatReactionGlyph} device={device} side={side} open={open} onOpenChange={setOpen} anchorRef={pillRef} />
    </>
  );
}

/** Figma Chat/Reaction/Emoji/Interactive (6101:61682): six 28px emojis; Selected sits on a 36px Active/Neutral/Subtle circle. */
/** Figma Chat/Reaction-Bar order: Heart · LOL · Surprised · Sad · Angry · Like. */
export const chatReactionOrder: ChatQuickReaction[] = ["heart", "lol", "surprised", "sad", "angry", "like"];

export function ChatReactionPicker({ value, onValueChange, label: labelProp, onMore }: { value?: ChatReactionKind; onValueChange: (kind: ChatReactionKind | undefined) => void; /** Accessible name of the bar; defaults to the locale's "React". */ label?: string; /** Figma Reaction-Bar "+": replace the built-in emoji panel with your own full picker. */ onMore?: () => void }) {
  const t = useZenLabels();
  const label = labelProp ?? t.react;
  // Figma Chat/Reaction-Bar always ends with "+" (Button/Icon-Main Small Tertiary); without `onMore` it opens the built-in panel.
  const [more, setMore] = useState(false);
  const extra = value !== undefined && !(chatReactionOrder as string[]).includes(value) ? value : undefined;
  if (more) return <ChatEmojiPicker value={value} onPick={(emoji) => { setMore(false); onValueChange(emoji === value ? undefined : emoji); }} onBack={() => setMore(false)} />;
  return (
    <div className="zen-chat-picker" role="group" aria-label={label}>
      {chatReactionOrder.map((kind) => (
        // English on purpose: the kind id ("heart", "lol"…) is the emoji's accessible name.
        <button key={kind} type="button" className="zen-chat-picker__emoji" aria-label={kind} aria-pressed={value === kind} onClick={() => onValueChange(value === kind ? undefined : kind)}>
          {chatReactionEmojis[kind]}
        </button>
      ))}
      {extra ? <button type="button" className="zen-chat-picker__emoji" aria-label={t.removeItem(extra)} aria-pressed onClick={() => onValueChange(undefined)}>{extra}</button> : null}
      {/* zen-allow-filter-button: "+" opens the emoji panel (Figma Reaction-Bar), not a filter. */}
      <IconButton appearance="main" level="tertiary" size="sm" aria-label={t.moreReactions} aria-haspopup="dialog" onClick={() => (onMore ? onMore() : setMore(true))} icon={<Icon name="icon-plus-line" />} />
    </div>
  );
}

/** Figma Chat/Section/Read-List (6101:61545): 20px avatars (gap 4); more than 5 shows "+N". */
export function ChatReadList({ people }: { people: ChatPerson[] }) {
  const t = useZenLabels();
  const shown = people.slice(0, 5);
  return (
    <span className="zen-chat-read" role="img" aria-label={t.seenBy(people.map((p) => p.name).join(", "))}>
      {/* Figma Seen by=5+: a "+N" pill leads the row, then the five most recent readers. */}
      {people.length > 5 ? <Badge size="small" theme="neutral" background="subtle" leadingIcon={false}>+{people.length - 5}</Badge> : null}
      {shown.map((person) => <Avatar key={person.name} size="2xsmall" theme={person.src ? "photo" : person.theme ?? "neutral"} background="subtle" src={person.src} alt="">{person.src ? null : initialsOf(person.name)}</Avatar>)}
    </span>
  );
}

/** Figma Chat/Section Time (7042:24411): a centred Caption/Regular Neutral/Light time stamp between runs ("Sat 17:55") — no rules. */
export function ChatDateDivider({ children }: { children: ReactNode }) {
  return <div className={`zen-chat-date ${typographyStyles["Caption/Regular"]}`} role="separator">{children}</div>;
}

/** Scrollable thread: messages from different people get 16px, a run from one person 4px. */
/** The element that actually scrolls the thread: the thread itself, or its nearest scrollable ancestor (a screen / panel). */
const scrollerOf = (el: HTMLElement) => {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
};

/**
 * Opens at the latest message and stays pinned to the bottom when new messages arrive — unless the reader has scrolled up
 * (more than 48px from the bottom), in which case their position is kept.
 */
export function ChatThread({ children, device = "mobile", "aria-label": ariaLabelProp, className }: { children: ReactNode; /** Figma Device: text caps at 220 (Mobile) / 516 (Desktop), photo grids at 260 / 400. */ device?: "mobile" | "desktop"; /** Accessible name of the thread; defaults to the locale's "Messages". */ "aria-label"?: string; className?: string }) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.messages;
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    const scroller = el && scrollerOf(el);
    if (!scroller) return undefined;
    if (pinned.current) scroller.scrollTop = scroller.scrollHeight;
    const onScroll = () => { pinned.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48; };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [children]);
  return <ChatDeviceContext.Provider value={device}><div ref={ref} className={["zen-chat-thread", className].filter(Boolean).join(" ")} data-device={device} role="log" aria-label={ariaLabel} aria-live="polite">{children}</div></ChatDeviceContext.Provider>;
}

export interface ChatComposerProps {
  onSend: (text: string) => void;
  /** Figma placeholder "Aa" (the locale's `composerPlaceholder` by default). */
  placeholder?: string;
  /** Accessible name of the field (the placeholder is not a label); the locale's "Message" by default. */
  label?: string;
  /** The emoji button inside the field. */
  onEmoji?: () => void;
  /** Figma Leading-Actions (plus · mic · photo; only plus while typing): Nav-Action/Icon-Flat 44px on mobile, Button/Icon-Flat Medium 40px on desktop. `icon`: an icon name or an element. */
  actions?: { icon: IconName | ReactElement; label: string; onClick?: () => void }[];
  /** Figma Trailing-Actions when the field is empty (a 👍 "Send a like" by default). While typing it becomes Send. `icon`: an icon name or an element. */
  quickAction?: { icon: IconName | ReactElement; label: string; onClick?: () => void };
  device?: "mobile" | "desktop";
  disabled?: boolean;
  /** Replying to a message: a "Replying to …" bar above the field (× or Escape cancels). Attach it to what you send. */
  replyTo?: ChatReplyTarget;
  onCancelReply?: () => void;
  className?: string;
}

/**
 * Figma Chat-Control (6182:56819): Surface bar, padding 8, gap 8. Actions are flat Neutral/Strongest icons — Mobile
 * Nav-Action/Icon-Flat 44px (icon 24), Desktop Button/Icon-Flat Medium 40px (icon 20). The pill field is
 * Input/Background/Default + Effect/Input with Body/Base/Medium text ("Aa" in Placeholder); State=Focused only adds the
 * Accent caret, the field itself does not change. The trailing quick action becomes Send while typing (same flat style).
 */
export function ChatComposer({ onSend, placeholder: placeholderProp, label: labelProp, actions, quickAction: quickActionProp, onEmoji, device = "mobile", disabled = false, replyTo, onCancelReply, className }: ChatComposerProps) {
  const t = useZenLabels();
  const placeholder = placeholderProp ?? t.composerPlaceholder;
  const label = labelProp ?? t.message;
  const quickAction = quickActionProp ?? { icon: "icon-thumbs-up-line" as IconName, label: t.sendLike };
  const [text, setText] = useState("");
  // Figma Chat-Control (both devices): plus · mic · photo; while typing only plus stays so the field can grow.
  const leading = actions ?? [{ icon: "icon-plus-circle-line" as IconName, label: t.addAttachment }, { icon: "icon-microphone-line" as IconName, label: t.recordVoice }, { icon: "icon-image-line" as IconName, label: t.sendPhoto }];
  const typing = text.trim().length > 0;
  const submit = (event?: FormEvent) => { event?.preventDefault(); if (!typing) return; onSend(text.trim()); setText(""); };
  const sendTip = useIconTooltip(t.send);
  // Desktop: Button/Icon-Flat Medium (40/20, its own 1s name tooltip); mobile: the 44px Nav-Action.
  const action = (item: { icon: IconName | ReactElement; label: string; onClick?: () => void }) => device === "desktop"
    ? <IconButton key={item.label} appearance="flat" level="primary" size="md" icon={renderIcon(item.icon)} aria-label={item.label} onClick={item.onClick} disabled={disabled} />
    : <TopNavigationActionButton key={item.label} action={{ ...item, disabled }} variant="flat-chat" />;
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Escape" && replyTo && onCancelReply) { event.preventDefault(); onCancelReply(); return; } if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } };
  return (
    <form className={["zen-chat-composer", className].filter(Boolean).join(" ")} data-device={device} data-typing={typing ? "true" : undefined} data-replying={replyTo ? "true" : undefined} onSubmit={submit}>
      {replyTo ? <ChatComposerReply target={replyTo} onCancel={onCancelReply} /> : null}
      {/* While typing the extra actions fold away so the field can grow (Figma State=Typing). */}
      <div className="zen-chat-composer__leading">
        {(typing ? leading.slice(0, 1) : leading).map(action)}
      </div>
      <div className="zen-chat-composer__field">
        <textarea aria-label={label} className={typographyStyles["Body/Base/Medium"]} rows={1} value={text} placeholder={placeholder} disabled={disabled} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
        {/* Figma: a flat emoji action sits inside the field's trailing edge. */}
        {action({ icon: "icon-face-smile-line", label: t.addEmoji, onClick: onEmoji })}
      </div>
      <div className="zen-chat-composer__trailing">
        {!typing
          ? action(quickAction)
          : device === "desktop"
            ? <IconButton type="submit" className="zen-chat-composer__send" appearance="flat" level="primary" size="md" icon={<Icon name="icon-send-03-line" />} aria-label={t.send} disabled={disabled} />
            : <><button {...sendTip.bind()} type="submit" className="zen-top-nav__action zen-chat-composer__send" data-style="flat-chat" aria-label={t.send} disabled={disabled}><Icon name="icon-send-03-line" decorative /></button>{sendTip.tooltip}</>}
      </div>
    </form>
  );
}

/** Figma State of the conversation preview: a text message, or a call entry. */
export type ChatConversationCall = "missed-audio" | "missed-video" | "incoming" | "outgoing" | "ongoing";

export interface ChatConversationItemProps {
  person: ChatPerson;
  /** A group conversation shows two overlapping avatars (Figma Chat/Avatar-Group). */
  group?: ChatPerson[];
  /** Last message (State=Text). Ignored when `call` is set. */
  preview?: ReactNode;
  /** Last activity was a call (State=Audio Missed Call · Video Missed Call · Audio In/Out-Call · Ongoing-Call). */
  call?: ChatConversationCall;
  /** Override the call label (the locale's "Missed Call", "Audio Call", "Ongoing Call…"). */
  callLabel?: ReactNode;
  time: ReactNode;
  unread?: boolean;
  online?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

/** Two-letter initials for people without a photo (the avatar is decorative next to the visible name). */
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();

/** The preview's call icon, label (its ZenLabels key; `callLabel` overrides it) and tone. */
const callMeta: Record<ChatConversationCall, { icon: IconName | null; label: "previewMissedCall" | "previewAudioCall" | "previewOngoingCall"; tone: "negative" | "positive" | "neutral" }> = {
  "missed-audio": { icon: "icon-phone-x-solid", label: "previewMissedCall", tone: "negative" },
  "missed-video": { icon: "icon-video-recorder-x-solid", label: "previewMissedCall", tone: "negative" },
  incoming: { icon: "icon-phone-incoming-solid", label: "previewAudioCall", tone: "neutral" },
  outgoing: { icon: "icon-phone-outgoing-solid", label: "previewAudioCall", tone: "neutral" },
  ongoing: { icon: null, label: "previewOngoingCall", tone: "positive" },
};

/** ChatAvatarGroup CSS / Figma keys (its `data-size` values). */
const chatAvatarGroupSizes = ["large", "medium", "small"] as const;

/** Figma Chat/Avatar-Group (6340:46191): two overlapping photo avatars on the diagonal — Medium 40px frame with 28px
 *  avatars (conversation list), Small 32px with 20px avatars (compact rows, thread headers). Decorative: name the
 *  conversation in the surrounding text. */
export function ChatAvatarGroup({ people, size: sizeProp = "md", online = false, className }: { people: ChatPerson[]; /** Short (sm, md…) or Figma (small, medium…) spelling. */ size?: "lg" | "md" | "sm" | "large" | "medium" | "small"; online?: boolean; className?: string }) {
  const size = scaleKey(sizeProp, chatAvatarGroupSizes);
  return (
    <span className={["zen-chat-group", className].filter(Boolean).join(" ")} data-size={size} aria-hidden="true">
      {people.slice(0, 2).map((p) => <Avatar key={p.name} size="xsmall" theme={p.src ? "photo" : p.theme ?? "neutral"} background="subtle" src={p.src} alt="">{p.src ? null : initialsOf(p.name)}</Avatar>)}
      {online ? <span className="zen-chat-group__status" /> : null}
    </span>
  );
}

/**
 * Figma Chat/Conversation-List/List-Item (7522:371057 · content 6331:34480), composed from ListItem: 40px avatar,
 * Title (Body/Base/Bold when unread, Medium when read) · "•" · time (Body/Small/Regular, Neutral/Light), then the
 * Subtitle — unread text Body/Small/Bold Strongest + a 12px Positive "Active" status dot; read text Regular Light;
 * a missed call is Negative/Light (Medium) with its 16px icon while unread, Neutral/Light once read; an ongoing call is
 * Positive/Light.
 */
export function ChatConversationItem({ person, group, preview, call, callLabel, time, unread = false, online = false, selected, onClick }: ChatConversationItemProps) {
  const t = useZenLabels();
  const leading = group?.length
    ? <ChatAvatarGroup people={group} online={online} />
    : <Avatar size="medium" theme={person.src ? "photo" : person.theme ?? "neutral"} background="subtle" src={person.src} alt="" status={online}>{person.src ? null : initialsOf(person.name)}</Avatar>;
  const meta = call ? callMeta[call] : null;
  const tone = meta ? (meta.tone === "negative" && !unread ? "neutral" : meta.tone) : unread ? "strong" : "neutral";
  const subtitleStyle = meta ? (unread || meta.tone === "positive" ? "Body/Small/Medium" : "Body/Small/Regular") : unread ? "Body/Small/Bold" : "Body/Small/Regular";
  return (
    <ListItem
      className="zen-chat-convo"
      leading={leading}
      title={<span className="zen-chat-convo__title"><span className={`zen-chat-convo__name ${typographyStyles[unread ? "Body/Base/Bold" : "Body/Base/Medium"]}`}>{person.name}</span><span className={`zen-chat-convo__time ${typographyStyles["Body/Small/Regular"]}`} aria-hidden="true">•</span><span className={`zen-chat-convo__time ${typographyStyles["Body/Small/Regular"]}`}>{time}</span></span>}
      caption={
        <span className={`zen-chat-convo__preview ${typographyStyles[subtitleStyle]}`} data-tone={tone}>
          {meta?.icon ? <Icon name={meta.icon} size="sm" decorative /> : null}
          <span className="zen-chat-convo__preview-text">{meta ? callLabel ?? t[meta.label] : preview}</span>
          {unread && !meta ? <span className="zen-chat-convo__unread" role="img" aria-label={t.unread} /> : null}
        </span>
      }
      selected={selected}
      onClick={onClick}
    />
  );
}
