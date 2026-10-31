// Types of proto-vars.mjs (a builder page's prototype variables, W-52 phase B).

export type VarType = "text" | "number" | "boolean";
export type VarValue = string | number | boolean;
export type VarRef = { kind: "ref"; root: string; path: string[] };
export type VarExpr = { kind: "expr"; op: string; args: Operand[] };
export type Operand = VarValue | VarRef | VarExpr;
export type ProtoValue = { kind: "proto"; action: string; args: unknown[] };

export const VAR_TYPES: readonly VarType[];
export function varType(value: unknown): VarType | null;
export const OPS: readonly string[];
export const PROP_OPS: readonly string[];
export function isOperand(value: unknown): value is VarRef | VarExpr;
export function isProtoValue(value: unknown): value is ProtoValue;
export function evaluate(operand: unknown, read: (ref: VarRef) => unknown): unknown;
export function operandCode(operand: unknown, parent?: number): string;
export function varsIn(operand: unknown): string[];
export function protoValueCode(value: ProtoValue, literalCode?: (value: unknown) => string): string;
export function protoVarsIn(value: unknown): string[];
export function resolveItems(args: readonly unknown[], read: (ref: VarRef) => unknown): unknown[];
export function withStartValues<T extends { props: Record<string, unknown>; children: unknown[] }>(node: T, vars: Readonly<Record<string, unknown>> | undefined): T;
