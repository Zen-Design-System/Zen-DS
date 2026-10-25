import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { NumberField } from "../../../components/Input";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { Segmented } from "../../../components/Segmented";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { IconName } from "../../../icons/generated/names";
import { BREAKPOINT_ICONS, BREAKPOINT_LABELS, BREAKPOINTS, FRAME_DEVICES, deviceSize, screenBreakpoint, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { makeSeparateScreen, setScreenView, shownBreakpoint, viewForBreakpoint, viewLabel, type ScreenView } from "../builder/screenViews";
import { FRAME_MAX_WIDTH, FRAME_MIN_WIDTH } from "./frameLayout";
import type { StudioFrameEntry } from "./frames";

/*
 * The view switch on a builder Screen's label (docs/research/studio-responsive-breakpoints-2026-10-26.md §3.4): Desktop ·
 * Tablet · Mobile show the Screen on that breakpoint's device (the page OS's phone, its tablet in portrait, Desktop; the
 * Screen's own breakpoint shows it as saved), the menu adds the other devices and Make a separate Screen. A view changes
 * nothing in the page: while it is on, the label row reads "Viewing Mobile · 390 · Back to Desktop", the width can be
 * typed, and Escape on the label or Back ends it.
 */

type Shape = NonNullable<NonNullable<StudioFrameEntry["example"]>["shape"]>;

/** The Screen as saved, and its own breakpoint. */
const ownBreakpoint = (shape: Shape) => screenBreakpoint(shape.device, shape.width);

/** Desktop · Tablet · Mobile, then More views (the frame tools of a Screen). */
export function ScreenViewTools({ frame, shape, view, editable, onMenuOpenChange }: { frame: StudioFrameEntry; shape: Shape; view: ScreenView | undefined; editable: boolean; onMenuOpenChange: (open: boolean) => void }) {
  const shown = shownBreakpoint(shape, view);
  const viewed = view ? viewLabel(view, shape.height) : null;
  const items: MenuEntry[] = [
    { type: "group", label: "View on", items: FRAME_DEVICES.map((entry) => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon as IconName,
      caption: view?.device === entry.id ? `${deviceSize(entry)} · Viewing` : deviceSize(entry),
      onSelect: () => setScreenView(frame.id, { device: entry.id, width: entry.width }),
    })) },
    ...(editable && view && viewed && viewed.breakpoint !== "desktop" ? [
      { type: "separator" as const },
      { id: "separate", label: "Make a separate Screen", icon: "icon-copy-line" as IconName, caption: `A ${BREAKPOINT_LABELS[viewed.breakpoint]} copy you edit on its own`, onSelect: () => { void makeSeparateScreen(frame.id, view, { ...shape, title: frame.label }); } },
    ] : []),
  ];
  return (
    <>
      <Segmented
        aria-label={`View ${frame.label} on`}
        size="sm"
        value={shown}
        onValueChange={(next) => setScreenView(frame.id, viewForBreakpoint(shape, next as ZenBreakpointKey, shape.os))}
        options={BREAKPOINTS.map((key) => ({ id: key, label: null, leading: BREAKPOINT_ICONS[key] as IconName, "aria-label": key === ownBreakpoint(shape) ? `${BREAKPOINT_LABELS[key]} (as saved)` : `View on ${BREAKPOINT_LABELS[key]}` }))}
      />
      <Menu
        aria-label="More views"
        align="end"
        onOpenChange={onMenuOpenChange}
        items={items}
        trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label="More views" tooltip="More views" icon={<Icon name="icon-chevron-down-line" />} />}
      />
    </>
  );
}

/** While a view is on: "Viewing Mobile · [390] · Back to Desktop" (the typed width shows the Screen that wide). */
export function ScreenViewStatus({ frame, shape, view }: { frame: StudioFrameEntry; shape: Shape; view: ScreenView }) {
  const { text } = viewLabel(view, shape.height);
  const own = BREAKPOINT_LABELS[ownBreakpoint(shape)];
  return (
    <div className="studio-frame-view" role="group" aria-label={`${frame.label}: ${text}`} data-chrome-key={`view:${frame.id}`} onKeyDown={(event) => { if (event.key === "Escape" && !(event.target instanceof HTMLInputElement)) { event.stopPropagation(); setScreenView(frame.id, null); } }}>
      <span className={`studio-frame-view__text ${typographyStyles["Caption/Medium"]}`}>{text.replace(/ · \d+$/, "")}</span>
      <NumberField
        aria-label="View width"
        size="sm"
        layout="inline"
        label="W"
        min={FRAME_MIN_WIDTH}
        max={FRAME_MAX_WIDTH}
        value={view.width}
        onValueChange={(next) => { if (next !== null && next >= FRAME_MIN_WIDTH && next <= FRAME_MAX_WIDTH && next !== view.width) setScreenView(frame.id, { device: "width", width: next }); }}
      />
      <Button appearance="flat" level="primary" size="sm" onClick={() => setScreenView(frame.id, null)}>{`Back to ${own}`}</Button>
    </div>
  );
}
