import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { PopoverBulkAction, PopoverBulkActionDivider, PopoverBulkActionGroup } from "../components/Popover";
import { ZenProvider } from "../components/Provider";
import { typographyStyles } from "../tokens/typography.generated";
import { PlatformCode } from "./PlatformCode";
import type { PlatformPage } from "./PlatformExamples";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { getPageExamples } from "./examples/registry";
import { FullScreenBar, FullScreenButton, useFullScreen } from "./PlatformFullScreen";

/* Real-world compositions shown under each component playground. Every example
 * is a live, stateful composition of production components: no forced visual
 * states, so hover, focus, keyboard and outside-click behave like in an app.
 * This module exports components only, so an example edit stops here as a Fast Refresh instead of re-running every
 * module that imports it (the popover content sets live in PlatformPopoverContent.tsx for that reason). */

/** Lets an example switch its whole card (header, stage, code and every component inside) to a token mode. */
const ExampleCardThemeContext = createContext<(theme: "light" | "dark" | null) => void>(() => undefined);

/** One example: header, stage and code. `bare` (Zen Studio canvas frames) keeps only the stage: the frame shows the
 * title, the inspector the code, and the Studio's Present view the full screen. `presented` (the Studio's Present of a
 * `screen`) lays the card out full window like its own full screen, without the card's dialog, inert or Exit. */
// zen-studio-chrome: docs chrome, not a selectable layer in Zen Studio (tools/studio skips its JSX).
export function ExampleCard({ title, description, code, wide, screen, bare, presented, children }: { title: string; description: string; code: string; wide?: boolean; screen?: boolean; bare?: boolean; presented?: boolean; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
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

export function ComponentExamples({ page }: { page: PlatformPage }) {
  const list = getPageExamples(page);
  if (!list.length) return null;
  return (
    <section className="pe-section" aria-labelledby={`pe-${page}-title`}>
      <header className="pe-section__head">
        <h2 id={`pe-${page}-title`} className={typographyStyles["Heading/3"]}>Examples</h2>
        <p className={typographyStyles["Body/Base/Regular"]}>Real-world compositions.</p>
      </header>
      <div className="pe-grid">
        {list.map((example) => <ExampleCard key={example.title} title={example.title} description={example.description} code={example.code} wide={example.wide} screen={example.screen}>{example.render()}</ExampleCard>)}
      </div>
    </section>
  );
}
