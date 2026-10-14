import { forwardRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { Container, Stack, type ContainerWidth } from "../components/Layout";
import { Text } from "../components/Text";
import type { TypographyStyleName } from "../tokens/typography.generated";

/*
 * Frames the docs draw around an example, which are not part of what the example teaches (its `code` leaves them out):
 * a desktop window of a set height whose content scrolls inside it, the page inside an AppShell, a studio's logo.
 * A window fills the example card in Full screen. Styles: platform.css "Example frames" (.pf-*).
 */

/** A window's height: clamp(min, 100dvh − offset, max), in px. */
export type PreviewHeight = { min: number; max: number; offset?: number };

const heightVars = (height: PreviewHeight | undefined) =>
  height ? ({ "--pf-height-min": `${height.min}px`, "--pf-height-max": `${height.max}px`, "--pf-height-offset": `${height.offset ?? 120}px` } as CSSProperties) : undefined;

/**
 * A desktop app (an AppShell) in a window of a set height: the shell takes the window's height and its page scrolls
 * inside it, as in a browser. `windowWidth`: a narrower browser window (a tablet's 744) centred on the stage, with a
 * Pale border and rounded corners, so the shell measures that width and lays itself out for it.
 */
export function PreviewAppFrame({ height = { min: 560, max: 760 }, windowWidth, frameRef, children }: { height?: PreviewHeight; windowWidth?: number; frameRef?: Ref<HTMLDivElement>; children: ReactNode }) {
  const frame = (
    <div ref={frameRef} className="pf-app-frame" style={heightVars(height)}>
      <div className="pf-app-frame__scroll">{children}</div>
    </div>
  );
  return windowWidth ? <div className="pf-browser-window" style={{ "--pf-window-width": `${windowWidth}px` } as CSSProperties}>{frame}</div> : frame;
}

/**
 * A screen on the Canvas: in a window of a set height (none: as tall as its content), its parts laid out in a column
 * (a form over its action bar) or a row (a page beside a SidePanel), stretched across. `clip={false}` lets what opens
 * from it (a menu) show past its edges.
 */
export const PreviewWindow = forwardRef<HTMLElement, { height?: PreviewHeight; direction?: "row" | "column"; clip?: boolean; children: ReactNode }>(function PreviewWindow(
  { height, direction = "column", clip = true, children },
  ref,
) {
  return (
    <Stack ref={ref} direction={direction} gap="none" align="stretch" className="pf-window" data-height={height ? "set" : undefined} data-clip={clip ? undefined : "false"} style={heightVars(height)}>
      {children}
    </Stack>
  );
});

/**
 * The page an example sits on: the Canvas (`canvas={false}`: none, inside a shell that paints its own) with the page
 * margin (Margin/Comfortable: 24, 20 on a phone) on every side ("all"), above and below ("block") or none; `fill` makes
 * it at least as tall as the screen it is in.
 */
export const PreviewPage = forwardRef<HTMLElement, { margin?: "all" | "block" | "none"; canvas?: boolean; fill?: boolean; children: ReactNode }>(function PreviewPage(
  { margin = "none", canvas = true, fill = false, children },
  ref,
) {
  return (
    <div ref={ref as never} className="pf-page" data-margin={margin === "none" ? undefined : margin} data-canvas={canvas ? undefined : "false"} data-fill={fill ? "true" : undefined}>
      {children}
    </div>
  );
});

/**
 * A desktop app window with a Sidebar beside its page, built without AppShell: the page's Canvas (`canvas`: default,
 * alt or flat), the Sidebar, then the page. `tall`: a set height, the page scrolling beside the Sidebar (ShellMain);
 * `keepRow`: on a phone-wide card the Sidebar (a rail) stays beside the page instead of above it.
 */
export function PreviewShell({ canvas = "default", tall = false, keepRow = false, shellRef, children }: { canvas?: "default" | "alt" | "flat"; tall?: boolean; keepRow?: boolean; shellRef?: Ref<HTMLDivElement>; children: ReactNode }) {
  return <div ref={shellRef} className={tall ? "pe-shell pe-shell--tall" : "pe-shell"} data-canvas={canvas} data-keep-row={keepRow ? "true" : undefined}>{children}</div>;
}

/** The page beside a PreviewShell's Sidebar: it takes the rest of the width and scrolls on its own. */
export function ShellMain({ children }: { children: ReactNode }) {
  return <div className="pf-shell-main">{children}</div>;
}

/** The page inside a desktop AppShell: the page margin around it, less under the shell's header. */
export function ShellPage({ maxWidth, pageRef, children }: { maxWidth?: ContainerWidth; pageRef?: Ref<HTMLElement>; children: ReactNode }) {
  return (
    <Container ref={pageRef} maxWidth={maxWidth}>
      <Stack gap="xl" className="pf-shell-page">{children}</Stack>
    </Container>
  );
}

/** A studio's logo for an AppShell or Sidebar header: its square mark and its name, as tall as the header's logo slot. */
export function StudioLogo({ src, name, textStyle = "Body/Base/Bold" }: { src: string; name: string; textStyle?: TypographyStyleName }) {
  return (
    <span className="pf-studio-logo">
      <img src={src} alt="" />
      <Text as="span" textStyle={textStyle}>{name}</Text>
    </span>
  );
}

/** A studio's square mark alone (a collapsed header or rail), named for screen readers. */
export function StudioMark({ src, name }: { src: string; name: string }) {
  return <img className="pf-studio-mark" src={src} alt={name} />;
}

/**
 * A phone app's own toasts (ToastStack inline) just above its tab bar, inside the screen margin (Margin/Comfortable, 20
 * on a phone): put it first in the PlatformPhone footer, which anchors it. Only the toasts take clicks.
 */
export function PhoneToastHost({ children }: { children: ReactNode }) {
  return <div className="pf-phone-toasts">{children}</div>;
}
