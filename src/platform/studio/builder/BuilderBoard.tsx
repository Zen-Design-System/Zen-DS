import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { Heading, Text } from "../../../components/Text";
import { StudioFrame } from "../board/StudioFrame";
import type { StudioExample } from "../board/frames";
import { notifySourceUpdate } from "../select/picker";
import { loadEngine, zenComponents } from "./engine";
import { DEVICE_WIDTH, ProtoContext, type PageDevice, type ProtoActions } from "./proto/runtime";
import { renderFrame, type PageNode, type PageTree } from "./render/renderPage";
import { Button } from "../../../components/Button";
import { useStudio } from "../store";
import { pageFile, pagesPersist, restorePage, usePage, useStorage, useTrash } from "./store/pageStore";
import "./builder.css";

/*
 * A builder page on the canvas (Studio builder GĐ2 M1; spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b):
 * the page's text from the PageStore, parsed by the engine (dialect.mjs) and rendered without eval, one Studio frame per
 * Screen ("screen:<id>[:<state>]") and Overlay ("overlay:<id>") at its device width. Frames are ordinary example frames
 * to the rest of the Studio (Layers, selection, the frame chrome, Present). Each new text re-renders the board and then
 * tells the Studio a source update happened (the Inspector and the slot layers read again), as Vite's hot update does.
 */

const inertProto: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** A frame's id, its label and its device width. */
function frameOf(node: PageNode): { id: string; label: string; width: number } {
  const id = String(literal(node, "id") ?? "untitled");
  if (node.name === "Overlay") return { id: `overlay:${id}`, label: `Overlay · ${id}`, width: DEVICE_WIDTH.desktop / 2 };
  const state = literal(node, "state");
  const device = (literal(node, "device") as PageDevice | undefined) ?? "desktop";
  const title = String(literal(node, "title") ?? id);
  return { id: `screen:${id}${typeof state === "string" ? `:${state}` : ""}`, label: title, width: DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop };
}

/** The board's kicker: where the page is kept. */
function whereKept(storage: ReturnType<typeof useStorage>): string {
  if (storage.kind === "mirror") return storage.mirror === "dev" ? `My page · kept in ${storage.label}` : `My page · kept in the folder “${storage.label}”`;
  return pagesPersist() ? "My page · saved in this browser" : "My page · this browser cannot keep pages: export it before closing";
}

export function BuilderBoard({ id }: { id: string }) {
  const page = usePage(id);
  const storage = useStorage();
  const inTrash = useTrash().some((item) => item.id === id);
  const admin = useStudio((state) => state.role === "admin");
  const [tree, setTree] = useState<PageTree | null>(null);
  const text = page?.text;
  useEffect(() => {
    if (text === undefined) return undefined;
    let alive = true;
    void loadEngine().then((engine) => { if (alive) setTree(engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree); });
    return () => { alive = false; };
  }, [text]);
  // The new text is on the canvas: what read the old one reads again (Vite's afterUpdate for example code).
  useEffect(() => { if (tree) notifySourceUpdate(); }, [tree]);

  const file = pageFile(id);
  const frames = useMemo(() => {
    if (!tree?.board) return [];
    // Proto handlers run only with the Interact tool (Play is M3); in Select they are inert, as an example's handlers.
    const ctx = { file, mock: tree.mock, proto: inertProto };
    return tree.board.children.filter((child): child is PageNode => child.kind === "element").map((node) => {
      const frame = frameOf(node);
      const example: StudioExample = { title: frame.label, description: "", code: text ?? "", screen: true, render: () => renderFrame(node, ctx) };
      return { ...frame, example };
    });
  }, [tree, file, text]);

  if (!page) {
    return (
      <div className="studio-board studio-builder-board" data-page={`local:${id}`}>
        {inTrash ? (
          <header className="studio-board__title">
            <Heading level={1} textStyle="Heading/1">This page is in the Trash</Heading>
            <Text tone="base">{`${id}.zen.tsx stays in the Trash for 30 days.`}</Text>
            <Button appearance="main" level="primary" size="md" disabled={!admin} onClick={() => void restorePage(id)}>Restore page</Button>
          </header>
        ) : <header className="studio-board__title"><Heading level={1} textStyle="Heading/1">Page not found</Heading><Text tone="base">This browser has no page "{id}".</Text></header>}
      </div>
    );
  }
  return (
    <ProtoContext value={inertProto}>
      <div className="studio-board studio-builder-board" data-page={`local:${id}`}>
        <header className="studio-board__title">
          <Text as="p" textStyle="Body/Small/Medium" tone="base">{whereKept(storage)}</Text>
          <Heading level={1} textStyle="Heading/1">{page.title}</Heading>
        </header>
        {tree?.errors.length ? (
          <div className="studio-builder-board__errors" role="status">
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            <Text textStyle="Body/Small/Regular">{`Line ${tree.errors[0].line}: ${tree.errors[0].message}${tree.errors.length > 1 ? ` (+${tree.errors.length - 1} more)` : ""}`}</Text>
          </div>
        ) : null}
        <div className="studio-builder-board__frames">
          {frames.map((frame) => (
            <StudioFrame key={frame.id} id={frame.id} kind="example" label={frame.label} width={frame.width} example={frame.example}>
              {frame.example.render()}
            </StudioFrame>
          ))}
        </div>
      </div>
    </ProtoContext>
  );
}
