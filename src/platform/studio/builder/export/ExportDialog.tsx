import { useEffect, useState, useSyncExternalStore } from "react";
import { Segmented } from "../../../../components/Segmented";
import { SidePanel } from "../../../../components/SidePanel";
import { Text } from "../../../../components/Text";
import { CodeView } from "../../code/CodeView";
import { inspectorStatus } from "../../inspector/status";
import { loadCompile } from "../engine";
import { getPage } from "../store/pageStore";
import { closeExport, exportPageId, subscribeExport } from "./exportState";

/*
 * Export (Studio builder GĐ5 M1, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3b): a builder page as a
 * React component (tools/studio/compile.mjs, loaded with the panel) or as its design file (`.zen.tsx`): the code view's
 * Copy, or Download. Opened from the page's Inspector panel and its My pages menu (exportState.ts). No dev server needed.
 */

type Tab = "react" | "design";
type Result = { id: string; design: string; react: { code: string; component: string; summary: string } | { error: string } };

/** Saves `text` as a file named `name` (the browser's download). */
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function read(id: string): Promise<Result | null> {
  const page = await getPage(id);
  if (!page) return null;
  const { compileReact } = await loadCompile();
  const compiled = compileReact(page.text, { file: `${id}.zen.tsx` });
  if ("error" in compiled) return { id, design: page.text, react: { error: compiled.error } };
  const parts = [
    plural(compiled.screens.length, "screen"),
    compiled.overlays.length ? plural(compiled.overlays.length, "overlay") : null,
    compiled.handlers.length ? `${plural(compiled.handlers.length, "interaction")} to wire (TODO(dev) in the code)` : null,
    compiled.media.length ? `${plural(compiled.media.length, "photo")} to put in ./assets` : null,
  ].filter(Boolean);
  return { id, design: page.text, react: { code: compiled.code, component: compiled.component, summary: parts.join(" · ") } };
}

export function ExportDialog() {
  const id = useSyncExternalStore(subscribeExport, exportPageId, exportPageId);
  const [tab, setTab] = useState<Tab>("react");
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    void read(id).then((next) => { if (alive) setResult(next); }, (error: unknown) => inspectorStatus.set("negative", `Export failed: ${error instanceof Error ? error.message : String(error)}`));
    return () => { alive = false; };
  }, [id]);
  const shown = result && result.id === id ? result : null;
  const react = shown && "code" in shown.react ? shown.react : null;
  const file = tab === "react" ? (react ? `${react.component}.tsx` : "") : shown ? `${shown.id}.zen.tsx` : "";
  const text = tab === "react" ? react?.code ?? "" : shown?.design ?? "";
  const description = !shown ? "Reading the page…"
    : tab === "design" ? "The page itself: open it in the Studio again with Import, or keep it with the code."
      : react ? `A React component for an app that uses @zen/design-system: ${react.summary}.`
        : `This page cannot be compiled yet: ${"error" in shown.react ? shown.react.error : ""}`;
  return (
    <SidePanel
      open={Boolean(id)}
      onOpenChange={(open) => { if (!open) closeExport(); }}
      type="modal"
      title="Export"
      description={description}
      className="studio-export"
      primaryAction={{ label: file ? `Download ${file}` : "Download", disabled: !text, onClick: () => { if (text) downloadText(file, text); } }}
    >
      <Segmented
        aria-label="Export as"
        size="md"
        level="secondary"
        fullWidth
        value={tab}
        onValueChange={(next) => setTab(next as Tab)}
        options={[{ id: "react", label: "React" }, { id: "design", label: "Design file" }]}
      />
      {text ? (
        <CodeView code={text} language="tsx" title={file} maxHeight="min(60vh, 640px)" label={`${file} (preview)`} className="studio-export__code" />
      ) : (
        <Text textStyle="Body/Small/Regular" tone="base">{shown ? "Nothing to show." : "Reading the page…"}</Text>
      )}
    </SidePanel>
  );
}
