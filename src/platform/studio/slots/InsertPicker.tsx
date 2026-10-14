import { useId, useMemo, useState, type RefObject } from "react";
import { useWords } from "../useWords";
import { Popover, PopoverItem } from "../../../components/Popover";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { SourceElement, StudioSelection } from "../types";
import { insertIntoSlot, slotHostContext } from "./actions";
import { slotContentOf } from "./content";
import { paletteFor, paletteSections, searchPalette, type PaletteHidden, type PaletteItem, type PaletteResult } from "./palette";
import { insertTargetFor, type ContentSlot } from "./registry";
import "./slots.css";

/*
 * The insert picker (Figma's slot "Add instances", spec "InsertPicker"): a Zen Popover with search, the slot's preferred
 * items first, then the palette groups, then "Not recommended here": the items that go against the host rules, each
 * with its short reason as the caption. They insert all the same (editing is free, user 2026-10-04; the usage harness
 * reports them at Save). What the code cannot take at all is said in one visible caption, never silently missing. That
 * caption (and "No component matches") sits in the popover's label, outside the option list, and names the list with
 * the title, so a screen reader reads it on entering the list. Arrow keys move through the items, Enter
 * adds one, Escape closes and gives focus back to the trigger. Choosing an item writes it at the end of the slot
 * (insertIntoSlot) and selects it.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

const sentence = (names: readonly string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/**
 * The items the code cannot take here, said in one short visible line ("2 not available here") whose tooltip and
 * accessible name give each reason ("Image: Library pictures work on example pages only."); a whole group by its name,
 * else the items, or the reason alone for more than three. Null when nothing is hidden (user, 2026-10-13: the full
 * sentence over the list was too long).
 */
function hiddenCaption(result: Pick<PaletteResult, "items" | "hidden">): { short: string; full: string } | null {
  if (!result.hidden.length) return null;
  const offered = new Set(result.items.map((item) => item.group));
  const byReason = new Map<string, string[]>();
  for (const row of result.hidden as readonly PaletteHidden[]) {
    const names = byReason.get(row.reason) ?? [];
    for (const name of offered.has(row.group) ? row.items : [row.group]) if (!names.includes(name)) names.push(name);
    byReason.set(row.reason, names);
  }
  const count = result.hidden.reduce((total, row) => total + row.items.length, 0);
  // A long list says less than its reason ("Actions takes Badge, IconButton or Button"): then the reason alone.
  const full = [...byReason].map(([reason, names]) => (names.length > 3 ? `${reason}.` : `${sentence(names)}: ${reason}.`)).join(" ");
  return { short: `${count} not available here`, full };
}

export type InsertPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trigger (+ button, canvas chip, or a point on the canvas): the popover attaches to it. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The slot's host (selected) and its source. */
  selection: NodeSelection;
  element: SourceElement;
  slot: ContentSlot;
  /** Where focus goes after an item is chosen (the trigger); Escape returns it there by itself. */
  onPicked?: () => void;
};

/** The searchable, grouped list of palette items for one slot. */
export function InsertPicker({ open, onOpenChange, anchorRef, selection, element, slot, onPicked }: InsertPickerProps) {
  const say = useWords();
  const [query, setQuery] = useState("");
  const listId = useId();
  // Read when it opens: the palette depends on the components around the host on the canvas (click targets, phones).
  const result = useMemo(
    () => (open ? paletteFor(slotHostContext(selection, element, slot)) : null),
    // The canvas is read again on each opening; the selection's location and the element's source decide the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, selection.src, selection.instance, element, slot],
  );
  const sections = useMemo(() => {
    if (!result) return [];
    const matches = query.trim() ? new Set(searchPalette(result.items, query)) : null;
    return paletteSections(result, slot)
      .map((section) => ({ ...section, items: matches ? section.items.filter((item) => matches.has(item)) : section.items }))
      .filter((section) => section.items.length);
  }, [result, slot, query]);
  const target = useMemo(() => (open ? insertTargetFor(slot, slotContentOf(element, slot).summary) : null), [open, slot, element]);
  const noMatch = result && !sections.length ? "No component matches." : null;
  const hidden = result ? hiddenCaption(result) : null;
  const notes = [noMatch, target?.mode === "direct" ? target.warning : undefined].filter(Boolean).join(" ");
  const noted = Boolean(notes || hidden);
  const title = `Add to ${slot.name}`;

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };
  const pick = (item: PaletteItem) => {
    const context = result?.context;
    const warning = result?.warnings[item.id]?.reason;
    close();
    onPicked?.();
    void insertIntoSlot({ selection, element, slot, item, context, warning });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => { if (!next) close(); }}
      anchorRef={anchorRef}
      search
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Find a component"
      // With a note: the list is named by the title and the note together (both in the label, the title hidden).
      label={noted ? (
        <>
          <span id={`${listId}-title`} hidden>{title}</span>
          <span id={`${listId}-note`} className={`studio-slots__picker-note ${typographyStyles["Caption/Regular"]}`}>
            {notes}
            {notes && hidden ? " " : null}
            {/* One short line; each item's reason in its tooltip and in the list's accessible name. */}
            {hidden ? <span title={say(hidden.full)}>{hidden.short}<VisuallyHidden>{`: ${say(hidden.full)}`}</VisuallyHidden></span> : null}
          </span>
        </>
      ) : undefined}
      aria-label={noted ? undefined : title}
      aria-labelledby={noted ? `${listId}-title ${listId}-note` : undefined}
      className="studio-slots__picker"
      autoFocus
    >
      {sections.map((section, index) => (
        <div key={section.title} role="group" aria-labelledby={`${listId}-${index}`} className="studio-slots__picker-group">
          <div id={`${listId}-${index}`} role="presentation" className={`studio-slots__picker-kicker ${typographyStyles["Caption/Medium"]}`}>{section.title}</div>
          {section.items.map((item) => {
            const warning = result?.warnings[item.id];
            return (
              <PopoverItem
                key={item.id}
                label={item.label}
                caption={warning ? warning.short : item.caption}
                // The caption is one line: the full reason is the item's description.
                title={warning ? say(warning.reason) : undefined}
                aria-description={warning ? `Not recommended here: ${say(warning.reason)}` : undefined}
                onSelect={() => pick(item)}
              />
            );
          })}
        </div>
      ))}
    </Popover>
  );
}
