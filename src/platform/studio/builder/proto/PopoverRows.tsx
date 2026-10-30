import { useEffect, useMemo, useState } from "react";
import { ToggleButton } from "../../../../components/Toggle";
import { Text } from "../../../../components/Text";
import { parseSrc } from "../../api";
import { InspectorRow, InspectorSection } from "../../inspector/Section";
import { RowInputField, RowSelectField } from "../../inspector/rowFields";
import { useStudio } from "../../store";
import type { PageNode, PageTree, PageValue } from "../render/renderPage";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { turnOffPopover, turnOnPopover, writePopoverRows } from "./popoverEdit";
import { labelField, mockLists, mockRows, OWN_POPOVER, POPOVER_ROWS, POPOVER_TRIGGER, popoverDataOf, popoverOpenedBy, sampleLabels, takesPopover, type MockList, type PopoverData } from "./popoverModel";
import type { ProtoLayer } from "./protoEdit";
import { findNode, layerWordsOf } from "./protoModel";
import { triggersOf } from "./protoTriggers";

/*
 * The Popover option's panels (popoverModel.ts): the Design tab's Popover section (a switch; on, the rows) and the rows
 * the Prototype tab shows under On click › Open popover. Rows: Data (Sample, or a list of the page's mock), how many,
 * and each Sample row's words or the fields a mock row shows.
 */

const SAMPLE = "__sample";
const NONE = "__none";

/** The popover a layer opens (its Overlay's Popover, or a Chip itself) and its items, else null. */
export function popoverTarget(tree: PageTree | null, node: PageNode, file: string): { layer: ProtoLayer; items: PageValue | undefined } | null {
  const own = OWN_POPOVER[node.name];
  if (own && node.props[own] !== undefined && !popoverOpenedBy(tree, node)) return { layer: { file, loc: node.loc, name: node.name }, items: node.props[own] };
  const opened = popoverOpenedBy(tree, node);
  return opened ? { layer: { file, loc: opened.popover.loc, name: "Popover" }, items: opened.popover.props.items } : null;
}

/** A number typed in a row: kept while typing, written on Enter or blur (clamped). */
function CountField({ label, value, max, disabled, onCommit }: { label: string; value: number; max: number; disabled: boolean; onCommit: (next: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = Math.max(POPOVER_ROWS.min, Math.min(max, Math.round(Number(draft) || value)));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <RowInputField
      aria-label={label}
      size="sm"
      inputMode="numeric"
      disabled={disabled}
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
    />
  );
}

/** One Sample row's words, written on Enter or blur. */
function RowWords({ index, value, disabled, onCommit }: { index: number; value: string; disabled: boolean; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft.trim() && draft !== value) onCommit(draft.trim()); else setDraft(value); };
  return (
    <InspectorRow label={`Row ${index + 1}`} name={`popover:row:${index}`}>
      <RowInputField aria-label={`Row ${index + 1}`} size="sm" disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }} />
    </InspectorRow>
  );
}

/** The popover's rows: Data, Rows, then each Sample row's words or the fields a mock row shows. */
export function PopoverRows({ target, items, mock, disabled }: { target: ProtoLayer; items: PageValue | undefined; mock: Record<string, unknown>; disabled: boolean }) {
  const lists = useMemo(() => mockLists(mock), [mock]);
  const data = popoverDataOf(items);
  if (!data) return <Text as="p" tone="light" textStyle="Caption/Regular" className="studio-prototype__note">Its rows are set in code.</Text>;
  const list: MockList | undefined = data.kind === "mock" ? lists.find((entry) => entry.path === data.list) : undefined;
  const write = (next: PopoverData, label: string, nextList = list) => void writePopoverRows(target, next, nextList, label);
  const pickData = (value: string) => {
    if (value === SAMPLE) { if (data.kind !== "sample") write({ kind: "sample", labels: sampleLabels(data.rows) }, "Popover rows: Sample"); return; }
    const picked = lists.find((entry) => entry.path === value);
    if (!picked || (data.kind === "mock" && data.list === value)) return;
    write({ kind: "mock", list: picked.path, rows: mockRows(picked), label: labelField(picked), image: picked.images[0] }, `Popover rows: ${picked.path}`, picked);
  };
  const rows = data.kind === "sample" ? data.labels.length : data.rows;
  const maxRows = data.kind === "mock" ? Math.min(list?.count ?? data.rows, POPOVER_ROWS.max) : POPOVER_ROWS.max;
  const setRows = (next: number) => write(data.kind === "sample" ? { kind: "sample", labels: sampleLabels(next, data.labels) } : { ...data, rows: next }, `Popover rows: ${next}`);
  return (
    <>
      <InspectorRow label="Data" name="popover:data">
        <RowSelectField
          aria-label="Popover data"
          size="sm"
          disabled={disabled}
          value={data.kind === "sample" ? SAMPLE : data.list}
          onValueChange={pickData}
          options={[{ value: SAMPLE, label: "Sample" }, ...lists.map((entry) => ({ value: entry.path, label: `${entry.path.replace(/\./g, " › ")} (${entry.count})` }))]}
        />
      </InspectorRow>
      <InspectorRow label="Rows" name="popover:rows">
        <CountField label="Popover rows" value={rows} max={maxRows} disabled={disabled} onCommit={setRows} />
      </InspectorRow>
      {data.kind === "sample" ? data.labels.map((words, index) => (
        <RowWords key={index} index={index} value={words} disabled={disabled} onCommit={(next) => write({ kind: "sample", labels: data.labels.map((entry, at) => (at === index ? next : entry)) }, `Popover row ${index + 1}: ${next}`)} />
      )) : null}
      {data.kind === "mock" && list ? (
        <>
          <InspectorRow label="Label" name="popover:label">
            <RowSelectField aria-label="Row label" size="sm" disabled={disabled} value={data.label} onValueChange={(next) => write({ ...data, label: next }, `Popover label: ${next}`)} options={list.fields.map((field) => ({ value: field, label: field }))} />
          </InspectorRow>
          <InspectorRow label="Caption" name="popover:caption">
            <RowSelectField aria-label="Row caption" size="sm" disabled={disabled} value={data.caption ?? NONE} onValueChange={(next) => write({ ...data, caption: next === NONE ? undefined : next }, `Popover caption: ${next === NONE ? "none" : next}`)} options={[{ value: NONE, label: "None" }, ...list.fields.filter((field) => field !== data.label).map((field) => ({ value: field, label: field }))]} />
          </InspectorRow>
          {list.images.length ? (
            <InspectorRow label="Picture" name="popover:picture">
              <RowSelectField aria-label="Row picture" size="sm" disabled={disabled} value={data.image ?? NONE} onValueChange={(next) => write({ ...data, image: next === NONE ? undefined : next }, `Popover picture: ${next === NONE ? "none" : next}`)} options={[{ value: NONE, label: "None" }, ...list.images.map((field) => ({ value: field, label: field }))]} />
            </InspectorRow>
          ) : null}
        </>
      ) : null}
      {data.kind === "mock" && !list ? <Text as="p" tone="light" textStyle="Caption/Regular" className="studio-prototype__note">{`The page data has no list ${data.list.replace(/\./g, " › ")} now.`}</Text> : null}
    </>
  );
}

/** The Design tab's Popover section of a layer on a builder page that takes a click: a switch (its On click opens a
 *  Popover with Sample rows; a Chip its own), and the rows while it is on. */
export function PopoverSection({ tree, node, file, localPage, disabled }: { tree: PageTree | null; node: PageNode; file: string; localPage: string; disabled: boolean }) {
  const triggers = useMemo(() => triggersOf(node.name, Object.keys(node.props)), [node]);
  if (!takesPopover(node.name, triggers)) return null;
  const layer: ProtoLayer = { file, loc: node.loc, name: node.name };
  const target = popoverTarget(tree, node, file);
  const own = Boolean(OWN_POPOVER[node.name]);
  // Its click does something else now: turning the popover on replaces it (one undo step brings it back).
  const replaces = !target && !own && node.props[POPOVER_TRIGGER] !== undefined;
  const toggle = (on: boolean) => void (on ? turnOnPopover(layer, tree, layerWordsOf(node, POPOVER_TRIGGER)) : turnOffPopover(layer, node, tree, localPage));
  return (
    <InspectorSection
      title="Popover"
      actions={<ToggleButton aria-label="Popover" size="sm" checked={Boolean(target)} disabled={disabled} onCheckedChange={toggle} />}
      note={replaces ? "Replaces what a click does" : undefined}
    >
      {target ? <PopoverRows target={target.layer} items={target.items} mock={tree?.mock ?? {}} disabled={disabled} /> : null}
    </InspectorSection>
  );
}

/** The Popover section of the selected layer (`src`) when it is on the builder page open in the Studio. */
export function PopoverSectionFor({ src, disabled }: { src: string; disabled: boolean }) {
  const localPage = useStudio((state) => state.localPage);
  const page = usePage(localPage);
  const tree = usePageTree(page?.text);
  const parsed = parseSrc(src);
  if (!localPage || !parsed || parsed.file !== pageFile(localPage)) return null;
  const node = findNode(tree, parsed.loc);
  return node ? <PopoverSection key={node.loc} tree={tree} node={node} file={parsed.file} localPage={localPage} disabled={disabled} /> : null;
}
