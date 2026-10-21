import { typographyStyles } from "../../../../tokens/typography.generated";
import "./deviceBars.css";

/*
 * The system bars a phone or tablet Screen of a builder page simulates (user, 2026-10-10: the page picks iOS or Android;
 * Present and Play draw the simulated device's, user 2026-10-21: an Android phone or tablet, an iPhone, an iPad; the
 * icons are dummies — circles and squares, not exact glyphs). What is exact is the room they take, because the app
 * pads by it (`--zen-safe-area-top/-bottom`, as PlatformPhone publishes):
 * - iOS: Figma Status-bar/IOS/Mobile (12013:39833) 50 high with the island, Status-bar/IOS/Tablet (12013:39942) 24;
 *   the home indicator (System/Bottom-Indicator 308:46297) in 28 (phone) / 20 (tablet), as PlatformPhone draws it.
 * - Android (Material 3 / AOSP, no Zen Figma component yet): status bar 24dp (core status_bar_height_portrait), gesture
 *   navigation 24dp (NavigationBarModeGesturalOverlay navigation_bar_height) with its 108 × 4 handle 10dp from the bottom
 *   (SystemUI navigation_home_handle_width, navigation_handle_radius, navigation_handle_bottom).
 * - iPhone Duo (always iOS): no status bar across the top; a cluster at the top right (Figma Status-bar/IOS/Duo
 *   16287:5822, `duo`): the clock over one ring (.Primitives/Status-bar/Duo-Status 16294:6171: battery as the arc over the
 *   top, cellular as the dots along the bottom, Wi-Fi inside), in the right strip of the open display (Side), under the
 *   outer display's camera (Island), or in a row at the top right of the open display turned upright (Corner). The app
 *   keeps the room Pattern/AppShell/Duo keeps (top 12, upright 16) and the home indicator's (144 wide).
 * The camera and the island are hardware: black in both themes.
 */

export type DeviceOs = "ios" | "android";
export type BarsDevice = "phone" | "tablet";
/** Where an iPhone Duo's status sits (screen-devices.mjs `bars`: duo-side, duo-corner, duo-island). */
export type DuoStatus = "side" | "corner" | "island";

/** The room the bars take (CSS px): what the Screen publishes as its safe areas. */
export const SAFE_AREAS: Readonly<Record<DeviceOs, Readonly<Record<BarsDevice, { top: number; bottom: number }>>>> = {
  ios: { phone: { top: 50, bottom: 28 }, tablet: { top: 24, bottom: 20 } },
  android: { phone: { top: 24, bottom: 24 }, tablet: { top: 24, bottom: 24 } },
};
/** The Duo's (Figma Pattern/AppShell/Duo: Main-Container's top 12, the upright display's Top-Row 16; Home-Indicator 26). */
export const DUO_SAFE_AREAS: Readonly<Record<DuoStatus, { top: number; bottom: number }>> = { side: { top: 12, bottom: 26 }, island: { top: 12, bottom: 26 }, corner: { top: 16, bottom: 26 } };

/** The Duo status a device's `bars` names, or undefined (not a Duo). */
export const duoStatusOf = (bars: string | undefined): DuoStatus | undefined => (bars === "duo-side" ? "side" : bars === "duo-corner" ? "corner" : bars === "duo-island" ? "island" : undefined);
/** The room a device's bars take: the Duo's, or the OS's for a phone or tablet. */
export const safeAreasOf = (os: DeviceOs, device: BarsDevice, duo?: DuoStatus) => (duo ? DUO_SAFE_AREAS[duo] : SAFE_AREAS[os][device]);

/** The Duo's status ring, drawn from Duo-Status (30 × 30): a 2 px arc from 148° to 32° over the top, five 2.6 dots on
 *  the gap and the Wi-Fi glyph (its Figma path) inside, all in Content/Neutral/Strongest. */
function DuoStatusIcon() {
  return (
    <svg className="studio-device-duo__ring" viewBox="0 0 30 30" aria-hidden="true">
      <path d="M3.13 22.42A14 14 0 1 1 26.87 22.42" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[[23.62, 26.03], [19.56, 28.24], [15, 29], [10.44, 28.24], [6.38, 26.03]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1.3" fill="currentColor" />)}
      <path transform="translate(8 8.47)" fillRule="evenodd" fill="currentColor" d={DUO_WIFI} />
    </svg>
  );
}
const DUO_WIFI = "M7 2.01C9.03 2.01 10.99 2.77 12.46 4.12C12.57 4.22 12.75 4.22 12.85 4.11L13.91 3.08C13.97 3.03 14 2.96 14 2.88C14 2.81 13.97 2.73 13.91 2.68C10.05-.89 3.95-.89.09 2.68C.03 2.73 0 2.81 0 2.88C0 2.96.03 3.03.09 3.08L1.15 4.11C1.25 4.22 1.43 4.22 1.54 4.12C3.02 2.77 4.97 2.01 7 2.01ZM7 5.46C8.11 5.46 9.18 5.88 10 6.63C10.11 6.74 10.28 6.74 10.39 6.63L11.44 5.55C11.5 5.49 11.53 5.42 11.53 5.34C11.53 5.26 11.5 5.18 11.44 5.13C8.94 2.77 5.06 2.77 2.56 5.13C2.5 5.18 2.47 5.26 2.47 5.34C2.47 5.42 2.5 5.49 2.55 5.55L3.61 6.63C3.71 6.74 3.89 6.74 4 6.63C4.82 5.88 5.89 5.46 7 5.46ZM9.06 7.74C9.06 7.83 9.03 7.91 8.98 7.97L7.2 9.98C7.15 10.04 7.07 10.07 7 10.07C6.93 10.07 6.86 10.04 6.8 9.98L5.03 7.97C4.97 7.91 4.94 7.83 4.94 7.74C4.94 7.66 4.98 7.58 5.03 7.52C6.17 6.44 7.83 6.44 8.97 7.52C9.02 7.58 9.06 7.66 9.06 7.74Z";

/** Both bars, or one (`part`): Present and Play pin each to its edge of the scrolled page (runtime.tsx Screen). An
 *  iPhone Duo (`duo`) draws its status cluster and its home indicator. */
export function DeviceBars({ os, device, part, duo }: { os: DeviceOs; device: BarsDevice; part?: "status" | "home"; duo?: DuoStatus }) {
  if (duo) return (
    <>
      {part === "home" ? null : <div className="studio-device-duo" data-status={duo} aria-hidden="true">
        {duo === "island" ? <span className="studio-device-duo__camera" data-theme="light" /> : null}
        <span className={`studio-device-duo__time ${typographyStyles["Body/Small/Bold"]}`}>9:41</span>
        <DuoStatusIcon />
      </div>}
      {part === "status" ? null : <span className="studio-device-home" data-os="ios" data-device="duo" aria-hidden="true" />}
    </>
  );
  return (
    <>
      {part === "home" ? null : <div className="studio-device-status" data-os={os} data-device={device} aria-hidden="true">
        <span className={`studio-device-status__time ${typographyStyles[os === "ios" && device === "phone" ? "Body/Base/Bold" : "Body/Small/Medium"]}`}>{os === "ios" ? "9:41" : "12:30"}</span>
        {os === "ios" && device === "phone" ? <span className="studio-device-status__island" data-theme="light" /> : null}
        {os === "android" && device === "phone" ? <span className="studio-device-status__camera" data-theme="light" /> : null}
        <span className="studio-device-status__icons">
          <span className="studio-device-status__dot" />
          <span className="studio-device-status__square" />
          <span className="studio-device-status__battery" />
        </span>
      </div>}
      {part === "status" ? null : <span className="studio-device-home" data-os={os} data-device={device} aria-hidden="true" />}
    </>
  );
}
