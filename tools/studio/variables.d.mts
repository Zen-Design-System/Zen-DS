export type VariableType = "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
export type VariableValue = string | number | boolean;
export type VariableScope = string;
export type VariableMeta = { description?: string; scopes?: VariableScope[]; hiddenFromPublishing?: boolean };
/** Names a renamed variable still answers to (code reading --zen-<old>, aliases "{Old}"): repo-only, kept by the build as aliases. */
export type VariableFormer = { formerNames?: string[] };
export type VariableToken = { name: string; type: VariableType; valuesByMode: Record<string, VariableValue> } & VariableMeta & VariableFormer;
export type VariableInput = VariableValue | { alias: string };
export type VariableOp =
  | { op: "setValue"; name: string; mode: string; value: VariableInput }
  | { op: "create"; name: string; type: VariableType; after?: string }
  | { op: "rename"; name: string; to: string }
  | { op: "duplicate"; name: string; to?: string }
  | { op: "delete"; name: string }
  | ({ op: "meta"; name: string } & VariableMeta);
export type VariableEntry = { type: VariableType; collection: string; file?: string; valuesByMode: Record<string, VariableValue>; renamedTo?: string } & VariableMeta & VariableFormer;
type MetaChange = { description: string; scopes: VariableScope[]; hiddenFromPublishing: boolean };
export type VariablesChange =
  | { op: "set"; collection: string; name: string; type: VariableType; values: Record<string, VariableInput> }
  | ({ op: "create"; collection: string; name: string; type: VariableType; values: Record<string, VariableInput>; codeSyntax: { WEB: string } } & MetaChange)
  | { op: "rename"; collection: string; name: string; from: string; type: VariableType; codeSyntax: { WEB: string } }
  | ({ op: "meta"; collection: string; name: string; type: VariableType } & MetaChange)
  | { op: "delete"; collection: string; name: string; type: VariableType };
export type VariablesPackage = { format: "zen-studio-variables"; version: 1; changes: VariablesChange[] };

export const TOKEN_SOURCE: RegExp;
export const VARIABLE_TYPES: VariableType[];
export const VARIABLE_SCOPES: Record<VariableType, VariableScope[]>;
export function codeSyntaxOf(name: string): string;
export class VariableEditError extends Error {
  code: string;
  constructor(code: string, message: string);
}
export function cssNameOf(name: string): string;
export function aliasOf(value: unknown): string | null;
export function readCollection(text: string): { name: string; modes: string[]; tokens: VariableToken[] };
export function normalizeColor(value: unknown): string | null;
export function resolveValue(variables: Map<string, VariableEntry>, name: string, mode: string, seen?: Set<string>): VariableValue | null;
export function typeWord(type: string): string;
export function applyVariableOps(text: string, ops: VariableOp[], context: { variables: Map<string, VariableEntry>; readers?: (name: string) => string[]; nameReaders?: (name: string) => string[] }): { text: string; changed: string[]; label: string };
export function variablesOf(texts: Map<string, string>): Map<string, VariableEntry>;
export function aliasReaders(variables: Map<string, VariableEntry>, name: string): string[];
export function variablesPackage(base: Map<string, string>, now: Map<string, string>): VariablesPackage;
