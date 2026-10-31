import { applyEdit, rebaseLoc, squashEdits } from "../../api";
import type { EditOp, EditResponse } from "../../types";
import type { PageTree } from "../render/renderPage";
import { varType, type VarType } from "../../../../../tools/studio/proto-vars.mjs";
import { freeVarName, pageVarsOf, VAR_START } from "./protoVarsModel";

export * from "./protoVarsModel";

/*
 * Edits of a builder page's prototype variables (W-52 phase B2, docs/research/studio-prototype-variables-2026-10-31.md
 * §3): op "pageVars" on the page's Board (tools/studio/proto-vars-edit.mjs), and Create variable… from an action or a
 * field, one undo step with what it binds. The Prototype tab's Variables section, Set variable and Conditional, and the
 * Inspector's Bind write through here; what they read is protoVarsModel.ts.
 */

export type VarChange = Extract<EditOp, { op: "pageVars" }>["change"];

/** One change to the page's variables, one undo step. Resolves to whether it was written. */
export async function editVars(file: string, tree: PageTree | null, change: VarChange, label: string): Promise<boolean> {
  const board = tree?.board;
  if (!board) return false;
  const response = await applyEdit({ file, loc: board.loc, name: "Board", ops: [{ op: "pageVars", change }] }, label);
  return Boolean(response.ok);
}

/**
 * Create variable… from an action or a field: adds a variable of `type` (starting at `start`, a field's value), then runs
 * `then` with its name and a function that moves a layer's place past the new declaration (it sits above the Board); the
 * two edits are one undo step.
 */
export async function addVarThen(file: string, tree: PageTree | null, type: VarType, label: string, then: (name: string, rebase: (loc: string) => string) => Promise<EditResponse | null>, start: string | number | boolean = VAR_START[type]): Promise<boolean> {
  const board = tree?.board;
  if (!board) return false;
  const name = freeVarName(type, pageVarsOf(tree).map((entry) => entry.name));
  const added = await applyEdit({ file, loc: board.loc, name: "Board", ops: [{ op: "pageVars", change: { add: { name, value: varType(start) === type ? start : VAR_START[type] } } }] }, `Add variable ${name}`);
  if (!added.ok) return false;
  const next = await then(name, (loc) => rebaseLoc(loc, added.before, added.after) ?? loc);
  if (next?.ok) squashEdits(2, label, added.before, next.after);
  return Boolean(next?.ok);
}

