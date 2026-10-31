import { useEffect, useState } from "react";
import { IconButton } from "../../../../components/Button";
import { Segmented } from "../../../../components/Segmented";
import { Text } from "../../../../components/Text";
import { InspectorRow } from "../../inspector/Section";
import { RowInputField, RowSelectField } from "../../inspector/rowFields";
import type { PageValue } from "../render/renderPage";
import { isOperand, operandCode, varType, type VarRef } from "../../../../../tools/studio/proto-vars.mjs";
import { protoActionCode, type ProtoFrame } from "./protoModel";
import { actionCode, expressionCode, literalCode, operandWords, VAR_START, type PageVar } from "./protoVars";

/*
 * The Prototype tab's rows for Set variable and Conditional (W-52 phase B2, docs/research/studio-prototype-variables-
 * 2026-10-31.md §3.2): which variable and its new value (a value, Off · On · Flip, or Figma's expression `count + 1`), and
 * a Conditional's test with what runs when it holds and what runs otherwise. Each change writes the action's code whole
 * (`write`), through the trigger row, so it lands in its place among the trigger's actions; one undo step.
 */

type Write = (code: string, label: string) => void;
/** Create variable…: adds a variable of `type`, then writes `codeFor(its name)` in the action's place (one undo step). */
export type CreateVar = (type: PageVar["type"], codeFor: (name: string) => string, label: string) => void;
const CREATE = "__create";
const NONE = "__none";

/** `proto.set("x", <value>)`. */
export const setCode = (name: string, value: string) => `proto.set(${JSON.stringify(name)}, ${value})`;

/** A first Set variable: the first variable flipped (a boolean), plus one (a number), its start value (text). Null when
 *  the page has none. */
export function defaultSetCode(vars: readonly PageVar[]): string | null {
  const first = vars[0];
  if (!first) return null;
  if (first.type === "boolean") return setCode(first.name, `!vars.${first.name}`);
  if (first.type === "number") return setCode(first.name, `vars.${first.name} + 1`);
  return setCode(first.name, literalCode(first.value));
}

/** A first Conditional: on the first variable (on, or its start value), running `then`. */
export function defaultIfCode(vars: readonly PageVar[], then: string): string | null {
  const first = vars[0];
  if (!first) return null;
  const test = first.type === "boolean" ? `vars.${first.name}` : `vars.${first.name} === ${literalCode(first.value)}`;
  return `proto.if(${test}, ${then})`;
}

const refName = (operand: unknown) => (isOperand(operand) && (operand as VarRef).kind === "ref" && (operand as VarRef).root === "vars" ? (operand as VarRef).path[0] : null);

/** Set variable: the variable (or a new one, `create`) and its new value. */
export function SetVariableRows({ name, value, vars, write, create, disabled, prefix }: { name: string; value: unknown; vars: readonly PageVar[]; write: Write; create: CreateVar; disabled: boolean; prefix: string }) {
  const entry = vars.find((item) => item.name === name);
  const type = entry?.type ?? "text";
  const names = vars.map((item) => item.name);
  // The value as a person reads it: a literal as itself, an expression in Figma's words (`count + 1`).
  const literal = !isOperand(value);
  const words = literal ? String(value ?? "") : operandWords(value);
  const [expression, setExpression] = useState(!literal && type !== "boolean");
  useEffect(() => setExpression(!literal && type !== "boolean"), [literal, type]);
  const [draft, setDraft] = useState(words);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDraft(words); setError(null); }, [words]);
  const pickVariable = (next: string) => {
    // A new variable is of this one's kind, starting at its first value; the action sets it to its first new value.
    const firstValue = (to: string, kind: PageVar["type"], start: unknown) => (kind === "boolean" ? `!vars.${to}` : kind === "number" ? `vars.${to} + 1` : literalCode(start));
    if (next === CREATE) { create(type, (made) => setCode(made, firstValue(made, type, VAR_START[type])), "Set a new variable"); return; }
    const to = vars.find((item) => item.name === next);
    if (!to) return;
    // A value that fits the picked variable stays.
    write(setCode(next, literal && varType(value) === to.type ? literalCode(value) : firstValue(next, to.type, to.value)), `Set variable ${next}`);
  };
  const commit = () => {
    if (draft === words) return;
    if (!expression && type === "text") { write(setCode(name, JSON.stringify(draft)), `Set ${name} to ${draft}`); return; }
    const trimmed = draft.trim();
    if (type === "number" && /^-?\d+(\.\d+)?$/.test(trimmed)) { write(setCode(name, trimmed), `Set ${name} to ${trimmed}`); return; }
    const code = expressionCode(trimmed, names);
    if (code === null) { setError("Not an expression: use variable names, numbers, \"text\", + - * / and = < >"); return; }
    write(setCode(name, code), `Set ${name} to ${trimmed}`);
  };
  const flip = refName((value as { args?: unknown[] })?.args?.[0]) === name && (value as { op?: string })?.op === "!";
  return (
    <>
      <InspectorRow label="Variable" name={`${prefix}:variable`}>
        <RowSelectField aria-label="Variable" size="sm" disabled={disabled} value={entry ? name : ""} placeholder="—" onValueChange={pickVariable} options={[...vars.map((item) => ({ value: item.name, label: item.name })), { value: CREATE, label: "Create variable…" }]} />
      </InspectorRow>
      {type === "boolean" ? (
        <InspectorRow label="To" name={`${prefix}:value`}>
          <Segmented
            aria-label={`${name} value`}
            size="sm"
            fullWidth
            disabled={disabled}
            value={flip ? "flip" : value === true ? "on" : value === false ? "off" : ""}
            onValueChange={(next) => write(setCode(name, next === "flip" ? `!vars.${name}` : next === "on" ? "true" : "false"), `Set ${name} ${next === "flip" ? "to its opposite" : next === "on" ? "on" : "off"}`)}
            options={[{ id: "off", label: "Off" }, { id: "on", label: "On" }, { id: "flip", label: "Flip" }]}
          />
        </InspectorRow>
      ) : (
        <InspectorRow
          label="To"
          name={`${prefix}:value`}
          action={type === "text" ? <IconButton appearance="flat" level={expression ? "accent" : "primary"} size="xs" icon="icon-code-01-line" aria-label="Expression" aria-pressed={expression} tooltip={expression ? "A value" : "An expression"} disabled={disabled} onClick={() => setExpression((on) => !on)} /> : undefined}
        >
          <RowInputField
            aria-label={`${name} value`}
            size="sm"
            disabled={disabled}
            value={draft}
            placeholder={type === "number" ? `${name} + 1` : expression ? `${name} + "!"` : "Text"}
            onChange={(event) => { setDraft(event.target.value); setError(null); }}
            onBlur={commit}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } if (event.key === "Escape") setDraft(words); }}
          />
        </InspectorRow>
      )}
      {error ? <Text as="p" tone="light" textStyle="Caption/Regular" className="studio-prototype__note">{error}</Text> : null}
    </>
  );
}

/** A Conditional's test as a variable, a comparison and a value; null when it is more than that (an expression). */
function testOf(condition: unknown): { name: string; op: string; value: unknown } | null {
  const own = refName(condition);
  if (own) return { name: own, op: "===", value: true };
  const expr = condition as { kind?: string; op?: string; args?: unknown[] };
  if (expr?.kind !== "expr" || !expr.args) return null;
  if (expr.op === "!" && refName(expr.args[0])) return { name: refName(expr.args[0])!, op: "===", value: false };
  const name = refName(expr.args[0]);
  if (name && !isOperand(expr.args[1]) && ["===", "!==", "<", "<=", ">", ">="].includes(expr.op ?? "")) return { name, op: expr.op!, value: expr.args[1] };
  return null;
}
/** A test as code: `vars.x` / `!vars.x` for a boolean on or off, else `vars.x <op> <value>`. */
const testCode = (name: string, op: string, value: unknown, type: PageVar["type"]) => {
  if (type === "boolean" && (op === "===" || op === "!==")) return (value === true) === (op === "===") ? `vars.${name}` : `!vars.${name}`;
  return `vars.${name} ${op} ${literalCode(value)}`;
};
const OPS = [{ value: "===", label: "is" }, { value: "!==", label: "is not" }, { value: "<", label: "<" }, { value: "<=", label: "≤" }, { value: ">", label: ">" }, { value: ">=", label: "≥" }];

/** The simple actions a Conditional's branch takes, by what they write. */
const BRANCH_ACTIONS = [{ value: "navigate", label: "Navigate to" }, { value: "open", label: "Open overlay" }, { value: "close", label: "Close overlay" }, { value: "back", label: "Back" }, { value: "toast", label: "Show toast" }, { value: "set", label: "Set variable" }];

/** Conditional: If (the test), Then (one action), Else (one action, or none). */
export function ConditionalRows({ args, vars, frames, write, create, disabled, prefix }: { args: unknown[]; vars: readonly PageVar[]; frames: readonly ProtoFrame[]; write: Write; create: CreateVar; disabled: boolean; prefix: string }) {
  const [condition, then, otherwise] = args;
  const branchCode = (value: unknown) => (value && typeof value === "object" ? actionCode(value as { action: string; args: unknown[] }) : null);
  const thenCode = branchCode(then) ?? "proto.close()";
  const elseCode = branchCode(otherwise);
  const conditionCode = (code: string) => `proto.if(${code}, ${thenCode}${elseCode ? `, ${elseCode}` : ""})`;
  const currentTest = operandWords(condition);
  const test = testOf(condition);
  const entry = test ? vars.find((item) => item.name === test.name) : undefined;
  const names = vars.map((item) => item.name);
  const [asExpression, setAsExpression] = useState(!test);
  useEffect(() => setAsExpression(!test), [Boolean(test)]);
  const [draft, setDraft] = useState(currentTest);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDraft(currentTest); setError(null); }, [currentTest]);
  const [valueDraft, setValueDraft] = useState(String(test?.value ?? ""));
  useEffect(() => setValueDraft(String(test?.value ?? "")), [test?.value]);
  const writeTest = (name: string, op: string, value: unknown) => {
    const type = vars.find((item) => item.name === name)?.type ?? "text";
    write(conditionCode(testCode(name, op, value, type)), `If ${name} ${OPS.find((entry) => entry.value === op)?.label ?? op} ${String(value)}`);
  };
  const commitExpression = () => {
    if (draft === currentTest) return;
    const code = expressionCode(draft.trim(), names);
    if (code === null) { setError("Not an expression: use variable names, numbers, \"text\", and or not, = < >"); return; }
    write(conditionCode(code), `If ${draft.trim()}`);
  };
  /** The whole Conditional with one branch's code in place (Else: null runs nothing). */
  const withBranch = (which: "then" | "else", code: string | null) => {
    const nextThen = which === "then" ? code ?? "proto.close()" : thenCode;
    const nextElse = which === "else" ? code : elseCode;
    return `proto.if(${operandCode(condition)}, ${nextThen}${nextElse ? `, ${nextElse}` : ""})`;
  };
  const branchWrite = (which: "then" | "else") => (code: string | null, label: string) => write(withBranch(which, code), label);
  const branchCreate = (which: "then" | "else"): CreateVar => (kind, codeFor, label) => create(kind, (made) => withBranch(which, codeFor(made)), label);
  const type = entry?.type;
  return (
    <>
      <InspectorRow
        label="If"
        name={`${prefix}:if`}
        action={<IconButton appearance="flat" level={asExpression ? "accent" : "primary"} size="xs" icon="icon-code-01-line" aria-label="Edit as expression" aria-pressed={asExpression} tooltip={asExpression ? "Pick a variable" : "Edit as expression"} disabled={disabled || (asExpression && !test)} onClick={() => setAsExpression((on) => !on)} />}
      >
        {asExpression || !test ? (
          <RowInputField
            aria-label="Condition"
            size="sm"
            disabled={disabled}
            value={draft}
            placeholder={'dateRange == "Any time"'}
            onChange={(event) => { setDraft(event.target.value); setError(null); }}
            onBlur={commitExpression}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitExpression(); } if (event.key === "Escape") setDraft(currentTest); }}
          />
        ) : (
          <RowSelectField aria-label="Condition variable" size="sm" disabled={disabled} value={test.name} onValueChange={(next) => { const to = vars.find((item) => item.name === next); writeTest(next, test.op, to ? (to.type === "boolean" ? true : to.value) : test.value); }} options={vars.map((item) => ({ value: item.name, label: item.name }))} />
        )}
      </InspectorRow>
      {!asExpression && test ? (
        <InspectorRow label="" name={`${prefix}:test`}>
          <div className="studio-prototype__test">
            <RowSelectField aria-label="Comparison" size="sm" disabled={disabled} value={test.op} onValueChange={(next) => writeTest(test.name, next, test.value)} options={type === "number" ? OPS : OPS.slice(0, 2)} />
            {type === "boolean" ? (
              <RowSelectField aria-label="Condition value" size="sm" disabled={disabled} value={test.value ? "on" : "off"} onValueChange={(next) => writeTest(test.name, test.op, next === "on")} options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />
            ) : (
              <RowInputField
                aria-label="Condition value"
                size="sm"
                disabled={disabled}
                value={valueDraft}
                onChange={(event) => setValueDraft(event.target.value)}
                onBlur={() => { const next = type === "number" ? Number(valueDraft) || 0 : valueDraft; if (next !== test.value) writeTest(test.name, test.op, next); }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); (event.target as HTMLInputElement).blur(); } }}
              />
            )}
          </div>
        </InspectorRow>
      ) : null}
      {error ? <Text as="p" tone="light" textStyle="Caption/Regular" className="studio-prototype__note">{error}</Text> : null}
      <div className="studio-prototype__branch" data-branch="then">
        <BranchRows label="Then" value={then} vars={vars} frames={frames} write={branchWrite("then")} create={branchCreate("then")} disabled={disabled} prefix={`${prefix}:then`} />
      </div>
      <div className="studio-prototype__branch" data-branch="else">
        <BranchRows label="Else" value={otherwise} vars={vars} frames={frames} write={branchWrite("else")} create={branchCreate("else")} disabled={disabled} prefix={`${prefix}:else`} optional />
      </div>
    </>
  );
}

/** One branch of a Conditional: a simple action and its target. `optional`: Else may run nothing. */
function BranchRows({ label, value, vars, frames, write, create, disabled, prefix, optional = false }: { label: string; value: unknown; vars: readonly PageVar[]; frames: readonly ProtoFrame[]; write: (code: string | null, label: string) => void; create: CreateVar; disabled: boolean; prefix: string; optional?: boolean }) {
  const proto = value && typeof value === "object" && (value as PageValue).kind === "proto" ? (value as { action: string; args: unknown[] }) : null;
  const action = proto?.action ?? NONE;
  const arg = proto?.args[0];
  const screens = frames.filter((frame) => frame.kind === "screen").map((frame) => ({ value: frame.state ? `${frame.id}:${frame.state}` : frame.id, label: frame.state ? `${frame.title} · ${frame.state}` : frame.title }));
  const overlays = frames.filter((frame) => frame.kind === "overlay").map((frame) => ({ value: frame.id, label: frame.title }));
  const title = arg && typeof arg === "object" && "title" in arg ? String((arg as { title?: unknown }).title ?? "") : "";
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);
  const pick = (next: string) => {
    if (next === NONE) { write(null, `${label}: nothing`); return; }
    if (next === "set") {
      const code = defaultSetCode(vars);
      if (code) write(code, `${label}: Set variable`);
      else create("boolean", (made) => setCode(made, `!vars.${made}`), `${label}: Set a new variable`);
      return;
    }
    const target = next === "navigate" ? screens[0]?.value : next === "open" ? overlays[0]?.value : next === "toast" ? "Done" : undefined;
    write(protoActionCode(next as "navigate", target ?? ""), `${label}: ${BRANCH_ACTIONS.find((entry) => entry.value === next)?.label ?? next}`);
  };
  const known = BRANCH_ACTIONS.some((entry) => entry.value === action) || action === NONE;
  return (
    <>
      <InspectorRow label={label} name={`${prefix}:action`}>
        <RowSelectField aria-label={`${label} action`} size="sm" disabled={disabled} value={known ? action : ""} placeholder="Set in code" onValueChange={pick} options={[...(optional ? [{ value: NONE, label: "None" }] : []), ...BRANCH_ACTIONS]} />
      </InspectorRow>
      {action === "navigate" ? (
        <InspectorRow label="Screen" name={`${prefix}:target`}>
          <RowSelectField aria-label={`${label} screen`} size="sm" disabled={disabled} value={typeof arg === "string" ? arg : ""} placeholder="—" onValueChange={(next) => write(protoActionCode("navigate", next), `${label}: Navigate to ${next}`)} options={screens} />
        </InspectorRow>
      ) : null}
      {action === "open" ? (
        <InspectorRow label="Overlay" name={`${prefix}:target`}>
          <RowSelectField aria-label={`${label} overlay`} size="sm" disabled={disabled || !overlays.length} value={typeof arg === "string" ? arg : ""} placeholder={overlays.length ? "—" : "Add an overlay first"} onValueChange={(next) => write(protoActionCode("open", next), `${label}: Open overlay ${next}`)} options={overlays} />
        </InspectorRow>
      ) : null}
      {action === "toast" ? (
        <InspectorRow label="Title" name={`${prefix}:target`}>
          <RowInputField aria-label={`${label} toast title`} size="sm" disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== title) write(protoActionCode("toast", draft), `${label}: Show toast`); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); (event.target as HTMLInputElement).blur(); } }} />
        </InspectorRow>
      ) : null}
      {action === "set" && proto ? <SetVariableRows name={String(proto.args[0] ?? "")} value={proto.args[1]} vars={vars} write={(code, said) => write(code, `${label}: ${said}`)} create={create} disabled={disabled} prefix={prefix} /> : null}
    </>
  );
}
