/*
 * The devices a builder Screen is made for and previewed on (user, 2026-10-18: "Screen thì chọn screen thiết bị nào",
 * then a device simulator in Present and Play). One list for the Frame tool's picker, the New page dialog, the Screen
 * section's Size and the preview's Device menu, so a frame drawn for a device previews on it.
 *
 * Sizes are CSS px. Desktop and the iPads are Zen's Figma Viewport (Breakpoint & Grids: Desktop 1512 × 982, Tablet
 * 744 × 1133; landscape turned). iPhone Duo is Apple's foldable (Sep 2026): Apple publishes pixels only
 * (inner 1878 × 2670, outer 1398 × 2034), these points are the iOS 27.1 simulator's (inner 951 × 669 open in
 * landscape, outer 466 × 678), so they are estimates until Apple documents them. The Androids (user, 2026-10-21: "thêm
 * máy Android vào simulator") are Figma's presets and Google's reference sizes: the phone is Android Compact (412 × 917,
 * the Pixel 8 class), the tablet Android Expanded (1280 × 800, the Pixel Tablet), portrait turned. Google publishes no
 * corner radius (apps read RoundedCorner at run time): the phone's 39 is the Pixel 8's reported 102 device px at its
 * 2.625 density, the tablet's 20 an estimate, both until measured on a device.
 *
 * `device` and `layout` are what the Screen gets (dialect PAGE_DEVICES, SCREEN_LAYOUTS); `bars` is the system chrome
 * the preview draws (DeviceBars) for `os` (iOS unless `android`): a phone's, a tablet's, or where the Duo's status sits
 * (Figma Status-bar/IOS/Duo 16287:5822: Placement=Side at the top of the open display's right strip, Side-Island under
 * the outer display's camera, Corner at the top right of the open display turned upright). `radius` is the screen's
 * corner, `turn` the same device turned, `fold` the other display of a foldable and `foldAt` its hinge (Figma
 * Pattern/AppShell/Duo › Fold: 40 at 455).
 */

/** @typedef {{ id: string, label: string, short: string, device: "phone" | "tablet" | "desktop", layout?: "mobile" | "desktop", width: number, height: number, icon: string, os?: "ios" | "android", bars: "none" | "phone" | "tablet" | "duo-side" | "duo-corner" | "duo-island", radius: number, turn?: string, fold?: string, foldAt?: { axis: "x" | "y", at: number, size: number } }} ScreenDevice */

/** @type {ReadonlyArray<ScreenDevice>} */
export const SCREEN_DEVICES = Object.freeze([
  { id: "desktop", label: "Desktop", short: "Desktop", device: "desktop", width: 1512, height: 982, icon: "icon-monitor-01-line", bars: "none", radius: 0 },
  { id: "ipad-landscape", label: "iPad, landscape", short: "iPad", device: "tablet", layout: "desktop", width: 1133, height: 744, icon: "icon-tablet-line", bars: "tablet", radius: 22, turn: "ipad-portrait" },
  { id: "ipad-portrait", label: "iPad, portrait", short: "iPad", device: "tablet", layout: "mobile", width: 744, height: 1133, icon: "icon-tablet-line", bars: "tablet", radius: 22, turn: "ipad-landscape" },
  { id: "iphone", label: "iPhone", short: "iPhone", device: "phone", width: 390, height: 844, icon: "icon-mobile-line", bars: "phone", radius: 55 },
  { id: "duo-open", label: "iPhone Duo, open", short: "Duo", device: "tablet", layout: "desktop", width: 951, height: 669, icon: "icon-book-open-line", bars: "duo-side", radius: 28, turn: "duo-open-portrait", fold: "duo-closed", foldAt: { axis: "x", at: 455, size: 40 } },
  { id: "duo-open-portrait", label: "iPhone Duo, open (portrait)", short: "Duo", device: "phone", width: 669, height: 951, icon: "icon-book-open-line", bars: "duo-corner", radius: 28, turn: "duo-open", fold: "duo-closed", foldAt: { axis: "y", at: 455, size: 40 } },
  { id: "duo-closed", label: "iPhone Duo, closed", short: "Duo", device: "phone", width: 466, height: 678, icon: "icon-mobile-line", bars: "duo-island", radius: 46, fold: "duo-open" },
  { id: "android-phone", label: "Android phone", short: "Android", device: "phone", width: 412, height: 917, icon: "icon-mobile-line", os: "android", bars: "phone", radius: 39 },
  { id: "android-tablet-landscape", label: "Android tablet, landscape", short: "Android tablet", device: "tablet", layout: "desktop", width: 1280, height: 800, icon: "icon-tablet-line", os: "android", bars: "tablet", radius: 20, turn: "android-tablet-portrait" },
  { id: "android-tablet-portrait", label: "Android tablet, portrait", short: "Android tablet", device: "tablet", layout: "mobile", width: 800, height: 1280, icon: "icon-tablet-line", os: "android", bars: "tablet", radius: 20, turn: "android-tablet-landscape" },
]);

/** The devices offered when a Screen is made (the Duo's portrait inner display is a turn of the open one, not a frame). */
export const FRAME_DEVICES = SCREEN_DEVICES.filter((entry) => entry.id !== "duo-open-portrait");

/** The device `id` names, or undefined. */
export const screenDevice = (id) => SCREEN_DEVICES.find((entry) => entry.id === id);

/** The device whose size is exactly `width` × `height`, or undefined (a custom size). */
export const deviceOfSize = (width, height) => SCREEN_DEVICES.find((entry) => entry.width === width && entry.height === height);

/** The system a device's bars draw: "android" or "ios" (every Apple device, and Desktop, which draws none). */
export const deviceOs = (entry) => (entry?.os === "android" ? "android" : "ios");

/** Each OS's own phone and tablet: what a Screen of no device's size is drawn for. */
const OWN_DEVICES = {
  ios: { phone: "iphone", landscape: "ipad-landscape", portrait: "ipad-portrait" },
  android: { phone: "android-phone", landscape: "android-tablet-landscape", portrait: "android-tablet-portrait" },
};

/**
 * The device a Screen is drawn for (Present and Play show it there in Auto; the Screen draws its bars): the device of
 * its size among the page's OS's (`os`, the page header's; a foldable has its own bars, so the Duo is one whatever the
 * OS), else its device type's own on that OS (a tablet by its layout). A desktop Screen has none: Auto fills the window.
 * So a 390 × 844 Screen of an Android page plays on the Android phone, as its canvas frame draws Android's bars.
 */
export const deviceOfScreen = (device, layout, width, height, os = "ios") => {
  if (device !== "phone" && device !== "tablet") return undefined;
  const sized = deviceOfSize(width, height);
  if (sized && sized.device === device && (deviceOs(sized) === os || sized.fold)) return sized;
  const own = OWN_DEVICES[os === "android" ? "android" : "ios"];
  return screenDevice(device === "phone" ? own.phone : layout === "desktop" ? own.landscape : own.portrait);
};

/** "390 × 844" */
export const deviceSize = (entry) => `${entry.width} × ${entry.height}`;

/*
 * Figma's frame presets (UI3: the right panel while the Frame tool is on; user 2026-10-19: "Đủ nhóm Figma"), by group in
 * Figma's order, with Figma's names and sizes. Zen's devices come first in their group (a preset of the same size is
 * Zen's device: Figma's iPhone 13 & 14, iPad mini 8.3 and MacBook Pro 14" are Zen's iPhone, iPad portrait and Desktop),
 * so a frame made from them previews on the simulator (deviceOfScreen). `device` is what the Screen gets: phones and
 * watches are phone, tablets tablet (laid out as desktop when wider than tall), the rest desktop.
 */

/** @typedef {{ id: string, label: string, width: number, height: number, device: "phone" | "tablet" | "desktop", layout?: "mobile" | "desktop", zen?: string }} FramePreset */
/** @typedef {{ id: string, label: string, icon: string, presets: ReadonlyArray<FramePreset> }} FramePresetGroup */

const FIGMA_PRESETS = [
  { id: "phone", label: "Phone", icon: "icon-mobile-line", device: "phone", sizes: [
    ["iPhone 16", 393, 852], ["iPhone 16 Pro", 402, 874], ["iPhone 16 Pro Max", 440, 956], ["iPhone 16 Plus", 430, 932],
    ["iPhone 14 & 15 Pro Max", 430, 932], ["iPhone 14 & 15 Pro", 393, 852], ["iPhone 13 & 14", 390, 844], ["iPhone 14 Plus", 428, 926],
    ["iPhone 13 mini", 375, 812], ["iPhone SE", 320, 568], ["Android Compact", 412, 917], ["Android Medium", 700, 840],
  ] },
  { id: "tablet", label: "Tablet", icon: "icon-tablet-line", device: "tablet", sizes: [
    ["Surface Pro 8", 1440, 960], ["iPad mini 8.3", 744, 1133], ["iPad Pro 11\"", 834, 1194], ["iPad Pro 12.9\"", 1024, 1366], ["Android Expanded", 1280, 800],
  ] },
  { id: "desktop", label: "Desktop", icon: "icon-monitor-01-line", device: "desktop", sizes: [
    ["MacBook Air", 1280, 832], ["MacBook Pro 14\"", 1512, 982], ["MacBook Pro 16\"", 1728, 1117], ["Desktop", 1440, 1024], ["Wireframes", 1440, 1024], ["TV", 1280, 720],
  ] },
  { id: "presentation", label: "Presentation", icon: "icon-presentation-chart-line", device: "desktop", sizes: [["Slide 16:9", 1920, 1080], ["Slide 4:3", 1024, 768]] },
  { id: "watch", label: "Watch", icon: "icon-watch-circle-line", device: "phone", sizes: [
    ["Apple Watch Series 10 42mm", 187, 223], ["Apple Watch Series 10 46mm", 208, 248], ["Apple Watch 41mm", 176, 215], ["Apple Watch 45mm", 198, 242],
    ["Apple Watch 44mm", 184, 224], ["Apple Watch 40mm", 162, 197],
  ] },
  { id: "paper", label: "Paper", icon: "icon-file-doc-line", device: "desktop", sizes: [["A4", 595, 842], ["A5", 420, 595], ["A6", 297, 420], ["Letter", 612, 792], ["Tabloid", 792, 1224]] },
  { id: "social", label: "Social media", icon: "icon-image-line", device: "desktop", sizes: [
    ["Twitter post", 1200, 675], ["Twitter header", 1500, 500], ["Facebook post", 1200, 630], ["Facebook cover", 820, 312], ["Instagram post", 1080, 1080],
    ["Instagram story", 1080, 1920], ["Dribbble shot", 400, 300], ["Dribbble shot HD", 800, 600], ["LinkedIn cover", 1584, 396],
  ] },
];

const slug = (text) => text.toLowerCase().replace(/["&]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** @type {ReadonlyArray<FramePresetGroup>} */
export const FRAME_PRESET_GROUPS = Object.freeze(FIGMA_PRESETS.map((group) => {
  // A Zen device whose name a Figma preset of the group also has (Desktop: Figma's is 1440 × 1024) takes the name of
  // Figma's preset of its size (MacBook Pro 14"), so no two rows read the same.
  const twin = (entry) => group.sizes.find(([, width, height]) => width === entry.width && height === entry.height)?.[0];
  const label = (entry) => (group.sizes.some(([name]) => name === entry.label) ? twin(entry) ?? entry.label : entry.label);
  const zen = FRAME_DEVICES.filter((entry) => entry.device === group.id).map((entry) => ({ id: entry.id, label: label(entry), width: entry.width, height: entry.height, device: entry.device, ...(entry.layout ? { layout: entry.layout } : {}), zen: entry.id }));
  const taken = new Set(zen.map((entry) => `${entry.width}x${entry.height}`));
  const figma = group.sizes.filter(([, width, height]) => !taken.has(`${width}x${height}`)).map(([label, width, height]) => ({
    id: `${group.id}-${slug(label)}`, label, width, height, device: group.device,
    ...(group.device === "tablet" ? { layout: width > height ? "desktop" : "mobile" } : {}),
  }));
  return Object.freeze({ id: group.id, label: group.label, icon: group.icon, presets: Object.freeze([...zen, ...figma]) });
}));

/** The preset `id` names, or undefined. */
export const framePreset = (id) => FRAME_PRESET_GROUPS.flatMap((group) => group.presets).find((entry) => entry.id === id);
