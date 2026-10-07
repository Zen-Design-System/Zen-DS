import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from "react";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { LineChanges } from "./diff";
import { tokenize, type CodeLanguage, type CodeLine } from "./tokenize";
import { onBeforeCodeWrapChange, setCodeWrap, useCodeWrap } from "./wrap";
import "./code.css";

export type { CodeLanguage } from "./tokenize";

export type CodeViewProps = {
  code: string;
  language?: CodeLanguage;
  /** Number of the first line (a slice of a file). Default 1. */
  startLine?: number;
  /** Inclusive range of displayed line numbers: accent tint + gutter bar; Copy copies just these lines. */
  highlight?: { from: number; to: number } | null;
  /** Added / removed lines, numbered like the displayed lines (see lineChanges in ./diff). */
  changes?: LineChanges | null;
  /**
   * Scroll this line into view (e.g. the selected element) whenever it changes. Unwrapped, the view stays scrolled
   * fully left unless the line's code starts beyond the visible width; then that start sits at the left edge.
   */
  scrollToLine?: number | null;
  /**
   * Header label (a file path). The language badge ("React · TSX", "CSS"…) always shows, after the title or alone
   * when there is none, so every code view names its language.
   */
  title?: ReactNode;
  actions?: ReactNode;
  maxHeight?: number | string;
  /**
   * Soft-wrap long lines. Default: the viewer's one Wrap preference (./wrap), shared by every code view; the toolbar
   * toggle changes it everywhere. Passing `wrap` gives this view its own toggle, starting (and reset) at this value.
   */
  wrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  /** Show the built-in Wrap and Copy buttons (default true). */
  toolbar?: boolean;
  /** Accessible name of the scroll region (default: the title when it is text, else "<language> code"). */
  label?: string;
  className?: string;
};

type Row =
  | { kind: "line"; key: string; line: number; tokens: CodeLine; added: boolean; highlighted: boolean }
  | { kind: "removed"; key: string; tokens: CodeLine };

/** Below this many rows everything renders (keeps native text selection); above it only the visible window. */
const VIRTUAL_MIN_ROWS = 400;
const OVERSCAN = 24;
/** Wrapped rows have no fixed height: long files show a window around the anchor line, grown on demand. */
const WRAP_ALL_LIMIT = 1500;
const WRAP_WINDOW = 300;
const WRAP_STEP = 500;
const TAB_COLUMNS = 2;
/** Sideways: the line's code counts as visible when this many of its first characters (or all, if fewer) show. */
const MIN_VISIBLE_COLUMNS = 8;

const columnsOf = (line: CodeLine) => line.reduce((sum, token) => sum + token.text.length + (TAB_COLUMNS - 1) * (token.text.split("\t").length - 1), 0);

/** TSX names its framework too: the library is React, and later ports (Vue, SwiftUI, Flutter) must read apart. */
const LANGUAGE_LABELS: Record<CodeLanguage, string> = { tsx: "React · TSX", ts: "TypeScript", css: "CSS", json: "JSON", bash: "Shell", html: "HTML", markdown: "Markdown" };

/** The code view header's language badge ("React · TSX", "CSS"…): Badge xs, neutral subtle, no dot. */
export function CodeLanguageBadge({ language }: { language: CodeLanguage }) {
  return <Badge className="studio-code__language" size="xs" theme="neutral" background="subtle" leadingIcon={false}>{LANGUAGE_LABELS[language]}</Badge>;
}

/** Width of one character of the code font, measured in the scroller (1ch of Body/Code). */
function charWidth(scroller: HTMLElement) {
  const probe = document.createElement("span");
  probe.className = "studio-code__probe";
  probe.textContent = "0".repeat(20);
  scroller.appendChild(probe);
  const width = probe.getBoundingClientRect().width / 20;
  probe.remove();
  return width || 8;
}

function renderTokens(tokens: CodeLine) {
  return tokens.map((token, index) => (token.type === "plain" ? token.text : <span key={index} className={`studio-code__t--${token.type}`}>{token.text}</span>));
}

/**
 * Git-style code view (spec §7): always dark, line-number gutter (sticky, not selectable), syntax colours, a
 * highlighted range, unified-diff marks for added and removed lines, virtualised rows for long files, Wrap and Copy.
 */
export function CodeView({
  code,
  language = "tsx",
  startLine = 1,
  highlight = null,
  changes = null,
  scrollToLine = null,
  title: titleProp,
  actions,
  maxHeight,
  wrap: wrapProp,
  onWrapChange,
  toolbar = true,
  label,
  className,
}: CodeViewProps) {
  const sharedWrap = useCodeWrap();
  const [ownWrap, setOwnWrap] = useState({ prop: wrapProp, value: wrapProp ?? false });
  if (ownWrap.prop !== wrapProp) setOwnWrap({ prop: wrapProp, value: wrapProp ?? false });
  const wrap = wrapProp === undefined ? sharedWrap : ownWrap.value;

  const lines = useMemo(() => tokenize(code, language), [code, language]);
  const from = highlight?.from ?? null;
  const to = highlight?.to ?? null;
  const lastLine = startLine + lines.length - 1;

  const rows = useMemo(() => {
    const added = new Set(changes?.added ?? []);
    const removed = new Map<number, string[][]>();
    for (const block of changes?.removed ?? []) {
      const after = Math.min(Math.max(block.after, startLine - 1), lastLine);
      removed.set(after, [...(removed.get(after) ?? []), block.lines]);
    }
    const out: Row[] = [];
    const pushRemoved = (after: number) => {
      removed.get(after)?.forEach((block, b) => {
        tokenize(block.join("\n"), language).forEach((tokens, k) => out.push({ kind: "removed", key: `r${after}.${b}.${k}`, tokens }));
      });
    };
    pushRemoved(startLine - 1);
    lines.forEach((tokens, index) => {
      const line = startLine + index;
      const highlighted = from !== null && to !== null && line >= from && line <= to;
      out.push({ kind: "line", key: `l${line}`, line, tokens, added: added.has(line), highlighted });
      pushRemoved(line);
    });
    return out;
  }, [lines, changes, from, to, startLine, lastLine, language]);

  const columns = useMemo(() => rows.reduce((max, row) => Math.max(max, columnsOf(row.tokens)), 0), [rows]);
  const digits = String(Math.max(lastLine, 1)).length;

  /* ── measuring and the visible window ── */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ rowHeight: 16, padTop: 0 });
  const [view, setView] = useState({ top: 0, height: 0 });
  const frame = useRef(0);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const rowsElement = rowsRef.current;
    if (!scroller || !rowsElement) return undefined;
    let width = scroller.clientWidth;
    const measure = () => {
      const rowHeight = Number.parseFloat(getComputedStyle(scroller).lineHeight) || 16;
      const padTop = Number.parseFloat(getComputedStyle(rowsElement).paddingTop) || 0;
      setMetrics((current) => (current.rowHeight === rowHeight && current.padTop === padTop ? current : { rowHeight, padTop }));
      // A resized panel re-wraps the rows: the scroll-to-line effect brings the line back into view if it left it.
      if (scroller.clientWidth !== width) {
        width = scroller.clientWidth;
        scrolled.current = null;
      }
      setView({ top: scroller.scrollTop, height: scroller.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const virtual = !wrap && rows.length > VIRTUAL_MIN_ROWS;
  // Scrolled sideways: the sticky gutter shows a hairline edge over the code passing under it.
  const [scrolledX, setScrolledX] = useState(false);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrolledX(target.scrollLeft > 0);
    if (!virtual) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setView({ top: target.scrollTop, height: target.clientHeight }));
  };

  const indexOfLine = (line: number | null) => (line === null ? -1 : rows.findIndex((row) => row.kind === "line" && row.line === line));

  // Wrapped long files render a window around an anchor line: the line to scroll to, or the first visible line when
  // Wrap was turned on (until scrollToLine changes again). "Show more" grows the window.
  const [anchor, setAnchor] = useState<{ line: number | null; forScroll: number | null }>({ line: null, forScroll: null });
  const anchorLine = anchor.forScroll === scrollToLine && anchor.line !== null ? anchor.line : (scrollToLine ?? from ?? anchor.line);
  const windowed = wrap && rows.length > WRAP_ALL_LIMIT;
  const anchorIndex = Math.max(0, indexOfLine(anchorLine));
  const [grown, setGrown] = useState({ key: "", before: 0, after: 0 });
  const growKey = `${windowed}:${anchorIndex}`;
  const growth = grown.key === growKey ? grown : { key: growKey, before: 0, after: 0 };

  let start = 0;
  let end = rows.length;
  if (virtual) {
    const { rowHeight, padTop } = metrics;
    start = Math.max(0, Math.floor((view.top - padTop) / rowHeight) - OVERSCAN);
    end = Math.min(rows.length, Math.ceil((view.top + Math.max(view.height, 1) - padTop) / rowHeight) + OVERSCAN);
  } else if (windowed) {
    start = Math.max(0, anchorIndex - WRAP_WINDOW - growth.before);
    end = Math.min(rows.length, anchorIndex + WRAP_WINDOW + growth.after);
  }

  /** Top offset of a line's row inside the scroller (fixed rows: computed; wrapped rows: measured), or null. */
  const offsetOfLine = (scroller: HTMLElement, line: number) => {
    // Read the metrics from the DOM: on the first commit the measured state is not in yet.
    const rowHeight = Number.parseFloat(getComputedStyle(scroller).lineHeight) || metrics.rowHeight;
    const padTop = rowsRef.current ? Number.parseFloat(getComputedStyle(rowsRef.current).paddingTop) || 0 : metrics.padTop;
    if (!wrap) {
      const index = indexOfLine(line);
      return index < 0 ? null : { top: padTop + index * rowHeight, rowHeight, padTop };
    }
    const element = scroller.querySelector<HTMLElement>(`[data-line="${line}"]`);
    return element ? { top: element.offsetTop, rowHeight, padTop } : null;
  };

  /** A sideways alignment waiting for rows: just after Wrap turns off, the virtual window may not hold any yet. */
  const pendingAlign = useRef<{ line: number | null } | null>(null);
  /**
   * Unwrapped: scrolled fully left, unless `line`'s code (after its indentation) starts beyond the visible width; then
   * the view scrolls so that start sits where column 0 normally does.
   */
  const alignSideways = (scroller: HTMLElement, line: number | null) => {
    if (wrap) {
      pendingAlign.current = null;
      return;
    }
    // The code column starts after the line number and the diff mark (the same for every row); rows also give the
    // content its width, so without one the view cannot scroll sideways yet.
    const firstText = scroller.querySelector<HTMLElement>(".studio-code__text");
    if (!firstText) {
      pendingAlign.current = { line };
      return;
    }
    pendingAlign.current = null;
    let left = 0;
    const row = rows[indexOfLine(line)];
    if (row?.kind === "line") {
      const text = row.tokens.map((token) => token.text).join("");
      const indent = /^[ \t]*/.exec(text)?.[0] ?? "";
      const indentColumns = indent.length + (TAB_COLUMNS - 1) * (indent.split("\t").length - 1);
      const width = charWidth(scroller);
      const visible = scroller.clientWidth - firstText.offsetLeft;
      const shown = Math.min(MIN_VISIBLE_COLUMNS, columnsOf(row.tokens) - indentColumns);
      if ((indentColumns + shown) * width > visible) left = Math.round(indentColumns * width);
    }
    scroller.scrollLeft = left;
    setScrolledX(scroller.scrollLeft > 0);
  };

  /* ── scroll to a line ── */
  const scrolled = useRef<number | null>(null);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scrollToLine === null || scrollToLine === undefined || !scroller || !rows.length || scrolled.current === scrollToLine) return;
    const offset = offsetOfLine(scroller, scrollToLine);
    if (!offset) return;
    scrolled.current = scrollToLine;
    alignSideways(scroller, scrollToLine);
    const { top, rowHeight } = offset;
    if (top >= scroller.scrollTop + rowHeight && top + rowHeight * 2 <= scroller.scrollTop + scroller.clientHeight) return;
    scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3);
    setView({ top: scroller.scrollTop, height: scroller.clientHeight });
  });

  /* ── actions ── */
  // Wrap on/off keeps the first visible line at the top.
  const keepLine = useRef<number | null>(null);
  const firstVisibleLine = (scroller: HTMLElement) => {
    if (!wrap) {
      const index = Math.max(0, Math.floor((scroller.scrollTop - metrics.padTop) / metrics.rowHeight));
      for (let i = index; i < rows.length; i += 1) { const row = rows[i]; if (row.kind === "line") return row.line; }
      return null;
    }
    for (const element of scroller.querySelectorAll<HTMLElement>(".studio-code__row[data-line]")) {
      if (element.offsetTop + element.offsetHeight > scroller.scrollTop) return Number(element.dataset.line);
    }
    return null;
  };
  /** Before a re-wrap: remember the first visible line (and anchor the wrapped window there). */
  const noteFirstLine = () => {
    const scroller = scrollerRef.current;
    const line = scroller ? firstVisibleLine(scroller) : null;
    keepLine.current = line;
    if (!wrap) setAnchor({ line, forScroll: scrollToLine });
  };
  const noteRef = useRef(noteFirstLine);
  useEffect(() => { noteRef.current = noteFirstLine; });
  // Every view on the shared preference keeps its place when any view's toggle changes it.
  useEffect(() => (wrapProp === undefined ? onBeforeCodeWrapChange(() => noteRef.current()) : undefined), [wrapProp]);
  const toggleWrap = () => {
    if (wrapProp === undefined) setCodeWrap(!wrap);
    else {
      noteFirstLine();
      setOwnWrap({ prop: wrapProp, value: !wrap });
    }
    onWrapChange?.(!wrap);
  };
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const line = keepLine.current;
    keepLine.current = null;
    if (!scroller || line === null) return;
    const offset = offsetOfLine(scroller, line);
    if (!offset) return;
    scroller.scrollTop = Math.max(0, offset.top - offset.padTop);
    // Wrap turned off: sideways as when the line to scroll to was first shown.
    alignSideways(scroller, scrollToLine);
    setView({ top: scroller.scrollTop, height: scroller.clientHeight });
    // Runs after a Wrap toggle only: keepLine is set just before it.
  }, [wrap]);
  // The re-render that brings the rows in (before paint) finishes a deferred sideways alignment.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (pendingAlign.current && scroller) alignSideways(scroller, pendingAlign.current.line);
  });

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const copy = async () => {
    const text = from !== null && to !== null ? code.split(/\r\n|\n|\r/).slice(from - startLine, to - startLine + 1).join("\n") : code;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context or permission): nothing to report beyond the unchanged icon.
    }
  };
  const copyLabel = from !== null && to !== null ? (from === to ? `Copy line ${from}` : `Copy lines ${from}–${to}`) : "Copy code";

  const rendered = rows.slice(start, end);
  const style = { maxHeight, "--studio-code-digits": digits, "--studio-code-columns": columns } as CSSProperties;

  return (
    <div className={["studio-code", wrap && "studio-code--wrap", !wrap && scrolledX && "studio-code--scrolled-x", className].filter(Boolean).join(" ")} data-theme="dark" style={style}>
      <div className="studio-code__header">
        {titleProp ? <div className={`studio-code__title ${typographyStyles["Caption/Medium"]}`}>{titleProp}</div> : null}
        <CodeLanguageBadge language={language} />
        <div className="studio-code__actions">
          {actions}
          {toolbar ? (
            <>
              {/* zen-allow-secondary: pressed state of a toolbar toggle (Wrap on). */}
              <IconButton size="xs" level={wrap ? "secondary" : "tertiary"} icon="icon-corner-down-left-line" aria-label="Wrap lines" aria-pressed={wrap} onClick={toggleWrap} />
              <IconButton size="xs" icon={copied ? "icon-check-line" : "icon-copy-line"} aria-label={copied ? "Copied" : copyLabel} onClick={copy} />
            </>
          ) : null}
        </div>
        <VisuallyHidden role="status">{copied ? "Copied to the clipboard" : ""}</VisuallyHidden>
      </div>
      <div
        ref={scrollerRef}
        className={`studio-code__scroller ${typographyStyles["Body/Code/Regular"]}`}
        tabIndex={0}
        role="region"
        aria-label={label ?? (typeof titleProp === "string" ? titleProp : `${LANGUAGE_LABELS[language]} code`)}
        onScroll={onScroll}
      >
        <div ref={rowsRef} className="studio-code__rows">
          {windowed && start > 0 ? (
            <div className="studio-code__more">
              <Button size="sm" level="tertiary" onClick={() => setGrown({ ...growth, before: growth.before + WRAP_STEP })}>
                {`Show ${Math.min(WRAP_STEP, start)} earlier lines`}
              </Button>
            </div>
          ) : null}
          {virtual && start > 0 ? <div className="studio-code__spacer" style={{ height: start * metrics.rowHeight }} aria-hidden="true" /> : null}
          {rendered.map((row) => (
            <div
              key={row.key}
              className={[
                "studio-code__row",
                row.kind === "removed" && "studio-code__row--removed",
                row.kind === "line" && row.added && "studio-code__row--added",
                row.kind === "line" && row.highlighted && "studio-code__row--highlight",
              ].filter(Boolean).join(" ")}
              data-line={row.kind === "line" ? row.line : undefined}
            >
              <span className="studio-code__num" aria-hidden="true">{row.kind === "line" ? row.line : ""}</span>
              <span className="studio-code__mark" aria-hidden="true">{row.kind === "removed" ? "−" : row.added ? "+" : ""}</span>
              <span className="studio-code__text">{renderTokens(row.tokens)}</span>
            </div>
          ))}
          {virtual && end < rows.length ? <div className="studio-code__spacer" style={{ height: (rows.length - end) * metrics.rowHeight }} aria-hidden="true" /> : null}
          {windowed && end < rows.length ? (
            <div className="studio-code__more">
              <Button size="sm" level="tertiary" onClick={() => setGrown({ ...growth, after: growth.after + WRAP_STEP })}>
                {`Show ${Math.min(WRAP_STEP, rows.length - end)} later lines`}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
