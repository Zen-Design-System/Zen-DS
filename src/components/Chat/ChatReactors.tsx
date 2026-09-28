import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "../Avatar";
import { BottomSheet } from "../BottomSheet";
import { List, ListItem } from "../ListItem";
import { useAnchoredPosition, useExclusivePopover } from "../Popover";
import { ZenPortal } from "../Portal";
import { Tabs } from "../Tabs";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import type { ChatPerson, ChatReaction, ChatReactionKind } from "./Chat";
import "./chat-reactors.css";

/**
 * Who reacted (no Figma frame — composed from Zen parts, following Messenger / WhatsApp / Slack): pressing the
 * reactions pill on a bubble opens a "Reactions" panel — a Bottom Sheet on mobile (inside the device frame's
 * `[data-zen-overlay-root]` when there is one), a dialog on the Popover surface under the pill on desktop. Tabs filter
 * by emoji ("All 4 · ❤️ 3 · 👍 1"); each row is a List-Item (Avatar photo or initials · name · the emoji). Your own
 * reaction is the "You" row, and pressing it removes the reaction.
 */
export interface ChatReactorsPanelProps {
  reactions: ChatReaction[];
  /** Your reaction (ChatMessage `reaction`): listed first as "You". */
  mine?: ChatReactionKind;
  /** Pressing the "You" row removes your reaction (ChatMessage passes `onReact(undefined)`). */
  onRemoveMine?: () => void;
  glyph: (kind: ChatReactionKind) => string;
  device: "mobile" | "desktop";
  side: "you" | "others";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The pill: anchors the desktop Popover and finds the device frame's overlay root on mobile. */
  anchorRef: RefObject<HTMLElement | null>;
}

type Row = { key: string; person: ChatPerson; kind: ChatReactionKind; you?: boolean };

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();

/** The emoji tabs + the list of people. */
function ChatReactorsList({ reactions, mine, onRemoveMine, glyph, onDone }: Pick<ChatReactorsPanelProps, "reactions" | "mine" | "onRemoveMine" | "glyph"> & { onDone: () => void }) {
  // The emoji tabs' and emoji's names stay English on purpose: they are the reaction kind ids ("heart", "lol"…).
  const t = useZenLabels();
  const tabsId = `zen-chat-reactors-${useId().replace(/:/g, "")}`;
  const [tab, setTab] = useState("all");
  const rows: Row[] = [
    ...(mine ? [{ key: "you", person: { name: t.you }, kind: mine, you: true }] : []),
    ...reactions.flatMap((reaction) => (reaction.by ?? []).map((person, index) => ({ key: `${reaction.kind}-${person.name}-${index}`, person, kind: reaction.kind }))),
  ];
  const kinds = [...new Set(rows.map((row) => row.kind))];
  const tabs = [
    { id: "all", label: t.allCount(rows.length) },
    // The emoji sits in its own opaque-coloured span: colour emoji take the alpha of `color`, so an unselected tab's
    // Neutral/Light text colour would fade them. Only the count follows the tab state.
    ...kinds.map((kind) => ({ id: String(kind), label: <><span className="zen-chat-reactors__tab-emoji" aria-hidden="true">{glyph(kind)}</span> {rows.filter((row) => row.kind === kind).length}</>, "aria-label": `${kind}, ${rows.filter((row) => row.kind === kind).length}` })),
  ];
  const shown = tab === "all" ? rows : rows.filter((row) => row.kind === tab);
  const people = (
    <List aria-label={t.peopleWhoReacted} inset="none">
      {shown.map((row) => (
        <ListItem
          key={row.key}
          title={row.you ? t.you : row.person.name}
          caption={row.you && onRemoveMine ? t.tapToRemove : undefined}
          leading={<Avatar size="small" theme={row.person.src ? "photo" : row.person.theme ?? "neutral"} background="subtle" src={row.person.src} alt="">{row.person.src ? null : initialsOf(row.person.name)}</Avatar>}
          trailing={<span className="zen-chat-reactors__emoji" role="img" aria-label={String(row.kind)}>{glyph(row.kind)}</span>}
          onClick={row.you && onRemoveMine ? () => { onRemoveMine(); onDone(); } : undefined}
        />
      ))}
    </List>
  );
  if (kinds.length < 2) return <div className="zen-chat-reactors">{people}</div>;
  // With tabs, the list is the selected tab's panel: every tab's aria-controls points at `${tabsId}-panel-${id}`.
  return (
    <div className="zen-chat-reactors">
      <Tabs size="small" items={tabs} value={tab} onValueChange={setTab} aria-label={t.filterReactions} idPrefix={tabsId} />
      <div className="zen-chat-reactors__panel" role="tabpanel" id={`${tabsId}-panel-${tab}`} aria-labelledby={tabs.some((item) => item.id === tab) ? `${tabsId}-tab-${tab}` : undefined}>{people}</div>
    </div>
  );
}

/**
 * Desktop: the Popover/Default surface under the pill — Popover's classes, placement (useAnchoredPosition), one popover
 * at a time and light dismiss, and the same keys (Escape closes and gives focus back to the pill) — as a dialog named by
 * its "Reactions" label. Not a <Popover>: that one holds an option list (role="listbox"), and this panel holds emoji
 * tabs and a list of people.
 */
function ChatReactorsPopover({ label, side, onOpenChange, anchorRef, children }: Pick<ChatReactorsPanelProps, "side" | "onOpenChange" | "anchorRef"> & { label: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const placement = useAnchoredPosition(rootRef, true, { align: side === "you" ? "end" : "start", anchor: () => anchorRef.current });
  useExclusivePopover(true, () => onOpenChange(false), rootRef, anchorRef);
  // Light dismiss: a pointer-down outside the panel and the pill, or Escape while focus is still on the pill.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      if (active && anchorRef.current?.contains(active)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, anchorRef]);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    onOpenChange(false);
    const anchor = anchorRef.current;
    (anchor?.matches("button, a[href], input, [tabindex]") ? anchor : anchor?.querySelector<HTMLElement>("button, a[href], input, [tabindex]"))?.focus();
  };
  return (
    <div ref={rootRef} role="dialog" aria-labelledby={labelId} className="zen-popover zen-chat-reactors__popover" style={placement.style} data-side={placement.side} data-search="false" data-scroll-bar="true" onKeyDown={handleKeyDown}>
      <div id={labelId} className={`zen-popover__label ${typographyStyles["Body/Small/Medium"]}`}>{label}</div>
      <div className="zen-popover__items">{children}</div>
    </div>
  );
}

export function ChatReactorsPanel({ reactions, mine, onRemoveMine, glyph, device, side, open, onOpenChange, anchorRef }: ChatReactorsPanelProps) {
  const t = useZenLabels();
  if (!open) return null;
  const list = <ChatReactorsList reactions={reactions} mine={mine} onRemoveMine={onRemoveMine} glyph={glyph} onDone={() => onOpenChange(false)} />;
  if (device === "desktop") {
    // Portalled so the thread's scroll box never clips it; useAnchoredPosition still attaches it to the pill and flips it.
    return (
      <ZenPortal>
        <ChatReactorsPopover label={t.reactions} side={side} onOpenChange={onOpenChange} anchorRef={anchorRef}>{list}</ChatReactorsPopover>
      </ZenPortal>
    );
  }
  const root = anchorRef.current?.closest<HTMLElement>("[data-zen-overlay-root]") ?? null;
  // A fixed half-screen sheet (chat-reactors.css): switching emoji tabs changes the list, never the sheet's height.
  const sheet = <BottomSheet className="zen-chat-reactors__sheet" open onOpenChange={onOpenChange} title={t.reactions} inline={Boolean(root)}>{list}</BottomSheet>;
  return root ? createPortal(sheet, root) : sheet;
}
