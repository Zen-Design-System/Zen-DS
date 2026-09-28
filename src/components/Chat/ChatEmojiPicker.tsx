import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "../Icon/core";

/** A compact, dependency-free emoji set for message reactions (name is the accessible label and the search key). */
export const chatEmojiSet: ReadonlyArray<{ emoji: string; name: string }> = [
  // English on purpose: each name is both the accessible name and the search key.
  { emoji: "😀", name: "grinning" }, { emoji: "😂", name: "tears of joy" }, { emoji: "🥹", name: "holding back tears" }, { emoji: "😍", name: "heart eyes" },
  { emoji: "🥰", name: "smiling with hearts" }, { emoji: "😘", name: "kiss" }, { emoji: "😎", name: "cool" }, { emoji: "🤩", name: "star struck" },
  { emoji: "🤔", name: "thinking" }, { emoji: "🙃", name: "upside down" }, { emoji: "😴", name: "sleeping" }, { emoji: "🤯", name: "mind blown" },
  { emoji: "😭", name: "crying" }, { emoji: "😱", name: "screaming" }, { emoji: "🥲", name: "smiling with tear" }, { emoji: "😬", name: "grimacing" },
  { emoji: "🙏", name: "thank you" }, { emoji: "👏", name: "clapping" }, { emoji: "🙌", name: "raising hands" }, { emoji: "👌", name: "ok hand" },
  { emoji: "✌️", name: "victory" }, { emoji: "🤝", name: "handshake" }, { emoji: "💪", name: "strong" }, { emoji: "👀", name: "eyes" },
  { emoji: "🔥", name: "fire" }, { emoji: "✨", name: "sparkles" }, { emoji: "🎉", name: "party" }, { emoji: "💯", name: "hundred" },
  { emoji: "✅", name: "check" }, { emoji: "❌", name: "cross" }, { emoji: "⭐", name: "star" }, { emoji: "💡", name: "idea" },
  { emoji: "🚀", name: "rocket" }, { emoji: "🏆", name: "trophy" }, { emoji: "☕", name: "coffee" }, { emoji: "🍕", name: "pizza" },
  { emoji: "💜", name: "purple heart" }, { emoji: "💙", name: "blue heart" }, { emoji: "💚", name: "green heart" }, { emoji: "🖤", name: "black heart" },
];

const COLUMNS = 8;

/**
 * The Reaction-Bar "+" panel (no Figma frame exists, so it is built from the bar's own tokens): the same Popover surface
 * as Chat/Reaction-Bar (90% Popover fill + Effect/Popover, radius Large), a back chevron, a search field and an 8-column
 * grid of 36px emoji buttons (the Reaction/Emoji/Interactive size). Arrow keys move through the grid, Home/End jump,
 * Enter/Space picks, Escape (handled by the popover) closes.
 */
export function ChatEmojiPicker({ value, onPick, onBack, label: labelProp }: { value?: string; onPick: (emoji: string) => void; onBack: () => void; /** Accessible name of the panel (the locale's "Choose a reaction" by default). */ label?: string }) {
  const t = useZenLabels();
  const label = labelProp ?? t.chooseReaction;
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? chatEmojiSet.filter((item) => item.name.includes(q) || item.emoji === q) : chatEmojiSet; }, [query]);
  useEffect(() => { gridRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }, []);
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(gridRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, ArrowDown: index + COLUMNS, ArrowUp: index - COLUMNS, Home: 0, End: buttons.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
  };
  return (
    <div className="zen-chat-emoji" role="dialog" aria-label={label}>
      <div className="zen-chat-emoji__head">
        <IconButton appearance="flat" level="primary" size="sm" aria-label={t.backToQuickReactions} onClick={onBack} icon={<Icon name="icon-chevron-left-line-medium" />} />
        <label className="zen-chat-emoji__search">
          <Icon name="icon-search-medium-line" decorative />
          <input className={typographyStyles["Body/Base/Regular"]} value={query} placeholder={t.searchEmoji} aria-label={t.searchEmoji} onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); gridRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } if (event.key === "Enter" && shown[0]) { event.preventDefault(); onPick(shown[0].emoji); } }} />
        </label>
      </div>
      <div ref={gridRef} className="zen-chat-emoji__grid" role="group" aria-label={t.emoji} onKeyDown={onGridKey}>
        {shown.map((item) => (
          <button key={item.emoji} type="button" className="zen-chat-emoji__cell" aria-label={item.name} aria-pressed={value === item.emoji} onClick={() => onPick(item.emoji)}>{item.emoji}</button>
        ))}
        {shown.length === 0 ? <p className={`zen-chat-emoji__empty ${typographyStyles["Body/Small/Regular"]}`}>{t.noEmojiMatches(query)}</p> : null}
      </div>
    </div>
  );
}
