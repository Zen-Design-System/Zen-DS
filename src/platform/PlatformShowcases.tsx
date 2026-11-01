import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup } from "../components/Popover";
import { ZenProvider } from "../components/Provider";
import { typographyStyles } from "../tokens/typography.generated";
import { PlatformCode } from "./PlatformCode";
import type { PlatformPage } from "./PlatformExamples";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { getPageExamples } from "./examples/registry";
import { isWideExample, type ExampleDef } from "./examples/types";
import { useHotDataVersion } from "./hotData";
import { FullScreenBar, FullScreenButton, useFullScreen } from "./PlatformFullScreen";

/* Real-world compositions shown under each component playground. Every example
 * is a live, stateful composition of production components: no forced visual
 * states, so hover, focus, keyboard and outside-click behave like in an app.
 * This module exports components only, so an example edit stops here as a Fast Refresh instead of re-running every
 * module that imports it (the popover content sets live in PlatformPopoverContent.tsx for that reason). */

/** Lets an example switch its whole card (header, stage, code and every component inside) to a token mode. */
const ExampleCardThemeContext = createContext<(theme: "light" | "dark" | null) => void>(() => undefined);

/** One example: header, stage and code. `bare` (Zen Studio canvas frames, docs thumbnails) keeps only the stage: the
 * frame shows the title, the inspector the code, and the Studio's Present view the full screen. `presented` (the Studio's
 * Present of a `screen`) lays the card out full window like its own full screen, without the card's dialog, inert or
 * Exit. `onClose` (an example played from its thumbnail) adds Close, which takes focus when the card opens. */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function ExampleCard({ title, description, code, wide, screen, bare, presented, onClose, children }: { title: string; description: string; code: string; wide?: boolean; screen?: boolean; bare?: boolean; presented?: boolean; onClose?: () => void; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closable = Boolean(onClose);
  useEffect(() => { if (closable) closeRef.current?.focus(); }, [closable]);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const previewTypography = useContext(PlatformTypographyContext);
  const openRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const { fullScreen, enter, exit } = useFullScreen(openRef, exitRef, ".pe-card");
  const titleId = useId();
  return (
    <ExampleCardThemeContext.Provider value={setTheme}>
    {/* Scoped modes through the public ZenProvider (dogfood): the card's own light/dark switch, no paint, and no portal
        root, so overlays keep using the platform portal (preview typography, audit hooks). The breakpoint is inherited
        from the docs (the viewport), so responsive layouts in an example reflow on a phone like the copied code will. */}
    <ZenProvider as="article" className="pe-card" data-wide={wide ? "true" : undefined} data-screen={screen ? "true" : undefined} data-fullscreen={fullScreen || presented ? "true" : undefined}
      role={fullScreen ? "dialog" : undefined} aria-labelledby={fullScreen ? titleId : undefined}
      theme={theme ?? undefined} paint={false} portal={false}>
      {bare ? null : <header className="pe-card__head">
        <div className="pe-card__titles">
          <h3 id={titleId} className={typographyStyles["Heading/4"]}>{title}</h3>
          <p className={typographyStyles["Body/Small/Regular"]}>{description}</p>
        </div>
        {/* Full screen is the page alone, like the real web app: the docs header, the Code button and the code panel go away. */}
        {fullScreen ? null : <div className="pe-card__actions">
          {/* zen-allow-compact-button: platform chrome — the compact "Code" pill in every example card header. */}
          <Button appearance="main" level="tertiary" size="xs" aria-expanded={showCode} startIcon={<Icon name="icon-code-02-line" decorative />} onClick={() => setShowCode((open) => !open)}>
            {showCode ? "Hide code" : "Code"}
          </Button>
          {screen ? <FullScreenButton buttonRef={openRef} onEnter={enter} /> : null}
          {/* zen-allow-compact-button: platform chrome — Close back to the thumbnail, beside the compact Code pill. */}
          {onClose ? <Button ref={closeRef} appearance="main" level="tertiary" size="xs" startIcon={<Icon name="icon-x-line" decorative />} onClick={onClose}>Close</Button> : null}
        </div>}
      </header>}
      <div className="pe-card__stage" data-typography={previewTypography}><div className="pe-card__preview">{children}</div></div>
      {showCode && !fullScreen && !bare ? <div className="pe-card__code"><PlatformCode code={code} /></div> : null}
      {fullScreen ? <FullScreenBar title={title} exitRef={exitRef} onExit={exit} /> : null}
    </ZenProvider>
    </ExampleCardThemeContext.Provider>
  );
}

/* ───────────── Popover / Bulk-Action ───────────── */

type ShellIconName = Parameters<typeof Icon>[0]["name"];

const bulkIcon = (icon: ShellIconName, label: string, onClick?: () => void, pressed?: boolean) => (
  <IconButton key={label} appearance="flat" level="primary" size="md" aria-label={label} aria-pressed={pressed} onClick={onClick} icon={<Icon name={icon} />} />
);

/** Figma Popover/Bulk-Action on a text selection: history · format · comment, floating above the selected phrase. */
export function PopoverBulkSelectionDemo({ history = true, destructive = true }: { history?: boolean; destructive?: boolean }) {
  const [format, setFormat] = useState<{ bold: boolean; italic: boolean }>({ bold: false, italic: false });
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="pe-bulk-stage">
      <PopoverBulkAction aria-label="Selection actions" className="pe-bulk-stage__bar">
        {history ? <><PopoverBulkActionGroup aria-label="History">{bulkIcon("icon-flip-backward-line", "Undo", () => setNote("Undone"))}{bulkIcon("icon-flip-forward-line", "Redo", () => setNote("Redone"))}</PopoverBulkActionGroup><PopoverBulkActionDivider /></> : null}
        <PopoverBulkActionGroup aria-label="Format">
          {bulkIcon("icon-bold-01-line", "Bold", () => setFormat((f) => ({ ...f, bold: !f.bold })), format.bold)}
          {bulkIcon("icon-italic-01-line", "Italic", () => setFormat((f) => ({ ...f, italic: !f.italic })), format.italic)}
        </PopoverBulkActionGroup>
        <PopoverBulkActionDivider />
        <PopoverBulkActionGroup aria-label="Comment">{bulkIcon("icon-message-plus-circle-line", "Comment", () => setNote("Comment added"))}</PopoverBulkActionGroup>
        {destructive ? <><PopoverBulkActionDivider /><PopoverBulkActionGroup aria-label="Delete">{bulkIcon("icon-trash-line", "Delete selection", () => setNote("Selection deleted"))}</PopoverBulkActionGroup></> : null}
      </PopoverBulkAction>
      <p className={`pe-bulk-stage__text ${typographyStyles["Body/Extra/Regular"]}`}>
        Launch notes: the new pricing page ships on Monday, and{" "}
        <mark className="pe-bulk-stage__selection" style={{ fontWeight: format.bold ? 600 : undefined, fontStyle: format.italic ? "italic" : undefined }}>the Team plan now includes SSO</mark>{" "}
        for every workspace on annual billing.
      </p>
      <p className={`pe-text pe-text--light ${typographyStyles["Body/Small/Regular"]}`} role="status">{note}</p>
    </div>
  );
}

/* ───────────── Examples section ───────────── */

/** `?examples=live` renders every example live, as before thumbnails: the platform audits, behaviour walk and screenshots
 * drive the examples themselves (tools/platform-audit adds it to every page it opens). */
const allLive = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("examples") === "live";

/** A thumbnail lays an example out this wide, then scales it down to fit: a card's own width, a wide row's, a desktop screen's. */
const thumbLayoutWidth = (example: ExampleDef) => (example.screen ? 1280 : example.wide ? 960 : 520);

/**
 * A static thumbnail of an example: the real composition scaled down, inert (no hover, focus or clicks), mounted only
 * when it comes near the viewport, its motion stopped (platform.css). Play opens the live card. An overlay the example
 * opens by itself stays inside the thumbnail: the frame has its own portal root, under the scale.
 */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
function ExampleThumb({ example, onPlay, playRef }: { example: ExampleDef; onPlay: () => void; playRef?: RefObject<HTMLButtonElement | null> }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [scale, setScale] = useState(0);
  const titleId = useId();
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setNear(true);
    }, { rootMargin: "400px 0px" });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!near || !frame || !content) return undefined;
    // Contain: the whole example shows, never enlarged past its own size.
    const fit = () => setScale(Math.min(frame.clientWidth / content.offsetWidth, frame.clientHeight / Math.max(content.offsetHeight, 1), 1));
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, [near]);
  return (
    <article className="pe-thumb" aria-labelledby={titleId}>
      {/* A pointer click anywhere on the frame plays too; Play is the keyboard and screen-reader way in. */}
      <div ref={frameRef} className="pe-thumb__frame" onClick={onPlay}>
        {near ? (
          <div ref={contentRef} className="pe-thumb__content" inert
            style={{ width: thumbLayoutWidth(example), transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? undefined : "hidden" }}>
            <ZenProvider paint={false}>
              <ExampleCard title={example.title} description={example.description} code={example.code} screen={example.screen} bare>{example.render()}</ExampleCard>
            </ZenProvider>
          </div>
        ) : null}
        <Button ref={playRef} className="pe-thumb__play" appearance="overlay" level="black-overlay" size="sm" startIcon={<Icon name="icon-play-solid" decorative />}
          aria-label={`Play ${example.title}`} onClick={(event) => { event.stopPropagation(); onPlay(); }}>Play</Button>
      </div>
      <div className="pe-thumb__titles">
        <h3 id={titleId} className={typographyStyles["Body/Base/Bold"]}>{example.title}</h3>
        <p className={typographyStyles["Body/Small/Regular"]}>{example.description}</p>
      </div>
    </article>
  );
}

export function ComponentExamples({ page }: { page: PlatformPage }) {
  // An example edit updates the records in place (hotData.ts): render again to show its code and title.
  useHotDataVersion();
  const list = getPageExamples(page);
  const [live] = useState(allLive);
  // One example plays at a time, so the page holds one live composition; Close puts focus back on its Play.
  const [playing, setPlaying] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const returnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setPlaying(null); setReturnTo(null); }, [page]);
  useEffect(() => { if (returnTo) returnRef.current?.focus(); }, [returnTo]);
  if (!list.length) return null;
  return (
    <section className="pe-section" aria-labelledby={`pe-${page}-title`}>
      <header className="pe-section__head">
        <h2 id={`pe-${page}-title`} className={typographyStyles["Heading/3"]}>Examples</h2>
        <p className={typographyStyles["Body/Base/Regular"]}>{live ? "Real-world compositions." : "Real-world compositions. Press Play to try one."}</p>
      </header>
      <div className={live ? "pe-grid" : "pe-thumbs"}>
        {list.map((example) => live || playing === example.title
          ? <ExampleCard key={example.title} title={example.title} description={example.description} code={example.code} wide={live ? isWideExample(example) : true} screen={example.screen}
              onClose={live ? undefined : () => { setPlaying(null); setReturnTo(example.title); }}>{example.render()}</ExampleCard>
          : <ExampleThumb key={example.title} example={example} playRef={returnTo === example.title ? returnRef : undefined}
              onPlay={() => { setReturnTo(null); setPlaying(example.title); }} />)}
      </div>
    </section>
  );
}
