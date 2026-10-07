import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";

/** Device presets: CSS-pixel screen size and the system safe areas the Figma frames use. */
export const platformDevices = {
  /** iPhone 14 / 15 (Figma Status-bar/IOS/Mobile 390×50 + System/Bottom-Indicator 28). */
  iphone: { label: "iPhone 15", width: 390, height: 844, top: 50, bottom: 28, island: true, radius: 55, pointsPerInch: 460 / 3 },
  /** iPhone 15 Plus / Pro Max. */
  "iphone-max": { label: "iPhone 15 Pro Max", width: 430, height: 932, top: 50, bottom: 28, island: true, radius: 55, pointsPerInch: 460 / 3 },
  /** iPad Air 11" portrait: 24px status bar, no island. */
  ipad: { label: "iPad Air", width: 820, height: 1180, top: 24, bottom: 20, island: false, radius: 18, pointsPerInch: 264 / 2 },
} as const;

/** CSS px per physical inch of the reference desktop: a MacBook at its default "looks like" resolution
 *  (14" 1512×982 / 16" 1728×1117 → 254 ppi @2x ≈ 127). Scaling a device by this / its points-per-inch shows it at
 *  roughly its real, in-hand size — the same in the playground and every example. */
export const DESKTOP_CSS_PX_PER_INCH = 127;
export const physicalScale = (device: PlatformDevice) => Math.min(1, DESKTOP_CSS_PX_PER_INCH / platformDevices[device].pointsPerInch);
export type PlatformDevice = keyof typeof platformDevices;

/* Figma Status-bar/IOS/Mobile (12013:39833) level icons, exported as SVG; they take the status bar tone (currentColor). */
const Cellular = () => <svg width="20" height="13" viewBox="0 0 20 13" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M19.2 1.14623C19.2 0.513183 18.7224 0 18.1333 0H17.0667C16.4776 0 16 0.513183 16 1.14623V11.0802C16 11.7132 16.4776 12.2264 17.0667 12.2264H18.1333C18.7224 12.2264 19.2 11.7132 19.2 11.0802V1.14623ZM11.7659 2.44528H12.8326C13.4217 2.44528 13.8992 2.97078 13.8992 3.61902V11.0527C13.8992 11.7009 13.4217 12.2264 12.8326 12.2264H11.7659C11.1768 12.2264 10.6992 11.7009 10.6992 11.0527V3.61902C10.6992 2.97078 11.1768 2.44528 11.7659 2.44528ZM7.43411 5.09433H6.36745C5.77834 5.09433 5.30078 5.62652 5.30078 6.28301V11.0377C5.30078 11.6942 5.77834 12.2264 6.36745 12.2264H7.43411C8.02322 12.2264 8.50078 11.6942 8.50078 11.0377V6.28301C8.50078 5.62652 8.02322 5.09433 7.43411 5.09433ZM2.13333 7.53962H1.06667C0.477563 7.53962 0 8.06421 0 8.71132V11.0547C0 11.7018 0.477563 12.2264 1.06667 12.2264H2.13333C2.72244 12.2264 3.2 11.7018 3.2 11.0547V8.71132C3.2 8.06421 2.72244 7.53962 2.13333 7.53962Z" /></svg>;
const Wifi = () => <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M8.5713 2.46628C11.0584 2.46639 13.4504 3.38847 15.2529 5.04195C15.3887 5.1696 15.6056 5.16799 15.7393 5.03834L17.0368 3.77487C17.1045 3.70911 17.1422 3.62004 17.1417 3.52735C17.1411 3.43467 17.1023 3.34603 17.0338 3.28104C12.3028 -1.09368 4.83907 -1.09368 0.108056 3.28104C0.039524 3.34598 0.000639766 3.4346 7.82398e-06 3.52728C-0.000624118 3.61996 0.0370483 3.70906 0.104689 3.77487L1.40255 5.03834C1.53615 5.16819 1.75327 5.1698 1.88893 5.04195C3.69167 3.38836 6.08395 2.46628 8.5713 2.46628ZM8.56795 6.68656C9.92527 6.68647 11.2341 7.19821 12.2403 8.12234C12.3763 8.2535 12.5907 8.25065 12.7234 8.11593L14.0106 6.79663C14.0784 6.72742 14.1161 6.63355 14.1151 6.536C14.1141 6.43844 14.0746 6.34536 14.0054 6.27757C10.9416 3.38672 6.19688 3.38672 3.13305 6.27757C3.06384 6.34536 3.02435 6.43849 3.02345 6.53607C3.02254 6.63366 3.06028 6.72752 3.12822 6.79663L4.41513 8.11593C4.54778 8.25065 4.76215 8.2535 4.89823 8.12234C5.90368 7.19882 7.21152 6.68713 8.56795 6.68656ZM11.0924 9.48011C11.0943 9.58546 11.0572 9.68703 10.9899 9.76084L8.81327 12.2156C8.74946 12.2877 8.66247 12.3283 8.5717 12.3283C8.48093 12.3283 8.39394 12.2877 8.33013 12.2156L6.1531 9.76084C6.08585 9.68697 6.04886 9.58537 6.05085 9.48002C6.05284 9.37467 6.09365 9.27491 6.16364 9.20429C7.55374 7.8904 9.58966 7.8904 10.9798 9.20429C11.0497 9.27497 11.0904 9.37476 11.0924 9.48011Z" /></svg>;
const Battery = () => <svg width="28" height="13" viewBox="0 0 28 13" aria-hidden="true"><rect opacity="0.35" x="0.5" y="0.5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" /><path opacity="0.4" fill="currentColor" d="M26 4.78125V8.85672C26.8047 8.51155 27.328 7.70859 27.328 6.81899C27.328 5.92938 26.8047 5.12642 26 4.78125Z" /><rect x="2" y="2" width="21" height="9" rx="2.5" fill="currentColor" /></svg>;

export type PlatformPhoneModes = { density?: "compact" | "comfortable"; typography?: "mobile" | "popular" | "dashboard" };

/** The modes Zen Studio's Present picked for the presented screen: they win over a phone frame's own (Comfortable +
 *  Mobile). Empty everywhere else, so the docs and the canvas always show phones in the phone modes. */
export const PlatformPhoneModesContext = createContext<PlatformPhoneModes>({});

/**
 * Platform chrome (not a DS component): a device simulator for mobile components.
 * - Real CSS-pixel screen (iPhone 15 390×844 by default), scaled down as a whole when the stage is narrower or `maxHeight`
 *   is set, so proportions never change.
 * - The status bar (Figma Status-bar/IOS/Mobile) and the home indicator are drawn by the "OS" on top of the app, like on a
 *   device. The app extends underneath them: the frame publishes `--zen-safe-area-top/-bottom`, and Top Navigation,
 *   Bottom Navigation, Bottom Sheet and the Chat composer pad by them, so their own background runs under the status bar
 *   and the indicator instead of leaving a separate strip.
 * - It is the positioned container that `inline` overlays (BottomSheet) anchor to.
 * - Its content renders in the phone modes a phone app sets (`<ZenProvider typography="mobile" density="comfortable">`):
 *   Mobile typography (`data-typography="mobile"`: Heading/1 32, bar title 18, body 16) and Comfortable component size
 *   (`data-density="comfortable"`: Button/Small 40, Avatar/Medium 48), whatever the platform's Typography and Component
 *   size chips say. Only Zen Studio's Present changes them, for the presented screen (`PlatformPhoneModesContext`).
 * - Its tokens resolve at the mobile breakpoint (`data-breakpoint="mobile"`): margins, insets and paddings are the
 *   phone values (Margin/Comfortable 20, Margin/Compact 16), so a phone example lines up exactly as the copied code
 *   will on a real phone. Keep the default insets; don't pick `compact` to make up for desktop margins.
 */
export function PlatformPhone({ children, device = "iphone", canvas = "default", typography = "mobile", density = "comfortable", statusBar = "dark", homeIndicator, maxHeight, headerOverlay = false, screenRef, label = "Phone preview", header, footer, className }: {
  children?: ReactNode;
  device?: PlatformDevice;
  /** default = Canvas/Default, the page canvas cards sit on (usage rules §16; backlog batch 6b, user 2026-10-07) ·
   *  canvas (the same) · surface = Surface/Default (a white screen) · alt · flat · media. */
  canvas?: "default" | "canvas" | "surface" | "alt" | "flat" | "media";
  /** Typography Configuration mode of the screen. Default mobile: phone examples show the phone type sizes. */
  typography?: PlatformPhoneModes["typography"];
  /** Component Size mode of the screen. Default comfortable: phone examples show the phone component sizes. */
  density?: PlatformPhoneModes["density"];
  /** Status bar tone: dark content on light screens, light content on media. */
  statusBar?: "dark" | "light";
  /** Home indicator tone; follows what sits under it (defaults to `statusBar`). iOS adapts it to the content below, e.g. dark over a light floating bar on a media screen. */
  homeIndicator?: "dark" | "light";
  /** Optional cap on the on-page height. By default every preview (playground and examples) renders at the device's
   *  physical size (`physicalScale`) and only shrinks further when the stage is narrower than that. */
  maxHeight?: number;
  /** @deprecated screen height now comes from `device`; kept so older call sites compile. */
  height?: number;
  label?: string;
  /** Pinned above the scrolling screen (e.g. a Top Navigation); it runs under the status bar. */
  header?: ReactNode;
  /** The header floats over the screen instead of sitting above it, so content scrolls underneath — needed to preview
   *  translucent headers (Top Navigation *-Bluring, Liquid Glass, *-Overlay with their progressive blur). The screen is
   *  padded by the header's measured height so the first row still starts below it. */
  headerOverlay?: boolean;
  /** The scrolling screen element, e.g. for a Top Navigation `scrollRef` (use with `headerOverlay`, so the content runs
   *  under the header while its large title folds away). */
  screenRef?: Ref<HTMLDivElement>;
  /** Pinned below the scrolling screen (e.g. a Bottom Navigation or composer); it runs under the home indicator. */
  footer?: ReactNode;
  className?: string;
}) {
  const spec = platformDevices[device];
  const presented = useContext(PlatformPhoneModesContext);
  const fitRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  // What stays over the content once a scroll-linked Top Navigation has folded its large title (and a folding Search):
  // the screen's scroll-padding-top, so a row reached by keyboard scrolls clear of the bar (WCAG 2.2 SC 2.4.11).
  const [pinnedHeight, setPinnedHeight] = useState(0);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!headerOverlay || !el) return undefined;
    const update = () => {
      setHeaderHeight(el.offsetHeight);
      // On a root the bar overlays the large-title row (Top-bar=false) and takes its place once it folds, so only the
      // part of the fold below the bar goes away.
      const fold = el.querySelector<HTMLElement>(".zen-top-nav__fold")?.offsetHeight ?? 0;
      const overlay = el.querySelector<HTMLElement>('.zen-top-nav[data-bar="overlay"] > .zen-top-nav__bar')?.offsetHeight ?? 0;
      setPinnedHeight(el.offsetHeight - Math.max(0, fold - overlay));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [headerOverlay]);
  const base = Math.min(physicalScale(device), maxHeight ? maxHeight / spec.height : 1);
  const [scale, setScale] = useState(base);
  useLayoutEffect(() => {
    const host = fitRef.current?.parentElement;
    if (!host) return undefined;
    const update = () => {
      const styles = getComputedStyle(host);
      // Room inside the stage, minus the 16px margin each side that holds the black bezel ring.
      const room = host.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight) - 32;
      setScale(Math.min(base, room > 0 ? room / spec.width : 1));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [base, spec.width]);
  const vars = { width: spec.width, height: spec.height, borderRadius: spec.radius, transform: scale < 1 ? `scale(${scale})` : undefined, "--zen-safe-area-top": `${spec.top}px`, "--zen-safe-area-bottom": `${spec.bottom}px`, "--platform-phone-header-height": `${headerHeight}px`, "--platform-phone-header-pinned": `${pinnedHeight}px` } as CSSProperties;
  return (
    <div ref={fitRef} className="platform-phone-fit" style={{ width: spec.width * scale, height: spec.height * scale }}>
      <div className={["platform-phone", className].filter(Boolean).join(" ")} data-device={device} data-canvas={canvas} data-typography={presented.typography ?? typography} data-density={presented.density ?? density} data-breakpoint="mobile" data-footer={footer ? "true" : undefined} data-header-overlay={headerOverlay && header ? "true" : undefined} data-zen-overlay-root="" style={vars} role="group" aria-label={`${label} (${spec.label}, ${spec.width}×${spec.height})`}>
        {header ? <div ref={headerRef} className="platform-phone__header">{header}</div> : null}
        <div ref={screenRef} className="platform-phone__screen">{children}</div>
        {footer ? <div className="platform-phone__footer">{footer}</div> : null}
        <div className="platform-phone__status" data-tone={statusBar} data-device={device} aria-hidden="true">
          <span className="platform-phone__time">9:41</span>
          {spec.island ? <span className="platform-phone__island" /> : null}
          <span className="platform-phone__levels"><Cellular /><Wifi /><Battery /></span>
        </div>
        <span className="platform-phone__home" data-tone={homeIndicator ?? statusBar} aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Navigation inside a phone example (Back to the parent screen, a row opening the child again): the next screen's
 * control takes focus instead of <body>, and the screen can scroll back to the top. Render `anchor` inside the phone on
 * every screen.
 */
export function usePhoneScreen() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusNext.current;
    if (!selector) return;
    focusNext.current = null;
    anchorRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>(selector)?.focus();
  });
  return {
    anchor: <span ref={anchorRef} hidden />,
    /** Run a change, then focus `selector` inside the phone once the next screen has rendered. */
    go: (selector: string, change: () => void) => { focusNext.current = selector; change(); },
    scrollTop: () => anchorRef.current?.closest(".platform-phone__screen")?.scrollTo({ top: 0, behavior: "smooth" }),
  };
}
