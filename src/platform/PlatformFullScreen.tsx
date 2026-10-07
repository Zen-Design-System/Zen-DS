import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "../components/Button";
import { Divider } from "../components/Divider";
import { Icon } from "../components/Icon";
import { Text } from "../components/Text";

/** Overlays that own Escape while a screen is full screen (Escape closes them first, not the full-screen view). */
export const fullScreenEscapeOwners = ".zen-popover, .zen-sidebar__submenu, [aria-modal='true'], [role='menu'], [role='listbox'], .platform-fullscreen-bar__panel";

type ButtonRef = { current: HTMLButtonElement | null };

/**
 * Full screen for a whole desktop screen — an example card flagged `screen`, the App Shell playground: the screen covers
 * the viewport like a real web page (no docs chrome, one floating Exit control), everything behind it is inert, and the
 * platform portal stays live so the screen's overlays still work. Escape leaves unless an overlay or a text field inside
 * the screen owns it; focus and the page scroll position return.
 * `container` is the selector of the element that goes full screen; the Exit button renders inside it.
 */
export function useFullScreen(openRef: ButtonRef, exitRef: ButtonRef, container: string) {
  const [fullScreen, setFullScreen] = useState(false);
  const scrollY = useRef(0);
  const enter = useCallback(() => { scrollY.current = window.scrollY; setFullScreen(true); }, []);
  const exit = useCallback(() => setFullScreen(false), []);
  useEffect(() => {
    const screen = exitRef.current?.closest<HTMLElement>(container);
    if (!fullScreen || !screen) return undefined;
    const inerted: HTMLElement[] = [];
    const stop = screen.closest(".official-platform") ?? document.body;
    for (let node: HTMLElement = screen; node !== stop && node.parentElement; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert || sibling.querySelector(".official-portal-root") || sibling.matches(".official-portal-root")) continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
    const root = document.documentElement;
    const { overflow, overflowAnchor } = root.style;
    // The screen leaves the page flow while it covers the viewport; without anchoring the page keeps its scroll position.
    root.style.overflow = "hidden";
    root.style.overflowAnchor = "none";
    exitRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], td, th") || document.querySelector(fullScreenEscapeOwners)) return;
      setFullScreen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      inerted.forEach((element) => { element.inert = false; });
      root.style.overflow = overflow;
      window.scrollTo({ top: scrollY.current, behavior: "instant" });
      openRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => { window.scrollTo({ top: scrollY.current, behavior: "instant" }); root.style.overflowAnchor = overflowAnchor; });
    };
  }, [fullScreen, openRef, exitRef, container]);
  return { fullScreen, enter, exit };
}

/** Opens full screen from a card or playground header. */
export function FullScreenButton({ buttonRef, onEnter }: { buttonRef: Ref<HTMLButtonElement>; onEnter: () => void }) {
  // zen-allow-compact-button: platform chrome — desktop screens open full screen from the card or playground header.
  return <Button ref={buttonRef} appearance="main" level="tertiary" size="xs" startIcon={<Icon name="icon-maximize-01-line" decorative />} onClick={onEnter}>Full screen</Button>;
}

/** How long the full-screen bar stays after the last pointer movement. */
const BAR_IDLE_MS = 2500;
/** How close to the bar a resting pointer still holds it (px around its edge). */
const BAR_HOLD_MARGIN = 16;
const BAR_PHONE_QUERY = "(max-width: 599.98px)";

function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(BAR_PHONE_QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia(BAR_PHONE_QUERY);
    const update = () => setPhone(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return phone;
}

/** A rule between groups of a FullScreenBar's controls. */
export function FullScreenBarDivider() {
  return <Divider orientation="vertical" decorative className="platform-fullscreen-bar__divider" />;
}

/**
 * The controls a full-screen screen keeps (the classic card and App Shell full screen, the Zen Studio's Present): one
 * floating pill at the bottom centre with the screen's name, the caller's controls (`children`) and Exit with its Esc hint
 * (Escape does the same). It shows on open and on any pointer movement and fades out BAR_IDLE_MS after the pointer stops,
 * so the screen is unobstructed; the pointer resting on it, keyboard focus (:focus-visible) and `hold` (an open panel)
 * keep it. `panel` renders above the pill (give it the class platform-fullscreen-bar__panel; Escape then closes it before
 * it leaves full screen). On a phone the name and the Esc hint step aside.
 */
export function FullScreenBar({ title, onExit, exitRef, hold = false, panel, children }: { title?: string; onExit: () => void; exitRef?: Ref<HTMLButtonElement>; hold?: boolean; panel?: ReactNode; children?: ReactNode }) {
  const phone = usePhone();
  const [shown, setShown] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    let pointer: { x: number; y: number } | null = null;
    // Measured from the last pointer position: a hidden bar takes no pointer events, so :hover is stale until the pointer
    // moves again.
    const near = () => {
      const rect = barRef.current?.getBoundingClientRect();
      return Boolean(pointer && rect && pointer.x >= rect.left - BAR_HOLD_MARGIN && pointer.x <= rect.right + BAR_HOLD_MARGIN && pointer.y >= rect.top - BAR_HOLD_MARGIN && pointer.y <= rect.bottom + BAR_HOLD_MARGIN);
    };
    const held = () => hold || near() || Boolean(barRef.current?.querySelector(":focus-visible"));
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (held()) schedule(); else setShown(false); }, BAR_IDLE_MS);
    };
    const wake = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; setShown(true); schedule(); };
    schedule();
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [hold]);

  return (
    <div ref={barRef} className="platform-fullscreen-bar" role="group" aria-label="Full screen controls" data-shown={shown ? "true" : "false"} onFocus={() => setShown(true)}>
      {panel}
      {title && !phone ? (
        <>
          <Text as="span" textStyle="Body/Small/Medium" tone="base" className="platform-fullscreen-bar__title" title={title}>{title}</Text>
          <FullScreenBarDivider />
        </>
      ) : null}
      {children ? <>{children}<FullScreenBarDivider /></> : null}
      <Button ref={exitRef} appearance="main" level="tertiary" size="sm" aria-label="Exit full screen" aria-keyshortcuts="Escape" startIcon={<Icon name="icon-minimize-01-line" decorative />} onClick={onExit}>
        Exit
        {phone ? null : <kbd className="platform-fullscreen-bar__key" aria-hidden="true">Esc</kbd>}
      </Button>
    </div>
  );
}
