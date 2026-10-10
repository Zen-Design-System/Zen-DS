import { useContext, useId, useMemo, useRef, useState } from "react";
import { Avatar } from "../../../../components/Avatar";
import { Button } from "../../../../components/Button";
import { Popover, PopoverItem } from "../../../../components/Popover";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { altOf, ASSET_PREFIX, useUploads, type Upload } from "../../builder/assets/uploads";
import { LIBRARY_PHOTOS, MEDIA_FILES, MEDIA_PREFIX, pictureValueOf, resolveMedia } from "../../builder/library/media";
import { InspectorFileContext } from "./hostContext";

/*
 * A picture prop (Avatar / AppShellAccount / Image `src`, propSchema.ts editor kind "photo"): Figma's image fill picker
 * for a page you made. The menu lists this browser's uploads, the people photos (src/assets/media/avatar-*) and the
 * library's photos; a pick writes `src="zen-media:<key>"` or `src="zen-asset:<id>"`, which the page renderer resolves.
 * In example and template code the same pick is written as the picture's file (media.ts pictureCode), so every Avatar,
 * Image and account picture takes a photo the same way (user, 2026-10-10: "Avatar không bỏ ảnh vào được", "thay hình
 * vào avatar trong mọi component hệt như các example"); uploads stay on pages you made.
 */

type Choice = { value: string; label: string; src: string };
type Group = { id: string; title: string; choices: Choice[] };

const titleOf = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/^\w/, (char) => char.toUpperCase());

/** The menu's groups: uploads, people, library (people first for an avatar, the library first for an image). */
function photoGroups(uploads: readonly Upload[], people: boolean): Group[] {
  const mine: Choice[] = uploads.map((upload) => ({ value: `${ASSET_PREFIX}${upload.id}`, label: altOf(upload.name), src: upload.url }));
  const faces: Choice[] = [...MEDIA_FILES]
    .filter(([key]) => key.startsWith("avatar-"))
    .map(([key, src]) => ({ value: `${MEDIA_PREFIX}${key}`, label: titleOf(key.slice("avatar-".length)), src }));
  const library: Choice[] = LIBRARY_PHOTOS.map((entry) => ({ value: `${MEDIA_PREFIX}${entry.key}`, label: entry.photo.alt, src: entry.photo.src }));
  const groups: Group[] = [
    { id: "uploads", title: "Your uploads", choices: mine },
    ...(people
      ? [{ id: "people", title: "People", choices: faces }, { id: "library", title: "Library", choices: library }]
      : [{ id: "library", title: "Library", choices: library }, { id: "people", title: "People", choices: faces }]),
  ];
  return groups.filter((group) => group.choices.length);
}

/** What the field reads for a value: the picture's name, else the key or address as written. */
function nameOf(value: string, groups: readonly Group[]): string {
  for (const group of groups) for (const choice of group.choices) if (choice.value === value) return choice.label;
  if (value.startsWith(MEDIA_PREFIX)) return titleOf(value.slice(MEDIA_PREFIX.length).replace(/^tpl\.[^.]+\./, "").replace(/\.\w+$/, ""));
  if (value.startsWith(ASSET_PREFIX)) return "Missing upload";
  return value.replace(/^.*\//, "") || value;
}

/** A square thumbnail of the picture (Avatar's photo fill, 20px like an icon in the field). */
const Thumb = ({ src }: { src: string }) => <Avatar size="2xsmall" shape="square" src={src} alt="" />;

export function PhotoControl({ label, value: given, disabled, onSet, onClear, people = false }: {
  label: string;
  /** The picture as written (a zen-media:/zen-asset: value, a `new URL(…)` expression) or as it renders (a URL). */
  value: string | undefined;
  disabled: boolean;
  onSet: (value: string) => void;
  /** Takes the picture away (the row's reset); unset: no "None" in the menu. */
  onClear?: () => void;
  /** An avatar: the people photos lead the menu. */
  people?: boolean;
}) {
  const file = useContext(InspectorFileContext);
  const uploads = useUploads();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const groups = useMemo(() => photoGroups(uploads, people), [uploads, people]);
  const value = pictureValueOf(file, given, given);
  const terms = query.trim().toLowerCase();
  const shown = terms ? groups.map((group) => ({ ...group, choices: group.choices.filter((choice) => choice.label.toLowerCase().includes(terms)) })).filter((group) => group.choices.length) : groups;
  const pick = (next: string) => {
    setOpen(false);
    setQuery("");
    if (next !== value) onSet(next);
  };
  const current = value ? resolveMedia(value) : undefined;
  const name = value ? nameOf(value, groups) : "None";
  return (
    <div ref={anchorRef} className="studio-icon-control studio-photo-control" data-empty={value ? undefined : "true"}>
      {/* zen-allow-filter-button: an inspector value picker (a picture for a prop), not a filter or sort control; it wears a
          field's frame like the selects around it (Design panel UI3) */}
      <Button
        level="tertiary"
        size="sm"
        disabled={disabled}
        startIcon={typeof current === "string" ? <Thumb src={current} /> : "icon-image-line"}
        endIcon="icon-chevron-down-line"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value ? name : "none"}`}
        onClick={() => setOpen((was) => !was)}
      >
        <span className={`studio-icon-control__label ${typographyStyles["Body/Small/Medium"]}`}>{name}</span>
      </Button>
      <Popover
        open={open}
        onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}
        anchorRef={anchorRef}
        search
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search photos"
        aria-label={`${label} photos`}
        autoFocus
        emptyState="No photo matches"
      >
        {onClear && !terms ? <PopoverItem label="None" leading="icon-image-line" selected={!value} onSelect={() => { setOpen(false); if (value) onClear(); }} /> : null}
        {shown.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`${listId}-${group.id}`} className="studio-type-control__group" data-photo-group={group.id}>
            <div id={`${listId}-${group.id}`} role="presentation" className={`studio-type-control__family ${typographyStyles["Caption/Medium"]}`}>{group.title}</div>
            {group.choices.map((choice) => <PopoverItem key={choice.value} label={choice.label} leading={<Thumb src={choice.src} />} selected={choice.value === value} onSelect={() => pick(choice.value)} />)}
          </div>
        ))}
      </Popover>
    </div>
  );
}
