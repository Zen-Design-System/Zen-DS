import type { File, Node } from "@babel/types";
import { jsxText, parseShapes, type Parse } from "./snippet";

/*
 * The Vue emitter (Code view P3, plan docs/research/code-languages-plan-2026-10-03.md §3.A and §4): a React snippet — a
 * playground's code or an example file, both inside the portable subset (P2b) — becomes a Vue 3 single-file component
 * on @zen-ds/vue. One snippet, one SFC:
 *
 *   useState → ref · a value derived from state → computed · useId → useId · useRef on an element → a template ref
 *   (`.current` → `.value`, a Zen component's root through `$el`) · a plain useRef → `{ current }`
 *   `cond && <X/>`, `a ? <X/> : <Y/>` → v-if / v-else · `.map(…)`, `Array.from(…, …)` → v-for
 *   a node prop (`leading={<DockIcon/>}`) → a slot of the same name · `onX` → `@x` · `setX(v)` → `x = v`
 *   a module-level helper that returns JSX (`const line = (w) => <SkeletonText …/>`) → drawn where it is called
 *
 * Anything outside that (an effect, a component of its own, JSX kept in a variable) makes the snippet "not
 * translatable": the Code view says so in words; it never shows half a translation. What the package exports, and each
 * component's props, emits and slots, come from platforms/vue/code-language.json (written by vue-parity.mjs --write).
 */

export type VueComponentApi = {
  /** The Vue component's props (React names). */
  props: string[];
  /** Its emits (`remove` for React's `onRemove`). */
  emits: string[];
  /** Its named slots (React's node props). */
  slots: string[];
  /** Every prop the React component documents, so one the port lacks is told apart from an HTML attribute. */
  react: string[];
};
export type VueApi = { exports: string[]; components: Record<string, VueComponentApi> };
/**
 * `free`: names the snippet uses but never declares — a playground's code is an excerpt (`onClick={share}`), as its
 * React is; a type check declares them, an example (a whole module) has none.
 */
export type VueEmit = { ok: true; code: string; free: string[] } | { ok: false; reason: string };

class Untranslatable extends Error {}
const fail = (reason: string): never => {
  throw new Untranslatable(reason);
};

/** Emits the Vue SFC for a React snippet, or the reason it cannot be translated. */
export function emitVue(parse: Parse, code: string, api: VueApi): VueEmit {
  try {
    const emitter = new Emitter(parse, code, api);
    return { ok: true, code: emitter.run(), free: emitter.freeNames() };
  } catch (error) {
    if (error instanceof Untranslatable) return { ok: false, reason: error.message };
    throw error;
  }
}

/* ── AST helpers ───────────────────────────────────────────────────────────────────────────────────────────────────── */

type AnyNode = Node & Record<string, unknown>;
const META = new Set(["loc", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments", "range", "type"]);
/** Keys that hold TypeScript types: not code, so never rewritten. */
const TYPE_KEYS = new Set(["typeAnnotation", "typeParameters", "typeArguments", "returnType", "superTypeParameters"]);

function childNodes(node: AnyNode): Array<[string, AnyNode]> {
  const out: Array<[string, AnyNode]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (META.has(key) || TYPE_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item === "object" && typeof (item as AnyNode).type === "string") out.push([key, item as AnyNode]);
    } else if (value && typeof value === "object" && typeof (value as AnyNode).type === "string") out.push([key, value as AnyNode]);
  }
  return out;
}

const isJsx = (node: AnyNode | null | undefined): boolean => !!node && (node.type === "JSXElement" || node.type === "JSXFragment");
/** True when JSX appears anywhere under `node`. */
const hasJsx = (node: AnyNode): boolean => isJsx(node) || childNodes(node).some(([, child]) => hasJsx(child));
const isFunction = (node: AnyNode) => node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration" || node.type === "ObjectMethod";
const isEmpty = (node: AnyNode) => node.type === "NullLiteral" || node.type === "BooleanLiteral" || (node.type === "Identifier" && node.name === "undefined");
const nameOf = (node: AnyNode) => node.name as string;

/** Names a pattern declares (`x`, `[a, b]`, `{ a, b: c }`). */
function patternNames(node: AnyNode | null | undefined, out: string[] = []): string[] {
  if (!node) return out;
  if (node.type === "Identifier") out.push(nameOf(node));
  else if (node.type === "ArrayPattern") (node.elements as AnyNode[]).forEach((element) => patternNames(element, out));
  else if (node.type === "ObjectPattern") for (const property of node.properties as AnyNode[]) patternNames(property.type === "RestElement" ? (property.argument as AnyNode) : (property.value as AnyNode), out);
  else if (node.type === "AssignmentPattern") patternNames(node.left as AnyNode, out);
  else if (node.type === "RestElement") patternNames(node.argument as AnyNode, out);
  return out;
}

/** The names a function declares for its body: its parameters and every const/let/var/function inside it. */
function functionScope(fn: AnyNode): Set<string> {
  const names = new Set<string>();
  for (const param of fn.params as AnyNode[]) patternNames(param).forEach((name) => names.add(name));
  const visit = (node: AnyNode) => {
    if (node !== fn && isFunction(node)) {
      if (node.type === "FunctionDeclaration" && node.id) names.add(nameOf(node.id as AnyNode));
      return;
    }
    if (node.type === "VariableDeclarator") patternNames(node.id as AnyNode).forEach((name) => names.add(name));
    childNodes(node).forEach(([, child]) => visit(child));
  };
  visit(fn.body as AnyNode);
  return names;
}

/** True when an Identifier at `key` of `parent` reads a binding (not a property name, a declaration or a label). */
function isReference(parent: AnyNode | null, key: string): boolean {
  if (!parent) return true;
  switch (parent.type) {
    case "MemberExpression":
    case "OptionalMemberExpression":
      return key !== "property" || Boolean(parent.computed);
    case "ObjectProperty":
    case "ObjectMethod":
    case "ClassMethod":
    case "ClassProperty":
      return key !== "key" || Boolean(parent.computed);
    case "VariableDeclarator":
      return key !== "id";
    case "ArrowFunctionExpression":
    case "FunctionExpression":
    case "FunctionDeclaration":
      return key !== "params" && key !== "id";
    case "CatchClause":
      return key !== "param";
    case "LabeledStatement":
    case "BreakStatement":
    case "ContinueStatement":
      return false;
    case "ArrayPattern":
    case "ObjectPattern":
    case "RestElement":
    case "AssignmentPattern":
      return key === "right";
    default:
      return true;
  }
}

/** A string literal in single quotes (attribute values are double-quoted). */
const singleQuoted = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const attributeText = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/** An expression put in place of a name: a name or a property read as it is, anything else in parentheses. */
const grouped = (code: string) => (/^[\w$]+(?:(?:\?\.|\.)[\w$]+|\[[\w$.'"]+\])*$/.test(code) || /^`[^`]*`$/.test(code) ? code : `(${code})`);

/** React DOM prop names → the HTML attributes Vue writes. */
const DOM_ATTRIBUTES: Record<string, string> = {
  className: "class", htmlFor: "for", tabIndex: "tabindex", readOnly: "readonly", autoFocus: "autofocus", autoComplete: "autocomplete",
  maxLength: "maxlength", minLength: "minlength", colSpan: "colspan", rowSpan: "rowspan", srcSet: "srcset", crossOrigin: "crossorigin",
  spellCheck: "spellcheck", contentEditable: "contenteditable", inputMode: "inputmode", enterKeyHint: "enterkeyhint", dateTime: "datetime",
  noValidate: "novalidate", accessKey: "accesskey", autoPlay: "autoplay", playsInline: "playsinline", referrerPolicy: "referrerpolicy",
  strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", fillRule: "fill-rule", clipRule: "clip-rule",
};
/** React event props whose DOM event is not their lowercase name. */
const DOM_EVENTS: Record<string, string> = { onDoubleClick: "dblclick" };

/** JavaScript's and the browser's own names: never a snippet's free name. */
const GLOBALS = new Set([
  "undefined", "NaN", "Infinity", "globalThis", "window", "document", "navigator", "console", "Math", "JSON", "Date", "Intl", "Number", "String",
  "Boolean", "Array", "Object", "Promise", "Set", "Map", "WeakMap", "RegExp", "Error", "Symbol", "BigInt", "parseInt", "parseFloat", "isNaN",
  "encodeURIComponent", "decodeURIComponent", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "URL",
  "structuredClone", "alert", "confirm", "fetch", "HTMLElement", "Event", "KeyboardEvent", "MouseEvent",
]);

/* ── the template, as a tree before it is printed ──────────────────────────────────────────────────────────────────── */

type TElement = { kind: "element"; tag: string; attrs: string[]; children: TNode[]; before: string[] };
type TNode = TElement | { kind: "text"; text: string } | { kind: "comment"; text: string };

const element = (tag: string, attrs: string[] = [], nodes: TNode[] = []): TElement => ({ kind: "element", tag, attrs, children: nodes, before: [] });
const isConditional = (node: TElement) => node.attrs.some((attr) => /^v-(if|else|for)/.test(attr));

/** One element takes the directive itself; several nodes, text or an element with one already go in a <template>. */
function withDirective(nodes: TNode[], directive: string): TNode[] {
  const drawn = nodes.filter((node) => node.kind !== "comment");
  const single = drawn.length === 1 && drawn[0].kind === "element" && !isConditional(drawn[0]) ? drawn[0] : null;
  if (single) {
    single.attrs.unshift(directive);
    return nodes;
  }
  return [element("template", [directive], nodes)];
}

/** Escapes JSX text for a Vue template (a `<` or a `{{` would start a tag or an interpolation). */
const templateText = (text: string) => text.replace(/&(?=[#a-zA-Z0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/\{\{/g, "{{ '{{' }}");
/** A JSX comment as an HTML comment (`--` cannot appear inside one). */
const commentText = (raw: string) => raw.replace(/^\s*\*?\s?/gm, "").trim().replace(/\s*\n\s*/g, " ").replace(/--/g, "—");

function printTemplate(nodes: TNode[], depth: number, lines: string[]) {
  const pad = "  ".repeat(depth);
  for (const node of nodes) {
    if (node.kind === "comment") { lines.push(`${pad}<!-- ${node.text} -->`); continue; }
    if (node.kind === "text") { lines.push(`${pad}${node.text}`); continue; }
    for (const comment of node.before) lines.push(`${pad}<!-- ${comment} -->`);
    const oneLine = `<${node.tag}${node.attrs.map((attr) => ` ${attr}`).join("")}`;
    const head = pad.length + oneLine.length > 110 && node.attrs.length > 1 ? `<${node.tag}\n${node.attrs.map((attr) => `${pad}  ${attr}`).join("\n")}\n${pad}` : oneLine;
    const broken = head !== oneLine;
    if (!node.children.length) { lines.push(`${pad}${head}${broken ? "/>" : " />"}`); continue; }
    // Text inside: the content stays on one line, so the template adds no space JSX would not have.
    if (node.children.some((child) => child.kind === "text")) {
      const inner: string[] = [];
      printTemplate(node.children, 0, inner);
      lines.push(`${pad}${head}>${inner.join("")}</${node.tag}>`);
      continue;
    }
    lines.push(`${pad}${head}>`);
    printTemplate(node.children, depth + 1, lines);
    lines.push(`${pad}</${node.tag}>`);
  }
}

/* ── the emitter ───────────────────────────────────────────────────────────────────────────────────────────────────── */

type Edit = { start: number; end: number; text: string };
type Mode = "script" | "template";
/** Names the template reads as another expression: a list item's local const, a helper's parameter. */
type Context = { subst: Map<string, string> };
/** A module-level helper drawn where it is used: its parameters (`rest`: the last gathers the remaining arguments), its
 *  local consts and the markup it returns. */
type Macro = { params: string[]; rest: boolean; locals: AnyNode[]; body: AnyNode };

const LIBRARY = "@zen-ds/react";
const NONE: Context = { subst: new Map() };

class Emitter {
  private source = "";
  private readonly setters = new Map<string, string>(); // setter → state
  private readonly reactive = new Set<string>(); // state and derived values
  private readonly refs = new Map<string, "element" | "component" | "value">();
  private readonly library = new Set<string>();
  private readonly macros = new Map<string, Macro>();
  private readonly vueImports = new Set<string>();
  private readonly vueTypeImports = new Set<string>();
  /** React's Fragment as the snippet imports it (`<Fragment key>` in a list → `<template :key>`). */
  private fragment: string | null = null;
  /** Module-level values without JSX, by name. */
  private readonly values = new Map<string, AnyNode>();

  /** True when a spread's object may hold `children`: React draws them, Vue's v-bind passes them as an attribute. */
  private spreadsChildren(node: AnyNode, seen = new Set<string>()): boolean {
    if (node.type === "ObjectProperty" && !node.computed && ((node.key as AnyNode).name === "children" || (node.key as AnyNode).value === "children")) return true;
    if (node.type === "CallExpression" || node.type === "Identifier") {
      const name = node.type === "Identifier" ? nameOf(node) : (node.callee as AnyNode).type === "Identifier" ? nameOf(node.callee as AnyNode) : null;
      const value = name ? this.values.get(name) : undefined;
      if (value && name && !seen.has(name)) { seen.add(name); if (this.spreadsChildren(value, seen)) return true; }
    }
    return childNodes(node).some(([, child]) => this.spreadsChildren(child, seen));
  }

  constructor(private readonly parse: Parse, private readonly code: string, private readonly api: VueApi) {}

  private program: AnyNode | null = null;
  /** Every comment in the snippet (Babel's list), so template expressions can leave them out. */
  private allComments: AnyNode[] = [];

  /** Names read somewhere in the snippet and declared nowhere in it (nor JavaScript's or the browser's own). */
  freeNames(): string[] {
    if (!this.program) return [];
    const declared = new Set<string>();
    const read = new Set<string>();
    const visit = (node: AnyNode, parent: AnyNode | null, key: string) => {
      // A type of the snippet's own is a declaration, not a read.
      if (node.type === "TSTypeAliasDeclaration" || node.type === "TSInterfaceDeclaration") { declared.add(nameOf(node.id as AnyNode)); return; }
      if (node.type === "ImportSpecifier" || node.type === "ImportDefaultSpecifier" || node.type === "ImportNamespaceSpecifier") declared.add(nameOf(node.local as AnyNode));
      if (node.type === "VariableDeclarator") patternNames(node.id as AnyNode).forEach((name) => declared.add(name));
      if (isFunction(node)) {
        if (node.id) declared.add(nameOf(node.id as AnyNode));
        (node.params as AnyNode[]).forEach((param) => patternNames(param).forEach((name) => declared.add(name)));
      }
      if (node.type === "CatchClause" && node.param) patternNames(node.param as AnyNode).forEach((name) => declared.add(name));
      if (node.type === "Identifier" && isReference(parent, key) && !(parent?.type === "JSXAttribute")) read.add(nameOf(node));
      for (const [childKey, child] of childNodes(node)) visit(child, node, childKey);
    };
    visit(this.program, null, "");
    return [...read].filter((name) => !declared.has(name) && !GLOBALS.has(name)).sort();
  }

  run(): string {
    let parsed: { ast: File; source: string };
    try {
      parsed = parseShapes(this.parse, this.code);
    } catch (error) {
      return fail(`the React code does not parse (${error instanceof Error ? error.message : String(error)})`);
    }
    this.source = parsed.source;
    this.program = parsed.ast.program as unknown as AnyNode;
    this.allComments = ((parsed.ast as unknown as { comments?: AnyNode[] }).comments ?? []);
    const imports: string[] = [];
    const moduleCode: string[] = [];
    const loose: AnyNode[] = [];
    let component: AnyNode | null = null;
    let componentComments = "";
    let props = "";
    let root: AnyNode | null = null;
    for (const statement of parsed.ast.program.body as AnyNode[]) {
      if (statement.type === "ImportDeclaration") {
        const line = this.importLine(statement);
        if (line) imports.push(line);
      } else if (statement.type === "ExportDefaultDeclaration" && (statement.declaration as AnyNode).type === "FunctionDeclaration") {
        component = statement.declaration as AnyNode;
        componentComments = this.comments(statement);
        const params = component.params as AnyNode[];
        if (params.length) {
          // Props a page passes (`{ headingLevel = 4 }: { headingLevel?: 2 | 4 }`) → defineProps, destructured as in React.
          const [param] = params;
          const annotation = param.typeAnnotation as AnyNode | undefined;
          if (params.length > 1 || param.type !== "ObjectPattern" || !annotation) fail("the component's props are not one typed object");
          props = `const ${this.source.slice(param.start as number, annotation?.start as number).trim()} = defineProps<${this.text(annotation?.typeAnnotation as AnyNode)}>();`;
        }
      } else if (statement.type === "ExpressionStatement" && isJsx(statement.expression as AnyNode)) {
        root = statement.expression as AnyNode;
      } else if (statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration") {
        fail("the file exports more than its example");
      } else {
        loose.push(statement);
      }
    }
    // An example: module code, then the component. A playground: statements (state), then the markup.
    let body = loose;
    if (component) {
      for (const statement of loose) {
        const text = this.moduleStatement(statement);
        if (text) moduleCode.push(text);
      }
      const statements = (component.body as AnyNode).body as AnyNode[];
      const last = statements[statements.length - 1];
      if (!last || last.type !== "ReturnStatement" || !isJsx(last.argument as AnyNode)) fail("the component does not end by returning its markup");
      if (statements.slice(0, -1).some((statement) => statement.type === "ReturnStatement")) fail("the component returns early");
      root = last.argument as AnyNode;
      body = statements.slice(0, -1);
    }
    if (!root) return fail("the snippet has no markup");
    this.collectBindings(body, root);
    const script = body.map((statement) => this.componentStatement(statement));
    const template: TNode[] = this.commentTexts(root).map((text) => ({ kind: "comment" as const, text }));
    template.push(...this.jsxValue(root, NONE));

    const head = [
      ...(this.vueImports.size ? [`import { ${[...this.vueImports].sort().join(", ")} } from "vue";`] : []),
      ...(this.vueTypeImports.size ? [`import type { ${[...this.vueTypeImports].sort().join(", ")} } from "vue";`] : []),
      ...imports,
    ];
    const sections = [head.join("\n"), moduleCode.join("\n"), [componentComments, props, ...script].filter(Boolean).join("\n")].filter((section) => section.trim());
    const lines: string[] = [];
    printTemplate(template, 1, lines);
    return `<script setup lang="ts">\n${sections.join("\n\n")}\n</script>\n\n<template>\n${lines.join("\n")}\n</template>\n`;
  }

  /* ── imports, comments, statements ── */

  private importLine(statement: AnyNode): string | null {
    const from = (statement.source as AnyNode).value as string;
    const specifiers = statement.specifiers as AnyNode[];
    const allType = statement.importKind === "type";
    if (from === "react") {
      for (const specifier of specifiers) {
        const name = nameOf((specifier.imported ?? specifier.local) as AnyNode);
        if (allType || specifier.importKind === "type") continue;
        if (name === "Fragment") this.fragment = nameOf(specifier.local as AnyNode);
        else if (!["useState", "useId", "useRef"].includes(name)) fail(`React's ${name} has no Vue translation here`);
      }
      return null;
    }
    if (from === LIBRARY) {
      const names = specifiers.map((specifier) => {
        if (specifier.type !== "ImportSpecifier") return fail("@zen-ds/react is imported as a namespace");
        const imported = nameOf(specifier.imported as AnyNode);
        const local = nameOf(specifier.local as AnyNode);
        const isType = allType || specifier.importKind === "type";
        if (!isType) {
          if (!this.api.exports.includes(imported)) fail(`${imported} isn't in @zen-ds/vue yet`);
          this.library.add(local);
        }
        return `${isType && !allType ? "type " : ""}${imported === local ? imported : `${imported} as ${local}`}`;
      });
      return `import ${allType ? "type " : ""}{ ${names.join(", ")} } from "@zen-ds/vue";`;
    }
    if (from.startsWith(`${LIBRARY}/`)) fail(`${from} has no Vue package yet`);
    return this.withComments(statement);
  }

  private comments(node: AnyNode): string {
    return ((node.leadingComments as AnyNode[] | undefined) ?? []).map((comment) => this.source.slice(comment.start as number, comment.end as number)).join("\n");
  }

  /** A node's comments for the template, `//` lines that run on joined into one comment. */
  private commentTexts(node: AnyNode): string[] {
    type Comment = { type: string; value: string; loc: { start: { line: number }; end: { line: number } } };
    const out: string[] = [];
    let previous: Comment | null = null;
    for (const comment of (node.leadingComments as Comment[] | undefined) ?? []) {
      const text = commentText(comment.value);
      const runsOn = previous?.type === "CommentLine" && comment.type === "CommentLine" && comment.loc.start.line === previous.loc.end.line + 1;
      if (runsOn) out[out.length - 1] += ` ${text}`;
      else out.push(text);
      previous = comment;
    }
    return out;
  }

  private withComments(node: AnyNode, text = this.source.slice(node.start as number, node.end as number)): string {
    const comments = this.comments(node);
    return comments ? `${comments}\n${text}` : text;
  }

  /**
   * A module-level statement: kept as is, unless it holds JSX — a constant (`const noData = <>…</>`) or a helper that
   * returns it (`const line = (width) => <SkeletonText …/>`), drawn where it is used.
   */
  private moduleStatement(statement: AnyNode): string {
    if (!hasJsx(statement)) {
      // Kept as is; a helper's body is read again if its result is spread onto a component (`children` inside).
      for (const declarator of (statement.declarations as AnyNode[] | undefined) ?? []) if ((declarator.id as AnyNode).type === "Identifier" && declarator.init) this.values.set(nameOf(declarator.id as AnyNode), declarator.init as AnyNode);
      return this.withComments(statement);
    }
    const declarators = (statement.declarations as AnyNode[] | undefined) ?? [];
    const [declarator] = declarators;
    const init = declarator?.init as AnyNode | undefined;
    if (statement.type !== "VariableDeclaration" || declarators.length !== 1 || (declarator.id as AnyNode).type !== "Identifier" || !init) return fail("a module-level value holds JSX that is not a helper");
    const name = nameOf(declarator.id as AnyNode);
    if (init.type !== "ArrowFunctionExpression") {
      this.macros.set(name, { params: [], rest: false, locals: [], body: init });
      return "";
    }
    const params = init.params as AnyNode[];
    const rest = params[params.length - 1]?.type === "RestElement";
    if (!params.every((param, index) => param.type === "Identifier" || (rest && index === params.length - 1 && (param.argument as AnyNode).type === "Identifier"))) return fail("a JSX helper takes a pattern");
    let body = init.body as AnyNode;
    let locals: AnyNode[] = [];
    if (body.type === "BlockStatement") {
      const statements = body.body as AnyNode[];
      const last = statements[statements.length - 1];
      if (!last || last.type !== "ReturnStatement" || !last.argument || statements.slice(0, -1).some((item) => item.type !== "VariableDeclaration" || item.kind !== "const")) return fail("a JSX helper runs code before its markup");
      locals = statements.slice(0, -1).flatMap((item) => item.declarations as AnyNode[]);
      body = last.argument as AnyNode;
    }
    this.macros.set(name, { params: params.map((param) => nameOf(param.type === "RestElement" ? (param.argument as AnyNode) : param)), rest, locals, body });
    return "";
  }

  /** The component's state, refs and derived values, known before any of its code is written. */
  private collectBindings(body: AnyNode[], root: AnyNode) {
    const hook = (init: AnyNode | null | undefined) => (init?.type === "CallExpression" && (init.callee as AnyNode).type === "Identifier" ? nameOf(init.callee as AnyNode) : null);
    const declarators = body.filter((statement) => statement.type === "VariableDeclaration").flatMap((statement) => statement.declarations as AnyNode[]);
    for (const declarator of declarators) {
      const id = declarator.id as AnyNode;
      const kind = hook(declarator.init as AnyNode | null);
      if (kind === "useState") {
        if (id.type !== "ArrayPattern") fail("useState is not destructured as [value, setValue]");
        const [value, setter] = id.elements as AnyNode[];
        if (value?.type !== "Identifier") fail("useState's value is not a name");
        this.reactive.add(nameOf(value));
        if (setter?.type === "Identifier") this.setters.set(nameOf(setter), nameOf(value));
      } else if (kind === "useRef" && id.type === "Identifier") {
        this.refs.set(nameOf(id), "value");
      }
    }
    // A ref given to an element (`ref={x}`) is a template ref; on a Zen component it reaches the root through $el.
    const visit = (node: AnyNode, tag: string, inLoop: boolean) => {
      if (node.type === "JSXElement") tag = nameOf((node.openingElement as AnyNode).name as AnyNode) ?? "";
      if (node.type === "JSXAttribute" && nameOf(node.name as AnyNode) === "ref") {
        const expression = (node.value as AnyNode | null)?.expression as AnyNode | undefined;
        // `ref={x}`, or `ref={test ? x : undefined}` for the one row of a list that holds it.
        const conditional = expression?.type === "ConditionalExpression" && isEmpty(expression.alternate as AnyNode) ? (expression.consequent as AnyNode) : null;
        const target = conditional ?? expression;
        if (target?.type !== "Identifier" || !this.refs.has(nameOf(target))) fail("a ref is not one of the component's useRef values");
        if (inLoop && !conditional) fail("a ref sits on every row of a list");
        this.refs.set(nameOf(target as AnyNode), /^[A-Z]/.test(tag) ? "component" : "element");
      }
      const loop = inLoop || (node.type === "CallExpression" && ((node.callee as AnyNode).property as AnyNode | undefined)?.name === "map");
      childNodes(node).forEach(([, child]) => visit(child, tag, loop));
    };
    visit(root, "", false);
    // Derived values: a const computed from state or from another derived value.
    for (const declarator of declarators) {
      const init = declarator.init as AnyNode | null;
      const id = declarator.id as AnyNode;
      if (!init || hook(init) || id.type !== "Identifier" || isFunction(init)) continue;
      if (this.reads(init, (name) => this.reactive.has(name))) this.reactive.add(nameOf(id));
    }
  }

  /** True when `node` reads a binding `test` accepts (outside functions that declare the same name). */
  private reads(node: AnyNode, test: (name: string) => boolean, shadow = new Set<string>(), parent: AnyNode | null = null, key = ""): boolean {
    if (node.type === "Identifier") return isReference(parent, key) && !shadow.has(nameOf(node)) && test(nameOf(node));
    const scope = isFunction(node) ? new Set([...shadow, ...functionScope(node)]) : shadow;
    return childNodes(node).some(([childKey, child]) => this.reads(child, test, scope, node, childKey));
  }

  /** A statement of the component's body, moved out to the top of <script setup> (one indentation level less). */
  private componentStatement(statement: AnyNode): string {
    const column = (statement.loc as { start: { column: number } } | undefined)?.start.column ?? 0;
    const dedent = (text: string) => text.split("\n").map((line, index) => (index ? line.replace(new RegExp(`^ {0,${column}}`), "") : line)).join("\n");
    if (statement.type === "FunctionDeclaration") return dedent(this.withComments(statement, this.rewrite(statement, "script", NONE)));
    if (statement.type !== "VariableDeclaration") return fail(`the component runs a ${statement.type.replace(/Statement$/, "").toLowerCase()} statement while it renders`);
    const out = (statement.declarations as AnyNode[]).map((declarator) => this.declaration(statement.kind as string, declarator));
    return dedent(this.withComments(statement, out.join("\n")));
  }

  private declaration(kind: string, declarator: AnyNode): string {
    const init = declarator.init as AnyNode | null;
    const id = declarator.id as AnyNode;
    const callee = init?.type === "CallExpression" && (init.callee as AnyNode).type === "Identifier" ? nameOf(init.callee as AnyNode) : null;
    const typeNode = (init?.typeParameters ?? init?.typeArguments) as AnyNode | undefined;
    const typeArg = typeNode ? this.source.slice((typeNode.start as number) + 1, (typeNode.end as number) - 1) : "";
    const [first] = (init?.arguments as AnyNode[] | undefined) ?? [];
    if (callee === "useState") {
      this.vueImports.add("ref");
      let value = first ? this.rewrite(first, "script", NONE) : "";
      // A lazy initializer runs once, as ref's argument does.
      if (first?.type === "ArrowFunctionExpression" && !(first.params as AnyNode[]).length) {
        const body = first.body as AnyNode;
        value = body.type === "BlockStatement" ? `(${value})()` : this.rewrite(body, "script", NONE);
      }
      return `const ${nameOf((id.elements as AnyNode[])[0])} = ref${typeArg ? `<${typeArg}>` : ""}(${value});`;
    }
    if (callee === "useId") {
      this.vueImports.add("useId");
      return `const ${this.text(id)} = useId();`;
    }
    if (callee === "useRef") {
      const name = nameOf(id);
      const ref = this.refs.get(name);
      if (ref === "component") {
        this.vueImports.add("ref");
        this.vueTypeImports.add("ComponentPublicInstance");
        return `const ${name} = ref<ComponentPublicInstance | null>(null);`;
      }
      if (ref === "element") {
        this.vueImports.add("ref");
        return `const ${name} = ref<${typeArg || "HTMLElement"} | null>(null);`;
      }
      const value = first ? this.rewrite(first, "script", NONE) : "undefined";
      return typeArg ? `const ${name}: { current: ${typeArg} } = { current: ${value} };` : `const ${name} = { current: ${value} };`;
    }
    if (callee && /^use[A-Z]/.test(callee)) return fail(`${callee} has no Vue translation yet`);
    if (init && hasJsx(init)) return fail("the component keeps JSX in a variable");
    if (init && id.type === "Identifier" && this.reactive.has(nameOf(id)) && !this.setters.has(nameOf(id))) {
      this.vueImports.add("computed");
      const annotation = id.typeAnnotation ? this.text((id.typeAnnotation as AnyNode).typeAnnotation as AnyNode) : "";
      return `const ${nameOf(id)} = computed${annotation ? `<${annotation}>` : ""}(() => ${this.rewrite(init, "script", NONE)});`;
    }
    return `${kind} ${this.text(id)}${init ? ` = ${this.rewrite(init, "script", NONE)}` : ""};`;
  }

  private text(node: AnyNode) {
    return this.source.slice(node.start as number, node.end as number);
  }

  /* ── code: script (`x.value`) or template (refs unwrapped, strings single-quoted) ── */

  /** The source of `node` with state reads, setter calls and ref reads rewritten for `mode`. */
  private rewrite(node: AnyNode, mode: Mode, context: Context, quote = false): string {
    const edits: Edit[] = [];
    this.collect(node, null, "", mode, context, new Set(), edits, quote);
    // The template writes an expression on one line: a comment inside it would hide the code after it. (A comment inside
    // a span already rewritten went with it.)
    if (mode === "template") {
      const inside = (start: number, end: number) => edits.some((edit) => start >= edit.start && end <= edit.end);
      for (const comment of this.allComments) {
        const [start, end] = [comment.start as number, comment.end as number];
        if (start >= (node.start as number) && end <= (node.end as number) && !inside(start, end)) edits.push({ start, end, text: "" });
      }
    }
    const start = node.start as number;
    let text = this.text(node);
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start - start) + edit.text + text.slice(edit.end - start);
    return text;
  }

  private collect(node: AnyNode, parent: AnyNode | null, key: string, mode: Mode, context: Context, shadow: Set<string>, edits: Edit[], quote: boolean): void {
    const replace = (text: string) => { edits.push({ start: node.start as number, end: node.end as number, text }); };
    if (isJsx(node)) return fail("JSX sits inside an expression the template cannot hold");
    if (node.type === "StringLiteral" && quote) return replace(singleQuoted(node.value as string));
    if (node.type === "Identifier") {
      const name = nameOf(node);
      if (!isReference(parent, key) || shadow.has(name)) return;
      const shorthand = parent?.type === "ObjectProperty" && Boolean(parent.shorthand);
      let value: string | null = null;
      if (context.subst.has(name)) value = context.subst.get(name) as string;
      else if (this.setters.has(name)) {
        // A setter handed on (`onValueChange={setQuery}`): a function that sets the value.
        const state = this.setters.get(name) as string;
        if (parent?.type === "ObjectProperty" && Boolean(parent.shorthand)) return fail(`${name} is handed on inside an object`);
        return replace(mode === "script" ? `(value: typeof ${state}.value) => { ${state}.value = value; }` : `(value) => (${state} = value)`);
      }
      else if (this.reactive.has(name) && mode === "script") value = `${name}.value`;
      if (value !== null) {
        if (!shorthand) return replace(value);
        edits.push({ start: parent?.start as number, end: parent?.end as number, text: `${name}: ${value}` });
      }
      return;
    }
    // `ref.current` of a template ref: its element (a Zen component's root through $el).
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && (node.object as AnyNode).type === "Identifier" && !node.computed && nameOf(node.property as AnyNode) === "current") {
      const name = nameOf(node.object as AnyNode);
      const ref = this.refs.get(name);
      if ((ref === "element" || ref === "component") && !shadow.has(name)) {
        if (mode === "template") return fail("the markup reads a ref");
        return replace(ref === "component" ? `${name}.value?.$el` : `${name}.value`);
      }
    }
    // setX(next) → x = next (script: x.value = next); an updater `(previous) => …` reads the current value.
    if (node.type === "CallExpression" && (node.callee as AnyNode).type === "Identifier" && this.setters.has(nameOf(node.callee as AnyNode)) && !shadow.has(nameOf(node.callee as AnyNode))) {
      const state = this.setters.get(nameOf(node.callee as AnyNode)) as string;
      const target = mode === "script" ? `${state}.value` : state;
      const [arg] = node.arguments as AnyNode[];
      if (!arg) return fail(`${nameOf(node.callee as AnyNode)} is called without a value`);
      const params = (arg.params as AnyNode[] | undefined) ?? [];
      let value: string;
      if ((arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") && params.length <= 1 && (params[0]?.type ?? "Identifier") === "Identifier") {
        const body = arg.body as AnyNode;
        const subst = new Map(context.subst);
        if (params[0]) subst.set(nameOf(params[0]), target);
        value = body.type === "BlockStatement" ? `(${this.rewrite(arg, mode, context, quote)})(${target})` : this.rewrite(body, mode, { subst }, quote);
      } else {
        value = this.rewrite(arg, mode, context, quote);
      }
      return replace(`${target} = ${value}`);
    }
    let scope = shadow;
    let inner = context;
    if (isFunction(node)) {
      const own = functionScope(node);
      scope = new Set([...shadow, ...own]);
      // A substitution never reaches into a function that declares the same name.
      if ([...context.subst.keys()].some((name) => own.has(name))) inner = { subst: new Map([...context.subst].filter(([name]) => !own.has(name))) };
    }
    for (const [childKey, child] of childNodes(node)) this.collect(child, node, childKey, mode, inner, scope, edits, quote);
  }

  /** An expression for a template attribute: string literals single-quoted, the rest escaped for double quotes. */
  private attributeExpression(node: AnyNode, context: Context): string {
    return this.rewrite(node, "template", context, true).replace(/"/g, "&quot;").replace(/\s*\n\s*/g, " ");
  }

  /* ── JSX → template ── */

  /** The nodes an expression in a markup position draws. */
  private jsxValue(node: AnyNode, context: Context): TNode[] {
    if (node.type === "JSXElement") return [this.element(node, context)];
    if (node.type === "JSXFragment") return this.children(node.children as AnyNode[], context);
    if (isEmpty(node)) return [];
    if (node.type === "LogicalExpression" && node.operator === "&&" && hasJsx(node.right as AnyNode)) {
      return withDirective(this.jsxValue(node.right as AnyNode, context), `v-if="${this.attributeExpression(node.left as AnyNode, context)}"`);
    }
    if (node.type === "ConditionalExpression" && hasJsx(node)) return this.conditional(node, context);
    if (this.isMacroUse(node, context)) return this.inline(node, context);
    if (node.type === "CallExpression") {
      const loop = this.loop(node, context);
      if (loop) return loop;
    }
    if (hasJsx(node)) return fail("the markup builds JSX in a way the template cannot hold");
    return [{ kind: "text", text: `{{ ${this.rewrite(node, "template", context).replace(/\s*\n\s*/g, " ")} }}` }];
  }

  /** `a ? <X/> : b ? <Y/> : <Z/>` → v-if, v-else-if, v-else (a text branch is a <template> holding the text). */
  private conditional(node: AnyNode, context: Context): TNode[] {
    const branches: Array<{ test: AnyNode | null; value: AnyNode }> = [];
    let current = node;
    while (current.type === "ConditionalExpression") {
      branches.push({ test: current.test as AnyNode, value: current.consequent as AnyNode });
      current = current.alternate as AnyNode;
    }
    branches.push({ test: null, value: current });
    // `a ? null : <X/>`: only the second branch draws something.
    if (branches.length === 2 && isEmpty(branches[0].value) && !isEmpty(branches[1].value)) {
      return withDirective(this.branch(branches[1].value, context), `v-if="!(${this.attributeExpression(branches[0].test as AnyNode, context)})"`);
    }
    while (branches.length && isEmpty(branches[branches.length - 1].value)) branches.pop();
    return branches.flatMap((branch, index) => {
      if (isEmpty(branch.value)) return fail("a middle branch of a condition draws nothing");
      const directive = branch.test === null ? "v-else" : `${index === 0 ? "v-if" : "v-else-if"}="${this.attributeExpression(branch.test, context)}"`;
      return withDirective(this.branch(branch.value, context), directive);
    });
  }

  private branch(value: AnyNode, context: Context): TNode[] {
    const nodes = this.jsxValue(value, context);
    // A text branch needs an element to carry its directive.
    return nodes.length === 1 && nodes[0].kind === "text" ? [element("template", [], nodes)] : nodes;
  }

  /** `list.map((item, i) => <X key={…}/>)` and `Array.from(n, (_, i) => …)` → v-for. */
  private loop(node: AnyNode, context: Context): TNode[] | null {
    const callee = node.callee as AnyNode;
    const args = node.arguments as AnyNode[];
    let list: string;
    let callback: AnyNode;
    if ((callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") && !callee.computed && nameOf(callee.property as AnyNode) === "map" && args.length === 1) {
      list = this.attributeExpression(callee.object as AnyNode, context);
      callback = args[0];
    } else if (callee.type === "MemberExpression" && nameOf(callee.object as AnyNode) === "Array" && nameOf(callee.property as AnyNode) === "from" && args.length === 2) {
      list = `Array.from(${this.attributeExpression(args[0], context)})`;
      callback = args[1];
    } else {
      return null;
    }
    if (callback.type !== "ArrowFunctionExpression" || (callback.params as AnyNode[]).length > 2) return fail("a list is drawn by something other than an inline arrow function");
    const params = (callback.params as AnyNode[]).map((param) => this.source.slice(param.start as number, param.typeAnnotation ? ((param.typeAnnotation as AnyNode).start as number) : (param.end as number)).trim());
    const alias = params.length === 1 ? params[0] : `(${params.join(", ")})`;
    // The loop's own names hide outer substitutions of the same name.
    const names = new Set((callback.params as AnyNode[]).flatMap((param) => patternNames(param)));
    const subst = new Map([...context.subst].filter(([name]) => !names.has(name)));
    let result = callback.body as AnyNode;
    const comments: string[] = [];
    if (result.type === "BlockStatement") {
      const statements = result.body as AnyNode[];
      const last = statements[statements.length - 1];
      if (!last || last.type !== "ReturnStatement" || !last.argument) return fail("a list item's function does not end by returning its markup");
      for (const statement of statements.slice(0, -1)) {
        if (statement.type !== "VariableDeclaration" || statement.kind !== "const") return fail("a list item's function runs code before its markup");
        comments.push(...this.commentTexts(statement));
        for (const declarator of statement.declarations as AnyNode[]) {
          if ((declarator.id as AnyNode).type !== "Identifier" || !declarator.init || hasJsx(declarator.init as AnyNode)) return fail("a list item's function keeps JSX or a pattern in a variable");
          // The template has no local variables: each use reads the value's expression.
          subst.set(nameOf(declarator.id as AnyNode), grouped(this.rewrite(declarator.init as AnyNode, "template", { subst }, true)));
        }
      }
      comments.push(...this.commentTexts(last));
      result = last.argument as AnyNode;
    }
    const nodes = this.jsxValue(result, { subst });
    const directive = `v-for="${alias} in ${list}"`;
    const out: TNode[] = comments.map((text) => ({ kind: "comment" as const, text }));
    const drawn = nodes.filter((child) => child.kind !== "comment");
    const single = drawn.length === 1 && drawn[0].kind === "element" && !isConditional(drawn[0]) ? drawn[0] : null;
    const keyOf = (attrs: string[]) => attrs.findIndex((attr) => attr.startsWith(":key=") || attr.startsWith("key="));
    if (single) {
      single.attrs.unshift(directive);
      const index = keyOf(single.attrs);
      // :key right after v-for, as Vue's style guide writes it.
      if (index > 1) single.attrs.splice(1, 0, ...single.attrs.splice(index, 1));
      return [...out, ...nodes];
    }
    // Several nodes or a condition: a <template v-for> holds them, and Vue wants the key on that template.
    let key: string | undefined;
    const moveKeys = (list: TNode[]) => list.forEach((child) => {
      if (child.kind !== "element") return;
      const index = keyOf(child.attrs);
      if (index >= 0) { key ??= child.attrs[index]; child.attrs.splice(index, 1); }
      if (child.tag === "template") moveKeys(child.children);
    });
    moveKeys(nodes);
    return [...out, element("template", [directive, ...(key ? [key] : [])], nodes)];
  }

  /** `helper(…)` or `constant`, a module-level value holding JSX (and not a name a loop or helper redefines). */
  private isMacroUse(node: AnyNode, context: Context): boolean {
    const name = node.type === "CallExpression" && (node.callee as AnyNode).type === "Identifier" ? nameOf(node.callee as AnyNode) : node.type === "Identifier" ? nameOf(node) : null;
    return name !== null && this.macros.has(name) && !context.subst.has(name);
  }

  /** A module helper (or constant) holding JSX, drawn in place with its arguments. */
  private inline(use: AnyNode, context: Context): TNode[] {
    const macro = this.macros.get(nameOf(use.type === "CallExpression" ? (use.callee as AnyNode) : use)) as Macro;
    const args = use.type === "CallExpression" ? (use.arguments as AnyNode[]) : [];
    const value = (arg: AnyNode | undefined) => (arg ? (arg.type === "StringLiteral" || arg.type === "NumericLiteral" ? this.rewrite(arg, "template", context, true) : grouped(this.rewrite(arg, "template", context, true))) : "undefined");
    // The helper's own code sees module names, its parameters and its locals only.
    const subst = new Map<string, string>();
    macro.params.forEach((param, index) => {
      if (macro.rest && index === macro.params.length - 1) subst.set(param, `[${args.slice(index).map((arg) => this.rewrite(arg, "template", context, true)).join(", ")}]`);
      else subst.set(param, value(args[index]));
    });
    for (const local of macro.locals) {
      if ((local.id as AnyNode).type !== "Identifier" || !local.init || hasJsx(local.init as AnyNode)) return fail("a JSX helper keeps JSX or a pattern in a variable");
      subst.set(nameOf(local.id as AnyNode), grouped(this.rewrite(local.init as AnyNode, "template", { subst }, true)));
    }
    return this.jsxValue(macro.body, { subst });
  }

  private children(nodes: AnyNode[], context: Context): TNode[] {
    const out: TNode[] = [];
    for (const child of nodes) {
      if (child.type === "JSXText") {
        const text = jsxText(child.value as string);
        if (text) out.push({ kind: "text", text: templateText(text) });
      } else if (child.type === "JSXExpressionContainer") {
        const expression = child.expression as AnyNode;
        if (expression.type === "JSXEmptyExpression") {
          for (const comment of (expression.innerComments as AnyNode[] | undefined) ?? []) out.push({ kind: "comment", text: commentText(comment.value as string) });
        } else if (expression.type === "StringLiteral") {
          out.push({ kind: "text", text: templateText(expression.value as string) });
        } else {
          out.push(...this.jsxValue(expression, context));
        }
      } else if (child.type === "JSXElement" || child.type === "JSXFragment") {
        out.push(...this.jsxValue(child, context));
      } else {
        fail("the markup spreads children");
      }
    }
    return out;
  }

  private element(node: AnyNode, context: Context): TElement {
    const opening = node.openingElement as AnyNode;
    const nameNode = opening.name as AnyNode;
    if (nameNode.type !== "JSXIdentifier") return fail("the markup uses a namespaced or member tag");
    const tag = nameOf(nameNode);
    if (tag === this.fragment) {
      const attributes = opening.attributes as AnyNode[];
      const key = attributes.find((attribute) => attribute.type === "JSXAttribute" && nameOf(attribute.name as AnyNode) === "key");
      if (attributes.length > (key ? 1 : 0)) return fail("a Fragment takes more than a key");
      const keyValue = key ? (key.value as AnyNode).expression as AnyNode ?? (key.value as AnyNode) : null;
      return element("template", keyValue ? [keyValue.type === "StringLiteral" ? `key="${attributeText(keyValue.value as string)}"` : `:key="${this.attributeExpression(keyValue, context)}"`] : [], this.children(node.children as AnyNode[], context));
    }
    const isComponent = /^[A-Z]/.test(tag);
    if (isComponent && !this.library.has(tag)) return fail(`<${tag}> is not a Zen component`);
    const api = isComponent ? this.api.components[tag] : undefined;
    if (isComponent && !api) return fail(`${tag} isn't in @zen-ds/vue yet`);
    const attrs: string[] = [];
    const slots: TNode[] = [];
    const before: string[] = [];
    for (const attribute of opening.attributes as AnyNode[]) {
      before.push(...this.commentTexts(attribute));
      if (attribute.type === "JSXSpreadAttribute") {
        if (isComponent && this.spreadsChildren(attribute.argument as AnyNode)) return fail(`a spread gives <${tag}> its children, which Vue takes as a slot`);
        attrs.push(`v-bind="${this.attributeExpression(attribute.argument as AnyNode, context)}"`);
        continue;
      }
      if ((attribute.name as AnyNode).type !== "JSXIdentifier") return fail("the markup uses a namespaced attribute");
      const name = nameOf(attribute.name as AnyNode);
      const raw = attribute.value as AnyNode | null;
      const value = raw?.type === "JSXExpressionContainer" ? (raw.expression as AnyNode) : raw;
      if (name === "key") attrs.push(value?.type === "StringLiteral" ? `key="${attributeText(value.value as string)}"` : `:key="${this.attributeExpression(value as AnyNode, context)}"`);
      else if (name === "ref") attrs.push(this.refAttribute(value as AnyNode, context));
      else if (/^on[A-Z]/.test(name)) attrs.push(this.event(name, value as AnyNode, tag, api, context));
      else if (value && value.type !== "StringLiteral" && (hasJsx(value) || this.isMacroUse(value, context))) {
        // A node prop → a slot of the same name.
        if (!api) return fail(`<${tag}> takes JSX in ${name}`);
        if (!api.slots.includes(name)) return fail(`Vue's ${tag} has no ${name} slot yet`);
        slots.push(...this.slot(name, value, context));
      } else {
        attrs.push(this.attribute(name, value, tag, api, context));
      }
    }
    const result = element(tag, attrs, [...slots, ...this.children(node.children as AnyNode[], context)]);
    result.before = before;
    return result;
  }

  /**
   * `ref={x}` → `ref="x"`. `ref={first ? x : undefined}` (one row of a list holds it) → a function ref that sets `x` for
   * that row only, as React's does.
   */
  private refAttribute(value: AnyNode, context: Context): string {
    if (value.type === "Identifier") return `ref="${nameOf(value)}"`;
    const name = nameOf(value.consequent as AnyNode);
    const type = this.refs.get(name) === "component" ? "ComponentPublicInstance" : "HTMLElement";
    return `:ref="(element) => { if (${this.attributeExpression(value.test as AnyNode, context)}) ${name} = element as ${type} | null }"`;
  }

  /** A node prop as `<template #name>`; one drawn only on a condition becomes a conditional slot. */
  private slot(name: string, value: AnyNode, context: Context): TNode[] {
    if (value.type === "LogicalExpression" && value.operator === "&&") {
      return [element("template", [`v-if="${this.attributeExpression(value.left as AnyNode, context)}"`, `#${name}`], this.jsxValue(value.right as AnyNode, context))];
    }
    if (value.type === "ConditionalExpression" && isEmpty(value.alternate as AnyNode)) {
      return [element("template", [`v-if="${this.attributeExpression(value.test as AnyNode, context)}"`, `#${name}`], this.jsxValue(value.consequent as AnyNode, context))];
    }
    return [element("template", [`#${name}`], this.jsxValue(value, context))];
  }

  private attribute(name: string, value: AnyNode | null, tag: string, api: VueComponentApi | undefined, context: Context): string {
    // aria-*, data-*, className and style are attributes of the root in Vue too.
    const own = /^(aria|data)-/.test(name) || name === "className" || name === "style";
    if (api && api.react.includes(name) && !api.props.includes(name) && !own) fail(`Vue's ${tag} has no ${name} yet`);
    // A Zen prop is written kebab-case; anything else is an HTML attribute on the element (or a component's root).
    const vueName = api?.props.includes(name) && !own ? kebab(name) : DOM_ATTRIBUTES[name] ?? name;
    if (!value) return vueName;
    if (value.type === "StringLiteral") return `${vueName}="${attributeText(value.value as string)}"`;
    if (value.type === "BooleanLiteral" && value.value === true) return vueName;
    if (value.type === "TemplateLiteral" && !(value.expressions as AnyNode[]).length) return `${vueName}="${attributeText(((value.quasis as AnyNode[])[0].value as { cooked: string }).cooked)}"`;
    return `:${vueName}="${this.attributeExpression(value, context)}"`;
  }

  private event(name: string, value: AnyNode, tag: string, api: VueComponentApi | undefined, context: Context): string {
    const event = lowerFirst(name.slice(2));
    const component = Boolean(api && (api.emits.includes(event) || api.props.includes(name)));
    if (api && api.react.includes(name) && !component) fail(`Vue's ${tag} has no ${name} yet`);
    const vueName = component ? kebab(event) : DOM_EVENTS[name] ?? name.slice(2).toLowerCase();
    // `() => doSomething()` is Vue's inline statement; a function with parameters or a body stays a function.
    if (value.type === "ArrowFunctionExpression" && !(value.params as AnyNode[]).length && (value.body as AnyNode).type !== "BlockStatement" && !isFunction(value.body as AnyNode)) {
      return `@${vueName}="${this.attributeExpression(value.body as AnyNode, context)}"`;
    }
    return `@${vueName}="${this.attributeExpression(value, context)}"`;
  }
}
