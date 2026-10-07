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
import type { HtmlExport } from "./htmlExport";

/*
 * Export (Studio builder GĐ5, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3b): a builder page as a React
 * component (tools/studio/compile.mjs, loaded with the panel), as static HTML (htmlExport.tsx, loaded with its tab: the
 * screens rendered off screen, a zip with styles.css and the photos) or as its design file (`.zen.tsx`): the code view's
 * Copy, or Download. Opened from the page's Inspector panel and its My pages menu (exportState.ts). No dev server needed.
 */

type Tab = "react" | "html" | "design";
type Result = { id: string; title: string; design: string; react: { code: string; component: string; summary: string } | { error: string } };
type HtmlState = { id: string; text: string; result: HtmlExport | { error: string } };

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

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const languageOf = (path: string): CodeLanguage => (path.endsWith(".css") ? "css" : path.endsWith(".html") ? "html" : "tsx");

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

  const react = shown && "code" in shown.react ? shown.react : null;
  const htmlShown = html && shown && html.id === shown.id && html.text === shown.design ? html.result : null;
  const htmlFiles = htmlShown && "files" in htmlShown ? htmlShown : null;
  const htmlFile = htmlFiles?.files.find((file) => file.path === htmlPath) ?? null;
  const file = tab === "react" ? (react ? `${react.component}.tsx` : "") : tab === "html" ? htmlFile?.path ?? "" : shown ? `${shown.id}.zen.tsx` : "";
  const text = tab === "react" ? react?.code ?? "" : tab === "html" ? htmlFile?.text ?? "" : shown?.design ?? "";
  const description = !shown ? "Reading the page…"
    : tab === "design" ? "The page itself: open it in the Studio again with Import, or keep it with the code."
      : tab === "html"
        ? (!htmlShown ? "Rendering the screens…"
          : htmlFiles ? `Static HTML of ${plural(htmlFiles.screens.length, "frame")} with the Zen styles they use (styles.css): open index.html. Menus, dialogs, tabs and fields do not work here; the React code has them.`
            : `The screens cannot be exported yet: ${"error" in htmlShown ? htmlShown.error : ""}`)
        : react ? `A React component for an app that uses @zen/design-system: ${react.summary}.`
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
  const primaryAction = tab === "html"
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
    >
      <Segmented
        aria-label="Export as"
        size="md"
        level="secondary"
        fullWidth
        value={tab}
        onValueChange={(next) => setTab(next as Tab)}
        options={[{ id: "react", label: "React" }, { id: "html", label: "HTML" }, { id: "design", label: "Design file" }]}
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
      {text ? (
        <CodeView code={text} language={languageOf(file)} title={file} maxHeight="min(60vh, 640px)" label={`${file} (preview)`} className="studio-export__code" />
      ) : (
        <Text textStyle="Body/Small/Regular" tone="base">{!shown || (tab === "html" && !htmlShown) ? "Reading the page…" : "Nothing to show."}</Text>
      )}
    </SidePanel>
  );
}
