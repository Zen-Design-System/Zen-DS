import { useState } from "react";
import { IconButton } from "../../../../components/Button";
import { Segmented } from "../../../../components/Segmented";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { breakpointOf } from "../../select/gridTracks";
import type { EditOp, SourceAttr } from "../../types";
import {
  BREAKPOINTS, columnsAt, columnsFieldOp, columnsModeOf, columnsModeOps, countOf, type BreakpointKey, type ColumnsMode, type ColumnsValue,
} from "../layoutModel";
import { NumberControl, TextControl } from "../PropField";
import "./controls.css";

/*
 * Grid columns (spec docs/research/studio-inspector-redesign-2026-10-03.md, Phase 6; Figma has no Grid columns, so this
 * follows the spec): Auto-fit (no `columns`: as many `minColumnWidth` columns as fit) · Count (a number) · Tracks (a
 * track list such as "2fr 1fr", with a proportional preview). A per-breakpoint object gets a Breakpoint switch (the
 * frame's breakpoint first) and edits only that key (op setField: the other keys keep their source text); "Same on every
 * breakpoint" writes the value that renders now as a plain one. Every change is one apply.
 */

const MODE_LABELS: Record<ColumnsMode, string> = { "auto-fit": "Auto-fit", count: "Count", tracks: "Tracks" };
const BREAKPOINT_ICONS = { mobile: "icon-mobile-line", tablet: "icon-tablet-line", desktop: "icon-monitor-01-line" } as const;
const BREAKPOINT_NAMES: Record<BreakpointKey, string> = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop" };

/** What `columns` holds, read from its attribute (a number or string literal, an object literal of literals, or code). */
export function columnsValueOf(attributes: SourceAttr[]): ColumnsValue {
  const attr = attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === "columns").at(-1);
  if (!attr) return { kind: "unset" };
  if (attr.kind === "string") return { kind: "value", value: attr.value ?? "" };
  if (attr.kind !== "expression") return { kind: "code" };
  const raw = (attr.value ?? "").trim();
  if (/^\d+$/.test(raw)) return { kind: "value", value: Number(raw) };
  const quoted = /^(["'`])([^"'`$]*)\1$/.exec(raw);
  if (quoted) return { kind: "value", value: quoted[2] };
  if (attr.shape?.type !== "object" || attr.shape.fields.some((field) => field.kind === "spread" || field.kind === "expression" || field.kind === "boolean")) return { kind: "code" };
  const values: Partial<Record<BreakpointKey, number | string>> = {};
  for (const field of attr.shape.fields) {
    if (!(BREAKPOINTS as readonly string[]).includes(field.key)) return { kind: "code" };
    values[field.key as BreakpointKey] = field.value as number | string;
  }
  return { kind: "responsive", values };
}

/** How many columns the grid lays out now (for a mode change), at least 1. */
function renderedCount(host: Element | null): number {
  if (!host?.isConnected) return 2;
  const tracks = getComputedStyle(host).gridTemplateColumns.trim();
  return tracks && tracks !== "none" ? Math.max(1, tracks.split(/\s+/).length) : 2;
}

/** The track list as proportional segments (fr weights; fixed tracks drawn as one share). */
function TracksPreview({ tracks }: { tracks: string }) {
  const parts = tracks.trim().split(/\s+(?![^(]*\))/).filter(Boolean);
  if (parts.length < 2 || parts.length > 12) return null;
  const weight = (part: string) => {
    const fr = /^(\d*\.?\d+)fr$/.exec(part);
    return fr ? Number(fr[1]) : 1;
  };
  return (
    <span className="studio-columns__tracks" aria-hidden="true">
      {parts.map((part, index) => <span key={index} className="studio-columns__track" style={{ flex: `${weight(part)} 1 0` }} />)}
    </span>
  );
}

/** The value editor of one mode (Count: a number 1–12; Tracks: a track list); Auto-fit edits the minimum column width. */
function ValueField({ mode, value, fallback, minColumnWidth, minFallback, disabled, onValue, onMinWidth }: {
  mode: ColumnsMode;
  value: number | string | undefined;
  /** What renders while this breakpoint writes nothing (inherited from another key). */
  fallback?: number | string;
  minColumnWidth?: number | string;
  minFallback: number;
  disabled: boolean;
  onValue: (value: number | string) => void;
  onMinWidth?: (value: number | null) => void;
}) {
  if (mode === "auto-fit") {
    return (
      <div className="studio-layout-field" data-prop="minColumnWidth">
        <NumberControl
          label="Min column width"
          value={typeof minColumnWidth === "number" ? minColumnWidth : undefined}
          fallback={minFallback}
          disabled={disabled || typeof minColumnWidth === "string"}
          onSet={(next) => onMinWidth?.(Number.isFinite(next) && next > 0 ? Math.round(next) : null)}
        />
      </div>
    );
  }
  if (mode === "count") {
    return (
      <div className="studio-layout-field">
        <NumberControl
          label="Columns"
          value={typeof value === "number" ? value : undefined}
          fallback={typeof fallback === "number" ? fallback : undefined}
          disabled={disabled}
          onSet={(next) => { if (Number.isFinite(next)) onValue(Math.min(12, Math.max(1, Math.round(next)))); }}
        />
      </div>
    );
  }
  return (
    <div className="studio-layout-field">
      <TextControl
        label="Column tracks"
        value={typeof value === "string" ? value : undefined}
        fallback={typeof fallback === "string" ? fallback : undefined}
        disabled={disabled}
        onSet={(next) => { const text = String(next).trim(); if (text) onValue(text); }}
      />
    </div>
  );
}

export function ColumnsField({ attributes, minColumnWidth, minFallback, host, disabled, apply }: {
  attributes: SourceAttr[];
  /** The literal minColumnWidth the source writes. */
  minColumnWidth: number | string | undefined;
  /** Grid's documented minimum column width (240). */
  minFallback: number;
  host: HTMLElement | null;
  disabled: boolean;
  /** One gesture's ops (one apply). */
  apply: (ops: EditOp[], label: string) => void;
}) {
  const columns = columnsValueOf(attributes);
  const [picked, setPicked] = useState<BreakpointKey | null>(null);
  if (columns.kind === "code") return null;
  const minWidthOps = (next: number | null): EditOp[] => (next === null ? [{ op: "removeProp", name: "minColumnWidth" }] : [{ op: "setProp", name: "minColumnWidth", value: { kind: "number", value: next } }]);

  if (columns.kind === "responsive") {
    const breakpoint = picked ?? (host ? breakpointOf(host) : "desktop");
    const own = columns.values[breakpoint];
    const from = columnsAt(columns.values, breakpoint);
    const shown = own ?? (from ? columns.values[from] : undefined);
    const mode = columnsModeOf(shown) === "auto-fit" ? "count" : columnsModeOf(shown);
    return (
      <div className="studio-layout-group" role="group" aria-label="Columns" data-prop="columns">
        <span className={`studio-layout-group__label ${typographyStyles["Caption/Regular"]}`}>Columns</span>
        <div className="studio-layout-group__row">
          <Segmented
            aria-label="Breakpoint"
            size="sm"
            fullWidth
            value={breakpoint}
            onValueChange={(next) => setPicked(next as BreakpointKey)}
            options={BREAKPOINTS.map((key) => ({ id: key, label: "", leading: BREAKPOINT_ICONS[key], "aria-label": `${BREAKPOINT_NAMES[key]}${columns.values[key] === undefined ? " (inherits)" : ""}` }))}
          />
          <span className="studio-layout-group__slot">
            {shown !== undefined && !disabled ? (
              <IconButton icon="icon-link-01-line" aria-label="Same on every breakpoint" appearance="flat" level="primary" size="xs" onClick={() => apply([{ op: "setProp", name: "columns", value: typeof shown === "number" ? { kind: "number", value: shown } : { kind: "string", value: shown } }], `Columns → ${shown} on every breakpoint`)} />
            ) : null}
          </span>
        </div>
        <div className="studio-layout-group__row">
          <div className="studio-layout-seg" data-default={own === undefined || undefined}>
            <Segmented
              aria-label={`Columns on ${BREAKPOINT_NAMES[breakpoint].toLowerCase()}`}
              size="sm"
              fullWidth
              disabled={disabled}
              value={mode}
              onValueChange={(next) => {
                if (next === mode) return;
                const count = typeof shown === "string" ? countOf(shown) ?? renderedCount(host) : typeof shown === "number" ? shown : renderedCount(host);
                apply([columnsFieldOp(breakpoint, next === "count" ? Math.min(12, count) : Array.from({ length: count }, () => "1fr").join(" "))], `Columns on ${breakpoint} → ${MODE_LABELS[next as ColumnsMode]}`);
              }}
              options={(["count", "tracks"] as const).map((key) => ({ id: key, label: MODE_LABELS[key] }))}
            />
          </div>
          <span className="studio-layout-group__slot" />
        </div>
        <div className="studio-layout-group__row">
          <ValueField mode={mode} value={own} fallback={own === undefined ? shown : undefined} minFallback={minFallback} disabled={disabled} onValue={(next) => apply([columnsFieldOp(breakpoint, next)], `Columns on ${breakpoint} → ${next}`)} />
          <span className="studio-layout-group__slot" />
        </div>
        {typeof shown === "string" ? <div className="studio-layout-group__row"><TracksPreview tracks={shown} /><span className="studio-layout-group__slot" /></div> : null}
      </div>
    );
  }

  const value = columns.kind === "value" ? columns.value : undefined;
  const mode = columnsModeOf(value);
  return (
    <div className="studio-layout-group" role="group" aria-label="Columns" data-prop="columns">
      <span className={`studio-layout-group__label ${typographyStyles["Caption/Regular"]}`}>Columns</span>
      <div className="studio-layout-group__row">
        <div className="studio-layout-seg" data-default={value === undefined || undefined}>
          <Segmented
            aria-label="Columns"
            size="sm"
            fullWidth
            disabled={disabled}
            value={mode}
            onValueChange={(next) => apply(columnsModeOps(value, next as ColumnsMode, renderedCount(host)), `Columns → ${MODE_LABELS[next as ColumnsMode]}`)}
            options={(["auto-fit", "count", "tracks"] as const).map((key) => ({ id: key, label: MODE_LABELS[key] }))}
          />
        </div>
        <span className="studio-layout-group__slot" />
      </div>
      <div className="studio-layout-group__row">
        <ValueField
          mode={mode}
          value={value}
          minColumnWidth={minColumnWidth}
          minFallback={minFallback}
          disabled={disabled}
          onValue={(next) => apply([{ op: "setProp", name: "columns", value: typeof next === "number" ? { kind: "number", value: next } : { kind: "string", value: next } }], `Columns → ${next}`)}
          onMinWidth={(next) => apply(minWidthOps(next), next === null ? "Min column width → default" : `Min column width → ${next}`)}
        />
        <span className="studio-layout-group__slot" />
      </div>
      {typeof value === "string" ? <div className="studio-layout-group__row"><TracksPreview tracks={value} /><span className="studio-layout-group__slot" /></div> : null}
    </div>
  );
}
