import { typographyStyles } from "../../../../tokens/typography.generated";
import "./deviceBars.css";

/*
 * The system bars a phone or tablet Screen of a builder page simulates (user, 2026-10-10: the page picks iOS or Android;
 * the icons are dummies — circles and squares, not exact glyphs). What is exact is the room they take, because the app
 * pads by it (`--zen-safe-area-top/-bottom`, as PlatformPhone publishes):
 * - iOS: Figma Status-bar/IOS/Mobile (12013:39833) 50 high with the island, Status-bar/IOS/Tablet (12013:39942) 24;
 *   the home indicator (System/Bottom-Indicator 308:46297) in 28 (phone) / 20 (tablet), as PlatformPhone draws it.
 * - Android (Material 3 / AOSP, no Zen Figma component yet): status bar 24dp (core status_bar_height_portrait), gesture
 *   navigation 24dp (NavigationBarModeGesturalOverlay navigation_bar_height) with its 108 × 4 handle 10dp from the bottom
 *   (SystemUI navigation_home_handle_width, navigation_handle_radius, navigation_handle_bottom).
 */

export type DeviceOs = "ios" | "android";
export type BarsDevice = "phone" | "tablet";

/** The room the bars take (CSS px): what the Screen publishes as its safe areas. */
export const SAFE_AREAS: Readonly<Record<DeviceOs, Readonly<Record<BarsDevice, { top: number; bottom: number }>>>> = {
  ios: { phone: { top: 50, bottom: 28 }, tablet: { top: 24, bottom: 20 } },
  android: { phone: { top: 24, bottom: 24 }, tablet: { top: 24, bottom: 24 } },
};

export function DeviceBars({ os, device }: { os: DeviceOs; device: BarsDevice }) {
  return (
    <>
      <div className="studio-device-status" data-os={os} data-device={device} aria-hidden="true">
        <span className={`studio-device-status__time ${typographyStyles[os === "ios" && device === "phone" ? "Body/Base/Bold" : "Body/Small/Medium"]}`}>{os === "ios" ? "9:41" : "12:30"}</span>
        {os === "ios" && device === "phone" ? <span className="studio-device-status__island" /> : null}
        {os === "android" && device === "phone" ? <span className="studio-device-status__camera" /> : null}
        <span className="studio-device-status__icons">
          <span className="studio-device-status__dot" />
          <span className="studio-device-status__square" />
          <span className="studio-device-status__battery" />
        </span>
      </div>
      <span className="studio-device-home" data-os={os} data-device={device} aria-hidden="true" />
    </>
  );
}
