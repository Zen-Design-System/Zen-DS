import { useEffect, useState, useSyncExternalStore } from "react";
import { SelectField } from "../../../../components/Input";
import { Segmented } from "../../../../components/Segmented";
import { SidePanel } from "../../../../components/SidePanel";
import { Text } from "../../../../components/Text";
import { CodeView } from "../../code/CodeView";
import type { CodeLanguage } from "../../code/tokenize";
import { inspectorStatus } from "../../inspector/status";
import { loadCompile } from "../engine";
import { getPage } from "../store/pageStore";
import { closeExport, exportPageId, subscribeExport } from "./exportState";
import type { HandoffPackage, HtmlExport } from "./htmlExport";
import { zipFiles } from "../../../../../tools/studio/zip.mjs";
import { studioApi, type PromoteResult } from "../../api";
import { useStudio } from "../../store";
import { assetBlob, assetIdsOf } from "../assets/uploads";

/*
 * Export (Studio builder GĐ5, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3b): a builder page as a React
 * component (tools/studio/compile.mjs, loaded with the panel), as static HTML (htmlExport.tsx, loaded with its tab: the
 * screens rendered off screen, a zip with styles.css and the photos), as a handoff package (the code, the design file,
 * handoff.md, a PNG and the HTML of each frame: one zip) or as its design file (`.zen.tsx`): the code view's Copy, or
 * Download. Opened from the page's Inspector panel and its My pages menu (exportState.ts). No dev server needed, except for
 * Promote (GĐ5 M5, admin): the page written into the repo as src/templates/studio/<Name>Template.tsx.
 */

type Tab = "react" | "html" | "handoff" | "design";
type Result = { id: string; title: string; design: string; react: { code: string; component: string; summary: string } | { error: string } };
type HtmlState = { id: string; text: string; result: HtmlExport | { error: string } };
type HandoffState = { id: string; text: string; result: HandoffPackage | { error: string } };

const loadHtml = () => import("./htmlExport");

/** Saves `data` as a file named `name` (the browser's download). */
function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves `text` as a file named `name` (the browser's download). */
export const downloadText = (name: string, text: string) => download(name, text, "text/plain;charset=utf-8");

/** A blob as base64 (the request body of Promote carries the uploaded photos). */
const base64Of = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** Promote's answer as one line: where the template went, and TypeScript's and the harness's verdicts. */
function promoteLine(result: PromoteResult): string {
  if (!result.ok) return result.error;
  const tsc = result.tsc.ok ? "TypeScript ✓" : `TypeScript ✗ ${result.tsc.errors.length} error${result.tsc.errors.length === 1 ? "" : "s"}: ${result.tsc.errors[0] ?? ""}`;
  const findings = result.harness.findings.length;
  const harness = result.harness.ok ? `harness ✓${findings ? ` (${findings} warning${findings === 1 ? "" : "s"})` : ""}` : `harness ✗ ${result.harness.findings[0] ?? ""}`;
  return `Promoted to ${result.file}${result.written.length ? "" : " (unchanged)"} · ${tsc} · ${harness}. Open a pull request with npm run ship.`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const languageOf = (path: string): CodeLanguage => (path.endsWith(".css") ? "css" : path.endsWith(".html") ? "html" : path.endsWith(".md") ? "markdown" : "tsx");

async function read(id: string): Promise<Result | null> {
  const page = await getPage(id);
  if (!page) return null;
  const { compileReact } = await loadCompile();
  const compiled = compileReact(page.text, { file: `${id}.zen.tsx` });
  if ("error" in compiled) return { id, title: page.title, design: page.text, react: { error: compiled.error } };
  const parts = [
    plural(compiled.screens.length, "screen"),
    compiled.overlays.length ? plural(compiled.overlays.length, "overlay") : null,
    compiled.handlers.length ? `${plural(compiled.handlers.length, "interaction")} to wire (TODO(dev) in the code)` : null,
    compiled.media.length ? `${plural(compiled.media.length, "photo")} to put in ./assets` : null,
  ].filter(Boolean);
  return { id, title: page.title, design: page.text, react: { code: compiled.code, component: compiled.component, summary: parts.join(" · ") } };
}

export function ExportDialog() {
  const id = useSyncExternalStore(subscribeExport, exportPageId, exportPageId);
  const [tab, setTab] = useState<Tab>("react");
  const [result, setResult] = useState<Result | null>(null);
  const [html, setHtml] = useState<HtmlState | null>(null);
  const [htmlPath, setHtmlPath] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  // Promote (GĐ5 M5): the dev server writes the page into src/templates/studio (admin only).
  const admin = useStudio((state) => state.role === "admin");
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState<{ id: string; result: PromoteResult } | null>(null);
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    void read(id).then((next) => { if (alive) setResult(next); }, (error: unknown) => inspectorStatus.set("negative", `Export failed: ${error instanceof Error ? error.message : String(error)}`));
    return () => { alive = false; };
  }, [id]);
  const shown = result && result.id === id ? result : null;
  // The HTML renders the screens off screen: only once its tab is open, again when the page changed.
  useEffect(() => {
    if (tab !== "html" || !shown || (html && html.id === shown.id && html.text === shown.design)) return undefined;
    let alive = true;
    void loadHtml()
      .then(({ exportHtml }) => exportHtml({ id: shown.id, title: shown.title, text: shown.design }))
      .then((next) => {
        if (!alive) return;
        setHtml({ id: shown.id, text: shown.design, result: next });
        setHtmlPath("error" in next ? null : next.screens[0]?.file ?? null);
      }, (error: unknown) => { if (alive) setHtml({ id: shown.id, text: shown.design, result: { error: error instanceof Error ? error.message : String(error) } }); });
    return () => { alive = false; };
  }, [tab, shown, html]);

  // The handoff package renders, draws and reads every frame: only once its tab is open, again when the page changed.
  useEffect(() => {
    if (tab !== "handoff" || !shown || (handoff && handoff.id === shown.id && handoff.text === shown.design)) return undefined;
    let alive = true;
    void loadHtml()
      .then(({ prepareHandoff }) => prepareHandoff({ id: shown.id, title: shown.title, text: shown.design }))
      .then((next) => { if (alive) setHandoff({ id: shown.id, text: shown.design, result: next }); },
        (error: unknown) => { if (alive) setHandoff({ id: shown.id, text: shown.design, result: { error: error instanceof Error ? error.message : String(error) } }); });
    return () => { alive = false; };
  }, [tab, shown, handoff]);

  const react = shown && "code" in shown.react ? shown.react : null;
  const handoffShown = handoff && shown && handoff.id === shown.id && handoff.text === shown.design ? handoff.result : null;
  const handoffReady = handoffShown && "files" in handoffShown ? handoffShown : null;
  const htmlShown = html && shown && html.id === shown.id && html.text === shown.design ? html.result : null;
  const htmlFiles = htmlShown && "files" in htmlShown ? htmlShown : null;
  const htmlFile = htmlFiles?.files.find((file) => file.path === htmlPath) ?? null;
  const file = tab === "react" ? (react ? `${react.component}.tsx` : "") : tab === "html" ? htmlFile?.path ?? "" : tab === "handoff" ? (handoffReady ? "handoff.md" : "") : shown ? `${shown.id}.zen.tsx` : "";
  const text = tab === "react" ? react?.code ?? "" : tab === "html" ? htmlFile?.text ?? "" : tab === "handoff" ? handoffReady?.markdown ?? "" : shown?.design ?? "";
  const description = !shown ? "Reading the page…"
    : tab === "design" ? "The page itself: open it in the Studio again with Import, or keep it with the code."
      : tab === "handoff"
        ? (!handoffShown ? "Packing the code, a picture of each frame and the HTML…"
          : handoffReady ? `Everything a developer needs in one zip: the React code, the design file, the photos, a picture and the HTML of each frame, and this handoff.md (${plural(handoffReady.files.length, "file")}).`
            : `The handoff cannot be packed yet: ${"error" in handoffShown ? handoffShown.error : ""}`)
      : tab === "html"
        ? (!htmlShown ? "Rendering the screens…"
          : htmlFiles ? `Static HTML of ${plural(htmlFiles.screens.length, "frame")} with the Zen styles they use (styles.css): open index.html. Menus, dialogs, tabs and fields do not work here; the React code has them.`
            : `The screens cannot be exported yet: ${"error" in htmlShown ? htmlShown.error : ""}`)
        : react ? `A React component for an app that uses @zen-ds/react: ${react.summary}.`
          : `This page cannot be compiled yet: ${"error" in shown.react ? shown.react.error : ""}`;

  const downloadZip = async () => {
    if (!htmlFiles || !shown) return;
    setZipping(true);
    try {
      const { htmlZip } = await loadHtml();
      const { bytes, missing } = await htmlZip(htmlFiles);
      download(`${shown.id}-html.zip`, bytes as Uint8Array<ArrayBuffer>, "application/zip");
      if (missing.length) inspectorStatus.set("negative", `Not in the zip (they did not load): ${missing.join(", ")}`);
    } finally {
      setZipping(false);
    }
  };
  const downloadHandoff = () => {
    if (!handoffReady) return;
    download(handoffReady.name, zipFiles(handoffReady.files) as Uint8Array<ArrayBuffer>, "application/zip");
    if (handoffReady.missing.length) inspectorStatus.set("negative", `Not in the zip (they did not load): ${handoffReady.missing.join(", ")}`);
  };
  const promoteResult = promoted && shown && promoted.id === shown.id ? promoted.result : null;
  const conflict = promoteResult && !promoteResult.ok && promoteResult.code === "conflict" ? promoteResult.file : null;
  const promote = async () => {
    if (!shown) return;
    setPromoting(true);
    try {
      const uploads: Record<string, string> = {};
      for (const asset of assetIdsOf(shown.design)) {
        const blob = await assetBlob(asset);
        if (blob) uploads[asset] = await base64Of(blob);
      }
      const result = await studioApi.promote({ id: shown.id, text: shown.design, uploads, overwrite: Boolean(conflict) });
      setPromoted({ id: shown.id, result });
      inspectorStatus.set(result.ok && result.tsc.ok && result.harness.ok ? "positive" : "negative", promoteLine(result));
    } finally {
      setPromoting(false);
    }
  };
  // Only on the dev server, for an admin: the repo is there to write into.
  const secondaryAction = import.meta.env.DEV && admin && shown
    ? { label: promoting ? "Promoting…" : conflict ? `Replace ${conflict.split("/").pop()}` : "Promote to the repo", disabled: promoting, onClick: () => { void promote(); } }
    : undefined;
  const primaryAction = tab === "handoff"
    ? { label: shown ? `Download ${shown.id}-handoff.zip` : "Download", disabled: !handoffReady, onClick: downloadHandoff }
    : tab === "html"
    ? { label: zipping ? "Packing…" : shown ? `Download ${shown.id}-html.zip` : "Download", disabled: !htmlFiles || zipping, onClick: () => { void downloadZip(); } }
    : { label: file ? `Download ${file}` : "Download", disabled: !text, onClick: () => { if (text) downloadText(file, text); } };

  return (
    <SidePanel
      open={Boolean(id)}
      onOpenChange={(open) => { if (!open) closeExport(); }}
      type="modal"
      title="Export"
      description={description}
      className="studio-export"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      <Segmented
        aria-label="Export as"
        size="md"
        level="secondary"
        fullWidth
        value={tab}
        onValueChange={(next) => setTab(next as Tab)}
        options={[{ id: "react", label: "React" }, { id: "html", label: "HTML" }, { id: "handoff", label: "Handoff" }, { id: "design", label: "Design file" }]}
      />
      {tab === "html" && htmlFiles ? (
        <SelectField
          label="File"
          size="md"
          value={htmlPath ?? ""}
          onValueChange={setHtmlPath}
          options={htmlFiles.files.map((entry) => ({ value: entry.path, label: entry.path }))}
        />
      ) : null}
      {promoteResult ? (
        <Text as="p" textStyle="Body/Small/Regular" tone={promoteResult.ok && promoteResult.tsc.ok && promoteResult.harness.ok ? "positive" : "negative"} data-e2e="promote-result">{promoteLine(promoteResult)}</Text>
      ) : null}
      {text ? (
        <CodeView code={text} language={languageOf(file)} title={file} maxHeight="min(60vh, 640px)" label={`${file} (preview)`} className="studio-export__code" />
      ) : (
        <Text textStyle="Body/Small/Regular" tone="base">{!shown || (tab === "html" && !htmlShown) || (tab === "handoff" && !handoffShown) ? "Reading the page…" : "Nothing to show."}</Text>
      )}
    </SidePanel>
  );
}
