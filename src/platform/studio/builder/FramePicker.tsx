import { useState, useSyncExternalStore } from "react";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { ZenPortalProvider } from "../../../components/Portal";
import type { IconName } from "../../../icons/generated/names";
import { FRAME_DEVICES, deviceSize } from "../../../../tools/studio/screen-devices.mjs";
import { useChromeAttributes } from "../shell/ChromeScope";
import { addFrame } from "./proto/addFrame";
import type { FramePlace } from "./render/framePlace";

/*
 * What a click with the Frame tool makes (user, 2026-10-18: "nếu click ra canvas người dùng được chọn nó là
 * Screen/Frame. Screen thì chọn screen thiết bị nào"): a menu at the pointer offers a Screen for each device of
 * tools/studio/screen-devices.mjs (an empty Screen of that size, its device and layout set) or a plain Frame (Figma's
 * click: 100 × 100). Neither comes with an app frame: the AppShell is added from the Screen section or Assets. A drag
 * with the Frame tool still draws a Screen of the dragged size (frameMove.ts). Escape or a press outside makes nothing.
 */

type PickerState = { x: number; y: number; localPage: string; place: FramePlace; at: number };

/** Figma's frame made by a click without a preset. */
const FRAME_CLICK = { width: 100, height: 100 };

let state: PickerState | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const set = (next: PickerState | null) => { state = next; listeners.forEach((listener) => listener()); };

/** Opens the picker at a client point for a frame placed at `place` (board px) on the builder page `localPage`. */
export function openFramePicker(x: number, y: number, localPage: string, place: FramePlace) {
  set({ x, y, localPage, place, at: Date.now() });
}

export function FramePicker() {
  const picker = useSyncExternalStore(subscribe, () => state, () => null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const chrome = useChromeAttributes();
  const screens: MenuEntry = {
    type: "group",
    id: "frame-picker-screens",
    label: "Screen",
    items: FRAME_DEVICES.map((entry) => ({
      id: `screen-${entry.id}`,
      label: entry.label,
      icon: entry.icon as IconName,
      shortcut: deviceSize(entry),
      onSelect: () => {
        if (!picker) return;
        void addFrame(picker.localPage, "screen", { place: picker.place, width: entry.width, height: entry.height, device: entry.device, layout: entry.layout, name: entry.short, empty: true });
      },
    })),
  };
  const frames: MenuEntry = {
    type: "group",
    id: "frame-picker-frames",
    label: "Frame",
    items: [{
      id: "frame-plain",
      label: "Frame",
      icon: "icon-square-line",
      shortcut: `${FRAME_CLICK.width} × ${FRAME_CLICK.height}`,
      onSelect: () => {
        if (!picker) return;
        void addFrame(picker.localPage, "screen", { place: picker.place, width: FRAME_CLICK.width, height: FRAME_CLICK.height, device: "desktop", name: "Frame", empty: true });
      },
    }],
  };
  return (
    <>
      <div ref={setLayer} className="studio-canvas-menu__layer" {...chrome} />
      <ZenPortalProvider container={layer}>
        <Menu
          open={Boolean(picker)}
          onOpenChange={(open) => { if (!open) set(null); }}
          aria-label="New frame"
          items={[screens, { type: "separator", id: "frame-picker-separator" }, frames]}
          trigger={<button type="button" tabIndex={-1} aria-label="New frame" className="studio-canvas-menu__anchor" style={{ left: picker?.x ?? 0, top: picker?.y ?? 0 }} />}
        />
      </ZenPortalProvider>
    </>
  );
}
