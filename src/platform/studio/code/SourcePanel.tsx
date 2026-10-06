import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/Badge";
import { IconButton } from "../../../components/Button";
import { SkeletonText } from "../../../components/Skeleton";
import { Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { StudioApiError, studioApi, textBeforeEdit, useStudioServer } from "../api";
import { useStudioDrafts } from "../sourceDrafts";
import { useStudio } from "../store";
import type { SourceFile } from "../types";
import { CodeLanguageBadge, CodeView, type CodeLanguage } from "./CodeView";
import { lineChanges } from "./diff";
import "./code.css";

/** Changed-line marks show for the newest edit of this file for this long. */
const CHANGES_MAX_AGE = 10 * 60 * 1000;
/** Window event the Expand button sends ({ detail: { file, highlight } }); the Studio shell widens the code view. */
export const EXPAND_CODE_EVENT = "zen-studio:expand-code";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; source: SourceFile };

const languageOf = (file: string): CodeLanguage =>
  file.endsWith(".css") ? "css" : file.endsWith(".json") ? "json" : /\.(sh|bash)$/.test(file) ? "bash" : file.endsWith(".ts") ? "ts" : "tsx";

function messageOf(error: unknown, file: string) {
  if (!(error instanceof StudioApiError) || error.code === "offline") return "The source view needs the Zen dev server (npm run dev).";
  if (error.code === "not-found") return `${file} is not in this checkout.`;
  if (error.code === "forbidden") return "Only files under src/ can be shown.";
  return error.message;
}

/** Re-renders when Vite applies a hot update, so the view follows edits made outside the Studio too. */
function useHotUpdates() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return undefined;
    const bump = () => setTick((value) => value + 1);
    hot.on("vite:afterUpdate", bump);
    return () => hot.off?.("vite:afterUpdate", bump);
  }, []);
  return tick;
}

/**
 * The git-style view of a source file from the dev server, scrolled to and highlighting `highlight` (unwrapped, scrolled
 * sideways only when the element starts beyond the visible width). Wrap follows the viewer's one preference for every
 * code view (./wrap). `expandable` adds the Expand button (EXPAND_CODE_EVENT). A file with an unsaved admin draft shows
 * the draft with a Draft badge and its changed lines against the disk text the draft started from.
 */
export function SourcePanel({ file, highlight = null, maxHeight, className, expandable = true }: { file: string; highlight?: { from: number; to: number } | null; maxHeight?: number | string; className?: string; expandable?: boolean }) {
  const server = useStudioServer();
  const undo = useStudio((state) => state.undo);
  const redoCount = useStudio((state) => state.redo.length);
  const hotTick = useHotUpdates();
  // Save and Discard change what /source answers without an edit of this view: refetch when the draft list changes.
  const draftsRevision = useStudioDrafts().revision;
  const [load, setLoad] = useState<{ file: string; value: Load }>({ file, value: { status: "loading" } });

  useEffect(() => {
    let current = true;
    studioApi.source(file).then(
      (source) => { if (current) setLoad({ file, value: { status: "ready", source } }); },
      (error: unknown) => { if (current) setLoad({ file, value: { status: "error", message: messageOf(error, file) } }); },
    );
    return () => { current = false; };
  }, [file, undo.length, redoCount, hotTick, draftsRevision]);

  // Keep showing the previous content of this file while it re-fetches; another file starts from loading.
  const state: Load = load.file === file ? load.value : { status: "loading" };
  const source = state.status === "ready" ? state.source : null;

  // The newest edit of this file, when the file still holds its result.
  const record = useMemo(() => {
    for (let index = undo.length - 1; index >= 0; index -= 1) if (undo[index].file === file) return undo[index];
    return null;
  }, [undo, file]);
  // The file still holds the edit's result (same hash, so the patch is checked where it was recorded): rebuild the
  // text before it.
  // A draft: every line it changed against the disk text it started from (not only the newest edit).
  const draftBase = source?.draft && typeof source.base === "string" ? source.base : null;
  const changes = useMemo(() => {
    if (source && draftBase !== null) return lineChanges(draftBase, source.content);
    if (!record?.patch || !source || record.hashAfter !== source.hash || Date.now() - record.at >= CHANGES_MAX_AGE) return null;
    const before = textBeforeEdit(source.content, record.patch, true);
    return before === null ? null : lineChanges(before, source.content);
  }, [record, source, draftBase]);

  const range = highlight ? (highlight.from === highlight.to ? `L${highlight.from}` : `L${highlight.from}–${highlight.to}`) : null;
  const stale = Boolean(source?.draft && source.diskHash !== undefined && source.baseHash !== undefined && source.diskHash !== source.baseHash);
  const title = (
    <span className="studio-source__title">
      <span className="studio-source__path"><bdi>{file}</bdi></span>
      {source?.draft ? (
        <Badge
          className="studio-source__draft"
          size="xs"
          theme="yellow"
          background="subtle"
          title={stale ? "Unsaved admin draft; the file changed on disk since it started" : "Unsaved admin draft: marks show its changes against the file on disk"}
        >
          {stale ? "Draft · disk changed" : "Draft"}
        </Badge>
      ) : null}
      {range ? <span className={`studio-source__range ${typographyStyles["Caption/Regular"]}`}>{range}</span> : null}
    </span>
  );
  const vscode = server.root ? `vscode://file/${server.root.replace(/\/+$/, "")}/${file}:${highlight?.from ?? 1}` : null;
  const openInEditor = vscode ? (
    <IconButton size="xs" icon="icon-link-external-line" aria-label="Open in VS Code" onClick={() => { window.location.href = vscode; }} />
  ) : null;
  const expand = expandable ? (
    <IconButton
      size="xs"
      icon="icon-maximize-02-line"
      aria-label="Open code wide"
      onClick={() => { window.dispatchEvent(new CustomEvent(EXPAND_CODE_EVENT, { detail: { file, highlight } })); }}
    />
  ) : null;
  const actions = expand || openInEditor ? <>{expand}{openInEditor}</> : null;

  if (!source) {
    return (
      <div className={["studio-source", className].filter(Boolean).join(" ")} style={{ maxHeight }}>
        <div className="studio-code studio-source__state" data-theme="dark">
          <div className="studio-code__header">
            <div className={`studio-code__title ${typographyStyles["Caption/Medium"]}`}>{title}</div>
            <CodeLanguageBadge language={languageOf(file)} />
          </div>
          <div className="studio-source__body" aria-busy={state.status === "loading"}>
            {state.status === "error" ? <Text textStyle="Body/Small/Regular" tone="base">{state.message}</Text> : <SkeletonText lines={8} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={["studio-source", className].filter(Boolean).join(" ")} style={{ maxHeight }}>
      <CodeView
        key={file}
        code={source.content}
        language={languageOf(file)}
        highlight={highlight}
        scrollToLine={highlight?.from ?? null}
        changes={changes}
        title={title}
        label={`Source of ${file}`}
        actions={actions}
      />
    </div>
  );
}
