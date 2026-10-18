/*
 * The devices a builder Screen is made for and previewed on (user, 2026-10-18: "Screen thì chọn screen thiết bị nào",
 * then a device simulator in Present and Play). One list for the Frame tool's picker, the New page dialog, the Screen
 * section's Size and the preview's Device menu, so a frame drawn for a device previews on it.
 *
 * Sizes are CSS px. Desktop and the iPads are Zen's Figma Viewport (Breakpoint & Grids: Desktop 1512 × 982, Tablet
 * 744 × 1133; landscape turned). iPhone Duo is Apple's foldable (Sep 2026): Apple publishes pixels only
 * (inner 1878 × 2670, outer 1398 × 2034), these points are the iOS 27.1 simulator's (inner 951 × 669 open in
 * landscape, outer 466 × 678), so they are estimates until Apple documents them.
 *
 * `device` and `layout` are what the Screen gets (dialect PAGE_DEVICES, SCREEN_LAYOUTS); `bars` is the system chrome
 * the preview draws (DeviceBars): iOS phone, iPad, or where the Duo's status sits (Figma Status-bar/IOS/Duo 16287:5822:
 * Placement=Side at the top of the open display's right strip, Side-Island under the outer display's camera, Corner at
 * the top right of the open display turned upright). `radius` is the screen's corner, `turn` the same device turned,
 * `fold` the other display of a foldable and `foldAt` its hinge (Figma Pattern/AppShell/Duo › Fold: 40 at 455).
 */

/** @typedef {{ id: string, label: string, short: string, device: "phone" | "tablet" | "desktop", layout?: "mobile" | "desktop", width: number, height: number, icon: string, bars: "none" | "phone" | "tablet" | "duo-side" | "duo-corner" | "duo-island", radius: number, turn?: string, fold?: string, foldAt?: { axis: "x" | "y", at: number, size: number } }} ScreenDevice */

/** @type {ReadonlyArray<ScreenDevice>} */
export const SCREEN_DEVICES = Object.freeze([
  { id: "desktop", label: "Desktop", short: "Desktop", device: "desktop", width: 1512, height: 982, icon: "icon-monitor-01-line", bars: "none", radius: 0 },
  { id: "ipad-landscape", label: "iPad, landscape", short: "iPad", device: "tablet", layout: "desktop", width: 1133, height: 744, icon: "icon-tablet-line", bars: "tablet", radius: 22, turn: "ipad-portrait" },
  { id: "ipad-portrait", label: "iPad, portrait", short: "iPad", device: "tablet", layout: "mobile", width: 744, height: 1133, icon: "icon-tablet-line", bars: "tablet", radius: 22, turn: "ipad-landscape" },
  { id: "iphone", label: "iPhone", short: "iPhone", device: "phone", width: 390, height: 844, icon: "icon-mobile-line", bars: "phone", radius: 55 },
  { id: "duo-open", label: "iPhone Duo, open", short: "Duo", device: "tablet", layout: "desktop", width: 951, height: 669, icon: "icon-book-open-line", bars: "duo-side", radius: 28, turn: "duo-open-portrait", fold: "duo-closed", foldAt: { axis: "x", at: 455, size: 40 } },
  { id: "duo-open-portrait", label: "iPhone Duo, open (portrait)", short: "Duo", device: "phone", width: 669, height: 951, icon: "icon-book-open-line", bars: "duo-corner", radius: 28, turn: "duo-open", fold: "duo-closed", foldAt: { axis: "y", at: 455, size: 40 } },
  { id: "duo-closed", label: "iPhone Duo, closed", short: "Duo", device: "phone", width: 466, height: 678, icon: "icon-mobile-line", bars: "duo-island", radius: 46, fold: "duo-open" },
]);

/** The devices offered when a Screen is made (the Duo's portrait inner display is a turn of the open one, not a frame). */
export const FRAME_DEVICES = SCREEN_DEVICES.filter((entry) => entry.id !== "duo-open-portrait");

/** The device `id` names, or undefined. */
export const screenDevice = (id) => SCREEN_DEVICES.find((entry) => entry.id === id);

/** The device whose size is exactly `width` × `height`, or undefined (a custom size). */
export const deviceOfSize = (width, height) => SCREEN_DEVICES.find((entry) => entry.width === width && entry.height === height);

/**
 * The device a Screen is drawn for (Present and Play show it there in Auto; the Screen draws its bars): the device of
 * its size, else its device type's own (a tablet by its layout). A desktop Screen has none: Auto fills the window.
 */
export const deviceOfScreen = (device, layout, width, height) => {
  if (device !== "phone" && device !== "tablet") return undefined;
  const sized = deviceOfSize(width, height);
  if (sized && sized.device === device) return sized;
  return screenDevice(device === "phone" ? "iphone" : layout === "desktop" ? "ipad-landscape" : "ipad-portrait");
};

/** "390 × 844" */
export const deviceSize = (entry) => `${entry.width} × ${entry.height}`;
